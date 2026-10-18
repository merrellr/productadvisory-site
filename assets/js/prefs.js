/* ================================================================
   Applies the visitor's saved preferences before the page paints, so
   there is no flash of the default look. Loaded in <head> on every
   page, without defer. Preferences live only in this browser.

   Links can carry settings, e.g.
     ?lens=executive                 open with the executive view
     ?style=boardroom&accent=gold    a look someone shared
     ?depth=brief&mode=dark          a view someone shared
   They apply for this visit only (sessionStorage) until the visitor
   chooses to keep them; site.js shows the Keep / Use my own bar.
   ================================================================ */
(function () {
  "use strict";
  var DEFAULTS = { style: "classic", accent: "", lens: "", depth: "full", text: "m", density: "comfortable", motion: "full" };
  var CHOICES = {
    style: ["classic", "editorial", "boardroom", "lab"],
    accent: ["", "cyan", "green", "blue", "plum", "coral", "gold"],
    lens: ["", "starter", "practitioner", "leader", "executive"],
    depth: ["full", "brief"],
    text: ["s", "m", "l", "xl"],
    density: ["comfortable", "compact"],
    motion: ["full", "reduced"]
  };
  var MODES = ["light", "dark"];
  // Extra fonts, loaded only for the styles that use them.
  var FONTS = {
    editorial: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap",
    boardroom: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,600;1,600&display=swap",
    lab: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
  };
  function loadFont(style) {
    if (!FONTS[style] || document.getElementById("font-" + style)) return;
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = FONTS[style]; l.id = "font-" + style;
    document.head.appendChild(l);
  }

  function get(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
  function set(store, key, val) {
    try { if (val === null) window[store].removeItem(key); else window[store].setItem(key, val); } catch (e) { /* storage blocked */ }
  }
  function clean(p) {
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) { out[k] = p && CHOICES[k].indexOf(p[k]) > -1 ? p[k] : DEFAULTS[k]; });
    return out;
  }
  function parse(json) { try { return JSON.parse(json || "null"); } catch (e) { return null; } }

  /** The visitor's own saved choices. */
  function read() { return clean(parse(get("localStorage", "pa_prefs")) || {}); }

  /** Settings shared through the URL (this visit only), or null. */
  function shared() { return parse(get("sessionStorage", "pa_shared")); }

  /** What the page should show right now. */
  function current() {
    var s = shared();
    if (!s) return read();
    var base = read(), out = {};
    Object.keys(DEFAULTS).forEach(function (k) { out[k] = k in s.prefs ? s.prefs[k] : base[k]; });
    return clean(out);
  }

  function mode() {
    var s = shared();
    if (s && s.mode) return s.mode;
    var t = get("localStorage", "pa_theme");
    return MODES.indexOf(t) > -1 ? t : "";
  }

  function apply(p) {
    var root = document.documentElement;
    Object.keys(DEFAULTS).forEach(function (k) {
      if (p[k] && p[k] !== DEFAULTS[k]) root.setAttribute("data-" + k, p[k]);
      else root.removeAttribute("data-" + k);
    });
    loadFont(p.style);
    var m = mode();
    if (m) root.setAttribute("data-theme", m); else root.removeAttribute("data-theme");
  }

  /** Saving your own choice replaces any shared settings. */
  function save(p) {
    set("sessionStorage", "pa_shared", null);
    set("localStorage", "pa_prefs", JSON.stringify(clean(p)));
    apply(current());
  }

  function setMode(m) {
    if (shared()) keepShared();
    set("localStorage", "pa_theme", MODES.indexOf(m) > -1 ? m : null);
    apply(current());
  }

  function keepShared() {
    var s = shared();
    if (!s) return;
    var p = current();
    if (s.mode) set("localStorage", "pa_theme", s.mode);
    save(p);
  }

  function dropShared() {
    set("sessionStorage", "pa_shared", null);
    apply(current());
  }

  function reset() {
    set("localStorage", "pa_prefs", null);
    set("localStorage", "pa_theme", null);
    dropShared();
  }

  /** A link to this site with the given settings, leaving out anything at its default. */
  function shareUrl(p, m, base) {
    var u = new URL(base || "./", location.href);
    Object.keys(DEFAULTS).forEach(function (k) { if (p[k] && p[k] !== DEFAULTS[k]) u.searchParams.set(k, p[k]); });
    if (m) u.searchParams.set("mode", m);
    return u.toString();
  }

  // Pick up settings from the URL, then tidy the address bar so reloads and
  // copied links don't keep re-applying them.
  (function fromUrl() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var found = {}, any = false, m = "";
    Object.keys(DEFAULTS).forEach(function (k) {
      if (q.has(k) && CHOICES[k].indexOf(q.get(k)) > -1) { found[k] = q.get(k); any = true; q.delete(k); }
    });
    if (q.has("mode") && MODES.indexOf(q.get("mode")) > -1) { m = q.get("mode"); any = true; q.delete("mode"); }
    if (!any) return;
    set("sessionStorage", "pa_shared", JSON.stringify({ prefs: found, mode: m }));
    try {
      var rest = q.toString();
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    } catch (e) { /* fine: the settings still apply */ }
  })();

  window.SitePrefs = {
    DEFAULTS: DEFAULTS, CHOICES: CHOICES,
    read: read, current: current, shared: shared, mode: mode,
    loadFont: loadFont, save: save, setMode: setMode, apply: apply, keepShared: keepShared, dropShared: dropShared, reset: reset, shareUrl: shareUrl
  };
  apply(current());
})();
