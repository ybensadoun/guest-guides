// The text pages' rules (engine/src/modules/info/plan.js, README.md beside it): a row's colour, its paragraphs, the
// directions link, which parts guests see. Written from the guide's behaviour on 14 Nov 2026 (views/section.js before the
// module); the parts guests see, 21 Nov 2026. Pure.
//   node --test engine/scripts/info-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toneOf, paragraphs, directionsTo, partShown } from '../src/modules/info/plan.js';

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
