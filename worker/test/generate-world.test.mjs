// The generator (engine/scripts/generate-site.py) gives a guide its colour world (engine/src/worlds.js) from the maker's
// answers.world ('sea'..., or 'cover' / 'logo' with answers.worldOwn, the world the maker made from that picture), older
// answers' colorsFrom, or Bauhaus summer. The old layouts (mood soft, minimal, mediterranean, rural, and --preset) were
// removed on 14 Nov 2026: an old mood is Bauhaus summer, and --preset is an unknown argument.
// Runs the generator on made-up answers into a site folder of its own, removed after; pictures are flat colours made
// with Pillow. Needs python3 with Pillow, as the worker does.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { WORLDS, worldOf, worldTokens } from '../../engine/src/worlds.js';
import { swatches, worldFromPicture } from '../../engine/src/picture-world.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = { placeName: 'Test house', town: 'Calafell', languages: ['en', 'es'] };
let n = 0;

// Pictures for the uploads, made with Pillow: 'RGB' fills the picture with the colours side by side; 'RGBA' is a
// transparent picture with one square of the first colour in its middle (a logo).
const PIL = `import json, sys
from PIL import Image
for path, mode, cols in json.loads(sys.argv[1]):
    rgb = lambda c: tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
    im = Image.new(mode, (200, 150), (255, 255, 255) if mode == 'RGB' else (0, 0, 0, 0)); w = 200 // len(cols)
    for i, c in enumerate(cols): im.paste(rgb(c) + ((255,) if mode == 'RGBA' else ()), (i * w, 0, (i + 1) * w, 150) if mode == 'RGB' else (50, 37, 150, 112))
    im.save(path)`;

// One generator run: answers, uploads [{ id, kind, mode, colours }], extra arguments. Gives the site's files and stdout.
function generate(answers, uploads = [], args = [], before, fails = false) {
  const src = mkdtempSync(join(tmpdir(), 'gen-world-')), slug = `zz-test-world-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads')); mkdirSync(join(src, 'assets'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { ...BASE, ...answers } }));
    writeFileSync(join(src, 'geocode.json'), '{}');
    if (uploads.length) {
      const p = spawnSync('python3', ['-c', PIL, JSON.stringify(uploads.map(u => [join(src, 'assets', u.id + '.png'), u.mode || 'RGB', u.colours]))], { encoding: 'utf8' });
      assert.equal(p.status, 0, p.stderr);
      for (const u of uploads) writeFileSync(join(src, 'uploads', u.id + '.json'), JSON.stringify({ kind: u.kind, assetId: u.id }));
    }
    if (before) before(site);
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2', '--lng', '1.5', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    if (fails) return { status: r.status, stderr: r.stderr || '', made: existsSync(join(site, 'site.json')) };
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const files = Object.fromEntries(['site.json', 'theme.css', 'docs/style-brief.md'].map(f => [f, existsSync(join(site, f)) ? readFileSync(join(site, f), 'utf8') : null]));
    const read = f => files[f];
    const pixel = (f, x, y) => spawnSync('python3', ['-c', `from PIL import Image; print('#%02X%02X%02X' % Image.open(${JSON.stringify(join(site, f))}).convert('RGB').getpixel((${x}, ${y})))`], { encoding: 'utf8' }).stdout.trim();
    return { slug, stdout: r.stdout, site: JSON.parse(read('site.json')), css: read('theme.css'), read, icon: pixel('public/favicon.png', 32, 32), mask: pixel('public/icons/icon-maskable-512.png', 5, 5) };
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}
// The world a flat picture of one colour makes, as the maker would (96 x 96, raw RGB).
const flat = c => { const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), b = Buffer.alloc(96 * 96 * 3); for (let i = 0; i < b.length; i += 3) b.set(rgb, i); return worldFromPicture(swatches(b, 3)); };
// What every guide in a world has in common: the base look (no preset), the world's paper and deep, no fonts, a theme.css
// with no colour, no style brief, and an onboarding block of world and palette only.
function inWorld(g, world) {
  const t = worldTokens(worldOf(world));
  assert.deepEqual(g.site.theme.world, world);
  assert.ok(!('preset' in g.site.theme), JSON.stringify(g.site.theme));
  assert.deepEqual(Object.keys(g.site.onboarding).sort(), ['palette', 'world']);
  assert.ok(!/"preset"/.test(g.stdout));
  assert.equal(g.site.theme.paper, t['--paper']); assert.equal(g.site.theme.manifestBackground, t['--paper']);
  assert.equal(g.site.theme.manifestTheme, t['--blue']);
  assert.equal(g.site.theme.fonts, undefined);
  assert.ok(!/--[a-z]|:root/.test(g.css), g.css);
  assert.equal(g.mask, t['--paper']);   // the maskable icon's paper
  assert.equal(g.read('docs/style-brief.md'), null);
  return t;
}

test('generator: world "sea" is the world Sea, with no colour of its own in theme.css', () => {
  const g = generate({ world: 'sea' }), t = inWorld(g, 'sea');
  assert.equal(g.site.theme.paper, '#F3F1EA');
  assert.equal(g.icon, t['--blue']);   // no photo, no logo: the icons are a tile in the world's deep
  assert.match(g.css, /colour world "sea"/);
  assert.equal(g.site.onboarding.world, 'sea');
  assert.match(g.stdout, /"world": "sea"/);
});

test('generator: "From your picture" keeps the world the maker made as it is', () => {
  const own = { base: 'stone', deep: '#2D5476', light: '#e3cb98' };
  const g = generate({ world: 'cover', worldOwn: own }, [{ id: 'c1', kind: 'cover', colours: ['#D52B1E'] }]);
  inWorld(g, own);
  assert.match(g.css, /colour world "stone" with colours of its own, from the host's cover picture/);
});

test('generator: "From your picture" with no world from the maker reads the cover picture', () => {
  const g = generate({ world: 'cover' }, [{ id: 'c1', kind: 'cover', colours: ['#2D7FB8'] }]);
  assert.deepEqual(flat('#2D7FB8'), { base: 'sea', deep: '#185782' });
  inWorld(g, { base: 'sea', deep: '#185782' });
  assert.match(g.css, /from the host's cover picture/);
});

test('generator: "From your picture" with no picture at all is Bauhaus summer, and says so', () => {
  for (const world of ['cover', 'logo']) {
    const g = generate({ world });
    inWorld(g, 'bauhaus');
    assert.match(g.stdout, /no picture to read, the guide is in the world "bauhaus"/);
    assert.ok(!/from the host/.test(g.css));
  }
});

test('generator: older answers with colours from the logo get the world the logo makes, even with an old layout', () => {
  const g = generate({ colorsFrom: 'From my logo', mood: 'rural' }, [{ id: 'l1', kind: 'logo', mode: 'RGBA', colours: ['#7A3E9D'] }]);
  const w = g.site.theme.world;
  assert.equal(typeof w, 'object'); assert.equal(w.base, 'night'); assert.ok(worldOf(w));
  for (const [k, v] of Object.entries(w)) assert.ok(k === 'base' || /^#[0-9A-F]{6}$/.test(v), `${k}: ${v}`);
  inWorld(g, w);
  assert.match(g.css, /from the host's logo/);
  assert.equal(g.site.logo, 'logo-head.png');
});

test('generator: an old layout (answers.mood rural or soft) is no longer read: Bauhaus summer, no preset', () => {
  for (const mood of ['rural', 'soft']) {
    const g = generate({ mood, styleBrief: 'Rustic farmhouse. Background #F4EFE6, text #2B2118, brand #4E6B3A, buttons #A3472B. Titles in Fraunces.' },
      [{ id: 'i1', kind: 'inspiration', colours: ['#B5651D', '#6B8E23'] }]);
    inWorld(g, 'bauhaus');
    assert.equal(g.site.theme.world, 'bauhaus');
    assert.match(g.css, /colour world "bauhaus"/);
  }
});

test('generator: --preset is an unknown argument now', () => {
  const r = generate({}, [], ['--preset', 'bauhaus'], undefined, true);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unrecognized arguments: --preset bauhaus/);
  assert.equal(r.made, false);
});

test('generator: no world is Bauhaus summer', () => {
  for (const answers of [{}, { mood: 'bold' }, { mood: 'auto' }, { world: 'mars' }]) inWorld(generate(answers), 'bauhaus');
});

test('generator: a world from the maker that is not a colour world is not trusted', () => {
  const made = flat('#2D7FB8');
  for (const worldOwn of [{ base: 'stone', deep: '#zzz' }, { base: 'mars', deep: '#2D5476' }, { base: 'stone', paper: '#FFFFFF' }, 'sea', ['stone']]) {
    const g = generate({ world: 'cover', worldOwn }, [{ id: 'c1', kind: 'cover', colours: ['#2D7FB8'] }]);
    inWorld(g, made);
    assert.match(g.stdout, /worldOwn is not a colour world/);
  }
});

test('generator: a theme.css a person designed is kept in a world too', () => {
  const mine = '/* designed: by hand */\n:root{--blue:#123456}\n';
  const g = generate({ world: 'night' }, [], [], site => { mkdirSync(site, { recursive: true }); writeFileSync(join(site, 'theme.css'), mine); });
  assert.equal(g.css, mine);
  assert.equal(g.site.theme.world, 'night');
  assert.ok(Object.hasOwn(WORLDS, g.site.theme.world));
});
