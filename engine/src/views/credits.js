// Sources and credits (#credits): every source the guide uses, credited as its terms ask (docs/CREDITS.md), opened from the
// quiet link at the foot of Home. Proper names, licence names and the two quoted notices stay as they are in every language.
// The licences of the software and fonts are in licenses.txt, written at the build (engine/scripts/licenses.mjs).
import { t } from '../i18n.js';
import { esc } from '../ui.js';
import { SECTIONS, HOUSE, REVIEWS, SITE } from '../content.js';
import { COVER_PHOTO } from './home.js';
import { SITE_FONTS, FONT_NAMES } from 'virtual:site-credits';

const G = typeof window !== 'undefined' ? window.__GUIDE__ : null;   // the shared viewer (/g/<slug>): its fonts come from the CDN, no Workbox
// Names that stay whole: never hyphenated at a line's end, and the short ones with a space or a hyphen inside on one line.
const KEEP = ['MapLibre GL JS', 'qrcode-generator', 'Google LLC', 'CC BY 4.0'];
const NAMES = [...KEEP, 'Open Database License', 'SIL Open Font License', 'Google Maps', 'OpenStreetMap', 'Komoot', 'Microsoft', 'Foursquare', 'Anthropic', 'Claude', 'Workbox', 'Meta', 'Airbnb', 'Booking.com', 'Vrbo'];
const NAME_RX = new RegExp(`(?<![\\p{L}-])(${NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}-])`, 'gu');
const pn = s => s.replace(NAME_RX, n => `<span class="pn${KEEP.includes(n) ? ' nw' : ''}">${n}</span>`).replace(/© /g, '©\u00A0');
const ext = (href, label) => `<a href="${esc(href)}"${KEEP.includes(label) ? ' class="nw"' : ''} target="_blank" rel="noopener">${esc(label)}</a>`;
// A sentence with links in it: the translation is escaped first, its proper names kept whole, then each {name} becomes its link.
const say = (key, links = {}, vars) => Object.entries(links).reduce((s, [k, a]) => s.replace('{' + k + '}', a), pn(esc(t(key, vars))));
// Quoted as the source writes it, in English in every language.
const FOURSQUARE = 'Copyright 2024 Foursquare Labs, Inc. All rights reserved. Foursquare data was transformed to the Overture schema.';
const DENSO = 'QR Code is a registered trademark of DENSO WAVE INCORPORATED.';
const LISTING_SITES = [['airbnb.', 'Airbnb'], ['booking.com', 'Booking.com'], ['vrbo.', 'Vrbo']];

export function renderCredits(V) {
  // The house page made from a listing names its listing site (Airbnb, Booking.com, Vrbo) in its links; the reviews say it too.
  const hp = (SECTIONS.find(s => s.kind === 'house' && s.status === 'live') || {}).data;
  const host = (() => { try { return new URL(hp && hp.url).hostname; } catch (e) { return ''; } })();
  const listing = hp && hp.url ? ((LISTING_SITES.find(([k]) => host.includes(k)) || [])[1] || (REVIEWS && REVIEWS.source) || '') : '';
  const photos = !!(HOUSE && HOUSE.photo) || !!(hp && (hp.photos || []).length);
  const aiCover = COVER_PHOTO && (SITE.theme || {}).coverMade === 'ai';
  const fonts = [...new Set((G ? G.fonts || [] : SITE_FONTS).map(f => String(f).replace(/^@fontsource\//, '').split('/')[0]))].map(f => FONT_NAMES[f] || f);
  const licenses = import.meta.env.BASE_URL + 'licenses.txt';
  const sec = (h, body) => `<section class="hsec crs"><h3 class="cr-h">${esc(t(h))}</h3>${body}</section>`;
  const p = x => `<p>${x}</p>`;
  V.innerHTML = `<div class="wrap credits" style="gap:14px">
    <div><h2 class="title">${esc(t('credits'))}</h2><p class="lead">${esc(t('creditsLead'))}</p></div>
    ${sec('crMapH', p(say('crMap', { ofm: ext('https://openfreemap.org', 'OpenFreeMap'), omt: ext('https://www.openmaptiles.org/', 'OpenMapTiles'), osm: ext('https://www.openstreetmap.org/copyright', 'OpenStreetMap') }))
      + p(say('crSearch', { photon: ext('https://photon.komoot.io', 'Photon') })))}
    ${sec('crPlacesH', p(say('crPlaces', { overture: ext('https://overturemaps.org', 'Overture Maps Foundation'), cdla: ext('https://cdla.dev/permissive-2-0/', 'Community Data License Agreement Permissive 2.0'), geonames: ext('https://www.geonames.org', 'GeoNames'), ccby: ext('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0') }))
      + p(say('crHours')) + `<p class="cr-q" lang="en">${esc(FOURSQUARE)}</p>`)}
    ${sec('crGoogleH', p(say('crGoogle')))}
    ${sec('crWordsH', (photos ? p(listing ? say('crPhotosFrom', {}, { src: listing }) : say('crPhotos')) : '') + p(say('crAi')) + (aiCover ? p(say('crAiCover')) : ''))}
    ${sec('crSoftH', `<ul class="glist cr-l">
        <li>${say('crMaplibre')}</li>
        ${fonts.length ? `<li>${say('crFonts', {}, { fonts: fonts.join(', ') })}</li>` : ''}
        <li>${say('crQr')} <span lang="en">${esc(DENSO)}</span></li>
        ${G ? '' : `<li>${say('crWorkbox')}</li>`}
      </ul><p>${ext(licenses, t('crLicenses'))}</p>`)}
  </div>`;
}
