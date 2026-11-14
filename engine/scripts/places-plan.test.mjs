// The places module's rules (engine/src/modules/places/plan.js, README.md beside it): the host's lists read as places,
// whether a place is shown today, whether it is open now, later today or not known, the filters of a list and its order.
// Written from the guide's behaviour on 14 Nov 2026 (views/section.js and content.js before the module).
// schedule.js reads its words from i18n.js, which only Vite can load: here a stand-in gives the English file's words, as in
// schedule.test.mjs, so the real schedule.js runs as it is. Nothing is written.   node --test engine/scripts/places-plan.test.mjs
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
registerHooks({ resolve: (spec, ctx, next) => (fromSchedule(ctx) && spec === './i18n.js' ? { url: 'data:text/javascript,' + encodeURIComponent(I18N), shortCircuit: true }
  : fromSchedule(ctx) && spec === './kinds.json' ? { url: 'data:text/javascript,' + encodeURIComponent('export default ' + KINDS), shortCircuit: true } : next(spec, ctx)) });
const { readSpots, shownNow, stateOf, FEATS, FEAT_SECS, listPlan } = await import('../src/modules/places/plan.js');

const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
const SAT = D(2026, 11, 14, 11, 30), MON = D(2026, 11, 16, 15, 30);
// A row of hours as content.js slots() reads it: d weekdays (0 = Sunday), o/c open and close.
const row = (d, o, c, more = {}) => ({ d, o, c, nth: 0, m: false, ...more });
const ids = l => l.map(m => m.id);
const byKm = l => l.slice().sort((a, b) => a.km - b.km);   // lists.js sorted, from the house, for these places
// Places of a list, on Saturday 14 Nov 2026 at 11:30: open now, later today, finished, not today, open all day, no hours of
// ours, a beach bar (summer assumed from its kind), a place with its own winter season.
const SP = {
  open: { id: 'open', km: 5, s: [row([6], '09:00', '14:00')], group: 'fun', tags: ['dogs'] },
  later: { id: 'later', km: 2, s: [row([6], '13:00', '16:00')], group: 'beach', setMenus: [{ kind: 'menuDia', price: 15 }] },
  done: { id: 'done', km: 1, s: [row([6], '08:00', '10:00')], group: 'fun', tags: ['kidsfun'] },
  monday: { id: 'monday', km: 3, s: [row([1], '09:00', '20:00')], group: 'sights', tags: ['dogs', 'veggie'] },
  always: { id: 'always', km: 9, s: [], always: true, group: 'beach', tags: ['dogs'] },
  unknown: { id: 'unknown', km: 4, s: [], icon: 'castle', group: 'other', setMenus: [{ kind: 'tasting7', price: 60 }] },
  beachbar: { id: 'beachbar', km: 6, s: [], icon: 'beachbar' },
  winter: { id: 'winter', km: 7, s: [], season: { from: '12-01', to: '03-31' } }
};
const LIST = Object.values(SP);
const labelled = { fun: 'red', beach: 'blue', sights: 'purple' };
const plan = (all, choice = {}, now = SAT) => listPlan(all, { id: 'todo', labelled, ...choice }, byKm, now);

test('readSpots: every list of items gives its places; the host\'s lists are not utilities', () => {
  const sections = [
    { id: 'restaurants', kind: 'spots', status: 'live', color: 'restaurants', data: { items: [{ id: 'a', town: 'Creixell', km_from_house: 3, schedule: [{ days: ['sat'] }] }] } },
    { id: 'todo', kind: 'spots', status: 'live', data: { items: [{ id: 'b', town: 'Sitges', mapGroup: 'Garraf', cat: 'beach', utility: true }] } },
    { id: 'garbage', kind: 'garbage', status: 'live', color: 'glass', data: { items: [{ id: 'glass', town: 'La Bisbal' }] } },
    { id: 'markets', kind: 'markets', status: 'live', data: { items: [{ id: 'x', town: 'X' }] } },
    { id: 'events', kind: 'events', status: 'live', data: { items: [{ id: 'y', town: 'Y' }] } },
    { id: 'nightlife', kind: 'spots', status: 'soon', data: { items: [{ id: 'z', town: 'Z' }] } },
    { id: 'message', kind: 'info', status: 'live', data: { blocks: [] } }
  ];
  const sp = readSpots(sections, { slots: s => (s || []).map(x => x.days.length), slug: s => s.toLowerCase() });
  assert.deepEqual(ids(sp), ['restaurants-a', 'todo-b', 'garbage-glass']);   // markets, events, a list still to come, no items: none
  assert.deepEqual(sp[0], { id: 'restaurants-a', town: 'Creixell', km_from_house: 3, schedule: [{ days: ['sat'] }], kind: 'spot', section: 'restaurants', utility: false, cat: 'restaurants', km: 3, groupKey: 'Creixell', groupSlug: 'creixell', s: [1] });
  assert.equal(sp[1].utility, true);                                           // a place may say it is one
  assert.equal(sp[1].cat, 'beach');                                            // its own category first
  assert.equal(sp[1].groupKey, 'Garraf');                                      // mapGroup groups the map's pins instead of the town
  assert.equal(sp[2].utility, true); assert.equal(sp[2].cat, 'glass');         // another section's point: a utility, in its section's colour
  assert.equal(readSpots([{ id: 'todo', kind: 'spots', status: 'live', data: { items: [{ id: 'c', town: 'T' }] } }], { slots: () => [], slug: s => s })[0].cat, 'todo');   // no colour: the section's id
});

test('shownNow: a place out of its season and opening in more than 30 days is not shown', () => {
  assert.equal(shownNow(SP.beachbar, SAT), false);                 // summer assumed from its kind: back 2 May
  assert.equal(shownNow(SP.beachbar, D(2026, 5, 2)), true);        // 30 days before 1 Jun
  assert.equal(shownNow(SP.beachbar, D(2026, 5, 1)), false);
  assert.equal(shownNow(SP.winter, SAT), true);                    // opens 1 Dec, within 30 days
  assert.equal(shownNow({ ...SP.beachbar, tags: ['allyear'] }, SAT), true);
  assert.equal(shownNow(SP.unknown, SAT), true);
});

test('stateOf: open now, later today, closed or not today, not known', () => {
  const st = m => stateOf(m, SAT);
  assert.deepEqual(LIST.map(st), [0, 1, 2, 2, 0, 3, 2, 2]);       // a season and no hours: closed out of season...
  assert.equal(stateOf(SP.beachbar, D(2026, 7, 4, 11, 30)), 3);    // ...not known in season
  assert.equal(stateOf(SP.later, D(2026, 11, 14, 13, 0)), 0);
  assert.equal(stateOf(SP.later, D(2026, 11, 14, 16, 0)), 2);
  assert.equal(stateOf(SP.monday, MON), 0);
  assert.equal(stateOf({ id: 'night', s: [row([6], '22:00', '03:00')] }, SAT), 1);   // a close after midnight
});

test('FEATS: the feature filters, and which list offers which', () => {
  assert.deepEqual(FEAT_SECS, { restaurants: ['menuDia', 'tasting', 'dogs', 'veggie'], todo: ['kidsfun', 'dogs'] });
  assert.deepEqual(LIST.filter(FEATS.menuDia).map(x => x.id), ['later']);
  assert.deepEqual(LIST.filter(FEATS.tasting).map(x => x.id), ['unknown']);   // any tasting menu ("tasting7")
  assert.deepEqual(LIST.filter(FEATS.dogs).map(x => x.id), ['open', 'monday', 'always']);
  assert.deepEqual(LIST.filter(FEATS.veggie).map(x => x.id), ['monday']);
  assert.deepEqual(LIST.filter(FEATS.kidsfun).map(x => x.id), ['done']);
});

test('listPlan: Any time, open now first, then later today, then the rest, each block by distance', () => {
  const p = plan(LIST);
  assert.deepEqual(p.groups, ['fun', 'beach', 'sights']);          // only groups with a label, in the order they come
  assert.equal(p.gsel, 'all'); assert.equal(p.timed, true); assert.equal(p.ofsel, 'any');
  assert.deepEqual(p.feats, ['kidsfun', 'dogs']);                  // todo's filters that some place has
  assert.equal(p.nNow, 2); assert.equal(p.nLater, 1);              // what we know only
  assert.deepEqual(ids(p.list), ['open', 'always', 'later', 'done', 'monday', 'unknown', 'beachbar', 'winter']);   // the not known among the closed
  assert.equal(p.k3, -1);
});

test('listPlan: Open now and Opens later today keep the places whose hours we do not know, after the others', () => {
  const now = plan(LIST, { openf: 'now' });
  assert.equal(now.ofsel, 'now');
  assert.deepEqual(ids(now.list), ['open', 'always', 'unknown']);
  assert.equal(now.k3, 2);                                        // "Hours not known, check before going" from here
  const later = plan(LIST, { openf: 'later' });
  assert.deepEqual(ids(later.list), ['later', 'unknown']);
  assert.equal(later.k3, 1);
  const none = plan([SP.done, SP.unknown], { openf: 'later' });  // nothing later today: back to Any time
  assert.equal(none.ofsel, 'any'); assert.equal(none.k3, -1);
  assert.deepEqual(ids(none.list), ['done', 'unknown']);
});

test('listPlan: a list where no place has hours has no time filters and keeps its order by distance', () => {
  const p = plan([SP.winter, SP.unknown, SP.always], { openf: 'now' });
  assert.equal(p.timed, false); assert.equal(p.ofsel, 'any');
  assert.deepEqual(ids(p.list), ['unknown', 'winter', 'always']);
});

test('listPlan: a quick-filter group, the feature filters (all of them at once), and choices that no longer apply', () => {
  const beach = plan(LIST, { sgroup: 'beach' });
  assert.equal(beach.gsel, 'beach');
  assert.deepEqual(ids(beach.list), ['always', 'later']);
  assert.equal(plan(LIST, { sgroup: 'other' }).gsel, 'all');      // a group with no label is no filter
  const dogs = plan(LIST, { featf: ['dogs'] });
  assert.deepEqual(ids(dogs.list), ['open', 'always', 'monday']);
  assert.deepEqual(dogs.fsel, ['dogs']);
  const two = plan(LIST, { featf: ['dogs', 'kidsfun'] });
  assert.deepEqual(ids(two.list), []);                             // both at once: none has both
  assert.deepEqual(plan(LIST, { featf: ['veggie'] }).fsel, []);    // not one of todo's filters: ignored
  const r = listPlan(LIST, { id: 'restaurants', labelled, featf: ['veggie'] }, byKm, SAT);
  assert.deepEqual(r.feats, ['menuDia', 'tasting', 'dogs', 'veggie']);
  assert.deepEqual(ids(r.list), ['monday']);
  assert.deepEqual(listPlan(LIST, { id: 'nightlife', labelled }, byKm, SAT).feats, []);   // a list with none
  const gNow = plan(LIST, { sgroup: 'fun', openf: 'now' });         // the counts follow the group and the features
  assert.equal(gNow.nNow, 1); assert.equal(gNow.nLater, 0);
  assert.deepEqual(ids(gNow.list), ['open']);
});
