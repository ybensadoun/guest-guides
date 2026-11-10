# Plan: Ca La Kimberly made only through the maker (started 10 Nov 2026)

Goal (Yohann, 10 Nov 2026): Ca La Kimberly is a guide like any other. We stop changing it by prompts and folder edits; every change goes through Guest Guide Maker, and a bug found in it is fixed in the product for every guide. Follows `plan-ca-la-kimberly-on-product.md` (the guide is in the database since 23 Oct) and finishes its phase 4.

Status: step 1 (this gap list) is written and waits for Yohann's review. Nothing below is decided or built yet.

## Two tests
- **Editor test:** everything a guest sees in Ca La Kimberly can be changed, added and removed in the editor, by a host who never opens a file.
- **Builder test:** a host who gives the same answers to the builder gets the same guide (generator, research and editor together). Step 2 runs it.

## What was compared (10 Nov 2026)
The live guide, pulled from the database (the folder already matched): `site.json`, `theme.css`, 13 content files, 6 `i18n` files, `public/`, the Wi-Fi shape. Against the editor (`onboarding-site/src/editor.js`), the builder (`start.js`, `runtime.js`), the generator (`engine/scripts/generate-site.py`) and the worker (`worker/`).

## Main findings
1. **The look is not a gap.** Ca La Kimberly's `theme.css` is empty: its look is the engine's own "Big colour tiles" (preset bauhaus, Jost), which every host can pick and which is the default. The test guide built on 4 Nov has the same preset. What makes other guides feel plain must come from elsewhere (no logo, plainer places, the other layouts, fewer photos): to look at with screenshots in step 3, not assumed here.
2. **The biggest gap is in the places.** What makes Ca La Kimberly's lists rich (an icon per place, the quick filters, "Great for kids", "Dog friendly", "Unmissable", set menu prices, seasons, market kinds) can be shown by the engine but cannot be set or changed by a host anywhere. 130 places and events carry such marks.
3. **Rubbish is a different shape.** Ca La Kimberly's rubbish file and the one the maker writes do not match, so the editor shows part of it empty.
4. **A handful of small fields have no control** (the guide's own lines of text, the link-preview picture, a part of the house guide).
5. **Outside the content, four things still treat it as special** (monthly research, the monthly check's "hand-made" mode, its own web address, the files the day-rental site reads).

## File by file
"Builder" = a new host's answers and the generator. "Research" = the worker. "No" = nothing in the maker makes or changes it.

| File | A new host gets it from | Changed in the editor | What is missing |
|---|---|---|---|
| `site.json` | Builder: name, description, languages, sections, layout, radius | Name and languages, The look, Guide sections | Gaps D3, D4, D6, F3, F6 |
| `theme.css` | Builder: The look | The look (layout, colours, fonts) | Nothing |
| `i18n/*.json` | Builder: guide name, house name, area, welcome line | No | Gap D1 |
| `house.json` | Builder: name, position, cover, check-out | Name, cover, check-out | Gaps D4, D5 |
| `house-page.json` | Builder: listing, rooms, photos, What the place offers | The house page | Gaps D7, D8, D9 |
| `reviews.json` | Builder, when the host switches reviews on | No (the rating is on The house page) | Gap D10 |
| `message.json` (house guide) | Builder: rooms, notes, listing equipment, rules, check-out | House guide | Gap C |
| Wi-Fi (private) | Builder: one network | Wi-Fi: several networks, notes | Nothing |
| `garbage.json` | Builder: the rubbish answers | Rubbish | Gap B |
| `emergency.json` | Research | Contacts | Gap D2 |
| `transport.json` | Builder: the taxi; stations in the editor, lines by research | Getting around | Gap E (empty lines and stations), F6 |
| `quick.json` (Home tiles) | Empty at the build | Home tiles, "Show on the home page" | Gap D11 |
| `markets.json` | Research, Find more | Local markets | Gap A |
| `restaurants.json` | The host's list, looked up on Google | Eat and drink | Gap A |
| `todo.json` | The swipe deck, the host's own, Find more | Attractions | Gap A |
| `events.json` | Automatic events, Find more | Local events | Gap A |
| `sections.json` | Builder | Guide sections (on or off) | Gap D11 (the shop shown on top of Eat and drink) |
| `public/` | Photos and logo uploaded to storage | Photo fields | Gap F4 |
| `docs/` (sources, design, research notes) | Not part of a guide | No | Gap F5 |

## The gaps, grouped
Sizes are Opus sessions of about half a day each, checks included. They are estimates.

### A. Places: kinds, filters and marks (about 2 sessions)
In Attractions, Eat and drink, Local markets and Local events the editor changes a place's words, links, pin, hours and dates. It cannot set:
- the **icon** (29 attractions use 18 icons, 12 restaurants use 10) and, for attractions, the **quick filter** it sits under (fun, beach, wine, sights) with its colour;
- the **feature marks** that are also filters: Great for kids (8), Free (12), Dog friendly (6), Vegetarian options (3); for markets what they sell (16 kinds, on 44 markets);
- the **warnings** other than "Check before going": Book ahead (5), Not held on public holidays (3), Closest to the house, and others;
- **"Unmissable"** (3 restaurants), **set menus with their price** (4), **open 24 h**, **seasons** in the opening hours (7 places), **"first Sunday of the month"** for a market (2);
- a market's **kind** (street, covered, flea, antiques, fairs) and an event's **kind** (10 kinds, each with its icon).

A bug with the same cause: **a new place copies the first place's icon, filter, marks, market kind or event kind** (a new attraction in Ca La Kimberly would be a water park, in Fun, great for kids), and the host cannot change them.

Builder side: a restaurant typed by a host gets no icon, price or marks; Google's kind of place could give the icon, as it already gives the filter for attractions.

Proposed: one "Kind and marks" block in every place card (a kind picker that sets icon, filter and colour; mark chips per section; an "Our favourite" switch; set menus; open 24 h; a season on each line of hours; the week of the month for markets), new places start blank, and Google's kind fills the icon when a place is found.

### B. Rubbish: one shape (about 1.5 sessions)
- Ca La Kimberly has 7 kinds of rubbish (the maker writes 5 fixed ones: no sanitary bin, no small kitchen bin), a text for each bin (the maker writes none), and its glass container and recycling centre as map points with opening hours.
- The maker's own model is "containers guests can use". Ca La Kimberly has none in that form, so that part of the editor is empty for it while the guide shows two.
- The editor cannot add or remove a kind of rubbish, nor change the bins' texts.

Proposed: one model for every guide: kinds a host can add and remove, a text per bin, and containers that can have opening hours (the recycling centre is one). Then move Ca La Kimberly's file to it, checked page by page.

### C. House guide parts (about 1 session)
The editor changes a part's title, lines, photos and order. It cannot add or remove a part, pick its icon or colour, change the paragraph under the lines ("Also in the kitchen: ..."), nor the link to another section (Kitchen links to Rubbish). The line under the title is only editable where one exists.

### D. Small fields with no control (about 1.5 sessions together)
1. **The guide's own lines:** six hand-written texts (the lines under Eat and drink, Things to do and Events, the "no market today" line that names the covered markets, the map's label, the line on the house guide card). Nothing in the maker writes or changes them.
2. **Contacts:** no way to add, rename or remove a group; no "open 24 h" switch; no hours unless the contact already has some; the extra link of two contacts.
3. **The picture under a shared link:** Ca La Kimberly uses its drawn picture; the maker always takes the house photo.
4. **The house's point on the map** and **the radius** of the area: set at the build, no field afterwards.
5. **Where the cover photo is cropped** (Ca La Kimberly: 60% 50%; the maker: always 50% 55%).
6. **The map's search area:** a hand-set box in Ca La Kimberly; the engine's default (about 150 km around the house) would do. To drop, after a look.
7. **Highlights on the house page:** a new highlight copies the first one's icon (the pool); no picker.
8. **Rooms on the house page:** order, names and photos can change; a room cannot be added.
9. **Amenities:** Ca La Kimberly's 11 groups predate the maker's list of 116; it lacks the "most asked for first" order that built guides have.
10. **Reviews:** no step (already "later" in `plan-single-editor.md`); "Load my listing again" would cover it.
11. **Home tiles:** only two icons (food, shop), where Ca La Kimberly's pizza tile has its own; no "wide tile" switch; no way to show a tile on top of Eat and drink (the shop next door).
12. **The taxi's website** is kept but has no field.

### E. The editor never saves an empty thing (about half a session)
"Add a line", "Add a station", "Add a place" save an empty entry at once. On 30 Oct that put an empty train line and an empty station in the live guide. The viewer hides an empty line since 10 Nov; the editor should not publish them: empty entries are dropped on Publish, and a place with no name is said so in Review.

### F. What still treats Ca La Kimberly as special, outside its content (decisions first, then about 1 session)
1. **Monthly research:** Find more runs for Ca La Kimberly only (`MONTHLY_FIND` in `worker/monthly.mjs`).
2. **The monthly check:** a guide whose origin is "imported" is "hand-made": report only, nothing replaced or removed. Only Ca La Kimberly is.
3. **Its own address:** ca-la-kimberly.netlify.app is its own Netlify project, building the viewer for one guide. No host can have that.
4. **Brand files:** the day-rental site reads `content/house-page.json` and `public/` (logo, favicon, photos) from the folder at build time.
5. **The folder itself:** `sites/ca-la-kimberly` with `guide:pull` / `guide:push`, its `CLAUDE.md`, and the process files in `docs/` (sources per place, design notes).
6. **Leftovers to remove:** fields nothing reads (`manifestDescription`, `airbnbPhotos`, a station's `toBcn`, `_wifi`, a `mapsUrl`), three unused cover pictures, and the storage key `clk` where the maker would use the web address (changing it resets guests' saved language once).
7. **The editing language:** the editor opens Ca La Kimberly in English because it has no "written in" language.

### G. To measure, not yet a finding
- **How good a built guide is next to the hand-made one** (how many markets, how well chosen the attractions, the contacts): the shapes match, the depth is unknown until step 2.
- **Why other guides look plain** (finding 1): step 3.

## Not gaps
The look and its colours and fonts; languages and translation; Wi-Fi with several networks; Getting around (taxis with other numbers, stations, lines, journey times, the Home tile); automatic events and their settings; photos and their order; pinning a restaurant to Home; switching sections on and off; drafts, Preview and Publish.

## Order proposed
E (stops new damage), A (the biggest difference a guest sees), B, C, D, then the decisions of F. Step 2 (the builder test) can run before A to D are built: it tells us what else is missing. About 6 to 7 sessions in all before the look (step 3).

## Who does what
- Fable: this list, the design of the "Kind and marks" block and of the rubbish model, the builder test and its reading, the decisions of F, and the review of each change.
- Opus 5.5: building A to E from a written brief each (goal, files, what not to touch, checks: `npm run build`, `ux-check.mjs`, `onboarding-site/test/check.mjs`, screenshots at 360 px in de and fr).
