// What each module offers on Home, by the kind of section it serves (or, for the highlights, the kind of placement):
// { kind: { <widget>: { sizes } } }, each module's own offers.js. The same modules under the same names as index.js, read
// without a guide, for the node scripts that check or draw Home's arrangement (engine/scripts/check-content.js,
// frame-check.mjs, frame.test.mjs); the guide itself asks index.js.
// A kind of section with no module here offers what frame.js says (its entry tile in every size).
import { widgets as garbage } from './garbage/offers.js';
import { widgets as markets } from './markets/offers.js';
import { widgets as spots } from './places/offers.js';
import { widgets as events } from './events/offers.js';
import { widgets as highlight } from './highlights/offers.js';

export const OFFERS = { garbage, markets, spots, events, highlight };
