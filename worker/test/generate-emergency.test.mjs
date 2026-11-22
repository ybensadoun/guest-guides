// The generator (engine/scripts/generate-site.py) never leaves Emergencies empty or "soon"
// (engine/src/modules/contacts/README.md, rule 10): with no researched contacts, or a researched file with no contact in
// it, the guide gets the module's own minimum (engine/src/modules/contacts/minimum.json: 112, and the Health group for the
// host), in the guide's languages, and the section is live; researched contacts are copied as they are; a host who
// switched the page off gets none. Made-up answers, a town centre's position; the site folder is removed after.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MIN = JSON.parse(readFileSync(join(ROOT, 'engine/src/modules/contacts/minimum.json'), 'utf8'));
let n = 0;
function generate(answers, research) {
  const src = mkdtempSync(join(tmpdir(), 'gen-em-')), res = mkdtempSync(join(tmpdir(), 'gen-em-res-')), slug = `zz-test-emergency-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'El Vendrell', languages: ['en', 'de'], ...answers } }));
    for (const [f, d] of Object.entries(research || {})) writeFileSync(join(res, f), JSON.stringify(d));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2186', '--lng', '1.535', '--research', res], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const read = f => (existsSync(join(site, f)) ? JSON.parse(readFileSync(join(site, f), 'utf8')) : null);
    return { E: read('content/emergency.json'), sec: read('content/sections.json').sections.find(s => s.id === 'emergency'), site: read('site.json') };
  } finally { for (const d of [site, src, res]) rmSync(d, { recursive: true, force: true }); }
}

test('no researched contacts: 112 by itself, in the guide\'s languages, the page live', () => {
  const { E, sec, site } = generate({});
  assert.deepEqual(E.groups.map(g => [g.id, g.items.length]), [['urgent', 1], ['health', 0]]);
  const it = E.groups[0].items[0], m = MIN.groups[0].items[0];
  assert.equal(it.phone, '112'); assert.equal(it.always, true);
  assert.deepEqual(it.name, { en: m.name.en, de: m.name.de }); assert.deepEqual(it.what, { en: m.what.en, de: m.what.de });
  assert.ok(E._research, 'a later research may replace it');
  assert.equal(sec.status, 'live'); assert.equal(sec.kind, 'contacts'); assert.equal(site.modules.emergency, true);
});

test('a researched file with no contact in it is the same as none', () => {
  const { E, sec } = generate({}, { 'emergency.json': { groups: [] } });
  assert.equal(E.groups[0].items[0].phone, '112'); assert.equal(sec.status, 'live');
});

test('researched contacts are copied as they are, nothing added', () => {
  const found = { groups: [{ id: 'health', items: [{ id: 'ph', name: { en: 'Pharmacy (made up)' }, what: { en: 'A made-up pharmacy.' }, phone: '900000001' }] }] };
  const { E, sec } = generate({}, { 'emergency.json': found });
  assert.deepEqual(E.groups.map(g => [g.id, g.items.map(i => i.id)]), [['health', ['ph']]]);
  assert.equal(sec.status, 'live');
});

test('the minimum holds one number, 112, and never a host\'s', () => {
  const phones = MIN.groups.flatMap(g => g.items).map(i => i.phone);
  assert.deepEqual(phones, ['112']);
  for (const it of MIN.groups.flatMap(g => g.items)) for (const k of ['name', 'what']) assert.deepEqual(Object.keys(it[k]).sort(), ['ca', 'de', 'en', 'es', 'fr', 'nl']);
});

test('the host switched Emergencies off: no page, no file', () => {
  const { E, sec, site } = generate({ modules: { emergency: false } });
  assert.equal(E, null); assert.equal(sec, undefined); assert.equal(site.modules.emergency, false);
});
