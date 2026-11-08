/* AI Readiness Checklist (/ai-readiness): the page. The scoring lives in ai-readiness-core.js.
   Six areas of four statements, each answered Yes, Partly, No or Not sure; the score, the stage on the adoption
   journey, the areas and the next moves update as you go. The answers are saved in this browser; "Share a link"
   puts a copy of them in the link's #. */
(function () {
  "use strict";
  var R = window.AIReadinessCore, root = document.getElementById("readiness");
  if (!R || !root) return;
  var KEY = "pa_ai_readiness";
  var $ = function (sel) { return root.querySelector(sel); };
  var state;

  // In this browser; inside Product Advisory Learning (embedded), kept in the page and handed to Learning instead (save.js).
  function store(v) { return window.PASave ? PASave.store(KEY, v) : null; }
  function save() {
    store(JSON.stringify(state));
    if (window.PASave) PASave.changed("ready", function () { return { data: R.encode(state), title: state.title, summary: summary() }; });
  }
  // A line about the results, shown with the saved copy in Learning.
  function summary() { var r = R.results(state); return r.answered ? r.score + "% ready: " + r.level.name + " (" + r.answered + " of " + r.total + " answered)" : "Not started"; }
  function track(name) { try { if (window.gtag) window.gtag("event", name, { tool: "ai_readiness" }); } catch (e) { /* no analytics */ } }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* ----- load: a shared link, else what was saved here, else blank (the example is a click away) ----- */
  function load() {
    var h = window.PASave ? PASave.readHash("r") : null, shared = h ? R.decode(h.data) : null;
    var saved = null;
    try { saved = store() ? R.normalize(JSON.parse(store())) : null; } catch (e) { saved = null; }
    if (shared) {
      history.replaceState(null, "", location.pathname);
      if (!saved || !Object.keys(saved.answers).length || window.confirm("Open the shared checklist? It replaces the answers saved in this browser.")) {
        state = shared; save(); if (window.PASave) { PASave.remember("ready", h.doc); PASave.noteShared(root, '[data-rd="save"]', h.doc); } track("ai_readiness_open_shared"); return;
      }
    }
    state = saved || (window.PASave && PASave.embedded && PASave.start === "example" ? R.fromExample() : R.blank());
  }

  /* ----- step 1: the checklist ----- */
  function paintChecklist() {
    var box = $("#rd-areas");
    box.textContent = "";
    R.AREAS.forEach(function (a, ai) {
      var card = el("fieldset", { "class": "rd-area", "data-area": a.key });
      var lg = el("legend", {});
      lg.append(el("span", { "class": "rd-area-n" }, String(ai + 1)), document.createTextNode(a.name), el("span", { "class": "rd-area-score", id: "rd-as-" + a.key }));
      card.appendChild(lg);
      R.ITEMS.filter(function (it) { return it.area === a.key; }).forEach(function (it) {
        var row = el("div", { "class": "rd-item", role: "radiogroup", "aria-label": it.text });
        row.appendChild(el("p", { "class": "rd-text" }, it.text));
        var opts = el("div", { "class": "rd-opts" });
        Object.keys(R.ANSWERS).forEach(function (k) {
          var on = state.answers[it.id] === k;
          var b = el("button", { type: "button", "class": "rd-opt rd-" + k + (on ? " is-on" : ""), role: "radio", "aria-checked": on ? "true" : "false", "data-id": it.id, "data-v": k }, R.ANSWERS[k].name);
          opts.appendChild(b);
        });
        row.appendChild(opts);
        card.appendChild(row);
      });
      box.appendChild(card);
    });
  }
  function paintPicks() {
    root.querySelectorAll(".rd-opt").forEach(function (b) {
      var on = state.answers[b.getAttribute("data-id")] === b.getAttribute("data-v");
      b.classList.toggle("is-on", on); b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  /* ----- steps 2 and 3: the results ----- */
  function paintResults() {
    var r = R.results(state);
    $("#rd-progress").textContent = r.answered + " of " + r.total + " answered";
    $("#rd-bar i").style.width = Math.round(r.answered / r.total * 100) + "%";
    r.areas.forEach(function (a) { var s = $("#rd-as-" + a.key); if (s) s.textContent = a.answered ? a.score + "%" : ""; });

    var top = $("#rd-level");
    top.textContent = "";
    top.appendChild(el("span", { "class": "uc-pilot-label" }, "Where you are"));
    if (!r.answered) {
      top.appendChild(el("h3", {}, "Answer a few statements to see your score"));
      top.appendChild(el("p", { "class": "muted" }, "Or fill in an example to see how it works."));
    } else {
      var head = el("div", { "class": "rd-score" });
      head.append(el("b", {}, r.score + "%"), el("span", {}, "ready"));
      top.appendChild(head);
      top.appendChild(el("h3", {}, r.level.name));
      top.appendChild(el("p", {}, r.level.text));
      top.appendChild(el("p", { "class": "rd-step" }, r.level.step));
      if (!r.complete) top.appendChild(el("p", { "class": "muted" }, "Based on " + r.answered + " of " + r.total + " statements. Answer the rest for a full picture."));
    }
    // the journey, with this stage lit
    var j = $("#rd-journey");
    j.textContent = "";
    R.LEVELS.forEach(function (l) {
      var li = el("li", { "class": "rd-j-" + l.key + (r.answered && r.level.key === l.key ? " is-here" : "") });
      li.append(el("b", {}, l.name), el("small", {}, l.min + (l.min === 75 ? "-100" : "-" + (l.min + 24))));
      j.appendChild(li);
    });

    var bars = $("#rd-bars");
    bars.textContent = "";
    r.areas.forEach(function (a) {
      var li = el("li", { "class": (r.answered && a.key === r.weakest ? "is-weak" : r.answered && a.key === r.strongest ? "is-strong" : "") });
      var bar = el("span", { "class": "rd-bar-track" }), fill = el("i");
      fill.style.width = a.score + "%"; bar.appendChild(fill);
      li.append(el("b", {}, a.name), bar, el("em", {}, a.answered ? a.score + "%" : "–"));
      bars.appendChild(li);
    });

    var moves = $("#rd-moves");
    moves.textContent = "";
    if (!r.moves.length) {
      moves.appendChild(el("li", { "class": "muted sc-none" }, r.answered ? "No gaps marked No or Not sure. Look at the Partly answers next, then re-run this in a quarter." : "Your next moves appear here as you answer."));
    } else {
      r.moves.forEach(function (m, i) {
        var li = el("li", {});
        li.append(el("span", { "class": "sc-rank" }, String(i + 1)));
        var main = el("div", { "class": "sc-res-main" });
        main.append(el("small", { "class": "rd-move-area" }, m.area), el("b", {}, m.fix), el("p", { "class": "muted" }, (state.answers[m.id] === "u" ? "You weren't sure: " : "You said no: ") + m.text));
        li.appendChild(main);
        moves.appendChild(li);
      });
    }
    var unk = $("#rd-unknown");
    unk.hidden = !r.unknown.length;
    var ul = $("#rd-unknown ul");
    ul.textContent = "";
    r.unknown.forEach(function (u) { ul.appendChild(el("li", {}, u.text + " (" + u.area + ")")); });
  }

  function paintAll() { $("#rd-title").value = state.title; paintChecklist(); paintResults(); }
  function changed() { paintPicks(); paintResults(); save(); }

  /* ----- edits ----- */
  root.addEventListener("input", function (e) { if (e.target.id === "rd-title") { state.title = e.target.value; save(); } });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.classList.contains("rd-opt")) {
      var id = b.getAttribute("data-id"), v = b.getAttribute("data-v");
      if (state.answers[id] === v) delete state.answers[id]; else state.answers[id] = v;   // a second click clears it
      changed(); return;
    }
    var act = b.getAttribute("data-rd");
    if (act === "example") {
      if (Object.keys(state.answers).length && !window.confirm("Replace your answers with the example?")) return;
      if (window.PASave) PASave.forget("ready");
      var ex = R.fromExample(); ex.title = state.title; state = ex; paintAll(); save(); track("ai_readiness_example"); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over? This clears the answers saved in this browser.")) return;
      if (window.PASave) PASave.forget("ready");
      state = R.blank(); paintAll(); save(); $("#rd-title").focus(); return;
    }
    if (act === "save") { if (window.PASave) PASave.go("ready", R.encode(state), state.title, summary()); return; }
    if (act === "share") {
      var url = location.origin + location.pathname + "#r=" + R.encode(state), box = $("#rd-share"), input = $("#rd-share-url");
      input.value = url; box.hidden = false; input.select();
      var done = function (ok) { $("#rd-share-status").textContent = ok ? "Link copied. Paste it anywhere to share a copy." : "Copy the link above to share a copy."; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      track("ai_readiness_share"); return;
    }
    if (act === "csv") {
      var blob = new Blob(["﻿" + R.toCSV(state)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: (state.title || "ai-readiness").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".csv" });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      track("ai_readiness_csv"); return;
    }
    if (act === "print") { track("ai_readiness_print"); window.print(); }
  });

  load();
  paintAll();
})();
