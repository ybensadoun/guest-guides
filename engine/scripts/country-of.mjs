#!/usr/bin/env node
// The country a house is in, for the generator and the worker (engine/src/country.js; Python keeps no copy):
//   echo '{"lat":41.39,"lng":2.17}' | node engine/scripts/country-of.mjs      prints {"country":"ES"}
// Reads onboarding-site/countries.json (COUNTRIES_FILE for another). No position, the open sea, or no file: {"country":""},
// which the launch desk's rule reads as "not known: nothing is cut". Nothing is read from the network or written.
import { readFileSync } from 'node:fs';
import { countriesPrep, countryAt } from '../src/country.js';
let q = {}; try { q = JSON.parse(readFileSync(0, 'utf8') || '{}') || {}; } catch (e) { process.stderr.write('country-of: stdin is not JSON\n'); process.exit(2); }
let country = '';
try { country = countryAt(countriesPrep(JSON.parse(readFileSync(process.env.COUNTRIES_FILE || new URL('../../onboarding-site/countries.json', import.meta.url), 'utf8'))), q.lat, q.lng); }
catch (e) { process.stderr.write(`country-of: the countries file could not be read: ${e.message}\n`); }
process.stdout.write(JSON.stringify({ country }) + '\n');
