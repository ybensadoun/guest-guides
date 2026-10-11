// GET /api/photo?name=places/.../photos/...  → redirects to the Google photo, without exposing the API key.
export default async (req) => {
  const key = process.env.GOOGLE_MAPS_API_KEY, name = new URL(req.url).searchParams.get('name') || '';
  if (!key || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&skipHttpRedirect=true&key=${key}`, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    if (!d.photoUri) return new Response('Not found', { status: 404 });
    return new Response(null, { status: 302, headers: { location: d.photoUri, 'cache-control': 'public, max-age=86400' } });
  } catch (e) { return new Response('Not found', { status: 404 }); }
};
export const config = { path: '/api/photo' };
