// The events module's rules (engine/src/modules/events/plan.js, README.md beside it): where an event's date stands now,
// which events are upcoming and in which order, and which one Home's tile names. Written from the guide's behaviour on
// 14 Nov 2026 (engine/src/events.js and views/home.js before the module). Pure: nothing stands in, nothing is written.
// node --test engine/scripts/events-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evState, upcoming, nextEvent } from '../src/modules/events/plan.js';

const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
const SAT = D(2026, 11, 14, 11, 30);
const day = (start, end = start, more = {}) => ({ start, end, ...more });

test('evState: ahead, today before it starts, on now, a day with no time, finished', () => {
  assert.deepEqual(evState(day('2026-11-16'), SAT), { days: 2, on: false });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '18:00' }), SAT), { days: 0, on: false, at: '18:00' });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '10:00' }), SAT), { days: 0, on: true });            // about three hours
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '08:00' }), SAT), { over: true });                   // 8:00 + 3 h < 11:30
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '08:00', until: '12:00' }), SAT), { days: 0, on: true });
  assert.deepEqual(evState(day('2026-11-14'), SAT), { days: 0, on: false, today: true });                               // no time: only "Today"
  assert.deepEqual(evState(day('2026-11-12', '2026-11-15'), SAT), { days: -2, on: true });                             // a fair over several days
  assert.deepEqual(evState(day('2026-11-12', '2026-11-13'), SAT), { over: true });
  assert.deepEqual(evState(day('2026-11-13', '2026-11-14', { until: '11:00' }), SAT), { over: true });                  // its last day, past "until"
});

test('upcoming: each event\'s next date not ended, soonest first, then by start time', () => {
  const items = [
    { id: 'fair', dates: [day('2026-11-12', '2026-11-13'), day('2027-11-12', '2027-11-13')] },   // this year's is over: next year's
    { id: 'late', dates: [day('2026-11-14', '2026-11-14', { time: '20:00' })] },
    { id: 'early', dates: [day('2026-11-14', '2026-11-14', { time: '10:30' })] },
    { id: 'gone', dates: [day('2026-10-01')] },
    { id: 'none' },
    { id: 'notime', dates: [day('2026-11-14')] }
  ];
  const u = upcoming(items, SAT);
  assert.deepEqual(u.map(x => x.e.id), ['notime', 'early', 'late', 'fair']);   // no time counts as 0:00
  assert.equal(u[3].o.start, '2027-11-12');
  assert.equal(u[1].on, true); assert.equal(u[2].at, '20:00');
  assert.deepEqual(upcoming(undefined, SAT), []);
});

test('nextEvent: the soonest of each event\'s first date not ended before today, whatever the hour', () => {
  const items = [
    { id: 'b', name: 'B', dates: [day('2026-12-08')] },
    { id: 'a', name: 'A', dates: [day('2026-11-14', '2026-11-14', { time: '08:00' })] },   // finished at 11:00, still today's: named
    { id: 'c', name: 'C', dates: [day('2026-11-01', '2026-11-02'), day('2026-11-20')] }
  ];
  assert.equal(nextEvent(items, SAT).e.id, 'a');
  assert.equal(upcoming(items, SAT)[0].e.id, 'c');                 // the page has already dropped it
  assert.equal(nextEvent(items, D(2026, 11, 15)).o.start, '2026-11-20');
  assert.equal(nextEvent([{ id: 'x', dates: [day('2026-01-01')] }], SAT), undefined);
  assert.equal(nextEvent(undefined, SAT), undefined);
  // The first date in the file that has not ended counts, not the earliest: dates are written in order.
  assert.equal(nextEvent([{ id: 'y', dates: [day('2026-12-24'), day('2026-11-20')] }], SAT).o.start, '2026-12-24');
});
