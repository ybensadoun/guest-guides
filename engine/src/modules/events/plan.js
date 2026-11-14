// The events module's rules, with no guide in them (README.md says each rule, who decided it and when): where an event's
// date stands now, which events are upcoming and in which order, and which one Home's tile names. Pure, no imports
// (tests: engine/scripts/events-plan.test.mjs).
//
// Local events: each event's next date that has not ended yet, soonest first.
// A date may say when it starts ("time": "18:00", shown in its date line) and when it ends on its last day ("until").
// With a time, an event of today says "Today" until it starts, "On now" while it runs (until "until", else about three
// hours) and is gone after. Without one, a one-day event of today only says "Today": we do not know whether it is on yet.
const D = s => new Date(s + 'T00:00:00');
const mins = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
export function evState(o, now = new Date()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.round((D(o.start) - today) / 864e5), ends = Math.round((D(o.end) - today) / 864e5), n = now.getHours() * 60 + now.getMinutes();
  const start = mins(o.time), until = mins(o.until) ?? (start != null ? start + 180 : null);
  if (ends < 0 || (ends === 0 && until != null && n >= until)) return { over: true };
  if (days > 0) return { days, on: false };
  if (days === 0 && start != null && n < start) return { days: 0, on: false, at: o.time };
  if (days === 0 && ends === 0 && start == null) return { days: 0, on: false, today: true };
  return { days, on: true };
}
export function upcoming(items, now = new Date()) {
  return (items || []).map(e => {
    for (const o of e.dates || []) { const s = evState(o, now); if (!s.over) return { e, o, ...s }; }
    return null;
  }).filter(Boolean).sort((a, b) => a.o.start.localeCompare(b.o.start) || (mins(a.o.time) ?? 0) - (mins(b.o.time) ?? 0));
}

// The event Home's tile names ("Next: Santa Teresa Fair, 9 Oct"): of each event, its first date in the file that has not
// ended before today, whatever the hour; the soonest start of those. undefined when there is none.
export function nextEvent(items, now = new Date()) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  return (items || []).map(e => ({ e, o: e.dates.find(o => new Date(o.end + 'T00:00:00') >= d0) })).filter(x => x.o).sort((a, b) => a.o.start.localeCompare(b.o.start))[0];
}
