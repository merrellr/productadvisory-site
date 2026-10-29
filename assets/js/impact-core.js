/* Organizational Impact Score: the scoring, with no page code, so it can be tested on its own
   (tests/impact.test.mjs). Used by assets/js/impact.js on /impact-score. The same math as the fillable PDF and the
   Google Sheet / Excel version (assets/toolkits/organizational-impact-score.*):

     impact score     sum of (KPI weight x impact 0 to 5) divided by 5, so an average impact of 3 scores 60 (0 to 100)
     adjusted score   impact score x confidence (%) / 100
     rank             by adjusted score; equal scores share a rank
     suggested action Do now: adjusted 50 or more and ease 3 to 5. Big bet: 50 or more, ease 1 or 2.
                      Quick win: under 50, ease 4 or 5. Revisit: everything else.
   Weights should total 100. A blank impact cell means the KPI doesn't apply (it counts as 0).
   Everything stays in the browser; a shared link carries the whole sheet in its #. */
(function (root) {
  "use strict";

  var MAX_KPIS = 10, MAX_ITEMS = 6, MAX_NAME = 80, MAX_NOTE = 600;
  var HIGH = 50, DO_NOW_EASE = 3, QUICK_EASE = 4, TIE = 5;
  var CONFIDENCE = [[100, "Backed by data"], [90, "Strong evidence"], [75, "Informed estimate"], [60, "Some evidence"], [50, "Mostly a guess"]];
  var DEFAULT_KPIS = [
    ["Revenue growth", 20, "New and expansion revenue"],
    ["Customer retention and satisfaction", 15, "Churn, renewals, NPS"],
    ["Cost savings and efficiency", 15, "Hours saved, cost avoided"],
    ["Strategic alignment", 15, "Fit with top company priorities"],
    ["Market reach and competitive position", 10, "New segments, win rate"],
    ["Risk and compliance reduction", 10, "Incidents, audit findings"],
    ["Team productivity and engagement", 10, "Cycle time, capacity freed"],
    ["Learning and data value", 5, "New insight or reusable capability"]
  ];
  var ACTIONS = {
    "do-now": { name: "Do now", step: "High impact and doable: start it now." },
    "big-bet": { name: "Big bet", step: "High impact but hard to deliver: plan it, fund it and stage it." },
    "quick-win": { name: "Quick win", step: "Smaller impact but easy: fit it in alongside the bigger work." },
    "revisit": { name: "Revisit", step: "Not now. Rescore when something changes, or drop it." }
  };
  // The worked example in the PDF and spreadsheet: annual roadmap planning for a B2B software product team.
  var EXAMPLE = {
    title: "Annual roadmap planning (example)",
    items: [   // [name, confidence, ease, impact on each default KPI]
      ["Self-serve onboarding", 80, 3, [5, 5, 2, 4, 3, 0, 1, 3]],
      ["Usage dashboard", 70, 3, [3, 4, 1, 3, 2, 0, 1, 5]],
      ["SSO and audit logs", 90, 2, [4, 4, 1, 4, 4, 5, 0, 1]],
      ["Release automation", 90, 4, [0, 1, 4, 3, 0, 3, 5, 2]],
      ["AI assistant", 50, 2, [1, 3, 4, 3, 2, 1, 3, 4]],
      ["Marketplace", 60, 4, [3, 1, 0, 2, 5, 0, 1, 2]]
    ]
  };

  function clean(s, max) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max || MAX_NAME); }
  function note(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").slice(0, MAX_NOTE); }
  function int(n, lo, hi, dflt) { n = Math.round(Number(n)); return isFinite(n) && n >= lo && n <= hi ? n : dflt; }
  function impactCell(v) { return v === "" || v == null ? null : int(v, 0, 5, null); }
  var round1 = function (v) { return Math.round(v * 10) / 10; };

  function defaultKpis() { return DEFAULT_KPIS.map(function (k) { return { name: k[0], weight: k[1], measure: k[2] }; }); }
  function blankItem(n) { var imp = []; for (var i = 0; i < n; i++) imp.push(null); return { name: "", confidence: 75, ease: 0, impacts: imp }; }
  function blank() { var k = defaultKpis(); return { title: "", kpis: k, items: [blankItem(k.length)], decision: {} }; }
  function fromExample() {
    var k = defaultKpis();
    return { title: EXAMPLE.title, kpis: k, decision: {}, items: EXAMPLE.items.map(function (e) { return { name: e[0], confidence: e[1], ease: e[2], impacts: e[3].slice() }; }) };
  }

  // Makes any input (saved, shared or typed) safe and complete. Each initiative has one impact per KPI.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var kpis = (Array.isArray(raw.kpis) ? raw.kpis : defaultKpis()).slice(0, MAX_KPIS).map(function (k) {
      k = k || {};
      return { name: clean(k.name), weight: int(k.weight, 0, 100, 0), measure: clean(k.measure, 120) };
    });
    var items = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS).map(function (it) {
      it = it || {};
      var imp = Array.isArray(it.impacts) ? it.impacts : [];
      return { name: clean(it.name), confidence: int(it.confidence, 0, 100, 75), ease: int(it.ease, 0, 5, 0),
        impacts: kpis.map(function (_, j) { return impactCell(imp[j]); }) };
    });
    var d = raw.decision && typeof raw.decision === "object" ? raw.decision : {};
    return { title: clean(raw.title, 100), kpis: kpis, items: items,
      decision: { top: note(d.top), sequence: note(d.sequence), notNow: note(d.notNow), assumptions: note(d.assumptions) } };
  }

  function totalWeight(s) { return s.kpis.reduce(function (t, k) { return t + k.weight; }, 0); }

  function actionFor(adjusted, ease) {
    if (!ease) return null;
    if (adjusted >= HIGH) return ease >= DO_NOW_EASE ? "do-now" : "big-bet";
    return ease >= QUICK_EASE ? "quick-win" : "revisit";
  }

  // Scores every named initiative that has at least one impact entered, with the KPI weights given (or the sheet's).
  function scoreWith(s, weights) {
    var rows = [];
    s.items.forEach(function (it, i) {
      if (!it.name || !it.impacts.some(function (v) { return v != null; })) return;
      var sum = 0, top = null;
      it.impacts.forEach(function (v, j) {
        if (v == null) return;
        var part = weights[j] * v;
        sum += part;
        if (part > 0 && (!top || part > top.part)) top = { part: part, kpi: s.kpis[j].name };
      });
      var impact = sum / 5, adjusted = impact * it.confidence / 100;
      rows.push({ index: i, name: it.name, impact: round1(impact), confidence: it.confidence, adjusted: round1(adjusted), ease: it.ease,
        driver: top ? top.kpi : "" });
    });
    return rows;
  }

  /* The ranking: [{ index, name, impact, confidence, adjusted, ease, rank, action (key or null when ease is missing),
     actionName, step, driver (the KPI that contributes most), tiedWith (names within 5 points), hypothesis }], best first.
     Ties share a rank and keep the order they were entered in. */
  function rank(state) {
    var s = normalize(state);
    var rows = scoreWith(s, s.kpis.map(function (k) { return k.weight; }));
    rows.sort(function (a, b) { return b.adjusted - a.adjusted || a.index - b.index; });
    rows.forEach(function (r, k) {
      r.rank = k && rows[k - 1].adjusted === r.adjusted ? rows[k - 1].rank : k + 1;
      r.action = actionFor(r.adjusted, r.ease);
      r.actionName = r.action ? ACTIONS[r.action].name : "Enter ease";
      r.step = r.action ? ACTIONS[r.action].step : "Add how easy it is to deliver (1 to 5) to get a suggested action.";
      r.tiedWith = rows.filter(function (o) { return o !== r && Math.abs(o.adjusted - r.adjusted) <= TIE; }).map(function (o) { return o.name; });
      r.hypothesis = r.adjusted >= HIGH && r.confidence <= 50;
    });
    return rows;
  }

  /* Checks before you commit: the weight total, any single weight over 30, ties, high scores on a guess, and
     whether the order changes when the two heaviest KPI weights move by 5 points either way. */
  function checks(state) {
    var s = normalize(state), out = [], total = totalWeight(s), rows = rank(s);
    if (total !== 100) out.push({ level: "warn", text: "KPI weights total " + total + ". Make them add up to 100 so the scores mean the same thing from one review to the next." });
    var heavy = s.kpis.filter(function (k) { return k.weight > 30; });
    if (heavy.length) out.push({ level: "warn", text: heavy.map(function (k) { return k.name || "A KPI"; }).join(" and ") + " carries more than 30. Keep any single weight at 30 or less so one measure can't decide everything." });
    if (rows.length > 1) {
      var order = rows.map(function (r) { return r.index; }).join(), heaviest = s.kpis.map(function (k, j) { return [k.weight, j]; })
        .filter(function (p) { return p[0] > 0; }).sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; }).slice(0, 2);
      var sensitive = false;
      heaviest.forEach(function (p) {
        [-5, 5].forEach(function (d) {
          var w = s.kpis.map(function (k) { return k.weight; }); w[p[1]] = Math.max(0, w[p[1]] + d);
          var alt = scoreWith(s, w).sort(function (a, b) { return b.adjusted - a.adjusted || a.index - b.index; }).map(function (r) { return r.index; }).join();
          if (alt !== order) sensitive = true;
        });
      });
      out.push(sensitive
        ? { level: "warn", text: "The order changes when your two heaviest weights move by 5 points. The ranking is sensitive, so agree on the weights before you commit." }
        : { level: "ok", text: "The order holds when your two heaviest weights move by 5 points either way." });
      var pairs = rows.slice(1).filter(function (r, k) { return Math.abs(rows[k].adjusted - r.adjusted) <= TIE; })
        .map(function (r) { var above = rows[rows.indexOf(r) - 1]; return above.name + " and " + r.name; });
      if (pairs.length) out.push({ level: "info", text: "Within 5 points, so effectively tied: " + pairs.join("; ") + ". Use ease, dependencies and timing to choose between them." });
    }
    rows.filter(function (r) { return r.hypothesis; }).forEach(function (r) {
      out.push({ level: "info", text: r.name + " scores high on only " + r.confidence + "% confidence. Treat it as a hypothesis and find the cheapest test first." });
    });
    return out;
  }

  function counts(state) {
    var c = { "do-now": 0, "big-bet": 0, "quick-win": 0, "revisit": 0 };
    rank(state).forEach(function (r) { if (r.action) c[r.action]++; });
    return c;
  }

  function csvCell(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  // A spreadsheet (CSV): the ranking, then the scores behind it, then the decision.
  function toCSV(state) {
    var s = normalize(state), rows = rank(s), L = [];
    var line = function (a) { L.push(a.map(csvCell).join(",")); };
    if (s.title) { line(["Organizational Impact Score", s.title]); line([]); }
    line(["Rank", "Initiative", "Impact score (0-100)", "Confidence (%)", "Adjusted score", "Ease (1-5)", "Suggested action", "Biggest contributor"]);
    rows.forEach(function (r) { line([r.rank, r.name, r.impact, r.confidence, r.adjusted, r.ease || "", r.actionName, r.driver]); });
    line([]);
    line(["KPI", "Weight"].concat(s.items.map(function (it, i) { return it.name || "Initiative " + (i + 1); })));
    s.kpis.forEach(function (k, j) { line([k.name, k.weight].concat(s.items.map(function (it) { return it.impacts[j] == null ? "" : it.impacts[j]; }))); });
    line(["Total weight", totalWeight(s)]);
    var d = s.decision;
    if (d.top || d.sequence || d.notNow || d.assumptions) {
      line([]);
      [["Top priority", d.top], ["Sequencing and dependencies", d.sequence], ["Not now, and why", d.notNow], ["Assumptions to test first", d.assumptions]]
        .forEach(function (p) { if (p[1]) line([p[0], p[1]]); });
    }
    return L.join("\r\n") + "\r\n";
  }

  // The sheet in a link: compact JSON, base64url, after the #. Unicode-safe.
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(str) {
    var b = String(str || "").replace(/-/g, "+").replace(/_/g, "/"), bin = atob(b + "===".slice((b.length + 3) % 4)), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encode(state) {
    var s = normalize(state), d = s.decision;
    return b64(JSON.stringify({ t: s.title, k: s.kpis.map(function (k) { return [k.name, k.weight, k.measure]; }),
      i: s.items.map(function (it) { return [it.name, it.confidence, it.ease, it.impacts.map(function (v) { return v == null ? "-" : v; }).join("")]; }),
      d: [d.top, d.sequence, d.notNow, d.assumptions] }));
  }
  function decode(str) {
    try {
      var o = JSON.parse(unb64(str)), d = o.d || [];
      return normalize({ title: o.t, kpis: (o.k || []).map(function (k) { return { name: k[0], weight: k[1], measure: k[2] }; }),
        items: (o.i || []).map(function (it) { return { name: it[0], confidence: it[1], ease: it[2], impacts: String(it[3] || "").split("").map(function (c) { return c === "-" ? null : c; }) }; }),
        decision: { top: d[0], sequence: d[1], notNow: d[2], assumptions: d[3] } });
    } catch (e) { return null; }
  }

  root.ImpactCore = { MAX_KPIS: MAX_KPIS, MAX_ITEMS: MAX_ITEMS, HIGH: HIGH, DO_NOW_EASE: DO_NOW_EASE, QUICK_EASE: QUICK_EASE, ACTIONS: ACTIONS, CONFIDENCE: CONFIDENCE,
    blank: blank, blankItem: blankItem, defaultKpis: defaultKpis, fromExample: fromExample, normalize: normalize, totalWeight: totalWeight,
    rank: rank, checks: checks, counts: counts, toCSV: toCSV, encode: encode, decode: decode };
})(typeof window !== "undefined" ? window : globalThis);
