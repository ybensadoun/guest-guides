#!/usr/bin/env node
// Spain's public transport stops, made on the server every month and served from our storage (Getting around,
// engine/src/modules/transport/README.md, "Public transport found"). Yohann, 16 Nov 2026: "these will go into the server,
// right? Like overall, my computer should not be involved into the process at all"; "We can have a database that we store
// every once in a while". The design, 16 Nov 2026:
//   1. onboarding-site/src/nap.py: the national access point's changed files into the cache (NAP_API_KEY; none: skipped);
//   2. onboarding-site/src/stops.py: the stops remade from the cache, the day counted today, into ~/.cache/guest-guides/stops-es/;
//   3. published to our storage (Supabase Storage, public bucket transit, stops-es/): only the cells whose bytes changed
//      (published.json beside them keeps each file's sha1, written as the run goes), 3 at a time, a refused file tried again, index.json last (a reader never sees an index naming a
//      cell not there yet), then the cells that left the index removed. A guard: fewer than half the stops last published,
//      nothing is published (a bad download must not empty the maker).
// Each step's failure is caught: a failed download still remakes from the cache; a failed remake publishes nothing and keeps
// what is served. refreshTransit never throws. Called by worker/monthly.mjs as its last step; by hand:
//   node worker/transit.mjs              the whole job
//   node worker/transit.mjs --dry        downloads and remakes, publishes nothing, prints what it would publish
//   node worker/transit.mjs --no-fetch   remakes and publishes from the cache (no download)
// On a Mac it publishes only with STOPS_PUBLISH=1, so that a test run here never overwrites what the server serves.
// Tested in worker/test/transit.test.mjs with a fake runner and a fake storage.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
export const OUT = join(homedir(), '.cache', 'guest-guides', 'stops-es');
export const BUCKET = 'transit', PREFIX = 'stops-es/';
const sha1 = b => createHash('sha1').update(b).digest('hex');
const CELL = /^-?\d+_-?\d+\.json$/;
const retryMs = () => +process.env.TRANSIT_RETRY_MS || 1500, wait = ms => new Promise(r => setTimeout(r, ms));

// A script run (python3 by default), its output kept: { status, stdout, stderr }.
export const runScript = (file, args = [], env = process.env, o = {}) => {
  const r = spawnSync(env.PYTHON || 'python3', [resolve(ROOT, file), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: o.timeout || 3 * 3600e3, env });
  return { status: r.error ? -1 : r.status, stdout: r.stdout || '', stderr: (r.stderr || '') + (r.error ? r.error.message : '') };
};

// Our storage (Supabase Storage, plain fetch): put one file, remove some.
export function makeStorage({ url, key, fetchImpl = fetch }) {
  const base = String(url || '').replace(/\/$/, ''), H = { apikey: key, Authorization: 'Bearer ' + key };
  return {
    async put(name, body) {
      const r = await fetchImpl(`${base}/storage/v1/object/${BUCKET}/${PREFIX}${name}`, { method: 'POST', headers: { ...H, 'x-upsert': 'true', 'content-type': 'application/json', 'cache-control': 'max-age=3600' }, body });
      if (!r.ok) throw new Error(`${name}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    },
    async remove(names) {
      if (!names.length) return;
      const r = await fetchImpl(`${base}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: names.map(n => PREFIX + n) }) });
      if (!r.ok) throw new Error(`removing ${names.length} files: ${r.status}`);
    },
  };
}

const number = (re, s) => { const m = String(s || '').match(re); return m ? +m[1] : 0; };
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return null; } };

// What the folder holds now, against what was last published: { index, files: {name: bytes}, sums, changed, removed, stops }.
export function plan(out) {
  const index = readJson(join(out, 'index.json'));
  if (!index || !index.cells) return null;
  const files = {}, sums = {};
  for (const n of Object.keys(index.cells).sort()) { const f = join(out, n + '.json'); if (existsSync(f)) { files[n + '.json'] = readFileSync(f); sums[n + '.json'] = sha1(files[n + '.json']); } }
  files['index.json'] = readFileSync(join(out, 'index.json')); sums['index.json'] = sha1(files['index.json']);
  const last = readJson(join(out, 'published.json')) || { files: {}, stops: 0 };
  const changed = Object.keys(files).filter(n => n !== 'index.json' && (last.files || {})[n] !== sums[n]);
  const removed = Object.keys(last.files || {}).filter(n => n !== 'index.json' && !(n in files));
  const stops = Object.values(index.cells).reduce((a, b) => a + (+b || 0), 0);
  return { index, files, sums, changed, removed, stops, last, indexChanged: (last.files || {})['index.json'] !== sums['index.json'] };
}

export async function publish(out, storage, { log = () => {} } = {}) {
  const p = plan(out); if (!p) return { published: 0, removed: 0, note: 'nothing to publish: no index.json' };
  if (p.last.stops && p.stops < p.last.stops / 2) return { published: 0, removed: 0, note: `NOT published: ${p.stops} stops against ${p.last.stops} last time (fewer than half: a bad download?); what is served stays` };
  // Our storage refuses a burst now and then (429 "too many connections", a 5xx): each file is tried again, slower each
  // time, 3 at a time; and what is in is written down as it goes, so that a run cut short (19 Nov 2026: two runs refused
  // part way, each starting again from nothing) is carried on by the next one. The old index stays until every cell is in.
  const queue = [...p.changed], sums = { ...(p.last.files || {}) }; let done = 0, since = 0;
  const keep = files => writeFileSync(join(out, 'published.json'), JSON.stringify({ ...p.last, files }, null, 1));
  const put = async (n, body) => { for (let i = 0; ; i++) { try { return await storage.put(n, body); } catch (e) { if (i >= 5 || !/: (429|5\d\d)\b/.test(String(e && e.message))) throw e; await wait(retryMs() * 2 ** i); } } };
  const worker = async () => { for (let n; (n = queue.shift());) { await put(n, p.files[n]); sums[n] = p.sums[n]; done++; if (++since >= 50) { since = 0; keep(sums); } } };
  try { await Promise.all(Array.from({ length: 3 }, worker)); } finally { if (done) keep(sums); }
  if (p.indexChanged || done) { await put('index.json', p.files['index.json']); done++; }   // last: every cell it names is there
  await storage.remove(p.removed);
  writeFileSync(join(out, 'published.json'), JSON.stringify({ at: new Date().toISOString(), stops: p.stops, sources: (p.index.sources || []).map(s => ({ id: s.id, updated: s.updated })), files: p.sums }, null, 1));
  log(`transit: published ${done} file(s), removed ${p.removed.length}`);
  return { published: done, removed: p.removed.length, note: '' };
}

// The whole job. run(file, args, env): a script run; storage: as makeStorage; dry: publish nothing, say what it would.
// deadline (ms since 1970, optional): the scripts are stopped by then and nothing is published after it (the monthly run's
// ceiling of 40 minutes).
export async function refreshTransit({ log = () => {}, env = process.env, run = runScript, storage = null, dry = false, fetchFeeds = true, out = OUT, today = new Date().toISOString().slice(0, 10), deadline = 0 } = {}) {
  const left = () => deadline ? { timeout: Math.max(1000, deadline - Date.now()) } : {};
  const t0 = Date.now(), res = { ok: false, feeds: 0, stops: 0, cells: 0, mb: 0, fetched: 0, failed: 0, published: 0, removed: 0, seconds: 0, note: '' }, notes = [];
  try {
    if (fetchFeeds) {
      try {
        const r = run('onboarding-site/src/nap.py', [], env, left()), text = r.stdout + r.stderr;
        res.fetched = number(/fetched (\d+), unchanged/, text); res.failed = number(/, failed (\d+),/, text);
        const line = (text.match(/^nap: (fetched .*|no NAP_API_KEY.*|the list .*)$/m) || [])[1] || `nap.py ended with code ${r.status}`;
        notes.push('download: ' + line); log('transit: download:', line);
      } catch (e) { notes.push('download failed: ' + e.message); }
    }
    const r = run('onboarding-site/src/stops.py', ['--out', out, '--day', today], env, left()), text = r.stdout + r.stderr;
    if (r.status !== 0) { notes.push(`the remake failed (code ${r.status}): nothing published, what is served stays`); log('transit: stops.py failed:', text.trim().split('\n').slice(-2).join(' | ')); return res; }
    const p = plan(out);
    if (!p) { notes.push('the remake wrote no index.json: nothing published'); return res; }
    res.feeds = (p.index.sources || []).length; res.stops = p.stops; res.cells = Object.keys(p.index.cells).length;
    res.mb = +(Object.values(p.files).reduce((a, b) => a + b.length, 0) / 1e6).toFixed(1);
    if (dry || !storage) {
      notes.push(`${dry ? 'dry run' : 'no storage'}: would publish ${p.changed.length} cell(s)${p.indexChanged || p.changed.length ? ' and index.json' : ''}, remove ${p.removed.length}${p.last.stops && p.stops < p.last.stops / 2 ? ' (but the guard would stop it: fewer than half the stops last published)' : ''}`);
      res.ok = true; return res;
    }
    if (deadline && Date.now() > deadline) { notes.push('out of time: nothing published, what is served stays'); return res; }
    try { const q = await publish(out, storage, { log }); res.published = q.published; res.removed = q.removed; if (q.note) notes.push(q.note); res.ok = !q.note.startsWith('NOT'); }
    catch (e) { notes.push('publishing failed part way: ' + e.message + ' (what was published stays; the index is put last, so readers see the old one)'); }
    return res;
  } catch (e) { notes.push('failed: ' + e.message); return res; }
  finally { res.seconds = Math.round((Date.now() - t0) / 1000); res.note = notes.join('; '); }
}

// The report's few lines (worker/monthly.mjs).
export const reportLines = r => [`Public transport stops: ${r.stops} stops from ${r.feeds} timetable files, ${r.cells} cells, ${r.mb} MB, ${Math.round(r.seconds / 60)} min.`,
  `Files fetched from the national access point: ${r.fetched}${r.failed ? `, failed: ${r.failed}` : ''}. Published to our storage: ${r.published} file(s), removed: ${r.removed}.`,
  ...(r.note ? [r.note] : [])];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DRY = process.argv.includes('--dry'), NOFETCH = process.argv.includes('--no-fetch');
  const env = { ...process.env };
  // The worker's settings (NAP_API_KEY, the storage's key) are read only when the run needs them.
  if (!(DRY && NOFETCH)) for (const f of [resolve(HERE, '.env.local')]) if (existsSync(f))
    for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
  const mac = process.platform === 'darwin' && env.STOPS_PUBLISH !== '1';
  const storage = DRY || mac || !env.SUPABASE_SERVICE_KEY ? null : makeStorage({ url: env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: env.SUPABASE_SERVICE_KEY });
  if (!DRY && mac) console.log('transit: on a Mac nothing is published without STOPS_PUBLISH=1');
  const log = (...a) => console.log(new Date().toLocaleString('sv-SE'), ...a);
  const r = await refreshTransit({ log, env, dry: DRY || mac, storage, fetchFeeds: !NOFETCH });
  console.log(reportLines(r).join('\n'));
  process.exit(r.ok ? 0 : 1);
}
