// Existence check against Google Places: flags spots Google marks as closed, or cannot find near their pin.
//   npm run check-places -- <site>              markets, restaurants and things to do
//   npm run check-places -- <site> markets      one file only
// Needs GOOGLE_PLACES_KEY in Guest Guides/.env (git-ignored) or in the environment. Dedicated key, Places API (New) only.
// Writes sites/<site>/docs/places-check.md (report) and places-check.json (raw). Read-only on content: a human or
// Claude decides what to remove. "Not found" is a prompt to check other sources, not proof: many street markets
// have no Google listing. "Closed" (permanently or temporarily) must be confirmed and acted on.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../site.config.js';

const [site, only] = process.argv.slice(2);
if (!site) { console.error('Usage: npm run check-places -- <site> [markets|restaurants|todo]'); process.exit(1); }
const envFile = resolve(ROOT, '.env');
if (!process.env.GOOGLE_PLACES_KEY && existsSync(envFile)) {
  for (const l of readFileSync(envFile, 'utf8').split('\n')) {
    const m = l.match(/^\s*GOOGLE_PLACES_KEY\s*=\s*"?([^"\s]+)"?/); if (m) process.env.GOOGLE_PLACES_KEY = m[1];
  }
}
const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('GOOGLE_PLACES_KEY missing (Guest Guides/.env).'); process.exit(1); }

const content = resolve(ROOT, 'sites', site, 'content');
const FILES = { markets: 'markets', restaurants: 'items', todo: 'items' };
const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const local = n => n?.ca || n?.es || n?.en || '';

const search = async (textQuery, lat, lng) => {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.displayName,places.businessStatus,places.formattedAddress,places.location,places.googleMapsUri' },
    body: JSON.stringify({ textQuery, languageCode: 'en', maxResultCount: 5,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } } }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()).places || [];
};

const rows = [];
for (const [file, key] of Object.entries(FILES)) {
  if (only && only !== file) continue;
  const p = resolve(content, file + '.json'); if (!existsSync(p)) continue;
  for (const it of JSON.parse(readFileSync(p, 'utf8'))[key] || []) {
    if (it.lat == null || !(it.schedule?.length || file !== 'markets')) continue; // dated events have no fixed place
    const q = file === 'markets' ? `${it.name_local && !/^Mercat setmanal$/i.test(it.name_local) ? it.name_local : local(it.name)} ${it.town}` : `${local(it.name)} ${it.town}`;
    let res = [], err = null;
    try { res = await search(q, it.lat, it.lng); } catch (e) { err = String(e.message || e).slice(0, 200); }
    const near = res.map(x => ({ ...x, km: km(it.lat, it.lng, x.location?.latitude, x.location?.longitude) })).filter(x => x.km <= 1.5);
    const closed = near.find(x => x.businessStatus && x.businessStatus !== 'OPERATIONAL');
    const best = closed || near[0];
    const status = err ? 'ERROR' : closed ? closed.businessStatus : best ? 'OK' : 'NOT_FOUND';
    rows.push({ file, id: it.id, query: q, status, match: best ? { name: best.displayName?.text, address: best.formattedAddress, km: +best.km.toFixed(2), url: best.googleMapsUri } : null, err });
    process.stdout.write(`${status.padEnd(20)} ${file}/${it.id}\n`);
    await new Promise(r => setTimeout(r, 200));
  }
}
const today = new Date().toISOString().slice(0, 10);
const order = ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY', 'ERROR', 'NOT_FOUND', 'OK'];
rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
const docs = resolve(ROOT, 'sites', site, 'docs');
writeFileSync(resolve(docs, 'places-check.json'), JSON.stringify({ date: today, rows }, null, 1) + '\n');
const md = [`# Google Places existence check, ${today}`, '',
  'CLOSED: confirm and remove or fix. NOT_FOUND: check a recent second source (town hall, local press under 2 years old). OK: Google lists it as operating near the pin.', '',
  '| Status | Spot | Google match | km from pin |', '|---|---|---|---|',
  ...rows.map(r => `| ${r.status} | ${r.file}/${r.id} | ${r.match ? `[${r.match.name}](${r.match.url})` : r.err || '-'} | ${r.match?.km ?? '-'} |`)].join('\n');
writeFileSync(resolve(docs, 'places-check.md'), md + '\n');
const bad = rows.filter(r => r.status.startsWith('CLOSED')).length, nf = rows.filter(r => r.status === 'NOT_FOUND').length;
console.log(`\n${rows.length} checked: ${bad} closed, ${nf} not found. Report: sites/${site}/docs/places-check.md`);
