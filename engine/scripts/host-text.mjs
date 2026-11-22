// A host's own words, repaired before the content check (Yohann, 22 Nov 2026: a build never fails because of what a host
// typed). Only what can be repaired safely, and only in the language the text is written in (docs/TYPOGRAPHY.md):
//   every language  an em-dash, or an en-dash with a space on both sides, between words becomes a comma ("No em-dashes,
//                   in any language. Use commas or periods"); an em-dash between two numbers becomes an en-dash (10\u201312);
//                   at the start or the end of a line it goes
//   es              the opening ¿ and ¡ at the start of a sentence that ends in ? or ! and has none
//   ca              l.l, l-l (and ŀl, l•l) between letters becomes the punt volat l·l
//   de              straight double quotes become „…“
//   nl              Ij at the start of a word becomes IJ
// Never touched: a web address, an email, a phone number, a file name, anything code-like (a token with / \ _ = @ # < > { }
// |, or a dot between letters that ends like a domain), and every file outside content/, i18n/ and site.json's name (the
// Wi-Fi is in private/, never read here). What is left after this is a note in the worker's log, never a failed build
// (check-content.js --host).
//   node engine/scripts/host-text.mjs <site folder> [source language]   repairs the folder in place, prints what it changed
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
const TLD = 'com|net|org|es|cat|eu|fr|de|nl|be|ch|at|uk|it|pt|io|co|me|info|app|biz|travel|online|site|shop|dev|html?|php|pdf|jpe?g|png|webp|gif|svg|json';
// The parts of a text kept exactly as written: web addresses, emails, phone numbers, code-like tokens, domains and files.
const KEEP = new RegExp([
  String.raw`\b(?:https?:\/\/|www\.)\S+`,
  String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`,
  String.raw`\+?\d[\d ().\/-]{5,}\d`,
  String.raw`\S*[\/\\_=@#<>{}|\x60]\S*`,
  String.raw`\b[\w-]+(?:\.[\w-]+)*\.(?:${TLD})\b\S*`,
].join('|'), 'giu');
const PU = 0xE000;   // a kept part stands as one private-use character while the rest is repaired (not a letter, not punctuation)

function masked(text, fn) {
  const kept = [];
  const m = text.replace(KEEP, x => { kept.push(x); return String.fromCharCode(PU + kept.length - 1); });
  if (kept.length > 6000) return text;   // never happens with a host's text; the private-use range must not run out
  return fn(m).replace(/[-]/g, c => kept[c.charCodeAt(0) - PU] ?? c);
}

const PUNCT = /[,.;:!?…¡¿]$/;
function dashes(s) {
  return s.split('\n').map(line => {
    let l = line.replace(/(\d)[ \t]*\u2014[ \t]*(?=\d)/g, '$1\u2013');                       // 10 to 12 with an em-dash: a range
    l = l.replace(/^([ \t]*)(?:\u2014|\u2013(?=[ \t]))[ \t]*/, '$1');                        // a dash as a bullet or an opening
    l = l.replace(/[ \t]*(?:\u2014|(?<=[ \t])\u2013(?=[ \t]))[ \t]*$/, '');                   // a dash at the end of the line
    l = l.replace(/[ \t]*(?:\u2014|(?<=[ \t])\u2013(?=[ \t]))[ \t]*/g, (x, at, all) => {   // between words: a comma
      const before = all.slice(0, at), after = all.slice(at + x.length);
      if (PUNCT.test(before.trimEnd())) return ' ';
      if (/^[,.;:!?…)]/.test(after)) return '';
      return ', ';
    });
    return l;
  }).join('\n');
}

// Spanish: a sentence ends at . ? ! … followed by a space or the end; one that ends in ? or ! (or holds one) with no ¿ or ¡
// gets it before its first letter or number.
function spanish(s) {
  return s.split('\n').map(line => line.split(/((?<=[.?!…])\s+)/).map((x, i) => {
    if (i % 2) return x;
    const open = (mark, inv) => { if (!x.includes(mark) || x.includes(inv)) return; const k = x.search(/[\p{L}\p{N}«"“'(-]/u); if (k >= 0) x = x.slice(0, k) + inv + x.slice(k); };
    open('?', '¿'); open('!', '¡');
    return x;
  }).join('')).join('\n');
}

const catalan = s => s.replace(/(?<=\p{L})l[.\-•∙⋅]l(?=\p{L})/gu, 'l·l').replace(/(?<=\p{L})L[.\-•∙⋅]L(?=\p{L})/gu, 'L·L')
  .replace(/ŀl/g, 'l·l').replace(/Ŀl/g, 'L·l').replace(/ĿL/g, 'L·L');
const german = s => { let open = true; return s.replace(/"/g, () => { const q = open ? '„' : '“'; open = !open; return q; }); };
const dutch = s => s.replace(/\bIj/g, 'IJ');

// One text in its own language: the same text back when nothing needed repairing.
export function repairText(text, lang) {
  if (typeof text !== 'string' || !text) return text;
  return masked(text, s => {
    let t = dashes(s);
    if (lang === 'es') t = spanish(t);
    if (lang === 'ca') t = catalan(t);
    if (lang === 'de') t = german(t);
    if (lang === 'nl') t = dutch(t);
    return t;
  });
}

// A text in several languages ({"en": ..., "ca": ...}): each in the language it is written in. A copy of the source
// language's text in another language's place (not translated yet, gen L()) is the source language's words: it gets the
// source's repairs, and stays the same copy.
const isLangs = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => LANGS.includes(k)) && Object.values(o).every(v => typeof v === 'string');
export function repairLangs(o, src = 'en') {
  const out = {};
  for (const [l, v] of Object.entries(o)) out[l] = repairText(v, l !== src && o[src] !== undefined && v === o[src] ? src : l);
  return out;
}
export function repairTree(x, src = 'en', count = { n: 0 }) {
  if (Array.isArray(x)) return x.map(y => repairTree(y, src, count));
  if (isLangs(x)) { const r = repairLangs(x, src); for (const l of Object.keys(x)) if (r[l] !== x[l]) count.n++; return r; }
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, repairTree(v, src, count)]));
  return x;
}

// A generated site folder, in place: content/*.json (texts in several languages), i18n/<lang>.json (the site's own strings,
// each in its file's language, or the source's when it is a copy of it) and site.json's name. Says what it changed.
export function repairSite(dir, src = 'en') {
  const changed = [], json = f => JSON.parse(readFileSync(f, 'utf8'));
  // Written back with the generator's own layout (json.dumps(..., ensure_ascii=False, indent=1)), and only when changed.
  const save = (f, before, after) => { if (JSON.stringify(before) !== JSON.stringify(after)) writeFileSync(f, JSON.stringify(after, null, 1) + (readFileSync(f, 'utf8').endsWith('\n') ? '\n' : '')); };
  const cdir = join(dir, 'content');
  if (existsSync(cdir)) for (const f of readdirSync(cdir).filter(f => f.endsWith('.json')).sort()) {
    const p = join(cdir, f), before = json(p), count = { n: 0 }, after = repairTree(before, src, count);
    if (count.n) { save(p, before, after); changed.push(`content/${f}: ${count.n}`); }
  }
  const idir = join(dir, 'i18n'), files = existsSync(idir) ? Object.fromEntries(readdirSync(idir).filter(f => /^[a-z]{2}\.json$/.test(f) && LANGS.includes(f.slice(0, 2))).map(f => [f.slice(0, 2), json(join(idir, f))])) : {};
  for (const [l, obj] of Object.entries(files)) {
    let n = 0; const after = {};
    for (const [k, v] of Object.entries(obj)) {
      const as = l !== src && files[src] && files[src][k] === v ? src : l;
      after[k] = typeof v === 'string' ? repairText(v, as) : v; if (after[k] !== v) n++;
    }
    if (n) { save(join(idir, l + '.json'), obj, after); changed.push(`i18n/${l}.json: ${n}`); }
  }
  const sf = join(dir, 'site.json');
  if (existsSync(sf)) { const s = json(sf), name = repairText(s.name, src);
    if (name !== s.name) { save(sf, s, { ...s, name }); changed.push('site.json: name'); } }
  return changed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, src = 'en'] = process.argv.slice(2);
  if (!dir || !existsSync(dir)) { console.error('Usage: node engine/scripts/host-text.mjs <site folder> [source language]'); process.exit(2); }
  const c = repairSite(resolve(dir), src);
  console.log(c.length ? 'Repaired: ' + c.join(', ') : 'Nothing to repair');
}
