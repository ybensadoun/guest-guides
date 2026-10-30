// Google Places (New) for one place, shared by the monthly check (check-guides.mjs) and "Find more" in the worker:
// the same name and position rules decide whether Google's answer is our place, and its periods become our schedule.
export const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const hav = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; return 2 * R * Math.asin(Math.sqrt(Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2)); };
export const nameOf = n => (n && typeof n === 'object' ? n.ca || n.es || n.en || Object.values(n)[0] : n) || '';
export const pad = n => String(n).padStart(2, '0');
export const daysOf = sch => [...new Set((sch || []).flatMap(s => s.days || []))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
// Google's answer must share a real word with our name (not the town, not "market" alone), or be the listing we already link to.
export const STOP = new Set('de del dels la les el els los las le du des a i y et and the of d l s sa es en al market mercat mercado marche setmanal semanal weekly'.split(' '));
export const words = (s, town) => new Set(String(s || '').replace(/\u00ad/g, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w) && !String(town || '').toLowerCase().split(/\W+/).includes(w)));
// Weekly markets are often listed as "Mercat setmanal de <town>": a market listing within 600 m counts, unless the two
// names name different weekdays (the Tuesday market is not the Saturday one).
export const WD = /dilluns|dimarts|dimecres|dijous|divendres|dissabte|diumenge|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday/gi;
export const wdays = s => new Set((String(s || '').toLowerCase().match(WD) || []).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/, '')));
export const sameMarket = (it, p, far) => { if (far > 0.6 || !/mercat|mercado|market|fira|feria/i.test(p.displayName?.text || '')) return false;
  const b = wdays(p.displayName?.text); if (!b.size) return true;
  const SCH = { mon: 'dilluns', tue: 'dimarts', wed: 'dimecres', thu: 'dijous', fri: 'divendres', sat: 'dissabte', sun: 'diumenge' };
  const a = wdays([it.name_local, ...Object.values(it.name || {}), ...daysOf(it.schedule).map(d => SCH[d])].join(' '));   // the guide's own days count too
  return [...a].some(d => b.has(d)) || [...b].some(d => ({ lunes: 'dilluns', martes: 'dimarts', miercoles: 'dimecres', jueves: 'dijous', viernes: 'divendres', sabado: 'dissabte', domingo: 'diumenge' })[d] && a.has(({ lunes: 'dilluns', martes: 'dimarts', miercoles: 'dimecres', jueves: 'dijous', viernes: 'divendres', sabado: 'dissabte', domingo: 'diumenge' })[d])); };
export const sameName = (it, p) => { const a = new Set([...words(it.name_local, it.town), ...words(nameOf(it.name), it.town), ...Object.values(it.name || {}).flatMap(x => [...words(x, it.town)])]); return [...words(p.displayName?.text, it.town)].some(w => a.has(w)); };
export const cidOf = u => { const m = String(u || '').match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i); if (m) return BigInt('0x' + m[1]).toString(); const c = String(u || '').match(/[?&]cid=(\d+)/); return c ? c[1] : null; };
export const md = d => (d.getMonth() + 1) * 100 + d.getDate(), mdn = s => +s.replace('-', '');
export const inSeason = (s, d = new Date()) => !s.from || (mdn(s.from) <= mdn(s.to) ? md(d) >= mdn(s.from) && md(d) <= mdn(s.to) : md(d) >= mdn(s.from) || md(d) <= mdn(s.to));
export const ago = d => d ? (Date.now() - Date.parse(d)) / 864e5 : Infinity;

// Google's opening periods as the guide's schedule (close earlier than open = after midnight; one period without close = always open).
export function schedule(periods) {
  if (!periods || !periods.length) return null;
  if (periods.length === 1 && !periods[0].close) return 'always';
  const g = new Map();
  for (const p of periods) {
    if (!p.close) continue;
    const k = `${pad(p.open.hour)}:${pad(p.open.minute)}-${pad(p.close.hour)}:${pad(p.close.minute)}`;
    g.set(k, [...(g.get(k) || []), DAY[p.open.day]]);
  }
  return [...g].map(([k, d]) => ({ days: [...new Set(d)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), open: k.slice(0, 5), close: k.slice(6) }))
    .sort((a, b) => ORDER.indexOf(a.days[0]) - ORDER.indexOf(b.days[0]) || a.open.localeCompare(b.open));
}

export const FIELDS = 'id,displayName,businessStatus,googleMapsUri,location,formattedAddress,regularOpeningHours,rating,userRatingCount,photos';
// Each request: 15 s limit and up to 3 tries (a dropped connection must not stop the monthly run).
export async function get(url, init) {
  for (let i = 1; ; i++) {
    try { return await fetch(url, { ...init, signal: AbortSignal.timeout(15000) }); }
    catch (e) { if (i >= 3) throw e; await new Promise(r => setTimeout(r, 1500 * i)); }
  }
}
// One request for a place: details by its Google id when known, else a text search near its pin.
export const makeGoogle = GK => async function google(it) {
  const head = { 'X-Goog-Api-Key': GK, 'Content-Type': 'application/json' };
  if (it.gid) {   // known place: details by id, no search
    const r = await get(`https://places.googleapis.com/v1/places/${encodeURIComponent(it.gid)}`, { headers: { ...head, 'X-Goog-FieldMask': FIELDS } });
    if (r.ok) return r.json();
  }
  const body = { textQuery: [it.name_local || nameOf(it.name), it.town].filter(Boolean).join(', '), maxResultCount: 1 };
  if (typeof it.lat === 'number') body.locationBias = { circle: { center: { latitude: it.lat, longitude: it.lng }, radius: 3000 } };
  const r = await get('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { ...head, 'X-Goog-FieldMask': FIELDS.split(',').map(f => 'places.' + f).join(',') }, body: JSON.stringify(body) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return (d.places || [])[0] || null;
};

// What a place is, from Google's own type: the quick filters of Things to do (engine/src/groups.json) and "Great for kids".
const GROUP_OF = {
  fun: 'adventure_sports_center amusement_center amusement_park aquarium bowling_alley ferris_wheel go_karting_venue golf_course ice_skating_rink indoor_playground miniature_golf_course off_roading_area planetarium playground roller_coaster skateboard_park ski_resort video_arcade water_park wildlife_park zoo',
  sights: 'art_gallery castle church cultural_center cultural_landmark historical_landmark historical_place monument museum observation_deck place_of_worship plaza sculpture tourist_attraction',
  nature: 'botanical_garden garden hiking_area national_park park picnic_ground state_park wildlife_refuge',
  beach: 'beach', wine: 'winery'
};
const FOR_KIDS = new Set('amusement_center amusement_park aquarium bowling_alley go_karting_venue indoor_playground miniature_golf_course planetarium playground video_arcade water_park wildlife_park zoo'.split(' '));
const HOST_FIELDS = [...FIELDS.split(','), 'primaryTypeDisplayName', 'primaryType'];
// What the guide needs from Google's answer about a host's place.
const hostFacts = (p, name, house) => {
  const km = hav(house.lat, house.lng, p.location.latitude, p.location.longitude), sch = schedule(p.regularOpeningHours && p.regularOpeningHours.periods);
  const group = Object.keys(GROUP_OF).find(g => GROUP_OF[g].split(' ').includes(p.primaryType));
  return { name: p.displayName && p.displayName.text || name, lat: p.location.latitude, lng: p.location.longitude, km: Math.max(1, Math.round(km * 1.3)),
    town: townOf(p.formattedAddress), gmaps: p.googleMapsUri, gid: p.id, type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text || null, status: p.businessStatus || null,
    ...(group ? { group } : {}), ...(FOR_KIDS.has(p.primaryType) ? { tags: ['kidsfun'] } : {}),
    ...(sch === 'always' ? { always: true } : sch ? { schedule: sch } : {}) };
};
// One of the host's own favourite places, as they typed it: a name, or a Google Maps link (a short maps.app.goo.gl
// link is read for the name and pin it points to). Searched on Google near the house; kept only when Google's answer
// shares a real word with the name and lies within reach. Gives what the guide needs: position, distance, town,
// opening hours, its Maps link, its id for the monthly check and what kind of place it is.
const townOf = addr => { const parts = String(addr || '').split(',').map(x => x.trim()).filter(Boolean); const withCode = parts.find(x => /\b\d{4,5}\b/.test(x));
  return (withCode || parts[parts.length - 2] || '').replace(/\b\d{4,5}\b\s*([A-Z]{2}\b)?/, '').trim() || null; };
export async function hostPlace(GK, raw, house, reachKm = 50) {
  let q = String(raw || '').trim(), pin = null;
  if (/^https?:/.test(q)) {
    let url = q;
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(url)) { try { const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) }); url = r.headers.get('location') || url; } catch (e) { /* read the link as it is */ } }
    const n = url.match(/\/maps\/place\/([^/@?]+)/), p = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/), s = url.match(/[?&]q(?:uery)?=([^&]+)/);
    q = n ? decodeURIComponent(n[1]).replace(/\+/g, ' ') : s ? decodeURIComponent(s[1]).replace(/\+/g, ' ') : '';
    if (p) pin = { lat: +p[1], lng: +p[2] };
    if (!q) return null;
  }
  const at = pin || house, body = { textQuery: q, maxResultCount: 1, languageCode: 'en', locationBias: { circle: { center: { latitude: at.lat, longitude: at.lng }, radius: pin ? 300 : Math.min(50000, reachKm * 1000) } } };
  const r = await get('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'X-Goog-Api-Key': GK, 'Content-Type': 'application/json', 'X-Goog-FieldMask': HOST_FIELDS.map(f => 'places.' + f).join(',') }, body: JSON.stringify(body) });
  const d = await r.json(); if (d.error) throw new Error(d.error.message);
  const p = (d.places || [])[0];
  if (!p || !p.location) return null;
  const km = hav(house.lat, house.lng, p.location.latitude, p.location.longitude);
  const close = () => { const a = [...words(q)], b = [...words(p.displayName && p.displayName.text)]; return a.some(x => b.some(y => Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x)))); };
  if (km > reachKm || !(sameName({ name: { en: q } }, p) || close())) return null;
  return hostFacts(p, q, house);
}
// The same for a card the host kept in the swipe game: its Google id is known, so no search.
export async function hostPlaceById(GK, id, house) {
  const r = await get(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=en`, { headers: { 'X-Goog-Api-Key': GK, 'X-Goog-FieldMask': HOST_FIELDS.join(',') } });
  const p = await r.json(); if (p.error) throw new Error(p.error.message);
  return p.location ? hostFacts(p, '', house) : null;
}
