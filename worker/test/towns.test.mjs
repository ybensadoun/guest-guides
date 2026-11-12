// Towns as things to do (fault 2 of the acceptance test): the maker's matcher (onboarding-site/src/towns.js) on a made-up
// list, the committed list's shape (onboarding-site/towns-es.json, from GeoNames), and the build's path for a town the host
// picked: never sent to Google, Overture or Claude, kept with its pin, name, kind and the host's comment, into the guide by
// the generator. Made-up towns and house only. Nothing is asked of anyone.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { twFold, twBare, twPrep, twFind, twKm, twKind } from '../../onboarding-site/src/towns.js';
import { placesOf, hostPlaces, ownEntries } from '../host-places.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));   // nothing here may reach GeoNames
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
// A made-up country: two Vilanovas in two provinces, articles, accents, apostrophes, a city.
const FILE = { date: '2026-11-10', credit: 'GeoNames', provinces: ['Nord', 'Sud', 'Mar'],
  rows: [['Ciutat Gran', 40.5, 1.5, 450000, 0], ['Vilanova del Camí', 40.2, 1.2, 12000, 0], ['Vilanova del Camí', 41.6, 1.9, 12000, 1], ['la Bisbal del Prat', 40.05, 1.05, 0, 1],
    ["L'Hospitalet de Baix", 40.4, 1.4, 150000, 0], ['Sant Carles de la Ràpita', 40.6, 0.6, 15000, 2], ['Bisbalet', 40.1, 1.1, 300, 1], ['Barcarola', 39.0, -1.0, 800, 2],
    ['Barcanova', 40.01, 1.01, 800, 1], ['Barca', 39.5, -0.5, 50, 2], ['Cal·lús', 40.3, 1.3, 400, 0], ['Les Vinyes', 40.2, 1.25, 900, 1]] };
const T = twPrep(FILE), H = { lat: 40.0, lng: 1.0 }, names = r => r.map(t => t.n);

test('towns: folding: accents, capitals, apostrophes and the middle dot aside; a leading article ignored', () => {
  assert.equal(twFold("L'Hospitalet de Baix"), 'l hospitalet de baix');
  assert.equal(twFold('Cal·lús'), 'callus');
  assert.equal(twFold('  SANT  Carles '), 'sant carles');
  assert.equal(twBare('la bisbal del prat'), 'bisbal del prat'); assert.equal(twBare('les vinyes'), 'vinyes'); assert.equal(twBare('la'), 'la');
});

test('towns: an article typed or not, accents or not, at the start of the name or of a word', () => {
  assert.deepEqual(names(twFind(T, 'bisbal', H)), ['la Bisbal del Prat', 'Bisbalet']);   // both start with it (one without its article) and both are around the house: the nearest first, though GeoNames gives it no population
  assert.deepEqual(names(twFind(T, 'bisbal')), ['Bisbalet', 'la Bisbal del Prat']);   // no house position: the bigger first
  assert.deepEqual(names(twFind(T, 'la bisbal', H)), ['la Bisbal del Prat', 'Bisbalet']);   // the article typed: the name with it first
  assert.deepEqual(names(twFind(T, 'LA BISBAL DEL PRAT', H)), ['la Bisbal del Prat']);
  assert.deepEqual(names(twFind(T, 'rapita', H)), ['Sant Carles de la Ràpita']);
  assert.deepEqual(names(twFind(T, "l'hospi", H)), ["L'Hospitalet de Baix"]);
  assert.deepEqual(names(twFind(T, 'hospitalet', H)), ["L'Hospitalet de Baix"]);
  assert.deepEqual(names(twFind(T, 'callus', H)), ['Cal·lús']);
  assert.deepEqual(names(twFind(T, 'prat', H)), ['la Bisbal del Prat']);
  assert.deepEqual(names(twFind(T, 'ilanova', H)), []);   // inside a word: not a match
});

test('towns: the order: the exact name, then a name that starts with it, then the rest; bigger first, nearer as the tie-break; at most 3', () => {
  // "Barca" is a town of its own: first, however small. Then the names that start with it, the bigger first; the two
  // of 800 people by distance (Barcanova is next to the house).
  assert.deepEqual(names(twFind(T, 'barca', H)), ['Barca', 'Barcanova']);   // Barcarola, 800 people more than 100 km away, is not worth the trip
  assert.deepEqual(names(twFind(T, 'barc', H)), ['Barcanova']);   // Barca (50 people, 180 km) only by its whole name
  assert.equal(twFind(T, 'a', H, 10).length, 0);
  assert.equal(twFind(T, 'ba', null, 10).length, 4); assert.equal(twFind(T, 'ba', H, 10).length, 2);   // from the house, the two small far ones are left out
  assert.equal(twFind(T, 'ba').length, 3);
  // A name before a word inside a name: "vi" starts Vilanova and Les Vinyes (without its article): both, the bigger first.
  assert.deepEqual(names(twFind(T, 'vi', H)), ['Vilanova del Camí', 'Vilanova del Camí', 'Les Vinyes']);
});

test('towns: around the house before bigger; too far for a day out only by its whole name', () => {
  const T2 = twPrep({ date: '2026-11-10', credit: 'GeoNames', provinces: ['Nord'],
    rows: [['Vallfar', 36.5, -6.0, 90000, 0], ['Vall', 43.0, -8.0, 500, 0], ['Vallprop', 40.1, 1.1, 200, 0], ['Vallgran', 41.5, 2.0, 50000, 0]] });
  // "Vall" is typed whole: first, 1,000 km away or not. Vallprop is a village 18 km away: before the bigger Vallgran,
  // 240 km away. Vallfar is bigger than both but more than 300 km by road: not a day out, left out.
  assert.deepEqual(names(twFind(T2, 'vall', H)), ['Vall', 'Vallprop', 'Vallgran']);
  assert.deepEqual(names(twFind(T2, 'vallf', H)), []);
  assert.deepEqual(names(twFind(T2, 'vallfar', H)), ['Vallfar']);
  assert.deepEqual(names(twFind(T2, 'vall')), ['Vall', 'Vallfar', 'Vallgran']);   // no house position: no distance to judge by
});

test('towns: the same name in two provinces: told apart by the province, the nearer first', () => {
  const r = twFind(T, 'vilanova', H);
  assert.deepEqual(r.map(t => [t.n, t.prov]), [['Vilanova del Camí', 'Nord'], ['Vilanova del Camí', 'Sud']]);
  assert.ok(r[0].km < r[1].km);
  const far = twFind(T, 'vilanova', { lat: 41.7, lng: 2.0 });
  assert.deepEqual(far.map(t => t.prov), ['Sud', 'Nord']);
});

test('towns: two letters at least; no house position: no km, the bigger first, then the name', () => {
  assert.deepEqual(twFind(T, 'b', H), []); assert.deepEqual(twFind(T, ' l\'', H), []); assert.deepEqual(twFind(T, '', H), []);
  const r = twFind(T, 'vilanova', null);
  assert.equal(r.length, 2); assert.ok(r.every(t => t.km === null));
  assert.deepEqual(twFind(T, 'barc', {}).map(t => t.km), [null, null, null]);
  assert.deepEqual(names(twFind(T, 'barc', null)), ['Barcanova', 'Barcarola', 'Barca']);   // two of 800: by name
});

test('towns: the distance by road (1.3 times the line) and the kind: a city from 100,000 people', () => {
  assert.equal(twKm(H, { lat: 40.0, lng: 1.0 }), 1);
  assert.equal(twKm(H, { lat: 41.0, lng: 1.0 }), Math.round(111.19 * 1.3));
  assert.equal(twKm({ lat: 0, lng: 0 }, { lat: 41, lng: 1 }), null);
  assert.equal(twKind({ pop: 100000 }), 'city'); assert.equal(twKind({ pop: 99999 }), 'town'); assert.equal(twKind({ pop: 0 }), 'town');
  const c = twFind(T, 'ciutat', H)[0];
  assert.deepEqual({ ...c, km: undefined }, { n: 'Ciutat Gran', lat: 40.5, lng: 1.5, pop: 450000, prov: 'Nord', km: undefined, kind: 'city' });
  assert.equal(twPrep({ rows: 'x' }), null); assert.deepEqual(twFind(null, 'barc', H), []);
});

test('towns: the committed list: GeoNames\' date, credit and licence, the provinces, Barcelona and la Bisbal del Penedès', () => {
  const d = JSON.parse(readFileSync(resolve(ROOT, 'onboarding-site/towns-es.json'), 'utf8')), L = twPrep(d);
  assert.match(d.date, /^\d{4}-\d\d-\d\d$/); assert.equal(d.source, 'GeoNames'); assert.equal(d.licence, 'CC BY 4.0'); assert.match(d.credit, /GeoNames/);
  assert.ok(L.rows.length > 8000 && L.rows.length < 10000, String(L.rows.length));
  assert.ok(d.rows.every(r => r.length === 5 && Number.isFinite(r[1]) && Number.isFinite(r[2]) && (r[4] === -1 || typeof d.provinces[r[4]] === 'string')));
  assert.ok(d.provinces.every(p => !/^(Provincia|Província|Province)/.test(p)));
  const [b] = twFind(L, 'Barc', null); assert.equal(b.n, 'Barcelona'); assert.equal(b.kind, 'city'); assert.equal(b.prov, 'Barcelona');
  assert.ok(twFind(L, 'bisbal', null, 10).some(t => t.n === 'la Bisbal del Penedès'));
  assert.ok(!/—/.test(JSON.stringify(d)));
});

// ---- The build's path for a town the host picked (start.js twPick writes the row) ----
const TOWN = { p: 'Ciutat Gran', c: 'A day out: the old town and the harbour.', lat: 40.5, lng: 1.5, kind: 'city', town: 'Ciutat Gran', province: 'Nord', pos: { from: 'geonames' } };

test('build: a picked town is ours: placesOf keeps it apart, with its pin, kind, province and the host\'s comment', () => {
  const A = { favDo: [TOWN, { p: 'Castell Vell', gid: 'Gcast3ll000aa' }], favEat: [{ ...TOWN, p: 'Ciutat Gran bar', kind: 'city' }] };
  const { rows, cards, own } = placesOf(A);
  assert.deepEqual(own.find(r => r.list === 'todo'), { p: 'Ciutat Gran', list: 'todo', lat: 40.5, lng: 1.5, kind: 'city', town: 'Ciutat Gran', province: 'Nord', c: TOWN.c });
  assert.equal(own.find(r => r.list === 'eat').kind, undefined);   // a town's kind is for Things to do only
  assert.deepEqual(rows.map(r => r.p), ['Castell Vell']); assert.equal(cards.length, 0);
  // Not ours: no mark, a Google mark, no position, a position at 0,0.
  for (const r of [{ ...TOWN, pos: undefined }, { ...TOWN, pos: { from: 'google', at: '2026-11-10' } }, { ...TOWN, lat: undefined }, { ...TOWN, lat: 0, lng: 0 }, { ...TOWN, lat: '40.5' }])
    assert.equal(placesOf({ favDo: [r] }).own.length, 0, JSON.stringify(r));
});

test('build: a picked town is never sent to Google, Overture, GeoNames or Claude, and keeps its pin, name and kind', async () => {
  const asked = [], no = what => async (...a) => { asked.push(what); throw new Error(what + ' must not be asked'); };
  const locate = { byId: no('google id'), byWords: no('google words'), name: no('google name') };
  const store = { get: no('store get'), save: no('store save') };
  const { rows, cards, own } = placesOf({ favDo: [TOWN] });
  const geo = await hostPlaces({ rows, cards, own, house: H, town: 'Casa Test' }, { GK: 'fake', locate, store, ask: no('claude'), again: no('claude again'), near: no('overture'), gaz: no('geonames') });
  assert.deepEqual(asked, []);
  const e = geo['Ciutat Gran'];
  assert.deepEqual(e, { name: 'Ciutat Gran', lat: 40.5, lng: 1.5, km: twKm(H, TOWN), town: 'Ciutat Gran', kind: 'city', gmaps: 'https://www.google.com/maps/search/?api=1&query=Ciutat%20Gran%2C%20Nord' });
  assert.equal(e.gid, undefined); assert.equal(e.pos, undefined);   // ours: no id of Google's, no date
  // No key at all (the worker without Google): the town is still written; nor is a house needed for it (no km then).
  assert.deepEqual(Object.keys(await hostPlaces({ rows: [], cards: [], own, house: H }, {})), ['Ciutat Gran']);
  assert.equal(ownEntries(own, null)['Ciutat Gran'].km, undefined);
  // The same words typed in another row (not picked) are that town: not located a second time.
  const both = placesOf({ favDo: [TOWN, { p: 'Ciutat Gran' }] });
  const seen = [], loc2 = { byId: async () => null, byWords: async w => { seen.push(w); return null; } };
  await hostPlaces({ ...both, house: H }, { locate: loc2, log: () => {} });
  assert.deepEqual(seen, []);
});

test('build: the generator puts a picked town in Things to do with its pin, icon, kind, comment and no hours', async () => {
  const { rows, cards, own } = placesOf({ favDo: [TOWN] });
  const geo = await hostPlaces({ rows, cards, own, house: H }, {});
  const src = mkdtempSync(join(tmpdir(), 'gen-town-')), slug = 'zz-test-town-' + process.pid, site = resolve(ROOT, 'sites', slug);
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Casa Test', languages: ['en', 'es'], favDo: [TOWN] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify(geo));
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', String(H.lat), '--lng', String(H.lng)], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    const todo = JSON.parse(readFileSync(join(site, 'content/todo.json'), 'utf8')), it = todo.items.find(x => x.name && x.name.en === 'Ciutat Gran');
    assert.ok(it, JSON.stringify(todo.items));
    assert.equal(it.icon, 'city'); assert.equal(it.group, 'sights'); assert.equal(it.type.en, 'City'); assert.equal(it.type.es, 'Ciudad');
    assert.equal(it.lat, 40.5); assert.equal(it.lng, 1.5); assert.equal(it.km_from_house, twKm(H, TOWN)); assert.equal(it.town, 'Ciutat Gran');
    assert.equal(it.description.en, TOWN.c);
    for (const k of ['gid', 'pos', 'nomap', 'always', 'schedule', 'phone', 'url', 'filled', 'season']) assert.equal(it[k], undefined, k);
    assert.equal(it.gmaps, 'https://www.google.com/maps/search/?api=1&query=Ciutat%20Gran%2C%20Nord');
    assert.ok(!todo.unnamed);
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});
