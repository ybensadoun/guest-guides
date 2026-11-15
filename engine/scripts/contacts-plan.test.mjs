// The Emergencies module's rules (engine/src/modules/contacts/plan.js, README.md beside it): a group's word, an address's
// map link, the tile's short label. Written from the guide's behaviour on 14 Nov 2026 (views/section.js and views/home.js
// before the module). Pure.   node --test engine/scripts/contacts-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupKey, mapsSearch, tileLabelKey } from '../src/modules/contacts/plan.js';

test('groupKey: c_<id>, health for a hospital, a pharmacy, a clinic or a medical centre', () => {
  assert.equal(groupKey('urgent'), 'c_urgent');
  for (const id of ['hospital', 'pharmacy', 'clinic', 'medical', 'health']) assert.equal(groupKey(id), 'c_health');
  assert.equal(groupKey('vet'), 'c_vet');
});

test('groupKey: every group of the local guides has a word in English', () => {
  const en = JSON.parse(readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'));
  for (const s of ['ca-la-kimberly', 'demo-casa-llimona', 'home-in-querol-test', 'torre-de-campos']) {
    const f = JSON.parse(readFileSync(new URL(`../../sites/${s}/content/emergency.json`, import.meta.url), 'utf8'));
    for (const g of f.groups) assert.ok(en[groupKey(g.id)], `${s}: ${g.id}`);
  }
});

test('mapsSearch: a Google Maps search for the address', () => {
  assert.equal(mapsSearch('Carrer Major 1, Vila & Co'), 'https://www.google.com/maps/search/?api=1&query=Carrer%20Major%201%2C%20Vila%20%26%20Co');
});

test('tileLabelKey: the short label by the section\'s id, else the section\'s own', () => {
  assert.equal(tileLabelKey({ id: 'emergency', labelKey: 'emergency' }), 'emergencyTile');
  assert.equal(tileLabelKey({ id: 'help', labelKey: 'help' }), 'help');
});
