// The monthly job of Spain's stops (worker/transit.mjs): a fake runner for nap.py and stops.py (stops.py's stand-in writes
// a small folder of cells), a fake storage; never the access point, never our real storage.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refreshTransit, makeStorage, reportLines, plan } from '../transit.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };
process.env.TRANSIT_RETRY_MS = '1';   // a refused file is tried again at once here
// stops.py's stand-in: the cells given ({ name: stops }), an index naming them.
const writeCells = (out, cells) => { rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  for (const [n, k] of Object.entries(cells)) writeFileSync(join(out, n + '.json'), JSON.stringify({ stops: Array.from({ length: k }, (_, i) => ({ id: n + ':' + i })) }));
  writeFileSync(join(out, 'index.json'), JSON.stringify({ cell: 0.25, sources: [{ id: 'nap-1', updated: '2026-11-01' }], cells })); };
function fakeRun(out, script) { const calls = [];
  const run = (file, args) => { calls.push([file, args]);
    if (file.endsWith('nap.py')) return script.nap || { status: 0, stdout: 'nap: fetched 2, unchanged 150, failed 1, removed 0, 12.5 MB\n', stderr: '' };
    if (script.stops === 'fail') return { status: 1, stdout: '', stderr: 'Traceback: boom' };
    // stops.py keeps what is in the folder (published.json too) and writes the cells over it
    const keep = (() => { try { return readFileSync(join(out, 'published.json')); } catch (e) { return null; } })();
    writeCells(out, script.cells); if (keep) writeFileSync(join(out, 'published.json'), keep);
    return { status: 0, stdout: 'feeds read 2', stderr: '' }; };
  return { run, calls }; }
function fakeStorage(o = {}) { const puts = [], removed = [];
  return { puts, removed, put: async (n, b) => { if (o.fail && n === o.fail) throw new Error('503'); puts.push(n); }, remove: async names => { removed.push(...names); } }; }

test('the whole job: download, remake, cells published a few at a time with the index last, published.json kept', async () => {
  const out = mkdtempSync(join(tmpdir(), 'transit-')), f = fakeRun(out, { cells: { '164_6': 40, '164_7': 30, '161_-15': 30 } }), st = fakeStorage();
  const r = await refreshTransit({ run: f.run, storage: st, out, today: '2026-12-01' });
  assert.deepEqual(f.calls.map(c => c[0]), ['onboarding-site/src/nap.py', 'onboarding-site/src/stops.py']);
  assert.deepEqual(f.calls[1][1], ['--out', out, '--day', '2026-12-01']);
  assert.equal(st.puts.at(-1), 'index.json'); assert.deepEqual(st.puts.slice(0, -1).sort(), ['161_-15.json', '164_6.json', '164_7.json']);
  assert.deepEqual([r.ok, r.feeds, r.stops, r.cells, r.fetched, r.failed, r.published, r.removed], [true, 1, 100, 3, 2, 1, 4, 0]);
  assert.match(r.note, /download: fetched 2, unchanged 150, failed 1/);
  assert.equal(JSON.parse(readFileSync(join(out, 'published.json'), 'utf8')).stops, 100);
  // Again, nothing changed: nothing published. Then one cell changed and one gone: that cell, the index, one removed.
  const st2 = fakeStorage(); const r2 = await refreshTransit({ run: f.run, storage: st2, out, fetchFeeds: false });
  assert.deepEqual(st2.puts, []); assert.equal(r2.published, 0);
  const f3 = fakeRun(out, { cells: { '164_6': 45, '164_7': 30 } }), st3 = fakeStorage(); const r3 = await refreshTransit({ run: f3.run, storage: st3, out, fetchFeeds: false });
  assert.deepEqual(st3.puts, ['164_6.json', 'index.json']); assert.deepEqual(st3.removed, ['161_-15.json']); assert.equal(r3.removed, 1);
  assert.deepEqual(f3.calls.map(c => c[0]), ['onboarding-site/src/stops.py'], '--no-fetch: no download');
});

test('the guard: fewer than half the stops last published, nothing published; a dry run publishes nothing and says what it would', async () => {
  const out = mkdtempSync(join(tmpdir(), 'transit-'));
  await refreshTransit({ run: fakeRun(out, { cells: { a_1: 100, b_1: 100 } }).run, storage: fakeStorage(), out });
  const st = fakeStorage(), r = await refreshTransit({ run: fakeRun(out, { cells: { a_1: 90 } }).run, storage: st, out });
  assert.deepEqual(st.puts, []); assert.equal(r.ok, false); assert.match(r.note, /NOT published: 90 stops against 200/);
  const st2 = fakeStorage(), r2 = await refreshTransit({ run: fakeRun(out, { cells: { a_1: 120, c_1: 100 } }).run, storage: st2, out, dry: true });
  assert.deepEqual(st2.puts, []); assert.match(r2.note, /dry run: would publish 2 cell\(s\) and index.json, remove 1/);
});

test('failures: a failed download still remakes; a failed remake publishes nothing; a failed put keeps the index unpublished; never throws', async () => {
  const out = mkdtempSync(join(tmpdir(), 'transit-'));
  const r1 = await refreshTransit({ run: fakeRun(out, { nap: { status: 1, stdout: '', stderr: 'boom' }, cells: { a_1: 5 } }).run, storage: fakeStorage(), out });
  assert.equal(r1.ok, true); assert.match(r1.note, /nap.py ended with code 1/);
  const st = fakeStorage(), r2 = await refreshTransit({ run: fakeRun(out, { stops: 'fail' }).run, storage: st, out });
  assert.deepEqual(st.puts, []); assert.equal(r2.ok, false); assert.match(r2.note, /the remake failed/);
  const st3 = fakeStorage({ fail: 'b_1.json' }), r3 = await refreshTransit({ run: fakeRun(out, { cells: { a_1: 6, b_1: 1 } }).run, storage: st3, out });
  assert.ok(!st3.puts.includes('index.json')); assert.match(r3.note, /publishing failed part way/);
  const r4 = await refreshTransit({ run: () => { throw new Error('no python'); }, storage: fakeStorage(), out });
  assert.equal(r4.ok, false); assert.match(r4.note, /no python/);
  assert.equal(reportLines(r1).length, 3);
});

test('makeStorage: our storage\'s calls, upsert, the cache line, the bucket transit', async () => {
  const seen = [], fetchImpl = async (url, o) => { seen.push([url, o.method, o.headers, typeof o.body === 'string' ? o.body : '[bytes]']); return { ok: true, text: async () => '' }; };
  const s = makeStorage({ url: 'https://example.supabase.co/', key: 'k', fetchImpl });
  await s.put('164_6.json', Buffer.from('{}')); await s.remove(['161_-15.json']); await s.remove([]);
  assert.equal(seen.length, 2);
  assert.equal(seen[0][0], 'https://example.supabase.co/storage/v1/object/transit/stops-es/164_6.json'); assert.equal(seen[0][1], 'POST');
  assert.equal(seen[0][2]['x-upsert'], 'true'); assert.equal(seen[0][2]['cache-control'], 'max-age=3600'); assert.equal(seen[0][2]['content-type'], 'application/json');
  assert.deepEqual([seen[1][0], seen[1][1], JSON.parse(seen[1][3])], ['https://example.supabase.co/storage/v1/object/transit', 'DELETE', { prefixes: ['stops-es/161_-15.json'] }]);
  assert.equal(plan(mkdtempSync(join(tmpdir(), 'none-'))), null);
});

test('publishing: a file our storage refuses for a moment (429, 5xx) is tried again; a run cut short is carried on by the next', async () => {
  const out = mkdtempSync(join(tmpdir(), 'transit-')), f = fakeRun(out, { cells: { '164_6': 40, '164_7': 30, '161_-15': 30 } });
  // Refused twice, then taken: nothing is lost and the index is still last.
  const puts = [], tries = {}; const slow = { put: async n => { tries[n] = (tries[n] || 0) + 1; if (n === '164_7.json' && tries[n] < 3) throw new Error(n + ': 429 {"error":"too_many_connections"}'); puts.push(n); }, remove: async () => {} };
  const r = await refreshTransit({ run: f.run, storage: slow, out, today: '2026-12-01' });
  assert.equal(tries['164_7.json'], 3); assert.equal(puts.at(-1), 'index.json'); assert.equal(r.published, 4); assert.doesNotMatch(r.note, /publishing failed/);
  // A file refused for good (not a 429 or a 5xx): the run says so, the index is not put, and what went in is written down.
  const f2 = fakeRun(out, { cells: { '164_6': 41, '164_7': 31, '161_-15': 31 } }), puts2 = [];
  const cut = { put: async n => { if (n === '164_7.json') throw new Error(n + ': 403 no'); puts2.push(n); }, remove: async () => {} };
  const r2 = await refreshTransit({ run: f2.run, storage: cut, out, fetchFeeds: false });
  assert.match(r2.note, /publishing failed part way/); assert.equal(puts2.includes('index.json'), false);
  const kept = JSON.parse(readFileSync(join(out, 'published.json'), 'utf8')); assert.equal(kept.stops, 100);
  // The next run puts only what is missing, then the index.
  const puts3 = []; const ok = { put: async n => { puts3.push(n); }, remove: async () => {} };
  const r3 = await refreshTransit({ run: f2.run, storage: ok, out, fetchFeeds: false });
  assert.deepEqual(puts3, [...['164_6.json', '164_7.json', '161_-15.json'].filter(n => !puts2.includes(n)), 'index.json']); assert.equal(r3.published, puts3.length);
  assert.equal(JSON.parse(readFileSync(join(out, 'published.json'), 'utf8')).stops, 103);
});
