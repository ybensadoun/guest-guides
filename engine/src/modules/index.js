// The guide's modules, by the kind of section they serve (content/sections.json "kind"). A module is a folder of its own
// with a README saying its rules: page(V) draws its page, widget(now) gives what Home's tile is made of
// ({ meta, live, cls, extra }), widgets says what it offers on Home ({ <widget>: { sizes } }, read by the frame through
// views/home.js; offers.js holds the same for the node scripts). Home and the section view ask here and know nothing of
// what is inside. Rubbish is the first (13 Nov 2026), markets the second (14 Nov 2026); the other sections are still spread
// over views/ and move here one at a time. What's on (whatson/) is not a section: Home calls it directly, as the frame's end.
import * as garbage from './garbage/index.js';
import * as markets from './markets/index.js';

export const MODULES = { garbage, markets };
