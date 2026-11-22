// The Emergencies page (section kind "contacts", README.md "Its look"): the numbers by group, most urgent first. Each row
// says what it is, when it is open (same format and live status as markets), and offers a call button, a map link or an
// online link. Route #s/<id>, as every section's page (views/section.js asks the module, modules/index.js).
import { t, tx } from '../../i18n.js';
import { slots } from '../../content.js';
import { hoursText, statusLabel, closedStatus } from '../../schedule.js';
import { esc, ICON, stHTML, PHONE, tel } from '../../ui.js';
import { sectionFrame } from '../../views/section.js';
import { groupKey, mapsSearch, phoneShown, contactHours, wordOf, linkOf } from './plan.js';

export function page(V, sec) {
  // Emergency contacts: most urgent first. Each row says what it is, when it is open (same format
  // and live status as markets), and offers a call button, a map link or an online link.
  // Nothing a guide holds may blank this page (README.md rule 11): hours, words and links are read through plan.js, which
  // leaves out what it cannot read, and a contact that still cannot be drawn is left out alone.
  const now = new Date();
  const hours = it => {
    if (it.always === true || it.always === 'true') return `<div class="chours"><span class="st open">${esc(t('open24'))}</span></div>`;
    const sch = contactHours(it.schedule);
    if (!sch.length) return '';   // no hours typed yet, or none that can be read: nothing, never "Closed"
    const m = { s: slots(sch) };
    const live = statusLabel(m, now);
    const pill = stHTML(live || closedStatus(m, now));
    const next = '';
    return `<div class="chours">${pill}<div class="when">${hoursText(m).map(h => `<span>${esc(h.days)} <span class="t">${esc(h.time)}</span></span>`).join('')}${next}</div></div>`;
  };
  const groupName = id => { const k = groupKey(id), s = t(k); return s === k ? '' : s; };   // research can name a group its own way
  const row = it => {
    try {
      const name = wordOf(it.name, tx), what = wordOf(it.what, tx), phone = it.phone == null ? '' : String(it.phone).trim();
      const address = typeof it.address === 'string' ? it.address.trim() : '', map = linkOf(it.map) || (address ? mapsSearch(address) : ''), web = linkOf(it.web);
      const link = it.link && typeof it.link === 'object' && linkOf(it.link.url) && typeof it.link.label === 'string' ? it.link : null;
      return `<div class="crow">
        <div class="ctx"><b>${esc(name)}</b>${what ? `<span>${esc(what)}</span>` : ''}${hours(it)}
          ${map || link || web ? `<span class="clinks">${map ? `<a class="cmap" href="${map}" target="_blank" rel="noopener">${ICON.pin}${esc(t('openMap'))}</a>` : ''}${web ? `<a class="cmap" href="${esc(web)}" target="_blank" rel="noopener">${esc(t('website'))}</a>` : ''}${link ? `<a class="cmap" href="${esc(linkOf(link.url))}" target="_blank" rel="noopener">${esc(t(link.label))}</a>` : ''}</span>` : ''}</div>
        ${phone ? `<a class="ccall" href="${tel(phone)}" aria-label="${esc(name)}: ${esc(phone)}">${PHONE}<span>${esc(phoneShown(phone))}</span></a>` : ''}
      </div>`;
    } catch (e) { console.warn('contacts: a contact could not be drawn', it && it.id, e); return ''; }
  };
  // A contact with no name yet (the host has just added it) is not shown, nor a group with no contact to show (the Health
  // group of a guide that has only 112 yet: README.md rule 10).
  const groups = Array.isArray(sec.data?.groups) ? sec.data.groups : [];
  const body = groups.map(g => ({ id: g && g.id, rows: (g && Array.isArray(g.items) ? g.items : []).filter(it => it && typeof it === 'object' && wordOf(it.name, tx)).map(row).filter(Boolean) })).filter(g => g.rows.length)
    .map(g => `<section class="cgroup" data-g="${esc(g.id)}">${groupName(g.id) ? `<h3 class="section-h">${esc(groupName(g.id))}</h3>` : ''}
      <div class="clist">${g.rows.join('')}</div></section>`).join('');
  sectionFrame(V, sec, body);
}
