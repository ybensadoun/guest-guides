// Reading a place's own website again (worker/reread-places.mjs): when a place is due (weekly near its season, own or
// assumed from its kind, else every 28 days), what a reading changes (only what the place does not have), and one reading
// through the chain with a stand-in for Claude. No network: fetch itself refuses.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDue, readResult, readPlace, placesOf, noHours, KINDS } from '../reread-places.mjs';
import { NET } from '../place-facts.mjs';

globalThis.fetch = async () => { throw new Error('no network in tests'); };
NET.lookup = async () => [];   // no name is looked up either: a website given is then not opened
const D = (y, m, d) => new Date(y, m - 1, d, 12);
const H = [{ days: ['tue', 'wed'], open: '10:00', close: '14:00' }];
const bar = (more = {}) => ({ id: 'quijote', name: { en: 'Quijote Beach' }, icon: 'beachbar', town: 'Creixell', gid: 'Gquij0te0000a', tags: [], ...more });

test('readDue: only places with no hours, never read first, weekly from 60 days before the season to its end, else 28 days', () => {
  assert.deepEqual(KINDS, { beachbar: 'summer', waterpark: 'summer' });
  assert.equal(readDue(bar({ schedule: H }), { now: D(2026, 11, 12) }), null);   // hours of ours: not read here
  assert.equal(readDue(bar({ always: true }), { now: D(2026, 11, 12) }), null);
  assert.ok(noHours(bar({ schedule: [{ days: [], open: '09:00', close: '14:00' }] })));   // a row with no day is no hours
  assert.deepEqual(readDue(bar(), { now: D(2026, 11, 12) }), { due: true, every: 28, why: 'never read' });
  // An assumed summer place (06-01): every 28 days in November, weekly from 2 April (60 days before) to 30 September.
  const read = at => bar({ filled: { readAt: at } });
  assert.equal(readDue(read('2026-10-20'), { now: D(2026, 11, 12) }).due, false);   // 23 days
  assert.equal(readDue(read('2026-10-15'), { now: D(2026, 11, 12) }).due, true);    // 28 days
  assert.deepEqual(readDue(read('2026-03-28'), { now: D(2026, 4, 1) }), { due: false, every: 28, why: 'read 4 days ago, every 28 days' });   // 61 days before
  assert.equal(readDue(read('2026-03-26'), { now: D(2026, 4, 2) }).every, 7);     // 60 days before: weekly
  assert.equal(readDue(read('2026-03-26'), { now: D(2026, 4, 2) }).due, true);
  assert.equal(readDue(read('2026-07-10'), { now: D(2026, 7, 16) }).due, false);  // in season, 6 days
  assert.equal(readDue(read('2026-07-09'), { now: D(2026, 7, 16) }).due, true);   // 7 days
  assert.equal(readDue(read('2026-09-24'), { now: D(2026, 10, 1) }).every, 28);   // the day after the season
  // Its own season wins over the kind's; "Open all year" or no season: every 28 days.
  assert.equal(readDue(bar({ season: { from: '04-01', to: '10-31' }, filled: { readAt: '2026-01-25' } }), { now: D(2026, 2, 1) }).every, 7);
  assert.equal(readDue(bar({ tags: ['allyear'], filled: { readAt: '2026-05-20' } }), { now: D(2026, 5, 25) }).every, 28);
  assert.equal(readDue({ name: { en: 'Bar X' }, icon: 'fork', filled: { readAt: '2026-05-20' } }, { now: D(2026, 5, 25) }).every, 28);
  // A winter place over the new year (its own season 12-01 to 03-31): weekly from 2 October.
  assert.equal(readDue({ icon: 'x', season: { from: '12-01', to: '03-31' }, filled: { readAt: '2026-09-25' } }, { now: D(2026, 10, 2) }).every, 7);
  assert.equal(readDue({ icon: 'x', season: { from: '12-01', to: '03-31' }, filled: { readAt: '2027-02-20' } }, { now: D(2027, 3, 1) }).every, 7);
});

test('readResult: hours fill a place with none, else a season; nothing the place has is replaced; the date is kept', () => {
  const now = D(2026, 11, 12);
  // A season found: kept with its source and page.
  const a = bar();
  assert.deepEqual(readResult(a, { season: { from: '06-01', to: '09-30' }, hours: null, page: 'https://quijote.example/' }, now), ['season']);
  assert.deepEqual(a.season, { from: '06-01', to: '09-30' });
  assert.deepEqual(a.filled, { readAt: '2026-11-12', at: '2026-11-12', page: 'https://quijote.example/', from: { season: 'site' } });
  // Read again, nothing new: only the date moves; a season the host set is never replaced.
  const b = bar({ season: { from: '05-15', to: '10-15' }, filled: { at: '2026-06-01', from: { phone: 'overture' } } });
  assert.deepEqual(readResult(b, { season: { from: '06-01', to: '09-30' } }, now), []);
  assert.deepEqual(b.season, { from: '05-15', to: '10-15' });
  assert.deepEqual(b.filled, { at: '2026-06-01', from: { phone: 'overture' }, readAt: '2026-11-12' });
  // Hours found: they fill the place, and its own season moves onto the rows that carry none.
  const c = bar({ season: { from: '05-15', to: '10-15' } });
  assert.deepEqual(readResult(c, { hours: [{ days: ['mon', 'tue'], open: '10:00', close: '20:00' }], season: { from: '06-01', to: '09-30' } }, now), ['hours']);
  assert.deepEqual(c.schedule, [{ days: ['mon', 'tue'], open: '10:00', close: '20:00', from: '05-15', to: '10-15' }]);
  assert.equal(c.season, undefined); assert.deepEqual(c.filled.from, { schedule: 'site' });
  // "Open all year" (the tag allyear): no season added. Hours the place has: nothing filled.
  const d = bar({ tags: ['allyear'] });
  assert.deepEqual(readResult(d, { season: { from: '06-01', to: '09-30' } }, now), []); assert.equal(d.season, undefined);
  const e = bar({ schedule: H });
  assert.deepEqual(readResult(e, { hours: [{ days: ['sun'], open: '09:00', close: '12:00' }] }, now), []); assert.deepEqual(e.schedule, H);
  // Junk from the reading is dropped.
  const f = bar();
  assert.deepEqual(readResult(f, { season: { from: 'June', to: '09-30' }, hours: [{ days: ['xx'], open: '25:00' }] }, now), []); assert.equal(f.season, undefined);
});

test('placesOf and readPlace: the host lists only; one reading with the guide\'s own website, stand-in Claude', async () => {
  const files = { restaurants: { items: [bar()] }, nightlife: { items: [{ id: 'club' }] }, todo: { items: [{ id: 'aqualeon' }] }, markets: { markets: [{ id: 'm' }] }, quick: { items: [{ id: 'shop' }] } };
  assert.deepEqual(placesOf(files).map(x => [x.file, x.list, x.it.id]), [['restaurants', 'eat', 'quijote'], ['nightlife', 'eat', 'club'], ['todo', 'todo', 'aqualeon']]);
  const asked = [];
  const ask = async (prompt, o) => { asked.push([o.what, prompt]); if (o.meter) o.meter.usd = (o.meter.usd || 0) + 0.01;
    return o.what === 'place match' ? '{"venue": true, "entry": null, "sure": false, "name": null, "kind": "beachbar"}' : '{"website": "https://quijote.example/", "about": true, "hours": null, "season": {"from": "06-01", "to": "09-30"}}'; };
  const meter = {}, { place, res } = await readPlace(bar(), 'eat', ask, { meter });
  assert.deepEqual(place, { name: 'Quijote Beach', town: 'Creixell', list: 'eat', country: 'Spain' });
  assert.deepEqual(asked.map(a => a[0]), ['place match', 'site facts']);
  assert.match(asked[1][1], /Search the web for the official website of "Quijote Beach" in Creixell/);   // no website in the guide: a search
  assert.deepEqual(res.season, { from: '06-01', to: '09-30' }); assert.ok(meter.usd > 0);
  assert.ok(!asked.some(a => /google/i.test(a[0])));
  // The guide's own website goes to the chain as the host's page (read first).
  const { place: p2 } = await readPlace(bar({ url: 'https://quijote.example/' }), 'eat', ask, { meter: {} });
  assert.equal(p2.website, 'https://quijote.example/');
});
