"""E-books (EPUB) for e-readers: Kindle (through Send to Kindle), Kobo, and Apple Books on iPad, iPhone and Mac.

    python3 src/books/make_epubs.py [--check]

Writes:
    assets/books/playbook/the-product-managers-playbook-second-edition.epub   the full book
    assets/books/playbook/the-product-managers-playbook-essentials.epub       The Essentials
    assets/insights/<slug>/<slug>.epub                                         each published Product+ article
    assets/insights/product-plus-essays.epub                                   every article, in one book

Needs pandoc, Pillow, and Playwright (for the article covers, drawn by src/books/epub/cover.html). Run it by hand after
the book or an article changes, then python3 src/build.py (the pages show each file's size) and commit. With --check
it also runs epubcheck (the W3C validator) on every file, if EPUBCHECK points at epubcheck.jar.

Figures and covers are converted to JPEG (every e-reader shows it; WebP isn't), at most 1400 pixels wide."""
import datetime
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "src"))
from insights import ARTICLES, CATEGORIES, category  # noqa: E402

EPUB = os.path.join(HERE, "epub")
CSS = os.path.join(EPUB, "epub.css")
SITE = "https://www.productadvisory.co/"
YEAR = datetime.date.today().year
TOPIC = dict(CATEGORIES)
TMP = tempfile.mkdtemp(prefix="epubs-")
BOOK = "The Product Manager's Playbook"
BOOK_SUB = "Second Edition: Building Products in the Age of AI"


def jpeg(src, name, width=1400, quality=84):
    """A JPEG copy of an image in the temporary folder, for the e-book; returns its name there."""
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.join(TMP, name)), exist_ok=True)
    im.save(os.path.join(TMP, name), "JPEG", quality=quality, optimize=True, progressive=False)
    return name


def pandoc(src, out, fmt, meta, cover, toc_depth=1, extra=()):
    meta_file = os.path.join(TMP, os.path.basename(out) + ".yaml")
    with open(meta_file, "w") as f:
        json.dump(meta, f)   # JSON is valid YAML
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(["pandoc", src, "-f", fmt, "-t", "epub3", "-o", out, "--css", CSS, "--metadata-file", meta_file,
                    "--epub-cover-image", os.path.join(TMP, cover), "--epub-title-page=false", "--split-level=1",
                    "--toc", f"--toc-depth={toc_depth}", "--resource-path", TMP, *extra], check=True, cwd=TMP)
    print(f"  {os.path.relpath(out, ROOT)}  {os.path.getsize(out) / 1e6:.1f} MB")


def rights(who="Product Advisory, LLC"):
    return f"© {YEAR} {who}. Free to read and to share with your team. Please don't sell or republish it."


# ------------------------------------------------------------------------------------------------ the book
def book():
    src = os.path.join(HERE, "playbook")
    figs = os.path.join(ROOT, "assets", "books", "playbook", "fig")
    for f in os.listdir(figs):
        jpeg(os.path.join(figs, f), "fig/" + f.replace(".webp", ".jpg"))

    def prep(path, n):
        t = open(path).read()
        t = re.sub(r"\]\(\.\./fig/([0-9]+-[0-9]+)\.png\)\{[^}]*\}", r"](fig/\1.jpg)", t)
        t = re.sub(r"\[\^([^\]]+)\]", lambda m: f"[^c{n}-{m.group(1)}]", t)   # notes are numbered per chapter
        # checklists: a box to tick on paper, one line each, without bullets (pandoc would turn ☐ into a form checkbox)
        t = re.sub(r"(?:^- \[ \] .+\n?)+", lambda m: "::: checklist\n" + "".join(
            "□ " + line[6:] + "\n\n" for line in m.group(0).splitlines()) + ":::\n", t, flags=re.M)
        t = re.sub(r"^# (Part \d+: .+)$", r"# \1 {.part}", t, flags=re.M)
        return t

    def front(title, sub, by, kind):
        return (f"# {title} {{.unlisted .unnumbered .titlepage}}\n\n"
                f"::: titlepage\n\n[{sub}]{{.sub}}\n\n[{by}]{{.by}}\n\n"
                f"[{kind}]{{.by}}\n\n::: rights\n{rights('Robert Merrell')}\n\n"
                "Brindlepath, Ambermoor Health and everyone in their story are invented; any resemblance to real "
                "organizations or people is coincidental.\n\n"
                f"Read online, download the PDF, or start with The Essentials: {SITE}books/product-managers-playbook\n:::\n:::\n\n")

    for name, folder, cover, sub, kind, out in [
        (BOOK, "md", "cover-playbook.jpg", BOOK_SUB, "Product Advisory", "the-product-managers-playbook-second-edition.epub"),
        (BOOK + ": The Essentials", "essentials", "cover-essentials.jpg", "The Second Edition in brief: every chapter's big idea, key points, "
         "checklist and one thing to try this week", "Product Advisory", "the-product-managers-playbook-essentials.epub"),
    ]:
        files = sorted(f for f in os.listdir(os.path.join(src, folder)) if f.endswith(".md"))
        text = front(name, sub, "Robert Merrell", kind) + "\n\n".join(prep(os.path.join(src, folder, f), i) for i, f in enumerate(files))
        md = os.path.join(TMP, folder + ".md")
        open(md, "w").write(text)
        jpeg(os.path.join(EPUB, cover), cover, width=1600, quality=88)
        pandoc(md, os.path.join(ROOT, "assets", "books", "playbook", out), "markdown-task_lists", {
            "title": [{"type": "main", "text": name}, {"type": "subtitle", "text": sub}],
            "creator": [{"role": "author", "text": "Robert Merrell"}], "publisher": "Product Advisory",
            "lang": "en-US", "date": str(datetime.date.today()), "rights": rights("Robert Merrell"),
            "subject": ["Product management", "Artificial intelligence"],
            "description": "A practical guide to product management in the age of AI."
        }, cover, toc_depth=1)


# ------------------------------------------------------------------------------------------------ the articles
def published():
    return sorted([a for a in ARTICLES if a.get("body") and not a.get("draft")], key=lambda a: a["date"], reverse=True)


def absolute(s):
    """Links between our pages, made full addresses (an e-book has no site around it)."""
    return re.sub(r'href="/(?!/)', f'href="{SITE}', s)


def fmt_date(iso):
    d = datetime.date.fromisoformat(iso)
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")


def article_html(a, level=1, images=True):
    """One article as plain, clean HTML for pandoc: title, summary, takeaways, the article, questions and a link back."""
    h = lambda n: f"h{min(6, n + level - 1)}"   # noqa: E731
    slug, out = a["slug"], []
    out.append(f'<{h(1)} id="{slug}">{html.escape(a["title"])}</{h(1)}>')
    out.append(f'<p class="dek">{html.escape(a["dek"])}</p>')
    out.append(f'<p class="meta">Product+ · {html.escape(a["topic"])} · {fmt_date(a["date"])}</p>')
    if a.get("takeaways"):
        out.append(f'<div class="box"><{h(2)}>Key takeaways</{h(2)}><ul>' + "".join(f"<li>{html.escape(t)}</li>" for t in a["takeaways"]) + "</ul></div>")
    for b in a["body"]:
        k = b[0]
        if k == "h2":
            out.append(f"<{h(2)}>{absolute(b[1])}</{h(2)}>")
        elif k == "h3":
            out.append(f"<{h(3)}>{absolute(b[1])}</{h(3)}>")
        elif k == "p":
            out.append(f"<p>{absolute(b[1])}</p>")
        elif k in ("ul", "ol"):
            out.append(f"<{k}>" + "".join(f"<li>{absolute(i)}</li>" for i in b[1]) + f"</{k}>")
        elif k == "quote":
            out.append(f"<blockquote><p>{absolute(b[1])}</p></blockquote>")
        elif k == "fig" and images:
            img = jpeg(os.path.join(ROOT, "assets", "insights", slug, b[1]), f"art/{slug}/{b[1].rsplit('.', 1)[0]}.jpg")
            cap = f"<figcaption>{absolute(b[3])}</figcaption>" if b[3] else ""
            out.append(f'<figure><img src="{img}" alt="{html.escape(b[2])}"/>{cap}</figure>')
    if a.get("faq"):
        out.append(f"<{h(2)}>Questions people ask</{h(2)}>")
        for q, ans in a["faq"]:
            out.append(f"<{h(3)}>{html.escape(q)}</{h(3)}><p>{html.escape(ans)}</p>")
    out.append(f'<p class="foot">Read this article online, with audio and video: <a href="{SITE}insights/{slug}">{SITE}insights/{slug}</a></p>')
    return "\n".join(out)


def covers(jobs):
    """Draws each article's cover (and the collection's) with src/books/epub/cover.html, at 1728 × 2592."""
    script = os.path.join(TMP, "covers.mjs")
    open(script, "w").write("""
import { chromium } from '%s';
const jobs = JSON.parse(process.argv[2]);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 576, height: 864 }, deviceScaleFactor: 3 });
for (const j of jobs) {
  await p.addInitScript((c) => { window.COVER = c; }, j.cover);
  await p.goto('file://%s');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.locator('.c').screenshot({ path: j.out });
}
await b.close();
""" % (os.environ.get("PLAYWRIGHT_MJS", "/opt/node-tools/node_modules/playwright/index.mjs"), os.path.join(EPUB, "cover.html")))
    # one browser page per job keeps each cover's init script to itself
    for j in jobs:
        subprocess.run(["node", script, json.dumps([j])], check=True)


def articles():
    arts = published()
    jobs = [{"out": os.path.join(TMP, "cover-essays.png"), "cover": {"kind": "essays", "count": len(arts), "cats": [category(a) for a in reversed(arts)]}}]
    for a in arts:
        img = os.path.join(TMP, "art", a["slug"], "cover-art.jpg")
        jpeg(os.path.join(ROOT, "assets", "insights", a["slug"], "cover.webp"), f"art/{a['slug']}/cover-art.jpg", width=1600)
        jobs.append({"out": os.path.join(TMP, f"cover-{a['slug']}.png"), "cover": {
            "kind": "article", "title": a["title"], "dek": a["dek"], "topic": a["topic"], "cat": category(a), "image": "file://" + img}})
    covers(jobs)
    for j in jobs:
        jpeg(j["out"], os.path.basename(j["out"]).replace(".png", ".jpg"), width=1600, quality=88)

    def meta(title, sub, desc, subject):
        return {"title": [{"type": "main", "text": title}] + ([{"type": "subtitle", "text": sub}] if sub else []),
                "creator": [{"role": "author", "text": "Product Advisory"}], "publisher": "Product Advisory",
                "lang": "en-US", "date": str(datetime.date.today()), "rights": rights(), "description": desc, "subject": subject}

    for a in arts:
        src = os.path.join(TMP, a["slug"] + ".html")
        open(src, "w").write(f"<html><body>{article_html(a)}</body></html>")
        pandoc(src, os.path.join(ROOT, "assets", "insights", a["slug"], a["slug"] + ".epub"), "html",
               meta(a["title"], a["dek"], a.get("description") or a["dek"], ["Product management", a["topic"]]),
               f"cover-{a['slug']}.jpg", toc_depth=2)

    # the collection: an introduction, then every article, newest first
    intro = ["<h1 class=\"unnumbered\">About this collection</h1>",
             "<p>Every article from the Product+ Newsletter by Product Advisory: practical writing on product strategy, "
             "AI agents and AI enablement, newest first. Each one is also online, with audio and an animated video, at "
             f'<a href="{SITE}insights">{SITE}insights</a>.</p>',
             f"<p class=\"rights\">{rights()}</p>"]
    for cid, label in CATEGORIES:
        n = sum(1 for a in arts if category(a) == cid)
        intro.append(f"<p><b>{html.escape(label)}</b>: {n} article{'s' if n != 1 else ''}.</p>")
    body = "\n".join(intro) + "\n" + "\n".join(article_html(a) for a in arts)
    src = os.path.join(TMP, "essays.html")
    open(src, "w").write(f"<html><body>{body}</body></html>")
    pandoc(src, os.path.join(ROOT, "assets", "insights", "product-plus-essays.epub"), "html",
           meta("Product+ Essays", f"{len(arts)} articles on product strategy, AI agents and AI enablement",
                "Every article from the Product+ Newsletter by Product Advisory, in one book.", ["Product management", "Artificial intelligence"]),
           "cover-essays.jpg", toc_depth=1)


def check():
    jar = os.environ.get("EPUBCHECK")
    if not jar:
        print("(set EPUBCHECK=/path/to/epubcheck.jar to validate the files)")
        return True
    ok = True
    for d, _, fs in os.walk(os.path.join(ROOT, "assets")):
        for f in fs:
            if f.endswith(".epub"):
                r = subprocess.run(["java", "-jar", jar, "-q", os.path.join(d, f)], capture_output=True, text=True)
                bad = r.returncode != 0
                ok = ok and not bad
                print(("FAIL " if bad else "ok   ") + os.path.relpath(os.path.join(d, f), ROOT) + ("\n" + (r.stdout + r.stderr).strip() if bad else ""))
    return ok


if __name__ == "__main__":
    try:
        print("The book and The Essentials")
        book()
        print("The Product+ articles")
        articles()
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
    if "--check" in sys.argv and not check():
        sys.exit(1)
