// The weekly renewal of Google's positions (worker/renew-positions.mjs): its core, renewFiles, is pure. No network: the
// table's rows and Google's answers are given, and fetch itself refuses.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renewFiles, dueOf, gidOf, houseDue } from '../renew-positions.mjs';
import { townPoint } from '../place-facts.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };

const now = new Date('2026-11-10T05:00:00Z'), house = { lat: 41.2, lng: 1.5 };
const gid = n => `G${n}aaaaaaaaaaaa`;
const old = { from: 'google', at: '2026-10-15' }, recent = { from: 'google', at: '2026-11-01' };
const files = () => ({
  house: { lat: 41.2, lng: 1.5 },
  restaurants: { items: [
    { id: 'ull', name: { en: 'Ull de Llebre' }, gid: gid(1), lat: 41.21, lng: 1.51, km_from_house: 2, pos: { ...old } },
    { id: 'pep', name: { en: 'Can Pep' }, gid: gid(2), lat: 41.3, lng: 1.6, km_from_house: 18, pos: { ...old }, gmaps: `https://www.google.com/maps/search/?api=1&query=Can%20Pep&query_place_id=${gid(2)}` },
    { id: 'nou', name: { en: 'Bar Nou' }, gid: gid(3), lat: 41.22, lng: 1.52, km_from_house: 3, pos: { ...recent } },
    { id: 'lost', name: { en: 'Lost Bar' }, gid: gid(4), lat: 41.23, lng: 1.53, km_from_house: 4, pos: { ...old } },
    { id: 'ours', name: { en: 'Our Bar' }, gid: gid(5), lat: 41.24, lng: 1.54, km_from_house: 5 },
  ] },
  transport: { stations: [{ id: 'train-1', mode: 'train', name: { en: 'Sant Vicenç' }, gid: gid(6), lat: 41.18, lng: 1.55, km: 5, min: 8, pos: { ...old } }] },
  quick: { items: [{ id: 'food-ull', from: 'ull', name: { en: 'Ull de Llebre' }, lat: 41.21, lng: 1.51, pos: { ...old } }] },
});

test('dueOf: only Google\'s positions older than the days, a home tile by the place it was pinned from', () => {
  const F = files();
  assert.deepEqual(dueOf(F, { days: 20, now }).map(x => [x.file, x.it.id, x.gid]),
    [['restaurants', 'ull', gid(1)], ['restaurants', 'pep', gid(2)], ['restaurants', 'lost', gid(4)], ['transport', 'train-1', gid(6)], ['quick', 'food-ull', gid(1)]]);
  assert.equal(dueOf(F, { days: 30, now }).length, 0);   // 26 days old: not past 30
  assert.equal(gidOf(F, { from: 'nowhere' }), null);
  // A date that cannot be read counts as due.
  F.restaurants.items[2].pos.at = 'soon';
  assert.ok(dueOf(F, { days: 20, now }).some(x => x.it.id === 'nou'));
});

test('renewFiles: made ours from kept facts, renewed with today\'s date, not yet due left alone, a failure left alone and reported', () => {
  const F = files(), before = JSON.parse(JSON.stringify(F));
  const rows = { [gid(1)]: { gid: gid(1), facts: { lat: 41.2105, lng: 1.5105, phone: '977 00 00 00' } }, [gid(2)]: { gid: gid(2), facts: { phone: 'no position' } } };
  const located = { [gid(2)]: { gid: gid(2), lat: 41.31, lng: 1.61 }, [gid(4)]: { error: 'Not found' }, [gid(6)]: { gid: gid(6), lat: 41.181, lng: 1.551 } };
  const r = renewFiles(F, { rows, located, house, days: 20, now });
  assert.deepEqual(r.ours, ['Ull de Llebre', 'Ull de Llebre']);   // the place and its home tile
  assert.deepEqual(r.renewed, ['Can Pep', 'Sant Vicenç']);
  assert.deepEqual(r.failed, [{ name: 'Lost Bar', why: 'Not found' }]);
  const [ull, pep, nou, lost, ours] = F.restaurants.items;
  // Ours: our position, for good, no date; the distance follows.
  assert.equal(ull.lat, 41.2105); assert.equal(ull.lng, 1.5105); assert.equal(ull.pos, undefined); assert.equal(ull.km_from_house, 2); assert.equal(ull.phone, undefined);
  assert.equal(F.quick.items[0].lat, 41.2105); assert.equal(F.quick.items[0].pos, undefined); assert.ok(!('km_from_house' in F.quick.items[0]));
  // Renewed: Google's new position with today's date, the distance worked out again.
  assert.deepEqual(pep.pos, { from: 'google', at: '2026-11-10' }); assert.equal(pep.lat, 41.31); assert.equal(pep.km_from_house, 20);
  const st = F.transport.stations[0];
  assert.deepEqual(st.pos, { from: 'google', at: '2026-11-10' }); assert.equal(st.lat, 41.181); assert.equal(st.km, 6); assert.equal(st.min, 8);   // the minutes stay the host's
  // Not due, failed, and already ours: as they were.
  assert.deepEqual(nou, before.restaurants.items[2]); assert.deepEqual(lost, before.restaurants.items[3]); assert.deepEqual(ours, before.restaurants.items[4]);
});

test('renewFiles: an id Google no longer knows, a new id from Google, a place with no id, a place not asked', () => {
  const F = files();
  F.restaurants.items.push({ id: 'typed', name: { en: 'Typed' }, lat: 41.2, lng: 1.5, pos: { ...old } });
  const located = { [gid(1)]: null, [gid(2)]: { gid: gid(9), lat: 41.3, lng: 1.6 } };
  const r = renewFiles(F, { rows: {}, located, house, days: 20, now });
  assert.deepEqual(r.failed.map(x => x.name), ['Ull de Llebre', 'Typed', 'Ull de Llebre']);
  assert.equal(r.failed[0].why, 'Google does not know this id any more'); assert.equal(r.failed[1].why, 'no Google id');
  const pep = F.restaurants.items[1];
  assert.equal(pep.gid, gid(9)); assert.match(pep.gmaps, /query_place_id=G9a+$/); assert.equal(pep.pos.at, '2026-11-10');
  // Lost Bar and the station were not asked: left alone, not reported.
  assert.deepEqual(F.restaurants.items[3].pos, old); assert.deepEqual(F.transport.stations[0].pos, old);
  assert.deepEqual(r.renewed, ['Can Pep']); assert.deepEqual(r.ours, []);
});

test('renewFiles: the same answers renew the same places in the unpublished changes', () => {
  const live = files(), draft = files();
  draft.restaurants.items[1].lat = 41.4;   // the host moved nothing else; the same place in the draft is renewed the same way
  const located = { [gid(2)]: { gid: gid(2), lat: 41.31, lng: 1.61 } };
  renewFiles(live, { located, house, now }); renewFiles(draft, { located, house, now });
  assert.deepEqual(draft.restaurants.items[1], live.restaurants.items[1]);
});

// The house's own point when it is Google's town search (content/house.json pos): ours from GeoNames first, else Google's
// text search of the town again; a failure is reported and the point stays as it was (the engine never drops it).
const withHouse = pos => ({ ...files(), house: { name: 'Casa Test', lat: 41.2, lng: 1.5, ...(pos ? { pos: { ...pos } } : {}) } });
test('renewFiles: the house\'s own point, made ours from GeoNames, renewed from Google, a failure left as it is, not due left alone', () => {
  const F1 = withHouse(old), r1 = renewFiles(F1, { home: { ours: { lat: 41.2186, lng: 1.535 }, google: null }, house: F1.house, now });
  assert.deepEqual(F1.house, { name: 'Casa Test', lat: 41.2186, lng: 1.535 }); assert.deepEqual(r1.ours, ['the house']);
  const F2 = withHouse(old), r2 = renewFiles(F2, { home: { ours: null, google: { lat: 41.201, lng: 1.501 } }, house: F2.house, now });
  assert.deepEqual(F2.house.pos, { from: 'google', at: '2026-11-10' }); assert.equal(F2.house.lat, 41.201); assert.deepEqual(r2.renewed, ['the house']);
  const F3 = withHouse(old), r3 = renewFiles(F3, { home: { ours: null, google: { error: 'Quota' } }, house: F3.house, now });
  assert.deepEqual(F3.house, withHouse(old).house); assert.deepEqual(r3.failed, [{ name: 'the house', why: 'Quota' }]);
  const F4 = withHouse(old), r4 = renewFiles(F4, { home: { ours: null, google: null }, house: F4.house, now });
  assert.equal(r4.failed[0].why, 'its town was found neither in GeoNames nor on Google'); assert.deepEqual(F4.house.pos, old);
  // Not due (recent, or ours with no pos), or no answers given: left alone, nothing reported for the house.
  for (const F of [withHouse(recent), withHouse(null)]) { const r = renewFiles(F, { home: { ours: { lat: 1, lng: 1 } }, now }); assert.ok(!r.ours.includes('the house') && F.house.lat === 41.2); }
  const F5 = withHouse(old), r5 = renewFiles(F5, { now }); assert.deepEqual(F5.house.pos, old); assert.ok(![...r5.ours, ...r5.renewed, ...r5.failed.map(x => x.name)].includes('the house'));
  assert.equal(houseDue(withHouse(old), { now }), true); assert.equal(houseDue(withHouse(recent), { now }), false); assert.equal(houseDue(withHouse(null), { now }), false);
});

test('townPoint: a town or village of that name near the point, never another kind of place; nothing found or a failure gives null', async () => {
  const feats = [
    { id: '1', name: 'Estació del Vendrell', cls: 'S', code: 'RSTN', lat: 41.212, lng: 1.5355, metres: 50, exact: false },
    { id: '2', name: 'El Vendrell', cls: 'P', code: 'PPLA3', lat: 41.21861, lng: 1.535, metres: 90, exact: true },
  ];
  const asked = [], gaz = async (country, pins) => { asked.push([country, pins]); return { fetched: '2026-11-10', pins: { house: feats } }; };
  assert.deepEqual(await townPoint('El Vendrell', { lat: 41.219, lng: 1.5355 }, { gaz }), { lat: 41.21861, lng: 1.535, name: 'El Vendrell', metres: 90 });
  assert.deepEqual(asked, [['ES', [{ id: 'house', lat: 41.219, lng: 1.5355, names: ['El Vendrell'] }]]]);
  assert.equal(await townPoint('El Vendrell', { lat: 41.2, lng: 1.5 }, { gaz: async () => ({ pins: { house: [{ ...feats[1], metres: 4000 }] } }) }), null);   // beyond a town's reach
  assert.equal(await townPoint('El Vendrell', { lat: 41.2, lng: 1.5 }, { gaz: async () => ({ pins: { house: [feats[0]] } }) }), null);   // a station is not the town
  assert.equal(await townPoint('El Vendrell', { lat: 41.2, lng: 1.5 }, { gaz: async () => { throw new Error('down'); }, log: () => {} }), null);
  assert.equal(await townPoint('', { lat: 41.2, lng: 1.5 }, { gaz }), null); assert.equal(asked.length, 1);   // no name: GeoNames not asked
});
