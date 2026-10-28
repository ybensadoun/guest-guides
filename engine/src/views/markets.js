import { t, locale } from '../i18n.js';
import { MARKETS, CATS } from '../content.js';
import { st } from '../state.js';
import { runsOn, dayName, cap } from '../schedule.js';
import { kmMe } from '../geo.js';
import { esc, row, chips, ICON } from '../ui.js';
import { overviewMap } from './map.js';

const FILTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';

export function sorted(list) {
  const d = v => v == null ? 1e9 : v;   // no distance known: last
  return list.slice().sort((a, b) => (st.sort === 'me' && st.me ? d(kmMe(a)) - d(kmMe(b)) : d(a.km) - d(b.km)) || a.town.localeCompare(b.town));
}

export const sortRow = () => `<div class="row"><div class="pills" role="group">
    <button data-sort="house" aria-pressed="${st.sort === 'house'}">${esc(t('fromHouse'))}</button>
    <button data-sort="me" aria-pressed="${st.sort === 'me'}">${esc(t('fromMe'))}</button></div>
    ${st.locState ? `<span class="sortnote" role="status">${esc(st.locState)}</span>` : ''}</div>`;

// Empty result: a visible box, with a one-tap way back to all market types when some are filtered out.
const emptyBox = () => `<div class="emptybox" role="status"><b>${esc(t('noneMatch'))}</b>${st.cats.size < CATS.length ? `<button class="btn" data-resetcats>${esc(t('showAllTypes'))}</button>` : ''}</div>`;
const list = (l, rowOpts) => (l.length ? `<div class="mlist">${l.map(m => row(m, rowOpts(m))).join('')}</div>` : emptyBox());

// A compact map of the markets in the list; tapping it opens the full map on Markets.
const mapBox = l => (l.length ? `<a class="pl-map secmap mkmapbox" href="#map" data-mapcat="${esc(l[0].cat)}" aria-label="${esc(t('openMap'))}"><div id="mkmap"></div><span class="pl-map-cta">${ICON.pin}${esc(t('openMap'))}</span></a>` : '');

export function renderMarkets(V) {
  // Keep expanded rows open across re-renders (filters, the 1-minute status refresh).
  const openIds = new Set([...V.querySelectorAll('.mrow[open]')].map(e => e.dataset.id));
  const now = new Date();
  const vis = m => st.cats.has(m.cat);
  let body = '', shown = [], mkey = '';
  if (st.mk === 'days') {
    // Next 14 days as real dates, so monthly markets (2nd Saturday...) only show on their date.
    const DAYS = 14;
    const dates = Array.from({ length: DAYS }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() + i); return d; });
    const off = Math.min(Math.max(st.dayOff || 0, 0), DAYS - 1);
    const sel = dates[off];
    const rel = i => (i === 0 ? t('today') : i === 1 ? t('tomorrow') : '');
    const short = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
    const count = d => MARKETS.filter(m => vis(m) && runsOn(m, d).length).length;
    const bar = `<div class="daybar" id="daybar">${dates.map((d, i) => `<button class="dchip ${i === 0 ? 'today' : ''}" data-day="${i}" aria-pressed="${i === off}">
      <span>${esc(cap(short.format(d)))} ${d.getDate()}</span><small>${esc(rel(i) ? rel(i) + ' · ' : '')}${count(d)}</small></button>`).join('')}</div>`;
    const head = (rel(off) ? rel(off) + ' · ' : '') + cap(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(sel));
    shown = MARKETS.filter(m => vis(m) && runsOn(m, sel).length); mkey = 'd' + off;
    body = bar + mapBox(shown) + `<h3 class="section-h">${esc(head)}</h3>` +
      list(sorted(shown), () => ({ date: off === 0 ? now : sel, live: off === 0 }));
  } else {
    shown = MARKETS.filter(vis); mkey = 'all';
    body = mapBox(shown) + list(sorted(shown), () => ({}));
  }
  mkey += '|' + [...st.cats].sort().join(',');
  const oldMap = V.dataset.mkkey === mkey ? V.querySelector('#mkmap') : null;
  // Filters (types and distance basis) live in a fold-out panel so the list starts high on the screen.
  // Badge = how many settings differ from the default (all types except covered, distance from the house).
  const def = new Set(CATS.filter(c => c !== 'covered'));
  const changed = CATS.filter(c => st.cats.has(c) !== def.has(c)).length + (st.sort === 'me' ? 1 : 0);
  V.innerHTML = `<div class="wrap" style="gap:14px">
    <h2 class="title">${esc(t('markets'))}</h2>
    <div class="mk-top">
      <div class="pills" role="group">
        <button data-mk="days" aria-pressed="${st.mk === 'days'}">${esc(t('vWeek'))}</button>
        <button data-mk="all" aria-pressed="${st.mk === 'all'}">${esc(t('vAll'))}</button></div>
      <button class="btn filt" data-filt aria-expanded="${!!st.filtOpen}">${FILTER_ICON}${esc(t('filters'))}${changed ? `<span class="nbadge">${changed}</span>` : ''}</button>
    </div>
    <div class="filters" ${st.filtOpen ? '' : 'hidden'}>
      <div class="row">${chips(CATS, st.cats, 'data-cat', c => t('cat_' + c))}</div>
      ${sortRow()}
    </div>
    ${body}
    <p class="foot">${esc(t('mkLead'))} ${esc(t('foot'))}</p></div>`;
  V.querySelectorAll('.mrow').forEach(e => { if (openIds.has(e.dataset.id)) e.open = true; });
  // The small map of the markets listed: kept as is when only the status refreshes, redrawn when the day or filters change.
  const box = V.querySelector('#mkmap');
  if (box && oldMap) box.replaceWith(oldMap); else if (box) overviewMap(box, shown);
  V.dataset.mkkey = mkey;
  // Keep the selected day visible in the scrolling strip.
  const bar = V.querySelector('#daybar');
  const selChip = bar && bar.querySelector('[aria-pressed="true"]');
  if (selChip) bar.scrollLeft = Math.max(0, selChip.offsetLeft - bar.offsetLeft - (bar.clientWidth - selChip.offsetWidth) / 2);
}
