// The taxis a house is offered, from our open directory (Overture's places, which the guides already hold and credit;
// README.md beside this file, "The taxis found"). One rule in one place: the worker (the research at the link, the
// build, the editor's job), the generator (engine/scripts/taxis-of.mjs) and the maker (pasted by
// onboarding-site/src/build.py, the export and import words taken out) all use it. Pure: no DOM. Every name starts with tx.
// Tested in engine/scripts/transport-taxis.test.mjs.
import { tpLine, tpRoadKm, tpPlaced } from './pick.js';

export const TX = { far: 15, conf: 0.4, max: 4 };   // km in a straight line; Overture's confidence; how many offered (the design, 16 Nov 2026)
const txFold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const txDigits = s => String(s || '').replace(/\D/g, '');
// Two numbers are the same taxi when their last 9 digits are ("+34 977 66 61 11" and "977666111").
export const txKey = s => txDigits(s).slice(-9);
const txPhones = r => [...(Array.isArray(r.phones) ? r.phones : []), ...(r.phone ? [r.phone] : [])].map(String).filter(p => txDigits(p).length >= 9);

// From the directory's records (raw, as worker/overture.py gives them: { id, name, category, status, confidence, phones,
// websites, town, lat, lng }; or this rule's own output, so that a list can be sorted again for another house) to the taxis
// a house is offered, nearest first: [{ id, name, phone, town, lat, lng, km (by road), web }]. Left out: closed
// (permanently or for now); no phone; no town in its address; a name without "taxi" (a driver under his own name);
// confidence under 0.4; farther than 15 km in a straight line; the same number as a nearer one or as a taxi the guide has
// (have: phone numbers).
export function txPick(records, house, { have = [], max = TX.max } = {}) {
  if (!tpPlaced(house) || !Array.isArray(records)) return [];
  const ok = [];
  for (const r of records) {
    if (!r || typeof r !== 'object' || !Number.isFinite(+r.lat) || !Number.isFinite(+r.lng)) continue;
    if (/closed/i.test(String(r.status || ''))) continue;
    const phone = txPhones(r)[0], town = String(r.town || '').trim(), name = String(r.name || '').trim();
    if (!phone || !town || !/taxi/.test(txFold(name))) continue;
    if (r.confidence != null && +r.confidence < TX.conf) continue;
    const line = tpLine(house, { lat: +r.lat, lng: +r.lng }); if (line > TX.far) continue;
    ok.push({ r, phone, town, name, line });
  }
  ok.sort((a, b) => a.line - b.line || String(a.r.id).localeCompare(String(b.r.id)));
  const seen = new Set((have || []).map(txKey).filter(Boolean)), out = [];
  for (const x of ok) {
    const k = txKey(x.phone); if (seen.has(k)) continue; seen.add(k);
    const web = (Array.isArray(x.r.websites) ? x.r.websites[0] : x.r.web) || '';
    out.push({ id: String(x.r.id), name: x.name, phone: x.phone, town: x.town, lat: +x.r.lat, lng: +x.r.lng, km: tpRoadKm(x.line), web: String(web) });
    if (out.length >= max) break;
  }
  return out;
}
// The one taxi a new guide gets when the host said nothing: the nearest, or none.
export const txAuto = (records, house) => txPick(records, house, { max: 1 })[0] || null;

// A name as a guide writes it: trimmed, single spaces; one all in capitals or all in small letters in title case.
const TX_SMALL = new Set(['de', 'del', 'dels', 'd', 'i', 'y']);
export function txName(s) {
  const t = String(s || '').trim().replace(/\s+/g, ' ');
  if (!/\p{L}/u.test(t) || (t !== t.toUpperCase() && t !== t.toLowerCase())) return t;
  return t.toLowerCase().split(' ').map((w, i) => i && TX_SMALL.has(w) ? w : w.replace(/^(\P{L}*)(\p{L})/u, (m, a, b) => a + b.toUpperCase())).join(' ');
}
// A number as the guide's others are written: a Spanish one without its country code, grouped "977 66 61 11"; any other
// with its "+" code, as the directory gives it.
export function txPhone(s) {
  const raw = String(s || '').trim(), d = txDigits(raw);
  const es = (raw.startsWith('+34') || raw.startsWith('0034') || (d.length === 11 && d.startsWith('34'))) ? d.slice(-9) : (d.length === 9 && !raw.startsWith('+')) ? d : '';
  if (es && /^[6789]/.test(es)) return `${es.slice(0, 3)} ${es.slice(3, 5)} ${es.slice(5, 7)} ${es.slice(7)}`;
  return raw.startsWith('+') ? raw.replace(/\s+/g, ' ') : raw.startsWith('00') ? '+' + d.slice(2) : raw.replace(/\s+/g, ' ');
}
// A short id that stays the same for the same record (FNV-1a, base 36).
const txHash = s => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
// The taxi as content/transport.json holds one (its _doc): the record's name and town, no words of the host's (what
// empty), credited to the directory (src).
export function txEntry(t, langs, { at = '' } = {}) {
  const ls = langs && langs.length ? langs : ['en'], all = f => Object.fromEntries(ls.map(l => [l, f(l)]));
  return { id: 'tx' + txHash(t.id), name: all(() => txName(t.name)), sub: all(() => String(t.town || '').trim()), phone: txPhone(t.phone), what: all(() => ''),
    src: { from: 'overture', id: String(t.id), at } };
}
