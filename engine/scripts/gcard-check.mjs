// Google card check (engine/src/gcard.js): Google's open-now line with a FAKED Google, never a real call. Builds the site
// three times into temporary folders: with a fake key, without any key, and a patched copy of its content with a fake key
// (a beach that is not open all day, a town and a city given a Google id, a Home quick tile with a Google id and no hours,
// so the kind rule and the tile page are tried too; the site's own folder is never touched). Every request to a Google
// host is routed: Google's script gets a fake that defines google.maps.importLibrary and a fake
// <gmp-place-details-compact> whose height and answer this check chooses per place (125 px then gmp-load, a card with a
// status line; 105 px then gmp-load, Google's card with nothing to say; gmp-error; never answering). Any other request to a Google host fails the check. At 360 px in de and fr.
// Needs Playwright (as ux-check.mjs): node engine/scripts/gcard-check.mjs <site> [chromium path]
import { createServer } from 'http'; import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync, cpSync } from 'fs'; import { join, extname, resolve } from 'path'; import { tmpdir } from 'os';
const [site, exe] = process.argv.slice(2);
if (!site) { console.error('Usage: node engine/scripts/gcard-check.mjs <site> [chromium path]'); process.exit(1); }
const { chromium } = await import('playwright');
const SD = resolve('sites', site), TMP = mkdtempSync(join(tmpdir(), 'gcard-check-'));
const FAKE_KEY = 'test-key-not-real-000000';
const content = f => JSON.parse(readFileSync(join(SD, 'content', f + '.json'), 'utf8'));
const gidOf = (f, id) => { const x = content(f).items.find(i => i.id === id); if (!x || !x.gid) throw new Error(`${f}/${id} has no gid: the check needs it`); return x.gid; };
const G = { quijote: gidOf('restaurants', 'quijote'), gramona: gidOf('todo', 'gramona'), montserrat: gidOf('todo', 'montserrat'), poblet: gidOf('todo', 'poblet'), codorniu: gidOf('todo', 'codorniu'), recaredo: gidOf('todo', 'recaredo'), comaruga: gidOf('todo', 'beach-comaruga') };
const TOWN_GID = 'TestTownGid0000000000', CITY_GID = 'TestCityGid0000000000', TILE_GID = 'TestTileGid0000000000';
// What the fake card does for each place: [answer, height in px]. Anything not listed: a card with a status line.
const PLAN = { [G.gramona]: ['load', 105], [G.montserrat]: ['error', 0], [G.poblet]: ['never', 0] };

// Builds, quietly, with exactly the environment given for the key (the shell's own variable never leaks in).
const build = (name, siteArg, key) => {
  const out = join(TMP, name), env = { ...process.env, SITE: siteArg };
  delete env.GOOGLE_MAPS_BROWSER_KEY; if (key) env.GOOGLE_MAPS_BROWSER_KEY = key;
  const r = spawnSync('npx', ['vite', 'build', '--config', resolve('engine/vite.config.js'), '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit', env });
  if (r.status) throw new Error(`build ${name} failed`);
  return out;
};
// The patched copy: content, i18n, public files, site.json and theme.css only (never private/).
const patched = () => {
  const d = join(TMP, 'site');
  for (const f of ['site.json', 'theme.css', 'content', 'i18n', 'public']) if (existsSync(join(SD, f))) cpSync(join(SD, f), join(d, f), { recursive: true });
  const edit = (f, fn) => { const p = join(d, 'content', f + '.json'), j = JSON.parse(readFileSync(p, 'utf8')); fn(j); writeFileSync(p, JSON.stringify(j)); };
  edit('todo', j => { for (const x of j.items) { if (x.id === 'beach-comaruga') delete x.always; if (x.icon === 'town' && !x.gid) x.gid = TOWN_GID; if (x.icon === 'city' && !x.gid) x.gid = CITY_GID; } });
  let tile = null;
  edit('quick', j => { const q = j.items.find(x => !x.trains && x.phone !== undefined) || j.items.find(x => !x.trains); if (q) { tile = q.id; delete q.schedule; delete q.always; delete q.hours; delete q.price; q.gid = TILE_GID; q.lat = q.lat || 41.2; q.lng = q.lng || 1.5; } });
  const t = JSON.parse(readFileSync(join(d, 'content', 'todo.json'), 'utf8')).items;
  return { dir: d, tile, town: t.find(x => x.gid === TOWN_GID)?.id, city: t.find(x => x.gid === CITY_GID)?.id };
};

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const serve = (root, port) => createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) p = join(root, 'index.html'); r.setHeader('content-type', mime[extname(p)] || 'application/octet-stream'); r.end(readFileSync(p)); }).listen(port);

// The fake Google: the bootstrap loader asks maps/api/js?...&callback=google.maps.__ib__; the fake defines what the
// real script would and calls back. Each card counts itself (made) and its one request (req) in window.__gc.
const fakeScript = plan => `(() => {
  const PLAN = ${JSON.stringify(plan)}, C = window.__gc = { made: 0, req: [] };
  class Fake extends HTMLElement {
    constructor() { super(); C.made++; this._r = this.attachShadow({ mode: 'closed' }); this._r.innerHTML = '<style>:host{display:block}</style><div style="height:40px"></div>'; }
    connectedCallback() {
      if (this._asked) return; this._asked = true;
      const gid = this.querySelector('gmp-place-details-place-request')?.getAttribute('place');
      C.req.push(gid);
      const [what, h] = PLAN[gid] || ['load', 125];
      if (what === 'never') return;
      setTimeout(() => {
        if (what === 'error') { this.dispatchEvent(new Event('gmp-error')); return; }
        this._r.querySelector('div').style.height = h + 'px';
        this.dispatchEvent(new Event('gmp-load'));
      }, 300);
    }
  }
  customElements.define('gmp-place-details-compact', Fake);
  google.maps.importLibrary = async () => ({});
  google.maps.__ib__();
})();`;

const GOOGLE = /(^|\.)(google(apis|usercontent|tagmanager|-analytics)?\.[a-z.]+|gstatic\.com|ggpht\.com|doubleclick\.net)$/;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let bad = 0;
const fail = (where, msg) => { bad++; console.log(`${where}: ${msg}`); };

// A fresh page (no service worker, so every request goes through the routes), counting what goes to Google.
async function open(base, l, route) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 900 }, serviceWorkers: 'block' });
  const net = { script: 0, real: [] };
  await ctx.route(u => GOOGLE.test(new URL(u).hostname), r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'maps.googleapis.com' && u.pathname === '/maps/api/js') { net.script++; return r.fulfill({ contentType: 'text/javascript', body: fakeScript(PLAN) }); }
    net.real.push(u.href); return r.abort();
  });
  const pg = await ctx.newPage();
  await pg.goto(`${base}?lang=${l}${route}`); await pg.waitForTimeout(700);
  return { ctx, pg, net };
}
const sel = id => `.mrow[data-id="${id}"]`;
// The state of one row: its body's height, each button's place inside the body (not ours), which are shown, the slot.
const rowState = (pg, id) => pg.evaluate(s => {
  const r = document.querySelector(s); if (!r) return null;
  const B = r.querySelector('.mbody'), T = B.getBoundingClientRect(), slot = B.querySelector(':scope > [data-gcard]');
  return {
    open: r.open, h: Math.round(T.height), placed: !!slot && !!slot.previousElementSibling && slot.previousElementSibling.classList.contains('where'),
    slotShown: !!(slot && slot.getClientRects().length), vis: slot ? getComputedStyle(slot).visibility : '',
    btns: [...B.querySelectorAll('.actions .btn')].filter(a => !a.hasAttribute('data-gbtn')).map(a => { const x = a.getBoundingClientRect(); return [Math.round(x.left - T.left), Math.round(x.top - T.top), Math.round(x.width), Math.round(x.height)].join(','); }),
    gbtn: (() => { const g = B.querySelector('[data-gbtn]'); return g ? { shown: !!g.getClientRects().length, last: g === g.parentElement.lastElementChild } : null; })(),
    slot: !!slot, on: !!(slot && slot.classList.contains('on')), el: !!B.querySelector('gmp-place-details-compact'),
    elH: Math.round(B.querySelector('gmp-place-details-compact')?.getBoundingClientRect().height || 0)
  };
}, sel(id));
const click = (pg, id) => pg.evaluate(s => document.querySelector(s + ' > summary').click(), sel(id));
const counts = pg => pg.evaluate(() => window.__gc ? { made: window.__gc.made, req: window.__gc.req.slice() } : { made: 0, req: [] });
// Page wider than the screen, and anything drawn on top of a shown card (text, buttons, icons, images).
const layout = pg => pg.evaluate(() => {
  const out = [], hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  if (document.documentElement.scrollWidth > innerWidth) out.push('page wider than the screen');
  for (const c of document.querySelectorAll('.gcard.on gmp-place-details-compact')) {
    const R = c.getBoundingClientRect();
    if (R.right > innerWidth + 0.5 || R.left < -0.5) out.push('the card runs past the screen');
    const V = document.getElementById('view'), tw = document.createTreeWalker(V, NodeFilter.SHOW_TEXT);
    // Inside a closed row nothing is drawn (Chromium still gives those boxes), so closed rows are skipped.
    for (let t; (t = tw.nextNode());) { if (!t.textContent.trim() || c.contains(t) || t.parentElement.closest('details:not([open])')) continue; const rg = document.createRange(); rg.selectNodeContents(t); for (const x of rg.getClientRects()) if (hit(R, x)) out.push(`"${t.textContent.trim().slice(0, 24)}" sits on the card`); }
    V.querySelectorAll('a, button, svg, img, canvas').forEach(e => { if (e.contains(c) || c.contains(e) || !e.getClientRects().length || e.closest('details:not([open])')) return; if (hit(R, e.getBoundingClientRect())) out.push(`${e.tagName.toLowerCase()}.${e.getAttribute('class') || ''} sits on the card`); });
  }
  return out;
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// The buttons' places among themselves (from the first one), for a row that closed up over a card that did not come.
const rel = btns => { const p = btns.map(x => x.split(',').map(Number)); return p.map(([x, y, w, h]) => [x, y - p[0][1], w, h].join(',')); };

try {
  const withKey = build('key', site, FAKE_KEY), noKey = build('nokey', site, ''), P = patched(), patchedKey = build('patched', P.dir, FAKE_KEY);
  for (const [i, root] of [withKey, noKey, patchedKey].entries()) serve(root, 5310 + i);
  const [KEY, NOKEY, PATCH] = [5310, 5311, 5312].map(p => `http://localhost:${p}/`);
  if (!readFileSync(join(withKey, 'index.html'), 'utf8').includes(`content="${FAKE_KEY}"`)) fail('build', 'the key build has no key in its page');
  if (!/name="gmaps-key" content=""/.test(readFileSync(join(noKey, 'index.html'), 'utf8'))) fail('build', 'the build without the variable has a key in its page');

  for (const l of ['de', 'fr']) {
    const at = s => `${l} ${s}`;
    // 1. Eat and drink: the place with no hours of ours gets the card once opened; one with hours never has a slot.
    { const { ctx, pg, net } = await open(KEY, l, '#s/restaurants');
      const withHours = (await pg.evaluate(() => [...document.querySelectorAll('.mrow')].find(r => !r.querySelector('[data-gcard]'))?.dataset.id));
      if (!withHours) fail(at('restaurants'), 'every row has a slot');
      if (await pg.evaluate(() => document.querySelector('.mrow[data-id="restaurants-locanda"] [data-gcard]'))) fail(at('restaurants'), 'a place with hours of ours has a slot');
      const id = 'restaurants-quijote';
      const s0 = await rowState(pg, id);
      if (!s0 || !s0.slot) fail(at(id), 'no slot'); else {
        if (!s0.placed) fail(at(id), 'the slot is not under the address, where our hours go');
        if (!s0.gbtn || !s0.gbtn.last) fail(at(id), 'our Google Maps button is not last in the actions');
        if (net.script || (await counts(pg)).req.length) fail(at(id), 'Google was asked before the row was opened');
        await click(pg, id); const before = await rowState(pg, id);
        if (before.on || before.vis !== 'hidden') fail(at(id), 'the card shows before it loaded');
        if (!before.slotShown) fail(at(id), 'the row keeps no room for the card while it loads');
        if (before.gbtn.shown) fail(at(id), 'our Google Maps button shows while a card may still come');
        await pg.waitForSelector(`${sel(id)} .gcard.on`, { timeout: 4000 }).catch(() => fail(at(id), 'the card was not shown'));
        const after = await rowState(pg, id);
        if (!after.placed) fail(at(id), 'the card is not under the address');
        if (after.h !== before.h) fail(at(id), `the row changed height when the card came: ${before.h} / ${after.h}`);
        if (after.gbtn.shown) fail(at(id), 'our Google Maps button is still shown beside the card');
        if (!same(before.btns, after.btns)) fail(at(id), `a button moved: ${before.btns} / ${after.btns}`);
        if (after.elH !== 125) fail(at(id), `card height ${after.elH}`);
        for (const x of await layout(pg)) fail(at(id), x);
        // Closed and opened again, a filter, the language: the same card, never a second request.
        await click(pg, id); await click(pg, id); await pg.waitForTimeout(300);
        await pg.evaluate(() => document.querySelector('[data-openf="any"], [data-sgroup="all"], [data-featf]')?.click()); await pg.waitForTimeout(300);
        await pg.evaluate(o => { const s = document.getElementById('langSel'); s.value = o; s.dispatchEvent(new Event('change')); }, l === 'de' ? 'fr' : 'de'); await pg.waitForTimeout(300);
        const again = await rowState(pg, id), c = await counts(pg);
        if (!again.open || !again.on || again.gbtn.shown) fail(at(id), 'after a filter and a language change the card is gone or our button is back');
        if (c.made !== 1 || c.req.filter(g => g === G.quijote).length !== 1) fail(at(id), `cards made ${c.made}, requests ${c.req.length}`);
        if (net.script !== 1) fail(at(id), `Google's script asked ${net.script} times`);
      }
      if (net.real.length) fail(at('restaurants'), 'a real Google host was asked: ' + net.real[0]);
      await ctx.close(); }

    // 2. Things to do: Google's card with nothing to say, an error, a card that never comes: the slot goes, the row closes
    // up with its buttons as they were among themselves, our button kept.
    // A beach (open all day) has no slot; a place that gets the card, opened with the others, still gets it.
    { const { ctx, pg, net } = await open(KEY, l, '#s/todo');
      if (await pg.evaluate(() => document.querySelector('.mrow[data-id="todo-beach-comaruga"] [data-gcard]'))) fail(at('todo'), 'a beach has a slot');
      const ids = ['todo-gramona', 'todo-montserrat', 'todo-poblet'], before = {};
      for (const id of ids) { await click(pg, id); }
      for (const id of ids) before[id] = await rowState(pg, id);
      await click(pg, 'todo-codorniu');
      await pg.waitForTimeout(6800);   // the real wait for a card that never answers (CARD_WAIT_MS), and a little more
      for (const id of ids) { const a = await rowState(pg, id), x = before[id];
        if (!x.slot) { fail(at(id), 'no slot'); continue; }
        if (a.on || a.el) fail(at(id), 'a card without hours, failed or silent is still there');
        if (!a.gbtn.shown) fail(at(id), 'our Google Maps button was hidden');
        if (a.slotShown) fail(at(id), 'the slot still takes room');
        if (a.h >= x.h || !same(rel(a.btns), rel(x.btns))) fail(at(id), `the row did not close up as it was: ${x.h} ${x.btns} / ${a.h} ${a.btns}`); }
      const cd = await rowState(pg, 'todo-codorniu');
      if (!cd.on || cd.gbtn.shown) fail(at('todo-codorniu'), 'the card was not shown');
      // A dropped place is not asked again.
      await click(pg, 'todo-gramona'); await click(pg, 'todo-gramona'); await pg.waitForTimeout(500);
      const c = await counts(pg);
      if (c.req.filter(g => g === G.gramona).length !== 1) fail(at('todo-gramona'), 'asked again after being dropped');
      if (net.script !== 1) fail(at('todo'), `Google's script asked ${net.script} times`);
      for (const x of await layout(pg)) fail(at('todo'), x);
      if (net.real.length) fail(at('todo'), 'a real Google host was asked: ' + net.real[0]);
      await ctx.close(); }

    // 3. Offline before the list opens: no slot, no request.
    { const { ctx, pg, net } = await open(KEY, l, '#home');
      await ctx.setOffline(true);
      await pg.evaluate(() => { location.hash = '#s/todo'; }); await pg.waitForTimeout(500);
      if (await pg.evaluate(() => document.querySelectorAll('[data-gcard]').length)) fail(at('offline'), 'slots drawn offline');
      await click(pg, 'todo-recaredo'); await pg.waitForTimeout(800);
      if (net.script || net.real.length) fail(at('offline'), 'Google was asked offline');
      if (!(await rowState(pg, 'todo-recaredo')).btns.length) fail(at('offline'), 'the row lost its buttons');
      await ctx.close(); }

    // 4. Without the variable: no slot anywhere, no request at all, and the credits say nothing of the card.
    { const { ctx, pg, net } = await open(NOKEY, l, '#s/todo');
      if (await pg.evaluate(() => document.querySelectorAll('[data-gcard], [data-gbtn]').length)) fail(at('no key'), 'slots without a key');
      for (const id of ['todo-gramona', 'todo-codorniu']) await click(pg, id);
      await pg.evaluate(() => { location.hash = '#s/restaurants'; }); await pg.waitForTimeout(400); await click(pg, 'restaurants-quijote'); await pg.waitForTimeout(800);
      if (await pg.evaluate(() => document.querySelectorAll('[data-gcard], [data-gbtn]').length)) fail(at('no key'), 'slots without a key');
      await pg.evaluate(() => { location.hash = '#credits'; }); await pg.waitForTimeout(400);
      if (await pg.evaluate(() => document.querySelectorAll('.credits .crs')[2]?.querySelectorAll('p').length) !== 1) fail(at('no key'), 'the credits speak of the card');
      if (net.script || net.real.length) fail(at('no key'), 'Google was asked without a key');
      await ctx.close(); }
    { const { ctx, pg } = await open(KEY, l, '#credits');
      if (await pg.evaluate(() => document.querySelectorAll('.credits .crs')[2]?.querySelectorAll('p').length) !== 2) fail(at('credits'), 'with a key the credits do not say the card loads from Google');
      for (const x of await layout(pg)) fail(at('credits'), x);
      await ctx.close(); }

    // 5. The patched copy: a beach not open all day, a town and a city with a Google id never ask; the tile page does.
    { const { ctx, pg, net } = await open(PATCH, l, '#s/todo');
      for (const id of ['beach-comaruga', P.town, P.city].filter(Boolean)) if (await pg.evaluate(s => document.querySelector(s + ' [data-gcard]'), sel('todo-' + id))) fail(at('todo-' + id), 'a place with no door has a slot');
      if (!P.town || !P.city) fail(at('patched'), 'no town or city to try');
      if (P.tile) {
        await pg.evaluate(t => { location.hash = '#p/' + t; }, P.tile); await pg.waitForTimeout(150);
        const st = () => pg.evaluate(() => { const s = document.querySelector('.place [data-gcard]'), g = document.querySelector('.place [data-gbtn]'), W = document.querySelector('.place').getBoundingClientRect();
          return { slot: !!s, on: !!s?.classList.contains('on'), gbtn: g ? { shown: !!g.getClientRects().length, last: g === g.parentElement.lastElementChild } : null, h: Math.round(W.height),
            btns: [...document.querySelectorAll('.pl-actions > *:not([data-gbtn])')].map(a => { const x = a.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width)].join(','); }) }; });
        const x = await st();
        if (!x.slot) fail(at('tile ' + P.tile), 'no slot on the tile page'); else {
          if (!x.gbtn || !x.gbtn.last) fail(at('tile'), 'our Google Maps button is not last');
          await pg.waitForSelector('.place .gcard.on', { timeout: 4000 }).catch(() => fail(at('tile'), 'the card was not shown'));
          const y = await st();
          if (y.gbtn.shown) fail(at('tile'), 'our Google Maps button is still shown');
          if (!same(x.btns, y.btns)) fail(at('tile'), 'a button moved');
          if (!(await pg.evaluate(() => document.querySelector('.place .gcard.on h3')?.textContent.trim()))) fail(at('tile'), 'the card has no heading');
          for (const z of await layout(pg)) fail(at('tile'), z);
        }
      } else fail(at('patched'), 'no Home quick tile to try');
      if (net.real.length) fail(at('patched'), 'a real Google host was asked: ' + net.real[0]);
      await ctx.close(); }
  }
} catch (e) { fail('check', e.stack || e.message); }
await b.close();
rmSync(TMP, { recursive: true, force: true });
console.log(bad ? `Google card check: ${bad} problem(s)` : 'Google card check OK');
process.exit(bad ? 1 : 0);
