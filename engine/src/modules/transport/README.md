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
| 2 | The small map of the stations sits under the first kind's heading, above its rows, when a station has a pin. | As built, before the modules (the code comment said "the stations map last"; corrected 15 Nov 2026) |
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
| 14 | A page with a single row (one taxi and no station, or one station and no taxi) shows it open: the number or the journey times without a tap. With several rows they start closed. | Yohann, 15 Nov 2026 ("Yes, open it", on the pool house's page: one closed row over an empty screen) |
| 15 | When the page is drawn again (each minute, a change of language, coming back to the guide after a call or the directions), every row stays as the guest left it. Before, an opened row closed at each redraw. | Claude, 15 Nov 2026, found while building rule 14: the other lists already keep their opened rows (`views/section.js` `sectionFrame`) |

## The stations found (16 Nov 2026)

A new guide gets its train stations by itself, and a host adds one by typing its name, from our own file of Spain's stations
made from Renfe's open timetables. The rules below are on top of those above; nothing about how the page looks changed.

| # | Rule | Decided |
|---|---|---|
| 16 | The stations, their lines and the journey times come from a file of ours (`onboarding-site/stations-es.json`), made by hand from Renfe's two open timetable files when they are renewed (`onboarding-site/src/stations.py`), never looked up live. | Yohann, 16 Nov 2026: "it's not an app where we need to fetch real time every time. We can have a database that we store every once in a while." |
| 17 | A station's lines are badges: a suburban line as its file names it, "C" and the number (Cercanías), "R" and the number (Rodalies, R2S and R2N written "R2 Sud" and "R2 Nord" as on their signs), in the file's own colour; then the long distance services by their names on tickets (AVE, Avlo, Avant, Euromed, Alvia, Intercity; Regional or MD only when those trains are not a suburban line already), in the brand's own colour (`brands.json`, each colour with the page it was read on; one that could not be read is the neutral colour long distance badges had, never invented). | Yohann, 16 Nov 2026: "if it's a Cercanía in Madrid, just put C and the number. If it's a Rodalia in Barcelona, put R and the number. Keep the color coding. If it's high speed, you know, Irio, Avlo, etc., then just use the same color coding that they have." |
| 18 | The trains are counted on one day, the first Tuesday inside both files; one train is counted once (a train the two files both list, R15 and "Regional", or one file twice: same station left and another reached within 2 minutes); a station is kept with 4 trains or more, a line or service is listed with 3 or more at the station, a station is high speed (`hs`) with 4 or more AVE, Avlo, Avant or Euromed trains. | The design, 16 Nov 2026 |
| 19 | Journey times are direct trains only, to the main cities (`cities` in the file: Barcelona Sants, Madrid's main stations as one city, València, Sevilla, Zaragoza, Málaga, Bilbao, Alicante, Murcia, Valladolid, Córdoba, and the other provincial capitals with a station), with 3 trains or more that day; the time is the 4th fastest (a time several trains a day really make; the slowest with fewer than 4). No journey with a change, no first or last train, never how many trains a day: those change with each timetable, and a stale last train would send a guest wrong. | The design, 16 Nov 2026 |
| 20 | Which stations a house gets (`pick.js` `pickStations`): the city is the main city nearest to the house in a straight line; among the stations within 60 km with 12 or more direct trains a day to it, the nearest ("Closest"), the one with the lowest door to city time when it beats the nearest by 10 minutes or more ("Faster"; minutes by car guessed as 1.6 times the straight km, plus the usual time), the nearest with high speed trains when it is neither ("High speed"). None: the nearest station within 30 km, alone. A single station has no verdict. The quicker station that also has high speed trains is given the words "High speed", not "Faster" (`tpTagOf`; the coordinator's review, 16 Nov 2026: a house inland got "Closest" and "Faster", the second being Camp de Tarragona); the rule itself is unchanged. On Ca La Kimberly's house: El Vendrell, Sant Vicenç de Calders, Camp de Tarragona, the three Yohann had chosen by hand. | The design, 16 Nov 2026. The city among the main cities only (not the provincial capitals, so that a house near Tarragona is judged by Barcelona): Claude, 16 Nov 2026, the reading that gives the three stations above; to confirm with Yohann |
| 21 | A station found is written as the guide holds any station: "st" and Renfe's id, its name with the word "station" in each language, km by road (1.3 times the line) and minutes by car (`cmMin`, the maker's own guess, one formula), its badges, its journey times (the house's city first, then the cities with the most direct trains, at most 4), its timetable (Rodalies' site for a Rodalies line, else Renfe's), the verdict's two words, an empty "what" for the host, and `src: { from: 'renfe', at }` (the date of Renfe's data). No Google id, no Google position. | The design, 16 Nov 2026; at most 4 journey times and their order: Claude, 16 Nov 2026 (Camp de Tarragona has 10 cities), to confirm with Yohann |
| 22 | The generator gives a new guide its stations even when the host typed no taxi; with a taxi, the taxi first and its card as before; with stations and no taxi, no card (`tile` null), so Home shows the section's entry tile, which the frame places like any tile. No house position: no stations. | The design, 16 Nov 2026; no card without a taxi: Claude, 16 Nov 2026, the simplest that keeps Home without a hole |
| 23 | The maker's step goes mode by mode, each under its heading with one line on what goes there: Taxi, Trains, Bus stops. Trains: "Type a train station" offers the file's stations as the host types (accents and capitals aside, the nearest first, with their lines and distance, "Renfe" under them); a pick adds the station at once, opened, with no request and no wait. A station already in the guide is not offered again (by its id, or a train station of the guide within 0.5 km: one written by hand). Never an empty form: once the file is there and the house has a position, the rule's stations the guide lacks (`tpNear`) are offered without typing, each with its role's words, which a pick keeps as its verdict: under "Near your house" while the guide has no train station, else in the list when the field has the focus and is empty; the field's example is the station nearest to the house ("Its name, like Tordera"; `tpNearest`), "Its name" before. No position, no file or nothing found: nothing more is shown. A station's closed row shows its lines as their coloured badges. "Not in the list?" opens the old way (a name or a Google Maps link, then the worker's lookup) for a station Renfe does not run. A station from the file has no "Refresh the lines"; one added the old way keeps it. Bus stops: the old way, under their own heading. Nothing of an older guide is rewritten. | Yohann, 16 Nov 2026: "you would go like from mode to mode. So like taxi [...] Then you would move into trains, and then here you'd just be able to type a train station, and by default it would add it, and you could add a comment. But the lines would already be available. Then we could do the same thing with bus stops"; the 0.5 km: Claude, 16 Nov 2026; "Near your house", the field's example and the badges in the closed row: the coordinator's review, 16 Nov 2026 ("never an empty form") |
| 24 | A guide with a station from the file credits Renfe on its Sources and credits page as Renfe's terms ask: "Origen de los datos: Renfe Operadora" in Spanish inside a sentence in each language, the date of the data, the licence (CC BY 4.0, linked), and that the times are usual journey times to check before travelling. | Renfe's conditions (data.renfe.com/legal, read 16 Nov 2026); `docs/CREDITS.md` |

## Its data

One file per guide, `content/transport.json` (its `_doc` describes it): `lead`, `taxis` `[{ id, name, sub, phone, what,
alt: [{ name, phone }], always }]`, `stations` `[{ id, mode (train or bus), name, lat, lng, km, min, tag, what, link,
linkKey, gmaps, gid, badges: [{ t, c, ink }], to: [{ dest, time, note }] }]` (texts in six languages), `tile`
`{ name, sub, wide }` or none. A position Google gave carries `pos: { from: 'google', at }`. Read by `content.js` with
the other sections, which also builds the card once (`cardOf`, `plan.js`) and keeps `TRANSPORT_CARD` (the frame's
`transportCard`) and `TRANSPORT` (the highlights' page reads it).

A station found in our file (rules 16 to 21) has `id` "st" and Renfe's id and `src: { from: 'renfe', at: 'YYYY-MM-DD' }`
(the date of Renfe's data, for the credit). Where it comes from: the builder (the taxi), the generator (the stations near
the house, from our file), the editor (a station typed from our file; stations and bus stops by name or link, with lines
and journey times looked up by the worker), the research (lines); Ca La Kimberly's was written by hand.

Our file of stations, `onboarding-site/stations-es.json` (its `_doc` says every field): `source` (Renfe Operadora, the
licence, the date of the data, the Tuesday counted), `cities` `[{ id, ids, name, i18n, lat, lng, main }]`, `stations`
`[{ id, name, lat, lng, lines: [{ t, c, ink }], hs, to: [{ id, n, min }] }]` (`n`, the direct trains that day, is for
the picking rule only and never shown). The brands' colours: `brands.json` here. What the maker cannot change yet (empty lines and stations, the taxi's website): the
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
| The maker's step Getting around | `onboarding-site/src/editor.js` (`cmTransport`, `cStation`; the trains typed from our file: `trsLoad`, `trsType`, `trsPick`) | No: the maker's |
| Which stations a house gets, a station as a guide holds it, the maker's matching as the host types | `pick.js` (`pickStations`, `stationEntry`, `stationsFor`, `tpFind`, `tpHave`, `cmMin`; tests: `engine/scripts/transport-pick.test.mjs`), pasted into the maker by `onboarding-site/src/build.py` | Yes |
| The brands' colours of long distance trains | `brands.json` | Yes |
| Our file of Spain's stations, and the script that makes it from Renfe's files | `onboarding-site/stations-es.json`, `onboarding-site/src/stations.py` (tests: `onboarding-site/test/stations_test.py`) | No: the maker serves the file |
| The generator's stations | `engine/scripts/stations-of.mjs` (asked by `engine/scripts/generate-site.py`; tests: `worker/test/generate-stations.test.mjs`) | No: the generator's |
| Renfe's credit | `engine/src/views/credits.js` (`crTrainsH`, `crRenfe` in `engine/src/i18n/<lang>.json`) | No: the credits page's |

## Where it is available

The stations found and their lines are Spain only: they come from Renfe's files (rules 16 to 21), and a house elsewhere gets
none (a house near the border may get a Spanish station within 30 km). Where the main city is far (Galicia, Asturias, the
islands), a house may get only its nearest station, alone. Taxis, stations added by name or link, and bus stops work
anywhere. Nothing in the code reads this yet (`../README.md`, "Not built yet").

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The line badges' colours are written in the file for Rodalies lines (Catalonia's suburban trains).
- `#p/taxi` goes to `#s/transport`, Ca La Kimberly's id for the section (`../highlights/page.js`).
- A station's `toBcn` is a field nothing reads (plan, gap F6).
