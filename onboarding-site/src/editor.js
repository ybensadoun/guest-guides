/* ---------- Once the guide exists: the same steps edit the guide itself ----------
   A guide built from the answers, or imported like Ca La Kimberly, opens in the same pages as the onboarding
   (groups, tiles, rail, bottom bar), but each step shows and changes the guide's own content and look.
   Changes save as a draft (guides.draft) that guests never see: Preview shows it to the host, "Publish changes"
   makes it live. Plan and rules: docs/plan-single-editor.md */
const CM = { on: false, g: null, live: null, lang: 'en', timer: null, marks: null, saving: null, again: false, open: new Set() };
const ED_LANGS = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const ED_DAYS = [['mon', 'Mo'], ['tue', 'Tu'], ['wed', 'We'], ['thu', 'Th'], ['fri', 'Fr'], ['sat', 'Sa'], ['sun', 'Su']];
const ED_FONTS = [['jost', 'Jost'], ['inter', 'Inter'], ['cormorant-garamond', 'Cormorant Garamond'], ['dm-sans', 'DM Sans'], ['dm-serif-display', 'DM Serif Display', [400]], ['fraunces', 'Fraunces'], ['geist', 'Geist'], ['instrument-serif', 'Instrument Serif', [400]], ['nunito', 'Nunito'], ['outfit', 'Outfit'], ['space-grotesk', 'Space Grotesk'], ['bricolage-grotesque', 'Bricolage Grotesque']];
// Same layouts and skeletons as "The look" in the onboarding (MOODS), named by the guide's own presets.
const ED_PRESETS = [['bauhaus', 'Big colour tiles', 'Like an app: bold blocks, strong shapes.', 'm-bold'], ['editorial', 'Photo-led, like a magazine', 'Big photos and elegant type.', 'm-edit'], ['soft', 'Soft rounded cards', 'Gentle colours, rounded corners.', 'm-soft'], ['minimal', 'Clean and calm', 'Text first, thin lines, lots of white.', 'm-min']];
const ED_COLORS = [['--paper', 'Background', '#F3EEE3'], ['--white', 'Cards', '#FFFFFF'], ['--ink', 'Text', '#121212'], ['--muted', 'Secondary text', '#4A4A4A'], ['--red', 'Accent 1 (red)', '#D52B1E'], ['--blue', 'Accent 2 (blue)', '#1D4FA0'], ['--yellow', 'Accent 3 (yellow)', '#F5C400'], ['--orange', 'Accent 4 (orange)', '#EC6A1C'], ['--green', 'Accent 5 (green)', '#0E7C46']];
const ED_SEC = { transport: ['Getting around', 'Taxis, train stations and bus stops.'], house: ['The house page', 'Photos, rooms and what the house offers.'], garbage: ['Rubbish and recycling', 'Which bin goes out tonight.'], message: ['House guide', 'How everything works, room by room.'], emergency: ['Emergency contacts', '112, health, police, town services.'], quick: ['Home tiles', 'One tap for a taxi, the station, a favourite.'], markets: ['Markets', 'Weekly markets, with what is on today.'], restaurants: ['Bars and restaurants', 'The places you send friends to.'], todo: ['Things to do', 'Beaches, walks and sights nearby.'], events: ['Events', 'Festivals and fairs during the stay.'], reviews: ['Ratings and reviews', 'Your listing rating and reviews.'], map: ['Map', 'Every place in the guide on one map.'] };

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
const cmChanged = m => m.paths.some(p => { const q = edPath(p); return !cmSame(edGet(cmW(), q), edGet(CM.live, q)); });
const cmDirty = () => !cmSame(cmW(), CM.live);
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
    lead: 'The name on the guide and on guests’ phones, the text under a shared link, your logo and the languages.',
    paths: ['content/site/name', 'content/site/description', 'content/site/shareDescription', 'content/site/logo', 'content/site/languages', 'content/files/house/name', 'content/files/house/listing'], body: c => cmGuide(c) },
  { id: 'look', group: 'basics', title: 'The look', sub: 'Layout, fonts, colours', icon: 'eye', tc: 'var(--tomato)', sh: 'var(--ink)', shape: 'tri',
    lead: 'Pick the layout, then fine-tune the fonts and colours. Preview shows the result before guests see it.',
    paths: ['theme', 'content/site/theme', 'content/files/house/cover', 'content/files/house/photo'], body: c => cmLook(c) },
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
  { id: 'todo', group: 'area', sec: 'todo', title: 'Things to do', sub: c => cmCount(cmLen('files/todo/items'), 'place', 'places'), icon: 'compass', tc: 'var(--pine)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Beaches, walks and sights. Open a place to change its words, links, position and opening hours.',
    paths: ['content/files/todo'], body: () => cmPlaces('files/todo/items', 'place') },
  { id: 'restaurants', group: 'area', sec: 'restaurants', when: c => !!(c.files || {}).restaurants, title: 'Bars and restaurants', sub: c => cmCount(cmLen('files/restaurants/items'), 'place', 'places'), icon: 'heart', tc: 'var(--tomato)', ti: '#fff', sh: 'var(--sun)', shape: 'half', lang: true,
    lead: 'The places you send friends to, with a few words from you: what to order, when to go.',
    paths: ['content/files/restaurants'], body: () => cmPlaces('files/restaurants/items', 'place') },
  { id: 'markets', group: 'area', sec: 'markets', title: 'Markets', sub: c => cmCount(cmLen('files/markets/markets'), 'market', 'markets'), icon: 'bag', tc: 'var(--clay)', ti: '#fff', sh: 'var(--pine)', shape: 'circle', lang: true,
    lead: 'Weekly markets nearby. The guide shows which ones are on today from the days and hours here.',
    paths: ['content/files/markets'], body: () => cmPlaces('files/markets/markets', 'market') },
  { id: 'events', group: 'area', sec: 'events', title: 'Events', sub: c => cmCount(cmLen('files/events/items'), 'event', 'events'), icon: 'kite', tc: 'var(--plum)', ti: '#fff', sh: 'var(--sun)', shape: 'circle', lang: true,
    lead: 'Festivals and fairs. Guests see the ones during their stay, from the dates here.',
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
function cSchedule(path, arr) {
  return `<div class="f full"><span class="lab">Opening days and hours</span><div class="cm-sch">${(arr || []).map((r, k) => `<div class="cm-sr"><div class="cm-dayrow"><div class="chips" role="group" aria-label="Days">${cDays(`${path}/${k}`, r.days)}</div><button class="cm-x" type="button" data-cdel="${path}/${k}" data-now="1" aria-label="Remove these hours">×</button></div>
    <div class="cm-times"><input type="time" aria-label="Opens" data-p="${path}/${k}/open" data-t="str" value="${esc(r.open || '')}"><span>to</span><input type="time" aria-label="Closes" data-p="${path}/${k}/close" data-t="str" value="${esc(r.close || '')}"></div>
    ${r.from || r.to ? `<p class="hint">Only from ${esc(r.from || '?')} to ${esc(r.to || '?')} (month-day).</p>` : ''}</div>`).join('')}
    <button class="btn small" type="button" data-addsch="${path}">+ Add opening hours</button></div></div>`;
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
function cCard(p, title, meta, inner) {
  return `<details class="cmi" data-open="${esc(p)}"${CM.open.has(p) ? ' open' : ''}><summary><span><b>${esc(title)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</span><i class="chev" aria-hidden="true"></i></summary><div class="cmb">${inner}</div></details>`;
}

/* --- One place, contact or tile: its texts, links, position, hours or dates --- */
const C_SKIP = new Set(['id', 'from', 'icon', 'tone', 'group', 'category', 'cat', 'tags', 'flags', 'gid', 'checked', 'utility', 'always', 'wiki', 'hoursSource', 'topPick', 'rating', 'setMenus', 'sources', 'dates', 'schedule', 'lat', 'lng', 'km_from_house', 'wide', 'verify', 'alt', 'trains', 'bins', 'link', 'qr', 'stalls_approx']);
const C_STR = ['town', 'place', 'phone', 'web', 'url', 'map', 'gmaps', 'venue', 'address', 'comarca', 'price'];
const C_LONG = ['description', 'what', 'examples', 'priceNote', 'hours', 'occasional_when'];
const C_LBL = { name: 'Name', name_local: 'Name in the local language', title: 'Title on its page', sub: 'Line under the name', type: 'Type', kind: 'Kind', what: 'What guests need to know', description: 'Description', hours: 'Opening hours, in words', occasional_when: 'When it runs', town: 'Town', place: 'Where exactly', venue: 'Where exactly', address: 'Address', comarca: 'County', phone: 'Phone', url: 'Official website', web: 'Website', gmaps: 'Google Maps link', map: 'Map link', price: 'Price (€)', priceNote: 'About the price', taxiName: 'Taxi name', taxiSub: 'Line under the taxi' };
const C_ORDER = ['name', 'name_local', 'title', 'sub', 'type', 'kind', 'what', 'description', 'hours', 'occasional_when', 'town', 'place', 'venue', 'address', 'comarca', 'phone', 'url', 'web', 'gmaps', 'map', 'price', 'priceNote'];
const cLabel = k => C_LBL[k] || k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, x => x.toUpperCase());
const cName = it => edShown(it.name) || edShown(it.title) || edShown(it.where) || (it.id && !String(it.id).startsWith('custom-') ? it.id : 'New');
function cItem(base, it, i, what) {
  const p = `${base}/${i}`, ord = k => { const n = C_ORDER.indexOf(k); return n < 0 ? 99 : n; };
  const keys = Object.keys(it).filter(k => !C_SKIP.has(k) && !k.startsWith('_') && (edIs18(it[k]) || (C_STR.includes(k) && typeof it[k] === 'string'))).sort((a, b) => ord(a) - ord(b));
  const km = it.km_from_house != null && it.km_from_house !== '' ? it.km_from_house + ' km' : '';
  const meta = [typeof it.town === 'string' ? it.town : '', km, (it.flags || []).includes('check') ? 'check before going' : '', it.auto ? 'added automatically' : ''].filter(Boolean).join(' · ');
  const pos = typeof it.lat === 'number' ? `<div class="f full"><label for="${cmId(p + '/gm')}">Move the pin: paste a Google Maps link</label><p class="hint">${it.lat ? `Now at ${(+it.lat).toFixed(4)}, ${(+it.lng).toFixed(4)}${km ? `, ${km} from the house` : ''}.` : 'No position yet.'} Use the long link from the browser bar: it holds the position.</p><input id="${cmId(p + '/gm')}" type="text" inputmode="url" data-gm="${p}" placeholder="https://www.google.com/maps/…"></div>` : '';
  const check = Array.isArray(it.flags) || what !== 'contact' ? cSwitch(`data-cflag="${p}" data-f="check"`, 'Check before going', (it.flags || []).includes('check'), 'Tells guests to check the hours or the dates before they go.') : '';
  return cCard(p, cName(it), meta, `<div class="grid">${keys.map(k => cf(cLabel(k), `${p}/${k}`, it[k], { long: C_LONG.includes(k) || String(edIs18(it[k]) ? edShown(it[k]) : it[k]).length > 32, type: ['url', 'web', 'gmaps', 'map'].includes(k) ? 'url' : k === 'phone' ? 'tel' : 'text' })).join('')}
    ${'stalls_approx' in it ? cf('Stalls (about)', `${p}/stalls_approx`, it.stalls_approx, { type: 'number', half: true }) : ''}${pos}
    ${'schedule' in it || base.includes('markets') ? cSchedule(`${p}/schedule`, it.schedule) : ''}${'dates' in it || base.includes('events') ? cDates(`${p}/dates`, it.dates) : ''}</div>
    ${what === 'contact' ? '' : check}${base === 'files/restaurants/items' ? cPin(p, it) : ''}<div><button class="btn small danger" type="button" data-cdel="${p}">Delete this ${esc(what)}</button></div>`);
}
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
  const pick = k => it[k] != null ? { [k]: cmClone(it[k]) } : {};
  q.items.push({ id: 'food-' + it.id, icon: 'food', from: it.id, name: cmClone(it.name), sub: cmClone(it.type || {}), title: cmClone(it.name), kind: cmClone(it.type || {}), what: cmClone(it.description || {}),
    ...pick('phone'), ...pick('lat'), ...pick('lng'), ...pick('gmaps'), ...pick('schedule'), ...pick('hours'), ...pick('price'), ...pick('priceNote') });
  const s = edC().site = edC().site || {}; s.modules = { ...(s.modules || {}), quick: true };
}
function edNewItem(arr) {
  const clone = arr && arr[0] ? cmClone(arr[0]) : { name: { en: '' }, description: { en: '' }, lat: 0, lng: 0 };
  const h = edF().house || {};
  const clear = o => { for (const k of Object.keys(o)) { const x = o[k]; if (['icon', 'group', 'tone', 'category', 'type', 'tags', 'wide'].includes(k) && !edIs18(x)) continue; if (edIs18(x)) o[k] = Object.fromEntries(Object.keys(x).map(l => [l, ''])); else if (typeof x === 'string') o[k] = ''; else if (Array.isArray(x)) o[k] = []; else if (typeof x === 'number' && k !== 'lat' && k !== 'lng') o[k] = 0; } return o; };
  const n = clear(clone); n.id = 'custom-' + Date.now().toString(36);
  if ('lat' in n) { n.lat = h.lat || 0; n.lng = h.lng || 0; n.km_from_house = 0; }
  for (const k of ['verify', 'always', 'gid', 'checked', 'hoursSource', 'rating', 'topPick', 'wiki', 'sources', 'setMenus']) delete n[k];
  return n;
}
const edKm = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b), x = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(x))); };
function edUpdateKm(ip) { const it = edGet(edC(), ip), h = edF().house || {}; if (!it || !h.lat || !it.lat) return; if ('km_from_house' in it) it.km_from_house = edKm(h.lat, h.lng, it.lat, it.lng); if ('km' in it) it.km = edKm(h.lat, h.lng, it.lat, it.lng); }
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
    <div class="f full"><span class="lab">Logo</span><div class="cm-row cm-logo">${s.logo ? `<img src="${esc(edImg(s.logo))}" alt="Your logo">` : ''}<label class="btn small cm-file"><input class="sr" type="file" accept="image/*" data-phset="site/logo" data-kind="logo">${s.logo ? 'Change the logo' : 'Add a logo'}</label></div></div>
    <div class="f full"><span class="lab">Languages</span><p class="hint">The guide opens in the guest’s phone language when it can. The first one is the main language.</p>
    <div class="chips">${Object.entries(ED_LANGS).map(([k, n]) => { const on = langs.includes(k), miss = on ? edMissing(k) : 0; return `<label class="chip"><input type="checkbox" data-clang="${k}"${on ? ' checked' : ''}${k === langs[0] ? ' disabled' : ''}><span>${n}${k === langs[0] ? ' (main)' : ''}${miss ? ` · ${miss} to translate` : ''}</span></label>`; }).join('')}</div>
    <div class="cm-row"><button class="btn small" type="button" data-translate${CM.trJob && (CM.trJob.status === 'queued' || CM.trJob.status === 'running') ? ' disabled' : ''}>Translate missing texts</button><span class="hint" id="edJob">${esc(CM.trDone || '')}</span></div>
    ${CM.trJob && (CM.trJob.status === 'queued' || CM.trJob.status === 'running') ? progBar('tr', 'Translation') : ''}
    <p class="hint">Usually takes a few minutes. Until a text is translated, guests see it in the main language. The translations arrive as changes you preview and publish.</p></div>`;
}
const edCssVar = (css, name) => { const m = css.match(new RegExp(name + '\\s*:\\s*([^;}]+)')); return m ? m[1].trim() : ''; };
const edBlockOf = css => { const m = css.match(/\/\* editor:start \*\/([\s\S]*?)\/\* editor:end \*\//); return m ? m[1] : ''; };
const edCoverPhoto = h => !!h.photo && h.cover !== 'themed';
function cmLook(c) {
  const th = CM.g.theme, css = th.css || '', blk = edBlockOf(css), h = (c.files || {}).house || {};
  const val = (n, d) => { const x = edCssVar(blk, n) || edCssVar(css, n); return /^#[0-9a-fA-F]{6}$/.test(x) ? x : d; };
  const fam = n => { const x = (edCssVar(blk, n) || edCssVar(css, n)).match(/"([^"]+)"/); return x ? x[1] : ''; };
  const dispSel = (ED_FONTS.find(f => f[1] === fam('--display')) || [])[0] || ((th.fonts || [])[0] || '').split('/')[0] || 'jost';
  const bodySel = (ED_FONTS.find(f => f[1] === fam('--font')) || [])[0] || ((th.fonts || []).slice(-1)[0] || '').split('/')[0] || 'jost';
  const opts = sel => ED_FONTS.map(([id, n]) => `<option value="${id}"${id === sel ? ' selected' : ''}>${n}</option>`).join('');
  const preset = th.preset || ((c.site || {}).theme || {}).preset || 'bauhaus';
  return `<div class="f full"><span class="lab" id="l_cpreset">Layout</span><p class="hint">Each one shows the same sections in a different way.</p><div class="moods" role="radiogroup" aria-labelledby="l_cpreset">${ED_PRESETS.map(([id, n, d, cls]) => `<label class="mood"><input type="radio" name="cpreset" data-design="preset" value="${id}"${preset === id ? ' checked' : ''}><div class="box"><div class="mock ${cls}">${'<i></i>'.repeat(6)}</div><b>${n}</b><small>${d}</small></div></label>`).join('')}</div></div>
    <div class="grid"><div class="f"><label for="c_font_d">Font for titles</label><select id="c_font_d" data-design="display">${opts(dispSel)}</select></div><div class="f"><label for="c_font_b">Font for text</label><select id="c_font_b" data-design="body">${opts(bodySel)}</select></div></div>
    <div class="f full"><span class="lab">Colours</span><div class="cm-colors">${ED_COLORS.map(([v, l, d]) => `<label class="f"><span class="hint">${l}</span><input type="color" data-design="color" data-var="${v}" value="${val(v, d)}"></label>`).join('')}</div></div>
    <div class="f full"><span class="lab">Cover</span><p class="hint">Guests have already seen your listing photos, so the cover is drawn from your colours unless you choose a photo of your own.</p>
    <div class="chips"><button class="chip" type="button" data-cover="themed" aria-pressed="${!edCoverPhoto(h)}"><span>Drawn from my colours</span></button><button class="chip" type="button" data-cover="photo" aria-pressed="${edCoverPhoto(h)}"${h.photo ? '' : ' disabled'}><span>My photo</span></button></div>
    <div class="cm-cover">${h.photo ? `<img src="${esc(edImg(h.photo))}" alt="Your cover photo"${edCoverPhoto(h) ? '' : ' class="off"'}>` : ''}<label class="btn small cm-file"><input class="sr" type="file" accept="image/*" data-phset="files/house/photo">${h.photo ? 'Change the photo' : 'Add a photo'}</label></div></div>`;
}
function cmSections(c) {
  const ids = [...((((c.files || {}).sections || {}).sections) || []).map(x => x.id)];
  if (!ids.includes('quick')) ids.push('quick');
  if (!ids.includes('transport')) ids.splice(Math.max(0, ids.indexOf('emergency') + 1) || ids.length, 0, 'transport');   // Getting around: switched on, its step appears   // Home tiles: the step appears once switched on, and its first tile makes the file
  if ((c.files || {}).reviews && !ids.includes('reviews')) ids.push('reviews');
  if (!ids.includes('map')) ids.push('map');
  const m = (c.site || {}).modules || {};
  return `<div class="mods">${ids.map(id => { const [n, d] = ED_SEC[id] || [id, '']; return `<label class="mod"><input type="checkbox" data-cmod="${esc(id)}"${m[id] !== false ? ' checked' : ''}><div class="box"><span class="tick" aria-hidden="true">✓</span><div><b>${esc(n)}</b><small>${esc(d)}</small></div></div></label>`; }).join('')}</div>`;
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
    <h3 class="cm-h">Photos</h3>${cPhotos(P + '/photos', hp.photos)}
    ${(hp.tour || []).length ? `<h3 class="cm-h">Photos by room</h3><div class="cm-list">${hp.tour.map((r, i) => cCard(`${P}/tour/${i}`, edShown(r.room), cmCount((r.photos || []).length, 'photo', 'photos'), `<div class="grid">${cf('Room name', `${P}/tour/${i}/room`, r.room, { i18n: true })}</div>${cPhotos(`${P}/tour/${i}/photos`, r.photos)}`)).join('')}</div>` : ''}`;
}
function cmHouseGuide(c) {
  const h = (c.files || {}).house || {}, blocks = ((c.files || {}).message || {}).blocks || [];
  return `<div class="grid">${cf('Check-out time', 'files/house/checkout', h.checkout || '', { type: 'time', half: true })}</div>
    <h3 class="cm-h">Parts of the house guide</h3><div class="cm-list">${blocks.map((b, i) => { const P = `files/message/blocks/${i}`;
      return cCard(P, edShown(b.title) || b.id, `${cmCount((b.items || []).length, 'line', 'lines')} · ${cmCount((b.photos || []).length, 'photo', 'photos')}`,
        `<div class="grid">${cf('Title', P + '/title', b.title, { i18n: true })}${b.sub ? cf('Line under the title', P + '/sub', b.sub) : ''}</div>
        <div class="f full"><span class="lab">Photos</span>${cPhotos(P + '/photos', b.photos)}</div><div class="f full"><span class="lab">What guests need to know</span>${cLines(P + '/items', b.items, 'Add a line')}</div>`); }).join('')}</div>`;
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
// Taxis, stations and bus stops are in Getting around; a bar or restaurant from your list can also be pinned from Bars and restaurants.
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
  return `${FIND_OF[path] ? cmFindHTML(path) : ''}${arr.length > 8 ? `<div class="f full"><label for="c_filter">Find ${esc(aAn(what))}</label><input id="c_filter" type="text" enterkeyhint="search" autocomplete="off" data-cfilter placeholder="Name or town"></div>` : ''}
    <div class="cm-list">${arr.map((it, i) => cItem(path, it, i, what)).join('') || `<p class="hint">Nothing here yet.</p>`}</div>
    <div><button class="btn small primary" type="button" data-addit="${path}">+ Add ${esc(aAn(what))}</button></div>
    <p class="hint">A new ${esc(what)} starts at the house: move its pin with a Google Maps link. The distance from the house follows the pin.</p>`;
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
  const placed = typeof s.lat === 'number' && !(s.lat === 0 && s.lng === 0);
  return cCard(p, edShown(s.name) || 'New ' + cmMode(s), [s.mode === 'bus' ? 'Bus' : 'Train', s.min ? s.min + ' min by car' : '', placed ? '' : 'no pin yet'].filter(Boolean).join(' · '), `<div class="grid">
    <div class="f"><label for="${cmId(p + '/mode')}">Kind</label><select id="${cmId(p + '/mode')}" data-p="${p}/mode" data-t="str"><option value="train"${s.mode !== 'bus' ? ' selected' : ''}>Train station</option><option value="bus"${s.mode === 'bus' ? ' selected' : ''}>Bus stop</option></select></div>
    ${cf('Name', p + '/name', s.name, { i18n: true, half: true })}${cf('Minutes by car from the house', p + '/min', s.min, { type: 'number', half: true })}${cf('In a few words', p + '/tag', s.tag, { i18n: true, half: true, ph: 'Reliable, slow' })}
    ${cf('What guests need to know', p + '/what', s.what, { i18n: true, long: true })}${cf('Timetable link', p + '/link', s.link || '', { type: 'url', half: true })}${cf('Google Maps link', p + '/gmaps', s.gmaps || '', { type: 'url', half: true })}
    <div class="f full"><label for="${cmId(p + '/gm')}">Move the pin: paste a Google Maps link</label><p class="hint">${placed ? `Now at ${(+s.lat).toFixed(4)}, ${(+s.lng).toFixed(4)}${s.km ? `, ${s.km} km from the house` : ''}.` : 'It shows in the guide once its pin is set.'} Use the long link from the browser bar: it holds the position.</p><input id="${cmId(p + '/gm')}" type="text" inputmode="url" data-gm="${p}" placeholder="https://www.google.com/maps/…"></div></div>
    <div class="f full"><span class="lab">Lines</span><p class="hint">Short names in the line's colour, like R4.</p>${(s.badges || []).map((b, j) => `<div class="cm-dayrow"><input type="text" data-p="${p}/badges/${j}/t" data-t="str" value="${esc(b.t || '')}" aria-label="Line name" placeholder="R4"><input type="color" class="cm-lc" data-p="${p}/badges/${j}/c" data-t="str" value="${esc(/^#[0-9a-f]{6}$/i.test(b.c || '') ? b.c : '#1D4FA0')}" aria-label="Line colour"><button class="cm-x" type="button" data-cdel="${p}/badges/${j}" data-now="1" aria-label="Remove this line">×</button></div>`).join('')}
      <button class="btn small cm-add" type="button" data-addbadge="${p}/badges">+ Add a line</button></div>
    <div class="f full"><span class="lab">Journey times</span>${(s.to || []).map((d, j) => `<div class="cm-sub"><div class="grid">${cf('To', `${p}/to/${j}/dest`, d.dest, { i18n: true, half: true, ph: 'Barcelona' })}${cf('Time', `${p}/to/${j}/time`, d.time || '', { half: true, ph: '1 h 30' })}${cf('Note', `${p}/to/${j}/note`, d.note, { i18n: true, ph: '1 change' })}</div><div><button class="btn small danger" type="button" data-cdel="${p}/to/${j}" data-now="1">Remove this destination</button></div></div>`).join('')}
      <button class="btn small cm-add" type="button" data-addto="${p}/to">+ Add a destination</button></div>
    <div><button class="btn small danger" type="button" data-cdel="${p}">Delete this ${cmMode(s)}</button></div>`);
}
function cmTransport(c) {
  const T = (c.files || {}).transport, P = 'files/transport';
  const adds = `<div class="cm-row"><button class="btn small" type="button" data-tradd="taxi">+ Add a taxi</button><button class="btn small" type="button" data-tradd="train">+ Add a train station</button><button class="btn small" type="button" data-tradd="bus">+ Add a bus stop</button></div>`;
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
  build: [[/Reading your answers/, 3, 8, 20], [/Researching: markets/, 8, 30, 180], [/Researching: todo/, 30, 52, 180], [/Researching: emergency/, 52, 62, 90], [/Building the guide/, 62, 78, 40], [/Translating/, 78, 92, 90], [/Saving the guide/, 92, 99, 30]]
};
const progEase = (t, tau) => 1 - Math.exp(-Math.max(0, t) / tau);
// A job's place on the bar and the time left, from its step and how long it has been in it.
function progOf(j, kind) {
  if (!j) return null;
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
  }
  pct = Math.min(99, Math.max(j.shown || 0, pct)); j.shown = pct;   // never goes back
  const words = ({ 'Researching: markets': 'Looking for markets', 'Researching: todo': 'Looking for things to do', 'Researching: emergency': 'Finding emergency numbers', 'Translating': 'Translating into your languages' })[j.message] || j.message.replace(/ · .*$/, '').replace(/^Starting again$/, 'Starting');
  return { pct, text: words + (left == null ? '' : left > 75 ? ` · about ${Math.ceil(left / 60)} min left` : ' · less than a minute left'), left };
}
// The bar itself; its key says which job it follows (see progJob).
const progBar = (key, label, dark) => { const p = progOf(progJob(key), progKind(key)) || { pct: 2, text: '' };
  return `<div class="cm-progw${dark ? ' dark' : ''}" data-prog="${key}"><div class="cm-prog" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.pct)}"><i style="width:${p.pct.toFixed(1)}%"></i></div><p class="hint cm-progt">${esc(p.text)}</p></div>`; };
const progJob = key => key === 'auto' ? CM.evJob : key === 'tr' ? CM.trJob : key === 'build' ? window.__buildJob : (CM.find || {})[key];
const progKind = key => key === 'tr' ? 'translate' : key === 'build' ? 'build' : key === 'find-todo' || key === 'find-markets' ? 'places' : 'events';
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
const cmDays = sch => (sch || []).map(r => `${(r.days || []).map(d => (ED_DAYS.find(x => x[0] === d) || [0, d])[1]).join(' ')} ${r.open || ''}${r.close ? '-' + r.close : ''}`).join(', ');
function cmFindCard(it, i, n) {
  const today = new Date().toISOString().slice(0, 10);
  const sub = [edIs18(it.type) ? edShown(it.type) : '', it.town, it.km_from_house != null ? it.km_from_house + ' km from the house' : ''].filter(Boolean).join(' · ');
  const when = (it.dates || []).filter(d => (d.end || d.start) >= today).map(d => `${d.start}${d.end && d.end !== d.start ? ' to ' + d.end : ''}, ${d.status === 'confirmed' ? 'confirmed' : 'expected'}`).join('; ');
  const hours = it.always ? 'Open any time' : cmDays(it.schedule);
  return `<article class="cm-fcard"><small>Suggestion ${i} of ${n}</small><h3>${esc(edShown(it.name))}</h3>${sub ? `<p class="cm-fsub">${esc(sub)}</p>` : ''}
    <p>${esc(edShown(it.description))}</p>
    ${when ? `<p class="hint"><b>Dates:</b> ${esc(when)}</p>` : ''}${hours ? `<p class="hint"><b>Hours:</b> ${esc(hours)}</p>` : ''}${it._google ? `<p class="hint">${esc(it._google)}</p>` : ''}
    <p class="cm-flinks">${it.gmaps ? `<a href="${esc(it.gmaps)}" target="_blank" rel="noopener">See it on Google Maps</a>` : ''}${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">Official page</a>` : ''}</p>
    <div class="cm-fbtns"><button class="btn small" type="button" data-cfskip="${esc(it.id)}">Not for us</button><button class="btn small primary" type="button" data-cfadd="${esc(it.id)}">Add to my guide</button></div>
    <button class="cm-fstop" type="button" data-cfstop>Skip the rest</button></article>`;
}
const CM_TAKES = 'A search usually takes 3 to 6 minutes. You can keep editing, or come back later: the results wait here.';
function cmFindInner(path) {
  if (path === 'files/events/items') return cmEventsInner();   // events: one search, automatic or with cards (below)
  const [kind, what] = FIND_OF[path], f = CM.find[kind] || {};
  if (f.status === 'loading') return '<p class="hint">…</p>';
  if (f.status === 'queued' || f.status === 'running') return `<div class="cm-fhead"><b>Looking for more ${esc(what)}</b></div>${progBar(kind, 'Search for ' + what)}<p class="hint">${esc(CM_TAKES)}</p>`;
  const left = cmFindItems(kind, path), all = cmFindPool(kind, path).length;
  if (left.length) return cmFindCard(left[0], all - left.length + 1, all);
  const note = f.status === 'failed' ? `<p class="hint err">The search did not work: ${esc(f.message || 'try again later')}</p>` : f.status === 'done' ? `<p class="hint">${all ? 'You have looked at every suggestion from the last search.' : 'The last search found nothing new nearby.'}</p>` : '';
  return `<div class="cm-fhead"><b>Looking for more ${esc(what)}?</b></div><p class="hint">We search the web around the house for ${esc(what)} that are not in your guide yet, check each one on Google and translate it. It takes a few minutes, then you keep or skip each one.</p>${note}<div><button class="btn small sun" type="button" data-cfind="${path}">Find more ${esc(what)}</button></div>`;
}
function cmFindRefresh() { const el = document.getElementById('cmFind'); if (el) el.innerHTML = cmFindInner(el.dataset.fpath); }
async function cmFindLoad(kind) {
  CM.find[kind] = { status: 'loading' };
  try {
    await ensureFresh();
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const r = await sb(`/rest/v1/guide_jobs?select=id,status,message,result,created_at&guide_id=eq.${CM.g.id}&kind=eq.${kind}&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc&limit=1`), j = r && r[0];
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
function cmFindAdd(path, sid) {
  const kind = FIND_OF[path][0], f = CM.find[kind], it = f && (f.items || []).find(x => x.id === sid); if (!it) return;
  const n = cmClone(it); delete n._google;
  let a = edGet(edC(), edPath(path)); if (!Array.isArray(a)) { edSet(edC(), edPath(path), []); a = edGet(edC(), edPath(path)); }
  a.push(n);
  const sec = path.split('/')[1], fl = edF()[sec];
  if (sec === 'markets' && n.category) { fl.categories = fl.categories || []; if (!fl.categories.includes(n.category)) fl.categories.push(n.category); }
  // The section must exist and be live in the guide for the new place to show (a guide built without events had none).
  const ss = (edF().sections = edF().sections || { sections: [] }).sections = edF().sections.sections || [];
  const row = ss.find(x => x.id === sec); if (!row) ss.push({ id: sec, ...FIND_SECTION[sec], group: 'area', status: 'live' }); else if (row.status !== 'live') row.status = 'live';
  const site = edC().site = edC().site || {}; site.modules = { ...(site.modules || {}), [sec]: true };
  findMark(f.id, [sid]); cmQueue(); render(); toast(`Added: ${edShown(n.name)}. Preview, then publish.`);
}

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

/* --- Pages: overview, one step, publish --- */
function cmTile(m) {
  const ch = cmChanged(m);
  return `<a class="tile" href="#${m.id}" data-shape="${m.shape}" style="${tileVars(m)}">${ch ? '<span class="pill chk">Changed</span>' : ''}<span class="ic">${I[m.icon] || ''}</span><b>${esc(m.title)}</b><small>${esc(cmSub(m))}</small></a>`;
}
function cmHomeHTML() {
  const name = (edC().site || {}).name || CM.g.slug, ch = cmSteps().filter(cmChanged), dirty = cmDirty(), url = cmLiveUrl();
  return `<section class="hero"><small>${cmLive() ? 'Your guide is live' : 'Your guide is ready'}</small><h1>${esc(name)}</h1>
      <p>${dirty ? `${ch.length ? cmCount(ch.length, 'step', 'steps') + ' changed' : 'Changes'}, not live yet. Guests see the published guide until you publish.` : cmLive() ? 'Open a step to change it. Your changes stay a draft until you publish them.' : 'Have a look, change what you like, then publish it for your guests.'}</p>
      ${cmLive() ? `<p class="cm-url">Guests open <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a></p>` : ''}
      <div class="cm-act">${dirty || !cmLive() ? `<a class="go-next" href="#publish"><span>${cmLive() ? 'Review and publish' : 'Publish my guide'}</span><span class="ar">${ARROW}</span></a>` : ''}<a class="btn small cm-ghost" href="${esc(cmPreviewUrl())}" target="_blank" rel="noopener" data-cpreview>${dirty ? 'Preview my changes' : 'Open my guide'}</a></div></section>
    ${GROUPS.map(([g, gt]) => { const ms = cmSteps().filter(m => m.group === g); if (!ms.length) return ''; const n = ms.filter(cmChanged).length;
      return `<div class="gh"><h2>${gt}</h2><span>${n ? `${n} changed` : ''}</span></div><div class="tiles">${ms.map(cmTile).join('')}</div>`; }).join('')}
    <div class="tiles"><a class="tile send${dirty || !cmLive() ? '' : ' locked'}" href="#publish"><span class="ic">${I.send}</span><span class="tx"><b>${cmLive() ? 'Publish changes' : 'Publish my guide'}</b><small>${dirty ? 'Changes waiting' : cmLive() ? 'Everything is live' : 'Ready when you are'}</small></span><span class="go">${ARROW}</span></a></div>`;
}
const cmPillText = ch => ch ? 'Changed' : cmLive() ? 'Live' : 'Not published yet';
const cmFootText = () => cmDirty() ? 'Saved as a draft. Guests see it once you publish.' : 'Changes save as you type, as a draft only you see until you publish.';
function cmLangBar(langs) {
  return `<div class="cm-lang"><label for="c_lang">You are editing in</label><select id="c_lang" data-cmlang>${langs.map(l => `<option value="${l}"${CM.lang === l ? ' selected' : ''}>${ED_LANGS[l]}</option>`).join('')}</select></div>
    <p class="hint cm-langhint">A text you change here changes in the other languages too while they still had the same words. Translated texts stay as they are.</p>`;
}
function cmStepHTML(m) {
  const ch = cmChanged(m), langs = edLangs();
  return `<div class="split">${railHTML(m.id)}<div class="col">
    <section class="mhead" style="${tileVars(m)}"><div class="row1"><span class="pill ${ch ? 'chk' : 'done'}" id="cmPill">${esc(cmPillText(ch))}</span></div><h1>${esc(m.title)}</h1><p>${esc(m.lead)}</p></section>
    <section class="card">${m.lang && langs.length > 1 ? cmLangBar(langs) : ''}<div class="edz">${m.body(edC())}</div>
      <div class="foot"><p class="todo" id="cmFoot">${esc(cmFootText())}</p><div class="row"><a class="btn small" href="${esc(cmPreviewUrl())}" target="_blank" rel="noopener" data-cpreview>${I.eye}Preview</a><a class="btn small primary" href="#publish" id="cmGoPub"${cmDirty() ? '' : ' hidden'}>Review and publish</a></div></div></section></div></div>`;
}
function cmPublishHTML() {
  const ch = cmSteps().filter(cmChanged), dirty = cmDirty(), url = cmLiveUrl();
  return `<div class="split">${railHTML('publish')}<div class="col">
    <section class="mhead" style="--tc:var(--ink);--ti:var(--paper);--sh:var(--sun)"><h1>${cmLive() ? 'Publish changes' : 'Publish your guide'}</h1>
      <p>${dirty ? 'Look at your changes in the preview, then publish: guests see them straight away.' : cmLive() ? 'Nothing is waiting: guests see the guide as it is here.' : 'Your guide is ready. Publish it to share it with your guests.'}</p></section>
    <section class="card">
      ${ch.length ? `<div class="sum">${ch.map(m => `<a href="#${m.id}" style="--tc:${m.tc}"><span class="sw"></span><span><b>${esc(m.title)}</b><p>${esc(cmSub(m))}</p></span><span class="pill chk" style="position:static">Changed</span></a>`).join('')}</div>` : dirty ? '<p class="hint">Translations and other small changes are waiting.</p>' : ''}
      <p class="hint">Guests open <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a></p>
      <div class="foot"><div class="row"><a class="btn" href="${esc(cmPreviewUrl())}" target="_blank" rel="noopener" data-cpreview>${I.eye}Preview</a>${dirty || !cmLive() ? `<button class="btn primary" type="button" data-cpublish>${I.send}${cmLive() ? 'Publish changes' : 'Publish my guide'}</button>` : ''}</div>
        ${dirty ? `<div class="cm-row"><button class="btn small" type="button" data-cdiscard>Undo all changes</button><p class="hint">Goes back to the guide guests see now.</p></div>` : ''}</div></section></div></div>`;
}
const cmIsPage = r => r === 'publish' || cmSteps().some(m => m.id === r);
function cmPageHTML(r) { const m = cmSteps().find(x => x.id === r); return m ? cmStepHTML(m) : r === 'publish' ? cmPublishHTML() : cmHomeHTML(); }
// Rail and bottom bar (nav.js asks for these while CM.on)
function cmStepList(cur) {
  const item = m => { const ch = cmChanged(m); return `<a class="si s-${ch ? 'chk' : 'new'}" href="#${m.id}"${m.id === cur ? ' aria-current="step"' : ''} style="--tc:${m.tc}"><span class="sic">${ch ? STATUS_ICON.chk : I[m.icon] || ''}</span><span class="st">${esc(m.title)}</span><span class="sl">${ch ? 'Changed' : ''}</span></a>`; };
  const dirty = cmDirty();
  return `<a class="si home" href="#home"${cur === 'home' ? ' aria-current="step"' : ''}><span class="sic">${I.grid}</span><span class="st">Overview</span></a>
    ${GROUPS.map(([g, gt]) => { const ms = cmSteps().filter(m => m.group === g); return ms.length ? `<p class="sg">${gt}</p>${ms.map(item).join('')}` : ''; }).join('')}
    <p class="sg">Finish</p><a class="si s-${dirty ? 'chk' : 'done'} send" href="#publish"${cur === 'publish' ? ' aria-current="step"' : ''}><span class="sic">${I.send}</span><span class="st">Publish changes</span><span class="sl">${dirty ? 'Waiting' : cmLive() ? 'Live' : ''}</span></a>`;
}
function cmNavbar(cur) {
  const order = [...cmSteps().map(m => m.id), 'publish'], i = order.indexOf(cur), prev = order[i - 1], next = order[i + 1];
  const t = id => id === 'publish' ? 'Publish changes' : (cmSteps().find(m => m.id === id) || {}).title;
  return `<div class="nbin">
    ${prev ? `<a class="nb ghost" href="#${prev}" aria-label="Back to ${esc(t(prev))}">${BACK}<span class="hide-s">${esc(t(prev))}</span></a>` : `<a class="nb ghost" href="#home" aria-label="Overview">${BACK}<span class="hide-s">Overview</span></a>`}
    <button class="nb count" type="button" id="openSteps" aria-haspopup="dialog"><b>${i + 1}</b> of ${order.length}<i class="chev" aria-hidden="true"></i></button>
    ${next ? `<a class="nb primary" href="#${next}"><span>Next</span>${ARROW}</a>` : cmDirty() || !cmLive() ? `<button class="nb primary" type="button" data-cpublish><span>Publish</span>${CHECK}</button>` : '<span></span>'}</div>`;
}
// While typing: only the "Changed" marks move, the page stays as it is.
function cmMarks() {
  clearTimeout(CM.marks);
  CM.marks = setTimeout(() => {
    refreshNav();
    const m = cmSteps().find(x => x.id === route()), p = document.getElementById('cmPill');
    if (m && p) { const ch = cmChanged(m); p.className = 'pill ' + (ch ? 'chk' : 'done'); p.textContent = cmPillText(ch); }
    const f = document.getElementById('cmFoot'); if (f) f.textContent = cmFootText();
    const g = document.getElementById('cmGoPub'); if (g) g.hidden = !cmDirty();
  }, 250);
}

/* --- Saving the draft, publishing, undoing --- */
const cmSaveText = () => cmDirty() ? 'Draft saved, not live yet' : cmLive() ? 'Everything is live' : 'Saved';
function cmQueue() { setSave('busy', 'Saving…'); clearTimeout(CM.timer); CM.timer = setTimeout(cmSave, 900); cmMarks(); }
async function cmSave() {
  clearTimeout(CM.timer); CM.timer = null;
  if (CM.saving) { CM.again = true; return CM.saving; }
  CM.saving = (async () => {
    const dirty = cmDirty();
    try { await ensureFresh(); await sb('/rest/v1/guides?id=eq.' + CM.g.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { draft: dirty ? { content: CM.g.content, theme: CM.g.theme, savedAt: new Date().toISOString() } : null } }); setSave('ok', cmSaveText()); }
    catch (e) { setSave('err', 'Not saved: ' + niceError(e)); }
  })();
  try { await CM.saving; } finally { CM.saving = null; }
  if (CM.again) { CM.again = false; return cmSave(); }
}
async function cmPublish(btn) {
  if (btn) btn.disabled = true;
  try {
    clearTimeout(CM.timer); while (CM.saving) await CM.saving;
    await ensureFresh();
    const body = { content: CM.g.content, theme: CM.g.theme, draft: null }; if (!cmLive()) body.status = 'published';
    const r = await sb('/rest/v1/guides?id=eq.' + CM.g.id + '&select=status', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body });
    if (r && r[0]) CM.g.status = r[0].status;
    CM.live = { content: cmClone(CM.g.content), theme: cmClone(CM.g.theme) };
    setSave('ok', cmSaveText()); toast(cmLive() ? 'Published. Guests see it now.' : 'Saved, but not published. Try again.');
    location.hash = '#home'; render();
  } catch (e) { toast('Not published: ' + niceError(e)); if (btn) btn.disabled = false; }
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
  const name = (png ? 'logo-' : 'guide/u-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + (png ? '.png' : '.jpg');
  await ensureFresh();
  const r = await fetch(`${SB.url}/storage/v1/object/guide-assets/${CM.g.id}/${name}`, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + AUTH.access_token, 'Content-Type': blob.type, 'x-upsert': 'true' }, body: blob });
  if (!r.ok) throw new Error('The photo could not be uploaded');
  return name;
}
async function edPhotoInput(t) {
  const files = [...t.files]; if (!files.length) return;
  setSave('busy', files.length > 1 ? `Uploading ${files.length} photos…` : 'Uploading…');
  try {
    for (const f of files) {
      const name = await edUpload(f, t.dataset.kind);
      if (t.dataset.phadd) { const p = edPath(t.dataset.phadd); let a = edGet(edC(), p); if (!Array.isArray(a)) { edSet(edC(), p, []); a = edGet(edC(), p); } a.push(name); }
      else { edSet(edC(), edPath(t.dataset.phset), name); if (t.dataset.phset === 'files/house/photo') edSet(edC(), ['files', 'house', 'cover'], 'photo'); }
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
function edApplyDesign(kind, el) {
  const th = CM.g.theme = CM.g.theme || {}, site = edC().site = edC().site || {};
  if (kind === 'preset') { th.preset = el.value; site.theme = { ...(site.theme || {}), preset: el.value }; return cmQueue(); }
  const css = th.css || '', blk = edBlockOf(css), decl = {};
  for (const m of blk.matchAll(/(--[a-z-]+)\s*:\s*([^;}]+)/g)) decl[m[1]] = m[2].trim();
  if (kind === 'color') decl[el.dataset.var] = el.value;
  else {
    const f = ED_FONTS.find(x => x[0] === el.value), disp = kind === 'display';
    decl[disp ? '--display' : '--font'] = `"${f[1]}",${/serif|fraunces|cormorant|instrument/i.test(f[0]) && !/sans/i.test(f[0]) ? 'Georgia,serif' : 'system-ui,sans-serif'}`;
    const d = ED_FONTS.find(x => x[1] === ((decl['--display'] || '').match(/"([^"]+)"/) || [])[1]) || ED_FONTS[0], b = ED_FONTS.find(x => x[1] === ((decl['--font'] || '').match(/"([^"]+)"/) || [])[1]) || d;
    const fonts = []; for (const x of [d, b]) for (const w of (x[2] || [400, 500, 600, 700])) { const s = `${x[0]}/${w}.css`; if (!fonts.includes(s)) fonts.push(s); }
    th.fonts = fonts; site.theme = { ...(site.theme || {}), fonts };
  }
  const block = `/* editor:start */\n:root{${Object.entries(decl).map(([k, x]) => `${k}:${x}`).join(';')}}\n/* editor:end */`;
  th.css = /\/\* editor:start \*\//.test(css) ? css.replace(/\/\* editor:start \*\/[\s\S]*?\/\* editor:end \*\//, block) : css + '\n' + block;
  cmQueue();
}
const inEd = t => CM.on && t.closest && t.closest('.edz');
document.addEventListener('input', e => {
  const t = e.target; if (!inEd(t)) return;
  if (t.dataset.p) return edEdit(t);
  if (t.dataset.cfilter !== undefined) { const q = t.value.toLowerCase().trim(); t.closest('.edz').querySelectorAll('details.cmi').forEach(d => { d.hidden = !!q && !d.querySelector('summary').textContent.toLowerCase().includes(q); }); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!CM.on || !t.dataset) return;
  if (t.dataset.cmlang !== undefined) { CM.lang = t.value; return render(); }
  if (!inEd(t)) return;
  if (t.dataset.gm) {   // a pasted Google Maps link: the pin moves when it holds a position, and the link becomes the place's map button
    const ip = edPath(t.dataset.gm), it = edGet(edC(), ip), pos = edParseMaps(t.value), url = t.value.trim();
    if (pos) { it.lat = pos.lat; it.lng = pos.lng; edUpdateKm(ip); }
    if (/^https?:\/\//.test(url)) it['map' in it && !('gmaps' in it) ? 'map' : 'gmaps'] = url;
    if (pos || /^https?:\/\//.test(url)) { cmQueue(); render(); if (!pos) toast('Link saved. To move the pin, paste the long link from the browser bar.'); }
  }
  else if (t.dataset.cmod) { const s = edC().site = edC().site || {}; s.modules = { ...(s.modules || {}), [t.dataset.cmod]: !!t.checked }; cmQueue(); render(); }
  else if (t.dataset.design) edApplyDesign(t.dataset.design, t);
  else if (t.dataset.phadd !== undefined || t.dataset.phset !== undefined) edPhotoInput(t);
  else if (t.dataset.clang) { const s = edC().site = edC().site || {}; s.languages = [...(s.languages || ['en'])]; const l = t.dataset.clang, i = s.languages.indexOf(l); if (t.checked && i < 0) s.languages.push(l); else if (!t.checked && i > 0) s.languages.splice(i, 1); cmQueue(); render(); }
});
document.addEventListener('toggle', e => { const d = e.target; if (CM.on && d.matches && d.matches('details.cmi')) d.open ? CM.open.add(d.dataset.open) : CM.open.delete(d.dataset.open); }, true);
document.addEventListener('click', e => {
  if (!CM.on) return;
  const t = e.target.closest && e.target.closest('button,a[data-cpreview]'); if (!t) return;
  const d = t.dataset, arr = p => { let a = edGet(edC(), edPath(p)); if (!Array.isArray(a)) { edSet(edC(), edPath(p), []); a = edGet(edC(), edPath(p)); } return a; };
  const done = () => { cmQueue(); render(); };
  if (d.cpreview !== undefined) return cmPreview(e, t);
  if (d.cpublish !== undefined) return cmPublish(t);
  if (d.cdiscard !== undefined) return cmDiscard(t);
  if (!t.closest('.edz')) return;
  if (d.cover) { edSet(edC(), ['files', 'house', 'cover'], d.cover); return done(); }
  if (d.daytog) { const o = edGet(edC(), edPath(d.daytog)); if (o) { const s = new Set(o.days || []); s.has(d.d) ? s.delete(d.d) : s.add(d.d); o.days = ED_DAYS.map(x => x[0]).filter(x => s.has(x)); done(); } return; }
  if (d.cflag) { const it = edGet(edC(), edPath(d.cflag)); if (it) { const s = new Set(it.flags || []); s.has(d.f) ? s.delete(d.f) : s.add(d.f); it.flags = [...s]; done(); } return; }
  if (d.addsch) { arr(d.addsch).push({ days: [], open: '09:00', close: '14:00' }); return done(); }
  if (d.adddate) { arr(d.adddate).push({ start: '', end: '', status: 'expected' }); return done(); }
  if (d.translate !== undefined) return cmTranslate();
  if (d.phmove) { const p = edPath(d.phmove), i = p[p.length - 1], a = edGet(edC(), p.slice(0, -1)), j = i + Number(d.dir); if (Array.isArray(a) && j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; done(); } return; }
  if (d.addtile) { edAddTile(d.addtile); return done(); }
  if (d.cpin) { cmPin(d.cpin); return done(); }
  if (d.evreach !== undefined) { if ((evAuto().reach === 'city') !== (d.evreach === 'city')) cmEvAutoSet({ reach: d.evreach === 'city' ? 'city' : 'car' }); return; }
  if (d.evauto !== undefined) { const on = !evAuto().on; cmEvAutoSet({ on, skip: evAuto().skip || [], want: evAuto().want || [] }).then(() => { if (on && !evAuto().last) cmEvRun(); }); return; }
  if (d.evadd) return cmEvTopic(d.evadd);
  if (d.evdel) { const k = d.evdel, cur = [...(evAuto()[k] || [])]; cur.splice(+d.i, 1); return cmEvAutoSet({ [k]: cur }); }
  if (d.evrun !== undefined) return cmEvBusy() ? undefined : evAuto().on ? cmEvRun() : cmFindStart(EV_PATH);
  if (d.tradd) { cmTrAdd(d.tradd); return done(); }
  if (d.trtile !== undefined) { cmTrTile(); return done(); }
  if (d.cbool) { const q = edPath(d.cbool), o = edGet(edC(), q.slice(0, -1)); if (o) { o[q[q.length - 1]] = !o[q[q.length - 1]]; done(); } return; }
  if (d.addalt) { arr(d.addalt).push({ name: L6(''), phone: '' }); return done(); }
  if (d.addbadge) { arr(d.addbadge).push({ t: '', c: '#1D4FA0' }); return done(); }
  if (d.addto) { arr(d.addto).push({ dest: L6(''), time: '', note: L6('') }); return done(); }
  if (d.cfind) return cmFindStart(d.cfind);
  if (d.cfadd) return cmFindAdd(t.closest('[data-fpath]').dataset.fpath, d.cfadd);
  if (d.cfskip) { const f = CM.find[FIND_OF[t.closest('[data-fpath]').dataset.fpath][0]]; findMark(f.id, [d.cfskip]); return cmFindRefresh(); }
  if (d.cfstop !== undefined) { const path = t.closest('[data-fpath]').dataset.fpath, kind = FIND_OF[path][0]; findMark(CM.find[kind].id, cmFindItems(kind, path).map(x => x.id)); return cmFindRefresh(); }
  if (d.addcont !== undefined) { const g = edF().garbage; if (g) { (g.containers = g.containers || []).push({ where: Object.fromEntries(edLangs().map(l => [l, ''])), takes: [] }); CM.open.add('files/garbage/containers/' + (g.containers.length - 1)); done(); } return; }
  if (d.ctake !== undefined) { const ct = ((edF().garbage || {}).containers || [])[+d.ctake]; if (ct) { const s = ct.takes || []; ct.takes = s.includes(d.id) ? s.filter(x => x !== d.id) : [...s, d.id]; done(); } return; }
  if (d.addit) { const a = arr(d.addit); a.push(edNewItem(a)); CM.open.add(d.addit + '/' + (a.length - 1)); return done(); }
  if (d.addwifi !== undefined) { const pr = edC().private = edC().private || {}; pr.wifi = { password: '', networks: [{ ssid: '', label: Object.fromEntries(edLangs().map(l => [l, ''])) }] }; return done(); }
  if (d.addnet !== undefined) { edC().private.wifi.networks.push({ ssid: '', label: Object.fromEntries(edLangs().map(l => [l, ''])) }); return done(); }
  if (d.add) { const o = {}; for (const l of edLangs()) o[l] = ''; arr(d.add).push(o); done(); setTimeout(() => { const x = document.getElementById(cmId(d.add + '/' + (arr(d.add).length - 1))); if (x) x.focus(); }, 0); return; }
  if (d.cdel) {
    if (!d.now && d.sure !== '1') { const was = t.textContent; d.sure = '1'; t.textContent = 'Sure? Tap again'; setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = was; } }, 4000); return; }
    const p = edPath(d.cdel), a = edGet(edC(), p.slice(0, -1));
    const ev = d.cdel.startsWith('files/events/items/') && p.length === 4 && a && a[p[3]];
    if (ev && ev.auto) cmEvAutoSet({ removed: [...(evAuto().removed || []), { name: (ev.name || {}).en || edShown(ev.name), at: new Date().toISOString().slice(0, 10) }] });
    if (Array.isArray(a)) { a.splice(p[p.length - 1], 1); for (const k of [...CM.open]) if (k.startsWith(d.cdel)) CM.open.delete(k); if (p[0] === 'private') cmWifiQr(); done(); }
  }
});

/* --- Start: a guide that exists opens here instead of the questions --- */
function cmInit() {
  const g = GUIDE;
  if (!g || !g.content || !g.content.site || !(g.origin === 'imported' || ['ready', 'approved', 'published'].includes(g.status))) return;
  const d = g.draft && g.draft.content ? g.draft : null;
  CM.live = { content: g.content, theme: g.theme || {} };
  CM.g = { id: g.id, slug: g.slug, status: g.status, origin: g.origin, content: cmClone(d ? d.content : g.content), theme: cmClone(d ? d.theme || {} : g.theme || {}) };
  CM.lang = edLangs().includes('en') ? 'en' : edLangs()[0];
  CM.on = true;
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
.cm-langhint{margin-top:-14px;padding-bottom:18px;border-bottom:1.5px solid var(--line)}
.cm-cover{display:flex;flex-direction:column;gap:10px}
.cm-cover img{width:100%;max-width:420px;aspect-ratio:16/10;object-fit:cover;border-radius:14px;display:block}
.cm-cover img.off{opacity:.35;filter:grayscale(1)}
.cm-logo img{width:88px;height:88px;object-fit:contain;background:#fff;border-radius:14px;border:1px solid var(--line)}
.hero .cm-url{font-size:14px;opacity:.85;overflow-wrap:anywhere}
.cm-act{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.hero .btn.cm-ghost{background:transparent;color:inherit;border-color:rgba(255,255,255,.55)}
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
.cm-progw{display:flex;flex-direction:column;gap:6px;width:100%;max-width:520px}
.cm-prog{height:10px;border-radius:99px;background:var(--line);overflow:hidden}
.cm-prog i{display:block;height:100%;width:0;border-radius:99px;background:var(--sun);transition:width 1s linear}
.cm-progw.dark .cm-prog{background:rgba(255,255,255,.2)}
.cm-progw.dark .cm-progt{color:inherit;opacity:.85}
/* The building screen: on a phone the lit doorway sits bottom right of the dark card, so the bar and the words stop before it. */
@media (max-width:620px){#bstate > .cm-progw,#bstate > p{max-width:calc(100% - 76px)}}
@media (prefers-reduced-motion:reduce){.cm-prog i{transition:none}}
.cm-swrow{display:flex;flex-direction:column;gap:6px}
.cm-switch{display:flex;align-items:center;gap:12px;width:100%;max-width:480px;min-height:52px;padding:10px 14px;border-radius:var(--r-s);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600;text-align:left;cursor:pointer}
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
.cm-fstop{align-self:center;border:0;background:none;font:inherit;font-size:14px;color:var(--muted);text-decoration:underline;cursor:pointer;padding:6px}`;
  document.head.appendChild(st);
})();
