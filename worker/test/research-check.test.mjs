// The research's check (worker/research-check.mjs, locateItem in worker/places.mjs): Google only locates, nothing of it but
// the id is written, our own sources fill what the research left empty. No network: Google, the table, Overture, GeoNames
// and Claude are stand-ins, and fetch itself refuses.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkResearch, mapsLink, MAX_FILLED } from '../research-check.mjs';
import { locateItem, hav } from '../places.mjs';
import { mergeFacts } from '../place-store.mjs';

process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
globalThis.fetch = async () => { throw new Error('no network in tests'); };

const house = { lat: 41.2, lng: 1.5 };
const fresh = new Date(Date.now() - 86400000).toISOString();
const H = [{ days: ['tue', 'wed'], open: '10:00', close: '14:00' }];
const noNear = async () => { throw new Error('Overture not asked'); }, noGaz = async () => { throw new Error('GeoNames not asked'); };
const emptyNear = async () => ({ release: 'r1', pins: {}, towns: {} }), emptyGaz = async () => ({ fetched: null, pins: {} });
// An item as the research writes it: its own name, position and description.
const item = (id, lat, lng, more = {}) => ({ id, name: { en: id.replace(/-/g, ' ') }, name_local: id.replace(/-/g, ' '), lat, lng, km_from_house: 1, description: { en: 'Worth it.' }, tags: [], flags: [], ...more });
// Google's answer for each item, by its id: { gid, lat, lng, status }, null, or a throw.
const fakeLocate = answers => async it => { const a = answers[it.id]; if (a instanceof Error) throw a; return a || null; };
const gid = n => `G${n}aaaaaaaaaaaa`;
const fakeStore = (rows, log = { get: [], save: [] }) => ({
  get: async gids => { log.get.push([...gids]); return Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])); },
  save: async (g, place, res, opts) => { log.save.push([g, place]); const r = { gid: g, ...mergeFacts(rows[g] || null, place, res, opts) }; rows[g] = r; return r; } });
const opts = o => ({ house, pause: 0, today: '2026-11-10', log: () => {}, ...o });

test('locateItem: asks Google for the id, the position, the name and the status only, and returns no name', async () => {
  const seen = [];
  globalThis.fetch = async (url, init) => { seen.push({ url, mask: init.headers['X-Goog-FieldMask'], body: init.body ? JSON.parse(init.body) : null });
    return { ok: true, json: async () => ({ places: [{ id: gid(1), displayName: { text: 'Castell de Querol' }, businessStatus: 'OPERATIONAL', location: { latitude: 41.4235, longitude: 1.3979 }, rating: 4.8, photos: [{ name: 'x' }] }] }) }; };
  try {
    const it = item('castell-de-querol', 41.4234, 1.3978, { town: 'Querol' });
    const r = await locateItem('KEY', it);
    assert.deepEqual(r, { gid: gid(1), lat: 41.4235, lng: 1.3979, status: 'OPERATIONAL' });
    assert.equal(seen[0].mask, 'places.id,places.location,places.displayName,places.businessStatus');
    assert.equal(seen[0].body.textQuery, 'castell de querol, Querol');
    // Another place's name, or the same name 3 km away: not ours.
    assert.equal(await locateItem('KEY', item('museu-del-vi', 41.4234, 1.3978)), null);
    assert.equal(await locateItem('KEY', item('castell-de-querol', 41.45, 1.3978)), null);
    // A known id: details by id, the same four fields.
    seen.length = 0;
    globalThis.fetch = async (url, init) => { seen.push({ url, mask: init.headers['X-Goog-FieldMask'] }); return { ok: true, json: async () => ({ id: gid(1), displayName: { text: 'Castell de Querol' }, businessStatus: 'CLOSED_TEMPORARILY', location: { latitude: 41.4235, longitude: 1.3979 } }) }; };
    assert.equal((await locateItem('KEY', { ...it, gid: gid(1) })).status, 'CLOSED_TEMPORARILY');
    assert.match(seen[0].url, /\/places\/G1a+$/); assert.equal(seen[0].mask, 'id,location,displayName,businessStatus');
  } finally { globalThis.fetch = async () => { throw new Error('no network in tests'); }; }
});

test('checkResearch: nothing of Google\'s but the id; a closed place is dropped; a place Google does not find stays', async () => {
  const items = [item('aqualeon', 41.25, 1.55), item('gone-bar', 41.21, 1.51), item('hidden-cove', 41.22, 1.52), item('museu', 41.23, 1.53, { gmaps: 'https://maps.app.goo.gl/abc' })];
  const msgs = [];
  const out = await checkResearch(items, 'todo', opts({ locate: fakeLocate({ aqualeon: { gid: gid(1), lat: 41.2501, lng: 1.5501, status: 'OPERATIONAL' }, 'gone-bar': { gid: gid(2), lat: 41.21, lng: 1.51, status: 'CLOSED_PERMANENTLY' }, 'hidden-cove': new Error('Google down'), museu: { gid: gid(4), lat: 41.23, lng: 1.53, status: 'OPERATIONAL' } }),
    progress: (i, n, stage) => { msgs.push(`${stage} ${i}/${n}`); } }));
  assert.deepEqual(out.map(x => x.id), ['aqualeon', 'hidden-cove', 'museu']);
  const a = out[0];
  assert.equal(a.gid, gid(1)); assert.equal(a._google, 'On Google'); assert.equal(a.checked, '2026-11-10');
  assert.equal(a.gmaps, mapsLink('aqualeon', gid(1))); assert.equal(a.gmaps, 'https://www.google.com/maps/search/?api=1&query=aqualeon&query_place_id=G1aaaaaaaaaaaa');
  assert.equal(a.lat, 41.25); assert.equal(a.lng, 1.55);   // Google's position is not written, and no pos mark: the research's own
  for (const k of ['_card', 'rating', 'reviews', 'photo', 'hoursSource', 'schedule', 'pos', 'address']) assert.ok(!(k in a), k);
  assert.equal(out[1]._google, 'Not found on Google: the web source is the only proof'); assert.equal(out[1].gid, undefined);
  assert.equal(out[2].gmaps, 'https://maps.app.goo.gl/abc');   // a listing link the research gave stays
  assert.deepEqual(msgs, ['locate 1/4', 'locate 2/4', 'locate 3/4', 'locate 4/4']);   // no store: located only
  // No Google key: the items as they are.
  const same = [item('x', 41.2, 1.5)];
  assert.equal(await checkResearch(same, 'todo', opts({ locate: null })), same);
});

test('checkResearch: our facts fill only what the research left empty, our position replaces its own and the distance follows', async () => {
  const rows = {
    [gid(1)]: { gid: gid(1), tried_at: fresh, facts: { phone: '977 68 76 80', website: 'https://aqualeon.example/', hours: H, price: '30', book: true, lat: 41.2602, lng: 1.5602, kind_todo: 'waterpark' }, sources: { kind_todo: { from: 'claude', at: '2026-11-09' } } },
    [gid(2)]: { gid: gid(2), tried_at: fresh, facts: { phone: '977 11 11 11', website: 'https://other.example/', hours: H, price: '5' }, sources: { kind_todo: { from: 'claude', at: '2026-11-09', none: true } } },
  };
  const log = { get: [], save: [] };
  const items = [item('aqualeon', 41.25, 1.55, { flags: ['check'] }), item('ermita', 41.21, 1.51, { phone: '600 00 00 00', url: 'https://ermita.example/', schedule: [{ days: ['sun'], open: '11:00', close: '13:00' }], price: '0', icon: 'monastery', group: 'sights', km_from_house: 1.4 })];
  const out = await checkResearch(items, 'todo', opts({ locate: fakeLocate({ aqualeon: { gid: gid(1), lat: 41.2501, lng: 1.5501, status: 'OPERATIONAL' }, ermita: { gid: gid(2), lat: 41.2101, lng: 1.5101, status: 'OPERATIONAL' } }),
    store: fakeStore(rows, log), near: noNear, gaz: noGaz }));   // no ask: only what is kept, Overture and GeoNames not asked
  const [a, e] = out;
  assert.equal(a.phone, '977 68 76 80'); assert.equal(a.url, 'https://aqualeon.example/'); assert.deepEqual(a.schedule, H); assert.equal(a.hoursSource, undefined);
  assert.equal(a.price, '30'); assert.ok(a.flags.includes('book')); assert.ok(!a.flags.includes('check'));   // hours of its own site: the research's doubt goes
  assert.equal(a.lat, 41.2602); assert.equal(a.lng, 1.5602); assert.equal(a.pos, undefined);
  assert.equal(a.km_from_house, Math.round(hav(41.2, 1.5, 41.2602, 1.5602) * 10) / 10); assert.notEqual(a.km_from_house, 1);
  assert.equal(a.icon, 'waterpark'); assert.equal(a.group, 'fun'); assert.deepEqual(a.tags, ['kidsfun']);
  assert.equal(a.name.en, 'aqualeon'); assert.equal(a.description.en, 'Worth it.');   // its name and words stay the research's
  // What the research wrote stays; no position of ours: its own position stays, with no pos mark.
  assert.equal(e.phone, '600 00 00 00'); assert.equal(e.url, 'https://ermita.example/'); assert.deepEqual(e.schedule, [{ days: ['sun'], open: '11:00', close: '13:00' }]); assert.equal(e.price, '0');
  assert.equal(e.icon, 'monastery'); assert.equal(e.group, 'sights'); assert.deepEqual(e.tags, []);
  assert.equal(e.lat, 41.21); assert.equal(e.km_from_house, 1.4); assert.equal(e.pos, undefined);
  assert.equal(log.save.length, 0);
});

test('checkResearch: a place not kept goes through the chain and is kept; a failure for one place never fails the job', async () => {
  const rows = {}, log = { get: [], save: [] }, asked = [], pins = [];
  const ask = async (prompt, o) => { asked.push(o.what); return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Aqualeon", "kind": "waterpark"}' : '{"website": null, "about": false}'; };
  const near = async (h, p) => { pins.push(...p); return { release: 'r1', towns: {}, pins: { [gid(1)]: [{ id: 'ov1', name: 'Aqualeon Water Park', kind: 'water_park', metres: 10, lat: 41.2502, lng: 1.5502, phones: ['977687680'], websites: [], socials: [] }] } }; };
  const store = fakeStore(rows, log), real = store.save;
  store.save = async (g, ...r) => { if (g === gid(2)) throw new Error('database down'); return real(g, ...r); };
  const logs = [];
  const out = await checkResearch([item('aqualeon', 41.25, 1.55), item('can-pep', 41.21, 1.51)], 'todo', opts({ locate: fakeLocate({ aqualeon: { gid: gid(1), lat: 41.2501, lng: 1.5501 }, 'can-pep': { gid: gid(2), lat: 41.2101, lng: 1.5101 } }),
    store, ask, near, gaz: emptyGaz, log: m => logs.push(m) }));
  assert.equal(out.length, 2);
  assert.equal(out[0].phone, '977 68 76 80'); assert.equal(out[0].lat, 41.2502); assert.equal(out[0].icon, 'waterpark'); assert.deepEqual(out[0].tags, ['kidsfun']);
  assert.deepEqual(log.save.map(s => s[0]), [gid(1)]); assert.equal(log.save[0][1].name, 'aqualeon'); assert.equal(log.save[0][1].list, 'todo');
  assert.ok(logs.some(m => /database down/.test(m)));
  assert.equal(out[1].gid, gid(2)); assert.equal(out[1].phone, undefined);   // located, not filled
  assert.deepEqual(pins.map(p => p.id), [gid(2), gid(1)]);   // the nearest first; Google's pin, the research's names
  assert.deepEqual(pins[0].names, ['can pep']);
  assert.ok(asked.includes('place match'));
  // The store itself not answering: the items come back located.
  const down = { get: async () => { throw new Error('no table'); }, save: async () => { throw new Error('no table'); } };
  const o2 = await checkResearch([item('aqualeon', 41.25, 1.55)], 'todo', opts({ locate: fakeLocate({ aqualeon: { gid: gid(1), lat: 41.2501, lng: 1.5501 } }), store: down, ask, near, gaz: emptyGaz }));
  assert.equal(o2[0].gid, gid(1));
});

test('checkResearch: a temporarily closed place keeps its check, and a market is not sent through the chain', async () => {
  const rows = { [gid(1)]: { gid: gid(1), tried_at: fresh, facts: { hours: H }, sources: { kind_todo: { from: 'claude', at: '2026-11-09' } } } };
  const t = await checkResearch([item('ermita', 41.21, 1.51)], 'todo', opts({ locate: fakeLocate({ ermita: { gid: gid(1), lat: 41.21, lng: 1.51, status: 'CLOSED_TEMPORARILY' } }), store: fakeStore(rows), near: noNear, gaz: noGaz }));
  assert.deepEqual(t[0].flags, ['check']); assert.equal(t[0]._google, 'Temporarily closed on Google (off-season?)'); assert.deepEqual(t[0].schedule, H);
  const log = { get: [], save: [] }, ask = async () => { throw new Error('Claude not asked'); };
  const m = item('mercat-setmanal', 41.22, 1.52, { schedule: [{ days: ['sat'], open: '08:00', close: '13:00' }] });
  const out = await checkResearch([m], 'markets', opts({ locate: fakeLocate({ 'mercat-setmanal': { gid: gid(3), lat: 41.2201, lng: 1.5201, status: 'OPERATIONAL' } }), store: fakeStore({}, log), ask, near: noNear, gaz: noGaz }));
  assert.equal(out[0].gid, gid(3)); assert.equal(out[0].gmaps, mapsLink('mercat setmanal', gid(3)));
  assert.deepEqual(out[0].schedule, [{ days: ['sat'], open: '08:00', close: '13:00' }]); assert.equal(out[0].lat, 41.22);
  assert.deepEqual(log, { get: [], save: [] });
});

test('checkResearch: at most 12 places filled, the nearest first; the rest only located', async () => {
  const items = [], answers = {};
  for (let k = 15; k >= 1; k--) { const id = 'place-' + k; items.push(item(id, 41.2 + k / 100, 1.5)); answers[id] = { gid: gid(k), lat: 41.2 + k / 100, lng: 1.5 }; }
  const rows = Object.fromEntries(items.map((x, k) => [answers[x.id].gid, { gid: answers[x.id].gid, tried_at: fresh, facts: { phone: '900 00 00 0' + (k % 10) }, sources: { kind_todo: { from: 'claude', at: '2026-11-09' } } }]));
  const log = { get: [], save: [] }, msgs = [];
  const out = await checkResearch(items, 'todo', opts({ locate: fakeLocate(answers), store: fakeStore(rows, log), near: noNear, gaz: noGaz, progress: (i, n, s) => { msgs.push(`${s} ${i}/${n}`); } }));
  assert.equal(MAX_FILLED, 12); assert.equal(out.length, 15);
  assert.deepEqual(log.get[0], Array.from({ length: 12 }, (_, k) => gid(k + 1)));
  assert.deepEqual(out.filter(x => x.phone).map(x => x.id).sort(), Array.from({ length: 12 }, (_, k) => 'place-' + (k + 1)).sort());
  assert.ok(['place-13', 'place-14', 'place-15'].every(id => { const x = out.find(y => y.id === id); return x.gid && !x.phone; }));
  assert.ok(msgs.includes('locate 15/15') && msgs.includes('fill 12/12') && !msgs.includes('fill 13/12'));
});

