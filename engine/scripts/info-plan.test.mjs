// The text pages' rules (engine/src/modules/info/plan.js, README.md beside it): a row's colour, its paragraphs, the
// directions link. Written from the guide's behaviour on 14 Nov 2026 (views/section.js before the module). Pure.
//   node --test engine/scripts/info-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toneOf, paragraphs, directionsTo } from '../src/modules/info/plan.js';

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
