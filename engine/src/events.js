import { t, locale } from './i18n.js';

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
const fmt = (d, o) => d.toLocaleDateString(locale(), o);
export function dateRange(o) {
  const a = D(o.start), b = D(o.end);
  if (o.start === o.end) return fmt(a, { weekday: 'short', day: 'numeric', month: 'short' }) + (o.time ? ', ' + o.time : '');
  return a.getMonth() === b.getMonth() ? `${a.getDate()}-${fmt(b, { day: 'numeric', month: 'short' })}` : `${fmt(a, { day: 'numeric', month: 'short' })} - ${fmt(b, { day: 'numeric', month: 'short' })}`;
}
// "On now", "Today", "Tomorrow", "In 5 days".
export const when = x => (x.on ? t('onNow') : x.at || x.today ? t('today') : x.days === 1 ? t('tomorrow') : t('inDays', { n: x.days }));
export const dayBadge = o => { const a = D(o.start); return { d: a.getDate(), m: fmt(a, { month: 'short' }).replace('.', '') }; };
