#!/usr/bin/env node
// A host's own places for the build (the places work, step 3a: docs/plan-ca-la-kimberly-through-the-maker.md, "Step 3,
// the design"). Google's terms let us keep a place's id for good and its position for 30 days, nothing else: so Google
// only locates each place (worker/places.mjs), and everything the guide shows comes from our own chain, kept in the table
// place_facts (worker/place-facts.mjs, worker/place-store.mjs): name, town, kind, phone, website, hours, price, position.
// The result is the generator's src/geocode.json: one entry per place, keyed by what the host typed (r.p.trim()), or
// 'gid:<id>' for a card they kept in the swipe deck.
// Run alone, a dry run over a file of answers, printed as JSON (the worker's keys from worker/.env.local and .env):
//   node worker/host-places.mjs --answers <file.json> [--save]
// Without --save nothing is written anywhere (facts already kept are still read); with --save what the chain finds is
// kept in place_facts. It asks Google and Claude: it costs money (about 0.02 USD a place not kept yet).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hav, locateById, locateByWords } from './places.mjs';
import { nearby, placeFacts } from './place-facts.mjs';
import { tidyName, due, lookedFor, mergeFacts, makeStore } from './place-store.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const LIST = l => l === 'todo' ? 'todo' : 'eat';   // nightlife's kinds are those of eat

// The host's places in a guide's answers: rows they typed or picked (Eat and drink and Nightlife: list eat; what they
// added to Attractions: todo) and the cards they kept in the swipe deck (only the Google id is known: its name is not kept).
// Researched cards (ids starting with r:) are ours already and are not located.
export function placesOf(A) {
  const added = Array.isArray(A.favDo) ? A.favDo : String(A.favDo || '').split(/[,\n]+/).map(p => ({ p }));
  const rows = [...(A.favEat || []).map(r => [r, 'eat']), ...(A.favNight || []).map(r => [r, 'eat']), ...added.map(r => [r, 'todo'])]
    .filter(([r]) => r && String(r.p || '').trim()).map(([r, list]) => ({ p: String(r.p), ...(r.gid ? { gid: r.gid } : {}), list, ...(r.c ? { c: r.c } : {}) }));
  const cards = Object.values(A.swipes || {}).filter(s => s && s.d === 'yes' && s.cat === 'todo' && s.id && !String(s.id).startsWith('r:'))
    .map(s => ({ id: String(s.id), list: 'todo', ...(s.c ? { c: s.c } : {}) }));
  return { rows, cards };
}

// A few at a time: each place waits on Claude for some seconds, and the day's limit is shared with the rest of the worker.
async function each(list, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; await f(list[k], k); } }));
}
const today = () => new Date().toISOString().slice(0, 10);
const num = v => typeof v === 'number' && Number.isFinite(v);

// rows: [{ p, gid?, list, c? }], cards: [{ id, list, c? }] (c: the host's comment, which helps the kind), house: { lat, lng },
// town: the house's town (the generator's fallback for a place with no town; not asked for here). GK: the Google key;
// store: makeStore(rest); ask, again: makeClaude(...) at low and medium effort.
// Without store: located only, nothing filled. Without ask: filled from what is already kept, nothing asked. locate (tests): { byId(id), byWords(words, house) } instead of Google;
// near (tests): in place of nearby(), Overture's records.
// meter (optional): { usd } that the chain's cost is added to. Returns the geocode map.
export async function hostPlaces({ rows = [], cards = [], house, town = '' }, { GK, store = null, ask = null, again = null, python, log = console.error, locate = null, near = nearby, meter = null } = {}) {
  const L = locate || (GK ? { byId: id => locateById(GK, id), byWords: (w, h) => locateByWords(GK, w, h) } : null);
  if (!L || !house) return {};
  // 1. Located by Google: the id and the position, nothing else. The same place typed twice is located once.
  const want = [], seen = new Set();
  for (const r of rows) { const key = String(r.p || '').trim(); if (key && !seen.has(key)) { seen.add(key); want.push({ key, list: LIST(r.list), words: key, about: r.c || '', gid: r.gid || null }); } }
  for (const c of cards) { const key = 'gid:' + c.id; if (c.id && !seen.has(key)) { seen.add(key); want.push({ key, list: LIST(c.list), words: '', about: c.c || '', gid: c.id, card: true }); } }
  const found = [];
  await each(want, 4, async (w, i) => {
    try {
      const loc = w.gid ? await L.byId(w.gid) : await L.byWords(w.key, house);
      if (!loc) { log(`${w.card ? 'kept card' : 'favourite place'} not found on Google: ${w.key.slice(0, 60)}`); return; }
      found.push({ ...w, i, gid: loc.gid, lat: loc.lat, lng: loc.lng, ...(loc.words ? { words: loc.words } : {}) });   // a link: the name read from it
    } catch (e) { log(`place lookup failed (${w.key.slice(0, 40)}): ${e.message}`); }
  });
  found.sort((a, b) => a.i - b.i);   // the host's order, whatever answered first

  // 2. Filled from our own table, or by the chain and then kept. A place looked at less than 30 days ago for this list
  // costs nothing. A failure for one place is logged, and its entry keeps what Google located.
  const facts = {}, towns = {};
  if (store && found.length) {
    let kept = {};
    try { kept = await store.get([...new Set(found.map(p => p.gid))]); } catch (e) { log(`place_facts not read: ${e.message}`); }
    const ov = ask ? await near(house, found.map(p => ({ id: p.gid, lat: p.lat, lng: p.lng, names: p.words ? [p.words] : [] })), { python, log }) : { release: null, pins: {}, towns: {} };
    Object.assign(towns, ov.towns || {});
    const lanes = new Map();   // one place in two lists: its two looks one after the other, the second on the row the first kept
    await each(found, 4, p => {
      const run = (lanes.get(p.gid) || Promise.resolve()).then(async () => {
        const row = kept[p.gid] || null;
        const fresh = !!row && !due(row);
        if (!ask || (fresh && lookedFor(row, p.list))) { facts[p.key] = row && row.facts || {}; return; }   // without Claude: what is kept, nothing asked
        try {
          const place = { name: p.words, town: towns[p.gid] || undefined, about: p.about || undefined, list: p.list };
          // Its site was read lately but never for this list (or before names and kinds were kept): only the match is asked.
          const r = await placeFacts(place, ov.pins[p.gid] || [], ask, { meter: {}, again, matchOnly: fresh });
          if (meter) meter.usd = +((meter.usd || 0) + (r.usd || 0)).toFixed(4);
          // A look cut short (the day's limit, the API out of reach) is not kept: it would wait 30 days to be asked again.
          if (r.error) { log(`place facts incomplete (${p.key.slice(0, 40)}): ${r.error}`); facts[p.key] = row && row.facts || {}; return; }
          const saved = await store.save(p.gid, place, r, { release: ov.release, light: fresh });
          kept[p.gid] = saved; facts[p.key] = saved.facts || {};
        } catch (e) { log(`place facts failed (${p.key.slice(0, 40)}): ${e.message}`); facts[p.key] = row && row.facts || {}; }
      });
      lanes.set(p.gid, run);
      return run;
    });
  }

  // 3. The entry the generator reads. Our position (Overture's, kept in place_facts) when we have it, else Google's,
  // marked with its date: it may be kept 30 days only, and a later step renews it.
  const geo = {};
  for (const p of found) {
    const f = facts[p.key] || {}, ours = num(f.lat) && num(f.lng);
    const lat = ours ? f.lat : p.lat, lng = ours ? f.lng : p.lng;
    const name = p.card ? (typeof f.name === 'string' && f.name.trim() ? f.name.trim() : null) : tidyName(p.words, f.name, [f.town, towns[p.gid], town].filter(Boolean));
    const e = { ...(name ? { name } : { noname: true }), lat, lng, km: Math.max(1, Math.round(hav(house.lat, house.lng, lat, lng) * 1.3)) };
    const t = f.town || towns[p.gid];
    if (t) e.town = t;
    e.gid = p.gid;
    // Google Maps opens the place by its id; the words are only used if the id is not found.
    e.gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || p.words || `${lat},${lng}`)}&query_place_id=${encodeURIComponent(p.gid)}`;
    if (f['kind_' + p.list]) e.kind = f['kind_' + p.list];
    if (f.phone) e.phone = f.phone;
    if (f.website) e.url = f.website;
    if (Array.isArray(f.hours) && f.hours.length) e.schedule = f.hours;
    if (f.price) e.price = f.price;
    if (f.book === true) e.book = true;
    if (!ours) e.pos = { from: 'google', at: today() };
    geo[p.key] = e;
  }
  return geo;
}

/* ---------- Dry run over a file of answers: printed; with --save, facts kept in place_facts, nothing else ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : ''; };
  const file = arg('--answers'), save = process.argv.includes('--save');
  if (!file || !existsSync(file)) { console.error('Use: node worker/host-places.mjs --answers <file.json> [--save]'); process.exit(1); }
  // The worker's own settings (worker/.env.local) and the Google key (.env), as the worker reads them. Never printed.
  const env = { ...process.env };
  const load = (f, only) => { if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env) && (!only || only.test(m[1]))) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } };
  load(resolve(HERE, '.env.local')); load(resolve(ROOT, '.env'), /^GOOGLE_PLACES_KEY$/);
  if (!env.GOOGLE_PLACES_KEY) { console.error('Needs GOOGLE_PLACES_KEY in .env.'); process.exit(1); }
  if (save && !env.SUPABASE_SERVICE_KEY) { console.error('--save needs SUPABASE_SERVICE_KEY in worker/.env.local.'); process.exit(1); }
  const j = JSON.parse(readFileSync(file, 'utf8')), A = j.answers || j;
  if (typeof A.lat !== 'number' || typeof A.lng !== 'number') { console.error('The answers need the house\'s lat and lng.'); process.exit(1); }
  const { rows, cards } = placesOf(A);
  // The table through Supabase's REST API, as the worker reaches it. Without --save a look is merged in memory only.
  let store = null;
  if (env.SUPABASE_SERVICE_KEY) {
    const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), KEY = env.SUPABASE_SERVICE_KEY;
    const rest = async (path, o = {}) => {
      const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...(o.headers || {}) }, body: o.body === undefined ? undefined : (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)) });
      const t = await r.text(); let x = null; try { x = t ? JSON.parse(t) : null; } catch (e) { x = t; }
      if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof x === 'string' ? x : JSON.stringify(x)}`.slice(0, 400));
      return x;
    };
    const real = makeStore(rest);
    store = save ? real : { get: real.get, save: async (gid, place, res, opts) => ({ gid, ...mergeFacts((await real.get([gid]))[gid] || null, place, res, opts) }) };
  }
  let ask = null, again = null;
  if (env.WORKER_ANTHROPIC_KEY && store) {
    const { makeClaude } = await import('./claude-api.mjs');
    const quiet = (...a) => { const t = a.join(' '); if (!/^\s*claude api, /.test(t)) console.error(t); };
    const claude = (effort, usd) => makeClaude({ ...env, RESEARCH_MODEL: 'claude-haiku-5-5', TRANSLATE_MODEL: 'claude-haiku-5-5', RESEARCH_EFFORT: effort, RESEARCH_MAX_SEARCHES: '3', RESEARCH_USD_PER_DAY: usd }, quiet);
    ask = claude('low', '2'); again = claude('medium', '1');
  }
  console.error(`${rows.length} typed places, ${cards.length} kept cards. ${ask ? (save ? 'Facts found are kept in place_facts.' : 'Nothing is written.') : 'No Claude key or no database key: located only.'}`);
  const meter = {};
  const geo = await hostPlaces({ rows, cards, house: { lat: A.lat, lng: A.lng }, town: A.town || '' },
    { GK: env.GOOGLE_PLACES_KEY, store, ask, again, python: env.OVERTURE_PYTHON || 'python3', meter });
  console.log(JSON.stringify(geo, null, 1));
  console.error(`${Object.keys(geo).length} entries; Claude about ${(meter.usd || 0).toFixed(3)} USD.`);
  process.exit(0);
}
