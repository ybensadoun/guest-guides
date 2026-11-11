// The season a place has, and whether guests see it today (Yohann, 11 Nov 2026: "if a place is temporary closed, we just
// dont display it"). Only OUR season counts, never Google's status: we may not keep what Google says. No imports: node tests
// it (engine/scripts/schedule.test.mjs), the worker reads it (worker/reread-places.mjs) and the maker pastes it as it is
// (onboarding-site/src/build.py), so the guide, the editor and the worker never disagree on whether a place is hidden.
// A place: { s or schedule: its rows of hours (each may carry from/to, MM-DD), season: { from, to }, always, tags, icon }.

// The season assumed for a kind of place (kinds.json "season") or a place's own tag "summer". These are Spain's dates: they
// will be per country when guides go beyond Spain.
export const ASSUMED_SEASON = { summer: { from: '06-01', to: '09-30' }, winter: { from: '12-01', to: '03-31' } };
// A place out of season is shown again this many days before it opens (its row then says when).
export const SHOW_BEFORE_DAYS = 30;

const SS_MD = /^(\d\d)-(\d\d)$/;
const ssOk = v => SS_MD.test(v || '');
const ssNum = v => { const [m, d] = v.split('-').map(Number); return m * 100 + d; };
const ssDay = dt => (dt.getMonth() + 1) * 100 + dt.getDate();
// A day inside a range of the year, a range that may wrap the new year (11-01 to 03-31).
export const inRange = (x, dt) => (ssNum(x.from) <= ssNum(x.to) ? ssDay(dt) >= ssNum(x.from) && ssDay(dt) <= ssNum(x.to) : ssDay(dt) >= ssNum(x.from) || ssDay(dt) <= ssNum(x.to));
// kinds.json -> { icon: 'summer' | 'winter' }, for both lists (a key in both lists says the same in both).
export const seasonKinds = K => { const o = {}; for (const l of ['eat', 'todo']) for (const [k, v] of Object.entries((K || {})[l] || {})) if (v && ASSUMED_SEASON[v.season]) o[k] = v.season; return o; };

// The place's season, in this order: 1. its rows of hours all carry a season (the union of their dates), confirmed; 2. its own
// season (no rows), confirmed; 3. no rows, no season, not open all day, not tagged "allyear", and a summer or winter place (its
// tag "summer", else its kind): the assumed season, not confirmed. null: no season (open all year as far as we know).
// Returns { ranges: [{ from, to }], confirmed, kind? }.
export function seasonOf(it, kinds = {}) {
  if (!it) return null;
  const rows = (it.s || it.schedule || []).filter(Boolean);
  if (rows.length) {
    if (!rows.every(r => ssOk(r.from) && ssOk(r.to))) return null;
    const seen = new Set(), ranges = rows.map(r => ({ from: r.from, to: r.to })).filter(r => !seen.has(r.from + r.to) && seen.add(r.from + r.to));
    return { ranges, confirmed: true };
  }
  const own = it.season;
  if (own && ssOk(own.from) && ssOk(own.to)) return { ranges: [{ from: own.from, to: own.to }], confirmed: true };
  const tags = it.tags || [];
  if (it.always || tags.includes('allyear')) return null;
  const kind = tags.includes('summer') ? 'summer' : kinds[it.icon];
  return ASSUMED_SEASON[kind] ? { ranges: [{ ...ASSUMED_SEASON[kind] }], confirmed: false, kind } : null;
}

const ssDay0 = dt => { const d = new Date(dt); d.setHours(0, 0, 0, 0); return d; };
export const inSeasonOn = (S, dt) => !!S && S.ranges.some(r => inRange(r, dt));
// The first day of the season's next opening after dt (dt itself when a range starts that day), or null in season.
export function nextStart(S, dt = new Date()) {
  if (!S || inSeasonOn(S, dt)) return null;
  const d0 = ssDay0(dt);
  return S.ranges.map(r => { const [m, d] = r.from.split('-').map(Number), x = new Date(d0.getFullYear(), m - 1, d); if (x < d0) x.setFullYear(x.getFullYear() + 1); return x; }).sort((a, b) => a - b)[0];
}
// The last day of the season the place is in now (the end of the range holding today), or null out of season.
export function seasonEnd(S, dt = new Date()) {
  if (!S) return null;
  const d0 = ssDay0(dt), r = S.ranges.find(x => inRange(x, d0)); if (!r) return null;
  const [m, d] = r.to.split('-').map(Number), x = new Date(d0.getFullYear(), m - 1, d); if (x < d0) x.setFullYear(x.getFullYear() + 1);
  return x;
}
export const daysBetween = (a, b) => Math.round((ssDay0(b) - ssDay0(a)) / 864e5);
// Hidden from guests today: out of its season and opening more than SHOW_BEFORE_DAYS days from now.
export function hiddenOn(it, kinds, dt = new Date()) {
  const S = seasonOf(it, kinds), n = nextStart(S, dt);
  return !!n && daysBetween(dt, n) > SHOW_BEFORE_DAYS;
}
// The day a hidden place comes back for guests (SHOW_BEFORE_DAYS before it opens), or null when it is not hidden.
export function backOn(it, kinds, dt = new Date()) {
  if (!hiddenOn(it, kinds, dt)) return null;
  const b = nextStart(seasonOf(it, kinds), dt); b.setDate(b.getDate() - SHOW_BEFORE_DAYS);
  return b;
}
