// iryo and Ouigo looked up on request (worker/rail-brands.mjs): the answer read, the shared record renewed only when old,
// the badges on the guide that asked and, when a list changed, on the others. A fake Claude and a fake database: no
// network, nothing kept.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandsPrompt, readBrands, refreshBrands, applyToFiles, brandsJob, hsStations, brandsList, MIN_STATIONS } from '../rail-brands.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };
const HS = [{ id: '04104', name: 'Camp de Tarragona' }, { id: '71801', name: 'Barcelona-Sants' }, { id: '60000', name: 'Madrid-Puerta de Atocha' }, { id: '04040', name: 'Zaragoza Delicias' }, { id: '03216', name: 'València-Joaquín Sorolla' }];
const IDS = HS.map(s => s.id), B = brandsList(), NOW = new Date('2026-11-16T12:00:00Z');
const ago = n => new Date(+NOW - n * 864e5).toISOString();
const SURE = { iryo: { sure: true, stations: [{ id: '71801', name: 'Barcelona Sants' }, { id: '04104', name: 'Camp de Tarragona' }, { id: '60000', name: 'Madrid Puerta de Atocha' }, { id: '04040', name: 'Zaragoza' }], sources: ['https://www.example.org/news', 'https://iryo.eu/es/destinos'] },
  ouigo: { sure: true, stations: [{ id: '71801', name: 'Barcelona' }, { id: '04104', name: 'Camp de Tarragona' }, { id: '60000', name: 'Madrid' }], sources: ['https://www.ouigo.com/es/destinos'] } };
// The database: rail_brands rows, the guides; every call kept.
function fakeDb({ rows = [], guides = {}, failRead = false } = {}) {
  const calls = [], R = rows.map(r => ({ ...r })), G = JSON.parse(JSON.stringify(guides));
  const rest = async (path, o = {}) => { calls.push([o.method || 'GET', path, o.body]);
    if (path.startsWith('/rest/v1/rail_brands')) {
      if ((o.method || 'GET') === 'GET') { if (failRead) throw new Error('down'); return R.map(r => ({ ...r })); }
      const i = R.findIndex(r => r.brand === o.body.brand); if (i < 0) R.push({ stations: [], seen: [], sources: [], checked_at: null, ...o.body }); else R[i] = { ...R[i], ...o.body }; return null; }
    if (path.startsWith('/rest/v1/guides')) {
      const id = (path.match(/id=(eq|neq)\.([^&]+)/) || [])[2], neq = /id=neq\./.test(path);
      if ((o.method || 'GET') === 'PATCH') { Object.assign(G[id], o.body); return null; }
      return Object.entries(G).filter(([k]) => neq ? k !== id : k === id).map(([k, g]) => ({ id: k, slug: k, ...g }));
    }
    throw new Error('not expected: ' + path); };
  return { rest, calls, R, G };
}
const camp = (badges = [{ t: 'AVE', c: '#001F4C', ink: false }]) => ({ id: 'st04104', mode: 'train', src: { from: 'renfe', at: '2026-11-16' }, badges });
const vendrell = () => ({ id: 'st72201', mode: 'train', src: { from: 'renfe', at: '2026-11-16' }, badges: [{ t: 'R4', c: '#F7A30D', ink: true }] });
const files = stations => ({ house: {}, transport: { taxis: [], stations } });
const claude = (answer, asked = []) => async prompt => { asked.push(prompt); return answer; };

test('the files: our high speed stations and the brands\' colours', () => {
  const hs = hsStations();
  assert.ok(hs.length > 40 && hs.some(s => s.id === '04104' && s.name === 'Camp de Tarragona') && !hs.some(s => s.id === '72201'));
  assert.equal(B.find(b => b.t === 'iryo').c, '#E20613');
});

test('brandsPrompt: both companies, our ids only, planned routes are not served, JSON only', () => {
  const p = brandsPrompt(HS);
  assert.match(p, /"iryo"/); assert.match(p, /Ouigo Spain/); assert.match(p, /04104: Camp de Tarragona/);
  assert.match(p, /planned or announced but not running today is not a served station/); assert.match(p, /iryo\.eu/); assert.match(p, /ouigo\.com\/es/);
  assert.match(p, /Return only JSON/);
});

test('readBrands: sure, our ids only, at least 3 stations, a source; the company\'s own pages first', () => {
  const r = readBrands(SURE, IDS);
  assert.deepEqual(r.iryo.stations, ['04040', '04104', '60000', '71801']);
  assert.deepEqual(r.iryo.sources, ['https://iryo.eu/es/destinos', 'https://www.example.org/news']);
  assert.deepEqual(r.iryo.seen[0], { id: '71801', name: 'Barcelona Sants' });
  assert.equal(r.ouigo.sure, true);
  const bad = (o, why) => assert.deepEqual(readBrands({ iryo: o }, IDS).iryo, { sure: false, why });
  bad({ ...SURE.iryo, sure: false }, 'not sure');
  bad({ ...SURE.iryo, sure: 'true' }, 'not sure');
  bad({ ...SURE.iryo, stations: [...SURE.iryo.stations, { id: '99999', name: 'Nowhere' }] }, 'a station not in our list');
  bad({ ...SURE.iryo, stations: SURE.iryo.stations.slice(0, MIN_STATIONS - 1) }, '2 stations');
  bad({ ...SURE.iryo, sources: ['iryo.eu', 'ftp://x'] }, 'no source');
  assert.deepEqual(readBrands(null, IDS), { iryo: { sure: false, why: 'not sure' }, ouigo: { sure: false, why: 'not sure' } });
});

test('refreshBrands: no rows, one question for both, both saved with the dates and the cost', async () => {
  const db = fakeDb(), asked = [], meter = { usd: 0 };
  const ask = async p => { asked.push(p); meter.usd += 0.31; return SURE; };
  const r = await refreshBrands({ rest: db.rest, ask, now: NOW, hs: HS, meter });
  assert.equal(asked.length, 1); assert.equal(r.asked, true); assert.deepEqual(r.changed, ['iryo', 'ouigo']); assert.equal(r.usd, 0.31);
  assert.deepEqual(db.R.map(x => [x.brand, x.stations, x.checked_at, x.tried_at, x.usd]), [['iryo', ['04040', '04104', '60000', '71801'], NOW.toISOString(), NOW.toISOString(), 0.31], ['ouigo', ['04104', '60000', '71801'], NOW.toISOString(), NOW.toISOString(), 0.31]]);
  assert.ok(db.calls.filter(c => c[0] === 'POST').every(c => /on_conflict=brand/.test(c[1])));
});

test('refreshBrands: fresh rows, nothing asked; old rows asked again; a search tried lately not repeated', async () => {
  const fresh = [{ brand: 'iryo', stations: ['04104'], checked_at: ago(5), tried_at: ago(5) }, { brand: 'ouigo', stations: ['04104'], checked_at: ago(10), tried_at: ago(10) }];
  { const db = fakeDb({ rows: fresh }), asked = []; const r = await refreshBrands({ rest: db.rest, ask: claude(SURE, asked), now: NOW, hs: HS });
    assert.equal(asked.length, 0); assert.equal(r.asked, false); assert.equal(r.rows.length, 2); }
  { const db = fakeDb({ rows: [{ ...fresh[0], checked_at: ago(31), tried_at: ago(31) }, fresh[1]] }), asked = []; await refreshBrands({ rest: db.rest, ask: claude(SURE, asked), now: NOW, hs: HS }); assert.equal(asked.length, 1); }
  { const db = fakeDb({ rows: [{ ...fresh[0], checked_at: ago(31), tried_at: ago(3) }, fresh[1]] }), asked = []; await refreshBrands({ rest: db.rest, ask: claude(SURE, asked), now: NOW, hs: HS }); assert.equal(asked.length, 0); }
  { const db = fakeDb({ rows: fresh }), asked = []; await refreshBrands({ rest: db.rest, ask: claude(SURE, asked), now: NOW, hs: HS, force: true, dry: true });
    assert.equal(asked.length, 1); assert.ok(!db.calls.some(c => c[0] !== 'GET'), 'a dry run writes nothing'); }
});

test('refreshBrands: a search not sure keeps the lists, writes only when it was tried and its cost', async () => {
  const old = [{ brand: 'iryo', stations: ['04104', '71801', '60000'], seen: [], sources: ['https://iryo.eu/'], checked_at: ago(40), tried_at: ago(40) }];
  const db = fakeDb({ rows: old });
  const r = await refreshBrands({ rest: db.rest, ask: claude({ iryo: { sure: false }, ouigo: { ...SURE.ouigo, stations: [{ id: '71801', name: 'x' }] } }), now: NOW, hs: HS });
  assert.deepEqual(r.changed, []);
  const posts = db.calls.filter(c => c[0] === 'POST').map(c => c[2]);
  assert.deepEqual(posts, [{ brand: 'iryo', tried_at: NOW.toISOString(), usd: 0 }, { brand: 'ouigo', tried_at: NOW.toISOString(), usd: 0 }]);
  assert.deepEqual(db.R.find(x => x.brand === 'iryo').stations, ['04104', '71801', '60000']); assert.equal(db.R.find(x => x.brand === 'iryo').checked_at, old[0].checked_at);
  assert.equal(db.R.find(x => x.brand === 'ouigo').checked_at, null);
});

test('refreshBrands never throws: the record unreadable, Claude failing or the day\'s budget spent', async () => {
  const logs = [];
  { const db = fakeDb({ failRead: true }); const r = await refreshBrands({ rest: db.rest, ask: claude(SURE), now: NOW, hs: HS, log: (...a) => logs.push(a.join(' ')) }); assert.deepEqual(r.rows, []); }
  { const rows = [{ brand: 'iryo', stations: ['04104', '71801', '60000'], checked_at: ago(40), tried_at: ago(40) }], db = fakeDb({ rows });
    const r = await refreshBrands({ rest: db.rest, ask: async () => { throw new Error('Searches are paused for today. Try again tomorrow.'); }, now: NOW, hs: HS, log: (...a) => logs.push(a.join(' ')) });
    assert.deepEqual(r.rows.find(x => x.brand === 'iryo').stations, ['04104', '71801', '60000']); assert.deepEqual(r.changed, []); }
  { const db = fakeDb(); const r = await refreshBrands({ rest: db.rest, ask: null, now: NOW, hs: HS }); assert.equal(r.asked, false); }
  assert.ok(logs.some(l => /paused/.test(l)));
});

test('applyToFiles: the badges on the stations of our file only, a change only when something changes', () => {
  const rows = [{ brand: 'iryo', stations: ['04104'], checked_at: ago(1) }, { brand: 'ouigo', stations: ['04104'], checked_at: ago(1) }];
  const f = files([camp(), vendrell(), { id: 'camptgn', mode: 'train', badges: [{ t: 'iryo', c: '#5B2C83' }] }]);
  const a = applyToFiles(f, rows, B, { hsIds: new Set(IDS) });
  assert.equal(a.changed, true);
  assert.deepEqual(a.files.transport.stations[0].badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo']);
  assert.equal(a.files.transport.stations[1], f.transport.stations[1], 'El Vendrell, no high speed: untouched'); assert.equal(a.files.transport.stations[2], f.transport.stations[2]);
  assert.deepEqual(Object.keys(a.stations), ['st04104']);
  const again = applyToFiles(a.files, rows, B, { hsIds: new Set(IDS) }); assert.equal(again.changed, false);
  assert.deepEqual(applyToFiles(f, rows, B).files.transport.stations[0].badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo'], 'by default, our file\'s hs ids');
  // Another guide: a new date alone is not a change.
  const later = rows.map(r => ({ ...r, checked_at: ago(0) }));
  assert.equal(applyToFiles(a.files, later, B, { only: 'badges' }).changed, false); assert.equal(applyToFiles(a.files, later, B).changed, true);
  assert.ok(!('brands' in a.files.transport.stations[1]));
});

test('brandsJob: the guide that asked gets the badges in its draft and its result; the others only when a list changed', async () => {
  const guides = { me: { content: { files: files([camp()]) }, draft: { content: { files: files([camp(), vendrell()]) }, theme: {} } },
    other: { content: { files: files([camp()]) }, draft: null },
    otherDraft: { content: { files: files([vendrell()]) }, draft: { content: { files: files([camp()]) } } },
    hand: { content: { files: files([{ id: 'camptgn', mode: 'train', badges: [] }]) }, draft: null } };
  const db = fakeDb({ guides }), msgs = [], done = [];
  const jp = async b => { if (b.message) msgs.push(b.message); if (b.status) done.push(b); };
  await brandsJob({ id: 'j1', guide_id: 'me', params: { what: 'brands', id: 'st04104' } }, jp, { rest: db.rest, ask: claude(SURE), now: NOW, hs: HS, brands: B });
  const mine = db.G.me.draft.content.files.transport.stations;
  assert.deepEqual(mine[0].badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo']); assert.deepEqual(mine[0].brands, { at: '2026-11-16' }); assert.deepEqual(mine[1].badges.map(b => b.t), ['R4']);
  assert.deepEqual(db.G.me.content.files.transport.stations[0].badges.map(b => b.t), ['AVE'], 'the guide that asked: its draft, as the lines\' job');
  assert.deepEqual(db.G.other.content.files.transport.stations[0].badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo'], 'another guide: its content');
  assert.deepEqual(db.G.otherDraft.draft.content.files.transport.stations[0].badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo'], 'and its draft');
  assert.ok(!db.calls.some(c => c[0] === 'PATCH' && /id=eq\.hand/.test(c[1])), 'a guide with no station of our file is not written');
  assert.deepEqual(msgs, ['Checking other train companies', '2 companies checked']);
  assert.ok(msgs.every(m => !/claude|web/i.test(m)));
  assert.deepEqual(done[0].result.stations.st04104.badges.map(b => b.t), ['AVE', 'iryo', 'Ouigo']); assert.deepEqual(done[0].result.stations.st04104.brands, { at: '2026-11-16' });
  // A second request with fresh rows: nothing asked, no other guide read or written.
  const asked = [], n = db.calls.length;
  await brandsJob({ id: 'j2', guide_id: 'other', params: { what: 'brands', id: 'st04104' } }, jp, { rest: db.rest, ask: claude(SURE, asked), now: NOW, hs: HS, brands: B });
  assert.equal(asked.length, 0); assert.ok(!db.calls.slice(n).some(c => /id=neq\./.test(c[1])));
});

test('brandsJob: a search not sure changes nothing anywhere and still finishes quietly', async () => {
  const guides = { me: { content: { files: files([camp()]) }, draft: null }, other: { content: { files: files([camp()]) }, draft: null } };
  const db = fakeDb({ guides }), done = [];
  await brandsJob({ id: 'j1', guide_id: 'me', params: { what: 'brands' } }, async b => { if (b.status) done.push(b); }, { rest: db.rest, ask: claude({ iryo: { sure: false }, ouigo: { sure: false } }), now: NOW, hs: HS, brands: B });
  assert.ok(!db.calls.some(c => c[0] === 'PATCH'), 'no guide written');
  assert.equal(done[0].status, 'done'); assert.equal(done[0].message, 'No other company confirmed'); assert.deepEqual(done[0].result.stations.st04104.badges.map(b => b.t), ['AVE']);
});
