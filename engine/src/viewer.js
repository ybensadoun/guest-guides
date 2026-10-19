// The shared guide viewer: opens /g/<name>, loads that guide from the database, then starts the normal guide app.
// Same app as a built guide; only the data source differs (see site-data.js).
import './styles/app.css';
import './styles/map.css';
import soft from './styles/presets/soft.css?url';
import editorial from './styles/presets/editorial.css?url';
import minimal from './styles/presets/minimal.css?url';

const DB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values
const PRESET_CSS = { soft, editorial, minimal };
const V = () => document.getElementById('view');

function say(title, text) {
  document.title = title;
  const v = V();
  if (v) v.innerHTML = `<div style="padding:40px 20px;max-width:520px;margin:0 auto;text-align:center"><h2 style="margin:0 0 10px">${title}</h2><p style="margin:0;opacity:.75;line-height:1.5">${text}</p></div>`;
}

async function fetchGuide(slug) {
  let tok = null;
  try { tok = (JSON.parse(localStorage.getItem('porta-auth-v1') || 'null') || {}).access_token; } catch (e) { /* storage blocked */ }
  if (tok) {   // the host looking at their own guide, drafts included
    try {
      const r = await fetch(`${DB.url}/rest/v1/guides?slug=eq.${encodeURIComponent(slug)}&select=content,theme,status`, { headers: { apikey: DB.key, Authorization: 'Bearer ' + tok } });
      if (r.ok) { const j = await r.json(); if (j[0] && j[0].content && j[0].content.site) return j[0]; }
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

(async () => {
  const m = location.pathname.match(/^\/g\/([^/]+)/);
  if (!m) return say('Guide not found', 'This address is not a guide.');
  const slug = decodeURIComponent(m[1]).toLowerCase();
  say('Loading your guide…', 'One moment.');
  let row;
  try { row = await fetchGuide(slug); }
  catch (e) { return say('No connection', 'We could not reach the guide. Check your internet and reload the page.'); }
  if (!row) return say('This guide is being prepared', 'Its host is still setting it up. Please check back soon.');

  const c = row.content, th = row.theme || {};
  const base = c.assetBase || '';
  const site = withAssets(c.site, base), files = withAssets(c.files || {}, base);
  window.__GUIDE__ = { site, files, private: c.private || {}, i18n: c.i18n || {} };
  window.__VENDOR_BASE = '/g-app/vendor/maplibre/';

  document.title = site.name;
  const setMeta = (sel, v) => { const e = document.querySelector(sel); if (e) e.setAttribute('content', v); };
  setMeta('meta[name="theme-color"]', (site.theme && site.theme.paper) || '#FFFFFF');
  setMeta('meta[name="apple-mobile-web-app-title"]', site.name);
  const logo = document.getElementById('viewerLogo'); if (logo) logo.src = base + (c.site.logo || 'logo-head.png');
  const ic = document.querySelector('link[rel="icon"]'); if (ic && c.favicon !== false) ic.href = base + 'favicon.png';

  // Fonts come from the CDN (the viewer does not bundle every font), then the layout preset, then this guide's own theme.
  for (const f of (th.fonts || (site.theme || {}).fonts || [])) {
    const [fam, file] = f.replace(/^@fontsource\//, '').split('/');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://cdn.jsdelivr.net/npm/@fontsource/${fam}@5/${file}`; document.head.appendChild(l);
  }
  const preset = th.preset || (site.theme || {}).preset;
  if (PRESET_CSS[preset]) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = PRESET_CSS[preset]; document.head.appendChild(l); }
  if (th.css) { const s = document.createElement('style'); s.id = 'guideTheme'; s.textContent = th.css; document.head.appendChild(s); }

  if (row.status && row.status !== 'published') {
    const b = document.createElement('div'); b.textContent = 'Draft: only you can see this';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:300;text-align:center;font:600 12px/1 system-ui,sans-serif;padding:6px;background:#F2B33D;color:#1b1407';
    document.body.appendChild(b);
  }
  V().innerHTML = '';
  await import('./main.js');
})();
