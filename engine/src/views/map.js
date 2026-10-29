import { t, tx, lang } from '../i18n.js';
import { HOUSE, CATS, MAP_ITEMS, byId, SITE } from '../content.js';
// The search box looks for places in this box (site.json area.searchBbox), default about 150 km around the house.
const BBOX = (SITE.area?.searchBbox || [HOUSE.lng - 1.5, HOUSE.lat - 1.2, HOUSE.lng + 1.5, HOUSE.lat + 1.2]).join(',');
const RADIUS = SITE.area?.radiusKm || 40;
import { st } from '../state.js';
import { runsOn } from '../schedule.js';
import { esc, row, title, shortTitle, ICON, itemIcon, itemStyle } from '../ui.js';
import { hav } from '../geo.js';
import { scheme, onSchemeChange } from '../theme.js';
import { sorted } from './markets.js';

// Tiles: OpenFreeMap (free, no key, OpenStreetMap data). Light and dark styles follow the app theme (see src/theme.js).
const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const SPLIT_ZOOM = 13;        // below: one pin per town; at or above: one pin per market
const ITEM_ZOOM = 16.5;       // tapping a market
const GROUP_MIN = 11, GROUP_MAX = 16.5;
const CLUSTER_PX = 34;     // towns closer than this on screen share one pin


let ml = null;          // maplibre module
let map = null;
let markers = [];       // current item/group markers
let houseMarker = null, meMarker = null;
let mode = null;
let clusterBounds = [];
// Towns the guest opened (tap on a town or a cluster): their places show as separate pins even when zoomed out.
const expanded = new Set();
let expandZoom = 0;        // 'groups' | 'items'
let built = false;
let pendingRoute = null;
let el = null;

// "5 markets", or "3 places" when the group mixes markets with other spots.
const countLabel = items => t(items.every(m => m.kind === 'market') ? 'nMarkets' : 'nPlaces', { n: items.length });

// Map filters: one tab per kind of place, every place belongs to exactly one tab (All shows everything).
// eat: places to eat and the bar next door · markets: every market · todo: What to do · night: Nightlife · useful: recycling centre and other practical spots.
export const MAP_TABS = ['all', 'eat', 'markets', 'todo', 'night', 'useful'];   // a tab without places is not shown (Nightlife is optional)
const TAB_LABEL = { all: 'mapAll', eat: 'mapEat', markets: 'mapMarkets', todo: 'mapDo', night: 'mapNight', useful: 'mapUseful' };
export const tabOf = m => (m.kind === 'market' || CATS.includes(m.cat) ? 'markets' : m.section === 'restaurants' || m.cat === 'restaurants' ? 'eat' : m.section === 'nightlife' ? 'night' : ['todo', 'kids', 'daytrips'].includes(m.section) || m.cat === 'todo' ? 'todo' : 'useful');
const tabHasItems = k => k === 'all' || MAP_ITEMS.some(m => tabOf(m) === k);

function visibleItems() {
  const now = new Date(), tab = st.mapTab || 'all';
  return MAP_ITEMS.filter(m => (tab === 'all' || tabOf(m) === tab) && !(tab === 'markets' && st.mapToday && !runsOn(m, now).length));
}

function groupsOf(items) {
  const g = new Map();
  for (const m of items) {
    if (!g.has(m.groupSlug)) g.set(m.groupSlug, { slug: m.groupSlug, label: m.groupKey, items: [] });
    g.get(m.groupSlug).items.push(m);
  }
  for (const x of g.values()) {
    x.lat = x.items.reduce((a, m) => a + m.lat, 0) / x.items.length;
    x.lng = x.items.reduce((a, m) => a + m.lng, 0) / x.items.length;
  }
  return [...g.values()];
}
const groupItems = slug => visibleItems().filter(m => m.groupSlug === slug);

/* ---------- DOM shell (built once, texts refreshed on language change) ---------- */
function shell() {
  el.innerHTML = `<div class="wrap" style="gap:14px">
    <div><h2 class="title" data-t="map"></h2><p class="lead" data-t="mapNote"></p></div>
    <div class="mapseg" id="mapChips" role="radiogroup"></div>
    <div class="mapat" id="mapAt">
      <button class="mapat-btn" id="mapAtBtn" aria-expanded="false">${ICON.pin}<span class="mapat-l"><small data-t="atLabel"></small><b id="mapAtName"></b></span><span class="chev" aria-hidden="true"></span></button>
      <div class="mapat-panel" id="mapAtPanel" hidden>
        <input id="mapAtQ" type="search" autocomplete="off" enterkeyhint="search">
        <div class="mapat-res" id="mapAtRes" role="listbox"></div>
      </div>
    </div>
    <div class="mapbox" id="mapbox">
      <div id="mapgl" role="region"></div>
      <div class="map-msg" id="mapMsg" hidden><p data-t="mapOffline"></p></div>
      <div class="map-top"><button class="btn float" id="mapAllBtn" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span data-t="recenter"></span></button></div>
      <div class="map-bottom">
        <button class="btn float" data-locate>${ICON.me}<span data-t="locate"></span></button>
        <div class="locmsg" id="locmsg" role="status" hidden></div>
      </div>
    </div>
    <div id="sheet"></div>
    <p class="foot" data-t="foot"></p>
  </div>`;
  el.addEventListener('click', onClick);
  const q = el.querySelector('#mapAtQ');
  q.addEventListener('input', () => { clearTimeout(atTimer); atTimer = setTimeout(() => atSearch(q.value), 250); atSearch(q.value, true); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = el.querySelector('#mapAtRes [data-at]'); if (f) f.click(); } if (e.key === 'Escape') atOpen(false); });
}

/* ---------- "Centre the map on": the house by default, your location, a town from the guide, or any place (search) ---------- */
let atTimer = null, atSeq = 0, atRemote = [], atLocal = [];
const norm = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const anchor = () => st.mapAt || { lat: HOUSE.lat, lng: HOUSE.lng };
const TOWNS = () => {
  const g = new Map();
  MAP_ITEMS.forEach(m => { if (!m.town || m.town === HOUSE.name) return; const a = g.get(m.town) || { name: m.town, lat: 0, lng: 0, n: 0 }; a.lat += m.lat; a.lng += m.lng; a.n++; g.set(m.town, a); });
  return [...g.values()].map(a => ({ name: a.name, lat: a.lat / a.n, lng: a.lng / a.n }));
};
function atOpen(on) {
  const p = el.querySelector('#mapAtPanel'), b = el.querySelector('#mapAtBtn');
  p.hidden = !on; b.setAttribute('aria-expanded', on);
  if (on) { const q = el.querySelector('#mapAtQ'); q.value = ''; atRemote = []; atSearch(''); q.focus({ preventScroll: true }); }
}
function atLabel() { const n = el.querySelector('#mapAtName'); if (n) n.textContent = st.mapAt ? st.mapAt.name : HOUSE.name; }
function atSearch(qs, localOnly) {
  const q = norm(qs.trim());
  const opt = (k, name, sub, i) => `<button data-at="${k}"${i != null ? ` data-ati="${i}"` : ''} role="option"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  const local = TOWNS().filter(x => !q || norm(x.name).includes(q)).sort((a, b) => hav(HOUSE.lat, HOUSE.lng, a.lat, a.lng) - hav(HOUSE.lat, HOUSE.lng, b.lat, b.lng)).slice(0, q ? 6 : 8);
  atLocal = local;
  const draw = () => {
    const fixed = !q || norm(HOUSE.name).includes(q) ? opt('house', HOUSE.name, t('atHouse')) : '';
    const me = !q ? opt('me', t('atMe'), '') : '';
    const rem = atRemote.filter(r => !local.some(l => norm(l.name) === norm(r.name)));
    const html = fixed + me + local.map((x, i) => opt('town', x.name, t('atInGuide'), i)).join('') + rem.map((x, i) => opt('remote', x.name, x.sub, i)).join('');
    el.querySelector('#mapAtRes').innerHTML = html || (q.length >= 3 && !localOnly ? `<p class="mapat-none">${esc(t('atNone'))}</p>` : '');
  };
  if (localOnly || q.length < 3) { if (q.length < 3) atRemote = []; draw(); return; }
  const seq = ++atSeq;
  const lp = ['en', 'de', 'fr'].includes(lang) ? `&lang=${lang}` : '';
  fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(qs.trim())}&limit=6${lp}&lat=${HOUSE.lat}&lon=${HOUSE.lng}&bbox=${BBOX}`)
    .then(r => r.json()).then(j => {
      if (seq !== atSeq) return;
      atRemote = (j.features || []).map(f => { const p = f.properties || {}; return { name: p.name || p.street || '', sub: [p.city || p.town || p.village, p.county || p.state].filter(x => x && x !== p.name).join(', '), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }; }).filter(x => x.name);
      draw();
    }).catch(() => { if (seq === atSeq) { atRemote = []; draw(); } });
}
let atMarker = null;
// A small target marks the place the map is centred on, the house included (a centre mark, not an exact house pin).
function atMark() {
  if (atMarker) { atMarker.remove(); atMarker = null; }
  const v = st.mapAt || { lat: HOUSE.lat, lng: HOUSE.lng }; if (!map || !ml || v.me) return;
  const d = document.createElement('div'); d.className = 'at-mk'; d.style.zIndex = '4';
  atMarker = new ml.Marker({ element: d }).setLngLat([v.lng, v.lat]).addTo(map);
}
function atSet(v) {
  st.mapAt = v; atLabel(); atOpen(false); atMark();
  if (location.hash !== '#map') { location.hash = '#map'; return; }
  st.mapSel = null; expanded.clear();
  // Same view for every choice, the house included: centred on it, showing the places around it.
  if (map) map.fitBounds(overviewBounds(), { padding: 30, duration: 900 });
  drawMarkers(); renderSheet();
}

function texts() {
  el.querySelectorAll('[data-t]').forEach(n => { n.textContent = t(n.dataset.t); });
  el.querySelector('#mapgl').setAttribute('aria-label', t('mapLabel'));
  el.querySelector('#mapAtQ').placeholder = t('atSearch'); atLabel();
  const ag = st.mapTab || 'all';
  el.querySelector('#mapChips').innerHTML = `<div class="seg">${MAP_TABS.filter(tabHasItems).map(k => `<button role="radio" data-mgroup="${k}" aria-checked="${k === ag}">${esc(t(TAB_LABEL[k]))}</button>`).join('')}</div>` +
    (ag === 'markets' ? `<button class="chip plain" data-mtoday aria-pressed="${st.mapToday}">${esc(t('openTodayOnly'))}</button>` : '');
  const ft = el.querySelector('.foot'); if (ft) ft.hidden = ag !== 'markets';
  const lm = el.querySelector('#locmsg');
  lm.textContent = st.locState; lm.hidden = !st.locState;
  const z = { '.maplibregl-ctrl-zoom-in': 'zoomIn', '.maplibregl-ctrl-zoom-out': 'zoomOut', '.maplibregl-ctrl-compass': 'resetNorth' };
  for (const s in z) el.querySelectorAll(s).forEach(b => { b.title = t(z[s]); b.setAttribute('aria-label', t(z[s])); });
}

/* ---------- map ---------- */
async function loadLib() {
  if (ml) return ml;
  if (window.__MAPLIBRE_INLINE) return (ml = await loadInline(window.__MAPLIBRE_INLINE));
  const base = window.__VENDOR_BASE || new URL('vendor/maplibre/', document.baseURI).href;
  if (!document.querySelector('link[data-maplibre]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + 'maplibre-gl.css'; l.dataset.maplibre = '';
    document.head.appendChild(l);
  }
  ml = await import(/* @vite-ignore */ base + 'maplibre-gl.mjs');
  return ml;
}

// Single-file preview build only (npm run preview-file): MapLibre is embedded in the page
// and loaded from blob URLs, since there is no server to fetch it from.
async function loadInline(src) {
  const blob = (code, type = 'text/javascript') => URL.createObjectURL(new Blob([code], { type }));
  const shared = blob(src.shared);
  const fix = code => code.replace(/(["'])\.\/maplibre-gl-shared\.mjs\1/g, JSON.stringify(shared));
  const st = document.createElement('style');
  st.textContent = src.css;
  document.head.appendChild(st);
  const lib = await import(/* @vite-ignore */ blob(fix(src.main)));
  lib.setWorkerUrl(blob(fix(src.worker)));
  return lib;
}

// Overview: centred on the chosen place (the house by default), showing the places within 40 km,
// or the 5 nearest when none are that close. Bounds are mirrored around the centre so it stays in the middle.
function overviewBounds() {
  const a = anchor();
  const vis = (visibleItems().length ? visibleItems() : MAP_ITEMS).map(m => ({ m, d: hav(a.lat, a.lng, m.lat, m.lng) })).sort((x, y) => x.d - y.d);
  const near = vis.filter(x => x.d <= RADIUS);
  const pick = (near.length >= 3 ? near : vis.slice(0, 5)).map(x => x.m);
  const b = new ml.LngLatBounds([a.lng, a.lat], [a.lng, a.lat]);
  pick.forEach(m => { b.extend([m.lng, m.lat]); b.extend([2 * a.lng - m.lng, 2 * a.lat - m.lat]); });
  return b;
}

async function initMap() {
  const msg = el.querySelector('#mapMsg');
  try { await loadLib(); } catch (e) { msg.hidden = false; return; }
  map = new ml.Map({
    container: el.querySelector('#mapgl'),
    style: STYLE[scheme()],
    bounds: overviewBounds(),
    fitBoundsOptions: { padding: 30 },
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    maxZoom: 18.5,
    cooperativeGestures: false
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  map.on('error', e => {
    // Style or tile failures (usually offline). Markers still work on a blank map.
    if (!navigator.onLine || /style|Failed to fetch|NetworkError/i.test(String(e?.error?.message || ''))) msg.hidden = false;
  });
  map.on('styledata', () => { if (navigator.onLine) msg.hidden = true; });
  map.on('zoom', () => { const m = map.getZoom() >= SPLIT_ZOOM ? 'items' : 'groups'; if (m !== mode) drawMarkers(); else declutter(); });
  let listT = 0;
  map.on('moveend', () => { declutter(); clearTimeout(listT); listT = setTimeout(renderSheet, 150); });
  map.on('zoomend', () => {
    // Zooming back out past where a town was opened folds it up again.
    if (expanded.size && map.getZoom() < expandZoom - 1.2) { expanded.clear(); expandZoom = 0; if (!st.mapSel) renderSheet(); }
    if (mode === 'groups') drawMarkers();
  });
  let shown = scheme();
  onSchemeChange(s => { if (s !== shown) { shown = s; map.setStyle(STYLE[s]); } });
  window.addEventListener('online', () => { msg.hidden = true; map.setStyle(STYLE[scheme()]); });
  if (!navigator.onLine) msg.hidden = false;

  // No house pin on any map: its position is approximate on purpose (privacy), and a pin in the wrong place misleads.
  // The local bar & shop (1 min walk) and the guest's own blue dot show where home is.

  texts();
  drawMarkers();
  atMark();
  if (st.me) placeMe();
  if (pendingRoute) { const r = pendingRoute; pendingRoute = null; applyRoute(r, false); }
}


function ringOf(items) {
  const counts = {};
  items.forEach(m => { counts[m.cat] = (counts[m.cat] || 0) + 1; });
  let acc = 0;
  return 'conic-gradient(' + Object.entries(counts).map(([c, n]) => {
    const a = acc / items.length * 100; acc += n;
    return `var(--c-${c}) ${a}% ${acc / items.length * 100}%`;
  }).join(',') + ')';
}

function groupPin(items, lat, lng, label, attrs, sel, isCluster) {
  const b = document.createElement('button');
  b.className = 'mk' + (sel ? ' sel' : '') + (isCluster ? ' cl' : '');
  for (const k in attrs) b.setAttribute(k, attrs[k]);
  b.dataset.prio = (sel ? 1000 : 0) + items.length;
  b.setAttribute('aria-label', `${label}, ${countLabel(items)}`);
  b.innerHTML = `<div class="gp" style="--ring:${ringOf(items)}"><b>${items.length}</b></div><span class="mk-label">${esc(isCluster ? label.split(', ')[0] + ' +' + (label.split(', ').length - 1) : label)}</span>`;
  markers.push(new ml.Marker({ element: b, anchor: 'center' }).setLngLat([lng, lat]).addTo(map));
}

function drawMarkers() {
  if (!map) return;
  markers.forEach(m => m.remove());
  markers = [];
  mode = map.getZoom() >= SPLIT_ZOOM ? 'items' : 'groups';
  const items = visibleItems();
  const selId = st.mapSel?.type === 'item' ? st.mapSel.id : null;
  const selGroup = st.mapSel?.type === 'group' ? st.mapSel.slug : selId ? byId(selId)?.groupSlug : null;

  const pin = m => {
    const b = document.createElement('button');
    b.className = 'mk' + (m.id === selId ? ' sel' : '');
    b.style.cssText = itemStyle(m);
    b.dataset.item = m.id;
    b.setAttribute('aria-label', title(m));
    b.innerHTML = `<div class="pin">${itemIcon(m)}</div>${mode === 'items' ? `<span class="mk-label sm">${esc(shortTitle(m))}</span>` : ''}`;
    b.dataset.prio = m.id === selId ? 1000 : selGroup && m.groupSlug === selGroup ? 500 : 0;
    markers.push(new ml.Marker({ element: b, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map));
  };

  if (mode === 'items') {
    // Draw the selected one last so it sits on top.
    items.slice().sort((a, b) => (a.id === selId) - (b.id === selId)).forEach(pin);
    declutter();
    return;
  }
  // Towns whose pins would overlap on screen are merged into one cluster pin; tapping it zooms in
  // until the towns separate. Each town with several markets is one pin with a count.
  // Practical spots (recycling centre...) are never grouped into a town pin: always their own pin.
  items.filter(m => m.utility).forEach(pin);
  const allUnits = groupsOf(items.filter(m => !m.utility));
  allUnits.filter(g => expanded.has(g.slug)).forEach(g => g.items.forEach(pin));
  const units = allUnits.filter(g => !expanded.has(g.slug)).map(g => ({ ...g, p: map.project([g.lng, g.lat]) })).sort((a, b) => b.items.length - a.items.length);
  const clusters = [];
  for (const u of units) {
    const c = clusters.find(c => Math.hypot(c.p.x - u.p.x, c.p.y - u.p.y) < CLUSTER_PX);
    if (c) c.members.push(u); else clusters.push({ p: u.p, members: [u] });
  }
  clusterBounds = [];
  for (const c of clusters) {
    if (c.members.length === 1) {
      const g = c.members[0];
      if (g.items.length === 1) pin(g.items[0]);
      else groupPin(g.items, g.lat, g.lng, g.label, { 'data-group': g.slug }, g.slug === selGroup);
      continue;
    }
    const all = c.members.flatMap(g => g.items);
    const lat = all.reduce((a, m) => a + m.lat, 0) / all.length, lng = all.reduce((a, m) => a + m.lng, 0) / all.length;
    clusterBounds.push(all);
    const names = c.members.map(g => g.label);
    groupPin(all, lat, lng, names.join(', '), { 'data-cluster': clusterBounds.length - 1 }, c.members.some(g => g.slug === selGroup), true);
  }
  declutter();
}

// Hide labels that would overlap a more important label or pin, so dense areas stay readable.
let declutterQueued = false;
function declutter() {
  if (declutterQueued) return;
  declutterQueued = true;
  requestAnimationFrame(() => {
    declutterQueued = false;
    const els = [houseMarker?.getElement(), ...markers.map(m => m.getElement())].filter(Boolean);
    const pins = els.map(e => e.firstElementChild.getBoundingClientRect());
    const order = els.map((e, i) => i).sort((a, b) => (+(els[b].dataset.prio ?? 900)) - (+(els[a].dataset.prio ?? 900)));
    const kept = [];
    const hit = (r, q) => r.left < q.right + 2 && r.right > q.left - 2 && r.top < q.bottom + 1 && r.bottom > q.top - 1;
    for (const i of order) {
      const lab = els[i].querySelector('.mk-label');
      if (!lab) continue;
      lab.style.visibility = '';
      const r = lab.getBoundingClientRect();
      const clash = kept.some(q => hit(r, q)) || pins.some((q, j) => j !== i && hit(r, q));
      if (clash) lab.style.visibility = 'hidden'; else kept.push(r);
    }
  });
}

// A numbered town pin: open it and zoom so all its places fit, the list below follows the map.
function zoomToGroup(slug) {
  const items = groupItems(slug);
  if (!items.length) return;
  expanded.add(slug);
  const bb = new ml.LngLatBounds([items[0].lng, items[0].lat], [items[0].lng, items[0].lat]);
  items.forEach(m => bb.extend([m.lng, m.lat]));
  expandZoom = map.cameraForBounds(bb, { padding: 60 })?.zoom ?? map.getZoom();
  map.fitBounds(bb, { padding: 60, maxZoom: GROUP_MAX, duration: 800 });
  drawMarkers(); renderSheet();
}

/* ---------- selection (driven by the URL hash) ---------- */
function renderSheet() {
  const sh = el.querySelector('#sheet');
  const back = el.querySelector('#mapAllBtn');
  const sel = st.mapSel;
  back.hidden = false;
  const now = new Date();
  // The list is exactly what the map shows: places inside the visible area, closest to the map centre first.
  let list = visibleItems();
  if (map) {
    const bb = map.getBounds(), ctr = map.getCenter();
    list = list.filter(m => bb.contains([m.lng, m.lat]))
      .map(m => ({ m, d: hav(ctr.lat, ctr.lng, m.lat, m.lng) }))
      .sort((a, b) => a.d - b.d).map(x => x.m);
  }
  const selId = sel?.type === 'item' ? sel.id : null;
  if (selId) { const s = list.find(m => m.id === selId); if (s) list = [s, ...list.filter(m => m.id !== selId)]; }
  const head = esc(t('nPlaces', { n: list.length }));
  sh.innerHTML = `<div class="maplist-hd"><h3 class="sh maplist-h">${head}</h3>${selId ? `<a class="x" href="#map">${esc(t('close'))}</a>` : ''}</div>` +
    (list.length
      ? `<div class="mlist maplist">${list.map(m => { const r = row(m, { date: now, live: true }); return m.id === selId ? r.replace('<details class="mrow"', '<details open class="mrow sel"') : r; }).join('')}</div>`
      : `<p class="maplist-empty">${esc(t('mapEmpty'))}</p>`);
}

function applyRoute(r, animate = true) {
  st.mapSel = r;
  if (r?.type === 'item') { const m = byId(r.id); if (m && st.mapTab !== 'all' && tabOf(m) !== st.mapTab) { st.mapTab = tabOf(m); st.mapToday = false; texts(); } }
  renderSheet();
  if (!map) { pendingRoute = r; return; }
  const opts = { duration: animate ? 900 : 0, essential: true };
  if (!r) {
    expanded.clear();
    map.fitBounds(overviewBounds(), { padding: 30, ...opts });
  } else if (r.type === 'group') {
    zoomToGroup(r.slug); return;
    const items = groupItems(r.slug);
    const b = new ml.LngLatBounds([items[0].lng, items[0].lat], [items[0].lng, items[0].lat]);
    items.forEach(m => b.extend([m.lng, m.lat]));
    const cam = map.cameraForBounds(b, { padding: { top: 70, bottom: 60, left: 70, right: 90 } }) || { center: b.getCenter(), zoom: GROUP_MAX };
    map.flyTo({ center: cam.center, zoom: Math.min(GROUP_MAX, Math.max(GROUP_MIN, cam.zoom)), ...opts });
  } else {
    const m = byId(r.id);
    if (m) map.flyTo({ center: [m.lng, m.lat], zoom: ITEM_ZOOM, ...opts });
  }
  drawMarkers();
}

/* ---------- geolocation ---------- */
function placeMe() {
  if (!map || !st.me) return;
  if (!meMarker) {
    // Wrapper is the marker element (absolutely positioned by MapLibre); it sits above every pin.
    const d = document.createElement('div');
    d.className = 'me-mk';
    d.innerHTML = '<div class="me-dot"></div>';
    d.setAttribute('role', 'img');
    meMarker = new ml.Marker({ element: d, anchor: 'center' });
  }
  meMarker.getElement().setAttribute('aria-label', t('youAreHere'));
  meMarker.setLngLat([st.me.lng, st.me.lat]).addTo(map);
}

export function locate(onDone) {
  if (!navigator.geolocation) { st.locState = t('locErr'); onDone && onDone(false); return; }
  st.locState = t('locating');
  onDone && onDone(null);
  navigator.geolocation.getCurrentPosition(p => {
    st.me = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    st.locState = hav(st.me.lat, st.me.lng, HOUSE.lat, HOUSE.lng) > 120 ? t('outside') : '';
    onDone && onDone(true);
  }, () => {
    st.locState = t('locErr');
    if (st.sort === 'me') st.sort = 'house';
    onDone && onDone(false);
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

/* ---------- events ---------- */
function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.cluster) {
    const all = clusterBounds[+b.dataset.cluster] || [];
    const bb = new ml.LngLatBounds([all[0].lng, all[0].lat], [all[0].lng, all[0].lat]);
    all.forEach(m => bb.extend([m.lng, m.lat]));
    new Set(all.map(m => m.groupSlug)).forEach(s => expanded.add(s));
    map.fitBounds(bb, { padding: 60, maxZoom: GROUP_MAX, duration: 800 });
    expandZoom = map.cameraForBounds(bb, { padding: 60 })?.zoom ?? map.getZoom();
    drawMarkers(); renderSheet();
  }
  else if (b.dataset.group) { zoomToGroup(b.dataset.group); }
  else if (b.dataset.item) { location.hash = '#map/m/' + encodeURIComponent(b.dataset.item); }
  else if (b.id === 'mapAtBtn') { atOpen(el.querySelector('#mapAtPanel').hidden); }
  else if (b.dataset.at) {
    const k = b.dataset.at, i = +b.dataset.ati;
    if (k === 'house') atSet(null);
    else if (k === 'town') { const x = atLocal[i]; atSet({ name: x.name, lat: x.lat, lng: x.lng }); }
    else if (k === 'remote') { const x = atRemote[i]; atSet({ name: x.name, lat: x.lat, lng: x.lng }); }
    else if (k === 'me') locate(ok => { texts(); if (ok) { placeMe(); atSet({ name: t('atMe'), lat: st.me.lat, lng: st.me.lng, me: true }); } else atOpen(false); });
  }
  else if (b.id === 'mapAllBtn') { if (location.hash === '#map') applyRoute(null); else location.hash = '#map'; }
  else if (b.dataset.mgroup) {
    st.mapTab = b.dataset.mgroup; if (st.mapTab !== 'markets') st.mapToday = false;
    expanded.clear(); texts();
    if (location.hash !== '#map') location.hash = '#map'; else { st.mapSel = null; map && map.fitBounds(overviewBounds(), { padding: 40, duration: 700 }); drawMarkers(); renderSheet(); }
  }
  else if (b.hasAttribute('data-mtoday')) { st.mapToday = !st.mapToday; texts(); map && map.fitBounds(overviewBounds(), { padding: 40, duration: 700 }); drawMarkers(); renderSheet(); }
  else if (b.hasAttribute('data-locate')) {
    locate(ok => {
      texts();
      if (ok) {
        placeMe();
        if (!st.locState) map && map.flyTo({ center: [st.me.lng, st.me.lat], zoom: Math.max(map.getZoom(), 13.5), essential: true });
      }
    });
  }
}

/* ---------- public ---------- */
// route: null (overview) | {type:'group', slug} | {type:'item', id}
export function showMap(container, route, animate) {
  el = container;
  if (!built) { built = true; shell(); texts(); initMap(); }
  if (map) map.resize();
  applyRoute(route, !!map && animate);
  if (map && st.me) placeMe();
}

export function refreshMapLang() {
  if (!built) return;
  texts();
  renderSheet();
  drawMarkers();
  if (meMarker || st.me) placeMe();
}

export function refreshMapStatus() { if (built) renderSheet(); }

// Small static map for place pages: the place and the house, no interaction (tapping opens Google Maps).
// Your position on the small maps too, once location is known (no prompt here).
function meDot(m, b) {
  if (!st.me) return;
  const d = document.createElement('div'); d.className = 'me-mk'; d.style.zIndex = '5'; d.innerHTML = '<div class="me-dot"></div>';
  new ml.Marker({ element: d, anchor: 'center' }).setLngLat([st.me.lng, st.me.lat]).addTo(m);
  if (b && hav(st.me.lat, st.me.lng, HOUSE.lat, HOUSE.lng) < 60) b.extend([st.me.lng, st.me.lat]);
}

export async function miniMap(box, lng, lat) {
  if (!box) return;
  try { await loadLib(); } catch (e) { box.classList.add('off'); return; }
  const m = new ml.Map({ container: box, style: STYLE[scheme()], center: [lng, lat], zoom: 13, interactive: false, attributionControl: { compact: true } });
  const pin = document.createElement('div');
  pin.className = 'mk'; pin.innerHTML = `<div class="pin" style="--cc:var(--red)">${ICON.pin}</div>`;
  new ml.Marker({ element: pin, anchor: 'center' }).setLngLat([lng, lat]).addTo(m);
  const b = new ml.LngLatBounds([lng, lat], [lng, lat]); b.extend([HOUSE.lng, HOUSE.lat]);
  meDot(m, b);
  m.fitBounds(b, { padding: 50, maxZoom: 15, duration: 0 });
}

// Overview of one section's places (Bars & restaurants...) with the house, non-interactive.
export async function overviewMap(box, items) {
  if (!box || !items.length) return;
  try { await loadLib(); } catch (e) { box.classList.add('off'); return; }
  const m = new ml.Map({ container: box, style: STYLE[scheme()], center: [HOUSE.lng, HOUSE.lat], zoom: 10, interactive: false, attributionControl: { compact: true } });
  const b = new ml.LngLatBounds([HOUSE.lng, HOUSE.lat], [HOUSE.lng, HOUSE.lat]);
  items.forEach(it => {
    const el = document.createElement('div');
    el.className = 'mk'; el.style.zIndex = it.pinHtml ? '3' : '2'; el.innerHTML = it.pinHtml ? `<div class="pin" style="--cc:${it.pinColor}">${it.pinHtml}</div>` : `<div class="pin" style="${itemStyle(it)}">${itemIcon(it)}</div>`;
    new ml.Marker({ element: el, anchor: 'center' }).setLngLat([it.lng, it.lat]).addTo(m);
    b.extend([it.lng, it.lat]);
  });
  meDot(m, b);
  m.fitBounds(b, { padding: 45, maxZoom: 14, duration: 0 });
}
