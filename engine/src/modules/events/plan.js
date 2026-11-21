// The events module's rules, with no guide in them (README.md says each rule, who decided it and when): where an event's
// date stands now, which events are upcoming and in which order, and which one Home's tile names. Pure, no imports
// (tests: engine/scripts/events-plan.test.mjs).
//
// Local events: each event's next date that is not past, soonest first.
// A date may say when it starts ("time": "18:00", shown in its date line) and when it ends on its last day ("until").
// An event of today stays for the whole day, in one set of words (Yohann, 15 Nov 2026): "Today" until it starts, "On now"
// while it runs, "Ended" once it is over, its row quiet, until midnight; from the next day it is gone. When a one-day
// event gives a start and no end, its end is assumed from its kind: a moment (human towers, a parade, fireworks, a film,
// a play: about two hours, you need to be there at the start) or the whole day (a village festa, a fair and the rest: on
// until midnight). An assumed end is said as such ("assumed": 'short' or 'day') and never shown as an hour. Without a
// start time, a one-day event of today only says "Today": we do not know whether it is on yet.
export const MOMENT_KINDS = ['castells', 'parade', 'fireworks', 'film', 'theatre'], MOMENT_MIN = 120;
const D = s => new Date(s + 'T00:00:00');
const mins = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
export function evState(o, now = new Date(), kind = '') {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.round((D(o.start) - today) / 864e5), ends = Math.round((D(o.end) - today) / 864e5), n = now.getHours() * 60 + now.getMinutes();
  const start = mins(o.time), until = mins(o.until), one = days === 0 && ends === 0;
  if (ends < 0) return { over: true };
  if (days > 0) return { days, on: false };
  if (days === 0 && start != null && n < start) return { days: 0, on: false, at: o.time };
  // Its last day and a stated end that has passed (on a one-day event an end before its start is after midnight: not today).
  if (ends === 0 && until != null && n >= until && !(one && start != null && until <= start)) return { days, on: false, ended: o.until };
  if (one && start == null) return { days: 0, on: false, today: true };
  // One day, a start and no end: assumed from its kind.
  if (one && until == null) {
    const short = MOMENT_KINDS.includes(kind);
    return short && n >= start + MOMENT_MIN ? { days: 0, on: false, ended: true, assumed: 'short' } : { days: 0, on: true, assumed: short ? 'short' : 'day' };
  }
  return { days, on: true };
}
// Today's events that have ended come after those still to come or on, before the days ahead.
const rank = x => (x.ended ? 1 : x.days <= 0 ? 0 : 2);
export function upcoming(items, now = new Date()) {
  return (items || []).map(e => {
    for (const o of e.dates || []) { const s = evState(o, now, e.type); if (!s.over) return { e, o, ...s }; }
    return null;
  }).filter(Boolean).sort((a, b) => rank(a) - rank(b) || a.o.start.localeCompare(b.o.start) || (mins(a.o.time) ?? 0) - (mins(b.o.time) ?? 0));
}

// The month an event is listed under on the Local events page, as "YYYY-MM": the month its date starts in, or this month
// for a date that has already started (today's, and those still running). On 1 Dec a nativity play from 28 Nov to 10 Jan is
// under December with today's events, not first on the page under "November", a month that is over (found 16 Nov 2026).
// x: an event of upcoming(), with its days from today.
export const listedMonth = (x, now = new Date()) => (x.days <= 0 ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` : x.o.start.slice(0, 7));

// An event's Google Maps button (README rule 5; 21 Nov 2026): the event's own pin, not a search for its words alone.
// In order: the place the host matched on Google, by its id (the only thing of Google's we keep; the words are what
// Google falls back to); else a Google Maps link the host pasted; else its position; else the words "venue, town"; none
// of these: no button. A position is never used when the event has no pin (nomap: a new event of the host's carries the
// house's position until it is placed, and Google's position past its 30 days is no longer ours to use: content.js).
// Before, the button always searched "venue, town": "Centre, El Vendrell" or "Old town, Valls" found whatever Google
// made of the words, and the place a host had matched was not used.
const MAPS = 'https://www.google.com/maps/search/?api=1&query=';
export function mapsLink(e) {
  const txt = x => (typeof x === 'string' ? x.trim() : ''), words = [txt(e.venue), txt(e.town)].filter(Boolean).join(', ');
  if (txt(e.gid)) return `${MAPS}${encodeURIComponent(words || txt(e.name_local))}&query_place_id=${encodeURIComponent(e.gid)}`;
  const own = [e.gmaps, e.map].map(txt).find(u => /^https?:\/\//.test(u));
  if (own) return own;
  if (!e.nomap && typeof e.lat === 'number' && typeof e.lng === 'number' && (e.lat || e.lng)) return `${MAPS}${e.lat},${e.lng}`;
  return words ? MAPS + encodeURIComponent(words) : '';
}

// The event Home's tile names: today's, as long as it is not known to be over, "Today: Santa Teresa Fair"
// ({ e, o, now: true }): one that starts today first, else a short one that is on (a fair of up to three days is today's
// on each of its days; a Christmas market on for a month only on the day it starts, or the tile would name it for weeks).
// Else the soonest date still ahead of any event, "Next: Santa Teresa Fair, 9 Oct" ({ e, o }). undefined when there is none.
const SHORT_DAYS = 3, short = o => (D(o.end) - D(o.start)) / 864e5 < SHORT_DAYS;
export function nextEvent(items, now = new Date()) {
  const cur = upcoming(items, now).filter(x => x.days <= 0 && !x.ended && (x.days === 0 || short(x.o))).sort((a, b) => b.days - a.days)[0];
  if (cur) return { e: cur.e, o: cur.o, now: true };
  const iso = new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  return (items || []).flatMap(e => (e.dates || []).filter(o => o.start > iso).map(o => ({ e, o })))
    .sort((a, b) => a.o.start.localeCompare(b.o.start) || (mins(a.o.time) ?? 0) - (mins(b.o.time) ?? 0))[0];
}
