/* Shared by the four interactive tools; loaded before each tool's own script. */
(function () {
  "use strict";
  var LEARNING = "https://assessment.productadvisory.co";

  /* Inside Product Advisory Learning. The toolkit there (assessment.productadvisory.co/my-tools) runs these same
     pages in a frame with ?embed=1. prefs.js marks the page (html.pa-embed) before it paints, and site.css hides the
     site's header, footer and links. The work is then kept in the page instead of this browser's storage, and each
     change is handed to Learning, which saves it to the person's account. Only Learning is told, never another site:
     messages go to the frame's parent only when that parent is Learning (or a local test copy of it). */
  var html = document.documentElement;
  var EMBED = html.classList.contains("pa-embed");
  var parentOrigin = "";
  if (EMBED) {
    try {
      var ref = new URL(document.referrer).origin;
      if (ref === LEARNING || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ref)) parentOrigin = ref;
    } catch (e) { parentOrigin = ""; }
  }
  var params = new URLSearchParams(location.search);
  var memory = {}, timer = 0, pending = null;
  function tell(msg) { if (parentOrigin) window.parent.postMessage(msg, parentOrigin); }

  /* Save to my account: on the public pages the tools hand their work to Learning in the link's #, so nothing is
     sent to a server until the person chooses Save there. Opening a saved tool from Learning comes back as
     "#<prefix>=<data>&doc=<id>", and the tool remembers the id so the next Save updates that copy. */
  window.PASave = {
    url: LEARNING + "/my-tools",
    embedded: EMBED,
    // ?start=example: a new tool opened from Learning with "Try the example"
    start: EMBED ? params.get("start") || "" : "",
    key: function (tool) { return "pa_saved_" + tool; },
    docId: function (tool) { if (EMBED) return ""; try { return localStorage.getItem(this.key(tool)) || ""; } catch (e) { return ""; } },
    remember: function (tool, id) { if (EMBED) return; try { if (id) localStorage.setItem(this.key(tool), id); else localStorage.removeItem(this.key(tool)); } catch (e) { /* storage off */ } },
    forget: function (tool) { this.remember(tool, ""); },
    // The tool's own copy: this browser's storage, or (embedded) the page, so Learning's copy never mixes with it.
    store: function (key, v) {
      if (EMBED) { if (v === undefined) return memory[key] || null; memory[key] = v; return null; }
      try { if (v === undefined) return localStorage.getItem(key); localStorage.setItem(key, v); } catch (e) { return null; }
      return null;
    },
    // Each change, embedded: { data, title, summary } for Learning, at most one message every 0.4 seconds.
    changed: function (tool, what) {
      if (!EMBED) return;
      pending = { tool: tool, what: what };
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    },
    // "#s=DATA" or "#s=DATA&doc=ID" for this page's prefix: { data, doc } or null
    readHash: function (prefix) {
      var m = location.hash.match(new RegExp("^#" + prefix + "=([A-Za-z0-9_-]+)(?:&doc=([A-Za-z0-9]{1,40}))?$"));
      return m ? { data: m[1], doc: m[2] || "" } : null;
    },
    go: function (tool, data, title, summary) {
      var payload = JSON.stringify({ v: 1, tool: tool, doc: this.docId(tool), title: String(title || "").slice(0, 100), summary: String(summary || "").slice(0, 200), data: data });
      var bytes = new TextEncoder().encode(payload), bin = "";
      bytes.forEach(function (b) { bin += String.fromCharCode(b); });
      try { if (window.gtag) window.gtag("event", "tool_save", { tool: tool }); } catch (e) { /* no analytics */ }
      location.href = this.url + "#save=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    /* Opened from a link someone shared: say whose copy this is (theirs now) and offer to keep it. */
    noteShared: function (root, saveSel, doc) {
      if (EMBED || doc || !root || root.querySelector(".shared-note")) return;
      var save = root.querySelector(saveSel);
      var box = document.createElement("div");
      box.className = "card tint shared-note";
      box.setAttribute("role", "status");
      box.innerHTML = "<div><b>Someone shared this with you.</b><p class=\"muted\">It's your own copy now: change anything, and their version stays as it is. " +
        "Keep it, and pick it up any time, in a free Product Advisory Learning account.</p></div>";
      if (save) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "btn sm"; b.textContent = "Save my copy";
        b.addEventListener("click", function () { save.click(); });
        box.appendChild(b);
      }
      root.insertBefore(box, root.firstChild);
    }
  };

  function flush() {
    if (!pending) return;
    var p = pending; pending = null;
    var o = p.what() || {};
    tell({ type: "pa-tool-change", tool: p.tool, data: String(o.data || ""), title: String(o.title || "").slice(0, 100), summary: String(o.summary || "").slice(0, 200) });
  }

  if (EMBED) {
    // Links that would leave the tool are opened by Learning (another tool in its workspace, anything else in a
    // new tab), so the frame never turns into the public site.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript|blob):/i.test(href)) return;
      e.preventDefault();
      tell({ type: "pa-open", href: a.href });
    }, true);
    // Learning's light or dark follows into the frame, and it can rename the work.
    window.addEventListener("message", function (e) {
      if (!parentOrigin || e.origin !== parentOrigin || e.source !== window.parent || !e.data) return;
      if (e.data.type === "pa-theme") {
        if (e.data.mode === "dark" || e.data.mode === "light") html.setAttribute("data-theme", e.data.mode); else html.removeAttribute("data-theme");
      }
      if (e.data.type === "pa-title") {
        var input = document.querySelector(".sc-title input");
        var t = String(e.data.title || "").slice(0, 100);
        if (input && t && input.value !== t) { input.value = t; input.dispatchEvent(new Event("input", { bubbles: true })); }
      }
    });
    // The frame is as tall as the tool, so the page scrolls as one.
    var lastH = 0;
    var size = function () {
      // the tool's own height (the page's would never shrink, being at least as tall as the frame)
      var main = document.getElementById("main") || document.body;
      var h = Math.ceil(main.getBoundingClientRect().bottom + window.scrollY + 8);
      if (Math.abs(h - lastH) > 2) { lastH = h; tell({ type: "pa-size", h: h }); }
    };
    window.addEventListener("load", function () {
      size();
      if (window.ResizeObserver) new ResizeObserver(size).observe(document.body);
      setInterval(size, 1000);
      tell({ type: "pa-ready" });
    });
    window.addEventListener("pagehide", flush);
  }
})();
