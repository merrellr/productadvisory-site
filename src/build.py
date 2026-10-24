"""Builds the static pages for www.productadvisory.co from the Python in this folder.

    python3 src/build.py           writes the pages (index.html, services.html, ...) into the repo root
    python3 src/build.py --check   builds into a temporary folder and fails if any committed page differs
                                   (run by CI, so a hand edit to a page is caught before it is lost)

Edit the content here (build.py for the pages, parts.py for the header, footer and icons, content.py for services
and packages, legal.py for the privacy policy and terms, art.py for the page-head illustrations), then rebuild and
commit both the source and the pages. Styles and scripts live in assets/ and are not generated."""
import math
import os
import sys
from html import escape

from parts import *  # noqa
from content import SERVICES, PACKAGES, LEVELS, DOMAINS, SERVICES_FAQ, CONTACT_COPY, CONTACT_HELP
from legal import PRIVACY, TERMS
from art import path_art, orbit, toolkit_open, signal, conversation, insight_lens
from insights import ARTICLES, CATEGORIES, category

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # the repo root, one folder up
OUT = ROOT


NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>'
EXT_MARK = '<span class="ext" aria-hidden="true">↗</span>' + NEW_TAB


def mark_new_tabs(html):
    """Every link that opens a new tab says so: a visible ↗ and words for screen readers."""
    import re

    def fix(m):
        open_tag, inner = m.group(1), m.group(2)
        if "sr-only" in inner:
            return m.group(0)
        if "<img" in inner or "↗" in inner:
            inner = inner.replace(" ↗", "<span aria-hidden=\"true\"> ↗</span>") + NEW_TAB
        else:
            inner = inner.rstrip() + EXT_MARK
        return open_tag + inner + "</a>"
    return re.sub(r'(<a\b[^>]*target="_blank"[^>]*>)(.*?)</a>', fix, html, flags=re.S)


PAGE_FILES = ("index", "services", "toolkits", "insights", "about", "contact", "book", "scorecard", "ai-use-cases", "preferences", "privacy-policy", "terms-of-use")


def clean_links(html):
    """Links between our pages use clean addresses: /services, /toolkits#learning, / for home (GitHub Pages serves
    services.html for /services). Root-based, like the asset paths, so they also work from the 404 page at any depth."""
    import re
    names = "|".join(PAGE_FILES)

    def fix(m):
        name, rest = m.group(2), m.group(3) or ""
        return m.group(1) + ("/" if name == "index" else "/" + name) + rest + '"'
    html = re.sub(r'(href=")(' + names + r')\.html([?#][^"]*)?"', fix, html)
    return html.replace('href="assets/', 'href="/assets/').replace('src="assets/', 'src="/assets/')


def versioned(html):
    """assets/css/site.css → assets/css/site.css?v=<first 8 of its hash>, for every stylesheet and script, so a
    browser fetches the new file as soon as it changes instead of using the copy it kept."""
    import hashlib
    import re

    def tag(m):
        path = os.path.join(ROOT, "assets", m.group(2))
        if not os.path.exists(path):
            return m.group(0)
        return f'{m.group(1)}assets/{m.group(2)}?v={hashlib.sha256(open(path, "rb").read()).hexdigest()[:8]}"'
    return re.sub(r'((?:href|src)="/?)assets/((?:css|js)/[\w.-]+\.(?:css|js))"', tag, html)


def write(name, html):
    os.makedirs(os.path.dirname(os.path.join(OUT, name)), exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        f.write(versioned(clean_links(mark_new_tabs(html))))


def page_head(title, sub, art):
    return f'''<header class="page-head">
  <div class="wrap">
    <div><h1>{title}</h1><p>{sub}</p></div>
    <div class="art">{art}</div>
  </div>
</header>'''


# ---------------------------------------------------------------- structured data (schema.org JSON-LD) for search and AI answers
ORG = {"@id": SITE + "#org"}


def ld(*nodes, crumbs=None):
    """One JSON-LD script: the given nodes, plus a breadcrumb trail when crumbs is [(name, path), ...]."""
    import json
    graph = list(nodes)
    if crumbs:
        trail = [("Home", "")] + crumbs
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": n, "name": name, "item": SITE + path} for n, (name, path) in enumerate(trail, 1)]})
    return f'<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": graph})}</script>\n'


def faq_ld(faq):
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faq]}


def og(name):
    """The page's own sharing image (rendered by src/og/pages.py)."""
    return f"assets/img/og/{name}.jpg"


def cta_band(h="Have a project in mind? Let's talk.", p="Whether you're validating your first product idea or scaling an enterprise platform, we'd love to hear what you're working on."):
    return f'''<section>
  <div class="wrap">
    <div class="cta-band reveal">
      {net()}
      <div><h2>{h}</h2><p>{p}</p></div>
      <div class="btn-row"><a class="btn" href="{BOOK}">Book a free 30-minute call</a><a class="btn ghost" href="contact.html">Send a message</a></div>
    </div>
  </div>
</section>'''


def radar():
    cx, cy, R = 130, 120, 80
    n = len(DOMAINS)
    short = ["Discovery", "Strategy", "Prioritization", "Execution", "Stakeholder", "AI · Individual", "AI · Org"]

    def pt(i, r):
        a = -math.pi / 2 + 2 * math.pi * i / n
        return cx + r * math.cos(a), cy + r * math.sin(a)
    webs = "".join('<polygon class="web" points="' + " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, R * k / 4) for i in range(n))) + '"/>' for k in range(1, 5))
    spokes = "".join(f'<line class="web" x1="{cx}" y1="{cy}" x2="{pt(i, R)[0]:.1f}" y2="{pt(i, R)[1]:.1f}"/>' for i in range(n))
    shape = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, R * v / 100) for i, (_, v) in enumerate(DOMAINS)))
    labels = ""
    for i, s in enumerate(short):
        x, y = pt(i, R + 16)
        anchor = "middle" if abs(x - cx) < 10 else ("start" if x > cx else "end")
        labels += f'<text x="{x:.1f}" y="{y + 3:.1f}" text-anchor="{anchor}">{s}</text>'
    return f'<svg class="radar" viewBox="0 0 260 240" role="img" aria-label="Example result: a radar chart across seven skill areas">{webs}{spokes}<polygon class="shape" points="{shape}"/>{labels}</svg>'


def mock():
    bars = "".join(f'<div class="bar-row"><span>{escape(d)}</span><em>{v}%</em><span class="track"><span class="fill" data-w="{v}%"></span></span></div>' for d, v in DOMAINS)
    return f'''<div class="mock reveal" aria-label="Example skill check result">
  <div class="mock-head">
    <svg class="mock-ring" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="22" fill="none" stroke="var(--band)" stroke-width="6"/><circle cx="27" cy="27" r="22" fill="none" stroke="var(--cyan)" stroke-width="6" stroke-linecap="round" stroke-dasharray="138" stroke-dashoffset="47" transform="rotate(-90 27 27)"/></svg>
    <div><b>Experienced</b><small>Example result · 14 questions · about 10 minutes</small></div>
  </div>
  {radar()}
  <div class="bars">{bars}</div>
</div>'''


def level_picker(toggle=True, cls="levels"):
    items = "".join(f'<button type="button" role="radio" class="level" data-value="{k}">{icon(k)}<b>{n}</b><span>{d}</span></button>' for k, n, d in LEVELS)
    return f'<div class="{cls}" role="radiogroup" aria-label="Where are you today?" data-pref="lens"{" data-toggle" if toggle else ""}>{items}</div>'


# ---------------------------------------------------------------- home
def home():
    svc = "".join(
        f'<a class="svc{" new" if new else ""} reveal" href="services.html#{i}">{icon(ic)}<div><b>{t}</b><span>{fw}</span></div></a>'
        for i, ic, t, fw, _, _, new in SERVICES)
    problems = [
        ("guesses", "Problem 1", "Roadmaps built on guesses, not evidence",
         "Your roadmap looks confident on paper. But if you're honest, a lot of it is built on opinions, competitor-watching, and whoever spoke loudest in the last planning meeting, not real customer evidence.",
         "Start with Market Research and Validation", "We go outside your building first: customer interviews, competitive analysis and demand signals, turned into a roadmap you can defend.", "services.html#research", "See how research works"),
        ("wrong", "Problem 2", "Teams building fast, but building the wrong things",
         "Velocity feels great until you realize you've shipped a dozen features nobody asked for. Speed without direction just gets you to the wrong place faster.",
         "Start with Product Lifecycle Management", "We connect strategy to delivery with a repeatable process, so speed turns into the right outcomes and your team can run it long after we're gone.", "services.html#lifecycle", "See lifecycle management"),
        ("nostrategy", "Problem 3", "No clear strategy tied to growth goals",
         "Your product roadmap and your company's actual growth goals live in two different documents, and nobody's connected them. Every decision ends up being a local optimization, not a strategic one.",
         "Start with Product Strategy, or a Fractional CPO", "We tie every roadmap decision to a business goal. Need someone to own it? A Fractional CPO brings senior product leadership without a full-time hire.", "services.html#strategy", "See strategy development"),
    ]
    pcards = "".join(
        f'<button type="button" class="problem" aria-pressed="false" data-problem="{k}" data-fix="{escape(fx)}" data-fix-text="{escape(ft)}" data-href="{href}" data-cta="{escape(cta)}"><small>{lbl}</small><b>{t}</b><span>{d}</span></button>'
        for k, lbl, t, d, fx, ft, href, cta in problems)
    steps = [("Discovery", "Market assessment, personas, definition, data collection and potential barriers."),
             ("Design", "UX/UI, workflow and integrations. Connecting the dots."),
             ("Build", "Develop possible solutions. Prototype, spike, build, iterate, test, validate."),
             ("Launch", "Go to market: sales, integration, education and communications.")]
    steps_html = "".join(f'<div class="step reveal"><div class="pin">{n}</div><h3>{t}</h3><p>{d}</p></div>' for n, (t, d) in enumerate(steps, 1))
    jsonld = f'''<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"ProfessionalService","@id":"{SITE}#org","name":"Product Advisory, LLC","alternateName":"Product Advisory","url":"{SITE}","logo":"{SITE}assets/img/favicon-192.png","image":"{SITE}assets/img/og.png","sameAs":["{LINKEDIN}"],"slogan":"Building Market Driven Products",
"description":"Product management consulting for startups and enterprises: product strategy, lifecycle management, AI enablement, market research, agile transformation, team coaching, and custom skill assessments.",
"email":"info@productadvisory.co","telephone":"+1-727-386-6815","areaServed":"Worldwide","address":{{"@type":"PostalAddress","addressLocality":"Chicago","addressRegion":"IL","addressCountry":"US"}},
"founder":{{"@type":"Person","@id":"{SITE}about#robert-merrell","name":"Robert Merrell","jobTitle":"Founder and Fractional CPO","url":"{PORTFOLIO}"}},
"hasOfferCatalog":{{"@type":"OfferCatalog","name":"Services","itemListElement":[{",".join('{"@type":"Offer","itemOffered":{"@type":"Service","name":"%s"}}' % t for _, _, t, *_ in SERVICES)}]}}}}
</script>
'''
    body = f'''<section class="hero">
  <div class="wrap">
    <div>
      <div class="eyebrow">Product management consulting</div>
      <h1>Building <em>Market Driven</em> Products</h1>
      <p class="lede">Professional end-to-end product consulting for startups and enterprises. We turn market insight into roadmaps your team can defend, and products people actually want.</p>
      <div class="ask" id="ask">
        <form class="ask-form" role="search">
          {tiny('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}
          <label class="hp" for="ask-input">Ask Product Advisory</label>
          <input id="ask-input" type="search" placeholder="What are you working on?" autocomplete="off">
          <button class="btn" type="submit">Ask</button>
        </form>
      </div>
      <div class="ask-suggest"><span>Try:</span><button type="button">How do you help with AI adoption?</button><button type="button">What is a Fractional CPO?</button><button type="button">Do you have free templates?</button></div>
      <div class="ask-out" aria-live="polite"></div>
      <div class="btn-row" style="margin-top:28px"><a class="btn" href="{BOOK}">Book a free 30-minute call</a><a class="btn ghost" href="services.html">Explore services</a></div>
    </div>
    <div class="hero-art">{path_art()}</div>
  </div>
</section>

<section>
  <div class="wrap statement reveal" data-ask="Great execution can't fix a roadmap built on guesses" data-kind="Home">
    <div>
      <div class="eyebrow">Why we exist</div>
      <h2>Great execution can't fix a roadmap built on guesses</h2>
      <p>When strategy isn't grounded in real evidence, and teams move fast without a clear line to business goals, even great execution ends up building the wrong things. Product Advisory fixes that, from strategy through delivery.</p>
    </div>
    <a class="btn" href="{BOOK}">Schedule a call</a>
  </div>
</section>

<section class="band" id="familiar">
  <div class="wrap">
    <div class="section-head reveal" data-ask="Sound familiar? The three problems we fix" data-kind="Home">
      <div class="eyebrow">Sound familiar?</div>
      <h2>Which one sounds like your team?</h2>
      <p>Most product teams don't fail from a lack of effort. They fail from one of these three problems, often without realizing it until growth stalls. Pick the one that sounds most like you.</p>
    </div>
    <div class="problems reveal" id="problems">{pcards}</div>
    <div class="prescription" id="prescription" hidden aria-live="polite"><div><h3></h3><p></p></div><a class="btn" href="services.html">See how →</a></div>
    <p class="reveal" style="margin-top:22px">If any of this sounds familiar, you don't need more effort. You need a clearer process. That's exactly where Product Advisory comes in.</p>
  </div>
</section>

<section id="services">
  <div class="wrap">
    <div class="section-head reveal">
      <div class="eyebrow">Our services</div>
      <h2>Find the problem, then the fix</h2>
      <p>Every service exists to fix a specific version of the same problem: product work that isn't connected to evidence or to the business.</p>
    </div>
    <div class="svc-grid">{svc}</div>
    <p style="margin-top:24px"><a class="link-arrow" href="services.html">All services and packages</a></p>
  </div>
</section>

<section class="band" data-ask="How we work: Discovery, Design, Build, Launch" data-kind="Home" data-keywords="process approach method engagement phases">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">How we work</div><h2>Outside in, from first insight to launch</h2><p>We start in the market and with your end users, before a single roadmap decision gets made.</p></div>
    <div class="steps">{steps_html}</div>
  </div>
</section>

<section id="start">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Where are you today?</div><h2>Start where you are</h2><p>Tell us who's visiting and the site points you to the best first step. You can change it any time in <a href="preferences.html">Make it yours</a>.</p></div>
    {level_picker()}
    <div class="start-here" data-start-here hidden></div>
  </div>
</section>

<section class="band" id="skill-check">
  <div class="wrap showcase">
    <div class="reveal" data-ask="Free product + AI skill check" data-kind="Learning" data-keywords="assessment test quiz benchmark competencies learning">
      <div class="eyebrow">Try it free</div>
      <h2>How well-rounded is your product + AI practice?</h2>
      <p>Answer 14 quick questions covering core product management skills, plus how you're using AI personally and across your organization. You'll get a skill breakdown and learning recommendations for the areas with the most room to grow.</p>
      <ul class="check"><li>Seven product and AI competencies</li><li>A learning path matched to your level</li><li>Retake it to see how far you've come</li></ul>
      <div class="btn-row"><a class="btn" href="{ASSESS}" {EXT}>Take the assessment</a><a class="link-arrow" href="toolkits.html#learning">For teams and organizations</a></div>
      <p class="muted" style="margin-top:16px;font-size:.92rem">This is also what we build for clients: a working example of our Custom Assessments &amp; Interactive Learning service.</p>
    </div>
    {mock()}
  </div>
</section>

<section data-ask="Why work with Product Advisory" data-kind="Home" data-keywords="experience years proven evidence scale">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Why Product Advisory</div><h2>Why teams work with us</h2></div>
    <div class="stats reveal">
      <div class="stat"><b data-count="50" data-suffix="+">50+</b><span>Years of combined technology and product experience</span></div>
      <div class="stat"><b data-count="7">7</b><span>Product and AI competencies we benchmark</span></div>
      <div class="stat"><b data-count="4">4</b><span>Steps from discovery to launch</span></div>
      <div class="stat"><b data-count="30">30</b><span>Minutes: your first call is free</span></div>
    </div>
    <div class="grid g4" style="margin-top:20px">
      <div class="card tint reveal">{icon("proven")}<h3>Proven success</h3><p>A track record with early-stage startups and enterprise organizations alike.</p></div>
      <div class="card tint reveal">{icon("eye")}<h3>Evidence-driven</h3><p>We build based on data and direct end-user feedback, not assumptions.</p></div>
      <div class="card tint reveal">{icon("embedded")}<h3>Embedded partnership</h3><p>We complement your team's strengths, not replace them.</p></div>
      <div class="card tint reveal">{icon("scale")}<h3>Built to scale</h3><p>We design for where you're headed, not just where you are.</p></div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap grid g2" style="align-items:center">
    <div class="reveal" data-ask="Free toolkits for product decisions" data-kind="Toolkit" data-keywords="templates pdf google sheet free download">
      <div class="eyebrow">Free toolkits</div>
      <h2>Practical tools built from real product work</h2>
      <p>The same templates we use with clients: fillable PDFs with matching Google Sheets, each with a worked example, so you never start from a blank page.</p>
      <a class="btn ghost" href="toolkits.html">Browse the toolkits</a>
    </div>
    <div class="reveal" data-ask="Product+ newsletter" data-kind="Home" data-keywords="newsletter linkedin articles insights">
      <div class="card">{icon("news")}<h3>The Product+ newsletter</h3><p>Product insights on strategy, discovery and AI. Read the articles here, or follow along on LinkedIn.</p><div class="btn-row"><a class="link-arrow" href="insights.html">Read the insights</a><a class="link-arrow" href="{NEWSLETTER}" {EXT}>Follow on LinkedIn</a></div></div>
    </div>
  </div>
</section>

<section id="insights" data-ask="Latest insights from Product+" data-kind="Home" data-keywords="articles blog newsletter writing">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Insights</div><h2>Latest from Product+</h2><p>Practical writing on product strategy, AI agents and AI enablement.</p></div>
    <div class="insight-grid">{"".join(insight_card(a) for a in published()[:3])}</div>
    <div class="btn-row" style="margin-top:28px"><a class="btn ghost" href="insights.html">All insights</a></div>
  </div>
</section>

{cta_band()}'''
    write("index.html", page("index.html", "Product Advisory · Building Market Driven Products",
                             "Product management consulting for startups and enterprises: strategy, lifecycle, AI enablement, research, coaching and custom skill assessments. Book a free 30-minute call.",
                             body, jsonld))


# ---------------------------------------------------------------- services
def services():
    index_links = "".join(f'<a href="#{i}">{t}</a>' for i, _, t, *_ in SERVICES) + '<a href="#finder">Find your fit</a><a href="#packages">Service packages</a><a href="#also">Also ask us about</a><a href="#faq">FAQ</a>'
    details = "".join(f'''<article class="svc-detail reveal" id="{i}" data-ask="{t}" data-kind="Service">
  {icon(ic)}
  <div>
    <h2 style="font-size:1.5rem">{t}{' <span class="tag on">New</span>' if new else ''}</h2>
    <p class="for">{fw}</p>
    <div class="deep"><p>{body}</p><ul>{"".join(f"<li>{b}</li>" for b in bullets)}</ul></div>
    {related_reading(i)}
    {'<p class="svc-tool">Free tool: <a href="ai-use-cases.html">AI Use Case Prioritization</a>, to choose where AI is worth the effort first.</p>' if i == 'ai' else ''}
  </div>
</article>''' for i, ic, t, fw, body, bullets, new in SERVICES)
    details = details.replace("assessment.productadvisory.co, a real", f'<a href="{ASSESS}" {EXT}>assessment.productadvisory.co</a>, a real')
    pk = "".join(f'<article class="pkg reveal{" flag" if flag else ""}" id="{i}" data-ask="{t}" data-kind="Package">{icon(ic)}<h3>{t}</h3><p class="deep">{d}</p><p class="brief-only">{d.split(". ")[0]}.</p></article>' for i, ic, t, d, flag in PACKAGES)

    def q(key, title, opts):
        chips = "".join(f'<button type="button" role="radio" aria-checked="false" class="chip" data-v="{v}">{l}</button>' for v, l in opts)
        return f'<div class="finder-q"><h3>{title}</h3><div class="chip-row" role="radiogroup" aria-label="{escape(title)}" data-q="{key}">{chips}</div></div>'
    finder = f'''<div class="finder reveal" id="finder">
  <div class="eyebrow">Not sure where to start?</div>
  <h2 style="font-size:1.6rem">Three questions to your starting point</h2>
  {q("stage", "1. Where is your company?", [("early", "Early-stage startup"), ("scaling", "Scaling"), ("enterprise", "Enterprise")])}
  {q("problem", "2. What hurts most right now?", [("guess", "We're not sure we're building the right thing"), ("direction", "No clear strategy or product leadership"), ("launch", "We have a product, but launches fall flat"), ("ai", "AI adoption is scattered"), ("skills", "We don't know where our team's skill gaps are")])}
  {q("help", "3. How would you like help?", [("lead", "Someone to lead it with us"), ("project", "A focused project"), ("train", "Build our team's skills")])}
  <div class="finder-result" hidden aria-live="polite"><div><div class="eyebrow">A good place to start</div><h3></h3><p></p></div><div class="btn-row"><a class="btn" href="contact.html">Talk to us about this</a><a class="btn ghost" href="#packages">Details</a></div></div>
</div>'''
    also = [("Strategy from market insight", "Building your strategy based on market insights."), ("Team maturity", "Assessing the team's product management best practices."),
            ("Organizational assessment", "Building a program to meet your needs."), ("Implementation planning", "Optimizing your time to market."),
            ("Go-to-market strategy", "Accelerating sales growth and improving your share."), ("Security & compliance", "Protecting your data with strong security practices."),
            ("Contracting & legal review", "Reviewing contracts to reduce risk and exposure."), ("UX/UI design services", "Designing intuitive experiences your users love."),
            ("Partnerships & integrations", "Building connections and integrations to help you grow.")]
    also_html = "".join(f'<div class="card reveal"><h3 style="font-size:1.05rem">{t}</h3><p>{d}</p></div>' for t, d in also)
    body = f'''{page_head("Services", "How we help teams build market-driven products.", orbit())}
<section>
  <div class="wrap">
    <div class="section-head" data-ask="How our services are organized" data-kind="Service">
      <p class="lede">Most product problems aren't really "we need more resources." They're "we're solving the wrong problem, confidently." Every service below exists to fix a specific version of that: a roadmap disconnected from evidence, teams moving fast without direction, or a strategy that never made it into the actual product. Find the one that matches where you're stuck.</p>
      <p class="deep">Two of our newest offerings reflect where product work is heading right now: helping teams build real AI capability instead of scattered individual habits, and replacing generic training with assessments and learning built around your team's actual gaps. You can experience the second one firsthand. It's not a pitch, it's a live product.</p>
      <div class="tabs" role="radiogroup" aria-label="Reading depth" data-pref="depth"><button type="button" role="radio" data-value="brief">Brief</button><button type="button" role="radio" data-value="full">Full detail</button></div>
    </div>
    <div class="with-index">
      <nav class="side-index" aria-label="On this page">{index_links}</nav>
      <div>{details}</div>
    </div>
  </div>
</section>

<section class="band"><div class="wrap">{finder}</div></section>

<section id="packages">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Service packages</div><h2>For early-stage startups and enterprises</h2><p>Packaged engagements you can start with, scoped to your stage and budget.</p></div>
    <div class="pkg-grid">{pk}</div>
  </div>
</section>

<section class="band" id="also" data-ask="How we can help: leadership presence" data-kind="Service" data-keywords="team maturity organizational assessment implementation partnerships integrations">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Leadership presence</div><h2>Also ask us about</h2></div>
    <div class="grid g3">{also_html}</div>
  </div>
</section>

<section data-ask="Why choose Product Advisory" data-kind="Service" data-keywords="expertise customization results collaboration">
  <div class="wrap">
    <div class="section-head reveal"><h2>Why choose Product Advisory?</h2></div>
    <div class="grid g4">
      <div class="card tint reveal">{icon("years")}<h3>Expertise</h3><p>Years of experience across diverse industries, bringing proven, practical solutions.</p></div>
      <div class="card tint reveal">{icon("practitioner")}<h3>Customization</h3><p>Services tailored to your specific business needs and goals.</p></div>
      <div class="card tint reveal">{icon("proven")}<h3>Results-oriented</h3><p>Committed to measurable results that align with your business objectives.</p></div>
      <div class="card tint reveal">{icon("chat")}<h3>Collaboration</h3><p>Working side by side with your team in an open, hands-on process to ensure success.</p></div>
    </div>
  </div>
</section>
<section class="band" id="faq" data-ask="Questions people ask about working with us" data-kind="Service" data-keywords="faq fractional cpo consultant remote startups enterprise get started pricing">
  <div class="wrap narrow">
    <div class="section-head reveal"><div class="eyebrow">FAQ</div><h2>Questions people ask</h2></div>
    <div class="prose services-faq">{"".join(f'<h3>{escape(q)}</h3><p>{escape(a)}</p>' for q, a in SERVICES_FAQ)}</div>
  </div>
</section>
{cta_band()}'''
    services_ld = ld({"@type": "ItemList", "name": "Product Advisory services", "itemListElement": [
        {"@type": "ListItem", "position": n, "item": {"@type": "Service", "name": t, "description": fw, "url": f"{SITE}services#{i}", "provider": ORG, "areaServed": "Worldwide"}}
        for n, (i, _, t, fw, *_) in enumerate(SERVICES + [(k, None, t, plain(d).split(". ")[0] + ".") for k, _, t, d, _ in PACKAGES], 1)]},
        faq_ld(SERVICES_FAQ), crumbs=[("Services", "services")])
    write("services.html", page("services.html", "Services", "Product strategy, lifecycle management, AI enablement, market research, agile transformation, team coaching, custom assessments, and service packages including Fractional CPO+.", body,
                                extra_head=services_ld, image=og("services")))


# ---------------------------------------------------------------- toolkits + learning
def toolkits():
    lv = {k: n for k, n, _ in LEVELS}

    def tool(i, title, levels, time, what, when, walk, cols, links, thumb=None):
        tags = "".join(f'<span class="tag" data-level="{l}">{lv[l]}</span>' for l in levels)
        return f'''<article class="tool reveal" id="{i}" data-levels="{" ".join(levels)}" data-ask="{title}" data-kind="Toolkit">
  {f'<a class="tool-thumb" href="{links[0]}" {EXT}><img src="{thumb}" alt="First page of the {title} PDF" width="900" height="706" loading="lazy"></a>' if thumb else f'<div class="tool-doc" aria-hidden="true"><span class="wm">{WORDMARK}</span><b>{title}</b><i></i><i style="width:70%"></i><div class="cols">{"<span></span>" * cols}</div><div class="dots"><span></span><span></span><span></span><span></span></div><i style="width:85%"></i></div>'}
  <div>
    <h3 style="font-size:1.5rem">{title}</h3>
    <div>{tags}</div>
    <ul class="meta"><li><b>Time needed:</b> {time}</li><li><b>Formats:</b> Fillable PDF, Google Sheet or Excel</li></ul>
    <p>{what}</p>
    <p class="deep"><b>Use it when:</b> {when}</p>
    <p class="deep"><b>You walk away with:</b> {walk}</p>
    <div class="btn-row"><a class="btn sm" href="{links[0]}" {EXT}>Download the PDF</a><a class="btn sm" href="{links[1]}" {EXT}>Get the Google Sheet</a><a class="btn sm ghost" href="{links[3]}" download>Excel version</a><a class="btn sm ghost" href="{links[2]}" {EXT}>See the worked example</a></div>
  </div>
</article>'''
    # The first interactive toolkit, built from the top vote on the Tool Roadmap (scorecard.html).
    sc_tags = "".join(f'<span class="tag" data-level="{l}">{lv[l]}</span>' for l in ["starter", "practitioner", "leader"])
    sc_rows = "".join(f'<span class="sc-thumb-row"><b>{n}</b><i style="--w:{w}%"></i><em>{w}</em></span>' for n, w in [(1, 82), (2, 74), (3, 71), (4, 48), (5, 30)])
    interactive = f'''<article class="tool reveal" id="feature-prioritization-scorecard" data-levels="starter practitioner leader" data-ask="Feature Prioritization Scorecard: rank features with criteria you can change" data-kind="Toolkit" data-keywords="prioritize prioritization prioritise rank features roadmap weighted scoring ice rice backlog compare cheat sheet which method">
  <a class="tool-thumb sc-thumb" href="scorecard.html" tabindex="-1" aria-hidden="true"><span class="sc-thumb-head">Your ranking</span>{sc_rows}</a>
  <div>
    <h3 style="font-size:1.5rem">Feature Prioritization Scorecard <span class="pill">Interactive</span></h3>
    <div>{sc_tags}</div>
    <ul class="meta"><li><b>Time needed:</b> About 20 minutes</li><li><b>Format:</b> Interactive, in your browser. Download as CSV or save as PDF</li></ul>
    <p>Rank features with criteria you can change, or with RICE, and compare the two rankings side by side, so your roadmap reflects your goals and not the loudest voice. Weight what matters, score each feature, and watch the ranking update as you go.</p>
    <p class="deep"><b>Use it when:</b> the backlog is longer than the quarter, and every stakeholder thinks their feature is first.</p>
    <p class="deep"><b>You walk away with:</b> a ranked list, the criteria behind it, and a link or file you can share.</p>
    <div class="btn-row"><a class="btn sm" href="scorecard.html">Open the scorecard</a><a class="btn sm ghost" href="assets/toolkits/which-prioritization-method.pdf" {EXT}>Download the cheat sheet (PDF)</a></div>
    <p class="deep" style="margin-top:10px"><b>New:</b> the one-page <i>Which prioritization method?</i> cheat sheet: when to use RICE, weighted scoring or ICE, and six rules for a ranking you can defend.</p>
  </div>
</article>'''
    uc_rows = "".join(f'<span class="uc-thumb-row q-{q}"><i></i><b>{n}</b><em>{lbl}</em></span>' for q, n, lbl in
                      [("quick-win", 1, "Quick win"), ("quick-win", 2, "Quick win"), ("bet", 3, "Strategic bet"), ("easy", 4, "Easy experiment")])
    uc_tags = "".join(f'<span class="tag" data-level="{l}">{lv[l]}</span>' for l in ["practitioner", "leader", "executive"])
    ai_tool = f'''<article class="tool reveal" id="ai-use-case-prioritization" data-levels="practitioner leader executive" data-ask="AI Use Case Prioritization: choose where AI is worth the effort first" data-kind="Toolkit" data-keywords="ai use cases ideas pilot adoption value feasibility data readiness risk cost where to start">
  <a class="tool-thumb sc-thumb uc uc-thumb" href="ai-use-cases.html" tabindex="-1" aria-hidden="true"><span class="sc-thumb-head">Start here</span>{uc_rows}</a>
  <div>
    <h3 style="font-size:1.5rem">AI Use Case Prioritization <span class="pill">New · Interactive</span></h3>
    <div>{uc_tags}</div>
    <ul class="meta"><li><b>Time needed:</b> About 15 minutes</li><li><b>Format:</b> Interactive, in your browser. Download as CSV or save as PDF</li></ul>
    <p>Choose where AI is worth the effort first. Score each idea on value, data readiness, cost, team readiness and risk, see them on a value and feasibility map, and get the first pilot to run.</p>
    <p class="deep"><b>Use it when:</b> everyone has an AI idea, and you need to pick the one or two worth piloting.</p>
    <p class="deep"><b>You walk away with:</b> a map of your ideas, the first pilot, a next step for each idea, and guardrails for the risky ones.</p>
    <div class="btn-row"><a class="btn sm" href="ai-use-cases.html">Open the tool</a></div>
  </div>
</article>'''
    tools = interactive + ai_tool + tool("build-buy-partner", "Build, Buy, or Partner Decision Matrix", ["practitioner", "leader", "executive"], "About 60 minutes",
                 "Decide whether to build a capability yourself, buy it, or partner for it. Score the options against ten criteria, compare the real three-year cost, and record your decision with its risks and tripwires.",
                 "You are weighing a platform, a vendor, a new feature area, or an AI capability and the team is split.",
                 "A scored comparison, a cost view, and a written decision you can share.", 3,
                 ("assets/toolkits/build-buy-partner-matrix.pdf",
                  "https://docs.google.com/spreadsheets/d/1yKCvFQXL19Sg9dJs4z6Ws2IGVWYPJJdy/copy",
                  "assets/toolkits/build-buy-partner-worked-example.pdf",
                  "assets/toolkits/build-buy-partner-matrix.xlsx"),
                 "assets/toolkits/build-buy-partner-matrix-card.webp") + \
        tool("impact-score", "Organizational Impact Score", ["leader", "executive"], "About 60 minutes",
             "Rate initiatives against the KPIs your organization already tracks, adjust for how sure you are, and see which work moves the numbers that matter most.",
             "You are building a roadmap, defending budget, or choosing between competing projects.",
             "A ranked list, a clear next action for each initiative, and a record of why.", 3,
             ("assets/toolkits/organizational-impact-score.pdf",
              "https://docs.google.com/spreadsheets/d/1gZ5SUzbziFUkfTPQURxJnZqwg7kqFKR8/copy",
              "assets/toolkits/organizational-impact-score-worked-example.pdf",
              "assets/toolkits/organizational-impact-score.xlsx"),
             "assets/toolkits/organizational-impact-score-card.webp")
    def soon_card(i, ic, title, desc, levels):
        tags = "".join(f'<span class="tag" data-level="{l}">{lv[l]}</span>' for l in levels)
        return (f'<article class="card soon reveal" id="soon-{i}" data-levels="{" ".join(levels)}" data-ask="{title} (coming soon)" data-kind="Toolkit">'
                f'{icon(ic)}<span class="pill">Planned</span><h3>{title}</h3><p>{desc}</p><div class="soon-for"><small>Best for</small>{tags}</div>'
                f'<a class="btn sm ghost" href="{ASSESS}tool-requests?tool={i}&amp;src=site-toolkits" {EXT}>Vote for this</a></article>')
    soon = soon_card("product-strategy-one-pager", "strategy", "Product Strategy One Pager",
                  "Put your strategy on a single page the whole team can read, from the problem you solve to how you will know it worked.", ["practitioner", "leader"])
    lsteps = [("Assess", "Answer a few questions about your product and AI experience across seven skill areas."),
              ("Learn", "Get a personalized path with courses matched to exactly where you are."),
              ("Practice", "Work through real, practical lessons at your own pace. No fluff."),
              ("Reassess", "Retake the assessment to see how far you've come, and what's next.")]
    lsteps_html = "".join(f'<div class="card reveal"><span class="num">{n}</span><h3>{t}</h3><p>{d}</p></div>' for n, (t, d) in enumerate(lsteps, 1))
    body = f'''{page_head("Toolkits &amp; Learning", "Free tools and a skill check for better product decisions.", toolkit_open())}
<div class="sticky-tabs"><nav class="tabs" aria-label="On this page"><a href="#tools">Toolkits</a><a href="#coming-soon">Coming soon</a><a href="#learning">Skill check &amp; learning</a><a href="#grow">For teams</a></nav></div>

<section style="padding-top:24px">
  <div class="wrap">
    <div class="grid g3" data-ask="About the toolkits: what they are and how to use them" data-kind="Toolkit" data-keywords="templates free pdf google sheet excel">
      <div class="reveal"><div class="eyebrow">What this is</div><h3>Practical tools built from real product work</h3><p>These templates are the same ones we use with clients. Each one is a fillable PDF with a matching Google Sheet/Excel, so you can work on screen, in a spreadsheet, or on your phone. Every tool includes a worked example and clear instructions, so you are never starting from a blank page.</p></div>
      <div class="reveal"><div class="eyebrow">Why it matters</div><h3>Better decisions, easier to defend</h3><p>Most product decisions are made fast, with opinions in the room and little written down. That works until someone asks why. A simple structure gets the real criteria on the table, shows where your team disagrees, and leaves a record you can stand behind later. <span class="deep">These tools give you that structure in about an hour, not a week.</span></p></div>
      <div class="reveal"><div class="eyebrow">How to use it</div><h3>Three steps to a decision you can defend</h3><ol style="padding-left:1.2em;margin:0"><li><b>Pick a tool</b> that fits your level or the problem in front of you.</li><li><b>Look at the example first.</b> Spend five minutes with it before you fill in your own.</li><li><b>Fill it in with your team.</b> Have two people score on their own, then compare. The gaps are where the real conversation is.</li></ol></div>
    </div>
  </div>
</section>

<section class="band" id="tools" style="padding-top:56px">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Find your starting point</div><h2>Where are you today?</h2><p>Pick one and the tools that fit you are highlighted. Showing tools for: <b data-lens-label>Everyone</b>. Click again to show all.</p></div>
    {level_picker()}
    <div style="margin-top:28px">{tools}</div>
    <div id="coming-soon" style="margin-top:56px">
      <div class="section-head reveal" data-ask="Toolkits coming soon: next in line" data-kind="Toolkit" data-keywords="new tools roadmap planned next vote upcoming">
        <div class="eyebrow">Coming soon</div>
        <h2>Next in line</h2>
        <p>These are next in line. Tell us which one you need most and we will build it first.</p>
      </div>
      <div class="grid g3">{soon}</div>
      <p class="reveal" style="margin-top:18px">Want one of these sooner? Use <a href="#request">Request a tool</a> and we will move it up the list.</p>
    </div>

    <div id="request" class="request reveal" data-ask="Request a tool: vote or suggest the next toolkit" data-kind="Toolkit" data-keywords="request suggest vote new template idea roadmap notify">
      <div class="request-head">
        <div><div class="eyebrow">Request a tool</div><h2 style="font-size:1.7rem">Help decide what we build next</h2>
        <p>Requests and votes happen on our Tool Roadmap. The most requested tools are built first.</p></div>
        <div class="btn-row"><a class="btn" href="{ASSESS}tool-requests?src=site-toolkits#suggest" {EXT}>Request a tool</a><a class="btn ghost" href="{ASSESS}tool-requests?src=site-toolkits" {EXT}>Vote on the roadmap</a></div>
      </div>
      <ol class="request-steps">
        <li><span class="num">1</span><b>Sign in for free</b><span>One vote per person, so we ask you to sign in. It's the same free account as the skill assessment.</span></li>
        <li><span class="num">2</span><b>Vote for up to 3 tools</b><span>Back the ones you'd use most. You can change your votes at any time.</span></li>
        <li><span class="num">3</span><b>Suggest your own</b><span>Not on the list? Tell us what you'd use. We read every idea and add the good ones for others to vote on.</span></li>
        <li><span class="num">4</span><b>Hear when it's ready</b><span>Tick "Email me when it's ready" on a tool and we'll let you know the day it launches.</span></li>
      </ol>
    </div>
    <div class="grid g2" style="margin-top:20px">
      <div class="card reveal"><h3>Download everything</h3><p>Grab every tool in one ZIP once the library is ready.</p><a class="btn sm ghost" aria-disabled="true">Download all (coming soon)</a></div>
      <div class="card reveal"><h3>Have a tool you'd like built for your team?</h3><p>We build custom tools and assessments for clients, too.</p><a class="btn sm ghost" href="contact.html?reason=toolkits#message">Talk to us</a></div>
    </div>
    <div class="cta-band reveal" style="margin-top:32px" data-ask="Free toolkits, with no strings" data-kind="Toolkit" data-keywords="free cost price license">
      <div><h2 style="font-size:1.6rem">Free, with no strings</h2><p>We built these because good tools shouldn't depend on a big budget. Use them, share them with your team, and adapt them to your work. If you want a second set of eyes on a decision, or help building a product practice, we're happy to talk.</p></div>
      <a class="btn" href="{BOOK}">Book a free 30-minute call</a>
    </div>
    <p class="muted" style="font-size:.9rem;margin-top:20px"><i>Free to use and share for personal and internal business purposes. Please keep the Product Advisory branding. Not for resale. Our tools support decision making and are not legal, financial, or tax advice. See the <a href="terms-of-use.html">Terms of Use</a>.</i></p>
  </div>
</section>

<section id="learning">
  <div class="wrap">
    <div class="section-head reveal" data-ask="Learning: build the product and AI skills that drive real outcomes" data-kind="Learning" data-keywords="courses training learning path assess learn practice reassess">
      <div class="eyebrow">Learning</div>
      <h2>Build the product and AI skills that drive real outcomes</h2>
      <p>A free skill assessment across seven core product and AI competencies, matched instantly to a learning path built for where you are today.</p>
    </div>
    <div class="grid g4">{lsteps_html}</div>
    <div class="showcase" style="margin-top:48px" id="assessment">
      <div class="reveal" data-ask="Skill check: how well-rounded is your product + AI practice?" data-kind="Learning" data-keywords="assessment quiz test 14 questions seven competencies">
        <div class="eyebrow">Skill check</div>
        <h2 style="font-size:1.8rem">How well-rounded is your product + AI practice?</h2>
        <p>Answer 14 quick questions covering core product management skills plus how you're using AI, both personally and across your organization. You'll get a skill breakdown and specific learning recommendations for the areas with the most room to grow.</p>
        <ul class="check">{"".join(f"<li>{escape(d)}</li>" for d, _ in DOMAINS)}</ul>
        <div class="btn-row"><a class="btn" href="{ASSESS}" {EXT}>Take the assessment</a><a class="link-arrow" href="{ASSESS}framework" {EXT}>About the product framework</a></div>
      </div>
      {mock()}
    </div>
  </div>
</section>

<section class="band" id="grow" data-ask="Two ways to grow: individual and enterprise learning" data-kind="Learning" data-keywords="team assessment enterprise organization benchmark account login">
  <div class="wrap">
    <div class="section-head reveal"><div class="eyebrow">Two ways to grow</div><h2>For you, or for your whole team</h2></div>
    <div class="grid g2">
      <div class="card reveal">{icon("starter")}<h3>For individuals</h3><p><b>Individual learning.</b> Know exactly where you stand, and exactly what to work on next.</p>
        <ul class="check"><li>Take a free assessment across 7 product and AI competencies</li><li>Get a personalized learning path matched to your experience level</li><li>Track your growth over time, and retake the assessment as you improve</li><li>Learn at your own pace with courses built around real product practice</li></ul>
        <div class="btn-row"><a class="btn sm" href="{ASSESS}" {EXT}>Take the assessment</a><a class="btn sm ghost" href="{ASSESS}lms-dashboard" {EXT}>Create account or log in</a></div></div>
      <div class="card reveal">{icon("leader")}<h3>For teams &amp; organizations</h3><p><b>Enterprise learning.</b> See where your whole team stands, not just one person.</p>
        <ul class="check"><li>Benchmark your product team's skills across the same 7 competencies</li><li>Identify shared gaps in AI readiness and product practice across your organization</li><li>Pair your results with a Product Advisory engagement to close gaps faster</li><li>Build a team that's aligned, capable, and ready for what's next</li></ul>
        <div class="btn-row"><a class="btn sm" href="{ASSESS}request-info?src=site-learning&amp;who=org" {EXT}>Talk to us about team assessments</a></div></div>
    </div>
  </div>
</section>
{cta_band("Ready to see where you stand?", "Take the free skill check in about ten minutes, or talk to us about benchmarking your whole team.")}'''
    body = body.replace(f'<a class="btn" href="{BOOK}">Book a free 30-minute call</a><a class="btn ghost" href="contact.html">Send a message</a></div>\n    </div>\n  </div>\n</section>',
                        f'<a class="btn" href="{ASSESS}" {EXT}>Take the assessment</a><a class="btn ghost" href="{ASSESS}request-info?src=site-learning&amp;who=org" {EXT}>Team assessments</a></div>\n    </div>\n  </div>\n</section>')
    write("toolkits.html", page("toolkits.html", "Toolkits & Learning", "Free fillable toolkits for product decisions, and a free 14-question product + AI skill check matched to a learning path.", body,
          extra_head=ld({"@type": "CollectionPage", "name": "Toolkits & Learning", "url": SITE + "toolkits", "publisher": ORG, "hasPart": [
              {"@type": "WebApplication", "name": "Feature Prioritization Scorecard", "url": SITE + "scorecard", "applicationCategory": "BusinessApplication", "isAccessibleForFree": True},
              {"@type": "WebApplication", "name": "AI Use Case Prioritization", "url": SITE + "ai-use-cases", "applicationCategory": "BusinessApplication", "isAccessibleForFree": True},
              {"@type": "DigitalDocument", "name": "Which prioritization method? cheat sheet", "url": SITE + "assets/toolkits/which-prioritization-method.pdf", "encodingFormat": "application/pdf", "isAccessibleForFree": True},
              {"@type": "DigitalDocument", "name": "Build, Buy, or Partner Decision Matrix", "url": SITE + "assets/toolkits/build-buy-partner-matrix.pdf", "encodingFormat": "application/pdf", "isAccessibleForFree": True},
              {"@type": "DigitalDocument", "name": "Organizational Impact Score", "url": SITE + "assets/toolkits/organizational-impact-score.pdf", "encodingFormat": "application/pdf", "isAccessibleForFree": True},
              {"@type": "WebApplication", "name": "PM + AI skill assessment", "url": ASSESS, "applicationCategory": "EducationalApplication", "isAccessibleForFree": True}]},
              crumbs=[("Toolkits", "toolkits")]), image=og("toolkits")))


# ---------------------------------------------------------------- about
def about():
    body = f'''{page_head("About Us", "Who we are, and how we think about product.", signal())}
<section>
  <div class="wrap">
    <div class="prose" data-ask="About Product Advisory" data-kind="About" data-keywords="who we are history founded team experience healthcare enterprise">
      <p class="lede" style="font-size:1.35rem;color:var(--ink)">Product Advisory exists because too many good teams build the wrong things well. Not from a lack of talent or effort, but because strategy, evidence, and execution too often live in separate conversations that never quite connect. That gap is what I help close.</p>
      <hr style="border:0;border-top:1px solid var(--line);margin:32px 0">
      <p>Product Advisory is a product management consulting firm built to help startups and enterprises turn market insight into products people actually want.</p>
      <p>We started with a simple belief: too many products fail not because teams can't build, but because they build the wrong thing. Our approach starts outside your organization, in the market and with your end users, before a single roadmap decision gets made.</p>
      <p>Our team brings over 50 years of combined technology and product experience to every engagement, spanning healthcare, data strategy, and enterprise software. We've built product organizations from the ground up, scaled them through growth, and know what it takes to go from an early-stage idea to an enterprise-ready platform.</p>
      <p>We don't believe in one-size-fits-all consulting. Whether you need a single strategic engagement or an embedded, end-to-end product partner, we scale our involvement to match what you need, complementing your team's strengths rather than replacing them.</p>
      <p><b>Building market-driven products, together.</b></p>
    </div>
  </div>
</section>
<section class="band" data-ask="How we think about product" data-kind="About" data-keywords="principles values outside-in embedded partnership built to last">
  <div class="wrap">
    <div class="section-head reveal"><h2>How we think about product</h2></div>
    <div class="grid g3">
      <div class="card tint reveal">{icon("eye")}<h3>Outside-in thinking</h3><p>We start with market and user insight, not assumptions.</p></div>
      <div class="card tint reveal">{icon("embedded")}<h3>Embedded partnership</h3><p>We complement your team's strengths, not replace them.</p></div>
      <div class="card tint reveal">{icon("scale")}<h3>Built to last</h3><p>We design for where you're headed, not just where you are.</p></div>
    </div>
  </div>
</section>
<section id="founder" data-ask="Founder: Robert Merrell" data-kind="About" data-keywords="founder robert merrell fractional cpo background portfolio">
  <div class="wrap grid g2" style="align-items:center">
    <div class="reveal"><div class="eyebrow">Founder</div><h2>Robert Merrell</h2><p>Founder and Fractional CPO. Robert leads Product Advisory's engagements in product strategy, roadmaps and AI adoption for healthcare and SaaS teams, designed and built the PM + AI skills assessment and learning platform, and writes the Product+ newsletter.</p>
      <div class="btn-row"><a class="btn ghost" href="{PORTFOLIO}" {EXT}>See Robert's portfolio ↗</a><a class="link-arrow" href="{NEWSLETTER}" {EXT}>Product+ newsletter</a></div></div>
    <div class="card tint reveal"><h3>Based in Chicago, Illinois</h3><p>Working with teams across the world, remotely and on site.</p><a class="link-arrow" href="contact.html">Get in touch</a></div>
  </div>
</section>
{cta_band()}'''
    write("about.html", page("about.html", "About Us", "Product Advisory is a product management consulting firm that helps startups and enterprises turn market insight into products people actually want.", body,
          extra_head=ld({"@type": "AboutPage", "name": "About Product Advisory", "url": SITE + "about", "about": ORG, "mainEntity": ORG},
                        {"@type": "Person", "@id": SITE + "about#robert-merrell", "name": "Robert Merrell", "jobTitle": "Founder and Fractional CPO",
                         "worksFor": ORG, "url": PORTFOLIO, "homeLocation": {"@type": "Place", "name": "Chicago, Illinois"}},
                        crumbs=[("About", "about")]), image=og("about")))


# ---------------------------------------------------------------- contact
def contact_assist():
    """"Not sure what to write?": quick questions that change with the reason picked; AI turns them into a draft."""
    import json
    rows = "".join(f'<div class="chip-row" data-assist-help="{k}" hidden>{assist_chips(v)}</div>' for k, v in CONTACT_HELP.items())
    copy = escape(json.dumps({k: list(v) for k, v in CONTACT_COPY.items()}), quote=True)
    return f'''<details class="assist" id="contact-assist" data-copy="{copy}" hidden>
        <summary><span class="assist-spark" aria-hidden="true">✦</span> Not sure what to write? Answer a few quick questions</summary>
        <div class="assist-body">
          <div class="field"><label for="a-context" id="a-context-label">What are you working on?</label><input id="a-context" maxlength="400"></div>
          <fieldset class="assist-q"><legend id="a-help-label">Where could we help?</legend>{rows}</fieldset>
          <fieldset class="assist-q" id="a-timing-q"><legend>How soon?</legend><div class="seg" role="radiogroup" aria-label="How soon" data-assist="timing"><button type="button" role="radio" aria-checked="false" data-value="now">This month</button><button type="button" role="radio" aria-checked="false" data-value="quarter">This quarter</button><button type="button" role="radio" aria-checked="false" data-value="exploring">Just exploring</button></div></fieldset>
          <div class="field"><label for="a-extra">Anything else? <span class="opt">(optional)</span></label><input id="a-extra" maxlength="400"></div>
          <div class="assist-foot"><button type="button" class="btn sm" id="a-write">✦ Write my message</button><p class="assist-status" role="status" aria-live="polite"></p></div>
          <p class="assist-note">AI drafts the message from your answers only. You can edit it before sending.</p>
        </div>
      </details>'''


def contact():
    def reason(v, label):
        return f'<button type="button" role="radio" aria-checked="false" data-reason="{v}">{label}</button>'

    def rating(v, label):
        return f'<button type="button" role="radio" aria-checked="false" data-rating="{v}">{label}</button>'
    body = f'''<header class="page-head">
  <div class="wrap">
    <div><div class="eyebrow">Contact</div><h1>Let's talk.</h1><p>Have a product challenge, want to talk about training your team, or have feedback on the site? Send a note and it goes straight to our inbox.</p></div>
    <div class="art">{conversation()}</div>
  </div>
</header>

<section id="message">
  <div class="wrap contact-grid">
    <form class="card contact-form reveal" id="contact-form" novalidate>
      <fieldset class="reason">
        <legend>What's this about?</legend>
        <div class="seg wrap-seg" role="radiogroup" aria-label="Reason">{reason("advisory", "An advisory project")}{reason("team", "Team training or assessment")}{reason("toolkits", "Toolkits")}{reason("feedback", "Feedback on the site")}{reason("other", "Something else")}</div>
      </fieldset>
      <div class="field rating-field" hidden>
        <span class="flabel">How's the site?</span>
        <div class="seg wrap-seg" role="radiogroup" aria-label="Site rating">{rating("love", "Love it")}{rating("good", "Good")}{rating("okay", "It's okay")}{rating("needswork", "Needs work")}</div>
      </div>
      <div class="row">
        <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" maxlength="100"></div>
        <div class="field"><label for="f-email">Email <span class="opt" hidden>(optional)</span></label><input id="f-email" name="email" type="email" autocomplete="email" maxlength="200"></div>
      </div>
      <div class="field company-field"><label for="f-company">Company <span class="opt">(optional)</span></label><input id="f-company" name="company" autocomplete="organization" maxlength="120"></div>
      <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="6" maxlength="4000" required></textarea></div>
      {contact_assist()}
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-foot"><button class="btn" type="submit">Send message</button><p class="form-status" role="status" aria-live="polite"></p></div>
      <p class="muted" style="font-size:.85rem;margin:0">We use your details only to reply. See our <a href="privacy-policy.html">Privacy Policy</a>.</p>
    </form>

    <aside class="contact-side">
      <div class="card tint reveal" data-ask="Contact Product Advisory: call, phone, email" data-kind="Contact" data-keywords="email phone schedule call book booking calendar meeting linkedin slack newsletter chicago">
        <h3>Rather talk?</h3>
        <p>Book a free 30-minute consultation at a time that suits you.</p>
        <a class="btn" href="{BOOK}">Book a free call</a>
        <hr class="rule">
        <h3>Prefer email?</h3>
        <ul class="email-list">{"".join(f'<li><span class="email-label">{label}</span><a href="mailto:{addr}">{addr}</a><button class="btn ghost sm" type="button" data-action="copy-email" data-email="{addr}" aria-label="Copy {addr}">Copy</button></li>' for label, addr in (("General", "info@productadvisory.co"), ("Sales", "sales@productadvisory.co")))}</ul>
        <hr class="rule">
        <h3>Phone</h3>
        <p>US <a href="tel:+17273866815">+1 (727) 386-6815</a></p>
        <hr class="rule">
        <h3>Elsewhere</h3>
        <p><a href="{LINKEDIN}" {EXT}>LinkedIn ↗</a><br><a href="{NEWSLETTER}" {EXT}>Product+ newsletter ↗</a><br><a href="{SLACK}" {EXT}>Slack community ↗</a></p>
        <p class="muted" style="font-size:.88rem;margin:0">Based in Chicago, working with teams across the world, onsite or remote.</p>
      </div>
    </aside>
  </div>
</section>'''
    write("contact.html", page("contact.html", "Contact Us", "Let's talk: send Product Advisory a message, book a free 30-minute consultation, or email, call or find us on LinkedIn and Slack.", body,
          extra_head=ld({"@type": "ContactPage", "name": "Contact Product Advisory", "url": SITE + "contact", "about": ORG}, crumbs=[("Contact", "contact")]), image=og("contact")))


# The booking page's quick questions. The same choices are listed in apps-script/ask.gs (BOOKING_NEEDS_ and
# BOOKING_SERVICES_), which only keeps answers it knows; tests/booking.test.mjs checks the two lists match.
BOOKING_NEEDS = [d[0] for d in DOMAINS] + ["Team skills & training"]
BOOKING_SERVICES = [s[2] for s in SERVICES] + [p[2] for p in PACKAGES] + ["Not sure yet"]


def assist_chips(items):
    return "".join(f'<button type="button" class="chip" aria-pressed="false" data-value="{escape(x)}">{escape(x)}</button>' for x in items)


# ---------------------------------------------------------------- feature prioritization scorecard
def scorecard():
    """The first interactive toolkit (top voted on the Tool Roadmap). The scoring is assets/js/scorecard-core.js,
    the page behaviour assets/js/scorecard.js; everything stays in the visitor's browser."""
    tmpl = "".join(f'<button type="button" role="radio" aria-checked="false" data-template="{k}">{n}</button>'
                   for k, n in [("balanced", "Balanced"), ("customer", "Customer-led"), ("growth", "Growth"), ("ice", "ICE")])
    body = f'''<header class="page-head">
  <div class="wrap">
    <div><div class="eyebrow">Free toolkit · Interactive</div><h1>Feature Prioritization Scorecard</h1><p>Rank features with criteria you can change, or with RICE, and compare the two, so your roadmap reflects your goals and not the loudest voice. About 20 minutes, no sign-up, and nothing leaves your browser.</p></div>
    <div class="art">{toolkit_open()}</div>
  </div>
</header>

<section style="padding-top:28px">
  <div class="wrap sc" id="scorecard">
    <div class="sc-bar">
      <div class="field sc-title"><label for="sc-title">Name this scorecard</label><input id="sc-title" maxlength="80" placeholder="For example: Q3 roadmap"></div>
      <div class="sc-actions">
        <button type="button" class="btn sm" data-sc="share">Share a link</button>
        <button type="button" class="btn sm ghost" data-sc="csv">Download CSV</button>
        <button type="button" class="btn sm ghost" data-sc="print">Print or save as PDF</button>
        <button type="button" class="btn sm ghost" data-sc="reset">Start over</button>
      </div>
      <div class="sc-share" id="sc-share" hidden><label for="sc-share-url">Anyone with this link sees a copy of this scorecard:</label><input id="sc-share-url" readonly><p class="form-status" id="sc-share-status" role="status"></p></div>
    </div>

    <div class="seg sc-methods" role="radiogroup" aria-label="Scoring method">
      <button type="button" role="radio" aria-checked="true" data-method="weighted">Weighted scoring</button>
      <button type="button" role="radio" aria-checked="false" data-method="rice">RICE</button>
      <button type="button" role="radio" aria-checked="false" data-method="compare">Compare both</button>
    </div>

    <div class="sc-grid">
      <div>
        <div data-panel="weighted">
        <div class="card sc-card sc-crit-card">
          <div class="sc-step"><span class="num">1</span><div><h2>Choose what matters</h2><p class="muted">Start from a template, then rename, reweight, add or remove criteria. Weight 0 switches one off.</p></div></div>
          <div class="seg sc-templates" role="radiogroup" aria-label="Start from a template">{tmpl}</div>
          <div class="sc-criteria" id="sc-criteria"></div>
          <button type="button" class="btn sm ghost" data-sc="add-criterion">+ Add a criterion</button>
        </div>

        <div class="card sc-card sc-feat-card" id="sc-features" role="region" aria-labelledby="sc-feat-h">
          <div class="sc-step"><span class="num">2</span><div><h2 id="sc-feat-h">Score your features</h2><p class="muted">1 is low and 5 is high. For criteria marked <b>lower is better</b>, like effort or risk, 5 means a lot of it. Tip: have two people score on their own, then compare.</p></div>
            <button type="button" class="btn sm ghost sc-expand" data-sc="expand" aria-pressed="false" title="Open the table full screen, with the ranking alongside"><span aria-hidden="true">⤢</span> Full screen</button></div>
          <div class="sc-table-wrap"><table class="sc-table" id="sc-table"></table></div>
          <div class="btn-row"><button type="button" class="btn sm ghost" data-sc="add-feature">+ Add a feature</button><button type="button" class="btn sm ghost" data-sc="examples">Fill in an example</button></div>
        </div>
        </div>

        <div data-panel="rice" hidden>
        <div class="card sc-card">
          <div class="sc-step"><span class="num">1</span><div><h2>How RICE works</h2><p class="muted">A fixed formula from Intercom's product team, best for ranking many similar items in one product area.</p></div></div>
          <p class="sc-formula"><b>Reach</b> × <b>Impact</b> × <b>Confidence</b> ÷ <b>Effort</b></p>
          <ul class="sc-rice-help">
            <li><b>Reach</b>: how many people it affects in a set period, for example users per quarter. Use the same period for every feature.</li>
            <li><b>Impact</b>: how much it moves each of them: massive (3), high (2), medium (1), low (0.5) or minimal (0.25).</li>
            <li><b>Confidence</b>: how sure you are of the other numbers: high (100%), medium (80%) or low (50%).</li>
            <li><b>Effort</b>: how much work it takes, in person-months.</li>
          </ul>
        </div>
        <div class="card sc-card" role="region" aria-labelledby="sc-rice-h">
          <div class="sc-step"><span class="num">2</span><div><h2 id="sc-rice-h">Score your features with RICE</h2><p class="muted">The same features as the weighted tab. Change a name here and it changes there too.</p></div></div>
          <div class="sc-table-wrap"><table class="sc-table sc-rice-table" id="sc-rice-table"></table></div>
          <div class="btn-row"><button type="button" class="btn sm ghost" data-sc="add-feature">+ Add a feature</button><button type="button" class="btn sm ghost" data-sc="examples">Fill in an example</button></div>
        </div>
        </div>

        <div data-panel="compare" hidden>
        <div class="card sc-card sc-compare-card">
          <div class="sc-step"><span class="num">=</span><div><h2>Two rankings, side by side</h2><p class="muted">Weighted scoring on the left, RICE on the right. Lines show where each feature moves.</p></div></div>
          <div id="sc-compare"></div>
          <div id="sc-compare-notes"></div>
        </div>
        </div>
      </div>

      <div class="sc-side">
        <div class="card sc-card sc-results-card">
          <div class="sc-step"><span class="num">3</span><div><h2 id="sc-rank-h">Your ranking</h2><p class="muted" id="sc-rank-note">Updates as you go. Scores run from 0 to 100.</p></div></div>
          <ol class="sc-results" id="sc-results" aria-live="polite"></ol>
          <p class="muted sc-close-note" id="sc-close-note" hidden><span class="sc-chip">Close call</span> <span id="sc-close-text">These are within 5 points of each other.</span> Talk them through rather than trusting the decimals.</p>
        </div>
        <div class="card tint sc-tips">
          <h3>Make it stick</h3>
          <ul class="book-list">
            <li><b>Argue about weights, not scores.</b> Agree what matters first; the ranking follows.</li>
            <li><b>Write down why.</b> The CSV or PDF is your record when someone asks later.</li>
            <li><b>Re-run it each quarter.</b> Goals change, and so should the weights.</li>
          </ul>
          <p class="muted" style="margin-top:12px">Not sure which method fits? <a href="assets/toolkits/which-prioritization-method.pdf" {EXT}>Download the one-page cheat sheet</a> or read <a href="/insights/rice-vs-weighted-scoring">RICE or weighted scoring?</a></p>
          <hr class="rule">
          <p>Want a hand running this with your team?</p>
          <a class="btn sm" href="{BOOK}">Book a free 30-minute call</a>
        </div>
      </div>
    </div>
  </div>
</section>
<script src="assets/js/scorecard-core.js"></script>
<script src="assets/js/scorecard.js"></script>'''
    write("scorecard.html", page("scorecard.html", "Feature Prioritization Scorecard", "A free, interactive Feature Prioritization Scorecard: weighted scoring and RICE side by side. Weight your criteria, score your features, compare the rankings, and share, download or print the result.", body,
          extra_head=ld({"@type": "WebApplication", "name": "Feature Prioritization Scorecard", "url": SITE + "scorecard", "applicationCategory": "BusinessApplication",
                         "operatingSystem": "Any (runs in the browser)", "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
                         "description": "Rank product features with weighted scoring or RICE, compare the two rankings side by side, and share, download or print the result.",
                         "featureList": ["Weighted scoring with criteria you can change", "RICE scoring (reach, impact, confidence, effort)", "Side-by-side comparison of both rankings", "Share link, CSV download and print"],
                         "publisher": ORG}, crumbs=[("Toolkits", "toolkits"), ("Feature Prioritization Scorecard", "scorecard")]), image=og("scorecard")))


def ai_use_cases():
    """The second interactive toolkit (AI Use Case Prioritization, from the Tool Roadmap). The scoring is
    assets/js/ai-usecases-core.js, the page behaviour assets/js/ai-usecases.js; everything stays in the visitor's browser."""
    factors = [("value", "Business value", "How much would it move a goal that matters: time saved, revenue, a better customer experience?", "Nice to have", "Moves a key goal"),
               ("data", "Data readiness", "Is the data there, good enough, and yours to use?", "We'd have to find or fix it", "Ready and approved"),
               ("ease", "Cost &amp; effort", "How easy is it to build or buy?", "A custom build", "Switch on a tool"),
               ("adoption", "Team readiness", "Will people use it, and does someone own it?", "No owner, poor fit", "Owner and demand"),
               ("risk", "Risk if wrong", "How bad is it when the AI gets it wrong: privacy, compliance, customers, money?", "Easy to catch, low harm", "Real harm")]
    guide = "".join(f'<div class="uc-q{" is-cost" if k == "risk" else ""}"><b>{n}</b><p>{q}</p><small><span>1</span> {lo}</small><small><span>5</span> {hi}</small></div>'
                    for k, n, q, lo, hi in factors)
    body = f'''<header class="page-head">
  <div class="wrap">
    <div><div class="eyebrow">Free toolkit · Interactive</div><h1>AI Use Case Prioritization</h1><p>List your AI ideas, answer five questions for each, and see which to pilot first, which to fix before you start, and which to park. About 15 minutes, no sign-up, and nothing leaves your browser.</p></div>
    <div class="art">{toolkit_open()}</div>
  </div>
</header>

<section style="padding-top:28px">
  <div class="wrap sc uc" id="usecases">
    <div class="sc-bar">
      <div class="field sc-title"><label for="uc-title">Name this list</label><input id="uc-title" maxlength="100" placeholder="For example: Customer support AI ideas"></div>
      <div class="sc-actions">
        <button type="button" class="btn sm" data-uc="share">Share a link</button>
        <button type="button" class="btn sm ghost" data-uc="csv">Download CSV</button>
        <button type="button" class="btn sm ghost" data-uc="print">Print or save as PDF</button>
        <button type="button" class="btn sm ghost" data-uc="reset">Start over</button>
      </div>
      <div class="sc-share" id="uc-share" hidden><label for="uc-share-url">Anyone with this link sees a copy of this list:</label><input id="uc-share-url" readonly><p class="form-status" id="uc-share-status" role="status"></p></div>
    </div>

    <div class="card sc-card">
      <div class="sc-step"><span class="num">1</span><div><h2>Five questions for each idea</h2><p class="muted">Score each from 1 to 5. Risk counts the other way: 5 means a lot of it.</p></div></div>
      <div class="uc-guide">{guide}</div>
    </div>
    <div class="card sc-card" role="region" aria-labelledby="uc-table-h">
      <div class="sc-step"><span class="num">2</span><div><h2 id="uc-table-h">Score your AI ideas</h2><p class="muted">One idea per row, as specific as you can: "summarize support tickets for the weekly review" beats "AI for support". The map and plan below update as you go.</p></div></div>
      <div class="sc-table-wrap"><table class="sc-table uc-table" id="uc-table"></table></div>
      <div class="btn-row"><button type="button" class="btn sm ghost" data-uc="add">+ Add an idea</button><button type="button" class="btn sm ghost" data-uc="example">Fill in an example</button></div>
    </div>

    <div class="uc-results">
      <div class="uc-left">
        <div class="card sc-card">
          <div class="sc-step"><span class="num">3</span><div><h2>Where they land</h2><p class="muted">Value against feasibility. Numbers match the plan.</p></div></div>
          <div id="uc-matrix"></div>
          <ul class="uc-legend" id="uc-legend"></ul>
        </div>
        <div class="card uc-pilot" id="uc-pilot" aria-live="polite"></div>
      </div>
      <div class="card sc-card uc-plan-card">
        <div class="sc-step"><span class="num">4</span><div><h2>Your plan</h2><p class="muted">Best first. Priority is the average of value and feasibility, less a penalty for high risk.</p></div></div>
        <ol class="uc-plan" id="uc-plan" aria-live="polite"></ol>
      </div>
    </div>

    <div class="card tint sc-tips uc-tips">
      <h3>Make it stick</h3>
      <ul class="book-list">
        <li><b>Score with the people who'd use it.</b> Team readiness is a guess until they've weighed in.</li>
        <li><b>Pilot one thing at a time.</b> One team, four to six weeks, one number to judge it by.</li>
        <li><b>Re-run it after each pilot.</b> What you learn changes the scores for the rest.</li>
      </ul>
      <p class="muted" style="margin-top:12px">Read <a href="/insights/stop-enabling-individuals">Stop enabling individuals. Start enabling the organization.</a> and <a href="/insights/beyond-automation">Beyond Automation</a>, or see where your team stands with the free <a href="{ASSESS}" {EXT}>PM + AI skill assessment</a>.</p>
      <hr class="rule">
      <p>Want help choosing and running your first AI pilot?</p>
      <div class="btn-row"><a class="btn sm" href="{BOOK}">Book a free 30-minute call</a><a class="btn sm ghost" href="services.html#ai">AI Enablement</a></div>
    </div>
  </div>
</section>
<script src="assets/js/ai-usecases-core.js"></script>
<script src="assets/js/ai-usecases.js"></script>'''
    write("ai-use-cases.html", page("ai-use-cases.html", "AI Use Case Prioritization", "A free, interactive AI Use Case Prioritization tool: score your AI ideas on value, data readiness, cost, team readiness and risk, see them on a value and feasibility map, and get a plan with the first pilot to run.", body,
          extra_head=ld({"@type": "WebApplication", "name": "AI Use Case Prioritization", "url": SITE + "ai-use-cases", "applicationCategory": "BusinessApplication",
                         "operatingSystem": "Any (runs in the browser)", "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
                         "description": "Score AI ideas on business value, data readiness, cost and effort, team readiness and risk; see them on a value and feasibility map; get the first pilot to run and a next step for each idea.",
                         "featureList": ["Five questions per AI idea", "Value and feasibility map", "The first pilot to run", "A next step and risk guardrails for each idea", "Share link, CSV download and print"],
                         "publisher": ORG}, crumbs=[("Toolkits", "toolkits"), ("AI Use Case Prioritization", "ai-use-cases")]), image=og("ai-use-cases")))


# ---------------------------------------------------------------- book a call
def book():
    """The booking page. assets/js/site.js (initBooking) asks the Apps Script for open times from the Google
    Calendar, then books one; a link in the confirmation email (?b=…&k=…) opens this page to cancel or move it."""
    body = f'''<header class="page-head">
  <div class="wrap">
    <div><div class="eyebrow">Book a call</div><h1>Book a free 30-minute call.</h1><p>Pick a time that suits you. We'll talk through what you're working on and where we could help, on Google Meet. No preparation needed.</p></div>
    <div class="art">{conversation()}</div>
  </div>
</header>

<section id="book">
  <div class="wrap contact-grid">
    <div class="card book-card reveal" id="booking" data-ready="0">
      <div class="book-step" data-step="pick">
        <div class="book-top">
          <h2 class="book-h" id="book-days-h">Pick a day</h2>
          <div class="book-weeknav"><button type="button" class="icon-btn" data-week="-1" aria-label="Earlier weeks">‹</button><span class="book-range" id="book-range" aria-live="polite"></span><button type="button" class="icon-btn" data-week="1" aria-label="Later weeks">›</button></div>
        </div>
        <div class="book-days" id="book-days" role="group" aria-labelledby="book-days-h"><p class="muted book-loading">Loading open times…</p></div>
        <div class="book-times-wrap" id="book-times-wrap" hidden>
          <h3 class="book-h" id="book-times-h"></h3>
          <div class="book-times" id="book-times" role="group" aria-labelledby="book-times-h"></div>
        </div>
        <p class="muted book-tz" id="book-tz"></p>
      </div>

      <form class="book-step contact-form" data-step="details" id="book-form" novalidate hidden>
        <div class="book-picked"><span class="book-picked-ico" aria-hidden="true">{CLOCK}</span><div><b id="book-picked-when"></b><span>30 minutes · Google Meet</span></div><button type="button" class="btn ghost sm" data-book="back">Change</button></div>
        <div class="row">
          <div class="field"><label for="b-name">Name</label><input id="b-name" name="name" autocomplete="name" maxlength="100" required></div>
          <div class="field"><label for="b-email">Email</label><input id="b-email" name="email" type="email" autocomplete="email" maxlength="200" required></div>
        </div>
        <div class="field"><label for="b-company">Company <span class="opt">(optional)</span></label><input id="b-company" name="company" autocomplete="organization" maxlength="120"></div>
        <div class="field"><label for="b-topic">What would you like to talk about? <span class="opt">(optional)</span></label><textarea id="b-topic" name="topic" rows="4" maxlength="1000"></textarea></div>
        <details class="assist" id="book-assist">
          <summary><span class="assist-spark" aria-hidden="true">✦</span> Not sure what to write? Answer a few quick questions</summary>
          <div class="assist-body">
            <div class="field"><label for="a-wins">What's going well for your product team?</label><input id="a-wins" maxlength="400" placeholder="For example: we ship every two weeks and customers love the new onboarding"></div>
            <fieldset class="assist-q"><legend>Where would you like help? <span class="opt">(choose any)</span></legend><div class="chip-row" data-assist="needs">{assist_chips(BOOKING_NEEDS)}</div></fieldset>
            <fieldset class="assist-q"><legend>Which services interest you? <span class="opt">(choose any)</span></legend><div class="chip-row" data-assist="services">{assist_chips(BOOKING_SERVICES)}</div></fieldset>
            <fieldset class="assist-q"><legend>How soon?</legend><div class="seg" role="radiogroup" aria-label="How soon" data-assist="timing"><button type="button" role="radio" aria-checked="false" data-value="now">This month</button><button type="button" role="radio" aria-checked="false" data-value="quarter">This quarter</button><button type="button" role="radio" aria-checked="false" data-value="exploring">Just exploring</button></div></fieldset>
            <div class="field"><label for="a-extra">Anything else? <span class="opt">(optional)</span></label><input id="a-extra" maxlength="400"></div>
            <div class="assist-foot"><button type="button" class="btn sm" data-book="assist">✦ Write my note</button><p class="assist-status" role="status" aria-live="polite"></p></div>
          </div>
        </details>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="form-foot"><button class="btn" type="submit">Book the call</button><p class="form-status" role="status" aria-live="polite"></p></div>
        <p class="muted" style="font-size:.85rem;margin:0">We use your details only for this call. See our <a href="privacy-policy.html">Privacy Policy</a>.</p>
      </form>

      <div class="book-step book-done" data-step="done" hidden tabindex="-1"></div>
      <div class="book-step book-manage" data-step="manage" hidden tabindex="-1"></div>
      <noscript><p>The booking calendar needs JavaScript. Email <a href="mailto:info@productadvisory.co">info@productadvisory.co</a> and we'll find a time.</p></noscript>
    </div>

    <aside class="contact-side">
      <div class="card tint reveal">
        <h3>What to expect</h3>
        <ul class="book-list">
          <li><b>30 minutes</b> on Google Meet. The link is in your calendar invitation.</li>
          <li><b>A real conversation</b> about your product, team or roadmap. No sales script.</li>
          <li><b>Clear next steps</b>, whether that's working together, a free toolkit, or a pointer elsewhere.</li>
        </ul>
        <hr class="rule">
        <h3>Need to change it?</h3>
        <p>Your confirmation email has a link to cancel or pick another time.</p>
        <hr class="rule">
        <h3>Rather write?</h3>
        <p><a href="contact.html">Send a message</a> or email <a href="mailto:info@productadvisory.co">info@productadvisory.co</a>.</p>
      </div>
    </aside>
  </div>
</section>'''
    write("book.html", page("book.html", "Book a free call", "Book a free 30-minute call with Product Advisory: pick a time that suits you and talk it through on Google Meet.", body, image=og("book")))


# ---------------------------------------------------------------- preferences
def preferences():
    def seg(key, label, opts):
        b = "".join(f'<button type="button" role="radio" data-value="{v}">{l}</button>' for v, l in opts)
        return f'<div class="seg" role="radiogroup" aria-label="{label}" data-pref="{key}">{b}</div>'

    def block(h, p, ctl):
        return f'<div class="pref-block"><div class="pref-label"><h2>{h}</h2><p>{p}</p></div><div>{ctl}</div></div>'
    body = f'''{page_head("Make it yours", "Set the site up your way. Changes apply as you click and are saved in this browser only.", net())}
<section style="padding-top:24px">
  <div class="wrap prefs" id="prefs">
    {block("Style", "Four complete looks, same content.", STYLE_PICKS)}
    {block("Accent", "The colour for highlights, labels and the dot.", ACCENTS)}
    {block("Where are you today?", "The site highlights the toolkits and first steps that fit you.", level_picker(True, "levels lens-picks"))}
    {block("Reading depth", "Brief shows the one-line summaries. Full shows every detail.", seg("depth", "Reading depth", [("brief", "Brief"), ("full", "Full detail")]))}
    {block("Colour mode", "Follow your device, or choose.", seg("theme", "Colour mode", [("", "System"), ("light", "Light"), ("dark", "Dark")]))}
    {block("Text size", "Scales every word on the site.", seg("text", "Text size", [("s", '<span style="font-size:.8rem">Aa</span> Small'), ("m", '<span style="font-size:.95rem">Aa</span> Default'), ("l", '<span style="font-size:1.1rem">Aa</span> Large'), ("xl", '<span style="font-size:1.25rem">Aa</span> Larger')]))}
    {block("Density", "More breathing room, or more on screen.", seg("density", "Density", [("comfortable", "Comfortable"), ("compact", "Compact")]))}
    {block("Motion", "The drawing network lines, counters and fade-ins.", seg("motion", "Motion", [("full", "On"), ("reduced", "Off")]))}
    <div class="pref-actions">
      <a class="btn" href="index.html">See it on the home page →</a>
      <button type="button" class="btn ghost" id="prefs-share">Share this view</button>
      <button type="button" class="btn ghost" id="prefs-reset">Reset everything</button>
      <input class="share-url" id="prefs-share-url" readonly hidden aria-label="Link to this view">
    </div>
    <details class="acc" style="margin-top:32px">
      <summary>Under the hood</summary>
      <ul>
        <li>Every colour, font and corner radius on the site is a CSS custom property. Each style and accent is a small set of overrides on the <code>&lt;html&gt;</code> element, in light and dark versions.</li>
        <li>A short script in the page head reads your choices before anything is drawn, so you never see the default flash first.</li>
        <li>Your choices are kept in this browser's local storage. Nothing is sent to a server.</li>
        <li>Links can carry a view: <code>?lens=executive</code> opens the executive view, <code>?style=boardroom&amp;accent=gold&amp;mode=dark</code> a shared look.</li>
        <li>Plain HTML, CSS and JavaScript, with no frameworks and no build step.</li>
      </ul>
    </details>
  </div>
</section>'''
    write("preferences.html", page("preferences.html", "Make it yours", "Change how the Product Advisory site looks and reads: style, accent, your role, reading depth, colour mode, text size, density and motion.", body))


STYLE_PICKS = '<div class="style-picks" role="radiogroup" aria-label="Style" data-pref="style">' + "".join(
    f'<button type="button" role="radio" data-value="{v}" class="style-card"><span class="mini mini-{v}" aria-hidden="true"><i class="mh">{h}</i><i class="ml"></i><i class="ml s"></i><i class="mb"></i></span><b>{n}</b><span>{d}</span></button>'
    for v, n, h, d in [("classic", "Classic", "Market <em>Driven</em>", "Product Advisory navy and cyan. The default."),
                       ("editorial", "Editorial", "Market <em>Driven</em>", "Warm paper and a serif headline."),
                       ("boardroom", "Boardroom", "Market <em>Driven</em>", "Navy and gold, squared off. Reads like a board deck."),
                       ("lab", "Lab", "market_<em>driven</em>", "Monospace on a grid. For the engineers in the room.")]) + "</div>"
ACCENTS = '<div class="swatches" role="radiogroup" aria-label="Accent colour" data-pref="accent"><button type="button" role="radio" data-value="" class="sw sw-default" title="Style default">Auto</button>' + "".join(
    f'<button type="button" role="radio" data-value="{v}" class="sw" style="--c:{c}" title="{v.title()}" aria-label="{v.title()}"></button>'
    for v, c in [("cyan", "#35c2e8"), ("green", "#0b7a64"), ("blue", "#2457d6"), ("plum", "#8a3ab9"), ("coral", "#e0612b"), ("gold", "#c9971c")]) + "</div>"


# ---------------------------------------------------------------- legal + 404
def legal():
    write("privacy-policy.html", page("privacy-policy.html", "Privacy Policy", "How Product Advisory, LLC collects, uses, protects and shares information on productadvisory.co and assessment.productadvisory.co.",
                                      page_head("Privacy Policy", "Effective Date: 10/24/2026", "") + f'<section><div class="wrap prose">{PRIVACY}</div></section>'))
    write("terms-of-use.html", page("terms-of-use.html", "Terms of Use", "The terms for using productadvisory.co and assessment.productadvisory.co, including the free toolkits, assessment and learning content.",
                                    page_head("Terms of Use", "Effective Date: 10/17/2026", "") + f'<section><div class="wrap prose">{TERMS}</div></section>'))


def notfound():
    body = f'''{page_head("Page not found", "That page moved when we left Google Sites, or never existed.", net())}
<section><div class="wrap"><p class="lede" id="nf-msg">Try the search (<kbd class="mod-key">⌘</kbd> <kbd>K</kbd>), or head to one of these:</p>
<div class="btn-row"><a class="btn" href="index.html">Home</a><a class="btn ghost" href="services.html">Services</a><a class="btn ghost" href="toolkits.html">Toolkits</a><a class="btn ghost" href="contact.html">Contact</a></div></div></section>
<script>
  // Old Google Sites paths go to their new homes.
  (function () {{
    var map = {{ "home": "", "learning": "toolkits#learning", "toolkit": "toolkits", "about-us": "about", "contact-us": "contact",
      "privacy": "privacy-policy", "terms": "terms-of-use", "partners": "about" }};
    var slug = location.pathname.replace(/^\\/+|\\/+$/g, "").split("/").pop().toLowerCase();
    if (map[slug]) location.replace("/" + map[slug]);
  }})();
</script>'''
    html = page("404.html", "Page not found", "This page could not be found.", body)
    write("404.html", html)


# ---------------------------------------------------------------- insights (the Product+ articles, from insights.py)
def fmt_date(iso):
    import datetime
    d = datetime.date.fromisoformat(iso)
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def plain(html):
    import re
    return re.sub(r"<[^>]+>", "", html)


def read_minutes(a):
    words = sum(len(plain(b[1] if isinstance(b[1], str) else " ".join(b[1])).split()) for b in a["body"] if b[0] != "fig")
    return max(1, round(words / 230))


def image_size(path):
    """Width and height of a WebP or JPEG in assets/, read from its header (no image library needed)."""
    import struct
    with open(os.path.join(ROOT, path), "rb") as f:
        data = f.read(64)
    if data[:4] == b"RIFF" and data[12:16] == b"VP8 ":
        w, h = struct.unpack("<HH", data[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if data[:4] == b"RIFF" and data[12:16] == b"VP8L":
        b = data[21:25]
        return 1 + (((b[1] & 0x3F) << 8) | b[0]), 1 + (((b[3] & 0xF) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6))
    if data[:4] == b"RIFF" and data[12:16] == b"VP8X":
        return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
    raise ValueError("unsupported image: " + path)


def article_body(a):
    """The article as sections, one per heading, so Ask can find and link to each part."""
    import re
    base = f"assets/insights/{a['slug']}/"
    attrs = f'data-kind="Insight" data-keywords="{a["keywords"]}"'
    parts = [f'<section id="intro" data-ask="{escape(a["title"])}" {attrs}>']
    for b in a["body"]:
        kind = b[0]
        if kind == "h2":
            sid = re.sub(r"[^a-z0-9]+", "-", plain(b[1]).lower()).strip("-")
            parts.append(f'</section>\n<section id="{sid}" data-ask="{escape(a["title"])}: {escape(plain(b[1]))}" {attrs}>\n<h2>{b[1]}</h2>')
        elif kind == "h3":
            parts.append(f"<h3>{b[1]}</h3>")
        elif kind == "p":
            parts.append(f"<p>{b[1]}</p>")
        elif kind in ("ul", "ol"):
            parts.append(f"<{kind}>" + "".join(f"<li>{i}</li>" for i in b[1]) + f"</{kind}>")
        elif kind == "quote":
            parts.append(f"<blockquote><p>{b[1]}</p></blockquote>")
        elif kind == "fig":
            w, h = image_size(base + b[1])
            cap = f"<figcaption>{b[3]}</figcaption>" if b[3] else ""
            parts.append(f'<figure><img src="{base}{b[1]}" alt="{escape(b[2])}" width="{w}" height="{h}" loading="lazy">{cap}</figure>')
    parts.append("</section>")
    return "\n".join(parts)


def finder_text(a):
    """What the article finder ranks and the AI reads: the summary, the takeaways and the keywords."""
    return " ".join([a["dek"]] + a.get("takeaways", []) + [a.get("keywords", "")]).strip()


def insight_card(a):
    c = category(a)
    find = f' data-id="{a["slug"]}" data-find="{escape(finder_text(a), quote=True)}"'
    head = f'<div class="eyebrow">{a["topic"]}</div><h3>{escape(a["title"])}</h3><p>{escape(a["dek"])}</p>'
    if a.get("body"):
        return (f'<a class="card insight cat-{c} reveal" data-cat="{c}"{find} href="/insights/{a["slug"]}">'
                f'<img src="assets/insights/{a["slug"]}/card.webp" alt="" width="800" height="450" loading="lazy">'
                f'<div class="insight-body">{head}<small>{fmt_date(a["date"])} · {read_minutes(a)} min read</small></div></a>')
    return (f'<a class="card insight text-only cat-{c} reveal" data-cat="{c}"{find} href="{a["linkedin"]}" {EXT} data-ask="{escape(a["title"])}" data-kind="Insight">'
            f'<div class="insight-body">{head}<small>Read on LinkedIn ↗</small></div></a>')


def published():
    return sorted([a for a in listed() if a.get("body")], key=lambda a: a["date"], reverse=True)


def listed():
    """Every article except drafts (which are built as hidden previews only)."""
    return [a for a in ARTICLES if not a.get("draft")]


def related_reading(service_id):
    """On the Services page: the articles that go deeper on this service."""
    arts = [a for a in published() if service_id in a.get("services", [])]
    arts.sort(key=lambda a: a["services"].index(service_id))   # articles mainly about this service first, then newest first
    if not arts:
        return ""
    links = "".join(f'<li class="cat-{category(a)}"><a href="/insights/{a["slug"]}">{escape(a["title"])}</a></li>' for a in arts)
    return f'<div class="related-reading"><h3>Related reading</h3><ul>{links}</ul></div>'


def related_services(a):
    """At the end of an article: the services that put it into practice."""
    by_id = {sid: (t, fw) for sid, _, t, fw, *_ in SERVICES}
    cards = "".join(f'<a class="svc-link" href="services.html#{sid}"><b>{by_id[sid][0]}</b><span>{by_id[sid][1]}</span></a>' for sid in a.get("services", []))
    return f'<div class="post-services"><h2>Putting this into practice</h2><p>How Product Advisory helps teams with this:</p><div class="svc-links">{cards}</div></div>' if cards else ""


# The Insights finder's "Put it into practice": the free tool that best fits the request (matched in the browser on
# these keywords, the request counting most and the picked articles a little). A tool can carry a second link.
FINDER_TOOLS = [
    {"name": "Feature Prioritization Scorecard", "kind": "Free · interactive", "href": "/scorecard",
     "desc": "Rank your features with weighted scoring or RICE, and compare the two side by side.",
     "also": ["Which prioritization method? (one-page PDF)", "/assets/toolkits/which-prioritization-method.pdf"],
     "keys": "prioritization prioritize priorities backlog rank ranking rice ice weighted scoring score features feature tradeoffs trade-offs framework method stakeholders roadmap decide build next"},
    {"name": "Build, Buy, or Partner Decision Matrix", "kind": "Free · PDF, Sheet or Excel", "href": "/toolkits#build-buy-partner",
     "desc": "Score building, buying or partnering against ten criteria and compare the real three-year cost.",
     "keys": "build buy partner vendor vendors make outsource partnership integration capability platform tool tools cost decision"},
    {"name": "Organizational Impact Score", "kind": "Free · PDF, Sheet or Excel", "href": "/toolkits#impact-score",
     "desc": "Rate initiatives against the KPIs you already track and see which work moves the numbers that matter.",
     "keys": "impact kpi kpis metric metrics outcome outcomes initiative initiatives budget investment business value measure okr okrs results retention growth"},
    {"name": "PM + AI skill assessment", "kind": "Free · 14 questions", "href": ASSESS, "ext": True,
     "desc": "See where you or your team stand across seven product and AI skill areas, with a learning path to match.",
     "keys": "skill skills team teams learn learning training train fluency assess assessment gap gaps career grow new beginner junior product manager managers people adopt adoption use"},
    {"name": "AI Use Case Prioritization", "kind": "Free · interactive", "href": "/ai-use-cases",
     "desc": "Score your AI ideas on value, data readiness, cost, team readiness and risk, and see which to pilot first.",
     "keys": "ai use case cases idea ideas where start first pilot automate automation agent agents copilot support customer customers service adoption"},
]


def subscribe_form(where, heading="Get new articles by email"):
    """The Product+ email signup (saved by apps-script/ask.gs, type "subscribe")."""
    return f'''<form class="subscribe" data-subscribe novalidate>
  <label class="sub-label" for="sub-{where}">{heading}</label>
  <div class="sub-row"><input id="sub-{where}" type="email" name="email" autocomplete="email" placeholder="you@company.com" required maxlength="200"><button class="btn" type="submit">Subscribe</button></div>
  <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
  <p class="sub-fine">One email when a new article is published. Unsubscribe anytime. Prefer LinkedIn? <a href="{NEWSLETTER}" {EXT}>Follow Product+ there</a></p>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>'''


def insights():
    import json
    full, linked = published(), [a for a in listed() if not a.get("body")]
    counts = {cid: sum(1 for a in listed() if category(a) == cid) for cid, _ in CATEGORIES}
    chips = (f'<button type="button" role="radio" aria-checked="true" data-cat="all">All <em>{len(listed())}</em></button>'
             + "".join(f'<button type="button" role="radio" aria-checked="false" class="cat-{cid}" data-cat="{cid}"><i aria-hidden="true"></i>{label} <em>{counts[cid]}</em></button>'
                       for cid, label in CATEGORIES))
    body = f'''{page_head("Insights", "Practical writing on product strategy, AI agents and AI enablement, from the Product+ newsletter.", insight_lens())}
<section>
  <div class="wrap">
    <div class="art-finder" id="insight-finder" data-tools="{escape(json.dumps(FINDER_TOOLS), quote=True)}" hidden>
      <div class="art-finder-head"><span class="assist-spark" aria-hidden="true">✦</span> <b>Tell me what you're looking for</b> <span class="muted">and we'll suggest where to start.</span></div>
      <form class="ask-form" role="search">
        {tiny('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}
        <input type="search" placeholder="For example: only a few people on my team really use AI" aria-label="What are you looking for?" maxlength="300">
        <button class="btn" type="submit">Suggest</button>
      </form>
      <div class="ask-suggest"><span>Try:</span><button type="button">I'm new to AI agents</button><button type="button">Getting my whole organization to adopt AI</button><button type="button">Which prioritization framework should we use?</button><button type="button">We ship a lot, but users don't notice</button><button type="button">Keeping customers loyal as we automate support</button></div>
      <div class="art-finder-out" aria-live="polite"></div>
    </div>
    <div class="insight-filter" role="radiogroup" aria-label="Show articles about" hidden>{chips}</div>
    <p class="sr-only" id="insight-status" role="status" aria-live="polite"></p>
    <div class="insight-grid featured" data-ask="Insights: articles from the Product+ newsletter" data-kind="Insight" data-keywords="articles blog newsletter writing product+">{"".join(insight_card(a) for a in full)}</div>
    <div class="subscribe-card reveal" data-ask="Get Product+ articles by email" data-kind="Insight" data-keywords="newsletter subscribe email signup updates">
      <div><div class="eyebrow">Product+ by email</div><h2>New articles, straight to your inbox</h2><p>Practical writing on product strategy, AI agents and AI enablement. No spam, and nothing else.</p></div>
      {subscribe_form("insights", "Your email address")}
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <div class="section-head reveal" data-filter-section><h2>More from Product+</h2><p>These articles are on LinkedIn for now.</p></div>
    <div class="insight-grid compact">{"".join(insight_card(a) for a in linked)}</div>
  </div>
</section>
{cta_band()}'''
    write("insights.html", page("insights.html", "Insights", "Articles from the Product+ newsletter on product strategy, AI agents and AI enablement, by Product Advisory.", body,
          extra_head=ld({"@type": "Blog", "@id": SITE + "insights#blog", "name": "Product+ insights", "url": SITE + "insights", "publisher": ORG,
                         "blogPost": [{"@type": "BlogPosting", "headline": a["title"], "url": f"{SITE}insights/{a['slug']}", "datePublished": a["date"],
                                       "image": f"{SITE}assets/insights/{a['slug']}/og.jpg"} for a in full if a.get("body")]},
                        crumbs=[("Insights", "insights")]), image=og("insights")))
    for a in full + [a for a in ARTICLES if a.get("draft") and a.get("body")]:
        article_page(a, full)


def article_page(a, full):
    url = f"{SITE}insights/{a['slug']}"
    art = {"@type": "BlogPosting", "headline": a["title"], "description": a["dek"],
           "image": f"{SITE}assets/insights/{a['slug']}/og.jpg", "datePublished": a["date"], "dateModified": a.get("updated") or a["date"],
           "mainEntityOfPage": url, "articleSection": a["topic"], "author": ORG, "publisher": ORG, "isPartOf": {"@id": SITE + "insights#blog"}}
    if a.get("keywords"):
        art["keywords"] = ", ".join(a["keywords"].split())
    if a.get("linkedin"):
        art["sameAs"] = [a["linkedin"]]
    head_ld = ld(art, *([faq_ld(a["faq"])] if a.get("faq") else []), crumbs=[("Insights", "insights"), (a["title"], f"insights/{a['slug']}")])
    takeaways = (f'<aside class="takeaways cat-{category(a)}" aria-labelledby="tk-{a["slug"]}"><h2 id="tk-{a["slug"]}">Key takeaways</h2>'
                 f'<ul>{"".join(f"<li>{escape(t)}</li>" for t in a["takeaways"])}</ul></aside>') if a.get("takeaways") else ""
    faq = (f'<section class="post-faq"><h2>Questions people ask</h2>'
           + "".join(f"<h3>{escape(q)}</h3><p>{escape(ans)}</p>" for q, ans in a["faq"]) + "</section>") if a.get("faq") else ""
    updated = f' · Updated <time datetime="{a["updated"]}">{fmt_date(a["updated"])}</time>' if a.get("updated") else ""
    more = [x for x in full if x is not a][:3]
    draft = ('<div class="draft-note" role="note"><b>Draft preview.</b> Not published: this page isn\'t listed on the site or shown to search engines. '
             'To publish, remove <code>"draft": True</code> from this article in src/insights.py.</div>') if a.get("draft") else ""
    body = f'''{draft}<article class="post">
  <header class="post-head">
    <div class="wrap narrow">
      <a class="link-back" href="insights.html">← All insights</a>
      <div class="eyebrow cat-{category(a)}"><a class="eyebrow-link" href="/insights?topic={category(a)}">{a["topic"]}</a> · Product+</div>
      <h1>{escape(a["title"])}</h1>
      <p class="dek">{escape(a["dek"])}</p>
      <p class="byline">Product Advisory · <time datetime="{a["date"]}">{fmt_date(a["date"])}</time>{updated} · {read_minutes(a)} min read</p>
    </div>
  </header>
  <div class="wrap post-cover"><img src="assets/insights/{a["slug"]}/cover.webp" alt="" width="1600" height="900" fetchpriority="high"></div>
  <div class="wrap narrow">
    {takeaways}
    <div class="prose post-body">
{article_body(a)}
    {faq}
    </div>
    {related_services(a)}
    <aside class="post-foot">
      <p>This article is part of <b>Product+</b>, the Product Advisory newsletter: product thinking, plus the AI and collaboration that turn it into results. {f' It is also <a href="{a["linkedin"]}" {EXT}>on LinkedIn</a>.' if a.get("linkedin") else ""}</p>
      {subscribe_form("article")}
      <p class="post-call">Want to talk it through? <a href="{BOOK}">Book a free 30-minute call</a>.</p>
    </aside>
  </div>
</article>
<section class="band">
  <div class="wrap">
    <div class="section-head reveal"><h2>Keep reading</h2></div>
    <div class="insight-grid">{"".join(insight_card(x) for x in more)}</div>
  </div>
</section>'''
    write(f"insights/{a['slug']}.html", page(f"insights/{a['slug']}.html", a["title"], a["dek"], body,
          extra_head=('<meta name="robots" content="noindex, nofollow">\n' if a.get("draft") else "") + head_ld,
          image=f"assets/insights/{a['slug']}/og.jpg", nav="insights.html", og_type="article"))


def sitemap():
    """Every public page; articles carry their date (or last update), and the Insights list its newest article's."""
    arts = published()
    newest = max((a.get("updated") or a["date"] for a in arts), default="")
    pages = [("", ""), ("services", ""), ("toolkits", ""), ("insights", newest)] + [(f"insights/{a['slug']}", a.get("updated") or a["date"]) for a in arts] + \
            [(p, "") for p in ("about", "contact", "book", "scorecard", "ai-use-cases", "preferences", "privacy-policy", "terms-of-use")]
    urls = "\n".join(f"  <url><loc>{SITE}{p}</loc>{f'<lastmod>{d}</lastmod>' if d else ''}</url>" for p, d in pages)
    with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')


def llms():
    """llms.txt: a plain summary of the site for AI assistants (llmstxt.org), rebuilt from the same content as the pages."""
    svc = "\n".join(f"- [{t}]({SITE}services#{i}): {fw[0].lower() + fw[1:]}" for i, _, t, fw, *_ in SERVICES)
    pk = ", ".join(t for _, _, t, _, _ in PACKAGES)
    arts = "\n".join(f"- [{a['title']}]({SITE}insights/{a['slug']}): {a['dek']}" for a in published() if a.get("body"))
    faq = "\n".join(f"- **{q}** {a}" for q, a in SERVICES_FAQ)
    text = f"""# Product Advisory

> Product Advisory, LLC is a product management consulting firm in Chicago, Illinois that helps startups and enterprises build market driven products: turning market insight into roadmaps teams can defend, and products people actually want. Founded by Robert Merrell (Fractional CPO). Over 50 years of combined technology and product experience across healthcare, data strategy and enterprise software.

## Services
{svc}
- [Service packages]({SITE}services#packages): {pk}.

## Free resources
- [Toolkits]({SITE}toolkits): fillable PDF and Google Sheet decision tools (Build, Buy, or Partner Decision Matrix; Organizational Impact Score).
- [Feature Prioritization Scorecard]({SITE}scorecard): a free interactive tool that ranks features with weighted scoring or RICE and compares the two rankings side by side.
- [AI Use Case Prioritization]({SITE}ai-use-cases): a free interactive tool that scores AI ideas on value, data readiness, cost, team readiness and risk, maps them by value and feasibility, and names the first pilot to run.
- [Which prioritization method? cheat sheet]({SITE}assets/toolkits/which-prioritization-method.pdf): a one-page PDF on when to use RICE, weighted scoring or ICE.
- Coming soon: Product Strategy One Pager. [Vote or request a tool]({ASSESS}tool-requests)
- [PM + AI skill assessment]({ASSESS}): 14 questions across seven product and AI competencies, with a personalized learning path.

## Insights (Product+ articles)
- [Insights]({SITE}insights): articles from the Product+ newsletter on product strategy, AI agents and AI enablement.
{arts}

## Questions people ask
{faq}

## Contact
- [Book a free 30-minute call]({SITE}book)
- Email: info@productadvisory.co (sales: sales@productadvisory.co)
- [About]({SITE}about) · [Contact]({SITE}contact)
- [LinkedIn]({LINKEDIN}) · [Product+ newsletter]({NEWSLETTER}) · [Slack community]({SLACK})
"""
    with open(os.path.join(OUT, "llms.txt"), "w") as f:
        f.write(text)


def check_search_pages():
    """Ask searches the pages listed in PAGES in site.js; every published article must be there."""
    js = open(os.path.join(ROOT, "assets/js/site.js")).read()
    missing = [a["slug"] for a in published() if f'"insights/{a["slug"]}.html"' not in js]
    if missing:
        sys.exit("Add these articles to PAGES in assets/js/site.js so Ask can search them: " + ", ".join(missing))


def build_all():
    check_search_pages()
    home(); services(); toolkits(); insights(); about(); contact(); book(); scorecard(); ai_use_cases(); preferences(); legal(); notfound(); sitemap(); llms()


if __name__ == "__main__":
    if "--check" in sys.argv:
        import tempfile
        OUT = tempfile.mkdtemp()
        build_all()
        built = sorted(os.path.relpath(os.path.join(d, f), OUT) for d, _, fs in os.walk(OUT) for f in fs)
        stale = [f for f in built if not os.path.exists(os.path.join(ROOT, f)) or
                 open(os.path.join(OUT, f)).read() != open(os.path.join(ROOT, f)).read()]
        if stale:
            print("These pages differ from what src/ builds. Run python3 src/build.py and commit:", ", ".join(stale))
            sys.exit(1)
        print("all", len(built), "pages match src/")
    else:
        build_all()
        print("built", sorted(f for f in os.listdir(OUT) if f.endswith(".html")))
