// An event as a row and its dates in words: the Local events page (page.js) and What's on (../whatson/) draw the same row.
// The event kinds' icons and colours: kinds.js.
import { t, tx, locale } from '../../i18n.js';
import { esc, ICON } from '../../ui.js';
import { EVENT_ICON, EVENT_TONE } from './kinds.js';

const D = s => new Date(s + 'T00:00:00');
const fmt = (d, o) => d.toLocaleDateString(locale(), o);
function dateRange(o) {
  const a = D(o.start), b = D(o.end);
  if (o.start === o.end) return fmt(a, { weekday: 'short', day: 'numeric', month: 'short' }) + (o.time ? ', ' + o.time : '');
  return a.getMonth() === b.getMonth() ? `${a.getDate()}-${fmt(b, { day: 'numeric', month: 'short' })}` : `${fmt(a, { day: 'numeric', month: 'short' })} - ${fmt(b, { day: 'numeric', month: 'short' })}`;
}
// "On now", "Today", "Tomorrow", "In 5 days".
export const when = x => (x.on ? t('onNow') : x.at || x.today ? t('today') : x.days === 1 ? t('tomorrow') : t('inDays', { n: x.days }));
export const dayBadge = o => { const a = D(o.start); return { d: a.getDate(), m: fmt(a, { month: 'short' }).replace('.', '') }; };

// One event as an expandable row (Local events page and Home "What's on"): what happens, then Maps and website.
// opts.dot replaces the type icon (Home uses a date badge), opts.right replaces the status on the right.
export function eventRow(e, o, st, opts = {}) {
  return `<details class="mrow" data-id="${esc(e.id)}" style="--cc:${EVENT_TONE[e.type] || 'var(--tone-blue)'}"><summary>
        <span class="dot${opts.dot ? ' dbadge-wrap' : ''}">${opts.dot || EVENT_ICON[e.type] || EVENT_ICON.festa}</span>
        <span class="nm">${esc(tx(e.name))}<small>${esc(e.town)} · ${esc(dateRange(o))}</small></span>
        <span class="rt">${opts.right ?? (st && (st.on || st.at || st.today) ? `<span class="st ${st.on ? 'open' : 'plain'}">${esc(when(st))}</span>` : o.status === 'expected' ? `<span class="st plain">${esc(t('expected'))}</span>` : '')}<span class="chev" aria-hidden="true"></span></span></summary>
        <div class="mbody">
          <div class="note">${esc(tx(e.description))}</div>
          ${o.status === 'expected' ? `<p class="hnote">${esc(t('expectedNote'))}</p>` : ''}
          <div class="actions">
            <a class="btn primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue + ', ' + e.town)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>
            ${e.url ? `<a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}
          </div>
        </div></details>`;
}
