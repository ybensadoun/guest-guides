# Highlights (module `highlights`, placement kind `highlight`)

The white cards on Home of one place each, with its live status: in Ca La Kimberly the bar and shop next door and the
pizzeria that delivers (`content/quick.json`). Each opens the place's own page (`#p/<id>`): where it is, what it is, when
it is open, then call, get directions or open its website. A list may also show one of them on top of its page (Eat and
drink shows the bar). Getting around's card ("Taxi & train") is drawn the same way when transport.json has a `tile`: Home
hands it over like the others, but its data and its page stay Getting around's (not moved now).

The widget Yohann named when the modules were agreed in words (13 Nov 2026): "some module might have two different types
of widget, like places to eat", the entry into the list and one that highlights a single restaurant
(`docs/plan-ca-la-kimberly-through-the-maker.md`, "Modules and widgets, the picture agreed in words"). Read this page
before changing how the cards behave, and write a changed rule here with its date. Ca La Kimberly's two cards and their
pages are the reference: the move into this folder (14 Nov 2026) was checked pixel for pixel and byte for byte.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | A highlight is one thing of a module with its live status, a white card, half or wide (its own `wide` gives its default size); never tall. | Yohann, 14 Nov 2026 (proposal 22: "a highlight: Half or Wide"; `../README.md`) |
| 2 | Its status: a card with opening hours says whether it is open now, else "Closed" with when it opens; a card with a season of ours and no hours says only "Closed · Opens 1 Jun" out of season, as its page and the lists do; nothing in season, nor for a card with neither. | As built (`views/home.js` `qStatus`); the season's part: "Places closed for the season", 11 to 12 Nov 2026 (plan) |
| 3 | A card closed for the season and opening in more than 30 days is left out of Home and of the list it sits on top of (a card is read as a place: its rows of hours, its season, its tags); its page still opens. | Yohann, 11 to 12 Nov 2026 (plan, "Places closed for the season"); `../README.md` frame rule 10 |
| 4 | Its icon: the card's `icon` (taxi, train, bus, food, shop, pizza, todo, nightlife), else its id or the id's first part ("taxi-2"), else the shop's. `todo` (the star) and `nightlife` (the moon) are Things to do's and Nightlife's own drawings, for a place of those lists shown on the home page. | As built (`views/home.js` `quickIcon`); todo and nightlife: Claude, 15 Nov 2026, with the maker's Home page step (a place to do something had the shop's cup) |
| 5 | Its page: the name, its kind, the distance from the house (a short walk under 0.8 km, else by road, the straight line × 1.3) and from the guest; a small map that opens Google Maps (no button on the map: it hid its names); Call, Directions, Google Maps, Website; what it is; the opening hours with today's status, a note and the price; other numbers to call. | Code comments, before the modules (`views/place.js`) |
| 6 | A card with no position yet (0, 0, new in the editor) has no map and no distance and keeps its own map link; one whose Google position ran out (30 days) has none either, with directions by its name. | `../CLAUDE.md` (Google's terms: "its position for 30 days"); code comments (`views/place.js`) |
| 7 | Opening hours on its page: ours when we hold them, else Google's own live line where the hours would be, loaded by itself, shown only once it has something to say, never stored; our own "Google Maps" button then goes last, kept back until we know no line comes. A page that has its hours block (a note, a price) keeps it and gets the line under it. | Yohann, 10 Nov 2026 ("a place's page always has opening hours, unless they exist nowhere"; "Google's card loads by itself, with no tap"; plan, step 5). The card: `engine/src/gcard.js` |
| 8 | An old guide's taxi card with `trains` opens Getting around's page; `#p/taxi` in a guide that has Getting around goes there; an unknown card goes Home. | Code comments (`views/place.js`): "the old taxi tile now lives in Getting around" |
| 9 | A list that names a card (`"highlight"` in `sections.json`) shows it on top of its page, wide, with no status; its page link is `#p/<id>`. | As built (`views/section.js`) |
| 10 | The bar next door's pin is on the map under Eat and drink, and on Eat and drink's map in green. | As built (`content.js` `QSHOP`, `views/section.js`) |
| 11 | Hosts make a card with "Show on the home page" on a place of Eat and drink, or from the maker's step Home page ("Add to your home page": a place to eat, something to do, Nightlife, a place in none of the lists, Getting around's card), and change its words there. Its size and its place are the arranger's (`../README.md`, "The arranger (maker)"): a card has no "wide" field of its own in the maker. A card on top of Eat and drink is still the plan's gap D11. | `onboarding-site/src/editor.js` (`cPinned`, `cmPin`), `onboarding-site/src/board.js`; plan, D11; the arranger, Yohann, 15 Nov 2026 |

## Its data

One file per guide, `content/quick.json` (its `_doc` describes it), switched off with `"modules": { "quick": false }`.
Each card: `id` (picks the icon: shop, pizza, taxi), `name` (the card's title) and `sub` (its line) in six languages,
`title` (the page's title, the real name), `kind` (its kind in words), `what` (its description), `lat`, `lng`, `map` or
`gmaps`, `gid`, `phone`, `alt` (other numbers), `schedule` or `always`, `hours` (a note), `price`, `priceNote`, `web`,
`wide`, `season`, `icon`, `verify`. A position Google gave carries `pos: { from: 'google', at }`.

Read once by `content.js` (`QUICK_ALL`; `QUICK` adds Getting around's card, `{ id, href, icon, name, sub, wide }`, when
transport.json has a `tile`), which keeps the names because the map shares the bar (`QSHOP`) and Getting around its card.
Where it comes from: the host ("Show on the home page" on a place in the maker); Ca La Kimberly's was written by hand.

## Its look

On Home, a run of cards is one `.qcalls` block between the tiles; each card: its icon on the left, the name, its line,
the status (`.qst open` or `.qst closed`), the size class (`s-half`, `s-wide`, with `wide`). On a list, the same card,
wide, without the status. The page: the icon and the title with its kind and distances, the small map, the actions, the
description, "Opening hours" (status, the week, the note, the price, or Google's line), "Also call".

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested | `plan.js` (tests: `engine/scripts/highlights-plan.test.mjs`) | Yes |
| The cards and the ones shown today | `data.js` | Yes |
| The icons | `icons.js` | Yes |
| The card on Home, on a list, its pin on a list's map | `widget.js` (`card`, `pageCard`, `mapPin`) | Yes |
| A card's own page | `page.js` | Yes |
| What it offers on Home: a highlight, half or wide | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home, the router, the lists and Getting around call | `index.js`, listed in `../index.js` as `highlight` | Yes |
| Reading the file, Getting around's card, the bar on the map | `engine/src/content.js` (`QUICK_ALL`, `QUICK`, `QSHOP`, `TRANSPORT_CARD`) | No: shared with the map and transport |
| Getting around's page, also an old taxi card's | `../transport/` (`renderTransport`, `transportOf`) | No: Getting around's module |
| The route `#p/<id>` | `engine/src/main.js` | Not yet |
| Hours, statuses, seasons | `engine/src/schedule.js`, `season.js` | No: shared machinery |
| Google's live line | `engine/src/gcard.js` (`wantsCard`, `sectionHTML`, `slotHTML`) | No: shared |
| Its styles | `engine/src/styles/app.css` (`.qcalls`, `.qcall`, `.qi`, `.qt`, `.qst`, `.place`, `.pl-head`, `.pl-dist`, `.pl-map`, `.pl-actions`, `.pl-what`, `.pl-sec`, `.pl-hours`, `.pl-alt`) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `hoursLabel`, `open24`, `perPerson`, `alsoCall`, `callNow`, `directions`, `openInMaps`, `website`, `fromHouseShort`, `fromYouShort`, `minWalk` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` | Not yet |
| The maker's step Home page (the arranger) and "Show on the home page" | `onboarding-site/src/board.js`, `editor.js`, `start.js` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The bar on the map is known by the card's id `shop`, placed under the section `restaurants`, named after the house, at
  0.1 km, with a mug icon (`content.js` `QSHOP`); its green pin on Eat and drink's map likewise (`../places/page.js`).
- The six icons were drawn for Ca La Kimberly's cards and Getting around; any other card takes the shop's.
- A list shows a card on top of its page only when `sections.json` names it (`"highlight": "shop"` on Eat and drink).
- `content.js` once said "Items without a phone are hidden"; nothing in the code hides a card without a phone (the comment
  was dropped in the move, 14 Nov 2026).
