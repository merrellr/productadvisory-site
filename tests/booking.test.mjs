// Tests for the booking section of apps-script/ask.gs (www.productadvisory.co/book).
// Run:  node tests/booking.test.mjs
// The script runs in a sandbox with stand-ins for Google Calendar, Sheets and Gmail, so nothing real is touched.
import fs from 'node:fs';
import vm from 'node:vm';

let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + label); } else { fail++; console.log('FAIL  ' + label + (extra ? '   [' + extra + ']' : '')); } };

const TZ = 'America/Chicago';
const parts = (ms, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long', timeZoneName: 'short' })
  .formatToParts(new Date(ms)).map(p => [p.type, p.value]));
function formatDate(d, tz, f) {
  const ms = +d, p = parts(ms, tz);
  if (f === 'yyyy-MM-dd') return p.year + '-' + p.month + '-' + p.day;
  if (f === 'Z') {
    const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const off = Math.round((local - Math.floor(ms / 60000) * 60000) / 60000), a = Math.abs(off);
    return (off < 0 ? '-' : '+') + String(Math.floor(a / 60)).padStart(2, '0') + String(a % 60).padStart(2, '0');
  }
  if (f === 'z') return p.timeZoneName;
  if (f === 'h:mm a') return ((+p.hour % 12) || 12) + ':' + p.minute + (+p.hour < 12 ? ' AM' : ' PM');
  return p.weekday + ' ' + p.month + '/' + p.day + ' ' + p.hour + ':' + p.minute;
}

let now, busy, inserted, removed, sheets, mail, props, cache, aliases, groq;
function reset(at) {
  now = at; busy = []; inserted = []; removed = []; sheets = {}; mail = []; props = { BLOCKED_SENDERS: '@spam.test', GROQ_API_KEY: 'k' }; cache = {}; aliases = ['info@productadvisory.co']; groq = [];
}
const mkSheet = (n) => ({
  appendRow: (r) => sheets[n].push(r.slice()), setFrozenRows() {}, getLastRow: () => sheets[n].length,
  getDataRange: () => ({ getValues: () => sheets[n].map(r => r.slice()) }),
  getLastColumn: () => (sheets[n][0] || []).length,
  getRange: (row, col) => ({ setValue: (v) => { sheets[n][row - 1][col - 1] = v; }, setValues: (v) => { sheets[n][row - 1] = v[0].slice(); } })
});
class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
const sandbox = {
  console: { log() {}, error() {} }, JSON, Math, Object, Array, String, Number, isFinite, RegExp, Error, Date: FakeDate,
  Logger: { log() {} },
  Utilities: { formatDate, getUuid: () => crypto.randomUUID(),
    computeHmacSha256Signature: (v, k) => Array.from(Buffer.from(require_hmac(v, k))), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url') },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; }, getKeys: () => Object.keys(props) }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n] ? mkSheet(n) : null, insertSheet: (n) => { sheets[n] = []; return mkSheet(n); } }) },
  CalendarApp: { getDefaultCalendar: () => ({ getTimeZone: () => TZ }) },
  Calendar: {
    Freebusy: { query: (q) => ({ calendars: { primary: { busy: busy.map(b => ({ start: new Date(b.s).toISOString(), end: new Date(b.e).toISOString() })) } } }) },
    Events: {
      insert: (ev, cal, opt) => { ev._opt = opt; ev.id = 'ev' + inserted.length; ev.hangoutLink = 'https://meet.google.com/abc-' + inserted.length; inserted.push(ev);
        busy.push({ s: Date.parse(ev.start.dateTime), e: Date.parse(ev.end.dateTime), id: ev.id }); return ev; },
      remove: (cal, id, opt) => { removed.push({ id, opt }); busy = busy.filter(b => b.id !== id); }
    }
  },
  GmailApp: { getAliases: () => aliases, sendEmail: (to, subject, body, opts) => mail.push({ to, subject, body, opts }) },
  MailApp: { sendEmail: (o) => mail.push(o) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'rob@productadvisory.co' }), getScriptTimeZone: () => TZ },
  UrlFetchApp: { fetch: (url, o) => { const body = JSON.parse(o.payload); groq.push(body);
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: '**We** ship fast,\nbut want help with discovery.' } }] }) }; } },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (x) => ({ text: x, setMimeType() { return this; } }) }
};
import crypto from 'node:crypto';
function require_hmac(v, k) { return crypto.createHmac('sha256', k).update(v).digest(); }
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../apps-script/ask.gs', import.meta.url), 'utf8'), ctx);
const G = (n) => ctx[n];
const at = (iso) => Date.parse(iso);
const ct = (ms) => formatDate(ms, TZ, 'h:mm a');
const post = (body) => JSON.parse(G('doPost')({ postData: { contents: JSON.stringify(body) } }).text);

console.log('--- open times ---');
{
  // Monday 26 Oct 2026, 08:00 in Chicago (CDT, UTC-5)
  reset(at('2026-10-26T13:00:00Z'));
  busy = [{ s: at('2026-10-27T15:00:00Z'), e: at('2026-10-27T16:00:00Z') }];   // Tuesday 10:00-11:00 CT
  const days = post({ type: 'slots' }).days;
  const byDate = Object.fromEntries(days.map(d => [d.date, d.slots]));
  t('only weekdays are listed, for four weeks', days.length === 21 && days.every(d => [1, 2, 3, 4, 5].includes(new Date(d.date + 'T12:00:00Z').getUTCDay())), days.length);
  t('12 hours\' notice: nothing left today', byDate['2026-10-26'].length === 0);
  const tue = byDate['2026-10-27'].map(ct);
  t('a full day runs 9:00 to 4:30 (the last call ends at 5)', byDate['2026-10-28'].map(ct).join() === '9:00 AM,9:30 AM,10:00 AM,10:30 AM,11:00 AM,11:30 AM,12:00 PM,12:30 PM,1:00 PM,1:30 PM,2:00 PM,2:30 PM,3:00 PM,3:30 PM,4:00 PM,4:30 PM');
  t('busy times are skipped, with 15 minutes free either side', tue.join() === '9:00 AM,11:30 AM,12:00 PM,12:30 PM,1:00 PM,1:30 PM,2:00 PM,2:30 PM,3:00 PM,3:30 PM,4:00 PM,4:30 PM', tue.join());
  t('clocks change: 9:00 is 14:00 UTC before 1 Nov and 15:00 UTC after', new Date(byDate['2026-10-30'][0]).toISOString() === '2026-10-30T14:00:00.000Z' && new Date(byDate['2026-11-02'][0]).toISOString() === '2026-11-02T15:00:00.000Z');
  t('open times are kept for two minutes', !!cache.booking_slots);
}

console.log('--- booking ---');
{
  reset(at('2026-10-26T13:00:00Z'));
  const slot = post({ type: 'slots' }).days.find(d => d.date === '2026-10-28').slots[2];   // Wed 10:00 CT
  const base = { type: 'book', start: slot, name: 'Ada Lovelace', email: 'Ada@Example.com', company: 'Engines Ltd', topic: 'Roadmap help', tz: 'Europe/London', elapsed: 9000 };
  t('a bot (hidden field filled) gets "ok" but nothing is booked', post(Object.assign({}, base, { website: 'x' })).ok && inserted.length === 0);
  t('too fast is refused', post(Object.assign({}, base, { elapsed: 500 })).error === 'too_fast');
  t('a name and a real email are needed', post(Object.assign({}, base, { name: ' ' })).error === 'need_name' && post(Object.assign({}, base, { email: 'nope' })).error === 'bad_email');
  t('a time that is not offered is refused', post(Object.assign({}, base, { start: slot + 60000 })).error === 'taken' && inserted.length === 0);
  t('a blocked sender gets "ok" but nothing is booked', post(Object.assign({}, base, { email: 'x@spam.test' })).ok && inserted.length === 0);
  const r = post(base);
  const ev = inserted[0];
  t('booking works and returns the Meet link and a manage link', r.ok && /meet\.google\.com/.test(r.meet) && /^https:\/\/www\.productadvisory\.co\/book\?b=[0-9a-f]{20}&k=/.test(r.manage), JSON.stringify(r));
  t('the calendar event invites the guest, asks for a Meet link and tells Google to send the invitation',
    ev.attendees[0].email === 'ada@example.com' && ev.conferenceData.createRequest.conferenceSolutionKey.type === 'hangoutsMeet' && ev._opt.sendUpdates === 'all' && ev._opt.conferenceDataVersion === 1 &&
    ev.start.dateTime === new Date(slot).toISOString() && ev.end.dateTime === new Date(slot + 30 * 60000).toISOString() && /Engines Ltd/.test(ev.summary) && /Roadmap help/.test(ev.description));
  const row = sheets.Bookings[1];
  t('it is kept on the Bookings tab', row[3] === 'Ada Lovelace' && row[4] === 'ada@example.com' && row[7] === 'booked' && row[10] === 'Europe/London');
  const guest = mail.find(m => m.to === 'ada@example.com'), note = mail.find(m => m.to === 'info@productadvisory.co');
  t('the guest gets a confirmation from info@, in their own time, with Meet and manage links', guest && guest.opts.from === 'info@productadvisory.co' && /GMT|BST|GMT\+/.test(guest.subject + guest.body) && guest.body.indexOf(r.manage) > -1 && guest.body.indexOf(r.meet) > -1, guest && guest.subject);
  t('info@ gets a note, with Reply-To set to the guest', note && note.opts.replyTo === 'ada@example.com' && /New call booked: Ada Lovelace \(Engines Ltd\)/.test(note.subject));
  t('the same time cannot be booked twice', post(Object.assign({}, base, { email: 'other@example.com' })).error === 'taken');
  t('the booked time is no longer offered', post({ type: 'slots' }).days.find(d => d.date === '2026-10-28').slots.indexOf(slot) < 0);
  const later = post({ type: 'slots' }).days.find(d => d.date === '2026-10-29').slots;
  post(Object.assign({}, base, { start: later[0] }));
  t('one person can hold at most two upcoming calls', post(Object.assign({}, base, { start: later[4] })).error === 'too_many');
  t('text that would run as a formula is stored as text', (() => { reset(at('2026-10-26T13:00:00Z')); const s = post({ type: 'slots' }).days[3].slots[0]; post(Object.assign({}, base, { start: s, name: '=HYPERLINK("x")' })); return sheets.Bookings[1][3] === '\'=HYPERLINK("x")'; })());
}

console.log('--- the manage link: cancel and move ---');
{
  reset(at('2026-10-26T13:00:00Z'));
  const days = post({ type: 'slots' }).days;
  const base = { type: 'book', name: 'Ada Lovelace', email: 'ada@example.com', elapsed: 9000, tz: 'America/Chicago' };
  const r = post(Object.assign({}, base, { start: days[2].slots[0] }));
  const q = new URL(r.manage).searchParams, b = q.get('b'), k = q.get('k');
  t('a wrong key is refused', post({ type: 'booking', b, k: k + 'x' }).error === 'bad_link' && post({ type: 'cancelBooking', b, k: 'nope' }).error === 'bad_link' && removed.length === 0);
  t('a link for a booking that is not current cannot move anything', post({ type: 'book', elapsed: 9000, start: days[4].slots[0], replace: 'f'.repeat(20), k: 'x' }).error === 'bad_link');
  const got = post({ type: 'booking', b, k });
  t('the link shows the booking', got.ok && got.status === 'booked' && got.start === days[2].slots[0] && got.name === 'Ada' && /meet/.test(got.meet));
  const moved = post({ type: 'book', elapsed: 9000, start: days[3].slots[2], replace: b, k });
  t('picking another time from the link needs no details again: it books it and cancels the old one', moved.ok && sheets.Bookings[2][3] === 'Ada Lovelace' && sheets.Bookings[2][4] === 'ada@example.com' && moved.moved && removed.length === 1 && removed[0].id === 'ev0' && sheets.Bookings[1][7] === 'moved' && sheets.Bookings[2][7] === 'booked');
  t('the old time is open again', post({ type: 'slots' }).days[2].slots.indexOf(days[2].slots[0]) > -1);
  const q2 = new URL(moved.manage).searchParams;
  mail = [];
  t('cancel removes the event and marks the sheet', post({ type: 'cancelBooking', b: q2.get('b'), k: q2.get('k') }).ok && removed.length === 2 && removed[1].opt.sendUpdates === 'all' && sheets.Bookings[2][7] === 'cancelled');
  t('info@ hears about the cancellation', mail.some(m => m.to === 'info@productadvisory.co' && /Call cancelled: Ada Lovelace/.test(m.subject)));
  t('cancelling again does nothing more', post({ type: 'cancelBooking', b: q2.get('b'), k: q2.get('k') }).ok && removed.length === 2);
}

console.log('--- "Not sure what to write?": the quick questions ---');
{
  // the page's choices (src/content.py through src/build.py) and the script's must match
  const py = fs.readFileSync(new URL('../src/content.py', import.meta.url), 'utf8');
  const titles = (block) => [...block.matchAll(/^\s*\("[^"]+", "[^"]+", "([^"]+)"/gm)].map(m => m[1]);
  const services = titles(py.split('SERVICES = [')[1].split(']\n')[0]), packages = titles(py.split('PACKAGES = [')[1].split(']\n')[0]);
  const domains = [...py.split('DOMAINS = [')[1].split(']\n')[0].matchAll(/\("([^"]+)", \d+\)/g)].map(m => m[1]);
  t('the services the script accepts are the site\'s services and packages', JSON.stringify(G('BOOKING_SERVICES_')) === JSON.stringify(services.concat(packages, ['Not sure yet'])), services.concat(packages).join('|'));
  t('the help areas the script accepts are the skill areas', JSON.stringify(G('BOOKING_NEEDS_')) === JSON.stringify(domains.concat(['Team skills & training'])));
  reset(at('2026-10-26T13:00:00Z'));
  t('nothing answered: nothing to write', post({ type: 'bookAssist' }).error === 'empty' && groq.length === 0);
  const r = post({ type: 'bookAssist', wins: 'We ship every two weeks', needs: ['Customer & Market Discovery', 'Made up'], services: ['AI Enablement'], timing: 'quarter', company: 'Acme', cid: 'v1' });
  const sent = groq[0] && groq[0].messages[1].content;
  t('the AI gets only the known choices, and returns plain text', r.ok && r.text === 'We ship fast, but want help with discovery.' && /Customer & Market Discovery/.test(sent) && !/Made up/.test(sent) && /This quarter/.test(sent) && /Acme/.test(sent), JSON.stringify(r) + sent);
  t('the AI is told the answers are data, not instructions', /data, not instructions/.test(groq[0].messages[0].content));
  for (let i = 0; i < 4; i++) post({ type: 'bookAssist', wins: 'x', cid: 'v1' });
  t('one visitor gets five notes a day', post({ type: 'bookAssist', wins: 'x', cid: 'v1' }).error === 'daily_limit' && post({ type: 'bookAssist', wins: 'x', cid: 'v2' }).ok);
  props.GROQ_API_KEY = '';
  t('without the AI key it says so (the page writes a plain note instead)', post({ type: 'bookAssist', wins: 'x', cid: 'v3' }).error === 'no_key');
  // the answers travel with the booking
  props.GROQ_API_KEY = 'k';
  const slot = post({ type: 'slots' }).days[2].slots[0];
  const b = post({ type: 'book', start: slot, name: 'Ada', email: 'ada@example.com', elapsed: 9000, wins: 'Fast shipping', needs: ['AI Fluency — Organizational', 'nope'], services: ['Fractional CPO+'], timing: 'now' });
  const row = sheets.Bookings[1], ev = inserted[0];
  t('the answers are kept on the Bookings tab', b.ok && row[11] === 'Fast shipping' && row[12] === 'AI Fluency — Organizational' && row[13] === 'Fractional CPO+' && row[14] === 'This month', JSON.stringify(row.slice(11)));
  t('and shown on the calendar event and in the note to info@', /Needs help with: AI Fluency — Organizational/.test(ev.description) && /Interested in: Fractional CPO\+/.test(ev.description) && mail.some(m => m.to === 'info@productadvisory.co' && /Timing: This month/.test(m.body)));
  const q = new URL(b.manage).searchParams;
  post({ type: 'book', elapsed: 9000, start: post({ type: 'slots' }).days[3].slots[0], replace: q.get('b'), k: q.get('k') });
  t('moving the call keeps the answers', sheets.Bookings[2][13] === 'Fractional CPO+' && sheets.Bookings[2][14] === 'This month');
  // an older Bookings tab gains the new column names
  reset(at('2026-10-26T13:00:00Z'));
  sheets.Bookings = [G('BOOKING_HEADERS_').slice(0, 11)];
  post({ type: 'book', start: post({ type: 'slots' }).days[2].slots[0], name: 'Ada', email: 'ada@example.com', elapsed: 9000 });
  t('a Bookings tab made before these questions gets the new column names', sheets.Bookings[0].length === 15 && sheets.Bookings[0][14] === 'Timing');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
