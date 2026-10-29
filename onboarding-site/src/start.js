/* ---------- Start: one link, a first version of everything ----------
   The host pastes their listing link (and the town if we cannot read it). The site's assistant writes
   a first version of every step; the host then only reviews. If the link is wrong or unreadable,
   we say exactly what to do instead. */
const LINK_OK = [/^https?:\/\/([a-z]{2,3}\.)?(www\.)?airbnb\.[a-z.]+\/(rooms\/(plus\/)?\d+|h\/[\w-]+)/i, /^https?:\/\/(www\.)?abnb\.me\/\S+/i,
  /^https?:\/\/(www\.)?booking\.com\/hotel\/[a-z]{2}\/[\w-]+/i, /^https?:\/\/(www\.)?vrbo\.com\/(\d+|[\w-]+\/\d+)/i];
const linkProblem = u => { u = (u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) return 'Paste the full address, starting with https://'; return LINK_OK.some(rx => rx.test(u)) ? '' : 'This is not a listing page. Open your listing and copy the address from the browser bar: it looks like airbnb.com/rooms/12345678.'; };
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
  guideName: 'guide', tagline: 'guide', welcome: 'guide', guests: 'guide', checkIn: 'stay', checkOut: 'stay', houseRules: 'stay', checkoutTasks: 'stay',
  amenities: 'howto', howTos: 'howto', arrival: 'arrival', interests: 'area', navStyle: 'look', feelWords: 'look' };

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
      <input id="st_url" data-k="listingUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.airbnb.com/rooms/…" value="${esc(v('listingUrl'))}">
      <p class="st-hint${lp ? ' bad' : ''}" id="st_urlMsg">${esc(lp || 'Airbnb, Booking.com or Vrbo.')}</p>
      <label for="st_town">Town <span class="opt">if we cannot find it in your listing</span></label>
      <input id="st_town" data-k="town" type="text" autocomplete="off" placeholder="The town or village of your place" value="${esc(v('town'))}">
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
const listingAsk = body => fetch('/api/listing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
async function createDraft(fromStep){
  const url = v('listingUrl').trim(), text = v('listingText').trim(), town = v('town').trim();
  const lp = linkProblem(url);
  if (lp) { START.msg = lp; START.need = 'link'; render(); return; }
  if (!url && text.length < 200) { START.msg = 'Paste your listing link, or the text of your listing.'; START.need = url ? 'text' : 'link'; render(); return; }
  START.busy = true; START.msg = ''; START.step = 0; LOAD.t0 = Date.now(); LOAD.est = 60; log('draft_start', 'start');
  WOW.stage = 'reading'; WOW.name = ''; PHONE.screen = 'home'; PHONE.build = true; location.hash = '#yours'; render();
  const back = (need, msg) => { START.need = need; START.msg = msg; WOW.stage = ''; location.hash = fromStep ? '#listing' : '#start'; };
  try {
    let d = await listingAsk({ url, text, town, stage: 'page' });
    if (!d.ok) { log('draft_fail', d.need || 'error'); return back(d.need || 'text', d.message); }
    if (d.stage === 'page') {   // the page is read: show the house, then let Claude write the rest from what was read
      applyEarly(d); WOW.stage = 'writing'; yoursRefresh(); phoneRender();
      d = await listingAsk({ url, text, town, stage: 'write', src: d.src });
      if (!d.ok) { log('draft_fail', d.need || 'error'); return back(d.need || 'retry', d.message); }
    }
    applyDraft(d); log('draft_ok', d.source); classifyPhotos();
    A._done = { ...(A._done || {}), listing: true }; START.need = ''; START.msg = '';
    WOW.stage = 'done'; PHONE.build = true; yoursRefresh(); phoneRender();
  } catch (e) { back('retry', 'We could not reach the assistant. Check your connection and press the button again.'); }
  finally { START.busy = false; queueSave(); if (WOW.stage !== 'done' || route() !== 'yours') render(); }
}
// What the listing page says, before Claude: its name (for the phone only, Claude writes the real one), its photos,
// cover, rating and position.
function applyEarly(d){
  // The listing's own title (before " - Houses for rent..."), cut at a "|" when long: the host recognises it at once.
  let nm = String(d.pageTitle || '').split(/\s[-–]\s/)[0].trim();
  while (nm.length > 40 && nm.includes(' | ')) nm = nm.slice(0, nm.lastIndexOf(' | ')).trim();
  WOW.name = nm || String(d.title || '').split('·')[0].trim();
  if (d.cover) A.coverUrl = d.cover;
  if (d.lat && d.lng) { A.lat = d.lat; A.lng = d.lng; }
  addListingPhotos(d);
}
function addListingPhotos(d){
  if (!Array.isArray(d.photos)) return;
  A.listingPhotos = d.photos;
  // The listing's own photos become the first photos of the house guide, each with the room we could tell from its caption.
  const have = uploads.filter(u => u.kind === 'photo');
  if (have.some(u => u.remote)) return;
  const room = r => ROOMS.includes(r) ? r : '';
  d.photos.slice(0, Math.max(0, 16 - have.length)).forEach((src, i) => {
    const cap = (d.photoCaps || [])[i] || '';
    const rec = { id: newId(), kind: 'photo', remote: true, src, name: cap || 'Listing photo ' + (i + 1), room: room((d.photoRooms || [])[i]), roomLabel: (cap && cap.length <= 30) ? cap : '', url: src + '?im_w=720', createdAt: new Date(Date.now() + i).toISOString() };
    uploads.push(rec); saveUpload(rec);
  });
}
// The wow page.
function yoursHTML(){
  return `<section class="yours"><div class="yours-tx" id="yoursTx">${yoursText()}</div><div class="yours-ph">${phoneHTML()}</div></section>`;
}
function yoursText(){
  const st = WOW.stage || (A._draftAt ? 'done' : ''), name = v('guideName') || v('placeName') || WOW.name;
  const ready = readyMods().filter(m => statusOf(m).k === 'done').length, left = flowMods().filter(m => statusOf(m).k !== 'done').length;
  const say = { reading: 'Opening your listing…', writing: 'Writing your house guide, the rules and the times…' };
  if (!st) return `<small>Your guest guide</small><h1>Not started yet</h1><p>Paste your listing link first.</p><div class="row"><a class="btn primary" href="#start">Paste my link ${ARROW}</a></div>`;
  return `<small>Your guest guide</small><h1>${esc(name || 'Your guide')}</h1>
    <p class="yours-st" role="status" aria-live="polite">${st === 'done' ? CHECK : '<span class="spin dark" aria-hidden="true"></span>'}<span>${st === 'done' ? 'Your guide is written.' : esc(say[st])}</span></p>
    <p>${st === 'done' ? `${ready} step${ready === 1 ? ' is' : 's are'} ready from your listing${left ? `, and ${left === 1 ? 'one needs' : left + ' need'} you` : ''}. Tap around in the phone: this is what your guests get.` : 'Your photos and the details of your listing are going into it right now.'}</p>
    <div class="row">${st === 'done' ? `<a class="btn primary" href="#look">Make it yours ${ARROW}</a>` : `<span class="btn primary" aria-disabled="true">Make it yours ${ARROW}</span>`}</div>`;
}
const yoursRefresh = () => { const el = document.getElementById('yoursTx'); if (el) el.innerHTML = yoursText(); };
function applyDraft(d){
  const D = d.draft || {}, pre = { ...(A._pre || {}) };
  for (const [k, mod] of Object.entries(DRAFT_MAP)) {
    let val = D[k]; if (val == null || val === '' || (Array.isArray(val) && !val.length)) continue;
    if (k === 'sleeps' || k === 'bedrooms' || k === 'bathrooms' || k === 'beds') val = String(val);
    if (k === 'amenities') val = val.filter(x => AMEN.includes(x));
    const empty = Array.isArray(A[k]) ? !A[k].length : !String(A[k] ?? '').trim();
    if (!empty) continue;
    A[k] = val; pre[k] = mod;
  }
  A._pre = pre;
  // The listing's own equipment list as the page states it (fridge, hair dryer...): the guide sorts it into the rooms.
  if (Array.isArray(d.amenities) && d.amenities.length) A.listingAmenities = d.amenities.slice(0, 120);
  if (D.basis && typeof D.basis === 'object') A._basis = { ...(A._basis || {}), ...D.basis };
  if (D.sections && typeof D.sections === 'object') {
    const map = { wifi: 'wifi', rubbish: 'rubbish', markets: 'markets', eat: 'eat', todo: 'todo', events: 'events' };
    const cur = Object.fromEntries(SECTIONS.map(s => [s.id, secOn(s.id)]));
    for (const [k, id] of Object.entries(map)) if (typeof D.sections[k] === 'boolean' && !(A.modules && id in A.modules)) cur[id] = D.sections[k];
    A.modules = { ...cur, ...(A.modules || {}) };
  }
  if (D.rating && !A.ratingAvg) { A.ratingAvg = String(D.rating); A._pre = { ...(A._pre || {}), ratingAvg: 'reviews' }; if (D.reviewCount) A.ratingCount = String(D.reviewCount); }
  if (Array.isArray(D.toConfirm)) A.toConfirm = D.toConfirm.slice(0, 6);
  if (d.lat && d.lng) { A.lat = d.lat; A.lng = d.lng; }
  if (d.cover) A.coverUrl = d.cover;
  if (d.report) A._report = d.report;
  addListingPhotos(d);
  if (!A._slugTouched && (v('guideName') || v('placeName'))) A.slug = cleanSlug(v('guideName') || v('placeName'));
  A._draftAt = new Date().toISOString(); A._draftSource = d.source;
}
document.addEventListener('submit', e => { if (e.target.id === 'startForm') { e.preventDefault(); flush(); createDraft(); } });
document.addEventListener('input', e => { if (e.target.id === 'st_url') { const m = document.getElementById('st_urlMsg'); const p = linkProblem(e.target.value); if (m) { m.textContent = p || 'Airbnb, Booking.com or Vrbo.'; m.className = 'st-hint' + (p ? ' bad' : ''); } } });

/* ---------- Swipe: top-rated places near the house ---------- */
const SW = { cat: 'todo', lists: {}, loading: false, err: '', idx: {} };
// Eating and drinking is the host's own list (see "Your places"): we only suggest things to do.
const SW_CATS = [['todo', 'Things to do']];
const swipes = () => A.swipes || (A.swipes = {});
async function loadPlaces(cat){
  if (SW.lists[cat] || SW.loading) return;
  SW.loading = true; SW.err = ''; refreshSwipe();
  try {
    const q = new URLSearchParams({ cat, lang: (A.languages || ['en'])[0] || 'en', radius: String(({ '15 min': 6000, '30 min': 15000, '45 min': 25000, '1 hour': 30000 })[v('radius')] || 10000) });
    if (A.lat && A.lng) { q.set('lat', A.lat); q.set('lng', A.lng); } else q.set('town', [v('town'), v('region')].filter(Boolean).join(', '));
    const r = await fetch('/api/places?' + q); const d = await r.json();
    if (!d.ok) SW.err = d.message || 'Could not load places.'; else { SW.lists[cat] = d.places; if (!A.lat && d.lat) { A.lat = d.lat; A.lng = d.lng; queueSave(); } }
  } catch (e) { SW.err = 'Could not load places. Check your connection.'; }
  finally { SW.loading = false; refreshSwipe(); }
}
function swipeHTML(){
  if (window.__placesOff) return `<div class="note full"><div>We cannot search places near you right now. Add the ones you recommend below.</div></div>`;
  if (!v('town') && !A.lat) return `<div class="note full"><div>Add your town in <a href="#listing">Your listing</a> first, so we know where to look.</div></div>`;
  return `<div class="full sw" id="swipe">${swipeInner()}</div>`;
}
// The deck (docs/plan-fast-builder.md, step 5): one big card at a time, the next ones showing behind it. Drag it right to
// recommend, left to skip (it follows the finger), or use the buttons or the arrow keys. Each yes lands in the phone.
function swipeInner(){
  const list = SW.lists[SW.cat], S = swipes(), yes = Object.values(S).filter(x => x.d === 'yes').length;
  const tabs = SW_CATS.length > 1 ? `<div class="sw-tabs" role="tablist">${SW_CATS.map(([k, l]) => `<button type="button" role="tab" data-swcat="${k}" aria-selected="${k === SW.cat}">${l}</button>`).join('')}</div>` : '';
  if (!list) { if (!SW.loading && !SW.err) setTimeout(() => loadPlaces(SW.cat), 0); return tabs + `<div class="sw-empty">${SW.err ? esc(SW.err) : '<span class="spin dark"></span> Finding the best-rated places near you…'}</div>`; }
  const left = list.filter(p => !S[p.id]), p = left[0], seen = list.length - left.length;
  const undo = SW.last && S[SW.last] ? ' <button type="button" class="sw-undo" data-swlast="1">Undo</button>' : '';
  const count = `<p class="sw-count" role="status">${p ? `${seen + 1} of ${list.length}` : `All ${list.length} seen`} · ${yes} recommended${undo}</p>`;
  const card = p ? `<div class="sw-deck">${left.length > 2 ? '<i class="sw-back b2" aria-hidden="true"></i>' : ''}${left.length > 1 ? '<i class="sw-back" aria-hidden="true"></i>' : ''}
      <article class="sw-card" data-pid="${esc(p.id)}" tabindex="0" aria-label="${esc(p.name)}: arrow right to recommend, arrow left to skip">
        <div class="sw-ph" style="${p.photo ? `background-image:url('${esc(p.photo)}')` : ''}">${p.photo ? '' : `<span>${esc((p.type || '').slice(0, 1))}</span>`}
          <span class="sw-stamp yes" aria-hidden="true">Recommend</span><span class="sw-stamp no" aria-hidden="true">Not for us</span>
          <div class="sw-on"><small>${esc([p.type, p.km != null ? (+p.km).toFixed(1) + ' km' : ''].filter(Boolean).join(' · '))}</small><h3>${esc(p.name)}</h3>
            <p><b>★ ${p.rating ? p.rating.toFixed(1) : '?'}</b> ${p.reviews ? `(${p.reviews.toLocaleString()} reviews)` : ''} · <a href="${esc(p.maps)}" target="_blank" rel="noopener">Google Maps</a></p></div></div>
        ${p.summary ? `<div class="sw-tx"><p>${esc(p.summary)}</p></div>` : ''}
      </article></div>
    <div class="sw-btns"><button type="button" class="sw-no" data-sw="no">${svg('<path d="M6 6l12 12M18 6L6 18"/>').replace('stroke-width="2.2"', 'stroke-width="2.4" width="16" height="16"')}Not for us</button><button type="button" class="sw-yes" data-sw="yes">${I.heart.replace('stroke-width="2.2"', 'stroke-width="2.2" width="18" height="18"')}Recommend</button></div>`
    : `<div class="sw-empty"><b>That’s all for ${esc(SW_CATS.find(c => c[0] === SW.cat)[1].toLowerCase())}.</b> Missing one? Add it below.</div>`;
  const picks = Object.values(S).filter(x => x.d === 'yes' && x.cat === SW.cat);
  return `${tabs}${count}${card}
    ${picks.length ? `<div class="sw-picks"><b>Your picks</b>${picks.map(x => `<div class="sw-pick"><span>${esc(x.name)} <small>★ ${x.rating ? (+x.rating).toFixed(1) : ''}</small></span>
      <input type="text" data-swc="${esc(x.id)}" value="${esc(x.c || '')}" placeholder="Why you love it, when to go (optional)" aria-label="Comment on ${esc(x.name)}"><button type="button" class="x" data-swundo="${esc(x.id)}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join('')}</div>` : ''}`;
}
function refreshSwipe(){ const el = document.getElementById('swipe'); if (el) el.innerHTML = swipeInner(); }
// A decision: the card flies off the way it went, the next one comes up (with the focus, for keyboard users), the phone follows.
function swDecide(d, c){
  const id = c && c.dataset.pid, p = id && (SW.lists[SW.cat] || []).find(x => x.id === id); if (!p || c.dataset.gone) return;
  c.dataset.gone = '1';
  swipes()[id] = { id, d, cat: SW.cat, name: p.name, rating: p.rating, reviews: p.reviews, type: p.type, maps: p.maps, lat: p.lat, lng: p.lng, km: p.km, photo: p.photo, c: '' };
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
    if (!moved) { moved = true; try { c.setPointerCapture(e.pointerId); } catch (er) { /* the pointer is gone */ } }
    c.style.transition = 'none'; c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    c.style.setProperty('--yes', Math.max(0, Math.min(1, dx / 90))); c.style.setProperty('--no', Math.max(0, Math.min(1, -dx / 90)));
  };
  const up = () => {
    c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
    if (moved && Math.abs(dx) > 90) return swDecide(dx > 0 ? 'yes' : 'no', c);
    c.style.transition = ''; c.style.transform = ''; c.style.setProperty('--yes', 0); c.style.setProperty('--no', 0);
  };
  c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
});
document.addEventListener('input', e => { const id = e.target.dataset && e.target.dataset.swc; if (id && swipes()[id]) { swipes()[id].c = e.target.value; queueSave(); phoneSoon(); } });


/* ---------- Host lists: places (name or link + comment) and the rubbish plan ---------- */
const DAYS7 = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
const BIN_ROWS = [['organic', 'Organic (food scraps)'], ['packaging', 'Packaging (plastic, cans)'], ['paper', 'Paper and cardboard'], ['glass', 'Glass'], ['rest', 'General waste']];
const placeRowsRaw = k => (Array.isArray(A[k]) && A[k].length ? A[k] : [{ p: '', c: '' }]);
const placeRows = k => (Array.isArray(A[k]) ? A[k] : []).filter(r => r && String(r.p || '').trim());
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.pl) return;
  const k = t.dataset.pl, rows = placeRowsRaw(k).map(r => ({ ...r })); rows[+t.dataset.i][t.dataset.f] = t.value; set(k, rows);
});
document.addEventListener('click', e => {
  const add = e.target.closest('[data-pladd]'); if (add) { const k = add.dataset.pladd; set(k, [...placeRowsRaw(k), { p: '', c: '' }]); render(); return; }
  const rm = e.target.closest('[data-plrm]'); if (rm) { const k = rm.dataset.plrm, rows = placeRowsRaw(k).filter((_, i) => i !== +rm.dataset.i); set(k, rows.length ? rows : [{ p: '', c: '' }]); render(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset || !t.dataset.plan) return;
  const k = t.dataset.plan, cur = { ...(A[k] || {}) }, s = new Set(cur[t.dataset.bin] || []); t.checked ? s.add(t.value) : s.delete(t.value);
  cur[t.dataset.bin] = DAYS7.map(d => d[0]).filter(d => s.has(d)); set(k, cur); softRefresh();
});
document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.radio === 'rubbishMode') { const y = scrollY; render(); scrollTo(0, y); } });

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
      ${row(n > 0, `${n} photos${R.roomsFromPage ? ', already sorted by room as on your listing' : ''}`, 'Photos: none came through. Add yours in “Photos by room”.')}
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


/* ---------- Photos by room: names that match the tiles, a viewer, and a way to start over ---------- */
function catOf(n){
  n = String(n || '').trim(); if (ROOMS.includes(n)) return n;
  const t = [[/bed/i, 'Bedroom'], [/bath|shower|toilet|wc|restroom/i, 'Bathroom'], [/living|lounge|sitting|salon/i, 'Living room'], [/kitchen|dining/i, 'Kitchen'], [/pool/i, 'Pool'], [/garden|yard|lawn/i, 'Garden'], [/terrace|balcon|patio|porch/i, 'Terrace'], [/office|study|work/i, 'Office'], [/laundry|utility/i, 'Laundry'], [/view/i, 'View'], [/exterior|outside|entrance|facade|front|parking/i, 'Outside']].find(x => x[0].test(n));
  return t ? t[1] : 'Other';
}
function roomChoices(cur){
  const num = (k, label) => { const c = parseInt(v(k), 10); return c > 1 && c <= 12 ? Array.from({ length: c }, (_, i) => label + ' ' + (i + 1)) : [label]; };
  const base = [];
  ROOMS.forEach(r => { if (r === 'Bedroom') base.push(...num('bedrooms', 'Bedroom')); else if (r === 'Bathroom') base.push(...num('bathrooms', 'Bathroom')); else if (r !== 'Other') base.push(r); });
  uploads.filter(u => u.remote && u.roomLabel).forEach(u => { if (!base.some(b => b.toLowerCase() === u.roomLabel.toLowerCase())) base.push(u.roomLabel); });
  const c = cur && (cur.roomLabel || cur.room);
  if (c && c !== 'Other' && !base.some(b => b.toLowerCase() === c.toLowerCase())) base.push(c);
  base.push('Other'); return base;
}
function setRoom(u, val){ u.roomLabel = val; u.room = val ? catOf(val) : ''; saveUpload(u); queueSave(); }

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
    <select data-room="${u.id}" aria-label="Room for this photo"><option value="">Room…</option>${roomChoices(u).map(r => `<option${(u.roomLabel || u.room) === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>
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
  if (im) { const th = im.closest('.thumb'), sel = th && th.querySelector('select[data-room]'); const L = lbList(); const i = sel ? L.findIndex(u => u.id === sel.dataset.room) : -1; if (i >= 0) lbShow(i); return; }
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
    <section class="card" style="padding-block:16px">${noteBox(m.id)}</section></div></div>`;
}
const nearbyHTML = m => slimStep(m, 'Swipe right on the ones you would send a friend to.', `<section class="card nb-card"><div class="grid">${m.fields.map(field).join('')}</div></section>`, 'nearby-page');

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
const lookCardHTML = () => lookCoverHTML() + lookLayoutHTML() + lookColoursHTML() + lookLogoHTML()
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
  return `<div class="lk-row"><div class="lk-hd"><b id="l_cover">Cover picture</b>${shown ? `<button class="btn small" type="button" id="lk_art" data-lkart="1" aria-expanded="${lookArtOpen()}">Make it artistic</button>` : ''}</div>
    <div class="lk-strip" role="group" aria-labelledby="l_cover">
      <label class="lk-pic lk-up"><input class="sr" type="file" accept="image/*" data-obcoverfile="1"><b aria-hidden="true">+</b><small>Your own</small></label>
      <button type="button" class="lk-pic lk-drawn" id="lk_drawn" data-coverchoice="drawn" aria-pressed="${drawn}" aria-label="A cover drawn from the colours" style="${lookPalVars(PRESET_PAL[choosePreset()])}">${PV_ART}<small>Drawn</small></button>
      ${own ? `<span class="lk-pic lk-own"><img src="${esc(srcOf(own))}" alt="Your own picture, the cover now"><button class="lk-x" type="button" data-del="${own.id}" aria-label="Remove your picture">×</button></span>` : ''}
      ${pics.map((p, i) => `<button type="button" class="lk-pic" id="lk_pic${i}" data-obcover="${esc(p)}" aria-pressed="${!own && !drawn && p === cur}" aria-label="Use this photo as the cover"><img src="${esc(obSized(p))}" alt="" loading="lazy"></button>`).join('')}
    </div>${shown && lookArtOpen() ? lookArtHTML(shown) : ''}</div>`;
}
function lookArtHTML(shown){
  const g = window.__acctGuide && window.__acctGuide(), busy = !!CM.artJob;
  return `<div class="cm-art"><div class="cm-arthd"><img src="${esc(shown)}" alt=""><span><b>An artistic version of this picture</b><small>“Do it for me” makes an artistic rendering of the house, in the picture’s own colours.</small></span></div>
      ${!g ? '<p class="hint">Log in first: the drawing is made for your account.</p>' : `<div class="cm-row"><button class="btn small primary" type="button" data-obart="auto"${busy ? ' disabled' : ''}>Do it for me</button><button class="btn small" type="button" data-obart="words"${busy ? ' disabled' : ''}>With my own words</button></div>
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
