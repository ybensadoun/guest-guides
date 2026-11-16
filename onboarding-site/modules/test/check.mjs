#!/usr/bin/env node
// The modules page on a pretend database, with the real maker and the real viewer in its frames (the built files of
// onboarding-site/, served from disk): nothing is read from or written to the real database, no key is needed.
//   node onboarding-site/modules/test/check.mjs        pictures in onboarding-site/modules/test/shots/ (git-ignored)
// Needs Playwright (the main checkout's packages, linked) and the fixtures (samples/sample-*.json). Fonts and map tiles
// come from the network when there is one.
import { chromium } from 'playwright';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), SITE = resolve(HERE, '../..'), SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });
const ORIGIN = 'http://console.test', SB = 'https://dmoxszfwulolqkgxtxcp.supabase.co';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.com' };
const samples = JSON.parse(readFileSync(resolve(HERE, '../samples/index.json'), 'utf8'));
if (!samples.length) { console.error('No fixtures: run samples/make.mjs, then build.mjs.'); process.exit(1); }

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };

// The pretend database: what the page, the maker and the viewer ask of it.
function world({ owner = true } = {}) {
  const db = { owner, calls: [], switches: [], feedback: [], nextId: 1,
    guides: samples.map((s, i) => { const fx = JSON.parse(readFileSync(resolve(HERE, `../samples/${s.slug}.json`), 'utf8'));
      return { id: `00000000-0000-4000-8000-00000000010${i}`, owner: USER.id, slug: s.slug, status: 'draft', origin: 'imported', answers: {}, content: i === samples.length - 1 ? {} : fx.content, theme: fx.theme || {}, draft: null, finished_at: null }; }) };
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
function site(route) {
  const u = new URL(route.request().url());
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/.netlify/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
  let f = join(SITE, decodeURIComponent(u.pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (u.pathname.startsWith('/g/')) f = join(SITE, 'g-app/viewer.html');              // netlify.toml: the shared viewer
  else if (!existsSync(f)) { if (extname(f)) return route.fulfill({ status: 404, body: '' }); f = join(SITE, 'index.html'); }   // and the catch-all: the maker
  let body = readFileSync(f); if (f.endsWith('viewer.html')) body = String(body).replace(/__GOOGLE_MAPS_BROWSER_KEY__/g, '');
  return route.fulfill({ status: 200, contentType: TYPES[extname(f)] || 'application/octet-stream', body });
}
async function open(browser, db, { width, height = 860, session = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.route(u => u.origin === ORIGIN, site);
  await ctx.route(u => u.origin === SB, db.handle);
  if (session) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, ['porta-auth-v1', JSON.stringify({ access_token: 'tok', refresh_token: 'ref', expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER })]);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  return { ctx, page, errors };
}
const noSideScroll = page => page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1);
// Nothing overlaps: the page's own texts and controls, pair by pair among siblings (frames are the maker's and the guide's own business).
const overlaps = page => page.evaluate(() => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
  for (const parent of document.querySelectorAll('main *, .top, .fb *')) {
    const kids = [...parent.children].filter(vis).filter(k => !['absolute', 'fixed'].includes(getComputedStyle(k).position));
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.push(`${kids[i].className || kids[i].tagName} over ${kids[j].className || kids[j].tagName}`);
    }
  }
  return [...new Set(out)].slice(0, 6);
});
const clipped = page => page.evaluate(() => [...document.querySelectorAll('main b, main h1, main h2, main button, main a, main span, main p, .fb *')].filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).display !== 'inline').map(el => (el.textContent || '').trim().slice(0, 40)).slice(0, 6));

const browser = await chromium.launch();
try {
  // Who gets in
  { const { ctx, page } = await open(browser, world(), { width: 1280, session: false }); await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.gate');
    ok((await page.textContent('.gate h1')) === 'Log in first', 'no login: the notice'); ok(!(await page.$('.grid')), 'no login: nothing else'); await ctx.close(); }
  { const { ctx, page } = await open(browser, world({ owner: false }), { width: 1280 }); await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.gate');
    ok((await page.textContent('.gate h1')) === 'Not for this account', 'another account: the notice'); ok(!(await page.$('.grid')), 'another account: nothing else'); await ctx.close(); }

  for (const width of [1280, 360]) {
    const db = world(), { ctx, page, errors } = await open(browser, db, { width, height: width === 360 ? 740 : 860 }), tag = width + ' px';
    const shot = n => page.screenshot({ path: join(SHOTS, `${width}-${n}.png`), fullPage: width === 360 });
    const sound = async n => { ok(await noSideScroll(page), `${tag} ${n}: no wider than the screen`); const o = await overlaps(page); ok(!o.length, `${tag} ${n}: nothing overlaps (${o.join('; ')})`); const c = await clipped(page); ok(!c.length, `${tag} ${n}: no text cut (${c.join('; ')})`); await shot(n); };
    await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.grid');
    ok((await page.$$('.mc')).length === 14, `${tag}: the fourteen modules`);
    ok(/Taxis found near the house · Ride apps · Train stations and lines · iryo and Ouigo · Metro, tram and bus stops/.test(await page.textContent('.mc')), `${tag}: a module's parts`);
    ok(/Spain: all 5 parts/.test(await page.textContent('.mc')), `${tag}: a module's countries`);
    await sound('fourteen');

    // Countries
    await page.goto(ORIGIN + '/modules/#/transport/countries'); await page.waitForSelector('.part');
    ok((await page.$$('.part')).length === 5, `${tag}: Getting around has five parts`);
    ok((await page.getAttribute('[data-sw="taxis/ES"]', 'aria-checked')) === 'true' && (await page.getAttribute('[data-sw="apps/ES"]', 'aria-checked')) === 'true', `${tag}: Spain's switches follow the list`);
    await page.click('[data-sw="apps/ES"]'); await page.waitForSelector('[data-back="apps/ES"]');
    ok(db.calls.some(c => c[0] === 'switch' && c[1].part === 'apps' && c[1].country === 'ES' && c[1].is_on === false), `${tag}: a switch is saved`);
    await page.click('[data-note="apps/ES"]'); await page.fill('.nf input', 'Only the big cities'); await page.click('.nf .btn'); await page.waitForSelector('.pt .note');
    ok(db.switches.some(x => x.part === 'apps' && x.note === 'Only the big cities' && x.is_on === false), `${tag}: a note is saved, the switch kept`);
    await page.selectOption('#addc', 'PT'); await page.waitForSelector('[data-sw="trains/PT"]');
    ok((await page.getAttribute('[data-sw="taxis/PT"]', 'aria-checked')) === 'true' && (await page.getAttribute('[data-sw="trains/PT"]', 'aria-checked')) === 'false', `${tag}: a new country starts from the list`);
    await sound('countries');
    await page.click('[data-back="apps/ES"]'); await page.waitForFunction(() => !document.querySelector('[data-back="apps/ES"]'));
    ok((await page.getAttribute('[data-sw="apps/ES"]', 'aria-checked')) === 'true', `${tag}: back to what the list says`);

    // Play
    await page.goto(ORIGIN + '/modules/#/transport/play'); await page.waitForSelector('#frMaker');
    const maker = page.frameLocator('#frMaker');
    await maker.locator('h1, h2').filter({ hasText: 'Getting around' }).first().waitFor({ timeout: 20000 });
    ok(true, `${tag}: the maker's real step is in the frame`);
    ok(await page.evaluate(id => (JSON.parse(localStorage.getItem('porta-house-v1')) || {}).id === id, db.guides[0].id), `${tag}: the maker is on the sample house`);
    if (width === 1280) {
      ok((await page.getAttribute('#stage', 'data-mode')) === 'desktop', `${tag}: the maker at desktop width`);
      const src = await maker.locator('#cmPhoneFrame').getAttribute('src', { timeout: 20000 });
      ok(/\/g\/sample-city\?preview#s\/transport$/.test(src || ''), `${tag}: its own phone shows the sample house's guide (${src})`);
      await maker.frameLocator('#cmPhoneFrame').locator('#view').waitFor({ timeout: 20000 });
      await page.waitForTimeout(1500); await sound('play-desktop');
      await page.click('[data-step="1"]'); await maker.locator('h1, h2').filter({ hasText: 'Home page' }).first().waitFor({ timeout: 10000 });
      ok(true, `${tag}: "Its tile on Home" opens the board`);
      await page.click('[data-width="phone"]'); await page.waitForSelector('#frGuest');
    } else {
      ok((await page.getAttribute('#stage', 'data-mode')) === 'small', `${tag}: one side at a time`);
      await page.waitForTimeout(800); await sound('play-host');
      await page.click('[data-side="guest"]');
    }
    const guest = page.frameLocator('#frGuest');
    await guest.locator('#view').waitFor({ timeout: 20000 });
    ok(/\/g\/sample-city\?preview&lang=en#/.test(await page.getAttribute('#frGuest', 'src')), `${tag}: the guest side is the viewer with the draft`);
    await page.waitForTimeout(1500); await sound(width === 1280 ? 'play-phone' : 'play-guest');
    ok(!db.calls.some(c => c[0] === 'guide-POST'), `${tag}: no house is made by playing`);

    // An empty house says so; Reset fills it
    const last = samples[samples.length - 1].slug;
    await page.click(`[data-house="${last}"]`); await page.waitForFunction(() => /is empty/.test(document.querySelector('#playNote').textContent));
    ok(!(await page.$('#frMaker')), `${tag}: an empty house opens no frame`);
    await page.click('#reset'); ok(/Sure/.test(await page.textContent('#reset')), `${tag}: Reset asks once`);
    await page.click('#reset'); await page.waitForSelector('#frMaker', { timeout: 15000 });
    ok(db.calls.some(c => c[0] === 'guide' && c[1] === last && c[2] === 'content,draft,theme'), `${tag}: Reset writes the fixture and empties the draft`);
    ok(!!(db.guides.find(g => g.slug === last).content.site || {}).name, `${tag}: the house is filled`);

    // Feedback, from the stage
    await page.click('#fbOpen'); await page.waitForSelector('#fb .fbf');
    await page.click('#fb [data-part="trains"]'); await page.fill('#fb textarea', 'The badges are hard to read.'); await sound('feedback-open');
    await page.click('#fb .btn'); await page.waitForFunction(() => document.querySelector('#fb textarea').value === '');
    const sent = (db.calls.find(c => c[0] === 'feedback') || [])[1] || {};
    ok(sent.module === 'transport' && sent.part === 'trains' && sent.across === false && sent.words === 'The badges are hard to read.', `${tag}: the feedback is saved with its module and part`);
    ok(sent.seen && sent.seen.house === last && sent.seen.lang === 'en' && !!sent.seen.step && !!sent.seen.guest && !!sent.seen.width, `${tag}: and with what was on screen (${JSON.stringify(sent.seen)})`);
    await page.goto(ORIGIN + '/modules/#/transport/feedback'); await page.waitForSelector('.fi');
    ok(/Feedback \(1 new\)/.test(await page.textContent('.tabs')), `${tag}: the tab counts what is new`);
    await sound('feedback');
    await page.selectOption('[data-state-of]', 'handed_out'); await page.waitForFunction(() => document.querySelector('.fi').dataset.state === 'handed_out');
    ok(db.calls.some(c => c[0] === 'feedback-state' && c[1] === 'handed_out'), `${tag}: an item's state is saved`);
    await page.goto(ORIGIN + '/modules/#/'); await page.waitForSelector('.grid');
    ok(await page.evaluate(() => { try { return !sessionStorage.getItem('porta-console-own-house') && !localStorage.getItem('porta-house-v1'); } catch (e) { return false; } }), `${tag}: leaving the stage gives the device its own house back`);
    ok(!db.calls.some(c => c[0] === 'job' && c[1] !== 'find-transport'), `${tag}: no paid search was asked (${db.calls.filter(c => c[0] === 'job').map(c => c[1]).join(', ')})`);
    ok(!errors.length, `${tag}: no script error (${errors.slice(0, 3).join(' | ')})`);
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`${pass} passed, ${fail} failed · pictures in onboarding-site/modules/test/shots/`);
process.exit(fail ? 1 : 0);
