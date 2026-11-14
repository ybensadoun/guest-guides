// Contrast check (the rule of engine/src/worlds.js, WCAG 2): every visible text of a site's main pages against what it
// sits on, in one colour world or in all six. Builds the site into a temporary folder per world, as
// `WORLD=<id> npm run build -- <site>` would (the site's own folder is never touched, no Google key), then opens Home,
// Places to eat, Things to do, a place page (the first Home links to), the rubbish page, Emergencies, Events and the
// house page at 360 px, in English and German, at two fixed times of the week (a Saturday late morning, a Monday mid
// afternoon), every folded row opened. A text passes at 4.5 to 1, or 3 to 1 when large (24 px and more, or 18.66 px and
// more at weight 700 and more); an icon (an inline svg in the text colour) at 3 to 1. Its background is that of the nearest ancestor that has one, semi-transparent ones laid
// over what is under them; text over a photo, a map, a gradient or a decorative shape (a tile's ::before or ::after)
// cannot be measured this way and is counted as "not measured". Each failing case is printed once (world, page, where,
// the two colours, the ratio, an example); in a run of every world, a case Bauhaus summer has too is marked so.
// Needs Playwright (as ux-check.mjs): node engine/scripts/contrast-check.mjs <site> [world|all] [chromium path]
// Without a world: the site as its site.json says.
import { createServer } from 'http'; import { spawnSync } from 'child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'fs'; import { join, extname, resolve } from 'path'; import { tmpdir } from 'os';
import { WORLDS, worldOf } from '../src/worlds.js';
const [site, which, exe] = process.argv.slice(2);
if (!site) { console.error('Usage: node engine/scripts/contrast-check.mjs <site> [world|all] [chromium path]'); process.exit(1); }
if (which && which !== 'all' && !worldOf(which)) { console.error(`Unknown world "${which}". Worlds: ${Object.keys(WORLDS).join(', ')}, or all`); process.exit(1); }
const { chromium } = await import('playwright');
const worlds = which === 'all' ? Object.keys(WORLDS) : [which || ''];
const langs = JSON.parse(readFileSync(resolve('sites', site, 'site.json'))).languages.filter(l => ['en', 'de'].includes(l));
const TIMES = { 'Saturday 11:30': '2026-11-14T11:30:00+01:00', 'Monday 15:30': '2026-11-16T15:30:00+01:00' };
const PAGES = { home: '', restaurants: '#s/restaurants', todo: '#s/todo', place: null, garbage: '#s/garbage', emergency: '#s/emergency', events: '#s/events', house: '#s/house' };
const TMP = mkdtempSync(join(tmpdir(), 'contrast-check-'));

// Builds quietly, with the world asked for and no key for Google's card (its line is Google's, not ours to measure).
const build = world => {
  const out = join(TMP, world || 'own'), env = { ...process.env, SITE: site };
  delete env.GOOGLE_MAPS_BROWSER_KEY; delete env.WORLD; if (world) env.WORLD = world;
  const r = spawnSync('npx', ['vite', 'build', '--config', resolve('engine/vite.config.js'), '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit', env });
  if (r.status) throw new Error(`build ${world || site} failed`);
  return out;
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const serve = root => new Promise(ok => { const s = createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) p = join(root, 'index.html'); r.setHeader('content-type', mime[extname(p)] || 'application/octet-stream'); r.end(readFileSync(p)); }).listen(0, () => ok(s)); });

// In the page: every visible text node, measured or counted as not measured.
function measure() {
  const out = { fail: [], ok: 0, icons: 0, skip: { photo: 0, gradient: 0, shape: 0 } };
  const col = v => { const m = String(v).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/) || String(v).match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
    if (!m) return null; const k = v.startsWith('color(') ? 255 : 1; return [+m[1] * k, +m[2] * k, +m[3] * k, m[4] == null ? 1 : +m[4]]; };
  const over = (top, under) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const name = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '') + (e.dataset && e.dataset.k ? `[data-k="${e.dataset.k}"]` : '');
  const where = e => { const p = [name(e)]; for (let x = e.parentElement; x && x !== document.body && p.length < 3; x = x.parentElement) if (typeof x.className === 'string' && x.className.trim()) p.unshift(name(x)); return p.join(' '); };
  const hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;   // as ux-check.mjs
  const n = v => parseFloat(v) || 0;
  // A decorative ::before or ::after of x (absolutely placed, with a colour of its own) that lies on one of the rects.
  const shapeOn = (x, rects) => {
    for (const ps of ['::before', '::after']) {
      const s = getComputedStyle(x, ps);
      if (s.content === 'none' || s.content === 'normal' || s.display === 'none' || !/absolute|fixed/.test(s.position)) continue;
      const painted = (col(s.backgroundColor) || [0, 0, 0, 0])[3] > 0 || s.backgroundImage !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some(k => n(s[`border${k}Width`]) > 0 && (col(s[`border${k}Color`]) || [0, 0, 0, 0])[3] > 0);
      if (!painted) continue;
      const T = x.getBoundingClientRect();
      let w = Math.max(n(s.width), n(s.borderLeftWidth) + n(s.borderRightWidth)), h = Math.max(n(s.height), n(s.borderTopWidth) + n(s.borderBottomWidth));
      const m = /matrix\(([^,]+), ([^,]+)/.exec(s.transform); if (m && Math.abs(parseFloat(m[2])) > 0.01 && Math.abs(parseFloat(m[1])) > 0.01) w = h = Math.hypot(w, h);   // tilted: its bounding square
      const left = s.left !== 'auto' ? T.left + n(s.left) : T.right - n(s.right) - w, top = s.top !== 'auto' ? T.top + n(s.top) : T.bottom - n(s.bottom) - h;
      const R = { left, top, right: left + w, bottom: top + h };
      if (rects.some(r => hit(R, r))) return true;
    }
    return false;
  };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = tw.nextNode());) {
    const text = t.textContent.replace(/\s+/g, ' ').trim(), el = t.parentElement;
    if (!text || !el || el.closest('script,style,noscript,template,option,svg')) continue;
    const rg = document.createRange(); rg.selectNodeContents(t);
    const rects = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1);
    const s = getComputedStyle(el);
    if (!rects.length || s.visibility !== 'visible') continue;
    // The background: the nearest ancestor with one, semi-transparent layers gathered until an opaque one.
    let fg = col(s.color), alpha = 1, layers = [], why = null, bgEl = null;
    for (let x = el; x; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (shapeOn(x, rects)) { why = 'shape'; break; }
      if (cs.backgroundImage !== 'none') { why = /gradient/.test(cs.backgroundImage) ? 'gradient' : 'photo'; break; }
      const b = col(cs.backgroundColor);
      if (b && b[3] > 0) { layers.push(b); if (b[3] >= 1) { bgEl = x; break; } }
      if (!layers.length) alpha *= +cs.opacity;   // faded between the text and its background (the element's own included)
    }
    if (!alpha) continue;
    // Something that is not an ancestor, painted between the text and that background (a photo, a map, a block of colour).
    if (!why) {
      const r = rects[0], st = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const i = st.findIndex(e => e === el || e.contains(el));
      for (const e of i < 0 ? [] : st.slice(i + 1)) {
        if (e === bgEl) break;
        if (e.contains(el)) continue;
        if (/^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/.test(e.tagName)) { why = 'photo'; break; }
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') { why = /gradient/.test(cs.backgroundImage) ? 'gradient' : 'photo'; break; }
        const b = col(cs.backgroundColor); if (b && b[3] > 0) { layers.splice(layers.length - (bgEl ? 1 : 0), 0, b); if (b[3] >= 1) { layers = layers.slice(0, layers.indexOf(b) + 1); break; } }
      }
    }
    if (why) { out.skip[why]++; continue; }
    let bg = [255, 255, 255, 1]; for (const l of layers.slice().reverse()) bg = over(l, bg);
    const f = over([fg[0], fg[1], fg[2], fg[3] * alpha], bg);
    const size = n(s.fontSize), weight = n(s.fontWeight), large = size >= 24 || (size >= 18.66 && weight >= 700), want = large ? 3 : 4.5, cr = ratio(f, bg);
    out.ok++;
    if (cr < want - 1e-9) out.fail.push({ where: where(el), fg: hex(f), bg: hex(bg), ratio: Math.round(cr * 100) / 100, want, text: text.slice(0, 40) });
  }
  // Icons: an inline svg drawn in the text colour, against the nearest ancestor with a solid colour: 3 to 1 (a graphic,
  // not text). One on a veil, a photo or no colour of its own place is not measured here. Found 14 Nov 2026: white icons
  // on the warm badges of places to eat read at 2 to 1 in the five worlds whose warm is light (--on-warm since).
  for (const sv of document.querySelectorAll('svg')) {
    if (!sv.getClientRects().length) continue;
    const fg = col(getComputedStyle(sv).color); if (!fg || fg[3] < 1) continue;
    let bg = null; for (let x = sv.parentElement; x; x = x.parentElement) { const cs = getComputedStyle(x), c = col(cs.backgroundColor); if (cs.backgroundImage !== 'none' || (c && c[3] > 0 && c[3] < 1)) break; if (c && c[3] >= 1) { bg = c; break; } }
    if (!bg) continue;
    out.icons++; const cr = ratio(fg, bg);
    if (cr < 3 - 1e-9) out.fail.push({ where: where(sv.parentElement), fg: hex(fg), bg: hex(bg), ratio: Math.round(cr * 100) / 100, want: 3, text: 'an icon' });
  }
  return out;
}

const b = await chromium.launch(exe ? { executablePath: exe } : {});
const seen = new Map(), bauhausFails = new Set(), total = {};
let failing = 0;
try {
  for (const world of worlds) {
    const root = build(world), srv = await serve(root), base = `http://localhost:${srv.address().port}/`, W = world || 'own look';
    const tot = total[W] = { ok: 0, icons: 0, fail: 0, skip: { photo: 0, gradient: 0, shape: 0 } };
    for (const l of langs) for (const [when, iso] of Object.entries(TIMES)) {
      const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block', timezoneId: 'Europe/Madrid', reducedMotion: 'reduce' });
      await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());   // nothing leaves the machine
      let place = null;
      for (const [page, route] of Object.entries(PAGES)) {
        const pg = await ctx.newPage();
        await pg.clock.setFixedTime(new Date(iso));
        if (page === 'place' && !place) { await pg.close(); continue; }
        await pg.goto(`${base}?lang=${l}${page === 'place' ? place : route}`, { waitUntil: 'load' });
        await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(900);
        if (page === 'home') place = await pg.evaluate(() => document.querySelector('a[href^="#p/"]')?.getAttribute('href'));
        await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await pg.waitForTimeout(300);
        // The whole page in the window, so every text can be found under its point (elementsFromPoint sees the window only).
        await pg.setViewportSize({ width: 360, height: Math.min(20000, await pg.evaluate(() => document.documentElement.scrollHeight)) }); await pg.waitForTimeout(300);
        const r = await pg.evaluate(measure);
        tot.ok += r.ok; tot.icons += r.icons; for (const k in r.skip) tot.skip[k] += r.skip[k];
        for (const x of r.fail) {
          const key = `${W}|${page}|${x.where}|${x.fg}|${x.bg}`;
          if (world === 'bauhaus') bauhausFails.add(`${page}|${x.where}`);
          if (seen.has(key)) continue;
          seen.set(key, 1); failing++; tot.fail++;
          const also = world && world !== 'bauhaus' && bauhausFails.has(`${page}|${x.where}`) ? ' (Bauhaus too)' : '';
          console.log(`${W}, ${page}: ${x.where}: ${x.fg} on ${x.bg} is ${x.ratio.toFixed(2)} (needs ${x.want}) "${x.text}" [${l}, ${when}]${also}`);
        }
        await pg.close();
      }
      await ctx.close();
    }
    srv.close();
    console.log(`${W}: ${tot.ok} texts and ${tot.icons} icons measured, ${tot.fail} failing case(s); not measured ${tot.skip.photo + tot.skip.gradient + tot.skip.shape} (over a photo or map ${tot.skip.photo}, a gradient ${tot.skip.gradient}, a shape ${tot.skip.shape})`);
  }
} finally { await b.close(); rmSync(TMP, { recursive: true, force: true }); }
console.log(failing ? `Contrast check: ${failing} failing case(s)` : 'Contrast check OK');
process.exit(failing ? 1 : 0);
