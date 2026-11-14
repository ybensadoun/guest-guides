// A highlight's own page (#p/<id>, README.md "Its look"): see where it is, what it is, when it is open, then decide to call,
// get directions or open the official page. Every item of content/quick.json has one, also when Home leaves its card out
// for the season. An old guide's taxi card with "trains" opens Getting around's page instead (views/place.js, transport's).
import { t, tx } from '../../i18n.js';
import { HOUSE, TRANSPORT, slots } from '../../content.js';
import { hoursText, statusLabel, closedStatus, seasonStatus, seasonText } from '../../schedule.js';
import { stHTML, esc, ICON } from '../../ui.js';
import { hav, kmMe, gSearch, gDir } from '../../geo.js';
import { miniMap } from '../../views/map.js';
import { wantsCard, sectionHTML, slotHTML } from '../../gcard.js';
import { renderTransport, transportOf, PHONE, WEB, tel } from '../../views/place.js';
import { QUICK_ALL } from './data.js';
import { icon } from './icons.js';

export function page(V, id) {
  const p = QUICK_ALL.find(x => x.id === id);
  if (!p) { location.replace(id === 'taxi' && TRANSPORT ? '#s/transport' : '#home'); return; }   // the old taxi tile now lives in Getting around
  if (p.trains) { renderTransport(V, transportOf(p), icon); return; }
  const now = new Date();
  const hasPt = !p.nomap && typeof p.lat === 'number' && typeof p.lng === 'number' && !(p.lat === 0 && p.lng === 0);   // 0,0 = not placed yet (new tile in the editor); nomap: Google's position past its 30 days
  const raw = hasPt ? hav(HOUSE.lat, HOUSE.lng, p.lat, p.lng) : null;
  const km = raw != null && raw >= 0.8 ? Math.max(1, Math.round(raw * 1.3)) : null;
  const near = raw != null && raw < 0.8;
  const mapsUrl = p.gid || p.gmaps || p.map || (p.name && p.town) || hasPt ? gSearch(p) : '';
  // Directions by position, or by name once a position has run out (nomap); a tile never placed keeps its own map link.
  const byName = !hasPt && p.nomap && p.name, dirUrl = hasPt || byName ? gDir(p) : p.map || '';
  // The map opens Google Maps when tapped but carries no button of its own: the Google Maps button is in the actions
  // under it, and a button on the map hid its names.

  let hours = '';
  if (p.always) hours = `<span class="st open">${esc(t('open24'))}</span>`;
  else if (p.schedule) {
    const m = { s: slots(p.schedule) };
    const live = statusLabel(m, now);
    hours = `${stHTML(live || closedStatus(m, now))}
      <div class="when">${hoursText(m).map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}</div>`;
  }
  // A season of ours and no hours, as in a list row: "Closed" + "Opens 1 Jun" out of season, then the season.
  else if (seasonText({ s: [], season: p.season })) { const m = { s: [], season: p.season };
    hours = `${stHTML(seasonStatus(m, now))}<div class="when"><span>${esc(seasonText(m))}</span></div>`; }
  // No hours of ours but a Google id: Google's open-now line (engine/src/gcard.js) where the hours would be, shown only
  // once it has something to say; our "Google Maps" button goes last (data-gbtn), kept back until we know no line comes.
  // A page that already has its hours block (a note, a price) keeps it and gets the line under it, under the same heading.
  const gc = wantsCard(p) && !!mapsUrl;
  const hoursBlock = hours || p.hours ? `<section class="pl-sec"><h3 class="section-h">${esc(t('hoursLabel'))}</h3><div class="pl-hours">${hours}${p.hours ? `<p>${esc(tx(p.hours))}</p>` : ''}${p.price ? `<p><b>${esc(t('perPerson', { p: p.price }))}</b>${p.priceNote ? `. ${esc(tx(p.priceNote))}` : ''}</p>` : ''}</div>${gc ? slotHTML(p) : ''}</section>` : gc ? sectionHTML(p, t('hoursLabel')) : '';

  V.innerHTML = `<div class="wrap place" style="gap:16px" data-q="${esc(p.id)}">
    <div class="pl-head"><span class="qi">${icon(p)}</span>
      <div><h2 class="title">${esc(tx(p.title || p.name))}</h2><p class="lead">${esc(tx(p.kind || p.sub))}</p><p class="pl-dist">${km != null ? `<span>${km} km ${esc(t('fromHouseShort'))}</span>` : ''}${near ? `<span>${esc(t('minWalk'))}</span>` : ''}${hasPt && kmMe(p) != null ? `<span>${kmMe(p)} km ${esc(t('fromYouShort'))}</span>` : ''}</p></div></div>
    ${hasPt ? `<a class="pl-map" href="${esc(mapsUrl)}" target="_blank" rel="noopener" aria-label="${esc(t('openInMaps'))}"><div id="plmap"></div></a>` : ''}
    <div class="pl-actions">
      ${p.phone ? `<a class="ccall" href="${tel(p.phone)}">${PHONE}<span>${esc(t('callNow'))} ${esc(p.phone)}</span></a>` : ''}
      ${dirUrl ? `<a class="btn primary" href="${esc(dirUrl)}" target="_blank" rel="noopener">${ICON.dir}${esc(t(hasPt || byName ? 'directions' : 'openInMaps'))}</a>` : ''}
      ${mapsUrl && !gc ? `<a class="btn" href="${esc(mapsUrl)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>` : ''}
      ${p.web ? `<a class="btn" href="${esc(p.web)}" target="_blank" rel="noopener">${WEB}${esc(t('website'))}</a>` : ''}${gc ? `
      <a class="btn" data-gbtn hidden href="${esc(mapsUrl)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>` : ''}
    </div>
    ${p.what ? `<p class="pl-what">${esc(tx(p.what))}</p>` : ''}
    ${hoursBlock}
    ${(p.alt || []).length ? `<section class="pl-sec"><h3 class="section-h">${esc(t('alsoCall'))}</h3>${p.alt.map(a => `<a class="pl-alt" href="${tel(a.phone)}"><b>${esc(tx(a.name))}</b><span>${PHONE}${esc(a.phone)}</span></a>`).join('')}</section>` : ''}
  </div>`;
  if (hasPt) miniMap(V.querySelector('#plmap'), p.lng, p.lat);
}
