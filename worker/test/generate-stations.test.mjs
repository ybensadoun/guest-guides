// The generator (engine/scripts/generate-site.py) gives a new guide its train stations by itself (Getting around,
// engine/src/modules/transport/README.md, "The stations found"): the module's rule through engine/scripts/stations-of.mjs,
// from onboarding-site/stations-es.json. Runs the generator on made-up answers into a site folder of its own, removed
// after; positions are town centres (El Vendrell's, and one in France), never a house's. Needs python3 with Pillow, as the
// worker does.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { stationsFor } from '../../engine/src/modules/transport/pick.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VENDRELL = ['41.2186', '1.535'], PARIS = ['48.8566', '2.3522'];
let n = 0;
function generate(answers, [lat, lng]) {
  const src = mkdtempSync(join(tmpdir(), 'gen-st-')), slug = `zz-test-stations-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'El Vendrell', languages: ['en', 'de', 'fr'], ...answers } }));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', lat, '--lng', lng], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const read = f => existsSync(join(site, f)) ? JSON.parse(readFileSync(join(site, f), 'utf8')) : null;
    return { transport: read('content/transport.json'), sections: read('content/sections.json').sections, site: read('site.json'), out: JSON.parse(r.stdout) };
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}

test('no taxi, a house in Spain: Getting around with its stations, as the module\'s rule picks them, and no card', () => {
  const g = generate({}, VENDRELL);
  const want = stationsFor({ lat: +VENDRELL[0], lng: +VENDRELL[1] }, JSON.parse(readFileSync(join(ROOT, 'onboarding-site/stations-es.json'), 'utf8')), ['en', 'de', 'fr']);
  assert.ok(want.length >= 1);
  assert.deepEqual(g.transport.stations.filter(s => s.src.from === 'renfe'), want);   // then the bus stops of our file (stops-of.mjs), after them
  assert.ok(g.transport.stations.slice(want.length).every(s => s.src.from !== 'renfe' && s.src.by), 'the stops come after the train stations');
  assert.deepEqual(g.transport.taxis, []);
  assert.equal(g.transport.tile, null);
  assert.equal(g.transport.stations[0].id, 'st72201');
  assert.ok(g.transport.stations.every(s => s.src && !s.gid && !s.pos));
  const sec = g.sections.find(s => s.id === 'transport');
  assert.ok(sec && sec.status === 'live' && sec.kind === 'transport', JSON.stringify(sec));
  assert.equal(g.site.modules.transport, true);
  assert.equal(g.out.stations, g.transport.stations.length);
});

test('a taxi: the taxi first and its card, as before, with the stations after it', () => {
  const g = generate({ taxi: 'Taxi Vendrell +34 600 000 000' }, VENDRELL);
  assert.equal(g.transport.taxis.length, 1);
  assert.ok(g.transport.tile && g.transport.tile.name.en === 'Taxi');
  assert.ok(g.transport.stations.length >= 1);
});

test('far from any station of the file: no Getting around without a taxi', () => {
  const g = generate({}, PARIS);
  assert.equal(g.transport, null);
  assert.ok(!g.sections.some(s => s.id === 'transport'));
  assert.equal(g.site.modules.transport, false);
});
