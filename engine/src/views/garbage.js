import { t, tx } from '../i18n.js';
import { GARBAGE, MAP_ITEMS } from '../content.js';
import { FRACTIONS, plan, collectedOn, binName, isRed, mainOf, CONTAINERS_ONLY } from '../garbage.js';
import { dayName, cap } from '../schedule.js';
import { esc, ICON, row } from '../ui.js';

// The red bin (sanitary) goes out every evening, so it is stated once instead of repeated everywhere.
const RED = FRACTIONS.find(isRed);
const pill = f => `<span class="gpill"><i class="gdot" style="background:var(--w-${f.id})"></i>${esc(tx(f.name))}</span>`;
const redLine = key => `<p class="gred" style="--wc:var(--w-sanitary)"><span class="gbin sm"></span>${esc(t(key))}</p>`;
const putItem = f => `<li style="--wc:var(--w-${f.id})"><span class="gbin"></span>
  <span><b>${esc(tx(f.name))}</b><small>${esc(t(isRed(f) ? 'gInEvery' : 'gIn', { bin: binName(f) }))}</small></span></li>`;

function header(f) {
  if (f.bin === 'kitchen') return t('gKitchen');
  if (!f.d.length) return t('gAnyTime');
  if (f.d.length === 7) return t('gEveryDay');
  return f.d.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => cap(dayName(x, 'short'))).join(', ');
}

export function renderGarbage(V) {
  const now = new Date();
  const p = plan(now);
  const main = mainOf(p.list);
  const spot = id => MAP_ITEMS.find(m => m.section === 'garbage' && m.id.endsWith('-' + id));
  const glass = spot('glass'), deix = spot('deixalleria');
  const back = mainOf(p.collectedToday);

  const hero = `<section class="ghero">
    <div class="ghero-hd"><b>${esc(t(p.mode === 'now' ? 'gNow' : 'gTonight'))}</b>
      <span class="sub2">${esc(t('gForMorning', { day: dayName(p.day) }))}</span></div>
    <ul class="gput">${[...main, ...(RED ? [RED] : [])].map(putItem).join('')}</ul>
    ${back.length ? `<p class="gnote">${esc(t('gBringBack', { list: back.map(f => tx(f.name)).join(', ') }))}</p>` : ''}
  </section>`;

  const steps = `<section class="gsec"><h3 class="section-h">${esc(t('gHow'))}</h3>
    <ol class="gsteps">${GARBAGE.steps.map(s => `<li>${esc(tx(s))}</li>`).join('')}</ol></section>`;

  // Containers guests can use (from the host): where they are, what each takes, a map link when there is one.
  const cont = (GARBAGE.containers || []).filter(c => tx(c.where) || (c.takes || []).length);
  const maps = c => c.map || (c.lat != null ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : '');
  const containers = cont.length ? `<section class="gsec"><h3 class="section-h">${esc(t('gWhere'))}</h3>
    <div class="list">${cont.map(c => `<article class="card">
      ${(c.takes || []).length ? `<div class="gpills">${(c.takes || []).map(id => FRACTIONS.find(f => f.id === id)).filter(Boolean).map(pill).join('')}</div>` : ''}
      ${tx(c.where) ? `<div class="note">${esc(tx(c.where))}</div>` : ''}
      ${maps(c) ? `<div class="actions"><a class="btn" href="${esc(maps(c))}" target="_blank" rel="noopener">${ICON.pin}${esc(t('openMap'))}</a></div>` : ''}
    </article>`).join('')}</div></section>` : '';

  // Rows: the evening you put out, then the morning it is collected.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const week = `<section class="gsec"><h3 class="section-h">${esc(t('gWeek'))}</h3><p class="lead">${esc(t('gWeekLead'))}</p>
    ${RED ? redLine('gRedNote') : ''}
    <div class="gweek">${order.map(d => {
      const ev = (d + 6) % 7;
      const isNext = d === p.day;
      const list = mainOf(collectedOn(d));
      return `<div class="grow${isNext ? ' next' : ''}">
        <div class="gwhen"><b>${esc(t('gEvening', { day: cap(dayName(ev)) }))}</b><small>${esc(t('gMorningOf', { day: dayName(d) }))}</small>${isNext ? `<span class="gtag">${esc(t(p.mode === 'now' ? 'today' : 'gTonightTag'))}</span>` : ''}</div>
        <div class="gpills">${list.length ? list.map(pill).join('') : `<span class="sub2">${esc(cap(t('gRedOnly')))}</span>`}</div></div>`;
    }).join('')}</div></section>`;

  const what = `<section class="gsec"><h3 class="section-h">${esc(t('gWhat'))}</h3>
    <div class="list">${FRACTIONS.map(f => `<article class="card" style="--cc:var(--w-${f.id})">
      <div class="hd">${f.bin !== 'kitchen' ? `<span class="gbin" style="--wc:var(--w-${f.id})"></span>` : ''}<div class="hdt"><h3>${esc(tx(f.name))}</h3><span class="sub2">${esc(header(f))}</span></div></div>
      ${f.bin !== 'kitchen' ? `<div class="where">${esc(cap(binName(f)))}</div>` : ''}
      <div class="note">${esc(tx(f.examples))}</div>
      ${f.id === 'glass' && glass ? `<div class="actions"><a class="btn" href="#map/m/${encodeURIComponent(glass.id)}">${ICON.pin}${esc(t('onMap'))}</a></div>` : ''}
    </article>`).join('')}</div></section>`;

  const missed = `<section class="gsec"><h3 class="section-h">${esc(t('gMissed'))}</h3>
    <p class="note" style="margin:0">${esc(tx(GARBAGE.missed))}</p>
    ${GARBAGE.deixalleria ? `<p class="note" style="margin:0">${esc(tx(GARBAGE.deixalleria))}</p>` : ''}
    ${deix ? `<div class="mlist">${row(deix, { date: now, live: true })}</div>` : ''}</section>`;

  V.innerHTML = `<div class="wrap" style="gap:22px">
    <div><h2 class="title">${esc(t('garbage'))}</h2><p class="lead">${esc(t(CONTAINERS_ONLY ? 'gLeadContainers' : 'gLead'))}</p></div>
    ${CONTAINERS_ONLY ? '' : hero}${steps}${containers}${CONTAINERS_ONLY ? '' : week}${what}${missed}</div>`;
}
