// What's on, the end of Home (the frame's fixed end, ../README.md): one agenda by day, made of what the guide's modules
// have on a day. It holds nothing of its own and names no module: every module of the registry (../index.js) that exports
// agenda(now, tools) feeds it (README.md, "The feed"; today the markets and Local events). Its rules: plan.js; README.md
// beside this file says what it shows.
import { t, locale } from '../../i18n.js';
import { cap } from '../../schedule.js';
import { esc } from '../../ui.js';
import { MODULES } from '../index.js';
import { todayPart, soonPart, laterPart } from './plan.js';

// The agenda's date badge ("6" over "DEC"), which a module puts on its rows that carry a date (tools.badge; cls: a
// module's own colour for it).
const badge = (iso, cls = '') => { const a = new Date(iso + 'T00:00:00'); return `<span class="dbadge${cls ? ' ' + cls : ''}"><b>${a.getDate()}</b><small>${esc(a.toLocaleDateString(locale(), { month: 'short' }).replace('.', ''))}</small></span>`; };

// What's on as Home draws it: its heading and the agenda, or nothing when no module of the guide feeds it.
export function widget(now = new Date()) {
  const feeds = Object.values(MODULES).map(m => m.agenda && m.agenda(now, { badge })).filter(Boolean);
  if (!feeds.length) return '';
  const longDate = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
  const fmtWd = d => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(d).replace('.', '');
  const shortDay = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(d));
  const dayH = (label, d) => `<div class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}</div>`;
  const plus = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  // Today: every module's rows (a module that can show the rest elsewhere is cut at three, plan.js).
  const today = todayPart(feeds);
  // The next days: a module's day as its own rows, or folded under one row for the day ("Tue 6 Oct · 9 markets", which
  // opens on them) when the module asks for it.
  const dayRow = (p, d) => `<details class="mrow dayrow"><summary><span class="dbadge dday"><small>${esc(fmtWd(d))}</small><b>${d.getDate()}</b></span>
     <span class="nm">${esc(shortDay(d))}<small>${esc(p.feed.count(p.rows.length))} · ${esc([...new Set(p.where)].slice(0, 3).join(', '))}${p.rows.length > 3 ? '…' : ''}</small></span>
     <span class="rt"><span class="chev" aria-hidden="true"></span></span></summary>
     <div class="mbody"><div class="mini nested">${p.rows.join('')}</div></div></details>`;
  const soon = soonPart(feeds, plus);
  const soonRows = soon.days.flatMap(d => d.parts.flatMap(p => (p.feed.fold ? [dayRow(p, d.date)] : p.rows)));
  // Coming up (from day 3, 6 weeks): what the modules have with a date, cut by plan.js.
  const later = laterPart(feeds);
  // Today stays open while something is still on; once everything has finished it folds away
  // and the next two days open instead (with the first folded day unfolded: tomorrow's markets).
  const wsec = (label, d, hint, open, inner) => `<details class="wo-sec"${open ? ' open' : ''}><summary class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}${hint ? `<em>${esc(hint)}</em>` : ''}<span class="chev" aria-hidden="true"></span></summary>${inner}</details>`;
  const todayHint = !today.rows.length ? '' : today.live ? (today.on ? t('todayOpenN', { n: today.on }) : '') : t('todayDone');
  let agenda = wsec(t('today'), now, todayHint, today.live || !today.rows.length, today.rows.length ? `<div class="mini">${today.rows.join('')}</div>` : `<div class="empty">${esc(t('nothingToday'))}</div>`);
  if (soonRows.length) {
    let rows = soonRows.join('');
    if (!today.live) rows = rows.replace('<details class="mrow dayrow">', '<details class="mrow dayrow" open>');
    agenda += wsec(t('next2days'), null, soon.counts.map(c => c.feed.count(c.n)).join(' · '), !today.live, `<div class="mini">${rows}</div>`);
  }
  if (later.length) agenda += dayH(t('comingUp')) + `<div class="mini">${later.map(x => x.html).join('')}</div>`;
  const links = feeds.map(f => (f.link ? `<a href="${f.link.href}">${esc(f.link.label)}</a>` : '')).join('');
  if (links) agenda += `<div class="wo-links">${links}</div>`;

  return `<h2 class="sh">${esc(t('whatsOn'))}</h2>
   <section class="whatson">${agenda}</section>`;
}
