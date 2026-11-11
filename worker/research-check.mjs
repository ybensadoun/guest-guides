// The research's check on Google (the places work, step 3d: docs/plan-ca-la-kimberly-through-the-maker.md, "Step 3, the
// design"), for what Find more and the area research found. Google's terms let us keep a place's id for good and its
// position for 30 days, nothing else: so Google is asked only whether the place exists, is the same place and is still
// open (worker/places.mjs, locateItem), and only its id is written to the item, with the Google Maps link made from it.
// Everything else is the research's own reading of the web, or ours from the table place_facts (worker/host-places.mjs,
// fillPlaces, the same look a host's place gets at the build): phone, website, hours, price, "book ahead", kind, and a
// position of ours (Overture's or GeoNames') that replaces the research's. The research's position stays otherwise: it is
// its own reading of the web, ours to keep, so it gets no pos mark.
import { hav, nameOf } from './places.mjs';
import { nearby, gazetteer, kindsOf } from './place-facts.mjs';
import { fillPlaces, filledOf } from './host-places.mjs';

const num = v => typeof v === 'number' && Number.isFinite(v);
const empty = v => v == null || v === '' || (Array.isArray(v) && !v.length);
export const MAX_FILLED = 12;   // each look waits on Claude for some seconds and costs about 0.02 USD: the nearest only

// The Google Maps link for a place: opened by its id, the words are only used if the id is not found.
export const mapsLink = (name, gid) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(gid)}`;

// items: what the research found (Find more's suggestions, the area research's things to do or markets); file: 'todo' or
// 'markets' (events are not checked). house: { lat, lng }. locate(it, { market }): locateItem with the Google key bound,
// { gid, lat, lng, status } or null (no Google key: null locate, the items come back as they are). store: makeStore(rest),
// or null (located only). ask, again: the worker's Haiku chain (placeAsk, placeAgain); without them only what is kept is
// used, nothing asked. near, gaz (tests): in place of nearby() and gazetteer(). progress(i, n, stage) before each place,
// stage 'locate' then 'fill'. pause: ms between two Google requests. Returns the items kept, in their order: a place Google
// says is permanently closed is left out, nothing of it stored. A failure for one place never fails the job.
export async function checkResearch(items, file, { locate = null, house = null, store = null, ask = null, again = null, near = nearby, gaz = gazetteer,
  python = process.env.OVERTURE_PYTHON || 'python3', country = 'ES', meter = null, log = console.error, progress = () => {}, pause = 300, max = MAX_FILLED, today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!locate) return items;
  const market = file === 'markets', kept = [], located = [];
  // 1. Located: the id, nothing else of Google's is written. Google's position stays in memory, as the pin our own sources are
  // asked around.
  for (const [i, it] of items.entries()) {
    await progress(i + 1, items.length, 'locate');
    let loc = null; try { loc = await locate(it, { market }); } catch (e) { /* kept, unchecked */ }
    if (pause) await new Promise(r => setTimeout(r, pause));
    it.checked = today;
    if (!loc) { it._google = 'Not found on Google: the web source is the only proof'; kept.push(it); continue; }
    if (loc.status === 'CLOSED_PERMANENTLY') continue;   // gone: never suggested
    it.gid = loc.gid;
    const name = it.name_local || nameOf(it.name) || '';
    if (!it.gmaps || /\/maps\/search\//.test(it.gmaps)) it.gmaps = mapsLink(name, loc.gid);   // a listing link the research gave stays
    it._google = 'On Google';
    // "Temporarily closed" (often the off-season) keeps its flag and note as before step 3: it is a result of the check, not a
    // copy of Google's data, and stays so until the terms pass (proposal 19) says what the check may keep.
    if (loc.status === 'CLOSED_TEMPORARILY') { it.flags = [...new Set([...(it.flags || []), 'check'])]; it._google = 'Temporarily closed on Google (off-season?)'; }
    kept.push(it);
    located.push({ it, lat: loc.lat, lng: loc.lng, name });
  }
  // A weekly market is not a business with a door: located only, never sent through the chain. Only Things to do are.
  if (file !== 'todo' || !store || !located.length) return kept;

  // 2. Filled from our own sources, the nearest first: one call to Overture and one to GeoNames for the batch, then each
  // place's row in place_facts when fresh, else the chain and the row kept (fillPlaces). Only where the research left a
  // field empty; its name and description stay its own.
  const far = x => house ? hav(house.lat, house.lng, x.lat, x.lng) : 0;
  const pick = [...located].sort((a, b) => far(a) - far(b)).slice(0, max);
  try {
    let rows = {};
    try { rows = await store.get([...new Set(pick.map(p => p.it.gid))]); } catch (e) { log(`place_facts not read: ${e.message}`); }
    // Each pin is Google's position of the moment, with the research's names for the place (ours: its reading of the web).
    const names = it => [...new Set([it.name_local, ...(it.name && typeof it.name === 'object' ? Object.values(it.name) : [it.name])].filter(n => typeof n === 'string' && n.trim()))];
    const pins = [...new Map(pick.map(p => [p.it.gid, { id: p.it.gid, lat: p.lat, lng: p.lng, names: names(p.it) }])).values()];
    const [ov, gz] = ask ? await Promise.all([near(house, pins, { python, log }), gaz(country, pins, { log })]) : [{ release: null, pins: {}, towns: {} }, { fetched: null, pins: {} }];
    const feats = gid => (gz && gz.pins && gz.pins[gid]) || [];
    const found = pick.map((p, k) => ({ key: String(k), gid: p.it.gid, words: p.name, list: 'todo', ...(p.it.town ? { town: p.it.town } : {}) }));
    let n = 0;
    const facts = await fillPlaces(found, rows, ov, feats, { store, ask, again, meter, log, started: () => { Promise.resolve(progress(++n, found.length, 'fill')).catch(() => {}); } });
    const K = kindsOf('todo');
    pick.forEach((p, k) => {
      const f = facts[String(k)] || {}, it = p.it, ours = [];   // ours: the item's fields filled here, for the editor's source line
      if (empty(it.phone) && f.phone) { it.phone = f.phone; ours.push('phone'); }
      if (empty(it.url) && f.website) { it.url = f.website; ours.push('url'); }
      // Hours from the place's own site: no hoursSource (they are ours). As with Google's hours before, a place that gains
      // them loses the research's "check" unless Google said it is temporarily closed.
      if (empty(it.schedule) && !it.always && Array.isArray(f.hours) && f.hours.length) { it.schedule = f.hours; ours.push('schedule'); if (it._google === 'On Google') it.flags = (it.flags || []).filter(x => x !== 'check'); }
      if (empty(it.price) && f.price) { it.price = f.price; ours.push('price'); }
      if (f.book === true && !(it.flags || []).includes('book')) { it.flags = [...new Set([...(it.flags || []), 'book'])]; ours.push('book'); }
      if (num(f.lat) && num(f.lng)) { it.lat = f.lat; it.lng = f.lng; if (house) it.km_from_house = Math.round(hav(house.lat, house.lng, f.lat, f.lng) * 10) / 10; }
      // The kind, as the generator gives a host's place one: its icon, its quick filter and "Great for kids".
      const kind = f.kind_todo;
      if (!it.icon && kind && K && K[kind]) {
        it.icon = kind; ours.push('kind');
        if (!it.group && K[kind].group) it.group = K[kind].group;
        if (K[kind].kids) it.tags = [...new Set([...(it.tags || []), 'kidsfun'])];
      }
      // Where they came from (the kept row's sources), as a host's place at the build: never Google, which keeps nothing here.
      const filled = filledOf(ours, (rows[it.gid] || {}).sources, 'todo');
      if (filled) it.filled = filled;
    });
  } catch (e) { log(`research places not filled: ${e.message}`); }
  return kept;
}
