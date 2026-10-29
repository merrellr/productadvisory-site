// Tests for assets/js/bbp-core.js (Build, Buy, or Partner Decision Matrix on /build-buy-partner). The worked example must
// match the PDF and spreadsheet (assets/toolkits/build-buy-partner-*).   Run:  node tests/bbp.test.mjs
import '../assets/js/bbp-core.js';
const B = globalThis.BBPCore;
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };

console.log('--- the worked example (same numbers as the PDF) ---');
{
  const ex = B.fromExample(), r = B.results(ex);
  t('default weights total 100', r.totalWeight === 100);
  t('weighted totals: Build 3.26, Buy 3.39, Partner 3.41', r.totals.build === 3.26 && r.totals.buy === 3.39 && r.totals.partner === 3.41, JSON.stringify(r.totals));
  t('all within 0.25: too close to call, Build, Buy, Partner', r.leader.kind === 'tie' && r.leader.text === 'Too close to call: Build, Buy, Partner', r.leader.text);
  t('three-year costs: $430,000, $375,000, $325,000', r.costTotal.build === 430000 && r.costTotal.buy === 375000 && r.costTotal.partner === 325000);
  t('Partner is lowest cost; the others show the difference', r.lowestCost.join() === 'partner' && r.costDiff.build === 105000 && r.costDiff.buy === 50000);
  t('Buy is fastest to first value', r.fastest.join() === 'buy');
  t('percent of the best possible score', r.percent.partner === 68);
  t('the example carries its decision and tripwires', ex.decision.choice === 'partner' && /15 percent/.test(ex.decision.tripwires));
}

console.log('--- scoring rules ---');
{
  const c = (name, weight, build, buy, partner) => ({ name, weight, build, buy, partner });
  const r = B.results({ criteria: [c('A', 60, 5, 2, 3), c('B', 40, 5, 2, 3)] });
  t('a clear leader by more than 0.25 is named on its own', r.leader.kind === 'clear' && r.leader.text === 'Build' && r.totals.build === 5);
  t('a blank score leaves that criterion out for that option', B.results({ criteria: [c('A', 50, 4, 0, 0), c('B', 50, 4, 4, 0)] }).totals.buy === 2 && B.results({ criteria: [c('A', 100, 4, 0, 0)] }).totals.partner === null);
  t('nothing scored: no leader', B.results({ criteria: [c('A', 100, 0, 0, 0)] }).leader.kind === 'none');
  t('exactly 0.25 apart is a tie', B.results({ criteria: [c('A', 25, 4, 3, 0), c('B', 75, 0, 0, 0)] }).leader.kind === 'tie');
  t('costs add up, blanks skipped, and only one option costed has no "lowest"', B.results({ costs: { build: { upfront: '1,000', y1: 500 } } }).costTotal.build === 1500 && B.results({ costs: { build: { upfront: 5 } } }).lowestCost.length === 0);
}

console.log('--- checks before you commit ---');
{
  const ex = B.fromExample(), txt = B.checks(ex).map(x => x.text).join(' | ');
  t('the example is called a tie', /within 0.25 points are a tie/.test(txt), txt);
  const w = B.fromExample(); w.criteria[0].weight = 30;
  t('weights not totalling 100 are flagged', /total 115/.test(B.checks(w).map(x => x.text).join()));
  const build = B.normalize(B.fromExample()); build.criteria.forEach(x => { x.build = 5; x.buy = 2; x.partner = 2; }); build.criteria[6].build = 2;
  t('a Build lead with weak team capacity is a warning sign', /team capacity/.test(B.checks(build).map(x => x.text).join()));
  const buy = B.normalize(B.fromExample()); buy.criteria.forEach(x => { x.build = 2; x.buy = 5; x.partner = 2; }); buy.criteria[9].buy = 1;
  t('a Buy lead with a weak exit score says to negotiate exit terms', /data portability/.test(B.checks(buy).map(x => x.text).join()));
  t('a clear lead holds when the heaviest weights move', B.checks(buy).some(x => x.level === 'ok'));
  const shaky = { criteria: [{ name: 'A', weight: 50, build: 5, buy: 1, partner: 1 }, { name: 'B', weight: 50, build: 1, buy: 5, partner: 1 }, { name: 'C', weight: 1, build: 1, buy: 2, partner: 1 }] };
  t('a leader that flips is called sensitive', B.checks(shaky).some(x => /sensitive/.test(x.text)));
}

console.log('--- saving, sharing and CSV ---');
{
  const ex = B.fromExample(); ex.decision.risks = 'Vendor lock-in, "price"\nRisk 2'; ex.title = 'Café dashboard ✓'; ex.months.build = '';
  const back = B.decode(B.encode(ex));
  t('a shared link brings back the same matrix, unicode, blanks and line breaks included', JSON.stringify(back) === JSON.stringify(B.normalize(ex)));
  t('a broken link is ignored', B.decode('%%%') === null);
  const csv = B.toCSV(ex);
  t('the CSV has scores, totals, costs and the decision', /Weighted total \(out of 5.00\),,,,,3.26,3.39,3.41/.test(csv) && /Total three-year cost,430000,375000,325000/.test(csv) && /Our decision,Partner/.test(csv), csv.split('\r\n').slice(0, 20).join(' / '));
  t('a cell starting with = is neutralized', /'=1\+1/.test(B.toCSV({ criteria: [{ name: '=1+1', weight: 100, build: 3 }] })));
  const n = B.normalize({ criteria: Array(20).fill({ name: 'X', weight: 500, build: 9 }), costs: { buy: { upfront: -5, y1: 'abc' } }, decision: { choice: 'steal' } });
  t('limits: 12 criteria, weights 0 to 100, scores 0 to 5, no negative or text costs, known choices only', n.criteria.length === 12 && n.criteria[0].weight === 0 && n.criteria[0].build === 0 && n.costs.buy.upfront === null && n.costs.buy.y1 === null && n.decision.choice === '');
}
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
