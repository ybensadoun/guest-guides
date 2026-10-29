# UX guidelines for every guide (owner's feedback, Oct 2026)

These apply to every guide built on the engine, to the onboarding site and to the day-rental site.
They sit next to docs/TYPOGRAPHY.md (languages) and docs/CURATION.md (what we recommend).

## 1. Nothing overlaps (the core rule)
- Nothing ever sits on top of anything else: text, numbers, icons, arrows, buttons and decorative shapes each get
  their own space, in every language and at every phone width. Not "readable enough on top", not "behind a solid
  disc": no overlap at all.
- This is a rule for the whole layout, not a fix for one tile. When a new element or a longer translation would
  overlap, change the layout (or shorten the words). Never just nudge one element away.
- Enforced by `engine/scripts/ux-check.mjs` (Playwright). It opens Home, Markets, Restaurants, What to do and the
  House page at 360, 390 and 430 px in every language. It fails if a shape touches any text, icon or arrow, if a
  word is wider than its line, if a list row's name or details run under its status on the right (open until,
  reopens at: it depends on the time of day), or if a page is wider than the screen. Run it before every delivery.
- List rows (29 Oct 2026): the name column never gets narrower than its longest word, and the status on the right
  wraps between its words to make room. Inside a row, words break only between words or at a soft hyphen written in
  the content (no automatic hyphenation there); a number stays with its unit ("10 km", "★ 4.7").

## 2. Tiles
- One layout: icon top-left; shape in the top-right corner only; title across the full width; arrow on its own
  row at the bottom right, below the text. Wide tiles: shape at the far right edge, arrow just left of it, text
  padded so it stops before the arrow.
- Contrast: at least 4.5:1 for text, 3:1 for icons, arrows and borders (WCAG AA). Arrow disc: white arrow on ink,
  or ink arrow on white. Never a coloured glyph on a dark disc of a similar value (an orange arrow on black fails).
- Tap targets at least 44 x 44 px. No fixed widths on anything translated.

## 3. Words never break mid-word
- A word that does not fit its line is a content problem. Shorten the label ("Was tun" rather than "Was
  unternehmen"), or put a soft hyphen (U+00AD) in a long compound in the content (Menschen|türme), so it breaks
  with a visible hyphen.
- Tile titles scale slightly with the tile width (container units, 19 px minimum) so a single long word such as
  "Emergencias" still fits at 360 px. Phrases are shortened, not shrunk.
- Chromium in the test has no German hyphenation, so it is stricter than an iPhone: fix what it reports anyway.

## 4. Navigation
- The back arrow does what the phone's back gesture does: it returns to the previous screen inside the guide
  (Markets after its map, a list after a place). Only when the guide was opened directly on a page does it go Home.
- Coming back to a list or to Home restores where the guest was; a new page opens at the top.
- Every inner page shows its title. When the title scrolls away, a slim bar with the title follows the scroll in;
  tapping it goes back to the top. Home has no bar, only the floating language button.

## 5. Motion
- Anything that appears on scroll is scroll-linked (opacity and position follow the scroll), never an on/off
  switch with a transition: switches flicker on iPhone.
- No layout jumps: maps, photos and images keep their space while loading.

## 6. Space
- No empty bands: the page title shares the row with the floating back and language buttons.
- Long texts open on their most inviting first paragraph with "Read more"; lists show the key facts first.
- Sheets and pop-ups fit the visible screen (100dvh) and keep their close button visible.

## 7. Content on screen
- Say only what the guest needs at that moment; shorten before shrinking the font.
- Every recommendation has a one-line reason (docs/CURATION.md).

## 8. Before delivering
- Run `node engine/scripts/ux-check.mjs <site>` from Guest Guides (after a build): it must print "UX check OK".
- Look at Home and two inner pages at 360 px in German and French: every arrow readable, back arrow = back gesture.
