// The country a house is in, from its position: for the launch desk's rule (engine/src/modules/available.js: what is on
// in which country). Pure: it is given our file of the countries' outlines (onboarding-site/countries.json, made by
// onboarding-site/src/countries.py from Natural Earth, public domain, ours to keep) and asks no one. Used as it is by the
// maker (pasted by onboarding-site/src/build.py) and the generator (engine/scripts/country-of.mjs).
//   countriesPrep(data)        the file made ready, once: [{ cc, box: [w, s, e, n], ring: [lng, lat, lng, lat...] }], one
//                              per outline, in hundredths of a degree as the file keeps them.
//   countryAt(prep, lat, lng)  two capital letters, or '' when the position is no country's (the open sea, no position).
//   countrySpot(lat, lng)      the position as the words a country is kept with, '' with no position.
// The outline that holds the position names the country; when several do (a country inside another: holes are not
// kept), the smallest wins. A house on the shore may sit just off a simplified coast: then the nearest outline within
// 25 km. The outlines are drawn for a map of the world, and were found up to about 3 km off the true border (measured on
// 26 border towns of Spain, France, Portugal and Andorra, 21 Nov 2026): so a position within 6 km of another country's
// outline is no country's, '' (not known), never a guess. The launch desk's rule cuts nothing for a house whose country
// is not known. What this cannot tell: a town that is an island of its country inside another (Llívia), which the file
// does not draw, and the smallest countries, which are all border (Monaco, San Marino); Gibraltar has no outline of its
// own and reads as Spain, the Vatican as Italy. Natural Earth's 1:10m file would narrow all of this: for the day a small country is launched.
// An outline smaller than about 10 km by 10 km (the Vatican, Monaco) casts no doubt on what is around it: Rome is Italy.
const NEAR_KM = 25, BORDER_KM = 6, TINY = 100;
// A position as the words a country is kept with ("41.235,1.811", about 100 m): a country read once stays the house's
// while its position says the same (the maker's answers `country` and `_countryAt`, the worker, the generator).
export function countrySpot(lat, lng) { return (lat === null || lng === null || lat === '' || lng === '' || lat === undefined || lng === undefined || !Number.isFinite(+lat) || !Number.isFinite(+lng)) ? '' : (+lat).toFixed(3) + ',' + (+lng).toFixed(3); }
export function countriesPrep(data) {
  const out = [];
  for (const [cc, rings] of (data && data.rows) || []) for (const d of rings) {
    const ring = new Array(d.length); let x = 0, y = 0, w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (let i = 0; i < d.length; i += 2) { x += d[i]; y += d[i + 1]; ring[i] = x; ring[i + 1] = y; if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
    out.push({ cc, box: [w, s, e, n], ring });
  }
  return out;
}
const inside = (ring, x, y) => { let c = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c; };
// How far a position is from an outline, in km (flat earth around the position: fine for a few tens of km).
const awayKm = (ring, x, y) => { const k = Math.cos(y / 100 * Math.PI / 180), px = x * k; let best = Infinity;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const ax = ring[j] * k, ay = ring[j + 1], bx = ring[i] * k, by = ring[i + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (y - ay) * dy) / l)) : 0, d = Math.hypot(px - ax - t * dx, y - ay - t * dy); if (d < best) best = d; }
  return best * 1.1119; };   // a hundredth of a degree of latitude is 1.1119 km
export function countryAt(prep, lat, lng) {
  if (!Array.isArray(prep) || !Number.isFinite(+lat) || !Number.isFinite(+lng) || lat === null || lng === null || lat === '' || lng === '') return '';
  const x = +lng * 100, y = +lat * 100, wide = km => km / 1.1119 / Math.max(0.2, Math.cos(+lat * Math.PI / 180));
  const around = (p, pad) => { const [w, s, e, n] = p.box; return !(x < w - pad || x > e + pad || y < s - pad || y > n + pad); };
  let hit = null, size = Infinity, held = 0;
  for (const p of prep) { if (!around(p, 0) || !inside(p.ring, x, y)) continue; const [w, s, e, n] = p.box, a = (e - w) * (n - s); if (!hit || p.cc !== hit.cc) held++; if (a < size) { hit = p; size = a; } }
  let cc = hit ? hit.cc : '', own = 0;
  if (!hit) { const pad = wide(NEAR_KM); let best = NEAR_KM;
    for (const p of prep) { if (!around(p, pad)) continue; const d = awayKm(p.ring, x, y); if (d < best) { best = d; cc = p.cc; } }
    if (!cc) return ''; own = best; }
  // Too near another country to be sure: its outline within 6 km (from the shore: within 6 km more than our own), or,
  // for a country inside another, its own outline within 6 km.
  if (held > 1 && awayKm(hit.ring, x, y) < BORDER_KM) return '';
  const reach = own + BORDER_KM, pad = wide(reach);
  for (const p of prep) { if (p.cc === cc || !around(p, pad)) continue; const [w, s, e, n] = p.box; if ((e - w) * (n - s) < TINY) continue; if (awayKm(p.ring, x, y) < reach) return ''; }
  return cc;
}
