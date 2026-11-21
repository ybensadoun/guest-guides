// The highlights module's rules (engine/src/modules/highlights/plan.js, README.md beside it): whether a white card shows on
// Home today, which icon it takes, and its live status. Written from the guide's behaviour on 14 Nov 2026 (views/home.js
// qStatus and quickIcon, content.js quickShown before the module).
// schedule.js reads its words from i18n.js, which only Vite can load: here a stand-in gives the English file's words, as in
// schedule.test.mjs, so the real schedule.js runs as it is. Nothing is written.   node --test engine/scripts/highlights-plan.test.mjs
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
const { shownOn, iconKey, statusOf } = await import('../src/modules/highlights/plan.js');

const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
const SAT = D(2026, 11, 14, 11, 30);
// content.js slots(), as the guide reads a card's rows of hours.
const DAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const slots = sch => (sch || []).map(x => ({ d: x.days.map(d => DAY[d]), o: x.open, c: x.close, nth: x.week_of_month || 0, m: !!x.hours_approximate_morning, from: x.from, to: x.to }));
const bar = { id: 'shop', schedule: [{ days: ['sat', 'sun'], open: '08:00', close: '22:00' }] };
const pizza = { id: 'pizza', schedule: [{ days: ['fri', 'sat'], open: '19:00', close: '23:30' }] };

test('shownOn: a card closed for the season and opening in more than 30 days is left out', () => {
  assert.equal(shownOn(bar, slots, SAT), true);
  assert.equal(shownOn({ id: 'kiosk' }, slots, SAT), true);                                                // no hours, no season
  assert.equal(shownOn({ id: 'kiosk', season: { from: '06-01', to: '09-30' } }, slots, SAT), false);       // back 2 May
  assert.equal(shownOn({ id: 'kiosk', season: { from: '12-01', to: '03-31' } }, slots, SAT), true);        // within 30 days
  const summer = { id: 'kiosk', schedule: [{ days: ['sat'], open: '10:00', close: '20:00', from: '06-15', to: '09-15' }] };
  assert.equal(shownOn(summer, slots, SAT), false);                                                       // every row seasonal
  assert.equal(shownOn(summer, slots, D(2026, 6, 1)), true);
});

test('iconKey: its icon, else its id, else the id\'s first part, else the shop\'s', () => {
  const known = { taxi: 1, train: 1, bus: 1, food: 1, shop: 1, pizza: 1 };
  assert.equal(iconKey({ id: 'pizza' }, known), 'pizza');
  assert.equal(iconKey({ id: 'pizza', icon: 'food' }, known), 'food');
  assert.equal(iconKey({ id: 'taxi-2' }, known), 'taxi');
  assert.equal(iconKey({ id: 'transport', icon: 'train' }, known), 'train');
  assert.equal(iconKey({ id: 'bakery' }, known), 'shop');
  assert.equal(iconKey({ id: 'x', icon: 'rocket' }, known), 'shop');
  assert.equal(iconKey({}, known), 'shop');
});

test('statusOf: open now, closed with when it opens, a season with no hours, or nothing', () => {
  assert.deepEqual(statusOf(bar, slots, SAT), { cls: 'open', text: 'Open until 22:00', sub: '' });
  assert.deepEqual(statusOf(pizza, slots, SAT), { cls: 'closed', text: 'Closed', sub: 'Opens at 19:00' });
  assert.equal(statusOf(pizza, slots, D(2026, 11, 16, 15, 30)).cls, 'closed');                             // Monday: not today
  assert.equal(statusOf({ id: 'kiosk' }, slots, SAT), null);                                              // no hours, no season
  const out = statusOf({ id: 'kiosk', season: { from: '12-01', to: '03-31' } }, slots, SAT);             // out of season
  assert.equal(out.cls, 'closed'); assert.match(out.sub, /Dec/);
  assert.equal(statusOf({ id: 'kiosk', season: { from: '11-01', to: '03-31' } }, slots, SAT), null);     // in season: nothing
});

// fit.js: whether a card fits a half card (no word is cut in two on Home; README.md rule 12). The widths below are what
// the built guide measured at 360 px on 21 Nov 2026: a half card has 131 px for its text.
const { longForHalf, widest } = await import('../src/modules/highlights/fit.js');

test('longForHalf: Ca La Kimberly\'s cards fit a half card in every language', () => {
  for (const [name, line] of [['Pizza delivery', 'El Racó de la Pedra'], ['Pizza a domicilio', 'Entrega en 30 min'], ['Livraison à domicile de pizza', 'Livrée en 30 min'],
    ['Pizza-Lieferung', 'Lieferung in 30 Min.'], ['Pizzabezorging', 'Bezorging in 30 min'], ['Local bar & shop', 'Bar, snacks & convenience shop'], ['Bar & Laden um die Ecke', 'Bar, Snacks & kleiner Laden'],
    ['Buurtbar & buurtwinkel', '1 min lopen van het huis'], ['Bar & supérette locale', 'Bar, snacks et épicerie'], ['Taxi & train', '3 train stations']]) assert.equal(longForHalf(name, line), false, name);
});
test('longForHalf: a word wider than a half card makes the card long, in its name or its line', () => {
  assert.equal(longForHalf('Lebensmittelgeschäft', ''), true);          // 167 px measured
  assert.equal(longForHalf('Lebensmittelladen', ''), true);             // 144 px
  assert.equal(longForHalf('De kruidenierswinkel', ''), true);          // 142 px
  assert.equal(longForHalf('Supermercado', 'Abierto todos los días'), false);   // 116 px
  assert.equal(longForHalf('Fahrradverleih', ''), false);               // 116 px
  assert.equal(longForHalf('Bar', 'Lebensmittelgeschäft'), false);      // 122 px in the line's smaller letters
  assert.equal(longForHalf('Bar', 'Donaudampfschifffahrtsgesellschaft'), true);
  assert.equal(longForHalf('', ''), false);
  assert.equal(longForHalf(undefined, undefined), false);
});
test('widest: a line may break at a space, a soft hyphen and after a hyphen or a slash', () => {
  assert.equal(longForHalf('Lebensmittel-Geschäft', ''), false);
  assert.equal(longForHalf('Lebensmittel­geschäft', ''), false);
  assert.equal(longForHalf('Lebensmittel/Getränke', ''), false);
  assert.ok(Math.abs(widest('Pizzabezorging') * 17 - 123.3) < 4);        // within a few px of the measure
  assert.ok(Math.abs(widest('Lebensmittelgeschäft') * 17 - 166.7) < 4);
  assert.ok(widest('Ærø') > 0);                                         // letters not in the table still count
});
