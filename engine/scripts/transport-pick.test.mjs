// Which train stations a house gets, and a station as a guide holds it (engine/src/modules/transport/pick.js, README.md
// beside it, "The stations found"). Made-up stations for each rule, then Renfe's real file on Ca La Kimberly's house (its
// position read from the guide, never printed). Pure.   node --test engine/scripts/transport-pick.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tpWalk, tpFoot, tpInCity, TP, TP_TAG, tpLine, tpRoadKm, cmMin, tpDoor, tpTime, tpCity, pickStations, tpName, stationEntry, stationsFor, tpFold, tpFind, tpPlaced, tpHave, tpTagOf, tpNear, tpNearest, tpBrandBadges, tpBrandsStale, TP_BRANDS } from '../src/modules/transport/pick.js';

const ROOT = new URL('../../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
// A made-up country on a line of latitude: 0.009 degrees of latitude is about 1 km.
const at = km => ({ lat: 40 + km * 0.008993, lng: 0 });
const H = at(0);
const st = (id, km, toCity, extra = {}) => ({ id, name: 'Station ' + id, ...at(km), lines: [{ t: 'R1', c: '#7DBCEC', ink: true }], to: toCity ? [{ id: 'big', ...toCity }] : [], ...extra });
const data = stations => ({ source: { updated: '2026-11-16' }, cities: [{ id: 'big', ids: ['C'], name: 'Big City', main: true, ...at(80) }, { id: 'small', ids: ['S'], name: 'Small Town', i18n: { fr: 'Petite Ville' }, ...at(5) }], stations });

test('the small rules: distances, minutes by car, journey times', () => {
  assert.ok(Math.abs(tpLine(H, at(10)) - 10) < 0.05);
  assert.equal(tpRoadKm(10), 13); assert.equal(tpRoadKm(0.2), 1);
  assert.equal(cmMin(9), 11); assert.equal(cmMin(0), 0); assert.equal(cmMin(1), 2);
  assert.equal(tpDoor(10), 16);
  assert.deepEqual([5, 50, 60, 85, 125, 190].map(tpTime), ['5 min', '50 min', '1 h', '1 h 25', '2 h 05', '3 h 10']);
  assert.ok(tpPlaced({ lat: 41.2, lng: 1.5 })); assert.ok(!tpPlaced({ lat: 0, lng: 0 })); assert.ok(!tpPlaced({})); assert.ok(!tpPlaced(null)); assert.ok(!tpPlaced({ lat: '', lng: '' }));
});

test('the city: the nearest main city, never a destination-only one', () => {
  assert.equal(tpCity(H, data([])).id, 'big');   // Small Town is nearer, but not a main city
  assert.equal(tpCity({ lat: 0, lng: 0 }, data([])), null);
});

test('near, quick, fast: the three roles', () => {
  const S = [st('a', 7, { n: 21, min: 85 }), st('b', 10, { n: 94, min: 47 }), st('c', 19, { n: 28, min: 36 }, { hs: true }), st('d', 3, { n: 4, min: 60 }), st('e', 61, { n: 50, min: 10 }, { hs: true })];
  assert.deepEqual(pickStations(H, data(S)).map(x => [x.st.id, x.role]), [['a', 'near'], ['b', 'quick'], ['c', 'fast']]);
  // d: nearer but only 4 trains a day; e: quickest but beyond 60 km.
});

test('quick only when it beats the nearest by 10 minutes door to city; fast only when it is neither', () => {
  // a: 11 + 60 = 71; b: 16 + 52 = 68 (3 better): no quick. b with hs: it is fast.
  assert.deepEqual(pickStations(H, data([st('a', 7, { n: 20, min: 60 }), st('b', 10, { n: 20, min: 52 }, { hs: true })])).map(x => [x.st.id, x.role]), [['a', 'near'], ['b', 'fast']]);
  // b beats a by 10 exactly and has high speed: quick, and no fast (it is quick already).
  assert.deepEqual(pickStations(H, data([st('a', 7, { n: 20, min: 60 }), st('b', 10, { n: 20, min: 45 }, { hs: true })])).map(x => [x.st.id, x.role]), [['a', 'near'], ['b', 'quick']]);
  // The nearest has high speed: near only.
  assert.deepEqual(pickStations(H, data([st('a', 7, { n: 20, min: 30 }, { hs: true }), st('b', 10, { n: 20, min: 40 }, { hs: true })])).map(x => x.role), ['near']);
});

test('no station of the rule: the nearest within 30 km alone, else nothing; no position or no file: nothing', () => {
  assert.deepEqual(pickStations(H, data([st('a', 25, { n: 3, min: 90 }), st('b', 40)])).map(x => [x.st.id, x.role]), [['a', 'near']]);
  assert.deepEqual(pickStations(H, data([st('b', 31)])), []);
  assert.deepEqual(pickStations({ lat: 0, lng: 0 }, data([st('a', 7, { n: 21, min: 85 })])), []);
  assert.deepEqual(pickStations(H, null), []);
});

test('a station\'s name with the word "station", as Ca La Kimberly\'s are written', () => {
  assert.deepEqual(['en', 'es', 'fr', 'ca', 'de', 'nl'].map(l => tpName('El Vendrell', l)), ['El Vendrell station', 'Estación de El Vendrell', "Gare d'El Vendrell", 'Estació del Vendrell', 'Bahnhof El Vendrell', 'Station El Vendrell']);
  assert.equal(tpName('Sant Vicenç de Calders', 'fr'), 'Gare de Sant Vicenç de Calders');
  assert.equal(tpName('Alicante/Alacant-Terminal', 'ca'), "Estació d'Alicante/Alacant-Terminal");
  assert.equal(tpName("L'Hospitalet de Llobregat", 'ca'), "Estació de l'Hospitalet de Llobregat");
});

test('stationEntry: the guide\'s station from our file, in the guide\'s languages, credited to Renfe', () => {
  const s = st('72201', 7, { n: 21, min: 85 }, { lines: [{ t: 'R4', c: '#F7A30D', ink: true }], to: [{ id: 'small', n: 3, min: 12 }, { id: 'big', n: 21, min: 85 }] });
  const e = stationEntry(s, H, 'near', data([s]), ['en', 'fr']);
  assert.deepEqual(Object.keys(e), ['id', 'mode', 'name', 'lat', 'lng', 'km', 'min', 'tag', 'what', 'link', 'linkKey', 'badges', 'to', 'src']);
  assert.equal(e.id, 'st72201'); assert.equal(e.mode, 'train'); assert.equal(e.km, 9); assert.equal(e.min, 11);
  assert.deepEqual(e.name, { en: 'Station 72201 station', fr: 'Gare de Station 72201' });
  assert.deepEqual(e.tag, { en: 'Closest', fr: 'La plus proche' }); assert.deepEqual(e.what, { en: '', fr: '' });
  assert.equal(e.link, 'https://rodalies.gencat.cat/ca/horaris/'); assert.equal(e.linkKey, 'timetable');
  assert.deepEqual(e.badges, [{ t: 'R4', c: '#F7A30D', ink: true }]);
  // The house's city first, then the city with the most direct trains; the name in each language.
  assert.deepEqual(e.to, [{ dest: { en: 'Big City', fr: 'Big City' }, time: '1 h 25', note: { en: '', fr: '' } }, { dest: { en: 'Small Town', fr: 'Petite Ville' }, time: '12 min', note: { en: '', fr: '' } }]);
  assert.deepEqual(e.src, { from: 'renfe', at: '2026-11-16' });
  assert.ok(!('gid' in e) && !('pos' in e) && !('gmaps' in e));
  // Not a Rodalies line: Renfe's site. No role: no verdict. At most TP.dests destinations.
  const many = st('x', 7, null, { lines: [{ t: 'AVE', c: '#001F4C', ink: false }, { t: 'Regional', c: '#5B2C83', ink: false }], to: ['big', 'small', 'big', 'big', 'big'].map((id, i) => ({ id, n: 10 - i, min: 30 + i })) });
  const e2 = stationEntry(many, H, null, data([many]), ['es']);
  assert.equal(e2.link, 'https://www.renfe.com/'); assert.deepEqual(e2.tag, { es: '' }); assert.equal(e2.to.length, TP.dests);
});

test('stationsFor: one station alone has no verdict', () => {
  const one = stationsFor(H, data([st('a', 25, { n: 3, min: 90 })]), ['en']);
  assert.equal(one.length, 1); assert.deepEqual(one[0].tag, { en: '' });
});

test('tpFind: as the host types, accents and capitals aside, the nearest first, nothing already in the guide', () => {
  const D = data([{ id: '1', name: 'Sant Vicenç de Calders', ...at(10) }, { id: '2', name: 'Sant Vicenç de Castellet', ...at(70) }, { id: '3', name: 'El Vendrell', ...at(7) }, { id: '4', name: 'Vendrell Nord', ...at(30) }, { id: '5', name: 'Camp de Tarragona', ...at(19) }]);
  assert.deepEqual(tpFind(D, 'SANT VIC', H).map(x => x.st.id), ['1', '2']);
  assert.deepEqual(tpFind(D, 'sant vicenc de c', H).map(x => x.st.id), ['1', '2']);
  assert.deepEqual(tpFind(D, 'vendr', H).map(x => x.st.id), ['4', '3']);   // a name that starts with it, then a word that does
  assert.deepEqual(tpFind(D, 'Camp de T', H).map(x => [x.st.id, x.km]), [['5', 25]]);
  assert.deepEqual(tpFind(D, 'sant', H, ['st1']).map(x => x.st.id), ['2']);
  assert.deepEqual(tpFind(D, 'v', H), []);
  assert.deepEqual(tpFind(D, 'camp', null).map(x => x.km), [null]);
  assert.equal(tpFold("L'Hospitalet·Llobregat"), 'l hospitaletllobregat');
});

test('tpHave: a station already in the guide, by its id or a hand-written one at the same place', () => {
  const D = data([{ id: '1', name: 'One', ...at(10) }, { id: '2', name: 'Two', ...at(20) }, { id: '3', name: 'Three', ...at(30) }]);
  assert.deepEqual(tpHave(D, [{ id: 'st1', mode: 'train', ...at(10) }, { id: 'vendrell', mode: 'train', ...at(20.3) }, { id: 'bus-x', mode: 'bus', ...at(30) }]).sort(), ['bus-x', 'st1', 'st2', 'vendrell']);
  assert.deepEqual(tpHave(D, [{ id: 'new', mode: 'train', lat: 0, lng: 0 }]), ['new']);
  assert.deepEqual(tpHave(null, undefined), []);
});

test('the role\'s words: a quicker station with high speed trains is said "High speed"', () => {
  assert.equal(tpTagOf({ hs: true }, 'quick'), 'fast'); assert.equal(tpTagOf({}, 'quick'), 'quick'); assert.equal(tpTagOf({ hs: true }, 'near'), 'near'); assert.equal(tpTagOf({ hs: true }, null), null);
  // Inland: the nearest, then a quicker one that has high speed trains (so no third).
  const S = [st('a', 7, { n: 20, min: 60 }), st('b', 10, { n: 20, min: 45 }, { hs: true })];
  const E = stationsFor(H, data(S), ['en', 'es']);
  assert.deepEqual(pickStations(H, data(S)).map(x => x.role), ['near', 'quick']);
  assert.deepEqual(E.map(e => e.tag.en), ['Closest', 'High speed']); assert.equal(E[1].tag.es, 'Alta velocidad');
});

test('tpNear and tpNearest: the rule\'s stations the guide lacks, the nearest station of all', () => {
  const S = [st('a', 7, { n: 21, min: 85 }), st('b', 10, { n: 94, min: 47 }), st('c', 19, { n: 28, min: 36 }, { hs: true }), st('d', 3)];
  assert.deepEqual(tpNear(H, data(S), []).map(x => [x.st.id, x.role, x.km]), [['a', 'near', 9], ['b', 'quick', 13], ['c', 'fast', 25]]);
  assert.deepEqual(tpNear(H, data(S), [{ id: 'sta', mode: 'train' }]).map(x => x.st.id), ['b', 'c']);
  assert.deepEqual(tpNear(H, data([st('a', 25, { n: 3, min: 90 })]), []).map(x => [x.st.id, x.role]), [['a', null]]);   // alone: no verdict
  assert.deepEqual(tpNear({ lat: 0, lng: 0 }, data(S), []), []);
  assert.deepEqual(tpNear(H, data([st('far', 200)]), []), []);
  assert.equal(tpNearest(H, data(S)).id, 'd'); assert.equal(tpNearest(null, data(S)), null); assert.equal(tpNearest(H, data([st('far', 61)])), null);
});

test('tpBrandBadges: iryo and Ouigo on a station of our file, from the shared rows', () => {
  const B = read('engine/src/modules/transport/brands.json').brands;
  const camp = { id: 'st04104', src: { from: 'renfe', at: '2026-11-16' }, badges: [{ t: 'AVE', c: '#001F4C', ink: false }, { t: 'Euromed', c: '#5B2C83', ink: false }] };
  const rows = [{ brand: 'ouigo', stations: ['04104'], checked_at: '2026-11-16T10:00:00Z' }, { brand: 'iryo', stations: ['04104', '71801'], checked_at: '2026-11-15T09:00:00Z' }];
  const e = tpBrandBadges(camp, rows, B);
  assert.deepEqual(e.badges.map(b => [b.t, b.c, b.by || '']), [['AVE', '#001F4C', ''], ['Euromed', '#5B2C83', ''], ['iryo', '#E20613', 'brand'], ['Ouigo', '#E50A70', 'brand']]);
  assert.deepEqual(e.brands, { at: '2026-11-16' }); assert.equal(camp.badges.length, 2, 'the station given is not changed');
  // Again: the same (the brand badges taken out first, never twice).
  assert.deepEqual(tpBrandBadges(e, rows, B).badges, e.badges);
  // A sure search that no longer lists it: its badge goes. A row not sure yet: that company's badge stays as it was.
  const e2 = tpBrandBadges(e, [{ brand: 'iryo', stations: ['71801'], checked_at: '2026-12-20T00:00:00Z' }, { brand: 'ouigo', stations: [], checked_at: null, tried_at: '2026-12-20T00:00:00Z' }], B);
  assert.deepEqual(e2.badges.map(b => b.t), ['AVE', 'Euromed', 'Ouigo']); assert.deepEqual(e2.brands, { at: '2026-12-20' });
  // No row, or no sure row: untouched. Not from our file: untouched.
  assert.equal(tpBrandBadges(camp, [], B), camp);
  assert.equal(tpBrandBadges(camp, [{ brand: 'iryo', stations: ['04104'], checked_at: null }], B), camp);
  const hand = { id: 'camptgn', badges: [{ t: 'iryo', c: '#5B2C83' }] };
  assert.equal(tpBrandBadges(hand, rows, B), hand);
  assert.deepEqual(TP_BRANDS, ['iryo', 'ouigo']);
});

test('tpBrandsStale: no row or older than 30 days, unless tried in the last 7', () => {
  const now = new Date('2026-11-16T12:00:00Z'), d = n => new Date(+now - n * 864e5).toISOString();
  assert.equal(tpBrandsStale(null, now), true);
  assert.equal(tpBrandsStale({ checked_at: d(10), tried_at: d(10) }, now), false);
  assert.equal(tpBrandsStale({ checked_at: d(31), tried_at: d(31) }, now), true);
  assert.equal(tpBrandsStale({ checked_at: d(31), tried_at: d(2) }, now), false);   // an unsure search 2 days ago
  assert.equal(tpBrandsStale({ checked_at: null, tried_at: d(8) }, now), true);
  assert.equal(tpBrandsStale({ checked_at: null, tried_at: d(6) }, now), false);
});

test('brands.json: iryo\'s own colour, white text', () => {
  const b = read('engine/src/modules/transport/brands.json').brands.find(x => x.t === 'iryo');
  assert.equal(b.c, '#E20613'); assert.equal(b.ink, false); assert.ok(/iryo\.eu/.test(b.src));
});

test('the role words: six languages, two words or so', () => {
  for (const r of ['near', 'quick', 'fast']) assert.deepEqual(Object.keys(TP_TAG[r]), ['en', 'es', 'fr', 'ca', 'de', 'nl']);
});

test('Renfe\'s file on Ca La Kimberly\'s house: El Vendrell, Sant Vicenç de Calders, Camp de Tarragona', () => {
  const D = read('onboarding-site/stations-es.json'), h = read('sites/ca-la-kimberly/content/house.json'), house = { lat: h.lat, lng: h.lng };
  assert.equal(tpCity(house, D).id, 'barcelona');
  assert.deepEqual(pickStations(house, D).map(x => [x.st.name, x.role]), [['El Vendrell', 'near'], ['Sant Vicenç de Calders', 'quick'], ['Camp de Tarragona', 'fast']]);
  const E = stationsFor(house, D, ['en', 'es', 'fr', 'ca', 'de', 'nl']);
  assert.deepEqual(E[0].badges.map(b => b.t), ['R4']);
  assert.equal(E[0].to[0].dest.en, 'Barcelona Sants');
  assert.ok(E[2].badges.some(b => b.t === 'AVE'));
  for (const e of E) assert.ok(/^\d{4}-\d\d-\d\d$/.test(e.src.at));
});

// A house in a city and a station on foot (21 Nov 2026; README rules 20 and 21). The made-up city's own stations are C
// (high speed) and C2; the house is 1 km from C2.
test('on foot when 25 minutes or less, else by car', () => {
  assert.deepEqual([0.01, 0.23, 1, 2.08].map(tpWalk), [1, 3, 12, 25]);
  assert.deepEqual([0.1, 1.6, 1.7, 7].map(tpFoot), [2, 25, null, null]);   // the straight line; 1.3 times by road
  const e = stationEntry(st('w', 0.4, { n: 21, min: 85 }), H, null, data([]), ['en']);
  assert.deepEqual(Object.keys(e), ['id', 'mode', 'name', 'lat', 'lng', 'km', 'walk', 'tag', 'what', 'link', 'linkKey', 'badges', 'to', 'src']);
  assert.equal(e.walk, 6); assert.equal(e.km, 1); assert.equal('min' in e, false);
  assert.equal('walk' in stationEntry(st('w', 0.4), { lat: 0, lng: 0 }, null, data([]), ['en']), false);   // no house position: neither said on foot
});
const cityData = stations => ({ source: { updated: '2026-11-16' }, cities: [{ id: 'big', ids: ['C', 'C2'], name: 'Big City', main: true, ...at(3) }, { id: 'small', ids: ['S'], name: 'Small Town', ...at(50) }], stations });
test('a house in its city: the nearest station and the city\'s main station, never judged by trains to the city', () => {
  const C = st('C', 3, null, { hs: true, to: [{ id: 'small', n: 30, min: 40 }] }), C2 = st('C2', 1, null, { to: [] });
  const sub = st('sub', 0.5, { n: 60, min: 4 }, { to: [{ id: 'big', n: 60, min: 4 }, { id: 'small', n: 9, min: 55 }] }), far = st('far', 9, { n: 40, min: 15 });
  const D = cityData([C, C2, sub, far]);
  assert.equal(tpInCity(H, D), true); assert.equal(tpInCity(at(-4), D), false);   // 4 km from C2 or less
  assert.deepEqual(pickStations(H, D).map(x => [x.st.id, x.role]), [['sub', 'near'], ['C', 'main']]);
  const [a, b] = stationsFor(H, D, ['en', 'de']);
  assert.deepEqual([a.tag, b.tag], [{ en: 'Closest', de: 'Am nächsten' }, { en: 'Main station', de: 'Hauptbahnhof' }]);
  assert.equal(a.walk, 8); assert.deepEqual(a.to.map(d => [d.dest.en, d.time]), [['Small Town', '55 min']]);   // not "Big City 4 min"
  assert.equal(b.min, cmMin(4)); assert.deepEqual(b.to.map(d => d.dest.en), ['Small Town']);
  // The nearest is the main station itself: one station, no verdict. No high speed in the city: the nearest of its own.
  assert.deepEqual(stationsFor(at(3), D, ['en']).map(e => [e.id, e.tag.en]), [['stC', '']]);
  assert.deepEqual(pickStations(H, cityData([{ ...C, hs: false }, C2, sub])).map(x => [x.st.id, x.role]), [['sub', 'near'], ['C2', 'main']]);
  // Out of the city the rule is the old one, and the city stays a destination.
  const out = stationsFor(at(-6), D, ['en']);
  assert.deepEqual(out.map(e => e.id), ['stsub']); assert.equal(out[0].to[0].dest.en, 'Big City');
  assert.deepEqual(Object.keys(TP_TAG.main).sort(), Object.keys(TP_TAG.near).sort());
  assert.deepEqual(tpNear(H, D, []).map(x => [x.st.id, x.walk, x.role]), [['sub', 8, 'near'], ['C', null, 'main']]);
  assert.deepEqual(tpFind(D, 'station', H, [], 2).map(x => [x.st.id, x.walk]), [['sub', 8], ['C2', 16]]);
});
test('Renfe\'s real file: the centres of five cities', () => {
  const real = read('onboarding-site/stations-es.json');
  const got = (lat, lng) => stationsFor({ lat, lng }, real, ['en']).map(e => [e.name.en.replace(/ station$/, ''), e.tag.en, e.walk ? e.walk + ' on foot' : e.min + ' by car', e.to.map(d => d.dest.en).join(', ')]);
  const all = { barcelona: got(41.3917, 2.1649), madrid: got(40.4168, -3.7038), valencia: got(39.4699, -0.3763), malaga: got(36.7213, -4.4214), bilbao: got(43.2630, -2.9350) };
  for (const [k, L] of Object.entries(all)) { assert.ok(L.length >= 1 && L.length <= 2, k); assert.ok(L[0][2].endsWith('on foot'), k + ': its nearest station is said on foot'); }
  assert.deepEqual(all.barcelona.map(x => x[0]), ['Barcelona-Passeig de Gràcia', 'Barcelona-Sants']);
  assert.ok(!all.barcelona[0][3].includes('Barcelona') && !all.madrid[0][3].includes('Madrid'));
  assert.equal(all.valencia[0][0], 'València-Estació del Nord');
});
