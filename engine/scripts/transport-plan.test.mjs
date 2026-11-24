// The Getting around module's rules (engine/src/modules/transport/plan.js, README.md beside it): the ways of getting about,
// which stations are listed and pinned, the page's and the card's icon, the card on Home, an old taxi card read as the
// page. Written from the guide's behaviour on 14 Nov 2026 (views/place.js and content.js before the module). Pure.
//   node --test engine/scripts/transport-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODES, modeOf, stopsOf, groupsOf, pageIcon, iconOf, cardOf, cardWords, transportOf, loneRow } from '../src/modules/transport/plan.js';

test('modeOf: train when none, bus, an unknown mode drawn as a train', () => {
  assert.equal(modeOf({}), MODES[0]);
  assert.deepEqual(modeOf({ mode: 'bus' }), ['bus', 'byBus', 'var(--tone-green)', 'green']);
  assert.equal(modeOf({ mode: 'ferry' })[0], 'train');
});

test('stopsOf: a station never placed (0,0 or no position) is left out, one whose position ran out stays', () => {
  const S = [{ id: 'a', lat: 41, lng: 1 }, { id: 'b', lat: 0, lng: 0 }, { id: 'c' }, { id: 'd', nomap: true }, { id: 'e', lat: 0, lng: 2 }];
  assert.deepEqual(stopsOf(S).map(s => s.id), ['a', 'd', 'e']);
  assert.deepEqual(stopsOf(undefined), []);
});

test('groupsOf: trains, then buses, each only with stations', () => {
  const S = [{ id: 'b1', mode: 'bus' }, { id: 't1' }, { id: 't2', mode: 'train' }];
  assert.deepEqual(groupsOf(S).map(([w, l]) => [w, l.map(s => s.id)]), [['byTrain', ['t1', 't2']], ['byBus', ['b1']]]);
  assert.deepEqual(groupsOf([{ id: 'b', mode: 'bus' }]).map(g => g[0]), ['byBus']);
});

test('pageIcon: the card\'s, else the taxi (taxis, or no station), else the first station\'s kind', () => {
  assert.equal(pageIcon({ tileIcon: 'bus', taxis: [{}] }, []), 'bus');
  assert.equal(pageIcon({ taxis: [{}] }, [{ mode: 'bus' }]), 'taxi');
  assert.equal(pageIcon({}, []), 'taxi');
  assert.equal(pageIcon({ taxis: [] }, [{ mode: 'bus' }]), 'bus');
});

test('iconOf and cardOf: the card on Home, only with a file and a "tile"', () => {
  assert.equal(iconOf({ taxis: [{}] }), 'taxi');
  assert.equal(iconOf({ stations: [{ mode: 'bus' }] }), 'bus');
  assert.equal(iconOf({ stations: [{}] }), 'train');
  assert.equal(iconOf({}), 'train');
  assert.equal(cardOf(undefined), null);
  assert.equal(cardOf({ id: 'transport' }), null);
  assert.equal(cardOf({ id: 'transport', data: { taxis: [] } }), null);
  const tile = { name: { en: 'Taxi & train' }, sub: { en: 'Call' }, wide: false };
  assert.deepEqual(cardOf({ id: 'getting', data: { taxis: [{}], tile } }), { id: 'getting', href: '#s/getting', icon: 'taxi', name: tile.name, sub: tile.sub, wide: false });
});

test('cardOf: Ca La Kimberly\'s Getting around has its card', () => {
  const data = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/transport.json', import.meta.url), 'utf8'));
  const c = cardOf({ id: 'transport', data });
  assert.equal(c.href, '#s/transport');
  assert.equal(c.icon, 'taxi');
});

test('transportOf: an old taxi card with "trains" as a Getting around page', () => {
  const p = { id: 'taxi', name: { en: 'Taxi' }, kind: { en: 'Taxi and trains' }, phone: '600 000 000', what: { en: 'w' }, alt: [], always: true, trains: [{ id: 's' }] };
  assert.deepEqual(transportOf(p), { id: 'taxi', title: p.name, lead: p.kind, taxis: [{ name: p.name, sub: undefined, phone: '600 000 000', what: p.what, alt: [], always: true }], stations: [{ id: 's' }] });
  assert.deepEqual(transportOf({ id: 'x', name: 'N', title: 'T', taxiName: 'Cab', taxiSub: 'S' }).taxis[0].name, 'Cab');
  assert.deepEqual(transportOf({ id: 'x' }).stations, []);
});

test('loneRow: a page with a single row shows it open (15 Nov 2026)', () => {
  const st = { id: 's', lat: 41.2, lng: 1.5 };
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, []), true);            // the pool house: one taxi
  assert.equal(loneRow({ taxis: [] }, [st]), true);                           // one station
  assert.equal(loneRow({}, [st]), true);
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, [st]), false);          // something to choose from: rows start closed
  assert.equal(loneRow({ taxis: [{ name: 'A' }, { name: 'B' }] }, []), false);
  assert.equal(loneRow({}, []), false);
  assert.equal(loneRow({ apps: [{ id: 'uber' }] }, []), true);              // a ride app alone is a single row (16 Nov 2026)
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }], apps: [{ id: 'uber' }] }, []), false);
  // A station never placed is not a row: one taxi beside it is still alone.
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, stopsOf([{ id: 'new', lat: 0, lng: 0 }])), true);
});

// The words of a new guide's card (24 Nov 2026): it said "Taxi" and the taxi's name, nothing of the trains and stops.
test('cardWords: the section\'s title, and one line of what the page has for this house', () => {
  const LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'], W = Object.fromEntries(LANGS.map(l => [l, JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'))]));
  const at = { lat: 41.2, lng: 1.5 }, taxi = { name: { en: 'Taxi El Vendrell', de: 'Taxi El Vendrell (de)' }, phone: '977 66 61 11' };
  const train = { ...at, mode: 'train', min: 11 }, far = { ...at, mode: 'train', min: 29 }, bus = { ...at, mode: 'bus', walk: 3 }, metro = { ...at, mode: 'metro', walk: 6 }, tram = { ...at, mode: 'tram', walk: 10 };
  const sub = (T, l = 'en') => cardWords(T, LANGS, W).sub?.[l];
  assert.deepEqual(cardWords({ taxis: [taxi], stations: [train] }, LANGS, W).name, { en: 'Getting around', es: 'Cómo moverse', fr: 'Se déplacer', ca: "Com moure's", de: 'Unterwegs', nl: 'Vervoer' });
  // The nearest with its minutes first (on foot before by car), then the other kinds in the page's order, then Taxi.
  assert.equal(sub({ taxis: [taxi], stations: [train, far] }), 'Train 11 min by car · Taxi');
  assert.equal(sub({ taxis: [taxi], stations: [train, far, bus] }), 'Bus 3 min on foot · Train · Taxi');
  assert.equal(sub({ taxis: [taxi], stations: [tram, bus, metro, train] }), 'Bus 3 min on foot · Train · Metro · Tram · Taxi');
  assert.equal(sub({ taxis: [taxi], stations: [metro, bus, far] }, 'de'), 'Bus 3 Min. zu Fuß · Zug · Metro · Taxi');
  assert.equal(sub({ taxis: [taxi], stations: [train, bus] }, 'fr'), 'Bus 3 min à pied · Train · Taxi');
  // A part the page lacks is left out, never an empty place.
  assert.equal(sub({ taxis: [], stations: [bus] }), 'Bus 3 min on foot');
  assert.equal(sub({ apps: [{ name: 'Uber' }], stations: [train] }), 'Train 11 min by car · Taxi');
  assert.equal(sub({ taxis: [taxi], stations: [{ ...at, mode: 'train' }] }), 'Train · Taxi');                       // no minutes known: the kind alone
  assert.equal(sub({ taxis: [taxi], stations: [{ lat: 0, lng: 0, mode: 'bus', walk: 1 }, train] }), 'Train 11 min by car · Taxi');   // a stop never placed is not on the page
  // No station at all: the taxi's own name, in the language; else the first app's; nothing: no line.
  assert.equal(sub({ taxis: [taxi] }), 'Taxi El Vendrell'); assert.equal(sub({ taxis: [taxi] }, 'de'), 'Taxi El Vendrell (de)'); assert.equal(sub({ taxis: [taxi] }, 'fr'), 'Taxi El Vendrell');
  assert.equal(sub({ taxis: [{ name: 'Radio Taxi', phone: '1' }] }), 'Radio Taxi'); assert.equal(sub({ apps: [{ name: 'Uber' }] }), 'Uber');
  assert.equal('sub' in cardWords({}, LANGS, W), false);
  // A language the engine has no words for is said in English; no language asked: English.
  assert.deepEqual(cardWords({ taxis: [taxi], stations: [bus] }, ['it'], W), { name: { it: 'Getting around' }, sub: { it: 'Bus 3 min on foot · Taxi' } });
  assert.deepEqual(Object.keys(cardWords({ taxis: [taxi] }, null, W).name), ['en']);
  for (const l of LANGS) for (const T of [{ taxis: [taxi], stations: [tram, bus, metro, train] }, { taxis: [taxi] }]) assert.ok(!/—|\{n\}|undefined|· ·|^·|·$/.test(sub(T, l)), `${l}: ${sub(T, l)}`);
});
