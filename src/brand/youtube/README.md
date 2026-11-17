# YouTube channel art: Product Advisory Insights (@ProductAdvisoryInsights)

- `banner.html`: the channel banner, 2560 x 1440. Everything that must be read sits in the centre 1546 x 423
  (the only part phones and small screens show); the chart art outside it shows on desktops and TVs.
- `mark.html`: the "P+" mark. Square with rounded corners = the 150 x 150 video watermark; `?circle` = the
  800 x 800 profile picture (YouTube crops it round).
- `render.cjs`: draws all three with Playwright. Put the Lato and Comfortaa fonts in `fonts/` next to these
  files first (`Lato-Regular.ttf`, `Lato-Bold.ttf`, `Lato-Black.ttf`, `Comfortaa.ttf`), run `node render.cjs`,
  then shrink `mark-800.png` to 150 x 150 for the watermark.
- `Product-Advisory-Insights-channel-description.txt`: the channel description (under YouTube's 1,000 characters).
