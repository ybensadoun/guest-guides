import { t, locale } from './i18n.js';

// Local events: each event's next date that has not ended yet, soonest first.
const D = s => new Date(s + 'T00:00:00');
export function upcoming(items, now = new Date()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return (items || []).map(e => {
    const o = e.dates.find(x => D(x.end) >= today);
    return o && { e, o, on: D(o.start) <= today, days: Math.round((D(o.start) - today) / 864e5) };
  }).filter(Boolean).sort((a, b) => a.o.start.localeCompare(b.o.start));
}
const fmt = (d, o) => d.toLocaleDateString(locale(), o);
export function dateRange(o) {
  const a = D(o.start), b = D(o.end);
  if (o.start === o.end) return fmt(a, { weekday: 'short', day: 'numeric', month: 'short' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}-${fmt(b, { day: 'numeric', month: 'short' })}` : `${fmt(a, { day: 'numeric', month: 'short' })} - ${fmt(b, { day: 'numeric', month: 'short' })}`;
}
// "On now", "Tomorrow", "In 5 days".
export const when = x => (x.on ? t('onNow') : x.days === 1 ? t('tomorrow') : t('inDays', { n: x.days }));
export const dayBadge = o => { const a = D(o.start); return { d: a.getDate(), m: fmt(a, { month: 'short' }).replace('.', '') }; };
