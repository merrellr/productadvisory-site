# Shared pieces for the page generator: settings, icons, header, footer.
BOOK = "book.html"   # the booking page (book a free 30-minute call), built by book() in build.py
ASSESS = "https://assessment.productadvisory.co/"
NEWSLETTER = "https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7391081463410196482"
LINKEDIN = "https://www.linkedin.com/company/productadvisory"
SLACK = "https://join.slack.com/t/productadvisory-group/shared_invite/zt-44yvu9gg2-IKHEFs8A9CARJBsBhat2JQ"
PORTFOLIO = "https://portfolio.productadvisory.co/"
SITE = "https://www.productadvisory.co/"
EXT = 'target="_blank" rel="noopener"'


def svg(body, cls="ico", vb="0 0 48 48"):
    return (f'<svg class="{cls}" viewBox="{vb}" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{body}</svg>')


ICON = {
    # services
    "strategy": '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><circle class="dot" cx="24" cy="24" r="4"/><path d="M24 24 38 10M33 10h5v5"/>',
    "lifecycle": '<path d="M38 18a15 15 0 0 0-27-3M10 30a15 15 0 0 0 27 3"/><path d="M11 8v7h7M37 40v-7h-7"/><circle class="dot" cx="24" cy="24" r="3.5"/>',
    "ai": '<circle class="dot" cx="24" cy="24" r="5"/><path d="M24 19V9M24 29v10M19.7 21.5 11 16.5M28.3 26.5 37 31.5M19.7 26.5 11 31.5M28.3 21.5 37 16.5"/><circle cx="24" cy="7" r="3"/><circle cx="24" cy="41" r="3"/><circle cx="9" cy="15.5" r="3"/><circle cx="39" cy="32.5" r="3"/><circle cx="9" cy="32.5" r="3"/><circle cx="39" cy="15.5" r="3"/>',
    "research": '<circle cx="28" cy="17" r="9"/><path d="m34.5 23.5 7 7"/><path d="M8 42V32M15 42V26M22 42V34"/><circle class="dot" cx="28" cy="17" r="3"/>',
    "agile": '<path d="M37 16a15 15 0 1 1-6-5"/><path d="M31 5v6h6"/><circle class="dot" cx="24" cy="24" r="4"/>',
    "coaching": '<circle class="dot" cx="14" cy="15" r="5"/><circle cx="34" cy="15" r="5" fill="none"/><path d="M6 36c1.5-6 5-9 8-9s6.5 3 8 9M26 36c1.5-6 5-9 8-9s6.5 3 8 9"/>',
    "assess": '<path d="M7 34a17 17 0 0 1 34 0"/><path d="M24 34 32 22"/><circle class="dot" cx="24" cy="34" r="3.5"/><path d="M11 23.5l2.5 1.5M17 17.5l1.5 2.5M30.5 17.5 29 20"/>',
    # packages
    "cpo": '<circle class="dot" cx="18" cy="14" r="6"/><path d="M6 40c1.5-8 6-12 12-12s10.5 4 12 12"/><circle cx="36" cy="18" r="3"/><path d="M36 21v6"/>',
    "training": '<path d="M4 18 24 9l20 9-20 9z"/><path d="M12 22v9c3 3 7 4.5 12 4.5s9-1.5 12-4.5v-9"/><circle class="dot" cx="42" cy="30" r="2.5"/><path d="M42 18v10"/>',
    "gtm": '<path d="M24 5c6 5 8 12 7 22l-4 5h-6l-4-5c-1-10 1-17 7-22z"/><circle class="dot" cx="24" cy="18" r="3.5"/><path d="M17 27l-5 5 2 6 5-4M31 27l5 5-2 6-5-4M22 38l2 5 2-5"/>',
    "security": '<path d="M24 5 9 11v11c0 10 6.5 17 15 21 8.5-4 15-11 15-21V11z"/><rect x="18" y="22" width="12" height="9" rx="2"/><path d="M20.5 22v-3a3.5 3.5 0 0 1 7 0v3"/><circle class="dot" cx="24" cy="26.5" r="1.8"/>',
    "legal": '<path d="M24 6v34M14 40h20M10 12h28"/><path d="m10 12-6 14a6 6 0 0 0 12 0zM38 12l-6 14a6 6 0 0 0 12 0z"/><circle class="dot" cx="24" cy="8" r="2.5"/>',
    "sales": '<path d="M8 20v8h6l14 8V12l-14 8z"/><path d="M14 28l3 10h4l-2-9"/><path d="M34 18c2 1.5 3 3.5 3 6s-1 4.5-3 6"/><circle class="dot" cx="40" cy="24" r="2.5"/>',
    "ux": '<rect x="6" y="9" width="36" height="30" rx="3"/><path d="M6 16h36M17 16v23"/><rect x="22" y="21" width="15" height="7" rx="1.5"/><circle class="dot" cx="11" cy="12.5" r="1.6"/>',
    # levels
    "starter": '<path d="M24 42V22"/><path d="M24 26c0-7-5-11-13-11 0 7 5 11 13 11zM24 22c0-7 5-12 13-12 0 8-5 12-13 12z"/><path d="M14 42h20"/><circle class="dot" cx="37" cy="10" r="2.5"/>',
    "practitioner": '<circle cx="24" cy="24" r="6"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M10.6 37.4l4.2-4.2M33.2 14.8l4.2-4.2"/><circle class="dot" cx="24" cy="24" r="2.5"/>',
    "leader": '<circle cx="24" cy="10" r="5"/><circle cx="10" cy="36" r="5"/><circle class="dot" cx="24" cy="30" r="5"/><circle cx="38" cy="36" r="5"/><path d="M24 15v10M14.5 34l5-2.5M33.5 34l-5-2.5"/>',
    "executive": '<path d="M4 42 20 16l8 12 5-7 11 21z"/><path d="M20 16V5l9 3.5-9 3.5"/><circle class="dot" cx="33" cy="21" r="2.5"/>',
    # contact
    "calendar": '<rect x="7" y="10" width="34" height="30" rx="3"/><path d="M7 18h34M15 6v8M33 6v8"/><path d="m18 28 4 4 8-8" stroke="var(--cyan)"/>',
    "phone": '<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M14 11h20M14 35h20"/><circle class="dot" cx="24" cy="39" r="1.8"/>',
    "mail": '<rect x="6" y="12" width="36" height="25" rx="3"/><path d="m6 14 18 12 18-12"/><circle class="dot" cx="41" cy="11" r="3"/>',
    "linkedin": '<circle cx="12" cy="12" r="4"/><circle cx="36" cy="12" r="4"/><circle class="dot" cx="24" cy="36" r="4"/><path d="M15 15l7 17M33 15l-7 17M16 12h16"/>',
    "news": '<rect x="6" y="16" width="30" height="22" rx="3"/><path d="m6 18 15 10 15-10"/><path d="M38 8a10 10 0 0 1 4 8M35 11a6 6 0 0 1 2.5 5" stroke="var(--cyan)"/>',
    "chat": '<path d="M8 10h22a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H17l-7 6v-6H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="M33 18h7a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-1v5l-6-5h-8a3 3 0 0 1-3-3v-5"/><circle class="dot" cx="13" cy="19" r="1.8"/><circle class="dot" cx="19" cy="19" r="1.8"/><circle class="dot" cx="25" cy="19" r="1.8"/>',
    "pin": '<path d="M24 44S10 30 10 19a14 14 0 0 1 28 0c0 11-14 25-14 25z"/><circle cx="24" cy="19" r="5"/><circle class="dot" cx="24" cy="19" r="2"/>',
    # principles
    "proven": '<path d="M24 5 9 11v11c0 10 6.5 17 15 21 8.5-4 15-11 15-21V11z"/><path d="m17 24 5 5 9-9" stroke="var(--cyan)"/>',
    "years": '<circle cx="24" cy="20" r="13"/><path d="m17 31-3 12 10-5 10 5-3-12"/><circle class="dot" cx="24" cy="20" r="5"/>',
    "eye": '<path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z"/><circle cx="24" cy="24" r="6"/><circle class="dot" cx="24" cy="24" r="2.5"/>',
    "scale": '<path d="M8 40V30M18 40V24M28 40V18M38 40V10"/><path d="M30 8h8v8" stroke="var(--cyan)"/>',
    "embedded": '<circle cx="18" cy="24" r="12"/><circle cx="30" cy="24" r="12"/><circle class="dot" cx="24" cy="24" r="2.5"/>',
    "briefcase": '<rect x="5" y="14" width="38" height="27" rx="4"/><path d="M17 14V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M5 24h38"/><rect x="20" y="21" width="8" height="6" rx="1.5" fill="var(--cyan)" stroke="none"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
}


def icon(name, cls="ico"):
    return svg(ICON[name], cls)


def tiny(path):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{path}</svg>')


SEARCH = tiny('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')
SLIDERS = tiny('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>')
MOON = tiny('<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/>')
MENU = tiny('<path d="M4 7h16M4 12h16M4 17h16"/>')
CLOCK = tiny('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')

WORDMARK = '<span class="wm-box">Product</span><span class="wm-adv"><span class="wm-a">&Lambda;</span>dvisory</span>'


def net(cls="net", seed=0):
    """The connected-nodes motif from the current site, drawn in and gently pulsing."""
    pts = [(30, 150), (120, 60), (210, 190), (300, 90), (380, 160), (250, 20), (160, 260), (350, 250)]
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (1, 5), (5, 3), (2, 6), (4, 7), (2, 7)]
    import math
    out = []
    for n, (a, b) in enumerate(edges):
        (x1, y1), (x2, y2) = pts[a], pts[b]
        ln = int(math.hypot(x2 - x1, y2 - y1)) + 2
        out.append(f'<line class="draw" style="--len:{ln};--d:{0.12 * n:.2f}s" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
    hot = 3
    for n, (x, y) in enumerate(pts):
        if n == hot:
            out.append(f'<circle class="ring" cx="{x}" cy="{y}" r="10"/>')
            out.append(f'<circle class="hot pop" style="--d:{1.2 + 0.08 * n:.2f}s" cx="{x}" cy="{y}" r="10"/>')
        else:
            out.append(f'<circle class="node pop" style="--d:{0.5 + 0.08 * n:.2f}s" cx="{x}" cy="{y}" r="7"/>')
    return f'<svg class="{cls}" viewBox="0 0 410 290" aria-hidden="true"><g class="float">{"".join(out)}</g></svg>'


def zigzag():
    pts = [(20, 140), (130, 40), (240, 160), (350, 60), (440, 100)]
    path = " ".join(f"{x},{y}" for x, y in pts)
    nodes = "".join(f'<circle class="node pop" style="--d:{0.3 + .15 * i:.2f}s" cx="{x}" cy="{y}" r="9"/>' for i, (x, y) in enumerate(pts[:-1]))
    x, y = pts[-1]
    return (f'<svg class="net" viewBox="0 0 470 200" aria-hidden="true"><polyline class="draw" style="--len:620" points="{path}"/>{nodes}'
            f'<circle class="ring" cx="{x}" cy="{y}" r="11"/><circle class="hot pop" style="--d:1.1s" cx="{x}" cy="{y}" r="11"/></svg>')


def envelope():
    return ('<svg class="net" viewBox="0 0 300 200" aria-hidden="true"><rect class="draw" style="--len:800" x="30" y="40" width="230" height="145" rx="12" '
            'stroke="currentColor" stroke-width="5" fill="none"/><polyline class="draw" style="--len:330;--d:.5s" points="34,48 145,125 256,48" stroke="currentColor" '
            'stroke-width="5" fill="none"/><circle class="ring" cx="262" cy="34" r="14"/><circle class="hot pop" style="--d:1.2s" cx="262" cy="34" r="14"/></svg>')


def briefcase():
    return ('<svg class="net" viewBox="0 0 300 220" aria-hidden="true"><rect class="draw" style="--len:900" x="30" y="60" width="240" height="140" rx="22" stroke="currentColor" stroke-width="7" fill="none"/>'
            '<path class="draw" style="--len:260;--d:.3s" d="M110 60V35a12 12 0 0 1 12-12h56a12 12 0 0 1 12 12v25" stroke="currentColor" stroke-width="7" fill="none"/>'
            '<path class="draw" style="--len:260;--d:.5s" d="M30 115h240" stroke="currentColor" stroke-width="7" fill="none"/>'
            '<rect class="hot pop" style="--d:1s" x="132" y="100" width="36" height="30" rx="6"/>'
            '<path class="draw" style="--len:60;--d:1.2s" d="m70 150 14 14 24-24M192 150l14 14 24-24" stroke="var(--cyan)" stroke-width="7" fill="none"/></svg>')


def layers():
    return ('<svg class="net" viewBox="0 0 300 210" aria-hidden="true">'
            '<rect class="draw" style="--len:760" x="40" y="70" width="190" height="125" rx="10" stroke="currentColor" stroke-width="4" fill="none" opacity=".45"/>'
            '<rect class="draw" style="--len:760;--d:.2s" x="70" y="45" width="190" height="125" rx="10" stroke="currentColor" stroke-width="4" fill="none" opacity=".7"/>'
            '<rect class="draw" style="--len:760;--d:.4s" x="100" y="20" width="190" height="125" rx="10" stroke="currentColor" stroke-width="4" fill="none"/>'
            '<path class="draw" style="--len:200;--d:.6s" d="M100 48h190" stroke="currentColor" stroke-width="4"/>'
            '<circle class="ring" cx="270" cy="34" r="8"/><circle class="hot pop" style="--d:1s" cx="270" cy="34" r="8"/></svg>')


NAV = [("index.html", "Home"), ("services.html", "Services"), ("toolkits.html", "Toolkits"), ("insights.html", "Insights"), ("about.html", "About"), ("contact.html", "Contact")]


def header(page):
    cur = ' aria-current="page"'
    links = "".join(f'<a href="{h}"{cur if h == page else ""}>{t}</a>' for h, t in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap">
    <a class="wm" href="index.html" aria-label="Product Advisory, home">{WORDMARK}</a>
    <nav class="nav-links" aria-label="Main">{links}<a class="m-only" href="preferences.html">Make it yours</a><a class="m-only" href="{BOOK}">Book a free call</a></nav>
    <div class="nav-tools">
      <button class="icon-btn" data-action="palette" aria-label="Search the site (command menu)">{SEARCH}<span class="k-hint"><kbd class="mod-key">⌘</kbd><kbd>K</kbd></span></button>
      <a class="icon-btn prefs-btn" href="preferences.html" aria-label="Make it yours: change how this site looks" title="Make it yours">{SLIDERS}</a>
      <button class="icon-btn" data-action="theme" aria-label="Toggle light or dark" title="Light / dark">{MOON}</button>
      <a class="btn sm nav-cta" href="{BOOK}">Book a call</a>
      <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded="false">{MENU}</button>
    </div>
  </div>
  <div class="progress" aria-hidden="true"></div>
</header>'''


FOOTER = f'''<footer class="site">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="wm" href="index.html" aria-label="Product Advisory, home">{WORDMARK}</a>
        <span class="tagline">Building Market Driven Products</span>
        <p>Product management consulting for startups and enterprises.</p>
      </div>
      <div><h4>Company</h4><ul><li><a href="index.html">Home</a></li><li><a href="about.html">About Us</a></li><li><a href="contact.html">Contact Us</a></li></ul></div>
      <div><h4>Product</h4><ul><li><a href="services.html">Services</a></li><li><a href="toolkits.html">Toolkits</a></li><li><a href="toolkits.html#learning">Learning</a></li><li><a href="insights.html">Insights</a></li><li><a href="{ASSESS}" {EXT}>Skill assessment ↗</a></li></ul></div>
      <div><h4>Community</h4><ul><li><a href="{LINKEDIN}" {EXT}>LinkedIn</a></li><li><a href="{NEWSLETTER}" {EXT}>Newsletter</a></li><li><a href="{SLACK}" {EXT}>Slack community</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="privacy-policy.html">Privacy Policy</a></li><li><a href="terms-of-use.html">Terms of Use</a></li></ul></div>
    </div>
    <div class="foot-base">
      <span>© <span id="year">2026</span> Product Advisory, LLC. All rights reserved.</span>
      <span><a href="preferences.html">Make it yours</a> · <button type="button" class="linklike" data-action="cookies">Cookie settings</button> · Press <kbd class="mod-key">⌘</kbd> <kbd>K</kbd> to search</span>
    </div>
  </div>
</footer>'''

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@600&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap" rel="stylesheet">')


def page(file, title, desc, body, extra_head="", image="assets/img/og.png", nav=None, og_type="website"):
    url = SITE + ("" if file == "index.html" else file[:-5])   # the clean address: /services, not /services.html
    full = title if file == "index.html" else f"{title} · Product Advisory"
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>/* An old link to /services.html or /index.html shows as /services or / (same page, no reload). */
if (/\\.html$/.test(location.pathname) && !/\\/404\\.html$/.test(location.pathname)) history.replaceState(null, "", location.pathname.replace(/(^|\\/)index\\.html$/, "$1").replace(/\\.html$/, "") + location.search + location.hash);</script>
<script src="assets/js/consent.js"></script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','GTM-N854VT4C');</script>
<!-- End Google Tag Manager -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{full}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{full}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}{image}">
<meta property="og:site_name" content="Product Advisory">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a1526" media="(prefers-color-scheme: dark)">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
{FONTS}
<link rel="stylesheet" href="assets/css/site.css">
<script src="assets/js/prefs.js"></script>
<script src="assets/js/site.js" defer></script>
{extra_head}</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-N854VT4C"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
{header(nav or file)}
<main id="main">
{body}
</main>
{FOOTER}
</body>
</html>
'''
