// Fonts are bundled so the guide works offline. Use the per-weight files (they declare unicode-range); the latin + latin-ext pair without it broke capital accents like À.
// The site's fonts come from site.json (theme.fonts, or the preset's), then the engine styles, the layout preset, and the site's own theme.css on top.
import 'virtual:site-fonts';
import './styles/app.css';
import './styles/map.css';
import 'virtual:site-preset';
import '@site/theme.css';

import { t, setLang, lang, LANGS, LANG_NAMES } from './i18n.js';
import { CATS } from './content.js';
import { st, toggleIn, DEFAULT_CATS } from './state.js';
import { theme, applyTheme, cycleTheme, DARK_ENABLED } from './theme.js';
import { renderHome } from './views/home.js';
import { renderMarkets } from './views/markets.js';
import { renderSection } from './views/section.js';
import { renderMore, quickIcon } from './views/home.js';
import { renderPlace } from './views/place.js';
import { NAV_ICON } from './ui.js';
import { showMap, refreshMapLang, refreshMapStatus, locate, tabOf } from './views/map.js';

const V = document.getElementById('view');
const MV = document.getElementById('mapview');

/* Routes
   #home · #markets · #markets/today, #markets/day/<n> (Home shortcuts: day strip on today or n days ahead, filters kept)
   #map · #map/g/<town> · #map/m/<id> · #s/<section> · #more */
function parse() {
  const [a, b, c] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (a === 'markets') return { view: 'markets', today: b === 'today', day: b === 'day' ? Math.max(0, +c || 0) : null };
  if (a === 'map') return { view: 'map', sel: b === 'g' && c ? { type: 'group', slug: c } : b === 'm' && c ? { type: 'item', id: c } : null };
  if (a === 's' && b) return { view: 'section', id: b };
  if (a === 'p' && b) return { view: 'place', id: b };
  if (a === 'more') return { view: 'more' };
  return { view: 'home' };
}

function chrome() {
  document.documentElement.lang = lang;
  document.getElementById('brandSub').textContent = t('brandSub');
  const home = st.view === 'home';
  document.body.classList.toggle('is-home', home);
  document.getElementById('welcomeT').textContent = t('welcome');
  document.getElementById('welcomeS').textContent = t('welcomeSub');
  // No bottom bar: Home is the menu. Other pages get a back arrow in the slim header.
  const back = document.getElementById('backBtn');
  back.hidden = home;
  back.setAttribute('aria-label', t('home'));
  const sel = document.getElementById('langSel');
  sel.setAttribute('aria-label', t('langLabel'));
  if (!sel.options.length) sel.innerHTML = LANGS.map(l => `<option value="${l}" lang="${l}">${l.toUpperCase()} · ${LANG_NAMES[l]}</option>`).join('');
  sel.value = lang;
  document.getElementById('langCode').textContent = lang.toUpperCase();
  const tb = document.getElementById('themeBtn');
  tb.hidden = !DARK_ENABLED;
  const label = `${t('themeLabel')}: ${t('theme_' + theme)}`;
  tb.dataset.mode = theme;
  tb.setAttribute('aria-label', label);
  tb.title = label;
}

// Header: no bar at rest, just the back and language buttons floating over the page.
// Once the page title scrolls away, a frosted bar fades in with that title (large-title pattern).
const onScroll = () => {
  document.getElementById('hero').classList.toggle('scrolled', scrollY > 48);
  // Home: once the photo has scrolled away, a slim bar with the house name stays at the top (no animation).
  const hb = document.getElementById('hbar'), ph = document.querySelector('.hc-id');
  if (hb && ph) {
    // Progressive: the bar eases in over the last 70px of the house card, instead of popping in.
    const h = hb.offsetHeight, y = ph.getBoundingClientRect().bottom;
    const k = Math.min(1, Math.max(0, (h + 70 - y) / 70));
    hb.style.setProperty('--k', k.toFixed(3));
    hb.classList.toggle('on', k > 0);
  }
};
addEventListener('scroll', onScroll, { passive: true });
function syncTitle() {
  const h = document.querySelector('#view:not([hidden]) h2.title, #mapview:not([hidden]) h2.title');
  document.querySelector('.hero h1').textContent = st.view === 'home' ? '' : h ? h.textContent : '';
  onScroll();
}

let lastView = null;
// Coming back to Home puts you where you were on it (standard back navigation), not at the top.
const homeScroll = { y: 0 };
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function route() {
  if (lastView === 'home') homeScroll.y = scrollY;
  const r = parse();
  if (r.view === 'markets' && (r.today || r.day != null)) {
    st.mk = 'days';
    st.dayOff = r.today ? 0 : r.day;
    history.replaceState(null, '', '#markets');
  }
  const prev = lastView;
  st.view = r.view;
  lastView = r.view;
  chrome();
  const onMap = r.view === 'map';
  V.hidden = onMap;
  MV.hidden = !onMap;
  if (onMap) { showMap(MV, r.sel, prev === 'map'); syncTitle(); }
  else render();
  if (prev !== r.view) {
    if (r.view === 'home' && homeScroll.y) { const y = homeScroll.y; window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y)); }
    else window.scrollTo(0, 0);
  }
}

function render() {
  if (st.view === 'home') renderHome(V);
  else if (st.view === 'markets') renderMarkets(V);
  else if (st.view === 'section') renderSection(V, parse().id);
  else if (st.view === 'more') renderMore(V);
  else if (st.view === 'place') renderPlace(V, parse().id, quickIcon);
  syncTitle();
}

document.addEventListener('click', e => {
  // Home shortcuts that open one row of the House guide (Wifi, Check-out).
  const op = e.target.closest('a[data-open]');
  if (op) window.__openRow = op.dataset.open;
  // The plain Map link (Home) always opens on "All".
  const ma = e.target.closest('a[href="#map"]:not([data-mapcat])');
  if (ma && !MV.contains(ma)) { st.mapTab = 'all'; st.mapToday = false; st.mapSel = null; }
  // Home links into Markets reset its filters, so the list matches Home's unfiltered count.
  const hm = e.target.closest('a[href^="#markets"]');
  if (hm && st.view === 'home') { st.cats = new Set(DEFAULT_CATS); }
  const mc = e.target.closest('a[data-mapcat]');
  if (mc) { st.mapTab = tabOf({ cat: mc.dataset.mapcat }); st.mapToday = false; st.mapSel = null; }
  const b = e.target.closest('button');
  if (!b || MV.contains(b)) return;
  const d = b.dataset;
  if (b.id === 'themeBtn') { cycleTheme(); chrome(); }
  else if (d.mk) { st.mk = d.mk; render(); }
  else if (d.day) { st.dayOff = +d.day; render(); }
  else if (d.filt !== undefined) { st.filtOpen = !st.filtOpen; render(); }
  else if (d.resetcats !== undefined) { st.cats = new Set(CATS); render(); }
  else if (d.cat) { st.cats = toggleIn(st.cats, CATS, d.cat); render(); }
  else if (d.sgroup) { st.sgroup[d.sec] = d.sgroup; render(); }
  else if (d.featf) { const a = st.featf[d.sec] || []; st.featf[d.sec] = a.includes(d.featf) ? a.filter(x => x !== d.featf) : [...a, d.featf]; render(); }
  else if (d.openf) { st.openf[d.sec] = d.openf; render(); }
  else if (d.sort) {
    if (d.sort === 'me') { st.sort = 'me'; if (!st.me) locate(() => render()); else render(); }
    else { st.sort = 'house'; render(); }
  }
});

applyTheme();
document.getElementById('langSel').addEventListener('change', e => { setLang(e.target.value); chrome(); render(); refreshMapLang(); });
window.addEventListener('hashchange', route);
route();

// Keep "open now / later / finished" fresh.
const tick = () => { if (st.view === 'map') refreshMapStatus(); else if (document.activeElement?.tagName !== 'INPUT') render(); };
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

// If the guest already allowed location for this site, find them quietly so every map shows the blue dot.
try { navigator.permissions?.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted' && !st.me) locate(ok => { if (ok) render(); }); }).catch(() => {}); } catch (e) {}
