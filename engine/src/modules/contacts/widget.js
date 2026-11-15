// The Emergencies widget on Home: its entry tile with its short label ("Emergencies"; the page keeps its full title), its
// arrow, no live line (README.md, "Its look"). What Home's tile is made of: { label, meta, live, cls, extra }, for
// tile(key, label, href, meta, live, cls, extra) in views/home.js.
import { t } from '../../i18n.js';
import { tileLabelKey } from './plan.js';

export const widget = (now, sec) => ({ label: t(tileLabelKey(sec)), meta: '', live: false, cls: '', extra: '' });
