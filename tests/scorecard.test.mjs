// Tests for assets/js/scorecard-core.js (the Feature Prioritization Scorecard on /scorecard).
// Run:  node tests/scorecard.test.mjs
import '../assets/js/scorecard-core.js';
const S = globalThis.ScorecardCore;
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };

console.log('--- templates ---');
{
  const b = S.fromTemplate('balanced', true);
  t('the balanced template has six criteria, effort and risk counting the other way', b.criteria.length === 6 && b.criteria.filter(c => c.cost).map(c => c.name).join() === 'Effort,Risk');
  t('with examples it has five features, each scored on every criterion', b.features.length === 5 && b.features.every(f => f.scores.length === 6));
  t('ICE has three equal criteria and no examples unless asked', S.fromTemplate('ice', false).criteria.map(c => c.weight).join() === '5,5,5' && S.fromTemplate('ice', false).features.length === 0);
  t('an unknown template falls back to balanced', S.fromTemplate('nope').template === 'balanced');
}

console.log('--- scoring ---');
{
  const s = { criteria: [{ name: 'Value', weight: 3 }, { name: 'Effort', weight: 1, cost: true }],
    features: [{ name: 'Best', scores: [5, 1] }, { name: 'Worst', scores: [1, 5] }, { name: 'Middle', scores: [3, 3] }, { name: '', scores: [5, 5] }] };
  const r = S.rank(s);
  t('the best possible feature scores 100, the worst 0, the middle 50', r.map(x => x.name + ':' + x.score).join() === 'Best:100,Middle:50,Worst:0', r.map(x => x.name + ':' + x.score).join());
  t('features with no name are left out', r.length === 3);
  t('each criterion\'s share adds up to the score', r[0].parts.map(p => p.points).join() === '75,25');
  t('what drives a score is named', r[0].top === 'Value' && r[2].top === '');
  const w = S.rank({ criteria: [{ name: 'A', weight: 5 }, { name: 'B', weight: 0 }], features: [{ name: 'x', scores: [4, 1] }, { name: 'y', scores: [2, 5] }] });
  t('a weight of 0 means a criterion does not count', w[0].name === 'x' && w[0].score === 75 && w[1].score === 25);
  const ties = S.rank({ criteria: [{ name: 'A', weight: 2 }], features: [{ name: 'p', scores: [4] }, { name: 'q', scores: [4] }, { name: 'r', scores: [2] }] });
  t('ties share a rank', ties.map(x => x.rank).join() === '1,1,3');
  const close = S.rank({ criteria: [{ name: 'A', weight: 5 }, { name: 'B', weight: 5 }, { name: 'C', weight: 5 }, { name: 'D', weight: 5 }, { name: 'E', weight: 5 }],
    features: [{ name: 'a', scores: [5, 5, 5, 5, 5] }, { name: 'b', scores: [5, 5, 5, 5, 4] }, { name: 'c', scores: [1, 1, 1, 1, 1] }] });
  t('features within 5 points of each other are close calls', close[0].closeCall && close[1].closeCall && !close[2].closeCall, close.map(x => x.score + ':' + x.closeCall).join());
  t('all weights 0: every feature scores 0, nothing breaks', S.rank({ criteria: [{ name: 'A', weight: 0 }], features: [{ name: 'x', scores: [5] }] })[0].score === 0);
}

console.log('--- safe input ---');
{
  const n = S.normalize({ title: '  My   roadmap  ', criteria: [{ name: '', weight: 9 }, { name: 'X'.repeat(200), weight: -2, cost: 'yes' }],
    features: [{ name: 'f', scores: [0, 'seven', 9] }] });
  t('names are tidied and shortened, weights kept from 0 to 5', n.title === 'My roadmap' && n.criteria[0].name === 'Criterion' && n.criteria[0].weight === 5 && n.criteria[1].name.length === 80 && n.criteria[1].weight === 0 && n.criteria[1].cost === true);
  t('scores are kept from 1 to 5 and lined up with the criteria', n.features[0].scores.join() === '1,3');
  t('at most 8 criteria and 30 features', S.normalize({ criteria: Array(12).fill({ name: 'c' }), features: Array(40).fill({ name: 'f' }) }).criteria.length === 8 &&
    S.normalize({ criteria: [{ name: 'c' }], features: Array(40).fill({ name: 'f' }) }).features.length === 30);
  t('nothing at all gives the balanced criteria', S.normalize(null).criteria.length === 6);
}

console.log('--- sharing and export ---');
{
  const s = S.fromTemplate('growth', true); s.title = 'Q3 — café roadmap ✓'; s.features[0].name = 'Ünïcode & "quotes", commas';
  const back = S.decode(S.encode(s));
  t('a shared link brings back the same scorecard, accents and symbols included', back && back.title === s.title && back.features[0].name === s.features[0].name && JSON.stringify(back.criteria) === JSON.stringify(S.normalize(s).criteria) && JSON.stringify(back.features) === JSON.stringify(S.normalize(s).features));
  t('the link uses only characters safe in a URL', /^[A-Za-z0-9_-]+$/.test(S.encode(s)));
  t('a broken link gives nothing, not an error', S.decode('%%%not-base64') === null && S.decode('') === null);
  const csv = S.toCSV({ criteria: [{ name: 'Value', weight: 4 }, { name: 'Effort', weight: 2, cost: true }], features: [{ name: '=cmd|"x"', scores: [5, 2] }, { name: 'B, the second', scores: [2, 4] }] });
  const rows = csv.trim().split('\r\n');
  t('the CSV has a header with the weights, then the features best first', rows[0] === 'Rank,Feature,Score (0-100),Value (weight 4),"Effort (weight 2, lower is better)",RICE rank,RICE score,Reach,Impact,Confidence %,Effort (person-months)' && rows.length === 3, rows[0]);
  t('a feature name that would run as a formula in a spreadsheet is stored as text, and commas are quoted', rows[1].startsWith('1,"\'=cmd|""x"""') && rows[2].startsWith('2,"B, the second"'), rows[1] + ' / ' + rows[2]);
}

console.log('--- RICE ---');
{
  // The worked example from the article "RICE or Weighted Scoring" (insights/rice-vs-weighted-scoring)
  const st = { criteria: [{ name: 'Customer value', weight: 5 }, { name: 'Strategic fit', weight: 4 }, { name: 'Revenue impact', weight: 4 }, { name: 'Effort', weight: 3, cost: true }, { name: 'Risk', weight: 2, cost: true }],
    features: [{ name: 'Self-serve onboarding', scores: [5, 3, 3, 3, 2], rice: { reach: 2000, impact: 2, confidence: 80, effort: 4 } },
      { name: 'SSO for enterprise', scores: [3, 5, 5, 3, 2], rice: { reach: 150, impact: 3, confidence: 90, effort: 3 } },
      { name: 'Bulk export', scores: [3, 1, 1, 1, 1], rice: { reach: 900, impact: 1, confidence: 100, effort: 1 } },
      { name: 'AI usage summary', scores: [3, 4, 2, 2, 4], rice: { reach: 1200, impact: 1, confidence: 50, effort: 2 } }] };
  const r = S.rankRice(st);
  t('RICE = reach x impact x confidence / effort, best first (the article\'s numbers)', r.map(x => x.name + ':' + x.score).join() === 'Bulk export:900,Self-serve onboarding:800,AI usage summary:300,SSO for enterprise:135', r.map(x => x.name + ':' + x.score).join());
  t('900 and 800 are a close call (within 15%), 300 is not', r[0].closeCall && r[1].closeCall && !r[2].closeCall);
  const c = S.compare(st);
  t('compare: both ranks per feature, in weighted order, with how far each moves', c.map(x => x.name + ':' + x.weighted + '/' + x.rice + '/' + x.move).join() === 'SSO for enterprise:1/4/-3,Self-serve onboarding:2/2/0,AI usage summary:3/3/0,Bulk export:4/1/3', c.map(x => x.name + ':' + x.weighted + '/' + x.rice).join());
  t('hasRice once two named features have a reach', S.hasRice(st) && !S.hasRice({ criteria: st.criteria, features: [{ name: 'a', scores: [1, 1, 1, 1, 1] }, { name: 'b', scores: [1, 1, 1, 1, 1] }] }));
  const bad = S.cleanRice({ reach: -5, impact: 7, confidence: 140, effort: 0 });
  t('RICE inputs are made safe: no negative reach, impact on the scale, confidence 0-100, effort above 0', bad.reach === 0 && bad.impact === 1 && bad.confidence === 100 && bad.effort === 0.1, JSON.stringify(bad));
  t('features without RICE yet get the defaults (no reach)', S.normalize({ criteria: st.criteria, features: [{ name: 'x', scores: [3, 3, 3, 3, 3] }] }).features[0].rice.reach === 0);
  const back = S.decode(S.encode(Object.assign({ method: 'compare' }, st)));
  t('a shared link carries RICE and the open tab', back.method === 'compare' && S.rankRice(back).map(x => x.score).join() === '900,800,300,135');
  const old = 'eyJ0IjoiIiwibSI6ImN1c3RvbSIsImMiOltbIkN1c3RvbWVyIHZhbHVlIiw1LDBdLFsiU3RyYXRlZ2ljIGZpdCIsNCwwXSxbIlJldmVudWUgaW1wYWN0Iiw0LDBdLFsiRWZmb3J0IiwzLDFdLFsiUmlzayIsMiwxXV0sImYiOltbIlNlbGYtc2VydmUgb25ib2FyZGluZyIsIjUzMzMyIl0sWyJTU08gZm9yIGVudGVycHJpc2UiLCIzNTUzMiJdLFsiQnVsayBleHBvcnQiLCIzMTExMSJdLFsiQUkgdXNhZ2Ugc3VtbWFyeSIsIjM0MjI0Il1dfQ';
  const o = S.decode(old);
  t('links shared before RICE still open, on the weighted tab', o && o.method === 'weighted' && o.features.length === 4 && o.features[0].rice.reach === 0);
  const ex = S.fromTemplate('balanced', true);
  t('the example fills in RICE too, so Compare works straight away', S.hasRice(ex) && S.compare(ex).length === 5);
  const csv = S.toCSV(st).trim().split('\r\n');
  t('the CSV has the RICE rank, score and inputs', csv[1].endsWith(',4,135,150,3,90,3'), csv[1]);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
