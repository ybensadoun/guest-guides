// POST /api/photorooms { photos: [url, ...] } -> { ok, rooms: [room|null, ...] }
// Claude looks at the listing photos (Airbnb links only) and says which room each one shows, so the host only confirms.
const ROOMS = ['Outside','Living room','Kitchen','Bedroom','Bathroom','Pool','Garden','Terrace','Office','Laundry','View','Other'];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  let body; try { body = await req.json(); } catch (e) { return json({ ok: false }, 400); }
  const urls = (Array.isArray(body.photos) ? body.photos : []).filter(u => /^https:\/\/a0\.muscache\.com\/im\/pictures\/[^\s"']+\.(jpe?g|webp)$/i.test(u)).slice(0, 16);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!urls.length || !key) return json({ ok: false, rooms: [] });
  try {
    const content = [];
    urls.forEach((u, i) => { content.push({ type: 'text', text: 'Photo ' + i + ':' }); content.push({ type: 'image', source: { type: 'url', url: u + '?im_w=480' } }); });
    content.push({ type: 'text', text: 'For each numbered photo, say which room or area it shows, chosen only from ' + JSON.stringify(ROOMS) + '. Use null if unsure. Return ONLY a JSON array with exactly ' + urls.length + ' entries, in order.' });
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(24000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content }] }) });
    if (!r.ok) return json({ ok: false, rooms: [] });
    const d = await r.json(); const t = (d.content || []).map(c => c.text || '').join('');
    const arr = JSON.parse(t.slice(t.indexOf('['), t.lastIndexOf(']') + 1));
    return json({ ok: true, rooms: urls.map((_, i) => ROOMS.includes(arr[i]) ? arr[i] : null) });
  } catch (e) { return json({ ok: false, rooms: [] }); }
};
export const config = { path: '/api/photorooms' };
