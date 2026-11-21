// Which train stations a house gets, and a station as a guide holds it (README.md beside this file, "The stations found"):
// one rule in one place, read by the generator (engine/scripts/stations-of.mjs) and pasted into the maker by
// onboarding-site/src/build.py (the export words taken out). Pure: no DOM, no imports. The data is our file of Spain's
// stations (onboarding-site/stations-es.json, written by onboarding-site/src/stations.py from Renfe's open timetables).
// Tested in engine/scripts/transport-pick.test.mjs. Every name here starts with tp (or is pickStations, stationEntry,
// cmMin), since the maker's page holds it among its own.

export const TP = {
  near: 60,      // km: a station farther than this from the house is not one of its stations
  trains: 12,    // direct trains a day to the city: trains all day
  beat: 10,      // minutes: the quicker station is kept only when it beats the nearest by this much, door to city
  alone: 30,     // km: with no station of the rule, the nearest station this close, alone
  dests: 4,      // journey times written for a station: its city first, then the cities with the most direct trains
  same: 0.5,     // km: a station of the guide this close to one of our file is that station (tpHave)
  city: 4,       // km: a house this close to one of its city's own stations is in the city (pickStations, stationEntry)
  walk: 25,      // minutes: a station this near is said on foot, as a stop is (stops.js)
};
export const TP_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
// The two words of each role (the verdict, `tag`), which the host may change. The design, 16 Nov 2026.
export const TP_TAG = {
  near: { en: 'Closest', es: 'La más cercana', fr: 'La plus proche', ca: 'La més propera', de: 'Am nächsten', nl: 'Dichtstbij' },
  quick: { en: 'Faster', es: 'Más rápida', fr: 'Plus rapide', ca: 'Més ràpida', de: 'Schneller', nl: 'Sneller' },
  fast: { en: 'High speed', es: 'Alta velocidad', fr: 'Grande vitesse', ca: 'Alta velocitat', de: 'Hochgeschwindigkeit', nl: 'Hogesnelheid' },
  main: { en: 'Main station', es: 'Estación principal', fr: 'Gare principale', ca: 'Estació principal', de: 'Hauptbahnhof', nl: 'Hoofdstation' },
};
// The words a station's role is given: a quicker station that also has high speed trains is said "High speed" (the
// coordinator's review, 16 Nov 2026: inland, Camp de Tarragona came out "Faster"); the rule itself is unchanged.
export const tpTagOf = (st, role) => role === 'quick' && st && st.hs ? 'fast' : role;
const TP_RODALIES = 'https://rodalies.gencat.cat/ca/horaris/', TP_RENFE = 'https://www.renfe.com/';

// A position a house can have: two numbers, not both 0.
export const tpPlaced = p => !!p && p.lat != null && p.lng != null && p.lat !== '' && p.lng !== '' && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && !(+p.lat === 0 && +p.lng === 0);
// The straight line between two positions, in km (not rounded).
export function tpLine(a, b) {
  const R = 6371, r = x => +x * Math.PI / 180, x = Math.sin((r(b.lat) - r(a.lat)) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin((r(b.lng) - r(a.lng)) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// km by road as the maker says it elsewhere (/api/places, towns.js): 1.3 times the line, at least 1 km.
// dp: decimals (0 by default: whole km, at least 1; a stop on foot keeps 2: 0.23 km, at least 0.01). One formula, any precision.
export const tpRoadKm = (line, dp = 0) => { const f = 10 ** dp; return Math.max(1 / f, Math.round(line * 1.3 * f) / f); };
// Minutes by car from the house, from the km by road: the maker's first guess, which the host can change (moved here from
// onboarding-site/src/editor.js on 16 Nov 2026, so that the generator and the maker keep one formula).
export const cmMin = km => km ? Math.max(2, Math.round(km * 1.1 + 1)) : 0;
// Minutes on foot from the km by road, 12 minutes a km (the stops' formula, stops.js spWalk), and a place's minutes on foot
// from the straight line when it is TP.walk or less, else null: said on foot, not by car (21 Nov 2026: a station 300 m
// from a house in a city read "2 min by car").
export const tpWalk = km => Math.max(1, Math.round(km * 12));
export const tpFoot = line => { const w = tpWalk(tpRoadKm(line, 2)); return w <= TP.walk ? w : null; };
// Minutes by car guessed from the straight line, for the door to city time of the rule only (as Ca La Kimberly's three read).
export const tpDoor = line => Math.round(line * 1.6);
// A journey time as the guides write it: "50 min", "1 h 25", "2 h".
export const tpTime = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;

// The city a house's stations are judged by: the main city station nearest to the house in a straight line.
export function tpCity(house, data) {
  if (!tpPlaced(house) || !data || !Array.isArray(data.cities)) return null;
  let best = null, bk = Infinity;
  for (const c of data.cities) { if (!c.main) continue; const k = tpLine(house, c); if (k < bk) { best = c; bk = k; } }
  return best;
}
const tpToCity = (st, city) => (st.to || []).find(x => x.id === city.id);
// A house in its city (21 Nov 2026): within TP.city km, in a straight line, of one of the city's own stations (`ids`: Sants;
// Madrid's three; València's two). Its trains are a city guest's, not a commuter's: see pickStations and stationEntry.
const tpOwn = (st, city) => (city.ids || []).map(String).includes(String(st.id));
export function tpInCity(house, data) {
  const city = tpCity(house, data); if (!city || !Array.isArray(data.stations)) return false;
  return data.stations.some(st => tpOwn(st, city) && Number.isFinite(st.lat) && Number.isFinite(st.lng) && tpLine(house, st) <= TP.city);
}

// Up to three stations for a house, each with its role: [{ st, role, km }] (km: the straight line), in this order:
//   near: the nearest station within TP.near km with TP.trains or more direct trains a day to the city;
//   quick: among those, the lowest door to city time (tpDoor + the station's usual time), when it beats near's by TP.beat;
//   fast: the nearest of those with high speed trains, when it is neither of the two.
// None of those: the nearest station within TP.alone km, alone, as near. No position, no file: nothing.
// A house in its city (tpInCity) is not judged by the trains to that city, which it is already in: it gets the station
// nearest to it (near) and the city's main station (main: the nearest of the city's own stations with high speed trains,
// else the nearest of them), one station when they are the same. Before 21 Nov 2026 the rule above gave the centre of
// València a station with one line, since the city's own stations have no train "to the city".
export function pickStations(house, data) {
  const city = tpCity(house, data); if (!city || !Array.isArray(data.stations)) return [];
  const all = data.stations.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng)).map(st => ({ st, km: tpLine(house, st) }))
    .sort((a, b) => a.km - b.km || String(a.st.id).localeCompare(String(b.st.id)));
  const own = all.filter(x => tpOwn(x.st, city));
  if (own.length && own[0].km <= TP.city) {
    const near = all[0], main = own.find(x => x.st.hs) || own[0];
    return near.st === main.st ? [{ st: near.st, role: 'near', km: near.km }] : [{ st: near.st, role: 'near', km: near.km }, { st: main.st, role: 'main', km: main.km }];
  }
  const cand = all.filter(x => x.km <= TP.near && (tpToCity(x.st, city) || {}).n >= TP.trains);
  if (!cand.length) { const n = all[0]; return n && n.km <= TP.alone ? [{ st: n.st, role: 'near', km: n.km }] : []; }
  const door = x => tpDoor(x.km) + tpToCity(x.st, city).min;
  const near = cand[0], out = [{ st: near.st, role: 'near', km: near.km }];
  const quick = cand.reduce((b, x) => door(x) < door(b) ? x : b, near);
  if (quick !== near && door(near) - door(quick) >= TP.beat) out.push({ st: quick.st, role: 'quick', km: quick.km });
  const fast = cand.find(x => x.st.hs);
  if (fast && !out.some(o => o.st === fast.st)) out.push({ st: fast.st, role: 'fast', km: fast.km });
  return out;
}

// A station's name in a language, with the word "station" as Ca La Kimberly's names have it ("Gare d'El Vendrell",
// "Estació del Vendrell").
const TP_VOWEL = /^[aeiouàáâèéêìíîòóôùúûh]/i;
export function tpName(n, l) {
  if (l === 'en') return `${n} station`;
  if (l === 'es') return `Estación de ${n}`;
  if (l === 'fr') return `Gare ${/^[aeiouàáâèéêìíîòóôùúû]/i.test(n) ? "d'" : 'de '}${n}`;
  if (l === 'ca') return `Estació ${/^El /.test(n) ? 'del ' + n.slice(3) : /^Els /.test(n) ? 'dels ' + n.slice(4) : /^L'/.test(n) ? "de l'" + n.slice(2) : /^La /.test(n) ? 'de la ' + n.slice(3) : TP_VOWEL.test(n) ? "d'" + n : 'de ' + n}`;
  if (l === 'de') return `Bahnhof ${n}`;
  if (l === 'nl') return `Station ${n}`;
  return n;
}
const tpL = (langs, f) => Object.fromEntries(langs.map(l => [l, f(l)]));
// Rodalies lines (Catalonia's suburban trains: R and a number, RG1, RL3, RT1) have their own timetables.
const tpIsRodalies = b => /^R[GLT]?\d/.test(b.t || '');

// The station as content/transport.json holds it (its _doc), from our file: no Google id, no Google position. role:
// 'near', 'quick', 'fast', 'main', or null (a station the host added: no verdict yet). langs: the guide's languages.
// On foot (`walk`, no `min`) when TP.walk minutes or less, else by car (`min`). A house in its city gets no journey time
// to that city ("Barcelona Sants 4 min" from Passeig de Gràcia tells a guest nothing).
export function stationEntry(st, house, role, data, langs) {
  const ls = (langs && langs.length ? langs : ['en']).filter(l => TP_LANGS.includes(l));
  const placed = tpPlaced(house), km = placed ? tpRoadKm(tpLine(house, st)) : 0, city = tpCity(house, data);
  const walk = placed ? tpFoot(tpLine(house, st)) : null, inCity = !!city && tpInCity(house, data);
  const cities = new Map(((data && data.cities) || []).map(c => [c.id, c]));
  const to = (st.to || []).filter(x => cities.has(x.id) && !(inCity && x.id === city.id))
    .sort((a, b) => (city && b.id === city.id) - (city && a.id === city.id) || b.n - a.n || a.min - b.min || a.id.localeCompare(b.id)).slice(0, TP.dests)
    .map(x => { const c = cities.get(x.id); return { dest: tpL(ls, l => (c.i18n || {})[l] || c.name), time: tpTime(x.min), note: tpL(ls, () => '') }; });
  const badges = (st.lines || []).map(b => ({ t: b.t, c: b.c, ink: !!b.ink }));
  return { id: 'st' + st.id, mode: 'train', name: tpL(ls, l => tpName(st.name, l)), lat: st.lat, lng: st.lng, km, ...(walk ? { walk } : { min: cmMin(km) }),
    tag: tpL(ls, l => { const r = tpTagOf(st, role); return r && TP_TAG[r] ? TP_TAG[r][l] : ''; }), what: tpL(ls, () => ''),
    link: badges.some(tpIsRodalies) ? TP_RODALIES : TP_RENFE, linkKey: 'timetable', badges, to,
    src: { from: 'renfe', at: (data && data.source && data.source.updated) || '' } };
}

// A house's stations as a guide holds them: the rule's stations, with their verdict; one station alone has none.
export function stationsFor(house, data, langs) {
  const p = pickStations(house, data);
  return p.map(x => stationEntry(x.st, house, p.length > 1 ? x.role : null, data, langs));
}

// The rule's stations a guide does not have yet, for the maker's "Near your house": [{ st, km (by road), walk, role }],
// walk the minutes on foot when near enough (else null), role null when the rule gives one station alone (stationsFor
// gives it no verdict either).
export function tpNear(house, data, stations) {
  const p = pickStations(house, data); if (!p.length) return [];
  const have = new Set(tpHave(data, stations));
  return p.filter(x => !have.has('st' + x.st.id)).map(x => ({ st: x.st, km: tpRoadKm(x.km), walk: tpFoot(x.km), role: p.length > 1 ? x.role : null }));
}
// The station of our file nearest to the house, within TP.near km (the maker's example in its field), or null: a house
// outside Spain gets no example from across the border.
export function tpNearest(house, data) {
  if (!tpPlaced(house) || !data || !Array.isArray(data.stations)) return null;
  let best = null, bk = TP.near;
  for (const st of data.stations) { const k = tpLine(house, st); if (k <= bk) { best = st; bk = k; } }
  return best;
}

// iryo and Ouigo (Yohann, 16 Nov 2026; README.md rules 25 to 29): Renfe's files do not hold these two companies, so the
// worker looks up each one's whole list of stations on request and keeps it in a shared record (worker/rail-brands.mjs,
// table rail_brands: one row per company, { brand, stations: Renfe ids, checked_at, tried_at }). This rule puts their
// badges on a guide's station from those rows. Pure, as the rest of this file.
export const TP_BRANDS = ['iryo', 'ouigo'];   // in this order on a station
const tpDay = x => { const d = x ? new Date(x) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
// A station of a guide from our file ("st" + Renfe's id, src.from 'renfe'): its badges without those marked by: 'brand',
// then one badge per company whose row lists it (name and colour from brands.json), and brands: { at } (the newest
// checked_at among the rows used). Not from our file, or no row at all: untouched. A row with no sure search yet
// (checked_at null) adds nothing and removes nothing: that company's badge stays as it was. brands: brands.json's list.
export function tpBrandBadges(st, rows, brands) {
  if (!st || !st.src || st.src.from !== 'renfe' || !/^st./.test(String(st.id || ''))) return st;
  const R = (rows || []).filter(r => r && TP_BRANDS.includes(r.brand)); if (!R.length) return st;
  const id = String(st.id).slice(2), old = st.badges || [], byName = new Map((brands || []).map(b => [String(b.t).toLowerCase(), b]));
  const out = old.filter(b => !(b && b.by === 'brand')); let at = '';
  for (const k of TP_BRANDS) {
    const r = R.find(x => x.brand === k), b = byName.get(k), was = old.find(x => x && x.by === 'brand' && String(x.t).toLowerCase() === k);
    if (!r || !r.checked_at) { if (was) out.push(was); continue; }
    const d = tpDay(r.checked_at); if (d > at) at = d;
    if (b && (r.stations || []).map(String).includes(id)) out.push({ t: b.t, c: b.c, ink: !!b.ink, by: 'brand' });
  }
  if (!at) return st;
  return { ...st, badges: out, brands: { at } };
}
// A company's row wants a new search: none yet, or its last sure one (checked_at) is older than 30 days; but not when a
// search was tried in the last 7 days (tried_at), so that an unsure one is not repeated on every request.
export function tpBrandsStale(row, now = new Date()) {
  const n = +new Date(now), age = x => { const t = x ? Date.parse(x) : NaN; return Number.isFinite(t) ? n - t : Infinity; };
  if (row && age(row.checked_at) <= 30 * 864e5) return false;
  return !(row && age(row.tried_at) < 7 * 864e5);
}

// The stations of our file a guide already has, as tpFind's `have`: by their id ("st" + Renfe's), or a train station of the
// guide within TP.same km of it (a station written by hand, as Ca La Kimberly's, is the same station under another id).
export function tpHave(data, stations) {
  const ids = new Set((stations || []).map(s => s && s.id).filter(Boolean));
  const placed = (stations || []).filter(s => s && !['bus', 'metro', 'tram'].includes(s.mode) && tpPlaced(s));   // train stations only: a metro stop beside one is another thing
  if (data && Array.isArray(data.stations) && placed.length) for (const st of data.stations) if (placed.some(s => tpLine(s, st) <= TP.same)) ids.add('st' + st.id);
  return [...ids];
}

// The maker's "Type a train station": the stations whose name matches what was typed, best first, at most max:
// [{ st, km, walk }] (km by road, null with no house position; walk: minutes on foot when near enough). Accents, capitals and punctuation aside, from 2 letters; the
// whole name, then a name that starts with it, then a word that starts with it; in each, the nearest to the house first.
// have: the ids already in the guide ("st" + Renfe's id), never offered again.
export const tpFold = s => String(s || '').replace(/[·‧]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function tpFind(data, typed, house, have = [], max = 5) {
  const q = tpFold(typed); if (q.replace(/ /g, '').length < 2 || !data || !Array.isArray(data.stations)) return [];
  const skip = new Set(have), placed = tpPlaced(house), hits = [];
  for (const st of data.stations) {
    if (skip.has('st' + st.id)) continue;
    const f = tpFold(st.name);
    const tier = f === q ? 0 : f.startsWith(q) ? 1 : (' ' + f).includes(' ' + q) ? 2 : -1;
    if (tier < 0) continue;
    hits.push({ st, tier, line: placed ? tpLine(house, st) : null });
  }
  hits.sort((a, b) => a.tier - b.tier || (a.line != null && b.line != null ? a.line - b.line : 0) || a.st.name.localeCompare(b.st.name));
  return hits.slice(0, max).map(h => ({ st: h.st, km: h.line == null ? null : tpRoadKm(h.line), walk: h.line == null ? null : tpFoot(h.line) }));
}
