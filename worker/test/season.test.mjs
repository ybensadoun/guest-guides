// A place's season from its own website (worker/place-facts.mjs "site facts"): asked, cleaned, kept in place_facts
// (facts.season, its source 'site'), handed to a host's place (hostPlaces), to a researched place (checkResearch) and to the
// guide (the generator), only when the same read gave no hours. No network: Google, Overture, GeoNames and Claude are
// stand-ins, and fetch itself refuses.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { placeFacts, cleanSeason } from '../place-facts.mjs';
import { mergeFacts, FACTS } from '../place-store.mjs';
import { hostPlaces, filledOf } from '../host-places.mjs';
import { checkResearch } from '../research-check.mjs';
import { factsFound } from '../place-job.mjs';

process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
globalThis.fetch = async () => { throw new Error('no network in tests'); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const H = [{ days: ['tue', 'wed'], open: '10:00', close: '14:00' }];
const d1 = new Date('2026-11-10T09:00:00Z');
const fresh = new Date(Date.now() - 86400000).toISOString();
const noGaz = async () => ({ fetched: null, pins: {} });

test('cleanSeason: real days of the year, both ends, two different days; a season may wrap the new year', () => {
  assert.deepEqual(cleanSeason({ from: '06-01', to: '09-30' }), { from: '06-01', to: '09-30' });
  assert.deepEqual(cleanSeason({ from: '11-01', to: '03-31', note: 'x' }), { from: '11-01', to: '03-31' });
  for (const bad of [null, 'June to September', {}, { from: '06-01' }, { from: '06-01', to: null }, { from: '6-1', to: '9-30' }, { from: '06-01', to: '06-01' }, { from: '02-30', to: '09-30' }, { from: '13-01', to: '09-30' }, { from: '06-31', to: '09-30' }])
    assert.equal(cleanSeason(bad), null, JSON.stringify(bad));
});

// The chain's two questions: the match (an Overture record with a website), then the site read, whose answer is chosen here.
const cands = [{ id: 'ov1', name: 'Chiringuito El Quijote', kind: 'beach_bar', metres: 6, lat: 41.19, lng: 1.6, phones: [], websites: [], socials: [] }];   // no website on record: the read is a web search, no address is opened
const chain = site => { const prompts = [];
  const ask = async (prompt, o) => { prompts.push([o.what, prompt]);
    return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "El Quijote", "kind": "beachbar"}' : JSON.stringify({ website: 'https://quijote.example/', about: true, ...site }); };
  return { ask, prompts }; };
const alive = f => f();

test('placeFacts: the site\'s season is asked with care, kept when the read gives no hours, dropped when it does', async () => {
  const { ask, prompts } = chain({ phone: null, hours: null, price: null, book: null, season: { from: '06-01', to: '09-30' } });
  const r = await alive(() => placeFacts({ name: 'el quijote', town: 'Calafell', list: 'eat' }, cands, ask, { meter: {} }));
  const read = prompts.find(p => p[0] === 'site facts');
  assert.ok(read, 'the site was read');
  assert.match(read[1], /"season"/); assert.match(read[1], /open from June to September/); assert.match(read[1], /never guess/i);
  assert.match(read[1], /"summer"/);   // a season said without dates or months is no season
  assert.deepEqual(r.season, { from: '06-01', to: '09-30' }); assert.equal(r.hours, null);
  // Hours from the same read: the season stays on them (their from/to), never as the place's own.
  const h = chain({ hours: [{ days: ['mon', 'tue'], open: '10:00', close: '20:00', from: '06-01', to: '09-30' }], season: { from: '06-01', to: '09-30' } });
  const r2 = await alive(() => placeFacts({ name: 'el quijote', list: 'eat' }, cands, h.ask, { meter: {} }));
  assert.equal(r2.season, null); assert.equal(r2.hours[0].from, '06-01');
  // "Summer" without dates, or a season that is not one: nothing.
  for (const season of ['summer', { from: '06-01' }, { from: 'June', to: 'September' }]) {
    const x = chain({ hours: null, season });
    assert.equal((await alive(() => placeFacts({ name: 'el quijote', list: 'eat' }, cands, x.ask, { meter: {} }))).season, null);
  }
});

test('mergeFacts: the season is a fact of the site, kept until a new one replaces it', () => {
  assert.ok(FACTS.includes('season'));
  const look = { entry: null, venue: true, posFrom: null, page: 'https://quijote.example/temporada', season: { from: '06-01', to: '09-30' }, hours: null, usd: 0.01 };
  const r = mergeFacts(null, { name: 'el quijote', list: 'eat' }, look, { now: d1 });
  assert.deepEqual(r.facts.season, { from: '06-01', to: '09-30' });
  assert.deepEqual(r.sources.season, { from: 'site', at: '2026-11-10', page: 'https://quijote.example/temporada' });
  assert.equal(r.venue, true);
  // A later look that finds nothing keeps it.
  assert.deepEqual(mergeFacts(r, { name: 'el quijote', list: 'eat' }, { ...look, season: null }, { now: d1 }).facts.season, { from: '06-01', to: '09-30' });
  assert.deepEqual(filledOf(['season'], r.sources, 'eat'), { at: '2026-11-10', from: { season: 'site' }, page: 'https://quijote.example/temporada' });
  assert.ok(factsFound({ season: { from: '06-01', to: '09-30' }, pos: { from: 'google', at: '2026-11-10' } }));
});

// Google locates by words; the table holds the rows.
const house = { lat: 41.2, lng: 1.5 };
const locate = { byId: async () => null, byWords: async w => ({ quijote: { gid: 'Gquij0te0000a', lat: 41.19, lng: 1.6 }, brisa: { gid: 'Gbr1sa000000a', lat: 41.18, lng: 1.61 } })[w] || null };
const store = rows => ({ get: async gids => Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])), save: async () => { throw new Error('not saved'); } });

test('hostPlaces: a kept season goes to the entry with its source; kept hours win over it', async () => {
  const rows = {
    Gquij0te0000a: { gid: 'Gquij0te0000a', tried_at: fresh, facts: { lat: 41.1901, lng: 1.6001, season: { from: '06-01', to: '09-30' } },
      sources: { season: { from: 'site', at: '2026-11-09', page: 'https://quijote.example/' }, kind_eat: { from: 'claude', at: '2026-11-09', none: true }, lat: { from: 'overture', at: '2026-11-09' } } },
    Gbr1sa000000a: { gid: 'Gbr1sa000000a', tried_at: fresh, facts: { hours: H, season: { from: '04-01', to: '10-31' } },
      sources: { hours: { from: 'site', at: '2026-11-09' }, season: { from: 'site', at: '2026-11-01' }, kind_eat: { from: 'claude', at: '2026-11-09', none: true } } } };
  const geo = await hostPlaces({ rows: [{ p: 'quijote', list: 'eat' }, { p: 'brisa', list: 'eat' }], house }, { store: store(rows), locate, near: () => { throw new Error('not asked'); }, gaz: () => { throw new Error('not asked'); } });
  assert.deepEqual(geo.quijote.season, { from: '06-01', to: '09-30' }); assert.equal(geo.quijote.schedule, undefined);
  assert.deepEqual(geo.quijote.filled, { at: '2026-11-09', from: { season: 'site' }, page: 'https://quijote.example/' });
  assert.deepEqual(geo.brisa.schedule, H); assert.equal(geo.brisa.season, undefined); assert.deepEqual(geo.brisa.filled.from, { schedule: 'site' });
});

test('checkResearch: a researched place with no hours takes its site\'s season; one with hours does not', async () => {
  const gid = n => `G${n}aaaaaaaaaaaa`;
  const rows = { [gid(1)]: { gid: gid(1), tried_at: fresh, facts: { season: { from: '06-15', to: '09-15' } }, sources: { season: { from: 'site', at: '2026-11-08', page: 'https://cove.example/' }, kind_todo: { from: 'claude', at: '2026-11-08', none: true } } },
    [gid(2)]: { gid: gid(2), tried_at: fresh, facts: { season: { from: '06-15', to: '09-15' } }, sources: { season: { from: 'site', at: '2026-11-08' }, kind_todo: { from: 'claude', at: '2026-11-08', none: true } } } };
  const item = (id, more = {}) => ({ id, name: { en: id }, name_local: id, lat: 41.22, lng: 1.52, km_from_house: 1, description: { en: 'Worth it.' }, tags: [], flags: [], ...more });
  const loc = { cove: { gid: gid(1), lat: 41.22, lng: 1.52 }, museum: { gid: gid(2), lat: 41.23, lng: 1.53 } };
  const out = await checkResearch([item('cove'), item('museum', { schedule: [{ days: ['sun'], open: '11:00', close: '13:00' }] })], 'todo',
    { house, pause: 0, today: '2026-11-10', log: () => {}, locate: async it => loc[it.id] || null, store: store(rows), near: () => { throw new Error('not asked'); }, gaz: () => { throw new Error('not asked'); } });
  assert.deepEqual(out[0].season, { from: '06-15', to: '09-15' });
  assert.deepEqual(out[0].filled, { at: '2026-11-08', from: { season: 'site' }, page: 'https://cove.example/' });
  assert.equal(out[1].season, undefined); assert.equal(out[1].filled, undefined);
});

test('generator: the entry\'s season goes to the item, never beside hours, and its source with it', () => {
  const src = mkdtempSync(join(tmpdir(), 'gen-season-')), slug = 'zz-test-season-' + process.pid, site = resolve(ROOT, 'sites', slug);
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: ['en', 'es'], favEat: [{ p: 'quijote' }, { p: 'brisa' }, { p: 'odd' }] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify({
    quijote: { name: 'El Quijote', lat: 41.19, lng: 1.6, km: 4, gid: 'Gquij0te0000a', season: { from: '06-01', to: '09-30' }, filled: { at: '2026-11-09', from: { season: 'site' }, page: 'https://quijote.example/' } },
    brisa: { name: 'La Brisa', lat: 41.18, lng: 1.61, km: 4, gid: 'Gbr1sa000000a', schedule: H, season: { from: '04-01', to: '10-31' }, filled: { at: '2026-11-09', from: { schedule: 'site', season: 'site' } } },
    odd: { name: 'Odd', lat: 41.17, lng: 1.62, km: 5, gid: 'God0000000000a', season: { from: 'June', to: '09-30' } } }));
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    const eat = JSON.parse(readFileSync(join(site, 'content/restaurants.json'), 'utf8')), by = n => eat.items.find(x => x.name.en === n);
    assert.match(eat._doc, /season/);
    assert.deepEqual(by('El Quijote').season, { from: '06-01', to: '09-30' }); assert.deepEqual(by('El Quijote').filled.from, { season: 'site' });
    assert.equal(by('La Brisa').season, undefined); assert.deepEqual(by('La Brisa').filled.from, { schedule: 'site' });   // hours: no season beside them
    assert.equal(by('Odd').season, undefined);
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});

test('check-content: a season must have both ends as MM-DD', () => {
  const slug = 'zz-test-season-chk-' + process.pid, site = resolve(ROOT, 'sites', slug), src = mkdtempSync(join(tmpdir(), 'gen-season-'));
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Calafell', languages: ['en', 'es'], favEat: [{ p: 'quijote' }] } }));
  writeFileSync(join(src, 'geocode.json'), JSON.stringify({ quijote: { name: 'El Quijote', lat: 41.19, lng: 1.6, km: 4, gid: 'Gquij0te0000a' } }));
  try {
    assert.equal(spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 }).status, 0);
    const f = join(site, 'content/restaurants.json'), eat = JSON.parse(readFileSync(f, 'utf8'));
    const run = season => { eat.items[0].season = season; writeFileSync(f, JSON.stringify(eat)); return spawnSync('node', ['engine/scripts/check-content.js', slug], { cwd: ROOT, encoding: 'utf8', timeout: 60000 }); };
    // A test site made with no Claude has other complaints (untranslated words): only the season's are looked at here.
    assert.doesNotMatch(run({ from: '11-01', to: '03-31' }).stderr, /season must be/);   // over the new year
    for (const bad of [{ from: '06-01' }, { from: '6-1', to: '9-30' }, { from: '06-01', to: '06-01' }, 'summer']) {
      const r = run(bad); assert.equal(r.status, 1, JSON.stringify(bad)); assert.match(r.stderr, /"[^"]+" season must be/);
    }
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});
