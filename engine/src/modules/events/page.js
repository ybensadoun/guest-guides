// The Local events page (README.md, "Its look"): the next date of each event, soonest first, under the name of its month.
// Past dates (and today's finished ones) drop off. Route #s/<id>, as every section's page (views/section.js asks the
// module, modules/index.js).
import { esc } from '../../ui.js';
import { locale } from '../../i18n.js';
import { sectionFrame } from '../../views/section.js';
import { upcoming } from './plan.js';
import { eventRow } from './row.js';

export function page(V, sec) {
  const fmt = (d, o) => d.toLocaleDateString(locale(), o);
  let month = '';
  const body = `<div class="mlist events">${upcoming(sec.data?.items).map(x => {
      const m = fmt(new Date(x.o.start + 'T00:00:00'), { month: 'long', year: 'numeric' });
      const head = m !== month ? `<h3 class="evm">${esc(m.charAt(0).toUpperCase() + m.slice(1))}</h3>` : '';
      month = m;
      return head + eventRow(x.e, x.o, x);
    }).join('')}</div>`;
  sectionFrame(V, sec, body);
}
