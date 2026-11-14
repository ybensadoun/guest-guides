/* ---------- Once the guide exists: the same steps edit the guide itself ----------
   A guide built from the answers, or imported like Ca La Kimberly, opens in the same pages as the onboarding
   (groups, tiles, rail, bottom bar), but each step shows and changes the guide's own content and look.
   Changes save as a draft (guides.draft) that guests never see: Preview shows it to the host, "Publish changes"
   makes it live. Plan and rules: docs/plan-single-editor.md */
const CM = { on: false, g: null, live: null, lang: 'en', timer: null, marks: null, saving: null, again: false, open: new Set(), chg: new Set(), kpick: new Set(), kq: new Map(), kidsHand: new Set() };
const ED_LANGS = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const ED_DAYS = [['mon', 'Mo'], ['tue', 'Tu'], ['wed', 'We'], ['thu', 'Th'], ['fri', 'Fr'], ['sat', 'Sa'], ['sun', 'Su']];
const ED_FONTS = [['jost', 'Jost'], ['inter', 'Inter'], ['cormorant-garamond', 'Cormorant Garamond'], ['dm-sans', 'DM Sans'], ['dm-serif-display', 'DM Serif Display', [400]], ['fraunces', 'Fraunces'], ['geist', 'Geist'], ['instrument-serif', 'Instrument Serif', [400]], ['nunito', 'Nunito'], ['outfit', 'Outfit'], ['space-grotesk', 'Space Grotesk'], ['bricolage-grotesque', 'Bricolage Grotesque']];
// The five roles of a colour world (engine/src/worlds.js), as "Fine-tune each colour" offers them: role, its token, its name.
const ED_ROLES = [['deep', '--blue', 'Main colour'], ['strong', '--red', 'Emergencies'], ['fresh', '--green', 'Open now'], ['light', '--yellow', 'Light tiles'], ['warm', '--orange', 'Warm tiles']];
const ED_SEC = { transport: ['Getting around', 'Taxis, train stations and bus stops.'], house: ['The house page', 'Photos, rooms and what the house offers.'], garbage: ['Rubbish and recycling', 'Which bin goes out tonight.'], message: ['House guide', 'How everything works, room by room.'], emergency: ['Emergency contacts', '112, health, police, town services.'], quick: ['Home tiles', 'One tap for a taxi, the station, a favourite.'], markets: ['Local markets', 'Street, covered and flea markets, with what is on today.'], restaurants: ['Eat and drink', 'Restaurants, cafés and bars you send friends to.'], todo: ['Attractions', 'Museums, parks, activities and sights nearby.'], nightlife: ['Nightlife', 'Late bars, clubs and live music you recommend.'], events: ['Local events', 'Festivals, fairs and traditions during the stay.'], reviews: ['Ratings and reviews', 'Your listing rating and reviews.'], map: ['Map', 'Every place in the guide on one map.'] };

const edIs18 = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => k in ED_LANGS);
const edPath = s => s.split('/').map(k => /^\d+$/.test(k) ? +k : k);
const edGet = (o, p) => p.reduce((a, k) => a == null ? a : a[k], o);
function edSet(o, p, val) { let a = o; for (let i = 0; i < p.length - 1; i++) { if (a[p[i]] == null) a[p[i]] = typeof p[i + 1] === 'number' ? [] : {}; a = a[p[i]]; } a[p[p.length - 1]] = val; }
const edShown = o => { const x = o && (o[CM.lang] != null ? o[CM.lang] : o.en); return x == null ? '' : x; };
const edC = () => CM.g.content;
const edF = () => edC().files = edC().files || {};
const edLangs = () => ((edC().site || {}).languages || ['en']).filter(l => l in ED_LANGS);
const edImg = n => /^https?:/.test(n) ? n : (edC().assetBase || '') + n;
const cmClone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
const cmCanon = x => Array.isArray(x) ? x.map(cmCanon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, cmCanon(x[k])])) : x;
const cmSame = (a, b) => JSON.stringify(cmCanon(a)) === JSON.stringify(cmCanon(b));
const cmW = () => ({ content: CM.g.content, theme: CM.g.theme });
// What guests see, to tell a change: a place's "Is it still open?" note (look, lkHTML) is the host's answer to us, never a
// change to publish (the draft still keeps it: cmSave compares the whole; the monthly check reads ok in either copy).
const cmNoLook = x => Array.isArray(x) ? x.map(cmNoLook) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k, v]) => !(k === 'look' && v && Array.isArray(v.why))).map(([k, v]) => [k, cmNoLook(v)])) : x;
const cmSameShown = (a, b) => cmSame(cmNoLook(a), cmNoLook(b));
const cmChanged = m => m.paths.some(p => { const q = edPath(p); return !cmSameShown(edGet(cmW(), q), edGet(CM.live, q)); });
const cmDirty = () => !cmSameShown(cmW(), CM.live);
const cmLive = () => CM.g.status === 'published';
const cmOnSec = id => ((edC().site || {}).modules || {})[id] !== false;
const cmLiveUrl = () => { const n = (edC().site || {}).netlify; return n && n.project ? `https://${n.project}.netlify.app` : `${location.origin}/g/${CM.g.slug}`; };
const cmPreviewUrl = () => `${location.origin}/g/${encodeURIComponent(CM.g.slug)}?preview`;
const cmId = p => 'c_' + p.replace(/[^a-zA-Z0-9]+/g, '_');
const cmCount = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const aAn = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const cmLen = p => (edGet(edC(), edPath(p)) || []).length;

/* --- The steps once the guide exists: same groups, colours and shapes as the onboarding steps --- */
const CSTEPS = [
  { id: 'guide', group: 'basics', title: 'Name and languages', sub: 'What guests see', icon: 'tag', tc: 'var(--sun)', ti: '#1b1407', sh: 'var(--tomato)', shape: 'half', lang: true,
    lead: 'The name on the guide and on guests’ phones, the text under a shared link and the languages.',
    paths: ['content/site/name', 'content/site/description', 'content/site/shareDescription', 'content/site/languages', 'content/files/house/name', 'content/files/house/listing'], body: c => cmGuide(c) },
  { id: 'look', group: 'basics', title: 'The look', sub: 'Logo, cover, colours', icon: 'eye', tc: 'var(--tomato)', sh: 'var(--ink)', shape: 'tri',
    lead: 'Three steps: your logo, the cover picture and the colours. Preview shows the result before guests see it.',
    paths: ['theme', 'content/site/theme', 'content/site/logo', 'content/site/icons', 'content/files/house/cover', 'content/files/house/photo'], body: c => cmLook(c) },
  { id: 'sections', group: 'basics', title: 'Guide sections', sub: 'What goes in', icon: 'grid', tc: 'var(--ink)', ti: '#fff', sh: 'var(--sky)', shape: 'square',
    lead: 'A section you switch off disappears from the guide, its page and the map. Its step here goes too, until you switch it back on.',
    paths: ['content/site/modules'], body: c => cmSections(c) },
  { id: 'housepage', group: 'house', sec: 'house', when: c => !!(c.files || {})['house-page'], title: 'The house page', sub: 'Photos, rooms, amenities', icon: 'cam', tc: 'var(--sky)', ti: '#fff', sh: 'var(--sun)', shape: 'quarter', lang: true,
    lead: 'What guests see about the house itself: the summary, highlights, beds, amenities and photos by room.',
    paths: ['content/files/house-page'], body: c => cmHousePage(c) },
  { id: 'howto', group: 'house', sec: 'message', when: c => !!(c.files || {}).message, title: 'House guide', sub: c => cmCount((((c.files || {}).message || {}).blocks || []).length, 'part', 'parts'), icon: 'tool', tc: 'var(--clay)', ti: '#fff', sh: 'var(--ink)', shape: 'bar', lang: true,
    lead: 'How everything works, one part per room or topic. Open a part to change its lines and photos.',
    paths: ['content/files/message', 'content/files/house/checkout'], body: c => cmHouseGuide(c) },
  { id: 'wifi', group: 'house', title: 'Wi-Fi', sub: 'Name and password', icon: 'wifi', tc: 'var(--pine)', ti: '#fff', sh: 'var(--tomato)', shape: 'half', lang: true,
    lead: 'Guests join with one tap: the guide makes the QR code from the name and password.',
    paths: ['content/private/wifi'], body: c => cmWifi(c) },
  { id: 'rubbish', group: 'practical', sec: 'garbage', when: c => !!(c.files || {}).garbage, title: 'Rubbish', sub: 'Bins and days', icon: 'bin', tc: 'var(--sky)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Which bin goes out on which evening, the containers guests can use, and how to sort.',
    paths: ['content/files/garbage'], body: c => cmRubbish(c) },
  { id: 'contacts', group: 'practical', sec: 'emergency', when: c => !!(c.files || {}).emergency, title: 'Contacts', sub: 'Emergency and services', icon: 'phone', tc: 'var(--tomato)', ti: '#fff', sh: 'var(--ink)', shape: 'tri', lang: true,
    lead: 'Numbers and places guests may need: emergencies, health, police, town services.',
    paths: ['content/files/emergency'], body: c => cmContacts(c) },
  { id: 'transport', group: 'practical', sec: 'transport', title: 'Getting around', sub: c => cmTrSub(c), icon: 'train', tc: 'var(--pine)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Taxis, train stations and bus stops, on their own page in the guide. Show it as a tile on the home page too if you like.',
    paths: ['content/files/transport'], body: c => cmTransport(c) },
  { id: 'tiles', group: 'practical', sec: 'quick', title: 'Home tiles', sub: c => cmCount(cmLen('files/quick/items'), 'tile', 'tiles'), icon: 'star', tc: 'var(--sun)', ti: '#1b1407', sh: 'var(--sky)', shape: 'square', lang: true,
    lead: 'One tap from the home page: the bar next door, a shop you love. Each tile opens a page with its map and your words.',
    paths: ['content/files/quick'], body: c => cmHomeTiles(c) },
  { id: 'todo', group: 'area', sec: 'todo', title: 'Attractions', sub: c => cmCount(cmLen('files/todo/items'), 'place', 'places'), icon: 'compass', tc: 'var(--pine)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Places guests go to visit or to do something: museums, castles, theme parks, karting, beaches, nature. Restaurants and bars go in Eat and drink. Open a place to change its words, links, position and opening hours.',
    paths: ['content/files/todo'], body: () => cmPlaces('files/todo/items', 'place') },
  { id: 'restaurants', group: 'area', sec: 'restaurants', when: c => !!(c.files || {}).restaurants, title: 'Eat and drink', sub: c => cmCount(cmLen('files/restaurants/items'), 'place', 'places'), icon: 'heart', tc: 'var(--tomato)', ti: '#fff', sh: 'var(--sun)', shape: 'half', lang: true,
    lead: 'Restaurants, cafés, bakeries and bars you send friends to, with a few words from you: what to order, when to go. Late bars and clubs go in Nightlife.',
    paths: ['content/files/restaurants'], body: () => cmPlaces('files/restaurants/items', 'place') },
  // Nightlife: optional (Guide sections), the host's own list; its section is made with the first place (cmNightEnsure)
  { id: 'nightlife', group: 'area', sec: 'nightlife', when: c => ((c.site || {}).modules || {}).nightlife === true || !!(c.files || {}).nightlife, title: 'Nightlife', sub: c => cmCount(cmLen('files/nightlife/items'), 'place', 'places'), icon: 'moon', tc: 'var(--ink)', ti: '#fff', sh: 'var(--sun)', shape: 'half', lang: true,
    lead: 'Late bars, cocktail bars, clubs and live music: where you send friends for the evening and the night, with a few words from you. We add none of our own.',
    paths: ['content/files/nightlife'], body: () => cmPlaces('files/nightlife/items', 'place') },
  { id: 'markets', group: 'area', sec: 'markets', title: 'Local markets', sub: c => cmCount(cmLen('files/markets/markets'), 'market', 'markets'), icon: 'bag', tc: 'var(--clay)', ti: '#fff', sh: 'var(--pine)', shape: 'circle', lang: true,
    lead: 'Weekly street markets, covered food markets, flea and antiques markets nearby. The guide shows which ones are on today from the days and hours here.',
    paths: ['content/files/markets'], body: () => cmPlaces('files/markets/markets', 'market') },
  { id: 'events', group: 'area', sec: 'events', title: 'Local events', sub: c => cmCount(cmLen('files/events/items'), 'event', 'events'), icon: 'kite', tc: 'var(--plum)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Festivals, fairs, concerts and local traditions, with their dates. Guests see the ones during their stay.',
    paths: ['content/files/events'], body: () => cmPlaces('files/events/items', 'event') }
];
const cmSteps = () => CSTEPS.filter(m => (!m.sec || cmOnSec(m.sec)) && (!m.when || m.when(edC())));
const cmSub = m => typeof m.sub === 'function' ? m.sub(edC()) : m.sub;

/* --- Fields, in the onboarding's own markup (.f, .chips, .btn) --- */
function cf(label, path, obj, o = {}) {
  const isI = edIs18(obj) || (o.i18n && (obj == null || (typeof obj === 'object' && !Array.isArray(obj)))), num = o.type === 'number';
  const val = isI ? edShown(obj || {}) : (obj == null ? '' : obj), id = cmId(path);
  const a = `id="${id}" data-p="${esc(path)}" data-t="${isI ? 'i18n' : num ? 'num' : 'str'}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}`;
  const inp = o.long ? `<textarea ${a} rows="${o.rows || 3}">${esc(val)}</textarea>` : `<input type="${o.type || 'text'}"${num ? ' step="any" inputmode="decimal"' : ''}${o.type === 'url' ? ' inputmode="url"' : ''} ${a} value="${esc(val)}">`;
  return `<div class="f${o.half ? '' : ' full'}"><label for="${id}">${esc(label)}</label>${o.hint ? `<p class="hint">${esc(o.hint)}</p>` : ''}${inp}</div>`;
}
// An on/off setting: a switch with its state written next to it, so it is clear whether it is on.
const cSwitch = (attrs, label, on, hint = '') => `<div class="cm-swrow"><button type="button" class="cm-switch" role="switch" aria-checked="${!!on}" ${attrs}><span class="cm-sw-track" aria-hidden="true"><span class="cm-sw-knob"></span></span><span class="cm-sw-label">${esc(label)}</span><span class="cm-sw-state" aria-hidden="true">${on ? 'On' : 'Off'}</span></button>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
const cDays = (path, days) => ED_DAYS.map(([d, l]) => `<button class="chip" type="button" data-daytog="${esc(path)}" data-d="${d}" aria-pressed="${(days || []).includes(d)}"><span>${l}</span></button>`).join('');
function cSchedule(path, arr, season = false, weeks = false, own = '') {   // season: each row says whether it is only part of the year (places, markets); weeks: and which weeks of the month (markets); own: what stands above the Add button while there is no row (a place's own season, plSeason)
  return `<div class="f full"><span class="lab">Opening days and hours</span><div class="cm-sch">${(arr || []).map((r, k) => `<div class="cm-sr"><div class="cm-dayrow"><div class="chips" role="group" aria-label="Days">${cDays(`${path}/${k}`, r.days)}</div><button class="cm-x" type="button" data-cdel="${path}/${k}" data-now="1" aria-label="Remove these hours">×</button></div>
    <div class="cm-times"><input type="time" aria-label="Opens" data-p="${path}/${k}/open" data-t="str" value="${esc(r.open || '')}"><span>to</span><input type="time" aria-label="Closes" data-p="${path}/${k}/close" data-t="str" value="${esc(r.close || '')}"></div>
    ${season ? plSeason(`${path}/${k}`, r, weeks) : r.from || r.to ? `<p class="hint">Only from ${esc(r.from || '?')} to ${esc(r.to || '?')} (month-day).</p>` : ''}</div>`).join('')}
    ${(arr || []).length ? '' : own}<button class="btn small" type="button" data-addsch="${path}">+ Add opening hours</button></div></div>`;
}
function cDates(path, arr) {
  return `<div class="f full"><span class="lab">Dates</span><div class="cm-sch">${(arr || []).map((r, k) => `<div class="cm-sr"><div class="cm-dates"><label><span class="hint">Starts</span><input type="date" data-p="${path}/${k}/start" data-t="str" value="${esc(r.start || '')}"></label><label><span class="hint">Ends</span><input type="date" data-p="${path}/${k}/end" data-t="str" value="${esc(r.end || '')}"></label></div>
    <span class="hint">Start and end time, if you know them</span><div class="cm-times"><input type="time" aria-label="Starts at" data-p="${path}/${k}/time" data-t="str" value="${esc(r.time || '')}"><span>to</span><input type="time" aria-label="Ends at" data-p="${path}/${k}/until" data-t="str" value="${esc(r.until || '')}"></div>
    <div class="cm-dayrow"><select aria-label="Confirmed or expected" data-p="${path}/${k}/status" data-t="str"><option value="expected"${r.status !== 'confirmed' ? ' selected' : ''}>Expected</option><option value="confirmed"${r.status === 'confirmed' ? ' selected' : ''}>Confirmed</option></select><button class="cm-x" type="button" data-cdel="${path}/${k}" data-now="1" aria-label="Remove these dates">×</button></div></div>`).join('')}
    <button class="btn small" type="button" data-adddate="${path}">+ Add dates</button></div></div>`;
}
function cLines(path, arr, add) {
  return `<div class="cm-lines">${(arr || []).map((it, j) => `<div class="cm-line"><textarea id="${cmId(path + '/' + j)}" data-p="${path}/${j}" data-t="i18n" rows="2" aria-label="Line ${j + 1}">${esc(edShown(it))}</textarea><button class="cm-x" type="button" data-cdel="${path}/${j}" data-now="1" aria-label="Delete line ${j + 1}">×</button></div>`).join('')}</div>
    <button class="btn small cm-add" type="button" data-add="${path}">+ ${esc(add)}</button>`;
}
function cPhotos(path, arr) {
  return `${(arr || []).length ? `<div class="thumbs">${arr.map((n, i) => `<div class="thumb"><img src="${esc(edImg(n))}" alt="" loading="lazy"><div class="cm-phb"><button class="btn small" type="button" data-phmove="${path}/${i}" data-dir="-1" aria-label="Move earlier">‹</button><button class="btn small" type="button" data-phmove="${path}/${i}" data-dir="1" aria-label="Move later">›</button></div><button class="x" type="button" data-cdel="${path}/${i}" data-now="1" aria-label="Remove photo ${i + 1}">×</button></div>`).join('')}</div>` : ''}
    <label class="btn small cm-file"><input class="sr" type="file" accept="image/*" multiple data-phadd="${path}">+ Add photos</label>`;
}
function cCard(p, title, meta, inner, order, lead = '', note = '') {   // note: quiet lines under the row's meta, one or a list, each words or { t: words, c: class } (a place hidden from guests for the season; is it still open, lkNote)   // lead: what goes before the name in the row (a place's kind)   // order: [this card's place, how many there are], for a list the host can put in order
  const mv = order ? `<div class="cm-ord"><button type="button" data-cardmove="${esc(p)}" data-dir="-1" aria-label="Move ${esc(title)} up"${order[0] ? '' : ' disabled'}>↑</button><button type="button" data-cardmove="${esc(p)}" data-dir="1" aria-label="Move ${esc(title)} down"${order[0] < order[1] - 1 ? '' : ' disabled'}>↓</button></div>` : '';
  return `<details class="cmi" data-open="${esc(p)}"${CM.open.has(p) ? ' open' : ''}><summary>${lead}<span><b>${esc(title)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}${[].concat(note || []).filter(Boolean).map(x => `<small class="pl-hid${x.c ? ' ' + x.c : ''}">${esc(x.t || x)}</small>`).join('')}</span>${mv}<i class="chev" aria-hidden="true"></i></summary><div class="cmb">${inner}</div></details>`;
}

/* --- One place, contact or tile: its texts, links, position, hours or dates --- */
const C_SKIP = new Set(['id', 'from', 'icon', 'tone', 'group', 'category', 'cat', 'tags', 'flags', 'gid', 'checked', 'utility', 'always', 'wiki', 'hoursSource', 'topPick', 'rating', 'setMenus', 'sources', 'dates', 'schedule', 'lat', 'lng', 'km_from_house', 'wide', 'verify', 'alt', 'trains', 'bins', 'link', 'qr', 'stalls_approx', 'pos', 'filled', 'season', 'look']);   // filled: where a place's facts came from, said under "Filled in for you", never a field; season: a place's own part of the year (plSeason); look: the monthly check's note (lkHTML)
const C_STR = ['town', 'place', 'phone', 'web', 'url', 'map', 'gmaps', 'venue', 'address', 'comarca', 'price'];
const C_LONG = ['description', 'what', 'examples', 'priceNote', 'hours', 'occasional_when'];
const C_LBL = { name: 'Name', name_local: 'Name in the local language', title: 'Title on its page', sub: 'Line under the name', type: 'Type', kind: 'Kind', what: 'What guests need to know', description: 'Description', hours: 'Opening hours, in words', occasional_when: 'When it runs', town: 'Town', place: 'Where exactly', venue: 'Where exactly', address: 'Address', comarca: 'County', phone: 'Phone', url: 'Official website', web: 'Website', gmaps: 'Google Maps link', map: 'Map link', price: 'Price (€)', priceNote: 'About the price', taxiName: 'Taxi name', taxiSub: 'Line under the taxi' };
const C_ORDER = ['name', 'name_local', 'title', 'sub', 'type', 'kind', 'what', 'description', 'hours', 'occasional_when', 'town', 'place', 'venue', 'address', 'comarca', 'phone', 'url', 'web', 'gmaps', 'map', 'price', 'priceNote'];
const cLabel = k => C_LBL[k] || k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, x => x.toUpperCase());
const cName = it => edShown(it.name) || edShown(it.title) || edShown(it.where) || (it.id && !String(it.id).startsWith('custom-') ? it.id : 'New');
function cItem(base, it, i, what) {
  if (PL_SEC[base]) return cPlace(base, it, i);
  if (base === MK_PATH) return cMarket(base, it, i);
  const p = `${base}/${i}`, ord = k => { const n = C_ORDER.indexOf(k); return n < 0 ? 99 : n; };
  const keys = Object.keys(it).filter(k => !C_SKIP.has(k) && !k.startsWith('_') && (edIs18(it[k]) || (C_STR.includes(k) && typeof it[k] === 'string'))).sort((a, b) => ord(a) - ord(b));
  const km = cKm(it);
  const meta = [typeof it.town === 'string' ? it.town : '', km, (it.flags || []).includes('check') ? 'check before going' : '', it.auto ? 'added automatically' : ''].filter(Boolean).join(' · ');
  const { find, pin, first } = cWhere(p, it);
  const check = Array.isArray(it.flags) || what !== 'contact' ? cSwitch(`data-cflag="${p}" data-f="check"`, 'Check before going', (it.flags || []).includes('check'), 'Tells guests to check the hours or the dates before they go.') : '';
  const ev = base === EV_PATH, kr = ev ? evKind(p, it) : '';   // an event's kind: one line right under its name
  return cCard(p, cName(it), meta, `<div class="grid">${first ? find : ''}${keys.includes('name') ? '' : kr}${keys.map(k => cf(cLabel(k), `${p}/${k}`, it[k], cOpt(it, k)) + (k === 'name' ? kr : '')).join('')}
    ${'stalls_approx' in it ? cf('Stalls (about)', `${p}/stalls_approx`, it.stalls_approx, { type: 'number', half: true }) : ''}${first ? '' : find}${pin}
    ${'schedule' in it || base.includes('markets') ? cSchedule(`${p}/schedule`, it.schedule) : ''}${'dates' in it || base.includes('events') ? cDates(`${p}/dates`, it.dates) : ''}</div>
    ${what === 'contact' ? '' : check}${base === 'files/restaurants/items' ? cPin(p, it) : ''}<div><button class="btn small danger" type="button" data-cdel="${p}">Delete this ${esc(what)}</button></div>`, null, ev ? evTile(it.type) : '');
}
const cKm = it => it.km_from_house != null && it.km_from_house !== '' ? it.km_from_house + ' km' : '';
const cOpt = (it, k) => ({ long: C_LONG.includes(k) || String(edIs18(it[k]) ? edShown(it[k]) : it[k]).length > 32, type: ['url', 'web', 'gmaps', 'map'].includes(k) ? 'url' : k === 'phone' ? 'tel' : 'text' });
// "Find it on Google" and "Or move the pin"; first: a place with no pin yet starts with the search.
function cWhere(p, it) {
  const km = cKm(it), said = (CM.gfind || {})[p], has = typeof it.lat === 'number';
  // What was found: Google's name and address, from this session's memory, with Google Maps beside them (data-glive: the phone
  // shows no map meanwhile, gLiveSync in start.js). Nothing of it is in the guide.
  // A town picked from our list (cmTownPick): what it is, credited to GeoNames, ours (no data-glive: nothing of Google's).
  const saidHTML = said && said.town ? twAt({ town: said.town.n, kind: said.town.kind, province: said.town.prov, lat: said.town.lat, lng: said.town.lng })
    : said && typeof said === 'object' ? `<p class="hint" data-glive>${esc(`Found: ${[said.name, said.where].filter(Boolean).join(', ') || said.words}, ${said.km} km from the house. Not the right one? Search again, or paste its Google Maps link below.`)} <a href="${esc(gmLink(said.words, said.gid))}" target="_blank" rel="noopener" translate="no">Google Maps</a></p>`
    : `<p class="hint">${esc(said || (it.nomap ? 'Not on the map yet: pick it from the list to get its pin and distance.' : 'Pick it from the list to update its pin and distance.'))}</p>`;
  const tw = PL_SEC[p.replace(/\/\d+$/, '')] === 'todo';   // Things to do: our towns come first in the list (twNow in start.js)
  const find = has ? `<div class="f full"><label for="${cmId(p + '/gs')}">${tw ? 'Find it: a town, or a place on Google' : 'Find it on Google'}</label><input id="${cmId(p + '/gs')}" type="text" ${psAttrs(cmId(p + '/sug'))} data-gsp="${p}" placeholder="Start typing the name"><div class="pl-sug" id="${cmId(p + '/sug')}" role="listbox" aria-label="${tw ? 'Towns, and places on Google' : 'Places on Google'}" hidden></div>${saidHTML}</div>` : '';
  const pin = has ? `<div class="f full"><label for="${cmId(p + '/gm')}">Or move the pin: paste a Google Maps link</label><p class="hint">${it.lat && !it.nomap ? `Now at ${(+it.lat).toFixed(4)}, ${(+it.lng).toFixed(4)}${km ? `, ${km} from the house` : ''}.` : 'No position yet.'} Use the long link from the browser bar: it holds the position.</p><input id="${cmId(p + '/gm')}" type="text" inputmode="url" data-gm="${p}" placeholder="https://www.google.com/maps/…"></div>` : '';
  return { find, pin, first: !!(it.nomap || said) };   // a place with no pin yet starts here: finding it fills in the rest
}
/* --- A place in Eat and drink, Nightlife or Attractions (Yohann, 11 Nov 2026): the host gives the least possible, everything
   else is filled in and shown to look at once, never a form to complete. So an opened place starts with what only the host
   knows (name, comment, favourite), then a quiet summary of what was filled in, and the form behind "Change". The kinds,
   groups and the guide's own words come from engine/src (ENG_KINDS, ENG_GROUPS, ENG_T, pasted by build.py). --- */
const PL_SEC = { 'files/restaurants/items': 'eat', 'files/nightlife/items': 'eat', 'files/todo/items': 'todo' };
// The marks a host can switch on, by list: tags (t) and the one flag (f) that is a choice, "Book ahead".
const PL_MARKS = { eat: [['t', 'dogs'], ['t', 'veggie'], ['t', 'glutenfree'], ['t', 'terrace'], ['t', 'seaview'], ['f', 'book']], todo: [['t', 'kidsfun'], ['t', 'dogs'], ['t', 'free'], ['t', 'rainy'], ['f', 'book']] };
const PL_DONE = new Set(['name', 'description', 'type', 'town', 'place', 'address', 'comarca', 'phone', 'url', 'price', 'priceNote', 'hours']);   // the card's own fields; what is left keeps the generic list, at the end
// The guide's default colour for each tone of groups.json (engine app.css), and one colour for every place to eat.
const PL_TONE = { red: '#D52B1E', blue: '#1D4FA0', orange: '#EC6A1C', purple: '#6E4A7E', green: '#0E7C46', wine: '#8E1B4A' }, PL_FOOD = 'var(--tomato)';
I.clock = svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
I.globe = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>');
I.euro = svg('<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M4 10.5h9M4 13.5h9"/>');
// The engine's words in the maker's language (French spaces as the guide's typo() puts them).
function engT(k, p) {
  let x = (ENG_T[UIL] || {})[k] || ENG_T.en[k] || k; if (p != null) x = x.split('{p}').join(p);
  return UIL === 'fr' ? x.replace(/(\d) (€|%)/g, '$1 $2').replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :') : x;
}
const plSec = p => PL_SEC[p.replace(/\/\d+$/, '')];
const plKind = (sec, icon) => (ENG_KINDS[sec] || {})[icon];
const plKindName = (sec, icon, l) => { const k = plKind(sec, icon); return k ? k.name[l] || k.name.en : ''; };
// The row and the summary say the place's own line under the name, else its kind, in the language being edited.
const plType = (sec, it) => (edIs18(it.type) ? edShown(it.type) : typeof it.type === 'string' ? it.type : '').trim() || plKindName(sec, it.icon, CM.lang);
const plColour = (sec, it) => sec === 'eat' ? PL_FOOD : PL_TONE[ENG_GROUPS.groups[it.group || (plKind('todo', it.icon) || {}).group]] || 'var(--pine)';
// A kind's tile (places, markets, events): the guide's icon on its colour, an empty outline for no kind; ink: a dark icon on a light colour.
const kTile = (svg, kc, small, ink) => svg ? `<i class="pl-ic${small ? ' s' : ''}" style="--kc:${kc}${ink ? ';color:#121212' : ''}" aria-hidden="true">${svg}</i>` : `<i class="pl-ic none${small ? ' s' : ''}" aria-hidden="true"></i>`;
const plTile = (sec, it, small) => kTile(it.icon && ENG_ICON[it.icon], plColour(sec, it), small);
// Dates and days in the maker's language, never written by hand (docs/TYPOGRAPHY.md).
const plLoc = () => UIL === 'en' ? 'en-GB' : UIL;
const plDay = d => new Intl.DateTimeFormat(plLoc(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + ED_DAYS.findIndex(x => x[0] === d))));   // 1 Jan 2024 was a Monday
const plDate = md => { const [m, d] = String(md || '').split('-').map(Number); return m && d ? new Intl.DateTimeFormat(plLoc(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, m - 1, d))) : '?'; };
const plMonth = m => new Intl.DateTimeFormat(plLoc(), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, m - 1, 1)));
// Days as runs: "Tue-Sat", "Mon Wed", or "Every day".
function plDays(days) {
  const ix = ED_DAYS.map(x => x[0]).filter(d => (days || []).includes(d)).map(d => ED_DAYS.findIndex(x => x[0] === d));
  if (ix.length === 7) return '<span>Every day</span>';
  const runs = []; for (const i of ix) { const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); }
  return `<span translate="no">${esc(runs.map(([a, b]) => b - a >= 2 ? `${plDay(ED_DAYS[a][0])}-${plDay(ED_DAYS[b][0])}` : ED_DAYS.slice(a, b + 1).map(x => plDay(x[0])).join(' ')).join(' '))}</span>`;
}
// A market held one week of the month, in the guide's own words: "2nd Sun of the month", "Last Sun of the month" (engine
// i18n nth, nth1 to nth4 and nthLast through the engine's nthKey; a capital first, as the guide's hoursText puts one).
const plNth = r => { const n = r.week_of_month, w = engT(nthKey(n)), d = ED_DAYS.map(x => x[0]).filter(x => (r.days || []).includes(x)).map(plDay).join(' '),
  x = engT('nth').split('{nth}').join(w === nthKey(n) ? n + '.' : w).split('{day}').join(d);
  return `<span translate="no">${esc(x.charAt(0).toUpperCase() + x.slice(1))}</span>`; };
// One line per group of days (and season, and week of the month): "Tue-Sat 13:00-16:00, 20:00-23:30".
function plHours(sch) {
  const g = new Map();
  for (const r of sch || []) { if (!(r.days || []).length) continue; const k = [(r.days || []).join(), r.from || '', r.to || '', r.week_of_month || ''].join('|'); if (!g.has(k)) g.set(k, { r, t: [] }); g.get(k).t.push(`${r.open || ''}${r.close ? '-' + r.close : ''}`); }
  return [...g.values()].map(({ r, t }) => `<span class="pl-hl">${r.week_of_month ? plNth(r) : plDays(r.days)} ${t.filter(Boolean).map(x => `<span class="pl-nw">${esc(x)}</span>`).join(', ')}${r.from || r.to ? ` <small>${esc(`from ${plDate(r.from)} to ${plDate(r.to)}`)}</small>` : ''}</span>`);
}
const plHost = u => { try { return new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
const plMarks = (sec, it) => PL_MARKS[sec].filter(([t, k]) => (t === 't' ? it.tags || [] : it.flags || []).includes(k));
const plMark = ([t, k]) => engT(t === 't' ? 't_' + k : 'f_' + k);
// "Filled in for you": what the place has, one line each, only the lines with a value (two columns where there is room).
// "Change" sits on the title row; while the form is open the lines go, since the form under it shows the same things.
// The same panel for a market (mkFound): plPanel around its lines, each one plLine.
const plLine = (ic, html, c = "") => `<div class="pl-l${c}"><i aria-hidden="true">${ic}</i><div>${html}</div></div>`;
function plPanel(p, body) {
  const open = CM.chg.has(p), btn = `<button class="pl-link pl-chg" type="button" data-cchg="${p}" aria-expanded="${open}">${open ? 'Done' : 'Change'}</button>`;
  return `<div class="cm-found pl-found"><div class="pl-hd"><b class="pl-h">Filled in for you</b>${btn}</div>${body}</div>`;
}
function plFound(p, sec, it) {
  const line = plLine;
  const out = [], kind = it.icon && ENG_ICON[it.icon], K = plKind(sec, it.icon), say = (x, o) => `<p class="pl-note${o ? ' pl-clip" translate="no' : ''}">${esc(x)}</p>`;   // the guide's own notes: two lines at most here, whole in the form
  if (kind || plType(sec, it)) out.push(`<div class="pl-l pl-lk">${plTile(sec, it, true)}<div translate="no">${esc(plType(sec, it))}</div></div>`);
  const hrs = it.always ? ['<span>Open 24 hours</span>'] : plHours(it.schedule), note = edShown(it.hours || {}), facts = [it.price, (it.setMenus || []).length, it.phone, it.url, plMarks(sec, it).length, note, edShown(it.priceNote || {})].some(x => x && String(x).trim());
  // A season and no hours: its own ("Open from 1 Jun to 30 Sept") or the one assumed from its kind ("A summer place: expected
  // open June to September", with one tap to say it is open all year), the day guests see it again while it is hidden, then
  // (with a Google id) that guests get the hours from Google's line.
  const S = !it.always && !hrs.length ? plSeasonOf(it) : null, sr = S && S.ranges[0], back = S ? plBack(it) : null;
  const sHead = !S ? '' : S.confirmed ? `Open from ${plDate(sr.from)} to ${plDate(sr.to)}` : `A ${S.kind} place: expected open ${plMonthOf(sr.from)} to ${plMonthOf(sr.to)}.`;
  const wide = (ic, html) => plLine(ic, html, ' pl-lw');   // the hours and prices take the panel's width: a row of hours and its dates on one line
  if (S) out.push(wide(I.clock, `<span class="pl-hl">${esc(sHead)}</span>${back ? say(`Shown to guests from ${plDateOf(back)}.`) : ''}${it.gid ? say('Guests see Google’s own line for the hours.') : ''}${note ? say(note, 1) : ''}${S.confirmed ? '' : `<button class="pl-more pl-ally" type="button" data-callyear="${p}">Open all year</button>`}`));
  else if (hrs.length || note) out.push(wide(I.clock, hrs.join('') + (note ? say(note, 1) : '')));
  else if ((kind || facts) && (!K || K.hours !== false)) out.push(wide(I.clock, say(it.gid ? 'No opening hours found. Guests see Google’s own line saying whether it is open.' : 'No opening hours found.')));
  const price = [it.price ? engT('perPerson', it.price) : '', ...(it.setMenus || []).filter(m => m && m.price).map(m => engT('sm_' + m.kind, m.price))].filter(Boolean), pn = edShown(it.priceNote || {});
  if (price.length || pn) out.push(wide(I.euro, (price.length ? `<span translate="no">${esc(price.join(' · '))}</span>` : '') + (pn ? say(pn, 1) : '')));
  if (it.phone) out.push(line(I.phone, `<a href="tel:${esc(String(it.phone).replace(/[^\d+]/g, ''))}" translate="no">${esc(it.phone)}</a>`));
  if (it.url) out.push(line(I.globe, `<a href="${esc(/^https?:/.test(it.url) ? it.url : 'https://' + it.url)}" target="_blank" rel="noopener" translate="no">${esc(plHost(it.url))}</a>`));
  const mk = plMarks(sec, it); if (mk.length) out.push(line(I.tag, `<span class="pl-mks">${mk.map(m => `<span class="pl-mk" translate="no">${esc(plMark(m))}</span>`).join('')}</span>`, " pl-lm"));
  const open = CM.chg.has(p);
  // Its facts being looked up (job place-facts, below): one calm line in place of the lines, the form open or not. Then, at
  // the foot of the lines: where they came from, the search that did not work, or "Look for its details".
  const j = it.id ? CM.pf[it.id] : null, none = j && j.status === 'done' && !(j.result || {}).entry, failed = j && j.status === 'failed';
  const empty = none ? `<p class="pl-note">Nothing found for this place. Guests still get the map pin and the Google Maps button.</p>${String(edShown(it.name || {})).trim() ? pfWebHTML(p) : ''}`
    : failed ? '' : '<p class="pl-note">Nothing found for this place yet. Guests still get the map pin and the Google Maps button.</p>';
  const foot = failed ? `<p class="pl-foot pl-note"><span>The search did not work.</span>${j.message ? ` <span>${esc(j.message)}</span>` : ''} <button class="pl-more" type="button" data-pfagain="${p}">Try again</button></p>`
    : plFrom(it) || (pfCan(it, j) ? `<p class="pl-foot"><button class="pl-more" type="button" data-pflook="${p}">Look for its details</button></p>` : '');
  const body = pfBusy(j) ? pfWaitHTML(it.id) : open ? '' : `<div class="pl-ls">${out.length ? out.join('') : empty}${foot}</div>`;
  return plPanel(p, body);
}
// Where the facts still shown came from (filled, from the worker: the build, Find more or a lookup here), one quiet line:
// "From locanda.es and an open directory, 10 Nov 2026." The place's own site is said by its name, as a link to the page
// read; Overture is "an open directory"; a kind Claude guessed from the name alone says nothing. A fact the host changed is
// theirs and left out (plMine). The sentence is put together here, in the maker's language (its template and words from
// i18n/ui.json, Intl for the list and the date), so the line is not translated again on its way (translate="no").
const PF_HAS = { kind: it => !!it.icon, phone: it => !!it.phone, url: it => !!it.url, schedule: it => !it.always && (it.schedule || []).some(r => (r.days || []).length), season: it => !it.always && !(it.schedule || []).length && !!plOwnSeason(it), price: it => !!it.price, book: it => (it.flags || []).includes('book') };
function plFrom(it) {
  const f = it.filled; if (!f || !f.from || typeof f.from !== 'object') return '';
  const src = new Set(Object.entries(f.from).filter(([k]) => PF_HAS[k] && PF_HAS[k](it)).map(([, v]) => v)), parts = [];
  if (src.has('site')) { const u = /^https?:\/\//.test(f.page || '') ? f.page : it.url ? (/^https?:/.test(it.url) ? it.url : 'https://' + it.url) : ''; if (u) parts.push({ t: plHost(u), u }); }
  if (src.has('overture')) parts.push({ t: tr('an open directory') });
  if (src.has('search')) parts.push({ t: tr('a web search') });
  if (!parts.length) return '';
  let k = 0;
  const list = new Intl.ListFormat(plLoc(), { type: 'conjunction' }).formatToParts(parts.map(x => x.t)).map(x => { if (x.type !== 'element') return esc(x.value); const q = parts[k++];
    return q.u ? `<a href="${esc(q.u)}" target="_blank" rel="noopener">${esc(q.t)}</a>` : esc(q.t); }).join('');
  const d = /^\d{4}-\d\d-\d\d$/.test(f.at || '') ? new Intl.DateTimeFormat(plLoc(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(f.at + 'T00:00:00Z')) : '';
  // ‹a› and ‹d› are filled here: a {gap} would make the sentence a pattern that any text starting with "From" would match.
  return `<p class="pl-src" translate="no">${esc(tr(d ? 'From ‹a›, ‹d›.' : 'From ‹a›.')).split('‹a›').join(list).split('‹d›').join(esc(d))}</p>`;
}
// A fact the host changes by hand (kind, phone, website, the hours or Open 24 hours, the price, Book ahead) is theirs: its
// source leaves filled, and filled goes with the last one. p: any path inside the place.
function plMine(p, k) {
  const m = String(p || '').match(/^files\/(?:restaurants|nightlife|todo)\/items\/\d+/); if (!m) return;
  const it = edGet(edC(), edPath(m[0])), f = it && it.filled; if (!f || !f.from || !(k in f.from)) return;
  delete f.from[k]; if (!Object.keys(f.from).length) { if (f.readAt) delete f.from; else delete it.filled; }   // readAt: when the worker last read its site (worker/reread-places.mjs), kept
}
// A place's own season (it.season { from, to }, MM-DD), meaningful while it has no rows of hours: the guide then says "Closed,
// Opens 1 Jun" out of season and Google's line gives the hours. The first row of hours added takes it (from/to on the row)
// and it goes; the last row removed gives it back when every row removed carried that same season (plSeasonBack).
const plOwnSeason = it => it && it.season && it.season.from && it.season.to ? it.season : null;
// The guide's own rule for a place's season, pasted from engine/src/season.js: its hours' seasons, its own, or the one assumed
// from its kind (kinds.json "season") or its tag "summer"; out of it and opening in more than 30 days, it is hidden from guests.
const PL_SK = seasonKinds(ENG_KINDS);
const plSeasonOf = it => seasonOf(it, PL_SK);
const plBack = it => backOn(it, PL_SK, new Date());   // the day a place hidden today comes back for guests, or null
const plMonthOf = md => new Intl.DateTimeFormat(plLoc(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, +String(md).slice(0, 2) - 1, 1)));
const plDateOf = d => new Intl.DateTimeFormat(plLoc(), { day: 'numeric', month: 'short' }).format(d).replace(/ /g, '\u00a0');   // "2 May" never split over two lines
// The row's quiet note while a place is hidden from guests: "Hidden from guests until 2 May: closed for the season".
const plHidNote = it => { const b = plBack(it); return b ? `Hidden from guests until ${plDateOf(b)}: closed for the season` : ''; };
/* --- "Is it still open?" (12 Nov 2026): the monthly check (worker/check-guides.mjs, lookOf) leaves a note of ours on a place
   of the host's lists or a market whose own website no longer answers, or that our open directory no longer lists: look:
   { at, why: ['site'] and/or ['directory'], ok? }. It never changes what guests see, so nothing here does either: the host
   looks with their own eyes (Google Maps, a new tab) and says "It is still open" (ok: today; the check keeps it while the
   reasons stay those the host saw), or removes the place with the card's own delete. Until then the row says so in one
   quiet line and the step is under "Needs you" (CM_NEEDS), without stopping Publish. A new place or a copy never takes the
   note (edNewItem, cmFindPut, the Home tile copy in cmPin); look is ours, never a field (C_SKIP), never translated. --- */
const lkOpen = it => !!(it && it.look && typeof it.look === 'object' && Array.isArray(it.look.why) && it.look.why.length && !it.look.ok);
const lkWhy = it => { const w = it.look.why; return w.includes('site') && w.includes('directory') ? 'both' : w.includes('site') ? 'site' : 'directory'; };
const LK_ROW = { site: 'Is it still open? Its website no longer answers.', directory: 'Is it still open? Our open directory no longer lists it.', both: 'Is it still open? Its website no longer answers and our open directory dropped it.' };
const LK_SAY = { site: 'Its website has not answered since {x}.', directory: 'Our open directory has not listed it since {x}.', both: 'Since {x}, its website has not answered and our open directory has not listed it.' };
const lkNote = it => lkOpen(it) ? LK_ROW[lkWhy(it)] : '';
const lkRow = it => lkOpen(it) ? { t: lkNote(it), c: 'pl-lkn' } : '';   // the row's line: gone while the card is open, its block says it all
// The day it was first seen, in the maker's language ("1 Dec"; with its year when not this one), never split over two lines.
const lkDate = at => { const d = new Date(String(at || '') + 'T00:00:00Z'); if (isNaN(d)) return '';
  return new Intl.DateTimeFormat(plLoc(), { day: 'numeric', month: 'short', ...(d.getUTCFullYear() !== new Date().getUTCFullYear() ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(d).replace(/ /g, '\u00a0'); };
// Where the host looks: Google Maps by the place's Google id, else its own map link, else a search by its name and town.
const lkMap = it => { const n = String(edShown(it.name || {})).trim(), own = [it.gmaps, it.map].find(u => typeof u === 'string' && /^https?:\/\//.test(u));
  return it.gid ? gmLink(n, it.gid) : own || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([n, typeof it.town === 'string' ? it.town : ''].filter(Boolean).join(' '))}`; };
// At the top of a step, so the host finds them in a long list: "2 places to look at: Casinet and Quijote Beach", each name
// opening its card and scrolling it into view (data-clookgo). Gone once each is answered. The names are the guide's, the
// list's words the maker's (Intl), so that part is not translated again on its way.
function lkList(path, what) {
  const hits = (edGet(edC(), edPath(path)) || []).map((it, i) => [it, i]).filter(([it]) => lkOpen(it)); if (!hits.length) return '';
  const mk = what === 'market', n = hits.length, head = n === 1 ? (mk ? 'One market to look at:' : 'One place to look at:') : `${n} ${mk ? 'markets' : 'places'} to look at:`;
  let k = 0;
  const list = new Intl.ListFormat(plLoc(), { type: 'conjunction' }).formatToParts(hits.map(([it]) => String(cName(it)))).map(x => { if (x.type !== 'element') return esc(x.value); const [, i] = hits[k++];
    return `<button class="cm-lkgo" type="button" data-clookgo="${esc(`${path}/${i}`)}">${esc(x.value)}</button>`; }).join('');
  return `<p class="cm-lkl"><b>${esc(head)}</b> <span translate="no">${list}</span></p>`;
}
// At the top of the card: the question, the reason with its day, the map, and the two answers (one surface, the panel's family).
function lkHTML(p, it) {
  if (!lkOpen(it)) return '';
  const k = lkWhy(it), d = lkDate(it.look.at);
  return `<section class="cm-found pl-look" aria-label="Is it still open?"><b class="pl-h">Is it still open?</b>
    <p class="pl-lks">${esc(d ? LK_SAY[k].split('{x}').join(d) : LK_ROW[k].replace(/^Is it still open\? /, ''))} <a href="${esc(lkMap(it))}" target="_blank" rel="noopener">Look at it on Google Maps</a></p>
    <div class="pl-lka"><button class="btn small primary" type="button" data-clookok="${esc(p)}">It is still open</button><button class="btn small" type="button" data-cdel="${esc(p)}">Remove it from my guide</button></div></section>`;
}
const plRowsSeason = rows => { const k = [...new Set((rows || []).map(r => r && r.from && r.to ? r.from + '|' + r.to : ''))]; return k.length === 1 && k[0] ? k[0] : ''; };
function plSeasonBack(it, gone, left = (it.schedule || []).length) { const k = plRowsSeason(gone); if (k && !left && !plOwnSeason(it)) { const [from, to] = k.split('|'); it.season = { from, to }; } }
// "Open all year" (the tag allyear, the research's own word and a guest's "All year" mark): never hidden by an assumed season.
function plAllYear(it, on) { const tg = (it.tags || []).filter(x => x !== 'allyear' && !(on && x === 'summer')); if (on) tg.push('allyear'); it.tags = tg; }
const PL_GONE = new Map();   // a place (its id) -> the rows of hours removed one by one in this visit, until the last goes
// "Only part of the year" on a row of opening hours: two dates on one line, each a day and a month (from and to, MM-DD).
// weeks (markets): "Which weeks" on the same line, in the values engine/src/weeks.js understands and names (week_of_month
// 1 to 4, and -1 for the last one of the month; any other value a market already has is kept and offered as it is).
function plSeason(rp, r, weeks = false) {
  const on = !!(r.from || r.to), sel = (end, md) => { const [m, d] = String(md || '').split('-').map(Number);
    return `<select data-cseas="${rp}" data-end="${end}" data-part="d" aria-label="Day">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${i + 1 === d ? ' selected' : ''}>${i + 1}</option>`).join('')}</select><select data-cseas="${rp}" data-end="${end}" data-part="m" aria-label="Month" translate="no">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i + 1 === m ? ' selected' : ''}>${esc(plMonth(i + 1))}</option>`).join('')}</select>`; };
  const chip = `<button class="chip" type="button" data-cseason="${rp}" aria-pressed="${on}"><span>Only part of the year</span></button>`;
  return `<div class="pl-part">${weeks ? `<div class="pl-when">${chip}${plWeeks(rp, r)}</div>` : chip}${on ? `<div class="pl-season"><span>Between</span>${sel('from', r.from)}<span>and</span>${sel('to', r.to)}</div>` : ''}</div>`;
}
const PL_WEEKS = [[0, 'Every week'], [1, '1st week of the month'], [2, '2nd week of the month'], [3, '3rd week of the month'], [4, '4th week of the month'], [-1, 'Last week of the month']];
function plWeeks(rp, r) {
  const n = +r.week_of_month || 0, o = PL_WEEKS.some(x => x[0] === n) ? PL_WEEKS : [...PL_WEEKS, [n, `Week ${n} of the month`]];
  return `<select class="pl-wk" data-cweek="${rp}" aria-label="Which weeks">${o.map(([v, l]) => `<option value="${v || ''}"${v === n ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}
// The grid of kinds, behind a kind's "Change" (places, markets, events): groups of tiles, each with a heading or none.
// A tile: { k, tile, name, on, no, kw } (no: the name is already in the maker's language, never translated on its way).
// More than 12 tiles (events, attractions; not eating places or markets): a search field above them (Yohann, 11 Nov 2026).
// kw: the words a tile is found by, folded (kFold): its name in every language we have for it, and for events other words
// (EV_WORDS). Typing hides what does not match, and a heading with nothing left, without redrawing (kFilter): the field
// keeps its focus and the grid its width. The words typed live in CM.kq while the grid is open, so a redraw keeps them.
const kFold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const kHit = (kw, q) => !q || (' ' + kw).includes(' ' + q);   // at the start of a word: "con" finds concert, not "icon"
function kGrid(p, groups) {
  const gs = groups.filter(g => g.tiles.length), find = gs.reduce((n, g) => n + g.tiles.length, 0) > 12, q = find ? kFold(CM.kq.get(p)) : '';
  const hit = x => !find || kHit(x.kw, q), any = gs.some(g => g.tiles.some(hit));
  const tile = x => `<button class="pl-k" type="button" data-ckind="${p}" data-k="${x.k}" aria-pressed="${x.on}"${find ? ` data-kw="${esc(x.kw)}"` : ''}${hit(x) ? '' : ' hidden'}>${x.tile}<span${x.no ? ' translate="no"' : ''}>${esc(x.name)}</span></button>`;
  const field = find ? `<input type="text" class="pl-kq" id="${cmId(p + '/kq')}" data-ckq="${p}" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Search a kind" aria-label="Search a kind" value="${esc(CM.kq.get(p) || '')}"><p class="pl-note pl-knone" aria-live="polite"${any ? ' hidden' : ''}>No kind matches. Try another word.</p>` : '';
  return `<div class="pl-kinds-w" role="group" aria-label="Kind">${field}${gs.map(g => { const h = g.tiles.some(hit) ? '' : ' hidden';
    return `${g.head ? `<p class="pl-kg" translate="no"${h}>${esc(g.head)}</p>` : ''}<div class="pl-kinds"${h}>${g.tiles.map(tile).join('')}</div>`; }).join('')}</div>`;
}
function kFilter(t) {
  const p = t.dataset.ckq, w = t.closest('.pl-kinds-w'), q = kFold(t.value); if (!w) return;
  if (t.value.trim()) CM.kq.set(p, t.value); else CM.kq.delete(p);
  let n = 0;
  w.querySelectorAll('.pl-kinds').forEach(g => { let m = 0;
    g.querySelectorAll('.pl-k').forEach(b => { const on = kHit(b.dataset.kw || '', q); b.hidden = !on; m += on; });
    g.hidden = !m; const h = g.previousElementSibling; if (h && h.classList.contains('pl-kg')) h.hidden = !m; n += m; });
  const none = w.querySelector('.pl-knone'); if (none) none.hidden = n > 0;
}
// The grid closed (picked, Change again, the place deleted): its search goes with it.
const kClose = p => { CM.kpick.delete(p); CM.kq.delete(p); };
// "Kind <tile> <name> Change", and the grid under it while it is open.
const kRow = (p, tile, name, grid) => `<div class="f full"><div class="pl-kindrow"><span class="lab">Kind</span>${tile}${name}<button class="pl-link" type="button" data-ckinds="${p}" aria-expanded="${CM.kpick.has(p)}">Change</button></div>${CM.kpick.has(p) ? grid() : ''}</div>`;
function plKinds(p, sec, it) {
  const tile = ([k, x]) => ({ k, tile: plTile(sec, { icon: k, group: x.group }), name: x.name[UIL] || x.name.en, on: it.icon === k, no: true, kw: kFold(Object.values(x.name).join(' ')) });
  const all = Object.entries(ENG_KINDS[sec]);
  return kGrid(p, sec === 'eat' ? [{ tiles: all.map(tile) }] : Object.keys(ENG_GROUPS.groups).map(g => ({ head: engT('g_' + g), tiles: all.filter(([, x]) => x.group === g).map(tile) })));
}
function plForm(p, sec, it, rest, where) {
  const sm = it.setMenus || [], [pf, pt] = String(it.price || '').split('-').map(x => x.trim());
  const smOpt = (k, cur) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(ENG_T.en['ff_' + k] ? engT('ff_' + k) : engT('sm_' + k).replace(/\s*(€\s*\{p\}|\{p\}\s*€)\s*/g, ' ').trim())}</option>`;
  const hasOwn = k => k in it;
  return `<div class="pl-form grid">
    ${kRow(p, plTile(sec, it, true), `<span class="pl-kn" translate="no">${esc(plKindName(sec, it.icon, UIL))}</span>`, () => plKinds(p, sec, it))}
    ${cf('Line under the name', `${p}/type`, it.type, { i18n: true, long: false })}
    <div class="f full"><span class="lab">Marks</span><div class="chips pl-marks">${PL_MARKS[sec].map(m => { const [t, k] = m, on = (t === 't' ? it.tags || [] : it.flags || []).includes(k); return `<button class="chip" type="button" ${t === 't' ? `data-ctag="${p}" data-m="${k}"` : `data-cflag="${p}" data-f="${k}"`} aria-pressed="${on}"><span translate="no">${esc(plMark(m))}</span></button>`; }).join('')}</div></div>
    <div class="f full"><span class="lab">Price per person</span><div class="pl-price"><span>From</span><input type="number" step="any" min="0" inputmode="decimal" id="${cmId(p + '/pf')}" data-cprice="${p}" data-end="from" aria-label="From" value="${esc(pf || '')}"><span>to</span><input type="number" step="any" min="0" inputmode="decimal" id="${cmId(p + '/pt')}" data-cprice="${p}" data-end="to" aria-label="to" value="${esc(pt || '')}"><span>€</span></div></div>
    ${hasOwn('priceNote') ? cf('About the price', `${p}/priceNote`, it.priceNote, { long: true, rows: 2 }) : ''}
    ${sec === 'eat' ? `<div class="f full"><span class="lab">Set menus</span>${sm.map((m, k) => `<div class="pl-sm"><select id="${cmId(`${p}/setMenus/${k}/kind`)}" data-p="${p}/setMenus/${k}/kind" data-t="str" aria-label="Set menus" translate="no">${[...new Set(['menuDia', 'tasting', m.kind])].filter(Boolean).map(x => smOpt(x, m.kind)).join('')}</select><input type="text" inputmode="decimal" id="${cmId(`${p}/setMenus/${k}/price`)}" data-p="${p}/setMenus/${k}/price" data-t="str" aria-label="Price (€)" placeholder="12-15" value="${esc(m.price || '')}"><button class="cm-x" type="button" data-csmdel="${p}/setMenus/${k}" aria-label="Remove this set menu">×</button></div>`).join('')}<button class="btn small pl-add" type="button" data-csmadd="${p}">+ Add a set menu</button></div>` : ''}
    ${cf('Phone', `${p}/phone`, it.phone, { type: 'tel', half: true })}${cf('Official website', `${p}/url`, it.url, { type: 'url', half: true })}
    <div class="full">${cSwitch(`data-calways="${p}"`, 'Open 24 hours', !!it.always)}</div>
    ${it.always ? '' : cSchedule(`${p}/schedule`, it.schedule, true, false, plSeason(`${p}/season`, plOwnSeason(it) || (plSeasonOf(it) || { ranges: [{}] }).ranges[0]))}
    ${hasOwn('hours') ? cf('Opening hours, in words', `${p}/hours`, it.hours, { long: true, rows: 2 }) : ''}
    <div class="full">${cSwitch(`data-cflag="${p}" data-f="check"`, 'Check before going', (it.flags || []).includes('check'), 'Tells guests to check the hours or the dates before they go.')}</div>
    <div class="f full pl-sub"><span class="lab">Where it is</span></div>
    ${['town', 'place', 'address', 'comarca'].filter(k => hasOwn(k) && (edIs18(it[k]) || typeof it[k] === 'string')).map(k => cf(cLabel(k), `${p}/${k}`, it[k], { ...cOpt(it, k), half: true })).join('')}
    ${where}${rest.map(k => cf(cLabel(k), `${p}/${k}`, it[k], cOpt(it, k))).join('')}</div>`;
}
function cPlace(base, it, i) {
  const p = `${base}/${i}`, sec = PL_SEC[base], ord = k => { const n = C_ORDER.indexOf(k); return n < 0 ? 99 : n; };
  const rest = Object.keys(it).filter(k => !C_SKIP.has(k) && !PL_DONE.has(k) && !k.startsWith('_') && (edIs18(it[k]) || (C_STR.includes(k) && typeof it[k] === 'string'))).sort((a, b) => ord(a) - ord(b));
  const ty = plType(sec, it), town = typeof it.town === 'string' ? it.town : '';   // a line that already names the town does not get it twice
  const meta = [ty, town && !ty.toLowerCase().includes(town.toLowerCase()) ? town : '', cKm(it).replace(' ', '\u00a0'), (it.flags || []).includes('check') ? 'check before going' : '', it.auto ? 'added automatically' : ''].filter(Boolean).join(' · ');
  const { find, pin, first } = cWhere(p, it), nameless = !String(edShown(it.name || {})).trim() && !!it.gid;   // found on Google, no name yet: asked for
  return cCard(p, nameless ? 'No name yet' : cName(it), meta, `${lkHTML(p, it)}<div class="grid">${first ? find : ''}${cf('Name', `${p}/name`, it.name, { i18n: true, ...(nameless ? { ph: 'Now type its name' } : {}) })}${cf('Your comment', `${p}/description`, it.description, { long: true, i18n: true })}</div>
    ${cSwitch(`data-cfav="${p}"`, 'Our favourite', !!it.topPick, 'Guests see it marked Unmissable. Keep it for two or three places.')}
    ${plFound(p, sec, it)}${CM.chg.has(p) ? plForm(p, sec, it, rest, (first ? '' : find) + pin) : ''}
    ${base === 'files/restaurants/items' ? cPin(p, it) : ''}<div><button class="btn small danger" type="button" data-cdel="${p}">Delete this place</button></div>`, null, plTile(sec, it), [lkRow(it), plHidNote(it)]);
}
// A kind picked: its icon; its name as the line under the name unless the host wrote their own; for Attractions its quick
// filter (and tone) and "Great for kids" when the kind is for kids (taken off again only if the host did not set it here).
function plPick(p, k) {
  const it = edGet(edC(), edPath(p)), sec = plSec(p), was = plKind(sec, it && it.icon), nk = plKind(sec, k); if (!it || !nk) return;
  const ty = it.type, own = edIs18(ty) ? Object.entries(ty) : typeof ty === 'string' ? [['en', ty]] : [];
  if (own.every(([, s]) => !String(s || '').trim()) || (was && own.every(([l, s]) => !s || s === (was.name[l] || was.name.en)))) it.type = Object.fromEntries(edLangs().map(l => [l, nk.name[l] || nk.name.en]));
  it.icon = k;
  if (sec === 'todo') {
    it.group = nk.group; if ('tone' in it && ENG_GROUPS.groups[nk.group]) it.tone = ENG_GROUPS.groups[nk.group];
    const tg = [...(it.tags || [])];
    if (nk.kids && !tg.includes('kidsfun')) tg.push('kidsfun');
    else if (!nk.kids && was && was.kids && !CM.kidsHand.has(p)) { const j = tg.indexOf('kidsfun'); if (j >= 0) tg.splice(j, 1); }
    it.tags = tg;
  }
  kClose(p);
}
// Price per person from two numbers: "20-25", "20" when only one is given, none when both are empty.
function plPrice(t) {
  const it = edGet(edC(), edPath(t.dataset.cprice)), box = t.closest('.pl-price'), v = e => (box.querySelector(`[data-end="${e}"]`).value || '').trim(), a = v('from'), b = v('to');
  const s = a && b ? (a === b ? a : `${a}-${b}`) : a || b; if (s) it.price = s; else delete it.price;
  plMine(t.dataset.cprice, 'price'); cmQueue();
}
function plSeasonSet(t) {
  let r = edGet(edC(), edPath(t.dataset.cseas)); const end = t.dataset.end;
  // A place's assumed season (no season of its own yet): a date changed makes it the place's own, from the assumed dates.
  if (!r && /\/season$/.test(t.dataset.cseas)) { const it = edGet(edC(), edPath(t.dataset.cseas).slice(0, -1)), S = it && plSeasonOf(it); if (S) r = it.season = { ...S.ranges[0] }; }
  if (!r) return;
  const md = String(r[end] || (end === 'from' ? '06-01' : '09-30')).split('-').map(Number);
  md[t.dataset.part === 'm' ? 0 : 1] = +t.value;
  md[1] = Math.min(md[1], [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][md[0] - 1]);
  r[end] = md.map(x => String(x).padStart(2, '0')).join('-');
  plMine(t.dataset.cseas, /\/season$/.test(t.dataset.cseas) ? 'season' : 'schedule'); cmQueue(); render();
}
/* --- A market (Yohann, 11 Nov 2026): the place card's shape. The row starts with the kind's tile (the guide's icon, engine
   CAT_ICON, pasted by build.py as ENG_CAT; one colour for every market: the engine colours markets by kind, so none of its
   colours is "the markets'"), the host's words first (Name, Description), then "Filled in for you" and the form behind
   Change: the kind, what it sells, the hours with their season and week of the month, the marks, where it is. --- */
const MK_PATH = 'files/markets/markets', MK_COL = 'var(--pine)';
// What a market sells (tags, the guide's words t_<tag>): food first, then goods, then old things. A tag not in the list stays.
const MK_TAGS = ['fruitveg', 'meat', 'fish', 'cheese', 'deli', 'food', 'tapas', 'clothes', 'shoes', 'home', 'plants', 'toys', 'crafts', 'secondhand', 'antiques', 'books'];
// The engine's warnings a market can carry (engine/src/flags.json, words f_<flag>), said in the panel; holidays and check are switches.
const MK_FLAGS = ['holidays', 'check', 'octmay', 'older', 'closest', 'tiny'];
I.alert = svg('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>');
const mkTile = (cat, small) => kTile(ENG_CAT[cat], MK_COL, small);
const mkKind = cat => ENG_CAT[cat] ? engT('cat_' + cat) : String(cat || '');
function mkFound(p, it) {
  const out = [], n = +it.stalls_approx, st = n > 0 ? engT('stalls').split('{n}').join(n) : '';
  if (it.category) out.push(`<div class="pl-l pl-lk">${mkTile(it.category, true)}<div translate="no">${esc(mkKind(it.category))}${st ? `<span class="pl-qty"> · <span class="pl-nw">${esc(st)}</span></span>` : ''}</div></div>`);
  const hrs = plHours(it.schedule), when = edShown(it.occasional_when || {}).trim();
  out.push(plLine(I.clock, hrs.length ? hrs.join('') + (when ? `<p class="pl-note pl-clip" translate="no">${esc(when)}</p>` : '') : when ? `<span class="pl-hl" translate="no">${esc(when)}</span>` : '<p class="pl-note">No days or hours yet.</p>', ' pl-lw'));
  const chips = ks => `<span class="pl-mks">${ks.map(x => `<span class="pl-mk" translate="no">${esc(x)}</span>`).join('')}</span>`;
  const tg = (it.tags || []).filter(t => MK_TAGS.includes(t)), fl = MK_FLAGS.filter(f => (it.flags || []).includes(f));
  if (tg.length) out.push(plLine(I.bag, chips(tg.map(t => engT('t_' + t))), ' pl-lm'));
  if (fl.length) out.push(plLine(I.alert, chips(fl.map(f => engT('f_' + f))), ' pl-lm'));
  return plPanel(p, CM.chg.has(p) ? '' : `<div class="pl-ls">${out.join('')}</div>`);
}
function mkForm(p, it, where) {
  const on = (k, f) => (it[k] || []).includes(f);
  return `<div class="pl-form grid">
    ${kRow(p, mkTile(it.category, true), `<span class="pl-kn" translate="no">${esc(mkKind(it.category))}</span>`, () => kGrid(p, [{ tiles: Object.keys(ENG_CAT).map(k => ({ k, tile: mkTile(k), name: mkKind(k), on: it.category === k, no: true })) }]))}
    <div class="f full"><span class="lab">What it sells</span><div class="chips pl-marks pl-sells">${MK_TAGS.map(k => `<button class="chip" type="button" data-ctag="${p}" data-m="${k}" aria-pressed="${on('tags', k)}"><span translate="no">${esc(engT('t_' + k))}</span></button>`).join('')}</div></div>
    ${cSchedule(`${p}/schedule`, it.schedule, true, true)}
    ${'occasional_when' in it ? cf('When it runs', `${p}/occasional_when`, it.occasional_when, { long: true, rows: 2 }) : ''}
    <div class="full pl-sws">${cSwitch(`data-cflag="${p}" data-f="holidays"`, 'Not held on public holidays', on('flags', 'holidays'))}${cSwitch(`data-cflag="${p}" data-f="check"`, 'Check before going', on('flags', 'check'), 'Tells guests to check the hours or the dates before they go.')}</div>
    ${cf('Stalls (about)', `${p}/stalls_approx`, it.stalls_approx || null, { type: 'number', half: true })}
    <div class="f full pl-sub"><span class="lab">Where it is</span></div>
    ${where}</div>`;
}
function cMarket(base, it, i) {
  const p = `${base}/${i}`, ord = k => { const n = C_ORDER.indexOf(k); return n < 0 ? 99 : n; }, WH = ['town', 'place', 'venue', 'address', 'comarca'], LK = ['gmaps', 'map'];
  const shown = k => !C_SKIP.has(k) && !k.startsWith('_') && (edIs18(it[k]) || (C_STR.includes(k) && typeof it[k] === 'string'));
  const rest = Object.keys(it).filter(k => shown(k) && !['name', 'description', 'occasional_when', ...WH, ...LK].includes(k)).sort((a, b) => ord(a) - ord(b));
  const meta = [typeof it.town === 'string' ? it.town : '', cKm(it).replace(' ', '\u00a0'), (it.flags || []).includes('check') ? 'check before going' : '', it.auto ? 'added automatically' : ''].filter(Boolean).join(' · ');   // "27 km" never split
  const { find, pin, first } = cWhere(p, it), field = (k, o = {}) => cf(cLabel(k), `${p}/${k}`, it[k], { ...cOpt(it, k), ...o });
  const where = WH.filter(shown).map(k => field(k, { half: true })).join('') + LK.filter(shown).map(k => field(k)).join('') + (first ? '' : find) + pin + rest.map(k => field(k)).join('');
  return cCard(p, cName(it), meta, `${lkHTML(p, it)}<div class="grid">${first ? find : ''}${cf('Name', `${p}/name`, it.name, { i18n: true, long: cOpt(it, 'name').long, rows: 2 })}${cf('Description', `${p}/description`, it.description, { long: true, i18n: true })}</div>
    ${mkFound(p, it)}${CM.chg.has(p) ? mkForm(p, it, where) : ''}
    <div><button class="btn small danger" type="button" data-cdel="${p}">Delete this market</button></div>`, null, mkTile(it.category), lkRow(it));
}
// A kind picked for a market: its category, also one of the file's (the Markets page filters by them, as in edNewItem).
function mkPick(p, k) {
  const it = edGet(edC(), edPath(p)); if (!it || !ENG_CAT[k]) return;
  it.category = k; const fl = edGet(edC(), edPath(p).slice(0, -2));
  if (fl) { fl.categories = fl.categories || []; if (!fl.categories.includes(k)) fl.categories.push(k); }
  kClose(p);
}
/* --- An event's kind (type): its tile in the row and one line under its name, with the grid of the eighteen kinds behind Change.
   Icons and colours are the guide's (engine section.js EVENT_ICON, EVENT_TONE, pasted as ENG_EV_ICON, ENG_EV_TONE); the
   engine has no names for them, so these are the maker's (i18n/ui.json). --- */
// In the order hosts most often need them (Yohann, 11 Nov 2026); what belongs to one region (human towers: Catalonia) comes last.
// Eight more kinds the same day: sports to flowers. The keys are the guide's (engine section.js) and the worker's research.
const EV_KINDS = [['festa', 'Local festival'], ['music', 'Music'], ['food', 'Food and wine'], ['fair', 'Fair'], ['tradition', 'Tradition'], ['sports', 'Sports'], ['theatre', 'Theatre and dance'], ['art', 'Art and exhibitions'], ['kids', 'For kids'], ['parade', 'Parade'], ['carnival', 'Carnival'], ['christmas', 'Christmas'], ['religious', 'Religious celebration'], ['fireworks', 'Fireworks'], ['flowers', 'Flowers and gardens'], ['historical', 'History'], ['film', 'Film'], ['castells', 'Human towers']];
// Other words a host may type in the grid's search to find a kind, in the maker's four languages: the words a host of that
// language would use, not translations of each other. Its names (EV_KINDS and their translations in ui.json) count too.
const EV_WORDS = {
  festa: { en: 'town festival, feast, party, fiesta, festivities, patron saint festival', ca: 'festa major, festes, festa, revetlla, ball de festa major', es: 'fiesta, fiestas, fiestas patronales, verbena, fiesta mayor', fr: 'fête, fête du village, fête patronale, festivités, bal' },
  music: { en: 'concert, festival, band, orchestra, jazz, choir, gig, live music, opera', ca: 'concert, festival, banda, orquestra, jazz, coral, cobla, havaneres', es: 'concierto, festival, banda, orquesta, jazz, coro, flamenco, habaneras', fr: 'concert, festival, groupe, orchestre, jazz, chorale, opéra' },
  food: { en: 'wine, harvest, tasting, gastronomy, grape harvest, cava, olive oil, calçotada', ca: 'vi, verema, tast, gastronomia, cava, oli, calçotada, vermut', es: 'vino, vendimia, degustación, cata, gastronomía, cava, aceite, calçotada, tapas', fr: 'vin, vendanges, dégustation, gastronomie, cava, huile d’olive, terroir' },
  fair: { en: 'market, crafts, trade fair, craft fair', ca: 'mercat, artesania, fira, mostra', es: 'mercado, mercadillo, artesanía, feria, muestra', fr: 'marché, artisanat, foire, salon, brocante' },
  tradition: { en: 'folklore, dances, giants, sardana, folk', ca: 'folklore, gegants, capgrossos, sardanes, ball de bastons, cultura popular', es: 'folclore, bailes, gigantes, cabezudos, sardanas, cultura popular', fr: 'folklore, danses, géants, sardane, traditions populaires' },
  sports: { en: 'race, run, marathon, cycling, football, regatta, match, triathlon, tournament', ca: 'cursa, marató, ciclisme, futbol, regata, partit, torneig, bicicleta', es: 'carrera, maratón, ciclismo, fútbol, regata, partido, torneo, bici', fr: 'course, marathon, cyclisme, football, régate, match, tournoi, vélo' },
  theatre: { en: 'dance, play, show, circus, ballet, comedy', ca: 'teatre, dansa, obra, espectacle, circ, ballet', es: 'teatro, danza, obra, espectáculo, circo, ballet', fr: 'théâtre, danse, pièce, spectacle, cirque, ballet' },
  art: { en: 'exhibition, museum, gallery, photography, painting, sculpture', ca: 'exposició, museu, galeria, fotografia, pintura, escultura', es: 'exposición, museo, galería, fotografía, pintura, escultura', fr: 'exposition, musée, galerie, photographie, peinture, sculpture, vernissage' },
  kids: { en: 'family, children, puppets, games', ca: 'família, nens, infants, canalla, titelles, jocs', es: 'familia, niños, infantil, títeres, marionetas, juegos', fr: 'famille, enfants, marionnettes, jeux, jeune public' },
  christmas: { en: 'Three Kings, nativity, crib, New Year, Santa', ca: 'Nadal, Reis, cavalcada de Reis, pessebre, pessebre vivent, Cap d’Any, tió', es: 'Navidad, Reyes, cabalgata de Reyes, belén, belén viviente, Nochevieja, Año Nuevo', fr: 'Noël, Rois mages, crèche, crèche vivante, Nouvel An, réveillon' },
  religious: { en: 'procession, pilgrimage, Easter, Holy Week, patron saint, mass', ca: 'processó, romeria, aplec, Setmana Santa, Pasqua, patró, missa', es: 'procesión, romería, Semana Santa, Pascua, patrón, patrona, misa, Virgen', fr: 'procession, pèlerinage, Pâques, Semaine sainte, saint patron, pardon, messe' },
  fireworks: { en: 'fire run, bonfire, correfoc, fire, pyrotechnics', ca: 'focs, correfoc, foguera, revetlla de Sant Joan, piromusical', es: 'fuegos, correfoc, hoguera, pirotecnia, mascletà, San Juan', fr: 'feu d’artifice, feux, correfoc, feu de la Saint-Jean, pyrotechnie' },
  flowers: { en: 'garden, blossom, flower show, spring, roses', ca: 'jardí, flors, floració, primavera, roses, temps de flors', es: 'jardín, flores, floración, primavera, rosas', fr: 'jardin, fleurs, floraison, printemps, roses' },
  historical: { en: 'medieval, Roman, re-enactment, history, heritage', ca: 'medieval, romà, recreació, història, patrimoni', es: 'medieval, romano, recreación, historia, patrimonio', fr: 'médiéval, romain, reconstitution, histoire, patrimoine' },
  film: { en: 'cinema, open-air cinema, movie, screening, film festival', ca: 'cinema, cinema a la fresca, pel·lícula, projecció', es: 'cine, cine de verano, cine al aire libre, película, proyección', fr: 'cinéma, cinéma en plein air, séance, projection' },
  parade: { en: 'cavalcade, floats, march', ca: 'cercavila, cavalcada, carrosses, desfilada, rua', es: 'cabalgata, carrozas, desfile, pasacalles', fr: 'cavalcade, chars, défilé, corso' },
  carnival: { en: 'masks, costumes, fancy dress, Mardi Gras', ca: 'carnestoltes, disfresses, màscares, rua', es: 'carnaval, disfraces, máscaras, comparsas', fr: 'carnaval, déguisements, masques, Mardi gras' },
  castells: { en: 'castellers, towers, human tower', ca: 'castellers, colla, diada castellera, pilars', es: 'castellers, torres humanas, castillos humanos', fr: 'castellers, tours humaines, pyramides humaines' }
};
const evKw = (k, n) => kFold([n, ...['ca', 'es', 'fr'].map(l => (UI_T[n] || {})[l] || ''), ...Object.values(EV_WORDS[k] || {})].join(' '));
const EV_HEX = { ...PL_TONE, taxi: '#F5C400' };
function evColour(ty) {
  const v = ENG_EV_TONE[ty] || '', m = v.match(/^var\(--tone-(\w+)\)$/), bg = m ? EV_HEX[m[1]] : v === 'var(--ink)' ? '#121212' : 'var(--pine)';
  const rgb = /^#[0-9a-f]{6}$/i.test(bg) ? [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16)) : null;
  return { bg, ink: !!rgb && edContrast([255, 255, 255], rgb) < 3 };   // the fair's yellow: a dark icon, as the guide does on its taxi
}
const evTile = (ty, small) => { const c = evColour(ty); return kTile(typeof ty === 'string' && ENG_EV_ICON[ty], c.bg, small, c.ink); };
function evKind(p, it) {
  const ty = typeof it.type === 'string' ? it.type : '', nm = (EV_KINDS.find(x => x[0] === ty) || [])[1];
  return kRow(p, evTile(ty, true), `<span class="pl-kn"${nm ? '' : ' translate="no"'}>${esc(nm || ty)}</span>`, () => kGrid(p, [{ tiles: EV_KINDS.map(([k, n]) => ({ k, tile: evTile(k), name: n, on: ty === k, kw: evKw(k, n) })) }]));
}
function evPick(p, k) { const it = edGet(edC(), edPath(p)); if (!it || !EV_KINDS.some(x => x[0] === k)) return; it.type = k; kClose(p); }
const kPick = p => p.startsWith(MK_PATH + '/') ? mkPick : p.startsWith(EV_PATH + '/') ? evPick : plPick;
// A restaurant pinned to the home page becomes a Home tile (one tap, its own page), a copy of the restaurant that the
// host can reword in Home tiles: "from" remembers which restaurant it came from.
const cPinned = it => ((((edC().files || {}).quick || {}).items) || []).some(q => q.from && q.from === it.id);
function cPin(p, it) {
  return cSwitch(`data-cpin="${p}"`, 'Show on the home page', cPinned(it), 'A tile on the home page, one tap away, like the bar next door. You can change its words in Home tiles.');
}
function cmPin(p) {
  const it = edGet(edC(), edPath(p)); if (!it) return;
  const f = edF(), q = f.quick = f.quick || { items: [] }; q.items = q.items || [];
  const i = q.items.findIndex(x => x.from === it.id);
  if (i >= 0) { q.items.splice(i, 1); return; }
  // Only what the restaurant has, and no hours of Google's (hoursSource "google", from an older check): those may not be kept.
  const pick = k => it[k] != null ? { [k]: cmClone(it[k]) } : {}, type = it.type && edShown(it.type) ? { sub: cmClone(it.type), kind: cmClone(it.type) } : {};
  q.items.push({ id: 'food-' + it.id, icon: 'food', from: it.id, name: cmClone(it.name), ...type, title: cmClone(it.name), what: cmClone(it.description || {}),
    ...pick('phone'), ...pick('lat'), ...pick('lng'), ...pick('pos'), ...pick('gmaps'), ...(it.hoursSource === 'google' ? {} : pick('schedule')), ...pick('hours'), ...pick('price'), ...pick('priceNote') });
  const s = edC().site = edC().site || {}; s.modules = { ...(s.modules || {}), quick: true };
}
// A new entry starts blank (Yohann, 10 Nov 2026): it takes the first entry's shape (which fields, so its card asks for the
// same things) and none of its values. No icon, quick filter (group), colour (tone), marks (tags) or width: a new attraction
// used to copy the first one's (a water park, "fun", "kidsfun") and nothing in the editor changes them. An event's type
// only picks its colour and icon, and the guide has a default for both: left out. A market needs a category (the Markets
// page filters by it and the content check refuses one without): one neutral default per list, never the first market's.
const ED_NEW_DEFAULT = { 'files/markets/markets': { category: 'street' } };
function edNewItem(arr, path) {
  const clone = arr && arr[0] ? cmClone(arr[0]) : { name: { en: '' }, description: { en: '' }, lat: 0, lng: 0 };
  const h = edF().house || {};
  const clear = o => { for (const k of Object.keys(o)) { const x = o[k]; if (['icon', 'group', 'tone', 'category', 'type', 'wide'].includes(k) && !edIs18(x)) { delete o[k]; continue; } if (edIs18(x)) o[k] = Object.fromEntries(Object.keys(x).map(l => [l, ''])); else if (typeof x === 'string') o[k] = ''; else if (Array.isArray(x)) o[k] = []; else if (typeof x === 'number' && k !== 'lat' && k !== 'lng') o[k] = 0; else if (typeof x === 'boolean') delete o[k]; } return o; };   // switches too: a new event is not "added automatically" because the first one was
  const n = clear(clone); n.id = 'custom-' + Date.now().toString(36);
  if ('lat' in n) { n.lat = h.lat || 0; n.lng = h.lng || 0; n.km_from_house = null; n.nomap = true; }   // no position yet: never "0 km", never a pin at the house
  for (const k of ['verify', 'always', 'gid', 'pos', 'checked', 'hoursSource', 'rating', 'topPick', 'wiki', 'sources', 'setMenus', 'filled', 'look']) delete n[k];   // look: the first place's "Is it still open?" is not the new one's
  Object.assign(n, cmClone(ED_NEW_DEFAULT[path] || {}));
  const fl = path && n.category ? edGet(edC(), edPath(path).slice(0, -1)) : null;   // the market's category is one of the file's, as in cmFindAdd
  if (fl) { fl.categories = fl.categories || []; if (!fl.categories.includes(n.category)) fl.categories.push(n.category); }
  return n;
}
const edKm = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b), x = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(x))); };
function edUpdateKm(ip) { const it = edGet(edC(), ip), h = edF().house || {}; if (!it || !h.lat || !it.lat) return; if ('km_from_house' in it) it.km_from_house = edKm(h.lat, h.lng, it.lat, it.lng); if ('km' in it) it.km = edKm(h.lat, h.lng, it.lat, it.lng); }
// "Find it on Google": the place picked from what Google suggests as the host types (psPick in start.js), read by its id
// (/api/places?id=). Google's terms: only its id is kept for good, and its position for 30 days (pos: from and the day, so
// the monthly run renews it), with the distance and the Google Maps link made from them. The name stays the host's: a place
// that has one keeps it (only the pin moves); a place with none takes the words typed that name it (placeNameFrom, the
// builder's rule: "La Locanda dei Sapori El Vendrell" gives "La Locanda dei Sapori"), and when they do not ("restaurant La
// Bisbal del Penedès") its Name field is left empty and asked for, the place found said just above it. Its facts are looked
// up at once all the same: with no name, the lookup names it from our directory if the host has not meanwhile.
// Google's name is said for this session only (CM.gfind, cItem).
const gPos = () => ({ from: 'google', at: new Date().toISOString().slice(0, 10) });
async function cmFindById(p, id, s = {}, typed = '') {
  const it = edGet(edC(), edPath(p)), h = edF().house || {};
  CM.gfind = CM.gfind || {}; CM.gfind[p] = 'Looking it up…'; render();
  try {
    const d = await fetch(`/api/places?id=${encodeURIComponent(id)}&lat=${h.lat}&lng=${h.lng}`).then(r => r.json());
    const f = d.ok && d.place;
    if (!f) { CM.gfind[p] = d.ok ? 'Not found on Google. Paste its Google Maps link below.' : d.message || 'Google could not be reached.'; return render(); }
    const own = psWords(placeNameFrom(typed, s));
    if (!edShown(it.name || {}) && own) it.name = L6(own);
    const words = edShown(it.name || {});
    if (!words) CM.askName = p;   // the Name field is focused after this render, with its placeholder
    Object.assign(it, { gid: f.id, lat: f.lat, lng: f.lng, pos: gPos(), km_from_house: f.km, gmaps: gmLink(words, f.id) }); delete it.nomap;
    CM.gfind[p] = { name: s.name || '', where: s.where || '', km: f.km, gid: f.id, words };
    cmQueue(); render();
    if (CM.askName === p) setTimeout(() => { const x = document.getElementById(cmId(p + '/name')); if (x) { x.focus({ preventScroll: true }); x.scrollIntoView({ block: 'center' }); } }, 0);   // centred: the bottom bar would cover it at the foot of a phone
  } catch (e) { CM.gfind[p] = 'Google could not be reached. Try again.'; return render(); }
  if (plSec(p)) pfStart(p);   // a place to eat, a night out or an attraction: its facts are looked up at once
}
// A town picked from our own list in Things to do (twPick in start.js, towns.js): the host's own choice, as in the builder.
// An empty name takes the town's; a new place (or one already a town) takes its kind, town or city, for the icon and the
// line under the name (plPick); GeoNames' position, ours to keep (no pos, no date), the distance by road, a Google Maps
// link that searches for it by name. No Google id and no request to Google, and no lookup of its facts: a town has no
// door, phone or hours of its own (kinds.json hours: false), so it shows no hours and is never hidden for a season.
function cmTownPick(p, t) {
  const it = edGet(edC(), edPath(p)), h = edF().house || {}; if (!it) return;
  if (!String(edShown(it.name || {})).trim()) it.name = L6(t.n);
  if (it.nomap || !it.icon || it.icon === 'town' || it.icon === 'city') plPick(p, t.kind);
  Object.assign(it, { lat: t.lat, lng: t.lng, km_from_house: twKm(h, t), town: t.n, gmaps: twMaps(t) });
  for (const k of ['gid', 'pos', 'nomap']) delete it[k];
  CM.gfind = CM.gfind || {}; CM.gfind[p] = { town: t };
  cmQueue(); render();
}
/* --- A place's facts, looked up for it (job place-facts, worker/place-job.mjs; the places work, Piece C, 11 Nov 2026) ---
   A place picked on Google in the editor has a pin and nothing else: the worker gives it what the first build gives a
   host's place (kind, phone, website, hours, price, book ahead, a position of ours), through the same chain. The job is
   queued right after the pick, or with "Look for its details" on a place built before this existed; one at a time per
   place. While it runs the panel says so; the host may close the card, change step or reload: the job is found again by
   its place (params.item, as Find more is found again). Its result fills only what the place does not have, once (this
   device remembers which results it used, cmpf:<job>), through the normal change path. Nothing found: the host may paste
   the place's website, and it is looked up again with it. */
CM.pf = {};
const pfBusy = j => !!j && (j.status === 'queued' || j.status === 'running');
const pfUrl = v => { try { const x = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); return /^https?:$/.test(x.protocol) && /\.[a-z]{2,}$/i.test(x.hostname) && !/\s/.test(v) ? x.href : null; } catch (e) { return null; } };
const pfSeen = id => { try { return !!localStorage.getItem('cmpf:' + id); } catch (e) { return false; } };
const pfMark = id => { try { localStorage.setItem('cmpf:' + id, '1'); } catch (e) { /* storage blocked: applied once in this visit */ } };
// The place's path now from its id (the host may have moved or deleted it meanwhile).
function pfPath(id) { for (const base of Object.keys(PL_SEC)) { const i = (edGet(edC(), edPath(base)) || []).findIndex(x => x && x.id === id); if (i >= 0) return `${base}/${i}`; } return null; }
// "Look for its details": a place on Google with no hours, phone or website and nothing filled, and no lookup of its own yet.
const pfCan = (it, j) => CM.pfLoaded === true && !j && !!it.gid && !!it.id && !it.filled && !it.always && !(it.schedule || []).length && !it.phone && !it.url;
function pfWaitHTML(id) {
  const p = progOf(CM.pf[id], 'facts') || { pct: 2 };
  return `<div class="pl-wait" data-prog="pf:${esc(id)}"><p class="pl-note">Looking for its website and hours…</p><div class="cm-prog" role="progressbar" aria-label="Looking for its website and hours" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.pct)}"><i style="width:${p.pct.toFixed(1)}%"></i></div><p class="cm-progt" hidden translate="no"></p></div>`;   // the bar's own words stay unsaid: the line says it
}
const pfWebHTML = p => `<div class="f full pl-web"><label for="${cmId(p + '/pfweb')}">Know its website? Paste it and we read its hours.</label><input id="${cmId(p + '/pfweb')}" type="url" inputmode="url" autocomplete="off" data-pfweb="${esc(p)}" placeholder="https://"></div>`;
// The jobs of the last week, the latest for each place: one still running is followed again, one done is used (once).
function pfLoad() {
  if (CM.pfLoaded === true) return Promise.resolve();
  return CM.pfLoading = CM.pfLoading || (async () => {
    try {
      await ensureFresh();
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const r = await sb(`/rest/v1/guide_jobs?select=id,status,message,result,params,created_at&guide_id=eq.${CM.g.id}&kind=eq.place-facts&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc&limit=200`);
      for (const x of r || []) { const q = x.params || {}, id = q.item; if (!id || CM.pf[id]) continue;
        CM.pf[id] = { id: x.id, status: x.status, message: x.message, result: x.result, words: q.words || '', gid: q.gid || '', website: q.website || '', since: Date.parse(x.created_at) || Date.now() }; }
    } catch (e) { /* not found: each place shows as it is */ }
    CM.pfLoaded = true; CM.pfLoading = null;
    let used = false;
    for (const [id, j] of Object.entries(CM.pf)) { if (pfBusy(j)) pfPoll(id); else if (pfApply(id)) used = true; }
    if (used) { cmQueue(); render(); } else for (const id of Object.keys(CM.pf)) pfRefresh(id);
    for (const el of document.querySelectorAll('.edz .pl-found')) { const d = el.closest('details.cmi'), q = d && d.dataset.open, it = q && edGet(edC(), edPath(q)); if (it && pfCan(it, null)) el.outerHTML = plFound(q, plSec(q), it); }   // "Look for its details" once we know none is running
  })();
}
async function pfStart(p, website = '') {
  if (CM.pfLoaded !== true) await pfLoad();   // one may be running for it already (another tab, before a reload)
  const it = edGet(edC(), edPath(p)), sec = plSec(p), words = it ? String(edShown(it.name || {})).trim() : '';
  if (!it || !sec || !it.id || !it.gid || pfBusy(CM.pf[it.id])) return;   // no name: looked up by its id, named from our directory (worker/place-job.mjs)
  const j = CM.pf[it.id] = { status: 'queued', since: Date.now(), words, gid: it.gid, website };
  pfRefresh(it.id);
  try {
    await cmSave(); await ensureFresh();   // the worker reads the pin from the draft
    const r = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: CM.g.id, kind: 'place-facts',
      params: { item: it.id, list: sec, gid: it.gid, words, about: String(edShown(it.description || {})).trim().slice(0, 600), ...(website ? { website } : {}) } } });
    j.id = r && r[0] && r[0].id; if (!j.id) throw new Error('Could not start');
    pfPoll(it.id);
  } catch (e) { if (CM.pf[it.id] === j) { j.status = 'failed'; j.message = ''; pfRefresh(it.id); } }
}
async function pfPoll(id) {
  const j = CM.pf[id]; if (!j || !j.id || j.polling) return; j.polling = true;
  for (let i = 0; i < 150 && CM.pf[id] === j; i++) {
    await new Promise(r => setTimeout(r, i < 15 ? 2000 : 5000));
    try {
      await ensureFresh();
      const st = ((await sb('/rest/v1/guide_jobs?select=status,message,result&id=eq.' + j.id)) || [])[0]; if (!st) continue;
      progSet(j, st);
      if (st.status === 'done') { j.result = st.result; if (pfApply(id)) { cmQueue(); render(); } else pfRefresh(id); break; }
      if (st.status === 'failed') { pfRefresh(id); break; }
    } catch (e) { /* offline for a moment: asked again */ }
  }
  j.polling = false;
}
// The panel of that place only (the rest of the step as it is: a field being typed in keeps its focus).
function pfRefresh(id) {
  const p = pfPath(id), el = p && document.querySelector(`details.cmi[data-open="${p}"] .pl-found`);
  if (el) el.outerHTML = plFound(p, plSec(p), edGet(edC(), edPath(p)));
}
// A result used once: only what the place does not have. Its kind as a pick would set it, its town, our position in place
// of Google's (with the entry's pos, Google's still, the pick's stays), our spelling of the name while it is still the
// words that were sent, then where the facts taken came from. Returns whether the place changed.
function pfApply(id) {
  const j = CM.pf[id]; if (!j || j.status !== 'done' || j.applied) return false;
  j.applied = true;
  if (!j.id || pfSeen(j.id)) return false;
  pfMark(j.id);
  const e = (j.result || {}).entry, p = pfPath(id), it = p && edGet(edC(), edPath(p)), sec = p && plSec(p);
  if (!e || !it) return false;
  if (e.gid && it.gid !== e.gid) { setTimeout(() => pfStart(p), 0); return false; }   // picked again meanwhile: looked up again for the new one
  const took = [], none = v => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
  if (!it.icon && e.kind && plKind(sec, e.kind)) { plPick(p, e.kind); took.push('kind'); }
  for (const k of ['phone', 'url', 'price']) if (none(it[k]) && typeof e[k] === 'string' && e[k].trim()) { it[k] = e[k]; took.push(k); }
  if (none(it.schedule) && !it.always && Array.isArray(e.schedule) && e.schedule.length) { it.schedule = cmClone(e.schedule); took.push('schedule'); }
  else if (none(it.schedule) && !it.always && !plOwnSeason(it) && plOwnSeason(e)) { it.season = { from: e.season.from, to: e.season.to }; took.push('season'); }
  if (e.book === true && !(it.flags || []).includes('book')) { it.flags = [...(it.flags || []), 'book']; took.push('book'); }
  if (typeof e.town === 'string' && e.town && (it.town == null || (typeof it.town === 'string' && !it.town.trim()))) it.town = e.town;
  if (!e.pos && typeof e.lat === 'number' && typeof e.lng === 'number') { it.lat = e.lat; it.lng = e.lng; if (e.km != null) it.km_from_house = e.km; else edUpdateKm(edPath(p)); delete it.pos; delete it.nomap; }
  if (typeof e.name === 'string' && e.name.trim() && j.words && edShown(it.name || {}) === j.words) {
    if (edIs18(it.name)) { for (const l of Object.keys(it.name)) if (it.name[l] === j.words) it.name[l] = e.name; } else it.name = e.name; }
  else if (typeof e.name === 'string' && e.name.trim() && !j.words && !String(edShown(it.name || {})).trim()) { it.name = L6(e.name.trim()); if (it.gid) it.gmaps = gmLink(e.name.trim(), it.gid); if (CM.askName === p) CM.askName = null; }   // looked up with no name, still none: our directory's
  const from = Object.fromEntries(Object.entries((e.filled || {}).from || {}).filter(([k]) => took.includes(k)));
  if (Object.keys(from).length) { const o = it.filled && it.filled.from ? it.filled : null, web = Object.values(from).some(v => v === 'site' || v === 'search');
    it.filled = { at: [o && o.at, e.filled.at].filter(Boolean).sort().pop(), from: { ...(o ? o.from : {}), ...from }, ...(web && e.filled.page ? { page: e.filled.page } : o && o.page ? { page: o.page } : {}), ...(it.filled && it.filled.readAt ? { readAt: it.filled.readAt } : {}) }; }
  return true;
}
function edParseMaps(url) {
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

/* --- Step bodies --- */
function cmGuide(c) {
  const s = c.site || {}, h = (c.files || {}).house || {}, langs = edLangs();
  return `<div class="grid">${cf('Guide name', 'site/name', s.name, { hint: 'The title of the guide, and the app name on guests’ phones.' })}${cf('House name on the cover', 'files/house/name', h.name)}
    ${cf('Text under the link when you share it', s.shareDescription != null ? 'site/shareDescription' : 'site/description', s.shareDescription != null ? s.shareDescription : s.description, { long: true, rows: 2 })}
    ${'listing' in h || !(c.files || {})['house-page'] ? cf('Your listing link', 'files/house/listing', h.listing || '', { type: 'url' }) : ''}</div>
    <div class="f full"><span class="lab">Languages</span><p class="hint">The guide opens in the guest’s phone language when it can. The first one is the main language.</p>
    <div class="chips">${Object.entries(ED_LANGS).map(([k, n]) => { const on = langs.includes(k), miss = on ? edMissing(k) : 0; return `<label class="chip"><input type="checkbox" data-clang="${k}"${on ? ' checked' : ''}${k === langs[0] ? ' disabled' : ''}><span>${n}${k === langs[0] ? ' (main)' : ''}${miss ? ` · ${miss} to translate` : ''}</span></label>`; }).join('')}</div>
    <div class="cm-row"><button class="btn small" type="button" data-translate${CM.trJob && (CM.trJob.status === 'queued' || CM.trJob.status === 'running') ? ' disabled' : ''}>Translate missing texts</button><span class="hint" id="edJob">${esc(CM.trDone || '')}</span></div>
    ${CM.trJob && (CM.trJob.status === 'queued' || CM.trJob.status === 'running') ? progBar('tr', 'Translation') : ''}
    <p class="hint">Usually takes a few minutes. Until a text is translated, guests see it in the main language. The translations arrive as changes you preview and publish.</p></div>`;
}
const edCssVar = (css, name) => { const m = css.match(new RegExp(name + '\\s*:\\s*([^;}]+)')); return m ? m[1].trim() : ''; };
const edBlockOf = css => { const m = css.match(/\/\* editor:start \*\/([\s\S]*?)\/\* editor:end \*\//); return m ? m[1] : ''; };
const edCoverPhoto = h => !!h.photo && h.cover !== 'themed';
// The guide's credits say "the cover illustration was made with AI" while site.theme.coverMade is "ai" (engine/src/views/
// credits.js). The worker's cover-art job names its drawings covers/art-<time>.jpg, so the mark follows the cover's file:
// set when that drawing becomes the cover, gone when another cover is chosen (a photo, an upload, the drawn cover).
const edArt = path => /(^|\/)covers\/art-[\w-]+\.jpg$/.test(String(path || ''));
function edCoverMade(path) {
  const s = edC().site = edC().site || {}, th = s.theme = s.theme || {};
  if (edArt(path)) th.coverMade = 'ai'; else delete th.coverMade;
}
// The look, in three steps: logo, cover picture (one of the guide's photos, an upload, drawn from the colours, or an
// artistic version of a photo), colours (a row of small phones, one per colour world, as in the builder: theme.world).
// Fine-tuning a colour and the fonts are optional, folded away.
const cmPhotos = c => { const f = c.files || {}, out = [], add = x => { if (typeof x === 'string' && x && !out.includes(x)) out.push(x); };
  add((f.house || {}).photo); ((f['house-page'] || {}).photos || []).forEach(add); (((f.message || {}).blocks) || []).forEach(b => (b.photos || []).forEach(add)); return out.slice(0, 18); };
function cmLook(c) {
  const th = CM.g.theme, css = th.css || '', blk = edBlockOf(css), h = (c.files || {}).house || {}, s = c.site || {};
  const fam = n => { const x = (edCssVar(blk, n) || edCssVar(css, n)).match(/"([^"]+)"/); return x ? x[1] : ''; };
  const dispSel = (ED_FONTS.find(f => f[1] === fam('--display')) || [])[0] || '', bodySel = (ED_FONTS.find(f => f[1] === fam('--font')) || [])[0] || '';
  const pics = cmPhotos(c), busy = !!CM.artJob, n = i => `<span class="cm-n">${i}</span>`, tok = worldTok(edWorldNow(c));
  const fonts = (name, kind, sel) => `<div class="cm-fontlist" role="radiogroup" aria-label="${kind === 'display' ? 'Font for titles' : 'Font for text'}">${[['', 'Its own'], ...ED_FONTS].map(([id, nm]) => `<label class="chip"><input type="radio" name="${name}" data-design="${kind}" value="${id}"${sel === id ? ' checked' : ''}><span${id ? ` style="font-family:'${nm}',system-ui"` : ''}>${esc(nm)}</span></label>`).join('')}</div>`;
  edFontsLoad();
  return `<div class="f full"><span class="lab">${n(1)}Your logo</span><p class="hint">Optional. It shows on the welcome card and becomes the icon on guests’ phones. Without one, the guide shows no logo.</p><div class="cm-row cm-logo">${s.logo ? `<img src="${esc(edImg(s.logo))}" alt="Your logo">` : ''}<label class="btn small cm-file"><input class="sr" type="file" accept="image/*" data-phset="site/logo" data-kind="logo">${s.logo ? 'Change the logo' : 'Add a logo'}</label>${s.logo ? '<button class="btn small" type="button" data-logodel>Remove</button>' : ''}</div></div>
    <div class="f full"><span class="lab">${n(2)}Cover picture</span><p class="hint">Pick one of your photos, upload a picture, or let us draw an artistic version of your cover photo.</p>
      ${pics.length ? `<div class="cm-pics">${(CM.allPics ? pics : pics.slice(0, 6)).map(p => `<button type="button" class="cm-pic" data-coverpic="${esc(p)}" aria-pressed="${edCoverPhoto(h) && h.photo === p}" aria-label="Use this photo as the cover"><img src="${esc(edImg(p))}" alt="" loading="lazy"></button>`).join('')}</div>${pics.length > 6 && !CM.allPics ? `<button class="btn small cm-allpics" type="button" data-allpics>Show all ${pics.length} photos</button>` : ''}` : ''}
      <div class="cm-row"><label class="btn small cm-file"><input class="sr" type="file" accept="image/*" data-phset="files/house/photo">Upload a picture</label><button class="btn small" type="button" data-cover="themed" aria-pressed="${!edCoverPhoto(h)}">Drawn from the colours</button></div>
      ${h.photo ? `<div class="cm-art"><div class="cm-arthd"><img src="${esc(edImg(h.photo))}" alt=""><span><b>An artistic version of this photo</b><small>“Do it for me” makes an artistic rendering of the house, in the photo’s own colours.</small></span></div>
        <div class="cm-row"><button class="btn small primary" type="button" data-art="auto"${busy ? ' disabled' : ''}>Do it for me</button><button class="btn small" type="button" data-art="words"${busy ? ' disabled' : ''}>With my own words</button></div>
        ${CM.artWords != null ? `<div class="f full"><label for="c_artw">How should it look?</label><textarea id="c_artw" rows="2" placeholder="A watercolour in soft blues, like an old travel poster">${esc(CM.artWords)}</textarea><div class="cm-row"><button class="btn small primary" type="button" data-art="draw"${busy ? ' disabled' : ''}>Draw it</button></div></div>` : ''}
        ${busy ? progBar('art', 'Drawing your cover') : ''}
        ${CM.artRes ? `<figure class="cm-artres"><img src="${esc(CM.artRes.url)}" alt="Your artistic cover"><figcaption class="cm-row"><button class="btn small primary" type="button" data-artuse>Use this cover</button><button class="btn small" type="button" data-art="again"${busy ? ' disabled' : ''}>Try again</button></figcaption></figure>` : ''}
        ${CM.artErr ? `<p class="hint cm-err">${esc(CM.artErr)}</p>` : ''}</div>` : ''}</div>
    <div class="f full" id="cm_worlds"><span class="lab" id="l_world">${n(3)}Colours</span><p class="hint">Each has its own colours and title font. Tap one to see your guide in it.</p>
      ${edWorldsRow(c)}
      <details class="cm-more" data-open="look-colours"${CM.open.has('look-colours') ? ' open' : ''}><summary>Fine-tune each colour</summary><div class="cm-colors">${ED_ROLES.map(([r, v, l]) => `<label class="f"><span class="hint">${l}</span><input type="color" data-design="role" data-role="${r}" value="${tok[v].toLowerCase()}"></label>`).join('')}</div></details></div>
    <details class="cm-more" data-open="look-fonts"${CM.open.has('look-fonts') ? ' open' : ''}><summary>Fonts <small>Optional: each set of colours comes with its own</small></summary>
      <span class="lab">Titles</span>${fonts('cfd', 'display', dispSel)}<span class="lab">Text</span>${fonts('cfb', 'body', bodySel)}</details>`;
}
// The guide's colour world: its own (theme.world, else what its build named, site.theme.world), else Bauhaus.
function edWorldNow(c = edC()) { const th = CM.g.theme || {}, w = th.world || ((c.site || {}).theme || {}).world; return WK.worldOf(w) ? w : 'bauhaus'; }
// The phone selected when the step opens: the picture the colours came from (theme.worldFrom), else the guide's world (a
// world with colours of its own: the world it is made from), else, for a guide with no world yet, Bauhaus (or the picture
// an older "Colours: from my cover / logo" named). An old layout its row may still name (theme.preset) is not read.
function edWorldSel(c = edC()) {
  const th = CM.g.theme || {}, st = (c.site || {}).theme || {}, w = th.world || st.world;
  if ((th.worldFrom === 'cover' || th.worldFrom === 'logo') && edPicOf(th.worldFrom)) return th.worldFrom;
  if (WK.worldOf(w)) return worldBase(w);
  if ((th.colorsFrom === 'cover' || th.colorsFrom === 'logo') && edPicOf(th.colorsFrom) && edPicWorldNow(th.colorsFrom) !== null) return th.colorsFrom;
  return 'bauhaus';
}
// The guide's pictures a world can come from: its cover photo and its logo (the draft's).
function edPicOf(kind) { const c = edC(), p = kind === 'logo' ? (c.site || {}).logo : kind === 'cover' ? ((c.files || {}).house || {}).photo : ''; return p ? { key: 'ed:' + p, src: edImg(p) } : null; }
const edPicWorld = kind => { const pic = edPicOf(kind); return pic ? picEntry(pic.key, pic.src).p : Promise.resolve(null); };
const edPicWorldNow = kind => { const pic = edPicOf(kind); return pic ? picEntry(pic.key, pic.src).w : null; };
// The row: the guide's own cover on top of each phone (the drawn cover: the world's main colour). The picture the guide's
// colours came from shows the guide's colours themselves (a fine-tuned colour included).
function edWorldsRow(c = edC()) {
  const th = CM.g.theme || {}, h = (c.files || {}).house || {}, pics = {};
  for (const k of ['cover', 'logo']) if (edPicOf(k)) pics[k] = th.worldFrom === k && WK.worldOf(th.world) && typeof th.world === 'object' ? th.world : edPicWorldNow(k);
  return worldRowHTML({ sel: edWorldSel(c), cover: edCoverPhoto(h) ? edImg(h.photo) : '', pics });
}
// A picture's colours arrived: the row shows them (only the row: nothing else on the step moves).
function edWorldArrived() { if (route() === 'look') wpsSwap(edWorldsRow()); }
// A phone picked: the guide takes that world, without the colours an older layout or "from my picture" wrote into its
// css; its paper and main colour go to the phone's theme colours (site.theme).
// The fonts picked by hand in Fonts stay.
async function edWorldPick(id) {
  if (id === 'cover' || id === 'logo') { const w = await edPicWorld(id); return w ? edWorldApply(w, id) : edWorldApply('bauhaus'); }
  if (isWorldId(id)) edWorldApply(id);
}
function edWorldApply(w, from) {
  const th = CM.g.theme = CM.g.theme || {}, site = edC().site = edC().site || {}, t = worldTok(w);
  th.world = w; if (from) th.worldFrom = from; else delete th.worldFrom;
  delete th.preset; delete th.colorsFrom;
  th.css = (th.css || '').replace(ED_COLOR_VARS, '');
  site.theme = { ...(site.theme || {}), world: w, paper: t['--paper'], manifestBackground: t['--paper'], manifestTheme: t['--blue'] }; delete site.theme.preset;
  cmQueue(); render(); setTimeout(() => wpsInView(true));
}
// The cover picture or the logo changed while the guide's colours come from it: read again from the new picture.
async function edWorldFollow(kind) {
  if ((CM.g.theme || {}).worldFrom !== kind) return;
  const w = edPicOf(kind) ? await edPicWorld(kind) : null;
  edWorldApply(w || 'bauhaus', w ? kind : undefined);
}
// The fonts' names in their own typeface: one stylesheet for the list, loaded once.
function edFontsLoad() {
  if (document.getElementById('edFonts')) return;
  const l = document.createElement('link'); l.id = 'edFonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?' + ED_FONTS.map(f => 'family=' + f[1].replace(/ /g, '+')).join('&') + '&display=swap'; document.head.appendChild(l);
}
/* --- Artistic cover: the guide builder redraws one of the host's photos (job "cover-art"); the host keeps it or not --- */
async function artStart(source, prompt, gid = CM.g && CM.g.id) {
  CM.artJob = { status: 'queued', since: Date.now() }; CM.artErr = ''; CM.artRes = null; CM.artLast = prompt || null; render();
  try {
    await ensureFresh();
    const r = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: gid, kind: 'cover-art', params: { source, prompt: prompt || null } } });
    CM.artJob.id = r && r[0] && r[0].id; setTimeout(artPoll, 2000);
  } catch (e) { CM.artJob = null; CM.artErr = 'The drawing could not start: ' + niceError(e); render(); }
}
async function artPoll() {
  const j = CM.artJob; if (!j || !j.id) return;
  try {
    const r = (await sb('/rest/v1/guide_jobs?select=status,message,result&id=eq.' + j.id))[0];
    if (r) progSet(j, r);
    if (r && r.status === 'done') { CM.artRes = r.result; CM.artJob = null; return render(); }
    if (r && r.status === 'failed') { CM.artErr = r.message || 'The drawing did not work. Try again.'; CM.artJob = null; return render(); }
  } catch (e) { /* asked again below */ }
  setTimeout(artPoll, 2500);
}
function cmSections(c) {
  const ids = [...((((c.files || {}).sections || {}).sections) || []).map(x => x.id)];
  if (!ids.includes('quick')) ids.push('quick');
  if (!ids.includes('transport')) ids.splice(Math.max(0, ids.indexOf('emergency') + 1) || ids.length, 0, 'transport');   // Getting around: switched on, its step appears   // Home tiles: the step appears once switched on, and its first tile makes the file
  if ((c.files || {}).reviews && !ids.includes('reviews')) ids.push('reviews');
  const night = ids.includes('nightlife'); if (!night) ids.splice(ids.includes('todo') ? ids.indexOf('todo') + 1 : ids.length, 0, 'nightlife');   // Nightlife: optional, off until switched on
  if (!ids.includes('map')) ids.push('map');
  const m = (c.site || {}).modules || {}, onNow = id => id === 'nightlife' && !night ? m[id] === true : m[id] !== false;
  return `<div class="mods">${ids.map(id => { const [n, d] = ED_SEC[id] || [id, '']; return `<label class="mod"><input type="checkbox" data-cmod="${esc(id)}"${onNow(id) ? ' checked' : ''}><div class="box"><span class="tick" aria-hidden="true">✓</span><div><b>${esc(n)}</b><small>${esc(d)}</small></div></div></label>`; }).join('')}</div>`;
}
function cmHousePage(c) {
  const hp = c.files['house-page'], P = 'files/house-page';
  return `<div class="grid">${cf('Summary', P + '/summary', hp.summary, { i18n: true })}${cf('Description', P + '/description', hp.description, { long: true, rows: 6, i18n: true })}
    ${cf('Rating (stars)', P + '/rating/stars', (hp.rating || {}).stars, { type: 'number', half: true })}${cf('Number of reviews', P + '/rating/count', (hp.rating || {}).count, { type: 'number', half: true })}
    ${cf('Listing link', P + '/url', hp.url, { type: 'url' })}${cf('Listing photos link', P + '/photosUrl', hp.photosUrl, { type: 'url' })}</div>
    <h3 class="cm-h">Highlights</h3><div class="cm-list">${(hp.highlights || []).map((h, i) => cCard(`${P}/highlights/${i}`, edShown(h.t) || 'New highlight', edShown(h.s), `<div class="grid">${cf('Highlight', `${P}/highlights/${i}/t`, h.t, { i18n: true })}${cf('Detail', `${P}/highlights/${i}/s`, h.s, { i18n: true, long: true, rows: 2 })}</div><div><button class="btn small danger" type="button" data-cdel="${P}/highlights/${i}">Delete this highlight</button></div>`)).join('')}</div>
    <button class="btn small cm-add" type="button" data-addit="${P}/highlights">+ Add a highlight</button>
    ${hp.beds ? `<h3 class="cm-h">Beds</h3>${cLines(P + '/beds', hp.beds, 'Add a bed')}` : ''}
    <h3 class="cm-h">Amenities</h3><div class="cm-list">${(hp.amenities || []).map((g, i) => cCard(`${P}/amenities/${i}`, edShown(g.t), cmCount((g.items || []).length, 'item', 'items'), `<div class="grid">${cf('Group title', `${P}/amenities/${i}/t`, g.t, { i18n: true })}</div>${cLines(`${P}/amenities/${i}/items`, g.items, 'Add an item')}`)).join('')}</div>
    <div class="f full cm-amfind"><label class="lab" for="cmAmQ">Add an amenity</label><input type="search" id="cmAmQ" autocomplete="off" placeholder="Dishwasher, cot, sea view…"><p class="hint">It goes into its group, in every language of the guide.</p><div class="am-res" id="cmAmRes" aria-live="polite"></div></div>
    <h3 class="cm-h">Photos</h3>${cPhotos(P + '/photos', hp.photos)}
    ${(hp.tour || []).length ? `<h3 class="cm-h">Photos by room</h3><div class="cm-list">${hp.tour.map((r, i) => cCard(`${P}/tour/${i}`, edShown(r.room), cmCount((r.photos || []).length, 'photo', 'photos'), `<div class="grid">${cf('Room name', `${P}/tour/${i}/room`, r.room, { i18n: true })}</div>${cPhotos(`${P}/tour/${i}/photos`, r.photos)}`, [i, hp.tour.length])).join('')}</div>` : ''}`;
}
// Amenities from the builder's list (engine/src/amenities.json), already named in every language: into the group of the
// same name (Ca La Kimberly's own groups too), or a new group at its place in the list's order.
const cmAmHas = (hp, x) => (hp.amenities || []).some(g => (g.items || []).some(i => Object.values(x.t).includes(edShown(i))));
function cmAmSearch() {
  const box = document.getElementById('cmAmRes'), inp = document.getElementById('cmAmQ'), hp = (edF() || {})['house-page']; if (!box || !inp || !hp) return;
  const q = amFold(inp.value); if (q.length < 2) { box.innerHTML = ''; return; }
  const hits = AMENS.items.filter(x => !amOld(x) && !cmAmHas(hp, x) && [...Object.values(x.t), ...(x.k ? x.k.split(',') : [])].some(w => amFold(w).includes(q))).slice(0, 10);
  box.innerHTML = hits.length ? hits.map(x => `<button class="btn small" type="button" data-amput="${esc(x.id)}" translate="no">+ ${esc(amT(x.t))}</button>`).join('') : '<p class="hint">Not in the list: add it as a line in one of the groups above.</p>';
}
function cmAmPut(id) {
  const x = AM_BY[id], hp = (edF() || {})['house-page']; if (!x || !hp || cmAmHas(hp, x)) return;
  const L = o => Object.fromEntries(edLangs().map(l => [l, o.t[l] || o.t.en])), G = AMENS.groups.find(g => g.id === x.g), list = hp.amenities = hp.amenities || [];
  let gi = list.findIndex(g => Object.values(G.t).includes(edShown(g.t)));
  if (gi < 0) { const order = AMENS.groups.map(g => g.id), at = list.findIndex(g => order.indexOf((AMENS.groups.find(o => Object.values(o.t).includes(edShown(g.t))) || {}).id) > order.indexOf(G.id)); gi = at < 0 ? list.length : at; list.splice(gi, 0, { t: L(G), items: [] }); }
  list[gi].items.push(L(x)); CM.open.add(`files/house-page/amenities/${gi}`);
}
document.addEventListener('input', e => { if (e.target.id === 'cmAmQ') cmAmSearch(); });
function cmHouseGuide(c) {
  const h = (c.files || {}).house || {}, blocks = ((c.files || {}).message || {}).blocks || [];
  return `<div class="grid">${cf('Check-out time', 'files/house/checkout', h.checkout || '', { type: 'time', half: true })}</div>
    <h3 class="cm-h">Parts of the house guide</h3><div class="cm-list">${blocks.map((b, i) => { const P = `files/message/blocks/${i}`;
      return cCard(P, edShown(b.title) || b.id, `${cmCount((b.items || []).length, 'line', 'lines')} · ${cmCount((b.photos || []).length, 'photo', 'photos')}`,
        `<div class="grid">${cf('Title', P + '/title', b.title, { i18n: true })}${b.sub ? cf('Line under the title', P + '/sub', b.sub) : ''}</div>
        <div class="f full"><span class="lab">Photos</span>${cPhotos(P + '/photos', b.photos)}</div><div class="f full"><span class="lab">What guests need to know</span>${cLines(P + '/items', b.items, 'Add a line')}</div>`, [i, blocks.length]); }).join('')}</div>`;
}
function cmWifi(c) {
  const w = (c.private || {}).wifi;
  if (!w) return `<div class="note"><div>This guide has no Wi-Fi card yet.</div></div><div><button class="btn primary" type="button" data-addwifi>Add Wi-Fi</button></div>`;
  return `<div class="grid">${cf('Password', 'private/wifi/password', w.password, { hint: 'Guests see it in the guide, so use your guest network if you have one.' })}</div>
    <h3 class="cm-h">Networks</h3>${(w.networks || []).map((n, i) => `<div class="cm-sub"><div class="grid">${cf('Network name', `private/wifi/networks/${i}/ssid`, n.ssid, { half: true })}${cf('Note for guests', `private/wifi/networks/${i}/label`, n.label, { i18n: true, half: true, ph: 'Best inside the house' })}</div>
      <div><button class="btn small danger" type="button" data-cdel="private/wifi/networks/${i}">Remove this network</button></div></div>`).join('')}
    <button class="btn small cm-add" type="button" data-addnet>+ Add a network</button>`;
}
const ED_BINS = [['organic', 'Organic'], ['packaging', 'Packaging'], ['paper', 'Paper'], ['glass', 'Glass'], ['rest', 'General waste']];
function cmRubbish(c) {
  const g = c.files.garbage, G = 'files/garbage', bins = ['street', ...Object.keys(g.bins || {}).filter(b => b !== 'street')];
  return `<div class="grid">${cf('Bins out by (time on collection morning)', G + '/collectionTime', g.collectionTime || '', { type: 'time', half: true, hint: 'Guests are told to put each bin out the evening before.' })}</div>
    ${(g.fractions || []).length ? `<h3 class="cm-h">What goes where</h3><div class="cm-list">${g.fractions.map((f, i) => { const P = `${G}/fractions/${i}`;
      return cCard(P, edShown(f.name) || f.id, (f.days || []).length ? (f.days || []).map(d => (ED_DAYS.find(x => x[0] === d) || [0, d])[1]).join(' ') : 'No collection day', `<div class="grid">${cf('Name', P + '/name', f.name, { i18n: true, half: true })}
        <div class="f"><label for="${cmId(P + '/bin')}">Goes in</label><select id="${cmId(P + '/bin')}" data-p="${P}/bin" data-t="str">${bins.map(b => `<option value="${esc(b)}"${f.bin === b ? ' selected' : ''}>${esc(b === 'street' ? 'A container in the street' : edShown((g.bins || {})[b]) || b)}</option>`).join('')}</select></div>
        <div class="f full"><span class="lab">Collection days</span><div class="chips">${cDays(P, f.days)}</div></div>${cf('What goes in it', P + '/examples', f.examples, { i18n: true, long: true, rows: 2 })}</div>`); }).join('')}</div>` : ''}
    <h3 class="cm-h">Containers guests can use</h3><div class="cm-list">${(g.containers || []).map((ct, j) => { const P = `${G}/containers/${j}`;
      return cCard(P, edShown(ct.where) || 'Containers ' + (j + 1), (ct.takes || []).map(id => (ED_BINS.find(b => b[0] === id) || [0, id])[1]).join(', '), `<div class="grid">${cf('Where they are', P + '/where', ct.where, { i18n: true, long: true, rows: 2 })}${cf('Google Maps link', P + '/map', ct.map || '', { type: 'url' })}
        <div class="f full"><span class="lab">What they take</span><div class="chips">${ED_BINS.map(([id, l]) => `<button class="chip" type="button" data-ctake="${j}" data-id="${id}" aria-pressed="${(ct.takes || []).includes(id)}"><span>${l}</span></button>`).join('')}</div></div></div>
        <div><button class="btn small danger" type="button" data-cdel="${P}">Delete these containers</button></div>`); }).join('')}</div>
    <button class="btn small cm-add" type="button" data-addcont>+ Add containers</button>
    ${(g.steps || []).length ? `<h3 class="cm-h">How to sort</h3>${cLines(G + '/steps', g.steps, 'Add a step')}` : ''}
    ${g.missed || g.deixalleria ? `<div class="grid">${g.missed ? cf('If a collection is missed', G + '/missed', g.missed, { long: true }) : ''}${g.deixalleria ? cf('Recycling centre', G + '/deixalleria', g.deixalleria, { long: true }) : ''}</div>` : ''}`;
}
function cmContacts(c) {
  const groups = ((c.files || {}).emergency || {}).groups || [], title = { urgent: 'Urgent', health: 'Health', police: 'Police and roads', town: 'Town and services' };
  return groups.map((g, gi) => `<h3 class="cm-h">${esc(title[g.id] || g.id)}</h3><div class="cm-list">${(g.items || []).map((it, i) => cItem(`files/emergency/groups/${gi}/items`, it, i, 'contact')).join('')}</div>
    <button class="btn small cm-add" type="button" data-addit="files/emergency/groups/${gi}/items">+ Add a contact</button>`).join('') || '<div class="note"><div>This guide has no contacts yet.</div></div>';
}
// Taxis, stations and bus stops are in Getting around; a bar or restaurant from your list can also be pinned from Eat and drink.
const ED_TILES = [['food', 'Add a bar or restaurant', 'Restaurant', { phone: '', lat: 0, lng: 0, gmaps: '' }], ['shop', 'Add a shop', 'Shop', { phone: '', lat: 0, lng: 0, gmaps: '' }]];
function cmHomeTiles(c) {
  const items = ((c.files || {}).quick || {}).items || [];
  return `<div class="cm-list">${items.map((it, i) => cItem('files/quick/items', it, i, 'tile')).join('') || '<p class="hint">No tiles yet.</p>'}</div>
    <div class="cm-row">${ED_TILES.map(([icon, label]) => `<button class="btn small" type="button" data-addtile="${icon}">+ ${esc(label)}</button>`).join('')}</div>
    <p class="hint">Taxis, train stations and bus stops go in <a href="#transport">Getting around</a>, which can have its own tile here.</p>`;
}
function edAddTile(icon) {
  const f = edF(), q = f.quick = f.quick || { items: [] }; q.items = q.items || [];
  const [, , kind, extra] = ED_TILES.find(t => t[0] === icon), L = x => Object.fromEntries(edLangs().map(l => [l, x]));
  q.items.push({ id: `${icon}-${Date.now().toString(36)}`, icon, name: L(kind), sub: L(''), title: L(''), kind: L(kind), what: L(''), ...cmClone(extra) });
  CM.open.add('files/quick/items/' + (q.items.length - 1));
}
function cmPlaces(path, what) {
  const arr = edGet(edC(), edPath(path)) || [];
  if (PL_SEC[path] && CM.pfLoaded !== true) pfLoad();   // lookups of a place's facts still running, or done while away
  return `${path === MK_PATH ? heldNote() : ''}${lkList(path, what)}${PL_SEC[path] ? cmUnnamed(path) : ''}${FIND_OF[path] ? cmFindHTML(path) : ''}${arr.length > 8 ? `<div class="f full"><label for="c_filter">Find ${esc(aAn(what))}</label><input id="c_filter" type="text" enterkeyhint="search" autocomplete="off" data-cfilter placeholder="Name or town"></div>` : ''}
    <div class="cm-list">${arr.map((it, i) => cItem(path, it, i, what)).join('') || `<p class="hint">Nothing here yet.</p>`}</div>
    <div><button class="btn small primary" type="button" data-addit="${path}">+ Add ${esc(aAn(what))}</button></div>
    <p class="hint">A new ${esc(what)} has no pin yet: find it on Google, or paste its Google Maps link. The distance from the house follows the pin.</p>`;
}

// Places the build could not name (generate-site.py, "unnamed" beside the file's items: picked on Google or kept in the deck,
// no words of the host that name them, none in our directory). Never shown to guests, never published nameless: each one
// waits here, first in its step and under "Needs you", with what is known of it (matched on Google Maps by its id, the
// distance, the host's comment) and a Name field. A name moves it into the list, open, and its facts are looked up.
const unPath = path => path.replace(/\/items$/, '/unnamed');
const cmUnnamedOf = (c, path) => { const f = (c.files || {})[path.split('/')[1]] || {}; return Array.isArray(f.unnamed) ? f.unnamed : []; };
function cmUnnamed(path) {
  const arr = cmUnnamedOf(edC(), path), base = unPath(path); if (!arr.length) return '';
  return `<section class="cm-unn" aria-label="Waiting for a name"><b>Waiting for a name</b><p class="hint">Our open directory has no name for ${arr.length > 1 ? 'these places' : 'this place'}. Guests see ${arr.length > 1 ? 'each one' : 'it'} once you name it.</p>
    ${arr.map((it, i) => { const q = `${base}/${i}`, c = edShown(it.description || {}), km = cKm(it);
      return `<div class="cm-unr"><p class="cm-unl"><span aria-hidden="true">✓</span> Matched on <a href="${esc(it.gid ? gmLink('', it.gid) : it.gmaps || '')}" target="_blank" rel="noopener" translate="no">Google Maps</a>${km ? `<span class="pl-nw" translate="no"> · ${esc(km)}</span>` : ''}${c ? `<span class="cm-unc" translate="no">${esc(c)}</span>` : ''}</p>
        <input type="text" id="${cmId(q + '/n')}" data-unname="${esc(q)}" placeholder="Type its name" aria-label="Name of this place" autocomplete="off" enterkeyhint="done"><button class="cm-x" type="button" data-cdel="${esc(q)}" data-now="1" aria-label="Delete this place">×</button></div>`; }).join('')}</section>`;
}
function cmUnname(t) {
  const v = t.value.trim(), q = t.dataset.unname, ip = edPath(q), a = edGet(edC(), ip.slice(0, -1)), it = a && a[ip[ip.length - 1]]; if (!v || !it) return;
  a.splice(ip[ip.length - 1], 1);
  const f = edGet(edC(), ip.slice(0, -2)); if (f && !a.length) delete f.unnamed;
  const items = f.items = f.items || [], p = `${ip.slice(0, -2).join('/')}/items/${items.length}`;
  it.name = L6(v); if (it.gid) it.gmaps = gmLink(v, it.gid); if (!it.id || items.some(x => x.id === it.id)) it.id = 'custom-' + Date.now().toString(36);
  items.push(it); CM.open.add(p); cmQueue(); render();
  if (!it.filled) pfStart(p);
}

/* --- Getting around: taxis, then stations and stops, on their own page (content/transport.json, section kind "transport") ---
   Its "tile" puts a one-tap tile on Home (the engine adds it after the Home tiles). Positions come from a Google Maps link. */
I.train = svg('<rect x="5.5" y="3" width="13" height="13" rx="3"/><path d="M5.5 10h13"/><circle cx="9" cy="13" r=".9" fill="currentColor"/><circle cx="15" cy="13" r=".9" fill="currentColor"/><path d="M8.5 16l-2 4.5M15.5 16l2 4.5M7.5 19h9"/>');
I.star = svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>');
const GA = { en: 'Getting around', es: 'Cómo moverse', fr: 'Se déplacer', ca: "Com moure's", de: 'Unterwegs', nl: 'Vervoer' };
const L6 = x => Object.fromEntries(edLangs().map(l => [l, typeof x === 'object' ? (x[l] || x.en || '') : x]));
function cmTrSub(c) {
  const T = (c.files || {}).transport || {}, n = (T.taxis || []).length, m = (T.stations || []).length;
  return n || m ? [n ? cmCount(n, 'taxi', 'taxis') : '', m ? cmCount(m, 'station or stop', 'stations and stops') : ''].filter(Boolean).join(', ') : 'Taxis, trains, buses';
}
// Nightlife: the file, its section row (after Attractions) and its switch, made with the first place.
function cmNightEnsure() {
  const f = edF(); f.nightlife = f.nightlife || { items: [] };
  const ss = (f.sections = f.sections || { sections: [] }).sections = f.sections.sections || [];
  if (!ss.some(x => x.id === 'nightlife')) { const at = ss.findIndex(x => x.id === 'todo'); ss.splice(at < 0 ? ss.length : at + 1, 0, { id: 'nightlife', group: 'area', kind: 'spots', labelKey: 'nightlife', status: 'live', color: 'nightlife' }); }
  const site = edC().site = edC().site || {}; site.modules = { ...(site.modules || {}), nightlife: true };
}
// The file, its section row and its switch, made the first time something is added (a guide built without one).
function cmTrEnsure() {
  const f = edF(); f.transport = f.transport || { taxis: [], stations: [], tile: null };
  const ss = (f.sections = f.sections || { sections: [] }).sections = f.sections.sections || [];
  if (!ss.some(x => x.id === 'transport')) { const at = ss.findIndex(x => x.id === 'emergency'); ss.splice(at < 0 ? ss.length : at + 1, 0, { id: 'transport', kind: 'transport', group: 'house', status: 'live', labelKey: 'gettingAround' }); }
  const site = edC().site = edC().site || {}; site.modules = { ...(site.modules || {}), transport: true };
  return f.transport;
}
const cmMode = s => s.mode === 'bus' ? 'bus stop' : 'station';
function cTaxi(p, x) {
  return cCard(p, edShown(x.name) || 'New taxi', [x.phone, x.always ? 'open 24 h' : ''].filter(Boolean).join(' · '), `<div class="grid">${cf('Name', p + '/name', x.name, { i18n: true, half: true })}${cf('Phone', p + '/phone', x.phone || '', { type: 'tel', half: true })}
    ${cf('Line under the name', p + '/sub', x.sub, { i18n: true, ph: 'Home pickup in about 30 min' })}${cf('What guests need to know', p + '/what', x.what, { i18n: true, long: true })}</div>
    ${cSwitch(`data-cbool="${p}/always"`, 'Open 24 h', !!x.always)}
    <div class="f full"><span class="lab">Other numbers</span>${(x.alt || []).map((a, j) => `<div class="cm-dayrow"><div class="grid" style="flex:1">${cf('Name', `${p}/alt/${j}/name`, a.name, { i18n: true, half: true })}${cf('Phone', `${p}/alt/${j}/phone`, a.phone || '', { type: 'tel', half: true })}</div><button class="cm-x" type="button" data-cdel="${p}/alt/${j}" data-now="1" aria-label="Remove this number">×</button></div>`).join('')}
      <button class="btn small cm-add" type="button" data-addalt="${p}/alt">+ Add another number</button></div>
    <div><button class="btn small danger" type="button" data-cdel="${p}">Delete this taxi</button></div>`);
}
function cStation(p, s) {
  const placed = typeof s.lat === 'number' && !(s.lat === 0 && s.lng === 0), L = (CM.lines || {})[s.id] || {}, auto = s.auto || {}, more = p + '/more';
  const badges = (s.badges || []).filter(b => b.t).map(b => `<span class="cm-badge" style="background:${esc(b.c || '#1D4FA0')};color:${b.ink ? '#121212' : '#fff'}">${esc(b.t)}</span>`).join('');
  const to = (s.to || []).filter(d => edShown(d.dest)).map(d => `<li><b>${esc(edShown(d.dest))}</b>${d.time ? ' ' + esc(d.time) : ''}${edShown(d.note) ? ' · ' + esc(edShown(d.note)) : ''}</li>`).join('');
  const found = `<div class="cm-found"><div class="cm-row cm-foundh"><b>Lines and where they go</b><button class="btn small" type="button" data-trlines="${esc(s.id)}"${L.busy || !placed ? ' disabled' : ''}>${L.busy ? 'Looking…' : badges ? 'Refresh the lines' : 'Find the lines'}</button></div>
      <p class="hint" id="cmLines-${esc(s.id)}" role="status">${esc(L.msg || (!placed ? 'Set its pin first (below), then we look up its lines.' : auto.checked ? `Found on the web${auto.operator ? ' (' + auto.operator + ')' : ''}, checked ${auto.checked}. Refresh any time.` : badges ? 'Refresh to look them up again.' : 'We look up the lines through it and where they go. Nothing to type.'))}</p>
      ${badges ? `<div class="cm-badges">${badges}</div>` : ''}${to ? `<ul class="cm-to">${to}</ul>` : ''}</div>`;
  return cCard(p, edShown(s.name) || 'New ' + cmMode(s), [s.mode === 'bus' ? 'Bus' : 'Train', s.min ? s.min + ' min by car' : '', (s.badges || []).filter(b => b.t).map(b => b.t).slice(0, 4).join(' '), placed ? '' : 'no pin yet'].filter(Boolean).join(' · '), `${found}
    <div class="grid">${cf('In a few words', p + '/tag', s.tag, { i18n: true, half: true, ph: 'Reliable, slow' })}${cf('Minutes by car from the house', p + '/min', s.min, { type: 'number', half: true })}
    ${cf('What guests need to know', p + '/what', s.what, { i18n: true, long: true, ph: 'What only you know: is it reliable, is there internet on the way, where to park, which ticket to buy' })}</div>
    <details class="cm-more" data-open="${esc(more)}"${CM.open.has(more) ? ' open' : ''}><summary>Change the name, the pin, the lines or the times by hand</summary><div class="grid">
    <div class="f"><label for="${cmId(p + '/mode')}">Kind</label><select id="${cmId(p + '/mode')}" data-p="${p}/mode" data-t="str"><option value="train"${s.mode !== 'bus' ? ' selected' : ''}>Train station</option><option value="bus"${s.mode === 'bus' ? ' selected' : ''}>Bus stop</option></select></div>
    ${cf('Name', p + '/name', s.name, { i18n: true, half: true })}${cf('Timetable link', p + '/link', s.link || '', { type: 'url', half: true })}${cf('Google Maps link', p + '/gmaps', s.gmaps || '', { type: 'url', half: true })}
    <div class="f full"><label for="${cmId(p + '/gm')}">Move the pin: paste a Google Maps link</label><p class="hint">${placed ? `Now at ${(+s.lat).toFixed(4)}, ${(+s.lng).toFixed(4)}${s.km ? `, ${s.km} km from the house` : ''}.` : 'It shows in the guide once its pin is set.'} Use the long link from the browser bar: it holds the position.</p><input id="${cmId(p + '/gm')}" type="text" inputmode="url" data-gm="${p}" placeholder="https://www.google.com/maps/…"></div></div>
    <div class="f full"><span class="lab">Lines</span><p class="hint">Short names in the line's colour, like R4.</p>${(s.badges || []).map((b, j) => `<div class="cm-dayrow"><input type="text" data-p="${p}/badges/${j}/t" data-t="str" value="${esc(b.t || '')}" aria-label="Line name" placeholder="R4"><input type="color" class="cm-lc" data-p="${p}/badges/${j}/c" data-t="str" value="${esc(/^#[0-9a-f]{6}$/i.test(b.c || '') ? b.c : '#1D4FA0')}" aria-label="Line colour"><button class="cm-x" type="button" data-cdel="${p}/badges/${j}" data-now="1" aria-label="Remove this line">×</button></div>`).join('')}
      <button class="btn small cm-add" type="button" data-addbadge="${p}/badges">+ Add a line</button></div>
    <div class="f full"><span class="lab">Journey times</span>${(s.to || []).map((d, j) => `<div class="cm-sub"><div class="grid">${cf('To', `${p}/to/${j}/dest`, d.dest, { i18n: true, half: true, ph: 'Barcelona' })}${cf('Time', `${p}/to/${j}/time`, d.time || '', { half: true, ph: '1 h 30' })}${cf('Note', `${p}/to/${j}/note`, d.note, { i18n: true, ph: '1 change' })}</div><div><button class="btn small danger" type="button" data-cdel="${p}/to/${j}" data-now="1">Remove this destination</button></div></div>`).join('')}
      <button class="btn small cm-add" type="button" data-addto="${p}/to">+ Add a destination</button></div>
    </details>
    <div><button class="btn small danger" type="button" data-cdel="${p}">Delete this ${cmMode(s)}</button></div>`);
}
// Stations and stops (29 Oct 2026, Yohann: "the host only adds added-value data"): the host gives a name or a Google Maps
// link; Google gives the place, and the guide worker looks up the lines through it and the main places they reach (job
// "find-transport", worker/guide-worker.mjs transportJob), in the guide's languages. "Refresh the lines" asks again. The host
// writes only what only they know; everything we found stays editable under "by hand".
const cmStopWord = /station|estaci|gare|bahnhof|stazione|halt|stop|parada|arr[eê]t|\bbus\b|tren|train|metro|tram/i;
const cmMin = km => km ? Math.max(2, Math.round(km * 1.1 + 1)) : 0;   // by car from the house: a first guess the host can change
async function cmStopAdd(btn) {
  const mode = (document.getElementById('c_stopmode') || {}).value === 'bus' ? 'bus' : 'train', v = ((document.getElementById('c_stopq') || {}).value || '').trim(), h = edF().house || {};
  if (!v) { CM.stopMsg = 'Type its name, or paste its Google Maps link.'; return render(); }
  CM.stopMsg = 'Looking it up on Google…'; if (btn) btn.disabled = true; render();
  try {
    const link = /^https?:\/\//.test(v), pos = link ? edParseMaps(v) : null;
    const named = link ? decodeURIComponent((v.match(/\/place\/([^/@?]+)/) || [])[1] || '').replace(/\+/g, ' ') : v;
    // Google gives the id and the position only (dated: kept 30 days, renewed by the monthly run); the name is the host's.
    let place = null;
    if (named && h.lat) {
      const q = cmStopWord.test(named) ? named : `${named} ${mode === 'bus' ? 'bus stop' : 'train station'}`;
      const d = await (await fetch(`/api/places?q=${encodeURIComponent(q)}&lat=${h.lat}&lng=${h.lng}`)).json();
      place = d && d.place;
      if (place && pos && edKm(pos.lat, pos.lng, place.lat, place.lng) > 1) place = null;   // the link wins over a namesake elsewhere
    }
    if (!place && pos) place = { lat: pos.lat, lng: pos.lng, km: h.lat ? edKm(h.lat, h.lng, pos.lat, pos.lng) : 0 };
    if (!place) throw new Error(link ? 'This link has no place in it. Use the long link from the browser bar, or type the name.' : 'Not found on Google. Try its full name, or paste its Google Maps link.');
    const name = psWords(named);
    if (!name) throw new Error('Found the spot, but not its name. Type its name instead.');
    const T = cmTrEnsure(), id = mode + '-' + Date.now().toString(36), g = place.id ? { gid: place.id, pos: gPos() } : {};
    (T.stations = T.stations || []).push({ id, mode, name: L6(name), lat: place.lat, lng: place.lng, km: place.km || 0, ...g, min: cmMin(place.km), tag: L6(''), what: L6(''), link: '', gmaps: place.id ? gmLink(name, place.id) : (link ? v : ''), badges: [], to: [] });
    CM.open.add('files/transport/stations/' + (T.stations.length - 1));
    CM.stopMsg = ''; cmQueue(); render(); cmLines(id);
  } catch (e) { CM.stopMsg = /fetch/i.test(e.message) ? 'Google could not be reached. Try again.' : e.message; render(); }
}
async function cmLines(id) {
  CM.lines = CM.lines || {};
  const s = ((edF().transport || {}).stations || []).find(x => x.id === id); if (!s || (CM.lines[id] || {}).busy) return;
  const st = CM.lines[id] = { busy: true, msg: 'Looking up the lines through it and where they go. About a minute.' }; render();
  const end = msg => { st.busy = false; st.msg = msg; render(); };
  try {
    await cmSave();
    const j = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: CM.g.id, kind: 'find-transport', langs: edLangs(), params: { id, mode: s.mode, name: edShown(s.name), lat: s.lat, lng: s.lng } } });
    const jid = j && j[0] && j[0].id; if (!jid) throw new Error('Could not start');
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 4000)); await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs?select=status,message,result&id=eq.' + jid), x = r && r[0]; if (!x) continue;
      if (x.status === 'failed') return end('Did not work: ' + (x.message || 'try again later'));
      if (x.status === 'done') { const n = cmLinesApply(x.result || {}); if (n) cmQueue(); return end(n ? `Found ${cmCount(n, 'line', 'lines')}${(x.result.to || []).length ? ' and ' + cmCount(x.result.to.length, 'destination', 'destinations') : ''}. Check them, add your own words, then publish.` : (x.message || 'No lines found on the web. Add them by hand below.')); }
      if (x.message && x.message !== st.msg) { st.msg = x.message; const el = document.getElementById('cmLines-' + id); if (el) el.textContent = x.message; }
    }
    end('Still looking. Press Refresh in a while.');
  } catch (e) { end('Did not work: ' + niceError(e)); }
}
// What the worker found goes into this open copy too (it also saved it in the draft), so nothing typed meanwhile is lost.
function cmLinesApply(r) {
  const s = ((edF().transport || {}).stations || []).find(x => x.id === r.id); if (!s) return 0;
  if (Array.isArray(r.badges)) s.badges = r.badges;
  if (Array.isArray(r.to)) s.to = r.to;
  if (r.link && (!s.link || s.link === (s.auto || {}).link)) { s.link = r.link; s.linkKey = 'timetable'; }   // never over the host's own link
  const ls = edLangs(), nm = s.name || {};
  if (r.name && ls.every(l => (nm[l] || '') === (nm[ls[0]] || ''))) s.name = { ...nm, ...r.name };   // still the one name Google gave: now in each language
  s.auto = { checked: r.checked, operator: r.operator || '', link: r.link || '', sources: r.sources || [] };
  return (r.badges || []).length;
}
function cmTransport(c) {
  const T = (c.files || {}).transport, P = 'files/transport';
  const adds = `<div class="cm-find cm-stopadd"><b>Add a train station or bus stop</b><p class="hint">Its name, or its Google Maps link. We find it on the map, then look up its lines and where they go.</p>
      <div class="cm-row"><select id="c_stopmode" aria-label="Train station or bus stop"><option value="train">Train station</option><option value="bus">Bus stop</option></select><input id="c_stopq" type="text" enterkeyhint="go" placeholder="Name or Google Maps link" aria-label="Its name, or its Google Maps link"><button class="btn small primary" type="button" data-stopadd>Add</button></div>
      ${CM.stopMsg ? `<p class="hint" role="status">${esc(CM.stopMsg)}</p>` : ''}</div>
    <div class="cm-row"><button class="btn small" type="button" data-tradd="taxi">+ Add a taxi</button></div>`;
  if (!T) return `<div class="note"><div>No taxis or stations yet. Add the ones you would tell a friend about.</div></div>${adds}`;
  return `${cSwitch('data-trtile', 'Show as a tile on the home page', !!T.tile, 'Getting around always has its own page. As a tile it also sits with your other Home tiles, one tap away.')}
    ${T.tile ? `<div class="grid">${cf('Tile title', P + '/tile/name', T.tile.name, { i18n: true, half: true, ph: 'Taxi & train' })}${cf('Line under it', P + '/tile/sub', T.tile.sub, { i18n: true, half: true, ph: 'Taxi in 30 min, 3 stations' })}</div>` : ''}
    <div class="grid">${cf('Line under the page title', P + '/lead', T.lead, { i18n: true, ph: 'Three ways to get around without a car.' })}</div>
    <h3 class="cm-h">Taxis</h3><div class="cm-list">${(T.taxis || []).map((x, i) => cTaxi(`${P}/taxis/${i}`, x)).join('') || '<p class="hint">No taxi yet.</p>'}</div>
    <h3 class="cm-h">Stations and stops</h3><div class="cm-list">${(T.stations || []).map((x, i) => cStation(`${P}/stations/${i}`, x)).join('') || '<p class="hint">No station or stop yet.</p>'}</div>${adds}`;
}
function cmTrAdd(kind) {
  const T = cmTrEnsure(), id = kind + '-' + Date.now().toString(36);
  if (kind === 'taxi') { (T.taxis = T.taxis || []).push({ id, name: L6(''), sub: L6(''), phone: '', what: L6('') }); CM.open.add('files/transport/taxis/' + (T.taxis.length - 1)); }
  else { (T.stations = T.stations || []).push({ id, mode: kind, name: L6(''), lat: 0, lng: 0, km: 0, min: 0, tag: L6(''), what: L6(''), link: '', badges: [], to: [] }); CM.open.add('files/transport/stations/' + (T.stations.length - 1)); }
}
function cmTrTile() {
  const T = cmTrEnsure();
  if (T.tile) { CM.trTile = T.tile; T.tile = null; return; }   // remembered, so switching it back on keeps its words
  T.tile = CM.trTile || { name: L6(GA), sub: L6(((T.taxis || [])[0] || {}).sub || '') };
}

/* --- Progress bars for everything that takes a while: searches, translations, a guide being built ---
   The worker says which step it is on (the job's message). Inside a step the bar moves with time, slowing down as it
   nears the step's end, so it never stops and never runs past the step; a count ("3 of 8") moves it by item. One ticker
   updates every bar on the page each second. Steps: [pattern, from %, to %, usual seconds (per item for a count)]. */
const PROG_STEPS = {
  places: [[/Searching the web/, 4, 70, 210], [/Checking on Google: (\d+) of (\d+)/, 70, 85, 2], [/Translating/, 85, 98, 60]],
  events: [[/Searching the web/, 4, 85, 240], [/Translating/, 85, 98, 60]],
  translate: [[/Translating (\d+) of (\d+)/, 5, 97, 45]],
  art: [[/Reading your photo/, 3, 8, 8], [/Drawing your cover/, 8, 94, 70], [/Saving your cover/, 94, 99, 5]],
  facts: [[/Looking for its website/, 4, 45, 12], [/Reading its website/, 45, 97, 20]],   // a place's facts (place-facts): about 20 s
  // A guide's build has its own steps and clock (progBuild): [step, usual seconds, does it run for this guide?], in the
  // worker's order (worker/guide-worker.mjs, build). Measured on the server on 11 Nov 2026, a guide in six languages: the
  // contacts found in 85 s (Researching: emergency, which ran at that build), translation 600 s for five languages beyond
  // the guide's own (120 s each), the generator a few seconds, saving 13 s. The host's places took a second there (their
  // facts were already kept); a place never seen is read from its website in about 15 s (the editor's lookup, 11 Nov). The research runs at the build only when it was not done while the host answered.
  build: [[/Reading your answers/, 5], [/Finding your favourite places/, () => Math.min(180, 15 * buildPlaces()), () => buildPlaces() > 0], [/Finishing the research/, 120, () => false],
    [/Researching: markets/, 180, () => !(AREA.full || {}).markets], [/Researching: todo/, 180, () => !(AREA.full || {}).todo], [/Researching: emergency/, 85, () => !(AREA.quick || {}).emergency],
    [/Building the guide/, 10], [/Translating/, () => 120 * Math.max(1, buildLangs().length), () => buildLangs().length > 0], [/Saving the guide/, 15]]
};
// What the build works from: the languages beyond the guide's own (the worker translates into those, and into its own for
// texts in another language), and the host's places it looks up (worker placesOf: their lists and the cards they kept).
const BUILD_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
const buildSrc = () => BUILD_LANGS.includes(A.sourceLang) ? A.sourceLang : 'en';
const buildLangs = () => [...new Set((A.languages || []).filter(l => BUILD_LANGS.includes(l) && l !== buildSrc()))];
const buildPlaces = () => ['favEat', 'favNight', 'favDo'].reduce((n, k) => n + placeRows(k).length, 0) + Object.values(A.swipes || {}).filter(x => x && x.d === 'yes').length;
const progSecs = x => typeof x[1] === 'function' ? x[1]() : x[1], progRuns = x => !x[2] || x[2]();
// "about 9 min left" only while a step is within its usual time; past it, no number that could be wrong (Yohann, 11 Nov
// 2026: "less than a minute left" stayed on screen for ten minutes of translation).
const progLeft = s => s >= 90 ? `about ${Math.round(s / 60)}\u00a0min left` : s >= 45 ? 'about a minute left' : 'less than a minute left';
// The bar follows time: the share of the build's time spent since this page has followed it, out of that plus the time
// left (the rest of this step and the steps still to run). A step past its usual time keeps a little time left, so the bar
// slows down near the end instead of stopping or filling up.
function progBuild(j) {
  const now = Date.now(), S = PROG_STEPS.build, k = S.findIndex(x => x[0].test(j.message || ''));
  const total = S.filter(progRuns).reduce((a, x) => a + progSecs(x), 0);
  if (j.status === 'queued' || k < 0 && /^(Starting|Waiting)/.test(j.message || '')) {
    const wait = now - (j.since || now);
    return { pct: Math.max(j.shown || 0, 2), left: null, k: -1, words: 'Waiting for its turn',
      text: wait > 120000 ? 'Still waiting to start. Our service may be busy or paused: it starts by itself as soon as it can.' : `Waiting for its turn · then about ${Math.max(1, Math.round(total / 60))}\u00a0min` };
  }
  const words = ({ 'Researching: markets': 'Looking for markets', 'Researching: todo': 'Looking for things to do', 'Researching: emergency': 'Finding emergency numbers', 'Translating': 'Translating into your languages', 'Finding your favourite places': 'Looking up the places you recommend' })[j.message] || String(j.message || '').replace(/ · .*$/, '').replace(/^Starting again$/, 'Starting');
  if (k < 0) return { pct: Math.max(j.shown || 0, 3), text: words, left: null, k, words };
  if (j.startAt == null) j.startAt = j.phaseAt || now;
  const u = progSecs(S[k]), t = (now - (j.phaseAt || now)) / 1000, over = t - u, later = S.slice(k + 1).filter(progRuns).reduce((a, x) => a + progSecs(x), 0);
  const left = (over > 0 ? Math.max(10, u / 10) : u - t) + later, spent = (now - j.startAt) / 1000;
  const pct = j.shown = Math.min(99, Math.max(j.shown || 0, 3 + 96 * spent / (spent + left)));
  const when = over <= 0 ? progLeft(left) : over < Math.max(60, u / 2) ? (later < 60 ? 'almost there' : 'a little longer than usual') : 'taking longer than usual';
  return { pct, text: `${words} · ${when}`, left: over > 0 ? null : left, k, words };
}
const progEase = (t, tau) => 1 - Math.exp(-Math.max(0, t) / tau);
// A job's place on the bar and the time left, from its step and how long it has been in it.
function progOf(j, kind) {
  if (!j) return null;
  if (kind === 'build') return progBuild(j);
  const steps = PROG_STEPS[kind] || PROG_STEPS.events, now = Date.now();
  if (j.status === 'queued' || !j.message || /^Starting|^Waiting/.test(j.message)) {
    const wait = now - (j.since || now);
    return { pct: Math.max(j.shown || 0, 2), text: wait > 120000 ? 'Still waiting to start. Our service may be busy or paused: it starts by itself as soon as it can.' : 'Waiting to start…', left: null };
  }
  const k = steps.findIndex(x => x[0].test(j.message));
  let pct = j.shown || 4, left = null;
  if (k >= 0) {
    const [re, from, to, secs] = steps[k], t = (now - (j.phaseAt || j.since || now)) / 1000, m = j.message.match(re), later = steps.slice(k + 1).reduce((a, x) => a + x[3], 0);
    if (m && m[2]) { const i = Math.max(1, +m[1]), n = Math.max(i, +m[2]), per = secs; pct = from + (to - from) * ((i - 1 + progEase(t, per)) / n); left = (n - i + 1) * per - t + later; }
    else { pct = from + (to - from) * progEase(t, secs / 2); left = secs - t + later; }
    // A job that starts at a later step has its own scale from there: the bar starts near empty, not half full (Yohann,
    // 11 Nov 2026, about a build; builds now follow time, progBuild).
    if (j.k0 == null) j.k0 = k;
    const f0 = steps[j.k0][1]; if (j.k0 > 0 && k >= j.k0) pct = 3 + (pct - f0) * 96 / (99 - f0);
  }
  pct = Math.min(99, Math.max(j.shown || 0, pct)); j.shown = pct;   // never goes back
  const words = ({ 'Researching: markets': 'Looking for markets', 'Researching: todo': 'Looking for things to do', 'Researching: emergency': 'Finding emergency numbers', 'Translating': 'Translating into your languages' })[j.message] || j.message.replace(/ · .*$/, '').replace(/^Starting again$/, 'Starting');
  return { pct, text: words + (left == null ? '' : left > 75 ? ` · about ${Math.ceil(left / 60)} min left` : ' · less than a minute left'), left };
}
// The bar itself; its key says which job it follows (see progJob).
const progBar = (key, label, dark) => { const p = progOf(progJob(key), progKind(key)) || { pct: 2, text: '' };
  return `<div class="cm-progw${dark ? ' dark' : ''}" data-prog="${key}"><div class="cm-prog" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.pct)}"><i style="width:${p.pct.toFixed(1)}%"></i></div><p class="hint cm-progt">${esc(p.text)}</p></div>`; };
const progJob = key => key === 'auto' ? CM.evJob : key === 'tr' ? CM.trJob : key === 'art' ? CM.artJob : key === 'build' ? window.__buildJob : key.startsWith('pf:') ? (CM.pf || {})[key.slice(3)] : (CM.find || {})[key];
const progKind = key => key === 'tr' ? 'translate' : key === 'build' ? 'build' : key === 'art' ? 'art' : key.startsWith('pf:') ? 'facts' : key === 'find-todo' || key === 'find-markets' ? 'places' : 'events';
// A job's new state from the database: a new step restarts the clock of that step.
function progSet(j, st) { if (st.message !== j.message || st.status !== j.status) j.phaseAt = Date.now(); j.status = st.status; j.message = st.message; }
setInterval(() => document.querySelectorAll('[data-prog]').forEach(el => {
  const p = progOf(progJob(el.dataset.prog), progKind(el.dataset.prog)); if (!p) return;
  const bar = el.querySelector('.cm-prog'), i = el.querySelector('.cm-prog i'), t = el.querySelector('.cm-progt');
  i.style.width = p.pct.toFixed(1) + '%'; bar.setAttribute('aria-valuenow', Math.round(p.pct)); if (t.textContent !== p.text) t.textContent = p.text;
}), 1000);

/* --- Find more: the guide builder searches the web near the house; the host keeps or skips each suggestion ---
   The search runs as a job (worker/guide-worker.mjs, findJob): a few minutes, then the suggestions wait in the job's
   result for 14 days. Kept ones go into the draft like any change. Which ones were looked at is remembered in this browser. */
const FIND_OF = { 'files/todo/items': ['find-todo', 'things to do'], 'files/markets/markets': ['find-markets', 'markets'], 'files/events/items': ['find-events', 'events'] };
const FIND_SECTION = { todo: { kind: 'spots', color: 'todo', labelKey: 'whatToDo' }, markets: { kind: 'markets', labelKey: 'markets' }, events: { kind: 'events', color: 'events', labelKey: 'events' } };
CM.find = {};
const findSeen = id => { try { return new Set(JSON.parse(localStorage.getItem('cmfind:' + id) || '[]')); } catch (e) { return new Set(); } };
const findMark = (id, ids) => { try { const s = findSeen(id); ids.forEach(x => s.add(x)); localStorage.setItem('cmfind:' + id, JSON.stringify([...s])); } catch (e) { /* storage blocked: the card simply moves on */ } CM.findSkip = new Set([...(CM.findSkip || []), ...ids]); };
// Already in the guide, maybe under another name ("Living Nativity of Canyelles" added by the automatic search as
// "Pessebre vivent de Canyelles"): a shared real word in any language (not the town), and close by.
// Small words and words for a kind of place ("museum", "castle", "beach"...) say nothing about which one it is.
const CM_STOP = new Set(('the and of de del dels la les el els los las le du des et with near from von der die das het een van '
  + 'fair fira feria foire markt market mercat mercado marche festival festa fiesta fete fest feest museum museu museo musee castle castell castillo chateau burg kasteel '
  + 'church esglesia iglesia eglise kirche kerk beach platja playa plage strand park parc parque garden jardi jardin garten tuin tower torre tour turm toren '
  + 'house casa maison haus huis walk route ruta cami camino path sentier weg wandeling village poble pueblo dorf dorp town ciutat ciudad ville stadt stad old vella vieja vieille altstadt oude '
  + 'human towers tower castells castell castellers castellera colla colles diada diades torres tours chateaux humains humaines humanas humanos menschenturme menschenturm menselijke torens toren pilar pilars pilares '
  + 'day dia dag tag jour night nit noche nuit nacht sant santa san saint sankt sint major mayor summer winter christmas nadal navidad').split(' '));
const cmWords = it => { const town = String(it.town || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return new Set([it.name_local, ...Object.values(it.name || {})].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u00ad]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !CM_STOP.has(w) && !town.split(/[^a-z0-9]+/).includes(w))); };
const cmNear = (a, b) => typeof a.lat !== 'number' || typeof b.lat !== 'number' || edKm(a.lat, a.lng, b.lat, b.lng) <= 2;
const cmSamePlace = (a, b) => { const w = cmWords(a); return cmNear(a, b) && [...cmWords(b)].some(x => w.has(x)); };
// The suggestions worth showing (not in the guide), and those still to look at.
function cmFindPool(kind, path) {
  const f = CM.find[kind]; if (!f || f.status !== 'done') return [];
  const list = edGet(edC(), edPath(path)) || [], have = new Set(list.map(x => x.id)), seen = findSeen(f.id), skip = CM.findSkip || new Set();
  return (f.items || []).filter(it => (seen.has(it.id) || skip.has(it.id) || !have.has(it.id)) && !list.some(x => x.id !== it.id && cmSamePlace(x, it) && !seen.has(it.id)));
}
function cmFindItems(kind, path) {
  const f = CM.find[kind], list = edGet(edC(), edPath(path)) || [], seen = f && f.id ? findSeen(f.id) : new Set();
  return cmFindPool(kind, path).filter(it => !seen.has(it.id) && !(CM.findSkip || new Set()).has(it.id) && !list.some(x => x.id === it.id));
}
function cmFindHTML(path) {
  const kind = FIND_OF[path][0];
  if (!CM.find[kind]) cmFindLoad(kind);
  return `<div class="cm-find" id="cmFind" data-fpath="${path}">${cmFindInner(path)}</div>`;
}
/* --- Is a suggestion still open? (Yohann, 12 Nov 2026) Google's terms let us keep a place's id and nothing else it says, so
   its status is no longer asked by the worker and stored with the research (worker/research-check.mjs): it is asked here,
   live, when a host looks at a suggestion that has a Google id (the editor's Find more cards, the ready screen's cards in
   runtime.js; the deck asks it with the card's photo, start.js swLiveAsk), shown with "Google Maps" beside it, and used at
   once. A place Google says is permanently closed cannot be added: its accept button looks unavailable but still answers,
   with a toast; the host who knows better adds it by its name, in their own words. Temporarily closed is only shown, and no
   mark of ours comes from it. OPEN holds the answers for this session only, in memory, by Google id: 'wait' while asked,
   { closed: 'permanent' | 'temporary' | null }, or 'fail' (no key, offline, no answer). Never in the answers, a draft,
   this device's storage or the database. A failed ask never blocks a host: the accept goes through. --- */
const OPEN = {}, OPEN_P = {}, OPEN_WAIT = 4000;   // the longest an accept waits for Google before it goes through
const OPEN_SAY = { permanent: 'Permanently closed', temporary: 'Temporarily closed' }, OPEN_NO = 'Permanently closed on Google Maps: it cannot be added.';
// Asked once per id per session (again after a failure only when the host accepts: again).
function openAsk(gid, again = false) {
  if (!gid) return Promise.resolve(null);
  const s = OPEN[gid];
  if (s && typeof s === 'object') return Promise.resolve(s);
  if (OPEN_P[gid]) return OPEN_P[gid];
  if (s === 'fail' && !again) return Promise.resolve(null);
  OPEN[gid] = 'wait';
  return OPEN_P[gid] = fetch('/api/places?open=' + encodeURIComponent(gid), { signal: AbortSignal.timeout(9000) }).then(r => r.json())
    .then(d => d && d.ok ? { closed: d.closed === 'permanent' || d.closed === 'temporary' ? d.closed : null } : 'fail').catch(() => 'fail')
    .then(x => { OPEN[gid] = x; delete OPEN_P[gid]; if (x !== 'fail' && x.closed) openShow(gid); return x === 'fail' ? null : x; });
}
const openOf = gid => { const s = gid && OPEN[gid]; return s && typeof s === 'object' ? s.closed : null; };
// The answer came while its card is on screen: only a closed place changes the card (an open one shows nothing, so the card
// never moves for it). The focus stays on the same button.
function openShow(gid) {
  const on = [...document.querySelectorAll('.cm-fcard')].filter(c => c.dataset.gid === gid); if (!on.length) return;
  const a = document.activeElement, keep = a && a.closest && a.closest('.cm-fcard') ? ['cfadd', 'cfskip', 'rdadd', 'rdskip'].find(k => a.dataset[k] !== undefined) : null;
  for (const c of on) {
    if (c.closest('#bcards') && typeof readyCard === 'function') document.getElementById('bcards').innerHTML = readyCard();
    else if (c.closest('#cmFind')) cmFindRefresh();
  }
  if (keep) { const b = document.querySelector(`.cm-fcard[data-gid="${CSS.escape(gid)}"] [data-${keep}]`); if (b) b.focus({ preventScroll: true }); }
}
// Before a suggestion goes in: true when it may. Not known yet: asked first, the button busy (and no second tap), at most
// OPEN_WAIT; then a permanently closed one is refused with a toast, anything else (or no answer) goes in.
async function openGate(it, btn) {
  if (!it || !it.gid) return true;
  if (OPEN[it.gid] === undefined || OPEN[it.gid] === 'wait' || OPEN[it.gid] === 'fail') {
    if (btn) { if (btn.getAttribute('aria-busy') === 'true') return false; btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
    await Promise.race([openAsk(it.gid, true), new Promise(r => setTimeout(r, OPEN_WAIT))]);
    if (btn) { btn.removeAttribute('aria-busy'); btn.disabled = false; }
  }
  if (openOf(it.gid) === 'permanent') { toast(OPEN_NO); openShow(it.gid); return false; }
  return true;
}
// The line on the card, above the buttons: Google's word with "Google Maps" beside it (as the deck writes it under a card's
// rating), and for a permanently closed place what the host can do instead.
const openLine = (it, closed) => !closed ? '' : `<p class="cm-fclosed ${closed}"><b>${OPEN_SAY[closed]}</b> · <a href="${esc(it.gmaps || gmLink(edShown(it.name) || it.name_local, it.gid))}" target="_blank" rel="noopener" translate="no">Google Maps</a></p>`
  + (closed === 'permanent' ? '<p class="hint">It cannot be added. If you know it is open, add it yourself by its name.</p>' : '');
const cmDays = sch => (sch || []).map(r => `${(r.days || []).map(d => (ED_DAYS.find(x => x[0] === d) || [0, d])[1]).join(' ')} ${r.open || ''}${r.close ? '-' + r.close : ''}`).join(', ');
// o (the ready screen, runtime.js): its own words and buttons (data-rdadd, data-rdskip, data-rdstop), and why the place
// was suggested, from what the research says of it (kids, free, dogs: the guide's own marks, in the maker's language).
// A suggestion with a Google id shows whether Google says it is closed (openLine, asked as the card is drawn); one without
// keeps the research's own note that it was not found on Google (older results' "On Google" or "Temporarily closed on
// Google" are never shown: the status is only ever live).
function cmFindCard(it, i, n, o) {
  const today = new Date().toISOString().slice(0, 10), b = o ? 'rd' : 'cf';
  if (it.gid) openAsk(it.gid);
  const closed = it.gid ? openOf(it.gid) : null, gone = closed === 'permanent';
  const sub = [edIs18(it.type) ? edShown(it.type) : '', it.town, it.km_from_house != null ? it.km_from_house + ' km from the house' : ''].filter(Boolean).join(' · ');
  const when = (it.dates || []).filter(d => (d.end || d.start) >= today).map(d => `${d.start}${d.end && d.end !== d.start ? ' to ' + d.end : ''}, ${d.status === 'confirmed' ? 'confirmed' : 'expected'}`).join('; ');
  const hours = it.always ? 'Open any time' : cmDays(it.schedule);
  const why = o ? [['kidsfun', 't_kidsfun'], ['free', 't_free'], ['dogs', 't_dogs']].filter(([x]) => [...(it.tags || []), ...(it.flags || [])].includes(x) || (x === 'kidsfun' && it.kids)).map(([, w]) => engT(w)) : [];
  return `<article class="cm-fcard"${it.gid ? ` data-gid="${esc(it.gid)}"` : ''}><small>${o ? `Found near you · ${i} of ${n}` : `Suggestion ${i} of ${n}`}</small><h3>${esc(edShown(it.name))}</h3>${sub ? `<p class="cm-fsub">${esc(sub)}</p>` : ''}
    <p>${esc(edShown(it.description))}</p>${why.length ? `<p class="cm-fwhy" translate="no">${why.map(w => `<span>${esc(w)}</span>`).join('')}</p>` : ''}
    ${when ? `<p class="hint"><b>Dates:</b> ${esc(when)}</p>` : ''}${hours ? `<p class="hint"><b>Hours:</b> ${esc(hours)}</p>` : ''}${!it.gid && /^Not found on Google/.test(it._google || '') ? `<p class="hint">${esc(it._google)}</p>` : ''}
    <p class="cm-flinks">${it.gmaps ? `<a href="${esc(it.gmaps)}" target="_blank" rel="noopener">See it on Google Maps</a>` : ''}${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">Official page</a>` : ''}</p>
    ${openLine(it, closed)}
    <div class="cm-fbtns"><button class="btn small${gone ? ' primary' : ''}" type="button" data-${b}skip="${esc(it.id)}">${o ? 'Skip' : 'Not for us'}</button><button class="btn small${gone ? '' : ' primary'}" type="button" data-${b}add="${esc(it.id)}"${gone ? ' aria-disabled="true"' : ''}>${o ? 'Keep' : 'Add to my guide'}</button></div>
    ${!o || n - i > 0 ? `<button class="cm-fstop" type="button" data-${b}stop>Skip the rest</button>` : ''}</article>`;
}
const CM_TAKES = 'A search usually takes 3 to 6 minutes. You can keep editing, or come back later: the results wait here.';
function cmFindInner(path) {
  if (path === 'files/events/items') return cmEventsInner();   // events: one search, automatic or with cards (below)
  const [kind, what] = FIND_OF[path], f = CM.find[kind] || {};
  if (f.status === 'loading') return '<p class="hint">…</p>';
  if (f.status === 'queued' || f.status === 'running') return `<div class="cm-fhead"><b>Looking for more ${esc(what)}</b></div>${progBar(kind, 'Search for ' + what)}<p class="hint">${esc(CM_TAKES)}</p>`;
  const left = cmFindItems(kind, path), all = cmFindPool(kind, path).length;
  if (left[1] && left[1].gid) openAsk(left[1].gid);   // the next card's answer is ready when it comes up
  if (left.length) return cmFindCard(left[0], all - left.length + 1, all);
  const note = f.status === 'failed' ? `<p class="hint err">The search did not work: ${esc(f.message || 'try again later')}</p>` : f.status === 'done' ? `<p class="hint">${all ? 'You have looked at every suggestion from the last search.' : 'The last search found nothing new nearby.'}</p>` : '';
  return `<div class="cm-fhead"><b>Looking for more ${esc(what)}?</b></div><p class="hint">We search the web around the house for ${esc(what)} that are not in your guide yet, check each one on Google and translate it. It takes a few minutes, then you keep or skip each one.</p>${note}<div><button class="btn small sun" type="button" data-cfind="${path}">Find more ${esc(what)}</button></div>`;
}
function cmFindRefresh() { const el = document.getElementById('cmFind'); if (el) el.innerHTML = cmFindInner(el.dataset.fpath); }
async function cmFindLoad(kind) {
  CM.find[kind] = { status: 'loading' };
  try {
    await ensureFresh();
    // The markets a build held back (result.held, cmHeld below) are never this search's suggestions: the last few jobs are
    // read and the held one is passed over.
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const r = await sb(`/rest/v1/guide_jobs?select=id,status,message,result,created_at&guide_id=eq.${CM.g.id}&kind=eq.${kind}&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc&limit=5`), j = (r || []).find(x => !(x.result || {}).held) || null;   // the latest that is not a held job (told apart here, not by a filter on the job's result)
    CM.find[kind] = j ? { id: j.id, status: j.status, message: j.message, items: (j.result || {}).items || [], since: Date.parse(j.created_at) } : { status: 'none' };
    if (j && (j.status === 'queued' || j.status === 'running')) cmFindPoll(kind);
  } catch (e) { CM.find[kind] = { status: 'none' }; }
  cmFindRefresh();
}
async function cmFindStart(path) {
  const kind = FIND_OF[path][0];
  CM.find[kind] = { status: 'queued', since: Date.now() }; cmFindRefresh();
  try {
    await cmSave(); await ensureFresh();
    const j = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: CM.g.id, kind, langs: edLangs() } });
    const id = j && j[0] && j[0].id; if (!id) throw new Error('Could not start');
    CM.find[kind] = { id, status: 'queued', since: Date.now() }; cmFindRefresh(); cmFindPoll(kind);
  } catch (e) { CM.find[kind] = { status: 'failed', message: niceError(e) }; cmFindRefresh(); }
}
async function cmFindPoll(kind) {
  const f = CM.find[kind]; if (!f || f.polling) return; f.polling = true;
  for (let i = 0; i < 360 && CM.find[kind] === f; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs?select=status,message,result&id=eq.' + f.id), st = r && r[0]; if (!st) continue;
      const was = f.status; progSet(f, st);
      if (st.status === 'done') { f.items = (st.result || {}).items || []; if (f.items.length) toast(`${f.items.length} suggestions ready`); }
      if (st.status !== was || st.status === 'done' || st.status === 'failed') cmFindRefresh();   // the bar follows by itself
      if (st.status === 'done' || st.status === 'failed') break;
    } catch (e) { /* offline for a moment: try again */ }
  }
  f.polling = false;
}
// A suggestion into the guide's draft, marked as looked at: the editor's Find more cards (cmFindAdd) and the cards on the
// ready screen (runtime.js). Returns the new entry.
function cmFindPut(path, sid) {
  const kind = FIND_OF[path][0], f = CM.find[kind], it = f && (f.items || []).find(x => x.id === sid); if (!it) return null;
  const n = cmPutIn(edC(), path, it);
  findMark(f.id, [sid]); return n;
}
// A found place into a guide's content c: the draft the editor holds (cmFindPut), or a copy of the live guide and of the
// draft (the markets the build held back, cmHeld). Its section made live and switched on, so it shows; o.keepOff: a section
// the host switched off stays off. Returns the new entry.
function cmPutIn(c, path, it, o = {}) {
  const n = cmClone(it);
  // An older result's "check" that came from Google saying it was temporarily closed is not ours to keep (its status is only
  // ever live now), nor the date Google was asked.
  if (/^Temporarily closed/.test(n._google || '') && Array.isArray(n.flags)) n.flags = n.flags.filter(x => x !== 'check');
  delete n._google; delete n._card; delete n.look; delete n.checked;   // a suggestion is new to the guide: no note of the monthly check
  let a = edGet(c, edPath(path)); if (!Array.isArray(a)) { edSet(c, edPath(path), []); a = edGet(c, edPath(path)); }
  a.push(n);
  const F = c.files = c.files || {}, sec = path.split('/')[1], fl = F[sec];
  if (sec === 'markets' && n.category) { fl.categories = fl.categories || []; if (!fl.categories.includes(n.category)) fl.categories.push(n.category); }
  // The section must exist and be live in the guide for the new place to show (a guide built without events had none).
  const ss = (F.sections = F.sections || { sections: [] }).sections = F.sections.sections || [];
  const row = ss.find(x => x.id === sec); if (!row) ss.push({ id: sec, ...FIND_SECTION[sec], group: 'area', status: 'live' }); else if (row.status !== 'live') row.status = 'live';
  const site = c.site = c.site || {}; if (!(o.keepOff && (site.modules || {})[sec] === false)) site.modules = { ...(site.modules || {}), [sec]: true };
  return n;
}
function cmFindAdd(path, sid) { const n = cmFindPut(path, sid); if (!n) return; cmQueue(); render(); toast(`Added: ${edShown(n.name)}. Preview, then publish.`); }
// Add to my guide: Google asked first when its answer is not known (openGate); nothing added twice, nor after a Skip made
// while it was asked.
async function cmFindAccept(btn, path, sid) {
  const f = CM.find[FIND_OF[path][0]], it = f && (f.items || []).find(x => x.id === sid); if (!it) return;
  if (!(await openGate(it, btn)) || findSeen(f.id).has(sid) || (CM.findSkip || new Set()).has(sid)) return;
  cmFindAdd(path, sid);
}

/* --- The markets the build held back (Yohann, 13 Nov 2026) ---
   For an account billed in Europe, Google's "permanently closed" may only be shown to a person looking at the guide, never
   used by a job. So the build keeps every market with a Google id out of the guide and leaves them in a find-markets job of
   their own (result.held), which the guide's markets file names (files.markets.held: the job's id; worker/guide-worker.mjs
   holdBack). When the maker opens on the guide (the ready screen, or the editor whenever the host comes back, on any step),
   it asks Google about each one by itself, no tap (openAsk, at most OPEN_WAIT each, all at once), then in one write puts the
   others into the live guide, and into the draft when there is one, without publishing the draft or changing the guide's
   status: open, temporarily closed, no answer or a failed ask all go in, guests are told nothing. One Google calls
   permanently closed never goes in, and the host is told once, by name, with "Google Maps" beside Google's word. The same
   write sets files.markets.heldDone to the job's id, so the job is handled once on any device: a market the host deletes
   later never comes back. Nothing of Google's answer is kept anywhere (not in the guide, the draft, the job or this
   device); a closed market is simply never copied. A failed write marks nothing: the next load tries again (the ready
   screen offers Try again). Find more never shows a held job as its own suggestions (cmFindLoad). --- */
const HELD = { job: '', st: '', slow: false, told: false, added: 0, gone: [] };   // st: ask, done, err, none (nothing to do)
const heldKeys = it => [it.name_local, ...(edIs18(it.name) ? Object.values(it.name) : [it.name])].map(plainName).filter(Boolean);
// The held markets into a guide's content c (a copy of the live guide, the draft): those whose id or plain name the guide
// already has are skipped, and the job is marked handled. Returns the markets added.
function heldPut(c, jid, add) {
  const F = c.files = c.files || {}, mk = F.markets = F.markets || { categories: [], markets: [] }, list = mk.markets = Array.isArray(mk.markets) ? mk.markets : [];
  const ids = new Set(list.map(x => x.id)), names = new Set(list.flatMap(heldKeys)), out = [];
  for (const it of add) { const k = heldKeys(it); if (ids.has(it.id) || k.some(x => names.has(x))) continue;
    out.push(cmPutIn(c, MK_PATH, it, { keepOff: true })); ids.add(it.id); k.forEach(x => names.add(x)); }
  mk.heldDone = jid;
  return out;
}
// The one write: the live guide plus the markets, and the draft plus the markets when the host has unpublished changes (as
// cmSave decides it: no difference left, no draft). Taken in turn with the editor's saves and publishing (CM.saving), and
// only while the guide still names this job and has not handled it (a new build, or another device first): then null.
// Returns the markets added.
async function heldWrite(jid, add) {
  while (CM.saving) await CM.saving;
  let n = null;
  CM.saving = (async () => {
    const live = cmClone(CM.live.content), draft = cmClone(CM.g.content), put = heldPut(live, jid, add); heldPut(draft, jid, add);
    const dirty = !cmSame({ content: draft, theme: CM.g.theme }, { content: live, theme: CM.live.theme }), d = dirty ? { content: draft, theme: CM.g.theme, savedAt: new Date().toISOString() } : null;
    await ensureFresh();
    const q = 'content->files->markets->>', r = await sb(`/rest/v1/guides?id=eq.${CM.g.id}&${q}held=eq.${encodeURIComponent(jid)}&${q}heldDone=is.null&select=id`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { content: live, draft: d } });
    if (!r || !r[0]) return;
    CM.live = { content: live, theme: CM.live.theme }; GUIDE.content = live; GUIDE.draft = d;
    heldPut(CM.g.content, jid, add);   // what the editor holds: the same markets (an edit made meanwhile stays, and saves as usual)
    n = put;
  })();
  try { await CM.saving; } finally { CM.saving = null; }
  if (CM.again) { CM.again = false; cmSave(); }
  return n;
}
async function cmHeld(again = false) {
  const mk = (((CM.live || {}).content || {}).files || {}).markets || {}, jid = typeof mk.held === 'string' ? mk.held : '';
  if (!CM.on || !jid || mk.heldDone === jid || (HELD.job === jid && HELD.st && !(again && HELD.st === 'err'))) return;
  Object.assign(HELD, { job: jid, st: 'ask', slow: false, told: false, added: 0, gone: [] }); heldDraw();
  const t = setTimeout(() => { if (HELD.st === 'ask' && HELD.job === jid) { HELD.slow = true; heldDraw(); } }, 600);   // a wait shown only when it is one
  try {
    await ensureFresh();
    const r = await sb(`/rest/v1/guide_jobs?select=id,result&id=eq.${encodeURIComponent(jid)}&guide_id=eq.${CM.g.id}`), j = r && r[0], items = j && j.result && j.result.held === true && Array.isArray(j.result.items) ? j.result.items : null;
    if (!items) { HELD.st = 'none'; return; }
    const said = await Promise.all(items.map(it => it.gid ? Promise.race([openAsk(it.gid), new Promise(ok => setTimeout(ok, OPEN_WAIT))]).then(() => openOf(it.gid)) : null));
    const n = await heldWrite(jid, items.filter((it, i) => said[i] !== 'permanent'));
    if (n == null) { HELD.st = 'none'; return; }
    Object.assign(HELD, { st: 'done', added: n.length, gone: items.filter((it, i) => said[i] === 'permanent').map(it => String(it.name_local || edShown(it.name) || '').trim()).filter(Boolean) });
  } catch (e) { HELD.st = 'err'; }
  finally { clearTimeout(t); if (HELD.job === jid) heldDraw(); }
}
// What the host reads: how many went in, then the ones left out by name, with Google's word and "Google Maps" in one
// sentence, and what they can do. here: on the Local markets step itself.
const heldAdded = () => HELD.added === 1 ? '1 market added to your guide.' : `${HELD.added} markets added to your guide.`;
const heldGone = () => !HELD.gone.length ? '' : `Left out: ${HELD.gone.join(', ')}. ${HELD.gone.length === 1 ? 'It is' : 'They are'} permanently closed on Google\u00a0Maps.`;   // "Google Maps" never split from Google's word
const heldHint = here => `If you know ${HELD.gone.length === 1 ? 'it' : 'one'} still runs, add it by its name ${here ? 'below' : 'in Local markets'}.`;
const heldLines = here => [HELD.added ? `<p class="hd-n">${esc(heldAdded())}</p>` : '', HELD.gone.length ? `<p class="hd-g"><span>${esc(heldGone())}</span> <span>${esc(heldHint(here))}</span></p>` : ''].join('');
// The ready screen (runtime.js readyHTML, #bheld): a quiet line, "Adding your markets…" only past 600 ms, Try again on a failure.
function heldReadyHTML() {
  if (HELD.st === 'ask') return HELD.slow ? '<p class="hd-n">Adding your markets…</p>' : '';
  if (HELD.st === 'err') return '<p class="berr">Your markets are not in your guide yet.</p><button class="btn small bopen" type="button" data-heldretry>Try again</button>';
  return HELD.st === 'done' ? heldLines(false) : '';
}
// At the top of Local markets, for this session.
const heldNote = () => HELD.st === 'done' && (HELD.added || HELD.gone.length) ? `<div class="cm-held" id="cmHeld" role="status">${heldLines(true)}</div>` : '';
// Drawn where it shows; once done, the editor (not the ready screen) says it in a toast, and the steps follow.
function heldDraw() {
  const b = document.getElementById('bheld'); if (b) b.innerHTML = heldReadyHTML();
  if (HELD.st !== 'done') return;
  if (!HELD.told) { HELD.told = true; if (!b && (HELD.added || HELD.gone.length)) toast(HELD.added ? heldAdded() : heldGone()); }
  const a = document.activeElement, typing = a && a.closest && a.closest('.edz input, .edz textarea, .edz select');
  if (CM.on && route() === 'markets' && !typing) render(); else if (CM.on && document.querySelector('.edz')) cmMarks();
  if (typeof cmPhoneRefresh === 'function') cmPhoneRefresh();
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-heldretry]'); if (b) { b.disabled = true; cmHeld(true); } });

/* --- Automatic events (files/events/auto): the worker searches the next three months every month and adds what it finds
   straight into the guide (worker/guide-worker.mjs, refreshEvents). The settings save at once, in the live guide and the
   draft alike (set_events_auto), since they steer the search and are not something guests see. --- */
const evAuto = () => (((edC().files || {}).events || {}).auto) || {};
// Events have one search. Its switch decides where the results go: on, straight into the guide (now with "Search now",
// and every month); off, as cards to keep or skip (the same cards as Find more). The topics count either way.
const EV_PATH = 'files/events/items';
const cmEvFind = () => (CM.find || {})['find-events'] || {};
// How far events reach (the worker's EV_REACH): by car, small events within 10 km and the main ones up to the guide's
// radius; in a city, small ones within 2 km and the main ones within 8 km.
const cmEvReach = () => { const city = evAuto().reach === 'city'; return { city, far: city ? 8 : ((edC().site || {}).area || {}).radiusKm || 30 }; };
const cmEvBusy = () => (!!CM.evJob && (CM.evJob.status === 'queued' || CM.evJob.status === 'running')) || cmEvFind().status === 'queued' || cmEvFind().status === 'running';
function cmEventsInner() {
  const a = evAuto(), on = !!a.on, f = cmEvFind(), busy = cmEvBusy();
  const left = on ? [] : cmFindItems('find-events', EV_PATH), all = on ? 0 : cmFindPool('find-events', EV_PATH).length;
  const topics = (k, ph) => `<div class="chips">${(a[k] || []).map((x, i) => `<span class="chip cm-topic"><span>${esc(x)}<button type="button" data-evdel="${k}" data-i="${i}" aria-label="Remove ${esc(x)}">×</button></span></span>`).join('')}</div>
    <div class="cm-dayrow"><input type="text" id="c_ev_${k}" data-evin="${k}" placeholder="${esc(ph)}" aria-label="${k === 'skip' ? 'A topic to skip' : 'A topic to look for'}" enterkeyhint="done"><button class="btn small" type="button" data-evadd="${k}">Add</button></div>`;
  if (!CM.evLoaded) setTimeout(cmEvLoad, 0);
  return `<div class="cm-fhead"><b>Finding events</b></div>
    <p class="hint">We look for events in the next three months around the house: the area's own traditions, festivals and fairs, plus the topics below.</p>
    <div class="f full"><span class="lab" id="l_evreach">How guests get around</span><div class="chips" role="group" aria-labelledby="l_evreach"><button class="chip" type="button" data-evreach="car" aria-pressed="${!cmEvReach().city}"><span>By car</span></button><button class="chip" type="button" data-evreach="city" aria-pressed="${cmEvReach().city}"><span>In a city</span></button></div>
      <p class="hint">${cmEvReach().city ? 'On foot, by bike or metro: small local events within 2 km of the house, only the main ones further away, up to 8 km.' : `Small local events within 10 km of the house, only the main ones further away, up to ${cmEvReach().far} km.`}</p></div>
    ${cSwitch('data-evauto', 'Keep events up to date', on, on ? 'On: we search every month and new events go straight into your guide, with “expected” dates until confirmed. Events you add yourself are never changed; one you delete never comes back.' : 'Off: you search when you like, and keep or skip each event we find.')}
    <div class="f full"><span class="lab">Topics to skip</span><p class="hint">In any language. We never add events about these.</p>${topics('skip', 'bullfighting, nightclubs…')}</div>
    <div class="f full"><span class="lab">Things to look for</span><p class="hint">In any language. Each one gets its own search, on top of the area's usual festivals, fairs and traditions. Up to three.</p>${topics('want', 'jazz, wine, kids…')}</div>
    ${busy ? progBar(CM.evJob && (CM.evJob.status === 'queued' || CM.evJob.status === 'running') ? 'auto' : 'find-events', 'Search for events') : ''}
    ${!busy && left.length ? cmFindCard(left[0], all - left.length + 1, all) : ''}
    <div class="cm-row"><span class="hint" id="cmEvState">${esc(cmEvStateText())}</span><button class="btn small${on ? '' : ' sun'}" type="button" id="cmEvRun" data-evrun${busy ? ' disabled' : ''}>Search now</button></div>
    <p class="hint">These settings apply at once: they are not part of the changes you publish.</p>`;
}
const cmEvStateText = () => {
  const a = evAuto(), j = CM.evJob, f = cmEvFind();
  if (cmEvBusy()) return CM_TAKES;
  if (j && j.status === 'failed') return 'The search did not work: ' + (j.message || 'try again later');
  if (a.on) return a.last ? `Last search: ${a.last}${a.lastAdded != null ? `, ${a.lastAdded} added` : ''}.` : 'First search not run yet.';
  if (f.status === 'failed') return 'The search did not work: ' + (f.message || 'try again later');
  if (f.status === 'done') return (f.items || []).length ? (cmFindItems('find-events', EV_PATH).length ? '' : 'You have looked at every event from the last search.') : 'The last search found nothing new nearby.';
  return '';
};
function cmEvRefresh() { const el = document.getElementById('cmEvState'); if (el) el.textContent = cmEvStateText(); const b = document.getElementById('cmEvRun'); if (b) b.disabled = cmEvBusy(); }
async function cmEvAutoSet(patch) {
  const a = { ...evAuto(), ...patch };
  for (const c of [CM.g.content, CM.live.content]) { const f = c.files = c.files || {}; f.events = f.events || { items: [] }; f.events.auto = cmClone(a); }   // both copies: not a change to publish
  render();
  try { await ensureFresh(); await sb('/rest/v1/rpc/set_events_auto', { method: 'POST', body: { p_guide: CM.g.id, p_auto: a } }); setSave('ok', cmSaveText()); }
  catch (e) { setSave('err', 'Not saved: ' + niceError(e)); }
}
function cmEvTopic(k) {
  const el = document.getElementById('c_ev_' + k), add = String(el && el.value || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
  if (!add.length) return;
  const cur = evAuto()[k] || [];
  cmEvAutoSet({ [k]: [...cur, ...add.filter(x => !cur.some(c => c.toLowerCase() === x.toLowerCase()))] });
  setTimeout(() => { const i = document.getElementById('c_ev_' + k); if (i) i.focus(); }, 0);
}
// "Search now", and the first search when the switch goes on: the worker adds what it finds to both copies; this one reloads them.
async function cmEvRun() {
  CM.evJob = { status: 'queued', since: Date.now() }; render();
  try {
    await cmSave(); await ensureFresh();
    const j = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: CM.g.id, kind: 'auto-events', langs: edLangs() } });
    const id = j && j[0] && j[0].id; if (!id) throw new Error('Could not start');
    CM.evJob = { id, status: 'queued', since: Date.now() }; render(); cmEvPoll(CM.evJob);
  } catch (e) { CM.evJob = { status: 'failed', message: niceError(e) }; cmEvRefresh(); }
}
// A search started earlier (another tab, before a reload) is followed again when the Events step opens.
async function cmEvLoad() {
  CM.evJob = CM.evJob || null; CM.evLoaded = true;
  try {
    await ensureFresh();
    const since = new Date(Date.now() - 2 * 36e5).toISOString();
    const r = await sb(`/rest/v1/guide_jobs?select=id,status,message,created_at&guide_id=eq.${CM.g.id}&kind=eq.auto-events&status=in.(queued,running)&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc&limit=1`), j = r && r[0];
    if (j && !CM.evJob) { CM.evJob = { id: j.id, status: j.status, message: j.message, since: Date.parse(j.created_at) }; render(); cmEvPoll(CM.evJob); }
  } catch (e) { /* no connection: the state shows the last search */ }
}
async function cmEvPoll(job) {
  for (let i = 0; i < 360 && CM.evJob === job; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs?select=status,message&id=eq.' + job.id), st = r && r[0]; if (!st) continue;
      progSet(job, st);
      if (st.status === 'done') {
        const g = (await sb('/rest/v1/guides?select=content,draft&id=eq.' + CM.g.id))[0], work = g.draft && g.draft.content ? g.draft.content : g.content;
        for (const [mine, theirs] of [[CM.live.content, g.content], [CM.g.content, work]]) { mine.files.events = cmClone(theirs.files.events); mine.files.sections = cmClone(theirs.files.sections); mine.site.modules = cmClone(theirs.site.modules); }   // separate copies: the working one is edited
        CM.evJob = null; toast(st.message || 'Events updated'); render(); return;
      }
      if (st.status === 'failed') { render(); return; } cmEvRefresh();
    } catch (e) { /* offline for a moment: try again */ }
  }
}
document.addEventListener('keydown', e => { const t = e.target; if (CM.on && e.key === 'Enter' && t.dataset && t.dataset.evin) { e.preventDefault(); cmEvTopic(t.dataset.evin); } });
// A kind grid's search: Enter picks the only tile left, Escape clears the field.
document.addEventListener('keydown', e => {
  const t = e.target; if (!CM.on || !t.dataset || t.dataset.ckq === undefined) return;
  if (e.key === 'Escape' && t.value) { e.preventDefault(); e.stopPropagation(); t.value = ''; kFilter(t); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault(); const left = [...t.closest('.pl-kinds-w').querySelectorAll('.pl-k:not([hidden])')]; if (left.length === 1) left[0].click();
});

/* --- Pages: overview, one step, publish --- */
function cmTile(m) {
  const ch = cmChanged(m);
  return `<a class="tile" href="#${m.id}" data-shape="${m.shape}" style="${tileVars(m)}">${ch ? '<span class="pill chk">Changed</span>' : ''}<span class="ic">${I[m.icon] || ''}</span><b>${esc(m.title)}</b><small>${esc(cmSub(m))}</small></a>`;
}
const cmPillText = (ch, m) => ch ? 'Changed' : m && cmNeeds(m) ? 'Needs you' : cmLive() ? 'Live' : 'Not published yet';
const cmFootText = () => cmDirty() ? 'Saved as a draft. Guests see it once you publish.' : 'Changes save as you type, as a draft only you see until you publish.';
function cmLangBar(langs) {
  return `<div class="cm-langbar"><div class="cm-lang"><label for="c_lang">You are editing in</label><select id="c_lang" data-cmlang translate="no">${langs.map(l => `<option value="${l}"${CM.lang === l ? ' selected' : ''}>${ED_LANGS[l]}</option>`).join('')}</select></div>
    <p class="hint cm-langhint">A text you change here changes in the other languages too while they still had the same words. Translated texts stay as they are.</p></div>`;
}
function cmStepHTML(m) {
  const ch = cmChanged(m), langs = edLangs();
  return `<div class="split has-phone">${railHTML(m.id)}<div class="col">
    <section class="mhead" style="${tileVars(m)}"><div class="row1"><span class="pill ${ch ? 'chk' : cmNeeds(m) ? 'new' : 'done'}" id="cmPill">${esc(cmPillText(ch, m))}</span></div><h1>${esc(m.title)}</h1><p>${esc(m.lead)}</p></section>
    <section class="card">${m.lang && langs.length > 1 ? cmLangBar(langs) : ''}<div class="edz">${m.body(edC())}</div>
      <div class="foot"><p class="todo" id="cmFoot">${esc(cmFootText())}</p><div class="row"><a class="btn small" href="${esc(cmPreviewUrl())}" target="_blank" rel="noopener" data-cpreview>${I.eye}Preview</a><a class="btn small primary" href="#publish" id="cmGoPub"${cmDirty() ? '' : ' hidden'}>Review and publish</a></div></div></section></div>${cmPhoneHTML(m.id)}</div>`;
}
function cmPublishHTML() {
  const ch = cmSteps().filter(cmChanged), dirty = cmDirty(), url = cmLiveUrl(), miss = cmNameless(edC());
  return `<div class="split has-phone">${railHTML('publish')}<div class="col">
    <section class="mhead" style="--tc:var(--ink);--ti:var(--paper);--sh:var(--sun)"><h1>${cmLive() ? 'Publish changes' : 'Publish your guide'}</h1>
      <p>${dirty ? 'Look at your changes in the preview, then publish: guests see them straight away.' : cmLive() ? 'Nothing is waiting: guests see the guide as it is here.' : 'Your guide is ready. Publish it to share it with your guests.'}</p></section>
    ${miss.length ? `<section class="card"><div class="note"><div>Give these a name before you publish, or delete them.</div></div><div class="sum">${miss.map(({ m, n }) => `<a href="#${m.id}" style="--tc:${m.tc}"><span class="sw"></span><span><b>${esc(m.title)}</b><p>${n === 1 ? '1 entry with no name' : `${n} entries with no name`}</p></span><span class="pill new" style="position:static">Needs you</span></a>`).join('')}</div></section>` : ''}
    <section class="card">
      ${ch.length ? `<div class="sum">${ch.map(m => `<a href="#${m.id}" style="--tc:${m.tc}"><span class="sw"></span><span><b>${esc(m.title)}</b><p>${esc(cmSub(m))}</p></span><span class="pill chk" style="position:static">Changed</span></a>`).join('')}</div>` : dirty ? '<p class="hint">Translations and other small changes are waiting.</p>' : ''}
      <div class="cm-urlrow"><p class="hint">${cmLive() ? 'Guests open' : 'Once it is published, guests open'} <a href="${esc(url)}" target="_blank" rel="noopener" style="white-space:nowrap">${esc(url.replace(/^https?:\/\//, ''))}</a></p>${copyBtn(url)}</div>
      <div class="foot"><div class="row"><a class="btn" href="${esc(cmPreviewUrl())}" target="_blank" rel="noopener" data-cpreview>${I.eye}Preview</a>${dirty || !cmLive() ? `<button class="btn primary" type="button" data-cpublish>${I.send}${cmLive() ? 'Publish changes' : 'Publish my guide'}</button>` : ''}</div>
        ${dirty ? `<div class="cm-row"><button class="btn small" type="button" data-cdiscard>Undo all changes</button><p class="hint">Goes back to the guide guests see now.</p></div>` : ''}</div></section>
    ${cmLive() ? `<section class="card"><div class="cm-row"><button class="btn small" type="button" data-cunpublish>Unpublish</button><p class="hint">Takes the guide offline: guests can no longer open it. Nothing is deleted, and you can publish it again any time.</p></div></section>` : ''}</div>${cmPhoneHTML('publish')}</div>`;
}
const cmIsPage = r => r === 'publish' || cmSteps().some(m => m.id === r);
/* The phone next to every step (from 1240 px wide), as in the builder. Here it is the guide itself: the shared viewer with
   the changes not published yet (/g/<slug>?preview), on the screen the step changes; it reloads after each saved change,
   where it was. Yohann, 29 Oct 2026: "we should always see the preview". */
const cmScreen = r => { const m = cmSteps().find(x => x.id === r); return !m || !m.sec || m.sec === 'quick' ? 'home' : m.sec === 'markets' ? 'markets' : 's/' + m.sec; };
const cmPhoneHTML = r => `<aside class="side-phone" aria-label="Your guide, as guests will see it"><div class="phone"><div class="phone-scr" id="cmPhone" data-screen="${esc(cmScreen(r))}"><p class="phone-msg" id="cmPhoneMsg" hidden></p></div></div><p>Your guide with your changes, as guests will see it</p></aside>`;
function cmPhoneOn() {
  const s = document.getElementById('cmPhone'); if (!s) return;
  const msg = document.getElementById('cmPhoneMsg'), say = t => { msg.textContent = t; msg.hidden = !t; };
  if (!CM.g.slug) return say('Your guide shows here once it has a web address.');
  if (!matchMedia('(min-width:1240px)').matches) return;   // the phone is hidden on narrower screens: nothing loads
  let f = s.querySelector('iframe');
  if (!f) {
    if (CM.phoneScr !== s.dataset.screen) { CM.phoneScr = s.dataset.screen; CM.phoneY = 0; }
    f = document.createElement('iframe'); f.id = 'cmPhoneFrame'; f.title = 'Your guide, as guests will see it';
    f.addEventListener('load', () => {
      say(navigator.onLine ? '' : 'No connection: your guide shows here again once you are online.');
      try { const w = f.contentWindow, y = CM.phoneY || 0; if (w.location.hash !== '#' + f.dataset.shown) w.location.replace(f.src.split('#')[0] + '#' + f.dataset.shown);   // the screen asked while it was loading (gLiveSync)
        w.addEventListener('scroll', () => { CM.phoneY = w.scrollY; }, { passive: true }); if (y) setTimeout(() => w.scrollTo(0, y), 600); } catch (e) { /* another origin: no scroll memory */ }
    });
    f.dataset.shown = gLiveNow() ? 'home' : s.dataset.screen;   // Google's content on screen: no map beside it (start.js gLiveSync)
    s.prepend(f); f.src = cmPreviewUrl() + '#' + f.dataset.shown;
  }
  phoneWatch(f);
}
function cmPhoneRefresh() { const f = document.getElementById('cmPhoneFrame'); if (!f) return; try { f.contentWindow.location.reload(); } catch (e) { f.src = f.src; } }
addEventListener('resize', () => { if (CM.on) cmPhoneOn(); });
function cmPageHTML(r) { const m = cmSteps().find(x => x.id === r); return m ? cmStepHTML(m) : cmPublishHTML(); }
// No overview page: the editor opens on the step the host was on last time in this guide (remembered on this device), else the first.
const CM_LAST = 'porta-editor-step-v1';
function cmStart() { let id = ''; try { id = (JSON.parse(localStorage.getItem(CM_LAST) || '{}') || {})[CM.g.id] || ''; } catch (e) {} return cmIsPage(id) ? id : (cmSteps()[0] || { id: 'publish' }).id; }
function cmRemember(r) { try { const o = JSON.parse(localStorage.getItem(CM_LAST) || '{}') || {}; if (o[CM.g.id] !== r) { o[CM.g.id] = r; localStorage.setItem(CM_LAST, JSON.stringify(o)); } } catch (e) {} }
// Rail and bottom bar (nav.js asks for these while CM.on)
// What only the host can tell us and the guide still lacks: listed first, as "Needs you" (docs/plan-fast-builder.md).
// For a guide that exists this is the Wi-Fi: rubbish and contacts pages only exist once they are filled.
// A step with an entry that has words but no name needs the host too: Publish waits for it (cmNameless).
const CM_NEEDS = { wifi: c => { const w = (c.private || {}).wifi || {}; return !w.password || !(w.networks || []).some(n => n.ssid); } };
for (const id of ['todo', 'restaurants', 'nightlife', 'markets', 'events', 'tiles', 'contacts', 'transport', 'housepage']) CM_NEEDS[id] = c => cmNameless(c, id).length > 0 || cmUnnamedOf(c, `files/${id}/items`).length > 0 || cmLooks(c, id).length > 0;   // places waiting for a name (cmUnnamed) and places asked "Is it still open?" (lkHTML) too, without stopping Publish: guests do not see the first and still see the second
// The places of a step that the monthly check asks about and the host has not answered yet.
const CM_LOOK = { todo: ['todo', 'items'], restaurants: ['restaurants', 'items'], nightlife: ['nightlife', 'items'], markets: ['markets', 'markets'] };
const cmLooks = (c, id) => { const k = CM_LOOK[id], a = k && (((c.files || {})[k[0]] || {})[k[1]]); return Array.isArray(a) ? a.filter(lkOpen) : []; };
const cmNeeds = m => !!(CM_NEEDS[m.id] && CM_NEEDS[m.id](edC()));
// The steps in the order the list shows them: what needs the host first, then each group. The bottom bar's count, Back and
// Next follow this same order, so "6 of 15" is the sixth row of the list.
const cmOrder = () => { const need = cmSteps().filter(cmNeeds); return [...need, ...GROUPS.flatMap(([g]) => cmSteps().filter(m => m.group === g && !need.includes(m)))]; };
function cmStepList(cur) {
  const item = m => { const ch = cmChanged(m); return `<a class="si s-${ch ? 'chk' : 'new'}" href="#${m.id}"${m.id === cur ? ' aria-current="step"' : ''} style="--tc:${m.tc}"><span class="sic">${ch ? STATUS_ICON.chk : I[m.icon] || ''}</span><span class="st">${esc(m.title)}</span><span class="sl">${ch ? 'Changed' : cmNeeds(m) ? 'Needs you' : ''}</span></a>`; };
  const need = cmSteps().filter(cmNeeds);
  const dirty = cmDirty();
  const url = cmLiveUrl();
  return `<div class="si-guide"><b>${esc((edC().site || {}).name || CM.g.slug)}</b><small>${cmLive() ? `Live: <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a>` : 'Not published yet'}</small></div>
    ${need.length ? `<p class="sg">Needs you</p>${need.map(item).join('')}` : ''}
    ${GROUPS.map(([g, gt]) => { const ms = cmSteps().filter(m => m.group === g && !cmNeeds(m)); return ms.length ? `<p class="sg">${gt}</p>${ms.map(item).join('')}` : ''; }).join('')}
    <p class="sg">Finish</p><a class="si s-${dirty ? 'chk' : 'done'} send" href="#publish"${cur === 'publish' ? ' aria-current="step"' : ''}><span class="sic">${I.send}</span><span class="st">Publish changes</span><span class="sl">${dirty ? 'Waiting' : cmLive() ? 'Live' : ''}</span></a>`;
}
function cmNavbar(cur) {
  const order = [...cmOrder().map(m => m.id), 'publish'], i = order.indexOf(cur), prev = order[i - 1], next = order[i + 1];
  const t = id => id === 'publish' ? 'Publish changes' : (cmSteps().find(m => m.id === id) || {}).title;
  return `<div class="nbin">
    ${prev ? `<a class="nb ghost" href="#${prev}" aria-label="Back to ${esc(t(prev))}">${BACK}<span class="hide-s">${esc(t(prev))}</span></a>` : '<span></span>'}
    <button class="nb count" type="button" id="openSteps" aria-haspopup="dialog"><b>${i + 1}</b> of ${order.length}<i class="chev" aria-hidden="true"></i></button>
    ${next ? `<a class="nb primary" href="#${next}"><span>Next</span>${ARROW}</a>` : cmDirty() || !cmLive() ? `<button class="nb primary" type="button" data-cpublish><span>Publish</span>${CHECK}</button>` : '<span></span>'}</div>`;
}
// While typing: only the "Changed" marks move, the page stays as it is.
function cmMarks() {
  clearTimeout(CM.marks);
  CM.marks = setTimeout(() => {
    refreshNav();
    const m = cmSteps().find(x => x.id === route()), p = document.getElementById('cmPill');
    if (m && p) { const ch = cmChanged(m); p.className = 'pill ' + (ch ? 'chk' : cmNeeds(m) ? 'new' : 'done'); p.textContent = cmPillText(ch, m); }
    const f = document.getElementById('cmFoot'); if (f) f.textContent = cmFootText();
    const g = document.getElementById('cmGoPub'); if (g) g.hidden = !cmDirty();
  }, 250);
}

/* --- Saving the draft, publishing, undoing --- */
const cmSaveText = () => cmDirty() ? 'Draft saved, not live yet' : cmLive() ? 'Everything is live' : 'Saved, not published';
function cmQueue() { setSave('busy', 'Saving…'); clearTimeout(CM.timer); CM.timer = setTimeout(cmSave, 900); cmMarks(); }
async function cmSave() {
  clearTimeout(CM.timer); CM.timer = null;
  if (CM.saving) { CM.again = true; return CM.saving; }
  CM.saving = (async () => {
    const dirty = !cmSame(cmW(), CM.live);   // the whole draft, notes included: a host's "It is still open" is kept even with nothing to publish
    try { await ensureFresh(); await sb('/rest/v1/guides?id=eq.' + CM.g.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { draft: dirty ? { content: CM.g.content, theme: CM.g.theme, savedAt: new Date().toISOString() } : null } }); setSave('ok', cmSaveText()); }
    catch (e) { setSave('err', 'Not saved: ' + niceError(e)); return; }
    cmPhoneRefresh();
  })();
  try { await CM.saving; } finally { CM.saving = null; }
  if (CM.again) { CM.again = false; return cmSave(); }
}
/* --- Publish never sends an empty thing (Yohann, 10 Nov 2026) ---
   The Add buttons put an empty entry in at once; one never filled in reached guests (30 Oct: an empty train line and an
   empty station in Ca La Kimberly). Before Publish, cmTidy takes out of the content what is still as its Add button made
   it, or means nothing without its main field. Something a host typed is never dropped: a place with words but no name
   stops Publish instead and says where (cmNameless, listed on the Publish page and under "Needs you"). */
const edBlank = x => x == null || x === 0 || (typeof x === 'string' ? !x.trim() : Array.isArray(x) ? x.every(edBlank) : typeof x === 'object' ? Object.values(x).every(edBlank) : false);
// The rows inside an entry, and when one is empty
const CM_ROWS = {
  badges: b => edBlank(b.t),
  setMenus: m => edBlank(m.price),                                      // a set menu with no price ("Menú del día €")                                            // a station's line with no name ("R4"): its colour alone says nothing
  to: d => edBlank(d.dest) && edBlank(d.time),                          // a journey time with no destination and no time
  alt: a => edBlank(a.phone),                                           // a taxi's other number with no phone
  schedule: r => !(r.days || []).length && (edBlank(r.open) && edBlank(r.close) || r.open === '09:00' && r.close === '14:00'),   // opening hours with no day, and no time or the times Add puts in
  dates: d => edBlank(d.start)                                          // dates with no start
};
// The entries a host adds one by one, by step: places, markets, events, nightlife, Home tiles, contacts, taxis, stations
// and stops, house page highlights.
const cmEntries = c => { const f = c.files || {}, T = f.transport || {};
  return [['todo', (f.todo || {}).items], ['restaurants', (f.restaurants || {}).items], ['nightlife', (f.nightlife || {}).items], ['markets', (f.markets || {}).markets], ['events', (f.events || {}).items], ['tiles', (f.quick || {}).items],
    ...((f.emergency || {}).groups || []).map(g => ['contacts', g.items]), ['transport', T.taxis], ['transport', T.stations], ['housepage', (f['house-page'] || {}).highlights]].filter(x => Array.isArray(x[1])); };
// Untouched: nothing typed (what the editor puts in by itself does not count: id, icon, kind, category, distance, flags,
// switches) and no pin of its own (none yet, 0,0 or the house's). A new Home tile is named after its kind ("Restaurant")
// until the host names it.
const CM_BY_ITSELF = new Set(['id', 'icon', 'kind', 'mode', 'category', 'flags', 'tags', 'lat', 'lng', 'km_from_house', 'km', 'min', 'nomap']);
function cmUntouched(it, h) {
  const pin = !it.nomap && typeof it.lat === 'number' && typeof it.lng === 'number' && !(it.lat === 0 && it.lng === 0) && !(it.lat === h.lat && it.lng === h.lng);
  return !pin && Object.entries(it).every(([k, v]) => CM_BY_ITSELF.has(k) || typeof v === 'boolean' || (k === 'name' && it.kind && cmSame(v, it.kind))
    || edBlank(CM_ROWS[k] && Array.isArray(v) ? v.filter(r => !CM_ROWS[k](r)) : v));
}
const cmNoName = it => edBlank(it.name) && edBlank(it.title) && edBlank(it.t);
function cmTidy(c) {
  const f = c.files || {}, h = f.house || {}; let n = 0;
  const drop = (a, empty) => { if (Array.isArray(a)) for (let i = a.length - 1; i >= 0; i--) if (empty(a[i])) { a.splice(i, 1); n++; } };
  for (const [w, a] of cmEntries(c)) for (const it of a) {   // rows inside entries first
    const rows = ['todo', 'restaurants', 'nightlife'].includes(w) && Array.isArray(it.schedule) && it.schedule.length ? [...it.schedule] : null;
    for (const k of Object.keys(CM_ROWS)) drop(it[k], CM_ROWS[k]);
    if (rows && !it.schedule.length) plSeasonBack(it, rows);   // only rows nobody filled in: a season one of them carried stays the place's
  }
  for (const b of (f.message || {}).blocks || []) drop(b.items, edBlank);                 // a line of text empty in every language: house guide,
  drop((f.garbage || {}).steps, edBlank); drop((f['house-page'] || {}).beds, edBlank);    // how to sort, beds,
  for (const g of (f['house-page'] || {}).amenities || []) drop(g.items, edBlank);        // amenities
  drop((f.garbage || {}).containers, ct => edBlank(ct.where) && edBlank(ct.takes) && edBlank(ct.map));   // containers: no "where", nothing ticked, no link
  drop(((c.private || {}).wifi || {}).networks, w => edBlank(w.ssid));                   // a Wi-Fi network with no name
  for (const [, a] of cmEntries(c)) drop(a, it => cmUntouched(it, h));                   // entries nobody filled in
  return n;
}
// What stops Publish: entries with words but no name, by step (only steps the editor shows, so the host can get there).
function cmNameless(c, only) {
  const h = (c.files || {}).house || {}, on = new Set(cmSteps().map(m => m.id)), out = new Map();
  for (const [id, a] of cmEntries(c)) if (on.has(id) && (!only || id === only)) for (const it of a) if (cmNoName(it) && !cmUntouched(it, h)) out.set(id, (out.get(id) || 0) + 1);
  return [...out].map(([id, n]) => ({ m: cmSteps().find(x => x.id === id), n }));
}
const cmNamelessText = miss => { const n = miss.reduce((s, x) => s + x.n, 0);
  return miss.length > 1 ? `Not published: ${n} entries have no name. Name them or delete them.` : n === 1 ? `Not published: 1 entry in ${miss[0].m.title} has no name. Name it or delete it.` : `Not published: ${n} entries in ${miss[0].m.title} have no name. Name them or delete them.`; };
// Publish's work, with no words on screen (the ready screen in runtime.js says its own): the draft tidied, checked for
// entries with no name (an error that names them, e.miss), then copied into the guide. o.keep: the guide stays published
// or not as it is (the ready screen adds the places a host kept; it never publishes a guide held back for review).
async function cmPublishNow(o = {}) {
  clearTimeout(CM.timer); while (CM.saving) await CM.saving;
  if (cmTidy(CM.g.content)) CM.open.clear();   // empty entries never go live (and leave the draft too)
  const miss = cmNameless(CM.g.content);
  if (miss.length) { cmQueue(); throw Object.assign(new Error(cmNamelessText(miss)), { miss }); }
  await ensureFresh();
  const body = { content: CM.g.content, theme: CM.g.theme, draft: null }; if (!cmLive() && !o.keep) body.status = 'published';
  const r = await sb('/rest/v1/guides?id=eq.' + CM.g.id + '&select=status', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body });
  if (r && r[0]) CM.g.status = GUIDE.status = r[0].status;
  CM.live = { content: cmClone(CM.g.content), theme: cmClone(CM.g.theme) }; GUIDE.content = CM.live.content;
  if (window.__acctHouses) window.__acctHouses();
  setSave('ok', cmSaveText());
}
async function cmPublish(btn) {
  if (btn) btn.disabled = true;
  try { await cmPublishNow(); toast(cmLive() ? 'Published. Guests see it now.' : 'Saved, but not published. Try again.'); render(); }
  catch (e) { if (btn) btn.disabled = false; if (e.miss) { toast(e.message); render(); } else toast('Not published: ' + niceError(e)); }
}
// Unpublish: the guide goes offline (status "ready": built, not public); its content and any draft stay as they are.
async function cmUnpublish(btn) {
  if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Sure? Tap again to take it offline'; return; }
  btn.disabled = true;
  try {
    await ensureFresh();
    const r = await sb('/rest/v1/guides?id=eq.' + CM.g.id + '&select=status', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { status: 'ready' } });
    if (r && r[0]) CM.g.status = GUIDE.status = r[0].status;
    if (window.__acctHouses) window.__acctHouses();
    setSave('ok', cmSaveText()); toast(cmLive() ? 'Still published. Try again.' : 'Unpublished: guests can no longer open it.'); render();
  } catch (e) { toast('Not unpublished: ' + niceError(e)); btn.disabled = false; }
}
async function cmDiscard(btn) {
  if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Sure? Tap again to undo everything'; return; }
  clearTimeout(CM.timer); while (CM.saving) await CM.saving;
  CM.g.content = cmClone(CM.live.content); CM.g.theme = cmClone(CM.live.theme); CM.open.clear();
  await cmSave(); toast('Back to the guide guests see'); render();
}
// Preview opens the draft in the guide itself. A save still waiting goes first (the tab opens at once, so it is never blocked).
function cmPreview(e, a) {
  if (!CM.timer && !CM.saving) return;
  e.preventDefault();
  const w = window.open('', '_blank');
  cmSave().then(() => { if (w) w.location.href = a.href; else location.href = a.href; });
}

/* --- Photos and logo: straight to the guide's storage, used by the draft until published --- */
async function edUpload(file, kind) {
  const bmp = await createImageBitmap(file), max = kind === 'logo' ? 512 : 1600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const png = kind === 'logo', blob = await new Promise(r => cv.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.85));
  return edPut(blob, (png ? 'logo-' : 'guide/u-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + (png ? '.png' : '.jpg'));
}
async function edPut(blob, name) {
  await ensureFresh();
  const r = await fetch(`${SB.url}/storage/v1/object/guide-assets/${CM.g.id}/${name}`, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + AUTH.access_token, 'Content-Type': blob.type, 'x-upsert': 'true' }, body: blob });
  if (!r.ok) throw new Error('The photo could not be uploaded');
  return name;
}
/* --- The logo: on the welcome card and, as icons, on guests' phones and browser tabs (site.icons, read by the viewer).
   No logo: none is shown; the icons then come from the house photo. --- */
const edLoad = src => src instanceof Blob ? createImageBitmap(src) : new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('The image could not be read')); i.src = src; });
async function edIconsFrom(src, fit) {   // fit: 'contain' for a logo (never cut), 'cover' for a photo
  const im = await edLoad(src), w = im.width, h = im.height, stamp = Date.now().toString(36), out = {};
  for (const [k, n] of [['favicon', 64], ['apple', 180], ['i192', 192], ['i512', 512], ['maskable', 512]]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = n; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, n, n);
    const box = k === 'maskable' ? n * 0.8 : n, k2 = fit === 'cover' ? Math.max(box / w, box / h) : Math.min(box / w, box / h);
    x.drawImage(im, (n - w * k2) / 2, (n - h * k2) / 2, w * k2, h * k2);
    out[k] = await edPut(await new Promise(r => cv.toBlob(r, 'image/png')), `icons/${stamp}-${k}.png`);
  }
  return out;
}
async function edLogoRemove() {
  const s = edC().site, h = (edC().files || {}).house || {};
  delete s.logo; delete s.icons; cmQueue(); render();
  edWorldFollow('logo');   // the guide's colours came from the logo: back to Bauhaus
  if (h.photo) { try { s.icons = await edIconsFrom(edImg(h.photo), 'cover'); cmQueue(); } catch (e) { /* the build's icons stay */ } }
}
// Contrast of two colours (WCAG 2), for the fair's icon on its tone (cmBadge).
const edLum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const edContrast = (a, b) => { const [x, y] = [edLum(a), edLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The colours an older layout or "from my picture" wrote into the theme's css: every colour token (the generated ones and
// the editor's) comes out when a colour world is picked, so the world's colours show; fonts stay.
const ED_COLOR_VARS = /--(paper|white|ink|muted|faint|line|red|blue|yellow|orange|green|accent|k-sky|med-[a-z]+|ru-[a-z]+|sf-[a-z]+(?:-d)?)\s*:\s*[^;}]+;?/g;
async function edPhotoInput(t) {
  const files = [...t.files]; if (!files.length) return;
  setSave('busy', files.length > 1 ? `Uploading ${files.length} photos…` : 'Uploading…');
  try {
    for (const f of files) {
      const name = await edUpload(f, t.dataset.kind);
      if (t.dataset.phadd) { const p = edPath(t.dataset.phadd); let a = edGet(edC(), p); if (!Array.isArray(a)) { edSet(edC(), p, []); a = edGet(edC(), p); } a.push(name); }
      else { edSet(edC(), edPath(t.dataset.phset), name); if (t.dataset.phset === 'files/house/photo') { edSet(edC(), ['files', 'house', 'cover'], 'photo'); edCoverMade(name); edWorldFollow('cover'); } }
      if (t.dataset.phset === 'site/logo') { setSave('busy', 'Making the icons for phones…'); edC().site.icons = await edIconsFrom(f, 'contain'); edWorldFollow('logo'); }
    }
    cmQueue(); render();
  } catch (e) { setSave('err', 'Not uploaded: ' + (e.message || 'try again')); }
}

/* --- Translations: the guide builder translates the draft; the texts also come back here, into this open copy --- */
function edMissing(l) {
  let n = 0;
  const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (edIs18(x)) { if (!x[l] && Object.values(x).some(Boolean)) n++; } else Object.values(x).forEach(walk); } };
  walk(edC().files || {}); return n;
}
function cmApplyTranslations(map) {
  const main = edLangs()[0]; let n = 0;
  const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (edIs18(x)) { const t = map[x[main]]; if (t) for (const [l, s] of Object.entries(t)) if (!x[l] && s) { x[l] = s; n++; } } else Object.values(x).forEach(walk); } };
  walk(edC().files || {}); return n;
}
async function cmTranslate() {
  const langs = edLangs().filter(l => edMissing(l) > 0);
  const end = msg => { CM.trJob = null; CM.trDone = msg; render(); };
  if (!langs.length) return end('Everything is already translated.');
  if (CM.trJob) return;
  CM.trDone = ''; CM.trJob = { status: 'queued', since: Date.now() }; render();
  try {
    await cmSave();
    const j = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: CM.g.id, kind: 'translate', langs } });
    const id = j && j[0] && j[0].id; if (!id) throw new Error('Could not start');
    const job = CM.trJob;
    for (let i = 0; i < 450; i++) {
      await new Promise(r => setTimeout(r, 4000));
      await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs?select=status,message,result&id=eq.' + id), st = r && r[0];
      if (!st) continue;
      progSet(job, st);
      if (st.status === 'failed') return end('Did not work: ' + (st.message || 'try again later'));
      if (st.status === 'done') { const n = cmApplyTranslations(st.result || {}); if (n) cmQueue(); return end(n ? `${cmCount(n, 'text', 'texts')} translated. Preview, then publish.` : (st.message || 'Done.')); }
    }
    end('Still waiting. Check again in a while.');
  } catch (e) { end('Did not work: ' + niceError(e)); }
}

/* --- Typing, ticking, adding, removing --- */
function edEdit(t) {
  const c = edC(), p = edPath(t.dataset.p), val = t.value, kind = t.dataset.t;
  if (kind === 'i18n') {
    let o = edGet(c, p); if (!o || typeof o !== 'object') { o = {}; edSet(c, p, o); }
    const shown = edShown(o);
    for (const l of Object.keys(o)) if (l !== CM.lang && (o[l] === shown || o[l] === '')) o[l] = val;
    o[CM.lang] = val;
  } else if (kind === 'num') edSet(c, p, val === '' ? 0 : Number(val));
  else edSet(c, p, val);
  const own = t.dataset.p.match(/^files\/(?:restaurants|nightlife|todo)\/items\/\d+\/(phone|url|schedule)(\/|$)/); if (own) plMine(t.dataset.p, own[1]);   // typed by the host: theirs
  if (p[0] === 'private' && p[1] === 'wifi') cmWifiQr();
  if (p[p.length - 1] === 'c' && p[p.length - 3] === 'badges' && /^#[0-9a-f]{6}$/i.test(val)) { const n = parseInt(val.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; edGet(c, p.slice(0, -1)).ink = lum > 0.62; }
  cmQueue();
}
// The QR code is made when the guide is built. A new name or password drops it (the guide then draws one itself);
// typing the published ones back brings it back, so nothing shows as changed.
function cmWifiQr() {
  const w = (edC().private || {}).wifi, lw = ((CM.live.content.private || {}).wifi) || {};
  if (w) (w.networks || []).forEach((n, i) => { const l = (lw.networks || [])[i]; if (l && l.qr && l.ssid === n.ssid && lw.password === w.password) n.qr = l.qr; else delete n.qr; });
}
// The editor's own tokens live in one block at the end of the theme CSS (editor:start ... editor:end).
const edVarsOf = css => { const decl = {}; for (const m of edBlockOf(css).matchAll(/(--[a-z-]+)\s*:\s*([^;}]+)/g)) decl[m[1]] = m[2].trim(); return decl; };
function edWriteVars(th, vars) {
  const css = th.css || '', decl = { ...edVarsOf(css), ...vars };
  const block = `/* editor:start */\n:root{${Object.entries(decl).map(([k, x]) => `${k}:${x}`).join(';')}}\n/* editor:end */`;
  th.css = /\/\* editor:start \*\//.test(css) ? css.replace(/\/\* editor:start \*\/[\s\S]*?\/\* editor:end \*\//, block) : css + '\n' + block;
}
function edApplyDesign(kind, el) {
  const th = CM.g.theme = CM.g.theme || {}, site = edC().site = edC().site || {};
  // A colour fine-tuned: into the world itself ({ base, ...its own roles }), never a raw token, so the contrast rule applies to it
  if (kind === 'role') { const w = edWorldNow(); return edWorldApply({ ...(isWorldId(w) ? { base: w } : w), [el.dataset.role]: el.value.toUpperCase() }, th.worldFrom); }
  if ((kind === 'display' || kind === 'body') && !el.value) {   // the world's own font: no token, no extra font files
    const v = kind === 'display' ? '--display' : '--font';
    th.css = (th.css || '').replace(new RegExp(v + '\\s*:\\s*[^;}]+;?', 'g'), '');
    const keep = ['--display', '--font'].map(x => (edCssVar(th.css, x).match(/"([^"]+)"/) || [])[1]).filter(Boolean), fs = [];
    for (const nm of keep) { const f = ED_FONTS.find(x => x[1] === nm); if (f) for (const w of (f[2] || [400, 500, 600, 700])) fs.push(`${f[0]}/${w}.css`); }
    if (fs.length) { th.fonts = fs; site.theme = { ...(site.theme || {}), fonts: fs }; } else { delete th.fonts; if (site.theme) delete site.theme.fonts; }
    return cmQueue();
  }
  if (kind !== 'display' && kind !== 'body') return;
  const decl = edVarsOf(th.css || ''), f = ED_FONTS.find(x => x[0] === el.value), disp = kind === 'display';
  decl[disp ? '--display' : '--font'] = `"${f[1]}",${/serif|fraunces|cormorant|instrument/i.test(f[0]) && !/sans/i.test(f[0]) ? 'Georgia,serif' : 'system-ui,sans-serif'}`;
  const d = ED_FONTS.find(x => x[1] === ((decl['--display'] || '').match(/"([^"]+)"/) || [])[1]) || ED_FONTS[0], b = ED_FONTS.find(x => x[1] === ((decl['--font'] || '').match(/"([^"]+)"/) || [])[1]) || d;
  const fonts = []; for (const x of [d, b]) for (const w of (x[2] || [400, 500, 600, 700])) { const s = `${x[0]}/${w}.css`; if (!fonts.includes(s)) fonts.push(s); }
  th.fonts = fonts; site.theme = { ...(site.theme || {}), fonts };
  edWriteVars(th, decl);
  cmQueue();
}
const inEd = t => CM.on && t.closest && t.closest('.edz');
document.addEventListener('input', e => {
  const t = e.target; if (!inEd(t)) return;
  if (t.dataset.cprice) return plPrice(t);
  if (t.dataset.ckq !== undefined) return kFilter(t);   // a kind grid's search: filters in place, nothing saved, no redraw
  if (t.dataset.p) return edEdit(t);
  if (t.dataset.cfilter !== undefined) { const q = t.value.toLowerCase().trim(); t.closest('.edz').querySelectorAll('details.cmi').forEach(d => { d.hidden = !!q && !d.querySelector('summary').textContent.toLowerCase().includes(q); }); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!CM.on || !t.dataset) return;
  if (t.dataset.cmlang !== undefined) { CM.lang = t.value; return render(); }
  if (!inEd(t)) return;
  if (t.dataset.cseas) return plSeasonSet(t);
  if (t.dataset.cweek) { const r = edGet(edC(), edPath(t.dataset.cweek)); if (!r) return; if (+t.value) r.week_of_month = +t.value; else delete r.week_of_month; return cmQueue(); }   // a market's "Which weeks"
  if (t.dataset.unname) return cmUnname(t);   // a place waiting for a name, named
  if (t.dataset.pfweb) {   // nothing found, and the host knows its website: it is theirs, and read for the hours
    const v = t.value.trim(), u = pfUrl(v), it = edGet(edC(), edPath(t.dataset.pfweb)); if (!v || !it) return;
    if (!u) return toast('That does not look like a web address.');
    it.url = u; cmQueue(); return pfStart(t.dataset.pfweb, u);
  }
  if (t.dataset.gm) {   // a pasted Google Maps link: the pin moves when it holds a position, and the link becomes the place's map button
    const ip = edPath(t.dataset.gm), it = edGet(edC(), ip), pos = edParseMaps(t.value), url = t.value.trim();
    if (pos) { it.lat = pos.lat; it.lng = pos.lng; delete it.nomap; edUpdateKm(ip); }
    if (/^https?:\/\//.test(url)) it['map' in it && !('gmaps' in it) ? 'map' : 'gmaps'] = url;
    if (pos || /^https?:\/\//.test(url)) { cmQueue(); render(); if (!pos) toast('Link saved. To move the pin, paste the long link from the browser bar.'); }
  }
  else if (t.dataset.cmod) { const s = edC().site = edC().site || {}; s.modules = { ...(s.modules || {}), [t.dataset.cmod]: !!t.checked }; cmQueue(); render(); }
  else if (t.name === 'world' && t.closest('#cm_worlds')) edWorldPick(t.value);
  else if (t.dataset.design) edApplyDesign(t.dataset.design, t);
  else if (t.dataset.phadd !== undefined || t.dataset.phset !== undefined) edPhotoInput(t);
  else if (t.dataset.clang) { const s = edC().site = edC().site || {}; s.languages = [...(s.languages || ['en'])]; const l = t.dataset.clang, i = s.languages.indexOf(l); if (t.checked && i < 0) s.languages.push(l); else if (!t.checked && i > 0) s.languages.splice(i, 1); cmQueue(); render(); }
});
addEventListener('porta-lang', () => { if (CM.on) render(); });   // kinds, marks, days and months are written in the maker's language
document.addEventListener('toggle', e => { const d = e.target; if (CM.on && d.matches && d.matches('details.cmi,details.cm-more[data-open]')) d.open ? CM.open.add(d.dataset.open) : CM.open.delete(d.dataset.open); }, true);
document.addEventListener('keydown', e => { if (CM.on && e.key === 'Enter' && e.target && e.target.id === 'c_stopq') { e.preventDefault(); cmStopAdd(document.querySelector('[data-stopadd]')); }
  if (CM.on && e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.pfweb) { e.preventDefault(); e.target.blur(); } });   // the pasted website: Enter reads it
document.addEventListener('click', e => {
  if (!CM.on) return;
  const t = e.target.closest && e.target.closest('button,a[data-cpreview]'); if (!t) return;
  const d = t.dataset, arr = p => { let a = edGet(edC(), edPath(p)); if (!Array.isArray(a)) { edSet(edC(), edPath(p), []); a = edGet(edC(), edPath(p)); } return a; };
  const done = () => { cmQueue(); render(); };
  if (d.cpreview !== undefined) return cmPreview(e, t);
  if (d.logodel !== undefined) return edLogoRemove();
  if (d.cpublish !== undefined) return cmPublish(t);
  if (d.cunpublish !== undefined) return cmUnpublish(t);
  if (d.cdiscard !== undefined) return cmDiscard(t);
  if (!t.closest('.edz')) return;
  // A place's fact changed by hand (its kind, the hours or Open 24 hours, Book ahead) is the host's: no source said for it.
  { const own = d.ckind ? [d.ckind, 'kind'] : d.cflag && d.f === 'book' ? [d.cflag, 'book'] : d.cseason && /\/season$/.test(d.cseason) ? [d.cseason, 'season'] : d.callyear ? [d.callyear, 'season'] : d.calways || d.daytog || d.cseason || d.addsch ? [d.calways || d.daytog || d.cseason || d.addsch, 'schedule']
      : d.cdel && /\/schedule\/\d+$/.test(d.cdel) ? [d.cdel, 'schedule'] : null; if (own) plMine(...own); }
  if (d.clookgo) { const q = d.clookgo; CM.open.add(q); render();   // its card, open, at the top of the screen
    const c = document.querySelector(`details.cmi[data-open="${CSS.escape(q)}"]`); if (c) c.scrollIntoView({ block: 'start' }); return; }
  if (d.clookok) { const it = edGet(edC(), edPath(d.clookok)); if (it && it.look) it.look = { ...it.look, ok: new Date().toISOString().slice(0, 10) }; return done(); }   // "It is still open": the day, as the check writes its own (UTC)
  if (d.pflook) return pfStart(d.pflook);
  if (d.pfagain) { const it = edGet(edC(), edPath(d.pfagain)), j = it && CM.pf[it.id]; return pfStart(d.pfagain, (j && j.website) || ''); }
  if (d.cover) { edSet(edC(), ['files', 'house', 'cover'], d.cover); edCoverMade(d.cover === 'photo' ? ((edC().files || {}).house || {}).photo : ''); return done(); }
  if (d.allpics !== undefined) { CM.allPics = true; return render(); }
  if (d.coverpic) { edSet(edC(), ['files', 'house', 'photo'], d.coverpic); edSet(edC(), ['files', 'house', 'cover'], 'photo'); edCoverMade(d.coverpic); done(); return edWorldFollow('cover'); }
  if (d.art) {
    const src = edImg(((edC().files || {}).house || {}).photo || '');
    if (d.art === 'words') { CM.artWords = CM.artWords || ''; render(); setTimeout(() => { const x = document.getElementById('c_artw'); if (x) x.focus(); }, 0); return; }
    if (d.art === 'draw') { const w = (document.getElementById('c_artw') || {}).value || ''; CM.artWords = w; return w.trim() ? artStart(src, w.trim()) : toast('Say how it should look first.'); }
    return artStart(src, d.art === 'again' ? CM.artLast : null);
  }
  if (d.artuse !== undefined && CM.artRes) { edSet(edC(), ['files', 'house', 'photo'], CM.artRes.path); edSet(edC(), ['files', 'house', 'cover'], 'photo'); edCoverMade(CM.artRes.path); CM.artRes = null; toast('Your new cover is set. Preview to see it.'); done(); return edWorldFollow('cover'); }
  if (d.daytog) { const o = edGet(edC(), edPath(d.daytog)); if (o) { const s = new Set(o.days || []); s.has(d.d) ? s.delete(d.d) : s.add(d.d); o.days = ED_DAYS.map(x => x[0]).filter(x => s.has(x)); done(); } return; }
  if (d.cflag) { const it = edGet(edC(), edPath(d.cflag)); if (it) { const s = new Set(it.flags || []); s.has(d.f) ? s.delete(d.f) : s.add(d.f); it.flags = [...s]; done(); } return; }
  // A place (cPlace): favourite, the form behind Change, its kind, marks, set menus, open 24 hours, part of the year.
  if (d.cfav) { const it = edGet(edC(), edPath(d.cfav)); if (it) { if (it.topPick) delete it.topPick; else it.topPick = true; done(); } return; }
  if (d.cchg) { CM.chg.has(d.cchg) ? CM.chg.delete(d.cchg) : CM.chg.add(d.cchg); return render(); }
  if (d.ckinds) { const p = d.ckinds, open = !CM.kpick.has(p); if (open) CM.kpick.add(p); else kClose(p); render();
    // On a desktop the search has the focus at once; on a touch screen it would raise the keyboard over the tiles.
    if (open && matchMedia('(pointer:fine)').matches) setTimeout(() => { const q = document.getElementById(cmId(p + '/kq')); if (q) q.focus({ preventScroll: true }); }, 0);
    return; }
  if (d.ckind) { kPick(d.ckind)(d.ckind, d.k); return done(); }   // a place's, a market's or an event's kind
  if (d.ctag) { const it = edGet(edC(), edPath(d.ctag)); if (it) { const tg = [...(it.tags || [])], j = tg.indexOf(d.m); j >= 0 ? tg.splice(j, 1) : tg.push(d.m); it.tags = tg; if (d.m === 'kidsfun') CM.kidsHand.add(d.ctag); done(); } return; }
  if (d.csmadd) { const it = edGet(edC(), edPath(d.csmadd)); if (it) { (it.setMenus = it.setMenus || []).push({ kind: 'menuDia', price: '' }); done(); const x = document.getElementById(cmId(`${d.csmadd}/setMenus/${it.setMenus.length - 1}/price`)); if (x) x.focus(); } return; }
  if (d.csmdel) { const q = edPath(d.csmdel), it = edGet(edC(), q.slice(0, -2)); if (it && Array.isArray(it.setMenus)) { it.setMenus.splice(q[q.length - 1], 1); if (!it.setMenus.length) delete it.setMenus; done(); } return; }
  if (d.calways) { const it = edGet(edC(), edPath(d.calways)); if (it) { if (it.always) delete it.always; else it.always = true; done(); } return; }   // the hours stay, only hidden
  // A place's own season (no rows of hours): on, June to September as on a row; off, it goes.
  // Off: its own season goes, and if its kind would still assume one, the place is open all year (the tag allyear). On: that
  // assumption back, else June to September as on a row.
  if (d.cseason && /\/season$/.test(d.cseason)) { const it = edGet(edC(), edPath(d.cseason).slice(0, -1)); if (it) {
    if (plSeasonOf(it)) { delete it.season; if (plSeasonOf(it)) plAllYear(it, true); }
    else { plAllYear(it, false); if (!plSeasonOf(it)) it.season = { from: '06-01', to: '09-30' }; }
    done(); } return; }
  if (d.callyear) { const it = edGet(edC(), edPath(d.callyear)); if (it) { delete it.season; plAllYear(it, true); done(); } return; }
  if (d.cseason) { const r = edGet(edC(), edPath(d.cseason)); if (r) { if (r.from || r.to) { delete r.from; delete r.to; } else { r.from = '06-01'; r.to = '09-30'; } done(); } return; }
  if (d.addsch) { const a = arr(d.addsch), it = edGet(edC(), edPath(d.addsch).slice(0, -1)), ss = !a.length && plOwnSeason(it);
    a.push({ days: [], open: '09:00', close: '14:00', ...(ss ? { from: ss.from, to: ss.to } : {}) });   // the first row takes the place's season
    if (ss) { delete it.season; plMine(d.addsch, 'season'); }
    return done(); }
  if (d.adddate) { arr(d.adddate).push({ start: '', end: '', status: 'expected' }); return done(); }
  if (d.translate !== undefined) return cmTranslate();
  if (d.cardmove) { e.preventDefault();   // the arrows sit in the card's title: they must not open it
    const p = edPath(d.cardmove), i = p[p.length - 1], a = edGet(edC(), p.slice(0, -1)), j = i + Number(d.dir); if (!Array.isArray(a) || j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; const there = d.cardmove.replace(/\d+$/, j), was = CM.open.has(d.cardmove), other = CM.open.has(there);
    was ? CM.open.add(there) : CM.open.delete(there); other ? CM.open.add(d.cardmove) : CM.open.delete(d.cardmove); return done(); }
  if (d.phmove) { const p = edPath(d.phmove), i = p[p.length - 1], a = edGet(edC(), p.slice(0, -1)), j = i + Number(d.dir); if (Array.isArray(a) && j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; done(); } return; }
  if (d.addtile) { edAddTile(d.addtile); return done(); }
  if (d.cpin) { cmPin(d.cpin); return done(); }
  if (d.evreach !== undefined) { if ((evAuto().reach === 'city') !== (d.evreach === 'city')) cmEvAutoSet({ reach: d.evreach === 'city' ? 'city' : 'car' }); return; }
  if (d.evauto !== undefined) { const on = !evAuto().on; cmEvAutoSet({ on, skip: evAuto().skip || [], want: evAuto().want || [] }).then(() => { if (on && !evAuto().last) cmEvRun(); }); return; }
  if (d.evadd) return cmEvTopic(d.evadd);
  if (d.evdel) { const k = d.evdel, cur = [...(evAuto()[k] || [])]; cur.splice(+d.i, 1); return cmEvAutoSet({ [k]: cur }); }
  if (d.evrun !== undefined) return cmEvBusy() ? undefined : evAuto().on ? cmEvRun() : cmFindStart(EV_PATH);
  if (d.tradd) { cmTrAdd(d.tradd); return done(); }
  if (d.stopadd !== undefined) return cmStopAdd(t);
  if (d.trlines) return cmLines(d.trlines);
  if (d.trtile !== undefined) { cmTrTile(); return done(); }
  if (d.cbool) { const q = edPath(d.cbool), o = edGet(edC(), q.slice(0, -1)); if (o) { o[q[q.length - 1]] = !o[q[q.length - 1]]; done(); } return; }
  if (d.addalt) { arr(d.addalt).push({ name: L6(''), phone: '' }); return done(); }
  if (d.addbadge) { arr(d.addbadge).push({ t: '', c: '#1D4FA0' }); return done(); }
  if (d.addto) { arr(d.addto).push({ dest: L6(''), time: '', note: L6('') }); return done(); }
  if (d.cfind) return cmFindStart(d.cfind);
  if (d.cfadd) return cmFindAccept(t, t.closest('[data-fpath]').dataset.fpath, d.cfadd);
  if (d.cfskip) { const f = CM.find[FIND_OF[t.closest('[data-fpath]').dataset.fpath][0]]; findMark(f.id, [d.cfskip]); return cmFindRefresh(); }
  if (d.cfstop !== undefined) { const path = t.closest('[data-fpath]').dataset.fpath, kind = FIND_OF[path][0]; findMark(CM.find[kind].id, cmFindItems(kind, path).map(x => x.id)); return cmFindRefresh(); }
  if (d.addcont !== undefined) { const g = edF().garbage; if (g) { (g.containers = g.containers || []).push({ where: Object.fromEntries(edLangs().map(l => [l, ''])), takes: [] }); CM.open.add('files/garbage/containers/' + (g.containers.length - 1)); done(); } return; }
  if (d.ctake !== undefined) { const ct = ((edF().garbage || {}).containers || [])[+d.ctake]; if (ct) { const s = ct.takes || []; ct.takes = s.includes(d.id) ? s.filter(x => x !== d.id) : [...s, d.id]; done(); } return; }
  if (d.amput) { cmAmPut(d.amput); return done(); }
  if (d.addit) { if (d.addit === 'files/nightlife/items') cmNightEnsure(); const a = arr(d.addit); a.push(edNewItem(a, d.addit)); CM.open.add(d.addit + '/' + (a.length - 1)); return done(); }
  if (d.addwifi !== undefined) { const pr = edC().private = edC().private || {}; pr.wifi = { password: '', networks: [{ ssid: '', label: Object.fromEntries(edLangs().map(l => [l, ''])) }] }; return done(); }
  if (d.addnet !== undefined) { edC().private.wifi.networks.push({ ssid: '', label: Object.fromEntries(edLangs().map(l => [l, ''])) }); return done(); }
  if (d.add) { const o = {}; for (const l of edLangs()) o[l] = ''; arr(d.add).push(o); done(); setTimeout(() => { const x = document.getElementById(cmId(d.add + '/' + (arr(d.add).length - 1))); if (x) x.focus(); }, 0); return; }
  if (d.cdel) {
    if (!d.now && d.sure !== '1') { const was = t.textContent; d.sure = '1'; t.textContent = 'Sure? Tap again'; setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = was; } }, 4000); return; }
    const p = edPath(d.cdel), a = edGet(edC(), p.slice(0, -1));
    const ev = d.cdel.startsWith('files/events/items/') && p.length === 4 && a && a[p[3]];
    if (ev && ev.auto) cmEvAutoSet({ removed: [...(evAuto().removed || []), { name: (ev.name || {}).en || edShown(ev.name), at: new Date().toISOString().slice(0, 10) }] });
    // A place's last row of hours removed: its season comes back to the place when every row removed carried the same one.
    const pl = /^files\/(?:restaurants|nightlife|todo)\/items\/\d+\/schedule\/\d+$/.test(d.cdel) && edGet(edC(), p.slice(0, -2));
    if (pl && Array.isArray(a) && a[p[p.length - 1]]) { const key = pl.id || d.cdel, gone = [...(PL_GONE.get(key) || []), a[p[p.length - 1]]];
      if (a.length > 1) PL_GONE.set(key, gone); else { PL_GONE.delete(key); plSeasonBack(pl, gone, 0); } }
    if (Array.isArray(a)) { a.splice(p[p.length - 1], 1); for (const S of [CM.open, CM.chg, CM.kpick]) for (const k of [...S]) if (k.startsWith(d.cdel)) S.delete(k); for (const k of [...CM.kq.keys()]) if (k.startsWith(d.cdel)) CM.kq.delete(k); if (p[0] === 'private') cmWifiQr(); done(); }
  }
});

/* --- Start: a guide that exists opens here instead of the questions --- */
const CM_OPENED_ON = decodeURIComponent(location.hash.slice(1));
function cmInit() {
  const g = GUIDE;
  if (!g || !g.content || !g.content.site || !(g.origin === 'imported' || ['ready', 'approved', 'published'].includes(g.status))) return;
  const d = g.draft && g.draft.content ? g.draft : null;
  CM.live = { content: g.content, theme: g.theme || {} };
  CM.g = { id: g.id, slug: g.slug, status: g.status, origin: g.origin, content: cmClone(d ? d.content : g.content), theme: cmClone(d ? d.theme || {} : g.theme || {}) };
  CM.lang = [A.sourceLang, 'en'].find(l => l && edLangs().includes(l)) || edLangs()[0];   // the language the guide was written in (answers.sourceLang), else English as before
  CM.on = true;
  const step = new URLSearchParams(location.search).get('step') || CM_OPENED_ON;   // the page's first draw is the builder's, which may send an address it does not know elsewhere
  if (step && cmIsPage(step)) history.replaceState(null, '', location.pathname + '#' + step);
  cmHeld();   // markets the build held back: asked and added by themselves, the editor never waits for them
}
(function () {
  const st = document.createElement('style');
  st.textContent = `.edz{display:flex;flex-direction:column;gap:18px;min-width:0}
.edz .lab{font-weight:700;font-size:15px}
.cm-h{font-size:22px;margin-top:8px}
.cm-list{display:flex;flex-direction:column;gap:8px}
.cmi{background:var(--sunk);border-radius:var(--r-s);border:1.5px solid var(--line)}
.cmi[open]{background:var(--surface);border-color:var(--ink)}
.cmi>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;min-height:54px}
.cmi>summary::-webkit-details-marker{display:none}
.cmi>summary span{display:flex;flex-direction:column;min-width:0}
.cmi>summary b{overflow-wrap:break-word}
.cmi>summary small{color:var(--muted);font-size:13px}
.cm-ord{display:flex;gap:4px;margin-left:auto;flex:none}
.cm-ord button{width:40px;height:40px;border-radius:50%;border:0;background:var(--surface);color:var(--ink);font-size:18px;line-height:1;cursor:pointer}
.cmi[open] .cm-ord button{background:var(--sunk)}
.cm-ord button:disabled{opacity:.35;cursor:default}
.cmi>summary .chev{flex:none;width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin:0 4px 4px}
.cmi[open]>summary .chev{transform:rotate(-135deg);margin:4px 4px 0}
.cmb{display:flex;flex-direction:column;gap:16px;padding:4px 14px 16px}
@media (max-width:420px){.cmb{padding:4px 10px 14px}.cm-sch{padding:10px!important}}
.cm-lines{display:flex;flex-direction:column;gap:8px}
.cm-line{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:8px;align-items:start}
.cm-line textarea{min-height:56px}
.cm-x{width:40px;height:40px;flex:none;border-radius:50%;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font-size:20px;line-height:1;color:var(--ink)}
.cm-add,.cm-file{align-self:flex-start}
.cm-file{cursor:pointer;position:relative}
.edz button.chip{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}
.edz button.chip:disabled{opacity:.45;cursor:not-allowed}
.edz button.chip[aria-pressed=true] span{background:var(--night,var(--ink));border-color:var(--night,var(--ink));color:#fff}
.edz button.chip:focus-visible span{outline:3px solid var(--focus);outline-offset:2px}
.cm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cm-row input,.cm-row select{width:auto;flex:1 1 130px;min-width:0}
.cm-dayrow{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
.cm-sch .chips{gap:6px}
.cm-sch .chip span{padding:6px 11px;font-size:14px}
.cm-dayrow select{width:auto;flex:1;min-width:0}
.cm-dayrow input[type=text]{flex:1;min-width:0}
.cm-dayrow input.cm-lc{width:56px;height:46px;flex:none;padding:2px;border-radius:var(--r-s);border:1.5px solid var(--line);background:none;cursor:pointer}
.cm-times{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;align-items:center}
.cm-times input{min-width:0;padding-inline:8px}
.cm-dates{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.cm-dates label{display:flex;flex-direction:column;gap:2px;min-width:0}
.cm-dates input{min-width:0}
.edz input[type=date]{width:100%;background:var(--sunk);border:1.5px solid var(--line);border-radius:var(--r-s);padding:11px 12px;font-size:16px}
.edz input[type=date]:focus{border-color:var(--ink);outline:none;background:var(--surface)}
.cm-sch{display:flex;flex-direction:column;gap:12px;padding:12px;border-radius:var(--r-s);background:var(--sunk)}
.cm-sr{display:flex;flex-direction:column;gap:8px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.cm-sch .btn{align-self:flex-start}
.cm-sub{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:var(--r-s);background:var(--sunk)}
.btn.danger{border-color:var(--danger);color:var(--danger)}
.thumb .cm-phb{display:flex;gap:4px;padding:4px}
.thumb .cm-phb .btn{flex:1;padding:0;min-height:32px;font-size:18px}
.cm-colors{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.cm-colors input[type=color]{width:100%;height:44px;padding:2px;border-radius:var(--r-s);border:1.5px solid var(--line);background:none;cursor:pointer}
.cm-lang{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cm-lang label{font-weight:700;font-size:15px}
.cm-lang select{width:auto;flex:1 1 160px;max-width:260px}
/* "You are editing in": the select and what it means, ruled off from the step. From 900 px on one row, the hint beside the
   select, so the block is no taller than the select */
.cm-langbar{display:flex;flex-direction:column;gap:6px;padding-bottom:18px;border-bottom:1.5px solid var(--line)}
.cm-langbar .cm-langhint{margin:0}
@media (min-width:900px){.cm-langbar{flex-direction:row;align-items:center;gap:20px;padding-bottom:14px}.cm-langbar .cm-lang{flex:none;flex-wrap:nowrap}.cm-langbar .cm-lang select{width:140px;flex:none}.cm-langbar .cm-langhint{flex:1;min-width:0;font-size:13px;line-height:1.45}}
.cm-cover{display:flex;flex-direction:column;gap:10px}
.cm-cover img{width:100%;max-width:420px;aspect-ratio:16/10;object-fit:cover;border-radius:14px;display:block}
.cm-cover img.off{opacity:.35;filter:grayscale(1)}
.cm-logo img{width:88px;height:88px;object-fit:contain;background:#fff;border-radius:14px;border:1px solid var(--line)}
.cm-n{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:8px;border-radius:50%;background:var(--ink);color:var(--paper);font-size:13px;vertical-align:1px}
.cm-pics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}
.cm-allpics{margin-bottom:10px;align-self:flex-start}
.cm-pic{padding:0;border:0;border-radius:12px;overflow:hidden;cursor:pointer;background:var(--sunk);aspect-ratio:4/3}
.cm-pic img{width:100%;height:100%;object-fit:cover;display:block}
.cm-pic[aria-pressed=true]{outline:3px solid var(--ink);outline-offset:2px}
.cm-pic:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.btn[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.cm-art{display:flex;flex-direction:column;gap:12px;margin-top:14px;padding:14px;border-radius:var(--r-s);background:var(--sunk)}
.cm-arthd{display:flex;gap:12px;align-items:center}
.cm-arthd img{flex:none;width:64px;height:48px;object-fit:cover;border-radius:8px}
.cm-arthd span{display:flex;flex-direction:column;gap:2px;min-width:0}
.cm-arthd small{color:var(--muted);font-size:13.5px}
.cm-artres{margin:0;display:flex;flex-direction:column;gap:10px}
.cm-artres img{width:100%;max-width:480px;aspect-ratio:3/2;object-fit:cover;border-radius:14px;display:block}
.cm-err{color:var(--danger)}
.cm-more{border-top:1.5px solid var(--line);padding-top:12px}
.cm-found{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:var(--r-s);background:var(--sunk);margin-bottom:14px}
.cm-foundh{justify-content:space-between}.cm-foundh b{flex:1 1 auto}
.cm-found .hint{margin:0}
.cm-badges{display:flex;flex-wrap:wrap;gap:6px}
.cm-badge{font-weight:700;font-size:13px;line-height:1.2;padding:3px 9px;border-radius:6px}
.cm-to{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:2px}
.cm-stopadd .cm-row input{flex:3 1 180px}
.cm-more>summary{cursor:pointer;font-weight:700;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;min-height:32px}
.cm-more>summary small{font-weight:500;color:var(--muted);font-size:13.5px}
.cm-more[open]>summary{margin-bottom:12px}
.cm-more .lab{display:block;margin:12px 0 8px}
.cm-fontlist{display:flex;flex-wrap:wrap;gap:8px}
.cm-fontlist .chip span{font-size:16px;font-weight:500}
.si-guide{display:flex;flex-direction:column;gap:2px;padding:6px 10px 10px;margin-bottom:4px;border-bottom:1.5px solid var(--line)}
.si-guide b{font-size:16px;line-height:1.25;overflow-wrap:anywhere}
.si-guide small{font-size:13px;color:var(--muted);overflow-wrap:anywhere}
.si-guide a{color:inherit}
.foot .btn svg{width:16px;height:16px}
.cm-find{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:var(--r-s);background:var(--sunk);box-shadow:inset 3px 0 0 var(--sun)}
.cm-fhead{display:flex;gap:10px;align-items:center}
.cm-fhead b{font-size:16px}
.cm-fcard{display:flex;flex-direction:column;gap:8px}
.cm-fcard small{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cm-fcard h3{font-size:24px}
.cm-fcard p{margin:0}
.cm-fsub{color:var(--muted);font-size:14px}
.cm-flinks{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;font-weight:600}
.cm-fbtns{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:4px}
.cm-fbtns .btn[aria-disabled="true"]{pointer-events:auto;cursor:default;opacity:.5}
.cm-fbtns .btn[aria-busy="true"]{cursor:progress;opacity:.6}
.cm-fclosed{font-size:14px}
.cm-fclosed.permanent b{color:var(--danger)}
.cm-fclosed a{font-weight:600}
.cm-progw{display:flex;flex-direction:column;gap:6px;width:100%;max-width:520px}
.cm-prog{height:10px;border-radius:99px;background:var(--line);overflow:hidden}
.cm-prog i{display:block;height:100%;width:0;border-radius:99px;background:var(--sun);transition:width 1s linear}
.cm-progw.dark .cm-prog{background:rgba(255,255,255,.2)}
.cm-progw.dark .cm-progt{color:inherit;opacity:.85}
/* The building screen (runtime.js buildState): one dark card. The line that changes (.btick) keeps the room of two lines, so
   nothing moves when it does; it fades (none when the device asks for less motion). From 900 px the build's steps sit
   beside the bar, left of the lit doorway. On a phone the doorway sits bottom right: the words near the bottom stop before
   it, and the last one keeps the doorway's height so the changing line, full width, always stays above it. */
#bstate{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.bwrap{display:grid;gap:18px}
.bgrid{display:grid;gap:12px;width:100%}
.bmain{display:flex;flex-direction:column;gap:12px;min-width:0}
.bmain .cm-progw{max-width:none}
.hero p.btick{display:grid;max-width:none;min-height:2.9em;margin:2px 0 0;font-size:17px;line-height:1.45;font-weight:500;color:var(--lamp2);opacity:1}
.btick span{grid-area:1/1;opacity:0;transition:opacity .5s ease}
.btick span.on{opacity:1}
.hero p.bclose{font-size:14px;opacity:.72}
.bside{display:none}
.bsteps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.bsteps li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:start;font-size:15px;line-height:1.35;opacity:.6}
.bsteps li.done{opacity:.85}
.bsteps li.now{opacity:1;font-weight:600;color:var(--lamp2)}
.bsteps i{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(244,241,234,.4);display:grid;place-items:center}
.bsteps li.done i{background:var(--lamp);box-shadow:none;color:#2A1A04}
.bsteps li.done i svg{width:13px;height:13px;stroke-width:3}
.bsteps li.now i{box-shadow:inset 0 0 0 2px var(--lamp)}
.bsteps li.now i::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--lamp)}
.hero p.burl{font-size:14px;opacity:.7;overflow-wrap:anywhere}
/* The guide's address and Copy link beside it (runtime.js copyBtn), on the ready screen and on Publish changes */
.burlrow,.cm-urlrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.burlrow .burl,.cm-urlrow .hint{margin:0;min-width:0}
.hero .cplink{background:none;border-color:rgba(244,241,234,.55);color:#F4F1EA}
.cplink{flex:none}
.hero p.berr{color:#FFD0C2;opacity:1}
.hero .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.bopen{background:none;border-color:rgba(244,241,234,.55);color:#F4F1EA}
.bwait i{width:40%!important;animation:bwait 1.4s ease-in-out infinite alternate}
@keyframes bwait{from{margin-left:0}to{margin-left:60%}}
.bcards{gap:14px}
.bfrow{display:flex;flex-wrap:wrap;gap:10px;padding:0 4px}
.bcards .bask{margin:0;font-size:16px;font-weight:600;padding-bottom:14px;border-bottom:1.5px solid var(--line)}
.cm-fwhy{display:flex;flex-wrap:wrap;gap:6px}
.cm-fwhy span{font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--sunk);color:var(--ink)}
@media (min-width:900px){
  .bgrid{grid-template-columns:minmax(0,1fr) minmax(0,230px);gap:48px;padding-right:150px;box-sizing:border-box}
  .bside{display:flex;flex-direction:column;gap:14px;padding-top:8px}
  .bwrap.two{grid-template-columns:minmax(0,5fr) minmax(0,6fr);align-items:stretch}
  .bwrap.two .bhero{padding-bottom:200px}
}
@media (max-width:620px){#bstate > :not(.bgrid),.bmain > p:not(.btick){max-width:calc(100% - 76px)}.hero p.bclose{min-height:80px}.bwrap.two .bmore{display:none}}
@media (prefers-reduced-motion:reduce){.btick span{transition:none}.bwait i{animation:none;width:100%!important;opacity:.6}}
@media (prefers-reduced-motion:reduce){.cm-prog i{transition:none}}
.cm-swrow{display:flex;flex-direction:column;gap:6px}
.cm-switch{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:10px 14px;border-radius:var(--r-s);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600;text-align:left;cursor:pointer}
.cm-switch:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.cm-sw-track{flex:none;position:relative;width:46px;height:28px;border-radius:999px;background:var(--line)}
.cm-sw-knob{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.cm-switch[aria-checked=true] .cm-sw-track{background:var(--ok)}
.cm-switch[aria-checked=true] .cm-sw-knob{left:21px}
.cm-sw-label{flex:1;min-width:0}
.cm-sw-state{flex:none;font-size:13px;font-weight:700;color:var(--muted)}
.cm-switch[aria-checked=true] .cm-sw-state{color:var(--ok)}
.cm-topic span{gap:4px;padding-right:6px}
.cm-topic button{border:0;background:none;font:inherit;font-size:17px;line-height:1;padding:0 4px;cursor:pointer;color:inherit}
.cm-fstop{align-self:center;border:0;background:none;font:inherit;font-size:14px;color:var(--muted);text-decoration:underline;cursor:pointer;padding:6px}
/* A place (cPlace): the kind's tile, the summary filled in for the host, the form behind Change */
.pl-ic{flex:none;width:40px;height:40px;border-radius:12px;background:var(--kc,var(--pine));color:#fff;display:grid;place-items:center;font-style:normal}
.pl-ic svg{width:24px;height:24px}
.pl-ic.s{width:28px;height:28px;border-radius:8px}.pl-ic.s svg{width:18px;height:18px}
.pl-ic.none{background:none;box-shadow:inset 0 0 0 1.5px var(--line)}
.cmi>summary .pl-ic{margin-right:-2px}
.cmi>summary .pl-ic+span{flex:1}
.pl-found{gap:6px;margin:0;padding:8px 14px 14px}
.pl-found:not(:has(.pl-ls)){padding-bottom:8px}
.pl-hd{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pl-h{font-size:15px}
.pl-ls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:7px 24px}   /* two columns on a wide screen, one on a phone */
.pl-ls>.pl-lk,.pl-ls>.pl-lm,.pl-ls>.pl-note{grid-column:1/-1}
.pl-clip{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pl-l{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;font-size:15px;line-height:1.35}
.pl-l>i{display:grid;place-items:center;height:21px;color:var(--muted);font-style:normal}
.pl-l>i svg{width:18px;height:18px}
.pl-l.pl-lk{align-items:center;font-weight:600}
.pl-l a{color:inherit;overflow-wrap:anywhere}
.pl-hl{display:block}.pl-nw{white-space:nowrap}
.pl-hl small{color:var(--muted);font-size:13.5px;white-space:nowrap}   /* "from 13 Jun to 12 Jul" in one piece, on the line of its hours when there is room */
.pl-ls>.pl-lw{grid-column:1/-1}   /* hours and prices across the panel; the phone and the website share the row under them */
.pl-note{margin:0;color:var(--muted);font-size:13.5px}
.pl-mks{display:flex;flex-wrap:wrap;gap:4px 6px}
.pl-mk{font-size:13.5px;font-weight:600;line-height:1.3;padding:1px 9px;border-radius:999px;background:var(--surface);border:1px solid var(--line)}
.pl-found .pl-chg{margin-right:-4px}
.pl-chg,.pl-add{min-height:40px}
.pl-form{gap:16px 20px}
.pl-kindrow{display:flex;align-items:center;gap:10px;min-height:40px;flex-wrap:wrap}
.pl-kn{font-weight:600}
.pl-link{border:0;background:none;font:inherit;font-weight:700;color:var(--ink);text-decoration:underline;cursor:pointer;padding:8px 4px;min-height:40px;margin-left:auto}
.pl-kinds-w{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.pl-kinds{display:grid;grid-template-columns:repeat(auto-fill,104px);gap:8px}
@media (max-width:480px){.pl-kinds-w{margin-inline:-4px}.pl-kinds{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}}   /* three across at 360 px: "Montagne et" still on one line */
.pl-kg{margin:6px 0 0;font-size:13.5px;font-weight:700;color:var(--muted)}
.pl-kinds-w>.pl-kq{margin-bottom:2px}   /* the kinds' search (kGrid): the maker's own field, right above the tiles */
@media (max-width:480px){.pl-kinds-w>.pl-kq,.pl-kinds-w>.pl-knone{width:auto;margin-inline:4px}}   /* in line with the card's fields, not with the wider grid */
.pl-knone{margin:2px 0 0}
.pl-k{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;min-height:96px;padding:10px 2px 8px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.pl-k span{font-size:13.5px;font-weight:500;line-height:1.25;text-align:center;overflow-wrap:normal;word-break:normal;hyphens:manual}
.pl-k[aria-pressed=true]{border-color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pl-k:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.pl-marks .chip span,.pl-part .chip span{min-height:40px}
.pl-price{display:flex;align-items:center;gap:8px}
.pl-price input{width:84px;flex:none;padding-inline:10px}
.pl-sm{display:grid;grid-template-columns:minmax(0,1fr) 70px 40px;gap:6px;align-items:center;margin-bottom:8px}
.pl-sm select{padding-inline:8px 4px;max-width:320px}
.pl-sm input{padding-inline:8px}
.pl-add{align-self:flex-start}
.pl-part{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.pl-season{display:flex;align-items:center;gap:3px;max-width:100%}
.pl-season select{width:auto;flex:none;min-height:40px;padding:6px 5px;-webkit-appearance:none;appearance:none;text-align:center;background:var(--surface)}
.pl-season span{font-size:15px;font-weight:500}
.pl-form .cm-sch{padding:0!important;background:none}   /* one surface: the hours are not a box inside the card */
.pl-sub{margin-top:4px;padding-top:14px;border-top:1px solid var(--line)}
.pl-form .cm-times{max-width:360px}   /* two times, not two long empty fields on a wide screen */
/* Where the facts came from, and a lookup of them (pfWaitHTML, plFrom): quiet lines at the foot of the panel, never a box */
.pl-ls>.pl-src,.pl-ls>.pl-foot,.pl-ls>.pl-web{grid-column:1/-1}
.pl-src{margin:1px 0 0;color:var(--muted);font-size:13px;line-height:1.4}
.pl-src a{color:inherit;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
.cm-unn{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:var(--r-s);background:var(--sunk);box-shadow:inset 3px 0 0 var(--warn)}   /* places waiting for a name (cmUnnamed) */
.cm-unn>b{font-size:16px}.cm-unn>.hint{margin:-4px 0 0}
.cm-unr{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px 8px;align-items:center;padding-top:10px;border-top:1px solid var(--line)}
.cm-unl{grid-column:1/-1;margin:0;font-size:14px;line-height:1.4;color:var(--muted)}
.cm-unl a{color:inherit;white-space:nowrap}
.cm-unc{display:block;color:var(--ink);overflow-wrap:anywhere}
.pl-foot{margin:0;display:flex;flex-wrap:wrap;align-items:center;column-gap:6px}
.pl-more{border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:underline;text-underline-offset:2px;cursor:pointer;padding:0;min-height:32px}
.pl-wait{display:flex;flex-direction:column;gap:8px;padding:4px 0 2px}
.pl-wait .cm-prog{height:4px;max-width:240px}
.pl-web{margin-top:4px}
.pl-web input{max-width:420px}
/* A market (cMarket) and an event's kind (evKind): the place card's pieces, and these */
.pl-qty{font-weight:500;color:var(--muted)}
.pl-when{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pl-wk{width:auto;flex:0 1 auto;min-width:0;max-width:100%;min-height:40px;padding:6px 10px;font-size:15px;font-weight:600;background:var(--surface)}
.pl-sws{display:flex;flex-direction:column;gap:10px}
.pl-sells{gap:6px}.pl-sells .chip span{padding:6px 12px;font-size:14px}   /* sixteen chips: as few rows as the width allows */
.pl-kindrow:has([data-ckinds^="files/markets/"]) .pl-kn{flex:1 1 0;min-width:0}   /* "Antiques and crafts" wraps, Change stays on the row */
.cmi textarea[data-p^="files/markets/"]{field-sizing:content;min-height:0}   /* a market's name and description: as tall as their words */
/* A place out of season (season.js): the row's quiet note while guests do not see it; "Open all year" under the season line */
.cmi>summary small.pl-hid{color:var(--muted);font-style:italic}
/* "Is it still open?" (lkHTML): a calm question at the top of the card, the panel's own surface, no warning colour */
.pl-look{gap:6px;padding:12px 14px 14px}
.pl-lks{margin:0;font-size:14.5px;line-height:1.45}
.pl-lks a{color:inherit;font-weight:600;text-underline-offset:2px;white-space:nowrap}
.pl-lka{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.pl-lka .btn{min-height:40px}
.cmi[open]>summary small.pl-lkn{display:none}
/* The places asked about, named at the top of the step (lkList): one line, lighter than "Waiting for a name", no box */
.cm-lkl{margin:0;padding:2px 0 2px 12px;box-shadow:inset 3px 0 0 var(--line);font-size:15px;line-height:1.6;overflow-wrap:normal;word-break:normal}
.cm-lkl>b{font-weight:700;margin-right:2px}
/* The markets the build held back (cmHeld): the same quiet line as above, at the top of Local markets; on the ready screen,
   lines of the dark card's own family */
.cm-held{display:flex;flex-direction:column;gap:4px;margin:0;padding:2px 0 2px 12px;box-shadow:inset 3px 0 0 var(--line);font-size:15px;line-height:1.5}
.cm-held p{margin:0}.cm-held .hd-n{font-weight:700}
#bheld{display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:620px}
#bheld:empty{display:none}
.hero #bheld p{margin:0;font-size:15.5px;line-height:1.5}
.hero #bheld .hd-n{font-weight:600}
.hero #bheld .hd-g{opacity:.85}
.cm-lkgo{display:inline;border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--ink);text-decoration:underline;text-underline-offset:2px;cursor:pointer;text-align:left}
.cmi{scroll-margin-top:16px}
.pl-l .pl-ally{display:block;margin-top:2px}`;
  document.head.appendChild(st);
})();
