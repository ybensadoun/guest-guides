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
async function createDraft(fromStep){
  const url = v('listingUrl').trim(), text = v('listingText').trim(), town = v('town').trim();
  const lp = linkProblem(url);
  if (lp) { START.msg = lp; START.need = 'link'; render(); return; }
  if (!url && text.length < 200) { START.msg = 'Paste your listing link, or the text of your listing.'; START.need = url ? 'text' : 'link'; render(); return; }
  START.busy = true; START.msg = ''; START.step = 0; render(); log('draft_start', 'start');
  const tick = setInterval(() => { START.step = Math.min(STEPS_MSG.length - 1, START.step + 1); const e = document.getElementById('stStep'); if (e) e.textContent = STEPS_MSG[START.step]; }, 4500);
  try {
    const r = await fetch('/api/listing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, text, town }) });
    const d = await r.json();
    if (!d.ok) { START.need = d.need || 'text'; START.msg = d.message; log('draft_fail', d.need || 'error'); return; }
    applyDraft(d); log('draft_ok', d.source); classifyPhotos();
    A._done = { ...(A._done || {}), listing: true }; START.need = ''; START.msg = '';
    location.hash = fromStep ? '#place' : '#home'; toast('Your first version is ready');
  } catch (e) { START.need = 'retry'; START.msg = 'We could not reach the assistant. Check your connection and press the button again.'; }
  finally { clearInterval(tick); START.busy = false; queueSave(); render(); }
}
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
  if (Array.isArray(d.photos)) {
    A.listingPhotos = d.photos;
    // The listing's own photos become the first photos of the house guide, each with the room we could tell from its caption.
    const have = uploads.filter(u => u.kind === 'photo');
    if (!have.some(u => u.remote)) {
      const room = r => ROOMS.includes(r) ? r : '';
      d.photos.slice(0, Math.max(0, 16 - have.length)).forEach((src, i) => {
        const cap = (d.photoCaps || [])[i] || '';
        const rec = { id: newId(), kind: 'photo', remote: true, src, name: cap || 'Listing photo ' + (i + 1), room: room((d.photoRooms || [])[i]), url: src + '?im_w=720', createdAt: new Date(Date.now() + i).toISOString() };
        uploads.push(rec); saveUpload(rec);
      });
    }
  }
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
  if (!v('town') && !A.lat) return `<div class="note full"><div>Add your town in <a href="#listing">Your listing</a> first, so we know where to look.</div></div>`;
  return `<div class="full sw" id="swipe">${swipeInner()}</div>`;
}
function swipeInner(){
  const list = SW.lists[SW.cat];
  const S = swipes();
  const yes = Object.values(S).filter(x => x.d === 'yes').length;
  const tabs = `<div class="sw-tabs" role="tablist">${SW_CATS.map(([k, l]) => `<button type="button" role="tab" data-swcat="${k}" aria-selected="${k === SW.cat}">${l}</button>`).join('')}</div>`;
  if (!list) { if (!SW.loading && !SW.err) setTimeout(() => loadPlaces(SW.cat), 0); return tabs + `<div class="sw-empty">${SW.err ? esc(SW.err) : '<span class="spin dark"></span> Finding the best-rated places near you…'}</div>`; }
  const left = list.filter(p => !S[p.id]);
  const p = left[0];
  const done = list.length - left.length;
  const card = p ? `<article class="sw-card" data-pid="${esc(p.id)}">
      <div class="sw-ph" style="${p.photo ? `background-image:url('${esc(p.photo)}')` : ''}">${p.photo ? '' : `<span>${esc((p.type || '').slice(0, 1))}</span>`}</div>
      <div class="sw-tx"><small>${esc([p.type, p.km != null ? (+p.km).toFixed(1) + ' km' : ''].filter(Boolean).join(' · '))}</small><h3>${esc(p.name)}</h3>
        <p class="sw-meta"><b>★ ${p.rating ? p.rating.toFixed(1) : '?'}</b> ${p.reviews ? `(${p.reviews.toLocaleString()} reviews)` : ''} ${p.price ? '· ' + esc(String(p.price).replace('PRICE_LEVEL_', '').toLowerCase().replace('_', ' ')) : ''}</p>
        ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}<a href="${esc(p.maps)}" target="_blank" rel="noopener">See on Google Maps</a></div>
      <div class="sw-btns"><button type="button" class="sw-no" data-sw="no">Not for us</button><button type="button" class="sw-yes" data-sw="yes">${I.heart.replace('stroke-width="2.2"', 'stroke-width="2.2" width="18" height="18"')}Recommend</button></div>
    </article>` : `<div class="sw-empty"><b>That’s all for ${esc(SW_CATS.find(c => c[0] === SW.cat)[1].toLowerCase())}.</b> Missing a favourite? Add it in <a href="#favourites">Your places</a>.</div>`;
  const picks = Object.values(S).filter(x => x.d === 'yes' && x.cat === SW.cat);
  return `${tabs}<p class="sw-count">${done} of ${list.length} seen · ${yes} recommended in total</p>${card}
    ${picks.length ? `<div class="sw-picks"><b>Your picks here</b>${picks.map(x => `<div class="sw-pick"><span>${esc(x.name)} <small>★ ${x.rating ? (+x.rating).toFixed(1) : ''}</small></span>
      <input type="text" data-swc="${esc(x.id)}" value="${esc(x.c || '')}" placeholder="Why you love it, what to order (optional)" aria-label="Comment on ${esc(x.name)}"><button type="button" class="x" data-swundo="${esc(x.id)}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join('')}</div>` : ''}`;
}
function refreshSwipe(){ const el = document.getElementById('swipe'); if (el) el.innerHTML = swipeInner(); }
document.addEventListener('click', e => {
  const t = e.target.closest('[data-swcat]'); if (t) { SW.cat = t.dataset.swcat; refreshSwipe(); loadPlaces(SW.cat); return; }
  const b = e.target.closest('[data-sw]'); if (b) {
    const c = b.closest('.sw-card'), id = c.dataset.pid, p = (SW.lists[SW.cat] || []).find(x => x.id === id); if (!p) return;
    swipes()[id] = { id, d: b.dataset.sw, cat: SW.cat, name: p.name, rating: p.rating, reviews: p.reviews, type: p.type, maps: p.maps, lat: p.lat, lng: p.lng, km: p.km, photo: p.photo, c: '' };
    log('swipe', b.dataset.sw); queueSave(); c.classList.add(b.dataset.sw === 'yes' ? 'go-yes' : 'go-no'); setTimeout(refreshSwipe, 220); softRefresh(); return;
  }
  const u = e.target.closest('[data-swundo]'); if (u) { const s = swipes(); delete s[u.dataset.swundo]; queueSave(); refreshSwipe(); }
});
document.addEventListener('input', e => { const id = e.target.dataset && e.target.dataset.swc; if (id && swipes()[id]) { swipes()[id].c = e.target.value; queueSave(); } });


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
    <button class="btn sun" type="button" id="loadListing"${START.busy ? ' disabled' : ''}>${START.busy ? `<span class="spin" aria-hidden="true"></span> <span id="stStep">${esc(STEPS_MSG[START.step])}</span>` : got ? 'Load it again' : 'Load my listing'}</button>
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
