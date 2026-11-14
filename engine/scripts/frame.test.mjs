// The module frame (engine/src/modules/frame.js, README.md beside it): Home's placements, their sizes, no holes.
// Pure, no guide needed.   node --test 'engine/scripts/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultArrangement, resolve, pack, place, holes, runs, check, thing } from '../src/modules/frame.js';

// Sections as content/sections.json has them (Ca La Kimberly's order), each switchable.
const S = {
  house: { id: 'house', kind: 'house', group: 'house', status: 'live' },
  garbage: { id: 'garbage', kind: 'garbage', group: 'house', status: 'live' },
  message: { id: 'message', kind: 'info', group: 'house', status: 'live' },
  emergency: { id: 'emergency', kind: 'contacts', group: 'house', status: 'live' },
  transport: { id: 'transport', kind: 'transport', group: 'house', status: 'live' },
  markets: { id: 'markets', kind: 'markets', group: 'area', status: 'live' },
  restaurants: { id: 'restaurants', kind: 'spots', group: 'area', status: 'live' },
  todo: { id: 'todo', kind: 'spots', group: 'area', status: 'live' },
  nightlife: { id: 'nightlife', kind: 'spots', group: 'area', status: 'live' },
  events: { id: 'events', kind: 'events', group: 'area', status: 'live' }
};
const guide = (ids, more = {}) => ({ sections: ids.map(i => S[i]), highlights: [], map: true, transportCard: null, ...more });
const CLK = guide(['house', 'garbage', 'message', 'emergency', 'transport', 'markets', 'restaurants', 'todo', 'events'], {
  highlights: [{ id: 'shop', wide: true }, { id: 'pizza', wide: false }, { id: 'transport', wide: false }], transportCard: 'transport' });
const brief = list => list.map(p => `${p.kind === 'map' ? 'map' : p.id}:${p.size}`).join(' ');
const drawn = R => ({ house: R.house.map(r => `${r.type}[${brief(r.items)}]`).join(' '), area: R.area.map(r => `${r.type}[${brief(r.items)}]`).join(' ') });

// Today's Home, read from views/home.js as it was before the frame (sectionGrid, 13 Nov 2026), written again here as the
// reference: the order of the tiles and cards, and which are wide (class "wide") or tall (the mosaic's first child).
function before(g) {
  const live = x => x.status === 'live';
  const group = n => g.sections.filter(x => x.group === n && (live(x) || x.kind === 'markets'));
  const house = group('house').filter(x => x.kind !== 'house' && !(x.kind === 'transport' && g.transportCard)), area = group('area');
  const wideHouse = house.filter(x => x.kind === 'garbage' && live(x));
  const mosaic = area.filter(x => x.kind !== 'events'), alone = i => i === mosaic.length - 1 && i >= 3 && (i - 3) % 2 === 0;
  const smallHouse = house.filter(x => !wideHouse.includes(x));
  const garbageWide = x => x.kind === 'garbage';   // the rubbish widget's own class is "wide" (modules/garbage/widget.js)
  const tiles = [...mosaic.map((x, i) => ({ id: x.id, wide: alone(i) || garbageWide(x) })), ...(g.map ? [{ id: 'map', wide: true }] : [])];
  return {
    house: [...wideHouse.map(x => `${x.id}:wide`), ...smallHouse.map(x => `${x.id}:half`)].join(' '),
    area: [...g.highlights.map(q => `${q.id}:${q.wide ? 'wide' : 'half'}`), ...tiles.map((x, i) => `${x.id}:${i === 0 && !x.wide ? 'tall' : x.wide ? 'wide' : 'half'}`)].join(' ')
  };
}

test('default: Ca La Kimberly as drawn today', () => {
  const d = defaultArrangement(CLK);
  assert.equal(brief(d.house), 'garbage:wide message:half emergency:half');                // the house page and the transport card are not tiles
  assert.equal(brief(d.area), 'shop:wide pizza:half transport:half markets:tall restaurants:half todo:half map:wide');   // events: in What's on
  assert.deepEqual(drawn(resolve(null, CLK)), { house: 'tiles[garbage:wide message:half emergency:half]', area: 'highlights[shop:wide pizza:half transport:half] tiles[markets:tall restaurants:half todo:half map:wide]' });
});

test('default: equals today\'s order and sizes for every shape of guide (sections on and off, cards, map)', () => {
  const optional = ['garbage', 'message', 'emergency', 'transport', 'restaurants', 'todo', 'nightlife', 'events'];
  let n = 0;
  for (let mask = 0; mask < 1 << optional.length; mask++) for (const markets of [true, false]) for (const map of [true, false]) for (const cards of [0, 1, 2]) {
    const ids = ['house', ...optional.filter((_, i) => mask & (1 << i)), ...(markets ? ['markets'] : [])].sort((a, b) => Object.keys(S).indexOf(a) - Object.keys(S).indexOf(b));
    const highlights = [[], [{ id: 'taxi', wide: false }], [{ id: 'shop', wide: true }, { id: 'pizza', wide: false }]][cards];
    const g = guide(ids, { map, highlights });
    const d = defaultArrangement(g), b = before(g);
    // One difference, wanted: with no tile around the house the map was the mosaic's first child, so it took the tall
    // rules on top of its wide ones (two rows, a 30 px title). The map offers wide only.
    if (b.area.includes('map:tall')) { assert.equal(brief(d.area), b.area.replace('map:tall', 'map:wide')); n++; continue; }
    assert.equal(brief(d.house), b.house, ids.join());
    assert.equal(brief(d.area), b.area, ids.join());
    n++;
  }
  assert.equal(n, 256 * 2 * 2 * 3);
});

test('default: a section that is not live has no tile (markets keep theirs); nightlife alone in its row is wide', () => {
  const g = guide(['garbage', 'message', 'markets', 'restaurants', 'todo', 'nightlife'], { map: false });
  g.sections = g.sections.map(s => (s.id === 'message' ? { ...s, status: 'soon' } : s.id === 'markets' ? { ...s, status: 'soon' } : s));
  const d = defaultArrangement(g);
  assert.equal(brief(d.house), 'garbage:wide');
  assert.equal(brief(d.area), 'markets:tall restaurants:half todo:half nightlife:wide');
});

test('default: Getting around shown as a card is not repeated as a tile, in either group', () => {
  const g = guide(['message', 'markets', 'transport'], { highlights: [{ id: 'transport', wide: true }], transportCard: 'transport' });
  g.sections = g.sections.map(s => (s.id === 'transport' ? { ...s, group: 'area' } : s));
  assert.equal(brief(defaultArrangement(g).area), 'transport:wide markets:tall map:wide');
});

test('place: the grid\'s own row-by-row placement', () => {
  assert.deepEqual(place(['tall', 'half', 'half', 'wide']).cells, [[0, 1], [0, 2], [3, 3]]);
  assert.deepEqual(place(['half', 'wide', 'half']).cells, [[0, null], [1, 1], [2, null]]);
  assert.deepEqual(place(['half', 'tall', 'half', 'half']).cells, [[0, 1], [2, 1], [3, null]]);
  assert.deepEqual(place(['half', 'tall', 'wide']).cells, [[0, 1], [null, 1], [2, 2]]);
  assert.deepEqual(place(['half', 'half', 'tall', 'half']).cells, [[0, 1], [2, 3], [2, null]]);
  assert.deepEqual(holes(['tall', 'wide']), [{ r: 0, c: 1 }, { r: 1, c: 1 }]);
});

test('pack: no holes, the three known cases', () => {
  const sizes = l => pack(l.map((size, i) => ({ id: 'x' + i, size }))).map(x => x.size).join(' ');
  assert.equal(sizes(['half', 'half', 'half']), 'half half wide');        // three half tiles at the house
  assert.equal(sizes(['half']), 'wide');                                   // a single half card
  assert.equal(sizes(['tall', 'half', 'wide']), 'half half wide');        // a tall with one tile beside it, then the map
});

test('pack: many cases, never a hole, nothing that had no hole is changed, sizes only grow', () => {
  const S3 = ['half', 'wide', 'tall'], rank = { half: 0, tall: 1, wide: 2 };
  const all = n => (n === 0 ? [[]] : all(n - 1).flatMap(l => S3.map(s => [...l, s])));
  let n = 0;
  for (let len = 1; len <= 7; len++) for (const l of all(len)) {
    const out = pack(l.map((size, i) => ({ id: i, size }))).map(x => x.size);
    assert.deepEqual(holes(out), [], l.join(' '));
    if (!holes(l).length) assert.deepEqual(out, l, 'a run with no hole stays as it is: ' + l.join(' '));
    out.forEach((s, i) => { if (s !== l[i]) assert.ok(l[i] === 'half' ? s === 'wide' : l[i] === 'tall' && s !== 'tall', l.join(' ')); });
    n++;
  }
  assert.equal(n, 3 + 9 + 27 + 81 + 243 + 729 + 2187);
  const sizes = l => pack(l.map((size, i) => ({ id: i, size }))).map(x => x.size).join(' ');
  assert.equal(sizes(['tall']), 'wide');                                   // nothing beside it
  assert.equal(sizes(['half', 'tall']), 'half half');                      // one beside it
  assert.equal(sizes(['tall', 'half', 'half']), 'tall half half');         // two beside it: kept
  assert.equal(sizes(['tall', 'half', 'half', 'half']), 'tall half half wide');
  assert.equal(sizes(['half', 'wide', 'half', 'half']), 'wide wide half half');
  assert.equal(sizes(['tall', 'tall']), 'tall tall');                      // two tall side by side leave no hole
  assert.equal(sizes(['tall', 'half', 'tall']), 'tall half half');         // the second tall had one cell beside it
  assert.equal(sizes(['half', 'half', 'tall']), 'half half wide');
});

test('resolve: the guide\'s own arrangement, sizes as asked when offered', () => {
  const A = { house: [{ kind: 'section', id: 'emergency', size: 'wide' }, { kind: 'section', id: 'garbage', size: 'wide' }, { kind: 'section', id: 'message', size: 'half' }],
    area: [{ kind: 'section', id: 'restaurants', size: 'wide' }, { kind: 'highlight', id: 'pizza', size: 'wide' }, { kind: 'section', id: 'markets', size: 'tall' }, { kind: 'section', id: 'todo', size: 'half' }, { kind: 'map', size: 'wide' }, { kind: 'highlight', id: 'shop', size: 'half' }, { kind: 'highlight', id: 'transport', size: 'half' }] };
  assert.deepEqual(drawn(resolve(A, CLK)), {
    house: 'tiles[emergency:wide garbage:wide message:wide]',                           // message alone in its row: wide
    // Markets tall with only todo beside it (the map then takes a row of its own): half, so todo and markets share a row.
    area: 'tiles[restaurants:wide] highlights[pizza:wide] tiles[markets:half todo:half map:wide] highlights[shop:half transport:half]'
  });
});

test('resolve: unknown ids, sections switched off or not live, sizes not offered, doubles, wrong widgets', () => {
  const g = { ...CLK, sections: CLK.sections.map(s => (s.id === 'todo' ? { ...s, status: 'soon' } : s)) };
  const A = { house: [
    { kind: 'section', id: 'nope', size: 'half' },                  // unknown: skipped
    { kind: 'section', id: 'house', size: 'half' },                 // the house page: no tile
    { kind: 'section', id: 'transport', size: 'half' },             // shown as a card: no tile
    { kind: 'section', id: 'garbage', size: 'half' },               // rubbish offers wide only: wide
    { kind: 'section', id: 'message', size: 'huge' },               // unknown size: its default, half
    { kind: 'section', id: 'message', size: 'wide' },               // second mention: dropped
    { kind: 'section', id: 'emergency', size: 'half', widget: 'live' },   // emergency has no live widget: skipped, then added back
    { kind: 'section', id: 'nightlife', size: 'half' }              // off in this guide: skipped
  ], area: [
    { kind: 'map', size: 'half' },                                  // the map offers wide only
    { kind: 'section', id: 'todo', size: 'half' },                  // not live: skipped
    { kind: 'highlight', id: 'shop', size: 'tall' },                // a card is never tall: its default, wide
    { kind: 'highlight', id: 'ghost', size: 'half' },               // unknown card
    { kind: 'section', id: 'markets', size: 'tall', widget: 'entry' }
  ] };
  const R = resolve(A, g);
  // Emergency, not validly placed, comes back where the default puts it: after message. The other cards come back after
  // shop, restaurants after markets; markets, tall with one tile beside it, becomes half.
  assert.equal(drawn(R).house, 'tiles[garbage:wide message:half emergency:half]');
  assert.equal(drawn(R).area, 'tiles[map:wide] highlights[shop:wide pizza:half transport:half] tiles[markets:half restaurants:half]');
});

test('resolve: what the arrangement does not mention is added where the default puts it', () => {
  // Only the map named, in the house group: everything else comes back in its own group, as the default orders it, the
  // house tiles before the map.
  const R = resolve({ house: [{ kind: 'map', size: 'wide' }], area: [] }, CLK);
  assert.equal(drawn(R).house, 'tiles[garbage:wide message:half emergency:half map:wide]');
  assert.equal(drawn(R).area, 'highlights[shop:wide pizza:half transport:half] tiles[markets:tall restaurants:half todo:half]');
  // Markets moved after todo; restaurants not named: it comes back after the tile before it in the default (markets),
  // alone in its row, so wide; the cards first, the map last.
  const R2 = resolve({ house: [], area: [{ kind: 'section', id: 'todo', size: 'half' }, { kind: 'section', id: 'markets', size: 'half' }] }, CLK);
  assert.equal(drawn(R2).area, 'highlights[shop:wide pizza:half transport:half] tiles[todo:half markets:half restaurants:wide map:wide]');
  // A group missing from the file: its things come back in their default order.
  assert.deepEqual(drawn(resolve({ area: [] }, CLK)), drawn(resolve(null, CLK)));
  // Events are not on Home by default (What's on); placed by the guide, they are.
  const R3 = resolve({ house: [], area: [{ kind: 'section', id: 'events', size: 'wide' }] }, CLK);
  assert.equal(drawn(R3).area, 'highlights[shop:wide pizza:half transport:half] tiles[events:wide markets:tall restaurants:half todo:half map:wide]');
});

test('resolve: a card left out for the season is not drawn, and the run packs without it', () => {
  const g = { ...CLK, highlights: [{ id: 'shop', wide: true }, { id: 'transport', wide: false }] };
  assert.equal(drawn(resolve(null, g)).area, 'highlights[shop:wide transport:wide] tiles[markets:tall restaurants:half todo:half map:wide]');
});

test('runs: highlights and tiles in runs of their own, each packed', () => {
  const r = runs([{ kind: 'highlight', id: 'a', size: 'half' }, { kind: 'section', id: 'b', size: 'half' }, { kind: 'section', id: 'c', size: 'half' }, { kind: 'highlight', id: 'd', size: 'half' }, { kind: 'highlight', id: 'e', size: 'half' }]);
  assert.deepEqual(r.map(x => `${x.type}:${brief(x.items)}`), ['highlights:a:wide', 'tiles:b:half c:half', 'highlights:d:half e:half']);
});

test('thing: who offers which sizes and widgets', () => {
  assert.deepEqual(thing({ kind: 'section', id: 'garbage' }, CLK).sizes, ['wide']);
  assert.equal(thing({ kind: 'section', id: 'garbage' }, CLK).widget, 'live');
  assert.deepEqual(thing({ kind: 'section', id: 'restaurants' }, CLK).sizes, ['half', 'wide', 'tall']);
  assert.equal(thing({ kind: 'section', id: 'restaurants' }, CLK).widget, 'entry');
  assert.deepEqual(thing({ kind: 'highlight', id: 'pizza' }, CLK).sizes, ['half', 'wide']);
  assert.deepEqual(thing({ kind: 'map' }, CLK).sizes, ['wide']);
  assert.equal(thing({ kind: 'map' }, { ...CLK, map: false }), null);
});

test('check: plain messages for content/home.json', () => {
  assert.deepEqual(check({ house: [], area: [] }, CLK), []);
  assert.deepEqual(check({ _doc: 'x', house: [{ kind: 'section', id: 'garbage', size: 'wide', widget: 'live' }], area: [{ kind: 'map', size: 'wide' }] }, CLK), []);
  assert.deepEqual(check([], CLK), ['home.json: must be an object with "house" and "area"']);
  const m = check({ house: [{ kind: 'section', id: 'garbage', size: 'half' }, { kind: 'section', id: 'nope' }, { kind: 'section', id: 'house' }, { kind: 'section', id: 'transport' }, { kind: 'tile', id: 'x' }, { kind: 'section', id: 'message', widget: 'live' }, { kind: 'section', id: 'garbage', size: 'wide' }],
    area: [{ kind: 'highlight', id: 'ghost' }, { kind: 'highlight', id: 'shop', size: 'tall' }, { kind: 'map', size: 'giant' }], extra: [] }, CLK);
  assert.deepEqual(m, [
    'home.json: unknown group "extra" (only "house" and "area")',
    'home.json house[0]: section "garbage" is not offered "half" (only wide)',
    'home.json house[1]: no section "nope" in sections.json (or its module is off)',
    'home.json house[2]: section "house" is the house page, which the welcome card opens: it has no tile',
    'home.json house[3]: section "transport" is shown as a highlight (transport.json "tile"): place it as a highlight',
    'home.json house[4]: unknown kind "tile" (section, highlight or map)',
    'home.json house[5]: section "message" has no "live" widget (it is "entry")',
    'home.json house[6]: section "garbage" is placed twice',
    'home.json area[0]: no highlight "ghost" (an item of quick.json, or the transport section with a "tile")',
    'home.json area[1]: highlight "shop" is not offered "tall" (only half, wide)',
    'home.json area[2]: unknown size "giant" (half, wide or tall)'
  ]);
  assert.deepEqual(check({ house: [] }, CLK), ['home.json: the group "area" is missing']);
});
