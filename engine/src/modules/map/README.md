# The map (module `map`)

Every place of the guide on one map (`#map`): the markets, the host's lists of places, the bar next door, the practical
spots, with tabs by kind, pins grouped by town, a "Map centred on" search, and under the map the list of what it shows.
It also draws the small maps of the other pages: a highlight's page (the place), a list's and the Markets page (its
places), Getting around (the stations). On Home it is one widget, the bar that opens the map, with how many places it
shows today.

Moved into this folder on 14 Nov 2026 with the text pages, Emergencies, Getting around and the house (the module frame,
part 2, `../README.md`): `views/map.js` became `view.js` as it was, its imports aside. Read this page before changing the
map, and write a changed rule here with its date. Ca La Kimberly's map is the reference: the move was checked pixel for
pixel and byte for byte (the map's canvas hidden, its pins, controls and list shown).

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | The map tiles are OpenFreeMap's (free, no key, OpenStreetMap's data), light or dark with the guide's theme; the same grey map in every colour world. OpenStreetMap is credited on the map and in the credits. | Code comment, before the modules; plan, "The map (10 Nov 2026)"; this repo's `CLAUDE.md` ("Stable and credited": "OpenStreetMap on the map") |
| 2 | No pin for the house on any map: its position is approximate on purpose (offset about 350 m), and a pin in the wrong place misleads; the bar next door and the guest's own blue dot show where home is. The place the map is centred on carries a small target, not a house pin. | `../CLAUDE.md` ("The house coordinates are offset by about 350 m on purpose"); code comments, before the modules |
| 3 | Tabs: one per kind of place (All, Eat, Markets, Things to do, Nightlife, Useful), every place in exactly one; a tab without places is not shown. The plain Map link (Home) always opens on All; a list's small map opens the map on its own tab. | Code comments, before the modules (`view.js`, `main.js`) |
| 4 | Below zoom 13 one pin per town, with a count; from 13 one pin per place. Towns whose pins would overlap (34 px) share a cluster pin that zooms in until they separate. A town the guest opened shows its places as separate pins even zoomed out, until the map zooms back out past it. Practical spots are never grouped into a town pin. Labels that would overlap a more important one are hidden. | Code comments, before the modules |
| 5 | The overview is centred on the chosen place (the house by default), showing the places within the guide's radius (`site.json` `area.radiusKm`, 40 km by default), or the 5 nearest when fewer than 3 are that close, the bounds mirrored around the centre so it stays in the middle. | As built. (its comment corrected 15 Nov 2026) |
| 6 | The list under the map is exactly what the map shows: the places inside the visible area, closest to the map's centre first; a place opened (`#map/m/<id>`) comes first, open, with a Close link. | Code comment, before the modules |
| 7 | "Map centred on" looks for places in the guide's area (`site.json` `area.searchBbox`, about 150 km around the house by default) with Photon (Komoot, OpenStreetMap's data), and among the guide's own towns; credited in the credits. | Code comment, before the modules; `docs/CREDITS.md` |
| 8 | A place closed for the season and opening in more than 30 days has no pin; a place whose Google position ran out (30 days) has none either. | `../places/README.md` (Yohann, 11 to 12 Nov 2026); `../CLAUDE.md` (Google's terms: "its position for 30 days") |
| 9 | The pins stay round: the icon dark on light pins and white on dark ones. | Yohann, 10 Nov 2026 (plan: "The pins stay round") |
| 10 | Offline, or when the style or the tiles fail, the map says so and its pins still work on a blank map. | Code comment, before the modules |
| 11 | The small maps are still pictures (no interaction): a place's shows the place in red and the house's area in its bounds, and tapping it opens Google Maps; a list's shows its places with the house's area in its bounds. The guest's blue dot is on them once location is known, never asked there. | Code comments, before the modules. The house has no pin there (rule 2), only its position in the bounds (the comments corrected 15 Nov 2026) |
| 12 | Its bar on Home is wide only, and keeps its 23 px title ("Mapa de todos los sitios" is longer than 20 characters). | Yohann, 14 Nov 2026 (proposal 22, `../README.md` frame rules 2 and 4) |
| 13 | Coming back to the map keeps where it was; the back arrow does what the phone's back gesture does (Markets after its map). | `docs/UX-GUIDELINES.md` §4 |
| 14 | The map's credit ("OpenFreeMap © OpenMapTiles Data from OpenStreetMap") is one line of 11 px along the bottom edge of every map, the big one and the small ones, always written out: never folded to an "i", never a box over the pins, and nothing of ours sits on it ("My location" and its message are above it). | Claude, 21 Nov 2026, in the map's turn of the order of fixes (Yohann's "Go", 17 Nov 2026); OpenStreetMap's attribution guidelines, read 16 Nov 2026: the credit in a corner of the map, easily readable; folding is allowed only after five seconds, on a touch of the map or a dismissal. A line that never moves is the surest reading, and a small map is a picture, which never folds. Before: the credit opened as a box, half under "My location" on the big map and over a fifth of a small one |
| 15 | No pin that a view sets out to show opens under a button, nor its name: the overview and "Show all" keep room for "Show all" (top), the zoom buttons (right), "My location" and the credit (bottom); a town or a cluster opened does the same (`view.js`, `PAD`, `PAD_TOWN`). A place beyond the guide's radius may still be cut by the map's frame, as on any map. | Claude, 21 Nov 2026 (the overlap rule, `docs/UX-GUIDELINES.md`); before, 30 px all round, and a pin sat under the zoom buttons |

## Its data

No file of its own: the places come from the other modules as `content.js` reads them once (`MAP_ITEMS`, `mapItems`:
the markets, the places of every list, the bar next door `QSHOP`; `CATS` for the Markets tab, `byId`), the house's
position and name from `content/house.json` (offset on purpose), the radius and the search box from `site.json` `area`,
and whether the map is on from `site.json` `modules.map`. What the guest chose (tab, today only, the place it is centred
on, the guest's position) is in `engine/src/state.js` (`st`).

## Its look

The page (`#mapview`): the title and its note, the tabs (`.mapseg`), "Map centred on" (`.mapat`), the map box
(`.mapbox`: `#mapgl`, the offline message `.map-msg`, "Show all" on top, "My location" at the bottom, the credit's line under
it), then the list
(`#sheet`: `.maplist-h`, `.maplist`). Pins `.mk` (a town's with its count, a cluster's, a place's), the blue dot `.me-mk`,
the centre's target `.at-mk`. A small map: `.pl-map` (a place) or `.secmap` (a list). On Home, the wide bar
(`SECTION_LOOK.map`, white with dark text, `wide s-wide`, never `t-long`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The map page, its tabs, pins, list, search, and the small maps | `view.js` (`showMap`, `refreshMapLang`, `refreshMapStatus`, `locate`, `tabOf`, `miniMap`, `overviewMap`) | Yes |
| The Home widget (the bar) | `widget.js` | Yes |
| What it offers on Home: its bar, wide only | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`; the frame keeps the same as its own word when a guide is given no offers) | Yes |
| What the router, Home and the other modules call | `index.js`, listed in `../index.js` as `map` (the kind of placement) | Yes |
| The route `#map`, `#map/g/<town>`, `#map/m/<id>`, the tab a link opens on | `engine/src/main.js` | No: the router's |
| The places on the map | `engine/src/content.js` (`MAP_ITEMS`, `mapItems`, `byId`, `CATS`) | No: shared with the lists and rubbish's page |
| MapLibre, loaded when a map is drawn | `/vendor/maplibre/` (copied into the site's `public/` by `engine/vite.config.js`), or embedded in the one-file preview | No: the build's |
| Its styles | `engine/src/styles/map.css`; the Home bar in `engine/src/styles/app.css` (`.gt[data-k="map"]`) | No: kept where they are |
| Its words | `engine/src/i18n/<lang>.json`: `map`, `mapNote`, `mapTile`, `nPlaces`, `nMarkets`, `mapAll`, `mapEat`, `mapMarkets`, `mapDo`, `mapNight`, `mapUseful`, `mapOffline`, `mapEmpty`, `recenter`, `locate`, `atLabel` | Not yet |
| The credits of the map and the search | `engine/src/views/credits.js` | No: the guide's page of credits |

## Not done here

- The pure rules (the tab of a place, the overview's bounds, the clusters) are not in a `plan.js`: they read the guide
  (`CATS`) or MapLibre's screen positions, and drawing them out would mean rewriting `view.js`, which this move did not do.
- The map following the colour world (plan, proposal 6) is not built. The credit folded to its "i" (plan, "The pins
  stay round") was not built either: it is one line, always written out (rule 14).
- No test of its own: what was checked on 21 Nov 2026 is in `docs/test-together.md` (the map's section).

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The tabs know the lists by Ca La Kimberly's ids: Eat is the section `restaurants`, Nightlife `nightlife`, Things to do
  `todo` (and `kids`, `daytrips`, ids of older guides), any other list is Useful (`tabOf`).
- The bar next door on the map is Ca La Kimberly's card `shop` (`content.js` `QSHOP`, `../highlights/README.md`).
