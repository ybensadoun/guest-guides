// "From your picture" (engine/src/picture-world.js): the colours a picture has, and the world they make. Pictures here
// are made of flat areas of colour (no file is read); the real photos and logos were judged by eye (plan, 14 Nov 2026).
// Nothing is written.   node --test engine/scripts/picture-world.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oklch, fromOklch, swatches, worldFromPicture, apart } from '../src/picture-world.js';
import { contrast, worldTokens, worldCss, worldOf, WORLDS } from '../src/worlds.js';

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// A picture of 100 pixels: each colour for its number of pixels, the rest white. As a canvas gives it (r, g, b, a).
const picture = parts => { const d = []; let n = 0; for (const [c, k] of parts) { for (let i = 0; i < k; i++) d.push(...rgb(c), 255); n += k; }
  for (; n < 100; n++) d.push(255, 255, 255, 255); return d; };
const hueIn = (h, lo, hi) => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);
const ROLES = ['deep', 'strong', 'fresh', 'light', 'warm'];

test('oklch and back: a colour a screen can show comes back as it was', () => {
  for (const c of ['#1D4FA0', '#D52B1E', '#0E7C46', '#F5C400', '#EC6A1C', '#F3EEE3', '#121212', '#FFFFFF', '#3F5364']) assert.equal(fromOklch(...oklch(c)), c);
  const [L, C, h] = oklch(fromOklch(0.5, 0.4, 150));   // stronger than a screen can show: its strength gives way, not its hue
  assert.ok(C < 0.4 && Math.abs(L - 0.5) < 0.01 && Math.abs(h - 150) < 1.5, `${L} ${C} ${h}`);
});

test('swatches: white, black and grey are not colours', () => {
  assert.deepEqual(swatches(picture([])), []);
  assert.deepEqual(swatches(picture([['#111111', 30], ['#888888', 30], ['#EFEFEF', 20]])), []);
  assert.deepEqual(swatches([]), []);
});

test('swatches: one family for each colour, biggest first, with its share of the picture\'s colour', () => {
  const sw = swatches(picture([['#D52B1E', 10], ['#1D4FA0', 60], ['#F5C400', 20]]));
  assert.deepEqual(sw.map(s => s.colour), ['#1D4FA0', '#F5C400', '#D52B1E']);
  assert.deepEqual(sw.map(s => Math.round(s.share * 100)), [67, 22, 11]);
  assert.equal(swatches(picture([['#1D4FA0', 60]]), 4)[0].share, 1);
  const noAlpha = []; for (let i = 0; i < 50; i++) noAlpha.push(...rgb('#0E7C46'));
  assert.equal(swatches(noAlpha, 3)[0].colour, '#0E7C46');
});

test('swatches: a family is named by its vivid pixels, a speck is left out', () => {
  const [blue] = swatches(picture([['#C9DDF0', 70], ['#1E6FD0', 12]]));   // a hazy sky and a pool
  assert.ok(blue.full > 0.8 && blue.l < 0.6, `the pool's blue, not the haze: ${JSON.stringify(blue)}`);
  assert.deepEqual(swatches(picture([['#1D4FA0', 97], ['#D52B1E', 2]])).map(s => s.colour), ['#1D4FA0']);
});

test('no colour in the picture: Stone as it is', () => {
  assert.deepEqual(worldFromPicture([]), { base: 'stone' });
  assert.equal(worldOf(worldFromPicture(swatches(picture([['#111111', 40]])))), WORLDS.stone);
});

test('the guide\'s own colours give the guide\'s own world', () => {
  const w = worldFromPicture(swatches(picture([['#1D4FA0', 50], ['#D52B1E', 15], ['#F5C400', 20], ['#0E7C46', 8], ['#EC6A1C', 7]])));
  assert.equal(w.base, 'bauhaus');
  for (const r of ROLES) assert.ok(apart(worldOf(w)[r], WORLDS.bauhaus[r]) < 0.03, `${r} ${worldOf(w)[r]}`);
});

test('a brand\'s colour becomes the main colour, and stays itself', () => {
  const teal = worldFromPicture(swatches(picture([['#0F6E6A', 60], ['#F1C84B', 25]])));   // a teal and yellow logo
  assert.equal(teal.base, 'tropical'); assert.equal(teal.deep, '#0F6E6A');
  const green = worldFromPicture(swatches(picture([['#2E6B3F', 30]])));
  assert.ok(green.deep && hueIn(oklch(green.deep)[2], 140, 160), JSON.stringify(green));
  const navy = worldFromPicture(swatches(picture([['#14284B', 40], ['#C9A24B', 40]])));   // a navy stays a navy: darker than the world's deep, never near black
  assert.ok(oklch(navy.deep)[0] < 0.4 && oklch(navy.deep)[0] >= 0.329 && hueIn(oklch(navy.deep)[2], 250, 270), JSON.stringify(navy));
  assert.ok(navy.light && hueIn(oklch(navy.light)[2], 75, 95), JSON.stringify(navy));
  const purple = worldFromPicture(swatches(picture([['#6B3FA0', 30]])));
  assert.equal(purple.base, 'night'); assert.ok(hueIn(oklch(purple.deep)[2], 295, 310));
});

test('a photo of two colours keeps both: a pool and its lawn', () => {
  // A real cover (14 Nov 2026): 54% lawn green, 35% pool blue. By a hair it gave Country, green all over and no blue.
  const w = worldOf(worldFromPicture(swatches(picture([['#617731', 54], ['#4A83C5', 35]]))));
  assert.ok(hueIn(oklch(w.deep)[2], 240, 270), `the pool's blue is the main colour: ${w.deep}`);
  assert.ok(hueIn(oklch(w.fresh)[2], 110, 140), `the lawn's green is there too: ${w.fresh}`);
});

test('an olive green never becomes the light tile (it made a lime one)', () => {
  const w = worldFromPicture(swatches(picture([['#9DBBD7', 33], ['#8A985A', 33], ['#C7A673', 28]])));
  assert.ok(!w.light || hueIn(oklch(w.light)[2], 60, 113), JSON.stringify(w));
});

test('Emergencies stays red: an ochre, a brown or an orange never takes strong; a real red does', () => {
  for (const c of ['#A67C45', '#7A4A22', '#C2693F', '#EC8A1C', '#8A6A3A', '#B08D57']) {
    const w = worldFromPicture(swatches(picture([[c, 80]]))), strong = worldOf(w).strong;
    assert.ok(hueIn(oklch(strong)[2], 350, 45) && oklch(strong)[1] >= 0.1, `${c} gave strong ${strong} ${JSON.stringify(w)}`);
    assert.ok(apart(strong, c) > 0.08, `${c} is not the strong colour`);
  }
  const red = worldFromPicture(swatches(picture([['#D21F2B', 60], ['#1B2A55', 25]])));
  assert.ok(Math.abs(oklch(red.strong)[2] - oklch('#D21F2B')[2]) < 3, JSON.stringify(red));
});

// Any picture at all: 600 made of two to five random colours, random sizes, on white, grey or black.
test('any picture: a world that keeps the rule, with a red strong, a green fresh and no twin tiles', () => {
  let seed = 20261114; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const hex = () => '#' + [0, 1, 2].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('').toUpperCase();
  const bases = {};
  for (let n = 0; n < 600; n++) {
    const parts = Array.from({ length: 2 + Math.floor(rnd() * 4) }, () => [hex(), 3 + Math.floor(rnd() * 18)]);
    if (n % 3) parts.push([['#888888', '#101010'][n % 2], 10]);
    const sw = swatches(picture(parts)), w = worldFromPicture(sw), p = worldOf(w), say = JSON.stringify({ parts, w });
    assert.deepEqual(worldFromPicture(swatches(picture(parts))), w, 'the same picture, the same world');
    assert.ok(p && Object.keys(w).every(k => k === 'base' || (ROLES.includes(k) && /^#[0-9A-F]{6}$/.test(w[k]))), say);
    bases[w.base] = (bases[w.base] || 0) + 1;
    assert.ok(hueIn(oklch(p.strong)[2], 345, 47) && oklch(p.strong)[1] >= 0.09, `strong is a red ${p.strong} ${say}`);
    assert.ok(hueIn(oklch(p.fresh)[2], 103, 207), `fresh is a green ${p.fresh} ${say}`);
    const t = worldTokens(p);
    for (const k of ['--blue', '--red', '--green']) assert.ok(contrast('#FFFFFF', t[k]) >= 4.5, `${k} ${say}`);
    for (const k of ['--yellow', '--orange']) assert.ok(contrast(t['--ink'], t[k]) >= 4.5, `${k} ${say}`);
    // The one pair between two roles that pages draw: the small light icon on the deep rubbish tile (app.css .gt-tl svg),
    // 3 to 1 as an icon. A picture cannot break it (light is never darker than its world's own, deep never lighter); a
    // colour fine-tuned by hand can (found 21 Nov 2026 with engine/scripts/contrast-check.mjs: open in the look's README).
    assert.ok(contrast(t['--yellow'], t['--blue']) >= 3, `the light icon on a deep tile ${t['--yellow']} ${t['--blue']} ${say}`);
    for (const [x, y] of [['light', 'warm'], ['deep', 'fresh'], ['deep', 'strong'], ['fresh', 'strong']]) {
      const mine = r => w[r] && w[r] !== WORLDS[w.base][r];
      if (mine(x) || mine(y)) assert.ok(apart(p[x], p[y]) >= 0.045, `${x} and ${y} are twins ${p[x]} ${p[y]} ${say}`);
    }
    assert.ok(oklch(p.deep)[0] >= 0.32, `deep is not near black ${p.deep} ${say}`);
    assert.ok(oklch(p.light)[0] <= 0.89 && oklch(p.warm)[0] <= 0.89, `light and warm stand out from the page ${say}`);
  }
  assert.equal(Object.keys(bases).length, 6, `every world is reached: ${JSON.stringify(bases)}`);
});

// Poor cover pictures a real listing may have first (21 Nov 2026, before real hosts' first guides): none gives a guide
// that is hard to read, and one with no colour of its own gives a ready-made world as it is.
test('a poor cover picture: a world that keeps the rule, or Stone as it is', () => {
  const POOR = {
    'a night shot': [['#06080F', 70], ['#101B33', 22], ['#E8B04A', 3], ['#2A2F3A', 5]],
    'a very dark room': [['#0B0A09', 60], ['#1E1712', 30], ['#3A2A1C', 10]],
    'overexposed': [['#F6F3EC', 55], ['#E9EEF3', 25], ['#EFE6D8', 20]],
    'a floor plan': [['#111111', 10], ['#D9E6F2', 3], ['#C8102E', 1]],
    'mostly sky': [['#7FB2E5', 78], ['#F4F6F8', 14], ['#5E6B3A', 8]],
    'mostly pool': [['#1FB5C9', 72], ['#D9CDB8', 20]],
    'a neon sign': [['#050505', 70], ['#FF2FD0', 15], ['#19E6FF', 15]],
  };
  for (const [name, parts] of Object.entries(POOR)) {
    const w = worldFromPicture(swatches(picture(parts))), p = worldOf(w), t = worldTokens(p);
    assert.ok(p, name);
    for (const k of ['--blue', '--red', '--green']) assert.ok(contrast('#FFFFFF', t[k]) >= 4.5, `${name}: white on ${k} ${t[k]}`);
    for (const k of ['--yellow', '--orange']) assert.ok(contrast(t['--ink'], t[k]) >= 4.5, `${name}: text on ${k} ${t[k]}`);
    assert.ok(contrast(t['--yellow'], t['--blue']) >= 3, `${name}: the light icon on a deep tile`);
    assert.ok(oklch(p.deep)[0] >= 0.32, `${name}: deep is not near black ${p.deep}`);
  }
  for (const grey of [[['#8C8F92', 40], ['#A39E97', 35], ['#6F7478', 15]], [['#222222', 30], ['#777777', 40], ['#DDDDDD', 30]]])
    assert.deepEqual(worldFromPicture(swatches(picture(grey))), { base: 'stone' }, 'a grey room, a black and white photo: Stone as it is');
});

test('worldOf: a world with colours of its own, and nothing else gets in', () => {
  const w = worldOf({ base: 'stone', deep: '#2f5478', warm: '#E3CB98' });
  assert.equal(w.deep, '#2F5478'); assert.equal(w.warm, '#E3CB98'); assert.equal(w.strong, WORLDS.stone.strong); assert.equal(w.paper, WORLDS.stone.paper); assert.deepEqual(w.fonts, WORLDS.stone.fonts);
  assert.equal(worldOf({ base: 'stone' }), WORLDS.stone);
  assert.equal(worldOf({ base: 'bauhaus', deep: '#2F5478' }).set, undefined, 'tints picked by hand for Bauhaus\'s own colours go');
  assert.ok(WORLDS.bauhaus.set, 'and Bauhaus itself keeps them');
  for (const bad of [{ base: 'moon', deep: '#2F5478' }, { base: 'constructor' }, { deep: '#2F5478' }, {}, [], null, { base: ['stone'] }]) assert.equal(worldOf(bad), null, JSON.stringify(bad));
  const sly = worldOf({ base: 'stone', deep: 'red;}body{display:none}', strong: '#12345', fresh: 7, light: '#GGGGGG', paper: '#000000', ink: '#FFFFFF', display: 'x}', warm: '#E3CB98' });
  assert.deepEqual({ ...sly, warm: WORLDS.stone.warm }, WORLDS.stone, 'only a role given as #RRGGBB is taken');
  assert.match(worldCss(sly), /^:root\{[^{}]*\}$/);
});
