// A built guide's row says where its colours came from (engine/src/modules/look/README.md, rule 10): theme.worldFrom,
// 'cover' or 'logo', only when the world has colours of its own made from that picture.   node --test engine/scripts/guide-to-row.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function row(site) {
  const dir = mkdtempSync(join(tmpdir(), 'row-'));
  try {
    writeFileSync(join(dir, 'site.json'), JSON.stringify({ name: 'Test house', languages: ['en'], ...site }));
    const r = spawnSync('node', ['engine/scripts/guide-to-row.mjs', dir], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const OWN = { base: 'stone', deep: '#2D5476' };

test('row: a world made from the cover picture says so, and the generator\'s own notes stay out of the row', () => {
  const r = row({ theme: { world: OWN }, onboarding: { world: 'cover', palette: {} } });
  assert.deepEqual(r.theme.world, OWN);
  assert.equal(r.theme.worldFrom, 'cover');
  assert.equal('onboarding' in r.content.site, false);
});
test('row: the same from the logo', () => {
  assert.equal(row({ theme: { world: OWN }, onboarding: { world: 'logo' } }).theme.worldFrom, 'logo');
});
test('row: a ready-made world, a picture that gave a world as it is, and a guide with no world name no picture', () => {
  assert.equal('worldFrom' in row({ theme: { world: 'sea' }, onboarding: { world: 'sea' } }).theme, false);
  assert.equal('worldFrom' in row({ theme: { world: 'stone' }, onboarding: { world: 'cover' } }).theme, false);   // a picture with no colour of its own, or one that could not be read
  assert.equal('worldFrom' in row({ theme: { world: OWN } }).theme, false);                                       // a site folder written by hand
  const none = row({ theme: {} }).theme;
  assert.equal('world' in none, false); assert.equal('worldFrom' in none, false);
});
