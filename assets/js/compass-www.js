/* Compass, the assistant from Product Advisory Learning, on the articles and the book (any page with .post-body).

   The button sits bottom right (Notes, assets/js/notes.js, sits above it). The panel itself is Learning's own
   (compass-ui.js, compass-core.js and compass.css, loaded from assessment.productadvisory.co the first time it opens),
   so it is the same assistant everywhere. This page tells it what it can see (the article or chapter it's on) and
   how to ask: through Learning's notes-bridge page in a hidden frame, which shares the reader's Learning sign-in,
   adds matching lessons, and asks Learning's server. Readers who aren't signed in to Learning are invited to.
   Nothing is sent until the reader asks a question. */
(function () {
  "use strict";
  var body = document.querySelector(".post-body");
  if (!body || window.PACompassWww) return;
  window.PACompassWww = true;
  var LEARNING = "https://assessment.productadvisory.co";
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>';

  /* ---------------------------------------------------------------- what Compass can see here */
  window.PACompassPage = function () {
    var h1 = document.querySelector("h1");
    var text = body.innerText || body.textContent || "";
    return { k: /^\/books\//.test(location.pathname) ? "book" : "article", t: ((h1 && h1.textContent) || document.title).trim(), x: text };
  };

  /* ---------------------------------------------------------------- how to ask: through Learning's bridge */
  var frame = null, frameReady = null, waiting = {}, seq = 0;
  function bridge() {
    if (frameReady) return frameReady;
    frameReady = new Promise(function (resolve) {
      frame = document.createElement("iframe");
      frame.src = LEARNING + "/notes-bridge";
      frame.title = "Product Advisory Learning: Compass";
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.className = "pa-note-bridge";
      frame.addEventListener("load", function () { resolve(frame); });
      document.body.appendChild(frame);
    });
    return frameReady;
  }
  addEventListener("message", function (e) {
    if (e.origin !== LEARNING || !frame || e.source !== frame.contentWindow) return;
    var d = e.data || {};
    if (d.pa !== "notes" || d.type !== "compass-answer" || !waiting[d.id]) return;
    waiting[d.id](d);
    delete waiting[d.id];
  });
  window.PACompassTransport = function (q, hist, page) {
    return bridge().then(function (f) {
      return new Promise(function (resolve) {
        var id = "c" + Date.now().toString(36) + (++seq);
        var timer = setTimeout(function () { delete waiting[id]; resolve({ r: null, passages: [] }); }, 50000);   // an answer can take a while
        waiting[id] = function (d) { clearTimeout(timer); resolve({ r: d.r, passages: d.passages || [] }); };
        f.contentWindow.postMessage({ pa: "notes", type: "compass-ask", id: id, q: q, h: JSON.stringify(hist || []), page: page ? JSON.stringify(page) : "" }, LEARNING);
      });
    });
  };

  /* ---------------------------------------------------------------- loading the panel from Learning */
  var loading = null;
  function load() {
    if (window.PACompass) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet"; css.href = LEARNING + "/compass.css";
      document.head.appendChild(css);
      var add = function (src, next) {
        var s = document.createElement("script");
        s.src = LEARNING + "/" + src; s.onload = next;
        s.onerror = function () { loading = null; reject(new Error(src)); };
        document.head.appendChild(s);
      };
      add("compass-core.js", function () { add("compass-ui.js", resolve); });
    });
    return loading;
  }
  function open() {
    load().then(function () { if (window.PACompass) window.PACompass.toggle(); bridge(); })
      .catch(function () { fab.querySelector("span").textContent = "Compass is offline"; });
  }

  /* ---------------------------------------------------------------- the button */
  var fab = document.createElement("button");
  fab.type = "button"; fab.id = "paCompassFab"; fab.className = "pa-compass-fab";
  fab.setAttribute("data-pa", "compass"); fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "paCompass");
  fab.setAttribute("aria-label", "Compass: ask about this page"); fab.title = "Compass: ask about this page";
  fab.innerHTML = ICON + "<span>Compass</span>";
  fab.addEventListener("click", function () {
    open();
    try { if (window.gtag) window.gtag("event", "compass_open_www", { kind: window.PACompassPage().k }); } catch (e) { /* no analytics */ }
  });
  document.body.appendChild(fab);
  document.documentElement.classList.add("has-compass");

  // left open on the last page (this tab): open it again
  try { var st = JSON.parse(sessionStorage.getItem("pa_compass_v1") || "null"); if (st && st.open) load().then(bridge).catch(function () {}); } catch (e) { /* storage off */ }
})();
