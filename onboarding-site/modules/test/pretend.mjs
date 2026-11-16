// The pretend database and the site served from disk, for the modules page's check (check.mjs) and its pictures
// (pictures.mjs): the real maker and the real viewer run on them, nothing is read from or written to the real database.
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url)), SITE = resolve(HERE, '../..'), SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });
export const ORIGIN = 'http://console.test', SB = 'https://dmoxszfwulolqkgxtxcp.supabase.co';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
export const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.com' };
export const samples = JSON.parse(readFileSync(resolve(HERE, '../samples/index.json'), 'utf8'));
if (!samples.length) { console.error('No fixtures: run samples/make.mjs, then build.mjs.'); process.exit(1); }

// The pretend database: what the page, the maker and the viewer ask of it.
export function world({ owner = true, empty = true } = {}) {
  const db = { owner, calls: [], switches: [], countries: [], feedback: [], nextId: 1,
    guides: samples.map((s, i) => { const fx = JSON.parse(readFileSync(resolve(HERE, `../samples/${s.slug}.json`), 'utf8'));
      return { id: `00000000-0000-4000-8000-00000000010${i}`, owner: USER.id, slug: s.slug, status: 'draft', origin: 'imported', answers: {}, content: empty && i === samples.length - 1 ? {} : fx.content, theme: fx.theme || {}, draft: null, finished_at: null }; }) };
  const shape = g => ({ ...g, name: ((g.content || {}).site || {}).name || null, saved: (g.draft || {}).savedAt || null, guideName: null, place: null });
  db.handle = route => {
    const req = route.request(), u = new URL(req.url()), m = req.method(), json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const body = () => { try { return JSON.parse(req.postData() || 'null'); } catch (e) { return null; } }, q = k => u.searchParams.get(k) || '';
    const p = u.pathname;
    if (p.startsWith('/auth/v1/settings')) return json({ external: {} });
    if (p.startsWith('/auth/v1/token')) return json({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: USER });
    if (p.startsWith('/auth/v1/')) return json(USER);
    if (p === '/rest/v1/rpc/is_owner') return json(db.owner);
    if (p === '/rest/v1/module_switches') {
      if (m === 'GET') return json(db.switches);
      if (m === 'POST') { const b = body(); db.calls.push(['switch', b]); db.switches = [...db.switches.filter(x => !(x.module === b.module && x.part === b.part && x.country === b.country)), b]; return json(null, 201); }
      if (m === 'DELETE') { db.calls.push(['switch-delete', u.search]); db.switches = db.switches.filter(x => !(u.search.includes('module=eq.' + x.module) && u.search.includes('part=eq.' + x.part) && u.search.includes('country=eq.' + x.country))); return json(null, 204); }
    }
    if (p === '/rest/v1/launch_countries') {
      if (m === 'GET') return json(db.countries);
      if (m === 'POST') { const b = body(); db.calls.push(['country', b.country, b.state]); db.countries = [...db.countries.filter(x => x.country !== b.country), b]; return json(null, 201); }
    }
    if (p === '/rest/v1/module_feedback') {
      if (m === 'GET') return json(db.feedback);
      if (m === 'POST') { const b = { id: db.nextId++, created_at: new Date().toISOString(), state: 'new', ...body() }; db.calls.push(['feedback', b]); db.feedback.unshift(b); return json([b], 201); }
      const f = db.feedback.find(x => 'eq.' + x.id === q('id'));
      if (m === 'PATCH' && f) { Object.assign(f, body()); db.calls.push(['feedback-state', f.state]); return json(null, 204); }
      if (m === 'DELETE') { db.feedback = db.feedback.filter(x => x !== f); db.calls.push(['feedback-delete']); return json(null, 204); }
    }
    if (p === '/rest/v1/guides') {
      const pick = g => (!q('id') || q('id') === 'eq.' + g.id) && (!q('slug') || q('slug') === 'eq.' + g.slug || (q('slug').startsWith('like.') && g.slug.startsWith(q('slug').slice(5).replace('*', ''))));
      if (m === 'GET') return json(db.guides.filter(pick).map(shape));
      if (m === 'PATCH') { const b = body(); for (const g of db.guides.filter(pick)) { Object.assign(g, b); db.calls.push(['guide', g.slug, Object.keys(b).sort().join(',')]); } return json(null, 204); }
      db.calls.push(['guide-' + m]); return json({ message: 'not here' }, 403);
    }
    if (p === '/rest/v1/guide_jobs') { if (m === 'POST') { db.calls.push(['job', (body() || {}).kind]); return json({ message: 'A sample house starts no paid search.' }, 400); } return json([]); }
    if (p.startsWith('/rest/v1/rpc/')) { db.calls.push(['rpc', p.split('/').pop()]); return json(null); }
    if (p.startsWith('/rest/v1/')) return json(m === 'GET' ? [] : null, m === 'GET' ? 200 : 201);
    return json({ message: 'not found' }, 404);   // storage and the rest
  };
  return db;
}
export function site(route) {
  const u = new URL(route.request().url());
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/.netlify/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
  let f = join(SITE, decodeURIComponent(u.pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (u.pathname.startsWith('/g/')) f = join(SITE, 'g-app/viewer.html');              // netlify.toml: the shared viewer
  else if (!existsSync(f)) { if (extname(f)) return route.fulfill({ status: 404, body: '' }); f = join(SITE, 'index.html'); }   // and the catch-all: the maker
  let body = readFileSync(f); if (f.endsWith('viewer.html')) body = String(body).replace(/__GOOGLE_MAPS_BROWSER_KEY__/g, '');
  return route.fulfill({ status: 200, contentType: TYPES[extname(f)] || 'application/octet-stream', body });
}
export async function open(browser, db, { width, height = 860, session = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.route(u => u.origin === ORIGIN, site);
  await ctx.route(u => u.origin === SB, db.handle);
  if (session) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, ['porta-auth-v1', JSON.stringify({ access_token: 'tok', refresh_token: 'ref', expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER })]);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  return { ctx, page, errors };
}
