// The colour world a generated guide gets, and every colour token it makes (engine/src/worlds.js, picture-world.js): the
// one rule the engine and the maker use, for the generator (engine/scripts/generate-site.py), which is Python and so
// asks this script instead of keeping a copy of the rule of its own.
// Reads one JSON object on stdin:
//   { "world": "sea" }                                  a ready-made world (worlds.js WORLDS)
//   { "world": { "base": "stone", "deep": "#2D5476" } } a world with colours of its own, as "From your picture" makes
//                                                       them: base and only deep, strong, fresh, light, warm as #RRGGBB
//                                                       (what engine/site.config.js siteWorld accepts in a site.json)
//   { "pixels": "<base64>" }                            a picture's raw RGB bytes (3 a pixel, no alpha, drawn on white,
//                                                       about 96 x 96): the world it makes, worldFromPicture(swatches())
// Prints one JSON object: { "world": <the id or object to keep in theme.world>, "tokens": { "--paper": ..., ... } }
// (every token of worldTokens). Anything else (no input, not JSON, an unknown or malformed world, no pixels): exit 2
// with one line on stderr. Nothing is written.
// Usage: echo '{"world":"sea"}' | node engine/scripts/world-of.mjs
import { WORLDS, worldOf, worldTokens } from '../src/worlds.js';
import { swatches, worldFromPicture } from '../src/picture-world.js';

const ROLES = ['deep', 'strong', 'fresh', 'light', 'warm'];
const stop = msg => { process.stderr.write(`world-of: ${msg}\n`); process.exit(2); };

// A world as a guide may keep it: an id of WORLDS, or { base, roles as #RRGGBB } and nothing else (worldOf alone would
// quietly drop a bad role, and the build would then refuse the guide: engine/site.config.js siteWorld).
function valid(w) {
  if (typeof w === 'string') return Object.hasOwn(WORLDS, w);
  if (!w || typeof w !== 'object' || Array.isArray(w) || typeof w.base !== 'string' || !Object.hasOwn(WORLDS, w.base)) return false;
  return Object.entries(w).every(([k, v]) => k === 'base' || (ROLES.includes(k) && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)));
}

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
if (!raw.trim()) stop('no input: one JSON object on stdin, { "world": ... } or { "pixels": ... }');
let ask;
try { ask = JSON.parse(raw); } catch (e) { stop(`not JSON: ${e.message}`); }
if (!ask || typeof ask !== 'object' || Array.isArray(ask)) stop('the input must be one JSON object, { "world": ... } or { "pixels": ... }');

let world;
if (ask.pixels != null) {
  if (typeof ask.pixels !== 'string') stop('pixels must be a base64 string of raw RGB bytes');
  const bytes = Buffer.from(ask.pixels, 'base64');
  if (!bytes.length || bytes.length % 3) stop(`pixels: ${bytes.length} bytes is not a whole number of RGB pixels`);
  world = worldFromPicture(swatches(bytes, 3));
} else if (ask.world != null) {
  if (!valid(ask.world)) stop(`unknown colour world ${JSON.stringify(ask.world)}: one of ${Object.keys(WORLDS).join(', ')}, or { "base": one of them, and deep, strong, fresh, light, warm as #RRGGBB }`);
  world = ask.world;
} else stop('nothing to make a world from: give "world" or "pixels"');

process.stdout.write(JSON.stringify({ world, tokens: worldTokens(worldOf(world)) }) + '\n');
