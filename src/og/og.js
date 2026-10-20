const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200); await p.screenshot({ path: process.argv[3] }); await b.close(); })();
