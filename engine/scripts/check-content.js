// Run before every build: content and UI strings must be complete, and no em-dashes anywhere.
// Usage: node engine/scripts/check-content.js <site>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { ENGINE, ROOT, siteDir, readSite } from '../site.config.js';
const FLAGS = JSON.parse(readFileSync(resolve(ENGINE, 'src/flags.json'), 'utf8')).flags;   // the only warnings a place can carry
const GROUPS = JSON.parse(readFileSync(resolve(ENGINE, 'src/groups.json'), 'utf8')).groups;   // the only quick-filter groups

const SITE = process.argv[2] || process.env.SITE || 'ca-la-kimberly';
const SD = siteDir(SITE);
const site = readSite(SITE);
const LANGS = site.languages;
const on = id => site.modules[id] !== false;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const errors = [];
const rel = p => relative(ROOT, p);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const C = f => resolve(SD, 'content', f + '.json');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
const jsonIn = d => (existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.json')).map(f => resolve(d, f)) : []);

const files = [...jsonIn(resolve(SD, 'content')), ...jsonIn(resolve(SD, 'i18n')), ...jsonIn(resolve(ENGINE, 'src/i18n')),
  resolve(SD, 'site.json'), resolve(ENGINE, 'index.html'), ...walk(resolve(ENGINE, 'src')).filter(f => /\.(js|css)$/.test(f))];
if (existsSync(resolve(SD, 'theme.css'))) files.push(resolve(SD, 'theme.css'));
else errors.push(`${rel(SD)}/theme.css is missing (it can hold just a comment)`);

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  raw.split('\n').forEach((line, i) => { if (line.includes('\u2014')) errors.push(`${rel(f)}:${i + 1} contains an em-dash`); });
}

for (const k of ['name', 'languages']) if (!site[k] || (Array.isArray(site[k]) && !site[k].length)) errors.push(`site.json needs "${k}"`);
for (const f of ['house', 'sections']) if (!existsSync(C(f))) errors.push(`content/${f}.json is missing`);
if (site.logo && !existsSync(resolve(SD, 'public', site.logo))) errors.push(`site.json logo "${site.logo}" is not in public/`);

// UI strings: engine strings merged with the site's overrides, complete in every language the site offers.
const over = l => (existsSync(resolve(SD, 'i18n', l + '.json')) ? read(resolve(SD, 'i18n', l + '.json')) : {});
const i18n = Object.fromEntries(LANGS.map(l => [l, { ...read(resolve(ENGINE, 'src/i18n', l + '.json')), ...over(l) }]));
const base = i18n.en || i18n[LANGS[0]];
for (const k of Object.keys(base)) for (const l of LANGS) if (!(k in i18n[l])) errors.push(`i18n ${l} is missing "${k}"`);

const four = (o, what) => { for (const l of LANGS) if (!o || !String(o[l] || '').trim()) errors.push(`${what} is missing ${l}`); };

let nMarkets = 0;
if (on('markets') && existsSync(C('markets'))) {
  const mk = read(C('markets'));
  const ids = new Set();
  for (const m of mk.markets) {
    const w = `market "${m.id}"`;
    if (ids.has(m.id)) errors.push(`${w} duplicate id`); ids.add(m.id);
    if (!mk.categories.includes(m.category)) errors.push(`${w} unknown category ${m.category}`);
    four(m.name, `${w} name`);
    four(m.description, `${w} description`);
    if (typeof m.lat !== 'number' || typeof m.lng !== 'number') errors.push(`${w} needs lat/lng`);
    if (!m.schedule.length) four(m.occasional_when, `${w} occasional_when`);
    for (const s of m.schedule) {
      if (!s.days.every(d => DAYS.includes(d))) errors.push(`${w} bad day in ${s.days}`);
      if (!/^\d\d:\d\d$/.test(s.open) || !/^\d\d:\d\d$/.test(s.close)) errors.push(`${w} bad time`);
    }
    for (const tg of m.tags || []) if (!base['t_' + tg]) errors.push(`${w} tag "${tg}" has no t_${tg} string`);
    for (const fl of m.flags || []) if (!FLAGS.includes(fl)) errors.push(`${w} flag "${fl}" is not a warning (engine/src/flags.json)`); else if (!base['f_' + fl]) errors.push(`${w} flag "${fl}" has no f_${fl} string`);
  }
  nMarkets = mk.markets.length;
}

for (const s of read(C('sections')).sections) {
  if (!on(s.id)) continue;
  if (!base[s.labelKey]) errors.push(`section "${s.id}" label key "${s.labelKey}" missing in i18n`);
  if (s.kind !== 'markets' && s.status === 'live' && !existsSync(C(s.file || s.id))) errors.push(`section "${s.id}" is live but content/${s.file || s.id}.json is missing`);
  if (s.kind === 'spots' && s.status === 'live') {
    for (const it of read(C(s.id)).items) {
      four(it.name, `${s.id} "${it.id}" name`);
      if (!it.hostPick || it.description) four(it.description, `${s.id} "${it.id}" description`);   // a host's own pick may have no comment
      if (typeof it.lat !== 'number') errors.push(`${s.id} "${it.id}" needs lat/lng`);
      if (it.group && !(it.group in GROUPS)) errors.push(`${s.id} "${it.id}" group "${it.group}" is not a filter group (engine/src/groups.json)`);
    }
  }
  // Event dates: YYYY-MM-DD, the end not before the start; "time" (start) and "until" (end on the last day) are optional HH:MM.
  if (s.kind === 'events' && s.status === 'live') {
    for (const e of read(C(s.file || s.id)).items || []) for (const d of e.dates || []) {
      const w = `${s.id} "${e.id}" date ${d.start}`;
      if (!/^\d{4}-\d\d-\d\d$/.test(d.start) || !/^\d{4}-\d\d-\d\d$/.test(d.end) || d.end < d.start) errors.push(`${w}: start and end must be YYYY-MM-DD, end not before start`);
      for (const k of ['time', 'until']) if (d[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d[k])) errors.push(`${w}: ${k} "${d[k]}" must be HH:MM`);
    }
  }
}

// Typography (docs/TYPOGRAPHY.md): Spanish ¿ ¡, Catalan punt volat, Dutch IJ, German quotes, German du (not Sie).
const formal = [];
const lint = (l, v, w) => {
  if (typeof v !== 'string') return;
  if (l === 'es') for (const x of v.split(/(?<=[.?!])\s+/)) { if (x.includes('?') && !x.includes('¿')) errors.push(`${w} (es) question without ¿: ${x.slice(0, 60)}`); if (x.includes('!') && !x.includes('¡')) errors.push(`${w} (es) exclamation without ¡: ${x.slice(0, 60)}`); }
  if (l === 'ca' && /l[.•∙ŀ⋅]l/i.test(v)) errors.push(`${w} (ca) use the punt volat l·l`);
  if (l === 'nl' && /\bIj/.test(v)) errors.push(`${w} (nl) write IJ, not Ij`);
  if (l === 'de' && v.includes('"')) errors.push(`${w} (de) use „…“ quotes, not "…"`);
  if (l === 'de' && /\b(Bringen|Rufen|Spielen|Versuchen|Öffnen|Nehmen|Fragen|Kommen|Gehen|Schauen|Lassen|Stellen|Legen|Werfen|Parken|Buchen|Reservieren) Sie\b/.test(v)) formal.push(w);
};
// An untranslated copy of the English text (v === o.en) is not linted as another language.
const lintAll = (o, w) => { if (Array.isArray(o)) o.forEach((x, i) => lintAll(x, `${w}[${i}]`)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(k) && typeof v === 'string') { if (k === 'en' || v !== o.en) lint(k, v, w); } else lintAll(v, `${w}.${k}`); } };
for (const f of jsonIn(resolve(SD, 'content'))) lintAll(read(f), rel(f));
for (const l of LANGS) for (const [k, v] of Object.entries(i18n[l])) lint(l, v, `i18n ${l}.${k}`);

// German: the engine strings say du; a guide that says Sie in its own texts mixes both (warning, the host may want Sie everywhere).
if (formal.length && LANGS.includes('de')) console.warn(`Typography warning for ${SITE}: ${formal.length} German text(s) say Sie while the engine says du, e.g. ${formal[0]}`);

if (errors.length) { console.error(`Content check failed for ${SITE}:\n  ` + errors.join('\n  ')); process.exit(1); }
console.log(`Content check OK for ${SITE}: ${nMarkets} markets, ${LANGS.length} languages.`);
