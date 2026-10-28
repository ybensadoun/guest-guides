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
mkdirSync(SHOTS, { recursive: true });
const results = [], ok = (name, pass, more = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${more ? '  (' + more + ')' : ''}`);
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function open(browser, G, w, h, stored = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([g, stored]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('porta-auth-v1', JSON.stringify({ access_token: 'test', refresh_token: 'test', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: g.owner, email: 'test@example.org' } }));
    for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v);
  }, [G, stored]);
  await ctx.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
    if (u.origin !== SB) return route.continue();   // fonts, public pictures
    if (u.pathname.startsWith('/auth/v1/user')) return json(route, { id: G.owner, email: 'test@example.org' });
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
  ok(`${tag}: nothing overlaps on any of the ${pages.length} pages at 360 px`, !bad.length, bad.join('; ')); };

const browser = await chromium.launch();
try {
  // ---- The builder, just after the listing was read ----
  { const { ctx, p, errors } = await open(browser, B, 360, 780);
    await p.goto('http://editor.test/'); await ready(p);
    ok('builder: opens on the first step that needs the host (The look), no overview', (await p.evaluate(() => location.hash)) === '#look' && !(await p.$('.hero')), await p.evaluate(() => location.hash));
    ok('builder: The look says the guide is written', /Your guide is written/.test(await p.textContent('.draft').catch(() => '')), (await p.textContent('.draft h2').catch(() => '')).trim());
    ok('builder: The look asks for Done (its defaults are confirmed)', /Done, next/.test(await barText(p)), await barText(p));
    await p.screenshot({ path: join(SHOTS, 'builder-look-360.png') });
    await p.click('#openSteps'); await p.waitForSelector('.sheet .si-guide', { timeout: 3000 }).catch(() => {});
    const groups = await p.$$eval('.sheet .sg', els => els.map(e => e.textContent.trim()));
    ok('builder: step list has "Needs you", then "Ready: check if you like"', /^Needs you/.test(groups[0] || '') && /^Ready/.test(groups[1] || ''), groups.join(' | '));
    const readyLabels = await p.$$eval('.sheet .si', els => els.map(e => [e.querySelector('.st')?.textContent, e.querySelector('.sl')?.textContent]));
    await p.screenshot({ path: join(SHOTS, 'builder-steps-360.png') });
    await p.click('.sheet-x');
    await go(p, '#wifi');
    ok('builder: an empty Wi-Fi step offers Later, not Done', /Later/.test(await barText(p)) && !/Done/.test(await barText(p)), await barText(p));
    await p.fill('[data-k="wifiName"]', 'Test network').catch(() => {}); await p.fill('[data-k="wifiPassword"]', 'test-password').catch(() => {}); await p.waitForTimeout(600);
    ok('builder: once answered, Wi-Fi counts as done and offers Next', /Next/.test(await barText(p)) && !/Later/.test(await barText(p)), await barText(p));
    await go(p, '#stay');
    const stay = await barText(p);
    ok('builder: a ready step needs no Done, offers Continue', /Continue/.test(stay) && !/Done/.test(stay), stay);
    const st = readyLabels.find(([t]) => /Check-in/.test(t || ''));
    ok('builder: ready steps say Ready', !!st && /Ready|Checked/.test(st[1] || ''), st ? st.join(': ') : 'no Check-in step');
    await p.screenshot({ path: join(SHOTS, 'builder-ready-step-360.png') });
    await everyPage(p, 'builder');
    ok('builder: no page errors', !errors.length, errors.join(' | '));
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
  for (const [G, tag] of [[B, 'builder'], [E, 'editor']]) {
    const { ctx, p, errors } = await open(browser, G, 1280, 860);
    await p.goto('http://editor.test/'); await ready(p);
    ok(`${tag}, desktop: the rail starts with the guide`, !!(await p.$('.rail .si-guide')));
    await p.screenshot({ path: join(SHOTS, `${tag}-desktop.png`) });
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
