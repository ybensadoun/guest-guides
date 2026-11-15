// The house page (section kind "house", content/house-page.json; README.md "Its look"): like on Airbnb, photos, the key
// facts, description, the rooms, the beds, what the place offers, the reviews, always linking back to the listing. Route
// #s/<id>, as every section's page (views/section.js asks the module, modules/index.js); the welcome card on Home opens it.
import { t, tx } from '../../i18n.js';
import { SITE, REVIEWS } from '../../content.js';
import { esc, GI } from '../../ui.js';
import { sectionFrame, zoomable } from '../../views/section.js';
import { GUIDE_ICON } from '../info/index.js';
import { starsTxt, reviewsBlock } from './reviews.js';
import { keyAmenities, shortSummary, longWords, barK } from './plan.js';

export function page(V, sec) {
  // The house, like on Airbnb: photos, the key facts, description and beds, always linking back to the listing.
  const h = sec.data;
  const rate = { stars: REVIEWS?.rating ?? h.rating?.stars, count: REVIEWS?.count ?? h.rating?.count };
  const HI = { pool: GUIDE_ICON.pool, flame: GUIDE_ICON.flame, desk: GUIDE_ICON.box, view: GI('<path d="M2 20l7-11 4 6 3-4 6 9z"/><circle cx="17" cy="6" r="2"/>') };
  const body = `<div class="hgal" id="hgal">${h.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}"></button>`).join('')}<span class="hcount" id="hcount">1 / ${h.photos.length}</span></div>
      <a class="hsticky" id="hsticky" href="#s/house" aria-hidden="true" tabindex="-1"><span class="hs-t"><b><span class="hs-n">${esc(SITE.name)}</span>${rate.stars ? `<i class="hs-r">★ ${starsTxt(rate.stars)}</i>` : ''}</b><small>${esc(shortSummary(tx(h.summary)))}</small></span></a>
      <p class="hsum" id="hsum"><b>${esc(tx(h.summary))}</b>${rate.stars ? (x => REVIEWS ? `<button type="button" class="hsum-r" data-rev>${x}</button>` : `<span>${x}</span>`)(`★ ${starsTxt(rate.stars)}${rate.count ? ' · ' + esc(t('airbnbReviews', { n: rate.count })) : ''}`) : ''}</p>
      ${h.url ? `<a class="hbook" href="${esc(h.url)}" target="_blank" rel="noopener"><span>${esc(t('bookAirbnbLead'))}</span><b>${esc(t('bookAirbnb'))}</b></a>` : ''}
      ${h.highlights?.length ? `<div class="hhl">${h.highlights.map(x => `<div${longWords(tx(x.t)) ? ' class="hw"' : ''}><span class="dot" style="--cc:var(--tone-blue)">${HI[x.icon] || ''}</span><b>${esc(tx(x.t))}</b>${x.s ? `<small>${esc(tx(x.s))}</small>` : ''}</div>`).join('')}</div>` : ''}
      ${(() => { const ps = tx(h.description).split(/\n\s*\n/).filter(Boolean); return !ps.length ? '' : `<section class="hsec hdesc"><h3 class="section-h">${esc(t('aboutHouse'))}</h3><p>${esc(ps[0] || '')}</p>${ps.length > 1 ? `<div class="hd-more" hidden>${ps.slice(1).map(p => `<p>${esc(p)}</p>`).join('')}</div><button type="button" class="hd-tog" aria-expanded="false">${esc(t('readMore'))}</button>` : ''}</section>`; })()}
      ${h.tour ? `<section class="hsec tour"><h3 class="section-h">${esc(t('photoTour'))}</h3>${h.tour.map(r => `<h4>${esc(tx(r.room))}</h4><div class="gphotos zg">${r.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>`).join('')}</section>` : ''}
      ${h.beds?.length ? `<section class="hsec"><h3 class="section-h">${esc(t('whereSleep'))}</h3><ul class="glist">${h.beds.map(b => `<li>${esc(tx(b))}</li>`).join('')}</ul></section>` : ''}
      ${h.amenities ? (() => { const { all, key } = keyAmenities(h, tx);   // the most asked for first (plan.js)
        return `<section class="hsec amen"><h3 class="section-h">${esc(t('amenH'))}</h3><ul class="amkey">${key.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>${all.length > key.length ? `<details class="amall"><summary>${esc(t('amenAll', { n: all.length }))}</summary>${h.amenities.map(g => `<h4>${esc(tx(g.t))}</h4><ul>${g.items.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>`).join('')}</details>` : ''}</section>`; })() : ''}
      ${reviewsBlock(rate)}
      ${h.url ? `<div class="actions"><a class="btn primary" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(t('bookAirbnb'))}</a>${h.photosUrl ? `<a class="btn" href="${esc(h.photosUrl)}" target="_blank" rel="noopener">${esc(t('allPhotosAirbnb'))}</a>` : ''}</div>` : ''}`;
  sectionFrame(V, sec, body, () => {
    // The house: "Read more" opens the rest of the description; the slim bar on top comes back once the facts scroll away.
    const tog = V.querySelector('.hd-tog');
    if (tog) tog.addEventListener('click', () => { const m = V.querySelector('.hd-more'), open = m.hidden; m.hidden = !open; tog.setAttribute('aria-expanded', String(open)); tog.textContent = t(open ? 'showLess' : 'readMore'); });
    // The rating under the house's facts jumps to the reviews further down.
    const rb = V.querySelector('[data-rev]');
    if (rb) rb.addEventListener('click', () => V.querySelector('#hrev')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const hs = V.querySelector('#hsticky');
    if (hs) { hs.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }); houseBar(); }
    zoomable(V);   // its photos open in the photo viewer
    const gal = V.querySelector('#hgal');
    if (gal) gal.addEventListener('scroll', () => { const n = Math.round(gal.scrollLeft / gal.clientWidth) + 1; V.querySelector('#hcount').textContent = `${n} / ${gal.querySelectorAll('img').length}`; }, { passive: true });
  });
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
  const k = barK(y);
  bar.style.setProperty('--k', k.toFixed(3));
  const on = k > 0.5;
  if (bar.classList.contains('on') !== on) { bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', String(!on)); bar.tabIndex = on ? 0 : -1; }
}
addEventListener('scroll', () => { if (!hbRaf) hbRaf = requestAnimationFrame(houseBar); }, { passive: true });
