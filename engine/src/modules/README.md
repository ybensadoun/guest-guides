# The module frame (Home)

How Home places the parts of a guide: which tile or card, in which size, in which order. The modules themselves (rubbish
first, `garbage/README.md`) say what they show; the frame says where and how big. Read this page before changing how Home
is arranged, and write a changed rule here with its date.

The design is the plan's proposal 22 (`docs/plan-ca-la-kimberly-through-the-maker.md`, "Proposal 22, the module frame").
This is part 1 of its work: the sizes and the placements in the engine. Ca La Kimberly's Home is the reference: with no
arrangement of its own, a guide's Home is drawn exactly as before the frame, to the pixel.

## What Home is

The welcome card (photo, name, Wi-Fi and checkout), then two groups, **house** ("At the house") and **area** ("Around the
house"), then What's on (markets and events by day), then the link to Sources and credits. Only the two groups are made of
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
| Highlight | The white card of one thing of the module, with its live status | The cards of `quick.json` (the bar, the pizzeria), the taxi and train card |

## Three sizes, and who offers which

| Size | In the grid | Class |
|---|---|---|
| Half | One of the two columns | `s-half` |
| Wide | Both columns | `s-wide` (with `wide`, which older rules read) |
| Tall | One column, two rows | `s-tall` |

| Thing | Sizes |
|---|---|
| Rubbish (kind `garbage`), its live tile | Wide |
| The map | Wide |
| A highlight | Half, wide |
| Local events (kind `events`), its entry tile with the next event | Wide |
| Every other section's entry tile | Half, wide, tall |

What a kind of module offers is written in `frame.js` (`OWN`) until each module says it in its own folder.

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
| 10 | A card closed for the season and opening in more than 30 days is left out (`quickShown`, `content.js`); its page still opens. | Before the frame |
| 11 | The house page has no tile: the welcome card opens it. | Before the frame |
| 12 | Local events are wide only: their tile carries the next event's name and date, and as a half or tall tile "esdeveniments" and "evenementen" were wider than the tile. | Claude, 14 Nov 2026, from the frame check; to confirm with Yohann |
| 13 | A tall tile's title is drawn larger (as Markets' always was) only when each of its words has 9 letters or fewer; otherwise it keeps the size it has on a half tile (class `t-word`): "Emergencies", "aparcamiento" and "stationnement" were wider than a tall tile at 360 px. Words are never shortened or cut for this, and no font goes below the half tile's. | Claude, 14 Nov 2026, from the frame check; to confirm with Yohann |

## What the frame check proves, and what it only notes

`node engine/scripts/frame-check.mjs <site>` draws every section's tile in each size it offers and every highlight in both,
in all the site's languages at 360, 390 and 430 px, and fails on an overlap, a word wider than its line, a page wider than
the screen or a hole. It passes on Ca La Kimberly (14 Nov 2026). It only notes words the browser cuts over two lines, since
the live Home already has some: "si-tios" (es) and "favo-riete" (nl) on Eat and drink, "domi-cile" (fr) on the pizza card;
and a highlight made half cuts "conve-nience", "épi-cerie", "buurt-winkel". These are for shorter wording, per module.

## Its file

`content/home.json`, optional, one per guide. No guide has one yet.

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
| The frame: default, resolving, packing, checking; pure, no DOM | `frame.js` (tests: `engine/scripts/frame.test.mjs`) |
| Home drawn from placements | `engine/src/views/home.js` (`sectionGrid`, `frameGuide`) |
| The guide's arrangement, read once | `engine/src/content.js` (`HOME_ARRANGEMENT`, `TRANSPORT_CARD`) |
| The sizes' styles | `engine/src/styles/app.css` (`.gt.s-tall`, `.gt.s-wide:not(.w-live)`, `.gt.t-long`, the per-module shapes by size) |
| The check of `home.json` | `engine/scripts/check-content.js` (with `check()` of `frame.js`) |
| Every module in every size, measured and pictured | `node engine/scripts/frame-check.mjs <site> [picture folder]` |

## Not built yet

- The modules other than rubbish: each kind of section moves to its own folder with its widgets, and says there what it
  offers (proposal 22, step 2).
- The arranger in the maker: the step "Home tiles" becomes "Home page", the two groups as lists to drag, a switch of sizes,
  "Add to your home page", "Back to the arrangement we suggest" (proposal 22, step 3). Until then no guide has a
  `home.json`, and every Home is the default.
- The rule "every product guide has exactly Ca La Kimberly's sections" becoming "every guide starts from Ca La Kimberly's
  arrangement, and a host may rearrange it": Yohann's to confirm.
