"""The books, read aloud: every page of The Product Manager's Playbook, and The Essentials, as MP3s.

The same voice and finishing pass as the Product+ articles (src/audio/make_audio.py: Kokoro, voice "am_michael", run
locally, free). Each page is read in the order it appears on the site (src/books/audio.py decides what is spoken), one
sentence at a time, so the read-along on the page knows exactly when every sentence starts.

Writes, for each page (its slug, or "essentials"):
    assets/books/playbook/audio/<slug>.mp3          64 kbps mono (speech), with ID3 tags
    assets/books/playbook/audio/<slug>.json         {duration, bytes, hash, voice, chapters: [[seconds, title], ...]}
    assets/books/playbook/audio/lines/<slug>.json   {"blocks": [[start, end, [[offset, time], ...]], ...]} one per spoken block
build.py (through src/books/pages.py) reads them for the player, the read-along, and the books' podcast feeds.

A page is only narrated again when what it says changes (the hash of its script is kept in the JSON).

Run (from the repo root, in the same environment as make_audio.py):
    python src/books/make_book_audio.py --models <folder with kokoro-v1.0.onnx and voices-v1.0.bin> [slug ...]
    python src/books/make_book_audio.py --script <slug>      # print what will be said
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "src", "audio"))
import make_audio as M          # noqa: E402  the voice, the pronunciation rules and the finishing pass
from books import audio, pages  # noqa: E402

# Short forms in the book the voice gets wrong as written (added to make_audio's LEX for the books only).
BOOK_LEX = {
    'AA': 'dˈʌbəl ˈeɪ', 'ARR': 'ˌeɪˌɑːɹˈɑːɹ', 'NRR': 'ˌɛnˌɑːɹˈɑːɹ', 'BAA': 'bˌiːˌeɪˈeɪ', 'BAAs': 'bˌiːˌeɪˈeɪz',
    'FHIR': 'fˈaɪɚ', 'SLO': 'ˌɛsˌɛlˈoʊ', 'SLOs': 'ˌɛsˌɛlˈoʊz', 'CEOs': 'sˌiːˌiːˈoʊz', 'CFOs': 'sˌiːˌɛfˈoʊz',
    'AARRR': 'ˌeɪˌeɪˌɑːɹˌɑːɹˈɑːɹ',
}
M.LEX = dict(M.LEX, **BOOK_LEX)
M.LEX_RE = re.compile(r"(?<![\w'])(" + '|'.join(sorted(map(re.escape, M.LEX), key=len, reverse=True)) + r")(?![\w'])")

BITRATE = "64k"
GAP_SENTENCE, GAP_LINE, GAP_BLOCK = 0.22, 0.15, 0.35
BOOK = pages.TITLE
TABLE_LINE = "There's a table here. You'll find it in the text, on the page."


def units():
    """[(slug, title, body html, intro lines, outro lines, album)] for every page that is read aloud, in book order."""
    ps = pages.pages()
    out = []
    for i, e in enumerate(ps):
        name = f"{pages.label(e)}: {e['title']}" if e["kind"] == "chapter" else e["title"]
        intro = [f"{BOOK}.", name.replace(":", ".") + ("." if not name.endswith(".") else "")]
        if e.get("epigraph"):
            intro.append(audio.text_of(e["epigraph"]))
        nxt = ps[i + 1] if i + 1 < len(ps) else None
        end = f"This is the end of {pages.label(e).lower() if e['kind'] == 'chapter' else e['title']}." if e["kind"] != "front" else ""
        if nxt:
            outro = [x for x in [end, "Next: " + (f"{pages.label(nxt)}, {nxt['title']}." if nxt["kind"] == "chapter" else nxt["title"] + ".")] if x]
        else:
            outro = [x for x in [end, "This is the end of the book. Thank you for listening.",
                                 "The Essentials, every chapter in brief, is read aloud too, at product advisory dot co."] if x]
        out.append((e["slug"], name, pages.chapter_body(e), intro, outro, BOOK))
    out.append(("essentials", "The Essentials", pages.essentials_body(),
                [f"{BOOK}. The Essentials.", "The whole book, chapter by chapter: the big idea, the key points, the checklist, "
                                             "and one thing to try this week."],
                ["This was The Essentials.", "The full book, with every idea in depth, is free to read and to listen to, "
                                             "at product advisory dot co."], BOOK + ": The Essentials"))
    return out


def script(body, intro, outro):
    """[(kind, value, block)]: kind is 'chapter' (a chapter mark in the MP3), 'pause', 'line' (said, not on the page)
    or 'sentence' (value: (offset, text) within block number block)."""
    sc = [("chapter", "Opening", -1)] + [("line", x, -1) for x in intro] + [("pause", 0.6, -1)]
    for i, b in enumerate(audio.blocks(body)):
        if b["tag"] == "table":
            sc += [("pause", 0.3, -1), ("line", TABLE_LINE, i), ("pause", 0.35, -1)]
            continue
        if b["tag"] == "h2":
            sc += [("pause", 0.5, -1), ("chapter", b["text"].rstrip("."), -1)]
        elif b["tag"] == "h3":
            sc.append(("pause", 0.3, -1))
        sc += [("sentence", s, i) for s in audio.sentences(b["text"])]
        sc.append(("pause", GAP_BLOCK, -1))
    sc += [("pause", 0.6, -1)] + [("line", x, -1) for x in outro]
    return sc


def script_hash(sc):
    return hashlib.sha256(json.dumps([M.VOICE, M.SPEED, M.LEX, M.FX, BITRATE, GAP_SENTENCE, GAP_BLOCK, sc]).encode()).hexdigest()[:16]


def narrate(sc, n_blocks, kokoro, np):
    parts, chapters, t = [], [], 0.0
    blocks = [[None, None, []] for _ in range(n_blocks)]
    sil = lambda sec: np.zeros(int(sec * M.RATE), dtype=np.float32)
    for kind, val, bi in sc:
        if kind == "chapter":
            chapters.append([round(t, 2), val])
        elif kind == "pause":
            parts.append(sil(val)); t += val
        else:
            text = val[1] if kind == "sentence" else val
            samples, sr = kokoro.create(M.phonemes(kokoro, M.clean(text)), voice=M.VOICE, speed=M.SPEED, is_phonemes=True)
            assert sr == M.RATE
            d = len(samples) / M.RATE
            if bi >= 0:
                b = blocks[bi]
                if b[0] is None:
                    b[0] = round(t, 2)
                b[1] = round(t + d, 2)
                if kind == "sentence":
                    b[2].append([val[0], round(t, 2)])
            gap = GAP_SENTENCE if kind == "sentence" else GAP_LINE
            parts += [samples.astype(np.float32), sil(gap)]; t += d + gap
    for b in blocks:   # a block that says nothing (shouldn't happen) still gets a place
        if b[0] is None:
            b[0] = b[1] = 0.0
    return np.concatenate(parts), chapters, blocks


def to_mp3(a, path, title, album, track, sf):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        sf.write(wav, a, M.RATE)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", M.FX, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame",
                        "-b:a", BITRATE, "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                        "-metadata", "title=" + title, "-metadata", "artist=Robert Merrell", "-metadata", "album=" + album,
                        "-metadata", "track=" + str(track), "-metadata", "genre=Audiobook", path], check=True)


def covers():
    """The square covers podcast apps and phone lock screens show (3000 x 3000): the book's cover on the brand's navy,
    with "Audio edition" underneath. Run with --covers; the JPEGs are committed."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    fonts = os.path.join(HERE, "epub", "fonts")
    for src, out in (("cover-playbook.jpg", "cover-audiobook.jpg"), ("cover-essentials.jpg", "cover-essentials-audio.jpg")):
        W = 3000
        bg = Image.new("RGB", (W, W), "#0f2747")
        glow = Image.new("L", (W, W), 0)
        ImageDraw.Draw(glow).ellipse((300, 150, 2700, 2550), fill=120)
        bg.paste(Image.new("RGB", (W, W), "#1c4587"), (0, 0), glow.filter(ImageFilter.GaussianBlur(380)))
        cov = Image.open(os.path.join(HERE, "epub", src)).convert("RGB")
        h = 2250
        cov = cov.resize((round(cov.width * h / cov.height), h), Image.LANCZOS)
        x, y = (W - cov.width) // 2, 230
        shadow = Image.new("L", (W, W), 0)
        ImageDraw.Draw(shadow).rectangle((x + 30, y + 50, x + cov.width + 30, y + h + 50), fill=170)
        bg.paste(Image.new("RGB", (W, W), "#050d1a"), (0, 0), shadow.filter(ImageFilter.GaussianBlur(60)))
        bg.paste(cov, (x, y))
        d = ImageDraw.Draw(bg)
        f = ImageFont.truetype(os.path.join(fonts, "Lato-Black.ttf"), 150)
        label = "AUDIO EDITION"
        tw = d.textlength(label, font=f) + 0.18 * 150 * (len(label) - 1)
        cx = (W - tw) / 2
        for ch in label:   # letter-spaced
            d.text((cx, 2620), ch, font=f, fill="#35C2E8")
            cx += d.textlength(ch, font=f) + 0.18 * 150
        bg.save(os.path.join(audio.OUT, out), "JPEG", quality=86, optimize=True, progressive=True)
        print("cover", out, os.path.getsize(os.path.join(audio.OUT, out)) // 1024, "KB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models")
    ap.add_argument("--script", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--covers", action="store_true", help="make the square covers and stop")
    ap.add_argument("slugs", nargs="*")
    o = ap.parse_args()
    todo = [(n,) + u for n, u in enumerate(units(), 1) if not o.slugs or u[0] in o.slugs]
    if o.covers:
        return covers()
    if o.script:
        for _, slug, title, body, intro, outro, _ in todo:
            for kind, val, bi in script(body, intro, outro):
                print(f"\n## {val}" if kind == "chapter" else "" if kind == "pause" else (val[1] if kind == "sentence" else val))
        return
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(os.path.join(o.models, "kokoro-v1.0.onnx"), os.path.join(o.models, "voices-v1.0.bin"))
    os.makedirs(os.path.join(audio.OUT, "lines"), exist_ok=True)
    for track, slug, title, body, intro, outro, album in todo:
        sc = script(body, intro, outro)
        h = script_hash(sc)
        meta_path = os.path.join(audio.OUT, slug + ".json")
        if not o.force and os.path.exists(meta_path) and json.load(open(meta_path)).get("hash") == h:
            print("up to date", slug, flush=True); continue
        a, chapters, blocks = narrate(sc, len(audio.blocks(body)), kokoro, np)
        mp3 = os.path.join(audio.OUT, slug + ".mp3")
        to_mp3(a, mp3, title, album, track, sf)
        meta = {"duration": round(len(a) / M.RATE, 1), "bytes": os.path.getsize(mp3), "hash": h, "voice": M.VOICE, "chapters": chapters}
        with open(os.path.join(audio.OUT, "lines", slug + ".json"), "w") as f:
            json.dump({"blocks": blocks}, f, separators=(",", ":"))
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=1)
        print("narrated", slug, meta["duration"], "s", meta["bytes"] // 1024, "KB", flush=True)


if __name__ == "__main__":
    main()
