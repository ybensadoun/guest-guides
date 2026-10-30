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
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
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
const WRITE = { ok: true, source: 'page', site: 'airbnb', draft: { placeName: A0.placeName, town: A0.town, region: A0.region, propertyType: A0.propertyType, bedrooms: A0.bedrooms, checkIn: A0.checkIn || '16:00', checkOut: A0.checkOut || '11:00', houseRules: A0.houseRules, amenities: A0.amenities, tagline: A0.tagline, welcome: A0.welcome, toConfirm: ['Your Wi-Fi'] }, photos, cover: photos[0], lat: A0.lat, lng: A0.lng, report: { assistant: 'ok' } };
const listing = (route, body) => setTimeout(() => json(route, body.stage === 'page' ? PAGE : WRITE), body.stage === 'page' ? 400 : 1500);
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
    ok('research from the link: what it found shows in the phone (Things to do)', ((await inPhone(p, d => d.body.textContent)) || '').includes(td), td);
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
    ok('builder: opens on the first step that needs the host (The look), no overview', (await p.evaluate(() => location.hash)) === '#look' && !(await p.$('.hero')), await p.evaluate(() => location.hash));
    ok('builder: The look is one screen of four choices (cover, layout, colours, logo), the layout already picked',
      (await p.$$eval('.lk-card .lk-row b[id], .lk-card .lk-row .lk-hd b', els => [...new Set(els.map(e => e.textContent))].join(' | '))) === 'Cover picture | Layout | Colours | Your logo' && (await p.$eval('.lk-moods input:checked', e => e.value).catch(() => '')) === 'bold',
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
    ok('Places nearby: a short drag puts the card back', (await top()) === 'Cala Test' && (await p.$eval('.sw-card', e => e.style.transform)) === '' && /0 recommended/.test(await p.textContent('.sw-count')));
    await drag(160);
    ok('Places nearby: dragging right recommends it, the next card comes up', (await top()) === 'Castell Test' && /1 recommended/.test(await p.textContent('.sw-count')), (await p.textContent('.sw-count')).trim());
    await drag(-160);
    ok('Places nearby: dragging left skips it', (await top()) === 'Camí Test' && /1 recommended/.test(await p.textContent('.sw-count')));
    await p.focus('.sw-card'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(450);
    ok('Places nearby: the arrow keys work, and the next card keeps the focus', (await top()) === 'Jardins Test' && await p.evaluate(() => document.activeElement.classList.contains('sw-card')));
    await p.click('[data-swlast]'); await p.waitForTimeout(300);
    ok('Places nearby: Undo brings the last card back', (await top()) === 'Camí Test' && /1 recommended/.test(await p.textContent('.sw-count')));
    await p.waitForTimeout(600);
    const inGuide = await inPhone(p, d => d.body.textContent);
    ok('Places nearby: a recommended place is in the phone, as the host\'s pick', /Cala Test/.test(inGuide || '') && !/Castell Test/.test(inGuide || ''));
    ok('Places nearby, desktop: the card and its buttons above the bottom bar', await p.evaluate(() => document.querySelector('.sw-btns').getBoundingClientRect().bottom <= document.getElementById('navbar').getBoundingClientRect().top));
    const path = await p.$$eval('.rail a.si', as => as.map(a => a.querySelector('.st').textContent));
    ok('builder: Eat and drink is on the path, right after Attractions (hand-picked, never searched)', path.indexOf('Eat and drink') === path.indexOf('Attractions') + 1 && path.indexOf('Eat and drink') < path.indexOf('Only you know'), path.slice(0, 5).join(' > '));
    ok('builder: each Around you step says what goes in it (Attractions: museums; Eat and drink: restaurants, cafés)', /museums/i.test(await p.textContent('.mhead').catch(() => '')) && (await (async () => { await go(p, '#favourites'); return /restaurants, cafés/i.test(await p.textContent('.mhead p').catch(() => '')); })()));
    await go(p, '#sections'); await p.waitForTimeout(300);
    const nb = await p.$('[data-sec="nightlife"]');
    ok('builder: Nightlife is a section of its own, off at first', !!nb && !(await nb.isChecked()));
    await p.$eval('[data-sec="nightlife"]', e => e.closest('label').scrollIntoView({ block: 'center' })); await p.click('[data-sec="nightlife"]', { force: true }); await p.waitForTimeout(400);   // in the middle: just into view, it is under the fixed bottom bar
    const path2 = await p.$$eval('.rail a.si', as => as.map(a => a.querySelector('.st').textContent));
    ok('builder: switched on, Nightlife is on the path right after Eat and drink', path2.indexOf('Nightlife') === path2.indexOf('Eat and drink') + 1, path2.slice(0, 7).join(' > '));
    ok('Places nearby: no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
    const m = await deck(360, 780);
    ok('Places nearby, 360 px: the whole card and its buttons on screen, above the bottom bar, no sideways scroll', await m.p.evaluate(() => document.querySelector('.sw-btns').getBoundingClientRect().bottom <= document.getElementById('navbar').getBoundingClientRect().top && document.documentElement.scrollWidth <= innerWidth));
    await m.p.screenshot({ path: join(SHOTS, 'nearby-360.png') });
    await m.ctx.close(); }
  // ---- The wow: a new host pastes their link ----
  { const { ctx, p, errors } = await open(browser, N, 360, 780, {}, listing);
    await p.goto('http://editor.test/'); await p.waitForSelector('#st_url', { timeout: 15000 });
    await p.fill('#st_url', 'https://www.airbnb.com/rooms/12345678'); await p.click('#startGo');
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
    ok('wow: "Make it yours" opens The look', (await p.evaluate(() => location.hash)) === '#look', await p.evaluate(() => location.hash));
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
    ok('editor: no page errors (phone)', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p } = await open(browser, E, 360, 780, { 'porta-editor-step-v1': JSON.stringify({ [E.id]: 'look' }) });
    await p.goto('http://editor.test/'); await ready(p);
    ok('editor: reopens on the step left last time', (await p.evaluate(() => location.hash)) === '#look');
    await ctx.close(); }
  { const { ctx, p, errors } = await open(browser, E, 1280, 860);
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
    ok('editor, desktop phone: no page errors', !errors.length, errors.join(' | '));
    await ctx.close(); }
  // Getting around: the host types a station's name; Google places it, the worker finds its lines (mocked here), the card shows them.
  { const { ctx, p, errors } = await open(browser, E, 360, 780), jobs = [];
    await ctx.route(u => u.pathname === '/api/places', route => json(route, { ok: true, place: { name: 'Calafell station', lat: 41.19, lng: 1.57, maps: 'https://maps.google.com/?cid=1', km: 9 } }));
    await ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), route => { const req = route.request();
      if (req.method() === 'POST') { jobs.push(JSON.parse(req.postData() || '{}')); return json(route, [{ id: 'job-tr-1' }]); }
      return json(route, [{ status: 'done', message: '1 line, 1 destination', result: { id: (jobs[0] || {}).params && jobs[0].params.id, badges: [{ t: 'R2 Sud', c: '#00A651', ink: false }], to: [{ dest: { en: 'Barcelona Sants' }, time: '50 min', note: { en: 'direct' } }], link: 'https://example.org/timetable', operator: 'Rodalies', checked: '2026-10-29' } }]); });
    await p.goto('http://editor.test/#transport'); await ready(p); await p.waitForTimeout(300);
    ok('Getting around: one field to add a station or stop (name or Google Maps link)', !!(await p.$('#c_stopq')) && !(await p.$('[data-tradd="train"]')));
    await p.fill('#c_stopq', 'Calafell'); await p.click('[data-stopadd]');
    await p.waitForFunction(() => [...document.querySelectorAll('details.cmi')].some(d => /Calafell station/.test(d.querySelector('summary').textContent) && /Found 1 line/.test(d.textContent)), null, { timeout: 15000 }).catch(() => {});
    const job = jobs[0] || {}, card = await p.evaluate(() => { const c = [...document.querySelectorAll('details.cmi')].find(d => /Calafell station/.test(d.querySelector('summary').textContent)); return c ? { open: c.open, text: c.textContent.replace(/\s+/g, ' '), tag: !!c.querySelector('[data-p$="/tag"]'), what: !!c.querySelector('[data-p$="/what"]') } : null; });
    ok('Getting around: Google places it and the lines are looked up for it', job.kind === 'find-transport' && (job.params || {}).name === 'Calafell station' && !!card, JSON.stringify(job.params || {}));
    ok('Getting around: the card shows the lines and where they go, the host only adds their words', !!card && /R2 Sud/.test(card.text) && /Barcelona Sants 50 min/.test(card.text) && /Refresh the lines/.test(card.text) && card.tag && card.what, card && card.text.slice(0, 120));
    ok('Getting around, 360 px: no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await p.screenshot({ path: join(SHOTS, 'transport-360.png'), fullPage: true });
    ok('Getting around: no page errors', !errors.length, errors.join(' | '));
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
console.log(results.join('\n'));
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
