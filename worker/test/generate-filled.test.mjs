// The generator (engine/scripts/generate-site.py) carries where a host place's facts came from (geocode.json's filled) onto
// the item, for the editor's source line. Runs the generator on made-up answers into a site folder of its own, removed after.
// Needs python3 with Pillow and NumPy, as the worker does.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('generator: a host place keeps filled as the worker gave it; a website the host typed is not credited', () => {
  const src = mkdtempSync(join(tmpdir(), 'gen-filled-')), slug = 'zz-test-filled-' + process.pid, site = resolve(ROOT, 'sites', slug);
  const F = { at: '2026-11-10', from: { kind: 'site', phone: 'overture', url: 'search', schedule: 'site', book: 'site' }, page: 'https://locanda.example/horari' };
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: ['en', 'es'],
    favEat: [{ p: 'la locanda', c: 'The pizzas' }, { p: 'https://bar-x.example/' }, { p: 'can pep' }], favDo: [{ p: 'castell' }] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify({
    'la locanda': { name: 'La Locanda', lat: 41.21, lng: 1.51, km: 2, town: 'Calafell', gid: 'Gloc4nda0000aa', kind: 'pizza', phone: '977 66 16 25', url: 'https://locanda.example/', schedule: [{ days: ['tue'], open: '13:00', close: '16:00' }], book: true, filled: F },
    'https://bar-x.example/': { name: 'Bar X', lat: 41.215, lng: 1.515, km: 2, gid: 'Gbarx00000000a', url: 'https://other.example/', phone: '977 00 00 00', filled: { at: '2026-11-09', from: { url: 'search', phone: 'overture' } } },
    'can pep': { name: 'Can Pep', lat: 41.22, lng: 1.52, km: 3, gid: 'Gcanp3p0000aa', pos: { from: 'google', at: '2026-11-10' } },
    castell: { name: 'Castell', lat: 41.23, lng: 1.53, km: 4, gid: 'Gcast3ll000aa', kind: 'castle', filled: { at: '2026-11-09', from: { kind: 'claude' } } } }));
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    const eat = JSON.parse(readFileSync(join(site, 'content/restaurants.json'), 'utf8')).items, todo = JSON.parse(readFileSync(join(site, 'content/todo.json'), 'utf8')).items;
    const by = (a, n) => a.find(x => x.name.en === n);
    assert.deepEqual(by(eat, 'La Locanda').filled, F);
    assert.equal(by(eat, 'La Locanda').url, 'https://locanda.example/'); assert.deepEqual(by(eat, 'La Locanda').flags, ['book']);
    // The host typed the website as the place: it is theirs, so only the phone is credited.
    assert.equal(by(eat, 'Bar X').url, 'https://bar-x.example/'); assert.deepEqual(by(eat, 'Bar X').filled, { at: '2026-11-09', from: { phone: 'overture' } });
    assert.equal(by(eat, 'Can Pep').filled, undefined);   // nothing filled: no property
    assert.deepEqual(by(todo, 'Castell').filled, { at: '2026-11-09', from: { kind: 'claude' } });
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});
