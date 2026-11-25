// The Getting around module's rules, with no guide in them (README.md says each rule, who decided it and when): the ways of
// getting about and their colours, which stations are listed and which have a pin, the page's icon, the card on Home, and
// an old guide's taxi card read as a Getting around page. Pure, no imports: content.js reads the card with cardOf,
// page.js draws the rest, and engine/scripts/transport-plan.test.mjs tests them.

// Stations and stops by kind, in this order: [mode, the heading's word, the row's colour, the pin's tone].
// Metro and tram (16 Nov 2026, README "Public transport found"): between train and bus, in the bus's colour.
export const MODES = [['train', 'byTrain', 'var(--tone-blue)', 'blue'], ['metro', 'byMetro', 'var(--tone-green)', 'green'], ['tram', 'byTram', 'var(--tone-green)', 'green'], ['bus', 'byBus', 'var(--tone-green)', 'green']];
// A station's kind: its mode (train when it says none); a mode the guide does not know is drawn as a train.
export const modeOf = s => MODES.find(m => m[0] === (s.mode || 'train')) || MODES[0];

// A station never placed (0,0, new in the editor) is left out; one whose Google position ran out (nomap) stays in the list,
// off the map.
export const stopsOf = stations => (stations || []).filter(s => s.nomap || (typeof s.lat === 'number' && !(s.lat === 0 && s.lng === 0)));
// The headings of the page: each kind that has a station, in MODES' order, with its stations: [[word, stations]].
export const groupsOf = stops => MODES.map(([mode, label]) => [label, stops.filter(s => modeOf(s)[0] === mode)]).filter(([, l]) => l.length);
// A page with a single row (one taxi and no station, or one station and no taxi) shows it open: there is nothing else to
// choose from, and a closed row over an empty screen only costs a tap (Yohann, 15 Nov 2026).
export const loneRow = (g, stops) => (g.taxis || []).length + (g.apps || []).length + stops.length === 1;   // a ride app is a row too (README rule 37)
// The page's icon: the card's own (the section's card on Home), else the taxi when there are taxis or no station, else the
// first station's kind.
export const pageIcon = (g, stops) => g.tileIcon || ((g.taxis || []).length || !stops.length ? 'taxi' : modeOf(stops[0])[0]);

// The card's icon on Home: the taxi when there are taxis, else the bus when the first station is a bus stop, else the train.
export const iconOf = T => (T.taxis || []).length ? 'taxi' : ((T.stations || [])[0] || {}).mode === 'bus' ? 'bus' : 'train';
// Getting around's card on Home (transport.json "tile": its name and line), drawn by the highlights module as one of its
// cards, opening this page: { id, href, icon, name, sub, wide }, or null when the section has no file or no "tile".
export const cardOf = sec => (sec && sec.data && sec.data.tile ? { id: sec.id, href: '#s/' + sec.id, icon: iconOf(sec.data), name: sec.data.tile.name, sub: sec.data.tile.sub, wide: sec.data.tile.wide } : null);

// The words of the card a new guide gets (24 Nov 2026: it said "Taxi" and the taxi's name, and nothing of the trains and
// stops the page holds): { name, sub }, each in every language asked. name: the section's own title ("Getting around"),
// as the maker's own card has it. sub: what the page has for this house, in one line: the kind of the station or stop
// nearest to the house with its minutes ("Bus 3 min on foot"; on foot before by car, then the fewest minutes), then the
// other kinds the page has, in the page's order, then "Taxi" when it has a taxi or a ride app; with no station at all, the
// first taxi's name, else the first app's. A part the page lacks is left out, never an empty place; nothing at all: sub is
// absent. words: { <lang>: that language's strings of engine/src/i18n } (gettingAround, taxiH, byTrain, byMetro, byTram,
// byBus, minOnFoot, minByCar); a language it lacks is said in English.
export function cardWords(T, langs, words) {
  const ls = langs && langs.length ? langs : ['en'], W = l => ({ ...((words || {}).en || {}), ...((words || {})[l] || {}) });
  const all = f => Object.fromEntries(ls.map(l => [l, f(l, W(l))])), said = x => (x && typeof x === 'object' ? null : String(x || ''));
  const stops = stopsOf((T || {}).stations), mins = s => (s.walk > 0 ? [0, +s.walk] : s.min > 0 ? [1, +s.min] : [2, 0]);
  const near = stops.reduce((b, s) => { const [k, n] = mins(s), [bk, bn] = b ? mins(b) : [3, 0]; return k < bk || (k === bk && n < bn) ? s : b; }, null);
  const kinds = groupsOf(stops).map(([label]) => label), first = near ? modeOf(near)[1] : '';
  const taxi = (T.taxis || []).find(x => x && x.name), app = (T.apps || []).find(a => a && a.name), cabs = (T.taxis || []).length || (T.apps || []).length;
  const sub = all((l, w) => {
    if (!stops.length) { const n = taxi ? (said(taxi.name) ?? taxi.name[l] ?? taxi.name.en ?? '') : app ? String(app.name) : ''; return String(n || '').trim(); }
    const t = mins(near), head = [w[first], t[0] === 0 ? String(w.minOnFoot || '').replace('{n}', t[1]) : t[0] === 1 ? String(w.minByCar || '').replace('{n}', t[1]) : ''].filter(Boolean).join(' ');
    return [head, ...kinds.filter(k => k !== first).map(k => w[k]), cabs ? w.taxiH : ''].filter(Boolean).join(' · ');
  });
  return { name: all((l, w) => w.gettingAround || 'Getting around'), ...(Object.values(sub).some(Boolean) ? { sub } : {}) };
}

// The line under the page's title when the guide has none of its own (25 Nov 2026: on a guide the maker built the icon
// stood alone beside an empty space, where Ca La Kimberly's host wrote "Four ways to get around without a car."). Said from
// what the page holds, at the moment it is drawn, so it is true for any mix and follows what the host adds or removes:
// the kinds in the page's order, "Taxi" first when there is a taxi or a ride app, then each kind that has a station or a
// stop, as the words of their headings (leadKinds), written as a list ("taxi, train and bus": listOf) inside the
// sentence of engine/src/i18n (trLead: "By {kinds} from the house."). Never a number, never "without a car". Nothing on
// the page: no line, and page.js then draws no icon either.
export const leadKinds = (T, stops) => [((T || {}).taxis || []).length || ((T || {}).apps || []).length ? 'taxiH' : '', ...groupsOf(stops || []).map(([label]) => label)].filter(Boolean);
export const listOf = (words, and) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} ${and} ${words[words.length - 1]}`);

// An older guide's Home card with "trains" (content/quick.json), read as a Getting around page: its taxi, then its stations.
export const transportOf = p => ({ id: p.id, title: p.title || p.name, lead: p.kind,
  taxis: [{ name: p.taxiName || p.name, sub: p.taxiSub, phone: p.phone, what: p.what, alt: p.alt, always: p.always }], stations: p.trains || [] });
