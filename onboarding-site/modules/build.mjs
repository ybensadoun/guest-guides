#!/usr/bin/env node
// The modules page's two copied lists (run from anywhere: node onboarding-site/modules/build.mjs):
//   available.json      the engine's list of parts and countries (engine/src/modules/available.json), checked, as it is:
//                       Netlify serves only onboarding-site/, so the page reads this copy. Never edit the copy.
//   samples/index.json  the sample houses there are fixtures for (samples/sample-*.json, made by samples/make.mjs):
//                       slug, name, kind, town, base, without their content.
// A test keeps the copies in step with their sources (engine/scripts/available.test.mjs).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../..');
export const SOURCE = resolve(ROOT, 'engine/src/modules/available.json');

// What the list must be, in plain messages: [] when it is right.
export function checkList(a) {
  const bad = [], isCode = c => /^[A-Z]{2}$/.test(c), isId = s => /^[a-z][a-z0-9-]*$/.test(s || '');
  if (!a || !Array.isArray(a.modules)) return ['no modules'];
  if (!Array.isArray(a.countries) || !a.countries.length || !a.countries.every(isCode)) bad.push('countries: a list of two-letter country codes');
  const seen = new Set();
  for (const m of a.modules) {
    if (!isId(m.id) || seen.has(m.id)) bad.push(`module ${m.id}: an id of its own, in small letters`);
    seen.add(m.id);
    if (!m.name) bad.push(`module ${m.id}: no name`);
    if (!Array.isArray(m.parts) || !m.parts.length) { bad.push(`module ${m.id}: no parts`); continue; }
    const ps = new Set();
    for (const p of m.parts) {
      const k = `${m.id}/${p.id}`;
      if (!isId(p.id) || ps.has(p.id)) bad.push(`${k}: an id of its own, in small letters`);
      ps.add(p.id);
      if (!p.name) bad.push(`${k}: no name`);
      if (!(p.where === 'any' || (Array.isArray(p.where) && p.where.length && p.where.every(isCode)))) bad.push(`${k}: where is "any" or a list of country codes`);
      if (!p.why || /\u2014/.test(p.why + p.name)) bad.push(`${k}: a why, without an em-dash`);
      if (p.where !== 'any' && (!p.needs || /\u2014/.test(p.needs))) bad.push(`${k}: tied to countries, so it says what it needs elsewhere, without an em-dash`);
      if (p.where === 'any' && p.needs) bad.push(`${k}: works anywhere, so it needs nothing`);
    }
  }
  return bad;
}
export function samplesIndex(dir = resolve(HERE, 'samples')) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /^sample-[a-z0-9-]+\.json$/.test(f)).sort().map(f => { const x = JSON.parse(readFileSync(resolve(dir, f), 'utf8')); return { slug: x.slug, name: x.name, kind: x.kind, town: x.town, base: x.base }; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = readFileSync(SOURCE, 'utf8'), bad = checkList(JSON.parse(text));
  if (bad.length) { console.error('available.json:\n- ' + bad.join('\n- ')); process.exit(1); }
  writeFileSync(resolve(HERE, 'available.json'), text);
  const idx = samplesIndex();
  writeFileSync(resolve(HERE, 'samples/index.json'), JSON.stringify(idx, null, 1) + '\n');
  console.log(`modules page: available.json copied (${JSON.parse(text).modules.length} modules), ${idx.length} sample houses listed`);
}
