"""Product+ Audio: narrate each article in src/insights.py as an MP3, with chapters.

Uses Kokoro (an open-source voice model, run locally, no cost, no API key), voice "am_michael".
Writes, for each article with a body:
    assets/audio/<slug>.mp3    64 kbps mono, with ID3 title/artist tags
    assets/audio/lines/<slug>.json  [[start, end, text], ...] every spoken line, for video captions
    assets/audio/<slug>.json   {"duration": seconds, "bytes": n, "hash": "...", "chapters": [[seconds, title], ...]}
build.py reads the JSON to add the player to the article page and the episode to podcast.xml.

An article is only narrated again when its script changes (the hash of the script is stored in the JSON).

Setup (once):
    python3 -m venv ~/tts && . ~/tts/bin/activate && pip install kokoro-onnx soundfile
    download kokoro-v1.0.onnx and voices-v1.0.bin from
    https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into a folder
Run (from the repo root):
    python src/audio/make_audio.py --models <that folder> [slug ...]
    python src/audio/make_audio.py --script five-second-test     # print the script only
"""
import argparse, hashlib, html, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'src'))
import insights  # noqa: E402

VOICE, SPEED, RATE = 'am_michael', 1.0, 24000
OUT = os.path.join(ROOT, 'assets', 'audio')

# Words the voice gets wrong as written.
SAY = [
    (r'\bSaaS\b', 'sass'), (r'\bPMs\b', 'P.M.s'), (r'\bPM\b', 'P.M.'), (r'\bAI\b', 'A.I.'), (r'\bUX\b', 'U.X.'),
    (r'\bMVP\b', 'M.V.P.'), (r'\bKPIs\b', 'K.P.I.s'), (r'\bKPI\b', 'K.P.I.'), (r'\bOKRs\b', 'O.K.R.s'), (r'\bSSO\b', 'S.S.O.'),
    (r'\bCEO\b', 'C.E.O.'), (r'\bCTO\b', 'C.T.O.'), (r'\bCPO\b', 'C.P.O.'), (r'\bB2B\b', 'B to B'), (r'\bLLMs\b', 'L.L.M.s'), (r'\bLLM\b', 'L.L.M.'),
    (r'\be\.g\.', 'for example'), (r'\bi\.e\.', 'that is'), (r'\bvs\.?', 'versus'), (r'\s*&\s*', ' and '),
    (r'(\d)%', r'\1 percent'), (r'\s*—\s*', ', '), (r'\s*–\s*', ' to '), (r'→', ' to '),
]


MONEY = re.compile(r'(\b(?:[Aa]n?|[Tt]he)\s+)?\$(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(\s?(?:thousand|million|billion|trillion)\b|[kK]\b|M\b|B\b|bn\b)?(?=(\s+[A-Z])?)')
SCALE = {'k': 'thousand', 'K': 'thousand', 'M': 'million', 'B': 'billion', 'bn': 'billion'}


def say_money(m):
    """"$500" is read "500 dollars", not "dollar 500". $21.99 -> 21 dollars and 99 cents; $5.9 billion -> 5.9 billion dollars.
    In a title or after a/an/the ("The $100 Staircase", "a $200 phone") it describes the next word: 100 dollar, 3 dollar 67."""
    art, whole, cents, scale, title_next = m.group(1) or '', m.group(2), m.group(3), m.group(4), m.group(5)
    if cents and len(cents) == 1:
        cents += '0'
    if scale:
        word = SCALE.get(scale.strip(), scale.strip())
        return art + whole + ('.' + cents.rstrip('0') if cents and cents.rstrip('0') else '') + ' ' + word + (' dollar' if art else ' dollars')
    n = int(whole.replace(',', '') or 0)
    if art or title_next:
        return art + whole + ' dollar' + (' ' + cents if cents and cents != '00' else '')
    if n == 0 and cents:
        return str(int(cents)) + (' cent' if int(cents) == 1 else ' cents')
    out = whole + (' dollar' if n == 1 else ' dollars')
    if cents and cents != '00':
        out += ' and ' + str(int(cents)) + (' cent' if int(cents) == 1 else ' cents')
    return out


def clean(s, say=True):
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    if say:
        s = MONEY.sub(say_money, s)
    for a, b in (SAY if say else []):
        s = re.sub(a, b, s)
    s = re.sub(r'\s+', ' ', s).strip()
    if s and s[-1] not in '.!?:;"\'”’)':
        s += '.'
    return s


def script(a):
    """[(kind, text, shown)] where kind is 'chapter' (starts a chapter), 'line' or 'pause'.
    For a line, text is what the voice says and shown is the line as written, for captions."""
    L = lambda x: ('line', clean(x), clean(x, False))
    out = [('chapter', 'Introduction', ''), L(a['title']), L(a['dek']), L('From Product Advisory.'), ('pause', 0.6, '')]
    for b in a.get('body', []):
        k = b[0]
        if k == 'h2':
            out += [('pause', 0.5, ''), ('chapter', clean(b[1], False).rstrip('.'), ''), L(b[1]), ('pause', 0.2, '')]
        elif k == 'h3':
            out += [('pause', 0.3, ''), L(b[1])]
        elif k in ('p', 'quote'):
            out.append(L(b[1]))
        elif k in ('ul', 'ol'):
            out += [L(x) for x in b[1]]
        # figures are skipped: their alt text is written for screen readers, not for listening
        out.append(('pause', 0.35, ''))
    title = clean(a['title'], False).rstrip('.')
    out += [('pause', 0.6, ''), ('line', 'This was ' + clean(a['title']).rstrip('.') + ', from Product Advisory. '
                                 'You can read it, with its charts, at product advisory dot co, slash insights.',
                                 'This was ' + title + ', from Product Advisory. Read it, with its charts, at productadvisory.co/insights.')]
    return out


def script_hash(sc):
    return hashlib.sha256(json.dumps([VOICE, SPEED, [x[:2] for x in sc]]).encode()).hexdigest()[:16]


def narrate(a, kokoro, np):
    """The audio, its chapters [[start, title]], and every spoken line [[start, end, shown]] (for captions)."""
    sc = script(a)
    parts, chapters, lines, t = [], [], [], 0.0
    sil = lambda sec: np.zeros(int(sec * RATE), dtype=np.float32)
    for kind, val, shown in sc:
        if kind == 'chapter':
            chapters.append([round(t, 2), val])
        elif kind == 'pause':
            parts.append(sil(val)); t += val
        else:
            samples, sr = kokoro.create(val, voice=VOICE, speed=SPEED, lang='en-us')
            assert sr == RATE
            d = len(samples) / RATE
            lines.append([round(t, 2), round(t + d, 2), shown])
            parts += [samples.astype(np.float32), sil(0.15)]; t += d + 0.15
    audio = np.concatenate(parts)
    return audio, chapters, lines, script_hash(sc)


def to_mp3(audio, path, title, sf):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'a.wav')
        sf.write(wav, audio, RATE)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k',
                        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
                        '-metadata', 'title=' + title, '-metadata', 'artist=Product Advisory', '-metadata', 'album=Product+ Audio',
                        path], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', help='folder with kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--script', action='store_true', help='print the script and stop')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('slugs', nargs='*')
    o = ap.parse_args()
    arts = [a for a in insights.ARTICLES if a.get('body') and (not o.slugs or a['slug'] in o.slugs)]
    if o.script:
        for a in arts:
            for kind, val, shown in script(a):
                print(('\n## ' + val) if kind == 'chapter' else ('' if kind == 'pause' else val))
        return
    import numpy as np, soundfile as sf
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(os.path.join(o.models, 'kokoro-v1.0.onnx'), os.path.join(o.models, 'voices-v1.0.bin'))
    os.makedirs(OUT, exist_ok=True)
    for a in arts:
        meta_path = os.path.join(OUT, a['slug'] + '.json')
        h = script_hash(script(a))
        if not o.force and os.path.exists(meta_path) and json.load(open(meta_path)).get('hash') == h \
                and os.path.exists(os.path.join(OUT, 'lines', a['slug'] + '.json')):
            print('up to date', a['slug']); continue
        audio, chapters, lines, h = narrate(a, kokoro, np)
        mp3 = os.path.join(OUT, a['slug'] + '.mp3')
        to_mp3(audio, mp3, clean(a['title']).rstrip('.'), sf)
        meta = {'duration': round(len(audio) / RATE, 1), 'bytes': os.path.getsize(mp3), 'hash': h, 'voice': VOICE, 'chapters': chapters}
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=1)
        os.makedirs(os.path.join(OUT, 'lines'), exist_ok=True)   # line timings, for video captions (src/audio/make_video.py)
        with open(os.path.join(OUT, 'lines', a['slug'] + '.json'), 'w') as f:
            json.dump(lines, f, indent=0)
        print('narrated', a['slug'], meta['duration'], 's', meta['bytes'] // 1024, 'KB', flush=True)


if __name__ == '__main__':
    main()
