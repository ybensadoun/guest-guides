// What the markets module gives What's on, the agenda at the end of Home (../whatson/README.md, "The feed"): today's
// markets as rows, a day's markets with their hours, the monthly ones coming up, and the link to the day's list. What's on
// decides the order between modules, the cuts and the headings, and names no module; a market's row is drawn here.
// Moved from ../whatson/widget.js on 17 Nov 2026, unchanged.
import { t } from '../../i18n.js';
import { MODULE_ON } from '../../content.js';
import { runsOn, statusLabel, nextOpen } from '../../schedule.js';
import { esc, title, catIcon, stHTML, distHTML } from '../../ui.js';
import { MARKETS, todaysMarkets } from './data.js';

// A market's times on a day, as the next days' rows say them: "8-14", or "Morning" when only the morning is known.
const hhmm = h => h.replace(/^0/, '');
const timesOn = (m, d) => runsOn(m, d).map(x => (x.m ? t('morning') : `${hhmm(x.o)}-${hhmm(x.c)}`)).join(', ');

// tools.badge(iso, cls): What's on's date badge. Nothing (null) when the guide has no markets.
export function agenda(now = new Date(), { badge }) {
  if (!MODULE_ON('markets')) return null;
  // Today: the day's markets of the default kinds (data.js), each opening on the map with its status now.
  const mrow = m => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
     <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
     ${stHTML(statusLabel(m, now))}</a>`;
  // Another day: the same row with that day's hours.
  const drow = (m, d) => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
       <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
       <span class="st plain">${esc(timesOn(m, d))}</span></a>`;
  const plus = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  // Today's markets: open now first, then opening later today, then finished.
  const todays = todaysMarkets(now);
  const nmin = now.getHours() * 60 + now.getMinutes(), tmin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const live = m => { const l = statusLabel(m, now); return l && l.cls === 'open' ? 0 : runsOn(m, now).some(x => !x.m && tmin(x.o) > nmin) ? 1 : 2; };
  const todaysS = todays.map((m, i) => ({ m, i, k: live(m) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.m);
  // Coming up (from day 3, 6 weeks): the markets held on a week of the month (the monthly ones, of any kind: worth
  // planning for), each on its next date.
  const monthly = MARKETS.filter(m => m.s.some(x => x.nth)).map(m => { const nx = nextOpen(m, plus(3)); return nx && { m, d: nx.date, days: Math.round((nx.date - plus(0).setHours(0, 0, 0, 0)) / 864e5) }; }).filter(x => x && x.days <= 42);
  return {
    today: { rows: todaysS.map(mrow), on: todays.filter(m => live(m) === 0).length, live: todays.some(m => live(m) < 2),
      more: n => `<a class="wo-more" href="#markets/today">${esc(t('moreMarkets', { n }))}</a>` },
    // A day's markets go under one row of What's on ("Tuesday", "9 markets · three towns…"): fold, with their towns.
    fold: true,
    day: (n, d) => { const l = todaysMarkets(d); return { rows: l.map(m => drow(m, d)), where: l.map(m => m.town) }; },
    count: n => t('nMarkets', { n }),
    later: monthly.map(x => { const iso = x.d.toLocaleDateString('sv'); return { k: iso, recurring: true, html: `<a href="#map/m/${encodeURIComponent(x.m.id)}">${badge(iso, 'dbm')}
     <span class="nm">${esc(title(x.m))}<small>${esc(t('cat_' + x.m.cat))} · ${esc(x.m.town)}</small></span><span class="st plain">${esc(t('inDays', { n: x.days }))}</span></a>` }; }),
    link: { href: '#markets/today', label: t('allMarkets') }
  };
}
