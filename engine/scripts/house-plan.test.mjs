// The house module's rules (engine/src/modules/house/plan.js, README.md beside it): what the place offers shown first, the
// slim bar's line and its coming in, the reviews quoted, the Wi-Fi as a QR code reads it and a network's label. Written
// from the guide's behaviour on 14 Nov 2026 (views/section.js and views/home.js before the module). Pure: nothing stands
// in, nothing is written; the Wi-Fi values here are made up.   node --test engine/scripts/house-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyAmenities, shortSummary, longWords, latestQuotes, barK, wifiPayload, netLabel } from '../src/modules/house/plan.js';

const tx = v => (v && typeof v === 'object' ? v.en : v || '');
const item = en => ({ en, es: en + ' (es)' });
const groups = [{ t: item('Outside'), items: [item('Private pool, heated'), item('Garden')] }, { t: item('Inside'), items: [item('Wifi'), item('Washing machine'), item('Iron'), item('Air conditioning')] }];

test('keyAmenities: no amenFirst: the eight known by their English name, in that order, those the page has', () => {
  const { all, key } = keyAmenities({ amenities: groups }, tx);
  assert.equal(all.length, 6);
  assert.deepEqual(key.map(tx), ['Private pool, heated', 'Air conditioning', 'Wifi', 'Washing machine']);
});

test('keyAmenities: amenFirst: the most asked for still in the list first, then the rest, the first amenFirst of them', () => {
  const h = { amenities: groups, amenFirst: 3, amenTop: [item('Iron'), item('Sauna'), item('Garden')] };
  assert.deepEqual(keyAmenities(h, tx).key.map(tx), ['Iron', 'Garden', 'Private pool, heated']);
  assert.deepEqual(keyAmenities({ amenities: groups, amenFirst: 10 }, tx).key.map(tx), ['Private pool, heated', 'Garden', 'Wifi', 'Washing machine', 'Iron', 'Air conditioning']);
});

test('keyAmenities: Ca La Kimberly\'s house page (no amenFirst): eight of its 66', () => {
  const h = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/house-page.json', import.meta.url), 'utf8'));
  const { all, key } = keyAmenities(h, tx);
  assert.equal(all.length, 66);
  assert.deepEqual(key.map(i => tx(i).split(/[ ,(]/)[0]), ['Private', 'Air', 'Wifi', 'Dedicated', 'Smart', 'Fully', 'Charcoal', 'Washing']);
});

test('shortSummary: the second, the third and the last part', () => {
  assert.equal(shortSummary('Entire home · 8 guests · 4 bedrooms · 6 beds · 2 bathrooms'), '8 guests · 4 bedrooms · 2 bathrooms');
  assert.equal(shortSummary('Entire home · 8 guests'), '8 guests · 8 guests');
  assert.equal(shortSummary('Entire home'), 'Entire home');
});

test('longWords: a word longer than 14 letters', () => {
  assert.equal(longWords('Pool 3.5 × 7 m'), false);
  assert.equal(longWords('Klimaanlagensystem'), true);
  assert.equal(longWords('fourteenletter'), false);
});

test('latestQuotes: with a text, newest first, three at most', () => {
  const q = [{ date: '2026-03', text: 'a' }, { date: '2026-09', text: 'b' }, { date: '2026-10', text: '' }, { text: 'c' }, { date: '2026-06', text: 'd' }, { date: '2026-01', text: 'e' }];
  assert.deepEqual(latestQuotes(q).map(x => x.text), ['b', 'd', 'a']);
  assert.deepEqual(latestQuotes(undefined), []);
});

test('barK: in over the 90 px under 150 px', () => {
  assert.equal(barK(200), 0); assert.equal(barK(150), 0); assert.equal(barK(105), 0.5); assert.equal(barK(60), 1); assert.equal(barK(-40), 1);
});

test('wifiPayload: WPA, with \\ ; , : and " escaped', () => {
  assert.equal(wifiPayload('Casa Test', 'pass word'), 'WIFI:T:WPA;S:Casa Test;P:pass word;;');
  assert.equal(wifiPayload('a;b,c:d', 'x"y\\z'), 'WIFI:T:WPA;S:a\\;b\\,c\\:d;P:x\\"y\\\\z;;');
  assert.equal(wifiPayload(undefined, ''), 'WIFI:T:WPA;S:;P:;;');
});

test('netLabel: none for one network labelled only Wi-Fi', () => {
  assert.equal(netLabel(true, 'Wi-Fi'), ''); assert.equal(netLabel(true, ' wifi '), ''); assert.equal(netLabel(false, 'Wi-Fi'), 'Wi-Fi');
  assert.equal(netLabel(true, 'Upstairs'), 'Upstairs'); assert.equal(netLabel(true, undefined), undefined);
});
