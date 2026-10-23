// UX check (docs/UX-GUIDELINES.md): renders Home at phone widths in every language of a site and reports any
// decorative shape (tile ::before / ::after) that touches text, an icon or an arrow, plus any page wider than the screen.
// Needs Playwright (npx playwright) and a built site: node engine/scripts/ux-check.mjs <site> [chromium path]
// Or a live guide: node engine/scripts/ux-check.mjs <site> --url https://porta-guides.netlify.app/g/<slug> (the site folder gives the languages).
import { createServer } from 'http'; import { readFileSync, existsSync, statSync } from 'fs'; import { join, extname, resolve } from 'path';
const args = process.argv.slice(2), ui = args.indexOf('--url'), URLBASE = ui >= 0 ? args.splice(ui, 2)[1] : null;
const [site, exe] = args;
const { chromium } = await import('playwright');
const root = resolve('sites', site, 'dist'), langs = JSON.parse(readFileSync(resolve('sites', site, 'site.json'))).languages;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = createServer((q, r) => { let p = join(root, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) p = join(root, 'index.html'); r.setHeader('content-type', mime[extname(p)] || 'application/octet-stream'); r.end(readFileSync(p)); }).listen(5299);
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let bad = 0;
for (const w of [360, 390, 430]) for (const l of langs) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 } });
  let res = [];
  for (const route of ['', '#markets/today', '#s/restaurants', '#s/todo', '#s/house', '#s/events', '#s/transport']) {
  await pg.goto(`${URLBASE || 'http://localhost:5299/'}?lang=${l}${route}`); await pg.waitForTimeout(800);
  res.push(...(await pg.evaluate(() => {
    const out = [], hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
    for (const g of document.querySelectorAll('.gt')) {
      const T = g.getBoundingClientRect(), content = [];
      g.querySelectorAll('.ib,.go,.gt-bins,.gtb,.gt-tl,.soon-tag').forEach(e => content.push([e.className, e.getBoundingClientRect()]));
      g.querySelectorAll('.gt-t,.gt-m').forEach(e => { const r = document.createRange(); r.selectNodeContents(e); for (const x of r.getClientRects()) content.push([e.className, x]); });
      for (const ps of ['::before', '::after']) {
        const s = getComputedStyle(g, ps); if (s.content === 'none' || s.display === 'none') continue;
        const n = v => parseFloat(v) || 0;
        let w = Math.max(n(s.width), n(s.borderLeftWidth) + n(s.borderRightWidth)), h = Math.max(n(s.height), n(s.borderTopWidth) + n(s.borderBottomWidth));
        if (!w || !h) continue;
        const m = /matrix\(([^,]+), ([^,]+)/.exec(s.transform); if (m && Math.abs(parseFloat(m[2])) > 0.01 && Math.abs(parseFloat(m[1])) > 0.01) { const d = Math.hypot(w, h); w = h = d; } // tilted: use the bounding square
        const left = s.left !== 'auto' ? T.left + n(s.left) : T.right - n(s.right) - w, top = s.top !== 'auto' ? T.top + n(s.top) : T.bottom - n(s.bottom) - h;
        const R = { left: Math.max(left, T.left), top: Math.max(top, T.top), right: Math.min(left + w, T.right), bottom: Math.min(top + h, T.bottom) };
        if (R.right <= R.left || R.bottom <= R.top) continue;
        for (const [c, r] of content) if (hit(R, r)) out.push(`${g.dataset.k}${ps} touches ${c}`);
      }
    }
    // No word may break mid-word anywhere on the page: a word wider than its block means the label is too long
    // (shorten it, or put a soft hyphen in a long compound). Soft-hyphen parts are measured separately.
    const probe = document.createElement('span'); probe.style.cssText = 'white-space:nowrap;position:absolute;visibility:hidden;left:0;top:0'; document.body.append(probe);
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t; (t = tw.nextNode());) {
      if (!t.textContent.trim() || !t.parentElement.offsetParent) continue;
      let blk = t.parentElement; while (blk && getComputedStyle(blk).display.startsWith('inline')) blk = blk.parentElement;
      const bs = getComputedStyle(blk), ps = getComputedStyle(t.parentElement);
      if (bs.whiteSpace.includes('nowrap') || /auto|scroll|hidden/.test(bs.overflowX)) continue;
      const avail = blk.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
      probe.style.font = ps.font; probe.style.letterSpacing = ps.letterSpacing; probe.style.textTransform = ps.textTransform;
      for (const word of t.textContent.trim().split(/[\s\u00ad/-]+/)) { if (!word) continue; probe.textContent = word; if (probe.getBoundingClientRect().width > avail + 0.5) out.push(`"${word}" is wider than its line (${blk.className || blk.tagName})`); }
    }
    probe.remove();
    if (document.documentElement.scrollWidth > innerWidth) out.push('page wider than the screen');
    return out;
  })).map(x => (route || '#home') + ' ' + x));
  }
  for (const x of [...new Set(res)]) { bad++; console.log(`${w}px ${l}: ${x}`); }
  await pg.close();
}
await b.close(); srv.close();
console.log(bad ? `UX check: ${bad} problem(s)` : 'UX check OK');
process.exit(bad ? 1 : 0);
