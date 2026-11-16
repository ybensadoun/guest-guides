// iryo and Ouigo on a guide's high speed stations (Getting around, engine/src/modules/transport/README.md rules 25 to 29).
// Renfe's open files do not hold these two companies, and no open file gives iryo's stations. Yohann, 16 Nov 2026: "every
// time someone types a station that we know is an Ave train station, we can assume that probably Irios and Hugo go there.
// So at that point, we make a search. [...] And then we record it in our system. [...] We only do it on request."
// The design, 16 Nov 2026, told to Yohann: one search gives each company's whole list of stations (two companies, one
// question), kept in one shared record (table rail_brands, one row per company, the worker's only), renewed on a request
// only when it is older than 30 days (7 days after a search that was not sure); a search that is not sure shows nothing
// and changes nothing. The badges themselves are put on by the engine's rule (pick.js tpBrandBadges).
// Used by worker/guide-worker.mjs: the editor's job find-transport with params.what === 'brands' (brandsJob), the build
// (refreshBrands, then applyToFiles on the generated guide), and the dry run --find find-rail-brands (brandsPrompt,
// readBrands; nothing written). Tested in worker/test/rail-brands.test.mjs with a fake Claude and a fake database.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tpBrandBadges, tpBrandsStale, TP_BRANDS } from '../engine/src/modules/transport/pick.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MIN_STATIONS = 3;                                   // fewer stations than this for a company: not a sure list
export const OWN = { iryo: ['iryo.eu'], ouigo: ['ouigo.com'] };   // each company's own domain, its sources recorded first
const NAMES = { iryo: 'iryo', ouigo: 'Ouigo (Ouigo Spain, the Spanish company of the SNCF group)' };
const SELECT = 'brand,stations,seen,sources,checked_at,tried_at,usd';

// Our high speed stations (hs in onboarding-site/stations-es.json): [{ id, name }], and the brands' colours (brands.json).
export const hsStations = (data = JSON.parse(readFileSync(resolve(ROOT, 'onboarding-site/stations-es.json'), 'utf8'))) =>
  (data.stations || []).filter(s => s.hs).map(s => ({ id: String(s.id), name: s.name }));
export const brandsList = () => JSON.parse(readFileSync(resolve(ROOT, 'engine/src/modules/transport/brands.json'), 'utf8')).brands;

// The one question, for both companies.
export function brandsPrompt(hs) {
  return `You check which train stations two high speed train companies in Spain serve today, for the "Getting around" page of holiday homes' guest guides.
The companies: ${TP_BRANDS.map(k => `"${k}": ${NAMES[k]}`).join('; ')}.
The stations (id: name, as Spain's rail timetables write them), the only ones you may answer with:
${hs.map(s => `${s.id}: ${s.name}`).join('\n')}
For each company, find which of these stations its trains serve today. Sources in this order: the company's own website first (iryo.eu; ouigo.com/es: its destinations, its booking form, its network map), then, only to confirm, another recent reliable page.
A route that is planned or announced but not running today is not a served station. Never a station outside the list above, never a guess. When you cannot confirm a company's list, give "sure": false for it.
Return only JSON, where "id" is one of the ids above and "name" the station as the source writes it:
{"iryo":{"sure":true,"stations":[{"id":"","name":""}],"sources":[""]},"ouigo":{"sure":true,"stations":[{"id":"","name":""}],"sources":[""]}}`;
}

const isUrl = u => { try { return /^https?:$/.test(new URL(String(u)).protocol); } catch (e) { return false; } };
const host = u => { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ''; } };
// The answer read, company by company: kept only when sure, every id one of ours, at least MIN_STATIONS, and at least one
// http(s) source (those on the company's own domain first). Anything else: { sure: false, why }.
export function readBrands(out, hsIds) {
  const ok = new Set((hsIds || []).map(String)), res = {};
  for (const k of TP_BRANDS) {
    const a = out && typeof out === 'object' ? out[k] : null, no = why => { res[k] = { sure: false, why }; };
    if (!a || a.sure !== true) { no('not sure'); continue; }
    const list = Array.isArray(a.stations) ? a.stations : [];
    if (list.some(s => !s || !ok.has(String(s.id)))) { no('a station not in our list'); continue; }
    const seen = [], ids = [];
    for (const s of list) { const id = String(s.id); if (ids.includes(id)) continue; ids.push(id); seen.push({ id, name: String(s.name || '').trim().slice(0, 80) }); }
    if (ids.length < MIN_STATIONS) { no(`${ids.length} station${ids.length === 1 ? '' : 's'}`); continue; }
    const urls = [...new Set((Array.isArray(a.sources) ? a.sources : []).filter(isUrl).map(String))].slice(0, 8);
    if (!urls.length) { no('no source'); continue; }
    const own = u => OWN[k].some(d => host(u) === d || host(u).endsWith('.' + d));
    res[k] = { sure: true, stations: [...ids].sort(), seen, sources: [...urls.filter(own), ...urls.filter(u => !own(u))] };
  }
  return res;
}

const same = (a, b) => JSON.stringify([...(a || [])].map(String).sort()) === JSON.stringify([...(b || [])].map(String).sort());
// The shared rows, loaded; when one of them wants a search (tpBrandsStale) or force, one question for both, then saved.
// Returns { rows, changed: [companies whose list changed in this run], asked, answer, usd }. Never throws: a failure is
// logged and the kept rows come back. ask(prompt): Claude's answer as JSON, through the worker's own claudeJson (its cost
// on the meter and the daily budget, which refuses when the day's budget is spent: then nothing is asked). dry: nothing
// written.
export async function refreshBrands({ rest, ask, now = new Date(), hs = null, log = () => {}, meter = { usd: 0 }, force = false, dry = false } = {}) {
  let rows = [];
  try { rows = (await rest(`/rest/v1/rail_brands?select=${SELECT}`)) || []; }
  catch (e) { log('  other train companies: the record could not be read:', e.message); return { rows: [], changed: [], asked: false }; }
  const rowOf = k => rows.find(r => r && r.brand === k) || null;
  if (!ask || !(force || TP_BRANDS.some(k => tpBrandsStale(rowOf(k), now)))) return { rows, changed: [], asked: false };
  const list = hs || hsStations(), at = new Date(now).toISOString(), before = meter.usd || 0;
  let out = null;
  try { out = await ask(brandsPrompt(list)); }
  catch (e) { log('  other train companies not asked or no answer:', e.message); }   // the day's budget spent, Claude out of reach
  const usd = +((meter.usd || 0) - before).toFixed(4), answer = readBrands(out, list.map(s => s.id)), changed = [], next = [];
  for (const k of TP_BRANDS) {
    const old = rowOf(k), a = answer[k];
    const row = a.sure ? { brand: k, stations: a.stations, seen: a.seen, sources: a.sources, checked_at: at, tried_at: at, usd }
      : { ...(old || { brand: k, stations: [], seen: [], sources: [], checked_at: null }), brand: k, tried_at: at, usd };   // not sure: only when it was tried
    if (a.sure && !same(old && old.checked_at ? old.stations : null, a.stations)) changed.push(k);
    next.push(row);
    if (!dry) {
      const body = a.sure ? row : { brand: k, tried_at: at, usd };
      try { await rest('/rest/v1/rail_brands?on_conflict=brand', { method: 'POST', body, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } }); }
      catch (e) { log(`  other train companies: ${k} not saved:`, e.message); }
    }
  }
  log(`  other train companies: ${TP_BRANDS.map(k => `${k} ${answer[k].sure ? answer[k].stations.length + ' stations' : 'not sure (' + answer[k].why + ')'}`).join(', ')}${usd ? `, about ${usd.toFixed(2)} USD` : ''}${dry ? ' (dry run, nothing written)' : ''}`);
  return { rows: next, changed, asked: true, answer, usd };
}

// The rule on the high speed stations of our file in a guide's files (hsIds: our hs ids; a station with no high speed
// trains is never given a check it did not need): { files (a copy when something changed), changed, stations: { id:
// { badges, brands } } }. only: 'badges' counts a change only when a station's badges change (another guide); else a new
// date of the check counts too (the guide that asked, whose editor says the date).
export function applyToFiles(files, rows, brands, { only = '', hsIds = new Set(hsStations().map(s => s.id)) } = {}) {
  const T = files && files.transport, S = (T && Array.isArray(T.stations)) ? T.stations : [];
  let changed = false; const stations = {};
  const next = S.map(s => {
    if (!(s && s.src && s.src.from === 'renfe' && hsIds.has(String(s.id).slice(2)))) return s;
    const n = tpBrandBadges(s, rows, brands);
    stations[s.id] = { badges: n.badges || [], brands: n.brands || null };
    const diff = JSON.stringify(n.badges) !== JSON.stringify(s.badges) || (only !== 'badges' && JSON.stringify(n.brands) !== JSON.stringify(s.brands));
    if (diff) changed = true;
    return diff ? n : s;
  });
  return { files: changed ? { ...files, transport: { ...T, stations: next } } : files, changed, stations };
}

// A guide holds a station of our file with high speed trains (in a copy of its files).
const holdsHs = (files, hsIds) => (((files || {}).transport || {}).stations || []).some(s => s && s.src && s.src.from === 'renfe' && hsIds.has(String(s.id).slice(2)));
// The other guides, when a company's list changed in this run: each one's content and its draft, written only when a
// station's badges really change.
export async function updateOthers({ rest, guideId, rows, brands, hsIds, log = () => {} }) {
  let n = 0;
  const all = (await rest('/rest/v1/guides?select=id,slug,content,draft&id=neq.' + guideId)) || [];
  for (const g of all) {
    const body = {};
    for (const [k, c] of [['content', g.content], ['draft', g.draft && g.draft.content]]) {
      if (!c || !holdsHs(c.files, hsIds)) continue;
      const a = applyToFiles(c.files, rows, brands, { only: 'badges', hsIds });
      if (a.changed) body[k] = k === 'content' ? { ...c, files: a.files } : { ...g.draft, content: { ...c, files: a.files } };
    }
    if (!Object.keys(body).length) continue;
    try { await rest('/rest/v1/guides?id=eq.' + g.id, { method: 'PATCH', body, headers: { Prefer: 'return=minimal' } }); n++; log(`  other train companies: ${g.slug || g.id} updated (${Object.keys(body).join(' and ')})`); }
    catch (e) { log(`  other train companies: ${g.slug || g.id} not updated:`, e.message); }
  }
  return n;
}

// The editor's job (find-transport, params { what: 'brands', id: the station's id in the guide }): the shared record
// renewed when it is old, the badges on this guide's newest copy (the draft, else the content, as the lines' job does),
// then, only when a company's list changed in this run, on every other guide. Its messages, which hosts may see, never
// name Claude or a web search. result: { stations: { <id>: { badges, brands } } } for the open editor.
export async function brandsJob(j, jp, { rest, ask, now = new Date(), hs = null, brands = null, log = () => {}, meter = { usd: 0 } } = {}) {
  const list = hs || hsStations(), B = brands || brandsList(), hsIds = new Set(list.map(s => s.id));
  await jp({ message: 'Checking other train companies' });
  const r = await refreshBrands({ rest, ask, now, hs: list, log, meter });
  const g = ((await rest('/rest/v1/guides?select=content,theme,draft&id=eq.' + j.guide_id)) || [])[0];
  if (!g) throw new Error('This guide was not found.');
  const draft = g.draft && g.draft.content ? g.draft : { content: g.content, theme: g.theme };
  const a = applyToFiles((draft.content || {}).files || {}, r.rows, B, { hsIds });
  if (a.changed) await rest('/rest/v1/guides?id=eq.' + j.guide_id, { method: 'PATCH', body: { draft: { ...draft, content: { ...draft.content, files: a.files }, savedAt: new Date(now).toISOString() } }, headers: { Prefer: 'return=minimal' } });
  if (r.changed.length) { try { await updateOthers({ rest, guideId: j.guide_id, rows: r.rows, brands: B, hsIds, log }); } catch (e) { log('  other train companies: the other guides not updated:', e.message); } }
  const n = r.rows.filter(x => x && x.checked_at && TP_BRANDS.includes(x.brand)).length;
  await jp({ status: 'done', message: n ? `${n} ${n === 1 ? 'company' : 'companies'} checked` : 'No other company confirmed', result: { stations: a.stations }, finished_at: new Date().toISOString() });
  return { ...r, applied: a.changed };
}
