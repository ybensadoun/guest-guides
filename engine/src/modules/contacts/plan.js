// The Emergencies module's rules, with no guide in them (README.md says each rule, who decided it and when): which words
// name a group of numbers, the map link of an address, a number as the page writes it. Pure, no DOM (tests:
// engine/scripts/contacts-plan.test.mjs). Its imports are pure too: Getting around's rule for a number, the days of a week.
import { txPhone } from '../transport/taxis.js';
import { daysList } from '../../days.js';

// A group's heading is the guide's word c_<id>; a hospital, a pharmacy, a clinic or a medical centre is under Health
// (c_health). The research can name a group its own way: a group with no word of the guide has no heading (page.js).
export const groupKey = id => 'c_' + ({ hospital: 'health', pharmacy: 'health', clinic: 'health', medical: 'health' }[id] || id);
// An address with no map link of its own opens a Google Maps search for it.
export const mapsSearch = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
// Home's tile says "Emergencies", shorter than the page's title; known by the section's id (README.md, "Still Ca La
// Kimberly's own").
export const tileLabelKey = sec => (sec.id === 'emergency' ? 'emergencyTile' : sec.labelKey);
// A number as the page shows it (README.md rule 4). One the guide holds in one piece ("977257914", "+34977257914": the
// research writes them so) is grouped as the guide's other numbers, by Getting around's rule (txPhone: "977 25 79 14", a
// number of another country as it is). One written with spaces is as its host wrote it and stays ("900 878 212",
// "91 562 04 20"), and so does a short number (112, 061). The call itself always dials the number as the guide holds it.
export const phoneShown = s => { const raw = String(s == null ? '' : s).trim(); return /\s/.test(raw) ? raw : txPhone(raw); };
// A contact's hours as the page can read them (README.md rule 11): rows of days (a list of mon..sun), open and close
// (HH:MM). A guide built before 22 Nov 2026 can hold the days as its research wrote them ("mon-fri", "sat", "mon"): a
// range, a single day or a list in words is read (engine/src/days.js); a row that cannot be read is left out, so the
// contact shows the hours that can be read, or none. Never an error: this is the page a guest opens in an emergency.
const hhmm = x => { const m = /^(\d{1,2})[:.](\d{2})$/.exec(typeof x === 'string' ? x.trim() : ''); return m && +m[1] <= 24 && +m[2] < 60 ? m[1].padStart(2, '0') + ':' + m[2] : ''; };
export function contactHours(schedule) {
  if (!Array.isArray(schedule)) return [];
  const out = [];
  for (const r of schedule) {
    if (!r || typeof r !== 'object') continue;
    const days = daysList(r.days), open = hhmm(r.open), close = hhmm(r.close);
    if (days && open && close) out.push({ ...r, days, open, close });
  }
  return out;
}
// A contact's words in the guest's language: the guide holds them per language, a research may have left one string.
export const wordOf = (x, tx) => (typeof x === 'string' ? x.trim() : x && typeof x === 'object' ? tx(x) : '');
// A link as the page may write it: a web address in a string, nothing else.
export const linkOf = x => (typeof x === 'string' && /^https?:\/\//i.test(x.trim()) ? x.trim() : '');
