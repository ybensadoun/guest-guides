// The ride apps a generated guide gets (engine/src/modules/transport/apps.js, apps.json), for the generator
// (engine/scripts/generate-site.py), which keeps no copy of the rule (as taxis-of.mjs for the taxis).
// stdin: { "approved": ["uber", ...] or null, "found": [apps as a guide holds them], "at": "YYYY-MM-DD" }
//   approved: the ids the host approved in the builder (answers.apps): a list, even empty, is the host's choice; null when
//   the host never saw them: then the ones found near the house (answers._appsFound), by themselves.
// stdout: { "apps": [{ id, name, link, src: { from: 'search', at } }] }, in apps.json's order. Malformed input: exit 2.
import { readFileSync } from 'node:fs';
import { axEntry } from '../src/modules/transport/apps.js';

const APPS = JSON.parse(readFileSync(new URL('../src/modules/transport/apps.json', import.meta.url), 'utf8')).apps;
let raw = ''; for await (const c of process.stdin) raw += c;
let q; try { q = JSON.parse(raw); } catch (e) { process.stderr.write(`apps-of: not JSON: ${e.message}\n`); process.exit(2); }
if (!q || typeof q !== 'object' || Array.isArray(q)) { process.stderr.write('apps-of: the input must be one JSON object\n'); process.exit(2); }
const found = new Map((Array.isArray(q.found) ? q.found : []).filter(a => a && a.id).map(a => [a.id, a]));
const want = Array.isArray(q.approved) ? new Set(q.approved.map(String)) : new Set(found.keys());
const at = typeof q.at === 'string' ? q.at : '';
const apps = APPS.filter(a => want.has(a.id)).map(a => axEntry({ ...a, at: ((found.get(a.id) || {}).src || {}).at || '' }, at));
process.stdout.write(JSON.stringify({ apps }) + '\n');
