#!/usr/bin/env node
// Makes the three sample houses' fixtures (README.md): node onboarding-site/modules/samples/make.mjs [slug ...]
// For each house of houses.mjs: a temporary submission and research folder, the real generator (engine/scripts/generate-site.py)
// into sites/<slug>/, the content check, guide-to-row, then <slug>.json beside this file. sites/<slug>/ and the temporary folders
// are always removed, also on failure. Nothing paid is called (no Claude, no Google); the generator reads the committed
// train stations and, when our public file answers, the metro, tram and bus stops of Spain (STOPS_BASE below).
// Environment: BASE_DATE=YYYY-MM-DD (default: today) is the day the fixture is dated and its events are counted from.
// FIRST=1 runs the generator without translations and prints the texts still to translate (to write translations.json).
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { HOUSES, dataOf } from './houses.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..');
const BASE = process.env.BASE_DATE || new Date().toISOString().slice(0, 10);
const STOPS = 'https://dmoxszfwulolqkgxtxcp.supabase.co/storage/v1/object/public/transit/stops-es/';
const want = process.argv.slice(2), houses = want.length ? HOUSES.filter(h => want.includes(h.slug)) : HOUSES;
const TRANSLATIONS = join(HERE, 'translations.json');
const tmps = [], sites = [];

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed (${r.status}):\n${(r.stderr || '') + (r.stdout || '')}`.slice(0, 4000));
  return r;
};
const tmp = prefix => { const d = mkdtempSync(join(tmpdir(), prefix)); tmps.push(d); return d; };
const put = (file, data) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data, null, 1)); };

// Our public stops file, one plain GET: used when it answers; else the houses get train stations only (said at the end).
let stopsBase = '';
try { const r = await fetch(STOPS + 'index.json', { signal: AbortSignal.timeout(20000) }); if (r.ok) stopsBase = STOPS; } catch (e) { /* no stops */ }
console.log(stopsBase ? 'public transport stops: from our storage' : 'public transport stops: the file did not answer, train stations only');

const untranslated = new Set(), made = [];
try {
  for (const h of houses) {
    const dir = join(ROOT, 'sites', h.slug);
    if (existsSync(dir)) throw new Error(`sites/${h.slug} exists already: remove it first (this script removes the folder it makes)`);
    sites.push(dir);
    const { answers, geocode, research } = dataOf(h, BASE);
    const sub = tmp('sample-sub-'), res = tmp('sample-res-'), noStops = tmp('sample-nostops-');
    put(join(sub, 'host.json'), { answers });
    put(join(sub, 'geocode.json'), geocode);
    for (const [f, d] of Object.entries(research)) put(join(res, f), d);
    const gen = ['engine/scripts/generate-site.py', sub, '--slug', h.slug, '--lat', String(h.lat), '--lng', String(h.lng), '--src', 'en', '--research', res];
    const env = { STOPS_DIR: noStops, ...(stopsBase ? { STOPS_BASE: stopsBase } : {}) };
    if (process.env.FIRST) {
      run('python3', gen, env);
      for (const t of JSON.parse(readFileSync(join(dir, 'docs/untranslated.json'), 'utf8'))) untranslated.add(t);
      continue;
    }
    if (!existsSync(TRANSLATIONS)) throw new Error('translations.json is missing: run with FIRST=1 to list the texts to translate');
    run('python3', [...gen, '--translations', TRANSLATIONS], env);
    const left = JSON.parse(readFileSync(join(dir, 'docs/untranslated.json'), 'utf8'));
    if (left.length) throw new Error(`${h.slug}: ${left.length} texts are not in translations.json, e.g. ${JSON.stringify(left.slice(0, 5))}`);
    const checked = run('node', ['engine/scripts/run.js', 'check', h.slug]);
    console.log(h.slug + ': ' + checked.stdout.trim().split('\n').pop());
    const row = JSON.parse(run('node', ['engine/scripts/guide-to-row.mjs', h.slug, '']).stdout);
    row.content.site.slug = h.slug; row.content.site.storageKey = h.slug; row.content.assetBase = '';
    const fixture = {
      _doc: `Sample house "${h.name}" for the owner's private test console, made by onboarding-site/modules/samples/make.mjs. A house in ${h.town}, at a public square, never a real home. Everything in it is made up (every place, market, event and service ends with "(sample)", the Wi-Fi is Sample-Guest with the made-up password sample-password, no phone but 112), except the town, 112 and the open data of Renfe's stations and the public transport stops (their timetable links are real). content and theme are what guide-to-row makes from the generator's site, as the worker saves a guide.`,
      slug: h.slug, name: h.name, kind: h.kind, town: h.town, lat: h.lat, lng: h.lng, base: BASE, content: row.content, theme: row.theme,
    };
    writeFileSync(join(HERE, h.slug + '.json'), JSON.stringify(fixture, null, 1) + '\n');
    made.push(h.slug);
  }
  if (process.env.FIRST) { console.log(JSON.stringify([...untranslated].sort(), null, 1)); console.log(untranslated.size + ' texts'); }
  else console.log('made: ' + made.join(', ') + ' (dated ' + BASE + ')');
} catch (e) {
  console.error(String(e.message || e)); process.exitCode = 1;
} finally {
  for (const d of [...sites, ...tmps]) rmSync(d, { recursive: true, force: true });
}
