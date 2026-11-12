/* ---------- State (public version: everything stays on this device until Send) ---------- */
let A = {}, uploads = [], sid = '';
const pending = new Map();
const KEY = 'porta-onboarding-v1';
const v = k => A[k] ?? '';
// part: shown inside another step (Wi-Fi, arrival, rubbish and contacts are in "Only you know"); off: dropped (Your style)
const visible = () => MODULES.filter(m => !m.part && !m.off && (!m.sec || secOn(m.sec)));   // "Places nearby" stays without the search: hosts can still add places by hand
const filled = k => { if (k === 'source') return hasSource(); if (k === 'slug') return !slugProblem(v('slug')); if (k.startsWith('upload:')) return uploads.some(u => u.kind === k.slice(7)); const x = A[k]; return Array.isArray(x) ? x.length > 0 : !!String(x ?? '').trim(); };
const missingOf = m => m.need.filter(k => !filled(k));
const NAME = k => k.startsWith('upload:') ? (UP[k.slice(7)] || {}).label : (Q[k] || {}).label;
// Two kinds of step (docs/plan-fast-builder.md). FLOW: what only the host can tell us, in the order they meet it, from the
// listing to Send; Next and the count follow it. Bars and restaurants are on it: they are hand-picked, never searched
// (Yohann, 29 Oct 2026: too much noise on Google Maps to choose for the host). Every other step is filled in from the listing: ready without pressing
// anything, there to check if they like.
const FLOW = ['listing', 'guide', 'look', 'area', 'nearby', 'favourites', 'nightlife', 'known'];   // Nightlife only when the host switched it on (visible). Your area comes before the deck it steers (Yohann, 30 Oct 2026).
const needsYou = m => FLOW.includes(m.id);
const flowMods = () => FLOW.map(id => visible().find(m => m.id === id)).filter(Boolean);
const readyMods = () => visible().filter(m => !needsYou(m));
// A step that needs the host counts as done once they answered it (or pressed Done). The look has no answer of its own:
// its defaults are good, but the host confirms it.
const ANSWERED = { listing: () => !!A._draftAt || (!!A._skipStart && hasSource()), guide: () => (A._seen || []).includes('guide') && !slugProblem(v('slug')) && filled('languages'), area: () => filled('interests'), nearby: () => Object.keys(A.swipes || {}).length > 0 || placeRows('favDo').length > 0,
  favourites: () => placeRows('favEat').length > 0 || filled('localTips'),
  nightlife: () => placeRows('favNight').length > 0,
  wifi: () => filled('wifiName') && filled('wifiPassword'), arrival: () => filled('arrival'), rubbish: () => filled('rubbishMode'), contacts: () => filled('taxi'),
  known: () => knownParts().every(p => p.id === 'contacts' || p.done()) };   // the taxi is optional
// Something in this step came from the listing (or is there): only then is it "Ready". Sections are always chosen for them.
const hasContent = m => preKeys(m).length > 0 || m.fields.some(k => filled(k.startsWith('up:') ? 'upload:' + k.slice(3) : k));
function statusOf(m){
  const miss = missingOf(m).length, seen = (A._seen || []).includes(m.id), done = !!(A._done || {})[m.id];
  if (!needsYou(m)) {
    if (miss) return { k: seen ? 'chk' : 'new', label: `${miss} to do`, miss };
    if (!A._draftAt && !done && !seen) return { k:'new', label:'Start', miss };   // filled step by step: nothing from a listing yet
    if (!done && !hasContent(m)) return { k:'new', label:'Optional', miss };      // the listing said nothing here
    return done || seen ? { k:'done', label:'Checked', miss } : { k:'pre', label:'Review', miss };   // not looked at yet: not finished, however good it is
  }
  if (done && !miss) return { k:'done', label:'Done', miss };
  if (preKeys(m).length && !seen) return { k:'pre', label:'Check', miss };   // the listing said it: the host only checks
  if (!miss && ANSWERED[m.id] && ANSWERED[m.id]()) return { k:'done', label:'Done', miss };
  if (m.id === 'known' && knownParts().some(p => p.done())) return { k:'chk', label: `${knownParts().filter(p => p.done()).length} of ${knownParts().length} done`, miss };
  if (seen) return { k:'chk', label: miss ? `${miss} to do` : 'Later', miss };
  return { k:'new', label:'Needs you', miss };
}
// Where the builder opens: the first step that still needs the host, else Review and send.
const obNext = () => (flowMods().find(m => statusOf(m).k !== 'done') || { id: 'send' }).id;
// Only the listing, the town and a free web address are needed to send. Everything else is a first version to review, or optional.
const sendMissing = () => [...(hasSource() ? [] : ['Your listing link or text']), ...(v('town') ? [] : ['The town']), ...(slugProblem(v('slug')) ? ['A free web address'] : []), ...(A.consent ? [] : ['The consent box'])];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- The guide's web address: a common part (this site) plus the host's own part ---------- */
const BASE = location.host || 'porta-guides.netlify.app';
const GUIDES_AT = BASE + '/g';   // where guests open a guide; BASE alone is the preview on this device
const cleanSlug = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40);
const autoSlug = () => cleanSlug(v('guideName') || v('placeName')).replace(/-+$/, '');
// Is it free? Other hosts' guides are private, so the database answers (slug_check, which also holds the reserved words):
// free or not, with up to three free ones near it. An address the host did not type moves to the first of them by itself,
// so they never meet the problem; one they typed stays theirs to change. The unique index keeps the last word at Publish.
let SLUG = { for: '', free: null, options: [] }, slugTimer = null;
const slugTaken = () => SLUG.for === v('slug') && SLUG.free === false;
const slugProblem = x => !x ? 'Choose an address' : x.length < 3 ? 'At least 3 letters' : /-$/.test(x) ? 'Cannot end with a dash' : x === SLUG.for && SLUG.free === false ? 'Already taken' : '';
function slugAuto(){ A.slug = autoSlug(); slugLater(); }
function slugLater(){ clearTimeout(slugTimer); slugTimer = setTimeout(slugAsk, 350); }
async function slugAsk(){
  clearTimeout(slugTimer);
  const s = v('slug'), auto = !A._slugTouched;
  if (!s || /-$/.test(s) || (s.length < 3 && !auto)) return;
  try {
    const r = await sb('/rest/v1/rpc/slug_check', { method: 'POST', token: SB.key, body: { p_wanted: s, p_town: cleanSlug(v('town')).replace(/-+$/, '') || null, p_guide: GUIDE ? GUIDE.id : null } });
    if (v('slug') !== s) return;   // they typed on: the newer question answers
    SLUG = { for: s, free: !!r.free, options: r.options || [] };
    if (!r.free && auto && SLUG.options[0]) { SLUG = { for: SLUG.options[0], free: true, options: [] }; set('slug', SLUG.for); }
  } catch (e) { if (v('slug') === s) SLUG = { for: s, free: null, options: [] }; }   // no answer: Publish still refuses a taken address
  slugCheck(); softRefresh(); refreshSend();
}
function slugNoteHTML(){
  const s = v('slug'), pr = slugProblem(s);
  if (slugTaken()) return `<p class="hint err">${SLUG.options.length ? 'Already taken. These are free:' : 'Already taken. Try another one.'}</p>${SLUG.options.length ? `<div class="slugopts">${SLUG.options.map(o => `<button class="slugopt" type="button" data-slug="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}`;
  if (pr) return `<p class="hint err">${esc(pr)}</p>`;
  if (s !== SLUG.for) return '<p class="hint">Checking that it is free…</p>';
  return `<p class="hint okc">${!A._slugTouched && s !== autoSlug() ? `${esc(autoSlug())} was taken, so we chose this one. ` : ''}Your guests will open ${esc(GUIDES_AT)}/${esc(s)}</p>`;
}
function slugCheck(){ const e = document.getElementById('slugNote'); if (!e) return; e.innerHTML = slugNoteHTML(); const i = document.getElementById('f_slug'); if (i && i.value !== v('slug')) i.value = v('slug'); }

/* ---------- Device and walkthrough (so each person can be compared by device) ---------- */
function device(){
  const ua = navigator.userAgent || '', w = screen.width, h = screen.height;
  const touch = (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && touch) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const browser = /EdgA?\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const short = Math.min(w, h);
  const type = os === 'iPad' || (touch && short >= 600) ? 'tablet' : touch && short < 600 ? 'phone' : 'desktop';
  return { type, os, browser, screen: `${w}x${h}`, viewport: `${innerWidth}x${innerHeight}`, dpr: devicePixelRatio || 1, touch,
    lang: navigator.language || '', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '', dark: matchMedia('(prefers-color-scheme: dark)').matches, ua };
}
const deviceLine = d => `${d.type} · ${d.os} · ${d.browser} · ${d.viewport}`;
function log(e, m, extra){
  const L = A._log || (A._log = []);
  L.push({ t: Date.now(), e, ...(m ? { m } : {}), ...(extra || {}) });
  if (L.length > 600) L.splice(0, L.length - 600);
}
// Time spent per module: from opening it until the next event (gaps over 10 minutes count as a break).
function journey(){
  const L = A._log || [], per = {}, order = [];
  for (let i = 0; i < L.length; i++) {
    const x = L[i]; if (x.e !== 'open') continue;
    if (order[order.length - 1] !== x.m) order.push(x.m);
    const next = L[i + 1]; const dt = next ? Math.min(next.t - x.t, 10 * 60e3) : 0;
    per[x.m] = (per[x.m] || 0) + dt;
  }
  const active = Object.values(per).reduce((a, b) => a + b, 0);
  const first = L[0] ? L[0].t : Date.now();
  return { order, secondsPerModule: Object.fromEntries(Object.entries(per).map(([k, x]) => [k, Math.round(x / 1000)])),
    activeMinutes: Math.round(active / 6e4), spanHours: Math.round((Date.now() - first) / 36e5 * 10) / 10,
    sessions: (A._sessions || []).length, devicesUsed: [...new Set((A._sessions || []).map(s => s.d))] };
}

/* ---------- Saving on this device ---------- */
let saveTimer = null;
function setSave(state, text){ const el = $('#saveState'); if (!el) return; el.innerHTML = `<span class="sdot ${state}"></span><span>${esc(text)}</span>`; }
function queueSave(){ A._savedAt = Date.now(); setSave('busy','Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 400); }
function flush(){
  if (window.__resetting) return;
  try { localStorage.setItem(KEY, JSON.stringify({ sid, A })); if (!CM.on) setSave('ok','Saved on this device'); if (window.__acctPush && A._savedAt) window.__acctPush(); }
  catch (e) { setSave('err','Could not save on this device'); }
}
const set = (k, val) => { A[k] = val; queueSave(); };
function markSeen(id){ const s = new Set(A._seen || []); if (!s.has(id)) { s.add(id); A._seen = [...s]; queueSave(); } }

// Photos live in IndexedDB (too big for localStorage). If it is blocked, they stay in memory for this visit.
const idb = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => { try { const r = indexedDB.open('porta', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('files', mode); const s = t.objectStore('files'); const out = fn(s); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); };
  return { all: () => tx('readonly', s => s.getAll()), put: rec => tx('readwrite', s => s.put(rec)), del: id => tx('readwrite', s => s.delete(id)) };
})();
async function saveUpload(rec){ try { await idb.put(rec); } catch (e) { /* memory only */ } }

/* ---------- Images ---------- */
function loadImg(file){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
async function shrink(file, max, limitBytes){
  const img = await loadImg(file);
  let s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', [0.84,0.76,0.68,0.6,0.55,0.5][k]));
    if (blob && blob.size < limitBytes) return blob;
    s *= 0.8;
  }
  throw new Error('too_big');
}
async function addFiles(kind, files, max, into){   // into: the room these photos go in
  const have = uploads.filter(u => u.kind === kind).length + [...pending.values()].filter(p => p.kind === kind).length;
  const list = [...files].slice(0, Math.max(0, max - have));
  if (files.length > list.length) toast(`Up to ${max} here`);
  for (const f of list) {
    const tmp = 'p' + newId();
    pending.set(tmp, { kind, into, name: f.name, preview: /^image\//.test(f.type) ? URL.createObjectURL(f) : null }); render();
    try {
      if (!/^image\//.test(f.type)) throw new Error('not_image');
      const blob = await shrink(f, 2000, 1.5e6);
      const rec = { id: newId(), kind, name: f.name.replace(/\.[^.]+$/, '') + '.jpg', room: into ? roomKind(into) : '', roomLabel: into || '', blob, createdAt: new Date().toISOString() };
      rec.url = URL.createObjectURL(blob);
      uploads.push(rec); await saveUpload(rec); log('upload', kind); queueSave();
    } catch (e) { toast(e && e.message === 'not_image' ? `${f.name}: please send a photo or screenshot` : `${f.name} could not be added`); }
    finally { pending.delete(tmp); render(); }
  }
}
const srcOf = u => u.url;

/* ---------- Sending to Netlify Forms ---------- */
async function nf(form, fields, file){
  let body, headers = {};
  if (file) { body = new FormData(); body.append('form-name', form); for (const [k, x] of Object.entries(fields)) body.append(k, x ?? ''); body.append('file', file.blob, file.name); }
  else { body = new URLSearchParams({ 'form-name': form, ...Object.fromEntries(Object.entries(fields).map(([k, x]) => [k, x ?? ''])) }).toString(); headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; }
  const r = await fetch('/', { method: 'POST', headers, body });
  if (!r.ok) throw new Error('http_' + r.status);
}
const progressText = () => { const ms = visible(); return `${ms.filter(m => statusOf(m).k === 'done').length}/${ms.length} done`; };

/* ---------- After the first version: what to check ---------- */
// Right after the listing is read, on the first step the host lands on: the guide is written, here is what is left.
/* ---------- Extra questions for the public test ---------- */

/* ---------- Building your guide ---------- */
// The screen after Send: the bar and its step (editor.js progBuild), a line under it that changes every few seconds and
// says what is going into this host's guide (Yohann, 12 Nov 2026: "more text changing to keep the user reading"), and on a
// wide screen the build's steps beside them. Then the ready screen: the places the research found first (below).
let buildTimer = null;
const BUILT = ['ready', 'approved', 'published'];
function buildState(g){
  const st = (g && g.status) || 'queued';
  if (BUILT.includes(st)) return readyHTML(g);
  if (st === 'failed') return `<h1>This did not work.</h1><p>${esc((g && g.message) || 'Something went wrong while building your guide.')} We have been told. You can change an answer and send it again.</p>`;
  const j = window.__buildJob = window.__buildJob || { since: Date.now() };
  progSet(j, { status: st === 'generating' ? 'running' : 'queued', message: (g && g.message) || 'Waiting for its turn' });
  const p = progBuild(j); if (p.k !== BL.k || !BL.line) { BL.k = p.k; BL.line = blNext(); }   // drawn again on the same step: the same line
  // Screen readers hear the step when it changes (a polite status), not the line that changes every few seconds.
  return `<div class="bgrid"><div class="bmain"><h1>${st === 'generating' ? 'Building your guide…' : 'Your guide is in the queue.'}</h1>${progBar('build', 'Building your guide', true)}
    <p class="sr" id="bsay" role="status" aria-live="polite" data-w="${esc(p.words)}">${esc(p.words)}</p>
    <p class="btick" aria-hidden="true"><span class="on">${esc(BL.line)}</span><span></span></p>
    <p class="bclose">You can close this page: your guide will be here when you come back.</p></div>
    <div class="bside"><small>What goes in</small><ol class="bsteps">${blSteps(p.k)}</ol></div></div>`;
}
// Under the progress: nothing while it is queued or being built (sending again would do nothing, and an answer changed now is
// not in this build), nor while found places wait on the ready screen; the answers once it is ready; the answers and a second
// try when it failed (Yohann, 11 Nov 2026).
function buildFoot(g){
  const st = (g && g.status) || 'queued', done = BUILT.includes(st);
  if (!done && st !== 'failed' || done && ['load', 'cards', 'pub'].includes(RD.st)) return '';
  return `<div class="row bfrow"><a class="btn" href="#home">See or change my answers</a>${st === 'failed' ? '<a class="btn" href="#send">Build it again</a>' : ''}</div>`;   // a link under the card, not a card of its own
}
function buildingHTML(){
  const g = window.__acctGuide && window.__acctGuide();
  return `<div class="bwrap${RD.st === 'cards' ? ' two' : ''}" id="bwrap"><section class="hero bhero"><small>${esc(v('guideName') || v('placeName') || 'Your guide')}</small><div id="bstate">${buildState(g)}</div></section>
    <section class="card bcards" id="bcards"${RD.st === 'cards' ? '' : ' hidden'}>${RD.st === 'cards' ? readyCard() : ''}</section></div>
    <div id="bfoot">${buildFoot(g)}</div>`;
}
function buildDraw(g){
  const el = document.getElementById('bstate'); if (!el) return;
  el.innerHTML = buildState(g);
  const c = document.getElementById('bcards'), w = document.getElementById('bwrap'), on = RD.st === 'cards' && BUILT.includes(g && g.status);
  if (c) { c.hidden = !on; c.innerHTML = on ? readyCard() : ''; } if (w) w.classList.toggle('two', on);
  const bf = document.getElementById('bfoot'); if (bf) bf.innerHTML = buildFoot(g);
}
function watchBuild(){
  clearInterval(buildTimer); let was = (window.__acctGuide && (window.__acctGuide() || {}).status) || null;
  const tick = async () => {
    try {
      const g = await window.__acctStatus(); if (!g) return;
      if (BUILT.includes(g.status) || g.status === 'failed') clearInterval(buildTimer);
      if (BUILT.includes(g.status)) { if (was !== g.status) { was = g.status; if (!RD.st) RD.st = 'load'; buildDraw(g); } return readyLoad(); }   // built while watched: "ready" with no button until the found places are known
      if (g.status !== was) { was = g.status; buildDraw(g); }   // queued, being built, failed: a new title
      else if (window.__buildJob) progSet(window.__buildJob, { status: g.status === 'generating' ? 'running' : 'queued', message: g.message || 'Waiting for its turn' });   // the bar and the lines follow by themselves
    } catch (e) {}
  };
  tick(); buildTimer = setInterval(tick, 4000); blStart();
}

/* --- The line that keeps the host reading: only what the browser knows about this guide, each line shown only when its
   data is there. Every 6.5 s a new one fades in (none when the device asks for less motion); while a step has lines of
   its own (the places it looks up, the languages it translates into), every other line is one of them. Lines are
   English sentences translated by i18n.js like any other: a number is {n}, a name {x}; names of days, languages and
   lists are given in the maker's language already. --- */
const BL = { k: -1, line: '', n: 0, gi: 0, si: 0, timer: null, t: 0, k0: null };
const BL_EVERY = 6500, NB = '\u00a0';   // a number stays with its unit (km, min)
const blList = xs => { try { return new Intl.ListFormat(UIL === 'en' ? 'en-GB' : UIL, { type: 'conjunction' }).format(xs); } catch (e) { return xs.join(', '); } };
const blLang = l => { try { return new Intl.DisplayNames([UIL === 'en' ? 'en-GB' : UIL], { type: 'language' }).of(l); } catch (e) { return l; } };
const blKm = it => { const k = it.km_from_house != null ? +it.km_from_house : typeof it.lat === 'number' && A.lat ? edKm(+A.lat, +A.lng, it.lat, it.lng) : null; return k == null || isNaN(k) ? null : Math.max(1, Math.round(k)); };
const blDay = d => ({ mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' })[d];
const blDate = s => { try { return new Intl.DateTimeFormat(UIL, { day: 'numeric', month: 'long' }).format(new Date(s + 'T12:00:00')); } catch (e) { return s; } };
const blSame = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
// For every step of the build (editor.js PROG_STEPS.build, by index): what it does for this guide.
function blStepLines(k){
  const names = ['favEat', 'favNight', 'favDo'].flatMap(placeRows).map(r => String(r.p || '').trim()).filter(x => x && x.length <= 40);
  const photos = uploads.filter(u => u.kind === 'photo').length, town = v('town');
  switch (k) {
    case 0: return ['Reading your answers and your photos.'];
    case 1: return [...names.map(x => `Looking up ${x}: its phone, website and hours.`), 'Putting a pin on the map for each place you recommend.'];
    case 2: return ['Finishing the search of the area around the house.'];
    case 3: return town ? [`Looking for the weekly markets around ${town}.`] : ['Looking for the weekly markets around the house.'];
    case 4: return town ? [`Looking for things to do around ${town}.`] : ['Looking for things to do around the house.'];
    case 5: return ['Looking for the nearest pharmacy and hospital.', 'Looking for the pharmacy on duty nearest to the house.'];
    case 6: return ['Laying out the pages of your guide.', ...(photos ? ['Putting your photos in their rooms.'] : [])];
    case 7: { const L = buildLangs().map(blLang); return L.length ? [`Translating into ${blList(L)}.`, ...L.map(x => `Your welcome, rooms and rules, going into ${x}.`)] : []; }
    case 8: return ['Saving your guide and its photos.'];
  }
  return [];
}
// The lines about the whole guide, the most personal first.
function blLines(){
  const out = [], add = (ok, s) => { if (ok && s) out.push(s); }, nm = x => shownText(x);
  const AR = AREA.result || {}, today = new Date().toISOString().slice(0, 10);
  const rooms = Array.isArray(A.rooms) ? A.rooms.filter(r => r && r.n).length : 0, photos = uploads.filter(u => u.kind === 'photo').length;
  add(rooms > 1, photos ? `Your ${rooms} rooms, in the order you chose, with ${photos} photos.` : `Your ${rooms} rooms, in the order you chose.`);
  const eat = placeRows('favEat'), night = placeRows('favNight'), todo = placeRows('favDo').length + Object.values(A.swipes || {}).filter(x => x && x.d === 'yes' && x.cat === 'todo').length;
  add(eat.length, eat.length === 1 ? 'Your place to eat, with phone and hours if we find them.' : `Your ${eat.length} places to eat, with phone and hours if we find them.`);
  const said = eat.find(r => String(r.c || '').trim() && String(r.p || '').trim().length <= 40); add(said, said && `${String(said.p).trim()}, in your own words.`);
  add(todo, todo === 1 ? 'The thing to do you chose, and nothing you did not.' : `The ${todo} things to do you chose, and nothing you did not.`);
  add(night.length, night.length === 1 ? 'Your place for the evening.' : `Your ${night.length} places for the evening.`);
  const mk = ((AR.markets || {}).markets || []).filter(m => nm(m.name)).map(m => ({ m, km: blKm(m) })).sort((a, b) => (a.km ?? 999) - (b.km ?? 999));
  const far = Math.max(...mk.map(x => x.km || 0));
  add(mk.length > 1 && far > 0, `${mk.length} markets within ${far}${NB}km of the house, nearest first.`);
  for (const { m, km } of mk.slice(0, 3)) { const d = blDay(((m.schedule || [])[0] || {}).days?.[0]); if (!d || !m.town) continue;
    add(true, blSame(m.town, v('town')) ? `${d} is market day right here in ${m.town}.` : km ? `${d} is market day in ${m.town}, ${km}${NB}km away.` : ''); }
  add(mk.length, 'Guests see which markets are on today, every day.');
  const ev = ((AR.events || {}).items || []).map(e => ({ e, d: (e.dates || []).filter(x => (x.end || x.start) >= today).sort((a, b) => a.start.localeCompare(b.start))[0] })).filter(x => x.d && nm(x.e.name)).sort((a, b) => a.d.start.localeCompare(b.d.start));
  add(ev.length > 1, `${ev.length} local events coming up, each with its dates.`);
  if (ev[0]) { const x = ev[0], when = blDate(x.d.start >= today ? x.d.start : today); add(nm(x.e.name).length <= 40, x.d.status === 'confirmed' ? `Coming up: ${nm(x.e.name)}, on ${when}.` : `Coming up: ${nm(x.e.name)}, expected on ${when}.`); }
  const help = ((AR.emergency || {}).groups || []).flatMap(g => g.items || []).map(x => nm(x.name)).filter(Boolean);
  add(help.length, 'Emergency numbers, the nearest pharmacy and hospital.');
  const ph = help.find(x => /farm[aà]c|pharm|apothe/i.test(x) && x.length <= 40); add(ph, ph && `For a pharmacy, guests find ${ph}.`);
  const ho = help.find(x => /hospital|h[oô]pital|cl[ií]nic/i.test(x) && x.length <= 40); add(ho, ho && `The nearest hospital, ${ho}, with directions.`);
  const L = buildLangs().length + 1;
  add(L > 1, `Guests will read it in ${L} languages.`);
  add(L > 1, `Each phone opens it in its own language, when it is one of your ${L}.`);
  const am = (A.amenities || []).length; add(am > 2, `${am} things your place offers, the most asked for first.`);
  add(v('checkIn') && v('checkOut'), `Check-in from ${v('checkIn')} and check-out by ${v('checkOut')}, always at hand.`);
  const rules = lines('houseRules').length; add(rules, rules === 1 ? (L > 1 ? 'Your house rule, in every language of the guide.' : 'Your house rule, where guests look for it.') : L > 1 ? `Your ${rules} house rules, in every language of the guide.` : `Your ${rules} house rules, where guests look for them.`);
  add(+v('sleeps') > 0 && +v('bedrooms') > 0, +v('bedrooms') === 1 ? `Sleeps ${v('sleeps')}, with 1 bedroom, on the house page.` : `Sleeps ${v('sleeps')}, with ${v('bedrooms')} bedrooms, on the house page.`);
  add(v('wifiName') && v('wifiPassword'), 'The Wi-Fi password, with a copy button and a QR code.');
  add(v('arrival'), 'How to get in, in your own words.');
  add(v('rubbishMode'), 'Which bin goes out on which day.');
  add(v('localTips'), 'Your local tips, in the house guide.');
  add(v('taxi'), 'The taxi number, for guests without a car.');
  add(secOn('map'), 'Every place in the guide on one map.');
  const more = typeof moreLeft === 'function' && AUTH ? moreLeft() : 0; add(more > 1, `We found ${more} more places nearby: you choose once it is built.`);
  add(true, 'Guests open it from a link: no app to install.');
  return out;
}
// The next line: one of the step's own every other time, else the next of the guide's, never the one just shown.
function blNext(){
  const S = blStepLines(BL.k), G = blLines(); BL.n++;
  const pick = (L, key) => { for (let i = 0; i < L.length; i++) { const x = L[BL[key]++ % L.length]; if (x !== BL.line || L.length === 1) return x; } return L[0]; };
  return S.length && (BL.n % 2 || !G.length) ? pick(S, 'si') : G.length ? pick(G, 'gi') : BL.line;
}
// The build's steps beside the bar (wide screens): rows of PROG_STEPS.build by their first step, ticked as it moves on.
function blRows(){
  const n = buildPlaces(), L = buildLangs().length + 1;
  return [[0, 'Your answers and photos'], ...(n ? [[1, n === 1 ? 'The place you recommend' : `The ${n} places you recommend`]] : []), [2, 'What is around the house'],
    [6, 'The pages of your guide'], ...(L > 1 ? [[7, `Your ${L} languages`]] : []), [8, 'Saving it']];
}
function blSteps(k){
  const R = blRows(), cur = k < 0 ? -1 : R.reduce((c, r, i) => r[0] <= k ? i : c, 0);
  return R.map((r, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><i aria-hidden="true">${i < cur ? CHECK : ''}</i><span>${esc(r[1])}</span>${i < cur ? '<b class="sr">Done</b>' : i === cur ? '<b class="sr">Now</b>' : ''}</li>`).join('');
}
// Every second: the step for screen readers and the steps beside the bar; every BL_EVERY: the next line.
function blStart(){
  clearInterval(BL.timer); BL.t = Date.now();
  BL.timer = setInterval(() => {
    const tk = document.querySelector('#bstate .btick'); if (!tk) { clearInterval(BL.timer); return; }
    const j = window.__buildJob, p = j && progBuild(j); if (!p) return;
    const say = document.getElementById('bsay'); if (say && say.dataset.w !== p.words) { say.dataset.w = p.words; say.textContent = p.words; }
    if (p.k !== BL.k) { BL.k = p.k; BL.si = 0; BL.n = 0; const ol = document.querySelector('#bstate .bsteps'); if (ol) ol.innerHTML = blSteps(p.k); BL.t = 0; }
    if (Date.now() - BL.t < BL_EVERY) return;
    BL.t = Date.now(); blSwap(tk);
  }, 1000);
}
// The next line goes into the hidden half, is translated (i18n.js, a microtask) and measured there before it fades in: one
// that would take a third line in this language and width is passed over, so the room kept for two lines is always enough.
async function blSwap(tk){
  const [a, b] = tk.children, on = a.classList.contains('on') ? a : b, off = on === a ? b : a, lh = parseFloat(getComputedStyle(tk).lineHeight) || 24;
  for (let i = 0; i < 6; i++) {
    const line = blNext(); if (line === BL.line) continue;
    off.textContent = line; await Promise.resolve();
    if (off.getBoundingClientRect().height <= lh * 2 + 2 && off.scrollWidth <= tk.clientWidth + 1) { BL.line = line; off.classList.add('on'); on.classList.remove('on'); return; }
  }
  off.textContent = '';
}
window.__buildLines = () => [...new Set([...blLines(), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap(blStepLines)])];   // every line this guide can show (the checks measure them)

/* --- The ready screen (Yohann, 12 Nov 2026: "guide to accept, and then to see the site, else they will go to the site and
   will forget"). The places the research found and the host has not looked at (the build's find-todo job, the same cards
   as the editor's Find more) come first, one at a time: Keep puts the place in the guide's draft at once (cmFindPut,
   saved like any change), Skip remembers it on this device (findMark, as in the editor). After the last card the kept
   ones go into the guide (cmPublishNow: published as the editor's Publish does; a guide held back for review stays held
   back), then "Open my guide" is the main button. A host who leaves and comes back finds the cards still there
   (readyLanding); kept places that did not reach the guide offer to try again. A card with a Google id says whether Google
   calls it closed, asked live and never kept (openAsk, openGate in editor.js): a permanently closed one cannot be kept. --- */
const RD = { st: '', err: '', step: '', added: [] };   // st: load, cards, pub, err, done (after cards), off (nothing to show)
const RD_PATH = 'files/todo/items', RD_KEY = 'porta-ready-v1';
const rdMem = () => { try { return ((JSON.parse(localStorage.getItem(RD_KEY) || '{}') || {})[GUIDE.id]) || { kept: [] }; } catch (e) { return { kept: [] }; } };
const rdSave = m => { try { const o = JSON.parse(localStorage.getItem(RD_KEY) || '{}') || {}; o[GUIDE.id] = m; localStorage.setItem(RD_KEY, JSON.stringify(o)); } catch (e) { /* this device forgets: the draft still holds what was kept */ } };
// The found places of this build: the find-todo job the worker wrote just before it finished (not a later Find more).
function rdJob(){
  const f = CM.on && CM.find['find-todo']; if (!f || f.status !== 'done' || !f.id) return null;
  const fin = Date.parse(GUIDE.finished_at || '');
  return (fin ? Math.abs(f.since - fin) < 15 * 60e3 : f.since >= Date.parse(A._sentAt || 0)) ? f : null;
}
const rdLeft = () => rdJob() ? cmFindItems('find-todo', RD_PATH) : [];
// Kept here, in the draft, not in the live guide yet (the publish failed, or the host left before it).
const rdWaiting = () => { const m = rdMem(), live = new Set(((((CM.live || {}).content || {}).files || {}).todo || {}).items?.map(x => x.id) || []), now = edGet(edC(), edPath(RD_PATH)) || [];
  return (m.kept || []).filter(id => now.some(x => x.id === id) && !live.has(id)); };
const rdState = () => rdLeft().length ? 'cards' : CM.on && rdWaiting().length ? 'err' : 'off';
async function readyLoad(){
  if (RD.busy || RD.st && RD.st !== 'load') return;
  RD.busy = true;
  try { if (!CM.on && window.__acctFresh) await window.__acctFresh(); if (CM.on) await cmFindLoad('find-todo'); } catch (e) { /* the plain ready screen */ }
  RD.busy = false; RD.st = CM.on ? rdState() : 'off';
  if (RD.st === 'err') RD.err = 'The places you kept are saved, but not in your guide yet.';
  buildDraw(GUIDE);
}
// Coming back to the maker after a build (no step in the address): cards still to look at, or kept places that did not
// reach the guide, open the ready screen instead of the editor (account.js accountBoot, once the editor is set up).
async function readyLanding(){
  if ((CM_OPENED_ON && CM_OPENED_ON !== 'building') || new URLSearchParams(location.search).get('step')) return;
  if (!A._sentAt || !BUILT.includes(GUIDE.status) || Date.now() - Date.parse(GUIDE.finished_at || A._sentAt) > 14 * 864e5) return;
  try { await cmFindLoad('find-todo'); } catch (e) { return; }
  const st = RD.st = rdState(); if (st === 'off') return;   // known now: the ready screen does not ask again
  if (st === 'err') RD.err = 'The places you kept are saved, but not in your guide yet.';
  history.replaceState(null, '', location.pathname + location.search + '#building');
}
// The question, then the card: what it is, where, why it was suggested, Keep or Skip, "1 of 2".
function readyCard(){
  const left = rdLeft(), all = cmFindPool('find-todo', RD_PATH).length; if (!left.length) return '';
  if (left[1] && left[1].gid) openAsk(left[1].gid);   // the next card's answer is ready when it comes up
  return `<p class="bask">${all === 1 ? 'We found a place near you that is not in your guide. Keep it if you would send guests there: only what you keep goes in.' : `We found ${all} places near you that are not in your guide. Keep the ones you would send guests to: only those go in.`}</p>${cmFindCard(left[0], all - left.length + 1, all, {})}`;
}
function readyHTML(g){
  const slug = (g && g.slug) || v('slug'), live = (g && g.status) === 'published', link = `/g/${esc(slug)}`;
  const say = live ? 'It is live. Share this link with your guests.' : 'Have a look. Only you can see it until it is published.';
  const open = `<a class="go-next" href="${link}" target="_blank" rel="noopener"><span>Open my guide</span><span class="ar">${ARROW}</span></a>
    <p class="burl" translate="no">${esc(location.host)}/g/<wbr>${esc(slug)}</p>`, quiet = `<a class="btn small bopen" href="${link}" target="_blank" rel="noopener">Open my guide now</a>`;
  if (RD.st === 'load') return `<h1>Your guide is ready.</h1><p>${say}</p>`;
  if (RD.st === 'cards') return `<h1>Your guide is ready.</h1><p class="bmore">${say}</p><p class="burl bmore" translate="no">${esc(location.host)}/g/<wbr>${esc(slug)}</p><p class="bmore">One last thing before you open it.</p>${quiet}`;   // on a phone the card's question is enough: the card starts higher
  if (RD.st === 'pub') { const n = rdMem().kept.length;
    return `<h1>Your guide is ready.</h1><p role="status">${n === 1 ? 'Adding the place you kept to your guide…' : `Adding the ${n} places you kept to your guide…`}</p><div class="cm-progw dark"><div class="cm-prog bwait"><i></i></div></div>`; }
  if (RD.st === 'err') return `<h1>Your guide is ready.</h1><p class="berr" role="alert">${esc(RD.err)}</p>
    <div class="row"><button class="go-next" type="button" data-rdretry><span>Add them to my guide</span><span class="ar">${ARROW}</span></button>${RD.step ? `<a class="btn small bopen" href="#${esc(RD.step)}">Fix it in the editor</a>` : ''}</div>${quiet}`;
  const added = RD.st === 'done' && RD.added.length ? `<p>${RD.added.length === 1 ? `${esc(RD.added[0])} is in your guide now.` : `${RD.added.length} places you kept are in your guide now.`}</p>` : '';
  return `<h1>Your guide is ready.</h1>${added}<p>${say}</p>${open}`;
}
// Keep: Google asked first when its answer is not known (openGate: a permanently closed place stays on its card, with a
// toast); nothing kept twice, nor after a Skip made while it was asked.
async function readyKeep(b, f, sid){
  const it = (f.items || []).find(x => x.id === sid); if (!it) return;
  if (!(await openGate(it, b)) || findSeen(f.id).has(sid) || (CM.findSkip || new Set()).has(sid)) return;
  const n = cmFindPut(RD_PATH, sid); if (n) { const m0 = rdMem(), m = m0.job === f.id ? m0 : { job: f.id, kept: [] }; m.kept = [...new Set([...m.kept, sid])]; rdSave(m); cmQueue(); }
  readyNextCard();
}
// After a card: the next one, or the kept ones into the guide.
function readyNextCard(){
  if (rdLeft().length) { buildDraw(GUIDE); const h = document.querySelector('#bcards h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } return; }
  readyPublish();
}
async function readyPublish(){
  const m = rdMem(), wait = rdWaiting();
  if (!wait.length) { RD.st = 'done'; RD.added = []; m.done = true; rdSave(m); return buildDraw(GUIDE); }
  RD.st = 'pub'; buildDraw(GUIDE);
  try {
    await cmPublishNow({ keep: true });
    const items = edGet(edC(), edPath(RD_PATH)) || [];
    RD.added = wait.map(id => items.find(x => x.id === id)).filter(Boolean).map(x => edShown(x.name)); RD.st = 'done'; m.done = true; rdSave(m);
  } catch (e) { RD.st = 'err'; RD.err = e.miss ? e.message : 'Not published: ' + niceError(e); RD.step = e.miss && e.miss[0] && e.miss[0].m ? e.miss[0].m.id : ''; }
  buildDraw(GUIDE);
  const b = document.querySelector('#bstate .go-next'); if (b) b.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#bwrap button'); if (!b || !CM.on) return;
  const d = b.dataset, f = rdJob();
  // Kept: remembered with its build's job (a later build's cards start afresh) and saved in the draft at once.
  if (d.rdadd && f) readyKeep(b, f, d.rdadd);
  else if (d.rdskip && f) { findMark(f.id, [d.rdskip]); readyNextCard(); }
  else if (d.rdstop !== undefined && f) { findMark(f.id, rdLeft().map(x => x.id)); readyNextCard(); }
  else if (d.rdretry !== undefined) { b.disabled = true; readyPublish(); }
});

/* ---------- After sending ---------- */
function thanksHTML(){
  const when = A._sentAt ? new Date(A._sentAt).toLocaleString() : '';
  return `<section class="hero"><small>${esc(v('guideName') || v('placeName') || 'Your guide')}</small>
      <h1>Thank you. Your preview is ready.</h1>
      <p>Try it like a guest and tell us what you think. Then we research your area and email the full guide to <b>${esc(v('email'))}</b>, usually within two days.</p>
      <button class="go-next" type="button" id="openPreview"><span>Open my preview</span><span class="ar">${ARROW}</span></button></section>
    <section class="card">
      <div class="msg">Sent ${esc(when)}. Your answers stay on this device, so you can come back, change anything and send again.</div>
      <div class="note"><div><b>This is a generic preview, not the final look and feel.</b> Get in touch with Yohann to activate the final look.</div></div>
      <div class="note"><div><b>Your preview is ready.</b> It is built from your own answers and photos, on this device, at ${esc(BASE)}/${esc(v('slug'))}. Places, markets and events get researched for the full guide. Use the Feedback button on every screen: that is what helps us most.</div></div>
      <div class="row"><button class="btn primary" type="button" id="openPreview">Open my preview ${ARROW}</button></div>
      <div class="foot"><div class="row"><a class="btn" href="#home">See or change my answers</a></div></div></section>`;
}
function notHereHTML(path){
  return `<section class="hero"><small>${esc(BASE)}/${esc(path)}</small><h1>This guide is being prepared</h1>
    <p>Its host is still setting it up. If it is yours, open it on the device where you filled in your answers.</p>
    <a class="go-next" href="/"><span>Build a guide for your place</span><span class="ar">${ARROW}</span></a></section>`;
}
function feedbackPageHTML(){
  const p = new URLSearchParams(location.search);
  const guide = p.get('guide') || '', round = p.get('round') || '1';
  return `<section class="hero"><small>Round ${esc(round)}</small><h1>How does your guide feel?</h1>
      <p>Open it on your phone, use it like a guest, then tell us what works and what does not.</p>
      ${guide ? `<a class="go-next" href="/g/${encodeURIComponent(guide)}/" target="_blank" rel="noopener"><span>Open your guide</span><span class="ar">${ARROW}</span></a>` : ''}</section>
    <form id="fb" class="card">
      <div class="f"><span class="lab" id="l_rate">Overall</span><div class="stars" role="radiogroup" aria-labelledby="l_rate">${[1,2,3,4,5].map(n => `<label><input type="radio" name="rating" value="${n}" required><span>${n}</span></label>`).join('')}</div></div>
      <div class="f"><label for="fb_right">What feels right</label><textarea id="fb_right" name="right" rows="3"></textarea></div>
      <div class="f"><label for="fb_wrong">What is wrong or missing</label><textarea id="fb_wrong" name="wrong" rows="4" placeholder="The bakery closed last year, I want the pool first…"></textarea></div>
      <div class="f"><label for="fb_ux">How would you like it to look or work instead?</label><textarea id="fb_ux" name="ux" rows="3" placeholder="Bigger photos, a list instead of tiles, the map first…"></textarea></div>
      <div class="f"><span class="lab">Where</span><div class="chips">${['Look and colours','Layout','Texts and tone','Wrong information','Missing places','Photos','Languages','Navigation'].map(x => `<label class="chip"><input type="checkbox" name="areas" value="${x}"><span>${x}</span></label>`).join('')}</div></div>
      <div class="f"><label for="fb_shot">A screenshot <span class="opt">optional</span></label><input id="fb_shot" name="shot" type="file" accept="image/*"></div>
      <div class="f"><span class="lab">Next step</span><div class="chips"><label class="chip"><input type="radio" name="next" value="changes" checked><span>Make these changes</span></label><label class="chip"><input type="radio" name="next" value="publish"><span>It is ready, publish it</span></label></div></div>
      <div class="f"><label for="fb_email">Your email</label><input id="fb_email" name="email" type="email" value="${esc(v('email'))}" required></div>
      <div><button class="btn primary" type="submit">Send feedback</button></div></form>`;
}

/* ---------- Render ---------- */
let lastRoute = null;
function render(){
  if (/(^|[#&])(access_token|error_description)=/.test(location.hash)) return;   // a sign-in link: accountBoot reads it first
  let r = route(); const main = $('#main');
  if (!main) return;
  clearInterval(buildTimer); clearInterval(BL.timer);
  const ae = document.activeElement, fid = ae && ae.id, sel = ae && ae.selectionStart;
  const m = visible().find(x => x.id === r);
  const path = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ''));
  if (path && path !== 'index.html' && CM.on) { location.replace('/g/' + encodeURIComponent(CM.g.slug)); return; }
  if (path && path !== 'index.html') { if (path === v('slug') || path === 'preview') { renderPreview(); return; } main.innerHTML = notHereHTML(path); return; }
  if (CM.on && r !== 'building' && !cmIsPage(r)) { history.replaceState(null, '', '#' + cmStart()); r = route(); }   // no overview: the editor opens on a step
  if (CM.on && r === 'building') { main.innerHTML = buildingHTML(); watchBuild(); }   // just built: the ready screen, found places first
  else if (CM.on) { main.innerHTML = cmPageHTML(r); cmRemember(r); cmPhoneOn(); }   // the guide exists: the steps edit it (editor.js)
  else if (new URLSearchParams(location.search).has('feedback')) main.innerHTML = feedbackPageHTML();
  else if (r === 'building' || (A._sentAt && !location.hash && window.__acctGuide && window.__acctGuide() && window.__acctGuide().status !== 'draft')) { main.innerHTML = buildingHTML(); watchBuild(); }
  else if (r === 'thanks' || (A._sentAt && !location.hash)) main.innerHTML = thanksHTML();
  else if (r === 'yours') { main.innerHTML = yoursHTML(); phoneRender(); if (r !== lastRoute) log('open', 'yours'); }   // the wow: the guide in a phone
  else if (m) { main.innerHTML = moduleHTML(m); PHONE.screen = (m.id === 'known' && KN.screen) || STEP_SCREEN[m.id] || 'home'; PHONE.build = false; phoneRender(); if (r !== lastRoute) log('open', m.id); if (A._last !== m.id || !(A._seen || []).includes(m.id)) { A._last = m.id; markSeen(m.id); } queueSave(); }
  else if (r === 'send') { main.innerHTML = sendHTML(); if (r !== lastRoute) { log('open', 'send'); queueSave(); } }
  else if ((r === 'home' || r === 'start') && (r === 'start' || (!A._draftAt && !A._skipStart && !visible().some(m => statusOf(m).k !== 'new')))) { main.innerHTML = startHTML(); if (r !== lastRoute) { log('open', 'start'); queueSave(); } }
  else { history.replaceState(null, '', '#' + obNext()); return render(); }   // no overview page: straight to the next step
  let nb = document.getElementById('navbar'); if (!nb) { nb = document.createElement('div'); nb.id = 'navbar'; nb.hidden = true; document.body.appendChild(nb); }
  const stepView = CM.on ? cmIsPage(r) : r === 'send' || !!m;
  nb.hidden = !stepView || new URLSearchParams(location.search).has('feedback') || (r === 'thanks');
  if (!nb.hidden) nb.innerHTML = navbarHTML(r);
  if (r !== lastRoute && document.getElementById('f_slug')) slugLater();
  if (r !== lastRoute) { window.scrollTo(0, 0); lastRoute = r; }
  fixRail(); setTimeout(fixRail, 60);
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); try { if (sel != null) el.setSelectionRange(sel, sel); } catch (e) {} } }
}
function softRefresh(){
  const m = MODULES.find(x => x.id === route());
  if (!m) return;
  const s = statusOf(m), miss = missingOf(m);
  const p = document.querySelector('.mhead .pill'); if (p) { p.className = 'pill ' + s.k; p.innerHTML = (s.k === 'done' ? CHECK : '') + esc(s.label); }
  const d = document.querySelector('[data-done]'); if (d) d.disabled = !!miss.length;
  const t = document.querySelector('.foot .todo'); if (t) t.innerHTML = miss.length ? `Still needed for Done: <b>${miss.map(k => esc(NAME(k))).join(', ')}</b>` : s.k === 'done' ? 'This step is done. You can still change anything.' : 'Everything needed is here. Press Done when you are happy with it.';
  document.querySelectorAll('[data-k],[data-multi],[data-radio]').forEach(el => { const k = el.dataset.k || el.dataset.multi || el.dataset.radio; const f = el.closest('.f'); const b = f && f.querySelector('.req'); if (b) b.outerHTML = badge(k); });
  if (m.id === 'known') knownTicks();
  refreshNav();
}
window.addEventListener('hashchange', render);
function refreshSend(){ if (route() !== 'send') return; refreshNav(); const miss = sendMissing(); const b = $('#send'); if (b) b.disabled = !!miss.length; const tt = document.querySelector('.foot .todo'); if (tt) tt.innerHTML = miss.length ? `Before sending: <b>${miss.map(esc).join(', ')}</b>` : ''; }

/* ---------- Events ---------- */
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.k === 'slug') { const c = cleanSlug(t.value); if (c !== t.value) { const p0 = t.selectionStart; t.value = c; try { t.setSelectionRange(p0, p0); } catch (er) {} } set('slug', c); A._slugTouched = true; slugCheck(); softRefresh(); refreshSend(); slugLater(); return; }
  if (t.dataset.k && A._pre && A._pre[t.dataset.k]) { const p = { ...A._pre }; delete p[t.dataset.k]; A._pre = p; }
  if (t.dataset.k) { set(t.dataset.k, t.value); if ((t.dataset.k === 'guideName' || t.dataset.k === 'placeName') && !A._slugTouched) slugAuto(); if (route() === 'send') refreshSend(); else softRefresh(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if ((t.dataset.multi || t.dataset.radio) && A._pre && A._pre[t.dataset.multi || t.dataset.radio]) { const p = { ...A._pre }; delete p[t.dataset.multi || t.dataset.radio]; A._pre = p; }
  if (t.dataset.multi) { const k = t.dataset.multi, cur = new Set(A[k] || []); t.checked ? cur.add(t.value) : cur.delete(t.value); set(k, [...cur]); softRefresh(); }
  else if (t.dataset.radio) { set(t.dataset.radio, t.value); softRefresh(); refreshSend(); }
  else if (t.dataset.k && t.tagName === 'SELECT') { set(t.dataset.k, t.value); softRefresh(); }
  else if (t.dataset.sec) { A.modules = { ...Object.fromEntries(SECTIONS.map(s => [s.id, secOn(s.id)])), [t.dataset.sec]: t.checked }; queueSave(); lookRefresh().then(refreshNav); }   // in The look: the steps and the phone follow, the page stays where it is
  else if (t.dataset.check) { set(t.dataset.check, t.checked); refreshSend(); }
  else if (t.dataset.file) { const d = t.closest('[data-drop]'); addFiles(t.dataset.file, t.files, +d.dataset.max, d.dataset.rmto); t.value = ''; }
  else if (t.dataset.room) { const u = uploads.find(x => x.id === t.dataset.room); if (u) setRoom(u, t.value); }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.donenext) { const id = b.dataset.donenext; A._done = { ...(A._done || {}), [id]: true }; log('done', id); queueSave(); const o = stepsOrder(); const nx = o[o.indexOf(id) + 1]; toast('Done'); location.hash = '#' + (nx || 'home'); render(); }
  else if (b.id === 'openSteps') openSteps();
  else if (b.id === 'skipStart') { A._skipStart = true; queueSave(); location.hash = '#listing'; render(); }
  else if (b.dataset.done) { A._done = { ...(A._done || {}), [b.dataset.done]: true }; log('done', b.dataset.done); queueSave(); render(); toast('Done'); }
  else if (b.dataset.undone) { const d = { ...(A._done || {}) }; delete d[b.dataset.undone]; A._done = d; log('reopen', b.dataset.undone); queueSave(); render(); }
  else if (b.dataset.del) { roomsKeep(); uploads = uploads.filter(x => x.id !== b.dataset.del); try { await idb.del(b.dataset.del); } catch (err) {} render(); }
  else if (b.id === 'send') send(b);
  else if (b.dataset.slug) { SLUG = { for: b.dataset.slug, free: true, options: [] }; set('slug', b.dataset.slug); A._slugTouched = true; slugCheck(); softRefresh(); refreshSend(); }
  else if (b.id === 'fillListing') { const got = applyListing(); const mods = [...new Set(got.map(k => FIELD_MODULE[k]))].map(id => (MODULES.find(m => m.id === id) || {}).title).filter(Boolean); render(); toast(got.length ? `Filled ${got.length} answers in ${mods.join(', ')}. Marked “Review”.` : 'Nothing new found. Try pasting more of the listing.'); }
  else if (b.id === 'openPreview') { flush(); location.href = '/' + (v('slug') || 'preview'); }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'fb') return;
  e.preventDefault();
  const f = new FormData(e.target), p = new URLSearchParams(location.search);
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const shot = f.get('shot');
    const d = device();
    const fields = { device: deviceLine(d), device_json: JSON.stringify(d), sid: p.get('feedback') || sid, guide: p.get('guide') || '', round: p.get('round') || '1', email: f.get('email'), rating: f.get('rating'), right: f.get('right'), wrong: f.get('wrong'), ux: f.get('ux'), areas: f.getAll('areas').join(', '), next: f.get('next') };
    if (shot && shot.size) { const blob = await shrink(shot, 1800, 1.5e6); await nf('feedback', fields, { blob, name: 'screenshot.jpg' }); }
    else await nf('feedback', fields);
    e.target.outerHTML = `<section class="card"><h2 style="font-size:28px">Thank you!</h2><p class="hint" style="font-size:16px">We read every word and send you the next version soon.</p></section>`;
  } catch (err) { btn.disabled = false; btn.textContent = 'Send feedback'; toast('Could not send. Try again.'); }
});
['dragover','dragleave','drop'].forEach(ev => document.addEventListener(ev, e => {
  const d = e.target.closest && e.target.closest('[data-drop]'); if (!d) return; e.preventDefault();
  d.classList.toggle('over', ev === 'dragover');
  if (ev === 'drop' && e.dataTransfer.files.length) addFiles(d.dataset.drop, e.dataTransfer.files, +d.dataset.max, d.dataset.rmto);
}));
async function send(b){
  b.disabled = true;
  const st = $('#sendState');
  try {
    log('send'); const d = device(), j = journey();
    const clean = { ...A }; delete clean._notes; delete clean._log;
    const files = uploads.filter(x => !x.remote && x.blob), acct = window.__acctQueueBuild && window.__acctGuide && window.__acctGuide();   // a picture already in the account's storage has no file on this device
    const total = files.length + 1; let n = 0;
    const tick = () => { n++; if (st) st.textContent = `Sending ${n} of ${total}…`; };
    tick();
    // With an account the guide is built from the account: this copy to us must never stop it.
    try {
      await nf('onboarding', { sid, email: v('email') || (AUTH && AUTH.user && AUTH.user.email) || '', place: v('placeName'), town: v('town'), slug: v('slug'), progress: progressText(), photos: String(uploads.length), listing_photos: JSON.stringify(uploads.filter(u => u.remote).map(u => ({ url: u.src, room: u.room || '', caption: u.name }))),
        device: deviceLine(d), device_type: d.type, device_json: JSON.stringify(d), active_minutes: String(j.activeMinutes), journey: JSON.stringify(j), events: JSON.stringify(A._log || []),
        sent_before: A._sentAt || '', answers: JSON.stringify(clean) });
      for (const u of files) { tick(); await nf('file', { sid, kind: u.kind, room: u.room || '', name: u.name }, u); }
    } catch (e) { if (!acct) throw e; }
    A._sentAt = new Date().toISOString(); flush();
    if (acct) {
      try { st && (st.textContent = 'Starting your guide…'); await window.__acctQueueBuild(); location.hash = 'building'; render(); return; }
      catch (e) { b.disabled = false; if (st) st.textContent = e.message || 'Could not start your guide. Try again.'; return; }
    }
    toast('Sent! Opening your preview…'); setTimeout(() => { location.href = '/' + (v('slug') || 'preview'); }, 900);
  } catch (err) { b.disabled = false; if (st) st.textContent = 'Something did not go through. Check your connection and press Send again.'; }
}

// Save straight away when the page is hidden or closed (phones kill tabs without warning).
addEventListener('pagehide', () => { clearTimeout(saveTimer); flush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(saveTimer); flush(); } });

/* ---------- Boot ---------- */
(async () => {
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { A = saved.A || {}; sid = saved.sid; } } catch (e) {}
  if (!sid) sid = newId();
  { const d = device(); A._sessions = [...(A._sessions || []), { t: Date.now(), d: deviceLine(d) }].slice(-50); log('session', null, { d: deviceLine(d) }); flush(); }
  try { uploads = (await idb.all() || []).map(u => ({ ...u, url: u.blob ? URL.createObjectURL(u.blob) : u.url })).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')); } catch (e) { uploads = []; }
  try { await accountBoot(); } catch (e) {}
  setSave('ok', CM.on ? cmSaveText() : A._seen ? 'Saved on this device' : 'Answers save on this device');
  render();
  if (!CM.on) areaWatch();   // the research from the link, when it is still on its way
})();
