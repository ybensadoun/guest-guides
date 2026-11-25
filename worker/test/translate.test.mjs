// The translation's parts (worker/translate.mjs), with a fake Claude: nothing paid, nothing real asked. The worker
// itself (worker/guide-worker.mjs) is never imported here: importing it starts it.
//   node --test worker/test/translate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTranslate, splitParts, readAnswer, translatePrompt, PART_TEXTS, PART_CHARS } from '../translate.mjs';

const LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
// The texts a prompt asks, by their number (the last line of the prompt).
const asked = prompt => JSON.parse(prompt.slice(prompt.lastIndexOf('\n') + 1));
const langsOf = prompt => /into (.*?)\. Most/.exec(prompt)[1].split(', ');
const answer = prompt => { const langs = langsOf(prompt); return JSON.stringify(Object.fromEntries(Object.entries(asked(prompt)).map(([n, t]) => [n, Object.fromEntries(langs.map(l => [l, l + ':' + t]))]))); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// The worker's translate before 25 Nov 2026, word for word but for claudeAsk and log, to compare with.
async function oldTranslate(claudeAsk, log, texts, langs, srcLang, onPart, meter = null) {
  const map = {};
  for (let i = 0; langs.length && i < texts.length; i += 40) {
    if (onPart) await onPart(Math.min(i + 40, texts.length), texts.length);
    const part = texts.slice(i, i + 40);
    const prompt = translatePrompt(part, langs, srcLang);
    let out = '';
    try { out = await claudeAsk(prompt, { what: 'translation', meter }); } catch (e) { log('  translation skipped:', e.message); break; }
    const a = out.indexOf('{'), b = out.lastIndexOf('}');
    if (a >= 0 && b > a) { try { for (const [n, tr] of Object.entries(JSON.parse(out.slice(a, b + 1)))) if (part[+n] != null) map[part[+n]] = tr; } catch (e) {} }
  }
  return map;
}

test('the prompt keeps its words', () => {
  const p = translatePrompt(['Hola'], ['en', 'fr'], 'es');
  assert.ok(p.startsWith('Translate these texts into en, fr. Most are in es,'));
  assert.ok(p.includes('Answer with ONE JSON object and nothing else, one entry per text, by its number: {"0": {"en": "...", "fr": "..."}}.\n{"0":"Hola"}'));
  assert.ok(p.includes('Geschichts­museum'));
});

test('a small list: the same result and the same question as before', async () => {
  const texts = ['Welcome', 'The pool is open from 10:00', 'Bins on Tuesday'];
  const seenNew = [], seenOld = [];
  const tr = makeTranslate({ ask: async (p, o) => { seenNew.push([p, o]); return answer(p); } });
  const now = await tr(texts, LANGS, 'en', null, 'M');
  const before = await oldTranslate(async (p, o) => { seenOld.push([p, o]); return answer(p); }, () => {}, texts, LANGS, 'en', null, 'M');
  assert.deepEqual(now, before);
  assert.deepEqual(seenNew, seenOld);
  assert.deepEqual(Object.keys(now), texts);
  assert.equal(now['Welcome'].de, 'de:Welcome');
});

test('no language or no text: nothing asked', async () => {
  let n = 0; const tr = makeTranslate({ ask: async () => { n++; return '{}'; } });
  assert.deepEqual(await tr(['a'], [], 'en'), {});
  assert.deepEqual(await tr([], LANGS, 'en'), {});
  assert.equal(n, 0);
});

test('parts by count and by weight; a long text alone is its own part', () => {
  const short = Array.from({ length: 100 }, (_, i) => 't' + i);
  assert.deepEqual(splitParts(short).map(p => p.length), [40, 40, 20]);
  const mid = Array.from({ length: 10 }, (_, i) => String(i).padEnd(1000, 'x'));
  assert.deepEqual(splitParts(mid).map(p => p.length), [6, 4]);
  const long = ['a', 'b'.repeat(9000), 'c'];
  assert.deepEqual(splitParts(long).map(p => p.length), [1, 1, 1]);
  assert.deepEqual(splitParts(long).flat(), long);
});

test('200 texts in six languages: parts of the right size, at most 4 at once, whole and in order', async () => {
  const texts = Array.from({ length: 200 }, (_, i) => `Text number ${i}: ` + 'word '.repeat(i % 7 === 0 ? 120 : 15));
  let running = 0, most = 0; const sizes = [];
  const tr = makeTranslate({ ask: async p => {
    running++; most = Math.max(most, running);
    const part = Object.values(asked(p)); sizes.push(part.length);
    assert.ok(part.length <= PART_TEXTS);
    assert.ok(part.length === 1 || part.reduce((s, t) => s + t.length, 0) <= PART_CHARS);
    await wait(5 + (part.length % 3) * 4);   // parts finish out of order
    running--; return answer(p);
  } });
  const map = await tr(texts, LANGS, 'en');
  assert.equal(most, 4);
  assert.equal(sizes.reduce((s, n) => s + n, 0), 200);
  assert.ok(sizes.length > 5, 'parts are weighed, not only counted: ' + sizes.join(','));
  assert.deepEqual(Object.keys(map), texts);
  for (const t of texts) assert.deepEqual(Object.keys(map[t]), LANGS);
  assert.equal(map[texts[17]].fr, 'fr:' + texts[17]);
});

test('TRANSLATE_AT_ONCE: the limit given is kept', async () => {
  let running = 0, most = 0;
  const tr = makeTranslate({ atOnce: 2, ask: async p => { running++; most = Math.max(most, running); await wait(3); running--; return answer(p); } });
  await tr(Array.from({ length: 200 }, (_, i) => 'x' + i), LANGS, 'en');
  assert.equal(most, 2);
});

test('an answer cut at its length limit: what it holds is kept, the rest asked again in halves, all come back', async () => {
  const texts = Array.from({ length: 40 }, (_, i) => 'phrase ' + i);
  let calls = 0;
  const tr = makeTranslate({ ask: async p => { calls++; const full = answer(p);
    return calls === 1 ? full.slice(0, Math.floor(full.length * 0.6)) : full; } });
  const map = await tr(texts, LANGS, 'en');
  assert.deepEqual(Object.keys(map), texts);
  assert.ok(calls >= 2 && calls <= 4, 'calls: ' + calls);
});

test('an answer that is never whole JSON: split down, asked again, whole', async () => {
  const texts = Array.from({ length: 30 }, (_, i) => 'item ' + i);
  const tr = makeTranslate({ ask: async p => Object.keys(asked(p)).length > 8 ? 'Sorry, here is part: {"0": {"en": "x"' : answer(p) });
  const map = await tr(texts, LANGS, 'en');
  assert.deepEqual(Object.keys(map), texts);
});

test('a part that never answers leaves only its own texts, and one line says so', async () => {
  const texts = Array.from({ length: 120 }, (_, i) => 'line ' + i);   // three parts of 40
  const lines = []; let calls = 0;
  const tr = makeTranslate({ log: (...a) => lines.push(a.join(' ')), ask: async p => { calls++; return Object.values(asked(p)).some(t => /^line (4\d|5\d|6\d|7\d)$/.test(t)) ? 'no' : answer(p); } });
  const map = await tr(texts, LANGS, 'en');
  assert.equal(Object.keys(map).length, 80);
  for (let i = 40; i < 80; i++) assert.ok(!('line ' + i in map));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /40 of 120 text\(s\) stayed untranslated/);
  assert.equal(calls, 2 + 1 + 2 + 4 + 8);   // the two good parts, then 40, 20, 10, 5: three levels and no more
});

test('a question that throws: no new question starts, the running ones finish, the build goes on', async () => {
  const texts = Array.from({ length: 400 }, (_, i) => 'w' + i);   // ten parts
  let started = 0; const lines = [];
  const tr = makeTranslate({ log: (...a) => lines.push(a.join(' ')), ask: async p => {
    const k = ++started;
    if (k === 2) { await wait(2); throw new Error('The day\'s budget is spent'); }
    await wait(10); return answer(p);
  } });
  const map = await tr(texts, LANGS, 'en');
  assert.equal(started, 4);                         // the first four started together, none after the error
  assert.equal(Object.keys(map).length, 120);       // the three that were running finished
  assert.equal(lines.filter(l => l.includes('translation skipped')).length, 1);
  assert.ok(lines.some(l => /280 of 400/.test(l)));
});

test('onPart never goes backwards and ends at the whole', async () => {
  const texts = Array.from({ length: 200 }, (_, i) => 'p' + i);
  const seen = [];
  const tr = makeTranslate({ ask: async p => { await wait(Object.keys(asked(p)).length === 40 ? Math.random() * 15 : 1); return answer(p); } });
  await tr(texts, LANGS, 'en', async (done, all) => { await wait(Math.random() * 5); seen.push([done, all]); });
  assert.ok(seen.length >= 5);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i][0] >= seen[i - 1][0], JSON.stringify(seen));
  assert.deepEqual(seen.at(-1), [200, 200]);
});

test('a text repeated twice, and two texts one character apart, each keep their own translation', async () => {
  const texts = ['Open on Monday', 'Open on Monday', 'Open on Monday.', 'Open on Sunday'];
  let asks = 0;
  const tr = makeTranslate({ ask: async p => { asks++; assert.equal(Object.keys(asked(p)).length, 3); return answer(p); } });
  const map = await tr(texts, LANGS, 'en');
  assert.equal(asks, 1);
  assert.equal(map['Open on Monday'].es, 'es:Open on Monday');
  assert.equal(map['Open on Monday.'].es, 'es:Open on Monday.');
  assert.equal(map['Open on Sunday'].es, 'es:Open on Sunday');
});

test('a broken answer is read entry by entry', () => {
  assert.deepEqual(readAnswer('{"0": {"es": "a"}, "1": {"es": "b"}, "2": {"es": "c'), { 0: { es: 'a' }, 1: { es: 'b' } });
  assert.deepEqual(readAnswer('Here: {"0": {"es": "a"}}'), { 0: { es: 'a' } });
  assert.deepEqual(readAnswer(''), {});
  assert.deepEqual(readAnswer('{"0": "not an object", "1": {"es": "b"}}'), { 1: { es: 'b' } });
});
