// Link previews for /g/<slug>. WhatsApp, Facebook, Telegram and other link-preview robots read only the page header
// and never run its code, so the shared viewer's header would show a generic "Guest guide". For those robots only,
// this fills in the guide's own title, description and picture. Guests get the page untouched (no extra request).
const DB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values, as in the viewer
const BOTS = /bot\b|crawl|spider|facebookexternalhit|facebot|whatsapp|telegram|slack|discord|linkedin|twitter|skype|embedly|pinterest|vkshare|google|bing|preview/i;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async (req, context) => {
  if (!BOTS.test(req.headers.get('user-agent') || '')) return;          // a guest: carry on unchanged
  const m = new URL(req.url).pathname.match(/^\/g\/([^/]+)/);
  if (!m) return;
  const res = await context.next();
  try {
    const r = await fetch(`${DB.url}/rest/v1/rpc/get_published_guide`, { method: 'POST', headers: { apikey: DB.key, Authorization: 'Bearer ' + DB.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: decodeURIComponent(m[1]).toLowerCase() }) });
    const c = r.ok ? (await r.json())?.content : null;
    if (!c || !c.site) return res;
    const s = c.site, img = s.shareImage || s.logo || 'logo-head.png', image = /^https?:/.test(img) ? img : (c.assetBase || '') + img;
    const name = esc(s.name), desc = esc(s.shareDescription || s.description || '');
    let html = await res.text();
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(s.description || '')}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${name}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`)
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(req.url.split('?')[0])}">`);
    const headers = new Headers(res.headers); headers.delete('content-length');
    return new Response(html, { status: res.status, headers });
  } catch (e) { return res; }
};

export const config = { path: '/g/*' };
