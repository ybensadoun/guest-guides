import { t, tx, locale, lang } from './i18n.js';
import { offSeason, hoursText, statusLabel, nextOpenText, runsOn, closedStatus } from './schedule.js';
// Live status as text, like Google Maps: green "Open until 23:00", red "Closed" with when it next opens.
// Status on the right of a row. Times never break ("14:00" stays whole), so a long label like
// "Ouvert jusqu'à 14:00" wraps onto two lines instead of squeezing the place name.
const nwT = x => esc(x).replace(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/g, '<span class="nw">$1</span>');
export const stHTML = s => s ? `<span class="st ${s.cls}">${nwT(s.text)}${s.sub ? `<small>${nwT(s.sub)}</small>` : ''}</span>` : '';
import { kmMe, gDir, gSearch } from './geo.js';
import FLAGS_FILE from './flags.json';
// Warnings only: anything else in "flags" (a filter label, a typo) is never shown.
const FLAGS = FLAGS_FILE.flags;
const warnings = m => (m.flags || []).filter(f => FLAGS.includes(f));

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const ICON = {
  dir: svg('<path d="M3 11l18-8-8 18-2-8-8-2z"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  me: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  home: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  down: svg('<path d="M6 9l6 6 6-6"/>')
};

// One clear pictogram per type, used in filters, lists, card badges and map pins.
const P = d => `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const CAT_ICON = {
  covered: P('<path d="M3 11a9 7 0 0 1 18 0"/><path d="M3 11h18"/><path d="M5 11v9M19 11v9M3 20h18"/><path d="M9 20v-5h6v5"/>'),
  street: P('<path d="M5 4h14l2 5H3z"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8M19 12v8M4 20h16"/>'),
  flea: P('<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  antiques: P('<path d="M9 3h6"/><path d="M10 3v3c-3 1-5 4-5 7 0 4 3 8 7 8s7-4 7-8c0-3-2-6-5-7V3"/>'),
  events: P('<path d="M2 5c6 4 14 4 20 0"/><path d="M5 7l1.5 5L9 8.2M11 8.6l1 5 2-5M16 8l1.8 4.6L19.5 7"/>'),
  glass: P('<path d="M10 2h4"/><path d="M10.5 2v5L8 10.5V21h8V10.5L13.5 7V2"/><path d="M8 14h8"/>'),
  deixalleria: P('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>'),
  restaurants: P('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 4-3 7h3"/>'),
  places: P('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  todo: P('<path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.3l6-.8z"/>'),
  nightlife: P('<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/><path d="M17 3.5v2.4M15.8 4.7h2.4"/>')
};
export const NAV_ICON = {
  home: P('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  markets: P('<path d="M5 4h14l2 5H3z"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8M19 12v8M4 20h16"/>'),
  garbage: P('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/>'),
  map: P('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  more: P('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>')
};
// Icon and badge colour for each Home / More tile.
export const SECTION_LOOK = {
  'garbage': { icon: NAV_ICON.garbage, color: 'var(--k-blue)' },
  'message': { icon: P('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 13v4"/><circle cx="12" cy="10.3" r=".4" fill="currentColor"/>'), color: 'var(--k-yellow)', ink: true },
  'emergency': { icon: P('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'), color: 'var(--k-red)' },
  'markets': { icon: NAV_ICON.markets, color: 'var(--ink)' },
  'restaurants': { icon: P('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 4-3 7h3"/>'), color: 'var(--orange)', ink: true },
  'todo': { icon: CAT_ICON.todo, color: 'var(--k-green)' },
  // Optional, for guides that want it (late bars, clubs, live music: the host's own list); not in Ca La Kimberly.
  'nightlife': { icon: CAT_ICON.nightlife, color: 'var(--ink)' },
  'events': { icon: P('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13l1 2 2 .3-1.5 1.4.4 2.3-1.9-1-1.9 1 .4-2.3L9 15.3l2-.3z"/>'), color: 'var(--k-blue)' },
  'map': { icon: NAV_ICON.map, color: 'var(--white)', ink: true },
  'transport': { icon: P('<rect x="5.5" y="3" width="13" height="13" rx="3"/><path d="M5.5 10h13"/><circle cx="9" cy="13" r=".9" fill="currentColor"/><circle cx="15" cy="13" r=".9" fill="currentColor"/><path d="M8.5 16l-2 4.5M15.5 16l2 4.5M7.5 19h9"/>'), color: 'var(--k-green)' },
  // Modules added for new sites (kinds: info for arrival and extras, spots for the others).
  'arrival': { icon: P('<path d="M4 17h16v-5l-2.5-5h-11L4 12z"/><path d="M4 12h16"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>'), color: 'var(--k-blue)' },
  'essentials': { icon: P('<path d="M5 8h14l-1.5 12h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'), color: 'var(--k-green)' },
  'kids': { icon: P('<path d="M12 3l7 7-7 7-7-7z"/><path d="M12 17v4M9 21h6"/>'), color: 'var(--orange)', ink: true },
  'daytrips': { icon: P('<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>'), color: 'var(--k-red)' },
  'extras': { icon: P('<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8c-1.5-3-5-4-5-1.5S10 8 12 8c2 0 5 .5 5-1.5S13.5 5 12 8z"/>'), color: 'var(--k-yellow)', ink: true }
};
export const catIcon = c => CAT_ICON[c] || CAT_ICON.places;
// Per-item icons for "What to do" (set with "icon" in the content file); otherwise the category icon.
const ITEM_ICON = {
  mug: P('<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 1.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5M12.5 1.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5"/><path d="M3 21h15"/>'),
  pizza: P('<path d="M12 21.5L3 6.5a15.5 15.5 0 0 1 18 0z"/><path d="M4.6 9.2a13 13 0 0 1 14.8 0"/><circle cx="10" cy="11.5" r="1.3" fill="currentColor"/><circle cx="14.2" cy="13.5" r="1.3" fill="currentColor"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/>'),
  paella: P('<ellipse cx="11" cy="13" rx="8" ry="5"/><path d="M19 12.5h3.5M3 13H1"/><circle cx="8" cy="12.3" r="1" fill="currentColor"/><circle cx="13.5" cy="11.6" r="1" fill="currentColor"/><path d="M10.5 14.5l2 .8M14 14l1.5-1"/>'),
  fish: P('<path d="M2.5 12c3-4.5 9.5-6 14.5 0-5 6-11.5 4.5-14.5 0z"/><path d="M17 12l4.5-4v8z"/><circle cx="7" cy="11" r=".9" fill="currentColor"/>'),
  ham: P('<path d="M3 15.5C3 10 7 6 11 6c3 0 4.5 1.5 5.5 3l-6.5 9c-1.5.8-3 1.2-4.2 1.2C4.2 19.2 3 17.8 3 15.5z"/><path d="M16.5 9l3.5-3.5"/><path d="M19.2 4.2l2.2 2.2-1.6 1.6-2.2-2.2z"/><path d="M6.5 15c.5-2.5 2-4.5 4.5-5.5"/>'),
  truck: P('<path d="M1.5 6h12v10h-12z"/><path d="M13.5 9.5h4.5l3.5 3.5v3h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  cloche: P('<path d="M3.5 16.5a8.5 8.5 0 0 1 17 0z"/><path d="M2 19.5h20M12 8V6M10.5 6h3"/>'),
  leaf: P('<path d="M5 19C4 11 9 4.5 20 4c.5 10.5-6 15.5-15 15z"/><path d="M5 19c3-5 6-8 10-10.5"/>'),
  pot: P('<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20M9 4.5c0 1.5 1 1.5 1 3M14 4.5c0 1.5 1 1.5 1 3"/>'),
  croissant: P('<path d="M2.5 14.5C3 9.5 7 6 12 6s9 3.5 9.5 8.5c-1.6 1.6-3.6 1.8-5.2.8-1 1.6-2.6 2.4-4.3 2.4s-3.3-.8-4.3-2.4c-1.6 1-3.6.8-5.2-.8z"/><path d="M8.5 7l1.5 10M15.5 7L14 17"/>'),
  waterpark: P('<path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M6 13V4M6 4c6 0 9 3 12 9"/>'),
  bowling: P('<path d="M12 2.5c1.6 0 2.2 1.3 2.2 2.6S13.2 7.6 13.2 8.6c0 1.2 3.3 3.2 3.3 7.4a4.5 4.5 0 0 1-9 0c0-4.2 3.3-6.2 3.3-7.4 0-1-1-2.2-1-3.5S10.4 2.5 12 2.5z"/><path d="M10.6 10h2.8"/>'),
  trampoline: P('<ellipse cx="12" cy="16" rx="9" ry="2.6"/><path d="M5 18l-1 3.5M19 18l1 3.5"/><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v4M9.5 9l2.5 2 2.5-2"/>'),
  golf: P('<path d="M12 18V3l7 3.5-7 3.5"/><ellipse cx="12" cy="19" rx="7" ry="2.5"/>'),
  kart: P('<path d="M5 21V3.5"/><path d="M5 4h14v8H5"/><path d="M9.7 4v8M14.3 4v8M5 8h14"/>'),
  spring: P('<path d="M12 3s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.4 12 3 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
  beach: P('<path d="M12 3a9 9 0 0 1 9 8.5H3A9 9 0 0 1 12 3z"/><path d="M12 11.5V20"/><path d="M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>'),
  city: P('<path d="M3 21h18"/><path d="M5 21V11l4-2v12M9 21V5h6v16M15 21V9l4 2v10"/><path d="M11.5 8h1M11.5 11h1M11.5 14h1"/>'),
  roman: P('<path d="M3 8.5L12 4l9 4.5z"/><path d="M5.5 9v8.5M10 9v8.5M14 9v8.5M18.5 9v8.5"/><path d="M4 18h16M3 21h18"/>'),
  arch: P('<path d="M3 5h18M4 5v16h4v-6a4 4 0 0 1 8 0v6h4V5"/>'),
  town: P('<path d="M12 2.5v3M10.5 4h3"/><path d="M8.5 21V10L12 6.5l3.5 3.5V21"/><path d="M3.5 21v-6.5l5-3M20.5 21v-6.5l-5-3"/><path d="M11 21v-3.5h2V21"/><path d="M2.5 21h19"/>'),
  castle: P('<path d="M4 21V8h3v2h2.5V8h5v2H17V8h3v13z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>'),
  palette: P('<path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16.5" cy="10.5" r="1"/>'),
  monastery: P('<path d="M12 2v4M10.3 3.8h3.4"/><path d="M6 21V11l6-5 6 5v10"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/><path d="M3 21h18"/>'),
  mountain: P('<path d="M2 20.5l5.5-9 3 4.5 3.5-7 8 11.5z"/><path d="M6 14l1.5-2.5 1.2 1.8"/>'),
  wine: P('<path d="M7.5 3h9l-.6 5.5a3.9 3.9 0 0 1-7.8 0z"/><path d="M8 7h8"/><path d="M12 12.5V20M8.5 20.5h7"/>'),
  bus: P('<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r=".9" fill="currentColor"/><circle cx="16" cy="14.5" r=".9" fill="currentColor"/>'),
  train: P('<rect x="5.5" y="3" width="13" height="13" rx="3"/><path d="M5.5 10h13"/><circle cx="9" cy="13" r=".9" fill="currentColor"/><circle cx="15" cy="13" r=".9" fill="currentColor"/><path d="M8.5 16l-2 4.5M15.5 16l2 4.5M7.5 19h9"/>'),
  music: P('<path d="M9 18V5.5l11-2.5v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  themepark: P('<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="1.3"/><path d="M12 3v5.7M12 11.3V17M5 10h5.7M13.3 10H19"/><path d="M8 21l4-4 4 4M6.5 21h11"/>'),
  escape: P('<rect x="4" y="3" width="13" height="18" rx="1"/><path d="M17 5h3v14h-3"/><circle cx="14" cy="12.5" r="1" fill="currentColor"/><path d="M8 3v18"/>'),
  beachbar: P('<path d="M4.5 4h15L12 12.5z"/><path d="M12 12.5V20M8 20.5h8"/><path d="M15 2l-2 4"/>')
};
export const itemIcon = m => (m.icon && ITEM_ICON[m.icon]) || catIcon(m.cat);

export const catStyle = c => `--cc:var(--c-${c});--cs:var(--c-${c}-s)`;
// Items can pick their own colour ("tone": blue, red, orange, purple, green, pink), e.g. in What to do.
export const itemStyle = m => (m.tone ? `--cc:var(--tone-${m.tone});--cs:var(--tone-${m.tone}-s)` : catStyle(m.cat));
// Names already include the place (content/markets.json), so the title is just the name.
export const title = m => tx(m.name) || m.town;
export const shortTitle = title;
export const catLabel = m => (m.type ? tx(m.type) : m.kind === 'market' ? t('cat_' + m.cat) : t(m.cat + 'Chip') !== m.cat + 'Chip' ? t(m.cat + 'Chip') : t(m.section));

// Distance block: big number + "km", then a small label saying from where.
const kmBlock = (n, labelKey) => `<div class="km"><b>${n}<small> ${esc(t('kmHouse'))}</small></b><span>${esc(t(labelKey))}</span></div>`;

// opts.date + opts.live: show live status for that date. opts.inMap: actions for the map sheet.
export function card(m, opts = {}) {
  let when = '';
  // "Next: Wed 7 Oct, 8:30", unless it is open right now or opens later today (the pill says so).
  const liveNow = opts.date && opts.live ? statusLabel(m, opts.date) : null;
  const nextLine = m.s.length && !(liveNow && liveNow.cls !== 'closed') ? `<span class="t next">${esc(nextOpenText(m))}</span>` : '';
  if (m.kind === 'market' || m.s.length) {
    const ht = hoursText(m);
    when = typeof ht === 'string'
      ? `<div class="when"><span>${esc(t('occasional'))}</span><span class="t">${esc(ht)}</span></div>`
      : `<div class="when">${ht.map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}${nextLine}</div>`;
  }
  if (m.hours) when += `<p class="hnote">${esc(tx(m.hours))}</p>`;
  let stt = '';
  const live = opts.date && opts.live ? statusLabel(m, opts.date) : null;
  if (live) stt = stHTML(live);
  const me = kmMe(m);
  const where = m.place || '';
  const region = [m.town, m.comarca].filter(Boolean).join(' · ');
  return `<article class="card" style="${itemStyle(m)}" data-id="${esc(m.id)}">
   <div class="hd"><span class="dot">${itemIcon(m)}</span><div class="hdt"><h3>${esc(title(m))}</h3>${where ? `<div class="where">${esc(where)}</div>` : ''}<div class="reg">${esc(region)}</div></div>
   ${m.km != null || me != null ? `<div class="kms">${m.km != null ? kmBlock(m.km, 'fromHouseShort') : ''}${me != null ? kmBlock(me, 'fromYouShort') : ''}</div>` : ''}</div>
   <div class="row"><span class="type">${esc(catLabel(m))}</span>${m.stalls_approx ? `<span class="size">${esc(t('stalls', { n: m.stalls_approx }))}</span>` : ''}${stt}</div>
   ${when}
   ${m.tags && m.tags.length ? `<div class="tags">${m.tags.map(g => `<span class="tag">${esc(t('t_' + g))}</span>`).join('')}</div>` : ''}
   ${m.description ? `<div class="note">${esc(tx(m.description))}</div>` : ''}
   ${warnings(m).map(f => `<div class="flag">${esc(t('f_' + f))}</div>`).join('')}
   <div class="actions">
     <a class="btn primary" href="${gDir(m)}" target="_blank" rel="noopener">${ICON.dir}${esc(t('directions'))}</a>
     ${opts.inMap
       ? `<a class="btn" href="${gSearch(m)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>`
       : `<a class="btn" href="#map/m/${encodeURIComponent(m.id)}">${ICON.pin}${esc(t('onMap'))}</a>`}
     ${m.phone ? `<a class="btn" href="tel:${m.phone.replace(/\s+/g, '')}">${esc(t('callLabel'))} ${esc(m.phone)}</a>` : ''}
     ${m.url ? `<a class="btn" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}
     ${m.wiki ? `<a class="btn" href="${wikiUrl(m.wiki)}" target="_blank" rel="noopener">Wikipedia</a>` : ''}
   </div></article>`;
}

// All product tags as small text chips under the name.
const tagStrip = m => {
  const tg = m.tags || [], sm = m.setMenus || [], fl = warnings(m).filter(f => f === 'book' || f === 'check' || f === 'older');
  if (!tg.length && !sm.length && !m.topPick && !fl.length) return '';
  return `<span class="tstrip">${m.topPick ? `<i class="top">${esc(t('topPick'))}</i>` : ''}${fl.map(f => `<i class="note">${esc(t('f_' + f))}</i>`).join('')}${sm.map(s => `<i class="setm">${esc(t('sm_' + s.kind, { p: s.price }))}</i>`).join('')}${tg.map(g => `<i>${esc(t('t_' + g))}</i>`).join('')}</span>`;
};

// Keeps the "!" glued to the last word of the name so it never wraps onto its own line.
const nameWithWarn = (name, warn) => {
  if (!warn) return esc(name);
  const i = name.lastIndexOf(' ');
  return `${esc(name.slice(0, i + 1))}<span class="nw">${esc(name.slice(i + 1))}<i class="warn" aria-hidden="true">!</i></span>`;
};

// Distance, always saying from where: from the house, plus from you when your location is known.
export const distHTML = m => { const me = kmMe(m); return [m.km != null ? `${m.km} km ${t('fromHouseShort')}` : null, me != null ? `${me} km ${t('fromYouShort')}` : null].filter(Boolean).map(x => `<small class="dist">${esc(x)}</small>`).join(''); };

// Towns and cities have no "website": they link to Wikipedia in the guest's language (search goes straight to the article).
const wikiUrl = q => `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}&go=Go`;

// Compact list row that expands to the full details (Markets page). Summary: icon, name,
// type and distance, and the live status (today) or that day's hours (other days).
export function row(m, opts = {}) {
  const live = opts.date && opts.live ? statusLabel(m, opts.date) : null;
  const hrs = !live && opts.date ? runsOn(m, opts.date).map(x => (x.m ? t('morning') : `${x.o.replace(/^0/, '')}-${x.c.replace(/^0/, '')}`)).join(', ') : '';
  const me = kmMe(m);
  // A number stays with its unit (.nw); the rest of the line wraps between words.
  const dist = [m.km != null ? `<span class="nw">${m.km} km</span> ${esc(t('fromHouseShort'))}` : null, me != null ? `<span class="nw">${me} km</span> ${esc(t('fromYouShort'))}` : null].filter(Boolean).map(x => `<span class="dk">${x}</span>`).join('');
  const rate = m.rating ? `<span class="dk rating"><span class="nw">★ ${m.rating.stars.toFixed(1)}</span> · ${esc(t('gReviews', { n: m.rating.count.toLocaleString(locale()) }))}</span>` : '';
  const price = m.price ? `<span class="dk price">${esc(t('perPerson', { p: m.price }))}</span>` : '';
  const warn = false; // notes like "Book ahead" are shown as plain tags, not a warning sign
  const ht = hoursText(m);
  const nextLine = m.s.length && !(live && live.cls !== 'closed') ? `<span class="t next">${esc(nextOpenText(m))}</span>` : '';
  const when = typeof ht === 'string'
    ? `<div class="when"><span>${esc(t('occasional'))}</span><span class="t">${esc(ht)}</span></div>`
    : `<div class="when">${ht.map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}${nextLine}</div>`;
  const where = [m.place, [m.town, m.comarca].filter(Boolean).join(' · ')].filter(Boolean);
  return `<details class="mrow" style="${itemStyle(m)}" data-id="${esc(m.id)}">
   <summary>
     <span class="dot">${itemIcon(m)}</span>
     <span class="nm">${nameWithWarn(title(m), warn)}<small>${esc(catLabel(m))}<span class="dl">${dist}${rate}${price}</span></small></span>
     <span class="rt">${live ? stHTML(live) : hrs ? `<span class="st plain">${esc(hrs)}</span>` : m.kind === 'spot' && opts.live && m.always ? `<span class="st open">${esc(t('open24'))}</span>` : m.kind === 'spot' && opts.live && m.s.length ? stHTML(closedStatus(m, opts.date)) : ''}<span class="chev" aria-hidden="true"></span></span>
     ${tagStrip(m)}
   </summary>
   <div class="mbody">
     <div class="where">${where.map(esc).join('<br>')}</div>
     ${m.stalls_approx ? `<div class="row"><span class="size">${esc(t('stalls', { n: m.stalls_approx }))}</span></div>` : ''}
     ${m.s.length ? when : ''}${m.hours ? `<p class="hnote">${esc(tx(m.hours))}</p>` : ''}
     ${m.description ? `<div class="note">${esc(tx(m.description))}</div>` : ''}
     ${m.priceNote ? `<p class="hnote pnote">${esc(tx(m.priceNote))}</p>` : ''}
     ${warnings(m).filter(f => !['book', 'check', 'older'].includes(f)).map(f => `<div class="flag">${esc(t('f_' + f))}</div>`).join('')}
     <div class="actions">
       <a class="btn primary" href="${gDir(m)}" target="_blank" rel="noopener">${ICON.dir}${esc(t('directions'))}</a>
       <a class="btn" href="${gSearch(m)}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>
       ${m.nomap ? '' : `<a class="btn" href="#map/m/${encodeURIComponent(m.id)}">${esc(t('onMap'))}</a>`}
       ${m.phone ? `<a class="btn" href="tel:${m.phone.replace(/\s+/g, '')}">${esc(t('callLabel'))} ${esc(m.phone)}</a>` : ''}
       ${m.url ? `<a class="btn" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}
     ${m.wiki ? `<a class="btn" href="${wikiUrl(m.wiki)}" target="_blank" rel="noopener">Wikipedia</a>` : ''}
     </div>
   </div></details>`;
}

export const chips = (cats, set, attr, labelOf) => cats.map(c =>
  `<button class="chip" ${attr}="${c}" aria-pressed="${set.has(c)}" style="--cc:var(--c-${c})">${catIcon(c)}${esc(labelOf(c))}</button>`).join('');
