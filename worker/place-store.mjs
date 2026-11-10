// What the chain finds about a place (worker/place-facts.mjs), kept in our own table public.place_facts, one row per
// Google place id (the places work, step 2). Reading a site does not always work the first time, so a look that finds
// less never erases what an earlier look found: each fact is replaced only by a new value, and carries where it came
// from and when. Google's own data is not kept here (its terms: only the place id for good), only facts from Overture
// Maps (open data) and the place's own website.
export const FACTS = ['phone', 'website', 'facebook', 'instagram', 'town', 'kind', 'hours', 'price', 'book', 'lat', 'lng'];

// Facts only a place with a door has: one of them kept means we know it is a venue, whatever one answer says.
const VENUE_FACTS = ['phone', 'website', 'facebook', 'instagram', 'hours', 'price', 'book'];
const has = v => v !== null && v !== undefined;
const day = d => d.toISOString().slice(0, 10);
const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;

// Where each fact of a look came from. A fact whose source is not known is not kept.
const FROM = { phone: r => r.phoneFrom, website: r => r.websiteFrom, facebook: () => 'overture', instagram: () => 'overture',
  town: () => 'overture', kind: () => 'overture', lat: () => 'overture', lng: () => 'overture', hours: () => 'site', price: () => 'site', book: () => 'site' };

// row: the table's row for this place, or null. place: { name, country? }. res: what placeFacts returned.
// Returns the whole new row (no gid, no created_at), ready to upsert. Pure: no network, no clock unless now is left out.
export function mergeFacts(row, place, res, { now = new Date(), release = null } = {}) {
  const old = row || {}, r = res || {}, e = r.entry || null, at = day(now);
  const facts = { ...(old.facts || {}) }, sources = { ...(old.sources || {}) };
  // The position is Overture's own for the matched record, never Google's: Google's position may only be kept 30 days,
  // Overture's may be kept for good.
  const look = { ...Object.fromEntries(FACTS.map(k => [k, r[k]])), lat: e ? num(e.lat) : null, lng: e ? num(e.lng) : null };
  let found = 0;
  for (const k of FACTS) {
    const v = look[k], from = has(v) ? FROM[k](r) : null;
    if (!from) continue;
    const src = { from, at };
    if ((from === 'site' || from === 'search') && r.page) src.page = r.page;
    if (from === 'overture' && release) src.release = release;
    facts[k] = v; sources[k] = src; found++;
  }
  // One odd "not a venue" must not turn a restaurant we know into a beach: false only while nothing kept says venue.
  const venue = r.venue === true ? true : r.venue === false && !VENUE_FACTS.some(k => has(facts[k])) ? false : has(old.venue) ? old.venue : null;
  return {
    name: place && place.name || old.name, country: place && place.country || old.country || 'ES', venue,
    overture_id: e ? e.id || null : has(old.overture_id) ? old.overture_id : null,
    overture_release: e ? release : has(old.overture_release) ? old.overture_release : null,
    facts, sources, tries: (+old.tries || 0) + 1, tried_at: now.toISOString(),
    read_at: found ? now.toISOString() : has(old.read_at) ? old.read_at : null,
    usd: +((+old.usd || 0) + (+r.usd || 0)).toFixed(4), updated_at: now.toISOString(),
  };
}

// Whether a place is to be looked at again: never looked at, or not for `days` days.
export function due(row, now = new Date(), days = 30) {
  const t = row && row.tried_at ? Date.parse(row.tried_at) : NaN;
  return !Number.isFinite(t) || now.getTime() - t > days * 86400000;
}

// A Google place id as Google writes them. Anything else is refused: it also keeps the in.(...) filter safe.
export const isGid = g => typeof g === 'string' && /^[A-Za-z0-9_-]{10,}$/.test(g);
const checkGid = g => { if (!isGid(g)) throw new Error(`Not a Google place id: ${JSON.stringify(String(g).slice(0, 40))}`); return g; };

// rest(path, { method, body, headers }): the caller's helper for Supabase's REST API (as in guide-worker.mjs).
export function makeStore(rest) {
  // gid -> row, asked in groups of 50 so the address stays short.
  async function get(gids) {
    const list = [...new Set((gids || []).map(checkGid))], out = {};
    for (let i = 0; i < list.length; i += 50) {
      const rows = await rest(`/rest/v1/place_facts?gid=in.(${list.slice(i, i + 50).join(',')})&select=*`);
      for (const x of rows || []) out[x.gid] = x;
    }
    return out;
  }
  // Read, merge, write back. Returns the row as now kept.
  async function save(gid, place, res, opts) {
    checkGid(gid);
    const row = (await get([gid]))[gid] || null, next = mergeFacts(row, place, res, opts);
    await rest('/rest/v1/place_facts?on_conflict=gid', { method: 'POST', body: { gid, ...next }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    return { gid, ...next, ...(row && row.created_at ? { created_at: row.created_at } : {}) };
  }
  return { get, save };
}
