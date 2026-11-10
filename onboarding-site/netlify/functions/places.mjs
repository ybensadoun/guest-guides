// GET /api/places?lat=..&lng=..&cat=eat|coffee|drinks|todo&town=..
// Top-rated places near the house from Google Places (New). Without lat/lng, the town is geocoded first.
// ?suggest=<text>: what Google suggests as a host types a place's name. ?id=<google id>: one place by its id. ?q=<name>: one place by its name.
// Google's terms: a place's id may be kept for good and its position for 30 days, nothing else it returns. So ?id= and ?q= ask
// for those two only and answer { id, lat, lng, km }; the suggestions and the deck are only shown, live, never kept. No answer
// is cached anywhere (private, no-store): a shared or day-long copy of Google's answers would be a stored copy.
const CATS = {
  eat: ['restaurant'], coffee: ['cafe', 'bakery', 'coffee_shop'], drinks: ['bar', 'wine_bar', 'pub'],
  todo: ['tourist_attraction', 'beach', 'park', 'museum', 'hiking_area', 'winery', 'historical_landmark']
};
// What the host said in Your area steers the deck: which kinds of place, never a fixed list of places. Activities have a
// search of their own, with a lower bar: Google gives only its 20 most popular places, so monuments and wineries would leave
// no room for them, and they score lower (a water park full of families, 3.5). Who the guests are decides which come first.
const TODO_FOR = { Beaches: ['beach'], 'Wine and food': ['winery'], 'Hiking and nature': ['park', 'hiking_area', 'national_park'], 'Culture and history': ['museum', 'historical_landmark', 'art_gallery'], Wellness: ['spa'] };
const ACTIVITIES = ['amusement_center', 'amusement_park', 'water_park', 'zoo', 'aquarium', 'bowling_alley', 'go_karting_venue', 'miniature_golf_course', 'adventure_sports_center'];
// Markets have their own section (Local markets): never a card in the Attractions deck. Whole words only, so not "Supermarket".
const MARKET = /(?<!\p{L})(markets?|mercados?|mercats?|mercadillos?|mercadets?|march[ée]s?|m[äa]rkte?|mercato|mercati|markthal)(?!\p{L})/iu;
const ACTIVE_GUESTS =['Families with kids', 'Groups of friends', 'Sports'];
const todoTypes = want => { const t = want.flatMap(w => TODO_FOR[w] || []); return t.length ? [...new Set(['tourist_attraction', ...t])] : CATS.todo; };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
const G = 'https://places.googleapis.com/v1/';
async function g(path, body, mask, key){
  const r = await fetch(G + path, { method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('google_' + r.status);
  return r.json();
}
const hav = (a, b, c, d) => { const R = 6371, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t; const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// One place, as the maker may keep it: Google's id and position (the caller dates it), and the distance worked out from it.
const PLACE = ['id', 'location'];
const located = (p, la, ln) => ({ id: p.id, lat: p.location.latitude, lng: p.location.longitude, km: Math.max(1, Math.round(hav(la, ln, p.location.latitude, p.location.longitude) * 1.3)) });
export default async (req) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return json({ ok: false, message: 'Places are not set up yet.' });
  if (new URL(req.url).searchParams.get('probe')) return json({ ok: true, enabled: true });
  const u = new URL(req.url), cat = CATS[u.searchParams.get('cat')] ? u.searchParams.get('cat') : 'eat';
  const la = parseFloat(u.searchParams.get('lat')), ln = parseFloat(u.searchParams.get('lng'));
  // ?suggest=<text>&lat=..&lng=..: as a host types a place's name (builder and editor). Places and sights within 50 km of the
  // house, no streets or towns, so a misspelt name still finds the place: "llul de llebre" gives Restaurant Ull de Llebre. A
  // bias instead of a limit wanders off ("bowling vend" gave the Vendée, in France). Without a position, the text alone.
  // Priced per request: 10,000 free a month, then 2.83 USD per 1,000. Session tokens would save nothing: they need a paid Details call.
  if (u.searchParams.get('suggest')) {
    const around = la && ln ? { locationRestriction: { circle: { center: { latitude: la, longitude: ln }, radius: 50000 } }, origin: { latitude: la, longitude: ln } } : {};
    try {
      const d = await g('places:autocomplete', { input: u.searchParams.get('suggest').slice(0, 120), languageCode: 'en', includedPrimaryTypes: ['establishment'], ...around },
        'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.distanceMeters', key);
      return json({ ok: true, places: (d.suggestions || []).map(s => s.placePrediction).filter(p => p && p.structuredFormat).map(p => ({ id: p.placeId, name: p.structuredFormat.mainText.text,
        where: (p.structuredFormat.secondaryText || {}).text || '', km: p.distanceMeters ? Math.max(1, Math.round(p.distanceMeters * 1.3 / 1000)) : null })) });
    } catch (e) { return json({ ok: false, message: 'Could not reach Google right now.' }); }
  }
  // ?id=<google id>&lat=..&lng=..: the place a host picked from those suggestions, in the editor.
  if (u.searchParams.get('id')) {
    if (!(la && ln)) return json({ ok: false, message: 'The guide does not know where the house is.' });
    try {
      const r = await fetch(G + 'places/' + encodeURIComponent(u.searchParams.get('id').slice(0, 300)), { signal: AbortSignal.timeout(8000), headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACE.join(',') } });
      if (!r.ok) throw new Error('google_' + r.status);
      const p = await r.json();
      return json({ ok: true, place: p.location ? located(p, la, ln) : null });
    } catch (e) { return json({ ok: false, message: 'Could not reach Google right now.' }); }
  }
  // ?q=<name>&lat=..&lng=..: one place by its name near the house (a station or a stop in Getting around).
  // The host sees the answer and keeps it or not, under the name they typed: no name check here, and Google's is not asked.
  if (u.searchParams.get('q')) {
    const q = u.searchParams.get('q').slice(0, 160);
    if (!(la && ln)) return json({ ok: false, message: 'The guide does not know where the house is.' });
    try {
      const d = await g('places:searchText', { textQuery: q, maxResultCount: 1, locationBias: { circle: { center: { latitude: la, longitude: ln }, radius: 50000 } } },
        PLACE.map(f => 'places.' + f).join(','), key);
      const p = (d.places || [])[0];
      if (!p || !p.location || hav(la, ln, p.location.latitude, p.location.longitude) > 60) return json({ ok: true, place: null });
      return json({ ok: true, place: located(p, la, ln) });
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
    const market = p => MARKET.test([p.displayName && p.displayName.text, p.primaryTypeDisplayName && p.primaryTypeDisplayName.text].join(' '));
    const best = (d, bar) => (d.places || [])
      .filter(p => (p.rating || 0) >= bar && (p.userRatingCount || 0) >= 40 && !(cat === 'todo' && market(p)))
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
