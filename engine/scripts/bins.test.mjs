// What goes out and when, for the rubbish tile and page (engine/src/bins.js): pure, no guide needed.
//   node --test 'engine/scripts/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planOf, hourText } from '../src/bins.js';

// A guide the maker built: organic collected on Monday and Thursday, packaging on Tuesday, paper on Wednesday, no daily bin.
const DAYS = { 1: ['organic'], 2: ['packaging'], 3: ['paper'], 4: ['organic'] }, on = d => DAYS[d] || [];
// A guide with a bin that goes out every evening, as Ca La Kimberly's red bin.
const DAILY = d => [...(DAYS[d] || []), 'sanitary'];
const at = (day, h, m = 0) => new Date(2026, 10, 8 + day, h, m);   // 8 Nov 2026 is a Sunday: day 0 = Sunday ... 6 = Saturday

test('planOf: an evening shows what is collected the next morning, and only that', () => {
  assert.deepEqual(planOf(at(0, 18, 45), on, NaN), { mode: 'tonight', day: 1, list: ['organic'], collectedToday: [] });   // Sunday evening: Monday's organic
  assert.deepEqual(planOf(at(5, 18, 45), on, NaN), { mode: 'tonight', day: 6, list: [], collectedToday: [] });            // Friday evening: nothing on Saturday, so nothing tonight
  assert.deepEqual(planOf(at(6, 21, 0), on, 360), { mode: 'tonight', day: 0, list: [], collectedToday: [] });             // Saturday evening: nothing on Sunday; Monday's bins are not shown yet
});

test('planOf: before this morning\'s collection its bins are still to go out; with nothing this morning it is already this evening\'s plan', () => {
  assert.deepEqual(planOf(at(1, 5, 0), on, 360), { mode: 'now', day: 1, list: ['organic'], collectedToday: [] });          // Monday 5:00, collection from 6:00
  assert.deepEqual(planOf(at(0, 5, 0), on, 360), { mode: 'tonight', day: 1, list: ['organic'], collectedToday: [] });      // Sunday 5:00: nothing this morning, Monday's organic goes out tonight
  assert.deepEqual(planOf(at(5, 5, 0), on, 360), { mode: 'tonight', day: 6, list: [], collectedToday: [] });               // Friday 5:00: nothing this morning, nothing tonight
  assert.equal(planOf(at(1, 5, 0), on, NaN).mode, 'tonight');                                                              // no collection hour in the guide: no "before the collection"
});

test('planOf: the bins collected this morning are named until 20:00, to bring back in', () => {
  assert.deepEqual(planOf(at(1, 9, 0), on, 360).collectedToday, ['organic']); assert.deepEqual(planOf(at(1, 20, 0), on, 360).collectedToday, []);
});

test('planOf: a guide with a daily bin never has an empty evening or morning', () => {
  for (let d = 0; d < 7; d++) for (const h of [5, 12, 21]) { const p = planOf(at(d, h), DAILY, 360); assert.ok(p.list.includes('sanitary'), d + ' ' + h); assert.equal(p.mode, h < 6 ? 'now' : 'tonight'); }
});

test('hourText: the guide\'s own hour, in French as French writes it, nothing when the guide has none', () => {
  assert.equal(hourText('06:00', 'en'), '6:00'); assert.equal(hourText('06:00', 'fr'), '6 h'); assert.equal(hourText('07:30', 'fr'), '7 h 30');
  assert.equal(hourText('7:30', 'de'), '7:30'); assert.equal(hourText('', 'en'), ''); assert.equal(hourText(undefined, 'fr'), ''); assert.equal(hourText('soon', 'en'), '');
});
