# Getting around (module `transport`)

How to get about without a car of one's own: in Ca La Kimberly the taxis first, then the train stations, each with how
long it takes by car, the lines that stop there and the journey times, and a small map of the stations. Each row opened
gives the details, the call button or the directions. On Home it has two widgets: its entry tile, and its card ("Taxi &
train", `transport.json` `tile`), a white card that the highlights module draws as one of its own (`../highlights/`);
with a card, the section is not also a tile.

Moved into this folder on 14 Nov 2026 with the text pages, Emergencies, the house and the map (the module frame, part 2,
`../README.md`). Read this page before changing how Getting around behaves, and write a changed rule here with its date.
Ca La Kimberly's page and its card are the reference: the move was checked pixel for pixel and byte for byte.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Every option is visible on the first screen as a row (what, how long, the verdict); a tap opens the details, the call button or the directions. Taxis first, then stations and stops by kind (trains, then buses), each kind under its heading. | Code comment, before the modules (`views/place.js`) |
| 2 | The small map of the stations sits under the first kind's heading, above its rows, when a station has a pin. | As built. The code comment says "the stations map last": the code and the comment disagree; the code is kept |
| 3 | A station never placed (0, 0, new in the editor) is left out; one whose Google position ran out (30 days) stays in the list, off the map, with directions by its name. | Code comment, before the modules; `../CLAUDE.md` (Google's terms: "its position for 30 days") |
| 4 | A station's lines are badges in their colours (Rodalies lines; long-distance trains in one colour); a line with no name is left out, since the editor's "Add a line" starts one empty. | Code comment, before the modules |
| 5 | Journey times in two columns, so the destinations keep their width on a phone, the note ("1 change") under its destination. | Code comment, before the modules |
| 6 | A station: Directions; "Google Maps" only with a Google id or a Google Maps link of its own; its timetable link. A taxi: "Call now" with its number, then its other numbers; "Open 24 h" when it is. | As built, before the modules |
| 7 | A station keeps the host's name for it; its position comes as a place's does. | Plan, 3.8 ("settled by Fable 10 Nov, told to Yohann") |
| 8 | Its card on Home (`tile`: its name and line) is a highlight, half or wide, opening this page; with a card, the section is not repeated as a tile, in either group. | The `_doc` of `content/transport.json` ("puts a one-tap tile on Home that opens this page (the section tile then stays off the Home grid)"); `../README.md` frame rule 9 |
| 9 | The card's icon, and the page's: the taxi when there are taxis, else the bus when the first station is a bus stop, else the train. The page takes the card's icon when there is a card. | As built, before the modules (`content.js` `TR_ICON`, `views/place.js`) |
| 10 | An old guide's taxi card with `trains` opens this page drawn from the card; `#p/taxi` in a guide with Getting around comes here. | `../highlights/README.md` rule 8 (code comments: "the old taxi tile now lives in Getting around") |
| 11 | A Getting around section with no file is drawn as an empty text page. | As built (the section view's last branch); no origin found |
| 12 | Its tile on Home, when there is no card, is an entry tile, half, wide or tall. | Yohann, 14 Nov 2026 (proposal 22); the sizes: what the frame gave every section with no module of its own |
| 13 | Never tell guests to contact the hosts, never the hosts' numbers: the taxis are the taxi companies'. | `../CLAUDE.md` ("Privacy and safety") |

## Its data

One file per guide, `content/transport.json` (its `_doc` describes it): `lead`, `taxis` `[{ id, name, sub, phone, what,
alt: [{ name, phone }], always }]`, `stations` `[{ id, mode (train or bus), name, lat, lng, km, min, tag, what, link,
linkKey, gmaps, gid, badges: [{ t, c, ink }], to: [{ dest, time, note }] }]` (texts in six languages), `tile`
`{ name, sub, wide }` or none. A position Google gave carries `pos: { from: 'google', at }`. Read by `content.js` with
the other sections, which also builds the card once (`cardOf`, `plan.js`) and keeps `TRANSPORT_CARD` (the frame's
`transportCard`) and `TRANSPORT` (the highlights' page reads it).

Where it comes from: the builder (the taxi), the editor (stations, lines, journey times), the research (lines); Ca La
Kimberly's was written by hand. What the maker cannot change yet (empty lines and stations, the taxi's website): the
plan's gaps E, F6 and D12.

## Its look

The page (`.wrap.place.transport`): the icon and the title with its lead (`.pl-head`), "Taxi" and its rows, then each
kind's heading, the small map under the first (`.pl-map.secmap`, `#trmap`), and its rows (`.mrow`: the icon in the
kind's colour, the name with its line badges `.lbadges`, the verdict and minutes by car; opened, the journey times
`table.dests`, the note, the buttons). On Home, the entry tile (`SECTION_LOOK.transport`) or the card (`../highlights/`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: the kinds, the stations listed and pinned, the icons, the card, an old taxi card read as the page | `plan.js` (tests: `engine/scripts/transport-plan.test.mjs`) | Yes |
| The page, also an old taxi card's | `page.js` (`page`, `renderTransport`) | Yes |
| The Home widget (the entry tile) | `widget.js` | Yes |
| What it offers on Home: its entry tile, half, wide or tall | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What the section view and the highlights call | `index.js`, listed in `../index.js` | Yes |
| The card on Home, its icons | `../highlights/` (`card`, `icon`; offered as a highlight, half or wide) | No: the highlights draw every card |
| Reading the file, the card among the white cards, the frame's `transportCard` | `engine/src/content.js` (`TRANSPORT`, `TRANSPORT_CARD`, `QUICK`, with `cardOf`) | The rule is; the names stay there, shared with the highlights and Home |
| Not a tile when it has a card | `../frame.js` (`thing`, `transportCard`) | No: the frame's |
| The small map | `../map/` (`overviewMap`) | No: the map's |
| The phone and website icons, a number as a `tel:` link | `engine/src/ui.js` (`PHONE`, `WEB`, `tel`) | No: shared |
| Its styles | `engine/src/styles/app.css` (`.transport`, `.lbadges`, `.lbadge`, `.dests`, `.pl-head`, `.pl-map`, `.gt[data-k="transport"]`) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `gettingAround`, `taxiH`, `byTrain`, `byBus`, `minByCar`, `callNow`, `open24`, `directions`, `timetable` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` | Not yet |
| The maker's step Getting around | `onboarding-site/src/editor.js` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The line badges' colours are written in the file for Rodalies lines (Catalonia's suburban trains).
- `#p/taxi` goes to `#s/transport`, Ca La Kimberly's id for the section (`../highlights/page.js`).
- A station's `toBcn` is a field nothing reads (plan, gap F6).
