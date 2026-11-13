// The markets a build holds back (Yohann, 13 Nov 2026): every market with a Google id leaves the built guide and waits in
// a find-markets job for the host's maker, which asks Google live (worker/research-brief.mjs holdMarkets, guide-worker.mjs
// holdBack). Made-up markets only; nothing runs but the function.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { holdMarkets } from '../research-brief.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const M = (id, category, gid) => ({ id, category, name: { en: id, es: id }, description: { en: 'A market.', es: 'Un mercado.' }, lat: 41.6, lng: 2.7, schedule: [], ...(gid ? { gid } : {}) });
const FILE = { _doc: 'Markets.', _research: 'copied from research by generate-site.py', categories: ['street', 'covered', 'flea', 'events'],
  markets: [M('weekly-a', 'street', 'g-a'), M('hall-b', 'covered'), M('flea-c', 'flea', 'g-c'), M('weekly-d', 'street'), M('fair-e', 'events', 'g-e')] };

test('every market with a Google id is held, in its order, as it was; the others stay', () => {
  const h = holdMarkets(structuredClone(FILE));
  assert.deepEqual(h.held.map(m => m.id), ['weekly-a', 'flea-c', 'fair-e']);
  assert.deepEqual(h.file.markets.map(m => m.id), ['hall-b', 'weekly-d']);
  assert.deepEqual(h.held[0], M('weekly-a', 'street', 'g-a'));   // nothing of a held market changed: the maker puts it in as the build made it
});

test('the categories: the kept file keeps only those of its markets, in its order; the held ones carry theirs', () => {
  const h = holdMarkets(structuredClone(FILE));
  assert.deepEqual(h.file.categories, ['street', 'covered']);
  assert.deepEqual(h.categories, ['street', 'flea', 'events']);
  assert.equal(h.file._doc, 'Markets.'); assert.equal(h.file._research, FILE._research);   // the file's other keys stay
});

test('every market held: the guide keeps an empty list (the guide hides the section until the maker adds them)', () => {
  const all = { categories: ['street'], markets: [M('a', 'street', 'g-1'), M('b', 'street', 'g-2')] }, h = holdMarkets(all);
  assert.deepEqual(h.file.markets, []); assert.deepEqual(h.file.categories, []); assert.equal(h.held.length, 2);
});

test('nothing with a Google id (no key on the server): nothing held, the same file', () => {
  const plain = { categories: ['street'], markets: [M('a', 'street'), M('b', 'street')] }, h = holdMarkets(plain);
  assert.equal(h.file, plain); assert.deepEqual(h.held, []); assert.deepEqual(h.categories, []);
  for (const x of [null, undefined, {}, { markets: null }]) assert.deepEqual(holdMarkets(x).held, []);
});

test('a held market whose category the file does not list still carries it', () => {
  const h = holdMarkets({ categories: ['street'], markets: [M('a', 'antiques', 'g-1'), M('b', 'street')] });
  assert.deepEqual(h.categories, ['antiques']); assert.deepEqual(h.file.categories, ['street']);
});

test('the build holds them back as its last change before the guide\'s row is made, and the job is the maker\'s shape', () => {
  const src = readFileSync(resolve(ROOT, 'worker/guide-worker.mjs'), 'utf8');
  const hold = src.indexOf('await holdBack(siteDir, id);'), row = src.indexOf("run('node', ['engine/scripts/guide-to-row.mjs'"), check = src.indexOf("run('node', ['engine/scripts/run.js', 'check'");
  assert.ok(check > 0 && hold > check && row > hold, 'holdBack runs after the checks and the translation, right before guide-to-row');
  assert.match(src, /kind: 'find-markets', status: 'done'[^\n]*result: \{ kind: 'find-markets', held: true, items: h\.held, categories: h\.categories \}/);
  assert.match(src, /writeFileSync\(f, JSON\.stringify\(\{ \.\.\.h\.file, held: jid \}/);   // the guide names its held job
});
