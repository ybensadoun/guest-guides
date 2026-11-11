// What place_facts keeps (worker/place-store.mjs) and the second try of worker/place-facts.mjs, with no network.
//   node --test 'worker/test/*.test.mjs'   (Node 22 and later read --test's arguments as file patterns, not folders)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFacts, due, FACTS, tidyName } from '../place-store.mjs';
import { placeFacts } from '../place-facts.mjs';

const d1 = new Date('2026-11-01T09:00:00Z'), d2 = new Date('2026-11-10T09:00:00Z');
const look = o => ({ entry: null, venue: true, phone: null, phoneFrom: null, website: null, websiteFrom: null, facebook: null, instagram: null,
  town: null, category: null, name: null, ourKind: null, hours: null, price: null, book: null, page: null, usd: 0.02, ...o });
const H = [{ days: ['tue', 'wed'], open: '10:00', close: '14:00' }];

test('a first look keeps what it found, each fact with its source', () => {
  const r = mergeFacts(null, { name: 'Bar X' }, look({
    entry: { id: 'ov1', name: 'Bar X', category: 'bar', lat: 41.2, lng: 1.6 }, phone: '977 66 16 25', phoneFrom: 'overture',
    website: 'https://barx.es/', websiteFrom: 'search', page: 'https://barx.es/', facebook: 'https://facebook.com/barx', town: 'Calafell', category: 'bar', hours: H, price: '20-30', book: true,
  }), { now: d1, release: '2026-10-22.0' });
  assert.equal(r.name, 'Bar X'); assert.equal(r.country, 'ES'); assert.equal(r.venue, true);
  assert.equal(r.overture_id, 'ov1'); assert.equal(r.overture_release, '2026-10-22.0');
  assert.deepEqual(r.facts, { phone: '977 66 16 25', website: 'https://barx.es/', facebook: 'https://facebook.com/barx', town: 'Calafell', category: 'bar', hours: H, price: '20-30', book: true, lat: 41.2, lng: 1.6 });
  assert.deepEqual(r.sources.phone, { from: 'overture', at: '2026-11-01', release: '2026-10-22.0' });
  assert.deepEqual(r.sources.website, { from: 'search', at: '2026-11-01', page: 'https://barx.es/' });
  assert.deepEqual(r.sources.hours, { from: 'site', at: '2026-11-01', page: 'https://barx.es/' });
  assert.deepEqual(r.sources.lat, { from: 'overture', at: '2026-11-01', release: '2026-10-22.0' });
  assert.equal(r.sources.instagram, undefined);
  assert.equal(r.tries, 1); assert.equal(r.tried_at, d1.toISOString()); assert.equal(r.read_at, d1.toISOString()); assert.equal(r.usd, 0.02);
  assert.ok(Object.keys(r.facts).every(k => FACTS.includes(k)));
});

test('a weaker look never erases, a new value replaces and is dated again', () => {
  const first = mergeFacts(null, { name: 'Bar X' }, look({ phone: '977 66 16 25', phoneFrom: 'site', website: 'https://barx.es/', websiteFrom: 'search', page: 'https://barx.es/', hours: H }), { now: d1 });
  const second = mergeFacts(first, { name: 'Bar X' }, look({ price: '15', page: 'https://barx.es/carta', usd: 0.0333 }), { now: d2 });
  assert.equal(second.facts.phone, '977 66 16 25'); assert.deepEqual(second.facts.hours, H); assert.equal(second.facts.website, 'https://barx.es/');
  assert.deepEqual(second.sources.phone, first.sources.phone);
  assert.equal(second.facts.price, '15'); assert.deepEqual(second.sources.price, { from: 'site', at: '2026-11-10', page: 'https://barx.es/carta' });
  const third = mergeFacts(second, { name: 'Bar X' }, look({ phone: '600 11 22 33', phoneFrom: 'overture' }), { now: d2 });
  assert.equal(third.facts.phone, '600 11 22 33'); assert.deepEqual(third.sources.phone, { from: 'overture', at: '2026-11-10' });
  assert.equal(third.tries, 3); assert.equal(third.usd, 0.0733);
});

test('a look that finds nothing keeps read_at, counts the try and the cost', () => {
  const first = mergeFacts(null, { name: 'Bar X' }, look({ hours: H }), { now: d1 });
  const empty = mergeFacts(first, { name: 'Bar X', country: 'PH' }, look({ usd: 0.01 }), { now: d2 });
  assert.equal(empty.read_at, d1.toISOString()); assert.equal(empty.tried_at, d2.toISOString());
  assert.equal(empty.tries, 2); assert.equal(empty.usd, 0.03); assert.equal(empty.country, 'PH'); assert.deepEqual(empty.facts, first.facts);
});

test('not a venue is kept only while nothing kept says venue', () => {
  const beach = mergeFacts(null, { name: 'Platja' }, look({ venue: false, town: 'Calafell' }), { now: d1 });
  assert.equal(beach.venue, false);
  const known = mergeFacts(null, { name: 'Bar X' }, look({ hours: H }), { now: d1 });
  const odd = mergeFacts(known, { name: 'Bar X' }, look({ venue: false }), { now: d2 });
  assert.equal(odd.venue, true);
  const unsure = mergeFacts(null, { name: 'Bar Y' }, look({ venue: undefined, phone: '977 00 00 00', phoneFrom: 'site' }), { now: d1 });
  assert.equal(mergeFacts(unsure, { name: 'Bar Y' }, look({ venue: false }), { now: d2 }).venue, null);
});

test('due: no row, or last looked at more than 30 days ago', () => {
  assert.equal(due(null, d2), true);
  assert.equal(due({ tried_at: '2026-11-01T09:00:00Z' }, d2), false);
  assert.equal(due({ tried_at: '2026-10-01T09:00:00Z' }, d2), true);
  assert.equal(due({ tried_at: '2026-11-01T09:00:00Z' }, d2, 5), true);
  assert.equal(due({ tried_at: null }, d2), true);
});

test('placeFacts: a place that gives nothing is read once more, and the second read is used', async () => {
  // The record has no website, so siteAlive (the network) is never called: both reads are the search prompt.
  const cands = [{ id: 'ov1', name: 'Bar X', kind: 'bar', metres: 12, lat: 41.2, lng: 1.6, phones: ['+34 977661625'], websites: [], socials: [] }];
  const asked = [];
  const ask = async (prompt, o) => { asked.push(['low', o.what]); o.meter.usd = (o.meter.usd || 0) + 0.01;
    return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true}' : '{"website": null, "about": false, "phone": null, "hours": null, "price": null, "book": null}'; };
  const again = async (prompt, o) => { asked.push(['medium', o.what]); o.meter.usd = (o.meter.usd || 0) + 0.02;
    return '{"website": "https://barx.es/", "about": true, "phone": null, "hours": [{"days": ["tue","wed"], "open": "10:00", "close": "14:00"}], "price": "20-30", "book": true}'; };
  const r = await placeFacts({ name: 'Bar X', town: 'Calafell' }, cands, ask, { meter: {}, again });
  assert.deepEqual(asked, [['low', 'place match'], ['low', 'site facts'], ['medium', 'site facts']]);
  assert.equal(r.tries, 2); assert.equal(r.matchTries, 1); assert.deepEqual(r.gained, ['site', 'hours', 'price']);
  assert.deepEqual(r.entry, { id: 'ov1', name: 'Bar X', category: 'bar', lat: 41.2, lng: 1.6 });
  assert.equal(r.website, 'https://barx.es/'); assert.equal(r.websiteFrom, 'search'); assert.equal(r.page, 'https://barx.es/');
  assert.deepEqual(r.hours, H); assert.equal(r.price, '20-30'); assert.equal(r.book, true);
  assert.equal(r.phone, '977 66 16 25'); assert.equal(r.phoneFrom, 'overture');
  assert.equal(r.usd, 0.04);
  // Without again nothing changes: one read, nothing found.
  const one = await placeFacts({ name: 'Bar X', town: 'Calafell' }, cands, ask, { meter: {} });
  assert.equal(one.tries, 1); assert.equal(one.website, null); assert.equal(one.hours, null);
});

test('placeFacts: an unsure match is asked once more, the second answer wins when usable', async () => {
  const cands = [{ id: 'ov2', name: 'Celler Y', kind: 'winery', metres: 40, lat: 41.3, lng: 1.7, phones: [], websites: [], socials: [] }];
  const site = '{"website": "https://celler-y.cat/", "about": true, "phone": "977 12 34 56", "hours": null, "price": "12", "book": null}';
  const ask = async (prompt, o) => o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": false}' : site;
  const again = async (prompt, o) => o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true}' : 'not json';
  const r = await placeFacts({ name: 'Celler Y' }, cands, ask, { meter: {}, again });
  assert.equal(r.matchTries, 2); assert.equal(r.entry.id, 'ov2');
  // The first site read has a price, so it is not read again.
  assert.equal(r.tries, 1); assert.equal(r.price, '12'); assert.equal(r.phone, '977 12 34 56'); assert.equal(r.phoneFrom, 'site');
});

test('tidyName: word order, small words, towns, punctuation (cases seen on Ca La Kimberly, 10 Nov 2026)', () => {
  assert.equal(tidyName("l'ancora del serrallo", "L'ancora Del Serrallo"), "L'Ancora del Serrallo");   // ref's own capital on a small word is not taken
  assert.equal(tidyName('la cuina de la marga', 'La Cuina de la Marga', ['La Bisbal del Penedès']), 'La Cuina de la Marga');   // the second "la" is ref's second
  assert.equal(tidyName('llepol', 'Llépol, espai gastronòmic'), 'Llépol');
  assert.equal(tidyName('pitch putt golf el vendrell', 'Pitch and Putt Vendrell', ['El Vendrell']), 'Pitch Putt Golf El Vendrell');   // a town keeps its article's capital
  assert.equal(tidyName('vilafranca del penedes', null, ['Vilafranca del Penedès']), 'Vilafranca del Penedès');
  assert.equal(tidyName("platja d'en bossa", null), "Platja d'en Bossa");
  assert.equal(tidyName('platja per a gossos de coma ruga', null), 'Platja per a Gossos de Coma Ruga');
});
