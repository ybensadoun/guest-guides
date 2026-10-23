// Service worker for guides opened at /g/<name>: the app, fonts and photos stay on the phone, so a guide opens without a connection.
// The guide's own data is kept by the page itself (see engine/src/viewer.js). Bump V to drop all old copies.
// The same worker serves a guide's own address (e.g. ca-la-kimberly.netlify.app/sw.js, scope /): the build sets SINGLE.
const SINGLE = false;
const V = 'v1', SHELL = 'g-shell-' + V, FILES = 'g-files-' + V, PAGE = SINGLE ? '/index.html' : '/g-app/viewer.html';
const ours = u => u.origin === location.origin && (SINGLE ? !u.pathname.endsWith('/sw.js') : u.pathname.startsWith('/g-app/'));
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then(c => c.add(PAGE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if ((!k.endsWith(V) && k.startsWith('g-')) || (SINGLE && k.startsWith('workbox-'))) await caches.delete(k);   // a guide's own address also drops the old static build's caches
  await self.clients.claim();
})()));

const KEEP_HOST = /(^|\.)(cdn\.jsdelivr\.net|supabase\.co)$/;
async function putOk(cache, req, res) { if (res && (res.ok || res.type === 'opaque')) { try { await cache.put(req, res.clone()); } catch (e) { /* quota */ } } return res; }

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' && u.origin === location.origin && (SINGLE || u.pathname.startsWith('/g/'))) {
    e.respondWith((async () => {
      try { const r = await fetch(req); if (r.ok) (await caches.open(SHELL)).put(PAGE, r.clone()); return r; }
      catch (err) { return (await caches.match(PAGE)) || Response.error(); }
    })());
    return;
  }
  const same = ours(u);
  const photo = KEEP_HOST.test(u.hostname) && (u.hostname.endsWith('jsdelivr.net') || u.pathname.includes('/storage/v1/object/public/guide-assets/'));
  if (same || photo) {
    e.respondWith((async () => {
      const cache = await caches.open(FILES), hit = await cache.match(req);
      if (hit) return hit;
      try { return await putOk(cache, req, await fetch(req)); } catch (err) { return hit || Response.error(); }
    })());
  }
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'keep') return;
  e.waitUntil((async () => {
    const cache = await caches.open(FILES);
    for (const url of e.data.urls || []) {
      let u; try { u = new URL(url); } catch (err) { continue; }
      const ok = ours(u) || (KEEP_HOST.test(u.hostname) && (u.hostname.endsWith('jsdelivr.net') || u.pathname.includes('/storage/v1/object/public/guide-assets/')));
      if (!ok || await cache.match(url)) continue;
      try { await putOk(cache, url, await fetch(url, { mode: u.origin === location.origin ? 'same-origin' : 'no-cors' })); } catch (err) { /* offline now */ }
    }
  })());
});
