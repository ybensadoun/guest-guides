/* ---------- Start: one link, a first version of everything ----------
   The host pastes their listing link (and the town if we cannot read it). The site's assistant writes
   a first version of every step; the host then only reviews. If the link is wrong or unreadable,
   we say exactly what to do instead. */
const LINK_OK = [/^https?:\/\/([a-z]{2,3}\.)?(www\.)?airbnb\.[a-z.]+\/(rooms\/(plus\/)?\d+|h\/[\w-]+|slink\/\w+)/i, /^https?:\/\/(www\.)?abnb\.me\/\S+/i,
  /^https?:\/\/(www\.)?booking\.com\/hotel\/[a-z]{2}\/[\w-]+/i, /^https?:\/\/(www\.)?vrbo\.com\/(\d+|[\w-]+\/\d+)/i];
// What a phone's share button gives ("Check out this home on Airbnb! https://…"), or a link without https://: the link alone.
const cleanLink = u => { u = String(u || '').trim(); const m = u.match(/https?:\/\/[^\s<>"]+/i); if (m) return m[0].replace(/[).,;:!?»"']+$/, '');
  return /^(www\.|[a-z]{2,3}\.)?(airbnb|abnb|booking|vrbo)\.[a-z.]+\//i.test(u) ? 'https://' + u : u; };
const linkProblem = u => { u = cleanLink(u); if (!u) return ''; if (!/^https?:\/\//i.test(u)) return 'Paste the full address, starting with https://'; return LINK_OK.some(rx => rx.test(u)) ? '' : 'This is not a listing page. Open your listing and copy the address from the browser bar: it looks like airbnb.com/rooms/12345678.'; };
const hasSource = () => !!A._draftAt || (!!v('listingUrl') && !linkProblem(v('listingUrl'))) || v('listingText').length > 200;
const START = { busy: false, need: '', msg: '', step: 0 };
const STEPS_MSG = ['Opening your listing…', 'Reading the house, the rules and what it offers…', 'Writing your house guide…', 'Choosing sections for your guests…', 'Almost there…'];
const FUN_MSG = ['Knocking on your listing’s door…', 'Counting the beds (twice, to be safe)…', 'Peeking into every room…', 'Teaching a snail to read your house rules…', 'Sorting the photos, kitchen goes with kitchen…', 'Asking the sofa how many it sleeps…', 'Polishing the welcome text…', 'Checking that the fridge is where it should be…', 'Almost there, tidying the last details…'];
const FUN_ICON = ['🔑', '🛏️', '🚪', '🐌', '📸', '🛋️', '✍️', '🧊', '✨'];
let LOAD = { t0: 0, est: 60, timer: null };
(function(){ if (document.getElementById('llCss')) return; const st = document.createElement('style'); st.id = 'llCss'; st.textContent = `
.llcard{margin-top:6px;padding:18px 16px;border-radius:14px;background:#fff6e5;border:1px solid #f0d9a8;text-align:center}
.llcard .ico{font-size:44px;display:inline-block;animation:llb 1.1s ease-in-out infinite}
.llcard .cnt{font-size:28px;font-weight:700;margin:4px 0}
.llcard .lmsg{min-height:1.4em;margin:6px 0 10px}
.llcard .bar{height:8px;border-radius:99px;background:#f0e2c2;overflow:hidden}
.llcard .bar i{display:block;height:100%;width:0;background:#e8a21c;border-radius:99px;transition:width 1s linear}
.llcard small{display:block;margin-top:8px;opacity:.7}
@keyframes llb{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-10px) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.llcard .ico{animation:none}}`; document.head.appendChild(st); })();
function loadCardHTML(){
  return `<div class="llcard" role="status" aria-live="polite"><span class="ico" id="llIco" aria-hidden="true">${FUN_ICON[0]}</span>
    <div class="cnt" id="llCnt">1:00</div><div class="lmsg" id="llMsg">${esc(FUN_MSG[0])}</div>
    <div class="bar"><i id="llBar"></i></div><small>This can take up to a minute. Please keep this page open.</small></div>`;
}
function loadTick(){
  const el = (Date.now() - LOAD.t0) / 1000;
  while (el > LOAD.est - 5) LOAD.est += 30;   // the countdown adapts: if we run past it, it extends
  const left = Math.max(0, Math.ceil(LOAD.est - el)), k = Math.min(FUN_MSG.length - 1, Math.floor(el / 5));
  const c = document.getElementById('llCnt'), m = document.getElementById('llMsg'), b = document.getElementById('llBar'), i = document.getElementById('llIco');
  if (c) c.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  if (m) m.textContent = el > 60 ? 'Taking a bit longer than usual, still working…' : FUN_MSG[k];
  if (i) i.textContent = FUN_ICON[k % FUN_ICON.length];
  if (b) b.style.width = Math.min(95, el / LOAD.est * 100) + '%';
}
const DRAFT_MAP = { placeName: 'place', propertyType: 'place', town: 'place', region: 'place', sleeps: 'place', sleeping: 'place', bedrooms: 'place', bathrooms: 'place', beds: 'place',
  guideName: 'guide', tagline: 'guide', welcome: 'place', guests: 'area', checkIn: 'stay', checkOut: 'stay', houseRules: 'stay', checkoutTasks: 'stay',
  howTos: 'howto', arrival: 'arrival', interests: 'area', navStyle: 'look', feelWords: 'look' };

// A placeholder cut mid-word reads as broken ("https://www.airbnb.com/roor"): a field whose placeholder, in the maker's
// language, is wider than the field shows its shorter one (data-ph-short, a sentence the table already has, or an address).
// Checked whenever the page changes, the window is resized, the language switched or the fonts come in.
function fitPlaceholders(){
  const cv = fitPlaceholders.cv || (fitPlaceholders.cv = document.createElement('canvas').getContext('2d'));
  for (const i of document.querySelectorAll('input[data-ph-short]')) {
    const long = i.dataset.phLong || (i.dataset.phLong = i.getAttribute('placeholder')), s = getComputedStyle(i);
    const room = i.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); if (room <= 0) continue;
    cv.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const want = cv.measureText(tr(long)).width <= room ? long : i.dataset.phShort, now = i.getAttribute('placeholder');
    if (now !== want && now !== tr(want)) i.setAttribute('placeholder', want);   // the language table translates it as it lands
  }
}
{ let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; fitPlaceholders(); }); };
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', later); addEventListener('porta-lang', later); document.fonts.ready.then(later); }
function startHTML(){
  const lp = linkProblem(v('listingUrl'));
  return `<section class="start">
    <div class="st-art" aria-hidden="true"><span class="st-door"><i></i></span><span class="st-moon"></span></div>
    <div class="st-tx">
      <small>Guest Guide Maker</small>
      <h1>Your guest guide, written for you.</h1>
      <p>Paste your listing link. In about a minute we write a first version of your whole guide: the house, the rules, the area. You then only check it and make it yours.</p>
    </div>
    <form class="st-form" id="startForm" novalidate>
      <label for="st_url">Your listing link</label>
      <input id="st_url" data-k="listingUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.airbnb.com/rooms/…" data-ph-short="airbnb.com/rooms/…" value="${esc(v('listingUrl'))}">
      <p class="st-hint${lp ? ' bad' : ''}" id="st_urlMsg">${esc(lp || 'Airbnb, Booking.com or Vrbo.')}</p>
      <label for="st_town">Town <span class="opt">if we cannot find it in your listing</span></label>
      <input id="st_town" data-k="town" type="text" autocomplete="off" placeholder="The town or village of your place" data-ph-short="Where the place is" value="${esc(v('town'))}">
      ${START.need === 'text' || v('listingText') ? `<label for="st_text">Your listing text</label>
        <p class="st-hint">On your listing page, select everything from the title down to the house rules, copy, and paste here.</p>
        <textarea id="st_text" data-k="listingText" rows="7" placeholder="Entire home in …">${esc(v('listingText'))}</textarea>` : ''}
      ${START.msg ? `<p class="st-msg ${START.need === 'retry' ? '' : 'warn'}" role="status">${esc(START.msg)}</p>` : ''}
      <button class="btn st-go" type="submit" id="startGo"${START.busy ? ' disabled' : ''}>${START.busy ? `<span class="spin" aria-hidden="true"></span><span id="stStep">${esc(STEPS_MSG[START.step])}</span>` : `Create my first version ${ARROW}`}</button>
      <button class="st-skip" type="button" id="skipStart">Or fill it in step by step</button>
    </form></section>`;
}
// The link, then the wow (docs/plan-fast-builder.md, step 3): "This is your guide" opens at once, the phone shows the
// house as soon as its listing page is read (a few seconds), and fills in when Claude has written the rest.
// Claude writes the guide in the maker's language (i18n.js): that language is the guide's own, the others are translations of it.
const listingAsk = body => fetch('/api/listing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, lang: UIL }) }).then(r => r.json());
async function createDraft(fromStep){
  const url = cleanLink(v('listingUrl')), text = v('listingText').trim(), town = v('town').trim();
  if (url !== v('listingUrl')) A.listingUrl = url;
  const lp = linkProblem(url);
  if (lp) { START.msg = lp; START.need = 'link'; render(); return; }
  if (!url && text.length < 200) { START.msg = 'Paste your listing link, or the text of your listing.'; START.need = url ? 'text' : 'link'; render(); return; }
  A.sourceLang = UIL;
  START.busy = true; START.msg = ''; START.step = 0; LOAD.t0 = Date.now(); LOAD.est = 60; log('draft_start', 'start');
  WOW.stage = 'reading'; WOW.name = ''; PHONE.screen = 'home'; PHONE.build = true; location.hash = '#yours'; render();
  const back = (need, msg) => { START.need = need; START.msg = msg; WOW.stage = ''; location.hash = fromStep ? '#listing' : '#start'; };
  try {
    let d = await listingAsk({ url, text, town, stage: 'page' });
    if (!d.ok) { log('draft_fail', d.need || 'error'); return back(d.need || 'text', d.message); }
    if (d.stage === 'page') {   // the page is read: show the house, then let Claude write the rest from what was read
      applyEarly(d); WOW.stage = 'writing'; yoursRefresh(); phoneRender(); researchStart();   // the research of the area starts with the house's position, without waiting for Claude
      d = await listingAsk({ url, text, town, stage: 'write', src: d.src });
      if (!d.ok) { log('draft_fail', d.need || 'error'); return back(d.need || 'retry', d.message); }
    }
    applyDraft(d); log('draft_ok', d.source); classifyPhotos(); researchStart();
    A._done = { ...(A._done || {}), listing: true }; START.need = ''; START.msg = '';
    WOW.stage = 'done'; PHONE.build = true; yoursRefresh(); phoneRender();
  } catch (e) { back('retry', 'We could not reach the assistant. Check your connection and press the button again.'); }
  finally { START.busy = false; queueSave(); if (WOW.stage !== 'done' || route() !== 'yours') render(); }
}
/* ---------- Research of the area (docs/plan-fast-builder.md, step 8), in two stages (worker/README.md):
   - at the link, without an account: a quick search (the nearest markets, the emergency services), for the phone; one
     per area, shared and limited in the database (start_area_research: over the limits, the build does it);
   - once the guide has an account (at once for a host who is signed in): the full research in the background, a job of
     the guide (all the markets in reach, things to do). The build uses both: A._research and A._researchJob travel with
     the answers. What comes back shows in the phone, the full research first. ---------- */
const AREA = { result: null, quick: null, full: null, fullOpen: false, cards: 0, timer: null, tries: 0 };
function researchStart(){
  if (!A.lat || !A.lng) return;
  const g = window.__acctGuide && window.__acctGuide();
  if (AUTH && g && g.status === 'draft') researchJob(g); else if (!AUTH) areaStart();
}
async function areaStart(){
  if (!A._research) {
    try {
      const r = await sb('/rest/v1/rpc/start_area_research', { method: 'POST', token: SB.key, body: { p_visitor: sid, p_lat: +A.lat, p_lng: +A.lng, p_town: v('town') || null, p_region: v('region') || null } });
      if (!r || !r.ok || !r.id) return;
      A._research = r.id; queueSave(); log('research', r.shared ? 'shared' : 'new');
    } catch (e) { return; }   // offline, or the database said no: the build looks it up
  }
  areaWatch();
}
async function researchJob(g){
  if (!A._researchJob) {
    try {
      await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: g.id, kind: 'research', params: { lat: +A.lat, lng: +A.lng, town: v('town') || null, region: v('region') || null } } });
      if (!r || !r[0]) return;
      A._researchJob = r[0].id; queueSave(); log('research', 'full');
    } catch (e) { return; }   // the build researches instead
  }
  areaWatch();
}
// Every 6 s for the first 3 minutes (the quick search takes about one), then every 20 s, until both are settled.
async function areaWatch(){
  clearTimeout(AREA.timer); let wait = false;
  try {
    if (A._research && !AREA.quick) { const r = await sb('/rest/v1/rpc/area_research_status', { method: 'POST', token: SB.key, body: { p_id: A._research } });
      if (r && r.status === 'done' && r.result) AREA.quick = r.result; else if (r && ['queued', 'running'].includes(r.status)) wait = true; }
    if (A._researchJob && AUTH && (!AREA.full || AREA.fullOpen)) { const r = ((await sb('/rest/v1/guide_jobs?select=status,result&id=eq.' + A._researchJob)) || [])[0];
      if (r && r.result) AREA.full = r.result;   // things to do come first, while the rest goes on
      AREA.fullOpen = !!r && ['queued', 'running'].includes(r.status); if (AREA.fullOpen) wait = true; }
  } catch (e) { wait = true; }   // no connection: try again
  const before = JSON.stringify(AREA.result);
  AREA.result = (AREA.quick || AREA.full) ? { ...(AREA.quick || {}), ...(AREA.full || {}) } : null;
  townFromResearch(); seaFromResearch();
  if (JSON.stringify(AREA.result) !== before) phoneSoon();
  moreRefresh();
  if (wait && ++AREA.tries < 150) AREA.timer = setTimeout(areaWatch, AREA.tries < 30 ? 6000 : 20000);
}
// The research needs nothing from the host (Yohann, 12 Nov 2026): it starts with the house's position and searches a reach
// of its own (worker/research-brief.mjs). The host's answers in Your area act on what it found at once, without a new
// search: the distance (v('radius'), the generator's table) cuts the deck's researched cards and the markets the phone
// shows, as the build cuts the guide's markets and events (the 4 nearest markets always stay).
const RADIUS_KM = { '15 min': 15, '30 min': 30, '45 min': 45, '1 hour': 60 }, reachNow = () => RADIUS_KM[v('radius')] || 30;
const kmNum = x => x != null && x !== '' && Number.isFinite(+x) ? +x : null;
// A market's distance by road, as the build writes it: about 1.3 times the line from the house; no position, its own km.
const roadKm = m => { if (typeof m.lat === 'number' && typeof m.lng === 'number' && A.lat && A.lng) { const R = 6371, r = x => x * Math.PI / 180, a = +A.lat, b = +A.lng,
  x = Math.sin(r(m.lat - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(m.lat)) * Math.sin(r(m.lng - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) * 1.3; } return kmNum(m.km_from_house); };
function marketsInReach(list){
  const L = Array.isArray(list) ? list : [], max = reachNow(), at = L.map((m, i) => ({ m, i, km: roadKm(m) }));
  const nearest = new Set(at.filter(x => x.km != null).sort((p, q) => p.km - q.km || p.i - q.i).slice(0, 4).map(x => x.i));
  return at.filter(x => x.km == null || x.km <= max || nearest.has(x.i)).map(x => x.m);
}
// The town the research found (the municipality the house lies in, from GeoNames: worker/place-facts.mjs municipalityAt)
// fills the host's town when neither they nor the listing gave one, and the region with its province when that is empty
// too. Only the guide's own research: the quick one's point is the area's, shared with the houses around it. Not while
// the listing is being read (it may still give a town); a town the listing gives later replaces it (applyDraft).
function townFromResearch(){
  const P = (AREA.full || {}).place; if (!P || !P.town || START.busy || v('town').trim()) return;
  A.town = String(P.town).slice(0, 80); A._townAuto = A.town; A._pre = { ...(A._pre || {}), town: 'place' };
  if (P.province && !v('region').trim()) { A.region = String(P.province).slice(0, 80); A._regionAuto = A.region; A._pre = { ...A._pre, region: 'place' }; }
  queueSave(); log('town', 'research');
  document.querySelectorAll('[data-k="town"],[data-k="region"]').forEach(el => { if (el !== document.activeElement) el.value = v(el.dataset.k); });
  for (const k of ['town', 'region']) { const el = document.getElementById('f_' + k), lab = el && el.closest('.f') && el.closest('.f').querySelector('label');
    if (lab && placeAuto(k) && !lab.querySelector('.frm')) lab.insertAdjacentHTML('beforeend', PLACE_MARK); }
  softRefresh(); refreshSend();
}
// GeoNames is credited where its content shows: a mark beside the town it filled (and the region), where a listing's
// answer says "From your listing" (the field's label, build.py), until the host changes it.
const placeAuto = k => (k === 'town' && !!A._townAuto && A.town === A._townAuto) || (k === 'region' && !!A._regionAuto && A.region === A._regionAuto);
const PLACE_MARK = ' <span class="frm">From the house’s position · GeoNames</span>';
// Beaches from the house's position (12 Nov 2026, acceptance test fault 7): the listing ticks only the interests its own
// words name (listing.mjs), so a house 10 km from the sea whose listing never mentions the beach had no Beaches. The
// guide's own research gives the nearest beach (GeoNames, worker/geonames.py: place.sea, km by road; not the quick
// research's, whose point is the area's): within 25 km, Beaches is ticked, whichever of the research and the listing
// comes first (applyDraft keeps it beside the listing's), and marked where it came from. Never once the host changed the
// chips themselves (A._interestsHost, runtime.js), nor over chips they changed before that mark existed (chips with no
// "From your listing"). The chips and their mark change in place; the deck follows Your area as it does (swWant, SW.key).
const SEA_TICK_KM = 25;
function seaFromResearch(){
  const S = ((AREA.full || {}).place || {}).sea, cur = Array.isArray(A.interests) ? A.interests : [];
  if (!S || !(+S.km > 0 && +S.km <= SEA_TICK_KM) || A._interestsHost || cur.includes('Beaches') || (cur.length && !(A._pre || {}).interests)) return;
  A.interests = [...cur, 'Beaches']; A._seaAuto = true; A._pre = { ...(A._pre || {}), interests: 'area' };
  queueSave(); log('interests', 'position');
  const box = document.querySelector('input[data-multi="interests"][value="Beaches"]'); if (box) box.checked = true;
  const lab = document.getElementById('l_interests'); if (lab) { lab.querySelectorAll('.frm').forEach(x => x.remove()); lab.insertAdjacentHTML('beforeend', preMark('interests')); }
  softRefresh();
}
// The mark beside a prefilled answer's label (build.py puts it in field()): Claude's own words, the house's position
// (GeoNames), or the listing; Your area's interests say which chips the listing gave and that Beaches came from the position.
const FROM_LISTING = ' <span class="frm">From your listing</span>', SEA_MARK = ' <span class="frm">Beaches: from the house’s position · GeoNames</span>';
function preMark(k){
  if (A._basis && A._basis[k] === 'suggested') return ' <span class="frm sug">Suggested for you: please check</span>';
  if (placeAuto(k)) return PLACE_MARK;
  if (k === 'interests' && A._seaAuto && Array.isArray(A.interests) && A.interests.includes('Beaches')) return (A.interests.some(x => x !== 'Beaches') ? FROM_LISTING : '') + SEA_MARK;
  return FROM_LISTING;
}
// What the listing page says, before Claude: its name (for the phone only, Claude writes the real one), its photos,
// cover, rating and position.
function applyEarly(d){
  // The listing's own title (before " - Houses for rent..."), cut at a "|" when long: the host recognises it at once.
  let nm = String(d.pageTitle || '').split(/\s[-–]\s/)[0].trim();
  while (nm.length > 40 && nm.includes(' | ')) nm = nm.slice(0, nm.lastIndexOf(' | ')).trim();
  WOW.name = nm || String(d.title || '').split('·')[0].trim();
  if (d.cover) A.coverUrl = d.cover;
  if (d.lat && d.lng) { A.lat = d.lat; A.lng = d.lng; delete A.pos; }   // the listing's own point: ours, no date (loadPlaces)
  addListingPhotos(d);
}
function addListingPhotos(d){
  if (!Array.isArray(d.photos)) return;
  A.listingPhotos = d.photos;
  // The listing's own photos become the first photos of the house guide, each with the room we could tell from its caption.
  const have = uploads.filter(u => u.kind === 'photo');
  if (have.some(u => u.remote)) return nameListingRooms(d);
  const room = (r, cap) => { const c = ROOMS.includes(r) ? r : ''; return (!c || c === 'Other') && cap ? catOf(cap) : c; }, names = (d.draft || {}).roomNames || {};
  d.photos.slice(0, Math.max(0, 16 - have.length)).forEach((src, i) => {
    const cap = (d.photoCaps || [])[i] || '';
    const label = String(names[cap] || cap);   // the listing's own name for the room, in English when its page is not
    const rec = { id: newId(), kind: 'photo', remote: true, src, name: cap || 'Listing photo ' + (i + 1), room: room((d.photoRooms || [])[i], cap), roomLabel: label.length <= 30 ? label : '', url: src + '?im_w=720', createdAt: new Date(Date.now() + i).toISOString() };
    uploads.push(rec); saveUpload(rec);
  });
}
// The photos come with the page, Claude's English names for their rooms ("Salón": "Living room") a little later: a room still
// named by its caption takes its English name. A room the host renamed or a photo they moved stays as they made it.
function nameListingRooms(d){
  const names = (d.draft || {}).roomNames || {}, caps = d.photoCaps || [], kinds = d.photoRooms || [];
  uploads.filter(u => u.remote && u.kind === 'photo').forEach(u => {
    const i = d.photos.indexOf(u.src), cap = String(caps[i] || ''), label = String(names[cap] || '').trim();
    if (i < 0 || !cap || !(sameRoom(u.roomLabel, cap) || (!u.roomLabel && cap.length > 30))) return;
    if (ROOMS.includes(kinds[i]) && kinds[i] !== 'Other' && (!u.room || u.room === 'Other')) u.room = kinds[i];
    if (label && label.length <= 30 && !sameRoom(label, cap)) {
      const r = Array.isArray(A.rooms) && A.rooms.find(x => sameRoom(x.n, cap));
      if (r && A.rooms.some(x => sameRoom(x.n, label))) { if (!r.t) A.rooms = A.rooms.filter(x => x !== r); } else if (r) r.n = label;
      u.roomLabel = label;
    }
    saveUpload(u);
  });
}
// The wow page.
function yoursHTML(){
  return `<section class="yours"><div class="yours-tx" id="yoursTx">${yoursText()}</div><div class="yours-ph">${phoneHTML()}</div></section>`;
}
const WHAT_LEFT = { look: 'choose the look', nearby: 'pick the things to do', favourites: 'add your favourite places to eat', nightlife: 'add your nightlife spots', known: 'add what only you know' };
function yoursText(){
  const st = WOW.stage || (A._draftAt ? 'done' : ''), name = v('guideName') || v('placeName') || WOW.name;
  const left = flowMods().filter(m => statusOf(m).k !== 'done').map(m => WHAT_LEFT[m.id]).filter(Boolean), todo = left.length > 1 ? left.slice(0, -1).join(', ') + ' and ' + left[left.length - 1] : left[0];
  const say = { reading: 'Opening your listing…', writing: 'Writing your house guide, the rules and the times…' };
  if (!st) return `<small>Your guest guide</small><h1>Not started yet</h1><p>Paste your listing link first.</p><div class="row"><a class="btn primary" href="#start">Paste my link ${ARROW}</a></div>`;
  return `<small>Your guest guide</small><h1>${esc(name || 'Your guide')}</h1>
    <p class="yours-st" role="status" aria-live="polite">${st === 'done' ? CHECK : '<span class="spin dark" aria-hidden="true"></span>'}<span>${st === 'done' ? 'Your guide is written.' : esc(say[st])}</span></p>
    <p>${st === 'done' ? `We’ve prefilled your guide from your listing! ${todo ? `You now just need to ${todo} to make it yours.` : 'Tap around in the phone: this is what your guests get.'}` : 'Your photos and the details of your listing are going into it right now.'}</p>
    <div class="row">${st === 'done' ? `<a class="btn primary" href="#guide">Make it yours ${ARROW}</a>` : `<span class="btn primary" aria-disabled="true">Make it yours ${ARROW}</span>`}</div>`;
}
const yoursRefresh = () => { const el = document.getElementById('yoursTx'); if (el) el.innerHTML = yoursText(); };
function applyDraft(d){
  const D = d.draft || {}, pre = { ...(A._pre || {}) };
  for (const [k, mod] of Object.entries(DRAFT_MAP)) {
    let val = D[k]; if (val == null || val === '' || (Array.isArray(val) && !val.length)) continue;
    if (k === 'sleeps' || k === 'bedrooms' || k === 'bathrooms' || k === 'beds') val = String(val);
    const empty = Array.isArray(A[k]) ? !A[k].length : !String(A[k] ?? '').trim();
    const auto = (k === 'town' && A._townAuto && A[k] === A._townAuto) || (k === 'region' && A._regionAuto && A[k] === A._regionAuto);   // the research's town: the listing's own wins
    if (k === 'interests') {   // Beaches the research already ticked from the house's position stays beside the listing's (seaFromResearch)
      const own = (A.interests || []).filter(x => !(A._seaAuto && x === 'Beaches'));
      if (A._interestsHost || own.length) continue;
      A.interests = [...new Set([...(Array.isArray(val) ? val : [val]), ...(A._seaAuto && (A.interests || []).includes('Beaches') ? ['Beaches'] : [])])]; if (A.interests.includes('Beaches') && [].concat(val).includes('Beaches')) delete A._seaAuto;
      pre[k] = mod; continue;
    }
    if (!empty && !auto) continue;
    A[k] = val; pre[k] = mod;
  }
  // Every amenity the listing has (all of them, by Airbnb's codes, when its page was read): ticked in What the place offers.
  const am = amenFromListing(d); if (am.length && !amenNow().length) { A.amenities = am; pre.amenities = 'offers'; }
  A._pre = pre;
  // The listing's own equipment list as the page states it (fridge, hair dryer...): the guide sorts it into the rooms.
  if (Array.isArray(d.amenities) && d.amenities.length) A.listingAmenities = d.amenities.slice(0, 120);
  if (D.basis && typeof D.basis === 'object') A._basis = { ...(A._basis || {}), ...D.basis };
  // No section is switched by the listing: every guide starts with Ca La Kimberly's sections, and only the host switches one off.
  if (D.rating && !A.ratingAvg) { A.ratingAvg = String(D.rating); A._pre = { ...(A._pre || {}), ratingAvg: 'reviews' }; if (D.reviewCount) A.ratingCount = String(D.reviewCount); }
  if (Array.isArray(D.toConfirm)) A.toConfirm = D.toConfirm.slice(0, 6);
  if (d.lat && d.lng) { A.lat = d.lat; A.lng = d.lng; delete A.pos; }
  if (d.cover) A.coverUrl = d.cover;
  if (d.report) A._report = d.report;
  addListingPhotos(d);
  if (!A.radius) A.radius = '30 min';
  if (!A._slugTouched && (v('guideName') || v('placeName'))) slugAuto();
  A._draftAt = new Date().toISOString(); A._draftSource = d.source;
}
document.addEventListener('submit', e => { if (e.target.id === 'startForm') { e.preventDefault(); flush(); createDraft(); } });
document.addEventListener('input', e => { if (e.target.id === 'st_url') { const m = document.getElementById('st_urlMsg'); const p = linkProblem(e.target.value); if (m) { m.textContent = p || 'Airbnb, Booking.com or Vrbo.'; m.className = 'st-hint' + (p ? ' bad' : ''); } } });

/* ---------- Swipe: top-rated places near the house ---------- */
// Google's cards are shown live and never kept (Google's terms: a place's id may be kept, not its name, rating, photo or
// address). A swipe saves { id, d, cat, c }: the id, the host's yes or no and their comment. What the screen shows about a
// card (the card, Your picks, the phone) is read by its id from SW.mem, every card loaded in this session, in memory only.
const SW = { cat: 'todo', lists: {}, loading: false, err: '', idx: {}, mem: new Map(), live: new Map(), asking: new Map() };
// Eating and drinking is the host's own list (see "Your places"): we only suggest things to do.
const SW_CATS = [['todo', 'Attractions']];
const swipes = () => A.swipes || (A.swipes = {});
// What the research found becomes cards too, once there is an account (Yohann, 30 Oct 2026: nothing goes in the guide that
// the host has not seen). First in the deck, without the places the host already decided on or added. A card from Google
// that the research also found shows once, as the research's.
const plainName = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const samePlace = (a, b) => { const x = plainName(a), y = plainName(b); return x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x))); };
const addedPlaces = () => (Array.isArray(A.favDo) ? placeRows('favDo').map(r => r.p) : String(A.favDo || '').split(/[,\n]+/)).map(x => x.trim()).filter(Boolean);
// Markets have their own section: never a card among the attractions (the same words as /api/places).
const MARKET = /(?<!\p{L})(markets?|mercados?|mercats?|mercadillos?|mercadets?|march[ée]s?|m[äa]rkte?|mercato|mercati|markthal)(?!\p{L})/iu;
const shownText = x => (typeof x === 'string' ? x : (x && (x[UIL] || x.en || Object.values(x)[0])) || '');
// Only the cards within the host's distance (Your area): widened, the farther ones come in at once, with no search. A card
// with no distance stays, and so does one the host already decided on.
function researchCards(){
  const S = swipes(), chosen = [...Object.values(S).filter(x => !String(x.id).startsWith('r:')).map(x => (SW.mem.get(x.id) || {}).name).filter(Boolean), ...addedPlaces()], max = reachNow();
  const near = it => { const k = kmNum(it.km_from_house); return k == null || k <= max || !!S['r:' + plainName(shownText(it.name))]; };
  return (((AREA.full || {}).todo || {}).items || []).filter(it => shownText(it.name) && !MARKET.test(shownText(it.name) + ' ' + shownText(it.type)) && !chosen.some(n => samePlace(n, shownText(it.name))) && near(it)).map(it => { const name = shownText(it.name);
    return { id: 'r:' + plainName(name), name, type: shownText(it.type), km: it.km_from_house, lat: it.lat, lng: it.lng, summary: shownText(it.description),
      maps: it.gmaps || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([name, it.town].filter(Boolean).join(' ')),
      ...(it.gid ? { gid: it.gid } : {}), ...(it.icon ? { icon: it.icon } : {}) }; });
}
const moreLeft = () => researchCards().filter(p => !swipes()[p.id]).length;
// A researched card is ours (name, kind, distance, words), but its picture and rating are Google's, shown live (Yohann,
// 10 Nov 2026): asked once per id per session (/api/places?card=) when the card is on top or next, kept in SW.live with
// the deck's memory, never saved. 'wait' while asked; null when the call failed. The same answer says whether Google calls
// the place closed (12 Nov 2026, as the editor's cards: openGate in editor.js): closed, 'permanent' or 'temporary', shown on
// the card with "Google Maps" beside it, and a permanently closed card cannot be kept (swDecide). The photo, its authors and
// the rating only when there is a photo (a card with none shows its kind's icon and no rating).
function swLiveAsk(p){
  if (!p || !isOurs(p.id) || !p.gid || SW.live.has(p.gid)) return;
  SW.live.set(p.gid, 'wait');
  SW.asking.set(p.gid, fetch('/api/places?card=' + encodeURIComponent(p.gid)).then(r => r.json()).catch(() => null).then(d => {
    const closed = d && d.ok && (d.closed === 'permanent' || d.closed === 'temporary') ? d.closed : null;
    SW.live.set(p.gid, d && d.ok ? { ...(d.photo ? { photo: d.photo, photoBy: Array.isArray(d.photoBy) ? d.photoBy : [], rating: d.rating, reviews: d.reviews } : {}), closed } : null);
    SW.asking.delete(p.gid);
    // Only the card on top is drawn again (a next one is drawn when it comes up), and only the card: not the picks, whose
    // comment the host may be typing. A card held by the finger is drawn when it lets go.
    const c = document.querySelector('.sw-card');
    if (!d || !d.ok || !(d.photo || closed) || !c || c.dataset.pid !== p.id) return;
    if (c.dataset.drag || c.dataset.gone) { SW.stale = true; return; }
    swCardRefresh();
  }));
}
function swCardRefresh(count){
  const d = document.querySelector('#swipe .sw-deck'); if (!d) return;
  const keys = d.contains(document.activeElement);
  swSwap(count ? ['.sw-count', '.sw-deck', '.sw-btns'] : ['.sw-deck', '.sw-btns']);   // a closed card's buttons follow it
  if (keys) { const c = document.querySelector('#swipe .sw-card'); if (c) c.focus({ preventScroll: true }); }
}
// The card as drawn: a researched one with Google's live photo and rating when there is a photo (else its kind's icon).
const swLive = p => { const L = isOurs(p.id) && p.gid && SW.live.get(p.gid); return L && typeof L === 'object' ? { ...p, ...L } : p; };
// The guide's own colour for Things to do (the engine's green), as the phone shows it: the layout's, or the picture's.
const swKindColour = () => { const cs = colourSource(); return ((cs && PV.palSrc === cs.src && PV.palette) || PRESET_PAL[choosePreset()]).acc[3]; };
const isOurs = id => String(id).startsWith('r:');
// A decision as the screen shows it: the live card (Google's from memory, ours from the research) with the host's comment.
// A Google card not in memory (after a reload, before the deck is loaded again) is a kept place with no name, and its link.
// A researched card kept earlier keeps its own saved name.
function swShown(x){
  const p = isOurs(x.id) ? researchCards().find(r => r.id === x.id) || x : SW.mem.get(x.id);
  return p ? { ...p, c: x.c || '' } : { id: x.id, c: x.c || '', gone: true };
}
const gmLink = (words, id) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(words || 'place')}&query_place_id=${encodeURIComponent(id)}`;
const swMaps = p => p.maps || (isOurs(p.id) ? '' : gmLink(p.name, p.id));
const swList = () => { const list = SW.lists[SW.cat]; if (!list || SW.cat !== 'todo') return list; const cards = researchCards(); return swOrder([...cards, ...list.filter(p => !cards.some(c => samePlace(c.name, p.name)))]); };
// The deck's order, kept for the session (fault 3 of the acceptance test, 12 Nov 2026): the first time, the research's cards
// first, then Google's. Cards that come later (the research, a wider Your area) never take the place of the card in hand
// (the first card not decided yet): they go right after it (so the researched ones still come early), or at the end when
// every card was decided (the deck opens again). Cards that come with the deck itself (within the first second it shows,
// SW.openAt) go first, as if they had been there, and are not counted as arrivals. A Google card the research also found gives its place to the research's card, the
// same place. Decisions are kept by id, whatever the order. SW.came counts the new cards not decided yet that came to a
// deck in hand, for the count's line (swArrive).
function swOrder(base){
  const S = swipes(), by = new Map(base.map(p => [p.id, p]));
  if (!SW.seq) { SW.seq = base.map(p => p.id); return base; }
  const fresh = base.filter(p => !SW.seq.includes(p.id));
  const seq = SW.seq.map(id => { if (by.has(id)) return id; const was = SW.mem.get(id), twin = was && fresh.find(f => isOurs(f.id) && samePlace(f.name, was.name));
    if (!twin) return null; fresh.splice(fresh.indexOf(twin), 1); return twin.id; }).filter(Boolean);
  const top = seq.findIndex(id => !S[id]), first = !SW.openAt || Date.now() - SW.openAt < 1000;
  seq.splice(top < 0 ? seq.length : first ? top : top + 1, 0, ...fresh.map(p => p.id));
  if (!first) SW.came = (SW.came || 0) + fresh.filter(p => !S[p.id]).length;
  SW.seq = seq; return seq.map(id => by.get(id));
}
// New cards: the deck takes them (swArrive), Review says so, once. The deck is drawn again only when the research's cards
// changed (not at every look at the research, which redrew the host's comment field under their fingers).
function moreRefresh(){
  const sig = JSON.stringify([researchCards().map(p => p.id), !!AREA.fullOpen]);
  if (sig !== SW.rsig) { SW.rsig = sig; swArrive(); }
  const el = document.getElementById('rvMore'); if (el) el.innerHTML = moreNote();
  const n = researchCards().length; if (n && !AREA.cards && moreLeft() && !['nearby', 'send', 'building'].includes(route())) toast(`${n} more ${n === 1 ? 'place' : 'places'} in Attractions`); AREA.cards = n;
}
// Cards arriving while the deck is open: the card in hand stays (and a card held by the finger is left alone), the count's
// total changes in place and its line says for a few seconds how many came (SW_SAY ms), said once to a screen reader
// (#swSay, polite). No toast on this step: the line says it where the eye is. A finished deck opens again with them.
const SW_SAY = 5000;
function swArrive(){
  const root = document.getElementById('swipe'); if (!root) return;
  const had = !!(SW.seq && SW.lists[SW.cat]); SW.came = 0;
  const list = swList(), n = had && list ? SW.came : 0;
  if (n) {
    SW.arrived = { n, until: Date.now() + SW_SAY }; clearTimeout(SW.arrT);
    SW.arrT = setTimeout(() => { SW.arrived = null; swSwap(['.sw-count']); const s = document.getElementById('swSay'); if (s) s.textContent = ''; }, SW_SAY);
    const s = document.getElementById('swSay'); if (s) s.textContent = tr(n === 1 ? `${n} more place found near you: it comes next in the deck.` : `${n} more places found near you: they come next in the deck.`);
  }
  const c = root.querySelector('.sw-card');
  if (!c) return refreshSwipe();   // loading, or finished: drawn again
  if (c.dataset.gone) return;   // flying off: the next drawing (swDecide) has them
  if (c.dataset.drag) { SW.stale = true; swSwap(['.sw-count']); return; }   // held: the count now, the deck when it lets go
  swCardRefresh(true);
}
// Parts of the deck drawn again in place (the count's line, the deck, its buttons), nothing else: not the picks, whose
// comment the host may be typing. Parts that come or go (a deck that ends) draw the whole deck again.
function swSwap(parts){
  const root = document.getElementById('swipe'); if (!root) return;
  const t = document.createElement('div'); t.innerHTML = swipeInner();
  const pairs = parts.map(s => [root.querySelector(s), t.querySelector(s)]);
  if (pairs.some(([a, b]) => !a !== !b)) { root.innerHTML = t.innerHTML; swFitSoon(); return; }
  for (const [a, b] of pairs) if (a) a.replaceWith(b);
  swFitSoon();
}
function moreNote(){
  if (!AUTH) return ''; const left = moreLeft();
  if (left) return `<div class="rv-more"><b>${left} more ${left === 1 ? 'place' : 'places'} to look at</b><p>${left === 1 ? 'Our research found it near you. Keep it if you like it: only what you keep goes in your guide.' : 'Our research found them near you. Keep the ones you like: only those go in your guide.'}</p><a class="btn small" href="#nearby">Look at them</a></div>`;
  if (AREA.fullOpen && !researchCards().length) return `<div class="rv-more"><b>We are looking for more places near you</b><p>It takes about 2 minutes. Wait for them here, or send now: they will wait for you in your editor.</p></div>`;
  return '';
}
async function loadPlaces(cat){
  if (SW.lists[cat] || SW.loading) return;
  SW.loading = true; SW.err = ''; refreshSwipe();
  try {
    const q = new URLSearchParams({ cat, lang: (A.languages || ['en'])[0] || 'en', radius: String(({ '15 min': 6000, '30 min': 15000, '45 min': 25000, '1 hour': 30000 })[v('radius')] || 10000), want: swWant().join('|') });
    if (A.lat && A.lng) { q.set('lat', A.lat); q.set('lng', A.lng); } else q.set('town', [v('town'), v('region')].filter(Boolean).join(', '));
    const r = await fetch('/api/places?' + q); const d = await r.json();
    // No position from the listing: the town was searched on Google, whose position may be kept 30 days only. It is dated
    // (pos, as a place's), so the build looks for the town in our own sources and the weekly renewal keeps it in time.
    if (!d.ok) SW.err = d.message || 'Could not load places.'; else { SW.lists[cat] = d.places; d.places.forEach(p => SW.mem.set(p.id, p)); if (!A.lat && d.lat) { A.lat = d.lat; A.lng = d.lng; A.pos = { from: 'google', at: new Date().toISOString().slice(0, 10) }; queueSave(); } }
  } catch (e) { SW.err = 'Could not load places. Check your connection.'; }
  finally { SW.loading = false; refreshSwipe(); }
}
function swipeHTML(){
  if (window.__placesOff) return `<div class="note full"><div>We cannot search places near you right now. Add the ones you recommend below.</div></div>`;
  if (!v('town') && !A.lat) return `<div class="note full"><div>Add your town in <a href="#listing">Your listing</a> first, so we know where to look.</div></div>`;
  return `<div class="full sw" id="swipe">${swipeInner()}</div><p class="sr" id="swSay" aria-live="polite" translate="no"></p>`;
}
// The deck (docs/plan-fast-builder.md, step 5): one big card at a time, the next ones showing behind it. Drag it right to
// recommend, left to skip (it follows the finger), or use the buttons or the arrow keys. Each yes lands in the phone.
const swWant = () => [...(Array.isArray(A.interests) ? A.interests : []), ...(Array.isArray(A.guests) ? A.guests : [])];
function swipeInner(){
  const key = [v('radius'), ...swWant()].join('|'); if (SW.key !== key) { SW.key = key; SW.lists = {}; SW.seq = null; SW.openAt = 0; }   // Your area changed: the deck follows, what the host decided stays
  const list = swList(), S = swipes(), yes = Object.values(S).filter(x => x.d === 'yes').length;
  const tabs = SW_CATS.length > 1 ? `<div class="sw-tabs" role="tablist">${SW_CATS.map(([k, l]) => `<button type="button" role="tab" data-swcat="${k}" aria-selected="${k === SW.cat}">${l}</button>`).join('')}</div>` : '';
  if (!list) { if (!SW.loading && !SW.err) setTimeout(() => loadPlaces(SW.cat), 0); return tabs + `<p class="sw-count" aria-hidden="true"></p><div class="sw-empty sw-slot">${SW.err ? `<span>${esc(SW.err)}</span>` : '<span class="spin dark"></span><span>Finding the best-rated places near you…</span>'}</div>`; }
  const left = list.filter(p => !S[p.id]), seen = list.length - left.length;
  left.slice(0, 2).forEach(swLiveAsk);   // the card on top and the next one
  const p = left[0] && swLive(left[0]), kind = p && isOurs(p.id) && !p.photo;   // a researched card with no picture (yet): its kind's icon
  if (!SW.openAt) SW.openAt = Date.now();   // when the deck first showed a card or its end (swOrder)
  const closed = p && isOurs(p.id) && p.gid ? p.closed || null : null, gone = closed === 'permanent';   // Google's word, live (swLiveAsk)
  const undo = SW.last && S[SW.last] ? ' <button type="button" class="sw-undo" data-swlast="1">Undo</button>' : '';
  // Cards that just came (swArrive): for a few seconds the line says how many instead of the picks (shown, not said: #swSay says it once).
  const came = SW.arrived && SW.arrived.until > Date.now() ? SW.arrived.n : 0;
  const count = `<p class="sw-count" role="status">${came ? `<span><span>${p ? `${seen + 1} of ${list.length}` : `All ${list.length} seen`}</span> · <b class="sw-new" aria-hidden="true">${came} more ${came === 1 ? 'place' : 'places'} found</b></span>` : `${p ? `${seen + 1} of ${list.length}` : `All ${list.length} seen`} · ${yes} recommended`}${undo}</p>`;
  const card = p ? `<div class="sw-deck">${left.length > 2 ? '<i class="sw-back b2" aria-hidden="true"></i>' : ''}${left.length > 1 ? '<i class="sw-back" aria-hidden="true"></i>' : ''}
      <article class="sw-card" data-pid="${esc(p.id)}" tabindex="0" aria-label="${esc(p.name)}: arrow right to recommend, arrow left to skip">
        <div class="sw-ph${kind ? ' sw-kind' : ''}" style="${p.photo ? `background-image:url('${esc(p.photo)}')` : kind ? `--kc:${esc(swKindColour())}` : ''}">${p.photo ? '' : kind ? `<div class="sw-icw"><span class="sw-ic" data-kind="${esc(p.icon && ENG_ICON[p.icon] ? p.icon : 'todo')}" aria-hidden="true">${(p.icon && ENG_ICON[p.icon]) || ENG_TODO}</span></div>` : `<span>${esc((p.type || '').slice(0, 1))}</span>`}
          <span class="sw-stamp yes" aria-hidden="true">Recommend</span><span class="sw-stamp no" aria-hidden="true">Not for us</span>
          <div class="sw-on"><small>${esc([p.type, p.km != null ? (+p.km).toFixed(1) + ' km' : ''].filter(Boolean).join(' · '))}</small><h3>${esc(p.name)}</h3>
            <p>${closed ? `<b class="sw-closed ${closed}">${closed === 'permanent' ? 'Permanently closed' : 'Temporarily closed'}</b> · ` : ''}${p.rating ? `<span class="sw-rt"><b>★ ${p.rating.toFixed(1)}</b> ${p.reviews ? `(${p.reviews.toLocaleString()} reviews)` : ''}</span> · ` : ''}<a href="${esc(swMaps(p) || gmLink(p.name, p.id))}" target="_blank" rel="noopener" translate="no">Google Maps</a></p>${swBy(p)}</div></div>
        ${p.summary || gone ? `<div class="sw-tx">${gone ? '<p class="sw-gone">It cannot be added. If you know it is open, add it yourself by its name.</p>' : ''}${p.summary ? `<p class="sw-sum" translate="no">${esc(p.summary)}</p>` : ''}</div>` : ''}
      </article></div>
    <div class="sw-btns${gone ? ' gone' : ''}"><button type="button" class="sw-no" data-sw="no">${svg('<path d="M6 6l12 12M18 6L6 18"/>').replace('stroke-width="2.2"', 'stroke-width="2.4" width="16" height="16"')}Not for us</button><button type="button" class="sw-yes" data-sw="yes"${gone ? ' aria-disabled="true"' : ''}>${I.heart.replace('stroke-width="2.2"', 'stroke-width="2.2" width="18" height="18"')}Recommend</button></div>`
    : `<div class="sw-empty sw-slot sw-end"><span class="sw-endic" aria-hidden="true">${CHECK}</span><b>That’s all for ${esc(SW_CATS.find(c => c[0] === SW.cat)[1].toLowerCase())}.</b><span>${AUTH && AREA.fullOpen && !researchCards().length ? 'Our research is finding more: they will land here in about 2 minutes.' : 'Missing one? Add it below.'}</span></div>`;
  swFitSoon();
  const picks = Object.values(S).filter(x => x.d === 'yes' && x.cat === SW.cat).map(swShown);
  return `${tabs}${count}${card}
    ${picks.length ? `<div class="sw-picks"><b>Your picks</b>${picks.map(x => { const nm = x.gone ? 'A place you kept' : x.name, link = swMaps(x);
      return `<div class="sw-pick"><span>${esc(nm)}${link ? ` <small><a href="${esc(link)}" target="_blank" rel="noopener" translate="no">Google Maps</a></small>` : ''}</span>
      <input type="text" data-swc="${esc(x.id)}" value="${esc(x.c || '')}" placeholder="Why you love it, when to go (optional)" aria-label="${x.gone ? 'Comment on this place' : `Comment on ${esc(nm)}`}"><button type="button" class="x" data-swundo="${esc(x.id)}" aria-label="${x.gone ? 'Remove this place' : `Remove ${esc(nm)}`}">×</button></div>`; }).join('')}</div>` : ''}`;
}
// Google's rule for a photo: its authors, when Google names them, shown with it ("Photo: Ana", the name a link to their page).
// In memory only, like the rest of the card: a swipe never keeps them.
const swBy = p => p.photo && (p.photoBy || []).length ? `<p class="sw-by">Photo: ${p.photoBy.map(a => a.uri ? `<a href="${esc(a.uri)}" target="_blank" rel="noopener" translate="no">${esc(a.name)}</a>` : `<span translate="no">${esc(a.name)}</span>`).join(', ')}</p>` : '';
function refreshSwipe(){ const el = document.getElementById('swipe'); if (el) el.innerHTML = swipeInner(); }
// A card's words: two lines at most, cut after a whole word with "…", never inside one (the line-clamp of CSS may cut a
// word to fit its ellipsis). Done once the card is on the page (its width known), and again when the fonts or the width change.
function swFit(){
  for (const p of document.querySelectorAll('#swipe .sw-tx p.sw-sum')) {
    const full = p.dataset.full || (p.dataset.full = p.textContent), fits = () => p.scrollHeight <= p.clientHeight + 1;
    p.textContent = full; if (fits()) continue;
    const w = full.split(/\s+/), cut = k => w.slice(0, k).join(' ').replace(/[\s,;:.·]+$/u, '') + '…';
    let lo = 1, hi = w.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; p.textContent = cut(mid); if (fits()) lo = mid; else hi = mid - 1; }
    p.textContent = cut(lo);
  }
}
const swFitSoon = () => { clearTimeout(SW.fitT); SW.fitT = setTimeout(swFit, 0); };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(swFit);
window.addEventListener('resize', swFitSoon);
// A decision: the card flies off the way it went, the next one comes up (with the focus, for keyboard users), the phone follows.
// A yes on a researched card Google says is permanently closed (12 Nov 2026): the card comes back, a toast says why, nothing
// is saved. Its answer not known yet: asked first (at most OPEN_WAIT, the Recommend button busy), then decided; no answer
// lets the yes through.
const swBackHome = c => { c.style.transition = ''; c.style.transform = ''; c.style.opacity = ''; c.style.setProperty('--yes', 0); c.style.setProperty('--no', 0); };
function swDecide(d, c, asked){
  const id = c && c.dataset.pid, p = id && ((swList() || []).find(x => x.id === id) || SW.mem.get(id)); if (!p || c.dataset.gone) { if (c && !c.dataset.gone) { swBackHome(c); refreshSwipe(); } return; }
  if (d === 'yes' && isOurs(id) && p.gid) {
    const L = SW.live.get(p.gid);
    if (L && L.closed === 'permanent') { swBackHome(c); toast(OPEN_NO); return; }
    if ((L === 'wait' || L === undefined) && !asked) {
      if (c.dataset.busy) return; c.dataset.busy = '1'; swBackHome(c);
      const y = document.querySelector('[data-sw="yes"]'); if (y) { y.setAttribute('aria-busy', 'true'); y.disabled = true; }
      if (L === undefined) swLiveAsk(p);
      Promise.race([SW.asking.get(p.gid), new Promise(r => setTimeout(r, OPEN_WAIT))]).then(() => {
        delete c.dataset.busy; const n = document.querySelector('.sw-card'), y2 = document.querySelector('[data-sw="yes"]');
        if (y2) { y2.removeAttribute('aria-busy'); y2.disabled = false; }
        if (n && n.dataset.pid === id) swDecide(d, n, true);
      });
      return;
    }
  }
  c.dataset.gone = '1';
  // Google's card: its id and the host's decision, nothing of Google's. A researched card is ours: it keeps its name and
  // where it is (the build finds it among the research by that name), not the rating or photo Google gave it.
  swipes()[id] = { id, d, cat: SW.cat, ...(isOurs(id) ? { name: p.name, type: p.type, maps: p.maps, lat: p.lat, lng: p.lng, km: p.km } : {}) };
  SW.last = id; log('swipe', d); queueSave();
  const dir = d === 'yes' ? 1 : -1, keys = document.activeElement === c;
  c.style.transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : ''; c.style.setProperty('--' + d, 1);
  c.style.transform = `translateX(${dir * 130}%) rotate(${dir * 14}deg)`; c.style.opacity = '0';
  setTimeout(() => { refreshSwipe(); if (keys) { const n = document.querySelector('.sw-card'); if (n) n.focus({ preventScroll: true }); } }, 240);
  softRefresh(); phoneSoon();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-swcat]'); if (t) { SW.cat = t.dataset.swcat; refreshSwipe(); loadPlaces(SW.cat); return; }
  const b = e.target.closest('[data-sw]'); if (b) return swDecide(b.dataset.sw, document.querySelector('.sw-card'));
  if (e.target.closest('[data-swlast]')) { delete swipes()[SW.last]; SW.last = null; queueSave(); refreshSwipe(); softRefresh(); phoneSoon(); return; }
  const u = e.target.closest('[data-swundo]'); if (u) { const s = swipes(); delete s[u.dataset.swundo]; queueSave(); refreshSwipe(); softRefresh(); phoneSoon(); }
});
document.addEventListener('keydown', e => {
  const c = e.target.closest && e.target.closest('.sw-card'); if (!c || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
  e.preventDefault(); swDecide(e.key === 'ArrowRight' ? 'yes' : 'no', c);
});
// The drag: the card follows the finger and tilts; past 90 px it goes, short of that it comes back. Vertical moves still
// scroll the page (touch-action: pan-y), and the browser then cancels the drag.
document.addEventListener('pointerdown', e => {
  const c = e.target.closest && e.target.closest('.sw-card'); if (!c || e.button > 0 || e.target.closest('a') || c.dataset.gone) return;
  const x0 = e.clientX; let dx = 0, moved = false;
  const move = ev => {
    dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 6) return;
    if (!moved) { moved = true; c.dataset.drag = '1'; try { c.setPointerCapture(e.pointerId); } catch (er) { /* the pointer is gone */ } }
    c.style.transition = 'none'; c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    c.style.setProperty('--yes', Math.max(0, Math.min(1, dx / 90))); c.style.setProperty('--no', Math.max(0, Math.min(1, -dx / 90)));
  };
  const up = () => {
    c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
    delete c.dataset.drag;
    if (moved && Math.abs(dx) > 90) return swDecide(dx > 0 ? 'yes' : 'no', c);
    c.style.transition = ''; c.style.transform = ''; c.style.setProperty('--yes', 0); c.style.setProperty('--no', 0);
    if (SW.stale) { SW.stale = false; swCardRefresh(); }   // a picture that came while the card was held
  };
  c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
});
document.addEventListener('input', e => { const id = e.target.dataset && e.target.dataset.swc, s = id && swipes()[id]; if (s) { if (e.target.value) s.c = e.target.value; else delete s.c; queueSave(); phoneSoon(); } });


/* ---------- Host lists: places (name or link + comment) and the rubbish plan ---------- */
const DAYS7 = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
const BIN_ROWS = [['organic', 'Organic (food scraps)'], ['packaging', 'Packaging (plastic, cans)'], ['paper', 'Paper and cardboard'], ['glass', 'Glass'], ['rest', 'General waste']];
const placeRowsRaw = k => (Array.isArray(A[k]) && A[k].length ? A[k] : [{ p: '', c: '' }]);
// A row counts with a name, or with a place picked on Google and no name yet (its name is asked, else looked up at the build).
const placeRows = k => (Array.isArray(A[k]) ? A[k] : []).filter(r => r && (String(r.p || '').trim() || r.gid));
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.pl) return;
  const k = t.dataset.pl, rows = placeRowsRaw(k).map(r => ({ ...r })), r = rows[+t.dataset.i], was = r[t.dataset.f]; r[t.dataset.f] = t.value;
  if (t.dataset.f === 'p') { if (!psKeeps(k, r, was)) { delete r.gid; delete r.at; delete r.km; } if (twRow(r) && !twFold(r.p).includes(twFold(r.town))) twDrop(r); plShow(t, r); }   // another name: no longer the place picked (a town stays while its name is still in the words)
  set(k, rows);
});
document.addEventListener('click', e => {
  const add = e.target.closest('[data-pladd]'); if (add) { const k = add.dataset.pladd; set(k, [...placeRowsRaw(k), { p: '', c: '' }]); render(); return; }
  const rm = e.target.closest('[data-plrm]'); if (rm) { const k = rm.dataset.plrm, rows = placeRowsRaw(k).filter((_, i) => i !== +rm.dataset.i); set(k, rows.length ? rows : [{ p: '', c: '' }]); render(); }
});

/* ---------- A place's name, looked up on Google as the host types (the host's lists, and the places in the editor) ---------- */
// What Google suggests near the house, listed under the field so nothing is covered. Tapping one says which place it is, so a
// misspelt name still lands on the right one (Yohann, 30 Oct 2026: "llul de llebre" was not found at the build). A row keeps the
// host's own words and the place's Google id, nothing else of Google's (its terms: the id may be kept, not the name or the
// address); the worker locates it by the id and names it from our own sources. Google's name and address are shown for this
// session only, from PS.seen, in memory. A name typed and not picked, or a link, the worker searches as before.
const PS = { el: null, list: [], towns: [], on: -1, timer: 0, turn: 0, seen: new Map(), ask: new Set() };
// The host's words, with a capital to each word when they typed all in small letters ("ull de llebre": "Ull de Llebre").
const PS_SMALL = new Set('a al d de del dels des du el els en i la las le les los of the y'.split(' '));
const psWords = x => { const t = String(x || '').trim().replace(/\s+/g, ' '); return t !== t.toLowerCase() ? t : t.split(' ').map((w, i) => i && PS_SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };
const psAttrs = id => `data-gs role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}" autocomplete="off"`;
const psIsLink = x => /^(https?:|www\.)/i.test(String(x || '').trim());
const psHouse = () => (CM.on ? edF().house : A) || {};
function psDraw(){
  const el = PS.el, box = el && document.getElementById(el.getAttribute('aria-controls')); if (!box) return;
  // Our towns first (towns.js, from memory, so they are there before Google answers and stay where they are when it does),
  // "GeoNames" under them; then Google's places with "Google Maps" written at the foot of the list, as its terms ask of
  // content shown from it. One count for the keyboard: the towns, then Google's.
  const T = PS.towns, n = T.length + PS.list.length;
  box.innerHTML = T.map((t, i) => `<button type="button" role="option" class="pl-tw" id="${box.id}_${i}" data-psi="${i}" aria-selected="${i === PS.on}">${twTile(t.kind)}<span><b translate="no">${esc(t.n)}</b><small translate="no">${esc(twLine(t))}</small></span></button>`).join('')
    + (T.length ? '<span class="pl-gm pl-gn" aria-hidden="true" translate="no">GeoNames</span>' : '')
    + PS.list.map((s, j) => { const i = T.length + j; return `<button type="button" role="option" id="${box.id}_${i}" data-psi="${i}" aria-selected="${i === PS.on}"><b>${esc(s.name)}</b><small>${esc([s.where, s.km ? s.km + ' km' : ''].filter(Boolean).join(' · '))}</small></button>`; }).join('')
    + (PS.list.length ? '<span class="pl-gm" aria-hidden="true" translate="no">Google Maps</span>' : '');
  if (PS.list.length) box.dataset.g = '1'; else delete box.dataset.g;   // Google's content on screen (gLiveNow)
  box.hidden = !n; el.setAttribute('aria-expanded', String(!!n));
  if (PS.on >= 0) el.setAttribute('aria-activedescendant', `${box.id}_${PS.on}`); else el.removeAttribute('aria-activedescendant');
  gLiveSync();
}
// Google's content may not sit on screen with a map that is not Google's. The builder's phone is drawn by preview.js and has
// no map; the editor's is the guide itself, whose lists have one. So while Google's suggestions or the place just found
// (data-glive) are in view, the editor's phone shows the guide's Home, which has none, and goes back to the step's screen after.
const gLiveNow = () => [...document.querySelectorAll('.pl-sug[data-g]:not([hidden]),[data-glive]')].some(e => !e.closest('details:not([open])') && (e.checkVisibility ? e.checkVisibility() : e.getClientRects().length > 0));   // a closed card's content keeps its boxes in Chrome
function gLiveSync(){
  const s = document.getElementById('cmPhone'), f = s && s.querySelector('iframe'); if (!f) return;
  const want = gLiveNow() ? 'home' : s.dataset.screen; if (f.dataset.shown === want) return;
  f.dataset.shown = want; try { f.contentWindow.location.replace(f.src.split('#')[0] + '#' + want); } catch (e) { /* gone meanwhile */ }   // the whole address: a bare '#home' would resolve against the builder's page
}
document.addEventListener('toggle', gLiveSync, true);   // a card opened or closed shows or hides what it found
function psClose(){ clearTimeout(PS.timer); PS.turn++; PS.list = []; PS.towns = []; PS.on = -1; psDraw(); PS.el = null; }
async function psAsk(el){
  const turn = ++PS.turn, h = psHouse(), text = el.value.trim(), q = new URLSearchParams({ suggest: h.lat ? text : [text, v('town')].filter(Boolean).join(', ') });
  if (h.lat) { q.set('lat', h.lat); q.set('lng', h.lng); }
  const d = await fetch('/api/places?' + q).then(r => r.json()).catch(() => ({}));   // no answer, no list: the host just goes on typing
  if (turn === PS.turn) { PS.list = d.ok ? d.places || [] : []; if (PS.on >= PS.towns.length) PS.on = -1; psDraw(); }   // a town the keyboard is on stays chosen
}
function psType(el){
  clearTimeout(PS.timer); if (PS.el && PS.el !== el) psClose(); PS.el = el;
  PS.towns = twNow(el); PS.on = -1;   // ours, from memory: at once, also when Google fails or is not set up
  if (el.value.trim().length < 3 || psIsLink(el.value) || window.__placesOff) { PS.turn++; PS.list = []; return psDraw(); }
  psDraw();   // the towns now; Google's rows of the words before stay under them until its answer replaces them
  PS.timer = setTimeout(() => psAsk(el), 300);
}
// A pick keeps of the words typed only those that name the place (placeNameFrom, placename.js): "La Locanda dei Sapori El
// Vendrell" keeps "La Locanda dei Sapori"; a search phrase ("restaurant La Bisbal del Penedès") keeps nothing, and the field,
// empty now, asks for the name, the place found still said under it. Left empty, the build looks the name up in our directory.
const PS_ASK = 'Now type its name';
function psPick(i){
  const el = PS.el, nt = PS.towns.length;
  if (i < nt) { const t = PS.towns[i]; if (!t) return; psClose(); return twPick(t, el); }
  const s = PS.list[i - nt]; if (!s) return; psClose();
  PS.seen.set(s.id, s);
  if (el.dataset.gsp) return cmFindById(el.dataset.gsp, s.id, s, el.value);
  const k = el.dataset.pl, rows = placeRowsRaw(k).map(r => ({ ...r })), r = rows[+el.dataset.i], words = psWords(placeNameFrom(el.value, s));
  r.p = words; r.gid = s.id; delete r.at; delete r.km;   // at and km: what rows picked before 10 Nov 2026 kept of Google's
  if (!words) PS.ask.add(k + ':' + s.id);
  set(k, rows); el.value = words; el.placeholder = words ? 'Start typing the name' : PS_ASK; plShow(el, r); softRefresh(); phoneSoon();
  if (words) el.closest('.pl-row').querySelector('textarea').focus(); else el.focus();
}
// While the host types in the name field of a row picked on Google, the pick stays when the name was asked for (it was empty,
// now or after a reload: what is typed is its name, until they pick again); a row that had a name is searched again, as before.
function psKeeps(k, r, was){
  if (!r.gid || !(PS.ask.has(k + ':' + r.gid) || !String(was || '').trim())) return false;
  PS.ask.add(k + ':' + r.gid); return true;
}
// Under the name: which place it is, with "Google Maps" opening it by its id, or that it is not matched yet (not while typing:
// see theme2.css). Google's name and address only while this session remembers the pick; after a reload, that it is matched.
function plAt(r){
  if (twRow(r)) return twAt(r);
  const none = !String(r.p || '').trim() || psIsLink(r.p) || window.__placesOff;
  // No name yet (asked for, or left empty): said under the line once the host has moved on (theme2.css); the build looks it up.
  if (r.gid) { const s = PS.seen.get(r.gid), link = `<a href="${esc(gmLink(r.p, r.gid))}" target="_blank" rel="noopener" translate="no">Google Maps</a>`;
    return `<p class="pl-at ok"${s ? ' data-glive' : ''}><span aria-hidden="true">✓</span> ${s ? `<span translate="no">${esc([s.name, s.where, s.km ? s.km + ' km' : ''].filter(Boolean).join(' · '))}</span>` : 'Matched on'} ${link}${String(r.p || '').trim() ? '' : '<span class="pl-nn">No name yet: type it, or we look it up in an open directory.</span>'}</p>`; }
  return `<p class="pl-at${none ? '' : ' miss'}">${none ? '' : 'Not matched on Google. Pick it from the list, or keep it as typed: it may have no map pin.'}</p>`;
}
function plShow(el, r){ el.parentElement.querySelector('.pl-at').outerHTML = plAt(r); }
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.gs !== undefined) psType(e.target); });
document.addEventListener('focusin', e => { const t = e.target; if (!t.dataset || t.dataset.gs === undefined) return; if (twOn(t)) twLoad();
  const r = placeRowsRaw(t.dataset.pl)[+t.dataset.i] || {}; if (t.value.trim() && !r.gid && !twRow(r)) psType(t); });
document.addEventListener('focusout', e => { if (e.target === PS.el) setTimeout(() => { if (PS.el && document.activeElement !== PS.el) psClose(); }, 200); });
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.pl-sug')) e.preventDefault(); });   // the field keeps the focus, so the list stays for the click
document.addEventListener('click', e => { const o = e.target.closest && e.target.closest('[data-psi]'); if (o) psPick(+o.dataset.psi); });
document.addEventListener('keydown', e => {
  if (e.target !== PS.el) return; const n = PS.towns.length + PS.list.length;
  if (e.key === 'Escape' && n) { e.preventDefault(); e.stopPropagation(); PS.turn++; PS.list = []; PS.towns = []; psDraw(); }
  else if (e.key === 'Enter' && PS.on >= 0) { e.preventDefault(); psPick(PS.on); }
  else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); PS.on = (PS.on + (e.key === 'ArrowDown' ? 1 : n)) % n; psDraw(); }
});
/* ---------- Towns as things to do (fault 2 of the acceptance test, 12 Nov 2026) ----------
   A host who types "Barcelona" to add it was offered the airport and a company: Google's suggestions are businesses and
   sights within 50 km. The towns of Spain come from our own list (towns-es.json, GeoNames, written by src/towns.py), loaded
   once in the background the first time a field that adds a thing to do gets focus (never on page load; failing, the list
   is Google's as before), matched in memory (towns.js) and shown first, at once, at most 3. Only where a thing to do is
   added: the builder's Attractions ("Missing one? Add it below", favDo) and the editor's search field of a place in Things
   to do. A town picked is the host's own choice, like a typed place: its name (theirs to change), GeoNames' position, ours
   to keep (pos: { from: 'geonames' }, no date), the town or city kind for its icon, no Google id and no request to Google;
   the build writes it as it is (worker/host-places.mjs, ownEntries). */
const TW = { data: null, asked: null };
const twOn = el => !!el && !!el.dataset && (el.dataset.pl === 'favDo' || (!!el.dataset.gsp && PL_SEC[el.dataset.gsp.replace(/\/\d+$/, '')] === 'todo'));
function twLoad(){
  if (TW.asked) return;
  TW.asked = fetch('/towns-es.json').then(r => r.ok ? r.json() : null).then(d => { TW.data = twPrep(d);
    if (TW.data && PS.el && twOn(PS.el) && document.activeElement === PS.el) { PS.towns = twNow(PS.el); psDraw(); } })   // typed before the file came: shown now
    .catch(() => { /* no towns: Google's list as before */ });
}
const twNow = el => TW.data && twOn(el) && !psIsLink(el.value) ? twFind(TW.data, el.value, psHouse()) : [];
const twRow = r => !!r && !!r.pos && r.pos.from === 'geonames' && typeof r.lat === 'number' && typeof r.lng === 'number';
const twDrop = r => { for (const k of ['lat', 'lng', 'kind', 'town', 'province', 'pos']) delete r[k]; };
// Its kind in the guide's own words (engine/src/kinds.json, "Town or village", "City"), its province, its distance by road.
const twKindName = k => { const x = ((ENG_KINDS || {}).todo || {})[k]; return x ? x.name[UIL] || x.name.en : ''; };
const twLine = t => [twKindName(t.kind), t.prov ? tr(`${t.prov} province`) : '', t.km != null ? t.km + '\u00a0km' : ''].filter(Boolean).join(' · ');
const twTile = k => kTile(ENG_ICON[k], plColour('todo', { icon: k }), true);
const twMaps = t => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([t.n, t.prov].filter(Boolean).join(', '));   // a link, no request
// Under the name of a row that is a town: what it is, from the list we credit.
const twOf = r => ({ n: r.town, kind: r.kind, prov: r.province, km: twKm(psHouse(), r) });
const twAt = r => `<p class="pl-at ok"><span aria-hidden="true">✓</span> <span translate="no">${esc(twLine(twOf(r)))}</span> <span class="pl-cr" translate="no">GeoNames</span></p>`;
function twPick(t, el){
  if (el.dataset.gsp) return cmTownPick(el.dataset.gsp, t);
  const k = el.dataset.pl, rows = placeRowsRaw(k).map(r => ({ ...r })), r = rows[+el.dataset.i];
  delete r.gid; delete r.at; delete r.km; twDrop(r);
  Object.assign(r, { p: t.n, lat: t.lat, lng: t.lng, kind: t.kind, town: t.n, ...(t.prov ? { province: t.prov } : {}), pos: { from: 'geonames' } });
  set(k, rows); el.value = t.n; el.placeholder = 'Start typing the name'; plShow(el, r); softRefresh(); phoneSoon(); log('town', 'picked');
  el.closest('.pl-row').querySelector('textarea').focus();
}
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset || !t.dataset.plan) return;
  const k = t.dataset.plan, cur = { ...(A[k] || {}) }, s = new Set(cur[t.dataset.bin] || []); t.checked ? s.add(t.value) : s.delete(t.value);
  cur[t.dataset.bin] = DAYS7.map(d => d[0]).filter(d => s.has(d)); set(k, cur); softRefresh();
});
// How rubbish is collected decides which questions follow: drawn again once runtime.js has saved the answer (this runs first)
document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.radio === 'rubbishMode') setTimeout(() => { const y = scrollY; render(); scrollTo(0, y); }); });

/* ---------- Step 1: load the listing ---------- */
function loadListingHTML(){
  const n = uploads.filter(u => u.remote).length, got = !!A._draftAt;
  return `<div class="full ll">
    ${v('town') || START.need === 'text' ? '' : ''}
    <label for="ll_town" class="lab">Town <span class="opt">only if we cannot find it in your listing</span></label>
    <input id="ll_town" data-k="town" type="text" autocomplete="off" placeholder="The town or village of your place" value="${esc(v('town'))}" style="margin-bottom:12px">
    ${START.msg ? `<p class="st-msg ${START.need === 'retry' ? '' : 'warn'}" role="status">${esc(START.msg)}</p>` : ''}
    ${START.busy ? loadCardHTML() : `<button class="btn sun" type="button" id="loadListing">${got ? 'Load it again' : 'Load my listing'}</button>`}
    ${got && !START.busy ? reportHTML() : ''}
  </div>`;
}
function reportHTML(){
  const R = A._report || {}, f = R.found || {}, n = uploads.filter(u => u.remote).length;
  const warn = R.assistant === 'failed' ? `<p style="margin:8px 0;padding:8px 10px;border-radius:8px;background:#fdecd8;color:#7a3e10"><b>The writing assistant did not answer</b>, so we only filled in what your listing states exactly (no welcome text, no suggestions). You can press “Load it again”.<br><small style="opacity:.8">Technical detail: ${esc(R.code || 'unknown')}</small></p>` : '';
  const VIA = { page: 'We read your listing page.', reader: 'We read your listing page through a page reader, so some details may be missing.', 'page + reader': 'We read your listing page.', text: 'We used the text you pasted: photos cannot come from pasted text.' };
  const row = (ok, yes, no) => `<li style="margin:3px 0"><b style="color:${ok ? '#1f7a4a' : '#a14b1f'}">${ok ? '✓' : '✕'}</b> ${esc(ok ? yes : no)}</li>`;
  return `<div class="note" style="margin-top:12px;display:block"><div><b>Loaded.</b> ${esc(VIA[R.via] || '')} ${warn}Here is what we found and what we did not:
    <ul style="list-style:none;padding:0;margin:8px 0 0">
      ${row(n > 0, `${n} photos${R.roomsFromPage ? ', already sorted by room as on your listing' : ''}`, 'Photos: none came through. Add yours in “Rooms and photos”.')}
      ${row(!!f.counts, 'Bedrooms, bathrooms and beds', 'Bedrooms, bathrooms and beds: not found. Fill them in “About the place”.')}
      ${row(!!f.sleeping, 'Sleeping arrangements', 'Sleeping arrangements: not on your listing page. Add them in “About the place”.')}
      ${row(!!f.times, 'Check-in and check-out times', 'Check-in and check-out times: not found. Add them in “Check-in and rules”.')}
      ${row(!!f.rules, 'House rules', 'House rules: not found. Add them in “Check-in and rules”.')}
      ${row(!!f.amenities, 'What the place offers (amenities)', 'Amenities: not found. Add them in “How things work”.')}
      ${row(!!f.rating, 'Rating and number of reviews', 'Rating: not found (optional).')}
    </ul>The next steps are filled in with this: check them one by one.</div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#loadListing'); if (!b || START.busy) return; e.preventDefault(); flush(); createDraft(true); });

// Claude looks at the photos and proposes a room for each one that has none yet. The host confirms.
async function classifyPhotos(){
  const todo = uploads.filter(u => u.remote && !u.room);
  if (!todo.length) return;
  try {
    const r = await fetch('/api/photorooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photos: todo.map(u => u.src) }) });
    const d = await r.json(); if (!d.ok) return;
    todo.forEach((u, i) => { if (d.rooms[i] && !u.room) { u.room = d.rooms[i]; saveUpload(u); } });
    queueSave(); render();
  } catch (e) { /* the host can tag the rooms by hand */ }
}


/* ---------- Rooms and photos: one card per room, a viewer, and a way to start over ---------- */
function catOf(n){
  n = String(n || '').trim(); if (ROOMS.includes(n)) return n;
  const t = [[/bed|dormit|habitaci|chambre|cambra|schlafzimmer|slaapkamer/i, 'Bedroom'], [/bath|ba[ñn]o|\bbany|salle de bain|shower|toilet|\bwc\b|restroom/i, 'Bathroom'], [/kitchen|cocina|cuina|cuisine|k[üu]che|keuken/i, 'Kitchen'], [/living|lounge|sitting|sal[oó]n|\bsala\b|dining|comedor|menjador|wohnzimmer|woonkamer/i, 'Living room'], [/pool|piscin/i, 'Pool'], [/garden|yard|lawn|jard[ií]/i, 'Garden'], [/terrace|terraza|terrassa|balc[oó]n|patio|porch/i, 'Terrace'], [/office|study|work|despacho/i, 'Office'], [/laundry|utility|colada|lavander/i, 'Laundry'], [/view|vistas?\b/i, 'View'], [/exterior|outside|entrance|facade|fachada|front|parking|garaje|garage/i, 'Outside']].find(x => x[0].test(n));
  return t ? t[1] : 'Other';
}
// A.rooms keeps the order, the names and what the host wrote: [{ n: name, c: kind of room (ROOMS), t: what guests should
// know there }]. A photo belongs to a room by its name (roomLabel). A room no photo is in stays once it is in A.rooms.
const sameRoom = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const photoRoom = u => String(u.roomLabel || u.room || '').trim();
const noRoom = n => !n || n === 'Other';
const photosIn = n => uploads.filter(u => u.kind === 'photo' && sameRoom(photoRoom(u), n));
function roomsNow(){
  const out = (Array.isArray(A.rooms) ? A.rooms : []).filter(r => r && r.n).map(r => ({ ...r }));
  uploads.filter(u => u.kind === 'photo').forEach(u => { const n = photoRoom(u); if (!noRoom(n) && !out.some(r => sameRoom(r.n, n))) out.push({ n, c: u.room && u.room !== 'Other' ? u.room : catOf(n), t: '' }); });
  if (!out.length && !Array.isArray(A.rooms)) {   // no listing to read them from: the usual rooms, to start from
    const num = (k, label) => { const c = parseInt(v(k), 10); return c > 1 && c <= 12 ? Array.from({ length: c }, (_, i) => label + ' ' + (i + 1)) : [label]; };
    ['Living room', 'Kitchen', ...num('bedrooms', 'Bedroom'), ...num('bathrooms', 'Bathroom')].forEach(n => out.push({ n, c: catOf(n), t: '' }));
  }
  return out;
}
const roomsKeep = () => { A.rooms = roomsNow(); };   // before a photo leaves a room: the room stays, with its place in the order
const roomKind = n => (roomsNow().find(r => sameRoom(r.n, n)) || { c: catOf(n) }).c;
function roomChoices(){ return roomsNow().map(r => r.n); }
function setRoom(u, val){ roomsKeep(); u.roomLabel = val; u.room = val ? roomKind(val) : ''; saveUpload(u); queueSave(); }
const roomThumb = u => `<div class="thumb"><img src="${esc(srcOf(u))}" alt="${esc(u.name)}" loading="lazy" data-lbid="${u.id}"><button class="x" type="button" data-del="${u.id}" aria-label="Remove this photo">×</button></div>`;
function roomCard(r, i, all){
  const nm = esc(r.n), ph = photosIn(r.n), pend = [...pending.values()].filter(p => p.kind === 'photo' && sameRoom(p.into, r.n));
  return `<section class="rm" data-rmi="${i}" data-drop="photo" data-max="${UP.photo.max}" data-rmto="${nm}">
    <div class="rm-top"><input type="text" value="${nm}" data-rmname="${i}" aria-label="Name of this room">
      <button class="rm-mv" type="button" data-rmmove="${i}" data-dir="-1" aria-label="Move ${nm} up"${i ? '' : ' disabled'}>↑</button>
      <button class="rm-mv" type="button" data-rmmove="${i}" data-dir="1" aria-label="Move ${nm} down"${i < all - 1 ? '' : ' disabled'}>↓</button></div>
    <div class="thumbs rm-ph">${ph.map(roomThumb).join('')}${pend.map(p => `<div class="thumb pending">${p.preview ? `<img src="${p.preview}" alt="">` : ''}</div>`).join('')}
      <label class="rm-add"><input class="sr" type="file" accept="image/*" multiple data-file="photo"><span>+ Add photos</span></label></div>
    <textarea rows="2" data-rmnote="${i}" aria-label="What guests should know in ${nm}" placeholder="What guests should know here (optional)">${esc(r.t || '')}</textarea>
    ${ph.length || pend.length ? '' : `<button class="rm-del" type="button" data-rmdel="${i}">Remove this room</button>`}
  </section>`;
}
function roomsInner(){
  const list = roomsNow(), loose = uploads.filter(u => u.kind === 'photo' && noRoom(photoRoom(u)));
  return `${list.map((r, i) => roomCard(r, i, list.length)).join('')}
    ${loose.length ? `<section class="rm"><h3 class="rm-h">Not in a room yet</h3><p class="hint">Tap a photo to choose its room. Guests still see it with the photos of the house.</p><div class="thumbs rm-ph">${loose.map(roomThumb).join('')}</div></section>` : ''}
    <div class="rm-new"><input type="text" id="rmNew" placeholder="Wine cellar, attic…" aria-label="Name of a new room"><button class="btn small" type="button" id="rmAdd">Add a room</button></div>`;
}
const roomsHTML = () => `<div class="f full"><div class="rm-list" id="roomsBox">${roomsInner()}</div></div>`;
function roomsPut(list){ A.rooms = list; queueSave(); const b = document.getElementById('roomsBox'); if (b) b.innerHTML = roomsInner(); softRefresh(); phoneSoon(); }
function roomAdd(){
  const el = document.getElementById('rmNew'), n = el ? el.value.trim() : '', list = roomsNow(); if (!n) return;
  if (list.some(r => sameRoom(r.n, n))) { toast('You already have a room with that name'); return; }
  roomsPut([...list, { n, c: catOf(n), t: '' }]); const again = document.getElementById('rmNew'); if (again) again.focus();
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-rmmove],[data-rmdel],#rmAdd'); if (!b) return;
  if (b.id === 'rmAdd') return roomAdd();
  const list = roomsNow();
  if (b.dataset.rmdel) { list.splice(+b.dataset.rmdel, 1); return roomsPut(list); }
  const i = +b.dataset.rmmove, j = i + Number(b.dataset.dir); if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]]; roomsPut(list);
  const card = document.querySelector(`[data-rmi="${j}"]`); if (!card) return;
  card.scrollIntoView({ block: 'nearest' });   // the room follows the arrow, so it can go on moving
  const again = card.querySelector(`[data-rmmove][data-dir="${b.dataset.dir}"]`); if (again && !again.disabled) again.focus();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'rmNew') { e.preventDefault(); roomAdd(); } });
document.addEventListener('input', e => { const i = e.target.dataset && e.target.dataset.rmnote; if (i === undefined) return; const list = roomsNow(); list[+i].t = e.target.value; A.rooms = list; queueSave(); });
document.addEventListener('change', e => {
  const t = e.target, i = t.dataset && t.dataset.rmname; if (i === undefined) return;
  const list = roomsNow(), r = list[+i], n = t.value.trim();
  if (!n || list.some((x, k) => k !== +i && sameRoom(x.n, n))) { t.value = r.n; toast(n ? 'You already have a room with that name' : 'A room needs a name'); return; }
  photosIn(r.n).forEach(u => { u.roomLabel = n; saveUpload(u); });
  r.n = n; if (r.c === 'Other') r.c = catOf(n); roomsPut(list);
});

let LB = null;
function lbList(){ return uploads.filter(u => u.kind === 'photo'); }
function lbShow(i){
  const L = lbList(); if (!L.length) { lbClose(); return; }
  LB = { i: (i + L.length) % L.length }; const u = L[LB.i];
  let el = document.getElementById('lb');
  if (!el) { el = document.createElement('div'); el.id = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  const big = u.remote ? u.src + '?im_w=1200' : srcOf(u);
  el.innerHTML = `<div class="lbin"><button type="button" class="lbx" data-lb="close" aria-label="Close">×</button>
    <div class="lbimg"><button type="button" class="lbn" data-lb="prev" aria-label="Previous photo">‹</button><img src="${esc(big)}" alt="${esc(u.name)}"><button type="button" class="lbn" data-lb="next" aria-label="Next photo">›</button></div>
    <div class="lbbar"><span>${LB.i + 1} of ${L.length}</span>
    <select data-room="${u.id}" aria-label="Room for this photo"><option value="">No room</option>${roomChoices().map(r => `<option${sameRoom(photoRoom(u), r) ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>
    <button type="button" class="btn small" data-lb="del">Remove this photo</button></div></div>`;
}
function lbClose(){ const el = document.getElementById('lb'); if (el) el.remove(); LB = null; }
(function(){
  if (document.getElementById('lbCss')) return; const st = document.createElement('style'); st.id = 'lbCss'; st.textContent = `
#lb{position:fixed;inset:0;background:rgba(15,15,15,.88);z-index:9999;display:grid;place-items:center;padding:12px}
#lb .lbin{width:min(920px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;position:relative}
#lb .lbimg{display:flex;align-items:center;gap:8px;justify-content:center}
#lb img{max-width:100%;max-height:68vh;border-radius:10px;object-fit:contain;flex:1;min-width:0}
#lb .lbn{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:#fff;font-size:26px;cursor:pointer}
#lb .lbx{position:absolute;right:0;top:-4px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;font-size:24px;cursor:pointer;z-index:2}
#lb .lbbar{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;color:#fff}
#lb .lbbar select{padding:8px 10px;border-radius:8px;font-size:15px;color:#111;background:#fff;border:0}
.thumb img{cursor:zoom-in}
.resetrow{margin-top:18px;padding-top:14px;border-top:1px solid var(--line);text-align:center}
.resetrow p{margin:6px 0 0;font-size:13px;opacity:.7}`; document.head.appendChild(st);
})();
document.addEventListener('click', e => {
  const im = e.target.closest && e.target.closest('.thumb img');
  if (im) { const i = lbList().findIndex(u => u.id === im.dataset.lbid); if (i >= 0) lbShow(i); return; }
  const b = e.target.closest && e.target.closest('[data-lb]');
  if (b && LB) {
    const a = b.dataset.lb, L = lbList();
    if (a === 'close') lbClose(); else if (a === 'prev') lbShow(LB.i - 1); else if (a === 'next') lbShow(LB.i + 1);
    else if (a === 'del') { const u = L[LB.i], x = u && document.querySelector('button[data-del="' + u.id + '"]'); if (x) x.click(); setTimeout(() => lbShow(Math.min(LB ? LB.i : 0, lbList().length - 1)), 150); }
    return;
  }
  if (e.target.id === 'lb') lbClose();
  const r = e.target.closest && e.target.closest('#resetAll,.resetTop');
  if (r) {
    if (!r.dataset.armed) { r.dataset.armed = '1'; r.textContent = 'Click again to erase everything'; setTimeout(() => { if (r.isConnected) { delete r.dataset.armed; r.textContent = 'Start over'; } }, 5000); return; }
    resetAll();
  }
});
document.addEventListener('keydown', e => { if (!LB) return; if (e.key === 'Escape') lbClose(); else if (e.key === 'ArrowLeft') lbShow(LB.i - 1); else if (e.key === 'ArrowRight') lbShow(LB.i + 1); });
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.room && t.closest('#lb')) setTimeout(render, 0); });
async function resetAll(){
  window.__resetting = true; clearTimeout(saveTimer);
  try { await acctReset(); } catch (e) {}
  try { localStorage.removeItem(KEY); } catch (e) {}
  try { for (const u of await idb.all()) await idb.del(u.id); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  location.hash = ''; location.reload();
}

/* ---------- Version stamp, tiny, so you can tell which build you are looking at ---------- */
(function(){
  const st = document.createElement('style'); st.textContent = '#ver{text-align:center;font-size:10px;opacity:.45;padding:18px 0 96px;letter-spacing:.02em}'; document.head.appendChild(st);
  // "Start over" is at the end of Review and send (#resetAll): a floating copy sat on top of the step bar.
  const d = document.createElement('div'); d.id = 'ver'; d.textContent = 'Last updated __BUILD__'; document.body.appendChild(d);
})();

/* ---------- The "Places nearby" search needs a Google key on our side. Without it the step keeps only the fields to add places by hand. ---------- */
fetch('/api/places?probe=1').then(r => r.json()).then(d => { if (!d.ok) { window.__placesOff = true; render(); } }).catch(() => {});

/* ---------- One-screen steps (The look, Places nearby): a slim header, the step's own card, the note box, and the phone,
   beside them from 1240 px (in the column's own grid, so it stays in view). Only The look keeps the phone on smaller
   screens, pinned above its choices. ---------- */
function slimStep(m, lead, card, cls){
  const s = statusOf(m);
  return `<div class="split has-phone slim-step ${cls}">${railHTML(m.id)}<div class="col">
    <section class="mhead slim" style="${tileVars(m)}"><div class="row1"><h1>${esc(m.title)}</h1><span class="pill ${s.k}">${s.k === 'done' ? CHECK : ''}${esc(s.label)}</span></div>
      <p>${esc(lead)}</p></section>
    <aside class="side-phone" aria-label="Your guide, as guests will see it">${phoneHTML()}<p>Your guide, live, as guests see it</p></aside>
    ${card}
</div></div>`;
}
const nearbyHTML = m => slimStep(m, 'Museums, parks, karting, sights. Swipe right on the ones you recommend.', `<section class="card nb-card"><div class="grid">${m.fields.map(field).join('')}</div></section>`, 'nearby-page');

/* ---------- Only you know (docs/plan-fast-builder.md, step 6): Wi-Fi, arrival, rubbish and contacts on one screen.
   Each part is ticked once answered and can wait; the phone shows the part being filled in. Rubbish opens its details
   once the host says how it is collected. ---------- */
const KN = { screen: '' };
const KNOWN_HINT = { wifi: 'Guests see it in the guide and join with one tap, from a QR code. Your guest network is best, if you have one.', arrival: 'For guests who arrive in the dark. No door codes here: send those privately.',
  rubbish: 'How it is collected and, for bins at the house, which day each one is emptied.', contacts: 'Numbers guests can call. We add 112, the nearest hospital and pharmacy.' };
const knownParts = () => MODULES.filter(p => p.part === 'known' && (!p.sec || secOn(p.sec))).map(p => ({ id: p.id, title: p.title, icon: p.icon, hint: KNOWN_HINT[p.id] || p.lead, screen: STEP_SCREEN[p.id] || 'home',
  fields: p.fields.filter(k => k !== 'wifiNote' && (p.id !== 'rubbish' || k === 'rubbishMode' || filled('rubbishMode'))), done: ANSWERED[p.id] || (() => false) }));
const knTick = p => p.done() ? `<span class="kn-ok">${CHECK}Done</span>` : '';
function knownHTML(m){
  return slimStep(m, m.lead, `<section class="card kn-card">${knownParts().map(p => `<div class="kn-part" data-part="${p.id}" data-screen="${p.screen}">
      <div class="kn-hd"><span class="kn-ic" aria-hidden="true">${I[p.icon] || ''}</span><h2>${esc(p.title)}</h2><span class="kn-tick" id="kn_${p.id}">${knTick(p)}</span></div>
      <p class="hint">${esc(p.hint)}</p><div class="grid">${p.fields.map(field).join('')}</div></div>`).join('')}</section>`, 'known-page');
}
function knownTicks(){ for (const p of knownParts()) { const el = document.getElementById('kn_' + p.id); if (el) el.innerHTML = knTick(p); } }
// The phone shows the part being filled in: the Wi-Fi card, the way in, the bins, the numbers.
document.addEventListener('focusin', e => {
  const part = e.target.closest && e.target.closest('[data-part]'); if (!part || !document.getElementById('phoneFrame')) return;
  if (KN.screen !== part.dataset.screen) { KN.screen = PHONE.screen = part.dataset.screen; PHONE.build = false; phoneRender(); }
});

/* ---------- The look on one screen (docs/plan-fast-builder.md, step 4) ----------
   The cover, the layout, the colours and the logo, each already chosen for the host: one tap changes one, and the phone
   shows it at once. On wide screens the phone sits next to the choices; on smaller ones it stays pinned above them.
   The cover: one of the listing's photos (its own cover by default), the host's own picture, one drawn from the colours,
   or an artistic version of the chosen picture (drawn by the guide builder: the same "cover-art" job and progress bar as
   in the editor, so it needs the account). ---------- */
const obOwnCover = () => uploads.find(u => u.kind === 'cover');
const obSized = u => u + (u.includes('?') ? '' : '?im_w=480');
function lookHTML(m){
  setTimeout(() => { lookPaint(); const x = document.querySelector('.lk-strip [aria-pressed="true"]'); if (x) { const st = x.parentElement, r = x.getBoundingClientRect(), q = st.getBoundingClientRect(); if (r.right > q.right) st.scrollLeft += r.left - q.left - 8; } });   // the drawn cover's colours, once the phone knows them; the cover chosen in view
  return slimStep(m, 'Already chosen for you. Tap anything to change it.', `<section class="card lk-card" id="lookCard">${lookCardHTML()}</section>`, 'look-page');
}
const lookSectionsHTML = () => `<div class="lk-row"><div class="lk-hd"><b>What goes in your guide</b></div><p class="hint">Switch off what you do not need: its step here and its tile in the guide go too.</p>${sectionPicker()}</div>`;
const lookCardHTML = () => lookCoverHTML() + lookLayoutHTML() + lookColoursHTML() + lookLogoHTML() + lookSectionsHTML()
  + ((A._done || {}).look ? '<div class="row"><button class="btn small" type="button" data-undone="look">Mark as not done</button></div>' : '');
// After a choice: the choices and the phone are drawn again, not the page, so the phone, the photo strip and the focus stay put.
async function lookRefresh(){
  const c = document.getElementById('lookCard'); if (!c) return render();
  const id = document.activeElement && document.activeElement.id, x = c.querySelector('.lk-strip'), sx = x ? x.scrollLeft : 0;
  c.innerHTML = lookCardHTML();
  const y = c.querySelector('.lk-strip'); if (y) y.scrollLeft = sx;
  if (id) { const el = document.getElementById(id); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
  softRefresh(); PHONE.build = false; await phoneRender(); lookPaint();
}
const lookPalVars = p => `--a1:${p.acc[0]};--a2:${p.acc[1]};--a3:${p.acc[2]};--a4:${p.acc[3]};--pp:${p.paper};--pi:${p.ink}`;
async function lookPaint(){ const d = document.querySelector('.lk-drawn'); if (d) d.style.cssText = lookPalVars(await phonePalette(choosePreset())); }
const lookArtOpen = () => !!(CM.artOpen || CM.artJob || CM.artRes || CM.artErr || CM.artWords != null);
function lookCoverHTML(){
  const own = obOwnCover(), drawn = !own && A.coverChoice === 'drawn', cur = String(A.coverUrl || '').split('?')[0];
  const pics = [...new Set([cur, ...(A.listingPhotos || [])].filter(p => typeof p === 'string' && /^https:/.test(p)).map(p => p.split('?')[0]))].slice(0, 18);
  const shown = own ? srcOf(own) : !drawn && cur ? obSized(cur) : '';
  return `<div class="lk-row"><div class="lk-hd"><b id="l_cover">Cover picture</b></div><p class="hint">Use one of your photos as it is, or have a new one drawn from it.</p>
    <div class="lk-strip" role="group" aria-labelledby="l_cover">
      <label class="lk-pic lk-up"><input class="sr" type="file" accept="image/*" data-obcoverfile="1"><b aria-hidden="true">+</b><small>Your own</small></label>
      <button type="button" class="lk-pic lk-drawn" id="lk_drawn" data-coverchoice="drawn" aria-pressed="${drawn}" aria-label="A cover drawn from the colours" style="${lookPalVars(PRESET_PAL[choosePreset()])}">${PV_ART}<small>Drawn</small></button>
      ${own ? `<span class="lk-pic lk-own"><img src="${esc(srcOf(own))}" alt="Your own picture, the cover now"><button class="lk-x" type="button" data-del="${own.id}" aria-label="Remove your picture">×</button></span>` : ''}
      ${pics.map((p, i) => `<button type="button" class="lk-pic" id="lk_pic${i}" data-obcover="${esc(p)}" aria-pressed="${!own && !drawn && p === cur}" aria-label="Use this photo as the cover"><img src="${esc(obSized(p))}" alt="" loading="lazy"></button>`).join('')}
    </div>${shown ? `<div class="lk-artrow"><span>Want something unique? We redraw the photo you picked as an artwork.</span><button class="btn small" type="button" id="lk_art" data-lkart="1" aria-expanded="${lookArtOpen()}">Make it artistic</button></div>` : ''}${shown && lookArtOpen() ? lookArtHTML(shown) : ''}</div>`;
}
function lookArtHTML(shown){
  const g = window.__acctGuide && window.__acctGuide(), busy = !!CM.artJob;
  return `<div class="cm-art"><div class="cm-arthd"><img src="${esc(shown)}" alt=""><span><b>An artistic version of this picture</b><small>“Do it for me” makes an artistic rendering of the house, in the picture’s own colours.</small></span></div>
      ${!g ? '<div class="cm-row"><span class="hint">The drawing is made for your account, so it comes after you save your guide.</span><button class="btn small primary" type="button" data-acctnow="signup">Save my guide</button></div>' : `<div class="cm-row"><button class="btn small primary" type="button" data-obart="auto"${busy ? ' disabled' : ''}>Do it for me</button><button class="btn small" type="button" data-obart="words"${busy ? ' disabled' : ''}>With my own words</button></div>
      ${CM.artWords != null ? `<div class="f full"><label for="ob_artw">How should it look?</label><textarea id="ob_artw" rows="2" placeholder="A watercolour in soft blues, like an old travel poster">${esc(CM.artWords)}</textarea><div class="cm-row"><button class="btn small primary" type="button" data-obart="draw"${busy ? ' disabled' : ''}>Draw it</button></div></div>` : ''}
      ${busy ? progBar('art', 'Drawing your cover') : ''}
      ${CM.artRes ? `<figure class="cm-artres"><img src="${esc(CM.artRes.url)}" alt="Your artistic cover"><figcaption class="cm-row"><button class="btn small primary" type="button" data-obartuse="1">Use this cover</button><button class="btn small" type="button" data-obart="again"${busy ? ' disabled' : ''}>Try again</button></figcaption></figure>` : ''}
      ${CM.artErr ? `<p class="hint cm-err">${esc(CM.artErr)}</p>` : ''}`}</div>`;
}
// The layouts as small pictures of a guide's home; none picked means Big colour tiles, the guides' default (preview.js choosePreset).
function lookLayoutHTML(){
  const cur = choosePreset();
  return `<div class="lk-row"><div class="lk-hd"><b id="l_mood">Layout</b></div>
    <div class="moods lk-moods" role="radiogroup" aria-labelledby="l_mood">${MOODS.filter(x => x.n).map(x => `<label class="mood" title="${esc(x.d)}"><input type="radio" id="lk_mood_${x.id}" name="mood" data-radio="mood" value="${x.id}"${x.id === cur ? ' checked' : ''}><div class="box"><div class="mock ${x.cls}">${'<i></i>'.repeat(x.n)}</div><b>${esc(x.name)}</b></div></label>`).join('')}</div></div>`;
}
// Colours: the layout's own (its colours as dots), or those of the cover picture or the logo (that picture, small). A choice
// whose picture is gone falls back to the layout's own, as the build does.
function lookColoursHTML(){
  const logo = uploads.find(u => u.kind === 'logo'), own = obOwnCover(), cur = String(A.coverUrl || '').split('?')[0];
  const pics = { cover: own ? srcOf(own) : /^https:/.test(cur) ? obSized(cur) : '', logo: logo ? srcOf(logo) : '' };
  const k = colorsFromKind(), on = pics[k] ? k : 'look';
  const opts = [['look', 'The colours of the layout', 'The layout’s own'], ['cover', 'From my cover picture', 'From the cover'], ['logo', 'From my logo', 'From my logo']].filter(([id]) => id === 'look' || pics[id]);
  return `<div class="lk-row lk-in"><div class="lk-hd"><b id="l_colorsFrom">Colours</b></div>
    <div class="chips lk-cols" role="radiogroup" aria-labelledby="l_colorsFrom">${opts.map(([id, val, label]) => `<label class="chip"><input type="radio" id="lk_cf_${id}" name="colorsFrom" data-radio="colorsFrom" value="${esc(val)}"${on === id ? ' checked' : ''}><span>${id === 'look' ? `<i class="lk-dots" aria-hidden="true">${PRESET_PAL[choosePreset()].acc.map(c => `<i style="background:${c}"></i>`).join('')}</i>` : `<img src="${esc(pics[id])}" alt="">`}${esc(label)}</span></label>`).join('')}</div></div>`;
}
function lookLogoHTML(){
  const logo = uploads.find(u => u.kind === 'logo'), adding = [...pending.values()].some(p => p.kind === 'logo');
  return `<div class="lk-row lk-in"><div class="lk-hd"><b>Your logo</b></div>
    <div class="lk-logo">${logo ? `<img src="${esc(srcOf(logo))}" alt="Your logo"><button class="btn small" type="button" data-del="${logo.id}">Remove</button>`
      : `<span data-drop="logo" data-max="1"><label class="btn small"><input class="sr" type="file" accept="image/*" data-file="logo">${adding ? 'Adding your logo' : 'Add your logo'}</label></span>`}
      <small>Optional. On the welcome card, and the app icon on guests’ phones.</small></div></div>`;
}
async function obDropCovers(){ for (const u of uploads.filter(x => x.kind === 'cover')) { try { await idb.del(u.id); } catch (e) { /* gone from memory anyway */ } } uploads = uploads.filter(x => x.kind !== 'cover'); }
document.addEventListener('change', async e => {
  const t = e.target;
  // A layout or colours choice: the dots and the drawn cover follow it (after runtime.js has saved the answer)
  if (t.dataset && /^(mood|colorsFrom)$/.test(t.dataset.radio || '') && !CM.on && route() === 'look') return setTimeout(lookRefresh);
  if (!t.dataset || !t.dataset.obcoverfile || !t.files.length) return;
  const f = [...t.files]; t.value = ''; await obDropCovers(); delete A.coverChoice; addFiles('cover', f, 1);
});
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-coverchoice],[data-obcover],[data-obart],[data-obartuse],[data-lkart]'); if (!b) return;
  if (b.dataset.lkart) { const open = !lookArtOpen(); CM.artOpen = open; if (!open && !CM.artJob) { CM.artWords = null; CM.artErr = ''; CM.artRes = null; } return lookRefresh(); }
  // the host's own picture always wins in the guide (generate-site.py), so choosing another cover lets it go
  if (b.dataset.coverchoice) { await obDropCovers(); A.coverChoice = b.dataset.coverchoice; queueSave(); return lookRefresh(); }
  if (b.dataset.obcover) { await obDropCovers(); A.coverUrl = b.dataset.obcover; A.coverChoice = 'listing'; queueSave(); return lookRefresh(); }
  if (b.dataset.obartuse && CM.artRes) {   // the drawing becomes the host's own cover picture, already in the guide's storage
    const g = window.__acctGuide && window.__acctGuide(); if (!g) return;
    await obDropCovers();
    const rec = { id: CM.artRes.path.split('/').pop().replace(/\.jpg$/, ''), kind: 'cover', name: 'Artistic cover.jpg', room: '', path: g.id + '/' + CM.artRes.path, url: CM.artRes.url, createdAt: new Date().toISOString() };
    uploads.push(rec); await saveUpload(rec); CM.artRes = null; CM.artOpen = false; queueSave(); toast('Your new cover is set'); return lookRefresh();
  }
  const k = b.dataset.obart, g = window.__acctGuide && window.__acctGuide(); if (!g) return;
  if (k === 'words') { CM.artWords = CM.artWords || ''; await lookRefresh(); const x = document.getElementById('ob_artw'); if (x) x.focus(); return; }
  let words = null;
  if (k === 'draw') { words = ((document.getElementById('ob_artw') || {}).value || '').trim(); CM.artWords = words; if (!words) return toast('Say how it should look first.'); }
  if (k === 'again') words = CM.artLast;
  // the picture to redraw: the host's own (sent to the guide's storage first) or the listing photo
  const own = obOwnCover(), cur = String(A.coverUrl || '').split('?')[0];
  try {
    if (own && !own.path) { CM.artJob = { status: 'queued', since: Date.now() }; render(); await window.__acctSendOne(own); }
    const src = own ? `${SB.url}/storage/v1/object/public/guide-assets/${own.path}` : cur;
    artStart(src, words, g.id);
  } catch (err) { CM.artJob = null; CM.artErr = 'Your picture could not be sent: ' + niceError(err); render(); }
});

/* ---------- Rubbish: the containers guests can use, each with a description, an optional map link and what it takes ---------- */
// Older answers had one free-text "Where are the containers?": it becomes the first row.
const containerRows = () => Array.isArray(A.rubbishSpots) && A.rubbishSpots.length ? A.rubbishSpots : [{ w: v('rubbishWhere'), m: '', t: [] }];
function containersHTML(k, head, hint){
  const rows = containerRows();
  return `<div class="f full" id="ct_${k}"><span class="lab">${head}</span>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}<div class="ctl">${rows.map((r, i) => `<div class="ct-row">
    <textarea data-ct="${i}" data-f="w" rows="2" placeholder="Where: at the end of the lane, 100 m left of the gate" aria-label="Where containers ${i + 1} are">${esc(r.w || '')}</textarea>
    <input type="url" data-ct="${i}" data-f="m" value="${esc(r.m || '')}" placeholder="Google Maps link (optional)" aria-label="Map link for containers ${i + 1}" inputmode="url">
    <div class="chips" role="group" aria-label="What containers ${i + 1} take">${BIN_ROWS.map(([id, lab]) => `<button type="button" class="chip" data-ctt="${i}" data-id="${id}" aria-pressed="${(r.t || []).includes(id)}"><span>${esc(lab)}</span></button>`).join('')}</div>
    ${rows.length > 1 ? `<button type="button" class="btn small" data-ctrm="${i}">Remove this place</button>` : ''}</div>`).join('')}</div>
    <button type="button" class="btn small" data-ctadd="1">+ Add another place with containers</button></div>`;
}
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || t.dataset.ct === undefined) return;
  const rows = containerRows().map(r => ({ ...r })); rows[+t.dataset.ct][t.dataset.f] = t.value; set('rubbishSpots', rows);
});
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('[data-ctt],[data-ctadd],[data-ctrm]'); if (!c) return;
  const rows = containerRows().map(r => ({ ...r, t: [...(r.t || [])] }));
  if (c.dataset.ctadd) rows.push({ w: '', m: '', t: [] });
  else if (c.dataset.ctrm !== undefined) rows.splice(+c.dataset.ctrm, 1);
  else { const r = rows[+c.dataset.ctt], id = c.dataset.id; r.t = r.t.includes(id) ? r.t.filter(x => x !== id) : [...r.t, id]; }
  set('rubbishSpots', rows.length ? rows : [{ w: '', m: '', t: [] }]); render();
});
(function(){ const st = document.createElement('style'); st.textContent = '.ctl{display:flex;flex-direction:column;gap:12px;margin-bottom:10px}.ct-row{display:flex;flex-direction:column;gap:8px;background:var(--sunk);border-radius:var(--r-s);padding:12px}.ct-row .btn{align-self:flex-start}.ct-row button.chip{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}.ct-row .chip[aria-pressed=true] span{background:var(--ink);border-color:var(--ink);color:var(--paper)}.ct-row .chip:focus-visible span{outline:3px solid var(--focus);outline-offset:2px}'; document.head.appendChild(st); })();
