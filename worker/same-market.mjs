// The same market, found twice (25 Nov 2026). A build joins two searches of the same area: the full research and the quick
// one made at the link (guide-worker.mjs mergeQuick). Each names a market in its own words, with its own id and its own pin,
// so "La Bisbal del Penedès Wednesday market" came into a guide twice, as `bisbal` at 3 km and `bisbal-penedes` at 4 km
// (Yohann's test build of 25 Nov 2026: twice in What's on, twice on the map). A guide never lists the same market twice,
// whatever the two ids.
//
// Two records are the same market when they are in the same town, of the same kind, on the same days, and their names say
// the same market or their pins are close:
//   - the town: the same words once accents, articles and "de" are gone, or one name the start of the other ("La Bisbal"
//     and "La Bisbal del Penedès"; not "Calafell" and "Segur de Calafell", two places); a record with no town counts only
//     by its pin;
//   - the kind: the same category, when both have one;
//   - the days: the same days of the week in their rows; when a record has no rows, the weekdays its name says must not
//     be other ones ("Tuesday market" is not "Saturday market");
//   - the names: a weekly market's name is its town and its day ("Mercat setmanal", "La Bisbal Wednesday market"), so what
//     counts is a name's own words, the ones left without the town, the weekday and the words for "market" (places.mjs
//     words, the rule a Google listing is matched with; never a second copy). Both names with no word of their own: the
//     same market, unless their pins are further apart than a town is wide (NEAR_TOWN). Both with words of their own: one
//     in common. One with, one without ("Mercat de l'Espirall" beside "Mercat setmanal"): only the pins can say;
//   - the pins: within SAME_SPOT of each other, the distance a market listing is matched at (places.mjs sameMarket).
// Pure: no file, no network. Tests: worker/test/same-market.test.mjs.
import { hav, nameOf, daysOf, words, wdays, WD, sameSort } from './places.mjs';

export const SAME_SPOT = 0.6;   // km: two pins of one market (its square, its street, the town hall beside it)
export const NEAR_TOWN = 3;     // km: as far as two pins of one town's market are put by two searches (the centre, the square)

const plain = s => String(s || '').replace(/­/g, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const names = m => [m.name_local, nameOf(m.name), ...(m.name && typeof m.name === 'object' ? Object.values(m.name) : [])].filter(x => typeof x === 'string' && x.trim());
// A name's own words: not the town's, not a weekday, not "market" in its languages or how often it is held.
const GENERIC = new Set('street weekly daily municipal ambulant mercadillo mercadet mercats markets mercados marches wochenmarkt markt weekmarkt'.split(' '));
const WEEKDAY = new RegExp('^(?:' + WD.source + ')s?$', 'i');
const own = (m, towns) => new Set(names(m).flatMap(n => [...words(n, towns)]).filter(w => !WEEKDAY.test(w) && !GENERIC.has(w)));
const said = m => wdays(names(m).join(' '));
const pinned = m => m && Number.isFinite(+m.lat) && Number.isFinite(+m.lng) && m.lat !== '' && m.lng !== '' && m.lat != null && m.lng != null;
// km between two records' pins; null when one has none.
export const apart = (a, b) => (pinned(a) && pinned(b) ? hav(+a.lat, +a.lng, +b.lat, +b.lng) : null);

const townWords = t => [...words(t, '')];
function sameTown(a, b) {
  const x = townWords(a.town), y = townWords(b.town), [s, l] = x.length <= y.length ? [x, y] : [y, x];
  if (!s.length) return null;   // not said: the pins decide
  return s.every((w, i) => l[i] === w);
}
function sameDays(a, b) {
  const x = daysOf(a.schedule), y = daysOf(b.schedule);
  if (x.length && y.length) return x.length === y.length && x.every(d => y.includes(d));
  const p = said(a), q = said(b);   // a record with no rows: the weekdays the names say, when both say some
  return !(p.size && q.size) || [...p].some(d => q.has(d));
}

export function sameMarket(a, b) {
  if (!a || !b) return false;
  const km = apart(a, b), close = km != null && km <= SAME_SPOT, town = sameTown(a, b);
  if (town === false || (town === null && !close)) return false;
  if (a.category && b.category && a.category !== b.category) return false;
  if (!sameDays(a, b)) return false;
  if (close) return true;
  const towns = plain(`${a.town || ''} ${b.town || ''}`), x = own(a, towns), y = own(b, towns), sorts = names(a).some(n => names(b).some(k => sameSort(n, k)));
  if (!sorts) return false;
  if (!x.size && !y.size) return km == null || km <= NEAR_TOWN;
  return x.size > 0 && y.size > 0 && [...x].some(w => y.has(w));
}

// Nothing there: not set, empty words, an empty list, an object with nothing in it.
const empty = v => v == null || v === '' || (Array.isArray(v) ? !v.length : typeof v === 'object' && !Object.keys(v).length);
// The kept record with what it lacks taken from the other one: never its id, and a pin only whole (both numbers).
export function fillFrom(keep, other) {
  const out = { ...keep };
  for (const [k, v] of Object.entries(other || {})) if (!['id', 'lat', 'lng'].includes(k) && empty(out[k]) && !empty(v)) out[k] = v;
  if (!pinned(out) && pinned(other)) { out.lat = other.lat; out.lng = other.lng; }
  return out;
}

// The quick search's markets joined to the research's file ({ categories, markets }): a market the file already has stays the
// file's own (the research has the hours and the source) and only takes what it lacks; the others are added after it, a
// taken id made its own. Returns { file, added, joined }: the new file (the given one is not changed), how many were
// added, how many were the same market as one already there.
export function joinQuick(file, quick) {
  const o = file && typeof file === 'object' ? file : {}, list = (Array.isArray(o.markets) ? o.markets : []).slice(), ids = new Set(list.map(m => m && m.id));
  let added = 0, joined = 0; const cats = new Set(Array.isArray(o.categories) ? o.categories : []);
  for (const m of Array.isArray(quick) ? quick : []) {
    if (!m || typeof m !== 'object') continue;
    const i = list.findIndex(x => sameMarket(x, m));
    if (i >= 0) { list[i] = fillFrom(list[i], m); joined++; continue; }
    let id = m.id; if (ids.has(id)) { id = m.id + '-near'; for (let n = 2; ids.has(id); n++) id = `${m.id}-near-${n}`; }
    ids.add(id); list.push({ ...m, id }); added++; if (m.category) cats.add(m.category);
  }
  return { file: { ...o, markets: list, ...(Array.isArray(o.categories) ? { categories: [...cats] } : {}) }, added, joined };
}
