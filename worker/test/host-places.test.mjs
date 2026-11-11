// A host's places for the build (worker/host-places.mjs), our name and kind for a place (tidyName, the match), the new
// facts kept in place_facts, and the one list of kinds (engine/src/kinds.json). No network: Google, Overture and Claude
// are stand-ins.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tidyName, mergeFacts, lookedFor, FACTS } from '../place-store.mjs';
import { placeFacts } from '../place-facts.mjs';
import { hostPlaces, placesOf } from '../host-places.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Nothing here may reach GeoNames: every build passes a stand-in, and a call that slipped through would find an empty
// cache and nowhere to download from.
process.env.GEONAMES_CACHE = mkdtempSync(join(tmpdir(), 'geonames-none-'));
process.env.GEONAMES_URL = 'http://127.0.0.1:9/';
const noGaz = async () => ({ fetched: null, pins: {} });
const json = f => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const d1 = new Date('2026-11-01T09:00:00Z');
const H = [{ days: ['tue', 'wed'], open: '10:00', close: '14:00' }];

test('tidyName: the host\'s words, with our spelling of the words they typed', () => {
  assert.equal(tidyName('ull de llebre', 'Restaurant Ull de Llebre'), 'Ull de Llebre');
  assert.equal(tidyName('codorniu', 'Caves Codorníu'), 'Codorníu');
  assert.equal(tidyName("l'ancora del serrallo", "L'Àncora del Serrallo"), "L'Àncora del Serrallo");
  assert.equal(tidyName('balneari de coma ruga', 'Balneari Termaeuropa'), 'Balneari de Coma Ruga');
  assert.equal(tidyName('la fabrica del pernil', null), 'La Fabrica del Pernil');
  assert.equal(tidyName('la fabrica del pernil', ''), 'La Fabrica del Pernil');
  // Typed with its own capitals and accents: kept as typed.
  assert.equal(tidyName('PortAventura', 'Port Aventura World'), 'PortAventura');
  assert.equal(tidyName('PortAventura', null), 'PortAventura');
  assert.equal(tidyName('Mas Miró', 'Mas Miro'), 'Mas Miró');
  assert.equal(tidyName('mas miró', 'Mas Miro'), 'Mas Miró');
  // Inner apostrophes and hyphens come from ref; spaces are tidied; nothing is added.
  assert.equal(tidyName('lancora', "L'Àncora"), "L'Àncora");
  assert.equal(tidyName('platja de comaruga', 'Coma-ruga'), 'Platja de Coma-ruga');
  assert.equal(tidyName("  l'ancora  ", null), "L'Ancora");
  assert.equal(tidyName('', 'Bar X'), '');
});

test('mergeFacts: name, category and the kind of the list looked at', () => {
  const look = { entry: { id: 'ov1', name: 'Esencia', category: 'restaurant', lat: 41.2, lng: 1.6 }, venue: true, name: 'Esencia', ourKind: 'cloche',
    category: 'restaurant', phone: null, phoneFrom: null, website: null, websiteFrom: null, page: null, usd: 0.01 };
  const r = mergeFacts(null, { name: 'esenciaelvendrell', list: 'eat' }, look, { now: d1, release: '2026-10-22.0' });
  assert.equal(r.facts.name, 'Esencia'); assert.deepEqual(r.sources.name, { from: 'overture', at: '2026-11-01', release: '2026-10-22.0' });
  assert.equal(r.facts.category, 'restaurant'); assert.equal(r.facts.kind, undefined);
  assert.equal(r.facts.kind_eat, 'cloche'); assert.deepEqual(r.sources.kind_eat, { from: 'claude', at: '2026-11-01' });
  assert.equal(r.facts.kind_todo, undefined); assert.equal(r.sources.kind_todo, undefined);
  assert.equal(r.name, 'esenciaelvendrell');
  assert.ok(lookedFor(r, 'eat')); assert.ok(!lookedFor(r, 'todo'));
  // Looked at again for Things to do, no kind sure: the eat kind stays, todo is marked as asked, with no fact.
  const t = mergeFacts(r, { name: 'esenciaelvendrell', list: 'todo' }, { ...look, ourKind: null }, { now: d1 });
  assert.equal(t.facts.kind_eat, 'cloche'); assert.equal(t.facts.kind_todo, undefined);
  assert.deepEqual(t.sources.kind_todo, { from: 'claude', at: '2026-11-01', none: true }); assert.ok(lookedFor(t, 'todo'));
  // A later sure kind replaces the mark.
  const u = mergeFacts(t, { name: 'x', list: 'todo' }, { ...look, ourKind: 'wine' }, { now: d1 });
  assert.equal(u.facts.kind_todo, 'wine'); assert.deepEqual(u.sources.kind_todo, { from: 'claude', at: '2026-11-01' });
  // A card with no typed name: the row takes our name.
  assert.equal(mergeFacts(null, { name: '', list: 'todo' }, look, { now: d1 }).name, 'Esencia');
  assert.ok(Object.keys(u.facts).every(k => FACTS.includes(k)));
});

test('placeFacts: the match gives our name and kind, never more than the list allows', async () => {
  const cands = [{ id: 'ov1', name: 'esenciaelvendrell', kind: 'restaurant', metres: 8, lat: 41.2, lng: 1.6, phones: [], websites: [], socials: [] }];
  const prompts = [];
  const ask = async (prompt, o) => { prompts.push(prompt);
    return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Esencia", "kind": "cloche"}' : '{"website": null, "about": false}'; };
  const r = await placeFacts({ name: 'esencia', list: 'eat' }, cands, ask, { meter: {} });
  assert.equal(r.name, 'Esencia'); assert.equal(r.ourKind, 'cloche'); assert.equal(r.category, 'restaurant'); assert.equal(r.kind, undefined);
  assert.match(prompts[0], /cloche \(Fine dining\)/); assert.doesNotMatch(prompts[0], /waterpark/);
  // A key of the other list, or no entry: null.
  const bad = async (p, o) => o.what === 'place match' ? '{"venue": true, "entry": null, "sure": false, "name": "Esencia", "kind": "waterpark"}' : '{}';
  const b = await placeFacts({ name: 'esencia', list: 'eat' }, cands, bad, { meter: {} });
  assert.equal(b.name, null); assert.equal(b.ourKind, null);
  // Not a venue keeps both.
  const beach = async () => '{"venue": false, "entry": null, "sure": false, "name": null, "kind": "beach"}';
  const c = await placeFacts({ name: 'platja llarga', list: 'todo' }, [], beach, { meter: {} });
  assert.equal(c.venue, false); assert.equal(c.ourKind, 'beach'); assert.equal(c.name, null);
});

test('placeFacts: a card kept without a name rests on the entries, and with none nothing is read', async () => {
  const asked = [];
  const ask = async (prompt, o) => { asked.push([o.what, prompt]); return '{"venue": true, "entry": null, "sure": false, "name": null, "kind": null}'; };
  const r = await placeFacts({ name: '', list: 'todo' }, [], ask, { meter: {} });
  assert.deepEqual(asked.map(a => a[0]), ['place match']);
  assert.match(asked[0][1], /kept a place at this spot/); assert.match(asked[0][1], /two or more different entries could be it/);
  assert.equal(r.website, null); assert.equal(r.tries, 0);
  // With a sure entry, the site is searched by our name.
  const cands = [{ id: 'ov9', name: 'Aqualeon', kind: 'water_park', metres: 20, lat: 41.3, lng: 1.4, phones: [], websites: [], socials: [] }];
  const seen = [];
  const ask2 = async (prompt, o) => { seen.push(prompt); return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Aqualeon", "kind": "waterpark"}' : '{"website": null, "about": false}'; };
  const s = await placeFacts({ name: '', list: 'todo' }, cands, ask2, { meter: {} });
  assert.equal(s.name, 'Aqualeon'); assert.equal(s.ourKind, 'waterpark'); assert.match(seen[1], /"Aqualeon"/);
});

// Stand-ins for the build: Google locates by id or by words, the table holds rows, Claude answers the match.
const house = { lat: 41.2, lng: 1.5 };
const loc = { G1: { gid: 'G1aaaaaaaaaa', lat: 41.21, lng: 1.51 }, G2: { gid: 'G2aaaaaaaaaa', lat: 41.25, lng: 1.55 }, G3: { gid: 'G3aaaaaaaaaa', lat: 41.3, lng: 1.6 }, G4: { gid: 'G4aaaaaaaaaa', lat: 41.22, lng: 1.52 } };
const locate = { byId: async id => Object.values(loc).find(l => l.gid === id) || null, byWords: async w => w === 'ull de llebre' ? loc.G1 : w === 'can pep' ? loc.G4 : null };
const fresh = new Date(Date.now() - 86400000).toISOString();
const rows0 = () => ({
  G1aaaaaaaaaa: { gid: 'G1aaaaaaaaaa', tried_at: fresh, facts: { name: 'Restaurant Ull de Llebre', kind_eat: 'fork', town: 'Calafell', lat: 41.2101, lng: 1.5101, phone: '977 00 00 00', website: 'https://ull.example/', hours: H, price: '20-30', book: true },
    sources: { kind_eat: { from: 'claude', at: '2026-11-01' } } },
  G3aaaaaaaaaa: { gid: 'G3aaaaaaaaaa', tried_at: fresh, facts: { town: 'Altafulla' }, sources: { kind_todo: { from: 'claude', at: '2026-11-01', none: true } } },
});
const fakeStore = (rows, saved = []) => ({ get: async gids => Object.fromEntries(gids.filter(g => rows[g]).map(g => [g, rows[g]])),
  save: async (gid, place, res, opts) => { saved.push([gid, place]); const r = { gid, ...mergeFacts(rows[gid] || null, place, res, opts) }; rows[gid] = r; return r; } });
const near = async (h, pins) => ({ release: '2026-10-22.0', towns: { G2aaaaaaaaaa: 'El Vendrell', G4aaaaaaaaaa: 'Calafell' },
  pins: Object.fromEntries(pins.map(p => [p.id, p.id === 'G2aaaaaaaaaa' ? [{ id: 'ov2', name: 'Aqualeon Water Park', kind: 'water_park', metres: 15, lat: 41.2502, lng: 1.5502, phones: ['977687680'], websites: [], socials: [] }] : []])) });

test('hostPlaces: a typed place with kept facts, a card named by the chain, a card with no name', async () => {
  const rows = rows0(), saved = [], asked = [];
  const ask = async (prompt, o) => { asked.push(o.what);
    if (o.what !== 'place match') return '{"website": null, "about": false}';
    return /Aqualeon/.test(prompt) ? '{"venue": true, "entry": 1, "sure": true, "name": "Aqualeon", "kind": "waterpark"}' : '{"venue": true, "entry": null, "sure": false, "name": null, "kind": null}'; };
  const geo = await hostPlaces({ rows: [{ p: ' ull de llebre ', list: 'eat', c: 'Our favourite' }, { p: 'nowhere at all', list: 'eat' }], cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }, { id: 'G3aaaaaaaaaa', list: 'todo' }], house, town: 'El Vendrell' },
    { store: fakeStore(rows, saved), ask, locate, near, gaz: noGaz, log: () => {} });
  assert.deepEqual(Object.keys(geo), ['ull de llebre', 'gid:G2aaaaaaaaaa', 'gid:G3aaaaaaaaaa']);   // not found on Google: no entry
  // Kept and not due: nothing asked for it; our name, our position (no pos), the facts we keep.
  const u = geo['ull de llebre'];
  assert.equal(u.name, 'Ull de Llebre'); assert.equal(u.lat, 41.2101); assert.equal(u.lng, 1.5101); assert.equal(u.pos, undefined);
  assert.equal(u.town, 'Calafell'); assert.equal(u.kind, 'fork'); assert.equal(u.phone, '977 00 00 00'); assert.equal(u.url, 'https://ull.example/');
  assert.deepEqual(u.schedule, H); assert.equal(u.price, '20-30'); assert.equal(u.book, true); assert.equal(u.gid, 'G1aaaaaaaaaa'); assert.ok(u.km >= 1);
  assert.equal(u.gmaps, 'https://www.google.com/maps/search/?api=1&query=Ull%20de%20Llebre&query_place_id=G1aaaaaaaaaa');
  // The card: looked at by the chain (one match, its record has no website: one search), kept, named and kinded from it.
  const a = geo['gid:G2aaaaaaaaaa'];
  assert.equal(a.name, 'Aqualeon'); assert.equal(a.kind, 'waterpark'); assert.equal(a.phone, '977 68 76 80'); assert.equal(a.town, 'El Vendrell');
  assert.equal(a.lat, 41.2502); assert.equal(a.pos, undefined);
  assert.deepEqual(saved.map(s => s[0]), ['G2aaaaaaaaaa']); assert.equal(saved[0][1].name, ''); assert.equal(saved[0][1].list, 'todo');
  // The card with no name of ours (looked at for todo already, nothing sure): noname, Google's position marked.
  const n = geo['gid:G3aaaaaaaaaa'];
  assert.equal(n.noname, true); assert.equal(n.name, undefined); assert.equal(n.lat, 41.3); assert.equal(n.town, 'Altafulla');
  assert.equal(n.pos.from, 'google'); assert.match(n.pos.at, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(n.gmaps, /query=41\.3%2C1\.6&query_place_id=G3aaaaaaaaaa$/);
  assert.deepEqual(asked, ['place match', 'site facts']);
});

test('hostPlaces: a failure in the chain keeps the located entry; without Claude, only what is kept', async () => {
  const store = { get: async () => ({}), save: async () => { throw new Error('database down'); } };
  const ask = async (p, o) => o.what === 'place match' ? '{"venue": true, "entry": null, "sure": false, "name": null, "kind": "fork"}' : '{}';
  const logs = [];
  const geo = await hostPlaces({ rows: [{ p: 'can pep', list: 'eat' }], cards: [], house }, { store, ask, locate, near, gaz: noGaz, log: m => logs.push(m) });
  assert.equal(geo['can pep'].name, 'Can Pep'); assert.equal(geo['can pep'].lat, 41.22); assert.equal(geo['can pep'].pos.from, 'google');
  assert.equal(geo['can pep'].kind, undefined); assert.equal(geo['can pep'].town, 'Calafell');   // the town around the pin
  assert.ok(logs.some(m => /database down/.test(m)));
  // A look cut short by Claude is not kept.
  let kept = 0;
  const off = async () => { throw new Error('Searches are paused for today. Try again tomorrow.'); };
  await hostPlaces({ rows: [{ p: 'can pep', list: 'eat' }], house }, { store: { get: async () => ({}), save: async () => { kept++; } }, ask: off, locate, near, gaz: noGaz, log: () => {} });
  assert.equal(kept, 0);
  // No store: Google's position only, the host's words tidied, nothing else.
  const bare = await hostPlaces({ rows: [{ p: 'ull de llebre', list: 'eat' }], cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }], house }, { locate, near: () => { throw new Error('not asked'); }, gaz: () => { throw new Error('not asked'); } });
  assert.deepEqual(bare['ull de llebre'], { name: 'Ull de Llebre', lat: 41.21, lng: 1.51, km: bare['ull de llebre'].km, gid: 'G1aaaaaaaaaa',
    gmaps: 'https://www.google.com/maps/search/?api=1&query=Ull%20de%20Llebre&query_place_id=G1aaaaaaaaaa', pos: bare['ull de llebre'].pos });
  assert.equal(bare['gid:G2aaaaaaaaaa'].noname, true);
  // A store but no Claude: what is already kept fills the entry, nothing is asked, nothing is saved.
  const saved = [];
  const keptOnly = await hostPlaces({ rows: [{ p: 'ull de llebre', list: 'eat' }], cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }], house }, { store: fakeStore(rows0(), saved), locate, near: () => { throw new Error('not asked'); }, gaz: () => { throw new Error('not asked'); } });
  assert.equal(keptOnly['ull de llebre'].phone, '977 00 00 00'); assert.equal(keptOnly['ull de llebre'].kind, 'fork'); assert.equal(keptOnly['ull de llebre'].pos, undefined);   // our own position
  assert.equal(keptOnly['gid:G2aaaaaaaaaa'].noname, true); assert.equal(saved.length, 0);
  // No Google key and no stand-in: nothing.
  assert.deepEqual(await hostPlaces({ rows: [{ p: 'x', list: 'eat' }], house }, {}), {});
});

test('placesOf: rows by list, Google cards by id only, researched cards left out', () => {
  const { rows, cards } = placesOf({ favEat: [{ p: 'Bar X', gid: 'G1aaaaaaaaaa', c: 'tapas' }, { p: '  ' }], favNight: [{ p: 'Club Y' }], favDo: 'castell, platja',
    swipes: { a: { id: 'G2aaaaaaaaaa', d: 'yes', cat: 'todo', name: 'Google name', c: 'go early' }, b: { id: 'r:castell', d: 'yes', cat: 'todo', name: 'Castell' }, c: { id: 'G3aaaaaaaaaa', d: 'no', cat: 'todo' } } });
  assert.deepEqual(rows, [{ p: 'Bar X', gid: 'G1aaaaaaaaaa', list: 'eat', c: 'tapas' }, { p: 'Club Y', list: 'eat' }, { p: 'castell', list: 'todo' }, { p: ' platja', list: 'todo' }]);
  assert.deepEqual(cards, [{ id: 'G2aaaaaaaaaa', list: 'todo', c: 'go early' }]);
});

test('kinds.json: groups, six names, icons', () => {
  const K = json('engine/src/kinds.json'), groups = json('engine/src/groups.json').groups;
  const ui = readFileSync(resolve(ROOT, 'engine/src/ui.js'), 'utf8'), block = ui.slice(ui.indexOf('const ITEM_ICON = {'));
  const icons = new Set([...block.slice(0, block.indexOf('\n};')).matchAll(/^\s+([a-z]+): P\(/gm)].map(m => m[1]));
  const MISSING = new Set([]);   // kinds with no icon of their own in the engine yet (the list's own icon is shown)
  assert.equal(Object.keys(K.eat).length, 12); assert.equal(Object.keys(K.todo).length, 21);
  for (const list of ['eat', 'todo']) for (const [k, v] of Object.entries(K[list])) {
    assert.ok(icons.has(k) || MISSING.has(k), `${list}.${k} is not an icon of ui.js`);
    assert.deepEqual(Object.keys(v.name).sort(), ['ca', 'de', 'en', 'es', 'fr', 'nl'], `${list}.${k} names`);
    for (const t of Object.values(v.name)) { assert.ok(t.trim(), `${list}.${k} has an empty name`); assert.ok(!t.includes('\u2014'), `${list}.${k} em-dash`); }
    if (list === 'todo') assert.ok(v.group in groups, `${k}: group ${v.group} is not in groups.json`); else assert.equal(v.group, undefined);
    assert.ok(v.kids === undefined || v.kids === true, `${list}.${k}: kids only when true`);
    assert.ok(v.hours === undefined || (v.hours === false && list === 'todo'), `${list}.${k}: hours only false, on a kind of todo with no door`);
    assert.ok(v.season === undefined || v.season === 'summer' || v.season === 'winter', `${list}.${k}: season only summer or winter (engine/src/season.js)`);
  }
  for (const k of MISSING) assert.ok(!icons.has(k), `${k} now has an icon: take it off the missing list`);
  assert.deepEqual(Object.keys(K.todo).filter(k => K.todo[k].kids), ['waterpark', 'themepark', 'kart', 'bowling', 'trampoline']);
  assert.deepEqual(Object.keys(K.todo).filter(k => K.todo[k].hours === false), ['beach', 'town', 'city']);
  assert.deepEqual([...Object.keys(K.eat).filter(k => K.eat[k].season).map(k => 'eat.' + k), ...Object.keys(K.todo).filter(k => K.todo[k].season).map(k => 'todo.' + k)], ['eat.beachbar', 'todo.waterpark', 'todo.beachbar']);
});

test('hostPlaces: a place read lately but never for this list gets only the match question, and keeps its last full look', async () => {
  const rows = rows0(), asked = [];
  rows.G1aaaaaaaaaa.sources = {}; rows.G1aaaaaaaaaa.tries = 1; delete rows.G1aaaaaaaaaa.facts.kind_eat;   // kept before kinds were
  const ask = async (prompt, o) => { asked.push(o.what); return '{"venue": true, "entry": null, "sure": false, "name": null, "kind": "fish"}'; };
  const geo = await hostPlaces({ rows: [{ p: 'ull de llebre', list: 'eat' }], house }, { store: fakeStore(rows), ask, locate, near, gaz: noGaz });
  assert.deepEqual(asked, ['place match']);   // no site read, no search
  assert.equal(geo['ull de llebre'].kind, 'fish'); assert.equal(geo['ull de llebre'].phone, '977 00 00 00');   // what was kept stays
  assert.equal(rows.G1aaaaaaaaaa.tried_at, fresh); assert.equal(rows.G1aaaaaaaaaa.tries, 1);
});

test('hostPlaces: a kept card is named by comparing Google\'s name with our records, and that name goes nowhere', async () => {
  const GOOGLE = 'Aqualeón Parc Aquàtic';   // what Google calls it: read, compared, dropped
  const rows = {}, saved = [], prompts = [], logs = [], asked = [];
  const ask = async (prompt, o) => { prompts.push(prompt);
    return o.what === 'place match' ? (/"Aqualeon Water Park"/.test(prompt) ? '{"venue": true, "entry": 1, "sure": true, "name": "Aqualeon", "kind": "waterpark"}' : '{"venue": true, "entry": null, "sure": false, "name": null, "kind": null}') : '{"website": null, "about": false}'; };
  const loc2 = { ...locate, name: async id => { asked.push(id); return id === 'G2aaaaaaaaaa' ? GOOGLE : 'A Place Nobody Lists'; } };
  const pins = [];
  const near2 = async (h, p) => { pins.push(...p); return { release: 'r', towns: {}, pins: { G2aaaaaaaaaa: [{ id: 'ov9', name: 'Bar Pepe', kind: 'bar', metres: 5, lat: 41.25, lng: 1.55 }, { id: 'ov2', name: 'Aqualeon Water Park', kind: 'water_park', metres: 60, lat: 41.2502, lng: 1.5502, phones: [], websites: [], socials: [] }], G3aaaaaaaaaa: [{ id: 'ov7', name: 'Hotel Sol', kind: 'hotel', metres: 20, lat: 41.1, lng: 1.4 }] } }; };
  const geo = await hostPlaces({ cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }, { id: 'G3aaaaaaaaaa', list: 'todo' }], house }, { store: fakeStore(rows, saved), ask, locate: loc2, near: near2, gaz: noGaz, log: m => logs.push(m) });
  assert.equal(geo['gid:G2aaaaaaaaaa'].name, 'Aqualeon'); assert.equal(geo['gid:G2aaaaaaaaaa'].kind, 'waterpark'); assert.equal(geo['gid:G2aaaaaaaaaa'].pos, undefined);
  assert.equal(geo['gid:G3aaaaaaaaaa'].noname, true);   // no record of that name: not guessed from the spot
  assert.deepEqual(pins.find(p => p.id === 'G2aaaaaaaaaa').names, [GOOGLE]);   // asked in three languages, the same name once;   // our own reader of Overture may see it, in memory
  for (const kept of [geo, rows, saved, prompts, logs]) assert.ok(!/Parc Aqu|Nobody Lists/.test(JSON.stringify(kept)));   // not kept, not logged, not sent to Claude
  // A card we already have a name for is not asked again; switched off, nothing is asked at all.
  asked.length = 0;
  await hostPlaces({ cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }], house }, { store: fakeStore(rows), ask, locate: loc2, near: near2, gaz: noGaz, log: () => {} });
  assert.deepEqual(asked, []);
  await hostPlaces({ cards: [{ id: 'G3aaaaaaaaaa', list: 'todo' }], house }, { store: fakeStore({}), ask, locate: loc2, near: near2, gaz: noGaz, log: () => {}, nameMatch: false });
  assert.deepEqual(asked, []);
});

// Where a fact came from, for the editor's line under "Filled in for you" (Piece B): the kept row's sources, for the fields
// the entry hands over only, never Google.
test('hostPlaces: each entry says where its facts came from (filled), and nothing when nothing was filled', async () => {
  const P = 'https://locanda.example/horari';
  const rows = {
    G1aaaaaaaaaa: { gid: 'G1aaaaaaaaaa', tried_at: fresh, facts: { kind_eat: 'fish', phone: '977 00 00 00', website: 'https://locanda.example/', hours: H, price: '20-30', book: true, lat: 41.2101, lng: 1.5101 },
      sources: { kind_eat: { from: 'site', at: '2026-11-05', page: 'https://locanda.example/carta' }, phone: { from: 'overture', at: '2026-11-01', release: 'r' }, website: { from: 'search', at: '2026-11-02', page: 'https://locanda.example/' },
        hours: { from: 'site', at: '2026-11-10', page: P }, price: { from: 'site', at: '2026-11-10', page: P }, book: { from: 'site', at: '2026-11-10', page: P }, lat: { from: 'overture', at: '2026-11-01' }, lng: { from: 'overture', at: '2026-11-01' } } },
    G2aaaaaaaaaa: { gid: 'G2aaaaaaaaaa', tried_at: fresh, facts: { kind_todo: 'beach', lat: 41.2502, lng: 1.5502 }, sources: { kind_todo: { from: 'geonames', at: '2026-11-03', ref: '1' }, lat: { from: 'geonames', at: '2026-11-03' } } },
    G3aaaaaaaaaa: { gid: 'G3aaaaaaaaaa', tried_at: fresh, facts: { kind_todo: 'castle' }, sources: { kind_todo: { from: 'claude', at: '2026-11-04' } } },
    G4aaaaaaaaaa: { gid: 'G4aaaaaaaaaa', tried_at: fresh, facts: { town: 'Calafell' }, sources: { town: { from: 'overture', at: '2026-11-04' }, kind_eat: { from: 'claude', at: '2026-11-04', none: true } } },
  };
  const loc2 = { byId: locate.byId, byWords: async w => ({ 'ull de llebre': loc.G1, 'platja': loc.G2, 'castell': loc.G3, 'can pep': loc.G4 })[w] || null };
  const geo = await hostPlaces({ rows: [{ p: 'ull de llebre', list: 'eat' }, { p: 'platja', list: 'todo' }, { p: 'castell', list: 'todo' }, { p: 'can pep', list: 'eat' }], house },
    { store: fakeStore(rows), locate: loc2, near: () => { throw new Error('not asked'); }, gaz: () => { throw new Error('not asked'); } });
  // Every source kind: the site (with the page the hours were read on), the open directory, a web search.
  assert.deepEqual(geo['ull de llebre'].filled, { at: '2026-11-10', from: { kind: 'site', phone: 'overture', url: 'search', schedule: 'site', price: 'site', book: 'site' }, page: P });
  // GeoNames' kind is not one of the editor's sources yet: left out, so nothing is said.
  assert.equal(geo.platja.kind, 'beach'); assert.equal(geo.platja.filled, undefined);
  // A kind guessed by Claude from the name alone: said as claude (the editor shows no line for it).
  assert.deepEqual(geo.castell.filled, { at: '2026-11-04', from: { kind: 'claude' } });
  // Nothing filled (a town is not one of the facts said), and Google's position never is.
  assert.equal(geo['can pep'].filled, undefined); assert.equal(geo['can pep'].pos.from, 'google');
  assert.ok(!/google/.test(JSON.stringify(Object.values(geo).map(e => e.filled || null))));
  // A place the chain looks at now: the new row's sources (Overture's phone, Claude's kind), dated today.
  const today = new Date().toISOString().slice(0, 10);
  const ask = async (prompt, o) => o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Aqualeon", "kind": "waterpark"}' : '{"website": null, "about": false}';
  const g2 = await hostPlaces({ cards: [{ id: 'G2aaaaaaaaaa', list: 'todo' }], house }, { store: fakeStore({}), ask, locate, near, gaz: noGaz, log: () => {} });
  assert.deepEqual(g2['gid:G2aaaaaaaaaa'].filled, { at: today, from: { kind: 'claude', phone: 'overture' } });
});

// A row picked on Google whose name the host left empty (the words typed to find it were a search phrase: the maker kept
// none, onboarding-site/src/placename.js) is a card of its own list: named from our directory by comparing Google's name in
// memory, its record's name searched for, never the search words; no record of that name: noname, for the editor to ask.
test('placesOf and hostPlaces: a picked row with no name is looked up like a kept card, in its own list', async () => {
  const { rows, cards } = placesOf({ favEat: [{ p: '', gid: 'G2aaaaaaaaaa', c: 'Sunday lunch' }, { p: ' ', gid: 'r:research' }, { p: '' }], favDo: [{ p: '', gid: 'G3aaaaaaaaaa' }] });
  assert.deepEqual(rows, []);
  assert.deepEqual(cards, [{ id: 'G2aaaaaaaaaa', list: 'eat', c: 'Sunday lunch' }, { id: 'G3aaaaaaaaaa', list: 'todo' }]);
  const prompts = [], saved = [];
  const ask = async (prompt, o) => { prompts.push(prompt); return o.what === 'place match' ? '{"venue": true, "entry": 1, "sure": true, "name": "Restaurant la Societat", "kind": "fork"}' : '{"website": null, "about": false}'; };
  const loc2 = { ...locate, name: async id => id === 'G2aaaaaaaaaa' ? 'Restaurant La Societat' : 'Somewhere Google Knows' };
  const near2 = async (h, p) => ({ release: 'r', towns: { G2aaaaaaaaaa: 'La Múnia' }, pins: { G2aaaaaaaaaa: [{ id: 'ov5', name: 'Restaurant la Societat', kind: 'restaurant', metres: 8, lat: 41.2503, lng: 1.5503, phones: [], websites: [], socials: [] }], G3aaaaaaaaaa: [] } });
  const geo = await hostPlaces({ rows, cards, house, town: 'La Bisbal del Penedès' }, { store: fakeStore({}, saved), ask, locate: loc2, near: near2, gaz: noGaz, log: () => {} });
  const e = geo['gid:G2aaaaaaaaaa'];
  assert.equal(e.name, 'Restaurant la Societat'); assert.equal(e.town, 'La Múnia'); assert.equal(e.kind, 'fork');   // eat's kinds: its own list
  assert.ok(prompts.some(x => /Sunday lunch/.test(x)));
  assert.equal(geo['gid:G3aaaaaaaaaa'].noname, true); assert.equal(geo['gid:G3aaaaaaaaaa'].name, undefined);
  assert.ok(!/Somewhere Google Knows/.test(JSON.stringify([geo, saved, prompts])));
});
