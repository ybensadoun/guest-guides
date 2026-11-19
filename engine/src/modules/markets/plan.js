// The markets module's rules, with no guide in them (README.md says each rule, who decided it and when): what a market is
// once read, which kinds Home and the page start from, which markets are held on a day, which ask for Google's own live
// line. Their order, shared with the host's lists of places: engine/src/lists.js byDistance. Pure: content.js reads the
// guide's file with readMarkets, data.js binds the rest to the guide, and engine/scripts/markets-data.test.mjs tests them.
// Only schedule.js's runsOn and status are used (the week of the month: weeks.js).
import { runsOn, status } from '../../schedule.js';

// A guide's content/markets.json read as places, with the guide's shared readers (content.js: located for a position that
// ran out, slots for the schedule rows, slug for the map's groups). The kinds offered are the file's categories that have
// at least one market; every market becomes a place of kind 'market' with its kind in cat.
export function readMarkets(file, { located, slots, slug }) {
  const cats = (file.categories || []).filter(c => (file.markets || []).some(m => m.category === c));
  const markets = file.markets.map(x => located(x)).map(m => ({
    ...m,
    kind: 'market',
    cat: m.category,
    km: m.km_from_house,
    groupKey: m.group || m.town,
    groupSlug: slug(m.group || m.town),
    s: slots(m.schedule)
  }));
  return { cats, markets };
}

// Markets with nothing found vanish too, no dead-end tile: a guide whose file lists no market has no markets module.
export const noneFound = file => !((file || {}).markets || []).length;

// Default market kinds: everything except the covered market halls (open every day). Home always uses them; the Markets
// page's filters start from them and never change Home.
export const defaultKinds = cats => cats.filter(c => c !== 'covered');

// Google's own live line (gcard.js) only on the kinds of market held every week, a street market or a market hall. A fair,
// a flea or antiques market held once a month or once a year never asks: Google's line gives weekly hours, and on the live
// guide (13 Nov 2026) it said "Open · Closes 14:00" on a summer night market, from the listing of the town's weekly market.
export const WEEKLY = new Set(['street', 'covered']);

// The markets held on a day (a Date: its weekday, its week of the month, its season), among those keep() lets through.
export const marketsOn = (markets, day, keep) => markets.filter(m => keep(m) && runsOn(m, day).length);

// Over for today (README rule 6): held today, and none of its hours is on now or still to come.
export const overToday = (m, now) => status(m, now) === 'done';

// The days the page's strip shows, today first.
export const STRIP_DAYS = 14;

// The next day with a market to go to, from day `from` of the strip (0 = today): today while one of its markets is on or
// still to come, else the first later day that has one (README rule 2). { off, date, n }: the days from today, the day, how
// many markets are held on it; null when the rest of the strip has none.
export function nextMarketDay(markets, now, keep, from = 0) {
  for (let i = Math.max(0, from); i < STRIP_DAYS; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    const l = marketsOn(markets, d, keep);
    if (i === 0 ? l.some(m => !overToday(m, now)) : l.length) return { off: i, date: d, n: l.length };
  }
  return null;
}
