// Draws a 1280 x 720 YouTube thumbnail for every video in videos.json.
// Usage: node render-thumbs.cjs <out-folder> [slug ...]   (fonts/ must sit next to thumb.html)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || 'thumbs', only = process.argv.slice(3);
  fs.mkdirSync(out, { recursive: true });
  const videos = JSON.parse(fs.readFileSync(path.join(__dirname, 'videos.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [slug, v] of Object.entries(videos)) {
    if (slug.startsWith('_') || (only.length && !only.includes(slug))) continue;
    const q = new URLSearchParams({ big: v.big, hi: v.hi || '', kicker: v.kicker || '' });
    await page.goto('file://' + path.join(__dirname, 'thumb.html') + '?' + q);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, slug + '-thumbnail.jpg'), type: 'jpeg', quality: 90 });
  }
  await browser.close();
})();
