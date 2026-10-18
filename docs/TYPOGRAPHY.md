# Multilingual typography and layout (owner's rules, 18 Oct 2026)

Apply to every text, page and component, in every guide and on the day-rental site: en, fr, es, ca, de, nl.

## French (fr)
- Real Unicode no-break spaces, never normal spaces, never the text "&nbsp;" (except in HTML source).
- Thin no-break space U+202F before ? ! ;  and no-break space U+00A0 before :
- Inside guillemets: «U+00A0text U+00A0»
- Between a number and its unit or symbol: 10 km, 5 €, 20 %, 1 min (U+00A0).
- No line may start with ? ! ; : » and no line may end with «. Never remove these spaces.

## German (de)
- Quotes „like this“ or »like this«, never "like this".
- All nouns capitalized.
- This engine says du (informal). Keep du everywhere, unless a host wants Sie for the whole guide.
- Numbers 1.234,56 € with a no-break space before the symbol; no-break space inside z. B. and d. h.
- Text runs about 30% longer than English, with long compound words: layouts must tolerate it.

## Dutch (nl)
- "IJ" is one letter: IJsselmeer, never Ijsselmeer.
- Leading apostrophes: 's morgens, 't huis (watch smart-quote autocorrect).
- This engine says je (informal). Keep je everywhere.

## Spanish (es)
- Always the opening ¿ and ¡ as well as the closing marks.

## Catalan (ca)
- Keep the punt volat (col·legi, intel·ligent, U+00B7) and apostrophes (l'hotel, d'un).

## English (en)
- Normal spacing, no space before punctuation.

## Web and UI (all languages)
- <html lang> is set and updated when the language changes (main.js).
- Text blocks use hyphens: auto and overflow-wrap: break-word (app.css), so long German and Dutch words never overflow.
- No fixed-width buttons, tabs or nav items. No white-space: nowrap on translated text unless it is a short label with room for German.
- Never hand-write dates, numbers or currencies in code: Intl.DateTimeFormat / Intl.NumberFormat with the current locale.
- Render-time protection: engine/src/i18n.js typo() runs on every UI string (t) and content string (tx): French spaces, number + unit no-break spaces in all languages, German abbreviations. Text edited later is protected too.
- Before delivering a multilingual UI, check it at 360 px wide in German (longest) and French (punctuation).

## General
- No em-dashes in any language. Use commas or periods.
- If a translation is much longer than the original, shorten the wording rather than shrinking the font.

## Checked automatically (npm run check, in every build)
Spanish ¿ ¡, Catalan l·l, Dutch IJ, German straight quotes: build fails. German Sie in a guide's own texts: warning.
