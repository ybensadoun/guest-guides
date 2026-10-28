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

const roomOf = n => /bed|dormit|habitaci|chambre|cambra/i.test(n) ? 'Bedroom' : /bath|ba[ñn]o|toilet|salle de bain/i.test(n) ? 'Bathroom' : /kitchen|cocina|cuisine|cuina/i.test(n) ? 'Kitchen' : /living|sal[oó]n|dining|comedor|lounge|\bsala\b|menjador/i.test(n) ? 'Living room' : /pool|piscina/i.test(n) ? 'Pool' : /garden|jard[ií]n|jardí/i.test(n) ? 'Garden' : /patio|porch|balcon|terrace|terraza|veranda/i.test(n) ? 'Terrace' : /laundry|lavander/i.test(n) ? 'Laundry' : /office|study|workspace|despacho/i.test(n) ? 'Office' : /exterior|outside|fachada|entrance|entrada|front/i.test(n) ? 'Outside' : 'Other';
// Airbnb's photo tour and sleeping arrangements are "MediaTour" blocks: stops with a name ("Bedroom 1"), photos and a description ("1 king bed").
function tourStops(blk, cl){
  const ms = [...blk.matchAll(/"__typename":"MediaTourStop","id":"[^"]*","name":"([^"]+)","items":\[/g)];
  return ms.map((m, i) => { const seg = blk.slice(m.index, i + 1 < ms.length ? ms[i + 1].index : m.index + 6000);
    return { name: cl(m[1]), imgs: [...new Set([...seg.matchAll(/"uri":"(https:\/\/a0\.muscache\.com\/im\/pictures\/[^"?]+)"/g)].map(x => x[1]))],
      desc: cl((seg.match(/"descriptions":\[\{"__typename":"LocalizedText","text":"([^"]+)"/) || [])[1] || '') }; });
}

async function readPage(url){
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(7000), headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      'accept-language': 'en-GB,en;q=0.9', accept: 'text/html' } });
    if (!r.ok) return null;
    const html = await r.text();
    const coords = html.match(/"lat(?:itude)?"\s*:\s*(-?\d+\.\d+)\s*,\s*"(?:lng|longitude)"\s*:\s*(-?\d+\.\d+)/);
    const cl = x => x.replace(/\\u0026/g, '&').replace(/\\"/g, '"').replace(/\\u2019/g, '’').replace(/\\n/g, ' ').trim();
    const iv = (k, n) => { const i = html.indexOf(k); return i < 0 ? '' : html.slice(i, i + n); };
    const tourBlk = iv('"mediaTour":{"__typename":"MediaTour"', 150000);
    const tour = tourBlk ? tourStops(tourBlk, cl) : [];
    const sleepAll = iv('"sleepingArrangements":{"__typename":"MediaTour"', 14000);
    const sleepStops = sleepAll ? tourStops(sleepAll.split('"overview":{"__typename":"StaysPdpOverview"')[0], cl) : [];
    const sleepLines = sleepStops.filter(x => x.desc).map(x => x.name + ': ' + x.desc);
    // Airbnb lists every photo with its caption: ..."accessibilityLabel":"Salón","baseUrl":"https://a0.muscache.com/im/pictures/....jpg"
    const seen = new Map();
    for (const m of html.matchAll(/"accessibilityLabel":"([^"]{0,140})","baseUrl":"(https:\/\/a0\.muscache\.com\/im\/pictures\/[^"?]+\.(?:jpe?g|webp))/gi)) { if (!seen.has(m[2])) seen.set(m[2], m[1]); }
    for (const u of (html.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"'\s?\\]+\.(?:jpe?g|webp)/gi) || [])) if (!seen.has(u) && !/\/(user|profile|Hosting|airbnb-platform)/i.test(u)) seen.set(u, '');
    let pics = [...seen.entries()].slice(0, 16).map(([url, caption]) => ({ url, caption }));
    if (tour.length) {   // exact rooms from the host's own photo tour, up to 16 photos spread over the rooms
      const take = tour.map(() => 0), got = []; let more = true;
      for (let r = 0; r < 3 && got.length < 16 && more; r++) { more = false; tour.forEach((st, i) => { if (got.length < 16 && st.imgs[r]) { got.push({ i, r, url: st.imgs[r], caption: st.name, room: roomOf(st.name) }); more = true; } }); }
      pics = got.sort((a, b) => a.i - b.i || a.r - b.r).map(({ url, caption, room }) => ({ url, caption, room }));
    }
    const photos = pics.map(x => x.url);
    // "4 habitaciones · 7 camas · 2 baños": the counts Claude needs for the rooms
    const counts = [...new Set((html.match(/\b\d{1,2}\s(?:bedrooms?|beds?|baths?|bathrooms?|habitaci[oó]n(?:es)?|camas?|ba[ñn]os?|chambres?|lits?|salles? de bains?)\b/gi) || []))].slice(0, 12).join(' · ');
    const strs = (blk) => [...new Set([...blk.matchAll(/"(?:title|subtitle|text|html)":"([^"]{2,220})"/g)].map(m => cl(m[1])))];
    const overview = (iv('"overview":{"__typename":"StaysPdpOverview"', 700).match(/"items":\[([^\]]*)\]/) || [, ''])[1].replace(/"/g, '').split(',').map(x => x.trim()).filter(Boolean);
    const rules = strs(iv('"rules":{"__typename":"StaysPdpRuleDetails"', 6000).split('"__typename":"StaysPdpSection"')[0]).filter(x => !/^Normas de la casa$|trátala como/i.test(x));
    const amenities = [...new Set([...html.matchAll(/"__typename":"AmenityItem","available":true,"title":"([^"]+)"/g)].map(m => cl(m[1])))];
    const sleeping = sleepLines;
    const rt = html.match(/"ratingAverage":([\d.]+),"ratingCount":"?(\d+)/);
    const facts = [overview.length && 'Overview: ' + overview.join(' · '), rules.length && 'House rules section: ' + rules.join(' | '), amenities.length && 'Amenities listed: ' + amenities.join(', '),
      sleeping.length && 'Sleeping arrangements: ' + sleeping.join(' | '), tour.length && 'Photo tour rooms: ' + tour.map(x => x.name + ' (' + x.imgs.length + ' photos)').join(', '), rt && 'Rating: ' + rt[1] + ' from ' + rt[2] + ' reviews'].filter(Boolean).join('\n');
    const text = (facts ? 'FACTS READ FROM THE PAGE DATA:\n' + facts + '\n\n' : '') + htmlToText(html);
    const out = { overview, rules, amenities, sleeping: sleepLines, tourRooms: tour.length, rating: rt ? { avg: +rt[1], count: +rt[2] } : null, title: meta(html, 'og:title'), pageTitle: ((html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '').replace(/&amp;/g, '&').trim(), description: meta(html, 'og:description'), image: meta(html, 'og:image'), photos, pics, counts, facts, text: text.slice(0, 40000),
      lat: coords ? +coords[1] : null, lng: coords ? +coords[2] : null };
    // A blocked or empty page has almost no text and no title.
    if (!out.title && out.text.length < 1500) return null;
    out.via = 'page';
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
    return { via: 'reader', sleeping: [], tourRooms: 0, rating: null, title, description: '', image: pics[0] ? pics[0].url : '', photos: pics.slice(0, 16).map(x => x.url), pics: pics.slice(0, 16), counts, text: text.slice(0, 40000), lat: null, lng: null };
  } catch (e) { return null; }
}

// If the writing assistant fails, what the page states exactly is still filled in, so the host never gets nothing.
function fallbackDraft(src){
  const d = {}; const ov = src.overview || [];
  const num = rx => { const x = ov.find(t => rx.test(t)); const m = x && x.match(/(\d+(?:[.,]5)?)/); return m ? +m[1].replace(',', '.') : null; };
  d.sleeps = num(/viajero|guest|hu[eé]sped|voyageur|gast/i); d.bedrooms = num(/dormitor|bedroom|habitaci|chambre|slaapkamer/i);
  d.beds = num(/\bcamas?\b|\bbeds?\b|\blits?\b/i); d.bathrooms = num(/ba[ñn]o|bath|salle de bain/i);
  // The listing's own name is in the page <title> ("Name - Houses for Rent in Town - Airbnb"). The og:title is a generic line ("Home in Town · ★5.0 · 4 bedrooms").
  const nm = (src.pageTitle || '').split(/\s[-|–]\s/)[0].trim();
  if (nm && !/^(airbnb|home in |room in |entire )/i.test(nm)) d.placeName = nm;
  else if (src.title) d.placeName = src.title.split(/\s[·|]\s|\s[-–]\s/)[0].trim();
  const rules = src.rules || [], tm = rx => { const l = rules.find(x => rx.test(x) && /\d{1,2}[:.h]\d{2}/.test(x)); const m = l && l.match(/(\d{1,2})[:.h](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i); if (!m) return null; let h = +m[1]; if (/p/i.test(m[3] || '') && h < 12) h += 12; if (/a/i.test(m[3] || '') && h === 12) h = 0; return String(h).padStart(2, '0') + ':' + m[2]; };
  d.checkIn = tm(/llegada|check-?in|arriv|arrivée|ankunft|inchecken/i); d.checkOut = tm(/salida|check-?out|d[ée]part|abreise|uitchecken/i);
  const keep = rules.filter(x => x.length > 12 && !/^(llegada y salida|durante tu estancia|otras normas|checking in and out|during your stay|additional rules|arriving and leaving|house rules|normas de la casa|check-in|checkout)$/i.test(x) && !/\d{1,2}[:.h]\d{2}/.test(x));
  if (keep.length) d.houseRules = keep.join('\n');
  if (src.sleeping && src.sleeping.length) d.sleeping = src.sleeping.join('\n');
  if (src.rating) { d.rating = src.rating.avg; d.reviewCount = src.rating.count; }
  return d;
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
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } : {}) },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 3000, system: SYSTEM,
      messages: [{ role: 'user', content: prompt(src, town) }] })
  });
  if (!r.ok) { let body = ''; try { body = (await r.text()).slice(0, 160); } catch (e) {} throw new Error('claude_' + r.status + ' ' + body); }
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
  // Two stages, so the builder shows the guide while Claude writes it (docs/plan-fast-builder.md, step 3): "page" answers
  // at once with what the listing page itself says, plus what was read; "write" gets that back and only asks Claude, so the
  // page is read once. Without a stage, both in one answer, as before.
  const stage = body.stage === 'page' || body.stage === 'write' ? body.stage : '';
  const given = stage === 'write' && body.src && typeof body.src === 'object' && typeof body.src.text === 'string' && JSON.stringify(body.src).length < 600000 ? body.src : null;
  if (given) { src = given; site = (LINK_RX.find(x => x.rx.test(url)) || {}).site || null; }
  else if (url) {
    site = (LINK_RX.find(x => x.rx.test(url)) || {}).site;
    if (!site && !text) return json({ ok: false, need: 'link', message: 'That does not look like a listing page. Open your listing on Airbnb (or Booking, Vrbo) and copy the address from the browser: it looks like airbnb.com/rooms/12345678.' });
    if (site) {
      src = await readPage(url);
      if (!src || src.text.length < 6000) {
        const alt = await readViaReader(url);
        if (alt && !src) src = alt;
        else if (alt && src) { src.via = 'page + reader'; src.text = (src.facts ? src.text.split('\n\n')[0] + '\n\n' : '') + alt.text; src.counts = src.counts || alt.counts; if (!src.pics.length) { src.pics = alt.pics; src.photos = alt.photos; src.image = src.image || alt.image; } }
      }
    }
  }
  if (!src && text.length < 200) {
    return json({ ok: false, need: 'text', site, message: url && site
      ? 'Your link is right, but the listing site did not let us read it. Copy the text of your listing page and paste it below: everything from the title down to the house rules.'
      : 'Paste the text of your listing: everything from the title down to the house rules.' });
  }
  if (!src) src = { via: 'text', sleeping: [], tourRooms: 0, rating: null, title: '', description: '', text, photos: [], pics: [], counts: '', lat: null, lng: null };
  else if (text && !given) src.text = text + '\n\n' + src.text;
  src.url = url;
  if (stage === 'page') return json({ ok: true, stage, site, source: src.title ? 'page' : 'text', title: src.title || '', pageTitle: src.pageTitle || '',
    cover: src.image || (src.photos || [])[0] || null, photos: src.photos || [], photoRooms: (src.pics || []).map(x => x.room || null), photoCaps: (src.pics || []).map(x => x.caption),
    rating: src.rating || null, sleeping: src.sleeping || [], lat: src.lat, lng: src.lng, src });
  {
    let draft, assistant = 'ok', code = '';
    try { draft = await askClaude(src, town); } catch (e) { assistant = 'failed'; code = String((e && e.message) || e).slice(0, 220); draft = fallbackDraft(src); console.error('askClaude failed:', code); }
    if (assistant === 'failed' && !(src.pics || []).length && !(src.overview || []).length && !draft.houseRules) {
      return json({ ok: false, need: 'retry', code, message: code.startsWith('no_key') ? 'The writing assistant is not set up yet. You can still fill in the steps by hand.' : 'The writing assistant did not answer, so we could not read your listing this time. Press the button again, or fill in the steps by hand.' });
    }
    // What the page states exactly is copied as is, not left to the model.
    if (src.sleeping && src.sleeping.length) draft.sleeping = src.sleeping.join('\n');
    if (src.rating) { draft.rating = src.rating.avg; draft.reviewCount = src.rating.count; }
    const photoRooms = (src.pics || []).map((x, i) => x.room || (draft.photoRooms || [])[i] || null);
    const has = k => draft[k] != null && String(draft[k]).trim() !== '' && !(Array.isArray(draft[k]) && !draft[k].length);
    const report = { assistant, code, via: src.via, photos: (src.photos || []).length, roomsFromPage: !!src.tourRooms,
      found: { counts: has('bedrooms') || has('bathrooms') || has('beds'), rules: has('houseRules'), times: has('checkIn') && has('checkOut'), amenities: has('amenities'), sleeping: has('sleeping'), rating: has('rating') } };
    return json({ ok: true, report, source: src.title ? 'page' : 'text', site, draft, amenities: src.amenities || [], photos: src.photos || [], photoRooms, photoCaps: (src.pics || []).map(x => x.caption), cover: src.image || (src.photos || [])[0] || null, lat: src.lat, lng: src.lng });
  }
};
export const config = { path: '/api/listing' };
