// GeoNames in the places work: worker/geonames.py on a tiny file of our own (written into a temp cache with today's date,
// so nothing is downloaded), and what placeFacts, mergeFacts and hostPlaces make of its features. No network: Google,
// Overture and Claude are stand-ins, and GEONAMES_URL points nowhere.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gazetteer, placeFacts, featureFor, featureKind } from '../place-facts.mjs';
import { mergeFacts } from '../place-store.mjs';
import { hostPlaces } from '../host-places.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), SCRIPT = resolve(HERE, '../geonames.py');
const NOWHERE = 'http://127.0.0.1:9/';   // the discard port: a download that slipped through fails at once, offline
process.env.GEONAMES_URL = NOWHERE;
const today = new Date().toLocaleDateString('sv-SE');   // the local date, as Python's date.today()

// geonameid, name, asciiname, alternatenames, latitude, longitude, class, code, country, cc2, admin1-4, population, elevation, dem, timezone, modified
const line = (id, name, alts, lat, lng, cls, code, pop = 0) => [id, name, name.normalize('NFD').replace(/[̀-ͯ]/g, ''), alts, lat, lng, cls, code, 'ES', '', '56', 'T', '43161', '', pop, '', '10', 'Europe/Madrid', '2024-01-01'].join('\t');
const FIXTURE = [
  line('3110001', 'El Vendrell', 'Vendrell,El Vendrell', 41.21861, 1.535, 'P', 'PPLA3', 36000),
  line('3110002', 'el Vendrell', '', 41.21861, 1.535, 'A', 'ADM3', 36000),                         // its administrative area: left out
  line('3110003', 'Vendrell', '', 41.264, 1.5355, 'P', 'PPL', 40),                                   // the same name 5 km away: too far
  line('3110004', 'Urbanització Residencial Mar Blau del Vendrell', '', 41.21, 1.5355, 'P', 'PPLX'),   // four more words: not the place
  line('3110005', 'Estació del Vendrell', '', 41.212, 1.5355, 'S', 'RSTN'),
  line('3110006', 'Platja de Sant Salvador', 'Playa de San Salvador', 41.176, 1.561, 'T', 'BCH'),
  line('3110007', 'Museu Pau Casals', 'Museo Pau Casals,Pau Casals Museum', 41.1795, 1.5592, 'S', 'MUS'),
  line('3110008', 'Sant Vicenç de Calders', '', 41.1905, 1.516, 'P', 'PPL', 1200),
  line('3110010', 'Hotel El Vendrell', '', 41.2187, 1.5351, 'S', 'HTL'),                             // a hotel named after its town, nearer than the town's own point: left out
  line('3110009', 'San Salvador', 'Sant Salvador', 41.181, 1.555, 'P', 'PPL', 900),               // the village of the beach's name: never the beach
].join('\n') + '\n';
const cache = (fetched = today) => { const d = mkdtempSync(join(tmpdir(), 'geonames-test-')); writeFileSync(join(d, 'ES.txt'), FIXTURE); writeFileSync(join(d, 'ES.json'), JSON.stringify({ fetched })); return d; };
const PINS = [
  { id: 'town', lat: 41.219, lng: 1.5355, names: ['el vendrell'] },
  { id: 'beach', lat: 41.175, lng: 1.56, names: ['platja sant salvador'] },
  { id: 'museum', lat: 41.179, lng: 1.559, names: ['MUSEU PAU-CASALS'] },
  { id: 'museum2', lat: 41.179, lng: 1.559, names: ['pau casals museum'] },   // by an alternate name
  { id: 'accent', lat: 41.19, lng: 1.515, names: ['sant vicenc de calders'] },
  { id: 'nameless', lat: 41.219, lng: 1.5355, names: [] },
];
const py = (q, env = {}) => spawnSync('python3', [SCRIPT], { input: JSON.stringify(q), encoding: 'utf8', env: { ...process.env, ...env } });

test('geonames.py: features near each pin that carry its name, nearest first, nothing else on stdout', () => {
  const dir = cache(), r = py({ country: 'ES', pins: PINS }, { GEONAMES_CACHE: dir });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out), ['fetched', 'pins']); assert.equal(out.fetched, today);
  assert.deepEqual(Object.keys(out.pins).sort(), PINS.map(p => p.id).sort());
  assert.deepEqual(out.pins.town.map(f => f.id), ['3110001', '3110005']);   // not the area, not the one 5 km away, not the long name
  assert.deepEqual(out.pins.town[0], { id: '3110001', name: 'El Vendrell', cls: 'P', code: 'PPLA3', pop: 36000, lat: 41.21861, lng: 1.535, metres: out.pins.town[0].metres, exact: true });
  assert.equal(out.pins.town[1].exact, false);   // the station holds the name inside a longer one: after the town itself, whatever the distance
  assert.ok(out.pins.town[0].metres < 100 && out.pins.town[1].metres > 700 && out.pins.town[1].metres < 850);
  assert.deepEqual(out.pins.beach.map(f => [f.id, f.cls, f.code]), [['3110006', 'T', 'BCH']]);
  assert.deepEqual(out.pins.museum.map(f => f.id), ['3110007']); assert.deepEqual(out.pins.museum2.map(f => f.id), ['3110007']);
  assert.deepEqual(out.pins.accent.map(f => f.name), ['Sant Vicenç de Calders']);
  assert.deepEqual(out.pins.nameless, []);
  for (const l of r.stderr.trim().split('\n')) assert.match(l, /^geonames: /);
  assert.doesNotMatch(r.stderr, /vendrell|salvador|casals/i);   // the pins' names are never printed
});

test('geonames.py: a wrong country, an old file that cannot be fetched again, no file at all', () => {
  const bad = py({ country: 'es', pins: PINS }, { GEONAMES_CACHE: cache() });
  assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.match(bad.stderr, /^geonames: the country must be two capital letters/);
  const old = py({ country: 'ES', pins: PINS }, { GEONAMES_CACHE: cache('2026-01-01') });
  assert.equal(old.status, 0, old.stderr); assert.equal(JSON.parse(old.stdout).fetched, '2026-01-01');
  assert.match(old.stderr, /geonames: could not fetch ES \(.*\), using the file of 2026-01-01/);
  assert.deepEqual(JSON.parse(old.stdout).pins.town.map(f => f.id), ['3110001', '3110005']);
  const empty = mkdtempSync(join(tmpdir(), 'geonames-empty-')), none = py({ country: 'ES', pins: PINS }, { GEONAMES_CACHE: empty });
  assert.equal(none.status, 1); assert.match(none.stderr, /geonames: could not fetch ES/);
  assert.ok(!existsSync(join(empty, 'ES.txt')) && !existsSync(join(empty, 'ES.zip.part')));
  // Pins with no names: nothing to look for, nothing fetched.
  const quiet = py({ country: 'ES', pins: [{ id: 'x', lat: 41, lng: 1, names: [] }] }, { GEONAMES_CACHE: empty });
  assert.equal(quiet.status, 0); assert.deepEqual(JSON.parse(quiet.stdout), { fetched: null, pins: { x: [] } });
});

test('gazetteer: runs geonames.py; a failure gives no features and one line', async () => {
  process.env.GEONAMES_CACHE = cache();
  const logs = [], g = await gazetteer('ES', PINS.slice(0, 2), { log: m => logs.push(m) });
  assert.equal(g.fetched, today); assert.equal(g.pins.town[0].name, 'El Vendrell'); assert.equal(g.pins.beach[0].code, 'BCH');
  assert.ok(logs.every(l => /^geonames: /.test(l)));
  const l2 = [], bad = await gazetteer('Spain', PINS, { log: m => l2.push(m) });
  assert.deepEqual(bad, { fetched: null, pins: {} }); assert.equal(l2.length, 1); assert.match(l2[0], /^geonames: no features \(geonames: the country must be/);
  const l3 = [], gone = await gazetteer('ES', PINS, { python: 'no-such-python-here', log: m => l3.push(m) });
  assert.deepEqual(gone, { fetched: null, pins: {} }); assert.equal(l3.length, 1); assert.match(l3[0], /^geonames: no features/);
});

// Features as gazetteer() gives them.
const TOWN = { id: '3110001', name: 'El Vendrell', cls: 'P', code: 'PPLA3', pop: 36000, lat: 41.21861, lng: 1.535, metres: 60 };
const STATION = { id: '3110005', name: 'Estació del Vendrell', cls: 'S', code: 'RSTN', pop: 0, lat: 41.212, lng: 1.5355, metres: 778 };
const BEACH = { id: '3110006', name: 'Platja de Sant Salvador', cls: 'T', code: 'BCH', pop: 0, lat: 41.176, lng: 1.561, metres: 140 };
const MUSEUM = { id: '3110007', name: 'Museu Pau Casals', cls: 'S', code: 'MUS', pop: 0, lat: 41.1795, lng: 1.5592, metres: 250 };
const answer = o => async (p, q) => q.what === 'place match' ? JSON.stringify({ venue: true, entry: null, sure: false, name: null, kind: null, ...o }) : '{"website": null, "about": false}';
const notVenue = answer({ venue: false });

test('featureFor and featureKind: the reach of each class, a venue is never a town, our kinds', () => {
  assert.equal(featureFor([STATION, TOWN]).id, '3110001');
  assert.equal(featureFor([{ ...TOWN, metres: 3100 }]), null);
  assert.equal(featureFor([{ ...BEACH, metres: 1001 }]), null); assert.equal(featureFor([{ ...MUSEUM, metres: 301 }]), null);
  assert.equal(featureFor([TOWN], { venue: true }), null); assert.equal(featureFor([TOWN, MUSEUM], { venue: true }).id, '3110007');
  assert.equal(featureFor([{ ...TOWN, cls: 'R', code: 'RD' }]), null); assert.equal(featureFor(null), null);
  assert.equal(featureKind(TOWN), 'town'); assert.equal(featureKind({ ...TOWN, pop: 100000 }), 'city'); assert.equal(featureKind({ cls: 'P', code: 'PPLX', pop: 0 }), 'town');
  assert.equal(featureKind(BEACH), 'beach'); assert.equal(featureKind(MUSEUM), 'palette'); assert.equal(featureKind(STATION), null);
  for (const [c, k] of [['T.MTS', 'mountain'], ['T.HLL', 'mountain'], ['H.SPNG', 'spring'], ['S.CTHD', 'monastery'], ['S.CSTL', 'castle'], ['S.ANS', 'roman'], ['S.MNMT', 'arch'], ['S.AMUS', 'themepark']])
    assert.equal(featureKind({ cls: c[0], code: c.slice(2) }), k);
});

test('placeFacts: a town no record is gets its position, town, name and kind from GeoNames', async () => {
  const r = await placeFacts({ name: 'el vendrell', list: 'todo' }, [], notVenue, { meter: {}, features: [STATION, TOWN] });
  assert.equal(r.venue, false); assert.equal(r.posFrom, 'geonames');
  assert.deepEqual(r.feature, { id: '3110001', name: 'El Vendrell', cls: 'P', code: 'PPLA3', lat: 41.21861, lng: 1.535, pop: 36000 });
  assert.equal(r.town, 'El Vendrell'); assert.equal(r.townFrom, 'geonames'); assert.equal(r.name, 'El Vendrell'); assert.equal(r.nameFrom, 'geonames');
  assert.equal(r.ourKind, 'town'); assert.equal(r.kindFrom, 'geonames');
  assert.equal((await placeFacts({ name: 'tarragona', list: 'todo' }, [], notVenue, { meter: {}, features: [{ ...TOWN, pop: 130000 }] })).ourKind, 'city');
  // Claude's kind stays; Eat and drink takes no kind from GeoNames; out of reach, nothing.
  const m = await placeFacts({ name: 'el vendrell', list: 'todo' }, [], answer({ venue: false, kind: 'mountain' }), { meter: {}, features: [TOWN] });
  assert.equal(m.ourKind, 'mountain'); assert.equal(m.kindFrom, 'claude'); assert.equal(m.posFrom, 'geonames');
  const e = await placeFacts({ name: 'el vendrell', list: 'eat' }, [], notVenue, { meter: {}, features: [TOWN] });
  assert.equal(e.ourKind, null); assert.equal(e.kindFrom, null); assert.equal(e.posFrom, 'geonames');
  const far = await placeFacts({ name: 'platja sant salvador', list: 'todo' }, [], notVenue, { meter: {}, features: [{ ...BEACH, metres: 1200 }] });
  assert.equal(far.feature, null); assert.equal(far.posFrom, null); assert.equal(far.ourKind, null); assert.equal(far.town, null);
  const b = await placeFacts({ name: 'platja sant salvador', list: 'todo' }, [], notVenue, { meter: {}, features: [BEACH] });
  assert.equal(b.ourKind, 'beach'); assert.equal(b.town, null); assert.equal(b.posFrom, 'geonames');
  // No features at all: as before.
  const none = await placeFacts({ name: 'el vendrell', list: 'todo' }, [], notVenue, { meter: {} });
  assert.equal(none.feature, null); assert.equal(none.posFrom, null); assert.equal(none.name, null);
});

test('placeFacts: Overture\'s record keeps the position; a venue never takes a town\'s', async () => {
  const cands = [{ id: 'ov1', name: 'Museu Pau Casals', kind: 'museum', metres: 20, lat: 41.17951, lng: 1.55921, town: 'El Vendrell', phones: [], websites: [], socials: [] }];
  const r = await placeFacts({ name: 'museu pau casals', list: 'todo' }, cands, answer({ entry: 1, sure: true, name: 'Museu Pau Casals' }), { meter: {}, features: [MUSEUM] });
  assert.equal(r.posFrom, 'overture'); assert.equal(r.entry.lat, 41.17951); assert.equal(r.feature.id, '3110007');
  assert.equal(r.ourKind, 'palette'); assert.equal(r.kindFrom, 'geonames'); assert.equal(r.town, 'El Vendrell'); assert.equal(r.townFrom, 'overture'); assert.equal(r.nameFrom, 'overture');
  const v = await placeFacts({ name: 'el vendrell', list: 'todo' }, [], answer({}), { meter: {}, features: [TOWN] });
  assert.equal(v.venue, true); assert.equal(v.feature, null); assert.equal(v.posFrom, null);
  const s = await placeFacts({ name: 'museu pau casals', list: 'todo' }, [], answer({}), { meter: {}, features: [MUSEUM] });
  assert.equal(s.posFrom, 'geonames'); assert.equal(s.ourKind, 'palette');
  assert.equal((await placeFacts({ name: 'museu pau casals', list: 'todo' }, [], answer({}), { meter: {}, features: [{ ...MUSEUM, metres: 350 }] })).posFrom, null);
});

test('placeFacts: a place to eat takes the kind its site shows over none or plain Restaurant, not over the host\'s', async () => {
  const prompts = [];
  const eat = (match, site) => async (p, o) => { prompts.push([o.what, p]);
    return o.what === 'place match' ? JSON.stringify({ venue: true, entry: null, sure: false, name: null, kind: match }) : JSON.stringify({ website: 'https://ull.example/', about: true, hours: null, price: '20', kind: site }); };
  const f = await placeFacts({ name: 'ull de llebre', list: 'eat' }, [], eat('fork', 'fish'), { meter: {} });
  assert.equal(f.ourKind, 'fish'); assert.equal(f.kindFrom, 'site');
  const site = prompts.find(p => p[0] === 'site facts')[1];
  assert.match(site, /"kind": the one key from this list that the site's own menu or description shows: fork \(Restaurant\), pizza \(Pizza\)/); assert.match(site, /fish \(Fish and seafood\)/);
  const n = await placeFacts({ name: 'ull de llebre', list: 'eat' }, [], eat(null, 'fish'), { meter: {} });
  assert.equal(n.ourKind, 'fish'); assert.equal(n.kindFrom, 'site');
  const p = await placeFacts({ name: 'ull de llebre', list: 'eat' }, [], eat('pizza', 'fish'), { meter: {} });
  assert.equal(p.ourKind, 'pizza'); assert.equal(p.kindFrom, 'claude');
  const w = await placeFacts({ name: 'ull de llebre', list: 'eat' }, [], eat('fork', 'waterpark'), { meter: {} });
  assert.equal(w.ourKind, 'fork'); assert.equal(w.kindFrom, 'claude');
  // Things to do: the site is not asked for a kind, and one it gives anyway is not taken.
  prompts.length = 0;
  const t = await placeFacts({ name: 'aqualeon', list: 'todo' }, [], eat(null, 'fish'), { meter: {} });
  assert.equal(t.ourKind, null); assert.doesNotMatch(prompts.find(p => p[0] === 'site facts')[1], /"kind"/);
});

const d1 = new Date('2026-11-01T09:00:00Z'), d2 = new Date('2026-11-10T09:00:00Z');
const look = o => ({ entry: null, venue: false, phone: null, phoneFrom: null, website: null, websiteFrom: null, facebook: null, instagram: null,
  town: null, category: null, name: null, ourKind: null, hours: null, price: null, book: null, page: null, usd: 0.001, ...o });
const geoLook = look({ name: 'El Vendrell', nameFrom: 'geonames', ourKind: 'town', kindFrom: 'geonames', town: 'El Vendrell', townFrom: 'geonames', posFrom: 'geonames',
  feature: { id: '3110001', name: 'El Vendrell', cls: 'P', code: 'PPLA3', lat: 41.21861, lng: 1.535, pop: 36000 } });

test('mergeFacts: GeoNames\' facts with their source; Overture replaces GeoNames, not the reverse', () => {
  const g = mergeFacts(null, { name: 'el vendrell', list: 'todo' }, geoLook, { now: d1, release: '2026-10-22.0' });
  const src = { from: 'geonames', at: '2026-11-01', ref: '3110001' };
  assert.equal(g.facts.lat, 41.21861); assert.equal(g.facts.lng, 1.535); assert.deepEqual(g.sources.lat, src); assert.deepEqual(g.sources.lng, src);
  assert.equal(g.facts.town, 'El Vendrell'); assert.deepEqual(g.sources.town, src); assert.equal(g.facts.name, 'El Vendrell'); assert.deepEqual(g.sources.name, src);
  assert.equal(g.facts.kind_todo, 'town'); assert.deepEqual(g.sources.kind_todo, src); assert.equal(g.overture_id, null);
  // A later look with no position of ours keeps this one.
  const n = mergeFacts(g, { name: 'el vendrell', list: 'todo' }, look({ posFrom: null }), { now: d2 });
  assert.equal(n.facts.lat, 41.21861); assert.deepEqual(n.sources.lat, src);
  // Overture's record replaces GeoNames' point, name and town...
  const o = mergeFacts(g, { name: 'el vendrell', list: 'todo' }, look({ entry: { id: 'ov1', name: 'El Vendrell', lat: 41.2, lng: 1.6 }, posFrom: 'overture', name: 'El Vendrell', nameFrom: 'overture', town: 'Calafell', townFrom: 'overture' }), { now: d2, release: 'r2' });
  assert.equal(o.facts.lat, 41.2); assert.deepEqual(o.sources.lat, { from: 'overture', at: '2026-11-10', release: 'r2' }); assert.equal(o.facts.town, 'Calafell'); assert.equal(o.sources.name.from, 'overture');
  // ...and GeoNames never replaces Overture's.
  const back = mergeFacts(o, { name: 'el vendrell', list: 'todo' }, { ...geoLook, feature: { ...geoLook.feature, lat: 41.3, lng: 1.7 } }, { now: d2 });
  assert.equal(back.facts.lat, 41.2); assert.equal(back.facts.lng, 1.6); assert.equal(back.sources.lat.from, 'overture'); assert.equal(back.facts.town, 'Calafell'); assert.equal(back.sources.name.from, 'overture');
  // A newer GeoNames point replaces an older GeoNames one.
  assert.equal(mergeFacts(g, { name: 'el vendrell', list: 'todo' }, { ...geoLook, feature: { ...geoLook.feature, id: '9', lat: 41.3 } }, { now: d2 }).sources.lat.ref, '9');
});

test('mergeFacts: kinds by source: GeoNames under Claude and the site, plain Restaurant under the site', () => {
  const c = mergeFacts(null, { name: 'x', list: 'todo' }, look({ ourKind: 'mountain', kindFrom: 'claude' }), { now: d1 });
  const g = mergeFacts(c, { name: 'x', list: 'todo' }, look({ ourKind: 'town', kindFrom: 'geonames', feature: { id: '1' } }), { now: d2 });
  assert.equal(g.facts.kind_todo, 'mountain'); assert.equal(g.sources.kind_todo.from, 'claude');
  // Over the mark for "asked, no kind", GeoNames' kind is kept.
  const none = mergeFacts(null, { name: 'x', list: 'todo' }, look({}), { now: d1 });
  assert.equal(mergeFacts(none, { name: 'x', list: 'todo' }, look({ ourKind: 'town', kindFrom: 'geonames', feature: { id: '1' } }), { now: d2 }).facts.kind_todo, 'town');
  const s = mergeFacts(null, { name: 'x', list: 'eat' }, look({ ourKind: 'fish', kindFrom: 'site' }), { now: d1 });
  assert.deepEqual(s.sources.kind_eat, { from: 'site', at: '2026-11-01' });
  assert.equal(mergeFacts(s, { name: 'x', list: 'eat' }, look({ ourKind: 'fork', kindFrom: 'claude' }), { now: d2 }).facts.kind_eat, 'fish');
  assert.equal(mergeFacts(s, { name: 'x', list: 'eat' }, look({ ourKind: 'pizza', kindFrom: 'claude' }), { now: d2 }).facts.kind_eat, 'pizza');
  const f = mergeFacts(null, { name: 'x', list: 'eat' }, look({ ourKind: 'fork', kindFrom: 'claude' }), { now: d1 });
  assert.equal(mergeFacts(f, { name: 'x', list: 'eat' }, look({ ourKind: 'fish', kindFrom: 'site' }), { now: d2 }).facts.kind_eat, 'fish');
});

// The build with stand-ins: Google locates a typed town and a kept card; Overture knows neither; GeoNames does.
const house = { lat: 41.2, lng: 1.5 };
const GV = { gid: 'GVaaaaaaaaaa', lat: 41.219, lng: 1.5355 }, GB = { gid: 'GBaaaaaaaaaa', lat: 41.175, lng: 1.56 };
const GOOGLE = { ca: 'Platja de Sant Salvador del Vendrell', es: 'Playa San Salvador', en: 'Playa San Salvador' };   // read, compared, dropped
const locate = { byId: async id => id === GB.gid ? GB : null, byWords: async w => w === 'el vendrell' ? GV : null, name: async (id, lang) => id === GB.gid ? GOOGLE[lang] : null };
const near = async (h, pins) => ({ release: 'r', towns: {}, pins: Object.fromEntries(pins.map(p => [p.id, p.id === GB.gid ? [{ id: 'ov5', name: 'Hotel Sol', kind: 'hotel', metres: 30, lat: 41.1751, lng: 1.5601 }] : []])) });
const fakeGaz = calls => async (country, pins) => { calls.push({ country, pins: JSON.parse(JSON.stringify(pins)) });
  return { fetched: '2026-11-10', pins: Object.fromEntries(pins.map(p => [p.id, p.id === GV.gid ? [TOWN, STATION] : p.id === GB.gid ? [BEACH] : []])) }; };
const fakeStore = (rows, saved = []) => ({ get: async gids => Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])),
  save: async (gid, place, res, opts) => { saved.push([gid, place]); const r = { gid, ...mergeFacts(rows[gid] || null, place, res, opts) }; rows[gid] = r; return r; } });

test('hostPlaces: a town typed by the host gets a position of ours; a card is named by its feature', async () => {
  const rows = {}, saved = [], calls = [], prompts = [], logs = [];
  const ask = async (p, o) => { prompts.push(p); return o.what === 'place match' ? '{"venue": false, "entry": null, "sure": false, "name": null, "kind": null}' : '{}'; };
  const geo = await hostPlaces({ rows: [{ p: 'el vendrell', list: 'todo' }], cards: [{ id: GB.gid, list: 'todo' }], house },
    { store: fakeStore(rows, saved), ask, locate, near, gaz: fakeGaz(calls), log: m => logs.push(m) });
  assert.equal(calls.length, 1); assert.equal(calls[0].country, 'ES');
  assert.deepEqual(calls[0].pins, [{ id: GV.gid, lat: 41.219, lng: 1.5355, names: ['el vendrell'] }, { id: GB.gid, lat: 41.175, lng: 1.56, names: [GOOGLE.ca, GOOGLE.es] }]);   // Google's names, in memory only
  const t = geo['el vendrell'];
  assert.equal(t.name, 'El Vendrell'); assert.equal(t.lat, 41.21861); assert.equal(t.lng, 1.535); assert.equal(t.pos, undefined); assert.equal(t.kind, 'town'); assert.equal(t.town, 'El Vendrell');
  assert.deepEqual(rows[GV.gid].sources.lat, { from: 'geonames', at: rows[GV.gid].sources.lat.at, ref: '3110001' });
  const b = geo['gid:' + GB.gid];
  assert.equal(b.name, 'Platja de Sant Salvador'); assert.equal(b.noname, undefined); assert.equal(b.kind, 'beach'); assert.equal(b.lat, 41.176); assert.equal(b.pos, undefined);
  assert.equal(rows[GB.gid].facts.name, 'Platja de Sant Salvador'); assert.equal(rows[GB.gid].sources.name.from, 'geonames');
  for (const kept of [geo, rows, saved, prompts, logs]) assert.ok(!/Salvador del Vendrell|Playa San/.test(JSON.stringify(kept)));   // not kept, not logged, not sent to Claude
  // The next build: the card's kept name is the one passed, Google is not asked again, nothing is looked at.
  const calls2 = [], asked = [];
  const geo2 = await hostPlaces({ cards: [{ id: GB.gid, list: 'todo' }], house }, { store: fakeStore(rows), ask: async (p, o) => { asked.push(o.what); return '{}'; }, locate, near, gaz: fakeGaz(calls2), log: () => {} });
  assert.deepEqual(calls2[0].pins[0].names, ['Platja de Sant Salvador']); assert.deepEqual(asked, []); assert.equal(geo2['gid:' + GB.gid].name, 'Platja de Sant Salvador');
});

test('hostPlaces: a place read lately with only Google\'s position gets a position of ours from the light look', async () => {
  const fresh = new Date(Date.now() - 86400000).toISOString(), asked = [];
  const rows = { [GV.gid]: { gid: GV.gid, tried_at: fresh, tries: 1, venue: false, facts: { kind_todo: 'town' }, sources: { kind_todo: { from: 'claude', at: '2026-11-01' } } } };
  const ask = async (p, o) => { asked.push(o.what); return '{"venue": false, "entry": null, "sure": false, "name": null, "kind": "town"}'; };
  const geo = await hostPlaces({ rows: [{ p: 'el vendrell', list: 'todo' }], house }, { store: fakeStore(rows), ask, locate, near, gaz: fakeGaz([]), log: () => {} });
  assert.deepEqual(asked, ['place match']);   // the match only: no site read, no search
  assert.equal(geo['el vendrell'].lat, 41.21861); assert.equal(geo['el vendrell'].pos, undefined);
  assert.equal(rows[GV.gid].tried_at, fresh); assert.equal(rows[GV.gid].tries, 1); assert.equal(rows[GV.gid].sources.lat.from, 'geonames');
  // Once it has one, nothing is asked.
  asked.length = 0;
  await hostPlaces({ rows: [{ p: 'el vendrell', list: 'todo' }], house }, { store: fakeStore(rows), ask, locate, near, gaz: fakeGaz([]), log: () => {} });
  assert.deepEqual(asked, []);
  // Neither Overture nor GeoNames: Google's position, marked.
  const g = await hostPlaces({ rows: [{ p: 'el vendrell', list: 'todo' }], house }, { store: fakeStore({}), ask, locate, near, gaz: async () => ({ fetched: null, pins: {} }), log: () => {} });
  assert.equal(g['el vendrell'].lat, 41.219); assert.equal(g['el vendrell'].pos.from, 'google');
});
