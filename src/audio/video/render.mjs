// Product+ Audio: the animated video for one article, from its storyboard (src/audio/storyboards/<slug>.json).
//
// It reads the narration (assets/audio/<slug>.mp3), when each line is spoken (assets/audio/lines/<slug>.json) and the
// chapters (assets/audio/episodes.json), works out when each scene starts from the phrase it is pinned to, then draws
// every frame in headless Chromium (src/audio/video/stage.html) and pipes the frames to ffmpeg with the audio.
//
// Needs: ffmpeg, Playwright with Chromium, and the Lato fonts (Lato-Black.ttf, Lato-Bold.ttf, Lato-Regular.ttf) in one folder.
//   node src/audio/video/render.mjs <slug> --fonts <folder> --out <file.mp4> [--fps 24] [--from 0 --to 60]
//   node src/audio/video/render.mjs <slug> --fonts <folder> --stills 12,40,180 --out <folder>     (PNG frames, to check a look)
//   node src/audio/video/render.mjs <slug> --fonts <folder> --scene-stills --out <folder>         (one PNG per scene)
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const slug = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const fps = +opt('fps', 24), fonts = opt('fonts'), outPath = opt('out');
if (!slug || !fonts || !outPath) { console.error('usage: render.mjs <slug> --fonts <folder> --out <file.mp4>'); process.exit(1); }

const audio = path.join(ROOT, 'assets/audio', slug + '.mp3');
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/lines', slug + '.json'), 'utf8'));
const ep = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/episodes.json'), 'utf8')).episodes.find(e => e.slug === slug);
const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/audio/storyboards', slug + '.json'), 'utf8'));
const duration = ep.duration;

// When a phrase is spoken: the line that contains it (at or after `after` seconds), and how far into the line it is.
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'");
function when(phrase, after = 0) {
  if (typeof phrase === 'number') return phrase;
  for (const [s, e, text] of lines) {
    if (e < after) continue;
    const i = norm(text).indexOf(norm(phrase));
    if (i > -1) return +(s + (e - s) * i / text.length).toFixed(2);
  }
  throw new Error('phrase not found in the narration: "' + phrase + '"');
}

// Scenes, with their times, plus a chapter card at the start of each chapter (but not Introduction or Sources).
let scenes = [], last = 0;
for (const sc of board.scenes) {
  const s = Object.assign({}, sc);
  s.start = when(sc.at, sc.after || Math.max(0, last - 5));
  for (const k of Object.keys(sc)) if (/At$/.test(k)) s[k] = Array.isArray(sc[k]) ? sc[k].map(p => when(p, s.start - 1)) : when(sc[k], s.start - 1);
  if (s.src) s.src = pathToFileURL(path.join(ROOT, 'assets/insights', slug, s.src)).href;
  scenes.push(s); last = s.start;
}
ep.chapters.forEach((c, i) => { if (i > 0 && !/^sources$/i.test(c[1])) scenes.push({ type: 'chapter', start: c[0], n: i, title: c[1] }); });
scenes.sort((a, b) => a.start - b.start);
scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].start : duration + 1; });

// Captions: each spoken line in chunks of up to about 100 characters, sharing the line's time by length; each word
// knows how far through its chunk it is spoken.
const caps = [];
for (const [s, e, text] of lines) {
  const words = text.split(/\s+/).filter(Boolean), chunks = [];
  let cur = [];
  for (const w of words) { if (cur.join(' ').length + w.length > 100 && cur.length) { chunks.push(cur); cur = []; } cur.push(w); }
  if (cur.length) chunks.push(cur);
  const total = chunks.reduce((a, c) => a + c.join(' ').length, 0) || 1;
  let t = s;
  for (const c of chunks) {
    const d = (e - s) * c.join(' ').length / total, len = c.join(' ').length || 1;
    let acc = 0;
    caps.push({ start: t, end: t + d, words: c.map(w => { const at = acc / len; acc += w.length + 1; return { w, at }; }) });
    t += d;
  }
}

// How loud the voice is, 24 times a second, for the waveform.
const ampRate = 24;
const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', audio, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
const per = Math.floor(8000 / ampRate), amp = [];
for (let i = 0; i + per * 2 <= pcm.length; i += per * 2) {
  let sum = 0; for (let j = 0; j < per; j++) { const v = pcm.readInt16LE(i + j * 2) / 32768; sum += v * v; }
  amp.push(Math.sqrt(sum / per));
}
const peak = amp.slice().sort((a, b) => a - b)[Math.floor(amp.length * .97)] || 1;
const ampN = amp.map(a => +Math.min(1, a / peak).toFixed(3));

const data = { title: ep.title, dek: ep.dek, topic: ep.topic, duration, chapters: ep.chapters, scenes, caps, amp: ampN, ampRate };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(ROOT, 'src/audio/video/stage.html')).href);
await page.addStyleTag({ content: ['Regular', 400, 'Bold', 700, 'Black', 900].reduce((css, x, i, a) => i % 2 ? css : css +
  `@font-face{font-family:"Lato";font-weight:${a[i + 1]};src:url("${pathToFileURL(path.join(fonts, 'Lato-' + x + '.ttf')).href}")}`, '') });
await page.evaluate((d) => window.setup(d), data);
await page.evaluate(() => document.fonts.ready);

// --scene-stills: one still per scene, a few seconds in (just before it ends, when all its parts are showing), to check every scene's look
let stills = opt('stills');
if (args.includes('--scene-stills')) stills = scenes.map(sc => +(sc.type === 'chapter' ? sc.start + 1.5 : Math.max(sc.start + 1.5, sc.end - .5)).toFixed(2)).join(',');
if (stills) {
  fs.mkdirSync(outPath, { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate((x) => window.draw(x), t);
    await page.screenshot({ path: path.join(outPath, 'still-' + String(t).replace('.', '_') + '.png') });
  }
  await browser.close();
  console.log('stills written to', outPath);
  process.exit(0);
}

const from = +opt('from', 0), to = Math.min(+opt('to', duration + .5), duration + .5);
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-ss', String(from), '-t', String(to - from), '-i', audio,
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.ceil((to - from) * fps);
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const t = from + f / fps;
  await page.evaluate((x) => window.draw(x), t);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % (fps * 30) === 0) console.log('frame', f, 'of', frames, '(' + Math.round((Date.now() - t0) / 1000) + 's)');
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', outPath, frames, 'frames in', Math.round((Date.now() - t0) / 1000), 's');
