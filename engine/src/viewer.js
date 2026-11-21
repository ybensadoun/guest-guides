// The shared guide viewer: opens /g/<name>, loads that guide from the database, then starts the normal guide app.
// Same app as a built guide; only the data source differs (see site-data.js).
import './styles/app.css';
import './styles/map.css';
import { WORLDS, worldOf, worldCss } from './worlds.js';

// A guide's own address (ca-la-kimberly.netlify.app) is the same viewer built for one guide, served from the root:
// GUIDE_SLUG=<slug> at build time (engine/vite.viewer.config.js). Otherwise the guide comes from the path /g/<slug>.
const FIXED = import.meta.env.VITE_GUIDE_SLUG || '';
const DB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values
const V = () => document.getElementById('view');

// ?embed: the guide inside another page of this same site (the maker's first page shows a real guide in a phone, 21 Nov
// 2026). It is only looked at: it reads no session (the published guide only), shows no Wi-Fi, asks Google nothing (a public
// marketing page: every visitor would cost calls, and Google's content is not ours to show there), keeps nothing (a storage in
// memory stands in for the browser's, no copy for offline use, no service worker, no install manifest), and moves between
// its screens without adding to the page's history (its own back arrow goes back inside it; the browser's back button stays
// the page's). It tells the page holding it whether the guide is shown ({ guideEmbed: 'shown' | 'none' }).
const EMBED = new URLSearchParams(location.search).has('embed') && window.parent !== window;
const tell = shown => { if (EMBED) try { window.parent.postMessage({ guideEmbed: shown ? 'shown' : 'none' }, location.origin); } catch (e) { /* nothing listens */ } };
if (EMBED) {
  // No paid or third-party call a guest's visit would make: no Google key, so no Google script and no open-now line (gcard.js).
  document.querySelector('meta[name="gmaps-key"]')?.remove();
  const memory = () => { const m = new Map(); return { getItem: k => m.has(String(k)) ? m.get(String(k)) : null, setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: k => { m.delete(String(k)); }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  for (const n of ['localStorage', 'sessionStorage']) { try { Object.defineProperty(window, n, { value: memory(), configurable: true }); } catch (e) { /* the browser's own then: only the guide's language would be kept */ } }
  // A screen opened inside: the address replaced, not pushed (Navigation API; without it the browser adds the entries).
  const back = [];
  if (window.navigation) window.navigation.addEventListener('navigate', e => {
    if (e.navigationType !== 'push' || !e.hashChange || !e.cancelable) return;
    e.preventDefault(); back.push(location.hash || '#home'); location.replace(e.destination.url);
  });
  addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('#backBtn')) return;
    e.preventDefault(); e.stopImmediatePropagation(); location.replace(back.pop() || '#home');
  }, true);
}

function say(title, text) {
  document.title = title;
  const v = V();
  if (v) v.innerHTML = `<div style="padding:40px 20px;max-width:520px;margin:0 auto;text-align:center"><h2 style="margin:0 0 10px">${title}</h2><p style="margin:0;opacity:.75;line-height:1.5">${text}</p></div>`;
}
const notShown = (title, text) => { say(title, text); tell(false); };

// ?preview: the host's unpublished changes (guides.draft, saved by the editor), only for the host logged in on this site.
const PREVIEW = new URLSearchParams(location.search).has('preview');
// ?world=<id>: the guide in that colour world (src/worlds.js) for this visit only, how an owner looks at his guide in each
// world on his phone and how the maker's picker shows them. Nothing is stored: the copy kept for offline use is the guide
// as it is, and the address's world is read again on every start (offline too: the service worker answers any /g/ address
// with the same page). An unknown id is ignored.
const ASKED = new URLSearchParams(location.search).get('world');
async function fetchGuide(slug) {
  let tok = null;
  if (!EMBED) try { tok = (JSON.parse(localStorage.getItem('porta-auth-v1') || 'null') || {}).access_token; } catch (e) { /* storage blocked */ }
  if (tok) {   // the host looking at their own guide: a guide not published yet, or with ?preview the changes not published yet
    try {
      const r = await fetch(`${DB.url}/rest/v1/guides?slug=eq.${encodeURIComponent(slug)}&select=content,theme,status${PREVIEW ? ',draft' : ''}`, { headers: { apikey: DB.key, Authorization: 'Bearer ' + tok } });
      if (r.ok) {
        const j = await r.json(), g = j[0];
        // A draft that differs from the guide only by the monthly check's notes on places (look: the host's answer to us, never
        // shown to guests; the maker's cmNoLook) has no change waiting. Both copies come from jsonb: their keys in the same order.
        const shown = x => JSON.stringify(x, (k, v) => k === 'look' && v && Array.isArray(v.why) ? undefined : v);
        if (g && PREVIEW && g.draft && g.draft.content) return { content: g.draft.content, theme: g.draft.theme || g.theme, status: g.status, preview: shown(g.draft.content) === shown(g.content) && shown(g.draft.theme || g.theme) === shown(g.theme) ? 'live' : 'draft' };
        if (g && g.content && g.content.site) return PREVIEW ? { ...g, preview: 'live' } : g;
      }
    } catch (e) { /* fall through to the public copy */ }
  }
  const r = await fetch(`${DB.url}/rest/v1/rpc/get_published_guide`, { method: 'POST', headers: { apikey: DB.key, Authorization: 'Bearer ' + DB.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) });
  if (!r.ok) throw new Error('http_' + r.status);
  const j = await r.json();
  return j && j.content && j.content.site ? { ...j, status: 'published' } : null;
}

// Images and icons in the content are file names relative to the guide ("house.jpg", "guide/pool.jpg"): point them at the guide's files.
const IMG = /^[\w][\w/.\-]*\.(jpe?g|png|webp|gif|svg|avif)$/i;
function withAssets(x, base) {
  if (typeof x === 'string') return IMG.test(x) ? base + x : x;
  if (Array.isArray(x)) return x.map(i => withAssets(i, base));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, withAssets(v, base)]));
  return x;
}

// A copy of the last guide seen stays on the phone, so the guide opens without a connection (the service worker keeps the app and the photos).
const CK = s => 'guide-cache:' + s;
function saveCopy(slug, row) { try { localStorage.setItem(CK(slug), JSON.stringify(row)); } catch (e) { /* storage full or blocked */ } }
function loadCopy(slug) { try { return JSON.parse(localStorage.getItem(CK(slug)) || 'null'); } catch (e) { return null; } }
function dropCopy(slug) { try { localStorage.removeItem(CK(slug)); } catch (e) { /* nothing to do */ } }

const ICON_FILE = { favicon: 'favicon.png', apple: 'apple-touch-icon.png', i192: 'icons/icon-192.png', i512: 'icons/icon-512.png', maskable: 'icons/icon-maskable-512.png' };
function goOffline(site, files, base, slug, paper, icons = {}) {
  const icon = k => { const v = icons[k]; return v ? (/^https?:/.test(v) ? v : base + v) : base + ICON_FILE[k]; };
  try {
    const man = { name: site.name, short_name: String(site.name).slice(0, 14), start_url: FIXED ? `${location.origin}/` : `${location.origin}/g/${slug}`, scope: FIXED ? `${location.origin}/` : `${location.origin}/g/`, display: 'standalone', background_color: paper, theme_color: paper,
      icons: [{ src: icon('i192'), sizes: '192x192', type: 'image/png' }, { src: icon('i512'), sizes: '512x512', type: 'image/png' }, { src: icon('maskable'), sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
    let l = document.querySelector('link[rel="manifest"]'); if (!l) { l = document.createElement('link'); l.rel = 'manifest'; document.head.appendChild(l); }
    l.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' }));
    let ai = document.querySelector('link[rel="apple-touch-icon"]'); if (!ai) { ai = document.createElement('link'); ai.rel = 'apple-touch-icon'; document.head.appendChild(ai); } ai.href = icon('apple');
  } catch (e) { /* the guide works without these */ }
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(FIXED ? '/sw.js' : '/g-sw.js', { scope: FIXED ? '/' : '/g/' }).then(() => navigator.serviceWorker.ready).then(reg => {
    // Ask the worker to keep everything this guide uses: the app files, fonts, and every photo of the guide.
    setTimeout(() => {
      const urls = new Set(performance.getEntriesByType('resource').map(r => r.name));
      const walk = x => { if (typeof x === 'string') { if (x.startsWith(base) && IMG.test(x.slice(base.length))) urls.add(x); } else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); };
      walk(site); walk(files);
      urls.add(new URL(import.meta.env.BASE_URL + 'licenses.txt', location.href).href);   // linked from the credits page, so it opens offline too
      const msg = { type: 'keep', urls: [...urls] };
      (reg.active || navigator.serviceWorker.controller) && (reg.active || navigator.serviceWorker.controller).postMessage(msg);
    }, 2500);
  }).catch(() => { /* private mode or blocked: online only */ });
}

(async () => {
  const m = FIXED ? [null, FIXED] : location.pathname.match(/^\/g\/([^/]+)/);
  if (!m) return notShown('Guide not found', 'This address is not a guide.');
  const slug = decodeURIComponent(m[1]).toLowerCase();
  say('Loading your guide…', 'One moment.');
  let row;
  try { row = await fetchGuide(slug); if (row && row.preview) { /* a preview is never the copy kept for offline use */ } else if (row) saveCopy(slug, row); else dropCopy(slug); }
  catch (e) { row = loadCopy(slug); if (!row) return notShown('No connection', 'We could not reach the guide. Check your internet and reload the page.'); }
  if (!row) return notShown('This guide is being prepared', 'Its host is still setting it up. Please check back soon.');

  const c = row.content, th = row.theme || {};
  const base = c.assetBase || '';
  const site = withAssets(c.site, base), files = withAssets(c.files || {}, base);
  // Its colour world: the address's (?world), else the guide's own (theme.world); an id this viewer does not know is
  // none, and the guide shows in the base look (app.css). An old layout its row may still name (theme.preset: the four
  // were removed on 14 Nov 2026) is ignored.
  const world = worldOf(ASKED) || worldOf(th.world || (site.theme || {}).world);
  // The fonts this guide shows: the world's (else the base look's, Bauhaus's), then the guide's own (loaded from the CDN
  // below, named on the credits page).
  const fonts = [...new Set([...(world || WORLDS.bauhaus).fonts, ...(th.fonts || (site.theme || {}).fonts || [])])];
  window.__GUIDE__ = { site, files, private: EMBED ? {} : c.private || {}, i18n: c.i18n || {}, fonts };
  window.__VENDOR_BASE = import.meta.env.BASE_URL + 'vendor/maplibre/';

  document.title = site.name;
  const setMeta = (sel, v) => { const e = document.querySelector(sel); if (e) e.setAttribute('content', v); };
  setMeta('meta[name="theme-color"]', (site.theme && site.theme.paper) || '#FFFFFF');
  setMeta('meta[name="apple-mobile-web-app-title"]', site.name);
  // No logo: none is shown (never a made-up one). Icons: the set made from the host's logo in the editor (site.icons),
  // else the ones the build made (from the logo, else from the house photo).
  const logo = document.getElementById('viewerLogo'); if (logo && c.site.logo) logo.src = base + c.site.logo;
  const icon = k => { const v = (c.site.icons || {})[k]; return v ? (/^https?:/.test(v) ? v : base + v) : base + ICON_FILE[k]; };
  const ic = document.querySelector('link[rel="icon"]'); if (ic && c.favicon !== false) ic.href = icon('favicon');

  // Fonts come from the CDN (the viewer does not bundle every font): the world's (else the base look's), then this
  // guide's; then the world's tokens, then this guide's own theme.
  for (const f of fonts) {
    const [fam, file] = f.replace(/^@fontsource\//, '').split('/');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://cdn.jsdelivr.net/npm/@fontsource/${fam}@5/${file}`; document.head.appendChild(l);
  }
  if (world) { const s = document.createElement('style'); s.id = 'guideWorld'; s.textContent = worldCss(world); document.head.appendChild(s); }
  if (th.css) { const s = document.createElement('style'); s.id = 'guideTheme'; s.textContent = th.css; document.head.appendChild(s); }

  V().innerHTML = '';
  try { await import('./main.js'); } catch (e) { tell(false); throw e; }
  tell(true);
  // Only the host sees this: a small label floating at the bottom (the top edge holds the back and language buttons).
  // The page gets room at its end, so nothing stays under the label.
  if (row.preview || (row.status && row.status !== 'published')) {
    const b = document.createElement('div');
    b.textContent = row.preview === 'draft' ? 'Preview: your changes, not live yet' : row.preview === 'live' ? 'Preview: no changes waiting' : 'Draft: only you can see this';
    b.style.cssText = `position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:45;max-width:calc(100% - 32px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:600 13px/1 system-ui,sans-serif;padding:9px 14px;border-radius:999px;background:#F2B33D;color:#1b1407;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none`;
    document.body.appendChild(b); document.body.style.paddingBottom = `calc(${getComputedStyle(document.body).paddingBottom} + 48px)`;
  }
  if (!EMBED) goOffline(site, files, base, slug, (site.theme && site.theme.paper) || '#ffffff', c.site.icons || {});
})();
