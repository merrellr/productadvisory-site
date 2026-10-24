/* ================================================================
   Product Advisory: site behaviour (no dependencies)
   - theme toggle, sticky nav, mobile menu, reveal-on-scroll, counters
   - "Ask" search over every page's [data-ask] blocks, with an optional
     AI answer and a hand-off to a call when the site can't answer
   - ⌘K / Ctrl+K command menu
   - "Make it yours": preferences, the "Where are you today?" lens
   - home "Sound familiar?" picker, services engagement finder,
     toolkit level filter, contact form
   ================================================================ */
(function () {
  "use strict";

  /* ---------- settings: change these in one place ---------- */
  var EMAIL = "info@productadvisory.co";
  var BOOK = "/book";   // the booking page: a free 30-minute call, times from the Google Calendar (see initBooking)
  var ASSESSMENT = "https://assessment.productadvisory.co/";
  var NEWSLETTER = "https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7391081463410196482";
  // A Google Apps Script web app that writes AI answers and receives contact messages
  // (same pattern as the portfolio's apps-script/ask.gs). Leave empty and Ask is a plain
  // site search, and the contact form opens a pre-filled email instead.
  var ASK_ENDPOINT = "https://script.google.com/macros/s/AKfycbzhpNvZQUpdchS4ZwXtD7uAV2pYic728ktZkAT5hDGjrg680BYeg98zBAPNaVahXSPyyg/exec";
  var PAGES = ["index.html", "services.html", "toolkits.html", "about.html", "contact.html"];
  var PAGE_NAMES = { "index.html": "Home", "services.html": "Services", "toolkits.html": "Toolkits & Learning", "about.html": "About", "contact.html": "Contact" };

  // Links that open a new tab show ↗ and say so to screen readers (pages get this from the build).
  var NEW_TAB = '<span class="ext" aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span>';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function currentPage() {
    var p = location.pathname.split("/").pop();
    if (!p) return "index.html";
    return p.indexOf(".html") > -1 ? p : p + ".html";
  }
  // Pages are known by file name ("services.html#ai", which is also what the Ask script accepts as a source);
  // links show the clean address ("/services#ai"). GitHub Pages serves services.html for /services.
  function clean(u) { return String(u).replace(/^index\.html/, "/").replace(/^([a-z-]+)\.html/, "/$1"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function reducedMotion() {
    return (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.getAttribute("data-motion") === "reduced";
  }

  /* ---------- analytics ----------
     Google Tag Manager (GTM-N854VT4C) is in every page's <head>. These events
     go to its dataLayer, so a GA4 event tag in GTM can pick them up by name.
     Question text is never sent. */
  function track(name, params) {
    try {
      var data = { event: name };
      Object.keys(params || {}).forEach(function (k) { data[k] = params[k]; });
      (window.dataLayer = window.dataLayer || []).push(data);
    } catch (e) { /* never break the page */ }
  }

  /* ---------- toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function copyText(text, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast("Select the text and copy it"); });
    else toast("Select the text and copy it");
  }

  /* ---------- theme ---------- */
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function toggleTheme() {
    var next = isDark() ? "light" : "dark";
    if (window.SitePrefs) window.SitePrefs.setMode(next);
    else document.documentElement.setAttribute("data-theme", next);
    track("theme", { mode: next });
    syncPrefControls();
  }

  /* ---------- nav ---------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    var menu = $(".menu-btn");
    if (menu) menu.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("[data-action]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        var a = b.getAttribute("data-action");
        if (a === "theme") toggleTheme();
        if (a === "palette") openPalette();
        if (a === "copy-email") { e.preventDefault(); copyText(b.getAttribute("data-email") || EMAIL, "Email copied"); }
      });
    });
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $$(".mod-key").forEach(function (k) { k.textContent = mac ? "⌘" : "Ctrl"; });
  }

  /* ---------- reveal, counters, bars ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suf = el.getAttribute("data-suffix") || "";
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function initReveal() {
    var targets = $$(".reveal, [data-count], .fill[data-w]");
    var finish = function (el) {
      el.classList.add("in");
      if (el.hasAttribute("data-w")) el.style.width = el.getAttribute("data-w");
    };
    if (!("IntersectionObserver" in window) || reducedMotion()) { targets.forEach(finish); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        finish(en.target);
        if (en.target.hasAttribute("data-count")) animateCount(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- in-page index that follows the scroll ---------- */
  function initScrollSpy() {
    var links = $$(".side-index a, .sticky-tabs a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { var id = a.getAttribute("href").split("#")[1]; if (id && document.getElementById(id)) map[id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("on"); a.removeAttribute("aria-current"); });
        var a = map[en.target.id];
        if (a) { a.classList.add("on"); if (a.closest(".tabs")) a.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ================================================================
     Ask: a small search engine over every block marked [data-ask].
     Each page is fetched once, split into blocks, and ranked with a
     BM25-style score plus product-management synonyms. Answers link
     back to the exact block. Nothing leaves the browser unless
     ASK_ENDPOINT is set.
     ================================================================ */
  var STOP = "a an and are as at be been but by can could did do does for from had has have he her his how i if in into is it its me my of on or our she so than that the their them then there these they this to was we were what when where which who why will with would you your about any ever us tell show give product advisory".split(" ");
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  var SYN = {
    ai: ["copilot", "agents", "agentic", "llm", "automation", "fluency", "enablement"],
    agents: ["ai", "agentic", "copilot"],
    copilot: ["ai", "enablement", "adoption"],
    adoption: ["enablement", "ai", "habits", "governance"],
    roadmap: ["strategy", "prioritization", "planning", "roadmaps"],
    roadmaps: ["roadmap", "strategy"],
    strategy: ["roadmap", "vision", "positioning"],
    prioritize: ["prioritization", "trade-offs", "roadmap", "decision"],
    prioritization: ["prioritize", "trade-offs", "impact"],
    research: ["discovery", "interviews", "market", "validation", "customer"],
    discovery: ["research", "interviews", "validation", "customer"],
    customer: ["users", "market", "buyers", "research"],
    launch: ["go-to-market", "gtm", "launches", "sales", "marketing"],
    gtm: ["go-to-market", "launch", "positioning"],
    hire: ["fractional", "cpo", "leadership"],
    cpo: ["fractional", "chief", "leadership", "executive"],
    fractional: ["cpo", "leadership", "embedded"],
    leader: ["leadership", "executive", "cpo"],
    team: ["teams", "coaching", "training", "organization"],
    training: ["education", "workshops", "learning", "coaching", "courses"],
    learn: ["learning", "courses", "training", "assessment"],
    course: ["courses", "learning", "training"],
    test: ["assessment", "skill", "check"],
    assessment: ["skill", "check", "benchmark", "competencies"],
    skills: ["assessment", "competencies", "training", "gaps"],
    agile: ["scrum", "sprint", "retrospectives", "rituals"],
    scrum: ["agile", "sprint"],
    template: ["toolkit", "toolkits", "tools", "pdf", "sheet"],
    templates: ["toolkit", "toolkits", "tools"],
    tool: ["toolkit", "toolkits", "template"],
    free: ["toolkit", "free", "assessment"],
    price: ["cost", "budget", "free", "packages", "engagement"],
    cost: ["price", "budget", "packages"],
    pricing: ["price", "budget", "packages", "engagement"],
    security: ["compliance", "privacy", "regulations"],
    compliance: ["security", "regulations", "privacy"],
    legal: ["contracting", "contracts", "ip"],
    contract: ["contracting", "legal", "vendor"],
    design: ["ux", "ui", "wireframes", "usability"],
    ux: ["design", "ui", "usability"],
    build: ["buy", "partner", "decision", "matrix"],
    buy: ["build", "partner", "vendor"],
    healthcare: ["health", "life", "sciences"],
    startup: ["startups", "early-stage", "founder"],
    enterprise: ["enterprises", "organization", "scale"],
    contact: ["call", "email", "phone", "schedule"],
    call: ["schedule", "book", "consultation", "free"],
    newsletter: ["linkedin", "insights", "product+"],
    chicago: ["based", "located", "illinois"],
    experience: ["years", "combined", "background"]
  };
  function tokens(s) {
    return (s.toLowerCase().replace(/[’']/g, "").match(/[a-z0-9][a-z0-9+\-.]*[a-z0-9+]|[a-z0-9]/g) || [])
      .filter(function (t) { return !STOPSET[t]; });
  }
  function stem(t) { return t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t; }
  var KIND_WEIGHT = { "Service": 1.25, "Package": 1.1, "Toolkit": 1.15, "Learning": 1.1, "Home": 0.8 };

  var index = null, indexing = null;
  function chunksFrom(doc, page) {
    return $$("[data-ask]", doc).map(function (el) {
      var anchor = el.id ? el : el.closest("[id]");
      var title = el.getAttribute("data-ask") || ((el.querySelector("h1,h2,h3,h4") || {}).textContent || PAGE_NAMES[page]);
      var text = (el.textContent || "").replace(/\s+/g, " ").trim();
      return {
        title: title.trim(),
        kind: el.getAttribute("data-kind") || PAGE_NAMES[page],
        url: page + (anchor && anchor.id ? "#" + anchor.id : ""),
        text: text,
        toks: tokens(title + " " + title + " " + (el.getAttribute("data-keywords") || "") + " " + text).map(stem)
      };
    });
  }
  function buildIndex() {
    if (index) return Promise.resolve(index);
    if (indexing) return indexing;
    var here = currentPage();
    var jobs = PAGES.map(function (p) {
      if (p === here) return Promise.resolve(chunksFrom(document, p));
      return fetch(p).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
        return html ? chunksFrom(new DOMParser().parseFromString(html, "text/html"), p) : [];
      }).catch(function () { return []; });
    });
    indexing = Promise.all(jobs).then(function (lists) {
      var docs = [].concat.apply([], lists), df = {};
      docs.forEach(function (d) {
        var seen = {};
        d.tf = {};
        d.toks.forEach(function (t) { d.tf[t] = (d.tf[t] || 0) + 1; if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } });
        d.len = d.toks.length;
      });
      var avg = docs.reduce(function (s, d) { return s + d.len; }, 0) / Math.max(1, docs.length);
      index = { docs: docs, df: df, avg: avg, n: docs.length };
      return index;
    });
    return indexing;
  }
  function search(q) {
    return buildIndex().then(function (ix) {
      var terms = {};
      tokens(q).forEach(function (t) {
        terms[stem(t)] = 1;
        (SYN[t] || SYN[stem(t)] || []).forEach(function (s) { tokens(s).forEach(function (x) { if (!terms[stem(x)]) terms[stem(x)] = 0.45; }); });
      });
      var k1 = 1.4, b = 0.7;
      var scored = ix.docs.map(function (d) {
        var s = 0, hits = 0;
        Object.keys(terms).forEach(function (t) {
          var f = d.tf[t];
          if (!f) return;
          var idf = Math.log(1 + (ix.n - ix.df[t] + 0.5) / (ix.df[t] + 0.5));
          s += terms[t] * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / ix.avg));
          if (terms[t] === 1) hits++;
        });
        return { d: d, s: s * (1 + 0.35 * hits) * (KIND_WEIGHT[d.kind] || 1) };
      }).filter(function (r) { return r.s > 0.6; });
      scored.sort(function (a, c) { return c.s - a.s; });
      var titles = {};
      scored = scored.filter(function (r) { if (titles[r.d.title]) return false; titles[r.d.title] = 1; return true; });
      return { results: scored.slice(0, 5).map(function (r) { return r.d; }), terms: Object.keys(terms) };
    });
  }
  function snippet(text, terms) {
    var sentences = text.split(/(?<=[.!?])\s+/);
    var best = sentences[0] || "", bestScore = -1;
    sentences.forEach(function (s) {
      var toks = tokens(s).map(stem), sc = 0;
      terms.forEach(function (t) { if (toks.indexOf(t) > -1) sc++; });
      if (sc > bestScore) { bestScore = sc; best = s; }
    });
    if (best.length > 240) best = best.slice(0, 237) + "…";
    var out = esc(best);
    terms.filter(function (t) { return t.length > 2; }).forEach(function (t) {
      out = out.replace(new RegExp("\\b(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*)", "gi"), "<mark>$1</mark>");
    });
    return out;
  }
  // Questions that sound like someone with a project get a direct route to a person.
  var INTENT = /\b(help (us|our|me|my)|hire|we need|i need|our (team|company|product|roadmap|startup)|my (team|company)|cost|price|pricing|budget|engage|work with|available|proposal|quote)\b/i;
  function handoff(q, strong) {
    var href = "/contact?topic=" + encodeURIComponent(q) + "#message";
    return '<div class="ask-handoff"><p>' + (strong ? "Sounds like a project. Tell us about it, or book a free 30-minute call." : "Want a straight answer from a person?") +
      '</p><div class="btn-row"><a class="btn sm" href="' + href + '">Send this question</a><a class="btn sm ghost" href="' + BOOK + '">Book a call</a></div></div>';
  }

  function initAsk() {
    var box = $("#ask");
    if (!box) return;
    var form = $(".ask-form", box), input = $("input", form), out = $(".ask-out");
    var seq = 0;
    function run(q) {
      q = q.trim();
      if (!q) return;
      input.value = q;
      var mine = ++seq;
      track("ask_question", { mode: ASK_ENDPOINT ? "ai" : "search" });
      search(q).then(function (r) {
        if (mine !== seq) return;
        var strong = INTENT.test(q);
        var html = '<div class="ask-q">“' + esc(q) + '”</div>';
        if (!r.results.length) {
          out.innerHTML = html + '<p class="muted">Nothing on the site answers that directly yet.</p>' + handoff(q, true);
          // so the question shows up on the "Unanswered questions" tab (fire and forget)
          if (ASK_ENDPOINT) fetch(ASK_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: "unanswered", q: q, cid: visitorId() }) }).catch(function () {});
          return;
        }
        if (ASK_ENDPOINT) html += '<div class="ask-answer" aria-busy="true"><span class="ask-ai">AI answer</span><p class="ask-thinking">Reading the sections below…</p></div>';
        html += '<div class="ask-src-label">' + (ASK_ENDPOINT ? "Sources" : "Best matches on the site") + "</div>";
        html += r.results.map(function (d, i) {
          return '<a class="ask-hit" href="' + clean(d.url) + '"><small>' + (ASK_ENDPOINT ? "[" + (i + 1) + "] " : "") + esc(d.kind) + "</small><b>" + esc(d.title) + "</b><p>" + snippet(d.text, r.terms) + "</p></a>";
        }).join("");
        html += handoff(q, strong);
        out.innerHTML = html;
        out.scrollTop = 0;
        if (ASK_ENDPOINT) aiAnswer(q, r.results, mine);
      });
    }
    function aiAnswer(q, results, mine) {
      var slot = $(".ask-answer", out);
      fetch(ASK_ENDPOINT, {
        method: "POST",
        // text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ q: q, cid: visitorId(), sources: results.map(function (d) { return { url: d.url, title: d.title, text: d.text.slice(0, 1600) }; }) })
      }).then(function (res) { return res.json(); }).then(function (data) {
        if (mine !== seq || !slot) return;
        slot.removeAttribute("aria-busy");
        track("ask_answer", { outcome: data && data.ok ? "answered" : (data && data.error) || "error" });
        if (data && data.ok && data.answer) {
          slot.innerHTML = '<span class="ask-ai">AI answer</span>' + renderAnswer(data.answer, results) +
            '<p class="ask-fine">Written by AI from the sections below. Check the linked sources for the detail.</p>' +
            '<button type="button" class="ask-share">Copy a link to this question</button>';
          $(".ask-share", slot).addEventListener("click", function () { copyText(askLink(q), "Link copied. It opens the site and asks this question"); });
        } else {
          slot.innerHTML = '<p class="ask-fine">' + (data && data.error === "daily_limit" ? "AI answers have reached today's limit." : "The AI answer isn't available right now.") + " The best matches are below.</p>";
        }
      }).catch(function () {
        if (mine !== seq || !slot) return;
        slot.removeAttribute("aria-busy");
        slot.innerHTML = '<p class="ask-fine">The AI answer isn\'t available right now. The best matches are below.</p>';
      });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });
    $$(".ask-suggest button", box).forEach(function (b) { b.addEventListener("click", function () { run(b.textContent); }); });
    input.addEventListener("focus", function () { buildIndex(); }, { once: true });
    var q = new URLSearchParams(location.search).get("ask");
    if (q) { run(q); setTimeout(function () { box.scrollIntoView({ block: "center" }); }, 50); }
    box._run = run;
  }
  function askLink(q) { var u = new URL("./", location.href); u.searchParams.set("ask", q); return u.toString(); }
  /* Citations like [2] or [1, 3] become links to the matching source. */
  function renderAnswer(text, results) {
    return esc(text).split(/\n{2,}/).map(function (para) {
      para = para.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, function (m, nums) {
        return nums.split(/\s*,\s*/).map(function (n) {
          var d = results[+n - 1];
          return d ? '<a class="cite" href="' + clean(d.url) + '" title="' + esc(d.title) + '">' + n + "</a>" : "";
        }).join("");
      });
      return "<p>" + para.replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
  function visitorId() {
    var id = store("pa_vid");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); store("pa_vid", id); }
    return id || "";
  }
  function goAsk(q) {
    var box = $("#ask");
    if (box && box._run) {
      box.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
      if (q) box._run(q); else setTimeout(function () { $("input", box).focus(); }, 300);
    } else {
      location.href = "/?ask=" + encodeURIComponent(q || "");
    }
  }

  /* ================================================================
     Command menu (⌘K, Ctrl+K or /)
     ================================================================ */
  var pal, palInput, palList, palItems = [], palSel = 0, lastFocus;
  function go(url) { return function () { location.href = clean(url); }; }
  function open(url) { return function () { window.open(url, "_blank", "noopener"); }; }
  var ACTIONS = [
    { g: "Go to", t: "Home", i: "⌂", run: go("index.html") },
    { g: "Go to", t: "Services", i: "◆", run: go("services.html") },
    { g: "Go to", t: "Service packages", i: "▤", run: go("services.html#packages") },
    { g: "Go to", t: "Find the right engagement", i: "?", run: go("services.html#finder") },
    { g: "Go to", t: "Toolkits", i: "▣", run: go("toolkits.html") },
    { g: "Go to", t: "Learning & skill check", i: "◎", run: go("toolkits.html#learning") },
    { g: "Go to", t: "About", i: "i", run: go("about.html") },
    { g: "Go to", t: "Contact", i: "✉", run: go("contact.html") },
    { g: "Do", t: "Book a free 30-minute call", i: "☎", hint: "Pick a time", run: go("book.html") },
    { g: "Do", t: "Take the PM + AI skill assessment", i: "↗", hint: "assessment.productadvisory.co", run: open(ASSESSMENT) },
    { g: "Do", t: "Copy our email address", i: "@", hint: EMAIL, run: function () { copyText(EMAIL, "Email copied: " + EMAIL); } },
    { g: "Do", t: "Follow the newsletter on LinkedIn", i: "+", run: open(NEWSLETTER) },
    { g: "Do", t: "Request a new tool", i: "✚", run: open(ASSESSMENT + "tool-requests#suggest") },
    { g: "Make it yours", t: "Toggle light / dark", i: "◐", run: toggleTheme },
    { g: "Make it yours", t: "Reading depth: Brief", i: "≡", run: function () { setPref("depth", "brief"); toast("Brief view: summaries only"); } },
    { g: "Make it yours", t: "Reading depth: Full", i: "≣", run: function () { setPref("depth", "full"); toast("Full view"); } },
    { g: "Make it yours", t: "Style: Classic", i: "Aa", run: function () { setPref("style", "classic"); } },
    { g: "Make it yours", t: "Style: Editorial", i: "Aa", run: function () { setPref("style", "editorial"); } },
    { g: "Make it yours", t: "Style: Boardroom", i: "Aa", run: function () { setPref("style", "boardroom"); } },
    { g: "Make it yours", t: "Style: Lab", i: "Aa", run: function () { setPref("style", "lab"); } },
    { g: "Make it yours", t: "Open all preferences", i: "⚙", run: go("preferences.html") }
  ];
  function contentItems() {
    if (!index) return [];
    return index.docs.filter(function (d) { return /#/.test(d.url) && ["Service", "Package", "Toolkit", "Learning"].indexOf(d.kind) > -1; })
      .map(function (d) { return { g: d.kind === "Package" ? "Packages" : d.kind === "Service" ? "Services" : d.kind === "Toolkit" ? "Toolkits" : "Learning", t: d.title, s: d.text.slice(0, 200), i: "›", run: go(d.url) }; });
  }
  function buildPalette() {
    pal = document.createElement("div");
    pal.className = "palette-backdrop";
    pal.innerHTML = '<div class="palette" role="dialog" aria-modal="true" aria-label="Command menu">' +
      '<input type="text" placeholder="Jump to a service, a toolkit, or ask a question…" aria-label="Search commands" autocomplete="off">' +
      '<ul role="listbox"></ul>' +
      '<div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div>';
    document.body.appendChild(pal);
    palInput = $("input", pal); palList = $("ul", pal);
    pal.addEventListener("click", function (e) { if (e.target === pal) closePalette(); });
    palInput.addEventListener("input", renderPalette);
    palInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); markSel(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); markSel(); }
      else if (e.key === "Enter") { e.preventDefault(); if (palItems[palSel]) { var it = palItems[palSel]; closePalette(); it.run(); } }
      else if (e.key === "Escape") { closePalette(); }
      else if (e.key === "Tab") { e.preventDefault(); }
    });
  }
  function renderPalette() {
    var q = palInput.value.trim().toLowerCase();
    palItems = ACTIONS.concat(contentItems()).filter(function (a) { return !q || (a.t + " " + (a.hint || "") + " " + a.g + " " + (a.s || "")).toLowerCase().indexOf(q) > -1; });
    if (q) palItems.push({ g: "Ask", t: "Ask: “" + palInput.value.trim() + "”", i: "?", run: function () { goAsk(palInput.value.trim()); } });
    palSel = 0;
    var html = "", grp = "";
    palItems.forEach(function (a, n) {
      if (a.g !== grp) { grp = a.g; html += '<li class="grp" role="presentation">' + esc(grp) + "</li>"; }
      html += '<li><button type="button" role="option" data-n="' + n + '"><span class="pi">' + esc(a.i) + "</span>" + esc(a.t) + (a.hint ? "<small>" + esc(a.hint) + "</small>" : "") + "</button></li>";
    });
    palList.innerHTML = html;
    $$("button", palList).forEach(function (b) {
      b.addEventListener("click", function () { var it = palItems[+b.getAttribute("data-n")]; closePalette(); it.run(); });
      b.addEventListener("mousemove", function () { palSel = +b.getAttribute("data-n"); markSel(); });
    });
    markSel();
  }
  function markSel() {
    $$("button", palList).forEach(function (b) {
      var on = +b.getAttribute("data-n") === palSel;
      b.setAttribute("aria-selected", on ? "true" : "false");
      if (on) b.scrollIntoView({ block: "nearest" });
    });
  }
  function openPalette() {
    if (!pal) buildPalette();
    track("command_menu_open");
    lastFocus = document.activeElement;
    pal.classList.add("open");
    palInput.value = "";
    renderPalette();
    palInput.focus();
    buildIndex().then(function () { if (pal.classList.contains("open")) renderPalette(); });
  }
  function closePalette() {
    if (!pal) return;
    pal.classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); if (pal && pal.classList.contains("open")) closePalette(); else openPalette(); }
    else if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "") && !(pal && pal.classList.contains("open"))) { e.preventDefault(); openPalette(); }
  });

  /* ================================================================
     Preferences and the "Where are you today?" lens
     ================================================================ */
  var LENS = {
    starter: { name: "Starter", t: "New to product, or to this kind of decision", p: "Start with the free skill check to see where you stand, then pick a Starter toolkit. Plain language, clear steps.", a: "Take the free skill check", href: ASSESSMENT },
    practitioner: { name: "Practitioner", t: "You make product decisions every week", p: "The toolkits give you a repeatable way to score options and defend the call. The Organizational Impact Score is a good first one.", a: "Browse the toolkits", href: "/toolkits#tools" },
    leader: { name: "Leader", t: "You guide a team or a portfolio", p: "Benchmark your team across the seven competencies, then close the gaps with coaching and training built around what you find.", a: "See team coaching", href: "/services#coaching" },
    executive: { name: "Executive", t: "You set direction and funding", p: "A Fractional CPO gives you senior product leadership without a full-time hire: vision, roadmap discipline and a team that can run without us.", a: "See Fractional CPO+", href: "services.html#pkg-cpo" }
  };
  function setPref(key, value) {
    if (!window.SitePrefs) return;
    var p = window.SitePrefs.current();
    p[key] = value;
    window.SitePrefs.save(p);
    track("pref_change", { pref: key, value: value || "default" });
    syncPrefControls();
  }
  function syncPrefControls() {
    if (!window.SitePrefs) return;
    var p = window.SitePrefs.current();
    var theme = window.SitePrefs.mode();
    $$("[data-pref]").forEach(function (group) {
      var key = group.getAttribute("data-pref");
      var cur = key === "theme" ? theme : p[key];
      $$("[role=radio]", group).forEach(function (b) {
        var on = b.getAttribute("data-value") === cur;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on || (!cur && b === $("[role=radio]", group)) ? 0 : -1;
      });
    });
    applyLens(p.lens);
  }
  /* Everything that reacts to the lens: start-here cards, toolkit highlights. */
  function applyLens(lens) {
    $$("[data-start-here]").forEach(function (box) {
      var L = LENS[lens];
      box.hidden = !L;
      if (!L) return;
      box.innerHTML = '<div class="start-card"><div><div class="eyebrow">Start here · ' + esc(L.name) + "</div><h3>" + esc(L.t) + "</h3><p>" + esc(L.p) +
        '</p></div><a class="btn" href="' + L.href + '"' + (/^https?:/.test(L.href) ? ' target="_blank" rel="noopener">' + esc(L.a) + NEW_TAB : ">" + esc(L.a) + " →") + "</a></div>";
    });
    $$("[data-levels]").forEach(function (el) {
      var hit = !lens || (" " + el.getAttribute("data-levels") + " ").indexOf(" " + lens + " ") > -1;
      el.classList.toggle("dim", !hit);
      $$(".tag[data-level]", el).forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-level") === lens); });
    });
    $$("[data-lens-label]").forEach(function (el) { el.textContent = LENS[lens] ? LENS[lens].name : "Everyone"; });
  }
  function initPrefs() {
    $$("[data-pref]").forEach(function (group) {
      var key = group.getAttribute("data-pref");
      $$("[role=radio]", group).forEach(function (b) {
        b.addEventListener("click", function () {
          var v = b.getAttribute("data-value");
          // clicking the chosen level again clears it
          if (key === "lens" && b.getAttribute("aria-checked") === "true" && group.hasAttribute("data-toggle")) v = "";
          if (key === "theme") { window.SitePrefs.setMode(v); track("pref_change", { pref: "theme", value: v || "system" }); syncPrefControls(); }
          else setPref(key, v);
        });
      });
      radioKeys(group);
    });
    var reset = $("#prefs-reset");
    if (reset) reset.addEventListener("click", function () { window.SitePrefs.reset(); syncPrefControls(); toast("Back to the defaults"); });
    var share = $("#prefs-share");
    if (share) share.addEventListener("click", function () {
      var url = window.SitePrefs.shareUrl(window.SitePrefs.current(), window.SitePrefs.mode());
      var outEl = $("#prefs-share-url");
      outEl.value = url; outEl.hidden = false; outEl.select();
      copyText(url, "Link copied. Anyone who opens it sees the site this way");
    });
    syncPrefControls();
  }
  /* Arrow keys move between options in a radiogroup, as screen-reader users expect. */
  function radioKeys(group) {
    group.addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].indexOf(e.key) < 0) return;
      var radios = $$("[role=radio]", group);
      var i = radios.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var next = radios[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : radios.length - 1)) % radios.length];
      next.focus(); next.click();
    });
  }
  var STYLE_NAMES = { classic: "Classic", editorial: "Editorial", boardroom: "Boardroom", lab: "Lab" };
  var LENS_NAMES = { starter: "Starter view", practitioner: "Practitioner view", leader: "Leader view", executive: "Executive view" };
  function initSharedBar() {
    var sp = window.SitePrefs, s = sp && sp.shared();
    if (!s) return;
    // A link that only sets the lens (e.g. ?lens=executive in an email) needs no bar.
    var looks = Object.keys(s.prefs).filter(function (k) { return k !== "lens"; });
    if (!looks.length && !s.mode) return;
    var p = sp.current(), bits = [];
    if (s.prefs.style) bits.push(STYLE_NAMES[p.style]);
    if (s.prefs.accent) bits.push(p.accent.charAt(0).toUpperCase() + p.accent.slice(1));
    if (s.prefs.depth) bits.push(p.depth === "brief" ? "Brief" : "Full");
    if (s.mode) bits.push(s.mode === "dark" ? "Dark" : "Light");
    if (s.prefs.lens) bits.push(LENS_NAMES[p.lens]);
    var bar = document.createElement("div");
    bar.className = "shared-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Shared view");
    bar.innerHTML = "<span>You're seeing a shared view" + (bits.length ? ": <b>" + esc(bits.join(" · ")) + "</b>" : "") + ".</span>" +
      '<button type="button" class="btn sm" data-k="keep">Keep it</button><button type="button" class="btn sm ghost" data-k="drop">Use my own</button>';
    document.body.appendChild(bar);
    bar.addEventListener("click", function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-k");
      if (!k) return;
      if (k === "keep") { sp.keepShared(); toast("Saved as your view"); } else { sp.dropShared(); }
      bar.remove();
      syncPrefControls();
    });
  }

  /* ================================================================
     Home: "Sound familiar?" picks a problem and names the fix
     ================================================================ */
  function initProblems() {
    var wrap = $("#problems");
    if (!wrap) return;
    var cards = $$(".problem", wrap), out = $("#prescription");
    cards.forEach(function (c) {
      c.addEventListener("click", function () {
        var on = c.getAttribute("aria-pressed") !== "true";
        cards.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        c.setAttribute("aria-pressed", on ? "true" : "false");
        if (!on) { out.hidden = true; return; }
        $("h3", out).textContent = c.getAttribute("data-fix");
        $("p", out).textContent = c.getAttribute("data-fix-text");
        var a = $("a.btn", out);
        a.href = c.getAttribute("data-href");
        a.textContent = c.getAttribute("data-cta") + " →";
        out.hidden = false;
        track("problem_pick", { problem: c.getAttribute("data-problem") });
      });
    });
  }

  /* ================================================================
     Services: three questions point to a starting engagement
     ================================================================ */
  var PACKAGES = {
    cpo: { t: "Fractional CPO+", p: "Senior product leadership embedded in your team: vision, roadmap process and mentoring, scaled to your stage and budget.", id: "pkg-cpo" },
    validation: { t: "Market Validation", p: "Customer interviews, competitive positioning and demand signals, so you know you're building the right thing before you build it.", id: "pkg-validation" },
    training: { t: "Training & Education", p: "Hands-on workshops and a curriculum built around where your team actually is, starting with a skills benchmark.", id: "pkg-training" },
    gtm: { t: "Go to Market", p: "Positioning, messaging, channel strategy and launch sequencing, so the release lands with impact.", id: "pkg-gtm" },
    ai: { t: "AI Enablement", p: "Turn scattered AI experiments into an organizational capability: the right first use case, a real pilot, and habits that stick.", id: "ai" }
  };
  function initFinder() {
    var f = $("#finder");
    if (!f) return;
    var picks = {};
    $$("[data-q]", f).forEach(function (group) {
      $$(".chip", group).forEach(function (c) {
        c.addEventListener("click", function () {
          $$(".chip", group).forEach(function (x) { x.setAttribute("aria-checked", x === c ? "true" : "false"); });
          picks[group.getAttribute("data-q")] = c.getAttribute("data-v");
          decide();
        });
      });
      radioKeys(group);
    });
    function decide() {
      var res = $(".finder-result", f);
      if (!picks.problem) return;
      var key = picks.problem === "guess" ? "validation" : picks.problem === "launch" ? "gtm" : picks.problem === "ai" ? "ai" : picks.problem === "skills" ? "training" : "cpo";
      if (picks.problem === "direction" && picks.help === "train") key = "training";
      if (picks.problem === "skills" && picks.help === "lead") key = "cpo";
      if (picks.problem === "guess" && picks.help === "lead" && picks.stage !== "enterprise") key = "cpo";
      var P = PACKAGES[key];
      var stage = { early: "an early-stage team", scaling: "a scaling team", enterprise: "an enterprise team" }[picks.stage];
      $("h3", res).textContent = P.t;
      $("p", res).textContent = P.p + (stage ? " A common starting point for " + stage + "." : "");
      $("a.btn.ghost", res).href = "#" + P.id;
      $("a.btn:not(.ghost)", res).href = "/contact?topic=" + encodeURIComponent("Interested in " + P.t) + "#message";
      res.hidden = false;
      $$(".pkg").forEach(function (el) { el.classList.toggle("hl", el.id === P.id); });
      track("finder_result", { result: key });
    }
  }

  /* ---------- contact form ----------
     Reason chips change the form: "Feedback on the site" asks for a rating,
     hides Company and makes Email optional. ?reason=team and ?topic=… pre-fill it. */
  var PLACEHOLDERS = {
    advisory: "What you're building and where you're stuck…",
    team: "Team size, roles, and what you'd like them to get better at…",
    toolkits: "Which toolkit, and what you're using it for…",
    feedback: "What worked, what didn't, what you'd add…",
    other: ""
  };
  function initContact() {
    var form = $("#contact-form");
    if (!form) return;
    var started = Date.now();
    var F = form.elements;
    var q = new URLSearchParams(location.search);
    var reason = q.get("reason") || "", rating = "";
    var reasons = $$("[data-reason]", form), ratings = $$("[data-rating]", form);
    var status = $(".form-status", form);
    if (q.get("topic")) F.message.value = q.get("topic") + "\n\n";
    function pickReason(r) {
      reason = r;
      reasons.forEach(function (b) { var on = b.getAttribute("data-reason") === r; b.setAttribute("aria-checked", on ? "true" : "false"); b.tabIndex = on || !r ? 0 : -1; });
      var fb = r === "feedback";
      $(".rating-field", form).hidden = !fb;
      $(".company-field", form).hidden = fb;
      $$(".opt", F.email.parentNode).forEach(function (o) { o.hidden = !fb; });
      F.message.placeholder = PLACEHOLDERS[r] || "";
    }
    reasons.forEach(function (b) { b.addEventListener("click", function () { pickReason(b.getAttribute("data-reason")); }); });
    ratings.forEach(function (b) {
      b.addEventListener("click", function () {
        rating = b.getAttribute("data-rating");
        ratings.forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      });
    });
    $$("[role=radiogroup]", form).forEach(radioKeys);
    pickReason(reasons.some(function (b) { return b.getAttribute("data-reason") === reason; }) ? reason : "");

    function say(msg, err) { status.textContent = msg; status.classList.toggle("err", !!err); }
    function mailto(d) {
      var body = d.message + "\n\n" + [d.name, d.company, d.rating ? "Site rating: " + d.rating : ""].filter(Boolean).join("\n");
      return "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Website: " + (d.reasonLabel || "Hello")) + "&body=" + encodeURIComponent(body);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = {
        type: "contact", reason: reason || "other", rating: reason === "feedback" ? rating : "",
        name: F.name.value.trim(), email: F.email.value.trim(), company: reason === "feedback" ? "" : F.company.value.trim(),
        message: F.message.value.trim(), website: F.website.value, elapsed: Date.now() - started
      };
      var picked = reasons.filter(function (b) { return b.getAttribute("data-reason") === d.reason; })[0];
      d.reasonLabel = picked ? picked.textContent : "Something else";
      F.email.removeAttribute("aria-invalid"); F.message.removeAttribute("aria-invalid");
      if (!d.message) { F.message.setAttribute("aria-invalid", "true"); F.message.focus(); return say("Please add a message.", true); }
      var needEmail = d.reason !== "feedback";
      if ((needEmail && !d.email) || (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))) {
        F.email.setAttribute("aria-invalid", "true"); F.email.focus();
        return say(d.email ? "That email address doesn't look right." : "Please add your email so we can reply.", true);
      }
      if (!ASK_ENDPOINT) { location.href = mailto(d); say("Your email app should open with the message filled in."); return; }
      var btn = $("button[type=submit]", form);
      btn.disabled = true; say("Sending…");
      fetch(ASK_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(d) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error("failed");
          track("contact_submit", { reason: d.reason });
          form.innerHTML = '<div class="sent"><h3>Thanks' + (d.name ? ", " + esc(d.name.split(" ")[0]) : "") + ".</h3><p>" +
            (d.reason === "feedback" ? "Your feedback is on its way to us. It helps make this site better." :
              "Your message is on its way, and we'll reply to " + esc(d.email) + " within one business day. You'll also get a short confirmation by email.") +
            '</p><div class="btn-row"><a class="btn" href="' + BOOK + '">Book a free 30-minute call</a><a class="btn ghost" href="/">Back to home</a></div></div>';
        })
        .catch(function () {
          btn.disabled = false;
          status.innerHTML = "That didn't send. <a href=\"" + esc(mailto(d)) + "\">Email it instead</a>; your message will be filled in.";
          status.classList.add("err");
        });
    });
  }

  /* ---------- book a call (book.html) ----------
     Open times come from the Google Calendar through the Apps Script (apps-script/ask.gs, "Booking"),
     shown in the visitor's own time zone. ?b=…&k=… (the link in the confirmation email) opens the
     booking to cancel it or pick another time. */
  function initBooking() {
    var card = $("#booking");
    if (!card) return;
    var steps = $$(".book-step", card), form = $("#book-form"), F = form.elements, status = $(".form-status", form);
    var q = new URLSearchParams(location.search);
    var manage = q.get("b") && q.get("k") ? { b: q.get("b"), k: q.get("k") } : null;
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* older browser */ }
    var started = Date.now(), weeks = [], page = 0, dayKey = null, picked = null, moving = null, byDay = {};
    var PER_PAGE = 2;   // weeks shown at once

    function show(name) { steps.forEach(function (st) { st.hidden = st.getAttribute("data-step") !== name; }); card.setAttribute("data-at", name); }
    function call(body) {
      return fetch(ASK_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); });
    }
    function key(ms) { var d = new Date(ms); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    function at(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function time(ms) { return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
    function when(ms) { return new Date(ms).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + " at " + time(ms); }
    function say(msg, err) { status.textContent = msg; status.classList.toggle("err", !!err); }
    // If the calendar can't be reached, email still works.
    var FAIL = 'email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> and we\'ll find a time.';

    /* ----- step 1: pick a day and a time ----- */
    function load() {
      $("#book-days").innerHTML = '<p class="muted book-loading">Loading open times…</p>';
      $("#book-times-wrap").hidden = true;
      return call({ type: "slots" }).then(function (r) {
        if (!r || !r.ok || !r.days) throw new Error("no slots");
        build(r.days);
      }).catch(function () {
        $("#book-days").innerHTML = '<p class="book-fail">The calendar didn\'t load just now. <button type="button" class="linkish" data-book="retry">Try again</button>, ' + FAIL + "</p>";
      });
    }
    // Server days are in the calendar's zone; the visitor sees weekdays in theirs, grouped by their own date.
    function build(days) {
      byDay = {};
      days.forEach(function (d) { d.slots.forEach(function (ms) { (byDay[key(ms)] = byDay[key(ms)] || []).push(ms); }); });
      if (!days.length) return;
      var first = at(days[0].date), last = at(days[days.length - 1].date);
      var monday = new Date(first); monday.setDate(first.getDate() - ((first.getDay() + 6) % 7));
      weeks = [];
      for (var w = new Date(monday); w <= last; w.setDate(w.getDate() + 7)) {
        var row = [];
        for (var i = 0; i < 5; i++) { var d = new Date(w); d.setDate(w.getDate() + i); row.push(key(d.getTime())); }
        weeks.push(row);
      }
      var firstOpen = null;
      weeks.some(function (row, wi) { return row.some(function (k) { if ((byDay[k] || []).length) { firstOpen = { k: k, w: wi }; return true; } return false; }); });
      if (!firstOpen) {
        $("#book-days").innerHTML = '<p class="book-fail">No open times in the next four weeks. Please ' + FAIL + "</p>";
        return;
      }
      page = Math.floor(firstOpen.w / PER_PAGE);
      dayKey = dayKey && (byDay[dayKey] || []).length ? dayKey : firstOpen.k;
      paintDays(); paintTimes();
    }
    function paintDays() {
      var rows = weeks.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE), today = key(Date.now());
      $("#book-days").innerHTML = '<div class="book-dow" aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>' +
        rows.map(function (row) {
          return '<div class="book-week">' + row.map(function (k) {
            var n = (byDay[k] || []).length, d = at(k), before = k < today;
            var label = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + (n ? ", " + n + (n === 1 ? " time" : " times") : ", no times");
            return '<button type="button" class="book-day' + (k === today ? " is-today" : "") + '" data-day="' + k + '" aria-pressed="' + (k === dayKey) + '"' + (n ? "" : " disabled") +
              ' aria-label="' + esc(label) + '"><span class="bd-m">' + d.toLocaleDateString(undefined, { month: "short" }) + '</span><b>' + d.getDate() + "</b><small>" +
              (before ? "" : n ? n + (n === 1 ? " time" : " times") : "Full") + "</small></button>";
          }).join("") + "</div>";
        }).join("");
      var a = at(rows[0][0]), b = at(rows[rows.length - 1][4]);
      $("#book-range").textContent = a.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + b.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      $('[data-week="-1"]', card).disabled = page === 0;
      $('[data-week="1"]', card).disabled = (page + 1) * PER_PAGE >= weeks.length;
    }
    function paintTimes() {
      var list = (byDay[dayKey] || []).slice().sort(function (x, y) { return x - y; });
      $("#book-times-wrap").hidden = !list.length;
      if (!list.length) return;
      $("#book-times-h").textContent = at(dayKey).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      $("#book-times").innerHTML = list.map(function (ms) { return '<button type="button" class="book-time" data-ms="' + ms + '">' + esc(time(ms)) + "</button>"; }).join("");
    }
    $("#book-tz").textContent = "Times are in your time zone" + (tz ? " (" + tz.replace(/_/g, " ") + ")" : "") + ". Each call is 30 minutes on Google Meet.";

    card.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (!t || !card.contains(t)) return;
      if (t.hasAttribute("data-week")) { page += +t.getAttribute("data-week"); paintDays(); return; }
      if (t.hasAttribute("data-day")) { dayKey = t.getAttribute("data-day"); paintDays(); paintTimes(); var firstTime = $("#book-times button"); if (firstTime) firstTime.focus(); return; }
      if (t.hasAttribute("data-ms")) { pick(+t.getAttribute("data-ms")); return; }
      var act = t.getAttribute("data-book");
      if (act === "back") { show("pick"); var again = $('.book-time[data-ms="' + picked + '"]'); if (again) again.focus(); return; }
      if (act === "retry") { load(); return; }
      if (act === "move") { startMove(); return; }
      if (act === "cancel") { askCancel(); return; }
      if (act === "cancel-yes") { doCancel(t); return; }
      if (act === "cancel-no") { openManage(); return; }
      if (act === "assist") { writeNote(t); return; }
      if (t.classList.contains("chip") && t.closest("#book-assist")) { t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") === "true" ? "false" : "true"); return; }
      if (t.getAttribute("role") === "radio" && t.closest('[data-assist="timing"]')) {
        $$('[data-assist="timing"] [role=radio]', card).forEach(function (r) { r.setAttribute("aria-checked", r === t ? "true" : "false"); });
        return;
      }
    });

    /* ----- step 2: details, then book ----- */
    function pick(ms) {
      picked = ms;
      $("#book-picked-when").textContent = when(ms);
      form.classList.toggle("is-move", !!moving);
      $("button[type=submit]", form).textContent = moving ? "Move my call to this time" : "Book the call";
      say("");
      show("details");
      (moving ? $("button[type=submit]", form) : F.name).focus();
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = { type: "book", start: picked, tz: tz, website: F.website.value, elapsed: Date.now() - started };
      if (moving) { d.replace = moving.b; d.k = moving.k; }
      else {
        d.name = F.name.value.trim(); d.email = F.email.value.trim(); d.company = F.company.value.trim(); d.topic = F.topic.value.trim();
        var a = answers(); d.wins = a.wins; d.needs = a.needs; d.services = a.services; d.timing = a.timing;
        F.name.removeAttribute("aria-invalid"); F.email.removeAttribute("aria-invalid");
        if (!d.name) { F.name.setAttribute("aria-invalid", "true"); F.name.focus(); return say("Please add your name.", true); }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { F.email.setAttribute("aria-invalid", "true"); F.email.focus(); return say(d.email ? "That email address doesn't look right." : "Please add your email for the invitation.", true); }
      }
      var btn = $("button[type=submit]", form);
      btn.disabled = true; say(moving ? "Moving your call…" : "Booking…");
      call(d).then(function (r) {
        btn.disabled = false;
        if (r && r.ok) { done(r, d); return; }
        var err = r && r.error;
        if (err === "taken") { say(""); show("pick"); load().then(function () { var p = $("#book-days"); p.insertAdjacentHTML("afterbegin", '<p class="book-fail" role="alert">Sorry, that time was just taken. Please pick another.</p>'); }); return; }
        if (err === "too_many") return say("You already have two calls booked. Use the link in your confirmation email to change one.", true);
        if (err === "bad_email") return say("That email address doesn't look right.", true);
        if (err === "too_fast") return say("That was quick! Please try again.", true);
        if (err === "bad_link") return say("That booking link no longer works. Book a new time instead.", true);
        status.innerHTML = "Booking isn't available just now. Please " + FAIL; status.classList.add("err");
      }).catch(function () {
        btn.disabled = false;
        status.innerHTML = "That didn't go through. Please " + FAIL; status.classList.add("err");
      });
    });
    function done(r, d) {
      track(moving ? "booking_moved" : "booking_made", {});
      var el = $('[data-step="done"]', card);
      var first = (d.name || "").split(" ")[0];
      el.innerHTML = '<div class="book-ok" aria-hidden="true">✓</div><h2>' + (moving ? "Your call has moved." : "You're booked" + (first ? ", " + esc(first) : "") + ".") + "</h2>" +
        '<p class="book-when-big">' + esc(when(r.start)) + "</p>" +
        "<p>" + (moving ? "We've updated the calendar invitation and sent a new confirmation." :
          "A calendar invitation with the Google Meet link is on its way to <b>" + esc(d.email) + "</b>, with a confirmation from " + EMAIL + ".") + "</p>" +
        '<div class="btn-row">' + (r.meet ? '<a class="btn" href="' + esc(r.meet) + '" target="_blank" rel="noopener">Google Meet link' + NEW_TAB + "</a>" : "") +
        '<a class="btn ghost" href="/">Back to home</a></div>' +
        '<p class="muted" style="font-size:.88rem">Need to change it? Use the link in your confirmation email.</p>';
      moving = null;
      show("done"); el.focus();
      if (manage) history.replaceState(null, "", location.pathname);
    }

    /* ----- "Not sure what to write?": a few quick questions, turned into a note by AI ----- */
    function answers() {
      var chosen = function (k) { return $$('[data-assist="' + k + '"] [aria-pressed="true"]', card).map(function (b) { return b.getAttribute("data-value"); }); };
      var t = $('[data-assist="timing"] [aria-checked="true"]', card);
      return { wins: $("#a-wins").value.trim(), needs: chosen("needs"), services: chosen("services"), timing: t ? t.getAttribute("data-value") : "", extra: $("#a-extra").value.trim() };
    }
    // Without the AI (or if it is busy), the answers are written out plainly instead.
    function plainNote(a) {
      var when = { now: "this month", quarter: "this quarter", exploring: "" }[a.timing];
      return [a.wins ? "What's going well: " + a.wins + "." : "",
        a.needs.length ? "I'd like help with " + a.needs.join(", ") + "." : "",
        a.services.length ? "I'm interested in " + a.services.join(", ") + "." : "",
        when ? "We'd like to get started " + when + "." : a.timing === "exploring" ? "We're just exploring for now." : "",
        a.extra].filter(Boolean).join(" ").replace(/\.\./g, ".");
    }
    function writeNote(btn) {
      var a = answers(), out = $(".assist-status", card);
      if (!a.wins && !a.needs.length && !a.services.length && !a.extra) { out.textContent = "Answer at least one question first."; return; }
      btn.disabled = true; out.textContent = "Writing your note…";
      var fill = function (text, ai) {
        F.topic.value = text.slice(0, 1000);
        btn.disabled = false;
        out.textContent = ai ? "Done. Your note is in the box above: edit anything you like." : "Your answers are in the box above: edit anything you like.";
        F.topic.focus();
        track("booking_assist", { ai: ai ? "yes" : "no" });
      };
      call({ type: "bookAssist", wins: a.wins, needs: a.needs, services: a.services, timing: a.timing, extra: a.extra, company: F.company.value.trim(), cid: visitorId() })
        .then(function (r) { if (r && r.ok && r.text) fill(r.text, true); else fill(plainNote(a), false); })
        .catch(function () { fill(plainNote(a), false); });
    }

    /* ----- the link from the confirmation email: see, cancel or move a booking ----- */
    var current = null;
    function openManage() {
      var el = $('[data-step="manage"]', card);
      show("manage");
      if (!current) { el.innerHTML = '<p class="muted">Loading your booking…</p>'; }
      (current ? Promise.resolve(current) : call({ type: "booking", b: manage.b, k: manage.k })).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || "failed");
        current = r;
        if (r.status !== "booked" || r.past) {
          el.innerHTML = "<h2>" + (r.past ? "This call has already happened." : r.status === "moved" ? "This call was moved." : "This call was cancelled.") + "</h2>" +
            "<p>" + (r.status === "moved" ? "Your newer confirmation email has the current time." : "Want to talk again? Pick a new time below.") + "</p>" +
            '<div class="btn-row"><a class="btn" href="/book">Book a call</a></div>';
          return;
        }
        el.innerHTML = '<div class="eyebrow">Your call</div><h2>' + esc(when(r.start)) + "</h2><p>30 minutes on Google Meet" + (r.name ? ", booked by " + esc(r.name) : "") + ".</p>" +
          '<div class="btn-row">' + (r.meet ? '<a class="btn" href="' + esc(r.meet) + '" target="_blank" rel="noopener">Google Meet link' + NEW_TAB + "</a>" : "") +
          '<button type="button" class="btn ghost" data-book="move">Pick another time</button><button type="button" class="btn ghost" data-book="cancel">Cancel the call</button></div>';
        el.focus();
      }).catch(function () {
        el.innerHTML = "<h2>That link doesn't work.</h2><p>It may have been copied only in part. Open it again from your confirmation email, or " + FAIL + '</p><div class="btn-row"><a class="btn" href="/book">Book a new time</a></div>';
      });
    }
    function startMove() {
      moving = manage;
      $("#book-days-h").textContent = "Pick a new day";
      show("pick"); load();
    }
    function askCancel() {
      var el = $('[data-step="manage"]', card);
      el.innerHTML = "<h2>Cancel your call on " + esc(when(current.start)) + "?</h2><p>We'll take it off the calendar and let you know.</p>" +
        '<div class="btn-row"><button type="button" class="btn" data-book="cancel-yes">Yes, cancel it</button><button type="button" class="btn ghost" data-book="cancel-no">Keep it</button></div>';
      $('[data-book="cancel-yes"]', el).focus();
    }
    function doCancel(btn) {
      btn.disabled = true;
      var el = $('[data-step="manage"]', card);
      call({ type: "cancelBooking", b: manage.b, k: manage.k }).then(function (r) {
        if (!r || !r.ok) throw new Error("failed");
        track("booking_cancelled", {});
        current = null;
        el.innerHTML = "<h2>Your call is cancelled.</h2><p>It's off the calendar, and Google will let you know too. Whenever you're ready, pick a new time.</p>" +
          '<div class="btn-row"><a class="btn" href="/book">Book a new time</a><a class="btn ghost" href="/">Back to home</a></div>';
        history.replaceState(null, "", location.pathname);
        el.focus();
      }).catch(function () {
        btn.disabled = false;
        el.insertAdjacentHTML("beforeend", '<p class="book-fail" role="alert">That didn\'t go through. Please ' + FAIL + "</p>");
      });
    }

    if (manage) openManage(); else { show("pick"); load(); }
  }

  /* ---------- cookie consent banner ----------
     consent.js (in <head>) sets the Consent Mode defaults by region and
     decides whether this visitor needs asking. The banner shows only then,
     or when someone clicks "Cookie settings". A choice is remembered. */
  function initConsent() {
    var C = window.PAConsent;
    if (!C) return;
    var bar;
    function close() { if (bar) { bar.remove(); bar = null; document.body.classList.remove("has-consent"); } }
    function show() {
      if (bar) return;
      bar = document.createElement("div");
      bar.className = "consent"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Cookies and analytics");
      var cur = C.choice();
      if (C.privacySignal && C.privacySignal()) { toast("Your browser asks sites not to track you, so analytics cookies stay off."); return; }
      bar.innerHTML = '<div class="consent-text"><b>Cookies and analytics</b><p>We use Google Analytics to see which pages are used, so we can improve the site, the toolkits and the free assessment. It sets cookies on your device. We don\'t use it for advertising. <a href="/privacy-policy#cookies">Privacy Policy</a></p>' +
        (cur ? '<p class="consent-now">Your current choice: ' + (cur === "granted" ? "Accepted" : "Declined") + ".</p>" : "") + "</div>" +
        '<div class="btn-row"><button type="button" class="btn sm" data-c="granted">Accept</button><button type="button" class="btn sm ghost" data-c="denied">Decline</button></div>';
      document.body.appendChild(bar);
      document.body.classList.add("has-consent");
      bar.addEventListener("click", function (e) {
        var v = e.target.getAttribute && e.target.getAttribute("data-c");
        if (!v) return;
        C.set(v);
        close();
        toast(v === "granted" ? "Thanks. Analytics cookies are on." : "Analytics cookies are off.");
      });
    }
    $$("[data-action=cookies]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); show(); }); });
    if (C.needsPrompt()) show();
  }

  /* ---------- go ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initReveal();
    initScrollSpy();
    initAsk();
    initPrefs();
    initSharedBar();
    initProblems();
    initFinder();
    initContact();
    initBooking();
    initConsent();
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  });
})();
