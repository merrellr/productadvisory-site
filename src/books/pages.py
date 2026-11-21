"""The Product Manager's Playbook on the site: a landing page, one page per chapter, and The Essentials on one page,
built from src/books/playbook.json (src/books/make_book.py writes it from the book's Markdown)."""
import json
import os
import re
from html import escape

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = json.load(open(os.path.join(HERE, "playbook.json")))

TITLE = "The Product Manager's Playbook"
SUBTITLE = "Second Edition: Building Products in the Age of AI"
AUTHOR = "Robert Merrell"
LANDING = "books/product-managers-playbook"   # its chapters live in books/playbook/ (a page and a folder can't share a name)
DIR = "books/playbook"
ASSETS = "assets/books/playbook"
PDF = f"{ASSETS}/the-product-managers-playbook-second-edition.pdf"
ESS_PDF = f"{ASSETS}/the-product-managers-playbook-essentials.pdf"
PDF_PAGES = 219
BLURB = ("A practical guide to product management in the age of AI: finding problems worth solving, strategy, the numbers, "
         "teams, trust, customers and growth, with AI inside every chapter. Eighteen chapters, 49 figures, ten templates "
         "and a checklist for every chapter. Free to read online or download.")


def start():
    return url(pages()[0])


def pages():
    return [e for e in DATA["chapters"] if e["kind"] != "part"]


def chapters():
    return [e for e in DATA["chapters"] if e["kind"] == "chapter"]


START = None  # set below


def part_of(entry):
    part = None
    for e in DATA["chapters"]:
        if e["kind"] == "part":
            part = e
        if e is entry:
            return part if entry["kind"] == "chapter" else None


def url(e):
    return f"/{DIR}/{e['slug']}"


def label(e):
    return f"Chapter {e['num']}" if e["kind"] == "chapter" else ("Appendix" if e["kind"] == "appendix" else "Front matter")


def minutes(n):
    return max(1, round(n / 230))


def size(path):
    p = os.path.join(ROOT, path)
    return f"{os.path.getsize(p) / 1e6:.1f} MB" if os.path.exists(p) else ""


DL = ('<svg class="dl-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>')


def download_buttons(cls="btn"):
    return (f'<a class="{cls}" href="{PDF}" download>{DL}Download the PDF <small>{size(PDF)}</small></a>')


def ess_download(cls="btn ghost"):
    return f'<a class="{cls}" href="{ESS_PDF}" download>{DL}Essentials PDF <small>{size(ESS_PDF)}</small></a>'


def toc_list(current=None, numbered=True):
    """The whole book, grouped by part; the page you're on is marked."""
    out, open_ol = [], False
    for e in DATA["chapters"]:
        if e["kind"] == "part":
            if open_ol:
                out.append("</ol>")
            out.append(f'<h3>Part {e["num"]}: {escape(e["title"])}</h3><ol>')
            open_ol = True
            continue
        if e["kind"] == "appendix" and open_ol:
            out.append("</ol><ol>")
        if not open_ol:
            out.append("<ol>")
            open_ol = True
        cur = ' aria-current="page"' if e is current else ""
        num = f'<span class="bt-n">{e["num"]}</span>' if e["kind"] == "chapter" and numbered else '<span class="bt-n"></span>'
        out.append(f'<li><a href="{url(e)}"{cur}>{num}<span>{escape(e["title"])}</span></a></li>')
    out.append("</ol>")
    return "".join(out)


def book_ld(ORG, SITE):
    return {"@type": "Book", "@id": SITE + START[1:] + "#book", "name": TITLE, "alternativeHeadline": SUBTITLE,
            "author": {"@type": "Person", "name": AUTHOR}, "publisher": ORG, "bookEdition": "Second edition",
            "inLanguage": "en", "isAccessibleForFree": True, "url": SITE + START[1:], "image": f"{SITE}{ASSETS}/cover-og.jpg",
            "numberOfPages": PDF_PAGES, "description": BLURB,
            "workExample": [{"@type": "Book", "bookFormat": "https://schema.org/EBook", "encodingFormat": "application/pdf", "url": SITE + PDF}],
            "hasPart": [{"@type": "Chapter", "name": e["title"], "position": e["num"], "url": SITE + url(e)[1:]} for e in chapters()]}


def rail(current, sections, back=("/insights", "← Insights")):
    toc = "".join(f'<li><a href="#{s["id"]}">{escape(s["title"])}</a></li>' for s in sections)
    return (f'<aside class="post-rail book-rail" aria-label="About this book"><div class="post-rail-in">'
            f'<a class="link-back" href="{back[0]}">{back[1]}</a>'
            f'<details class="book-toc-m"><summary>Contents</summary><nav class="book-toc" aria-label="Book contents (menu)">{toc_list(current)}</nav></details>'
            + (f'<nav class="post-toc" aria-label="On this page"><h2>On this page</h2><ol>{toc}</ol></nav>' if toc else "")
            + f'<nav class="book-toc book-toc-w" aria-label="Book contents"><h2>The book</h2>{toc_list(current)}</nav>'
            f'<div class="book-rail-dl"><a href="{PDF}" download>{DL}PDF, {size(PDF)}</a><a href="/{DIR}/essentials">The Essentials</a></div>'
            '</div></aside>')


def landing(page, write, ld, ORG, SITE, cta_band):
    """The book's first address (briefly a landing page): now it just forwards to the start of the book."""
    to = SITE + START[1:]
    write(f"{LANDING}.html", f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{TITLE}</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{to}">
<meta http-equiv="refresh" content="0; url={START}">
<script>location.replace("{START}" + location.hash)</script></head>
<body><p><a href="{START}">{TITLE}</a></p></body></html>
''')


def chapter_page(e, page, write, ld, ORG, SITE):
    ps = pages()
    i = ps.index(e)
    prev, nxt = (ps[i - 1] if i else None), (ps[i + 1] if i + 1 < len(ps) else None)
    part = part_of(e)
    eyebrow = f'{label(e)}' + (f' · Part {part["num"]}: {escape(part["title"])}' if part else "")
    epi = f'<blockquote class="epigraph">{e["epigraph"]}</blockquote>' if e["epigraph"] else ""
    html = e["html"].replace('role="doc-endnotes">\n<hr />', 'role="doc-endnotes">\n<h2>Notes</h2>')
    pager = '<nav class="book-pager" aria-label="Chapters">' + \
        (f'<a class="prev" href="{url(prev)}"><small>← Previous</small><b>{escape(prev["title"])}</b></a>' if prev else '<span></span>') + \
        (f'<a class="next" href="{url(nxt)}"><small>Next →</small><b>{escape(nxt["title"])}</b></a>' if nxt else
         f'<a class="next" href="/{DIR}/essentials"><small>Next →</small><b>The Essentials</b></a>') + '</nav>'
    name = f"{label(e)}. {e['title']}" if e["kind"] == "chapter" else e["title"]
    first = i == 0
    node = {"@type": "Chapter", "name": e["title"], "url": SITE + url(e)[1:], "isPartOf": {"@id": SITE + START[1:] + "#book"}, "author": {"@type": "Person", "name": AUTHOR}}
    if e["num"]:
        node["position"] = e["num"]
    body = f'''<article class="post book-page">
 <div class="post-grid">
  {rail(e, e["sections"])}
  <div class="post-main">
  <header class="post-head">
    <div class="wrap narrow">
      <div class="eyebrow">{eyebrow}</div>
      <h1>{escape(e["title"])}</h1>
      {epi}
      <p class="byline"><a href="{START}">{TITLE}</a> · {minutes(e["words"])} min read</p>
    </div>
  </header>
  <div class="wrap narrow">
    <div class="prose post-body">
{html}
    </div>
    {pager}
    <aside class="post-foot book-foot">
      <p><b>Read it your way.</b> Download the whole book as a PDF, or read The Essentials: every chapter on a page or two.</p>
      <div class="btn-row">{download_buttons("btn sm")}<a class="btn sm ghost" href="/{DIR}/essentials">The Essentials</a></div>
    </aside>
  </div>
  </div>
 </div>
</article>'''
    desc = f"{name}, from {TITLE}: {SUBTITLE}. Free to read online."
    write(f"{DIR}/{e['slug']}.html", page(f"{DIR}/{e['slug']}.html", f"{e['title']} | {TITLE}" if len(e["title"]) < 40 else e["title"], desc, body,
          extra_head=ld(*([book_ld(ORG, SITE)] if first else []), node, crumbs=[("Insights", "insights"), (TITLE, START[1:]), (e["title"], f"{DIR}/{e['slug']}")]),
          image=f"{ASSETS}/cover-og.jpg", nav="insights.html", og_type="article"))


def essentials_page(page, write, ld, ORG, SITE):
    by_num = {c["num"]: c for c in chapters()}
    blocks, secs = [], []
    for b in DATA["essentials"]:
        if b["kind"] == "part":
            blocks.append(f'<p class="ess-part">Part {b["num"]}: {escape(b["title"])}</p>')
            continue
        num = b["title"].split(".")[0]
        more = by_num.get(int(num)) if num.isdigit() else None
        link = f'<p class="ess-more"><a href="{url(more)}">Read the full chapter →</a></p>' if more else ""
        blocks.append(f'<section class="ess-sec"><h2 id="{b["id"]}">{escape(b["title"])}</h2>{b["html"]}{link}</section>')
        secs.append({"id": b["id"], "title": b["title"]})
    body = f'''<article class="post book-page">
 <div class="post-grid">
  {rail(None, secs)}
  <div class="post-main">
  <header class="post-head">
    <div class="wrap narrow">
      <div class="eyebrow">The short version</div>
      <h1>The Essentials</h1>
      <p class="dek">{TITLE}, chapter by chapter: the big idea, key points, one figure, the checklist and one thing to try this week.</p>
      <div class="btn-row">{ess_download("btn sm")}<a class="btn sm ghost" href="{START}">The full book</a></div>
    </div>
  </header>
  <div class="wrap narrow">
    <div class="prose post-body">
{"".join(blocks)}
    </div>
    <aside class="post-foot book-foot">
      <p><b>Want the whole story?</b> The full book explains each idea in depth, with worked examples, common mistakes, templates and sources.</p>
      <div class="btn-row"><a class="btn sm" href="{url(pages()[0])}">Read the book online</a>{download_buttons("btn sm ghost")}</div>
    </aside>
  </div>
  </div>
 </div>
</article>'''
    write(f"{DIR}/essentials.html", page(f"{DIR}/essentials.html", f"The Essentials | {TITLE}",
          f"{TITLE} in brief: every chapter's big idea, key points, checklist and one thing to try this week. Free online and as a PDF.", body,
          extra_head=ld({"@type": "Book", "name": f"{TITLE}: The Essentials", "author": {"@type": "Person", "name": AUTHOR}, "publisher": ORG,
                         "isAccessibleForFree": True, "url": SITE + DIR + "/essentials", "isBasedOn": {"@id": SITE + START[1:] + "#book"}},
                        crumbs=[("Insights", "insights"), (TITLE, START[1:]), ("The Essentials", f"{DIR}/essentials")]),
          image=f"{ASSETS}/cover-essentials-og.jpg", nav="insights.html", og_type="book"))


def promo():
    """The Books block on the Insights page."""
    return f'''<aside class="books-promo reveal" aria-label="Free book" data-ask="{TITLE}: free book" data-kind="Book" data-keywords="book ebook pdf playbook essentials guide download free">
      <a class="bp-covers" href="{START}" tabindex="-1" aria-hidden="true"><img src="{ASSETS}/cover.webp" alt="" width="720" height="1080" loading="lazy"><img src="{ASSETS}/cover-essentials.webp" alt="" width="720" height="1080" loading="lazy"></a>
      <div class="bp-text">
        <div class="eyebrow">New · Free book</div>
        <h2><a href="{START}">{TITLE}</a></h2>
        <p>{SUBTITLE}. Eighteen chapters on building and leading products, with AI inside every one. Read it online, download the PDF, or start with The Essentials.</p>
        <div class="btn-row"><a class="btn sm" href="{START}">Read online</a>{download_buttons("btn sm ghost")}<a class="btn sm ghost" href="/{DIR}/essentials">The Essentials</a>{ess_download("btn sm ghost")}</div>
      </div>
    </aside>'''


def build(page, write, ld, ORG, SITE, cta_band):
    landing(page, write, ld, ORG, SITE, cta_band)
    for e in pages():
        chapter_page(e, page, write, ld, ORG, SITE)
    essentials_page(page, write, ld, ORG, SITE)


def sitemap_paths():
    return [url(e)[1:] for e in pages()] + [f"{DIR}/essentials"]


def llms_lines(SITE):
    return "\n".join([f"- [{TITLE}]({SITE}{START[1:]}): {SUBTITLE}. A free book, online and as a PDF ({SITE}{PDF}).",
                      f"- [The Essentials]({SITE}{DIR}/essentials): the book in brief, every chapter's big idea, key points and checklist (PDF: {SITE}{ESS_PDF})."]
                     + [f"  - [{label(e)}: {e['title']}]({SITE}{url(e)[1:]})" for e in pages()])


START = start()
