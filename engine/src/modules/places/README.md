# Places (module `places`, kind `spots`)

The host's own lists of places around the house: Eat and drink (section `restaurants`), Things to do (`todo`), Nightlife
(`nightlife`, off unless the host switches it on), and any other section of kind `spots` a guide has (the generator's
`essentials`, `kids`, `daytrips`). A guest sees the list nearest first, can keep only what is open now or opens later today,
narrow it to a quick-filter group or a feature (dog friendly, great for kids, menú del día), and opens a place's row for
where it is, its hours or Google's live line, and its links. On Home it is one widget, the list's entry tile.

One module serves every list: what differs between them is data (the places, their groups and marks) or a thin rule (which
feature filters a list offers), never a second copy of the page. The idea: "places to eat, things to do and nightlife
share one machine with thin rules on top", one of Claude's points given to Yohann when the modules were agreed in words
(13 Nov 2026, `docs/plan-ca-la-kimberly-through-the-maker.md`, "Modules and widgets, the picture agreed in words"). Read
this page before changing how the lists behave, and write a changed rule here with its date. Ca La Kimberly's Eat and
drink and Things to do are the reference: the move into this folder (14 Nov 2026) was checked pixel for pixel and byte
for byte, before and after.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | A list holds only what the host chose: swiped yes or typed, one list, no badge. Researched places are shown to the host first (the deck, then the editor) and never added without the host seeing them. | Yohann, 30 Oct 2026 (this repo's `CLAUDE.md`, Product rules: "Things to do hold only what the host chose") |
| 2 | Each list says what goes in it and what does not (no restaurant in Things to do). Hosts see Attractions, Eat and drink, Local markets, Local events, Nightlife; guests keep the engine's names. | 29 Oct 2026 (this repo's `CLAUDE.md`, Product rules: "Around you, as hosts see it") |
| 3 | Nightlife is part of the design, after Things to do, off unless the host switches it on, the host's own list like Eat and drink. | Yohann, 29 Oct 2026 (this repo's `CLAUDE.md`, Product rules: "One addition (Yohann, 29 Oct 2026): Nightlife") |
| 4 | Kids and dogs are filters inside a list, not sections: "Great for kids" in Things to do, "Dog friendly" in both lists. | 29 Oct 2026 (this repo's `CLAUDE.md`, Product rules: "Kids and dogs are filters inside Attractions") |
| 5 | Only what a guest would not find by searching Google: local tips, host favourites, things for kids or dogs; no groceries, no golf courses for golfers, no chains; every place with a one-line reason. | Yohann, 18 Oct 2026 (`docs/CURATION.md`; `../CLAUDE.md`, "Places we recommend") |
| 6 | Every place must still exist: a source under 2 years old or a live Google Maps listing that is not closed; guest reports win, the same day. Checked since 12 Nov 2026 with our own sources only (the place's website weekly, our open directory monthly); a doubt is a note for the host, never a change guests see. | `../PROJECTS.md` ("Data accuracy", Santa Oliva, Oct 2026); `../CLAUDE.md` ("Places we recommend", "Monthly check") |
| 7 | Order: nearest first, by road from the house, or from the guest when they chose "From me" and their position is known; a place with no distance known last; then by town. The same order and the same switch as the Markets page (`engine/src/lists.js`). | Code comments: the order since the first engine; "no distance known: last" since 28 Oct 2026 (`../markets/README.md` rule 5) |
| 8 | Time filters ("Open now", "Opens later today") show only when some place of the list has hours; each counts only the places whose hours we know, and a filter with nothing in it is hidden (if it was chosen, the list goes back to every place). There is no "Any time": a chosen filter is tapped again to clear it, and with neither filter holding a place no time filter shows. | As built, before the modules (`views/section.js`). No lone "Any time": 21 Nov 2026 (seen on the pool house in the evening, "Any time 3" above three places). "Any time" gone: Yohann, 10 Nov 2026 (rule 22), built 21 Nov 2026 |
| 9 | Within the list: open now first, then opening later today, then the rest, each block in the guest's order. Under Open now and Opens later today, the places whose hours we do not hold stay in sight after the others, under a quiet line "Hours not known, check before going"; Any time keeps them among the closed. | Open now first: as built. The quiet line: "6d built", 11 Nov 2026 (`docs/plan-ca-la-kimberly-through-the-maker.md`, step 6) |
| 10 | A place open all day (`always`) counts as open now. A place with no hours of ours is "not known", unless it has a season of ours and today is outside it: then it is closed; or unless its kind has no hours by nature (`kinds.json` `"hours": false`: a beach, a town, a city; `schedule.js` `noHours`): then it counts as open, by day and at night, with no status in its row. It is counted under "Open now", stands with the open places, and is never under "Hours not known, check before going". A town with rows of hours follows them like any place. | As built (`views/section.js` `stateOf`); the season's part: "Places closed for the season", 11 to 12 Nov 2026 (plan). A kind with no hours: 21 Nov 2026, found by the Things to do conversation (Sitges and Barcelona stood under "Hours not known") |
| 11 | Quick-filter groups (Things to do: fun, beach, beach bars, sights, nature, wine) show when the list has two or more groups with a label (`engine/src/groups.json`), each in its tone; the groups' colours come from the colour world. | Groups: as built, before the modules. Only labelled groups: code comment. The colours from the world: Yohann, 10 Nov 2026 (plan, "The pins stay round") |
| 12 | Feature filters: only the ones some place of the list has; several at once keep the places that have all of them. Which ones a list offers goes by its kind (`plan.js` `listOf`): a list to eat (Eat and drink) offers Menú del día, Tasting menu, Dog friendly, Vegetarian; a list of things to do offers Great for kids, Dog friendly; a list of the night offers none (the Nightlife conversation, 17 Nov 2026: "Nightlife wants none for now"). A section may say its kind (`"list": "eat"`, `"todo"` or `"night"` in `sections.json`); without it Eat and drink and Nightlife are known by their id and every other list of places is a list of things to do. | As built, before the modules (`views/section.js` `FEATS`, `FEAT_SECS`). By the list's kind: 21 Nov 2026, round 3 of the ordered fixes (a list with another id, the generator's day trips, offered no filter) |
| 13 | A place closed for the season and opening in more than 30 days is not shown: not in the list, its counts, its chips, its map, the guide's map or Home. From 30 days before it opens its row says "Closed" and when it opens ("Closed, Expected from June" for an assumed season); in season with no hours of ours, a quiet "See hours" when Google's line can show. A place's season comes, in this order, from its own rows of hours when every row has dates, its own `season`, else the kind's assumed season (a beach bar, a water park: summer, 1 Jun to 30 Sep), never from Google. | Yohann, 11 to 12 Nov 2026 ("if a place is temporary closed, we just dont display it … we can assume it's a summer place … Not me having to add it manually"; plan, "Places closed for the season"). The rule itself is `engine/src/season.js`, shared |
| 14 | Opening hours a guest sees: ours when we may keep them (the place's own website, or the host), else Google's own live line, loaded by itself when the row opens, never stored, never read. Google's line asks only for a place with a Google id, no hours of ours, a door (not a beach, a town, a city), the browser key and a connection; our own "Google Maps" button then goes last and shows only once we know no line comes. | Yohann, 10 Nov 2026 ("a place's page always has opening hours, unless they exist nowhere"; "Google's card loads by itself, with no tap"); "1. No box, one line", Yohann, 11 Nov 2026 (plan, step 5). The rows that ask: `engine/src/gcard.js` (`wantsCard`) |
| 15 | A place's position that Google gave is kept 30 days; past that the place has no pin and no distance, stays in its list, with directions by its name. | `../CLAUDE.md` (Google's terms: "its position for 30 days"); code comment, 10 Nov 2026 (`content.js` `posExpired`, `located`) |
| 16 | A list that names a highlight (`"highlight"` in `sections.json`, Eat and drink's bar next door) shows that card on top of the page, wide, with no status, and left out with its season as on Home (`../highlights/`). The bar's pin is on Eat and drink's map in green. | As built, before the modules |
| 17 | Rows opened stay open when the page is drawn again (a filter, the status refreshed each minute), and the list's small map is kept as it is when neither the group nor the time filter changed. | Code comments since the first engine (11 Oct 2026) |
| 18 | A list whose every place is hidden today, or which has no place, says "Coming soon"; a filter that leaves nothing says "Nothing here right now. Try Any time." | "Coming soon": seen and left, 12 Nov 2026 (plan, "Places closed for the season", "Known and left"). The other: as built |
| 19 | The research and Find more: Spain only for now; a place gets its facts from sources we may keep (Overture's records near the pin, its own website read by Claude), never Google's details; Google only locates (its id for good, its position 30 days). | This repo's `CLAUDE.md` (Product rules: Research; "Stable and credited"; `../CLAUDE.md`, "Respect the terms"); plan, "Where a place's facts may come from", 10 Nov 2026 |
| 20 | The list's entry tile on Home has no live line: its title (21 px when a wide tile's title is longer than 20 characters, "Our favourite places to eat") and its arrow. | As built; the 21 px title: Yohann, 14 Nov 2026 (`../README.md`, frame rule 4) |
| 21 | A night goes on after midnight: a row of hours that closes after midnight belongs to the evening it started. The place is open from its opening time to its closing time the next morning, whatever the next day's own rows say ("Open until 5:00" on Sunday at 1:30 for Fri, Sat 23:30 to 05:00; with "Reopens at 19:00" when it opens again that day), and the day that started it decides its season and its week of the month. A close at 00:00 and a market's morning are never carried on. The day's own rows are unchanged (`runsOn`: which markets are held today, a day's hours); only the status follows the night (`schedule.js` `lateFrom`), so the white cards of Home, a contact and a market with such hours follow it too. | Found by the Nightlife conversation, 16 Nov 2026 (a club read "Closed" at 1:30); built 21 Nov 2026 in round 3 of the ordered fixes, from its patch |
| 22 | Quiet filters: a chip has no outline, it is a soft patch of the page colour (`--ink-soft`), and only the chosen one takes colour: its group's tone, ink for a feature, green for "Open now" (as "Open until" in the rows), blue for "Opens later today". The time and feature filters are one group. The distance is a small switch of the same patch, the chosen side in white (`lists.js` `sortRow`, `small`); the Markets page keeps its own pills. Every chip and each side of the switch is 44 px high (`docs/UX-GUIDELINES.md`). A chip's words are short enough for two chips to a row at 360 px in the six languages, with the largest counts a list can show (Things to do: two rows of groups, two of filters, the first place at the same height in every language); a longer word is shortened, the type is not made smaller. | Yohann, 10 Nov 2026 ("yes, go this way", on mock-ups in three worlds; "Open now" stays green: plan, "What bothers Yohann on the list pages is the filter chips"); built 21 Nov 2026, once for the three lists; two chips to a row in every language: 21 Nov 2026, measured by the Things to do conversation (French took four rows) |
| 23 | The closed row says why to go: two lines of the host's own words under the place's line (the opened row says them in full), and the town beside the kind, unless the kind or the name already holds it (Ca La Kimberly's kinds do: "Ham bar & grill, El Vendrell"). | 21 Nov 2026, round 3 of the ordered fixes (`docs/CURATION.md`: every place has a one-line reason, which showed only after a tap; a maker-built row said "Pizza" with no town) |
| 24 | Nothing stands at the right of a place's words: the name has the row's width beside the arrow; under it two lines, the kind and the town, then the distance and the price, a dot between two pieces of one line and never at a line's start or end, a distance and a price kept whole (two lines and no hanging dot: 21 Nov 2026, evening, after the Nightlife conversation's look); then the status on a line of its own, its text and its time side by side ("Closed · Opens at 20:00"). Only the lists of places draw a row this way (`ui.js` `row`, `words: true`); Markets, Rubbish and the map's list keep the row they had. | 21 Nov 2026: measured by the Things to do conversation on 16 Nov (German at 360 px: "Rund um die Uhr" took a third of the row and the place's line broke into five short lines) |
| 25 | The words of an opened row are never hyphenated by the browser: a line wraps between words or at a soft hyphen of the content, and a word wider than its line wraps as a last resort. The rule is the opened row's (`.mbody .note`, `.mbody .hnote` in `app.css`), so a market's, an event's and a stop's opened row follow it too. | Yohann's rule for every project (`../CLAUDE.md`, UX: "no word breaks mid-word"); asked by the main conversation, 21 Nov 2026, after Home (frame rule 14) and the Nightlife conversation's look ("Ne-" / "groni") |

## Its data

One file per list, `content/<section id>.json` (`restaurants.json`, `todo.json`, `nightlife.json`; their `_doc` describes
them; a section may name another file with `"file"`). Each place: `id`, `name` (six languages), `type` (its kind in
words), `icon` (its kind: `engine/src/kinds.json`), `group` (Things to do's quick filter) and `tone`, `town`, `place`
(the address), `lat`, `lng`, `km_from_house` (by road), `description`, `tags` (marks: `dogs`, `veggie`, `kidsfun`, `free`,
`summer`, `allyear`, ...), `flags`, `phone`, `url`, `wiki`, `gid` (Google's id, kept for good), `gmaps`, `schedule` (rows
`{ days, open, close }`, with a season `from`, `to`) or `always`, `hours` (a note under the hours), `season` (MM-DD, for a
place with no schedule), `price`, `priceNote`, `setMenus` (`menuDia`, `tasting...`), `topPick`. A position Google gave
carries `pos: { from: 'google', at }`; what the worker filled carries `filled`.

Read once by `content.js` with this module's `readSpots` (`plan.js`), together with every other section's list of items
(the glass container of rubbish), which the map shares: each becomes a place of kind `spot`, its id prefixed by its
section's (`restaurants-locanda`), its schedule read as slots (`s`), the places of other sections marked `utility`.

Where it comes from: the host (typed in the builder, swiped yes in the deck, added in the editor), the area research and
Find more (`worker/`), with each place's facts from `place_facts` (Overture and its own website) and its hours read again
weekly while it has none (`worker/reread-places.mjs`). Ca La Kimberly's lists were written by hand
(`sites/ca-la-kimberly/docs/sources.json`).

## Its look

The page, top to bottom: the title and its lead; the highlight on top when the section names one; the small map of the
list (a tap opens the full map on this list's tab); the quick-filter groups; one group of quiet chips for the time filters (Open now, green when chosen, Opens later
today, blue, each with its count) and the feature filters; the small switch From the house or From me; the rows
(`ui.js` `row` with `words`: the kind's icon and colour, the name, two lines (kind and town, distances and price), the status or
"See hours" on its own line, two lines of the host's words;
opened: where, the season, Google's line or our hours, the description, Directions, Google Maps, On the map, Call,
Website, Wikipedia); "Hours not known, check before going" before the places with no hours of ours under a time filter.

On Home, the entry tile in any of the three sizes (half, wide, tall; `../README.md`). Its colour and icon are by the
section's id (`ui.js` `SECTION_LOOK`: `restaurants`, `todo`, `nightlife`, and the generator's ids); a list with another id
takes Things to do's.

## In the maker: the found places of Things to do

Rules of the host's side that are this module's own (the deck, "Found near you", Find more); numbered after the
list's rules above.

| # | Rule | Decided |
|---|---|---|
| 25 | A found place is read by the host in the language they use the maker in (the deck before the build, "Found near you" on the ready screen, Find more in the editor): its own words when we hold them in that language, else its kind's name from `engine/src/kinds.json` by its icon, else as the guide shows it. Its description and its kind in words are translated once at the research into Spanish, French and Catalan (`worker/card-words.mjs`: one question for all the cards, well under 0.01 USD a house, Yohann's yes of 21 Nov 2026; the English stays on any error) and come into the card in hand when they arrive; its name stays as the research wrote it, the deck's and the generator's key. No paid call is made for a single card. A distance, a rating and a count are written as that language writes numbers ("10,6 km"; `numUI`, `onboarding-site/src/start.js`). Google's cards are asked in the maker's language. | Yohann, 21 Nov 2026 (through the main conversation: a suggestion in English and "a 10.6 km" on a Catalan screen) |
| 26 | The deck's wait shows the card's place at once and its words ("Looking for places near you…") only after 0.7 s; nothing says "best-rated". | Things to do's report, fix 8 (16 Nov 2026); built 21 Nov 2026 on "nothing waits for the host" (Yohann, 12 Nov 2026) |

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested | `plan.js` (tests: `engine/scripts/places-plan.test.mjs`) | Yes |
| The places of a list, shown today, and its map's pins | `data.js` | Yes |
| The page | `page.js` | Yes |
| The Home widget | `widget.js` | Yes |
| What it offers on Home: its entry tile in half, wide and tall | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home and the section view call | `index.js`, listed in `../index.js` as `spots` | Yes |
| Reading the lists | Called from `engine/src/content.js` (`SPOTS`, with `MAP_ITEMS`, `MAP_CATS`, `mapItems`, which the map and rubbish's page import) | The code is; the names stay there |
| The order and the choice of distance | `engine/src/lists.js` (`byDistance`, `sorted`, `sortRow`; tests: `engine/scripts/lists.test.mjs`) | No: shared with markets |
| A page's title, lead, opened rows kept, the row a Home shortcut asks for | `engine/src/views/section.js` (`sectionFrame`) | No: shared with every section's page |
| The filters' taps, the guest's choices | `engine/src/main.js` (`data-sgroup`, `data-featf`, `data-openf`, `data-sort`), `engine/src/state.js` (`sgroup`, `featf`, `openf`, `sort`) | Not yet |
| A row, hours, statuses, a place's season | `engine/src/ui.js` (`row`), `schedule.js`, `season.js` (shared with the maker, which pastes it, and the worker), `kinds.json`, `groups.json` | No: shared machinery |
| Google's live line | `engine/src/gcard.js` (`wantsCard`: every row of these lists asks, with `gcard: true`; checked by `engine/scripts/gcard-check.mjs`) | No: shared |
| The map's tabs and pins of these lists, the small map | `../map/` (`view.js`: `tabOf`, `overviewMap`) | No: the map's module |
| Its styles | `engine/src/styles/app.css` (`.gchips`, `.gchip`, `.ochips`, `.mgh`, `.secmap`, `.pl-map-cta`, `.mlist`, `.mrow`, `.empty`, `.gt[data-k="restaurants"]`, `[data-k="todo"]`, `[data-k="nightlife"]`, the groups' tones) | Not yet: they move with the one tile system (plan, proposal 4), so the look is touched once |
| Its words | `engine/src/i18n/<lang>.json`: `barsRestaurants`, `whatToDo`, `nightlife` and their `...Lead`, `f_anyTime`, `f_openNow`, `f_openLater`, `f_noHours`, `f_noneOpen`, `ff_<feature>`, `g_<group>`, `t_<tag>`, `f_<flag>`, `soon`, `openMap`, `seeHours` | Not yet |
| From the host's answers to the files | `engine/scripts/generate-site.py` | Not yet |
| The research, Find more, a place's facts, the weekly reading, the monthly check | `worker/research-brief.mjs`, `worker/guide-worker.mjs` (`find-todo`), `worker/place-facts.mjs`, `worker/place-job.mjs`, `worker/host-places.mjs`, `worker/reread-places.mjs`, `worker/check-guides.mjs` | No: the worker's |
| The maker's steps (the deck, Eat and drink, Nightlife, the place card, "Show on the home page") | `onboarding-site/src/start.js`, `editor.js` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The bar's green pin on the map is drawn only on the list whose id is `restaurants`, for the card whose id is `shop`
  (`page.js`, `../highlights/widget.js` `mapPin`), and the map's own copy of that card is built in `content.js` (`QSHOP`).
- The tile's colour and icon are known by the section's id (`SECTION_LOOK`), as markets' are.
- The leads under Eat and drink and Things to do are hand-written words (`i18n`), which no maker step writes (plan, D1).
