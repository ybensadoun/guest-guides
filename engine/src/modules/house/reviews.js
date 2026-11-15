// Ratings and reviews (content/reviews.json, the module "reviews"): on the house page, or at the end of the house guide when
// the guide has no house page (../info/page.js). README.md, "Its look".
import { t, locale } from '../../i18n.js';
import { esc } from '../../ui.js';
import { REVIEWS } from '../../content.js';
import { latestQuotes } from './plan.js';

// A rating the way each language writes it (4.91, 4,91).
export const starsTxt = n => n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Ratings and reviews: the listing's own rating and its latest reviews as they are, with a link to read them all.
// Never a selection by the host. rating/count left empty in reviews.json fall back to the house page's.
export function reviewsBlock(fallback) {
  const r = REVIEWS;
  if (!r) return '';
  const stars = r.rating ?? fallback?.stars, n = r.count ?? fallback?.count, src = r.source || 'Airbnb';
  if (!stars && !r.url) return '';
  const when = d => new Date(d.length === 7 ? d + '-01T00:00:00' : d.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale(), d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  const qs = latestQuotes(r.quotes);
  return `<section class="hsec rev" id="hrev"><h3 class="section-h">${esc(t('reviewsH'))}</h3>
    ${stars ? `<p class="rv-sc"><b>★ ${starsTxt(stars)}</b>${n ? `<span>${esc(t('reviewsCount', { n: n.toLocaleString(locale()), src }))}</span>` : ''}</p>` : ''}
    ${qs.map(q => `<blockquote${q.lang ? ` lang="${esc(q.lang)}"` : ''}><p>${esc(q.text)}</p>${q.name || q.date ? `<footer>${esc([q.name, q.date && when(q.date)].filter(Boolean).join(' · '))}</footer>` : ''}</blockquote>`).join('')}
    <small class="rv-note">${esc(t('reviewsNote', { src }))}${r.updated ? ' ' + esc(t('reviewsChecked', { d: when(r.updated) })) : ''}</small>
    ${r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(t('reviewsAll', { src }))}</a>` : ''}
  </section>`;
}
