// The words of Getting around's card on Home for a generated guide (engine/src/modules/transport/plan.js cardWords): the
// module's one rule, for the generator (engine/scripts/generate-site.py), which keeps no copy of it (as taxis-of.mjs for
// the taxis). The fixed words are the engine's own, read from engine/src/i18n/<lang>.json.
// stdin: { "transport": { taxis, apps, stations } as content/transport.json holds them, "langs": ["en", ...] }
// stdout: { "tile": { "name": { <lang>: text }, "sub": { <lang>: text } (absent when the page has nothing to say) } }.
// Malformed input: exit 2, one line on stderr. Nothing is written.
import { readFileSync, existsSync } from 'node:fs';
import { cardWords } from '../src/modules/transport/plan.js';

const stop = msg => { process.stderr.write(`card-of: ${msg}\n`); process.exit(2); };
let raw = ''; for await (const c of process.stdin) raw += c;
let q; try { q = JSON.parse(raw); } catch (e) { stop(`not JSON: ${e.message}`); }
if (!q || typeof q !== 'object' || Array.isArray(q) || !q.transport || typeof q.transport !== 'object') stop('the input must be one JSON object, { "transport", "langs" }');
const langs = Array.isArray(q.langs) && q.langs.length ? q.langs.map(String) : ['en'], words = {};
for (const l of new Set(['en', ...langs])) { const f = new URL(`../src/i18n/${l}.json`, import.meta.url); if (/^[a-z]{2}$/.test(l) && existsSync(f)) words[l] = JSON.parse(readFileSync(f, 'utf8')); }
process.stdout.write(JSON.stringify({ tile: cardWords(q.transport, langs, words) }) + '\n');
