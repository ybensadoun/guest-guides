// The shared guide viewer: opens /g/<name>, loads that guide from the database, then starts the normal guide app.
// Same app as a built guide; only the data source differs (see site-data.js).
import './styles/app.css';
import './styles/map.css';
import soft from './styles/presets/soft.css?url';
import minimal from './styles/presets/minimal.css?url';
import mediterranean from './styles/presets/mediterranean.css?url';
import rural from './styles/presets/rural.css?url';
import LOOKS from './presets.json';

// A guide's own address (ca-la-kimberly.netlify.app) is the same viewer built for one guide, served from the root:
// GUIDE_SLUG=<slug> at build time (engine/vite.viewer.config.js). Otherwise the guide comes from the path /g/<slug>.
const FIXED = import.meta.env.VITE_GUIDE_SLUG || '';
const DB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values
const PRESET_CSS = { soft, minimal, mediterranean, rural };
const V = () => document.getElementById('view');

function say(title, text) {
  document.title = title;
  const v = V();
  if (v) v.innerHTML = `<div style="padding:40px 20px;max-width:520px;margin:0 auto;text-align:center"><h2 style="margin:0 0 10px">${title}</h2><p style="margin:0;opacity:.75;line-height:1.5">${text}</p></div>`;
}

// ?preview: the host's unpublished changes (guides.draft, saved by the editor), only for the host logged in on this site.
const PREVIEW = new URLSearchParams(location.search).has('preview');
async function fetchGuide(slug) {
  let tok = null;
  try { tok = (JSON.parse(localStorage.getItem('porta-auth-v1') || 'null') || {}).access_token; } catch (e) { /* storage blocked */ }
  if (tok) {   // the host looking at their own guide: a guide not published yet, or with ?preview the changes not published yet
    try {
      const r = await fetch(`${DB.url}/rest/v1/guides?slug=eq.${encodeURIComponent(slug)}&select=content,theme,status${PREVIEW ? ',draft' : ''}`, { headers: { apikey: DB.key, Authorization: 'Bearer ' + tok } });
      if (r.ok) {
        const j = await r.json(), g = j[0];
        if (g && PREVIEW && g.draft && g.draft.content) return { content: g.draft.content, theme: g.draft.theme || g.theme, status: g.status, preview: 'draft' };
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

function goOffline(site, files, base, slug, paper) {
  try {
    const man = { name: site.name, short_name: String(site.name).slice(0, 14), start_url: FIXED ? `${location.origin}/` : `${location.origin}/g/${slug}`, scope: FIXED ? `${location.origin}/` : `${location.origin}/g/`, display: 'standalone', background_color: paper, theme_color: paper,
      icons: [{ src: base + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: base + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: base + 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
    let l = document.querySelector('link[rel="manifest"]'); if (!l) { l = document.createElement('link'); l.rel = 'manifest'; document.head.appendChild(l); }
    l.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' }));
    let ai = document.querySelector('link[rel="apple-touch-icon"]'); if (!ai) { ai = document.createElement('link'); ai.rel = 'apple-touch-icon'; document.head.appendChild(ai); } ai.href = base + 'apple-touch-icon.png';
  } catch (e) { /* the guide works without these */ }
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(FIXED ? '/sw.js' : '/g-sw.js', { scope: FIXED ? '/' : '/g/' }).then(() => navigator.serviceWorker.ready).then(reg => {
    // Ask the worker to keep everything this guide uses: the app files, fonts, and every photo of the guide.
    setTimeout(() => {
      const urls = new Set(performance.getEntriesByType('resource').map(r => r.name));
      const walk = x => { if (typeof x === 'string') { if (x.startsWith(base) && IMG.test(x.slice(base.length))) urls.add(x); } else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); };
      walk(site); walk(files);
      const msg = { type: 'keep', urls: [...urls] };
      (reg.active || navigator.serviceWorker.controller) && (reg.active || navigator.serviceWorker.controller).postMessage(msg);
    }, 2500);
  }).catch(() => { /* private mode or blocked: online only */ });
}

(async () => {
  const m = FIXED ? [null, FIXED] : location.pathname.match(/^\/g\/([^/]+)/);
  if (!m) return say('Guide not found', 'This address is not a guide.');
  const slug = decodeURIComponent(m[1]).toLowerCase();
  say('Loading your guide…', 'One moment.');
  let row;
  try { row = await fetchGuide(slug); if (row && row.preview) { /* a preview is never the copy kept for offline use */ } else if (row) saveCopy(slug, row); else dropCopy(slug); }
  catch (e) { row = loadCopy(slug); if (!row) return say('No connection', 'We could not reach the guide. Check your internet and reload the page.'); }
  if (!row) return say('This guide is being prepared', 'Its host is still setting it up. Please check back soon.');

  const c = row.content, th = row.theme || {};
  const base = c.assetBase || '';
  const site = withAssets(c.site, base), files = withAssets(c.files || {}, base);
  window.__GUIDE__ = { site, files, private: c.private || {}, i18n: c.i18n || {} };
  window.__VENDOR_BASE = import.meta.env.BASE_URL + 'vendor/maplibre/';

  document.title = site.name;
  const setMeta = (sel, v) => { const e = document.querySelector(sel); if (e) e.setAttribute('content', v); };
  setMeta('meta[name="theme-color"]', (site.theme && site.theme.paper) || '#FFFFFF');
  setMeta('meta[name="apple-mobile-web-app-title"]', site.name);
  const logo = document.getElementById('viewerLogo'); if (logo) logo.src = base + (c.site.logo || 'logo-head.png');
  const ic = document.querySelector('link[rel="icon"]'); if (ic && c.favicon !== false) ic.href = base + 'favicon.png';

  // Fonts come from the CDN (the viewer does not bundle every font): the look's own, then this guide's; then the look's
  // styles, then this guide's own theme.
  const preset = th.preset || (site.theme || {}).preset;
  for (const f of new Set([...(LOOKS.fonts[preset] || []), ...(th.fonts || (site.theme || {}).fonts || [])])) {
    const [fam, file] = f.replace(/^@fontsource\//, '').split('/');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://cdn.jsdelivr.net/npm/@fontsource/${fam}@5/${file}`; document.head.appendChild(l);
  }
  if (PRESET_CSS[preset]) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = PRESET_CSS[preset]; document.head.appendChild(l); }
  if (th.css) { const s = document.createElement('style'); s.id = 'guideTheme'; s.textContent = th.css; document.head.appendChild(s); }

  V().innerHTML = '';
  await import('./main.js');
  // Only the host sees this: a small label floating at the bottom (the top edge holds the back and language buttons).
  // The page gets room at its end, so nothing stays under the label.
  if (row.preview || (row.status && row.status !== 'published')) {
    const b = document.createElement('div');
    b.textContent = row.preview === 'draft' ? 'Preview: your changes, not live yet' : row.preview === 'live' ? 'Preview: no changes waiting' : 'Draft: only you can see this';
    b.style.cssText = `position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:45;max-width:calc(100% - 32px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:600 13px/1 system-ui,sans-serif;padding:9px 14px;border-radius:999px;background:#F2B33D;color:#1b1407;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none`;
    document.body.appendChild(b); document.body.style.paddingBottom = `calc(${getComputedStyle(document.body).paddingBottom} + 48px)`;
  }
  goOffline(site, files, base, slug, (site.theme && site.theme.paper) || '#ffffff');
})();
