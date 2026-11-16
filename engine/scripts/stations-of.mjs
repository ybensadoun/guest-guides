// The train stations a generated guide gets (engine/src/modules/transport/pick.js, stationsFor): the one rule the maker
// uses too, for the generator (engine/scripts/generate-site.py), which is Python and so asks this script instead of keeping
// a copy of the rule of its own (as engine/scripts/world-of.mjs does for the colours).
// Reads one JSON object on stdin: { "lat": 41.2, "lng": 1.5, "langs": ["en", "es"] } (the house's position and the guide's
// languages). Prints { "stations": [...] } (each as content/transport.json holds a station; none with no position or no
// station near) and nothing else. Reads onboarding-site/stations-es.json (STATIONS_FILE for another). Anything malformed:
// exit 2 with one line on stderr. Nothing is written.
// Usage: echo '{"lat":41.2,"lng":1.5,"langs":["en"]}' | node engine/scripts/stations-of.mjs
import { readFileSync } from 'node:fs';
import { stationsFor, TP_LANGS } from '../src/modules/transport/pick.js';

const stop = msg => { process.stderr.write(`stations-of: ${msg}\n`); process.exit(2); };
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let ask;
try { ask = JSON.parse(raw); } catch (e) { stop(`not JSON: ${e.message}`); }
if (!ask || typeof ask !== 'object' || Array.isArray(ask)) stop('the input must be one JSON object, { "lat", "lng", "langs" }');
const langs = Array.isArray(ask.langs) ? ask.langs.filter(l => TP_LANGS.includes(l)) : [];
if (!langs.length) stop(`langs: a list of the guide's languages, among ${TP_LANGS.join(', ')}`);
let data;
const file = process.env.STATIONS_FILE || new URL('../../onboarding-site/stations-es.json', import.meta.url);
try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { stop(`the stations file could not be read: ${e.message}`); }
process.stdout.write(JSON.stringify({ stations: stationsFor({ lat: ask.lat, lng: ask.lng }, data, langs) }) + '\n');
