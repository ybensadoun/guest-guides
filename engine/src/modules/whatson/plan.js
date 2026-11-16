// What's on's rules, with no guide and no module in them (README.md says each rule, who decided it and when): what the
// agenda takes from the feeds the modules give it (README.md, "The feed"), in which order, and where it cuts. Pure, no
// imports (tests: engine/scripts/whatson.test.mjs). The drawing: widget.js.

// Today shows at most three rows of a module that can show the rest elsewhere; Coming up at most two things held every
// month and five lines in all; "the next days" are tomorrow and the day after.
export const TODAY_MAX = 3, RECURRING_MAX = 2, LATER_MAX = 5, SOON = [1, 2];

// Today: each module's rows in the modules' order, a module's own order kept. A module that gives a line for the rest
// (today.more) is cut at three rows, then that line. on: how many are open now (the heading's "2 open now"); live:
// something is on or still to come today, so Today stays open.
export function todayPart(feeds) {
  const rows = feeds.flatMap(f => { const r = f.today.rows; return f.today.more && r.length > TODAY_MAX ? [...r.slice(0, TODAY_MAX), f.today.more(r.length - TODAY_MAX)] : r; });
  return { rows, on: feeds.reduce((a, f) => a + (f.today.on || 0), 0), live: feeds.some(f => f.today.live) };
}

// The next days: for each day, each module's part ({ feed, rows, where }), in the modules' order; and per module how
// many it has over those days, for the heading ("12 markets · 1 event"). dateOf(n): the day n days ahead.
export function soonPart(feeds, dateOf) {
  const days = SOON.map(n => { const date = dateOf(n); return { n, date, parts: feeds.map(f => ({ feed: f, ...f.day(n, date) })).filter(p => p.rows.length) }; });
  const counts = feeds.map(f => ({ feed: f, n: days.reduce((a, d) => a + (d.parts.find(p => p.feed === f)?.rows.length || 0), 0) })).filter(c => c.n);
  return { days, counts };
}

// Coming up: everything with one date, plus at most two things held every month (the first two a module names), in date
// order, a thing with one date before a monthly one on the same day; five lines.
export function laterPart(feeds) {
  const all = feeds.flatMap(f => f.later || []);
  return [...all.filter(x => !x.recurring), ...all.filter(x => x.recurring).slice(0, RECURRING_MAX)].sort((p, q) => p.k.localeCompare(q.k)).slice(0, LATER_MAX);
}
