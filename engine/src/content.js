// All guest-facing content lives in sites/<site>/content/*.json and is bundled at build time,
// so it works offline. New files are picked up automatically.
import { SITE, FILES as files, PRIVATE } from './site-data.js';
import { readMarkets, noneFound } from './modules/markets/plan.js';
import { readSpots, shownNow } from './modules/places/plan.js';
import { cardOf } from './modules/transport/plan.js';
import { wifiShown } from './modules/house/plan.js';
const get = name => files[name];
export { SITE };
// Modules switched off in site.json ("modules": { "events": false }) disappear everywhere: tile, page, map pins.
export const MODULE_ON = id => (SITE.modules || {})[id] !== false && !(id === 'markets' && noneFound(files.markets));   // markets with nothing found vanish too, no dead-end tile (modules/markets)

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
// or at build time from the WIFI_JSON environment variable (see engine/scripts/run.js). Shown only when it has a
// password and a named network (modules/house/plan.js).
const PRIV_WIFI = wifiShown(PRIVATE.wifi);
if (PRIV_WIFI) HOUSE.wifi = PRIV_WIFI;
const mk = (MODULE_ON('markets') && get('markets')) || { categories: [], markets: [] };
// The markets, read by their module's rules (modules/markets/plan.js readMarkets) and kept here because the map, its tabs
// and the Markets page's filters share them: CATS, the kinds offered; MARKETS, every market as a place.
const MK = readMarkets(mk, { located, slots, slug });
export const CATS = MK.cats;
export const MARKETS = MK.markets;

export const SECTIONS = get('sections').sections.filter(s => MODULE_ON(s.id)).map(s => ({ ...s, data: s.kind === 'markets' ? null : locate(get(s.file || s.id)) }));

// Live sections with map points (restaurants, places... and the glass container from garbage) share the map with markets.
// Points from non-"spots" sections are utilities: shown only when zoomed in. Read by the places module's rules
// (modules/places/plan.js readSpots) and kept here because the map, the lists and rubbish's page share them.
export const SPOTS = readSpots(SECTIONS, { slots, slug });

export const MAP_CATS = [...CATS, ...new Set(SPOTS.map(s => s.cat))];
// The local bar & shop next door (a Home quick tile) also belongs on the map, under Eat.
const QUICK_ON = MODULE_ON('quick');
const QUICK_FILE = QUICK_ON ? locate(get('quick')) : null;
const QSHOP = (QUICK_FILE?.items || []).filter(q => q.id === 'shop' && q.lat && !q.nomap).map(q => ({
  id: 'quick-shop', kind: 'spot', section: 'restaurants', cat: 'restaurants', icon: 'mug', tone: 'green',
  name: q.name, type: q.kind, town: HOUSE.name, km: 0.1, lat: q.lat, lng: q.lng, gid: q.gid,
  description: q.what, hours: q.hours, price: q.price, priceNote: q.priceNote, gmaps: q.gmaps, phone: q.phone || undefined, flags: [], tags: [], season: q.season,
  groupKey: HOUSE.name, groupSlug: slug(HOUSE.name) + '-bar', s: slots(q.schedule)
}));
export const MAP_ITEMS = [...MARKETS.filter(m => !m.nomap), ...SPOTS.filter(s => !s.nomap), ...QSHOP];
// Closed for the season and opening more than 30 days from now: not shown to guests (modules/places/plan.js shownNow; a
// Home card: modules/highlights). Markets have no season of this kind (their own rows say their days).
export const mapItems = (now = new Date()) => MAP_ITEMS.filter(m => m.kind === 'market' || shownNow(m, now));
export const byId = id => MAP_ITEMS.find(m => m.id === id);

export const GARBAGE = get('garbage');

// Ratings and reviews (content/reviews.json, only when the host switched it on). Live, never curated by hand.
export const REVIEWS = (MODULE_ON('reviews') && get('reviews')) || null;

// The white cards on Home (pizza, taxi, the shop next door): content/quick.json, read once here because the map shares
// the shop; drawn by the highlights module (modules/highlights).
export const QUICK_ALL = QUICK_FILE?.items || [];
// Getting around (section kind "transport", content/transport.json): taxis, then stations and stops, on their own page
// (modules/transport). Its "tile" puts its card among the white cards of Home (the section tile then stays off the Home
// grid), read here once by the module's rule (modules/transport/plan.js cardOf) because the highlights draw it.
const TR_SEC = SECTIONS.find(s => s.kind === 'transport' && s.status === 'live');
const TR_CARD = cardOf(TR_SEC);
// The id of the transport section when it is shown as a highlight (its card), for Home's frame (modules/frame.js).
export const TRANSPORT_CARD = TR_CARD ? TR_SEC.id : null;
export const TRANSPORT = TR_SEC && TR_SEC.data ? TR_SEC.data : null;
export const QUICK = TR_CARD ? [...QUICK_ALL, TR_CARD] : QUICK_ALL;

// The guide's own arrangement of Home (content/home.json, optional; modules/frame.js and modules/README.md). Without it,
// Home is drawn as it always was.
export const HOME_ARRANGEMENT = get('home') || null;
