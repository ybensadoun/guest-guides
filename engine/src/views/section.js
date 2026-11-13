import { t, tx, locale } from '../i18n.js';
import { SECTIONS, SPOTS, slots, shownNow, quickShown } from '../content.js';
import { hoursText, statusLabel, nextOpenText, closedStatus, runsOn, offSeason } from '../schedule.js';
import { esc, ICON, row, card, SECTION_LOOK, stHTML } from '../ui.js';
import { sorted, sortRow } from './markets.js';
import { overviewMap } from './map.js';
import { st } from '../state.js';
import { QUICK } from '../content.js';
import { quickIcon } from './home.js';
import { MODULES } from '../modules/index.js';
import { renderTransport } from './place.js';
import { dateRange, upcoming, when } from '../events.js';
import { HOUSE, MODULE_ON, SITE, REVIEWS } from '../content.js';
import GROUPS_FILE from '../groups.json';
const GROUPS = GROUPS_FILE.groups;

const GI = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const EVENT_TONE = { castells: 'var(--tone-red)', festa: 'var(--tone-orange)', carnival: 'var(--tone-green)', parade: 'var(--tone-blue)', food: 'var(--tone-wine)', fair: 'var(--tone-taxi)', film: 'var(--ink)', music: 'var(--tone-wine)', historical: 'var(--ink)', tradition: 'var(--tone-blue)', sports: 'var(--tone-red)', theatre: 'var(--tone-green)', art: 'var(--tone-orange)', kids: 'var(--tone-wine)', christmas: 'var(--tone-red)', religious: 'var(--tone-wine)', fireworks: 'var(--tone-blue)', flowers: 'var(--tone-green)' };
const EVENT_ICON = {
  castells: GI('<circle cx="12" cy="3.5" r="1.5"/><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="6" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="18" cy="13" r="1.5"/><path d="M4 21v-3a2 2 0 0 1 4 0v3M10 21v-3a2 2 0 0 1 4 0v3M16 21v-3a2 2 0 0 1 4 0v3"/>'),
  festa: GI('<path d="M4 20L9 5l10 10z"/><path d="M14 4l1-2M18 7l2-1M19 3l1 1"/>'),
  carnival: GI('<path d="M3 8c3-1 6-1 9 1 3-2 6-2 9-1-1 6-4 9-7 7-1-1-1-2-2-2s-1 1-2 2c-3 2-6-1-7-7z"/>'),
  parade: GI('<path d="M5 9l2-5 3 4 2-5 2 5 3-4 2 5v3H5z"/><path d="M5 15h14v5H5z"/>'),
  food: GI('<path d="M8 3v6a4 4 0 0 0 8 0V3z"/><path d="M12 13v8M8 21h8"/>'),
  fair: GI('<path d="M3 9l2-5h14l2 5"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>'),
  film: GI('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 6l4-3M10 6l4-3M17 6l4-3"/>'),
  music: GI('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  historical: GI('<path d="M4 21h16M5 21V10l7-6 7 6v11M9 21v-6h6v6"/>'),
  tradition: GI('<path d="M12 3c1 2 3 3 3 6a3 3 0 0 1-6 0c0-3 2-4 3-6z"/><path d="M10 13h4v8h-4z"/>'),
  sports: GI('<path d="M7.5 2.5l3.5 7.2M16.5 2.5L13 9.7"/><circle cx="12" cy="15.5" r="5.5"/>'),
  theatre: GI('<path d="M2.5 3h19"/><path d="M3 3v3c1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0V3"/><path d="M4 8.5c.5 4.5 2.5 7.5 5 9-1 1-1.5 2-1.5 3.5H4zM20 8.5c-.5 4.5-2.5 7.5-5 9 1 1 1.5 2 1.5 3.5H20z"/>'),
  art: GI('<path d="M8.5 7L12 3.5 15.5 7"/><rect x="3.5" y="7" width="17" height="13" rx="1"/><path d="M7 17l3.5-4 2.5 2.5 2-2 2 3.5"/>'),
  fireworks: GI('<path d="M10 2v3.5M10 12.5V16M3 9h3.5M13.5 9H17M5 4l2.5 2.5M12.5 11.5L15 14M5 14l2.5-2.5M12.5 6.5L15 4"/><path d="M19 16v5M16.5 18.5h5"/>'),
  religious: GI('<path d="M12 2.5V6M9 2.5h6"/><path d="M7 17.5c.8-1 1-2.5 1-4.5v-3a4 4 0 0 1 8 0v3c0 2 .2 3.5 1 4.5"/><path d="M4.5 17.5h15"/><path d="M10.5 20.5a1.5 1.5 0 0 0 3 0"/>'),
  christmas: GI('<path d="M12 1.2l.76 1.95 2.09.12-1.61 1.33.52 2.03L12 5.5l-1.76 1.13.52-2.03-1.61-1.33 2.09-.12z"/><path d="M12 8l-5 5.5h2.5L5.5 18h13l-4-4.5H17z"/><path d="M12 18v3"/>'),
  kids: GI('<path d="M12 2.5c3.2 0 5.5 2.6 5.5 6 0 3.7-2.8 6.6-5.5 7-2.7-.4-5.5-3.3-5.5-7 0-3.4 2.3-6 5.5-6z"/><path d="M12 15.5l-1 1.5h2z"/><path d="M12 17c-1.6 1.3 1.6 2.4 0 4.5"/>'),
  flowers: GI('<path d="M10.95 6.56a2.4 2.4 0 1 1 2.1 0 2.4 2.4 0 1 1 .64 1.99 2.4 2.4 0 1 1-1.69 1.23 2.4 2.4 0 1 1-1.69-1.23 2.4 2.4 0 1 1 .64-1.99z"/><path d="M12 9.8V21"/><path d="M12 17.5c0-2.5 2-4 5-4 0 2.8-2 4-5 4z"/>')
};
const GUIDE_ICON = {
  sofa: GI('<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>'),
  desk: GI('<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M8 20h8M12 15v5"/>'),
  washer: GI('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7.5 6.5h.01M10.5 6.5h3"/>'),
  home: GI('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  wifi: GI('<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
  bed: GI('<path d="M3 19V6M3 15h18v4M21 15v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11.5" r="1.8"/>'),
  kitchen: GI('<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 10h2M20 10h2M9 7c0-1.2 1-1.3 1-2.5M14 7c0-1.2 1-1.3 1-2.5"/>'),
  trash: GI('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  drop: GI('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  thermo: GI('<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>'),
  pool: GI('<path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M8 14V5a2 2 0 0 1 4 0M15 14V5a2 2 0 0 1 4 0M8 8h7M8 11h7"/>'),
  flame: GI('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 3 0-3 1-5 1-7z"/>'),
  box: GI('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'),
  key: GI('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
  car: GI('<path d="M4 17h16v-5l-2.5-5h-11L4 12z"/><path d="M4 12h16"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>')
};

const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>';

// Generic page for future sections: "spots" (restaurants, places...) or "info" (house rules...).
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

// A rating the way each language writes it (4.91, 4,91).
const starsTxt = n => n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Ratings and reviews: the listing's own rating and its latest reviews as they are, with a link to read them all.
// Never a selection by the host. rating/count left empty in reviews.json fall back to the house page's.
function reviewsBlock(fallback) {
  const r = REVIEWS;
  if (!r) return '';
  const stars = r.rating ?? fallback?.stars, n = r.count ?? fallback?.count, src = r.source || 'Airbnb';
  if (!stars && !r.url) return '';
  const when = d => new Date(d.length === 7 ? d + '-01T00:00:00' : d.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale(), d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  const qs = (r.quotes || []).filter(q => q.text).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3);
  return `<section class="hsec rev" id="hrev"><h3 class="section-h">${esc(t('reviewsH'))}</h3>
    ${stars ? `<p class="rv-sc"><b>★ ${starsTxt(stars)}</b>${n ? `<span>${esc(t('reviewsCount', { n: n.toLocaleString(locale()), src }))}</span>` : ''}</p>` : ''}
    ${qs.map(q => `<blockquote${q.lang ? ` lang="${esc(q.lang)}"` : ''}><p>${esc(q.text)}</p>${q.name || q.date ? `<footer>${esc([q.name, q.date && when(q.date)].filter(Boolean).join(' · '))}</footer>` : ''}</blockquote>`).join('')}
    <small class="rv-note">${esc(t('reviewsNote', { src }))}${r.updated ? ' ' + esc(t('reviewsChecked', { d: when(r.updated) })) : ''}</small>
    ${r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(t('reviewsAll', { src }))}</a>` : ''}
  </section>`;
}

export function renderSection(V, id) {
  const prevF = V.dataset.secf;
  const sec = SECTIONS.find(s => s.id === id);
  if (!sec) { location.replace('#home'); return; }
  if (MODULES[sec.kind]?.page && sec.status === 'live') { MODULES[sec.kind].page(V); return; }   // a module draws its own page
  if (sec.kind === 'transport' && sec.status === 'live' && sec.data) { const T = sec.data; renderTransport(V, { ...T, id: sec.id, title: t(sec.labelKey), tileIcon: QUICK.find(q => q.id === sec.id)?.icon }, quickIcon); return; }
  let body;
  if (sec.status !== 'live') {
    const look = SECTION_LOOK[id] || SECTION_LOOK.todo;
    body = `<div class="soonbox" data-k="${id}" style="--tc:${look.color};--ti:${look.ink ? 'var(--ink)' : '#fff'}"><span class="ib">${look.icon}</span><b>${esc(t('soon'))}</b></div>`;
  }
  else if (sec.kind === 'contacts') {
    // Emergency contacts: most urgent first. Each row says what it is, when it is open (same format
    // and live status as markets), and offers a call button, a map link or an online link.
    const tel = n => 'tel:' + n.replace(/\s+/g, '');
    const maps = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
    const now = new Date();
    const hours = it => {
      if (it.always) return `<div class="chours"><span class="st open">${esc(t('open24'))}</span></div>`;
      if (!it.schedule) return '';
      const m = { s: slots(it.schedule) };
      const live = statusLabel(m, now);
      const pill = stHTML(live || closedStatus(m, now));
      const next = '';
      return `<div class="chours">${pill}<div class="when">${hoursText(m).map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}${next}</div></div>`;
    };
    const groupName = id => { const k = 'c_' + ({ hospital: 'health', pharmacy: 'health', clinic: 'health', medical: 'health' }[id] || id), s = t(k); return s === k ? '' : s; };   // research can name a group its own way
    body = (sec.data?.groups || []).map(g => `<section class="cgroup" data-g="${esc(g.id)}">${groupName(g.id) ? `<h3 class="section-h">${esc(groupName(g.id))}</h3>` : ''}
      <div class="clist">${g.items.map(it => `<div class="crow">
        <div class="ctx"><b>${esc(tx(it.name))}</b>${it.what ? `<span>${esc(tx(it.what))}</span>` : ''}${hours(it)}
          ${it.address || it.map || it.link || it.web ? `<span class="clinks">${it.address || it.map ? `<a class="cmap" href="${it.map || maps(it.address)}" target="_blank" rel="noopener">${ICON.pin}${esc(t('openMap'))}</a>` : ''}${it.web ? `<a class="cmap" href="${esc(it.web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}${it.link ? `<a class="cmap" href="${esc(it.link.url)}" target="_blank" rel="noopener">${esc(t(it.link.label))}</a>` : ''}</span>` : ''}</div>
        ${it.phone ? `<a class="ccall" href="${tel(it.phone)}" aria-label="${esc(tx(it.name))}: ${esc(it.phone)}">${PHONE}<span>${esc(it.phone)}</span></a>` : ''}
      </div>`).join('')}</div></section>`).join('');
  }
  else if (sec.kind === 'house') {
    // The house, like on Airbnb: photos, the key facts, description and beds, always linking back to the listing.
    const h = sec.data;
    const rate = { stars: REVIEWS?.rating ?? h.rating?.stars, count: REVIEWS?.count ?? h.rating?.count };
    const HI = { pool: GUIDE_ICON.pool, flame: GUIDE_ICON.flame, desk: GUIDE_ICON.box, view: GI('<path d="M2 20l7-11 4 6 3-4 6 9z"/><circle cx="17" cy="6" r="2"/>') };
    body = `<div class="hgal" id="hgal">${h.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}"></button>`).join('')}<span class="hcount" id="hcount">1 / ${h.photos.length}</span></div>
      <a class="hsticky" id="hsticky" href="#s/house" aria-hidden="true" tabindex="-1"><span class="hs-t"><b><span class="hs-n">${esc(SITE.name)}</span>${rate.stars ? `<i class="hs-r">★ ${starsTxt(rate.stars)}</i>` : ''}</b><small>${esc((x => [x[1], x[2], x[x.length - 1]].filter(Boolean).join(' · '))(tx(h.summary).split(' · ')))}</small></span></a>
      <p class="hsum" id="hsum"><b>${esc(tx(h.summary))}</b>${rate.stars ? (x => REVIEWS ? `<button type="button" class="hsum-r" data-rev>${x}</button>` : `<span>${x}</span>`)(`★ ${starsTxt(rate.stars)}${rate.count ? ' · ' + esc(t('airbnbReviews', { n: rate.count })) : ''}`) : ''}</p>
      ${h.url ? `<a class="hbook" href="${esc(h.url)}" target="_blank" rel="noopener"><span>${esc(t('bookAirbnbLead'))}</span><b>${esc(t('bookAirbnb'))}</b></a>` : ''}
      ${h.highlights?.length ? `<div class="hhl">${h.highlights.map(x => `<div${tx(x.t).split(/\s+/).some(w => w.length > 14) ? ' class="hw"' : ''}><span class="dot" style="--cc:var(--tone-blue)">${HI[x.icon] || ''}</span><b>${esc(tx(x.t))}</b>${x.s ? `<small>${esc(tx(x.s))}</small>` : ''}</div>`).join('')}</div>` : ''}
      ${(() => { const ps = tx(h.description).split(/\n\s*\n/).filter(Boolean); return !ps.length ? '' : `<section class="hsec hdesc"><h3 class="section-h">${esc(t('aboutHouse'))}</h3><p>${esc(ps[0] || '')}</p>${ps.length > 1 ? `<div class="hd-more" hidden>${ps.slice(1).map(p => `<p>${esc(p)}</p>`).join('')}</div><button type="button" class="hd-tog" aria-expanded="false">${esc(t('readMore'))}</button>` : ''}</section>`; })()}
      ${h.tour ? `<section class="hsec tour"><h3 class="section-h">${esc(t('photoTour'))}</h3>${h.tour.map(r => `<h4>${esc(tx(r.room))}</h4><div class="gphotos zg">${r.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>`).join('')}</section>` : ''}
      ${h.beds?.length ? `<section class="hsec"><h3 class="section-h">${esc(t('whereSleep'))}</h3><ul class="glist">${h.beds.map(b => `<li>${esc(tx(b))}</li>`).join('')}</ul></section>` : ''}
      ${h.amenities ? (() => { const all = h.amenities.flatMap(g => g.items), top = (h.amenTop || []).map(t => all.find(i => tx(i) === tx(t))).filter(Boolean);   // the most asked for first, as long as the host kept them
        const key = h.amenFirst ? [...top, ...all.filter(i => !top.includes(i))].slice(0, h.amenFirst) : ['Private pool', 'Air conditioning', 'Wifi', 'Dedicated workspace', 'Smart TVs', 'Fully equipped kitchen', 'Charcoal', 'Washing machine'].map(k => all.find(i => i.en.startsWith(k))).filter(Boolean);
        return `<section class="hsec amen"><h3 class="section-h">${esc(t('amenH'))}</h3><ul class="amkey">${key.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>${all.length > key.length ? `<details class="amall"><summary>${esc(t('amenAll', { n: all.length }))}</summary>${h.amenities.map(g => `<h4>${esc(tx(g.t))}</h4><ul>${g.items.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>`).join('')}</details>` : ''}</section>`; })() : ''}
      ${reviewsBlock(rate)}
      ${h.url ? `<div class="actions"><a class="btn primary" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(t('bookAirbnb'))}</a>${h.photosUrl ? `<a class="btn" href="${esc(h.photosUrl)}" target="_blank" rel="noopener">${esc(t('allPhotosAirbnb'))}</a>` : ''}</div>` : ''}`;
  }
  else if (sec.kind === 'events') {
    // Local events: next date of each, soonest first, grouped by month. Past dates (and today's finished ones) drop off.
    const fmt = (d, o) => d.toLocaleDateString(locale(), o);
    let month = '';
    body = `<div class="mlist events">${upcoming(sec.data?.items).map(x => {
      const m = fmt(new Date(x.o.start + 'T00:00:00'), { month: 'long', year: 'numeric' });
      const head = m !== month ? `<h3 class="evm">${esc(m.charAt(0).toUpperCase() + m.slice(1))}</h3>` : '';
      month = m;
      return head + eventRow(x.e, x.o, x);
    }).join('')}</div>`;
  }
  else if (sec.kind === 'spots') {
    // Same pattern as Markets: an overview map, then rows ranked by distance (from the house or from you). A place with no
    // hours of ours shows Google's card when its row opens (gcard: true, engine/src/gcard.js).
    // A place closed for the season and opening in more than 30 days is not shown (content.js shownNow): the counts, the
    // chips, the filters and the overview map follow, since they all start from this list.
    const all = SPOTS.filter(s => s.section === id && shownNow(s));
    // Quick filters when items have a "group" (What to do: Kids & fun, Beach, Sights & towns).
    const groups = [...new Set(all.map(s => s.group).filter(g => g in GROUPS))];   // only groups with a label (engine/src/groups.json)
    const gsel = groups.includes(st.sgroup[id]) ? st.sgroup[id] : 'all';
    // Open now first, then places opening later today, then the rest; each block by distance.
    // 3: no hours of ours (on purpose for many: Google's live line shows when the row opens, gcard.js), so not known. Open now
    // and Opens later today keep them after the ones we know, under a quiet heading, so a guest never loses the host's picks.
    const now0 = new Date(), nmin = now0.getHours() * 60 + now0.getMinutes();
    const tm = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
    // A season of ours and no hours (schedule.js seasonOnly): closed out of season, not known in season.
    const stateOf = s => {
      if (s.always) return 0;
      if (!(s.s && s.s.length)) return offSeason(s, now0) ? 2 : 3;
      const lab = statusLabel(s, now0);
      if (lab && lab.cls === 'open') return 0;
      return runsOn(s, now0).some(x => tm(x.o) > nmin) ? 1 : 2;
    };
    const timed = all.some(s => s.s && s.s.length);
    let ofsel = timed && ['now', 'later'].includes(st.openf[id]) ? st.openf[id] : 'any';
    const byGroup = gsel === 'all' ? all : all.filter(s => s.group === gsel);
    
    // Feature filters (restaurants, things to do): only the ones some place has; several can be on at once.
    const FEATS = { menuDia: s => (s.setMenus || []).some(x => x.kind === 'menuDia'), tasting: s => (s.setMenus || []).some(x => /^tasting/.test(x.kind)), dogs: s => (s.tags || []).includes('dogs'), veggie: s => (s.tags || []).includes('veggie'), kidsfun: s => (s.tags || []).includes('kidsfun') };
    const FEAT_SECS = { restaurants: ['menuDia', 'tasting', 'dogs', 'veggie'], todo: ['kidsfun', 'dogs'] };
    const feats = (FEAT_SECS[id] || []).filter(k => all.some(FEATS[k]));
    const fsel = (st.featf[id] || []).filter(k => feats.includes(k));
    const byFeat = byGroup.filter(s => fsel.every(k => FEATS[k](s)));
    const nNow = byFeat.filter(s => stateOf(s) === 0).length, nLater = byFeat.filter(s => stateOf(s) === 1).length;   // what we know only
    // A filter with nothing in it is hidden, and falls back to Any time if it was selected.
    if ((ofsel === 'now' && !nNow) || (ofsel === 'later' && !nLater)) ofsel = 'any';
    const filtered = ofsel === 'any' ? byFeat : byFeat.filter(s => [ofsel === 'now' ? 0 : 1, 3].includes(stateOf(s)));
    // The guest's sort inside each block; Any time keeps the not known among the closed, as before.
    const kOf = s => (ofsel === 'any' ? Math.min(stateOf(s), 2) : stateOf(s));
    const l = timed ? sorted(filtered).map((s, i) => ({ s, i, k: kOf(s) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.s) : sorted(filtered);
    const k3 = ofsel === 'any' ? -1 : l.findIndex(s => stateOf(s) === 3);
    const ochips = timed ? `<div class="gchips ochips" role="group">${[['any', 'f_anyTime', byFeat.length], ['now', 'f_openNow', nNow], ['later', 'f_openLater', nLater]].filter(([k, , n]) => k === 'any' || n).map(([k, key, n]) => `<button class="gchip" data-openf="${k}" data-sec="${id}" aria-pressed="${k === ofsel}"${k === 'now' ? ' style="--cc:var(--green)"' : k === 'later' ? ' style="--cc:var(--blue)"' : ''}>${esc(t(key))}<span class="n">${n}</span></button>`).join('')}</div>` : '';
    const fchips = feats.length ? `<div class="gchips fchips" role="group">${feats.map(k => `<button class="gchip" data-featf="${k}" data-sec="${id}" aria-pressed="${fsel.includes(k)}">${esc(t('ff_' + k))}<span class="n">${byGroup.filter(FEATS[k]).length}</span></button>`).join('')}</div>` : '';
    const toneOf = g => GROUPS[g] || all.find(s => s.group === g)?.tone;
    const gchips = groups.length > 1 ? `<div class="gchips" role="group">${['all', ...groups].map(g => `<button class="gchip" data-sgroup="${g}" data-sec="${id}" aria-pressed="${g === gsel}"${g !== 'all' && toneOf(g) ? ` style="--cc:var(--tone-${toneOf(g)})"` : ''}>${esc(t('g_' + g))}<span class="n">${g === 'all' ? all.length : all.filter(s => s.group === g).length}</span></button>`).join('')}</div>` : '';
    V.dataset.secf = gsel + '|' + ofsel;
    const now = new Date();
    // A Home quick tile shown on top of the page ("highlight" in sections.json), e.g. the bar next door.
    const hq = sec.highlight && QUICK.find(q => q.id === sec.highlight && quickShown(q));
    const hl = hq ? `<div class="qcalls"><a class="qcall wide" data-q="${hq.id}" href="#p/${hq.id}"><span class="qi">${quickIcon(hq)}</span><span class="qt"><b>${esc(tx(hq.name))}</b>${hq.sub ? `<small>${esc(tx(hq.sub))}</small>` : ''}</span></a></div>` : '';
    body = all.length ? `${hl}<a class="pl-map secmap" href="#map" data-mapcat="${esc(all[0].cat)}" aria-label="${esc(t('openMap'))}"><div id="secmap"></div><span class="pl-map-cta">${ICON.pin}${esc(t('openMap'))}</span></a>
      ${gchips}${ochips}${fchips}${sortRow()}
      ${l.length ? `<div class="mlist">${l.map((m, i) => (i === k3 ? `<h3 class="mgh">${esc(t('f_noHours'))}</h3>` : '') + row(m, { date: now, live: true, gcard: true })).join('')}</div>` : `<p class="empty">${esc(t('f_noneOpen'))}</p>`}` : `<div class="empty">${esc(t('soon'))}</div>`;
  } else {
    // Info page (House guide): one expandable row per topic, same look as the other lists.
    const tone = k => k === 'ink' ? 'var(--ink)' : k === 'yellow' ? 'var(--tone-taxi)' : `var(--tone-${k})`;
    const link = l => l.dir
      ? `<a class="btn primary" href="https://www.google.com/maps/dir/?api=1&destination=${HOUSE.lat},${HOUSE.lng}" target="_blank" rel="noopener">${ICON.dir}${esc(t(l.labelKey))}</a>`
      : `<a class="btn" href="${esc(l.href)}">${esc(t(l.labelKey))}</a>`;
    body = `${MODULE_ON('house') ? `<a class="allphotos" href="#s/house"><img src="${esc(HOUSE.photo || 'house.jpg')}" alt=""><span><b>${esc(t('housePhotos'))}</b><small>${esc(t('housePhotosSub'))}</small></span><span class="chev go-r" aria-hidden="true"></span></a>` : ''}<div class="mlist guide">${(sec.data?.blocks || []).map(b => `<details class="mrow" data-id="${esc(b.id)}" data-tone="${esc(b.tone)}" style="--cc:${tone(b.tone)}"><summary>
      <span class="dot">${GUIDE_ICON[b.icon] || ''}</span>
      <span class="nm">${esc(tx(b.title))}${b.sub ? `<small>${esc(tx(b.sub))}</small>` : ''}</span><span class="rt"><span class="chev" aria-hidden="true"></span></span></summary>
      <div class="mbody">
        ${b.photos ? `<div class="gphotos zg">${b.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        ${b.body ? tx(b.body).split(/\n\s*\n/).map(p => `<p class="note">${esc(p)}</p>`).join('') : ''}
        ${b.items?.length === 1 ? `<p class="note">${esc(tx(b.items[0]))}</p>` : b.items ? `<ul class="glist">${b.items.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>` : ''}
        ${b.links ? `<div class="actions">${b.links.map(link).join('')}</div>` : ''}
      </div></details>`).join('')}</div>${id === 'message' && !MODULE_ON('house') ? reviewsBlock() : ''}`;
  }
  const openIds = new Set([...V.querySelectorAll('.mrow[open]')].map(e => e.dataset.id));
  const oldMap = V.dataset.sec === id ? V.querySelector('#secmap') : null;
  V.dataset.sec = id;
  V.innerHTML = `<div class="wrap" style="gap:16px">
    <div><h2 class="title">${esc(t(sec.labelKey))}</h2>${t(sec.labelKey + 'Lead') !== sec.labelKey + 'Lead' ? `<p class="lead">${esc(t(sec.labelKey + 'Lead'))}</p>` : ''}</div>
    ${body}</div>`;
  V.querySelectorAll('.mrow').forEach(e => { if (openIds.has(e.dataset.id)) e.open = true; });
  // The house: "Read more" opens the rest of the description; the slim bar on top comes back once the facts scroll away.
  const tog = V.querySelector('.hd-tog');
  if (tog) tog.addEventListener('click', () => { const m = V.querySelector('.hd-more'), open = m.hidden; m.hidden = !open; tog.setAttribute('aria-expanded', String(open)); tog.textContent = t(open ? 'showLess' : 'readMore'); });
  // The rating under the house's facts jumps to the reviews further down.
  const rb = V.querySelector('[data-rev]');
  if (rb) rb.addEventListener('click', () => V.querySelector('#hrev')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const hs = V.querySelector('#hsticky');
  if (hs) { hs.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }); houseBar(); }
  V.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => lightbox([...b.parentElement.querySelectorAll('[data-zoom] img')].map(i => i.getAttribute('src')), +b.dataset.zoom)));
  const gal = V.querySelector('#hgal');
  if (gal) gal.addEventListener('scroll', () => { const n = Math.round(gal.scrollLeft / gal.clientWidth) + 1; V.querySelector('#hcount').textContent = `${n} / ${gal.querySelectorAll('img').length}`; }, { passive: true });
  if (window.__openRow) { const r = V.querySelector(`.mrow[data-id="${window.__openRow}"]`); window.__openRow = null; if (r) { r.open = true; setTimeout(() => r.scrollIntoView({ block: 'center' }), 50); } }
  const box = V.querySelector('#secmap');
  if (box && oldMap && prevF === V.dataset.secf) box.replaceWith(oldMap);
  else if (box) { const gs = (V.dataset.secf || '').split('|')[0]; const extra = id === 'restaurants' ? QUICK.filter(q => q.id === 'shop' && q.lat && quickShown(q)).map(q => ({ lat: q.lat, lng: q.lng, pinHtml: quickIcon('shop'), pinColor: 'var(--green)' })) : [];
    overviewMap(box, SPOTS.filter(s => s.section === id && !s.nomap && shownNow(s) && (gs === 'all' || !gs || s.group === gs)).concat(extra)); }
}

// Full-screen photo viewer: swipe through the group, tap the cross or the backdrop to close.
function lightbox(srcs, start) {
  const o = document.createElement('div');
  o.className = 'lbox';
  o.innerHTML = `<div class="lb-track">${srcs.map(s => `<div class="lb-cell"><img src="${s}" alt=""></div>`).join('')}</div><span class="lb-n">${start + 1} / ${srcs.length}</span><button type="button" class="lb-x" aria-label="${esc(t('close'))}">×</button>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
  const tr = o.querySelector('.lb-track');
  requestAnimationFrame(() => { tr.scrollLeft = start * tr.clientWidth; });
  tr.addEventListener('scroll', () => { o.querySelector('.lb-n').textContent = `${Math.round(tr.scrollLeft / tr.clientWidth) + 1} / ${srcs.length}`; }, { passive: true });
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.querySelector('.lb-x').onclick = close;
  o.addEventListener('click', e => { if (e.target.classList.contains('lb-cell')) close(); });
  addEventListener('hashchange', close);
}

// Slim bar on The house page: the name, the key facts and the rating stay on top while scrolling (tap: back to the photos).
// Scroll-linked, not a switch: the bar fades and slides in gradually over the 90 px in which the facts line
// scrolls under it, and goes back the same way. One update per frame, no CSS transition (that is what flickered).
let hbRaf = 0;
function houseBar() {
  hbRaf = 0;
  const bar = document.getElementById('hsticky'), sum = document.getElementById('hsum');
  if (!bar || !sum) return;
  const y = sum.getBoundingClientRect().bottom;
  const k = Math.min(1, Math.max(0, (150 - y) / 90));
  bar.style.setProperty('--k', k.toFixed(3));
  const on = k > 0.5;
  if (bar.classList.contains('on') !== on) { bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', String(!on)); bar.tabIndex = on ? 0 : -1; }
}
addEventListener('scroll', () => { if (!hbRaf) hbRaf = requestAnimationFrame(houseBar); }, { passive: true });
