#!/usr/bin/env node
// The monthly run on the server (docs/plan-worker-on-server.md, "The monthly check in the cloud"), started by the timer
// guide-worker-monthly (worker/systemd) on the 1st at 9:00: the Google check of every published guide, applied; automatic
// events for every guide that has them on; Find more searches queued for Ca La Kimberly (the running worker does them, their
// suggestions wait 14 days in the editor's Find more panels); then one report, saved in the database (events, kind
// monthly_report, for the cloud routine) and emailed to Yohann through Resend.
//   node worker/monthly.mjs                       the whole run
//   node worker/monthly.mjs --dry-run             the checks without writing, nothing queued, nothing saved; no email unless --email
//   node worker/monthly.mjs --steps check,find    only some steps (check, events, find); --email sends the report even in a dry run
//   node worker/monthly.mjs --dry-run --steps find --email   a test of the email that asks Google and Claude nothing
// Settings (the worker's env file): RESEND_API_KEY and REPORT_EMAIL (no email without them), REPORT_FROM (default Resend's own
// sender, which only delivers to the Resend account's address), MONTHLY_USD (the Claude day limit for this run's events
// search, default 30), MONTHLY_FIND (guides that get Find more searches, default ca-la-kimberly).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const env = { ...process.env };
for (const f of [resolve(HERE, '.env.local'), resolve(ROOT, '.env')]) if (existsSync(f))
  for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const URL_ = (env.SUPABASE_URL || 'https://dmoxszfwulolqkgxtxcp.supabase.co').replace(/\/$/, ''), KEY = env.SUPABASE_SERVICE_KEY;
if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY.'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry-run'), EMAIL = !DRY || process.argv.includes('--email');
const STEPS = arg('--steps', 'check,events,find').split(',');
const FIND_FOR = (env.MONTHLY_FIND || 'ca-la-kimberly').split(',').map(s => s.trim()).filter(Boolean);
const today = new Date().toISOString().slice(0, 10), log = (...a) => console.log(new Date().toLocaleString('sv-SE'), ...a);

// One of the existing scripts, its whole output kept for the report.
function step(file, args, extraEnv = {}) {
  log('running', file, args.join(' '));
  const r = spawnSync('node', [resolve(HERE, file), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 3 * 3600e3, env: { ...process.env, ...extraEnv } });
  const out = [(r.stdout || '').trim(), (r.stderr || '').trim()].filter(Boolean).join('\n');
  return { ok: r.status === 0 && !r.error, out: out || (r.error ? r.error.message : ''), status: r.status };
}
const parts = [], sum = { humans: 0, google: 0, claudeUsd: 0, added: 0, queued: [] };

if (STEPS.includes('check')) {
  const r = step('check-guides.mjs', [...(DRY ? [] : ['--apply']), ...(arg('--days') ? ['--days', arg('--days')] : [])]);   // --days: passed on to check-guides
  for (const m of r.out.matchAll(/, (\d+) for a human/g)) sum.humans += +m[1];
  sum.google = +((r.out.match(/(\d+) Google requests/) || [])[1] || 0);
  parts.push(`1. Google check of every published guide${DRY ? ' (dry run: nothing written)' : ', fixes applied'}${r.ok ? '' : ` (it stopped with an error, code ${r.status})`}\n${r.out}`);
}
if (STEPS.includes('events')) {
  const r = step('guide-worker.mjs', ['--refresh-events', ...(DRY ? [] : ['--apply'])], { RESEARCH_USD_PER_DAY: env.MONTHLY_USD || '30' });
  for (const m of r.out.matchAll(/claude api, .*?about ([\d.]+) USD \(/g)) sum.claudeUsd += +m[1];
  sum.added = (r.out.match(/^\s+\+ /gm) || []).length;   // refresh-events prints one "  + " line per event it adds
  parts.push(`2. Automatic events, next three months${DRY ? ' (dry run: nothing written)' : ''}${r.ok ? '' : ` (it stopped with an error, code ${r.status})`}\n${r.out}`);
}
if (STEPS.includes('find')) {
  const lines = [];
  for (const slug of FIND_FOR) {
    const g = (await (await fetch(`${URL_}/rest/v1/guides?select=id,content->site->languages&slug=eq.${encodeURIComponent(slug)}`, { headers: H })).json())[0];
    if (!g) { lines.push(`${slug}: no such guide`); continue; }
    for (const kind of ['find-todo', 'find-markets']) {
      if (DRY) { lines.push(`${slug}: ${kind} would be queued`); continue; }
      const r = await fetch(`${URL_}/rest/v1/guide_jobs`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ guide_id: g.id, kind, langs: g.languages || ['en'] }) });
      lines.push(`${slug}: ${kind} ${r.ok ? 'queued' : 'NOT queued (' + r.status + ')'}`); if (r.ok) sum.queued.push(`${slug} ${kind}`);
    }
  }
  parts.push(`3. New places: Find more searches (things to do, markets). The worker runs them in the next minutes; their suggestions wait 14 days in the editor (Things to do > Find more, Markets > Find more), to keep or skip.\n${lines.join('\n')}`);
}
const head = `Monthly check, ${today}${DRY ? ' (dry run)' : ''}\n${sum.humans} line(s) for a human, ${sum.added} automatic event(s) added, ${sum.google} Google request(s), Claude about ${sum.claudeUsd.toFixed(2)} USD for the events search.`;
const text = `${head}\n\n${parts.join('\n\n')}\n`;
console.log('\n' + text);

if (!DRY) {
  const r = await fetch(`${URL_}/rest/v1/events`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ kind: 'monthly_report', data: { date: today, text, ...sum } }) });
  log(r.ok ? 'report saved in the database (events, kind monthly_report)' : 'report NOT saved: ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
if (EMAIL && env.RESEND_API_KEY && env.REPORT_EMAIL) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.REPORT_FROM || 'Guest Guide Maker <onboarding@resend.dev>', to: [env.REPORT_EMAIL], subject: `${DRY ? '[test] ' : ''}Monthly check ${today}: ${sum.humans} for you, ${sum.added} events added`, text }) });
  const d = await r.json().catch(() => ({}));   // Resend's own words go to the log only
  log(r.ok ? 'report emailed' : `report NOT emailed: ${r.status} ${String(d.message || d.name || '').slice(0, 200)}`);
} else if (EMAIL) log('no email: RESEND_API_KEY or REPORT_EMAIL is not set');
