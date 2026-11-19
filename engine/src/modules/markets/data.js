// The markets module's data: the guide's markets (read once by content.js with this module's readMarkets, plan.js) and
// what Home, What's on and the page ask of them. The rules themselves: plan.js; their order: engine/src/lists.js.
import { MARKETS, CATS } from '../../content.js';
import { DEFAULT_CATS } from '../../state.js';
import { sorted } from '../../lists.js';
import { t } from '../../i18n.js';
import { statusLabel } from '../../schedule.js';
import { marketsOn, nextMarketDay, overToday } from './plan.js';

export { MARKETS, CATS };

// Nearest first, from the house or from the guest: the order of every list of places (engine/src/lists.js), the host's
// lists of places included (../places/).

// Home always shows the day's markets with the default types, whatever filters were set on the Markets page.
// Its links reset the Markets filters (see main.js), so the list it opens matches the count.
export const todaysMarkets = now => sorted(marketsOn(MARKETS, now, m => DEFAULT_CATS.includes(m.cat)));

// The day Home leads to (plan.js nextMarketDay, the default kinds): today while a market is on or still to come, else the
// next day that has one. The tile counts that day, and its link and What's on's "All markets" open it.
export const nextDay = now => nextMarketDay(MARKETS, now, m => DEFAULT_CATS.includes(m.cat));
export const dayHref = now => { const nx = nextDay(now); return nx && nx.off ? `#markets/day/${nx.off}` : '#markets/today'; };

// A market's status on today's rows: every list's (schedule.js statusLabel), except that a market held earlier today reads
// "Finished", quiet (stHTML's over), with when it is next held, not "Closed" in red as a shop out of its hours.
export const statusNow = (m, now) => { const s = statusLabel(m, now); return s && overToday(m, now) ? { ...s, text: t('done'), over: true } : s; };
