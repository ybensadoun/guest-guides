// Google's own line saying whether a place is open now (Places UI Kit, <gmp-place-details-compact> with the status only:
// "Closed · Opens 13:00", Google's Maps button, Google's credit), for a place we hold no hours for. Yohann's choice, 11 Nov
// 2026: no box, it takes the colour of the panel it sits in and reads like the guide's own lines, where our hours go.
// Loaded live in the guest's browser when the guest opens that place, never stored, never read: its inside is Google's
// closed shadow root, our code only measures the element's outer height to decide whether to show it. Places that ask:
// spots rows (Eat and drink, Things to do, Nightlife) and the Home quick tile page; never markets, events, contacts or
// the map's sheet. Everything about the card lives here; ui.js and place.js draw the slot, main.js mounts it.
import { lang } from './i18n.js';
import KINDS from './kinds.json';

// Measured on the real card with our text sizes: 125 px with a status line ("Open · Closes 20:00", also "Temporarily
// closed"), 105 px when Google has nothing to say (a beach, a town: only its Maps button and its credit, which our own
// button already gives). Anything shorter than this is that empty card and is dropped. The 125 is also the room a row
// keeps for the card while it loads (--gcard-h in app.css), so nothing under it moves when it comes.
const MIN_CARD_PX = 115;
// Seen once: the card never arrived (a spinner for 20 s). Past this wait the place simply keeps our own button.
const CARD_WAIT_MS = 6000;

// Its own escaping (not ui.js's): ui.js imports this module.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Kinds with no door, so no opening hours (kinds.json "hours": false: beach, town, city).
const NO_DOOR = new Set(Object.values(KINDS).filter(l => l && typeof l === 'object').flatMap(l => Object.entries(l)).filter(([, v]) => v && v.hours === false).map(([k]) => k));

// The browser key, restricted by web address, put in the page at the build or at deploy (never in git). A placeholder
// or anything that does not look like a key means no key: no slot anywhere, the guide exactly as without the card.
let KEY = null;
const key = () => {
  if (KEY == null) { const k = (typeof document !== 'undefined' && document.querySelector('meta[name="gmaps-key"]')?.content || '').trim(); KEY = /^[A-Za-z0-9_-]{20,}$/.test(k) && !/^_+[A-Z_]+_+$/.test(k) ? k : ''; }
  return KEY;
};
export const hasKey = () => !!key();

// A place asks for the card only with no hours of ours (slots or open all day), a Google id, a door, a key and a connection.
export const wantsCard = m => !!(m && m.gid && hasKey() && navigator.onLine && !m.always && !((m.s || m.schedule || []).length) && !NO_DOOR.has(m.icon));

// The slot: in a row's body where our own hours lines go, under the address. On the quick tile page it is a section of
// its own with the hours heading, unless the page already has its hours block (a note or a price), which then holds it
// under its own heading.
export const slotHTML = m => `<div class="gcard" data-gcard="${esc(m.gid)}"></div>`;
export const sectionHTML = (m, heading) => `<section class="pl-sec gcard" data-gcard="${esc(m.gid)}"><h3 class="section-h">${esc(heading)}</h3><div class="gcard-in"></div></section>`;

// Google's script, once, when the first card is wanted, in the guide's language at that moment (en-GB: 24-hour times).
// A guest who changes language later keeps the cards in the first one until the guide is reloaded: Google's script
// cannot be loaded twice in a page, and reloading the guide for it would lose where the guest is.
let LIB = null, LIBFAIL = false;
function loadLib() {
  if (LIB) return LIB;
  const language = lang === 'en' ? 'en-GB' : lang;
  // Google's own bootstrap loader (developers.google.com/maps/documentation/javascript/load-maps-js-api), as given.
  (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));m.head.append(a)}));d[l]?0:d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({ key: key(), v: 'weekly', language });
  LIB = google.maps.importLibrary('places').catch(() => {
    // Blocked or offline: every card waiting is dropped, and nothing is asked again until the guide is reloaded.
    LIBFAIL = true;
    for (const c of CARDS.values()) if (c.state === 'wait') drop(c);
    throw new Error('no card');
  });
  return LIB;
}

// One request per place per visit, in memory only: gid -> { state: wait | ok | drop, el, slot, loaded, timer }.
const CARDS = new Map();
const holder = slot => slot.querySelector('.gcard-in') || slot;
const ourButton = slot => slot.closest('.mrow, .place')?.querySelector('[data-gbtn]');
const shown = el => !!(el && el.isConnected && el.getClientRects().length);

// No card for this place: the slot goes and our own "Google Maps" button, kept back while a card could come, is shown.
function noCard(slot) {
  slot.hidden = true;
  const b = ourButton(slot); if (b) b.hidden = false;
}
function drop(c) {
  c.state = 'drop'; clearTimeout(c.timer);
  if (c.el) c.el.remove();
  c.el = null;
  if (c.slot) noCard(c.slot);
}
function accept(c) {
  c.state = 'ok'; clearTimeout(c.timer);
  show(c.slot);
}
// An accepted card in its slot, in sight. Our own "Google Maps" button stays kept back: the card has Google's.
function show(slot) {
  slot.classList.add('on');
  const b = ourButton(slot); if (b) b.hidden = true;
}
// After Google's gmp-load: one or two frames for it to lay out, then its own height says whether it holds hours.
// A row closed meanwhile (not laid out) is judged the next time it opens.
function judge(c) {
  if (c.state !== 'wait' || !c.loaded || !shown(c.slot) || !c.el || c.el.parentNode !== holder(c.slot)) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (c.state !== 'wait' || !shown(c.slot)) return;
    if (c.el.getBoundingClientRect().height >= MIN_CARD_PX) accept(c); else drop(c);
  }));
}
// While it loads the slot is in its place, out of sight (app.css): a row keeps the card's room, so the lines under it do
// not move when it comes; when it does not come the slot goes and the row closes up.

// Mounts the card in a slot that is now on screen (an opened row, the tile page after render). Safe to call again.
export function mount(slot) {
  const gid = slot && slot.dataset.gcard;
  if (!gid) return;
  if (!hasKey() || LIBFAIL || !navigator.onLine && !CARDS.has(gid)) { noCard(slot); return; }
  let c = CARDS.get(gid);
  if (c && c.state === 'drop') { noCard(slot); return; }
  if (c && c.state === 'ok') {
    // Drawn again (a filter, the language, coming back to the page): the same element moves to the new slot.
    if (c.el.parentNode !== holder(slot)) holder(slot).append(c.el);
    c.slot = slot; show(slot); return;
  }
  if (c) { c.slot = slot; if (c.el && c.el.parentNode !== holder(slot)) holder(slot).append(c.el); judge(c); return; }
  c = { state: 'wait', el: null, slot, loaded: false };
  CARDS.set(gid, c);
  c.timer = setTimeout(() => { if (c.state === 'wait') drop(c); }, CARD_WAIT_MS);
  loadLib().then(() => {
    if (c.state !== 'wait') return;
    const t = document.createElement('template');
    t.innerHTML = `<gmp-place-details-compact orientation="vertical"><gmp-place-details-place-request place="${esc(gid)}"></gmp-place-details-place-request><gmp-place-open-now-status></gmp-place-open-now-status><gmp-place-attribution light-scheme-color="gray"></gmp-place-attribution></gmp-place-details-compact>`;
    c.el = t.content.firstElementChild;
    c.el.addEventListener('gmp-load', () => { c.loaded = true; clearTimeout(c.timer); judge(c); });   // arrived in time: judged now, or when its row opens again
    c.el.addEventListener('gmp-error', () => { if (c.state === 'wait') drop(c); });
    holder(c.slot).append(c.el);
  }, () => {});
}

// Every slot on the page that is on screen: the tile page's, and those of rows that are open (also rows opened by code
// after a re-render or by a Home shortcut, so an accepted card is back in the same frame, with no flicker).
export function mountOpen(root) {
  if (!hasKey()) return;
  root.querySelectorAll('[data-gcard]').forEach(s => { if (!s.closest('details:not([open])')) mount(s); });
}
// Rows: the card is asked for when the row opens. toggle does not bubble, so one capture listener, set once.
let watching = false;
export function watchRows() {
  if (watching || !hasKey()) return;
  watching = true;
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d instanceof HTMLDetailsElement && d.open && d.classList.contains('mrow')) d.querySelectorAll(':scope > .mbody > [data-gcard]').forEach(mount);
  }, true);
}
