// The markets widget on Home: the entry tile with the count of the day's markets ("7 today"), always live (README.md, "On Home").
import { t, locale } from '../../i18n.js';
import { nextDay, dayHref } from './data.js';

// What Home's tile is made of: { label, href, meta, live, cls, extra }, for tile(key, label, href, meta, live, cls, extra) in
// views/home.js. Its own label ("Markets") and link, whatever the section's status (the frame places markets whatever it
// is, ../frame.js shown). It counts the markets of the default kinds, whatever filters were set on the Markets page, on the
// day Home leads to (data.js nextDay): today ("7 today") while one is on or still to come, else the next day that has one
// ("9 tomorrow", "3 on Wednesday", past six days its date), and its link opens that day. No count when the next two weeks
// have none.
export const widget = (now = new Date()) => {
  const nx = nextDay(now), fmt = o => new Intl.DateTimeFormat(locale(), o).format(nx.date);
  const meta = !nx ? '' : nx.off === 0 ? t('openToday', { n: nx.n }) : nx.off === 1 ? t('mkTomorrow', { n: nx.n })
    : nx.off < 7 ? t('mkOnDay', { n: nx.n, day: fmt({ weekday: 'long' }) }) : `${nx.n} · ${fmt({ day: 'numeric', month: 'short' })}`;
  return { label: t('markets'), href: dayHref(now), meta, live: true, cls: '', extra: '' };
};
