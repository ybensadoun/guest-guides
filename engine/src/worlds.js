// Colour worlds: the five roles of a guide's colours and the one contrast rule (Yohann, 10 Nov 2026: every guide uses
// Ca La Kimberly's tiles, and a host picks a colour world instead of a layout; plan-ca-la-kimberly-through-the-maker.md,
// "Step 3: the look"). Pure: no DOM and no imports, so the engine, Node (tests, generator) and the maker can all use it.
//
// A palette is { paper, ink, deep, strong, fresh, light, warm } in hex (optionally display and font, CSS font stacks):
//   paper  the page                        ink    the text
//   deep   tiles with white text (--blue)  strong tiles with white text, always in the red family (--red: Emergencies)
//   fresh  tiles with white text, and the "Open" word on white cards (--green)
//   light  tiles with dark text (--yellow) warm   tiles with dark text (--orange)
// The rule, the same for a ready-made world and for colours from a picture: text on a tile, and coloured words, reach
// 4.5 to 1, by darkening or lightening the colour until they do (WCAG 2 contrast, sRGB luminance).
// A guide picks a world with theme.world (site.json for a build, the guide's theme in the database for the shared
// viewer): worldCss() of WORLDS[id] comes after app.css and before the guide's own theme.css (engine/site.config.js,
// engine/src/viewer.js). A guide without one is app.css as it is.

const WHITE = '#FFFFFF', BLACK = '#000000';
const VEIL = 0.16;   // the white veil under the bins' names on the rubbish tile (app.css .gtb)
const ROLES = ['--paper', '--white', '--ink', '--blue', '--red', '--green', '--yellow', '--orange'];

// '#abc' or '#aabbcc' to [r, g, b] (0 to 255); the reverse, upper case.
const rgb = h => { const s = String(h).trim().replace(/^#/, ''); const f = s.length === 3 ? s.replace(/./g, c => c + c) : s;
  if (!/^[0-9a-f]{6}$/i.test(f)) throw new Error(`not a hex colour: ${h}`); return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

// Relative luminance (WCAG 2), and the contrast ratio of two colours: 1 (the same) to 21 (black on white).
export function luminance(c) {
  const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// a moved a share t (0 to 1) of the way to b, channel by channel in sRGB, as CSS color-mix(in srgb) does.
export function mix(a, b, t) {
  const p = rgb(a), q = rgb(b);
  return hex(p.map((v, i) => v + (q[i] - v) * t));
}

// The colour itself when it already reaches `want` on `on`; else the least step toward `toward` (by hundredths) that
// does. `toward` defaults to black on a light background and white on a dark one.
export function fit(colour, on, want = 4.5, toward) {
  const to = toward || (contrast(on, BLACK) >= contrast(on, WHITE) ? BLACK : WHITE);
  if (contrast(colour, on) >= want) return hex(rgb(colour));
  for (let i = 1; i <= 100; i++) { const c = mix(colour, to, i / 100); if (contrast(c, on) >= want) return c; }
  return hex(rgb(to));
}

// Hue (degrees), saturation and lightness (0 to 1) of a colour, and back: used for the wine tone and by the tests.
export function hsl(c) {
  const [r, g, b] = rgb(c).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl(h, s, l) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return hex([0, 8, 4].map(n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
}

// Today's look, "Bauhaus summer" (app.css :root). Its tints and greys were picked by eye before the formulas below
// existed: they are kept as they are (`set`, used in place of the formula), so a guide in this world is today's guide to
// the pixel. Each still meets the rule (worlds.test.mjs), and the formulas land within a few units of each.
export const BAUHAUS = { paper: '#F3EEE3', ink: '#121212', deep: '#1D4FA0', strong: '#D52B1E', fresh: '#0E7C46', light: '#F5C400', warm: '#EC6A1C',
  set: { '--muted': '#4A4A4A', '--faint': '#6E6A63', '--line': '#DED6C6', '--accent-soft': '#F3D9D6', '--deep-soft': '#DCE5F3', '--strong-soft': '#F8DEDB',
    '--warm-soft': '#FBE3D3', '--fresh-soft': '#D7EBDF', '--ink-soft': '#E6E2DA', '--on-ink-soft': '#E8E2D6', '--warm-word': '#8A4B00', '--sea': '#D7E0EA',
    '--tone-wine': '#8E1B4A', '--tone-wine-s': '#F3DDE6', '--muted-card': '#4A4A4A', '--line-card': '#DED6C6' } };

// The six worlds a guide can pick (theme.world): Bauhaus summer (today's look), Sea, Country, Tropical, City night,
// Stone. Each is a palette (the mockups of 10 Nov 2026), its display font (titles, --display) and text font (--font),
// and the @fontsource files those need (fonts: "family/weight.css"; Bauhaus's are also the fonts of a guide with no
// world), bundled by a build and loaded from the CDN by the shared viewer. The text font is Jost in every world, the world's character being in its colours and
// titles (13 Nov 2026): the guide's lines are measured for Jost, and every other installed text family is wider at the
// same weight (Outfit and Nunito by 1.6%, Geist, DM Sans, Bricolage Grotesque, Space Grotesk and Fraunces by 7 to 10%),
// which pushed a Dutch market name, and in Space Grotesk some German and French words of Things to do, past their line
// at 360 px (engine/scripts/ux-check.mjs). Weights: the ones app.css asks for that each family has.
// plain: the display family has one weight only (see worldCss).
// Looked at as a guest would read them, 14 Nov 2026: Stone's titles are in Geist, not the mockups' Instrument Serif, whose
// one thin, narrow weight read too faintly on a tile outdoors once the browser's false bold was taken away; Country's
// titles stop at Fraunces 600, the 700 being heavy enough to crowd a tile's arrow.
const SANS = 'system-ui,-apple-system,"Segoe UI",sans-serif', SERIF = 'Georgia,"Times New Roman",serif';
const files = (fam, ws) => ws.map(w => `${fam}/${w}.css`);
const JOST = files('jost', [400, 500, 600, 700]), TEXT = `"Jost",${SANS}`;
export const WORLDS = {
  bauhaus: { ...BAUHAUS, display: '"Jost",system-ui,sans-serif', font: TEXT, fonts: JOST },
  sea: { paper: '#F3F1EA', ink: '#0F2330', deep: '#0E5A7A', strong: '#CF4B37', fresh: '#157A6E', light: '#F4CF6B', warm: '#F2A65A',
    display: `"DM Serif Display",${SERIF}`, font: TEXT, fonts: [...files('dm-serif-display', [400]), ...JOST], plain: true },
  country: { paper: '#F1EADB', ink: '#2B2118', deep: '#4E6B3A', strong: '#A3472B', fresh: '#2F5D50', light: '#E5C77A', warm: '#D99A4E',
    display: `"Fraunces",${SERIF}`, font: TEXT, fonts: [...files('fraunces', [500, 600]), ...JOST] },
  tropical: { paper: '#FBF3E4', ink: '#1B1B2F', deep: '#00707F', strong: '#D03545', fresh: '#157A4E', light: '#FFD23F', warm: '#FF9F45',
    display: `"Bricolage Grotesque",${SANS}`, font: TEXT, fonts: [...files('bricolage-grotesque', [500, 600, 700]), ...JOST] },
  night: { paper: '#EFEDF4', ink: '#14121F', deep: '#3B2F8F', strong: '#C72C63', fresh: '#0B7A75', light: '#FFD166', warm: '#FF9EB1',
    display: `"Space Grotesk",${SANS}`, font: TEXT, fonts: [...files('space-grotesk', [500, 600, 700]), ...JOST] },
  stone: { paper: '#F2F0EB', ink: '#22262A', deep: '#3F5364', strong: '#9C4A3C', fresh: '#4A6B5D', light: '#DCCBA2', warm: '#D8B08A',
    display: `"Geist",${SANS}`, font: TEXT, fonts: [...files('geist', [500, 600, 700]), ...JOST] },
};

// Every colour token of the engine for one palette, as { '--name': value }. The roles first, after the contrast rule;
// then every derived token of app.css, each from the roles by the formula written beside it, unless the palette sets it
// by hand (p.set, derived tokens only: the roles always go through the rule).
export function worldTokens(p) {
  const paper = hex(rgb(p.paper)), ink = hex(rgb(p.ink));
  // The roles. deep, strong and fresh: darkened until white text reaches 4.5 on them. strong and fresh are also words
  // ("Open until", a red line), but only on white cards, never on the page colour (measured on Ca La Kimberly, 13 Nov
  // 2026: 13 pages and several place pages, three times of the week); white on a colour and the colour on white are
  // the same ratio, so the one fitting covers both. The one coloured word drawn on the page is --warm-word, fitted on
  // paper below. deep also carries the rubbish tile's bins, white words on a white veil (app.css .gtb, 16%): darkened
  // until they reach 4.5 there too (found by engine/scripts/contrast-check.mjs in Country and Tropical, 13 Nov 2026).
  // light and warm: lightened until ink reaches 4.5 on them.
  const deep1 = fit(p.deep, WHITE, 4.5, BLACK);
  let deep = deep1;
  for (let i = 1; i <= 100 && contrast(WHITE, mix(deep, WHITE, VEIL)) < 4.5; i++) deep = mix(deep1, BLACK, i / 100);
  const strong = fit(p.strong, WHITE, 4.5, BLACK);
  const fresh = fit(p.fresh, WHITE, 4.5, BLACK);
  const light = fit(p.light, ink, 4.5, WHITE), warm = fit(p.warm, ink, 4.5, WHITE);
  // The page's own greys: muted text (ink most of the way, then darkened until it reaches 4.5 on paper), faint text
  // (ink a little over half way, the same rule) and the hairlines between rows (paper a tenth of the way to ink).
  const muted = fit(mix(ink, paper, 0.26), paper, 4.5, ink);
  const faint = fit(mix(ink, paper, 0.4), paper, 4.5, ink);
  const line = mix(paper, ink, 0.11);
  // Wine (a Things to do group): strong's hue turned 30 degrees toward purple, at 68% saturation and 33% lightness,
  // so it stays a burgundy of the world's own red; white icons on it reach 4.5.
  const wine = fit(fromHsl((hsl(strong)[0] + 330) % 360, 0.68, 0.33), WHITE, 4.5, BLACK);
  const t = {
    '--paper': paper, '--white': WHITE, '--ink': ink, '--muted': muted, '--faint': faint, '--line': line,
    '--blue': deep, '--red': strong, '--green': fresh, '--yellow': light, '--orange': warm,
    // Soft tints: a role most of the way to white, for chips and quiet backgrounds.
    '--accent-soft': mix(strong, WHITE, 0.8),                 // strong, 80% to white
    '--deep-soft': fit(mix(deep, WHITE, 0.85), deep, 4.5, WHITE),   // deep, 85% to white; also the quiet line on a deep card, so it reaches 4.5 on deep
    '--strong-soft': mix(strong, WHITE, 0.84),                // strong, 84% to white
    '--warm-soft': mix(warm, WHITE, 0.81),                    // warm, 81% to white
    '--fresh-soft': mix(fresh, WHITE, 0.83),                  // fresh, 83% to white
    '--ink-soft': mix(paper, ink, 0.05),                      // paper, 5% toward ink (the sights group's tint)
    '--on-ink-soft': fit(mix(paper, ink, 0.06), ink, 4.5, WHITE),   // the quiet line on an ink band: paper, 6% toward ink, reaching 4.5 on ink
    '--warm-word': fit(mix(warm, BLACK, 0.42), paper, 4.5, BLACK),  // warm as a word (a warning): 42% toward black, reaching 4.5 on paper
    '--on-warm': contrast(WHITE, warm) >= 3 ? WHITE : ink,       // an icon on a warm badge: white while it reaches 3 to 1 (a graphic, not text), else ink
    '--paper-glass': `rgba(${rgb(paper).join(',')},.82)`,       // the page colour at 82%, behind the blurred header
    '--sea': mix(deep, WHITE, 0.81),                          // the map's resting colour, before its tiles load: deep, 81% to white
    // Things to do and events tones that are not a role's own token.
    '--tone-purple': ink,                                     // the sights group: ink
    '--tone-taxi': light,                                     // taxis and fairs: light
    '--tone-wine': wine, '--tone-wine-s': mix(wine, WHITE, 0.86),
    // The roles as the cards drawn on white use them (contacts, place page, quick calls, opening hours, list badges):
    // exactly the role. Separate tokens only because guides whose own css sets colours change the roles but not these
    // cards (app.css :root).
    '--ink-card': ink, '--muted-card': muted, '--line-card': line, '--paper-card': paper,
    '--deep-card': deep, '--strong-card': strong, '--fresh-card': fresh, '--light-card': light,
  };
  for (const [k, v] of Object.entries(p.set || {})) if (k in t && !ROLES.includes(k)) t[k] = hex(rgb(v));
  if (p.display) t['--display'] = p.display;
  if (p.font) t['--font'] = p.font;
  return t;
}

// The same as a stylesheet: ":root{--paper:#...;...}".
// A world whose display face has a single weight (plain: true) also tells the browser not to thicken it: asked for bold,
// a browser smears a regular face into a false bold; with this the titles are drawn in the face as its designer cut it.
export function worldCss(p) {
  return ':root{' + Object.entries(worldTokens(p)).map(([k, v]) => `${k}:${v}`).join(';') + (p.plain ? ';font-synthesis-weight:none' : '') + '}';
}

// The world a guide asks for, or null. An id: only WORLDS' own keys count (an address may ask for "constructor").
// Or a world with colours of the guide's own, as "From your picture" makes them (src/picture-world.js):
// { base: 'stone', deep: '#2F5478', light: '#E3CB98' } is Stone with those two roles; paper, text colour and fonts stay
// the base's. Anything that is not a hex colour is left out (the value comes from a guide's row and goes into a
// stylesheet), and the base's tints picked by hand (`set`) go, since they belong to its own colours.
const OWN = ['deep', 'strong', 'fresh', 'light', 'warm'];
export function worldOf(w) {
  if (typeof w === 'string') return Object.hasOwn(WORLDS, w) ? WORLDS[w] : null;
  if (!w || typeof w !== 'object' || typeof w.base !== 'string' || !Object.hasOwn(WORLDS, w.base)) return null;
  const own = Object.fromEntries(OWN.filter(r => typeof w[r] === 'string' && /^#[0-9a-f]{6}$/i.test(w[r])).map(r => [r, w[r].toUpperCase()]));
  if (!Object.keys(own).length) return WORLDS[w.base];
  const { set, ...base } = WORLDS[w.base];
  return { ...base, ...own };
}
