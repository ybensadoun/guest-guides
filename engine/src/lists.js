// The order of a list of places and the switch that chooses it, shared by the Markets page (modules/markets) and the host's
// lists of places (modules/places: Eat and drink, Things to do, Nightlife): nearest first, by road from the house, or from
// the guest when they chose "From me" and their position is known (markets/README.md rule 5, places/README.md).
// byDistance is the rule itself, with no guide in it (tests: engine/scripts/lists.test.mjs).
import { st } from './state.js';
import { kmMe } from './geo.js';
import { t } from './i18n.js';
import { esc } from './ui.js';

// Nearest first, by road from the house or from the guest (distOf), a place with no distance known last; then by town.
export function byDistance(list, distOf) {
  const d = v => v == null ? 1e9 : v;   // no distance known: last
  return list.slice().sort((a, b) => (d(distOf(a)) - d(distOf(b))) || a.town.localeCompare(b.town));
}

// Nearest first: from the house, or from the guest when they chose "From me" and their position is known.
export const sorted = list => byDistance(list, st.sort === 'me' && st.me ? kmMe : m => m.km);

// The choice of distance, from the house or from the guest (sorted): in the Markets page's filters, and on the lists of
// the host's places, where it is a small switch (small: true; places/README.md rule 22), the same two buttons.
export const sortRow = ({ small } = {}) => `<div class="row"><div class="pills${small ? ' sm' : ''}" role="group">
    <button data-sort="house" aria-pressed="${st.sort === 'house'}">${esc(t('fromHouse'))}</button>
    <button data-sort="me" aria-pressed="${st.sort === 'me'}">${esc(t('fromMe'))}</button></div>
    ${st.locState ? `<span class="sortnote" role="status">${esc(st.locState)}</span>` : ''}</div>`;
