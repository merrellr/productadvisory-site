/* The quick tour: a click-through guide on the page itself. No video or audio to download.
   A [data-guide] button holds the steps as JSON: {"title": ..., "restore": selector?, "steps": [{s, t, p, act?}]}.
   Each step dims the page, highlights its element (s) and shows a tip card with Back / Next. Steps whose element
   isn't on the page (or is hidden) are skipped. `act` is clicked first (a tab, for example); `restore`, found when the
   tour starts, is clicked when it ends so the page is left as it was. Esc closes; the arrow keys step.
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
    "html.guide-on [class*=toast]{visibility:hidden!important}" +
    "html.pa-embed .guide-btn{display:none}@media print{.guide-btn{display:none!important}}" +
    "@media (prefers-reduced-motion:reduce){.guide-hole,.guide-pop{transition:none}}";

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return (r.width > 0 || r.height > 0) && getComputedStyle(el).visibility !== "hidden";
  }

  function start(btn) {
    var cfg;
    try { cfg = JSON.parse(btn.getAttribute("data-guide")); } catch (e) { return; }
    var steps = cfg.steps || [], tid = btn.getAttribute("data-tour") || "";
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
        if (visible(t)) break;
        k += dir;
      }
      if (k < 0) return;
      if (k >= steps.length) return end(true);
      i = k; el = document.querySelector(steps[k].s); furthest = Math.max(furthest, k);
      var shown = steps.length;
      pop.querySelector(".g-c").textContent = "Quick tour · " + (k + 1) + " of " + shown;
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
      track(done ? "tour_finish" : "tour_close", { step: furthest + 1 });
      btn.focus({ preventScroll: true });
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
    track("tour_open");
    go(0, 1);
  }

  function init() {
    var btns = document.querySelectorAll("[data-guide]");
    if (!btns.length) return;
    var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    Array.prototype.forEach.call(btns, function (b) { b.addEventListener("click", function () { start(b); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
