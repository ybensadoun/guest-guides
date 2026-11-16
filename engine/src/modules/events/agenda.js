// What the events module gives What's on, the agenda at the end of Home (../whatson/README.md, "The feed"): the upcoming
// events (plan.js upcoming, six weeks ahead) as the Local events page's own row (row.js), with What's on's date badge in
// place of the kind's icon, and the link to the page. What's on decides the order between modules, the cuts and the
// headings, and names no module. Moved from ../whatson/widget.js on 17 Nov 2026, unchanged.
import { t } from '../../i18n.js';
import { esc } from '../../ui.js';
import { EVENTS_SECTION } from './data.js';
import { upcoming } from './plan.js';
import { eventRow, evStatus } from './row.js';

// tools.badge(iso): What's on's date badge. Nothing (null) when the guide has no Local events section.
export function agenda(now = new Date(), { badge }) {
  const sec = EVENTS_SECTION; if (!sec) return null;
  const evs = upcoming(sec.data?.items, now).filter(x => x.on || x.days <= 42);
  // Events expand in place with the same details as on the Local events page. Under Today, a later start shows only its
  // time and an event of today without a time shows no status (we do not know whether it is on yet).
  const row = x => eventRow(x.e, x.o, x, { dot: badge(x.o.start), right: x.today ? '' : x.at ? `<span class="st plain">${esc(x.at)}</span>` : evStatus(x) });
  // Today's events: on now, or starting later today (shown with their start time), then the ones that have ended,
  // which stay for the day (plan.js). None counts in "open now", as before the feed.
  const evToday = evs.filter(x => x.days <= 0);
  return {
    today: { rows: evToday.map(row), on: 0, live: evToday.some(x => !x.ended) },
    day: n => ({ rows: evs.filter(x => x.days === n).map(row) }),
    count: n => t(n === 1 ? 'nEvent1' : 'nEvents', { n }),
    later: evs.filter(x => x.days > 2).map(x => ({ k: x.o.start, html: row(x) })),
    link: { href: '#s/events', label: t('allEvents') }
  };
}
