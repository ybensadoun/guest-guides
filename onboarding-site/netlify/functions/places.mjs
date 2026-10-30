// GET /api/places?lat=..&lng=..&cat=eat|coffee|drinks|todo&town=..
// Top-rated places near the house from Google Places (New). Without lat/lng, the town is geocoded first.
const CATS = {
  eat: ['restaurant'], coffee: ['cafe', 'bakery', 'coffee_shop'], drinks: ['bar', 'wine_bar', 'pub'],
  todo: ['tourist_attraction', 'beach', 'park', 'museum', 'hiking_area', 'winery', 'historical_landmark']
};
// What the host said in Your area steers the deck: which kinds of place, never a fixed list of places. Activities have a
// search of their own, with a lower bar: Google gives only its 20 most popular places, so monuments and wineries would leave
// no room for them, and they score lower (a water park full of families, 3.5). Who the guests are decides which come first.
const TODO_FOR = { Beaches: ['beach'], 'Wine and food': ['winery'], 'Hiking and nature': ['park', 'hiking_area', 'national_park'], 'Culture and history': ['museum', 'historical_landmark', 'art_gallery'], Wellness: ['spa'] };
const ACTIVITIES = ['amusement_center', 'amusement_park', 'water_park', 'zoo', 'aquarium', 'bowling_alley', 'go_karting_venue', 'miniature_golf_course', 'adventure_sports_center'];
const ACTIVE_GUESTS = ['Families with kids', 'Groups of friends', 'Sports'];
const todoTypes = want => { const t = want.flatMap(w => TODO_FOR[w] || []); return t.length ? [...new Set(['tourist_attraction', ...t])] : CATS.todo; };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } });
const G = 'https://places.googleapis.com/v1/';
async function g(path, body, mask, key){
  const r = await fetch(G + path, { method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('google_' + r.status);
  return r.json();
}
const hav = (a, b, c, d) => { const R = 6371, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t; const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
export default async (req) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return new Response(JSON.stringify({ ok: false, message: 'Places are not set up yet.' }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (new URL(req.url).searchParams.get('probe')) return new Response(JSON.stringify({ ok: true, enabled: true }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const u = new URL(req.url), cat = CATS[u.searchParams.get('cat')] ? u.searchParams.get('cat') : 'eat';
  // ?q=<name>&lat=..&lng=..: one place by its name near the house (the editor's "Find it on Google" for a host's place).
  // The host sees the answer and keeps it or not: no name check here.
  if (u.searchParams.get('q')) {
    const q = u.searchParams.get('q').slice(0, 160), la = parseFloat(u.searchParams.get('lat')), ln = parseFloat(u.searchParams.get('lng'));
    if (!(la && ln)) return json({ ok: false, message: 'The guide does not know where the house is.' });
    try {
      const d = await g('places:searchText', { textQuery: q, maxResultCount: 1, languageCode: 'en', locationBias: { circle: { center: { latitude: la, longitude: ln }, radius: 50000 } } },
        'places.id,places.displayName,places.location,places.googleMapsUri,places.formattedAddress,places.primaryTypeDisplayName,places.businessStatus,places.regularOpeningHours', key);
      const p = (d.places || [])[0];
      if (!p || !p.location || hav(la, ln, p.location.latitude, p.location.longitude) > 60) return json({ ok: true, place: null });
      const parts = String(p.formattedAddress || '').split(',').map(x => x.trim()), coded = parts.find(x => /\b\d{4,5}\b/.test(x));
      return json({ ok: true, place: { id: p.id, name: p.displayName && p.displayName.text, lat: p.location.latitude, lng: p.location.longitude, maps: p.googleMapsUri,
        km: Math.max(1, Math.round(hav(la, ln, p.location.latitude, p.location.longitude) * 1.3)), town: ((coded || parts[parts.length - 2] || '').replace(/\b\d{4,5}\b\s*([A-Z]{2}\b)?/, '').trim()) || null,
        type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text, status: p.businessStatus || null, periods: (p.regularOpeningHours && p.regularOpeningHours.periods) || null } });
    } catch (e) { return json({ ok: false, message: 'Could not reach Google right now.' }); }
  }
  let lat = parseFloat(u.searchParams.get('lat')), lng = parseFloat(u.searchParams.get('lng'));
  const town = (u.searchParams.get('town') || '').slice(0, 120), lang = (u.searchParams.get('lang') || 'en').slice(0, 5);
  const radius = Math.min(30000, Math.max(1500, parseInt(u.searchParams.get('radius') || '8000', 10)));
  try {
    if (!(lat && lng) && town) {
      const t = await g('places:searchText', { textQuery: town, maxResultCount: 1 }, 'places.location', key);
      const loc = t.places && t.places[0] && t.places[0].location;
      if (loc) { lat = loc.latitude; lng = loc.longitude; }
    }
    if (!(lat && lng)) return json({ ok: false, message: 'We need the town first.' });
    const search = types => g('places:searchNearby', { includedTypes: types, maxResultCount: 20, rankPreference: 'POPULARITY', languageCode: lang,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } } },
      'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.primaryTypeDisplayName,places.location,places.googleMapsUri,places.shortFormattedAddress,places.photos,places.editorialSummary', key);
    const best = (d, bar) => (d.places || [])
      .filter(p => (p.rating || 0) >= bar && (p.userRatingCount || 0) >= 40)
      .map(p => ({ id: p.id, name: p.displayName && p.displayName.text, rating: p.rating, reviews: p.userRatingCount, price: p.priceLevel || null,
        type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text, address: p.shortFormattedAddress, maps: p.googleMapsUri,
        summary: p.editorialSummary && p.editorialSummary.text, lat: p.location.latitude, lng: p.location.longitude,
        km: Math.round(hav(lat, lng, p.location.latitude, p.location.longitude) * 13) / 10,
        photo: p.photos && p.photos[0] ? '/api/photo?name=' + encodeURIComponent(p.photos[0].name) : null }))
      .sort((a, b) => (b.rating * Math.log(b.reviews + 1)) - (a.rating * Math.log(a.reviews + 1)));
    if (cat !== 'todo') return json({ ok: true, lat, lng, places: best(await search(CATS[cat]), 4.3) });
    const want = (u.searchParams.get('want') || '').split('|'), [sights, fun] = await Promise.all([search(todoTypes(want)), search(ACTIVITIES).catch(() => ({}))]);
    const lists = [best(sights, 4.3), best(fun, 3.5)]; if (ACTIVE_GUESTS.some(w => want.includes(w))) lists.reverse();
    const seen = new Set(), places = [];   // one of each, turn about, so the deck is never all one kind
    for (let i = 0; i < 20 && places.length < 24; i++) for (const l of lists) if (l[i] && !seen.has(l[i].id)) { seen.add(l[i].id); places.push(l[i]); }
    return json({ ok: true, lat, lng, places });
  } catch (e) { return json({ ok: false, message: 'Could not load places right now.' }); }
};
export const config = { path: '/api/places' };
