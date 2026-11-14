// The markets module's rules (engine/src/modules/markets/plan.js, README.md beside it): a guide's file read as markets, the
// kinds Home and the page start from, which markets are held on a day, their order (engine/src/lists.js byDistance, shared
// with the host's lists and tested in lists.test.mjs), which ask for Google's line. Written from the guide's behaviour on
// 14 Nov 2026 (views/home.js todaysMarkets and views/markets.js before the module).
// schedule.js reads its words from i18n.js, which only Vite can load: here a stand-in gives the English file's words, as in
// schedule.test.mjs, so the real schedule.js runs as it is; lists.js's own imports get small stand-ins (as in
// lists.test.mjs). Nothing is written.   node --test engine/scripts/markets-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const EN = JSON.parse(readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'));
const I18N = `const EN = ${JSON.stringify(EN)};
export const t = (k, p) => Object.entries(p || {}).reduce((s, [a, b]) => s.split('{' + a + '}').join(b), EN[k] || k);
export const tx = v => (v && typeof v === 'object' ? v.en : v || ''); export const locale = () => 'en-GB'; export const typo = s => s;`;
const KINDS = readFileSync(new URL('../src/kinds.json', import.meta.url), 'utf8');
const fromSchedule = ctx => /\/engine\/src\/schedule\.js$/.test(ctx.parentURL || '');
const LISTS = { './state.js': 'export const st = {};', './geo.js': 'export const kmMe = () => null;', './i18n.js': 'export const t = k => k;', './ui.js': 'export const esc = s => s;' };
const fromLists = ctx => /\/engine\/src\/lists\.js$/.test(ctx.parentURL || '');
registerHooks({ resolve: (spec, ctx, next) => (fromSchedule(ctx) && spec === './i18n.js' ? { url: 'data:text/javascript,' + encodeURIComponent(I18N), shortCircuit: true }
  : fromSchedule(ctx) && spec === './kinds.json' ? { url: 'data:text/javascript,' + encodeURIComponent('export default ' + KINDS), shortCircuit: true }
  : fromLists(ctx) && LISTS[spec] ? { url: 'data:text/javascript,' + encodeURIComponent(LISTS[spec]), shortCircuit: true } : next(spec, ctx)) });
const { readMarkets, noneFound, defaultKinds, WEEKLY, marketsOn } = await import('../src/modules/markets/plan.js');
const { byDistance } = await import('../src/lists.js');

const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
// A schedule row as content.js slots() reads it: d weekdays (0 = Sunday), o/c open and close, nth the week of the month.
const row = (d, nth = 0, more = {}) => ({ d, o: '08:00', c: '14:00', nth, m: false, ...more });
const M = (id, cat, km, town, s) => ({ id, cat, km, town, s });
// A small area: Saturday street markets, a covered hall every day but Sunday, a flea market on the 2nd Sunday, an antiques
// market on the last Sunday, another on the 4th, a summer night market, and a market with no distance known.
const LIST = [
  M('vendrell-sat', 'street', 8, 'El Vendrell', [row([6])]),
  M('bisbal-wed', 'street', 3, 'La Bisbal del Penedès', [row([3])]),
  M('calafell-sat', 'street', 8, 'Calafell', [row([6])]),
  M('hall', 'covered', 8, 'El Vendrell', [row([1, 2, 3, 4, 5, 6])]),
  M('flea-2nd', 'flea', 12, 'Cunit', [row([0], 2)]),
  M('antiques-last', 'antiques', 20, 'Vilafranca', [row([0], -1)]),
  M('antiques-4th', 'antiques', 25, 'Sitges', [row([0], 4)]),
  M('night', 'street', 10, 'Coma-ruga', [row([5], 0, { o: '19:00', c: '23:59', from: '06-15', to: '09-15' })]),
  M('nowhere', 'street', null, 'Albinyana', [row([6])])
];
const CATS = ['covered', 'street', 'flea', 'antiques'];
const ids = l => l.map(m => m.id);
const home = day => byDistance(marketsOn(LIST, day, m => defaultKinds(CATS).includes(m.cat)), m => m.km);   // data.js todaysMarkets
const page = (day, cats) => marketsOn(LIST, day, m => cats.has(m.cat));                                    // the page's filter (st.cats)

test('readMarkets: every market a place of kind "market"; the kinds offered are those with a market', () => {
  const file = { categories: ['covered', 'street', 'flea', 'events'], markets: [
    { id: 'a', category: 'street', town: 'La Bisbal', km_from_house: 3, schedule: [{ days: ['wed'] }] },
    { id: 'b', category: 'covered', town: 'El Vendrell', group: 'Vendrell', km_from_house: 8, schedule: [] }] };
  const seen = [];
  const helpers = { located: x => (seen.push(x.id), x.id === 'b' ? { ...x, nomap: true, km_from_house: null } : x), slots: s => (s || []).map(x => x.days.length), slug: s => s.toLowerCase() };
  const { cats, markets } = readMarkets(file, helpers);
  assert.deepEqual(cats, ['covered', 'street']);                       // flea and events have no market: not offered
  assert.deepEqual(seen, ['a', 'b']);                                  // each position looked at once (one that ran out has none)
  assert.deepEqual(markets[0], { ...file.markets[0], kind: 'market', cat: 'street', km: 3, groupKey: 'La Bisbal', groupSlug: 'la bisbal', s: [1] });
  assert.equal(markets[1].km, null); assert.equal(markets[1].nomap, true);
  assert.equal(markets[1].groupKey, 'Vendrell');                        // group, when there is one, groups the map's pins
  assert.deepEqual(readMarkets({ markets: [] }, helpers), { cats: [], markets: [] });
});

test('noneFound: a guide whose file lists no market has no markets module', () => {
  assert.equal(noneFound(undefined), true); assert.equal(noneFound({}), true); assert.equal(noneFound({ markets: [] }), true);
  assert.equal(noneFound({ markets: [{ id: 'a' }] }), false);
});

test('defaultKinds: every kind but the covered market halls, in the file\'s order', () => {
  assert.deepEqual(defaultKinds(CATS), ['street', 'flea', 'antiques']);
  assert.deepEqual(defaultKinds(['covered']), []);
  assert.deepEqual(defaultKinds(['street', 'events']), ['street', 'events']);
});

test('Home counts the day\'s markets of the default kinds, nearest first', () => {
  assert.deepEqual(ids(home(D(2026, 11, 14))), ['calafell-sat', 'vendrell-sat', 'nowhere']);   // Saturday: no hall; a tie at 8 km by town; no distance last
  assert.deepEqual(ids(home(D(2026, 11, 18))), ['bisbal-wed']);                               // Wednesday
  assert.deepEqual(ids(home(D(2026, 11, 16))), []);                                           // Monday: only the hall, which Home leaves out
  assert.deepEqual(ids(home(D(2026, 11, 8))), ['flea-2nd']);                                  // the 2nd Sunday
  assert.deepEqual(ids(home(D(2026, 11, 22))), ['antiques-4th']);                             // the 4th Sunday of a month with five
  assert.deepEqual(ids(home(D(2026, 11, 29))), ['antiques-last']);                            // its last Sunday
  assert.deepEqual(ids(home(D(2027, 2, 28))), ['antiques-last', 'antiques-4th']);             // February 2027: the 4th Sunday is the last
  assert.deepEqual(ids(home(D(2026, 11, 13))), []);                                           // a Friday in November: the night market is out of season
  assert.deepEqual(ids(home(D(2026, 7, 17))), ['night']);                                     // a Friday in July: in season
  assert.deepEqual(ids(home(D(2026, 9, 18))), []);                                            // after its season (to 15 Sep)
});

test('the page\'s filters do not change Home', () => {
  const sat = D(2026, 11, 14);
  assert.deepEqual(ids(page(sat, new Set(CATS))), ['vendrell-sat', 'calafell-sat', 'hall', 'nowhere']);   // all kinds: the hall too, in the file's order
  assert.deepEqual(ids(page(sat, new Set(['covered']))), ['hall']);
  assert.deepEqual(ids(page(sat, new Set(['flea']))), []);
  assert.deepEqual(ids(home(sat)), ['calafell-sat', 'vendrell-sat', 'nowhere']);                          // whatever the page holds
});

test('WEEKLY: only a street market or a market hall asks for Google\'s line', () => {
  assert.deepEqual([...WEEKLY].sort(), ['covered', 'street']);
  for (const c of ['flea', 'antiques', 'events', 'fair']) assert.equal(WEEKLY.has(c), false, c);
});
