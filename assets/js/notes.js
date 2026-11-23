/* Highlights, notes and tags on articles and the book (any page with .post-body).

   Select text and a small toolbar offers four highlight colours, Note and Copy. A highlight can carry a note and tags;
   click it to change or delete it. "Notes" (bottom right) lists this page's notes, or all of them, with tag filters
   and a Markdown export.

   Where they're kept: in this browser first (localStorage "pa_notes_v1"), so they work with no account. When the
   reader is signed in to Product Advisory Learning, they also sync to their account: a hidden frame,
   assessment.productadvisory.co/notes-bridge, which shares Learning's sign-in (both are on productadvisory.co),
   merges the two copies (the newer edit of each note wins; deletions are kept as markers so they sync too) and
   sends the result back. Learning's "My notes" page shows them all. Nothing is sent anywhere else.

   A highlight is found again by its words: the quote, a few characters either side, and roughly where it was. If
   the text changes so much that the quote can't be found, the note stays in the list ("text changed") and still
   syncs. */
(function () {
  "use strict";
  var root = document.querySelector(".post-body");
  if (!root || !window.getSelection) return;

  var KEY = "pa_notes_v1";
  var LEARNING = "https://assessment.productadvisory.co";
  var BRIDGE = LEARNING + "/notes-bridge";
  var COLORS = [["y", "Yellow"], ["b", "Blue"], ["g", "Green"], ["p", "Pink"]];
  var PAGE = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  var TITLE = ((document.querySelector("h1") || {}).textContent || document.title).trim().slice(0, 200);
  var KIND = /^\/books\//.test(PAGE) ? "book" : "article";
  var SKIP = "button, .fig-zoom-hint, script, style, .pa-note-ui, sup, .footnote-back";

  /* ---------------------------------------------------------------- storage */
  var store = load();
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || "{}");
      return d && d.notes && typeof d.notes === "object" ? d : { v: 1, notes: {} };
    } catch (e) { return { v: 1, notes: {} }; }
  }
  function save() {
    // deletion markers are kept 90 days (long enough for every device to hear about them)
    var cut = Date.now() - 90 * 864e5;
    Object.keys(store.notes).forEach(function (id) { var n = store.notes[id]; if (n.deleted && n.updated < cut) delete store.notes[id]; });
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage full or off: they last until the tab closes */ }
    try { document.dispatchEvent(new CustomEvent("pa:notes")); } catch (e) { /* old browser */ }
  }
  function live() { return Object.keys(store.notes).map(function (k) { return store.notes[k]; }).filter(function (n) { return !n.deleted; }); }
  function here() { return live().filter(function (n) { return n.url === PAGE; }).sort(function (a, b) { return a.pos - b.pos; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function touch(n) { n.updated = Math.max(Date.now(), (n.updated || 0) + 1); store.notes[n.id] = n; save(); queueSync(); }
  function cleanTags(s) {
    var out = [];
    String(s || "").split(/[,#\n]/).forEach(function (t) {
      t = t.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 30);
      if (t && out.indexOf(t) < 0 && out.length < 10) out.push(t);
    });
    return out;
  }

  /* ---------------------------------------------------------------- the page's text */
  function textNodes() {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentNode.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  function flat() {
    var nodes = textNodes(), text = "", map = [];
    nodes.forEach(function (n) { map.push({ node: n, start: text.length }); text += n.nodeValue; });
    return { text: text, map: map };
  }
  function offsetOf(f, node, off) {
    for (var i = 0; i < f.map.length; i++) if (f.map[i].node === node) return f.map[i].start + off;
    return -1;
  }
  // a selection edge, as a position in the page's text (an edge can sit on an element or a skipped node)
  function boundary(f, container, off) {
    var at = offsetOf(f, container, off);
    if (at > -1) return at;
    var r = document.createRange();
    try { r.setStart(container, off); } catch (e) { return -1; }
    for (var i = 0; i < f.map.length; i++) if (r.comparePoint(f.map[i].node, 0) >= 0) return f.map[i].start;
    return f.text.length;
  }
  function find(f, n) {
    var hits = [], i = f.text.indexOf(n.quote);
    while (i > -1 && hits.length < 50) { hits.push(i); i = f.text.indexOf(n.quote, i + 1); }
    if (!hits.length) return -1;
    var score = function (at) {
      var s = 0, pre = f.text.slice(Math.max(0, at - n.prefix.length), at), suf = f.text.substr(at + n.quote.length, n.suffix.length);
      if (pre === n.prefix) s += 2;
      if (suf === n.suffix) s += 2;
      return s - Math.abs(at - n.pos) / 1e6;
    };
    hits.sort(function (a, b) { return score(b) - score(a); });
    return hits[0];
  }

  /* ---------------------------------------------------------------- drawing highlights */
  function unwrap(id) {
    root.querySelectorAll('mark.pa-hl' + (id ? '[data-note="' + id + '"]' : "")).forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  function wrap(n, f) {
    var at = find(f, n);
    n._lost = at < 0;
    if (at < 0) return false;
    var end = at + n.quote.length, parts = [];
    f.map.forEach(function (m) {
      var s = m.start, e = m.start + m.node.nodeValue.length;
      if (e <= at || s >= end) return;
      parts.push({ node: m.node, from: Math.max(at, s) - s, to: Math.min(end, e) - s });
    });
    parts.forEach(function (p, k) {
      var node = p.node;
      if (!node.nodeValue.slice(p.from, p.to).trim() && parts.length > 1) return;   // the gaps between paragraphs
      if (p.to < node.nodeValue.length) node.splitText(p.to);
      if (p.from > 0) node = node.splitText(p.from);
      var m = document.createElement("mark");
      m.className = "pa-hl pa-hl-" + n.color + (n.note ? " has-note" : "");
      m.setAttribute("data-note", n.id);
      if (k === 0) { m.setAttribute("tabindex", "0"); m.setAttribute("role", "button"); m.setAttribute("aria-label", "Highlight" + (n.note ? " with a note" : "") + ": open to edit"); }
      node.parentNode.insertBefore(m, node);
      m.appendChild(node);
    });
    return true;
  }
  function paint() {
    unwrap();
    here().forEach(function (n) { wrap(n, flat()); });
  }

  /* ---------------------------------------------------------------- small helpers */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;   // only our own markup
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICON = {
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M9 9h6M9 13h4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16l-7-4-7 4z"/></svg>'
  };
  function track(name, extra) {
    try { if (window.gtag) window.gtag("event", name, Object.assign({ kind: KIND }, extra || {})); } catch (e) { /* no analytics */ }
  }
  function place(box, rect, below) {
    var w = box.offsetWidth, h = box.offsetHeight, x = rect.left + rect.width / 2 - w / 2 + scrollX, y;
    x = Math.max(scrollX + 8, Math.min(x, scrollX + document.documentElement.clientWidth - w - 8));
    y = below || rect.top < h + 80 ? rect.bottom + scrollY + 10 : rect.top + scrollY - h - 10;
    box.style.left = x + "px"; box.style.top = y + "px";
  }

  /* ---------------------------------------------------------------- the selection toolbar */
  var bar = el("div", { class: "pa-note-ui pa-selbar", role: "toolbar", "aria-label": "Highlight or note", hidden: true });
  COLORS.forEach(function (c) {
    bar.appendChild(el("button", { type: "button", class: "pa-dot pa-hl-" + c[0], "aria-label": "Highlight " + c[1].toLowerCase(), title: c[1],
      onmousedown: function (e) { e.preventDefault(); }, onclick: function () { create(c[0], false); } }));
  });
  bar.appendChild(el("button", { type: "button", class: "pa-sb-btn", html: ICON.note + "<span>Note</span>",
    onmousedown: function (e) { e.preventDefault(); }, onclick: function () { create("y", true); } }));
  bar.appendChild(el("button", { type: "button", class: "pa-sb-btn", html: ICON.copy + "<span>Copy</span>", "aria-label": "Copy the text",
    onmousedown: function (e) { e.preventDefault(); }, onclick: function () {
      var t = String(getSelection()); hideBar();
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("Copied"); }, function () { /* not allowed */ });
    } }));
  document.body.appendChild(bar);
  var pending = null;   // the selection the toolbar is for, as text positions

  function hideBar() { bar.hidden = true; pending = null; }
  function readSelection() {
    var sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    if (!root.contains(r.commonAncestorContainer)) return null;
    if (r.commonAncestorContainer.nodeType === 1 && r.commonAncestorContainer.closest && r.commonAncestorContainer.closest(SKIP)) return null;
    var f = flat(), s = boundary(f, r.startContainer, r.startOffset), e = boundary(f, r.endContainer, r.endOffset);
    if (s < 0 || e <= s) return null;
    var raw = f.text.slice(s, e), lead = raw.length - raw.replace(/^\s+/, "").length, trail = raw.length - raw.replace(/\s+$/, "").length;
    s += lead; e -= trail;
    if (e - s < 2) return null;
    if (e - s > 3000) e = s + 3000;
    return { s: s, e: e, text: f.text, rect: r.getBoundingClientRect() };
  }
  function onSelect() {
    if (editor.box && !editor.box.hidden) return;
    var p = readSelection();
    if (!p) { if (!bar.hidden) hideBar(); return; }
    pending = p;
    bar.hidden = false;
    // on touch screens the phone's own menu sits above the selection, so ours goes below
    place(bar, p.rect, matchMedia("(pointer: coarse)").matches);
  }
  var selTimer = 0;
  document.addEventListener("selectionchange", function () { clearTimeout(selTimer); selTimer = setTimeout(onSelect, 220); });
  addEventListener("scroll", function () { if (pending && !bar.hidden) { var p = readSelection(); if (p) place(bar, p.rect, matchMedia("(pointer: coarse)").matches); } }, { passive: true });

  function create(color, withNote) {
    if (!pending) return;
    var p = pending, now = Date.now(), n = {
      id: uid(), url: PAGE, title: TITLE, kind: KIND, color: color,
      quote: p.text.slice(p.s, p.e), prefix: p.text.slice(Math.max(0, p.s - 32), p.s), suffix: p.text.slice(p.e, p.e + 32), pos: p.s,
      note: "", tags: [], created: now, updated: now
    };
    hideBar();
    getSelection().removeAllRanges();
    touch(n);
    wrap(n, flat());
    renderPanel();
    track("note_create", { color: color, with_note: withNote ? 1 : 0 });
    if (withNote) openEditor(n.id, true);
    else hint();
  }

  /* ---------------------------------------------------------------- editing a highlight */
  var editor = { box: null, id: null };
  function buildEditor() {
    var box = el("div", { class: "pa-note-ui pa-editor", role: "dialog", "aria-label": "Your note", hidden: true });
    var dots = el("div", { class: "pa-ed-dots", role: "radiogroup", "aria-label": "Colour" });
    COLORS.forEach(function (c) {
      dots.appendChild(el("button", { type: "button", role: "radio", class: "pa-dot pa-hl-" + c[0], "data-c": c[0], "aria-label": c[1], title: c[1],
        onclick: function () { var n = store.notes[editor.id]; if (!n) return; n.color = c[0]; touch(n); refresh(n); syncDots(); } }));
    });
    var ta = el("textarea", { class: "pa-ed-text", rows: "3", maxlength: "2000", placeholder: "Add a note for yourself…", "aria-label": "Note" });
    var tags = el("input", { class: "pa-ed-tags", type: "text", maxlength: "200", placeholder: "Tags, separated by commas", "aria-label": "Tags" });
    var foot = el("div", { class: "pa-ed-foot" }, [
      el("button", { type: "button", class: "pa-ed-del", text: "Delete", onclick: function () { remove(editor.id); closeEditor(); } }),
      el("button", { type: "button", class: "btn sm", text: "Done", onclick: function () { closeEditor(); } })
    ]);
    var commit = function () {
      var n = store.notes[editor.id]; if (!n) return;
      var note = ta.value.slice(0, 2000), tg = cleanTags(tags.value);
      if (note === n.note && tg.join(",") === (n.tags || []).join(",")) return;
      n.note = note; n.tags = tg; touch(n); refresh(n); renderPanel();
    };
    ta.addEventListener("input", debounce(commit, 500));
    tags.addEventListener("change", commit);
    ta.addEventListener("blur", commit);
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); closeEditor(); } });
    box.appendChild(dots); box.appendChild(ta); box.appendChild(tags); box.appendChild(foot);
    document.body.appendChild(box);
    editor.box = box; editor.ta = ta; editor.tags = tags; editor.commit = commit; editor.dots = dots;
  }
  function syncDots() {
    var n = store.notes[editor.id];
    editor.dots.querySelectorAll("[data-c]").forEach(function (d) { d.setAttribute("aria-checked", n && n.color === d.getAttribute("data-c") ? "true" : "false"); });
  }
  function openEditor(id, focusNote) {
    if (!editor.box) buildEditor();
    var n = store.notes[id], m = root.querySelector('mark.pa-hl[data-note="' + id + '"]');
    if (!n || !m) return;
    hideBar();
    editor.id = id; editor.opener = m;
    editor.ta.value = n.note || "";
    editor.tags.value = (n.tags || []).join(", ");
    syncDots();
    editor.box.hidden = false;
    place(editor.box, m.getBoundingClientRect(), true);
    if (focusNote !== false) editor.ta.focus({ preventScroll: true });
  }
  function closeEditor() {
    if (!editor.box || editor.box.hidden) return;
    editor.commit();
    editor.box.hidden = true;
    var m = editor.id && root.querySelector('mark.pa-hl[data-note="' + editor.id + '"]');
    editor.id = null;
    if (m) m.focus({ preventScroll: true });
  }
  document.addEventListener("mousedown", function (e) {
    if (editor.box && !editor.box.hidden && !editor.box.contains(e.target) && !e.target.closest('mark.pa-hl')) closeEditor();
  });
  root.addEventListener("click", function (e) {
    var m = e.target.closest("mark.pa-hl");
    if (!m || !getSelection().isCollapsed) return;
    e.preventDefault();
    openEditor(m.getAttribute("data-note"));
  });
  root.addEventListener("keydown", function (e) {
    var m = e.target.closest && e.target.closest("mark.pa-hl");
    if (m && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openEditor(m.getAttribute("data-note")); }
  });
  function refresh(n) { unwrap(n.id); wrap(n, flat()); }
  function remove(id) {
    var n = store.notes[id]; if (!n) return;
    var keep = { id: id, url: n.url, deleted: true, created: n.created, updated: n.updated };
    unwrap(id);
    touch(keep);
    renderPanel();
    track("note_delete");
    toast("Highlight deleted", "Undo", function () { var back = Object.assign({}, n); delete back.deleted; touch(back); refresh(back); renderPanel(); });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---------------------------------------------------------------- toast */
  var toastBox = null, toastTimer = 0;
  function toast(msg, action, fn) {
    if (!toastBox) { toastBox = el("div", { class: "pa-note-ui pa-note-toast", role: "status" }); document.body.appendChild(toastBox); }
    toastBox.innerHTML = "";
    toastBox.appendChild(el("span", { text: msg }));
    if (action) toastBox.appendChild(el("button", { type: "button", text: action, onclick: function () { toastBox.classList.remove("on"); fn(); } }));
    toastBox.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove("on"); }, action ? 6000 : 2200);
  }
  // the first highlight ever: say where it went
  function hint() {
    try { if (localStorage.getItem("pa_notes_hint")) return; localStorage.setItem("pa_notes_hint", "1"); } catch (e) { return; }
    toast("Saved. Find your highlights under Notes, bottom right.");
  }

  /* ---------------------------------------------------------------- the Notes panel
     Notes lives on the left (Compass, the assistant, has the bottom right): in the page's left column on wide
     screens, where it stays in view as you read, and as a small button bottom left otherwise. The list opens on the
     left. */
  var fab = el("button", { type: "button", class: "pa-note-ui pa-notes-fab", "aria-expanded": "false", "aria-controls": "pa-notes-panel", "aria-label": "My notes", "data-tip": "My notes", html: ICON.list + '<b class="pa-fab-n"></b>' });
  var panel = el("aside", { class: "pa-note-ui pa-notes-panel", id: "pa-notes-panel", "aria-label": "Your highlights and notes", hidden: true });
  document.body.appendChild(fab);
  document.body.appendChild(panel);
  var railBtn = null, opener = fab, rail = document.querySelector(".post-rail-in");
  if (rail) {
    railBtn = el("button", { type: "button", class: "pa-note-ui pa-notes-rail", "aria-expanded": "false", "aria-controls": "pa-notes-panel",
      html: ICON.list + '<span>My notes</span><b class="pa-fab-n"></b>' });
    // after the page's own content and its "How this page works" button (so it moves up once that's dismissed);
    // on the book, before the long list of chapters
    var chapters = rail.querySelector(".book-toc-w");
    if (chapters) rail.insertBefore(railBtn, chapters); else rail.appendChild(railBtn);
    document.documentElement.classList.add("notes-railed");
    railBtn.addEventListener("click", function () { panel.hidden ? openPanel(railBtn) : closePanel(); });
  }
  var view = { scope: "page", tag: "" };
  fab.addEventListener("click", function () { panel.hidden ? openPanel(fab) : closePanel(); });
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
  function setOpen(on) { [fab, railBtn].forEach(function (b) { if (b) b.setAttribute("aria-expanded", on ? "true" : "false"); }); }
  function openPanel(from) {
    opener = from || fab;
    panel.classList.toggle("from-rail", opener === railBtn);
    panel.hidden = false; setOpen(true);
    renderPanel(); bridge(); sync();
    var h = panel.querySelector("h2"); if (h) h.focus();
    track("notes_open", { from: opener === railBtn ? "rail" : "button" });
  }
  function closePanel() { panel.hidden = true; setOpen(false); (opener && opener.offsetParent ? opener : fab).focus(); }

  function renderPanel() {
    var mine = here().length;
    [fab, railBtn].forEach(function (b) {
      if (!b) return;
      b.querySelector(".pa-fab-n").textContent = mine ? String(mine) : "";
      b.classList.toggle("has", mine > 0);
    });
    if (panel.hidden) return;
    var all = live(), list = view.scope === "page" ? here() : all.slice().sort(function (a, b) { return b.updated - a.updated; });
    var tags = {};
    list.forEach(function (n) { (n.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
    if (view.tag && !tags[view.tag]) view.tag = "";
    if (view.tag) list = list.filter(function (n) { return (n.tags || []).indexOf(view.tag) > -1; });
    panel.innerHTML = "";
    panel.appendChild(el("div", { class: "pa-np-head" }, [
      el("h2", { tabindex: "-1", text: "Your notes" }),
      el("button", { type: "button", class: "pa-np-x", "aria-label": "Close", html: "&times;", onclick: closePanel })
    ]));
    var tabs = el("div", { class: "pa-np-tabs", role: "group", "aria-label": "Show" });
    [["page", "This page (" + here().length + ")"], ["all", "All (" + all.length + ")"]].forEach(function (t) {
      tabs.appendChild(el("button", { type: "button", "aria-pressed": view.scope === t[0] ? "true" : "false", text: t[1],
        onclick: function () { view.scope = t[0]; renderPanel(); } }));
    });
    panel.appendChild(tabs);
    var tagNames = Object.keys(tags).sort();
    if (tagNames.length) {
      var chips = el("div", { class: "pa-np-chips", role: "group", "aria-label": "Filter by tag" });
      tagNames.forEach(function (t) {
        chips.appendChild(el("button", { type: "button", "aria-pressed": view.tag === t ? "true" : "false", text: "#" + t + " " + tags[t],
          onclick: function () { view.tag = view.tag === t ? "" : t; renderPanel(); } }));
      });
      panel.appendChild(chips);
    }
    var ol = el("ol", { class: "pa-np-list" });
    if (!list.length) {
      panel.appendChild(el("p", { class: "pa-np-empty", text: view.scope === "page"
        ? "Select any text on this page to highlight it, add a note or tag it."
        : "Nothing saved yet. Select text in any article or chapter to start." }));
    }
    list.forEach(function (n) {
      var onPage = n.url === PAGE;
      var go = el("a", { class: "pa-np-item pa-hl-" + n.color, href: n.url + "#pa-note=" + n.id }, [
        !onPage || view.scope === "all" ? el("small", { class: "pa-np-where", text: n.title || n.url }) : null,
        el("q", { text: n.quote.length > 220 ? n.quote.slice(0, 220) + "…" : n.quote }),
        n.note ? el("p", { class: "pa-np-note", text: n.note }) : null,
        (n.tags || []).length ? el("span", { class: "pa-np-tags", text: n.tags.map(function (t) { return "#" + t; }).join(" ") }) : null,
        onPage && n._lost ? el("small", { class: "pa-np-lost", text: "This passage has changed since you saved it." }) : null
      ]);
      if (onPage) go.addEventListener("click", function (e) { e.preventDefault(); jump(n.id, true); });
      ol.appendChild(el("li", {}, [go]));
    });
    panel.appendChild(ol);
    var foot = el("div", { class: "pa-np-foot" });
    foot.appendChild(el("button", { type: "button", class: "btn sm ghost", text: "Export", title: "Download as a Markdown file",
      disabled: all.length ? null : true, onclick: exportMd }));
    foot.appendChild(syncLine());
    panel.appendChild(foot);
  }
  function jump(id, edit) {
    var m = root.querySelector('mark.pa-hl[data-note="' + id + '"]');
    if (!m) return false;
    if (matchMedia("(max-width: 760px)").matches) { panel.hidden = true; setOpen(false); }
    m.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    root.querySelectorAll('mark.pa-hl[data-note="' + id + '"]').forEach(function (x) { x.classList.remove("flash"); void x.offsetWidth; x.classList.add("flash"); });
    if (edit) setTimeout(function () { openEditor(id, false); }, 450);
    return true;
  }
  function exportMd() {
    var by = {};
    live().forEach(function (n) { (by[n.url] = by[n.url] || { title: n.title, notes: [] }).notes.push(n); });
    var out = ["# My notes from Product Advisory", "", "Exported " + new Date().toLocaleDateString(), ""];
    Object.keys(by).forEach(function (u) {
      out.push("## " + (by[u].title || u), "", "https://www.productadvisory.co" + u, "");
      by[u].notes.sort(function (a, b) { return a.pos - b.pos; }).forEach(function (n) {
        out.push("> " + n.quote.replace(/\n+/g, " "), "");
        if (n.note) out.push(n.note, "");
        if ((n.tags || []).length) out.push(n.tags.map(function (t) { return "#" + t.replace(/\s+/g, "-"); }).join(" "), "");
      });
    });
    var a = el("a", { href: URL.createObjectURL(new Blob([out.join("\n")], { type: "text/markdown" })), download: "my-product-advisory-notes.md" });
    document.body.appendChild(a); a.click(); a.remove();
    track("notes_export");
  }

  /* ---------------------------------------------------------------- syncing with Learning */
  var frame = null, ready = false, acct = null, syncing = false, again = false, lastErr = "";
  function bridge() {
    if (frame) return;
    frame = el("iframe", { src: BRIDGE, title: "Product Advisory Learning: notes sync", "aria-hidden": "true", tabindex: "-1", class: "pa-note-bridge" });
    document.body.appendChild(frame);
    frame.addEventListener("load", function () { ready = true; sync(); });
  }
  addEventListener("message", function (e) {
    if (e.origin !== LEARNING || !frame || e.source !== frame.contentWindow) return;
    var d = e.data || {};
    if (d.pa !== "notes") return;
    if (d.type === "ready") { ready = true; sync(); return; }
    if (d.type === "state") {
      syncing = false;
      acct = d.signedIn && !d.error ? { name: String(d.name || "") } : null;
      lastErr = d.error ? String(d.error) : "";
      if (d.signedIn && Array.isArray(d.notes)) merge(d.notes);
      renderPanel();
      if (again) { again = false; sync(); }
    }
  });
  function sync() {
    if (!frame || !ready) return;
    if (syncing) { again = true; return; }
    syncing = true;
    var all = Object.keys(store.notes).map(function (k) { var n = Object.assign({}, store.notes[k]); delete n._lost; return n; });
    frame.contentWindow.postMessage({ pa: "notes", type: "sync", notes: all }, LEARNING);
  }
  var queueSync = debounce(function () { if (!frame) bridge(); else sync(); }, 1500);
  // what Learning sent back is the merged set: take each note that's newer than ours
  function merge(list) {
    var changed = false;
    list.forEach(function (r) {
      if (!r || typeof r.id !== "string" || !/^[a-z0-9]{6,24}$/.test(r.id)) return;
      if (r.kind !== "article" && r.kind !== "book") return;   // lesson and toolkit notes live in Learning (My notes)
      var mine = store.notes[r.id];
      if (!mine || (r.updated || 0) > (mine.updated || 0)) { store.notes[r.id] = r; changed = true; }
    });
    if (changed) { save(); paint(); }
  }
  function syncLine() {
    var p = el("p", { class: "pa-np-sync" });
    if (acct) {
      p.appendChild(el("span", { class: "pa-sync-dot on", "aria-hidden": "true" }));
      p.appendChild(document.createTextNode("Synced to your Learning account. "));
      p.appendChild(el("a", { href: LEARNING + "/my-notes", target: "_blank", rel: "noopener", text: "My notes" }));
    } else {
      p.appendChild(el("span", { class: "pa-sync-dot", "aria-hidden": "true" }));
      p.appendChild(document.createTextNode(lastErr ? "Couldn't reach your Learning account just now; your notes are safe in this browser. " :
        "Saved in this browser. To keep them on every device, "));
      if (!lastErr) p.appendChild(el("a", { href: LEARNING + "/lms-dashboard", target: "_blank", rel: "noopener", text: "sign in to Learning",
        onclick: function () { track("notes_signin"); } }));
      p.appendChild(document.createTextNode(lastErr ? "" : " (free)."));
    }
    return p;
  }
  // back from signing in, in another tab: check again
  addEventListener("focus", function () { if (frame) sync(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && frame) sync(); });
  // another tab of this site changed the notes
  addEventListener("storage", function (e) { if (e.key === KEY) { store = load(); paint(); renderPanel(); } });

  /* ---------------------------------------------------------------- for the audio player
     "Save this moment" (site.js, initListen): the sentence being read becomes a highlight with a note, and the note
     opens so the listener can add a thought. Returns true when it was saved. */
  window.PANotes = {
    saveRange: function (r, note) {
      if (!r || !root.contains(r.commonAncestorContainer)) return false;
      var f = flat(), s = boundary(f, r.startContainer, r.startOffset), e = boundary(f, r.endContainer, r.endOffset);
      if (s < 0 || e <= s) return false;
      var now = Date.now(), n = {
        id: uid(), url: PAGE, title: TITLE, kind: KIND, color: "b",
        quote: f.text.slice(s, Math.min(e, s + 3000)), prefix: f.text.slice(Math.max(0, s - 32), s), suffix: f.text.slice(e, e + 32), pos: s,
        note: String(note || "").slice(0, 2000), tags: ["listening"], created: now, updated: now
      };
      touch(n);
      wrap(n, flat());
      renderPanel();
      toast("Saved to your notes", "Add a thought", function () { openEditor(n.id, true); });
      track("note_create", { color: "b", with_note: 1, from: "audio" });
      return true;
    }
  };
  try { document.dispatchEvent(new CustomEvent("pa:notes-ready")); } catch (e) { /* old browser */ }

  /* ---------------------------------------------------------------- start */
  paint();
  renderPanel();
  if (Object.keys(store.notes).length) setTimeout(bridge, 2500);   // only readers who use notes load the sync frame
  var m = /#pa-note=([a-z0-9]{6,24})$/.exec(location.hash);
  if (m) setTimeout(function () { if (jump(m[1], false)) history.replaceState(null, "", location.pathname + location.search); }, 300);
})();
