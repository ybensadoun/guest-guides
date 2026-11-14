// The markets widget on Home: the entry tile with the count of today's markets ("7 today"), always live (README.md, "On Home").
import { t } from '../../i18n.js';
import { todaysMarkets } from './data.js';

// What Home's tile is made of: { meta, live, cls, extra }, for tile(key, label, href, meta, live, cls, extra) in views/home.js.
// The count is the day's markets of the default kinds, whatever filters were set on the Markets page (data.js).
export const widget = (now = new Date()) => ({ meta: t('openToday', { n: todaysMarkets(now).length }), live: true, cls: '', extra: '' });
