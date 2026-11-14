// The markets module's data: the guide's markets (read once by content.js with this module's readMarkets, plan.js) and
// what Home, What's on and the page ask of them. The rules themselves: plan.js.
import { MARKETS, CATS } from '../../content.js';
import { st, DEFAULT_CATS } from '../../state.js';
import { kmMe } from '../../geo.js';
import { byDistance, marketsOn } from './plan.js';

export { MARKETS, CATS };

// Nearest first: from the house, or from the guest when they chose "From me" and their position is known. The lists of the
// host's places (views/section.js) are ordered the same way, with the same choice.
export const sorted = list => byDistance(list, st.sort === 'me' && st.me ? kmMe : m => m.km);

// Home always shows the day's markets with the default types, whatever filters were set on the Markets page.
// Its links reset the Markets filters (see main.js), so the list it opens matches the count.
export const todaysMarkets = now => sorted(marketsOn(MARKETS, now, m => DEFAULT_CATS.includes(m.cat)));
