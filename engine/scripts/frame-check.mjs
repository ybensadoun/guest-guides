// Frame check (engine/src/modules/README.md): every tile and card of Home in every size it offers, measured as the UX check
// measures (engine/scripts/ux-measures.mjs: a shape on text, an icon or the arrow; a word wider than its line; a page wider
// than the screen), plus a hole in Home's grid and a word of a tile or card cut over two lines, in all the site's
// languages at 360, 390 and 430 px, at two times of the week (a card's status changes its lines: by day, and late in the
// evening when a place opens "tomorrow").
// Builds temporary copies of the site (never its own folder, never private/), each with a content/home.json:
//   "as is"        the site's own sections, cards and map;
//   "every module" the same copy with Getting around as a tile (its card's "tile" taken out), and Nightlife and one
//                  section with no shape of its own (Arrival and parking) added when the site has none, so every
//                  module's look is tried.
// The arrangements are chosen with the frame itself (modules/frame.js resolve) until every thing has been drawn in every
// size it offers: all half, all wide, tall beside two half tiles, turned so that each one takes each place.
// Pictures of each arrangement in English and German at 360 px go into the folder it names (default: a new temporary one).
// Needs Playwright (as ux-check.mjs): node engine/scripts/frame-check.mjs <site> [picture folder]
import { createServer } from 'http'; import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, rmSync, cpSync } from 'fs'; import { join, extname, resolve as rpath } from 'path'; import { tmpdir } from 'os';
import { resolve, thing } from '../src/modules/frame.js';
import { OFFERS } from '../src/modules/offers.js';
import { measure } from './ux-measures.mjs';
const [site, picsArg] = process.argv.slice(2);
if (!site) { console.error('Usage: node engine/scripts/frame-check.mjs <site> [picture folder]'); process.exit(1); }
const { chromium } = await import('playwright');
const SD = rpath('sites', site), TMP = mkdtempSync(join(tmpdir(), 'frame-check-'));
const PICS = picsArg ? rpath(picsArg) : mkdtempSync(join(tmpdir(), 'frame-pictures-'));
mkdirSync(PICS, { recursive: true });
const SITE = JSON.parse(readFileSync(join(SD, 'site.json'), 'utf8')), LANGS = SITE.languages, on = id => (SITE.modules || {})[id] !== false;
const shotLangs = ['en', 'de'].filter(l => LANGS.includes(l)).length ? ['en', 'de'].filter(l => LANGS.includes(l)) : [LANGS[0]];

// A copy of the site: site.json, theme.css, content, i18n, public (never private/).
const copy = name => { const d = join(TMP, name); for (const f of ['site.json', 'theme.css', 'content', 'i18n', 'public']) if (existsSync(join(SD, f))) cpSync(join(SD, f), join(d, f), { recursive: true }); return d; };
const rd = (d, f) => JSON.parse(readFileSync(join(d, 'content', f + '.json'), 'utf8'));
const wr = (d, f, j) => writeFileSync(join(d, 'content', f + '.json'), JSON.stringify(j, null, 1));
const has = (d, f) => existsSync(join(d, 'content', f + '.json'));

// The guide as the frame sees it, from a copy's files (as engine/src/content.js reads them; every card counts as shown).
function frameGuide(d) {
  const S = JSON.parse(readFileSync(join(d, 'site.json'), 'utf8')), on2 = id => (S.modules || {})[id] !== false;
  const nMarkets = has(d, 'markets') ? (rd(d, 'markets').markets || []).length : 0;
  const secs = rd(d, 'sections').sections.filter(s => on2(s.id) && !(s.id === 'markets' && !nMarkets));
  const tr = secs.find(s => s.kind === 'transport' && s.status === 'live'), trTile = tr && has(d, tr.file || tr.id) && rd(d, tr.file || tr.id).tile;
  const quick = on2('quick') && has(d, 'quick') ? rd(d, 'quick').items || [] : [];
  return { sections: secs.map(({ id, kind, group, status }) => ({ id, kind, group, status })), map: on2('map'), transportCard: trTile ? tr.id : null, offers: OFFERS,
    highlights: [...quick.map(q => ({ id: q.id, wide: !!q.wide })), ...(trTile ? [{ id: tr.id, wide: !!trTile.wide }] : [])] };
}

// "every module": Getting around as a tile, Nightlife and a section with no shape of its own added when missing.
function everyModule(d) {
  const secFile = rd(d, 'sections'), S = JSON.parse(readFileSync(join(d, 'site.json'), 'utf8')), added = [];
  S.modules = S.modules || {};
  const tr = secFile.sections.find(s => s.kind === 'transport');
  if (tr && has(d, tr.file || tr.id)) { const t = rd(d, tr.file || tr.id); if (t.tile) { delete t.tile; wr(d, tr.file || tr.id, t); added.push('Getting around as a tile'); } }
  if (!secFile.sections.some(s => s.id === 'nightlife') || S.modules.nightlife === false) {
    const src = ['restaurants', 'todo'].find(f => has(d, f));
    if (src) {
      if (!secFile.sections.some(s => s.id === 'nightlife')) { secFile.sections.push({ id: 'nightlife', group: 'area', kind: 'spots', labelKey: 'nightlife', status: 'live' }); wr(d, 'nightlife', rd(d, src)); }
      S.modules.nightlife = true; added.push('Nightlife');
    }
  }
  if (!secFile.sections.some(s => s.id === 'arrival') && has(d, 'message')) {
    secFile.sections.splice(secFile.sections.findIndex(s => s.group === 'area'), 0, { id: 'arrival', group: 'house', kind: 'info', labelKey: 'arrival', status: 'live', file: 'message' });
    S.modules.arrival = true; added.push('Arrival and parking (no shape of its own)');
  }
  wr(d, 'sections', secFile); writeFileSync(join(d, 'site.json'), JSON.stringify(S, null, 1));
  return added;
}

// Candidate arrangements and what each draws (resolved by the frame, so the packing is the real one).
const P = (kind, id, size) => (kind === 'map' ? { kind, size } : { kind, id, size });
function candidates(g) {
  const ths = [...g.sections.map(s => thing({ kind: 'section', id: s.id }, g)).filter(Boolean), ...g.highlights.map(q => thing({ kind: 'highlight', id: q.id }, g)), ...(g.map ? [thing({ kind: 'map' }, g)] : [])];
  const E = ths.filter(t => t.kind === 'section' && t.widget === 'entry'), L = ths.filter(t => t.widget === 'live'), H = ths.filter(t => t.kind === 'highlight');
  const rot = (a, r) => a.map((_, i) => a[(i + r) % a.length]);
  const tail = [...L.map(t => P('section', t.id, 'wide')), ...(g.map ? [P('map', null, 'wide')] : [])];
  const out = [{ name: 'wide', arr: { house: E.map(t => P('section', t.id, 'wide')), area: [...H.map(t => P('highlight', t.id, 'wide')), ...tail] } }];
  // Entry tiles that have the three sizes take turns being tall; one that is wide only (events) follows them, wide, so
  // it never sits between a tall tile and the two half tiles it needs.
  const T = E.filter(t => t.sizes.includes('tall')), W = E.filter(t => !t.sizes.includes('tall')).map(t => P('section', t.id, 'wide'));
  for (let r = 0; r < Math.max(T.length, H.length, 1); r++) {
    const e = rot(T, r), h = rot(H, r);
    out.push({ name: `half-${r + 1}`, arr: { house: [...e.map(t => P('section', t.id, 'half')), ...W], area: [...h.map(t => P('highlight', t.id, 'half')), ...tail] } });
    out.push({ name: `tall-${r + 1}`, arr: { house: [...e.map((t, i) => P('section', t.id, i % 3 === 0 ? 'tall' : 'half')), ...W], area: [...h.map(t => P('highlight', t.id, 'half')), ...tail] } });
  }
  const want = new Set(ths.flatMap(t => t.sizes.map(s => `${t.kind === 'map' ? 'map' : t.id}:${s}`)));
  return { out, want };
}
const drawnBy = (arr, g) => { const R = resolve(arr, g), s = new Set(); for (const grp of ['house', 'area']) for (const run of R[grp]) for (const x of run.items) s.add(`${x.kind === 'map' ? 'map' : x.id}:${x.size}`); return s; };
function choose(g) {
  const { out, want } = candidates(g), left = new Set(want), pick = [];
  while (left.size) {
    let best = null, gain = 0;
    for (const c of out) { const n = [...drawnBy(c.arr, g)].filter(k => left.has(k)).length; if (n > gain) { best = c; gain = n; } }
    if (!best) break;
    pick.push(best); for (const k of drawnBy(best.arr, g)) left.delete(k);
  }
  return { pick, missing: [...left] };
}

const build = (name, dir) => {
  const outDir = join(TMP, 'dist-' + name), env = { ...process.env, SITE: dir }; delete env.GOOGLE_MAPS_BROWSER_KEY;
  const r = spawnSync('npx', ['vite', 'build', '--config', rpath('engine/vite.config.js'), '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit', env });
  if (r.status) throw new Error(`build ${name} failed`);
  return outDir;
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
let ROOT = null;
const srv = createServer((q, r) => { let p = join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, 'index.html'); r.setHeader('content-type', mime[extname(p)] || 'application/octet-stream'); r.end(readFileSync(p)); });
await new Promise(res => srv.listen(0, res));
const base = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch();

// A hole in Home's grids: at the top and the bottom of every tile, both columns are covered by some tile of its grid.
const holeCheck = () => {
  const out = [];
  for (const G of document.querySelectorAll('#view .ggrid, #view .qcalls')) {
    const items = [...G.children].map(e => e.getBoundingClientRect()), R = G.getBoundingClientRect(), xs = [R.left + R.width / 4, R.left + R.width * 3 / 4];
    const at = (x, y) => items.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    for (const r of items) for (const y of [r.top + 2, r.bottom - 2]) if (xs.some(x => !at(x, y))) { out.push(`a hole in the grid (${G.className}) beside "${(G.children[items.indexOf(r)].textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`); break; }
  }
  return out;
};

// A word cut over two lines on a tile or a card, even one that would fit on a line of its own (the UX check finds only
// words wider than their line): "conve-nience" on a half card, "Opens to-morrow" in a card's status. Counted since 21 Nov
// 2026 (rule 14: no word is cut in two on Home); before, Ca La Kimberly's own Home had some ("si-tios" in Spanish) and
// they were only noted.
const splitCheck = () => {
  const out = [];
  for (const e of document.querySelectorAll('#view .gt, #view .qcall')) {
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let t; (t = tw.nextNode());) {
      const re = /[^\s\u00ad/-]+/g; let m;
      while ((m = re.exec(t.textContent))) {
        // Letter by letter, each on the line where it is drawn: after a break at a soft hyphen of the content (allowed), the
        // browser counts the hyphen it draws at the end of the first line with the letter that follows it.
        const tops = new Set();
        for (let i = 0; i < m[0].length; i++) {
          const r = document.createRange(); r.setStart(t, m.index + i); r.setEnd(t, m.index + i + 1);
          const ys = [...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top)); if (ys.length) tops.add(Math.max(...ys));
        }
        if (tops.size > 1) out.push(`"${m[0]}" is cut over two lines (${e.dataset.k || e.dataset.q})`);
      }
    }
  }
  return out;
};

// Two times of the week, the same at every run: a weekday morning, and late on a Saturday, when a card says "Closed ·
// Opens tomorrow 9:00".
const TIMES = [['day', '2026-11-24T11:00:00+01:00'], ['night', '2026-11-21T23:30:00+01:00']];
let bad = 0;
const report = [];
const variants = [['as-is', copy('as-is'), []]];
{ const d = copy('every-module'); variants.push(['every-module', d, everyModule(d)]); }
for (const [vname, dir, added] of variants) {
  const g = frameGuide(dir), { pick, missing } = choose(g);
  console.log(`\n${vname}${added.length ? ` (${added.join(', ')})` : ''}: ${pick.length} arrangements: ${pick.map(p => p.name).join(', ')}`);
  for (const m of missing) { bad++; console.log(`  never drawn in this size: ${m}`); }
  for (const { name, arr } of [{ name: 'default', arr: null }, ...pick]) {
    const homeFile = join(dir, 'content', 'home.json');
    if (arr) writeFileSync(homeFile, JSON.stringify({ _doc: 'frame-check: a temporary arrangement', ...arr }, null, 1)); else rmSync(homeFile, { force: true });
    ROOT = build(`${vname}-${name}`, dir);
    const sizes = [...drawnBy(arr, g)].join(' ');
    report.push(`${vname}/${name}: ${sizes}`);
    for (const [tn, iso] of TIMES) for (const w of [360, 390, 430]) for (const l of LANGS) {
      const pg = await b.newPage({ viewport: { width: w, height: 900 } });
      await pg.clock.setFixedTime(new Date(iso));
      await pg.route('**/*', r => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
      await pg.goto(`${base}?lang=${l}`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
      const res = [...new Set([...(await pg.evaluate(measure)), ...(await pg.evaluate(holeCheck)), ...(await pg.evaluate(splitCheck))])];
      for (const x of res) { bad++; console.log(`  ${name} ${w}px ${l}, ${tn}: ${x}`); }
      if (tn === 'day' && w === 360 && shotLangs.includes(l)) {
        await pg.addStyleTag({ content: 'canvas,.maplibregl-canvas{visibility:hidden!important}' });
        // From the "At the house" heading to the last tile or card of "Around the house".
        const box = await pg.evaluate(() => { const first = document.querySelector('#view h2.sh'), blocks = [...document.querySelectorAll('#view .ggrid, #view .qcalls')], last = blocks[blocks.length - 1] || first;
          return { top: first.getBoundingClientRect().top + scrollY - 8, bottom: last.getBoundingClientRect().bottom + scrollY + 8 }; });
        await pg.setViewportSize({ width: 360, height: Math.ceil(box.bottom) + 20 }); await pg.waitForTimeout(200);
        await pg.screenshot({ path: join(PICS, `${vname}-${name}-${l}.png`), clip: { x: 0, y: Math.floor(box.top), width: 360, height: Math.ceil(box.bottom - box.top) } });
      }
      await pg.close();
    }
  }
}
await b.close(); srv.close(); rmSync(TMP, { recursive: true, force: true });
writeFileSync(join(PICS, 'arrangements.txt'), report.join('\n') + '\n');
console.log(`\nPictures (en, de at 360 px) and the list of arrangements: ${PICS}`);
console.log(bad ? `Frame check: ${bad} problem(s)` : 'Frame check OK');
process.exit(bad ? 1 : 0);
