// "From your picture": a host's picture (a photo, a logo, the artistic cover) gives a guide its colours, under the same
// rule as the ready-made worlds (Yohann, 10 Nov 2026: a host can still bring a picture, or the artistic rendering of
// one, "and use its colours under the same contrast rules"; plan-ca-la-kimberly-through-the-maker.md, proposal 4).
//
// The rule, in two steps:
//   1. swatches(): the picture's own colours, as families of hue, each with its share of the picture. Greys, near
//      white and near black are not colours. A family is named by its most vivid pixels: the pool's blue, not the
//      haze around it.
//   2. worldFromPicture(): each family, biggest first, takes the role of a ready-made world whose colour it is closest
//      to in hue, and gives that role its own hue and fullness at the role's lightness (a sky blue becomes a deep
//      blue under white text, a stone ochre a sand under dark text). The world is the one the picture fills best,
//      its main colour (deep) first. The roles the picture does not fill keep the world's colours, quietened when the
//      picture is a quiet one; the world's paper, text colour and fonts stay.
// What keeps a guide readable and sane whatever the picture:
//   - a role only moves a limited way round the colour wheel (LIMIT), so the five roles stay apart as in the world;
//   - strong (Emergencies) stays red: it only takes a real red (the first try, 10 Nov 2026, let a farmhouse's ochre
//     take it and Emergencies went brown), and fresh ("Open") only a green;
//   - two tiles never end up one colour (twins), and no role goes quieter than Stone's;
//   - a picture with no colour of its own (black and white) gives Stone as it is;
//   - the result is a palette like any other: worldTokens() then applies the contrast rule to it.
// What a guide keeps (theme.world): { base: 'stone', deep: '#2F5478', warm: '#E3CB98' }, the world's id and the roles
// that are no longer the world's own (worlds.js worldOf). Pure: no DOM. The maker reads a picture's pixels from a
// canvas. The same picture always gives the same world.
import { WORLDS } from './worlds.js';

const PICKS = ['deep', 'strong', 'fresh', 'light', 'warm'];

// sRGB (0 to 255) to OKLab and back (Björn Ottosson's OKLab, 2020): a space where equal steps look equal, so "closest
// in hue" and "as strong as" mean what an eye would say.
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
function oklab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function srgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const deg = (a, b) => (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
const turn = (h, k) => Math.min(Math.abs(h - k), 360 - Math.abs(h - k));   // the way between two hues, in degrees

// A hex colour as [lightness 0 to 1, strength (chroma, 0 to about 0.3), hue in degrees], and back. A colour too strong
// for a screen at that lightness loses strength until it fits, never its hue.
export function oklch(colour) {
  const s = String(colour).replace(/^#/, ''), [L, a, b] = oklab(...[0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)));
  return [L, Math.hypot(a, b), deg(a, b)];
}
const at = (L, C, h) => srgb(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));
const shown = v => v.every(x => x >= -0.0005 && x <= 1.0005);
// The strongest a hue can be on a screen at a lightness.
function most(L, h, top = 0.4) {
  if (shown(at(L, top, h))) return top;
  let lo = 0, hi = top;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (shown(at(L, mid, h))) lo = mid; else hi = mid; }
  return lo;
}
export function fromOklch(L, C, h) {
  return '#' + at(L, most(L, h, C), h).map(v => Math.max(0, Math.min(255, Math.round(gam(Math.max(0, Math.min(1, v)))))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// How full a colour is, from 0 (grey) to 1 (the strongest its hue can be at its lightness). A pale sky and a dark
// navy are both full colours although neither is strong in absolute terms: moved to a role's lightness, each keeps
// its fullness, as a painter darkening or lightening a colour would.
const full = (L, C, h) => { const m = most(L, h); return m > 0.005 ? Math.min(1, C / m) : 0; };

// The picture's own colours. `data`: its pixels as r, g, b(, a) bytes in a row (a canvas's getImageData at about
// 96 x 96, drawn on white so a transparent logo reads as on paper), `step` 4 with alpha, 3 without.
// Gives up to five families, biggest first: { colour, h, c, l, full, share }: the family's colour, its hue, strength,
// lightness and fullness, and share, its part of all the picture's coloured area (a pale pixel counting for part of
// one), from 0 to 1. A family under 4% is left out.
const BINS = 36, NEAR = 3;   // 10 degrees a bin; a family reaches at most 30 degrees each side of its peak
const FULL = 0.1;            // a pixel this strong or stronger counts as one; a paler one (a hazy sky) as its part of it
export function swatches(data, step = 4) {
  const w = new Float64Array(BINS), sum = Array.from({ length: BINS }, () => [0, 0, 0, 0]);
  let all = 0;
  for (let i = 0; i + 2 < data.length; i += step) {
    const [L, a, b] = oklab(data[i], data[i + 1], data[i + 2]), C = Math.hypot(a, b);
    if (C < 0.03 || L < 0.18 || L > 0.96) continue;   // grey, near black, near white
    const k = Math.floor(deg(a, b) / (360 / BINS)) % BINS;
    const area = Math.min(C, FULL) / FULL, vivid = C ** 3;   // its part of the picture; its say in the family's colour
    w[k] += area; all += area; sum[k][0] += vivid * a; sum[k][1] += vivid * b; sum[k][2] += vivid * L; sum[k][3] += vivid;
  }
  if (!all) return [];
  const smooth = Array.from(w, (_, k) => (w[(k + BINS - 1) % BINS] + 2 * w[k] + w[(k + 1) % BINS]) / 4), free = new Set(smooth.keys()), out = [];
  while (free.size && out.length < 5) {
    const peak = [...free].reduce((p, k) => (smooth[k] > smooth[p] ? k : p)), bins = [peak];
    for (const dir of [1, BINS - 1]) for (let n = 1, last = peak; n <= NEAR; n++) {   // down each slope, while it goes down
      const k = (peak + dir * n) % BINS; if (!free.has(k) || smooth[k] > smooth[last]) break; bins.push(k); last = k;
    }
    bins.forEach(k => free.delete(k));
    const weight = bins.reduce((s, k) => s + w[k], 0); if (weight / all < 0.04) { if (smooth[peak] <= 0) break; continue; }
    const vivid = bins.reduce((s, k) => s + sum[k][3], 0), [a, b, L] = [0, 1, 2].map(i => bins.reduce((s, k) => s + sum[k][i], 0) / vivid), c = Math.hypot(a, b), h = deg(a, b);
    out.push({ colour: fromOklch(L, c, h), h, c, l: L, full: full(L, c, h), share: weight / all });
  }
  return out.sort((x, y) => y.share - x.share);
}

// How far round the wheel a role may move from the world's own colour to take a picture's, in degrees.
const LIMIT = { deep: 40, strong: 22, fresh: 45, light: 30, warm: 35 };
const RED = f => (f.h >= 350 || f.h <= 40) && f.c >= 0.08;   // a real red: pink-red to brick, not a brown or an orange
const GREEN = f => f.h >= 105 && f.h <= 205;                  // olive green to teal
const allowed = (role, f) => (role !== 'strong' || RED(f)) && (role !== 'fresh' || GREEN(f));
// The least full a role may become when the picture is a quiet one: Stone's own level, where red still reads as red.
const QUIET = { deep: 0.3, strong: 0.55, fresh: 0.4, light: 0.33, warm: 0.4 };
const RED_FULL = 0.7;   // the least full a red of the picture's is as strong
const MAIN = 1.5, LEAD = 0.2;   // deep's weight in the choice of a world; how much fuller than the picture the rest may be
const TWINS = [['light', 'warm'], ['deep', 'fresh'], ['deep', 'strong'], ['fresh', 'strong']], ALIKE = 0.05;   // OKLab distance under which two tiles are twins
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const apart = (x, y) => { const [L1, C1, h1] = oklch(x), [L2, C2, h2] = oklch(y), r = Math.PI / 180;
  return Math.hypot(L1 - L2, C1 * Math.cos(h1 * r) - C2 * Math.cos(h2 * r), C1 * Math.sin(h1 * r) - C2 * Math.sin(h2 * r)); };

// The world a picture's colours make: { base, ...its own roles }. `sw` is swatches()'s answer.
export function worldFromPicture(sw) {
  if (!sw.length) return { base: 'stone' };
  const fullness = sw.reduce((s, f) => s + f.share * f.full, 0) / sw.reduce((s, f) => s + f.share, 0);
  let best = null;
  for (const [base, world] of Object.entries(WORLDS)) {
    const roles = Object.fromEntries(PICKS.map(r => [r, oklch(world[r])])), took = {};
    let score = 0;
    for (const f of sw) {
      const r = PICKS.filter(k => !took[k] && allowed(k, f) && turn(f.h, roles[k][2]) <= LIMIT[k]).sort((x, y) => turn(f.h, roles[x][2]) - turn(f.h, roles[y][2]))[0];
      if (!r) continue;
      // How well it sits there: near in hue, near in fullness (a pool's blue is no nearer Stone's slate than Sea's
      // blue for sharing its hue). deep counts more: it is the guide's main colour, the widest tile and the links,
      // so a picture's colour that can be it makes a world the picture's own.
      took[r] = f; score += f.share * (1 - 0.5 * turn(f.h, roles[r][2]) / LIMIT[r]) * (1 - 0.5 * Math.abs(f.full - full(...roles[r]))) * (r === 'deep' ? MAIN : 1);
    }
    // Between worlds the picture fills as well, the one nearest its character: a quiet picture, a quiet world.
    score -= 0.3 * Math.abs(fullness - PICKS.reduce((s, r) => s + full(...roles[r]), 0) / PICKS.length);
    if (!best || score > best.score) best = { base, world, roles, took, score };
  }
  // A role the picture fills: the family's hue and fullness at the role's lightness. deep may follow a darker colour
  // down (a navy stays a navy), light and warm a paler one up (a pale sand stays pale), within what a tile can be.
  // strong is never duller than Country's red: a dusty red from a photo still has to say Emergencies.
  const own = r => { const [L] = best.roles[r], f = best.took[r], l = r === 'deep' ? clamp(f.l, 0.33, L) : r === 'light' || r === 'warm' ? clamp(f.l, L, 0.88) : L;
    // Darkened, a colour looks duller than it was (a pool's bright blue turned a slate): it gains fullness as it
    // goes down, so it is still seen as that blue. A colour already as dark as the role (a logo's) stays exactly itself.
    const kept = l < f.l ? f.full ** (l / f.l) : f.full;
    return fromOklch(l, Math.max((r === 'strong' ? Math.max(kept, RED_FULL) : kept) * most(l, f.h), 0.04), f.h); };
  // A role it does not fill: the world's colour, at most a little fuller than the picture is, so the picture's
  // colours lead and the rest steps back beside them (a quiet photo beside Bauhaus's full red and yellow was a
  // patchwork). Never quieter than Stone.
  const rest = r => { const [L, C, h] = best.roles[r], was = full(L, C, h), now = Math.min(was, Math.max(fullness + LEAD, QUIET[r]));
    return now < was - 0.05 ? fromOklch(L, now * most(L, h), h) : best.world[r]; };
  const out = { base: best.base }, took = { ...best.took };
  const colour = r => (took[r] ? own(r) : rest(r));
  // Twins: two tiles of one kind (white text, or dark text) so alike they read as one colour. The smaller family
  // gives its role back to the world; looked at again until nothing changes (the world's colour may be a twin too).
  for (let again = true; again;) {
    again = false;
    for (const [x, y] of TWINS) {
      if (apart(colour(x), colour(y)) >= ALIKE || (!took[x] && !took[y])) continue;
      delete took[!took[y] || (took[x] && took[x].share < took[y].share) ? x : y]; again = true;
    }
  }
  for (const r of PICKS) { const c = colour(r); if (c !== best.world[r]) out[r] = c; }
  return out;
}
