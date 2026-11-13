// What the rubbish tile and page say when nothing goes out tonight (Yohann, 13 Nov 2026, on a guide the maker built: "the
// whole point of this widget is that it should show what is on tonight, not just tonight"). Ca La Kimberly has a red bin
// that goes out every evening, so its list was never empty; a guide without one showed "Tonight" over nothing.
// Pure, so it is tested without a guide (engine/scripts/bins.test.mjs).
// p: the plan (garbage.js plan: mode 'now' before this morning's collection, 'tonight' after it; day: the collection day
// in hand, 0 = Sunday). on(day): the fractions collected on that weekday. Returns null when the plan's own day has
// something, or no day has; else { day, list, tonight }: the next collection day that has something, its fractions, and
// tonight: true when they go out this evening (before this morning's collection with nothing in it, tomorrow's bins are
// tonight's).
export function nextOut(p, on) {
  if (!p || on(p.day).length) return null;
  for (let k = 1; k <= 6; k++) { const day = (p.day + k) % 7, list = on(day); if (list.length) return { day, list, tonight: p.mode === 'now' && k === 1 }; }
  return null;
}
// The collection hour as a guide says it: "06:00" is "6:00", and "6 h" in French ("6 h 30"); '' when the guide has none.
export function hourText(time, lang) {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/); if (!m) return '';
  return lang === 'fr' ? `${+m[1]} h${m[2] === '00' ? '' : ' ' + m[2]}` : `${+m[1]}:${m[2]}`;
}
