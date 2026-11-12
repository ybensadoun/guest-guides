// The monthly check with our own sources (worker/check-guides.mjs): what a website's answer means, what the directory says,
// the note on a place and the whole check of a made-up guide. No network: fetch refuses and names resolve to a public
// address unless a test says otherwise; no Google, no Claude.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { placesOf, siteOf, knock, lookSite, siteVerdict, suspect, directoryVerdict, lookOf, checkFiles, reportOf } from '../check-guides.mjs';
import { NET } from '../place-facts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const NO_NET = async () => { throw new Error('no network in tests'); };
globalThis.fetch = NO_NET;
const PUBLIC = async () => [{ address: '93.184.216.34', family: 4 }];
NET.lookup = PUBLIC;
const err = (code, name) => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(code || name), code ? { code } : {}, name ? { name } : {}) });
const now = new Date('2026-12-01T09:00:00Z');

test('placesOf and siteOf: the host\'s lists and the markets; a door for the directory; only a place\'s own website', () => {
  const F = { restaurants: { items: [{ id: 'a', url: 'https://bar.example/' }, { id: 'fb', url: 'https://www.facebook.com/LaLocanda' }] },
    todo: { items: [{ id: 'beach', icon: 'beach', url: 'https://platja.example/' }], unnamed: [{ id: 'nameless', url: 'https://x.example/' }] },
    markets: { markets: [{ id: 'm', url: 'ftp://mercat.example/' }] }, quick: { items: [{ id: 'tile' }] } };
  assert.deepEqual(placesOf(F).map(x => [x.file, x.it.id, x.door]), [['restaurants', 'a', true], ['restaurants', 'fb', true], ['todo', 'beach', false], ['markets', 'm', false]]);
  assert.deepEqual(placesOf(F).map(x => siteOf(x.it)), ['https://bar.example/', null, 'https://platja.example/', null]);
});

test('knock: any answer but 404 or 410 says the site is there; only a lost name, a refused door or 404/410 say gone', async () => {
  const at = status => async () => ({ status, url: 'https://bar.example/' });
  assert.equal((await knock('https://bar.example/', { open: at(200) })).state, 'up');
  assert.equal((await knock('https://bar.example/', { open: at(403) })).state, 'up');   // a bot wall
  assert.equal((await knock('https://bar.example/', { open: at(503) })).state, 'up');
  assert.deepEqual(await knock('https://bar.example/', { open: at(404) }), { state: 'gone', why: '404' });
  assert.equal((await knock('https://bar.example/', { open: at(410) })).state, 'gone');
  assert.deepEqual(await knock('https://bar.example/', { open: async () => { throw err('ECONNREFUSED'); } }), { state: 'gone', why: 'connection refused' });
  assert.deepEqual(await knock('https://bar.example/', { open: async () => { throw err(null, 'TimeoutError'); } }), { state: 'unknown', why: 'too slow' });
  assert.equal((await knock('https://bar.example/', { open: async () => { throw err('CERT_HAS_EXPIRED'); } })).state, 'unknown');
  // null from the guarded fetch: a name that no longer exists, or a private address or too many redirects (nothing said).
  try {
    NET.lookup = async () => { throw Object.assign(new Error('nx'), { code: 'ENOTFOUND' }); };
    assert.deepEqual(await knock('https://bar.example/', { open: async () => null }), { state: 'gone', why: 'its address no longer exists' });
    NET.lookup = async () => { throw Object.assign(new Error('try again'), { code: 'EAI_AGAIN' }); };
    assert.equal((await knock('https://bar.example/', { open: async () => null })).state, 'unknown');
    NET.lookup = async () => [{ address: '10.0.0.5', family: 4 }];
    assert.equal((await knock('https://bar.example/', { open: async () => null })).state, 'unknown');
  } finally { NET.lookup = PUBLIC; }
});

test('lookSite: a missing page with a living site is "up"; the root decides; through the real guarded fetch', async () => {
  const by = map => async u => ({ status: map[u], url: u });
  assert.equal((await lookSite('https://bar.example/carta', { open: by({ 'https://bar.example/carta': 404, 'https://bar.example/': 200 }) })).state, 'up');
  assert.deepEqual(await lookSite('https://bar.example/carta', { open: by({ 'https://bar.example/carta': 404, 'https://bar.example/': 410 }) }), { state: 'gone', why: '410 at the root' });
  assert.deepEqual(await lookSite('https://bar.example/', { open: by({ 'https://bar.example/': 404 }) }), { state: 'gone', why: '404' });
  // openPublic itself, with fetch answering: one request a hop, a redirect followed, a 403 is an answer.
  const seen = [];
  globalThis.fetch = async (u, init) => { seen.push([u, init.redirect]); return u === 'https://bar.example/' ? { status: 301, headers: { get: () => 'https://www.bar.example/' } } : { status: 403, headers: { get: () => null } }; };
  try { assert.deepEqual(await lookSite('https://bar.example/'), { state: 'up', why: '403' }); }
  finally { globalThis.fetch = NO_NET; }
  assert.deepEqual(seen, [['https://bar.example/', 'manual'], ['https://www.bar.example/', 'manual']]);
});

test('siteVerdict and suspect: gone only when both looks say so; many gone at once is our own side', () => {
  const up = { state: 'up', why: '200' }, gone = { state: 'gone', why: '404' }, unk = { state: 'unknown', why: 'too slow' };
  assert.equal(siteVerdict([gone, gone]).state, 'gone');
  assert.equal(siteVerdict([gone, up]).state, 'up');
  assert.equal(siteVerdict([gone]).state, 'unknown');
  assert.equal(siteVerdict([gone, unk]).state, 'unknown');
  assert.equal(siteVerdict([up]).state, 'up');
  const v = n => Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['u' + i, i < n ? gone : up]));
  assert.equal(suspect(v(3)), false); assert.equal(suspect(v(5)), true); assert.equal(suspect({ a: gone, b: gone, c: gone }), false);
});

test('directoryVerdict: the record we matched, else one of its name; closed or gone is a signal, never-listed says nothing', () => {
  const rec = (id, name, status = 'open') => ({ id, name, status, metres: 3 });
  const row = { overture_id: 'ov1' };
  assert.deepEqual(directoryVerdict({ row, cands: [rec('ov1', 'Bar Pepe')], looked: false }), { state: null, why: 'not read' });
  assert.equal(directoryVerdict({ row, cands: [rec('ov1', 'Bar Pepe')], looked: true }).state, false);
  assert.deepEqual(directoryVerdict({ row, cands: [rec('ov1', 'Bar Pepe', 'permanently_closed')], looked: true }), { state: true, why: 'marked permanently closed (its record "Bar Pepe")' });
  assert.equal(directoryVerdict({ row, cands: [rec('ov1', 'Bar Pepe', 'temporarily_closed')], looked: true }).state, false);   // the season
  assert.equal(directoryVerdict({ row, cands: [rec('ov7', 'Bar Pepe')], looked: true, names: ['Bar Pepe'] }).state, false);  // a new id, the same name
  assert.deepEqual(directoryVerdict({ row, cands: [rec('ov8', 'Farmàcia Puig')], looked: true, names: ['Bar Pepe'] }), { state: true, why: 'the record we matched is no longer near it' });
  assert.deepEqual(directoryVerdict({ row: null, cands: [], looked: true, names: ['Bar Pepe'] }), { state: null, why: 'never in the directory' });
  assert.equal(directoryVerdict({ row: null, cands: [rec('ov3', 'Bar Pepe', 'permanently_closed')], looked: true, names: ['Bar Pepe'] }).state, true);
});

test('lookOf: a note while a signal lasts, its date and the host\'s ok kept for the same reasons, a new reason starts again', () => {
  const T = '2026-12-01';
  assert.equal(lookOf(undefined, { site: false, directory: false }, T), null);
  assert.equal(lookOf(undefined, { site: null, directory: null }, T), null);
  assert.deepEqual(lookOf(undefined, { site: true, directory: false }, T), { at: T, why: ['site'] });
  const seen = { at: '2026-11-01', why: ['site'], ok: '2026-11-03' };
  assert.deepEqual(lookOf(seen, { site: true, directory: false }, T), seen);                        // same reason: kept as the host left it
  assert.deepEqual(lookOf(seen, { site: null, directory: null }, T), seen);                          // nothing known this run
  assert.deepEqual(lookOf(seen, { site: true, directory: true }, T), { at: T, why: ['site', 'directory'] });   // a new reason: for the host again
  assert.deepEqual(lookOf({ at: '2026-11-01', why: ['site', 'directory'], ok: '2026-11-03' }, { site: false, directory: true }, T), { at: '2026-11-01', why: ['directory'], ok: '2026-11-03' });
  assert.equal(lookOf(seen, { site: false, directory: false }, T), null);                           // the signal is gone: the note goes
});

// A made-up guide: what each signal does, and that nothing else of a place changes.
const guide = () => ({
  house: { lat: 41.2, lng: 1.5 },
  restaurants: { items: [
    { id: 'gone-site', name: { en: 'Can Tancat' }, gid: 'G1aaaaaaaaaaaa', lat: 41.21, lng: 1.51, url: 'https://cantancat.example/', schedule: [{ days: ['fri'], open: '13:00', close: '16:00' }], flags: ['check'] },
    { id: 'alive', name: { en: 'Bar Viu' }, gid: 'G2aaaaaaaaaaaa', lat: 41.22, lng: 1.52, url: 'https://barviu.example/', look: { at: '2026-11-01', why: ['site'] } },
    { id: 'slow', name: { en: 'Lent' }, lat: 41.23, lng: 1.53, url: 'https://lent.example/', look: { at: '2026-11-01', why: ['site'] } },
    { id: 'fb', name: { en: 'La Locanda' }, lat: 41.24, lng: 1.54, url: 'https://www.facebook.com/LaLocanda' },
  ] },
  todo: { items: [
    { id: 'museum', name: { en: 'Museu del Vi' }, gid: 'G3aaaaaaaaaaaa', lat: 41.3, lng: 1.6, icon: 'palette' },
    { id: 'beach', name: { en: 'Platja Llarga' }, gid: 'G4aaaaaaaaaaaa', lat: 41.1, lng: 1.4, icon: 'beach', url: 'https://platjallarga.example/' },
  ] },
  markets: { markets: [{ id: 'mercat', name: { en: 'Saturday market' }, lat: 41.2, lng: 1.5, url: 'https://mercat-dissabte.example/', schedule: [{ days: ['sat'], open: '08:00', close: '14:00' }] }] },
});
const sites = {
  'https://cantancat.example/': { state: 'gone', why: 'its address no longer exists' }, 'https://barviu.example/': { state: 'up', why: '200' },
  'https://lent.example/': { state: 'unknown', why: 'too slow' }, 'https://platjallarga.example/': { state: 'up', why: '403' },
  'https://mercat-dissabte.example/': { state: 'gone', why: '404 at the root' } };
const dir = (file, it) => it.id === 'museum' ? { state: true, why: 'the record we matched is no longer near it' } : { state: false, why: 'listed' };

test('checkFiles: a note for each signal, an old one taken off when the site answers again, kept when nothing is known; nothing else changes', () => {
  const F = guide(), before = JSON.parse(JSON.stringify(F));
  const out = checkFiles(F, { sites, dir, now });
  const by = id => out.find(r => r.it.id === id);
  assert.deepEqual(F.restaurants.items[0].look, { at: '2026-12-01', why: ['site'] }); assert.equal(by('gone-site').change, 'new');
  assert.equal(F.restaurants.items[1].look, undefined); assert.equal(by('alive').change, 'cleared');
  assert.deepEqual(F.restaurants.items[2].look, { at: '2026-11-01', why: ['site'] }); assert.equal(by('slow').change, null);   // too slow: nothing said
  assert.equal(F.restaurants.items[3].look, undefined);                                                                          // Facebook: not looked at
  assert.deepEqual(F.todo.items[0].look, { at: '2026-12-01', why: ['directory'] });
  assert.equal(F.todo.items[1].look, undefined);                                                                                 // a beach: no directory, its site answers
  assert.deepEqual(F.markets.markets[0].look, { at: '2026-12-01', why: ['site'] });                                              // a market: its own site only
  // Nothing but the note changes: not the hours, not the flags, no place removed, nothing added for guests.
  const strip = x => JSON.parse(JSON.stringify(x, (k, v) => k === 'look' ? undefined : v));
  assert.deepEqual(strip(F), strip(before));
  const [lines, humans] = reportOf(out);
  assert.equal(humans, 4);
  assert.ok(lines.includes('- for the host, new: Can Tancat (restaurants): its website no longer answers (its address no longer exists, twice)'));
  assert.ok(lines.includes('- for the host, new: Museu del Vi (todo): our open directory: the record we matched is no longer near it'));
  assert.ok(lines.includes('- note taken off, no signal left: Bar Viu (restaurants)'));
  assert.ok(!lines.some(l => /Google/.test(l)));
  // Our own network suspect: no website signal is believed, old notes stay, no new one.
  const G = guide(); checkFiles(G, { sites, dir, distrust: true, now });
  assert.equal(G.restaurants.items[0].look, undefined); assert.deepEqual(G.restaurants.items[1].look, { at: '2026-11-01', why: ['site'] });
  // The host looked: the note stays out of "for a human" while the reason is the same.
  const K = guide(); K.restaurants.items[0].look = { at: '2026-11-01', why: ['site'], ok: '2026-11-02' };
  const [l2, h2] = reportOf(checkFiles(K, { sites, dir, now }));
  assert.equal(h2, 3); assert.ok(l2.some(l => l.startsWith('- looked at by the host on 2026-11-02, still: Can Tancat')));
});

test('the content check accepts the note and refuses a wrong one; the generator documents it', () => {
  const slug = 'zz-test-look-chk-' + process.pid, site = resolve(ROOT, 'sites', slug), src = mkdtempSync(join(tmpdir(), 'gen-look-'));
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: ['en', 'es'], favEat: [{ p: 'pepe' }] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify({ pepe: { name: 'Bar Pepe', lat: 41.19, lng: 1.6, km: 4, gid: 'Gpepe00000000a' } }));
  try {
    assert.equal(spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 }).status, 0);
    const f = join(site, 'content/restaurants.json'), eat = JSON.parse(readFileSync(f, 'utf8'));
    assert.match(eat._doc, /look: \{at, why, ok\?\}/);
    const run = look => { eat.items[0].look = look; writeFileSync(f, JSON.stringify(eat)); return spawnSync('node', ['engine/scripts/check-content.js', slug], { cwd: ROOT, encoding: 'utf8', timeout: 60000 }); };
    // A test site made with no Claude has other complaints (untranslated words): only the note's are looked at here.
    for (const ok of [{ at: '2026-12-01', why: ['site'] }, { at: '2026-12-01', why: ['site', 'directory'], ok: '2026-12-03' }]) assert.doesNotMatch(run(ok).stderr, /look must be/, JSON.stringify(ok));
    for (const bad of [{ at: '2026-12-01', why: [] }, { at: '1 Dec', why: ['site'] }, { at: '2026-12-01', why: ['google'] }, { at: '2026-12-01', why: ['site', 'site'] }, { at: '2026-12-01', why: ['site'], ok: 'yes' }, 'site']) {
      const r = run(bad); assert.equal(r.status, 1, JSON.stringify(bad)); assert.match(r.stderr, /"pepe[^"]*" look must be|look must be/);
    }
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});

test('an option the scripts do not know stops them before anything is read or asked', () => {
  // No key and an address nothing answers on: even a broken guard could reach nothing.
  const env = { PATH: process.env.PATH, SUPABASE_SERVICE_KEY: '', SUPABASE_URL: 'http://127.0.0.1:9' };
  for (const script of ['worker/check-guides.mjs', 'worker/clean-google.mjs', 'worker/monthly.mjs']) {
    const r = spawnSync('node', [script, '--help'], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env });
    assert.equal(r.status, 2, script); assert.match(r.stderr, /Unknown option: --help/, script);
  }
  const r = spawnSync('node', ['worker/check-guides.mjs', '--slug', 'x', '--days', '0'], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env });
  assert.equal(r.status, 2); assert.match(r.stderr, /Unknown option: --days 0|Unknown option: --days/);
});
