import { t } from '../i18n.js';
import { SECTIONS } from '../content.js';
import { esc, SECTION_LOOK } from '../ui.js';
import { MODULES } from '../modules/index.js';

// A section's page (#s/<id>): a live section's page is its module's (modules/index.js: the house page, the house guide,
// Emergencies, Getting around, rubbish, markets, the host's lists of places, Local events); a kind with no module of its
// own is drawn as a text page (modules/info). A section not live yet says "Coming soon".
export function renderSection(V, id) {
  const sec = SECTIONS.find(s => s.id === id);
  if (!sec) { location.replace('#home'); return; }
  if (sec.status === 'live') { (MODULES[sec.kind]?.page ? MODULES[sec.kind] : MODULES.info).page(V, sec); return; }
  const look = SECTION_LOOK[id] || SECTION_LOOK.todo;
  sectionFrame(V, sec, `<div class="soonbox" data-k="${id}" style="--tc:${look.color};--ti:${look.ink ? 'var(--ink)' : '#fff'}"><span class="ib">${look.icon}</span><b>${esc(t('soon'))}</b></div>`);
}

// A section's page as every list and guide page has it: its title and lead, then its body. Rows the guest had opened stay
// open when the page is drawn again (a filter, the status refreshed each minute); after(), the page's own wiring; then the
// row a Home shortcut asked for (Check-out) is opened. Used by every module that draws a section's page in this shape
// (modules/info, contacts, house, places, events).
export function sectionFrame(V, sec, body, after) {
  const openIds = new Set([...V.querySelectorAll('.mrow[open]')].map(e => e.dataset.id));
  V.dataset.sec = sec.id;
  V.innerHTML = `<div class="wrap" style="gap:16px">
    <div><h2 class="title">${esc(t(sec.labelKey))}</h2>${t(sec.labelKey + 'Lead') !== sec.labelKey + 'Lead' ? `<p class="lead">${esc(t(sec.labelKey + 'Lead'))}</p>` : ''}</div>
    ${body}</div>`;
  V.querySelectorAll('.mrow').forEach(e => { if (openIds.has(e.dataset.id)) e.open = true; });
  if (after) after();
  if (window.__openRow) { const r = V.querySelector(`.mrow[data-id="${window.__openRow}"]`); window.__openRow = null; if (r) { r.open = true; setTimeout(() => r.scrollIntoView({ block: 'center' }), 50); } }
}

// Photos that open in the photo viewer (the house guide's rows, the house page): each [data-zoom] button opens its group
// (the buttons beside it) at its own photo.
export const zoomable = V => V.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => lightbox([...b.parentElement.querySelectorAll('[data-zoom] img')].map(i => i.getAttribute('src')), +b.dataset.zoom)));

// Full-screen photo viewer: swipe through the group, tap the cross or the backdrop to close.
function lightbox(srcs, start) {
  const o = document.createElement('div');
  o.className = 'lbox';
  o.innerHTML = `<div class="lb-track">${srcs.map(s => `<div class="lb-cell"><img src="${s}" alt=""></div>`).join('')}</div><span class="lb-n">${start + 1} / ${srcs.length}</span><button type="button" class="lb-x" aria-label="${esc(t('close'))}">×</button>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
  const tr = o.querySelector('.lb-track');
  requestAnimationFrame(() => { tr.scrollLeft = start * tr.clientWidth; });
  tr.addEventListener('scroll', () => { o.querySelector('.lb-n').textContent = `${Math.round(tr.scrollLeft / tr.clientWidth) + 1} / ${srcs.length}`; }, { passive: true });
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.querySelector('.lb-x').onclick = close;
  o.addEventListener('click', e => { if (e.target.classList.contains('lb-cell')) close(); });
  addEventListener('hashchange', close);
}
