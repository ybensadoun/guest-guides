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
  st.textContent = `/* The sign-in screen, in the guides' own look (Ca La Kimberly's "Bauhaus summer": paper, bold primaries, Jost) */
#acct{position:fixed;inset:0;z-index:200;overflow:auto;background:#F3EEE3;color:#121212;font-family:"Jost",system-ui,-apple-system,"Segoe UI",sans-serif;
  --k-ink:#121212;--k-blue:#1D4FA0;--k-red:#D52B1E;--k-yellow:#F5C400;--k-orange:#EC6A1C;--k-green:#0E7C46;--k-line:#DED6C6;--k-muted:#4A4A4A}
#acct *{box-sizing:border-box}
#acct .ac2{max-width:1120px;margin:0 auto;padding:18px 16px 48px;display:grid;gap:18px;grid-template-areas:"top" "hero" "card" "tiles"}
#acct .ac-top{grid-area:top;display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px}
#acct .ac-door{width:22px;height:28px;border-radius:11px 11px 3px 3px;background:var(--k-ink);position:relative;flex:none}
#acct .ac-door::after{content:"";position:absolute;left:6px;top:14px;width:5px;height:5px;border-radius:50%;background:var(--k-yellow)}
#acct .ac-hero{grid-area:hero;background:#fff;border:2px solid var(--k-ink);border-radius:20px;overflow:hidden;display:flex;flex-direction:column}
#acct .ac-art{position:relative;height:150px;background:var(--k-blue);overflow:hidden}
#acct .ac-art i{position:absolute;display:block}
#acct .ac-art .s1{width:92px;height:92px;border-radius:50%;background:var(--k-yellow);right:44px;top:22px}
#acct .ac-art .s2{width:120px;height:120px;border-radius:0 120px 0 0;background:var(--k-red);left:0;bottom:0}
#acct .ac-art .s3{width:0;height:0;border-left:46px solid transparent;border-right:46px solid transparent;border-bottom:78px solid var(--k-ink);left:128px;bottom:0}
#acct .ac-art .s4{width:150px;height:44px;background:#F3EEE3;right:0;bottom:0}
#acct .ac-art .s5{width:44px;height:44px;border-radius:50% 50% 0 0;background:var(--k-green);right:66px;bottom:44px}
#acct .ac-name{padding:18px 20px 16px;display:flex;flex-direction:column;gap:8px}
#acct .ac-name small{font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--k-muted)}
#acct .ac-name h1{margin:0;font-size:clamp(30px,7.5vw,48px);line-height:1.04;font-weight:700;letter-spacing:-.01em}
#acct .ac-name p{margin:0;font-size:17px;line-height:1.45;color:#2a2a2a}
#acct .ac-facts{display:grid;grid-template-columns:1fr 1fr;border-top:1.5px solid var(--k-line)}
#acct .ac-facts div{padding:12px 20px;display:flex;flex-direction:column;gap:2px;min-width:0}
#acct .ac-facts div+div{border-left:1.5px solid var(--k-line)}
#acct .ac-facts small{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--k-muted)}
#acct .ac-facts b{font-weight:600;font-size:16px;color:var(--k-blue)}
#acct .ac-tiles{grid-area:tiles;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#acct .ac-tiles h2{grid-column:1/-1;margin:6px 0 0;font-size:24px;font-weight:700}
#acct .ac-tile{position:relative;overflow:hidden;isolation:isolate;border-radius:20px;padding:16px;min-height:150px;display:flex;flex-direction:column;gap:6px;color:#fff}
#acct .ac-tile .ic{width:30px;height:30px;margin-bottom:18px}
#acct .ac-tile .ic svg{width:28px;height:28px}
#acct .ac-tile b{font-size:clamp(19px,5vw,22px);line-height:1.12;font-weight:700;margin-top:auto}
#acct .ac-tile small{font-size:14px;opacity:.9;line-height:1.3}
#acct .ac-tile .ar{align-self:flex-end;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--k-ink);font-weight:700}
#acct .ac-tile::before{content:"";position:absolute;z-index:-1;top:0;right:0}
#acct .t-y{background:var(--k-yellow);color:var(--k-ink)}#acct .t-y .ar{background:var(--k-ink);color:#fff}
#acct .t-y::before{width:60px;height:60px;border-radius:0 0 0 60px;background:var(--k-ink)}
#acct .t-r{background:var(--k-red)}#acct .t-r::before{border-left:30px solid transparent;border-right:30px solid transparent;border-top:50px solid var(--k-ink);right:10px}
#acct .t-k{background:var(--k-ink)}#acct .t-k::before{width:64px;height:64px;border-radius:0 0 0 64px;background:var(--k-red)}
#acct .t-g{background:var(--k-green)}#acct .t-g::before{border-left:26px solid transparent;border-right:26px solid transparent;border-top:44px solid var(--k-yellow);right:14px}
#acct .ac-card{grid-area:card;background:#fff;border:2px solid var(--k-ink);border-radius:20px;padding:22px 20px}
#acct .ac-card h2{margin:0 0 6px;font-size:28px;line-height:1.08;font-weight:700}
#acct p.lead{margin:0 0 16px;color:var(--k-muted);font-size:16px;line-height:1.45}
#acct .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font:inherit;font-weight:600;font-size:16px;padding:12px 14px;border-radius:999px;border:2px solid var(--k-ink);background:#fff;color:var(--k-ink);cursor:pointer;text-decoration:none}
#acct .gbtn svg{width:20px;height:20px;flex:none}
#acct .or{display:flex;align-items:center;gap:12px;margin:16px 0 2px;font-size:13px;color:var(--k-muted)}
#acct .or::before,#acct .or::after{content:"";flex:1;border-top:1.5px solid var(--k-line)}
#acct label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
#acct input{width:100%;font:inherit;font-size:16px;padding:13px 14px;border-radius:12px;border:1.5px solid var(--k-line);background:#F3EEE3;color:var(--k-ink)}
#acct input:focus{outline:2px solid var(--k-blue);outline-offset:1px}
#acct .go{margin-top:18px;width:100%;font:inherit;font-weight:700;font-size:16px;padding:14px;border-radius:999px;border:0;background:var(--k-ink);color:#fff;cursor:pointer}
#acct .go[disabled]{opacity:.6;cursor:wait}
#acct .alt{margin-top:16px;text-align:center;font-size:14px;color:var(--k-muted)}
#acct .alt button{font:inherit;background:none;border:0;color:var(--k-blue);font-weight:600;text-decoration:underline;cursor:pointer;padding:0}
#acct .acmsg{margin-top:14px;font-size:14px;min-height:20px;color:var(--k-red)}
#acct .acmsg.ok{color:var(--k-green)}
#acct .small{margin-top:18px;font-size:12.5px;color:#6E6A63;line-height:1.5}
#acct .small a{color:var(--k-blue);font-weight:600}
@media (min-width:900px){#acct .ac2{grid-template-columns:minmax(0,1fr) 420px;grid-template-areas:"top top" "hero card" "tiles card";align-items:start;column-gap:28px;padding-top:28px}
  #acct .ac-card{position:sticky;top:24px}#acct .ac-art{height:210px}#acct .ac-art .s1{width:130px;height:130px}}
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
#acctbar .hmenu .add{border-top:1px solid var(--line,#ddd);border-radius:0 0 10px 10px;margin-top:4px;font-weight:700}
#acctbar .hrow{display:flex;gap:2px;align-items:stretch}
#acctbar .hrow>[data-house]{flex:1;min-width:0}
#acctbar .hmenu .hdel{flex:none;width:42px;align-items:center;justify-content:center;color:var(--muted,#666)}
#acctbar .hmenu .hdel svg{width:18px;height:18px}
#acctbar .hmenu .hdel:hover,#acctbar .hmenu .hdel:focus-visible{color:#B3261E;background:#FBEAE8}
#acctbar .hmenu .gone{color:#B3261E;font-size:13.5px;font-weight:600}
/* Deleting a house or the account: a box that asks first */
.acdel{position:fixed;inset:0;z-index:250;background:rgba(18,18,18,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px}
@media (min-width:621px){.acdel{align-items:center}}
.acdel .box{width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--surface,#fff);color:var(--ink,#121212);border-radius:20px;padding:20px;box-shadow:0 18px 48px rgba(0,0,0,.25)}
.acdel h2{font-family:var(--display,Georgia,serif);font-weight:400;font-size:26px;line-height:1.1;margin:0 0 10px;overflow-wrap:anywhere}
.acdel p{margin:0 0 10px;line-height:1.45}
.acdel label{display:block;font-size:14.5px;margin:14px 0 6px}
.acdel label .typed{display:block;margin-top:4px;font-size:16px;overflow-wrap:anywhere}   /* on its own line: the address or email never breaks at a hyphen */
.acdel input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line,#ccc);background:var(--paper,#fff);color:inherit}
.acdel .row{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:18px}
.acdel .btn.danger{background:#B3261E;border-color:#B3261E;color:#fff}`;
  document.head.appendChild(st);
})();

// Google sign-in (Supabase Auth, provider "google"): the button shows only once it is switched on there.
const GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
async function googleOn(){
  if (window.__googleOn !== undefined) return window.__googleOn;
  try { const r = await fetch(SB.url + '/auth/v1/settings', { headers: { apikey: SB.key }, signal: AbortSignal.timeout(4000) }); const j = await r.json(); window.__googleOn = !!(j && j.external && j.external.google); }
  catch (e) { window.__googleOn = false; }
  return window.__googleOn;
}
(function(){ if (document.getElementById('jostFont')) return; const l = document.createElement('link'); l.id = 'jostFont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap'; document.head.appendChild(l); })();
async function gate(mode0, notice, noticeOk){
  await googleOn();
  return new Promise(resolve => {
    let mode = mode0 || 'signup', drawn = 0;
    const el = document.getElementById('acct') || Object.assign(document.createElement('div'), { id: 'acct' });
    if (!el.isConnected) document.body.appendChild(el);
    const draw = (msg, ok) => {
      const up = mode === 'signup', rec = mode === 'recover', reset = mode === 'reset';
      const google = window.__googleOn && (up || mode === 'login');
      el.innerHTML = `<div class="ac2">
        <div class="ac-top"><span class="ac-door" aria-hidden="true"></span>Guest Guide Maker</div>
        <section class="ac-hero"><div class="ac-art" aria-hidden="true"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><i class="s5"></i></div>
          <div class="ac-name"><small>Guest guides for holiday homes</small><h1>Your guest guide, written for you.</h1>
            <p>Paste your Airbnb link: in about a minute you see your whole guide, with the house, the rules, the Wi-Fi and the best of the area, in your guests' languages. Then you make it yours.</p></div>
          <div class="ac-facts"><div><small>Wi-Fi</small><b>Tap to connect</b></div><div><small>Check-out</small><b>Before 11:00</b></div></div></section>
        <section class="ac-card">
          <h2>${reset ? 'Choose a new password' : rec ? 'Reset your password' : up ? 'Create your account' : 'Welcome back'}</h2>
          <p class="lead">${reset ? 'Pick a new password, then you are back in.' : rec ? 'We email you a link to choose a new password.' : up ? 'So you can come back any time and change your answers. It takes a minute.' : 'Log in to continue where you left off.'}</p>
          ${google ? `<button class="gbtn" type="button" id="acGoogle">${GOOGLE_G}Continue with Google</button><div class="or">or with your email</div>` : ''}
          <form id="acForm" novalidate>
          ${reset ? '' : '<label for="acEmail">Email</label><input id="acEmail" type="email" autocomplete="email" inputmode="email" required>'}
          ${rec ? '' : `<label for="acPw">${reset ? 'New password' : 'Password'}</label><input id="acPw" type="password" autocomplete="${up || reset ? 'new-password' : 'current-password'}" ${up || reset ? 'minlength="8" placeholder="At least 8 characters"' : ''} required>`}
          <button class="go" type="submit">${reset ? 'Save password' : rec ? 'Send me the link' : up ? 'Create my account' : 'Log in'}</button>
          <div class="acmsg${ok ? ' ok' : ''}" id="acMsg" role="status">${esc(msg || '')}</div>
        </form>
          <div class="alt">${rec || reset ? '<button type="button" data-m="login">Back to log in</button>' : up ? 'Already have an account? <button type="button" data-m="login">Log in</button>' : 'New here? <button type="button" data-m="signup">Create an account</button> · <button type="button" data-m="recover">Forgot password?</button>'}</div>
        ${up ? '<p class="small">By creating an account you agree that we store your answers and photos to build your guide, and that we may contact you about it. <a href="/privacy/" target="_blank" rel="noopener">How we handle your data</a></p>' : ''}</section>
        <section class="ac-tiles" aria-label="What your guests get"><h2>What your guests get</h2>
          <div class="ac-tile t-y"><span class="ic">${I.tool}</span><b>House guide</b><small>How everything works, room by room</small><span class="ar" aria-hidden="true">→</span></div>
          <div class="ac-tile t-r"><span class="ic">${I.phone}</span><b>Emergencies</b><small>112, the hospital, the pharmacy</small><span class="ar" aria-hidden="true">→</span></div>
          <div class="ac-tile t-k"><span class="ic">${I.bag}</span><b>Markets</b><small>What is on today</small><span class="ar" aria-hidden="true">→</span></div>
          <div class="ac-tile t-g"><span class="ic">${I.compass}</span><b>What to do</b><small>Picked near your house</small><span class="ar" aria-hidden="true">→</span></div></section></div>`;
      const gb = el.querySelector('#acGoogle'); if (gb) gb.onclick = () => { gb.disabled = true; location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + '/')}`; };
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
      setTimeout(() => { const i = el.querySelector('input'); if (i && (drawn++ || innerWidth >= 900)) i.focus(); }, 30);   // on a phone the page opens on the guide, not the keyboard
    };
    draw(notice, noticeOk);
  });
}

// Links in confirmation and reset emails come back as /#access_token=...&type=signup|recovery.
async function acctHash(){
  const h = location.hash.replace(/^#/, '');
  if (/(^|&)error_description=/.test(h)) { window.__authError = new URLSearchParams(h).get('error_description'); history.replaceState(null, '', location.pathname); return null; }   // Google said no
  if (!/access_token=/.test(h)) return null;
  const p = new URLSearchParams(h);
  const tok = p.get('access_token'), type = p.get('type');
  if (!tok) return null;
  try {
    const user = await sb('/auth/v1/user', { token: tok });
    authStore({ access_token: tok, refresh_token: p.get('refresh_token'), expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600), user });
    history.replaceState(null, '', location.pathname);
    const fresh = !type && p.get('provider_token') && Date.now() - Date.parse(user.created_at || 0) < 10 * 60000;   // a new account made with Google
    if (type === 'signup' || fresh) { try { await nf('signup', { sid, email: user.email, device: deviceLine(device()) }); } catch (e) {} }
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
  const html = `<summary aria-label="Your houses"><b>${esc(houseName(cur))}</b></summary><div class="hmenu">${HOUSES.map(h => `<div class="hrow"><button type="button" data-house="${esc(h.id)}"${h.id === GUIDE.id ? ' aria-current="true"' : ''}><b>${esc(houseName(h))}</b><small>${esc(houseState(h))}${h.id === GUIDE.id ? ' · open now' : ''}</small></button><button type="button" class="hdel" data-delhouse="${esc(h.id)}" aria-label="Delete ${esc(houseName(h))}" title="Delete this house">${TRASH}</button></div>`).join('')}<button type="button" class="add" data-addhouse>+ Add a house</button><button type="button" class="gone" data-delacct>Delete my account</button></div>`;
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
// Deleting (29 Oct 2026, Yohann: "I should be able to delete it"): a house from the houses menu, or the whole account.
// Both ask first; a published guide and the account also ask to type its web address or the email, since guests lose
// the guide at once. Not while a guide is being built (the database refuses too). Photos go with the house: the guide
// worker removes the photos of houses that no longer exist (worker/sweep-photos.mjs).
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const building = h => h.status === 'queued' || h.status === 'generating';
function askDelete(o){
  return new Promise(done => {
    const el = document.createElement('div'); el.className = 'acdel';
    el.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="acdelT"><h2 id="acdelT">${esc(o.title)}</h2>${o.text.map(t => `<p>${esc(t)}</p>`).join('')}${o.typed ? `<label for="acdelIn">${esc(o.label)}<b class="typed">${esc(o.typed)}</b></label><input id="acdelIn" autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}<div class="row"><button type="button" class="btn" data-no>Cancel</button><button type="button" class="btn danger" data-yes${o.typed ? ' disabled' : ''}>${esc(o.confirm)}</button></div></div>`;
    document.body.appendChild(el);
    const yes = el.querySelector('[data-yes]'), inp = el.querySelector('#acdelIn');
    const key = e => { if (e.key === 'Escape') end(false); };
    const end = v => { el.remove(); removeEventListener('keydown', key); done(v); };
    addEventListener('keydown', key);
    if (inp) inp.oninput = () => { yes.disabled = inp.value.trim().toLowerCase() !== o.typed.toLowerCase(); };
    el.querySelector('[data-no]').onclick = () => end(false);
    el.onclick = e => { if (e.target === el) end(false); };
    yes.onclick = () => end(true);
    setTimeout(() => (inp || el.querySelector('[data-no]')).focus(), 30);
  });
}
async function acctDeleteHouse(id){
  const h = HOUSES.find(x => x.id === id); if (!h) return;
  if (building(h)) return toast('It is being built. You can delete it once that is done.');
  const name = houseName(h), live = h.status === 'published' && h.slug;
  const ok = await askDelete({ title: `Delete ${name}?`,
    text: [...(live ? ['It is published: from now on, guests who open its link see "not found".'] : []), 'Its answers, photos and guide are deleted for good. This cannot be undone.'],
    confirm: 'Delete this house', typed: live ? h.slug : '', label: 'To confirm, type its web address:' });
  if (!ok) return;
  try {
    await ensureFresh();
    const r = await sb('/rest/v1/guides?id=eq.' + id, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!r || !r.length) throw new Error('It was not deleted. Try again.');
  } catch (e) { return toast('Not deleted: ' + niceError(e)); }
  HOUSES = HOUSES.filter(x => x.id !== id);
  if (id !== GUIDE.id) { acctHouses(); return toast(`${name} is deleted.`); }
  window.__resetting = true; clearTimeout(pushTimer); await wipeLocal();   // what this device held belonged to that house
  houseSave(AUTH.user.id, HOUSES[0] ? HOUSES[0].id : null); location.hash = ''; location.reload();   // the next house, or a new one
}
async function acctDeleteAccount(){
  if (HOUSES.some(building)) return toast('A guide is being built. You can delete your account once that is done.');
  const email = (AUTH.user && AUTH.user.email) || '', n = HOUSES.length, live = HOUSES.filter(h => h.status === 'published').length;
  const ok = await askDelete({ title: 'Delete your account?',
    text: [`Your account and ${n === 1 ? 'your house' : `your ${n} houses`}, with their answers, photos and guides, are deleted for good.${live ? ` ${live === 1 ? 'Your published guide goes' : `Your ${live} published guides go`} offline at once.` : ''}`, 'This cannot be undone.'],
    confirm: 'Delete my account', typed: email || 'delete', label: email ? 'To confirm, type your email:' : 'To confirm, type:' });
  if (!ok) return;
  try { await ensureFresh(); await sb('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} }); }
  catch (e) { return toast('Not deleted: ' + niceError(e)); }
  window.__resetting = true; clearTimeout(pushTimer);
  authStore(null); await wipeLocal();
  try { localStorage.removeItem(HOUSE_KEY); localStorage.removeItem('porta-editor-step-v1'); sessionStorage.setItem('porta-deleted', '1'); } catch (e) {}
  location.hash = ''; location.reload();
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#acctbar [data-delhouse], #acctbar [data-delacct]'); if (!b) return;
  const d = b.closest('details'); if (d) d.open = false;
  if (b.dataset.delhouse) acctDeleteHouse(b.dataset.delhouse); else acctDeleteAccount();
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
  for (const u of uploads.filter(x => !x.remote && x.blob && !x.path && HOST_KINDS.includes(x.kind))) await acctSendOne(u);
}
// One image now (the cover to redraw as an artwork); the rest wait for Publish.
async function acctSendOne(u){
  const path = `${GUIDE.id}/host/${u.id}.jpg`;
  await ensureFresh();
  const r = await fetch(`${SB.url}/storage/v1/object/guide-assets/${path}`, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + AUTH.access_token, 'Content-Type': u.blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: u.blob });
  if (!r.ok) throw new Error('Your images could not be sent. Check your connection and try again.');
  u.path = path; try { await saveUpload(u); } catch (e) { /* kept in memory for this send */ }
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
window.__acctQueueBuild = acctQueueBuild; window.__acctStatus = acctStatus; window.__acctSendOne = acctSendOne;
window.__acctGuide = () => GUIDE;

async function accountBoot(){
  if (!/^\/(index\.html)?$/.test(location.pathname)) return;     // guide previews at /<name> stay as they are
  authLoad();
  const type = await acctHash();
  if (AUTH) { try { await ensureFresh(); } catch (e) { authStore(null); } }
  if (type === 'recovery' && AUTH) await gate('reset');
  let notice = window.__authError ? 'That sign-in did not work. Try again, or use your email.' : '', noticeOk = false;
  try { if (sessionStorage.getItem('porta-deleted')) { sessionStorage.removeItem('porta-deleted'); notice = 'Your account is deleted, with its houses and photos.'; noticeOk = true; } } catch (e) {}
  while (!AUTH) { await gate(window.__everSignedIn ? 'login' : 'signup', notice, noticeOk); notice = ''; }
  try { await acctAttach(); }
  catch (e) { if (e.status === 401 || e.status === 403) { authStore(null); await accountBoot(); return; } /* offline: keep working on this device */ }
  try { cmInit(); } catch (e) {}
  if (!document.querySelector('.logoutTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'logoutTop'; b.textContent = 'Log out'; acctBar().appendChild(b); }
  acctHouses();
}
