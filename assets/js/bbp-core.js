/* Build, Buy, or Partner Decision Matrix: the scoring, with no page code, so it can be tested on its own
   (tests/bbp.test.mjs). Used by assets/js/bbp.js on /build-buy-partner. The same math as the fillable PDF and the
   Google Sheet / Excel version (assets/toolkits/build-buy-partner-matrix.*):

     weighted score   weight x score (1 to 5) / 100 for each criterion; the total is out of 5.00
     leading option   the top total, unless another is within 0.25 points: then "too close to call"
     three-year cost  upfront + years 1 to 3 + integration and migration + training and change management
   For cost, risk and effort criteria, 5 means lowest cost, lowest risk or lowest effort. Weights should total 100.
   A blank score leaves that criterion out for that option. Everything stays in the browser; a shared link carries the
   whole matrix in its #. */
(function (root) {
  "use strict";

  var OPTIONS = [{ key: "build", name: "Build" }, { key: "buy", name: "Buy" }, { key: "partner", name: "Partner" }];
  var KEYS = OPTIONS.map(function (o) { return o.key; });
  var MAX_CRITERIA = 12, MAX_NAME = 80, MAX_NOTE = 600, MAX_COST = 1e10, TIE = 0.25;
  var DEFAULT_CRITERIA = [
    ["Strategic differentiation", "Does this capability set you apart from competitors?", 15],
    ["Time to market", "How quickly can customers get value?", 15],
    ["Total cost of ownership", "Three-year cost. 5 = lowest cost.", 12],
    ["Fit to requirements", "How well does it meet your must-haves?", 10],
    ["Control and roadmap flexibility", "Can you shape the features and the timing?", 8],
    ["Delivery and vendor risk", "Execution, vendor, security, regulatory. 5 = lowest risk.", 10],
    ["Team capacity and skills", "Do you have the people and skills right now?", 8],
    ["Integration and data effort", "Effort to connect to your stack. 5 = lowest effort.", 8],
    ["Scalability and long-term viability", "Will it hold up as you grow?", 8],
    ["Exit flexibility", "How easily could you switch later? 5 = easiest.", 6]
  ];
  var COSTS = [
    { key: "upfront", name: "Upfront cost", hint: "Build effort, licenses, implementation, setup fees" },
    { key: "y1", name: "Year 1 ongoing", hint: "Maintenance, support, subscription, hosting, staffing" },
    { key: "y2", name: "Year 2 ongoing", hint: "Same categories as year 1" },
    { key: "y3", name: "Year 3 ongoing", hint: "Same categories as year 1" },
    { key: "integration", name: "Integration and migration", hint: "Connecting systems and moving data" },
    { key: "training", name: "Training and change management", hint: "Getting teams and customers ready" }
  ];
  var COST_KEYS = COSTS.map(function (c) { return c.key; });
  var CHOICES = { build: "Build", buy: "Buy", partner: "Partner", hybrid: "Hybrid or phased" };
  // The worked example in the PDF and spreadsheet: a customer analytics dashboard inside a B2B software product.
  var EXAMPLE = {
    title: "Customer analytics dashboard (example)",
    scores: [[4, 2, 3], [2, 5, 4], [2, 4, 3], [5, 3, 4], [5, 2, 3], [2, 4, 3], [2, 4, 4], [3, 3, 4], [4, 4, 3], [5, 2, 3]],
    costs: { build: [220000, 60000, 60000, 60000, 20000, 10000], buy: [40000, 90000, 95000, 100000, 35000, 15000], partner: [80000, 70000, 70000, 70000, 25000, 10000] },
    months: { build: 9, buy: 3, partner: 5 },
    decision: { choice: "partner", why: "Lowest three-year cost, the second-fastest path to value, and the top score by a hair. Build is slowest and most expensive.",
      tripwires: "The partner raises prices more than 15 percent, misses the five-month milestone, or usage doubles the forecast." }
  };

  function clean(s, max) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max || MAX_NAME); }
  function note(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").slice(0, MAX_NOTE); }
  function int(n, lo, hi, dflt) { n = Math.round(Number(n)); return isFinite(n) && n >= lo && n <= hi ? n : dflt; }
  function score(v) { return v === "" || v == null ? 0 : int(v, 0, 5, 0); }
  function money(v) { if (v === "" || v == null) return null; var n = Number(String(v).replace(/[$,\s]/g, "")); return isFinite(n) && n >= 0 ? Math.min(Math.round(n), MAX_COST) : null; }
  var round2 = function (v) { return Math.round(v * 100) / 100; };

  function blankCriterion() { return { name: "", hint: "", weight: 0, build: 0, buy: 0, partner: 0 }; }
  function emptyCosts() { var c = {}; KEYS.forEach(function (o) { c[o] = {}; COST_KEYS.forEach(function (k) { c[o][k] = null; }); }); return c; }
  function blank() {
    return { title: "", criteria: DEFAULT_CRITERIA.map(function (c) { return { name: c[0], hint: c[1], weight: c[2], build: 0, buy: 0, partner: 0 }; }),
      costs: emptyCosts(), months: { build: null, buy: null, partner: null }, decision: {} };
  }
  function fromExample() {
    var s = blank();
    s.title = EXAMPLE.title;
    s.criteria.forEach(function (c, i) { KEYS.forEach(function (o, j) { c[o] = EXAMPLE.scores[i][j]; }); });
    KEYS.forEach(function (o) { COST_KEYS.forEach(function (k, j) { s.costs[o][k] = EXAMPLE.costs[o][j]; }); s.months[o] = EXAMPLE.months[o]; });
    s.decision = { choice: EXAMPLE.decision.choice, why: EXAMPLE.decision.why, tripwires: EXAMPLE.decision.tripwires };
    return normalize(s);
  }

  // Makes any input (saved, shared or typed) safe and complete.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var crit = (Array.isArray(raw.criteria) ? raw.criteria : blank().criteria).slice(0, MAX_CRITERIA).map(function (c) {
      c = c || {};
      var out = { name: clean(c.name), hint: clean(c.hint, 120), weight: int(c.weight, 0, 100, 0) };
      KEYS.forEach(function (o) { out[o] = score(c[o]); });
      return out;
    });
    var costs = emptyCosts(), rc = raw.costs && typeof raw.costs === "object" ? raw.costs : {};
    KEYS.forEach(function (o) { COST_KEYS.forEach(function (k) { costs[o][k] = money((rc[o] || {})[k]); }); });
    var months = {}, rm = raw.months && typeof raw.months === "object" ? raw.months : {};
    KEYS.forEach(function (o) { var m = rm[o] === "" || rm[o] == null ? null : Number(rm[o]); months[o] = isFinite(m) && m >= 0 && m <= 240 ? Math.round(m * 10) / 10 : null; });
    var d = raw.decision && typeof raw.decision === "object" ? raw.decision : {};
    return { title: clean(raw.title, 100), criteria: crit, costs: costs, months: months,
      decision: { choice: CHOICES[d.choice] ? d.choice : "", why: note(d.why), risks: note(d.risks), tripwires: note(d.tripwires), next: note(d.next) } };
  }

  function totalWeight(s) { return s.criteria.reduce(function (t, c) { return t + c.weight; }, 0); }

  function totalsWith(s, weights) {
    var t = { build: 0, buy: 0, partner: 0 }, any = { build: false, buy: false, partner: false };
    s.criteria.forEach(function (c, i) { KEYS.forEach(function (o) { if (weights[i] > 0 && c[o] > 0) { t[o] += weights[i] * c[o] / 100; any[o] = true; } }); });
    KEYS.forEach(function (o) { t[o] = any[o] ? round2(t[o]) : null; });
    return t;
  }

  function leaderOf(t) {
    var scored = KEYS.filter(function (o) { return t[o] != null && t[o] > 0; });
    if (!scored.length) return { kind: "none", options: [], text: "" };
    var max = Math.max.apply(null, scored.map(function (o) { return t[o]; }));
    var near = scored.filter(function (o) { return round2(max - t[o]) <= TIE; });
    var names = near.map(function (o) { return CHOICES[o]; });
    return near.length === 1 ? { kind: "clear", options: near, text: names[0] }
      : { kind: "tie", options: near, text: "Too close to call: " + names.join(", ") };
  }
  function topOf(t) {
    var best = null;
    KEYS.forEach(function (o) { if (t[o] != null && (best == null || t[o] > t[best])) best = o; });
    return best;
  }

  /* Everything the results panel shows: { totalWeight, totals {build,buy,partner} (out of 5, or null), percent,
     leader {kind clear|tie|none, options, text}, costTotal (or null), lowestCost (option keys), costDiff, fastest,
     months, contributions (per option: the criterion that adds most) }. */
  function results(state) {
    var s = normalize(state), w = s.criteria.map(function (c) { return c.weight; }), totals = totalsWith(s, w), percent = {}, costTotal = {}, contributions = {};
    KEYS.forEach(function (o) {
      percent[o] = totals[o] == null ? null : Math.round(totals[o] / 5 * 100);
      var vals = COST_KEYS.map(function (k) { return s.costs[o][k]; }).filter(function (v) { return v != null; });
      costTotal[o] = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) : null;
      var top = null;
      s.criteria.forEach(function (c) { var p = c.weight * c[o] / 100; if (p > 0 && (!top || p > top.part)) top = { part: p, name: c.name }; });
      contributions[o] = top ? top.name : "";
    });
    var costed = KEYS.filter(function (o) { return costTotal[o] != null; });
    var minCost = costed.length ? Math.min.apply(null, costed.map(function (o) { return costTotal[o]; })) : null;
    var costDiff = {};
    KEYS.forEach(function (o) { costDiff[o] = costTotal[o] == null ? null : costTotal[o] - minCost; });
    var timed = KEYS.filter(function (o) { return s.months[o] != null; });
    var minMonths = timed.length ? Math.min.apply(null, timed.map(function (o) { return s.months[o]; })) : null;
    return { totalWeight: totalWeight(s), totals: totals, percent: percent, leader: leaderOf(totals), costTotal: costTotal,
      lowestCost: costed.length > 1 ? costed.filter(function (o) { return costTotal[o] === minCost; }) : [], costDiff: costDiff,
      fastest: timed.length > 1 ? timed.filter(function (o) { return s.months[o] === minMonths; }) : [], months: s.months, contributions: contributions };
  }

  // Checks before you commit, from the PDF: the weight total, ties, the sensitivity test, and two warning signs.
  function checks(state) {
    var s = normalize(state), r = results(s), out = [];
    if (r.totalWeight !== 100) out.push({ level: "warn", text: "Weights total " + r.totalWeight + ". Make them add up to 100 so the totals stay out of 5.00." });
    if (r.leader.kind === "none") return out;
    if (r.leader.kind === "tie") out.push({ level: "info", text: "Scores within 0.25 points are a tie. Lean on cost, risk and your tripwires to decide." });
    var top = topOf(r.totals), changed = false;
    var heaviest = s.criteria.map(function (c, i) { return [c.weight, i]; }).filter(function (p) { return p[0] > 0; })
      .sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; }).slice(0, 2);
    heaviest.forEach(function (p) {
      [-5, 5].forEach(function (d) {
        var w = s.criteria.map(function (c) { return c.weight; }); w[p[1]] = Math.max(0, w[p[1]] + d);
        if (topOf(totalsWith(s, w)) !== top) changed = true;
      });
    });
    if (heaviest.length) out.push(changed
      ? { level: "warn", text: "The leader changes when your two heaviest weights move by 5 points. The decision is sensitive, so agree on the weights first." }
      : { level: "ok", text: "The leader holds when your two heaviest weights move by 5 points either way." });
    var byName = function (re) { return s.criteria.filter(function (c) { return re.test(c.name); })[0]; };
    var team = byName(/team capacity/i), control = byName(/control/i), exit = byName(/exit/i);
    var leading = r.leader.options;
    if (leading.indexOf("build") > -1 && team && team.build > 0 && team.build <= 2) {
      out.push({ level: "warn", text: (r.leader.kind === "tie" ? "Build is in the running" : "Build leads") + " but scores " + team.build + " on team capacity" + (control && control.build >= 4 ? ", with the lead driven by control" : "") + ". That is a warning sign: do you have the people to build and run it?" });
    }
    ["buy", "partner"].forEach(function (o) {
      if (leading.indexOf(o) > -1 && exit && exit[o] > 0 && exit[o] <= 2) {
        out.push({ level: "warn", text: CHOICES[o] + (r.leader.kind === "tie" ? " is in the running" : " leads") + " with a weak exit score (" + exit[o] + "). Negotiate data portability and termination terms before you sign." });
      }
    });
    return out;
  }

  function csvCell(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  // A spreadsheet (CSV): the scores, the costs, the result and the decision.
  function toCSV(state) {
    var s = normalize(state), r = results(s), L = [];
    var line = function (a) { L.push(a.map(csvCell).join(",")); };
    if (s.title) { line(["Build, Buy, or Partner Decision Matrix", s.title]); line([]); }
    line(["Criterion", "Weight", "Build (1-5)", "Buy (1-5)", "Partner (1-5)", "Build weighted", "Buy weighted", "Partner weighted"]);
    s.criteria.forEach(function (c) {
      if (!c.name && !c.weight) return;
      line([c.name, c.weight].concat(KEYS.map(function (o) { return c[o] || ""; }), KEYS.map(function (o) { return c.weight && c[o] ? round2(c.weight * c[o] / 100) : ""; })));
    });
    line(["Total weight", r.totalWeight]);
    line(["Weighted total (out of 5.00)", ""].concat(["", "", ""], KEYS.map(function (o) { return r.totals[o] == null ? "" : r.totals[o].toFixed(2); })));
    line(["Leading option by score", r.leader.text]);
    line([]);
    line(["Cost item", "Build", "Buy", "Partner"]);
    COSTS.forEach(function (c) { line([c.name].concat(KEYS.map(function (o) { return s.costs[o][c.key] == null ? "" : s.costs[o][c.key]; }))); });
    line(["Total three-year cost"].concat(KEYS.map(function (o) { return r.costTotal[o] == null ? "" : r.costTotal[o]; })));
    line(["Months to first customer value"].concat(KEYS.map(function (o) { return s.months[o] == null ? "" : s.months[o]; })));
    var d = s.decision;
    if (d.choice || d.why || d.risks || d.tripwires || d.next) {
      line([]);
      [["Our decision", CHOICES[d.choice] || ""], ["Why this option", d.why], ["Top risks and how we will handle them", d.risks], ["We will revisit this decision if", d.tripwires], ["Next steps", d.next]]
        .forEach(function (p) { if (p[1]) line([p[0], p[1]]); });
    }
    return L.join("\r\n") + "\r\n";
  }

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
  // The matrix in a link: compact JSON, base64url, after the #. Unicode-safe.
  function encode(state) {
    var s = normalize(state), d = s.decision;
    return b64(JSON.stringify({ t: s.title, c: s.criteria.map(function (c) { return [c.name, c.hint, c.weight, "" + c.build + c.buy + c.partner]; }),
      k: KEYS.map(function (o) { return COST_KEYS.map(function (k) { return s.costs[o][k]; }); }), m: KEYS.map(function (o) { return s.months[o]; }),
      d: [d.choice, d.why, d.risks, d.tripwires, d.next] }));
  }
  function decode(str) {
    try {
      var o = JSON.parse(unb64(str)), d = o.d || [], costs = {}, months = {};
      KEYS.forEach(function (op, i) { costs[op] = {}; COST_KEYS.forEach(function (k, j) { costs[op][k] = ((o.k || [])[i] || [])[j]; }); months[op] = (o.m || [])[i]; });
      return normalize({ title: o.t, costs: costs, months: months, decision: { choice: d[0], why: d[1], risks: d[2], tripwires: d[3], next: d[4] },
        criteria: (o.c || []).map(function (c) { var sc = String(c[3] || "000"); return { name: c[0], hint: c[1], weight: c[2], build: sc[0], buy: sc[1], partner: sc[2] }; }) });
    } catch (e) { return null; }
  }

  root.BBPCore = { OPTIONS: OPTIONS, KEYS: KEYS, COSTS: COSTS, CHOICES: CHOICES, MAX_CRITERIA: MAX_CRITERIA, TIE: TIE,
    blank: blank, blankCriterion: blankCriterion, fromExample: fromExample, normalize: normalize, totalWeight: totalWeight,
    results: results, checks: checks, toCSV: toCSV, encode: encode, decode: decode };
})(typeof window !== "undefined" ? window : globalThis);
