// Ride apps (Uber, Cabify, Bolt) in Getting around (engine/src/modules/transport/README.md, "The ride apps"). Yohann,
// 16 Nov 2026: "you would select apps that work for ride sharing"; "we suggest apps: uber, cabify etc.. and they approve".
// The design, 16 Nov 2026, as rail-brands.mjs: one question for the three apps (the cities of Spain where each offers rides
// today, from the company's own pages first), kept in one shared record (table ride_apps, one row per app, the worker's
// only), renewed on a request only when older than 30 days (7 days after a search that was not sure); a sure answer
// replaces a list, anything else changes nothing. A city's position is GeoNames' (place, the worker's gazetteer), never
// Claude's: Claude's rough point only says where to look, and a city GeoNames does not find there is dropped. Unlike iryo
// and Ouigo, a new list does not rewrite other guides: an app is the host's choice once approved.
// Tested in worker/test/ride-apps.test.mjs with a fake Claude, a fake database and a fake town reader.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tpBrandsStale, tpPlaced } from '../engine/src/modules/transport/pick.js';
import { axNear, axEntry } from '../engine/src/modules/transport/apps.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const APPS = JSON.parse(readFileSync(resolve(ROOT, 'engine/src/modules/transport/apps.json'), 'utf8')).apps;
export const MIN_CITIES = 2;
const SELECT = 'app,cities,sources,checked_at,tried_at,usd';
const isUrl = u => { try { return /^https?:$/.test(new URL(String(u)).protocol); } catch (e) { return false; } };
const num = v => typeof v === 'number' && Number.isFinite(v);

export function appsPrompt() {
  return `You check in which cities of Spain three ride apps offer rides today, for the "Getting around" page of holiday homes' guest guides.
The apps: ${APPS.map(a => `"${a.id}": ${a.name}`).join('; ')}.
For each app, list the cities of Spain where it offers rides today. Sources in this order: the company's own pages first (its list of cities, its city pages), then, only to confirm, another recent reliable page. A city that is announced but not served today is not a city of the app. Never a guess. When you cannot confirm an app's list, give "sure": false for it.
For each city give its name and a rough position (lat, lng, two decimals: it only says where to look for the town in our own gazetteer).
Return only JSON:
{${APPS.map(a => `"${a.id}":{"sure":true,"cities":[{"name":"","lat":0,"lng":0}],"sources":[""]}`).join(',')}}`;
}

// The answer read, app by app: { sure: true, cities: [{ name, lat, lng }] (rough), sources } or { sure: false, why }.
export function readApps(out) {
  const res = {};
  for (const { id } of APPS) {
    const a = out && typeof out === 'object' ? out[id] : null, no = why => { res[id] = { sure: false, why }; };
    if (!a || a.sure !== true) { no('not sure'); continue; }
    const cities = (Array.isArray(a.cities) ? a.cities : []).filter(c => c && String(c.name || '').trim() && num(+c.lat) && num(+c.lng)).map(c => ({ name: String(c.name).trim().slice(0, 80), lat: +c.lat, lng: +c.lng }));
    const sources = [...new Set((Array.isArray(a.sources) ? a.sources : []).filter(isUrl).map(String))].slice(0, 8);
    if (!sources.length) { no('no source'); continue; }
    if (cities.length < MIN_CITIES) { no(`${cities.length} cities`); continue; }
    res[id] = { sure: true, cities, sources };
  }
  return res;
}

// The shared rows, renewed when one is stale (or force) with one question, the cities placed by GeoNames (place(cities):
// the same cities with GeoNames' positions, those it could not find left out), then saved. Returns { rows, changed, asked,
// answer, usd }. Never throws. ask null (no research, the visitors' budget spent): nothing asked, the kept rows.
export async function refreshApps({ rest, ask, place, now = new Date(), log = () => {}, meter = { usd: 0 }, force = false, dry = false } = {}) {
  let rows = [];
  try { rows = (await rest(`/rest/v1/ride_apps?select=${SELECT}`)) || []; }
  catch (e) { log('  ride apps: the record could not be read:', e.message); return { rows: [], changed: [], asked: false }; }
  const rowOf = id => rows.find(r => r && r.app === id) || null;
  if (!ask || !(force || APPS.some(a => tpBrandsStale(rowOf(a.id), now)))) return { rows, changed: [], asked: false };
  const at = new Date(now).toISOString(), before = meter.usd || 0;
  let out = null;
  try { out = await ask(appsPrompt()); } catch (e) { log('  ride apps not asked or no answer:', e.message); }
  const usd = +((meter.usd || 0) - before).toFixed(4), answer = readApps(out), changed = [], next = [];
  for (const { id } of APPS) {
    let a = answer[id];
    if (a.sure) {
      let placed = [];
      try { placed = (await place(a.cities)) || []; } catch (e) { log('  ride apps: the cities not placed:', e.message); }
      placed = placed.filter(c => c && c.name && num(c.lat) && num(c.lng));
      a = answer[id] = placed.length >= MIN_CITIES ? { ...a, cities: placed } : { sure: false, why: `${placed.length} cities placed` };
    }
    const old = rowOf(id);
    const row = a.sure ? { app: id, cities: a.cities, sources: a.sources, checked_at: at, tried_at: at, usd } : { ...(old || { app: id, cities: [], sources: [], checked_at: null }), app: id, tried_at: at, usd };
    if (a.sure && JSON.stringify((old && old.checked_at ? old.cities : []).map(c => c.name).sort()) !== JSON.stringify(a.cities.map(c => c.name).sort())) changed.push(id);
    next.push(row);
    if (!dry) {
      try { await rest('/rest/v1/ride_apps?on_conflict=app', { method: 'POST', body: a.sure ? row : { app: id, tried_at: at, usd }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } }); }
      catch (e) { log(`  ride apps: ${id} not saved:`, e.message); }
    }
  }
  log(`  ride apps: ${APPS.map(({ id }) => `${id} ${answer[id].sure ? answer[id].cities.length + ' cities' : 'not sure (' + answer[id].why + ')'}`).join(', ')}${usd ? `, about ${usd.toFixed(2)} USD` : ''}${dry ? ' (dry run, nothing written)' : ''}`);
  return { rows: next, changed, asked: true, answer, usd };
}

// The apps that work near a point, as a guide holds them.
export const appsNear = (house, rows) => tpPlaced(house) ? axNear(house, rows, APPS).map(a => axEntry(a)) : [];

// The editor's job (find-transport, params.what === 'apps'): the apps that work near this guide's house, in result.apps;
// nothing written into the guide. Messages hosts may see never name Claude or a web search.
export async function appsJob(j, jp, { rest, ask, place, now = new Date(), log = () => {}, meter = { usd: 0 } } = {}) {
  await jp({ message: 'Checking ride apps' });
  const r = await refreshApps({ rest, ask, place, now, log, meter });
  const g = ((await rest('/rest/v1/guides?select=content,draft&id=eq.' + j.guide_id)) || [])[0];
  const c = (g && (g.draft && g.draft.content ? g.draft.content : g.content)) || {}, h = (c.files || {}).house || {};
  const apps = appsNear(h, r.rows);
  await jp({ status: 'done', message: apps.length ? `${apps.length} ride ${apps.length === 1 ? 'app' : 'apps'} near the house` : 'No ride app works near the house', result: { apps }, finished_at: new Date().toISOString() });
  return apps;
}
