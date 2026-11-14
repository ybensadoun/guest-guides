// The places module's data: the places of the guide's lists (read once by content.js with this module's readSpots,
// plan.js) and what the list page asks of them. The rules themselves: plan.js.
import { SPOTS } from '../../content.js';
import { shownNow } from './plan.js';
import GROUPS_FILE from '../../groups.json';

// The quick-filter groups a place may have ("fun", "beach", ...), each with its tone (engine/src/groups.json).
export const GROUPS = GROUPS_FILE.groups;

// A list's places shown today (a place closed for the season and opening in more than 30 days is not: plan.js shownNow).
// The counts, the chips, the filters and the list's map all start from this list.
export const placesOf = id => SPOTS.filter(s => s.section === id && shownNow(s));
// The list's places on its map: those with a pin, shown today, in the quick-filter group chosen ('all' or none: every one).
export const pinsOf = (id, group) => SPOTS.filter(s => s.section === id && !s.nomap && shownNow(s) && (group === 'all' || !group || s.group === group));
