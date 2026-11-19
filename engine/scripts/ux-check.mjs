// UX check (docs/UX-GUIDELINES.md): renders Home, seven sections, Sources and credits and one place page at phone widths in every language
// of a site and reports any decorative shape (tile ::before / ::after) that touches text, an icon or an arrow, a
// floating back or language button that sits on the page's text or icons before any scroll, plus any page wider than
// the screen. The measures themselves are in ux-measures.mjs (shared with frame-check.mjs).
// Needs Playwright (npx playwright) and a built site: node engine/scripts/ux-check.mjs <site> [chromium path]
// Or a live guide: node engine/scripts/ux-check.mjs <site> --url https://porta-guides.netlify.app/g/<slug> (the site folder gives the languages).
// Or the site in a colour world (engine/src/worlds.js): WORLD=<id> node engine/scripts/ux-check.mjs <site> builds it in that
// world into a temporary folder first, as `WORLD=<id> npm run build -- <site>` would (its own dist is not touched).
import { createServer } from 'http'; import { spawnSync } from 'child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'fs'; import { join, extname, resolve } from 'path'; import { tmpdir } from 'os';
import { measure } from './ux-measures.mjs';
const args = process.argv.slice(2), ui = args.indexOf('--url'), URLBASE = ui >= 0 ? args.splice(ui, 2)[1] : null;
const [site, exe] = args;
const { chromium } = await import('playwright');
const WORLD = !URLBASE && process.env.WORLD, TMP = WORLD && mkdtempSync(join(tmpdir(), 'ux-check-'));
if (WORLD) {
  const env = { ...process.env, SITE: site }; delete env.GOOGLE_MAPS_BROWSER_KEY;
  const r = spawnSync('npx', ['vite', 'build', '--config', resolve('engine/vite.config.js'), '--outDir', TMP, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit', env });
  if (r.status) { rmSync(TMP, { recursive: true, force: true }); process.exit(r.status); }
  console.log(`world ${WORLD}`);
}
const root = WORLD ? TMP : resolve('sites', site, 'dist'), langs = JSON.parse(readFileSync(resolve('sites', site, 'site.json'))).languages;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) p = join(root, 'index.html'); r.setHeader('content-type', mime[extname(p)] || 'application/octet-stream'); r.end(readFileSync(p)); }).listen(5299);
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let bad = 0;
for (const w of [360, 390, 430]) for (const l of langs) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 } });
  let res = [];
  const routes = ['', '#markets/today', '#s/restaurants', '#s/todo', '#s/house', '#s/events', '#s/transport', '#s/garbage', '#credits'];
  for (const route of routes) {
  await pg.goto(`${URLBASE || 'http://localhost:5299/'}?lang=${l}${route}`); await pg.waitForTimeout(800);
  if (!route) { const pl = await pg.evaluate(() => document.querySelector('a[href^="#p/"]')?.getAttribute('href')); if (pl) routes.push(pl); }   // the first place page Home links to
  res.push(...(await pg.evaluate(measure)).map(x => (route || '#home') + ' ' + x));
  }
  for (const x of [...new Set(res)]) { bad++; console.log(`${w}px ${l}: ${x}`); }
  await pg.close();
}
await b.close(); srv.close(); if (TMP) rmSync(TMP, { recursive: true, force: true });
console.log(bad ? `UX check: ${bad} problem(s)` : 'UX check OK');
process.exit(bad ? 1 : 0);
