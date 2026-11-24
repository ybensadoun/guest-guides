// The generator (engine/scripts/generate-site.py) writes the taxis of our open directory (Getting around,
// engine/src/modules/transport/README.md, "The taxis found"): the host's approved ones (answers.taxis), or, when the host
// never saw them, the nearest of what the worker found (answers._taxisFound), alone; after the typed one, never the same
// number twice. Made-up answers and made-up numbers, a town centre's position; the site folder is removed after.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VENDRELL = ['41.2186', '1.535'];
const near = (id, name, phone, dLat) => ({ id, name, phone, town: 'Testville', lat: 41.2186 + dLat, lng: 1.535, km: 1, web: '' });
const FOUND = [near('r-a', 'TAXI NEAREST', '+34 900 000 001', 0.01), near('r-b', 'Taxi Second', '+34 900 000 002', 0.02), near('r-c', 'Taxi Third', '+34 900 000 003', 0.03)];
let n = 0;
function generate(answers) {
  const src = mkdtempSync(join(tmpdir(), 'gen-tx-')), slug = `zz-test-taxis-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'El Vendrell', languages: ['en', 'de'], ...answers } }));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', VENDRELL[0], '--lng', VENDRELL[1]], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const f = join(site, 'content/transport.json'), T = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
    if (T) Object.defineProperty(T, 'site', { value: { sections: JSON.parse(readFileSync(join(site, 'content/sections.json'), 'utf8')).sections.map(x => x.id), modules: JSON.parse(readFileSync(join(site, 'site.json'), 'utf8')).modules } });   // not a key of the file
    return T;
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}

test('the host never saw the taxis: the nearest one found, alone, with no words of the host\'s, and its card', () => {
  const T = generate({ _taxisFound: FOUND });
  assert.deepEqual(T.taxis.map(t => t.name.en), ['Taxi Nearest']);
  assert.equal(T.taxis[0].phone, '900 00 00 01'); assert.deepEqual(T.taxis[0].what, { en: '', de: '' }); assert.deepEqual(T.taxis[0].sub, { en: 'Testville', de: 'Testville' });
  assert.equal(T.taxis[0].src.from, 'overture'); assert.equal(T.taxis[0].src.id, 'r-a');
  assert.deepEqual(T.tile.name, { en: 'Getting around', de: 'Unterwegs' }); assert.match(T.tile.sub.en, /^(Train|Bus|Metro|Tram) \d+ min (on foot|by car)( · (Train|Bus|Metro|Tram))* · Taxi$/); assert.match(T.tile.sub.de, /^\S+ \d+ Min\. .* · Taxi$/);   // whichever is nearest: the stops come from our storage when it answers   // the card says what the page has (24 Nov 2026), not "Taxi" and the taxi's name
});

test('two approved: exactly those, after the typed one, never its number again', () => {
  const T = generate({ taxi: 'Taxi Mine +34 900 000 003', taxis: [FOUND[1], FOUND[2]], _taxisFound: FOUND });
  assert.deepEqual(T.taxis.map(t => t.name.en), ['Taxi Mine', 'Taxi Second']);
  assert.equal(T.taxis[0].what.en, 'The taxi we use and trust.'); assert.ok(!T.taxis[0].src);
  assert.match(T.tile.sub.en, / · Taxi$/);
});

test('an empty list: the host took them all out, none written', () => {
  const T = generate({ taxis: [], _taxisFound: FOUND });
  assert.deepEqual(T ? T.taxis : [], []);
  assert.ok(!T || T.tile === null);
});

// Ride apps (engine/scripts/apps-of.mjs): the host's approved ids (answers.apps) when present, even empty; else the ones
// found near the house (answers._appsFound), by themselves; in apps.json's order.
const FOUND_APPS = [{ id: 'cabify', name: 'Cabify', link: 'https://cabify.com/', src: { from: 'search', at: '2026-11-15' } }, { id: 'uber', name: 'Uber', link: 'https://www.uber.com/', src: { from: 'search', at: '2026-11-15' } }];
test('ride apps: found ones by themselves, the host\'s choice when there is one, none when they took them all out', () => {
  const T1 = generate({ _appsFound: FOUND_APPS });
  assert.deepEqual(T1.apps.map(a => a.id), ['uber', 'cabify']); assert.deepEqual(T1.apps[0], { id: 'uber', name: 'Uber', link: 'https://www.uber.com/', src: { from: 'search', at: '2026-11-15' } });
  assert.deepEqual(generate({ _appsFound: FOUND_APPS, apps: ['bolt'] }).apps.map(a => a.id), ['bolt']);
  assert.ok(!('apps' in generate({ _appsFound: FOUND_APPS, apps: [] })));
});

// The taxi a host types as "name and number" (22 Nov 2026, engine/src/modules/transport/taxis.js txTyped): a number
// written with dots, dashes, brackets or a country code gave no taxi at all, silently, or a wrong number.
test('the typed taxi: numbers written with spaces, dots, dashes, brackets and a country code', () => {
  const one = taxi => { const T = generate({ taxi }); return T && T.taxis.map(t => [t.id, t.name.en, t.phone, t.what.en]); };
  assert.deepEqual(one('Taxi Mine 977 66 61 11'), [['taxi', 'Taxi Mine', '977 66 61 11', 'The taxi we use and trust.']]);   // well written: as before
  assert.deepEqual(one('+34 600-123-456'), [['taxi', 'Taxi', '600 12 34 56', 'The taxi we use and trust.']]);
  assert.deepEqual(one('938.94.13.29'), [['taxi', 'Taxi', '938 94 13 29', 'The taxi we use and trust.']]);
  assert.deepEqual(one('Radio Taxi (93) 225 0000'), [['taxi', 'Radio Taxi', '932 25 00 00', 'The taxi we use and trust.']]);
});
test('the typed taxi with no number that can be read is not written, and nothing else is lost', () => {
  const T = generate({ taxi: 'Taxi Pepe', _taxisFound: FOUND });
  assert.deepEqual(T.taxis.map(t => t.name.en), ['Taxi Nearest']);   // the found one, by itself; no "Taxi Pepe" guests cannot call
  assert.ok(T.stations.length > 0);
});

// The builder's tick "Quick calls" (answers.modules.quick) is only the taxi's card on Home (22 Nov 2026): unticked, it
// took all of Getting around away, the trains and the stops with it.
test('"Quick calls" unticked: Getting around stays, with its taxis, trains and stops; only the Home card goes', () => {
  const on = generate({ taxi: 'Taxi Mine 977 66 61 11', _taxisFound: FOUND }), off = generate({ taxi: 'Taxi Mine 977 66 61 11', _taxisFound: FOUND, modules: { quick: false } });
  assert.ok(on.stations.length > 0, 'El Vendrell has train stations');
  assert.equal(on.tile.name.en, 'Getting around'); assert.equal(off.tile, null);
  assert.deepEqual({ ...off, tile: on.tile }, { ...on });   // the same file, the card aside
  assert.ok(off.site.sections.includes('transport')); assert.equal(off.site.modules.transport, true);
  assert.deepEqual(off.site.sections, on.site.sections);
  const bare = generate({ modules: { quick: false } });   // no taxi at all: the stations alone keep the section
  assert.ok(bare && bare.stations.length > 0 && bare.taxis.length === 0 && bare.tile === null); assert.ok(bare.site.sections.includes('transport'));
});
