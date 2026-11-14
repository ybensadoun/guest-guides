// engine/scripts/world-of.mjs, the colour world the generator asks for: an id, a world with colours of its own, or a
// picture's raw RGB bytes in; the world to keep and every token of it out; anything else exits 2. Nothing is written.
//   node --test engine/scripts/world-of.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { worldOf, worldTokens } from '../src/worlds.js';
import { swatches, worldFromPicture } from '../src/picture-world.js';

const SCRIPT = fileURLToPath(new URL('./world-of.mjs', import.meta.url));
const ask = input => spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
const ok = input => { const r = ask(JSON.stringify(input)); assert.equal(r.status, 0, r.stderr); assert.equal(r.stderr, ''); return JSON.parse(r.stdout); };
const fails = (input, said) => { const r = ask(input); assert.equal(r.status, 2, `${input}: ${r.stdout}`); assert.equal(r.stdout, '');
  assert.equal(r.stderr.trim().split('\n').length, 1, r.stderr); assert.match(r.stderr, said); };

test('world-of: a ready-made world, by its id', () => {
  const out = ok({ world: 'sea' });
  assert.equal(out.world, 'sea');
  assert.deepEqual(out.tokens, worldTokens(worldOf('sea')));
  assert.equal(out.tokens['--paper'], '#F3F1EA');
});

test('world-of: a world with colours of its own is kept as it is', () => {
  const own = { base: 'stone', deep: '#2D5476', light: '#e3cb98' }, out = ok({ world: own });
  assert.deepEqual(out.world, own);
  assert.deepEqual(out.tokens, worldTokens(worldOf(own)));
  assert.equal(ok({ world: { base: 'night' } }).tokens['--paper'], worldTokens(worldOf('night'))['--paper']);
});

test('world-of: a picture\'s pixels make the world the maker would make', () => {
  const px = c => { const b = Buffer.alloc(96 * 96 * 3), rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); for (let i = 0; i < b.length; i += 3) b.set(rgb, i); return b; };
  for (const c of ['#2D7FB8', '#7A3E9D', '#888888']) {
    const out = ok({ pixels: px(c).toString('base64') }), want = worldFromPicture(swatches(px(c), 3));
    assert.deepEqual(out.world, want); assert.deepEqual(out.tokens, worldTokens(worldOf(want)));
  }
  assert.deepEqual(ok({ pixels: px('#2D7FB8').toString('base64') }).world, { base: 'sea', deep: '#185782' });
  assert.deepEqual(ok({ pixels: px('#888888').toString('base64') }).world, { base: 'stone' });   // no colour of its own: Stone
  assert.deepEqual(ok({ world: 'night', pixels: px('#2D7FB8').toString('base64') }).world, { base: 'sea', deep: '#185782' });   // the picture wins
});

test('world-of: a world that is not one exits 2 with one line', () => {
  fails('{"world":"constructor"}', /unknown colour world "constructor"/);
  fails('{"world":"mars"}', /unknown colour world/);
  fails('{"world":{"base":"stone","deep":"#zzz"}}', /unknown colour world/);
  fails('{"world":{"base":"mars","deep":"#2D5476"}}', /unknown colour world/);
  fails('{"world":{"base":"stone","paper":"#FFFFFF"}}', /unknown colour world/);
  fails('{"world":["stone"]}', /unknown colour world/);
  fails('{"pixels":"AAA="}', /not a whole number of RGB pixels/);      // 2 bytes
  fails('{"pixels":"AAAAAA=="}', /not a whole number of RGB pixels/);   // 4 bytes
  fails('{"pixels":""}', /0 bytes/);
  fails('{"pixels":42}', /base64 string/);
});

test('world-of: no input, or nothing to make a world from, exits 2 with one line', () => {
  fails('', /no input/);
  fails('   \n', /no input/);
  fails('not json', /not JSON/);
  fails('[1]', /one JSON object/);
  fails('{}', /nothing to make a world from/);
});
