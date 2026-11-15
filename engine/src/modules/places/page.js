// A list of the host's places (Eat and drink, Things to do, Nightlife; README.md, "Its look"): the highlight the section
// shows on top, a small map of the list, the quick-filter groups, the time filters, the feature filters, the choice of
// distance, then the rows. Route #s/<id>, as every section's page (views/section.js asks the module, modules/index.js).
// Same pattern as Markets: an overview map, then rows ranked by distance (from the house or from you). A place with no
// hours of ours shows Google's card when its row opens (gcard: true, engine/src/gcard.js).
import { t } from '../../i18n.js';
import { esc, ICON, row } from '../../ui.js';
import { st } from '../../state.js';
import { sorted, sortRow } from '../../lists.js';
import { overviewMap } from '../map/index.js';
import { sectionFrame } from '../../views/section.js';
import { pageCard, mapPin } from '../highlights/index.js';
import { GROUPS, placesOf, pinsOf } from './data.js';
import { FEATS, listPlan } from './plan.js';

export function page(V, sec) {
  const prevF = V.dataset.secf;
  const id = sec.id;
  // A place closed for the season and opening in more than 30 days is not shown (plan.js shownNow): the counts, the
  // chips, the filters and the overview map follow, since they all start from this list.
  const all = placesOf(id);
  // Quick filters when items have a "group" (What to do: Kids & fun, Beach, Sights & towns); time filters when some place
  // has hours; feature filters (restaurants, things to do) when some place has one (plan.js listPlan).
  const now0 = new Date();
  const P = listPlan(all, { id, labelled: GROUPS, sgroup: st.sgroup[id], openf: st.openf[id], featf: st.featf[id] }, sorted, now0);
  const { groups, gsel, timed, ofsel, byGroup, feats, fsel, byFeat, nNow, nLater, list: l, k3 } = P;
  const ochips = timed ? `<div class="gchips ochips" role="group">${[['any', 'f_anyTime', byFeat.length], ['now', 'f_openNow', nNow], ['later', 'f_openLater', nLater]].filter(([k, , n]) => k === 'any' || n).map(([k, key, n]) => `<button class="gchip" data-openf="${k}" data-sec="${id}" aria-pressed="${k === ofsel}"${k === 'now' ? ' style="--cc:var(--green)"' : k === 'later' ? ' style="--cc:var(--blue)"' : ''}>${esc(t(key))}<span class="n">${n}</span></button>`).join('')}</div>` : '';
  const fchips = feats.length ? `<div class="gchips fchips" role="group">${feats.map(k => `<button class="gchip" data-featf="${k}" data-sec="${id}" aria-pressed="${fsel.includes(k)}">${esc(t('ff_' + k))}<span class="n">${byGroup.filter(FEATS[k]).length}</span></button>`).join('')}</div>` : '';
  const toneOf = g => GROUPS[g] || all.find(s => s.group === g)?.tone;
  const gchips = groups.length > 1 ? `<div class="gchips" role="group">${['all', ...groups].map(g => `<button class="gchip" data-sgroup="${g}" data-sec="${id}" aria-pressed="${g === gsel}"${g !== 'all' && toneOf(g) ? ` style="--cc:var(--tone-${toneOf(g)})"` : ''}>${esc(t('g_' + g))}<span class="n">${g === 'all' ? all.length : all.filter(s => s.group === g).length}</span></button>`).join('')}</div>` : '';
  V.dataset.secf = gsel + '|' + ofsel;
  const now = new Date();
  // A Home highlight shown on top of the page ("highlight" in sections.json), e.g. the bar next door (modules/highlights).
  const hl = pageCard(sec.highlight);
  const body = all.length ? `${hl}<a class="pl-map secmap" href="#map" data-mapcat="${esc(all[0].cat)}" aria-label="${esc(t('openMap'))}"><div id="secmap"></div><span class="pl-map-cta">${ICON.pin}${esc(t('openMap'))}</span></a>
      ${gchips}${ochips}${fchips}${sortRow()}
      ${l.length ? `<div class="mlist">${l.map((m, i) => (i === k3 ? `<h3 class="mgh">${esc(t('f_noHours'))}</h3>` : '') + row(m, { date: now, live: true, gcard: true })).join('')}</div>` : `<p class="empty">${esc(t('f_noneOpen'))}</p>`}` : `<div class="empty">${esc(t('soon'))}</div>`;
  // The list's map: kept as is when only the status refreshes (the same list, the same filters), redrawn otherwise.
  const oldMap = V.dataset.sec === id ? V.querySelector('#secmap') : null;
  sectionFrame(V, sec, body);
  const box = V.querySelector('#secmap');
  if (box && oldMap && prevF === V.dataset.secf) box.replaceWith(oldMap);
  else if (box) { const gs = (V.dataset.secf || '').split('|')[0]; const extra = id === 'restaurants' ? mapPin('shop') : [];
    overviewMap(box, pinsOf(id, gs).concat(extra)); }
}
