// The research's brief and how far what it finds reaches (worker/research-brief.mjs): the early research needs nothing
// from the host and names the municipality; Find more and the monthly events keep the host's distance and interests; the
// build cuts markets and events to the host's distance. Made-up places only; nothing runs but the functions.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { researchPrompt, whereLine, earlyRules, MARKETS_RULE, TODO_RULE, HOURS_RULE, example, inReach, eventsInReach, reachKm, roadKm, EV_EARLY } from '../research-brief.mjs';
import { hav } from '../places.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HOST = { placeName: 'Casa Prova', town: 'Vilagran', region: 'Catalonia, Spain', lat: 41.3, lng: 1.5, radius: '45 min', interests: ['Wine tasting', 'Hiking'], feelWords: ['quiet'], tone: 'Warm' };
const PLACE = { town: 'Vilaprova', province: 'Tarragona', near: 'Can Provet', metres: 820, fetched: '2026-11-10' };

// The brief as it was before 12 Nov 2026, word for word: what Find more and the monthly events must still get.
function before(kind, A, rules) {
  const area = `${A.town || ''}${A.region ? ', ' + A.region : ''}`, km = ({ '15 min': 15, '30 min': 30, '45 min': 45, '1 hour': 60 })[A.radius] || +A.radius || 30;
  return `You research one module of a guest guide for a holiday home. Place: ${A.placeName || 'the house'}, ${area}. Approximate point: ${A.lat}, ${A.lng}. ${A.city ? `Guests get around on foot, by bike or by public transport, up to ${km} km.` : `Guests drive up to ${km} km.`} The host likes: ${[A.interests, A.feelWords, A.tone].flat().filter(Boolean).join('; ') || 'no preference given'}.
Use web search. Only include things you confirmed exist from a web source. Never invent names, addresses, phone numbers, hours or distances. When unsure, leave the field out or set "verify": true. Write every text in English, as {"en": "..."}. No em-dashes.
${rules}
Answer with ONE JSON object and nothing else. It must follow the shape of this example (only its first items are shown):
${example(kind)}`;
}

test('the early brief: the municipality, its province and the hamlet named, own municipality first, nothing of the host\'s distance or interests', () => {
  const rules = earlyRules(HOST);
  for (const kind of ['markets', 'todo']) {
    const p = researchPrompt(kind, { ...HOST, place: PLACE }, rules[kind], { early: true });
    assert.match(p, /Place: Casa Prova, in the municipality of Vilaprova \(province of Tarragona\), Catalonia, Spain, close to Can Provet \(a village, hamlet or housing estate of it, about 0\.8 km from the point\)\. The host or the listing names the town Vilagran\. Approximate point: 41\.3, 1\.5\./);
    assert.match(p, /Search the house's own municipality first, then the nearest villages and towns, nearest first\./);
    assert.doesNotMatch(p, /Guests drive|The host likes|host's taste|Wine tasting|Hiking|quiet|Warm|45 km/);
    assert.doesNotMatch(p, /—/);
  }
  // The nearest place is the municipality itself, the town given is the same: neither said twice.
  const same = researchPrompt('markets', { ...HOST, town: 'vilaprova', place: { ...PLACE, near: 'Vilaprova' } }, 'R', { early: true });
  assert.match(same, /Place: Casa Prova, in the municipality of Vilaprova \(province of Tarragona\), Catalonia, Spain\. Approximate/);
  // The visitor's quick research: no answers at all, no province.
  const quick = researchPrompt('markets', { town: null, region: null, lat: 41.3, lng: 1.5, place: { town: 'Vilaprova', near: 'Vilaprova' } }, 'R', { early: true });
  assert.match(quick, /Place: the house, in the municipality of Vilaprova\. Approximate point: 41\.3, 1\.5\.\nSearch the house's own municipality first/);
  // No municipality found: as before, minus the host's distance and interests.
  const none = researchPrompt('todo', HOST, 'R', { early: true });
  assert.match(none, /Place: Casa Prova, Vilagran, Catalonia, Spain\. Approximate point: 41\.3, 1\.5\.\nUse web search/);
  assert.doesNotMatch(none, /municipality|Guests drive|The host likes/);
  // A city keeps its own sense: on foot, bike or public transport, no km of the host's.
  assert.match(researchPrompt('todo', { ...HOST, city: true, place: PLACE }, 'R', { early: true }), /point: 41\.3, 1\.5\. Guests get around on foot, by bike or by public transport\.\nSearch/);
});

test('the early rules: a fixed reach for every kind of guest, the old rules kept for the others', () => {
  const car = earlyRules({}), city = earlyRules({ city: true });
  assert.match(car.markets, /every weekly market within about 30 km by road .* between 30 and 60 km only the notable ones \(large or well known markets, covered market halls, big flea or antiques markets\)/);
  assert.match(car.todo, /10 to 14 things to do of every kind, never narrowed to one taste: sights, nature, beaches when the sea is within reach, fun for families, culture, wine and food/);
  assert.match(car.todo, /Most within about 30 km by road, plus a few worth a longer drive, up to 60 km/);
  for (const r of [car.todo, city.todo]) { assert.match(r, /No markets .* no restaurants, cafés or bars/); assert.ok(r.endsWith(HOURS_RULE)); assert.doesNotMatch(r, /fit the host|the host's taste|within the radius/); }
  for (const r of [car.markets, city.markets]) { assert.match(r, /Every market MUST have numeric lat and lng/); assert.ok(r.endsWith(HOURS_RULE)); assert.doesNotMatch(r, /within the radius/); }
  assert.doesNotMatch(city.markets + city.todo, /60 km|30 km/); assert.match(city.markets, /within about 3 km/);
  // The rules of the build's own research and of Find more: as they were (the quick research's rule is cut from this start).
  assert.ok(MARKETS_RULE.startsWith('Find the weekly and notable local markets within the radius (street markets, covered markets, fairs). Same shape as the example'));
  assert.ok(TODO_RULE.startsWith('Find 8 to 12 things to do within the radius that fit the host\'s taste: sights, nature, fun, culture. No markets'));
  assert.equal(EV_EARLY.far, 60);
});

test('Find more and the monthly events: the brief is word for word what it was, the host\'s distance and interests in it', () => {
  for (const [kind, A] of [['todo', HOST], ['markets', { ...HOST, radius: 25 }], ['events', { ...HOST, city: true, radius: 8 }], ['todo', { lat: 41, lng: 1 }]]) {
    const now = researchPrompt(kind, A, 'RULES'), was = before(kind, A, 'RULES');
    assert.equal(now, was);
  }
  assert.match(researchPrompt('todo', HOST, 'R'), /Guests drive up to 45 km\. The host likes: Wine tasting; Hiking; quiet; Warm\./);
});

test('the worker: the guide\'s research and the quick one use the early brief and the municipality; Find more does not', () => {
  const src = readFileSync(resolve(ROOT, 'worker/guide-worker.mjs'), 'utf8');
  const fn = name => { const i = src.indexOf(`async function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.match(fn('researchJob'), /muniSoon\(\{ lat: \+A\.lat, lng: \+A\.lng \}\)/); assert.match(fn('researchJob'), /rules: earlyRules\(A\), early: true/);
  assert.match(fn('researchJob'), /await jp\(\{ result: \{ place \} \}\)/);
  assert.match(fn('runArea'), /muniSoon\(\{ lat: \+row\.lat, lng: \+row\.lng \}\)/); assert.match(src, /const muniSoon = at => [^\n]*setTimeout[^\n]*20000/); assert.match(src, /municipalityAt\(at, /); assert.match(fn('runArea'), /together: true, early: true/); assert.match(fn('runArea'), /result\.place = \{ town: m\.town, province: m\.province, \.\.\.\(m\.sea \? \{ sea: m\.sea \} : \{\}\), source: 'geonames', fetched: m\.fetched \}/);
  assert.match(fn('researchJob'), /const place = m \? \{ town: m\.town, province: m\.province, \.\.\.\(m\.sea \? \{ sea: m\.sea \} : \{\}\), source: 'geonames', fetched: m\.fetched \} : null;/);   // the builder ticks Beaches from it
  assert.match(fn('firstEvents'), /early: true/);
  assert.doesNotMatch(fn('findJob'), /early/); assert.doesNotMatch(fn('refreshEvents'), /early/);
  assert.match(fn('findJob'), /interests: A0\.interests/);
  assert.match(src, /mergeQuick\(researchDir, quick\); reachCut\(researchDir, A\);/);
});

// Markets around a house at (41.3, 1.5), with the road distance the build and the maker write (1.3 times the line).
const house = { lat: 41.3, lng: 1.5 };
const at = (id, kmRoad, extra = {}) => ({ id, lat: 41.3 + kmRoad / 1.3 / 111.2, lng: 1.5, ...extra });
const M = [at('a', 50), at('b', 5), at('c', 40), at('d', 12), at('e', 28), at('f', 20), at('g', 70), at('h', 44)];
const ids = r => r.markets.map(m => m.id).join('');

test('inReach: the host\'s distance, the 4 nearest always, in the list\'s own order; missing positions', () => {
  assert.ok(Math.abs(roadKm(house, M[1]) - 5) < 0.05); assert.equal(roadKm(house, { km_from_house: 9 }), 9); assert.equal(roadKm(house, {}), null); assert.equal(roadKm(null, M[0]), null);
  assert.equal(reachKm('15 min'), 15); assert.equal(reachKm('30 min'), 30); assert.equal(reachKm('45 min'), 45); assert.equal(reachKm('1 hour'), 60); assert.equal(reachKm(undefined), 30); assert.equal(reachKm(25), 25);
  assert.deepEqual([ids(inReach(M, house, '15 min')), inReach(M, house, '15 min').dropped], ['bdef', 4]);   // 5 and 12 within 15 km; 20 and 28 as the 4 nearest
  assert.equal(ids(inReach(M, house, '30 min')), 'bdef');
  assert.equal(ids(inReach(M, house, '45 min')), 'bcdefh');
  assert.equal(ids(inReach(M, house, '1 hour')), 'abcdefh');
  assert.equal(ids(inReach(M, house, '')), 'bdef');   // no answer: 30 km, as the guide's radius
  // Far away, fewer than 4 nearby: the 4 nearest stay whatever their distance.
  assert.equal(ids(inReach([at('x', 90), at('y', 80), at('z', 70), at('w', 100), at('v', 110)], house, '15 min')), 'xyzw');
  assert.equal(inReach([at('x', 90)], house, '15 min').markets.length, 1);
  // No position: its own km_from_house; neither: kept (never dropped on a guess), and not one of the 4 nearest.
  const loose = [{ id: 'k', km_from_house: 50 }, { id: 'n' }, at('b', 5), at('d', 12), at('e', 28), at('f', 20), at('g', 70)];
  assert.equal(ids(inReach(loose, house, '15 min')), 'nbdef');
  assert.equal(ids(inReach(loose, house, '1 hour')), 'knbdef');
  assert.deepEqual(inReach(null, house, '15 min'), { markets: [], dropped: 0 });
  // A house given as text (the answers): the same.
  assert.equal(ids(inReach(M, { lat: '41.3', lng: '1.5' }, '15 min')), 'bdef');
  assert.ok(Math.abs(hav(41.3, 1.5, M[0].lat, M[0].lng) * 1.3 - 50) < 0.1);
});

test('eventsInReach: small events within 10 km, the main ones up to the host\'s distance; unknown size or distance kept', () => {
  const E = [{ id: 's5', km_from_house: 5, scale: 'local' }, { id: 's20', km_from_house: 20, scale: 'town' }, { id: 'm20', km_from_house: 20, scale: 'regional' },
    { id: 'm50', km_from_house: 50, scale: 'major' }, { id: 'u50', km_from_house: 50 }, { id: 'nk' }];
  const got = (r, o) => eventsInReach(E, r, o).items.map(e => e.id).join(' ');
  assert.equal(got('15 min'), 's5 nk'); assert.equal(got('30 min'), 's5 m20 nk'); assert.equal(got('1 hour'), 's5 m20 m50 u50 nk');
  assert.equal(eventsInReach(E, '15 min').dropped, 4);
  assert.equal(got('1 hour', { city: true }), 'nk');   // a city: small ones within 2 km, the main ones within 8 km
  assert.deepEqual(eventsInReach(undefined, '15 min'), { items: [], dropped: 0 });
});

test('the early brief names the nearest beach when GeoNames has one within reach, and says nothing of the sea otherwise', () => {
  const sea = researchPrompt('todo', { ...HOST, place: { ...PLACE, sea: { km: 14, name: 'Platja de Prova' } } }, 'R', { early: true });
  assert.match(sea, /The host or the listing names the town Vilagran\. The nearest beach is about 14 km away by road \(Platja de Prova\)\. Approximate point: 41\.3, 1\.5\./);
  assert.match(whereLine({ place: { town: 'Vilaprova', near: 'Vilaprova', sea: { km: 3, name: 'Platja Llarga' } } }), /^the house, in the municipality of Vilaprova\. The nearest beach is about 3 km away by road \(Platja Llarga\)$/);
  for (const place of [PLACE, { ...PLACE, sea: null }, { ...PLACE, sea: { km: 0, name: 'X' } }, { ...PLACE, sea: { km: 9, name: '' } }])
    assert.doesNotMatch(researchPrompt('markets', { ...HOST, place }, 'R', { early: true }), /beach|sea\b/i);
  assert.doesNotMatch(sea, /—/);
});

test('whereLine: the house\'s town as before when GeoNames gave nothing', () => {
  assert.equal(whereLine({ placeName: 'X', town: 'T', region: 'R' }), 'X, T, R');
  assert.equal(whereLine({}), 'the house, ');
});

// Near an edge (13 Nov 2026): GeoNames has no borders, so the nearest village's municipality is a guess.
const EDGE = { town: 'Vilaveïna', province: 'Tarragona', near: 'Vilaveïna', metres: 1694, others: [{ town: 'Vilanostra', metres: 2294 }, { town: 'Vilalluny', metres: 6010 }] };
test('whereLine: near an edge no municipality is claimed and the brief names them all', () => {
  const A = { ...HOST, town: 'Can Prova', place: EDGE }, p = researchPrompt('markets', A, 'R', { early: true });
  assert.match(p, /Place: Casa Prova, near the edge of several municipalities, Vilaveïna \(its nearest village about 1\.7 km from the point\), Vilanostra \(its nearest village about 2\.3 km from the point\) and Vilalluny \(its nearest village about 6 km from the point\), in the province of Tarragona, Catalonia, Spain: which of them the house belongs to is not known\. The host or the listing names the place Can Prova\. Approximate point/);
  assert.match(p, /\nSearch these municipalities first, all of them \(Vilaveïna, Vilanostra, Vilalluny\), then the nearest villages and towns, nearest first\.\n/);
  assert.ok(!/in the municipality of/.test(p) && !/hamlet or housing estate of it/.test(p), p.slice(0, 500));
  assert.ok(!/—/.test(p));
  // Two only: "A and B".
  assert.match(whereLine({ placeName: 'X', place: { ...EDGE, others: EDGE.others.slice(0, 1) } }), /^X, near the edge of several municipalities, Vilaveïna \([^)]*\) and Vilanostra \([^)]*\), in the province of Tarragona: which/);
});

test('whereLine: the municipality the host or the listing names, among those around, is the house\'s', () => {
  const p = researchPrompt('todo', { ...HOST, town: 'vilanostra', place: EDGE }, 'R', { early: true });
  assert.match(p, /Place: Casa Prova, in the municipality of Vilanostra \(province of Tarragona\), Catalonia, Spain\. Approximate point/);   // not Vilaveïna, and its village is not called a hamlet of Vilanostra
  assert.match(p, /\nSearch the house's own municipality first, then the nearest villages and towns, nearest first\.\n/);
  // The nearest one named by the host: as before, with nothing about an edge.
  assert.match(whereLine({ ...HOST, town: 'Vilaveïna', place: EDGE }), /^Casa Prova, in the municipality of Vilaveïna \(province of Tarragona\), Catalonia, Spain$/);
});

test('whereLine: a second municipality far enough leaves the first as before', () => {
  const far = { town: 'Vilaprova', province: 'Tarragona', near: 'Can Provet', metres: 820, others: [{ town: 'Vilanostra', metres: 4200 }] };
  assert.equal(whereLine({ ...HOST, place: far }), whereLine({ ...HOST, place: PLACE }));
  // Twice as far but less than 1 km further (a hamlet at 300 m, the neighbour's at 900 m): still not claimed.
  assert.match(whereLine({ ...HOST, place: { ...far, metres: 300, others: [{ town: 'Vilanostra', metres: 900 }] } }), /near the edge of several municipalities/);
  // More than 1 km further but less than twice as far: not claimed either.
  assert.match(whereLine({ ...HOST, place: { ...far, metres: 3000, others: [{ town: 'Vilanostra', metres: 4500 }] } }), /near the edge of several municipalities/);
});
