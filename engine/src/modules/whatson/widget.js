// What's on, the end of Home (the frame's fixed end, ../README.md): one agenda by day, fed by the markets module
// (modules/markets) and by Local events (views/section.js and events.js until events are a module). README.md beside this
// file says what it shows and its rules.
import { t, locale } from '../../i18n.js';
import { SECTIONS, MODULE_ON } from '../../content.js';
import { runsOn, statusLabel, cap, nextOpen } from '../../schedule.js';
import { esc, title, catIcon, stHTML, distHTML } from '../../ui.js';
import { MARKETS, todaysMarkets } from '../markets/data.js';
import { upcoming, when, dayBadge } from '../../events.js';
import { eventRow } from '../../views/section.js';

// A market's times on a day, as the next two days' rows say them: "8-14", or "Morning" when only the morning is known.
const hhmm = h => h.replace(/^0/, '');
const timesOn = (m, d) => runsOn(m, d).map(x => (x.m ? t('morning') : `${hhmm(x.o)}-${hhmm(x.c)}`)).join(', ');

// What's on as Home draws it: its heading and the agenda, or nothing when the guide has neither markets nor Local events.
export function widget(now = new Date()) {
  const todays = todaysMarkets(now);
  const longDate = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
  // What's on: one agenda by day. Today: the markets running today and events on now.
  // Tomorrow: how many markets (one row) and events starting. Then the next event days (6 weeks).
  const mrow = m => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
     <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
     ${stHTML(statusLabel(m, now))}</a>`;
  const evSec = SECTIONS.find(x => x.kind === 'events');
  const evs = upcoming(evSec?.data?.items, now).filter(x => x.on || x.days <= 42);
  // Events expand in place with the same details as on the Local events page. Under Today, a later start shows only its
  // time and an event of today without a time shows no status (we do not know whether it is on yet).
  const erow = x => { const b = dayBadge(x.o); return eventRow(x.e, x.o, x, { dot: `<span class="dbadge"><b>${b.d}</b><small>${esc(b.m)}</small></span>`, right: x.today ? '' : `<span class="st ${x.on ? 'open' : 'plain'}">${esc(x.at || when(x))}</span>` }); };
  // One row per day for the next two days: "Tue 6 Oct · 9 markets", red like the market icons.
  const msum = (list, href, d) => `<details class="mrow dayrow"><summary><span class="dbadge dday"><small>${esc(fmtWd(d))}</small><b>${d.getDate()}</b></span>
     <span class="nm">${esc(shortDay(d))}<small>${esc(t('nMarkets', { n: list.length }))} · ${esc([...new Set(list.map(m => m.town))].slice(0, 3).join(', '))}${list.length > 3 ? '…' : ''}</small></span>
     <span class="rt"><span class="chev" aria-hidden="true"></span></span></summary>
     <div class="mbody"><div class="mini nested">${list.map(m => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
       <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
       <span class="st plain">${esc(timesOn(m, d))}</span></a>`).join('')}</div></div></details>`;
  const fmtWd = d => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(d).replace('.', '');
  const shortDay = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(d));
  const dayH = (label, d) => `<div class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}</div>`;
  const plus = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  // Today: everything (markets running today and events on now).
  // Today's markets: open now first, then opening later today, then finished.
  const nmin = now.getHours() * 60 + now.getMinutes(), tmin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const live = m => { const l = statusLabel(m, now); return l && l.cls === 'open' ? 0 : runsOn(m, now).some(x => !x.m && tmin(x.o) > nmin) ? 1 : 2; };
  const todaysS = todays.map((m, i) => ({ m, i, k: live(m) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.m);
  const nOpen = todays.filter(m => live(m) === 0).length;
  // Today's events: on now, or starting later today (shown with their start time); finished ones are already gone from evs.
  const evToday = evs.filter(x => x.on || x.days === 0);
  const todayLive = todays.some(m => live(m) < 2) || evToday.length > 0;
  const todayRows = [...todaysS.slice(0, 3).map(mrow), ...(todays.length > 3 ? [`<a class="wo-more" href="#markets/today">${esc(t('moreMarkets', { n: todays.length - 3 }))}</a>`] : []), ...evToday.map(erow)];
  // Next 2 days: the markets of each day as one row, plus events starting then.
  const soonRows = [1, 2].flatMap(n => { const l = todaysMarkets(plus(n)); return [...(l.length ? [msum(l, '#markets/day/' + n, plus(n))] : []), ...evs.filter(x => x.days === n).map(erow)]; });
  // Coming up (from day 3, 6 weeks): events only, plus the monthly antiques markets, which are worth planning for.
  const monthly = MARKETS.filter(m => m.s.some(x => x.nth)).map(m => { const nx = nextOpen(m, plus(3)); return nx && { m, d: nx.date, days: Math.round((nx.date - plus(0).setHours(0, 0, 0, 0)) / 864e5) }; }).filter(x => x && x.days <= 42);
  const later = [...evs.filter(x => x.days > 2).map(x => ({ k: x.o.start, html: erow(x) })),
    ...monthly.slice(0, 2).map(x => { const iso = x.d.toLocaleDateString('sv'); const b = dayBadge({ start: iso }); return { k: iso, html: `<a href="#map/m/${encodeURIComponent(x.m.id)}"><span class="dbadge dbm"><b>${b.d}</b><small>${esc(b.m)}</small></span>
     <span class="nm">${esc(title(x.m))}<small>${esc(t('cat_' + x.m.cat))} · ${esc(x.m.town)}</small></span><span class="st plain">${esc(t('inDays', { n: x.days }))}</span></a>` }; })]
    .sort((p, q) => p.k.localeCompare(q.k)).slice(0, 5);
  // Today stays open while something is still on; once everything has finished it folds away
  // and the next two days open instead (with tomorrow's markets unfolded).
  const wsec = (label, d, hint, open, inner) => `<details class="wo-sec"${open ? ' open' : ''}><summary class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}${hint ? `<em>${esc(hint)}</em>` : ''}<span class="chev" aria-hidden="true"></span></summary>${inner}</details>`;
  const todayHint = !todayRows.length ? '' : todayLive ? (nOpen ? t('todayOpenN', { n: nOpen }) : '') : t('todayDone');
  let agenda = wsec(t('today'), now, todayHint, todayLive || !todayRows.length, todayRows.length ? `<div class="mini">${todayRows.join('')}</div>` : `<div class="empty">${esc(t('nothingToday'))}</div>`);
  if (soonRows.length) {
    let soon = soonRows.join('');
    if (!todayLive) soon = soon.replace('<details class="mrow dayrow">', '<details class="mrow dayrow" open>');
    const nM = [1, 2].reduce((a, n) => a + todaysMarkets(plus(n)).length, 0), nE = evs.filter(x => x.days >= 1 && x.days <= 2).length;
    agenda += wsec(t('next2days'), null, [nM ? t('nMarkets', { n: nM }) : '', nE ? t(nE === 1 ? 'nEvent1' : 'nEvents', { n: nE }) : ''].filter(Boolean).join(' · '), !todayLive, `<div class="mini">${soon}</div>`);
  }
  if (later.length) agenda += dayH(t('comingUp')) + `<div class="mini">${later.map(x => x.html).join('')}</div>`;
  const links = [MODULE_ON('markets') ? `<a href="#markets/today">${esc(t('allMarkets'))}</a>` : '', evSec ? `<a href="#s/events">${esc(t('allEvents'))}</a>` : ''].join('');
  if (links) agenda += `<div class="wo-links">${links}</div>`;

  return MODULE_ON('markets') || evSec ? `<h2 class="sh">${esc(t('whatsOn'))}</h2>
   <section class="whatson">${agenda}</section>` : '';
}
