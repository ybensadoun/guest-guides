// Ride apps looked up on request (worker/ride-apps.mjs): the answer read, the cities placed by our gazetteer, the shared
// record renewed only when old, the editor's job. A fake Claude, a fake database, a fake town reader: no network.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS, appsPrompt, readApps, refreshApps, appsJob, appsNear } from '../ride-apps.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };
const NOW = new Date('2026-11-16T12:00:00Z'), ago = n => new Date(+NOW - n * 864e5).toISOString();
const SURE = { uber: { sure: true, cities: [{ name: 'Madrid', lat: 40.42, lng: -3.70 }, { name: 'Barcelona', lat: 41.39, lng: 2.17 }, { name: 'Nowhere', lat: 10, lng: 10 }], sources: ['https://www.uber.com/es/es/cities/'] },
  cabify: { sure: true, cities: [{ name: 'Madrid', lat: 40.42, lng: -3.7 }], sources: ['https://cabify.com/es'] }, bolt: { sure: false } };
// Our gazetteer: Madrid and Barcelona only, at their own positions.
const GAZ = { Madrid: { lat: 40.4165, lng: -3.70256 }, Barcelona: { lat: 41.38879, lng: 2.15899 } };
const place = async cities => cities.filter(c => GAZ[c.name]).map(c => ({ name: c.name, ...GAZ[c.name] }));
function fakeDb(rows = [], guide = null) {
  const R = rows.map(r => ({ ...r })), calls = [];
  const rest = async (path, o = {}) => { calls.push([o.method || 'GET', path, o.body]);
    if (path.startsWith('/rest/v1/ride_apps')) { if ((o.method || 'GET') === 'GET') return R.map(r => ({ ...r })); const i = R.findIndex(r => r.app === o.body.app); if (i < 0) R.push({ cities: [], sources: [], checked_at: null, ...o.body }); else R[i] = { ...R[i], ...o.body }; return null; }
    if (path.startsWith('/rest/v1/guides')) return [guide];
    throw new Error('not expected: ' + path); };
  return { rest, R, calls };
}

test('appsPrompt: the three apps, Spain, their own pages first, JSON only', () => {
  const p = appsPrompt();
  assert.ok(APPS.every(a => p.includes(`"${a.id}"`))); assert.match(p, /cities of Spain/); assert.match(p, /own pages first/); assert.match(p, /Return only JSON/);
});

test('readApps: sure, at least 2 cities with a position, a source', () => {
  const r = readApps(SURE);
  assert.equal(r.uber.sure, true); assert.equal(r.uber.cities.length, 3);
  assert.deepEqual(r.cabify, { sure: false, why: '1 cities' }); assert.deepEqual(r.bolt, { sure: false, why: 'not sure' });
  assert.deepEqual(readApps({ uber: { ...SURE.uber, sources: ['uber.com'] } }).uber, { sure: false, why: 'no source' });
});

test('refreshApps: one question, the cities placed by GeoNames (one dropped), a sure answer saved, the others only tried', async () => {
  const db = fakeDb(), asked = [];
  const r = await refreshApps({ rest: db.rest, ask: async p => { asked.push(p); return SURE; }, place, now: NOW });
  assert.equal(asked.length, 1); assert.deepEqual(r.changed, ['uber']);
  const uber = db.R.find(x => x.app === 'uber');
  assert.deepEqual(uber.cities, [{ name: 'Madrid', ...GAZ.Madrid }, { name: 'Barcelona', ...GAZ.Barcelona }]); assert.equal(uber.checked_at, NOW.toISOString());
  assert.deepEqual(db.calls.filter(c => c[0] === 'POST').map(c => Object.keys(c[2]).sort().join(',')), ['app,checked_at,cities,sources,tried_at,usd', 'app,tried_at,usd', 'app,tried_at,usd']);
});

test('refreshApps: fresh rows, nothing asked; tried lately, not again; no ask (budget spent), the kept rows; never throws', async () => {
  const fresh = APPS.map(a => ({ app: a.id, cities: [], checked_at: ago(3), tried_at: ago(3) }));
  { const db = fakeDb(fresh), asked = []; const r = await refreshApps({ rest: db.rest, ask: async p => { asked.push(p); return SURE; }, place, now: NOW }); assert.equal(asked.length, 0); assert.equal(r.rows.length, 3); }
  { const db = fakeDb(APPS.map(a => ({ app: a.id, checked_at: ago(40), tried_at: ago(2) }))), asked = []; await refreshApps({ rest: db.rest, ask: async p => { asked.push(p); return SURE; }, place, now: NOW }); assert.equal(asked.length, 0); }
  { const db = fakeDb(); const r = await refreshApps({ rest: db.rest, ask: null, place, now: NOW }); assert.equal(r.asked, false); }
  { const db = fakeDb(); const r = await refreshApps({ rest: db.rest, ask: async () => { throw new Error('Searches are paused for today.'); }, place, now: NOW }); assert.deepEqual(r.changed, []); assert.ok(db.R.every(x => x.checked_at === null)); }
  { const r = await refreshApps({ rest: async () => { throw new Error('down'); }, ask: async () => SURE, place, now: NOW }); assert.deepEqual(r.rows, []); }
});

test('appsJob: the apps near the guide\'s house, nothing written into the guide', async () => {
  const rows = [{ app: 'uber', cities: [{ name: 'Barcelona', ...GAZ.Barcelona }], checked_at: ago(2), tried_at: ago(2) }, { app: 'cabify', cities: [{ name: 'Madrid', ...GAZ.Madrid }], checked_at: ago(2), tried_at: ago(2) }, { app: 'bolt', cities: [], checked_at: null, tried_at: ago(2) }];
  const db = fakeDb(rows, { content: { files: { house: { lat: 41.40, lng: 2.17 } } }, draft: null }), msgs = [], done = [];
  await appsJob({ id: 'j', guide_id: 'g', params: { what: 'apps' } }, async b => { if (b.message) msgs.push(b.message); if (b.status) done.push(b); }, { rest: db.rest, ask: async () => SURE, place, now: NOW });
  assert.deepEqual(done[0].result.apps, [{ id: 'uber', name: 'Uber', link: 'https://www.uber.com/', src: { from: 'search', at: ago(2).slice(0, 10) } }]);
  assert.deepEqual(msgs, ['Checking ride apps', '1 ride app near the house']);
  assert.ok(!db.calls.some(c => c[0] === 'PATCH'));
  assert.deepEqual(appsNear({ lat: 0, lng: 0 }, rows), []);
});
