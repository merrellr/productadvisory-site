"""Product+ Audio videos: turn each narrated article into
    <out>/<slug>.mp4           1920x1080, the full narration with the article's figures, chapter cards and captions (YouTube)
    <out>/<slug>-teaser.mp4    1080x1080, the first ~50 seconds, ending on "listen to the full episode" (LinkedIn)
    <out>/<slug>-youtube.txt   title, description and chapter list to paste into YouTube

Needs make_audio.py to have run first (assets/audio/<slug>.mp3, <slug>.json and lines/<slug>.json), ffmpeg, Pillow,
and the Lato fonts (Lato-Black.ttf, Lato-Bold.ttf, Lato-Regular.ttf from Google Fonts) in one folder.
The videos are large, so they are not kept in the repo: upload them to YouTube and LinkedIn.

Run (from the repo root):
    python3 src/audio/make_video.py --fonts <folder> --out <folder> [slug ...] [--no-full] [--no-teaser]
"""
import argparse, hashlib, json, math, os, subprocess, sys, tempfile, textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'src'))
import insights  # noqa: E402

AUDIO = os.path.join(ROOT, 'assets', 'audio')
NAVY_DEEP, NAVY, CYAN, WHITE, SOFT = '#12305e', '#1c4587', '#35c2e8', '#ffffff', '#c9d7ee'
SITE = 'https://www.productadvisory.co/'
TEASER_MAX = 52.0   # seconds of narration in the teaser


class Fonts:
    def __init__(self, folder):
        self.f = folder
        self.cache = {}

    def __call__(self, weight, size):
        key = (weight, size)
        if key not in self.cache:
            self.cache[key] = ImageFont.truetype(os.path.join(self.f, 'Lato-' + weight + '.ttf'), size)
        return self.cache[key]


def wrap(draw, text, font, width):
    """Lines of text that fit within width pixels."""
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def caption_chunks(lines, draw, font, width, max_lines):
    """Split each spoken line into caption-sized chunks, sharing its time by length."""
    out = []
    for start, end, text in lines:
        rows = wrap(draw, text, font, width)
        groups = [rows[i:i + max_lines] for i in range(0, len(rows), max_lines)] or [['']]
        total = sum(len(' '.join(g)) for g in groups) or 1
        t = start
        for g in groups:
            d = (end - start) * len(' '.join(g)) / total
            out.append([t, t + d, g]); t += d
    return out


def figure_plan(a, chapters, duration):
    """For each chapter: [start, end, title, [image paths]]. The cover leads the introduction."""
    figs = [[os.path.join(ROOT, 'assets', 'insights', a['slug'], 'cover.webp')]]
    for b in a.get('body', []):
        if b[0] == 'h2':
            figs.append([])
        elif b[0] == 'fig':
            figs[-1].append(os.path.join(ROOT, 'assets', 'insights', a['slug'], b[1]))
    plan = []
    for i, (t, name) in enumerate(chapters):
        end = chapters[i + 1][0] if i + 1 < len(chapters) else duration
        plan.append([t, end, name, [f for f in (figs[i] if i < len(figs) else []) if os.path.exists(f)]])
    return plan


def visual_at(plan, t):
    for i, (s, e, name, figs) in enumerate(plan):
        if s <= t < e or i == len(plan) - 1:
            if figs:
                k = min(len(figs) - 1, int((t - s) / max(0.01, e - s) * len(figs)))
                return ('fig', figs[k], name, i)
            return ('card', None, name, i)
    return ('card', None, '', 0)


_img_cache = {}


def fitted(path, w, h):
    key = (path, w, h)
    if key not in _img_cache:
        im = Image.open(path).convert('RGBA')
        bg = Image.new('RGBA', im.size, WHITE); bg.alpha_composite(im); im = bg.convert('RGB')
        r = min(w / im.width, h / im.height)
        _img_cache[key] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _img_cache[key]


def rounded_paste(base, im, x, y, radius=18, pad=0):
    card = Image.new('RGB', (im.width + 2 * pad, im.height + 2 * pad), WHITE)
    card.paste(im, (pad, pad))
    mask = Image.new('L', card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, card.width - 1, card.height - 1], radius=radius, fill=255)
    base.paste(card, (x, y), mask)


def frame_wide(F, a, vis, nch, caption, progress):
    W, H = 1920, 1080
    im = Image.new('RGB', (W, H), NAVY_DEEP); d = ImageDraw.Draw(im)
    d.text((80, 44), 'Product+ Audio', font=F('Black', 34), fill=CYAN)
    kind, path, name, idx = vis
    chip = name if idx else a['title']
    d.text((W - 80, 44), chip if d.textlength(chip, font=F('Bold', 30)) < 1100 else chip[:60] + '…', font=F('Bold', 30), fill=SOFT, anchor='ra')
    box = (80, 120, 1840, 800)
    if kind == 'fig':
        fi = fitted(path, box[2] - box[0] - 40, box[3] - box[1] - 40)
        x = box[0] + (box[2] - box[0] - fi.width - 40) // 2; y = box[1] + (box[3] - box[1] - fi.height - 40) // 2
        rounded_paste(im, fi, x, y, pad=20)
    else:
        d.rounded_rectangle(box, radius=24, fill=NAVY)
        d.text(((box[0] + box[2]) // 2, 360), 'Chapter ' + str(idx) + ' of ' + str(nch - 1), font=F('Bold', 36), fill=CYAN, anchor='mm')
        rows = wrap(d, name, F('Black', 84), 1500)
        for j, r in enumerate(rows[:3]):
            d.text(((box[0] + box[2]) // 2, 450 + j * 100), r, font=F('Black', 84), fill=WHITE, anchor='mm')
    for j, r in enumerate(caption):
        d.text((W // 2, 860 + j * 60), r, font=F('Bold', 46), fill=WHITE, anchor='mm')
    d.rounded_rectangle([80, 1028, 1840, 1036], radius=4, fill=NAVY)
    d.rounded_rectangle([80, 1028, 80 + max(8, int(1760 * progress)), 1036], radius=4, fill=CYAN)
    return im


def frame_square(F, a, vis, caption, progress, end_card=False):
    W = 1080
    im = Image.new('RGB', (W, W), NAVY_DEEP); d = ImageDraw.Draw(im)
    if end_card:
        d.text((W // 2, 300), 'Product+ Audio', font=F('Black', 52), fill=CYAN, anchor='mm')
        size = next((z for z in (76, 68, 60, 54) if len(wrap(d, a['title'], F('Black', z), 900)) <= 3), 54)
        for j, r in enumerate(wrap(d, a['title'], F('Black', size), 900)[:3]):
            d.text((W // 2, 420 + j * int(size * 1.2)), r, font=F('Black', size), fill=WHITE, anchor='mm')
        d.text((W // 2, 760), 'Listen to the full episode, free:', font=F('Bold', 40), fill=SOFT, anchor='mm')
        d.text((W // 2, 830), 'productadvisory.co/insights', font=F('Black', 48), fill=WHITE, anchor='mm')
        return im
    d.text((70, 56), 'Product+ Audio', font=F('Black', 34), fill=CYAN)
    size = next((z for z in (56, 50, 44, 40) if len(wrap(d, a['title'], F('Black', z), 940)) <= 2), 40)
    rows = wrap(d, a['title'], F('Black', size), 940)[:2]
    for j, r in enumerate(rows):
        d.text((70, 110 + j * int(size * 1.18)), r, font=F('Black', size), fill=WHITE)
    top = 110 + len(rows) * int(size * 1.18) + 24
    kind, path, name, idx = vis
    if kind == 'fig':
        fi = fitted(path, 900, 700 - top + 40)
        rounded_paste(im, fi, (W - fi.width - 32) // 2, top, pad=16)
    for j, r in enumerate(caption):
        d.text((W // 2, 800 + j * 56), r, font=F('Bold', 42), fill=WHITE, anchor='mm')
    d.rounded_rectangle([70, 1030, 1010, 1038], radius=4, fill=NAVY)
    d.rounded_rectangle([70, 1030, 70 + max(8, int(940 * progress)), 1038], radius=4, fill=CYAN)
    return im


def render(frames, audio_path, out, tmp, audio_args=()):
    """frames: [(PIL image, seconds)] -> an mp4 with the audio. Identical frames are written once."""
    listing, seen = [], {}
    for k, (im, dur) in enumerate(frames):
        h = hashlib.md5(im.tobytes()).hexdigest()
        if h not in seen:
            seen[h] = os.path.join(tmp, 'f%05d.png' % len(seen)); im.save(seen[h], compress_level=1)
        listing.append((seen[h], dur))
    lst = os.path.join(tmp, 'list.txt')
    with open(lst, 'w') as f:
        for p, dur in listing:
            f.write("file '%s'\nduration %.3f\n" % (p, max(0.04, dur)))
        f.write("file '%s'\n" % listing[-1][0])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, *audio_args, '-i', audio_path,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-tune', 'stillimage', '-preset', 'medium', '-crf', '22',
                    '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', out], check=True)


def clock(sec):
    sec = int(sec)
    return f"{sec // 3600}:{sec % 3600 // 60:02d}:{sec % 60:02d}" if sec >= 3600 else f"{sec // 60}:{sec % 60:02d}"


def video_tags(a):
    """The video's tags as phrases, from src/brand/youtube/videos.json (falls back to the article's keywords)."""
    extra = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'brand', 'youtube', 'videos.json'))).get(a['slug'], {})
    return list(dict.fromkeys(extra.get('tags') or a.get('keywords', '').split()) | dict.fromkeys(['Product Advisory', 'Product+']))


def youtube_text(a, meta):
    chapters = '\n'.join(f"{clock(t)} {name}" for t, name in meta['chapters'])
    return f"""TITLE
{a['title']} | Product+ Audio

DESCRIPTION
{a['dek']}

Read the article, with its charts: {SITE}insights/{a['slug']}

Chapters
{chapters}

Product+ Audio: every Product+ article from Product Advisory, read aloud. Narrated with a natural AI voice.
Book a free 30-minute call: {SITE}book

TAGS
{', '.join(video_tags(a))}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonts', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-full', action='store_true')
    ap.add_argument('--no-teaser', action='store_true')
    ap.add_argument('slugs', nargs='*')
    o = ap.parse_args()
    F = Fonts(o.fonts)
    os.makedirs(o.out, exist_ok=True)
    measure = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    for a in insights.ARTICLES:
        if o.slugs and a['slug'] not in o.slugs:
            continue
        mp3 = os.path.join(AUDIO, a['slug'] + '.mp3')
        lines_path = os.path.join(AUDIO, 'lines', a['slug'] + '.json')
        if not (a.get('body') and os.path.exists(mp3) and os.path.exists(lines_path)):
            continue
        meta = json.load(open(os.path.join(AUDIO, a['slug'] + '.json')))
        lines = json.load(open(lines_path))
        plan = figure_plan(a, meta['chapters'], meta['duration'])
        with open(os.path.join(o.out, a['slug'] + '-youtube.txt'), 'w') as f:
            f.write(youtube_text(a, meta))

        if not o.no_full:
            chunks = caption_chunks(lines, measure, F('Bold', 46), 1640, 2)
            frames, t = [], 0.0
            # cut wherever the caption or the picture changes
            cuts = sorted({0.0, meta['duration']} | {c[0] for c in chunks} | {c[1] for c in chunks} |
                          {p[0] for p in plan} | {p[0] + (p[1] - p[0]) * k / len(p[3]) for p in plan if p[3] for k in range(len(p[3]))})
            for s, e in zip(cuts, cuts[1:]):
                if e - s < 0.02:
                    continue
                mid = (s + e) / 2
                cap = next((c[2] for c in chunks if c[0] <= mid < c[1]), [])
                frames.append((frame_wide(F, a, visual_at(plan, mid), len(plan), cap, s / meta['duration']), e - s))
            with tempfile.TemporaryDirectory() as tmp:
                render(frames, mp3, os.path.join(o.out, a['slug'] + '.mp4'), tmp)
            print('video', a['slug'], len(frames), 'frames', flush=True)

        if not o.no_teaser:
            cut = max([l[1] for l in lines if l[1] <= TEASER_MAX] or [min(TEASER_MAX, meta['duration'])])
            chunks = caption_chunks([l for l in lines if l[1] <= cut], measure, F('Bold', 42), 940, 3)
            cuts = sorted({0.0, cut} | {c[0] for c in chunks} | {c[1] for c in chunks})
            frames = []
            for s, e in zip(cuts, cuts[1:]):
                if e - s < 0.02:
                    continue
                mid = (s + e) / 2
                cap = next((c[2] for c in chunks if c[0] <= mid < c[1]), [])
                frames.append((frame_square(F, a, visual_at(plan, mid), cap, s / cut), e - s))
            frames.append((frame_square(F, a, None, [], 1, end_card=True), 4.5))
            with tempfile.TemporaryDirectory() as tmp:
                # the teaser's audio: the opening, faded out, then silence under the end card
                clip = os.path.join(tmp, 'clip.m4a')
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp3,
                                '-af', 'atrim=0:%.2f,afade=t=out:st=%.2f:d=0.6,apad=pad_dur=4.5' % (cut + 0.4, max(0, cut - 0.2)),
                                '-t', '%.2f' % (cut + 0.4 + 4.5), '-c:a', 'aac', '-b:a', '128k', clip], check=True)
                render(frames, clip, os.path.join(o.out, a['slug'] + '-teaser.mp4'), tmp)
            print('teaser', a['slug'], round(cut + 4.5, 1), 's', flush=True)


if __name__ == '__main__':
    main()
