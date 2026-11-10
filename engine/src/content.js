// All guest-facing content lives in sites/<site>/content/*.json and is bundled at build time,
// so it works offline. New files are picked up automatically.
import { SITE, FILES as files, PRIVATE } from './site-data.js';
const get = name => files[name];
export { SITE };
// Modules switched off in site.json ("modules": { "events": false }) disappear everywhere: tile, page, map pins.
export const MODULE_ON = id => (SITE.modules || {})[id] !== false && !(id === 'markets' && !((files.markets || {}).markets || []).length);   // markets with nothing found vanish too, no dead-end tile

const DAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
export const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Opening slots, same shape for markets and spots: d = weekdays (0 = Sunday), o/c = open/close.
export const slots = sch => (sch || []).map(x => ({ d: x.days.map(d => DAY[d]), o: x.open, c: x.close, nth: x.week_of_month || 0, m: !!x.hours_approximate_morning, from: x.from, to: x.to }));

// A position Google gave (pos: { from: 'google', at: 'YYYY-MM-DD' }) may be kept 30 days in a row (its terms), and the
// server renews it every week well before that. Only if renewals have failed, or on a phone holding an old copy: past that, or with no readable date, the place is shown as one with no position (nomap: no pin,
// no distance, directions by name) and stays in its list. Compared here, on the phone's own date each time the guide
// opens, so a guide opened offline from the cache drops it too. Our own positions carry no "pos" and never run out.
export const POS_DAYS = 30;
export const posExpired = (it, now = new Date()) => {
  const p = it && it.pos;
  if (!p || p.from !== 'google') return false;
  const d = /^(\d{4})-(\d\d)-(\d\d)$/.exec(p.at || '');
  if (!d) return true;
  return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(+d[1], d[2] - 1, +d[3])) / 864e5) > POS_DAYS;
};
export const located = (it, now) => (posExpired(it, now) ? { ...it, nomap: true, km_from_house: null } : it);
// Every list of places a content file holds (items, stations) goes through located() as it is read.
const locate = d => (d && typeof d === 'object' && (Array.isArray(d.items) || Array.isArray(d.stations))
  ? { ...d, ...(Array.isArray(d.items) ? { items: d.items.map(x => located(x)) } : {}), ...(Array.isArray(d.stations) ? { stations: d.stations.map(x => located(x)) } : {}) } : d);

export const HOUSE = get('house');
// Private values kept out of git (guest Wi-Fi): sites/<site>/private/wifi.json, written locally,
// or at build time from the WIFI_JSON environment variable (see engine/scripts/run.js).
const PRIV_WIFI = PRIVATE.wifi;
if (PRIV_WIFI) HOUSE.wifi = PRIV_WIFI;
const mk = (MODULE_ON('markets') && get('markets')) || { categories: [], markets: [] };
export const CATS = (mk.categories || []).filter(c => (mk.markets || []).some(m => m.category === c));

export const MARKETS = mk.markets.map(x => located(x)).map(m => ({
  ...m,
  kind: 'market',
  cat: m.category,
  km: m.km_from_house,
  groupKey: m.group || m.town,
  groupSlug: slug(m.group || m.town),
  s: slots(m.schedule)
}));

export const SECTIONS = get('sections').sections.filter(s => MODULE_ON(s.id)).map(s => ({ ...s, data: s.kind === 'markets' ? null : locate(get(s.file || s.id)) }));

// Live sections with map points (restaurants, places... and the glass container from garbage)
// share the map with markets. Points from non-"spots" sections are utilities: shown only when zoomed in.
export const SPOT_SECTIONS = SECTIONS.filter(s => s.status === 'live' && s.kind !== 'markets' && s.kind !== 'events' && (s.data?.items || []).length);
export const SPOTS = SPOT_SECTIONS.flatMap(sec => (sec.data?.items || []).map(it => ({
  ...it,
  id: sec.id + '-' + it.id,
  kind: 'spot',
  section: sec.id,
  utility: it.utility ?? sec.kind !== 'spots',
  cat: it.cat || sec.color || sec.id,
  km: it.km_from_house,
  // Map pins group by town. (A spot's `group` is a list filter such as "sights" or "beach", not a place.)
  groupKey: it.mapGroup || it.town,
  groupSlug: slug(it.mapGroup || it.town),
  s: slots(it.schedule)
})));

export const MAP_CATS = [...CATS, ...new Set(SPOTS.map(s => s.cat))];
// The local bar & shop next door (a Home quick tile) also belongs on the map, under Eat.
const QUICK_ON = MODULE_ON('quick');
const QUICK_FILE = QUICK_ON ? locate(get('quick')) : null;
const QSHOP = (QUICK_FILE?.items || []).filter(q => q.id === 'shop' && q.lat && !q.nomap).map(q => ({
  id: 'quick-shop', kind: 'spot', section: 'restaurants', cat: 'restaurants', icon: 'mug', tone: 'green',
  name: q.name, type: q.kind, town: HOUSE.name, km: 0.1, lat: q.lat, lng: q.lng, gid: q.gid,
  description: q.what, hours: q.hours, price: q.price, priceNote: q.priceNote, gmaps: q.gmaps, phone: q.phone || undefined, flags: [], tags: [],
  groupKey: HOUSE.name, groupSlug: slug(HOUSE.name) + '-bar', s: slots(q.schedule)
}));
export const MAP_ITEMS = [...MARKETS.filter(m => !m.nomap), ...SPOTS.filter(s => !s.nomap), ...QSHOP];
export const byId = id => MAP_ITEMS.find(m => m.id === id);

export const GARBAGE = get('garbage');

// Ratings and reviews (content/reviews.json, only when the host switched it on). Live, never curated by hand.
export const REVIEWS = (MODULE_ON('reviews') && get('reviews')) || null;

// One-tap call buttons on Home (pizza, taxi, the shop next door). Items without a phone are hidden.
export const QUICK_ALL = QUICK_FILE?.items || [];
// Getting around (section kind "transport", content/transport.json): taxis, then stations and stops, on their own page.
// Its "tile" puts a one-tap tile at the end of the Home tiles (the section tile then stays off the Home grid).
const TR_SEC = SECTIONS.find(s => s.kind === 'transport' && s.status === 'live');
export const TRANSPORT = TR_SEC && TR_SEC.data ? TR_SEC.data : null;
const TR_ICON = T => (T.taxis || []).length ? 'taxi' : ((T.stations || [])[0] || {}).mode === 'bus' ? 'bus' : 'train';
export const QUICK = TRANSPORT && TRANSPORT.tile ? [...QUICK_ALL, { id: TR_SEC.id, href: '#s/' + TR_SEC.id, icon: TR_ICON(TRANSPORT), name: TRANSPORT.tile.name, sub: TRANSPORT.tile.sub, wide: TRANSPORT.tile.wide }] : QUICK_ALL;
