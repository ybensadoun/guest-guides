#!/usr/bin/env node
// The builder and the editor as a host sees them, without signing in and without writing anything: the built page
// (onboarding-site/index.html) opens with a fake session, and every database call is answered here from guides read once
// at the start (Wi-Fi left out, nothing kept on disk). Checks the rules that matter and takes screenshots into
// onboarding-site/test/shots/ (git-ignored).
//   node onboarding-site/test/check.mjs [editor slug] [builder slug]    defaults ca-la-kimberly, home-in-tordera
// The builder is shown as a host just after their listing was read: the builder slug's answers, with what only the host
// knows (Wi-Fi, rubbish, phone, arrival) and every Done and seen step taken out. Build the page first (src: python3 build.py).
// Needs SUPABASE_SERVICE_KEY (worker/.env.local or the environment) and Playwright (npm i --no-save playwright).
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../..'), SHOTS = join(HERE, 'shots');
const env = { ...process.env }, ef = join(ROOT, 'worker/.env.local');
if (existsSync(ef)) for (const l of readFileSync(ef, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
if (!env.SUPABASE_SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_KEY (worker/.env.local).'); process.exit(1); }
const { chromium } = createRequire(join(ROOT, 'package.json'))('playwright');
const SB = 'https://dmoxszfwulolqkgxtxcp.supabase.co', HTML = readFileSync(join(ROOT, 'onboarding-site/index.html'), 'utf8');
const row = async slug => (await (await fetch(`${SB}/rest/v1/guides?select=id,owner,answers,status,slug,origin,content,theme,draft&slug=eq.${encodeURIComponent(slug)}`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } })).json())[0];
const E = await row(process.argv[2] || 'ca-la-kimberly'), B0 = await row(process.argv[3] || 'home-in-tordera');
if (!E || !B0) { console.error('Guide not found.'); process.exit(1); }
E.draft = null; if (E.content.private) E.content.private = {};
// The builder's host: listing read, nothing else answered, done or seen yet.
const a = { ...B0.answers, _done: { listing: true }, _seen: [], _savedAt: Date.now(), _acct: B0.owner };
for (const k of ['_sentAt', '_last', 'wifiName', 'wifiPassword', 'wifiNote', 'rubbishMode', 'hostPhone', 'arrival', 'swipes', 'favDo', 'favourites']) delete a[k];
const B = { id: B0.id, owner: B0.owner, answers: a, status: 'draft', slug: B0.slug, origin: null, content: null, theme: null, draft: null };
const N = { id: B0.id, owner: B0.owner, answers: { _savedAt: Date.now(), _acct: B0.owner }, status: 'draft', slug: null, origin: null, content: null, theme: null, draft: null };
const photos = (B0.answers._remote || []).map(u => u.src).filter(Boolean).slice(0, 12), A0 = B0.answers;
const PAGE = { ok: true, stage: 'page', site: 'airbnb', source: 'page', title: 'Home in ' + (A0.town || 'town'), pageTitle: (A0.placeName || 'Test house') + ' - Houses for Rent - Airbnb', cover: photos[0], photos, photoRooms: photos.map(() => null), photoCaps: photos.map(() => ''), rating: { avg: 4.9, count: 31 }, lat: A0.lat, lng: A0.lng, src: { text: 'listing text', title: 'x', photos } };
const WRITE = { ok: true, source: 'page', site: 'airbnb', draft: { placeName: A0.placeName, town: A0.town, region: A0.region, propertyType: A0.propertyType, bedrooms: A0.bedrooms, checkIn: A0.checkIn || '16:00', checkOut: A0.checkOut || '11:00', houseRules: A0.houseRules, amenities: A0.amenities, tagline: A0.tagline, welcome: A0.welcome, toConfirm: ['Your Wi-Fi'] }, amenityItems: [{ c: '7', t: 'Piscina descubierta privada' }, { c: '33', t: 'Lavadora' }, { c: 'sv12', t: 'Vistas a la montaña' }, { c: '', t: 'Trampolín' }], photos, cover: photos[0], lat: A0.lat, lng: A0.lng, report: { assistant: 'ok' } };
const listing = (route, body) => setTimeout(() => json(route, body.stage === 'page' ? PAGE : WRITE), body.stage === 'page' ? 400 : 1500);
// A Spanish listing whose writer said no to every section (seen 4 Nov 2026): the sections stay on, the rooms get their English names.
const capsEs = photos.map((x, i) => i < 2 ? 'Salón' : i < 4 ? 'Dormitorio 1' : '');
const PAGE_ES = { ...PAGE, photoCaps: capsEs }, WRITE_ES = { ...WRITE, photoCaps: capsEs, draft: { ...WRITE.draft, roomNames: { 'Salón': 'Living room', 'Dormitorio 1': 'Bedroom 1' }, sections: { wifi: false, rubbish: false, markets: false, eat: false, todo: false, events: false } } };
const listingEs = (route, body) => setTimeout(() => json(route, body.stage === 'page' ? PAGE_ES : WRITE_ES), body.stage === 'page' ? 400 : 1500);
// What this device keeps of the answers (porta-onboarding-v1), as Google's terms are checked against it.
const stored = p => p.evaluate(() => { try { return (JSON.parse(localStorage.getItem('porta-onboarding-v1') || '{}') || {}).A || {}; } catch (e) { return {}; } });
const inPhone = (p, fn) => p.evaluate(fn => { const d = document.getElementById('phoneFrame') && document.getElementById('phoneFrame').contentDocument; return d ? new Function('d', 'return (' + fn + ')(d)')(d) : null; }, fn.toString());
mkdirSync(SHOTS, { recursive: true });
// CHECK_LIVE=1: each result is printed as it comes, to see where a run is stuck.
const results = [], ok = (name, pass, more = '') => { const l = `${pass ? 'PASS' : 'FAIL'}  ${name}${more ? '  (' + more + ')' : ''}`; results.push(l); if (env.CHECK_LIVE) console.error(l); };
// A 4x4 picture in four colours (blue, red, yellow, green), for the colour checks.
const PNG4 = (() => { const W = 4, rows = [], C = [[29, 79, 160], [213, 43, 30], [245, 196, 0], [14, 124, 70]];
  for (let y = 0; y < W; y++) { rows.push(0); for (let x = 0; x < W; x++) rows.push(...C[(x >> 1) + 2 * (y >> 1)]); }
  const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let r = -1; for (const x of b) r = T[(r ^ x) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0))]); })();
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
// The database on a web address: what slug_check answers (the real function is checked against real rows, not here).
const slugAnswer = (route, b, taken) => { const free = !taken.has(b.p_wanted); return json(route, { free, options: free ? [] : [b.p_town ? `${b.p_wanted}-${b.p_town}` : `${b.p_wanted}-2`, `${b.p_wanted}-3`, `${b.p_wanted}-4`] }); };
const slugOf = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function open(browser, G, w, h, stored = {}, listing = null) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); ctx.taken = new Set();
  await ctx.addInitScript(([g, stored]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('porta-auth-v1', JSON.stringify({ access_token: 'test', refresh_token: 'test', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: g.owner, email: 'test@example.org' } }));
    for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v);
  }, [G, stored]);
  await ctx.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.host === 'editor.test' && u.pathname === '/api/listing' && listing) return listing(route, JSON.parse(req.postData() || '{}'));
    if (u.host === 'editor.test' && u.pathname.startsWith('/g/')) { ctx.viewer = (ctx.viewer || 0) + 1; return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body style="margin:0;font:18px sans-serif"><div id="view" style="padding:24px">The guide itself</div><div style="height:3000px"></div>' }); }
    if (u.host === 'editor.test' && req.method() === 'POST' && u.pathname === '/' && ctx.formsDown) return route.fulfill({ status: 500, body: '' });
    if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
    if (u.origin !== SB) return route.continue();   // fonts, public pictures
    if (u.pathname.startsWith('/auth/v1/user')) return json(route, { id: G.owner, email: 'test@example.org' });
    if (u.pathname === '/rest/v1/rpc/slug_check') return slugAnswer(route, JSON.parse(req.postData() || '{}'), ctx.taken);
    if (u.pathname.startsWith('/rest/v1/guides') && req.method() === 'GET')
      return json(route, /select=id(%2C|,)slug/.test(u.search) ? [{ id: G.id, slug: G.slug, status: G.status, origin: G.origin, name: G.content && G.content.site.name }] : [G]);
    return json(route, u.pathname.startsWith('/auth/') ? {} : []);   // saving, jobs: accepted, kept nowhere
  });
  const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  return { ctx, p, errors };
}
const ready = p => p.waitForSelector('.mhead h1', { timeout: 15000 }).catch(() => {});
const go = async (p, hash) => { await p.evaluate(x => { location.hash = x; }, hash); await p.waitForTimeout(250); };
// Text in a step header that its shape (.mhead::before) covers.
const underShape = p => p.evaluate(() => {
  const head = document.querySelector('.mhead'); if (!head) return [];
  const s = getComputedStyle(head, '::before'), hb = head.getBoundingClientRect(), w = parseFloat(s.width), h = parseFloat(s.height);
  const x1 = hb.right - parseFloat(s.right) - w, y1 = s.top !== 'auto' ? hb.top + parseFloat(s.top) : hb.bottom - parseFloat(s.bottom) - h;
  return [...head.querySelectorAll('h1, p, .pill')].filter(el => { const rg = document.createRange(); rg.selectNodeContents(el);
    return [...rg.getClientRects()].some(c => c.left < x1 + w - 1 && c.right > x1 + 1 && c.top < y1 + h - 1 && c.bottom > y1 + 1); }).map(el => el.tagName);
});
const barOverlaps = p => p.$$eval('#navbar .nbin > *', els => { const b = els.map(e => e.getBoundingClientRect()).filter(r => r.width > 0).map(r => [r.left, r.right]);
  return b.some((x, i) => b.slice(i + 1).some(y => x[1] > y[0] && y[1] > x[0])); });
const barText = p => p.$eval('#navbar', el => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
const everyPage = async (p, tag) => { const pages = [...new Set(await p.$$eval('.rail a.si', as => as.map(x => x.getAttribute('href'))))], bad = [];
  for (const h of pages) { await go(p, h); const c = await underShape(p); if (c.length) bad.push(`${h}: header ${c.join(', ')}`); if (await barOverlaps(p)) bad.push(`${h}: bottom bar`); }
  ok(`${tag}: nothing overlaps on any of the ${pages.length} pages`, !bad.length, bad.join('; ')); };

const browser = await chromium.launch();
// Every sentence the maker shows that its translation table (src/i18n/ui.json) does not have: shots/i18n-missing.json.
const MISSING = new Map();
{ const nc = browser.newContext.bind(browser);
  browser.newContext = async (...x) => { const c = await nc(...x); await c.exposeBinding('__i18nReport', (_, s, where) => { if (!MISSING.has(s)) MISSING.set(s, where); });
    if (env.CHECK_LANG) await c.addInitScript(l => { try { localStorage.setItem('porta-lang-v1', l); } catch (e) {} }, env.CHECK_LANG);   // CHECK_LANG=fr: the maker in French (texts the checks look for stay English, so some fail)
    return c; }; }
try {
  // ---- Signed out: the first page, in the guides' look, with Google when it is switched on ----
  const signedOut = async (w, h, googleOn) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }), seen = [];
    await ctx.route('**/*', route => { const u = new URL(route.request().url());
      if (u.host === 'editor.test') return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname === '/auth/v1/settings') return json(route, { external: { google: googleOn, email: true } });
      if (u.origin === SB && u.pathname === '/auth/v1/authorize') { seen.push(u.toString()); return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' }); }
      if (u.origin === SB) return json(route, []);
      return route.continue(); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://editor.test/'); await p.waitForSelector('#acct .ac-card', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(400);
    return { ctx, p, errors, seen };
  };
  const tileClash = p => p.$$eval('#acct .ex-tile', els => els.flatMap(el => { const s = getComputedStyle(el, '::before'), b = el.getBoundingClientRect();
    const w = parseFloat(s.width) + parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth), h = parseFloat(s.height) + parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);
    const x2 = b.right - parseFloat(s.right), x1 = x2 - w, y1 = b.top + parseFloat(s.top), y2 = y1 + h;
    const boxes = t => { if (t.matches('svg, .ex-ar, .ex-pill')) return [t.getBoundingClientRect()]; const g = document.createRange(); g.selectNodeContents(t); return [...g.getClientRects()]; };   // text: the words, not the line
    return [...el.querySelectorAll('b, small, .ex-ic svg, .ex-ar, .ex-tag, .ex-pill')].filter(t => boxes(t).some(r => r.left < x2 - 1 && r.right > x1 + 1 && r.top < y2 - 1 && r.bottom > y1 + 1)).map(t => el.querySelector('b').textContent + ': ' + t.tagName); }));
  for (const [w, h, tag] of [[360, 780, '360 px'], [1280, 860, 'desktop']]) {
    const { ctx, p, errors } = await signedOut(w, h, false);
    ok(`signed out, ${tag}: the page in the guides' look, asking for the listing link, not an account`, !!(await p.$('#acct .ac-hero')) && !!(await p.$('#acct #acUrl')) && !(await p.$('#acct #acEmail')) && !!(await p.$('#acct [data-m="login"]')));
    ok(`signed out, ${tag}: no Google button while Google is off`, !(await p.$('#acGoogle')));
    ok(`signed out, ${tag}: no sideways scroll`, (await p.evaluate(() => document.getElementById('acct').scrollWidth - window.innerWidth)) <= 0);
    const clash = await tileClash(p); ok(`signed out, ${tag}: no tile text under its corner shape`, !clash.length, clash.join('; '));
    const ex = await p.evaluate(() => { const x = document.querySelector('#acct .ac-ex'); return { tiles: x.querySelectorAll('.ex-tile').length, cards: x.querySelectorAll('.ex-card').length, items: x.querySelectorAll('.ex-on .ex-it').length, text: x.innerText.replace(/\s+/g, ' '),
      wide: [...x.querySelectorAll('b, small, .ex-tx > span, .ex-when, .ex-pill')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline').length }; });
    ok(`signed out, ${tag}: the example is Ca La Kimberly's home (tiles, cards, what's on) with today's lines`, ex.tiles === 6 && ex.cards === 4 && ex.items === 6 && /\d+ today/.test(ex.text) && /Tonight/i.test(ex.text) && /(Open|Closed)/.test(ex.text) && !/next train/i.test(ex.text), `${ex.tiles} tiles, ${ex.cards} cards, ${ex.items} items`);
    ok(`signed out, ${tag}: no word wider than its box in the example`, !ex.wide, ex.wide + ' too wide');
    ok(`signed out, ${tag}: no page errors`, !errors.length, errors.join(' | '));
    await p.screenshot({ path: join(SHOTS, `signed-out-${tag.replace(' ', '')}.png`), fullPage: false });
    await ctx.close();
  }
  { const { ctx, p, errors, seen } = await signedOut(360, 780, true);
    ok('signed out: the first page has no Google button (no account asked yet)', !(await p.$('#acGoogle')));
    await p.click('#acct [data-m="login"]'); await p.waitForTimeout(200);
    ok('signed out: with Google on, Log in offers "Continue with Google"', !!(await p.$('#acGoogle')));
    await p.screenshot({ path: join(SHOTS, 'signed-out-google-360.png') });
    await p.click('#acGoogle'); await p.waitForTimeout(800);
    const to = seen[0] ? new URL(seen[0]) : null;
    ok('signed out: Google button goes to Supabase Google sign-in and back to this site', !!to && to.searchParams.get('provider') === 'google' && to.searchParams.get('redirect_to') === 'http://editor.test/', seen[0] || 'no call');
    ok('signed out with Google: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- No account until the end (docs/plan-fast-builder.md, step 7): the link, the wow and the steps on this device, then the account ----
  const JOB_ID = '00000000-0000-0000-0000-00000000f011', AREA_ID = '00000000-0000-0000-0000-0000000a4ea1', AREA_MARKETS = JSON.parse(readFileSync(join(ROOT, 'worker/examples/markets.json'), 'utf8')), AREA_TODO = JSON.parse(readFileSync(join(ROOT, 'worker/examples/todo.json'), 'utf8'));
  // The sheet puts the cursor in the email box just after it opens: type once it has, or the password lands there.
  const signUp = async p => { await p.waitForFunction(() => (document.activeElement || {}).id === 'acEmail'); await p.fill('#acEmail', 'visitor@example.org'); await p.fill('#acPw', 'a-good-password'); await p.click('#acct .go'); };
  const visitor = async (w, h, existing, taken = []) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }), rows = {}, calls = [], uid = '00000000-0000-0000-0000-0000000070aa'; ctx.taken = new Set(taken);
    if (existing) rows[existing.id] = { ...existing, owner: uid };
    await ctx.route('**/*', route => { const req = route.request(), u = new URL(req.url());
      if (u.host === 'editor.test' && u.pathname === '/api/listing') return listing(route, JSON.parse(req.postData() || '{}'));
      if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin !== SB) return route.continue();
      if (u.pathname === '/auth/v1/settings') return json(route, { external: { google: true, email: true } });
      if (u.pathname === '/auth/v1/signup' || u.pathname === '/auth/v1/token') { calls.push(u.pathname.split('/').pop()); return json(route, { access_token: 'tk', refresh_token: 'rt', expires_in: 3600, user: { id: uid, email: 'visitor@example.org' } }); }
      if (u.pathname.startsWith('/auth/v1/user')) return json(route, { id: uid, email: 'visitor@example.org' });
      // the research from the link (step 8): started for the listing's point, found at once here
      if (u.pathname === '/rest/v1/rpc/start_area_research') { calls.push('research ' + JSON.parse(req.postData() || '{}').p_lat); return json(route, { ok: true, id: AREA_ID, status: 'queued' }); }
      if (u.pathname === '/rest/v1/rpc/area_research_status') return json(route, { status: 'done', result: { markets: AREA_MARKETS, todo: AREA_TODO } });
      if (u.pathname === '/rest/v1/rpc/slug_check') return slugAnswer(route, JSON.parse(req.postData() || '{}'), ctx.taken);
      if (u.pathname.startsWith('/rest/v1/guide_jobs')) { if (req.method() === 'POST') { const b = JSON.parse(req.postData() || '{}'); calls.push('job ' + b.kind + ' ' + ((b.params || {}).lat || '')); return json(route, [{ id: JOB_ID, status: 'queued' }]); } return json(route, [{ status: 'running' }]); }
      if (u.pathname.startsWith('/rest/v1/guides')) {
        const id = (u.search.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
        if (req.method() === 'POST') { const b = JSON.parse(req.postData() || '{}'), r = { id: '00000000-0000-0000-0000-00000000710' + Object.keys(rows).length, owner: uid, answers: b.answers || {}, status: 'draft', slug: null, origin: null, content: null, theme: null, draft: null }; rows[r.id] = r; calls.push('new house'); return json(route, [r]); }
        if (req.method() === 'PATCH') { const b = JSON.parse(req.postData() || '{}'); if (b.slug && ctx.taken.has(b.slug)) return route.fulfill({ status: 409, contentType: 'application/json', body: '{"message":"duplicate key"}' }); if (rows[id]) Object.assign(rows[id], b); return json(route, rows[id] ? [rows[id]] : []); }
        if (/select=id(%2C|,)slug/.test(u.search)) return json(route, Object.values(rows).map(r => ({ id: r.id, slug: r.slug, status: r.status })));
        return json(route, rows[id] ? [rows[id]] : []);
      }
      return json(route, u.pathname.startsWith('/auth/') ? {} : []); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://editor.test/'); await p.waitForSelector('#acUrl', { timeout: 15000 }).catch(() => {});
    await p.fill('#acUrl', 'https://www.airbnb.com/rooms/12345678'); await p.click('#acct .go');
    await p.waitForFunction(() => /Your guide is written/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    return { ctx, p, errors, rows, calls };
  };
  { const { ctx, p, errors, rows, calls } = await visitor(360, 780);
    ok('research from the link: it starts once the listing is read, for the listing\'s point, with no account', calls.includes('research ' + A0.lat), calls.join(', '));
    await inPhone(p, d => { const b = d.querySelector('[data-pv="todo"]'); b && b.click(); return 1; }); await p.waitForTimeout(500);
    const td = AREA_TODO.items[0].name.en;
    ok('research from the link: a place the host has not chosen stays out of the phone', !((await inPhone(p, d => d.body.textContent)) || '').includes(td), td);
    ok('no account yet: the link opens the wow at once, the first page is gone, the top bar offers Log in', (await p.evaluate(() => location.hash)) === '#yours' && !(await p.$('#acct')) && !!(await p.$('.loginTop')) && !(await p.$('.logoutTop')));
    await go(p, '#known'); await p.fill('[data-k="wifiName"]', 'Visitor wifi'); await p.waitForTimeout(400);
    ok('no account yet: the steps work, answers saved on this device', /on this device/i.test(await p.textContent('#saveState').catch(() => '')) && !calls.some(c => !c.startsWith('research')), (await p.textContent('#saveState').catch(() => '')).trim());
    await go(p, '#send');
    ok('no account yet: Review and send offers "Save my guide", not Send', !!(await p.$('[data-acctnow="signup"]')) && !(await p.$('#send')));
    await p.click('[data-acctnow="signup"]'); await p.waitForSelector('#acct.only #acEmail', { timeout: 3000 }).catch(() => {});
    ok('Save my guide: the account card alone, over the builder, with Google', /Save your guide/.test(await p.textContent('#acct.only .ac-card h2').catch(() => '')) && !!(await p.$('#acct.only #acGoogle')) && !(await p.$('#acct.only .ac-hero')));
    await p.screenshot({ path: join(SHOTS, 'save-sheet-360.png') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok('Save my guide: Escape closes it, nothing lost', !(await p.$('#acct')) && (await p.evaluate(() => location.hash)) === '#send');
    await p.click('[data-acctnow="signup"]'); await signUp(p);
    await p.waitForLoadState('load'); await p.waitForTimeout(4500);
    const h = Object.values(rows)[0] || { answers: {} };
    ok('after the account: the answers from this device are the account\'s house, back on Review and send, with Send', Object.keys(rows).length === 1 && h.answers.wifiName === 'Visitor wifi' && h.answers._research === AREA_ID && h.answers.listingUrl === 'https://www.airbnb.com/rooms/12345678' && (await p.evaluate(() => location.hash)) === '#send' && !!(await p.$('#send')) && !!(await p.$('.logoutTop')), calls.join(', '));
    ok('after the account: the full research of the area starts in the background, for the house\'s point, and travels with the answers', calls.includes('job research ' + A0.lat) && h.answers._researchJob === JOB_ID, calls.join(', '));
    ok('no account until the end: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- Cards after sign-up (Yohann, 30 Oct 2026): what the research found goes in the guide only if the host keeps it ----
  { const items = AREA_TODO.items, en = i => items[i].name.en, added = en(items.length - 1), G = { ...B, answers: { ...B.answers, _researchJob: JOB_ID, swipes: {}, favDo: [{ p: added, c: '' }] } };
    const { ctx, p, errors } = await open(browser, G, 360, 780); let job = { status: 'running', result: null };
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), r => json(r, [job]));
    await ctx.route('**/api/places**', r => json(r, new URL(r.request().url()).searchParams.get('probe') ? { ok: true, enabled: true } : { ok: true, lat: A0.lat, lng: A0.lng, places: [{ id: 'g-twin', name: en(0), rating: 4.6, reviews: 90, type: 'Castle', maps: 'https://maps.google.com/?q=1', lat: A0.lat, lng: A0.lng, km: 3, photo: null }, { id: 'g-other', name: 'Otro Lugar Test', rating: 4.5, reviews: 80, type: 'Park', maps: 'https://maps.google.com/?q=2', lat: A0.lat, lng: A0.lng, km: 4, photo: null }] }));
    await p.goto('http://editor.test/#send'); await ready(p);
    await p.waitForFunction(() => /looking for more places/.test((document.getElementById('rvMore') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    ok('cards after sign-up: while the research runs, Review says so and Send stays open', /looking for more places/.test(await p.textContent('#rvMore')) && !!(await p.$('#send')));
    job = { status: 'running', result: { todo: AREA_TODO } };
    await p.waitForFunction(() => /more places to look at/.test((document.getElementById('rvMore') || {}).textContent || ''), null, { timeout: 9000 }).catch(() => {});
    const more = n => `${n} more places to look at`;
    ok('cards after sign-up: as soon as things to do are found, before the rest of the research, Review counts them, without a place the host already added', (await p.textContent('#rvMore')).includes(more(items.length - 1)), await p.textContent('#rvMore'));
    await p.screenshot({ path: join(SHOTS, 'cards-review-360.png') });
    await p.click('#rvMore a'); await p.waitForSelector('.sw-card', { timeout: 5000 }).catch(() => {});
    ok('cards after sign-up: the deck opens with the researched places', (await p.textContent('.sw-card h3').catch(() => '')) === en(0), await p.textContent('.sw-card h3').catch(() => ''));
    ok('cards after sign-up: a card without a Google rating shows no empty star', !/★ \?/.test(await p.textContent('.sw-card')));
    ok('cards after sign-up: "Google Maps" is written on a card with no rating', await p.isVisible('.sw-card .sw-on a:has-text("Google Maps")'));
    await p.screenshot({ path: join(SHOTS, 'cards-deck-360.png') });
    await p.click('[data-sw="yes"]'); await p.waitForTimeout(450);
    await p.click('[data-sw="no"]'); await p.waitForTimeout(450);
    const names = [], left = items.length - 3;
    while (names.length < left) { names.push(await p.textContent('.sw-card h3')); await p.click('[data-sw="no"]'); await p.waitForTimeout(450); }
    ok('cards after sign-up: the Google card the research also found shows once, the others follow', (await p.textContent('.sw-card h3').catch(() => '')) === 'Otro Lugar Test' && !names.includes(en(0)) && !names.includes(added), names.join(', '));
    const S = await p.evaluate(() => JSON.parse(Object.values(localStorage).find(x => /"swipes"/.test(x)) || '{}').swipes || null).catch(() => null);
    await inPhone(p, d => { const b = d.querySelector('[data-pv="todo"]'); b && b.click(); return 1; }); await p.waitForTimeout(500);
    const phone = (await inPhone(p, d => d.body.textContent)) || '';
    ok('cards after sign-up: what the host keeps lands in the phone, what they skip does not', phone.includes(en(0)) && !phone.includes(en(1)), en(0));
    ok('cards after sign-up: no "Host\u2019s pick" label in the phone', !/Host.s pick/.test(phone));
    await go(p, '#send'); await p.waitForTimeout(300);
    ok('cards after sign-up: all seen, Review says nothing more', !(await p.textContent('#rvMore')).trim(), await p.textContent('#rvMore'));
    ok('cards after sign-up: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const G = { ...B, status: 'generating', slug: 'test-cards', answers: { ...B.answers, slug: 'test-cards' } };
    const { ctx, p, errors } = await open(browser, G, 360, 780);
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), r => json(r, [{ result: { items: [{ id: 'a' }, { id: 'b' }] } }]));
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guides') && /select=status/.test(u.search), r => json(r, [{ status: 'published', slug: 'test-cards', message: null }]));
    await p.goto('http://editor.test/#building'); await p.waitForFunction(() => /We found 2 more places/.test((document.getElementById('bstate') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    ok('cards after sign-up: the finished screen says how many wait, and links to them', /We found 2 more places/.test(await p.textContent('#bstate')) && (await p.getAttribute('#bstate a.btn', 'href').catch(() => '')) === '/?step=todo');
    await p.screenshot({ path: join(SHOTS, 'cards-finished-360.png') });
    ok('cards after sign-up, finished screen: no sideways scroll, no page errors', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- Send: the guide is built from the account, so the copy to Netlify Forms can never stop it ----
  for (const [tag, down] of [['with a picture already in the account', false], ['with Netlify Forms failing', true]]) {
    const G = { ...B, slug: 'test-send', answers: { ...B.answers, slug: 'test-send', consent: true, _savedAt: Date.now(), _uploads: [{ kind: 'cover', path: B.id + '/host/abc.jpg', room: '', name: 'cover.jpg' }] } };
    const { ctx, p, errors } = await open(browser, G, 1280, 860); ctx.formsDown = down;
    let queued = 0; p.on('request', r => { if (r.method() === 'PATCH' && /"status":"queued"/.test(r.postData() || '')) queued++; });
    await p.goto('http://editor.test/#send'); await p.waitForSelector('#send', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(900);
    await p.click('#send'); await p.waitForTimeout(1500);
    ok(`Send ${tag}: the guide starts building`, queued === 1 && (await p.evaluate(() => location.hash)) === '#building', await p.textContent('#sendState').catch(() => ''));
    ok(`Send ${tag}: no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }
  // ---- The web address: is it free? A name that is taken moves by itself; an address the host typed stays theirs to change ----
  { const name = slugOf(A0.placeName), moved = `${name}-${slugOf(A0.town)}`, note = () => p.textContent('#slugNote').catch(() => '');
    const { ctx, p, errors, rows } = await visitor(360, 780, null, [name, 'casa-cogida']);
    await go(p, '#send'); await p.waitForTimeout(700);
    ok('web address: a taken name moves to a free one by itself, no error, and says why', (await p.inputValue('#f_slug')) === moved && (await note()).includes(`${name} was taken, so we chose this one`) && !(await p.$('.slugopt')), await p.inputValue('#f_slug').catch(() => ''));
    ok('web address: it shows where guests really open it, with /g/', (await note()).includes(`editor.test/g/${moved}`), await note());
    await p.fill('#f_slug', 'casa-cogida'); ok('web address: "Checking" while the database answers', /Checking/.test(await note()), await note());
    await p.waitForTimeout(700);
    const opts = await p.$$eval('.slugopt', els => els.map(e => e.textContent));
    ok('web address: a typed address that is taken says so, with three free ones to tap', /Already taken/.test(await note()) && opts.length === 3 && opts[0] === `casa-cogida-${slugOf(A0.town)}`, opts.join(', '));
    ok('web address: Review and send waits for a free address', /A free web address/.test(await p.textContent('.foot .todo').catch(() => '')));
    const wide = await p.evaluate(() => [...document.querySelectorAll('.slugopt, #slugNote p, .slugbox')].filter(e => e.getBoundingClientRect().right > innerWidth).length + Math.max(0, document.documentElement.scrollWidth - innerWidth));
    ok('web address, 360 px: the suggestions fit, no sideways scroll', !wide, wide + ' too wide');
    await p.locator('#slugNote').scrollIntoViewIfNeeded(); await p.screenshot({ path: join(SHOTS, 'slug-taken-360.png') });
    await p.fill('#f_slug', 'casa-cogida-'); await p.waitForTimeout(100);
    ok('web address: a dash at the end still says so, no question to the database', /Cannot end with a dash/.test(await note()));
    await p.fill('#f_slug', 'casa-cogida'); await p.waitForTimeout(700); await p.click('.slugopt >> nth=1'); await p.waitForTimeout(150);
    ok('web address: tapping a suggestion uses it', (await p.inputValue('#f_slug')) === 'casa-cogida-3' && (await note()).includes('editor.test/g/casa-cogida-3') && !/A free web address/.test(await p.textContent('.foot .todo').catch(() => '')), await note());
    await go(p, '#guide'); await p.waitForTimeout(100);
    ok('web address: the same field in Name and languages', (await p.inputValue('#f_slug').catch(() => '')) === 'casa-cogida-3');
    await go(p, '#send'); await p.click('[data-acctnow="signup"]'); await signUp(p);
    await p.waitForLoadState('load'); await p.waitForTimeout(3000);
    const h = Object.values(rows)[0] || {};
    ok('web address: it goes to the account with the guide', h.slug === 'casa-cogida-3', h.slug);
    await p.fill('#f_slug', 'casa-cogida'); await p.waitForTimeout(700);
    const refused = await p.evaluate(() => window.__acctQueueBuild().then(() => 'queued', e => e.message));
    ok('web address: Publish refuses a taken one and says where to fix it; the guide keeps its address', /Choose one of the free ones above/.test(refused) && h.status === 'draft' && h.slug === 'casa-cogida-3', refused);
    await p.click('.slugopt >> nth=0'); await p.waitForTimeout(150);
    const sent = await p.evaluate(() => window.__acctQueueBuild().then(() => 'queued', e => e.message));
    ok('web address: with a free one, Publish goes on', sent === 'queued' && h.status === 'queued' && h.slug === `casa-cogida-${slugOf(A0.town)}`, `${sent}, ${h.slug}`);
    ok('web address: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p, errors, rows } = await visitor(360, 780);   // someone takes it between the check and the account
    await go(p, '#send'); await p.waitForTimeout(700);
    const first = await p.inputValue('#f_slug'); ctx.taken.add(first);
    await p.click('[data-acctnow="signup"]'); await signUp(p);
    await p.waitForLoadState('load'); await p.waitForTimeout(5000);
    const h = Object.values(rows)[0] || {};
    ok('web address: taken a moment before the account, it still moves by itself', h.slug === `${first}-${slugOf(A0.town)}`, `${first} -> ${h.slug}`);
    ok('web address, the moment before: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const existing = { id: '00000000-0000-0000-0000-0000000072ee', answers: { placeName: 'My published house', _savedAt: 1 }, status: 'published', slug: 'my-house', origin: null, content: null, theme: null, draft: null };
    const { ctx, p, errors, rows } = await visitor(1280, 860, existing);
    await p.click('.loginTop'); await p.waitForSelector('#acct.only #acEmail', { timeout: 3000 }).catch(() => {});
    await p.fill('#acEmail', 'visitor@example.org'); await p.fill('#acPw', 'whatever'); await p.click('#acct .go');
    await p.waitForLoadState('load'); await p.waitForTimeout(2500);
    ok('Log in after building without an account: a new house with those answers, the account\'s own house untouched', Object.keys(rows).length === 2 && rows[existing.id].answers.placeName === 'My published house' && Object.values(rows).some(r => r.id !== existing.id && r.answers.listingUrl === 'https://www.airbnb.com/rooms/12345678'));
    ok('Log in after building: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Back from Google, brand-new account: signed in, no gate, straight to "paste your link".
  { const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } }), rows = {}, uid = '00000000-0000-0000-0000-00000000600d';
    await ctx.route('**/*', route => { const req = route.request(), u = new URL(req.url());
      if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname.startsWith('/auth/v1/user')) return json(route, { id: uid, email: 'new@example.org', created_at: new Date().toISOString() });
      if (u.origin === SB && u.pathname.startsWith('/rest/v1/guides')) {
        if (req.method() === 'POST') { const r = { id: '00000000-0000-0000-0000-0000000060aa', owner: uid, answers: {}, status: 'draft', slug: null, origin: null, content: null, theme: null, draft: null }; rows[r.id] = r; return json(route, [r]); }
        if (/select=id(%2C|,)slug/.test(u.search)) return json(route, Object.values(rows).map(r => ({ id: r.id, slug: r.slug, status: r.status })));
        const id = (u.search.match(/id=eq\.([0-9a-f-]+)/) || [])[1]; return json(route, rows[id] ? [rows[id]] : []);
      }
      if (u.origin === SB) return json(route, u.pathname.startsWith('/auth/') ? {} : []);
      return route.continue(); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://editor.test/#access_token=test-token&expires_in=3600&refresh_token=r1&token_type=bearer&provider_token=g1');
    await p.waitForSelector('#st_url', { timeout: 15000 }).catch(() => {});
    ok('back from Google (new account): signed in, on "paste your link"', !(await p.$('#acct')) && !!(await p.$('#st_url')), await p.evaluate(() => location.hash || '(no hash)'));
    ok('back from Google: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Add a house from the Ca La Kimberly account: the same start as a new account.
  { const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } }), rows = { [E.id]: E };
    await ctx.addInitScript(g => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('porta-auth-v1', JSON.stringify({ access_token: 't', refresh_token: 't', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: g.owner } })); }, E);
    await ctx.route('**/*', route => { const req = route.request(), u = new URL(req.url());
      if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname.startsWith('/auth/v1/user')) return json(route, { id: E.owner });
      if (u.origin === SB && u.pathname.startsWith('/rest/v1/guides')) {
        if (req.method() === 'POST') { const r = { id: '00000000-0000-0000-0000-0000000000ad', owner: E.owner, answers: {}, status: 'draft', slug: null, origin: null, content: null, theme: null, draft: null }; rows[r.id] = r; return json(route, [r]); }
        if (req.method() !== 'GET') return json(route, []);
        if (/select=id(%2C|,)slug/.test(u.search)) return json(route, Object.values(rows).map(r => ({ id: r.id, slug: r.slug, status: r.status, origin: r.origin, name: r.content && r.content.site.name })));
        const id = (u.search.match(/id=eq\.([0-9a-f-]+)/) || [])[1]; return json(route, rows[id] ? [rows[id]] : []);
      }
      if (u.origin === SB) return json(route, u.pathname.startsWith('/auth/') ? {} : []);
      return route.continue(); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://editor.test/'); await ready(p);
    await p.click('#acctbar .houses > summary'); await p.click('#acctbar [data-addhouse]').catch(() => {});
    await p.waitForSelector('#st_url', { timeout: 15000 }).catch(() => {});
    ok('Add a house (Ca La Kimberly account): the same "paste your link" start as a new account', !!(await p.$('#st_url')) && !(await p.$('.mhead')));
    const menu = await p.$eval('#acctbar .houses > summary', e => e.textContent.trim()).catch(() => '');
    ok('Add a house: the houses menu now shows the new house', !!menu && !/Ca La Kimberly/.test(menu), menu);
    ok('Add a house: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Deleting: a published house (type its address), the open house (the next one opens), then the whole account.
  { const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } }), calls = [];
    const draft = n => ({ id: `00000000-0000-0000-0000-0000000000d${n}`, owner: E.owner, answers: { placeName: `Test house ${n}` }, status: 'draft', slug: null, origin: null, content: null, theme: null, draft: null });
    const rows = { [draft(1).id]: draft(1), [E.id]: E, [draft(2).id]: draft(2) };
    await ctx.addInitScript(g => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('porta-auth-v1', JSON.stringify({ access_token: 't', refresh_token: 't', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: g.owner, email: 'host@example.org' } })); }, E);
    await ctx.route('**/*', route => { const req = route.request(), u = new URL(req.url());
      if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname === '/rest/v1/rpc/delete_my_account') { calls.push('delete account'); for (const k of Object.keys(rows)) delete rows[k]; return route.fulfill({ status: 204, body: '' }); }
      if (u.origin === SB && u.pathname.startsWith('/auth/v1/user')) return json(route, { id: E.owner, email: 'host@example.org' });
      if (u.origin === SB && u.pathname.startsWith('/rest/v1/guides')) {
        const id = (u.search.match(/id=eq\.([0-9a-f-]+)/) || [])[1];
        if (req.method() === 'DELETE') { const r = rows[id]; delete rows[id]; calls.push('delete ' + id); return json(route, r ? [r] : []); }
        if (req.method() === 'POST') { const r = { ...draft(9), answers: {} }; rows[r.id] = r; return json(route, [r]); }
        if (req.method() !== 'GET') return json(route, []);
        if (/select=id(%2C|,)slug/.test(u.search)) return json(route, Object.values(rows).map(r => ({ id: r.id, slug: r.slug, status: r.status, origin: r.origin, name: r.content && r.content.site.name, place: r.answers && r.answers.placeName })));
        return json(route, rows[id] ? [rows[id]] : []);
      }
      if (u.origin === SB) return json(route, u.pathname.startsWith('/auth/') ? {} : []);
      return route.continue(); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    const menu = async () => { await p.click('#acctbar .houses > summary'); await p.waitForTimeout(150); };
    const current = () => p.$eval('#acctbar [data-house][aria-current=true]', e => e.dataset.house).catch(() => '');
    await p.goto('http://editor.test/'); await p.waitForSelector('#acctbar .houses', { timeout: 15000 }).catch(() => {});
    await menu();
    const rowsClash = await p.$$eval('#acctbar .hrow', rs => rs.filter(r => { const [a, b] = [...r.children].map(x => x.getBoundingClientRect()); return a.right > b.left + 1 || b.right > innerWidth; }).length);
    ok('houses menu, 360 px: each house has its delete button, nothing overlaps', (await p.$$('#acctbar .hdel')).length === 3 && !rowsClash && !!(await p.$('#acctbar [data-delacct]')));
    await p.screenshot({ path: join(SHOTS, 'delete-menu-360.png') });
    // A published house: the box asks to type its web address.
    await p.click(`#acctbar [data-delhouse="${E.id}"]`); await p.waitForSelector('.acdel', { timeout: 3000 }).catch(() => {});
    const yes = () => p.$eval('.acdel [data-yes]', b => !b.disabled).catch(() => null);
    const offAtFirst = (await yes()) === false; await p.fill('#acdelIn', 'wrong'); const offWrong = (await yes()) === false;
    ok('delete a published house: "Delete" stays off until its web address is typed', offAtFirst && offWrong && /not found/.test(await p.textContent('.acdel').catch(() => '')));
    ok('delete box, 360 px: fits the screen, no sideways scroll', (await p.evaluate(() => { const b = document.querySelector('.acdel .box').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; })));
    await p.screenshot({ path: join(SHOTS, 'delete-published-360.png') });
    await p.fill('#acdelIn', E.slug); await p.click('.acdel [data-yes]'); await p.waitForTimeout(600);
    ok('delete a published house: deleted, gone from the menu, the open house stays', calls.includes('delete ' + E.id) && !rows[E.id] && (await current()) === draft(1).id && !(await p.$(`#acctbar [data-house="${E.id}"]`)), calls.join(', '));
    // Cancel keeps it.
    await menu(); await p.click(`#acctbar [data-delhouse="${draft(2).id}"]`); await p.click('.acdel [data-no]'); await p.waitForTimeout(200);
    ok('delete, then Cancel: nothing deleted', !!rows[draft(2).id] && !(await p.$('.acdel')));
    // The open house: deleted, the next house opens.
    await menu(); await p.click(`#acctbar [data-delhouse="${draft(1).id}"]`); await p.click('.acdel [data-yes]');
    await p.waitForLoadState('load'); await p.waitForSelector('#acctbar .houses', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(400);
    await menu();
    ok('delete the open house: the next house opens', !rows[draft(1).id] && (await current()) === draft(2).id, await current());
    // The account: type the email, then the sign-in page says it is deleted.
    await p.click('#acctbar [data-delacct]'); await p.waitForSelector('.acdel #acdelIn', { timeout: 3000 }).catch(() => {});
    await p.fill('#acdelIn', 'host@example.org'); await p.click('.acdel [data-yes]');
    await p.waitForLoadState('load'); await p.waitForSelector('#acct .ac-card', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300);
    const msg = await p.$eval('#acMsg', e => [e.textContent, e.className]).catch(() => ['', '']);
    ok('delete my account: done, signed out, the sign-in page says so', calls.includes('delete account') && /account is deleted/.test(msg[0]) && /ok/.test(msg[1]) && !(await p.evaluate(() => localStorage.getItem('porta-auth-v1'))), msg[0]);
    await p.screenshot({ path: join(SHOTS, 'delete-account-done-360.png') });
    ok('deleting: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- The builder, just after the listing was read ----
  { const { ctx, p, errors } = await open(browser, B, 360, 780);
    await p.goto('http://editor.test/'); await ready(p);
    ok('builder: opens on the first step that needs the host (name, address, languages), no overview', (await p.evaluate(() => location.hash)) === '#guide' && !(await p.$('.hero')), await p.evaluate(() => location.hash));
    await go(p, '#look'); await p.waitForTimeout(300);
    ok('builder: The look is one screen: cover, layout, colours, logo and what goes in the guide, the layout already picked',
      (await p.$$eval('.lk-card .lk-row b[id], .lk-card .lk-row .lk-hd b', els => [...new Set(els.map(e => e.textContent))].join(' | '))) === 'Cover picture | Layout | Colours | Your logo | What goes in your guide' && (await p.$eval('.lk-moods input:checked', e => e.value).catch(() => '')) === 'bold',
      await p.$$eval('.lk-card .lk-hd b', els => els.map(e => e.textContent).join(' | ')));
    const pinned = async () => p.$eval('.look-page .side-phone', e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.top >= -1 && r.bottom > 150; }).catch(() => false);
    const pinnedTop = await pinned();
    await p.$eval('.lk-logo', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    ok('builder, 360 px: the phone shows above the choices, and stays in view while they scroll', pinnedTop && await pinned());
    await p.evaluate(() => window.scrollTo(0, 0));
    ok('builder, 360 px: The look has no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    ok('builder: The look asks for Done (its defaults are confirmed)', /Done, next/.test(await barText(p)), await barText(p));
    await p.screenshot({ path: join(SHOTS, 'builder-look-360.png') });
    await p.click('#openSteps'); await p.waitForSelector('.sheet .si-guide', { timeout: 3000 }).catch(() => {});
    const groups = await p.$$eval('.sheet .sg', els => els.map(e => e.textContent.trim()));
    ok('builder: step list has "Needs you", then what we filled in, to review', /^Needs you/.test(groups[0] || '') && /^Filled in for you: please review/.test(groups[1] || ''), groups.join(' | '));
    const readyLabels = await p.$$eval('.sheet .si', els => els.map(e => [e.querySelector('.st')?.textContent, e.querySelector('.sl')?.textContent]));
    await p.screenshot({ path: join(SHOTS, 'builder-steps-360.png') });
    await p.click('.sheet-x');
    await go(p, '#known');
    const parts = await p.$$eval('.kn-part h2', els => els.map(e => e.textContent).join(' | '));
    ok('builder: "Only you know" is one step for Wi-Fi, arrival, rubbish and the taxi, and the four steps are gone from the list', parts === 'Wi-Fi | Arrival and parking | Rubbish | Getting around'
      && !(await p.$$eval('.rail a.si .st', els => els.map(e => e.textContent))).some(t => /^(Wi-Fi|Arrival and parking|Rubbish|Getting around|Contacts|Your style)$/.test(t)), parts);
    ok('builder: no host phone, first name or backup contact is asked for', !(await p.$('[data-k="hostPhone"], [data-k="hostName"], [data-k="backupContact"]')) && !!(await p.$('[data-part="contacts"] [data-k="taxi"]')));
    ok('builder: an empty "Only you know" offers Later, not Done', /Later/.test(await barText(p)) && !/Done/.test(await barText(p)), await barText(p));
    ok('builder: Rubbish asks how it is collected before anything else', (await p.$$eval('[data-part="rubbish"] .f', els => els.length)) === 1);
    await p.fill('[data-k="wifiName"]', 'Test network').catch(() => {}); await p.fill('[data-k="wifiPassword"]', 'test-password').catch(() => {}); await p.waitForTimeout(600);
    ok('builder: an answered part is ticked and counted, the step still offers Later', !!(await p.$('#kn_wifi .kn-ok')) && /1 of 4 done/.test(await p.textContent('.rail a.si[href="#known"]')) && /Later/.test(await barText(p)));
    await p.fill('[data-k="arrival"]', 'Park under the pine tree.'); await p.click('input[name="rubbishMode"][value="Bins collected at the house"]', { force: true }); await p.waitForTimeout(500);
    ok('builder: choosing how rubbish is collected keeps the choice and opens its questions', (await p.$eval('input[name="rubbishMode"]:checked', e => e.value).catch(() => '')) === 'Bins collected at the house' && (await p.$$eval('[data-part="rubbish"] .f', els => els.length)) > 2);
    await p.waitForTimeout(600);
    ok('builder: the three that matter answered, the step is done and offers Next (the taxi is optional)', /Next/.test(await barText(p)) && !/Later/.test(await barText(p)) && (await p.$$eval('.kn-ok', els => els.length)) === 3, await barText(p));
    ok('builder, 360 px: "Only you know" has no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    await p.screenshot({ path: join(SHOTS, 'known-360.png'), fullPage: true });
    await go(p, '#stay');
    const stay = await barText(p);
    ok('builder: a filled-in step needs no Done, offers Next', /Next/.test(stay) && !/Done/.test(stay), stay);
    const st = readyLabels.find(([t]) => /Check-in/.test(t || ''));
    ok('builder: a filled-in step not looked at yet says Review, not finished', !!st && st[1] === 'Review', st ? st.join(': ') : 'no Check-in step');
    // The whole path: Needs you, then every filled-in step in order, then Review, one Next at a time.
    await go(p, '#known');
    ok('builder: once looked at, it says Checked', /Checked/.test(await p.textContent('.rail a.si[href="#stay"]').catch(() => '')));
    const path = []; for (let i = 0; i < 16; i++) { const a = await p.$('#navbar a.nb.primary'); if (!a) break; const h = await a.getAttribute('href'); path.push(h); await go(p, h); if (h === '#send') break; }
    const filled = await p.$$eval('.rail a.si', els => els.map(e => e.getAttribute('href')));
    ok('builder: after the last "Needs you" step comes the first filled-in step, not Review', path[0] === filled[filled.indexOf('#known') + 1] && path[0] !== '#send', path.join(' '));
    ok('builder: Next goes through every filled-in step, then to Review', path[path.length - 1] === '#send' && path.length === filled.length - filled.indexOf('#known') - 1, path.join(' '));
    ok('builder: Review has no survey, email or notes, and nothing asks for feedback', !(await p.$('.survey, [data-k="email"], [data-k="notes"], .sum')) && !(await p.$('.notebox')), '');
    ok('builder: Review shows the web address and what is still worth a look', !!(await p.$('#f_slug')) && !!(await p.$('.rv-open a')));
    ok('builder, 360 px: Review has no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    await p.screenshot({ path: join(SHOTS, 'review-360.png'), fullPage: true });
    await go(p, '#nearby');
    ok('builder: Attractions has one way to add a place, as rows, and no second box', !!(await p.$('#pl_favDo .pl-row input')) && !(await p.$('[data-k="favourites"]')));
    await go(p, '#favourites');
    ok('builder: Eat and drink says what happens, with no "would not recommend" box', !(await p.$('[data-k="avoidPlaces"]')) && /House guide/.test(await p.textContent('.card').catch(() => '')));
    await go(p, '#guide');
    ok('builder: the welcome line has room for the whole text, and "Who usually stays" moved to Your area', (await p.$eval('[data-k="tagline"]', e => e.tagName).catch(() => '')) === 'TEXTAREA' && !(await p.$('[data-multi="guests"]')));
    await p.screenshot({ path: join(SHOTS, 'guide-step-360.png'), fullPage: true });
    await p.screenshot({ path: join(SHOTS, 'builder-ready-step-360.png') });
    await everyPage(p, 'builder');
    ok('builder: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- A place's name, looked up as the host types (Yohann, 30 Oct 2026): the host sees which place it is, the row keeps Google's id ----
  { const found = [{ id: 'g-ull', name: 'Restaurant Ull de Llebre', where: 'Carrer Santa Cristina, La Bisbal del Penedès, Spain', km: 3 }, { id: 'g-long', name: 'Restaurant amb un nom molt llarg per provar la pantalla petita de tres-cents seixanta', where: 'Avinguda del Mediterrani amb un nom molt llarg, Vilafranca del Penedès, Spain', km: 30 }];
    const { ctx, p, errors } = await open(browser, B, 360, 780), asked = [];
    await ctx.route('**/api/places**', r => { const q = new URL(r.request().url()).searchParams, t = q.get('suggest'); if (t) asked.push(t); return json(r, q.get('probe') ? { ok: true, enabled: true } : { ok: true, places: t === 'nowhere' ? [] : found }); });
    await p.goto('http://editor.test/#favourites'); await ready(p);
    await p.click('[data-pladd="favEat"]'); await p.waitForTimeout(150);
    const row = '#pl_favEat .pl-row:last-child', field = row + ' input', list = row + ' .pl-sug button', hidden = async sel => !(await p.isVisible(sel));
    await p.locator(field).pressSequentially('llul de llebre', { delay: 30 });
    await p.waitForSelector(list, { timeout: 3000 }).catch(() => {});
    ok('place lookup: the name field looks like the comment under it', (await p.$eval(field, e => getComputedStyle(e).borderRadius)) === (await p.$eval(row + ' textarea', e => getComputedStyle(e).borderRadius)));
    ok('place lookup: as the host types, Google\'s places show under the field, with where they are', (await p.$$(list)).length === 2 && /La Bisbal del Penedès, Spain · 3 km/.test(await p.textContent(row + ' .pl-sug').catch(() => '')));
    ok('place lookup: a burst of typing is one request', asked.length === 1 && asked[0] === 'llul de llebre', asked.join(' | '));
    const box = await p.evaluate(sel => { const r = document.querySelector(sel), b = x => r.querySelector(x).getBoundingClientRect(); return { list: b('.pl-sug').bottom, comment: b('textarea').top, fits: [...r.querySelectorAll('.pl-sug button')].every(x => x.scrollWidth <= x.clientWidth), page: document.documentElement.scrollWidth - innerWidth }; }, row);
    ok('place lookup, 360 px: the list pushes the comment down, covers nothing, and long names fit', box.list <= box.comment && box.fits && box.page <= 0, JSON.stringify(box));
    ok('place lookup: "Google Maps" is written at the foot of Google\'s list', await p.isVisible(row + ' .pl-sug .pl-gm') && (await p.textContent(row + ' .pl-sug .pl-gm')) === 'Google Maps');
    await p.locator(row).scrollIntoViewIfNeeded(); await p.screenshot({ path: join(SHOTS, 'place-lookup-360.png') });
    await p.click(list); await p.waitForTimeout(150);
    ok('place lookup: a tap keeps the host\'s words (with capitals), says which place it is with Google Maps, and moves on to the comment', (await p.inputValue(field)) === 'Llul de Llebre' && /Restaurant Ull de Llebre · Carrer Santa Cristina, La Bisbal/.test(await p.textContent(row + ' .pl-at.ok').catch(() => '')) && (await p.textContent(row + ' .pl-at a').catch(() => '')) === 'Google Maps' && /query=Llul%20de%20Llebre&query_place_id=g-ull/.test(await p.getAttribute(row + ' .pl-at a', 'href').catch(() => '')) && (await p.evaluate(() => document.activeElement.tagName)) === 'TEXTAREA' && await hidden(row + ' .pl-sug'));
    await p.waitForTimeout(1200);
    { const A = await stored(p), r = (A.favEat || []).find(x => x.gid === 'g-ull') || {}, all = JSON.stringify(A);
      ok('place lookup: a picked suggestion saves the host\'s words and Google\'s id, no name, address or distance of Google\'s', r.p === 'Llul de Llebre' && Object.keys(r).every(k => ['p', 'c', 'gid'].includes(k)) && !/Restaurant Ull de Llebre|Carrer Santa Cristina/.test(all), JSON.stringify(r)); }
    await p.locator(row).scrollIntoViewIfNeeded(); await p.screenshot({ path: join(SHOTS, 'place-picked-360.png') });
    await go(p, '#nearby'); await go(p, '#favourites');
    ok('place lookup: the row keeps the place it picked', !!(await p.$(row + ' .pl-at.ok')));
    await p.click(field); await p.keyboard.press('End'); await p.keyboard.type('x'); await p.waitForTimeout(100);
    ok('place lookup: another name is no longer the place picked, and nothing nags while typing', !(await p.$(row + ' .pl-at.ok')) && await hidden(row + ' .pl-at.miss'));
    await p.waitForSelector(list, { timeout: 3000 }).catch(() => {});
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok('place lookup: Escape closes the list and stays on the page', await hidden(row + ' .pl-sug') && (await p.evaluate(() => location.hash)) === '#favourites');
    await p.click(row + ' textarea'); await p.waitForTimeout(300);
    ok('place lookup: a name that was not picked says so once the host moves on, and what it means', /may have no map pin/.test(await p.textContent(row + ' .pl-at.miss').catch(() => '')) && await p.isVisible(row + ' .pl-at.miss'));
    await p.click(field); await p.waitForSelector(list, { timeout: 3000 }).catch(() => {});
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    ok('place lookup: the list works with the keyboard, and a name left unpicked offers it again on coming back', (await p.inputValue(field)) === 'Llul de Llebrex' && !!(await p.$(row + ' .pl-at.ok')));
    const before = asked.length; await p.fill(field, 'https://maps.app.goo.gl/abc123'); await p.waitForTimeout(500);
    ok('place lookup: a link is kept as it is: no search, no list, no warning', asked.length === before && await hidden(row + ' .pl-sug') && !(await p.$(row + ' .pl-at.ok')) && !(await p.$(row + ' .pl-at.miss')));
    await p.fill(field, 'nowhere'); await p.waitForTimeout(500); await p.click(row + ' textarea'); await p.waitForTimeout(300);
    ok('place lookup: nothing found on Google: no empty list, the name stays and says what it means', await hidden(row + ' .pl-sug') && (await p.inputValue(field)) === 'nowhere' && await p.isVisible(row + ' .pl-at.miss'));
    ok('place lookup: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // A row picked in an earlier session (nothing of Google's in memory), and one saved before 10 Nov 2026 with Google's address
  // in it (at): both say they are matched, with Google Maps, and show nothing of what was saved of Google's.
  { const G = { ...B, answers: { ...B.answers, favEat: [{ p: 'Ull de Llebre', c: '', gid: 'g-ull' }, { p: 'Restaurant Old Pick', c: '', gid: 'g-old', at: 'Carrer Vell, Old Town, Spain', km: 4 }] } };
    const { ctx, p, errors } = await open(browser, G, 360, 780);
    await ctx.route('**/api/places**', r => json(r, { ok: true, enabled: true, places: [] }));
    await p.goto('http://editor.test/#favourites'); await ready(p); await p.waitForTimeout(300);
    const at = await p.$$eval('#pl_favEat .pl-at.ok', els => els.map(e => ({ t: e.textContent.replace(/\s+/g, ' ').trim(), a: (e.querySelector('a') || {}).href || '' })));
    ok('place lookup, after a reload: a picked row says it is matched, with Google Maps by its id, and an older row shows nothing of Google\'s address', at.length === 2 && at.every(x => x.t === '✓ Matched on Google Maps') && /query_place_id=g-ull/.test(at[0].a) && /query_place_id=g-old/.test(at[1].a), JSON.stringify(at));
    await p.locator('#pl_favEat .pl-row >> nth=1').scrollIntoViewIfNeeded(); await p.screenshot({ path: join(SHOTS, 'place-matched-360.png') });
    ok('place lookup, after a reload: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- Rooms and photos: each room its own card, as guests see it, in the host's order; the phone follows (Yohann, 30 Oct 2026) ----
  { const rooms = [['Salón', 'Living room'], ['Salón', 'Living room'], ['Cocina completa', 'Kitchen'], ['Dormitorio 1', 'Bedroom'], ['Dormitorio 2', 'Bedroom'], ['Zona para hacer la colada muy larga', 'Laundry'], ['Piscina', 'Pool']];
    const G = { ...B, answers: { ...B.answers, rooms: undefined, welcome: 'A bright house with a pool.', sleeping: 'Bedroom 1: king bed\nBedroom 2: double bed',
      _remote: [...rooms, ['', '']].map(([roomLabel, room], i) => { const src = `https://a0.muscache.com/im/pictures/room-test-${i}.jpg`; return { id: 'rp' + i, kind: 'photo', remote: true, src, url: src + '?im_w=720', name: roomLabel || 'Listing photo ' + i, room, roomLabel }; }) } };
    const { ctx, p, errors } = await open(browser, G, 360, 780);
    await p.goto('http://editor.test/'); await ready(p); await go(p, '#photos'); await p.waitForSelector('.rm .thumb', { timeout: 5000 }).catch(() => {});
    const names = () => p.$$eval('.rm [data-rmname]', els => els.map(e => e.value)), wide = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const inGuide = () => inPhone(p, `d => [...d.querySelectorAll('.pv-card h3')].map(h => h.textContent)`);
    const n0 = await names();
    ok('rooms: one card per room, in the order of the listing, the two photos of a room together', n0.join() === 'Salón,Cocina completa,Dormitorio 1,Dormitorio 2,Zona para hacer la colada muy larga,Piscina' && (await p.$$('.rm[data-rmi="0"] .thumb')).length === 2, n0.join());
    ok('rooms: a photo with no room waits in its own card, and nothing is lost', /Not in a room yet/.test(await p.textContent('#roomsBox')) && (await p.$$('.rm:not([data-rmi]) .thumb')).length === 1);
    ok('rooms: nothing wider than the screen at 360 px', !(await wide()));
    await p.screenshot({ path: join(SHOTS, 'rooms-360.png'), fullPage: true });
    await p.waitForTimeout(500);
    ok('rooms: the phone shows the house page, the rooms in the same order', ((await inGuide()) || []).slice(0, 2).join() === 'Salón,Cocina completa', ((await inGuide()) || []).join());
    ok('rooms: the first room cannot go further up, the last further down', await p.$eval('.rm[data-rmi="0"] [data-dir="-1"]', e => e.disabled) && await p.$eval('.rm[data-rmi="5"] [data-dir="1"]', e => e.disabled));
    await p.click('.rm[data-rmi="5"] [data-dir="-1"]'); await p.waitForTimeout(100);
    await p.keyboard.press('Enter'); await p.waitForTimeout(100); await p.keyboard.press('Enter'); await p.waitForTimeout(100); await p.keyboard.press('Enter'); await p.waitForTimeout(100); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    const n1 = await names(), a1 = () => p.evaluate(() => JSON.parse(localStorage.getItem('porta-onboarding-v1')).A.rooms.map(r => r.n));
    ok('rooms: the arrow moves a room, and keeps moving it with the keyboard', n1[0] === 'Piscina' && n1[1] === 'Salón', n1.join());
    ok('rooms: the phone follows at once', ((await inGuide()) || [])[0] === 'Piscina', ((await inGuide()) || []).join());
    await p.waitForTimeout(700);
    ok('rooms: the order is kept for the build', (await a1())[0] === 'Piscina', (await a1()).join());
    await p.fill('.rm[data-rmi="1"] [data-rmname]', 'Living room'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    ok('rooms: a new name goes with its photos', (await p.$$('.rm[data-rmi="1"] .thumb')).length === 2 && (await names())[1] === 'Living room', (await names()).join());
    await p.fill('.rm[data-rmi="2"] [data-rmname]', 'Piscina'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    ok('rooms: two rooms cannot share a name', (await names())[2] === 'Cocina completa', (await names()).join());
    await p.fill('.rm[data-rmi="2"] textarea', 'Coffee capsules are in the top drawer'); await p.waitForTimeout(600);
    ok('rooms: what the host wrote in a room stays with the room', (await p.evaluate(() => JSON.parse(localStorage.getItem('porta-onboarding-v1')).A.rooms.find(r => r.n === 'Cocina completa').t)) === 'Coffee capsules are in the top drawer');
    await p.fill('#rmNew', 'Wine cellar'); await p.press('#rmNew', 'Enter'); await p.waitForTimeout(150);
    const last = '.rm[data-rmi="6"]';
    ok('rooms: a host can add a room, empty, ready for photos', (await names())[6] === 'Wine cellar' && !!(await p.$(last + ' .rm-add input')) && !!(await p.$(last + ' .rm-del')));
    await p.click(last + ' .rm-del'); await p.waitForTimeout(150);
    ok('rooms: an empty room can be removed; a room with photos has no such button', (await names()).length === 6 && !(await p.$('.rm[data-rmi="0"] .rm-del')));
    await p.click('.rm[data-rmi="0"] .thumb img'); await p.waitForSelector('#lb select', { timeout: 2000 }).catch(() => {});
    await p.screenshot({ path: join(SHOTS, 'rooms-photo-360.png') });
    await p.selectOption('#lb select', 'Dormitorio 1'); await p.waitForTimeout(200); await p.click('#lb .lbx'); await p.waitForTimeout(200);
    ok('rooms: moving the only photo of a room to another leaves the room there, empty, in its place', (await names())[0] === 'Piscina' && !(await p.$$('.rm[data-rmi="0"] .thumb')).length && (await p.$$('.rm[data-rmi="3"] .thumb')).length === 2, (await names()).join());
    await p.setInputFiles('.rm[data-rmi="0"] .rm-add input', { name: 'pool.png', mimeType: 'image/png', buffer: PNG4 }); await p.waitForFunction(() => document.querySelectorAll('.rm[data-rmi="0"] .thumb:not(.pending)').length === 1, null, { timeout: 4000 }).catch(() => {});
    ok('rooms: a photo added to a room lands in that room', (await p.$$('.rm[data-rmi="0"] .thumb:not(.pending)')).length === 1);
    ok('rooms: nothing wider than the screen after all that', !(await wide()));
    ok('rooms: no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const wide2 = await open(browser, G, 1280, 860);
    await wide2.p.goto('http://editor.test/'); await ready(wide2.p); await go(wide2.p, '#photos'); await wide2.p.waitForSelector('.rm .thumb', { timeout: 5000 }).catch(() => {}); await wide2.p.waitForTimeout(600);
    ok('rooms, desktop: the phone beside the cards shows the house page', ((await inPhone(wide2.p, `d => [...d.querySelectorAll('.pv-card h3')].map(h => h.textContent)`)) || [])[0] === 'Salón');
    await wide2.p.screenshot({ path: join(SHOTS, 'rooms-1280.png') });
    await wide2.ctx.close();
    // A product guide's house page in the editor: what the build writes, with the parts Ca La Kimberly has and it does not.
    const made = { ...E, content: { ...E.content, files: { ...E.content.files, 'house-page': { summary: { en: 'Villa · 8 guests' }, photos: ['house.jpg'], highlights: [{ icon: 'pool', t: { en: 'Pool' } }], beds: [], tour: [{ room: { en: 'Kitchen' }, photos: ['guide/kitchen-1.jpg'] }, { room: { en: 'Pool' }, photos: ['guide/pool-1.jpg'] }], amenities: [{ t: { en: 'What this place offers' }, items: [{ en: 'Pool' }] }], amenFirst: 8 } } } };
    const ed = await open(browser, made, 360, 780);
    await ed.p.goto('http://editor.test/'); await ready(ed.p); await go(ed.p, '#housepage'); await ed.p.waitForTimeout(300);
    ok('editor: the house page a build writes opens, with its rooms in order', (await ed.p.$$('[data-cardmove="files/house-page/tour/1"]')).length === 2 && !ed.errors.length, ed.errors.join(' | '));
    await ed.p.fill('#cmAmQ', 'dish'); await ed.p.waitForTimeout(150); await ed.p.click('[data-amput="dishwasher"]'); await ed.p.waitForTimeout(300);
    ok('editor: an amenity from the list goes into its group, already in every language', (await ed.p.$$eval('.cmi summary b', els => els.map(e => e.textContent))).includes('Kitchen and dining') && !ed.errors.length, ed.errors.join(' | '));
    await ed.p.fill('#cmAmQ', 'dish'); await ed.p.waitForTimeout(150);
    ok('editor: an amenity already in the guide is not offered again', !(await ed.p.$('[data-amput="dishwasher"]')));
    await ed.ctx.close(); }
  // ---- What the place offers: the most asked for, a search, every group, the host's own (Yohann, 2 Nov 2026: its own step, as Airbnb does) ----
  { const G = { ...B, answers: { ...B.answers, amenities: ['Pool', 'BBQ', 'Washing machine', 'Cot or high chair'] } };
    const { ctx, p, errors } = await open(browser, G, 360, 780);
    await p.goto('http://editor.test/'); await ready(p); await go(p, '#offers'); await p.waitForSelector('#amQ', { timeout: 5000 }).catch(() => {});
    const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('porta-onboarding-v1')).A.amenities), wide = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const ticked = () => p.$$eval('.am [data-amen]:checked', els => [...new Set(els.map(e => e.dataset.amen))]);
    ok('amenities: its own step, after Rooms and photos', !!(await p.$('#amQ')) && /What the place offers/.test(await p.textContent('main')));
    ok('amenities: old answers are ticked in the new list', (await ticked()).sort().join() === 'bbq,pool,washer', (await ticked()).join());
    ok('amenities: an old choice the list no longer offers stays, as the host\'s own', /Cot or high chair/.test(await p.textContent('.am-own')));
    for (const w of ['Lavadora en el alojamiento (Gratis)', 'Admite mascotas', 'Televisión de alta definición de 50 pulgadas', 'Free dryer – In unit', 'Lave-linge']) { await p.fill('#amOwn', w); await p.press('#amOwn', 'Enter'); await p.waitForTimeout(300); }
    await p.waitForTimeout(600);   // the save waits 400 ms after the last change
    const s1 = await saved(), own1 = await p.textContent('.am-own');
    ok('amenities: a listing\'s own words in any language are matched to the list, nothing twice', ['pets', 'tv', 'dryer'].every(x => s1.includes(x)) && s1.filter(x => x === 'washer').length === 1 && !/lavadora|mascotas|pulgadas|dryer|lave/i.test(own1), JSON.stringify(s1));
    await p.fill('#amQ', 'dish'); await p.waitForTimeout(150);
    ok('amenities: typing finds it', (await p.$$eval('#amRes [data-amen]', els => els.map(e => e.dataset.amen))).includes('dishwasher'));
    await p.check('#amRes [data-amen="dishwasher"]'); await p.waitForTimeout(700);
    ok('amenities: ticking from the search keeps it, and the group counts it', (await saved()).includes('dishwasher') && /1 ticked/.test(await p.textContent('[data-amc="kitchen"]')), JSON.stringify(await saved()));
    await p.fill('#amQ', 'lavavaj'); await p.waitForTimeout(150);
    ok('amenities: the search knows the other languages too', (await p.$$eval('#amRes [data-amen]', els => els.map(e => e.dataset.amen))).join() === 'dishwasher');
    await p.fill('#amQ', 'trampoline'); await p.waitForTimeout(150);
    await p.click('#amRes [data-amadd]'); await p.waitForTimeout(400);
    ok('amenities: something not in the list can be added as written', /trampoline/.test(await p.textContent('.am-own')) && (await saved()).includes('trampoline'), JSON.stringify(await saved()));
    await p.fill('#amOwn', 'jacuzzi'); await p.press('#amOwn', 'Enter'); await p.waitForTimeout(400);
    ok('amenities: typed words the list knows become the list\'s own item', (await saved()).includes('hot_tub') && !/jacuzzi/i.test(await p.textContent('.am-own')), JSON.stringify(await saved()));
    await p.click('.am-own [data-amdel="trampoline"]'); await p.waitForTimeout(400);
    ok('amenities: the host\'s own can be removed', !(await saved()).includes('trampoline'));
    await p.click('.am-g:has([data-amc="outdoor"]) summary'); await p.waitForTimeout(150);
    await p.uncheck('.am-g [data-amen="bbq"]'); await p.waitForTimeout(600);
    ok('amenities: unticking in a group unticks it everywhere', !(await saved()).includes('bbq') && !(await p.$eval('.chips [data-amen="bbq"]', e => e.checked)));
    ok('amenities: nothing wider than the screen at 360 px', !(await wide()));
    await p.screenshot({ path: join(SHOTS, 'amenities-360.png'), fullPage: true });
    await p.waitForTimeout(400);
    const offers = await inPhone(p, `d => { const h = [...d.querySelectorAll('.pv-card h3')].find(x => x.textContent === 'What this place offers'); return h ? h.nextElementSibling.textContent : ''; }`);
    ok('amenities: the phone shows them on the house page, the most asked for first', /^Pool, Hot tub/.test(offers || ''), offers);
    ok('amenities: How things work no longer asks for them', await (async () => { await go(p, '#howto'); await p.waitForTimeout(200); return !(await p.$('#amQ')); })());
    ok('amenities: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- Places nearby: one card at a time, dragged with a finger or the arrow keys; each yes lands in the phone ----
  { const places = ['Cala Test', 'Castell Test', 'Camí Test', 'Jardins Test'].map((name, i) => ({ id: 'tp' + i, name, rating: 4.5, reviews: 200, type: 'Beach', maps: 'https://maps.google.com/?q=' + i, summary: 'A test place.', lat: A0.lat, lng: A0.lng, km: 2 + i, photo: photos[i] || null }));
    const deck = async (w, h) => { const o = await open(browser, B, w, h);
      await o.ctx.route('**/api/places**', r => json(r, new URL(r.request().url()).searchParams.get('probe') ? { ok: true, enabled: true } : { ok: true, lat: A0.lat, lng: A0.lng, places }));
      await o.p.goto('http://editor.test/'); await ready(o.p); await go(o.p, '#nearby'); await o.p.waitForSelector('.sw-card', { timeout: 5000 }).catch(() => {}); return o; };
    const { ctx, p, errors } = await deck(1280, 860);
    const top = () => p.$eval('.sw-card h3', e => e.textContent).catch(() => null);
    const drag = async dx => { const [x, y] = await p.$eval('.sw-card', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 80]; });
      await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(x + dx * i / 8, y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(450); };
    await drag(40);
    ok('Places nearby: "Google Maps" is written on the card', await p.isVisible('.sw-card .sw-on a:has-text("Google Maps")'));
    ok('Places nearby: the phone beside Google\'s card has no map', await inPhone(p, d => !d.querySelector('canvas, .maplibregl-map, iframe')));
    ok('Places nearby: a short drag puts the card back', (await top()) === 'Cala Test' && (await p.$eval('.sw-card', e => e.style.transform)) === '' && /0 recommended/.test(await p.textContent('.sw-count')));
    await drag(160);
    ok('Places nearby: dragging right recommends it, the next card comes up', (await top()) === 'Castell Test' && /1 recommended/.test(await p.textContent('.sw-count')), (await p.textContent('.sw-count')).trim());
    await drag(-160);
    ok('Places nearby: dragging left skips it', (await top()) === 'Camí Test' && /1 recommended/.test(await p.textContent('.sw-count')));
    await p.focus('.sw-card'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(450);
    ok('Places nearby: the arrow keys work, and the next card keeps the focus', (await top()) === 'Jardins Test' && await p.evaluate(() => document.activeElement.classList.contains('sw-card')));
    await p.click('[data-swlast]'); await p.waitForTimeout(300);
    ok('Places nearby: Undo brings the last card back', (await top()) === 'Camí Test' && /1 recommended/.test(await p.textContent('.sw-count')));
    await p.fill('[data-swc="tp0"]', 'Go at sunset'); await p.waitForTimeout(1200);
    { const S = (await stored(p)).swipes || {}, v = Object.values(S);
      ok('Places nearby: a swipe saves only the id, yes or no, the list and the host\'s comment', v.length === 2 && v.every(x => Object.keys(x).every(k => ['id', 'd', 'cat', 'c'].includes(k))) && S.tp0.d === 'yes' && S.tp0.c === 'Go at sunset' && S.tp1.d === 'no' && !('c' in S.tp1), JSON.stringify(S));
      ok('Places nearby: Your picks shows the kept card from the live deck, with Google Maps', /Cala Test/.test(await p.textContent('.sw-picks')) && (await p.textContent('.sw-pick a').catch(() => '')) === 'Google Maps'); }
    await p.waitForTimeout(600);
    const inGuide = await inPhone(p, d => d.body.textContent);
    ok('Places nearby: a recommended place is in the phone, as the host\'s pick', /Cala Test/.test(inGuide || '') && !/Castell Test/.test(inGuide || ''));
    ok('Places nearby, desktop: the card and its buttons above the bottom bar', await p.evaluate(() => document.querySelector('.sw-btns').getBoundingClientRect().bottom <= document.getElementById('navbar').getBoundingClientRect().top));
    const path = await p.$$eval('.rail a.si', as => as.map(a => a.querySelector('.st').textContent));
    ok('builder: Eat and drink is on the path, right after Attractions (hand-picked, never searched)', path.indexOf('Eat and drink') === path.indexOf('Attractions') + 1 && path.indexOf('Eat and drink') < path.indexOf('Only you know'), path.slice(0, 5).join(' > '));
    ok('builder: each Around you step says what goes in it (Attractions: museums; Eat and drink: restaurants, cafés)', /museums/i.test(await p.textContent('.mhead').catch(() => '')) && (await (async () => { await go(p, '#favourites'); return /restaurants, cafés/i.test(await p.textContent('.mhead p').catch(() => '')); })()));
    await go(p, '#look'); await p.waitForTimeout(300);
    const nb = await p.$('[data-sec="nightlife"]');
    ok('builder: Nightlife is a section of its own, off at first', !!nb && !(await nb.isChecked()));
    await p.$eval('[data-sec="nightlife"]', e => e.closest('label').scrollIntoView({ block: 'center' })); await p.click('[data-sec="nightlife"]', { force: true }); await p.waitForTimeout(400);   // in the middle: just into view, it is under the fixed bottom bar
    const path2 = await p.$$eval('.rail a.si', as => as.map(a => a.querySelector('.st').textContent));
    ok('builder: switched on, Nightlife is on the path right after Eat and drink', path2.indexOf('Nightlife') === path2.indexOf('Eat and drink') + 1, path2.slice(0, 7).join(' > '));
    ok('builder: the path is the listing, the name and address, The look, Your area, then the places', path2.slice(0, 6).join(' > ') === 'Load your listing > Name, address, languages > The look > Your area > Attractions > Eat and drink', path2.slice(0, 6).join(' > '));
    ok('builder: Guide sections and Your area are no longer under "Filled in for you"', !path2.includes('Guide sections') && path2.indexOf('Your area') < path2.indexOf('Only you know'));
    const stepOff = async id => { await p.$eval(`[data-sec="${id}"]`, e => e.closest('label').scrollIntoView({ block: 'center' })); const y = await p.evaluate(() => scrollY); await p.click(`[data-sec="${id}"]`, { force: true }); await p.waitForTimeout(500); return Math.abs((await p.evaluate(() => scrollY)) - y) < 2; };
    const steps = () => p.$$eval('.rail a.si', as => as.map(a => a.querySelector('.st').textContent)), tiles = () => inPhone(p, d => [...d.querySelectorAll('.pv-sec b')].map(e => e.textContent).join(' | '));
    ok('builder: the phone Home has what the guide has, the two groups of tiles, and no tile for Wi-Fi or check-out', /Eat and drink/.test(await tiles()) && !/Wi-Fi|Check-in/.test(await tiles()) && /At the house.*Around the house/.test(((await inPhone(p, d => d.body.textContent)) || '').replace(/\s+/g, ' ')), await tiles());
    ok('builder: the phone has no description under the cover, as in the guide, and always the Wi-Fi', !(await inPhone(p, d => !!d.querySelector('.pv-welcome'))) && /Wi-Fi/.test(await inPhone(p, d => d.querySelector('.pv-facts').textContent)));
    await p.screenshot({ path: join(SHOTS, 'look-sections.png') });
    const stays = await stepOff('eat');
    ok('builder: switching Eat and drink off takes it off the steps and the phone, and the page stays where it is', !(await steps()).includes('Eat and drink') && !/Eat and drink/.test(await tiles()) && stays, (await steps()).slice(0, 8).join(' > '));
    await stepOff('eat');
    ok('builder: switched back on, it comes back in its place', (await steps()).indexOf('Eat and drink') === (await steps()).indexOf('Attractions') + 1);
    await stepOff('todo');
    ok('builder: Attractions goes the same way', !(await steps()).includes('Attractions') && !/Attractions|Things to do/.test(await tiles()), await tiles());
    await stepOff('todo');
    ok('builder: Check-out and the welcome page cannot be switched off, so they are not offered', !(await p.$('[data-sec="checkout"]')) && !(await p.$('[data-sec="welcome"]')));
    { const asked = []; await ctx.route('**/api/places**', r => { const q = new URL(r.request().url()).searchParams; if (!q.get('probe')) asked.push(`${q.get('radius')} ${q.get('want')}`); return json(r, q.get('probe') ? { ok: true, enabled: true } : { ok: true, lat: A0.lat, lng: A0.lng, places }); });
      await go(p, '#area'); await p.waitForTimeout(300);
      ok('Your area: it says what it steers, before the places', /swipe next/.test(await p.textContent('.mhead p').catch(() => '')));
      await p.click('[data-radio="radius"][value="1 hour"]', { force: true }); await p.$$eval('[data-multi="guests"]', els => { const f = els.find(e => e.value === 'Families with kids'); if (!f.checked) f.click(); });
      await go(p, '#nearby'); await p.waitForTimeout(600);
      ok('Your area: the deck follows the distance and who the guests are', asked.some(a => a.startsWith('30000 ') && /Families with kids/.test(a)), asked.join(' / ')); }
    ok('Places nearby: no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const m = await deck(360, 780);
    ok('Places nearby, 360 px: the whole card and its buttons on screen, above the bottom bar, no sideways scroll', await m.p.evaluate(() => document.querySelector('.sw-btns').getBoundingClientRect().bottom <= document.getElementById('navbar').getBoundingClientRect().top && document.documentElement.scrollWidth <= innerWidth));
    await m.p.screenshot({ path: join(SHOTS, 'nearby-360.png') });
    await m.ctx.close();
    // Kept cards from an earlier session, one in the old shape with Google's name and rating in it, and a deck that no
    // longer has them: a kept place with Google Maps by its id, never the name that was saved.
    const K = { ...B, answers: { ...B.answers, swipes: { 'g-kept': { id: 'g-kept', d: 'yes', cat: 'todo', name: 'Old Google Name', rating: 4.6, reviews: 90, c: 'Our favourite' } } } };
    const k = await open(browser, K, 1280, 860);
    await k.ctx.route('**/api/places**', r => json(r, new URL(r.request().url()).searchParams.get('probe') ? { ok: true, enabled: true } : { ok: true, lat: A0.lat, lng: A0.lng, places }));
    await k.p.goto('http://editor.test/#nearby'); await ready(k.p); await k.p.waitForSelector('.sw-picks', { timeout: 5000 }).catch(() => {}); await k.p.waitForTimeout(600);
    const pick = await k.p.textContent('.sw-picks').catch(() => ''), href = await k.p.getAttribute('.sw-pick a', 'href').catch(() => '');
    await inPhone(k.p, d => { const b = d.querySelector('[data-pv="todo"]'); b && b.click(); return 1; }); await k.p.waitForTimeout(500);
    const ph = (await inPhone(k.p, d => d.body.textContent)) || '';
    ok('Places nearby, a card kept earlier and not in the deck: "A place you kept" with Google Maps by its id, in the picks and the phone, never the saved name', /A place you kept/.test(pick) && /query_place_id=g-kept/.test(href || '') && /A place you kept/.test(ph) && /Our favourite/.test(ph) && !/Old Google Name|4\.6/.test(pick + ph), pick.replace(/\s+/g, ' ').slice(0, 120));
    ok('Places nearby, a card kept earlier: no page errors', !k.errors.length, k.errors.join(' | '));
    await k.ctx.close(); }
  // ---- A second device, signed in, opened straight at a step (backlog 48): the account's answers come in, and the
  // device's near empty ones (only the step it opened) never go over them ----
  { const { ctx, p, errors } = await open(browser, B, 360, 780);
    const pushed = []; await ctx.route(SB + '/rest/v1/guides**', r => { if (r.request().method() === 'PATCH') pushed.push(r.request().postData() || ''); return r.fallback(); });
    await p.goto('http://editor.test/#photos'); await ready(p); await p.waitForTimeout(2500);
    const here = await p.evaluate(() => (JSON.parse(localStorage.getItem('porta-onboarding-v1') || '{}').A || {}));
    const empty = pushed.filter(b => { try { return !(JSON.parse(b).answers || {}).placeName; } catch (e) { return false; } });
    ok('second device opened at a step: the account\'s answers come in, nothing near empty is saved over them', here.placeName === B.answers.placeName && !empty.length, `${here.placeName} / ${empty.length} of ${pushed.length} saves without the answers`);
    ok('second device: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- The wow: a new host pastes their link ----
  { const { ctx, p, errors } = await open(browser, N, 360, 780, {}, listingEs);
    await p.goto('http://editor.test/'); await p.waitForSelector('#st_url', { timeout: 15000 });
    await p.fill('#st_url', 'Check out this home on Airbnb! https://www.airbnb.com/slink/Ab12Cd34'); await p.click('#startGo');   // what a phone's share button copies
    await p.waitForTimeout(150);
    ok('wow: the link opens "This is your guide" at once', (await p.evaluate(() => location.hash)) === '#yours' && !!(await p.$('#phoneFrame')), await p.evaluate(() => location.hash));
    await p.waitForFunction(() => /Writing/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    const early = await inPhone(p, d => ({ cover: !!(d.querySelector('.pv-cover') || {}).style && /url\(/.test(d.querySelector('.pv-cover').style.backgroundImage), name: (d.querySelector('.pv-name h1') || {}).textContent }));
    ok('wow: a few seconds in, the phone shows the house photo and name (before Claude)', early && early.cover && early.name === (A0.placeName || 'Test house'), JSON.stringify(early));
    ok('wow: "Make it yours" waits while Claude writes', !!(await p.$('#yoursTx [aria-disabled="true"]')));
    await p.screenshot({ path: join(SHOTS, 'wow-writing-360.png') });
    await p.waitForFunction(() => /Your guide is written/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(2600);   // the tiles pop in one after another
    const tiles = await inPhone(p, d => d.querySelectorAll('.pv-sec').length);
    ok('wow: Claude done, the guide is written and its sections are in the phone', /Your guide is written/.test(await p.textContent('#yoursTx')) && tiles >= 3, `${tiles} sections`);
    ok('wow: a warm message that says what is left to do', /We’ve prefilled your guide from your listing! You now just need to .* to make it yours\./.test(await p.textContent('#yoursTx')), await p.textContent('#yoursTx'));
    ok('wow: 360 px, no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    const cta = await p.$eval('#yoursTx a.btn.primary', e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }).catch(() => false);
    ok('wow: on a phone, Make it yours is on screen without scrolling', cta);
    await p.screenshot({ path: join(SHOTS, 'wow-done-360.png') });
    await inPhone(p, d => { const b = d.querySelector('.pv-sec'); b && b.click(); return 1; }); await p.waitForTimeout(400);
    ok('wow: tapping a tile opens that screen in the phone', !!(await inPhone(p, d => d.querySelector('.pv-page'))));
    await p.click('#yoursTx a.btn.primary'); await p.waitForTimeout(400);
    ok('wow: "Make it yours" opens the name and web address', (await p.evaluate(() => location.hash)) === '#guide', await p.evaluate(() => location.hash));
    await p.waitForTimeout(800);
    const am = await p.evaluate(() => JSON.parse(localStorage.getItem('porta-onboarding-v1')).A.amenities);
    ok('wow: every amenity of the listing, by Airbnb\'s codes, and one it does not know kept as the listing says it', JSON.stringify(am) === JSON.stringify(['pool', 'washer', 'mountain_view', 'Trampolín']), JSON.stringify(am));
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('porta-onboarding-v1')).A);
    ok('wow: the link from a phone\'s share button is kept as the link alone', saved.listingUrl === 'https://www.airbnb.com/slink/Ab12Cd34', saved.listingUrl);
    ok('wow: the listing never switches a section off, even when its writer said no to all of them', !Object.entries(saved.modules || {}).some(([k, on]) => on === false && k !== 'nightlife'), JSON.stringify(saved.modules));
    await go(p, '#photos'); await p.waitForTimeout(500);
    const rooms = await p.$$eval('[data-rmname]', els => els.map(e => e.value));
    ok('wow: rooms named from Spanish captions get their English names once the listing is written', rooms.includes('Living room') && rooms.includes('Bedroom 1') && !rooms.some(r => /Salón|Dormitorio/.test(r)), rooms.join(', '));
    ok('wow: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p, errors } = await open(browser, N, 1280, 860, {}, listing);
    await p.goto('http://editor.test/'); await p.waitForSelector('#st_url', { timeout: 15000 });
    await p.fill('#st_url', 'https://www.airbnb.com/rooms/12345678'); await p.click('#startGo');
    await p.waitForFunction(() => /Your guide is written/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(2600); await p.screenshot({ path: join(SHOTS, 'wow-desktop.png') });
    await go(p, '#known'); await p.waitForTimeout(300);
    ok('desktop: the phone sits next to the step', await p.$eval('.side-phone', e => getComputedStyle(e).display !== 'none').catch(() => false));
    await p.fill('[data-k="wifiName"]', 'Casa Test Wifi'); await p.fill('[data-k="wifiPassword"]', 'pass-1234'); await p.waitForTimeout(900);
    const shown = await inPhone(p, d => d.body.textContent);
    ok('desktop: typing the Wi-Fi updates the phone', /Casa Test Wifi/.test(shown || ''), (shown || '').slice(0, 60));
    await p.focus('[data-k="taxi"]'); await p.waitForTimeout(600);
    ok('desktop: the phone shows the part being filled in (Getting around: the numbers)', /Emergency and contacts/.test((await inPhone(p, d => (d.querySelector('.pv-page h2') || {}).textContent)) || ''));
    await p.screenshot({ path: join(SHOTS, 'step-with-phone-desktop.png') });
    const arrows = () => inPhone(p, d => { const a = d.querySelector('.pv-sec .ar'); return a ? getComputedStyle(a).display !== 'none' : null; });
    await go(p, '#look'); await p.waitForTimeout(700);   // The look shows the guide's home in the phone
    ok('desktop: no layout picked, the phone shows Bauhaus (colour tiles with arrows)', (await arrows()) === true);
    await p.screenshot({ path: join(SHOTS, 'look-bauhaus-desktop.png') });
    ok('desktop: the phone draws the guide at a phone\'s width (390 px), scaled into the frame', await p.$eval('#phoneFrame', f => f.offsetWidth === 390 && /scale\(0\.\d+\)/.test(f.style.transform)).catch(() => false));
    const clash = await inPhone(p, d => [...d.querySelectorAll('.pv-sec')].flatMap(el => { const s = getComputedStyle(el, '::before'), b = el.getBoundingClientRect(), n = x => parseFloat(x) || 0;
      const w = n(s.width) + n(s.borderLeftWidth) + n(s.borderRightWidth), h = n(s.height) + n(s.borderTopWidth) + n(s.borderBottomWidth), x2 = b.right - n(s.right), x1 = x2 - w, y1 = b.top + n(s.top), y2 = y1 + h;
      const boxes = t => { if (t.matches('.ic, .ar')) return [t.getBoundingClientRect()]; const g = d.createRange(); g.selectNodeContents(t); return [...g.getClientRects()]; };
      return [...el.querySelectorAll('b, small, .ic svg, .ar')].filter(t => boxes(t).some(r => r.left < x2 - 1 && r.right > x1 + 1 && r.top < y2 - 1 && r.bottom > y1 + 1)).map(t => el.querySelector('b').textContent); }));
    ok('desktop: in the phone, no tile text under its corner shape', Array.isArray(clash) && clash.length === 0 && !!(await inPhone(p, d => d.querySelectorAll('.pv-sec').length)), (clash || []).join('; '));
    const logoEnd = await p.$eval('.lk-logo', e => e.getBoundingClientRect().bottom), barTop = await p.$eval('#navbar', e => e.getBoundingClientRect().top);
    ok('desktop: The look fits on one screen, its four choices above the bottom bar', logoEnd <= barTop, `logo row ends at ${Math.round(logoEnd)}, bar at ${Math.round(barTop)}`);
    await p.click('.moods input[value="minimal"]', { force: true }); await p.waitForTimeout(700);
    ok('desktop: picking another layout changes the phone at once', (await arrows()) === false);
    const tile = () => inPhone(p, d => getComputedStyle(d.querySelector('.pv-sec')).backgroundColor);
    await p.click('.moods input[value="rural"]', { force: true }); await p.waitForTimeout(700);
    const ruralOwn = await tile();
    await p.click('#lk_cf_cover', { force: true }); await p.waitForTimeout(1500);
    const ruralCover = await tile();
    ok('desktop: colours from the cover picture recolour Rural\'s own tiles in the phone', ruralOwn === 'rgb(90, 112, 52)' && !!ruralCover && ruralCover !== ruralOwn, `${ruralOwn} -> ${ruralCover}`);
    await p.click('#lk_drawn'); await p.waitForTimeout(900);
    ok('desktop: the drawn cover shows in the phone at once', !!(await inPhone(p, d => d.querySelector('.pv-cover.pv-art svg'))) && (await p.$eval('#lk_drawn', e => e.getAttribute('aria-pressed'))) === 'true');
    ok('desktop wow: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const slug = B.answers.slug || 'my-house';   // "Preview my guide" saves the answers on the device first, then opens /<address>
    const { ctx, p, errors } = await open(browser, B, 360, 780, { 'porta-onboarding-v1': JSON.stringify({ sid: 'test', A: { ...B.answers, slug } }) });
    await p.goto('http://editor.test/' + slug); await p.waitForSelector('.pv-shell', { timeout: 15000 }).catch(() => {});
    ok('full-page preview (Preview my guide) still opens', !!(await p.$('.pv-shell .pv-in')) && !/Get in touch with Yohann/.test(await p.textContent('body')));
    ok('full-page preview: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // ---- The editor ----
  { const { ctx, p, errors } = await open(browser, E, 360, 780);
    await p.goto('http://editor.test/'); await ready(p);
    ok('editor: opens straight on a step (no overview)', !!(await p.$('.mhead h1')) && !(await p.$('.hero')), `${await p.evaluate(() => location.hash)}`);
    await p.screenshot({ path: join(SHOTS, 'editor-open-360.png') });
    await go(p, '#home');
    ok('editor: the old #home address opens a step', !(await p.$('.hero')) && !!(await p.$('.mhead h1')));
    await p.click('#openSteps'); await p.waitForSelector('.sheet .si-guide', { timeout: 3000 }).catch(() => {});
    ok('editor: step list starts with the guide', !!(await p.$('.sheet .si-guide')) && !(await p.$$eval('.sheet .si', els => els.some(e => /Overview/.test(e.textContent)))));
    const eg = await p.$$eval('.sheet .sg', els => els.map(e => e.textContent.trim())), first = await p.$eval('.sheet .sg + a.si .st', e => e.textContent).catch(() => '');
    ok('editor: Wi-Fi missing (the test copy has none) is listed first, under "Needs you"', eg[0] === 'Needs you' && first === 'Wi-Fi', `${eg[0]}: ${first}`);
    await p.screenshot({ path: join(SHOTS, 'editor-steps-360.png') });
    await p.click('.sheet-x');
    await everyPage(p, 'editor');
    await go(p, '#housepage'); await p.waitForTimeout(200);
    const tourNames = () => p.$$eval('[data-open^="files/house-page/tour/"] > summary b', els => els.map(e => e.textContent)), up = n => `[data-cardmove="files/house-page/tour/${n}"][data-dir="-1"]`, down = n => `[data-cardmove="files/house-page/tour/${n}"][data-dir="1"]`, t0 = await tourNames();
    ok('editor: the rooms of the house page have arrows; the first cannot go up', t0.length > 2 && await p.$eval(up(0), e => e.disabled) && !(await p.$eval(down(0), e => e.disabled)), t0.slice(0, 3).join());
    await p.$eval(down(0), e => e.scrollIntoView({ block: 'center' })); await p.screenshot({ path: join(SHOTS, 'editor-rooms-360.png') });
    await p.click(down(0)); await p.waitForTimeout(200);
    const t1 = await tourNames();
    ok('editor: an arrow moves the room and does not open it', t1[0] === t0[1] && t1[1] === t0[0] && !(await p.$('details[data-open^="files/house-page/tour/"][open]')), t1.slice(0, 3).join());
    await p.click(up(1)); await p.waitForTimeout(200);
    await go(p, '#howto'); await p.waitForTimeout(200);
    ok('editor: the parts of the house guide can be put in order too', !!(await p.$('[data-cardmove="files/message/blocks/1"][data-dir="-1"]')));
    ok('editor: no page errors (phone)', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p } = await open(browser, E, 360, 780, { 'porta-editor-step-v1': JSON.stringify({ [E.id]: 'look' }) });
    await p.goto('http://editor.test/'); await ready(p);
    ok('editor: reopens on the step left last time', (await p.evaluate(() => location.hash)) === '#look');
    await ctx.close(); }
  { const { ctx, p, errors } = await open(browser, E, 1280, 860);
    await ctx.route(u => u.pathname === '/api/places', route => { const q = new URL(route.request().url()).searchParams;
      return json(route, q.get('id') ? { ok: true, place: { id: 'g-ull', lat: 41.28, lng: 1.48, km: 3 } } : q.get('suggest') ? { ok: true, places: [{ id: 'g-ull', name: 'Restaurant Ull de Llebre', where: 'La Bisbal del Penedès, Spain', km: 3 }] } : { ok: true, enabled: true }); });
    await p.goto('http://editor.test/#guide'); await ready(p); await p.waitForTimeout(500);
    const src = () => p.$eval('#cmPhoneFrame', f => f.getAttribute('src')).catch(() => '');
    ok('editor, desktop: the phone sits next to the step and shows the guide itself, with the changes', await p.$eval('.side-phone', e => getComputedStyle(e).display !== 'none').catch(() => false) && /\/g\/[^?]+\?preview#home$/.test(await src()), await src());
    const sec = await p.evaluate(() => ['todo', 'rubbish', 'contacts', 'transport', 'events'].find(id => document.querySelector(`.rail a.si[href="#${id}"]`)));
    await go(p, '#' + sec); await p.waitForTimeout(400);
    ok('editor, desktop: a section step shows that section in the phone', new RegExp('#s/').test(await src()), `${sec}: ${await src()}`);
    const lay = await p.evaluate(() => { const a = document.querySelector('.split .col').getBoundingClientRect(), b = document.querySelector('.side-phone').getBoundingClientRect(); return a.right <= b.left && b.right <= innerWidth; });
    ok('editor, desktop: the step and the phone do not overlap', lay);
    await p.screenshot({ path: join(SHOTS, 'editor-phone-desktop.png') });
    const before = ctx.viewer || 0; await go(p, '#guide'); await p.waitForTimeout(400);
    const loads = ctx.viewer || 0, field = await p.$('.edz input[type="text"], .edz textarea');
    if (field) { await field.fill(((await field.inputValue()) || '') + ' '); await p.waitForTimeout(2200); }
    ok('editor, desktop: a saved change reloads the phone', !!field && (ctx.viewer || 0) > loads, `${before} -> ${loads} -> ${ctx.viewer}`);
    // Google's suggestions on screen: the phone shows the guide's Home (no map), and goes back to the step's screen after.
    await go(p, '#restaurants'); await p.waitForTimeout(500);
    const hash = () => p.$eval('#cmPhoneFrame', f => f.contentWindow.location.hash).catch(() => '');
    const own = await hash();
    await p.click('[data-addit="files/restaurants/items"]'); await p.waitForTimeout(400);
    const gsp = 'details.cmi[open] [data-gsp]'; await p.locator(gsp).pressSequentially('ull de', { delay: 20 }); await p.waitForSelector('details.cmi[open] .pl-sug button', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(600);   // the phone may still be loading after the new card
    const listing = await hash();
    await p.click('details.cmi[open] .pl-sug button'); await p.waitForTimeout(800);
    const found = await hash();
    await p.click('details.cmi[open] > summary'); await p.waitForTimeout(400);
    ok('editor, desktop: while Google\'s list or the place found is on screen, the phone shows Home (no map), then the step\'s screen again', /^#s\//.test(own) && listing === '#home' && found === '#home' && (await hash()) === own, [own, listing, found, await hash()].join(' > '));
    ok('editor, desktop phone: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // The editor finds a place the same way: the host picks it as they type, and the place takes Google's id and position (dated)
  // and the distance; its name is the host's words. /api/places?id= answers only { id, lat, lng, km } (Google's terms).
  { const { ctx, p, errors } = await open(browser, E, 360, 780), read = [], saved = [];
    p.on('request', r => { if (r.method() === 'PATCH' && /\/rest\/v1\/guides/.test(r.url())) saved.push(r.postData()); });
    await ctx.route(u => u.pathname === '/api/places', route => { const q = new URL(route.request().url()).searchParams; if (q.get('id')) read.push(q.get('id'));
      return json(route, q.get('id') ? { ok: true, place: { id: 'g-ull', lat: 41.28, lng: 1.48, km: 3 } } : q.get('suggest') ? { ok: true, places: [{ id: 'g-ull', name: 'Restaurant Ull de Llebre', where: 'La Bisbal del Penedès, Spain', km: 3 }] } : { ok: true, enabled: true }); });
    await p.goto('http://editor.test/#restaurants'); await ready(p); await p.waitForTimeout(300);
    await p.click('[data-addit="files/restaurants/items"]'); await p.waitForTimeout(250);
    const card = 'details.cmi[open]:has([data-gsp])', field = card + ' [data-gsp]';
    ok('editor, finding a place: one search field, no second button', !!(await p.$(field)) && !(await p.$('[data-gfind]')));
    ok('editor, finding a place: a new place starts with it, above the name it will fill in', await p.evaluate(sel => { const f = document.querySelector(sel), n = f.closest('details').querySelector('input[data-p$="/name"]'); return !!n && f.getBoundingClientRect().top < n.getBoundingClientRect().top; }, field));
    await p.locator(field).pressSequentially('llul de ll', { delay: 20 });
    await p.waitForSelector(card + ' .pl-sug button', { timeout: 3000 }).catch(() => {});
    await p.locator(card + ' .pl-sug').scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: join(SHOTS, 'editor-place-lookup-360.png') });
    await p.click(card + ' .pl-sug button').catch(() => {});
    await p.waitForFunction(() => [...document.querySelectorAll('details.cmi')].some(d => /Llul de Ll/.test(d.querySelector('summary').textContent)), null, { timeout: 5000 }).catch(() => {});
    const got = await p.evaluate(() => { const d = [...document.querySelectorAll('details.cmi')].find(x => /Llul de Ll/.test(x.querySelector('summary').textContent)); return d ? { head: d.querySelector('summary').textContent, text: d.textContent, link: (d.querySelector('[data-glive] a') || {}).textContent, name: d.querySelector('input[data-p$="/name"]') && d.querySelector('input[data-p$="/name"]').value } : {}; });
    ok('editor, finding a place: the pick is read by its id, fills the empty name with the host\'s words and the distance, and no town of Google\'s', read[0] === 'g-ull' && got.name === 'Llul de Ll' && /3 km/.test(got.head || '') && !/La Bisbal/.test(got.head || ''), JSON.stringify({ read, ...got, text: undefined }));
    await p.locator('details.cmi[open] [data-glive]').scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: join(SHOTS, 'editor-place-found-360.png') });
    ok('editor, finding a place: it says what it found on Google, with Google Maps beside it, so the host can tell', /Found: Restaurant Ull de Llebre, La Bisbal del Penedès, Spain, 3 km from the house/.test(got.text || '') && got.link === 'Google Maps');
    await p.waitForTimeout(2500);
    { let it = null; try { const c = JSON.parse(saved[saved.length - 1] || '{}').draft.content; it = c.files.restaurants.items.find(x => x.gid === 'g-ull'); } catch (e) { /* not saved */ }
      const day = new Date().toISOString().slice(0, 10), en = it && (typeof it.name === 'object' ? it.name.en || Object.values(it.name)[0] : it.name);
      ok('editor, finding a place: the guide keeps Google\'s id, its dated position, the distance and a Google Maps link by the id, and no name, town, kind or hours of Google\'s', !!it && en === 'Llul de Ll' && it.lat === 41.28 && it.pos && it.pos.from === 'google' && it.pos.at === day && it.km_from_house === 3 && /query=Llul%20de%20Ll&query_place_id=g-ull/.test(it.gmaps || '') && !it.town && !(it.schedule || []).length && !(it.type && Object.values(it.type).some(Boolean)) && !JSON.stringify(it).includes('Restaurant Ull de Llebre'), JSON.stringify(it)); }
    ok('editor, finding a place, 360 px: no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    ok('editor, finding a place: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Getting around: the host types a station's name; Google places it, the worker finds its lines (mocked here), the card shows them.
  { const { ctx, p, errors } = await open(browser, E, 360, 780), jobs = [];
    const saved = []; p.on('request', r => { if (r.method() === 'PATCH' && /\/rest\/v1\/guides/.test(r.url())) saved.push(r.postData()); });
    await ctx.route(u => u.pathname === '/api/places', route => json(route, { ok: true, place: { id: 'g-calafell', lat: 41.19, lng: 1.57, km: 9 } }));
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), route => { const req = route.request();
      if (req.method() === 'POST') { jobs.push(JSON.parse(req.postData() || '{}')); return json(route, [{ id: 'job-tr-1' }]); }
      return json(route, [{ status: 'done', message: '1 line, 1 destination', result: { id: (jobs[0] || {}).params && jobs[0].params.id, badges: [{ t: 'R2 Sud', c: '#00A651', ink: false }], to: [{ dest: { en: 'Barcelona Sants' }, time: '50 min', note: { en: 'direct' } }], link: 'https://example.org/timetable', operator: 'Rodalies', checked: '2026-10-29' } }]); });
    await p.goto('http://editor.test/#transport'); await ready(p); await p.waitForTimeout(300);
    ok('Getting around: one field to add a station or stop (name or Google Maps link)', !!(await p.$('#c_stopq')) && !(await p.$('[data-tradd="train"]')));
    await p.fill('#c_stopq', 'Calafell'); await p.click('[data-stopadd]');
    await p.waitForFunction(() => [...document.querySelectorAll('details.cmi')].some(d => /Calafell/.test(d.querySelector('summary').textContent) && /Found 1 line/.test(d.textContent)), null, { timeout: 15000 }).catch(() => {});
    const job = jobs[0] || {}, card = await p.evaluate(() => { const c = [...document.querySelectorAll('details.cmi')].find(d => /Calafell/.test(d.querySelector('summary').textContent)); return c ? { open: c.open, text: c.textContent.replace(/\s+/g, ' '), tag: !!c.querySelector('[data-p$="/tag"]'), what: !!c.querySelector('[data-p$="/what"]') } : null; });
    ok('Getting around: Google places it under the name the host typed, and the lines are looked up for it', job.kind === 'find-transport' && (job.params || {}).name === 'Calafell' && !!card, JSON.stringify(job.params || {}));
    { let st = null; for (const b of saved) { try { st = JSON.parse(b).draft.content.files.transport.stations.find(x => x.gid === 'g-calafell') || st; } catch (e) { /* another save */ } }
      ok('Getting around: the station keeps Google\'s id and its dated position, and a Google Maps link by the id', !!st && st.name.en === 'Calafell' && st.pos && st.pos.from === 'google' && /query_place_id=g-calafell/.test(st.gmaps || '') && st.km === 9, JSON.stringify(st)); }
    ok('Getting around: the card shows the lines and where they go, the host only adds their words', !!card && /R2 Sud/.test(card.text) && /Barcelona Sants 50 min/.test(card.text) && /Refresh the lines/.test(card.text) && card.tag && card.what, card && card.text.slice(0, 120));
    ok('Getting around, 360 px: no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await p.screenshot({ path: join(SHOTS, 'transport-360.png'), fullPage: true });
    ok('Getting around: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // The editor never publishes an empty thing (10 Nov 2026). A new place starts blank (no icon, quick filter or marks of the
  // first one). On Publish, what nobody filled in is dropped (a line with no name on a station, a station with nothing in
  // it, a new place left as it came); a place with words but no name stops Publish and says where.
  { const L = x => Object.fromEntries(E.content.site.languages.map(l => [l, x])), c2 = JSON.parse(JSON.stringify(E.content)), T2 = c2.files.transport;
    const real = s => (s.badges || []).filter(b => String(b.t || '').trim()).length, st0 = T2.stations[0], lines0 = real(st0), n0 = T2.stations.length;
    st0.badges = [...(st0.badges || []), { t: '', c: '#1D4FA0' }];
    T2.stations.push({ id: 'train-empty', mode: 'train', name: L(''), lat: 0, lng: 0, km: 0, min: 0, tag: L(''), what: L(''), link: '', badges: [], to: [] });
    const run = async () => { const o = await open(browser, { ...E, draft: { content: c2, theme: E.theme } }, 360, 780); o.saved = [];
      await o.ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), route => { const req = route.request(); if (req.method() !== 'PATCH') return route.fallback(); o.saved.push(req.postData() || ''); return json(route, [{ status: 'published' }]); });
      await o.p.goto('http://editor.test/#todo'); await ready(o.p); await o.p.waitForTimeout(300);
      await o.p.$eval('[data-addit="files/todo/items"]', e => e.scrollIntoView({ block: 'center' })); await o.p.click('[data-addit="files/todo/items"]'); await o.p.waitForTimeout(1600); return o; };
    const lastDraft = saved => { for (const b of saved.slice().reverse()) { try { const j = JSON.parse(b); if (j.draft && j.draft.content) return j.draft.content; } catch (e) { /* not a save */ } } return null; };
    const published = saved => { for (const b of saved) { try { const j = JSON.parse(b); if (j.content && j.draft === null) return j.content; } catch (e) { /* not JSON */ } } return null; };
    { const { ctx, p, errors, saved } = await run();
      const it = ((((lastDraft(saved) || {}).files || {}).todo || {}).items || []).slice(-1)[0] || {};
      ok('editor: a new place in Attractions starts blank (no icon, quick filter or marks of the first place)', /^custom-/.test(it.id || '') && !('icon' in it) && !('group' in it) && !('tone' in it) && !(it.tags || []).length, JSON.stringify(it).slice(0, 160));
      await go(p, '#publish'); await p.click('.card [data-cpublish]'); await p.waitForTimeout(1500);
      const pub = published(saved), T = ((pub || {}).files || {}).transport || {}, s0 = (T.stations || []).find(x => x.id === st0.id) || {};
      ok('editor, Publish: an empty line on a station, an empty station and a new place left untouched are not sent', !!pub && !(T.stations || []).some(x => x.id === 'train-empty') && (T.stations || []).length <= n0 && real(s0) === lines0 && (s0.badges || []).length === lines0 && !(((pub.files || {}).todo || {}).items || []).some(x => /^custom-/.test(x.id || '')), pub ? `${(T.stations || []).length} stations, ${(s0.badges || []).length} lines` : 'nothing published');
      ok('editor, Publish: afterwards nothing shows as waiting (the draft lost them too)', !(await p.$('[data-cdiscard]')) && !(await p.$('.card [data-cpublish]')));
      ok('editor, Publish (empty entries): no page errors', !errors.length, errors.join(' | '));
      await ctx.close(); }
    { const { ctx, p, errors, saved } = await run();
      const box = '[data-p^="files/todo/items/"][data-p$="/description"]', all = await p.$$(box);
      if (all.length) { await all[all.length - 1].fill('A walk we love, but we forgot its name.'); await p.waitForTimeout(1500); }
      await go(p, '#publish'); await p.click('.card [data-cpublish]'); await p.waitForTimeout(400);
      const said = await p.textContent('#toast').catch(() => ''), sum = await p.$$eval('.sum a[href="#todo"]', as => as.map(a => a.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
      await p.waitForTimeout(1200);
      ok('editor, Publish: a place with a description but no name stops it, and says where', !published(saved) && /Not published: 1 entry in Attractions has no name\. Name it or delete it\./.test(said || ''), said);
      ok('editor, Publish: the page lists it with a link to Attractions', sum.some(t => /Attractions/.test(t) && /1 entry with no name/.test(t)), sum.join(' | '));
      const rail = await p.$$eval('.rail p.sg, .rail a.si .st', els => els.map(e => (e.matches('.sg') ? '#' : '') + e.textContent.trim())).catch(() => []), ni = rail.indexOf('#Needs you'), nx = rail.findIndex((x, i) => i > ni && x[0] === '#');
      ok('editor, Publish: Attractions is under "Needs you" while the place has no name', ni >= 0 && rail.slice(ni, nx < 0 ? undefined : nx).includes('Attractions'), rail.slice(0, 6).join(' > '));
      await p.screenshot({ path: join(SHOTS, 'editor-publish-noname-360.png'), fullPage: true });
      ok('editor, Publish (no name): no page errors', !errors.length, errors.join(' | '));
      await ctx.close(); } }
  // A guide whose host kept no place: Attractions is empty, the research waits there as cards, and the first one kept makes the section live.
  { const files = { ...E.content.files, todo: { ...E.content.files.todo, items: [] }, sections: { ...E.content.files.sections, sections: E.content.files.sections.sections.map(x => x.id === 'todo' ? { ...x, status: 'soon' } : x) } };
    const { ctx, p, errors } = await open(browser, { ...E, draft: null, content: { ...E.content, files } }, 360, 780); const saved = [];
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), r => json(r, [{ id: 'job-cards', status: 'done', message: '1 things to do found', created_at: new Date().toISOString(), result: { items: [{ id: 'cards-castle', name: { en: 'Cards Castle', es: 'Castillo Cartas' }, type: { en: 'Castle' }, town: 'Testville', lat: A0.lat, lng: A0.lng, km_from_house: 3, description: { en: 'A castle for the test.' }, _google: 'On Google' }] } }]));
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), route => { if (route.request().method() !== 'PATCH') return route.fallback(); saved.push(route.request().postData() || ''); return route.fulfill({ status: 204, body: '' }); });
    await p.goto('http://editor.test/?step=todo'); await ready(p); await p.waitForSelector('.cm-fcard', { timeout: 6000 }).catch(() => {});
    ok('editor: the finished screen\'s link opens Attractions, where the places the research found wait as cards', (await p.evaluate(() => location.hash)) === '#todo' && (await p.textContent('.cm-fcard h3').catch(() => '')) === 'Cards Castle', await p.evaluate(() => location.hash));
    await p.screenshot({ path: join(SHOTS, 'cards-editor-360.png') });
    await p.click('[data-cfadd]'); await p.waitForTimeout(2600);
    const after = saved.join(' ');
    ok('editor: a card kept goes in the guide and makes the section live, as a draft', /Cards Castle/.test(after) && /"id":"todo"[^}]*"status":"live"/.test(after), after.slice(0, 120));
    ok('editor, cards: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Nightlife (29 Oct 2026): optional and off in Ca La Kimberly; switched on in Guide sections, its first place makes its
  // section, right after Attractions.
  { const off = { ...E, content: { ...E.content, site: { ...E.content.site, modules: { ...E.content.site.modules, nightlife: false } } } };   // whatever the live guide has switched on today
    const { ctx, p, errors } = await open(browser, off, 1280, 860);
    const saved = []; await ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), route => { if (route.request().method() !== 'PATCH') return route.fallback(); saved.push(route.request().postData() || ''); return route.fulfill({ status: 204, body: '' }); });
    await p.goto('http://editor.test/#sections'); await ready(p); await p.waitForTimeout(400);
    const rail = () => p.$$eval('.rail a.si .st', els => els.map(e => e.textContent));
    const box = await p.$('[data-cmod="nightlife"]');
    ok('editor: Nightlife is in Guide sections, off for Ca La Kimberly, and not among its steps', !!box && !(await box.isChecked()) && !(await rail()).includes('Nightlife'));
    await p.$eval('[data-cmod="nightlife"]', e => e.closest('label').scrollIntoView({ block: 'center' })); await p.click('[data-cmod="nightlife"]', { force: true }); await p.waitForTimeout(500);
    const r = await rail();
    ok('editor: switched on, the Nightlife step comes right after Eat and drink (as in the builder)', r.indexOf('Nightlife') === r.indexOf('Eat and drink') + 1, r.join(' > '));
    await go(p, '#nightlife'); await p.$eval('[data-addit="files/nightlife/items"]', e => e.scrollIntoView({ block: 'center' })).catch(() => {}); await p.click('[data-addit="files/nightlife/items"]').catch(() => {}); await p.waitForTimeout(3000);
    let ids = []; for (const b of saved.slice().reverse()) { try { const j = JSON.parse(b), c = (j.draft || {}).content || j.content || {}; ids = (((c.files || {}).sections || {}).sections || []).map(x => x.id); if (ids.length) break; } catch (e) { /* not a save */ } }
    ok('editor: the first place makes the Nightlife section, right after Attractions (things to do)', ids.indexOf('nightlife') === ids.indexOf('todo') + 1 && ids.indexOf('todo') >= 0, ids.join(', '));
    ok('editor, Nightlife: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // The look, Colours: the layout's own is chosen until another is picked, and the chosen one stays highlighted.
  { const { ctx, p, errors } = await open(browser, E, 360, 780);
    await ctx.route(/\.(jpe?g|png|webp)(\?.*)?$/i, route => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG4 }));
    const saved = []; await ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), route => { if (route.request().method() !== 'PATCH') return route.fallback(); saved.push(route.request().postData() || ''); return route.fulfill({ status: 204, body: '' }); });
    await p.goto('http://editor.test/#look'); await ready(p); await p.waitForTimeout(300);
    const pressed = () => p.$$eval('[data-colorsfrom]', bs => bs.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.colorsfrom).join()).catch(() => '');
    const first = await pressed();
    await p.click('[data-colorsfrom="cover"]'); await p.waitForFunction(() => document.querySelector('[data-colorsfrom="cover"][aria-pressed="true"]') || /could not|not/i.test((document.getElementById('cmLogoCol') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    const second = await pressed(), bg = await p.$eval('[data-colorsfrom="cover"]', b => getComputedStyle(b).backgroundColor).catch(() => '');
    await p.click('[data-colorsfrom="look"]'); await p.waitForTimeout(300);
    const third = await pressed();
    ok('editor, Colours: "The layout\'s own" is highlighted at first, the picked one after, and back', first === 'look' && second === 'cover' && third === 'look' && bg !== 'rgba(0, 0, 0, 0)', `${first} -> ${second} (${bg}) -> ${third}`);
    await p.click('[data-colorsfrom="cover"]'); await p.waitForTimeout(1800); await p.screenshot({ path: join(SHOTS, 'editor-colours-360.png') });
    const last = saved[saved.length - 1] || '';
    ok('editor, Colours: the picture\'s colours reach every layout (Mediterranean, Rural, Soft, Clean)', ['--med-cobalt', '--med-azulejo', '--ru-moss', '--sf-mint', '--accent'].every(k => last.includes(k)) && !/in this layout the tiles keep/.test(await p.textContent('.edz')), saved.length + ' saves');
    ok('editor, Colours: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p } = await open(browser, E, 360, 780);
    await p.goto('http://editor.test/#guide'); await ready(p); await p.waitForTimeout(400);
    ok('editor, 360 px: no phone is loaded (it is hidden on small screens)', !(await p.$('#cmPhoneFrame')) && !(ctx.viewer || 0));
    await ctx.close(); }
  for (const [G, tag] of [[B, 'builder'], [E, 'editor']]) {
    const { ctx, p, errors } = await open(browser, G, 1280, 860);
    await p.goto('http://editor.test/'); await ready(p);
    ok(`${tag}, desktop: the rail starts with the guide`, !!(await p.$('.rail .si-guide')));
    await p.screenshot({ path: join(SHOTS, `${tag}-desktop.png`) });
    await everyPage(p, `${tag}, desktop`);
    ok(`${tag}, desktop: no page errors`, !errors.length, errors.join(' | '));
    await ctx.close();
  }
  for (const lang of ['de', 'fr']) {
    const { ctx, p } = await open(browser, E, 360, 780);
    await p.goto('http://editor.test/#guide'); await ready(p);
    const sel = await p.$('#c_lang'); if (sel) { await sel.selectOption(lang); await p.waitForTimeout(300); }
    const extra = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`editor, 360 px, editing in ${lang}: no sideways scroll`, extra <= 0, extra > 0 ? `${extra} px too wide` : '');
    await p.screenshot({ path: join(SHOTS, `editor-guide-${lang}-360.png`) });
    await ctx.close();
  }
} finally { await browser.close(); }
writeFileSync(join(SHOTS, `i18n-missing${env.CHECK_LANG ? '-' + env.CHECK_LANG : ''}.json`), JSON.stringify(Object.fromEntries([...MISSING].sort()), null, 1));
console.log(results.join('\n'));
if (MISSING.size) console.log(`${MISSING.size} sentences shown that src/i18n/ui.json does not have: shots/i18n-missing.json`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
