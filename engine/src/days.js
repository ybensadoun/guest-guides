// The days of a row of opening hours, as a guide holds them: a list of mon..sun in the week's order. A research sometimes
// writes them its own way ("Tue-Sun", "mon-fri", "sat", "Monday and Wednesday", "daily"): a range, a single day or a list in
// words is read; anything else is null. One rule in one place: the worker brings a research's hours to the guide's shape
// with it (worker/hours-shape.mjs) and the Emergencies page reads with it a guide already built with the days in words
// (modules/contacts/plan.js contactHours). Pure. Tested in engine/scripts/contacts-plan.test.mjs and
// worker/test/hours-shape.test.mjs. Moved here from worker/guide-worker.mjs as it was, 22 Nov 2026.
export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayOf = w => WEEK.find(d => String(w).toLowerCase().startsWith(d)) || ({ thursday: 'thu', tuesday: 'tue' })[String(w).toLowerCase()];
export function daysList(x) {
  if (Array.isArray(x)) { const d = x.map(dayOf); return d.every(Boolean) ? WEEK.filter(w => d.includes(w)) : null; }
  const s = String(x || '').toLowerCase().trim();
  if (/^(daily|every ?day|all week|mon(day)?\s*[-–to]+\s*sun(day)?)$/.test(s)) return [...WEEK];
  const out = new Set();
  for (const part of s.split(/\s*(?:,|&|\band\b)\s*/)) {
    const m = part.match(/^([a-z]+)\s*(?:-|–|to)\s*([a-z]+)$/);
    if (m) { const a = WEEK.indexOf(dayOf(m[1])), b = WEEK.indexOf(dayOf(m[2])); if (a < 0 || b < 0) return null; for (let i = a; ; i = (i + 1) % 7) { out.add(WEEK[i]); if (i === b) break; } }
    else if (dayOf(part)) out.add(dayOf(part)); else return null;
  }
  return out.size ? WEEK.filter(w => out.has(w)) : null;
}
