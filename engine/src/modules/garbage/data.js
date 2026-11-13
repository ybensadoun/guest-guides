// The rubbish module's data: the guide's content/garbage.json read once, and what the widget and the page ask of it.
// Collection happens in the morning (from GARBAGE.collectionTime), so guests put bins out the evening before. Between
// midnight and collection time, the bins for this morning are still to go out. The rules themselves: plan.js.
import { GARBAGE as G0 } from '../../content.js';
// A site without the rubbish module (or without garbage.json) gets an empty plan.
const GARBAGE = G0 || { fractions: [], collectionTime: '00:00', bins: {} };
import { tx, lang } from '../../i18n.js';
import { hourText, planOf } from './plan.js';

const DAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
export const FRACTIONS = GARBAGE.fractions.map(f => ({ ...f, d: f.days.map(x => DAY[x]) }));
const [ch, cm] = String(GARBAGE.collectionTime || '').split(':').map(Number);
const COLLECT_MIN = ch * 60 + cm;   // no time in the guide: not a number, so there is no "before the collection" state and every day reads as its evening
// The collection hour in the guide's words ("6:00", "6 h"), '' when the guide gives none.
export const collectHour = () => hourText(GARBAGE.collectionTime, lang);

export const collectedOn = dow => FRACTIONS.filter(f => f.d.includes(dow));

// { mode: 'now' | 'tonight', day: collection weekday, list: fractions, collectedToday: fractions } (plan.js planOf)
export const plan = (now = new Date()) => planOf(now, collectedOn, COLLECT_MIN);

// The bin that goes out every evening, known by its name in Ca La Kimberly's data (README.md, "Still Ca La Kimberly's own").
export const isRed = f => f.id === 'sanitary';
// Villages with shared street containers have no collection days at all: no "tonight" or weekly plan to show.
export const CONTAINERS_ONLY = FRACTIONS.length > 0 && FRACTIONS.every(f => !f.d.length);
export const mainOf = list => list.filter(f => !isRed(f));
export const binName = f => tx((GARBAGE.bins || {})[f.bin]);   // '' when the guide names no bin (a guide the maker builds)
