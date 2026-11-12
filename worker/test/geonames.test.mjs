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
import { gazetteer, placeFacts, featureFor, featureKind, townPoint, municipalityAt } from '../place-facts.mjs';
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

test('townPoint: the house\'s town from geonames.py, the town itself and not its station; a name it does not have gives null', async () => {
  process.env.GEONAMES_CACHE = cache();
  const t = await townPoint('El Vendrell', { lat: 41.219, lng: 1.5355 }, { log: () => {} });
  assert.equal(t.name, 'El Vendrell'); assert.equal(t.lat, 41.21861); assert.equal(t.lng, 1.535); assert.ok(t.metres < 100);
  assert.equal(await townPoint('Nowhere Town', { lat: 41.219, lng: 1.5355 }, { log: () => {} }), null);
});

// The second question of geonames.py: the municipality a point lies in. A made-up file of its own: two municipalities with
// a seat and a hamlet, one with an inverted name, a place whose codes name no municipality, an abandoned one.
const row = (id, name, lat, lng, cls, code, a3, pop = 0, a2 = 'T') => [id, name, name, '', lat, lng, cls, code, 'ES', '', '56', a2, a3, '', pop, '', '10', 'Europe/Madrid', '2024-01-01'].join('\t');
const MUNI = [
  row('9000001', 'Província de Tarragona', 41.1, 1.1, 'A', 'ADM2', '', 800000),
  row('9000002', 'Vilaprova', 41.3, 1.5, 'A', 'ADM3', '43900', 1000),
  row('9000003', 'Vilaprova', 41.3, 1.5, 'P', 'PPLA3', '43900', 1000),
  row('9000004', 'Can Provet', 41.32, 1.52, 'P', 'PPL', '43900'),
  row('9000005', 'Despoblat del Provet', 41.3201, 1.5201, 'P', 'PPLQ', '43900'),   // abandoned: never the nearest place
  row('9000006', 'Rosari, El', 41.4, 1.6, 'A', 'ADM3', '43901', 300),
  row('9000007', 'El Rosari', 41.4, 1.6, 'P', 'PPLA3', '43901', 300),
  row('9000008', 'Masos, Els', 41.45, 1.7, 'A', 'ADM3', '43903', 50),
  row('9000009', 'Mas de Dalt', 41.45, 1.7, 'P', 'PPL', '43903'),                   // a municipality with no seat in the file
  row('9000010', 'Urbanització Sense Codi', 41.5, 1.8, 'P', 'PPLX', ''),            // no admin3 code: the nearest town stands in
  row('9000011', 'Poble Gran', 41.52, 1.8, 'P', 'PPL', '43902', 500),               // its codes name no ADM3 row
].join('\n') + '\n';
const muniCache = () => { const d = mkdtempSync(join(tmpdir(), 'geonames-muni-')); writeFileSync(join(d, 'ES.txt'), MUNI); writeFileSync(join(d, 'ES.json'), JSON.stringify({ fetched: today })); return d; };
const POINTS = [
  { id: 'hamlet', lat: 41.3205, lng: 1.5205 }, { id: 'seat', lat: 41.4005, lng: 1.6 }, { id: 'noseat', lat: 41.4505, lng: 1.7 },
  { id: 'nocode', lat: 41.5005, lng: 1.8 }, { id: 'far', lat: 40.0, lng: 0.5 },
];

test('geonames.py, municipality: the nearest place\'s municipality, its province and seat, the hamlet named; nothing within 10 km gives null', () => {
  const r = py({ country: 'ES', points: POINTS }, { GEONAMES_CACHE: muniCache() });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out), ['fetched', 'places']); assert.equal(out.fetched, today);
  const h = out.places.hamlet;
  assert.deepEqual({ ...h, metres: 0 }, { town: 'Vilaprova', province: 'Tarragona', seat: 'Vilaprova', near: 'Can Provet', near_code: 'PPL', metres: 0, by: 'adm3' });
  assert.ok(h.metres > 0 && h.metres < 100);   // the abandoned place nearer to it is not the nearest place
  assert.equal(out.places.seat.town, 'El Rosari'); assert.equal(out.places.seat.near, 'El Rosari'); assert.equal(out.places.seat.seat, 'El Rosari');
  assert.equal(out.places.noseat.town, 'Els Masos'); assert.equal(out.places.noseat.seat, null); assert.equal(out.places.noseat.near, 'Mas de Dalt');
  assert.deepEqual({ ...out.places.nocode, metres: 0 }, { town: 'Poble Gran', province: 'Tarragona', seat: null, near: 'Urbanització Sense Codi', near_code: 'PPLX', metres: 0, by: 'nearest' });
  assert.equal(out.places.far, null);
  assert.match(r.stderr, /4 of 5 points in a municipality/);
});

test('geonames.py, municipality: with pins in the same call, and with no points nothing is fetched', () => {
  const both = py({ country: 'ES', pins: [{ id: 'x', lat: 41.32, lng: 1.52, names: ['can provet'] }], points: POINTS.slice(0, 1) }, { GEONAMES_CACHE: muniCache() });
  assert.equal(both.status, 0, both.stderr);
  const o = JSON.parse(both.stdout);
  assert.deepEqual(Object.keys(o), ['fetched', 'pins', 'places']); assert.equal(o.pins.x[0].name, 'Can Provet'); assert.equal(o.places.hamlet.town, 'Vilaprova');
  const empty = mkdtempSync(join(tmpdir(), 'geonames-empty-')), none = py({ country: 'ES', points: [] }, { GEONAMES_CACHE: empty });
  assert.equal(none.status, 0); assert.deepEqual(JSON.parse(none.stdout), { fetched: null, places: {} }); assert.ok(!existsSync(join(empty, 'ES.txt')));
});

test('municipalityAt: from geonames.py, from an injected gazetteer, and null rather than a throw', async () => {
  process.env.GEONAMES_CACHE = muniCache();
  assert.deepEqual(await municipalityAt({ lat: 41.3205, lng: 1.5205 }, { log: () => {} }), { town: 'Vilaprova', province: 'Tarragona', near: 'Can Provet', metres: (await municipalityAt({ lat: 41.3205, lng: 1.5205 }, { log: () => {} })).metres, fetched: today });
  assert.equal(await municipalityAt({ lat: 40, lng: 0.5 }, { log: () => {} }), null);
  const calls = [], gaz = async (country, pins, o) => { calls.push({ country, pins, points: o.points }); return { fetched: '2026-11-10', pins: {}, places: { house: { town: 'la Prova', province: 'Barcelona', near: 'Urbanització del Pi', metres: 640 } } }; };
  assert.deepEqual(await municipalityAt({ lat: '41.1', lng: 1.9 }, { gaz, country: 'ES' }), { town: 'la Prova', province: 'Barcelona', near: 'Urbanització del Pi', metres: 640, fetched: '2026-11-10' });
  assert.deepEqual(calls, [{ country: 'ES', pins: [], points: [{ id: 'house', lat: 41.1, lng: 1.9 }] }]);
  assert.equal(await municipalityAt({ lat: 41.1, lng: 1.9 }, { gaz: async () => ({ fetched: null, pins: {}, places: {} }) }), null);
  assert.equal(await municipalityAt({ lat: 41.1, lng: 1.9 }, { gaz: async () => ({ places: { house: { town: '  ' } } }) }), null);
  const logs = []; assert.equal(await municipalityAt({ lat: 41.1, lng: 1.9 }, { gaz: async () => { throw new Error('boom'); }, log: m => logs.push(m) }), null);
  assert.match(logs[0], /^geonames: the municipality not looked up \(boom\)/);
  let asked = 0; const counted = async () => { asked++; return {}; };
  for (const at of [null, {}, { lat: 41 }, { lat: 'x', lng: 1 }]) assert.equal(await municipalityAt(at, { gaz: counted }), null);
  assert.equal(asked, 0);
  const l2 = [], gone = await municipalityAt({ lat: 41.1, lng: 1.9 }, { python: 'no-such-python-here', log: m => l2.push(m) });
  assert.equal(gone, null); assert.match(l2[0], /^geonames: no features/);
});

// The nearest beach, in the same pass (12 Nov 2026): a made-up coast. Two municipalities, one by the sea and one about
// 49 km inland; a beach 4.4 km from the first (by road about 6 km), a second one farther, and a river beach next to the
// inland one, which is not the sea.
const SEA = [
  row('9100001', 'Província de Tarragona', 41.1, 1.1, 'A', 'ADM2', '', 800000),
  row('9100002', 'Vilamar', 41.2, 1.6, 'A', 'ADM3', '43910', 2000),
  row('9100003', 'Vilamar', 41.2, 1.6, 'P', 'PPLA3', '43910', 2000),
  row('9100004', 'Vilaterra', 41.6, 1.6, 'A', 'ADM3', '43911', 300),
  row('9100005', 'Vilaterra', 41.6, 1.6, 'P', 'PPLA3', '43911', 300),
  row('9100006', 'Platja de Prova', 41.16, 1.6, 'T', 'BCH', '43910'),
  row('9100007', 'Platges del Sud', 41.12, 1.62, 'T', 'BCHS', '43910'),
  row('9100008', 'Playa fluvial del Riu Sec', 41.59, 1.6, 'T', 'BCH', '43911'),
].join('\n') + '\n';
const seaCache = () => { const d = mkdtempSync(join(tmpdir(), 'geonames-sea-')); writeFileSync(join(d, 'ES.txt'), SEA); writeFileSync(join(d, 'ES.json'), JSON.stringify({ fetched: today })); return d; };

test('geonames.py, the sea: the nearest beach and its distance by road, none beyond 60 km by road, none in a file without beaches', () => {
  const r = py({ country: 'ES', points: [{ id: 'coast', lat: 41.2, lng: 1.6 }, { id: 'inland', lat: 41.6, lng: 1.6 }] }, { GEONAMES_CACHE: seaCache() });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout).places;
  assert.deepEqual(out.coast.sea, { km: 6, name: 'Platja de Prova' });   // 4.45 km in a straight line, times 1.3, rounded
  assert.equal(out.coast.town, 'Vilamar');
  assert.equal(out.inland.town, 'Vilaterra'); assert.ok(!('sea' in out.inland), JSON.stringify(out.inland));   // the river beach 1 km away is not the sea, the sea is 64 km by road
  const none = JSON.parse(py({ country: 'ES', points: POINTS.slice(0, 1) }, { GEONAMES_CACHE: muniCache() }).stdout).places.hamlet;
  assert.equal(none.town, 'Vilaprova'); assert.ok(!('sea' in none));
});

test('municipalityAt: the sea passed through from geonames.py and from a gazetteer; one out of reach or without a name left out', async () => {
  process.env.GEONAMES_CACHE = seaCache();
  const m = await municipalityAt({ lat: 41.2, lng: 1.6 }, { log: () => {} });
  assert.deepEqual(m.sea, { km: 6, name: 'Platja de Prova' }); assert.equal(m.town, 'Vilamar');
  assert.ok(!('sea' in await municipalityAt({ lat: 41.6, lng: 1.6 }, { log: () => {} })));
  const gaz = sea => async () => ({ fetched: '2026-11-12', places: { house: { town: 'la Prova', sea } } });
  assert.deepEqual((await municipalityAt({ lat: 41.1, lng: 1.9 }, { gaz: gaz({ km: 23, name: '  Platja Llarga ' }) })).sea, { km: 23, name: 'Platja Llarga' });
  for (const bad of [{ km: 75, name: 'Lluny' }, { km: 0, name: 'X' }, { km: 12 }, { km: 'x', name: 'Y' }, null, 'sea'])
    assert.ok(!('sea' in await municipalityAt({ lat: 41.1, lng: 1.9 }, { gaz: gaz(bad) })), JSON.stringify(bad));
});
