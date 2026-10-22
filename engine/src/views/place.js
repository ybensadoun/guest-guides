import { t, tx } from '../i18n.js';
import { HOUSE, QUICK_ALL, slots } from '../content.js';
import { hoursText, statusLabel, nextOpenText, closedStatus } from '../schedule.js';
import { stHTML } from '../ui.js';
import { hav, kmMe, gSearch } from '../geo.js';
import { esc, ICON, itemIcon } from '../ui.js';
import { miniMap, overviewMap } from './map.js';

// Place page (#p/<id>) for the Home quick tiles: see where it is, what it is, when it is open,
// then decide to call, get directions or open the official page.
const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>';
const WEB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>';
const tel = n => 'tel:' + n.replace(/\s+/g, '');

export function renderPlace(V, id, icons) {
  const p = QUICK_ALL.find(x => x.id === id);
  if (!p) { location.replace('#home'); return; }
  if (p.trains) { renderTransport(V, p, icons); return; }
  const now = new Date();
  const hasPt = typeof p.lat === 'number' && typeof p.lng === 'number' && !(p.lat === 0 && p.lng === 0);   // 0,0 = not placed yet (new tile in the editor)
  const raw = hasPt ? hav(HOUSE.lat, HOUSE.lng, p.lat, p.lng) : null;
  const km = raw != null && raw >= 0.8 ? Math.max(1, Math.round(raw * 1.3)) : null;
  const near = raw != null && raw < 0.8;
  const mapsUrl = p.gmaps || p.map || (p.name && p.town ? gSearch(p) : hasPt ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : '');
  const dirUrl = hasPt ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : p.map || '';

  let hours = '';
  if (p.always) hours = `<span class="st open">${esc(t('open24'))}</span>`;
  else if (p.schedule) {
    const m = { s: slots(p.schedule) };
    const live = statusLabel(m, now);
    hours = `${stHTML(live || closedStatus(m, now))}
      <div class="when">${hoursText(m).map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}</div>`;
  }
  const hoursBlock = hours || p.hours ? `<section class="pl-sec"><h3 class="section-h">${esc(t('hoursLabel'))}</h3><div class="pl-hours">${hours}${p.hours ? `<p>${esc(tx(p.hours))}</p>` : ''}${p.price ? `<p><b>${esc(t('perPerson', { p: p.price }))}</b>${p.priceNote ? `. ${esc(tx(p.priceNote))}` : ''}</p>` : ''}</div></section>` : '';

  V.innerHTML = `<div class="wrap place" style="gap:16px" data-q="${esc(p.id)}">
    <div class="pl-head"><span class="qi">${icons(p)}</span>
      <div><h2 class="title">${esc(tx(p.title || p.name))}</h2><p class="lead">${esc(tx(p.kind || p.sub))}</p><p class="pl-dist">${km != null ? `<span>${km} km ${esc(t('fromHouseShort'))}</span>` : ''}${near ? `<span>${esc(t('minWalk'))}</span>` : ''}${hasPt && kmMe(p) != null ? `<span>${kmMe(p)} km ${esc(t('fromYouShort'))}</span>` : ''}</p></div></div>
    ${hasPt ? `<a class="pl-map" href="${esc(mapsUrl)}" target="_blank" rel="noopener" aria-label="${esc(t('openInMaps'))}"><div id="plmap"></div><span class="pl-map-cta">${ICON.pin}${esc(t('openInMaps'))}</span></a>` : ''}
    <div class="pl-actions">
      ${p.phone ? `<a class="ccall" href="${tel(p.phone)}">${PHONE}<span>${esc(t('callNow'))} ${esc(p.phone)}</span></a>` : ''}
      ${dirUrl ? `<a class="btn primary" href="${esc(dirUrl)}" target="_blank" rel="noopener">${ICON.dir}${esc(t(hasPt ? 'directions' : 'openInMaps'))}</a>` : ''}
      ${mapsUrl ? `<a class="btn" href="${esc(mapsUrl)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>` : ''}
      ${p.web ? `<a class="btn" href="${esc(p.web)}" target="_blank" rel="noopener">${WEB}${esc(t('website'))}</a>` : ''}
    </div>
    ${p.what ? `<p class="pl-what">${esc(tx(p.what))}</p>` : ''}
    ${hoursBlock}
    ${(p.alt || []).length ? `<section class="pl-sec"><h3 class="section-h">${esc(t('alsoCall'))}</h3>${p.alt.map(a => `<a class="pl-alt" href="${tel(a.phone)}"><b>${esc(tx(a.name))}</b><span>${PHONE}${esc(a.phone)}</span></a>`).join('')}</section>` : ''}
  </div>`;
  if (hasPt) miniMap(V.querySelector('#plmap'), p.lng, p.lat);
}

// Taxi & train (#p/taxi): every option visible on the first screen as a row (what, how long, the verdict);
// tap a row for the details, the call button or directions. The stations map comes last.
function renderTransport(V, p, icons) {
  const row = (dot, cc, title, sub, right, body, extra = '') => `<details class="mrow" style="--cc:${cc}"><summary><span class="dot">${dot}</span>
    <span class="nm">${esc(title)}${extra}${sub.map(x => `<small>${esc(x)}</small>`).join('')}</span><span class="rt">${right}<span class="chev" aria-hidden="true"></span></span></summary>
    <div class="mbody">${body}</div></details>`;
  const taxi = row(icons(p), 'var(--tone-taxi)', tx(p.taxiName || p.name), [tx(p.taxiSub || '')], `<span class="st open">${esc(t('open24'))}</span>`,
    `${p.what ? `<div class="note">${esc(tx(p.what))}</div>` : ''}
     <div class="actions">${p.phone ? `<a class="btn primary" href="${tel(p.phone)}">${PHONE}${esc(t('callNow'))} ${esc(p.phone)}</a>` : ''}
     ${(p.alt || []).map(a => `<a class="btn" href="${tel(a.phone)}">${PHONE}${esc(tx(a.name))} ${esc(a.phone)}</a>`).join('')}</div>`);
  // Line badges in the line colours (Rodalies lines; long-distance trains in one colour), then journey times.
  const badges = s => `<span class="lbadges">${(s.badges || []).map(b => `<i class="lbadge${b.ink ? ' ink' : ''}" style="--lc:${b.c}">${esc(b.t)}</i>`).join('')}</span>`;
  const dests = s => (s.to || []).length ? `<table class="dests"><tbody>${s.to.map(d => `<tr><th>${esc(tx(d.dest))}</th><td>${esc(d.time)}</td><td>${d.note ? esc(tx(d.note)) : ''}</td></tr>`).join('')}</tbody></table>` : '';
  const trains = p.trains.map(s => row(itemIcon({ icon: 'train' }), 'var(--tone-blue)', tx(s.name),
    [`${tx(s.tag)} · ${t('minByCar', { n: s.min })}`], '',
    `${dests(s)}<div class="note">${esc(tx(s.what))}</div>
     <div class="actions"><a class="btn primary" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noopener">${ICON.dir}${esc(t('directions'))}</a>
 ${s.gmaps ? `<a class="btn" href="${esc(s.gmaps)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>` : ''}
     <a class="btn" href="${esc(s.link)}" target="_blank" rel="noopener">${WEB}${esc(t(s.linkKey))}</a></div>`, badges(s))).join('');
  V.innerHTML = `<div class="wrap place transport" style="gap:14px" data-q="${esc(p.id)}">
    <div class="pl-head"><span class="qi">${icons(p)}</span>
      <div><h2 class="title">${esc(tx(p.title || p.name))}</h2><p class="lead">${esc(tx(p.kind || ''))}</p></div></div>
    <h3 class="section-h">${esc(t('taxiH'))}</h3>
    <div class="mlist">${taxi}</div>
    <h3 class="section-h">${esc(t('byTrain'))}</h3>
    <div class="pl-map secmap"><div id="trmap"></div></div>
    <div class="mlist">${trains}</div>
  </div>`;
  overviewMap(V.querySelector('#trmap'), p.trains.map(s => ({ lat: s.lat, lng: s.lng, icon: 'train', tone: 'blue', cat: 'todo' })));
}
