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
.logoutTop{position:fixed;bottom:10px;right:10px;z-index:40;font:600 12px/1 inherit;font-family:inherit;padding:8px 12px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--paper,#fff);color:inherit;opacity:.85;cursor:pointer}`;
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
  return p;
};
async function wipeLocal(){
  A = {}; try { for (const u of await idb.all()) await idb.del(u.id); } catch (e) {} uploads = []; try { localStorage.removeItem(KEY); } catch (e) {}
}
async function adoptRemote(remote){
  const r = { ...remote }, photos = r._remote || []; delete r._remote;
  for (const u of uploads.filter(x => x.remote)) { try { await idb.del(u.id); } catch (e) {} }
  A = r; uploads = [...uploads.filter(u => !u.remote), ...photos];
  for (const u of photos) await saveUpload(u);
}
async function acctAttach(){
  const user = AUTH.user || {};
  if (A._acct && A._acct !== user.id) await wipeLocal();     // someone else used this device before: never mix their answers in
  const rows = await sb('/rest/v1/guides?select=id,answers,status,slug&order=created_at.asc&limit=1');
  const local = !!((A._seen && A._seen.length) || A.listingUrl);
  if (rows && rows[0]) {
    GUIDE = rows[0];
    const rT = (GUIDE.answers || {})._savedAt || 0, lT = A._savedAt || 0;
    if (rT && (rT > lT || !local)) { await adoptRemote(GUIDE.answers); }
  } else {
    const made = await sb('/rest/v1/guides', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner: user.id, answers: cleanForAccount() } });
    GUIDE = made && made[0];
  }
  A._acct = user.id; flush();
  if (local) acctQueue();
}
function acctQueue(){ if (!AUTH || !GUIDE) return; clearTimeout(pushTimer); pushTimer = setTimeout(acctPush, 1500); }
async function acctPush(){
  if (window.__resetting || !AUTH || !GUIDE) return;
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

/* ---------- Publish: queue the guide for building, then follow its status ---------- */
async function acctQueueBuild(){
  if (!AUTH || !GUIDE) throw new Error('Log in to publish your guide.');
  clearTimeout(pushTimer);
  for (let i = 0; i < 40 && pushing; i++) await new Promise(r => setTimeout(r, 150));
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
  if (!document.querySelector('.logoutTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'logoutTop'; b.textContent = 'Log out'; document.body.appendChild(b); }
}
