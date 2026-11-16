// The public transport stops a generated guide gets by itself (engine/src/modules/transport/stops.js, spPick and spEntry):
// the one rule the maker uses too, for the generator (engine/scripts/generate-site.py), which keeps no copy of it.
// stdin: { "lat": 41.2, "lng": 1.5, "langs": ["en", ...] }. Reads our file of Spain's stops (index.json and the 9 cells around
// the house it lists) from STOPS_BASE (an http address) or STOPS_DIR (a folder on disk, default ~/.cache/guest-guides/stops-es/,
// where the server's monthly job writes it: onboarding-site/src/stops.py). stdout: { "stops": [entries as content/transport.json
// holds a station] }; none, silently, when the house has no position, no file or no cell is there, or a load fails.
// Malformed input: exit 2, one line on stderr. Nothing is written.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spCells, spPick, spEntry } from '../src/modules/transport/stops.js';

const stop = msg => { process.stderr.write(`stops-of: ${msg}\n`); process.exit(2); };
let raw = ''; for await (const c of process.stdin) raw += c;
let q; try { q = JSON.parse(raw); } catch (e) { stop(`not JSON: ${e.message}`); }
if (!q || typeof q !== 'object' || Array.isArray(q)) stop('the input must be one JSON object, { "lat", "lng", "langs" }');
const base = process.env.STOPS_BASE || '', dir = process.env.STOPS_DIR || join(homedir(), '.cache', 'guest-guides', 'stops-es');
const load = async name => {
  try {
    if (base) { const r = await fetch(new URL(name, base.endsWith('/') ? base : base + '/'), { signal: AbortSignal.timeout(20000) }); return r.ok ? await r.json() : null; }
    return JSON.parse(readFileSync(join(dir, name), 'utf8'));
  } catch (e) { return null; }
};
const out = [], index = await load('index.json'), house = { lat: q.lat, lng: q.lng };
if (index && index.cells) {
  const cells = await Promise.all(spCells(house).filter(c => index.cells[c]).map(c => load(c + '.json')));
  const stops = cells.flatMap(c => (c && c.stops) || []);
  for (const x of spPick(house, stops)) out.push(spEntry(x.st, house, (index.sources || [])[x.st.s], Array.isArray(q.langs) ? q.langs : ['en']));
}
process.stdout.write(JSON.stringify({ stops: out }) + '\n');
