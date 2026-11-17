# Product+ Audio and video

Every article is narrated with a free, open-source voice model, Kokoro (voice `am_michael`). It runs on your own
machine, so there is no API key and no cost.

## What it makes

| File | What it is | Where it goes |
|---|---|---|
| `assets/audio/<slug>.mp3` | the narration, 128 kbps mono, with the crisp finishing pass (FX in make_audio.py) | committed; the article page plays it, and so does the podcast feed |
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

## Making it sound human

`make_audio.py` rewrites each line before the voice reads it:
- **Short forms** (AI, PM, PMs, KPIs, LLMs, UX, ROI, SaaS…) are in `LEX`, each with its sound written out. They're said
  as one word with no gap; spelled with dots ("A.I.") the voice stops after every letter. Add any new short form there.
- **Money**: "$500" is "500 dollars", "The $100 Staircase" is "the 100 dollar staircase".
- **Years and times**: 2026 is "twenty twenty six", the 1980s "nineteen eighties"; 7:10 AM is "7 ten AM";
  without AM/PM, 4:30 is a time taken ("4 minutes thirty").
- **Units and symbols**: 512GB is "512 gigabytes", 24/7 "twenty four seven", A/B "A B", % "percent".

To hear what will be said, run `python src/audio/make_audio.py --script <slug>`. Any change here narrates every
article again the next time `make_audio.py` runs.

## Animated videos (storyboards)

`make_video.py` makes a simple video for any article: its figures, with captions. For an animated one, write a
storyboard, `src/audio/storyboards/<slug>.json`. It's a list of scenes, each pinned to a phrase in the narration
(`"at": "The Family plan cost"`). Keys ending in `At` name phrases that trigger moves inside a scene. Because the
phrases are words, not times, the video stays in sync if the article is narrated again.

The scene types are in `src/audio/video/stage.html`:
- title, quote, chapter (added at each chapter by itself) and end
- divide (a price split between people) and people (a price tag each)
- curve (one price against tiers), plans (bars per account and per person) and versus (two amounts)
- callout, fences (cards appearing one by one), split (users against revenue) and slope (prices then and now)
- tiers (new tiers around an existing staircase), list (points appearing as they're read) and sources
- image (an article figure, slowly pushing in)

Use only figures from the article.

    node src/audio/video/render.mjs <slug> --fonts <folder> --stills 30,120,400 --out <folder>   # check a few frames
    node src/audio/video/render.mjs <slug> --fonts <folder> --out <file.mp4>                     # the whole video

It needs Node, Playwright with Chromium, ffmpeg and the Lato fonts. A 15-minute article takes about 20 minutes to render.

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
