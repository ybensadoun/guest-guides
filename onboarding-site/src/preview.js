/* ---------- Instant preview of the host's guide ----------
   Built in the browser from the host's own answers and photos, the moment they send (or press Preview).
   Lives at /<their-address> on this device. Researched sections (places, markets, events) show what the
   full guide will add. A Feedback button on every screen sends notes tagged with that screen. */
const PV = { screen: 'home' };

/* ---------- The guide's colours: a colour world (engine/src/worlds.js, pasted by build.py as WK) ----------
   The host picks one in The look (A.world): one of the six worlds, or 'cover' / 'logo', a world made from that picture by the
   engine's own rule (engine/src/picture-world.js), kept in A.worldOwn with the picture it came from (A.worldSrc), so it is
   read again only when that picture changes. Every guide has Ca La Kimberly's tiles (Yohann, 10 Nov 2026): no layouts. */
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
// The phone selected: the host's choice, Bauhaus when none, or when its picture is gone or cannot be read.
function worldSel(){
  worldMigrate();
  const w = A.world;
  if (w === 'cover' || w === 'logo') return picOf(w) && picWorldNow(w) !== null ? w : 'bauhaus';
  return isWorldId(w) ? w : 'bauhaus';
}
// What the stored answer says once a picture is read: its world and the picture (A.worldOwn, A.worldSrc), or Bauhaus
// when the picture is gone or cannot be read (silently, as the build does).
function worldStore(){
  worldMigrate();
  const k = A.world; if (k !== 'cover' && k !== 'logo') return false;
  const pic = picOf(k), w = pic ? picWorldNow(k) : null;
  if (w === undefined) return false;
  if (w === null) { A.world = 'bauhaus'; delete A.worldOwn; delete A.worldSrc; queueSave(); return true; }
  if (A.worldSrc === pic.key && JSON.stringify(A.worldOwn) === JSON.stringify(w)) return false;
  A.worldOwn = w; A.worldSrc = pic.key; queueSave(); return true;
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
// The world to draw (an id or { base, ...roles }): the picture's once read; Bauhaus when it cannot be.
async function worldResolved(){
  const s = worldSel();
  if (s === 'cover' || s === 'logo') return (await picWorld(s)) || 'bauhaus';
  return s;
}
// The same at once, for what cannot wait (the drawn cover's colours, a researched card's kind): Stone while a picture is read.
function worldNow(){
  const s = worldSel();
  if (s === 'cover' || s === 'logo') { const w = picWorldNow(s); return w === undefined ? 'stone' : w || 'bauhaus'; }
  return s;
}
// A world's tokens after the contrast rule, and the title font of its base.
const worldTok = w => WK.worldTokens(WK.worldOf(w) || WK.WORLDS.bauhaus);
const worldBase = w => isWorldId(w) ? w : w && isWorldId(w.base) ? w.base : 'bauhaus';
// The phone's palette, as the tiles use it (acc: blue, red, yellow, green), with the world's title font.
function worldPal(w){
  const t = worldTok(w), b = WK.WORLDS[worldBase(w)];
  return { paper: t['--paper'], ink: t['--ink'], acc: [t['--blue'], t['--red'], t['--yellow'], t['--green']], display: b.display, plain: !!b.plain, base: worldBase(w) };
}
const phonePalette = async () => worldPal(await worldResolved());
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
function houseParts(){
  const out = new Map(), rooms = roomsNow(), part = c => PV_ROOM[c] || 'Good to know', at = t => out.get(t) || out.set(t, { r: t, items: [], photos: [] }).get(t);
  rooms.forEach(r => { if (part(r.c) !== 'Good to know') at(part(r.c)); });
  lines('howTos').forEach(l => at(part(Object.keys(ROOMKW).find(k => ROOMKW[k].test(l)))).items.push(l));
  rooms.forEach(r => String(r.t || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(l => at(part(r.c)).items.push(rooms.filter(x => part(x.c) === part(r.c)).length > 1 ? `${r.n}: ${l}` : l)));
  uploads.filter(u => u.kind === 'photo').forEach(u => at(part(u.room)).photos.push(u.url));
  const parts = [...out.values()].filter(p => p.items.length || p.photos.length);
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
  if (on('emergency')) S.push({ id: 'emergency', title: 'Emergency and contacts', sub: '112, hospital, pharmacy', icon: 'phone', kind: 'contacts', research: help.length ? `Found near you: ${help.slice(0, 3).join(', ')}. Hours and directions are in your full guide.` : 'We add the nearest hospital, pharmacy and on-call doctor, with hours.' });
  if (on('essentials')) S.push({ id: 'essentials', title: 'Shops and essentials', sub: 'Supermarket, bakery, pharmacy', icon: 'bag', kind: 'places', items: lines('essentials'), research: 'We add opening hours, distances and the ones you did not list.' });
  const picks = cats => Object.values(A.swipes || {}).filter(x => x.d === 'yes' && cats.includes(x.cat)).map(swShown);   // the live card by its id (start.js)
  if (on('eat')) S.push({ picks: picks(['eat', 'coffee', 'drinks']), id: 'eat', title: 'Eat and drink', sub: 'Our favourite places', icon: 'heart', kind: 'places', items: placeRows('favEat').filter(r => String(r.p || '').trim()).map(r => r.p + (r.c ? ': ' + r.c : '')), research: !placeRows('favEat').length && 'Add the places you recommend, with a link or a name and a comment. We do not add restaurants of our own.' });
  if (on('todo')) S.push({ picks: picks(['todo']), id: 'todo', title: 'Things to do', sub: (A.interests || []).slice(0, 3).join(', ') || 'Around you', icon: 'compass', kind: 'places', items: addedPlaces(), research: !picks(['todo']).length && !addedPlaces().length && 'Keep the places you like in Attractions: only those go in your guide.' });
  if (on('nightlife')) S.push({ id: 'nightlife', title: 'Nightlife', sub: 'Bars, clubs, live music', icon: 'moon', kind: 'places', items: placeRows('favNight').filter(r => String(r.p || '').trim()).map(r => r.p + (r.c ? ': ' + r.c : '')), research: !placeRows('favNight').length && 'Add the late bars, clubs and live music you recommend. We add none of our own.' });
  if (on('markets')) S.push({ id: 'markets', title: 'Local markets', sub: 'What is on today', icon: 'bag', kind: 'places', items: found('markets', 'markets').map(m => `${nm(m.name)}${m.town ? ': ' + m.town : ''}`), research: found('markets', 'markets').length ? 'Found near you. Days and hours are in your full guide.' : 'We list every weekly market nearby, with what runs today.' });
  if (on('events')) S.push({ id: 'events', title: 'Local events', sub: 'During your stay', icon: 'kite', kind: 'places', items: [], research: 'We list festivals and fairs, with dates.' });
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

// The phone's styles: Ca La Kimberly's tiles (the Bauhaus look) in the chosen world's colours, its titles in the world's
// font, the text in Jost, as in the guide (engine/src/worlds.js).
function pvStyle(p){
  const a = p.acc;
  const base = `:root{--pp:${p.paper};--pi:${p.ink};--a1:${a[0]};--a2:${a[1]};--a3:${a[2]};--a4:${a[3]};--pd:${p.display};--pb:"Jost",system-ui,sans-serif}${p.plain ? '.pv{font-synthesis-weight:none}' : ''}`;
  const shared = `html,body{background:var(--pp)!important;margin:0!important;padding:0!important}
.pv{background:var(--pp);color:var(--pi);font:16px/1.5 var(--pb);min-height:100vh;padding-bottom:96px}
.pv *{box-sizing:border-box}.pv a{color:inherit}
.pv-in{max-width:620px;margin:0 auto;padding:0 16px;display:flex;flex-direction:column;gap:16px}
.pv h1,.pv h2,.pv h3{font-family:var(--pd);margin:0;line-height:1.05;text-wrap:balance}
.pv-cover{position:relative;height:clamp(240px,42vh,380px);background:var(--a1) center/cover no-repeat;margin:0 -16px}
.pv-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.55))}
.pv-art svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.pv-art .a-sky{fill:var(--a1)}.pv-art .a-sun{fill:var(--a3)}.pv-art .a-far{fill:color-mix(in srgb,var(--a1) 72%,var(--pi))}
.pv-art .a-mid{fill:color-mix(in srgb,var(--a4) 60%,var(--pp))}.pv-art .a-near{fill:color-mix(in srgb,var(--a4) 35%,var(--pp))}
.pv-art .a-wall{fill:#fff}.pv-art .a-roof{fill:var(--a2)}.pv-art .a-win,.pv-art .a-door{fill:color-mix(in srgb,var(--pi) 75%,var(--a1))}.pv-art .a-tree{fill:color-mix(in srgb,var(--a4) 55%,var(--pi))}
.pv-name{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;color:#fff}
.pv-logo{display:block;width:56px;height:56px;object-fit:contain;background:#fff;border-radius:12px;padding:5px;margin-bottom:10px}
.pv-name small{display:block;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.9}
.pv-name h1{font-size:clamp(34px,9vw,52px)}
.pv-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pv-fact{display:flex;flex-direction:column;gap:2px;padding:12px 14px;text-decoration:none;cursor:pointer;border:0;font:inherit;text-align:left;color:inherit;background:none}
.pv-fact small{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.pv-fact b{font-size:17px}
.pv-search{width:100%;font:inherit;font-size:17px;padding:14px 16px;border-radius:14px;border:2px solid var(--pi);background:#fff;color:#111}
.pv-h{font-size:24px;margin-top:8px}
.pv-secs{display:grid;gap:12px}
.pv-sec{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;text-decoration:none;cursor:pointer;border:0;font:inherit;text-align:left;color:inherit}
.pv-sec b{font-family:var(--pd);font-size:22px;line-height:1.1}
.pv-sec small{opacity:.8;font-size:14px}
.pv-sec .ic svg{width:28px;height:28px}
.pv-sec .ar{display:none}
.pv-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--pp)}
.pv-back{display:inline-flex;align-items:center;gap:6px;border:0;background:none;font:inherit;font-weight:700;cursor:pointer;color:inherit;padding:8px 4px}
.pv-back svg{width:18px;height:18px}
.pv-page h2{font-size:36px}
.pv-list{display:flex;flex-direction:column}
.pv-row{padding:14px 0;border-top:1px solid color-mix(in srgb,var(--pi) 15%,transparent)}
.pv-row:first-child{border-top:0}
.pv-row b{display:block}
.pv-photos{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory}
.pv-photos img{height:150px;border-radius:12px;scroll-snap-align:start;flex:none}
.pv-research{padding:14px 16px;border-radius:14px;background:color-mix(in srgb,var(--a3) 22%,var(--pp));font-size:15px}
.pv-research b{display:block;margin-bottom:2px}
.pv-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;background:var(--pi);color:var(--pp);font-weight:700;text-decoration:none;border:0;font:inherit;cursor:pointer}
.pv-card{padding:16px;border-radius:16px;background:#fff;color:#111}
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
  const tiles = `.pv-secs{grid-template-columns:1fr 1fr}
.pv-sec{min-height:156px;padding:14px;border-radius:20px;color:var(--st,#fff);background:var(--sc);justify-content:flex-start;gap:4px}
.pv-sec::before{content:"";position:absolute;z-index:-1;top:0;right:0;width:54px;height:54px;background:var(--ss);border-radius:0 0 0 54px}
.pv-sec:nth-child(3n+2)::before{width:0;height:0;background:none;border-radius:0;border-left:25px solid transparent;border-right:25px solid transparent;border-top:44px solid var(--ss);right:12px}
.pv-sec:nth-child(3n)::before{width:46px;height:46px;border-radius:50%;top:-12px;right:-12px}
.pv-sec .ic{min-height:50px}.pv-sec .ic svg{width:26px;height:26px}
.pv-sec .tx{display:flex;flex-direction:column;gap:2px}.pv-sec b{font-family:var(--pd);font-weight:700;font-size:20px;line-height:1.12}.pv-sec small{font-size:13.5px}
.pv-sec .ar{display:grid;place-items:center;align-self:flex-end;margin-top:auto;width:32px;height:32px;border-radius:50%;background:#fff;color:#121212;font-weight:700}
.pv-sec.lt .ar{background:var(--pi);color:#fff}.pv-sec.wide{grid-column:1/-1;min-height:120px}
.pv-fact{background:#fff;border-radius:14px;border:2px solid var(--pi)}.pv-h{font-weight:700}.pv h1,.pv h2{font-weight:700}`;
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${worldGF(p.base)}&display=swap"><style>${base}${shared}${tiles}</style>`;
}

// The drawn cover, same scene as the guide's (engine/src/views/home.js THEMED_COVER).
const PV_ART = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect class="a-sky" width="400" height="160"/><circle class="a-sun" cx="246" cy="48" r="15"/><path class="a-far" d="M0 112C60 86 120 88 186 104S318 84 400 98V160H0z"/><path class="a-mid" d="M0 128C80 110 150 114 228 126S350 116 400 120V160H0z"/><path class="a-wall" d="M178 104h44v32h-44z"/><path class="a-roof" d="M173 106l27-18 27 18z"/><path class="a-win" d="M186 112h8v8h-8zM206 112h8v8h-8z"/><path class="a-door" d="M196 123h8v13h-8z"/><path class="a-tree" d="M238 136c-4 0-5-9-5-19s2-20 5-25c3 5 5 15 5 25s-1 19-5 19zM251 136c-3 0-4-6-4-13s2-14 4-18c2 4 4 11 4 18s-1 13-4 13z"/><path class="a-near" d="M0 140C100 130 220 132 300 138S380 136 400 136V160H0z"/></svg>`;

// One screen of the guide as guests will see it, built from the answers: the cover, the name, the sections. Used by the
// phone in the builder (the wow, and next to the steps) and by the full-page preview.
async function pvParts(screen){
  const p = await phonePalette();
  const S = ordered(guideSections()), name = v('guideName') || v('placeName') || WOW.name || 'Your guide';
  // Same rule as the guide (engine/scripts/generate-site.py): the host's own cover, else the listing photo they chose,
  // unless they asked for a cover drawn from the colours.
  const own = (uploads.find(u => u.kind === 'cover') || {}).url, listing = A.coverChoice !== 'drawn' && A.coverUrl ? String(A.coverUrl).split('?')[0] + '?im_w=720' : '';
  const cover = own || listing, logo = (uploads.find(u => u.kind === 'logo') || {}).url;   // on the welcome card, as in the guide
  const colours = [p.acc[0], p.acc[1], p.ink, p.acc[3], p.acc[2]], shapes = [p.acc[2], p.ink, p.acc[1], p.acc[2], p.ink];
  const light = hex => { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160; };
  const scr = screen, sec = S.find(x => x.id === scr);
  const facts = [];
  for (const f of (A.homeFirst && A.homeFirst.length ? A.homeFirst : ['Wi-Fi', 'Check-out time'])) {
    if (f === 'Wi-Fi' && secOn('wifi')) facts.push(['wifi', 'Wi-Fi', 'Tap to connect']);
    if (f === 'Check-out time' && v('checkOut')) facts.push(['stay', 'Check-out', 'Before ' + v('checkOut')]);
    if (f === 'How to get in' && v('arrival')) facts.push(['arrival', 'Getting here', 'Directions']);
    if (f === 'House guide') facts.push(['houseguide', 'House guide', 'How things work']);
    if (f === 'Places to eat') facts.push(['eat', 'Eat', lines('favourites').length + ' favourites']);
  }
  // As on the guide's Home: Wi-Fi and check-out are the two facts on top, arrival is inside the House guide; the tiles follow in two groups.
  const atHouse = ['rubbish', 'houseguide', 'emergency'].map(id => S.find(x => x.id === id)).filter(Boolean), around = S.filter(x => !atHouse.includes(x) && !['house', 'wifi', 'stay', 'arrival'].includes(x.id));
  const tile = (x, i, wide) => `<button type="button" class="pv-sec${wide ? ' wide' : ''}${light(colours[i % colours.length]) ? ' lt' : ''}" data-pv="${x.id}" data-q="${esc((x.title + ' ' + x.sub + ' ' + (x.items || []).join(' ')).toLowerCase())}" style="--sc:${colours[i % colours.length]};--ss:${shapes[i % shapes.length]};--st:${light(colours[i % colours.length]) ? p.ink : '#fff'}"><span class="ic">${I[x.icon] || ''}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span><span class="ar" aria-hidden="true">→</span></button>`;
  const group = (list, title, from) => list.length ? `<h2 class="pv-h">${esc(title)}</h2><div class="pv-secs">${list.map((x, i) => tile(x, from + i, i === list.length - 1 && list.length % 2 === 1)).join('')}</div>` : '';
  const ph = id => { const r = (S.find(x => x.id === 'houseguide') || {}).rooms || []; return id === 'houseguide' && r.find(x => x.photos.length) ? r.find(x => x.photos.length).photos[0] : null; };
  const home = `<div class="pv-cover${cover ? '' : ' pv-art'}" data-pv="house"${cover ? ` style="background-image:url('${cover}')"` : ''}>${cover ? '' : PV_ART}<div class="pv-name">${logo ? `<img class="pv-logo" src="${esc(logo)}" alt="">` : ''}<small>Welcome to</small><h1>${esc(name)}</h1></div></div>
    ${/search/i.test(v('navStyle')) ? `<input class="pv-search" id="pvSearch" placeholder="Search the guide: wifi, bins, beach…" aria-label="Search the guide">` : ''}
    ${facts.length ? `<div class="pv-facts">${facts.slice(0, 4).map(f => `<button type="button" class="pv-fact" data-pv="${f[0]}"><small>${esc(f[1])}</small><b>${esc(f[2])}</b></button>`).join('')}</div>` : ''}
    ${group(atHouse, 'At the house', 0)}${group(around, 'Around the house', atHouse.length)}`;
  return { name, style: pvStyle(p), body: `<div class="pv pv-shell">${sec ? `<div class="pv-top"><button class="pv-back" type="button" data-pv="home">${BACK}${esc(name)}</button></div>` : ''}
      <div class="pv-in">${sec ? pageHTML(sec) : home}</div></div>` };
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

/* ---------- The phone: the guide, live, inside the builder (docs/plan-fast-builder.md, step 3) ----------
   Drawn in its own frame, so the guide's styles never touch the builder's. Tapping a tile opens that screen in the phone.
   PHONE.build: the parts arrive one after another (the wow, right after the link). */
const PHONE = { screen: 'home', build: false, timer: null };
const WOW = { stage: '', name: '' };   // the wow page: reading (the listing page), writing (Claude), done
// The guide screen each step changes, shown next to it.
const STEP_SCREEN = { place: 'house', nightlife: 'nightlife', known: 'wifi', wifi: 'wifi', stay: 'stay', howto: 'houseguide', photos: 'house', offers: 'house', arrival: 'arrival', rubbish: 'rubbish', contacts: 'emergency', nearby: 'todo', favourites: 'eat', taste: 'todo' };
const phoneHTML = () => `<div class="phone"><div class="phone-scr"><iframe id="phoneFrame" title="Your guide, as guests will see it"></iframe></div></div>`;
// Both phones (this one, and the editor's, which shows the guide itself) draw the guide at a real phone's width, then
// scale it down to the frame: text and tiles keep their true sizes and wrap as they do on a phone.
const PHONE_W = 390;
function phoneFit(f){ const s = f && f.parentElement; if (!s || !s.clientWidth) return; const k = s.clientWidth / PHONE_W; f.style.transform = `scale(${k})`; f.style.height = Math.ceil(s.clientHeight / k) + 'px'; }
const phoneRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => phoneFit(e.target.querySelector('iframe')))) : null;
function phoneWatch(f){ phoneFit(f); if (phoneRO && f && !f.__watched) { f.__watched = true; phoneRO.observe(f.parentElement); } }
const PHONE_CSS = `<style>.pv{min-height:100vh;padding-bottom:28px}.pv-in{padding:0 14px}.pv-cover{margin:0 -14px;height:236px}.pv-name h1{font-size:34px}.pv-top{padding:8px 14px}
.pv-build .pv-cover,.pv-build .pv-name,.pv-build .pv-welcome,.pv-build .pv-fact,.pv-build .pv-h,.pv-build .pv-sec{animation:pvIn .55s cubic-bezier(.2,.7,.2,1) both}
.pv-build .pv-name{animation-delay:.25s}.pv-build .pv-welcome{animation-delay:.4s}.pv-build .pv-fact{animation-delay:.5s}.pv-build .pv-h{animation-delay:.6s}
${Array.from({ length: 14 }, (_, i) => `.pv-build .pv-sec:nth-child(${i + 1}){animation-delay:${(0.7 + i * 0.12).toFixed(2)}s}`).join('')}
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
}
// Typing in a step updates the phone a moment later, without moving it.
const phoneSoon = () => { if (!document.getElementById('phoneFrame')) return; clearTimeout(PHONE.timer); PHONE.timer = setTimeout(() => { PHONE.build = false; phoneRender(); }, 350); };
document.addEventListener('input', phoneSoon); document.addEventListener('change', phoneSoon);
function pageHTML(x){
  const research = x.research ? `<div class="pv-research"><b>In your full guide</b>${esc(x.research)}</div>` : '';
  const list = items => items.length ? `<div class="pv-list">${items.map(t => { const [a, ...b] = t.split(/:\s|,\s| - /); return `<div class="pv-row"><b>${esc(a)}</b>${b.length ? esc(b.join(', ')) : ''}</div>`; }).join('')}</div>` : '';
  let body = '';
  if (x.kind === 'house') {
    const tour = roomsNow().map(r => ({ r: r.n, photos: photosIn(r.n).map(u => u.url) })).filter(r => r.photos.length);
    const offers = amenKey(amenNow()).map(amenGuideName);
    body = `${tour.map(r => `<section class="pv-card"><h3>${esc(r.r)}</h3><div class="pv-photos">${r.photos.map(s => `<img src="${s}" alt="">`).join('')}</div></section>`).join('')}
      ${v('welcome') ? `<section class="pv-card"><h3>About the house</h3><p style="margin:8px 0 0">${esc(v('welcome'))}</p></section>` : ''}
      ${lines('sleeping').length ? `<section class="pv-card"><h3>Where you'll sleep</h3>${list(lines('sleeping'))}</section>` : ''}
      ${offers.length ? `<section class="pv-card"><h3>What this place offers</h3><p style="margin:8px 0 0">${esc(offers.slice(0, 8).join(', '))}${offers.length > 8 ? ` and ${offers.length - 8} more` : ''}</p></section>` : ''}`;
  }
  else if (x.kind === 'rooms') body = x.rooms.length ? x.rooms.map(r => `<section class="pv-card"><h3>${esc(r.r)}</h3>${r.photos.length ? `<div class="pv-photos">${r.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${list(r.items)}</section>`).join('') : `<div class="pv-research"><b>Nothing here yet</b>Add how things work and photos by room in your answers.</div>`;
  else if (x.kind === 'wifi' && !v('wifiName')) body = `<div class="pv-research"><b>Your Wi-Fi goes here</b>Add it in Only you know: guests join with one tap.</div>`;
  else if (x.kind === 'wifi') body = `<section class="pv-card"><p style="margin:0 0 6px;opacity:.7">Network</p><h3 style="font-size:24px">${esc(v('wifiName'))}</h3><p style="margin:12px 0 6px;opacity:.7">Password</p><h3 style="font-size:24px">${esc(v('wifiPassword'))}</h3></section><div class="pv-research"><b>In your full guide</b>A QR code to join with one tap, and a copy button.</div>`;
  else if (x.kind === 'contacts') body = `<section class="pv-card"><div class="pv-list"><div class="pv-row"><b>Emergencies: 112</b>Police, ambulance, fire</div>${v('taxi') ? `<div class="pv-row"><b>Taxi</b>${esc(v('taxi'))}</div>` : ''}</div></section>${research}`;
  // A kept card: its name live, with Google Maps; no rating or kind of Google's, which the guide does not show either.
  else if (x.kind === 'places') body = `${(x.picks || []).length ? `<section class="pv-card"><div class="pv-list">${x.picks.map(p => `<div class="pv-row"><b>${esc(p.gone ? 'A place you kept' : p.name)}</b>${esc([isOurs(p.id) ? p.type : '', p.km != null ? (+p.km).toFixed(1) + ' km' : ''].filter(Boolean).join(' · '))}${p.c ? `<br><i>“${esc(p.c)}”</i>` : ''}<br><a href="${esc(swMaps(p) || '#')}" target="_blank" rel="noopener" translate="no">Google Maps</a></div>`).join('')}</div></section>` : ''}${x.items.length ? `<section class="pv-card"><div class="pv-list">${x.items.map(t => { const r = x.id === 'todo' && placeRows('favDo').find(y => twRow(y) && String(y.p).trim() === t);
    // A town picked from our list: its kind, province and distance, the host's comment, and directions to its own position.
    if (r) return `<div class="pv-row"><b>${esc(t)}</b><span translate="no">${esc(twLine(twOf(r)))}</span>${r.c ? `<br><i>“${esc(r.c)}”</i>` : ''}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener">Directions</a></div>`;
    const [a, ...b] = t.split(/,\s| - |:\s/); return `<div class="pv-row"><b>${esc(a)}</b>${esc(b.join(', '))}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', ' + v('town'))}" target="_blank" rel="noopener">Directions</a></div>`; }).join('')}</div></section>` : ''}${research}`;
  else if (x.kind === 'map') body = `<section class="pv-card"><p style="margin:0">Every place in the guide on one map, centred near ${esc(v('town') || 'the house')} (never on the house itself).</p></section><a class="pv-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v('town'))}" target="_blank" rel="noopener">Open ${esc(v('town') || 'the area')} in Maps</a>`;
  else body = `${x.photos && x.photos.length ? `<div class="pv-photos">${x.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${x.items && x.items.length ? `<section class="pv-card">${list(x.items)}</section>` : ''}${x.extra ? `<section class="pv-card"><h3>${esc(x.extra.h)}</h3>${list(x.extra.items)}</section>` : ''}${research}`;
  return `<div class="pv-page"><h2>${esc(x.title)}</h2><p style="opacity:.75;margin:6px 0 0">${esc(x.sub)}</p></div>${body}`;
}
document.addEventListener('click', e => {
  if (!document.querySelector('.pv')) return;
  const b = e.target.closest('[data-pv]'); if (b) { PV.screen = b.dataset.pv; log('preview', PV.screen); queueSave(); renderPreview().then(() => window.scrollTo(0, 0)); return; }
});


function rubbishLines(){
  const m = v('rubbishMode'), out = [];
  for (const r of containerRows()) if ((r.w || '').trim() || (r.t || []).length) out.push(`Containers${(r.t || []).length ? ' (' + r.t.map(id => (BIN_ROWS.find(b => b[0] === id) || [0, id])[1]).join(', ') + ')' : ''}: ${(r.w || '').trim() || 'see the map'}`);
  if (/house|mix/i.test(m)) for (const [id, lab] of BIN_ROWS) { const d = ((A.rubbishPlan || {})[id] || []); if (d.length) out.push(`${lab}: ${d.map(x => (DAYS7.find(y => y[0] === x) || [0, x])[1]).join(', ')}`); }
  if (v('rubbishNotes')) out.push(v('rubbishNotes'));
  return out;
}
