// Run before every build: content and UI strings must be complete, and no em-dashes anywhere.
// Usage: node engine/scripts/check-content.js <site>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { ENGINE, ROOT, siteDir, readSite } from '../site.config.js';

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
    for (const fl of m.flags || []) if (!base['f_' + fl]) errors.push(`${w} flag "${fl}" has no f_${fl} string`);
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
      four(it.description, `${s.id} "${it.id}" description`);
      if (typeof it.lat !== 'number') errors.push(`${s.id} "${it.id}" needs lat/lng`);
    }
  }
}

if (errors.length) { console.error(`Content check failed for ${SITE}:\n  ` + errors.join('\n  ')); process.exit(1); }
console.log(`Content check OK for ${SITE}: ${nMarkets} markets, ${LANGS.length} languages.`);
