// The one list of kinds of event, wherever it lives: the guide draws each with an icon and a colour (engine section.js
// EVENT_ICON, EVENT_TONE), the maker offers them in its grid (editor.js EV_KINDS, names in i18n/ui.json, other words in
// EV_WORDS), the worker's research may use them (guide-worker.mjs EVENT_SHAPE), the events file says them (its _doc).
// Read as text: nothing runs.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = f => readFileSync(resolve(ROOT, f), 'utf8');
const block = (src, start) => { const i = src.indexOf(start); assert.ok(i >= 0, `${start} not found`); return src.slice(i, src.indexOf('\n};', i)); };
const sec = read('engine/src/views/section.js'), ed = read('onboarding-site/src/editor.js'), css = read('engine/src/styles/app.css');
const ICON = new Set([...block(sec, 'const EVENT_ICON = {').matchAll(/^\s+([a-z]+): GI\('/gm)].map(m => m[1]));
const TONE = Object.fromEntries([...(sec.match(/\nconst EVENT_TONE = \{([^\n]*)\};/) || [])[1].matchAll(/([a-z]+): '([^']+)'/g)].map(m => [m[1], m[2]]));
const KINDS = [...(ed.match(/\nconst EV_KINDS = (\[[^\n]*\]);/) || [])[1].matchAll(/\['([a-z]+)', '([^']+)'\]/g)].map(m => [m[1], m[2]]);
const KEYS = KINDS.map(x => x[0]);
const WORKER = (read('worker/guide-worker.mjs').match(/"type" is one of: ([^.]*)\. Every event/) || [])[1].replace(/\s*\([^)]*\)/g, '').split(', ');   // the words in brackets after a kind are for Claude
const DOC = (JSON.parse(read('sites/ca-la-kimberly/content/events.json'))._doc.match(/type \(([a-z/]+)[;)]/) || [])[1].split('/');

test('event kinds: eighteen, in the maker\'s order, human towers last', () => {
  assert.deepEqual(KEYS, ['festa', 'music', 'food', 'fair', 'tradition', 'sports', 'theatre', 'art', 'kids', 'parade', 'carnival', 'christmas', 'religious', 'fireworks', 'flowers', 'historical', 'film', 'castells']);
  assert.equal(new Set(KEYS).size, KEYS.length);
});

test('event kinds: the guide, the maker, the worker\'s research and the events file say the same set', () => {
  const S = a => [...a].sort();
  assert.deepEqual(S(ICON), S(KEYS), 'engine EVENT_ICON');
  assert.deepEqual(S(Object.keys(TONE)), S(KEYS), 'engine EVENT_TONE');
  assert.deepEqual(S(WORKER), S(KEYS), 'worker EVENT_SHAPE');
  assert.deepEqual(S(DOC), S(KEYS), 'events _doc');
});

test('event kinds: every colour is one of the engine\'s tones', () => {
  for (const [k, v] of Object.entries(TONE)) {
    const m = v.match(/^var\(--tone-([a-z]+)\)$/);
    assert.ok(v === 'var(--ink)' || (m && new RegExp(`--tone-${m[1]}:`).test(css) && m[1] !== 'purple' && m[1] !== 'pink'), `${k}: ${v}`);   // purple and pink are not their own colours in the guide
  }
});

test('event kinds: drawn like the others (stroke only, nothing filled, no text)', () => {
  for (const m of block(sec, 'const EVENT_ICON = {').matchAll(/^\s+([a-z]+): GI\('(.*)'\),?$/gm)) {
    assert.ok(!/fill=|<text|stroke-width=/.test(m[2]), `${m[1]}: only the GI stroke`);
    assert.ok(/^(<(path|circle|rect|ellipse) [^<>]*\/>)+$/.test(m[2]), `${m[1]}: simple shapes`);
  }
});

test('event kinds: a name in the maker\'s four languages, and other words to find them by in each', () => {
  const ui = JSON.parse(read('onboarding-site/src/i18n/ui.json'));
  const words = block(ed, 'const EV_WORDS = {');
  for (const [k, n] of KINDS) {
    assert.ok(ui[n] && ['ca', 'es', 'fr'].every(l => String(ui[n][l] || '').trim()), `${k}: "${n}" in ui.json`);
    const line = (words.match(new RegExp(`\\n  ${k}: \\{([^\\n]*)\\}`)) || [])[1] || '';
    for (const l of ['en', 'ca', 'es', 'fr']) assert.ok(new RegExp(`\\b${l}: '[^']+'`).test(line), `${k}: EV_WORDS.${k}.${l}`);
    assert.ok(!line.includes('—') && !n.includes('—'), `${k}: em-dash`);
  }
});
