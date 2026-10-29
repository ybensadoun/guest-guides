#!/usr/bin/env node
// Guide worker: runs on Yohann's computer while it is on (interim, see docs/plan-accounts-and-publishing.md), and is
// ready for a small server (docs/plan-worker-on-server.md, worker/Dockerfile).
// Watches the database for guides a host has queued, builds each one and writes the result back.
//   node worker/guide-worker.mjs            keep running, build guides as they arrive
//   node worker/guide-worker.mjs --once     build whatever is queued now, then stop
//   node worker/guide-worker.mjs --find find-todo --slug <slug>   one Find more search, printed, written nowhere
// Settings live in worker/.env.local (never committed) or in the environment. See worker/README.md.
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { makeGoogle, hav, nameOf, sameName, sameMarket, schedule, hostPlace } from './places.mjs';   // Google check for Find more suggestions
import { makeSweep } from './sweep-photos.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const env = { ...process.env };
const envFile = resolve(HERE, '.env.local');
if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, '');
const KEY = env.SUPABASE_SERVICE_KEY;
// Google Places key (Guest Guides/.env, git-ignored): Find more checks each suggested place on Google. Without it, suggestions are not checked.
const rootEnv = resolve(ROOT, '.env');
if (existsSync(rootEnv)) for (const l of readFileSync(rootEnv, 'utf8').split('\n')) { const m = l.match(/^\s*(GOOGLE_PLACES_KEY)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const AUTO_PUBLISH = env.AUTO_PUBLISH !== '0';          // test phase: a built guide goes live at once. Set AUTO_PUBLISH=0 to review first.
const RESEARCH = env.RESEARCH || 'skip';                 // skip | cli | api  (research and translation with the `claude` command, or with the Claude API)
const RESEARCHING = RESEARCH === 'cli' || RESEARCH === 'api';   // builds research and translate (jobs from the editor always do)
const POLL = Math.max(3, +env.POLL_SECONDS || 10) * 1000;
const ONCE = process.argv.includes('--once');
if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY. Put it in worker/.env.local (see worker/README.md).'); process.exit(1); }

const log = (...a) => console.log(new Date().toLocaleString('sv-SE'), ...a);   // date and time: the log file spans days
// RESEARCH=api: the Claude API with the worker's own key (worker/claude-api.mjs), for a server. Otherwise the `claude` command.
let claudeApi = null;
if (RESEARCH === 'api') {
  if (!env.WORKER_ANTHROPIC_KEY) { console.error('RESEARCH=api needs WORKER_ANTHROPIC_KEY, the worker\'s own Claude API key (worker/.env.local or the environment).'); process.exit(1); }
  try { claudeApi = (await import('./claude-api.mjs')).makeClaude(env, log); }
  catch (e) { console.error('RESEARCH=api needs the Claude SDK once: npm ci --prefix worker (' + e.message.slice(0, 120) + ')'); process.exit(1); }
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
// A dropped connection ("fetch failed") is retried a few times instead of failing the whole guide.
async function fetchRetry(url, init, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await fetch(url, init); }
    catch (e) { if (i >= tries) throw new Error(`${e.message} (${new URL(url).pathname.split('/').slice(0, 4).join('/')}, ${tries} tries)`); await new Promise(r => setTimeout(r, 1500 * i)); }
  }
}
async function rest(path, o = {}) {
  const r = await fetchRetry(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
  if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof j === 'string' ? j : JSON.stringify(j)}`.slice(0, 400));
  return j;
}
const patch = (id, body) => rest('/rest/v1/guides?id=eq.' + id, { method: 'PATCH', body, headers: { Prefer: 'return=minimal' } });
const sweepPhotos = makeSweep({ url: URL_, headers: H, rest, fetchRetry, log });   // photos of deleted houses (worker/sweep-photos.mjs)
let lastSay = Promise.resolve();   // status messages go out in order, and the final result waits for them
const say = (id, message) => { lastSay = lastSay.then(() => patch(id, { message }).catch(() => {})); };

function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { cwd: o.cwd || ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: o.timeout || 600000, input: o.input });
  if (r.error) throw new Error(`${cmd} failed: ${r.error.message}`);
  if (r.status !== 0 && !o.allowFail) throw new Error(`${cmd} ${args.slice(0, 2).join(' ')} exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-6).join(' | ')}`.slice(0, 600));
  return r;
}

// Claude runs (research, translation) go through this one: the worker stays free meanwhile, so several searches
// from the editor run side by side instead of one after another.
function runAsync(cmd, args, o = {}) {
  return new Promise((res, rej) => {
    const ch = spawn(cmd, args, { cwd: o.cwd || ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    ch.stdout.on('data', d => { out += d; }); ch.stderr.on('data', d => { err += d; });
    const t = setTimeout(() => ch.kill('SIGTERM'), o.timeout || 600000);
    ch.on('error', e => { clearTimeout(t); rej(new Error(`${cmd} failed: ${e.message}`)); });
    ch.on('close', code => { clearTimeout(t); res({ status: code, stdout: out, stderr: err }); });
  });
}

/* ---------- Claude research and translation (optional) ---------- */
// One question to Claude, with the web (research) or without (translation): the Claude API when RESEARCH=api, else the
// `claude` command on this computer. Returns the text of the answer.
async function claudeAsk(prompt, { web = false, what = '', meter = null, searches = 0 } = {}) {
  if (claudeApi) return claudeApi(prompt, { web, what, meter, searches });
  const r = await runAsync('claude', web ? ['-p', prompt, '--allowedTools', 'WebSearch,WebFetch', '--max-turns', '40'] : ['-p', prompt], { timeout: web ? 900000 : 600000 });
  return r.stdout || '';
}
async function claudeJson(prompt, what, meter, searches) {
  const out = (await claudeAsk(prompt, { web: true, what, meter, searches })).trim();
  const a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error(`Claude returned no JSON for ${what}`);
  try { return JSON.parse(out.slice(a, b + 1)); } catch (e) { throw new Error(`Claude's JSON for ${what} did not parse`); }
}
function example(name, n = 2) {
  const f = resolve(HERE, 'examples', name + '.json'); if (!existsSync(f)) return '{}';
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const cut = x => Array.isArray(x) ? x.slice(0, n).map(cut) : (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cut(v)])) : x);
  return JSON.stringify(cut(j), null, 1);
}
function researchPrompt(kind, A, rules) {
  const area = `${A.town || ''}${A.region ? ', ' + A.region : ''}`, km = A.radius || 30;
  return `You research one module of a guest guide for a holiday home. Place: ${A.placeName || 'the house'}, ${area}. Approximate point: ${A.lat}, ${A.lng}. ${A.city ? `Guests get around on foot, by bike or by public transport, up to ${km} km.` : `Guests drive up to ${km} km.`} The host likes: ${[A.interests, A.feelWords, A.tone].flat().filter(Boolean).join('; ') || 'no preference given'}.
Use web search. Only include things you confirmed exist from a web source. Never invent names, addresses, phone numbers, hours or distances. When unsure, leave the field out or set "verify": true. Write every text in English, as {"en": "..."}. No em-dashes.
${rules}
Answer with ONE JSON object and nothing else. It must follow the shape of this example (only its first items are shown):
${example(kind)}`;
}
// Hours and the Google Maps link, for every place (markets and things to do).
const HOURS_RULE = 'For each place: "name_local" is its name exactly as Google Maps lists it (in the local language, e.g. "Jardí Botànic Marimurtra"), so the guide\'s Google Maps button opens its listing. Put "gmaps" only if a source gives the place\'s own Google Maps link. Opening hours: look for them on the official website first (the venue, the operator, the town hall or its tourist office), then in recent local press, and write them as "schedule", a list of rows shaped exactly {"days":["tue","wed"],"open":"10:00","close":"14:00"} (days as mon..sun, times HH:MM, plus "from" and "to" as MM-DD for a season), with "url" set to that official page. Opening that is not weekly (the third Sunday of the month, guided tours) goes in "hours" as words, not in "schedule". Use the flag "check" only when no official or recent source gives the days and hours, or sources disagree. A place open to everyone at any time (beach, viewpoint, old town, path, ruin) gets "always": true and no "check".';
// What research may write: tags, flags and groups the guide knows, places with a position, market categories it has a label for.
function researchTools() {
  const en = JSON.parse(readFileSync(join(ROOT, 'engine/src/i18n/en.json'), 'utf8'));
  const tagsOk = Object.keys(en).filter(k => k.startsWith('t_')).map(k => k.slice(2)), flagsOk = JSON.parse(readFileSync(join(ROOT, 'engine/src/flags.json'), 'utf8')).flags;   // warnings only, not the f_ filter labels
  const groupsOk = JSON.parse(readFileSync(join(ROOT, 'engine/src/groups.json'), 'utf8')).groups;   // quick filters with a label
  // A group without a label would show as "g_culture": map near words to a real group, drop the rest. Tone follows the group.
  const fixGroup = o => { if (typeof o.group !== 'string' || !Array.isArray(o.tags) && !('km_from_house' in o)) return;
    const g = o.group in groupsOk ? o.group : /cultur|museum|histor|heritage|town|village|castle|monument/.test(o.group) ? 'sights' : /natur|park|hike|walk|garden|mountain|outdoor/.test(o.group) ? 'nature' : /beach|coast|sea/.test(o.group) ? 'beach' : /fun|kid|family|sport|activit/.test(o.group) ? 'fun' : /wine|cava|winer/.test(o.group) ? 'wine' : null;
    if (g) { o.group = g; o.tone = groupsOk[g]; } else delete o.group; };
  const keep = (o, k, ok) => { if (Array.isArray(o[k])) o[k] = o[k].filter(x => ok.includes(x)); };
  const clean = (x) => { if (Array.isArray(x)) x.forEach(clean); else if (x && typeof x === 'object') { keep(x, 'tags', tagsOk); keep(x, 'flags', flagsOk); fixGroup(x); Object.values(x).forEach(clean); } return x; };
  const hasPos = x => x && typeof x.lat === 'number' && typeof x.lng === 'number';
  const catsOk = Object.keys(en).filter(k => k.startsWith('cat_')).map(k => k.slice(4));
  const catFix = c => catsOk.includes(c) ? c : (/fair|festival|swap|event/.test(c || '') ? 'events' : /cover|hall|indoor/.test(c || '') ? 'covered' : /flea|second|vintage/.test(c || '') ? 'flea' : /antiq|craft/.test(c || '') ? 'antiques' : 'street');
  // An event's start and end times: HH:MM, or left out ("6.30" and "18h00" are fixed, anything else dropped).
  const hhmm = x => { const m = /^(\d{1,2})[:.h](\d{2})$/.exec(String(x ?? '').trim()); return m && +m[1] < 24 && +m[2] < 60 ? m[1].padStart(2, '0') + ':' + m[2] : null; };
  const located = o => {
    for (const k of ['markets', 'items']) if (Array.isArray(o[k])) o[k] = o[k].filter(hasPos);   // places without coordinates cannot be shown on the map
    for (const it of o.items || []) for (const d of it.dates || []) for (const k of ['time', 'until']) if (k in d) { const v = hhmm(d[k]); if (v) d[k] = v; else delete d[k]; }
    if (Array.isArray(o.markets)) { o.markets.forEach(m => { m.category = catFix(m.category); }); o.categories = catsOk.filter(c => o.markets.some(m => m.category === c)); }
    return o;
  };
  const allowed = `Where an item has "tags", "flags" or "group", use ONLY these values. tags: ${tagsOk.join(', ')}. flags: ${flagsOk.join(', ')}. group: ${Object.keys(groupsOk).join(', ')}. Leave out any that do not fit.`;
  return { clean, located, allowed, normSchedule };
}
// Opening hours the guide can read: rows of days (mon..sun), open and close (HH:MM), and an optional season (from/to MM-DD).
// Research sometimes writes "Tue-Sun" or "10:00-17:30" or "third Sunday of the month": the first two are converted,
// anything else leaves the schedule as words in "hours" and asks guests to check.
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayOf = w => WEEK.find(d => String(w).toLowerCase().startsWith(d)) || ({ thursday: 'thu', tuesday: 'tue' })[String(w).toLowerCase()];
function daysList(x) {
  if (Array.isArray(x)) { const d = x.map(dayOf); return d.every(Boolean) ? WEEK.filter(w => d.includes(w)) : null; }
  const s = String(x || '').toLowerCase().trim();
  if (/^(daily|every ?day|all week|mon(day)?\s*[-–to]+\s*sun(day)?)$/.test(s)) return [...WEEK];
  const out = new Set();
  for (const part of s.split(/\s*(?:,|&|\band\b)\s*/)) {
    const m = part.match(/^([a-z]+)\s*(?:-|–|to)\s*([a-z]+)$/);
    if (m) { const a = WEEK.indexOf(dayOf(m[1])), b = WEEK.indexOf(dayOf(m[2])); if (a < 0 || b < 0) return null; for (let i = a; ; i = (i + 1) % 7) { out.add(WEEK[i]); if (i === b) break; } }
    else if (dayOf(part)) out.add(dayOf(part)); else return null;
  }
  return out.size ? WEEK.filter(w => out.has(w)) : null;
}
function normSchedule(it) {
  if (!Array.isArray(it.schedule)) { if (it.schedule != null) delete it.schedule; return it; }
  const ok = [], words = [];
  for (const r of it.schedule) {
    const days = daysList(r.days), t = String(r.hours || '').match(/(\d{1,2}[:.]\d{2})\s*(?:-|–|to)\s*(\d{1,2}[:.]\d{2})/);
    const hm = x => x && x.replace('.', ':').padStart(5, '0');
    const open = hm(r.open || (t && t[1])), close = hm(r.close || (t && t[2]));
    if (days && /^\d\d:\d\d$/.test(open || '') && /^\d\d:\d\d$/.test(close || '')) ok.push({ days, open, close, ...(/^\d\d-\d\d$/.test(r.from || '') && /^\d\d-\d\d$/.test(r.to || '') ? { from: r.from, to: r.to } : {}) });
    else words.push([r.days, r.hours || [r.open, r.close].filter(Boolean).join('-'), r.note].filter(x => x && typeof x === 'string').join(', '));
  }
  if (ok.length) it.schedule = ok; else delete it.schedule;
  if (words.length) { if (!it.hours) it.hours = { en: words.join('; ') }; it.flags = [...new Set([...(it.flags || []), 'check'])]; }
  return it;
}
const MARKETS_RULE = 'Find the weekly and notable local markets within the radius (street markets, covered markets, fairs). Same shape as the example: {"categories":[...],"markets":[...]} with schedule days as mon..sun. Every market MUST have numeric lat and lng: use the exact spot if a source gives it, otherwise the centre of the town or the market square from Wikipedia or OpenStreetMap, and add "verify": true when approximate. Its "category" must be one of: covered, street, flea, antiques, events. ' + HOURS_RULE;
const TODO_RULE = 'Find 8 to 12 things to do within the radius that fit the host\'s taste: sights, nature, fun, culture. Same shape: {"items":[...]} with lat, lng, km_from_house, an icon and group as in the example. ' + HOURS_RULE;
// A part already in outDir (areaResearch) is not searched again. id: the guide whose progress message follows the research
// (none for an area or a research job). opt.meter adds up what it costs; opt.parts, opt.rules and opt.searches change which parts
// are searched, how, and with how many web searches (the quick search at the listing link).
async function research(A, outDir, id, opt = {}) {
  mkdirSync(outDir, { recursive: true });
  const { clean, located, allowed, normSchedule } = researchTools();
  const jobs = [
    ['markets', MARKETS_RULE],
    ['todo', TODO_RULE],
    ['emergency', 'Find the nearest hospital with an emergency department, the national emergency number and the local health advice line. Same shape: {"groups":[...]}.'],
  ];
  for (const [kind, rules0] of jobs) {
    if (existsSync(join(outDir, kind + '.json')) || (opt.parts && !opt.parts.includes(kind))) continue;
    if (id) say(id, `Researching: ${kind}`);
    const rules = (opt.rules || {})[kind] || rules0;
    try { const o = located(clean(await claudeJson(researchPrompt(kind, A, rules + ' ' + allowed), kind, opt.meter, (opt.searches || {})[kind]))); for (const k of ['markets', 'items']) (o[k] || []).forEach(normSchedule); writeFileSync(join(outDir, kind + '.json'), JSON.stringify(o, null, 1)); }
    catch (e) { log(`  research ${kind} skipped:`, e.message); }
  }
}
// Translation by Claude, 40 texts per question: {"<source text>": {"es": "...", ...}}. A text that does not come back stays
// as it is (Claude down, the day's budget spent): a search or a build is never lost for it. onPart(done, all) for progress.
async function translate(texts, langs, srcLang, onPart) {
  const map = {};
  for (let i = 0; langs.length && i < texts.length; i += 40) {
    if (onPart) await onPart(Math.min(i + 40, texts.length), texts.length);
    const prompt = `Translate these texts from ${srcLang} into ${langs.join(', ')}. Keep names, numbers and times. No em-dashes. For French use real non-breaking spaces before ? ! ; : and inside guillemets. In German and Dutch, put a soft hyphen (U+00AD) at a correct syllable break inside every word of 10 letters or more (e.g. Geschichts\u00admuseum), so it can wrap on a narrow phone screen. Answer with ONE JSON object and nothing else: {"<exact source text>": {"${langs.join('": "...", "')}": "..."}}.\n${JSON.stringify(texts.slice(i, i + 40))}`;
    let out = '';
    try { out = await claudeAsk(prompt, { what: 'translation' }); } catch (e) { log('  translation skipped:', e.message); break; }
    const a = out.indexOf('{'), b = out.lastIndexOf('}');
    if (a >= 0 && b > a) { try { Object.assign(map, JSON.parse(out.slice(a, b + 1))); } catch (e) {} }
  }
  return map;
}
// A text in all of a guide's languages is an object like {"en": "...", "es": "..."}: i18nOf lists those inside x, fill adds
// the languages they miss from a translation map (by their text in src) and says how many it added.
const LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
const isI18 = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => LANGS.includes(k));
const i18nOf = x => { const out = [], walk = y => { if (Array.isArray(y)) y.forEach(walk); else if (y && typeof y === 'object') { if (isI18(y)) out.push(y); else Object.values(y).forEach(walk); } }; walk(x); return out; };
const fill = (objs, map, langs, src) => { let n = 0; for (const o of objs) { const t = map[o[src]]; if (t) for (const l of langs) if (!o[l] && t[l]) { o[l] = t[l]; n++; } } return n; };

/* ---------- Build one guide ---------- */
async function upload(guideId, localRoot) {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'vendor' ? [] : walk(p)) : [p]; });
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon' };
  let n = 0;
  for (const p of existsSync(localRoot) ? walk(localRoot) : []) {
    const ct = types[extname(p).toLowerCase()]; if (!ct) continue;            // images only: the guide's data lives in the database
    const rel = relative(localRoot, p).split('\\').join('/');
    const r = await fetchRetry(`${URL_}/storage/v1/object/guide-assets/${guideId}/${rel}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': ct, 'x-upsert': 'true' }, body: readFileSync(p) });
    if (!r.ok) throw new Error(`Image upload failed for ${rel}: ${r.status}`);
    n++;
  }
  return n;
}

async function build(g) {
  const A = { ...(g.answers || {}) }, id = g.id, tmp = 'w-' + id.slice(0, 8), siteDir = resolve(ROOT, 'sites', tmp), job = resolve(HERE, 'jobs', id);
  if (!g.slug) throw new Error('This guide has no web address yet.');
  if (!A.lat || !A.lng) throw new Error('We do not know where the house is yet. Add its location in the first step.');
  rmSync(job, { recursive: true, force: true }); rmSync(siteDir, { recursive: true, force: true });
  mkdirSync(join(job, 'src'), { recursive: true });
  const remote = (A._remote || []).filter(u => u && u.src && String(u.src).startsWith('https://a0.muscache.com/'));
  const clean = { ...A }; delete clean._remote; delete clean._uploads;
  writeFileSync(join(job, 'src/host.json'), JSON.stringify({ answers: clean }));
  // The host's own images (sent to the guide's storage when they published): into the generator's uploads/ and assets/.
  const own = (A._uploads || []).filter(u => u && typeof u.path === 'string' && (u.path.startsWith(id + '/host/') || u.path.startsWith(id + '/covers/')) && /^[\w./-]+\.jpg$/.test(u.path));
  if (own.length) { mkdirSync(join(job, 'src/uploads'), { recursive: true }); mkdirSync(join(job, 'src/assets'), { recursive: true }); }
  for (const [i, u] of own.entries()) {
    const r = await fetchRetry(`${URL_}/storage/v1/object/guide-assets/${u.path}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }).catch(e => ({ ok: false, status: e.message }));
    if (!r.ok) { log('  host image not downloaded:', u.path, r.status); continue; }
    const aid = 'host-' + String(i).padStart(2, '0');
    writeFileSync(join(job, 'src/assets', aid + '.jpg'), Buffer.from(await r.arrayBuffer()));
    writeFileSync(join(job, 'src/uploads', aid + '.json'), JSON.stringify({ kind: u.kind, assetId: aid, room: u.room || '', name: u.name || '' }));
  }
  writeFileSync(join(job, 'src/listing_photos.json'), JSON.stringify(remote.map(u => ({ url: u.src, room: u.room || '', caption: u.name || '' }))));
  // The host's favourite places, as they typed them: looked up on Google, so each one gets its real position, distance,
  // town, opening hours and Maps link (src/geocode.json, read by the generator). Not found: the generator says less.
  const fav = (A.favEat || []).map(r => String((r && r.p) || '').trim()).filter(Boolean);
  if (fav.length && env.GOOGLE_PLACES_KEY) {
    say(id, 'Finding your favourite places'); const geo = {};
    for (const p of fav) { try { const g = await hostPlace(env.GOOGLE_PLACES_KEY, p, { lat: A.lat, lng: A.lng }); if (g) geo[p]= g; else log('  favourite place not found on Google:', p.slice(0, 60)); } catch (e) { log('  favourite place lookup failed:', e.message); } }
    writeFileSync(join(job, 'src/geocode.json'), JSON.stringify(geo));
  }
  const srcLang = ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(A.sourceLang) ? A.sourceLang : 'en';
  const gen = ['engine/scripts/generate-site.py', join(job, 'src'), '--slug', tmp, '--lat', String(A.lat), '--lng', String(A.lng), '--src', srcLang];

  let researchDir = null;
  if (RESEARCHING) { researchDir = join(job, 'research'); const quick = await areaResearch(A, researchDir, id); await research(A, researchDir, id); mergeQuick(researchDir, quick); gen.push('--research', researchDir); }
  say(id, 'Building the guide');
  let out = run('python3', gen).stdout;
  if (RESEARCHING) {
    const need = existsSync(join(siteDir, 'docs/untranslated.json')) ? JSON.parse(readFileSync(join(siteDir, 'docs/untranslated.json'), 'utf8')) : [];
    const langs = (A.languages || []).filter(l => l !== srcLang && ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(l));
    if (need.length && langs.length) { say(id, 'Translating'); const map = await translate(need, langs, srcLang);
      if (Object.keys(map).length) { const tf = join(job, 'translations.json'); writeFileSync(tf, JSON.stringify(map, null, 1)); out = run('python3', [...gen, '--translations', tf]).stdout; } }
  }
  const checked = run('node', ['engine/scripts/run.js', 'check', tmp], { allowFail: true });
  if (checked.status !== 0) throw new Error('The guide did not pass its checks: ' + ((checked.stdout || '') + (checked.stderr || '')).trim().split('\n').slice(-3).join(' | '));
  say(id, 'Saving the guide');
  const assetBase = `${URL_}/storage/v1/object/public/guide-assets/${id}/`;
  const row = JSON.parse(run('node', ['engine/scripts/guide-to-row.mjs', tmp, assetBase]).stdout);
  row.content.site.slug = g.slug; row.content.site.storageKey = g.slug;
  const n = await upload(id, resolve(siteDir, 'public'));
  const status = AUTO_PUBLISH ? 'published' : 'ready';
  await lastSay;
  await patch(id, { content: row.content, theme: row.theme, draft: null, status, message: null, finished_at: new Date().toISOString() });   // a new build replaces any unpublished editor changes
  rest('/rest/v1/events', { method: 'POST', body: { user_id: g.owner, guide_id: id, kind: 'guide_built', data: { slug: g.slug, images: n, status } }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
  rmSync(siteDir, { recursive: true, force: true });
  log(`  built ${g.slug}: ${n} images, status ${status}`);
}

/* ---------- Loop ---------- */
async function claim() {
  const rows = await rest('/rest/v1/guides?select=id,slug,owner,answers&status=eq.queued&order=queued_at.asc.nullslast&limit=1');
  if (!rows || !rows[0]) return null;
  const won = await rest('/rest/v1/guides?id=eq.' + rows[0].id + '&status=eq.queued', { method: 'PATCH', body: { status: 'generating', message: 'Reading your answers' }, headers: { Prefer: 'return=representation' } });
  return won && won[0] ? rows[0] : null;
}
async function recover() {   // a guide left "generating" by a crashed run goes back in the queue
  const old = new Date(Date.now() - 30 * 60000).toISOString();
  await rest('/rest/v1/guides?status=eq.generating&updated_at=lt.' + old, { method: 'PATCH', body: { status: 'queued', message: 'Waiting for its turn' }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
}
/* ---------- Translation jobs from the editor ----------
   The editor saves its changes as a draft (guides.draft) first, so the job translates the draft, or makes one from the
   live guide: new translations are previewed and published like any change. The texts also go back in the job's result,
   for the editor that is still open (it fills them into its own copy, so nothing it saved meanwhile is lost). */
async function translateJob(j, jp) {
  const g = (await rest('/rest/v1/guides?select=content,draft&id=eq.' + j.guide_id))[0];
  const c = g.draft && g.draft.content ? g.draft.content : g.content, main = ((c.site || {}).languages || ['en'])[0] || 'en';
  const todo = i18nOf(c.files || {}).filter(o => o[main] && j.langs.some(l => !o[l]));
  const texts = [...new Set(todo.map(o => o[main]))];
  if (!texts.length) return jp({ status: 'done', message: 'Nothing to translate', finished_at: new Date().toISOString() });
  const map = await translate(texts, j.langs, main, (done, all) => jp({ message: `Translating ${done} of ${all}` }));
  const n = fill(todo, map, j.langs, main);
  if (!n) throw new Error(claudeApi ? 'No translations came back. Try again in a few minutes.' : 'No translations came back. Is the claude command set up on this computer?');
  const now = (await rest('/rest/v1/guides?select=content,theme,draft&id=eq.' + j.guide_id))[0];   // merge into the latest copy, not an old one
  const draft = now.draft && now.draft.content ? now.draft : { content: now.content, theme: now.theme };
  fill(i18nOf(draft.content.files || {}), map, j.langs, main);
  await rest('/rest/v1/guides?id=eq.' + j.guide_id, { method: 'PATCH', body: { draft: { ...draft, savedAt: new Date().toISOString() } }, headers: { Prefer: 'return=minimal' } });
  const result = Object.fromEntries(Object.entries(map).map(([k, t]) => [k, Object.fromEntries(j.langs.filter(l => t[l]).map(l => [l, t[l]]))]));
  await jp({ status: 'done', message: n + ' texts translated', result, finished_at: new Date().toISOString() });
}

/* ---------- Find more: web research for new things to do, markets or events, returned as suggestions ----------
   From the editor's "Find more" button. Claude searches the web around the house (same rules as a build's research,
   plus the curation rule), each place is checked on Google (gone: dropped; its listing, id and hours added), texts are
   translated into the guide's languages, and the result goes back in the job. Nothing is added to the guide here:
   the host keeps or skips each suggestion in the editor, and what they keep goes into their draft. */
// What every events search returns, and how it looks for them wherever the guide is: the area's own traditions first.
const EVENT_SHAPE = 'Same shape as the example: {"items":[...]}. "type" is one of: castells, festa, carnival, parade, food, fair, film, music, historical, tradition. Every event MUST have numeric lat and lng (the venue, or the centre of its town), a "url" (its official page) and "sources" (the pages you used). "name" says which event it is without the town (the guide shows the town under it). "dates": start and end as YYYY-MM-DD; "status" is "confirmed" only when an official source gives that year\'s dates, otherwise "expected" (worked out from earlier years). "scale" says how big it is: "local" (one village, neighbourhood or club, e.g. a colla\'s own diada), "town" (a town\'s own main festival), "regional" (people come from around the area) or "major" (known across the region or the country). Add "time" (when it starts, HH:MM, 24 h) when a source gives it, and "until" (when it ends on its last day) when a source gives that too; otherwise leave them out, never guess. Leave out events whose dates have all passed.';
const LOCAL_EVENTS = 'First work out which kinds of local events this area is known for and where their dates are published, then search there, town by town within the radius: for example castells (human towers) in Catalonia and the colles\' own schedules, Semana Santa processions, ferias, romerías and flamenco in Andalusia, Moros y Cristianos and fallas in the Valencia region, fiestas patronales everywhere; the coordinating body or federation of that tradition, the regional and county tourism agendas, the town halls\' agendas and the local press. Some agenda websites block automated reading: when a page cannot be read, find the same dates on the organisers\' own sites, the town halls\' pages or the local press.';
const FIND = {
  'find-todo': { file: 'todo', key: 'items', what: 'things to do', rule: 'Find 6 to 10 more things to do within the radius: sights, nature, fun, culture, wine. Same shape as the example: {"items":[...]} with lat, lng, an icon and group as in the example. ' + HOURS_RULE },
  'find-markets': { file: 'markets', key: 'markets', what: 'markets', rule: MARKETS_RULE + ' Find up to 8 that are not in the guide yet.' },
  'find-events': { file: 'events', key: 'items', what: 'events', rule: 'Find 6 to 12 local events within the radius with a date in the next three months: festivals, fairs, traditions, music, food. ' + EVENT_SHAPE }
};
const CURATION = 'Pick like a local host would: places and events a guest would not easily find by searching Google themselves (local favourites, hidden gems, things for kids or dogs, the best of each kind nearby). No chains, no supermarkets or groceries, no golf courses. Each one must still exist or still run, confirmed by a source from the last two years. Each "description" says in one or two sentences why it is worth it and when to go.';
const FIND_PER_DAY = 8;   // each search costs Claude time on this computer and a few Google requests
const GOOGLE = env.GOOGLE_PLACES_KEY ? makeGoogle(env.GOOGLE_PLACES_KEY) : null;
const slugOf = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'place';
async function findJob(j, jp) {
  const F = FIND[j.kind], since = new Date(Date.now() - 864e5).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=like.find-*&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= FIND_PER_DAY) throw new Error('You have searched a lot today. Try again tomorrow.');
  const g = (await rest('/rest/v1/guides?select=content,draft,answers&id=eq.' + j.guide_id))[0];
  const c = g.draft && g.draft.content ? g.draft.content : g.content, files = c.files || {}, site = c.site || {}, h = files.house || {}, A0 = g.answers || {};
  if (typeof h.lat !== 'number') throw new Error('The guide does not know where the house is.');
  const have = (files[F.file] || {})[F.key] || [];
  const A = { placeName: site.name, town: A0.town || '', region: A0.region || '', lat: h.lat, lng: h.lng, radius: (site.area || {}).radiusKm || 30, interests: A0.interests, feelWords: A0.feelWords, tone: A0.tone };
  const { clean, located, allowed, normSchedule } = researchTools();
  const known = have.map(x => x.name_local || nameOf(x.name)).filter(Boolean);
  await jp({ message: `Searching the web for ${F.what}` });
  const auto = ((files.events || {}).auto) || {};
  const out = j.kind === 'find-events'   // events: the area's own traditions, plus one focused search per topic the host wants
    ? { items: await searchEvents({ ...A, radius: evReach(site, auto).far, city: evReach(site, auto).mode === 'city' }, { exclude: known, want: auto.want || [], skip: auto.skip || [], reach: evReach(site, auto) }) }
    : located(clean(await claudeJson(researchPrompt(F.file, A, `${F.rule} ${CURATION} Already in the guide, so never suggest them again: ${known.join('; ') || 'nothing yet'}. ${allowed}`), F.file)));
  const label = it => ({ displayName: { text: it.name_local || nameOf(it.name) } });
  (out[F.key] || []).forEach(normSchedule);
  let items = (out[F.key] || []).filter(it => !have.some(x => F.file === 'events' ? sameEvent(x, it) : sameName(x, label(it)) && (typeof x.lat !== 'number' || hav(x.lat, x.lng, it.lat, it.lng) < 1.5)));
  const ids = new Set(have.map(x => x.id)), today = new Date().toISOString().slice(0, 10);
  for (const it of items) {
    let id = slugOf(it.name_local || nameOf(it.name)); while (ids.has(id)) id += '-2'; ids.add(id); it.id = id;
    it.km_from_house = Math.round(hav(h.lat, h.lng, it.lat, it.lng) * 10) / 10;
  }
  if (GOOGLE && F.file !== 'events') {
    const kept = [];
    for (const [i, it] of items.entries()) {
      await jp({ message: `Checking on Google: ${i + 1} of ${items.length}` });
      let p = null; try { p = await GOOGLE(it); } catch (e) { /* keep it, unchecked */ }
      await new Promise(r => setTimeout(r, 300));
      const far = p && p.location ? hav(it.lat, it.lng, p.location.latitude, p.location.longitude) : 99;
      const ours = p && far <= 2 && (sameName(it, p) || (F.file === 'markets' && sameMarket(it, p, far)));
      it.checked = today;
      if (!ours) { it._google = 'Not found on Google: the web source is the only proof'; kept.push(it); continue; }
      if (p.businessStatus === 'CLOSED_PERMANENTLY') continue;   // gone: never suggested
      it.gid = p.id; if (!it.gmaps || /\/maps\/search\//.test(it.gmaps)) it.gmaps = p.googleMapsUri;
      it._google = 'On Google';
      if (p.businessStatus === 'CLOSED_TEMPORARILY') { it.flags = [...new Set([...(it.flags || []), 'check'])]; it._google = 'Temporarily closed on Google (off-season?)'; }
      const gs = schedule(p.regularOpeningHours?.periods);
      if (!(it.schedule && it.schedule.length) && !it.always && F.file !== 'markets') {
        if (gs === 'always') it.always = true;
        else if (Array.isArray(gs)) { it.schedule = gs; it.hoursSource = 'google'; if (it._google === 'On Google') it.flags = (it.flags || []).filter(f => f !== 'check'); }
      }
      kept.push(it);
    }
    items = kept;
  }
  const langs = (site.languages || ['en']).filter(l => l !== 'en' && LANGS.includes(l)), objs = i18nOf(items);
  const texts = [...new Set(objs.map(o => o.en).filter(Boolean))];
  if (langs.length && texts.length) { await jp({ message: `Translating ${items.length} ${F.what}` }); fill(objs, await translate(texts, langs, 'en'), langs, 'en'); }
  log(`  found ${items.length} ${F.what}`);
  await jp({ status: 'done', message: items.length ? `${items.length} ${F.what} found` : 'Nothing new found', result: { kind: j.kind, items, categories: out.categories || [] }, finished_at: new Date().toISOString() });
}

/* ---------- Automatic events: kept up to date every month, without the host ----------
   A guide whose events file has "auto": {"on": true, "skip": [...], "want": [...], "removed": [...]} gets its events for the
   next three months searched each month (npm run refresh-events, in the monthly task) and right away when the host switches
   it on or presses "Search now" (job auto-events). New events go straight into the live guide, and into the host's draft
   if there is one, marked "auto": true. Events the host added are never changed. An automatic event whose dates have all
   passed is dropped; one the host deleted is listed in "removed" and never added again. Topics to skip and to look for can
   be in any language: Claude reads them as topics, and the skip topics are also checked, in English, on what it found. */
const EV_DAYS = 92;
// How far events reach. Where guests drive: every event within 10 km of the house however small (hyper-local), and
// further out, up to the guide's radius, only the ones people travel to. In a city, where guests walk, bike or take the
// metro: small ones within 2 km (about 10 minutes by bike), the main ones within 8 km (about 30 minutes).
const EV_REACH = { car: { near: 10 }, city: { near: 2, far: 8 } }, EV_MAIN = ['regional', 'major'];
function evReach(site, auto) { const mode = (auto || {}).reach === 'city' ? 'city' : 'car', r = EV_REACH[mode]; return { mode, near: r.near, far: r.far || ((site || {}).area || {}).radiusKm || 30 }; }
// An event fits when it is close to the house, whatever its size, or within reach and one of the area's main ones.
// Unknown size or distance: kept (never removed on a guess).
const evFits = (e, R) => typeof e.km_from_house !== 'number' || (e.km_from_house <= R.far && (e.km_from_house <= R.near || !e.scale || EV_MAIN.includes(e.scale)));
const reachRule = R => `How far: every event within ${R.near} km of the house, however small (a village's or a neighbourhood's own festival, a colla's own diada). Further out, up to ${R.far} km, only the area's main events, the ones people travel to (a town's best-known festival, a regional or national highlight): leave out the small ones there.`;
const dayStr = d => d.toISOString().slice(0, 10);
const windowRule = (now = new Date()) => `Today is ${dayStr(now)}: only events with a date between ${dayStr(now)} and ${dayStr(new Date(now.getTime() + EV_DAYS * 864e5))}.`;
const enText = it => [it.name, it.description, it.type, it.venue, it.town].map(x => x && typeof x === 'object' ? x.en || '' : x || '').join(' ').toLowerCase();
// "bullfighting" also catches "bullfights": each word of a topic matches a word that starts like it.
const hits = (text, topic) => String(topic).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2).every(w => new RegExp('\\b' + w.slice(0, Math.max(4, w.length - 3))).test(text));
async function englishTopics(topics) {
  const map = await translate(topics, ['en'], 'the language they are written in (it may already be English)');
  return topics.map(t => ((map[t] || {}).en || t).toLowerCase());
}
// Two events are the same when their names share a word that says which one it is, in any language, and they are
// close by. Words every event of a kind has ("human towers", "diada", "festival", "fair", "Sant") and the town's name
// do not count: otherwise a new diada in Vilafranca looked like the town's All Saints' human towers.
const EV_STOP = new Set(('the and of in at on for with a an to de del dels la les el els los las le du des et en al von der die das im het een van op '
  + 'human towers tower castells castell castellers castellera colla colles diada diades festival fest festa festes fiesta fiestas fete fetes feest feesten fair fira fires feria ferias foire markt market mercat mercado marche '
  + 'major mayor main big gran grande summer estiu verano ete sommer zomer winter hivern invierno hiver christmas nadal navidad noel weihnachten kerst '
  + 'day dia dag tag jour jornada night nit noche nuit nacht nacht celebration festivities procession parade cavalcada cabalgata sant santa san saint sankt sint '
  // the same words in the guide's other languages: human towers, pillars, fair, festival...
  + 'torres torre tours tour chateaux chateau humains humaines humanas humanos humana humano menschenturme menschenturmen menschenturm menselijke torens toren '
  + 'pilar pilars pilares pilier piliers saule saulen zuil zuilen festividad feestdag feste messe jahrmarkt kermis beurs concurso concours concurs wettbewerb wedstrijd '
  + 'zu bei im am beim au aux em na dans pour para per voor met mit auf').split(' '));
const evWords = it => { const town = String(it.town || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/);
  return new Set([it.name_local, ...Object.values(it.name || {})].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u00ad]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !EV_STOP.has(w) && !town.includes(w))); };
const sameEvent = (a, b) => { if (typeof a.lat === 'number' && typeof b.lat === 'number' && hav(a.lat, a.lng, b.lat, b.lng) > 3) return false; const w = evWords(a); return [...evWords(b)].some(x => w.has(x)); };
// Adds what was found to one copy of the events file (the live guide, or the draft) and says what changed.
function mergeEvents(file, found, today, R, scales = {}) {
  const auto = file.auto || {}, items = file.items = file.items || [], out = { added: [], updated: [], dropped: [], small: [] };
  const removed = (auto.removed || []).map(r => typeof r === 'string' ? { name: r } : r);
  const end = dayStr(new Date(Date.parse(today) + EV_DAYS * 864e5));
  for (const f of found) {
    const same = items.find(x => sameEvent(x, f));
    if (same) {
      if (!same.auto) continue;   // the host's own event: never touched
      const dates = [...(same.dates || []).filter(d => (d.end || d.start) < today || d.start > end), ...(f.dates || [])].sort((a, b) => a.start.localeCompare(b.start));
      const key = ds => JSON.stringify((ds || []).map(d => [d.start, d.end, d.status, d.time, d.until]));   // the database may store a date's keys in another order
      const was = key(same.dates);
      same.dates = dates.filter((d, i) => !dates.slice(0, i).some(e => e.start === d.start));
      for (const k of ['url', 'sources', 'venue']) if (f[k] && !same[k]) same[k] = f[k];
      if (f.scale) same.scale = f.scale;
      if (key(same.dates) !== was) out.updated.push(nameOf(same.name));
      continue;
    }
    if (removed.some(r => sameEvent({ name: { en: r.name } }, f))) continue;   // deleted by the host once
    const ids = new Set(items.map(x => x.id)); let id = f.id; while (ids.has(id)) id += '-2';
    items.push({ ...f, id, auto: true }); out.added.push(nameOf(f.name));
    out.details = [...(out.details || []), `${nameOf(f.name)} (${f.town || '?'}): ${(f.dates || []).map(d => `${d.start}${d.end && d.end !== d.start ? ' to ' + d.end : ''} ${d.status}`).join(', ')}. Source: ${[f.url, ...(f.sources || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' ')}`];
  }
  for (let i = items.length - 1; i >= 0; i--) { const x = items[i]; if (x.auto && !(x.dates || []).some(d => (d.end || d.start) >= today)) { items.splice(i, 1); out.dropped.push(nameOf(x.name)); } }
  // Automatic events too small to travel to (the host's own events are never touched).
  for (let i = items.length - 1; R && i >= 0; i--) { const x = items[i]; if (!x.auto) continue; if (!x.scale && scales[x.id]) x.scale = scales[x.id]; if (!evFits(x, R)) { items.splice(i, 1); out.small.push(nameOf(x.name)); } }
  return out;
}
// The guide must have a live Events section for them to show (a guide built without events had none, or one "coming soon").
function eventsLive(content) {
  const f = content.files, ss = (f.sections = f.sections || { sections: [] }).sections = f.sections.sections || [];
  const row = ss.find(x => x.id === 'events');
  if (!row) ss.push({ id: 'events', kind: 'events', color: 'events', group: 'area', status: 'live', labelKey: 'events' }); else row.status = 'live';
  content.site = content.site || {}; content.site.modules = { ...(content.site.modules || {}), events: true };
}
// One general search (the area's own traditions) and, side by side, one focused search per topic the host wants
// (up to three): a topic like "Castellers" gets every diada in the window, not a share of ten events. Same event found
// twice: kept once.
async function searchEvents(A, { exclude = [], update = [], want = [], skip = [], reach } = {}) {
  const { clean, located, allowed } = researchTools();
  const R = reach || { near: 10, far: A.radius || 30 }, win = `${windowRule()} ${reachRule(R)}`;
  const skipRule = skip.length ? ` Never include events about: ${skip.join('; ')} (topics, maybe written in another language: leave them out whatever the language of the source).` : '';
  const known = exclude.length ? ` Already in the guide, so never suggest them again: ${exclude.join('; ')}.` : update.length ? ` Include events already in the guide when you find their dates in this window, so the guide can update them: ${update.join('; ')}.` : '';
  const passes = [
    `${FIND['find-events'].rule} ${win} ${LOCAL_EVENTS}${want.length ? ` The host would also like events about: ${want.join('; ')} (topics, maybe written in another language).` : ''}${known}${skipRule}`,
    ...want.slice(0, 3).map(w => `The host specifically wants events about "${w}". It is a topic, maybe written in another language: say it in the local language(s) yourself and search with those words too. Find every event about it with a date in this window (the small ones only close to the house, as below), up to 20, town by town, starting with the closest towns: the schedules of the groups or bodies that organise it, the town halls' agendas, the local press. ${win} ${EVENT_SHAPE} ${LOCAL_EVENTS.split('. ').slice(-1)[0]}${known}${skipRule}`)
  ];
  let failed = null;
  const outs = await Promise.all(passes.map(r => claudeJson(researchPrompt('events', A, `${r} ${CURATION} ${allowed}`), 'events').then(o => located(clean(o)).items || []).catch(e => { failed = e; log('  an events search did not work:', e.message); return []; })));
  if (failed && outs.every(o => !o.length)) throw failed;
  const all = [];
  for (const it of outs.flat()) {
    if (!EV_MAIN.includes(it.scale) && !['local', 'town'].includes(it.scale)) delete it.scale;
    it.km_from_house = Math.round(hav(A.lat, A.lng, it.lat, it.lng) * 10) / 10;
    if (evFits(it, R) && !all.some(o => sameEvent(o, it))) all.push(it);
  }
  return all;
}
// The size of automatic events saved before sizes existed, asked once for the ones far enough for it to matter.
async function eventScales(items, A) {
  if (!items.length) return {};
  const list = items.map(x => `${x.id}: ${x.name_local || nameOf(x.name)} (${x.town || '?'})`).join('\n');
  const o = await claudeJson(`Local events near ${A.town || 'a holiday home'}${A.region ? ', ' + A.region : ''}. For each one say how big it is: "local" (one village, neighbourhood or club, e.g. a colla's own diada), "town" (a town's own main festival), "regional" (people come from around the area) or "major" (known across the region or the country). Search the web when unsure. Answer with ONE JSON object and nothing else: {"scale": {"<id>": "local"}}.\n${list}`, 'event sizes').catch(e => { log('  event sizes not found:', e.message); return {}; });
  const out = {}; for (const [k, v] of Object.entries(o.scale || {})) if ([...EV_MAIN, 'local', 'town'].includes(v)) out[k] = v;
  return out;
}
async function refreshEvents(g, { apply = true, say = () => {} } = {}) {
  const c = g.content, ev = (c.files || {}).events, auto = ev && ev.auto;
  if (!auto || !auto.on) return null;
  const h = (c.files || {}).house || {}, site = c.site || {}, A0 = g.answers || {}, today = dayStr(new Date());
  if (typeof h.lat !== 'number') throw new Error('The guide does not know where the house is.');
  const skip = (auto.skip || []).filter(Boolean), want = (auto.want || []).filter(Boolean);
  const R = evReach(site, auto);
  const A = { placeName: site.name, town: A0.town || '', region: A0.region || '', lat: h.lat, lng: h.lng, radius: R.far, city: R.mode === 'city', interests: [...(A0.interests || []), ...want], feelWords: A0.feelWords, tone: A0.tone };
  const known = (ev.items || []).map(x => x.name_local || nameOf(x.name)).filter(Boolean);
  say(want.length ? `Searching the web for events, and for ${want.join(', ')}` : 'Searching the web for events');
  const out = { items: await searchEvents(A, { update: known, want, skip, reach: R }) };
  const skipEn = await englishTopics(skip);
  let found = (out.items || []).filter(f => (f.dates || []).some(d => (d.end || d.start) >= today) && !skipEn.some(t => hits(enText(f), t)));
  found = found.filter((f, i) => !found.slice(0, i).some(o => sameEvent(o, f)));   // the same event found twice
  for (const f of found) { f.id = slugOf(f.name_local || nameOf(f.name)); f.km_from_house = Math.round(hav(h.lat, h.lng, f.lat, f.lng) * 10) / 10; }
  const langs = (site.languages || ['en']).filter(l => l !== 'en' && LANGS.includes(l)), objs = i18nOf(found);
  const texts = [...new Set(objs.map(o => o.en).filter(Boolean))];
  if (langs.length && texts.length) { say(`Translating ${found.length} events`); fill(objs, await translate(texts, langs, 'en'), langs, 'en'); }
  const unsized = (ev.items || []).filter(x => x.auto && !x.scale && typeof x.km_from_house === 'number' && x.km_from_house > R.near && !found.some(f => sameEvent(x, f)));
  if (unsized.length) say(`Checking how big ${unsized.length} events are`);
  const scales = await eventScales(unsized, A);
  // Merge into the newest copies and save only if nobody saved meanwhile (the host editing their draft, the monthly check):
  // otherwise read again and merge again, a few times.
  let res = null;
  for (let tries = 1; ; tries++) {
    const now = (await rest(`/rest/v1/guides?select=updated_at,content,draft&id=eq.${g.id}`))[0];
    const live = now.content, draft = now.draft && now.draft.content ? now.draft : null;
    res = mergeEvents(live.files.events = live.files.events || { items: [] }, JSON.parse(JSON.stringify(found)), today, R, scales);
    live.files.events.auto = { ...(live.files.events.auto || auto), last: today, lastAdded: res.added.length };
    if (live.files.events.items.length) eventsLive(live);
    if (draft) { const df = draft.content.files = draft.content.files || {}; df.events = df.events || { items: [] }; mergeEvents(df.events, JSON.parse(JSON.stringify(found)), today, R, scales); df.events.auto = { ...(df.events.auto || auto), last: today, lastAdded: res.added.length }; if (df.events.items.length) eventsLive(draft.content); }
    if (!apply) break;
    const body = { content: live, ...(draft ? { draft: { ...draft, savedAt: new Date().toISOString() } } : {}) };
    const saved = await rest(`/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(now.updated_at)}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } });
    if (saved && saved.length) break;
    if (tries >= 5) throw new Error('The guide kept changing while we saved: try again in a moment.');
    await new Promise(r => setTimeout(r, 1500 * tries));
  }
  return { ...res, found: found.length };
}
const evLine = r => [r.added.length ? `added ${r.added.join(', ')}` : '', r.updated.length ? `new dates for ${r.updated.join(', ')}` : '', r.dropped.length ? `past, removed: ${r.dropped.join(', ')}` : '', (r.small || []).length ? `too small to travel to or too far, removed: ${r.small.join(', ')}` : ''].filter(Boolean).join('; ') || 'nothing new';
async function autoEventsJob(j, jp) {
  const g = (await rest('/rest/v1/guides?select=id,content,answers&id=eq.' + j.guide_id))[0];
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=in.(find-todo,find-markets,find-events,auto-events)&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= FIND_PER_DAY) throw new Error('You have searched a lot today. Try again tomorrow.');
  const r = await refreshEvents(g, { say: m => jp({ message: m }) });
  if (!r) throw new Error('Automatic events are switched off for this guide.');
  log('  events:', evLine(r));
  await jp({ status: 'done', message: r.added.length ? `${r.added.length} events added` : 'Nothing new this time', result: r, finished_at: new Date().toISOString() });
}

/* ---------- Getting around: the lines through a station or stop, and the main places they reach ----------
   From the editor (Getting around > Add a train station or bus stop, or Refresh the lines; job "find-transport", params
   {id, mode, name, lat, lng}). Claude looks them up on the web (the operators' sites and timetables first); the line names
   and colours, the destinations and journey times go into the draft's station, translated into the guide's languages, and
   back in the job for the editor that is still open. The host's own words (tag, what) and a timetable link they set
   themselves are never touched (onboarding-site/src/editor.js cmLinesApply does the same in the open copy). */
const HEX6 = /^#[0-9a-f]{6}$/i;
const lumOf = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
function applyLines(s, r, langs) {
  s.badges = r.badges; s.to = r.to;
  if (r.link && (!s.link || s.link === (s.auto || {}).link)) { s.link = r.link; s.linkKey = 'timetable'; }
  const nm = s.name || {}, first = nm[langs[0]] || '';
  if (r.name && langs.every(l => (nm[l] || '') === first)) s.name = { ...nm, ...r.name };
  s.auto = { checked: r.checked, operator: r.operator, link: r.link, sources: r.sources };
}
async function transportJob(j, jp, { dry = false } = {}) {
  const P = j.params || {}, since = new Date(Date.now() - 864e5).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=eq.find-transport&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= 20) throw new Error('You have looked up a lot of lines today. Try again tomorrow.');
  const g = (await rest('/rest/v1/guides?select=content,draft,answers&id=eq.' + j.guide_id))[0];
  const c = g.draft && g.draft.content ? g.draft.content : g.content, site = c.site || {}, h = (c.files || {}).house || {}, A0 = g.answers || {};
  const st = (((c.files || {}).transport || {}).stations || []).find(x => x.id === P.id) || {};
  const name = String(P.name || nameOf(st.name) || '').slice(0, 120), mode = (P.mode || st.mode) === 'bus' ? 'bus' : 'train';
  const lat = +P.lat || st.lat, lng = +P.lng || st.lng;
  if (!name || !(typeof lat === 'number' && lat)) throw new Error('The station needs a name and a pin first.');
  const km = typeof h.lat === 'number' ? Math.round(hav(h.lat, h.lng, lat, lng)) : null, where = [A0.town, A0.region].filter(Boolean).join(', ');
  await jp({ message: `Looking up the ${mode === 'bus' ? 'buses' : 'trains'} at ${name}` });
  const out = await claudeJson(`You fill the "Getting around" page of a holiday home's guest guide, for guests without a car.
The ${mode === 'bus' ? 'bus stop' : 'train station'}: "${name}", at ${lat.toFixed(5)}, ${lng.toFixed(5)}${where ? `, near ${where}` : ''}${km != null ? `, ${km} km from the house` : ''}.
Search the web, the operators' own sites and timetables first, then Wikipedia, for:
1. "lines": every line or service that stops here, written as on signs and tickets (for example "R4", "R2 Sud", "AVE", "Avlo", "Alvia", "Euromed", "L1", "Bus 900"), each with its official colour as "#RRGGBB" when the operator uses one, else null.
2. "to": up to 5 places guests will want to reach from here: the nearest big city first, then other cities, the airport, a beach town or a famous sight when one is served. Each {"dest": the place in English, "time": the usual fastest journey like "35 min" or "1 h 30", "note": "direct", "1 change", or ""}. Only places reachable by public transport from this stop.
3. "name": the usual name of this ${mode === 'bus' ? 'stop' : 'station'} in English (for example "El Vendrell station"), "operator": who runs it, "link": the official timetable page (the operator's site), "sources": the pages you used.
Only facts you found on the web: never invent a line, a time or a colour. When a time varies, give the usual one with "about". Return only JSON:
{"name":"","operator":"","link":"","lines":[{"t":"","c":"#RRGGBB"}],"to":[{"dest":"","time":"","note":""}],"sources":[]}`, 'transport');
  const seen = new Set(), badges = [];
  for (const l of Array.isArray(out.lines) ? out.lines : []) {
    const t = String((l && l.t) || '').trim().slice(0, 24); if (!t || seen.has(t.toLowerCase())) continue; seen.add(t.toLowerCase());
    const col = HEX6.test((l && l.c) || '') ? l.c.toUpperCase() : (mode === 'bus' ? '#0E7C46' : '#1D4FA0');
    badges.push({ t, c: col, ink: lumOf(col) > .45 });
    if (badges.length >= 12) break;
  }
  const to = (Array.isArray(out.to) ? out.to : []).map(d => ({ dest: String((d && d.dest) || '').trim().slice(0, 60), time: String((d && d.time) || '').trim().slice(0, 20), note: String((d && d.note) || '').trim().slice(0, 40) })).filter(d => d.dest && d.time).slice(0, 5);
  if (!badges.length && !to.length) return jp({ status: 'done', message: 'No lines found on the web. Add them by hand.', result: { id: P.id, badges: [], to: [] }, finished_at: new Date().toISOString() });
  const langs = (site.languages || ['en']).filter(l => LANGS.includes(l)), other = langs.filter(l => l !== 'en');
  const texts = [...new Set([...to.flatMap(d => [d.dest, d.note]), String(out.name || '').trim()].filter(Boolean))];
  await jp({ message: `Found ${badges.length} line${badges.length === 1 ? '' : 's'}: translating` });
  const map = other.length && texts.length ? await translate(texts, other, 'en') : {};
  const six = x => x ? Object.fromEntries([['en', x], ...other.map(l => [l, ((map[x] || {})[l]) || x])]) : Object.fromEntries([['en', ''], ...other.map(l => [l, ''])]);
  const link = /^https?:\/\//.test(out.link || '') ? String(out.link) : '';
  const result = { id: P.id, badges, to: to.map(d => ({ dest: six(d.dest), time: d.time, note: six(d.note) })), link, name: out.name ? six(String(out.name).trim().slice(0, 80)) : null,
    operator: String(out.operator || '').slice(0, 80), sources: (Array.isArray(out.sources) ? out.sources : []).filter(u => /^https?:\/\//.test(u)).slice(0, 6), checked: new Date().toISOString().slice(0, 10) };
  // Into the newest copy (the editor may have saved meanwhile), and back to the editor that asked.
  const now = (await rest('/rest/v1/guides?select=content,theme,draft&id=eq.' + j.guide_id))[0];
  const draft = now.draft && now.draft.content ? now.draft : { content: now.content, theme: now.theme };
  const s2 = (((draft.content.files || {}).transport || {}).stations || []).find(x => x.id === P.id);
  if (s2 && !dry) { applyLines(s2, result, langs.length ? langs : ['en']); await rest('/rest/v1/guides?id=eq.' + j.guide_id, { method: 'PATCH', body: { draft: { ...draft, savedAt: new Date().toISOString() } }, headers: { Prefer: 'return=minimal' } }); }
  await jp({ status: 'done', message: `${badges.length} line${badges.length === 1 ? '' : 's'}, ${to.length} destination${to.length === 1 ? '' : 's'}`, result, finished_at: new Date().toISOString() });
}

/* ---------- Artistic cover: one of the host's photos redrawn (OpenAI image editing, OPENAI_API_KEY in .env.local) ----------
   "Do it for me" asks for Bauhaus-style shapes in the photo's own colours; otherwise the host's own words. The picture
   must be one of this guide's (its storage folder) or its listing's (Airbnb's image server). The result goes to the
   guide's storage; the host sees it and keeps it or tries again. OpenAI retires image models (gpt-image-1 shut down on
   23 Oct 2026): OPENAI_IMAGE_MODEL in .env.local switches to another one without a code change. */
const ART_PER_DAY = 8, ART_MODEL = () => env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
const artPrompt = words => words
  ? `Redraw this photo of a holiday home for the cover of its guest guide: ${words}. Keep the house and the viewpoint recognisable. No text, no letters, no people.`
  : 'Redraw this photo of a holiday home as a Bauhaus-style artwork for the cover of its guest guide: flat geometric shapes, clean lines, simple bold forms, a little paper texture, like a screen print. Keep the house, the composition and the viewpoint recognisable. Use the colours of the photo itself. No text, no letters, no people.';
async function coverArtJob(j, jp) {
  if (!env.OPENAI_API_KEY) throw new Error('Artistic covers are not switched on yet.');
  const p = j.params || {}, src = String(p.source || ''), words = String(p.prompt || '').trim().slice(0, 600);
  const ours = src.startsWith(`${URL_}/storage/v1/object/public/guide-assets/${j.guide_id}/`), airbnb = /^https:\/\/a0\.muscache\.com\//.test(src);
  if (!ours && !airbnb) throw new Error('This picture cannot be used. Pick one of your photos.');
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=eq.cover-art&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= ART_PER_DAY) throw new Error('You have made a lot of covers today. Try again tomorrow.');
  await jp({ message: 'Reading your photo' });
  const img = await fetchRetry(src.split('?')[0] + (airbnb ? '?im_w=1440' : ''));
  if (!img.ok) throw new Error('Your photo could not be read.');
  const fd = new FormData();
  fd.append('model', ART_MODEL()); fd.append('image', new Blob([Buffer.from(await img.arrayBuffer())], { type: img.headers.get('content-type') || 'image/jpeg' }), 'photo.jpg');
  fd.append('prompt', artPrompt(words)); fd.append('size', '1536x1024'); fd.append('quality', 'medium'); fd.append('output_format', 'jpeg'); fd.append('output_compression', '85');
  await jp({ message: 'Drawing your cover' });
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: fd, signal: AbortSignal.timeout(240000) });
  const d = await r.json().catch(() => ({}));
  // OpenAI's own words (credits, key, verification) are for us, not the host: they go to the log only
  if (!r.ok) {
    const why = (d.error && (d.error.code || d.error.message)) || '', refused = /moderation|safety/i.test(why + ' ' + ((d.error && d.error.message) || ''));
    log('  OpenAI said:', r.status, String((d.error && d.error.message) || why).slice(0, 200));
    throw new Error(refused ? 'That drawing was refused. Try other words.' : [401, 403, 429].includes(r.status) ? 'Artistic covers are paused for now. Try again later.' : 'The drawing did not work. Try again.');
  }
  const b64 = d.data && d.data[0] && d.data[0].b64_json;
  if (!b64) throw new Error('The drawing came back empty. Try again.');
  await jp({ message: 'Saving your cover' });
  const name = `covers/art-${Date.now().toString(36)}.jpg`;
  const up = await fetchRetry(`${URL_}/storage/v1/object/guide-assets/${j.guide_id}/${name}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: Buffer.from(b64, 'base64') });
  if (!up.ok) throw new Error('Your cover could not be saved.');
  log('  cover drawn:', name, ART_MODEL(), d.usage ? `${d.usage.input_tokens} tokens in, ${d.usage.output_tokens} out` : '');
  await jp({ status: 'done', message: 'Your artistic cover is ready', result: { path: name, url: `${URL_}/storage/v1/object/public/guide-assets/${j.guide_id}/${name}` }, finished_at: new Date().toISOString() });
}

/* ---------- Research of the area (docs/plan-fast-builder.md, step 8; Yohann, 29 Oct 2026), in two stages:
   1. At the listing link, with or without an account: a quick search, for the wow and the phone (area_research). The few
      markets nearest the house, whatever their distance (a city has them within a few streets, the countryside 10 to
      20 km away), and the emergency services, with fewer web searches. Things to do come from Google in the swipe deck.
      The browser asks the database (start_area_research: one per area of about 3 km for 14 days, shared, with limits per
      visitor, per network address and in all); this worker does it (runArea) within VISITOR_USD_PER_DAY (default 3 USD
      a day, Claude API only), past which it is left to the build. Rows older than 30 days are removed.
   2. Once the guide has an account: the full research in the background (guide job "research", at most one a day per
      guide): all the markets in reach and the things to do, the build's own questions.
   The build uses the full research, adds the markets the quick one found that it does not have, takes the emergency
   services from the quick one, and only searches what is still missing (areaResearch, mergeQuick). ---------- */
const AREA_KINDS = ['markets', 'emergency'], VISITOR_USD = +env.VISITOR_USD_PER_DAY || 3;
const QUICK_MARKETS = MARKETS_RULE.replace(/^Find the weekly and notable local markets within the radius \([^)]*\)\./, 'Find only the 5 markets nearest the house (weekly street markets, covered markets), whatever their distance: in a city they may all be a few streets away, in the countryside 10 to 20 km. Give their days and hours.');
if (QUICK_MARKETS === MARKETS_RULE) throw new Error('QUICK_MARKETS: the start of MARKETS_RULE changed, write the quick rule again');
const QUICK_SEARCHES = { markets: 8, emergency: 6 }, RESEARCH_PER_DAY = 1, UUID = /^[0-9a-f-]{36}$/;
const kmBetween = (a, b, c, d) => { const R = 6371, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t; const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
let areaSweep = 0;
async function runArea(only) {
  if (!only && Date.now() - areaSweep > 3600000) { areaSweep = Date.now(); rest('/rest/v1/area_research?created_at=lt.' + new Date(Date.now() - 30 * 86400000).toISOString(), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {}); }
  const row = ((await rest('/rest/v1/area_research?select=id,lat,lng,town,region&status=eq.queued' + (only ? '&id=eq.' + only : '') + '&order=created_at.asc&limit=1')) || [])[0];
  if (!row) return null;
  const ap = b => rest('/rest/v1/area_research?id=eq.' + row.id, { method: 'PATCH', body: b, headers: { Prefer: 'return=minimal' } }).catch(() => {});
  if (claudeApi) {
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0);
    const spent = ((await rest('/rest/v1/area_research?select=usd&usd=not.is.null&finished_at=gte.' + midnight.toISOString())) || []).reduce((s, r) => s + (+r.usd || 0), 0);
    if (spent >= VISITOR_USD) { log(`area research for ${row.town || row.id.slice(0, 8)} left to the build: about ${spent.toFixed(2)} USD spent today (VISITOR_USD_PER_DAY=${VISITOR_USD})`); await ap({ status: 'limited', message: 'Left to the build: today\'s research for visitors is spent', finished_at: new Date().toISOString() }); return null; }
  }
  const won = await rest('/rest/v1/area_research?id=eq.' + row.id + '&status=eq.queued', { method: 'PATCH', body: { status: 'running' }, headers: { Prefer: 'return=representation' } });
  if (!won || !won[0]) return;
  log('researching the area of', row.town || `${row.lat}, ${row.lng}`, row.id.slice(0, 8));
  const work = (async () => {
    const dir = join(HERE, 'jobs', 'area-' + row.id), meter = { usd: 0 };
    try {
      rmSync(dir, { recursive: true, force: true });
      await research({ town: row.town, region: row.region, lat: row.lat, lng: row.lng }, dir, null, { meter, parts: AREA_KINDS, rules: { markets: QUICK_MARKETS }, searches: QUICK_SEARCHES });
      const result = Object.fromEntries(AREA_KINDS.filter(k => existsSync(join(dir, k + '.json'))).map(k => [k, JSON.parse(readFileSync(join(dir, k + '.json'), 'utf8'))]));
      if (!Object.keys(result).length) throw new Error('Nothing came back from the research');
      await ap({ status: 'done', result, usd: claudeApi ? +meter.usd.toFixed(3) : null, message: null, finished_at: new Date().toISOString() });
      log(`  area researched: ${Object.keys(result).join(', ')}${claudeApi ? `, about ${meter.usd.toFixed(2)} USD` : ''}`);
    } catch (e) { log('  area research FAILED:', e.message); await ap({ status: 'failed', message: String(e.message).slice(0, 200), usd: claudeApi ? +meter.usd.toFixed(3) : null, finished_at: new Date().toISOString() }); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  })();
  RUNNING.set(row.id, { guide: null, kind: 'area', work });
  work.finally(() => RUNNING.delete(row.id));
  return { work };   // in an object: returned as it is, the promise would make the caller wait for the whole research
}
// The full research of a guide (job "research"), queued by the browser once the guide has an account. The place comes
// with the job (where the host's device had it), else from the answers.
async function researchJob(j, jp) {
  const since = new Date(Date.now() - 86400000).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=eq.research&status=in.(running,done)&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= RESEARCH_PER_DAY) return jp({ status: 'failed', message: 'This area was already researched today.', finished_at: new Date().toISOString() });
  const g = ((await rest('/rest/v1/guides?select=answers&id=eq.' + j.guide_id)) || [])[0] || {}, p = j.params || {};
  const A = { ...(g.answers || {}), ...Object.fromEntries(['lat', 'lng', 'town', 'region'].filter(k => p[k] != null && p[k] !== '').map(k => [k, p[k]])) };
  if (!A.lat || !A.lng) throw new Error('We do not know where the house is yet.');
  const dir = join(HERE, 'jobs', 'research-' + j.id), meter = { usd: 0 };
  try {
    rmSync(dir, { recursive: true, force: true }); await jp({ message: 'Researching your area' });
    await research(A, dir, null, { meter, parts: ['markets', 'todo'] });
    const result = Object.fromEntries(['markets', 'todo'].filter(k => existsSync(join(dir, k + '.json'))).map(k => [k, JSON.parse(readFileSync(join(dir, k + '.json'), 'utf8'))]));
    if (!Object.keys(result).length) throw new Error('Nothing came back from the research. Try again later.');
    await jp({ status: 'done', result, message: Object.keys(result).join(', '), finished_at: new Date().toISOString() });
    log(`  guide area researched: ${Object.keys(result).join(', ')}${claudeApi ? `, about ${meter.usd.toFixed(2)} USD` : ''}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
// For a build: the full research of this guide and the quick one from its link, when they are for this place (within
// 5 km). Not finished yet: the build waits (up to 10 minutes; the jobs loop takes them within seconds) rather than paying
// twice. Returns the quick research, for mergeQuick after the build's own research.
async function areaResearch(A, dir, id) {
  mkdirSync(dir, { recursive: true });
  const near = r => !r || r.lat == null || !(A.lat && A.lng) || kmBetween(+r.lat, +r.lng, +A.lat, +A.lng) <= 5;
  const settled = async url => { let r = null;
    for (let i = 0; i < 40; i++) { r = ((await rest(url).catch(() => [])) || [])[0]; if (!r || !['queued', 'running'].includes(r.status)) break; if (i === 0) say(id, 'Finishing the research of your area'); await new Promise(ok => setTimeout(ok, 15000)); }
    return r; };
  const used = [];
  const full = await settled(`/rest/v1/guide_jobs?select=status,result,params&guide_id=eq.${id}&kind=eq.research&order=created_at.desc&limit=1`);
  if (full && full.status === 'done' && full.result && near(full.params)) for (const k of ['markets', 'todo']) if (full.result[k]) { writeFileSync(join(dir, k + '.json'), JSON.stringify(full.result[k], null, 1)); used.push(k); }
  let quick = null;
  if (UUID.test(String(A._research || ''))) {
    const r = await settled('/rest/v1/area_research?select=status,lat,lng,result&id=eq.' + A._research);
    if (r && r.status === 'done' && r.result && near(r)) { quick = r.result; if (quick.emergency && !existsSync(join(dir, 'emergency.json'))) { writeFileSync(join(dir, 'emergency.json'), JSON.stringify(quick.emergency, null, 1)); used.push('emergency'); } }
  }
  if (used.length) log('  research done before the build used:', used.join(', '));
  return quick;
}
// After the build's own research: the markets the quick search found that the full one does not have are added (by
// name); if the build has no markets at all (its search did not work), the nearest ones from the quick search at least.
function mergeQuick(dir, quick) {
  const q = (((quick || {}).markets || {}).markets || []); if (!q.length) return;
  const f = join(dir, 'markets.json');
  if (!existsSync(f)) { writeFileSync(f, JSON.stringify(quick.markets, null, 1)); log('  markets from the quick search only'); return; }
  const o = JSON.parse(readFileSync(f, 'utf8')), key = m => String(m.name_local || nameOf(m.name) || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, ' ').trim();
  const have = new Set((o.markets || []).map(key)), ids = new Set((o.markets || []).map(m => m.id));
  const add = q.filter(m => key(m) && !have.has(key(m))).map(m => ({ ...m, id: ids.has(m.id) ? m.id + '-near' : m.id }));
  if (!add.length) return;
  o.markets = [...(o.markets || []), ...add];
  if (Array.isArray(o.categories)) o.categories = [...new Set([...o.categories, ...add.map(m => m.category).filter(Boolean)])];
  writeFileSync(f, JSON.stringify(o, null, 1)); log(`  ${add.length} market(s) from the quick search added`);
}

// Up to three jobs run side by side (each one mostly waits for Claude). Two jobs that write the same guide (translate,
// automatic events) never run together; searches for suggestions write nothing to the guide, so they never wait.
const RUNNING = new Map(), MAX_JOBS = 3, WRITES = k => k === 'translate' || k === 'auto-events' || k === 'find-transport';
let STOPPING = false;   // set by SIGTERM: no new jobs or builds
async function runJobs() {
  if (STOPPING || RUNNING.size >= MAX_JOBS) return;
  const jobs = await rest('/rest/v1/guide_jobs?select=id,guide_id,kind,langs,params&status=eq.queued&order=created_at.asc&limit=10');
  for (const j of jobs || []) {
    if (RUNNING.size >= MAX_JOBS) break;
    if (WRITES(j.kind) && [...RUNNING.values()].some(r => r.guide === j.guide_id && WRITES(r.kind))) continue;
    const jp = b => rest('/rest/v1/guide_jobs?id=eq.' + j.id, { method: 'PATCH', body: b, headers: { Prefer: 'return=minimal' } }).catch(() => {});
    const won = await rest('/rest/v1/guide_jobs?id=eq.' + j.id + '&status=eq.queued', { method: 'PATCH', body: { status: 'running', message: j.kind === 'translate' ? 'Translating' : j.kind === 'cover-art' ? 'Starting the drawing' : 'Starting the search' }, headers: { Prefer: 'return=representation' } });
    if (!won || !won[0]) continue;
    log(j.kind === 'translate' ? 'translating' : j.kind === 'cover-art' ? 'drawing' : 'searching', 'job', j.id.slice(0, 8), j.kind === 'translate' ? (j.langs || []).join(',') : j.kind);
    const work = (async () => {
      try { if (j.kind === 'translate') await translateJob(j, jp); else if (j.kind === 'cover-art') await coverArtJob(j, jp); else if (j.kind === 'auto-events') await autoEventsJob(j, jp); else if (j.kind === 'find-transport') await transportJob(j, jp); else if (j.kind === 'research') await researchJob(j, jp); else if (FIND[j.kind]) await findJob(j, jp); else throw new Error('Unknown job: ' + j.kind); }
      catch (e) { log('  job FAILED:', e.message); await jp({ status: 'failed', message: String(e.message).slice(0, 200), finished_at: new Date().toISOString() }); }
    })();
    RUNNING.set(j.id, { guide: j.guide_id, kind: j.kind, work });
    work.finally(() => RUNNING.delete(j.id));
  }
  if (RESEARCHING && !STOPPING && RUNNING.size < MAX_JOBS) await runArea().catch(e => log('area research:', e.message));
}
async function tick() {
  await runJobs().catch(e => log('jobs:', e.message));
  await recover();
  for (let g; !STOPPING && (g = await claim());) {
    log('building', g.slug);
    try { await build(g); }
    catch (e) {
      log('  FAILED:', e.message);
      await lastSay;
      await patch(g.id, { status: 'failed', message: String(e.message).slice(0, 300), finished_at: new Date().toISOString() }).catch(() => {});
      try { rmSync(resolve(ROOT, 'sites', 'w-' + g.id.slice(0, 8)), { recursive: true, force: true }); } catch (e2) {}
    }
  }
}
// npm run refresh-events [-- --slug <slug>] [--apply]: the monthly run of automatic events (scheduled task). Without --apply it
// searches and reports what it would change, writing nothing.
if (process.argv.includes('--refresh-events')) {
  const slug = (process.argv[process.argv.indexOf('--slug') + 1] || '').replace(/^--.*/, ''), apply = process.argv.includes('--apply');
  const rows = await rest(`/rest/v1/guides?select=id,slug,content,answers&${slug ? 'slug=eq.' + encodeURIComponent(slug) : 'status=eq.published'}`);
  for (const g of rows || []) {
    if (!(g.content && g.content.files && g.content.files.events && (g.content.files.events.auto || {}).on)) { if (slug) console.log(`${g.slug}: automatic events are off.`); continue; }
    try { const r = await refreshEvents(g, { apply }); console.log(`${g.slug}: ${r.found} found in the next three months; ${evLine(r)}${apply ? '' : ' (dry run: nothing written, add --apply)'}`); for (const l of r.details || []) console.log('  + ' + l); }
    catch (e) { console.log(`${g.slug}: did not work: ${e.message}`); }
  }
  process.exit(0);
}
// node worker/guide-worker.mjs --area-research <id>: that one area research (still queued) now, as the worker does it,
// written to its row. To try it without the queue, next to a running worker (which may take it first).
if (process.argv.includes('--area-research')) {
  const id = process.argv[process.argv.indexOf('--area-research') + 1] || '';
  if (!/^[0-9a-f-]{36}$/.test(id)) { console.error('Use: --area-research <id of a queued area_research row>'); process.exit(1); }
  const started = await runArea(id);
  if (!started) { console.error('No queued area research with that id (or today\'s research for visitors is spent).'); process.exit(1); }
  await started.work; const r = ((await rest('/rest/v1/area_research?select=status,message,usd,result&id=eq.' + id)) || [])[0] || {};
  log(`${r.status}${r.message ? ': ' + r.message : ''}${r.usd != null ? `, about ${(+r.usd).toFixed(2)} USD` : ''}. Parts: ${Object.keys(r.result || {}).join(', ') || 'none'}`);
  process.exit(r.status === 'done' ? 0 : 1);
}
// node worker/guide-worker.mjs --find find-todo|find-markets|find-events --slug <slug>: one "Find more" search for a guide,
// as the editor's button runs it (web search, Google check, translation), printed here and written nowhere. To try a new
// computer or server, or RESEARCH=api, without the queue (and alongside a running worker).
if (process.argv.includes('--find')) {
  const kind = process.argv[process.argv.indexOf('--find') + 1], slug = (process.argv[process.argv.indexOf('--slug') + 1] || '').replace(/^--.*/, '');
  if (!(FIND[kind] || kind === 'find-transport') || !slug) { console.error('Use: --find find-todo|find-markets|find-events --slug <slug>, or --find find-transport --slug <slug> --station <id>'); process.exit(1); }
  const g = (await rest(`/rest/v1/guides?select=id&slug=eq.${encodeURIComponent(slug)}`))[0];
  if (!g) { console.error(`No guide ${slug}.`); process.exit(1); }
  if (kind === 'find-transport') {   // the lines through one station of the guide, as the editor's "Refresh the lines" finds them
    const sid = process.argv[process.argv.indexOf('--station') + 1] || '';
    log(`Getting around, ${slug}, station ${sid}. Research: ${RESEARCH === 'api' ? 'Claude API' : 'claude command'}. Nothing is written.`);
    let res = null;
    try { await transportJob({ id: '00000000-0000-0000-0000-000000000000', guide_id: g.id, kind, params: { id: sid } }, async b => { if (b.message) log(b.message); if (b.result) res = b.result; }, { dry: true }); }
    catch (e) { log('did not work:', e.message); process.exit(1); }
    console.log(JSON.stringify({ lines: res.badges.map(b => `${b.t} ${b.c}${b.ink ? ' (dark text)' : ''}`), to: res.to.map(d => `${d.dest.en} ${d.time}${d.note.en ? ' · ' + d.note.en : ''}`), link: res.link, operator: res.operator, name: res.name, sources: res.sources }, null, 1));
    process.exit(0);
  }
  log(`Find more, ${kind}, ${slug}. Research: ${RESEARCH === 'api' ? 'Claude API' : 'claude command'}. Nothing is written.`);
  let res = null;
  try { await findJob({ id: '00000000-0000-0000-0000-000000000000', guide_id: g.id, kind }, async b => { if (b.message) log(b.message); if (b.result) res = b.result; }); }
  catch (e) { log('did not work:', e.message); process.exit(1); }
  for (const it of res.items) console.log(`  ${nameOf(it.name)}${it.town ? ` (${it.town})` : ''}, ${it.km_from_house} km${it._google ? ': ' + it._google : ''}`);
  const outFile = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '';   // --out <file>: the whole result, as the editor gets it
  if (outFile) { writeFileSync(outFile, JSON.stringify(res, null, 1)); log('result in', outFile); }
  process.exit(0);
}
// One worker at a time: a second one would put the first one's running jobs back in the queue (below). Since 28 Oct 2026
// the worker starts by itself (worker/autostart.sh), so a copy started by hand stops here.
{ const pidFile = join(tmpdir(), 'guide-worker.pid');
  const other = existsSync(pidFile) ? +readFileSync(pidFile, 'utf8') : 0;
  if (other && other !== process.pid && (spawnSync('ps', ['-o', 'command=', '-p', String(other)], { encoding: 'utf8' }).stdout || '').includes('guide-worker.mjs')) {
    console.error(`Another guide worker is already running (process ${other}). It starts by itself: sh worker/autostart.sh status (or restart).`);
    process.exit(1);
  }
  writeFileSync(pidFile, String(process.pid)); }
log(`Guide worker on. Database ${URL_}. Publish on build: ${AUTO_PUBLISH}. Research: ${RESEARCH}.`);
// A server stops the worker with SIGTERM (an update, a restart): it takes nothing new and finishes what is running (a search
// is paid for), then exits. A second SIGTERM, or Ctrl+C, stops at once: what was running starts again at the next start.
process.on('SIGTERM', () => { if (STOPPING) process.exit(0); STOPPING = true; log(`Stopping: finishing ${RUNNING.size} job(s) and any build, taking nothing new.`); });
// HEARTBEAT_URL (optional, a monitoring service's ping address): pinged at most once a minute while the worker can reach
// the database, so we hear when it stops.
let lastBeat = 0;
const beat = () => { if (env.HEARTBEAT_URL && Date.now() - lastBeat > 60000) { lastBeat = Date.now(); fetch(env.HEARTBEAT_URL, { signal: AbortSignal.timeout(10000) }).catch(() => {}); } };
// Jobs still "running" and guides still "generating" belong to a worker that was stopped (only one runs at a time):
// they start again from the beginning, at once (recover() alone would wait 30 minutes).
{ const back = await rest('/rest/v1/guide_jobs?status=eq.running', { method: 'PATCH', body: { status: 'queued', message: 'Starting again' }, headers: { Prefer: 'return=representation' } }).catch(() => []);
  if ((back || []).length) log(`${back.length} job(s) interrupted by the last stop: queued again.`);
  const areas = await rest('/rest/v1/area_research?status=eq.running', { method: 'PATCH', body: { status: 'queued' }, headers: { Prefer: 'return=representation' } }).catch(() => []);
  if ((areas || []).length) log(`${areas.length} area research(es) interrupted by the last stop: queued again.`);
  const built = await rest('/rest/v1/guides?status=eq.generating&select=slug', { method: 'PATCH', body: { status: 'queued', message: 'Starting again' }, headers: { Prefer: 'return=representation' } }).catch(() => []);
  if ((built || []).length) log(`${built.map(g => g.slug).join(', ')}: build interrupted by the last stop, queued again.`); }
if (ONCE) { await tick(); while (RUNNING.size) { await Promise.all([...RUNNING.values()].map(r => r.work)); await tick(); } log('done'); }
else {
  const timer = setInterval(() => runJobs().catch(e => log('jobs:', e.message)), POLL);   // jobs from the editor start even while a guide is being built
  while (!STOPPING) { try { await tick(); beat(); sweepPhotos().catch(e => log('photos of deleted houses:', e.message)); } catch (e) { log('waiting, could not reach the database:', e.message); } await new Promise(r => setTimeout(r, POLL)); }
  clearInterval(timer);
  await Promise.all([...RUNNING.values()].map(r => r.work));
  log('stopped'); process.exit(0);
}
