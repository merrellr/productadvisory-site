/* Organizational Impact Score (/impact-score): the page. The scoring lives in impact-core.js.
   KPIs and weights, then a grid of initiatives (columns) by KPI (rows), like the PDF; the map, ranking and checks
   update as you go. The sheet is saved in this browser; "Share a link" puts a copy of it in the link's #. */
(function () {
  "use strict";
  var I = window.ImpactCore, root = document.getElementById("impact");
  if (!I || !root) return;
  var KEY = "pa_impact";
  var $ = function (sel) { return root.querySelector(sel); };
  var state;

  // In this browser; inside Product Advisory Learning (embedded), kept in the page and handed to Learning instead (save.js).
  function store(v) { return window.PASave ? PASave.store(KEY, v) : null; }
  function save() {
    store(JSON.stringify(state));
    if (window.PASave) PASave.changed("impact", function () { return { data: I.encode(state), title: state.title, summary: summary() }; });
  }
  // A line about the results, shown with the saved copy in Learning.
  function summary() { var r = I.rank(state); return r.length ? r.slice(0, 3).map(function (x) { return x.rank + ". " + x.name + (x.action ? " (" + x.actionName + ")" : ""); }).join(" · ") : "Not scored yet"; }
  function track(name) { try { if (window.gtag) window.gtag("event", name, { tool: "impact_score" }); } catch (e) { /* no analytics */ } }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hasWork(s) { return s.items.some(function (it) { return it.name || it.impacts.some(function (v) { return v != null; }); }); }
  function itemName(it, j) { return it.name || "Initiative " + (j + 1); }

  /* ----- load: a shared link, else what was saved here, else a blank sheet ----- */
  function load() {
    var h = window.PASave ? PASave.readHash("s") : null, shared = h ? I.decode(h.data) : null;
    var saved = null;
    try { saved = store() ? I.normalize(JSON.parse(store())) : null; } catch (e) { saved = null; }
    if (shared) {
      history.replaceState(null, "", location.pathname);
      if (!saved || !hasWork(saved) || window.confirm("Open the shared sheet? It replaces the one saved in this browser.")) {
        state = shared; save(); if (window.PASave) PASave.remember("impact", h.doc); if (window.PASave) PASave.noteShared(root, '[data-im="save"]', h.doc); track("impact_open_shared"); return;
      }
    }
    state = saved || (window.PASave && PASave.start === "example" ? I.fromExample() : I.blank());
  }

  /* ----- step 1: KPIs ----- */
  function paintKpis() {
    var t = $("#im-kpis");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    ["KPI", "Weight", "How we measure it", ""].forEach(function (h) { hr.appendChild(el("th", { scope: "col" }, h)); });
    head.appendChild(hr);
    var body = el("tbody");
    state.kpis.forEach(function (k, i) {
      var tr = el("tr"), th = el("th", { scope: "row" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "80", placeholder: "Your KPI", "data-k": i, "data-f": "name", "aria-label": "KPI " + (i + 1) });
      name.value = k.name; th.appendChild(name); tr.appendChild(th);
      var wtd = el("td"), w = el("input", { type: "number", "class": "sc-num", min: "0", max: "100", step: "1", "data-k": i, "data-f": "weight", "aria-label": (k.name || "KPI " + (i + 1)) + ": weight" });
      w.value = k.weight; wtd.appendChild(w); tr.appendChild(wtd);
      var mtd = el("td"), mm = el("input", { "class": "sc-feat-name im-measure", maxlength: "120", placeholder: "For example: churn, NPS", "data-k": i, "data-f": "measure", "aria-label": (k.name || "KPI " + (i + 1)) + ": how we measure it" });
      mm.value = k.measure; mtd.appendChild(mm); tr.appendChild(mtd);
      var xtd = el("td");
      xtd.appendChild(el("button", { type: "button", "class": "sc-x", "data-rmk": i, "aria-label": "Remove " + (k.name || "KPI " + (i + 1)) }, "×"));
      tr.appendChild(xtd);
      body.appendChild(tr);
    });
    var foot = el("tfoot"), fr = el("tr");
    fr.appendChild(el("th", { scope: "row" }, "Total weight (must equal 100)"));
    var td = el("td"); td.appendChild(el("output", { id: "im-wtotal" })); fr.appendChild(td);
    fr.append(el("td"), el("td"));
    foot.appendChild(fr);
    t.append(head, body, foot);
    $('[data-im="add-kpi"]').disabled = state.kpis.length >= I.MAX_KPIS;
  }

  /* ----- step 2: the scoring grid (KPIs down, initiatives across, as in the PDF) ----- */
  function select(attrs, from, to, value, blankLabel) {
    var s = el("select", attrs);
    if (blankLabel != null) s.appendChild(el("option", { value: "" }, blankLabel));
    for (var v = from; v <= to; v++) { var o = el("option", { value: v }, String(v)); if (value === v) o.selected = true; s.appendChild(o); }
    return s;
  }
  function paintGrid() {
    var t = $("#im-table");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    hr.appendChild(el("th", { scope: "col" }, "KPI"));
    hr.appendChild(el("th", { scope: "col" }, "Weight"));
    state.items.forEach(function (it, j) {
      var th = el("th", { scope: "col", "class": "im-col" }), wrap = el("div", { "class": "im-col-head" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "80", placeholder: "Initiative " + (j + 1), "data-j": j, "data-f": "iname", "aria-label": "Initiative " + (j + 1) + " name" });
      name.value = it.name;
      wrap.append(name, el("button", { type: "button", "class": "sc-x", "data-rmi": j, "aria-label": "Remove " + itemName(it, j) }, "×"));
      th.appendChild(wrap); hr.appendChild(th);
    });
    head.appendChild(hr);
    var body = el("tbody");
    state.kpis.forEach(function (k, i) {
      var tr = el("tr");
      tr.appendChild(el("th", { scope: "row", "class": "im-kpi" }, k.name || "KPI " + (i + 1)));
      tr.appendChild(el("td", { "class": "im-w" }, String(k.weight)));
      state.items.forEach(function (it, j) {
        var td = el("td");
        td.appendChild(select({ "data-j": j, "data-i": i, "aria-label": itemName(it, j) + ": impact on " + (k.name || "KPI " + (i + 1)) + ", 0 to 5" }, 0, 5, it.impacts[i], "–"));
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    var foot = el("tfoot");
    var rowImpact = el("tr", { "class": "im-calc" }); rowImpact.append(el("th", { scope: "row" }, "Impact score (0 to 100)"), el("td"));
    var rowConf = el("tr"); rowConf.append(el("th", { scope: "row" }, "Confidence in estimates"), el("td"));
    var rowAdj = el("tr", { "class": "im-calc" }); rowAdj.append(el("th", { scope: "row" }, "Confidence-adjusted score"), el("td"));
    var rowEase = el("tr"); rowEase.append(el("th", { scope: "row" }, "Ease (1 very hard, 5 easy)"), el("td"));
    state.items.forEach(function (it, j) {
      var a = el("td"); a.appendChild(el("output", { "data-impact": j })); rowImpact.appendChild(a);
      var c = el("td"), cs = el("select", { "data-j": j, "data-f": "confidence", "aria-label": itemName(it, j) + ": confidence" });
      var known = I.CONFIDENCE.some(function (p) { return p[0] === it.confidence; });
      (known ? I.CONFIDENCE : I.CONFIDENCE.concat([[it.confidence, "Your own"]])).forEach(function (p) { var o = el("option", { value: p[0], title: p[1] }, p[0] + "%"); if (p[0] === it.confidence) o.selected = true; cs.appendChild(o); });
      c.appendChild(cs); rowConf.appendChild(c);
      var d = el("td"); d.appendChild(el("output", { "data-adj": j })); rowAdj.appendChild(d);
      var e = el("td"); e.appendChild(select({ "data-j": j, "data-f": "ease", "aria-label": itemName(it, j) + ": ease, 1 very hard to 5 easy" }, 1, 5, it.ease || null, "–")); rowEase.appendChild(e);
    });
    foot.append(rowImpact, rowConf, rowAdj, rowEase);
    t.append(head, body, foot);
    $('[data-im="add"]').disabled = state.items.length >= I.MAX_ITEMS;
  }

  /* ----- step 3: the map (adjusted score up, ease right) ----- */
  var COLORS = [["do-now", "Do now"], ["big-bet", "Big bets"], ["quick-win", "Quick wins"], ["revisit", "Revisit"]];
  function paintMatrix(rows) {
    var W = 300, pad = 28, inner = W - pad - 8, top = 8;
    var x = function (ease) { return pad + (ease - 0.5) / 5 * inner; }, y = function (v) { return top + (100 - Math.min(100, v)) / 100 * inner; };
    var mid = y(I.HIGH), xe = function (e) { return pad + (e - 0.5) / 5 * inner; };
    var regions = [["big-bet", pad, top, xe(I.DO_NOW_EASE - 0.5) - pad, mid - top, "BIG BETS", "start"],
                   ["do-now", xe(I.DO_NOW_EASE - 0.5), top, pad + inner - xe(I.DO_NOW_EASE - 0.5), mid - top, "DO NOW", "end"],
                   ["revisit", pad, mid, xe(I.QUICK_EASE - 0.5) - pad, top + inner - mid, "REVISIT", "start"],
                   ["quick-win", xe(I.QUICK_EASE - 0.5), mid, pad + inner - xe(I.QUICK_EASE - 0.5), top + inner - mid, "QUICK WINS", "end"]];
    var placed = rows.filter(function (r) { return r.ease; });
    var svg = '<svg class="uc-map" viewBox="0 0 ' + W + " " + (W + 6) + '" role="img" aria-label="Initiatives placed by adjusted score (up) and ease (right); ' +
      esc(placed.map(function (r) { return r.rank + ": " + r.name + ", " + r.actionName; }).join("; ")) + '">';
    regions.forEach(function (g) {
      svg += '<rect x="' + g[1] + '" y="' + g[2] + '" width="' + g[3] + '" height="' + g[4] + '" class="uc-q-bg q-' + g[0] + '"/>' +
        '<text x="' + (g[6] === "end" ? g[1] + g[3] - 7 : g[1] + 7) + '" y="' + (g[2] < mid ? g[2] + 16 : g[2] + g[4] - 8) + '" text-anchor="' + g[6] + '" class="uc-q-lbl q-' + g[0] + '">' + g[5] + "</text>";
    });
    svg += '<line x1="' + pad + '" y1="' + (top + inner) + '" x2="' + (pad + inner) + '" y2="' + (top + inner) + '" class="uc-axis"/><line x1="' + pad + '" y1="' + top + '" x2="' + pad + '" y2="' + (top + inner) + '" class="uc-axis"/>' +
      '<text x="' + (pad + inner / 2) + '" y="' + (W + 4) + '" text-anchor="middle" class="uc-axis-lbl">EASE →</text>' +
      '<text transform="translate(12 ' + (top + inner / 2) + ') rotate(-90)" text-anchor="middle" class="uc-axis-lbl">ADJUSTED SCORE →</text>';
    var dots = [];
    placed.slice().reverse().forEach(function (r) {
      var cx = x(r.ease), cy = y(r.adjusted);
      cx = Math.min(Math.max(cx, pad + 12), pad + inner - 12); cy = Math.min(Math.max(cy, top + 26), top + inner - 22);
      // close to another dot: step sideways until they don't overlap
      for (var n = 0; n < 8 && dots.some(function (d) { return Math.hypot(d[0] - cx, d[1] - cy) < 23; }); n++) cx += (n % 2 ? -1 : 1) * 12 * (n + 1);
      cx = Math.min(Math.max(cx, pad + 12), pad + inner - 12);
      dots.push([cx, cy]);
      svg += '<g class="uc-dot q-' + r.action + '"><circle cx="' + cx + '" cy="' + cy + '" r="11"/><text x="' + cx + '" y="' + (cy + 4.5) + '" text-anchor="middle">' + r.rank + "</text></g>";
    });
    $("#im-matrix").innerHTML = svg + "</svg>";
    var counts = I.counts(state), legend = $("#im-legend");
    legend.textContent = "";
    COLORS.forEach(function (q) {
      var li = el("li", { "class": "q-" + q[0] });
      li.append(el("i", { "aria-hidden": "true" }), document.createTextNode(q[1] + " "), el("b", {}, String(counts[q[0]])));
      legend.appendChild(li);
    });
    if (rows.length > placed.length) legend.appendChild(el("li", { "class": "muted" }, (rows.length - placed.length) + " without ease yet"));
  }

  /* ----- step 4: the ranking ----- */
  function paintPlan(rows) {
    var list = $("#im-plan");
    list.textContent = "";
    if (!rows.length) { list.appendChild(el("li", { "class": "muted sc-none" }, "Name an initiative and score its impact to see it here.")); return; }
    rows.forEach(function (r) {
      var li = el("li", { "class": "uc-row q-" + (r.action || "none") });
      li.appendChild(el("span", { "class": "sc-rank", "aria-label": "Rank " + r.rank }, String(r.rank)));
      var main = el("div", { "class": "sc-res-main" }), line = el("div", { "class": "sc-res-line" });
      line.append(el("b", {}, r.name), el("span", { "class": "sc-score", title: "Confidence-adjusted score, 0 to 100" }, String(r.adjusted)));
      var tags = el("div", { "class": "uc-tags" });
      tags.appendChild(el("span", { "class": "uc-tag q-" + (r.action || "none") }, r.actionName));
      tags.appendChild(el("span", { "class": "uc-meta" }, "Impact " + r.impact + " · " + r.confidence + "% confidence" + (r.ease ? " · Ease " + r.ease : "")));
      main.append(line, tags, el("p", { "class": "uc-step" }, r.step));
      if (r.driver) main.appendChild(el("small", { "class": "sc-why" }, "Moves " + r.driver + " most"));
      if (r.hypothesis) main.appendChild(el("p", { "class": "uc-warn" }, "High score on a guess: treat it as a hypothesis and find the cheapest test first."));
      li.appendChild(main);
      list.appendChild(li);
    });
  }

  function paintCalc(rows) {
    var total = I.totalWeight(state), out = $("#im-wtotal");
    out.textContent = total + (total === 100 ? " ✓" : " of 100");
    out.className = "bb-wtotal" + (total === 100 ? " is-ok" : " is-off");
    var by = {};
    rows.forEach(function (r) { by[r.index] = r; });
    state.items.forEach(function (it, j) {
      var r = by[j];
      root.querySelector('[data-impact="' + j + '"]').textContent = r ? r.impact : "–";
      root.querySelector('[data-adj="' + j + '"]').textContent = r ? r.adjusted : "–";
    });
    var list = $("#im-checks");
    list.textContent = "";
    var checks = I.checks(state);
    if (!checks.length) list.appendChild(el("li", { "class": "muted" }, rows.length ? "Nothing to flag." : "Score a few initiatives to see the checks."));
    checks.forEach(function (c) { list.appendChild(el("li", { "class": "is-" + c.level }, c.text)); });
  }

  function paintResults() { var rows = I.rank(state); paintCalc(rows); paintMatrix(rows); paintPlan(rows); }
  function paintNotes() { root.querySelectorAll("[data-note]").forEach(function (t) { t.value = state.decision[t.getAttribute("data-note")] || ""; }); }
  function paintAll() { $("#im-title").value = state.title; paintKpis(); paintGrid(); paintNotes(); paintResults(); }
  function changed() { paintResults(); save(); }

  /* ----- edits ----- */
  root.addEventListener("input", function (e) {
    var t = e.target, f = t.getAttribute("data-f");
    if (t.id === "im-title") { state.title = t.value; save(); return; }
    if (t.hasAttribute("data-note")) { state.decision[t.getAttribute("data-note")] = t.value; save(); return; }
    if (t.hasAttribute("data-k")) {
      var k = state.kpis[+t.getAttribute("data-k")];
      if (f === "weight") { var w = Math.round(+t.value); k.weight = isFinite(w) ? Math.min(100, Math.max(0, w)) : 0; }
      else k[f] = t.value;
      paintGrid(); changed(); return;
    }
    if (f === "iname") { state.items[+t.getAttribute("data-j")].name = t.value; changed(); }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.tagName !== "SELECT" || !t.hasAttribute("data-j")) return;
    var it = state.items[+t.getAttribute("data-j")], f = t.getAttribute("data-f");
    if (f === "confidence") it.confidence = +t.value;
    else if (f === "ease") it.ease = t.value === "" ? 0 : +t.value;
    else it.impacts[+t.getAttribute("data-i")] = t.value === "" ? null : +t.value;
    changed();
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-rmk")) {
      var i = +b.getAttribute("data-rmk");
      state.kpis.splice(i, 1); state.items.forEach(function (it) { it.impacts.splice(i, 1); });
      paintKpis(); paintGrid(); changed(); return;
    }
    if (b.hasAttribute("data-rmi")) { state.items.splice(+b.getAttribute("data-rmi"), 1); paintGrid(); changed(); return; }
    var act = b.getAttribute("data-im");
    if (act === "add-kpi" && state.kpis.length < I.MAX_KPIS) {
      state.kpis.push({ name: "", weight: 0, measure: "" }); state.items.forEach(function (it) { it.impacts.push(null); });
      paintKpis(); paintGrid(); changed();
      var names = root.querySelectorAll("#im-kpis .sc-feat-name:not(.im-measure)"); names[names.length - 1].focus(); return;
    }
    if (act === "add" && state.items.length < I.MAX_ITEMS) {
      state.items.push(I.blankItem(state.kpis.length)); paintGrid(); changed();
      var cols = root.querySelectorAll("#im-table thead .sc-feat-name"); cols[cols.length - 1].focus(); return;
    }
    if (act === "example") {
      if (hasWork(state) && !window.confirm("Replace your sheet with the worked example?")) return;
      if (window.PASave) PASave.forget("impact");
      state = I.fromExample(); paintAll(); save(); track("impact_example"); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over with a blank sheet? This clears the one saved in this browser.")) return;
      if (window.PASave) PASave.forget("impact");
      state = I.blank(); paintAll(); save(); $("#im-title").focus(); return;
    }
    if (act === "save") {
      if (window.PASave) PASave.go("impact", I.encode(state), state.title, summary());
      return;
    }
    if (act === "share") {
      var url = location.origin + location.pathname + "#s=" + I.encode(state), box = $("#im-share"), input = $("#im-share-url");
      input.value = url; box.hidden = false; input.select();
      var done = function (ok) { $("#im-share-status").textContent = ok ? "Link copied. Paste it anywhere to share a copy." : "Copy the link above to share a copy."; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      track("impact_share"); return;
    }
    if (act === "csv") {
      var blob = new Blob(["﻿" + I.toCSV(state)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: (state.title || "impact-score").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".csv" });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      track("impact_csv"); return;
    }
    if (act === "print") { track("impact_print"); window.print(); }
  });

  load();
  paintAll();
})();
