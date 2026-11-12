// The one-off clean-up of what guides copied from Google (worker/clean-google.mjs): cleanGuide is pure, tried on small
// made-up guides. No network, no Google, no Claude.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanGuide, googleOwn, googleNotes } from '../clean-google.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };
const gid = n => `G${n}aaaaaaaaaaaa`;
const H = [{ days: ['mon', 'tue'], open: '10:00', close: '14:00' }];
const guide = () => ({ site: { name: 'Test' }, files: {
  house: { lat: 41.2, lng: 1.5 },
  'house-page': { rating: { stars: 4.9, count: 120 } },
  reviews: { mode: 'live', rating: 4.9, count: 120, quotes: [] },
  todo: { items: [
    { id: 'aqualeon', name: { en: 'Aqualeon', ca: 'Aqualeon' }, gid: gid(1), lat: 41.18, lng: 1.42, schedule: H, hoursSource: 'google', rating: { stars: 4.1, count: 900 }, gmaps: 'https://maps.google.com/?cid=123456789&g_mp=Cidnb29n', checked: '2026-10-23', flags: ['check'] },
    { id: 'castell', name: { en: 'Castle', ca: 'Castell' }, gid: gid(2), lat: 41.3, lng: 1.6, schedule: H, url: 'https://castell.example/', gmaps: 'https://www.google.com/maps/place/Castell/@41.3,1.6,17z/data=!4m6!3m5!1s0x12a3:0x45b6', checked: '2026-10-23' },
    { id: 'mirador', name: { en: 'Viewpoint' }, lat: 41.31, lng: 1.61, gmaps: 'https://www.google.com/maps/place/Mirador/@41.31,1.61,17z' },
  ] },
  restaurants: { items: [
    { id: 'pep', name: { en: 'Can Pep' }, gid: gid(3), lat: 41.21, lng: 1.51, gmaps: `https://www.google.com/maps/search/?api=1&query=Can%20Pep&query_place_id=${gid(3)}`, reviews: 310, _card: { rating: 4.5 } },
  ] },
  markets: { markets: [{ id: 'dissabte', name: { ca: 'Mercat del dissabte' }, gid: gid(4), lat: 41.2, lng: 1.5, gmaps: 'https://maps.google.com/?cid=987&g_mp=x', checked: '2026-10-23', flags: ['check'], schedule: [{ days: ['sat'], open: '08:00', close: '14:00' }] }] },
  transport: { stations: [{ id: 'train', name: { en: 'Station' }, lat: 41.19, lng: 1.55, gmaps: 'https://www.google.com/maps/place/Estaci%C3%B3/@41.19,1.55,17z' }] },
  quick: { items: [{ id: 'food-aqualeon', from: 'aqualeon', name: { en: 'Aqualeon' }, schedule: H }, { id: 'food-other', from: 'castell', schedule: H }] },
} });

test('cleanGuide: Google\'s hours, ratings, links and check dates out; ours, the house\'s own rating and the flags stay', () => {
  const g = guide(), before = JSON.parse(JSON.stringify(g));
  const { content, changes, kept } = cleanGuide(g);
  assert.deepEqual(g, before);   // the input is not changed
  const F = content.files, [aq, castell, mirador] = F.todo.items;
  // Hours marked as Google's go, with their mark; the place then shows Google's live line. A Home tile's copy goes too.
  assert.equal(aq.schedule, undefined); assert.equal(aq.hoursSource, undefined);
  assert.equal(F.quick.items[0].schedule, undefined);
  // Hours with no mark stay (a website's, the host's), and a tile pinned from such a place keeps its copy.
  assert.deepEqual(castell.schedule, H); assert.deepEqual(F.quick.items[1].schedule, H); assert.deepEqual(F.markets.markets[0].schedule, before.files.markets.markets[0].schedule);
  // Ratings and Google's counts out; the house's own listing rating stays.
  assert.equal(aq.rating, undefined); assert.equal(F.restaurants.items[0].reviews, undefined); assert.equal(F.restaurants.items[0]._card, undefined);
  assert.deepEqual(F['house-page'], before.files['house-page']); assert.deepEqual(F.reviews, before.files.reviews);
  // Google's own link rebuilt from the id, in the product's form; ours left; a place with no id keeps its link.
  assert.equal(aq.gmaps, `https://www.google.com/maps/search/?api=1&query=Aqualeon&query_place_id=${gid(1)}`);
  assert.equal(castell.gmaps, `https://www.google.com/maps/search/?api=1&query=Castell&query_place_id=${gid(2)}`);
  assert.equal(F.markets.markets[0].gmaps, `https://www.google.com/maps/search/?api=1&query=Mercat%20del%20dissabte&query_place_id=${gid(4)}`);
  assert.equal(F.restaurants.items[0].gmaps, before.files.restaurants.items[0].gmaps);
  assert.equal(mirador.gmaps, before.files.todo.items[2].gmaps); assert.equal(F.transport.stations[0].gmaps, before.files.transport.stations[0].gmaps);
  // The check dates go; the flags stay, counted.
  assert.equal(aq.checked, undefined); assert.equal(F.markets.markets[0].checked, undefined);
  assert.deepEqual(aq.flags, ['check']); assert.deepEqual(F.markets.markets[0].flags, ['check']);
  assert.deepEqual(kept, { check: 2, links: 2 });
  // Nothing else of a place changes: ids, names, positions, ids of Google.
  for (const [a, b] of [[aq, before.files.todo.items[0]], [castell, before.files.todo.items[1]]]) for (const k of ['id', 'name', 'gid', 'lat', 'lng', 'url']) assert.deepEqual(a[k], b[k], k);
  assert.deepEqual(changes.map(c => [c.file, c.name, c.what]), [
    ['todo', 'Aqualeon', ["Google's hours out (1 line)", 'rating out', "Google's link rebuilt from its id", 'check date out']],
    ['todo', 'Castell', ["Google's link rebuilt from its id", 'check date out']],
    ['restaurants', 'Can Pep', ['reviews out', '_card out']],
    ['markets', 'Mercat del dissabte', ["Google's link rebuilt from its id", 'check date out']],
    ['quick', 'Aqualeon', ["Google's hours out (a copy of aqualeon's)"]],
  ]);
  // Run again on its own result: nothing more to do.
  assert.deepEqual(cleanGuide(content).changes, []);
});

test('cleanGuide: an empty or odd guide is left alone', () => {
  assert.deepEqual(cleanGuide({}).changes, []);
  assert.deepEqual(cleanGuide({ files: { todo: { items: [null, 'x', { id: 'a' }] } } }).changes, []);
});

test('googleOwn and googleNotes', () => {
  assert.equal(googleOwn('https://maps.google.com/?cid=1&g_mp=x'), true);
  assert.equal(googleOwn('https://www.google.com/maps/place/X/@1,2,3z/data=!4m2'), true);
  assert.equal(googleOwn(`https://www.google.com/maps/search/?api=1&query=X&query_place_id=${gid(1)}`), false);
  assert.equal(googleOwn(undefined), false);
  assert.equal(googleNotes({ todo: { items: [{ _google: 'On Google' }, { id: 'b' }] }, items: [{ _google: 'Temporarily closed on Google (off-season?)' }] }), 2);
  assert.equal(googleNotes(null), 0);
});
