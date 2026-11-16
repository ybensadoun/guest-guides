// The guide's modules, by the kind of section they serve (content/sections.json "kind"), and the highlights and the map by
// the kind of placement they serve on Home ("highlight": the white cards; "map": its bar). A module is a folder of its own
// with a README saying its rules: page(V, sec) draws its page, widget(now, sec) gives what Home's tile is made of
// ({ meta, live, cls, extra }, and its own label or link when it has one), widgets says what it offers on Home
// ({ <widget>: { sizes } }, read by the frame through views/home.js; offers.js holds the same for the node scripts). Home
// and the section view ask here and know nothing of what is inside. Rubbish is the first (13 Nov 2026), markets the
// second (14 Nov 2026), then the host's lists of places (kind "spots", folder places/), the highlights and Local events,
// then the text pages (kind "info"), Emergencies (kind "contacts"), Getting around, the house and the map (14 Nov 2026):
// every part of the guide. What's on (whatson/) is not a section: Home calls it directly, as the frame's end; the house is
// the frame's fixed top (it offers nothing to place). A module that has something on a day also exports agenda(now, tools),
// its feed for What's on (17 Nov 2026; whatson/README.md, "The feed"): What's on asks here and names no module. Their
// order here is their order in the agenda.
import * as house from './house/index.js';
import * as garbage from './garbage/index.js';
import * as info from './info/index.js';
import * as contacts from './contacts/index.js';
import * as transport from './transport/index.js';
import * as markets from './markets/index.js';
import * as spots from './places/index.js';
import * as events from './events/index.js';
import * as highlight from './highlights/index.js';
import * as map from './map/index.js';

export const MODULES = { house, garbage, info, contacts, transport, markets, spots, events, highlight, map };
