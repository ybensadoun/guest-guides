// The welcome card, the frame's fixed top on Home (../README.md rule 1; README.md "Its look"): the house's photo or the
// drawn cover, its logo and name, then the Wi-Fi and Check-out facts. The photo and the name open the house page.
import { t } from '../../i18n.js';
import { HOUSE, SITE, MODULE_ON } from '../../content.js';
import { esc, ARROW } from '../../ui.js';
import { wifiSheet } from './wifi.js';

// Without the house page (module off), the house card opens the house guide instead.
const HOUSE_LINK = MODULE_ON('house') ? '#s/house' : '#s/message';

// The cover: guests have already booked and seen the listing photos, so by default it sets a welcome tone instead of selling.
// A scene drawn in code from the guide's own colours (no text, so nothing to overlap in any language).
// The host's photo replaces it when house.json has "photo" and "cover" is not "themed".
export const COVER_PHOTO = !!HOUSE.photo && HOUSE.cover !== 'themed';
const THEMED_COVER = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect class="a-sky" width="400" height="160"/>
  <circle class="a-sun" cx="246" cy="48" r="15"/>
  <path class="a-far" d="M0 112C60 86 120 88 186 104S318 84 400 98V160H0z"/>
  <path class="a-mid" d="M0 128C80 110 150 114 228 126S350 116 400 120V160H0z"/>
  <g class="a-house"><path class="a-wall" d="M178 104h44v32h-44z"/><path class="a-roof" d="M173 106l27-18 27 18z"/><path class="a-win" d="M186 112h8v8h-8zM206 112h8v8h-8z"/><path class="a-door" d="M196 123h8v13h-8z"/></g>
  <path class="a-tree" d="M238 136c-4 0-5-9-5-19s2-20 5-25c3 5 5 15 5 25s-1 19-5 19zM251 136c-3 0-4-6-4-13s2-14 4-18c2 4 4 11 4 18s-1 13-4 13z"/>
  <path class="a-near" d="M0 140C100 130 220 132 300 138S380 136 400 136V160H0z"/>
</svg>`;

export function welcome() {
  // The house itself on top, like the standard guest guides: its photo (from the Airbnb listing),
  // the name as a small label, then the three facts guests look for first. Each opens its House guide row.
  return `<section class="sthero">
     <div class="hcard">
     ${COVER_PHOTO ? `<a class="hc-ph" href="${HOUSE_LINK}"><img src="${esc(HOUSE.photo)}" style="object-position:${esc(HOUSE.photoPos || '50% 60%')}" alt="" loading="eager" decoding="async" onerror="this.remove()"></a>` : `<a class="hc-ph hc-art" href="${HOUSE_LINK}" aria-hidden="true" tabindex="-1">${THEMED_COVER}</a>`}
     <a class="hc-id" href="${HOUSE_LINK}">${SITE.logo ? `<img src="${esc(SITE.logo)}" alt="">` : ''}<span class="hc-nm"><small class="hc-w">${esc(t('welcomeTo'))}</small><b>${esc(SITE.name)}</b><small>${esc(t('seeHouse'))}</small></span><span class="go" aria-hidden="true">${ARROW}</span></a>
     ${HOUSE.wifi || HOUSE.checkout ? `<div class="keyfacts">
       ${HOUSE.wifi ? `<button type="button" class="kf-wifi" id="wifiBtn"><small>${esc(t('qWifi'))}</small><b>${esc(t('qWifiV'))}</b></button>` : ''}
       ${HOUSE.checkout ? `<a href="#s/message" data-open="checkout"><small>${esc(t('qCheckout'))}</small><b>${esc(t('qCheckoutV', { time: HOUSE.checkout }))}</b></a>` : ''}
     </div>` : ''}
     </div>
   </section>`;
}

// The Wi-Fi fact opens the Wi-Fi sheet (wifi.js); called by Home once the card is in the page.
export function wireWelcome(V) {
  const wb = V.querySelector('#wifiBtn');
  if (wb) wb.addEventListener('click', wifiSheet);
}
