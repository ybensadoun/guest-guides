// The highlights' icons, picked by the card's "icon" (taxi, train, bus, food, shop, pizza; todo and nightlife, the star and
// the moon of Things to do and Nightlife, for a place of those lists shown on the home page from the maker's Home page step,
// 15 Nov 2026), else its id or the id's first part ("taxi-2"): plan.js iconKey. Also drawn on Getting around's page and on the shop's pin of the Eat and drink map.
import { iconKey } from './plan.js';

const QI = {
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="16" cy="14.5" r=".8" fill="currentColor"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M9 20l-2 2M15 20l2 2M8 16l-1 4h10l-1-4"/><circle cx="9" cy="13" r=".8" fill="currentColor"/><circle cx="15" cy="13" r=".8" fill="currentColor"/>',
  metro: '<rect x="5" y="2.5" width="14" height="15" rx="2"/><path d="M8 5.5h8"/><rect x="7.5" y="8" width="9" height="4.5" rx="1"/><circle cx="8.5" cy="15" r=".8" fill="currentColor"/><circle cx="15.5" cy="15" r=".8" fill="currentColor"/><path d="M8 17.5l-2.5 4M16 17.5l2.5 4"/>',   // Getting around's page head when its first stop is a metro (never a card's: transport/plan.js iconOf)
  tram: '<path d="M9 2.5l3 2.5 3-2.5M12 5v2"/><rect x="5.5" y="7" width="13" height="11" rx="2.5"/><path d="M5.5 12.5h13"/><circle cx="9" cy="15.3" r=".8" fill="currentColor"/><circle cx="15" cy="15.3" r=".8" fill="currentColor"/><path d="M8.5 18l-2 3.5M15.5 18l2 3.5"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-1.7 1-3 3.2-3 6v3h3v9"/>',
  pizza: '<path d="M12 21L3.5 6.5a14 14 0 0 1 17 0z"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="14" cy="13" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  taxi: '<path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2M18 17v2M9 3h6"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/><circle cx="16.5" cy="14" r="1" fill="currentColor"/>',
  todo: '<path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.3l6-.8z"/>',
  nightlife: '<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/><path d="M17 3.5v2.4M15.8 4.7h2.4"/>',
  shop: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5M12.5 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5" transform="translate(0 -1)"/><path d="M3 21h15"/>'
};
const qsvg = d => `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// A card ({ icon, id }) or a card's id.
export const icon = q => qsvg(QI[iconKey(typeof q === 'string' ? { id: q } : q, QI)]);
