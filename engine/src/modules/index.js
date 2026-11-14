// The guide's modules, by the kind of section they serve (content/sections.json "kind"), and the highlights by the kind of
// placement they serve on Home ("highlight": the white cards). A module is a folder of its own with a README saying its
// rules: page(V, sec) draws its page, widget(now, sec) gives what Home's tile is made of ({ meta, live, cls, extra }),
// widgets says what it offers on Home ({ <widget>: { sizes } }, read by the frame through views/home.js; offers.js holds
// the same for the node scripts). Home and the section view ask here and know nothing of what is inside. Rubbish is the
// first (13 Nov 2026), markets the second (14 Nov 2026), then the host's lists of places (kind "spots", folder places/),
// the highlights and Local events (14 Nov 2026); the other sections are still spread over views/ and move here one at a
// time. What's on (whatson/) is not a section: Home calls it directly, as the frame's end.
import * as garbage from './garbage/index.js';
import * as markets from './markets/index.js';
import * as spots from './places/index.js';
import * as events from './events/index.js';
import * as highlight from './highlights/index.js';

export const MODULES = { garbage, markets, spots, events, highlight };
