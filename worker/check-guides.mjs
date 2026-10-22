#!/usr/bin/env node
// Monthly place check for published guides in the database (BACKLOG item 7b, policy of 22 Oct 2026).
// For each place (markets, things to do, the host's bars and restaurants): still open, exact Google Maps listing, opening hours.
// Cost: one Places request per place, and none for a place checked in the last --days days (default 25): each place keeps
// its Google id (gid) and the date it was checked. Not run on builds: monthly (scheduled task) and on demand.
//   node worker/check-guides.mjs                  dry run: report only, nothing written
//   node worker/check-guides.mjs --apply          write the fixes to the guides
//   node worker/check-guides.mjs --slug <slug>    one guide only (published or not)
//   node worker/check-guides.mjs --days 0         re-check every place, even recent ones
// Keys: SUPABASE_SERVICE_KEY in worker/.env.local, GOOGLE_PLACES_KEY in Guest Guides/.env (both git-ignored).
// Rules: official hours (a place with "url" and a schedule) are never replaced by Google's, only compared. A permanently
// closed place is removed, a temporarily closed one gets "check" (often just the off-season), a place Google cannot
// find stays and is listed for a human. Ca La Kimberly's real guide is the static site: imported guides are skipped
// (check it with npm run check-places -- ca-la-kimberly).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const env = { ...process.env };
for (const f of [resolve(HERE, '.env.local'), resolve(ROOT, '.env')]) if (existsSync(f))
  for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, '');
const SB = env.SUPABASE_SERVICE_KEY, GK = env.GOOGLE_PLACES_KEY;
if (!SB || !GK) { console.error('Missing SUPABASE_SERVICE_KEY (worker/.env.local) or GOOGLE_PLACES_KEY (Guest Guides/.env).'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes('--apply'), SLUG = arg('--slug'), DAYS = +arg('--days', 25);
const TODAY = new Date().toISOString().slice(0, 10);
const H = { apikey: SB, Authorization: 'Bearer ' + SB, 'Content-Type': 'application/json' };

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const hav = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; return 2 * R * Math.asin(Math.sqrt(Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2)); };
const nameOf = n => (n && typeof n === 'object' ? n.ca || n.es || n.en || Object.values(n)[0] : n) || '';
const pad = n => String(n).padStart(2, '0');
const daysOf = sch => [...new Set((sch || []).flatMap(s => s.days || []))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
// Google's answer must share a real word with our name (not the town, not "market" alone), or be the listing we already link to.
const STOP = new Set('de del dels la les el els los las le du des a i y et and the of d l s sa es en al market mercat mercado marche setmanal semanal weekly'.split(' '));
const words = (s, town) => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w) && !String(town || '').toLowerCase().split(/\W+/).includes(w)));
const sameName = (it, p) => { const a = new Set([...words(it.name_local, it.town), ...words(nameOf(it.name), it.town), ...Object.values(it.name || {}).flatMap(x => [...words(x, it.town)])]); return [...words(p.displayName?.text, it.town)].some(w => a.has(w)); };
const cidOf = u => { const m = String(u || '').match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i); if (m) return BigInt('0x' + m[1]).toString(); const c = String(u || '').match(/[?&]cid=(\d+)/); return c ? c[1] : null; };
const md = d => (d.getMonth() + 1) * 100 + d.getDate(), mdn = s => +s.replace('-', '');
const inSeason = (s, d = new Date()) => !s.from || (mdn(s.from) <= mdn(s.to) ? md(d) >= mdn(s.from) && md(d) <= mdn(s.to) : md(d) >= mdn(s.from) || md(d) <= mdn(s.to));
const ago = d => d ? (Date.now() - Date.parse(d)) / 864e5 : Infinity;

// Google's opening periods as the guide's schedule (close earlier than open = after midnight; one period without close = always open).
function schedule(periods) {
  if (!periods || !periods.length) return null;
  if (periods.length === 1 && !periods[0].close) return 'always';
  const g = new Map();
  for (const p of periods) {
    if (!p.close) continue;
    const k = `${pad(p.open.hour)}:${pad(p.open.minute)}-${pad(p.close.hour)}:${pad(p.close.minute)}`;
    g.set(k, [...(g.get(k) || []), DAY[p.open.day]]);
  }
  return [...g].map(([k, d]) => ({ days: [...new Set(d)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), open: k.slice(0, 5), close: k.slice(6) }))
    .sort((a, b) => ORDER.indexOf(a.days[0]) - ORDER.indexOf(b.days[0]) || a.open.localeCompare(b.open));
}

const FIELDS = 'id,displayName,businessStatus,googleMapsUri,location,formattedAddress,regularOpeningHours';
// Each request: 15 s limit and up to 3 tries (a dropped connection must not stop the monthly run).
async function get(url, init) {
  for (let i = 1; ; i++) {
    try { return await fetch(url, { ...init, signal: AbortSignal.timeout(15000) }); }
    catch (e) { if (i >= 3) throw e; await new Promise(r => setTimeout(r, 1500 * i)); }
  }
}
async function google(it) {
  const head = { 'X-Goog-Api-Key': GK, 'Content-Type': 'application/json' };
  if (it.gid) {   // known place: details by id, no search
    const r = await get(`https://places.googleapis.com/v1/places/${encodeURIComponent(it.gid)}`, { headers: { ...head, 'X-Goog-FieldMask': FIELDS } });
    if (r.ok) return r.json();
  }
  const body = { textQuery: [it.name_local || nameOf(it.name), it.town].filter(Boolean).join(', '), maxResultCount: 1 };
  if (typeof it.lat === 'number') body.locationBias = { circle: { center: { latitude: it.lat, longitude: it.lng }, radius: 3000 } };
  const r = await get('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { ...head, 'X-Goog-FieldMask': FIELDS.split(',').map(f => 'places.' + f).join(',') }, body: JSON.stringify(body) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return (d.places || [])[0] || null;
}

// One place: returns a line for the report, and changes it in place (the guide is only written with --apply).
async function checkPlace(it, kind) {
  const n = nameOf(it.name);
  if (ago(it.checked) < DAYS) return { skip: true };   // checked recently (found or not): no request
  const p = await google(it);
  await new Promise(r => setTimeout(r, 300));
  const far = p && typeof it.lat === 'number' && p.location ? hav(it.lat, it.lng, p.location.latitude, p.location.longitude) : 0;
  it.checked = TODAY;   // even when nothing matches: the next look is next month, not the next run
  if (!p || far > 2) return { line: `not found near its pin: ${n}${p ? ` (nearest: ${p.displayName?.text}, ${far.toFixed(1)} km)` : ''}`, human: true };
  const ours = cidOf(it.gmaps), theirs = cidOf(p.googleMapsUri);
  if (ours && theirs && ours !== theirs && !it.gid) return { line: `Google's answer (${p.displayName?.text}) is not the listing the guide links to, kept as is: ${n}`, human: true };
  if (!ours && !it.gid && !sameName(it, p)) return { line: `no listing with this name near its pin (nearest: ${p.displayName?.text}), kept as is: ${n}`, human: true };
  it.gid = p.id;
  if (!it.gmaps || /\/maps\/search\//.test(it.gmaps)) it.gmaps = p.googleMapsUri;
  if (p.businessStatus === 'CLOSED_PERMANENTLY') return { line: `permanently closed, removed: ${n}`, remove: true, human: true };
  const flags = new Set(it.flags || []);
  if (p.businessStatus === 'CLOSED_TEMPORARILY') { flags.add('check'); it.flags = [...flags]; return { line: `temporarily closed on Google (off-season?), marked check: ${n}`, human: true }; }
  const g = schedule(p.regularOpeningHours?.periods);
  const official = it.url && it.schedule && it.schedule.length && it.hoursSource !== 'google';
  let what = 'open';
  if (official) {
    const a = daysOf(it.schedule.filter(s => inSeason(s))).join(','), b = Array.isArray(g) ? daysOf(g).join(',') : '';
    if (b && a === b) flags.delete('check');
    what = !b ? 'open, official hours kept' : a === b ? 'open, official hours match Google' : `open, official days ${a || 'none this season'} but Google says ${b} (kept official)`;
  } else if (it.always) { flags.delete('check'); what = 'open, always open (kept)'; }   // open-air places stay "always open" even when Google lists gate hours
  else if (g === 'always' && !it.schedule?.length) { it.always = true; flags.delete('check'); what = 'open, always open'; }
  else if (kind === 'markets' && !it.schedule?.length) what = 'open (yearly event: Google hours not used)';
  else if (Array.isArray(g)) {
    const same = kind === 'markets' && it.schedule?.length && daysOf(it.schedule).join() === daysOf(g).join();
    if (kind === 'markets' && it.schedule?.length && !same) what = `open, days differ: guide ${daysOf(it.schedule)} / Google ${daysOf(g)}`;
    else if (kind === 'markets' && same) { flags.delete('check'); what = 'open, market day confirmed'; }
    else { it.schedule = g; it.hoursSource = 'google'; delete it.always; flags.delete('check'); what = 'open, hours from Google'; }
  }
  it.flags = [...flags];
  return { line: `${what}: ${n}` };
}

const rows = await (await fetch(`${URL_}/rest/v1/guides?select=id,slug,status,origin,updated_at,content&${SLUG ? 'slug=eq.' + encodeURIComponent(SLUG) : 'status=eq.published'}`, { headers: H })).json();
let calls = 0;
for (const g of rows) {
  if (!g.content || !g.content.files) continue;
  if (g.origin === 'imported') { console.log(`\n## ${g.slug}: skipped (hand-made guide, check its site folder with npm run check-places)`); continue; }
  const F = g.content.files, report = [], humans = [];
  for (const [kind, list] of [['markets', F.markets?.markets], ['todo', F.todo?.items], ['restaurants', F.restaurants?.items]]) {
    if (!Array.isArray(list)) continue;
    for (const it of [...list]) {
      try {
        const r = await checkPlace(it, kind);
        if (r.skip) continue;
        calls++;
        report.push(`${kind}: ${r.line}`); if (r.human) humans.push(r.line);
        if (r.remove) list.splice(list.indexOf(it), 1);
      } catch (e) { report.push(`${kind}: error for ${nameOf(it.name)}: ${e.message}`); humans.push(`error: ${nameOf(it.name)}`); }
    }
  }
  console.log(`\n## ${g.slug} (${g.status}): ${report.length} checked${humans.length ? `, ${humans.length} for a human` : ''}`);
  for (const l of report) console.log('- ' + l);
  if (APPLY && report.length) {
    const r = await fetch(`${URL_}/rest/v1/guides?id=eq.${g.id}&updated_at=eq.${encodeURIComponent(g.updated_at)}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ content: g.content }) });
    console.log(r.ok ? '  saved.' : `  NOT saved (${r.status}): the guide changed meanwhile, run again.`);
  }
}
console.log(`\n${calls} Google requests${APPLY ? '' : ' (dry run: nothing written, add --apply)'}.`);
