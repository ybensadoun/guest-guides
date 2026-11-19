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

// A place Google did not match has no town of its own (not the house's village) and its Google Maps button searches for the
// host's words alone. A row picked on Google with no name (psPick kept none of the search words) is read as gid:<id>: named
// from our directory when the worker found it there, else it waits in the file's "unnamed" list, never in items.
test('generator: an unmatched place has no town; a picked row with no name is named from our directory or waits', () => {
  const src = mkdtempSync(join(tmpdir(), 'gen-unnamed-')), slug = 'zz-test-unnamed-' + process.pid, site = resolve(ROOT, 'sites', slug);
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'La Bisbal del Penedès', languages: ['en', 'es'],
    favEat: [{ p: '', gid: 'Gsoc1etat000aa', c: 'Sunday lunch' }, { p: '', gid: 'Gnoname00000aa' }, { p: 'la locanda' }],
    favDo: [{ p: 'Barcelona' }, { p: '', gid: 'Gnoname11111aa', c: 'The view' }] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify({
    'gid:Gsoc1etat000aa': { name: 'La Societat', lat: 41.3, lng: 1.55, km: 18, town: 'La Múnia', gid: 'Gsoc1etat000aa', gmaps: 'https://www.google.com/maps/search/?api=1&query=La%20Societat&query_place_id=Gsoc1etat000aa' },
    'gid:Gnoname00000aa': { noname: true, lat: 41.31, lng: 1.56, km: 19, gid: 'Gnoname00000aa', pos: { from: 'google', at: '2026-11-11' }, gmaps: 'https://www.google.com/maps/search/?api=1&query=41.31%2C1.56&query_place_id=Gnoname00000aa' },
    'la locanda': { name: 'La Locanda', lat: 41.21, lng: 1.51, km: 2, gid: 'Gloc4nda0000aa' } }));
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    assert.match(r.stdout, /2 places have no name yet/);
    const eat = JSON.parse(readFileSync(join(site, 'content/restaurants.json'), 'utf8')), todo = JSON.parse(readFileSync(join(site, 'content/todo.json'), 'utf8'));
    const by = (a, n) => a.find(x => x.name && x.name.en === n);
    // Named from our directory: in the guide, with its own town.
    assert.equal(by(eat.items, 'La Societat').gid, 'Gsoc1etat000aa'); assert.equal(by(eat.items, 'La Societat').town, 'La Múnia');
    assert.equal(by(eat.items, 'La Locanda').town, 'La Bisbal del Penedès');   // located, no town of ours: the house's town, as before
    // No name anywhere: not in the guide, waiting with its id, pin and the host's comment.
    assert.deepEqual(eat.items.map(x => x.name.en), ['La Societat', 'La Locanda']);
    assert.equal(eat.unnamed.length, 1); const w = eat.unnamed[0];
    assert.equal(w.gid, 'Gnoname00000aa'); assert.equal(w.name, undefined); assert.equal(w.lat, 41.31); assert.equal(w.km_from_house, 19); assert.equal(w.id, 'place-gnoname00000aa');
    assert.ok(!/undefined|None/.test(w.gmaps));
    // Barcelona, not matched: no town, its button searches for "Barcelona" alone, no pin.
    const bcn = by(todo.items, 'Barcelona');
    assert.equal(bcn.town, ''); assert.equal(bcn.nomap, true); assert.equal(bcn.gmaps, 'https://www.google.com/maps/search/?api=1&query=Barcelona');
    assert.equal(todo.unnamed.length, 1); assert.equal(todo.unnamed[0].gid, 'Gnoname11111aa'); assert.equal(todo.unnamed[0].nomap, true);
    assert.equal(todo.unnamed[0].gmaps, 'https://www.google.com/maps/search/?api=1&query=41.2%2C1.5&query_place_id=Gnoname11111aa');
    assert.equal(todo.unnamed[0].description.en, 'The view');
    assert.ok(!todo.items.some(x => !x.name));
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});

// Rubbish's default texts (engine/scripts/garbage-defaults.json; engine/src/modules/garbage/README.md, rule 9): each in the
// six languages, and true for any house: no colour of a bin, no place that is another house's, du in German.
const SIX = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
test('rubbish defaults: every text is in the six languages, with no colour, no "Sie" and no em-dash', () => {
  const GD = JSON.parse(readFileSync(resolve(ROOT, 'engine/scripts/garbage-defaults.json'), 'utf8')), texts = [];
  for (const k of ['names', 'examples', 'examples_street']) for (const [id, o] of Object.entries(GD[k])) texts.push([`${k}.${id}`, o]);
  for (const k of ['steps_home', 'steps_containers']) GD[k].forEach((o, i) => texts.push([`${k}[${i}]`, o]));
  for (const k of ['missed_home', 'missed_containers']) texts.push([k, GD[k]]);
  for (const [where, o] of texts) {
    assert.deepEqual(Object.keys(o).sort(), [...SIX].sort(), where);
    for (const l of SIX) { assert.ok(String(o[l]).trim(), `${where}.${l}`); assert.ok(!o[l].includes('—'), `${where}.${l}`); }
    for (const l of SIX.filter(x => x !== 'en')) assert.notEqual(o[l], o.en, `${where}.${l} is the English text`);
    assert.ok(!/\bSie\b|\bIhre?[mnrs]?\b/.test(o.de), `${where}.de`);
  }
  for (const [id, o] of Object.entries(GD.names)) for (const l of SIX) assert.ok(!/[()]/.test(o[l]), `names.${id}.${l}`);
  assert.ok(!/next to the house|al costat de la casa|naast het huis|neben dem Haus|junto a la casa|à côté de la maison|village|pueblo|poble|Dorf|dorp/i.test(JSON.stringify({ ...GD, _doc: '' })));
});

// A house collected at the door: its texts in each of its languages, the same steps with or without a collection hour
// (the hour is said by the page's week, never by a step), and a kind with no day takes its street wording.
test('generator: rubbish at the door reads in every language of the guide, and fits how each kind is collected', () => {
  for (const time of ['', '07:00']) {
    const src = mkdtempSync(join(tmpdir(), 'gen-bins-')), slug = 'zz-test-bins-' + process.pid, site = resolve(ROOT, 'sites', slug);
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: SIX,
      rubbishMode: 'Collected at the house', rubbishPlan: { organic: ['mon', 'thu'], packaging: ['tue'] }, rubbishTime: time } }));
    writeFileSync(join(src, 'geocode.json'), '{}');
    try {
      const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
      assert.equal(r.status, 0, (r.stderr || '').slice(-400));
      const g = JSON.parse(readFileSync(join(site, 'content/garbage.json'), 'utf8')), all = JSON.stringify(g.steps);
      assert.equal(g.collectionTime, time);
      assert.equal(g.steps[1].en, 'Put each bin out the evening before its collection day.'); assert.ok(!/time shown|noTime/.test(all));
      for (const o of [...g.steps, g.missed, ...g.fractions.map(f => f.examples), ...g.fractions.map(f => f.name)])
        for (const l of ['ca', 'nl', 'de', 'fr', 'es']) assert.ok(o[l] && o[l] !== o.en, `${l}: ${o.en}`);
      const by = id => g.fractions.find(f => f.id === id);
      assert.ok(!/container|general waste/.test(by('organic').examples.en), 'organic, collected at the door, says nothing of a container');
      assert.equal(by('packaging').name.en, 'Packaging');
    } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
  }
});
// Street containers only: organic has no day, so it says where it goes when there is no container for it.
test('generator: with street containers only, organic says what to do without a container for it', () => {
  const src = mkdtempSync(join(tmpdir(), 'gen-cont-')), slug = 'zz-test-cont-' + process.pid, site = resolve(ROOT, 'sites', slug);
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: ['en', 'ca', 'nl'],
    rubbishMode: 'Shared containers in the street', rubbishSpots: [{ w: 'At the end of the lane', m: '', t: ['glass'] }] } }));
  writeFileSync(join(src, 'geocode.json'), '{}');
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    const g = JSON.parse(readFileSync(join(site, 'content/garbage.json'), 'utf8')), organic = g.fractions.find(f => f.id === 'organic');
    assert.match(organic.examples.en, /Where there is no container for it, it goes in general waste\.$/);
    assert.match(organic.examples.ca, /va al de rebuig\.$/); assert.match(organic.examples.nl, /restafval\.$/);
    assert.match(g.steps[1].ca, /^Porta les bosses tancades/); assert.match(g.missed.nl, /^Er is geen ophaaldag/);
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});
