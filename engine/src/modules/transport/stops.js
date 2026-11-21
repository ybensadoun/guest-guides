// Public transport stops (metro, tram, bus) near a house, from our file of Spain's stops (index.json and its cells, written
// by onboarding-site/src/stops.py on the server from the open timetable files we keep, served from our storage; README.md beside this file, "Public
// transport found"). One rule in one place: the generator (engine/scripts/stops-of.mjs) and the maker (pasted by
// onboarding-site/src/build.py, the import and export words taken out). Pure: no DOM. Every name starts with sp.
// A stop: { id, n, k (metro, rail, tram, bus), lat, lng, s (its source's index), lines: [{ t?, n, c?, ink?, f }] }.
// Tested in engine/scripts/transport-stops.test.mjs.
import { tpLine, tpRoadKm, tpPlaced, tpFold, cmMin, tpWalk } from './pick.js';

export const SP = { cell: 0.25, near: 3, side: 0.2, walkMax: 25, metro: 1.2, tram: 1, bus: 0.6 };   // the design, 16 Nov 2026
// The cells a house's stops are read from (16 Nov 2026: Madrid's cells are 2 MB each, so 4 files at most): the 2 by 2 block
// around the house, its own cell, the neighbour on the side of each axis it is nearer to, and the diagonal between them.
// Every stop within 10 km is in it (a cell is 0.25 degrees: the far edges are at least half a cell, 10.3 km or more in Spain).
export function spCells(house) {
  if (!tpPlaced(house)) return [];
  const fy = +house.lat * 4, fx = +house.lng * 4, y = Math.floor(fy), x = Math.floor(fx);
  const dy = fy - y < 0.5 ? -1 : 1, dx = fx - x < 0.5 ? -1 : 1;
  return [`${y}_${x}`, `${y + dy}_${x}`, `${y}_${x + dx}`, `${y + dy}_${x + dx}`];
}
// "metro stations always take over, then trams, then buses" (Yohann, 16 Nov 2026); rail counts as metro.
export const spRank = k => ({ metro: 0, rail: 0, tram: 1, bus: 2 })[k] ?? 3;
// Minutes on foot from km by road: 12 a km, at least 1.
export const spWalk = tpWalk;   // one formula with the train stations (pick.js)
const spKey = l => (l.t ? 't:' + l.t : 'n:' + l.n);
export const spId = st => 'sp' + String(st.id).replace(/:/g, '-');
const spRoad = (house, st) => tpRoadKm(tpLine(house, st), 2);

// "find what's closest to me": the stops nearest first, whatever their kind, within 3 km by road; left out one the guide
// has (have: entry ids), and one within 200 m of a nearer stop of the same kind whose lines it adds nothing to (the
// other side of the street). [{ st, km, walk }].
export function spNear(house, stops, { have = [], max = 6 } = {}) {
  if (!tpPlaced(house) || !Array.isArray(stops)) return [];
  const skip = new Set(have), all = stops.map(st => ({ st, km: spRoad(house, st) })).filter(x => x.km <= SP.near).sort((a, b) => a.km - b.km || String(a.st.id).localeCompare(String(b.st.id)));
  const kept = [];
  for (const x of all) {
    if (skip.has(spId(x.st))) continue;
    const same = kept.find(y => y.st.k === x.st.k && tpLine(y.st, x.st) <= SP.side && (x.st.lines || []).every(l => (y.st.lines || []).some(m => spKey(m) === spKey(l))));
    if (same) continue;
    kept.push(x); if (kept.length >= max) break;
  }
  return kept.map(x => ({ st: x.st, km: x.km, walk: spWalk(x.km) }));
}

// What the host types: every word of the query somewhere in the name (accents and capitals aside, tpFold), ranked by kind
// (spRank), then a name that starts with the query before one that only holds it, then the distance from the house. A
// stop the guide has is listed, with has: true. [{ st, km, walk, has }].
export function spFind(q, house, stops, { have = [], max = 8 } = {}) {
  const f = tpFold(q), words = f.split(' ').filter(Boolean); if (f.replace(/ /g, '').length < 2 || !Array.isArray(stops)) return [];
  const own = new Set(have), placed = tpPlaced(house), hits = [];
  for (const st of stops) {
    const n = tpFold(st.n); if (!words.every(w => n.includes(w))) continue;
    hits.push({ st, km: placed ? spRoad(house, st) : null, starts: n.startsWith(f) ? 0 : 1 });
  }
  hits.sort((a, b) => spRank(a.st.k) - spRank(b.st.k) || a.starts - b.starts || (a.km != null && b.km != null ? a.km - b.km : 0) || String(a.st.n).localeCompare(String(b.st.n)));
  return hits.slice(0, max).map(h => ({ st: h.st, km: h.km, walk: h.km == null ? null : spWalk(h.km), has: own.has(spId(h.st)) }));
}

// What a new guide gets by itself, at most 4, metro and rail, then tram, then bus: the nearest metro or rail stop within
// 1.2 km by road, and a second within it with a line the first has not; the nearest tram stop within 1 km; bus stops within
// 600 m, the nearest and then only one adding a line no picked stop has, 1 when a metro, rail or tram stop was picked,
// else 2; nothing at all: the nearest bus stop within 3 km, alone. The design, 16 Nov 2026. [{ st, km }].
export function spPick(house, stops) {
  if (!tpPlaced(house) || !Array.isArray(stops)) return [];
  const all = stops.map(st => ({ st, km: spRoad(house, st) })).sort((a, b) => a.km - b.km || String(a.st.id).localeCompare(String(b.st.id)));
  const keys = new Set(), out = [], add = x => { out.push(x); (x.st.lines || []).forEach(l => keys.add(spKey(l))); }, adds = x => (x.st.lines || []).some(l => !keys.has(spKey(l)));
  const heavy = all.filter(x => (x.st.k === 'metro' || x.st.k === 'rail') && x.km <= SP.metro);
  if (heavy[0]) { add(heavy[0]); const second = heavy.slice(1).find(adds); if (second) add(second); }
  const tram = all.find(x => x.st.k === 'tram' && x.km <= SP.tram); if (tram) add(tram);
  const nBus = out.length ? 1 : 2;
  for (const x of all.filter(y => y.st.k === 'bus' && y.km <= SP.bus)) { if (out.filter(y => y.st.k === 'bus').length >= nBus) break; if (!out.some(y => y.st.k === 'bus') || adds(x)) add(x); }
  if (!out.length) { const b = all.find(x => x.st.k === 'bus' && x.km <= SP.near); if (b) add(b); }
  return out.slice(0, 4);
}

// The stop as content/transport.json holds a station (its _doc): on foot when 25 minutes or less, else by car; its lines
// (every one, with how often) and its badges (the lines with a code); credited to its source. No to, no tag.
export function spEntry(st, house, source, langs) {
  const ls = langs && langs.length ? langs : ['en'], all = f => Object.fromEntries(ls.map(l => [l, f(l)]));
  const km = tpPlaced(house) ? spRoad(house, st) : 0, walk = spWalk(km), src = source || {};
  const lines = (st.lines || []).map(l => ({ ...(l.t ? { t: l.t } : {}), n: l.n, ...(l.c ? { c: l.c, ink: !!l.ink } : {}), f: l.f }));
  return { id: spId(st), mode: st.k === 'rail' ? 'train' : st.k, name: all(() => st.n), lat: st.lat, lng: st.lng, km,
    ...(km && walk <= SP.walkMax ? { walk } : { min: cmMin(Math.max(1, Math.round(km))) }), what: all(() => ''),
    link: src.link || '', linkKey: 'timetable', badges: lines.filter(l => l.t).map(l => ({ t: l.t, ...(l.c ? { c: l.c, ink: l.ink } : {}) })), lines,
    src: { from: src.id || String(st.id).split(':')[0], by: src.credit || '', at: src.updated || '', ...(src.via ? { via: src.via } : {}) } };   // via 'mitrams': the national access point, "Powered by MITRAMS" on Sources and credits
}
