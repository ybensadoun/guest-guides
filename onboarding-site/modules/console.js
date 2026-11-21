/* The owner's modules page (Yohann, 16 Nov 2026; its rules: README.md beside this file). One page for him alone:
   the fourteen modules of the guide, where each part works (the code's list, available.json, with his switches from the
   database), the real maker step beside the real guest page on sample houses, and a feedback box whose words are saved
   with what he was looking at. No framework, no build of its own but the two copied lists (build.mjs). */
'use strict';
const SB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // the maker's own public values (src/account.js): the database rules decide who sees what
const AUTH_KEY = 'porta-auth-v1', HOUSE_KEY = 'porta-house-v1', MINE = 'porta-console-v1', OWN_HOUSE = 'porta-console-own-house';
const HERE = '/modules/';

// The fourteen conversations (MODULE-CONVERSATIONS.md), in their order: what each is in a line, and the maker's editor
// steps that edit it, each with the guest screen that shows it ([step id, its name in the maker, the guide's route]).
// The parts and where they work are not here: available.json, the engine's list.
const TILE = ['tiles', 'Its tile on Home', 'home'];
const MODS = [
  { id: 'transport', c: 'olive', what: 'Taxis, ride apps, trains and public transport, on their own page.', steps: [['transport', 'Getting around', 's/transport'], TILE] },
  { id: 'home', c: 'lamp', what: 'Home’s frame, the white cards, the board that arranges it and which sections a guide has.', steps: [['tiles', 'Home page', 'home'], ['sections', 'Guide sections', 'home']] },
  { id: 'markets', c: 'clay', what: 'The markets list and page, and What’s on at the end of Home.', steps: [['markets', 'Local markets', 'markets'], TILE] },
  { id: 'events', c: 'plum', what: 'Festivals, fairs and traditions with their dates, found or the host’s own.', steps: [['events', 'Local events', 's/events'], TILE] },
  { id: 'restaurants', c: 'clay', what: 'Eat and drink: the host’s own list, each place with its facts.', steps: [['restaurants', 'Eat and drink', 's/restaurants'], TILE] },
  { id: 'todo', c: 'olive', what: 'Attractions: only what the host chose, from the deck, the towns or their own words.', steps: [['todo', 'Attractions', 's/todo'], TILE] },
  { id: 'house', c: 'sea', what: 'The welcome card, the house page with its rooms, beds and what the place offers.', steps: [['housepage', 'The house page', 's/house']] },
  { id: 'rubbish', c: 'sea', what: 'Which bin goes out tonight, the containers and how to sort.', steps: [['rubbish', 'Rubbish', 's/garbage'], TILE] },
  { id: 'contacts', c: 'clay', what: 'Emergencies and useful numbers. Never the hosts’ own.', steps: [['contacts', 'Contacts', 's/emergency'], TILE] },
  { id: 'nightlife', c: 'night', what: 'Late bars, clubs and live music: the host’s own list, off unless switched on.', steps: [['nightlife', 'Nightlife', 's/nightlife'], TILE] },
  { id: 'houseguide', c: 'clay', what: 'How things work, part by part, with arrival and extras.', steps: [['howto', 'House guide', 's/message'], TILE] },
  { id: 'wifi', c: 'olive', what: 'The Wi-Fi sheet guests open from Home, with its code.', steps: [['wifi', 'Wi-Fi', 'home']] },
  { id: 'map', c: 'sea', what: 'The map with every place’s pin. It has no step of its own: its pins come from the lists.', steps: [['todo', 'Attractions (its pins)', 'map'], ['tiles', 'Its bar on Home', 'home']] },
  { id: 'look', c: 'lamp', what: 'The logo, the cover picture and the colours.', steps: [['look', 'The look', 'home']] }
];
const GUEST_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'], MAKER_LANGS = ['en', 'es', 'fr', 'ca'];
const LANG_NAMES = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const MORE_COUNTRIES = ['PT', 'FR', 'IT', 'AD', 'GR', 'HR', 'MT', 'CY', 'DE', 'NL', 'BE', 'GB', 'IE', 'AT', 'CH', 'DK', 'SE', 'NO', 'MA', 'TR', 'US', 'MX', 'CR', 'DO', 'CO', 'BR', 'AR', 'AE', 'TH', 'ID', 'PH', 'JP', 'AU', 'ZA'];
const STATES = [['new', 'New'], ['handed_out', 'Handed out'], ['done', 'Done']];
const KIND_NAMES = { city: 'City', coast: 'Coast', village: 'Village' };

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { return null; } })();
const countryName = c => { try { return (regions && regions.of(c)) || c; } catch (e) { return c; } };
const narrow = () => matchMedia('(max-width:899px)').matches;

const S = {
  user: null, avail: null, samples: [],                 // the session's user, the engine's list, the fixtures' list
  sw: {}, swOk: false, lc: {}, lcOk: false, houses: [], housesOk: false, fb: [], fbOk: false,   // from the database; Ok: the table answered
  country: '', askFor: '',                              // the country being prepared, and the part asked for there
  mod: null, tab: 'play', step: 0, side: 'host', fbPart: '', noteFor: '',
  house: '', lang: 'en', width: 'desktop'               // remembered on this device (MINE)
};
function mineLoad() { try { const o = JSON.parse(localStorage.getItem(MINE) || '{}') || {}; for (const k of ['house', 'lang', 'width']) if (o[k] !== undefined) S[k] = o[k]; } catch (e) { /* this device forgets */ } if (!GUEST_LANGS.includes(S.lang)) S.lang = 'en'; if (!['desktop', 'phone'].includes(S.width)) S.width = 'desktop'; }
function mineSave() { try { localStorage.setItem(MINE, JSON.stringify({ house: S.house, lang: S.lang, width: S.width })); } catch (e) { /* this device forgets */ } }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200); }

/* ---------- The session: the maker's own, read from this site's storage ---------- */
const authRead = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } };
const makerWin = () => { const f = $('#frMaker'); try { return f && f.contentWindow && f.contentWindow.document ? f.contentWindow : null; } catch (e) { return null; } };
// One renewal at a time: while a maker frame is open it renews the session itself (it holds the refresh token in memory,
// and a refresh token is used once), and this page reads what it stored. With no frame, this page renews and stores it
// the way the maker does.
async function token() {
  let a = authRead(); if (!a || !a.access_token) { const e = new Error('no session'); e.status = 401; throw e; }
  if (a.expires_at * 1000 - Date.now() > 60000) return a.access_token;
  const w = makerWin();
  if (w && typeof w.ensureFresh === 'function') { try { await w.ensureFresh(); a = authRead(); if (a && a.expires_at * 1000 - Date.now() > 60000) return a.access_token; } catch (e) { /* renewed below */ } }
  const r = await fetch(SB.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: a.refresh_token }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) { const e = new Error('session ended'); e.status = 401; throw e; }
  a = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) { /* kept for this page only */ }
  return a.access_token;
}
async function sb(path, o = {}) {
  const r = await fetch(SB.url + path, { method: o.method || 'GET', headers: { apikey: SB.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', ...(o.headers || {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  let j = null; try { j = await r.json(); } catch (e) { /* no body */ }
  if (!r.ok) { const e = new Error((j && (j.message || j.msg || j.error)) || 'HTTP ' + r.status); e.status = r.status; e.code = j && j.code; throw e; }
  return j;
}
const missing = e => e && (e.status === 404 || e.code === 'PGRST205' || e.code === 'PGRST202' || e.code === '42P01');   // the table or function is not in the database yet

/* ---------- Start ---------- */
function gate(title, text, link) {
  $('#main').innerHTML = `<section class="gate"><h1>${esc(title)}</h1><p>${esc(text)}</p>${link ? `<p><a class="btn" href="${esc(link[0])}">${esc(link[1])}</a></p>` : ''}</section>`;
}
async function start() {
  mineLoad();
  const a = authRead();
  if (!a || !a.access_token) return gate('Log in first', 'This page uses the maker’s login. Log in there, then come back to this address.', ['/', 'Open the maker']);
  S.user = a.user || {};
  let owner = false;
  try { owner = (await sb('/rest/v1/rpc/is_owner', { method: 'POST', body: {} })) === true; }
  catch (e) {
    if (e.status === 401) return gate('Log in again', 'Your session has ended. Log in to the maker, then come back to this address.', ['/', 'Open the maker']);
    if (missing(e)) return gate('Not set up yet', 'The database does not know this page yet: its tables and the owner’s rule are still to be created.');
    return gate('No connection', 'The database did not answer. Check your internet and reload the page.');
  }
  if (!owner) return gate('Not for this account', 'This page is the owner’s own. The maker is where guides are made.', ['/', 'Open the maker']);
  $('#who').textContent = S.user.email || '';
  const file = async f => { const r = await fetch(HERE + f, { cache: 'no-cache' }); if (!r.ok) throw new Error(f); return r.json(); };
  try { [S.avail, S.samples] = await Promise.all([file('available.json'), file('samples/index.json').catch(() => [])]); }
  catch (e) { return gate('A file is missing', 'The list of modules did not load. Reload the page.'); }
  await Promise.all([loadSwitches(), loadCountries(), loadHouses(), loadFeedback()]);
  addEventListener('hashchange', route); route();
  setInterval(watch, 4000);
}
async function loadSwitches() {
  try { const r = await sb('/rest/v1/module_switches?select=module,part,country,is_on,note,updated_at'); S.sw = {}; for (const x of r || []) S.sw[`${x.module}/${x.part}/${x.country}`] = x; S.swOk = true; }
  catch (e) { S.swOk = false; }
}
async function loadCountries() {
  try { const r = await sb('/rest/v1/launch_countries?select=country,state,updated_at'); S.lc = {}; for (const x of r || []) S.lc[x.country] = x; S.lcOk = true; }
  catch (e) { S.lcOk = false; }
}
async function loadHouses() {
  try { S.houses = (await sb('/rest/v1/guides?select=id,slug,status,name:content->site->>name,saved:draft->>savedAt&slug=like.sample-*&order=slug.asc')) || []; S.housesOk = true; }
  catch (e) { S.houses = []; S.housesOk = false; }
  if (!S.houses.some(h => h.slug === S.house)) S.house = (S.houses[0] || {}).slug || '';
}
async function loadFeedback() {
  try { S.fb = (await sb('/rest/v1/module_feedback?select=id,created_at,module,part,country,kind,words,across,seen,state&order=created_at.desc&limit=500')) || []; S.fbOk = true; }
  catch (e) { S.fb = []; S.fbOk = false; }
}

/* ---------- The list and the switches ---------- */
const availOf = id => (S.avail.modules || []).find(m => m.id === id) || { id, name: id, parts: [] };
const cur = () => MODS.find(m => m.id === S.mod);
const countries = () => [...new Set([...(S.avail.countries || []), ...Object.keys(S.lc), ...Object.values(S.sw).map(x => x.country)])];
// On or off, open or not: the engine's own rule (available.js, the copy build.mjs makes), given what this page holds.
// The page shows what the owner has set (avPartSet); a house gets it once its country is launched (avPartOn).
const launchNow = () => ({ countries: Object.values(S.lc), switches: Object.values(S.sw) });
const listSays = (p, c) => avListSays(p, c);
const swRow = (m, p, c) => S.sw[`${m}/${p}/${c}`];
const isOn = (m, p, c) => avPartSet(S.avail, launchNow(), `${m}/${p.id}`, c);
const newCount = id => S.fb.filter(f => f.module === id && f.state === 'new').length;
// A country is open when the owner opened it, or, with no word of his, when the code's list names it (Spain).
const stateOf = c => avCountryState(S.avail, launchNow(), c);
const STATE_NAMES = { open: 'Launched', preparing: 'Not launched yet' };
const allParts = () => MODS.flatMap(m => availOf(m.id).parts.map(p => ({ m, p })));
const asksFor = (mid, pid, c) => S.fb.filter(f => f.kind === 'request' && f.module === mid && f.part === pid && f.country === c);
const countryCount = c => { const all = allParts(); return { on: all.filter(x => isOn(x.m.id, x.p, c)).length, all: all.length, asked: S.fb.filter(f => f.kind === 'request' && f.country === c && f.state !== 'done').length }; };
async function countryPut(c, state) {
  const was = S.lc[c], row = { country: c, state, updated_at: new Date().toISOString() };
  S.lc[c] = row;
  try { await sb('/rest/v1/launch_countries?on_conflict=country', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row }); return true; }
  catch (e) { if (was) S.lc[c] = was; else delete S.lc[c]; toast('Not saved: ' + e.message); return false; }
}
function countryLine(m, c) {
  const ps = availOf(m.id).parts, on = ps.filter(p => isOn(m.id, p, c)).length;
  return `${countryName(c)}: ${on === ps.length ? (ps.length > 1 ? 'all ' + ps.length + ' parts' : 'on') : on === 0 ? 'off' : on + ' of ' + ps.length + ' parts'}`;
}

/* ---------- Routes: #/ the fourteen, #/<module>/<play|countries|feedback>, #/countries, #/country/<code> ---------- */
function route() {
  const [, id, tab] = location.hash.split('/');
  const m = MODS.find(x => x.id === id), inCountries = id === 'countries' || id === 'country';
  $$('.nav a').forEach(a => a.setAttribute('aria-current', String((a.dataset.nav === 'countries') === inCountries)));
  S.country = id === 'country' && /^[A-Z]{2}$/.test(tab || '') ? tab : '';
  if (inCountries) { stageDrop(); S.mod = null; fbClose(); return S.country ? countryView() : countriesView(); }
  if (!m) { stageDrop(); S.mod = null; fbClose(); return overview(); }
  const first = S.mod !== m.id;
  S.mod = m.id; S.tab = ['play', 'countries', 'feedback'].includes(tab) ? tab : 'play';
  if (first) { S.step = 0; S.fbPart = ''; S.noteFor = ''; }
  moduleView();
}
function overview() {
  document.title = 'Modules · Guest Guide Maker';
  const cs = countries();
  $('#main').innerHTML = `<section class="intro"><h1>The fourteen modules</h1>
<p>Each part of a guide, where it works, and how it looks to a host and to a guest. Open one to play with it on a sample house and to leave feedback for its conversation.</p></section>
<ol class="grid">${MODS.map((m, i) => { const a = availOf(m.id), n = newCount(m.id); return `<li><a class="mc" href="#/${m.id}/play" style="--tc:var(--${m.c})">
<span class="num" aria-hidden="true">${i + 1}</span><b>${esc(a.name)}</b>
<span class="parts">${a.parts.map(p => esc(p.name)).join(' · ')}</span>
<span class="where">${cs.map(c => esc(countryLine(m, c))).join(' · ')}</span>
${n ? `<span class="new">${n} new feedback</span>` : ''}</a></li>`; }).join('')}</ol>
${S.swOk ? '' : '<p class="quiet">Your switches are not in the database yet: the countries shown are the code’s own list.</p>'}`;
}
function moduleView() {
  const m = cur(), a = availOf(m.id), i = MODS.indexOf(m), n = newCount(m.id);
  document.title = a.name + ' · Modules';
  const tabs = [['play', 'Play'], ['countries', 'Countries'], ['feedback', 'Feedback' + (n ? ` (${n} new)` : '')]];
  stageDrop();
  $('#main').innerHTML = `<header class="mh" style="--tc:var(--${m.c})"><span class="num" aria-hidden="true">${i + 1}</span><div class="mt"><h1>${esc(a.name)}</h1><p>${esc(m.what)} <span class="conv">Conversation ${i + 1}</span></p></div>
<label class="jump"><span class="sr">Module</span><select id="jump">${MODS.map((x, k) => `<option value="${x.id}"${x === m ? ' selected' : ''}>${k + 1}. ${esc(availOf(x.id).name)}</option>`).join('')}</select></label></header>
<div class="tabs" role="tablist">${tabs.map(([id, t]) => `<a role="tab" href="#/${m.id}/${id}" aria-selected="${S.tab === id}">${esc(t)}</a>`).join('')}</div>
<section id="tab"></section>`;
  $('#jump').onchange = e => { location.hash = `#/${e.target.value}/${S.tab}`; };
  if (S.tab === 'play') play(); else if (S.tab === 'countries') countriesTab(); else feedbackTab();
}

/* ---------- Countries: the code's list, with the owner's switches ---------- */
function countriesTab() {
  fbClose();
  const m = cur(), a = availOf(m.id), cs = countries(), more = MORE_COUNTRIES.filter(c => !cs.includes(c));
  const cell = (p, c) => { const r = swRow(m.id, p.id, c), on = isOn(m.id, p, c), mine = r && !!r.is_on !== listSays(p, c);
    return `<div class="cc"><span class="cn">${esc(countryName(c))}</span>
<button class="sw" role="switch" aria-checked="${on}" data-sw="${esc(p.id)}/${esc(c)}" aria-label="${esc(p.name)} in ${esc(countryName(c))}"${S.swOk ? '' : ' disabled'}><i></i></button>
<span class="cs">${on ? 'On' : 'Off'}</span>
${mine ? `<button class="chip" data-back="${esc(p.id)}/${esc(c)}" title="Back to what the code says">Your change</button>` : ''}
<button class="link" data-note="${esc(p.id)}/${esc(c)}"${S.swOk ? '' : ' disabled'}>${r && r.note ? 'Edit the note' : 'Note'}</button></div>`; };
  const notes = p => cs.map(c => { const r = swRow(m.id, p.id, c), k = `${p.id}/${c}`;
    if (S.noteFor === k) return `<form class="nf" data-k="${esc(k)}"><label><span>Note for ${esc(countryName(c))}</span><input name="note" maxlength="300" value="${esc(r ? r.note : '')}" autocomplete="off"></label><button class="btn small">Save</button><button type="button" class="link" data-nocancel>Cancel</button></form>`;
    return r && r.note ? `<p class="note"><b>${esc(countryName(c))}:</b> ${esc(r.note)}</p>` : ''; }).join('');
  $('#tab').innerHTML = `${S.swOk ? '' : '<p class="warn">Your switches cannot be saved yet: their table is not in the database. What you see is the code’s own list.</p>'}
<div class="card ct">${a.parts.map(p => `<div class="part"><div class="pt"><b>${esc(p.name)}</b><p>${esc(p.why)}</p>${notes(p)}</div><div class="pcs">${cs.map(c => cell(p, c)).join('')}</div></div>`).join('')}</div>
<div class="addc"><label><span>Add a country</span><select id="addc"><option value="">Choose…</option>${more.map(c => `<option value="${c}">${esc(countryName(c))}</option>`).join('')}</select></label>
<p class="quiet">A switch records what you decide. The maker and the generator do not read it yet: that is the next step.</p></div>`;
  $$('[data-sw]').forEach(b => { b.onclick = () => { const [p, c] = b.dataset.sw.split('/'); swSet(p, c, { is_on: b.getAttribute('aria-checked') !== 'true' }); }; });
  $$('[data-back]').forEach(b => { b.onclick = () => { const [p, c] = b.dataset.back.split('/'); swBack(p, c); }; });
  $$('[data-note]').forEach(b => { b.onclick = () => { S.noteFor = b.dataset.note; countriesTab(); const i = $('.nf input'); if (i) i.focus(); }; });
  $$('.nf').forEach(f => { f.onsubmit = e => { e.preventDefault(); const [p, c] = f.dataset.k.split('/'); S.noteFor = ''; swSet(p, c, { note: f.note.value.trim() }); }; });
  $$('[data-nocancel]').forEach(b => { b.onclick = () => { S.noteFor = ''; countriesTab(); }; });
  $('#addc').onchange = async e => { const c = e.target.value; if (!c) return; if (await countryPut(c, 'preparing')) toast(`${countryName(c)} is being prepared: nothing is offered there until you launch it.`); countriesTab(); };
}
const swAgain = () => (S.country ? countryView() : countriesTab());
async function swSet(pid, c, change, mid = S.mod) {
  const m = MODS.find(x => x.id === mid), p = availOf(m.id).parts.find(x => x.id === pid), k = `${m.id}/${pid}/${c}`, was = S.sw[k];
  const row = { module: m.id, part: pid, country: c, is_on: isOn(m.id, p, c), note: was ? was.note : '', ...change, updated_at: new Date().toISOString() };
  S.sw[k] = row; swAgain();
  try { await sb('/rest/v1/module_switches?on_conflict=module,part,country', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: row }); }
  catch (e) { if (was) S.sw[k] = was; else delete S.sw[k]; swAgain(); toast('Not saved: ' + e.message); }
}
async function swBack(pid, c, mid = S.mod) {
  const m = MODS.find(x => x.id === mid), k = `${m.id}/${pid}/${c}`, was = S.sw[k]; if (!was) return;
  if (was.note) return swSet(pid, c, { is_on: listSays(availOf(m.id).parts.find(x => x.id === pid), c) }, mid);   // the note stays, the switch goes back
  delete S.sw[k]; swAgain();
  try { await sb(`/rest/v1/module_switches?module=eq.${m.id}&part=eq.${encodeURIComponent(pid)}&country=eq.${c}`, { method: 'DELETE' }); }
  catch (e) { S.sw[k] = was; swAgain(); toast('Not saved: ' + e.message); }
}

/* ---------- The launch desk: the countries, and preparing one (Yohann, 17 Nov 2026) ---------- */
function countriesView() {
  document.title = 'Countries · Modules';
  const cs = countries(), more = MORE_COUNTRIES.filter(c => !cs.includes(c));
  $('#main').innerHTML = `<section class="intro"><h1>Countries</h1>
<p>Where the maker works. Prepare a country to see, part by part, what works there already and what needs work, then launch it.</p></section>
<ol class="grid">${cs.map(c => { const n = countryCount(c), st = stateOf(c); return `<li><a class="mc cty" href="#/country/${c}"><b>${esc(countryName(c))}</b>
<span class="st st-${st}">${STATE_NAMES[st]}</span>
<span class="where">${n.on} of ${n.all} parts on</span>
${n.asked ? `<span class="parts">${n.asked} asked for</span>` : ''}</a></li>`; }).join('')}</ol>
<div class="addc"><label><span>Prepare a country</span><select id="addc"${S.lcOk ? '' : ' disabled'}><option value="">Choose…</option>${more.map(c => `<option value="${c}">${esc(countryName(c))}</option>`).join('')}</select></label>
<p class="quiet">${S.lcOk ? 'Preparing changes nothing for hosts: your switches for a country count once you launch it.' : 'Countries cannot be saved yet: their table is not in the database.'}</p></div>`;
  $('#addc').onchange = async e => { const c = e.target.value; if (c && await countryPut(c, 'preparing')) location.hash = '#/country/' + c; };
}
function countryView() {
  const c = S.country, name = countryName(c), st = stateOf(c), n = countryCount(c);
  document.title = name + ' · Countries';
  const rows = allParts(), works = rows.filter(x => listSays(x.p, c)), needs = rows.filter(x => !listSays(x.p, c));
  const sw = x => { const on = isOn(x.m.id, x.p, c); return `<button class="sw" role="switch" aria-checked="${on}" data-csw="${x.m.id}/${esc(x.p.id)}" aria-label="${esc(x.p.name)} in ${esc(name)}"${S.swOk ? '' : ' disabled'}><i></i></button><span class="cs">${on ? 'On' : 'Off'}</span>`; };
  const need = x => { const k = `${x.m.id}/${x.p.id}`, asks = asksFor(x.m.id, x.p.id, c);
    return `<div class="part"><div class="pt"><span class="pm">${esc(availOf(x.m.id).name)}</span><b>${esc(x.p.name)}</b><p>${esc(x.p.why)}</p>
<p class="needs"><b>To work in ${esc(name)}:</b> ${esc(x.p.needs || 'not said yet.')}</p>
${asks.map(f => `<p class="rq" data-state="${esc(f.state)}"><span class="chip${f.state === 'done' ? '' : ' on'}">${f.state === 'new' ? 'Asked' : f.state === 'handed_out' ? 'Being built' : 'Done'}</span> ${esc(f.words)}</p>`).join('')}
${S.askFor === k ? `<form class="nf af" data-k="${esc(k)}"><label><span>What do you want there?</span><textarea name="words" rows="3" maxlength="4000" required placeholder="In your own words. It goes to this module’s conversation."></textarea></label><button class="btn small">Ask for it</button><button type="button" class="link" data-askno>Cancel</button></form>` : ''}</div>
<div class="pcs"><div class="cc"><span class="cn">Launch with it?</span>${sw(x)}${S.askFor === k ? '' : `<button class="link" data-ask="${esc(k)}"${S.fbOk ? '' : ' disabled'}>${asks.length ? 'Ask again' : 'Ask for it'}</button>`}</div></div></div>`; };
  const byMod = MODS.map(m => ({ m, ps: works.filter(x => x.m === m) })).filter(g => g.ps.length);
  $('#main').innerHTML = `<header class="ch"><div class="mt"><p class="back"><a href="#/countries">All countries</a></p><h1>${esc(name)}</h1>
<p><span class="st st-${st}">${STATE_NAMES[st]}</span> ${n.on} of ${n.all} parts on${n.asked ? ` · ${n.asked} asked for` : ''}</p></div>
<button class="btn${st === 'open' ? ' ghost danger' : ''}" id="launch"${S.lcOk ? '' : ' disabled'}>${st === 'open' ? 'Close ' + esc(name) : 'Launch ' + esc(name)}</button></header>
<p class="quiet">${st === 'open' ? 'Launched: a house there gets the parts that are on below.' : 'Not launched yet: a house there gets only the parts that work everywhere. Choose what it launches with, then launch: your switches count from then.'} The maker and the generator do not read this yet: that is being built.</p>
${needs.length ? `<section class="cz"><h2>Needs work there <span class="cnt">${needs.length}</span></h2>
<p class="quiet">Each is off unless you say otherwise. Launch without it, or ask for it: your words go to its module’s conversation.</p>
<div class="card ct">${needs.map(need).join('')}</div></section>` : ''}
<section class="cz"><h2>Works there already <span class="cnt">${works.length}</span></h2>
<p class="quiet">No tie to a country was found in the code. None has been tried outside Spain yet.</p>
<div class="card wk">${byMod.map(g => `<div class="wm"><b>${esc(availOf(g.m.id).name)}</b><div class="wps">${g.ps.map(x => `<span class="wp"><span class="wn">${esc(x.p.name)}</span>${sw(x)}</span>`).join('')}</div></div>`).join('')}</div></section>`;
  $$('[data-csw]').forEach(b => { b.onclick = () => { const [mid, pid] = b.dataset.csw.split('/'); swSet(pid, c, { is_on: b.getAttribute('aria-checked') !== 'true' }, mid); }; });
  $$('[data-ask]').forEach(b => { b.onclick = () => { S.askFor = b.dataset.ask; countryView(); const t = $('.af textarea'); if (t) t.focus(); }; });
  $$('[data-askno]').forEach(b => { b.onclick = () => { S.askFor = ''; countryView(); }; });
  $$('.af').forEach(f => { f.onsubmit = async e => { e.preventDefault(); const [mid, pid] = f.dataset.k.split('/'), words = f.words.value.trim(); if (!words) return;
    try { const r = await sb('/rest/v1/module_feedback', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { module: mid, part: pid, country: c, kind: 'request', words, across: false, seen: { tab: 'country', at: new Date().toISOString() } } });
      if (r && r[0]) S.fb.unshift(r[0]); S.askFor = ''; toast('Asked. It waits for its module’s conversation.'); } catch (er) { toast('Not saved: ' + er.message); }
    countryView(); }; });
  $('#launch').onclick = async e => { const b = e.currentTarget, open = st === 'open';
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Sure? Tap again'; setTimeout(() => { if (b.isConnected) countryView(); }, 4000); return; }
    if (await countryPut(c, open ? 'preparing' : 'open')) toast(open ? `${name} is closed again.` : `${name} is launched with ${countryCount(c).on} parts.`);
    countryView(); };
}

/* ---------- Play: the maker's real step beside the real guest page, on a sample house ---------- */
const houseNow = () => S.houses.find(h => h.slug === S.house);
const sampleOf = slug => S.samples.find(x => x.slug === slug) || { slug, name: slug, kind: '', town: '' };
const houseLabel = h => { const x = sampleOf(h.slug); return [KIND_NAMES[x.kind] || x.name, x.town].filter(Boolean).join(' · '); };
function play() {
  const m = cur(), h = houseNow();
  if (!S.housesOk || !S.houses.length) { stageDrop();
    $('#tab').innerHTML = `<div class="card empty"><h2>The sample houses are not in the database yet</h2>
<p>Playing needs houses of your own to try things on: made-up houses at public town centres, never shown to guests, put back with one Reset.</p>
${S.samples.length ? `<ul>${S.samples.map(x => `<li><b>${esc(KIND_NAMES[x.kind] || x.kind)}:</b> ${esc(x.name)}, ${esc(x.town)}</li>`).join('')}</ul>` : ''}</div>`; return; }
  const small = narrow();
  const seg = (name, items, val) => small && (name === 'house' || name === 'step')
    ? `<select data-pick="${name}">${items.map(([v, t]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`
    : `<div class="seg" role="group" aria-label="${esc(name)}">${items.map(([v, t]) => `<button data-${name}="${esc(v)}" aria-pressed="${v === val}">${esc(t)}</button>`).join('')}</div>`;
  $('#tab').innerHTML = `<div class="bar">
<label class="ctl"><span>House</span>${seg('house', S.houses.map(x => [x.slug, houseLabel(x)]), S.house)}</label>
${m.steps.length > 1 ? `<label class="ctl"><span>Step</span>${seg('step', m.steps.map((s, i) => [String(i), s[1]]), String(S.step))}</label>` : ''}
<label class="ctl"><span>Language</span><select id="lang">${GUEST_LANGS.map(l => `<option value="${l}"${l === S.lang ? ' selected' : ''}>${esc(LANG_NAMES[l])}</option>`).join('')}</select></label>
<label class="ctl wide-only"><span>Width</span>${seg('width', [['desktop', 'Desktop'], ['phone', 'Phone']], S.width)}</label>
<label class="ctl narrow-only"><span>Side</span>${seg('side', [['host', 'Host'], ['guest', 'Guest']], S.side)}</label>
<span class="acts"><button class="btn ghost danger" id="reset">Reset the house</button><button class="btn" id="fbOpen">Feedback</button></span></div>
<p class="quiet pn"><span id="playNote"></span><button class="link" id="reload">Reload</button></p>
<div id="stage" data-mod="${m.id}"></div>`;
  const houseTo = v => { S.house = v; mineSave(); stageDrop(); play(); }, stepTo = v => { S.step = +v; press('step', String(S.step)); stepGo(); };
  $$('[data-house]').forEach(b => { b.onclick = () => houseTo(b.dataset.house); });
  $$('[data-step]').forEach(b => { b.onclick = () => stepTo(b.dataset.step); });
  $$('[data-pick]').forEach(sel => { sel.onchange = () => (sel.dataset.pick === 'house' ? houseTo : stepTo)(sel.value); });
  $$('[data-width]').forEach(b => { b.onclick = () => { S.width = b.dataset.width; mineSave(); stageDrop(); play(); }; });
  $$('[data-side]').forEach(b => { b.onclick = () => { S.side = b.dataset.side; press('side', S.side); $('#stage').dataset.side = S.side; }; });
  $('#lang').onchange = e => { S.lang = e.target.value; mineSave(); stageDrop(); play(); };
  $('#reload').onclick = () => { stageDrop(); play(); };
  $('#reset').onclick = e => resetHouse(e.currentTarget);
  $('#fbOpen').onclick = fbOpen;
  stageMount();
}
const press = (name, val) => $$(`[data-${name}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[name] === val)));
const stepNow = () => cur().steps[S.step] || cur().steps[0];
const makerLang = () => MAKER_LANGS.includes(S.lang) ? S.lang : 'en';
const guestUrl = (h, screen) => `/g/${encodeURIComponent(h.slug)}?preview&lang=${S.lang}#${screen}`;
function stageMount() {
  const h = houseNow(), st = stepNow(), stage = $('#stage'), mode = narrow() ? 'small' : S.width;
  stage.dataset.mode = mode; stage.dataset.side = S.side; stage.dataset.house = h.id;
  const filled = !!h.name;
  $('#playNote').textContent = !filled ? 'This house is empty. “Reset the house” fills it with its sample content.'
    : (MAKER_LANGS.includes(S.lang) ? '' : `The maker has no ${LANG_NAMES[S.lang]}: it stays in English, the guide is in ${LANG_NAMES[S.lang]}. `) + 'Changes stay a draft on the sample house. Paid searches are off.';
  if (!filled) { stage.innerHTML = ''; return; }
  // The maker opens the house this device remembers (src/account.js, porta-house-v1): the sample house while playing,
  // the owner's own house again when the page is left (houseBack). The guide inside the maker's own phone reads its
  // language from this device too.
  try {
    if (sessionStorage.getItem(OWN_HOUSE) === null) { const own = localStorage.getItem(HOUSE_KEY) || ''; let id = ''; try { id = (JSON.parse(own) || {}).id || ''; } catch (e) { /* none */ } sessionStorage.setItem(OWN_HOUSE, S.houses.some(x => x.id === id) ? '' : own); }
    localStorage.setItem(HOUSE_KEY, JSON.stringify({ acct: S.user.id, id: h.id }));
    localStorage.setItem(h.slug + '-lang', S.lang);
  } catch (e) { /* storage blocked: the maker opens its own house, and watch() says so */ }
  const maker = `<iframe id="frMaker" title="The maker, as a host sees it" src="/?step=${encodeURIComponent(st[0])}&lang=${makerLang()}"></iframe>`;
  const guest = `<iframe id="frGuest" title="The guide, as a guest sees it" src="${esc(guestUrl(h, st[2]))}"></iframe>`;
  stage.innerHTML = mode === 'desktop'
    ? `<div class="desk" id="desk">${maker}</div>`
    : `<figure class="dev host"><figcaption>Host · the maker</figcaption><div class="scr">${maker}</div></figure>
<figure class="dev guest"><figcaption>Guest · the guide <button class="link" id="guestReload">Reload</button></figcaption><div class="scr">${guest}</div></figure>`;
  const gr = $('#guestReload'); if (gr) gr.onclick = guestReload;
  S.savedSeen = h.saved || ''; deskFit();
}
function deskFit() { const d = $('#desk'), f = d && d.firstElementChild; if (!f) return; const k = Math.min(1, d.clientWidth / 1280); f.style.transform = `scale(${k})`; f.style.height = Math.ceil(d.clientHeight / k) + 'px'; }
addEventListener('resize', () => { const s = $('#stage'); if (!s || !s.dataset.mode) return; const mode = narrow() ? 'small' : S.width; if (mode !== s.dataset.mode) { stageDrop(); play(); } else deskFit(); });
function stepGo() {
  const st = stepNow(), w = makerWin(), g = $('#frGuest');
  try { if (w && w.location.hash !== '#' + st[0]) w.location.hash = '#' + st[0]; } catch (e) { /* still loading: its address already asks for a step */ }
  try { if (g && g.contentWindow.location.hash !== '#' + st[2]) g.contentWindow.location.hash = '#' + st[2]; } catch (e) { /* still loading */ }
}
function guestReload() { const g = $('#frGuest'); if (!g) return; try { g.contentWindow.location.reload(); } catch (e) { g.src = g.src; } }
function stageDrop() { const s = $('#stage'); if (s) { s.innerHTML = ''; delete s.dataset.mod; } houseBack(); }
// The owner's own house, as this device remembered it before playing.
function houseBack() { try { const own = sessionStorage.getItem(OWN_HOUSE); if (own === null) return; sessionStorage.removeItem(OWN_HOUSE); if (own) localStorage.setItem(HOUSE_KEY, own); else localStorage.removeItem(HOUSE_KEY); } catch (e) { /* storage blocked */ } }
addEventListener('pagehide', houseBack);
// Every few seconds while playing: the guest side follows what the maker saved, and the maker must still be on the
// sample house (its houses menu can open another one: then the frames go, never a real house played with by mistake).
async function watch() {
  const s = $('#stage'), h = houseNow(); if (!s || !s.dataset.mod || !h || document.hidden || !$('#frMaker')) return;
  let id = ''; try { id = (JSON.parse(localStorage.getItem(HOUSE_KEY) || 'null') || {}).id || ''; } catch (e) { /* none */ }
  if (id !== h.id) { try { sessionStorage.removeItem(OWN_HOUSE); } catch (e) { /* storage blocked */ } s.innerHTML = '<div class="card empty"><h2>The maker opened another house</h2><p>Playing happens on sample houses only, so the frames were closed. “Reload” opens the sample house again.</p></div>'; return; }
  if (!$('#frGuest')) return;
  try { const r = await sb(`/rest/v1/guides?select=saved:draft->>savedAt&id=eq.${h.id}`), at = (r && r[0] && r[0].saved) || ''; if (at !== S.savedSeen) { S.savedSeen = at; guestReload(); } } catch (e) { /* the next look tries again */ }
}
// Reset: the house's row gets its fixture back (samples/<slug>.json, made by samples/make.mjs) and loses its draft. Event
// dates move with today, so a sample house always has events ahead.
async function resetHouse(btn) {
  const h = houseNow(); if (!h) return;
  if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Sure? Tap again'; setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ''; btn.textContent = 'Reset the house'; } }, 4000); return; }
  btn.disabled = true; btn.textContent = 'Resetting…';
  try {
    const r = await fetch(`${HERE}samples/${encodeURIComponent(h.slug)}.json`, { cache: 'no-cache' }); if (!r.ok) throw new Error('its sample content did not load');
    const fx = await r.json(), content = fx.content, days = Math.round((Date.now() - Date.parse(fx.base + 'T12:00:00Z')) / 864e5);
    if (!content || !content.site || !content.files) throw new Error('its sample content is not whole');
    if (days > 0 && content.files.events) content.files.events = JSON.parse(JSON.stringify(content.files.events).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, d => new Date(Date.parse(d + 'T12:00:00Z') + days * 864e5).toISOString().slice(0, 10)));
    await sb('/rest/v1/guides?id=eq.' + h.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { content, theme: fx.theme || {}, draft: null } });
    await loadHouses(); toast(`${houseLabel(h)} is back to its sample content.`);
  } catch (e) { toast('Not reset: ' + e.message); }
  stageDrop(); play();
}

/* ---------- Feedback: his words, with what he was looking at ---------- */
const frameHash = w => { try { return decodeURIComponent(w.location.hash.replace(/^#\/?/, '')); } catch (e) { return ''; } };
function seenNow() {
  const o = { tab: S.tab }, h = houseNow(), st = cur() ? stepNow() : null, w = makerWin(), g = $('#frGuest');
  if (S.tab !== 'play' || !h || !$('#frMaker')) return o;
  let inner = null; try { inner = w && w.document.getElementById('cmPhoneFrame'); } catch (e) { /* none */ }
  return { ...o, house: h.slug, lang: S.lang, makerLang: makerLang(), width: narrow() ? 'phone (a small screen)' : S.width, side: narrow() ? S.side : 'both',
    step: (w && frameHash(w)) || st[0], guest: (g && frameHash(g.contentWindow)) || (inner && frameHash(inner.contentWindow)) || st[2] };
}
const stepName = id => { for (const m of MODS) for (const st of m.steps) if (st[0] === id && st !== TILE) return st[1]; return id === 'tiles' ? 'Home page' : id; };
const seenWords = s => [s.step && 'the step ' + stepName(s.step), s.guest && 'the guide on ' + s.guest, s.house && (houseLabel({ slug: s.house }) || s.house), s.lang && (LANG_NAMES[s.lang] || s.lang), s.width, !s.step && s.tab && 'the ' + s.tab + ' tab'].filter(Boolean);
function fbBox(where) {
  const m = cur(), a = availOf(m.id), s = seenNow();
  return `<form class="fbf" data-where="${where}"><h2>Feedback on ${esc(a.name)}</h2>
${a.parts.length > 1 ? `<div class="ctl"><span>Part</span><div class="chips">${[['', 'The whole module'], ...a.parts.map(p => [p.id, p.name])].map(([v, t]) => `<button type="button" class="pick" data-part="${esc(v)}" aria-pressed="${v === S.fbPart}">${esc(t)}</button>`).join('')}</div></div>` : ''}
<label class="ctl"><span>Your words</span><textarea name="words" rows="5" maxlength="4000" required placeholder="What you expected, what happened."></textarea></label>
<label class="tick"><input type="checkbox" name="across"> <span>It affects other modules: for the main conversation</span></label>
<p class="quiet seen">Saved with it: ${seenWords(s).map(esc).join(' · ')}</p>
<div class="acts"><button class="btn"${S.fbOk ? '' : ' disabled'}>Save the feedback</button>${where === 'side' ? '<button type="button" class="link" data-fbclose>Close</button>' : ''}</div>
${S.fbOk ? '' : '<p class="warn">Feedback cannot be saved yet: its table is not in the database.</p>'}</form>`;
}
function fbWire(root) {
  $$('[data-part]', root).forEach(b => { b.onclick = () => { S.fbPart = b.dataset.part; $$('[data-part]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; });
  const c = $('[data-fbclose]', root); if (c) c.onclick = fbClose;
  const f = $('.fbf', root); if (!f) return;
  f.words.onfocus = () => { $('.seen', f).textContent = 'Saved with it: ' + seenWords(seenNow()).join(' · '); };
  f.onsubmit = async e => { e.preventDefault(); const words = f.words.value.trim(); if (!words) return;
    const b = $('button.btn', f); b.disabled = true;
    try {
      const r = await sb('/rest/v1/module_feedback', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { module: S.mod, part: S.fbPart || null, words, across: f.across.checked, seen: { ...seenNow(), at: new Date().toISOString() } } });
      if (r && r[0]) S.fb.unshift(r[0]); f.words.value = ''; f.across.checked = false;
      toast(f.dataset.where === 'side' ? 'Saved. It waits under Feedback for its conversation.' : 'Saved.');
      if (S.tab === 'feedback') feedbackTab(); else { const t = $('.tabs a:last-child'), n = newCount(S.mod); if (t) t.textContent = 'Feedback' + (n ? ` (${n} new)` : ''); }
    } catch (er) { toast('Not saved: ' + er.message); }
    b.disabled = false; };
}
function fbOpen() { const el = $('#fb'); el.innerHTML = fbBox('side'); el.hidden = false; document.body.classList.add('fb-open'); fbWire(el); deskFit(); const t = $('textarea', el); if (t) t.focus(); }
function fbClose() { const el = $('#fb'); if (el.hidden) return; el.hidden = true; el.innerHTML = ''; document.body.classList.remove('fb-open'); deskFit(); }
function feedbackTab() {
  fbClose();
  const m = cur(), a = availOf(m.id), mine = S.fb.filter(f => f.module === m.id);
  const item = f => { const s = f.seen || {}, p = a.parts.find(x => x.id === f.part);
    return `<li class="fi" data-state="${esc(f.state)}"><p class="fw">${esc(f.words)}</p>
<p class="fm">${[new Date(f.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), p && p.name, ...seenWords(s)].filter(Boolean).map(esc).join(' · ')}</p>
<div class="fa">${f.kind === 'request' ? `<span class="chip on">Asked for ${esc(countryName(f.country || ''))}</span>` : ''}${f.across ? '<span class="chip on">For the main conversation</span>' : `<span class="chip">For conversation ${MODS.indexOf(m) + 1}</span>`}
<label><span class="sr">State</span><select data-state-of="${f.id}">${STATES.map(([v, t]) => `<option value="${v}"${v === f.state ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
<button class="link danger" data-del="${f.id}">Delete</button></div></li>`; };
  $('#tab').innerHTML = `<div class="fbt"><div class="card">${fbBox('tab')}</div>
<div><p class="quiet">A page cannot wake a conversation: the main conversation reads what is new here and hands it to the module’s conversation, then marks it handed out.</p>
${mine.length ? `<ul class="fl">${mine.map(item).join('')}</ul>` : '<p class="quiet">No feedback on this module yet.</p>'}</div></div>`;
  fbWire($('#tab'));
  $$('[data-state-of]').forEach(sel => { sel.onchange = async () => { const f = S.fb.find(x => String(x.id) === sel.dataset.stateOf), was = f.state; f.state = sel.value;
    try { await sb('/rest/v1/module_feedback?id=eq.' + f.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { state: f.state, state_at: new Date().toISOString() } }); } catch (e) { f.state = was; toast('Not saved: ' + e.message); }
    moduleView(); }; });
  $$('[data-del]').forEach(b => { b.onclick = async () => {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Sure? Tap again'; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = 'Delete'; } }, 4000); return; }
    try { await sb('/rest/v1/module_feedback?id=eq.' + b.dataset.del, { method: 'DELETE' }); S.fb = S.fb.filter(x => String(x.id) !== b.dataset.del); } catch (e) { toast('Not deleted: ' + e.message); }
    moduleView(); }; });
}

start();
