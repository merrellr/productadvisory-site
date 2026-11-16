"""Orientation tours: narrate each tour in src/audio/tours/<id>.json (2-minute "what it is and how to use it").

Same voice and pronunciation rules as Product+ Audio (make_audio.py). Writes
    assets/audio/tours/<id>.mp3     the narration
    assets/audio/tours/<id>.json    {"duration", "bytes", "hash", "beats": [[start, end, text], ...]}
src/audio/video/tour.mjs films the tool page for each beat and makes the video.

Run (from the repo root):  python src/audio/make_tour.py --models <folder> [id ...]
"""
import argparse, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_audio as A  # noqa: E402

ROOT = A.ROOT
TOURS = os.path.join(HERE, 'tours')
OUT = os.path.join(ROOT, 'assets', 'audio', 'tours')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('ids', nargs='*')
    o = ap.parse_args()
    import numpy as np, soundfile as sf
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(os.path.join(o.models, 'kokoro-v1.0.onnx'), os.path.join(o.models, 'voices-v1.0.bin'))
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(os.listdir(TOURS)):
        tid = name[:-5]
        if not name.endswith('.json') or (o.ids and tid not in o.ids):
            continue
        tour = json.load(open(os.path.join(TOURS, name)))
        spoken = [A.clean(b['say']) for b in tour['beats']]
        h = hashlib.sha256(json.dumps([A.VOICE, A.SPEED, spoken]).encode()).hexdigest()[:16]
        meta_path = os.path.join(OUT, tid + '.json')
        if not o.force and os.path.exists(meta_path) and json.load(open(meta_path)).get('hash') == h:
            print('up to date', tid); continue
        parts, beats, t = [], [], 0.0
        sil = lambda sec: np.zeros(int(sec * A.RATE), dtype=np.float32)
        parts.append(sil(0.6)); t += 0.6
        for b, line in zip(tour['beats'], spoken):
            samples, sr = kokoro.create(line, voice=A.VOICE, speed=A.SPEED, lang='en-us')
            d = len(samples) / A.RATE
            beats.append([round(t, 2), round(t + d, 2), A.clean(b['say'], False)])
            parts += [samples.astype(np.float32), sil(0.7)]; t += d + 0.7
        audio = np.concatenate(parts)
        mp3 = os.path.join(OUT, tid + '.mp3')
        A.to_mp3(audio, mp3, tour['title'] + ': the 2-minute tour', sf)
        json.dump({'duration': round(len(audio) / A.RATE, 1), 'bytes': os.path.getsize(mp3), 'hash': h, 'beats': beats},
                  open(meta_path, 'w'), indent=1)
        print('narrated', tid, round(len(audio) / A.RATE, 1), 's', flush=True)


if __name__ == '__main__':
    main()
