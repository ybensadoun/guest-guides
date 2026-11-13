// The guide's modules, by the kind of section they serve (content/sections.json "kind"). A module is a folder of its own
// with a README saying its rules: page(V) draws its page, widget(now) gives what Home's tile is made of
// ({ meta, live, cls, extra }). Home and the section view ask here and know nothing of what is inside.
// Rubbish is the first (13 Nov 2026); the other sections are still spread over views/ and move here one at a time.
import * as garbage from './garbage/index.js';

export const MODULES = { garbage };
