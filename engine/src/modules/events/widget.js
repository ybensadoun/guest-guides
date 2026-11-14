// The events widget on Home: the entry tile with the next event, "Next: Santa Teresa Fair, 9 Oct" (README.md, "Its look").
// What Home's tile is made of: { meta, live, cls, extra }, for tile(key, label, href, meta, live, cls, extra) in views/home.js.
import { t, tx, locale } from '../../i18n.js';
import { nextEvent } from './plan.js';

export function widget(now = new Date(), sec) {
  const nx = nextEvent(sec.data?.items, now);
  const meta = nx ? t('nextEvent', { name: tx(nx.e.name), date: new Date(nx.o.start + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) }) : '';
  return { meta, live: false, cls: '', extra: '' };
}
