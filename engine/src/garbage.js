// Which bins go out when. Collection happens in the morning (from GARBAGE.collectionTime),
// so guests put bins out the evening before. Between midnight and collection time,
// the bins for this morning are still to go out.
import { GARBAGE as G0 } from './content.js';
// A site without the rubbish module (or without garbage.json) gets an empty plan.
const GARBAGE = G0 || { fractions: [], collectionTime: '00:00', bins: {} };
import { tx, t, lang } from './i18n.js';
import { hourText } from './bins.js';

const DAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
export const FRACTIONS = GARBAGE.fractions.map(f => ({ ...f, d: f.days.map(x => DAY[x]) }));
const [ch, cm] = String(GARBAGE.collectionTime || '').split(':').map(Number);
const COLLECT_MIN = ch * 60 + cm;   // no time in the guide: not a number, so there is no "before the collection" state and every day reads as its evening
// The collection hour in the guide's words ("6:00", "6 h"), '' when the guide gives none.
export const collectHour = () => hourText(GARBAGE.collectionTime, lang);

export const collectedOn = dow => FRACTIONS.filter(f => f.d.includes(dow));

// { mode: 'now' | 'tonight', day: collection weekday, list: fractions, collectedToday: fractions }
export function plan(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  if (mins < COLLECT_MIN) return { mode: 'now', day: today, list: collectedOn(today), collectedToday: [] };
  const tomorrow = (today + 1) % 7;
  return { mode: 'tonight', day: tomorrow, list: collectedOn(tomorrow), collectedToday: mins < 20 * 60 ? collectedOn(today) : [] };
}

export const isRed = f => f.id === 'sanitary';
// Villages with shared street containers have no collection days at all: no "tonight" or weekly plan to show.
export const CONTAINERS_ONLY = FRACTIONS.length > 0 && FRACTIONS.every(f => !f.d.length);
export const mainOf = list => list.filter(f => !isRed(f));
export const binName = f => tx((GARBAGE.bins || {})[f.bin]);   // '' when the guide names no bin (a guide the maker builds)

// Short text for the Home tile: the main fraction(s), leaving the daily red bin implied.
export function tileText(now = new Date()) {
  const p = plan(now);
  const main = mainOf(p.list);
  return t(p.mode === 'now' ? 'gTileNow' : 'gTile', { time: collectHour(), list: main.length ? main.map(f => tx(f.name)).join(', ') : t('gRedOnly') });
}
