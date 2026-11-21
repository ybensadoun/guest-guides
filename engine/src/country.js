// The country a house is in, from its position: for the launch desk's rule (engine/src/modules/available.js: what is on
// in which country). Pure: it is given our file of the countries' outlines (onboarding-site/countries.json, made by
// onboarding-site/src/countries.py from Natural Earth, public domain, ours to keep) and asks no one. Used as it is by the
// maker (pasted by onboarding-site/src/build.py) and the generator (engine/scripts/country-of.mjs).
//   countriesPrep(data)        the file made ready, once: [{ cc, box: [w, s, e, n], ring: [lng, lat, lng, lat...] }], one
//                              per outline, in hundredths of a degree as the file keeps them.
//   countryAt(prep, lat, lng)  two capital letters, or '' when the position is no country's (the open sea, no position).
// The outline that holds the position names the country; when several do (a country inside another: holes are not
// kept), the smallest wins. A house on the shore may sit just off a simplified coast: then the nearest outline within
// 25 km. Not for borders to the metre: the outlines are true to about a kilometre.
const NEAR_KM = 25;
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
  const x = +lng * 100, y = +lat * 100; let hit = null, size = Infinity;
  for (const p of prep) { const [w, s, e, n] = p.box; if (x < w || x > e || y < s || y > n) continue;
    const a = (e - w) * (n - s); if (a < size && inside(p.ring, x, y)) { hit = p; size = a; } }
  if (hit) return hit.cc;
  const pad = NEAR_KM / 1.1119 / Math.max(0.2, Math.cos(+lat * Math.PI / 180)); let near = '', best = NEAR_KM;
  for (const p of prep) { const [w, s, e, n] = p.box; if (x < w - pad || x > e + pad || y < s - pad || y > n + pad) continue;
    const d = awayKm(p.ring, x, y); if (d < best) { best = d; near = p.cc; } }
  return near;
}
