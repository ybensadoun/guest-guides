// Where each part of the guide works (engine/src/modules/available.json): the list is well made, names the fourteen
// modules in their order, and the modules page's copy is the list itself.  node --test engine/scripts/available.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkList, samplesIndex, SOURCE } from '../../onboarding-site/modules/build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), PAGE = resolve(ROOT, 'onboarding-site/modules');
const text = readFileSync(SOURCE, 'utf8'), list = JSON.parse(text);

test('the list is well made', () => { assert.deepEqual(checkList(list), []); });

test('the fourteen modules, in the conversations\' order', () => {
  assert.deepEqual(list.modules.map(m => m.id), ['transport', 'home', 'markets', 'events', 'restaurants', 'todo', 'house', 'rubbish', 'contacts', 'nightlife', 'houseguide', 'wifi', 'map', 'look']);
});

test('the modules page knows the same modules', () => {
  const js = readFileSync(resolve(PAGE, 'console.js'), 'utf8'), ids = [...js.matchAll(/^\s*\{ id: '([a-z]+)', c: '/gm)].map(m => m[1]);
  assert.deepEqual(ids, list.modules.map(m => m.id));
});

test('the modules page\'s copies are in step (node onboarding-site/modules/build.mjs)', () => {
  assert.equal(readFileSync(resolve(PAGE, 'available.json'), 'utf8'), text);
  const idx = resolve(PAGE, 'samples/index.json');
  if (existsSync(idx)) assert.deepEqual(JSON.parse(readFileSync(idx, 'utf8')), samplesIndex());
});

test('a list that is wrong says how', () => {
  assert.ok(checkList({ countries: ['ES'], modules: [{ id: 'x', name: 'X', parts: [{ id: 'p', name: 'P', where: ['Spain'], why: 'w' }] }] }).some(m => /where/.test(m)));
  assert.ok(checkList({ countries: ['ES'], modules: [{ id: 'x', name: 'X', parts: [] }] }).some(m => /no parts/.test(m)));
});
