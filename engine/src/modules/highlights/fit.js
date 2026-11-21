// Whether a card fits a half card (README.md, rule 12): no word is ever cut in two on Home, so a card whose name or line
// has a word wider than a half card's text is drawn wide (../frame.js resolve, which reads the card's "long"). Pure, with
// no import: the maker pastes this file (onboarding-site/src/build.py, as HLFIT) so that its board says the same; tests
// in engine/scripts/highlights-plan.test.mjs.
//
// The widths are the card's own letters, measured in the built guide on 21 Nov 2026 (Jost 700, the name's font), in
// hundredths of an em; a letter not listed counts as its letter without the accent, else 0.6 (a capital 0.75).
const EM = { 20: '-', 25: 'l', 30: "itIíï·'.,", 35: 'fj’', 40: 'rJ', 45: 's', 50: '1cç', 55: 'aehvxyzFLàáâäèéêë', 60: '37bdgknopquEPSTZñòóôöúüßÉ',
  65: '025689BR', 70: '4CKUXYÜ', 75: 'ADVÀ&', 80: 'mwGHNOÖ', 85: 'Q', 90: 'M', 110: 'W' };
const em = c => {
  for (const k in EM) if (EM[k].includes(c)) return k / 100;
  const plain = c.normalize('NFD')[0];
  return plain !== c ? em(plain) : c === c.toLowerCase() ? 0.6 : 0.75;
};
// The widest word of a text, in ems of the name's font. A line may break at a space, at a soft hyphen and after a hyphen
// or a slash, nowhere else.
export const widest = s => Math.max(0, ...String(s || '').replace(/([-/])/g, '$1 ').split(/[\s­]+/).map(w => [...w].reduce((n, c) => n + em(c), 0)));

// A half card's room for text at 360 px, the narrowest phone Home is drawn for: 131 px, less 2 px for what the widths
// round away. The name is 17 px; the line under it is 14 px in a lighter cut, whose letters are 0.92 of the name's.
const ROOM = 129, NAME = 17, LINE = 14 * 0.92;
export const longForHalf = (name, line) => widest(name) * NAME > ROOM || widest(line) * LINE > ROOM;
