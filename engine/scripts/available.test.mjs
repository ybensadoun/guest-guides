// Where each part of the guide works (engine/src/modules/available.json): the list is well made, names the fourteen
// modules in their order, and the modules page's copy is the list itself.  node --test engine/scripts/available.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkList, samplesIndex, SOURCE } from '../../onboarding-site/modules/build.mjs';
import { avPart, avPartOn, avPartSet, avCountryState, avCountryOpen, avParts } from '../src/modules/available.js';
import { spawnSync } from 'node:child_process';

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

// The rule itself (engine/src/modules/available.js)
const L = { countries: ['ES'], modules: [{ id: 'transport', parts: [{ id: 'taxis', where: 'any' }, { id: 'trains', where: ['ES'] }] }] };
test('with no word of the owner the list says', () => {
  assert.equal(avPartOn(L, null, 'transport/trains', 'ES'), true);
  assert.equal(avPartOn(L, null, 'transport/trains', 'FR'), false);
  assert.equal(avPartOn(L, { switches: [], countries: [] }, 'transport/taxis', 'FR'), true);
});
test('in a launched country a switch of the owner wins, for its country only', () => {
  const launch = { countries: [{ country: 'FR', state: 'open' }], switches: [{ module: 'transport', part: 'trains', country: 'FR', is_on: true }, { module: 'transport', part: 'taxis', country: 'ES', is_on: false }] };
  assert.equal(avPartOn(L, launch, 'transport/trains', 'FR'), true);
  assert.equal(avPartOn(L, launch, 'transport/taxis', 'ES'), false);     // Spain is launched by the list
  assert.equal(avPartOn(L, launch, 'transport/taxis', 'PT'), true);
  assert.equal(avPartOn(L, launch, 'transport/trains', 'PT'), false);
});
test('in a country still being prepared the switches wait: the list alone decides, and no door is closed', () => {
  const launch = { countries: [{ country: 'FR', state: 'preparing' }], switches: [{ module: 'transport', part: 'trains', country: 'FR', is_on: true }, { module: 'transport', part: 'taxis', country: 'FR', is_on: false }] };
  assert.equal(avPartOn(L, launch, 'transport/trains', 'FR'), false);    // set on, not launched: not yet
  assert.equal(avPartOn(L, launch, 'transport/taxis', 'FR'), true);      // works anywhere: a house there still gets it
  assert.equal(avPartSet(L, launch, 'transport/trains', 'FR'), true);    // what the owner has set, as his page shows it
  assert.equal(avPartSet(L, launch, 'transport/taxis', 'FR'), false);
  assert.equal(avPartOn(L, { ...launch, countries: [{ country: 'FR', state: 'open' }] }, 'transport/taxis', 'FR'), false);   // launched: his switches count
  assert.equal(avPartOn(L, { countries: [{ country: 'ES', state: 'preparing' }], switches: [{ module: 'transport', part: 'trains', country: 'ES', is_on: false }] }, 'transport/trains', 'ES'), true);   // Spain closed again by the owner: back to the list
  assert.deepEqual(avParts(L, null, 'CN'), { 'transport/taxis': true, 'transport/trains': false });   // a country nobody has looked at
});
test('a house with no known country, and a part the list does not name, are never cut', () => {
  assert.equal(avPartOn(L, null, 'transport/trains', ''), true);
  assert.equal(avPartOn(L, null, 'transport/trains', undefined), true);
  assert.equal(avPartOn(L, null, 'transport/boats', 'FR'), true);
  assert.equal(avPart(L, 'transport/boats'), null);
});
test('a country is open when the owner opened it, else when the list names it', () => {
  assert.equal(avCountryState(L, null, 'ES'), 'open');
  assert.equal(avCountryState(L, null, 'FR'), 'preparing');
  assert.equal(avCountryOpen(L, { countries: [{ country: 'FR', state: 'open' }] }, 'FR'), true);
  assert.equal(avCountryOpen(L, { countries: [{ country: 'ES', state: 'preparing' }] }, 'ES'), false);
  assert.equal(avCountryOpen(L, null, ''), true);
});
test('every part for a country, and the same from the script the generator asks', () => {
  assert.deepEqual(avParts(L, null, 'FR'), { 'transport/taxis': true, 'transport/trains': false });
  const all = avParts(list, null, 'ES'); assert.equal(Object.keys(all).length, list.modules.reduce((n, m) => n + m.parts.length, 0)); assert.ok(Object.values(all).every(Boolean));
  const r = spawnSync('node', [resolve(ROOT, 'engine/scripts/available-of.mjs')], { input: JSON.stringify({ country: 'FR', launch: { countries: [{ country: 'FR', state: 'open' }], switches: [{ module: 'transport', part: 'apps', country: 'FR', is_on: true }] } }), encoding: 'utf8' });
  const o = JSON.parse(r.stdout);
  assert.equal(o.country, 'FR'); assert.equal(o.open, true); assert.equal(o.parts['transport/apps'], true); assert.equal(o.parts['transport/trains'], false); assert.equal(o.parts['transport/taxis'], true);
  assert.deepEqual(JSON.parse(spawnSync('node', [resolve(ROOT, 'engine/scripts/available-of.mjs')], { input: '{}', encoding: 'utf8' }).stdout).parts, avParts(list, null, ''));
});
test('the modules page uses the rule itself, not a copy of its own', () => {
  const copy = readFileSync(resolve(PAGE, 'available.js'), 'utf8'), src = readFileSync(resolve(ROOT, 'engine/src/modules/available.js'), 'utf8');
  assert.equal(copy, src.replace(/^export /gm, ''));
  const js = readFileSync(resolve(PAGE, 'console.js'), 'utf8');
  assert.ok(/avPartSet\(/.test(js) && /avCountryState\(/.test(js) && !/where === 'any'/.test(js));
});
