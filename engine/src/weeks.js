// The week of the month a place is held (week_of_month in the content files, nth once read by content.js slots()):
// 1 to 4 count from the start of the month, -1 is the last one (that weekday with no other after it in the month, so in a
// month with five Sundays the 4th Sunday is not the last). No imports: node tests it (engine/scripts/schedule.test.mjs)
// and the maker pastes it as it is (onboarding-site/src/build.py), so the guide and the maker never disagree on a date.
export const weekOfMonth = dt => Math.ceil(dt.getDate() / 7);
export const lastOfMonth = dt => dt.getDate() + 7 > new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
export const onWeek = (dt, n) => !n || (n === -1 ? lastOfMonth(dt) : weekOfMonth(dt) === n);
// Its word in the guide's i18n ("2nd", "last"), the only place a week becomes a key: nth1 to nth4, nthLast.
export const nthKey = n => (n === -1 ? 'nthLast' : 'nth' + n);
