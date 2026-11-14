import { t, tx, locale } from '../i18n.js';
import { SECTIONS, slots, QUICK } from '../content.js';
import { hoursText, statusLabel, closedStatus } from '../schedule.js';
import { esc, ICON, SECTION_LOOK, stHTML } from '../ui.js';
import { MODULES } from '../modules/index.js';
import { icon as quickIcon } from '../modules/highlights/index.js';
import { renderTransport } from './place.js';
import { HOUSE, MODULE_ON, SITE, REVIEWS } from '../content.js';

const GI = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// The kinds of event, their icons and colours, drawn by the events module (modules/events/row.js). Kept here, written
// as they are, because the maker's build (onboarding-site/src/build.py), its checks and the worker's test of event kinds
// read them as text in this file, and content/events.json's _doc points here.
export { EVENT_ICON, EVENT_TONE };
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

// A section's page (#s/<id>). A module draws its own (modules/index.js: rubbish, markets, the host's lists of places, Local
// events); the others are drawn here: Getting around, a section still to come, emergencies, the house, the house guide.
export function renderSection(V, id) {
  const sec = SECTIONS.find(s => s.id === id);
  if (!sec) { location.replace('#home'); return; }
  if (MODULES[sec.kind]?.page && sec.status === 'live') { MODULES[sec.kind].page(V, sec); return; }   // a module draws its own page
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
  else {
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
  sectionFrame(V, sec, body, () => {
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
  });
}

// A section's page as every list and guide page has it: its title and lead, then its body. Rows the guest had opened stay
// open when the page is drawn again (a filter, the status refreshed each minute); after(), the page's own wiring; then the
// row a Home shortcut asked for (Wi-Fi, Check-out) is opened. Also used by the modules that draw a section's page in this
// shape (modules/places, modules/events).
export function sectionFrame(V, sec, body, after) {
  const openIds = new Set([...V.querySelectorAll('.mrow[open]')].map(e => e.dataset.id));
  V.dataset.sec = sec.id;
  V.innerHTML = `<div class="wrap" style="gap:16px">
    <div><h2 class="title">${esc(t(sec.labelKey))}</h2>${t(sec.labelKey + 'Lead') !== sec.labelKey + 'Lead' ? `<p class="lead">${esc(t(sec.labelKey + 'Lead'))}</p>` : ''}</div>
    ${body}</div>`;
  V.querySelectorAll('.mrow').forEach(e => { if (openIds.has(e.dataset.id)) e.open = true; });
  if (after) after();
  if (window.__openRow) { const r = V.querySelector(`.mrow[data-id="${window.__openRow}"]`); window.__openRow = null; if (r) { r.open = true; setTimeout(() => r.scrollIntoView({ block: 'center' }), 50); } }
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
