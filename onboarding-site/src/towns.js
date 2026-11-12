// Towns as things to do (fault 2 of the acceptance test, 12 Nov 2026: a host typing "Barcelona" was offered the airport and
// a company, never the town, since Google's suggestions are businesses and sights within 50 km). The towns come from our own
// list (onboarding-site/towns-es.json, from GeoNames by src/towns.py: open data, ours to keep, credited "GeoNames"), are
// matched here in the browser's memory, and shown first in the suggestion list of the fields that add a thing to do
// (start.js psType). No 50 km limit: a day trip to Barcelona is a thing to do. Nothing is asked of anyone.
// The rule, in plain words:
//   1. From 2 letters typed. Accents, capitals and punctuation aside ("l'hospi" is "l hospi"), and a leading article
//      ignored on both sides ("la bisbal" and "bisbal" both find "la Bisbal del Penedès").
//   2. The typed text at the start of the town's name or at the start of one of its words ("penedes" finds it too).
//   3. Order: the exact name, then a name that starts with it (with the article typed, if one was, before without), then
//      the rest; in each, the towns around the house first (within 30 km by road, the nearest first: "bisbal" is the
//      host's own la Bisbal del Penedès before a bigger one across the country), then the bigger town first, the nearer
//      when two are as big (and no house position, the name). At most 3.
//   4. Too far for a day out is left out, unless the host typed its whole name ("Madrid"): more than 300 km by road, or
//      more than 100 km for a place of fewer than 5,000 people (nobody sends guests 290 km to a hamlet that only
//      shares the first letters of Barcelona). A population of 0 is one GeoNames does not give (many municipality
//      seats, "la Bisbal del Penedès"): not counted as small.
// A town is told from another of the same name by its province, said on its line; its distance is by road as the build
// estimates it elsewhere, 1.3 times the line from the house (worker/host-places.mjs, /api/places), none with no house position.
// Pasted into the maker by build.py (the export words taken out); tested in worker/test/towns.test.mjs.
export const TW_ARTICLES = new Set('el la los las lo els les l es sa ses s o a os as'.split(' '));
export const TW_CITY = 100000;   // a city from 100,000 people, as featureKind in worker/place-facts.mjs
export const TW_NEAR = 30, TW_FAR = 300;   // km by road: around the house (shown first); a day out at most (farther: only by its whole name)
export const TW_TRIP = 100, TW_BIG = 5000; // beyond 100 km by road only a town of 5,000 people or more is worth the trip
export const twFold = s => String(s || '').replace(/[·‧]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Without its leading article ("la bisbal del penedes": "bisbal del penedes"); a name that is only an article keeps it.
export const twBare = f => { const i = f.indexOf(' '); return i > 0 && TW_ARTICLES.has(f.slice(0, i)) ? f.slice(i + 1) : f; };
// The file as the page holds it: each row with its folded names, ready to match. null when the file is not as expected.
export function twPrep(d) {
  if (!d || !Array.isArray(d.rows) || !Array.isArray(d.provinces)) return null;
  const rows = [];
  for (const r of d.rows) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || !Number.isFinite(r[1]) || !Number.isFinite(r[2])) continue;
    const f = twFold(r[0]); if (!f) continue;
    rows.push({ n: r[0], lat: r[1], lng: r[2], pop: Number.isFinite(r[3]) ? r[3] : 0, prov: typeof d.provinces[r[4]] === 'string' ? d.provinces[r[4]] : '', f, b: twBare(f), w: ' ' + f });
  }
  return { rows, date: typeof d.date === 'string' ? d.date : '', credit: typeof d.credit === 'string' ? d.credit : '' };
}
// By road from the house, as the build says it: 1.3 times the line, at least 1 km. null with no house position.
export function twKm(house, t) {
  const a = house && +house.lat, b = house && +house.lng;
  if (!house || !Number.isFinite(a) || !Number.isFinite(b) || (!a && !b) || !t) return null;
  const R = 6371, r = x => x * Math.PI / 180, x = Math.sin(r(t.lat - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(t.lat)) * Math.sin(r(t.lng - b) / 2) ** 2;
  return Math.max(1, Math.round(2 * R * Math.asin(Math.sqrt(x)) * 1.3));
}
export const twKind = t => (t && t.pop >= TW_CITY ? 'city' : 'town');
// The towns that match what was typed, best first: [{ n, lat, lng, pop, prov, km, kind }], at most max.
export function twFind(T, typed, house = null, max = 3) {
  const rows = T && T.rows; if (!rows) return [];
  const f = twFold(typed), q = twBare(f);
  if (q.replace(/ /g, '').length < 2) return [];
  const hits = [];
  for (const t of rows) {
    // a name that starts with the words as typed, article included ("la ba": la Bañeza), before one that does without it (Badalona)
    const tier = t.f === f || t.b === q ? 0 : f !== q && t.f.startsWith(f) ? 1 : t.f.startsWith(q) || t.b.startsWith(q) ? 2 : t.w.includes(' ' + q) ? 3 : -1;
    if (tier < 0) continue;
    const km = twKm(house, t);
    if (tier > 0 && km != null && (km > TW_FAR || (km > TW_TRIP && t.pop > 0 && t.pop < TW_BIG))) continue;
    hits.push({ t, tier, km, near: km != null && km <= TW_NEAR ? 0 : 1 });
  }
  hits.sort((x, y) => x.tier - y.tier || x.near - y.near || (x.near === 0 ? x.km - y.km : 0) || y.t.pop - x.t.pop || (x.km != null && y.km != null ? x.km - y.km : 0) || x.t.n.localeCompare(y.t.n));
  return hits.slice(0, max).map(({ t, km }) => ({ n: t.n, lat: t.lat, lng: t.lng, pop: t.pop, prov: t.prov, km, kind: twKind(t) }));
}
