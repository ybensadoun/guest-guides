// POST /api/listing  { url?, text?, town? }
// 1. Checks the link is a listing page. 2. Tries to read it (Airbnb often blocks servers; then we ask for the text).
// 3. Asks Claude to turn the listing into a first version of every onboarding answer.
// Answer: { ok, draft, source } or { ok:false, need:'text'|'link', message }
const LINK_RX = [
  { site: 'airbnb', rx: /^https?:\/\/([a-z]{2,3}\.)?(www\.)?airbnb\.[a-z.]+\/(rooms\/(plus\/)?\d+|h\/[\w-]+)/i },
  { site: 'airbnb', rx: /^https?:\/\/(www\.)?abnb\.me\/\S+/i },
  { site: 'booking', rx: /^https?:\/\/(www\.)?booking\.com\/hotel\/[a-z]{2}\/[\w-]+/i },
  { site: 'vrbo', rx: /^https?:\/\/(www\.)?vrbo\.com\/(\d+|[\w-]+\/\d+)/i }
];
const AMEN = ['Pool','Garden','BBQ','Air conditioning','Heating or fireplace','Washing machine','Dishwasher','Coffee machine','Smart TV','Cot or high chair','Pets allowed','Free parking','EV charger','Hot tub','Bikes','Workspace','Sea view','Lift'];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

function htmlToText(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
const meta = (html, p) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, 'i')); return m ? m[1] : ''; };

async function readPage(url){
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(7000), headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      'accept-language': 'en-GB,en;q=0.9', accept: 'text/html' } });
    if (!r.ok) return null;
    const html = await r.text();
    const coords = html.match(/"lat(?:itude)?"\s*:\s*(-?\d+\.\d+)\s*,\s*"(?:lng|longitude)"\s*:\s*(-?\d+\.\d+)/);
    const photos = [...new Set((html.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"'\s?]+\.(?:jpe?g|webp)/gi) || []))].slice(0, 12);
    const text = htmlToText(html);
    const out = { title: meta(html, 'og:title'), description: meta(html, 'og:description'), image: meta(html, 'og:image'), photos, text: text.slice(0, 40000),
      lat: coords ? +coords[1] : null, lng: coords ? +coords[2] : null };
    // A blocked or empty page has almost no text and no title.
    if (!out.title && out.text.length < 1500) return null;
    return out;
  } catch (e) { return null; }
}

const SYSTEM = `You turn a holiday-rental listing into the first version of a guest guide, for the host to review.
Write in the language of the listing. Be accurate: only state what the listing says or what is obviously true for this kind of place.
When something is likely but not stated, phrase it as something for the host to confirm, ending with " (please confirm)".
Never include a street address, door code or key-box code. Keep the host's tone if the listing has one.
Take everything you can from the listing first, in its own wording (house rules, check-in and out, how things work, arrival). Only when the listing is silent on a point, propose a short sensible version for this kind of place and mark it as a suggestion. The host will edit every line.
Return ONLY a JSON object, no prose.`;
function prompt(src, town){
  return `Listing link: ${src.url || 'none'}
Town given by the host: ${town || 'not given'}
Page title: ${src.title || ''}
Page description: ${src.description || ''}
Listing text:
"""
${(src.text || '').slice(0, 30000)}
"""

Return this JSON (null when unknown):
{
 "placeName": string, "propertyType": one of ["House","Villa","Apartment","Cottage","Farmhouse","Room","Other"],
 "town": string, "region": string ("Region, Country"), "sleeps": number,
 "checkIn": "HH:MM", "checkOut": "HH:MM",
 "amenities": array chosen only from ${JSON.stringify(AMEN)},
 "guideName": string (usually the place name), "tagline": string (one warm welcome line, max 70 characters),
 "welcome": string (2 or 3 sentences welcoming guests, in the host's voice),
 "houseRules": string (one rule per line),
 "checkoutTasks": string (one task per line, typical for this place; mark guesses with (please confirm)),
 "howTos": string (one line per thing guests get stuck on, "Thing: how it works". Only things this listing has. Mark guesses with (please confirm)),
 "arrival": string (how to arrive and park, only from the listing; null if not said),
 "rubbish": null,
 "interests": array chosen from ["Beaches","Wine and food","Hiking and nature","Culture and history","Local markets","Nightlife","Festivals","Sports","Shopping","Wellness"] that fit the area,
 "guests": array chosen from ["Families with kids","Couples","Groups of friends","Remote workers","Older guests","Guests with pets","Wedding or event guests"],
 "navStyle": one of ["Big tiles, like an app","A simple list","Photo-led, like a magazine"] that fits the listing's style,
 "feelWords": array of up to 3 from ["Cosy","Elegant","Playful","Modern","Rustic","Calm","Local and authentic","Luxurious","Family friendly","Colourful"],
 "sections": object with true/false for ["wifi","rubbish","markets","eat","todo","events"],
 "basis": object saying, for each of "houseRules","checkoutTasks","howTos","arrival","checkIn","checkOut","welcome": "listing" when the listing itself says it, "suggested" when you wrote it because the listing is silent,
 "toConfirm": array of short questions the host should answer that the listing does not cover (max 6)
}`;
}
async function askClaude(src, town){
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('no_key');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(24000),
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 3000, system: SYSTEM,
      messages: [{ role: 'user', content: prompt(src, town) }] })
  });
  if (!r.ok) throw new Error('claude_' + r.status);
  const d = await r.json();
  const t = (d.content || []).map(c => c.text || '').join('');
  const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  return JSON.parse(j);
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, message: 'POST only' }, 405);
  let body; try { body = await req.json(); } catch (e) { return json({ ok: false, message: 'Bad request' }, 400); }
  const url = String(body.url || '').trim(), text = String(body.text || '').trim(), town = String(body.town || '').trim();
  let src = null, site = null;
  if (url) {
    site = (LINK_RX.find(x => x.rx.test(url)) || {}).site;
    if (!site && !text) return json({ ok: false, need: 'link', message: 'That does not look like a listing page. Open your listing on Airbnb (or Booking, Vrbo) and copy the address from the browser: it looks like airbnb.com/rooms/12345678.' });
    if (site) src = await readPage(url);
  }
  if (!src && text.length < 200) {
    return json({ ok: false, need: 'text', site, message: url && site
      ? 'Your link is right, but the listing site did not let us read it. Copy the text of your listing page and paste it below: everything from the title down to the house rules.'
      : 'Paste the text of your listing: everything from the title down to the house rules.' });
  }
  if (!src) src = { title: '', description: '', text, photos: [], lat: null, lng: null };
  else if (text) src.text = text + '\n\n' + src.text;
  src.url = url;
  try {
    const draft = await askClaude(src, town);
    return json({ ok: true, source: src.title ? 'page' : 'text', site, draft, photos: src.photos || [], cover: src.image || (src.photos || [])[0] || null, lat: src.lat, lng: src.lng });
  } catch (e) {
    return json({ ok: false, need: 'retry', message: e.message === 'no_key' ? 'The writing assistant is not set up yet. You can still fill in the steps by hand.' : 'Writing your first version took too long. Press the button again.' }, 200);
  }
};
export const config = { path: '/api/listing' };
