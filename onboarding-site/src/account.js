/* ---------- Accounts (Supabase): sign up, log in, answers saved to the account ---------- */
const SB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values: the database rules decide who sees what
const AUTH_KEY = 'porta-auth-v1';
let AUTH = null, GUIDE = null, pushTimer = null, pushing = false, pushAgain = false;
function authLoad(){ try { AUTH = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { AUTH = null; } }
function authStore(s){ AUTH = s; try { s ? localStorage.setItem(AUTH_KEY, JSON.stringify(s)) : localStorage.removeItem(AUTH_KEY); } catch (e) {} }
async function sb(path, o = {}){
  const r = await fetch(SB.url + path, { method: o.method || 'GET', headers: { apikey: SB.key, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (o.token || (AUTH && AUTH.access_token) || SB.key), ...(o.headers || {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const er = new Error((j && (j.msg || j.error_description || j.message || j.error)) || ('HTTP ' + r.status)); er.status = r.status; er.body = j; throw er; }
  return j;
}
function toSession(j){ return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user }; }
async function ensureFresh(){
  if (!AUTH) throw new Error('no session');
  if (AUTH.expires_at * 1000 - Date.now() > 60000) return;
  const j = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: AUTH.refresh_token }, token: SB.key });
  authStore(toSession(j));
}
function niceError(e){
  const m = String(e && e.message || '');
  if (/invalid login/i.test(m)) return 'Wrong email or password.';
  if (/already registered|already been registered/i.test(m)) return 'This email already has an account. Log in instead.';
  if (/password/i.test(m) && /(6|8|short|weak|least)/i.test(m)) return 'Choose a password of at least 8 characters.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  if (/email/i.test(m) && /(valid|invalid)/i.test(m)) return 'That email address does not look right.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m || 'Something went wrong. Try again.';
}

/* The sign-in screen: shown before anything else, so every answer belongs to an account. */
(function(){
  const st = document.createElement('style');
  st.textContent = `#acct{position:fixed;inset:0;z-index:200;background:var(--paper);display:flex;align-items:flex-start;justify-content:center;padding:max(24px,8vh) 16px 40px;overflow:auto}
#acct .ac{width:100%;max-width:420px}
#acct .ab{display:flex;align-items:center;gap:10px;margin-bottom:26px;font-family:var(--display,inherit);font-size:22px}
#acct h1{font-size:34px;line-height:1.05;margin:0 0 10px;letter-spacing:-.01em}
#acct p.lead{margin:0 0 22px;color:var(--muted);font-size:16px;line-height:1.45}
#acct label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
#acct input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:13px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
#acct input:focus{outline:2px solid var(--pine);outline-offset:1px}
#acct .go{margin-top:20px;width:100%;font:inherit;font-weight:700;font-size:16px;padding:14px;border-radius:999px;border:0;background:var(--sun);color:#1b1407;cursor:pointer}
#acct .go[disabled]{opacity:.6;cursor:wait}
#acct .alt{margin-top:16px;text-align:center;font-size:14px;color:var(--muted)}
#acct .alt button{font:inherit;background:none;border:0;color:var(--pine);font-weight:700;text-decoration:underline;cursor:pointer;padding:0}
#acct .acmsg{margin-top:14px;font-size:14px;min-height:20px;color:var(--tomato)}
#acct .acmsg.ok{color:var(--pine)}
#acct .small{margin-top:22px;font-size:12.5px;color:var(--faint);line-height:1.5}
/* Account row under the header: in the page flow, so it never sits on the step bar. */
#acctbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin:-4px 0 2px}
#acctbar:empty{display:none}
#acctbar button{font:600 13px/1 inherit;font-family:inherit;padding:9px 14px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--paper,#fff);color:inherit;cursor:pointer}
/* Houses: one account, several houses; the one being edited, and a menu to pick another or add one */
#acctbar .houses{position:relative;margin-right:auto;min-width:0}
#acctbar .houses>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;font:600 13px/1.2 inherit;font-family:inherit;padding:8px 14px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--paper,#fff);max-width:calc(100vw - 150px)}
#acctbar .houses>summary::-webkit-details-marker{display:none}
#acctbar .houses>summary b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#acctbar .houses>summary::after{content:"";flex:none;width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin:0 2px 3px 4px}
#acctbar .hmenu{position:absolute;left:0;top:calc(100% + 6px);z-index:60;width:min(320px,calc(100vw - 32px));background:var(--surface,#fff);border:1px solid var(--line,#ccc);border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.14);padding:6px;display:flex;flex-direction:column;gap:2px}
#acctbar .hmenu button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px;cursor:pointer;font:inherit}
#acctbar .hmenu button:hover,#acctbar .hmenu button:focus-visible{background:var(--sunk,#f3f1ec)}
#acctbar .hmenu button[aria-current=true]{background:var(--sunk,#f3f1ec)}
#acctbar .hmenu b{font-size:15px;overflow-wrap:anywhere}
#acctbar .hmenu small{font-size:12.5px;color:var(--muted,#666)}
#acctbar .hmenu .add{border-top:1px solid var(--line,#ddd);border-radius:0 0 10px 10px;margin-top:4px;font-weight:700}`;
  document.head.appendChild(st);
})();

function gate(mode0, notice){
  return new Promise(resolve => {
    let mode = mode0 || 'signup';
    const el = document.getElementById('acct') || Object.assign(document.createElement('div'), { id: 'acct' });
    if (!el.isConnected) document.body.appendChild(el);
    const draw = (msg, ok) => {
      const up = mode === 'signup', rec = mode === 'recover', reset = mode === 'reset';
      el.innerHTML = `<div class="ac"><div class="ab">Guest Guide Maker</div>
        <h1>${reset ? 'Choose a new password' : rec ? 'Reset your password' : up ? 'Create your account' : 'Welcome back'}</h1>
        <p class="lead">${reset ? 'Pick a new password, then you are back in.' : rec ? 'We email you a link to choose a new password.' : up ? 'So you can come back any time and change your answers. It takes a minute.' : 'Log in to continue where you left off.'}</p>
        <form id="acForm" novalidate>
          ${reset ? '' : '<label for="acEmail">Email</label><input id="acEmail" type="email" autocomplete="email" inputmode="email" required>'}
          ${rec ? '' : `<label for="acPw">${reset ? 'New password' : 'Password'}</label><input id="acPw" type="password" autocomplete="${up || reset ? 'new-password' : 'current-password'}" ${up || reset ? 'minlength="8" placeholder="At least 8 characters"' : ''} required>`}
          <button class="go" type="submit">${reset ? 'Save password' : rec ? 'Send me the link' : up ? 'Create my account' : 'Log in'}</button>
          <div class="acmsg${ok ? ' ok' : ''}" id="acMsg" role="status">${esc(msg || notice || '')}</div>
        </form>
        <div class="alt">${rec || reset ? '<button type="button" data-m="login">Back to log in</button>' : up ? 'Already have an account? <button type="button" data-m="login">Log in</button>' : 'New here? <button type="button" data-m="signup">Create an account</button> · <button type="button" data-m="recover">Forgot password?</button>'}</div>
        ${up ? '<p class="small">By creating an account you agree that we store your answers and photos to build your guide, and that we may contact you about it.</p>' : ''}</div>`;
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      const f = el.querySelector('#acForm'), m = el.querySelector('#acMsg');
      f.onsubmit = async ev => {
        ev.preventDefault();
        const email = ((el.querySelector('#acEmail') || {}).value || '').trim(), pw = (el.querySelector('#acPw') || {}).value || '';
        const btn = f.querySelector('.go'); m.className = "acmsg"; m.textContent = '';
        if (!reset && !/^\S+@\S+\.\S+$/.test(email)) { m.textContent = 'That email address does not look right.'; return; }
        if ((up || reset) && pw.length < 8) { m.textContent = 'Choose a password of at least 8 characters.'; return; }
        if (mode === 'login' && !pw) { m.textContent = 'Enter your password.'; return; }
        btn.disabled = true;
        try {
          if (rec) { await sb('/auth/v1/recover', { method: 'POST', body: { email }, token: SB.key }); mode = 'login'; draw('If that email has an account, a link is on its way. Check your inbox.', true); return; }
          if (reset) { await sb('/auth/v1/user', { method: 'PUT', body: { password: pw } }); history.replaceState(null, '', location.pathname); el.remove(); resolve(true); return; }
          if (up) {
            const j = await sb('/auth/v1/signup', { method: 'POST', body: { email, password: pw }, token: SB.key });
            if (j && j.access_token) { authStore(toSession(j)); try { await nf('signup', { sid, email, device: deviceLine(device()) }); } catch (e) {} el.remove(); resolve(true); return; }
            mode = 'login'; draw('Almost there: we sent a confirmation link to ' + email + '. Open it, then log in here.', true); return;
          }
          const j = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: pw }, token: SB.key });
          authStore(toSession(j)); el.remove(); resolve(true);
        } catch (e) { btn.disabled = false; m.className = "acmsg"; m.textContent = niceError(e); }
      };
      setTimeout(() => { const i = el.querySelector('input'); if (i) i.focus(); }, 30);
    };
    draw();
  });
}

// Links in confirmation and reset emails come back as /#access_token=...&type=signup|recovery.
async function acctHash(){
  const h = location.hash.replace(/^#/, '');
  if (!/access_token=/.test(h)) return null;
  const p = new URLSearchParams(h);
  const tok = p.get('access_token'), type = p.get('type');
  if (!tok) return null;
  try {
    const user = await sb('/auth/v1/user', { token: tok });
    authStore({ access_token: tok, refresh_token: p.get('refresh_token'), expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600), user });
    history.replaceState(null, '', location.pathname);
    if (type === 'signup') { try { await nf('signup', { sid, email: user.email, device: deviceLine(device()) }); } catch (e) {} }
    return type;
  } catch (e) { history.replaceState(null, '', location.pathname); return null; }
}

const cleanForAccount = () => {
  const p = { ...A }; delete p._log; delete p._sessions;
  p._remote = uploads.filter(u => u.remote).map(u => { const r = { ...u }; delete r.blob; return r; });
  p._uploads = uploads.filter(u => !u.remote && u.path).map(u => ({ kind: u.kind, path: u.path, room: u.room || '', name: u.name || '' }));
  return p;
};
async function wipeLocal(){
  A = {}; try { for (const u of await idb.all()) await idb.del(u.id); } catch (e) {} uploads = []; try { localStorage.removeItem(KEY); } catch (e) {}
}
async function adoptRemote(remote){
  const r = { ...remote }, photos = r._remote || [], own = (r._uploads || []).filter(u => u && u.path); delete r._remote; delete r._uploads;
  for (const u of uploads.filter(x => x.remote || x.path)) { try { await idb.del(u.id); } catch (e) {} }
  const sent = own.map(u => ({ id: u.path.split('/').pop().replace(/\.jpg$/, ''), kind: u.kind, name: u.name || '', room: u.room || '', path: u.path, url: `${SB.url}/storage/v1/object/public/guide-assets/${u.path}`, createdAt: '' }));
  A = r; uploads = [...uploads.filter(u => !u.remote && !u.path), ...photos, ...sent];
  for (const u of [...photos, ...sent]) await saveUpload(u);
}
// One account, several houses (decided 28 Oct 2026). The house being edited is remembered on this device, per account;
// what this device holds (answers, photos not sent yet) belongs to one house only (A._house).
const HOUSE_KEY = 'porta-house-v1';
let HOUSES = [];
const houseSaved = uid => { try { const h = JSON.parse(localStorage.getItem(HOUSE_KEY) || 'null'); return h && h.acct === uid ? h.id : null; } catch (e) { return null; } };
const houseSave = (uid, id) => { try { localStorage.setItem(HOUSE_KEY, JSON.stringify({ acct: uid, id })); } catch (e) { /* this device forgets the choice */ } };
async function acctAttach(){
  const user = AUTH.user || {};
  if (A._acct && A._acct !== user.id) await wipeLocal();     // someone else used this device before: never mix their answers in
  HOUSES = (await sb('/rest/v1/guides?select=id,slug,status,origin,name:content->site->>name,guideName:answers->>guideName,place:answers->>placeName&order=created_at.asc')) || [];
  const pick = HOUSES.find(h => h.id === houseSaved(user.id)) || HOUSES[0];
  if (pick && A._house && A._house !== pick.id) await wipeLocal();     // this device's answers are another house's
  const rows = pick ? await sb('/rest/v1/guides?select=id,answers,status,slug,origin,content,theme,draft&id=eq.' + pick.id) : null;
  const local = !!((A._seen && A._seen.length) || A.listingUrl);
  if (rows && rows[0]) {
    GUIDE = rows[0];
    const rT = (GUIDE.answers || {})._savedAt || 0, lT = A._savedAt || 0;
    if (rT && (rT > lT || !local)) { await adoptRemote(GUIDE.answers); }
  } else {
    const made = await sb('/rest/v1/guides', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner: user.id, answers: cleanForAccount() } });
    GUIDE = made && made[0]; if (GUIDE) HOUSES.push({ id: GUIDE.id, status: GUIDE.status });
  }
  if (GUIDE) houseSave(user.id, GUIDE.id);
  A._acct = user.id; A._house = GUIDE && GUIDE.id; flush();
  if (local) acctQueue();
}
// Once the guide exists (CM.on), the steps edit the guide itself and the answers are not saved any more.
function acctQueue(){ if (!AUTH || !GUIDE || CM.on) return; clearTimeout(pushTimer); pushTimer = setTimeout(acctPush, 1500); }
async function acctPush(){
  if (window.__resetting || !AUTH || !GUIDE || GUIDE.origin === 'imported' || CM.on) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  try {
    await ensureFresh();
    const body = { answers: cleanForAccount() };
    if (A.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(A.slug) && A.slug !== GUIDE.slug) body.slug = A.slug;
    try { await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', body }); if (body.slug) GUIDE.slug = body.slug; }
    catch (e) { if (e.status === 409 && body.slug) { delete body.slug; await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', body }); } else throw e; }
    setSave('ok', 'Saved to your account');
  } catch (e) { setSave('err', 'Saved on this device, not yet to your account'); }
  pushing = false; if (pushAgain) { pushAgain = false; acctQueue(); }
}
window.__acctPush = acctQueue;
async function acctReset(){
  if (AUTH && GUIDE) { try { await ensureFresh(); await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', body: { answers: {}, slug: null } }); } catch (e) {} }
}
async function acctLogout(){
  window.__resetting = true; clearTimeout(pushTimer);
  try { if (AUTH) await sb('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
  authStore(null); await wipeLocal(); location.hash = ''; location.reload();
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.logoutTop')) acctLogout(); });
const houseName = h => h.name || h.guideName || h.place || h.slug || 'New house';
const houseState = h => ({ published: 'Published', ready: 'Not published', approved: 'Not published', queued: 'Being built', generating: 'Being built', failed: 'The build did not work' })[h.status] || 'Not built yet';
function acctHouses(){
  if (!AUTH || !GUIDE) return;
  let d = document.querySelector('#acctbar .houses');
  const cur = HOUSES.find(h => h.id === GUIDE.id) || { ...GUIDE, name: ((GUIDE.content || {}).site || {}).name };
  const html = `<summary aria-label="Your houses"><b>${esc(houseName(cur))}</b></summary><div class="hmenu">${HOUSES.map(h => `<button type="button" data-house="${esc(h.id)}"${h.id === GUIDE.id ? ' aria-current="true"' : ''}><b>${esc(houseName(h))}</b><small>${esc(houseState(h))}${h.id === GUIDE.id ? ' · open now' : ''}</small></button>`).join('')}<button type="button" class="add" data-addhouse>+ Add a house</button></div>`;
  if (!d) { d = document.createElement('details'); d.className = 'houses'; acctBar().prepend(d); }
  const open = d.open; d.innerHTML = html; d.open = open;
}
window.__acctHouses = () => { const h = HOUSES.find(x => x.id === GUIDE.id); if (h) { h.status = GUIDE.status; h.name = ((GUIDE.content || {}).site || {}).name || h.name; } acctHouses(); };
// Leaving a house: what this device holds for it goes to the account first (answers, photos not sent yet, the editor's
// draft), then the device forgets it.
async function acctLeaveHouse(){
  clearTimeout(pushTimer);
  if (CM.on) { if (CM.timer) await cmSave(); while (CM.saving) await CM.saving; }
  else if (GUIDE && GUIDE.origin !== 'imported') { try { await acctSendUploads(); } catch (e) { /* kept on the account as far as sent */ } await acctPush(); }
  window.__resetting = true; await wipeLocal();
}
async function acctOpenHouse(id){ houseSave(AUTH.user.id, id); location.hash = ''; location.reload(); }
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('#acctbar [data-house], #acctbar [data-addhouse]'); if (!b || b.disabled) return;
  if (b.dataset.house === GUIDE.id) { b.closest('details').open = false; return; }
  b.disabled = true;
  try {
    if (b.dataset.addhouse !== undefined) {
      await ensureFresh();
      const made = await sb('/rest/v1/guides', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner: AUTH.user.id, answers: {} } });
      await acctLeaveHouse(); return acctOpenHouse(made[0].id);
    }
    await acctLeaveHouse(); acctOpenHouse(b.dataset.house);
  } catch (e) { b.disabled = false; window.__resetting = false; toast((b.dataset.addhouse !== undefined ? 'No house added: ' : 'Could not open it: ') + niceError(e)); }
});
// "Log out" lives in a row right under the page header.
function acctBar() {
  let b = document.getElementById('acctbar');
  if (!b) { b = document.createElement('div'); b.id = 'acctbar'; const h = document.querySelector('header.top'); if (h) h.after(b); else document.body.prepend(b); }
  return b;
}

/* ---------- Publish: queue the guide for building, then follow its status ---------- */
// The host's own images (logo, cover, photos, inspiration images) stay on their device until they publish: then they go
// to the guide's storage, so the guide builder can use them (their paths travel in the answers, _uploads).
const HOST_KINDS = ['logo', 'cover', 'photo', 'inspiration'];
async function acctSendUploads(){
  for (const u of uploads.filter(x => !x.remote && x.blob && !x.path && HOST_KINDS.includes(x.kind))) {
    const path = `${GUIDE.id}/host/${u.id}.jpg`;
    await ensureFresh();
    const r = await fetch(`${SB.url}/storage/v1/object/guide-assets/${path}`, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + AUTH.access_token, 'Content-Type': u.blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: u.blob });
    if (!r.ok) throw new Error('Your images could not be sent. Check your connection and try again.');
    u.path = path; try { await saveUpload(u); } catch (e) { /* kept in memory for this send */ }
  }
}
async function acctQueueBuild(){
  if (!AUTH || !GUIDE) throw new Error('Log in to publish your guide.');
  clearTimeout(pushTimer);
  for (let i = 0; i < 40 && pushing; i++) await new Promise(r => setTimeout(r, 150));
  await acctSendUploads();
  await acctPush();
  if (A.slug && A.slug !== GUIDE.slug) throw new Error('That web address is already taken. Pick another one in the first step.');
  await ensureFresh();
  try { const r = await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { status: 'queued' } }); if (r && r[0]) { GUIDE.status = r[0].status; GUIDE.message = r[0].message; } }
  catch (e) { throw new Error(/web address/i.test(e.message) ? 'Choose a web address for your guide in the first step.' : e.message); }
  return GUIDE.status;
}
async function acctStatus(){
  if (!AUTH || !GUIDE) return null;
  await ensureFresh();
  const r = await sb('/rest/v1/guides?select=status,message,slug,finished_at&id=eq.' + GUIDE.id);
  if (r && r[0]) { GUIDE.status = r[0].status; GUIDE.message = r[0].message; return r[0]; }
  return null;
}
window.__acctQueueBuild = acctQueueBuild; window.__acctStatus = acctStatus;
window.__acctGuide = () => GUIDE;

async function accountBoot(){
  if (!/^\/(index\.html)?$/.test(location.pathname)) return;     // guide previews at /<name> stay as they are
  authLoad();
  const type = await acctHash();
  if (AUTH) { try { await ensureFresh(); } catch (e) { authStore(null); } }
  if (type === 'recovery' && AUTH) await gate('reset');
  let notice = '';
  while (!AUTH) { await gate(window.__everSignedIn ? 'login' : 'signup', notice); }
  try { await acctAttach(); }
  catch (e) { if (e.status === 401 || e.status === 403) { authStore(null); await accountBoot(); return; } /* offline: keep working on this device */ }
  try { cmInit(); } catch (e) {}
  if (!document.querySelector('.logoutTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'logoutTop'; b.textContent = 'Log out'; acctBar().appendChild(b); }
  acctHouses();
}
