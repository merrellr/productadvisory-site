// Tests for assets/js/impact-core.js (Organizational Impact Score on /impact-score). The worked example must match the
// PDF and spreadsheet (assets/toolkits/organizational-impact-score*).   Run:  node tests/impact.test.mjs
import '../assets/js/impact-core.js';
const I = globalThis.ImpactCore;
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };

console.log('--- the worked example (same numbers as the PDF) ---');
{
  const ex = I.fromExample(), r = I.rank(ex), by = Object.fromEntries(r.map(x => [x.name, x]));
  t('default KPIs total 100', I.totalWeight(ex) === 100);
  t('impact scores match: 64, 47, 62, 42, 50, 35', ['Self-serve onboarding', 'Usage dashboard', 'SSO and audit logs', 'Release automation', 'AI assistant', 'Marketplace'].map(n => by[n].impact).join() === '64,47,62,42,50,35', r.map(x => x.name + ':' + x.impact).join());
  t('adjusted scores match: 51.2, 32.9, 55.8, 37.8, 25, 21', ['Self-serve onboarding', 'Usage dashboard', 'SSO and audit logs', 'Release automation', 'AI assistant', 'Marketplace'].map(n => by[n].adjusted).join() === '51.2,32.9,55.8,37.8,25,21');
  t('ranks match: SSO 1, onboarding 2, release 3, usage 4, AI 5, marketplace 6', r.map(x => x.rank + ':' + x.name).join() === '1:SSO and audit logs,2:Self-serve onboarding,3:Release automation,4:Usage dashboard,5:AI assistant,6:Marketplace', r.map(x => x.rank + ':' + x.name).join());
  t('actions match: Do now, Revisit, Big bet, Quick win, Revisit, Quick win', ['Self-serve onboarding', 'Usage dashboard', 'SSO and audit logs', 'Release automation', 'AI assistant', 'Marketplace'].map(n => by[n].actionName).join() === 'Do now,Revisit,Big bet,Quick win,Revisit,Quick win');
  t('the biggest contributor is named', by['Self-serve onboarding'].driver === 'Revenue growth');
  t('counts per action', JSON.stringify(I.counts(ex)) === '{"do-now":1,"big-bet":1,"quick-win":2,"revisit":2}');
}

console.log('--- scoring rules ---');
{
  const k = [{ name: 'A', weight: 50 }, { name: 'B', weight: 50 }];
  const one = (impacts, confidence, ease) => I.rank({ kpis: k, items: [{ name: 'X', impacts, confidence, ease }] })[0];
  t('all 5s score 100; all 3s score 60', one([5, 5], 100, 3).impact === 100 && one([3, 3], 100, 3).impact === 60);
  t('a blank impact counts as 0', one([5, null], 100, 3).impact === 50);
  t('confidence scales the score', one([5, 5], 50, 3).adjusted === 50);
  t('thresholds: 50 and ease 3 is Do now, ease 2 a Big bet', one([5, 5], 50, 3).action === 'do-now' && one([5, 5], 50, 2).action === 'big-bet');
  t('under 50: ease 4 is a Quick win, ease 3 Revisit', one([2, 2], 100, 4).action === 'quick-win' && one([2, 2], 100, 3).action === 'revisit');
  t('no ease yet: no action, and it says so', one([5, 5], 100, 0).action === null && one([5, 5], 100, 0).actionName === 'Enter ease');
  t('an initiative with no name or no impacts is left out', I.rank({ kpis: k, items: [{ name: '', impacts: [5, 5] }, { name: 'Y', impacts: [null, null] }] }).length === 0);
  const tie = I.rank({ kpis: k, items: [{ name: 'P', impacts: [4, 4], confidence: 100, ease: 3 }, { name: 'Q', impacts: [4, 4], confidence: 100, ease: 3 }] });
  t('equal scores share a rank, in the order entered', tie[0].name === 'P' && tie[0].rank === 1 && tie[1].rank === 1);
}

console.log('--- checks before you commit ---');
{
  const ex = I.fromExample();
  const c = I.checks(ex).map(x => x.text).join(' | ');
  t('the example names the near-tied pairs', /effectively tied: SSO and audit logs and Self-serve onboarding; Release automation and Usage dashboard/.test(c), c);
  const off = I.fromExample(); off.kpis[0].weight = 40;
  t('weights not totalling 100 are flagged, and a weight over 30', /total 120/.test(I.checks(off).map(x => x.text).join()) && /more than 30/.test(I.checks(off).map(x => x.text).join()));
  const guess = { kpis: [{ name: 'A', weight: 100 }], items: [{ name: 'Bold', impacts: [5], confidence: 50, ease: 3 }] };
  t('a high score on a guess is called a hypothesis', /hypothesis/.test(I.checks(guess).map(x => x.text).join()));
  const stable = { kpis: [{ name: 'A', weight: 60 }, { name: 'B', weight: 40 }], items: [{ name: 'Big', impacts: [5, 5], confidence: 100, ease: 3 }, { name: 'Small', impacts: [1, 1], confidence: 100, ease: 3 }] };
  t('a clear order holds when the heaviest weights move', I.checks(stable).some(x => x.level === 'ok' && /holds/.test(x.text)));
  const shaky = { kpis: [{ name: 'A', weight: 50 }, { name: 'B', weight: 50 }], items: [{ name: 'P', impacts: [5, 0], confidence: 100, ease: 3 }, { name: 'Q', impacts: [0, 5], confidence: 100, ease: 3 }] };
  t('an order that flips is called sensitive', I.checks(shaky).some(x => /sensitive/.test(x.text)));
}

console.log('--- saving, sharing and CSV ---');
{
  const ex = I.fromExample(); ex.decision.top = 'Onboarding, "now"'; ex.items[0].name = 'Über onboarding ✓';
  const back = I.decode(I.encode(ex));
  t('a shared link brings back the same sheet, unicode and blanks included', JSON.stringify(back) === JSON.stringify(I.normalize(ex)));
  t('a broken link is ignored', I.decode('%%%') === null);
  const csv = I.toCSV(ex);
  t('the CSV starts with the ranking and quotes text safely', /Rank,Initiative/.test(csv) && /"Onboarding, ""now"""/.test(csv));
  t('a cell starting with = is neutralized', /'=SUM/.test(I.toCSV({ kpis: [{ name: '=SUM(A1)', weight: 100 }], items: [] })));
  const n = I.normalize({ kpis: Array(15).fill({ name: 'K', weight: 5 }), items: Array(9).fill({ name: 'I', impacts: [9, -1, 'x'], confidence: 400, ease: 7 }) });
  t('limits: 10 KPIs, 6 initiatives, impacts 0 to 5, confidence 0 to 100, ease 0 to 5', n.kpis.length === 10 && n.items.length === 6 && n.items[0].impacts.every(v => v === null) && n.items[0].confidence === 75 && n.items[0].ease === 0);
}
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
