// Tests for assets/js/ai-usecases-core.js (AI Use Case Prioritization on /ai-use-cases).
// Run:  node tests/ai-usecases.test.mjs
import '../assets/js/ai-usecases-core.js';
const A = globalThis.AIUseCaseCore;
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };
const uc = (name, value, data, ease, adoption, risk) => ({ name, value, data, ease, adoption, risk });

console.log('--- scoring ---');
{
  const r = A.rank({ cases: [uc('Best', 5, 5, 5, 5, 1), uc('Worst', 1, 1, 1, 1, 1), uc('Middle', 3, 3, 3, 3, 3), uc('', 5, 5, 5, 5, 1)] });
  t('the best idea scores 100, the worst 0, the middle 50', r.map(x => x.name + ':' + x.priority).join() === 'Best:100,Middle:50,Worst:0', r.map(x => x.name + ':' + x.priority).join());
  t('ideas with no name are left out', r.length === 3);
  t('feasibility is the average of data, cost & effort, and team readiness', A.rank({ cases: [uc('x', 3, 5, 3, 1, 1)] })[0].feasibility === 50);
  const risky = A.rank({ cases: [uc('Safe', 4, 4, 4, 4, 3), uc('Risky', 4, 4, 4, 4, 4), uc('Very risky', 4, 4, 4, 4, 5)] });
  t('high risk costs 10 points, very high 20', risky.map(x => x.name + ':' + x.priority).join() === 'Safe:75,Risky:65,Very risky:55', risky.map(x => x.name + ':' + x.priority).join());
  t('a risk of 4 or 5 adds the guardrails note', !risky[0].highRisk && risky[1].highRisk && /person reviewing every output/.test(risky[2].guardrails) && risky[0].guardrails === '');
  const tie = A.rank({ cases: [uc('A', 3, 5, 5, 5, 1), uc('B', 5, 3, 3, 3, 1)] });
  t('equal priority: the higher value goes first, and they share a rank', tie[0].name === 'B' && tie[0].rank === 1 && tie[1].rank === 1);
}

console.log('--- quadrants and next steps ---');
{
  const r = A.rank({ cases: [uc('Win', 4, 4, 4, 4, 1), uc('Bet', 5, 1, 3, 2, 2), uc('Easy', 2, 5, 5, 5, 1), uc('Park', 2, 2, 2, 2, 1), uc('Edge', 3, 3, 3, 3, 1)] });
  const by = Object.fromEntries(r.map(x => [x.name, x]));
  t('each idea lands in the right quadrant', by.Win.quadrant === 'quick-win' && by.Bet.quadrant === 'bet' && by.Easy.quadrant === 'easy' && by.Park.quadrant === 'not-now', r.map(x => x.name + ':' + x.quadrant).join());
  t('a 3 out of 5 counts as high (the middle is a quick win)', by.Edge.quadrant === 'quick-win');
  t('a strategic bet names its weakest feasibility question as the blocker', by.Bet.blocker === 'data' && /Get the data ready/.test(by.Bet.step));
  t('each quadrant says what to do next', /^Pilot it/.test(by.Win.step) && /don't fund a project/.test(by.Easy.step) && /^Park it/.test(by.Park.step));
  t('the quadrant has a name for people', by.Win.quadrantName === 'Quick win' && by.Bet.quadrantName === 'Strategic bet');
  t('counts per quadrant', JSON.stringify(A.counts({ cases: [uc('Win', 4, 4, 4, 4, 1), uc('Bet', 5, 1, 3, 2, 2), uc('Edge', 3, 3, 3, 3, 1)] })) === '{"quick-win":2,"bet":1,"easy":0,"not-now":0}');
}

console.log('--- the first pilot ---');
{
  const p = A.firstPilot({ cases: [uc('Risky win', 5, 5, 5, 5, 4), uc('Safer win', 4, 4, 4, 4, 2), uc('Bet', 5, 1, 1, 1, 1)] });
  t('the best quick win without high risk, even when a risky one ranks higher', p && p.name === 'Safer win');
  t('only risky quick wins: the best of them', A.firstPilot({ cases: [uc('Risky', 5, 5, 5, 5, 5)] }).name === 'Risky');
  t('no quick wins: none', A.firstPilot({ cases: [uc('Bet', 5, 1, 1, 1, 1)] }) === null && A.firstPilot({}) === null);
  const ex = A.fromExample();
  t('the example has six ideas across the quadrants, and a pilot', ex.cases.length === 6 && Object.values(A.counts(ex)).filter(Boolean).length >= 3 && A.firstPilot(ex).name === 'Summarize support tickets for the weekly product review',
    JSON.stringify(A.counts(ex)) + ' ' + (A.firstPilot(ex) || {}).name);
}

console.log('--- safe input, CSV and links ---');
{
  const n = A.normalize({ title: '  My   list ', cases: [{ name: 'x'.repeat(300), value: 9, data: -2, ease: 'abc', risk: 4.6 }, null] });
  t('names trimmed and capped, scores kept between 1 and 5 (3 when unreadable)', n.title === 'My list' && n.cases[0].name.length === 100 && n.cases[0].value === 5 && n.cases[0].data === 1 && n.cases[0].ease === 3 && n.cases[0].adoption === 3 && n.cases[0].risk === 5 && n.cases[1].name === '');
  t('at most ' + A.MAX_CASES + ' ideas', A.normalize({ cases: Array.from({ length: 40 }, () => uc('a', 3, 3, 3, 3, 3)) }).cases.length === A.MAX_CASES);
  const csv = A.toCSV({ cases: [uc('=SUM(A1)', 4, 4, 4, 4, 1), uc('Has, comma', 2, 2, 2, 2, 5)] });
  const lines = csv.trim().split('\r\n');
  t('CSV: a header and one line per idea', lines.length === 3 && /^Rank,AI use case,Priority/.test(lines[0]) && /Risk if wrong \(1-5, lower is better\)/.test(lines[0]));
  t('CSV: a formula never runs in the spreadsheet, and commas are quoted', /'=SUM/.test(lines[1]) && /"Has, comma"/.test(csv));
  const s = { title: 'Ünïcode ✓', cases: [uc('Résumé screening', 4, 3, 2, 5, 5), uc('', 1, 1, 1, 1, 1)] };
  const back = A.decode(A.encode(s));
  t('a shared link opens the same list, unicode included', JSON.stringify(back) === JSON.stringify(A.normalize(s)), JSON.stringify(back));
  t('a broken link opens nothing', A.decode('%%%') === null && A.decode('') === null);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
