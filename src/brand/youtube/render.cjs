const { chromium } = require('/opt/node-tools/node_modules/playwright');
const D = __dirname;
(async () => { const b = await chromium.launch();
  let p = await b.newPage({ viewport: { width: 2560, height: 1440 } });
  await p.goto('file://' + D + '/banner.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: D + '/Product-Advisory-Insights-banner-2560x1440.png' });
  await p.evaluate(() => document.body.classList.add('check')); await p.screenshot({ path: D + '/banner-check.png' });
  // what phones and laptops show: the safe area and the desktop strip
  await p.evaluate(() => document.body.classList.remove('check'));
  await p.screenshot({ path: D + '/view-desktop.png', clip: { x: 0, y: 508, width: 2560, height: 423 } });
  await p.screenshot({ path: D + '/view-phone.png', clip: { x: 507, y: 508, width: 1546, height: 423 } });
  await p.close();
  p = await b.newPage({ viewport: { width: 800, height: 800 } });
  await p.goto('file://' + D + '/mark.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({ path: D + '/mark-800.png', omitBackground: true });
  await p.goto('file://' + D + '/mark.html?full'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({ path: D + '/Product-Advisory-Insights-profile-800x800.png' });
  await b.close(); })();
