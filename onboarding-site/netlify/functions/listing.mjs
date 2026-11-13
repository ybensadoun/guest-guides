// POST /api/listing  { url?, text?, town? }
// 1. Checks the link is a listing page. 2. Tries to read it (Airbnb often blocks servers; then we ask for the text).
// 3. Asks Claude to turn the listing into a first version of every onboarding answer.
// Answer: { ok, draft, source } or { ok:false, need:'text'|'link', message }
const LINK_RX = [
  { site: 'airbnb', rx: /^https?:\/\/([a-z]{2,3}\.)?(www\.)?airbnb\.[a-z.]+\/(rooms\/(plus\/)?\d+|h\/[\w-]+|slink\/\w+)/i },   // slink: the app's share button
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
// The host's own words, which Airbnb's page holds in its data and shows only behind "Show more": the description with its
// parts (The space, Guest access, Other things to note), the rules the host added, and where the page says the house is.
// Without them the listing read knew the rooms and the amenities but not one sentence of the host's (12 Nov 2026: the
// page reader had stopped answering, and the interests, the town and the welcome came back empty or from the facts alone).
// The registration numbers at the end of the description are left out. Exported for worker/test/listing-prompt.test.mjs.
export function pageWords(html){
  const str = x => { try { return JSON.parse('"' + x + '"'); } catch (e) { return ''; } };
  const ugc = (from, n) => { const i = html.indexOf(from), m = i < 0 ? null : html.slice(i, i + n).match(/"localizedStringWithTranslationPreference":"((?:[^"\\]|\\.)*)"/); return m ? str(m[1]) : ''; };
  const lines = t => t.replace(/<br\s*\/?>/gi, '\n').replace(/<b>([^<]*)<\/b>/gi, '$1:').replace(/<[^>]+>/g, ' ').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
  const about = lines(ugc('"longDescriptionHtml"', 60000).split(/<b>[^<]*regist[^<]*<\/b>/i)[0]).slice(0, 6000);
  const extra = lines(ugc('"HOUSE_RULES_ADDITIONAL_RULES"', 12000)).slice(0, 2500);
  const i = html.indexOf('"location":{"__typename":"StaysPdpLocation"'), blk = i < 0 ? '' : html.slice(i, i + 900), one = k => str((blk.match(new RegExp('"' + k + '":"((?:[^"\\\\]|\\\\.)*)"')) || [, ''])[1]).trim();
  const place = blk && (one('locationName') || one('subtitle')) ? { name: one('locationName'), area: one('subtitle') } : null;
  return { about, extra, place };
}
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
    const amenityItems = amenGroups(html);
    const sleeping = sleepLines;
    const rt = html.match(/"ratingAverage":([\d.]+),"ratingCount":"?(\d+)/);
    const { about, extra, place } = pageWords(html);
    const facts = [place && 'Where the page says the house is: ' + [place.area && 'location shown: ' + place.area, place.name && 'town named on its map: ' + place.name].filter(Boolean).join('; '),
      about && 'Description, the host\'s own words:\n' + about, extra && 'Additional rules from the host:\n' + extra, overview.length && 'Overview: ' + overview.join(' · '), rules.length && 'House rules section: ' + rules.join(' | '), amenities.length && 'Amenities listed: ' + amenities.join(', '),
      amenityItems.length > amenities.length && 'Every amenity (the page\'s "Show all" list): ' + amenityItems.map(x => x.t).join(', '),
      sleeping.length && 'Sleeping arrangements: ' + sleeping.join(' | '), tour.length && 'Photo tour rooms: ' + tour.map(x => x.name + ' (' + x.imgs.length + ' photos)').join(', '), rt && 'Rating: ' + rt[1] + ' from ' + rt[2] + ' reviews'].filter(Boolean).join('\n');
    const text = (facts ? 'FACTS READ FROM THE PAGE DATA:\n' + facts + '\n\n' : '') + htmlToText(html);
    const out = { overview, rules, amenities, amenityItems, sleeping: sleepLines, tourRooms: tour.length, rating: rt ? { avg: +rt[1], count: +rt[2] } : null, title: meta(html, 'og:title'), pageTitle: ((html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '').replace(/&amp;/g, '&').trim(), description: meta(html, 'og:description'), image: meta(html, 'og:image'), photos, pics, counts, facts, text: text.slice(0, 40000),
      lat: coords ? +coords[1] : null, lng: coords ? +coords[2] : null, place };
    // thin: the page's text without the host's words read above is short, so the reader is asked too (it has the times).
    out.thin = out.text.length - about.length - extra.length < 6000;
    // A blocked or empty page has almost no text and no title.
    if (!out.title && out.text.length < 1500) return null;
    out.via = 'page';
    return out;
  } catch (e) { return null; }
}

// Every amenity the listing has, not only the 10 its page shows: the "Show all" list is in the page data, by Airbnb's groups.
// The id pdp_v3_<group>_<n>_<listing> carries Airbnb's own code n, the same in every language (scenic views count apart:
// sv<n>). The builder turns codes into its own list (engine/src/amenities.json); the title is kept for any it does not know.
function amenGroups(html){
  const key = '"seeAllAmenitiesGroups":', i = html.indexOf(key + '[');
  if (i < 0) return [];
  let d = 0, k = i + key.length;
  for (; k < html.length && k < i + 400000; k++) { if (html[k] === '[') d++; else if (html[k] === ']' && !--d) break; }
  try {
    return JSON.parse(html.slice(i + key.length, k + 1)).flatMap(g => (g.amenities || []).filter(a => a.available).map(a => {
      const m = /^pdp_v3_(.+?)_(\d+)_\d{6,}/.exec(a.id || '');
      return { c: m ? (m[1] === 'scenic_view' ? 'sv' : '') + m[2] : '', t: String(a.title || '').trim() };
    })).filter(x => x.t).slice(0, 200);
  } catch (e) { return []; }
}

// The reader sometimes lands on another page than the listing (12 Nov 2026: an advertising tracker Airbnb's page sends
// browsers to, "A 1x1 image", with the tracker's address as its title): that is no answer. Exported for the tests.
export function readerIsListing(md, url){
  const site = u => (LINK_RX.find(x => x.rx.test(u)) || {}).site || null;
  const fin = (md.match(/^Final URL:\s*(\S+)/m) || [])[1], title = (md.match(/^Title:\s*(.+)$/m) || [])[1] || '';
  // Nor the listing site's own first page, which the reader sometimes hands back before the listing is there ("Airbnb:
  // Holiday Rentals, Cabins, Beach Houses, Unique Homes & Experiences").
  return !(fin && site(fin) !== site(url)) && !/^https?:\/\//i.test(title.trim()) && !/^(airbnb|booking\.com|vrbo)\s*[:|]/i.test(title.trim());
}
// Airbnb often refuses servers. A public page reader (r.jina.ai) opens the page like a browser and hands back text with the photo links.
// "Check in after 15:00" too: Airbnb's British site writes it in two words (13 Nov 2026).
export const hasTimes = t => /(check[- ]?in|check[- ]?out|llegada|salida|arriv|d[ée]part)[^\n]{0,40}?\d{1,2}(\s?[:.h]\s?\d{2}|\s?[ap]\.?m)/i.test(t || '');
// What the reader is asked: [address, fresh]. For an Airbnb room, the same room on Airbnb's British site, read afresh and
// alone: on 13 Nov 2026 the reader, asked for airbnb.com/rooms/<id>, landed on an advertising tracker five times out of
// five, while the same room on airbnb.co.uk, .es and .fr came back whole eight times out of eight when asked alone, with
// "Check in after 15:00" and "Check out before 12:00" (the page a server gets from Airbnb never has those times: a browser
// loads them afterwards). Asked beside the .com read it came back once as Airbnb's empty first page, so the .com address
// is not asked at all. Any other link: the link twice side by side, the second read afresh, as before (the reader
// sometimes hands back the page before its times are there).
export function readerAsks(url){
  const m = String(url || '').match(/^https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?airbnb\.[a-z.]+\/(rooms\/(?:plus\/)?\d+)/i);
  return m ? [['https://www.airbnb.co.uk/' + m[1], true]] : [[url, false], [url, true]];
}
async function readViaReader(url, fresh = false){
  try {
    const r = await fetch('https://r.jina.ai/' + url, { signal: AbortSignal.timeout(14000), headers: { accept: 'text/plain', 'x-return-format': 'markdown', ...(fresh ? { 'x-no-cache': 'true' } : {}) } });
    if (!r.ok) return null;
    const md = await r.text();
    const seen = new Set(), pics = [];
    for (const m of md.matchAll(/https:\/\/a0\.muscache\.com\/im\/pictures\/(?!airbnb-platform|AirbnbPlatform|user)[^)\s"'?]+\.(?:jpe?g|webp)/gi)) { if (!seen.has(m[0]) && !/\/(profile|Hosting-\d+\/original\/[^/]*profile)/i.test(m[0])) { seen.add(m[0]); pics.push({ url: m[0], caption: '' }); } }
    const text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\n\s*\n+/g, '\n').trim();
    const counts = [...new Set((md.match(/\b\d{1,2}\s(?:bedrooms?|beds?|baths?|bathrooms?|habitaci[oó]n(?:es)?|camas?|ba[ñn]os?|chambres?|lits?|salles? de bains?)\b/gi) || []))].slice(0, 12).join(' · ');
    const title = (md.match(/^Title:\s*(.+)$/m) || [])[1] || '';
    if (!title && text.length < 1500) return null;
    if (!readerIsListing(md, url)) return null;
    return { via: 'reader', sleeping: [], tourRooms: 0, rating: null, title, description: '', image: pics[0] ? pics[0].url : '', photos: pics.slice(0, 16).map(x => x.url), pics: pics.slice(0, 16), counts, text: text.slice(0, 40000), lat: null, lng: null };
  } catch (e) { return null; }
}

// The reader's read of a listing: the asks of readerAsks side by side; a single ask that brought no times (the page's empty
// first state, or nothing) is asked once more. The read with the times first, else the longer; null when none came.
async function readerRead(url){
  const asks = readerAsks(url), alts = (await Promise.all(asks.map(([u, fresh]) => readViaReader(u, fresh)))).filter(Boolean);
  if (asks.length === 1 && !alts.some(a => hasTimes(a.text))) { const again = await readViaReader(asks[0][0], true); if (again) alts.push(again); }
  return alts.sort((a, b) => hasTimes(b.text) - hasTimes(a.text) || b.text.length - a.text.length)[0] || null;
}
// The check-in and check-out times as a listing's page words them, copied, never guessed: { in, out } as HH:MM, '' for
// one that is not stated. A time counts only after the words that announce it ("Check in after 15:00", "Check-in: 3:00 PM
// - 8:00 PM", "Checkout before 11 am", "Llegada a partir de las 15:00", "Départ avant 12:00"), so a rating beside
// "Check-in" (4.9) or a date is never taken for one.
export function timesOf(text){
  const t = String(text || ''), CUE = '(?:\\s*:|\\s+(?:is\\s+)?(?:after|from|between|before|by|until|a partir de(?: las?)?|desde(?: las?)?|antes de(?: las?)?|hasta(?: las?)?|à partir de|avant|jusqu\'à))\\s*';
  const T = '(\\d{1,2})(?:[:.h](\\d{2}))?(?:\\s?([ap])\\.?m\\b)?';   // am or pm only as a whole word: "12:00 and lock up" is noon
  const one = words => { for (const m of t.matchAll(new RegExp('(?:' + words + ')' + CUE + T, 'gi'))) {
    let h = +m[1]; const min = m[2] || '00', p = (m[3] || '').toLowerCase(); if (!m[2] && !p) continue;   // "after 3" alone: not a time of day
    if (p === 'p' && h < 12) h += 12; if (p === 'a' && h === 12) h = 0;
    if (h < 24 && +min < 60) return String(h).padStart(2, '0') + ':' + min; }
    return ''; };
  return { in: one('check[- ]?in|llegada|arriv[ée]e'), out: one('check[- ]?out|salida|d[ée]part') };
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

// The guide is written in the maker's language (the builder sends it: en, es, fr, ca); the lists to choose from stay in English.
const LANG_NAME = { en: 'English', es: 'Spanish', fr: 'French', ca: 'Catalan' };
// The language's own words for the examples, so the model has nothing in another language to copy.
const LANG_EX = {
  en: { confirm: '(please confirm)', rooms: '{"Salón": "Living room", "Dormitorio 2": "Bedroom 2", "Cocina completa": "Full kitchen"}', bed: 'Bedroom 1: 2 single beds' },
  es: { confirm: '(por confirmar)', rooms: '{"Living room": "Salón", "Bedroom 2": "Dormitorio 2", "Dormitori 3": "Dormitorio 3", "Cocina completa": "Cocina completa"}', bed: 'Dormitorio 1: 2 camas individuales' },
  ca: { confirm: '(per confirmar)', rooms: '{"Salón": "Sala d’estar", "Dormitorio 2": "Dormitori 2", "Cocina completa": "Cuina completa", "Baño completo 1": "Bany complet 1", "Living room": "Sala d’estar"}', bed: 'Dormitori 1: 2 llits individuals' },
  fr: { confirm: '(à confirmer)', rooms: '{"Salón": "Salon", "Dormitorio 2": "Chambre 2", "Cocina completa": "Cuisine équipée", "Living room": "Salon"}', bed: 'Chambre 1 : 2 lits simples' }
};
const system = lang => `You turn a holiday-rental listing into the first version of a guest guide, for the host to review.
LANGUAGE: write every text value in ${LANG_NAME[lang]}${lang === 'en' ? '' : ` (${{ es: 'español', ca: 'català', fr: 'français' }[lang]})`}, whatever the language of the listing: translate what it says${lang === 'ca' ? ', Spanish included' : lang === 'es' ? ', Catalan and English included' : ''}, and keep only the names of the house and of places as they are. Never mix two languages in one text. Only the values chosen from the lists given below stay exactly as they are written there, in English. Be accurate: only state what the listing says or what is obviously true for this kind of place.
When something is likely but not stated, phrase it as something for the host to confirm, ending with " ${LANG_EX[lang].confirm}".
Never include a street address, door code or key-box code, and never tell guests to contact, call or message the host. Keep the host's tone if the listing has one.
Copy what the listing says, in its own wording (translated into ${LANG_NAME[lang]} when it is in another language): house rules, check-in and out, rooms, beds, amenities, rating. Do NOT guess or invent. When the listing is silent on a point, return null for it. The only things you write yourself are the tagline and the welcome text, from facts in the listing. The host will edit every line.
Before answering, check every text value: each one in ${LANG_NAME[lang]} only, the house rules and the sleeping arrangements too.
Return ONLY a JSON object, no prose.`;
// What Claude is asked for a listing (exported for worker/test/listing-prompt.test.mjs; Netlify uses only the default export and config).
export function prompt(src, town, lang){
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
 "roomNames": object with one entry per different caption of the photos above: the caption as it is, then its name in ${LANG_NAME[lang]} (${LANG_EX[lang].rooms}; a caption already in ${LANG_NAME[lang]} stays as it is). Only captions that name a room or part of the house,
 "photoRooms": array with one entry per numbered photo, in order: the room it shows, chosen from ${JSON.stringify(ROOMS)}, judged from its caption ("Fachada", "Jardín" = Outside or Garden, "Salón", "Comedor" = Living room, "Habitación" = Bedroom). null when the caption does not tell,
 "town": string, "region": string ("Region, Country"), "sleeps": number,
 "checkIn": "HH:MM", "checkOut": "HH:MM",
 "amenities": array chosen only from ${JSON.stringify(AMEN)},
 "guideName": string (usually the place name), "tagline": string (one warm welcome line in ${LANG_NAME[lang]}, max 70 characters),
 "welcome": string (2 or 3 sentences in ${LANG_NAME[lang]} welcoming guests, in the host's voice),
 "houseRules": string (one rule per line, from the house rules section, in ${LANG_NAME[lang]}: pets, smoking, parties, quiet hours, max guests, other rules. Not the check-in and check-out times),
 "sleeping": string (one line per bedroom or sleeping space with its beds, as the page says, in ${LANG_NAME[lang]}, shaped like "${LANG_EX[lang].bed}"; null when the page gives no arrangement),
 "listingAmenities": array of strings (every item of "Amenities listed", in English whatever the language asked above, in the same order; empty when the page lists none),
 "rating": number (the overall rating shown, null if none), "reviewCount": number,
 "checkoutTasks": string (one task per line, ONLY if the listing states check-out instructions; otherwise null),
 "howTos": string (one line per instruction the listing itself gives about how something works, "Thing: how it works"; otherwise null. Never invent instructions),
 "arrival": string (how to arrive and park, in ${LANG_NAME[lang]}, only if the listing says so; null if not said),
 "rubbish": null,
 "interests": array chosen from ["Beaches","Wine and food","Hiking and nature","Culture and history","Local markets","Nightlife","Festivals","Sports","Shopping","Wellness"]: only what guests go out for in the area AND the listing's own words name (a beach or the sea for Beaches, vineyards or wineries for Wine and food, walks or a natural park for Hiking and nature, a historic town or monuments for Culture and history, markets for Local markets, bars or clubs for Nightlife, festivals for Festivals, a sport to do nearby for Sports, shops for Shopping, a spa or thermal baths outside the house for Wellness). Never from what you know of the region, and never from the house's own amenities: a pool, a hot tub or a sauna at the house is not Wellness, a kitchen is not Wine and food. An empty array when the listing names none of them,
 "guests": array chosen from ["Families with kids","Couples","Groups of friends","Remote workers","Older guests","Guests with pets","Wedding or event guests"]: only the guests the listing itself points to, by its words or what it offers (kids or a cot for Families with kids, a stay for two for Couples, a group for Groups of friends, a workspace for Remote workers, step-free access for Older guests, pets allowed for Guests with pets, weddings or events for Wedding or event guests). Never from what you know of the region. An empty array when it says nothing about who stays,
 "navStyle": one of ["Big tiles, like an app","A simple list","Photo-led, like a magazine"] that fits the listing's style,
 "feelWords": array of up to 3 from ["Cosy","Elegant","Playful","Modern","Rustic","Calm","Local and authentic","Luxurious","Family friendly","Colourful"],
 "basis": object saying, for each of "houseRules","sleeping","arrival","checkIn","checkOut","welcome","tagline": "listing" when the listing itself says it, "suggested" when you wrote it (only welcome and tagline),
 "toConfirm": array of short questions the host should answer that the listing does not cover (max 6). Never ask about something the listing states: an amenity in "Amenities listed" or "Every amenity", the rules, the times, the rooms or the beds
}`;
}
async function askClaude(src, town, lang){
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('no_key');
  // A 5.x model thinks first: room for that, and a low effort so the answer comes within the function's time.
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', v5 = /^claude-\w+-5/.test(model);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(24000),
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } : {}) },
    body: JSON.stringify({ model, max_tokens: v5 ? 16000 : 4000, ...(v5 ? { output_config: { effort: 'low' } } : {}), system: system(lang),
      messages: [{ role: 'user', content: prompt(src, town, lang) }] })
  });
  if (!r.ok) { let body = ''; try { body = (await r.text()).slice(0, 160); } catch (e) {} throw new Error('claude_' + r.status + ' ' + body); }
  const d = await r.json();
  const t = (d.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('');
  if (!t.includes('{')) throw new Error('no_json ' + (d.stop_reason || ''));
  const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  return JSON.parse(j);
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, message: 'POST only' }, 405);
  let body; try { body = await req.json(); } catch (e) { return json({ ok: false, message: 'Bad request' }, 400); }
  const url = String(body.url || '').trim(), text = String(body.text || '').trim(), town = String(body.town || '').trim(), lang = LANG_NAME[body.lang] ? body.lang : 'en';
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
      // The reader's read is slow (5 to 17 s measured, 13 Nov 2026). The first answer of the two stages ("page") no longer
      // waits for it when the page itself was read with its photos: the builder shows the guide at once, and the times,
      // the one thing only the reader's read has, are fetched while Claude writes (stage "write", below). Without stages,
      // or when the page gave nothing, as before: the reader's text joins the page's.
      if (stage === 'page' ? !src || !(src.pics || []).length : !src || (src.thin != null ? src.thin : src.text.length < 6000)) {
        const alt = await readerRead(url);
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
    rating: src.rating || null, sleeping: src.sleeping || [], amenityItems: src.amenityItems || [], lat: src.lat, lng: src.lng, src });
  {
    let draft, assistant = 'ok', code = '';
    // The times, when the text in hand has none (the page a server gets never has them): the reader is asked while Claude
    // writes, and what it states is copied into the answers Claude left empty (timesOf). A reader that fails costs nothing.
    const timesP = site && url && !hasTimes(src.text) ? readerRead(url).then(a => a ? timesOf(a.text) : null).catch(() => null) : null;
    try { draft = await askClaude(src, town, lang); } catch (e) { assistant = 'failed'; code = String((e && e.message) || e).slice(0, 220); draft = fallbackDraft(src); console.error('askClaude failed:', code); }
    if (assistant === 'failed' && !(src.pics || []).length && !(src.overview || []).length && !draft.houseRules) {
      return json({ ok: false, need: 'retry', code, message: code.startsWith('no_key') ? 'The writing assistant is not set up yet. You can still fill in the steps by hand.' : 'The writing assistant did not answer, so we could not read your listing this time. Press the button again, or fill in the steps by hand.' });
    }
    // What the page states exactly is kept when the model gave none; it comes back in English otherwise.
    if (src.sleeping && src.sleeping.length && !draft.sleeping) draft.sleeping = src.sleeping.join('\n');
    if (src.rating) { draft.rating = src.rating.avg; draft.reviewCount = src.rating.count; }
    const tm = timesP ? await timesP : null;
    if (tm) for (const [k, v] of [['checkIn', tm.in], ['checkOut', tm.out]]) if (v && !String(draft[k] || '').trim()) { draft[k] = v; draft.basis = { ...(draft.basis || {}), [k]: 'listing' }; }
    // The town and the region as the page states them (its map's town; the last two parts of the location shown).
    if (src.place && !String(draft.town || '').trim() && src.place.name) draft.town = src.place.name;
    if (src.place && !String(draft.region || '').trim() && src.place.area) { const p = src.place.area.split(',').map(x => x.trim()).filter(Boolean); draft.region = p.slice(-2).join(', '); }
    const photoRooms = (src.pics || []).map((x, i) => x.room || (draft.photoRooms || [])[i] || null);
    const has = k => draft[k] != null && String(draft[k]).trim() !== '' && !(Array.isArray(draft[k]) && !draft[k].length);
    const report = { assistant, code, via: src.via, photos: (src.photos || []).length, roomsFromPage: !!src.tourRooms,
      found: { counts: has('bedrooms') || has('bathrooms') || has('beds'), rules: has('houseRules'), times: has('checkIn') && has('checkOut'), amenities: has('amenities') || !!(src.amenityItems || []).length, sleeping: has('sleeping'), rating: has('rating') } };
    return json({ ok: true, report, source: src.title ? 'page' : 'text', site, draft, amenities: (draft.listingAmenities || []).length ? draft.listingAmenities : src.amenities || [], amenityItems: src.amenityItems || [], photos: src.photos || [], photoRooms, photoCaps: (src.pics || []).map(x => x.caption), cover: src.image || (src.photos || [])[0] || null, lat: src.lat, lng: src.lng });
  }
};
export const config = { path: '/api/listing' };
