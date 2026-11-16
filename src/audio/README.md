# Product+ Audio and video

Every article is narrated with a free, open-source voice model, Kokoro (voice `am_michael`). It runs on your own
machine, so there is no API key and no cost.

## What it makes

| File | What it is | Where it goes |
|---|---|---|
| `assets/audio/<slug>.mp3` | the narration, 64 kbps mono | committed; the article page plays it, and so does the podcast feed |
| `assets/audio/<slug>.json` | its length, size and chapters | committed; `build.py` reads it |
| `assets/audio/lines/<slug>.json` | when each line is spoken | committed; the video captions use it |
| `podcast.xml` | the podcast feed, built by `build.py` | committed; Apple Podcasts, Spotify and other apps read it |
| `assets/audio/episodes.json` | every episode, built by `build.py` | committed; Learning's Listen & watch page reads it |
| `<out>/<slug>.mp4` | 1920×1080 video: the narration with the article's figures and captions | **not committed**: upload it to YouTube |
| `<out>/<slug>-teaser.mp4` | 1080×1080, under a minute, ending on "listen to the full episode" | **not committed**: post it on LinkedIn |
| `<out>/<slug>-youtube.txt` | the YouTube title, description and chapter list | paste it into YouTube |

## A new article

1. Publish the article as usual, in `src/insights.py`.
2. Narrate it: `python src/audio/make_audio.py --models <folder> <slug>`. An unchanged article is skipped.
3. Run `python3 src/build.py`. The player, the "min listen" line and the podcast episode all appear.
4. Make its videos: `python3 src/audio/make_video.py --fonts <folder> --out <folder> <slug>`.
5. Upload `<slug>.mp4` to YouTube with the text from `<slug>-youtube.txt`.
6. Put the video's id in `YOUTUBE` in `src/build.py`: `"<slug>": "<id>"`. The id is the part after `watch?v=`.
   Then build again. The video now shows on the article and on Learning's Listen & watch page.

For one-time setup (the model files and the fonts), see the top of `make_audio.py` and `make_video.py`.

## Listing the podcast (once)

The feed is `https://www.productadvisory.co/podcast.xml`.

- **Apple Podcasts**:
  1. Go to podcastsconnect.apple.com, choose **+**, then **New Show**, then **Add a show with an RSS feed**, and paste the feed.
  2. Apple checks the feed and emails `info@productadvisory.co`, the owner email in the feed.
- **Spotify**:
  1. Go to creators.spotify.com and choose **Get started**, then **Find an existing show**, and paste the feed.
  2. Spotify sends a code to the same email.
- Once a show is listed, add its link to `PODCAST_LINKS` in `src/build.py`, for example `("Apple Podcasts", "https://podcasts.apple.com/...")`.
  The links then appear next to every article's player.

## Lessons (in the PAAssessment repo)

`tools/lesson-audio/` narrates every lesson the same way, in the same voice, into `audio/lessons/`. See its README.
