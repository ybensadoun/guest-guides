// The research's brief and how far what it finds reaches (worker/guide-worker.mjs): pure, so the tests read it
// (worker/test/research-brief.test.mjs) without starting the worker.
//
// The area research starts as soon as the house's position is known, before the host has said anything (Yohann, 12 Nov
// 2026: everything filled by the time the host reaches each step). So it needs nothing from the host: it names the
// municipality the house lies in (GeoNames, worker/place-facts.mjs municipalityAt), searches a fixed reach for every kind
// of guest, and the host's answers in "Your area" act on what it found without a new search: the deck shows only the
// cards within the host's distance (onboarding-site/src/start.js), and the build leaves out the markets and events
// beyond it (inReach, eventsInReach). Find more, asked later by the host, keeps the host's distance and interests.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hav } from './places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// The builder's distance answer in km (generate-site.py's site.area.radiusKm: the same table, 30 when none), or a number of km.
export const KM_OF = { '15 min': 15, '30 min': 30, '45 min': 45, '1 hour': 60 };
export const reachKm = radius => KM_OF[radius] || (+radius > 0 ? +radius : 30);

export function example(name, n = 2) {
  const f = resolve(HERE, 'examples', name + '.json'); if (!existsSync(f)) return '{}';
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const cut = x => Array.isArray(x) ? x.slice(0, n).map(cut) : (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cut(v)])) : x);
  return JSON.stringify(cut(j), null, 1);
}

const plain = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// Where the house is, in words. A.place (municipalityAt): the municipality and its province from GeoNames, the hamlet or
// housing estate when the nearest place is not the municipality itself, and the town the host or the listing gave when it
// differs. Without it, the host's town and region as before.
export function whereLine(A) {
  const m = A.place, given = String(A.town || '').trim();
  if (!m || !m.town) return `${A.placeName || 'the house'}, ${given}${A.region ? ', ' + A.region : ''}`;
  const near = m.near && plain(m.near) !== plain(m.town) ? m.near : null;
  const km = typeof m.metres === 'number' ? Math.max(0.1, Math.round(m.metres / 100) / 10) : null;
  const other = given && plain(given) !== plain(m.town) && plain(given) !== plain(near) ? given : null;
  return `${A.placeName || 'the house'}, in the municipality of ${m.town}${m.province ? ` (province of ${m.province})` : ''}${A.region ? ', ' + A.region : ''}`
    + `${near ? `, close to ${near} (a village, hamlet or housing estate of it${km != null ? `, about ${km} km from the point` : ''})` : ''}`
    + `${other ? `. The host or the listing names the town ${other}` : ''}`;
}

// early: the area research that starts before the host has answered (the guide's research job, the visitor's quick one):
// no distance and no interests of the host, the municipality first. Otherwise (Find more, the events of the monthly run,
// the build's own research when the early one did not come) the host's distance and interests, as before.
export function researchPrompt(kind, A, rules, { early = false } = {}) {
  const km = reachKm(A.radius);   // the builder's answer, or the guide's radius in km
  const reach = early ? (A.city ? ' Guests get around on foot, by bike or by public transport.' : '')
    : ` ${A.city ? `Guests get around on foot, by bike or by public transport, up to ${km} km.` : `Guests drive up to ${km} km.`} The host likes: ${[A.interests, A.feelWords, A.tone].flat().filter(Boolean).join('; ') || 'no preference given'}.`;
  const first = A.place && A.place.town ? `\nSearch the house's own municipality first, then the nearest villages and towns, nearest first.` : '';
  return `You research one module of a guest guide for a holiday home. Place: ${whereLine(A)}. Approximate point: ${A.lat}, ${A.lng}.${reach}${first}
Use web search. Only include things you confirmed exist from a web source. Never invent names, addresses, phone numbers, hours or distances. When unsure, leave the field out or set "verify": true. Write every text in English, as {"en": "..."}. No em-dashes.
${rules}
Answer with ONE JSON object and nothing else. It must follow the shape of this example (only its first items are shown):
${example(kind)}`;
}

// Hours and the Google Maps link, for every place (markets and things to do).
export const HOURS_RULE = 'For each place: "name_local" is its name exactly as Google Maps lists it (in the local language, e.g. "Jardí Botànic Marimurtra"), so the guide\'s Google Maps button opens its listing. Put "gmaps" only if a source gives the place\'s own Google Maps link. Opening hours: look for them on the official website first (the venue, the operator, the town hall or its tourist office), then in recent local press, and write them as "schedule", a list of rows shaped exactly {"days":["tue","wed"],"open":"10:00","close":"14:00"} (days as mon..sun, times HH:MM, plus "from" and "to" as MM-DD for a season), with "url" set to that official page. Opening that is not weekly (the third Sunday of the month, guided tours) goes in "hours" as words, not in "schedule". Use the flag "check" only when no official or recent source gives the days and hours, or sources disagree. A place open to everyone at any time (beach, viewpoint, old town, path, ruin) gets "always": true and no "check".';
const MARKETS_SHAPE = 'Same shape as the example: {"categories":[...],"markets":[...]} with schedule days as mon..sun. Every market MUST have numeric lat and lng: use the exact spot if a source gives it, otherwise the centre of the town or the market square from Wikipedia or OpenStreetMap, and add "verify": true when approximate. Its "category" must be one of: covered, street, flea, antiques, events. ' + HOURS_RULE;
export const MARKETS_RULE = 'Find the weekly and notable local markets within the radius (street markets, covered markets, fairs). ' + MARKETS_SHAPE;
const TODO_SHAPE = 'No markets (they have their own section) and no restaurants, cafés or bars (the host\'s own list). Same shape: {"items":[...]} with lat, lng, km_from_house, an icon and group as in the example. ' + HOURS_RULE;
export const TODO_RULE = 'Find 8 to 12 things to do within the radius that fit the host\'s taste: sights, nature, fun, culture. ' + TODO_SHAPE;

// The early research's own reach, the same for every host: wide enough for the farthest distance a host can choose
// (1 hour, 60 km); the build and the deck cut it to the host's distance. In a city (A.city), guests walk, bike or take
// the metro: the reach stays a city's.
export function earlyRules(A) {
  return A.city ? {
    markets: 'Find the markets within reach on foot, by bike or by public transport, nearest first: every market within about 3 km of the house (covered market halls, street markets), and up to 10 km only the notable ones (large or well known markets, big flea or antiques markets). At most 25 in all. ' + MARKETS_SHAPE,
    todo: 'Find 10 to 14 things to do of every kind, never narrowed to one taste: sights, nature and parks, beaches when the sea is within reach, fun for families, culture, wine and food to discover. Most within about 5 km of the house, plus a few worth the trip by public transport, up to 15 km. ' + TODO_SHAPE,
  } : {
    markets: 'Find the weekly markets around the house, nearest first: every weekly market within about 30 km by road (street markets, covered market halls), and between 30 and 60 km only the notable ones (large or well known markets, covered market halls, big flea or antiques markets). At most 25 in all. ' + MARKETS_SHAPE,
    todo: 'Find 10 to 14 things to do of every kind, never narrowed to one taste: sights, nature, beaches when the sea is within reach, fun for families, culture, wine and food to discover (wineries, producers to visit). Most within about 30 km by road, plus a few worth a longer drive, up to 60 km. ' + TODO_SHAPE,
  };
}

// How far events reach. Where guests drive: every event within 10 km of the house however small (hyper-local), and
// further out, up to the guide's radius, only the ones people travel to. In a city, where guests walk, bike or take the
// metro: small ones within 2 km (about 10 minutes by bike), the main ones within 8 km (about 30 minutes).
export const EV_REACH = { car: { near: 10 }, city: { near: 2, far: 8 } }, EV_MAIN = ['regional', 'major'];
// The early research's events: by car the main ones up to 60 km (the farthest a host can choose), cut at the build.
export const EV_EARLY = { near: 10, far: 60 };
// An event fits when it is close to the house, whatever its size, or within reach and one of the area's main ones.
// Unknown size or distance: kept (never removed on a guess).
export const evFits = (e, R) => typeof e.km_from_house !== 'number' || (e.km_from_house <= R.far && (e.km_from_house <= R.near || !e.scale || EV_MAIN.includes(e.scale)));

// A place's distance by road from the house, as the build and the maker write it (worker/host-places.mjs): about 1.3
// times the straight line. A place with no position: its own km_from_house; neither: null.
const num = x => typeof x === 'number' && Number.isFinite(x);
export const roadKm = (house, it) => house && num(+house.lat) && num(+house.lng) && it && num(it.lat) && num(it.lng) ? hav(+house.lat, +house.lng, it.lat, it.lng) * 1.3
  : it && num(it.km_from_house) ? it.km_from_house : null;
// The markets a guide shows: those within the host's distance (radius: the builder's answer), and always the `keep`
// nearest (product rule: at least 4 markets, nearest first), even farther. A market with no distance at all stays.
// Returns { markets, dropped } (the list in its own order).
export function inReach(markets, house, radius, keep = 4) {
  const list = Array.isArray(markets) ? markets : [], max = reachKm(radius);
  const at = list.map((m, i) => ({ m, i, km: roadKm(house, m) }));
  const nearest = new Set(at.filter(x => x.km != null).sort((a, b) => a.km - b.km || a.i - b.i).slice(0, keep).map(x => x.i));
  const kept = at.filter(x => x.km == null || x.km <= max || nearest.has(x.i)).map(x => x.m);
  return { markets: kept, dropped: list.length - kept.length };
}
// The events a guide starts with: as the monthly run keeps them (evFits), up to the host's distance. city: the city reach.
export function eventsInReach(items, radius, { city = false } = {}) {
  const list = Array.isArray(items) ? items : [], R = city ? EV_REACH.city : { near: EV_REACH.car.near, far: reachKm(radius) };
  const kept = list.filter(e => evFits(e, R));
  return { items: kept, dropped: list.length - kept.length };
}
