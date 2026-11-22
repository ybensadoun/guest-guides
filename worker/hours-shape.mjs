// A research's opening hours brought to the guide's one shape before they are written (worker/guide-worker.mjs: the
// research at the link, the build's, Find more). Moved here from guide-worker.mjs as it was on 22 Nov 2026, so that it
// can be tested (worker/test/hours-shape.test.mjs), with the contacts' groups added: until then a contact's hours were
// written as the research answered ("days": "mon-fri"), and the Emergencies page of such a guide went blank.
import { daysList } from '../engine/src/days.js';

// Opening hours the guide can read: rows of days (mon..sun), open and close (HH:MM), and an optional season (from/to MM-DD).
// Research sometimes writes "Tue-Sun" or "10:00-17:30" or "third Sunday of the month": the first two are converted,
// anything else leaves the schedule as words in "hours" and asks guests to check.
export function normSchedule(it) {
  if (!Array.isArray(it.schedule)) { if (it.schedule != null) delete it.schedule; return it; }
  const ok = [], words = [];
  for (const r of it.schedule) {
    const days = daysList(r.days), t = String(r.hours || '').match(/(\d{1,2}[:.]\d{2})\s*(?:-|–|to)\s*(\d{1,2}[:.]\d{2})/);
    const hm = x => x && x.replace('.', ':').padStart(5, '0');
    const open = hm(r.open || (t && t[1])), close = hm(r.close || (t && t[2]));
    if (days && /^\d\d:\d\d$/.test(open || '') && /^\d\d:\d\d$/.test(close || '')) ok.push({ days, open, close, ...(/^\d\d-\d\d$/.test(r.from || '') && /^\d\d-\d\d$/.test(r.to || '') ? { from: r.from, to: r.to } : {}) });
    else words.push([r.days, r.hours || [r.open, r.close].filter(Boolean).join('-'), r.note].filter(x => x && typeof x === 'string').join(', '));
  }
  if (ok.length) it.schedule = ok; else delete it.schedule;
  if (words.length) { if (!it.hours) it.hours = { en: words.join('; ') }; it.flags = [...new Set([...(it.flags || []), 'check'])]; }
  return it;
}
// The contacts research answers groups of items (emergency.json): each contact's hours in the same shape.
export function normGroups(o) {
  for (const g of (o && Array.isArray(o.groups) ? o.groups : [])) if (g && Array.isArray(g.items)) g.items.forEach(it => { if (it && typeof it === 'object') normSchedule(it); });
  return o;
}
