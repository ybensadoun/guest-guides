// The taxis a house is offered from our open directory (engine/src/modules/transport/taxis.js, README.md beside it, "The
// taxis found"). Made-up records near a made-up point; every number here is made up. Pure.
//   node --test engine/scripts/transport-taxis.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TX, txPick, txAuto, txEntry, txName, txPhone, txKey } from '../src/modules/transport/taxis.js';
import { tpRoadKm } from '../src/modules/transport/pick.js';

const at = km => ({ lat: 40 + km * 0.008993, lng: 0 });   // about 1 km of latitude
const H = at(0);
const rec = (id, km, more = {}) => ({ id, name: `Taxi ${id}`, category: 'taxi_service', status: 'open', confidence: 0.9, phones: [`+34 900 00${String(id).padStart(4, '0').slice(-4)}`], websites: [], town: 'Testville', ...at(km), ...more });

test('txPick: nearest first, km by road, at most 4', () => {
  const R = [rec(1, 9), rec(2, 2), rec(3, 5), rec(4, 7), rec(5, 12)];
  const p = txPick(R, H);
  assert.deepEqual(p.map(t => t.id), ['2', '3', '4', '1']); assert.equal(TX.max, 4);
  assert.equal(p[0].km, tpRoadKm(2)); assert.deepEqual(Object.keys(p[0]), ['id', 'name', 'phone', 'town', 'lat', 'lng', 'km', 'web']);
  assert.equal(txPick(R, H, { max: 6 }).length, 5);
});

test('txPick: what is left out', () => {
  const R = [rec(1, 1, { status: 'permanently_closed' }), rec(2, 1, { status: 'temporarily_closed' }), rec(3, 1, { phones: [] }), rec(4, 1, { phones: ['12345'] }),
    rec(5, 1, { town: '' }), rec(6, 1, { town: null }), rec(7, 1, { name: 'Joan Garcia Puig' }), rec(8, 1, { confidence: 0.39 }), rec(9, 16), rec(10, 2, { name: 'RÀDIO TÀXI Vendrell' }), rec(11, 3, { name: 'Radiotaxi Costa' })];
  assert.deepEqual(txPick(R, H, { max: 9 }).map(t => t.id), ['10', '11']);
});

test('txPick: one taxi per number (its last 9 digits), and never one the guide has', () => {
  const R = [rec(1, 1, { phones: ['+34 977 00 00 01'] }), rec(2, 2, { phones: ['977000001'] }), rec(3, 3, { phones: ['0034 977 00 00 03'] })];
  assert.deepEqual(txPick(R, H).map(t => t.id), ['1', '3']);
  assert.deepEqual(txPick(R, H, { have: ['977 00 00 03'] }).map(t => t.id), ['1']);
  assert.equal(txKey('+34 977 00 00 03'), '977000003');
});

test('txPick on its own output: sorted again for another house, past 15 km left out', () => {
  const p = txPick([rec(1, 1), rec(2, 8), rec(3, 14)], H, { max: 6 });
  assert.deepEqual(txPick(p, at(10), { max: 6 }).map(t => t.id), ['2', '3', '1']);
  assert.deepEqual(txPick(p, at(20), { max: 6 }).map(t => t.id), ['3', '2']);
  assert.deepEqual(txPick(p, { lat: 0, lng: 0 }), []); assert.deepEqual(txPick(null, H), []);
});

test('txAuto: the nearest, or none', () => {
  assert.equal(txAuto([rec(1, 5), rec(2, 3)], H).id, '2');
  assert.equal(txAuto([rec(1, 20)], H), null);
});

test('txName, txPhone: as the guide writes them', () => {
  assert.equal(txName('  TAXI  EL VENDRELL '), 'Taxi El Vendrell');
  assert.equal(txName('radio taxi de calafell'), 'Radio Taxi de Calafell');
  assert.equal(txName('Ràdio Taxi El Vendrell'), 'Ràdio Taxi El Vendrell');
  assert.equal(txName('TAXIS L\'ARBOÇ'), 'Taxis L\'arboç');
  assert.equal(txPhone('+34977000001'), '977 00 00 01');
  assert.equal(txPhone('0034 600 000 002'), '600 00 00 02');
  assert.equal(txPhone('977000003'), '977 00 00 03');
  assert.equal(txPhone('+33 1 00 00 00 04'), '+33 1 00 00 00 04');
});

test('txEntry: the taxi as transport.json holds one, credited to the directory', () => {
  const t = txPick([rec('ab-1', 2, { name: 'TAXI TESTVILLE', phones: ['+34 900 000 111'] })], H)[0];
  const e = txEntry(t, ['en', 'de'], { at: '2026-11-16' });
  assert.deepEqual(Object.keys(e), ['id', 'name', 'sub', 'phone', 'what', 'src']);
  assert.match(e.id, /^tx[0-9a-z]+$/); assert.equal(txEntry(t, ['en']).id, e.id, 'stable');
  assert.deepEqual(e.name, { en: 'Taxi Testville', de: 'Taxi Testville' }); assert.deepEqual(e.sub, { en: 'Testville', de: 'Testville' });
  assert.equal(e.phone, '900 00 01 11'); assert.deepEqual(e.what, { en: '', de: '' });
  assert.deepEqual(e.src, { from: 'overture', id: 'ab-1', at: '2026-11-16' });
  assert.ok(!('alt' in e) && !('always' in e));
});
