# YouTube channel art: Product Advisory Insights (@ProductAdvisoryInsights)

- `banner.html`: the channel banner, 2560 x 1440. Everything that must be read sits in the centre 1546 x 423
  (the only part phones and small screens show); the chart art outside it shows on desktops and TVs.
- `mark.html`: the "P+" mark. Square with rounded corners = the 150 x 150 video watermark; `?full` = the
  800 x 800 profile picture: a solid square with no see-through corners, so YouTube's round crop never shows a
  light rim (`?circle` is a round version for other uses).
- `render.cjs`: draws all three with Playwright. Put the Lato and Comfortaa fonts in `fonts/` next to these
  files first (`Lato-Regular.ttf`, `Lato-Bold.ttf`, `Lato-Black.ttf`, `Comfortaa.ttf`), run `node render.cjs`,
  then shrink `mark-800.png` to 150 x 150 for the watermark.
- `Product-Advisory-Insights-channel-description.txt`: the channel description (under YouTube's 1,000 characters).
- `thumb.html` + `render-thumbs.cjs`: a 1280 x 720 thumbnail for every video, with the words from `videos.json`
  (`node render-thumbs.cjs <out-folder> [slug ...]`, fonts in `fonts/` as above).
- `videos.json`: each video's thumbnail words and its tags (make_video.py reads the tags).
