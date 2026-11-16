# The module frame (Home)

How Home places the parts of a guide: which tile or card, in which size, in which order. The modules themselves say what
they show and what they offer; the frame says where and how big. Every part of a guide is a module of its own (14 Nov
2026), each with its README: the house and its welcome card (`house/`), rubbish (`garbage/`), the text pages such as the
house guide (`info/`), Emergencies (`contacts/`), Getting around (`transport/`), markets (`markets/`), the host's lists of
places (`places/`), Local events (`events/`), the white cards (`highlights/`), the map (`map/`) and What's on
(`whatson/`). Read this page before changing how Home is arranged, and write a changed rule here with its date.

The design is the plan's proposal 22 (`docs/plan-ca-la-kimberly-through-the-maker.md`, "Proposal 22, the module frame").
This is part 1 of its work: the sizes and the placements in the engine. Ca La Kimberly's Home is the reference: with no
arrangement of its own, a guide's Home is drawn exactly as before the frame, to the pixel.

## What Home is

The welcome card (photo, name, Wi-Fi and checkout), then two groups, **house** ("At the house") and **area** ("Around the
house"), then What's on (one agenda by day, made of what the modules have on a day: a module feeds it with `agenda` in its
`index.js`, `whatson/README.md`), then the link to Sources and credits. Only the two groups are made of
placements; the welcome card and What's on stay where they are.

## A placement

One thing in one size, in a group:

| Kind | Written | What it is |
|---|---|---|
| A section's tile | `{ "kind": "section", "id": "markets", "size": "tall" }` | The colour tile of a section of `content/sections.json`, by its id |
| A highlight | `{ "kind": "highlight", "id": "shop", "size": "wide" }` | The white card of one place with its live status: an item of `content/quick.json`, or the transport section's id for its card ("Taxi & train") |
| The map | `{ "kind": "map", "size": "wide" }` | The bar that opens the map |

An optional `"widget"` says which of the thing's widgets is meant, and must match what the thing is: `"live"` for a module
whose tile shows its answer now (rubbish), `"entry"` for every other section and the map, `"highlight"` for a card. It is
there so that a module can offer a second widget later.

## Three kinds of widget

| Widget | What it is | Today |
|---|---|---|
| Entry tile | The colour tile that opens the module's page, with at most one live line ("7 today") | Every section, the map |
| Live tile | The module's answer now, on the tile | Rubbish: tonight's bins |
| Highlight | The white card of one thing of the module, with its live status | The cards of `quick.json` (the bar, the pizzeria), the taxi and train card (`highlights/`) |

## Three sizes, and who offers which

| Size | In the grid | Class |
|---|---|---|
| Half | One of the two columns | `s-half` |
| Wide | Both columns | `s-wide` (with `wide`, which older rules read) |
| Tall | One column, two rows | `s-tall` |

| Thing | Sizes | Written in |
|---|---|---|
| Rubbish (kind `garbage`), its live tile | Wide | `garbage/offers.js` |
| Markets (kind `markets`), its entry tile with today's count | Half, wide, tall | `markets/offers.js` |
| The host's lists of places (kind `spots`: Eat and drink, Things to do, Nightlife), their entry tile | Half, wide, tall | `places/offers.js` |
| Local events (kind `events`), its entry tile with the next event | Wide | `events/offers.js` |
| A highlight (a card of `quick.json`, or Getting around's) | Half, wide | `highlights/offers.js` (listed as `highlight`; `frame.js` keeps the same as its own word when a guide is given no offers) |
| The text pages (kind `info`: the house guide, arrival, extras), their entry tile | Half, wide, tall | `info/offers.js` |
| Emergencies (kind `contacts`), its entry tile | Half, wide, tall | `contacts/offers.js` |
| Getting around (kind `transport`), its entry tile when it has no card | Half, wide, tall | `transport/offers.js` |
| The map, its bar | Wide | `map/offers.js` (listed as `map`, the kind of placement; `frame.js` keeps the same as its own word when a guide is given no offers) |
| The house (kind `house`) | Nothing: the welcome card, the frame's fixed top | `house/offers.js` (an empty offer: the frame never makes it a tile) |
| A kind of section no module knows | Half, wide, tall | `frame.js` (`ENTRY`) |

A module says what it offers in its own folder (14 Nov 2026): `offers.js` exports `widgets`, `{ <widget>: { sizes } }`,
the first widget named being the one Home draws (`{ live: { sizes: ['wide'] } }` for rubbish). Its `index.js` exports it
with the rest, and `views/home.js` passes the registry's offers to the frame in the guide (`offers`); the node scripts
(`check-content.js`, `frame-check.mjs`, the tests) read the same files through `offers.js` beside this page, which lists
the same modules under the same names as `index.js` (a test checks it). Both list a module by the kind of section it
serves, which is not always its folder's name (`spots` is `places/`), and the highlights and the map under the kind of
placement, `highlight` and `map`. A module that offers nothing (`{}`: the house) is never placed. A widget may give its
own label and link (markets: "Markets" and the day's list; Emergencies: its short label; the map: its bar's classes);
`views/home.js` draws whatever a widget gives and names no module. The frame stays pure: it is given what each kind
offers and imports no module.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Home is a list of placements in two groups (house, area) between two fixed ends (the welcome card on top, What's on at the bottom). | Yohann, 14 Nov 2026 (proposal 22) |
| 2 | Three sizes, the same for every module, styled once in `engine/src/styles/app.css` (not by position, not by name): tall is what the first tile of "Around the house" was; wide for an entry tile is the bar the Map has (icon, text, the arrow just left of the shape, the shape at the far right edge), Nightlife's wide tile being the same bar; the rubbish tile keeps its own layout (a live tile). | Yohann, 14 Nov 2026 (proposal 22) |
| 3 | Each module keeps its own corner shape, its kind and its colour, in every size: half and tall in the top-right corner (tall larger), wide at the far right edge, vertically centred, half out of the tile as the Map's. A section with no shape of its own (Arrival, Extras) has none in any size, and its wide arrow sits at the right edge. | Yohann, 14 Nov 2026 (proposal 22); the shapes of the sizes that did not exist were drawn on 14 Nov 2026 and are to be judged from the frame check's pictures |
| 4 | A wide entry tile of a section whose title is longer than 20 characters takes a 21 px title (class `t-long`), so that "Our favourite places to eat" holds on two lines at 360 px. The map keeps its 23 px title, so that Ca La Kimberly's Home does not move ("Mapa de todos los sitios" is longer than 20 characters). | Yohann, 14 Nov 2026 (found while drawing); the map's exception, 14 Nov 2026, for the pixel rule |
| 5 | No holes. Tiles and highlights flow in runs (consecutive highlights form one run, consecutive tiles and the map another), each laid out as the two-column grid lays it out. A half item whose neighbour cell would stay empty (it is last, or the next one is wide) becomes wide. A tall tile needs both cells beside it filled: with one, it becomes half; with none, wide. This replaces the old rule "a tile alone at the end of Around the house is wide". | Yohann, 14 Nov 2026 (proposal 22: "a half tile left alone in its row becomes wide, so no arrangement leaves a hole") |
| 6 | A guide without `content/home.json` shows the default arrangement, today's Home: at the house, rubbish wide then the other tiles half, in `sections.json` order; around the house, the highlights (wide or half by their own `wide`), then the tiles, the first tall, the others half, a tile alone in its last row wide, then the map, wide. Local events are not a tile by default: they are in What's on. | Yohann, 14 Nov 2026 (proposal 22: "a guide with no arrangement of its own shows today's") |
| 7 | Resolving a guide's arrangement: a placement of something that does not exist, is switched off or is not live is skipped; so is one whose `widget` is not the thing's; a size the thing does not offer becomes its default size; a thing is placed once (a second mention is dropped). | Yohann, 14 Nov 2026 |
| 8 | What a guide's arrangement does not mention but Home shows by default (a live section, a highlight shown now, the map) is added in its own group where the default would put it: a highlight after the group's last highlight (else first); a tile after the nearest tile before it in the default that is placed there, else before the nearest one after it, else before the map; the map last. So a new section or card never goes missing. | Yohann, 14 Nov 2026 (the exact order of insertion, 14 Nov 2026) |
| 9 | Getting around shown as a highlight (its `tile` in `transport.json`) is not repeated as a section tile, in either group. | Before the frame (views/home.js); now in both groups |
| 10 | A card closed for the season and opening in more than 30 days is left out (`highlights/data.js` `quickShown`); its page still opens. | Before the frame |
| 11 | The house page has no tile: the welcome card opens it. Since 14 Nov 2026 the house module says so itself, with an empty offer (`house/offers.js`), and the frame no longer names it; `check()` still answers "is the house page, which the welcome card opens" for a section whose module offers nothing (only the house). | Before the frame |
| 12 | Local events are wide only: their tile carries the next event's name and date, and as a half or tall tile "esdeveniments" and "evenementen" were wider than the tile. | Claude, 14 Nov 2026, from the frame check; to confirm with Yohann |
| 13 | A tall tile's title is drawn larger (as Markets' always was) only when each of its words has 9 letters or fewer; otherwise it keeps the size it has on a half tile (class `t-word`): "Emergencies", "aparcamiento" and "stationnement" were wider than a tall tile at 360 px. Words are never shortened or cut for this, and no font goes below the half tile's. | Claude, 14 Nov 2026, from the frame check; to confirm with Yohann |

## The arranger (maker)

The maker's step Home page (step id `tiles`, route `#tiles`; it was "Home tiles"): a board, a plan of the guide's Home whose
tiles a host drags to move, taps to resize, and adds to (`onboarding-site/src/board.js`). Yohann chose it on 15 Nov 2026
("The board") over the list of rows agreed on 14 Nov, on drawings made on the real maker pages; built 15 and 16 Nov 2026.
The rules below are that design's: Claude's, shown to Yohann in the drawings and in words, his own words where quoted.

| # | Rule | Decided |
|---|---|---|
| 1 | The board shows exactly what guests will see, in shape: it is drawn from `resolve(home, guide)` of this frame, with the modules' own offers. The maker never holds a second copy of a frame rule or of an offer: `build.py` pastes `frame.js` and each module's `offers.js` (as listed by `offers.js` here) into the page as `FR`, as it pastes `worlds.js` (`WK`). | Yohann, 15 Nov 2026 ("The board": tiles a host moves like on a phone's home screen); one rule everywhere: this repo's `CLAUDE.md` |
| 2 | The guide as the frame sees it is made from the draft the editor holds, as `content.js` and `views/home.js` `frameGuide` make it: a module switched off disappears (markets with none found too), Getting around with a `tile` is a card, a card closed for the season and opening in more than 30 days is left out (`season.js` `hiddenOn`, pasted, as `highlights/plan.js` `shownOn`). | The design, 15 Nov 2026 |
| 3 | Two groups, "At the house" and "Around the house", between two locked ends drawn as rows: the welcome card, always first; What's on, always last. A tile moves within its own group only. Cards and tiles may be interleaved, as the frame allows. | The design, 15 Nov 2026 |
| 4 | A tile is drawn in the guide's own colour for its section (`ui.js` `SECTION_LOOK` and `app.css`'s corner shapes, pasted, in the guide's colour world) and named as hosts know it in the maker (Guide sections' names: Eat and drink, Attractions, Local markets, House guide...); a card by its own name in the language being edited. Half is one column, wide both, tall one column and two rows. | The design, 15 Nov 2026 |
| 5 | A tap (or Enter) selects a tile and shows its panel: its name, one line on what it shows guests, the sizes it offers (`thing(...).sizes`; one size only: one line instead, "Always wide: it shows tonight's bins."), Earlier and Later within its group, a link to its section's step, and for a card "Edit its words" and "Remove from the home page" (Local events: "Remove" too). On a phone the panel is a bar above the step bar, and the page scrolls so that the tile stays above it; a tap outside the board and the bar lets go. | The design, 15 Nov 2026 |
| 6 | No holes is the frame's rule, not the host's problem: when the frame shows a tile in another size than the host picked (rule 5 of the frame), the board shows what guests see, the switch keeps the host's pick, and one quiet line says why ("Shown wide for now: it is alone in its row."). | The design, 15 Nov 2026 |
| 7 | Drag: with a mouse after about 6 px of movement; on a touch screen after a press of about 300 ms, so that the page still scrolls under a finger. While dragging the other tiles make room (the order tried goes through `resolve`); the tile goes to the order whose slot is under the pointer, the order drawn winning a tie, so tiles never swap back and forth. Dropping commits; Escape, or dropping outside its group, cancels; near the top or bottom edge the page scrolls. A press without movement is a tap. After a move a polite live region says it ("Markets is now before Eat and drink."). | The design, 15 Nov 2026; the slot under the pointer: Claude, 15 Nov 2026, from the first drawings (swapping by the tile under the pointer went back and forth when sizes differ) |
| 8 | The first change writes the whole arrangement into the file (`{ _doc, house, area }`), with the host's sizes (`placements`: the default arrangement's own sizes for what was never touched, not the sizes after the no holes rule), then the change. It always passes `check()`: a placement of something the guide no longer has (a card removed, a section switched off) leaves the file before each save. A change is a draft until "Publish changes". | The design, 15 Nov 2026 |
| 9 | "Add to your home page" offers only what the guide has and Home does not show: a place to eat, something to do, Nightlife (a place of that list as a card, picked from a short searchable list: "Show on the home page", with its list's icon), a bar, restaurant or shop that is in none of the lists (a card of the host's own words), Getting around's card (when the section is live and has none), Local events (its tile with the next event, wide, when the section is live and not placed). What is added comes on the board, selected. | The design, 15 Nov 2026 |
| 10 | "Back to the arrangement we suggest", shown only when the guide has its own arrangement, removes the file after one confirmation ("Sure? Tap again"); the cards stay. | The design, 15 Nov 2026 |
| 11 | Size is set on the board only. A card has no "wide" field of its own in the maker (it had none before either); a guide with no file keeps the card's own `wide` as its default size. | The design, 15 Nov 2026 |

## What the frame check proves, and what it only notes

`node engine/scripts/frame-check.mjs <site>` draws every section's tile in each size it offers and every highlight in both,
in all the site's languages at 360, 390 and 430 px, and fails on an overlap, a word wider than its line, a page wider than
the screen or a hole. It passes on Ca La Kimberly (14 Nov 2026). It only notes words the browser cuts over two lines, since
the live Home already has some: "si-tios" (es) and "favo-riete" (nl) on Eat and drink, "domi-cile" (fr) on the pizza card;
and a highlight made half cuts "conve-nience", "épi-cerie", "buurt-winkel". These are for shorter wording, per module.

## Its file

`content/home.json`, optional, one per guide (in a guide built by the maker, the file `home` among its files). A guide has one
once its host changes Home in the maker's step Home page ("The arranger (maker)", below); with none, Home is the default.

```json
{
  "_doc": "Home's arrangement: engine/src/modules/README.md",
  "house": [ { "kind": "section", "id": "garbage", "size": "wide" }, { "kind": "section", "id": "message", "size": "half" } ],
  "area": [ { "kind": "highlight", "id": "shop", "size": "wide" }, { "kind": "section", "id": "markets", "size": "tall" }, { "kind": "map", "size": "wide" } ]
}
```

`npm run check` (`engine/scripts/check-content.js`) checks it when it is there: the two groups, known kinds, ids that
exist, sizes each thing offers, widgets that match, nothing placed twice, with plain messages.

## Its look

In the DOM a run of highlights is one `.qcalls` block and a run of tiles one `.ggrid` block (`.ggrid.mosaic` around the
house), so the spacing of the default arrangement is what it was. Each tile and card carries its size class; a live tile
also `w-live`. The More page shows the same groups.

## Where its code is

| Part | Where |
|---|---|
| The frame: default, placements (the sizes asked for, before packing), resolving, packing, checking; pure, no DOM | `frame.js` (tests: `engine/scripts/frame.test.mjs`) |
| What each module offers, for the node scripts | `offers.js` (each module's own `offers.js`) |
| Home drawn from placements, the welcome card on top and What's on at the bottom | `engine/src/views/home.js` (`renderHome`, `sectionGrid`, `frameGuide`; the card from `house/`, What's on from `whatson/`) |
| A section's page asked of its module | `engine/src/views/section.js` (`renderSection`; and the shared `sectionFrame`, `zoomable`) |
| The guide's arrangement, read once | `engine/src/content.js` (`HOME_ARRANGEMENT`, `TRANSPORT_CARD`) |
| The sizes' styles | `engine/src/styles/app.css` (`.gt.s-tall`, `.gt.s-wide:not(.w-live)`, `.gt.t-long`, the per-module shapes by size) |
| The check of `home.json` | `engine/scripts/check-content.js` (with `check()` of `frame.js`) |
| Every module in every size, measured and pictured | `node engine/scripts/frame-check.mjs <site> [picture folder]` |
| The arranger, the maker's step Home page | `onboarding-site/src/board.js` (this frame pasted as `FR` by `onboarding-site/src/build.py`; checked by the group `home-page` of `onboarding-site/test/check.mjs`) |

## Not built yet

- Every part of the guide is a module since 14 Nov 2026 (proposal 22, step 2). What each module has not moved yet (its
  styles, its words, the generator's part, the maker's steps) is listed in its own README, under "Where its code is".
- Moving a tile from one group to the other ("At the house" to "Around the house"): not in the arranger's first version.
- Where a module is available (Yohann, 16 Nov 2026, "a note for later": "For each module that we're building, we should
  also say in which country it's available"): each module's README is to say the countries it works in, with the reason
  (Getting around's stations and lines come from Spain's open timetable files, so that part is Spain only). Nothing in
  the code reads it yet; the type and country model is `docs/reference-types-and-countries.md`.
