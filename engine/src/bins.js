// What goes out and when, for the rubbish tile and page. The rule (Yohann, 13 Nov 2026): "let's only show what they need to
// take out on this evening, which means that it will be collected in the next morning." A guide with a bin that goes out
// every evening (Ca La Kimberly's red bin) always has something; a guide without one has evenings with nothing, and then
// the tile and the page say "Nothing tonight" and no more: the week list on the page shows the days to come.
// Pure, so it is tested without a guide (engine/scripts/bins.test.mjs).
// now: a Date. on(day): the fractions collected on that weekday (0 = Sunday). collectMin: the collection hour in minutes
// from midnight, not a number when the guide gives none.
// Returns { mode, day, list, collectedToday }. mode 'now': before this morning's collection, when it has something (its bins
// are still to go out); else 'tonight', for tomorrow's collection, list empty on an evening with nothing to take out.
// day: the collection weekday in hand. collectedToday: what was collected this morning, until 20:00 (bins to bring back in).
export function planOf(now, on, collectMin) {
  const mins = now.getHours() * 60 + now.getMinutes(), today = now.getDay();
  if (mins < collectMin && on(today).length) return { mode: 'now', day: today, list: on(today), collectedToday: [] };
  const tomorrow = (today + 1) % 7;
  return { mode: 'tonight', day: tomorrow, list: on(tomorrow), collectedToday: mins < 20 * 60 ? on(today) : [] };
}
// The collection hour as a guide says it: "06:00" is "6:00", and "6 h" in French ("6 h 30"); '' when the guide has none.
export function hourText(time, lang) {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/); if (!m) return '';
  return lang === 'fr' ? `${+m[1]} h${m[2] === '00' ? '' : ' ' + m[2]}` : `${+m[1]}:${m[2]}`;
}
