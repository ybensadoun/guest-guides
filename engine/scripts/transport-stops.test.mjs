// Public transport stops near a house (engine/src/modules/transport/stops.js, README.md beside it, "Public transport
// found"). Made-up stops on a line of latitude near a made-up point. Pure.   node --test engine/scripts/transport-stops.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SP, spCells, spRank, spWalk, spNear, spFind, spPick, spEntry, spId } from '../src/modules/transport/stops.js';
import { tpRoadKm, tpLine } from '../src/modules/transport/pick.js';

const at = km => ({ lat: 40 + km / 1.3 * 0.008993, lng: 0.5 });   // about km by road along the line
const H = at(0);
const L = (t, n, f = 2, c) => ({ ...(t ? { t } : {}), n, ...(c ? { c, ink: false } : {}), f });
const stop = (id, n, k, km, lines) => ({ id: 'f:' + id, n, k, ...at(km), s: 0, lines });

test('the small rules', () => {
  assert.deepEqual(spCells({ lat: 41.2206, lng: 1.5343 }), ['163_5', '163_6', '163_7', '164_5', '164_6', '164_7', '165_5', '165_6', '165_7']);
  assert.deepEqual(spCells({ lat: 40.4, lng: -3.7 }).slice(4, 5), ['161_-15']);
  assert.deepEqual(['metro', 'rail', 'tram', 'bus', 'x'].map(spRank), [0, 0, 1, 2, 3]);
  assert.deepEqual([0.01, 0.5, 1, 2.1].map(spWalk), [1, 6, 12, 25]);
  assert.equal(tpRoadKm(0.1, 2), 0.13); assert.equal(tpRoadKm(0.1), 1, 'the whole km as before');
  assert.equal(spId({ id: 'cat-interurba:PF08' }), 'spcat-interurba-PF08');
});

test('spNear: nearest first whatever the kind, within 3 km by road; the other side of the street left out; nothing the guide has', () => {
  const S = [stop('a', 'Bus A', 'bus', 0.3, [L('e1', 'X - Y')]), stop('b', 'Bus A', 'bus', 0.35, [L('e1', 'X - Y')]), stop('c', 'Bus C', 'bus', 0.4, [L('e1', 'X - Y'), L('e2', 'Z')]),
    stop('m', 'Metro M', 'metro', 0.9, [L('L1', 'Line 1')]), stop('far', 'Far', 'bus', 3.2, [L('', 'F')])];
  assert.deepEqual(spNear(H, S).map(x => x.st.id), ['f:a', 'f:c', 'f:m']);
  const n = spNear(H, S)[0]; assert.equal(n.walk, spWalk(n.km)); assert.ok(n.km > 0.25 && n.km < 0.35);
  assert.deepEqual(spNear(H, S, { have: ['spf-a'] }).map(x => x.st.id), ['f:b', 'f:c', 'f:m']);
  assert.deepEqual(spNear(H, S, { max: 1 }).length, 1); assert.deepEqual(spNear({ lat: 0, lng: 0 }, S), []);
});

test('spFind: every word, accents aside; metro, then tram, then bus; a name that starts with it first; one the guide has marked', () => {
  const S = [stop('b1', 'Plaça de Catalunya (bus)', 'bus', 0.2, [L('V15', 'x')]), stop('t1', 'Catalunya tram', 'tram', 2, [L('T1', 'y')]),
    stop('m1', 'Catalunya', 'metro', 5, [L('L1', 'z')]), stop('b2', 'Catalunya Bus', 'bus', 1, [L('', 'w')]), stop('o', 'Other', 'bus', 0.1, [L('', 'v')])];
  assert.deepEqual(spFind('CATALUÑA', H, S).map(x => x.st.id), []);
  assert.deepEqual(spFind('catalunya', H, S).map(x => x.st.id), ['f:m1', 'f:t1', 'f:b2', 'f:b1']);
  assert.deepEqual(spFind('placa cat', H, S).map(x => x.st.id), ['f:b1']);
  const r = spFind('catalunya', H, S, { have: ['spf-t1'] }); assert.equal(r[1].has, true); assert.equal(r[0].has, false);
  assert.deepEqual(spFind('c', H, S), []);
});

test('spPick: metro and rail, tram, then bus, as the design says', () => {
  const m1 = stop('m1', 'M1', 'metro', 0.5, [L('L1', 'a')]), m2 = stop('m2', 'M2', 'rail', 1.0, [L('R2', 'b')]), m3 = stop('m3', 'M3', 'metro', 1.1, [L('L1', 'a')]);
  const t1 = stop('t1', 'T1', 'tram', 0.8, [L('T1', 't')]), b1 = stop('b1', 'B1', 'bus', 0.2, [L('V1', 'v')]), b2 = stop('b2', 'B2', 'bus', 0.3, [L('V1', 'v')]), b3 = stop('b3', 'B3', 'bus', 0.5, [L('V2', 'w')]);
  assert.deepEqual(spPick(H, [m1, m2, m3, t1, b1, b2, b3]).map(x => x.st.id), ['f:m1', 'f:m2', 'f:t1', 'f:b1']);
  assert.deepEqual(spPick(H, [b1, b2, b3]).map(x => x.st.id), ['f:b1', 'f:b3'], 'buses only: 2, the second adding a line');
  assert.deepEqual(spPick(H, [stop('far', 'Far', 'bus', 2.5, [L('', 'x')]), stop('far2', 'Far 2', 'bus', 2.8, [L('', 'y')])]).map(x => x.st.id), ['f:far'], 'nothing near: the nearest bus within 3 km, alone');
  assert.deepEqual(spPick(H, [stop('x', 'X', 'bus', 3.5, [L('', 'x')])]), []);
});

test('spEntry: the stop as transport.json holds a station, on foot or by car, credited to its source', () => {
  const src = { id: 'cat-interurba', name: 'Generalitat de Catalunya', credit: 'Generalitat de Catalunya. Departament', link: 'https://mou-te.gencat.cat/', updated: '2026-10-30' };
  const st = stop('PF1', 'El Vendrell (estació)', 'bus', 0.3, [L('e1', 'El Vendrell - Tarragona', 2), L('', 'El Vendrell - Vilanova', 4), L('L1', 'Urbà', 1, '#E2001A')]);
  const e = spEntry(st, H, src, ['en', 'de']);
  assert.equal(e.id, 'spf-PF1'); assert.equal(e.mode, 'bus'); assert.deepEqual(e.name, { en: 'El Vendrell (estació)', de: 'El Vendrell (estació)' });
  assert.ok(e.walk >= 3 && e.walk <= 5 && !('min' in e), JSON.stringify(e)); assert.deepEqual(e.what, { en: '', de: '' });
  assert.equal(e.link, 'https://mou-te.gencat.cat/'); assert.equal(e.linkKey, 'timetable');
  assert.deepEqual(e.badges, [{ t: 'e1' }, { t: 'L1', c: '#E2001A', ink: false }]);
  assert.equal(e.lines.length, 3); assert.deepEqual(e.src, { from: 'cat-interurba', by: 'Generalitat de Catalunya. Departament', at: '2026-10-30' });
  assert.ok(!('to' in e) && !('tag' in e));
  const far = spEntry(stop('x', 'Far', 'rail', 2.6, [L('R2', 'r')]), H, src, ['en']);
  assert.equal(far.mode, 'train'); assert.ok(!('walk' in far) && far.min > 0, JSON.stringify(far));
  assert.equal(SP.walkMax, 25);
});

test('stops-of.mjs: the generator\'s stops from a folder on disk (STOPS_DIR); no folder, none', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path'), { spawnSync } = await import('node:child_process');
  const dir = mkdtempSync(join(tmpdir(), 'stops-')), h = { lat: 41.2206, lng: 1.5343 };
  const st = { id: 'fk:b1', n: 'Carrer Gran', k: 'bus', lat: 41.2210, lng: 1.5345, s: 0, lines: [{ t: 'e1', n: 'A - B', f: 2 }] };
  writeFileSync(join(dir, 'index.json'), JSON.stringify({ cell: 0.25, sources: [{ id: 'fk', name: 'Fake', credit: 'Fake Transit', link: '', updated: '2026-10-30' }], cells: { '164_6': 1 } }));
  writeFileSync(join(dir, '164_6.json'), JSON.stringify({ stops: [st] }));
  const exe = (await import('node:url')).fileURLToPath(new URL('./stops-of.mjs', import.meta.url));
  const run = env => JSON.parse(spawnSync(process.execPath, [exe], { input: JSON.stringify({ ...h, langs: ['en'] }), encoding: 'utf8', env: { ...process.env, STOPS_BASE: '', ...env } }).stdout).stops;
  const got = run({ STOPS_DIR: dir });
  assert.deepEqual(got.map(s => [s.id, s.mode, s.link, s.src.by]), [['spfk-b1', 'bus', '', 'Fake Transit']]);
  assert.deepEqual(run({ STOPS_DIR: join(dir, 'none') }), []);
});
