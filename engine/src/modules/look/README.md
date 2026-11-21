# The look (the colours, the cover, the logo)

What a guide looks like before a guest has read a word: its colours, the picture on top of Home, the host's logo. Every
guide has Ca La Kimberly's tiles; a host chooses colours, never a layout. This page is the module's memory: read it
before changing how the look behaves, and write a changed rule here with its date.

The look is not a folder of code like the other modules: its rule is used by the engine, the build, the generator and
the maker, so it lives beside them (`engine/src/worlds.js`, `engine/src/picture-world.js`). This folder holds only this
page.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | One tile system: every guide uses Ca La Kimberly's structure (filled colour tiles with a corner shape). The host picks colours, not a layout, and it must stay easy for someone who is not technical. | Yohann, 10 Nov 2026 (`docs/plan-ca-la-kimberly-through-the-maker.md`, "Step 3: the look") |
| 2 | Five roles, the same in every world: deep, strong and fresh carry white text; light and warm carry dark text. Strong stays in the red family, so Emergencies always reads as urgent; fresh is the green of "Open". | The mockups of 10 Nov 2026, liked by Yohann the same day |
| 3 | Contrast is enforced, not hoped for: text on a tile and coloured words reach 4.5 to 1, by darkening or lightening the colour until they do. One rule for a ready-made world, a picture's colours and a colour fine-tuned by hand. | Yohann, 10 Nov 2026 ("contrast is respected") |
| 3b | The light colour is also the one role drawn on another: the small icon of the rubbish tile, on deep. It is lightened until it reaches 3 to 1 there (an icon, not text). The six worlds and every world a picture makes already did; a "Light tiles" fine-tuned by hand to a dark mustard did not (1.6 to 1), found by measuring real pages in the six tightest worlds the rule can make. | Claude, 21 Nov 2026, asked by the main conversation before real hosts' first guides |
| 4 | One copy of the rule: `engine/src/worlds.js` and `engine/src/picture-world.js`. The maker pastes both files into its page (`build.py`, as `WK`); the generator asks `engine/scripts/world-of.mjs`. Never a second copy, in any language. | This repo's `CLAUDE.md`, "Colours" (14 Nov 2026) |
| 5 | Six worlds: Bauhaus summer (Ca La Kimberly's own look, to the pixel), Sea, Country, Tropical, City night, Stone. Each has its colours and its title font; the text font is Jost in every world, because the guide's lines are measured for it and every other family is wider. | Built 13 and 14 Nov 2026 (`worlds.js`, the comment above `WORLDS`) |
| 6 | A host can bring a picture and use its colours under the same contrast rule: "From your cover", "From your logo", the artistic cover included. The picture's colours take the roles they are nearest to; the rest comes from the nearest world, quietened when the picture is quiet; Emergencies only takes a real red, "Open" only a green; two tiles never end up one colour; a picture with no colour gives Stone. The same picture always gives the same world. | Yohann, 10 Nov 2026 ("a host can still bring a picture, or the artistic rendering of one"); built 14 Nov 2026 (`picture-world.js`) |
| 7 | A new guide starts in its own cover picture's colours, stored like a pick as soon as the picture is read, so the build makes the guide the phone showed. Before, every guide started in Bauhaus, Ca La Kimberly's colours, and a host who changed nothing got our look. With no cover picture, or one that cannot be read: Bauhaus (nothing is stored then, so another cover can still give its colours). | Yohann, 17 Nov 2026 ("Colours from my photo") |
| 8 | A guide that exists keeps the colours its guests know: the start of rule 7 is only for a guide still being made in the builder (never sent, no guide built from it). Answers sent before the worlds, with no world named, stay Bauhaus at a rebuild. | Claude, 17 Nov 2026, with rule 7 |
| 9 | The picker is one row of small phones, the host's own guide in each world: "From your cover" first when there is a cover picture, "From your logo" when there is a logo, then the six worlds. One tap picks and the big phone shows it at once. "Fine-tune each colour" holds the five roles only and goes through the contrast rule. | Yohann, 14 Nov 2026 ("Yes, build", on the picker drawn in the real builder) |
| 10 | When the colours come from a picture and that picture changes, the colours are read again from the new one, in the builder and in the editor. A built guide's row says where its colours came from (`theme.worldFrom`), so the editor shows "From your cover" picked, not the world it was made on. | Built 14 Nov 2026; the row's `worldFrom` at a build: 17 Nov 2026 |
| 11 | The cover: a scene drawn in code from the guide's own colours unless the host has a photo. | The house module's page, rule 5 (`../house/README.md`) |
| 12 | The artistic cover is one of the host's photos redrawn (OpenAI, the worker's `cover-art` job, at most 8 a day per guide); the host keeps it or not, and the guide's credits say it was made with AI. | 28 Oct 2026 (`worker/README.md`); the house module's page, rule 16 |
| 13 | The logo is optional and never made up: a guide without one shows none. With one, it is on the welcome card and the phone's icons are made from it. | Yohann, 28 Oct 2026 |
| 14 | Dark mode is off for every guide: the worlds have no dark colours. | As built (`engine/src/theme.js`, `theme.darkMode`) |

## Its data

- A guide: `theme.world` in `site.json` and in its row, an id (`"sea"`) or a world with colours of its own
  (`{ "base": "stone", "deep": "#2D5476" }`: the base world and the roles that are no longer its own). In the row,
  `theme.worldFrom` (`cover` or `logo`) when it came from a picture. A guide with no world is the engine's stylesheet
  as it is (Ca La Kimberly).
- The builder's answers: `world` (an id, `cover` or `logo`), and for a picture `worldOwn` (the world the maker made and
  showed) with `worldSrc` (the picture it came from).
- The cover: `content/house.json` `photo`, `photoPos`, `cover`; `site.json` `theme.coverMade` (`ai`). The logo:
  `site.json` `logo`.

## Where its code is

| Part | Where |
|---|---|
| The roles, the contrast rule, the six worlds, a world's tokens | `engine/src/worlds.js` (tests: `engine/scripts/worlds.test.mjs`) |
| A picture's colours and the world they make | `engine/src/picture-world.js` (tests: `engine/scripts/picture-world.test.mjs`) |
| The same for the generator, which keeps no copy | `engine/scripts/world-of.mjs` (tests: `engine/scripts/world-of.test.mjs`, `worker/test/generate-world.test.mjs`) |
| The world at a build and in the shared viewer | `engine/site.config.js`, `engine/src/viewer.js` (`?world=<id>` for one visit) |
| The world from the answers to a guide | `engine/scripts/generate-site.py` ("the look: a colour world"), `engine/scripts/guide-to-row.mjs` |
| The picker, a picture read in the browser, what a new guide starts with | `onboarding-site/src/preview.js` (`worldAsked`, `worldSel`, `worldStore`, `worldRowHTML`) |
| The look in the builder | `onboarding-site/src/start.js` ("The look on one screen") |
| The look in the editor | `onboarding-site/src/editor.js` (`cmLook`, `edWorld*`) |
| The welcome card and the drawn cover | `../house/welcome.js`; the same scene copied for the maker's phone, `onboarding-site/src/preview.js` (`PV_ART`) |
| The artistic cover | `worker/guide-worker.mjs` (`coverArtJob`) |
| Light and dark | `engine/src/theme.js` |

## Its checks

- `node --test engine/scripts/worlds.test.mjs engine/scripts/picture-world.test.mjs engine/scripts/world-of.test.mjs`
- `node engine/scripts/contrast-check.mjs <site> all`: every text of the main pages in the six worlds (about 30 minutes
  on a busy Mac).
- `WORLD=<id> node engine/scripts/ux-check.mjs <site>`: the UX check in a world.
- `ONLY=look-worlds node onboarding-site/test/check.mjs`: the picker in the builder and the editor.

## What a poor cover picture gives (asked by the main conversation, 21 Nov 2026, before real hosts' first guides)

- Every text on a tile passes by construction: a role's colour is moved until it does (rule 3), whatever the picture
  (600 random pictures and seven named poor ones in `picture-world.test.mjs`).
- Every other text was measured on Ca La Kimberly's pages (`contrast-check.mjs` with the picture's world) in worlds
  made from eight poor pictures: a night shot, an overexposed one, a floor plan, mostly sky, mostly pool, a sunset,
  all garden green, a yellow wall. 6,106 texts and 1,088 icons each, none failing.
- No colour in the picture (grey, black and white, near black, near white): Stone as it is. No picture, or one the
  browser cannot read: Bauhaus. Nothing is refused for contrast: a colour is moved until it passes, so a dull picture
  gives a quiet guide, never one that is hard to read.
- The six ready-made worlds are beside "From your cover" in the same row: one tap.
- The same measure in the six tightest worlds a hand can make (deep, strong and fresh given pale, light and warm
  given dark) found one failing case, now rule 3b.

## Open, none decided

- The cover photo is always cropped at the same point (`photoPos` 50% 55%): a host cannot place it (plan, gap D5).
- A guide with no photo gets the same small drawn house as every other (plan, proposal 7).
- The editor lets a host pick a text font by hand, and the wider ones push German, French and Dutch words past their
  line at 360 px (the reason for rule 5's Jost).
- The builder asks cover, colours, logo; the editor asks logo, cover, colours.
- A logo is a brand's own colours: should it lead over the cover picture when a host adds one? Today the cover leads
  and the logo is one tap away.
- A cover picture that the browser cannot read (a listing site that does not allow it) gives Bauhaus, although the
  server could read it.
- Ca La Kimberly's cover file is 3278 px wide for a card of about 375 px (seen by the house page's conversation, 16 Nov
  2026): the weight of a cover is not looked at anywhere.
