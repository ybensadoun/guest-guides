// The events module's rules (engine/src/modules/events/plan.js, README.md beside it): where an event's date stands now,
// which events are upcoming and in which order, and which one Home's tile names. Written from the guide's behaviour on
// 14 Nov 2026 (engine/src/events.js and views/home.js before the module); an event of today stays for the day since
// 15 Nov 2026 (Yohann: "Proposal 1"). Pure: nothing stands in, nothing is written.
// node --test engine/scripts/events-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evState, upcoming, nextEvent, listedMonth, MOMENT_KINDS, MOMENT_MIN } from '../src/modules/events/plan.js';

const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
const SAT = D(2026, 11, 14, 11, 30);
const day = (start, end = start, more = {}) => ({ start, end, ...more });

test('evState: ahead, today before it starts, on now, a day with no time, past days gone', () => {
  assert.deepEqual(evState(day('2026-11-16'), SAT), { days: 2, on: false });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '18:00' }), SAT), { days: 0, on: false, at: '18:00' });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { time: '08:00', until: '12:00' }), SAT), { days: 0, on: true });
  assert.deepEqual(evState(day('2026-11-14'), SAT), { days: 0, on: false, today: true });                               // no time: only "Today"
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { until: '14:00' }), SAT), { days: 0, on: false, today: true });   // an end but no start: still only "Today"
  assert.deepEqual(evState(day('2026-11-12', '2026-11-15'), SAT), { days: -2, on: true });                             // a fair over several days
  assert.deepEqual(evState(day('2026-11-12', '2026-11-13'), SAT), { over: true });
});

test('evState: an event of today stays for the day, in one set of words: Today, On now, Ended (15 Nov 2026)', () => {
  const at = (time, more = {}) => day('2026-11-14', '2026-11-14', { time, ...more });
  // A stated end that has passed: "Ended" with its hour, until midnight; gone the next day.
  assert.deepEqual(evState(at('08:00', { until: '11:00' }), SAT, 'festa'), { days: 0, on: false, ended: '11:00' });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-14', { until: '11:00' }), SAT), { days: 0, on: false, ended: '11:00' });
  assert.deepEqual(evState(at('08:00', { until: '11:00' }), D(2026, 11, 15, 0, 5)), { over: true });
  // A start and no end, a moment (human towers, a parade, fireworks, a film, a play): on for two hours, then ended, with no
  // hour (it is assumed) and said as assumed.
  for (const k of MOMENT_KINDS) {
    assert.deepEqual(evState(at('10:00'), SAT, k), { days: 0, on: true, assumed: 'short' }, k);
    assert.deepEqual(evState(at('09:30'), SAT, k), { days: 0, on: false, ended: true, assumed: 'short' }, k);
    assert.deepEqual(evState(at('08:00'), D(2026, 11, 14, 23, 59), k), { days: 0, on: false, ended: true, assumed: 'short' }, k);
  }
  assert.deepEqual(MOMENT_KINDS, ['castells', 'parade', 'fireworks', 'film', 'theatre']); assert.equal(MOMENT_MIN, 120);
  // A start and no end, any other kind (a village festa, a fair, a kind the guide does not know, none): on until midnight.
  for (const k of ['festa', 'fair', 'food', 'music', 'religious', 'unknown', undefined]) {
    assert.deepEqual(evState(at('08:00'), SAT, k), { days: 0, on: true, assumed: 'day' }, String(k));
    assert.deepEqual(evState(at('08:00'), D(2026, 11, 14, 23, 59), k), { days: 0, on: true, assumed: 'day' }, String(k));
  }
  assert.deepEqual(evState(at('08:00'), D(2026, 11, 15, 0, 5), 'festa'), { over: true });
  // A stated end is never assumed: human towers that say when they end are on until then.
  assert.deepEqual(evState(at('08:00', { until: '13:00' }), SAT, 'castells'), { days: 0, on: true });
  // Several days: on until the stated end of its last day, or until midnight when it gives none; nothing assumed.
  assert.deepEqual(evState(day('2026-11-13', '2026-11-14', { until: '11:00' }), SAT), { days: -1, on: false, ended: '11:00' });
  assert.deepEqual(evState(day('2026-11-13', '2026-11-14', { until: '20:00' }), SAT), { days: -1, on: true });
  assert.deepEqual(evState(day('2026-11-13', '2026-11-14', { time: '08:00' }), D(2026, 11, 14, 22), 'castells'), { days: -1, on: true });
  assert.deepEqual(evState(day('2026-11-14', '2026-11-15', { time: '10:00' }), SAT, 'castells'), { days: 0, on: true });
  // An end before its start is after midnight: on from its start to the end of the day.
  assert.deepEqual(evState(at('10:00', { until: '02:00' }), SAT), { days: 0, on: true });
});

test('upcoming: each event\'s next date not past, soonest first, then by start time; today\'s ended ones after today\'s others', () => {
  const items = [
    { id: 'fair', dates: [day('2026-11-12', '2026-11-13'), day('2027-11-12', '2027-11-13')] },   // this year's is over: next year's
    { id: 'late', dates: [day('2026-11-14', '2026-11-14', { time: '20:00' })] },
    { id: 'early', type: 'castells', dates: [day('2026-11-14', '2026-11-14', { time: '10:30' })] },
    { id: 'towers', type: 'castells', dates: [day('2026-11-14', '2026-11-14', { time: '09:00' })] },   // a moment, two hours ago: ended
    { id: 'gone', dates: [day('2026-10-01')] },
    { id: 'none' },
    { id: 'notime', dates: [day('2026-11-14')] },
    { id: 'done', dates: [day('2026-11-14', '2026-11-14', { time: '08:00', until: '11:00' }), day('2026-11-21')] },
    { id: 'tomorrow', dates: [day('2026-11-15')] }
  ];
  const u = upcoming(items, SAT);
  assert.deepEqual(u.map(x => x.e.id), ['notime', 'early', 'late', 'done', 'towers', 'tomorrow', 'fair']);   // no time counts as 0:00
  assert.equal(u[6].o.start, '2027-11-12');
  assert.equal(u[1].on, true); assert.equal(u[1].assumed, 'short'); assert.equal(u[2].at, '20:00'); assert.equal(u[3].ended, '11:00'); assert.equal(u[4].ended, true);
  // The next day the ended one is gone, and the event shows its following date.
  assert.equal(upcoming(items, D(2026, 11, 15)).find(x => x.e.id === 'done').o.start, '2026-11-21');
  assert.deepEqual(upcoming(undefined, SAT), []);
});

test('nextEvent: today\'s event as long as it is not known to be over, else the soonest date ahead', () => {
  const items = [
    { id: 'b', name: 'B', dates: [day('2026-12-08')] },
    { id: 'a', name: 'A', dates: [day('2026-11-14', '2026-11-14', { time: '08:00', until: '11:00' }), day('2026-11-28')] },   // ended at 11:00
    { id: 'c', name: 'C', dates: [day('2026-11-01', '2026-11-02'), day('2026-11-20')] }
  ];
  // 11:30: A has ended (the page keeps it, marked), so the tile names what comes next.
  const n = nextEvent(items, SAT);
  assert.equal(n.e.id, 'c'); assert.equal(n.o.start, '2026-11-20'); assert.equal(n.now, undefined);
  assert.equal(upcoming(items, SAT)[0].ended, '11:00');
  // 9:00: A is on, the tile says "Today"; so does an event that started and gave no end (a festa: on all day), and one with
  // no time; human towers that started more than two hours ago are over, and the tile names what is next.
  assert.deepEqual(nextEvent(items, D(2026, 11, 14, 9)), { e: items[1], o: items[1].dates[0], now: true });
  assert.equal(nextEvent([{ id: 's', type: 'festa', dates: [day('2026-11-14', '2026-11-14', { time: '08:00' })] }, ...items], SAT).e.id, 's');
  assert.equal(nextEvent([{ id: 't', type: 'castells', dates: [day('2026-11-14', '2026-11-14', { time: '08:00' })] }, ...items], SAT).e.id, 'c');
  assert.equal(nextEvent([{ id: 'd', dates: [day('2026-11-14')] }, ...items], SAT).now, true);
  // A fair of up to three days is "Today" on each of them; one that starts today comes before it.
  const fair = { id: 'f', dates: [day('2026-11-13', '2026-11-15')] };
  assert.equal(nextEvent([fair], SAT).now, true);
  assert.equal(nextEvent([fair, { id: 'd', dates: [day('2026-11-14')] }], SAT).e.id, 'd');
  // A longer one (a Christmas market on for a month) is "Today" only the day it starts: after that the tile names what is next.
  const xmas = { id: 'x', dates: [day('2026-11-12', '2026-12-23')] };
  assert.equal(nextEvent([xmas], D(2026, 11, 12)).now, true);
  assert.equal(nextEvent([xmas, items[0]], SAT).e.id, 'b');
  assert.equal(nextEvent([xmas], SAT), undefined);
  // The date ahead is the soonest of all the dates of all events, A's own next one included.
  assert.equal(nextEvent([items[0], items[1]], SAT).o.start, '2026-11-28');
  assert.equal(nextEvent([{ id: 'y', dates: [day('2026-12-24'), day('2026-11-20')] }], SAT).o.start, '2026-11-20');
  assert.equal(nextEvent([{ id: 'x', dates: [day('2026-01-01')] }], SAT), undefined);
  assert.equal(nextEvent(undefined, SAT), undefined);
});

test('listedMonth: an event that has already started is under this month, never under a past one (19 Nov 2026)', () => {
  const ev = (id, start, end = start, more = {}) => ({ id, type: 'tradition', dates: [day(start, end, more)] });
  const items = [ev('nativity', '2026-11-28', '2027-01-10'), ev('fair', '2026-11-28', '2026-12-23'), ev('towers', '2026-12-13', '2026-12-13', { time: '13:00' }), ev('kings', '2027-01-05'), ev('oil', '2026-11-27', '2026-11-28')];
  const months = now => upcoming(items, now).map(x => `${x.e.id} ${listedMonth(x, now)}`);
  // Before they start: each under the month it starts in.
  assert.deepEqual(months(D(2026, 11, 19)), ['oil 2026-11', 'nativity 2026-11', 'fair 2026-11', 'towers 2026-12', 'kings 2027-01']);
  // Running, the same month: still November.
  assert.deepEqual(months(D(2026, 11, 30)), ['nativity 2026-11', 'fair 2026-11', 'towers 2026-12', 'kings 2027-01']);
  // 1 Dec: the two that began in November are first on the page, under December, with December's own.
  assert.deepEqual(months(D(2026, 12, 1)), ['nativity 2026-12', 'fair 2026-12', 'towers 2026-12', 'kings 2027-01']);
  // January: the nativity still runs, under January 2027, before the Three Kings of the same month.
  assert.deepEqual(months(D(2027, 1, 3)), ['nativity 2027-01', 'kings 2027-01']);
  // Today's event, also once it has ended, is under this month.
  assert.deepEqual(months(D(2026, 12, 13, 16)), ['nativity 2026-12', 'fair 2026-12', 'towers 2026-12', 'kings 2027-01']);
  // The months never go backwards down the page.
  for (const now of [D(2026, 11, 19), D(2026, 11, 30), D(2026, 12, 1), D(2026, 12, 31, 23, 59), D(2027, 1, 3)]) {
    const m = upcoming(items, now).map(x => listedMonth(x, now));
    assert.deepEqual(m, [...m].sort(), 'months in order on ' + now.toDateString());
  }
});
