// Our file of the countries' outlines (onboarding-site/countries.json, made by onboarding-site/src/countries.py from
// Natural Earth) with the rule that reads it (engine/src/country.js), on public town centres, islands, shores and
// borders.  node --test engine/scripts/countries-file.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countriesPrep, countryAt } from '../src/country.js';

const data = JSON.parse(readFileSync(new URL('../../onboarding-site/countries.json', import.meta.url), 'utf8')), P = countriesPrep(data);
// [name, lat, lng, its country, sure]: a sure place must be told its country; a place at a border, on a small island of
// its own or in a very small country may be told nothing ('': not known), but never another country.
const PLACES = [
  ['Barcelona, Plaça de Catalunya', 41.3870, 2.1700, 'ES', 1], ['Sitges, the town hall', 41.2353, 1.8113, 'ES', 1], ['Prades, Plaça Major', 41.3098, 0.9884, 'ES', 1],
  ['Madrid, Puerta del Sol', 40.4169, -3.7035, 'ES', 1], ['Palma, the cathedral', 39.5674, 2.6483, 'ES', 1], ['Eivissa, the port', 38.9110, 1.4350, 'ES', 1],
  ['Maó, Menorca', 39.8885, 4.2658, 'ES', 1], ['Las Palmas de Gran Canaria', 28.1235, -15.4363, 'ES', 1], ['Santa Cruz de Tenerife', 28.4682, -16.2546, 'ES', 1],
  ['Cadaqués, the shore', 42.2887, 3.2779, 'ES', 1], ['Tarifa', 36.0139, -5.6065, 'ES', 1], ['Figueres', 42.2660, 2.9610, 'ES', 1], ['Vielha', 42.7020, 0.7950, 'ES', 1],
  ['Badajoz', 38.8794, -6.9707, 'ES', 1], ['Girona', 41.9794, 2.8214, 'ES', 1], ['Donostia', 43.3183, -1.9812, 'ES', 1], ['Vigo', 42.2406, -8.7207, 'ES', 1],
  ['Puigcerdà, at the border', 42.4316, 1.9283, 'ES', 0], ['Portbou', 42.4258, 3.1597, 'ES', 0], ['La Jonquera', 42.4197, 2.8747, 'ES', 0], ['Irun', 43.3390, -1.7894, 'ES', 0],
  ['Tui', 42.0473, -8.6444, 'ES', 0], ['Ayamonte', 37.2096, -7.4050, 'ES', 0], ['Llívia, Spain inside France', 42.4647, 1.9803, 'ES', 0], ['Bossòst', 42.7870, 0.6920, 'ES', 0],
  ['Hendaye', 43.3590, -1.7740, 'FR', 0], ['Bourg-Madame', 42.4330, 1.9430, 'FR', 0], ['Cerbère', 42.4420, 3.1660, 'FR', 0], ['Valença', 42.0280, -8.6440, 'PT', 0],
  ['Pas de la Casa', 42.5420, 1.7330, 'AD', 0], ['Sant Julià de Lòria', 42.4640, 1.4910, 'AD', 0], ['San Marino', 43.9356, 12.4473, 'SM', 0], ['Monaco', 43.7384, 7.4246, 'MC', 0],
  ['Maseru, at the border of a country inside another', -29.3151, 27.4869, 'LS', 0],
  ['Andorra la Vella', 42.5063, 1.5218, 'AD', 1], ['Perpignan', 42.6987, 2.8956, 'FR', 1], ['Paris', 48.8566, 2.3522, 'FR', 1], ['Ajaccio, Corsica', 41.9192, 8.7386, 'FR', 1],
  ['Lisbon', 38.7223, -9.1393, 'PT', 1], ['Funchal, Madeira', 32.6496, -16.9086, 'PT', 1], ['Rome, 3 km from the Vatican', 41.9028, 12.4964, 'IT', 1], ['Nice', 43.7102, 7.2620, 'FR', 1], ['London', 51.5074, -0.1278, 'GB', 1],
  ['Oslo', 59.9139, 10.7522, 'NO', 1], ['Athens', 37.9838, 23.7275, 'GR', 1], ['Santorini, Fira', 36.4167, 25.4315, 'GR', 1], ['Marrakech', 31.6295, -7.9811, 'MA', 1],
  ['Manila', 14.5995, 120.9842, 'PH', 1], ['New York', 40.7128, -74.0060, 'US', 1], ['Thaba-Tseka, the middle of a country inside another', -29.5220, 28.6080, 'LS', 1]
];
test('a place is told its own country or, at a border, nothing: never another country', () => {
  const got = PLACES.map(([n, lat, lng, cc, sure]) => [n, cc, sure, countryAt(P, lat, lng)]);
  assert.deepEqual(got.filter(x => x[3] !== x[1] && (x[2] || x[3] !== '')).map(x => `${x[0]}: ${x[3] || 'none'} for ${x[1]}`), []);
});
test('known: Gibraltar has no outline of its own and reads as Spain; the Vatican, too small to be drawn true, as Italy', () => {
  assert.equal(countryAt(P, 36.1408, -5.3536), 'ES');
  assert.equal(countryAt(P, 41.9029, 12.4534), 'IT');
});
test('the open sea is no country', () => {
  assert.equal(countryAt(P, 40.0, 5.5), '');      // between Menorca and Sardinia
  assert.equal(countryAt(P, 45.0, -30.0), '');    // the middle of the Atlantic
});
test('the file says where it comes from', () => {
  assert.equal(data.source, 'Natural Earth'); assert.equal(data.licence, 'public domain');
  assert.ok(data.rows.length > 200 && data.rows.every(([cc, rings]) => /^[A-Z]{2}$/.test(cc) && rings.length));
});
