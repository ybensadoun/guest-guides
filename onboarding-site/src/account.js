/* ---------- Accounts (Supabase): sign up, log in, answers saved to the account ---------- */
const SB = { url: 'https://dmoxszfwulolqkgxtxcp.supabase.co', key: 'sb_publishable_4esKE09oxNusDwlEPNdeWg_sUroV5Kr' };   // public values: the database rules decide who sees what
const AUTH_KEY = 'porta-auth-v1';
let AUTH = null, ACCT_KNOWN = false, GUIDE = null, pushTimer = null, pushing = false, pushAgain = false;
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
  st.textContent = `/* The first page (signed out), the log-in page and the account sheet, in the maker's own look (12 Nov 2026): the paper,
   the header, the start page's navy card (theme2.css .start: the same classes, not a copy), the app's fields and buttons.
   Only the example guide below (.ex-cols) keeps the guides' look (Jost, primaries, outlines): it shows what guests get. */
#acct{position:fixed;inset:0;z-index:200;overflow:auto;overscroll-behavior:contain;background:var(--paper);color:var(--ink);font-family:var(--body);
  --k-ink:#121212;--k-blue:#1D4FA0;--k-red:#D52B1E;--k-yellow:#F5C400;--k-orange:#EC6A1C;--k-green:#0E7C46;--k-line:#DED6C6;--k-muted:#4A4A4A}
#acct *{box-sizing:border-box}
#acct:not(.only)::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.35;background-image:var(--noise)}   /* the page's grain, as behind the app */
#acct :focus-visible:not(input){outline:3px solid var(--ink);outline-offset:2px}   /* the app's yellow ring is too faint on paper and white */
/* The page: the app's screens, the same content width, margins and gaps (src.html body padding and .wrap, 920 px), so the
   header and the phone stay where they are when the link is sent and the app's own screens take over */
#acct .ac2{position:relative;z-index:1;max-width:952px;margin:0 auto;padding:14px 16px 40px;display:flex;flex-direction:column;gap:18px}
/* The header, as the app's (header.top): the logo, the language, Log in, at every width (21 Nov 2026: Log in left the
   panel). On the Log in page it is gone and the language takes the right edge (on a phone its room is kept, so the
   logo wraps as before). On a phone the logo wraps first; the row's
   height is fixed, so switching modes moves nothing under it. */
#acct .ac-top{display:grid;grid-template-columns:minmax(0,auto) minmax(8px,1fr) auto auto;column-gap:12px;row-gap:10px;align-items:center;min-height:48px}
#acct .ac-top>.brand{grid-area:1/1}#acct .ac-top>.lpick{grid-area:1/3}#acct .ac-top>.ac-login{grid-area:1/4;min-height:40px}
#acct .ac-top>.ac-login.off{display:none}#acct .ac-top:has(>.ac-login.off)>.lpick{grid-area:1/3/2/5;justify-self:end}
@media (max-width:599px){#acct .ac-top>.ac-login.off{display:block;visibility:hidden}#acct .ac-top:has(>.ac-login.off)>.lpick{grid-area:1/3;justify-self:auto}}   /* its room kept: the logo wraps as before */
@media (max-width:599px){#acct .ac-top{column-gap:8px}#acct .ac-top>.ac-login,#acct .ac-top>.lpick{min-height:44px}}
/* The form panel: white on the navy card (.st-form, always white) or the sheet (the app's surface): one set of rules, its colours from these */
#acct .ac-card{--ac-ink:#16202E;--ac-muted:#5c636e;--ac-line:#D9DCE2;--ac-bad:#A8402A;--ac-ok:#1E7A4A}
#acct .ac-card.st-form{display:block;padding-bottom:12px}
#acct .ac-card.st-form:has(#acUrl){padding-bottom:18px}   /* the first page's box: the field, the button, one line, no room left under it */
@media (min-width:600px){#acct .ac-card.st-form:has(#acUrl){padding-bottom:20px}}
#acct .st-form :focus-visible:not(input){outline-color:#16202E}
#acct .ac-card h2{margin:0}
#acct .gbtn{width:100%;gap:10px;min-height:52px;font-size:16px}
#acct .gbtn svg{width:20px;height:20px;flex:none}   /* Google's own mark, untouched */
#acct .or{display:flex;align-items:center;gap:12px;margin:14px 0 0;font-size:13.5px;color:var(--ac-muted)}
#acct .or::before,#acct .or::after{content:"";flex:1;border-top:1px solid var(--ac-line)}
#acct .ac-card label{display:block;font-weight:700;font-size:15px;margin:14px 0 6px}   /* the form's labels, not the language picker */
#acct .ac-card>form>label:first-child{margin-top:0}
#acct .go{width:100%;min-height:52px;margin-top:16px;font-size:17px}
#acct .go[disabled]{opacity:.6;cursor:wait}
#acct .acmsg{margin-top:10px;font-size:14px;line-height:1.4;color:var(--ac-bad)}
#acct .acmsg:empty{margin:0}   /* still there for the screen reader, no room kept */
#acct .acmsg.ok{color:var(--ac-ok)}
#acct .ac-note{margin:12px 0 0;font-size:14px;line-height:1.45;color:var(--ac-muted);text-align:center;text-wrap:balance}
#acct .alt{margin-top:4px;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;column-gap:5px;font-size:14px;line-height:1.35;color:var(--ac-muted);text-align:center}
#acct .ac-note+.alt{margin-top:6px}
#acct .alt+.alt{margin-top:0}
#acct .alt button{min-height:44px;padding:0 2px;border:0;background:none;font:inherit;font-weight:600;color:var(--ac-ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
#acct .small{margin:8px 0 0;font-size:12.5px;line-height:1.5;color:var(--ac-muted)}
#acct .small a{color:var(--ac-ink);font-weight:600}
/* The sheet: the card alone over the dimmed builder, like the app's other boxes (account.js .acdel): at the bottom on a
   phone, in the middle on a wide screen; a long card scrolls inside it */
#acct.only,#acct .ac-over{background:rgba(10,10,10,.5);display:flex;align-items:flex-end;justify-content:center;padding:16px}
#acct .ac-over{position:fixed;inset:0;z-index:2;overflow:auto;overscroll-behavior:contain}   /* the same sheet over the first page (no listing link), inside it */
@media (min-width:621px){#acct.only,#acct .ac-over{align-items:center}}
#acct .ac-sheet{position:relative;width:100%;max-width:440px;max-height:100%;overflow:auto;overscroll-behavior:contain;background:var(--surface);color:var(--ink);border-radius:var(--r);box-shadow:0 18px 48px rgba(0,0,0,.25)}
#acct .ac-sheet .ac-card{--ac-ink:var(--ink);--ac-muted:var(--muted);--ac-line:var(--line);--ac-bad:var(--danger);--ac-ok:var(--ok);padding:22px 20px 16px}
#acct .ac-sheet .ac-card h2{font-family:var(--display);font-weight:400;font-size:30px;line-height:1.05;margin:0 0 8px;padding:6px 52px 0 0}   /* the step headers' serif (.mhead h1) */
#acct .ac-sheet p.lead{margin:0 0 18px;color:var(--muted);font-size:16px;line-height:1.45}
/* Signing up: the consent tick first (its whole row the target), its line when a button is pressed without it, Google,
   then the quiet "or use your email" that opens the fields in place */
#acct .ac-card label.ac-consent{display:flex;align-items:flex-start;gap:12px;min-height:44px;margin:0;font-weight:400;font-size:15px;line-height:1.4;color:var(--ac-ink);cursor:pointer}
#acct .ac-consent input{flex:none;width:22px;height:22px;margin:1px 0 0;accent-color:var(--ink,#14233A);cursor:pointer}
#acct .ac-consent span{min-width:0;overflow-wrap:break-word;hyphens:none}
#acct .ac-tick{margin:6px 0 0 34px}
#acct .ac-tick:empty{margin:0}
#acct .ac-consent~.gbtn{margin-top:16px}
#acct .ac-mail{display:block;margin:4px auto 0;min-height:44px;padding:0 6px;border:0;background:none;font:inherit;font-size:15px;color:var(--ac-muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
#acct .ac-mail:hover{color:var(--ac-ink)}
#acct .ac-consent~form{margin-top:16px}
#acct .ac-x{position:absolute;top:14px;right:14px;z-index:1;width:44px;height:44px;background:var(--sunk)}   /* .sheet-x, the app's close button, on white */
/* The first screen (Yohann, 21 Nov 2026: "one screen, one job"): in the navy card the words, the box with the link alone
   and one quiet link, beside a phone with a real guide in it. No arch, no moon. From 900 px two columns, the phone at the
   right, as on the screens that follow (theme2.css .yours); narrower, one column, the phone last, its top in the first
   screen so that it invites the scroll. Log in and the data note left the box (the header, the page's foot). */
#acct .ac-start{padding:26px 18px 24px;gap:22px;grid-template-columns:minmax(0,1fr)}
#acct .ac-main{display:flex;flex-direction:column;min-width:0}
#acct .ac-main>.st-form{margin-top:22px}
#acct .ac-start .st-tx small{min-height:0;padding-right:0}
#acct .ac-steps{margin:12px 0 0}
#acct .ac-steps button{min-height:44px;padding:0;border:0;background:none;font:inherit;font-size:15px;line-height:1.35;color:rgba(244,241,234,.82);text-decoration:underline;text-underline-offset:3px;text-align:left;cursor:pointer}
#acct .ac-steps button:hover{color:#F4F1EA}
#acct .ac-start>.ac-main>.ac-steps :focus-visible{outline-color:#F4F1EA}
#acct .ac-phone{margin:0;justify-self:center;display:flex;flex-direction:column;align-items:center;gap:12px;min-width:0}
#acct .ac-phone .phone{width:min(300px,76vw);box-shadow:0 30px 60px -22px rgba(0,0,0,.6),inset 0 0 0 2px #2b2f35,0 0 0 1px rgba(255,255,255,.12)}
#acct .ac-phone .phone-scr{background:#F3EEE3}
#acct .ac-phone figcaption{max-width:300px;font-size:14px;line-height:1.4;color:rgba(244,241,234,.75);text-align:center;text-wrap:balance}
#acct .ac-phone iframe{opacity:0;pointer-events:none}   /* loading behind the drawn example; shown once the guide is there */
#acct .ac-phone.on iframe{opacity:1;pointer-events:auto}
#acct .ac-phone.on .ac-stand{display:none}
@media (min-width:600px){#acct .ac-start{padding:32px 32px 28px}}
@media (min-width:900px){
  #acct .ac-start{grid-template-columns:minmax(0,1fr) auto;column-gap:56px;align-items:center;padding:32px 40px 28px}
  #acct .ac-main>.st-form{max-width:34rem}
}
/* The phone's stand-in, until the real guide has loaded and for good if it cannot: Ca La Kimberly's home drawn for an
   example house, same pieces, shapes and sizes (acToday, acStandIn), at a phone's width (PHONE_W) scaled to the frame. */
#acct .ac-stand{position:absolute;left:0;top:0;width:390px;padding:46px 14px 24px;transform-origin:0 0;background:#F3EEE3;font-family:"Jost",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--k-ink);cursor:pointer}
#acct .ex-col{display:flex;flex-direction:column;gap:14px;min-width:0}
#acct .ac-stand .ex-tile b{font-size:21px}
/* Guides made with the maker (his "references at the bottom"): one card per showcase guide, words and a button (no
   pictures: a real guide's photos are never committed). One card or three, centred. */
#acct .ac-refs{margin-top:22px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
#acct .ac-refs h2{font-size:clamp(28px,6vw,36px);line-height:1.08}
#acct .ac-refs>p{margin:0;font-size:16px;line-height:1.45;color:var(--muted)}
#acct .ac-reflist{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;width:100%;margin-top:14px}
#acct .ac-ref{flex:1 1 260px;max-width:340px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:22px 22px 20px;border-radius:var(--r);background:var(--surface);box-shadow:var(--shadow);text-align:left}
#acct .ac-ref h3{font-size:26px;line-height:1.1}
#acct .ac-ref p{margin:0 0 16px;font-size:15px;color:var(--muted)}
#acct .ac-ref .btn{margin-top:auto;min-height:44px}
#acct .ac-foot{margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--muted);text-align:center;text-wrap:balance}
#acct .ac-foot a{color:var(--ink);font-weight:600}
#acct [data-ex]{cursor:pointer}
#acct .ex-welcome{background:#fff;border:2px solid var(--k-ink);border-radius:20px;overflow:hidden}
#acct .ac-facts{display:grid;grid-template-columns:1fr 1fr;border-top:1.5px solid var(--k-line)}
#acct .ac-facts div{padding:12px 20px;display:flex;flex-direction:column;gap:2px;min-width:0}
#acct .ac-facts div+div{border-left:1.5px solid var(--k-line)}
#acct .ac-facts small{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--k-muted)}
#acct .ac-facts b{font-weight:600;font-size:16px;color:var(--k-blue)}
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
/* Account row: inside the page header (acctBar), in the page flow, so it never sits on the step bar. On a phone it is the
   header's second line (the houses menu left, Log out right); from 900 px it joins the header's one row: the logo, the
   houses menu beside it, then at the right the save state, the language and Log out (or Log in). */
#acctbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin:0}
header.top{display:grid;grid-template-columns:minmax(0,auto) minmax(8px,1fr) auto;column-gap:12px;row-gap:10px}   /* the logo as wide as it can be, the save state's words go first (i18n.js fitTop) */
header.top>.brand{grid-area:1/1}header.top>.save{grid-area:1/2}header.top>.lpick{grid-area:1/3}
header.top>#acctbar{grid-area:2/1/3/4}
/* Signed out (Log in alone in the row): on the first line beside the language, where the first page has it (21 Nov 2026) */
@media (max-width:899px){header.top:has(>#acctbar>.loginTop:only-child){grid-template-columns:minmax(0,auto) minmax(8px,1fr) auto auto;column-gap:8px}
  header.top>#acctbar:has(>.loginTop:only-child){grid-area:1/4}}
@media (min-width:900px){
  header.top{grid-template-columns:auto auto minmax(8px,1fr) auto auto}
  header.top>.save{grid-area:1/3}header.top>.lpick{grid-area:1/4}
  header.top>#acctbar{display:contents}
  header.top>#acctbar>.houses{grid-area:1/2;margin:0 0 0 10px}
  header.top>#acctbar>.houses>summary{max-width:300px}
  header.top>#acctbar>button{grid-area:1/5}
}
#acctbar:empty{display:none}
#acctbar button,#acct .ac-login{font:600 13px/1 inherit;font-family:inherit;min-height:40px;padding:9px 14px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--paper,#fff);color:inherit;cursor:pointer}
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
// The phone's stand-in (Yohann, 29 Oct 2026: "keep it like Ca La Kimberly, with the fake live info, the Ca La look"; since
// 21 Nov 2026 only in the phone, until the real guide is there): Ca La Kimberly's home for an example house, Casa Sol, with
// only what the guides really show, worked out on the visitor's clock: tonight's bin, open or closed with the next
// opening, how many markets today. Every name is made up and nothing is looked up.
function acToday(){
  const d = new Date(), wd = d.getDay(), mins = d.getHours() * 60 + d.getMinutes();
  const tm = x => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  // Open or closed, the way the guides say it: "Open until 15:00 · Reopens at 18:00", "Closed · Opens at 19:00".
  const hours = (spans, after) => {
    for (let i = 0; i < spans.length; i++) {
      const [a, b] = spans[i];
      if (mins < tm(a)) return { open: false, head: 'Closed', rest: (i ? 'Reopens at ' : 'Opens at ') + a };
      if (mins < tm(b)) return { open: true, head: 'Open until ' + b, rest: spans[i + 1] ? 'Reopens at ' + spans[i + 1][0] : '' };
    }
    return { open: false, head: 'Closed', rest: after };
  };
  return {
    bin: ['Organic waste', 'Organic waste', 'Paper and cardboard', 'Plastic and cans', 'Glass', 'Organic waste', 'General waste'][wd],
    shop: hours([['8:00', '15:00'], ['18:00', '22:00']], 'Opens tomorrow 8:00'),
    pizza: hours([['19:00', '23:30']], 'Opens tomorrow 19:00'),
    today: [3, 4, 5, 4, 7, 5, 6][wd]
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
function acStandIn(){
  const L = acToday(), ar = `<span class="ex-ar" aria-hidden="true">${EXI.arrow}</span>`;
  const st = h => `<span class="ex-st"><em class="${h.open ? 'ex-open' : 'ex-closed'}">${esc(h.head)}</em>${h.rest ? ' · ' + esc(h.rest) : ''}</span>`;
  const card = (cls, sq, title, lines, extra = '') => `<div class="ex-card${cls}">${sq}<span class="ex-tx"><b>${title}</b>${lines.map(x => `<span>${x}</span>`).join('')}${extra}</span></div>`;
  return `<div class="ac-stand" data-ex aria-hidden="true"><div class="ex-col">
          <div class="ex-welcome"><div class="ex-scene">${AC_SCENE}</div>
            <div class="ex-wrow"><span class="ex-logo"></span><span class="ex-wt"><small>Welcome to</small><b>Casa Sol</b><span>See the house</span></span><span class="ex-go">${EXI.arrow}</span></div>
            <div class="ac-facts"><div><small>Wi-Fi</small><b>Tap to connect</b></div><div><small>Check-out</small><b>Before 11:00</b></div></div></div>
          <p class="ex-sg">At the house</p>
          <div class="ex-grid">
            <div class="ex-tile ex-bins"><div class="ex-top"><b>Rubbish and recycling</b>${ar}</div><span class="ex-tag">${EXI.moon}Tonight</span><span class="ex-pill"><i>${EXI.bin}</i>${esc(L.bin)}</span></div>
            <div class="ex-tile ex-y"><span class="ex-ic">${EXI.house}</span><b>House guide</b>${ar}</div>
            <div class="ex-tile ex-r"><span class="ex-ic">${EXI.phone}</span><b>Emergencies</b>${ar}</div>
          </div>
          <p class="ex-sg">Around the house</p>
          ${card(' ex-line', `<span class="ex-sq g">${EXI.cup}</span>`, 'Local bar &amp; shop', ['Bar, snacks &amp; convenience shop', '2 min walk from the house'], st(L.shop))}
          <div class="ex-pair">
            ${card('', `<span class="ex-sq">${EXI.pizza}</span>`, 'Pizza delivery', ['Pizzeria del Sol', '30 min delivery'], st(L.pizza))}
            ${card('', `<span class="ex-sq y">${EXI.taxi}</span>`, 'Taxi &amp; train', ['Taxi in 20 min, 24/7', '2 train stations'])}
          </div>
          <div class="ex-grid ex-mosaic">
            <div class="ex-tile ex-k ex-tall"><span class="ex-ic">${EXI.store}</span><b>Markets</b><small>${L.today} today</small>${ar}</div>
            <div class="ex-tile ex-o"><span class="ex-ic">${EXI.fork}</span><b>Our favourite places to eat</b>${ar}</div>
            <div class="ex-tile ex-g"><span class="ex-ic">${EXI.star}</span><b>What to do</b>${ar}</div>
          </div>
          <div class="ex-card ex-map"><span class="ex-ic">${EXI.map}</span><span class="ex-tx"><b>Map of all spots</b><span>64 places</span></span><span class="ex-go">${EXI.arrow}</span></div>
        </div></div>`;
}
// Guides made with the maker, shown on the first page: the phone holds the first one, live, and the page's foot lists
// them all (Yohann, 21 Nov 2026: "references at the bottom [...] Ca La Kimberly is the one"). Data only: no guide is a
// special case anywhere else in the code. where: in the maker's four languages; url: the guide's own address.
const SHOWCASE = [
  { slug: 'ca-la-kimberly', name: 'Ca La Kimberly', where: { en: 'Catalonia, Spain', es: 'Cataluña, España', fr: 'Catalogne, Espagne', ca: 'Catalunya, Espanya' }, url: 'https://ca-la-kimberly.netlify.app/' }
];
const showWhere = g => g.where[UIL] || g.where.en;
const OUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
// The phone: the drawn example at once, the first showcase guide over it once it has loaded (acPhoneLoad).
const acPhoneHTML = () => `<figure class="ac-phone"><div class="phone"><div class="phone-scr">${acStandIn()}</div></div><figcaption>An example guide.</figcaption></figure>`;
function acRefsHTML(){
  if (!SHOWCASE.length) return '';
  return `<section class="ac-refs" aria-labelledby="acRefs"><h2 id="acRefs">Guides made with Guest Guide Maker</h2><p>Open one and look around as a guest would.</p>
    <div class="ac-reflist">${SHOWCASE.map(g => `<article class="ac-ref"><h3 translate="no">${esc(g.name)}</h3><p translate="no">${esc(showWhere(g))}</p>
      <a class="btn primary" href="${esc(g.url)}" target="_blank" rel="noopener">Open the guide ${OUT_ICON}</a></article>`).join('')}</div></section>`;
}
// The phone on the first page: the drawn example at once; once the page has painted (on a phone, once the phone comes near
// the screen) the first showcase guide is loaded behind it from the shared viewer on this same site, in a frame at a
// phone's width scaled to the phone (/g/<slug>?embed: looked at only, it keeps nothing and leaves this page's history
// alone, engine/src/viewer.js). It is shown when the viewer says the guide is there; if it says no (not published, an
// error, offline) or nothing within 8 s, the frame goes and the example stays for good, so the phone is never empty.
function acPhoneLoad(el){
  const g = SHOWCASE[0], fig = () => el.querySelector('.ac-phone');
  let f = null, timer = 0, state = '';   // '', 'loading', 'on', 'off'
  const fit = () => { const s = fig() && fig().querySelector('.phone-scr'), st = s && s.querySelector('.ac-stand'); if (st && s.clientWidth) st.style.transform = `scale(${s.clientWidth / PHONE_W})`; };
  const scr = fig() && fig().querySelector('.phone-scr');
  if (scr && typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(scr);
  fit();
  if (!g || !scr) return { fit, relang(){} };
  const src = () => `/g/${encodeURIComponent(g.slug)}?embed&lang=${encodeURIComponent(UIL)}`;
  const caption = t => { const c = fig() && fig().querySelector('figcaption'); if (c) c.textContent = t; };
  const fail = () => { state = 'off'; clearTimeout(timer); if (f) { f.remove(); f = null; } const x = fig(); if (x) x.classList.remove('on'); caption('An example guide.'); };
  const onMsg = e => {
    if (!el.isConnected) { clearTimeout(timer); return removeEventListener('message', onMsg); }
    if (!f || e.source !== f.contentWindow || e.origin !== location.origin || !e.data || !e.data.guideEmbed) return;
    clearTimeout(timer);
    if (e.data.guideEmbed !== 'shown') return fail();
    state = 'on'; fig().classList.add('on'); caption(`A real guide: ${g.name}. Tap around.`);
  };
  addEventListener('message', onMsg);
  const wait = () => { clearTimeout(timer); timer = setTimeout(() => { if (state === 'loading') fail(); }, 8000); };
  const load = () => {
    if (state || !el.isConnected || !fig()) return;
    state = 'loading';
    f = document.createElement('iframe'); f.title = `A real guide: ${g.name}. Tap around.`; f.addEventListener('error', fail);
    fig().querySelector('.phone-scr').appendChild(f); if (typeof phoneWatch === 'function') phoneWatch(f);
    f.src = src(); wait();
  };
  const near = () => {
    if (!el.isConnected) return;
    if (typeof IntersectionObserver !== 'function') return load();
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { root: el, rootMargin: '120px 0px' });
    io.observe(fig());
  };
  const after = () => requestAnimationFrame(() => setTimeout(near, 60));   // never before the field and the button are on screen
  if (document.readyState === 'complete') after(); else addEventListener('load', after, { once: true });
  // Another language: the guide in it (the viewer keeps the language the address names).
  const relang = () => { if (f && (state === 'on' || state === 'loading')) { if (state === 'loading') wait(); f.src = src(); } };
  return { fit, relang };
}
// The account card. On the first page (signed out, nothing on this device yet) it asks for the listing link, not an
// account: the link is free, the guide builds itself in a phone, and the account comes right after, before any change
// (Yohann, 23 Nov 2026, docs/plan-fast-builder.md; it was "at the end" from 29 Oct 2026).
// mode: 'start' (the link), 'signup', 'login', 'recover', 'reset'. sheet: the card alone over the page, with a close
// button, when the account is needed (Save my guide on "This is your guide", no listing link, Log in in the top bar).
// o (a sheet's): { to: the address the host lands on once signed in, also back from Google; lead: 'steps' for the
// sheet over the first page when there is no listing link }.
// Resolves true once signed in, 'link' when the visitor sends a link, false when the sheet is closed.
// The consent of Review and send, asked once with the account (the same words, one copy): A.consent.
const CONSENT_TEXT = 'I own these photos and texts or may use them, and I understand the guide is visible to anyone who has its link.';
async function gate(mode0, notice, noticeOk, sheet, o = {}){
  await googleOn();
  return new Promise(resolve => {
    let mode = mode0 || 'start', drawn = 0, mail = false;   // mail: the email fields opened under "Continue with Google"
    // A sheet over the first page (no listing link) goes inside it, so the page stays as it is under it, and closing the
    // sheet leaves the page there.
    const page = sheet && document.querySelector('#acct:not(.only)');
    const el = page ? page.appendChild(document.createElement('div')) : document.getElementById('acct') || Object.assign(document.createElement('div'), { id: 'acct' });
    if (!el.isConnected) document.body.appendChild(el);
    // The sheet's top held where it was when the email opened (below), until the window changes size (a phone turned, its
    // keyboard): then it sits where a sheet sits again.
    const unpin = () => { el.style.alignItems = ''; const sh = el.querySelector('.ac-sheet'); if (sh) sh.style.marginTop = ''; };
    const done = r => { el.remove(); removeEventListener('keydown', esc_); removeEventListener('resize', unpin); resolve(r); };
    if (sheet) addEventListener('resize', unpin);
    const esc_ = e => { if (sheet && e.key === 'Escape') done(false); };
    if (sheet) addEventListener('keydown', esc_);
    const draw = (msg, ok) => {
      const up = mode === 'signup', rec = mode === 'recover', reset = mode === 'reset', start = mode === 'start';
      const google = window.__googleOn && (up || mode === 'login');
      if (!google) mail = true;   // no Google: the email fields at once, as before
      // The mode's own title and sentence: in the sheet on its card; on the page in the navy card, above the white panel,
      // except the first page, whose title is the promise (its own heading stays for the screen reader, the form's name).
      const head = start ? 'Start with your listing' : reset ? 'Choose a new password' : rec ? 'Reset your password' : up ? (sheet ? 'Save your guide' : 'Create your account') : 'Welcome back';
      const lead = start ? 'Paste your listing link. See your whole guide in a minute.' : reset ? 'Pick a new password, then you are back in.' : rec ? 'We email you a link to choose a new password.'
        : up ? (o.lead === 'steps' ? 'With no listing link there is nothing to show yet: create your free account, then fill in your guide step by step.' : 'It’s free: your guide is kept in your account, and you can come back to it from any device.') : 'Log in to continue where you left off.';
      const named = sheet || start ? 'acHead' : 'acTitle';
      // Signing up (Yohann, 23 Nov 2026): the consent tick first, then Google, big; the email and password behind one quiet
      // line under it. Login keeps Google, "or with your email" and the fields, as before.
      const card = `<section class="ac-card${sheet ? '' : ' st-form'}">
          ${sheet ? `<h2 id="acHead">${head}</h2><p class="lead">${lead}</p>` : start ? `<h2 class="sr" id="acHead">${head}</h2>` : ''}
          ${up ? `<label class="ac-consent"><input type="checkbox" id="acConsent"${A.consent ? ' checked' : ''}><span>${CONSENT_TEXT}</span></label><p class="acmsg ac-tick" id="acTick" role="status"></p>` : ''}
          ${google && up ? `<button class="btn gbtn" type="button" id="acGoogle">${GOOGLE_G}Continue with Google</button><button type="button" class="ac-mail" id="acMail"${mail ? ' hidden' : ''}>or use your email</button>`
            : google ? `<button class="btn gbtn" type="button" id="acGoogle">${GOOGLE_G}Continue with Google</button><div class="or">or with your email</div>` : ''}
          <form id="acForm" novalidate aria-labelledby="${named}"${up && !mail ? ' hidden' : ''}>
          ${start ? `<label for="acUrl"${sheet ? '' : ' class="sr"'}>Your listing link</label><input id="acUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://www.airbnb.com/rooms/…" data-ph-short="airbnb.com/rooms/…" value="${esc(v('listingUrl'))}">` : ''}
          ${start || reset ? '' : '<label for="acEmail">Email</label><input id="acEmail" type="email" autocomplete="email" inputmode="email" required>'}
          ${start || rec ? '' : `<label for="acPw">${reset ? 'New password' : 'Password'}</label><input id="acPw" type="password" autocomplete="${up || reset ? 'new-password' : 'current-password'}" ${up || reset ? 'minlength="8" placeholder="At least 8 characters"' : ''} required>`}
          <button class="btn ${sheet ? 'primary' : 'st-go'} go" type="submit">${start ? 'Show me my guide' : reset ? 'Save password' : rec ? 'Send me the link' : up ? 'Create my account' : 'Log in'}${sheet ? '' : ' ' + ARROW}</button>
          <div class="acmsg${ok ? ' ok' : ''}" id="acMsg" role="status">${esc(msg || '')}</div>
        </form>
          ${start && !sheet ? '<p class="ac-note">Free. See your guide first, then save it.</p>' : ''}
          ${start ? '' : `<div class="alt">${rec || reset ? '<button type="button" data-m="login">Back to log in</button>' : up ? 'Already have an account? <button type="button" data-m="login">Log in</button>' : `New here? <button type="button" data-m="${sheet ? 'signup' : 'start'}">${sheet ? 'Create an account' : 'Start with your listing'}</button></div><div class="alt"><button type="button" data-m="recover">Forgot password?</button>`}</div>`}
        ${up ? '<p class="small">By creating an account you agree that we store your answers and photos to build your guide, and that we may contact you about it. <a href="/privacy/" target="_blank" rel="noopener">How we handle your data</a></p>' : ''}</section>`;
      el.className = page ? 'ac-over' : sheet ? 'only' : ''; el.style.alignItems = '';
      // The page: the app's header (Log in beside the language, its room kept while the page is Log in), then the navy card
      // with this mode's words and the panel beside the phone, then the guides made with the maker. The phone is drawn
      // once: a new mode changes everything around it and never moves it (a frame moved in the page loads again).
      const ph = !sheet && el.querySelector('.ac-phone');
      const html = sheet ? `<div class="ac-sheet" role="dialog" aria-modal="true" aria-label="Your account"><button type="button" class="sheet-x ac-x" aria-label="Close">×</button>${card}</div>`
        : `<div class="ac2">
        <header class="ac-top"><span class="brand"><span class="door" aria-hidden="true"></span><b translate="no">Guest Guide Maker</b></span>${langPick()}<button type="button" class="ac-login${mode === 'login' ? ' off' : ''}" data-m="login">Log in</button></header>
        <section class="start ac-start" aria-labelledby="acTitle">
          <div class="ac-main"><div class="st-tx"><small>Guest guides for holiday homes</small><h1 id="acTitle">${start ? 'Your guest guide, written for you.' : head}</h1>
            <p>${lead}</p></div>
          ${card}
          ${start ? '<p class="ac-steps"><button type="button" id="acSteps">No listing link? Fill it in step by step</button></p>' : ''}</div>
          ${ph ? '' : acPhoneHTML()}
        </section>
        ${acRefsHTML()}
        ${start ? '<p class="ac-foot">Your answers stay on this device until you create your account. <a href="/privacy/" target="_blank" rel="noopener">How we handle your data</a></p>' : ''}</div>`;
      if (!ph) el.innerHTML = html;
      else {
        const t = document.createElement('div'); t.innerHTML = html;
        const old = el.querySelector('.ac2'), nu = t.querySelector('.ac2'), card0 = old.querySelector('.ac-start');
        for (const sel of ['.ac-top', '.ac-main']) old.querySelector(sel).replaceWith(nu.querySelector(sel));
        while (card0.nextElementSibling) card0.nextElementSibling.remove();
        old.append(...[...nu.children].slice([...nu.children].indexOf(nu.querySelector('.ac-start')) + 1));
      }
      // Signing up needs the tick: the buttons stay on, and one without it says so under the tick and puts the focus there.
      const tick = el.querySelector('#acConsent'), tickMsg = el.querySelector('#acTick');
      if (tick) tick.onchange = () => { A.consent = tick.checked; queueSave(); if (tick.checked) tickMsg.textContent = ''; };
      const ticked = () => { if (!up || !tick || tick.checked) return true; tickMsg.textContent = 'Tick this box to go on.'; tick.focus(); return false; };
      const gb = el.querySelector('#acGoogle'); if (gb) gb.onclick = () => { if (!ticked()) return; gb.disabled = true; flush(); try { sessionStorage.setItem('porta-return', o.to || location.hash); if (o.steps) sessionStorage.setItem('porta-steps', '1'); if (sheet) sessionStorage.setItem('porta-saved', '1'); } catch (e) {} location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + '/')}`; };
      // "or use your email": the fields open in place, the sheet's top where it was as long as the sheet still fits under it.
      const mb = el.querySelector('#acMail'); if (mb) mb.onclick = () => {
        const sh = el.querySelector('.ac-sheet'), t0 = sh ? sh.getBoundingClientRect().top : 0;
        mail = true; mb.hidden = true; el.querySelector('#acForm').hidden = false;
        if (sh) { const pad = parseFloat(getComputedStyle(el).paddingTop) || 0, top = Math.max(pad, Math.min(t0, innerHeight - pad - sh.offsetHeight)); el.style.alignItems = 'flex-start'; sh.style.marginTop = (top - pad) + 'px'; }
        const em = el.querySelector('#acEmail'); if (em) em.focus({ preventScroll: true });
      };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      const x = el.querySelector('.ac-x'); if (x) x.onclick = () => done(false);
      if (sheet) el.onclick = e => { if (e.target === el) done(false); };
      const st = el.querySelector('#acSteps'); if (st) st.onclick = () => stepsGate();   // no listing link: the account first, over this page
      const f = el.querySelector('#acForm'), m = el.querySelector('#acMsg');
      f.onsubmit = async ev => {
        ev.preventDefault();
        if (start) {   // the link: the wow starts at once, no account yet
          const url = cleanLink(el.querySelector('#acUrl').value), p = url ? linkProblem(url) : 'Paste the link of your listing first.';
          if (p) { m.className = 'acmsg'; m.textContent = p; return; }
          A.listingUrl = url; flush(); done('link'); setTimeout(() => createDraft()); return;
        }
        const email = ((el.querySelector('#acEmail') || {}).value || '').trim(), pw = (el.querySelector('#acPw') || {}).value || '';
        const btn = f.querySelector('.go'); m.className = "acmsg"; m.textContent = '';
        if (!ticked()) return;
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
      setTimeout(() => { const i = el.querySelector('input:not([hidden] *)'); if (i && (drawn++ || innerWidth >= 900 || sheet)) i.focus(); }, 30);   // on a phone the first page opens on the guide, not the keyboard
    };
    draw(notice, noticeOk);
    if (sheet) return;
    // A tap on the drawn example: to the box, its field ready (the real guide, once there, is the guide's own to tap).
    el.addEventListener('click', e => { if (!e.target.closest('.ac-stand')) return; const c = el.querySelector('.ac-card'); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { const i = c.querySelector('input'); if (i) i.focus({ preventScroll: true }); }, 450); });
    const phone = acPhoneLoad(el);
    // The stand-in follows the visitor's clock (tonight's bin, open or closed); another language: the guides' places in it,
    // and the real guide loaded again in it.
    let shown = acStandIn();
    const stand = () => { const x = el.querySelector('.ac-stand'), h = acStandIn(); if (x && h !== shown) { shown = h; x.outerHTML = h; phone.fit(); } };
    const relang = () => { if (!el.isConnected) return removeEventListener('porta-lang', relang); stand(); const r = el.querySelector('.ac-refs'); if (r) r.outerHTML = acRefsHTML(); phone.relang(); };
    addEventListener('porta-lang', relang);
    const live = setInterval(() => { if (!el.isConnected) return clearInterval(live); stand(); }, 30000);
  });
}
// The account, asked when it is needed (Save my guide on "This is your guide", no listing link, an artistic cover, Log
// in). Once signed in, the page starts again: the answers on this device go to the account as a house of their own
// (acctAttach), and the host lands on o.to (the first step), else where they were. o.gate names the gate for the count:
// the sheet shown there is one event of the maker's own log (log('gate', ...)), set against the links pasted
// (draft_start) and the accounts made (the signup form).
async function acctNow(mode, o = {}){
  if (AUTH) return true;
  if (o.gate) { log('gate', o.gate); queueSave(); }
  const ok = await gate(mode || 'signup', '', false, true, o);
  if (ok === true) { flush(); try { sessionStorage.setItem('porta-saved', '1'); if (o.to) sessionStorage.setItem('porta-return', o.to); if (o.steps) sessionStorage.setItem('porta-steps', '1'); } catch (e) {} location.reload(); }
  return ok === true;
}
window.__acctNow = acctNow;
// No listing link (the first page's quiet link, or "Or fill it in step by step"): there is no house to show, so the account
// comes first, over the page; closing it leaves the page as it was. Once signed in, Load your listing, step by step.
const stepsGate = () => acctNow('signup', { to: '#listing', lead: 'steps', steps: true, gate: 'steps' });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.loginTop, [data-acctnow]'); if (b) acctNow(b.dataset.acctnow || 'login', b.dataset.to ? { to: b.dataset.to, gate: b.dataset.gate } : {}); });

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
  p._uploads = uploads.filter(u => !u.remote && u.path).map(u => ({ kind: u.kind, path: u.path, room: u.room || '', label: u.roomLabel || '', name: u.name || '' }));
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
  // Only real answers make this device's guide: the steps opened before the account's answers came (a step's own address
  // on a second device) date the answers too, and must never put a near empty guide over the account's.
  const real = x => Array.isArray(x) ? x.length > 0 : x && typeof x === 'object' ? Object.keys(x).length > 0 : !!String(x ?? '').trim();
  const local = startedHere() || Object.entries(A).some(([k, x]) => !k.startsWith('_') && real(x));
  // A guide started on this device before signing in (no account yet, docs/plan-fast-builder.md step 7) becomes a house
  // of its own: never put on top of a house the account already has.
  const pick = startedHere() && !A._acct ? null : HOUSES.find(h => h.id === houseSaved(user.id)) || HOUSES[0];
  if (pick && A._house && A._house !== pick.id) await wipeLocal();     // this device's answers are another house's
  const rows = pick ? await sb('/rest/v1/guides?select=id,answers,status,slug,origin,content,theme,draft,finished_at&id=eq.' + pick.id) : null;
  if (rows && rows[0]) {
    GUIDE = rows[0];
    const rT = (GUIDE.answers || {})._savedAt || 0, lT = A._savedAt || 0;
    if (GUIDE.answers && (!local || (rT && rT > lT))) { await adoptRemote(GUIDE.answers); }
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
  // The house being worked on: its name as the host has it now and its state as the server has it, not as they were when
  // the list was read (a house just added said "New house, not built yet" while its guide was being built).
  if (cur.id === GUIDE.id) { cur.guideName = A.guideName || cur.guideName; cur.place = A.placeName || cur.place; cur.status = GUIDE.status || cur.status; }
  const html = `<summary aria-label="Your houses"><b>${esc(houseName(cur))}</b></summary><div class="hmenu">${HOUSES.map(h => `<div class="hrow"><button type="button" data-house="${esc(h.id)}"${h.id === GUIDE.id ? ' aria-current="true"' : ''}><b>${esc(houseName(h))}</b><small>${esc(houseState(h))}${h.id === GUIDE.id ? ' · open now' : ''}</small></button><button type="button" class="hdel" data-delhouse="${esc(h.id)}" aria-label="Delete ${esc(houseName(h))}" title="Delete this house">${TRASH}</button></div>`).join('')}<button type="button" class="add" data-addhouse>+ Add a house</button><button type="button" class="gone" data-delacct>Delete my account</button></div>`;
  if (!d) { d = document.createElement('details'); d.className = 'houses'; acctBar().prepend(d); }
  const open = d.open; d.innerHTML = html; d.open = open;
}
// The houses menu closes like any menu: a click outside it, or Escape. Opening it redraws it, so it is never stale.
document.addEventListener('click', e => { const d = document.querySelector('#acctbar .houses[open]'); if (d && !(e.target.closest && e.target.closest('#acctbar .houses'))) d.open = false; });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const d = document.querySelector('#acctbar .houses[open]'); if (d) { d.open = false; const su = d.querySelector('summary'); if (su) su.focus(); } });
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('#acctbar .houses') && e.target.open) acctHouses(); }, true);
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
// The houses menu and "Log out" live in the page header: its second line on a phone, the header's own row on a wide screen.
function acctBar() {
  let b = document.getElementById('acctbar');
  if (!b) { b = document.createElement('div'); b.id = 'acctbar'; const h = document.querySelector('header.top'); if (h) h.append(b); else document.body.prepend(b); }
  return b;
}

/* ---------- Publish: queue the guide for building, then follow its status ---------- */
// The host's own images (logo, cover, photos, inspiration images, the photos that help find the place) stay on their
// device until they publish: then they go to the guide's storage, so the guide builder can use them (their paths travel
// in the answers, _uploads). A kind asked for in the builder and missing here never reaches the guide.
const HOST_KINDS = ['logo', 'cover', 'photo', 'inspiration', 'arrivalPhoto'];
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
  if (!A.sourceLang && GUIDE.status === 'draft') A.sourceLang = UIL;   // a new guide filled in by hand is in the language the host wrote it in; one built before keeps English
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
  if (r && r[0]) { const was = GUIDE.status; GUIDE.status = r[0].status; GUIDE.message = r[0].message; GUIDE.finished_at = r[0].finished_at; if (was !== GUIDE.status) acctHouses(); return r[0]; }   // the houses menu says the new state
  return null;
}
// The guide just built, read again with what the build wrote (content, theme): the ready screen adds the places the host
// keeps to it through the editor (runtime.js readyLoad), so the editor is set up on it, as when the maker opens on a built guide.
async function acctFresh(){
  await ensureFresh();
  const r = await sb('/rest/v1/guides?select=id,answers,status,slug,origin,content,theme,draft,finished_at&id=eq.' + GUIDE.id);
  if (!r || !r[0]) return;
  const h = location.hash; Object.assign(GUIDE, r[0]); cmInit();
  if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);   // cmInit may move to the step the page opened on: this screen stays
}
window.__acctFresh = acctFresh;
window.__acctQueueBuild = acctQueueBuild; window.__acctStatus = acctStatus; window.__acctSendOne = acctSendOne;
window.__acctGuide = () => GUIDE;

async function accountBoot(){
  if (!/^\/(index\.html)?$/.test(location.pathname)) return;     // guide previews at /<name> stay as they are
  authLoad();
  const type = await acctHash();
  if (AUTH) { try { await ensureFresh(); } catch (e) { authStore(null); } }
  ACCT_KNOWN = true;   // from here render() may hold a visitor with no account to the house (runtime.js)
  if (type === 'recovery' && AUTH) await gate('reset');
  let notice = window.__authError ? 'That sign-in did not work. Try again, or use your email.' : '', noticeOk = false;
  try { if (sessionStorage.getItem('porta-deleted')) { sessionStorage.removeItem('porta-deleted'); notice = 'Your account is deleted, with its houses and photos.'; noticeOk = true; } } catch (e) {}
  try { const back = sessionStorage.getItem('porta-return'); if (back != null) { sessionStorage.removeItem('porta-return'); if (AUTH && back) history.replaceState(null, '', location.pathname + location.search + back); } } catch (e) {}   // back from Google or the account just made: where the host was, or the first step
  // Not signed in: the first page asks for the listing link; a visitor who already started goes on where they were. The
  // answers stay on this device until they make an account (acctNow).
  if (!AUTH && !startedHere()) await gate('start', notice, noticeOk);
  if (!AUTH) { if (!document.querySelector('.loginTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'loginTop'; b.textContent = 'Log in'; acctBar().appendChild(b); } return; }
  try { if (sessionStorage.getItem('porta-saved')) { sessionStorage.removeItem('porta-saved'); setTimeout(() => toast('Your guide is saved to your account.'), 700); } } catch (e) {}
  try { await acctAttach(); }
  catch (e) { if (e.status === 401 || e.status === 403) { authStore(null); await accountBoot(); return; } /* offline: keep working on this device */ }
  // Signed up from "no listing link": step by step, as that link did before the account came first (A._skipStart, after
  // acctAttach, so that logging in to an account that has a house opens that house).
  try { if (sessionStorage.getItem('porta-steps')) { sessionStorage.removeItem('porta-steps'); if (!startedHere()) { A._skipStart = true; queueSave(); } } } catch (e) {}
  try { cmInit(); } catch (e) {}
  if (CM.on) await readyLanding();   // just built, with found places not looked at yet: the ready screen first (runtime.js)
  if (!CM.on && GUIDE && GUIDE.status === 'draft' && !A._researchJob) researchStart();   // the full research, now that the guide has an account
  if (!document.querySelector('.logoutTop')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'logoutTop'; b.textContent = 'Log out'; acctBar().appendChild(b); }
  acctHouses();
}
