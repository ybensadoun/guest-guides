#!/usr/bin/env node
// Moves a guide's taxi-and-train Home tile (a quick item with "trains", as Ca La Kimberly had) into the Getting around
// section: content/transport.json, a "transport" row in content/sections.json, the tile kept as the section's own tile.
// Guests see the same tile and the same page; the editor's Getting around step then edits it.
//   node engine/scripts/move-transport.mjs <site>        (then the content check, and guide:push for a guide in the database)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), site = process.argv[2];
if (!site) { console.error('Usage: node engine/scripts/move-transport.mjs <site>'); process.exit(1); }
const C = f => resolve(ROOT, 'sites', site, 'content', f + '.json');
const read = f => JSON.parse(readFileSync(C(f), 'utf8'));
const indent = f => existsSync(C(f)) ? (((readFileSync(C(f), 'utf8').split('\n')[1] || '').match(/^ +/) || [''])[0].length || 2) : 2;   // keep each file's own indentation
const write = (f, d) => writeFileSync(C(f), JSON.stringify(d, null, indent(f)) + '\n');
if (existsSync(C('transport'))) { console.log('content/transport.json already exists: nothing to move.'); process.exit(0); }
const quick = read('quick'), i = (quick.items || []).findIndex(q => Array.isArray(q.trains));
if (i < 0) { console.log('No Home tile with trains: nothing to move.'); process.exit(0); }
const q = quick.items[i];
const taxi = { id: 'taxi', name: q.taxiName || q.name, sub: q.taxiSub, phone: q.phone, what: q.what, alt: q.alt, always: q.always, web: q.web, verify: q.verify };
for (const k of Object.keys(taxi)) if (taxi[k] === undefined) delete taxi[k];
write('transport', {
  _doc: 'Getting around (section kind "transport"). lead{6}: line under the title. taxis: [{id, name{6}, sub{6} (line under the name), phone, what{6}, alt: [{name, phone}] (other numbers), always (24 h)}]. stations: [{id, mode (train|bus), name{6}, lat, lng, km, min (minutes by car), tag{6} (the verdict), what{6}, link (timetable), linkKey, gmaps, badges: [{t, c, ink}] (lines), to: [{dest{6}, time, note{6}}] (journey times)}]. tile: {name{6}, sub{6}} puts a one-tap tile on Home that opens this page (the section tile then stays off the Home grid); null for none.',
  lead: q.kind, taxis: [taxi], stations: q.trains.map(s => ({ mode: 'train', ...s })), tile: { name: q.name, sub: q.sub, ...(q.wide ? { wide: true } : {}) }
});
quick.items.splice(i, 1); write('quick', quick);
const sec = read('sections'), list = sec.sections;
if (!list.some(s => s.id === 'transport')) {
  const at = list.findIndex(s => s.id === 'emergency');
  list.splice(at < 0 ? list.length : at + 1, 0, { id: 'transport', kind: 'transport', group: 'house', status: 'live', labelKey: 'gettingAround' });
  write('sections', sec);
}
console.log(`Moved "${(q.name || {}).en || q.id}" into content/transport.json: ${taxi.name ? 1 : 0} taxi, ${q.trains.length} stations, tile kept.`);
