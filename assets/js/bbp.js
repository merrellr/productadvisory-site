/* Build, Buy, or Partner Decision Matrix (/build-buy-partner): the page. The scoring lives in bbp-core.js.
   Score, cost and decide; the result and the checks update as you go. The matrix is saved in this browser;
   "Share a link" puts a copy of it in the link's #. */
(function () {
  "use strict";
  var B = window.BBPCore, root = document.getElementById("bbp");
  if (!B || !root) return;
  var KEY = "pa_bbp";
  var $ = function (sel) { return root.querySelector(sel); };
  var state;

  function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { return null; } }
  function save() { store(JSON.stringify(state)); }
  function track(name) { try { if (window.gtag) window.gtag("event", name, { tool: "build_buy_partner" }); } catch (e) { /* no analytics */ } }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function usd(n) { return n == null ? "" : "$" + Math.round(n).toLocaleString("en-US"); }
  function hasWork(s) { return s.criteria.some(function (c) { return c.build || c.buy || c.partner; }) || B.KEYS.some(function (o) { return Object.keys(s.costs[o]).some(function (k) { return s.costs[o][k] != null; }); }); }

  /* ----- load: a shared link, else what was saved here, else a blank matrix ----- */
  function load() {
    var h = window.PASave ? PASave.readHash("m") : null, shared = h ? B.decode(h.data) : null;
    var saved = null;
    try { saved = store() ? B.normalize(JSON.parse(store())) : null; } catch (e) { saved = null; }
    if (shared) {
      history.replaceState(null, "", location.pathname);
      if (!saved || !hasWork(saved) || window.confirm("Open the shared matrix? It replaces the one saved in this browser.")) {
        state = shared; save(); if (window.PASave) PASave.remember("bbp", h.doc); track("bbp_open_shared"); return;
      }
    }
    state = saved || B.blank();
  }

  function scoreSelect(i, o, c) {
    var sel = el("select", { "data-i": i, "data-o": o, "aria-label": (c.name || "Criterion " + (i + 1)) + ": " + o + " score, 1 to 5" });
    sel.appendChild(el("option", { value: "" }, "–"));
    for (var v = 1; v <= 5; v++) { var opt = el("option", { value: v }, String(v)); if (c[o] === v) opt.selected = true; sel.appendChild(opt); }
    return sel;
  }

  /* ----- step 2: the scoring table ----- */
  function paintTable() {
    var t = $("#bb-table");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    hr.appendChild(el("th", { scope: "col" }, "Criterion"));
    hr.appendChild(el("th", { scope: "col" }, "Weight"));
    B.OPTIONS.forEach(function (o) { var th = el("th", { scope: "col", "class": "o-" + o.key }); th.appendChild(el("span", { "class": "sc-th-name" }, o.name)); hr.appendChild(th); });
    hr.appendChild(el("th", { scope: "col" }, ""));
    head.appendChild(hr);
    var body = el("tbody");
    state.criteria.forEach(function (c, i) {
      var tr = el("tr"), th = el("th", { scope: "row" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "80", placeholder: "Your own criterion", "data-i": i, "data-f": "name", "aria-label": "Criterion " + (i + 1) });
      name.value = c.name;
      th.appendChild(name);
      if (c.hint) th.appendChild(el("small", { "class": "bb-hint" }, c.hint));
      tr.appendChild(th);
      var wtd = el("td"), w = el("input", { type: "number", "class": "sc-num bb-w", min: "0", max: "100", step: "1", "data-i": i, "data-f": "weight", "aria-label": (c.name || "Criterion " + (i + 1)) + ": weight" });
      w.value = c.weight;
      wtd.appendChild(w); tr.appendChild(wtd);
      B.KEYS.forEach(function (o) { var td = el("td"); td.appendChild(scoreSelect(i, o, c)); tr.appendChild(td); });
      var xtd = el("td");
      xtd.appendChild(el("button", { type: "button", "class": "sc-x", "data-rm": i, "aria-label": "Remove " + (c.name || "criterion " + (i + 1)) }, "×"));
      tr.appendChild(xtd);
      body.appendChild(tr);
    });
    var foot = el("tfoot"), fr = el("tr");
    fr.appendChild(el("th", { scope: "row" }, "Weighted total (out of 5.00)"));
    var wt = el("td"); wt.appendChild(el("output", { id: "bb-wtotal", "class": "bb-wtotal" })); fr.appendChild(wt);
    B.KEYS.forEach(function (o) { var td = el("td"); td.appendChild(el("output", { "class": "bb-total o-" + o, "data-total": o })); fr.appendChild(td); });
    fr.appendChild(el("td"));
    foot.appendChild(fr);
    t.append(head, body, foot);
    $('[data-bb="add"]').disabled = state.criteria.length >= B.MAX_CRITERIA;
  }

  /* ----- step 3: the cost table ----- */
  function paintCosts() {
    var t = $("#bb-cost");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    hr.appendChild(el("th", { scope: "col" }, "Cost item"));
    B.OPTIONS.forEach(function (o) { var th = el("th", { scope: "col", "class": "o-" + o.key }); th.appendChild(el("span", { "class": "sc-th-name" }, o.name)); hr.appendChild(th); });
    head.appendChild(hr);
    var body = el("tbody");
    B.COSTS.forEach(function (c) {
      var tr = el("tr"), th = el("th", { scope: "row" });
      th.append(el("span", { "class": "bb-cost-name" }, c.name), el("small", { "class": "bb-hint" }, c.hint));
      tr.appendChild(th);
      B.KEYS.forEach(function (o) {
        var td = el("td"), inp = el("input", { type: "text", inputmode: "numeric", "class": "sc-num bb-money", placeholder: "$", "data-o": o, "data-c": c.key, "aria-label": c.name + ": " + o + ", in dollars" });
        inp.value = state.costs[o][c.key] == null ? "" : state.costs[o][c.key].toLocaleString("en-US");
        td.appendChild(inp); tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    var foot = el("tfoot");
    var tot = el("tr", { "class": "bb-cost-total" }); tot.appendChild(el("th", { scope: "row" }, "Total three-year cost"));
    B.KEYS.forEach(function (o) { var td = el("td"); td.appendChild(el("output", { "data-cost": o })); tot.appendChild(td); });
    var diff = el("tr", { "class": "bb-cost-diff" }); diff.appendChild(el("th", { scope: "row" }, "Difference from the lowest"));
    B.KEYS.forEach(function (o) { var td = el("td"); td.appendChild(el("output", { "data-diff": o })); diff.appendChild(td); });
    var mo = el("tr"), mth = el("th", { scope: "row" });
    mth.append(el("span", { "class": "bb-cost-name" }, "Months to first customer value"), el("small", { "class": "bb-hint" }, "From a funded decision to something customers can use"));
    mo.appendChild(mth);
    B.KEYS.forEach(function (o) {
      var td = el("td"), inp = el("input", { type: "number", min: "0", max: "240", step: "0.5", "class": "sc-num", "data-months": o, "aria-label": "Months to first customer value: " + o });
      inp.value = state.months[o] == null ? "" : state.months[o];
      td.appendChild(inp); mo.appendChild(td);
    });
    foot.append(tot, diff, mo);
    t.append(head, body, foot);
  }

  /* ----- step 4: the result ----- */
  function paintResult() {
    var r = B.results(state), box = $("#bb-result");
    var wt = $("#bb-wtotal");
    wt.textContent = r.totalWeight + (r.totalWeight === 100 ? " ✓" : " of 100");
    wt.className = "bb-wtotal" + (r.totalWeight === 100 ? " is-ok" : " is-off");
    B.KEYS.forEach(function (o) { var out = root.querySelector('[data-total="' + o + '"]'); out.textContent = r.totals[o] == null ? "–" : r.totals[o].toFixed(2); });
    B.KEYS.forEach(function (o) {
      root.querySelector('[data-cost="' + o + '"]').textContent = r.costTotal[o] == null ? "–" : usd(r.costTotal[o]);
      root.querySelector('[data-diff="' + o + '"]').textContent = r.costDiff[o] == null ? "" : r.costDiff[o] === 0 && r.lowestCost.length ? "Lowest" : r.costDiff[o] ? "+" + usd(r.costDiff[o]) : "";
    });
    box.textContent = "";
    var lead = el("div", { "class": "bb-lead" + (r.leader.kind === "tie" ? " is-tie" : "") });
    lead.appendChild(el("span", { "class": "uc-pilot-label" }, r.leader.kind === "tie" ? "Too close to call" : "Leading by score"));
    lead.appendChild(el("h3", {}, r.leader.kind === "none" ? "Score the options to see a leader" : r.leader.kind === "tie" ? r.leader.options.map(function (o) { return B.CHOICES[o]; }).join(", ") : r.leader.text));
    if (r.leader.kind === "tie") lead.appendChild(el("p", {}, "Scores within 0.25 points don't separate the options, which is common. Let the cost, risks and tripwires decide."));
    box.appendChild(lead);
    var bars = el("div", { "class": "bb-bars" });
    B.OPTIONS.forEach(function (o) {
      var row = el("div", { "class": "bb-bar-row o-" + o.key + (r.leader.options.indexOf(o.key) > -1 ? " is-lead" : "") });
      var top = el("div", { "class": "sc-res-line" });
      top.append(el("b", {}, o.name), el("span", { "class": "sc-score" }, r.totals[o.key] == null ? "–" : r.totals[o.key].toFixed(2)));
      var track = el("div", { "class": "sc-bar-track" }), fill = el("span");
      fill.style.width = (r.totals[o.key] ? r.totals[o.key] / 5 * 100 : 0) + "%";
      track.appendChild(fill);
      var facts = [];
      if (r.costTotal[o.key] != null) facts.push(usd(r.costTotal[o.key]) + " over 3 years");
      if (r.months[o.key] != null) facts.push(r.months[o.key] + " months to first value");
      var meta = el("div", { "class": "uc-tags" });
      if (r.lowestCost.indexOf(o.key) > -1) meta.appendChild(el("span", { "class": "bb-badge" }, "Lowest cost"));
      if (r.fastest.indexOf(o.key) > -1) meta.appendChild(el("span", { "class": "bb-badge" }, "Fastest"));
      if (facts.length) meta.appendChild(el("span", { "class": "uc-meta" }, facts.join(" · ")));
      row.append(top, track, meta);
      if (r.contributions[o.key]) row.appendChild(el("small", { "class": "sc-why" }, "Strongest on " + r.contributions[o.key]));
      bars.appendChild(row);
    });
    box.appendChild(bars);
    var list = $("#bb-checks");
    list.textContent = "";
    var checks = B.checks(state);
    if (!checks.length) list.appendChild(el("li", { "class": "muted" }, "Score the options to see the checks."));
    checks.forEach(function (c) { list.appendChild(el("li", { "class": "is-" + c.level }, c.text)); });
  }

  /* ----- step 6: the decision ----- */
  function paintDecision() {
    var box = $("#bb-choice");
    box.textContent = "";
    Object.keys(B.CHOICES).forEach(function (k) {
      var b = el("button", { type: "button", role: "radio", "aria-checked": state.decision.choice === k ? "true" : "false", "data-choice": k, "class": "bb-choice-btn o-" + k }, B.CHOICES[k]);
      box.appendChild(b);
    });
    root.querySelectorAll("[data-note]").forEach(function (t) { t.value = state.decision[t.getAttribute("data-note")] || ""; });
  }

  function paintAll() { $("#bb-title").value = state.title; paintTable(); paintCosts(); paintDecision(); paintResult(); }
  function changed() { paintResult(); save(); }

  /* ----- edits ----- */
  root.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "bb-title") { state.title = t.value; save(); return; }
    if (t.hasAttribute("data-note")) { state.decision[t.getAttribute("data-note")] = t.value; save(); return; }
    if (t.getAttribute("data-f") === "name") { state.criteria[+t.getAttribute("data-i")].name = t.value; changed(); return; }
    if (t.getAttribute("data-f") === "weight") { var w = Math.round(+t.value); state.criteria[+t.getAttribute("data-i")].weight = isFinite(w) ? Math.min(100, Math.max(0, w)) : 0; changed(); return; }
    if (t.hasAttribute("data-c")) { var v = t.value.replace(/[$,\s]/g, ""); state.costs[t.getAttribute("data-o")][t.getAttribute("data-c")] = v === "" || !isFinite(+v) ? null : Math.max(0, Math.round(+v)); changed(); return; }
    if (t.hasAttribute("data-months")) { state.months[t.getAttribute("data-months")] = t.value === "" ? null : +t.value; changed(); }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.tagName === "SELECT" && t.hasAttribute("data-o")) { state.criteria[+t.getAttribute("data-i")][t.getAttribute("data-o")] = t.value === "" ? 0 : +t.value; changed(); }
    if (t.hasAttribute("data-c") && t.value) { var n = Number(t.value.replace(/[$,\s]/g, "")); if (isFinite(n)) t.value = Math.round(n).toLocaleString("en-US"); }
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-rm")) {
      state.criteria.splice(+b.getAttribute("data-rm"), 1); paintTable(); changed();
      var next = root.querySelector(".bb-table .sc-feat-name"); if (next) next.focus(); return;
    }
    if (b.hasAttribute("data-choice")) {
      var k = b.getAttribute("data-choice");
      state.decision.choice = state.decision.choice === k ? "" : k; paintDecision(); save(); track("bbp_decide"); return;
    }
    var act = b.getAttribute("data-bb");
    if (act === "add" && state.criteria.length < B.MAX_CRITERIA) {
      state.criteria.push(B.blankCriterion()); paintTable(); changed();
      var names = root.querySelectorAll(".bb-table .sc-feat-name"); names[names.length - 1].focus(); return;
    }
    if (act === "example") {
      if (hasWork(state) && !window.confirm("Replace your matrix with the worked example?")) return;
      if (window.PASave) PASave.forget("bbp");
      state = B.fromExample(); paintAll(); save(); track("bbp_example"); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over with a blank matrix? This clears the one saved in this browser.")) return;
      if (window.PASave) PASave.forget("bbp");
      state = B.blank(); paintAll(); save(); $("#bb-title").focus(); return;
    }
    if (act === "save") {
      if (window.PASave) PASave.go("bbp", B.encode(state), state.title, (function () { var r = B.results(state); return (r.leader.kind === "tie" ? r.leader.text : r.leader.text ? "Leading: " + r.leader.text : "Not scored yet") + (r.lowestCost.length ? " · Lowest cost: " + r.lowestCost.map(function (o) { return B.CHOICES[o]; }).join(", ") : ""); })());
      return;
    }
    if (act === "share") {
      var url = location.origin + location.pathname + "#m=" + B.encode(state), box = $("#bb-share"), input = $("#bb-share-url");
      input.value = url; box.hidden = false; input.select();
      var done = function (ok) { $("#bb-share-status").textContent = ok ? "Link copied. Paste it anywhere to share a copy." : "Copy the link above to share a copy."; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      track("bbp_share"); return;
    }
    if (act === "csv") {
      var blob = new Blob(["﻿" + B.toCSV(state)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: (state.title || "build-buy-partner").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".csv" });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      track("bbp_csv"); return;
    }
    if (act === "print") { track("bbp_print"); window.print(); }
  });

  load();
  paintAll();
})();
