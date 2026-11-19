/* The quick tour: a click-through guide on the page itself. No video or audio to download.
   A [data-guide] button holds the steps as JSON: {"title": ..., "restore": selector?, "steps": [{s, t, p, act?, alt?}]}.
   Each step dims the page, highlights its element (s) and shows a tip card with Back / Next. Steps whose element
   isn't on the page (or is hidden) are skipped, unless the step names an `alt` to point at instead. `act` is clicked first (a tab, for example); `restore`, found when the
   tour starts, is clicked when it ends so the page is left as it was. Esc closes; the arrow keys step.
   Once someone takes a tour (or closes its × ), its button leaves the page for good and the tour lives under Help.
   It comes back only when the tour changes: give the button a higher data-tour-v and mark the new steps with "v"; the
   button returns as "New on this page" and walks just the new steps. Which tours were taken is kept in this browser
   (pa-tours-taken: "id" or "id@v") and, on Learning, on the person's account so it follows them to other devices.
   ?tour=1 (or ?tour=<id>) in the address starts the page's tour once it has loaded.
   The same file runs on www (src/guides.json, built in by build.py) and on Learning (tour.js there is a copy). */
(function () {
  "use strict";
  var CSS =
    ".guide-btn{display:inline-flex;align-items:center;gap:12px;margin:12px 0 18px;padding:8px 18px 8px 8px;border-radius:34px;border:1.5px solid var(--line,#e3e9f0);background:var(--card,var(--surface,#fff));color:var(--ink,#16213e);font:inherit;text-align:left;cursor:pointer;box-shadow:0 6px 18px rgba(18,48,94,.08);transition:border-color .15s,transform .15s}" +
    ".guide-btn:hover{border-color:var(--primary,#1c4587);transform:translateY(-1px)}" +
    ".guide-btn:focus-visible,.guide-pop button:focus-visible{outline:3px solid var(--cyan,#35c2e8);outline-offset:2px}" +
    ".guide-ico{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--primary,#1c4587);color:#fff}" +
    ".guide-ico svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    ".guide-btn b{display:block;color:var(--navy,#1a4584);font-size:.95rem}.guide-btn small{display:block;color:var(--muted,var(--ink-soft,#5a6678));font-size:.8rem}" +
    ".guide-shield{position:fixed;inset:0;z-index:2147483600;background:transparent}" +
    ".guide-hole{position:fixed;z-index:2147483601;border-radius:12px;box-shadow:0 0 0 3px #35c2e8,0 0 0 200vmax rgba(8,20,42,.58);pointer-events:none;transition:top .25s,left .25s,width .25s,height .25s}" +
    ".guide-pop{position:fixed;z-index:2147483602;width:min(360px,calc(100vw - 24px));box-sizing:border-box;padding:16px 18px 14px;border-radius:14px;background:#fff;color:#16213e;box-shadow:0 18px 50px rgba(6,16,34,.35);font-size:.95rem;line-height:1.5;transition:top .25s,left .25s}" +
    ".guide-pop .g-k{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 6px;color:#5a6678;font-size:.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}" +
    ".guide-pop h2{margin:0 0 6px;color:#1a4584;font-size:1.08rem;line-height:1.3}.guide-pop p{margin:0}" +
    ".guide-pop .g-x{min-width:32px;min-height:32px;margin:-6px -8px 0 0;border:0;border-radius:16px;background:transparent;color:#5a6678;font-size:1.3rem;line-height:1;cursor:pointer}" +
    ".guide-pop .g-x:hover{background:#eef3f9}" +
    ".guide-pop .g-row{display:flex;align-items:center;gap:8px;margin-top:14px}" +
    ".guide-pop .g-dots{flex:1;display:flex;flex-wrap:wrap;gap:5px}.guide-pop .g-dots i{width:7px;height:7px;border-radius:50%;background:#d5deea}.guide-pop .g-dots i.on{background:#1c4587}" +
    ".guide-pop .g-b{min-height:38px;padding:0 16px;border-radius:19px;border:1.5px solid #c9d5e6;background:#fff;color:#1a4584;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer}" +
    ".guide-pop .g-n{border-color:#1c4587;background:#1c4587;color:#fff}" +
    ".guide-btn.guide-sm{margin:12px 0 0;padding:4px 14px 4px 4px;gap:8px;box-shadow:none}.guide-sm .guide-ico{width:28px;height:28px}.guide-sm .guide-ico svg{width:15px;height:15px}.guide-sm b{font-size:.85rem}" +
    "html.guide-on [class*=toast]{visibility:hidden!important}" +
    /* once taken (or closed with ×), a tour's button leaves the page; Help keeps the tour */
    ".guide-btn.guide-taken,.guide-wrap.guide-taken{display:none!important}" +
    ".guide-wrap{display:inline-flex;align-items:center;gap:2px;max-width:100%}.guide-wrap>.guide-btn{min-width:0}" +
    ".guide-x{flex:none;display:grid;place-items:center;width:30px;height:30px;margin-left:2px;border:0;border-radius:50%;background:transparent;color:var(--muted,var(--ink-soft,#5a6678));font:inherit;font-size:1.15rem;line-height:1;cursor:pointer}" +
    ".guide-x:hover{background:var(--line,#e3e9f0);color:var(--ink,#16213e)}.guide-x:focus-visible{outline:3px solid var(--cyan,#35c2e8);outline-offset:2px}" +
    ".guide-tag{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:9px;background:#35c2e8;color:#08202e;font-size:.68rem;font-style:normal;font-weight:800;letter-spacing:.04em;text-transform:uppercase;vertical-align:1px}" +
    ".guide-btn.guide-new{border-color:#35c2e8}" +
    ".guide-tip{position:fixed;z-index:2147483590;max-width:min(280px,calc(100vw - 24px));box-sizing:border-box;padding:10px 32px 10px 14px;border-radius:12px;background:#12305e;color:#fff;font-size:.86rem;line-height:1.45;box-shadow:0 12px 30px rgba(6,16,34,.3);animation:guideTipIn .25s ease-out}" +
    ".guide-tip::before{content:\"\";position:absolute;top:-6px;right:var(--arrow,20px);width:12px;height:12px;background:#12305e;transform:rotate(45deg)}" +
    ".guide-tip b{color:#7fdcf4}.guide-tip button{position:absolute;top:4px;right:4px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:1.05rem;line-height:1;cursor:pointer}" +
    ".guide-tip button:hover{background:rgba(255,255,255,.14)}.guide-tip button:focus-visible{outline:3px solid #35c2e8}" +
    ".guide-ring{box-shadow:0 0 0 3px #35c2e8!important;border-radius:999px}" +
    "@keyframes guideTipIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
    "html.pa-embed .guide-btn{display:none}@media print{.guide-btn{display:none!important}}" +
    "@media (prefers-reduced-motion:reduce){.guide-hole,.guide-pop{transition:none}.guide-tip{animation:none}}";

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return (r.width > 0 || r.height > 0) && getComputedStyle(el).visibility !== "hidden";
  }

  function start(btn, full) {
    var cfg;
    try { cfg = JSON.parse(btn.getAttribute("data-guide")); } catch (e) { return; }
    var steps = cfg.steps || [], tid = btn.getAttribute("data-tour") || "", ver = version(btn), had = seen(tid);
    // a tour that changed since this person took it: walk just the new steps (Help's "Take the tour" walks them all)
    var whatsNew = !full && had > 0 && had < ver && steps.some(function (st) { return (st.v || 1) > had; });
    if (whatsNew) steps = steps.filter(function (st) { return (st.v || 1) > had; });
    var before = document.activeElement;
    var restore = cfg.restore ? document.querySelector(cfg.restore) : null;
    var track = function (n, x) {   // the sites' analytics: GTM's dataLayer (www) and PAAnalytics (Learning)
      var d = Object.assign({ tour: tid }, x || {});
      try {
        if (window.PAAnalytics && window.PAAnalytics.event) window.PAAnalytics.event(n, d);
        else { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, d)); if (window.PAEvent) window.PAEvent(n, d); }
      } catch (e) { /* never break the page */ }
    };
    var shield = document.createElement("div"), hole = document.createElement("div"), pop = document.createElement("div");
    shield.className = "guide-shield"; hole.className = "guide-hole";
    pop.className = "guide-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-labelledby", "guideTitle");
    pop.innerHTML = '<div class="g-k"><span class="g-c"></span><button type="button" class="g-x" aria-label="Close the tour">&times;</button></div>' +
      '<h2 id="guideTitle"></h2><p class="g-p" aria-live="polite"></p>' +
      '<div class="g-row"><span class="g-dots" aria-hidden="true"></span><button type="button" class="g-b g-back">Back</button><button type="button" class="g-b g-n">Next</button></div>';
    document.documentElement.classList.add("guide-on");   // pop-up notices wait until the tour ends
    document.body.appendChild(shield); document.body.appendChild(hole); document.body.appendChild(pop);
    var back = pop.querySelector(".g-back"), next = pop.querySelector(".g-n");
    var i = -1, el = null, raf = 0, furthest = 0;

    function place() {
      raf = 0;
      if (!el) return;
      var vw = window.innerWidth, vh = window.innerHeight, pad = 8, r = el.getBoundingClientRect();
      var top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
      var bottom = Math.min(vh - 4, r.bottom + pad), right = Math.min(vw - 4, r.right + pad);
      hole.style.top = top + "px"; hole.style.left = left + "px";
      hole.style.width = Math.max(0, right - left) + "px"; hole.style.height = Math.max(0, bottom - top) + "px";
      var pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 14, x, y, m = 12;
      var clampX = function (v) { return Math.min(Math.max(m, v), vw - pw - m); }, clampY = function (v) { return Math.min(Math.max(m, v), vh - ph - m); };
      if (vw < 600) { x = (vw - pw) / 2; y = vh - ph - m; if (bottom > y - gap && top > ph + 2 * m) y = m; }   // phones: a card at the bottom (or top)
      else if (bottom + gap + ph < vh - m) { x = clampX(left); y = bottom + gap; }        // below
      else if (top - gap - ph > m) { x = clampX(left); y = top - gap - ph; }              // above
      else if (vw - right - gap > pw + m) { x = right + gap; y = clampY(top); }          // to the right
      else if (left - gap > pw + m) { x = left - gap - pw; y = clampY(top); }            // to the left
      else { x = vw - pw - m - 8; y = vh - ph - m - 8; }                                 // it fills the screen: the bottom corner
      pop.style.top = y + "px"; pop.style.left = x + "px";
    }
    function later() { if (!raf) raf = requestAnimationFrame(place); }

    function go(k, dir) {
      while (k >= 0 && k < steps.length) {
        var st = steps[k];
        if (st.act) { var a = document.querySelector(st.act); if (a) a.click(); }
        var t = document.querySelector(st.s);
        if (!visible(t) && st.alt) t = document.querySelector(st.alt);   // e.g. a menu link hidden on phones: point at the menu button
        if (visible(t)) break;
        k += dir;
      }
      if (k < 0) return;
      if (k >= steps.length) return end(true);
      i = k; el = t; furthest = Math.max(furthest, k);
      var shown = steps.length;
      pop.querySelector(".g-c").textContent = (whatsNew ? "What's new · " : "Quick tour · ") + (k + 1) + " of " + shown;
      pop.querySelector("h2").textContent = steps[k].t;
      pop.querySelector(".g-p").textContent = steps[k].p;
      var dots = ""; for (var d = 0; d < shown; d++) dots += '<i class="' + (d === k ? "on" : "") + '"></i>';
      pop.querySelector(".g-dots").innerHTML = dots;
      back.hidden = k === 0;
      next.textContent = k === steps.length - 1 ? "Done" : "Next";
      // bring it into view below the sticky header (from its top when it's taller than the screen)
      var r = el.getBoundingClientRect(), vh = window.innerHeight, room = vw600() ? vh - pop.offsetHeight - 40 : vh;
      var y = window.scrollY + r.top - (r.height < room - 120 ? Math.max(90, (room - r.height) / 2) : 90);
      window.scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      place(); setTimeout(place, 350);
      next.focus({ preventScroll: true });
    }
    function vw600() { return window.innerWidth < 600; }

    function end(done) {
      window.removeEventListener("scroll", later, true); window.removeEventListener("resize", later);
      document.removeEventListener("keydown", key, true);
      shield.remove(); hole.remove(); pop.remove(); document.documentElement.classList.remove("guide-on");
      if (restore) restore.click();
      track(done ? "tour_finish" : "tour_close", { step: furthest + 1, whats_new: whatsNew });
      // the first time through, the button leaves the page and Help points out where the tour lives now
      var first = had < ver && !btn.classList.contains("guide-taken");
      if (first) leave(btn);
      var back = isShown(btn) ? btn : (before && before !== document.body && before.isConnected && isShown(before) ? before : helpAnchor());
      if (back) back.focus({ preventScroll: true });
      if (first) helpTip();
    }
    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); end(false); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1, 1); }
      else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); go(i - 1, -1); }
      else if (e.key === "Tab") {   // keep focus in the card
        var f = Array.prototype.filter.call(pop.querySelectorAll("button"), function (b) { return !b.hidden; });
        var at = f.indexOf(document.activeElement);
        e.preventDefault(); f[(at + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    next.addEventListener("click", function () { go(i + 1, 1); });
    back.addEventListener("click", function () { go(i - 1, -1); });
    pop.querySelector(".g-x").addEventListener("click", function () { end(false); });
    shield.addEventListener("click", function () { next.focus(); });
    window.addEventListener("scroll", later, true); window.addEventListener("resize", later);
    document.addEventListener("keydown", key, true);
    track("tour_open", { whats_new: whatsNew });
    mark(tid, ver);
    go(0, 1);
  }
  function isShown(el) { return !!el && el.getClientRects().length > 0; }
  function version(b) { return Math.max(1, parseInt(b.getAttribute("data-tour-v"), 10) || 1); }
  // the button and its × leave the page (the tour stays under Help)
  function leave(b) {
    b.classList.add("guide-taken");
    var w = b.parentNode && b.parentNode.classList && b.parentNode.classList.contains("guide-wrap") ? b.parentNode : null;
    if (w) w.classList.add("guide-taken");
  }
  // Help: the button that opens it (the first one showing: the header's Help, else the phone menu)
  function helpAnchor() {
    var a = document.querySelectorAll("[data-help-anchor]");
    for (var n = 0; n < a.length; n++) if (isShown(a[n])) return a[n];
    return null;
  }
  // "The tour is under Help now": a small note under the Help button, once, that goes by itself
  function helpTip() {
    var a = helpAnchor(), old = document.querySelector(".guide-tip");
    if (old) old.remove();
    if (!a) return;
    var tip = document.createElement("div"), r = a.getBoundingClientRect();
    tip.className = "guide-tip"; tip.setAttribute("role", "status");
    tip.innerHTML = "You can take this tour again any time from <b>Help</b>.<button type=\"button\" aria-label=\"Close\">&times;</button>";
    document.body.appendChild(tip);
    var w = tip.offsetWidth, x = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12);
    tip.style.top = (r.bottom + 12) + "px"; tip.style.left = x + "px";
    tip.style.setProperty("--arrow", Math.max(10, Math.min(w - 22, r.left + r.width / 2 - x - 6)) + "px");
    a.classList.add("guide-ring");
    // it goes after 7 seconds, on its ×, or once the page is scrolled well away (not by the tour's own last scroll)
    var y0 = -1, gone = function () { tip.remove(); a.classList.remove("guide-ring"); window.removeEventListener("scroll", moved, true); };
    var moved = function () { if (y0 < 0) return; if (Math.abs(window.scrollY - y0) > 120) gone(); };
    setTimeout(function () { y0 = window.scrollY; }, 900);
    tip.querySelector("button").addEventListener("click", gone);
    window.addEventListener("scroll", moved, true);
    setTimeout(gone, 7000);
  }

  // Which tours this visitor has taken, and which version: "id" (version 1) or "id@2". This browser, plus (on
  // Learning) the person's account: account-menu.js hands the account's list to PATour.merge and saves this
  // browser's list when it changes (the pa-tours-changed event).
  var TAKEN = "pa-tours-taken";
  function list() {
    try { var l = JSON.parse(localStorage.getItem(TAKEN) || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function parse(entries) {
    var m = {};
    (entries || []).forEach(function (e) {
      if (typeof e !== "string") return;
      var at = e.lastIndexOf("@"), id = at > 0 ? e.slice(0, at) : e, v = at > 0 ? parseInt(e.slice(at + 1), 10) || 1 : 1;
      if (id && v > (m[id] || 0)) m[id] = v;
    });
    return m;
  }
  function save(m) {
    var out = Object.keys(m).map(function (id) { return m[id] > 1 ? id + "@" + m[id] : id; }).slice(-60);
    try { localStorage.setItem(TAKEN, JSON.stringify(out)); } catch (e) { /* storage off */ }
    try { window.dispatchEvent(new CustomEvent("pa-tours-changed", { detail: out.slice() })); } catch (e) { /* old browser */ }
    return out;
  }
  function seen(id) { return (id && parse(list())[id]) || 0; }
  function mark(id, v) {
    if (!id) return;
    var m = parse(list());
    if ((m[id] || 0) >= v) return;
    m[id] = v; save(m);
  }
  // A button's state: "fresh" (never taken), "new" (taken, but the tour has changed since) or "taken".
  function state(b) {
    var s = seen(b.getAttribute("data-tour")), v = version(b);
    return !s ? "fresh" : s < v ? "new" : "taken";
  }
  // The page's tour for Help: the first whose spot on the page is showing (the dashboard has one per tab).
  function pageButton(id) {
    if (id) return document.querySelector('[data-guide][data-tour="' + id + '"]');
    var all = document.querySelectorAll("[data-guide]");
    for (var n = 0; n < all.length; n++) {
      var w = all[n].closest(".guide-wrap") || all[n];
      if (isShown(w.parentNode)) return all[n];
    }
    return all[0] || null;
  }
  // For a Help menu or a search box: start this page's tour (all of it), or say there isn't one.
  window.PATour = {
    available: function () { return !!document.querySelector("[data-guide]"); },
    // "new" when this page's tour has changed since this person took it (Help marks it New)
    status: function () { var b = pageButton(); return b ? state(b) : ""; },
    start: function (id) {
      var b = pageButton(id);
      if (!b) return false;
      start(b, true);
      return true;
    },
    // the account's list (Learning): add it to this browser's, update the buttons, and return the combined list
    merge: function (entries) {
      var m = parse(list()), a = parse(entries), changed = false;
      Object.keys(a).forEach(function (id) { if (a[id] > (m[id] || 0)) { m[id] = a[id]; changed = true; } });
      var out = changed ? save(m) : list();
      paint();
      return out;
    }
  };

  // Show each button as it should be: gone once taken, "New on this page" when the tour has changed since.
  function paint() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-guide]"), function (b) {
      var st = state(b), label = b.querySelector("b"), small = b.querySelector("small");
      if (!b.hasAttribute("data-label") && label) { b.setAttribute("data-label", label.innerHTML); if (small) b.setAttribute("data-small", small.innerHTML); }
      b.classList.toggle("guide-new", st === "new");
      if (st === "taken") return leave(b);
      var w = b.closest(".guide-wrap");   // back on the page (the tour has changed since)
      b.classList.toggle("guide-taken", false); if (w) w.classList.toggle("guide-taken", false);
      if (st === "new" && label) {
        var had = seen(b.getAttribute("data-tour")), cfg = {};
        try { cfg = JSON.parse(b.getAttribute("data-guide")); } catch (e) { /* keep the count off */ }
        var n = (cfg.steps || []).filter(function (x) { return (x.v || 1) > had; }).length;
        label.innerHTML = '<em class="guide-tag">New</em>See what\u2019s new on this page';
        var count = n ? n + (n === 1 ? " new step" : " new steps") : "A quick look";
        if (small) small.textContent = count; else b.title = count;
        b.setAttribute("aria-label", "New on this page: see what's new. A short tour.");
      }
    });
  }

  function init() {
    var btns = document.querySelectorAll("[data-guide]");
    if (!btns.length) return;
    var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () { start(b); });
      // a × beside the button: hide it without taking the tour (it stays under Help)
      if (!b.closest(".guide-wrap")) {
        var w = document.createElement("span"), x = document.createElement("button");
        w.className = "guide-wrap"; x.type = "button"; x.className = "guide-x"; x.innerHTML = "&times;";
        x.setAttribute("aria-label", "Hide this tour. You can take it any time from Help.");
        x.title = "Hide. It stays under Help.";
        b.parentNode.insertBefore(w, b); w.appendChild(b); w.appendChild(x);
        x.addEventListener("click", function () {
          mark(b.getAttribute("data-tour"), version(b));
          leave(b);
          try { if (window.PAAnalytics && window.PAAnalytics.event) window.PAAnalytics.event("tour_dismiss", { tour: b.getAttribute("data-tour") }); else (window.dataLayer = window.dataLayer || []).push({ event: "tour_dismiss", tour: b.getAttribute("data-tour") }); } catch (e) { /* never break the page */ }
          var h = helpAnchor(); if (h) h.focus({ preventScroll: true });
          helpTip();
        });
      }
    });
    if (window.__paToursAccount) window.PATour.merge(window.__paToursAccount); else paint();
    // ?tour=1 or ?tour=<id>: start it once the page has settled (Help's tour links from other pages)
    var q = new URLSearchParams(location.search).get("tour");
    if (q) {
      var b = pageButton(q === "1" ? "" : q);
      if (b) {
        try { var u = new URL(location.href); u.searchParams.delete("tour"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) { /* old browser */ }
        // wait for its part of the page to show (the dashboard draws after sign-in), for up to 15 seconds
        var tries = 0, wait = function () {
          var w = b.closest(".guide-wrap") || b;
          if (isShown(w.parentNode) || ++tries > 75) setTimeout(function () { start(b, true); }, 300); else setTimeout(wait, 200);
        };
        wait();
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
