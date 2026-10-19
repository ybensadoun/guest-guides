import { t, tx, locale, typo } from './i18n.js';

export const dayName = (d, w) => new Intl.DateTimeFormat(locale(), { weekday: w || 'long' }).format(new Date(2026, 0, 4 + d));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
// Closing time in minutes; a close earlier than the open (17:00-02:00) means after midnight.
const cl = x => { const c = min(x.c); return c <= min(x.o) ? c + 1440 : c; };
const fmtT = h => (h === '00:00' ? '00:00' : h.replace(/^0/, ''));
const weekOfMonth = dt => Math.ceil(dt.getDate() / 7);
// Seasonal slots: from/to as "MM-DD" (a season may wrap the new year).
const md = dt => (dt.getMonth() + 1) * 100 + dt.getDate();
const mdNum = v => { const [m, d] = v.split('-').map(Number); return m * 100 + d; };
export const inSeason = (x, dt) => !x.from || (mdNum(x.from) <= mdNum(x.to) ? md(dt) >= mdNum(x.from) && md(dt) <= mdNum(x.to) : md(dt) >= mdNum(x.from) || md(dt) <= mdNum(x.to));
const slotOn = (x, dt) => x.d.includes(dt.getDay()) && (!x.nth || weekOfMonth(dt) === x.nth) && inSeason(x, dt);
// True when the place only opens in a season and today is outside it.
export const offSeason = (m, dt = new Date()) => m.s.length > 0 && m.s.every(x => x.from) && !m.s.some(x => inSeason(x, dt));

export const runsOn = (m, dt) => m.s.filter(x => slotOn(x, dt));

export function nextDate(x) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 70; i++) { if (slotOn(x, d)) return new Date(d); d.setDate(d.getDate() + 1); }
  return null;
}

// "open" | "later" | "done" | null (not on that day)
export function status(m, dt) {
  const now = dt || new Date();
  const sl = runsOn(m, now);
  if (!sl.length) return null;
  const n = now.getHours() * 60 + now.getMinutes();
  if (sl.some(x => n >= min(x.o) && n < cl(x))) return 'open';
  if (sl.some(x => n < min(x.o))) return 'later';
  return 'done';
}
export const statusKey = s => (s === 'open' ? 'openNow' : s === 'later' ? 'later' : 'done');

// Status using the real hours, like Google Maps: "Open until 14:00", or "Closed" + "Opens at 15:00".
// Markets whose hours are only known as "mornings" get "This morning" instead of exact times.
export function statusLabel(m, dt) {
  const now = dt || new Date();
  const sl = runsOn(m, now);
  if (!sl.length) return null;
  const n = now.getHours() * 60 + now.getMinutes();
  if (sl.every(x => x.m)) return n < Math.max(...sl.map(x => cl(x))) ? { cls: 'open', text: t('thisMorning') } : closedStatus(m, now);
  const cur = sl.find(x => n >= min(x.o) && n < cl(x));
  if (cur) {
    // Split day (e.g. 9:00 to 15:00 and 18:00 to 23:00): also say when it reopens later today.
    const re = sl.filter(x => min(x.o) >= cl(cur)).sort((a, b) => min(a.o) - min(b.o))[0];
    return { cls: 'open', text: t('openUntil', { time: fmtT(cur.c) }), sub: re ? t('reopensAt', { time: fmtT(re.o) }) : '' };
  }
  const next = sl.filter(x => n < min(x.o)).sort((a, b) => min(a.o) - min(b.o))[0];
  if (next) return { cls: 'closed', text: t('closed'), sub: t('opensAt', { time: fmtT(next.o) }) };
  return closedStatus(m, now);
}

// Closed (already finished today, not open today, or out of season): "Closed" plus when it next opens,
// short like Google Maps: "Opens tomorrow 13:00", "Opens Fri 9:00", "Opens 1 Apr".
export function closedStatus(m, now = new Date()) {
  return { cls: 'closed', text: t('closed'), sub: nextShort(m, now) };
}
export function nextShort(m, from = new Date()) {
  const nx = nextOpen(m, from);
  if (!nx) return '';
  const d0 = new Date(from); d0.setHours(0, 0, 0, 0);
  const days = Math.round((nx.date - d0) / 864e5);
  const morning = nx.slot.m, time = fmtT(nx.slot.o);
  if (days === 0) return morning ? '' : t('opensAt', { time });
  if (days === 1) return morning ? t('opensTomorrowM') : t('opensTomorrow', { time });
  if (days < 7) { const day = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(nx.date); return morning ? t('opensDayM', { day }) : t('opensDay', { day, time }); }
  return t('opensDate', { date: new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(nx.date) });
}

// Next time it opens after `from` (within ~10 weeks): { date, slot } or null.
export function nextOpen(m, from = new Date()) {
  const n0 = from.getHours() * 60 + from.getMinutes();
  const d = new Date(from); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const slots = m.s.filter(x => slotOn(x, d)).sort((a, b) => min(a.o) - min(b.o));
    const hit = slots.find(x => i > 0 || min(x.o) > n0);
    if (hit) return { date: new Date(d), slot: hit };
    d.setDate(d.getDate() + 1);
  }
  return null;
}
export function nextOpenText(m, from = new Date()) {
  const nx = nextOpen(m, from);
  if (!nx) return '';
  const day = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(nx.date);
  return t('nextDate', { date: `${day}, ${nx.slot.m ? t('morning').toLowerCase() : fmtT(nx.slot.o)}` });
}

export function hoursText(m) {
  if (!m.s.length) return tx(m.occasional_when);
  return m.s.map(x => {
    let days;
    if (x.nth) days = t('nth', { nth: t('nth' + x.nth), day: dayName(x.d[0]) });
    else {
      const ord = [1, 2, 3, 4, 5, 6, 0];
      const ds = ord.filter(d => x.d.includes(d));
      const run = ds.length >= 3 && ds.every((d, i) => i === 0 || ord.indexOf(d) === ord.indexOf(ds[i - 1]) + 1);
      days = run ? cap(dayName(ds[0], 'short')) + '-' + dayName(ds[ds.length - 1], 'short') : ds.map(d => cap(dayName(d, 'short'))).join(', ');
    }
    if (x.from) {
      const f = v => { const [mm, dd] = v.split('-').map(Number); return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(2026, mm - 1, dd)); };
      days = x.d.length === 7 ? `${f(x.from)} - ${f(x.to)}` : `${f(x.from)} - ${f(x.to)}: ${days}`;
    }
    return { days: typo(cap(days)), time: x.m ? t('morning') : fmtT(x.o) + '\u2060-\u2060' + fmtT(x.c) }; // word joiners: a time range never splits
  }).reduce((acc, h) => {
    // Same days twice (a morning and an afternoon slot): show them on one line.
    const prev = acc.find(a => a.days === h.days);
    if (prev) prev.time += ', ' + h.time; else acc.push({ ...h });
    return acc;
  }, []);
}
