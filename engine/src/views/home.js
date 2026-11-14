import qrcode from 'qrcode-generator';
import { t, tx } from '../i18n.js';
import { mapItems, SECTIONS, HOUSE, SITE, MODULE_ON, TRANSPORT_CARD, HOME_ARRANGEMENT } from '../content.js';
import { esc, SECTION_LOOK } from '../ui.js';
import { MODULES } from '../modules/index.js';
import { resolve } from '../modules/frame.js';
import { widget as whatsOn } from '../modules/whatson/index.js';

// Without the house page (module off), the house card opens the house guide instead.
const HOUSE_LINK = MODULE_ON('house') ? '#s/house' : '#s/message';

export function renderHome(V) {
  const now = new Date();
  // No header on Home: the language button sits on the first heading's row. At the very end, one quiet text link to
  // Sources and credits (views/credits.js), below everything else.
  // The house itself on top, like the standard guest guides: its photo (from the Airbnb listing),
  // the name as a small label, then the three facts guests look for first. Each opens its House guide row.
  const top = `<section class="sthero">
     <div class="hcard">
     ${COVER_PHOTO ? `<a class="hc-ph" href="${HOUSE_LINK}"><img src="${esc(HOUSE.photo)}" style="object-position:${esc(HOUSE.photoPos || '50% 60%')}" alt="" loading="eager" decoding="async" onerror="this.remove()"></a>` : `<a class="hc-ph hc-art" href="${HOUSE_LINK}" aria-hidden="true" tabindex="-1">${THEMED_COVER}</a>`}
     <a class="hc-id" href="${HOUSE_LINK}">${SITE.logo ? `<img src="${esc(SITE.logo)}" alt="">` : ''}<span class="hc-nm"><small class="hc-w">${esc(t('welcomeTo'))}</small><b>${esc(SITE.name)}</b><small>${esc(t('seeHouse'))}</small></span><span class="go" aria-hidden="true">${ARROW}</span></a>
     ${HOUSE.wifi || HOUSE.checkout ? `<div class="keyfacts">
       ${HOUSE.wifi ? `<button type="button" class="kf-wifi" id="wifiBtn"><small>${esc(t('qWifi'))}</small><b>${esc(t('qWifiV'))}</b></button>` : ''}
       ${HOUSE.checkout ? `<a href="#s/message" data-open="checkout"><small>${esc(t('qCheckout'))}</small><b>${esc(t('qCheckoutV', { time: HOUSE.checkout }))}</b></a>` : ''}
     </div>` : ''}
     </div>
   </section>`;
  V.innerHTML = `<div class="wrap" style="gap:14px">
   ${top}
   ${sectionGrid(now)}
   ${whatsOn(now)}
   <p class="hfoot"><a href="#credits">${esc(t('credits'))}</a></p>
  </div>`;
  const wb = V.querySelector('#wifiBtn');
  if (wb) wb.addEventListener('click', wifiSheet);
}

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

const STAY_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M8 6l2-3h4l2 3"/><circle cx="12" cy="13" r="3.5"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

// Tiles grouped as "At the house" and "Around the house" (Home and the "More" page), drawn from placements by the module
// frame (modules/frame.js, modules/README.md): the guide's own content/home.json, else today's arrangement. Each tile and
// card carries its size (s-half, s-wide, s-tall); a run of highlights is one .qcalls block (each card drawn by
// modules/highlights), a run of tiles one .ggrid.
// Live tiles link and show live info, others say "Coming soon".
// The guide as the frame sees it (modules/frame.js): sections, the white cards shown now, the map, the transport card.
export const frameGuide = (now = new Date()) => ({
  sections: SECTIONS.map(({ id, kind, group, status }) => ({ id, kind, group, status })),
  highlights: MODULES.highlight.shown(now),   // the white cards shown today (modules/highlights)
  map: MODULE_ON('map'),
  transportCard: TRANSPORT_CARD,
  // What each module offers on Home (its widgets, modules/<kind>/offers.js), as the registry gives it.
  offers: Object.fromEntries(Object.entries(MODULES).filter(([, m]) => m.widgets).map(([k, m]) => [k, m.widgets]))
});
// A wide entry tile whose title is longer than 20 characters takes a smaller title (21 px), so that "Our favourite places
// to eat" holds on two lines at 360 px (modules/README.md). Soft hyphens do not count.
const LONG = 20, long = label => String(label).replace(/\u00ad/g, '').length > LONG;
// A tall tile's title is drawn larger only when each of its words is short enough to stay on its line at 360 px
// ("Emergencies", "stationnement" were wider than the tile): the words are not shortened and never cut, the title keeps
// the size it has on a half tile (frame-check.mjs, 14 Nov 2026).
const WORD = 9, wordy = label => String(label).replace(/\u00ad/g, '').split(/[\s\-\u2010-\u2014/]+/).some(w => w.length > WORD);
function sectionGrid(now) {
  const tile = (key, label, href, meta, live, cls = '', extra = '') => {
    const look = SECTION_LOOK[key] || SECTION_LOOK.todo;
    // Each tile: flat colour (--tc), text colour (--ti), one Bauhaus shape (CSS, by data-k).
    // Live tiles end with a round arrow; tiles still to come carry a "Soon" sticker instead.
    const vars = `--tc:${look.color};--ti:${look.ink ? 'var(--ink)' : '#fff'};--gofg:${look.ink ? '#fff' : 'var(--ink)'}`;
    const inner = `<span class="ib">${look.icon}</span>
      <span class="gt-tx"><span class="gt-t">${esc(label)}</span>${href && meta ? `<span class="gt-m">${esc(meta)}</span>` : ''}</span>${extra}${href ? `<span class="go" aria-hidden="true">${ARROW}</span>` : `<span class="soon-tag">${esc(t('soonShort'))}</span>`}`;
    return href ? `<a class="gt${live ? ' live' : ''} ${cls}" data-k="${key}" style="${vars}" href="${href}">${inner}</a>` : `<div class="gt soon ${cls}" data-k="${key}" style="${vars}" aria-label="${esc(label)}, ${esc(meta)}">${inner}</div>`;
  };
  // The classes of a size: "wide" (which older rules read) with "s-wide", or "s-half", "s-tall"; a live widget "w-live".
  const sz = (size, label, more = '', w = 'entry') => [size === 'wide' ? 'wide' : '', 's-' + size, w === 'live' ? 'w-live' : '', size === 'wide' && w === 'entry' && long(label) ? 't-long' : '', size === 'tall' && wordy(label) ? 't-word' : '', ...String(more).split(/\s+/).filter(c => c && c !== 'wide')].filter(Boolean).join(' ');
  const one = (sec, size, w) => {
    // Markets: their tile opens the day's list (#markets/today, main.js), whatever the section's status (modules/frame.js);
    // what it shows is the module's widget (modules/markets/widget.js).
    if (sec.kind === 'markets') { const x = MODULES.markets.widget(now); return tile(sec.id, t('markets'), '#markets/today', x.meta, x.live, sz(size, t('markets'), x.cls, w), x.extra); }
    if (sec.status !== 'live') return tile(sec.id, t(sec.labelKey), null, t('soon'), false, sz(size, t(sec.labelKey)));
    // A module draws its own widget (modules/index.js): Home only places it.
    if (MODULES[sec.kind]?.widget) { const x = MODULES[sec.kind].widget(now, sec); return tile(sec.id, t(sec.labelKey), '#s/' + sec.id, x.meta, x.live, sz(size, t(sec.labelKey), x.cls, w), x.extra); }
    // Short label on the tile ("Emergencies"); the page itself keeps the full title.
    const label = t(sec.id === 'emergency' ? 'emergencyTile' : sec.labelKey);
    return tile(sec.id, label, '#s/' + sec.id, '', false, sz(size, label));
  };
  const R = resolve(HOME_ARRANGEMENT, frameGuide(now));
  const draw = x => x.kind === 'map' ? tile('map', t('mapTile'), '#map', t('nPlaces', { n: mapItems(now).length }), false, 'wide s-wide')
    : one(SECTIONS.find(s => s.id === x.id), x.size, x.widget);
  const group = g => R[g].map(run => run.type === 'highlights'
    ? `<div class="qcalls">${run.items.map(x => MODULES.highlight.card(x.id, x.size)).join('')}</div>`
    : `<div class="ggrid${g === 'area' ? ' mosaic' : ''}">${run.items.map(draw).join('')}</div>`).join('\n   ');
  return `<h2 class="sh">${esc(t('atHouse'))}</h2>
   ${group('house')}
   <h2 class="sh">${esc(t('aroundHouse'))}</h2>
   ${group('area')}`;
}

export function renderMore(V) {
  V.innerHTML = `<div class="wrap" style="gap:14px">
    <div><h2 class="title">${esc(t('more'))}</h2><p class="lead">${esc(t('moreLead'))}</p></div>
    ${sectionGrid(new Date())}</div>`;
}

// A Wi-Fi QR code made on the spot, for guides whose network has no ready-made one (a host changed the name or password).
function wifiQr(ssid, pw) {
  const q = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  const c = qrcode(0, 'M'); c.addData(`WIFI:T:WPA;S:${q(ssid)};P:${q(pw)};;`); c.make();
  return c.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
// Wifi sheet: network name, password with a copy button, and a QR code for a second device. One network: singular
// labels, no generic "Wi-Fi" label, one larger QR code in the middle with the network's name under it.
function wifiSheet() {
  const w = HOUSE.wifi, one = w.networks.length === 1, label = n => (one && /^\s*wi-?fi\s*$/i.test(tx(n.label) || '') ? '' : tx(n.label));
  const o = document.createElement('div');
  o.className = 'wsheet';
  o.innerHTML = `<div class="ws-card" role="dialog" aria-modal="true">
    <div class="ws-hd"><h3>${esc(t('qWifi'))}</h3><button type="button" class="ws-x" aria-label="${esc(t('close'))}">×</button></div>
    <div class="ws-f"><small>${esc(t(one ? 'wifiNet' : 'wifiNets'))}</small>${w.networks.map(n => `<b>${esc(n.ssid)}</b>${label(n) ? `<span class="ws-l">${esc(label(n))}</span>` : ''}`).join('')}</div>
    <div class="ws-f ws-pwrow"><span><small>${esc(t(one ? 'wifiPw' : 'wifiPwBoth'))}</small><b class="ws-pw">${esc(w.password)}</b></span><button type="button" class="btn primary ws-copy">${esc(t('copyShort'))}</button></div>
    <p class="ws-how${one ? ' one' : ''}">${esc(t('wifiScan'))}</p><div class="ws-qrs${one ? ' one' : ''}">${w.networks.map(n => `<figure>${n.qr || wifiQr(n.ssid, w.password)}<figcaption>${esc(one ? n.ssid : tx(n.label).split(/[:：]/)[0].trim())}</figcaption></figure>`).join('')}</div>
  </div>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.querySelector('.ws-x').onclick = close;
  o.addEventListener('click', e => { if (e.target === o) close(); });
  addEventListener('hashchange', close);
  const cb = o.querySelector('.ws-copy');
  cb.onclick = async () => {
    try { await navigator.clipboard.writeText(w.password); }
    catch { const r = document.createRange(); r.selectNodeContents(o.querySelector('.ws-pw')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
    cb.textContent = t('copied'); setTimeout(() => { cb.textContent = t('copyShort'); }, 2000);
  };
}
