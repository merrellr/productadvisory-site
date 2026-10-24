/* AI Use Case Prioritization (/ai-use-cases): the page. The scoring lives in ai-usecases-core.js.
   One table of ideas; the map, the first pilot and the plan update as you go. The list is saved in this browser;
   "Share a link" puts a copy of it in the link's #. */
(function () {
  "use strict";
  var A = window.AIUseCaseCore, root = document.getElementById("usecases");
  if (!A || !root) return;
  var KEY = "pa_ai_usecases";
  var $ = function (sel) { return root.querySelector(sel); };
  var state;

  function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { return null; } }
  function save() { store(JSON.stringify(state)); }
  function track(name) { try { if (window.gtag) window.gtag("event", name, { tool: "ai_use_cases" }); } catch (e) { /* no analytics */ } }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ----- load: a shared link, else what was saved here, else the example ----- */
  function load() {
    var m = location.hash.match(/^#u=([A-Za-z0-9_-]+)$/), shared = m ? A.decode(m[1]) : null;
    var saved = null;
    try { saved = store() ? A.normalize(JSON.parse(store())) : null; } catch (e) { saved = null; }
    if (shared) {
      history.replaceState(null, "", location.pathname);
      if (!saved || !saved.cases.some(function (c) { return c.name; }) || window.confirm("Open the shared list? It replaces the one saved in this browser.")) {
        state = shared; save(); track("ai_usecases_open_shared"); return;
      }
    }
    state = saved || A.fromExample();
  }

  /* ----- step 2: the table ----- */
  function paintTable() {
    var t = $("#uc-table");
    t.textContent = "";
    var head = el("thead"), hr = el("tr");
    hr.appendChild(el("th", { scope: "col" }, "AI idea"));
    A.FACTORS.forEach(function (f) {
      var th = el("th", { scope: "col", title: f.q });
      th.appendChild(el("span", { "class": "sc-th-name" }, f.name));
      if (f.cost) th.appendChild(el("small", { "class": "sc-th-cost" }, "lower is better"));
      hr.appendChild(th);
    });
    hr.appendChild(el("th", { scope: "col" }, ""));
    head.appendChild(hr);
    var body = el("tbody");
    state.cases.forEach(function (c, i) {
      var tr = el("tr"), th = el("th", { scope: "row" });
      var name = el("input", { "class": "sc-feat-name", maxlength: "100", placeholder: "Describe the AI idea", "data-i": i, "aria-label": "Idea " + (i + 1) });
      name.value = c.name;
      th.appendChild(name); tr.appendChild(th);
      A.FACTORS.forEach(function (f) {
        var td = el("td"), sel = el("select", { "data-i": i, "data-k": f.key, "aria-label": (c.name || "Idea " + (i + 1)) + ": " + f.name + " (" + f.q + ")" });
        for (var v = 1; v <= 5; v++) { var o = el("option", { value: v }, String(v)); if (c[f.key] === v) o.selected = true; sel.appendChild(o); }
        td.appendChild(sel); tr.appendChild(td);
      });
      var td = el("td");
      td.appendChild(el("button", { type: "button", "class": "sc-x", "data-rm": i, "aria-label": "Remove " + (c.name || "idea " + (i + 1)) }, "×"));
      tr.appendChild(td);
      body.appendChild(tr);
    });
    if (!state.cases.length) {
      var empty = el("tr"); empty.appendChild(el("td", { colspan: A.FACTORS.length + 2, "class": "muted sc-empty" }, "No ideas yet. Add one, or fill in an example to see how it works."));
      body.appendChild(empty);
    }
    t.append(head, body);
    $('[data-uc="add"]').disabled = state.cases.length >= A.MAX_CASES;
  }

  /* ----- step 3: the map ----- */
  var QUADS = [["bet", "Strategic bets", 0, 0], ["quick-win", "Quick wins", 1, 0], ["not-now", "Not now", 0, 1], ["easy", "Easy experiments", 1, 1]];
  function paintMatrix(rows) {
    var S = 300, pad = 28, inner = S - pad - 8, x = function (f) { return pad + f / 100 * inner; }, y = function (v) { return 8 + (100 - v) / 100 * inner; };
    var svg = '<svg class="uc-map" viewBox="0 0 ' + S + " " + (S + 6) + '" role="img" aria-label="AI ideas placed by value (up) and feasibility (right); ' +
      esc(rows.map(function (r) { return r.rank + ": " + r.name + ", " + r.quadrantName; }).join("; ")) + '">';
    QUADS.forEach(function (q) {
      var qx = pad + q[2] * inner / 2, qy = 8 + q[3] * inner / 2;
      svg += '<rect x="' + qx + '" y="' + qy + '" width="' + inner / 2 + '" height="' + inner / 2 + '" class="uc-q-bg q-' + q[0] + '"/>' +
        '<text x="' + (qx + (q[2] ? inner / 2 - 8 : 8)) + '" y="' + (qy + (q[3] ? inner / 2 - 8 : 18)) + '" text-anchor="' + (q[2] ? "end" : "start") + '" class="uc-q-lbl q-' + q[0] + '">' + q[1].toUpperCase() + "</text>";
    });
    svg += '<line x1="' + pad + '" y1="' + (8 + inner) + '" x2="' + (pad + inner) + '" y2="' + (8 + inner) + '" class="uc-axis"/><line x1="' + pad + '" y1="8" x2="' + pad + '" y2="' + (8 + inner) + '" class="uc-axis"/>' +
      '<text x="' + (pad + inner / 2) + '" y="' + (S + 4) + '" text-anchor="middle" class="uc-axis-lbl">FEASIBILITY →</text>' +
      '<text transform="translate(12 ' + (8 + inner / 2) + ') rotate(-90)" text-anchor="middle" class="uc-axis-lbl">VALUE →</text>';
    var seen = {};
    rows.slice().reverse().forEach(function (r) {   // best drawn last, on top
      var cx = x(r.feasibility), cy = y(r.value), k = Math.round(cx) + "," + Math.round(cy), n = seen[k] = (seen[k] || 0) + 1;
      if (n > 1) { cx += (n - 1) * 9; cy -= (n - 1) * 9; }   // the same spot: fan out
      cx = Math.min(Math.max(cx, pad + 12), pad + inner - 12); cy = Math.min(Math.max(cy, 38), 8 + inner - 28);   // clear of the corner labels
      svg += '<g class="uc-dot q-' + r.quadrant + '">' + (r.highRisk ? '<circle cx="' + cx + '" cy="' + cy + '" r="16" class="uc-risk-ring"/>' : "") +
        '<circle cx="' + cx + '" cy="' + cy + '" r="11"/><text x="' + cx + '" y="' + (cy + 4.5) + '" text-anchor="middle">' + r.rank + "</text></g>";
    });
    $("#uc-matrix").innerHTML = svg + "</svg>";
    var counts = A.counts(state), legend = $("#uc-legend");
    legend.textContent = "";
    [["quick-win", "Quick wins"], ["bet", "Strategic bets"], ["easy", "Easy experiments"], ["not-now", "Not now"]].forEach(function (q) {
      var li = el("li", { "class": "q-" + q[0] });
      li.append(el("i", { "aria-hidden": "true" }), document.createTextNode(q[1] + " "), el("b", {}, String(counts[q[0]])));
      legend.appendChild(li);
    });
    if (rows.some(function (r) { return r.highRisk; })) {
      var li = el("li", { "class": "uc-legend-risk" });
      li.append(el("i", { "aria-hidden": "true" }), document.createTextNode("Ringed: high risk"));
      legend.appendChild(li);
    }
  }

  /* ----- the first pilot ----- */
  function paintPilot(rows) {
    var box = $("#uc-pilot"), p = A.firstPilot(state);
    box.textContent = "";
    box.appendChild(el("span", { "class": "uc-pilot-label" }, "Start here"));
    if (!rows.length) { box.appendChild(el("p", { "class": "muted" }, "Name an idea and score it to see where to start.")); return; }
    if (!p) {
      var best = rows[0];
      box.appendChild(el("h3", {}, "No quick win yet"));
      box.appendChild(el("p", {}, best.quadrant === "bet"
        ? "Your strongest idea, " + best.name + ", isn't feasible yet. " + best.step
        : "None of these is both valuable and feasible today. Add more ideas, or talk to the people who'd use them: the best AI ideas usually come from the work itself."));
      return;
    }
    box.appendChild(el("h3", {}, p.name));
    box.appendChild(el("p", {}, "Pilot it: one team, four to six weeks, and one number to judge it by, such as hours saved a week or tickets resolved."));
    if (p.highRisk) box.appendChild(el("p", { "class": "uc-warn" }, p.guardrails));
    var n = rows.filter(function (r) { return r.quadrant === "quick-win"; }).length;
    if (n > 1) box.appendChild(el("p", { "class": "muted" }, "Then the next quick win. Run them one at a time, so you know what worked."));
  }

  /* ----- step 4: the plan ----- */
  function paintPlan(rows) {
    var list = $("#uc-plan");
    list.textContent = "";
    if (!rows.length) { list.appendChild(el("li", { "class": "muted sc-none" }, "Name an idea to see it here.")); return; }
    rows.forEach(function (r) {
      var li = el("li", { "class": "uc-row q-" + r.quadrant });
      li.appendChild(el("span", { "class": "sc-rank", "aria-label": "Rank " + r.rank }, String(r.rank)));
      var main = el("div", { "class": "sc-res-main" });
      var line = el("div", { "class": "sc-res-line" });
      var name = el("b", {}, r.name);
      line.append(name, el("span", { "class": "sc-score", title: "Priority, 0 to 100" }, String(r.priority)));
      var tags = el("div", { "class": "uc-tags" });
      tags.appendChild(el("span", { "class": "uc-tag q-" + r.quadrant }, r.quadrantName));
      tags.appendChild(el("span", { "class": "uc-meta" }, "Value " + Math.round(r.value) + " · Feasibility " + Math.round(r.feasibility)));
      if (r.highRisk) tags.appendChild(el("span", { "class": "uc-tag uc-tag-risk" }, "High risk"));
      main.append(line, tags, el("p", { "class": "uc-step" }, r.step));
      if (r.highRisk) main.appendChild(el("p", { "class": "uc-warn" }, r.guardrails));
      li.appendChild(main);
      list.appendChild(li);
    });
  }

  function paintResults() { var rows = A.rank(state); paintMatrix(rows); paintPilot(rows); paintPlan(rows); }
  function paintAll() { $("#uc-title").value = state.title; paintTable(); paintResults(); }
  function changed() { paintResults(); save(); }

  /* ----- edits ----- */
  root.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "uc-title") { state.title = t.value; save(); return; }
    if (t.classList.contains("sc-feat-name")) { state.cases[+t.getAttribute("data-i")].name = t.value; changed(); }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.tagName === "SELECT" && t.hasAttribute("data-k")) { state.cases[+t.getAttribute("data-i")][t.getAttribute("data-k")] = +t.value; changed(); }
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-rm")) {
      state.cases.splice(+b.getAttribute("data-rm"), 1); paintTable(); changed();
      var next = root.querySelector(".sc-feat-name"); if (next) next.focus(); return;
    }
    var act = b.getAttribute("data-uc");
    if (act === "add" && state.cases.length < A.MAX_CASES) {
      state.cases.push(A.blankCase()); paintTable(); changed();
      var names = root.querySelectorAll(".sc-feat-name"); names[names.length - 1].focus(); return;
    }
    if (act === "example") {
      if (state.cases.some(function (c) { return c.name; }) && !window.confirm("Replace your ideas with the example?")) return;
      var ex = A.fromExample(); ex.title = state.title; state = ex; paintAll(); save(); track("ai_usecases_example"); return;
    }
    if (act === "reset") {
      if (!window.confirm("Start over with a blank list? This clears the one saved in this browser.")) return;
      state = { title: "", cases: [A.blankCase()] }; paintAll(); save(); $("#uc-title").focus(); return;
    }
    if (act === "share") {
      var url = location.origin + location.pathname + "#u=" + A.encode(state), box = $("#uc-share"), input = $("#uc-share-url");
      input.value = url; box.hidden = false; input.select();
      var done = function (ok) { $("#uc-share-status").textContent = ok ? "Link copied. Paste it anywhere to share a copy." : "Copy the link above to share a copy."; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      track("ai_usecases_share"); return;
    }
    if (act === "csv") {
      var blob = new Blob(["﻿" + A.toCSV(state)], { type: "text/csv;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(blob), download: (state.title || "ai-use-cases").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".csv" });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      track("ai_usecases_csv"); return;
    }
    if (act === "print") { track("ai_usecases_print"); window.print(); }
  });

  load();
  paintAll();
})();
