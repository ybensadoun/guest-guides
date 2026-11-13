// Colour worlds: the five roles of a guide's colours and the one contrast rule (Yohann, 10 Nov 2026: every guide uses
// Ca La Kimberly's tiles, and a host picks a colour world instead of a layout; plan-ca-la-kimberly-through-the-maker.md,
// "Step 3: the look"). Pure: no DOM and no imports, so the engine, Node (tests, generator) and the maker can all use it.
//
// A palette is { paper, ink, deep, strong, fresh, light, warm } in hex (optionally display and font, CSS font stacks):
//   paper  the page                        ink    the text
//   deep   tiles with white text (--blue)  strong tiles with white text, always in the red family (--red: Emergencies)
//   fresh  tiles with white text, and the "Open" word on white and on the page (--green)
//   light  tiles with dark text (--yellow) warm   tiles with dark text (--orange)
// The rule, the same for a ready-made world and for colours from a picture: text on a tile, and coloured words on the
// page, reach 4.5 to 1, by darkening or lightening the colour until they do (WCAG 2 contrast, sRGB luminance).
// Nothing in the app uses this module yet (13 Nov 2026): app.css holds today's look, and worldTokens(BAUHAUS) is
// compared with it by engine/scripts/worlds.test.mjs.

const WHITE = '#FFFFFF', BLACK = '#000000';

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

// Today's look, "Bauhaus summer" (app.css :root).
export const BAUHAUS = { paper: '#F3EEE3', ink: '#121212', deep: '#1D4FA0', strong: '#D52B1E', fresh: '#0E7C46', light: '#F5C400', warm: '#EC6A1C' };

// Every colour token of the engine for one palette, as { '--name': value }. The roles first, after the contrast rule;
// then every derived token of app.css, each from the roles by the formula written beside it.
export function worldTokens(p) {
  const paper = hex(rgb(p.paper)), ink = hex(rgb(p.ink));
  // The roles. deep, strong and fresh: darkened until white text reaches 4.5 on them. strong and fresh are also words
  // on the page ("Open until", a red line): darkened further until they reach 4.5 on paper (on white they then pass too,
  // white being lighter than any paper). light and warm: lightened until ink reaches 4.5 on them.
  const deep = fit(p.deep, WHITE, 4.5, BLACK);
  const strong = fit(fit(p.strong, WHITE, 4.5, BLACK), paper, 4.5, BLACK);
  const fresh = fit(fit(p.fresh, WHITE, 4.5, BLACK), paper, 4.5, BLACK);
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
    '--paper-glass': `rgba(${rgb(paper).join(',')},.82)`,       // the page colour at 82%, behind the blurred header
    '--sea': mix(deep, WHITE, 0.81),                          // the map's resting colour, before its tiles load: deep, 81% to white
    // Things to do and events tones that are not a role's own token.
    '--tone-purple': ink,                                     // the sights group: ink
    '--tone-taxi': light,                                     // taxis and fairs: light
    '--tone-wine': wine, '--tone-wine-s': mix(wine, WHITE, 0.86),
    // The roles as the cards drawn on white use them (contacts, place page, quick calls, opening hours, list badges):
    // exactly the role. Separate tokens only because older layouts and guides with their own colours change the roles
    // but not these cards (app.css :root).
    '--ink-card': ink, '--muted-card': muted, '--line-card': line, '--paper-card': paper,
    '--deep-card': deep, '--strong-card': strong, '--fresh-card': fresh, '--light-card': light,
  };
  if (p.display) t['--display'] = p.display;
  if (p.font) t['--font'] = p.font;
  return t;
}

// The same as a stylesheet: ":root{--paper:#...;...}".
export function worldCss(p) {
  return ':root{' + Object.entries(worldTokens(p)).map(([k, v]) => `${k}:${v}`).join(';') + '}';
}
