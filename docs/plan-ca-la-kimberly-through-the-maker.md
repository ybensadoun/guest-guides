# Plan: Ca La Kimberly made only through the maker (started 10 Nov 2026)

Goal (Yohann, 10 Nov 2026): Ca La Kimberly is a guide like any other. We stop changing it by prompts and folder edits; every change goes through Guest Guide Maker, and a bug found in it is fixed in the product for every guide. Follows `plan-ca-la-kimberly-on-product.md` (the guide is in the database since 23 Oct) and finishes its phase 4.

Status: step 1 (the gap list) and the local half of step 2 (the builder test, below) are done. Nothing is decided or built yet.

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

## Step 2: the builder test, local half (10 Nov 2026)
**How.** The answers the builder really saved for the 4 Nov test house (Ca La Kimberly's own listing), plus what Yohann would type and upload, taken from the live guide: the 12 places to eat and the 29 things to do with their comments (32 picked from Google's suggestions, 9 typed), the 15 rooms with their 44 photos, notes per room, house rules, check-out tasks, the rubbish plan, the taxi, the logo and the cover. The 41 places were looked up on Google exactly as the worker does (32 by id, 9 searches: under 1 USD at list price). Markets, contacts and events are the ones the 4 Nov research gave that house (no new research, no Claude cost). Then `generate-site.py`, the content check (passed), a build, and a comparison with the live guide, file by file and on screen at 360 px. No translation was run. Nothing was queued, published or written to the database; the scratch site is deleted.

**What comes out the same.** The look (same layout, colours, fonts, welcome card with logo and cover). The house page: the 15 rooms in order with all their photos, the rating, the amenities (richer than the live guide's: 13 groups, 72 items). The house guide's parts, icons and colours. The rubbish days. The taxi. Every one of the 41 places with its name, comment, pin (37 of 41 within 300 m of the live pin) and Google's opening hours.

**What a guest would see differently.** New gaps are marked H to N; the others confirm A to F.
- **H. A place a host adds has almost nothing but its hours.** Eat and drink, built against live: phone 0 of 11, website 0 of 9, rating 0 of 12, price 0 of 12, address 0 of 12, icon 0 of 12 (every place gets the same fork), marks 0 of 7, "Unmissable" 0 of 3, set menus 0 of 4. Things to do: phone 0 of 15, website 0 of 18, rating 0 of 24, icon 0 of 29, the note under the hours 0 of 18, seasons 0 of 6, "Free" 0 of 12, a quick filter for 20 of 29. Cause: the worker asks Google for the position, hours and kind only. Google's answer for the same request can carry the phone, website, rating, price level and address at no extra cost; the icon can follow from Google's kind.
- **I. A city is not a place.** "Barcelona" got no pin (over the 50 km reach); Tarragona and Sitges landed on another point of the town. Day trips to towns need their own handling.
- **J. The research misses the small villages near the house.** Markets: 23 found against 44 live; of the 15 weekly street markets within 20 km it has 7, and not the house's own village market (La Bisbal, 3 km) nor the next four nearest. It found the larger towns, and 9 the live guide does not have (to check: some may be good finds). Nothing beyond 30 km, as asked (radius 30 min). Contacts: 8 in 2 groups against 11 in 4; no police, town hall, village pharmacy, power cut, vet or poison line, and the clinic and pharmacy are the next village's. Possible cause for both: the listing says "Can Gordei" (the housing estate) as the town, so the guide never learns its municipality. It also shows as "Can Gordei, Catalonia, Spain" under the name and "guest guide for Can Gordei, Can Gordei" in the link text.
- **K. House guide.** "How things work" lines are filed by keyword: 5 of 14 landed in the wrong part (the outdoor kitchen under Kitchen, the outdoor shower under Bathrooms, "Bedroom 1: king-size bed and a smart TV" under Living room), and the editor cannot move a line to another part. Only 4 of 12 parts get a line under their title, in the listing's raw words ("Washing machine in the accommodation (Free), ..."). Photos are grouped by kind of room: Outside gets 15.
- **L. Rubbish.** As gap B, plus: the host's own sorting steps are added after the default ones (9 steps, some twice); the glass container gets no point on the map when its Google Maps link is a short one; a default bin colour shows in a name ("Paper and cardboard (blue)").
- **M. Home.** No tiles for the shop next door and the pizza delivery (by design they are added in the editor), and a single small tile (the taxi) leaves the other half of its row empty.
- **N. Small ones.** The highlights and beds are the listing's words ("Private outdoor pool: available year-round, available 24 hours"). The browser bar's colour does not match the page for the default layout (the generator's own cream, not the layout's). The reviews link opens the listing, not its reviews. Opening hours come from Google where the live guide has the places' official ones (12 of 21 differ).
- Events: 8 found for the next three months, as designed; the live guide's other 39 were written by hand over the year.

**What this changes in the order.** H is cheap and changes every host's guide the most: do it with A (the same fields, filled by Google at the build and editable afterwards). J needs a look at how the research is briefed (the municipality, the nearest villages first) before any building.

**The same test through the maker's own screens: kept for the end (Yohann, 10 Nov 2026),** as the acceptance test once A to H are built. How: a test house added in Yohann's own account (Claude may not create an account on the live site), filled in through the builder, never sent (the server's worker publishes every build), its saved answers run through the generator locally, then the house deleted.

## Step 3: the look (started 10 Nov 2026)
**What was looked at.** The same guide (Ca La Kimberly's content from the builder test) built in each of the five layouts, and the three live test guides, Home and Eat and drink at 360 px.

**Why other guides look plain: four causes.**
1. **Two of the five layouts are white by design.** "Clean and calm" is white boxes with thin lines and no colour at all; "Mediterranean" is one blue on white. "Soft rounded cards" is pale pastels. Only "Big colour tiles" and "Rural" fill their tiles with colour.
2. **The drawn cover.** A guide with no photo gets the same small house on a hill, whatever the house.
3. **An emptier Home.** No Home tiles (the shop, the pizza), fewer markets today, one bin instead of two, and holes in the grid: a lone taxi tile, a lone "What to do" in "Clean and calm".
4. **Bare lists** (gaps A and H): every place has the same icon, no rating, no price, no marks, in every layout.

**Decided (Yohann, 10 Nov 2026): one tile system.** Every guide uses Ca La Kimberly's structure (filled colour tiles with a corner shape). The host picks colours, not a layout, and it must stay easy for someone who is not technical: ready-made colour worlds, merged with "from my picture" (the colours of the cover or the logo), which stays. Conditions: easy to use, the colours look good, contrast is respected. Mockups at 360 px come before any building.

**First mockups (10 Nov 2026), real builds, not drawings.** Ca La Kimberly's own content with only the engine's colour and font tokens changed, at 360 px: Bauhaus summer (today's), Sea, Country, Tropical, City night, Stone, and "From your picture" (tried with a stone farmhouse photo). Waiting for Yohann's view.
- **Roles, not colours.** Every world fills the same five roles: deep, strong and fresh carry white text; light and warm carry dark text; fresh is also the "Open" word on white. Strong stays in the red family in every world, so Emergencies always reads as urgent.
- **Contrast is enforced, not hoped for.** One rule for every palette, ready-made or from a picture: text on a tile, and coloured words on the page, reach 4.5 to 1, by darkening or lightening the colour until they do. All seven pass. Today's rule for colours from a picture stops at 3.2 for white text and checks nothing for dark text; today's red is just under 4.5 as a word on the cream page.
- **"From my picture" merged with the worlds.** The picture's distinct colours take the roles they are closest to; the roles it cannot fill come from the ready-made world nearest to it, with that world's fonts. The farmhouse gave its stone ochre and its sky blue on top of Stone. A picture in one colour family no longer gives a muddy guide.
- **Found while building them.** The icons of the Home tiles and of the bins keep the Bauhaus colours (they are written in the stylesheet, not taken from the palette). Wide title fonts wrap long titles sooner: the UX check found 2 words too wide at 360 px in German and Dutch in Country and in Tropical, none in English. In the first try the picture's ochre took the strong role and Emergencies went brown: hence the rule above.
- **The picker, proposed.** In The look: the cover first, then one row of small phones showing the host's own guide in each world, "From your picture" first when there is a cover or a logo. One tap picks; fonts come with the world; "Fine-tune each colour" stays folded away, and whatever is picked there goes through the same contrast rule.
- **To decide later:** which worlds make the first set, and where guides in the four old layouts go (Rural to Country, Mediterranean to Sea, Clean and calm to Stone, Soft to be decided).

## Not gaps
The look and its colours and fonts; languages and translation; Wi-Fi with several networks; Getting around (taxis with other numbers, stations, lines, journey times, the Home tile); automatic events and their settings; photos and their order; pinning a restaurant to Home; switching sections on and off; drafts, Preview and Publish.

## Order proposed
E (stops new damage), A (the biggest difference a guest sees), B, C, D, then the decisions of F. Step 2 (the builder test) can run before A to D are built: it tells us what else is missing. About 6 to 7 sessions in all before the look (step 3).

## Who does what
- Fable: this list, the design of the "Kind and marks" block and of the rubbish model, the builder test and its reading, the decisions of F, and the review of each change.
- Opus 5.5: building A to E from a written brief each (goal, files, what not to touch, checks: `npm run build`, `ux-check.mjs`, `onboarding-site/test/check.mjs`, screenshots at 360 px in de and fr).
