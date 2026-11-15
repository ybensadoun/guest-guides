// The kinds of event, their icons and colours (README.md rule 4: eighteen kinds, the same set in the guide, the maker, the
// worker's research and the events file). Drawn by row.js. Written as they are, one line per kind and the colours on one
// line, because the maker's build (onboarding-site/src/build.py), its checks (onboarding-site/test/check.mjs) and the
// worker's test of event kinds (worker/test/event-kinds.test.mjs) read them as text in this file.
import { GI } from '../../ui.js';

export { EVENT_ICON, EVENT_TONE };
const EVENT_TONE = { castells: 'var(--tone-red)', festa: 'var(--tone-orange)', carnival: 'var(--tone-green)', parade: 'var(--tone-blue)', food: 'var(--tone-wine)', fair: 'var(--tone-taxi)', film: 'var(--ink)', music: 'var(--tone-wine)', historical: 'var(--ink)', tradition: 'var(--tone-blue)', sports: 'var(--tone-red)', theatre: 'var(--tone-green)', art: 'var(--tone-orange)', kids: 'var(--tone-wine)', christmas: 'var(--tone-red)', religious: 'var(--tone-wine)', fireworks: 'var(--tone-blue)', flowers: 'var(--tone-green)' };
const EVENT_ICON = {
  castells: GI('<circle cx="12" cy="3.5" r="1.5"/><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="6" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="18" cy="13" r="1.5"/><path d="M4 21v-3a2 2 0 0 1 4 0v3M10 21v-3a2 2 0 0 1 4 0v3M16 21v-3a2 2 0 0 1 4 0v3"/>'),
  festa: GI('<path d="M4 20L9 5l10 10z"/><path d="M14 4l1-2M18 7l2-1M19 3l1 1"/>'),
  carnival: GI('<path d="M3 8c3-1 6-1 9 1 3-2 6-2 9-1-1 6-4 9-7 7-1-1-1-2-2-2s-1 1-2 2c-3 2-6-1-7-7z"/>'),
  parade: GI('<path d="M5 9l2-5 3 4 2-5 2 5 3-4 2 5v3H5z"/><path d="M5 15h14v5H5z"/>'),
  food: GI('<path d="M8 3v6a4 4 0 0 0 8 0V3z"/><path d="M12 13v8M8 21h8"/>'),
  fair: GI('<path d="M3 9l2-5h14l2 5"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>'),
  film: GI('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 6l4-3M10 6l4-3M17 6l4-3"/>'),
  music: GI('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  historical: GI('<path d="M4 21h16M5 21V10l7-6 7 6v11M9 21v-6h6v6"/>'),
  tradition: GI('<path d="M12 3c1 2 3 3 3 6a3 3 0 0 1-6 0c0-3 2-4 3-6z"/><path d="M10 13h4v8h-4z"/>'),
  sports: GI('<path d="M7.5 2.5l3.5 7.2M16.5 2.5L13 9.7"/><circle cx="12" cy="15.5" r="5.5"/>'),
  theatre: GI('<path d="M2.5 3h19"/><path d="M3 3v3c1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0V3"/><path d="M4 8.5c.5 4.5 2.5 7.5 5 9-1 1-1.5 2-1.5 3.5H4zM20 8.5c-.5 4.5-2.5 7.5-5 9 1 1 1.5 2 1.5 3.5H20z"/>'),
  art: GI('<path d="M8.5 7L12 3.5 15.5 7"/><rect x="3.5" y="7" width="17" height="13" rx="1"/><path d="M7 17l3.5-4 2.5 2.5 2-2 2 3.5"/>'),
  fireworks: GI('<path d="M10 2v3.5M10 12.5V16M3 9h3.5M13.5 9H17M5 4l2.5 2.5M12.5 11.5L15 14M5 14l2.5-2.5M12.5 6.5L15 4"/><path d="M19 16v5M16.5 18.5h5"/>'),
  religious: GI('<path d="M12 2.5V6M9 2.5h6"/><path d="M7 17.5c.8-1 1-2.5 1-4.5v-3a4 4 0 0 1 8 0v3c0 2 .2 3.5 1 4.5"/><path d="M4.5 17.5h15"/><path d="M10.5 20.5a1.5 1.5 0 0 0 3 0"/>'),
  christmas: GI('<path d="M12 1.2l.76 1.95 2.09.12-1.61 1.33.52 2.03L12 5.5l-1.76 1.13.52-2.03-1.61-1.33 2.09-.12z"/><path d="M12 8l-5 5.5h2.5L5.5 18h13l-4-4.5H17z"/><path d="M12 18v3"/>'),
  kids: GI('<path d="M12 2.5c3.2 0 5.5 2.6 5.5 6 0 3.7-2.8 6.6-5.5 7-2.7-.4-5.5-3.3-5.5-7 0-3.4 2.3-6 5.5-6z"/><path d="M12 15.5l-1 1.5h2z"/><path d="M12 17c-1.6 1.3 1.6 2.4 0 4.5"/>'),
  flowers: GI('<path d="M10.95 6.56a2.4 2.4 0 1 1 2.1 0 2.4 2.4 0 1 1 .64 1.99 2.4 2.4 0 1 1-1.69 1.23 2.4 2.4 0 1 1-1.69-1.23 2.4 2.4 0 1 1 .64-1.99z"/><path d="M12 9.8V21"/><path d="M12 17.5c0-2.5 2-4 5-4 0 2.8-2 4-5 4z"/>')
};
