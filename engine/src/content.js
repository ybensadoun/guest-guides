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

export const HOUSE = get('house');
// Private values kept out of git (guest Wi-Fi): sites/<site>/private/wifi.json, written locally,
// or at build time from the WIFI_JSON environment variable (see engine/scripts/run.js).
const PRIV_WIFI = PRIVATE.wifi;
if (PRIV_WIFI) HOUSE.wifi = PRIV_WIFI;
const mk = (MODULE_ON('markets') && get('markets')) || { categories: [], markets: [] };
export const CATS = (mk.categories || []).filter(c => (mk.markets || []).some(m => m.category === c));

export const MARKETS = mk.markets.map(m => ({
  ...m,
  kind: 'market',
  cat: m.category,
  km: m.km_from_house,
  groupKey: m.group || m.town,
  groupSlug: slug(m.group || m.town),
  s: slots(m.schedule)
}));

export const SECTIONS = get('sections').sections.filter(s => MODULE_ON(s.id)).map(s => ({ ...s, data: s.kind === 'markets' ? null : get(s.file || s.id) }));

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
const QSHOP = ((QUICK_ON && get('quick')?.items) || []).filter(q => q.id === 'shop' && q.lat).map(q => ({
  id: 'quick-shop', kind: 'spot', section: 'restaurants', cat: 'restaurants', icon: 'mug', tone: 'green',
  name: q.name, type: q.kind, town: HOUSE.name, km: 0.1, lat: q.lat, lng: q.lng,
  description: q.what, hours: q.hours, price: q.price, priceNote: q.priceNote, gmaps: q.gmaps, phone: q.phone || undefined, flags: [], tags: [],
  groupKey: HOUSE.name, groupSlug: slug(HOUSE.name) + '-bar', s: slots(q.schedule)
}));
export const MAP_ITEMS = [...MARKETS, ...SPOTS, ...QSHOP];
export const byId = id => MAP_ITEMS.find(m => m.id === id);

export const GARBAGE = get('garbage');

// Ratings and reviews (content/reviews.json, only when the host switched it on). Live, never curated by hand.
export const REVIEWS = (MODULE_ON('reviews') && get('reviews')) || null;

// One-tap call buttons on Home (pizza, taxi, the shop next door). Items without a phone are hidden.
export const QUICK_ALL = (QUICK_ON && get('quick')?.items) || [];
export const QUICK = QUICK_ALL;
