// What each module offers on Home, by the kind of section it serves (or, for the highlights and the map, the kind of
// placement): { kind: { <widget>: { sizes } } }, each module's own offers.js. The same modules under the same names as
// index.js, read without a guide, for the node scripts that check or draw Home's arrangement (engine/scripts/
// check-content.js, frame-check.mjs, frame.test.mjs); the guide itself asks index.js.
// A kind of section with no module here offers what frame.js says (its entry tile in every size); an empty offer (the
// house) means nothing to place.
import { widgets as house } from './house/offers.js';
import { widgets as garbage } from './garbage/offers.js';
import { widgets as info } from './info/offers.js';
import { widgets as contacts } from './contacts/offers.js';
import { widgets as transport } from './transport/offers.js';
import { widgets as markets } from './markets/offers.js';
import { widgets as spots } from './places/offers.js';
import { widgets as events } from './events/offers.js';
import { widgets as highlight } from './highlights/offers.js';
import { widgets as map } from './map/offers.js';

export const OFFERS = { house, garbage, info, contacts, transport, markets, spots, events, highlight, map };
