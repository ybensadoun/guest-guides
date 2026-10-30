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

/* The first page for a visitor who is not signed in, and the account card (gate, below). */
(function(){
  const st = document.createElement('style');
  st.textContent = `/* The sign-in screen, in the guides' own look (Ca La Kimberly's "Bauhaus summer": paper, bold primaries, Jost) */
#acct{position:fixed;inset:0;z-index:200;overflow:auto;background:#F3EEE3;color:#121212;font-family:"Jost",system-ui,-apple-system,"Segoe UI",sans-serif;
  --k-ink:#121212;--k-blue:#1D4FA0;--k-red:#D52B1E;--k-yellow:#F5C400;--k-orange:#EC6A1C;--k-green:#0E7C46;--k-line:#DED6C6;--k-muted:#4A4A4A}
#acct *{box-sizing:border-box}
#acct.only{background:rgba(18,18,18,.55);display:grid;place-items:center;padding:16px}
#acct .ac-sheet{position:relative;width:100%;max-width:440px;margin:auto}
#acct .ac-sheet .ac-card{box-shadow:0 24px 60px rgba(0,0,0,.3)}
#acct .ac-sheet .ac-card h2{padding-right:44px}
#acct .ac-x{position:absolute;top:12px;right:12px;z-index:1;width:40px;height:40px;border-radius:50%;border:0;background:#F3EEE3;color:var(--k-ink);font-size:24px;line-height:1;cursor:pointer}
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
/* What your guests get: Ca La Kimberly's home for an example house, same pieces, shapes and sizes (acToday, acExample) */
#acct .ac-ex{grid-area:tiles;display:flex;flex-direction:column;gap:14px;min-width:0}
#acct .ac-ex h2,#acct .ac-ex h3{font-family:inherit;letter-spacing:0}   /* the guides' own font for every title, as in Ca La Kimberly */
#acct .ex-head h2{margin:6px 0 2px;font-size:26px;line-height:1.1;font-weight:700}
#acct .ex-head p{margin:0;font-size:15px;line-height:1.4;color:var(--k-muted)}
#acct .ex-head p b{color:var(--k-ink);font-weight:600;white-space:nowrap}
#acct [data-ex]{cursor:pointer}
#acct .ex-welcome{background:#fff;border:2px solid var(--k-ink);border-radius:20px;overflow:hidden}
#acct .ex-scene svg{display:block;width:100%;height:150px}
#acct .ex-wrow{display:flex;align-items:center;gap:12px;padding:14px 16px}
#acct .ex-logo{width:46px;height:46px;border-radius:12px;flex:none;background:var(--k-blue);position:relative;overflow:hidden}
#acct .ex-logo::before{content:"";position:absolute;width:26px;height:26px;border-radius:50%;background:var(--k-yellow);right:-6px;top:-6px}
#acct .ex-logo::after{content:"";position:absolute;width:24px;height:24px;border-radius:0 24px 0 0;background:var(--k-red);left:0;bottom:0}
#acct .ex-wt{display:flex;flex-direction:column;min-width:0;flex:1}
#acct .ex-wt small{font-size:13px;font-weight:600;color:var(--k-muted)}
#acct .ex-wt b{font-size:22px;line-height:1.1;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
#acct .ex-wt span{font-size:14px;color:var(--k-muted)}
#acct .ex-go{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--k-ink);color:var(--k-yellow)}
#acct .ex-go svg,#acct .ex-ar svg{width:20px;height:20px}
#acct .ex-sg{margin:8px 0 0;font-size:24px;line-height:1.15;font-weight:700}
#acct .ex-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#acct .ex-tile{position:relative;overflow:hidden;isolation:isolate;border-radius:20px;padding:16px;min-height:152px;display:flex;flex-direction:column;color:#fff}
#acct .ex-tile::before{content:"";position:absolute;z-index:-1}
#acct .ex-tile .ex-ic{height:30px;margin-bottom:auto}
#acct .ex-tile .ex-ic svg{width:28px;height:28px}
#acct .ex-tile b{font-size:clamp(19px,5.4vw,22px);line-height:1.15;font-weight:700;margin-top:14px}
#acct .ex-tile small{font-size:15px;font-weight:600;margin-top:2px}
#acct .ex-ar{align-self:flex-end;margin-top:10px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--k-ink);flex:none}
#acct .ex-bins{grid-column:1/-1;min-height:0;background:var(--k-blue);padding:18px 16px}
#acct .ex-bins::before{width:58px;height:58px;border-radius:100% 0 0 0;background:var(--k-yellow);right:0;bottom:0}
#acct .ex-bins .ex-top{display:flex;align-items:flex-start;gap:12px}
#acct .ex-bins .ex-top b{margin:0;flex:1}
#acct .ex-bins .ex-ar{margin:0}
#acct .ex-tag{display:inline-flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
#acct .ex-tag svg{width:14px;height:14px;color:var(--k-yellow)}
#acct .ex-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;margin-top:10px;max-width:calc(100% - 64px);padding:6px 16px 6px 6px;border-radius:999px;background:rgba(255,255,255,.18);font-size:15px;font-weight:600;line-height:1.25}
#acct .ex-pill i{width:30px;height:30px;border-radius:50%;background:#fff;color:var(--k-red);display:grid;place-items:center;flex:none}
#acct .ex-pill i svg{width:17px;height:17px}
#acct .ex-y{background:var(--k-yellow);color:var(--k-ink)}#acct .ex-y .ex-ar,#acct .ex-o .ex-ar{background:var(--k-ink);color:#fff}
#acct .ex-y::before{width:64px;height:64px;border-radius:50%;background:var(--k-ink);top:-16px;right:-16px}
#acct .ex-r{background:var(--k-red)}#acct .ex-r::before{width:0;height:0;border-left:26px solid transparent;border-right:26px solid transparent;border-top:46px solid var(--k-ink);top:0;right:10px}
#acct .ex-k{background:var(--k-ink)}#acct .ex-k::before{width:78px;height:78px;border-radius:50%;background:var(--k-red);top:-18px;right:-18px}
#acct .ex-o{background:var(--k-orange);color:var(--k-ink)}#acct .ex-o::before{width:64px;height:64px;border-radius:50%;background:var(--k-yellow);top:-16px;right:-16px}
#acct .ex-g{background:var(--k-green)}#acct .ex-g::before{width:0;height:0;border-left:24px solid transparent;border-right:24px solid transparent;border-top:40px solid var(--k-yellow);top:0;right:12px}
#acct .ex-mosaic{grid-template-rows:auto auto}#acct .ex-tall{grid-row:span 2}
#acct .ex-card{background:#fff;border:2px solid var(--k-ink);border-radius:18px;padding:14px;color:var(--k-ink);min-width:0}
#acct .ex-card b{display:block;font-size:19px;line-height:1.2;font-weight:700}
#acct .ex-card .ex-tx>span{display:block;font-size:14px;line-height:1.35;color:#3a3a3a}
#acct .ex-line{display:flex;gap:14px;align-items:flex-start}
#acct .ex-sq{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex:none;color:#fff;background:var(--k-red)}
#acct .ex-sq svg{width:26px;height:26px}
#acct .ex-sq.g{background:var(--k-green)}#acct .ex-sq.y{background:var(--k-yellow);color:var(--k-ink)}
#acct .ex-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#acct .ex-pair .ex-card{display:flex;flex-direction:column;gap:8px}
#acct .ex-pair .ex-sq{width:36px;height:36px;border-radius:10px}#acct .ex-pair .ex-sq svg{width:21px;height:21px}
#acct .ex-card .ex-st{margin-top:3px;font-size:14px;font-weight:600;color:#3a3a3a}
#acct .ex-st em,#acct .ex-when em{font-style:normal;font-weight:700}
#acct .ex-open{color:var(--k-green)}#acct .ex-closed{color:var(--k-red)}
#acct .ex-map{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;padding:16px 66px 18px 18px}
#acct .ex-map::before{content:"";position:absolute;width:66px;height:66px;border-radius:50%;background:var(--k-blue);right:-32px;top:50%;margin-top:-33px}
#acct .ex-map::after{content:"";position:absolute;left:0;bottom:0;width:58px;height:6px;background:var(--k-red)}
#acct .ex-map .ex-ic svg{width:30px;height:30px}
#acct .ex-map .ex-tx{flex:1;min-width:0}#acct .ex-map b{font-size:21px}#acct .ex-map .ex-tx>span{font-weight:700;color:var(--k-ink)}
#acct .ex-map .ex-go{color:#fff}
#acct .ex-on{background:#fff;border-radius:20px;padding:2px 18px;color:var(--k-ink)}
#acct .ex-onh{display:flex;align-items:baseline;gap:8px;padding:16px 0 4px}
#acct .ex-onh b{font-size:21px;font-weight:700}#acct .ex-onh>span{font-size:14.5px;color:#3a3a3a;flex:1}
#acct .ex-onh svg,#acct .ex-sec h3 svg{width:22px;height:22px;flex:none;align-self:center}
#acct .ex-it{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0}
#acct .ex-it+.ex-it{border-top:1.5px solid var(--k-line)}
#acct .ex-it .ex-sq{width:44px;height:44px}#acct .ex-it .ex-sq svg{width:24px;height:24px}
#acct .ex-it b{display:block;font-size:17.5px;line-height:1.2;font-weight:600}
#acct .ex-it .ex-tx>span{display:block;font-size:14px;line-height:1.35;color:#3a3a3a}
#acct .ex-when{text-align:right;font-size:13px;font-weight:600;line-height:1.3;color:#3a3a3a}
#acct .ex-when em{display:block;font-size:14.5px}
#acct .ex-more{display:block;padding:8px 0 14px;color:var(--k-blue);font-size:15px;font-weight:600}
#acct .ex-sec{border-top:1.5px solid var(--k-line);padding:14px 0}
#acct .ex-sec h3{margin:0;font-size:19px;line-height:1.2;font-weight:700;display:flex;align-items:center;gap:8px;justify-content:space-between}
#acct .ex-sec p{margin:4px 0 0;font-size:14px;font-weight:600;color:#3a3a3a}
#acct .ex-date{width:44px;height:44px;border-radius:10px;background:var(--k-ink);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
#acct .ex-date b{font-size:18px;color:#fff;font-weight:700}#acct .ex-date small{font-size:10px;letter-spacing:.08em;margin-top:3px;text-transform:uppercase}
#acct .ex-links{display:flex;gap:18px;padding:14px 0 16px;border-top:1.5px solid var(--k-line);color:var(--k-blue);font-size:15px;font-weight:600}
#acct .ac-cta{align-self:stretch;margin-top:6px;font:inherit;font-weight:700;font-size:16px;padding:14px 18px;border-radius:999px;border:0;background:var(--k-ink);color:#fff;cursor:pointer}
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
// "What your guests get" (Yohann, 29 Oct 2026: "keep it like Ca La Kimberly, with the fake live info, the Ca La look"):
// Ca La Kimberly's home for an example house, Casa Sol, with only what the guides really show, worked out on the visitor's
// clock: tonight's bin, open or closed with the next opening, how many markets today, today's markets one by one, the next
// two days, the events coming up. Every name is made up and nothing is looked up.
function acToday(){
  const d = new Date(), wd = d.getDay(), mins = d.getHours() * 60 + d.getMinutes();
  const tm = x => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  const fmt = (x, o) => x.toLocaleDateString('en-GB', o), plus = n => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
  // Open or closed, the way the guides say it: "Open until 15:00 · Reopens at 18:00", "Closed · Opens at 19:00".
  const hours = (spans, after) => {
    for (let i = 0; i < spans.length; i++) {
      const [a, b] = spans[i];
      if (mins < tm(a)) return { open: false, head: 'Closed', rest: (i ? 'Reopens at ' : 'Opens at ') + a };
      if (mins < tm(b)) return { open: true, head: 'Open until ' + b, rest: spans[i + 1] ? 'Reopens at ' + spans[i + 1][0] : '' };
    }
    return { open: false, head: 'Closed', rest: after };
  };
  const MK = [3, 4, 5, 4, 7, 5, 6], W = fmt(d, { weekday: 'long' }), nextWeek = fmt(plus(7), { weekday: 'short', day: 'numeric', month: 'short' });
  const markets = [['Old town', 'Street market', 4, '8:30', '13:30'], ['Harbour', 'Street market', 9, '8:00', '14:00'], ['Hill village', 'Farmers\' market', 16, '9:00', '13:00']].map(([p, kind, km, a, b]) =>
    ({ name: `${p} ${W} market`, kind, km, ...(mins < tm(a) ? { open: false, head: 'Closed', rest: 'Opens at ' + a } : mins < tm(b) ? { open: true, head: 'Open', rest: 'Until ' + b } : { open: false, head: 'Closed', rest: 'Opens ' + nextWeek }) }));
  const toSat = (6 - wd + 7) % 7 || 7, when = n => n === 1 ? 'Tomorrow' : `In ${n} days`;
  const ev = (n, name, where, time) => { const x = plus(n); return { d: x.getDate(), mon: fmt(x, { month: 'short' }), name, where: where + (time ? ` · ${fmt(x, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}` : ''), in: when(n) }; };
  return {
    date: fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }),
    bin: ['Organic waste', 'Organic waste', 'Paper and cardboard', 'Plastic and cans', 'Glass', 'Organic waste', 'General waste'][wd],
    shop: hours([['8:00', '15:00'], ['18:00', '22:00']], 'Opens tomorrow 8:00'),
    pizza: hours([['19:00', '23:30']], 'Opens tomorrow 19:00'),
    today: MK[wd], more: MK[wd] - 3, next2: MK[(wd + 1) % 7] + MK[(wd + 2) % 7], markets,
    events: [ev(toSat, 'Food and wine fair', 'Old town', '11:00'), ev(toSat + 1, 'Crafts and antiques market', 'Antiques and crafts · Harbour'), ev(toSat + 14, 'Open-air concert', 'Beach promenade', '21:00')]
  };
}
const acSvg = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const EXI = {
  arrow: acSvg('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.4), down: acSvg('<path d="m6 9 6 6 6-6"/>'), up: acSvg('<path d="m6 15 6-6 6 6"/>'),
  house: acSvg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M12 13.5v4M12 10.6v.1"/>'),
  phone: acSvg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  bin: acSvg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>',
  cup: acSvg('<path d="M4 9h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5V6M12 3.5V6M3 21h14"/>'),
  pizza: acSvg('<path d="M12 21 3.5 6.5C8.5 3.5 15.5 3.5 20.5 6.5z"/><path d="M5.5 9.5c4-2 9-2 13 0"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="14.5" r="1"/>'),
  taxi: acSvg('<path d="M5 16v-4l2-5h10l2 5v4M4 12h16v5H4zM10 4h4v3h-4zM7 17v2M17 17v2"/>'),
  store: acSvg('<path d="M4 10 5.5 4h13L20 10"/><path d="M4 10a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8M10 20v-5h4v5"/>'),
  fork: acSvg('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 2-3 6-3 8.5S15.5 14 17 14"/>'),
  star: acSvg('<path d="M12 3.5 14.6 9l6 .7-4.5 4.1 1.2 5.9L12 16.8l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7z"/>'),
  map: acSvg('<path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20"/>')
};
const AC_SCENE = '<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="150" fill="#1D4FA0"/><circle cx="318" cy="44" r="26" fill="#F5C400"/><path d="M0 104C80 90 160 92 240 102S360 96 400 98V150H0z" fill="#0E7C46"/><path d="M150 74h76v46h-76z" fill="#fff"/><path d="M142 76l46-30 46 30z" fill="#D52B1E"/><path d="M160 88h13v13h-13zM199 96h13v24h-13z" fill="#121212"/><path d="M0 128C100 118 220 120 400 124V150H0z" fill="#F3EEE3"/></svg>';
function acExample(){
  const L = acToday(), ar = `<span class="ex-ar" aria-hidden="true">${EXI.arrow}</span>`;
  const st = h => `<span class="ex-st"><em class="${h.open ? 'ex-open' : 'ex-closed'}">${esc(h.head)}</em>${h.rest ? ' · ' + esc(h.rest) : ''}</span>`;
  const card = (cls, sq, title, lines, extra = '') => `<div class="ex-card${cls}" data-ex>${sq}<span class="ex-tx"><b>${title}</b>${lines.map(x => `<span>${x}</span>`).join('')}${extra}</span></div>`;
  return `<section class="ac-ex" aria-label="What your guests get">
          <div class="ex-head"><h2>What your guests get</h2><p>An example guide, as it looks today, <b>${esc(L.date)}</b></p></div>
          <div class="ex-welcome" data-ex><div class="ex-scene">${AC_SCENE}</div>
            <div class="ex-wrow"><span class="ex-logo" aria-hidden="true"></span><span class="ex-wt"><small>Welcome to</small><b>Casa Sol</b><span>See the house</span></span><span class="ex-go" aria-hidden="true">${EXI.arrow}</span></div>
            <div class="ac-facts"><div><small>Wi-Fi</small><b>Tap to connect</b></div><div><small>Check-out</small><b>Before 11:00</b></div></div></div>
          <p class="ex-sg">At the house</p>
          <div class="ex-grid">
            <div class="ex-tile ex-bins" data-ex><div class="ex-top"><b>Rubbish and recycling</b>${ar}</div><span class="ex-tag">${EXI.moon}Tonight</span><span class="ex-pill"><i>${EXI.bin}</i>${esc(L.bin)}</span></div>
            <div class="ex-tile ex-y" data-ex><span class="ex-ic">${EXI.house}</span><b>House guide</b>${ar}</div>
            <div class="ex-tile ex-r" data-ex><span class="ex-ic">${EXI.phone}</span><b>Emergencies</b>${ar}</div>
          </div>
          <p class="ex-sg">Around the house</p>
          ${card(' ex-line', `<span class="ex-sq g">${EXI.cup}</span>`, 'Local bar &amp; shop', ['Bar, snacks &amp; convenience shop', '2 min walk from the house'], st(L.shop))}
          <div class="ex-pair">
            ${card('', `<span class="ex-sq">${EXI.pizza}</span>`, 'Pizza delivery', ['Pizzeria del Sol', '30 min delivery'], st(L.pizza))}
            ${card('', `<span class="ex-sq y">${EXI.taxi}</span>`, 'Taxi &amp; train', ['Taxi in 20 min, 24/7', '2 train stations'])}
          </div>
          <div class="ex-grid ex-mosaic">
            <div class="ex-tile ex-k ex-tall" data-ex><span class="ex-ic">${EXI.store}</span><b>Markets</b><small>${L.today} today</small>${ar}</div>
            <div class="ex-tile ex-o" data-ex><span class="ex-ic">${EXI.fork}</span><b>Our favourite places to eat</b>${ar}</div>
            <div class="ex-tile ex-g" data-ex><span class="ex-ic">${EXI.star}</span><b>What to do</b>${ar}</div>
          </div>
          <div class="ex-card ex-map" data-ex><span class="ex-ic">${EXI.map}</span><span class="ex-tx"><b>Map of all spots</b><span>64 places</span></span><span class="ex-go" aria-hidden="true">${EXI.arrow}</span></div>
          <p class="ex-sg">What's on</p>
          <div class="ex-on" data-ex>
            <div class="ex-onh"><b>Today</b><span>${esc(L.date)}</span>${EXI.up}</div>
            ${L.markets.map(m => `<div class="ex-it"><span class="ex-sq">${EXI.store}</span><span class="ex-tx"><b>${esc(m.name)}</b><span>${esc(m.kind)}</span><span>${m.km} km from the house</span></span><span class="ex-when"><em class="${m.open ? 'ex-open' : 'ex-closed'}">${esc(m.head)}</em>${esc(m.rest)}</span></div>`).join('')}
            ${L.more > 0 ? `<span class="ex-more">+ ${L.more} more ${L.more === 1 ? 'market' : 'markets'} today</span>` : ''}
            <div class="ex-sec"><h3>Next 2 days${EXI.down}</h3><p>${L.next2} markets</p></div>
            <div class="ex-sec"><h3>Coming up</h3>${L.events.map(e => `<div class="ex-it"><span class="ex-date"><b>${e.d}</b><small>${esc(e.mon)}</small></span><span class="ex-tx"><b>${esc(e.name)}</b><span>${esc(e.where)}</span></span><span class="ex-when">${esc(e.in)}</span></div>`).join('')}</div>
            <div class="ex-links"><span>All markets</span><span>All events</span></div>
          </div>
          <button class="ac-cta" type="button">Make this guide for your house →</button>
        </section>`;
}
// The account card. On the first page (signed out, nothing on this device yet) it asks for the listing link, not an
// account: the account comes at the end, after the wow (docs/plan-fast-builder.md, step 7; Yohann, 29 Oct 2026).
// mode: 'start' (the link), 'signup', 'login', 'recover', 'reset'. sheet: the card alone over the builder, with a close
// button, when the account is needed (Review and send, an artistic cover, Log in in the top bar).
// Resolves true once signed in, 'link' or 'steps' when the visitor starts without one, false when the sheet is closed.
async function gate(mode0, notice, noticeOk, sheet){
  await googleOn();
  return new Promise(resolve => {
    let mode = mode0 || 'start', drawn = 0;
    const el = document.getElementById('acct') || Object.assign(document.createElement('div'), { id: 'acct' });
    if (!el.isConnected) document.body.appendChild(el);
    const done = r => { el.remove(); removeEventListener('keydown', esc_); resolve(r); };
    const esc_ = e => { if (sheet && e.key === 'Escape') done(false); };
    if (sheet) addEventListener('keydown', esc_);
    const draw = (msg, ok) => {
      const up = mode === 'signup', rec = mode === 'recover', reset = mode === 'reset', start = mode === 'start';
      const google = window.__googleOn && (up || mode === 'login');
      const card = `<section class="ac-card">
          <h2>${start ? 'Start with your listing' : reset ? 'Choose a new password' : rec ? 'Reset your password' : up ? (sheet ? 'Save your guide' : 'Create your account') : 'Welcome back'}</h2>
          <p class="lead">${start ? 'See your whole guide in about a minute. No account needed: you save it at the end.' : reset ? 'Pick a new password, then you are back in.' : rec ? 'We email you a link to choose a new password.' : up ? (sheet ? 'Create your account: your guide is kept in it, and you can come back to it from any device.' : 'So you can come back any time and change your answers. It takes a minute.') : 'Log in to continue where you left off.'}</p>
          ${google ? `<button class="gbtn" type="button" id="acGoogle">${GOOGLE_G}Continue with Google</button><div class="or">or with your email</div>` : ''}
          <form id="acForm" novalidate>
          ${start ? `<label for="acUrl">Your listing link</label><input id="acUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.airbnb.com/rooms/…" value="${esc(v('listingUrl'))}">` : ''}
          ${start || reset ? '' : '<label for="acEmail">Email</label><input id="acEmail" type="email" autocomplete="email" inputmode="email" required>'}
          ${start || rec ? '' : `<label for="acPw">${reset ? 'New password' : 'Password'}</label><input id="acPw" type="password" autocomplete="${up || reset ? 'new-password' : 'current-password'}" ${up || reset ? 'minlength="8" placeholder="At least 8 characters"' : ''} required>`}
          <button class="go" type="submit">${start ? 'Show me my guide' : reset ? 'Save password' : rec ? 'Send me the link' : up ? (sheet ? 'Create my account' : 'Create my account') : 'Log in'}</button>
          <div class="acmsg${ok ? ' ok' : ''}" id="acMsg" role="status">${esc(msg || '')}</div>
        </form>
          <div class="alt">${start ? 'Already have an account? <button type="button" data-m="login">Log in</button>' : rec || reset ? '<button type="button" data-m="login">Back to log in</button>' : up ? 'Already have an account? <button type="button" data-m="login">Log in</button>' : `New here? <button type="button" data-m="${sheet ? 'signup' : 'start'}">${sheet ? 'Create an account' : 'Start with your listing'}</button> · <button type="button" data-m="recover">Forgot password?</button>`}</div>
          ${start ? '<div class="alt"><button type="button" id="acSteps">No listing link? Fill it in step by step</button></div>' : ''}
        ${start ? '<p class="small">Your answers stay on this device until you create your account. <a href="/privacy/" target="_blank" rel="noopener">How we handle your data</a></p>'
          : up ? '<p class="small">By creating an account you agree that we store your answers and photos to build your guide, and that we may contact you about it. <a href="/privacy/" target="_blank" rel="noopener">How we handle your data</a></p>' : ''}</section>`;
      el.className = sheet ? 'only' : '';
      el.innerHTML = sheet ? `<div class="ac-sheet" role="dialog" aria-modal="true" aria-label="Your account"><button type="button" class="ac-x" aria-label="Close">×</button>${card}</div>`
        : `<div class="ac2">
        <div class="ac-top"><span class="ac-door" aria-hidden="true"></span>Guest Guide Maker</div>
        <section class="ac-hero"><div class="ac-art" aria-hidden="true"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><i class="s5"></i></div>
          <div class="ac-name"><small>Guest guides for holiday homes</small><h1>Your guest guide, written for you.</h1>
            <p>Paste your Airbnb link: in about a minute you see your whole guide, with the house, the rules, the Wi-Fi and the best of the area, in your guests' languages. Then you make it yours.</p></div>
</section>
        ${card}
        ${acExample()}</div>`;
      const gb = el.querySelector('#acGoogle'); if (gb) gb.onclick = () => { gb.disabled = true; flush(); try { sessionStorage.setItem('porta-return', location.hash); if (sheet) sessionStorage.setItem('porta-saved', '1'); } catch (e) {} location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + '/')}`; };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      const x = el.querySelector('.ac-x'); if (x) x.onclick = () => done(false);
      if (sheet) el.onclick = e => { if (e.target === el) done(false); };
      const st = el.querySelector('#acSteps'); if (st) st.onclick = () => { A._skipStart = true; flush(); done('steps'); setTimeout(() => { location.hash = '#listing'; render(); }); };
      const f = el.querySelector('#acForm'), m = el.querySelector('#acMsg');
      f.onsubmit = async ev => {
        ev.preventDefault();
        if (start) {   // the link: the wow starts at once, no account yet
          const url = el.querySelector('#acUrl').value.trim(), p = url ? linkProblem(url) : 'Paste the link of your listing first.';
          if (p) { m.className = 'acmsg'; m.textContent = p; return; }
          A.listingUrl = url; flush(); done('link'); setTimeout(() => createDraft()); return;
        }
        const email = ((el.querySelector('#acEmail') || {}).value || '').trim(), pw = (el.querySelector('#acPw') || {}).value || '';
        const btn = f.querySelector('.go'); m.className = "acmsg"; m.textContent = '';
        if (!reset && !/^\S+@\S+\.\S+$/.test(email)) { m.textContent = 'That email address does not look right.'; return; }
        if ((up || reset) && pw.length < 8) { m.textContent = 'Choose a password of at least 8 characters.'; return; }
        if (mode === 'login' && !pw) { m.textContent = 'Enter your password.'; return; }
        btn.disabled = true;
        try {
          if (rec) { await sb('/auth/v1/recover', { method: 'POST', body: { email }, token: SB.key }); mode = 'login'; draw('If that email has an account, a link is on its way. Check your inbox.', true); return; }
          if (reset) { await sb('/auth/v1/user', { method: 'PUT', body: { password: pw } }); history.replaceState(null, '', location.pathname); done(true); return; }
          if (up) {
            const j = await sb('/auth/v1/signup', { method: 'POST', body: { email, password: pw }, token: SB.key });
            if (j && j.access_token) { authStore(toSession(j)); try { await nf('signup', { sid, email, device: deviceLine(device()) }); } catch (e) {} done(true); return; }
            mode = 'login'; draw('Almost there: we sent a confirmation link to ' + email + '. Open it on this device (your answers are kept here), then log in.', true); return;
          }
          const j = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: pw }, token: SB.key });
          authStore(toSession(j)); done(true);
        } catch (e) { btn.disabled = false; m.className = "acmsg"; m.textContent = niceError(e); }
      };
      setTimeout(() => { const i = el.querySelector('input'); if (i && (drawn++ || innerWidth >= 900 || sheet)) i.focus(); }, 30);   // on a phone the first page opens on the guide, not the keyboard
    };
    draw(notice, noticeOk);
    if (sheet) return;
    el.addEventListener('click', e => { if (!e.target.closest('.ac-ex [data-ex], .ac-ex .ac-cta')) return; const c = el.querySelector('.ac-card'); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => { const i = c.querySelector('input'); if (i) i.focus({ preventScroll: true }); }, 450); });
    let shown = '';
    const live = setInterval(() => { if (!el.isConnected) return clearInterval(live); const x = el.querySelector('.ac-ex'), h = acExample(); if (x && h !== shown) { shown = h; x.outerHTML = h; } }, 30000);
  });
}
// The account, asked when it is needed (Review and send, an artistic cover, Log in). Once signed in, the page starts
// again: the answers on this device go to the account as a house of their own (acctAttach), and the host is where they were.
async function acctNow(mode){
  if (AUTH) return true;
  const ok = await gate(mode || 'signup', '', false, true);
  if (ok === true) { flush(); try { sessionStorage.setItem('porta-saved', '1'); } catch (e) {} location.reload(); }
  return ok === true;
}
window.__acctNow = acctNow;
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.loginTop, [data-acctnow]'); if (b) acctNow(b.dataset.acctnow || 'login'); });

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

// The visitor started a guide on this device: a listing link, a listing read, or "step by step". Pages seen do not count
// (a step can be drawn before the account is known).
const startedHere = () => !!(A._draftAt || A.listingUrl || A._skipStart);
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
  const local = !!((A._seen && A._seen.length) || A.listingUrl);
  // A guide started on this device before signing in (no account yet, docs/plan-fast-builder.md step 7) becomes a house
  // of its own: never put on top of a house the account already has.
  const pick = startedHere() && !A._acct ? null : HOUSES.find(h => h.id === houseSaved(user.id)) || HOUSES[0];
  if (pick && A._house && A._house !== pick.id) await wipeLocal();     // this device's answers are another house's
  const rows = pick ? await sb('/rest/v1/guides?select=id,answers,status,slug,origin,content,theme,draft&id=eq.' + pick.id) : null;
  if (rows && rows[0]) {
    GUIDE = rows[0];
    const rT = (GUIDE.answers || {})._savedAt || 0, lT = A._savedAt || 0;
    if (rT && (rT > lT || !local)) { await adoptRemote(GUIDE.answers); }
  } else {
    const made = await sb('/rest/v1/guides', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { owner: user.id, answers: cleanForAccount() } });
    GUIDE = made && made[0]; if (GUIDE) HOUSES.push({ id: GUIDE.id, status: GUIDE.status, guideName: A.guideName, place: A.placeName });
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
    if (A.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(A.slug) && A.slug !== GUIDE.slug && !slugTaken()) body.slug = A.slug;
    try { await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', body }); if (body.slug) GUIDE.slug = body.slug; }
    catch (e) { if (e.status === 409 && body.slug) { delete body.slug; await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', body }); slugLater(); } else throw e; }
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
  await slugAsk();   // the last word: someone may have taken it a minute ago
  await acctPush();
  if (A.slug && A.slug !== GUIDE.slug) throw new Error('That web address is taken. Choose one of the free ones above.');
  await ensureFresh();
  try { const r = await sb('/rest/v1/guides?id=eq.' + GUIDE.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { status: 'queued' } }); if (r && r[0]) { GUIDE.status = r[0].status; GUIDE.message = r[0].message; } }
  catch (e) { throw new Error(/web address/i.test(e.message) ? 'Choose a web address for your guide above.' : e.message); }
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
  try { const back = sessionStorage.getItem('porta-return'); if (back != null) { sessionStorage.removeItem('porta-return'); if (AUTH && back) history.replaceState(null, '', location.pathname + back); } } catch (e) {}   // back from Google, where the host was
  // Not signed in: the first page asks for the listing link; a visitor who already started goes on where they were. The
  // answers stay on this device until they make an account (acctNow).
  if (!AUTH && !startedHere()) await gate('start', notice, noticeOk);
  if (!AUTH) { if (!document.querySelector('.loginTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'loginTop'; b.textContent = 'Log in'; acctBar().appendChild(b); } return; }
  try { if (sessionStorage.getItem('porta-saved')) { sessionStorage.removeItem('porta-saved'); setTimeout(() => toast('Your guide is saved to your account.'), 700); } } catch (e) {}
  try { await acctAttach(); }
  catch (e) { if (e.status === 401 || e.status === 403) { authStore(null); await accountBoot(); return; } /* offline: keep working on this device */ }
  try { cmInit(); } catch (e) {}
  if (!CM.on && GUIDE && GUIDE.status === 'draft' && !A._researchJob) researchStart();   // the full research, now that the guide has an account
  if (!document.querySelector('.logoutTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'logoutTop'; b.textContent = 'Log out'; acctBar().appendChild(b); }
  acctHouses();
}
