#!/usr/bin/env node
// Guide worker: runs on Yohann's computer while it is on (interim, see docs/plan-accounts-and-publishing.md).
// Watches the database for guides a host has queued, builds each one and writes the result back.
//   node worker/guide-worker.mjs            keep running, build guides as they arrive
//   node worker/guide-worker.mjs --once     build whatever is queued now, then stop
//   node worker/guide-worker.mjs --import <site-folder> --slug <web-address> --owner-email <email>
//        put a hand-made guide from sites/<folder> into the database (or refresh it), owned by that account
// Settings live in worker/.env.local (never committed). See worker/README.md.
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const env = { ...process.env };
const envFile = resolve(HERE, '.env.local');
if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, '');
const KEY = env.SUPABASE_SERVICE_KEY;
const AUTO_PUBLISH = env.AUTO_PUBLISH !== '0';          // test phase: a built guide goes live at once. Set AUTO_PUBLISH=0 to review first.
const RESEARCH = env.RESEARCH || 'skip';                 // skip | cli  (cli = research and translation with the `claude` command)
const POLL = Math.max(3, +env.POLL_SECONDS || 10) * 1000;
const ONCE = process.argv.includes('--once');
if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY. Put it in worker/.env.local (see worker/README.md).'); process.exit(1); }

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
async function rest(path, o = {}) {
  const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
  if (!r.ok) throw new Error(`${o.method || 'GET'} ${path.split('?')[0]} -> ${r.status} ${typeof j === 'string' ? j : JSON.stringify(j)}`.slice(0, 400));
  return j;
}
const patch = (id, body) => rest('/rest/v1/guides?id=eq.' + id, { method: 'PATCH', body, headers: { Prefer: 'return=minimal' } });
const say = (id, message) => patch(id, { message }).catch(() => {});

function run(cmd, args, o = {}) {
  const r = spawnSync(cmd, args, { cwd: o.cwd || ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: o.timeout || 600000, input: o.input });
  if (r.error) throw new Error(`${cmd} failed: ${r.error.message}`);
  if (r.status !== 0 && !o.allowFail) throw new Error(`${cmd} ${args.slice(0, 2).join(' ')} exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-6).join(' | ')}`.slice(0, 600));
  return r;
}

/* ---------- Claude research and translation (optional) ---------- */
function claudeJson(prompt, what) {
  const r = run('claude', ['-p', prompt, '--allowedTools', 'WebSearch,WebFetch', '--max-turns', '40'], { timeout: 900000, allowFail: true });
  const out = (r.stdout || '').trim();
  const a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error(`Claude returned no JSON for ${what}`);
  try { return JSON.parse(out.slice(a, b + 1)); } catch (e) { throw new Error(`Claude's JSON for ${what} did not parse`); }
}
function example(name, n = 2) {
  const f = resolve(HERE, 'examples', name + '.json'); if (!existsSync(f)) return '{}';
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const cut = x => Array.isArray(x) ? x.slice(0, n).map(cut) : (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cut(v)])) : x);
  return JSON.stringify(cut(j), null, 1);
}
function researchPrompt(kind, A, rules) {
  const area = `${A.town || ''}${A.region ? ', ' + A.region : ''}`, km = A.radius || 30;
  return `You research one module of a guest guide for a holiday home. Place: ${A.placeName || 'the house'}, ${area}. Approximate point: ${A.lat}, ${A.lng}. Guests drive up to ${km} km. The host likes: ${[A.interests, A.feelWords, A.tone].flat().filter(Boolean).join('; ') || 'no preference given'}.
Use web search. Only include things you confirmed exist from a web source. Never invent names, addresses, phone numbers, hours or distances. When unsure, leave the field out or set "verify": true. Write every text in English, as {"en": "..."}. No em-dashes.
${rules}
Answer with ONE JSON object and nothing else. It must follow the shape of this example (only its first items are shown):
${example(kind)}`;
}
function research(A, outDir, id) {
  mkdirSync(outDir, { recursive: true });
  const jobs = [
    ['markets', 'Find the weekly and notable local markets within the radius (street markets, covered markets, fairs). Same shape as the example: {"categories":[...],"markets":[...]} with schedule days as mon..sun.'],
    ['todo', 'Find 8 to 12 things to do within the radius that fit the host\'s taste: sights, nature, fun, culture. Same shape: {"items":[...]} with lat, lng, km_from_house, an icon and group as in the example.'],
    ['emergency', 'Find the nearest hospital with an emergency department, the national emergency number and the local health advice line. Same shape: {"groups":[...]}.'],
  ];
  for (const [kind, rules] of jobs) {
    say(id, `Researching: ${kind}`);
    try { writeFileSync(join(outDir, kind + '.json'), JSON.stringify(claudeJson(researchPrompt(kind, A, rules), kind), null, 1)); }
    catch (e) { log(`  research ${kind} skipped:`, e.message); }
  }
}
function translate(texts, langs, srcLang, file) {
  if (!texts.length || !langs.length) return;
  const prompt = `Translate these texts from ${srcLang} into ${langs.join(', ')}. Keep names, numbers and times. No em-dashes. For French use real non-breaking spaces before ? ! ; : and inside guillemets. Answer with ONE JSON object and nothing else: {"<exact source text>": {"${langs.join('": "...", "')}": "..."}}.\n${JSON.stringify(texts)}`;
  const r = run('claude', ['-p', prompt], { timeout: 600000, allowFail: true });
  const out = (r.stdout || ''), a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a >= 0 && b > a) { try { writeFileSync(file, JSON.stringify(JSON.parse(out.slice(a, b + 1)), null, 1)); } catch (e) {} }
}

/* ---------- Build one guide ---------- */
async function upload(guideId, localRoot) {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'vendor' ? [] : walk(p)) : [p]; });
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon' };
  let n = 0;
  for (const p of existsSync(localRoot) ? walk(localRoot) : []) {
    const ct = types[extname(p).toLowerCase()]; if (!ct) continue;            // images only: the guide's data lives in the database
    const rel = relative(localRoot, p).split('\\').join('/');
    const r = await fetch(`${URL_}/storage/v1/object/guide-assets/${guideId}/${rel}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': ct, 'x-upsert': 'true' }, body: readFileSync(p) });
    if (!r.ok) throw new Error(`Image upload failed for ${rel}: ${r.status}`);
    n++;
  }
  return n;
}

async function build(g) {
  const A = { ...(g.answers || {}) }, id = g.id, tmp = 'w-' + id.slice(0, 8), siteDir = resolve(ROOT, 'sites', tmp), job = resolve(HERE, 'jobs', id);
  if (!g.slug) throw new Error('This guide has no web address yet.');
  if (!A.lat || !A.lng) throw new Error('We do not know where the house is yet. Add its location in the first step.');
  try { rmSync(job, { recursive: true, force: true }); rmSync(siteDir, { recursive: true, force: true }); } catch (e) {}
  mkdirSync(join(job, 'src'), { recursive: true });
  const remote = (A._remote || []).filter(u => u && u.src && String(u.src).startsWith('https://a0.muscache.com/'));
  const clean = { ...A }; delete clean._remote;
  writeFileSync(join(job, 'src/host.json'), JSON.stringify({ answers: clean }));
  writeFileSync(join(job, 'src/listing_photos.json'), JSON.stringify(remote.map(u => ({ url: u.src, room: u.room || '', caption: u.name || '' }))));
  const srcLang = ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(A.sourceLang) ? A.sourceLang : 'en';
  const gen = ['engine/scripts/generate-site.py', join(job, 'src'), '--slug', tmp, '--lat', String(A.lat), '--lng', String(A.lng), '--src', srcLang];

  let researchDir = null;
  if (RESEARCH === 'cli') { researchDir = join(job, 'research'); research(A, researchDir, id); gen.push('--research', researchDir); }
  say(id, 'Building the guide');
  let out = run('python3', gen).stdout;
  if (RESEARCH === 'cli') {
    const need = existsSync(join(siteDir, 'docs/untranslated.json')) ? JSON.parse(readFileSync(join(siteDir, 'docs/untranslated.json'), 'utf8')) : [];
    const langs = (A.languages || []).filter(l => l !== srcLang && ['en', 'es', 'fr', 'ca', 'de', 'nl'].includes(l));
    if (need.length && langs.length) { say(id, 'Translating'); const tf = join(job, 'translations.json'); translate(need, langs, srcLang, tf); if (existsSync(tf)) out = run('python3', [...gen, '--translations', tf]).stdout; }
  }
  const checked = run('node', ['engine/scripts/run.js', 'check', tmp], { allowFail: true });
  if (checked.status !== 0) throw new Error('The guide did not pass its checks: ' + ((checked.stdout || '') + (checked.stderr || '')).trim().split('\n').slice(-3).join(' | '));
  say(id, 'Saving the guide');
  const assetBase = `${URL_}/storage/v1/object/public/guide-assets/${id}/`;
  const row = JSON.parse(run('node', ['engine/scripts/guide-to-row.mjs', tmp, assetBase]).stdout);
  row.content.site.slug = g.slug; row.content.site.storageKey = g.slug;
  const n = await upload(id, resolve(siteDir, 'public'));
  const status = AUTO_PUBLISH ? 'published' : 'ready';
  await patch(id, { content: row.content, theme: row.theme, status, message: null, finished_at: new Date().toISOString() });
  rest('/rest/v1/events', { method: 'POST', body: { user_id: g.owner, guide_id: id, kind: 'guide_built', data: { slug: g.slug, images: n, status } }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
  try { rmSync(siteDir, { recursive: true, force: true }); } catch (e) { /* leftover work folder is harmless */ }
  log(`  built ${g.slug}: ${n} images, status ${status}`);
}


/* ---------- Import a hand-made guide (sites/<folder>) into the database ---------- */
async function importSite(folder, slug, email) {
  if (!folder || !slug || !email) throw new Error('Usage: --import <site-folder> --slug <web-address> --owner-email <email>');
  if (!existsSync(resolve(ROOT, 'sites', folder))) throw new Error('No such folder: sites/' + folder);
  const users = await (await fetch(URL_ + '/auth/v1/admin/users?per_page=200', { headers: H })).json();
  const owner = (users.users || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  if (!owner) throw new Error('No account with that email yet. Sign up at the onboarding page first.');
  let rows = await rest('/rest/v1/guides?select=id,owner&slug=eq.' + encodeURIComponent(slug));
  let g = rows && rows[0];
  if (!g) { const made = await rest('/rest/v1/guides', { method: 'POST', body: { owner: owner.id, slug, status: 'draft', origin: 'imported', answers: {} }, headers: { Prefer: 'return=representation' } }); g = made[0]; }
  const assetBase = `${URL_}/storage/v1/object/public/guide-assets/${g.id}/`;
  const row = JSON.parse(run('node', ['engine/scripts/guide-to-row.mjs', folder, assetBase]).stdout);
  row.content.site.slug = slug; row.content.site.storageKey = slug;
  const n = await upload(g.id, resolve(ROOT, 'sites', folder, 'public'));
  await patch(g.id, { owner: owner.id, origin: 'imported', content: row.content, theme: row.theme, status: 'published', message: null, finished_at: new Date().toISOString() });
  log(`Imported sites/${folder} as /g/${slug} for ${email}: ${n} images.`);
}

/* ---------- Loop ---------- */
async function claim() {
  const rows = await rest('/rest/v1/guides?select=id,slug,owner,answers&status=eq.queued&order=queued_at.asc.nullslast&limit=1');
  if (!rows || !rows[0]) return null;
  const won = await rest('/rest/v1/guides?id=eq.' + rows[0].id + '&status=eq.queued', { method: 'PATCH', body: { status: 'generating', message: 'Reading your answers' }, headers: { Prefer: 'return=representation' } });
  return won && won[0] ? rows[0] : null;
}
async function recover() {   // a guide left "generating" by a crashed run goes back in the queue
  const old = new Date(Date.now() - 30 * 60000).toISOString();
  await rest('/rest/v1/guides?status=eq.generating&updated_at=lt.' + old, { method: 'PATCH', body: { status: 'queued', message: 'Waiting for its turn' }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
}
async function tick() {
  await recover();
  for (let g; (g = await claim());) {
    log('building', g.slug);
    try { await build(g); }
    catch (e) {
      log('  FAILED:', e.message);
      await patch(g.id, { status: 'failed', message: String(e.message).slice(0, 300), finished_at: new Date().toISOString() }).catch(() => {});
      try { rmSync(resolve(ROOT, 'sites', 'w-' + g.id.slice(0, 8)), { recursive: true, force: true }); } catch (e2) {}
    }
  }
}
const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : ''; };
if (process.argv.includes('--import')) { try { await importSite(arg('--import'), arg('--slug'), arg('--owner-email')); } catch (e) { console.error('Import failed:', e.message); process.exit(1); } process.exit(0); }
log(`Guide worker on. Database ${URL_}. Publish on build: ${AUTO_PUBLISH}. Research: ${RESEARCH}.`);
if (ONCE) { await tick(); log('done'); }
else for (;;) { try { await tick(); } catch (e) { log('waiting, could not reach the database:', e.message); } await new Promise(r => setTimeout(r, POLL)); }
