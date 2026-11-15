// Getting around's page (README.md, "Its look"). Route #s/<id>, as every section's page (views/section.js asks the module,
// modules/index.js); also an older guide's taxi card with "trains" (#p/<id>, the highlights module's page hands it over).
import { t, tx } from '../../i18n.js';
import { QUICK } from '../../content.js';
import { gSearch, gDir } from '../../geo.js';
import { esc, ICON, itemIcon, PHONE, WEB, tel } from '../../ui.js';
import { overviewMap } from '../map/index.js';
import { icon as quickIcon } from '../highlights/index.js';
import { page as textPage } from '../info/index.js';
import { modeOf, stopsOf, groupsOf, pageIcon } from './plan.js';

// The section's page: its file, with the icon of its card on Home when it has one. A Getting around section with no file
// is drawn as a text page with nothing in it (as built: the section view's last branch).
export function page(V, sec) {
  if (!sec.data) { textPage(V, sec); return; }
  const T = sec.data; renderTransport(V, { ...T, id: sec.id, title: t(sec.labelKey), tileIcon: QUICK.find(q => q.id === sec.id)?.icon }, quickIcon);
}

// Getting around: every option visible on the first screen as a row (what, how long, the verdict); tap a row for the
// details, the call button or directions. Taxis first, then stations and stops by kind, the stations map last.
// From the Getting around section (content/transport.json) or, in older guides, a Home tile with "trains" (plan.js
// transportOf).
export function renderTransport(V, g, icons) {
  const row = (dot, cc, title, sub, right, body, extra = '') => `<details class="mrow" style="--cc:${cc}"><summary><span class="dot">${dot}</span>
    <span class="nm">${esc(title)}${extra}${sub.map(x => `<small>${esc(x)}</small>`).join('')}</span><span class="rt">${right}<span class="chev" aria-hidden="true"></span></span></summary>
    <div class="mbody">${body}</div></details>`;
  const taxis = (g.taxis || []).map(x => row(icons({ id: 'taxi' }), 'var(--tone-taxi)', tx(x.name), [tx(x.sub || '')].filter(Boolean), x.always ? `<span class="st open">${esc(t('open24'))}</span>` : '',
    `${x.what ? `<div class="note">${esc(tx(x.what))}</div>` : ''}
     <div class="actions">${x.phone ? `<a class="btn primary" href="${tel(x.phone)}">${PHONE}${esc(t('callNow'))} ${esc(x.phone)}</a>` : ''}
     ${(x.alt || []).map(a => `<a class="btn" href="${tel(a.phone)}">${PHONE}${esc(tx(a.name))} ${esc(a.phone)}</a>`).join('')}</div>`)).join('');
  // Line badges in the line colours (Rodalies lines; long-distance trains in one colour), then journey times. A line
  // with no name is left out (the editor's "Add a line" starts one empty).
  const badges = s => `<span class="lbadges">${(s.badges || []).filter(b => String(b.t ?? '').trim()).map(b => `<i class="lbadge${b.ink ? ' ink' : ''}" style="--lc:${b.c}">${esc(b.t)}</i>`).join('')}</span>`;
  // Two columns, so destinations keep their width on a phone: the note ("1 change") sits under its destination.
  const dests = s => (s.to || []).length ? `<table class="dests"><tbody>${s.to.map(d => `<tr><th>${esc(tx(d.dest))}${tx(d.note) ? `<small>${esc(tx(d.note))}</small>` : ''}</th><td>${esc(d.time)}</td></tr>`).join('')}</tbody></table>` : '';
  // A station never placed (0,0) is left out; one whose Google position ran out (nomap) stays in the list, off the map.
  const stops = stopsOf(g.stations);
  const pins = stops.filter(s => !s.nomap);
  const station = s => { const [mode, , cc] = modeOf(s);
    return row(itemIcon({ icon: mode }), cc, tx(s.name), [[s.tag && tx(s.tag), s.min ? t('minByCar', { n: s.min }) : ''].filter(Boolean).join(' · ')].filter(Boolean), '',
    `${dests(s)}${s.what ? `<div class="note">${esc(tx(s.what))}</div>` : ''}
     <div class="actions"><a class="btn primary" href="${esc(gDir(s))}" target="_blank" rel="noopener">${ICON.dir}${esc(t('directions'))}</a>
 ${s.gid || s.gmaps ? `<a class="btn" href="${esc(gSearch(s))}" target="_blank" rel="noopener">${ICON.pin}Google Maps</a>` : ''}
     ${s.link ? `<a class="btn" href="${esc(s.link)}" target="_blank" rel="noopener">${WEB}${esc(t(s.linkKey || 'timetable'))}</a>` : ''}</div>`, badges(s)); };
  const groups = groupsOf(stops);
  V.innerHTML = `<div class="wrap place transport" style="gap:14px" data-q="${esc(g.id)}">
    <div class="pl-head"><span class="qi">${icons({ icon: pageIcon(g, stops) })}</span>
      <div><h2 class="title">${esc(typeof g.title === 'string' ? g.title : tx(g.title))}</h2>${g.lead ? `<p class="lead">${esc(tx(g.lead))}</p>` : ''}</div></div>
    ${taxis ? `<h3 class="section-h">${esc(t('taxiH'))}</h3><div class="mlist">${taxis}</div>` : ''}
    ${groups.map(([label, l], i) => `<h3 class="section-h">${esc(t(label))}</h3>${i === 0 && pins.length ? '<div class="pl-map secmap"><div id="trmap"></div></div>' : ''}<div class="mlist">${l.map(station).join('')}</div>`).join('')}
  </div>`;
  if (pins.length) overviewMap(V.querySelector('#trmap'), pins.map(s => ({ lat: s.lat, lng: s.lng, icon: modeOf(s)[0], tone: modeOf(s)[3], cat: 'todo' })));
}
