#!/usr/bin/env node
// One-off: each existing guide brought in line with Google's terms, once (the places work, step 6b: docs/plan-ca-la-kimberly-
// through-the-maker.md, "Step 6, the design"; Yohann, 12 Nov 2026). Google lets us keep a place's id for good and its position
// for 30 days (renewed by worker/renew-positions.mjs), nothing else; the old monthly check and older builds copied more into
// the guides. This takes out what was copied from Google and is not ours to keep, in every published guide and in its
// unpublished changes (guides.draft), and prints every change by our names first:
//  - hours marked hoursSource: 'google' (the schedule rows and the mark): the place then shows Google's live line when a
//    guest opens it (engine/src/gcard.js); a Home tile pinned from it that holds the same rows loses them too. Hours with no
//    such mark stay (the host's, a website's, a hand-made guide's).
//  - a place's rating (and Google's count of reviews, _card, _google). The house's own listing rating (house-page.json,
//    reviews.json) is the listing's, not Google's, and stays: those files are not looked at.
//  - Google's own address for a place (a cid= or a /maps/place/ link, which holds Google's position) when the place has a
//    Google id: rebuilt from the id in the product's form (worker/research-check.mjs, mapsLink; the engine's gSearch builds
//    the same from the id whatever the data holds). A link on a place with no id (the host's, a hand-made guide's) stays.
//  - checked, the day Google was asked (the monthly check no longer asks Google: worker/check-guides.mjs).
// Left as they are, counted: the flag "check" (whether Google or a person set it cannot be told), Google's own links on places
// with no id. Read only, counted: the _google notes inside stored job results (research, Find more), which are not in guides.
// No Google call, no Claude call.
//   node worker/clean-google.mjs                  dry run: every change it would make, nothing written
//   node worker/clean-google.mjs --apply          write the cleaned guides
//   node worker/clean-google.mjs --slug <slug>    one guide only (published or not)
// Keys: SUPABASE_SERVICE_KEY in worker/.env.local (git-ignored), or the environment. Safe beside the running worker: a guide
// changed meanwhile is read again and cleaned again (3 tries).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameOf } from './places.mjs';
import { isGid } from './place-store.mjs';
import { mapsLink } from './research-check.mjs';
import { listsOf } from './renew-positions.mjs';

// The house's own listing (its rating and reviews are the listing's) is never looked at.
const SKIP = new Set(['house', 'house-page', 'reviews']);
// Google's own address for a place: its share link (?cid=) or its place page (/maps/place/..., with Google's position in it).
export const googleOwn = u => typeof u === 'string' && (/[?&]cid=\d+/.test(u) || /\/maps\/place\//.test(u));
const label = it => it.name_local || nameOf(it.name) || nameOf(it.title) || it.id || '?';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The clean-up, pure: content is a guide's content ({ files, ... }) and is not changed; returns { content, changes, kept }.
// changes: [{ file, id, name, what: [...] }], one per place changed, what in plain words. kept: { check, links } (places
// with the flag "check"; Google's own links on places with no id), left as they are.
export function cleanGuide(content) {
  const c = JSON.parse(JSON.stringify(content || {})), files = c.files || {}, changes = [], kept = { check: 0, links: 0 };
  const lists = listsOf(files).filter(([file]) => !SKIP.has(file));
  // Google's hours by place id, before they go: a Home tile pinned from such a place (from: its id) may hold a copy.
  const theirs = new Map();
  for (const [, , list] of lists) for (const it of list) if (it && it.hoursSource === 'google' && it.id) theirs.set(it.id, it.schedule);
  for (const [file, , list] of lists) for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    const what = [];
    if (it.hoursSource === 'google') { const n = (it.schedule || []).length; delete it.schedule; delete it.hoursSource; what.push(`Google's hours out${n ? ` (${n} line${n > 1 ? 's' : ''})` : ''}`); }
    else if (it.from && theirs.has(it.from) && it.schedule && same(it.schedule, theirs.get(it.from))) { delete it.schedule; what.push(`Google's hours out (a copy of ${it.from}'s)`); }
    if ('rating' in it) { delete it.rating; what.push('rating out'); }
    for (const k of ['reviews', 'userRatingCount']) if (typeof it[k] === 'number') { delete it[k]; what.push(`${k} out`); }
    for (const k of ['_card', '_google']) if (k in it) { delete it[k]; what.push(`${k} out`); }
    if (googleOwn(it.gmaps)) {
      if (isGid(it.gid)) { it.gmaps = mapsLink(label(it) !== it.id ? label(it) : typeof it.lat === 'number' ? `${it.lat},${it.lng}` : '', it.gid); what.push("Google's link rebuilt from its id"); }
      else kept.links++;
    }
    if ('checked' in it) { delete it.checked; what.push('check date out'); }
    if ((it.flags || []).includes('check')) kept.check++;
    if (what.length) changes.push({ file, id: it.id || null, name: label(it), what });
  }
  return { content: c, changes, kept };
}
// The _google notes in a stored job result (any depth): how many items carry one. Read only.
export const googleNotes = x => !x || typeof x !== 'object' ? 0 : (Array.isArray(x) ? x : Object.values(x)).reduce((n, v) => n + googleNotes(v), '_google' in x && !Array.isArray(x) ? 1 : 0);

/* ---------- Every published guide (or --slug): cleaned, written back with --apply ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HERE = dirname(fileURLToPath(import.meta.url));
  // An option it does not know stops it before anything is read or written.
  const KNOWN = new Set(['--apply', '--slug']), odd = process.argv.slice(2).filter((x, i, all) => x.startsWith('-') ? !KNOWN.has(x) : all[i - 1] !== '--slug');
  if (odd.length) { console.error(`Unknown option: ${odd.join(' ')}\nnode worker/clean-google.mjs [--apply] [--slug <slug>]   no option prints what would change and writes nothing; --apply writes.`); process.exit(2); }
  const env = { ...process.env };
  const f = resolve(HERE, '.env.local');
  if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), SB = env.SUPABASE_SERVICE_KEY;
  if (!SB) { console.error('Missing SUPABASE_SERVICE_KEY (worker/.env.local).'); process.exit(1); }
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const APPLY = process.argv.includes('--apply'), SLUG = arg('--slug');
  if (process.argv.includes('--slug') && !SLUG) { console.error('--slug takes a guide\'s slug.'); process.exit(2); }
  const H = { apikey: SB, Authorization: 'Bearer ' + SB, 'Content-Type': 'application/json' };
  const rest = async (path, o = {}) => {
    const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const t = await r.text(); let x = null; try { x = t ? JSON.parse(t) : null; } catch (e) { x = t; }
    if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof x === 'string' ? x : JSON.stringify(x)}`.slice(0, 400));
    return x;
  };
  const select = 'select=id,slug,status,updated_at,content,draft';
  let guides = [];
  try { guides = await rest(`/rest/v1/guides?${select}&${SLUG ? 'slug=eq.' + encodeURIComponent(SLUG) : 'status=eq.published'}`) || []; } catch (e) { console.error(`Could not read the guides: ${e.message}`); process.exit(1); }
  const total = {}, kept = { check: 0, links: 0 }; let bad = 0, places = 0;
  for (let g of guides) {
    for (let attempt = 1; ; attempt++) {
      if (!g || !g.content || !g.content.files) break;
      const live = cleanGuide(g.content), D = g.draft && g.draft.content ? cleanGuide(g.draft.content) : null;
      if (attempt === 1) {
        console.log(`\n## ${g.slug} (${g.status}): ${live.changes.length} place(s) to change${D ? `, ${D.changes.length} in the unpublished changes` : ''}`);
        for (const x of live.changes) { console.log(`- ${x.name} (${x.file}): ${x.what.join(', ')}`); for (const w of x.what) { const k = w.replace(/ \(.*\)$/, ''); total[k] = (total[k] || 0) + 1; } }
        if (D) for (const x of D.changes) console.log(`- in the unpublished changes: ${x.name} (${x.file}): ${x.what.join(', ')}`);
        if (live.kept.check) console.log(`- left as they are: ${live.kept.check} place(s) with the flag "check" (Google or a person: cannot be told)`);
        if (live.kept.links) console.log(`- left as they are: ${live.kept.links} Google Maps link(s) of Google's own form on places with no Google id`);
        places += live.changes.length; kept.check += live.kept.check; kept.links += live.kept.links;
      }
      if (!APPLY || !(live.changes.length || (D && D.changes.length))) break;
      const body = { content: live.content, ...(D ? { draft: { ...g.draft, content: D.content } } : {}) };
      let saved = [];
      try { saved = await rest(`/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(g.updated_at)}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }) || []; }
      catch (e) { console.log(`  NOT saved: ${e.message}`); bad++; break; }
      if (saved.length) { console.log(`  saved${D ? ' (and the unpublished changes)' : ''}.`); break; }
      // No row back: the guide changed meanwhile (the date did not match). Read again and clean again.
      if (attempt >= 3) { console.log('  NOT saved: the guide kept changing, run again.'); bad++; break; }
      try { g = (await rest(`/rest/v1/guides?${select}&id=eq.${g.id}`) || [])[0]; } catch (e) { console.log(`  NOT saved, could not read it again: ${e.message}`); bad++; break; }
    }
  }
  // The _google notes in stored job results (research, Find more): not in guides, counted only.
  let notes = null;
  try {
    const ids = guides.map(g => g.id).filter(Boolean);
    const jobs = ids.length ? await rest(`/rest/v1/guide_jobs?select=id,kind,result&kind=in.(research,find-todo,find-markets)&guide_id=in.(${ids.join(',')})`) || [] : [];
    notes = { jobs: jobs.filter(j => googleNotes(j.result)).length, items: jobs.reduce((n, j) => n + googleNotes(j.result), 0) };
  } catch (e) { console.log(`\nThe job results were not read: ${e.message}`); }
  console.log(`\n${guides.length} guide(s), ${places} place(s) to change in the published guides: ${Object.entries(total).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing'}.`);
  console.log(`Left as they are: ${kept.check} flag(s) "check", ${kept.links} Google link(s) on places with no id.${notes ? ` Read only: ${notes.items} _google note(s) in ${notes.jobs} stored job result(s) of these guides.` : ''}`);
  console.log(APPLY ? `Written${bad ? `, ${bad} guide(s) NOT saved` : ''}.` : 'Dry run: nothing written, add --apply.');
  process.exit(bad ? 1 : 0);
}
