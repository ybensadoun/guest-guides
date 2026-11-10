// What the chain finds about a place (worker/place-facts.mjs), kept in our own table public.place_facts, one row per
// Google place id (the places work, step 2). Reading a site does not always work the first time, so a look that finds
// less never erases what an earlier look found: each fact is replaced only by a new value, and carries where it came
// from and when. Google's own data is not kept here (its terms: only the place id for good), only facts from Overture
// Maps (open data), the place's own website and Claude's reading of the host's words and the record (name, kind).
// category: Overture's own raw category. name: the record's name as the place writes it. kind_eat, kind_todo: our kind
// (a key of engine/src/kinds.json) for each list the place was looked at for; a place can be in both.
export const FACTS = ['name', 'phone', 'website', 'facebook', 'instagram', 'town', 'category', 'kind_eat', 'kind_todo', 'hours', 'price', 'book', 'lat', 'lng'];
export const LISTS = ['eat', 'todo'];

// Facts only a place with a door has: one of them kept means we know it is a venue, whatever one answer says.
const VENUE_FACTS = ['phone', 'website', 'facebook', 'instagram', 'hours', 'price', 'book'];
const has = v => v !== null && v !== undefined;
const day = d => d.toISOString().slice(0, 10);
const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;

// Where each fact of a look came from. A fact whose source is not known is not kept.
const FROM = { name: () => 'overture', phone: r => r.phoneFrom, website: r => r.websiteFrom, facebook: () => 'overture', instagram: () => 'overture',
  town: () => 'overture', category: () => 'overture', kind_eat: () => 'claude', kind_todo: () => 'claude', lat: () => 'overture', lng: () => 'overture',
  hours: () => 'site', price: () => 'site', book: () => 'site' };

// Whether the row was looked at for this list (its kind asked), even when no kind was sure: a build then does not ask again
// before the row is due (worker/host-places.mjs).
export const lookedFor = (row, list) => LISTS.includes(list) && !!(row && row.sources && row.sources['kind_' + list]);

// row: the table's row for this place, or null. place: { name, country?, list? }. res: what placeFacts returned.
// Returns the whole new row (no gid, no created_at), ready to upsert. Pure: no network, no clock unless now is left out.
// light: a look that only asked the match question (placeFacts, matchOnly): it does not count as a try and leaves the
// date of the last full look, so the place is still read again when that one is 30 days old.
export function mergeFacts(row, place, res, { now = new Date(), release = null, light = false } = {}) {
  const old = row || {}, r = res || {}, e = r.entry || null, at = day(now);
  const facts = { ...(old.facts || {}) }, sources = { ...(old.sources || {}) };
  // The position is Overture's own for the matched record, never Google's: Google's position may only be kept 30 days,
  // Overture's may be kept for good.
  // Only the kind of the list this look was for is set: the other list's kind is another question.
  const list = place && LISTS.includes(place.list) ? place.list : null;
  const look = { ...Object.fromEntries(FACTS.map(k => [k, r[k]])), lat: e ? num(e.lat) : null, lng: e ? num(e.lng) : null,
    kind_eat: list === 'eat' ? r.ourKind : null, kind_todo: list === 'todo' ? r.ourKind : null };
  let found = 0;
  for (const k of FACTS) {
    const v = look[k], from = has(v) ? FROM[k](r) : null;
    if (!from) continue;
    const src = { from, at };
    if ((from === 'site' || from === 'search') && r.page) src.page = r.page;
    if (from === 'overture' && release) src.release = release;
    facts[k] = v; sources[k] = src; found++;
  }
  // Asked for this list and no kind was sure: said so in sources (no fact), so the next build does not ask again.
  if (list && !has(look['kind_' + list]) && !sources['kind_' + list]) sources['kind_' + list] = { from: 'claude', at, none: true };
  // One odd "not a venue" must not turn a restaurant we know into a beach: false only while nothing kept says venue.
  const venue = r.venue === true ? true : r.venue === false && !VENUE_FACTS.some(k => has(facts[k])) ? false : has(old.venue) ? old.venue : null;
  return {
    name: place && place.name || old.name || r.name || '', country: place && place.country || old.country || 'ES', venue,
    overture_id: e ? e.id || null : has(old.overture_id) ? old.overture_id : null,
    overture_release: e ? release : has(old.overture_release) ? old.overture_release : null,
    facts, sources, tries: (+old.tries || 0) + (light && old.tried_at ? 0 : 1), tried_at: light && old.tried_at ? old.tried_at : now.toISOString(),
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

// A place's name as the guide shows it: the host's own words, tidied by code (Yohann, 10 Nov 2026: the host's words win,
// our sources only correct spelling). Each word the host typed takes the spelling (capitals, accents, inner apostrophes and
// hyphens) of the same word in ref, our sources' name for the place, compared without case, accents, apostrophes or
// hyphens; a word ref does not have keeps the host's letters with a first capital, small words staying small unless first.
// A word the host typed with a capital is theirs and kept as typed. Words the host did not type are never added.
const SMALL = new Set(['de', 'del', 'dels', "d'", 'la', 'el', 'els', 'les', 'las', 'los', "l'", 'le', 'du', 'des', 'dei', 'di', 'da', 'do', 'dos', 'das', 'i', 'y', 'e', 'et', 'und', 'en', 'a', 'al', 'per', 'para', 'amb', 'con',
  'of', 'the', 'and', 'van', 'von', 'der', 'den', 'het', 'op', 'aan', 'im', 'am', 'zur', 'zum', 'sur']);
const plain = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const key = w => plain(w).replace(/['’\-]/g, '');
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
const tokens = t => String(t || '').trim().split(/\s+/).map(w => w.replace(/^[,.;:()"“”«»]+|[,.;:()"“”«»]+$/g, '')).filter(Boolean);
// "l'ancora": the article stays as it is and the word after it gets its capital, unless that word is itself small (d'en).
const afterArticle = w => { const m = w.match(/^([dl]['’])(\p{Ll}.*)$/iu); return m && !SMALL.has(plain(m[2])) ? m[1] + cap(m[2]) : w; };
// towns (optional): names of towns around the place ("El Vendrell"): when the host's words hold one in full, it takes the
// town's own spelling, so the article of a town keeps its capital.
export function tidyName(words, ref, towns = []) {
  const host = tokens(words), refWords = tokens(ref), out = new Array(host.length).fill(null);
  const typed = w => /\p{Lu}/u.test(w);   // typed with a capital: the host's own spelling, kept
  // 1. The same word in ref, in the order of the name first (the second "la" of the host is the second "la" of ref), then
  // anywhere, then as a part of a ref word around an apostrophe or a hyphen ("Àncora" of "L'Àncora").
  const used = new Set(), parts = new Map();
  for (const w of refWords) for (const part of w.split(/(?<=['’])|-/)) { const k = key(part); if (k && part !== w && !parts.has(k)) parts.set(k, part.replace(/['’]$/, '')); }
  let from = 0;
  host.forEach((w, i) => {
    if (typed(w)) { out[i] = w; return; }
    if (i && SMALL.has(w)) { out[i] = w; return; }   // a small word inside a name stays small, whatever ref's capitals (a town's name below may still claim it)
    let at = refWords.findIndex((r, n) => n >= from && !used.has(n) && key(r) === key(w));
    if (at < 0) at = refWords.findIndex((r, n) => !used.has(n) && key(r) === key(w));
    const r = at >= 0 ? refWords[at] : parts.get(key(w));
    if (at >= 0) { used.add(at); from = at + 1; }
    if (!r) return;
    // An accent the host typed that ref lacks is kept (ref may be the one without it): ref gives only the capital then.
    out[i] = plain(w) === w || w === r.toLowerCase() ? r : (/\p{Lu}/u.test(r.charAt(0)) ? cap(w) : w);
  });
  // 2. A town's whole name inside the host's words.
  for (const t of towns) { const tw = tokens(t); if (!tw.length) continue;
    for (let i = 0; i + tw.length <= host.length; i++) if (tw.every((x, n) => key(x) === key(host[i + n]) && !typed(host[i + n]))) tw.forEach((x, n) => { if (out[i + n] === null || SMALL.has(host[i + n]) || plain(host[i + n]) === host[i + n]) out[i + n] = x; }); }
  // 3. What our sources do not have: the host's letters with a capital, small words staying small unless first.
  return host.map((w, i) => { const r = out[i] !== null ? out[i] : (i && (SMALL.has(w) || /^[dl]['’]/.test(w)) ? w : cap(w)); return afterArticle(i ? r : cap(r)); }).join(' ');
}
