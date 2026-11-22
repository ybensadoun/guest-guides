// The house guide's rules, with no guide in them (README.md says each rule, who decided it and when): a row's colour, a
// text cut into paragraphs, the directions link to the house, which parts guests see, the times of the stay, what a host is offered to explain. Pure, no imports (tests:
// engine/scripts/info-plan.test.mjs); pasted whole into the maker (onboarding-site/src/build.py, as INFO), whose editor
// says which parts guests do not see: never a second copy.

// A row's colour by its "tone": ink, yellow (the taxi's yellow), else the tone of that name (blue, green, red...).
export const toneOf = k => k === 'ink' ? 'var(--ink)' : k === 'yellow' ? 'var(--tone-taxi)' : `var(--tone-${k})`;
// A row's text, one paragraph per blank line.
export const paragraphs = s => s.split(/\n\s*\n/);
// A row's "Directions" button: Google Maps' directions to the house's position (content/house.json lat, lng: offset about
// 350 m on purpose, never the address).
export const directionsTo = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
// A text that says something: a string, or a text in several languages with words in at least one.
const said = x => typeof x === 'string' ? !!x.trim() : !!x && typeof x === 'object' && Object.values(x).some(v => typeof v === 'string' && !!v.trim());
// Guests see a part only when it has words of its own: a text, a line or a button. Photos alone, or only the line under
// the title, do not make a part (README.md, rule 11): the house page shows the photos.
export const partShown = (b, house) => !!b && (said(b.body) || (b.items || []).some(said) || (b.links || []).length > 0 || stayTimes(b, house).length > 0);
// The times of the stay live once, in the house's own facts (content/house.json: checkin, checkout): Home's Check-out fact
// and the part whose id is "checkout" both read them, so they can never disagree (README.md, rule 14). The part starts
// with them: [['checkin', '15:00'], ['checkout', '11:00']], those the house has.
export const stayTimes = (b, house) => b && b.id === 'checkout' && house && typeof house === 'object' ? [['checkin', house.checkin], ['checkout', house.checkout]].filter(x => x[1]) : [];
// A part's lines as guests read them. Guides built before 22 Nov 2026 hold the time a second time, as a sentence of the
// generator's ("Check-out by 11:00."): such a line is not drawn once the field gives that time.
const OLD_TIME = { checkin: /^Check-in from \d{1,2}:\d{2}\.$/, checkout: /^Check-out by \d{1,2}:\d{2}\.$/ };
const firstWords = i => String(typeof i === 'string' ? i : (i && (i.en != null ? i.en : Object.values(i)[0])) || '').trim();
// Such a sentence of the generator's, whichever time it says: a guide built before keeps its check-in one until its host
// gives a check-in time, and the check-out time is then drawn after it, in the order of a stay.
export const isTimeLine = i => Object.values(OLD_TIME).some(r => r.test(firstWords(i)));
export const partItems = (b, house) => { const has = stayTimes(b, house).map(x => x[0]); return ((b && b.items) || []).filter(i => !has.some(k => OLD_TIME[k].test(firstWords(i)))); };
// What guests most often get stuck on in a house, most asked first, by the ids of engine/src/amenities.json. The builder's
// step How things work offers those the house has as line starts ("Heating: "), for the host to finish (README.md, rule 17).
export const HOW_ASKS = ['heating', 'floor_heating', 'ac', 'hot_water', 'pool', 'hot_tub', 'tv', 'coffee_maker', 'washer', 'dryer', 'dishwasher', 'oven', 'hob',
  'fireplace', 'bbq', 'outdoor_shower', 'ev_charger', 'safe', 'smart_lock', 'keypad', 'sauna', 'ceiling_fan', 'blackout', 'streaming', 'sound_system', 'fire_pit', 'bikes', 'kayak', 'lift'];
// Those to offer: the house's own, in that order, without the ones a line already starts with; at most eight.
export const howAsks = (has, started) => HOW_ASKS.filter(id => (has || []).includes(id) && !(started || []).includes(id)).slice(0, 8);
// A tip as it reaches the guide: a line start nobody finished ("Heating:") says nothing and is left out.
export const tipSaid = ln => !/:\s*$/.test(String(ln || '')) && !!String(ln || '').trim();
