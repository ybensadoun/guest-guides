/* ---------- Instant preview of the host's guide ----------
   Built in the browser from the host's own answers and photos, the moment they send (or press Preview).
   Lives at /<their-address> on this device. Researched sections (places, markets, events) show what the
   full guide will add. A Feedback button on every screen sends notes tagged with that screen. */
const PV = { screen: 'home' };

/* ---------- The guide's colours: a colour world (engine/src/worlds.js, pasted by build.py as WK) ----------
   The host picks one in The look (A.world): one of the six worlds, or 'cover' / 'logo', a world made from that picture by the
   engine's own rule (engine/src/picture-world.js), kept in A.worldOwn with the picture it came from (A.worldSrc), so it is
   read again only when that picture changes. Every guide has Ca La Kimberly's tiles (Yohann, 10 Nov 2026): no layouts.
   A new guide starts in its own cover picture's colours (Yohann, 17 Nov 2026: "Colours from my photo"; before, every
   guide started in Bauhaus, Ca La Kimberly's colours): worldAsked() below. */
const WORLD_IDS = ['bauhaus', 'sea', 'country', 'tropical', 'night', 'stone'];
const WORLD_NAME = { bauhaus: 'Bauhaus', sea: 'Sea', country: 'Country', tropical: 'Tropical', night: 'City night', stone: 'Stone', cover: 'From your cover', logo: 'From your logo' };
const isWorldId = id => typeof id === 'string' && WORLD_IDS.includes(id);
// The picture a world can come from, as { key, src }: the logo, or the cover (the host's own, else the listing photo
// chosen, even when the cover is drawn: engine/scripts/generate-site.py cover_im). key names the picture (A.worldSrc).
function picOf(kind){
  const up = k => uploads.find(u => u.kind === k);
  if (kind === 'logo') return up('logo') ? { key: 'up:' + up('logo').id, src: srcOf(up('logo')) } : null;
  if (kind !== 'cover') return null;
  if (up('cover')) return { key: 'up:' + up('cover').id, src: srcOf(up('cover')) };
  const cur = String(A.coverUrl || '').split('?')[0];
  return /^https:/.test(cur) ? { key: cur, src: cur + '?im_w=480' } : null;
}
// A picture's world: its pixels at 96 x 96 (drawn on white, so a transparent logo reads as on paper), then the engine's
// rule. Rejects when the picture cannot be read (no CORS, gone).
async function worldFromImage(src){
  const im = await new Promise((res, rej) => { const i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('unreadable')); i.src = src; });
  const n = 96, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); x.drawImage(im, 0, 0, n, n);   // each pixel the average of its part of the picture
  return WK.worldFromPicture(WK.swatches(x.getImageData(0, 0, n, n).data));
}
// Each picture read once per page (by its key): w is undefined while it is read, null when it cannot be, else its world.
// The first answer redraws what shows it (worldArrived), never again, so nothing loops.
const PICW = new Map();
function picEntry(key, src, seed){
  let e = PICW.get(key);
  if (!e) {
    e = { w: undefined }; PICW.set(key, e);
    if (seed && WK.worldOf(seed)) { e.w = seed; e.p = Promise.resolve(seed); }   // read before, kept with the answers or the guide
    else e.p = worldFromImage(src).then(w => w, () => null).then(w => { e.w = w; worldArrived(); return w; });
  }
  return e;
}
// The builder's pictures: the one the host's colours were read from is not read again.
const picWorldEntry = kind => { const pic = picOf(kind); if (!pic) return null; return picEntry(pic.key, pic.src, A.world === kind && A.worldSrc === pic.key ? A.worldOwn : null); };
const picWorld = kind => { const e = picWorldEntry(kind); return e ? e.p : Promise.resolve(null); };
const picWorldNow = kind => { const e = picWorldEntry(kind); return e ? e.w : null; };   // undefined: still reading
// Old answers: "Colours: from my cover picture / my logo" (answers.colorsFrom) becomes that phone, once. The old layout
// (answers.mood) is no longer read: every guide has the same tiles.
function worldMigrate(){
  if (A.world || !A.colorsFrom) return;
  const c = String(A.colorsFrom).toLowerCase(), w = /logo/.test(c) ? 'logo' : /cover|photo|picture/.test(c) ? 'cover' : '';
  if (w) A.world = w;
}
// A guide the host is still making: in the builder, never sent, no guide built from it. Only such a guide gets a start
// of its own below: one that exists keeps the colours its guests know, whatever its answers say or leave out.
function worldFresh(){
  const g = window.__acctGuide && window.__acctGuide();
  return !CM.on && !A._sentAt && !(g && g.status && g.status !== 'draft');
}
// What the host asked for: their choice (A.world), else, in a guide still being made that has a cover picture, that
// picture's colours ("already chosen for you": the guide is theirs from the first screen), else nothing (Bauhaus).
function worldAsked(){
  worldMigrate();
  return A.world || (worldFresh() && picOf('cover') ? 'cover' : '');
}
// The phone selected: what the host asked for, Bauhaus when nothing, or when its picture is gone or cannot be read.
function worldSel(){
  const w = worldAsked();
  if (w === 'cover' || w === 'logo') return picOf(w) && picWorldNow(w) !== null ? w : 'bauhaus';
  return isWorldId(w) ? w : 'bauhaus';
}
// What the stored answer says once a picture is read: its world and the picture (A.world, A.worldOwn, A.worldSrc), or
// Bauhaus when the picture is gone or cannot be read (silently, as the build does). The start nobody picked is stored
// like a pick once its picture is read, so the build makes the guide the phone showed; when that picture cannot be
// read nothing is stored, so another cover picture can still give its colours.
function worldStore(){
  const k = worldAsked(); if (k !== 'cover' && k !== 'logo') return false;
  const pic = picOf(k), w = pic ? picWorldNow(k) : null;
  if (w === undefined) return false;
  if (w === null) { if (!A.world) return false; A.world = 'bauhaus'; delete A.worldOwn; delete A.worldSrc; queueSave(); return true; }
  if (A.world === k && A.worldSrc === pic.key && JSON.stringify(A.worldOwn) === JSON.stringify(w)) return false;
  A.world = k; A.worldOwn = w; A.worldSrc = pic.key; queueSave(); return true;
}
// A picture's colours just arrived: the answer, then The look (builder or editor) and the phone show them.
let worldArrivedT = null;
function worldArrived(){
  clearTimeout(worldArrivedT);
  worldArrivedT = setTimeout(() => {
    if (CM.on) return edWorldArrived();
    worldStore();
    if (document.getElementById('lk_worlds')) { wpsSwap(lookWorldsRow()); lookPaint(); }
    if (document.getElementById('phoneFrame')) { PHONE.build = false; phoneRender(); }
  }, 30);
}
// The world to draw now (an id or { base, ...roles }). Never waits for a picture: the phone shows at once (the wow, a
// cover just picked) in the colours drawn last, Bauhaus at first, and worldArrived draws it again when the picture is
// read, a moment later. Before 17 Nov 2026 the phone waited for the picture, which only a host who had picked "From your
// cover" met; now that a new guide starts there, every first screen would have waited for a second download of the photo.
// In the builder the answer is brought in step with what is drawn: a picture read earlier on this page (the host going
// back to a cover they had before) arrives nowhere again, and the build would keep the colours of the cover in between.
let WORLD_LAST = 'bauhaus';
function worldNow(){
  const s = worldSel();
  if (s !== 'cover' && s !== 'logo') return WORLD_LAST = s;
  const w = picWorldNow(s);
  if (w === undefined) return WORLD_LAST;
  if (!CM.on) worldStore();
  return WORLD_LAST = w || 'bauhaus';
}
// A world's tokens after the contrast rule, and the title font of its base.
const worldTok = w => WK.worldTokens(WK.worldOf(w) || WK.WORLDS.bauhaus);
const worldBase = w => isWorldId(w) ? w : w && isWorldId(w.base) ? w.base : 'bauhaus';
// The phone's palette, as the tiles use it (acc: blue, red, yellow, green), with the world's title font.
function worldPal(w){
  const t = worldTok(w), b = WK.WORLDS[worldBase(w)];
  return { paper: t['--paper'], ink: t['--ink'], acc: [t['--blue'], t['--red'], t['--yellow'], t['--green']], display: b.display, plain: !!b.plain, base: worldBase(w), tok: t };
}
const phonePalette = async () => worldPal(worldNow());
// The fonts of a world from Google Fonts: Jost for the text, the world's title family in the weights the engine bundles.
function worldGF(id){
  const w = WK.WORLDS[isWorldId(id) ? id : 'bauhaus'], fam = (w.display.match(/"([^"]+)"/) || [])[1] || 'Jost', slug = fam.toLowerCase().replace(/ /g, '-');
  const ws = w.fonts.filter(f => f.startsWith(slug + '/')).map(f => f.split('/')[1].replace(/\.css$/, '')), q = fam.replace(/ /g, '+');
  const title = fam === 'Jost' ? '' : '&family=' + q + (ws.length === 1 && ws[0] === '400' ? '' : ':wght@' + ws.join(';'));
  return 'Jost:wght@400;500;600;700' + title;
}
// The six title fonts for the small phones, once, when The look opens (builder or editor): weight 600, DM Serif Display 400.
function worldFontsLoad(){
  if (document.getElementById('wpFonts')) return;
  const l = document.createElement('link'); l.id = 'wpFonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?' + WORLD_IDS.map(id => { const fam = (WK.WORLDS[id].display.match(/"([^"]+)"/) || [])[1], plain = WK.WORLDS[id].plain; return 'family=' + fam.replace(/ /g, '+') + (plain ? '' : ':wght@600'); }).join('&') + '&display=swap';
  document.head.appendChild(l);
}
// The row of small phones, one per world, the host's own guide in each (builder and editor, the same markup).
// o: { sel: the id selected or null, cover: the cover picture's address or '', name: the radio name, pics: { cover, logo }:
// the picture's world (undefined while read: Stone for that moment) or absent when there is no such picture }.
const WP_TICK = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.4l2.3 2.3 4.7-5"/></svg>';
function worldPhone(id, w, cover, on){
  const t = worldTok(w), b = WK.WORLDS[worldBase(w)];
  const st = `--p:${t['--paper']};--i:${t['--ink']};--deep:${t['--blue']};--strong:${t['--red']};--fresh:${t['--green']};--light:${t['--yellow']};--warm:${t['--orange']};--d:${b.display};--dw:${b.plain ? 400 : 600}`;
  return `<label class="wp"><input type="radio" name="world" id="lk_world_${id}" value="${id}"${on ? ' checked' : ''}>
    <span class="wp-ph" style="${esc(st)}" aria-hidden="true"><span class="wp-cv"${cover ? ` style="background-image:url('${esc(cover)}')"` : ''}></span><span class="wp-nm">Welcome</span>
      <span class="wp-g"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><span class="e"><i></i><i></i></span></span></span>
    <span class="wp-on" aria-hidden="true">${WP_TICK}</span><b>${esc(WORLD_NAME[id])}</b></label>`;
}
function worldRowHTML(o){
  worldFontsLoad();
  const phones = [...['cover', 'logo'].filter(k => k in o.pics && o.pics[k] !== null).map(k => worldPhone(k, o.pics[k] === undefined ? 'stone' : o.pics[k], o.cover, o.sel === k)),
    ...WORLD_IDS.map(id => worldPhone(id, id, o.cover, o.sel === id))];
  return `<div class="wps" role="radiogroup" aria-labelledby="l_world">${phones.join('')}</div>`;
}
// The selected phone in view in the sliding row (360 px), and the row where the host left it after a redraw.
const WPS = { x: 0 };
document.addEventListener('scroll', e => { if (e.target && e.target.classList && e.target.classList.contains('wps')) WPS.x = e.target.scrollLeft; }, true);
function wpsInView(keep){
  const st = document.querySelector('.wps'); if (!st || st.scrollWidth <= st.clientWidth) return;
  if (keep) st.scrollLeft = WPS.x;
  const x = st.querySelector('input:checked'), r = x && x.closest('.wp').getBoundingClientRect(), q = st.getBoundingClientRect();
  if (r && (r.right > q.right || r.left < q.left)) st.scrollLeft += r.left - q.left - 8;
  WPS.x = st.scrollLeft;
}
// The row drawn again where it is (a picture's colours arrived): the rest of the step stays as it is, the focus too.
function wpsSwap(html){
  const r = document.querySelector('.wps'); if (!r) return;
  const id = document.activeElement && r.contains(document.activeElement) ? document.activeElement.id : '', t = document.createElement('div');
  t.innerHTML = html; r.replaceWith(t.firstElementChild);
  wpsInView(true);
  if (id) { const el = document.getElementById(id); if (el) el.focus({ preventScroll: true }); }
}

// The guide's sections, built from what the host chose and wrote.
const lines = k => (v(k) || '').split('\n').map(x => x.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
const PV_ROOM = { 'Living room': 'Living room', Kitchen: 'Kitchen', Bedroom: 'Bedrooms', Bathroom: 'Bathrooms', Pool: 'Pool', Garden: 'Outside', Terrace: 'Outside', Outside: 'Outside', View: 'Outside', Office: 'Office', Laundry: 'Laundry' };
// The parts of the house guide, as the build makes them: in the order of the host's rooms, each kind of room one part.
// Only a part with a line is shown, as guests will see it (engine/src/modules/info/README.md, rule 11): its photos alone
// are the house page's.
function houseParts(){
  const out = new Map(), rooms = roomsNow(), part = c => PV_ROOM[c] || 'Good to know', at = t => out.get(t) || out.set(t, { r: t, items: [], photos: [] }).get(t);
  rooms.forEach(r => { if (part(r.c) !== 'Good to know') at(part(r.c)); });
  lines('howTos').filter(INFO.tipSaid).forEach(l => at(part(Object.keys(ROOMKW).find(k => ROOMKW[k].test(l)))).items.push(l));   // a line start nobody finished ("Heating:") is not shown, as in the built guide
  rooms.forEach(r => String(r.t || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(l => at(part(r.c)).items.push(rooms.filter(x => part(x.c) === part(r.c)).length > 1 ? `${r.n}: ${l}` : l)));
  uploads.filter(u => u.kind === 'photo').forEach(u => at(part(u.room)).photos.push(u.url));
  const parts = [...out.values()].filter(p => p.items.length);
  return [...parts.filter(p => p.r !== 'Good to know'), ...parts.filter(p => p.r === 'Good to know')];
}
const ROOMKW = { Kitchen: /coffee|oven|hob|stove|dishwasher|fridge|kettle|microwave|kitchen|nespresso|toaster/i, 'Living room': /\btv\b|television|sofa|living|netflix|speaker|fireplace|heating/i,
  Bedroom: /bed|sheet|linen|blanket|pillow|wardrobe/i, Bathroom: /shower|bath|towel|hot water|boiler|toilet|hairdryer/i, Pool: /pool|swim|sunbed/i,
  Outside: /bbq|barbecue|garden|terrace|patio|hammock|outdoor|grill|shutter|awning/i, Laundry: /wash|dryer|iron|laundry|detergent/i, Office: /desk|office|printer|monitor/i };
const houseFacts = () => [v('propertyType'), ...[['sleeps', 'guest', 'guests'], ['bedrooms', 'bedroom', 'bedrooms'], ['beds', 'bed', 'beds'], ['bathrooms', 'bathroom', 'bathrooms']].map(([k, one, many]) => v(k) && v(k) !== '0' ? `${v(k)} ${String(v(k)) === '1' ? one : many}` : '')].filter(Boolean).join(' · ');
function guideSections(){
  const S = [], on = id => secOn(id);
  S.push({ id: 'house', title: 'The house', sub: houseFacts(), icon: 'cam', kind: 'house' });
  if (on('houseguide')) S.push({ id: 'houseguide', title: 'House guide', sub: 'How everything works', icon: 'tool', kind: 'rooms', rooms: houseParts() });
  if (on('wifi')) S.push({ id: 'wifi', title: 'Wi-Fi', sub: v('wifiName'), icon: 'wifi', kind: 'wifi' });
  if (on('arrival') && v('arrival')) S.push({ id: 'arrival', title: 'Getting here', sub: 'Arrival and parking', icon: 'car', kind: 'text', items: lines('arrival'), photos: uploads.filter(u => u.kind === 'arrivalPhoto').map(u => u.url) });
  S.push({ id: 'stay', title: 'Check-in and check-out', sub: `In from ${v('checkIn') || '?'} · out by ${v('checkOut') || '?'}`, icon: 'key', kind: 'text', items: [v('checkIn') && `Check-in from ${v('checkIn')}.`, v('checkOut') && `Check-out by ${v('checkOut')}.`, ...lines('checkoutTasks')].filter(Boolean), extra: lines('houseRules').length ? { h: 'House rules', items: lines('houseRules') } : null });
  if (on('rubbish')) S.push({ id: 'rubbish', title: 'Rubbish and recycling', sub: 'Which bin, which day', icon: 'bin', kind: 'text', items: rubbishLines(), research: !rubbishLines().length && 'Tell us how rubbish works at the house and we write it here.' });
  // What the research from the link found (start.js areaWatch), shown as it arrives; the full guide has the details.
  const found = (k, list) => (k === 'markets' ? marketsInReach : x => x)(((AREA.result || {})[k] || {})[list] || []).slice(0, 10), nm = x => typeof x === 'string' ? x : (x && (x[A.sourceLang || UIL] || x.en || Object.values(x)[0])) || '';
  const help = found('emergency', 'groups').flatMap(g => g.items || []).map(x => nm(x.name)).filter(n => n && !/^emergenc/i.test(n));
  if (on('emergency')) S.push({ id: 'emergency', title: 'Emergency and contacts', sub: '112, hospital, pharmacy', icon: 'phone', kind: 'contacts', research: help.length ? `Found near you: ${help.slice(0, 3).join(', ')}. When you send your guide, we add their hours and directions.` : 'When you send your guide, we add the nearest hospital, pharmacy and on-call doctor, with hours.' });
  if (on('essentials')) S.push({ id: 'essentials', title: 'Shops and essentials', sub: 'Supermarket, bakery, pharmacy', icon: 'bag', kind: 'places', items: lines('essentials'), research: 'We add opening hours, distances and the ones you did not list.' });
  const picks = cats => Object.values(A.swipes || {}).filter(x => x.d === 'yes' && cats.includes(x.cat)).map(swShown);   // the live card by its id (start.js)
  if (on('eat')) S.push({ picks: picks(['eat', 'coffee', 'drinks']), id: 'eat', title: 'Eat and drink', sub: 'Our favourite places', icon: 'heart', kind: 'places', items: placeRows('favEat').filter(plName).map(r => plName(r) + (r.c ? ': ' + r.c : '')), research: !placeRows('favEat').length && 'Add the places you recommend, with a link or a name and a comment. We do not add restaurants of our own.' });
  if (on('todo')) S.push({ picks: picks(['todo']), id: 'todo', title: 'Things to do', sub: (A.interests || []).slice(0, 3).join(', ') || 'Around you', icon: 'compass', kind: 'places', items: addedPlaces(), research: !picks(['todo']).length && !addedPlaces().length && 'Keep the places you like in Attractions: only those go in your guide.' });
  if (on('nightlife')) S.push({ id: 'nightlife', title: 'Nightlife', sub: 'Bars, clubs, live music', icon: 'moon', kind: 'places', items: placeRows('favNight').filter(plName).map(r => plName(r) + (r.c ? ': ' + r.c : '')), research: !placeRows('favNight').length && 'Add the late bars, clubs and live music you recommend. We add none of our own.' });
  if (on('markets')) S.push({ id: 'markets', title: 'Local markets', sub: 'What is on today', icon: 'bag', kind: 'places', items: found('markets', 'markets').map(m => `${nm(m.name)}${m.town ? ': ' + m.town : ''}`), research: found('markets', 'markets').length ? 'Found near you. When you send your guide, we add their days and hours.' : 'When you send your guide, we list every weekly market nearby, with what runs today.' });
  if (on('events')) S.push({ id: 'events', title: 'Local events', sub: 'During your stay', icon: 'kite', kind: 'places', items: [], research: 'When you send your guide, we list festivals and fairs, with dates.' });
  if (on('kids')) S.push({ id: 'kids', title: 'Kids corner', sub: (A.kidsAges || []).join(', ') || 'Families', icon: 'kite', kind: 'text', items: [...(A.kidsGear || []).map(g => `${g} at the house`), ...lines('kidsNotes')], research: 'We add playgrounds and family days out.' });
  if (on('daytrips')) S.push({ id: 'daytrips', title: 'Day trips', sub: 'Worth the drive', icon: 'car', kind: 'places', items: [], research: 'We pick the best trips within two hours.' });
  if (on('extras') && v('extras')) S.push({ id: 'extras', title: 'Extras', sub: 'Ask us', icon: 'gift', kind: 'text', items: lines('extras') });
  if (v('localTips')) S.push({ id: 'tips', title: 'Local tips', sub: 'From your host', icon: 'heart', kind: 'text', items: lines('localTips') });
  if (on('map')) S.push({ id: 'map', title: 'Map', sub: 'Everything in one place', icon: 'compass', kind: 'map' });
  return S;
}
// Order follows "What should guests see first?"
const FIRST = { 'Wi-Fi': 'wifi', 'Check-out time': 'stay', 'House guide': 'houseguide', 'How to get in': 'arrival', 'Places to eat': 'eat', 'What’s on today': 'events', 'Beaches': 'todo', 'Map': 'map', 'Your phone number': 'emergency', 'Rubbish tonight': 'rubbish' };
function ordered(S){ const pri = (A.homeFirst || []).map(x => FIRST[x]).filter(Boolean); return [...S].sort((a, b) => { const ia = pri.indexOf(a.id), ib = pri.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }); }

// The phone's styles: the guide's own look (engine/src/styles/app.css, values read from it on 24 Nov 2026 and kept here
// for the drawing only), in the chosen world's tokens (worldTok: the same names the guide's :root has), its titles in the
// world's font, the text in Jost. Everything is under .pv, so the full-page preview never touches the maker's own styles.
// The rules are the ones the built guide ends with once app.css's later blocks have overridden the earlier ones: a change
// to the guide's look is copied here by hand (compare the two phones side by side), never the other way round.
function pvStyle(p){
  const tok = Object.entries(p.tok || worldTok('bauhaus')).map(([k, x]) => `${k}:${x}`).join(';');
  const kmap = Object.entries(ENG_TILE.k).map(([k, x]) => `${k}:var(${x})`).join(';');
  const base = `.pv{${tok};${kmap};--r:20px;--r-s:12px;--r-m:12px}${p.plain ? '.pv{font-synthesis-weight:none}' : ''}`;
  const shared = `html,body{background:${p.paper}!important;margin:0!important;padding:0!important}
.pv{position:relative;background:var(--paper);color:var(--ink);font-family:var(--font);font-size:17px;line-height:1.45;-webkit-font-smoothing:antialiased;min-height:100vh;padding-bottom:28px}
.pv *,.pv *::before,.pv *::after{box-sizing:border-box}.pv a{color:inherit}
.pv p,.pv li,.pv small,.pv b,.pv h2,.pv h3,.pv .lead{overflow-wrap:break-word;hyphens:manual}
.pv-in{position:relative;max-width:720px;margin:0 auto;padding:12px 16px 0;display:flex;flex-direction:column;gap:14px}
.pv-in.pg{padding-top:max(10px,calc(var(--notch,0px) + 6px));gap:18px}
.pv-lang{position:absolute;z-index:41;top:12px;right:16px;width:44px;height:44px;border-radius:50%;background:var(--white);color:var(--ink);display:grid;place-items:center;font-size:14px;font-weight:700;letter-spacing:.03em;box-shadow:0 2px 8px rgba(18,18,18,.22)}
.pv-in.pg .pv-lang,.pv-in.pg .pv-back{top:max(10px,calc(var(--notch,0px) + 6px))}
.pv-back{position:absolute;z-index:40;top:10px;left:16px;width:44px;height:44px;border-radius:50%;border:0;padding:0;background:var(--white);color:var(--ink);display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(18,18,18,.14),0 0 0 1px rgba(18,18,18,.06)}
.pv-back svg{width:20px;height:20px}
.pv .hcard{background:var(--white);border:2px solid var(--ink);border-radius:var(--r);overflow:hidden}
.pv .hc-ph{display:block;height:clamp(140px,19vh,170px);background:var(--blue) 50% 74%/cover no-repeat;cursor:pointer;position:relative}
.pv .hc-art svg{width:100%;height:100%;display:block}
.pv .hc-art .a-sky{fill:var(--blue)}.pv .hc-art .a-sun{fill:var(--yellow)}.pv .hc-art .a-far{fill:color-mix(in srgb,var(--blue) 72%,var(--ink))}
.pv .hc-art .a-mid{fill:color-mix(in srgb,var(--green) 60%,var(--paper))}.pv .hc-art .a-near{fill:color-mix(in srgb,var(--green) 35%,var(--paper))}
.pv .hc-art .a-wall{fill:var(--white)}.pv .hc-art .a-roof{fill:var(--red)}.pv .hc-art .a-win,.pv .hc-art .a-door{fill:color-mix(in srgb,var(--ink) 75%,var(--blue))}.pv .hc-art .a-tree{fill:color-mix(in srgb,var(--green) 55%,var(--ink))}
.pv .hc-id{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;color:var(--ink);background:none;border:0;border-bottom:1.5px solid var(--line);font:inherit;text-align:left;cursor:pointer}
.pv .hc-id>img{width:44px;height:44px;border-radius:12px;flex:none;object-fit:contain}
.pv .hc-nm{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
.pv .hc-nm h1{font-family:var(--display);font-weight:700;font-size:21px;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;margin:0}
.pv .hc-nm small{font-size:14px;color:var(--muted)}
.pv .hc-nm .hc-w{font-size:13px;font-weight:600;letter-spacing:.02em}
.pv .hc-id .go{flex:none;width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--yellow);display:grid;place-items:center}
.pv .hc-id .go svg,.pv .gt .go svg{width:20px;height:20px}
.pv .keyfacts{display:grid;grid-template-columns:repeat(2,1fr)}
.pv .keyfacts>:only-child{grid-column:1/-1}
.pv .keyfacts button{display:flex;flex-direction:column;gap:2px;padding:12px 16px;color:var(--ink);background:none;border:0;border-left:1.5px solid var(--line);text-align:left;font:inherit;cursor:pointer}
.pv .keyfacts button:first-child{border-left:0}
.pv .keyfacts small{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pv .keyfacts b{font-size:15px;font-weight:600;line-height:1.2}
.pv .keyfacts .kf-wifi b{color:var(--blue)}
.pv .sh{font-family:var(--display);font-weight:700;font-size:25px;line-height:1.15;letter-spacing:-.01em;margin:6px 0 0}
.pv .ggrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pv .gt{position:relative;overflow:hidden;isolation:isolate;container-type:inline-size;display:flex;flex-direction:column;gap:2px;min-height:150px;margin:0;padding:16px;border:0;border-radius:var(--r);background:var(--tc);color:var(--ti);font:inherit;text-align:left;cursor:pointer;width:100%}
.pv .gt *{hyphens:manual}
.pv .gt .ib{display:block;width:34px;height:34px;margin-bottom:auto}
.pv .gt .ib .ci{width:34px;height:34px;stroke-width:2.2}
.pv .gt-tx{display:flex;flex-direction:column;gap:2px;margin-top:14px;position:relative;z-index:1}
.pv .gt-t{font-family:var(--display);font-weight:700;font-size:23px;line-height:1.08;letter-spacing:-.01em}
.pv .gt-m{font-size:16px;font-weight:600;line-height:1.25}
.pv .gt .go{position:absolute;right:14px;bottom:14px;z-index:1;width:36px;height:36px;border-radius:50%;background:var(--ti);color:var(--gofg,#fff);display:grid;place-items:center}
.pv .gt::before,.pv .gt::after{content:"";position:absolute;z-index:-1;pointer-events:none}
.pv .gt.wide{grid-column:1/-1;min-height:0}
.pv .gt.s-tall{grid-row:span 2}
.pv .gt.s-tall .ib,.pv .gt.s-tall .ib .ci{width:42px;height:42px}
.pv .gt[data-k="map"]{border:2px solid var(--ink)}
.pv .gt[data-k="garbage"]{min-height:0}
.pv .gt[data-k="garbage"] .ib{display:none}
.pv .gt[data-k="garbage"] .gt-tx{margin-top:0}
.pv .gt:not(.wide) .go{position:static;flex:none;align-self:flex-end;margin-top:10px}
.pv .gt:not(.wide) .gt-t{overflow-wrap:normal;font-size:clamp(19px,15.5cqi,23px)}
.pv .gt.s-tall:not(.wide) .gt-t{font-size:clamp(22px,17cqi,30px)}
.pv .gt.s-tall.t-word:not(.wide) .gt-t{font-size:clamp(19px,15.5cqi,23px)}
.pv .gt.t-long .gt-t{font-size:21px}
.pv .gt.s-wide:not(.w-live){--wide-go:18px;--wide-r:62px;flex-direction:row;align-items:center;gap:14px;min-height:0;padding:18px}
.pv .gt.s-wide:not(.w-live) .ib{margin:0}
.pv .gt.s-wide:not(.w-live) .gt-tx{margin:0;padding-right:var(--wide-r)}
.pv .gt.s-wide:not(.w-live) .go{top:50%;bottom:auto;right:var(--wide-go);margin-top:-18px}
.pv .gt.s-wide:is([data-k="map"],[data-k="markets"],[data-k="restaurants"],[data-k="todo"],[data-k="events"],[data-k="message"],[data-k="emergency"],[data-k="transport"]){--wide-go:52px;--wide-r:96px}
.pv .gt.wide[data-k="garbage"]{padding-right:96px}
.pv .gt.wide[data-k="garbage"] .go{top:50%;bottom:auto;right:52px;margin-top:-18px}
.pv .gt:not(.wide)::after{display:none}
.pv .gt[data-k="garbage"]::before{width:80px;height:80px;border-radius:50%;background:var(--yellow);right:-44px;top:50%;margin-top:-40px}
.pv .gt[data-k="message"]::before{width:64px;height:32px;border-radius:64px 64px 0 0;background:var(--ink);right:-6px;top:-2px;transform:rotate(180deg)}
.pv .gt.s-wide[data-k="message"]::before{width:40px;height:80px;border-radius:80px 0 0 80px;right:-2px;top:50%;margin-top:-40px;transform:none}
.pv .gt.s-tall[data-k="message"]::before{width:80px;height:40px;border-radius:80px 80px 0 0;right:-8px}
.pv .gt[data-k="emergency"]::before{width:0;height:0;border-left:34px solid transparent;border-right:34px solid transparent;border-bottom:46px solid var(--ink);right:-6px;top:-4px;transform:rotate(180deg)}
.pv .gt.s-wide[data-k="emergency"]::before{border-left:0;border-top:34px solid transparent;border-bottom:34px solid transparent;border-right:46px solid var(--ink);right:-6px;top:50%;margin-top:-34px;transform:none}
.pv .gt.s-tall[data-k="emergency"]::before{border-left-width:42px;border-right-width:42px;border-bottom-width:58px;right:-8px;top:-6px}
.pv .gt[data-k="markets"]::before{width:104px;height:104px;border-radius:50%;background:var(--red);right:-40px;top:-44px}
.pv .gt.s-half[data-k="markets"]::before{width:84px;height:84px;right:-30px;top:-34px}
.pv .gt[data-k="restaurants"]::before{width:84px;height:84px;border-radius:50%;background:var(--yellow);right:-30px;top:-34px}
.pv .gt.s-tall[data-k="restaurants"]::before{width:104px;height:104px;right:-40px;top:-44px}
.pv .gt[data-k="events"]::before{width:84px;height:84px;border-radius:50%;background:var(--red);right:-30px;top:-34px}
.pv .gt.s-tall[data-k="events"]::before{width:104px;height:104px;right:-40px;top:-44px}
.pv .gt.s-wide:is([data-k="markets"],[data-k="restaurants"],[data-k="events"])::before{width:80px;height:80px;border-radius:50%;right:-44px;top:50%;margin-top:-40px}
.pv .gt[data-k="todo"]::before{width:0;height:0;border-left:30px solid transparent;border-right:30px solid transparent;border-bottom:40px solid var(--yellow);right:-6px;top:-4px;transform:rotate(180deg)}
.pv .gt.s-wide[data-k="todo"]::before{border-left:0;border-top:30px solid transparent;border-bottom:30px solid transparent;border-right:40px solid var(--yellow);right:-6px;top:50%;margin-top:-30px;transform:none}
.pv .gt.s-tall[data-k="todo"]::before{border-left-width:38px;border-right-width:38px;border-bottom-width:50px;right:-8px;top:-6px}
.pv .gt[data-k="nightlife"]::before{width:56px;height:56px;border-radius:50%;background:transparent;box-shadow:inset -14px 8px 0 0 var(--yellow);right:-4px;top:-6px;transform:rotate(-12deg)}
.pv .gt.s-wide[data-k="nightlife"]::before{right:2px;top:50%;margin-top:-28px}
.pv .gt.s-tall[data-k="nightlife"]::before{width:70px;height:70px;box-shadow:inset -18px 10px 0 0 var(--yellow);right:-6px;top:-8px}
.pv .gt[data-k="map"]::before{width:80px;height:80px;border-radius:50%;background:var(--blue);right:-44px;top:50%;margin-top:-40px}
.pv .gt[data-k="map"]::after{width:56px;height:6px;background:var(--red);left:0;bottom:0}
.pv .whatson{background:var(--white);border-radius:var(--r);display:flex;flex-direction:column;overflow:hidden}
.pv .wo-day{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:16px 18px 2px}
.pv .wo-day b{font-family:var(--display);font-size:20px;font-weight:700}
.pv .wo-day span{color:var(--muted);font-size:15px}
.pv .wo-note{margin:0;padding:8px 18px 16px;font-size:16px;color:var(--muted)}
.pv .wo-links{display:flex;gap:18px;padding:14px 18px 16px;border-top:1.5px solid var(--line)}
.pv .wo-links button{border:0;background:none;padding:0;font:inherit;color:var(--blue);font-weight:600;font-size:15px;cursor:pointer}
.pv .hfoot{text-align:center;margin:6px 0 0;font-size:14px;line-height:20px}
.pv .hfoot span{display:inline-block;padding:12px 10px;color:var(--muted);font-weight:500;text-decoration:underline;text-underline-offset:3px}
.pv .pv-page h2.title{font-family:var(--display);font-weight:700;letter-spacing:-.015em;line-height:1.05;margin:0;min-height:44px;display:flex;align-items:center;padding:0 52px 0 56px;font-size:clamp(25px,7.6vw,32px)}
.pv .lead{color:var(--muted);margin:6px 0 0;font-size:17px;max-width:60ch}
.pv-card{background:var(--white);border-radius:var(--r);padding:16px 18px;color:var(--ink)}
.pv-card h3{font-family:var(--display);font-weight:700;font-size:21px;line-height:1.2;margin:0}
.pv-card>p{margin:10px 0 0;font-size:16px;line-height:1.5}
.pv-card.mlist{padding:0;overflow:hidden}
.pv-list{display:flex;flex-direction:column}
.pv-row{padding:12px 0;border-top:1.5px solid var(--line);font-size:15px;color:var(--muted);line-height:1.35}
.pv-row:first-child{border-top:0}
.pv-row b{display:block;font-size:18px;font-weight:600;line-height:1.25;color:var(--ink)}
.pv-card h3+.pv-list,.pv-card h3+.pv-photos{margin-top:10px}
.mlist .pv-row{position:relative;min-height:68px;padding:14px 16px 14px 68px}
.mlist .pv-row>.dot{position:absolute;left:16px;top:14px;width:40px;height:40px;border-radius:var(--r-m);background:var(--cc);color:var(--ci,#fff);display:grid;place-items:center}
.mlist .pv-row>.dot .ci{width:22px;height:22px;stroke-width:2.2}
.pv-clist .pv-row{padding:14px 16px}
.pv-gal{height:290px;margin:0 -16px;background:var(--line) 50% 50%/cover no-repeat;position:relative}
.pv-gal span{position:absolute;right:12px;bottom:12px;padding:3px 10px;border-radius:999px;background:rgba(18,18,18,.55);color:#fff;font-size:13px;font-weight:600}
.pv-hfacts{margin:0;font-size:20px;font-weight:600;line-height:1.3}
.pv-card .pv-ch{font-family:var(--display);font-weight:700;font-size:26px;line-height:1.15;margin:0}
.pv-card .pv-ch+p{margin-top:12px}
.pv-tour h3{font-family:var(--font);font-size:17px;font-weight:600;margin:18px 0 8px}
.pv-card.pv-hc>h3{font-size:26px;line-height:1.15}
.pv-beds{margin:10px 0 0;padding-left:20px;font-size:16px;line-height:1.5}
.pv-checks{list-style:none;margin:10px 0 0;padding:0}
.pv-checks li{position:relative;padding:9px 0 9px 28px;border-top:1.5px solid var(--line);font-size:16px;line-height:1.35}
.pv-checks li:first-child{border-top:0}
.pv-checks li::before{content:"";position:absolute;left:4px;top:13px;width:12px;height:7px;border-left:2.5px solid var(--blue);border-bottom:2.5px solid var(--blue);transform:rotate(-45deg)}
.pv-btn.pv-wide{display:flex;justify-content:center;align-self:stretch;margin-top:12px}
.pv-call{display:flex;width:max-content;align-items:center;gap:7px;margin-top:10px;padding:10px 18px;border-radius:999px;background:var(--strong-card);color:#fff;font-size:20px;font-weight:700;line-height:1.2}
.pv-call .ci{width:18px;height:18px}
.pv-row a{color:var(--blue);font-weight:600;text-decoration:none}
.pv-photos{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory}
.pv-photos img{height:112px;min-width:84px;max-width:200px;object-fit:cover;border-radius:12px;scroll-snap-align:start;flex:none;background:var(--line)}
.pv-research{padding:16px 18px;border-radius:var(--r);background:var(--white);color:var(--muted);font-size:16px;line-height:1.45}
.pv-research b{display:block;margin-bottom:2px;color:var(--ink);font-size:17px;font-weight:600}
.pv-btn{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:var(--white);color:var(--ink);border:2px solid var(--ink);font-size:16px;font-weight:600;text-decoration:none}
.pv .wsheet{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center}
.pv .ws-bg{position:absolute;inset:0;background:rgba(10,10,10,.55);border:0;padding:0;cursor:pointer}
.pv .ws-card{position:relative;width:100%;max-width:520px;max-height:calc(100vh - 12px);overflow:auto;background:var(--white);color:var(--ink);border-radius:20px 20px 0 0;padding:0 20px 22px;display:flex;flex-direction:column;gap:12px}
.pv .ws-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 -20px;padding:16px 12px 8px 20px}
.pv .ws-card h3{margin:0;font-size:24px;font-family:var(--font)}
.pv .ws-x{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:var(--paper);color:var(--ink);font-size:26px;line-height:1;cursor:pointer}
.pv .ws-f{background:var(--paper);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.pv .ws-f small{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pv .ws-f b{font-size:17px;overflow-wrap:anywhere;hyphens:none}
.pv .ws-pwrow{flex-direction:row;align-items:center;justify-content:space-between;gap:12px}
.pv .ws-pwrow>span{display:flex;flex-direction:column;gap:2px;min-width:0}
.pv .ws-pw{font-family:ui-monospace,SFMono-Regular,Menlo,"Roboto Mono",Consolas,monospace;font-size:16px!important;font-weight:600;line-height:1.35}
.pv .ws-copy{flex:none;padding:9px 18px;border-radius:999px;border:2px solid var(--blue);background:var(--blue);color:#fff;font:inherit;font-size:16px;font-weight:600}
.pv .ws-how{margin:0;color:var(--muted);font-size:15px;line-height:1.4;text-align:center}
.pv .ws-qr{align-self:center;width:200px;max-width:100%;aspect-ratio:1;border:2px dashed var(--line);border-radius:12px;display:grid;place-items:center;padding:14px;text-align:center;color:var(--muted);font-size:14px;line-height:1.35}
.pv-bar{position:fixed;left:0;right:0;top:0;z-index:40;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:6px 12px;background:#111;color:#fff;font:600 13px/1.3 system-ui,sans-serif}
.pv-bar a{color:#F2B33D}
.pv-shell{padding-top:32px}
.fbs{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
.fbs-card{width:100%;max-width:520px;max-height:90vh;overflow:auto;background:#fff;color:#151515;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px;font:16px/1.45 system-ui,sans-serif}
.fbs-card h3{font:700 22px system-ui,sans-serif;margin:0}
.fbs-card textarea{width:100%;border:1.5px solid #ddd;border-radius:12px;padding:10px 12px;font:inherit;min-height:70px}
.fbs-card .tabs{display:flex;gap:6px}
.fbs-card .tabs button{flex:1;border:1.5px solid #ddd;background:#f6f5f1;border-radius:999px;padding:9px;font:600 14px system-ui;cursor:pointer;color:#151515}
.fbs-card .tabs button[aria-pressed="true"]{background:#151515;color:#fff;border-color:#151515}
.fbs-card .row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.fbs-card .stars{display:flex;gap:6px}.fbs-card .stars button{width:42px;height:42px;border-radius:10px;border:1.5px solid #ddd;background:#f6f5f1;font:700 16px system-ui;cursor:pointer;color:#151515}
.fbs-card .stars button[aria-pressed="true"]{background:#F2B33D;border-color:#F2B33D}
.fbs-card .hint{font-size:13px;color:#666;margin:0}`;
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${worldGF(p.base)}&display=swap"><style>${base}${shared}</style>`;
}

// The drawn cover, same scene as the guide's (engine/src/modules/house/welcome.js THEMED_COVER).
const PV_ART = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect class="a-sky" width="400" height="160"/><circle class="a-sun" cx="246" cy="48" r="15"/><path class="a-far" d="M0 112C60 86 120 88 186 104S318 84 400 98V160H0z"/><path class="a-mid" d="M0 128C80 110 150 114 228 126S350 116 400 120V160H0z"/><path class="a-wall" d="M178 104h44v32h-44z"/><path class="a-roof" d="M173 106l27-18 27 18z"/><path class="a-win" d="M186 112h8v8h-8zM206 112h8v8h-8z"/><path class="a-door" d="M196 123h8v13h-8z"/><path class="a-tree" d="M238 136c-4 0-5-9-5-19s2-20 5-25c3 5 5 15 5 25s-1 19-5 19zM251 136c-3 0-4-6-4-13s2-14 4-18c2 4 4 11 4 18s-1 13-4 13z"/><path class="a-near" d="M0 140C100 130 220 132 300 138S380 136 400 136V160H0z"/></svg>`;

// The engine's arrow and back chevron (engine/src/ui.js ARROW, engine/viewer.html #backBtn), drawn as the guide draws them.
const PV_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
const PV_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
// The drawing's sections as the guide has them (engine/scripts/generate-site.py SEC, in its order): the section's id in
// the guide (its tile's look: engine/src/ui.js SECTION_LOOK, pasted as ENG_LOOK), its group and kind (the frame's), the
// tile's label and the page's title and lead in the guide's words (engine/src/i18n/en.json; the maker's languages in
// i18n/ui.json). lead: null keeps the drawing's own line, '' none (the guide has none).
const PV_ENG = {
  rubbish: { id: 'garbage', group: 'house', kind: 'garbage', tile: 'Garbage and recycling', lead: null },
  houseguide: { id: 'message', group: 'house', kind: 'info', tile: 'House guide', lead: 'Everything you need to know about the house.' },
  emergency: { id: 'emergency', group: 'house', kind: 'contacts', tile: 'Emergencies', title: 'Emergency contacts', lead: '' },
  markets: { id: 'markets', group: 'area', kind: 'markets', tile: 'Markets', lead: '' },
  eat: { id: 'restaurants', group: 'area', kind: 'spots', tile: 'Our favourite places to eat', lead: 'Our favourite places to eat and drink, tried and loved.' },
  todo: { id: 'todo', group: 'area', kind: 'spots', tile: 'What to do', lead: 'What to do and see around the house.' },
  nightlife: { id: 'nightlife', group: 'area', kind: 'spots', tile: 'Nightlife', lead: null },
  events: { id: 'events', group: 'area', kind: 'events', tile: 'Local events', lead: null }
};
// Whether the build will give the section a tile on Home (generate-site.py: rubbish needs the host's answer, the host's
// lists a place, events wait for their research and are in What's on; the others always).
function pvOnHome(x){
  if (x.id === 'rubbish') return !!v('rubbishMode') || rubbishLines().length > 0;
  if (x.id === 'eat' || x.id === 'todo') return (x.picks || []).length + (x.items || []).length > 0;
  if (x.id === 'nightlife') return (x.items || []).length > 0;
  return x.id !== 'events';
}
// The guide as the frame sees it (engine/src/modules/frame.js, pasted as FR; the engine's views/home.js frameGuide): the
// sections with a tile, no highlight cards (the build makes none from the builder's answers), the map.
function pvFrame(S){
  const order = Object.keys(PV_ENG), live = S.filter(x => PV_ENG[x.id] && pvOnHome(x)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const G = { sections: live.map(x => ({ id: PV_ENG[x.id].id, kind: PV_ENG[x.id].kind, group: PV_ENG[x.id].group, status: 'live' })), highlights: [], map: S.some(x => x.id === 'map'), transportCard: null, offers: FR.OFFERS };
  return { R: FR.resolve(null, G), of: id => live.find(x => PV_ENG[x.id].id === id) };
}
// A tile as views/home.js draws it: flat colour, one corner shape (CSS, by data-k), icon, title, round arrow. Its classes
// by its size and widget, with home.js's rules for a long title (wide, over 20 characters) and a wordy one (tall, a word
// over 9), counted on the words the phone shows.
function pvTile(key, pvId, label, size, widget){
  const look = ENG_LOOK[key] || ENG_LOOK.todo, shown = String(tr(label));
  const cls = [size === 'wide' ? 'wide' : '', 's-' + size, widget === 'live' ? 'w-live' : '', size === 'wide' && widget === 'entry' && shown.length > 20 ? 't-long' : '', size === 'tall' && shown.split(/[\s\-\u2010-\u2014/]+/).some(w => w.length > 9) ? 't-word' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="pv-sec gt ${cls}" data-k="${key}" data-pv="${pvId}" style="--tc:${look.color};--ti:${look.ink ? 'var(--ink)' : '#fff'};--gofg:${look.ink ? '#fff' : 'var(--ink)'}"><span class="ib ic">${look.icon}</span><span class="gt-tx"><b class="gt-t">${esc(label)}</b></span><span class="go ar" aria-hidden="true">${PV_ARROW}</span></button>`;
}

// One screen of the guide as guests will see it, built from the answers: the welcome card, the two groups of tiles placed
// by the guide's own frame, What's on. Used by the phone in the builder (the wow, and next to the steps) and by the
// full-page preview.
async function pvParts(screen){
  const p = await phonePalette();
  const S = guideSections(), name = v('guideName') || v('placeName') || WOW.name || 'Your guide';
  // Same rule as the guide (engine/scripts/generate-site.py): the host's own cover, else the listing photo they chose,
  // unless they asked for a cover drawn from the colours.
  const own = (uploads.find(u => u.kind === 'cover') || {}).url, listing = A.coverChoice !== 'drawn' && A.coverUrl ? String(A.coverUrl).split('?')[0] + '?im_w=720' : '';
  const cover = own || listing, logo = (uploads.find(u => u.kind === 'logo') || {}).url;   // on the welcome card, as in the guide
  const scr = screen, sec = S.find(x => x.id === scr);
  // The welcome card's two facts, as the guide has them (modules/house/welcome.js): Wi-Fi, then Check-out.
  const facts = [];
  if (secOn('wifi')) facts.push(['wifi', 'Wifi', 'Tap to connect', 'kf-wifi']);
  if (v('checkOut')) facts.push(['stay', 'Check-out', 'Before ' + v('checkOut'), '']);
  const { R, of } = pvFrame(S);
  const draw = it => it.kind === 'map' ? pvTile('map', 'map', 'Map of all spots', 'wide', 'entry') : (x => pvTile(it.id, x.id, PV_ENG[x.id].tile, it.size, it.widget))(of(it.id));
  const grp = g => R[g].map(run => `<div class="ggrid${g === 'area' ? ' mosaic' : ''}">${run.items.map(draw).join('')}</div>`).join('');
  // What's on: the days' markets and events are found when the guide is sent; until then the drawing's honest line, in
  // the card they will fill (modules/whatson).
  const mk = S.some(x => x.id === 'markets'), ev = S.some(x => x.id === 'events');
  const today = (d => d.charAt(0).toUpperCase() + d.slice(1))(new Date().toLocaleDateString(UIL === 'en' ? 'en-GB' : UIL, { weekday: 'long', day: 'numeric', month: 'long' }));   // as the guide writes it: Mardi 24 novembre
  const whatson = mk || ev ? `<h2 class="sh pv-h">What’s on</h2><section class="whatson"><div class="wo-day"><b>Today</b><span translate="no">${esc(today)}</span></div>
    <p class="wo-note">${mk ? 'When you send your guide, we list every weekly market nearby, with what runs today.' : 'When you send your guide, we list festivals and fairs, with dates.'}</p>
    <div class="wo-links">${mk ? '<button type="button" data-pv="markets">All markets</button>' : ''}${ev ? '<button type="button" data-pv="events">All events</button>' : ''}</div></section>` : '';
  const lang = `<span class="pv-lang" translate="no" aria-hidden="true">${esc(String(A.sourceLang || UIL).toUpperCase())}</span>`;
  const home = `${lang}<section class="sthero"><div class="hcard">
    <div class="hc-ph pv-cover${cover ? '' : ' hc-art pv-art'}" data-pv="house" role="button" tabindex="0"${cover ? ` style="background-image:url('${cover}')"` : ''}>${cover ? '' : PV_ART}</div>
    <div class="hc-id" data-pv="house" role="button" tabindex="0">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span class="hc-nm pv-name"><small class="hc-w">Welcome to</small><h1>${esc(name)}</h1><small>See the house</small></span><span class="go" aria-hidden="true">${PV_ARROW}</span></div>
    ${facts.length ? `<div class="keyfacts pv-facts">${facts.map(f => `<button type="button" class="pv-fact ${f[3]}" data-pv="${f[0]}"><small>${esc(f[1])}</small><b>${esc(f[2])}</b></button>`).join('')}</div>` : ''}
    </div></section>
    <h2 class="sh pv-h">At the house</h2>${grp('house')}
    <h2 class="sh pv-h">Around the house</h2>${grp('area')}
    ${whatson}<p class="hfoot"><span>Sources and credits</span></p>`;
  // The Wi-Fi is a sheet over Home in the guide (modules/house/wifi.js), not a page.
  const page = sec && sec.kind === 'wifi' ? home + wifiSheetHTML() : sec ? `<button class="pv-back" type="button" data-pv="home" aria-label="Home">${PV_BACK}</button>${lang}${pageHTML(sec)}` : home;
  return { name, style: pvStyle(p), body: `<div class="pv pv-shell"><div class="pv-in${sec && sec.kind !== 'wifi' ? ' pg' : ''}">${page}</div></div>` };
}
// The Wi-Fi sheet as the guide opens it from the welcome card: network, password with Copy, the QR code to scan. The code
// is made when the guide is built: until then the drawing says so where it will be.
function wifiSheetHTML(){
  const inner = v('wifiName') ? `<div class="ws-f"><small>Network</small><b>${esc(v('wifiName'))}</b></div>
    <div class="ws-f ws-pwrow"><span><small>Password</small><b class="ws-pw">${esc(v('wifiPassword'))}</b></span><span class="ws-copy">Copy</span></div>
    <p class="ws-how">Another phone? Scan to join:</p><div class="ws-qr"><span><b>In your finished guide</b><br>A QR code to join with one tap.</span></div>`
    : `<div class="pv-research" style="background:var(--paper)"><b>Your Wi-Fi goes here</b>Add it in Only you know: guests join with one tap.</div>`;
  return `<div class="wsheet"><button type="button" class="ws-bg" data-pv="home" aria-label="Close"></button><div class="ws-card pv-page" role="dialog"><div class="ws-hd"><h3>Wifi</h3><button type="button" class="ws-x" data-pv="home" aria-label="Close">×</button></div>${inner}</div></div>`;
}
async function renderPreview(){
  const { name, style, body } = await pvParts(PV.screen);
  document.body.innerHTML = `${style}
    <div class="pv-bar">Preview of ${esc(name)} · ${esc(BASE)}/${esc(v('slug'))} · <a href="/#look">Back to my answers</a></div>
    ${body}
    <div class="toast" id="toast" hidden></div>`;
  const q = document.getElementById('pvSearch');
  if (q) q.addEventListener('input', () => { const t = q.value.toLowerCase().trim(); document.querySelectorAll('.pv-sec').forEach(b => { b.hidden = t && !b.dataset.q.includes(t); }); });
}

/* ---------- The phone: a first draft of the guide, inside the builder (docs/plan-fast-builder.md, step 3) ----------
   Drawn in its own frame, so the guide's styles never touch the builder's. Tapping a tile opens that screen in the phone.
   PHONE.build: the parts arrive one after another (the wow, right after the link). */
const PHONE = { screen: 'home', build: false, timer: null };
const WOW = { stage: '', name: '' };   // the wow page: reading (the listing page), writing (Claude), done
// The guide screen each step changes, shown next to it.
const STEP_SCREEN = { place: 'house', nightlife: 'nightlife', known: 'wifi', wifi: 'wifi', stay: 'stay', howto: 'houseguide', photos: 'house', offers: 'house', arrival: 'arrival', rubbish: 'rubbish', contacts: 'emergency', nearby: 'todo', favourites: 'eat', taste: 'todo' };
const phoneHTML = () => `<div class="phone"><div class="phone-scr"><iframe id="phoneFrame" title="A first draft of your guide"></iframe></div></div>`;
// Both phones (this one, and the editor's, which shows the guide itself) draw the guide at a real phone's width, then
// scale it down to the frame: text and tiles keep their true sizes and wrap as they do on a phone.
const PHONE_W = 390;
function phoneFit(f){ const s = f && f.parentElement; if (!s || !s.clientWidth) return; const k = s.clientWidth / PHONE_W; f.style.transform = `scale(${k})`; f.style.height = Math.ceil(s.clientHeight / k) + 'px'; phoneNotch(f, k); }
// The frame's notch (.phone::before) covers the top of the screen: its bottom edge, in the guide's own pixels, goes to
// the page as --notch, so a page's header (back button, title, language) starts below it at every phone size (25 Nov 2026).
function phoneNotch(f, k){
  try {
    const s = f.parentElement, ph = s && s.parentElement, de = f.contentDocument && f.contentDocument.documentElement; if (!ph || !de || !k) return;
    const n = getComputedStyle(ph, '::before'), b = n.display === 'none' || n.content === 'none' ? 0 : parseFloat(n.top) + parseFloat(n.height) - s.offsetTop;
    const v = Math.max(0, Math.ceil(b / k)) + 'px'; if (de.style.getPropertyValue('--notch') !== v) de.style.setProperty('--notch', v);
  } catch (e) {}
}
const phoneRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => phoneFit(e.target.querySelector('iframe')))) : null;
function phoneWatch(f){ phoneFit(f); if (phoneRO && f && !f.__watched) { f.__watched = true; phoneRO.observe(f.parentElement); } }
const PHONE_CSS = `<style>.pv{min-height:100vh;padding-bottom:28px}.pv-shell{padding-top:0}
.pv-build .hcard,.pv-build .pv-h,.pv-build .pv-sec,.pv-build .whatson{animation:pvIn .55s cubic-bezier(.2,.7,.2,1) both}
.pv-build .pv-h{animation-delay:.4s}.pv-build .whatson{animation-delay:1.2s}
${Array.from({ length: 14 }, (_, i) => `.pv-build .pv-sec:nth-child(${i + 1}){animation-delay:${(0.5 + i * 0.12).toFixed(2)}s}`).join('')}
@keyframes pvIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pv-build *{animation:none!important}}</style>`;
async function phoneRender(){
  const f = document.getElementById('phoneFrame'); if (!f) return;
  phoneWatch(f);
  // The step's own screen once it exists (Wi-Fi as soon as it has a name), the guide's home until then.
  const scr = ordered(guideSections()).some(x => x.id === PHONE.screen) ? PHONE.screen : 'home';
  const { style, body } = await pvParts(scr);
  const doc = f.contentDocument; if (!doc) return;
  if (!doc.getElementById('pvBody')) {
    doc.open(); doc.write(`<!doctype html><html lang="${A.sourceLang || UIL}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="pvStyle"></div><div id="pvBody"></div></body></html>`); doc.close();
    uiAttach(doc);   // the phone's own words in the maker's language (i18n.js); the host's texts stay as written
    doc.addEventListener('click', e => { const b = e.target.closest('[data-pv]'); if (b) { PHONE.screen = b.dataset.pv; PHONE.build = false; phoneRender().then(() => { try { f.contentWindow.scrollTo(0, 0); } catch (er) {} }); return; } if (e.target.closest('a')) e.preventDefault(); });
  }
  const st = doc.getElementById('pvStyle'), html = style + PHONE_CSS; if (st.innerHTML !== html) st.innerHTML = html;
  const bd = doc.getElementById('pvBody'); bd.className = PHONE.build ? 'pv-build' : ''; bd.innerHTML = body;
  phoneFit(f);   // the notch's line on the new page
}
// Typing in a step updates the phone a moment later, without moving it.
const phoneSoon = () => { if (!document.getElementById('phoneFrame')) return; clearTimeout(PHONE.timer); PHONE.timer = setTimeout(() => { PHONE.build = false; phoneRender(); }, 350); };
document.addEventListener('input', phoneSoon); document.addEventListener('change', phoneSoon);
function pageHTML(x){
  const research = x.research ? `<div class="pv-research"><b>In your finished guide</b>${esc(x.research)}</div>` : '';
  const list = items => items.length ? `<div class="pv-list">${items.map(t => { if (typeof t === 'object') return rubbishRow(t); const [a, ...b] = t.split(/:\s|,\s| - /); return `<div class="pv-row"><b>${esc(a)}</b>${b.length ? esc(b.join(', ')) : ''}</div>`; }).join('')}</div>` : '';
  const e = PV_ENG[x.id], look = e && ENG_LOOK[e.id];
  const dot = look ? `<span class="dot" style="--cc:${look.color};--ci:${look.ink ? 'var(--ink)' : '#fff'}" aria-hidden="true">${look.icon}</span>` : '';
  let body = '';
  if (x.kind === 'house') {
    // The house page (modules/house): the photos on top, one counter, the facts, then About, the photo tour (one card,
    // its rooms inside), the beds and what the place offers, a tick before each.
    const tour = roomsNow().map(r => ({ r: r.n, photos: photosIn(r.n).map(u => u.url) })).filter(r => r.photos.length), all = tour.flatMap(r => r.photos);
    const offers = amenKey(amenNow()).map(amenGuideName);
    body = `${all.length ? `<div class="pv-gal" style="background-image:url('${all[0]}')"><span translate="no">1 / ${all.length}</span></div>` : ''}${x.sub ? `<p class="pv-hfacts">${esc(x.sub)}</p>` : ''}
      ${v('welcome') ? `<section class="pv-card"><h2 class="pv-ch">About the house</h2><p>${esc(v('welcome'))}</p></section>` : ''}
      ${tour.length ? `<section class="pv-card pv-tour"><h2 class="pv-ch">Photo tour</h2>${tour.map(r => `<h3>${esc(r.r)}</h3><div class="pv-photos">${r.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>`).join('')}</section>` : ''}
      ${lines('sleeping').length ? `<section class="pv-card pv-hc"><h3>Where you'll sleep</h3><ul class="pv-beds">${lines('sleeping').map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>` : ''}
      ${offers.length ? `<section class="pv-card pv-hc"><h3>What this place offers</h3><ul class="pv-checks">${offers.slice(0, 8).map(o => `<li>${esc(o)}</li>`).join('')}</ul>${offers.length > 8 ? `<span class="pv-btn pv-wide">Show all ${offers.length} amenities</span>` : ''}</section>` : ''}`;
  }
  else if (x.kind === 'rooms') body = x.rooms.length ? x.rooms.map(r => `<section class="pv-card"><h3>${esc(r.r)}</h3>${r.photos.length ? `<div class="pv-photos">${r.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${list(r.items)}</section>`).join('') : `<div class="pv-research"><b>Nothing here yet</b>Add how things work and photos by room in your answers.</div>`;
  else if (x.kind === 'contacts') body = `<h2 class="sh" style="margin:0">Emergencies</h2><section class="pv-card mlist pv-clist"><div class="pv-list"><div class="pv-row"><b>Emergencies</b>Police, ambulance, fire<span class="pv-call">${ENG_LOOK.emergency.icon}112</span></div>${(Array.isArray(A.taxis) ? A.taxis : []).map(t => `<div class="pv-row"><b>Taxi</b><span translate="no">${esc(txName(t.name))}</span></div>`).join('')}${v('taxi') ? `<div class="pv-row"><b>Taxi</b>${esc(v('taxi'))}</div>` : ''}</div></section>${research}`;
  // A kept card: its name live, with Google Maps; no rating or kind of Google's, which the guide does not show either.
  else if (x.kind === 'places') body = `${(x.picks || []).length ? `<section class="pv-card mlist"><div class="pv-list">${x.picks.map(p => `<div class="pv-row">${dot}<b>${esc(p.gone ? 'A place you kept' : p.name)}</b>${esc([isOurs(p.id) ? p.type : '', p.km != null ? numUI(p.km) + ' km' : ''].filter(Boolean).join(' · '))}${p.c ? `<br><i>“${esc(p.c)}”</i>` : ''}<br><a href="${esc(swMaps(p) || '#')}" target="_blank" rel="noopener" translate="no">Google Maps</a></div>`).join('')}</div></section>` : ''}${x.items.length ? `<section class="pv-card mlist"><div class="pv-list">${x.items.map(t => { const r = x.id === 'todo' && placeRows('favDo').find(y => twRow(y) && String(y.p).trim() === t);
    // A town picked from our list: its kind, province and distance, the host's comment, and directions to its own position.
    if (r) return `<div class="pv-row">${dot}<b>${esc(t)}</b><span translate="no">${esc(twLine(twOf(r)))}</span>${r.c ? `<br><i>“${esc(r.c)}”</i>` : ''}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener">Directions</a></div>`;
    if (/^https?:\/\//i.test(t.trim())) return `<div class="pv-row">${dot}<b>A place from your link</b>When you send your guide, we add its name.<br><a href="${esc(t.trim())}" target="_blank" rel="noopener" translate="no">Google Maps</a></div>`;
    const [a, ...b] = t.split(/,\s| - |:\s/); return `<div class="pv-row">${dot}<b>${esc(a)}</b>${esc(b.join(', '))}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', ' + v('town'))}" target="_blank" rel="noopener">Directions</a></div>`; }).join('')}</div></section>` : ''}${research}`;
  else if (x.kind === 'map') body = `<section class="pv-card"><p style="margin:0">Every place in the guide on one map, centred near ${esc(v('town') || 'the house')} (never on the house itself).</p></section><a class="pv-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v('town'))}" target="_blank" rel="noopener">Open ${esc(v('town') || 'the area')} in Maps</a>`;
  else body = `${x.photos && x.photos.length ? `<div class="pv-photos">${x.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${x.items && x.items.length ? `<section class="pv-card">${list(x.items)}</section>` : ''}${x.extra ? `<section class="pv-card"><h3>${esc(x.extra.h)}</h3>${list(x.extra.items)}</section>` : ''}${research}`;
  const title = e ? e.title || e.tile : x.title, lead = x.kind === 'house' ? '' : e && e.lead !== null ? e.lead : x.sub;
  return `<div class="pv-page"><h2 class="title">${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${body}`;
}
document.addEventListener('click', e => {
  if (!document.querySelector('.pv')) return;
  const b = e.target.closest('[data-pv]'); if (b) { PV.screen = b.dataset.pv; log('preview', PV.screen); queueSave(); renderPreview().then(() => window.scrollTo(0, 0)); return; }
});


// Rubbish, as the step says it: the kinds and the days are the step's own words (BIN_ROWS, DAYS7 in start.js), each its own
// piece so the maker's language reaches it (i18n.js), and a kind's name stays whole above the line under it (25 Nov 2026).
// A row is { h: its heading's pieces, t: the line under it }; what the host typed stays as typed.
function rubbishLines(){
  const m = v('rubbishMode'), out = [], bin = id => (BIN_ROWS.find(b => b[0] === id) || [0, id])[1], day = x => (DAYS7.find(y => y[0] === x) || [0, x])[1];
  for (const r of containerRows()) if ((r.w || '').trim() || (r.t || []).length) out.push({ h: ['Containers', ...(r.t || []).map(bin)], t: (r.w || '').trim() || 'see the map' });
  if (/house|mix/i.test(m)) for (const [id, lab] of BIN_ROWS) { const d = ((A.rubbishPlan || {})[id] || []); if (d.length) out.push({ h: [lab], t: d.map(day) }); }
  if (v('rubbishNotes')) out.push({ t: v('rubbishNotes') });
  return out;
}
// One row of rubbishLines: the heading's words and the days in spans of their own, so each is translated on its own.
const rubbishRow = r => {
  const sp = x => `<span>${esc(x)}</span>`, [k, ...kinds] = r.h || [];
  const h = k ? `<b>${sp(k)}${kinds.length ? ` (${kinds.map(sp).join(', ')})` : ''}</b>` : '';
  return `<div class="pv-row">${h}${Array.isArray(r.t) ? r.t.map(sp).join(', ') : r.h ? sp(r.t) : esc(r.t)}</div>`;
};
