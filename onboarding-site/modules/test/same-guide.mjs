#!/usr/bin/env node
// The same guide, byte for byte: the generator of this checkout against the generator of another commit (default
// origin/main), on the sample houses' made-up answers (samples/houses.mjs) at their own positions in Spain and at a
// border, where the country is not known. For a change that must take nothing from such a house (the launch desk's
// gates): every file of the generated site folder is compared.
//   node onboarding-site/modules/test/same-guide.mjs [git ref]
// Also run with the file the worker hands the generator (launch.json: the owner's word, empty, and none), which the
// other commit's generator may not know: the output must still be the same. Nothing paid is called; the stops come from
// our public storage when it answers. The site folders and the copy of the other generator are always removed.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { HOUSES, dataOf } from '../samples/houses.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..'), REF = process.argv[2] || 'origin/main';
const BASE = new Date().toISOString().slice(0, 10), STOPS = 'https://dmoxszfwulolqkgxtxcp.supabase.co/storage/v1/object/public/transit/stops-es/';
const OLD = join(ROOT, 'engine/scripts/.generate-site-ref.py'), tmps = [], sites = [];
const tmp = p => { const d = mkdtempSync(join(tmpdir(), p)); tmps.push(d); return d; };
const put = (f, d) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(d, null, 1)); };
const walk = (d, out = {}, root = d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out, root); else out[relative(root, p)] = createHash('sha1').update(readFileSync(p)).digest('hex'); } return out; };
let stopsBase = ''; try { const r = await fetch(STOPS + 'index.json', { signal: AbortSignal.timeout(20000) }); if (r.ok) stopsBase = STOPS; } catch (e) { /* train stations only */ }

let pass = 0, fail = 0;
try {
  const old = spawnSync('git', ['show', `${REF}:engine/scripts/generate-site.py`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (old.status !== 0) throw new Error(`no generator at ${REF}`);
  writeFileSync(OLD, old.stdout);
  const sha = spawnSync('git', ['rev-parse', '--short', REF], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  console.log(`this checkout's generator against ${REF} (${sha}); stops: ${stopsBase ? 'from our storage' : 'none (the file did not answer)'}`);
  const BORDER = { lat: 42.4316, lng: 1.9283 };   // Puigcerdà's centre: within 6 km of France, so no country is known
  const cases = [...HOUSES.map(h => [h, h, `${h.town}, Spain`]), [HOUSES[0], { ...HOUSES[0], ...BORDER }, 'Puigcerdà, at a border: country not known']];
  for (const [h, at, name] of cases) {
    const slug = 'zz-same-' + h.slug, dir = join(ROOT, 'sites', slug); sites.push(dir);
    const { answers, geocode, research } = dataOf({ ...h, lat: at.lat, lng: at.lng }, BASE);
    const make = (script, launch) => {
      const sub = tmp('same-sub-'), res = tmp('same-res-'), noStops = tmp('same-nostops-');
      put(join(sub, 'host.json'), { answers }); put(join(sub, 'geocode.json'), geocode);
      for (const [f, d] of Object.entries(research)) put(join(res, f), d);
      if (launch !== undefined) writeFileSync(join(sub, 'launch.json'), JSON.stringify(launch));
      rmSync(dir, { recursive: true, force: true });
      const r = spawnSync('python3', [script, sub, '--slug', slug, '--lat', String(at.lat), '--lng', String(at.lng), '--src', 'en', '--research', res, '--translations', join(HERE, '../samples/translations.json')],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, STOPS_DIR: noStops, ...(stopsBase ? { STOPS_BASE: stopsBase } : {}) } });
      if (r.status !== 0) throw new Error(`${script} failed for ${name}:\n${(r.stderr || '').slice(-1500)}`);
      const files = walk(dir), T = JSON.parse(readFileSync(join(dir, 'content/transport.json'), 'utf8')), H = JSON.parse(readFileSync(join(dir, 'content/house.json'), 'utf8'));
      rmSync(dir, { recursive: true, force: true });
      return { files, stations: (T.stations || []).length, country: H.country || 'none' };
    };
    const before = make(OLD);
    const runs = [['as a local run, no word of the owner', undefined], ['with the worker\'s file, the owner having said nothing', { country: before.country === 'none' ? '' : before.country, launch: { countries: [], switches: [] } }], ['with the worker\'s file, the database not read', { country: before.country === 'none' ? '' : before.country, launch: null }]];
    for (const [how, launch] of runs) {
      const after = make('engine/scripts/generate-site.py', launch);
      const names = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort(), diff = names.filter(f => before.files[f] !== after.files[f]);
      if (diff.length) { fail++; console.log(`FAIL ${name}, ${how}: ${diff.length} of ${names.length} files differ: ${diff.slice(0, 8).join(', ')}`); }
      else { pass++; console.log(`same  ${name}, ${how}: ${names.length} files, ${before.stations} stations and stops, country ${before.country}`); }
    }
  }
} catch (e) { fail++; console.error(String(e.message || e)); }
finally { for (const d of [...sites, ...tmps]) rmSync(d, { recursive: true, force: true }); rmSync(OLD, { force: true }); }
console.log(`${pass} the same, ${fail} not`);
process.exit(fail ? 1 : 0);
