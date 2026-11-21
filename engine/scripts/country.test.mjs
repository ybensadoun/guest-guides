// The country a house is in (engine/src/country.js), on a small made-up world.  node --test engine/scripts/country.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countriesPrep, countryAt } from '../src/country.js';

// AA: a square of 10 degrees; CC: a small country inside it; BB: an island 0.1 degree off AA's east shore.
const sq = (w, s, e, n) => [w * 100, s * 100, (e - w) * 100, 0, 0, (n - s) * 100, -(e - w) * 100, 0];
const P = countriesPrep({ rows: [['AA', [sq(0, 40, 10, 50)]], ['BB', [sq(10.1, 44, 10.4, 44.3)]], ['CC', [sq(4, 44, 5, 45)]]] });

test('the outline that holds the position names the country', () => {
  assert.equal(countryAt(P, 45, 2), 'AA');
  assert.equal(countryAt(P, 44.1, 10.2), 'BB');
});
test('a country inside another: the smallest outline wins', () => { assert.equal(countryAt(P, 44.5, 4.5), 'CC'); });
test('just off the shore: the nearest outline within 25 km', () => {
  assert.equal(countryAt(P, 47, 10.05), 'AA');        // about 4 km off AA's east shore
  assert.equal(countryAt(P, 44.15, 10.06), '');       // between the two, a few km from each: not known, never a guess
  assert.equal(countryAt(P, 39.9, 5), 'AA');          // about 11 km south
});
test('within 6 km of another country: not known', () => {
  assert.equal(countryAt(P, 44.5, 3.97), '');         // in AA, about 2 km from the country inside it
  assert.equal(countryAt(P, 44.5, 4.03), '');         // inside the small country, about 2 km from its border
  assert.equal(countryAt(P, 44.5, 3.8), 'AA');        // about 16 km away: sure again
  assert.equal(countryAt(P, 44.15, 10.02), '');       // in AA, about 6 km from the island's shore
});
test('the open sea, and no position, are no country', () => {
  assert.equal(countryAt(P, 30, 5), '');
  assert.equal(countryAt(P, 47, 10.6), '');           // about 45 km off
  assert.equal(countryAt(P, null, null), '');
  assert.equal(countryAt(P, '', ''), '');
  assert.equal(countryAt(P, 'x', 2), '');
  assert.equal(countryAt(null, 45, 2), '');
});
