// The same market, found twice (worker/same-market.mjs): the full research and the quick search at the link each found
// La Bisbal del Penedès' Wednesday market, under two ids and two pins, and the guide of Yohann's test build listed it twice
// (25 Nov 2026). Records made up from that case: a public market's name and town, pins invented near the town. Nothing runs
// but the functions.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sameMarket, joinQuick, fillFrom, apart, SAME_SPOT, NEAR_TOWN } from '../same-market.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WED = [{ days: ['wed'], open: '08:30', close: '13:30' }];
// The research's record: the hours, the words, a source. The quick search's: another id, another local name, a pin about
// a kilometre off, and a number of stalls the other one lacks.
const FULL = { id: 'bisbal', category: 'street', name: { en: 'La Bisbal del Penedès Wednesday market' }, name_local: 'Mercat setmanal', town: 'La Bisbal del Penedès',
  lat: 41.2810, lng: 1.4870, km_from_house: 3, schedule: WED, description: { en: 'A handful of stalls in the village centre.' }, url: 'https://example.org/mercat' };
const QUICK = { id: 'bisbal-penedes', category: 'street', name: { en: 'La Bisbal del Penedès Wednesday market' }, name_local: 'Mercat setmanal de la Bisbal del Penedès', town: 'La Bisbal del Penedès',
  lat: 41.2890, lng: 1.4950, km_from_house: 4, schedule: WED, stalls_approx: 10, description: { en: 'Another search, other words.' } };
const M = (id, town, days, more = {}) => ({ id, category: 'street', name: { en: `${town} market` }, name_local: 'Mercat setmanal', town, lat: 41.2, lng: 1.5, schedule: [{ days, open: '08:00', close: '14:00' }], ...more });

test('the case of 25 Nov 2026: the same town, kind and day, two ids, two local names, pins a kilometre apart: one market', () => {
  const km = apart(FULL, QUICK);
  assert.ok(km > SAME_SPOT && km < NEAR_TOWN, `the pins are ${km.toFixed(2)} km apart: not the same spot, the same town`);
  assert.equal(sameMarket(FULL, QUICK), true); assert.equal(sameMarket(QUICK, FULL), true);
});

test('joinQuick: the research\'s record stays, with its id, pin, distance, hours and words; it takes only what it lacks', () => {
  const file = { _research: 'x', categories: ['street'], markets: [structuredClone(FULL)] }, before = structuredClone(file);
  const r = joinQuick(file, [structuredClone(QUICK)]);
  assert.equal(r.added, 0); assert.equal(r.joined, 1);
  assert.deepEqual(r.file.markets.map(m => m.id), ['bisbal']);                       // once, whatever the two ids
  const m = r.file.markets[0];
  assert.deepEqual({ ...m, stalls_approx: undefined }, { ...FULL, stalls_approx: undefined });   // nothing of the research's record changed
  assert.equal(m.stalls_approx, 10);                                                  // what it lacked
  assert.deepEqual(file, before);                                                     // the given file is not touched
  assert.equal(r.file._research, 'x'); assert.deepEqual(r.file.categories, ['street']);
});

test('joinQuick: a market the research does not have is added after its own, with its kind; a taken id is made its own', () => {
  const flea = M('vendrell-flea', 'El Vendrell', ['sun'], { category: 'flea' }), clash = M('bisbal', 'Bonastre', ['tue']);
  const r = joinQuick({ categories: ['street'], markets: [structuredClone(FULL)] }, [QUICK, flea, clash, clash]);
  assert.equal(r.added, 2); assert.equal(r.joined, 2);                                // La Bisbal's, then Bonastre's given twice
  assert.deepEqual(r.file.markets.map(m => m.id), ['bisbal', 'vendrell-flea', 'bisbal-near']);
  assert.deepEqual(r.file.categories, ['street', 'flea']);
  assert.equal(joinQuick({ categories: ['street'], markets: [FULL] }, []).added, 0);
  for (const x of [null, undefined, {}, { markets: null }]) assert.equal(joinQuick(x, [QUICK]).file.markets.length, 1);   // a file with no list: the quick one's
});

test('not the same market: another day, another kind, another town', () => {
  const sat = { ...QUICK, schedule: [{ days: ['sat'], open: '08:30', close: '13:30' }] };
  assert.equal(sameMarket(FULL, sat), false);                                          // the Saturday market of the same town
  assert.equal(sameMarket(FULL, { ...QUICK, schedule: [{ days: ['wed', 'sat'], open: '08:30', close: '13:30' }] }), false);   // not the same days
  assert.equal(sameMarket(FULL, { ...QUICK, category: 'flea' }), false);              // a flea market on the same morning
  assert.equal(sameMarket(M('a', 'Calafell', ['tue']), M('b', 'Segur de Calafell', ['tue'])), false);   // two places, one name inside the other
  assert.equal(sameMarket(M('a', 'Bonastre', ['tue']), M('b', 'Albinyana', ['tue'])), false);            // the same pin would not make them one town...
  assert.equal(sameMarket(M('a', 'Bonastre', ['tue']), M('b', '', ['tue'])), true);                      // ...but a record with no town counts by its pin
  assert.equal(sameMarket(M('a', 'Bonastre', ['tue']), M('b', '', ['tue'], { lat: 41.3, lng: 1.6 })), false);
});

test('the town: accents, articles and a shorter way of saying it are the same town', () => {
  assert.equal(sameMarket(FULL, { ...QUICK, town: 'la Bisbal del Penedes' }), true);
  assert.equal(sameMarket(FULL, { ...QUICK, town: 'La Bisbal' }), true);
  assert.equal(sameMarket(FULL, { ...QUICK, town: 'El Vendrell' }), false);
});

test('the names: no word of their own on either side is one market, unless the pins are further apart than a town is wide', () => {
  const far = { ...QUICK, lat: FULL.lat + 0.05 };                                      // about 5.5 km north
  assert.ok(apart(FULL, far) > NEAR_TOWN); assert.equal(sameMarket(FULL, far), false);
  assert.equal(sameMarket(FULL, { ...QUICK, lat: null, lng: null }), true);            // no pin to say otherwise
});

test('the names: words of their own must be shared, and one named market beside a plain one is told by the pins only', () => {
  const T = (id, local, lat) => ({ id, category: 'street', name: { en: 'Vilafranca Tuesday market' }, name_local: local, town: 'Vilafranca del Penedès', lat, lng: 1.70, schedule: [{ days: ['tue'], open: '09:00', close: '13:30' }] });
  const espirall = T('a', "Mercat de l'Espirall", 41.350), again = T('b', "Mercadillo de l'Espirall", 41.360), poble = T('c', 'Mercat del Poble Nou', 41.360), plain = T('d', 'Mercat setmanal', 41.360);
  assert.equal(sameMarket(espirall, again), true);                                     // the same own word, a kilometre apart
  assert.equal(sameMarket(espirall, poble), false);                                    // two named markets of one town on one day
  assert.equal(sameMarket(espirall, plain), false);                                    // only one says which: not known to be it...
  assert.equal(sameMarket(espirall, { ...plain, lat: 41.352 }), true);                 // ...unless it stands on the same spot
  assert.equal(sameMarket(espirall, { ...poble, lat: 41.352 }), true);                 // the same spot, town, kind and day: one market under two names
});

test('a record with no rows: the weekdays the names say must not be other ones', () => {
  const noRows = { ...QUICK, schedule: [] };
  assert.equal(sameMarket(FULL, noRows), true);                                        // "Wednesday market", no hours found by the quick search
  assert.equal(sameMarket(FULL, { ...noRows, name: { en: 'La Bisbal del Penedès Saturday market' } }), false);
  assert.equal(sameMarket(FULL, { ...noRows, name: { en: 'La Bisbal del Penedès market' }, name_local: 'Mercat setmanal' }), true);   // it names no day
});

test('fillFrom: only what is missing, never the id, and a pin only whole', () => {
  const keep = { id: 'a', name: { en: 'A' }, lat: 41.2, lng: null, tags: [], flags: ['check'], description: {} };
  const out = fillFrom(keep, { id: 'b', name: { en: 'B' }, lat: 40, lng: 1, tags: ['food'], flags: ['older'], description: { en: 'Words.' }, gid: 'g-1' });
  assert.deepEqual(out, { id: 'a', name: { en: 'A' }, lat: 40, lng: 1, tags: ['food'], flags: ['check'], description: { en: 'Words.' }, gid: 'g-1' });
  assert.deepEqual(fillFrom({ id: 'a', lat: 41.2, lng: 1.5 }, { lat: 40, lng: 1 }), { id: 'a', lat: 41.2, lng: 1.5 });
});

test('the build joins the two searches with this rule, before the host\'s distance cuts them', () => {
  const src = readFileSync(resolve(ROOT, 'worker/guide-worker.mjs'), 'utf8');
  assert.match(src, /import \{ joinQuick \} from '\.\/same-market\.mjs';/);
  assert.match(src, /const r = joinQuick\(JSON\.parse\(readFileSync\(f, 'utf8'\)\), q\);/);
  assert.match(src, /mergeQuick\(researchDir, quick\); reachCut\(researchDir, A\);/);
});
