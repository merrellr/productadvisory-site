"""The Product Manager's Playbook on the site: a landing page, one page per chapter, and The Essentials on one page,
built from src/books/playbook.json (src/books/make_book.py writes it from the book's Markdown)."""
import json
import os
import re
from html import escape

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = json.load(open(os.path.join(HERE, "playbook.json")))

NOTES_JS = '<script src="assets/js/notes.js" defer></script>\n'   # highlights, notes and tags (assets/js/notes.js)
TITLE = "The Product Manager's Playbook"
SUBTITLE = "Second Edition: Building Products in the Age of AI"
AUTHOR = "Robert Merrell"
LANDING = "books/product-managers-playbook"   # its chapters live in books/playbook/ (a page and a folder can't share a name)
DIR = "books/playbook"
ASSETS = "assets/books/playbook"
PDF = f"{ASSETS}/the-product-managers-playbook-second-edition.pdf"
ESS_PDF = f"{ASSETS}/the-product-managers-playbook-essentials.pdf"
PDF_PAGES = 219
EPUB = f"{ASSETS}/the-product-managers-playbook-second-edition.epub"      # e-books: src/books/make_epubs.py
ESS_EPUB = f"{ASSETS}/the-product-managers-playbook-essentials.epub"
ESSAYS = "assets/insights/product-plus-essays.epub"
GUIDE = "books/read-on-your-e-reader"
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


def download_buttons(cls="btn", epub=True):
    return (f'<a class="{cls}" href="{PDF}" download>{DL}Download the PDF <small>{size(PDF)}</small></a>'
            + (f'<a class="{cls}" href="{EPUB}" download title="For Kindle, Kobo, Apple Books and other e-readers">{DL}E-book (EPUB) <small>{size(EPUB)}</small></a>' if epub and size(EPUB) else ""))


def ess_download(cls="btn ghost", epub=True):
    return (f'<a class="{cls}" href="{ESS_PDF}" download>{DL}Essentials PDF <small>{size(ESS_PDF)}</small></a>'
            + (f'<a class="{cls}" href="{ESS_EPUB}" download title="For Kindle, Kobo, Apple Books and other e-readers">{DL}Essentials e-book <small>{size(ESS_EPUB)}</small></a>' if epub and size(ESS_EPUB) else ""))


def how_link(text="Reading on a Kindle, Kobo or iPad? Here's how"):
    return f'<a class="ereader-how" href="/{GUIDE}">{text} →</a>'


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
    return {"@type": "Book", "@id": SITE + LANDING + "#book", "name": TITLE, "alternativeHeadline": SUBTITLE,
            "author": {"@type": "Person", "name": AUTHOR}, "publisher": ORG, "bookEdition": "Second edition",
            "inLanguage": "en", "isAccessibleForFree": True, "url": SITE + LANDING, "image": f"{SITE}{ASSETS}/cover-og.jpg",
            "numberOfPages": PDF_PAGES, "description": BLURB,
            "workExample": [{"@type": "Book", "bookFormat": "https://schema.org/EBook", "encodingFormat": "application/pdf", "url": SITE + PDF}],
            "hasPart": [{"@type": "Chapter", "name": e["title"], "position": e["num"], "url": SITE + url(e)[1:]} for e in chapters()]}


def rail(current, sections, back=(f"/{LANDING}", "← The Playbook")):
    toc = "".join(f'<li><a href="#{s["id"]}">{escape(s["title"])}</a></li>' for s in sections)
    return (f'<aside class="post-rail book-rail" aria-label="About this book"><div class="post-rail-in">'
            f'<a class="link-back" href="{back[0]}">{back[1]}</a>'
            f'<details class="book-toc-m"><summary>Contents</summary><nav class="book-toc" aria-label="Book contents (menu)">{toc_list(current)}</nav></details>'
            + (f'<nav class="post-toc" aria-label="On this page"><h2>On this page</h2><ol>{toc}</ol></nav>' if toc else "")
            + f'<nav class="book-toc book-toc-w" aria-label="Book contents"><h2>The book</h2>{toc_list(current)}</nav>'
            f'<div class="book-rail-dl"><a href="{PDF}" download>{DL}PDF, {size(PDF)}</a><a href="{EPUB}" download>{DL}E-book, {size(EPUB)}</a><a href="/{DIR}/essentials">The Essentials</a><a href="/{GUIDE}">On a Kindle, Kobo or iPad</a></div>'
            '</div></aside>')


def landing(page, write, ld, ORG, SITE, cta_band):
    ess = [e for e in DATA["essentials"] if e["kind"] == "section"]
    words = sum(e["words"] for e in pages())
    first = pages()[0]
    contents = []
    for e in DATA["chapters"]:
        if e["kind"] == "part":
            contents.append(f'<div class="bk-part"><span>Part {e["num"]}</span><b>{escape(e["title"])}</b></div>')
        else:
            n = f'<span class="bk-n">{e["num"]}</span>' if e["kind"] == "chapter" else '<span class="bk-n"></span>'
            contents.append(f'<a class="bk-ch" href="{url(e)}">{n}<span class="bk-t">{escape(e["title"])}</span>'
                            f'<small>{minutes(e["words"])} min</small></a>')
    body = f'''<section class="book-hero">
  <div class="wrap">
    <div class="book-cover"><img src="{ASSETS}/cover.webp" alt="Cover: {TITLE}, second edition, by {AUTHOR}" width="720" height="1080" fetchpriority="high"></div>
    <div class="book-intro">
      <a class="link-back" href="insights.html">← Insights</a>
      <div class="eyebrow">Free book · Second edition</div>
      <h1>{TITLE}</h1>
      <p class="book-sub">{SUBTITLE}</p>
      <p>{BLURB}</p>
      <ul class="book-stats"><li><b>18</b> chapters</li><li><b>49</b> figures</li><li><b>10</b> templates</li><li><b>{words // 1000}k</b> words</li></ul>
      <div class="btn-row"><a class="btn" href="{url(first)}">Read online</a>{download_buttons("btn ghost")}</div>
      <p class="book-by">By {AUTHOR}, Product Advisory. The e-book works on Kindle, Kobo, Apple Books and other e-readers. Audio edition coming soon.</p>
      <p class="book-by">{how_link()}</p>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <div class="ess-card reveal">
      <img src="{ASSETS}/cover-essentials.webp" alt="Cover: The Essentials" width="720" height="1080" loading="lazy">
      <div>
        <div class="eyebrow">The short version</div>
        <h2>The Essentials</h2>
        <p>Every chapter's big idea, key points, one figure, the checklist and one thing to try this week. The whole book in about {minutes(sum(len(re.sub(r"<[^>]+>", " ", e["html"]).split()) for e in ess))} minutes: read it before the book to see the map, or after it as a refresher.</p>
        <div class="btn-row"><a class="btn" href="/{DIR}/essentials">Read The Essentials</a>{ess_download()}</div>
      </div>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="section-head reveal"><h2>Contents</h2><p>Every chapter follows Brindlepath, a fictional healthcare software company, and ends with common mistakes, something to try, how AI changes the work, and a checklist.</p></div>
    <div class="bk-contents">{"".join(contents)}</div>
  </div>
</section>
{cta_band("Want help putting the playbook to work?", "We help product teams turn these ideas into a strategy, a roadmap and a rhythm that fits how you actually work.")}'''
    write(f"{LANDING}.html", page(f"{LANDING}.html", f"{TITLE} (free book)", BLURB, body,
          extra_head=ld(book_ld(ORG, SITE), crumbs=[("Insights", "insights"), (TITLE, LANDING)]),
          image=f"{ASSETS}/cover-og.jpg", nav="insights.html", og_type="book"))


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
    node = {"@type": "Chapter", "name": e["title"], "url": SITE + url(e)[1:], "isPartOf": {"@id": SITE + LANDING + "#book"}, "author": {"@type": "Person", "name": AUTHOR}}
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
      <p class="byline"><a href="/{LANDING}">{TITLE}</a> · {minutes(e["words"])} min read</p>
    </div>
  </header>
  <div class="wrap narrow">
    <div class="prose post-body">
{html}
    </div>
    {pager}
    <aside class="post-foot book-foot">
      <p><b>Read it your way.</b> Download the whole book as a PDF or an e-book for your Kindle, Kobo or iPad, or read The Essentials: every chapter on a page or two. {how_link("How to send it to your e-reader")}</p>
      <div class="btn-row">{download_buttons("btn sm")}<a class="btn sm ghost" href="/{DIR}/essentials">The Essentials</a></div>
    </aside>
  </div>
  </div>
 </div>
</article>'''
    desc = f"{name}, from {TITLE}: {SUBTITLE}. Free to read online."
    write(f"{DIR}/{e['slug']}.html", page(f"{DIR}/{e['slug']}.html", f"{e['title']} | {TITLE}" if len(e["title"]) < 40 else e["title"], desc, body,
          extra_head=NOTES_JS + ld(node, crumbs=[("Insights", "insights"), (TITLE, LANDING), (e["title"], f"{DIR}/{e['slug']}")]),
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
      <p class="byline" style="margin-top:10px">{how_link()}</p>
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
          extra_head=NOTES_JS + ld({"@type": "Book", "name": f"{TITLE}: The Essentials", "author": {"@type": "Person", "name": AUTHOR}, "publisher": ORG,
                         "isAccessibleForFree": True, "url": SITE + DIR + "/essentials", "isBasedOn": {"@id": SITE + LANDING + "#book"}},
                        crumbs=[("Insights", "insights"), (TITLE, LANDING), ("The Essentials", f"{DIR}/essentials")]),
          image=f"{ASSETS}/cover-essentials-og.jpg", nav="insights.html", og_type="book"))


def promo():
    """The Books block on the Insights page."""
    return f'''<aside class="books-promo reveal" aria-label="Free book" data-ask="{TITLE}: free book" data-kind="Book" data-keywords="book ebook pdf playbook essentials guide download free">
      <a class="bp-covers" href="/{LANDING}" tabindex="-1" aria-hidden="true"><img src="{ASSETS}/cover.webp" alt="" width="720" height="1080" loading="lazy"><img src="{ASSETS}/cover-essentials.webp" alt="" width="720" height="1080" loading="lazy"></a>
      <div class="bp-text">
        <div class="eyebrow">New · Free book</div>
        <h2><a href="/{LANDING}">{TITLE}</a></h2>
        <p>{SUBTITLE}. Eighteen chapters on building and leading products, with AI inside every one. Read it online, download it, or start with The Essentials.</p>
        <div class="btn-row"><a class="btn sm" href="{START}">Read online</a><a class="btn sm ghost" href="/{DIR}/essentials">The Essentials</a></div>
        <p class="bp-dl"><span>Download:</span> <a href="{PDF}" download>PDF <small>{size(PDF)}</small></a> · <a href="{EPUB}" download>E-book <small>{size(EPUB)}</small></a> · <a href="{ESS_PDF}" download>Essentials PDF <small>{size(ESS_PDF)}</small></a> · <a href="{ESS_EPUB}" download>Essentials e-book <small>{size(ESS_EPUB)}</small></a> · <a href="/{GUIDE}">Kindle, Kobo or iPad?</a></p>
      </div>
    </aside>'''


def guide(page, write, ld, ORG, SITE, articles):
    """How to read the e-books on a Kindle, Kobo, iPad or phone, and every e-book in one list."""
    def row(href, title, sub):
        return (f'<li><a href="{href}" download>{DL}<span><b>{escape(title)}</b><small>{escape(sub)} · EPUB, {size(href)}</small></span></a></li>' if size(href) else "")
    arts = "".join(row(f"assets/insights/{a['slug']}/{a['slug']}.epub", a["title"], a["topic"]) for a in articles)
    body = f'''<section class="ereader">
  <div class="wrap narrow">
    <a class="link-back" href="insights.html">← Insights</a>
    <div class="eyebrow">Free e-books</div>
    <h1>Read on your Kindle, Kobo or iPad</h1>
    <p class="dek">Every Product+ article and <i>{TITLE}</i> come as e-books (EPUB files). The text fits your screen, and your reader's own fonts, sizes and night mode all work.</p>
    <div class="seg er-pick" role="radiogroup" aria-label="Show the steps for" data-er-pick>
      <button type="button" role="radio" aria-checked="true" data-device="all">All</button>
      <button type="button" role="radio" aria-checked="false" data-device="kindle">Kindle</button>
      <button type="button" role="radio" aria-checked="false" data-device="apple">Apple</button>
      <button type="button" role="radio" aria-checked="false" data-device="kobo">Kobo</button>
      <button type="button" role="radio" aria-checked="false" data-device="android">Android</button>
    </div>
    <div class="er-steps" id="er-steps" aria-live="polite">
      <section data-device="apple"><h2>iPad, iPhone or Mac</h2><ol><li>Tap <b>Download</b> on the e-book you want.</li><li>Open the file and choose <b>Books</b> (on iPhone and iPad, from the Share button).</li><li>It's in your library, on every Apple device you use.</li></ol></section>
      <section data-device="kindle"><h2>Kindle</h2><ol><li>Download the e-book.</li><li>Send it with Amazon's <b>Send to Kindle</b>: drag it onto <a href="https://www.amazon.com/sendtokindle" target="_blank" rel="noopener">amazon.com/sendtokindle</a>, share it to the Kindle app on your phone, or email it to your Kindle's address.</li><li>Amazon converts it, and it appears on your Kindle and in the Kindle app.</li></ol><p class="small">Emailing it? Add your own address to the approved list in your Amazon account first (Manage your content and devices, then Preferences, then Personal document settings).</p></section>
      <section data-device="kobo"><h2>Kobo</h2><ol><li>Download the e-book on your computer.</li><li>Connect your Kobo by USB and drag the file onto it, or save it to your Dropbox or Google Drive if you've linked one to your Kobo.</li><li>Eject the Kobo; the book is in your library.</li></ol></section>
      <section data-device="android"><h2>Android and others</h2><ol><li>Download the e-book.</li><li>Open it in Google Play Books (choose <b>Upload files</b>) or any e-book app.</li></ol><p class="small">Prefer a fixed page you can print? Every book is also a PDF.</p></section>
    </div>
    <h2 id="all">Every e-book</h2>
    <ul class="er-list">
      {row(EPUB, TITLE, "The full book, second edition")}
      {row(ESS_EPUB, "The Essentials", "The book in brief")}
      {row(ESSAYS, "Product+ Essays", "Every Product+ article in one book")}
    </ul>
    <h3>Each article on its own</h3>
    <ul class="er-list compact">{arts}</ul>
  </div>
</section>'''
    write(f"{GUIDE}.html", page(f"{GUIDE}.html", "Read on your Kindle, Kobo or iPad",
          "Free e-books of every Product+ article and The Product Manager's Playbook, with how to read them on a Kindle, Kobo, iPad or phone.", body,
          extra_head=ld({"@type": "WebPage", "name": "Read on your Kindle, Kobo or iPad", "url": SITE + GUIDE, "publisher": ORG},
                        crumbs=[("Insights", "insights"), ("Read on your e-reader", GUIDE)]),
          image=f"{ASSETS}/cover-og.jpg", nav="insights.html"))


def build(page, write, ld, ORG, SITE, cta_band, articles=()):
    landing(page, write, ld, ORG, SITE, cta_band)
    guide(page, write, ld, ORG, SITE, articles)
    for e in pages():
        chapter_page(e, page, write, ld, ORG, SITE)
    essentials_page(page, write, ld, ORG, SITE)


def sitemap_paths():
    return [LANDING] + [url(e)[1:] for e in pages()] + [f"{DIR}/essentials", GUIDE]


def llms_lines(SITE):
    return "\n".join([f"- [{TITLE}]({SITE}{LANDING}): {SUBTITLE}. A free book, online and as a PDF ({SITE}{PDF}).",
                      f"- [The Essentials]({SITE}{DIR}/essentials): the book in brief, every chapter's big idea, key points and checklist (PDF: {SITE}{ESS_PDF}).",
                      f"- [Read on your Kindle, Kobo or iPad]({SITE}{GUIDE}): free e-books (EPUB) of the book, The Essentials and every Product+ article ({SITE}{ESSAYS})."]
                     + [f"  - [{label(e)}: {e['title']}]({SITE}{url(e)[1:]})" for e in pages()])


START = start()
