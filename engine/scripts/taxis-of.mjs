// The taxis a generated guide gets from our open directory (engine/src/modules/transport/taxis.js): the one rule the maker
// and the worker use, for the generator (engine/scripts/generate-site.py), which is Python and so asks this script
// instead of keeping a copy of the rule (as engine/scripts/stations-of.mjs does for the stations).
// Reads one JSON object on stdin: { "approved": [taxis] or null, "found": [taxis], "house": { "lat", "lng" },
//   "langs": ["en", ...], "have": ["<phone>", ...], "at": "YYYY-MM-DD" }
//   approved: what the host approved in the builder (answers.taxis, as txPick gives them): a list, even empty, is the
//   host's choice and exactly those are written; null when the host never saw the step: then the nearest of found
//   (answers._taxisFound, what the worker found), alone (Yohann, 16 Nov 2026: "Add them by themselves").
//   typed: the taxi the host typed as "name and number" (answers.taxi), read by the one rule the builder uses too
//   (txTyped: numbers written with spaces, dots, dashes, brackets and a country code; 22 Nov 2026); its number is never
//   written a second time below.
//   have: other numbers the guide has already: never the same number twice.
// Prints { "typed": { "name", "phone" } or null (nothing typed, or no number that can be read), "taxis": [entries as
// content/transport.json holds a taxi] }. Malformed input: exit 2, one line on stderr.
// Usage: echo '{"approved":null,"found":[...],"house":{"lat":41.2,"lng":1.5},"langs":["en"],"have":[],"at":"2026-11-16"}' | node engine/scripts/taxis-of.mjs
import { txAuto, txEntry, txKey, txTyped } from '../src/modules/transport/taxis.js';

const stop = msg => { process.stderr.write(`taxis-of: ${msg}\n`); process.exit(2); };
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let q;
try { q = JSON.parse(raw); } catch (e) { stop(`not JSON: ${e.message}`); }
if (!q || typeof q !== 'object' || Array.isArray(q)) stop('the input must be one JSON object');
const langs = Array.isArray(q.langs) && q.langs.length ? q.langs : ['en'], at = typeof q.at === 'string' ? q.at : '';
const ok = t => t && typeof t === 'object' && t.id && t.name && t.phone;
const chosen = Array.isArray(q.approved) ? q.approved.filter(ok) : [txAuto(Array.isArray(q.found) ? q.found : [], q.house || null)].filter(Boolean);
const typed = typeof q.typed === 'string' ? txTyped(q.typed) : null;
const seen = new Set([...(Array.isArray(q.have) ? q.have : []), ...(typed ? [typed.phone] : [])].map(txKey).filter(Boolean)), out = [];
for (const t of chosen) { const k = txKey(t.phone); if (!k || seen.has(k)) continue; seen.add(k); out.push(txEntry(t, langs, { at })); }
process.stdout.write(JSON.stringify({ typed, taxis: out }) + '\n');
