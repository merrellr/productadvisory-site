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
  // CompassIcon: the same drawing as Learning's CompassCore.ICON (compass-core.js); keep the two identical.
  var ICON = '<svg class="pa-cicon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16.95 7.05 12.9 11.1M7.05 16.95l4.05-4.05M16.95 16.95 12.9 12.9M7.05 7.05l4.05 4.05" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".55"/><path d="M12 3.4 13.4 10.6 20.6 12 13.4 13.4 12 20.6 10.6 13.4 3.4 12 10.6 10.6Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M17.4 6.6 12.95 12.95 11.05 11.05Z" fill="#2563EB" stroke="#2563EB" stroke-width=".9" stroke-linejoin="round"/><path d="M6.6 17.4 11.05 11.05 12.95 12.95Z" fill="none" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" opacity=".75"/><circle cx="12" cy="12" r="1.05" fill="currentColor"/></svg>';

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
      css.rel = "stylesheet"; css.href = LEARNING + "/compass.css?v=20261123a";
      document.head.appendChild(css);
      var add = function (src, next) {
        var s = document.createElement("script");
        s.src = LEARNING + "/" + src + "?v=20261123a"; s.onload = next;
        s.onerror = function () { loading = null; reject(new Error(src)); };
        document.head.appendChild(s);
      };
      add("compass-core.js", function () { add("compass-ui.js", resolve); });
    });
    return loading;
  }
  function open() {
    load().then(function () { if (window.PACompass) window.PACompass.toggle(); bridge(); })
      .catch(function () { fab.setAttribute("data-tip", "Compass is offline"); fab.setAttribute("aria-label", "Compass is offline"); });
  }

  /* ---------------------------------------------------------------- the button */
  var fab = document.createElement("button");
  fab.type = "button"; fab.id = "paCompassFab"; fab.className = "pa-compass-fab";
  fab.setAttribute("data-pa", "compass"); fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "paCompass");
  fab.setAttribute("aria-label", "Ask Compass"); fab.setAttribute("data-tip", "Ask Compass");   // icon only, with a tooltip
  fab.innerHTML = ICON;
  fab.addEventListener("click", function () {
    open();
    try { if (window.gtag) window.gtag("event", "compass_open_www", { kind: window.PACompassPage().k }); } catch (e) { /* no analytics */ }
  });
  document.body.appendChild(fab);
  document.documentElement.classList.add("has-compass");

  // left open on the last page (this tab): open it again
  try { var st = JSON.parse(sessionStorage.getItem("pa_compass_v1") || "null"); if (st && st.open) load().then(bridge).catch(function () {}); } catch (e) { /* storage off */ }
})();
