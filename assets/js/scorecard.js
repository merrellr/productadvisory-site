/* Feature Prioritization Scorecard (/scorecard): the page. The scoring lives in scorecard-core.js.
   Three tabs share one list of features: weighted scoring, RICE, and both rankings compared.
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
    root.querySelectorAll('[data-sc="add-feature"]').forEach(function (b) { b.disabled = state.features.length >= S.MAX_FEATURES; });
  }

  /* ----- RICE: the same features, scored on reach, impact, confidence and effort ----- */
  function paintRiceTable() {
    var t = $("#sc-rice-table");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    [["Feature", ""], ["Reach", "people per period"], ["Impact", ""], ["Confidence", ""], ["Effort", "person-months"], ["", ""]].forEach(function (h) {
      var th = el("th", { scope: "col" });
      if (h[0]) th.appendChild(el("span", { "class": "sc-th-name" }, h[0]));
      if (h[1]) th.appendChild(el("small", { "class": "sc-th-off" }, h[1]));
      hr.appendChild(th);
    });
    head.appendChild(hr);
    var body = el("tbody");
    state.features.forEach(function (f, i) {
      var tr = el("tr"), label = f.name || "Feature " + (i + 1);
      var th = el("th", { scope: "row" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "80", placeholder: "Feature name", "data-f": i, "aria-label": "Feature " + (i + 1) + " name" });
      name.value = f.name;
      th.appendChild(name); tr.appendChild(th);
      var num = function (k, step, min) {
        var td = el("td"), inp = el("input", { type: "number", inputmode: "decimal", min: min, step: step, "class": "sc-num", "data-f": i, "data-k": k, "aria-label": label + ": " + k });
        inp.value = f.rice[k]; td.appendChild(inp); return td;
      };
      var pick = function (k, opts, fmt) {
        var td = el("td"), sel = el("select", { "data-f": i, "data-k": k, "aria-label": label + ": " + k });
        opts.forEach(function (o) { var op = el("option", { value: o[0] }, fmt(o)); if (f.rice[k] === o[0]) op.selected = true; sel.appendChild(op); });
        td.appendChild(sel); return td;
      };
      tr.append(num("reach", "1", "0"),
        pick("impact", S.IMPACTS, function (o) { return o[0] + " " + o[1].toLowerCase(); }),
        pick("confidence", S.CONFIDENCES.concat(S.CONFIDENCES.some(function (c) { return c[0] === f.rice.confidence; }) ? [] : [[f.rice.confidence, "Custom"]]),
          function (o) { return o[0] + "% " + o[1].toLowerCase(); }),
        num("effort", "0.5", "0.1"));
      var td = el("td");
      td.appendChild(el("button", { type: "button", "class": "sc-x", "data-rm-feat": i, "aria-label": "Remove " + label }, "×"));
      tr.appendChild(td);
      body.appendChild(tr);
    });
    t.append(head, body);
    if (!state.features.length) {
      var empty = el("tr"); empty.appendChild(el("td", { colspan: 6, "class": "muted sc-empty" }, "No features yet. Add one, or fill in an example to see how it works."));
      body.appendChild(empty);
    }
  }

  /* ----- compare: both rankings, with a line for each feature ----- */
  var LINE_COLOURS = ["#35c2e8", "#6a45d6", "#e0a15a", "#0b7a5c", "#d1607a", "#1c4587", "#8a94a3"];
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function paintCompare() {
    var box = $("#sc-compare"), notes = $("#sc-compare-notes");
    box.textContent = ""; notes.textContent = "";
    if (!S.hasRice(state)) {
      var p = el("p", { "class": "sc-compare-empty" }, "Score at least two features with RICE (a reach above 0) to compare the rankings. ");
      p.appendChild(el("button", { type: "button", "class": "btn sm", "data-method": "rice" }, "Score them with RICE"));
      box.appendChild(p); return;
    }
    var rows = S.compare(state), n = rows.length, gap = 54, top = 34, w = 640, colW = 230, x2 = w - colW;
    var cut = function (t) { return t.length > 24 ? t.slice(0, 23) + "…" : t; };
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var byRice = rows.slice().sort(function (a, b) { return a.rice - b.rice || a.index - b.index; });
    var yL = {}, yR = {};
    rows.forEach(function (r, i) { yL[r.index] = top + i * gap; });
    byRice.forEach(function (r, i) { yR[r.index] = top + i * gap; });
    var svg = '<svg class="sc-bump" viewBox="0 0 ' + w + " " + (top + n * gap) + '" role="img" aria-label="Weighted ranking on the left and RICE ranking on the right, with a line for each feature">' +
      '<text x="0" y="14" class="sc-bump-h">WEIGHTED SCORING</text><text x="' + w + '" y="14" text-anchor="end" class="sc-bump-h">RICE</text>';
    rows.forEach(function (r, i) {
      var c = LINE_COLOURS[i % LINE_COLOURS.length], a = yL[r.index] + 20, b = yR[r.index] + 20, mx = (colW + x2) / 2;
      svg += '<path d="M' + colW + " " + a + " C " + mx + " " + a + ", " + mx + " " + b + ", " + x2 + " " + b + '" stroke="' + c + '" stroke-width="' + (r.move ? 4 : 3) + '" fill="none" stroke-linecap="round" opacity="' + (r.move ? 0.95 : 0.45) + '"/>';
    });
    rows.forEach(function (r, i) {
      var c = LINE_COLOURS[i % LINE_COLOURS.length];
      [[0, yL[r.index], r.weighted, r.weightedScore], [x2, yR[r.index], r.rice, r.riceScore]].forEach(function (p) {
        svg += '<g><rect x="' + p[0] + '" y="' + p[1] + '" width="' + colW + '" height="40" rx="10" class="sc-bump-box" stroke="' + c + '"/>' +
          '<circle cx="' + (p[0] + 20) + '" cy="' + (p[1] + 20) + '" r="11" fill="' + c + '"/><text x="' + (p[0] + 20) + '" y="' + (p[1] + 24.5) + '" text-anchor="middle" class="sc-bump-n">' + p[2] + "</text>" +
          '<text x="' + (p[0] + 38) + '" y="' + (p[1] + 25) + '" class="sc-bump-t">' + esc(cut(r.name)) + "</text>" +
          '<text x="' + (p[0] + colW - 10) + '" y="' + (p[1] + 25) + '" text-anchor="end" class="sc-bump-s">' + p[3] + "</text></g>";
      });
    });
    box.innerHTML = svg + "</svg>";
    var movers = rows.filter(function (r) { return Math.abs(r.move) >= 2; }).sort(function (a, b) { return Math.abs(b.move) - Math.abs(a.move); });
    var p2 = el("p");
    if (!movers.length) p2.textContent = "The two methods broadly agree: no feature moves more than one place. That's a good sign your criteria and your reach estimates tell the same story.";
    else {
      p2.appendChild(el("b", {}, "Where they disagree: "));
      p2.appendChild(document.createTextNode(movers.slice(0, 3).map(function (r) { return r.name + " is " + ord(r.weighted) + " with weighted scoring and " + ord(r.rice) + " with RICE"; }).join("; ") + "."));
    }
    var p3 = el("p", { "class": "muted" }, movers.length
      ? "RICE favours what reaches the most people for the least work. Weighted scoring favours whatever your criteria weight most. A big move means it's worth asking which of those matters more for this decision, and agreeing that before you commit."
      : "If you expected a disagreement, check the reach numbers and the weights: they're where the two methods usually part ways.");
    notes.append(p2, p3);
  }

  function paintMethod() {
    root.querySelectorAll("[data-method]").forEach(function (b) { if (b.getAttribute("role") === "radio") b.setAttribute("aria-checked", b.getAttribute("data-method") === state.method ? "true" : "false"); });
    root.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== state.method; });
    $(".sc-results-card").hidden = state.method === "compare";
    root.classList.toggle("is-rice", state.method === "rice");
  }

  /* ----- step 3: the ranking ----- */
  function paintResults() {
    var list = $("#sc-results"), rice = state.method === "rice", ranked = rice ? S.rankRice(state) : S.rank(state);
    var top = ranked.length ? Math.max.apply(null, ranked.map(function (r) { return r.score; })) : 0;
    $("#sc-rank-note").textContent = rice ? "RICE scores: reach × impact × confidence ÷ effort. Higher is better." : "Updates as you go. Scores run from 0 to 100.";
    $("#sc-close-text").textContent = rice ? "These are within 15% of each other." : "These are within 5 points of each other.";
    list.textContent = "";
    if (!ranked.length) { list.appendChild(el("li", { "class": "muted sc-none" }, "Name a feature to see it ranked.")); $("#sc-close-note").hidden = true; return; }
    ranked.forEach(function (r) {
      var li = el("li", { "class": "sc-res" + (r.rank === 1 ? " is-top" : "") });
      li.appendChild(el("span", { "class": "sc-rank", "aria-label": "Rank " + r.rank }, String(r.rank)));
      var main = el("div", { "class": "sc-res-main" });
      var line = el("div", { "class": "sc-res-line" });
      line.append(el("b", {}, r.name), el("span", { "class": "sc-score" }, rice ? r.score.toLocaleString() : String(r.score)));
      var bar = el("div", { "class": "sc-bar-track", "aria-hidden": "true" }), fill = el("span", { style: "width:" + (rice ? (top ? r.score / top * 100 : 0) : r.score) + "%" });
      bar.appendChild(fill);
      main.append(line, bar);
      var why = el("small", { "class": "sc-why" }, rice ? (r.rice.reach ? r.rice.reach.toLocaleString() + " reached × " + r.rice.impact + " × " + r.rice.confidence + "% ÷ " + r.rice.effort : "Add a reach to score it")
        : (r.top ? "Mostly from " + r.top : "Scores low on every criterion"));
      if (r.closeCall) { why.appendChild(document.createTextNode(" ")); why.appendChild(el("span", { "class": "sc-chip" }, "Close call")); }
      main.appendChild(why);
      li.appendChild(main);
      list.appendChild(li);
    });
    $("#sc-close-note").hidden = !ranked.some(function (r) { return r.closeCall; });
  }

  function paintAll() { $("#sc-title").value = state.title; paintMethod(); paintCriteria(); paintTable(); paintRiceTable(); paintResults(); paintCompare(); }
  function changed(structure) { if (structure) { paintTable(); paintRiceTable(); } paintResults(); paintCompare(); save(); }

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
    if (t.classList.contains("sc-feat-name")) {
      var fi = +t.getAttribute("data-f"); state.features[fi].name = t.value;
      root.querySelectorAll('.sc-feat-name[data-f="' + fi + '"]').forEach(function (o) { if (o !== t) o.value = t.value; });   // the same feature on the other tab
      changed(false); return;
    }
    if (t.classList.contains("sc-num")) {
      var f = state.features[+t.getAttribute("data-f")], k = t.getAttribute("data-k");
      if (t.value === "") return;   // mid-edit
      var r = Object.assign({}, f.rice); r[k] = +t.value; f.rice = S.cleanRice(r);
      changed(false); return;
    }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.tagName === "SELECT" && t.hasAttribute("data-c")) { state.features[+t.getAttribute("data-f")].scores[+t.getAttribute("data-c")] = +t.value; changed(false); }
    if (t.tagName === "SELECT" && t.hasAttribute("data-k")) { var f = state.features[+t.getAttribute("data-f")], r = Object.assign({}, f.rice); r[t.getAttribute("data-k")] = +t.value; f.rice = S.cleanRice(r); changed(false); }
    if (t.classList.contains("sc-num")) { var f2 = state.features[+t.getAttribute("data-f")]; t.value = f2.rice[t.getAttribute("data-k")]; }   // show the cleaned value
    if (t.type === "range") paintTable();   // a weight of 0 shows in the table header
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-method")) {
      state.method = b.getAttribute("data-method"); paintMethod(); paintResults(); paintCompare(); save(); track("scorecard_" + state.method);
      if (b.getAttribute("role") !== "radio") root.querySelector('.sc-methods [data-method="' + state.method + '"]').focus();
      return;
    }
    if (b.hasAttribute("data-template")) {
      var key = b.getAttribute("data-template");
      var hasFeatures = state.features.some(function (f) { return f.name; });
      var fresh = S.fromTemplate(key, false);
      // keep the features (names), re-scored at 3 on the new criteria
      fresh.features = state.features.map(function (f) { return { name: f.name, scores: fresh.criteria.map(function () { return 3; }), rice: f.rice }; });
      fresh.title = state.title; fresh.method = state.method;
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
      var panel = b.closest("[data-panel]");
      state.features.splice(+b.getAttribute("data-rm-feat"), 1); changed(true);
      var next = panel.querySelector(".sc-feat-name"); if (next) next.focus(); return;
    }
    var act = b.getAttribute("data-sc");
    if (act === "add-criterion" && state.criteria.length < S.MAX_CRITERIA) {
      state.criteria.push({ name: "New criterion", weight: 3, cost: false }); state.features.forEach(function (f) { f.scores.push(3); }); state.template = "custom";
      paintCriteria(); changed(true);
      var inputs = root.querySelectorAll(".sc-crit-name"); inputs[inputs.length - 1].select(); return;
    }
    if (act === "add-feature" && state.features.length < S.MAX_FEATURES) {
      state.features.push({ name: "", scores: state.criteria.map(function () { return 3; }), rice: S.cleanRice(S.RICE_DEFAULT) }); changed(true);
      var names = b.closest("[data-panel]").querySelectorAll(".sc-feat-name"); names[names.length - 1].focus(); return;
    }
    if (act === "examples") {
      var ex = S.fromTemplate(state.template in S.TEMPLATES ? state.template : "balanced", true);
      if (state.features.some(function (f) { return f.name; }) && !window.confirm("Replace your features with the example?")) return;
      ex.title = state.title; ex.method = state.method; state = ex; paintAll(); save(); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over with a blank scorecard? This clears the one saved in this browser.")) return;
      var m = state.method; state = S.fromTemplate("balanced", false); state.method = m === "compare" ? "weighted" : m;
      state.features = [{ name: "", scores: state.criteria.map(function () { return 3; }), rice: S.cleanRice(S.RICE_DEFAULT) }];
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
    if (act === "expand") { expand(!root.classList.contains("is-expanded")); }
  });
  /* Full screen: the scoring table fills the window, with the ranking alongside, so nothing needs scrolling past. */
  function expand(on) {
    var b = root.querySelector('[data-sc="expand"]');
    root.classList.toggle("is-expanded", on);
    document.documentElement.classList.toggle("sc-lock", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.innerHTML = on ? '<span aria-hidden="true">✕</span> Close full screen' : '<span aria-hidden="true">⤢</span> Full screen';
    b.focus();
    if (on) track("scorecard_fullscreen");
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-expanded")) expand(false); });

  // Arrow keys move along the template choices, as in any radio group.
  [root.querySelector(".sc-templates"), root.querySelector(".sc-methods")].forEach(function (group) { group.addEventListener("keydown", function (e) {
    var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    var bs = Array.prototype.slice.call(this.querySelectorAll("button")), i = bs.indexOf(document.activeElement);
    var next = bs[(i + step + bs.length) % bs.length];
    next.focus();
    if (this.classList.contains("sc-methods")) next.click();
  }); });

  load();
  paintAll();
})();
