// The markets widget on Home: the entry tile with the count of today's markets ("7 today"), always live (README.md, "On Home").
import { t } from '../../i18n.js';
import { todaysMarkets } from './data.js';

// What Home's tile is made of: { label, href, meta, live, cls, extra }, for tile(key, label, href, meta, live, cls, extra) in
// views/home.js. Its own label ("Markets") and link: the day's list (#markets/today, main.js), whatever the section's status
// (the frame places markets whatever it is, ../frame.js shown). The count is the day's markets of the default kinds,
// whatever filters were set on the Markets page (data.js).
export const widget = (now = new Date()) => ({ label: t('markets'), href: '#markets/today', meta: t('openToday', { n: todaysMarkets(now).length }), live: true, cls: '', extra: '' });
