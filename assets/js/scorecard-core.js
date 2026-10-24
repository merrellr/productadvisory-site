/* Feature Prioritization Scorecard: the scoring, with no page code, so it can be tested on its own
   (tests/scorecard.test.mjs). Used by assets/js/scorecard.js on /scorecard.

   A scorecard has criteria (a name, a weight from 0 to 5, and whether higher scores are better or, for a
   cost such as effort or risk, lower is better) and features scored 1 to 5 on each criterion. A feature's
   score is its weighted average, turned into 0 to 100: a cost criterion counts its score the other way
   round (1 is best). Everything stays in the browser; a shared link carries the scorecard in its #.

   RICE (Reach x Impact x Confidence / Effort, from Intercom) is a second way to rank the same features: each feature
   also has rice: { reach (people per period), impact (3, 2, 1, 0.5 or 0.25), confidence (%), effort (person-months) }.
   method says which tab is open: "weighted", "rice" or "compare" (both rankings side by side). */
(function (root) {
  "use strict";

  var MAX_CRITERIA = 8, MAX_FEATURES = 30, MAX_NAME = 80;

  var TEMPLATES = {
    balanced: { name: "Balanced", criteria: [
      ["Customer value", 5, false], ["Business impact", 4, false], ["Strategic fit", 3, false],
      ["Confidence", 3, false], ["Effort", 3, true], ["Risk", 2, true]] },
    customer: { name: "Customer-led", criteria: [
      ["Customer pain solved", 5, false], ["Number of customers affected", 4, false], ["Customer requests", 3, false],
      ["Confidence", 3, false], ["Effort", 3, true]] },
    growth: { name: "Growth", criteria: [
      ["Revenue impact", 5, false], ["New customers", 4, false], ["Retention", 4, false],
      ["Time to value", 2, false], ["Effort", 3, true], ["Risk", 2, true]] },
    ice: { name: "ICE (Impact, Confidence, Ease)", criteria: [
      ["Impact", 5, false], ["Confidence", 5, false], ["Ease", 5, false]] }
  };

  var EXAMPLE_FEATURES = [   // [name, weighted scores, RICE: reach, impact, confidence %, effort]
    ["Self-serve onboarding", [5, 4, 4, 4, 3, 2], [2000, 2, 80, 4]],
    ["Single sign-on (SSO)", [3, 4, 3, 5, 2, 1], [150, 3, 90, 3]],
    ["AI summary of usage", [4, 3, 5, 2, 4, 4], [1200, 1, 50, 2]],
    ["Bulk export", [3, 2, 2, 5, 1, 1], [900, 1, 100, 1]],
    ["Mobile app", [4, 3, 3, 2, 5, 4], [3000, 1, 50, 8]]
  ];
  var IMPACTS = [[3, "Massive"], [2, "High"], [1, "Medium"], [0.5, "Low"], [0.25, "Minimal"]];
  var CONFIDENCES = [[100, "High"], [80, "Medium"], [50, "Low"]];
  var METHODS = ["weighted", "rice", "compare"];
  var RICE_DEFAULT = { reach: 0, impact: 1, confidence: 80, effort: 1 };

  // A feature's RICE inputs, made safe: reach a whole number of people, impact on the RICE scale, confidence 0-100,
  // effort above zero (person-months, to one decimal).
  function cleanRice(r) {
    r = r && typeof r === "object" ? r : {};
    var n = function (v, d) { v = Number(v); return isFinite(v) ? v : d; };
    var impact = n(r.impact, 1);
    if (!IMPACTS.some(function (x) { return x[0] === impact; })) impact = 1;
    return { reach: Math.max(0, Math.min(1e9, Math.round(n(r.reach, 0)))), impact: impact,
      confidence: Math.max(0, Math.min(100, Math.round(n(r.confidence, 80)))), effort: Math.max(0.1, Math.min(1000, Math.round(n(r.effort, 1) * 10) / 10)) };
  }

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, MAX_NAME); }
  function clamp(n, lo, hi, dflt) { n = Math.round(Number(n)); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }

  // A fresh scorecard from a template, with or without the example features.
  function fromTemplate(key, withExamples) {
    var t = TEMPLATES[key] || TEMPLATES.balanced;
    var s = { title: "", method: "weighted", template: TEMPLATES[key] ? key : "balanced",
      criteria: t.criteria.map(function (c) { return { name: c[0], weight: c[1], cost: c[2] }; }), features: [] };
    if (withExamples) {
      s.features = EXAMPLE_FEATURES.map(function (f) {
        return { name: f[0], scores: s.criteria.map(function (c, i) { return f[1][i] || 3; }),
          rice: { reach: f[2][0], impact: f[2][1], confidence: f[2][2], effort: f[2][3] } };
      });
    }
    return s;
  }

  // Makes any input (saved, shared or typed) safe and complete: names cleaned, numbers in range, scores
  // lined up with the criteria, and the limits on how many of each.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var criteria = (Array.isArray(raw.criteria) ? raw.criteria : []).slice(0, MAX_CRITERIA).map(function (c) {
      c = c || {};
      return { name: clean(c.name) || "Criterion", weight: clamp(c.weight, 0, 5, 3), cost: !!c.cost };
    });
    if (!criteria.length) return fromTemplate("balanced", false);
    var features = (Array.isArray(raw.features) ? raw.features : []).slice(0, MAX_FEATURES).map(function (f) {
      f = f || {};
      var sc = Array.isArray(f.scores) ? f.scores : [];
      return { name: clean(f.name), scores: criteria.map(function (c, i) { return clamp(sc[i], 1, 5, 3); }), rice: cleanRice(f.rice || RICE_DEFAULT) };
    });
    return { title: clean(raw.title), method: METHODS.indexOf(raw.method) > -1 ? raw.method : "weighted",
      template: TEMPLATES[raw.template] ? raw.template : "custom", criteria: criteria, features: features };
  }

  /* The ranking. Returns the features (those with a name), best first:
     { index, name, score (0-100, one decimal), rank, parts: [{ criterion, points }] (each criterion's share
     of the score, in points), top (the criterion that adds most), closeCall (within CLOSE points of the
     next one) }. Ties share a rank. */
  var CLOSE = 5;
  function rank(state) {
    var s = normalize(state);
    var total = s.criteria.reduce(function (a, c) { return a + c.weight; }, 0);
    var rows = [];
    s.features.forEach(function (f, i) {
      if (!f.name) return;
      var parts = s.criteria.map(function (c, j) {
        var v = c.cost ? 6 - f.scores[j] : f.scores[j];          // 1..5, higher is better
        var pts = total ? c.weight * (v - 1) / (4 * total) * 100 : 0;
        return { criterion: c.name, points: pts };
      });
      var score = parts.reduce(function (a, p) { return a + p.points; }, 0);
      var top = parts.slice().sort(function (a, b) { return b.points - a.points; })[0];
      rows.push({ index: i, name: f.name, score: Math.round(score * 10) / 10,
        parts: parts.map(function (p) { return { criterion: p.criterion, points: Math.round(p.points * 10) / 10 }; }),
        top: top && top.points > 0 ? top.criterion : "" });
    });
    rows.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    rows.forEach(function (r, k) {
      r.rank = k && rows[k - 1].score === r.score ? rows[k - 1].rank : k + 1;
      var next = rows[k + 1], prev = rows[k - 1];
      r.closeCall = !!((next && r.score - next.score <= CLOSE && r.score !== next.score) || (prev && prev.score - r.score <= CLOSE && prev.score !== r.score));
    });
    return rows;
  }

  /* The RICE ranking: features (with a name), best first: { index, name, score, rank, closeCall, rice }.
     score = reach x impact x confidence / effort (confidence as a fraction). closeCall: within RICE_CLOSE (15%) of a neighbour: every RICE input is an estimate. */
  var RICE_CLOSE = 0.15;
  function riceScore(r) { return r.effort > 0 ? r.reach * r.impact * (r.confidence / 100) / r.effort : 0; }
  function rankRice(state) {
    var s = normalize(state), rows = [];
    s.features.forEach(function (f, i) {
      if (!f.name) return;
      var v = riceScore(f.rice);
      rows.push({ index: i, name: f.name, score: v >= 100 ? Math.round(v) : Math.round(v * 10) / 10, rice: f.rice });
    });
    rows.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    var near = function (a, b) { var hi = Math.max(a, b); return hi > 0 && a !== b && Math.abs(a - b) / hi <= RICE_CLOSE; };
    rows.forEach(function (r, k) {
      r.rank = k && rows[k - 1].score === r.score ? rows[k - 1].rank : k + 1;
      var next = rows[k + 1], prev = rows[k - 1];
      r.closeCall = !!((next && near(r.score, next.score)) || (prev && near(r.score, prev.score)));
    });
    return rows;
  }
  // True once RICE has been filled in: at least two named features with a reach.
  function hasRice(state) {
    return normalize(state).features.filter(function (f) { return f.name && f.rice.reach > 0; }).length >= 2;
  }
  /* Both rankings for each named feature: { name, weighted, rice, move } where move = weighted rank minus RICE rank
     (positive: it ranks higher with RICE). Ordered by the weighted ranking. */
  function compare(state) {
    var w = rank(state), r = rankRice(state), byIndex = {};
    r.forEach(function (x) { byIndex[x.index] = x; });
    return w.map(function (x) {
      var y = byIndex[x.index];
      return { index: x.index, name: x.name, weighted: x.rank, weightedScore: x.score, rice: y.rank, riceScore: y.score, move: x.rank - y.rank };
    });
  }

  // A spreadsheet (CSV) with the scores, ranks and criteria, ready for Google Sheets or Excel.
  function toCSV(state) {
    var s = normalize(state), ranked = rank(s);
    var q = function (v) { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var riceBy = {};
    rankRice(s).forEach(function (r) { riceBy[r.index] = r; });
    var head = ["Rank", "Feature", "Score (0-100)"].concat(s.criteria.map(function (c) { return c.name + " (weight " + c.weight + (c.cost ? ", lower is better" : "") + ")"; }))
      .concat(["RICE rank", "RICE score", "Reach", "Impact", "Confidence %", "Effort (person-months)"]);
    var lines = [head.map(q).join(",")];
    ranked.forEach(function (r) {
      var f = s.features[r.index], x = riceBy[r.index];
      lines.push([r.rank, r.name, r.score].concat(f.scores, [x.rank, x.score, f.rice.reach, f.rice.impact, f.rice.confidence, f.rice.effort]).map(q).join(","));
    });
    return lines.join("\r\n") + "\r\n";
  }

  // The scorecard in a link: compact JSON, base64url, after the #. Unicode-safe.
  function encode(state) {
    var s = normalize(state);
    var compact = { t: s.title, m: s.template, c: s.criteria.map(function (c) { return [c.name, c.weight, c.cost ? 1 : 0]; }),
      f: s.features.map(function (f) { return [f.name, f.scores.join(""), [f.rice.reach, f.rice.impact, f.rice.confidence, f.rice.effort]]; }) };
    if (s.method !== "weighted") compact.q = s.method;
    var bytes = new TextEncoder().encode(JSON.stringify(compact)), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    try {
      var b = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
      var bin = atob(b + "===".slice((b.length + 3) % 4)), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var o = JSON.parse(new TextDecoder().decode(bytes));
      return normalize({ title: o.t, template: o.m, method: o.q,
        criteria: (o.c || []).map(function (c) { return { name: c[0], weight: c[1], cost: !!c[2] }; }),
        features: (o.f || []).map(function (f) {
          var r = Array.isArray(f[2]) ? { reach: f[2][0], impact: f[2][1], confidence: f[2][2], effort: f[2][3] } : null;
          return { name: f[0], scores: String(f[1] || "").split("").map(Number), rice: r };
        }) });
    } catch (e) { return null; }
  }

  root.ScorecardCore = { TEMPLATES: TEMPLATES, MAX_CRITERIA: MAX_CRITERIA, MAX_FEATURES: MAX_FEATURES, CLOSE: CLOSE,
    IMPACTS: IMPACTS, CONFIDENCES: CONFIDENCES, METHODS: METHODS, RICE_DEFAULT: RICE_DEFAULT,
    fromTemplate: fromTemplate, normalize: normalize, rank: rank, rankRice: rankRice, riceScore: riceScore, hasRice: hasRice,
    compare: compare, cleanRice: cleanRice, toCSV: toCSV, encode: encode, decode: decode };
})(typeof window !== "undefined" ? window : globalThis);
