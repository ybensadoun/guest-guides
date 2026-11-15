import { t } from '../i18n.js';
import { SECTIONS, MODULE_ON, TRANSPORT_CARD, HOME_ARRANGEMENT } from '../content.js';
import { esc, SECTION_LOOK, ARROW } from '../ui.js';
import { MODULES } from '../modules/index.js';
import { resolve } from '../modules/frame.js';
import { widget as whatsOn } from '../modules/whatson/index.js';
import { welcome, wireWelcome } from '../modules/house/index.js';

export function renderHome(V) {
  const now = new Date();
  // No header on Home: the language button sits on the first heading's row. At the very end, one quiet text link to
  // Sources and credits (views/credits.js), below everything else.
  // The house itself on top: the welcome card, the frame's fixed top (modules/house).
  V.innerHTML = `<div class="wrap" style="gap:14px">
   ${welcome()}
   ${sectionGrid(now)}
   ${whatsOn(now)}
   <p class="hfoot"><a href="#credits">${esc(t('credits'))}</a></p>
  </div>`;
  wireWelcome(V);
}

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
  // A module draws its own widget (modules/index.js): Home only places it. Its label and link are the section's, unless
  // the widget gives its own (markets: "Markets" and the day's list, whatever the section's status, as the frame places
  // them; Emergencies: its short label). A kind with no module of its own is a text page's tile (modules/info).
  const one = (sec, size, w) => {
    const x = (MODULES[sec.kind]?.widget ? MODULES[sec.kind] : MODULES.info).widget(now, sec), label = x.label ?? t(sec.labelKey);
    if (sec.status !== 'live' && !x.href) return tile(sec.id, label, null, t('soon'), false, sz(size, label));
    return tile(sec.id, label, x.href ?? '#s/' + sec.id, x.meta, x.live, sz(size, label, x.cls, w), x.extra);
  };
  const R = resolve(HOME_ARRANGEMENT, frameGuide(now));
  // The map's bar is its module's widget, with its own classes (modules/map/widget.js).
  const draw = x => x.kind === 'map' ? (m => tile('map', m.label, m.href, m.meta, m.live, m.cls))(MODULES.map.widget(now))
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
