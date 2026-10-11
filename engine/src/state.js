import { CATS } from './content.js';

// Default market types: everything except the covered market halls (open every day).
// Home always uses this set; the Markets page filters start from it and never change Home.
export const DEFAULT_CATS = CATS.filter(c => c !== 'covered');

export const st = {
  view: 'home',
  mk: 'days',                // markets sub-view: days (14-day strip) | all
  dayOff: 0,                 // selected day in the strip: 0 = today
  cats: new Set(DEFAULT_CATS), // Markets page filter (covered off by default); Home ignores it
  sort: 'house',             // house | me
  me: null,                  // {lat, lng, acc}
  locState: '',
  mapTab: 'all',
  mapAt: null,               // where the map is centred: null = the house area, or {name, lat, lng}
  mapToday: false,
  sgroup: {},
  featf: {},                 // feature filters per section page (menú del día, tasting, dogs, vegetarian)
  openf: {},                 // open now / opens later today filter per section page                // quick filter per section page (What to do)
  mapSel: null               // null | {type:'group', slug} | {type:'item', id}
};

// Chip toggling rule from the prototype: from "all on", a tap isolates that chip;
// otherwise it toggles, and turning the last one off turns everything back on.
export function toggleIn(set, all, c) {
  if (set.size === all.length) return new Set([c]);
  const n = new Set(set);
  if (n.has(c)) { n.delete(c); if (!n.size) return new Set(all); } else n.add(c);
  return n;
}
