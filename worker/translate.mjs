// Translation by Claude for the worker (25 Nov 2026): the texts split into parts, the parts asked side by side, the
// answers gathered. The question itself goes through the function it is given (the worker passes claudeAsk, tests a
// fake one), so this file never starts anything. The worker's translate() in guide-worker.mjs is a thin call to this.
//   makeTranslate({ ask, log, atOnce }) -> translate(texts, langs, srcLang, onPart, meter)
//   result: {"<source text>": {"es": "...", ...}}; a text that does not come back stays as it is (Claude down, the
//   day's budget spent): a search or a build is never lost for it.
// Why: a build in six languages on 25 Nov 2026 asked 40 texts a question, one after the other, and spent 11 of its 15
// minutes translating; one answer was cut at its length limit and its 40 texts were dropped without a word.
//   - a part holds at most PART_TEXTS texts and about PART_CHARS characters of source text (one long text alone is its
//     own part), so an answer in five or six languages stays far under the length limit;
//   - at most atOnce parts are asked at a time (TRANSLATE_AT_ONCE, default 4), the results in the texts' order;
//   - a part whose answer is cut or not whole JSON keeps the entries that can be read one by one, and the texts still
//     missing are split in two and asked again, at most SPLIT_LEVELS times; what is still missing then stays, and one
//     log line says how many;
//   - a question that throws: no further question starts, the ones running finish, the build goes on.

export const PART_TEXTS = 40, PART_CHARS = 6000, SPLIT_LEVELS = 3, AT_ONCE = 4;

// The question's words (unchanged since before 25 Nov 2026): the texts of a part by their number.
export function translatePrompt(part, langs, srcLang) {
  return `Translate these texts into ${langs.join(', ')}. Most are in ${srcLang}, but a text can be in another language or mix two (Catalan hosts often mix Catalan and Spanish; a text copied from a listing can be in any language): understand each one and write it properly in every language asked for, the mix sorted out. Only a text written entirely and correctly in one of these languages stays word for word in that language. Keep names, numbers and times. No em-dashes. Speak to the guest informally: German du (dich, dein, euch for a group), never Sie; Dutch je and jij, never u. German quotes „like this“; Spanish opens questions and exclamations with ¿ and ¡; Catalan keeps l·l. For French use real non-breaking spaces before ? ! ; : and inside guillemets. In German and Dutch, put a soft hyphen (U+00AD) at a correct syllable break inside every word of 10 letters or more (e.g. Geschichts­museum), so it can wrap on a narrow phone screen. Answer with ONE JSON object and nothing else, one entry per text, by its number: {"0": {"${langs.join('": "...", "')}": "..."}}.\n${JSON.stringify(Object.fromEntries(part.map((x, n) => [n, x])))}`;
}

// The texts in parts: at most maxTexts each and about maxChars of source text, in their order.
export function splitParts(texts, maxTexts = PART_TEXTS, maxChars = PART_CHARS) {
  const parts = []; let cur = [], chars = 0;
  for (const t of texts) {
    const len = String(t).length;
    if (cur.length && (cur.length >= maxTexts || chars + len > maxChars)) { parts.push(cur); cur = []; chars = 0; }
    cur.push(t); chars += len;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

// An answer read: {number: {lang: text}}. Whole JSON first; else, when it was cut or broken, each entry that can be
// read on its own ("3": {...} with no brace inside); entries that are not objects are left out.
export function readAnswer(out) {
  const s = String(out || ''), got = {};
  const keep = (n, tr) => { if (/^\d+$/.test(n) && tr && typeof tr === 'object' && !Array.isArray(tr)) got[+n] = tr; };
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { const o = JSON.parse(s.slice(a, b + 1)); if (o && typeof o === 'object' && !Array.isArray(o)) { for (const [n, tr] of Object.entries(o)) keep(n, tr); return got; } } catch (e) { /* read entry by entry below */ } }
  for (const m of s.matchAll(/"(\d+)"\s*:\s*(\{[^{}]*\})/g)) { try { keep(m[1], JSON.parse(m[2])); } catch (e) { /* this one is cut */ } }
  return got;
}

export function makeTranslate({ ask, log = () => {}, atOnce = AT_ONCE } = {}) {
  const limit = Math.max(1, Math.floor(+atOnce) || AT_ONCE);
  return async function translate(texts, langs, srcLang, onPart, meter = null) {
    const map = {};
    if (!langs || !langs.length || !texts || !texts.length) return map;
    const uniq = [...new Set(texts)];   // a text repeated is asked once; texts differing by one character are each their own
    const parts = splitParts(uniq), all = uniq.length;
    let stopped = false, done = 0, progress = Promise.resolve();
    const got = new Map();   // source text -> {lang: text}
    // One question for these texts; returns the texts that did not come back (all of them when the question threw).
    const askOnce = async part => {
      if (stopped) return part;
      let out = '';
      try { out = await ask(translatePrompt(part, langs, srcLang), { what: 'translation', meter }); }
      catch (e) { if (!stopped) log('  translation skipped:', e && e.message ? e.message : String(e)); stopped = true; return part; }
      const tr = readAnswer(out), missing = [];
      part.forEach((t, n) => { if (tr[n]) got.set(t, tr[n]); else missing.push(t); });
      return missing;
    };
    // A part, then what it misses split in two and asked again, down to one text, at most SPLIT_LEVELS times.
    const onePart = async (part, level = 0) => {
      const missing = await askOnce(part);
      if (!missing.length || stopped || level >= SPLIT_LEVELS) return;
      const h = Math.ceil(missing.length / 2), halves = missing.length > 1 ? [missing.slice(0, h), missing.slice(h)] : [missing];
      for (const half of halves) await onePart(half, level + 1);
    };
    // At most `limit` parts at a time; progress only ever goes forward, in the order parts finish.
    let next = 0;
    const lane = async () => {
      while (!stopped && next < parts.length) {
        const part = parts[next++];
        await onePart(part);
        done += part.length;
        if (onPart) { const d = done; progress = progress.then(() => onPart(d, all)).catch(() => {}); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, parts.length) }, lane));
    await progress;
    for (const t of uniq) if (got.has(t)) map[t] = got.get(t);   // in the texts' order
    const left = all - got.size;
    if (left) log(`  translation: ${left} of ${all} text(s) stayed untranslated`);
    return map;
  };
}
