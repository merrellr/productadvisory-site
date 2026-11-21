"""Turns the book's Markdown (src/books/playbook/md and essentials) into src/books/playbook.json, which build.py
reads to make the book's pages. Needs pandoc, so it is run by hand after the book text changes:

    python3 src/books/make_book.py

build.py itself needs only Python, so the pages can be checked anywhere."""
import json
import os
import re
import subprocess
from html import unescape

HERE = os.path.dirname(os.path.abspath(__file__))
BOOK = os.path.join(HERE, "playbook")
FIG = "/assets/books/playbook/fig/"


def slugify(t):
    t = unescape(re.sub(r"<[^>]+>", "", t)).lower().replace("’", "").replace("'", "").replace("&", "")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def to_html(path, prefix):
    html = subprocess.run(["pandoc", path, "-f", "markdown+task_lists", "-t", "html5", "--id-prefix", prefix],
                          capture_output=True, text=True, check=True).stdout
    # figures: the web copies, sized, lazy, and tap-to-enlarge like the articles' (site.js initFigureZoom)
    from PIL import Image
    root = os.path.dirname(os.path.dirname(HERE))

    def fig(m):
        n, alt = m.group(1), unescape(m.group(2))
        w, h = Image.open(os.path.join(root, FIG.strip("/"), n + ".webp")).size
        return (f'<button type="button" class="fig-zoom" aria-label="Enlarge this figure"><img src="{FIG}{n}.webp" '
                f'alt="{alt.replace(chr(34), "&quot;")}" width="{w}" height="{h}" loading="lazy" decoding="async">'
                '<span class="fig-zoom-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Enlarge</span></button>')
    html = re.sub(r'<img src="\.\./fig/([0-9]+-[0-9]+)\.png"[^>]*?alt="([^"]*)"[^>]*>', fig, html)
    # checklists: real checkboxes a reader can tick (not saved)
    html = html.replace('<ul class="task-list">', '<ul class="task-list checklist">')
    html = html.replace('class="footnote-back"', 'class="footnote-back" aria-label="Back to the text"')
    return html


def split_h1(html):
    """[(title, id, body_html)] for each level-1 heading in the fragment."""
    parts = re.split(r'(<h1[^>]*>.*?</h1>)', html, flags=re.S)
    out, pre = [], parts[0]
    for i in range(1, len(parts), 2):
        h = parts[i]
        title = re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S).group(1)).strip()
        out.append([" ".join(unescape(title).split()), parts[i + 1]])
    return pre, out


def sections(body):
    return [{"id": m.group(1), "title": " ".join(unescape(re.sub(r"<[^>]+>", "", m.group(2))).split())}
            for m in re.finditer(r'<h2 id="([^"]+)"[^>]*>(.*?)</h2>', body, re.S)]


def words(body):
    return len(unescape(re.sub(r"<[^>]+>", " ", body)).split())


def main():
    entries = []
    files = sorted(f for f in os.listdir(os.path.join(BOOK, "md")) if f.endswith(".md"))
    for n, f in enumerate(files):
        html = to_html(os.path.join(BOOK, "md", f), f"f{n}-")
        _, heads = split_h1(html)
        for title, body in heads:
            m = re.match(r"Part (\d+): (.+)", title)
            if m:
                entries.append({"kind": "part", "num": int(m.group(1)), "title": m.group(2)})
                continue
            m = re.match(r"Chapter (\d+)\. (.+)", title)
            if m:
                num, t, kind = int(m.group(1)), m.group(2), "chapter"
            elif title.startswith("Appendix"):
                num, t, kind = None, title, "appendix"
            else:
                num, t, kind = None, title, "front"
            body = body.strip()
            # the epigraph: the first blockquote, shown under the title
            epi = ""
            q = re.match(r'<blockquote>(.*?)</blockquote>', body, re.S)
            if q:
                epi, body = q.group(1).strip(), body[q.end():].strip()
            entries.append({"kind": kind, "num": num, "title": t, "slug": slugify(t), "epigraph": epi, "html": body,
                            "sections": sections(body), "words": words(body)})
    # The Essentials: one page; each chapter's summary under its own heading
    ess = []
    for n, f in enumerate(sorted(os.listdir(os.path.join(BOOK, "essentials")))):
        html = to_html(os.path.join(BOOK, "essentials", f), f"e{n}-")
        _, heads = split_h1(html)
        for title, body in heads:
            m = re.match(r"Part (\d+): (.+)", title)
            if m:
                ess.append({"kind": "part", "title": m.group(2), "num": int(m.group(1))})
                continue
            ess.append({"kind": "section", "title": title, "id": slugify(title), "html": body.strip()})
    out = {"chapters": entries, "essentials": ess}
    with open(os.path.join(HERE, "playbook.json"), "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    ch = [e for e in entries if e["kind"] != "part"]
    print(f"{len(ch)} pages, {sum(e['words'] for e in ch)} words; essentials {len(ess)} blocks")


if __name__ == "__main__":
    main()
