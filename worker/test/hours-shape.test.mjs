// A research's opening hours in the guide's one shape before they are written (worker/hours-shape.mjs): the rule the
// worker always had for markets and places, and since 22 Nov 2026 for the contacts' groups, whose hours were written as
// the research answered ("days": "mon-fri", "sat", "mon", "wed") and blanked the Emergencies page of a guide built that
// morning. Made-up contacts in the real shapes.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normSchedule, normGroups } from '../hours-shape.mjs';

test('the contacts research: days in words become lists of days, in every group', () => {
  const o = normGroups({ groups: [
    { id: 'urgent', items: [{ id: '112', name: { en: 'Emergencies' }, phone: '112', always: true }] },
    { id: 'health', items: [
      { id: 'ph', name: { en: 'Pharmacy (made up)' }, schedule: [{ days: 'mon-fri', open: '09:30', close: '13:30' }, { days: 'mon-fri', open: '17:00', close: '20:00' }, { days: 'sat', open: '09:30', close: '13:30' }] },
      { id: 'hc', name: { en: 'Health centre (made up)' }, schedule: [{ days: 'mon', open: '9:00', close: '14:00' }, { days: 'wed', open: '15.00', close: '20:00' }] },
      { id: 'duty', name: { en: 'Pharmacies on duty (made up)' }, web: 'https://example.org' }] }] });
  const [ph, hc, duty] = o.groups[1].items;
  assert.deepEqual(ph.schedule, [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], open: '09:30', close: '13:30' }, { days: ['mon', 'tue', 'wed', 'thu', 'fri'], open: '17:00', close: '20:00' }, { days: ['sat'], open: '09:30', close: '13:30' }]);
  assert.deepEqual(hc.schedule, [{ days: ['mon'], open: '09:00', close: '14:00' }, { days: ['wed'], open: '15:00', close: '20:00' }]);
  assert.equal('schedule' in duty, false); assert.equal('schedule' in o.groups[0].items[0], false);
  for (const it of o.groups.flatMap(g => g.items)) for (const r of it.schedule || []) assert.ok(Array.isArray(r.days) && r.days.every(d => /^(mon|tue|wed|thu|fri|sat|sun)$/.test(d)));
});

test('hours that cannot be read: no schedule left, the words kept for the host', () => {
  const it = normSchedule({ id: 'x', schedule: [{ days: 'weekdays', hours: 'mornings' }] });
  assert.equal('schedule' in it, false); assert.equal(it.hours.en, 'weekdays, mornings'); assert.deepEqual(it.flags, ['check']);
  assert.equal('schedule' in normSchedule({ id: 'y', schedule: 'mon-fri 9-14' }), false);
});

test('a list already right is left as it is; an answer without groups is not touched', () => {
  const sch = [{ days: ['mon', 'tue'], open: '08:00', close: '20:00' }];
  assert.deepEqual(normSchedule({ id: 'z', schedule: JSON.parse(JSON.stringify(sch)) }).schedule, sch);
  for (const o of [{}, { groups: null }, { groups: [null, { id: 'a' }, { id: 'b', items: [null, 'x'] }] }, null]) assert.doesNotThrow(() => normGroups(o));
});

test('the worker brings every research answer through it, the contacts\' groups too', () => {
  const src = readFileSync(new URL('../guide-worker.mjs', import.meta.url), 'utf8');
  assert.match(src, /import \{ normSchedule, normGroups \} from '\.\/hours-shape\.mjs'/);
  assert.match(src, /forEach\(normSchedule\); normGroups\(o\); writeFileSync/);
});
