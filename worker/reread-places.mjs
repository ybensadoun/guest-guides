#!/usr/bin/env node
// Reading a place's own website again, more often towards its opening (Yohann, 11 Nov 2026: a place closed for the season
// is hidden from guests, "the monthly check will make it surface when we have opening hours, maybe these places can be
// checked more frequently towards the opening. Meaning every week so we catch it"). Every published guide, the places of the
// host's lists (Eat and drink, Nightlife, Things to do) with no hours of ours and not open all day, and the same places in
// its unpublished changes (guides.draft). Only OUR season counts (its own, or the one assumed from its kind, engine/src/
// season.js), never Google's status: Google is not asked here at all.
// When a place is due (readDue): never read, or its last read (filled.readAt) 7 days old while today is between 60 days
// before its season opens and the season's end, else 28 days old (a place with no season: every 28 days).
// A due place is read with the chain of worker/place-facts.mjs (the match, then its own website: the one in the guide, else
// found by a search): hours and season. What is found fills only what the place does not have (readResult), with its source
// in filled.from, so nothing the host typed or changed is ever replaced; "Open all year" (the tag allyear) stops a season.
// What is found is kept in place_facts too (--apply). Claude: the worker's Haiku chain, about 0.02 to 0.06 USD a reading, at
// most REREAD_USD a run (default 1) and within the day's budget (RESEARCH_USD_PER_DAY, the worker's ledger).
// Run weekly by the timer guide-worker-reread (worker/systemd), Mondays at 5:30 Madrid.
//   node worker/reread-places.mjs                  dry run: Claude is asked, the report printed, nothing written to the guides
//   node worker/reread-places.mjs --list           which places are due, nothing asked
//   node worker/reread-places.mjs --apply          write what was found to the guides (and place_facts)
//   node worker/reread-places.mjs --slug <slug>    one guide only (published or not)
// Keys: SUPABASE_SERVICE_KEY and WORKER_ANTHROPIC_KEY in worker/.env.local (git-ignored), or the environment. Safe beside the
// running worker: a guide changed meanwhile is read again and the same results applied again (3 tries).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameOf } from './places.mjs';
import { placeFacts, cleanHours, cleanSeason } from './place-facts.mjs';
import { makeStore, isGid } from './place-store.mjs';
import { seasonOf, seasonKinds, inSeasonOn, nextStart, daysBetween } from '../engine/src/season.js';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const KINDS_FILE = JSON.parse(readFileSync(resolve(ROOT, 'engine/src/kinds.json'), 'utf8'));
export const KINDS = seasonKinds(KINDS_FILE);
// Kinds with no door, so no opening hours to look for (kinds.json "hours": false: beach, town, city), as engine/src/gcard.js.
export const NO_DOOR = new Set(Object.values(KINDS_FILE).filter(l => l && typeof l === 'object').flatMap(l => Object.entries(l)).filter(([, v]) => v && v.hours === false).map(([k]) => k));
// The host's lists, and which kinds each may have (place-facts.mjs).
export const HOST_FILES = { restaurants: 'eat', nightlife: 'eat', todo: 'todo' };
export const WEEKLY_BEFORE_DAYS = 60, WEEKLY = 7, MONTHLY = 28, REREAD_USD = 1;
const day = d => d.toISOString().slice(0, 10);
const asDate = s => /^\d{4}-\d\d-\d\d$/.test(String(s || '')) ? new Date(s + 'T12:00:00') : null;
// No hours of ours: no row of hours with a day, and not open all day.
export const noHours = it => !!it && !it.always && !(it.schedule || []).some(r => r && (r.days || []).length);
// Worth a reading: a place with a door (not a beach, a town, a city) that can be told from another of its name, by its
// Google id or its own website. "Barcelona" typed by a host with no match has neither: a web search for a town's hours
// costs and finds nothing (seen on the first list, 12 Nov 2026: 7 of 25 places due were towns).
export const readable = it => !!it && !NO_DOOR.has(it.icon) && !NO_DOOR.has(it.kind) && !!(it.gid || it.url);

// Whether a place is due today: null when it is not read at all here (it has hours, or is open all day), else { due, every,
// why }. Pure: no network, no clock unless now is left out.
export function readDue(it, { kinds = KINDS, now = new Date() } = {}) {
  if (!noHours(it) || !readable(it)) return null;
  const S = seasonOf({ ...it, schedule: [] }, kinds);
  const n = S ? nextStart(S, now) : null;
  const near = !!S && (inSeasonOn(S, now) || (n && daysBetween(now, n) <= WEEKLY_BEFORE_DAYS));
  const every = near ? WEEKLY : MONTHLY, last = asDate(it.filled && it.filled.readAt);
  if (!last) return { due: true, every, why: 'never read' };
  const age = daysBetween(last, now);
  return { due: age >= every, every, why: `read ${age} days ago, ${near ? 'weekly near its season' : 'every 28 days'}` };
}
// The places of a guide's host lists: [{ file, list, it }].
export function placesOf(files) {
  const out = [];
  for (const [file, list] of Object.entries(HOST_FILES)) for (const it of ((files || {})[file] || {}).items || []) if (it && typeof it === 'object') out.push({ file, list, it });
  return out;
}

// What a reading changes on a place, in place: hours when it has none (a season of its own moves onto the rows that carry
// none, as in the editor when a first row is added), else a season when it has none and is not open all year; the date of
// the reading in filled.readAt, and where what was filled came from in filled.from (the site's page in filled.page).
// res: placeFacts' answer. Returns the names of what was filled ([] when nothing).
export function readResult(it, res, now = new Date()) {
  const got = [], f = { ...(it.filled || {}) }, from = { ...(f.from || {}) }, today = day(now);
  const hours = res ? cleanHours(res.hours) : null, season = res ? cleanSeason(res.season) : null;
  if (hours && noHours(it)) {
    const own = it.season && it.season.from && it.season.to ? it.season : null;
    it.schedule = hours.map(r => r.from || !own ? r : { ...r, from: own.from, to: own.to });
    if (own) { delete it.season; delete from.season; }
    from.schedule = 'site'; got.push('hours');
  } else if (season && noHours(it) && !(it.season && it.season.from) && !(it.tags || []).includes('allyear')) {
    it.season = season; from.season = 'site'; got.push('season');
  }
  f.readAt = today;
  if (got.length) { f.at = today; if (res.page) f.page = res.page; }
  if (Object.keys(from).length) f.from = from; else delete f.from;
  it.filled = f;
  return got;
}

// One place read: the chain, with the place's own website when the guide has one (read first), else found by a search.
export async function readPlace(it, list, ask, { again = null, meter = {}, country = 'Spain' } = {}) {
  const url = typeof it.url === 'string' && /^https?:\/\//i.test(it.url) ? it.url : null;
  const place = { name: String(nameOf(it.name) || '').trim(), town: typeof it.town === 'string' ? it.town : undefined, list, country, ...(url ? { website: url } : {}) };
  return { place, res: await placeFacts(place, [], ask, { meter, again }) };
}
const label = it => nameOf(it.name) || it.id || '?';
const keyOf = it => isGid(it.gid) ? it.gid : `${label(it)}|${it.town || ''}`.toLowerCase();

/* ---------- Every published guide (or --slug): read, written back with --apply ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = { ...process.env };
  const f = resolve(HERE, '.env.local');
  if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, '');
  // An option it does not know stops it before anything is asked: a run with no option reads with Claude (paid), and on
  // 12 Nov 2026 "--help" started one by mistake.
  const KNOWN = new Set(['--list', '--apply', '--slug']), odd = process.argv.slice(2).filter((x, i, all) => x.startsWith('-') ? !KNOWN.has(x) : all[i - 1] !== '--slug');
  if (odd.length) { console.error(`Unknown option: ${odd.join(' ')}\nnode worker/reread-places.mjs [--list] [--apply] [--slug <slug>]   --list asks nothing; no option reads with Claude and writes nothing; --apply writes.`); process.exit(2); }
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const APPLY = process.argv.includes('--apply'), LIST = process.argv.includes('--list'), SLUG = arg('--slug'), LIMIT = +(env.REREAD_USD || REREAD_USD);
  const SB = env.SUPABASE_SERVICE_KEY;
  if (!SB || (!LIST && !env.WORKER_ANTHROPIC_KEY)) { console.error('Missing SUPABASE_SERVICE_KEY or WORKER_ANTHROPIC_KEY (worker/.env.local).'); process.exit(1); }
  const H = { apikey: SB, Authorization: 'Bearer ' + SB, 'Content-Type': 'application/json' };
  const rest = async (path, o = {}) => {
    const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const t = await r.text(); let x = null; try { x = t ? JSON.parse(t) : null; } catch (e) { x = t; }
    if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof x === 'string' ? x : JSON.stringify(x)}`.slice(0, 400));
    return x;
  };
  // The worker's Haiku chain on the worker's ledger (events, kind claude_cost, budget daily): the day's limit counts these too.
  let ask = null, again = null;
  if (!LIST) {
    const { makeClaude } = await import('./claude-api.mjs');
    const ledger = {
      spentToday: async () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); const rows = await rest(`/rest/v1/events?select=usd:data->>usd&kind=eq.claude_cost&data->>budget=eq.daily&created_at=gte.${d.toISOString()}`); return (rows || []).reduce((s, r) => s + (+r.usd || 0), 0); },
      record: (usd, info) => rest('/rest/v1/events', { method: 'POST', body: { kind: 'claude_cost', data: { budget: 'daily', usd: +usd.toFixed(4), ...info, by: 'reread-places' } }, headers: { Prefer: 'return=minimal' } }) };
    const chain = effort => makeClaude({ ...env, RESEARCH_MODEL: 'claude-haiku-5-5', TRANSLATE_MODEL: 'claude-haiku-5-5', RESEARCH_EFFORT: effort, RESEARCH_MAX_SEARCHES: '3' }, () => {}, ledger);
    ask = chain('low'); again = chain('medium');
  }
  const store = makeStore(rest), now = new Date(), meter = { usd: 0 };
  const results = {};   // one reading per place for the whole run (a place in several guides, or read again after a clash)
  let bad = 0, reads = 0, stopped = false;
  const select = 'select=id,slug,status,updated_at,content,draft';
  let guides = [];
  try { guides = await rest(`/rest/v1/guides?${select}&${SLUG ? 'slug=eq.' + encodeURIComponent(SLUG) : 'status=eq.published'}`) || []; } catch (e) { console.error(`Could not read the guides: ${e.message}`); process.exit(1); }
  for (let g of guides) {
    for (let attempt = 1; ; attempt++) {
      if (!g || !g.content || !g.content.files) break;
      const F = g.content.files, D = g.draft && g.draft.content && g.draft.content.files;
      const due = placesOf(F).map(x => ({ ...x, d: readDue(x.it, { now }) })).filter(x => x.d && x.d.due);
      if (attempt === 1) console.log(`\n## ${g.slug} (${g.status}): ${due.length} place(s) due`);
      const lines = [];
      for (const { file, list, it, d } of due) {
        const k = keyOf(it);
        if (LIST) { lines.push(`- due: ${label(it)} (${file}, ${d.why})`); continue; }
        if (!(k in results)) {
          if (meter.usd >= LIMIT) { stopped = true; lines.push(`- not read, this run's limit of ${LIMIT} USD reached: ${label(it)}`); continue; }
          const before = meter.usd;
          try { results[k] = await readPlace(it, list, ask, { again, meter }); reads++; } catch (e) { results[k] = { error: String(e.message || e).slice(0, 160) }; }
          results[k].usd = +(meter.usd - before).toFixed(4);
          if (results[k].res && results[k].res.error) results[k].error = results[k].res.error;   // cut short (the day's limit, the API): not stamped, read next time
          if (APPLY && !results[k].error && isGid(it.gid)) { try { await store.save(it.gid, results[k].place, results[k].res, { now }); } catch (e) { lines.push(`  place_facts not saved for ${label(it)}: ${e.message}`); } }
        }
        const r = results[k];
        if (r.error) { lines.push(`- NOT read: ${label(it)} (${r.error})`); continue; }
        const got = readResult(it, r.res, now);
        // The same place in the unpublished changes, by its id in the same list.
        const twin = D && ((D[file] || {}).items || []).find(x => x && x.id === it.id);
        if (twin && noHours(twin)) readResult(twin, r.res, now);
        const found = got.length ? got.map(x => x === 'hours' ? `hours (${it.schedule.length} lines)` : `season ${it.season.from} to ${it.season.to}`).join(', ') : 'nothing new';
        lines.push(`- ${label(it)} (${file}, ${d.why}): ${found}${r.res.website ? `, from ${r.res.website}` : ''}, about ${(r.usd || 0).toFixed(3)} USD`);
      }
      if (attempt === 1) for (const l of lines) console.log(l);
      if (!APPLY || LIST || !due.length) break;
      const body = { content: g.content, ...(D ? { draft: g.draft } : {}) };
      let saved = [];
      try { saved = await rest(`/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(g.updated_at)}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }) || []; }
      catch (e) { console.log(`  NOT saved: ${e.message}`); bad++; break; }
      if (saved.length) { console.log(`  saved${D ? ' (and into the unpublished changes)' : ''}.`); break; }
      // No row back: the guide changed meanwhile. Read again and apply the same readings again (nothing asked twice).
      if (attempt >= 3) { console.log('  NOT saved: the guide kept changing, run again.'); bad++; break; }
      try { g = (await rest(`/rest/v1/guides?${select}&id=eq.${g.id}`) || [])[0]; } catch (e) { console.log(`  NOT saved, could not read it again: ${e.message}`); bad++; break; }
    }
  }
  console.log(`\n${guides.length} guide(s), ${reads} reading(s), about ${meter.usd.toFixed(2)} USD${stopped ? ` (stopped at this run's limit, REREAD_USD=${LIMIT})` : ''}${APPLY ? '' : LIST ? ' (list only: nothing asked, nothing written)' : ' (dry run: nothing written to the guides, add --apply)'}.`);
  process.exit(bad ? 1 : 0);
}
