# Markets (module `markets`)

The local markets around the house: weekly street markets, market halls, flea and antiques markets, swap markets and
yearly fairs. A guest sees which are held today and on the next days, nearest first, with their hours, and opens one on
the map or in Google Maps. On Home it is one widget, the entry tile with the day's count ("7 today", in the evening
"9 tomorrow"); it also feeds What's on at the bottom of Home (`../whatson/README.md`, through `agenda.js`).

The second part of the guide kept as a module of its own, after rubbish. Markets were Yohann's first example of a module
(13 Nov 2026: "market, which is a module of itself, it has its own rule, its own databases, its own look and feel. It has
its own version of what we might call a widget on the homepage"). Read this page before changing how the module
behaves, and write a changed rule here with its date. Ca La Kimberly's Markets page and tile are the reference: the move
into this folder (14 Nov 2026) was checked pixel for pixel, before and after.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | A market is one entry of `content/markets.json`, of one kind (`category`): `covered` (a market hall), `street` (a street market), `flea`, `antiques` (antiques, brocante, crafts), `events` (swap markets and yearly fairs). The guide offers only the kinds that have at least one market. | The kinds: Ca La Kimberly's research notes, Oct 2026 (`sites/ca-la-kimberly/docs/RESEARCH-NOTES.md`, "Decisions already made"), and the research's own rule (`worker/research-brief.mjs`, `MARKETS_SHAPE`: "category must be one of: covered, street, flea, antiques, events"). Only the kinds with a market: as built, before the modules |
| 2 | Home counts and shows the day's markets of the default kinds, every kind but the market halls, whatever filters were set on the Markets page. Its links into Markets (the tile, "+ 3 more markets today", "All markets", a day of What's on) reset the page's filters to the default, so the list they open matches the count. Since 19 Nov 2026 the day the tile counts is the next day with a market to go to: today while one of its markets is on or still to come ("7 today", every market held today); once today's are all over, or on a day with none, the next day of the strip that has one ("9 tomorrow", "3 on Wednesday", past six days "2 · 30 Nov"), and the tile and "All markets" open that day; no count when the next 14 days have none. "+ 3 more markets today" still opens today. One rule, `plan.js` `nextMarketDay`. | The halls left out: Ca La Kimberly's research notes, Oct 2026 ("Covered municipal markets are excluded from the home page 'N today' count, because they open every weekday"). The rest: code comments since the first engine (11 Oct 2026; `state.js`, `main.js`). The next day: Yohann, 17 Nov 2026, by recommendation (`03.2` of the order of fixes: "in the evening the markets tile says tomorrow's count"), after the live guide said "2 today" at 21:15 over two markets long closed |
| 3 | The page has two views: By day, a strip of the next 14 days as real dates (so a market held on the 2nd Saturday shows only on that date), today first, with the day's count under each day; and All, every market. The filters (kinds, distance from the house or from me) fold away so the list starts high on the screen; their button carries the number of settings that differ from the default (the default kinds, from the house). | Code comments since the first engine (11 Oct 2026) |
| 4 | A tap on a kind's chip, when every kind is on, keeps only that kind; otherwise it switches that kind; turning the last one off turns every kind back on. A filter that leaves nothing shows a visible box, with "Show all types" when some kinds are off. A day with no market is not the filters' doing and never says so (19 Nov 2026): its box says "No markets today." (another day: "No markets on this day.") with one button to the next day of the strip that has one, counted with the kinds shown ("Tomorrow · 3 markets"); when only the market halls are held that day, which the page leaves out until asked, "Only covered markets are open." with "Show all types" first; the filters' box only after the guest's own filters hid that day's markets. | Code comments since the first engine ("Chip toggling rule from the prototype", `state.js` `toggleIn`). The empty day: `03.1` of the order of fixes, Yohann's "Go" of 17 Nov 2026, after the pool house said "No markets match these filters." on a Monday with no market |
| 5 | Order: nearest first, by road from the house, or from the guest when they chose "From me" and their position is known; a market with no distance known last; then by town. The lists of the host's places (Eat and drink, Things to do, Nightlife: `../places/`) use the same order and the same choice, one rule for both (`engine/src/lists.js`, since 14 Nov 2026). | Code comments: the order since the first engine; "no distance known: last" since 28 Oct 2026 |
| 6 | Hours: in By day, today's rows say whether the market is on now, later or finished: a market held earlier today reads "Finished", quiet, with when it is next held ("Opens 23 Nov"), never "Closed" in red as a shop out of its hours (19 Nov 2026, `data.js` `statusNow`; the same on its row in What's on); another day's rows give that day's hours; All gives every row's days and hours. A market whose only known hours are "the morning" says "Morning". | As built, before the modules (`ui.js` `row`, `schedule.js`); "Finished": with rule 2's next day, 19 Nov 2026 (the rule said "finished", the code said "Closed") |
| 7 | "Check before going": the page always ends with "Markets skip public holidays and village markets can change. We recommend checking online on the day before you go". A market whose days and hours no official or recent source gives, or whose sources disagree, carries the flag "check" ("Check before going"); one known only from an old source, "older" ("Based on older information"). The word "expected" itself is not used on this page. | `../CLAUDE.md` ("Say 'expected' for anything not confirmed"); this repo's `CLAUDE.md`, Product rules, Research ("flag hours that are not confirmed"); Ca La Kimberly's research notes, Oct 2026 ("Don't tell guests to contact the hosts; tell them to check online on the day"); the flag's rule: `worker/research-brief.mjs` `HOURS_RULE` |
| 8 | A guide whose file lists no market has no markets module: no tile, no page, no map pins, no market in What's on and no "All markets" link. | Code comment, 21 Oct 2026 (`content.js` `MODULE_ON`: "markets with nothing found vanish too, no dead-end tile"); the generator also leaves the module off without a markets file (`engine/scripts/generate-site.py`) |
| 9 | The markets tile is drawn whatever the section's status, opens the list of the day it counts (`#markets/today`, or `#markets/day/<n>` once today's markets are over: rule 2), and is always live. | As built, before the modules (`views/home.js`); written in the frame on 14 Nov 2026 (`../frame.js`: "markets have their own tile, whatever their status") |
| 10 | Where a market's hours may come from: the area research (the official website first, the venue, the operator, the town hall or its tourist office, then recent local press; written as rows, a monthly or yearly date in words), and the host in the editor. Never Google: since 12 Nov 2026 no script asks Google whether a place exists or when it opens. The weekly reading of websites (`worker/reread-places.mjs`) reads only the host's lists, not the markets; the monthly check looks for a market's own website only (`worker/check-guides.mjs`). | The research's rule: `worker/research-brief.mjs` `HOURS_RULE`. Google: `../CLAUDE.md` ("Since 12 Nov 2026 no script asks Google whether a place exists or when it opens"), Yohann, 12 Nov 2026, decision 6.1 of `docs/plan-ca-la-kimberly-through-the-maker.md` ("why not go for the real thing, and mark this as done?") |
| 11 | Google's own live line (`gcard.js`) on a market's row: only a street market or a market hall, with a Google id and no hours of ours, asks for it when its row opens; a fair, a flea or antiques market never does. Google's line gives a place's weekly hours, and a fair's id can be its town's weekly market's. In the code a market listed on a day always has hours, so the line can only come in All. | Yohann, 13 Nov 2026: "Both checks", the guest's line first ("Markets, Yohann's choice"); limited to the weekly kinds the same day, after two wrong lines on the live guide ("Markets, seen on the live guide after the push (13 Nov 2026, 9:15), and corrected"). Both in `docs/plan-ca-la-kimberly-through-the-maker.md` |
| 12 | A market Google marks permanently closed: the guide never reads Google's answer (Google's card is shown to the guest, inside Google's own element). A market with a Google id enters a guide the maker builds only after the host's maker has asked Google about it live: permanently closed, it never enters, and the host is told once, with "Google Maps" in the sentence. A market suggested by Find more that Google calls permanently closed cannot be added. When a market turns permanently closed later, nothing removes it: asked by Yohann on 13 Nov 2026, not built (Google's status may be shown to a person, not used by a script). | Yohann, 13 Nov 2026: "Hold them back" ("The second check, chosen and built"); Find more: decided 12 Nov 2026 ("Markets and Google, the code read against what was decided", 13 Nov 2026); the later closing: "Markets, Yohann's choice (13 Nov 2026)". All in `docs/plan-ca-la-kimberly-through-the-maker.md` |
| 13 | The markets the build holds back: every market with a Google id leaves the built guide and waits in a job of its own; the host's maker puts the others in the guide (the live guide, and the draft when there is one) in one write, once, on any device. Until the host's maker has opened, a guide shows only its markets without a Google id. This is the worker's and the maker's code, not the guide's (see "Where its code is"). | Yohann, 13 Nov 2026: "Hold them back" (`docs/plan-ca-la-kimberly-through-the-maker.md`, "The second check, chosen and built") |
| 14 | The week of the month: a row may be held on the 1st to 4th of its weekday in the month, or the last (that weekday with no other after it, so in a month with five Sundays the 4th is not the last). One rule, `engine/src/weeks.js`, shared by the guide and the maker. | Built 11 Nov 2026, decisions with Yohann ("6d built", `docs/plan-ca-la-kimberly-through-the-maker.md`) |
| 15 | A row may carry a season (`from`, `to` as MM-DD): it is held only inside it. A market is never hidden as "closed for the season" the way a place of the host's lists is: its own rows say its days. | Rows with a season: as built, before the modules (`schedule.js`). Never hidden: code comment, 11 Nov 2026 (`content.js`: "Markets have no season of this kind") |
| 16 | A market's position that Google gave is kept 30 days; past that the market has no pin and no distance and stays in its list, with directions by its name. | `../CLAUDE.md` (Google's terms: "its position for 30 days"); code comment, 10 Nov 2026 (`content.js` `posExpired`, `located`) |
| 17 | Markets are worth a guest's time because they are local and easy to miss ("the local weekly markets"), and every market must still exist: a source under 2 years old or a live Google Maps listing that is not closed (Santa Oliva, Oct 2026: guests found no market). | `docs/CURATION.md` (18 Oct 2026); `../CLAUDE.md` and `../PROJECTS.md` ("Data accuracy") |
| 18 | The research: Spain only for now, at least 4 markets, nearest first, hours not confirmed flagged; a market needs a position (the market square or the town's centre when no source gives the spot). | This repo's `CLAUDE.md`, Product rules, Research; the position: code of the research, 21 Oct 2026 (`worker/research-brief.mjs` `MARKETS_SHAPE`) |
| 19 | Rows opened stay open when the page is drawn again (a filter, the status refreshed each minute), and the small map of the markets listed is kept as it is when only the status changes. | Code comments since the first engine (11 Oct 2026) |

## Its data

One file per guide, `content/markets.json` (its `_doc` describes it: the names follow one pattern, place and kind):

- `categories`: the kinds the guide may offer, in their order on the page's chips.
- `markets`: each market with `id`, `category`, `name` in six languages (the title on its row), `name_local` (its name as
  Google Maps lists it), `town`, `comarca`, `place`, `group` (groups the map's pins instead of the town),
  `km_from_house` (by road), `lat`, `lng`, `gid` (Google's id, kept for good) and `gmaps`, `stalls_approx`, `schedule`
  (rows `{ days, open, close }`, with `week_of_month` 1 to 4 or -1, `hours_approximate_morning`, a season `from`, `to`),
  `occasional_when` (a date in words when it is not weekly), `tags`, `flags` (`engine/src/flags.json`), `description`.
  A position Google gave carries `pos: { from: 'google', at }`.
- In a guide the maker builds: `held` (the job that holds the markets with a Google id) and `heldDone` (that job handled).

Read once by `content.js` with this module's `readMarkets` (`plan.js`): each market becomes a place of kind `market`, its
kind in `cat`, its distance in `km`, its rows read as slots (`s`). Where it comes from: the area research (worker), Find
more's market search, the host's own additions in the editor; Ca La Kimberly's was written by hand from the sources in
`sites/ca-la-kimberly/docs/RESEARCH-NOTES.md` and `docs/sources.json`.

## Its look

The page, top to bottom: the title; By day or All, and the Filters button with its badge; the folded filters (the kinds as
chips in their colours, then From the house or From me); in By day the strip of 14 days; the small map of the markets
listed (a tap opens the full map on Markets); the day's heading; the rows (`ui.js` `row`: the kind's icon and colour, the
name, the kind and the distances, the status or the hours; opened: where, the hours, the description, Directions, Google
Maps, On the map); the foot line on public holidays and checking online.

On Home, the entry tile in any of the three sizes (half, wide, tall; `../README.md`), with "7 today" or the next day's count (rule 2). Its shapes are the
red circle and the yellow square (`.gt[data-k="markets"]`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested (the kinds, the markets of a day, over for today, the next day with a market) | `plan.js` (tests: `engine/scripts/markets-data.test.mjs`) | Yes |
| The guide's data and what Home and the page ask of it (today's markets, the day Home leads to, a market's status today) | `data.js` | Yes |
| What it gives What's on (today's rows, a day's, the monthly ones, the link) | `agenda.js` (the feed: `../whatson/README.md`) | Yes |
| The page | `page.js` | Yes |
| The order and the choice of distance (`byDistance`, `sorted`, `sortRow`) | `engine/src/lists.js` (tests: `engine/scripts/lists.test.mjs`) | No: shared with the host's lists of places (14 Nov 2026) |
| The Home widget | `widget.js` | Yes |
| What it offers on Home | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home, the router and the section view call | `index.js`, listed in `../index.js` | Yes |
| Reading the file, the kinds offered, the default kinds | Called from `engine/src/content.js` (`MARKETS`, `CATS`, `MODULE_ON`) and `engine/src/state.js` (`DEFAULT_CATS`), which keep the names the map and the router import | The code is; the names stay there |
| The routes `#markets`, `#markets/today`, `#markets/day/<n>`, the filters' taps, the reset from Home | `engine/src/main.js` | Not yet |
| The tile's link and label (the day's list, "Markets") | `widget.js` (`label`, `href`, since 14 Nov 2026; Home draws a widget's own link whatever the section's status) | Yes |
| The tile's status exception (placed whatever the section's status) | `../frame.js` (`shown`) | Not yet |
| What it gives What's on: today's markets, a day's with their hours, the monthly ones coming up, a market's row there | `agenda.js` (17 Nov 2026; the feed: `../whatson/README.md`) | Yes |
| What's on, fed by this module | `../whatson/` | A module of its own, which names no module |
| The map's Markets tab and "Open today only" | `../map/view.js` (`tabOf`, `MAP_TABS`) | No: the map's module |
| A row, hours, statuses, the week of the month | `engine/src/ui.js` (`row`, `chips`), `schedule.js`, `weeks.js` | No: shared machinery |
| Google's live line | `engine/src/gcard.js` (`wantsCard`); the kinds that ask: `plan.js` `WEEKLY` | The kinds are; the card is shared |
| Its styles | `engine/src/styles/app.css` (`.mk-top`, `.daybar`, `.dchip`, `.filters`, `.filt`, `.nbadge`, `.sortnote`, `.emptybox`, `.st.closed.over`, `.mkmapbox`, `.gt[data-k="markets"]`, the kinds' colours `--c-covered`, `--c-street`, `--c-flea`, `--c-antiques`, `--c-events`) | Not yet: they move with the one tile system (plan, proposal 4), so the look is touched once |
| Its words | `engine/src/i18n/<lang>.json`: `markets`, `mkTomorrow`, `mkOnDay`, `mkNoneToday`, `mkNoneDay`, `mkOnlyHalls`, `nMarkets`, `nMarket1`, `done`, `mkLead`, `foot`, `cat_<kind>`, `vWeek`, `vAll`, `filters`, `noneMatch`, `showAllTypes`, `fromHouse`, `fromMe`, `openToday`, `today`, `tomorrow`, `f_check`, `f_older`, `morning` | Not yet |
| The research of an area's markets, the position on Google, the loose match for weekly markets | `worker/research-brief.mjs` (`MARKETS_RULE`, `HOURS_RULE`), `worker/guide-worker.mjs` (`mergeQuick`, `reachCut`), `worker/research-check.mjs` (`WEEKLY_MARKET`), `worker/places.mjs` (`sameMarket`) | No: the worker's |
| The build holding markets back | `worker/guide-worker.mjs` (`holdBack`), `worker/research-brief.mjs` (`holdMarkets`) | No: the worker's |
| The monthly check of a market | `worker/check-guides.mjs` (its own website only) | No: the worker's |
| From the research to the file | `engine/scripts/generate-site.py` (`fix_markets`, the module switched off without a file) | Not yet |
| The maker's step Local markets, the held markets asked live, Find more | `onboarding-site/src/editor.js` (`cmHeld`, the step `markets`, `FIND_OF`) | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The decisions on kinds and on Home's count (halls left out) are written in Ca La Kimberly's own research notes, not in
  a rule of the product; the `_doc` of its file points there.
- The tile, its look and its route are known by the section's id `markets`, not by its kind (`SECTION_LOOK.markets`,
  `.gt[data-k="markets"]`, `#markets`, the label `markets`): a guide whose markets section had another id would lose them.
- Ca La Kimberly's markets have no `gid` hold-back and no `held`: its file was written by hand, before the build held
  markets back; 36 of its 44 markets carry a Google id, and none of its weekly markets lacks hours, so Google's line never
  shows on its Markets page today.
