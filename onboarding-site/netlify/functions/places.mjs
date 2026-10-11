// GET /api/places?lat=..&lng=..&cat=eat|coffee|drinks|todo&town=..
// Top-rated places near the house from Google Places (New). Without lat/lng, the town is geocoded first.
const CATS = {
  eat: ['restaurant'], coffee: ['cafe', 'bakery', 'coffee_shop'], drinks: ['bar', 'wine_bar', 'pub'],
  todo: ['tourist_attraction', 'beach', 'park', 'museum', 'hiking_area', 'winery', 'historical_landmark']
};
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
  if (!key) return json({ ok: false, message: 'Places are not set up yet.' });
  const u = new URL(req.url), cat = CATS[u.searchParams.get('cat')] ? u.searchParams.get('cat') : 'eat';
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
    const d = await g('places:searchNearby', { includedTypes: CATS[cat], maxResultCount: 20, rankPreference: 'POPULARITY', languageCode: lang,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } } },
      'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.primaryTypeDisplayName,places.location,places.googleMapsUri,places.shortFormattedAddress,places.photos,places.editorialSummary', key);
    const places = (d.places || [])
      .filter(p => (p.rating || 0) >= 4.3 && (p.userRatingCount || 0) >= 40)
      .map(p => ({ id: p.id, name: p.displayName && p.displayName.text, rating: p.rating, reviews: p.userRatingCount, price: p.priceLevel || null,
        type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text, address: p.shortFormattedAddress, maps: p.googleMapsUri,
        summary: p.editorialSummary && p.editorialSummary.text, lat: p.location.latitude, lng: p.location.longitude,
        km: Math.round(hav(lat, lng, p.location.latitude, p.location.longitude) * 13) / 10,
        photo: p.photos && p.photos[0] ? '/api/photo?name=' + encodeURIComponent(p.photos[0].name) : null }))
      .sort((a, b) => (b.rating * Math.log(b.reviews + 1)) - (a.rating * Math.log(a.reviews + 1)));
    return json({ ok: true, lat, lng, places });
  } catch (e) { return json({ ok: false, message: 'Could not load places right now.' }); }
};
export const config = { path: '/api/places' };
