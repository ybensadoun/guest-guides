// The editor's job "place-facts" (Piece C of the places work): a place the host added or found in the editor after the
// first build (Eat and drink, Nightlife, Attractions) gets its facts the way the build gives them, through the same chain
// (worker/host-places.mjs, hostPlaces with one row). Google only locates: the pin is the one the host's pick already
// wrote in the draft (Google's, kept 30 days at most), so Google is not asked again; only an item with no pin is located
// by its id. A place kept in place_facts and looked at less than 30 days ago costs nothing. Nothing is written to the
// guide here: the result waits in the job for the open editor, which fills only what the place does not have yet.
//   params: { item: the item's id, list: 'eat'|'todo', gid, words: the host's name for it, about: their comment,
//             website?: a page the host pasted, read instead of looking for one }
//   result: { item, entry } with entry as hostPlaces gives it (its filled included), or { item, entry: null } when
//           nothing was found.
import { hostPlaces } from './host-places.mjs';
import { isGid } from './place-store.mjs';
import { locateById } from './places.mjs';

export const PLACE_FACTS_PER_DAY = 30;   // per guide: each place not kept yet is about 0.02 USD of Claude
const FILES = { eat: ['restaurants', 'nightlife'], todo: ['todo'] };
const num = v => typeof v === 'number' && Number.isFinite(v);
const some = v => v != null && v !== '' && !(Array.isArray(v) && !v.length);
const webUrl = u => { try { const x = new URL(/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : 'https://' + String(u || '').trim()); return x.hostname.includes('.') ? x.href : null; } catch (e) { return null; } };
// Something found: a fact for the guide, or a position of ours (an entry still on Google's pin carries pos).
export const factsFound = e => !!e && (['kind', 'phone', 'url', 'schedule', 'season', 'price', 'book'].some(k => some(e[k])) || !e.pos);

// j: the job row ({ id, guide_id, params }); jp(patch): writes to the job (messages for the host, the result).
// rest: Supabase's REST helper; store: makeStore(rest); ask, again: the worker's Haiku chain (placeAsk, placeAgain), null
// without RESEARCH=api; GK: the Google key, only for an item with no pin; locate, near, gaz (tests): stand-ins; meter:
// { usd } that the chain's cost is added to (the worker's daily budget counts it through the chain's own ledger).
export async function placeFactsJob(j, jp, { rest, store, ask = null, again = null, GK = null, locate = null, near, gaz, python, log = console.error, meter = { usd: 0 } } = {}) {
  if (!ask) throw new Error('Looking up places is not switched on yet.');
  const p = j.params || {}, item = String(p.item || '').slice(0, 80), list = p.list === 'todo' || p.list === 'eat' ? p.list : null;
  const words = String(p.words || '').trim().slice(0, 120), about = String(p.about || '').trim().slice(0, 600), website = p.website ? webUrl(p.website) : null;
  if (!item || !list || !isGid(p.gid) || !words) throw new Error('This place cannot be looked up.');
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = await rest(`/rest/v1/guide_jobs?select=id&guide_id=eq.${j.guide_id}&kind=eq.place-facts&id=neq.${j.id}&created_at=gt.${encodeURIComponent(since)}`);
  if ((recent || []).length >= PLACE_FACTS_PER_DAY) throw new Error('You have looked up a lot of places today. Try again tomorrow.');
  const g = ((await rest('/rest/v1/guides?select=content,draft,answers&id=eq.' + j.guide_id)) || [])[0];
  const c = (g && (g.draft && g.draft.content ? g.draft.content : g.content)) || {}, files = c.files || {}, h = files.house || {};
  if (!num(h.lat) || !num(h.lng)) throw new Error('The guide does not know where the house is.');
  // The pin the host's pick wrote (the draft is saved before the job is queued); else Google, by the id.
  const it = FILES[list].flatMap(f => (files[f] || {}).items || []).find(x => x && x.id === item);
  const pin = it && it.gid === p.gid && num(it.lat) && num(it.lng) && !it.nomap ? { gid: p.gid, lat: it.lat, lng: it.lng } : null;
  const L = locate || { byId: async id => (pin && id === pin.gid ? pin : GK ? locateById(GK, id) : null), byWords: async () => null };
  await jp({ message: 'Looking for its website' });
  // "Reading its website" as soon as the chain opens a page: the first question to Claude with the web.
  // Claude not answering (the day's budget spent, the API out of reach) is a failure for the host, not "nothing found".
  let reading = false, broke = null;
  const tell = f => f && (async (prompt, o = {}) => { if (o.what === 'site facts' && !reading) { reading = true; await jp({ message: 'Reading its website' }); }
    try { return await f(prompt, o); } catch (e) { broke = broke || e; throw e; } });
  const before = +meter.usd || 0;
  const geo = await hostPlaces({ rows: [{ p: words, gid: p.gid, list, ...(about ? { c: about } : {}), ...(website ? { website } : {}) }], house: { lat: h.lat, lng: h.lng }, town: ((g && g.answers) || {}).town || '' },
    { store, ask: tell(ask), again: tell(again), locate: L, near, gaz, python, log, meter, nameMatch: false });
  const e = geo[words] || null, entry = factsFound(e) ? e : null, usd = (+meter.usd || 0) - before;
  if (!entry && broke) { log(`  place facts for ${item}: not looked up (${broke.message}), about ${usd.toFixed(3)} USD`);
    throw new Error(/paused/i.test(broke.message) ? 'Looking up places is paused for today. Try again tomorrow.' : 'Try again in a few minutes.'); }
  log(`  place facts for ${item}: ${entry ? Object.keys((entry.filled || {}).from || {}).join(', ') || 'a position of ours' : 'nothing found'}, about ${usd.toFixed(3)} USD`);
  await jp({ status: 'done', message: entry ? 'Details found' : 'Nothing found', result: { item, entry }, finished_at: new Date().toISOString() });
  return { item, entry, usd };
}
