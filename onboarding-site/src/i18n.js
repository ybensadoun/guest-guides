/* ---------- The maker's languages: Català, Español, Français, English ----------
   The maker is written in English. i18n/ui.json holds every sentence it shows with its Catalan, Spanish and French
   (build.py puts it in the page as UI_T, French spaces added). Whatever reaches the screen goes through the table on
   the way (a MutationObserver), so no screen needs code of its own. Sentences with a number or a name in them are
   patterns: "{n} places". The phone with the guide is watched too (uiAttach). Left as they are: anything inside
   translate="no" (amenity names, already in the language; the product name), what is typed in a field, and what the
   table does not have (the host's words, place names). The language is in the address (?lang=es, to share the maker in
   one language; a link's language wins) and remembered on this device (porta-lang-v1); the first time it follows the
   browser. It is also the language Claude writes a new guide in: A.sourceLang is set when the
   listing is read (start.js) or on Publish (account.js), never by switching here, so a guide keeps its own language.
   Collecting (the builder checks): every sentence shown that is not in the table goes to window.__i18nReport. */
const UI_LANGS = [['ca', 'Català'], ['es', 'Español'], ['fr', 'Français'], ['en', 'English']];
const UI_KEY = 'porta-lang-v1', UI_WORD = { ca: 'Idioma', es: 'Idioma', fr: 'Langue', en: 'Language' };
let UIL = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (UI_LANGS.some(l => l[0] === q)) { try { localStorage.setItem(UI_KEY, q); } catch (e) {} return q; }
  try { const s = localStorage.getItem(UI_KEY); if (UI_LANGS.some(l => l[0] === s)) return s; } catch (e) {}
  const n = (navigator.languages || [navigator.language || 'en']).map(x => String(x).slice(0, 2).toLowerCase()).find(x => UI_LANGS.some(l => l[0] === x));
  return n || 'en';
})();
const UI_T = __UI_TABLE__;
// Patterns: "{n} places" -> a test on the words around the gaps first, then the regular expression. {n}, {m}, {k} hold
// a number, {t} a time (19:00), any other name any words.
const UI_GAP = { n: '(\\d+(?:[.,]\\d+)?)', m: '(\\d+(?:[.,]\\d+)?)', k: '(\\d+(?:[.,]\\d+)?)', t: '(\\d{1,2}:\\d{2})' };
const UI_P = Object.keys(UI_T).filter(k => /\{\w+\}/.test(k)).map(k => {
  const names = [...k.matchAll(/\{(\w+)\}/g)].map(m => m[1]), lits = k.split(/\{\w+\}/);
  const rx = new RegExp('^' + lits.map((x, i) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (i < names.length ? UI_GAP[names[i]] || '([\\s\\S]+?)' : '')).join('') + '$');
  return { rx, names, pre: k.slice(0, k.indexOf('{')), post: k.slice(k.lastIndexOf('}') + 1), e: UI_T[k], lit: lits.join('').length };
}).sort((a, b) => b.lit - a.lit);   // the most specific first: "{x} · ★ {n} · {m} km" before "{x} · {n} km"
const UI_CACHE = new Map();
const uiCollect = () => typeof window.__i18nReport === 'function';
function trS(s){
  if (UI_CACHE.has(s)) return UI_CACHE.get(s);
  let out = null;
  const e = UI_T[s];
  if (e) out = UIL === 'en' ? s : e[UIL] ?? null;
  else {
    for (const p of UI_P) {
      if (!s.startsWith(p.pre) || !s.endsWith(p.post)) continue;
      const m = s.match(p.rx); if (!m) continue;
      let t = UIL === 'en' ? s : p.e[UIL]; if (t == null) break;
      if (UIL !== 'en') p.names.forEach((nm, i) => { const val = m[i + 1]; t = t.split('{' + nm + '}').join(trS(val) ?? val); });
      out = t; break;
    }
    // A list of step or section names: "Wi-Fi, Rubbish"
    if (out == null && s.includes(', ')) { const parts = s.split(', ').map(trS); if (parts.every(x => x != null)) out = parts.join(', '); }
    // Parts in a row: "House · 8 guests · 4 bedrooms" (a part with no letters stays as it is)
    if (out == null && s.includes(' · ')) { const parts = s.split(' · ').map(x => /\p{L}/u.test(x) ? trS(x) : x); if (parts.every(x => x != null)) out = parts.join(' · '); }
    // Short day names in a row: "Mo Th Su"
    if (out == null && /^(\p{L}{2,3} )+\p{L}{2,3}$/u.test(s)) { const parts = s.split(' ').map(trS); if (parts.every(x => x != null)) out = parts.join(' '); }
  }
  UI_CACHE.set(s, out);
  return out;
}
// For code that needs a sentence itself (confirm, the page title): the translation, or the English.
const tr = s => { const k = String(s ?? ''), t = k.trim(); if (!t) return k; const x = trS(t); return x == null ? k : k.replace(t, x); };
const UI_SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE']);
const UI_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const ORIG = new WeakMap(), WROTE = new WeakMap(), ORIGA = new WeakMap(), WROTEA = new WeakMap();
const uiMissed = new Set();
function uiMiss(s, where){
  if (!uiCollect() || uiMissed.has(s)) return;
  uiMissed.add(s); try { window.__i18nReport(s, where); } catch (e) {}
}
const uiLeave = el => !el || UI_SKIP.has(el.nodeName) || !!el.closest('[translate="no"],[contenteditable="true"]');
function uiText(n){
  if (WROTE.get(n) === n.data) return;   // our own translation coming back
  const el = n.parentElement; if (uiLeave(el)) return;
  const raw = n.data, t = raw.trim();
  if (!t || !/\p{L}/u.test(t)) return;
  const x = trS(t);
  if (x == null) { uiMiss(t, el.nodeName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')); if (ORIG.has(n) && UIL === 'en') ORIG.delete(n); return; }
  ORIG.set(n, raw);
  const nd = raw.replace(t, x);
  if (nd !== raw) { WROTE.set(n, nd); n.data = nd; }
}
function uiAttr(el, a){
  const v = el.getAttribute(a); if (v == null) return;
  const w = WROTEA.get(el); if (w && w[a] === v) return;
  if (uiLeave(el)) return;
  const t = v.trim(); if (!t || !/\p{L}/u.test(t)) return;
  const x = trS(t);
  if (x == null) { uiMiss(t, '@' + a); return; }
  const o = ORIGA.get(el) || {}; o[a] = v; ORIGA.set(el, o);
  const nv = v.replace(t, x);
  if (nv !== v) { const ww = w || {}; ww[a] = nv; WROTEA.set(el, ww); el.setAttribute(a, nv); }
}
function uiWalk(root){
  if (UIL === 'en' && !uiCollect()) return;
  if (root.nodeType === 3) return uiText(root);
  if (root.nodeType !== 1 || UI_SKIP.has(root.nodeName)) return;
  const w = (root.ownerDocument || document).createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 && (UI_SKIP.has(n.nodeName) || n.getAttribute('translate') === 'no') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n = root; n; n = w.nextNode()) {
    if (n.nodeType === 3) uiText(n);
    else for (const a of UI_ATTRS) if (n.hasAttribute(a)) uiAttr(n, a);
  }
}
const uiObs = new MutationObserver(recs => {
  if (UIL === 'en' && !uiCollect()) return;
  for (const r of recs) {
    if (r.type === 'childList') r.addedNodes.forEach(uiWalk);
    else if (r.type === 'characterData') uiText(r.target);
    else if (r.type === 'attributes') uiAttr(r.target, r.attributeName);
  }
});
const UI_OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: UI_ATTRS }, UI_DOCS = new Set([document]);
uiObs.observe(document.documentElement, UI_OPTS);
// Another document of the maker (the phone with the guide in it): watched the same way.
function uiAttach(doc){ try { UI_DOCS.add(doc); uiObs.observe(doc.documentElement, UI_OPTS); if (doc.body) uiWalk(doc.body); } catch (e) {} }
// Switching: every sentence on screen goes back to its English, then to the new language.
function uiRedo(){
  for (const d of UI_DOCS) { if (!d.defaultView || !d.body) { UI_DOCS.delete(d); continue; } uiRedoIn(d); }
}
function uiRedoIn(doc){
  const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = doc.body; n; n = w.nextNode()) {
    if (n.nodeType === 3) { if (ORIG.has(n)) { const o = ORIG.get(n); WROTE.delete(n); if (n.data !== o) n.data = o; } }
    else { const o = ORIGA.get(n); if (o) { WROTEA.delete(n); for (const a in o) if (n.getAttribute(a) !== o[a]) n.setAttribute(a, o[a]); } }
  }
  uiWalk(doc.body);
}
const uiTitle = document.title;
// The header holds the name, the save state and the picker on one line: the save state's words go when they do not fit.
function fitTop(){
  const h = document.querySelector('header.top'); if (!h) return;
  h.classList.remove('tight');
  const s = h.querySelector('.save'), p = h.querySelector('.lpick'), b = h.querySelector('.brand');
  const need = s ? [...s.children].reduce((w, c) => w + c.getBoundingClientRect().width, 0) + 7 : 0;   // the dot, the gap and the words
  if (s && p && b && need > s.getBoundingClientRect().width + 1) h.classList.add('tight');
}
addEventListener('resize', fitTop);
new MutationObserver(() => requestAnimationFrame(fitTop)).observe(document.getElementById('saveState') || document.body, { childList: true, subtree: true, characterData: true });
// The address keeps ?lang= whenever the page changes it (steps, sign-in), so it can be copied and shared at any time.
function uiUrl(u){
  try {
    const x = new URL(u == null ? location.href : u, location.href);
    if (x.origin !== location.origin || x.searchParams.get('lang') === UIL) return u;
    x.searchParams.set('lang', UIL); return x.pathname + x.search + x.hash;
  } catch (e) { return u; }
}
for (const f of ['pushState', 'replaceState']) { const o = history[f].bind(history); history[f] = (s, t, u) => o(s, t, uiUrl(u)); }
function uiApply(){
  document.documentElement.lang = UIL;
  history.replaceState(history.state, '');
  document.title = tr(uiTitle);
  requestAnimationFrame(fitTop);
  document.querySelectorAll('.lpick').forEach(p => { p.querySelector('span').textContent = UIL.toUpperCase(); const s = p.querySelector('select'); s.value = UIL; s.setAttribute('aria-label', UI_WORD[UIL]); });
}
function setUiLang(l){
  if (!UI_LANGS.some(x => x[0] === l) || l === UIL) return;
  UIL = l; UI_CACHE.clear();
  try { localStorage.setItem(UI_KEY, l); } catch (e) {}
  uiApply(); uiRedo();
  dispatchEvent(new Event('porta-lang'));   // for what is written with dates (the example guide)
  try { if (typeof log === 'function') log('lang', l); } catch (e) {}
}
const langPick = () => `<label class="lpick" translate="no"><span aria-hidden="true">${UIL.toUpperCase()}</span><select data-uilang aria-label="${UI_WORD[UIL]}">${UI_LANGS.map(([c, n]) => `<option value="${c}"${c === UIL ? ' selected' : ''} lang="${c}">${n}</option>`).join('')}</select></label>`;
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-uilang]')) setUiLang(e.target.value); });
for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f].bind(window); window[f] = (m, ...r) => o(tr(m), ...r); }
{ const h = document.querySelector('header.top'); if (h && !h.querySelector('.lpick')) h.insertAdjacentHTML('beforeend', langPick()); }
uiApply(); if (document.body) uiWalk(document.body);
