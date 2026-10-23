#!/usr/bin/env node
// A guide's folder (sites/<site>) and its row in the database, kept in step. The database is the live guide.
//   npm run guide:push -- <site> [--slug <web-address>] [--owner-email <email>] [--force]
//       content check, then images (public/) to storage and content, i18n, Wi-Fi and theme to the guide's row.
//       Refused when the guide changed in the database (editor, monthly check) since the last pull: pull first, or --force.
//       A guide that is not in the database yet needs --owner-email (an account that exists).
//   npm run guide:pull -- <site> [--slug <web-address>]
//       the live guide into the folder: content/, i18n/, private/ (git-ignored), site.json and theme.css.
//       Only files whose data changed are rewritten, in their own indentation, so git diffs stay small.
// The slug defaults to the folder name. Keys: SUPABASE_SERVICE_KEY in worker/.env.local.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const env = { ...process.env };
const ef = resolve(HERE, '.env.local');
if (existsSync(ef)) for (const l of readFileSync(ef, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), KEY = env.SUPABASE_SERVICE_KEY;
if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY in worker/.env.local.'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const [cmd, site] = process.argv.slice(2);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const slug = arg('--slug') || site, FORCE = process.argv.includes('--force');
if (!['push', 'pull'].includes(cmd) || !site) { console.error('Usage: guide-sync.mjs push|pull <site> [--slug s] [--owner-email e] [--force]'); process.exit(1); }
const SD = resolve(ROOT, 'sites', site), STAMP = resolve(SD, 'private', '.synced.json');   // private/ is git-ignored
if (!existsSync(SD)) { console.error('No such folder: sites/' + site); process.exit(1); }

async function rest(path, o = {}) {
  const r = await fetch(URL_ + path, { method: o.method || 'GET', headers: { ...H, ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
const stamp = () => existsSync(STAMP) ? JSON.parse(readFileSync(STAMP, 'utf8')) : {};
const saveStamp = s => { mkdirSync(dirname(STAMP), { recursive: true }); writeFileSync(STAMP, JSON.stringify(s, null, 1)); };
const indentOf = t => { const l = t.split('\n')[1] || ''; return (l.match(/^ +/) || [''])[0].length || 2; };
// The database keeps object keys in its own order: compare data whatever the order, and write keys in the file's own order.
const canon = x => Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function orderLike(x, like) {
  if (Array.isArray(x)) return x.map((v, i) => orderLike(v, Array.isArray(like) ? like.find(l => l && v && l.id !== undefined && l.id === v.id) ?? like[i] : undefined));
  if (!x || typeof x !== 'object') return x;
  const ref = like && typeof like === 'object' && !Array.isArray(like) ? like : {};
  const keys = [...Object.keys(ref).filter(k => k in x), ...Object.keys(x).filter(k => !(k in ref))];
  return Object.fromEntries(keys.map(k => [k, orderLike(x[k], ref[k])]));
}
function writeJson(file, data) {   // rewrite only when the data changed, keeping the file's own indentation and key order
  if (existsSync(file)) { const t = readFileSync(file, 'utf8'), local = JSON.parse(t); if (same(local, data)) return false; writeFileSync(file, JSON.stringify(orderLike(data, local), null, indentOf(t)) + '\n'); return true; }
  mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); return true;
}

const row = (await rest(`/rest/v1/guides?select=id,slug,status,origin,updated_at,content,theme&slug=eq.${encodeURIComponent(slug)}`))[0];

if (cmd === 'pull') {
  if (!row || !row.content) { console.error(`No guide /g/${slug} in the database.`); process.exit(1); }
  const c = row.content, changed = [];
  for (const [name, data] of Object.entries(c.files || {})) if (writeJson(join(SD, 'content', name + '.json'), data)) changed.push('content/' + name);
  for (const [l, data] of Object.entries(c.i18n || {})) if (writeJson(join(SD, 'i18n', l + '.json'), data)) changed.push('i18n/' + l);
  for (const [name, data] of Object.entries(c.private || {})) if (writeJson(join(SD, 'private', name + '.json'), data)) changed.push('private/' + name);
  const local = JSON.parse(readFileSync(join(SD, 'site.json'), 'utf8'));
  const nextSite = { ...local, ...c.site }; if (local.onboarding === undefined) delete nextSite.onboarding; else nextSite.onboarding = local.onboarding;
  if (writeJson(join(SD, 'site.json'), nextSite)) changed.push('site.json');
  if (row.theme && row.theme.css && row.theme.css !== (existsSync(join(SD, 'theme.css')) ? readFileSync(join(SD, 'theme.css'), 'utf8') : '')) { writeFileSync(join(SD, 'theme.css'), row.theme.css); changed.push('theme.css'); }
  saveStamp({ slug, id: row.id, updated_at: row.updated_at, pulled: new Date().toISOString() });
  console.log(changed.length ? `Pulled /g/${slug}: ${changed.join(', ')}` : `Pulled /g/${slug}: the folder already matched.`);
  process.exit(0);
}

// push
const st = stamp();
if (row && !FORCE && st.updated_at !== row.updated_at) {
  console.error(`Refused: /g/${slug} changed in the database since this folder was last pulled or pushed (${row.updated_at}). Run "npm run guide:pull -- ${site}" first, or add --force to overwrite.`);
  process.exit(1);
}
const check = spawnSync('node', ['engine/scripts/run.js', 'check', site], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(check.stdout || ''); process.stderr.write(check.stderr || '');
if (check.status !== 0) { console.error('Refused: the content check failed.'); process.exit(1); }
let g = row;
if (!g) {
  const email = arg('--owner-email');
  if (!email) { console.error('This guide is not in the database yet: add --owner-email <email> (an account that exists).'); process.exit(1); }
  const users = await (await fetch(URL_ + '/auth/v1/admin/users?per_page=200', { headers: H })).json();
  const owner = (users.users || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  if (!owner) { console.error('No account with that email.'); process.exit(1); }
  g = (await rest('/rest/v1/guides', { method: 'POST', body: { owner: owner.id, slug, status: 'draft', origin: 'imported', answers: {} }, headers: { Prefer: 'return=representation' } }))[0];
}
const assetBase = `${URL_}/storage/v1/object/public/guide-assets/${g.id}/`;
const out = spawnSync('node', ['engine/scripts/guide-to-row.mjs', site, assetBase], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
if (out.status !== 0) { console.error(out.stderr); process.exit(1); }
const next = JSON.parse(out.stdout);
next.content.site.slug = slug;
next.content.site.storageKey = next.content.site.storageKey || slug;   // keep the guide's own key (Ca La Kimberly: clk) so guests' saved settings survive
// Images: everything in public/ (vendor folders excluded), uploaded only when new or changed in size.
const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon' };
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'vendor' ? [] : walk(p)) : [p]; });
const known = st.sizes || {}, sizes = {};
let up = 0;
for (const p of walk(join(SD, 'public'))) {
  const ct = types[extname(p).toLowerCase()]; if (!ct) continue;
  const rel = relative(join(SD, 'public'), p).split('\\').join('/'), size = statSync(p).size; sizes[rel] = size;
  if (known[rel] === size && st.id === g.id) continue;
  const r = await fetch(`${URL_}/storage/v1/object/guide-assets/${g.id}/${rel}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': ct, 'x-upsert': 'true' }, body: readFileSync(p) });
  if (!r.ok) { console.error(`Image upload failed for ${rel}: ${r.status}`); process.exit(1); }
  up++;
}
const saved = await rest(`/rest/v1/guides?id=eq.${g.id}`, { method: 'PATCH', body: { content: next.content, theme: next.theme, status: 'published', message: null, finished_at: new Date().toISOString() }, headers: { Prefer: 'return=representation' } });
saveStamp({ slug, id: g.id, updated_at: saved[0].updated_at, pushed: new Date().toISOString(), sizes });
console.log(`Pushed sites/${site} to /g/${slug}: ${Object.keys(next.content.files).length} content files, ${up} images uploaded.`);
