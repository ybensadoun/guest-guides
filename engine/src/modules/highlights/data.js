// The highlights module's data: the white cards of the guide (content/quick.json, then Getting around's card when
// transport.json has a "tile"), as content.js reads them once, and what Home, the lists and the page ask of them. The
// rules themselves: plan.js.
import { QUICK, QUICK_ALL, slots } from '../../content.js';
import { shownOn } from './plan.js';

export { QUICK, QUICK_ALL };

// Shown today: a card closed for the season and opening in more than 30 days is left out (plan.js shownOn).
export const quickShown = (q, now = new Date()) => shownOn(q, slots, now);

// The cards shown today as the frame sees them (../frame.js: { id, wide }), in their order: quick.json's, then Getting
// around's.
export const shown = (now = new Date()) => QUICK.filter(q => quickShown(q, now)).map(q => ({ id: q.id, wide: !!q.wide }));
