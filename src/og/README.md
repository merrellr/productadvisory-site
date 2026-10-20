# Sharing image

`og.html` is the 1200 × 630 card shown when a page is shared (LinkedIn, Slack, iMessage). To change it, edit
`og.html`, then render it to `assets/img/og.png`:

    npm install playwright && npx playwright install chromium
    node src/og/og.js "$PWD/src/og/og.html" assets/img/og.png
