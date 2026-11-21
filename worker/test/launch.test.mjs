// The launch desk in the maker and the generator (docs/plan-launch-desk-gates.md): the maker's helper partOn
// (onboarding-site/src/launch.js) with the engine's own rule and a made-up world, a faked database and a faked countries
// file; and the generator writing a house's country into content/house.json. Positions are public town centres. Nothing
// is asked of anyone.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as AV from '../../engine/src/modules/available.js';
import * as CTRY from '../../engine/src/country.js';
import { countryOf, readLaunch, launchFor } from '../launch.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = readFileSync(join(ROOT, 'onboarding-site/src/launch.js'), 'utf8');
const LIST = { countries: ['AA'], modules: [{ id: 'transport', parts: [{ id: 'taxis', where: 'any' }, { id: 'trains', where: ['AA'] }] }] };
const sq = (w, s, e, n) => [w * 100, s * 100, (e - w) * 100, 0, 0, (n - s) * 100, -(e - w) * 100, 0];
const WORLD = { rows: [['AA', [sq(0, 40, 10, 50)]], ['BB', [sq(20, 40, 30, 50)]]] };   // two countries, far apart
const tick = () => new Promise(r => setTimeout(r, 5));

// The maker around the helper, faked: the answers (A), the editor (CM, edF), the database and the countries file (fetch).
function maker({ A = {}, house = null, launch = { countries: [], switches: [] }, world = WORLD } = {}) {
  const m = { A, asked: [], draws: 0, saves: 0 };
  const fetch = async url => { m.asked.push(String(url).replace('https://db.test', ''));
    const body = String(url).includes('launch_public') ? launch : world;
    if (body === null) throw new Error('down');
    return { ok: true, json: async () => body }; };
  const start = [];
  const make = new Function('SB', 'A', 'CM', 'edF', 'AV', 'AV_LIST', 'CTRY', 'flush', 'render', 'fetch', 'setTimeout', SRC + '\nreturn { partOn, ldCountry, LD };');
  Object.assign(m, make({ url: 'https://db.test', key: 'k' }, A, { on: !!house }, () => ({ house }), AV, LIST, CTRY, () => { m.saves++; }, () => { m.draws++; }, fetch, f => start.push(f)));
  m.boot = async () => { for (const f of start) f(); await tick(); };
  return m;
}

test('launch.js: the owner\'s word is asked once at the start, with the public key\'s address, and nothing else', async () => {
  const m = maker({ A: { lat: 45, lng: 5 } }); await m.boot();
  assert.deepEqual(m.asked, ['/rest/v1/rpc/launch_public']);   // an empty answer: the countries file is not even fetched
  assert.equal(m.draws, 0);
});
test('launch.js: a house in the list\'s own country keeps everything, and its country is kept with its position', async () => {
  const m = maker({ A: { lat: 45, lng: 5 } }); await m.boot();
  assert.equal(m.partOn('transport/trains'), true);            // not known yet: nothing is cut
  await tick();
  assert.equal(m.A.country, 'AA'); assert.equal(m.A._countryAt, '45.000,5.000'); assert.equal(m.saves, 1);
  assert.equal(m.partOn('transport/trains'), true); assert.equal(m.draws, 0);
  assert.equal(m.asked.filter(u => u === '/countries.json').length, 1);
  m.partOn('transport/taxis'); await tick(); assert.equal(m.asked.length, 2);   // asked once, never again
});
test('launch.js: a house in another country loses the part tied to the first, once its country is read, and the screen is drawn again', async () => {
  const m = maker({ A: { lat: 45, lng: 25 } }); await m.boot();
  assert.equal(m.partOn('transport/trains'), true);
  await tick();
  assert.equal(m.A.country, 'BB'); assert.equal(m.draws, 1);
  assert.equal(m.partOn('transport/trains'), false); assert.equal(m.partOn('transport/taxis'), true);
});
test('launch.js: the answers\' country counts only for the position it was read from', async () => {
  const m = maker({ A: { lat: 45, lng: 5, country: 'BB', _countryAt: '45.000,25.000' } }); await m.boot();
  m.partOn('transport/trains'); await tick();
  assert.equal(m.A.country, 'AA'); assert.equal(m.partOn('transport/trains'), true);
});
test('launch.js: in the editor the guide\'s own country is used, with no file read; a guide without one is read from its position, and nothing is written', async () => {
  const m = maker({ house: { lat: 45, lng: 5, country: 'BB' } }); await m.boot();
  assert.equal(m.partOn('transport/trains'), false); await tick();
  assert.deepEqual(m.asked, ['/rest/v1/rpc/launch_public']);
  const old = maker({ house: { lat: 45, lng: 25 } }); await old.boot();
  assert.equal(old.partOn('transport/trains'), true); await tick();
  assert.equal(old.partOn('transport/trains'), false); assert.equal(old.saves, 0); assert.equal(old.A.country, undefined);
});
test('launch.js: the owner\'s switches count in a launched country, and a launch that says something draws the screen again when a part goes', async () => {
  const launch = { countries: [{ country: 'BB', state: 'open' }], switches: [{ module: 'transport', part: 'trains', country: 'BB', is_on: true }, { module: 'transport', part: 'taxis', country: 'BB', is_on: false }] };
  const m = maker({ house: { lat: 45, lng: 25, country: 'BB' }, launch }); await m.boot();
  assert.equal(m.partOn('transport/trains'), true); assert.equal(m.partOn('transport/taxis'), false); assert.equal(m.draws, 1);
  const prep = maker({ house: { lat: 45, lng: 25, country: 'BB' }, launch: { ...launch, countries: [{ country: 'BB', state: 'preparing' }] } }); await prep.boot();
  assert.equal(prep.partOn('transport/trains'), false); assert.equal(prep.partOn('transport/taxis'), true);   // not launched: the list alone
});
test('launch.js: nothing loads: nothing is cut, and the countries file is not asked again within the minute', async () => {
  const m = maker({ A: { lat: 45, lng: 25 }, launch: null, world: null }); await m.boot();
  assert.equal(m.partOn('transport/trains'), true); await tick();
  assert.equal(m.partOn('transport/trains'), true); await tick();
  assert.equal(m.asked.filter(u => u === '/countries.json').length, 1);
  assert.equal(m.A.country, undefined); assert.equal(m.draws, 0);
  const odd = maker({ A: { lat: 45, lng: 25 }, launch: { message: 'not found' } }); await odd.boot();   // the function is not in the database
  assert.equal(odd.LD.launch, null);
});
test('launch.js: a house with no position has no country, and nothing is asked for it', async () => {
  const m = maker({ A: {} }); await m.boot();
  assert.equal(m.partOn('transport/trains'), true); await tick();
  assert.deepEqual(m.asked, ['/rest/v1/rpc/launch_public']);
});

// The generator
let n = 0;
function generate(answers, [lat, lng], launch) {
  const src = mkdtempSync(join(tmpdir(), 'gen-cc-')), slug = `zz-test-country-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Test town', languages: ['en'], ...answers } }));
    if (launch !== undefined) writeFileSync(join(src, 'launch.json'), JSON.stringify(launch));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', lat, '--lng', lng], { cwd: ROOT, encoding: 'utf8', timeout: 60000, env: { ...process.env, STOPS_DIR: join(src, 'no-stops') } });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const read = f => existsSync(join(site, f)) ? JSON.parse(readFileSync(join(site, f), 'utf8')) : null;
    return { house: read('content/house.json'), transport: read('content/transport.json') };
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}
const house = (answers, at) => generate(answers, at).house;
test('the generator writes the house\'s country, read from its position with our outlines file', () => {
  assert.equal(house({}, ['41.2186', '1.535']).country, 'ES');          // El Vendrell's centre
  assert.equal(house({}, ['48.8566', '2.3522']).country, 'FR');         // Paris
});
test('the generator: the builder\'s own answer counts for the same position only; a border, no field', () => {
  assert.equal(house({ country: 'PT', _countryAt: '41.219,1.535' }, ['41.2186', '1.535']).country, 'PT');   // read by the builder from this position: kept as it is
  assert.equal(house({ country: 'PT', _countryAt: '38.722,-9.139' }, ['41.2186', '1.535']).country, 'ES');  // from another position: read again
  assert.equal('country' in house({}, ['42.4316', '1.9283']), false);   // Puigcerdà: at the border, not known
});

// The worker's image holds only what .dockerignore lets in from onboarding-site/: every file a script of the engine reads
// there at a build must be let in (found on 21 Nov 2026: the countries file was not, and the server read no country).
test('the worker\'s image holds the files the generator\'s scripts read from onboarding-site/', () => {
  const ignore = readFileSync(join(ROOT, '.dockerignore'), 'utf8').split('\n');
  assert.ok(ignore.includes('onboarding-site/*'));
  const scripts = ['country-of.mjs', 'stations-of.mjs'].map(f => readFileSync(join(ROOT, 'engine/scripts', f), 'utf8')).join('\n');
  const read = [...scripts.matchAll(/onboarding-site\/([\w.-]+\.json)/g)].map(m => m[1]);
  assert.ok(read.includes('countries.json') && read.includes('stations-es.json'));
  for (const f of new Set(read)) { assert.ok(ignore.includes('!onboarding-site/' + f), `.dockerignore must let in onboarding-site/${f}`); assert.ok(existsSync(join(ROOT, 'onboarding-site', f)), f + ' is committed'); }
});

// The worker's own helper (worker/launch.mjs)
test('worker: the house\'s country is the builder\'s answer for the same position, else read from the position', () => {
  assert.equal(countryOf({ lat: 41.2186, lng: 1.535 }), 'ES');                                              // El Vendrell's centre, from our file
  assert.equal(countryOf({ lat: '48.8566', lng: '2.3522' }), 'FR');                                         // as the answers hold them, in words
  assert.equal(countryOf({ lat: 41.2186, lng: 1.535, country: 'PT', _countryAt: '41.219,1.535' }), 'PT');   // read by the builder there: kept
  assert.equal(countryOf({ lat: 41.2186, lng: 1.535, country: 'PT', _countryAt: '38.722,-9.139' }), 'ES');  // read elsewhere: read again
  assert.equal(countryOf({ lat: 42.4316, lng: 1.9283, country: '', _countryAt: '42.432,1.928' }), '');      // the builder found a border: not known
  assert.equal(countryOf({ lat: 42.4316, lng: 1.9283 }), ''); assert.equal(countryOf({}), ''); assert.equal(countryOf(null), '');
  assert.equal(countryOf({ lat: 41.2186, lng: 1.535 }, join(ROOT, 'no-such-file.json')), '');               // the file missing: not known, never an error
});
test('worker: the owner\'s word is read from the two tables; no answer, the list alone decides', async () => {
  const asked = [], rest = async p => { asked.push(p.split('?')[0]); return p.includes('launch_countries') ? [{ country: 'FR', state: 'open' }] : [{ module: 'transport', part: 'trains', country: 'FR', is_on: true }]; };
  const launch = await readLaunch(rest);
  assert.deepEqual(asked.sort(), ['/rest/v1/launch_countries', '/rest/v1/module_switches']);
  assert.equal(launchFor(launch, 'FR').on('transport/trains'), true);
  assert.equal(launchFor(launch, 'PT').on('transport/trains'), false);
  assert.equal(launchFor(launch, 'ES').on('transport/trains'), true);
  assert.equal(launchFor(launch, '').on('transport/trains'), true);           // country not known: nothing is cut
  assert.equal(await readLaunch(async () => { throw new Error('down'); }), null);
  assert.equal(await readLaunch(async () => ({ message: 'no' })), null);
  const none = launchFor(null, 'FR');
  assert.equal(none.on('transport/trains'), false); assert.equal(none.on('transport/taxis'), true);
  assert.deepEqual(JSON.parse(none.file()), { country: 'FR', launch: null });
});

// The first gates: Getting around's train stations, stops and ride apps at the build
const VENDRELL = ['41.2186', '1.535'], SJDL = ['43.388', '-1.663'];   // El Vendrell's centre; Saint-Jean-de-Luz's, in France, 9 km from the border
const renfe = t => ((t && t.stations) || []).filter(s => s.src && s.src.from === 'renfe');
test('gates: a house in Spain gets its stations as before, with no word of the owner and with an empty one', () => {
  const a = generate({}, VENDRELL), b = generate({}, VENDRELL, { country: 'ES', launch: { countries: [], switches: [] } }), c = generate({}, VENDRELL, { country: 'ES', launch: null });
  assert.ok(renfe(a.transport).length >= 1);
  assert.deepEqual(b.transport, a.transport); assert.deepEqual(c.transport, a.transport);
});
test('gates: a house in France is not given Spain\'s stations, though one is within reach', () => {
  const near = JSON.parse(spawnSync('node', ['engine/scripts/stations-of.mjs'], { cwd: ROOT, input: JSON.stringify({ lat: +SJDL[0], lng: +SJDL[1], langs: ['en'] }), encoding: 'utf8' }).stdout).stations;
  assert.ok(near.length >= 1, 'the rule alone would give this French house a Spanish station');
  const g = generate({ taxi: 'Taxi Test 600 000 000' }, SJDL);
  assert.equal(g.house.country, 'FR'); assert.deepEqual(renfe(g.transport), []);
  assert.equal(g.transport.taxis.length, 1);   // what the host typed stays
});
test('gates: the owner switches Spain\'s trains off: no station at the build; his word for a country not launched waits', () => {
  const off = { countries: [], switches: [{ module: 'transport', part: 'trains', country: 'ES', is_on: false }] };
  assert.deepEqual(renfe(generate({ taxi: 'Taxi Test 600 000 000' }, VENDRELL, { country: 'ES', launch: off }).transport), []);
  const fr = { countries: [{ country: 'FR', state: 'preparing' }], switches: [{ module: 'transport', part: 'trains', country: 'FR', is_on: true }] };
  assert.deepEqual(renfe(generate({ taxi: 'Taxi Test 600 000 000' }, SJDL, { country: 'FR', launch: fr }).transport), []);
  const launched = { countries: [{ country: 'FR', state: 'open' }], switches: fr.switches };
  assert.ok(renfe(generate({}, SJDL, { country: 'FR', launch: launched }).transport).length >= 1);   // launched with trains on: his word counts
});
test('gates: ride apps the host approved go in where the part is on, and not where it is off', () => {
  const found = [{ id: 'uber', name: 'Uber' }];
  const es = generate({ apps: ['uber'], _appsFound: found }, VENDRELL), fr = generate({ apps: ['uber'], _appsFound: found, taxi: 'Taxi Test 600 000 000' }, SJDL);
  assert.deepEqual((es.transport.apps || []).map(a => a.id), ['uber']);
  assert.deepEqual(fr.transport.apps || [], []);
});
test('gates: a launch file that is not JSON changes nothing', () => {
  const src = generate({}, VENDRELL, 'not an object');
  assert.ok(renfe(src.transport).length >= 1);
});
