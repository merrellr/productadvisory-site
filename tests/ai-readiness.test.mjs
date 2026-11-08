// Tests for assets/js/ai-readiness-core.js (AI Readiness Checklist on /ai-readiness).
// Run:  node tests/ai-readiness.test.mjs
import '../assets/js/ai-readiness-core.js';
const R = globalThis.AIReadinessCore;
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };
const all = (v) => { const a = {}; R.ITEMS.forEach(it => { a[it.id] = v; }); return { title: '', answers: a }; };

console.log('--- the checklist ---');
t('six areas of four statements', R.AREAS.length === 6 && R.ITEMS.length === 24 && R.AREAS.every(a => a.items.length === 4));
t('every statement has something to do about it', R.ITEMS.every(it => it.text.length > 20 && it.fix.length > 20 && /\.$/.test(it.fix)));
t('ids are unique', new Set(R.ITEMS.map(it => it.id)).size === 24);

console.log('--- scoring ---');
{
  const yes = R.results(all('y')), no = R.results(all('n')), part = R.results(all('p')), none = R.results(R.blank());
  t('all Yes is 100, all No is 0, all Partly is 50', yes.score === 100 && no.score === 0 && part.score === 50, [yes.score, no.score, part.score].join());
  t('nothing answered: 0, not complete, no strongest or weakest area', none.score === 0 && none.answered === 0 && !none.complete && none.strongest === '' && none.moves.length === 0);
  t('everything answered is complete', yes.complete && yes.answered === 24);
  t('Not sure counts as no points, and is listed to find out', R.results(all('u')).score === 0 && R.results(all('u')).unknown.length === 24);
  const s = all('y'); s.answers.data1 = 'n'; s.answers.data2 = 'p';
  const r = R.results(s);
  t('an area scores its points out of 8', r.areas.find(a => a.key === 'data').score === 63 && r.areas.find(a => a.key === 'strategy').score === 100, r.areas.map(a => a.key + ':' + a.score).join());
  t('the weakest area is named', r.weakest === 'data');
  t('unanswered statements count as no points but are not called gaps', R.results({ answers: { strategy1: 'y' } }).score === 4 && R.results({ answers: { strategy1: 'y' } }).moves.length === 0);
}

console.log('--- the adoption journey ---');
t('the four stages by score', R.levelFor(0).key === 'you' && R.levelFor(24).key === 'you' && R.levelFor(25).key === 'one' && R.levelFor(49).key === 'one' && R.levelFor(50).key === 'team' && R.levelFor(75).key === 'org' && R.levelFor(100).key === 'org');
t('each stage says what to do next', R.LEVELS.every(l => l.name && l.text && /\.$/.test(l.step)));
t('the example lands on One use case', R.results(R.fromExample()).level.name === 'One use case', R.results(R.fromExample()).score);

console.log('--- next moves ---');
{
  const s = all('y'); s.answers.guardrails1 = 'n'; s.answers.guardrails3 = 'u'; s.answers.tools2 = 'n'; s.answers.strategy4 = 'p'; s.answers.people1 = 'n';
  const r = R.results(s);
  t('at most three, from the weakest area first', r.moves.length === 3 && r.moves[0].id === 'guardrails1' && r.moves[1].id === 'guardrails3', r.moves.map(m => m.id).join());
  t('a Partly answer is not a gap', !r.moves.some(m => m.id === 'strategy4'));
  t('each move says what to do', /one-page rule/.test(r.moves[0].fix));
  t('Not sure answers are listed to find out', r.unknown.length === 1 && r.unknown[0].id === 'guardrails3');
}

console.log('--- safe input, links and files ---');
{
  const n = R.normalize({ title: '  Team  A ', answers: { strategy1: 'y', data1: 'x', nope: 'y', people1: 5 } });
  t('unknown statements and answers are dropped; the title is tidied', n.title === 'Team A' && JSON.stringify(n.answers) === '{"strategy1":"y"}');
  const s = R.fromExample(); s.title = 'Support team ✓';
  const back = R.decode(R.encode(s));
  t('a share link round-trips the title and every answer', back && back.title === 'Support team ✓' && JSON.stringify(back.answers) === JSON.stringify(s.answers));
  t('the link is short and URL-safe', /^[A-Za-z0-9_-]+$/.test(R.encode(s)) && R.encode(s).length < 120);
  t('a broken link gives null, not an error', R.decode('%%%') === null);
  t('unanswered statements stay unanswered through a link', Object.keys(R.decode(R.encode({ answers: { tools4: 'p' } })).answers).join() === 'tools4');
  const csv = R.toCSV(s);
  t('the CSV has a row per statement, each area, and the overall score', csv.split('\r\n').filter(Boolean).length === 1 + 24 + 6 + 1 && /Overall \(0-100\),,,44,"One use case\. Run one pilot/.test(csv), csv.split('\r\n').slice(-2).join(' | '));
  t('a Partly answer comes with what to do; a Yes needs nothing', /^Strategy & goals,We've named one to three business problems we want AI to help with\.,Partly,1,"Pick the one/m.test(csv) && /^Data,We know who owns that data and whether we may use it with AI\.,Yes,2,$/m.test(csv));
}

console.log('--- inside Product Advisory Learning ---');
{
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../assets/css/site.css', import.meta.url), 'utf8');
  const pages = { sc: 'scorecard.html', uc: 'ai-use-cases.html', bb: 'build-buy-partner.html', im: 'impact-score.html', rd: 'ai-readiness.html' };
  const missing = Object.keys(pages).filter(k => !css.includes('html.pa-embed [data-' + k + '="save"]') || !css.includes('html.pa-embed [data-' + k + '="share"]'));
  t('every tool hides its own Save and Share when it runs inside Learning (Learning saves and shares)', missing.length === 0, missing.join());
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
