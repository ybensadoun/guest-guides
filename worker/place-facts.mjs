#!/usr/bin/env node
// A place's facts from sources we may keep (the places work, step 1: docs/plan-ca-la-kimberly-through-the-maker.md,
// "Where a place's facts may come from"). Google only locates a place. Its phone, website and Facebook link come from
// Overture Maps (open data, worker/overture.py); its opening hours, price and "book ahead" from its own website, read by
// Claude; with no usable website, one short web search. A doubtful match fills nothing. Measured on 10 Nov 2026: about
// 18 s and 0.02 USD a place with Haiku 5.5 at low effort. A place that gives nothing is asked once more with more
// effort (step 2), when the caller passes a second ask.
// Run alone it goes over a guide's folder and prints what it finds beside the guide's own values. Without --save it
// writes nothing. With --save each place with a Google id is kept in the table place_facts (worker/place-store.mjs: a
// later weak read never loses an earlier good one), and a place looked at less than 30 days ago is skipped (--fresh: not
// skipped). The worker uses placeFacts and nearby when it builds a guide (worker/host-places.mjs): there the match also
// gives our own name for the place and its kind (engine/src/kinds.json), never Google's. A place no Overture record is
// (a town, a beach, a mountain, some monuments) takes its position, town and kind from GeoNames (worker/geonames.py,
// gazetteer below); each line says where the position and the kind came from.
//   node worker/place-facts.mjs --site <slug> [--only id,id] [--effort low|medium] [--no-retry] [--save [--fresh]]
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { nameOf } from './places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');

// Runs one of our Python readers (worker/overture.py, worker/geonames.py): the question on stdin, JSON on stdout, its
// progress on stderr as lines starting with tag. A failure of any kind (a command that does not start, a stuck download,
// an exit code, an answer that is not JSON) gives empty() and one logged line, so the chain goes on without it.
function runPython(script, question, { python, log, tag, none, empty, take }) {
  const [cmd, ...args] = String(python).trim().split(/\s+/);
  return new Promise(done => {
    let out = '', err = '', over = false;
    const p = spawn(cmd, [...args, resolve(HERE, script)], { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { over = true; p.kill('SIGKILL'); }, 5 * 60000);   // a stuck download must not hold the run
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    let ended = false;   // a command that does not start says so twice (error, then close)
    const fail = why => { clearTimeout(timer); if (ended) return; ended = true; log(`${tag}: ${none} (${why})`); done(empty()); };
    p.on('error', e => fail(e.message));
    p.on('close', code => {
      if (over) return fail('took more than 5 minutes');
      clearTimeout(timer);
      const lines = err.split('\n').map(l => l.trim()).filter(Boolean);
      if (code !== 0) return fail(lines.slice(-1)[0] || 'exit ' + code);
      for (const l of lines) if (l.startsWith(tag + ':')) log(l);   // what was fetched, how big, how long
      let r; try { r = JSON.parse(out); } catch (e) { return fail('its answer was not JSON'); }
      ended = true; done(take(r || {}));
    });
    p.stdin.on('error', () => {});   // a command that does not start closes stdin early
    p.stdin.end(JSON.stringify(question));
  });
}

// Overture's records near each pin (worker/overture.py). pins: [{ id, lat, lng, names: [] }]. Returns
// { release, pins: { id: [candidates] }, towns: { id: town }, looked: [ids] } (towns: the town most records around the pin
// carry, for a place with no record of its own; looked: the pins whose records were really read, since a pin far from the
// house past the first six is not, and "no record near it" must not be read as "gone": worker/check-guides.mjs). If Python
// or Overture fails, no candidates and looked null: the chain goes on with search only.
// python: the command that runs Python with pyarrow and overturemaps (OVERTURE_PYTHON, split on spaces; on the Mac
// `uv run -q --no-project --with overturemaps==2.1.0 --with pyarrow python`).
export function nearby(house, pins, { km = 60, python = process.env.OVERTURE_PYTHON || 'python3', log = console.error } = {}) {
  return runPython('overture.py', { house: { lat: house.lat, lng: house.lng }, km, pins }, { python, log, tag: 'overture', none: 'no records, search only',
    empty: () => ({ release: null, pins: {}, towns: {}, looked: null }),
    take: r => ({ release: r.release || null, pins: r.pins || {}, towns: r.towns && typeof r.towns === 'object' ? r.towns : {}, looked: Array.isArray(r.looked) ? r.looked.map(String) : null }) });
}

// GeoNames' features near each pin that carry one of its names (worker/geonames.py, open data under CC BY 4.0: the
// guide credits GeoNames): towns, beaches, mountains, springs, monuments, which Overture does not list. country: two
// capital letters (the file fetched). pins: as for nearby(). Returns { fetched, pins: { id: [features] } }; if Python or
// the download fails, no features. python: any Python 3.9 or later (standard library only).
// points (optional): [{ id, lat, lng }], the second question of geonames.py: the municipality each lies in, given back as
// places: { id: { town, province, seat, near, near_code, metres, by } or null } (see municipalityAt).
export function gazetteer(country, pins, { python = process.env.GEONAMES_PYTHON || 'python3', log = console.error, points = null } = {}) {
  return runPython('geonames.py', { country, pins, ...(points ? { points } : {}) }, { python, log, tag: 'geonames', none: 'no features',
    empty: () => ({ fetched: null, pins: {}, ...(points ? { places: {} } : {}) }),
    take: r => ({ fetched: r.fetched || null, pins: r.pins && typeof r.pins === 'object' ? r.pins : {}, ...(points ? { places: r.places && typeof r.places === 'object' ? r.places : {} } : {}) }) });
}

// Which GeoNames feature a place is, among those around its pin: the nearest within the reach of its class (P: towns and
// villages; T, H, L, V, U: beaches, mountains, springs, parks, woods; S: buildings and sites), measured from the pin
// Google gives at that moment, so a wrong record cannot move a pin far. venue: a place with a door is never a town.
const REACH = { P: 3000, T: 1000, H: 1000, L: 1000, V: 1000, U: 1000, S: 300 };
const isNum = v => typeof v === 'number' && Number.isFinite(v);
export function featureFor(features, { venue = false } = {}) {
  return (Array.isArray(features) ? features : []).filter(f => f && isNum(f.lat) && isNum(f.lng) && isNum(f.metres) && REACH[f.cls] && f.metres <= REACH[f.cls] && !(venue && f.cls === 'P'))
    .sort((a, b) => (b.exact === true) - (a.exact === true) || a.metres - b.metres)[0] || null;   // the very name before a longer one that holds it, then the nearest
}
// The house's town in GeoNames, when the house's only position is Google's town search (the builder's pos mark): the town
// or village (class P) of that name within its reach of Google's point, whose position is ours to keep. Used at the build
// (worker/guide-worker.mjs) and by the weekly renewal (worker/renew-positions.mjs). Returns { lat, lng, name, metres } or
// null (no town, no name, GeoNames not reachable); never throws. gaz (tests): in place of gazetteer().
export async function townPoint(town, at, { country = 'ES', gaz = gazetteer, python, log = console.error } = {}) {
  const name = String(town || '').trim(), lat = +(at && at.lat), lng = +(at && at.lng);
  if (!name || !isNum(lat) || !isNum(lng)) return null;
  try {
    const g = await gaz(country, [{ id: 'house', lat, lng, names: [name] }], { log, ...(python ? { python } : {}) });
    const f = featureFor((((g && g.pins) || {}).house || []).filter(x => x && x.cls === 'P'));
    return f ? { lat: f.lat, lng: f.lng, name: f.name || name, metres: f.metres } : null;
  } catch (e) { log(`geonames: the town not looked up (${e.message})`); return null; }
}
// The municipality the house lies in, from GeoNames (open data, ours to keep; the guide credits GeoNames): the area
// research names it in its brief, nearest villages first (worker/guide-worker.mjs), and the builder fills the host's town
// with it when they gave none (onboarding-site/src/start.js). at: the house's point. Returns { town, province, near,
// metres, fetched }: town the municipality ("la Bisbal del Penedès"), province its province or null, near the nearest
// town, village, hamlet or housing estate GeoNames lists ("Can Gordei", or the town itself) and metres its distance from
// the point; or null (no town or village within 10 km, no point, GeoNames not reachable). Never throws. gaz (tests): in
// place of gazetteer().
export async function municipalityAt(at, { country = 'ES', gaz = gazetteer, python, log = console.error } = {}) {
  const lat = +(at && at.lat), lng = +(at && at.lng);
  if (!at || at.lat == null || at.lng == null || !isNum(lat) || !isNum(lng)) return null;
  try {
    const g = await gaz(country, [], { log, points: [{ id: 'house', lat, lng }], ...(python ? { python } : {}) });
    const m = ((g && g.places) || {}).house, text = x => typeof x === 'string' && x.trim() ? x.trim().slice(0, 80) : null;
    if (!m || !text(m.town)) return null;
    return { town: text(m.town), province: text(m.province), near: text(m.near), metres: isNum(m.metres) ? m.metres : null, fetched: (g && g.fetched) || null };
  } catch (e) { log(`geonames: the municipality not looked up (${e.message})`); return null; }
}
// Our kind (engine/src/kinds.json, todo) from a feature's class and code, for a place Claude gave no kind.
const CODE_KIND = { 'T.BCH': 'beach', 'T.MT': 'mountain', 'T.MTS': 'mountain', 'T.PK': 'mountain', 'T.HLL': 'mountain', 'H.SPNG': 'spring',
  'S.MSTY': 'monastery', 'S.CH': 'monastery', 'S.CTHD': 'monastery', 'S.MUS': 'palette', 'S.CSTL': 'castle', 'S.RUIN': 'roman', 'S.ANS': 'roman',
  'S.MNMT': 'arch', 'S.AMUS': 'themepark' };
export const featureKind = f => !f ? null : f.cls === 'P' ? (+f.pop >= 100000 ? 'city' : 'town') : CODE_KIND[`${f.cls}.${f.code}`] || null;

const host = u => { try { return new URL(/^https?:/i.test(u) ? u : 'http://' + u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; } };
// The name part of a host: "recaredo" of recaredo.es and of recaredo.com, "bar" of bar.co.uk.
const label = h => { const p = h.split('.'); return (p.length > 2 && /^(co|com|org|net|gov|edu|ac)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2 ? p[p.length - 3] : p[p.length - 2]) || ''; };
// Not a place's own website: directories, maps, reviews, booking and social sites. Facebook and Instagram are kept only
// as links (their terms do not allow reading them by automated means).
const DENY = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|tripadvisor\.[a-z.]+|facebook\.com|fb\.com|fb\.me|instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linkedin\.com|thefork\.[a-z.]+|eltenedor\.[a-z.]+|yelp\.[a-z.]+|booking\.com|airbnb\.[a-z.]+|expedia\.[a-z.]+|hotels\.com|foursquare\.com|restaurantguru\.com|wikipedia\.org|wikiloc\.com|paginasamarillas\.es|cylex\.[a-z.]+|infoisinfo\.[a-z.]+|guiarepsol\.com|michelin\.com|openstreetmap\.org|bing\.com|apple\.com|waze\.com|linktr\.ee|wa\.me|whatsapp\.com)$/;
export const denied = u => !host(u) || DENY.test(host(u));
export const webUrl = u => { if (typeof u !== 'string') return null; try { const x = new URL(u.trim()); return /^https?:$/.test(x.protocol) && x.hostname.includes('.') ? x.href : null; } catch (e) { return null; } };

// Our own check of a website (from Overture: some are dead or now lead elsewhere): it must answer within 12 s and land on
// a site of the same name (recaredo.es -> recaredo.com is fine, calafellhistoric.org -> x-andra.ro is not). When the page
// fails, its home page is tried. Returns the address it landed on, or null.
// The worker opens addresses that come from outside (Overture's records, and since the editor's "paste its website" a
// host's own typing), so it only ever opens a public web address: http or https on its usual port, a name and not a
// number, no sign-in part, and a name that resolves to public addresses only (never this machine, the server's private
// network or its provider's metadata address). Each redirect is checked the same way before it is followed.
// NET.lookup is replaced in tests, which have no network.
export const NET = { lookup: h => lookup(h, { all: true }) };
const private4 = ip => { const [a, b] = ip.split('.').map(Number); return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19)) || a >= 224; };
const private6 = ip => { const s = ip.toLowerCase(); return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('::ffff:') || s.startsWith('64:ff9b:') || s.startsWith('2002:'); };
export async function publicUrl(u) {
  try {
    const x = new URL(u), h = x.hostname.replace(/^\[|\]$/g, '');
    if (!/^https?:$/.test(x.protocol) || x.username || x.password || (x.port && x.port !== '80' && x.port !== '443') || isIP(h) || !h.includes('.')) return false;
    const as = await NET.lookup(h);
    return Array.isArray(as) && as.length > 0 && as.every(a => a && (a.family === 4 ? !private4(a.address) : a.family === 6 ? !private6(a.address) : false));
  } catch (e) { return false; }
}
// Also the monthly check's look at a place's website (worker/check-guides.mjs), with a shorter wait (ms). null: not a public
// address (or a name that does not resolve), or too many redirects; a failed connection throws.
export async function openPublic(u, hops = 4, ms = 12000) {
  for (let i = 0; i < hops; i++) {
    if (!(await publicUrl(u))) return null;
    const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(ms), headers: { 'user-agent': 'Mozilla/5.0 (guest guide website check)' } });
    r.body?.cancel().catch(() => {});
    const to = r.status >= 300 && r.status < 400 && r.headers && r.headers.get('location');
    if (!to) return { status: r.status, url: u };
    u = new URL(to, u).href;
  }
  return null;
}
export async function siteAlive(url) {
  const first = webUrl(/^https?:/i.test(String(url || '')) ? url : 'http://' + url);
  if (!first) return null;
  for (const u of new Set([first, new URL(first).origin + '/'])) {
    try { const r = await openPublic(u);
      if (r && r.status < 400 && label(host(r.url)) === label(host(first))) return r.url; } catch (e) { /* next */ }
  }
  return null;
}

// What Claude must say about the site, and how to read it. For a place to eat, also its kind as its own menu or
// description shows it (measured 10 Nov 2026: from a bare name the match gave plain "Restaurant" to 7 of 12 places).
const SHAPE = list => `{"website": "the address of the place's own site that you read, or null", "about": true if that site is clearly this place's own site else false, "phone": "as written on its site, or null", "hours": the opening hours of the place itself, or null if the site does not state them, "price": "typical price per person in euros if the site shows prices (menu, set menu, tickets), like 20-30 or 8, or null", "book": true if the site says booking is needed or recommended, else null, "season": the part of the year the place is open, {"from":"MM-DD","to":"MM-DD"}, only when the site states it plainly (see below), else null${list === 'eat' ? `, "kind": the one key from this list that the site's own menu or description shows: ${Object.entries(KINDS.eat).map(([k, v]) => `${k} (${v.name.en})`).join(', ')}; or null` : ''}}
Opening hours: a list of lines like [{"days":["tue","wed","thu"],"open":"10:00","close":"14:00"},{"days":["tue","wed","thu"],"open":"16:00","close":"19:00"}]. Days as mon tue wed thu fri sat sun. Times HH:MM in 24 h; a close earlier than the open means after midnight. Only the hours of this place, never those of a restaurant, hotel, café or shop inside it or beside it, nor those of its office or phone line. When the site gives different hours by season or part of the year, give one line per season and time span, each with "from":"MM-DD","to":"MM-DD" (like "from":"06-15","to":"09-15"). null when the site does not state them. Never guess.
Season: only for a place that opens part of the year, when its site says between which dates or months in plain words, like "open from June to September" ({"from":"06-01","to":"09-30"}: a month alone means its first day for the opening and its last day for the closing) or "temporada de verano del 15 de junio al 15 de septiembre" ({"from":"06-15","to":"09-15"}). A season may run over the new year ({"from":"11-01","to":"03-31"}). null when the place is open all year, when the site only says "summer", "in season" or "check our social media" without dates or months, or when the dates are those of one event. Copy what the page states, never guess.`;
const READ = `read its phone number, opening hours, the part of the year it opens if it does not open all year, prices and whether booking is asked. You may open up to two more pages of that same site (contact, hours, prices, menu, tickets). Use only the place's own site, never a directory, a map or a review site. Never guess.`;
const where = p => `"${p.name}"${p.town ? ` in ${p.town}` : ''}, ${p.country || 'Spain'}`;
// The kinds a place can have, by list (engine/src/kinds.json, the builder's and the generator's list too): the match picks
// one from the host's words and the record, never from Google.
const KINDS = JSON.parse(readFileSync(resolve(ROOT, 'engine/src/kinds.json'), 'utf8'));
export const kindsOf = list => list === 'eat' || list === 'todo' ? KINDS[list] : null;
const json = t => { try { return JSON.parse(String(t || '').match(/\{[\s\S]*\}/)[0]); } catch (e) { return null; } };

// What comes back from Claude is checked before it is kept: anything not in the expected shape is dropped.
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const hhmm = t => { const m = String(t || '').trim().match(/^(\d{1,2})[:.h](\d{2})$/); if (!m || +m[1] > 24 || +m[2] > 59 || (+m[1] === 24 && +m[2])) return null; return `${String(+m[1] % 24).padStart(2, '0')}:${m[2]}`; };
const mmdd = s => { const m = String(s || '').trim().match(/^(\d{2})-(\d{2})$/); return m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31 ? m[0] : null; };
export function cleanHours(h) {
  if (!Array.isArray(h)) return null;
  const out = [], seen = new Set();
  for (const s of h) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.days)) continue;
    const days = DAYS.filter(d => s.days.map(x => String(x).toLowerCase().slice(0, 3)).includes(d)), open = hhmm(s.open), close = hhmm(s.close);
    if (!days.length || !open || !close || open === close) continue;
    const line = { days, open, close }, from = mmdd(s.from), to = mmdd(s.to);
    if (from && to && from !== to) { line.from = from; line.to = to; }
    const key = JSON.stringify(line); if (!seen.has(key)) { seen.add(key); out.push(line); }
  }
  return out.length ? out : null;
}
// A season of the place's own (no hours of the same read): { from, to }, real days of the year, two different days.
const LAST = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function cleanSeason(s) {
  if (!s || typeof s !== 'object') return null;
  const from = mmdd(s.from), to = mmdd(s.to), ok = v => +v.slice(3) <= LAST[+v.slice(0, 2) - 1];
  return from && to && from !== to && ok(from) && ok(to) ? { from, to } : null;
}
const cleanPrice = p => { if (p == null) return null; const s = String(p).replace(/€|eur(os)?|\s/gi, '').replace(/[‒-―]/g, '-');
  return /^\d+([.,]\d+)?(-\d+([.,]\d+)?)?$/.test(s) ? s : null; };
const cleanText = s => typeof s === 'string' && s.trim() ? s.trim().slice(0, 80) : null;
const eatKind = k => typeof k === 'string' && Object.hasOwn(KINDS.eat, k.trim()) ? k.trim() : null;
// A Spanish number as the guides show it ("977 66 16 25"); any other number as given.
export const showPhone = t => { const s = cleanText(t); if (!s) return null; const d = s.replace(/[\s.()\-\/]/g, '').replace(/^(\+|00)34(?=\d{9}$)/, '');
  return /^[6789]\d{8}$/.test(d) ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : s; };

// One place: place = { name, town, about? (the host's own words, they help the match), country? (default Spain),
// list? ('eat' or 'todo': which kinds it may have; without it no kind is asked), website? (a page the host pasted in the
// editor: read first, before Overture's, and kept as the place's website with source 'site') }. name may be empty: a card the host
// kept without typing anything, matched on the entries alone. cands = Overture's records near its pin (nearby()),
// ask = makeClaude(...) from worker/claude-api.mjs.
// again (optional): a second ask, with more effort. Reading a site does not always work the first time, so a place that
// gives nothing is asked once more: at most one more match question and one more site read, never more.
// matchOnly: only the match question (the record, its name, our kind), no site read and no search: for a place whose
// site was read lately and that only lacks a name, a kind or a position of ours (a few hundredths of a cent).
// features: GeoNames' features around the pin (gazetteer()): a position of ours, a town and a kind for a place no
// Overture record is (a town, a beach, a mountain). The result says where each came from: posFrom ('overture',
// 'geonames' or null: Google's only), townFrom, nameFrom, kindFrom ('claude', 'site', 'geonames' or null).
export async function placeFacts(place, cands, ask, { meter, again, matchOnly = false, features = [] } = {}) {
  const m = meter || {}, before = m.usd || 0, errors = [];
  const asker = f => (prompt, o) => f(prompt, { ...o, meter: m }).catch(e => { errors.push(e.message); return ''; });
  const q = asker(ask), q2 = again ? asker(again) : null;
  cands = Array.isArray(cands) ? cands : [];
  // The record as kept: its own position too (Overture's, which may be kept for good, unlike Google's).
  const pos = c => c ? { id: c.id, name: c.name, category: c.kind, lat: typeof c.lat === 'number' ? c.lat : null, lng: typeof c.lng === 'number' ? c.lng : null } : null;
  const cost = () => +((m.usd || 0) - before).toFixed(4);

  // a. Which record is this place, and is it a place with a door at all: Claude without the web. Not sure, or none: no
  // record (a doubtful match fills nothing). A town, a beach or a natural spot has no phone, website or hours to look
  // for: nothing is searched for it (measured 10 Nov 2026: a third of the cost went into searching for towns' websites).
  // The same question also gives our own name for the place (the entry's, as the place writes it) and its kind from the
  // list for place.list: both from the host's words and the entry only, so nothing of Google's is kept.
  const list = cands.map((c, i) => `${i + 1}. ${c.name} | ${String(c.kind || 'kind unknown').replace(/_/g, ' ')}${c.status && c.status !== 'open' ? ' | ' + String(c.status).replace(/_/g, ' ') : ''}${c.town ? ' | ' + c.town : ''} | ${c.metres} m away | ${(c.websites || []).map(host).filter(Boolean)[0] || 'no website'}`).join('\n');
  const named = !!String(place.name || '').trim(), K = kindsOf(place.list);
  const kinds = K ? Object.entries(K).map(([k, v]) => `${k} (${v.name.en})`).join(', ') : '';
  const said = place.about ? ` (in the host's words: ${place.about})` : '';
  const MATCH = `${named ? `A host recommends ${where(place)}${said}.` : `A host kept a place at this spot${place.town ? ` in ${place.town}` : ''}, ${place.country || 'Spain'}, from a list of ${place.list === 'todo' ? 'things to do (a sight, a museum, an activity, a park, a beach, a nature spot, a winery)' : 'places to eat and drink'}, and we do not have its name${said}.`} ${cands.length ? `An open directory lists these entries within 150 m of it:\n${list}` : 'An open directory lists nothing within 150 m of it.'}\nFirst: is the host's place a venue, that is a business or a visitor site with a door, a phone and opening hours of its own (a restaurant, a bar, a shop, a museum, a monument, a park with a gate, a winery, a spa)? A town, a village, a city, a beach, a mountain, a spring or any open natural spot is not a venue.\n`
    + (named ? `Then: which entry is the same place as the host's (the same business or the same site, even if spelt or named a little differently)? Another business that only shares a word with it, or sits next door, is not it. The entry must carry the word that sets the host's name apart (for "La Fàbrica del Pernil" that word is Pernil, not Fàbrica): without it you are not sure. `
      : `Then: which entry is the place the host kept? It is the entry that is such a place; the shops, restaurants, hotels, offices and services around it are not${place.list === 'todo' ? '' : ' unless the list is of places to eat'}. Two entries that are plainly the same place under two names count as one: take the better named. When two or more different entries could be it, or none is such a place, none is it and you are not sure. `)
    + `A town, a village, a beach or a natural spot is never matched to a business or building that carries its name (a school, a hotel, a shop, a restaurant).\n`
    + `Its name: when an entry is the place, the entry's name as the place itself writes it, correcting only a clear typing fault or a web address written as a name ("esenciaelvendrell" is "Esencia", "Pith and Putt Vendrell" is "Pitch and Putt Vendrell"), else null.\n`
    + (K ? `Its kind: the one key from this list that best says what the place is, from the host's words and the entry: ${kinds}. null when you are unsure.\n` : '')
    + `Answer with JSON only: {"venue": true or false, "entry": the number, or null if none is it, "sure": true if you are sure, else false, "name": "the name" or null${K ? ', "kind": "a key" or null' : ''}}`;
  const decide = a => { const n = a && Number.isInteger(a.entry) ? a.entry : 0, entry = a && a.sure === true && n >= 1 && n <= cands.length ? cands[n - 1] : null;
    return { usable: !!a && typeof a.venue === 'boolean', entry, venue: !(a && a.venue === false),
      name: entry ? cleanText(a.name) || cleanText(entry.name) : null,   // a name only for a sure entry; the entry's own when Claude gave none
      kind: K && a && typeof a.kind === 'string' && Object.hasOwn(K, a.kind.trim()) ? a.kind.trim() : null }; };
  const match = async () => {
    let d = decide(json(await q(MATCH, { web: false, what: 'place match' }))), tries = 1;
    // A venue with candidates but no sure record: once more with more effort, the second answer wins when usable.
    if (q2 && cands.length && !d.entry && (!d.usable || d.venue)) { tries = 2; const d2 = decide(json(await q2(MATCH, { web: false, what: 'place match' }))); if (d2.usable) d = d2; }
    return { ...d, tries };
  };
  const a = await match(), entry = a.entry;
  // The position: Overture's for the chosen record, else the GeoNames feature's (both ours to keep), else none (the
  // caller keeps Google's for 30 days). The feature is given even when Overture places it: it may still say the town
  // and the kind. The name, the town and the kind of Things to do fall back on it only where the record and Claude gave none.
  const feature = featureFor(features, { venue: a.venue }), fl = feature ? { id: String(feature.id), name: feature.name, cls: feature.cls, code: feature.code, lat: feature.lat, lng: feature.lng, pop: +feature.pop || 0 } : null;
  const posFrom = entry && isNum(entry.lat) && isNum(entry.lng) ? 'overture' : fl ? 'geonames' : null;
  const town = entry && entry.town ? entry.town : fl && fl.cls === 'P' ? fl.name : null, townFrom = !town ? null : entry && entry.town ? 'overture' : 'geonames';
  const name = a.name || (fl && cleanText(fl.name)) || null, nameFrom = !name ? null : a.name ? 'overture' : 'geonames';
  const gk = place.list === 'todo' && !a.kind ? featureKind(fl) : null;
  const ourKind = a.kind || (gk && K && Object.hasOwn(K, gk) ? gk : null), kindFrom = a.kind ? 'claude' : ourKind ? 'geonames' : null;
  const ours = { name, nameFrom, ourKind, kindFrom, feature: fl, posFrom, town, townFrom };
  const given = place.website ? webUrl(/^https?:/i.test(String(place.website)) ? place.website : 'http://' + place.website) : null;   // a page the host gave: a place with a door
  if (!a.venue && !given) return { entry: pos(entry), venue: false, ...ours, phone: null, phoneFrom: null, website: null, websiteFrom: null, facebook: null, instagram: null,
    category: entry && entry.kind || null, hours: null, price: null, book: null, season: null, page: null, read: new Date().toISOString().slice(0, 10),
    usd: cost(), tries: 1, matchTries: a.tries, gained: [], ...(errors.length ? { error: errors[0] } : {}) };
  // The site is read and searched by a name: the host's, else ours from the entry or the feature. A kept card with none
  // has nothing to search by, so nothing is read.
  place = { ...place, name: named ? place.name : name || '' };

  // b. From the record: phone, social links, a website to check, town and Overture's own kind (raw).
  const links = entry ? [...(entry.socials || []), ...(entry.websites || [])] : [];
  const social = re => links.map(webUrl).find(u => u && re.test(host(u))) || null;
  const own = entry ? (entry.websites || []).map(u => webUrl(/^https?:/i.test(u) ? u : 'http://' + u)).find(u => u && !denied(u)) || null : null;

  // c. Its website: the host's page or else Overture's, if it answers on its own address, read by Claude; else, or if that read finds nothing of
  // its own, one web search. A pass that ends with no site, or a site with neither hours nor price, is read once more
  // with more effort; the second read fills what it holds, the first keeps the rest.
  // The host's own page, when they gave one: it must answer like Overture's (a directory or a social site is not read).
  const theirs = given && !denied(given) && !matchOnly ? await siteAlive(given) : null;
  const alive = theirs || (own && !matchOnly ? await siteAlive(own) : null), aliveFrom = theirs ? 'site' : 'overture', searchable = !!place.name;
  const ok = x => x && x.about === true && webUrl(x.website) && !denied(x.website);
  const read = (f, url) => f(url ? `Open ${url} : it should be the website of ${where(place)}. From it, ${READ}\nAnswer with JSON only: ${SHAPE(place.list)}`
    : `Search the web for the official website of ${where(place)}. Open it and ${READ}\nAnswer with JSON only: ${SHAPE(place.list)}`, { web: true, what: 'site facts', searches: 3 }).then(json);
  const thin = x => !ok(x) || (!cleanHours(x.hours) && !cleanPrice(x.price));
  const siteStep = async () => {
    let r = null, from = null;
    if (!searchable) return { site: null, from: null, tries: 0, gained: [] };
    if (alive) { r = await read(q, alive); from = aliveFrom; }
    if (!ok(r)) { r = await read(q, null); from = 'search'; }
    const first = ok(r) ? r : null;
    if (!q2 || !thin(r)) return { site: first, from: first ? from : null, tries: 1, gained: [] };
    const r2 = await read(q2, alive);
    if (!ok(r2)) return { site: first, from: first ? from : null, tries: 2, gained: [] };
    const pick = (k, clean) => clean(r2[k]) ? r2[k] : first ? first[k] : null;
    const site = first ? { ...first, phone: pick('phone', cleanText), hours: pick('hours', cleanHours), price: pick('price', cleanPrice), kind: pick('kind', eatKind), season: pick('season', cleanSeason), book: r2.book === true ? true : first.book } : r2;
    const gained = [!first && 'site', cleanHours(site.hours) && !(first && cleanHours(first.hours)) && 'hours', cleanPrice(site.price) && !(first && cleanPrice(first.price)) && 'price'].filter(Boolean);
    return { site, from: first ? from : alive ? aliveFrom : 'search', tries: 2, gained };
  };
  const { site, from: websiteFrom, tries, gained } = matchOnly ? { site: null, from: null, tries: 0, gained: [] } : await siteStep();

  // d, e. Kept only when Claude read the place's own site, and only what is in the expected shape. A place to eat takes
  // the kind its site shows over none or plain "Restaurant"; a more precise kind from the match (the host's words) stays.
  const page = site ? webUrl(site.website) : null;
  const sk = place.list === 'eat' && site ? eatKind(site.kind) : null;
  if (sk && (!ours.ourKind || ours.ourKind === 'fork')) { ours.ourKind = sk; ours.kindFrom = 'site'; }
  const sitePhone = site ? cleanText(site.phone) : null, ovPhone = entry ? cleanText((entry.phones || [])[0]) : null;
  const res = { entry: pos(entry), venue: true, ...ours,
    phone: showPhone(ovPhone || sitePhone), phoneFrom: ovPhone ? 'overture' : sitePhone ? 'site' : null,   // Overture's matched the hand-checked phone more often
    website: site ? (alive && websiteFrom === aliveFrom ? alive : page) : null, websiteFrom,
    facebook: social(/(^|\.)(facebook\.com|fb\.com|fb\.me)$/), instagram: social(/(^|\.)instagram\.com$/),
    category: entry && entry.kind || null,
    hours: site ? cleanHours(site.hours) : null, price: site ? cleanPrice(site.price) : null, book: site && site.book === true ? true : null,
    // A season only for a place with no hours from the same read: hours with their own season stay lines with from/to.
    season: site && !cleanHours(site.hours) ? cleanSeason(site.season) : null,
    page, read: new Date().toISOString().slice(0, 10), usd: cost(), tries, matchTries: a.tries, gained };
  if (errors.length) res.error = errors[0];
  return res;
}

/* ---------- Run over a guide's folder: printed; with --save, kept in the database (place_facts), nothing else ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : ''; };
  const flag = k => process.argv.includes(k);
  const slug = arg('--site'), only = arg('--only').split(',').filter(Boolean), effort = arg('--effort') || 'low';
  const save = flag('--save'), fresh = flag('--fresh'), retry = effort === 'low' && !flag('--no-retry');
  if (!slug || !['low', 'medium'].includes(effort)) { console.error('Use: node worker/place-facts.mjs --site <slug> [--only id,id] [--effort low|medium] [--no-retry] [--save [--fresh]]'); process.exit(1); }
  const dir = resolve(ROOT, 'sites', slug), read = f => existsSync(resolve(dir, f)) ? JSON.parse(readFileSync(resolve(dir, f), 'utf8')) : null;
  // The worker's own settings file, as the prototype read it (never printed).
  const env = {}, envFile = resolve(HERE, '.env.local');
  if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  if (!env.WORKER_ANTHROPIC_KEY) { console.error('Needs WORKER_ANTHROPIC_KEY in worker/.env.local.'); process.exit(1); }
  if (save && !env.SUPABASE_SERVICE_KEY) { console.error('--save needs SUPABASE_SERVICE_KEY in worker/.env.local.'); process.exit(1); }
  // The house's position: content/house.json (approximate on purpose), or site.json if a guide keeps it there.
  const h = read('content/house.json') || {}, s = read('site.json') || {}, house = typeof h.lat === 'number' ? h : typeof (s.house || {}).lat === 'number' ? s.house : null;
  if (!house) { console.error(`No house position in sites/${slug}/content/house.json.`); process.exit(1); }
  let places = [];
  for (const f of ['content/restaurants.json', 'content/todo.json', 'content/nightlife.json']) for (const x of (read(f) || {}).items || []) {   // nightlife's kinds are those of eat
    if (only.length && !only.includes(x.id)) continue;
    const n = x.name, names = [...new Set([x.name_local, ...(typeof n === 'string' ? [n] : [n && n.ca, n && n.es, n && n.en])].filter(Boolean))];
    places.push({ it: x, file: f.split('/')[1], place: { name: x.name_local || nameOf(n), town: x.town || null, about: x.type && typeof x.type === 'object' && x.type.en || undefined, list: f === 'content/todo.json' ? 'todo' : 'eat' }, names });
  }
  if (!places.length) { console.error('No places to look at.'); process.exit(1); }
  // With --save: the table, through Supabase's REST API as the worker reaches it (same errors), read before any Claude
  // call so a place kept less than 30 days ago costs nothing.
  let store = null, kept = {}, skipped = 0, saved = 0, noGid = 0;
  if (save) {
    const { makeStore, isGid, due } = await import('./place-store.mjs');
    const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), KEY = env.SUPABASE_SERVICE_KEY;
    const rest = async (path, o = {}) => {
      const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) }, body: o.body === undefined ? undefined : (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)) });
      const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
      if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof j === 'string' ? j : JSON.stringify(j)}`.slice(0, 400));
      return j;
    };
    store = makeStore(rest);
    for (const p of places) p.gid = isGid(p.it.gid) ? p.it.gid : null;
    try { kept = await store.get(places.map(p => p.gid).filter(Boolean)); } catch (e) { console.error(`Could not read place_facts: ${e.message}`); process.exit(1); }
    if (!fresh) places = places.filter(p => {
      if (!p.gid || due(kept[p.gid])) return true;
      console.log(`${p.it.id.padEnd(16)} kept on ${String(kept[p.gid].tried_at).slice(0, 10)}, not looked at again`); skipped++; return false;
    });
    if (!places.length) { console.log(`Nothing to look at: ${skipped} places kept less than 30 days ago (--fresh looks at them anyway).`); process.exit(0); }
  }
  const { makeClaude } = await import('./claude-api.mjs');
  const quiet = (...a) => { const t = a.join(' '); if (!/^\s*claude api, /.test(t)) console.error(t); };   // each call's cost is in the place's line
  const ask = makeClaude({ ...env, RESEARCH_MODEL: 'claude-haiku-5-5', TRANSLATE_MODEL: 'claude-haiku-5-5', RESEARCH_EFFORT: effort, RESEARCH_MAX_SEARCHES: '3', RESEARCH_USD_PER_DAY: '2' }, quiet);
  // The second try, for a place that gave nothing at low effort: medium effort, its own limit of 1 USD a run.
  const again = retry ? makeClaude({ ...env, RESEARCH_MODEL: 'claude-haiku-5-5', TRANSLATE_MODEL: 'claude-haiku-5-5', RESEARCH_EFFORT: 'medium', RESEARCH_MAX_SEARCHES: '3', RESEARCH_USD_PER_DAY: '1' }, quiet) : null;
  console.log(`${places.length} places of ${slug}, Haiku 5.5, effort ${effort}${again ? ', a second try at medium effort' : ''}. ${save ? 'What is found is kept in the database (place_facts), nothing else is written.' : 'Nothing is written.'}`);
  // Overture's records and GeoNames' features around the guide's pins, one call each for all the places.
  const pins = places.filter(p => typeof p.it.lat === 'number').map(p => ({ id: p.it.id, lat: p.it.lat, lng: p.it.lng, names: p.names }));
  const [ov, gz] = await Promise.all([nearby(house, pins, { python: process.env.OVERTURE_PYTHON || env.OVERTURE_PYTHON || 'python3' }),
    gazetteer('ES', pins, { python: process.env.GEONAMES_PYTHON || env.GEONAMES_PYTHON || 'python3' })]);   // Spain for now: with the countries, the guide's own
  console.log(`Overture release ${ov.release || 'none'}; GeoNames file of ${gz.fetched || 'none'}.\n`);
  const digits = t => String(t || '').replace(/\D/g, '').replace(/^(00)?34(?=\d{9}$)/, '');
  const lines = sch => JSON.stringify((sch || []).map(s => [[...(s.days || [])].join(), s.open, s.close, s.from || '', s.to || '']).sort());
  const span = d => { const i = d.map(x => DAYS.indexOf(x)); return d.length > 2 && i.every((v, k) => !k || v === i[k - 1] + 1) ? `${d[0]}-${d[d.length - 1]}` : d.join(','); };
  const n = { posOverture: 0, posGeonames: 0, entry: 0, overture: 0, search: 0, phone: 0, phoneSame: 0, phoneGuide: 0, site: 0, siteSame: 0, siteGuide: 0, hours: 0, hoursSame: 0, hoursGuide: 0, price: 0, book: 0, fb: 0,
    twice: 0, matchTwice: 0, gotSite: 0, gotHours: 0, gotPrice: 0 };
  let total = 0, secs = 0;
  for (const p of places) {
    const t0 = Date.now(), meter = {}, cands = ov.pins[p.it.id] || [];
    const r = await placeFacts(p.place, cands, ask, { meter, again, features: gz.pins[p.it.id] || [] });
    const sec = Math.round((Date.now() - t0) / 1000), g = p.it;
    total += r.usd; secs += sec;
    const phoneSame = r.phone && g.phone && digits(r.phone) === digits(g.phone), siteSame = r.website && g.url && host(r.website) === host(g.url), hoursSame = r.hours && g.schedule && lines(r.hours) === lines(g.schedule);
    n.posOverture += r.posFrom === 'overture'; n.posGeonames += r.posFrom === 'geonames';
    n.entry += !!r.entry; n.overture += r.websiteFrom === 'overture'; n.search += r.websiteFrom === 'search'; n.fb += !!r.facebook; n.price += !!r.price; n.book += !!r.book;
    n.phone += !!r.phone; n.phoneSame += !!phoneSame; n.phoneGuide += !!g.phone; n.site += !!r.website; n.siteSame += !!siteSame; n.siteGuide += !!g.url; n.hours += !!r.hours; n.hoursSame += !!hoursSame; n.hoursGuide += !!g.schedule;
    n.twice += r.tries === 2; n.matchTwice += r.matchTries === 2; n.gotSite += r.gained.includes('site'); n.gotHours += r.gained.includes('hours'); n.gotPrice += r.gained.includes('price');
    // Kept only with --save and a Google id; a failed write is said on the line, the run goes on.
    let note = '';
    if (store && !p.gid) { note = ' | no Google id, not kept'; noGid++; }
    else if (store) { try { await store.save(p.gid, p.place, r, { release: ov.release }); saved++; } catch (e) { note = ` | not kept: ${e.message}`; } }
    console.log(`${g.id.padEnd(16)} [${r.entry ? r.entry.name.slice(0, 30) + (r.entry.category ? ', ' + r.entry.category : '') : 'no entry, ' + cands.length + ' near'}${r.venue ? '' : ', not a venue'}]`
      + ` | pos ${r.posFrom || 'google only'}${r.feature ? ` [${r.feature.name.slice(0, 30)}, ${r.feature.cls}.${r.feature.code}]` : ''}`
      + ` | name ${r.name || '-'} | kind ${r.ourKind ? `${r.ourKind} (${r.kindFrom})` : '-'}${g.icon ? (g.icon === r.ourKind ? ' =' : ` (guide: ${g.icon})`) : ''}`
      + ` | site ${r.website ? host(r.website) + ' (' + r.websiteFrom + ')' : '-'}${g.url ? (siteSame ? ' =' : ` (guide: ${host(g.url)})`) : ''}`
      + ` | phone ${r.phone ? r.phone + ' (' + r.phoneFrom + ')' : '-'}${g.phone ? (phoneSame ? ' =' : ` (guide: ${g.phone})`) : ''}`
      + ` | hours ${r.hours ? r.hours.length + ' lines' : '-'}${g.schedule ? (hoursSame ? ' =' : ` (guide: ${g.schedule.length} lines)`) : ''}${r.season ? ` | season ${r.season.from} to ${r.season.to}` : ''}`
      + ` | price ${r.price || '-'}${g.price ? ` (guide ${g.price})` : ''} | book ${r.book ? 'yes' : '-'}${r.facebook ? ' | facebook' : ''}${r.instagram ? ' | instagram' : ''}`
      + ` | ${sec} s, ${r.usd.toFixed(3)} USD${r.tries === 2 ? ' | 2 tries' : ''}${r.matchTries === 2 ? ' | match asked twice' : ''}${r.error ? ' | ' + r.error : ''}${note}`);
    for (const s of r.hours || []) console.log(`${' '.repeat(19)}${span(s.days)} ${s.open}-${s.close}${s.from ? ` (${s.from} to ${s.to})` : ''}`);
  }
  const k = places.length;
  console.log(`\n${k} places, ${total.toFixed(3)} USD in all (${(total / k).toFixed(3)} a place), ${Math.round(secs / k)} s a place.`);
  console.log(`Position of ours: from Overture ${n.posOverture}, from GeoNames ${n.posGeonames}, none (Google's only) ${k - n.posOverture - n.posGeonames}.`);
  console.log(`Entry chosen ${n.entry}; website from Overture ${n.overture}, by search ${n.search}, none ${k - n.overture - n.search}; Facebook link ${n.fb}.`);
  console.log(`Website ${n.site} (same host as the guide's ${n.siteSame} of ${n.siteGuide}); phone ${n.phone} (same as the guide's ${n.phoneSame} of ${n.phoneGuide}); hours ${n.hours} (exactly the guide's ${n.hoursSame} of ${n.hoursGuide}); price ${n.price}; book ahead ${n.book}.`);
  if (again) console.log(`Site read twice ${n.twice} (only thanks to the second try: a site ${n.gotSite}, hours ${n.gotHours}, price ${n.gotPrice}); match asked twice ${n.matchTwice}.`);
  if (store) console.log(`Kept ${saved} rows in place_facts; ${skipped} kept less than 30 days ago, not looked at again; ${noGid} with no Google id, not kept.`);
  process.exit(0);
}
