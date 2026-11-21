// The words of a found place's card in the maker's languages (worker/card-words.mjs): one question to the translator, the
// English kept on any error. No network: the translator is a stand-in.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cardTexts, applyWords, cardWords, CARD_LANGS, CARD_MAX } from '../card-words.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const place = (n, more = {}) => ({ id: 'p' + n, name: { en: 'Place ' + n }, name_local: 'Lloc ' + n, type: { en: 'Castle ruins, Town ' + n }, description: { en: 'A short walk up to place ' + n + '.' }, lat: 41, lng: 1, ...more });
const inAll = text => Object.fromEntries(CARD_LANGS.map(l => [l, `${l}: ${text}`]));
// A translator that answers everything, and keeps what it was asked.
const fake = asked => async (texts, langs, src) => { asked.push({ texts: [...texts], langs: [...langs], src }); return Object.fromEntries(texts.map(t => [t, inAll(t)])); };

test('cardTexts: the descriptions first, then the kinds in words, each once, never a name', () => {
  const items = [place(1), place(2), place(3, { description: { en: 'A short walk up to place 1.' } })];
  assert.deepEqual(cardTexts(items), ['A short walk up to place 1.', 'A short walk up to place 2.', 'Castle ruins, Town 1', 'Castle ruins, Town 2', 'Castle ruins, Town 3']);
});
test('cardTexts: a text that already has the three languages is not asked again; one that has no English is left out', () => {
  const full = { en: 'Open all year.', es: 'a', fr: 'b', ca: 'c' };
  assert.deepEqual(cardTexts([place(1, { description: full, type: { fr: 'Ruines' } }), { name: { en: 'x' } }, null, 'text']), []);
  assert.deepEqual(cardTexts(null), []);
});
test(`cardTexts: at most ${CARD_MAX} texts, one question's worth, the descriptions before the kinds`, () => {
  const texts = cardTexts(Array.from({ length: 30 }, (_, i) => place(i)));
  assert.equal(texts.length, CARD_MAX);
  assert.equal(texts.filter(t => t.startsWith('A short walk')).length, 30);
});
test('cardWords then applyWords: one question, into Spanish, French and Catalan from English, written beside the English', async () => {
  const items = [place(1), place(2)], asked = [];
  const map = await cardWords(items, fake(asked));
  assert.equal(asked.length, 1);
  assert.deepEqual(asked[0].langs, ['es', 'fr', 'ca']); assert.equal(asked[0].src, 'en'); assert.equal(asked[0].texts.length, 4);
  assert.equal(applyWords(items, map), 12);
  assert.deepEqual(items[0].description, { en: 'A short walk up to place 1.', es: 'es: A short walk up to place 1.', fr: 'fr: A short walk up to place 1.', ca: 'ca: A short walk up to place 1.' });
  assert.equal(items[1].type.ca, 'ca: Castle ruins, Town 2');
  assert.deepEqual(items[0].name, { en: 'Place 1' }); assert.equal(items[0].name_local, 'Lloc 1');   // names are the deck's and the generator's key
  assert.equal(applyWords(items, map), 0);   // a second time changes nothing
});
test('applyWords: a language the text already holds is kept; an empty answer, one that is not a text or one with a dash is not written', () => {
  const items = [place(1, { description: { en: 'By the sea.', ca: 'Vora el mar.' } })];
  const n = applyWords(items, { 'By the sea.': { es: 'Junto al mar.', fr: '  ', ca: 'Otra cosa.' }, 'Castle ruins, Town 1': { es: 'Ruinas — Town 1', fr: 7, ca: 'Ruïnes de castell, Town 1' } });
  assert.equal(n, 2);
  assert.deepEqual(items[0].description, { en: 'By the sea.', ca: 'Vora el mar.', es: 'Junto al mar.' });
  assert.deepEqual(items[0].type, { en: 'Castle ruins, Town 1', ca: 'Ruïnes de castell, Town 1' });
  assert.equal(applyWords(items, null), 0); assert.equal(applyWords(null, { a: {} }), 0);
});
test('cardWords: a translator that throws, refuses (the day\'s budget) or answers nothing leaves the English, and never throws', async () => {
  const items = [place(1)], before = JSON.stringify(items), said = [];
  assert.equal(await cardWords(items, async () => { throw new Error('Searches are paused for today.'); }, { log: m => said.push(m) }), null);
  assert.equal(await cardWords(items, () => { throw new Error('down'); }, { log: m => said.push(m) }), null);
  assert.equal(await cardWords(items, async () => ({})), null);
  assert.equal(await cardWords(items, async () => null), null);
  assert.equal(await cardWords(items, null), null);
  assert.equal(JSON.stringify(items), before);
  assert.equal(said.length, 2); assert.match(said[0], /paused for today/);
});
test('cardWords: nothing to translate, the translator is not asked', async () => {
  const asked = [];
  assert.equal(await cardWords([], fake(asked)), null);
  assert.equal(await cardWords([{ name: { en: 'Only a name' } }], fake(asked)), null);
  assert.equal(asked.length, 0);
});
test('cardWords: a translator slower than the ceiling is not waited for, and its late answer or error is dropped', async () => {
  const said = [], t0 = Date.now();
  const slow = () => new Promise(done => setTimeout(() => done({ x: inAll('x') }), 400));
  assert.equal(await cardWords([place(1)], slow, { ms: 40, log: m => said.push(m) }), null);
  assert.ok(Date.now() - t0 < 300, 'it waited for the slow translator');
  assert.match(said[0], /English stays/);
  const failsLate = () => new Promise((_, no) => setTimeout(() => no(new Error('late')), 80));
  assert.equal(await cardWords([place(1)], failsLate, { ms: 20 }), null);
  await new Promise(r => setTimeout(r, 120));   // the late rejection is caught: the test process would stop on it otherwise
});

// The build (engine/scripts/generate-site.py, localize) keeps a language a research text already holds: the guide says what
// the host read on the card, for a place they kept and for one that waits as a card in the editor. Needs python3 with
// Pillow and NumPy, as the worker does.
test('generator: a found place keeps the words the host read on its card, kept or still waiting', () => {
  const src = mkdtempSync(join(tmpdir(), 'gen-cards-')), slug = 'zz-test-cards-' + process.pid, site = resolve(ROOT, 'sites', slug);
  const words = (en, ca) => ({ en, es: 'es: ' + en, fr: 'fr: ' + en, ca });
  const found = (n, name) => ({ id: 'f' + n, name: { en: name }, name_local: name, type: words('Castle ruins, Querol', 'Ruïnes de castell, Querol'), icon: 'castle', group: 'sights', town: 'Querol',
    lat: 41.4 + n / 100, lng: 1.4, km_from_house: 7 + n, description: words('A short walk up to ' + name + '.', 'Una pujada curta fins a ' + name + '.'), tags: [], flags: [] });
  writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'Querol', languages: ['ca', 'en'], sourceLang: 'ca',
    swipes: { 'r:keptcastle': { id: 'r:keptcastle', d: 'yes', cat: 'todo', name: 'Kept Castle' } } } }));
  mkdirSync(join(src, 'research')); writeFileSync(join(src, 'research/todo.json'), JSON.stringify({ items: [found(1, 'Kept Castle'), found(2, 'Waiting Castle')] }));
  try {
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.4', '--lng', '1.4', '--src', 'ca', '--research', join(src, 'research')], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-400));
    const kept = JSON.parse(readFileSync(join(site, 'content/todo.json'), 'utf8')).items, waiting = JSON.parse(readFileSync(join(site, 'docs/more-places.json'), 'utf8'));
    assert.deepEqual(kept.map(x => x.name.en), ['Kept Castle']); assert.deepEqual(waiting.map(x => x.name.en), ['Waiting Castle']);
    assert.equal(kept[0].description.ca, 'Una pujada curta fins a Kept Castle.'); assert.equal(kept[0].description.en, 'A short walk up to Kept Castle.');
    assert.equal(kept[0].type.ca, 'Ruïnes de castell, Querol');
    assert.equal(waiting[0].description.ca, 'Una pujada curta fins a Waiting Castle.'); assert.equal(waiting[0].type.en, 'Castle ruins, Querol');
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
});
