// The highlights module's rules, with no guide in them (README.md says each rule, who decided it and when): whether a card
// shows on Home today (its season), which icon it takes, and its live status. Pure: data.js binds them to the guide (the
// card's rows of hours read by content.js slots, handed in as slotsOf), and engine/scripts/highlights-plan.test.mjs tests
// them. Only schedule.js is used (hours, statuses, seasons: season.js).
import { statusLabel, closedStatus, seasonStatus, hiddenNow } from '../../schedule.js';

// A card is read as a place (its rows of hours, its season, its tags): closed for the season and opening in more than 30
// days, it is left out of Home and of the list it sits on top of; its page still opens.
export const shownOn = (q, slotsOf, now = new Date()) => !hiddenNow({ ...q, s: slotsOf(q.schedule) }, now);

// The icon a card takes: its "icon" (taxi, train, bus, food, shop, pizza), else its id or the id's first part ("taxi-2"),
// among the icons known; else the shop's.
export const iconKey = (q, known) => [q.icon, q.id, String(q.id || '').split('-')[0]].find(k => k && known[k]) || 'shop';

// The card's live status ({ cls, text, sub }), or null for none. A card with opening hours: open now, else closed with when
// it opens. A season of ours and no hours: only "Closed" and when it opens, out of season, as on its page and in the lists;
// nothing in season, nor for a card with neither.
export function statusOf(q, slotsOf, now) {
  const m = { s: slotsOf(q.schedule), season: q.season };
  if (!m.s.length) return seasonStatus(m, now);
  return statusLabel(m, now) || closedStatus(m, now);
}
