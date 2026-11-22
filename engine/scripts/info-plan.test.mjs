// The text pages' rules (engine/src/modules/info/plan.js, README.md beside it): a row's colour, its paragraphs, the
// directions link, which parts guests see. Written from the guide's behaviour on 14 Nov 2026 (views/section.js before the
// module); the parts guests see, 21 Nov 2026; the times of the stay, 22 Nov 2026. Pure.
//   node --test engine/scripts/info-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toneOf, paragraphs, directionsTo, partShown, stayTimes, partItems, isTimeLine, HOW_ASKS, howAsks, tipSaid } from '../src/modules/info/plan.js';

test('toneOf: ink, yellow as the taxi\'s, else the tone of that name', () => {
  assert.equal(toneOf('ink'), 'var(--ink)');
  assert.equal(toneOf('yellow'), 'var(--tone-taxi)');
  assert.equal(toneOf('blue'), 'var(--tone-blue)');
  assert.equal(toneOf(undefined), 'var(--tone-undefined)');   // as built: a row with no tone gets no colour of its own
});

test('paragraphs: one per blank line, spaces in the blank line too', () => {
  assert.deepEqual(paragraphs('One.\n\nTwo.\n  \nThree.'), ['One.', 'Two.', 'Three.']);
  assert.deepEqual(paragraphs('One line\nstill one.'), ['One line\nstill one.']);
});

test('directionsTo: Google Maps directions to a position', () => {
  assert.equal(directionsTo(41.1, 1.5), 'https://www.google.com/maps/dir/?api=1&destination=41.1,1.5');
});

test('partShown: a part needs words of its own, in any language: a text, a line or a button', () => {
  assert.equal(partShown({ id: 'rules', items: [{ en: 'No smoking inside.' }] }), true);
  assert.equal(partShown({ id: 'kitchen', body: { en: '', de: 'Auch in der Küche: Toaster.' } }), true);
  assert.equal(partShown({ id: 'kitchen', links: [{ labelKey: 'garbage', href: '#s/garbage' }] }), true);
  assert.equal(partShown({ id: 'arrival', items: ['Park inside the gate.'] }), true);
});

test('partShown: photos alone, the line under the title alone, or empty lines do not make a part', () => {
  assert.equal(partShown({ id: 'living', photos: ['a.jpg', 'b.jpg'] }), false);
  assert.equal(partShown({ id: 'office', sub: { en: 'Dedicated workspace' } }), false);
  assert.equal(partShown({ id: 'pool', photos: ['p.jpg'], sub: { en: 'Private pool' }, items: [{ en: '  ', de: '' }], body: { en: '' }, links: [] }), false);
  assert.equal(partShown({ id: 'x' }), false);
  assert.equal(partShown(null), false);
});

test('Ca La Kimberly, the reference: every part of its house guide has words, so guests see all ten', () => {
  const blocks = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/message.json', import.meta.url), 'utf8')).blocks;
  assert.equal(blocks.length, 10);
  assert.deepEqual(blocks.filter(b => !partShown(b)).map(b => b.id), []);
});

test('stayTimes: the Check-out part starts with the house\'s own times, those it has; no other part does', () => {
  const co = { id: 'checkout' };
  assert.deepEqual(stayTimes(co, { checkin: '15:00', checkout: '11:00' }), [['checkin', '15:00'], ['checkout', '11:00']]);
  assert.deepEqual(stayTimes(co, { checkout: '12:00' }), [['checkout', '12:00']]);
  assert.deepEqual(stayTimes(co, { checkin: '', checkout: '' }), []);
  assert.deepEqual(stayTimes({ id: 'rules' }, { checkout: '12:00' }), []);
  assert.deepEqual(stayTimes(co, undefined), []);
  assert.deepEqual(stayTimes(co, 3), []);   // as a filter's second argument, an index: not a house
});

test('partShown: a Check-out part with a time is shown, with no line of its own; without a time or a line it is not', () => {
  assert.equal(partShown({ id: 'checkout' }, { checkout: '11:00' }), true);
  assert.equal(partShown({ id: 'checkout' }, { checkin: '16:00' }), true);
  assert.equal(partShown({ id: 'checkout' }, {}), false);
  assert.equal(partShown({ id: 'checkout' }), false);
  assert.equal(partShown({ id: 'living', photos: ['a.jpg'] }, { checkout: '11:00' }), false);
});

test('partItems: a guide built before holds the time again as a sentence: not drawn once the field gives that time', () => {
  const old = { id: 'checkout', items: [{ en: 'Check-in from 15:00.', de: 'Check-in ab 15:00 Uhr.' }, { en: 'Check-out by 12:00.', de: 'Check-out bis 12:00 Uhr.' }, { en: 'Lock up at checkout', de: 'Schließ beim Auschecken ab' }] };
  assert.deepEqual(partItems(old, { checkout: '11:00' }).map(i => i.en), ['Check-in from 15:00.', 'Lock up at checkout']);   // the check-in has no field yet: its sentence stays
  assert.deepEqual(partItems(old, { checkin: '16:00', checkout: '11:00' }).map(i => i.en), ['Lock up at checkout']);
  assert.deepEqual(partItems(old, {}).map(i => i.en), ['Check-in from 15:00.', 'Check-out by 12:00.', 'Lock up at checkout']);   // no field: nothing is taken away
  assert.deepEqual(partItems({ id: 'checkout', items: [{ es: 'Check-out by 12:00.' }, 'Check-out by 9:30.', { en: 'Check-out by noon, please.' }] }, { checkout: '11:00' }), [{ en: 'Check-out by noon, please.' }]);
  assert.deepEqual(partItems({ id: 'rules', items: [{ en: 'Check-out by 12:00.' }] }, { checkout: '11:00' }).length, 1);   // only in the Check-out part
  assert.deepEqual(partItems({ id: 'x' }, {}), []);
});

test('Ca La Kimberly: its Check-out part starts with its check-out time, then its nine lines', () => {
  const dir = new URL('../../sites/ca-la-kimberly/content/', import.meta.url), read = f => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const co = read('message.json').blocks.find(b => b.id === 'checkout'), house = read('house.json');
  assert.deepEqual(stayTimes(co, house), [['checkout', '12:00']]);
  assert.equal(partItems(co, house).length, 9);
});

test('the words for the two times exist in the six languages, with the time in them', () => {
  for (const l of ['en', 'es', 'fr', 'ca', 'de', 'nl']) { const w = JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'));
    for (const k of ['hgCheckin', 'hgCheckout']) assert.match(w[k] || '', /\{time\}/, `${l} ${k}`); }
});

test('isTimeLine: the generator\'s old sentence for either time, and nothing else', () => {
  assert.equal(isTimeLine({ en: 'Check-in from 15:00.' }), true);
  assert.equal(isTimeLine('Check-out by 9:30.'), true);
  assert.equal(isTimeLine({ en: 'Check-in is from 15:00, the key is in the lockbox.' }), false);
  assert.equal(isTimeLine({ en: 'Lock up at checkout' }), false);
  assert.equal(isTimeLine(null), false);
});

test('HOW_ASKS: every thing a host is offered to explain is a thing of our list, named in the six languages, none twice', () => {
  const items = JSON.parse(readFileSync(new URL('../src/amenities.json', import.meta.url), 'utf8')).items, by = Object.fromEntries(items.map(x => [x.id, x]));
  assert.equal(new Set(HOW_ASKS).size, HOW_ASKS.length);
  for (const id of HOW_ASKS) { assert.ok(by[id], id); for (const l of ['en', 'es', 'fr', 'ca', 'de', 'nl']) assert.ok(by[id].t[l], `${id} ${l}`); }
});

test('howAsks: the house\'s own things, most asked first, without those a line already starts with, at most eight', () => {
  assert.deepEqual(howAsks(['bbq', 'pool', 'washer', 'hangers', 'wifi'], []), ['pool', 'washer', 'bbq']);
  assert.deepEqual(howAsks(['bbq', 'pool', 'washer'], ['pool']), ['washer', 'bbq']);
  assert.deepEqual(howAsks(HOW_ASKS, []), HOW_ASKS.slice(0, 8));
  assert.deepEqual(howAsks(HOW_ASKS, HOW_ASKS.slice(0, 3)), HOW_ASKS.slice(3, 11));   // one started: the next one comes
  assert.deepEqual(howAsks([], []), []); assert.deepEqual(howAsks(undefined, undefined), []);
});

test('tipSaid: a line start nobody finished says nothing; a finished line does', () => {
  assert.equal(tipSaid('Heating:'), false); assert.equal(tipSaid('Chauffage : '), false); assert.equal(tipSaid('  '), false); assert.equal(tipSaid(undefined), false);
  assert.equal(tipSaid('Heating: the thermostat is by the front door'), true); assert.equal(tipSaid('Spare batteries are in the TV unit'), true);
});
