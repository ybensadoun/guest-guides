// Colour worlds (engine/src/worlds.js): the contrast maths, the one contrast rule on six palettes, strong staying red,
// and a guard on the stylesheets: a colour in a rule is a token, never a hex, apart from the few fixed ones listed
// below (13 Nov 2026). Nothing is written.   node --test engine/scripts/worlds.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast, mix, fit, hsl, worldTokens, worldCss, BAUHAUS } from '../src/worlds.js';

const W = '#FFFFFF';
// The six palettes of the mockups of 10 Nov 2026 (scratch generator make.py, WORLDS), in roles:
// deep = their blue, strong = red, fresh = green, light = yellow, warm = orange.
const PALETTES = {
  bauhaus:  { paper: '#F3EEE3', ink: '#121212', deep: '#1D4FA0', strong: '#D52B1E', fresh: '#0E7C46', light: '#F5C400', warm: '#EC6A1C' },
  sea:      { paper: '#F3F1EA', ink: '#0F2330', deep: '#0E5A7A', strong: '#CF4B37', fresh: '#157A6E', light: '#F4CF6B', warm: '#F2A65A' },
  country:  { paper: '#F1EADB', ink: '#2B2118', deep: '#4E6B3A', strong: '#A3472B', fresh: '#2F5D50', light: '#E5C77A', warm: '#D99A4E' },
  tropical: { paper: '#FBF3E4', ink: '#1B1B2F', deep: '#00707F', strong: '#D03545', fresh: '#157A4E', light: '#FFD23F', warm: '#FF9F45' },
  night:    { paper: '#EFEDF4', ink: '#14121F', deep: '#3B2F8F', strong: '#C72C63', fresh: '#0B7A75', light: '#FFD166', warm: '#FF9EB1' },
  stone:    { paper: '#F2F0EB', ink: '#22262A', deep: '#3F5364', strong: '#9C4A3C', fresh: '#4A6B5D', light: '#DCCBA2', warm: '#D8B08A' },
};

test('contrast: known pairs', () => {
  assert.equal(Math.round(contrast('#000000', W) * 100) / 100, 21);
  assert.equal(contrast('#000', '#fff'), contrast('#000000', '#FFFFFF'));
  assert.equal(contrast('#D52B1E', '#D52B1E'), 1);
  assert.equal(contrast('#1D4FA0', W), contrast(W, '#1D4FA0'));   // the order does not matter
  // The usual threshold greys: #767676 is the lightest grey that passes 4.5 on white, #777777 just fails.
  assert.ok(contrast('#767676', W) >= 4.5 && contrast('#777777', W) < 4.5);
});

test('mix: the ends and the middle, in sRGB', () => {
  assert.equal(mix('#000000', W, 0), '#000000');
  assert.equal(mix('#000000', W, 1), '#FFFFFF');
  assert.equal(mix('#000000', W, 0.5), '#808080');
  assert.equal(mix('#D52B1E', W, 0.84), '#F8DDDB');
});

test('fit: reaches the target, and leaves a colour that passes untouched', () => {
  for (const [c, on, want, toward] of [['#F5C400', W, 4.5], ['#EC6A1C', W, 4.5], ['#D52B1E', '#F3EEE3', 4.5], ['#3F5364', '#22262A', 4.5, W], ['#888888', '#000000', 7]]) {
    const f = fit(c, on, want, toward);
    assert.ok(contrast(f, on) >= want, `${c} on ${on}: ${f} reaches only ${contrast(f, on).toFixed(2)}`);
    assert.notEqual(f, c.toUpperCase());   // none of these passed: each had to move
  }
  assert.equal(fit('#1D4FA0', W), '#1D4FA0');
  assert.equal(fit('#121212', '#F5C400', 4.5, W), '#121212');
  assert.equal(fit('#0e7c46', W), '#0E7C46');   // upper case out, whatever comes in
  // on a dark background it lightens by default
  const l = fit('#555555', '#000000');
  assert.ok(contrast(l, '#000000') >= 4.5 && contrast(l, '#000000') > contrast('#555555', '#000000'));
});

// Every 4.5 rule of the plan, on the tokens a world gives.
function rules(t) {
  return [
    ['white text on deep', W, t['--blue']], ['white text on strong', W, t['--red']], ['white text on fresh', W, t['--green']],
    ['ink on light', t['--ink'], t['--yellow']], ['ink on warm', t['--ink'], t['--orange']],
    ['fresh as a word on paper', t['--green'], t['--paper']], ['fresh as a word on white', t['--green'], W],
    ['strong as a word on paper', t['--red'], t['--paper']], ['strong as a word on white', t['--red'], W],
    ['ink on paper', t['--ink'], t['--paper']], ['muted on paper', t['--muted'], t['--paper']], ['muted on white', t['--muted'], W],
    ['faint on paper', t['--faint'], t['--paper']],
    ['the quiet line on an ink band', t['--on-ink-soft'], t['--ink']], ['the quiet line on a deep card', t['--deep-soft'], t['--blue']],
    ['warm as a word on paper', t['--warm-word'], t['--paper']], ['warm as a word on white', t['--warm-word'], W],
    ['white icon on wine', W, t['--tone-wine']], ['ink icon on the taxi tone', t['--ink'], t['--tone-taxi']],
    ['white text on the cards\' deep, strong, fresh', W, t['--deep-card']], ['', W, t['--strong-card']], ['', W, t['--fresh-card']],
    ['ink on the cards\' light', t['--ink-card'], t['--light-card']], ['muted on the cards (white)', t['--muted-card'], W],
  ];
}

for (const [id, p] of Object.entries(PALETTES)) {
  test(`world ${id}: every text and coloured word reaches 4.5`, () => {
    const t = worldTokens(p);
    for (const [what, a, b] of rules(t)) assert.ok(contrast(a, b) >= 4.5, `${id}, ${what || 'the same'}: ${a} on ${b} is ${contrast(a, b).toFixed(2)}`);
    for (const [k, v] of Object.entries(t)) assert.match(v, /^(#[0-9A-F]{6}|rgba\(\d+,\d+,\d+,\.\d+\))$/, `${id} ${k}: ${v}`);
  });
  // Strong stays in the red family, so Emergencies reads as urgent: its hue within 25 degrees of pure red (335 to 25,
  // which takes in a raspberry like City night's) and clearly coloured (saturation above 0.3), after the contrast rule.
  test(`world ${id}: strong stays red`, () => {
    const [h, s] = hsl(worldTokens(p)['--red']);
    assert.ok((h >= 335 || h <= 25) && s > 0.3, `${id}: strong ${worldTokens(p)['--red']} has hue ${h.toFixed(0)} and saturation ${s.toFixed(2)}`);
  });
}

test('worldCss is the same tokens as one :root rule', () => {
  const css = worldCss({ ...BAUHAUS, display: '"Jost",system-ui,sans-serif' });
  assert.match(css, /^:root\{--paper:#F3EEE3;.*--display:"Jost",system-ui,sans-serif\}$/);
  assert.equal((css.match(/;/g) || []).length + 1, Object.keys(worldTokens(BAUHAUS)).length + 1);
});

// ---------- the stylesheets ----------
const SHEETS = ['../src/styles/app.css', '../src/styles/map.css'].map(f => [f.split('/').pop(), readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]);
// app.css :root (all its :root rules), token by token, var() followed.
const ROOT = {};
for (const [, body] of SHEETS[0][1].matchAll(/(?:^|\})\s*:root\s*\{([^{}]*)\}/g)) for (const d of body.split(';')) { const m = d.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/); if (m) ROOT[m[1]] = m[2]; }
const val = k => { let v = ROOT[k]; for (let i = 0; i < 10 && /^var\(--[\w-]+\)$/.test(v || ''); i++) v = ROOT[v.slice(4, -1)]; return v; };

test('every token a world sets exists in app.css', () => {
  for (const k of Object.keys(worldTokens(BAUHAUS))) assert.ok(k in ROOT, `${k} is not in app.css :root`);
});

// Today's look against what the rule computes from its five roles: reported, never changed here (whether today's
// look moves by a hair is Yohann's call). The test fails only when a token is not a colour at all.
test('Bauhaus: today\'s values against the computed ones (report)', t => {
  const comp = worldTokens(BAUHAUS), out = [];
  for (const [k, v] of Object.entries(comp)) {
    const now = val(k); assert.ok(now, k);
    if (now.toUpperCase() !== v.toUpperCase()) out.push(`${k} ${now} -> ${v}`);
  }
  t.diagnostic(`${out.length} of ${Object.keys(comp).length} differ: ${out.join(', ')}`);
});

// The fixed colours: everything else in a rule of app.css or map.css must be a token (var(--...)), so the next
// person cannot hard-code a role colour again. Add here only a colour that must NOT follow a world, with its reason.
const FIXED = [
  /^#fff$/i,                                             // white: text and icons on the tiles, white cards, the QR code's ground
  /^rgba\((0|10|18),\1,\1,(\.\d+|calc\(.*\))\)$/,         // shadows and dark veils (photo counter, lightbox, wifi sheet)
  /^rgb\(0 0 0 \/ \.\d+\)$/,                              // map.css: shadows of pins and controls
  /^rgba\(255,255,255,\.\d+\)$/,                         // white veils on dark glass and photos
];
const NAMED = /(^|[\s,(])(white|black|red|green|blue|yellow|orange|gr[ae]y|purple|pink|brown|navy|teal|silver|gold|maroon|olive|lime|aqua|fuchsia|beige|ivory|tan|coral|salmon|crimson|indigo|violet)(?=$|[\s,)!])/i;
test('stylesheets: no colour outside the :root tokens but the fixed ones', () => {
  const bad = [];
  for (const [file, css] of SHEETS) {
    for (const [, sel, body] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (sel.trim() === ':root') continue;   // the token blocks
      for (const d of body.split(';')) {
        const i = d.indexOf(':'); if (i < 0) continue;
        const v = d.slice(i + 1).replace(/url\([^)]*\)|"[^"]*"|'[^']*'/g, '');
        for (const c of v.match(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\((?:[^()]|\([^()]*\))*\)/gi) || []) if (!FIXED.some(r => r.test(c))) bad.push(`${file}: ${sel.trim().slice(-50)} { ${d.trim().slice(0, 90)} }`);
        if (NAMED.test(v)) bad.push(`${file}: a named colour in ${sel.trim().slice(-50)} { ${d.trim().slice(0, 90)} }`);
      }
    }
  }
  assert.deepEqual(bad, [], 'a colour written in a rule: take a token from app.css :root (or add a derived one there and to worlds.js)');
});
