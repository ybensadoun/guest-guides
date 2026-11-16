// The Getting around module's rules, with no guide in them (README.md says each rule, who decided it and when): the ways of
// getting about and their colours, which stations are listed and which have a pin, the page's icon, the card on Home, and
// an old guide's taxi card read as a Getting around page. Pure, no imports: content.js reads the card with cardOf,
// page.js draws the rest, and engine/scripts/transport-plan.test.mjs tests them.

// Stations and stops by kind, in this order: [mode, the heading's word, the row's colour, the pin's tone].
export const MODES = [['train', 'byTrain', 'var(--tone-blue)', 'blue'], ['bus', 'byBus', 'var(--tone-green)', 'green']];
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

// An older guide's Home card with "trains" (content/quick.json), read as a Getting around page: its taxi, then its stations.
export const transportOf = p => ({ id: p.id, title: p.title || p.name, lead: p.kind,
  taxis: [{ name: p.taxiName || p.name, sub: p.taxiSub, phone: p.phone, what: p.what, alt: p.alt, always: p.always }], stations: p.trains || [] });
