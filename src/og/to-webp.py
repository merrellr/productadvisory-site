"""Turns the PNGs from insight-images.mjs into the files the site uses: cover.webp, card.webp, og.jpg and one .webp
per figure, in assets/insights/<slug>/, then removes the _png folder.  Usage: python3 src/og/to-webp.py <slug>"""
import os
import shutil
import sys
from PIL import Image

slug = sys.argv[1]
d = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "insights", slug)
src = os.path.join(d, "_png")
for f in sorted(os.listdir(src)):
    name, im = f[:-4], Image.open(os.path.join(src, f)).convert("RGB")
    if name == "og":
        im.save(os.path.join(d, "og.jpg"), "JPEG", quality=88, optimize=True, progressive=True)
    else:
        im.save(os.path.join(d, name + ".webp"), "WEBP", quality=88, method=6)
    print("wrote", name)
shutil.rmtree(src)
