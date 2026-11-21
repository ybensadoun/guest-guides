// The launch desk for the worker: what is on for a house's country (docs/plan-launch-desk-gates.md). The engine's own
// rule (engine/src/modules/available.js) and its country rule (engine/src/country.js), never a copy; the owner's word
// read from the database with the worker's own access (the tables launch_countries and module_switches).
//   const LA = launchFor(await readLaunch(rest), countryOf(answers));   LA.on('transport/trains')
// Nothing here can stop a build: no answer from the database, the list alone decides; no country known, nothing is cut.
import { readFileSync } from 'node:fs';
import { avPartOn } from '../engine/src/modules/available.js';
import { countriesPrep, countryAt, countrySpot } from '../engine/src/country.js';

const LIST = JSON.parse(readFileSync(new URL('../engine/src/modules/available.json', import.meta.url), 'utf8'));
const FILE = new URL('../onboarding-site/countries.json', import.meta.url);
let prep = null;
// The house's country: the builder's own answer when it was read from this same position, else read from the position
// with our outlines file. '' when it is not known (a border, the open sea, no position, the file missing).
export function countryOf(A, file = FILE) {
  const at = countrySpot(A && A.lat, A && A.lng); if (!at) return '';
  if (typeof A.country === 'string' && /^([A-Z]{2})?$/.test(A.country) && A._countryAt === at) return A.country;
  try { if (file !== FILE) return countryAt(countriesPrep(JSON.parse(readFileSync(file, 'utf8'))), +A.lat, +A.lng);
    prep = prep || countriesPrep(JSON.parse(readFileSync(FILE, 'utf8'))); return countryAt(prep, +A.lat, +A.lng); }
  catch (e) { return ''; }
}
// What the owner decided, as the database's launch_public() gives it to the maker; null when it cannot be read.
export async function readLaunch(rest) {
  try {
    const [countries, switches] = await Promise.all([rest('/rest/v1/launch_countries?select=country,state'), rest('/rest/v1/module_switches?select=module,part,country,is_on')]);
    return Array.isArray(countries) && Array.isArray(switches) ? { countries, switches } : null;
  } catch (e) { return null; }
}
// For one house: its country, the owner's word, and on('<module>/<part>'). file() is what the generator is handed.
export function launchFor(launch, country, list = LIST) {
  return { country, launch, on: id => avPartOn(list, launch, id, country), file: () => JSON.stringify({ country, launch }) };
}
