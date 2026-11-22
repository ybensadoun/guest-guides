// A text page (section kind "info"): the house guide (Ca La Kimberly's "message"), and the arrival and extras pages of other
// guides (README.md, "Its look"). One expandable row per topic, its photos open in the photo viewer. Route #s/<id>, as every
// section's page (views/section.js asks the module, modules/index.js); a section of a kind with no module is drawn here too.
import { t, tx } from '../../i18n.js';
import { HOUSE, MODULE_ON } from '../../content.js';
import { esc, ICON } from '../../ui.js';
import { sectionFrame, zoomable } from '../../views/section.js';
import { reviewsBlock } from '../house/index.js';
import { GUIDE_ICON } from './icons.js';
import { toneOf, paragraphs, directionsTo, partShown, stayTimes, partItems, isTimeLine } from './plan.js';

export function page(V, sec) {
  // Info page (House guide): one expandable row per topic, same look as the other lists. A part with no words is not drawn.
  const link = l => l.dir
      ? `<a class="btn primary" href="${directionsTo(HOUSE.lat, HOUSE.lng)}" target="_blank" rel="noopener">${ICON.dir}${esc(t(l.labelKey))}</a>`
      : `<a class="btn" href="${esc(l.href)}">${esc(t(l.labelKey))}</a>`;
  // A part's lines: the times of the stay first (the Check-out part, from the house's own facts: rule 14), then its own.
  const linesOf = b => { const own = partItems(b, HOUSE), first = own.findIndex(i => !isTimeLine(i)), n = first < 0 ? own.length : first;   // an old check-in sentence still kept stays first
    return [...own.slice(0, n).map(tx), ...stayTimes(b, HOUSE).map(([k, time]) => t(k === 'checkin' ? 'hgCheckin' : 'hgCheckout', { time })), ...own.slice(n).map(tx)]; };
  const lines = ls => ls.length === 1 ? `<p class="note">${esc(ls[0])}</p>` : ls.length ? `<ul class="glist">${ls.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  const body = `${MODULE_ON('house') ? `<a class="allphotos" href="#s/house"><img src="${esc(HOUSE.photo || 'house.jpg')}" alt=""><span><b>${esc(t('housePhotos'))}</b><small>${esc(t('housePhotosSub'))}</small></span><span class="chev go-r" aria-hidden="true"></span></a>` : ''}<div class="mlist guide">${(sec.data?.blocks || []).filter(b => partShown(b, HOUSE)).map(b => `<details class="mrow" data-id="${esc(b.id)}" data-tone="${esc(b.tone)}" style="--cc:${toneOf(b.tone)}"><summary>
      <span class="dot">${GUIDE_ICON[b.icon] || ''}</span>
      <span class="nm">${esc(tx(b.title))}${tx(b.sub) ? `<small>${esc(tx(b.sub))}</small>` : ''}</span><span class="rt"><span class="chev" aria-hidden="true"></span></span></summary>
      <div class="mbody">
        ${b.photos ? `<div class="gphotos zg">${b.photos.map((f, i) => `<button type="button" data-zoom="${i}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        ${b.body ? paragraphs(tx(b.body)).map(p => `<p class="note">${esc(p)}</p>`).join('') : ''}
        ${lines(linesOf(b))}
        ${b.links ? `<div class="actions">${b.links.map(link).join('')}</div>` : ''}
      </div></details>`).join('')}</div>${sec.id === 'message' && !MODULE_ON('house') ? reviewsBlock() : ''}`;
  // Its photos open in the photo viewer; the row a Home shortcut asked for (Check-out) is opened by sectionFrame.
  sectionFrame(V, sec, body, () => zoomable(V));
}
