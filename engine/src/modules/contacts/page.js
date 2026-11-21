// The Emergencies page (section kind "contacts", README.md "Its look"): the numbers by group, most urgent first. Each row
// says what it is, when it is open (same format and live status as markets), and offers a call button, a map link or an
// online link. Route #s/<id>, as every section's page (views/section.js asks the module, modules/index.js).
import { t, tx } from '../../i18n.js';
import { slots } from '../../content.js';
import { hoursText, statusLabel, closedStatus } from '../../schedule.js';
import { esc, ICON, stHTML, PHONE, tel } from '../../ui.js';
import { sectionFrame } from '../../views/section.js';
import { groupKey, mapsSearch, phoneShown } from './plan.js';

export function page(V, sec) {
  // Emergency contacts: most urgent first. Each row says what it is, when it is open (same format
  // and live status as markets), and offers a call button, a map link or an online link.
  const now = new Date();
  const hours = it => {
    if (it.always) return `<div class="chours"><span class="st open">${esc(t('open24'))}</span></div>`;
    if (!it.schedule) return '';
    const m = { s: slots(it.schedule) };
    const live = statusLabel(m, now);
    const pill = stHTML(live || closedStatus(m, now));
    const next = '';
    return `<div class="chours">${pill}<div class="when">${hoursText(m).map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}${next}</div></div>`;
  };
  const groupName = id => { const k = groupKey(id), s = t(k); return s === k ? '' : s; };   // research can name a group its own way
  const body = (sec.data?.groups || []).map(g => `<section class="cgroup" data-g="${esc(g.id)}">${groupName(g.id) ? `<h3 class="section-h">${esc(groupName(g.id))}</h3>` : ''}
      <div class="clist">${g.items.map(it => `<div class="crow">
        <div class="ctx"><b>${esc(tx(it.name))}</b>${it.what ? `<span>${esc(tx(it.what))}</span>` : ''}${hours(it)}
          ${it.address || it.map || it.link || it.web ? `<span class="clinks">${it.address || it.map ? `<a class="cmap" href="${it.map || mapsSearch(it.address)}" target="_blank" rel="noopener">${ICON.pin}${esc(t('openMap'))}</a>` : ''}${it.web ? `<a class="cmap" href="${esc(it.web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}${it.link ? `<a class="cmap" href="${esc(it.link.url)}" target="_blank" rel="noopener">${esc(t(it.link.label))}</a>` : ''}</span>` : ''}</div>
        ${it.phone ? `<a class="ccall" href="${tel(it.phone)}" aria-label="${esc(tx(it.name))}: ${esc(it.phone)}">${PHONE}<span>${esc(phoneShown(it.phone))}</span></a>` : ''}
      </div>`).join('')}</div></section>`).join('');
  sectionFrame(V, sec, body);
}
