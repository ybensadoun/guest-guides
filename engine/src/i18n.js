// UI strings live in engine/src/i18n/<lang>.json (shared by every site).
// A site can override any string in sites/<site>/i18n/<lang>.json (house name, area, welcome line...).
// The languages offered, and their order, come from the site's site.json.
import SITE from '@site/site.json';
const files = import.meta.glob('./i18n/*.json', { eager: true, import: 'default' });
const over = import.meta.glob('@site/i18n/*.json', { eager: true, import: 'default' });
const code = p => p.match(/(\w+)\.json$/)[1];
const O = Object.fromEntries(Object.entries(over).map(([p, v]) => [code(p), v]));
const I = Object.fromEntries(Object.entries(files).map(([p, v]) => [code(p), { ...v, ...O[code(p)] }]));

export const LANGS = (SITE.languages || ['en']).filter(l => I[l]);
// Shown in the language picker, each in its own language.
export const LANG_NAMES = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const KEY = (SITE.storageKey || SITE.slug) + '-lang';
const LOCALES = { en: 'en-GB', es: 'es-ES', fr: 'fr-FR', ca: 'ca-ES', de: 'de-DE', nl: 'nl-NL' };

// The language is part of the link (?lang=fr) so a page can be shared in a given language.
function fromUrl() {
  try { const l = new URLSearchParams(location.search).get('lang'); return LANGS.includes(l) ? l : null; } catch (e) { return null; }
}
function syncUrl(l) {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('lang') === l) return;
    u.searchParams.set('lang', l);
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (e) { /* ignore */ }
}

function detect() {
  const u = fromUrl();
  if (u) { try { localStorage.setItem(KEY, u); } catch (e) { /* ignore */ } return u; }
  try {
    const s = localStorage.getItem(KEY) || localStorage.getItem('cg-lang');
    if (LANGS.includes(s)) return s;
  } catch (e) { /* storage blocked */ }
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const c = String(l).slice(0, 2).toLowerCase();
    if (LANGS.includes(c)) return c;
  }
  return LANGS.includes('en') ? 'en' : LANGS[0];
}

export let lang = detect();
syncUrl(lang);
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  syncUrl(l);
  try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
}

export const t = (k, v) => {
  let s = (I[lang] && I[lang][k]) ?? I.en[k] ?? k;
  if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]);
  return s;
};
export const tx = o => (o ? o[lang] || o.en || '' : '');
export const locale = () => LOCALES[lang] || 'en-GB';
