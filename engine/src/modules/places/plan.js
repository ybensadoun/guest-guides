// The places module's rules, with no guide in them (README.md says each rule, who decided it and when): what a place of a
// list is once read, whether guests see it today (its season), whether it is open now, later today or not known, the
// filters of a list and its order. Pure: content.js reads the guide's lists with readSpots, data.js binds the rest to the
// guide, and engine/scripts/places-plan.test.mjs tests them. Only schedule.js is used (hours, statuses, seasons:
// season.js); the order by distance is engine/src/lists.js, handed in as sort.
import { statusLabel, runsOn, offSeason, hiddenNow, noHours } from '../../schedule.js';

// Every section with a list of items (except markets and events) gives its places to the map and to its list, with the
// guide's shared readers (content.js: slots for the schedule rows, slug for the map's groups). A place of a "spots" section
// (Eat and drink, Things to do, Nightlife) is one of the host's; one of any other section (the glass container of rubbish)
// is a utility, shown on the map only when zoomed in. Its id carries its section's ("restaurants-locanda").
export function readSpots(sections, { slots, slug }) {
  const lists = sections.filter(s => s.status === 'live' && s.kind !== 'markets' && s.kind !== 'events' && (s.data?.items || []).length);
  return lists.flatMap(sec => (sec.data?.items || []).map(it => ({
    ...it,
    id: sec.id + '-' + it.id,
    kind: 'spot',
    section: sec.id,
    utility: it.utility ?? sec.kind !== 'spots',
    cat: it.cat || sec.color || sec.id,
    km: it.km_from_house,
    // Map pins group by town. (A spot's `group` is a list filter such as "sights" or "beach", not a place.)
    groupKey: it.mapGroup || it.town,
    groupSlug: slug(it.mapGroup || it.town),
    s: slots(it.schedule)
  })));
}

// Closed for the season and opening more than 30 days from now (schedule.js hiddenNow, our own season only, never Google's):
// not shown to guests, asked at each drawing so a guide left open finds them back on the day. The lists, their map and the
// guide's map follow it (content.js mapItems); markets have no season of this kind (their own rows say their days).
export const shownNow = (m, now = new Date()) => !hiddenNow(m, now);

// Where a place stands now: 0 open now (or open all day), 1 opens later today, 2 closed or not today, 3 not known (no hours
// of ours: Google's live line shows when the row opens, gcard.js). A season of ours and no hours (schedule.js seasonOnly):
// closed out of season, not known in season. A kind with no hours by nature (a beach, a town, a city: schedule.js noHours)
// and no hours of ours counts as open, with no status in its row: it is never "not known".
export function stateOf(s, now) {
  const nmin = now.getHours() * 60 + now.getMinutes();
  const tm = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  if (s.always) return 0;
  if (!(s.s && s.s.length)) return offSeason(s, now) ? 2 : noHours(s) ? 0 : 3;   // a beach, a town, a city: there at any time
  const lab = statusLabel(s, now);
  if (lab && lab.cls === 'open') return 0;
  return runsOn(s, now).some(x => tm(x.o) > nmin) ? 1 : 2;
}

// Feature filters, only the ones some place of the list has; several can be on at once. Which list offers which: by the
// list's kind (listOf, FEAT_LISTS below; README rule 12).
export const FEATS = {
  menuDia: s => (s.setMenus || []).some(x => x.kind === 'menuDia'),
  tasting: s => (s.setMenus || []).some(x => /^tasting/.test(x.kind)),
  dogs: s => (s.tags || []).includes('dogs'),
  veggie: s => (s.tags || []).includes('veggie'),
  kidsfun: s => (s.tags || []).includes('kidsfun')
};
// The kind of a list of places, as kinds.json names its lists: "eat" (Eat and drink), "todo" (Things to do and any other
// list of places: the generator's essentials, kids, day trips), "night" (Nightlife). A section may say its own ("list" in
// sections.json); else the two sections the design names by their id, and every other list is a list of things to do.
export const FEAT_LISTS = { eat: ['menuDia', 'tasting', 'dogs', 'veggie'], todo: ['kidsfun', 'dogs'], night: [] };
export const listOf = sec => (sec && sec.list in FEAT_LISTS ? sec.list : sec && sec.id === 'restaurants' ? 'eat' : sec && sec.id === 'nightlife' ? 'night' : 'todo');

// A list as the page draws it. all: the list's places shown today; kind: the list's kind (listOf); labelled: the quick-filter groups
// that have a label (engine/src/groups.json); sgroup, openf, featf: what the guest chose (state.js, by section id); sort:
// the order by distance (lists.js sorted); now: a Date.
// Returns groups (the quick-filter groups its places have, in order), gsel (the group chosen, else 'all'), timed (some
// place has hours, so the time filters show), ofsel ('any', 'now' or 'later'; a time filter with nothing in it falls back
// to 'any'), byGroup, feats (the feature filters offered), fsel (those on), byFeat, nNow and nLater (what we know only),
// list (in its order) and k3 (where the places whose hours are not known start under a time filter, else -1).
export function listPlan(all, { kind, labelled, sgroup, openf, featf }, sort, now) {
  const groups = [...new Set(all.map(s => s.group).filter(g => g in labelled))];   // only groups with a label
  const gsel = groups.includes(sgroup) ? sgroup : 'all';
  const st = s => stateOf(s, now);
  const timed = all.some(s => s.s && s.s.length);
  let ofsel = timed && ['now', 'later'].includes(openf) ? openf : 'any';
  const byGroup = gsel === 'all' ? all : all.filter(s => s.group === gsel);
  const feats = (FEAT_LISTS[kind] || []).filter(k => all.some(FEATS[k]));
  const fsel = (featf || []).filter(k => feats.includes(k));
  const byFeat = byGroup.filter(s => fsel.every(k => FEATS[k](s)));
  const nNow = byFeat.filter(s => st(s) === 0).length, nLater = byFeat.filter(s => st(s) === 1).length;   // what we know only
  // A filter with nothing in it is hidden, and falls back to Any time if it was selected.
  if ((ofsel === 'now' && !nNow) || (ofsel === 'later' && !nLater)) ofsel = 'any';
  // Open now and Opens later today keep the places whose hours we do not know after the ones we know (6d, 11 Nov 2026).
  const filtered = ofsel === 'any' ? byFeat : byFeat.filter(s => [ofsel === 'now' ? 0 : 1, 3].includes(st(s)));
  // Open now first, then places opening later today, then the rest; each block in the guest's order. Any time keeps the
  // not known among the closed.
  const kOf = s => (ofsel === 'any' ? Math.min(st(s), 2) : st(s));
  const list = timed ? sort(filtered).map((s, i) => ({ s, i, k: kOf(s) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.s) : sort(filtered);
  const k3 = ofsel === 'any' ? -1 : list.findIndex(s => st(s) === 3);
  return { groups, gsel, timed, ofsel, byGroup, feats, fsel, byFeat, nNow, nLater, list, k3 };
}
