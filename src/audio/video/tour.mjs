// Orientation tours: film each beat of src/audio/tours/<id>.json on the real tool page, then make the video.
//
// For each beat it does the steps in `do` on the page (fill, click, select), scrolls `spot` into view, captures the
// screen, and notes where `spot` is. Then it draws the video (src/audio/video/tour-stage.html): the captures with a
// spotlight and a slow push-in, captions in time with the narration (make_tour.py), and a title card and an end card.
//
//   node src/audio/video/tour.mjs <id> --fonts <folder> --site http://127.0.0.1:8811 --out <file.mp4> [--stills 5,30]
// The site must be served (any static server with byte ranges, from the repo root).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2), id = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const fonts = opt('fonts'), site = opt('site', 'http://127.0.0.1:8811'), outPath = opt('out'), fps = +opt('fps', 24);
const tourFile = opt('tour', path.join(ROOT, 'src/audio/tours', id + '.json'));
const audioDir = opt('audio', path.join(ROOT, 'assets/audio/tours'));
const tour = JSON.parse(fs.readFileSync(tourFile, 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(audioDir, id + '.json'), 'utf8'));
const audio = path.join(audioDir, id + '.mp3');
const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-'));

const browser = await chromium.launch();
// 1. film: one capture per beat
// a laptop-sized window, captured at 1.25x: the 1600x900 frame shows it sharp and big enough to read
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25, colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto(site.replace(/\/$/, '') + '/' + tour.page);
await page.waitForTimeout(tour.wait || 900);
await page.addStyleTag({ content: '.consent, .shared-bar, .toast, #badgeToast, .bd-toast { display: none !important; } html { scroll-behavior: auto !important; } .reveal { opacity: 1 !important; transform: none !important; }' });
const hide = '.consent, .shared-bar, .toast, #badgeToast, .bd-toast { display: none !important; } html { scroll-behavior: auto !important; } .reveal { opacity: 1 !important; transform: none !important; }';
let here = tour.page;
for (const [k, b] of tour.beats.entries()) {
  if (b.page && b.page !== here) {   // a beat can move to another page
    here = b.page;
    await page.goto(site.replace(/\/$/, '') + '/' + here);
    await page.waitForTimeout(tour.wait || 900);
    await page.addStyleTag({ content: hide });
  }
  for (const step of b.do || []) {
    const [kind, sel, val] = step;
    const el = await page.$(sel);
    if (!el) throw new Error('beat ' + (k + 1) + ': nothing matches ' + sel);
    if (kind === 'click') await el.click();
    else if (kind === 'fill') await el.fill(val);
    else if (kind === 'select') await el.selectOption(String(val));
    await page.waitForTimeout(350);
  }
  let rect = null;
  if (b.top) await page.evaluate(() => window.scrollTo(0, 0));
  if (b.spot) {
    const el = await page.$(b.spot);
    if (!el) throw new Error('beat ' + (k + 1) + ': nothing matches ' + b.spot);
    // centre it in the space below the sticky header, unless it's taller than the screen
    await page.evaluate((s) => { const e = document.querySelector(s), r = e.getBoundingClientRect(), y = window.scrollY + r.top - Math.max(90, (720 - r.height) / 2 + 30); window.scrollTo(0, Math.max(0, y)); }, b.spot);
    if (b.top) await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(450);
    const r = await el.boundingBox();
    if (r) rect = { x: Math.max(0, r.x), y: Math.max(0, r.y), w: Math.min(r.width, 1280 - Math.max(0, r.x)), h: Math.min(r.height, 720 - Math.max(0, r.y)) };
    if (b.top) rect = null;
  }
  const img = path.join(shots, 'beat-' + k + '.png');
  await page.screenshot({ path: img });
  Object.assign(b, { img: pathToFileURL(img).href, rect });
}
await ctx.close();

// 2. captions: each beat in chunks of up to about 80 characters, sharing its time by length
const caps = [];
tour.beats.forEach((b, i) => {
  const [s, e, text] = meta.beats[i];
  b.start = s; b.end = e;
  const words = text.split(/\s+/).filter(Boolean), chunks = [];
  let cur = [];
  for (const w of words) { if (cur.join(' ').length + w.length > 120 && cur.length) { chunks.push(cur); cur = []; } cur.push(w); }
  if (cur.length) chunks.push(cur);
  const total = chunks.reduce((a, c) => a + c.join(' ').length, 0) || 1;
  let t = s;
  for (const c of chunks) {
    const d = (e - s) * c.join(' ').length / total, len = c.join(' ').length || 1;
    let acc = 0;
    caps.push({ start: t, end: t + d, words: c.map(w => { const at = acc / len; acc += w.length + 1; return { w, at }; }) });
    t += d;
  }
});

const TAIL = 3.5, duration = meta.duration + TAIL;
const data = { title: tour.title, kicker: tour.kicker || ('The 2-minute tour · ' + tour.title), url: tour.url || ('productadvisory.co/' + tour.page.replace(/\.html$/, '')),
  intro: tour.intro || 3.4, duration, caps, beats: tour.beats.map(b => ({ img: b.img, rect: b.rect, label: b.label, zoom: b.zoom, start: b.start, end: b.end })) };

// 3. draw
const stage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await stage.goto(pathToFileURL(path.join(ROOT, 'src/audio/video/tour-stage.html')).href);
await stage.addStyleTag({ content: ['Regular', 400, 'Bold', 700, 'Black', 900].reduce((css, x, i, a) => i % 2 ? css : css +
  `@font-face{font-family:"Lato";font-weight:${a[i + 1]};src:url("${pathToFileURL(path.join(fonts, 'Lato-' + x + '.ttf')).href}")}`, '') });
await stage.evaluate((d) => window.setup(d), data);
await stage.evaluate(() => Promise.all([document.fonts.ready, ...Array.from(document.images).map(i => i.decode().catch(() => {}))]));

const stills = opt('stills');
if (stills) {
  fs.mkdirSync(outPath, { recursive: true });
  for (const t of stills.split(',').map(Number)) { await stage.evaluate((x) => window.draw(x), t); await stage.screenshot({ path: path.join(outPath, id + '-' + String(t).replace('.', '_') + '.png') }); }
  await browser.close(); console.log('stills in', outPath); process.exit(0);
}
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-i', audio, '-filter_complex', '[1:a]apad=pad_dur=' + (TAIL + 1) + '[a]', '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.ceil(duration * fps);
for (let f = 0; f < frames; f++) {
  await stage.evaluate((x) => window.draw(x), f / fps);
  const jpg = await stage.screenshot({ type: 'jpeg', quality: 88 });
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
fs.rmSync(shots, { recursive: true, force: true });
console.log('wrote', outPath, frames, 'frames');
