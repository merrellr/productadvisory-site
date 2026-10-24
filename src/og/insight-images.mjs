// Article images for Insights, in the Product+ style: the cover (1600x900), the index card (800x450), the sharing
// image (1200x675) and in-article figures (1200 wide). Each article's images are described in ARTS below: the cover's
// eyebrow, title, subtitle and illustration (SVG), and each figure's HTML.
//   node src/og/insight-images.mjs <slug>        (needs playwright; then: python3 src/og/to-webp.py <slug>)
// Writes PNGs to assets/insights/<slug>/_png/, which to-webp.py turns into the .webp and .jpg files the site uses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">';
const C = { ink: '#151b2b', navy: '#1d2a44', soft: '#4a5568', mute: '#6b7280', teal: '#1f7a6c', tealDark: '#13332e', mint: '#2fae95',
  amber: '#e7c46a', coral: '#e9a98f', sky: '#a9d4d6', sand: '#d9d2c3', violet: '#7c6bd6', cream: '#f4f2ee' };
const mark = (size) => `<span class="mark" style="font-size:${size}px">Product<i></i></span>`;
const BASE = `*{box-sizing:border-box;margin:0}body{font-family:Inter,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.mark{font-family:Fraunces,serif;font-style:italic;font-weight:600;letter-spacing:-.02em;position:relative;display:inline-block;color:${C.ink}}
.mark i{position:absolute;right:-.62em;top:-.12em;width:.5em;height:.5em;background:
 linear-gradient(${C.tealDark},${C.tealDark}) center/34% 100% no-repeat, linear-gradient(${C.mint},${C.mint}) center/100% 34% no-repeat}
.mono{font-family:'JetBrains Mono',monospace;letter-spacing:.24em;text-transform:uppercase}`;

function coverHtml(a, w, h) {
  const s = w / 1600;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
body{width:1600px;height:900px;transform:scale(${s});transform-origin:0 0;background:linear-gradient(165deg,#eceefb 0%,#e8edf8 48%,#e6f3ee 100%);position:relative;overflow:hidden}
.top{position:absolute;left:80px;top:64px}.pa{position:absolute;right:82px;top:84px;font-size:17px;color:${C.mute}}
.eb{position:absolute;top:180px;width:100%;text-align:center;font-size:19px;color:${C.teal}}
h1{position:absolute;top:218px;width:100%;text-align:center;font-family:'Instrument Serif',serif;font-weight:400;font-size:${a.titleSize || 88}px;letter-spacing:-.025em;line-height:1.02;color:${C.ink};padding:0 120px}
.dek{position:absolute;top:${a.dekTop || 336}px;width:100%;text-align:center;font-size:29px;color:${C.soft}}
.art{position:absolute;left:0;right:0;bottom:0;height:${a.artH || 470}px}</style></head><body>
<div class="top">${mark(56)}</div><div class="pa mono">Product Advisory</div>
<div class="eb mono">${a.eyebrow}</div><h1>${a.title}</h1><div class="dek">${a.dek}</div><div class="art">${a.art}</div></body></html>`;
}

function figureHtml(f) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
body{width:1200px;background:${C.cream};padding:56px 60px 60px;position:relative}
.fm{position:absolute;right:76px;top:34px}
h2{font-family:Fraunces,serif;font-weight:600;font-size:46px;letter-spacing:-.02em;color:${C.navy};margin:0 0 10px;padding-right:180px}
.sub{font-size:21px;color:${C.soft};line-height:1.45;max-width:880px;margin-bottom:34px}
${f.css || ''}</style></head><body><div class="fm">${mark(30)}</div><h2>${f.title}</h2><div class="sub">${f.sub}</div>${f.html}</body></html>`;
}

/* ---------------------------------------------------------------- the articles */
const FEAT = [['Self-serve onboarding', C.sky], ['SSO for enterprise', C.violet], ['Bulk export', C.amber], ['AI usage summary', C.coral]];

function bump({ x1, x2, top, gap, left, right, chip = 300, fs = 21, showScores = true }) {
  // left: [[name, score]...] in RICE order; right: in weighted order
  const color = Object.fromEntries(FEAT);
  let out = '';
  left.forEach(([n], i) => {
    const j = right.findIndex(r => r[0] === n);
    const y1 = top + i * gap + 26, y2 = top + j * gap + 26;
    out += `<path d="M${x1 + chip} ${y1} C ${(x1 + chip + x2) / 2} ${y1}, ${(x1 + chip + x2) / 2} ${y2}, ${x2} ${y2}" stroke="${color[n]}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>`;
  });
  const box = (x, y, n, sc, k) => `<g><rect x="${x}" y="${y}" width="${chip}" height="52" rx="12" fill="#fff" stroke="${color[n]}" stroke-width="3"/>
    <circle cx="${x + 28}" cy="${y + 26}" r="14" fill="${color[n]}"/><text x="${x + 28}" y="${y + 33}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="17" fill="#fff">${k}</text>
    <text x="${x + 54}" y="${y + 33}" font-family="Inter" font-weight="600" font-size="${fs}" fill="${C.ink}">${n}</text>
    ${showScores ? `<text x="${x + chip - 16}" y="${y + 33}" text-anchor="end" font-family="Inter" font-weight="600" font-size="${fs - 2}" fill="${C.mute}">${sc}</text>` : ''}</g>`;
  left.forEach(([n, sc], i) => { out += box(x1, top + i * gap, n, sc, i + 1); });
  right.forEach(([n, sc], i) => { out += box(x2, top + i * gap, n, sc, i + 1); });
  return out;
}
const RICE = [['Bulk export', '900'], ['Self-serve onboarding', '800'], ['AI usage summary', '300'], ['SSO for enterprise', '135']];
const WEIGHTED = [['SSO for enterprise', '75'], ['Self-serve onboarding', '67'], ['AI usage summary', '51'], ['Bulk export', '42']];

const ARTS = {
  'rice-vs-weighted-scoring': {
    cover: {
      eyebrow: 'Product strategy', title: 'RICE or weighted scoring?', dek: 'Same four features, two rankings. When to trust each one.',
      art: `<svg width="1600" height="470" viewBox="0 0 1600 470" xmlns="http://www.w3.org/2000/svg">
        <text x="420" y="74" text-anchor="middle" font-family="JetBrains Mono" font-size="17" letter-spacing="4" fill="${C.mute}">RICE</text>
        <text x="1180" y="74" text-anchor="middle" font-family="JetBrains Mono" font-size="17" letter-spacing="4" fill="${C.mute}">WEIGHTED SCORING</text>
        <text x="420" y="100" text-anchor="middle" font-family="Inter" font-size="16" fill="${C.mute}">reach × impact × confidence ÷ effort</text>
        <text x="1180" y="100" text-anchor="middle" font-family="Inter" font-size="16" fill="${C.mute}">your criteria, your weights</text>
        ${bump({ x1: 270, x2: 1030, top: 130, gap: 76, left: RICE, right: WEIGHTED, chip: 300, fs: 20, showScores: false })}
      </svg>` },
    figures: {
      'rice-vs-weighted': { title: 'RICE vs weighted scoring', sub: 'Both turn a backlog into a ranked list. They value different things.',
        css: `table{width:100%;border-collapse:separate;border-spacing:0 10px;font-size:20px}th{font-family:'JetBrains Mono';font-weight:500;font-size:15px;letter-spacing:.2em;color:${C.mute};text-align:left;padding:0 18px 4px}
          td{background:#fff;padding:18px;vertical-align:top;line-height:1.4;color:${C.ink}}td:first-child{font-weight:700;color:${C.navy};width:190px;border-radius:12px 0 0 12px}td:last-child{border-radius:0 12px 12px 0}
          td.r{border-left:5px solid ${C.teal}}td.w{border-left:5px solid ${C.violet}}`,
        html: `<table><tr><th></th><th>RICE</th><th>WEIGHTED SCORING</th></tr>
          <tr><td>How it scores</td><td class="r">Reach × Impact × Confidence ÷ Effort</td><td class="w">Your criteria, weighted, each scored 1 to 5</td></tr>
          <tr><td>Best for</td><td class="r">Many similar items in one product area</td><td class="w">Different kinds of bets, or a changing strategy</td></tr>
          <tr><td>Strength</td><td class="r">Reach grounds it; quick and comparable</td><td class="w">Makes the strategy visible and debatable</td></tr>
          <tr><td>Misses</td><td class="r">Strategic fit, revenue, risk, compliance</td><td class="w">Anything you leave off the criteria list</td></tr>
          <tr><td>Gaming risk</td><td class="r">Low: hard to inflate reach</td><td class="w">Higher: whoever picks criteria tilts the result</td></tr>
          <tr><td>Watch out for</td><td class="r">Guessed reach dressed up as data</td><td class="w">Scoring before the weights are agreed</td></tr></table>` },
      'two-rankings': { title: 'Same backlog, two answers', sub: 'Four features scored both ways. RICE rewards reach; weighted scoring rewards this year\'s strategy: winning larger customers.',
        css: '', html: `<svg width="1080" height="420" viewBox="0 0 1080 420" xmlns="http://www.w3.org/2000/svg">
          <text x="190" y="22" text-anchor="middle" font-family="JetBrains Mono" font-size="16" letter-spacing="3" fill="${C.mute}">RICE SCORE</text>
          <text x="890" y="22" text-anchor="middle" font-family="JetBrains Mono" font-size="16" letter-spacing="3" fill="${C.mute}">WEIGHTED (OUT OF 100)</text>
          ${bump({ x1: 0, x2: 700, top: 50, gap: 88, left: RICE, right: WEIGHTED, chip: 380, fs: 21 })}
          <text x="540" y="412" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="26" fill="${C.soft}">Bulk export goes from first to last. SSO goes from last to first.</text></svg>` },
      'which-to-use': { title: 'Which should you use?', sub: 'Two questions decide it, and the strongest teams use both.',
        css: `.flow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.q{background:#fff;border-radius:14px;padding:18px 22px;font-size:22px;font-weight:700;color:${C.navy};display:flex;gap:14px;align-items:center}
          .q b{font-family:'JetBrains Mono';font-size:15px;color:#fff;background:${C.navy};border-radius:999px;padding:5px 12px;font-weight:500}
          .q1{grid-column:1/-1}.q2{grid-column:2/4}.a{border-radius:14px;padding:20px 22px;font-size:19px;line-height:1.45;color:${C.ink};background:#fff;border-top:6px solid}.a h3{font-family:Fraunces,serif;font-size:26px;margin-bottom:6px}
          .no{grid-row:2/4}.tag{font-family:'JetBrains Mono';font-size:14px;letter-spacing:.18em;color:${C.mute};display:block;margin-bottom:8px}
          .both{grid-column:1/-1;margin-top:6px;border-radius:14px;padding:22px 24px;background:${C.navy};color:#fff;font-size:20px;line-height:1.5}.both b{color:${C.amber}}`,
        html: `<div class="flow">
          <div class="q q1"><b>1</b>Are the options the same kind of thing, in one product area?</div>
          <div class="a no" style="border-color:${C.violet}"><span class="tag">NO</span><h3>Weighted scoring</h3>Different kinds of bets, or a strategy that's shifting. Agree the criteria and weights first, then score.</div>
          <div class="q q2"><b>2</b><span><span class="tag" style="display:inline;margin-right:10px">IF YES</span>Can you estimate reach with some confidence?</span></div>
          <div class="a" style="border-color:${C.teal}"><span class="tag">YES</span><h3>RICE</h3>Similar items for the same users, where you know roughly how many each one reaches.</div>
          <div class="a" style="border-color:${C.amber}"><span class="tag">NO, IT'S A GUESS</span><h3>ICE</h3>Impact, Confidence, Ease. Lighter, and more honest than RICE built on guessed reach.</div>
          <div class="both"><b>Use both.</b> Each quarter, weighted scoring picks the themes and bets, with leadership agreeing the weights. Within each theme, RICE orders the work week to week.</div></div>` }
    }
  }
  ,'roadmaps-to-rituals': {
    cover: {
      eyebrow: 'Agentic AI', title: 'From roadmaps to rituals', dek: 'How agentic AI is rewriting the product manager\'s job.',
      art: (() => {
        const cards = [['Backlog grooming', 'WEEKLY', 250, 70, C.amber], ['Market research', 'BIWEEKLY', 250, 270, C.sky], ['Experiment design', 'MONTHLY', 1030, 70, C.coral], ['KPI reviews', 'MONTHLY', 1030, 270, C.violet]];
        let s = `<svg width="1600" height="470" viewBox="0 0 1600 470" xmlns="http://www.w3.org/2000/svg">
          <circle cx="800" cy="232" r="150" fill="none" stroke="${C.mint}" stroke-width="4" stroke-dasharray="10 12" opacity=".7"/>
          `;
        cards.forEach(([t, cad, x, y, col]) => {
          const cx = x < 800 ? x + 320 : x, cy = y + 60;
          s += `<line x1="${cx}" y1="${cy}" x2="${x < 800 ? 700 : 900}" y2="${cy < 232 ? 180 : 284}" stroke="${C.sand}" stroke-width="3"/>`;
          s += `<g><rect x="${x}" y="${y}" width="320" height="120" rx="16" fill="#fff" stroke="${C.sand}" stroke-width="2"/>
            <rect x="${x}" y="${y}" width="10" height="120" rx="5" fill="${col}"/>
            <text x="${x + 32}" y="${y + 44}" font-family="JetBrains Mono" font-size="14" letter-spacing="3" fill="${C.mute}">${cad}</text>
            <text x="${x + 32}" y="${y + 80}" font-family="Inter" font-weight="700" font-size="25" fill="${C.ink}">${t}</text>
            <rect x="${x + 262}" y="${y - 16}" width="44" height="44" rx="11" fill="${C.teal}"/>
            <path d="M${x + 284} ${y - 6} q2 10 12 12 q-10 2 -12 12 q-2 -10 -12 -12 q10 -2 12 -12z" fill="#e8f6f1"/></g>`;
        });
        s += `<circle cx="800" cy="232" r="70" fill="${C.navy}"/><circle cx="800" cy="210" r="20" fill="#fff"/><path d="M766 262 a34 30 0 0 1 68 0z" fill="#fff"/>
          <text x="800" y="420" text-anchor="middle" font-family="JetBrains Mono" font-size="15" letter-spacing="3" fill="${C.mute}">THE PM ORCHESTRATES</text></svg>`;
        return s;
      })() },
    figures: {
      'two-buckets': { title: 'Two buckets of PM work', sub: 'Agentic AI is very good at the first bucket and, used well, amplifies you on the second.',
        css: `.b{display:grid;grid-template-columns:1fr 1fr;gap:22px}.k{background:#fff;border-radius:16px;padding:26px 28px;border-top:7px solid}.k h3{font-family:Fraunces,serif;font-size:29px;color:${C.navy};margin-bottom:6px}
          .k .who{font-family:'JetBrains Mono';font-size:15px;letter-spacing:.18em;margin-bottom:16px}.k ul{padding-left:22px;font-size:20px;line-height:1.6;color:${C.ink}}`,
        html: `<div class="b"><div class="k" style="border-color:${C.mint}"><h3>High volume, repeatable</h3><div class="who" style="color:${C.teal}">AGENTS TAKE THE FIRST PASS</div>
          <ul><li>Triage and de-duplicate tickets</li><li>Track competitors and summarize news</li><li>Draft hypotheses and experiment briefs</li><li>Watch metrics and flag anomalies</li></ul></div>
          <div class="k" style="border-color:${C.navy}"><h3>High judgment, high context</h3><div class="who" style="color:${C.navy}">THE PM DECIDES, AGENTS AMPLIFY</div>
          <ul><li>Connect work to strategy and OKRs</li><li>Separate weak signals from hype</li><li>Choose which experiments to run</li><li>Make tradeoffs and say no, with a story</li></ul></div></div>` },
      'four-rituals': { title: 'Four rituals, before and after', sub: 'In each, the agent does the first pass. You decide.',
        css: `table{width:100%;border-collapse:separate;border-spacing:0 10px;font-size:18px}th{font-family:'JetBrains Mono';font-weight:500;font-size:14px;letter-spacing:.18em;color:${C.mute};text-align:left;padding:0 16px 2px}
          td{background:#fff;padding:16px;vertical-align:top;line-height:1.4}td:first-child{font-weight:700;color:${C.navy};width:200px;border-radius:12px 0 0 12px;border-left:6px solid}td:last-child{border-radius:0 12px 12px 0}`,
        html: `<table><tr><th>RITUAL</th><th>THE AGENT</th><th>THE NEW RITUAL</th><th>STILL NEEDS A PM</th></tr>
          <tr><td style="border-color:${C.amber}">Backlog grooming</td><td>Clusters, de-duplicates and drafts tickets; suggests priority</td><td>Review clusters, adjust, approve</td><td>Strategy fit, sequencing, saying no</td></tr>
          <tr><td style="border-color:${C.sky}">Market research</td><td>Tracks competitors and signals; writes a digest</td><td>Weekly digest and a 30-minute review</td><td>Signal versus hype; react, watch or ignore</td></tr>
          <tr><td style="border-color:${C.coral}">Experiment design</td><td>Turns ideas into hypotheses, metrics and briefs</td><td>Monthly idea harvest, weekly picks, debriefs</td><td>Which experiments; the learning agenda</td></tr>
          <tr><td style="border-color:${C.violet}">KPI reviews</td><td>Monitors metrics; writes state of the product</td><td>Read the summary, spend the meeting deciding</td><td>Which metrics matter; the tradeoffs</td></tr></table>` },
      'first-steps': { title: 'How to start: three steps', sub: 'You do not need a full "AI transformation" to see value.',
        css: `.s{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.c{background:#fff;border-radius:16px;padding:26px}.n{width:48px;height:48px;border-radius:50%;background:${C.teal};color:#fff;font-family:Fraunces,serif;font-size:26px;display:grid;place-items:center;margin-bottom:14px}
          .c h3{font-family:Fraunces,serif;font-size:26px;color:${C.navy};margin-bottom:8px}.c p{font-size:19px;line-height:1.5;color:${C.ink}}`,
        html: `<div class="s"><div class="c"><div class="n">1</div><h3>Pick one ritual</h3><p>A workflow that already happens regularly, such as weekly grooming or monthly KPI reviews.</p></div>
          <div class="c"><div class="n">2</div><h3>A good enough first agent</h3><p>Be explicit: gather, summarize, group or propose. Version one will be imperfect; improve it with feedback.</p></div>
          <div class="c"><div class="n">3</div><h3>Protect judgment time</h3><p>Don't fill the time saved with meetings. Make it your sense making block for strategy.</p></div></div>` }
    }
  }
  ,'beyond-automation': {
    cover: {
      eyebrow: 'Customers · AI enablement', title: 'Beyond automation: win customers for life', titleSize: 80, dek: 'AI handles the volume. People deliver the moments that build loyalty.',
      art: (() => {
        let s = `<svg width="1600" height="470" viewBox="0 0 1600 470" xmlns="http://www.w3.org/2000/svg">`;
        // routine requests (chat bubbles) flowing into AI
        [[150, 110], [250, 70], [200, 190], [120, 260], [270, 280]].forEach(([x, y], i) => {
          s += `<g opacity="${0.55 + 0.08 * i}"><rect x="${x}" y="${y}" width="96" height="52" rx="14" fill="#fff" stroke="${C.sand}" stroke-width="2"/><path d="M${x + 18} ${y + 52} l-6 14 18 -14" fill="#fff" stroke="${C.sand}" stroke-width="2" stroke-linejoin="round"/>
            <rect x="${x + 16}" y="${y + 16}" width="56" height="7" rx="3.5" fill="${C.sand}"/><rect x="${x + 16}" y="${y + 30}" width="38" height="7" rx="3.5" fill="${C.sand}"/></g>`;
        });
        const node = (cx, label, sub, inner, fill) => `<circle cx="${cx}" cy="220" r="74" fill="${fill}"/>${inner}
          <text x="${cx}" y="340" text-anchor="middle" font-family="JetBrains Mono" font-size="15" letter-spacing="3" fill="${C.mute}">${label}</text>
          <text x="${cx}" y="366" text-anchor="middle" font-family="Inter" font-size="17" fill="${C.soft}">${sub}</text>`;
        s += `<path d="M380 220 H560" stroke="${C.sand}" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/>`;
        s += `<path d="M720 220 H880" stroke="${C.mint}" stroke-width="6" stroke-linecap="round"/><path d="M866 206 l16 14 -16 14" fill="none" stroke="${C.mint}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += `<path d="M1040 220 H1200" stroke="${C.violet}" stroke-width="6" stroke-linecap="round"/><path d="M1186 206 l16 14 -16 14" fill="none" stroke="${C.violet}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
        s += node(640, 'AI ENGINE', 'handles the volume', `<path d="M640 172 q6 42 48 48 q-42 6 -48 48 q-6 -42 -48 -48 q42 -6 48 -48z" fill="#e8f6f1"/>`, C.teal);
        s += `<text x="800" y="196" text-anchor="middle" font-family="Inter" font-weight="600" font-size="15" fill="${C.teal}">the right moment</text>`;
        s += node(960, 'HUMAN', 'delivers the quick win', `<circle cx="960" cy="196" r="24" fill="#fff"/><path d="M918 262 a42 36 0 0 1 84 0z" fill="#fff"/>`, C.navy);
        s += `<circle cx="1320" cy="220" r="98" fill="none" stroke="${C.violet}" stroke-width="3" opacity=".35"/>`;
        s += node(1320, 'CUSTOMER FOR LIFE', 'trust, advocacy, retention', `<path d="M1320 258 c-46 -30 -62 -52 -62 -74 a30 30 0 0 1 62 -8 a30 30 0 0 1 62 8 c0 22 -16 44 -62 74z" fill="#fff"/>`, C.violet);
        return s + '</svg>';
      })() },
    figures: {
      'key-ideas': { title: 'Beyond automation at a glance', sub: 'Three roles, one thesis and three levels of human impact.',
        css: `.three{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}.c{background:#fff;border-radius:16px;padding:22px 22px 24px}
          .pill{display:inline-block;font-family:'JetBrains Mono';font-size:13px;letter-spacing:.12em;padding:5px 12px;border-radius:999px;margin-bottom:14px}
          .c h3{font-family:Fraunces,serif;font-size:25px;color:${C.navy};margin-bottom:8px;line-height:1.15}.c p{font-size:17.5px;line-height:1.5;color:${C.soft}}
          .two{display:grid;grid-template-columns:1.15fr 1fr;gap:16px}.q{background:#fff;border-radius:16px;padding:26px 28px;border-left:7px solid ${C.violet}}
          .q blockquote{font-family:Fraunces,serif;font-style:italic;font-size:25px;line-height:1.38;color:${C.navy}}.q small{display:block;margin-top:14px;font-size:15px;color:${C.mute}}
          .lv{background:#fff;border-radius:16px;padding:22px 26px}.lv h4{font-family:'JetBrains Mono';font-weight:500;font-size:14px;letter-spacing:.16em;color:${C.mute};margin-bottom:12px}
          .lv div{display:grid;grid-template-columns:18px 1fr;gap:10px;padding:10px 0;border-top:1px solid #ece8e0;font-size:17.5px;line-height:1.4}.lv i{width:12px;height:12px;border-radius:50%;margin-top:6px}`,
        html: `<div class="three">
          <div class="c"><span class="pill" style="background:#dcefe9;color:${C.teal}">AI ROLE</span><h3>The engine of scale</h3><p>AI handles the "what": 24/7 availability, data-driven personalization, smart routing, and instant summaries that get agents up to speed in seconds.</p></div>
          <div class="c"><span class="pill" style="background:#ebe8fb;color:#5a49b8">HUMAN ROLE</span><h3>The heart of the relationship</h3><p>People handle the "how": empathy, creative problem solving, rapport, and the moments of genuine care that turn satisfied customers into loyal advocates.</p></div>
          <div class="c"><span class="pill" style="background:#f8edd0;color:#8a5f12">THE MODEL</span><h3>Co-pilot, not replacement</h3><p>AI spots the perfect moment to hand off. A person steps in with a quick win. The result is an experience no competitor can easily copy.</p></div></div>
          <div class="two"><div class="q"><blockquote>The real magic happens when AI isn't just a replacement but an amplifier, enabling your team to deliver the small, quick wins that build a customer relationship for life.</blockquote><small>The article's key idea</small></div>
          <div class="lv"><h4>THREE LEVELS OF HUMAN IMPACT</h4>
            <div><i style="background:${C.violet}"></i><span><b>Quick win:</b> proactive, personal outreach in the moment</span></div>
            <div><i style="background:${C.teal}"></i><span><b>Empathetic escalation:</b> ownership when frustration peaks</span></div>
            <div><i style="background:#d39b2a"></i><span><b>Deep research:</b> consultative value that astonishes customers</span></div></div></div>` },
      'automation-vs-collaboration': { title: 'Automation alone vs collaborative intelligence', sub: 'The difference isn\'t the technology. It\'s whether AI replaces your team or amplifies it.',
        css: `.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}.col{background:#fff;border-radius:16px;padding:24px 26px;border-top:7px solid}.col h3{font-family:'JetBrains Mono';font-weight:500;font-size:15px;letter-spacing:.18em;margin-bottom:14px}
          .col ul{list-style:none;padding:0;display:grid;gap:12px}.col li{display:grid;grid-template-columns:28px 1fr;gap:10px;font-size:19px;line-height:1.45;color:${C.ink}}
          .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:15px;color:#fff;margin-top:1px}
          .out{margin-top:16px;border-radius:14px;padding:16px 20px;text-align:center}.out b{display:block;font-family:Fraunces,serif;font-size:30px}.out span{font-size:16px;color:${C.soft}}`,
        html: `<div class="cols"><div><div class="col" style="border-color:#c2554b"><h3 style="color:#a33b32">AUTOMATION ONLY</h3><ul>
            <li><span class="ic" style="background:#c2554b">×</span>Efficient but cold: customers feel like ticket numbers</li>
            <li><span class="ic" style="background:#c2554b">×</span>Generic responses that miss emotional context</li>
            <li><span class="ic" style="background:#c2554b">×</span>Complex issues fall through the cracks</li>
            <li><span class="ic" style="background:#c2554b">×</span>No trust built: satisfied isn't the same as loyal</li>
            <li><span class="ic" style="background:#c2554b">×</span>People spend their time on low-value, repetitive work</li></ul></div>
            <div class="out" style="background:#f6e3e0"><b style="color:#a33b32">Transactional</b><span>the outcome of automation alone</span></div></div>
          <div><div class="col" style="border-color:${C.teal}"><h3 style="color:${C.teal}">COLLABORATIVE INTELLIGENCE</h3><ul>
            <li><span class="ic" style="background:${C.teal}">✓</span>AI handles volume; people handle the moments that matter</li>
            <li><span class="ic" style="background:${C.teal}">✓</span>Sentiment detection triggers an empathetic human escalation</li>
            <li><span class="ic" style="background:${C.teal}">✓</span>People are freed up for deep research and consulting</li>
            <li><span class="ic" style="background:${C.teal}">✓</span>Every interaction builds trust and long-term loyalty</li>
            <li><span class="ic" style="background:${C.teal}">✓</span>Support becomes a competitive advantage, not just a cost</li></ul></div>
            <div class="out" style="background:#dcefe9"><b style="color:${C.teal}">Relationship</b><span>the outcome of the collaborative model</span></div></div></div>` },
      'engine-and-heart': { title: 'AI is the engine. People are the heart.', sub: 'AI does the legwork and spots the moment. A person delivers the quick win.',
        css: `.two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.k{background:#fff;border-radius:16px;padding:22px 24px;border-top:7px solid}.k h3{font-family:Fraunces,serif;font-size:26px;color:${C.navy};margin-bottom:10px}
          .k ul{padding-left:20px;font-size:18px;line-height:1.55;color:${C.ink}}
          .sc{background:#fff;border-radius:16px;padding:20px 22px}.sc h4{font-family:Fraunces,serif;font-size:22px;color:${C.navy};margin-bottom:10px}.sc h4 span{font-family:'JetBrains Mono';font-size:13px;letter-spacing:.15em;color:${C.mute};display:block;font-weight:500;margin-bottom:2px}
          .st{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:9px 0;border-top:1px solid #ece8e0;font-size:17px;line-height:1.45}.st b{font-family:'JetBrains Mono';font-weight:500;font-size:13px;letter-spacing:.12em;padding-top:3px}`,
        html: `<div class="two"><div class="k" style="border-color:${C.teal}"><h3>AI: the engine of scale</h3><ul><li>Monitors data, flags patterns, detects sentiment</li><li>Answers routine questions 24/7</li><li>Summarizes history so people are ready instantly</li><li>Scales personalization across thousands of customers</li><li>Spots the perfect moment to hand off to a person</li></ul></div>
          <div class="k" style="border-color:${C.violet}"><h3>People: the heart</h3><ul><li>Read between the lines with empathy and care</li><li>Solve complex, unusual problems creatively</li><li>Build trust through consistent, personal rapport</li><li>Go the extra mile: research, consulting, advocacy</li><li>Turn a support moment into a loyalty-building one</li></ul></div></div>
          <div class="two" style="margin:0"><div class="sc"><h4><span>SCENARIO 1</span>Proactive personal outreach</h4>
            <div class="st"><b style="color:${C.teal}">AI LEGWORK</b>Flags an account repeatedly failing to use a new feature</div>
            <div class="st"><b style="color:${C.violet}">HUMAN WIN</b>A personal email offering a 5-minute walkthrough, not a generic help article</div>
            <div class="st"><b style="color:#a8741a">OUTCOME</b>The customer feels seen, learns the feature and is more invested</div></div>
          <div class="sc"><h4><span>SCENARIO 2</span>Empathetic escalation</h4>
            <div class="st"><b style="color:${C.teal}">AI LEGWORK</b>Sentiment analysis detects high frustration and hands off to a senior agent</div>
            <div class="st"><b style="color:${C.violet}">HUMAN WIN</b>Opens with empathy, has read the history, takes personal ownership</div>
            <div class="st"><b style="color:#a8741a">OUTCOME</b>Immediate de-escalation: a negative moment becomes a trust-building one</div></div></div>` },
      'customer-value-funnel': { title: 'The customer value funnel', sub: 'AI leads at the top. People lead where loyalty is won.',
        css: `.f{display:grid;gap:10px;justify-items:center}.r{display:grid;grid-template-columns:1fr 150px;align-items:center;gap:20px;width:100%}.b{border-radius:14px;padding:14px 20px;text-align:center;justify-self:center}
          .b b{display:block;font-family:Fraunces,serif;font-size:24px}.b span{font-size:17px}.who{font-family:'JetBrains Mono';font-size:13px;letter-spacing:.14em}`,
        html: `<div class="f">
          <div class="r"><div class="b" style="width:100%;background:#fff;border:2px solid ${C.sand}"><b style="color:${C.navy}">First contact</b><span style="color:${C.soft}">AI answers instantly, 24/7: routes, resolves or escalates</span></div><span class="who" style="color:${C.teal}">AI-LED</span></div>
          <div class="r"><div class="b" style="width:88%;background:#fff;border:2px solid ${C.sand}"><b style="color:${C.navy}">Resolution</b><span style="color:${C.soft}">AI summarizes the history; a person steps in for complex issues</span></div><span class="who" style="color:${C.mute}">AI + HUMAN</span></div>
          <div class="r"><div class="b" style="width:74%;background:${C.violet};color:#fff"><b>Quick win moment</b><span>A person delivers a proactive, personal touch</span></div><span class="who" style="color:${C.violet}">HUMAN-LED</span></div>
          <div class="r"><div class="b" style="width:60%;background:${C.teal};color:#fff"><b>Deep value delivery</b><span>Research, consulting, custom solutions</span></div><span class="who" style="color:${C.teal}">HUMAN-LED</span></div>
          <div class="r"><div class="b" style="width:46%;background:${C.tealDark};color:#fff"><b>Lifelong loyalty</b><span>Trust, advocacy, retention</span></div><span class="who" style="color:${C.tealDark}">THE OUTCOME</span></div></div>` }
    }
  }
};

async function main(slug) {
  const a = ARTS[slug];
  if (!a) { console.error('No images described for ' + slug + '. Add it to ARTS in this file.'); process.exit(2); }
  const out = path.join(root, 'assets', 'insights', slug, '_png');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [name, w, h] of [['cover', 1600, 900], ['card', 800, 450], ['og', 1200, 675]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(coverHtml(a.cover, w, h), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, name + '.png') });
    await p.close();
  }
  for (const [name, f] of Object.entries(a.figures || {})) {
    const p = await b.newPage({ viewport: { width: 1200, height: 200 } });
    await p.setContent(figureHtml(f), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    await p.close();
  }
  await b.close();
  console.log('Wrote ' + out);
}
main(process.argv[2]);
