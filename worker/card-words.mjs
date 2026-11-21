// The words of a found place's card in the maker's languages (Yohann, 21 Nov 2026: "Go ahead", on the main conversation's
// question, under one cent a house). The research writes every text in English only (research-brief.mjs) and the build
// translates the guide later, so a host working in Catalan, Spanish or French read the cards of the deck in English until
// then. Here the things to do a research found get their description and their kind in words in Spanish, French and
// Catalan, beside the English, in ONE question to the translator (the worker's own translate(), Haiku, on the research's
// meter and within the day's budget: past it the translator refuses and the English stays).
// It never fails or slows a research: its own try, a ceiling, the English kept on any error. Names are left alone: the
// deck and the generator know a found place by its English name (start.js researchCards, generate-site.py en_name).
// What the build does with it: the generator keeps a language a text already holds (localize), so the guide says what the
// host read on the card. Tests: worker/test/card-words.test.mjs (a stand-in translator, no network).
export const CARD_LANGS = ['es', 'fr', 'ca'];   // the maker's languages beside English (onboarding-site/src/i18n.js UI_LANGS)
export const CARD_MAX = 40;                     // translate() asks 40 texts a question: more would be a second call
export const CARD_MS = 60000;                   // the ceiling: past it the cards keep their English

const isWords = o => !!o && typeof o === 'object' && !Array.isArray(o) && typeof o.en === 'string' && !!o.en.trim();
const lacks = o => CARD_LANGS.some(l => !(typeof o[l] === 'string' && o[l].trim()));
// A card's texts: the description first (the kind in words has a stand-in in the maker, the kind's own name).
const wordsOf = items => { const list = Array.isArray(items) ? items.filter(it => it && typeof it === 'object') : [];
  return [...list.map(it => it.description), ...list.map(it => it.type)].filter(o => isWords(o) && lacks(o)); };

// The English texts to ask for, each once, at most one question's worth.
export const cardTexts = items => [...new Set(wordsOf(items).map(o => o.en))].slice(0, CARD_MAX);

// A translation we may write beside the English: a text, not empty, with no dash the guide's check refuses.
const fit = s => typeof s === 'string' && !!s.trim() && !/[—–]/.test(s);

// The translations into the cards: only a language the text does not hold yet, never the English, never a name. Returns
// how many texts were written. map: { "<English text>": { es, fr, ca } }, as translate() returns it.
export function applyWords(items, map) {
  let n = 0; if (!map || typeof map !== 'object') return n;
  for (const o of wordsOf(items)) { const t = map[o.en]; if (!t || typeof t !== 'object') continue;
    for (const l of CARD_LANGS) if (!(typeof o[l] === 'string' && o[l].trim()) && fit(t[l])) { o[l] = t[l].trim(); n++; } }
  return n;
}

// One question to the translator for these items: translate(texts, langs, 'en') -> the map above. Returns the map, or
// null (nothing to ask, the translator failed or refused, or it took longer than ms): never a throw.
export async function cardWords(items, translate, { ms = CARD_MS, log = () => {} } = {}) {
  let t = null;
  try {
    const texts = cardTexts(items); if (!texts.length || typeof translate !== 'function') return null;
    const late = new Promise(done => { t = setTimeout(() => done('late'), ms); t.unref?.(); });
    const ask = Promise.resolve().then(() => translate(texts, CARD_LANGS, 'en')); ask.catch(() => {});   // an answer after the ceiling is dropped, its error too
    const map = await Promise.race([ask, late]);
    if (map === 'late') { log(`cards' words not translated in ${Math.round(ms / 1000)} s: the English stays`); return null; }
    return map && typeof map === 'object' && Object.keys(map).length ? map : null;
  } catch (e) { log("cards' words not translated: " + (e && e.message ? e.message : e)); return null; }
  finally { clearTimeout(t); }
}
