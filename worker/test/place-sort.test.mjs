// The same sort of place (worker/places.mjs sameSort): a host kept the village "El Roc de Sant Gaietà" in the deck and the
// built guide held "Platja del Roc de Sant Gaietà", kind Beach, the beach beside it (the test guide of 22 Nov 2026).
// A record, a feature or an entry that shares the name's own words but is another sort of place is never taken for it:
// the card waits for the host to name it. No network: Google, the directory, GeoNames and Claude are stand-ins.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sortsOf, sameSort } from '../places.mjs';
import { hostPlaces, sameNamed } from '../host-places.mjs';
import { placeFacts } from '../place-facts.mjs';
import { mergeFacts } from '../place-store.mjs';

process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
globalThis.fetch = async () => { throw new Error('no network in tests'); };

const VILLAGE = 'El Roc de Sant Gaietà', BEACH = 'Platja del Roc de Sant Gaietà', VIEW = 'Mirador Roc de Sant Gaietà';
const beachRec = { id: 'ovB', name: BEACH, kind: 'beach', metres: 90, lat: 41.1766, lng: 1.4768, phones: [], websites: [], socials: [] };
const barRec = { id: 'ovR', name: 'Bar El Roc', kind: 'bar', metres: 40, lat: 41.1771, lng: 1.4761, phones: [], websites: [], socials: [] };

test('sortsOf: the sort a name says, in Catalan, Spanish, English and French; a place to eat kept without its word', () => {
  assert.deepEqual([...sortsOf(BEACH)], ['beach']); assert.deepEqual([...sortsOf(VILLAGE)], []);
  assert.deepEqual([...sortsOf('Coma-ruga Beach')], ['beach']); assert.deepEqual([...sortsOf('Playa de Calafell')], ['beach']);
  assert.deepEqual([...sortsOf(VIEW)], ['view']); assert.deepEqual([...sortsOf('Hotel Sitges')], ['stay']); assert.deepEqual([...sortsOf('Estació del Vendrell')], ['station']);
  assert.deepEqual([...sortsOf('Restaurant Can Pep', 'todo')], ['eat']); assert.deepEqual([...sortsOf('Restaurant Can Pep', 'eat')], []);
  assert.deepEqual([...sortsOf('Barcelona')], []);   // a word, not a part of one: "bar" is not in Barcelona
});
test('sameSort: the same words of that kind on both sides, or none on both', () => {
  assert.equal(sameSort(VILLAGE, BEACH, 'todo'), false); assert.equal(sameSort(BEACH, VILLAGE, 'todo'), false);
  assert.equal(sameSort(VILLAGE, VIEW, 'todo'), false);
  assert.equal(sameSort('Coma-ruga Beach', 'Platja de Coma-ruga', 'todo'), true);
  assert.equal(sameSort('Karting Vendrell', 'Karting Vendrell', 'todo'), true);
  assert.equal(sameSort('Can Pep', 'Restaurant Can Pep', 'eat'), true); assert.equal(sameSort('Can Pep', 'Restaurant Can Pep', 'todo'), false);
  // Only some sorts looked at: a museum the host names without the word is still its record.
  assert.equal(sameSort('Pau Casals', 'Museu Pau Casals', 'todo'), false); assert.equal(sameSort('Pau Casals', 'Museu Pau Casals', 'todo', ['beach', 'eat']), true);
});
test('sameNamed, for a kept card: the beach named after the village is not the village; a beach is still its beach', () => {
  assert.equal(sameNamed(VILLAGE, [beachRec, barRec], 'todo'), null);
  assert.equal(sameNamed('Roc de Sant Gaietà Beach', [beachRec, barRec], 'todo'), beachRec);   // Google's name of the beach, in English
  assert.equal(sameNamed('Can Pep', [{ id: 'o1', name: 'Restaurant Can Pep', metres: 5 }], 'eat').id, 'o1');
  assert.equal(sameNamed('Can Pep', [{ id: 'o1', name: 'Restaurant Can Pep', metres: 5 }], 'todo'), null);
  // The monthly check (no list) compares a name of ours with the directory's by its words alone, as before.
  assert.equal(sameNamed(VILLAGE, [beachRec]), beachRec);
});

// The exact case, through the build's own path. Google locates the card and says its name in memory; the directory has
// the beach and a bar near the pin; GeoNames has the viewpoint.
const house = { lat: 41.25, lng: 1.45 }, GID = 'Groc0000000a';
const locate = { byId: async id => id === GID ? { gid: GID, lat: 41.1768, lng: 1.4762 } : null, byWords: async () => null, name: async () => VILLAGE };
const near = async () => ({ release: 'r', towns: { [GID]: 'Roda de Berà' }, pins: { [GID]: [beachRec, barRec] } });
const fakeStore = (rows, saved = []) => ({ get: async gids => Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])),
  save: async (gid, place, res, opts) => { saved.push([gid, place]); const r = { gid, ...mergeFacts(rows[gid] || null, place, res, opts) }; rows[gid] = r; return r; } });
// Claude at its worst: it takes the beach for the place, sure of it.
const beachSure = asked => async (prompt, o) => { asked.push([o.what, prompt]); return o.what === 'place match' ? `{"venue": false, "entry": 1, "sure": true, "name": "${BEACH}", "kind": "beach"}` : '{"website": null, "about": false}'; };

test('hostPlaces: a kept village with only a beach and a viewpoint of its name around it is not named after them: it waits for the host', async () => {
  const asked = [], saved = [], logs = [];
  const gaz = async () => ({ fetched: '2026-11-01', pins: { [GID]: [{ id: '11979457', name: VIEW, cls: 'S', code: 'OBPT', pop: 0, lat: 41.16849, lng: 1.48032, metres: 250, exact: false }] } });
  const geo = await hostPlaces({ cards: [{ id: GID, list: 'todo', c: 'A village on the rocks' }], house }, { store: fakeStore({}, saved), ask: beachSure(asked), locate, near, gaz, log: m => logs.push(m) });
  const e = geo['gid:' + GID];
  assert.equal(e.noname, true); assert.equal(e.name, undefined); assert.equal(e.kind, undefined);   // not the beach, not the viewpoint
  assert.equal(e.gid, GID); assert.deepEqual([e.lat, e.lng], [41.1768, 1.4762]); assert.equal(e.pos.from, 'google');   // its own place, its own position
  assert.deepEqual(asked, []); assert.deepEqual(saved, []);   // nothing asked of Claude, nothing kept for a card no source names
  for (const out of [geo, saved, logs]) assert.ok(!/Platja|Mirador|Roc de Sant/.test(JSON.stringify(out)));   // Google's name is in none of them either
});
test('hostPlaces: the same village when GeoNames has it by its very name: named from it, and the beach entry Claude picks is not taken', async () => {
  const asked = [], rows = {};
  const gaz = async () => ({ fetched: '2026-11-01', pins: { [GID]: [{ id: '11979457', name: VIEW, cls: 'S', code: 'OBPT', pop: 0, lat: 41.16849, lng: 1.48032, metres: 250, exact: false },
    { id: '900001', name: 'el Roc de Sant Gaietà', cls: 'P', code: 'PPL', pop: 120, lat: 41.1769, lng: 1.4763, metres: 20, exact: true }] } });
  const geo = await hostPlaces({ cards: [{ id: GID, list: 'todo' }], house }, { store: fakeStore(rows), ask: beachSure(asked), locate, near, gaz, log: () => {} });
  const e = geo['gid:' + GID];
  assert.equal(e.name, 'el Roc de Sant Gaietà'); assert.notEqual(e.kind, 'beach'); assert.equal(e.kind, 'town');   // GeoNames' own name and kind
  assert.deepEqual([e.lat, e.lng], [41.1769, 1.4763]); assert.equal(e.pos, undefined);   // GeoNames' position, ours to keep
  assert.equal(asked.filter(a => a[0] === 'place match').length, 1);
  assert.match(asked[0][1], /must be the same sort of place/);
});

test('placeFacts: an entry of another sort than the host\'s words is not taken, and its kind goes with it; the same sort is', async () => {
  const ask = async (p, o) => o.what === 'place match' ? `{"venue": false, "entry": 1, "sure": true, "name": "${BEACH}", "kind": "beach"}` : '{"website": null, "about": false}';
  const r = await placeFacts({ name: 'Roc de Sant Gaietà', list: 'todo' }, [beachRec], ask, { meter: {} });
  assert.equal(r.entry, null); assert.equal(r.name, null); assert.equal(r.ourKind, null); assert.equal(r.posFrom, null);
  // The host typed the beach: the beach's entry is theirs.
  const b = await placeFacts({ name: 'platja del roc de sant gaieta', list: 'todo' }, [beachRec], ask, { meter: {} });
  assert.equal(b.entry.id, 'ovB'); assert.equal(b.name, BEACH); assert.equal(b.ourKind, 'beach'); assert.equal(b.posFrom, 'overture');
  // A place to eat typed without "Restaurant" keeps its record; a thing to do is not the bar that carries its name.
  const eat = async (p, o) => o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Can Pep", "kind": "fork"}' : '{"website": null, "about": false}';
  const rec = [{ id: 'o1', name: 'Restaurant Can Pep', kind: 'restaurant', metres: 5, lat: 41.2, lng: 1.5, phones: [], websites: [], socials: [] }];
  assert.equal((await placeFacts({ name: 'can pep', list: 'eat' }, rec, eat, { meter: {} })).entry.id, 'o1');
  assert.equal((await placeFacts({ name: 'can pep', list: 'todo' }, rec, eat, { meter: {} })).entry, null);
  // A museum named without the word is still its record (not one of the sorts that set two places apart here).
  const mus = async (p, o) => o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Museu Pau Casals", "kind": "palette"}' : '{"website": null, "about": false}';
  assert.equal((await placeFacts({ name: 'pau casals', list: 'todo' }, [{ id: 'o2', name: 'Museu Pau Casals', kind: 'museum', metres: 9, lat: 41.18, lng: 1.56, phones: [], websites: [], socials: [] }], mus, { meter: {} })).entry.id, 'o2');
});
