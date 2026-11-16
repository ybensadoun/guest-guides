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
    const f = join(site, 'content/transport.json');
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}

test('the host never saw the taxis: the nearest one found, alone, with no words of the host\'s, and its card', () => {
  const T = generate({ _taxisFound: FOUND });
  assert.deepEqual(T.taxis.map(t => t.name.en), ['Taxi Nearest']);
  assert.equal(T.taxis[0].phone, '900 00 00 01'); assert.deepEqual(T.taxis[0].what, { en: '', de: '' }); assert.deepEqual(T.taxis[0].sub, { en: 'Testville', de: 'Testville' });
  assert.equal(T.taxis[0].src.from, 'overture'); assert.equal(T.taxis[0].src.id, 'r-a');
  assert.equal(T.tile.name.en, 'Taxi'); assert.deepEqual(T.tile.sub, T.taxis[0].name);
});

test('two approved: exactly those, after the typed one, never its number again', () => {
  const T = generate({ taxi: 'Taxi Mine +34 900 000 003', taxis: [FOUND[1], FOUND[2]], _taxisFound: FOUND });
  assert.deepEqual(T.taxis.map(t => t.name.en), ['Taxi Mine', 'Taxi Second']);
  assert.equal(T.taxis[0].what.en, 'The taxi we use and trust.'); assert.ok(!T.taxis[0].src);
  assert.deepEqual(T.tile.sub, T.taxis[0].name);
});

test('an empty list: the host took them all out, none written', () => {
  const T = generate({ taxis: [], _taxisFound: FOUND });
  assert.deepEqual(T ? T.taxis : [], []);
  assert.ok(!T || T.tile === null);
});
