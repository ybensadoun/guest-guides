// The week of the month a market is held (engine/src/weeks.js) and the dates the guide walks to with it (schedule.js):
// the 4th and the last Sunday, a month with five Sundays and one with four, February, December into January.
// schedule.js reads its words from i18n.js, which only Vite can load: here a stand-in gives the English file's words,
// so the real schedule.js runs as it is. Nothing is written.   node --test engine/scripts/schedule.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const EN = JSON.parse(readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'));
const I18N = `const EN = ${JSON.stringify(EN)};
export const t = (k, p) => Object.entries(p || {}).reduce((s, [a, b]) => s.split('{' + a + '}').join(b), EN[k] || k);
export const tx = v => (v && typeof v === 'object' ? v.en : v || ''); export const locale = () => 'en-GB'; export const typo = s => s;`;
// kinds.json too: Vite reads a JSON import as it is, node needs it as a module.
const KINDS = readFileSync(new URL('../src/kinds.json', import.meta.url), 'utf8');
registerHooks({ resolve: (spec, ctx, next) => (/\/engine\/src\/schedule\.js$/.test(ctx.parentURL || '') && spec === './i18n.js' ? { url: 'data:text/javascript,' + encodeURIComponent(I18N), shortCircuit: true }
  : /\/engine\/src\/schedule\.js$/.test(ctx.parentURL || '') && spec === './kinds.json' ? { url: 'data:text/javascript,' + encodeURIComponent('export default ' + KINDS), shortCircuit: true } : next(spec, ctx)) });
const { weekOfMonth, lastOfMonth, onWeek, nthKey } = await import('../src/weeks.js');
const { runsOn, nextOpen, nextDate, hoursText, offSeason, seasonOnly, seasonStatus, seasonText, closedStatus, statusLabel } = await import('../src/schedule.js');
const { seasonOf, seasonKinds, hiddenOn, backOn, ASSUMED_SEASON, SHOW_BEFORE_DAYS } = await import('../src/season.js');
const { hiddenNow } = await import('../src/schedule.js');

const D = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi);
const ymd = dt => dt && `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const sun = nth => ({ d: [0], o: '09:00', c: '14:00', nth, m: false });   // a slot as content.js slots() reads it
const mk = nth => ({ s: [sun(nth)] });

// November 2026 has five Sundays (1, 8, 15, 22, 29); February 2026 has four (1, 8, 15, 22); May 2026 has five (3 ... 31).
test('a month with five Sundays: the 4th is not the last', () => {
  assert.equal(runsOn(mk(4), D(2026, 11, 22)).length, 1);
  assert.equal(runsOn(mk(-1), D(2026, 11, 22)).length, 0);
  assert.equal(runsOn(mk(-1), D(2026, 11, 29)).length, 1);
  assert.equal(runsOn(mk(4), D(2026, 11, 29)).length, 0);
  assert.equal(weekOfMonth(D(2026, 11, 29)), 5);
});
test('a month with four Sundays: the 4th is also the last', () => {
  assert.equal(runsOn(mk(4), D(2026, 2, 22)).length, 1);
  assert.equal(runsOn(mk(-1), D(2026, 2, 22)).length, 1);
  assert.equal(runsOn(mk(-1), D(2026, 2, 15)).length, 0);
});
test('February: the last of the month, in a common year and a leap year', () => {
  assert.ok(lastOfMonth(D(2027, 2, 22)) && !lastOfMonth(D(2027, 2, 21)));   // 28 days: the last week is 22 to 28
  assert.ok(lastOfMonth(D(2028, 2, 23)) && !lastOfMonth(D(2028, 2, 22)));   // 29 days: the last week is 23 to 29
  assert.equal(ymd(nextDate(sun(-1), D(2028, 2, 1))), '2028-02-27');
  assert.equal(ymd(nextDate(sun(4), D(2028, 2, 1))), '2028-02-27');
});
test('nextOpen and nextDate walk from December into January', () => {
  // 27 Dec 2026 is the last (and the 4th) Sunday of December; from the 28th the next is in January 2027: 4th on the 24th, last on the 31st.
  assert.equal(ymd(nextOpen(mk(-1), D(2026, 12, 20, 10)).date), '2026-12-27');
  assert.equal(ymd(nextOpen(mk(-1), D(2026, 12, 28, 10)).date), '2027-01-31');
  assert.equal(ymd(nextOpen(mk(4), D(2026, 12, 28, 10)).date), '2027-01-24');
  assert.equal(ymd(nextDate(sun(-1), D(2026, 12, 28))), '2027-01-31');
  assert.equal(ymd(nextOpen(mk(-1), D(2026, 12, 27, 15)).date), '2027-01-31');   // after today's closing: the next one
  assert.equal(ymd(nextOpen(mk(-1), D(2026, 12, 27, 8)).date), '2026-12-27');    // before opening: today
});
test('the words: nth1 to nth4 and nthLast in every language, read the guide way', () => {
  assert.equal(nthKey(-1), 'nthLast'); assert.equal(nthKey(4), 'nth4'); assert.ok(onWeek(D(2026, 11, 3), 0));
  for (const l of ['en', 'es', 'fr', 'ca', 'de', 'nl']) {
    const j = JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'));
    for (const k of ['nth', 'nth1', 'nth2', 'nth3', 'nth4', 'nthLast']) assert.ok(j[k], `${l}: ${k}`);
  }
  assert.equal(hoursText(mk(-1))[0].days, 'Last Sunday of the month');
  assert.equal(hoursText(mk(4))[0].days, '4th Sunday of the month');
});

// A season of our own and no hours (content: season { from, to }, MM-DD): closed out of season with the day it opens again,
// as a seasonal place with hours says it; in season nothing of ours (Google's line gives the hours).
const summer = { s: [], season: { from: '06-01', to: '09-30' } }, winter = { s: [], season: { from: '11-01', to: '03-31' } };
test('a season without hours: out of season it is closed and says when it opens', () => {
  assert.ok(seasonOnly(summer) && !seasonOnly({ s: [] }) && !seasonOnly({ s: [sun(0)], season: summer.season }));   // hours win: their own seasons stay rows
  assert.ok(offSeason(summer, D(2026, 11, 11, 12)));
  assert.deepEqual(seasonStatus(summer, D(2026, 11, 11, 12)), { cls: 'closed', text: 'Closed', sub: 'Opens 1 Jun' });
  assert.deepEqual(closedStatus(summer, D(2026, 11, 11, 12)), seasonStatus(summer, D(2026, 11, 11, 12)));   // the same words wherever it is shown
  assert.equal(statusLabel(summer, D(2026, 11, 11, 12)), null);
  assert.ok(offSeason(summer, D(2026, 5, 31, 23, 59)) && offSeason(summer, D(2026, 10, 1)));   // the day before and the day after
  assert.equal(seasonStatus(summer, D(2026, 5, 31)).sub, 'Opens 1 Jun');                      // tomorrow: still the date, we hold no time
});
test('a season without hours: in season nothing of ours is said', () => {
  for (const d of [D(2026, 6, 1), D(2026, 7, 15, 13), D(2026, 9, 30, 23)]) { assert.ok(!offSeason(summer, d)); assert.equal(seasonStatus(summer, d), null); }
  assert.equal(seasonText(summer), '1 Jun - 30 Sept');
  assert.equal(seasonText({ s: [sun(0)], season: summer.season }), '');
});
test('a season without hours that wraps the new year', () => {
  for (const d of [D(2026, 11, 1), D(2026, 12, 31), D(2027, 1, 1), D(2027, 3, 31)]) assert.ok(!offSeason(winter, d), d.toDateString());
  assert.ok(offSeason(winter, D(2026, 7, 1)) && offSeason(winter, D(2027, 4, 1)) && offSeason(winter, D(2026, 10, 31)));
  assert.equal(seasonStatus(winter, D(2026, 7, 1)).sub, 'Opens 1 Nov');
  // A summer season seen in December: it opens next year.
  assert.equal(seasonStatus(summer, D(2026, 12, 20)).sub, 'Opens 1 Jun');
  assert.equal(seasonStatus({ s: [], season: { from: '01-15', to: '02-15' } }, D(2026, 12, 20)).sub, 'Opens 15 Jan');
});

// The season a place has, from three sources in order (engine/src/season.js), and the 30 days before it opens.
const SK = seasonKinds(JSON.parse(KINDS));
const row = (from, to) => ({ d: [1, 2, 3, 4, 5, 6, 0], o: '10:00', c: '20:00', nth: 0, m: false, from, to });
test('the three sources of a season: hours with seasons, its own, assumed from its kind or its tag', () => {
  assert.deepEqual(SK, { beachbar: 'summer', waterpark: 'summer' });
  // 1. Every row of hours carries a season: their dates, confirmed. A row without one: no season at all (hours win).
  assert.deepEqual(seasonOf({ s: [row('04-01', '10-31'), row('04-01', '10-31')], icon: 'beachbar' }, SK), { ranges: [{ from: '04-01', to: '10-31' }], confirmed: true });
  assert.deepEqual(seasonOf({ s: [row('06-13', '08-31'), row('09-01', '09-14')] }, SK).ranges.length, 2);
  assert.equal(seasonOf({ s: [row('04-01', '10-31'), row()], icon: 'beachbar' }, SK), null);
  assert.equal(seasonOf({ schedule: [{ days: ['mon'], open: '10:00', close: '12:00' }], icon: 'waterpark' }, SK), null);   // the editor's and the worker's raw rows
  // 2. Its own season, confirmed, over its kind.
  assert.deepEqual(seasonOf({ s: [], season: { from: '05-15', to: '10-15' }, icon: 'beachbar' }, SK), { ranges: [{ from: '05-15', to: '10-15' }], confirmed: true });
  // 3. Assumed: a summer kind, or the tag summer; never open all day, never tagged allyear, never a kind with no season.
  assert.deepEqual(seasonOf({ s: [], icon: 'beachbar' }, SK), { ranges: [ASSUMED_SEASON.summer], confirmed: false, kind: 'summer' });
  assert.equal(seasonOf({ s: [], icon: 'fork', tags: ['summer'] }, SK).kind, 'summer');
  assert.equal(seasonOf({ s: [], icon: 'beachbar', tags: ['allyear'] }, SK), null);
  assert.equal(seasonOf({ s: [], icon: 'beachbar', always: true }, SK), null);
  assert.equal(seasonOf({ s: [], icon: 'fork' }, SK), null);
  assert.deepEqual(ASSUMED_SEASON, { summer: { from: '06-01', to: '09-30' }, winter: { from: '12-01', to: '03-31' } });
});
test('hidden out of season until 30 days before it opens, back on the 30th day, in season to its last day', () => {
  assert.equal(SHOW_BEFORE_DAYS, 30);
  const own = { s: [], season: { from: '06-01', to: '09-30' } };
  assert.ok(hiddenOn(own, SK, D(2026, 5, 1)));                 // 31 days before
  assert.ok(!hiddenOn(own, SK, D(2026, 5, 2)));                // 30 days before: back
  assert.equal(backOn(own, SK, D(2026, 5, 1)).getDate(), 2);   // the day it comes back
  assert.equal(backOn(own, SK, D(2026, 5, 2)), null);
  assert.ok(!hiddenOn(own, SK, D(2026, 6, 1)) && !hiddenOn(own, SK, D(2026, 9, 30, 23)));   // the first and the last day
  assert.ok(hiddenOn(own, SK, D(2026, 10, 1)));                // the day after
  assert.ok(!hiddenOn({ s: [] }, SK, D(2026, 10, 1)));         // no season: never hidden
  // The guide's own call, with the kinds of kinds.json: a beach bar with nothing of its own.
  assert.ok(hiddenNow({ s: [], icon: 'beachbar' }, D(2026, 11, 12)) && !hiddenNow({ s: [], icon: 'beachbar' }, D(2026, 5, 10)));
});
test('a winter season over the new year: hidden in summer, back from 1 Nov, in to 31 Mar', () => {
  const ski = { s: [], tags: [], icon: 'x', season: { from: '12-01', to: '03-31' } };
  assert.ok(hiddenOn(ski, SK, D(2026, 7, 1)) && hiddenOn(ski, SK, D(2026, 10, 31)));
  assert.ok(!hiddenOn(ski, SK, D(2026, 11, 1)) && !hiddenOn(ski, SK, D(2026, 12, 31)) && !hiddenOn(ski, SK, D(2027, 1, 15)) && !hiddenOn(ski, SK, D(2027, 3, 31)));
  assert.ok(hiddenOn(ski, SK, D(2027, 4, 1)));
  assert.equal(backOn(ski, SK, D(2027, 4, 1)).toDateString(), D(2027, 11, 1).toDateString());
});
test('the words: an assumed season says it is expected, a confirmed one says the day', () => {
  const bar = { s: [], icon: 'beachbar' };
  assert.deepEqual(seasonStatus(bar, D(2026, 5, 10)), { cls: 'closed', text: 'Closed', sub: 'Expected from\u00a0June' });
  assert.equal(seasonStatus(bar, D(2026, 7, 16)), null);
  assert.equal(seasonText(bar), 'June - September · Expected');
  assert.equal(seasonStatus({ s: [], season: { from: '06-01', to: '09-30' } }, D(2026, 5, 10)).sub, 'Opens 1 Jun');
  for (const l of ['en', 'es', 'fr', 'ca', 'de', 'nl']) { const j = JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8')); assert.match(j.expectedFrom, /\{month\}/, l); }
});
