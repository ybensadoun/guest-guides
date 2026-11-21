#!/usr/bin/env node
// What is on for a house's country, for the generator and the worker (the launch desk's rule, engine/src/modules/available.js;
// Python keeps no copy):   echo '{"country":"ES","launch":{...}}' | node engine/scripts/available-of.mjs
// stdin: { country: two capital letters or nothing, launch: the database's launch_public() answer or nothing }.
// stdout: { country, open, parts: { "<module>/<part>": true or false } }: open says whether the owner has launched the
// country (his switches count only then); a house gets a guide either way, from the parts that are on. Nothing is read
// from the network or written.
import { readFileSync } from 'node:fs';
import { avParts, avCountryOpen } from '../src/modules/available.js';
const list = JSON.parse(readFileSync(new URL('../src/modules/available.json', import.meta.url), 'utf8'));
let q = {}; try { q = JSON.parse(readFileSync(0, 'utf8') || '{}') || {}; } catch (e) { console.error('available-of: stdin is not JSON'); process.exit(1); }
const country = /^[A-Z]{2}$/.test(q.country || '') ? q.country : '';
process.stdout.write(JSON.stringify({ country, open: avCountryOpen(list, q.launch, country), parts: avParts(list, q.launch, country) }));
