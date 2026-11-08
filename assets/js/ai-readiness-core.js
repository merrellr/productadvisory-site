/* AI Readiness Checklist: the scoring, with no page code, so it can be tested on its own (tests/ai-readiness.test.mjs).
   Used by assets/js/ai-readiness.js on /ai-readiness.

   Twenty-four statements in six areas (strategy, data, people, process, tools, guardrails). Each is answered
   Yes (2 points), Partly (1), No (0) or Not sure (0, and listed as something to find out). An area's score is its
   points out of 8, as 0 to 100; the overall score is all the points out of 48.

   The overall score places the team on the AI adoption journey (the Product+ article "AI Is Not a Project. It's a
   Practice."):  0-24 Start with you, 25-49 One use case, 50-74 Team traction, 75-100 Org capability.
   Next moves: the No and Not sure answers in the weakest areas first, each with what to do about it (at most three).
   Everything stays in the browser; a shared link carries the answers in its #. */
(function (root) {
  "use strict";

  var MAX_NAME = 100;
  var AREAS = [
    { key: "strategy", name: "Strategy & goals", items: [
      ["We've named one to three business problems we want AI to help with.", "Pick the one to three problems that cost the most time or money, and write them down. AI work starts from a problem, not a tool."],
      ["A leader sponsors AI work and gives it time and a small budget.", "Ask one leader to sponsor a first pilot: a few hours a week of someone's time and a small tool budget is enough to start."],
      ["We know how we'd judge whether AI is working (time saved, quality, revenue).", "Choose one number per problem, like hours saved a week or time to first draft, and measure it before you start."],
      ["AI plans connect to goals we already track.", "Tie each AI idea to a goal people already have. Then it is a business tool, not a technology initiative."]] },
    { key: "data", name: "Data", items: [
      ["The data our first idea needs exists and is reasonably clean.", "Check the data for your first idea now: where it lives, how complete it is, and what it would take to clean up."],
      ["We know who owns that data and whether we may use it with AI.", "Find the owner of that data and confirm, in writing, what it may and may not be used for."],
      ["People can get to the data they need without weeks of requests.", "Agree a fast, approved way to get the pilot team the data it needs."],
      ["Sensitive data (customer, health, financial) is labeled and protected.", "List where sensitive data lives and make sure it is labeled and kept out of tools that aren't approved for it."]] },
    { key: "people", name: "People & skills", items: [
      ["Most of the team has tried an AI tool for real work.", "Give everyone a few weeks to use AI on their own work: drafting, summarizing, thinking out loud. Firsthand experience comes first."],
      ["Someone can help others write good prompts and judge the output.", "Name an AI champion who helps others, shares good prompts and spots weak output."],
      ["People have time set aside to learn and experiment.", "Set aside a little time each week, even an hour, for people to try AI on real tasks."],
      ["Leaders use AI themselves and talk about it openly.", "Ask leaders to share how they use AI, including what didn't work. It gives everyone permission to try."]] },
    { key: "process", name: "Use cases & process", items: [
      ["We know which repetitive, high-volume tasks AI could take a first pass at.", "List the repetitive tasks every team has, like status reports, meeting notes and first drafts, and pick one to start with."],
      ["Someone would own and run a first pilot.", "Name one owner for the first pilot: one team, four to six weeks, one number to judge it by."],
      ["Our workflows are clear enough to see where AI would fit.", "Map the workflow for your first use case, step by step, and mark where AI would take the first pass and where a person checks it."],
      ["We share prompts, templates and wins with each other.", "Start a simple channel, thread or monthly email where people share prompts, use cases and results."]] },
    { key: "tools", name: "Tools & systems", items: [
      ["People have approved AI tools, not just personal accounts.", "Provide at least one approved AI tool, so people aren't putting work into personal accounts."],
      ["Our core systems can connect to AI tools (exports, APIs or integrations).", "Check how your key systems get data in and out: exports, APIs or ready-made integrations."],
      ["IT or security has reviewed the AI tools we use.", "Ask IT or security for a quick review of the tools in use: data storage, retention and training on your data."],
      ["We can see who uses AI tools and what they cost.", "Turn on usage and cost reporting for your AI tools, so you can see what is used and what it costs."]] },
    { key: "guardrails", name: "Guardrails & risk", items: [
      ["We have a simple rule for what may and may not go into AI tools.", "Write a one-page rule: what may go into AI tools, what may not, and who to ask."],
      ["A person reviews AI output before it reaches customers or decisions.", "Keep a person reviewing every AI output that reaches customers, money or important decisions."],
      ["We know who to ask when an AI use might be risky (privacy, legal, compliance).", "Name the person to ask about privacy, legal and compliance questions on AI, and tell everyone who it is."],
      ["We have a way to report and learn from AI mistakes.", "Make it easy and blame-free to report an AI mistake, and review what you learn each month."]] }
  ];
  var ITEMS = [];
  AREAS.forEach(function (a) { a.items.forEach(function (it, i) { ITEMS.push({ id: a.key + (i + 1), area: a.key, areaName: a.name, text: it[0], fix: it[1] }); }); });

  var ANSWERS = { y: { name: "Yes", points: 2 }, p: { name: "Partly", points: 1 }, n: { name: "No", points: 0 }, u: { name: "Not sure", points: 0 } };
  var LEVELS = [
    { key: "you", min: 0, name: "Start with you", text: "AI isn't part of how the team works yet, and that's normal. Nobody waits until they're ready; they start small.",
      step: "Spend a few weeks using AI on your own work, then pick one painful, repetitive task to try it on." },
    { key: "one", min: 25, name: "One use case", text: "The basics are forming. You have enough to run one focused pilot and learn from it.",
      step: "Run one pilot: one team, one repetitive task, four to six weeks, and one number to judge it by." },
    { key: "team", min: 50, name: "Team traction", text: "AI is working in places. The job now is spreading what works and putting guardrails around it.",
      step: "Share what works, turn the best uses into templates, and connect AI to goals people already track." },
    { key: "org", min: 75, name: "Org capability", text: "AI is becoming part of how the organization works, with the data, skills and guardrails to scale it.",
      step: "Standardize the wins, measure them against business goals, and keep reviewing risk as use grows." }
  ];

  var EXAMPLE = "ppny" + "pynp" + "ypnp" + "pnny" + "ynuy" + "nuyn";   // 24 answers, area by area, in the order above

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, MAX_NAME); }
  function blank() { return { title: "", answers: {} }; }
  function fromExample() {
    var s = blank();
    ITEMS.forEach(function (it, i) { s.answers[it.id] = EXAMPLE.charAt(i); });
    return normalize(s);
  }

  // Makes any input (saved, shared or typed) safe and complete: only known statements and known answers.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var a = raw.answers && typeof raw.answers === "object" ? raw.answers : {}, out = {};
    ITEMS.forEach(function (it) { var v = a[it.id]; if (typeof v === "string" && ANSWERS[v]) out[it.id] = v; });
    return { title: clean(raw.title), answers: out };
  }

  function levelFor(pct) { var l = LEVELS[0]; LEVELS.forEach(function (x) { if (pct >= x.min) l = x; }); return l; }

  /* The results:
     { answered, total, complete, score (0-100), level, areas: [{ key, name, score, answered, total }] in order,
       strongest, weakest (area keys, by score; ties go to the earlier area), moves: [up to three { id, area, text, fix }],
       unknown: [the Not sure statements] } */
  function results(state) {
    var s = normalize(state), pts = 0, answered = 0, areas = [];
    AREAS.forEach(function (a) {
      var p = 0, n = 0;
      ITEMS.filter(function (it) { return it.area === a.key; }).forEach(function (it) {
        var v = s.answers[it.id];
        if (v) { n++; answered++; p += ANSWERS[v].points; pts += ANSWERS[v].points; }
      });
      areas.push({ key: a.key, name: a.name, score: Math.round(p / (a.items.length * 2) * 100), answered: n, total: a.items.length });
    });
    var score = Math.round(pts / (ITEMS.length * 2) * 100);
    var byScore = areas.slice().sort(function (x, y) { return y.score - x.score; });
    var order = areas.slice().sort(function (x, y) { return x.score - y.score; }).map(function (a) { return a.key; });
    var gaps = ITEMS.filter(function (it) { var v = s.answers[it.id]; return v === "n" || v === "u"; });
    gaps.sort(function (x, y) { return order.indexOf(x.area) - order.indexOf(y.area) || ITEMS.indexOf(x) - ITEMS.indexOf(y); });
    return {
      answered: answered, total: ITEMS.length, complete: answered === ITEMS.length, score: score, level: levelFor(score), areas: areas,
      strongest: answered ? byScore[0].key : "", weakest: answered ? byScore[byScore.length - 1].key : "",
      moves: gaps.slice(0, 3).map(function (it) { return { id: it.id, area: it.areaName, text: it.text, fix: it.fix }; }),
      unknown: ITEMS.filter(function (it) { return s.answers[it.id] === "u"; }).map(function (it) { return { id: it.id, area: it.areaName, text: it.text }; })
    };
  }

  // A spreadsheet (CSV) of the answers and the score, ready for Google Sheets or Excel.
  function toCSV(state) {
    var s = normalize(state), r = results(s);
    var q = function (v) { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [["Area", "Statement", "Answer", "Points (of 2)", "What to do about it"].map(q).join(",")];
    ITEMS.forEach(function (it) {
      var v = s.answers[it.id];
      lines.push([it.areaName, it.text, v ? ANSWERS[v].name : "", v ? ANSWERS[v].points : "", v === "y" ? "" : it.fix].map(q).join(","));
    });
    lines.push("");
    r.areas.forEach(function (a) { lines.push([a.name + " (0-100)", "", "", a.score, ""].map(q).join(",")); });
    lines.push(["Overall (0-100)", "", "", r.score, r.level.name + ". " + r.level.step].map(q).join(","));
    return lines.join("\r\n") + "\r\n";
  }

  // The answers in a link: compact JSON (24 letters, - for unanswered), base64url, after the #. Unicode-safe.
  function encode(state) {
    var s = normalize(state);
    var compact = { t: s.title, a: ITEMS.map(function (it) { return s.answers[it.id] || "-"; }).join("") };
    var bytes = new TextEncoder().encode(JSON.stringify(compact)), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    try {
      var b = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
      var bin = atob(b + "===".slice((b.length + 3) % 4)), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var o = JSON.parse(new TextDecoder().decode(bytes)), a = String(o.a || ""), answers = {};
      ITEMS.forEach(function (it, k) { answers[it.id] = a.charAt(k); });
      return normalize({ title: o.t, answers: answers });
    } catch (e) { return null; }
  }

  root.AIReadinessCore = { AREAS: AREAS, ITEMS: ITEMS, ANSWERS: ANSWERS, LEVELS: LEVELS, blank: blank, fromExample: fromExample,
    normalize: normalize, levelFor: levelFor, results: results, toCSV: toCSV, encode: encode, decode: decode };
})(typeof window !== "undefined" ? window : globalThis);
