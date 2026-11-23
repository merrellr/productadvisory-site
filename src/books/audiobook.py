"""The audio edition of the book on the site: the player on each page, the "Listen to the book" section of the landing
page, and the two podcast feeds. The narration itself is made by src/books/make_book_audio.py; src/books/audio.py
knows which parts of a page are spoken and when."""
import os
from html import escape

from books import audio as AUDIO
from books import pages as P

FEED = f"{P.DIR}/podcast.xml"                  # the audiobook as a podcast: one episode per page of the book, in order
ESS_FEED = f"{P.DIR}/essentials-podcast.xml"   # The Essentials as a podcast
COVER = f"{AUDIO.WEB}/cover-audiobook.jpg"     # square covers, for podcast apps and phone lock screens
COVER_ESS = f"{AUDIO.WEB}/cover-essentials-audio.jpg"
SITE_URL = "https://www.productadvisory.co/"
# Where the shows are listed (add Apple Podcasts here once it approves them)
SPOTIFY = "https://open.spotify.com/show/1gRpfoIYfUzxu8N7XD2Eas"
SPOTIFY_ESS = "https://open.spotify.com/show/6jwBwBQ1KVExXKwrrYwXN5"
TOOLS = {}   # build.py's player and helpers: {player, minutes, clock, fmt_icon}


def page_title(e):
    return f"{P.label(e)}: {e['title']}" if e["kind"] == "chapter" else e["title"]


def player_for(e, body):
    """(the body with its read-along marks, the player, the Read/Listen buttons) for a page of the book (e) or The
    Essentials (None). Without narration, or without the build helpers: the body as it is, no player."""
    slug = e["slug"] if e else "essentials"
    m = AUDIO.meta(slug)
    if not m or not TOOLS:
        return body, "", ""
    marked = AUDIO.annotate(body, AUDIO.timing(slug))
    book = {"book": "playbook", "mp3": f"{AUDIO.WEB}/{slug}.mp3", "read_along": marked != body, "unit": "Section",
            "album": P.TITLE if e else f"{P.TITLE}: The Essentials", "cover": "/" + (COVER if e else COVER_ESS),
            "page_url": P.url(e) if e else f"/{P.DIR}/essentials", "feed": "/" + (FEED if e else ESS_FEED),
            "feed_page": f"/{P.LANDING}#listen", "spotify": SPOTIFY if e else SPOTIFY_ESS}
    if e:
        ps = P.pages()
        i = ps.index(e)
        nxt = ps[i + 1] if i + 1 < len(ps) else None
        nslug = nxt["slug"] if nxt else "essentials"
        if AUDIO.meta(nslug):
            book.update(next_url=P.url(nxt) if nxt else f"/{P.DIR}/essentials", next_title=page_title(nxt) if nxt else "The Essentials",
                        next_src=f"{AUDIO.WEB}/{nslug}.mp3")
    player = TOOLS["player"]({"slug": "playbook/" + slug, "title": page_title(e) if e else "The Essentials"}, m, book=book)
    words = e["words"] if e else len(AUDIO.text_of(body).split())
    icon = TOOLS["fmt_icon"]
    fmts = ('<div class="fmts" aria-label="Ways to take in this chapter">'
            f'<a class="fmt fmt-read" href="#read">{icon("read")}<b>Read</b><span>{P.minutes(words)} min</span></a>'
            f'<a class="fmt fmt-listen" href="#listen" data-open="listen" aria-controls="listen" aria-expanded="false">{icon("listen")}'
            f'<b>Listen</b><span>{TOOLS["minutes"](m)} min</span></a></div>')
    return marked, player, fmts


def totals():
    """(seconds for the whole book, seconds for The Essentials)."""
    return (sum((AUDIO.meta(e["slug"]) or {}).get("duration", 0) for e in P.pages()),
            (AUDIO.meta("essentials") or {}).get("duration", 0))


def hours(sec):
    h, m = int(sec // 3600), int(round(sec % 3600 / 60))
    return (f"{h} h " if h else "") + f"{m} min"


def listen_section():
    """"Listen to the book" on the landing page: every chapter to play or download, and the book in a podcast app."""
    book_s, ess_s = totals()
    if not book_s or not TOOLS:
        return ""
    clock = TOOLS["clock"]
    rows = []
    for e in P.DATA["chapters"]:
        if e["kind"] == "part":
            rows.append(f'<li class="al-part">Part {e["num"]}: {escape(e["title"])}</li>')
            continue
        m = AUDIO.meta(e["slug"])
        if not m:
            continue
        rows.append(f'<li><a class="al-play" data-listen-go href="{P.url(e)}#listen"><span class="al-n">{e["num"] or ""}</span>'
                    f'<span class="al-t">{escape(e["title"])}</span><span class="al-d">{clock(m["duration"])}</span></a>'
                    f'<a class="al-dl" href="{AUDIO.WEB}/{e["slug"]}.mp3" download aria-label="Download {escape(e["title"])}, MP3, '
                    f'{m["bytes"] / 1e6:.0f} MB">MP3</a></li>')
    ess = AUDIO.meta("essentials")
    if ess:
        rows.append('<li class="al-part">The short version</li>'
                    f'<li><a class="al-play" data-listen-go href="/{P.DIR}/essentials#listen"><span class="al-n"></span><span class="al-t">The Essentials</span>'
                    f'<span class="al-d">{clock(ess["duration"])}</span></a><a class="al-dl" href="{AUDIO.WEB}/essentials.mp3" download '
                    f'aria-label="Download The Essentials, MP3">MP3</a></li>')
    feed, efeed = SITE_URL + FEED, SITE_URL + ESS_FEED
    bare = lambda u: u.split("://", 1)[1]
    return (f'<section class="band audio-ed" id="listen" aria-labelledby="ae-h">\n  <div class="wrap">\n    <div class="ae-grid">\n'
            f'      <div class="ae-intro reveal">\n        <div class="eyebrow">Audio edition · Free</div>\n'
            f'        <h2 id="ae-h">Listen to the book</h2>\n'
            f'        <p>The whole book read aloud ({hours(book_s)}), and The Essentials in {hours(ess_s)}. Press play on any chapter and '
            f'the text follows along, highlighted as it\'s read. It goes on to the next chapter by itself, remembers where you '
            f'stopped, and works from your lock screen.</p>\n'
            f'        <div class="ae-resume" data-book-resume="playbook" hidden></div>\n'
            f'        <div class="btn-row"><a class="btn" data-listen-go href="{P.url(P.pages()[0])}#listen">Start listening</a>'
            f'<a class="btn ghost" data-listen-go href="/{P.DIR}/essentials#listen">The Essentials, {hours(ess_s)}</a></div>\n'
            f'        <h3>In your podcast app</h3>\n'
            f'        <p class="ae-small">Follow the book like a podcast, one episode per chapter: offline, in the car or on a walk.</p>\n'
            f'        <div class="ae-subs"><a class="sub-btn" href="{SPOTIFY}" target="_blank" rel="noopener">Spotify</a>'
            f'<a class="sub-btn" href="podcast://{bare(feed)}">Apple Podcasts</a>'
            f'<a class="sub-btn" href="https://overcast.fm/itunes?url={feed}" target="_blank" rel="noopener">Overcast</a>'
            f'<a class="sub-btn" href="https://pocketcasts.com/submit?url={feed}" target="_blank" rel="noopener">Pocket Casts</a>'
            f'<a class="sub-btn" href="/{FEED}" data-copy-feed>Copy the feed</a></div>\n'
            f'        <p class="ae-small">The Essentials is its own show: <a href="{SPOTIFY_ESS}" target="_blank" rel="noopener">Spotify</a> · '
            f'<a href="podcast://{bare(efeed)}">Apple Podcasts</a> · '
            f'<a href="/{ESS_FEED}" data-copy-feed>copy the feed</a>. Other apps: <a href="/listen">how to add a feed</a>.</p>\n'
            f'      </div>\n      <ol class="ae-list reveal" aria-label="Chapters to listen to">{"".join(rows)}</ol>\n'
            f'    </div>\n  </div>\n</section>')


def feeds(xml_escape):
    """The two podcast feeds: the audiobook (a serial show, one episode per page of the book, in order) and The
    Essentials. Apple Podcasts, Overcast, Pocket Casts and any app that takes a feed address can follow them."""
    def item(n, slug, title, desc, link, m, cover):
        return (f'\n  <item>\n    <title>{xml_escape(title)}</title>\n    <description>{xml_escape(desc)}</description>\n'
                f'    <link>{link}</link>\n    <guid isPermaLink="false">productadvisory-playbook-{slug}</guid>\n'
                f'    <pubDate>Mon, 23 Nov 2026 {n // 60:02d}:{n % 60:02d}:00 +0000</pubDate>\n'
                f'    <enclosure url="{SITE_URL}{AUDIO.WEB[1:]}/{slug}.mp3" length="{m["bytes"]}" type="audio/mpeg"/>\n'
                f'    <itunes:duration>{int(round(m["duration"]))}</itunes:duration>\n    <itunes:episode>{n}</itunes:episode>\n'
                f'    <itunes:episodeType>full</itunes:episodeType>\n    <itunes:explicit>false</itunes:explicit>\n'
                f'    <itunes:image href="{cover}"/>\n  </item>')

    def channel(path, title, desc, link, cover, items):
        return ('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" '
                'xmlns:podcast="https://podcastindex.org/namespace/1.0">\n<channel>\n'
                f'  <title>{xml_escape(title)}</title>\n  <link>{link}</link>\n'
                f'  <atom:link href="{SITE_URL}{path}" rel="self" type="application/rss+xml"/>\n'
                '  <language>en-us</language>\n  <copyright>© Product Advisory, LLC</copyright>\n'
                f'  <description>{xml_escape(desc)}</description>\n  <itunes:summary>{xml_escape(desc)}</itunes:summary>\n'
                f'  <itunes:author>{P.AUTHOR}, Product Advisory</itunes:author>\n  <itunes:type>serial</itunes:type>\n'
                '  <itunes:owner><itunes:name>Product Advisory</itunes:name><itunes:email>info@productadvisory.co</itunes:email></itunes:owner>\n'
                f'  <itunes:image href="{cover}"/>\n  <image><url>{cover}</url><title>{xml_escape(title)}</title><link>{link}</link></image>\n'
                '  <itunes:category text="Business"><itunes:category text="Management"/></itunes:category>\n'
                '  <itunes:category text="Technology"/>\n  <itunes:explicit>false</itunes:explicit>\n  <podcast:locked>no</podcast:locked>'
                + "".join(items) + "\n</channel>\n</rss>\n")

    eps = []
    for e in P.pages():
        m = AUDIO.meta(e["slug"])
        if not m:
            continue
        link = SITE_URL + P.url(e)[1:]
        eps.append(item(len(eps) + 1, e["slug"], page_title(e), f"{page_title(e)}, from {P.TITLE}: {P.SUBTITLE}, by {P.AUTHOR}. "
                        f"Read along with the text: {link}", link, m, SITE_URL + COVER))
    if eps:
        with open(os.path.join(P.ROOT, FEED), "w") as f:
            f.write(channel(FEED, f"{P.TITLE} (audiobook)",
                            f"{P.TITLE}, {P.SUBTITLE}, by {P.AUTHOR}, read aloud: a practical guide to product management in the age "
                            f"of AI, one chapter per episode. Free, from Product Advisory. Read along at {SITE_URL}{P.LANDING}",
                            SITE_URL + P.LANDING, SITE_URL + COVER, eps))
    m = AUDIO.meta("essentials")
    if m:
        link = f"{SITE_URL}{P.DIR}/essentials"
        with open(os.path.join(P.ROOT, ESS_FEED), "w") as f:
            f.write(channel(ESS_FEED, f"{P.TITLE}: The Essentials (audio)",
                            f"The Essentials of {P.TITLE}, read aloud: every chapter's big idea, key points, checklist and one thing to "
                            "try this week. Free, from Product Advisory.", link, SITE_URL + COVER_ESS,
                            [item(1, "essentials", "The Essentials", f"Every chapter of the book in brief, read aloud. Read along: {link}",
                                  link, m, SITE_URL + COVER_ESS)]))


def sitemap_extra():
    return []
