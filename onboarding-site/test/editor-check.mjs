#!/usr/bin/env node
// The editor as a host sees it, without signing in and without writing anything: the built page (onboarding-site/index.html)
// opens with a fake session, and every database call is answered here from one guide read once at the start (its Wi-Fi
// left out, nothing kept on disk). Checks the rules that matter, takes screenshots into onboarding-site/test/shots/
// (git-ignored).
//   node onboarding-site/test/editor-check.mjs [slug]        default ca-la-kimberly; build the page first (src: python3 build.py)
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
const SB = 'https://dmoxszfwulolqkgxtxcp.supabase.co', SLUG = process.argv[2] || 'ca-la-kimberly';
const HTML = readFileSync(join(ROOT, 'onboarding-site/index.html'), 'utf8');
const G = (await (await fetch(`${SB}/rest/v1/guides?select=id,owner,answers,status,slug,origin,content,theme,draft&slug=eq.${encodeURIComponent(SLUG)}`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } })).json())[0];
if (!G) { console.error('No guide ' + SLUG); process.exit(1); }
G.draft = null; if (G.content.private) G.content.private = {};
mkdirSync(SHOTS, { recursive: true });
const results = [], ok = (name, pass, more = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${more ? '  (' + more + ')' : ''}`);
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function open(browser, w, h, stored = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([g, stored]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('porta-auth-v1', JSON.stringify({ access_token: 'test', refresh_token: 'test', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: g.owner, email: 'test@example.org' } }));
    for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v);
  }, [G, stored]);
  await ctx.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
    if (u.origin !== SB) return route.continue();   // fonts, the guide's public pictures
    if (u.pathname.startsWith('/auth/v1/user')) return json(route, { id: G.owner, email: 'test@example.org' });
    if (u.pathname.startsWith('/rest/v1/guides') && req.method() === 'GET')
      return json(route, /select=id(%2C|,)slug/.test(u.search) ? [{ id: G.id, slug: G.slug, status: G.status, origin: G.origin, name: G.content.site.name }] : [G]);
    return json(route, u.pathname.startsWith('/auth/') ? {} : []);   // saving a draft, jobs: accepted, kept nowhere
  });
  const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  return { ctx, p, errors };
}
const ready = p => p.waitForSelector('.mhead h1', { timeout: 15000 }).catch(() => {});
// Text in a step header that its shape (.mhead::before) covers.
const underShape = p => p.evaluate(() => {
  const head = document.querySelector('.mhead'); if (!head) return [];
  const s = getComputedStyle(head, '::before'), hb = head.getBoundingClientRect(), w = parseFloat(s.width), h = parseFloat(s.height);
  const x1 = hb.right - parseFloat(s.right) - w, y1 = s.top !== 'auto' ? hb.top + parseFloat(s.top) : hb.bottom - parseFloat(s.bottom) - h;
  return [...head.querySelectorAll('h1, p, .pill')].filter(el => { const rg = document.createRange(); rg.selectNodeContents(el);
    return [...rg.getClientRects()].some(c => c.left < x1 + w - 1 && c.right > x1 + 1 && c.top < y1 + h - 1 && c.bottom > y1 + 1); }).map(el => el.tagName);
});

const browser = await chromium.launch();
try {
  { const { ctx, p, errors } = await open(browser, 360, 780);
    await p.goto('http://editor.test/'); await ready(p);
    const h1 = await p.textContent('.mhead h1').catch(() => '');
    ok('opens straight on a step (no overview)', !!h1 && !(await p.$('.hero')), `${await p.evaluate(() => location.hash)} "${h1}"`);
    await p.screenshot({ path: join(SHOTS, 'open-360.png') });
    const bar = await p.$$eval('#navbar .nbin > *', els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }).filter(([a, b]) => b > a));
    ok('bottom bar: nothing overlaps', !bar.some((a, i) => bar.slice(i + 1).some(b => a[1] > b[0] && b[1] > a[0])));
    await p.evaluate(() => { location.hash = '#home'; }); await p.waitForTimeout(300);
    ok('the old #home address opens a step', !(await p.$('.hero')) && !!(await p.$('.mhead h1')));
    await p.click('#openSteps'); await p.waitForSelector('.sheet .si-guide', { timeout: 3000 }).catch(() => {});
    ok('step list starts with the guide', !!(await p.$('.sheet .si-guide')) && !(await p.$$eval('.sheet .si', els => els.some(e => /Overview/.test(e.textContent)))));
    await p.screenshot({ path: join(SHOTS, 'steps-360.png') });
    await p.click('.sheet-x');
    const pages = [...new Set(await p.$$eval('.rail a.si', as => as.map(a => a.getAttribute('href'))))], covered = [];
    for (const h of pages) { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(200); const c = await underShape(p); if (c.length) covered.push(`${h}: ${c.join(', ')}`); }
    ok(`360 px: no header text under its shape (${pages.length} pages)`, !covered.length, covered.join('; '));
    ok('no page errors (phone)', !errors.length, errors.join(' | '));
    await ctx.close(); }
  { const { ctx, p } = await open(browser, 360, 780, { 'porta-editor-step-v1': JSON.stringify({ [G.id]: 'look' }) });
    await p.goto('http://editor.test/'); await ready(p);
    ok('reopens on the step left last time', (await p.evaluate(() => location.hash)) === '#look');
    await ctx.close(); }
  { const { ctx, p, errors } = await open(browser, 1280, 860);
    await p.goto('http://editor.test/'); await ready(p);
    ok('desktop: the rail starts with the guide', !!(await p.$('.rail .si-guide')));
    await p.screenshot({ path: join(SHOTS, 'desktop.png') });
    ok('no page errors (desktop)', !errors.length, errors.join(' | '));
    await ctx.close(); }
  for (const lang of ['de', 'fr']) {
    const { ctx, p } = await open(browser, 360, 780);
    await p.goto('http://editor.test/#guide'); await ready(p);
    const sel = await p.$('#c_lang'); if (sel) { await sel.selectOption(lang); await p.waitForTimeout(300); }
    const extra = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`360 px, editing in ${lang}: no sideways scroll`, extra <= 0, extra > 0 ? `${extra} px too wide` : '');
    await p.screenshot({ path: join(SHOTS, `guide-${lang}-360.png`) });
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(results.join('\n'));
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
