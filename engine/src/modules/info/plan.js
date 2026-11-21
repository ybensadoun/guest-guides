// The house guide's rules, with no guide in them (README.md says each rule, who decided it and when): a row's colour, a
// text cut into paragraphs, the directions link to the house, which parts guests see. Pure, no imports (tests:
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
export const partShown = b => !!b && (said(b.body) || (b.items || []).some(said) || (b.links || []).length > 0);
