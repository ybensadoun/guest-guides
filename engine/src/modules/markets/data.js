// The markets module's data: the guide's markets (read once by content.js with this module's readMarkets, plan.js) and
// what Home, What's on and the page ask of them. The rules themselves: plan.js; their order: engine/src/lists.js.
import { MARKETS, CATS } from '../../content.js';
import { DEFAULT_CATS } from '../../state.js';
import { sorted } from '../../lists.js';
import { marketsOn } from './plan.js';

export { MARKETS, CATS };

// Nearest first, from the house or from the guest: the order of every list of places (engine/src/lists.js), the host's
// lists of places included (../places/).

// Home always shows the day's markets with the default types, whatever filters were set on the Markets page.
// Its links reset the Markets filters (see main.js), so the list it opens matches the count.
export const todaysMarkets = now => sorted(marketsOn(MARKETS, now, m => DEFAULT_CATS.includes(m.cat)));
