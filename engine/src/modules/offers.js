// What each module offers on Home, by the kind of section it serves: { kind: { <widget>: { sizes } } }, each module's own
// offers.js. The same modules as index.js, read without a guide, for the node scripts that check or draw Home's
// arrangement (engine/scripts/check-content.js, frame-check.mjs, frame.test.mjs); the guide itself asks index.js.
// A kind with no module here offers what frame.js says (its entry tile in every size, or its entry in OWN).
import { widgets as garbage } from './garbage/offers.js';
import { widgets as markets } from './markets/offers.js';

export const OFFERS = { garbage, markets };
