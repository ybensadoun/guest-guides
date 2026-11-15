// The house guide's rules, with no guide in them (README.md says each rule, who decided it and when): a row's colour, a
// text cut into paragraphs, the directions link to the house. Pure, no imports (tests:
// engine/scripts/info-plan.test.mjs).

// A row's colour by its "tone": ink, yellow (the taxi's yellow), else the tone of that name (blue, green, red...).
export const toneOf = k => k === 'ink' ? 'var(--ink)' : k === 'yellow' ? 'var(--tone-taxi)' : `var(--tone-${k})`;
// A row's text, one paragraph per blank line.
export const paragraphs = s => s.split(/\n\s*\n/);
// A row's "Directions" button: Google Maps' directions to the house's position (content/house.json lat, lng: offset about
// 350 m on purpose, never the address).
export const directionsTo = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
