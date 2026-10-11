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
const ROOMS = ['Outside','Living room','Kitchen','Bedroom','Bathroom','Pool','Garden','Terrace','Office','Laundry','View','Other'];
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
    // Airbnb lists every photo with its caption: ..."accessibilityLabel":"Salón","baseUrl":"https://a0.muscache.com/im/pictures/....jpg"
    const seen = new Map();
    for (const m of html.matchAll(/"accessibilityLabel":"([^"]{0,140})","baseUrl":"(https:\/\/a0\.muscache\.com\/im\/pictures\/[^"?]+\.(?:jpe?g|webp))/gi)) { if (!seen.has(m[2])) seen.set(m[2], m[1]); }
    for (const u of (html.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"'\s?\\]+\.(?:jpe?g|webp)/gi) || [])) if (!seen.has(u) && !/\/(user|profile|Hosting|airbnb-platform)/i.test(u)) seen.set(u, '');
    const pics = [...seen.entries()].slice(0, 16).map(([url, caption]) => ({ url, caption }));
    const photos = pics.map(x => x.url);
    // "4 habitaciones · 7 camas · 2 baños": the counts Claude needs for the rooms
    const counts = [...new Set((html.match(/\b\d{1,2}\s(?:bedrooms?|beds?|baths?|bathrooms?|habitaci[oó]n(?:es)?|camas?|ba[ñn]os?|chambres?|lits?|salles? de bains?)\b/gi) || []))].slice(0, 12).join(' · ');
    const cl = x => x.replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\\u2019/g, '’').replace(/\\n/g, ' ').trim();
    const iv = (k, n) => { const i = html.indexOf(k); return i < 0 ? '' : html.slice(i, i + n); };
    const strs = (blk) => [...new Set([...blk.matchAll(/"(?:title|subtitle|text|html)":"([^"]{2,220})"/g)].map(m => cl(m[1])))];
    const overview = (iv('"overview":{"__typename":"StaysPdpOverview"', 700).match(/"items":\[([^\]]*)\]/) || [, ''])[1].replace(/"/g, '').split(',').map(x => x.trim()).filter(Boolean);
    const rules = strs(iv('"rules":{"__typename":"StaysPdpRuleDetails"', 6000).split('"__typename":"StaysPdpSection"')[0]).filter(x => !/^Normas de la casa$|trátala como/i.test(x));
    const amenities = [...new Set([...html.matchAll(/"__typename":"AmenityItem","available":true,"title":"([^"]+)"/g)].map(m => cl(m[1])))];
    const sleepBlk = iv('"sleepingArrangements":[', 3000); const sleeping = sleepBlk ? strs(sleepBlk).slice(0, 24) : [];
    const rt = html.match(/"ratingAverage":([\d.]+),"ratingCount":"?(\d+)/);
    const facts = [overview.length && 'Overview: ' + overview.join(' · '), rules.length && 'House rules section: ' + rules.join(' | '), amenities.length && 'Amenities listed: ' + amenities.join(', '),
      sleeping.length && 'Sleeping arrangements: ' + sleeping.join(' | '), rt && 'Rating: ' + rt[1] + ' from ' + rt[2] + ' reviews'].filter(Boolean).join('\n');
    const text = (facts ? 'FACTS READ FROM THE PAGE DATA:\n' + facts + '\n\n' : '') + htmlToText(html);
    const out = { title: meta(html, 'og:title'), description: meta(html, 'og:description'), image: meta(html, 'og:image'), photos, pics, counts, facts, text: text.slice(0, 40000),
      lat: coords ? +coords[1] : null, lng: coords ? +coords[2] : null };
    // A blocked or empty page has almost no text and no title.
    if (!out.title && out.text.length < 1500) return null;
    return out;
  } catch (e) { return null; }
}

// Airbnb often refuses servers. A public page reader (r.jina.ai) opens the page like a browser and hands back text with the photo links.
async function readViaReader(url){
  try {
    const r = await fetch('https://r.jina.ai/' + url, { signal: AbortSignal.timeout(14000), headers: { accept: 'text/plain', 'x-return-format': 'markdown' } });
    if (!r.ok) return null;
    const md = await r.text();
    const seen = new Set(), pics = [];
    for (const m of md.matchAll(/https:\/\/a0\.muscache\.com\/im\/pictures\/(?!airbnb-platform|AirbnbPlatform|user)[^)\s"'?]+\.(?:jpe?g|webp)/gi)) { if (!seen.has(m[0]) && !/\/(profile|Hosting-\d+\/original\/[^/]*profile)/i.test(m[0])) { seen.add(m[0]); pics.push({ url: m[0], caption: '' }); } }
    const text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\n\s*\n+/g, '\n').trim();
    const counts = [...new Set((md.match(/\b\d{1,2}\s(?:bedrooms?|beds?|baths?|bathrooms?|habitaci[oó]n(?:es)?|camas?|ba[ñn]os?|chambres?|lits?|salles? de bains?)\b/gi) || []))].slice(0, 12).join(' · ');
    const title = (md.match(/^Title:\s*(.+)$/m) || [])[1] || '';
    if (!title && text.length < 1500) return null;
    return { title, description: '', image: pics[0] ? pics[0].url : '', photos: pics.slice(0, 16).map(x => x.url), pics: pics.slice(0, 16), counts, text: text.slice(0, 40000), lat: null, lng: null };
  } catch (e) { return null; }
}

const SYSTEM = `You turn a holiday-rental listing into the first version of a guest guide, for the host to review.
Write in the language of the listing. Be accurate: only state what the listing says or what is obviously true for this kind of place.
When something is likely but not stated, phrase it as something for the host to confirm, ending with " (please confirm)".
Never include a street address, door code or key-box code. Keep the host's tone if the listing has one.
Copy what the listing says, in its own wording: house rules, check-in and out, rooms, beds, amenities, rating. Do NOT guess or invent. When the listing is silent on a point, return null for it. The only things you write yourself are the tagline and the welcome text, from facts in the listing. The host will edit every line.
Return ONLY a JSON object, no prose.`;
function prompt(src, town){
  return `Listing link: ${src.url || 'none'}
Town given by the host: ${town || 'not given'}
Page title: ${src.title || ''}
Page description: ${src.description || ''}
Room and bed counts found on the page: ${src.counts || 'none'}
Photos, numbered from 0, with the caption the host gave each one:
${(src.pics || []).map((x, i) => `${i}: ${x.caption || '(no caption)'}`).join('\n') || 'none'}
Listing text:
"""
${(src.text || '').slice(0, 30000)}
"""

Return this JSON (null when unknown):
{
 "placeName": string, "propertyType": one of ["House","Villa","Apartment","Cottage","Farmhouse","Room","Other"],
 "bedrooms": number, "bathrooms": number, "beds": number (only what the page says, else null),
 "photoRooms": array with one entry per numbered photo, in order: the room it shows, chosen from ${JSON.stringify(ROOMS)}, judged from its caption ("Fachada", "Jardín" = Outside or Garden, "Salón", "Comedor" = Living room, "Habitación" = Bedroom). null when the caption does not tell,
 "town": string, "region": string ("Region, Country"), "sleeps": number,
 "checkIn": "HH:MM", "checkOut": "HH:MM",
 "amenities": array chosen only from ${JSON.stringify(AMEN)},
 "guideName": string (usually the place name), "tagline": string (one warm welcome line, max 70 characters),
 "welcome": string (2 or 3 sentences welcoming guests, in the host's voice),
 "houseRules": string (one rule per line, copied from the house rules section: pets, smoking, parties, quiet hours, max guests, other rules. Not the check-in and check-out times),
 "sleeping": string (one line per bedroom or sleeping space with its beds, exactly as the page says, for example "Bedroom 1: 2 single beds"; null when the page gives no arrangement),
 "rating": number (the overall rating shown, null if none), "reviewCount": number,
 "checkoutTasks": string (one task per line, ONLY if the listing states check-out instructions; otherwise null),
 "howTos": string (one line per instruction the listing itself gives about how something works, "Thing: how it works"; otherwise null. Never invent instructions),
 "arrival": string (how to arrive and park, only if the listing says so; null if not said),
 "rubbish": null,
 "interests": array chosen from ["Beaches","Wine and food","Hiking and nature","Culture and history","Local markets","Nightlife","Festivals","Sports","Shopping","Wellness"] that fit the area,
 "guests": array chosen from ["Families with kids","Couples","Groups of friends","Remote workers","Older guests","Guests with pets","Wedding or event guests"],
 "navStyle": one of ["Big tiles, like an app","A simple list","Photo-led, like a magazine"] that fits the listing's style,
 "feelWords": array of up to 3 from ["Cosy","Elegant","Playful","Modern","Rustic","Calm","Local and authentic","Luxurious","Family friendly","Colourful"],
 "sections": object with true/false for ["wifi","rubbish","markets","eat","todo","events"],
 "basis": object saying, for each of "houseRules","sleeping","arrival","checkIn","checkOut","welcome","tagline": "listing" when the listing itself says it, "suggested" when you wrote it (only welcome and tagline),
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
    if (site) {
      src = await readPage(url);
      if (!src || src.text.length < 6000) {
        const alt = await readViaReader(url);
        if (alt && !src) src = alt;
        else if (alt && src) { src.text = (src.facts ? src.text.split('\n\n')[0] + '\n\n' : '') + alt.text; src.counts = src.counts || alt.counts; if (!src.pics.length) { src.pics = alt.pics; src.photos = alt.photos; src.image = src.image || alt.image; } }
      }
    }
  }
  if (!src && text.length < 200) {
    return json({ ok: false, need: 'text', site, message: url && site
      ? 'Your link is right, but the listing site did not let us read it. Copy the text of your listing page and paste it below: everything from the title down to the house rules.'
      : 'Paste the text of your listing: everything from the title down to the house rules.' });
  }
  if (!src) src = { title: '', description: '', text, photos: [], pics: [], counts: '', lat: null, lng: null };
  else if (text) src.text = text + '\n\n' + src.text;
  src.url = url;
  try {
    const draft = await askClaude(src, town);
    return json({ ok: true, source: src.title ? 'page' : 'text', site, draft, photos: src.photos || [], photoRooms: (draft && draft.photoRooms) || [], photoCaps: (src.pics || []).map(x => x.caption), cover: src.image || (src.photos || [])[0] || null, lat: src.lat, lng: src.lng });
  } catch (e) {
    return json({ ok: false, need: 'retry', message: e.message === 'no_key' ? 'The writing assistant is not set up yet. You can still fill in the steps by hand.' : 'Writing your first version took too long. Press the button again.' }, 200);
  }
};
export const config = { path: '/api/listing' };
