#!/usr/bin/env node
// Renewing the positions Google gave (the places work, step 3d: docs/plan-ca-la-kimberly-through-the-maker.md, "Step 3, the
// design"). Google's terms let us keep a place's position for 30 days in a row, and the guide must stay stable: so a place
// whose position is Google's (pos: { from: 'google', at }) takes ours as soon as our own table place_facts holds one
// (Overture's or GeoNames', kept for good: it loses pos), else Google is asked again by its id and the date starts again.
// Every published guide, its items, stations and home tiles, and the same places in its unpublished changes (guides.draft),
// so publishing them later does not bring an old date back. An id Google no longer knows, or a failure, is left as it is and
// listed: past 30 days the guide's engine shows the place with no pin (engine/src/content.js, posExpired). No Claude call.
// The house's own point too, when it is Google's position of its town (the listing gave none, and the build found no town
// of that name in GeoNames: content/house.json carries pos): GeoNames again first, else Google's text search of the town
// (there is no id for it). A failure is listed, never fatal: the engine does not drop the house's point.
// Run weekly by the timer guide-worker-renew (worker/systemd): a position may be kept 30 days in a row and a month can be 31.
//   node worker/renew-positions.mjs                  dry run: Google is asked, the report printed, nothing written
//   node worker/renew-positions.mjs --apply          write the new positions to the guides
//   node worker/renew-positions.mjs --slug <slug>    one guide only (published or not)
//   node worker/renew-positions.mjs --days 20        renew positions more than this many days old (default 20)
// Keys: SUPABASE_SERVICE_KEY in worker/.env.local, GOOGLE_PLACES_KEY in Guest Guides/.env (both git-ignored), or the
// environment. Safe beside the running worker: a guide changed meanwhile is read again and renewed again (3 tries).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hav, nameOf, locateById, get } from './places.mjs';
import { makeStore, isGid } from './place-store.mjs';
import { townPoint } from './place-facts.mjs';

export const RENEW_DAYS = 20;
const num = v => typeof v === 'number' && Number.isFinite(v);
const day = d => d.toISOString().slice(0, 10);
// Days since a pos.at date (YYYY-MM-DD), by the calendar; no readable date counts as due.
const age = (at, now) => /^\d{4}-\d{2}-\d{2}$/.test(String(at || '')) ? Math.round((Date.parse(day(now)) - Date.parse(at)) / 864e5) : Infinity;
// The distance as the build and the maker write it (worker/host-places.mjs, /api/places): by road, about 1.3 times the line.
const kmTo = (house, lat, lng) => Math.max(1, Math.round(hav(house.lat, house.lng, lat, lng) * 1.3));

// Every list of places a guide's files hold: items (places to eat, things to do, nightlife, home tiles...), stations
// (Getting around), markets. [file, key, list].
export function listsOf(files) {
  const out = [];
  for (const [file, F] of Object.entries(files || {})) if (F && typeof F === 'object') for (const key of ['items', 'stations', 'markets']) if (Array.isArray(F[key])) out.push([file, key, F[key]]);
  return out;
}
// A place's Google id: its own, or for a home tile pinned from a place (from: that place's id), the place's.
export function gidOf(files, it) {
  if (isGid(it && it.gid)) return it.gid;
  if (!it || !it.from) return null;
  for (const [, , list] of listsOf(files)) for (const x of list) if (x && x !== it && x.id === it.from && isGid(x.gid)) return x.gid;
  return null;
}
const due = (it, days, now) => !!(it && it.pos && it.pos.from === 'google' && age(it.pos.at, now) > days);
// The places due in a guide's files: [{ file, key, it, gid }] (gid null: no Google id to renew it by).
export function dueOf(files, { days = RENEW_DAYS, now = new Date() } = {}) {
  const out = [];
  for (const [file, key, list] of listsOf(files)) for (const it of list) if (due(it, days, now)) out.push({ file, key, it, gid: gidOf(files, it) });
  return out;
}
const label = it => nameOf(it.name) || nameOf(it.title) || it.id || '?';
// The house's point is due when it is Google's (content/house.json pos) and older than the days.
export const houseDue = (files, { days = RENEW_DAYS, now = new Date() } = {}) => due(files && files.house, days, now);
// Google's position of a town, by a text search near the house's present point (no id: a town is not a place we keep the id
// of). Only the position is asked; an answer more than 30 km away is another town of that name. { lat, lng } or null.
export async function locateTown(GK, town, at) {
  const body = { textQuery: String(town).slice(0, 160), maxResultCount: 1, locationBias: { circle: { center: { latitude: at.lat, longitude: at.lng }, radius: 20000 } } };
  const r = await get('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'X-Goog-Api-Key': GK, 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.location' }, body: JSON.stringify(body) });
  const d = await r.json(); if (d.error) throw new Error(d.error.message);
  const l = ((d.places || [])[0] || {}).location;
  return l && num(l.latitude) && num(l.longitude) && hav(at.lat, at.lng, l.latitude, l.longitude) <= 30 ? { lat: l.latitude, lng: l.longitude } : null;
}

// The renewal itself, pure: no network, no clock unless now is left out. files: a guide's files (changed in place).
// rows: gid -> its row in place_facts (or missing). located: gid -> Google's answer by id, { gid, lat, lng }, or null (Google
// does not know it), or { error }; a gid not in located was not asked and its places are left alone, unreported.
// house: { lat, lng } for the distances. home: the answers for the house's own point when it is due, { ours: GeoNames'
// { lat, lng } or null, google: Google's { lat, lng }, null (not found) or { error } }; left out, the house is left alone.
// Returns { renewed: [names], ours: [names], failed: [{ name, why }] }, the house named "the house".
export function renewFiles(files, { rows = {}, located = {}, house = null, home = null, days = RENEW_DAYS, now = new Date() } = {}) {
  const out = { renewed: [], ours: [], failed: [] };
  // The house first: ours (GeoNames' town) for good, else Google's again with today's date; a failure leaves it as it is.
  const H = files && files.house;
  if (home && houseDue(files, { days, now })) {
    const o = home.ours, g = home.google;
    if (o && num(o.lat) && num(o.lng)) { H.lat = o.lat; H.lng = o.lng; delete H.pos; out.ours.push('the house'); }
    else if (g && !g.error && num(g.lat) && num(g.lng)) { H.lat = g.lat; H.lng = g.lng; H.pos = { from: 'google', at: day(now) }; out.renewed.push('the house'); }
    else out.failed.push({ name: 'the house', why: g && g.error ? g.error : 'its town was found neither in GeoNames nor on Google' });
  }
  const place = (it, lat, lng) => { it.lat = lat; it.lng = lng;
    if (house && num(house.lat) && num(house.lng)) { if ('km_from_house' in it) it.km_from_house = kmTo(house, lat, lng); if ('km' in it) it.km = kmTo(house, lat, lng); } };
  for (const { it, gid } of dueOf(files, { days, now })) {
    if (!gid) { out.failed.push({ name: label(it), why: 'no Google id' }); continue; }
    // Ours first: a position of our own sources is kept for good, the place loses its date.
    const f = rows[gid] && rows[gid].facts;
    if (f && num(f.lat) && num(f.lng)) { place(it, f.lat, f.lng); delete it.pos; out.ours.push(label(it)); continue; }
    if (!(gid in located)) continue;
    const g = located[gid];
    if (!g || g.error || !num(g.lat) || !num(g.lng)) { out.failed.push({ name: label(it), why: g && g.error ? g.error : 'Google does not know this id any more' }); continue; }
    place(it, g.lat, g.lng); it.pos = { from: 'google', at: day(now) };
    // Google may answer an old id with the place's new one: the place keeps the new id, and its Google Maps link follows.
    if (g.gid && g.gid !== gid && it.gid === gid) { it.gid = g.gid; if (typeof it.gmaps === 'string') it.gmaps = it.gmaps.replace('query_place_id=' + encodeURIComponent(gid), 'query_place_id=' + encodeURIComponent(g.gid)); }
    out.renewed.push(label(it));
  }
  return out;
}

/* ---------- Every published guide (or --slug): read, renewed, written back with --apply ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
  const env = { ...process.env };
  for (const f of [resolve(HERE, '.env.local'), resolve(ROOT, '.env')]) if (existsSync(f))
    for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, '');
  const SB = env.SUPABASE_SERVICE_KEY, GK = env.GOOGLE_PLACES_KEY;
  if (!SB || !GK) { console.error('Missing SUPABASE_SERVICE_KEY (worker/.env.local) or GOOGLE_PLACES_KEY (Guest Guides/.env).'); process.exit(1); }
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const APPLY = process.argv.includes('--apply'), SLUG = arg('--slug'), DAYS = +arg('--days', RENEW_DAYS);
  if (!Number.isFinite(DAYS) || DAYS < 0) { console.error('--days takes a number of days.'); process.exit(1); }
  const H = { apikey: SB, Authorization: 'Bearer ' + SB, 'Content-Type': 'application/json' };
  const rest = async (path, o = {}) => {
    const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const t = await r.text(); let x = null; try { x = t ? JSON.parse(t) : null; } catch (e) { x = t; }
    if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof x === 'string' ? x : JSON.stringify(x)}`.slice(0, 400));
    return x;
  };
  const store = makeStore(rest), now = new Date();
  // One answer per place for the whole run: a place in several guides, or read again after a clash, costs one request.
  const rows = {}, located = {}, homes = {};
  let calls = 0, bad = 0;
  const select = 'select=id,slug,status,updated_at,content,draft,answers';   // answers: the house's town, for its own point
  const read = slug => rest(`/rest/v1/guides?${select}&${slug ? 'slug=eq.' + encodeURIComponent(slug) : 'status=eq.published'}`);
  let guides = [];
  try { guides = await read(SLUG) || []; } catch (e) { console.error(`Could not read the guides: ${e.message}`); process.exit(1); }
  for (let g of guides) {
    for (let attempt = 1; ; attempt++) {
      if (!g || !g.content || !g.content.files) break;
      const F = g.content.files, D = g.draft && g.draft.content && g.draft.content.files, house = F.house || {};
      const want = [...dueOf(F, { days: DAYS, now }), ...(D ? dueOf(D, { days: DAYS, now }) : [])].map(x => x.gid).filter(Boolean);
      const unread = [...new Set(want)].filter(gid => !(gid in rows));
      if (unread.length) { try { Object.assign(rows, await store.get(unread)); } catch (e) { console.error(`place_facts not read (${g.slug}): ${e.message}`); } for (const gid of unread) if (!(gid in rows)) rows[gid] = null; }
      // Google by id, at a human pace, only for a place our own sources still cannot place.
      for (const gid of new Set(want)) {
        if (gid in located || (rows[gid] && rows[gid].facts && num(rows[gid].facts.lat) && num(rows[gid].facts.lng))) continue;
        try { calls++; located[gid] = await locateById(GK, gid); } catch (e) { located[gid] = { error: String(e.message || e).slice(0, 120) }; }
        await new Promise(r => setTimeout(r, 200));
      }
      // The house's own point, once per guide: GeoNames by its town first, else Google's text search of the town.
      let home = homes[g.id] || null;
      const hDue = houseDue(F, { days: DAYS, now }) || (D && houseDue(D, { days: DAYS, now })), A = g.answers || {}, town = String(A.town || '').trim();
      if (hDue && !home) {
        const at = num(house.lat) ? house : (D && D.house) || house;
        home = { ours: town ? await townPoint(town, at, { log: m => console.error(m) }) : null, google: null };
        if (!home.ours && town) { try { calls++; home.google = await locateTown(GK, [town, A.region].filter(Boolean).join(', '), at); } catch (e) { home.google = { error: String(e.message || e).slice(0, 120) }; } }
        if (!town) home.google = { error: 'the guide has no town in its answers' };
        homes[g.id] = home;   // read again after a clash: the same answers
      }
      const live = renewFiles(F, { rows, located, house, home, days: DAYS, now });
      const draft = D ? renewFiles(D, { rows, located, house: D.house || house, home, days: DAYS, now }) : null;
      const changed = live.renewed.length + live.ours.length + (draft ? draft.renewed.length + draft.ours.length : 0);
      if (attempt === 1 || changed) {
        console.log(`\n## ${g.slug} (${g.status}): ${live.renewed.length} renewed, ${live.ours.length} made ours, ${live.failed.length} failed${attempt > 1 ? ` (try ${attempt})` : ''}`);
        for (const n of live.ours) console.log(`- made ours (our own position, kept for good): ${n}`);
        for (const n of live.renewed) console.log(`- renewed from Google: ${n}`);
        for (const x of live.failed) console.log(`- NOT renewed, left as it is: ${x.name} (${x.why})`);
        if (draft && (draft.renewed.length || draft.ours.length || draft.failed.length)) console.log(`- in the unpublished changes: ${draft.renewed.length} renewed, ${draft.ours.length} made ours, ${draft.failed.length} failed`);
      }
      if (!APPLY || !changed) break;
      const body = { content: g.content, ...(D ? { draft: g.draft } : {}) };
      let saved = [];
      try { saved = await rest(`/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(g.updated_at)}`, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }) || []; }
      catch (e) { console.log(`  NOT saved: ${e.message}`); bad++; break; }
      if (saved.length) { console.log(`  saved${D ? ' (and into the unpublished changes)' : ''}.`); break; }
      // No row back: the guide changed meanwhile (the date did not match). Read again and renew again, with the same answers.
      if (attempt >= 3) { console.log('  NOT saved: the guide kept changing, run again.'); bad++; break; }
      try { g = (await rest(`/rest/v1/guides?${select}&id=eq.${g.id}`) || [])[0]; } catch (e) { console.log(`  NOT saved, could not read it again: ${e.message}`); bad++; break; }
    }
  }
  console.log(`\n${guides.length} guide(s), ${calls} Google request(s)${APPLY ? '' : ' (dry run: nothing written, add --apply)'}.`);
  process.exit(bad ? 1 : 0);
}
