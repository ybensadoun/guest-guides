#!/usr/bin/env node
// Guide worker: runs on Yohann's computer while it is on (interim, see docs/plan-accounts-and-publishing.md).
// Watches the database for guides a host has queued, builds each one and writes the result back.
//   node worker/guide-worker.mjs            keep running, build guides as they arrive
//   node worker/guide-worker.mjs --once     build whatever is queued now, then stop
// Settings live in worker/.env.local (never committed). See worker/README.md.
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeGoogle, hav, nameOf, sameName, sameMarket, schedule } from './places.mjs';   // Google check for Find more suggestions

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
const RESEARCH = env.RESEARCH || 'skip';                 // skip | cli  (cli = research and translation with the `claude` command)
const POLL = Math.max(3, +env.POLL_SECONDS || 10) * 1000;
const ONCE = process.argv.includes('--once');
if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY. Put it in worker/.env.local (see worker/README.md).'); process.exit(1); }

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
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
let lastSay = Promise.resolve();   // status messages go out in order, and the final result waits for them
const say = (id, message) => { lastSay = lastSay.then(() => patch(id, { message }).catch(() => {})); };

function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { cwd: o.cwd || ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: o.timeout || 600000, input: o.input });
  if (r.error) throw new Error(`${cmd} failed: ${r.error.message}`);
  if (r.status !== 0 && !o.allowFail) throw new Error(`${cmd} ${args.slice(0, 2).join(' ')} exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-6).join(' | ')}`.slice(0, 600));
  return r;
}

/* ---------- Claude research and translation (optional) ---------- */
function claudeJson(prompt, what) {
  const r = run('claude', ['-p', prompt, '--allowedTools', 'WebSearch,WebFetch', '--max-turns', '40'], { timeout: 900000, allowFail: true });
  const out = (r.stdout || '').trim();
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
  return `You research one module of a guest guide for a holiday home. Place: ${A.placeName || 'the house'}, ${area}. Approximate point: ${A.lat}, ${A.lng}. Guests drive up to ${km} km. The host likes: ${[A.interests, A.feelWords, A.tone].flat().filter(Boolean).join('; ') || 'no preference given'}.
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
  const located = o => {
    for (const k of ['markets', 'items']) if (Array.isArray(o[k])) o[k] = o[k].filter(hasPos);   // places without coordinates cannot be shown on the map
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
function research(A, outDir, id) {
  mkdirSync(outDir, { recursive: true });
  const { clean, located, allowed, normSchedule } = researchTools();
  const jobs = [
    ['markets', MARKETS_RULE],
    ['todo', TODO_RULE],
    ['emergency', 'Find the nearest hospital with an emergency department, the national emergency number and the local health advice line. Same shape: {"groups":[...]}.'],
  ];
  for (const [kind, rules] of jobs) {
    say(id, `Researching: ${kind}`);
    try { const o = located(clean(claudeJson(researchPrompt(kind, A, rules + ' ' + allowed), kind))); for (const k of ['markets', 'items']) (o[k] || []).forEach(normSchedule); writeFileSync(join(outDir, kind + '.json'), JSON.stringify(o, null, 1)); }
    catch (e) { log(`  research ${kind} skipped:`, e.message); }
  }
}
function translate(texts, langs, srcLang, file) {
  if (!texts.length || !langs.length) return;
  const prompt = `Translate these texts from ${srcLang} into ${langs.join(', ')}. Keep names, numbers and times. No em-dashes. For French use real non-breaking spaces before ? ! ; : and inside guillemets. In German and Dutch, put a soft hyphen (U+00AD) at a correct syllable break inside every word of 10 letters or more (e.g. Geschichts\u00admuseum), so it can wrap on a narrow phone screen. Answer with ONE JSON object and nothing else: {"<exact source text>": {"${langs.join('": "...", "')}": "..."}}.\n${JSON.stringify(texts)}`;
  const r = run('claude', ['-p', prompt], { timeout: 600000, allowFail: true });
  const out = (r.stdout || ''), a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a >= 0 && b > a) { try { writeFileSync(file, JSON.stringify(JSON.parse(out.slice(a, b + 1)), null, 1)); } catch (e) {} }
}

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
  const clean = { ...A }; delete clean._remote;
  writeFileSync(join(job, 'src/host.json'), JSON.stringify({ answers: clean }));
  writeFileSync(join(job, 'src/listing_photos.json'), JSON.stringify(remote.map(u => ({ url: u.src, room: u.room || '', caption: u.name || '' }))));
  const srcLang = ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(A.sourceLang) ? A.sourceLang : 'en';
  const gen = ['engine/scripts/generate-site.py', join(job, 'src'), '--slug', tmp, '--lat', String(A.lat), '--lng', String(A.lng), '--src', srcLang];

  let researchDir = null;
  if (RESEARCH === 'cli') { researchDir = join(job, 'research'); research(A, researchDir, id); gen.push('--research', researchDir); }
  say(id, 'Building the guide');
  let out = run('python3', gen).stdout;
  if (RESEARCH === 'cli') {
    const need = existsSync(join(siteDir, 'docs/untranslated.json')) ? JSON.parse(readFileSync(join(siteDir, 'docs/untranslated.json'), 'utf8')) : [];
    const langs = (A.languages || []).filter(l => l !== srcLang && ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(l));
    if (need.length && langs.length) { say(id, 'Translating'); const tf = join(job, 'translations.json'); translate(need, langs, srcLang, tf); if (existsSync(tf)) out = run('python3', [...gen, '--translations', tf]).stdout; }
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
const LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
const isI18 = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => LANGS.includes(k));
async function translateJob(j, jp) {
  const g = (await rest('/rest/v1/guides?select=content,draft&id=eq.' + j.guide_id))[0];
  const c = g.draft && g.draft.content ? g.draft.content : g.content, main = ((c.site || {}).languages || ['en'])[0] || 'en', objs = [];
  const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (isI18(x)) objs.push(x); else Object.values(x).forEach(walk); } };
  walk(c.files || {});
  const todo = objs.filter(o => o[main] && j.langs.some(l => !o[l]));
  const texts = [...new Set(todo.map(o => o[main]))];
  if (!texts.length) return jp({ status: 'done', message: 'Nothing to translate', finished_at: new Date().toISOString() });
  const tmp = resolve(ROOT, '.job-' + j.id.slice(0, 8) + '.json'); let map = {};
  for (let i = 0; i < texts.length; i += 40) {
    await jp({ message: `Translating ${Math.min(i + 40, texts.length)} of ${texts.length}` });
    translate(texts.slice(i, i + 40), j.langs, main, tmp);
    if (existsSync(tmp)) { try { Object.assign(map, JSON.parse(readFileSync(tmp, 'utf8'))); } catch (e) {} try { rmSync(tmp, { force: true }); } catch (e) {} }
  }
  let n = 0;
  for (const o of todo) { const t = map[o[main]]; if (!t) continue; for (const l of j.langs) if (!o[l] && t[l]) { o[l] = t[l]; n++; } }
  if (!n) throw new Error('No translations came back. Is the claude command set up on this computer?');
  const now = (await rest('/rest/v1/guides?select=content,theme,draft&id=eq.' + j.guide_id))[0];   // merge into the latest copy, not an old one
  const draft = now.draft && now.draft.content ? now.draft : { content: now.content, theme: now.theme };
  const objs2 = []; const walk2 = x => { if (Array.isArray(x)) x.forEach(walk2); else if (x && typeof x === 'object') { if (isI18(x)) objs2.push(x); else Object.values(x).forEach(walk2); } };
  walk2(draft.content.files || {});
  for (const o of objs2) { const t = map[o[main]]; if (t) for (const l of j.langs) if (!o[l] && t[l]) o[l] = t[l]; }
  await rest('/rest/v1/guides?id=eq.' + j.guide_id, { method: 'PATCH', body: { draft: { ...draft, savedAt: new Date().toISOString() } }, headers: { Prefer: 'return=minimal' } });
  const result = Object.fromEntries(Object.entries(map).map(([k, t]) => [k, Object.fromEntries(j.langs.filter(l => t[l]).map(l => [l, t[l]]))]));
  await jp({ status: 'done', message: n + ' texts translated', result, finished_at: new Date().toISOString() });
}

/* ---------- Find more: web research for new things to do, markets or events, returned as suggestions ----------
   From the editor's "Find more" button. Claude searches the web around the house (same rules as a build's research,
   plus the curation rule), each place is checked on Google (gone: dropped; its listing, id and hours added), texts are
   translated into the guide's languages, and the result goes back in the job. Nothing is added to the guide here:
   the host keeps or skips each suggestion in the editor, and what they keep goes into their draft. */
const FIND = {
  'find-todo': { file: 'todo', key: 'items', what: 'things to do', rule: 'Find 6 to 10 more things to do within the radius: sights, nature, fun, culture, wine. Same shape as the example: {"items":[...]} with lat, lng, an icon and group as in the example. ' + HOURS_RULE },
  'find-markets': { file: 'markets', key: 'markets', what: 'markets', rule: MARKETS_RULE + ' Find up to 8 that are not in the guide yet.' },
  'find-events': { file: 'events', key: 'items', what: 'events', rule: 'Find 6 to 10 local events within the radius in the next 12 months: festivals, fairs, traditions, music, food. Same shape as the example: {"items":[...]}. "type" is one of: castells, festa, carnival, parade, food, fair, film, music, historical, tradition. Every event MUST have numeric lat and lng (the venue, or the centre of its town), a "url" (its official page) and "sources" (the pages you used). "dates": start and end as YYYY-MM-DD; "status" is "confirmed" only when an official source gives that year\'s dates, otherwise "expected" (worked out from earlier years). Leave out events whose dates have all passed.' }
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
  const out = located(clean(claudeJson(researchPrompt(F.file, A, `${F.rule} ${CURATION} Already in the guide, so never suggest them again: ${known.join('; ') || 'nothing yet'}. ${allowed}`), F.file)));
  const label = it => ({ displayName: { text: it.name_local || nameOf(it.name) } });
  (out[F.key] || []).forEach(normSchedule);
  let items = (out[F.key] || []).filter(it => !have.some(x => sameName(x, label(it)) && (typeof x.lat !== 'number' || hav(x.lat, x.lng, it.lat, it.lng) < 1.5)));
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
  const langs = (site.languages || ['en']).filter(l => l !== 'en' && LANGS.includes(l)), objs = [];
  const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (isI18(x)) objs.push(x); else Object.values(x).forEach(walk); } };
  walk(items);
  const texts = [...new Set(objs.map(o => o.en).filter(Boolean))];
  if (langs.length && texts.length) {
    const tmp = resolve(ROOT, '.job-' + j.id.slice(0, 8) + '.json'), map = {};
    for (let i = 0; i < texts.length; i += 40) {
      await jp({ message: `Translating ${items.length} ${F.what}` });
      translate(texts.slice(i, i + 40), langs, 'en', tmp);
      if (existsSync(tmp)) { try { Object.assign(map, JSON.parse(readFileSync(tmp, 'utf8'))); } catch (e) {} try { rmSync(tmp, { force: true }); } catch (e) {} }
    }
    for (const o of objs) { const t = map[o.en]; if (t) for (const l of langs) if (!o[l] && t[l]) o[l] = t[l]; }
  }
  log(`  found ${items.length} ${F.what}`);
  await jp({ status: 'done', message: items.length ? `${items.length} ${F.what} found` : 'Nothing new found', result: { kind: j.kind, items, categories: out.categories || [] }, finished_at: new Date().toISOString() });
}

async function runJobs() {
  const jobs = await rest('/rest/v1/guide_jobs?select=id,guide_id,kind,langs&status=eq.queued&order=created_at.asc&limit=5');
  for (const j of jobs || []) {
    const jp = b => rest('/rest/v1/guide_jobs?id=eq.' + j.id, { method: 'PATCH', body: b, headers: { Prefer: 'return=minimal' } }).catch(() => {});
    const won = await rest('/rest/v1/guide_jobs?id=eq.' + j.id + '&status=eq.queued', { method: 'PATCH', body: { status: 'running', message: j.kind === 'translate' ? 'Translating' : 'Starting the search' }, headers: { Prefer: 'return=representation' } });
    if (!won || !won[0]) continue;
    log(j.kind === 'translate' ? 'translating' : 'searching', 'job', j.id.slice(0, 8), j.kind === 'translate' ? (j.langs || []).join(',') : j.kind);
    try { if (j.kind === 'translate') await translateJob(j, jp); else if (FIND[j.kind]) await findJob(j, jp); else throw new Error('Unknown job: ' + j.kind); }
    catch (e) { log('  job FAILED:', e.message); await jp({ status: 'failed', message: String(e.message).slice(0, 200), finished_at: new Date().toISOString() }); }
  }
}
async function tick() {
  await runJobs().catch(e => log('jobs:', e.message));
  await recover();
  for (let g; (g = await claim());) {
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
log(`Guide worker on. Database ${URL_}. Publish on build: ${AUTO_PUBLISH}. Research: ${RESEARCH}.`);
if (ONCE) { await tick(); log('done'); }
else for (;;) { try { await tick(); } catch (e) { log('waiting, could not reach the database:', e.message); } await new Promise(r => setTimeout(r, POLL)); }
