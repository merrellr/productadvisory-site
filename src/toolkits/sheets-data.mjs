// Prints, as JSON, everything the spreadsheet templates need from the three browser tools: their questions, scoring
// rules and worked examples, plus the results the website gives for each example (make-sheets.py checks the
// spreadsheets against these). One source of truth: the same *-core.js files the pages use.
//   node src/toolkits/sheets-data.mjs > /tmp/sheets.json
import '../../assets/js/ai-readiness-core.js';
import '../../assets/js/ai-usecases-core.js';
import '../../assets/js/scorecard-core.js';

const R = globalThis.AIReadinessCore, U = globalThis.AIUseCaseCore, S = globalThis.ScorecardCore;

const rEx = R.fromExample(), rRes = R.results(rEx);
const uEx = U.fromExample(), uRank = U.rank(uEx), uPilot = U.firstPilot(uEx);
const sEx = S.fromTemplate('balanced', true);

console.log(JSON.stringify({
  readiness: {
    areas: R.AREAS.map(a => ({ key: a.key, name: a.name })),
    items: R.ITEMS.map(it => ({ id: it.id, area: it.area, text: it.text, fix: it.fix })),
    answers: Object.keys(R.ANSWERS).map(k => ({ key: k, name: R.ANSWERS[k].name, points: R.ANSWERS[k].points })),
    levels: R.LEVELS,
    example: R.ITEMS.map(it => R.ANSWERS[rEx.answers[it.id]].name),
    expected: { score: rRes.score, level: rRes.level.name, areas: rRes.areas.map(a => a.score), weakest: rRes.weakest, unknown: rRes.unknown.length }
  },
  usecases: {
    factors: U.FACTORS, quadrants: U.QUADRANTS, blockers: U.BLOCKERS, guardrails: U.GUARDRAILS, max: U.MAX_CASES,
    example: uEx.cases.map(c => [c.name].concat(U.KEYS.map(k => c[k]))),
    expected: { rows: uEx.cases.map(c => uRank.find(r => r.name === c.name)).map(r => ({ name: r.name, value: r.value, feasibility: r.feasibility, priority: r.priority, rank: r.rank, quadrant: r.quadrantName, step: r.step, guardrails: r.guardrails })),
      pilot: uPilot ? uPilot.name : '' }
  },
  scorecard: {
    templates: S.TEMPLATES, maxCriteria: S.MAX_CRITERIA, maxFeatures: S.MAX_FEATURES, impacts: S.IMPACTS, confidences: S.CONFIDENCES,
    example: { criteria: sEx.criteria, features: sEx.features },
    expected: {
      weighted: sEx.features.map(f => S.rank(sEx).find(r => r.name === f.name)).map(r => ({ name: r.name, score: r.score, rank: r.rank })),
      rice: sEx.features.map(f => S.rankRice(sEx).find(r => r.name === f.name)).map(r => ({ name: r.name, score: r.score, rank: r.rank }))
    }
  }
}, null, 1));
