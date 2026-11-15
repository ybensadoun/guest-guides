// The Emergencies module's rules, with no guide in them (README.md says each rule, who decided it and when): which words
// name a group of numbers, and the map link of an address. Pure, no imports (tests: engine/scripts/contacts-plan.test.mjs).

// A group's heading is the guide's word c_<id>; a hospital, a pharmacy, a clinic or a medical centre is under Health
// (c_health). The research can name a group its own way: a group with no word of the guide has no heading (page.js).
export const groupKey = id => 'c_' + ({ hospital: 'health', pharmacy: 'health', clinic: 'health', medical: 'health' }[id] || id);
// An address with no map link of its own opens a Google Maps search for it.
export const mapsSearch = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
// Home's tile says "Emergencies", shorter than the page's title; known by the section's id (README.md, "Still Ca La
// Kimberly's own").
export const tileLabelKey = sec => (sec.id === 'emergency' ? 'emergencyTile' : sec.labelKey);
