/* Feature Prioritization Scorecard (/scorecard): the page. The scoring lives in scorecard-core.js.
   The scorecard is saved in this browser as you go; "Share a link" puts a copy of it in the link's #. */
(function () {
  "use strict";
  var S = window.ScorecardCore, root = document.getElementById("scorecard");
  if (!S || !root) return;
  var KEY = "pa_scorecard";
  var $ = function (sel) { return root.querySelector(sel); };
  var state;

  function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { return null; } }
  function save() { store(JSON.stringify(state)); }
  function track(name) { try { if (window.gtag) window.gtag("event", name, { tool: "feature_scorecard" }); } catch (e) { /* no analytics */ } }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* ----- load: a shared link, else what was saved here, else the balanced template with an example ----- */
  function load() {
    var m = location.hash.match(/^#s=([A-Za-z0-9_-]+)$/), shared = m ? S.decode(m[1]) : null;
    var saved = null;
    try { saved = store() ? S.normalize(JSON.parse(store())) : null; } catch (e) { saved = null; }
    if (shared) {
      history.replaceState(null, "", location.pathname);
      if (!saved || !saved.features.some(function (f) { return f.name; }) || window.confirm("Open the shared scorecard? It replaces the one saved in this browser.")) {
        state = shared; save(); track("scorecard_open_shared"); return;
      }
    }
    state = saved || S.fromTemplate("balanced", true);
  }

  /* ----- step 1: criteria ----- */
  function paintTemplates() {
    root.querySelectorAll("[data-template]").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-template") === state.template ? "true" : "false"); });
  }
  function paintCriteria() {
    var box = $("#sc-criteria");
    box.textContent = "";
    state.criteria.forEach(function (c, i) {
      var row = el("div", { "class": "sc-crit" });
      var name = el("input", { "class": "sc-crit-name", maxlength: "80", "aria-label": "Criterion " + (i + 1) + " name", "data-i": i });
      name.value = c.name;
      var wWrap = el("label", { "class": "sc-weight" });
      wWrap.appendChild(el("span", { "class": "sr-only" }, "Weight for " + c.name));
      var w = el("input", { type: "range", min: "0", max: "5", step: "1", "data-i": i, "aria-valuetext": "Weight " + c.weight + " of 5" });
      w.value = c.weight;
      var out = el("output", {}, String(c.weight));
      wWrap.append(el("small", { "aria-hidden": "true" }, "Weight"), w, out);
      var dir = el("button", { type: "button", "class": "sc-dir" + (c.cost ? " is-cost" : ""), "data-i": i, "aria-pressed": c.cost ? "true" : "false",
        title: "Switch between higher is better and lower is better" }, c.cost ? "Lower is better" : "Higher is better");
      var rm = el("button", { type: "button", "class": "sc-x", "data-rm-crit": i, "aria-label": "Remove " + c.name }, "×");
      if (state.criteria.length <= 1) rm.disabled = true;
      row.append(name, wWrap, dir, rm);
      box.appendChild(row);
    });
    root.querySelector('[data-sc="add-criterion"]').disabled = state.criteria.length >= S.MAX_CRITERIA;
    paintTemplates();
  }

  /* ----- step 2: the features table ----- */
  function paintTable() {
    var t = $("#sc-table");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    hr.appendChild(el("th", { scope: "col" }, "Feature"));
    state.criteria.forEach(function (c, j) {
      var th = el("th", { scope: "col", "data-col": j });
      th.appendChild(el("span", { "class": "sc-th-name" }, c.name));
      if (c.cost) th.appendChild(el("small", { "class": "sc-th-cost" }, "lower is better"));
      if (!c.weight) th.appendChild(el("small", { "class": "sc-th-off" }, "weight 0"));
      hr.appendChild(th);
    });
    hr.appendChild(el("th", { scope: "col" }, ""));
    head.appendChild(hr);
    var body = el("tbody");
    state.features.forEach(function (f, i) {
      var tr = el("tr");
      var th = el("th", { scope: "row" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "80", placeholder: "Feature name", "data-f": i, "aria-label": "Feature " + (i + 1) + " name" });
      name.value = f.name;
      th.appendChild(name); tr.appendChild(th);
      state.criteria.forEach(function (c, j) {
        var td = el("td");
        var sel = el("select", { "data-f": i, "data-c": j, "aria-label": (f.name || "Feature " + (i + 1)) + ": " + c.name });
        for (var v = 1; v <= 5; v++) { var o = el("option", { value: v }, String(v)); if (f.scores[j] === v) o.selected = true; sel.appendChild(o); }
        td.appendChild(sel); tr.appendChild(td);
      });
      var td = el("td");
      td.appendChild(el("button", { type: "button", "class": "sc-x", "data-rm-feat": i, "aria-label": "Remove " + (f.name || "feature " + (i + 1)) }, "×"));
      tr.appendChild(td);
      body.appendChild(tr);
    });
    t.append(head, body);
    if (!state.features.length) {
      var empty = el("tr"); var td2 = el("td", { colspan: state.criteria.length + 2, "class": "muted sc-empty" }, "No features yet. Add one, or fill in an example to see how it works.");
      empty.appendChild(td2); body.appendChild(empty);
    }
    root.querySelector('[data-sc="add-feature"]').disabled = state.features.length >= S.MAX_FEATURES;
  }

  /* ----- step 3: the ranking ----- */
  function paintResults() {
    var list = $("#sc-results"), ranked = S.rank(state);
    list.textContent = "";
    if (!ranked.length) { list.appendChild(el("li", { "class": "muted sc-none" }, "Name a feature to see it ranked.")); $("#sc-close-note").hidden = true; return; }
    ranked.forEach(function (r) {
      var li = el("li", { "class": "sc-res" + (r.rank === 1 ? " is-top" : "") });
      li.appendChild(el("span", { "class": "sc-rank", "aria-label": "Rank " + r.rank }, String(r.rank)));
      var main = el("div", { "class": "sc-res-main" });
      var line = el("div", { "class": "sc-res-line" });
      line.append(el("b", {}, r.name), el("span", { "class": "sc-score" }, String(r.score)));
      var bar = el("div", { "class": "sc-bar-track", "aria-hidden": "true" }), fill = el("span", { style: "width:" + r.score + "%" });
      bar.appendChild(fill);
      main.append(line, bar);
      var why = el("small", { "class": "sc-why" }, r.top ? "Mostly from " + r.top : "Scores low on every criterion");
      if (r.closeCall) { why.appendChild(document.createTextNode(" ")); why.appendChild(el("span", { "class": "sc-chip" }, "Close call")); }
      main.appendChild(why);
      li.appendChild(main);
      list.appendChild(li);
    });
    $("#sc-close-note").hidden = !ranked.some(function (r) { return r.closeCall; });
  }

  function paintAll() { $("#sc-title").value = state.title; paintCriteria(); paintTable(); paintResults(); }
  function changed(structure) { if (structure) paintTable(); paintResults(); save(); }

  /* ----- edits ----- */
  root.addEventListener("input", function (e) {
    var t = e.target, i;
    if (t.id === "sc-title") { state.title = t.value; save(); return; }
    if (t.classList.contains("sc-crit-name")) {
      i = +t.getAttribute("data-i"); state.criteria[i].name = t.value; state.template = "custom"; paintTemplates();
      var th = root.querySelector('#sc-table th[data-col="' + i + '"] .sc-th-name'); if (th) th.textContent = t.value;
      changed(false); return;
    }
    if (t.type === "range") {
      i = +t.getAttribute("data-i"); state.criteria[i].weight = +t.value; state.template = "custom"; paintTemplates();
      t.nextElementSibling.textContent = t.value; t.setAttribute("aria-valuetext", "Weight " + t.value + " of 5");
      changed(false); return;
    }
    if (t.classList.contains("sc-feat-name")) { state.features[+t.getAttribute("data-f")].name = t.value; changed(false); return; }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.tagName === "SELECT" && t.hasAttribute("data-c")) { state.features[+t.getAttribute("data-f")].scores[+t.getAttribute("data-c")] = +t.value; changed(false); }
    if (t.type === "range") paintTable();   // a weight of 0 shows in the table header
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-template")) {
      var key = b.getAttribute("data-template");
      var hasFeatures = state.features.some(function (f) { return f.name; });
      var fresh = S.fromTemplate(key, false);
      // keep the features (names), re-scored at 3 on the new criteria
      fresh.features = state.features.map(function (f) { return { name: f.name, scores: fresh.criteria.map(function () { return 3; }) }; });
      fresh.title = state.title;
      if (hasFeatures && !window.confirm("Switch to the " + S.TEMPLATES[key].name + " criteria? Your features stay, but their scores reset to 3.")) return;
      state = fresh; paintAll(); save(); track("scorecard_template"); return;
    }
    if (b.classList.contains("sc-dir")) {
      var c = state.criteria[+b.getAttribute("data-i")]; c.cost = !c.cost; state.template = "custom";
      paintCriteria(); changed(true); root.querySelector('.sc-dir[data-i="' + b.getAttribute("data-i") + '"]').focus(); return;
    }
    if (b.hasAttribute("data-rm-crit")) {
      var ci = +b.getAttribute("data-rm-crit");
      state.criteria.splice(ci, 1); state.features.forEach(function (f) { f.scores.splice(ci, 1); }); state.template = "custom";
      paintCriteria(); changed(true); return;
    }
    if (b.hasAttribute("data-rm-feat")) {
      state.features.splice(+b.getAttribute("data-rm-feat"), 1); changed(true);
      var next = root.querySelector(".sc-feat-name"); if (next) next.focus(); return;
    }
    var act = b.getAttribute("data-sc");
    if (act === "add-criterion" && state.criteria.length < S.MAX_CRITERIA) {
      state.criteria.push({ name: "New criterion", weight: 3, cost: false }); state.features.forEach(function (f) { f.scores.push(3); }); state.template = "custom";
      paintCriteria(); changed(true);
      var inputs = root.querySelectorAll(".sc-crit-name"); inputs[inputs.length - 1].select(); return;
    }
    if (act === "add-feature" && state.features.length < S.MAX_FEATURES) {
      state.features.push({ name: "", scores: state.criteria.map(function () { return 3; }) }); changed(true);
      var names = root.querySelectorAll(".sc-feat-name"); names[names.length - 1].focus(); return;
    }
    if (act === "examples") {
      var ex = S.fromTemplate(state.template in S.TEMPLATES ? state.template : "balanced", true);
      if (state.features.some(function (f) { return f.name; }) && !window.confirm("Replace your features with the example?")) return;
      ex.title = state.title; state = ex; paintAll(); save(); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over with a blank scorecard? This clears the one saved in this browser.")) return;
      state = S.fromTemplate("balanced", false); state.features = [{ name: "", scores: state.criteria.map(function () { return 3; }) }];
      paintAll(); save(); $("#sc-title").focus(); return;
    }
    if (act === "share") {
      var url = location.origin + location.pathname + "#s=" + S.encode(state), box = $("#sc-share"), input = $("#sc-share-url");
      input.value = url; box.hidden = false; input.select();
      var done = function (ok) { $("#sc-share-status").textContent = ok ? "Link copied. Paste it anywhere to share a copy." : "Copy the link above to share a copy."; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      track("scorecard_share"); return;
    }
    if (act === "csv") {
      var blob = new Blob(["﻿" + S.toCSV(state)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: (state.title || "feature-scorecard").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".csv" });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      track("scorecard_csv"); return;
    }
    if (act === "print") { track("scorecard_print"); window.print(); }
  });
  // Arrow keys move along the template choices, as in any radio group.
  root.querySelector(".sc-templates").addEventListener("keydown", function (e) {
    var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    var bs = Array.prototype.slice.call(this.querySelectorAll("button")), i = bs.indexOf(document.activeElement);
    bs[(i + step + bs.length) % bs.length].focus();
  });

  load();
  paintAll();
})();
