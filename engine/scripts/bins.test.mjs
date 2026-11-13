// The rubbish tile and page when nothing goes out tonight (engine/src/bins.js): pure, no guide needed.
//   node --test 'engine/scripts/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextOut, hourText } from '../src/bins.js';

// A guide the maker built: organic collected on Monday and Thursday, packaging on Tuesday, paper on Wednesday, no daily bin.
const DAYS = { 1: ['organic'], 2: ['packaging'], 3: ['paper'], 4: ['organic'] }, on = d => DAYS[d] || [];

test('nextOut: a Friday evening with nothing for Saturday gives Monday\'s bins, to put out on Sunday evening', () => {
  assert.deepEqual(nextOut({ mode: 'tonight', day: 6 }, on), { day: 1, list: ['organic'], tonight: false });   // Friday evening: the plan's day is Saturday
  assert.deepEqual(nextOut({ mode: 'tonight', day: 5 }, on), { day: 1, list: ['organic'], tonight: false });   // Thursday evening
  assert.deepEqual(nextOut({ mode: 'tonight', day: 0 }, on), { day: 1, list: ['organic'], tonight: false });   // Saturday evening: Sunday has nothing, Monday is next
});

test('nextOut: nothing to say when the plan\'s own day has bins, or no day has any', () => {
  assert.equal(nextOut({ mode: 'tonight', day: 1 }, on), null);   // Sunday evening: Monday's organic is tonight's, the plan has it
  assert.equal(nextOut({ mode: 'tonight', day: 6 }, () => []), null);
  assert.equal(nextOut(null, on), null);
});

test('nextOut: before a morning with no collection, tomorrow\'s bins are tonight\'s', () => {
  assert.deepEqual(nextOut({ mode: 'now', day: 0 }, on), { day: 1, list: ['organic'], tonight: true });    // Sunday morning: Monday's bins go out tonight
  assert.deepEqual(nextOut({ mode: 'now', day: 5 }, on), { day: 1, list: ['organic'], tonight: false });   // Friday morning: nothing tonight, Sunday evening is next
});

test('hourText: the guide\'s own hour, in French as French writes it, nothing when the guide has none', () => {
  assert.equal(hourText('06:00', 'en'), '6:00'); assert.equal(hourText('06:00', 'fr'), '6 h'); assert.equal(hourText('07:30', 'fr'), '7 h 30');
  assert.equal(hourText('7:30', 'de'), '7:30'); assert.equal(hourText('', 'en'), ''); assert.equal(hourText(undefined, 'fr'), ''); assert.equal(hourText('soon', 'en'), '');
});
