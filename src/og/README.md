# Sharing image

`og.html` is the 1200 × 630 card shown when a page is shared (LinkedIn, Slack, iMessage). To change it, edit
`og.html`, then render it to `assets/img/og.png`:

    npm install playwright && npx playwright install chromium
    node src/og/og.js "$PWD/src/og/og.html" assets/img/og.png

# Article images

`insight-images.mjs` makes each article's cover (1600×900), index card (800×450), sharing image (1200×675) and
in-article figures in the Product+ style. Describe the article in `ARTS` in that file, then:

    node src/og/insight-images.mjs <slug>     # renders PNGs (needs playwright and an internet connection for the fonts)
    python3 src/og/to-webp.py <slug>          # turns them into cover.webp, card.webp, og.jpg and <figure>.webp
