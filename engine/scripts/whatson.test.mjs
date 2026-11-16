// What's on's rules (engine/src/modules/whatson/plan.js, README.md beside it): what the agenda takes from the feeds the
// modules give it, in which order, and where it cuts. Written on 17 Nov 2026, when What's on stopped naming the markets
// and the events and began to read any module's feed; the feeds here are made up, shaped as README.md, "The feed", says.
// Pure: nothing stands in, nothing is written.   node --test engine/scripts/whatson.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayPart, soonPart, laterPart, TODAY_MAX, RECURRING_MAX, LATER_MAX, SOON } from '../src/modules/whatson/plan.js';

// A feed with n rows today named after it, and the days and later items given.
const feed = (name, n, o = {}) => ({
  today: { rows: Array.from({ length: n }, (_, i) => `${name}${i + 1}`), on: o.on || 0, live: !!o.live, ...(o.more ? { more: k => `+${k} ${name}` } : {}) },
  fold: !!o.fold,
  day: d => ({ rows: (o.days || {})[d] || [], where: ((o.days || {})[d] || []).map(r => 'town of ' + r) }),
  count: k => `${k} ${name}`,
  later: o.later || [],
  name
});

test('today: the modules in their order, a module with a line for the rest cut at three, another never cut', () => {
  const m = feed('m', 5, { more: true, on: 2, live: true }), e = feed('e', 4);
  const p = todayPart([m, e]);
  assert.deepEqual(p.rows, ['m1', 'm2', 'm3', '+2 m', 'e1', 'e2', 'e3', 'e4']);
  assert.equal(TODAY_MAX, 3);
  assert.deepEqual(todayPart([feed('m', 3, { more: true })]).rows, ['m1', 'm2', 'm3']);   // exactly three: no line for the rest
  assert.deepEqual(todayPart([e, m]).rows.slice(0, 5), ['e1', 'e2', 'e3', 'e4', 'm1']);   // the order is the feeds' order
});

test('today: open now is the sum, and Today is live when one module still has something on or to come', () => {
  assert.deepEqual(todayPart([feed('m', 2, { on: 2, live: true }), feed('e', 1)]), { rows: ['m1', 'm2', 'e1'], on: 2, live: true });
  assert.equal(todayPart([feed('m', 2), feed('e', 1, { live: true })]).live, true);
  assert.equal(todayPart([feed('m', 2), feed('e', 1)]).live, false);
  assert.deepEqual(todayPart([]), { rows: [], on: 0, live: false });
  assert.deepEqual(todayPart([feed('m', 0, { more: true }), feed('e', 0)]).rows, []);
});

test('the next days: tomorrow and the day after, each module\'s part in the modules\' order, a module with nothing left out', () => {
  assert.deepEqual(SOON, [1, 2]);
  const m = feed('m', 0, { fold: true, days: { 1: ['a', 'b'], 2: ['c'] } }), e = feed('e', 0, { days: { 2: ['x'] } });
  const s = soonPart([m, e], n => 'day+' + n);
  assert.deepEqual(s.days.map(d => [d.n, d.date, d.parts.map(p => [p.feed.name, p.rows])]), [[1, 'day+1', [['m', ['a', 'b']]]], [2, 'day+2', [['m', ['c']], ['e', ['x']]]]]);
  assert.deepEqual(s.days[0].parts[0].where, ['town of a', 'town of b']);
  // The heading counts each module over both days, in the modules' order; a module with nothing is not counted.
  assert.deepEqual(s.counts.map(c => c.feed.count(c.n)), ['3 m', '1 e']);
  assert.deepEqual(soonPart([m, feed('e', 0)], n => n).counts.map(c => c.feed.count(c.n)), ['3 m']);
  assert.deepEqual(soonPart([], n => n), { days: [{ n: 1, date: 1, parts: [] }, { n: 2, date: 2, parts: [] }], counts: [] });
});

test('coming up: in date order, at most two monthly things and five lines, one date before a monthly one on the same day', () => {
  assert.deepEqual([RECURRING_MAX, LATER_MAX], [2, 5]);
  const rec = (k, html) => ({ k, html, recurring: true }), one = (k, html) => ({ k, html });
  const m = feed('m', 0, { later: [rec('2026-12-06', 'M1'), rec('2026-11-28', 'M2'), rec('2026-11-20', 'M3')] });
  const e = feed('e', 0, { later: [one('2026-11-27', 'E1'), one('2026-11-28', 'E2'), one('2026-12-12', 'E3')] });
  // Only the first two monthly things a module names are taken (M3, although sooner, is not), then all sorted by date;
  // on 28 Nov the event comes before the monthly market, whatever the modules' order.
  assert.deepEqual(laterPart([m, e]).map(x => x.html), ['E1', 'E2', 'M2', 'M1', 'E3']);
  assert.deepEqual(laterPart([e, m]).map(x => x.html), ['E1', 'E2', 'M2', 'M1', 'E3']);
  const many = feed('e', 0, { later: ['01', '02', '03', '04', '05', '06'].map(d => one('2026-12-' + d, 'E' + d)) });
  assert.deepEqual(laterPart([m, many]).map(x => x.html), ['M2', 'E01', 'E02', 'E03', 'E04']);
  assert.deepEqual(laterPart([feed('x', 0), { today: { rows: [] } }]), []);   // a feed with nothing later, or none said
});
