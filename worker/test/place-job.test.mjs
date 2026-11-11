// The editor's job place-facts (worker/place-job.mjs): one place through the build's own chain, its result in the job for
// the open editor. No network: the database, Overture, GeoNames, Claude and the place's website are stand-ins, Google is
// never asked (the pin is the one the host's pick wrote in the draft), and fetch itself refuses unless a test lets one site answer.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { placeFactsJob, PLACE_FACTS_PER_DAY, factsFound } from '../place-job.mjs';
import { mergeFacts } from '../place-store.mjs';
import { NET, publicUrl, siteAlive } from '../place-facts.mjs';

process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
const NO_NET = async () => { throw new Error('no network in tests'); };
globalThis.fetch = NO_NET;
const PUBLIC = async () => [{ address: '93.184.216.34', family: 4 }];
NET.lookup = PUBLIC;   // no network in tests: every name resolves to a public address unless a test says otherwise

const GID = 'Gloc4nda0000aa', H = [{ days: ['tue', 'wed', 'thu'], open: '13:00', close: '16:00' }];
const today = new Date().toISOString().slice(0, 10), fresh = new Date(Date.now() - 86400000).toISOString();
// The guide's draft: the house and the place the host just picked (Google's id and dated position, the host's words).
const guide = (more = {}) => ({ answers: { town: 'El Vendrell' }, content: { files: { house: { lat: 41.2, lng: 1.5 } } },
  draft: { content: { files: { house: { lat: 41.2, lng: 1.5 }, restaurants: { items: [{ id: 'custom-1', name: { en: 'la locanda' }, gid: GID, lat: 41.21, lng: 1.51, pos: { from: 'google', at: today }, ...more }] } } } } });
// Supabase's REST API: the day's jobs of this kind for the cap, and the guide row.
const fakeRest = (g, recent = 0, calls = []) => async path => { calls.push(path);
  if (path.startsWith('/rest/v1/guide_jobs')) return Array.from({ length: recent }, (_, i) => ({ id: 'j' + i }));
  if (path.startsWith('/rest/v1/guides')) return [g];
  throw new Error('not expected: ' + path); };
const fakeStore = (rows, saved = []) => ({ get: async gids => Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])),
  save: async (gid, place, res, opts) => { saved.push([gid, place]); const r = { gid, ...mergeFacts(rows[gid] || null, place, res, opts) }; rows[gid] = r; return r; } });
const record = { id: 'ov1', name: 'La Locanda', kind: 'italian_restaurant', metres: 12, lat: 41.2102, lng: 1.5102, phones: ['977661625'], websites: [], socials: [] };
const near = (cands = [record]) => async (h, pins) => ({ release: 'r1', towns: {}, pins: Object.fromEntries(pins.map(p => [p.id, cands])) });
const noGaz = async () => ({ fetched: null, pins: {} });
const job = (params = {}) => ({ id: 'job-1', guide_id: 'guide-1', kind: 'place-facts', params: { item: 'custom-1', list: 'eat', gid: GID, words: 'la locanda', about: 'the pizzas', ...params } });
const run = async (o = {}) => { const msgs = [], done = [];
  const jp = async b => { if (b.message) msgs.push(b.message); if (b.status) done.push(b); };
  const r = await placeFactsJob(o.job || job(o.params), jp, { rest: fakeRest(o.g || guide(), o.recent || 0, o.calls), store: fakeStore(o.rows || {}, o.saved), ask: o.ask === undefined ? null : o.ask,
    again: o.again || null, near: o.near || near(), gaz: noGaz, log: () => {}, meter: o.meter || { usd: 0 }, locate: o.locate });
  return { r, msgs, done }; };
// Claude, as the chain asks it: the match, then the place's site; each answer costs 0.01 USD on the meter.
const claude = (site, asked = []) => async (prompt, o) => { asked.push([o.what, prompt]); if (o.meter) o.meter.usd = (o.meter.usd || 0) + 0.01;
  return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "La Locanda", "kind": "fork"}' : JSON.stringify(site); };
const SITE = { website: 'https://locanda.example/', about: true, phone: null, hours: H, price: '20-30', book: true, kind: 'pizza' };

test('place-facts: a place found gets the build\'s entry with where each fact came from, Google not asked', async () => {
  const asked = [], calls = [], saved = [], meter = { usd: 0 };
  const { r, msgs, done } = await run({ ask: claude(SITE, asked), calls, saved, meter });
  const e = r.entry;
  assert.equal(e.name, 'La Locanda'); assert.equal(e.kind, 'pizza'); assert.equal(e.phone, '977 66 16 25'); assert.equal(e.url, 'https://locanda.example/');
  assert.deepEqual(e.schedule, H); assert.equal(e.price, '20-30'); assert.equal(e.book, true);
  assert.equal(e.lat, 41.2102); assert.equal(e.pos, undefined);   // Overture's position, ours: no pos
  assert.deepEqual(e.filled, { at: today, from: { kind: 'site', phone: 'overture', url: 'search', schedule: 'site', price: 'site', book: 'site' }, page: 'https://locanda.example/' });
  assert.deepEqual(asked.map(a => a[0]), ['place match', 'site facts']); assert.match(asked[0][1], /the pizzas/);
  assert.deepEqual(saved.map(s => s[0]), [GID]);   // kept in place_facts for the next time
  assert.deepEqual(msgs, ['Looking for its website', 'Reading its website', 'Details found']);
  assert.equal(done.length, 1); assert.equal(done[0].status, 'done'); assert.deepEqual(done[0].result, { item: 'custom-1', entry: e });
  assert.equal(r.usd, 0.02); assert.equal(meter.usd, 0.02);
  assert.match(calls[0], /kind=eq\.place-facts/); assert.match(calls[0], /guide_id=eq\.guide-1/);
});

test('place-facts: a place kept and looked at lately costs nothing', async () => {
  const rows = { [GID]: { gid: GID, tried_at: fresh, facts: { name: 'La Locanda', kind_eat: 'pizza', phone: '977 66 16 25', hours: H, lat: 41.2102, lng: 1.5102 },
    sources: { kind_eat: { from: 'site', at: '2026-11-08', page: 'https://locanda.example/' }, phone: { from: 'overture', at: '2026-11-08' }, hours: { from: 'site', at: '2026-11-08', page: 'https://locanda.example/' } } } };
  const saved = [], ask = async () => { throw new Error('Claude not asked'); };
  const { r, msgs } = await run({ ask, rows, saved });
  assert.equal(r.usd, 0); assert.equal(saved.length, 0);
  assert.deepEqual(r.entry.filled, { at: '2026-11-08', from: { kind: 'site', phone: 'overture', schedule: 'site' }, page: 'https://locanda.example/' });
  assert.deepEqual(msgs, ['Looking for its website', 'Details found']);
});

test('place-facts: nothing found gives entry null; a place with no pin is located by its id', async () => {
  const ask = async (p, o) => o.what === 'place match' ? '{"venue": true, "entry": null, "sure": false, "name": null, "kind": null}' : '{"website": null, "about": false}';
  const { r, done } = await run({ ask, near: near([]) });
  assert.equal(r.entry, null); assert.deepEqual(done[0].result, { item: 'custom-1', entry: null }); assert.equal(done[0].message, 'Nothing found');
  assert.equal(factsFound({ name: 'x', lat: 1, lng: 1, pos: { from: 'google', at: today } }), false);
  assert.equal(factsFound({ name: 'x', lat: 1, lng: 1 }), true);   // a position of ours is something
  // The item has no pin in the draft (an older guide): the stand-in for Google is asked by the id, once.
  const byId = []; const g = guide(); delete g.draft.content.files.restaurants.items[0].lat;
  await run({ ask, near: near([]), g, locate: { byId: async id => { byId.push(id); return { gid: id, lat: 41.21, lng: 1.51 }; }, byWords: async () => null } });
  assert.deepEqual(byId, [GID]);
});

test('place-facts: at most 30 a day per guide, and nothing without the Claude API', async () => {
  assert.equal(PLACE_FACTS_PER_DAY, 30);
  await assert.rejects(run({ ask: claude(SITE), recent: 30 }), /You have looked up a lot of places today\. Try again tomorrow\./);
  await assert.rejects(run({ ask: null }), /Looking up places is not switched on yet\./);
  await assert.rejects(run({ ask: claude(SITE), params: { gid: 'not an id' } }), /cannot be looked up/);
  await assert.rejects(run({ ask: claude(SITE), params: { words: '  ' } }), /cannot be looked up/);
});

test('place-facts: a page the host pasted is read, even for a place kept lately, and becomes its website from the site', async () => {
  const rows = { [GID]: { gid: GID, tried_at: fresh, facts: { name: 'La Locanda', kind_eat: 'fork' }, sources: { kind_eat: { from: 'claude', at: '2026-11-08' } } } };
  const asked = [], opened = [];
  globalThis.fetch = async u => { opened.push(String(u)); if (!/^https:\/\/locanda\.example\//.test(String(u))) throw new Error('no network in tests'); return { status: 200, url: 'https://locanda.example/', body: null }; };
  try {
    const { r } = await run({ ask: claude({ ...SITE, website: 'https://locanda.example/', phone: '977 66 16 25' }, asked), rows, near: near([]), params: { website: 'locanda.example' } });
    assert.match(asked.find(a => a[0] === 'site facts')[1], /^Open https:\/\/locanda\.example\/ :/);
    assert.equal(r.entry.url, 'https://locanda.example/'); assert.deepEqual(r.entry.schedule, H); assert.equal(r.entry.phone, '977 66 16 25');
    assert.deepEqual(r.entry.filled.from, { kind: 'site', phone: 'site', url: 'site', schedule: 'site', price: 'site', book: 'site' });
    assert.deepEqual(opened, ['https://locanda.example/']);
    // A directory pasted as its website is not read: the chain looks for the place's own site instead.
    opened.length = 0; asked.length = 0;
    await run({ ask: claude(SITE, asked), rows: {}, near: near([]), params: { website: 'https://www.tripadvisor.es/Restaurant_Review-x' } });
    assert.deepEqual(opened, []); assert.match(asked.find(a => a[0] === 'site facts')[1], /^Search the web/);
  } finally { globalThis.fetch = NO_NET; }
});

test('place-facts: Claude not answering is a failure the host can try again, not "nothing found"', async () => {
  const paused = async () => { throw new Error('Translation is paused for today. Try again tomorrow.'); };
  await assert.rejects(run({ ask: paused }), /^Error: Looking up places is paused for today\. Try again tomorrow\.$/);
  const down = async () => { throw new Error('The search did not work this time. Try again in a few minutes.'); };
  await assert.rejects(run({ ask: down }), /^Error: Try again in a few minutes\.$/);
});

test('the worker only opens public web addresses: no numbers, no private names, no odd ports, and redirects are checked too', async () => {
  for (const u of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'http://localhost/', 'https://user:pw@locanda.example/', 'https://locanda.example:8080/', 'ftp://locanda.example/', 'file:///etc/passwd'])
    assert.equal(await publicUrl(u), false, u);
  assert.equal(await publicUrl('https://locanda.example/carta'), true);
  // a name that resolves to this machine or to a private network is refused, whatever it is called
  for (const address of ['127.0.0.1', '10.0.0.5', '172.17.0.1', '192.168.1.10', '169.254.169.254', '100.64.0.1']) { NET.lookup = async () => [{ address, family: 4 }]; assert.equal(await publicUrl('https://inside.example/'), false, address); }
  for (const address of ['::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) { NET.lookup = async () => [{ address, family: 6 }]; assert.equal(await publicUrl('https://inside.example/'), false, address); }
  NET.lookup = async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.5', family: 4 }]; assert.equal(await publicUrl('https://mixed.example/'), false);
  NET.lookup = async () => { throw new Error('no such name'); }; assert.equal(await publicUrl('https://nowhere.example/'), false);
  // a public site that redirects to a private address is not followed
  NET.lookup = async h => [{ address: h === 'inside.example' ? '10.0.0.5' : '93.184.216.34', family: 4 }];
  const opened = [];
  globalThis.fetch = async u => { opened.push(String(u)); return { status: 302, headers: { get: k => (k === 'location' ? 'http://inside.example/admin' : null) }, body: null }; };
  try { assert.equal(await siteAlive('https://locanda.example/'), null); assert.deepEqual(opened, ['https://locanda.example/']); }
  finally { globalThis.fetch = NO_NET; NET.lookup = PUBLIC; }
});
