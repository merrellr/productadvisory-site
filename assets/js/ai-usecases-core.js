/* AI Use Case Prioritization: the scoring, with no page code, so it can be tested on its own
   (tests/ai-usecases.test.mjs). Used by assets/js/ai-usecases.js on /ai-use-cases.

   Each AI idea (a use case) is scored 1 to 5 on five questions:
     value     how much it moves a goal that matters (time saved, revenue, customer experience)
     data      data readiness: the data exists, is good enough, and you're allowed to use it
     ease      cost and effort: 5 is an off-the-shelf tool you can switch on, 1 is a custom build
     adoption  team readiness: it fits how people work, and someone will own it
     risk      the harm if the AI gets it wrong (privacy, compliance, customers, money); lower is better
   Value is the value score; feasibility is the average of data, ease and adoption. Both run 0 to 100.
   Priority = the average of the two, less a penalty for high risk (4: 10 points, 5: 20 points).

   Each idea lands in a quadrant, which says what to do next:
     quick-win  high value, feasible now                 pilot it
     bet        high value, not feasible yet             fix what blocks it (its lowest feasibility score)
     easy       feasible, low value                      try it cheaply, don't fund a project
     not-now    neither                                  park it
   "High" means a score of 50 or more (3 or more out of 5). A risk of 4 or 5 adds a guardrails flag.
   The first pilot to run is the best-ranked quick win without high risk (else the best-ranked quick win).
   Everything stays in the browser; a shared link carries the list in its #. */
(function (root) {
  "use strict";

  var MAX_CASES = 25, MAX_NAME = 100;
  var FACTORS = [
    { key: "value", name: "Business value", q: "How much would it move a goal that matters?", lo: "Nice to have", hi: "Moves a key goal" },
    { key: "data", name: "Data readiness", q: "Is the data there, good enough, and yours to use?", lo: "We'd have to find or fix it", hi: "Ready and approved" },
    { key: "ease", name: "Cost & effort", q: "How easy is it to build or buy?", lo: "A custom build", hi: "Switch on a tool" },
    { key: "adoption", name: "Team readiness", q: "Will people use it, and does it have an owner?", lo: "No owner, poor fit", hi: "Owner and demand" },
    { key: "risk", name: "Risk if wrong", q: "How bad is it when the AI gets it wrong?", lo: "Easy to catch, low harm", hi: "Harms customers or compliance", cost: true }
  ];
  var KEYS = FACTORS.map(function (f) { return f.key; });

  var QUADRANTS = {
    "quick-win": { name: "Quick win", step: "Pilot it: one team, four to six weeks, and one number to judge it by." },
    "bet": { name: "Strategic bet", step: "Worth it, but not yet doable. Fix what blocks it first, then revisit." },
    "easy": { name: "Easy experiment", step: "Cheap to try, small payoff. Let people try it with tools you already have; don't fund a project." },
    "not-now": { name: "Not now", step: "Park it and look again next quarter." }
  };
  // What to fix first when a strategic bet isn't feasible yet: its weakest feasibility question.
  var BLOCKERS = {
    data: "Get the data ready: find the source, clean it up, and confirm you're allowed to use it.",
    ease: "Find a cheaper route: an existing tool, a vendor, or a smaller first version.",
    adoption: "Find an owner and a team that wants it, and map where it fits in their week."
  };
  var GUARDRAILS = "High risk: keep a person reviewing every output, name an owner, and check privacy and compliance before anyone relies on it.";

  var EXAMPLE = [   // [name, value, data, ease, adoption, risk]
    ["Summarize support tickets for the weekly product review", 4, 4, 5, 4, 2],
    ["Chatbot that answers billing questions", 4, 3, 3, 3, 4],
    ["Draft release notes from finished tickets", 2, 5, 5, 4, 1],
    ["Predict which customers are about to leave", 5, 2, 2, 3, 2],
    ["Approve refunds automatically", 3, 3, 2, 2, 5],
    ["Meeting notes and action items", 3, 5, 5, 5, 1]
  ];

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, MAX_NAME); }
  function clamp(n) { n = Math.round(Number(n)); return isFinite(n) ? Math.min(5, Math.max(1, n)) : 3; }
  function blankCase() { return { name: "", value: 3, data: 3, ease: 3, adoption: 3, risk: 3 }; }

  function fromExample() {
    return { title: "", cases: EXAMPLE.map(function (e) {
      var c = { name: e[0] };
      KEYS.forEach(function (k, i) { c[k] = e[i + 1]; });
      return c;
    }) };
  }

  // Makes any input (saved, shared or typed) safe and complete.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var cases = (Array.isArray(raw.cases) ? raw.cases : []).slice(0, MAX_CASES).map(function (c) {
      c = c || {};
      var out = { name: clean(c.name) };
      KEYS.forEach(function (k) { out[k] = clamp(c[k]); });
      return out;
    });
    return { title: clean(raw.title), cases: cases };
  }

  var pct = function (v) { return (v - 1) / 4 * 100; };
  var round1 = function (v) { return Math.round(v * 10) / 10; };

  /* The ranking: the named cases, best first, each
     { index, name, value, feasibility, priority (0-100, one decimal), rank, risk, highRisk, quadrant, quadrantName,
       blocker (for a strategic bet: the key of its weakest feasibility question), step (what to do next),
       guardrails (the high-risk note, or "") }. Ties share a rank. */
  function rank(state) {
    var s = normalize(state), rows = [];
    s.cases.forEach(function (c, i) {
      if (!c.name) return;
      var value = pct(c.value), feas = (pct(c.data) + pct(c.ease) + pct(c.adoption)) / 3;
      var penalty = c.risk >= 5 ? 20 : c.risk >= 4 ? 10 : 0;
      var hiV = value >= 50, hiF = feas >= 50;
      var quad = hiV && hiF ? "quick-win" : hiV ? "bet" : hiF ? "easy" : "not-now";
      var blocker = "";
      if (quad === "bet") blocker = ["data", "ease", "adoption"].reduce(function (a, k) { return c[k] < c[a] ? k : a; }, "data");
      rows.push({ index: i, name: c.name, value: round1(value), feasibility: round1(feas), priority: round1(Math.max(0, (value + feas) / 2 - penalty)),
        risk: c.risk, highRisk: c.risk >= 4, quadrant: quad, quadrantName: QUADRANTS[quad].name, blocker: blocker,
        step: quad === "bet" ? BLOCKERS[blocker] : QUADRANTS[quad].step, guardrails: c.risk >= 4 ? GUARDRAILS : "" });
    });
    rows.sort(function (a, b) { return b.priority - a.priority || b.value - a.value || a.index - b.index; });
    rows.forEach(function (r, k) { r.rank = k && rows[k - 1].priority === r.priority ? rows[k - 1].rank : k + 1; });
    return rows;
  }

  // The first pilot: the best-ranked quick win without high risk, else the best-ranked quick win, else null.
  function firstPilot(state) {
    var wins = rank(state).filter(function (r) { return r.quadrant === "quick-win"; });
    return wins.filter(function (r) { return !r.highRisk; })[0] || wins[0] || null;
  }

  // How many ideas land in each quadrant.
  function counts(state) {
    var out = { "quick-win": 0, "bet": 0, "easy": 0, "not-now": 0 };
    rank(state).forEach(function (r) { out[r.quadrant]++; });
    return out;
  }

  // A spreadsheet (CSV) of the ranking, ready for Google Sheets or Excel.
  function toCSV(state) {
    var s = normalize(state);
    var q = function (v) { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var head = ["Rank", "AI use case", "Priority (0-100)", "Where it lands", "Value (0-100)", "Feasibility (0-100)"]
      .concat(FACTORS.map(function (f) { return f.name + " (1-5" + (f.cost ? ", lower is better" : "") + ")"; }), ["Next step", "Guardrails"]);
    var lines = [head.map(q).join(",")];
    rank(s).forEach(function (r) {
      var c = s.cases[r.index];
      lines.push([r.rank, r.name, r.priority, r.quadrantName, r.value, r.feasibility].concat(KEYS.map(function (k) { return c[k]; }), [r.step, r.guardrails]).map(q).join(","));
    });
    return lines.join("\r\n") + "\r\n";
  }

  // The list in a link: compact JSON, base64url, after the #. Unicode-safe.
  function encode(state) {
    var s = normalize(state);
    var compact = { t: s.title, c: s.cases.map(function (c) { return [c.name, KEYS.map(function (k) { return c[k]; }).join("")]; }) };
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
      return normalize({ title: o.t, cases: (o.c || []).map(function (c) {
        var d = String(c[1] || "").split(""), out = { name: c[0] };
        KEYS.forEach(function (k, j) { out[k] = d[j]; });
        return out;
      }) });
    } catch (e) { return null; }
  }

  root.AIUseCaseCore = { FACTORS: FACTORS, KEYS: KEYS, QUADRANTS: QUADRANTS, BLOCKERS: BLOCKERS, GUARDRAILS: GUARDRAILS, MAX_CASES: MAX_CASES,
    blankCase: blankCase, fromExample: fromExample, normalize: normalize, rank: rank, firstPilot: firstPilot, counts: counts,
    toCSV: toCSV, encode: encode, decode: decode };
})(typeof window !== "undefined" ? window : globalThis);
