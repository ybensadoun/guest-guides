import qrcode from 'qrcode-generator';
import { t, tx, locale } from '../i18n.js';
import { MARKETS, MAP_ITEMS, SECTIONS, CATS, QUICK, HOUSE, slots, SITE, MODULE_ON } from '../content.js';
import { runsOn, statusLabel, cap, nextOpen, closedStatus } from '../schedule.js';
import { esc, title, catIcon, SECTION_LOOK, stHTML, distHTML } from '../ui.js';
import { sorted } from './markets.js';
import { st, DEFAULT_CATS } from '../state.js';
import { tileText, plan, mainOf, FRACTIONS, isRed, CONTAINERS_ONLY } from '../garbage.js';
import { upcoming, dateRange, when, dayBadge } from '../events.js';
import { eventRow } from './section.js';

// Home always shows the day's markets with the default types, whatever filters were set on the Markets page.
// Its links reset the Markets filters (see main.js), so the list it opens matches the count.
export const todaysMarkets = now => sorted(MARKETS.filter(m => DEFAULT_CATS.includes(m.cat) && runsOn(m, now).length));

// First day in the next two weeks with markets (same filters), for the "Next markets" card.
function nextMarketDay(now) {
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    const list = todaysMarkets(d);
    if (list.length) return { i, d, list };
  }
  return null;
}
const hhmm = h => h.replace(/^0/, '');
const timesOn = (m, d) => runsOn(m, d).map(x => (x.m ? t('morning') : `${hhmm(x.o)}-${hhmm(x.c)}`)).join(', ');

// Without the house page (module off), the house card opens the house guide instead.
const HOUSE_LINK = MODULE_ON('house') ? '#s/house' : '#s/message';

export function renderHome(V) {
  const now = new Date();
  const todays = todaysMarkets(now);
  const nx = nextMarketDay(now);
  const longDate = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
  // What's on: one agenda by day. Today: the markets running today and events on now.
  // Tomorrow: how many markets (one row) and events starting. Then the next event days (6 weeks).
  const mrow = m => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
     <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
     ${stHTML(statusLabel(m, now))}</a>`;
  const evSec = SECTIONS.find(x => x.kind === 'events');
  const evs = upcoming(evSec?.data?.items, now).filter(x => x.on || x.days <= 42);
  // Events expand in place with the same details as on the Local events page.
  const erow = x => { const b = dayBadge(x.o); return eventRow(x.e, x.o, x.on, { dot: `<span class="dbadge"><b>${b.d}</b><small>${esc(b.m)}</small></span>`, right: `<span class="st ${x.on ? 'open' : 'plain'}">${esc(when(x))}</span>` }); };
  // One row per day for the next two days: "Tue 6 Oct · 9 markets", red like the market icons.
  const msum = (list, href, d) => `<details class="mrow dayrow"><summary><span class="dbadge dday"><small>${esc(fmtWd(d))}</small><b>${d.getDate()}</b></span>
     <span class="nm">${esc(shortDay(d))}<small>${esc(t('nMarkets', { n: list.length }))} · ${esc([...new Set(list.map(m => m.town))].slice(0, 3).join(', '))}${list.length > 3 ? '…' : ''}</small></span>
     <span class="rt"><span class="chev" aria-hidden="true"></span></span></summary>
     <div class="mbody"><div class="mini nested">${list.map(m => `<a href="#map/m/${encodeURIComponent(m.id)}"><span class="dot" style="--cc:var(--c-${m.cat})">${catIcon(m.cat)}</span>
       <span class="nm">${esc(title(m))}<small>${esc(t('cat_' + m.cat))}</small>${distHTML(m)}</span>
       <span class="st plain">${esc(timesOn(m, d))}</span></a>`).join('')}</div></div></details>`;
  const fmtWd = d => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(d).replace('.', '');
  const shortDay = d => cap(new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(d));
  const dayH = (label, d) => `<div class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}</div>`;
  const plus = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  // Today: everything (markets running today and events on now).
  // Today's markets: open now first, then opening later today, then finished.
  const nmin = now.getHours() * 60 + now.getMinutes(), tmin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const live = m => { const l = statusLabel(m, now); return l && l.cls === 'open' ? 0 : runsOn(m, now).some(x => !x.m && tmin(x.o) > nmin) ? 1 : 2; };
  const todaysS = todays.map((m, i) => ({ m, i, k: live(m) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.m);
  const nOpen = todays.filter(m => live(m) === 0).length;
  const todayLive = todays.some(m => live(m) < 2) || evs.some(x => x.on);
  const todayRows = [...todaysS.slice(0, 3).map(mrow), ...(todays.length > 3 ? [`<a class="wo-more" href="#markets/today">${esc(t('moreMarkets', { n: todays.length - 3 }))}</a>`] : []), ...evs.filter(x => x.on).map(erow)];
  // Next 2 days: the markets of each day as one row, plus events starting then.
  const soonRows = [1, 2].flatMap(n => { const l = todaysMarkets(plus(n)); return [...(l.length ? [msum(l, '#markets/day/' + n, plus(n))] : []), ...evs.filter(x => !x.on && x.days === n).map(erow)]; });
  // Coming up (from day 3, 6 weeks): events only, plus the monthly antiques markets, which are worth planning for.
  const monthly = MARKETS.filter(m => m.s.some(x => x.nth)).map(m => { const nx = nextOpen(m, plus(3)); return nx && { m, d: nx.date, days: Math.round((nx.date - plus(0).setHours(0, 0, 0, 0)) / 864e5) }; }).filter(x => x && x.days <= 42);
  const later = [...evs.filter(x => !x.on && x.days > 2).map(x => ({ k: x.o.start, html: erow(x) })),
    ...monthly.slice(0, 2).map(x => { const iso = x.d.toLocaleDateString('sv'); const b = dayBadge({ start: iso }); return { k: iso, html: `<a href="#map/m/${encodeURIComponent(x.m.id)}"><span class="dbadge dbm"><b>${b.d}</b><small>${esc(b.m)}</small></span>
     <span class="nm">${esc(title(x.m))}<small>${esc(t('cat_' + x.m.cat))} · ${esc(x.m.town)}</small></span><span class="st plain">${esc(t('inDays', { n: x.days }))}</span></a>` }; })]
    .sort((p, q) => p.k.localeCompare(q.k)).slice(0, 5);
  // Today stays open while something is still on; once everything has finished it folds away
  // and the next two days open instead (with tomorrow's markets unfolded).
  const wsec = (label, d, hint, open, inner) => `<details class="wo-sec"${open ? ' open' : ''}><summary class="wo-day"><b>${esc(label)}</b>${d ? `<span>${esc(longDate(d))}</span>` : ''}${hint ? `<em>${esc(hint)}</em>` : ''}<span class="chev" aria-hidden="true"></span></summary>${inner}</details>`;
  const todayHint = !todayRows.length ? '' : todayLive ? (nOpen ? t('todayOpenN', { n: nOpen }) : '') : t('todayDone');
  let agenda = wsec(t('today'), now, todayHint, todayLive || !todayRows.length, todayRows.length ? `<div class="mini">${todayRows.join('')}</div>` : `<div class="empty">${esc(t('nothingToday'))}</div>`);
  if (soonRows.length) {
    let soon = soonRows.join('');
    if (!todayLive) soon = soon.replace('<details class="mrow dayrow">', '<details class="mrow dayrow" open>');
    const nM = [1, 2].reduce((a, n) => a + todaysMarkets(plus(n)).length, 0), nE = evs.filter(x => !x.on && x.days <= 2).length;
    agenda += wsec(t('next2days'), null, [nM ? t('nMarkets', { n: nM }) : '', nE ? t(nE === 1 ? 'nEvent1' : 'nEvents', { n: nE }) : ''].filter(Boolean).join(' · '), !todayLive, `<div class="mini">${soon}</div>`);
  }
  if (later.length) agenda += dayH(t('comingUp')) + `<div class="mini">${later.map(x => x.html).join('')}</div>`;
  const links = [MODULE_ON('markets') ? `<a href="#markets/today">${esc(t('allMarkets'))}</a>` : '', evSec ? `<a href="#s/events">${esc(t('allEvents'))}</a>` : ''].join('');
  if (links) agenda += `<div class="wo-links">${links}</div>`;

  // No header on Home: the language button sits on the first heading's row.
  // The house itself on top, like the standard guest guides: its photo (from the Airbnb listing),
  // the name as a small label, then the three facts guests look for first. Each opens its House guide row.
  const top = `<section class="sthero">
     <div class="hcard">
     ${COVER_PHOTO ? `<a class="hc-ph" href="${HOUSE_LINK}"><img src="${esc(HOUSE.photo)}" style="object-position:${esc(HOUSE.photoPos || '50% 60%')}" alt="" loading="eager" decoding="async" onerror="this.remove()"></a>` : `<a class="hc-ph hc-art" href="${HOUSE_LINK}" aria-hidden="true" tabindex="-1">${THEMED_COVER}</a>`}
     <a class="hc-id" href="${HOUSE_LINK}"><img src="${esc(SITE.logo || 'logo-head.png')}" alt=""><span class="hc-nm"><small class="hc-w">${esc(t('welcomeTo'))}</small><b>${esc(SITE.name)}</b><small>${esc(t('seeHouse'))}</small></span><span class="go" aria-hidden="true">${ARROW}</span></a>
     <div class="keyfacts">
       ${HOUSE.wifi ? `<button type="button" class="kf-wifi" id="wifiBtn"><small>${esc(t('qWifi'))}</small><b>${esc(t('qWifiV'))}</b></button>` : ''}
       <a href="#s/message" data-open="checkout"><small>${esc(t('qCheckout'))}</small><b>${esc(t('qCheckoutV', { time: HOUSE.checkout }))}</b></a>
     </div>
     </div>
   </section>`;
  V.innerHTML = `<div class="wrap" style="gap:14px">
   ${top}
   ${sectionGrid(now, todays.length)}
   ${MODULE_ON('markets') || evSec ? `<h2 class="sh">${esc(t('whatsOn'))}</h2>
   <section class="whatson">${agenda}</section>` : ''}
  </div>`;
  const wb = V.querySelector('#wifiBtn');
  if (wb) wb.addEventListener('click', wifiSheet);
}

// The cover: guests have already booked and seen the listing photos, so by default it sets a welcome tone instead of selling.
// A scene drawn in code from the guide's own colours (no text, so nothing to overlap in any language).
// The host's photo replaces it when house.json has "photo" and "cover" is not "themed".
const COVER_PHOTO = !!HOUSE.photo && HOUSE.cover !== 'themed';
const THEMED_COVER = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect class="a-sky" width="400" height="160"/>
  <circle class="a-sun" cx="246" cy="48" r="15"/>
  <path class="a-far" d="M0 112C60 86 120 88 186 104S318 84 400 98V160H0z"/>
  <path class="a-mid" d="M0 128C80 110 150 114 228 126S350 116 400 120V160H0z"/>
  <g class="a-house"><path class="a-wall" d="M178 104h44v32h-44z"/><path class="a-roof" d="M173 106l27-18 27 18z"/><path class="a-win" d="M186 112h8v8h-8zM206 112h8v8h-8z"/><path class="a-door" d="M196 123h8v13h-8z"/></g>
  <path class="a-tree" d="M238 136c-4 0-5-9-5-19s2-20 5-25c3 5 5 15 5 25s-1 19-5 19zM251 136c-3 0-4-6-4-13s2-14 4-18c2 4 4 11 4 18s-1 13-4 13z"/>
  <path class="a-near" d="M0 140C100 130 220 132 300 138S380 136 400 136V160H0z"/>
</svg>`;

const STAY_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M8 6l2-3h4l2 3"/><circle cx="12" cy="13" r="3.5"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';


// Quick calls: the three numbers guests actually need day to day. One tap dials.
const QI = {
  pizza: '<path d="M12 21L3.5 6.5a14 14 0 0 1 17 0z"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="14" cy="13" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  taxi: '<path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2M18 17v2M9 3h6"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/><circle cx="16.5" cy="14" r="1" fill="currentColor"/>',
  shop: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5M12.5 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5" transform="translate(0 -1)"/><path d="M3 21h15"/>'
};
const qsvg = d => `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const quickIcon = id => qsvg(QI[id] || QI.shop);
const quickRow = () => QUICK.length ? `<div class="qcalls">${QUICK.map(q => `<a class="qcall${q.wide ? ' wide' : ''}" data-q="${q.id}" href="#p/${q.id}">
  <span class="qi">${qsvg(QI[q.id] || QI.shop)}</span><span class="qt"><b>${esc(tx(q.name))}</b>${q.sub ? `<small>${esc(tx(q.sub))}</small>` : ''}${qStatus(q)}</span></a>`).join('')}</div>` : '';
// Live status on the quick tiles that have opening hours (the bar next door, the pizzeria).
function qStatus(q) {
  if (!q.schedule) return '';
  const m = { s: slots(q.schedule) }, now = new Date();
  const s = statusLabel(m, now) || closedStatus(m, now);
  return `<span class="qst ${s.cls}">${esc(s.text)}${s.sub ? `<small> · ${esc(s.sub)}</small>` : ''}</span>`;
}

// Tiles grouped as "At the house" and "Around the house" (Home and the "More" page).
// Garbage and the map are wide tiles; live ones link and show live info, others say "Coming soon".
function sectionGrid(now, todayCount) {
  const tile = (key, label, href, meta, live, cls = '', extra = '') => {
    const look = SECTION_LOOK[key] || SECTION_LOOK.todo;
    // Each tile: flat colour (--tc), text colour (--ti), one Bauhaus shape (CSS, by data-k).
    // Live tiles end with a round arrow; tiles still to come carry a "Soon" sticker instead.
    const vars = `--tc:${look.color};--ti:${look.ink ? 'var(--ink)' : '#fff'};--gofg:${look.ink ? '#fff' : 'var(--ink)'}`;
    const inner = `<span class="ib">${look.icon}</span>
      <span class="gt-tx"><span class="gt-t">${esc(label)}</span>${href && meta ? `<span class="gt-m">${esc(meta)}</span>` : ''}</span>${extra}${href ? `<span class="go" aria-hidden="true">${ARROW}</span>` : `<span class="soon-tag">${esc(t('soonShort'))}</span>`}`;
    return href ? `<a class="gt${live ? ' live' : ''} ${cls}" data-k="${key}" style="${vars}" href="${href}">${inner}</a>` : `<div class="gt soon ${cls}" data-k="${key}" style="${vars}" aria-label="${esc(label)}, ${esc(meta)}">${inner}</div>`;
  };
  const one = sec => {
    if (sec.kind === 'markets') return tile(sec.id, t('markets'), '#markets/today', t('openToday', { n: todayCount ?? todaysMarkets(now).length }), true);
    if (sec.status !== 'live') return tile(sec.id, t(sec.labelKey), null, t('soon'), false);
    if (sec.kind === 'garbage' && CONTAINERS_ONLY) return tile(sec.id, t(sec.labelKey), '#s/' + sec.id, t('gTileContainers'), false, 'wide');
    if (sec.kind === 'garbage') {
      // Small bins for what goes out tonight, the daily red bin last.
      const p = plan(now);
      const bins = [...mainOf(p.list), ...FRACTIONS.filter(isRed)];
      return tile(sec.id, t(sec.labelKey), '#s/' + sec.id, '', true, 'wide has-bins',
        // One white card = "tonight": the label, then each bin with its name (the daily red bin included).
        `<span class="gt-tonight"><span class="gt-tl">${MOON}${esc(t(p.mode === 'now' ? 'gBinsNow' : 'gTonightTag'))}</span>
          <span class="gt-bins">${bins.map(f => `<span class="gtb"><span class="gbc"><span class="gbin" style="--wc:var(--w-${f.id})"></span></span><span class="gtn">${esc(tx(f.name))}</span></span>`).join('')}</span></span>`);
    }
    if (sec.kind === 'events') {
      // The next event on the tile, e.g. "Next: Santa Teresa Fair, 9 Oct".
      const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
      const nx = (sec.data?.items || []).map(e => ({ e, o: e.dates.find(o => new Date(o.end + 'T00:00:00') >= d0) })).filter(x => x.o).sort((a, b) => a.o.start.localeCompare(b.o.start))[0];
      const meta = nx ? t('nextEvent', { name: tx(nx.e.name), date: new Date(nx.o.start + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) }) : '';
      return tile(sec.id, t(sec.labelKey), '#s/' + sec.id, meta, false, 'wide');
    }
    // Short label on the half-width tile ("Emergencies"); the page itself keeps the full title.
    return tile(sec.id, t(sec.id === 'emergency' ? 'emergencyTile' : sec.labelKey), '#s/' + sec.id, '', false);
  };
  const live = x => x.status === 'live';
  // Order follows content/sections.json.
  const group = g => SECTIONS.filter(x => x.group === g);
  const house = group('house').filter(x => x.kind !== 'house'), area = group('area');
  // Garbage wide on top, then the other house tiles side by side.
  // Around the house: the first tile (markets) is tall, the others stack next to it. Map last, wide.
  const wideHouse = house.filter(x => x.kind === 'garbage' && live(x));
  const smallHouse = house.filter(x => !wideHouse.includes(x));
  return `<h2 class="sh">${esc(t('atHouse'))}</h2>
   <div class="ggrid">${wideHouse.map(one).join('')}${smallHouse.map(one).join('')}</div>
   <h2 class="sh">${esc(t('aroundHouse'))}</h2>
   ${quickRow()}
   <div class="ggrid mosaic">${area.filter(x => x.kind !== 'events').map(one).join('')}${MODULE_ON('map') ? tile('map', t('mapTile'), '#map', t('nPlaces', { n: MAP_ITEMS.length }), false, 'wide') : ''}</div>`;
}

export function renderMore(V) {
  V.innerHTML = `<div class="wrap" style="gap:14px">
    <div><h2 class="title">${esc(t('more'))}</h2><p class="lead">${esc(t('moreLead'))}</p></div>
    ${sectionGrid(new Date())}</div>`;
}

// A Wi-Fi QR code made on the spot, for guides whose network has no ready-made one (a host changed the name or password).
function wifiQr(ssid, pw) {
  const q = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  const c = qrcode(0, 'M'); c.addData(`WIFI:T:WPA;S:${q(ssid)};P:${q(pw)};;`); c.make();
  return c.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}
// Wifi sheet: network name, password with a copy button, and a QR code for a second device.
function wifiSheet() {
  const w = HOUSE.wifi;
  const o = document.createElement('div');
  o.className = 'wsheet';
  o.innerHTML = `<div class="ws-card" role="dialog" aria-modal="true">
    <div class="ws-hd"><h3>${esc(t('qWifi'))}</h3><button type="button" class="ws-x" aria-label="${esc(t('close'))}">×</button></div>
    <div class="ws-f"><small>${esc(t('wifiNets'))}</small>${w.networks.map(n => `<b>${esc(n.ssid)}</b><span class="ws-l">${esc(tx(n.label))}</span>`).join('')}</div>
    <div class="ws-f ws-pwrow"><span><small>${esc(t('wifiPwBoth'))}</small><b class="ws-pw">${esc(w.password)}</b></span><button type="button" class="btn primary ws-copy">${esc(t('copyShort'))}</button></div>
    <p class="ws-how">${esc(t('wifiScan'))}</p><div class="ws-qrs">${w.networks.map(n => `<figure>${n.qr || wifiQr(n.ssid, w.password)}<figcaption>${esc(tx(n.label).split(/[:：]/)[0].trim())}</figcaption></figure>`).join('')}</div>
  </div>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.querySelector('.ws-x').onclick = close;
  o.addEventListener('click', e => { if (e.target === o) close(); });
  addEventListener('hashchange', close);
  const cb = o.querySelector('.ws-copy');
  cb.onclick = async () => {
    try { await navigator.clipboard.writeText(w.password); }
    catch { const r = document.createRange(); r.selectNodeContents(o.querySelector('.ws-pw')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
    cb.textContent = t('copied'); setTimeout(() => { cb.textContent = t('copyShort'); }, 2000);
  };
}
