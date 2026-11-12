#!/usr/bin/env node
// The monthly check of every published guide, with our own sources only (the places work, step 6a: docs/plan-ca-la-kimberly-
// through-the-maker.md, "Step 6, the design"; Yohann, 12 Nov 2026: "why not go for the real thing"). Google's policy (read
// 11 Nov 2026): no pre-fetching or storing of its content, no content created from it, the place id kept "to fetch fresh
// details when a user interacts with a place". So Google is not asked here at all: whether a place is open or closed,
// Google says only live, to a guest who opens the place (engine/src/gcard.js). Claude is not asked either.
// Two signals of ours, for every place of the host's lists (Eat and drink, Nightlife, Things to do) and the markets, in the
// guide and in its unpublished changes (guides.draft):
//  - site: its own website (url; Facebook, Instagram and other directories are not looked at, they answer whether or not the
//    place exists) no longer answers. Opened by our guarded fetch (worker/place-facts.mjs, openPublic: public addresses only),
//    its page and, when the page is not there, the root of its site; the whole look again some minutes later. Only a name
//    that no longer resolves, a refused connection, or 404/410 at the root, both times, counts; any other answer (403, a bot
//    wall, a 5xx, a sign-in page) says the site is there, and a slow or odd answer says nothing.
//  - directory: our open directory (Overture, worker/overture.py, its release of the moment, read around the house as the
//    build reads it) marks the place permanently closed, or the record our chain matched to it (place_facts.overture_id)
//    is no longer near it. A place we never matched to a record is looked for by its name; not found, nothing is said.
// Markets: the website only (a market's own site: a page on a town hall's site says nothing, its root never goes). Not the
// directory: a weekly market is no business record, and a name match among the stalls and shops around it would be a guess
// (worker/research-check.mjs never sends markets through the chain either). A beach, a town or a city: the website only.
// What it does with a signal: never removes a place, never changes what guests see (the engine ignores the note). It keeps
// a note of ours on the place for the host, look: { at: 'YYYY-MM-DD', why: ['site'] | ['directory'] | both, ok? } (lookOf),
// and writes a line in the report. The note goes as soon as no signal is left. ok is the host's "I looked" (the maker's
// editor, under "Needs you", later): kept while the reasons stay those the host saw, dropped when a new one comes.
// No date of its own on each place: the check is free, so every place is looked at every run. The old "checked" was the
// day Google was asked; it is no longer written, and worker/clean-google.mjs takes it out of today's guides.
// Run on the 1st of each month by worker/monthly.mjs (with --apply).
//   node worker/check-guides.mjs                  dry run: websites opened and the directory read (free), nothing written
//   node worker/check-guides.mjs --apply          write the notes to the guides
//   node worker/check-guides.mjs --slug <slug>    one guide only (published or not)
// Settings: SUPABASE_SERVICE_KEY in worker/.env.local (git-ignored), or the environment; OVERTURE_PYTHON as for
// worker/place-facts.mjs (without it, or offline, no directory signal this run, said in the report); CHECK_SECOND_LOOK_MS
// (default 120000) between the two looks at a site. Safe beside the running worker: a guide changed meanwhile is read again
// and the same answers applied again (3 tries).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameOf } from './places.mjs';
import { openPublic, NET, webUrl, denied, nearby } from './place-facts.mjs';
import { sameNamed } from './host-places.mjs';
import { makeStore, isGid } from './place-store.mjs';
import { NO_DOOR } from './reread-places.mjs';

export const WHY = ['site', 'directory'];
export const SITE_MS = 10000, SECOND_LOOK_MS = 120000, SUSPECT_MIN = 4;
const GONE = new Set([404, 410]);
const day = d => d.toISOString().slice(0, 10);
const num = v => typeof v === 'number' && Number.isFinite(v);
const label = it => it.name_local || nameOf(it.name) || nameOf(it.title) || it.id || '?';

// The places looked at, [{ file, key, it, door }]: the host's lists and the markets (the places waiting for a name are
// never shown and are left out). door: a place our open directory may list (not a market, a beach, a town or a city).
export const LISTS = [['restaurants', 'items'], ['nightlife', 'items'], ['todo', 'items'], ['markets', 'markets']];
export function placesOf(files) {
  const out = [];
  for (const [file, key] of LISTS) for (const it of ((files || {})[file] || {})[key] || [])
    if (it && typeof it === 'object') out.push({ file, key, it, door: file !== 'markets' && !NO_DOOR.has(it.icon) && !NO_DOOR.has(it.kind) });
  return out;
}
// The website to look at: the place's own, an http(s) address that is not a directory, a map or a social site.
export const siteOf = it => { const u = it && typeof it.url === 'string' && /^https?:\/\//i.test(it.url.trim()) ? webUrl(it.url.trim()) : null; return u && !denied(u) ? u : null; };

// One address knocked on: 'up' (any answer but 404 or 410: a 403, a bot wall, a 5xx, a sign-in page all say the site is
// there), 'gone' (404 or 410, a name that does not exist, a refused connection) or 'unknown' (too slow, a broken
// certificate, a private address, too many redirects, a name server that did not answer: nothing to say).
// open (tests): in place of openPublic.
const NO_NAME = new Set(['ENOTFOUND', 'ENODATA']);   // the name does not exist (any more); EAI_AGAIN and the like are a hiccup
const codeOf = e => { let x = e; for (let i = 0; x && i < 5; i++) { if (x.name === 'TimeoutError' || x.name === 'AbortError') return 'timeout'; if (x.code) return String(x.code); x = x.cause || (Array.isArray(x.errors) ? x.errors[0] : null); } return 'error'; };
export async function knock(u, { ms = SITE_MS, open = openPublic } = {}) {
  let r;
  try { r = await open(u, 4, ms); }
  catch (e) { const c = codeOf(e); return c === 'ECONNREFUSED' ? { state: 'gone', why: 'connection refused' } : NO_NAME.has(c) ? { state: 'gone', why: 'its address no longer exists' } : { state: 'unknown', why: c === 'timeout' ? 'too slow' : c }; }
  if (r) return GONE.has(r.status) ? { state: 'gone', why: `${r.status}` } : { state: 'up', why: `${r.status}` };
  // null: not a public address (a name that does not resolve is one), or too many redirects. Told apart by its name.
  try { await NET.lookup(new URL(u).hostname); }
  catch (e) { const c = codeOf(e); return NO_NAME.has(c) ? { state: 'gone', why: 'its address no longer exists' } : { state: 'unknown', why: 'name server: ' + c }; }
  return { state: 'unknown', why: 'not a public address, or too many redirects' };
}
// A place's website looked at once: its page, then, when the page is not there, the root of its site (a page moved or
// renamed says nothing about the place). The root's answer decides.
export async function lookSite(url, o = {}) {
  const a = await knock(url, o), root = new URL(url).origin + '/';
  if (a.state === 'up' || root === url) return a;
  const b = await knock(root, o);
  return b.state === 'up' ? { state: 'up', why: `the page ${a.why}, the site ${b.why}` } : { ...b, why: `${b.why} at the root` };
}
// Two looks some minutes apart: "no longer answers" only when both say gone; any answer says it is there.
export function siteVerdict(looks) {
  const L = (looks || []).filter(Boolean), up = L.find(x => x.state === 'up');
  if (up) return { state: 'up', why: up.why };
  if (L.length >= 2 && L.every(x => x.state === 'gone')) return { state: 'gone', why: L[L.length - 1].why };
  return { state: 'unknown', why: (L[L.length - 1] || {}).why || 'not looked at' };
}
// Many sites gone at once is our own network or name server, not the places: then no site signal is believed this run.
export const suspect = verdicts => { const v = Object.values(verdicts || {}), g = v.filter(x => x && x.state === 'gone').length; return g >= SUSPECT_MIN && g * 2 >= v.length; };

// What our open directory says of a place: state true (marked permanently closed, or the record we matched is no longer
// near it), false (its record is there; "temporarily closed" is most often the season, which engine/src/season.js handles),
// null (nothing to say: the directory was not read for this pin, or the place never had a record and none of its name is
// near). row: its place_facts row (overture_id: the record the chain matched); cands: Overture's records near its pin
// (nearby()); names: our names for it. Pure.
export function directoryVerdict({ row = null, cands = [], looked = false, names = [] } = {}) {
  if (!looked) return { state: null, why: 'not read' };
  const known = (row && row.overture_id) || null, C = Array.isArray(cands) ? cands : [];
  let rec = known ? C.find(c => c && c.id === known) || null : null;
  if (!rec) for (const n of names) if (n && (rec = sameNamed(n, C))) break;   // the id may change between releases
  if (rec) {
    const s = String(rec.status || 'open');
    if (s === 'permanently_closed') return { state: true, why: `marked permanently closed (its record "${rec.name}")` };
    return { state: false, why: s === 'temporarily_closed' ? 'marked temporarily closed (often the season: no note)' : 'listed' };
  }
  return known ? { state: true, why: 'the record we matched is no longer near it' } : { state: null, why: 'never in the directory' };
}

// The note on a place, look: { at, why, ok? }. signals: { site, directory }, each true (a signal), false (none) or null
// (nothing known this run: the old reason stays as it was). No reason left: no note (null). Reasons the host already saw
// keep the note's date and ok; a new reason starts a new note, for the host to see. Pure.
export function lookOf(old, signals, today) {
  const was = old && Array.isArray(old.why) ? old.why.filter(w => WHY.includes(w)) : [];
  const why = WHY.filter(w => signals[w] === true || (signals[w] == null && was.includes(w)));
  if (!why.length) return null;
  if (was.length && why.every(w => was.includes(w))) return { at: /^\d{4}-\d\d-\d\d$/.test(old.at || '') ? old.at : today, why, ...(old.ok ? { ok: old.ok } : {}) };
  return { at: today, why };
}

// The check itself, pure: no network, no clock unless now is left out. files: a guide's files (changed in place). sites:
// url -> siteVerdict's answer (missing: not looked at, nothing said); dir(file, it): directoryVerdict's answer for a place
// with a door; distrust: the run's websites are not believed (suspect()). Returns one entry a place: { name, file, it, url,
// site, directory, look, change } (change: 'new', 'changed', 'cleared' or null).
export function checkFiles(files, { sites = {}, dir = () => null, distrust = false, now = new Date() } = {}) {
  const today = day(now), out = [];
  for (const { file, it, door } of placesOf(files)) {
    const url = siteOf(it), s = url ? sites[url] || null : null, d = door ? dir(file, it) || null : null;
    const signals = { site: !url ? false : !s || distrust || s.state === 'unknown' ? null : s.state === 'gone',
      directory: !door ? false : d ? d.state : null };
    const was = it.look ? JSON.stringify(it.look) : null, look = lookOf(it.look, signals, today);
    if (look) it.look = look; else delete it.look;
    const is = look ? JSON.stringify(look) : null;
    out.push({ name: label(it), file, it, url, site: s, directory: d, look, change: was === is ? null : !was ? 'new' : !look ? 'cleared' : 'changed' });
  }
  return out;
}
// The report's lines for a guide, by our names only (the host's, or our directory's record): [lines, for a human].
export function reportOf(results) {
  const lines = []; let humans = 0;
  for (const r of results) {
    const what = [r.look && r.look.why.includes('site') ? `its website no longer answers (${r.site && r.site.state === 'gone' ? r.site.why + ', twice' : 'as before'})` : null,
      r.look && r.look.why.includes('directory') ? `our open directory: ${r.directory && r.directory.state === true ? r.directory.why : 'as before'}` : null].filter(Boolean).join('; ');
    if (r.look && !r.look.ok) { humans++; lines.push(`- for the host${r.change === 'new' ? ', new' : ''}: ${r.name} (${r.file}): ${what}`); }
    else if (r.look) lines.push(`- looked at by the host on ${r.look.ok}, still: ${r.name} (${r.file}): ${what}`);
    else if (r.change === 'cleared') lines.push(`- note taken off, no signal left: ${r.name} (${r.file})`);
  }
  return [lines, humans];
}

// A few at a time: each site waits up to SITE_MS.
async function each(list, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; await f(list[k], k); } }));
}

/* ---------- Every published guide (or --slug): looked at, notes written back with --apply ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HERE = dirname(fileURLToPath(import.meta.url));
  // An option it does not know stops it before anything is opened (on 12 Nov 2026 "--help" started a paid run of another job).
  const KNOWN = new Set(['--apply', '--slug']), odd = process.argv.slice(2).filter((x, i, all) => x.startsWith('-') ? !KNOWN.has(x) : all[i - 1] !== '--slug');
  if (odd.length) { console.error(`Unknown option: ${odd.join(' ')}\nnode worker/check-guides.mjs [--apply] [--slug <slug>]   no option opens websites and reads the directory (free) and writes nothing; --apply writes the notes.`); process.exit(2); }
  const env = { ...process.env };
  const f = resolve(HERE, '.env.local');
  if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), SB = env.SUPABASE_SERVICE_KEY;
  if (!SB) { console.error('Missing SUPABASE_SERVICE_KEY (worker/.env.local).'); process.exit(1); }
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const APPLY = process.argv.includes('--apply'), SLUG = arg('--slug'), WAIT = Math.max(0, +(env.CHECK_SECOND_LOOK_MS || SECOND_LOOK_MS) || 0);
  if (process.argv.includes('--slug') && !SLUG) { console.error('--slug takes a guide\'s slug.'); process.exit(2); }
  const H = { apikey: SB, Authorization: 'Bearer ' + SB, 'Content-Type': 'application/json' };
  const rest = async (path, o = {}) => {
    const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const t = await r.text(); let x = null; try { x = t ? JSON.parse(t) : null; } catch (e) { x = t; }
    if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof x === 'string' ? x : JSON.stringify(x)}`.slice(0, 400));
    return x;
  };
  const store = makeStore(rest), now = new Date(), python = env.OVERTURE_PYTHON || 'python3';
  const select = 'select=id,slug,status,updated_at,content,draft';
  let guides = [];
  try { guides = await rest(`/rest/v1/guides?${select}&${SLUG ? 'slug=eq.' + encodeURIComponent(SLUG) : 'status=eq.published'}`) || []; } catch (e) { console.error(`Could not read the guides: ${e.message}`); process.exit(1); }
  const filesOf = g => [g && g.content && g.content.files, g && g.draft && g.draft.content && g.draft.content.files].filter(Boolean);

  // 1. Every website of the run, once (a place in several guides, or in a guide and its draft): a first look, then a second
  // look, some minutes later, at those that seemed gone.
  const urls = [...new Set(guides.flatMap(g => filesOf(g).flatMap(F => placesOf(F).map(x => siteOf(x.it)).filter(Boolean))))];
  const first = {}, second = {};
  await each(urls, 4, async u => { first[u] = await lookSite(u); });
  const again = urls.filter(u => first[u].state === 'gone');
  if (again.length) { console.log(`${again.length} website(s) seemed gone, looked at again in ${Math.round(WAIT / 1000)} s.`); await new Promise(r => setTimeout(r, WAIT)); await each(again, 4, async u => { second[u] = await lookSite(u); }); }
  const sites = Object.fromEntries(urls.map(u => [u, siteVerdict([first[u], second[u]])]));
  const distrust = suspect(sites);
  if (distrust) console.log(`Too many websites gone at once (${Object.values(sites).filter(s => s.state === 'gone').length} of ${urls.length}): our own network is suspect, no website signal is believed this run.`);

  // 2. Per guide: the directory around its house, then the check, written back with --apply.
  let bad = 0, release = null, notRead = 0;
  for (let g of guides) {
    if (!g || !g.content || !g.content.files) continue;
    // The pins: a place with a door and a position, at its record's own position when our chain matched one (that is where
    // the record was), keyed by its Google id, else by its list and id.
    const key = (file, it) => isGid(it.gid) ? it.gid : `${file}:${it.id}`;
    const doors = filesOf(g).flatMap(F => placesOf(F).filter(x => x.door && !x.it.nomap && num(x.it.lat) && num(x.it.lng)));
    let rows = {};
    const gids = [...new Set(doors.map(x => x.it.gid).filter(isGid))];
    if (gids.length) { try { rows = await store.get(gids); } catch (e) { console.error(`place_facts not read (${g.slug}): ${e.message}`); } }
    const namesOf = (it, row) => [...new Set([it.name_local, ...(it.name && typeof it.name === 'object' ? Object.values(it.name) : [it.name]), row && row.facts && row.facts.name].filter(n => typeof n === 'string' && n.trim()))];
    const pins = new Map();
    for (const { file, it } of doors) {
      const k = key(file, it), row = isGid(it.gid) ? rows[it.gid] || null : null, ff = row && row.facts, own = ff && num(ff.lat) && num(ff.lng) && row.sources && row.sources.lat && row.sources.lat.from === 'overture';
      const p = pins.get(k) || { id: k, lat: own ? ff.lat : it.lat, lng: own ? ff.lng : it.lng, names: [] };
      for (const n of namesOf(it, row)) if (!p.names.includes(n)) p.names.push(n);
      pins.set(k, p);
    }
    const house = g.content.files.house || {};
    let ov = { release: null, pins: {}, looked: null };
    if (pins.size && num(house.lat) && num(house.lng)) ov = await nearby(house, [...pins.values()], { python, log: m => console.error(`${g.slug}: ${m}`) });
    const looked = new Set(ov.release && Array.isArray(ov.looked) ? ov.looked : []);
    if (ov.release) release = ov.release; else if (pins.size) notRead++;
    const dir = (file, it) => { const k = key(file, it), row = isGid(it.gid) ? rows[it.gid] || null : null;
      return directoryVerdict({ row, cands: ov.pins[k] || [], looked: looked.has(k), names: namesOf(it, row) }); };

    for (let attempt = 1; ; attempt++) {
      const F = g.content.files, D = g.draft && g.draft.content && g.draft.content.files;
      const live = checkFiles(F, { sites, dir, distrust, now }), draft = D ? checkFiles(D, { sites, dir, distrust, now }) : [];
      const changed = [...live, ...draft].some(r => r.change);
      if (attempt === 1) {
        const [lines, humans] = reportOf(live), opened = new Set(live.map(r => r.url).filter(Boolean)).size;
        const unsure = live.filter(r => r.url && (!r.site || r.site.state === 'unknown')).length;
        console.log(`\n## ${g.slug} (${g.status}): ${live.length} place(s), ${opened} website(s), ${humans} for a human`);
        for (const l of lines) console.log(l);
        if (unsure) console.log(`- ${unsure} website(s) could not be told this run (too slow, an odd answer): nothing changed for them`);
        if (pins.size && !ov.release) console.log('- our open directory was not read (Python, Overture or the network): no directory signal this run');
        const dd = draft.filter(r => r.change).length;
        if (dd) console.log(`- in the unpublished changes: ${dd} note(s) set or taken off`);
      }
      if (!APPLY || !changed) break;
      const body = { content: g.content, ...(D ? { draft: g.draft } : {}) };
      let saved = [];
      try { saved = await rest(`/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(g.updated_at)}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }) || []; }
      catch (e) { console.log(`  NOT saved: ${e.message}`); bad++; break; }
      if (saved.length) { console.log(`  saved${D ? ' (and into the unpublished changes)' : ''}.`); break; }
      // No row back: the guide changed meanwhile (the date did not match). Read again and check again, with the same answers.
      if (attempt >= 3) { console.log('  NOT saved: the guide kept changing, run again.'); bad++; break; }
      try { g = (await rest(`/rest/v1/guides?${select}&id=eq.${g.id}`) || [])[0]; } catch (e) { console.log(`  NOT saved, could not read it again: ${e.message}`); bad++; break; }
      if (!g || !g.content || !g.content.files) break;
    }
  }
  console.log(`\n${guides.length} guide(s), ${urls.length} website(s) opened in all, open directory ${release ? 'release ' + release : 'not read'}${notRead && release ? ` (not read for ${notRead} guide(s))` : ''}; Google and Claude not asked${APPLY ? '' : ' (dry run: nothing written, add --apply)'}.`);
  process.exit(bad ? 1 : 0);
}
