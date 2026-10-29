"""Renders each main page's sharing image (assets/img/og/<page>.jpg, 1200 x 630): the page's title and its page-head art.

    NODE_PATH=<folder with playwright in node_modules> python3 src/og/pages.py

Needs playwright for node (see README.md) and an internet connection for the fonts. build.py points each page at its image."""
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from parts import FONTS, WORDMARK  # noqa: E402
from art import orbit, toolkit_open, toolkit_tool, insight_lens, signal, conversation  # noqa: E402
from PIL import Image  # noqa: E402

PAGES = [
    ("services", "Services", "Services", "How we help teams build market-driven products.", orbit),
    ("toolkits", "Free tools", "Toolkits &amp; Learning", "Free tools and a skill check for better product decisions.", toolkit_open),
    ("insights", "Product+", "Insights", "Practical writing on product strategy, AI agents and AI enablement.", insight_lens),
    ("about", "About", "About Product Advisory", "Who we are, and how we think about product.", signal),
    ("contact", "Contact", "Let's talk.", "A product challenge, team training, or feedback? Send a note.", conversation),
    ("scorecard", "Free toolkit · Interactive", "Feature Prioritization Scorecard", "Weighted scoring and RICE, side by side.", lambda: toolkit_tool("scorecard")),
    ("ai-use-cases", "Free toolkit · Interactive", "AI Use Case Prioritization", "Choose where AI is worth the effort first.", lambda: toolkit_tool("ai")),
    ("build-buy-partner", "Free toolkit · Interactive", "Build, Buy, or Partner", "Score the options, compare the three-year cost, decide.", lambda: toolkit_tool("bbp")),
    ("impact-score", "Free toolkit · Interactive", "Organizational Impact Score", "See which work moves the KPIs that matter.", lambda: toolkit_tool("impact")),
    ("book", "Book a call", "Book a free 30-minute call.", "Talk through what you're working on, on Google Meet.", conversation),
]

CSS = """body{margin:0;width:1200px;height:630px;background:var(--band);display:grid;grid-template-columns:1.25fr 1fr;align-items:center;gap:40px;padding:0 80px;box-sizing:border-box}
h1{font-size:68px;line-height:1.05;margin:22px 0 18px}p{font-size:28px;margin:0;color:var(--muted)}.eyebrow{display:flex;margin-top:34px}
.art{color:var(--navy)}.art svg{width:100%;height:auto}
.net *{animation:none!important;transition:none!important;stroke-dashoffset:0!important}.net .pop,.net .draw,.net .rise,.net line{opacity:1!important}.net .rise{transform:none!important}.net circle.ring{display:none}"""


def main():
    out_dir = os.path.join(ROOT, "assets", "img", "og")
    os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for name, eyebrow, title, sub, art in PAGES:
        html = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<link rel="stylesheet" href="file://{ROOT}/assets/css/site.css">'
                f'<style>{CSS}</style></head><body><div><div><span class="wm" style="font-size:34px">{WORDMARK}</span></div>'
                f'<div class="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></div><div class="art">{art()}</div></body></html>')
        src, png = os.path.join(tmp, name + ".html"), os.path.join(tmp, name + ".png")
        open(src, "w").write(html)
        subprocess.run(["node", os.path.join(HERE, "og.js"), src, png], check=True)
        Image.open(png).convert("RGB").save(os.path.join(out_dir, name + ".jpg"), quality=86, optimize=True)
        print("wrote assets/img/og/" + name + ".jpg")


if __name__ == "__main__":
    main()
