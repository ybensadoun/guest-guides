// Which ride apps work near a house (engine/src/modules/transport/apps.js, README.md beside it, "The ride apps"). Pure.
//   node --test engine/scripts/transport-apps.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { axNear, axEntry, AX_KM } from '../src/modules/transport/apps.js';

const APPS = JSON.parse(readFileSync(new URL('../src/modules/transport/apps.json', import.meta.url), 'utf8')).apps;
const at = km => ({ lat: 40 + km * 0.008993, lng: 0 });
const H = at(0), city = (name, km) => ({ name, ...at(km) });

test('apps.json: Uber, Cabify, Bolt, each with its own address', () => {
  assert.deepEqual(APPS.map(a => a.id), ['uber', 'cabify', 'bolt']);
  assert.ok(APPS.every(a => /^https:\/\//.test(a.link) && a.name));
});

test('axNear: within 12 km of one of its cities, in the table\'s order; a row not sure yet says nothing', () => {
  const rows = [{ app: 'bolt', cities: [city('A', 11)], checked_at: '2026-11-10T00:00:00Z' }, { app: 'uber', cities: [city('B', 40), city('C', 5)], checked_at: '2026-11-12T00:00:00Z' },
    { app: 'cabify', cities: [city('D', 13)], checked_at: '2026-11-12T00:00:00Z' }];
  assert.deepEqual(axNear(H, rows, APPS).map(a => [a.id, a.at]), [['uber', '2026-11-12'], ['bolt', '2026-11-10']]);
  assert.equal(AX_KM, 12);
  assert.deepEqual(axNear(H, [{ app: 'uber', cities: [city('C', 1)], checked_at: null }], APPS), []);
  assert.deepEqual(axNear({ lat: 0, lng: 0 }, rows, APPS), []); assert.deepEqual(axNear(H, null, APPS), []);
});

test('axEntry: the app as the guide holds it', () => {
  assert.deepEqual(axEntry({ id: 'uber', name: 'Uber', link: 'https://www.uber.com/', at: '2026-11-12' }), { id: 'uber', name: 'Uber', link: 'https://www.uber.com/', src: { from: 'search', at: '2026-11-12' } });
  assert.deepEqual(axEntry(APPS[2], '2026-11-16').src, { from: 'search', at: '2026-11-16' });
});
