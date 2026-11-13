// The rubbish widget on Home: what goes out this evening, each bin with its name (README.md, "On Home").
import { t, tx } from '../../i18n.js';
import { esc } from '../../ui.js';
import { plan, mainOf, FRACTIONS, isRed, CONTAINERS_ONLY, collectHour } from './data.js';

const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';

// What Home's tile is made of: { meta, live, cls, extra }, for tile(key, label, href, meta, live, cls, extra) in views/home.js.
export function widget(now = new Date()) {
  // Street containers only, no collection days: one line, no evening to speak of.
  if (CONTAINERS_ONLY) return { meta: t('gTileContainers'), live: false, cls: 'wide', extra: '' };
  // Small bins for what goes out tonight, the daily red bin last.
  const p = plan(now);
  // Only what goes out this evening (13 Nov 2026): with nothing to take out, the tile says so and no more, as the
  // short wide tile of a rubbish tile with no bins to show.
  const bins = [...mainOf(p.list), ...FRACTIONS.filter(isRed)], label = bins.length ? t(p.mode === 'now' ? 'gBinsNow' : 'gTonightTag', { time: collectHour() }) : t('gNoneTonight');
  return { meta: '', live: true, cls: bins.length ? 'wide has-bins' : 'wide',
    // One card = "tonight": the label, then each bin with its name (the daily red bin included).
    extra: `<span class="gt-tonight"><span class="gt-tl">${MOON}${esc(label)}</span>
          ${bins.length ? `<span class="gt-bins">${bins.map(f => `<span class="gtb"><span class="gbc"><span class="gbin" style="--wc:var(--w-${f.id})"></span></span><span class="gtn">${esc(tx(f.name))}</span></span>`).join('')}</span>` : ''}</span>` };
}
