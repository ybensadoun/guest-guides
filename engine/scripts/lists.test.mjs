// The order of every list of places and the switch that chooses it (engine/src/lists.js), shared by the Markets page and the
// host's lists (Eat and drink, Things to do, Nightlife). Written from the guide's behaviour on 14 Nov 2026 (byDistance was
// the markets module's, sorted and sortRow its data.js and page.js). lists.js reads the guest's choice (state.js), their
// distance (geo.js), the words (i18n.js) and esc (ui.js), which only Vite can load: here small stand-ins take their place,
// the guest's choice one the test can change. Nothing is written.   node --test engine/scripts/lists.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const STUB = {
  './state.js': 'export const st = { sort: "house", me: null, locState: "" };',
  './geo.js': 'export const kmMe = m => (m.me ?? null);',
  './i18n.js': 'export const t = k => ({ fromHouse: "From the house", fromMe: "From me" })[k] || k;',
  './ui.js': 'export const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");'
};
const url = spec => 'data:text/javascript,' + encodeURIComponent(STUB[spec]);
registerHooks({ resolve: (spec, ctx, next) => (/\/engine\/src\/lists\.js$/.test(ctx.parentURL || '') && STUB[spec] ? { url: url(spec), shortCircuit: true } : next(spec, ctx)) });
const { byDistance, sorted, sortRow } = await import('../src/lists.js');
const { st } = await import(url('./state.js'));

const P = (id, km, town, me) => ({ id, km, town, me });
const ids = l => l.map(m => m.id);
const L = [P('nowhere', null, 'Albinyana', 1), P('hall', 8, 'El Vendrell', 40), P('bisbal', 3, 'La Bisbal del Penedès', null), P('vendrell', 8, 'El Vendrell', 40), P('calafell', 8, 'Calafell', 2)];

test('byDistance: from the house or from the guest, unknown distances last, then by town, the list itself untouched', () => {
  assert.deepEqual(ids(byDistance(L, m => m.km)), ['bisbal', 'calafell', 'hall', 'vendrell', 'nowhere']);   // 3, 8 Calafell, 8 El Vendrell (x2, kept in order), none
  assert.deepEqual(ids(L), ['nowhere', 'hall', 'bisbal', 'vendrell', 'calafell']);
  assert.deepEqual(ids(byDistance(L, m => m.me)), ['nowhere', 'calafell', 'hall', 'vendrell', 'bisbal']);
  assert.deepEqual(byDistance([], m => m.km), []);
});

test('sorted: from the house, unless the guest chose "From me" and their position is known', () => {
  st.sort = 'house'; st.me = null;
  assert.deepEqual(ids(sorted(L)), ['bisbal', 'calafell', 'hall', 'vendrell', 'nowhere']);
  st.sort = 'me';                                                        // chosen, but no position yet: still from the house
  assert.deepEqual(ids(sorted(L)), ['bisbal', 'calafell', 'hall', 'vendrell', 'nowhere']);
  st.me = { lat: 41.2, lng: 1.5 };                                       // known: by the guest's own distances
  assert.deepEqual(ids(sorted(L)), ['nowhere', 'calafell', 'hall', 'vendrell', 'bisbal']);
  st.sort = 'house'; st.me = null;
});

test('sortRow: the two choices, the one in use pressed, and a note only when there is one', () => {
  st.sort = 'house'; st.locState = '';
  const a = sortRow();
  assert.match(a, /data-sort="house" aria-pressed="true">From the house</);
  assert.match(a, /data-sort="me" aria-pressed="false">From me</);
  assert.doesNotMatch(a, /sortnote/);
  st.sort = 'me'; st.locState = 'Location <off>';
  const b = sortRow();
  assert.match(b, /data-sort="me" aria-pressed="true"/);
  assert.match(b, /<span class="sortnote" role="status">Location &lt;off><\/span>/);
  st.sort = 'house'; st.locState = '';
});
