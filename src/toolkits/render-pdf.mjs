// Renders the one-page toolkit references in this folder to PDFs in assets/toolkits/.
//   node src/toolkits/render-pdf.mjs     (needs playwright and an internet connection for the fonts)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.SITE_ROOT || path.join(here, '..', '..');
const b = await chromium.launch();
for (const name of ['which-prioritization-method']) {
  const p = await b.newPage();
  await p.goto('file://' + path.join(root, 'src', 'toolkits', name + '.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(root, 'assets', 'toolkits', name + '.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW) await p.setViewportSize({ width: 816, height: 1056 }), await p.screenshot({ path: process.env.PREVIEW });
  console.log('Wrote assets/toolkits/' + name + '.pdf');
}
await b.close();
