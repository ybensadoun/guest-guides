// The Emergencies module's rules (engine/src/modules/contacts/plan.js, README.md beside it): a group's word, an address's
// map link, the tile's short label, a number as the page writes it. Written from the guide's behaviour on 14 Nov 2026
// (views/section.js and views/home.js before the module). Pure.   node --test engine/scripts/contacts-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { groupKey, mapsSearch, tileLabelKey, phoneShown, contactHours, wordOf, linkOf } from '../src/modules/contacts/plan.js';
import { daysList } from '../src/days.js';

test('groupKey: c_<id>, health for a hospital, a pharmacy, a clinic or a medical centre', () => {
  assert.equal(groupKey('urgent'), 'c_urgent');
  for (const id of ['hospital', 'pharmacy', 'clinic', 'medical', 'health']) assert.equal(groupKey(id), 'c_health');
  assert.equal(groupKey('vet'), 'c_vet');
});

test('groupKey: every group of the local guides has a word in English', () => {
  const en = JSON.parse(readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'));
  let read = 0;
  for (const s of ['ca-la-kimberly', 'demo-casa-llimona', 'home-in-querol-test', 'torre-de-campos']) {
    const at = new URL(`../../sites/${s}/content/emergency.json`, import.meta.url);
    if (!existsSync(at)) continue;   // torre-de-campos is a local test site, not in git: a worktree or a fresh clone has none
    const f = JSON.parse(readFileSync(at, 'utf8')); read++;
    for (const g of f.groups) assert.ok(en[groupKey(g.id)], `${s}: ${g.id}`);
  }
  assert.ok(read >= 1, 'no guide read');
});

test('mapsSearch: a Google Maps search for the address', () => {
  assert.equal(mapsSearch('Carrer Major 1, Vila & Co'), 'https://www.google.com/maps/search/?api=1&query=Carrer%20Major%201%2C%20Vila%20%26%20Co');
});

test('tileLabelKey: the short label by the section\'s id, else the section\'s own', () => {
  assert.equal(tileLabelKey({ id: 'emergency', labelKey: 'emergency' }), 'emergencyTile');
  assert.equal(tileLabelKey({ id: 'help', labelKey: 'help' }), 'help');
});

test('phoneShown: a number in one piece is grouped, one written with spaces and a short one stay', () => {
  assert.equal(phoneShown('977257914'), '977 25 79 14');
  assert.equal(phoneShown('+34977257914'), '977 25 79 14');
  assert.equal(phoneShown('608835327'), '608 83 53 27');
  assert.equal(phoneShown('977-688-550'), '977 68 85 50');
  for (const n of ['112', '061', '900 878 212', '91 562 04 20', '977 25 79 14', '+33100000004']) assert.equal(phoneShown(n), n);
  assert.equal(phoneShown(' 977688724 '), '977 68 87 24');
  assert.equal(phoneShown(undefined), '');
});

test('phoneShown: every number Ca La Kimberly holds is shown as it is written', () => {
  const f = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/emergency.json', import.meta.url), 'utf8'));
  const all = f.groups.flatMap(g => g.items).map(it => it.phone).filter(Boolean);
  assert.ok(all.length >= 8);
  for (const n of all) assert.equal(phoneShown(n), n);
});

// The shapes a guide built on 22 Nov 2026 held (its Emergencies page went blank: "e.days.map is not a function").
test('contactHours: days written as words are read, a row that cannot be read is left out, never an error', () => {
  const row = (days, open = '09:00', close = '14:00') => ({ days, open, close });
  assert.deepEqual(contactHours([row('mon-fri')]), [row(['mon', 'tue', 'wed', 'thu', 'fri'])]);
  assert.deepEqual(contactHours([row('sat')]), [row(['sat'])]);
  assert.deepEqual(contactHours([row('mon'), row('wed', '15:00', '20:00')]), [row(['mon']), row(['wed'], '15:00', '20:00')]);
  assert.deepEqual(contactHours([row('Mon-Sat', '9:30', '13.30')]), [row(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], '09:30', '13:30')]);
  assert.deepEqual(contactHours([row('daily', '00:00', '24:00')]).map(r => r.days.length), [7]);
  assert.deepEqual(contactHours([row('Monday and Wednesday')]), [row(['mon', 'wed'])]);
  assert.deepEqual(contactHours([row('fri-mon')]).map(r => r.days), [['mon', 'fri', 'sat', 'sun']]);
  // what cannot be read: that row only
  assert.deepEqual(contactHours([row('weekdays'), row('sat')]), [row(['sat'])]);
  assert.deepEqual(contactHours([row('mon', 'morning', '14:00'), row(['tue'], '09:00', '')]), []);
  for (const bad of [undefined, null, '', 'mon-fri 9-14', 7, {}, [null], ['mon'], [{}], [{ days: null }], [{ days: 5, open: 9, close: 14 }], [{ days: ['mon', 'xyz'], open: '09:00', close: '14:00' }]]) assert.deepEqual(contactHours(bad), []);
});

test('contactHours: every schedule Ca La Kimberly holds is read as it is written', () => {
  const f = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/emergency.json', import.meta.url), 'utf8'));
  const all = f.groups.flatMap(g => g.items).filter(it => it.schedule);
  assert.ok(all.length >= 3);
  for (const it of all) assert.deepEqual(contactHours(it.schedule), it.schedule);
});

test('daysList: a list, a range, a single day, words; else null', () => {
  assert.deepEqual(daysList(['wed', 'mon']), ['mon', 'wed']);
  assert.deepEqual(daysList('Tue-Sun'), ['tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.deepEqual(daysList('thursday'), ['thu']);
  for (const bad of ['', null, undefined, 'weekdays', 'mon-xyz', 12, {}]) assert.equal(daysList(bad), null);
});

test('wordOf, linkOf: a string or the guide\'s languages; a web address or nothing', () => {
  const tx = o => o.en || '';
  assert.equal(wordOf({ en: 'Pharmacy' }, tx), 'Pharmacy'); assert.equal(wordOf(' Pharmacy ', tx), 'Pharmacy');
  for (const bad of [undefined, null, 5, '']) assert.equal(wordOf(bad, tx), '');
  assert.equal(linkOf(' https://example.org/a '), 'https://example.org/a');
  for (const bad of [undefined, null, 5, {}, 'javascript:alert(1)', 'example.org']) assert.equal(linkOf(bad), '');
});
