// The highlights' icons, picked by the card's "icon" (taxi, train, bus, food, shop, pizza), else its id or the id's first
// part ("taxi-2"): plan.js iconKey. Also drawn on Getting around's page and on the shop's pin of the Eat and drink map.
import { iconKey } from './plan.js';

const QI = {
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="16" cy="14.5" r=".8" fill="currentColor"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M9 20l-2 2M15 20l2 2M8 16l-1 4h10l-1-4"/><circle cx="9" cy="13" r=".8" fill="currentColor"/><circle cx="15" cy="13" r=".8" fill="currentColor"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-1.7 1-3 3.2-3 6v3h3v9"/>',
  pizza: '<path d="M12 21L3.5 6.5a14 14 0 0 1 17 0z"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="14" cy="13" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  taxi: '<path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2M18 17v2M9 3h6"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/><circle cx="16.5" cy="14" r="1" fill="currentColor"/>',
  shop: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5M12.5 2.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5" transform="translate(0 -1)"/><path d="M3 21h15"/>'
};
const qsvg = d => `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// A card ({ icon, id }) or a card's id.
export const icon = q => qsvg(QI[iconKey(typeof q === 'string' ? { id: q } : q, QI)]);
