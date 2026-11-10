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
- **Yohann, 10 Nov 2026:** likes the worlds, as long as a host can still bring a picture, or the artistic rendering of one, and use its colours under the same contrast rules. And the map now looks out of design in the new worlds: to fix (below).
- **The map (10 Nov 2026).** In the first mockups the map boxes were empty: the screenshots had failed to draw the map, they were not the design. The real map is the same grey one (OpenFreeMap "Positron") in every world, and the box's colour before it loads is fixed in the stylesheet. Mocked up with real maps: the map's own colours taken from the world (land from the page colour, sea and rivers from deep, parks from fresh, roads white, names in the text colour), done by rewriting the map style as it loads, so one style serves every world. Found on the way: the pins of places to eat carry white icons on the warm colour, which is a dark-text colour (weak already on today's orange, worse on a light apricot or pink): a pin's icon must take its role's text colour.
- **The pins stay round (Yohann, 10 Nov 2026).** Square badge pins were mocked up and turned down: too crowded on the map. Kept from that try, unless Yohann says otherwise: the icon dark on light pins and white on dark ones; the map credit folded to its "i" (open, it covers a fifth of the small map and hid a pin; to check against OpenStreetMap's credit rule first); the Things to do group colours (sights black, wine burgundy) taken from the world, not fixed in the code.
- **What bothers Yohann on the list pages is the filter chips** ("Any time 12", "Open now 3", the feature chips, "From the house / From me"): white pills with black outlines, the same in every world. Mocked up on real pages in three worlds (10 Nov 2026). **Yohann, 10 Nov: yes, go this way.** "Open now" stays green when chosen (it matches "Open until" in the list) unless he says otherwise:
  - Today: up to seven rows of pills of the same weight before the first place (Things to do in Sea: six rows of chips and the switch), all white with a black outline, in every world.
  - Proposed: no outlines; a chip is a soft patch of the page colour and only the chosen one takes colour; "Any time" goes (a chosen filter is tapped again to clear it); the time and feature filters share one group; "From the house / From me" becomes a small switch. The first place comes about 90 px higher on a 360 px phone.
  - Open points: "Open now" chosen is green today, which matches the green "Open until" in the list, and may be better kept green than given the section's colour; quiet chips look less like buttons than outlined ones.
- **Pictures stay (Yohann, 10 Nov 2026).** A host's own picture, or the artistic rendering of it, gives the colours as today, through "From your picture" and under the same contrast rule.
- **To decide later:** where guides in the four old layouts go (Rural to Country, Mediterranean to Sea, Clean and calm to Stone, Soft to be decided).

## Where a place's facts may come from (10 Nov 2026, after Yohann's question on proposal 2)
Read on 10 Nov 2026: Google Maps Platform EEA Terms of Service (last modified 26 Aug 2026) and EEA Service Specific Terms (last modified 28 Oct 2026); they apply to a billing account with an address in the European Economic Area. Not read yet: the "Places API EEA Permitted Uses" they point to. This is a reading of published terms, not legal advice.
- A place's Google id may be kept as long as we like. Its latitude and longitude may be kept for up to 30 days, then must be deleted or fetched again. Nothing else that the Places API returns may be stored: the terms name "copy and save business names, addresses, or user reviews" as not allowed.
- So a guide must not keep Google's phone, website, rating, price level, address, opening hours or kind of place. What a guide keeps about a place has to come from the host, from the place's own website or another official source, or from OpenStreetMap (already credited on the map; its licence has its own conditions, to read before use).
- Google stays useful for: finding the place and keeping its id, its pin (refreshed within 30 days), the link that opens it in Google Maps, and checks that keep nothing but their result ("still open", "closed for good").
- A rating, or "open now" as Google has it, can only be shown fetched fresh from Google at the moment a guest looks, with Google's credit, never from a stored copy.

**Decided by Yohann (10 Nov 2026).** Always respect the terms of every service we use (now a shared rule in `../CLAUDE.md`). Google is used only to locate a place. No ratings: these are places the host picked by hand. Extra facts may come from a place's own website when it has one. Not from OpenStreetMap.

**Tried on 10 Nov (Claude with the web, Ca La Kimberly's places to eat; 0.54 USD in all).**
- One question for all 12 places, cheap model (Haiku 5.5): 24 searches, 13 pages read, nothing found, 0.25 USD. Again for 4 places with more effort: nothing, 0.22 USD. A long list in one question does not work with the cheap model.
- One short question per place, at most 3 searches: about 6 seconds and 0.024 USD a place. Of 3 places: 2 found their own site (the same sites as the hand-checked guide), 2 gave the phone (one the same, one with a second number), 1 gave its hours, 1 found nothing. A small sample: to measure on all 41 places before building.

**The optimised way, proposed (replaces proposal 2).**
- **2a. Google only locates.** The request asks Google for the place's id and position and nothing else (the cheapest price class of the Places API, to confirm on the price list in the brief). The host confirms the name as they want it shown. The position is fetched again within 30 days by the server's run. Nothing else from Google is kept; the button "Google Maps" opens the place there by its id, where guests see live hours and reviews. Ratings on places go from the engine and from the data.
- **2b. Facts from the place's own website.** When a place is added: one short question per place with the cheap model (its own site, then phone, hours, price per person, "book ahead", kind of place). Kept in our own table by the place's id with the page read and the date, so the same place in another guide costs nothing, and shown to the host as "found on its website, please check", editable. A host can paste the website instead: then it is one page read and no search. Read again when the host asks, or when the monthly check says the place changed. About 0.024 USD a place as measured, so about 1 USD once for a guide of 40 places.
- **2c. What is shown when nothing is found.** The host's name and words, the pin, the distance, the Google Maps button. "Open now" only when hours are known from the website or the host.
- **2d. Bring today's guides in line** (BACKLOG item 62): stored ratings, Google's hours, kinds and towns, positions older than 30 days, what the monthly check writes back.
- **Google's opening hours (Yohann, 10 Nov: "take the most we can while respecting the terms, they are the most up to date").** Read on 10 Nov: "Places API EEA Permitted Uses" (last modified 4 Jun 2025) and the definition of "With any Map" in the EEA Service Specific Terms. For an account billed in the EEA, what the Places API returns, other than a place's id and position, (a) may only be used for nine listed purposes, one of which is to "show information about nearby points of interest [...] to provide context for a real estate listing or rental property being viewed by the user", which a guest guide plausibly is, as a reading; (b) may not be shown on, next to, or visually tied to any map, Google's included; (c) may not be stored. Google's own ready-made component, the Places UI Kit, is exempt from (a) and (b). So, three ways, from the surest:
  1. The "Google Maps" button, as today: live hours in Google Maps itself. Free, always allowed.
  2. Google's own card (Places UI Kit) on a place's page, loaded when the guest taps "Live hours from Google": hours, "open now" and the rest, drawn by Google with its credit, never stored. Allowed next to our map. Costs per load (price to read), looks like Google, needs a connection, and loads Google on the guest's phone (hence on tap, not by itself).
  3. Google's hours in our own design, fetched fresh at each view: only on a page with no map near them, and resting on the reading in (a). Not recommended.
  "Open now" in the lists and the filters keeps coming from hours we may keep (the place's website, the host). The monthly check may not compare our hours with Google's in the background: that is none of the nine purposes; to settle in the terms pass (proposal 19) with the "still exists" check.
- **Google's prices (price list last updated 9 Nov 2026, USD, each line with its own free allowance per month).** Finding a place by its name and getting only its id: free, no limit. A place's position ("Place Details Essentials"): 10,000 free, then 5 per 1,000. What we ask today, with hours ("Enterprise"): 1,000 free, then 20 per 1,000; a search by name with hours: 1,000 free, then 35 per 1,000. Google's own card ("Places UI Kit"): 10,000 free then 1 per 1,000, or 5,000 free then 5 per 1,000, depending on what the card shows (to see in the prototype). So "Google only locates" is free at our size, and the card costs at most half a cent a tap.
- **Prototype of Google's card (10 Nov 2026, Yohann: yes).** Written, not run yet: it needs a browser key of its own (the one we have is for servers and must not be put in a page), limited to our web addresses and to the Maps JavaScript API and Places UI Kit. Yohann creates it in Google Cloud; it goes in `.env` as `GOOGLE_MAPS_BROWSER_KEY`.
- **The Google project and the EEA terms (seen 10 Nov 2026, when enabling "Places UI Kit").** Google Cloud answered that enabling a new API counts as a change to the project `guest-guides-checks` and asks its owner to accept the European Economic Area Terms of Service for that project first, warning that this "may cause breaking changes". So that project has not accepted them yet. Google's page on the change (developers.google.com/maps/comms/eea/faq, read the same day) says: under those terms Places content may no longer be shown with any map, "certain content" is no longer returned (it does not say which), and Google's card (Places UI Kit) is the way to show a place next to any map. It names no way back. Accepting terms is Yohann's act, never Claude's. Safer path proposed: leave the worker's project as it is until the places work (2a, 2d) is ready, and make the card's key in a new project of its own, which is under the EEA terms from the start (also "one key per purpose").
- **Places with no website (Yohann, 10 Nov: many live on Facebook or Instagram; could we take Google's data once, reword it and have the host validate it?).**
  - Facebook: its terms (in force since 1 Jan 2025, read 10 Nov) say data may not be accessed or collected from Meta's products by automated means without its permission. So the research does not read Facebook pages. Instagram is Meta's too; its own terms were not read (the page did not load), the same is expected. A host may paste a place's Facebook or Instagram link and guests get it as a button: linking is fine.
  - Google, taken once and reworded: no. The terms rule out storing it and "creating content based on Google Maps Content"; new wording or a host's tick does not change where it came from.
  - A lawful way to the same business details: Overture Maps "Places", open data whose main source is Meta, with Microsoft, Foursquare and others, and no OpenStreetMap data. Per place: name, category, phone, website, social links, address, whether it still operates. Licences CDLA Permissive 2.0 and Apache 2.0 by source: it may be stored (read on 10 Nov; the credit each source asks for is still to read). Opening hours are not mentioned, so not expected. To test for coverage on Ca La Kimberly's 41 places before relying on it.
  - So, for a place: name, kind, phone, website and social links from Overture or its own website; opening hours only from its own website or the host; and for every place, Google's live card and the Google Maps button, which are the most up to date. "Open now" in the lists will cover only the places whose hours we may keep.
- **Overture tested on Ca La Kimberly's 41 places (10 Nov 2026, Yohann: yes; free, no paid run).** Release 2026-10-21, fetched with Overture's own tool for a box of about 75 by 50 km around the house: 48,093 places, 9 MB, 10 seconds. Scripts and the data stay in the session's scratch folder, nothing in the repo.
  - Of the 41, 30 are places a guest can call or look up (12 to eat, 18 to do); 11 are towns, beaches and a spring, where there is nothing to fill.
  - **Found: 28 of the 30** within 150 m of the guide's pin (10 of 12 to eat, all 18 to do). Missing: one beach bar and one ham bar.
  - **Phone: 27 of 28.** Against the 24 phones checked by hand in the guide: 22 the same, 1 different, 1 missing.
  - **Website: 24 of 28.** 16 are the guide's own; 8 differ. Of those 8, opened on 10 Nov: 4 are fine (the same business's other address, or its menu page), 1 answers with an error, 3 are dead or wrong (one does not answer, one "not found", one now leads to an unrelated foreign site).
  - **Facebook page link: about 25 of 28.** A link only, as a button; we do not read the page.
  - **Kind: right or near for about 24 of 28** (a restaurant filed as a food shop, a museum as a "community service", a pitch and putt as a "stadium"). Good as a first guess for the host's card, not as the truth.
  - **Opening hours: none**, as expected; the field does not exist. "Still operating" is empty on 4 records in 10, so it does not replace the "still exists" check.
  - What goes wrong if matched carelessly: the same place two or three times with different phones or websites; another business with the same name next door (the spring "El Riuet" and a restaurant called El Riuet 21 m away; the village "Altafulla" and a school); some records placed up to 2 km off; and the date on a record is the release's, not the day the fact was last true.
  - **So, if we use it:** a record is taken only when it sits within about 150 m of Google's position and carries the name the host confirmed, else nothing; phone, website, Facebook link and a first guess of the kind go into "Filled in for you"; a website from Overture is opened before it is shown (it answers, on its own address, and the page is about this place); and it gives proposal 2b the page to read, so Claude reads one page for the hours instead of searching for the site (cheaper, to measure). The worker fetches the box around a house once and again with each monthly release.
  - **Licence, as read on 10 Nov** (docs.overturemaps.org/attribution and the CDLA Permissive 2.0 text): the data may be used, changed and shared; the one condition is to make the agreement's text available with data that is shared; no credit is required. Foursquare's part is Apache 2.0 with its copyright line. Proposed: one line in a guide's credits naming Overture Maps Foundation and its sources, with the licence link and Foursquare's notice. To confirm in the terms pass (proposal 19).
- **Decided (Yohann, 10 Nov 2026): a place's page always has opening hours, unless they exist nowhere.** In this order: hours we may keep (the place's own website, or the host), else Google's hours fetched live when the guest opens the page. Within the terms the live ones can only be Google's own card (Places UI Kit): our place page has a map, and Google's data in our own design may not sit next to one. So the fallback is that card, on the place's page. Still open: whether it loads by itself or after one tap that the guest's phone remembers (it loads Google on the guest's phone: a privacy question to settle with the terms pass); the price per load (prototype, waiting for the browser key); and the list pages, where "Open now" and the status of a row can only come from hours we keep.
- Open detail: a place's town in the list ("Bakery, El Vendrell") comes from Google's address today. To come from the website or the host; not worked out from Google's position, which the terms also rule out.

## Proposal 3, the design: "Kind and marks" in a place's card (mocked up 10 Nov 2026, waiting for Yohann's view)
**Corrected the same day (Yohann: "the guide should be made quick [...] as much as we can pre-fill, the better"; the first mockup showed a form to fill).** The host gives a place's name and, if they like, a few words. Everything else is filled in for them and shown as found, to look at once:
- **Just added:** "Looking for its website…", and the host goes on to the next place.
- **Found:** a block "Filled in for you" with the kind and its icon, the hours, the price, the phone and the marks, the site they came from and the date, and one link, "Change". The form below (the first mockup) only opens behind "Change". "Our favourite" stays a switch on the card: only the host knows.
- **Nothing found:** the kind, guessed from the name and the host's words, and a plain line: guests still get the pin, the distance and the Google Maps button; nothing for the host to fill in; a field to paste the place's website if it has one.
- Where the filling comes from, within the terms: the place's own website (proposal 2b) for hours, phone, price and "book ahead"; the kind and marks worked out by Claude from the name, the host's words and that website, never from Google's own kind.
So proposals 2a, 2b and 3 are one piece of work, in that order: locate, fill, review.

What follows is the form behind "Change".
Drawn in the maker's own styles with the guide's own icons, at 360 px in English and French. Everything in it is typed or chosen by the host: nothing comes from Google.
- **Kind.** One choice gives the place its icon and, in Attractions, the filter it sits under and its colour. Shown as one line ("Fish and seafood · Change"); "Change" opens a grid of icon tiles, three across. Eat and drink: 12 kinds (restaurant, pizza, paella and rice, fish and seafood, grill and ham, fine dining, home cooking, vegetarian, bakery and café, café or bar, beach bar, roadside). Attractions: 21 kinds under the five filters (Activities, Beaches, Wine, Sights and towns, Nature and walks). All are icons the engine already has. Markets: their five kinds. Events: their ten kinds.
- **Marks,** as chips, also the filters guests use. Eat and drink: Dog friendly, Vegetarian options, Gluten-free options, Terrace, Sea view, Book ahead. Attractions: Great for kids, Dog friendly, Free, Rainy day, Book ahead. Markets: what they sell, and "Not held on public holidays".
- **Our favourite:** a switch; guests see "Unmissable". For two or three places.
- **Price per person** as "from, to" on one line, and **set menus** as rows (Menú del día or Tasting menu, with its price).
- **Hours:** on each line of hours, "Only part of the year" with its two dates; "Open 24 h" as a switch; for a market, which week of the month.
- To tidy in the build: the menu's name is cut in its small box, and the season's two dates should sit on one line.
- Later, with the countries (phase 2): kinds and marks that depend on the country ("Menú del día", human towers as an event kind) come from the country's profile.

## Not gaps
The look and its colours and fonts; languages and translation; Wi-Fi with several networks; Getting around (taxis with other numbers, stations, lines, journey times, the Home tile); automatic events and their settings; photos and their order; pinning a restaurant to Home; switching sections on and off; drafts, Preview and Publish.

## Proposals, to go through one by one
Each is one yes or no from Yohann, then one brief for Opus 5.5, built, checked (every site built, UX check, the maker's check, 360 px in de and fr), reviewed by Fable, committed; Yohann pushes. Sizes are Opus sessions of about half a day. Status is written here as each is decided.

| # | Proposal | Closes | Size | Status |
|---|---|---|---|---|
| 1 | **The editor never publishes an empty thing.** Empty lines, stations, places and tiles are dropped on Publish; a place with no name is said so before. A new place starts blank instead of copying the first one's icon, filter and marks. | E, the bug in A | 0.5 | **done 10 Nov** (7379436, not pushed): built by Opus, reviewed by Fable, 254 checks pass |
| 2 | **A host's place comes with what Google knows.** At the build and at "Find it on Google": phone, website, rating, price level, address, and an icon from Google's kind of place. | H | 1 | **withdrawn in this form, 10 Nov** (see "Where a place's facts may come from") |
| 3 | **"Kind and marks" on every place in the editor.** Kind (sets icon, filter, colour; a market's or an event's kind), marks per section (Great for kids, Dog friendly, Free, Vegetarian options, Book ahead), "Our favourite", set menus, open 24 h, a season on a line of hours, the week of the month for a market. No ratings (Yohann, 10 Nov). | A | 1.5 | yes 10 Nov; the picker is mocked up first |
| 4 | **One tile system in colour worlds.** The six worlds and "From your picture" (a photo, a logo or the artistic cover), one contrast rule for all, the picker as a row of small phones in The look, fonts with the world. The icons of Home tiles, bins and Things to do groups take the world's colours. The four old layouts go; their guides move to the nearest world. | Step 3 | 2.5 | direction agreed, to confirm as a build |
| 5 | **Quieter filter chips** on the list pages, as mocked up. | Step 3 | 0.5 | agreed 10 Nov |
| 6 | **The map follows the world.** Its colours from the palette, the pins round as today with an icon that reads on its colour, the credit folded to its "i" if OpenStreetMap's rule allows. | Step 3 | 1 | to decide |
| 7 | **A cover for guides with no photo** that is not the same small house for everyone. Needs a mockup first. | Step 3 | 0.5 + mockup | to decide |
| 8 | **Rubbish in one shape.** Kinds a host can add and remove, a text per bin, containers with opening hours (the recycling centre), the host's sorting steps instead of the default ones, a map point from a short Google Maps link. Ca La Kimberly's file moved to it. | B, L | 1.5 | to decide |
| 9 | **House guide parts.** Add and remove a part, pick its icon and colour, move a line to another part, the paragraph under the lines, a link to a section, a line under every title. | C, K | 1 | to decide |
| 10 | **The small fields.** The guide's own lines of text, contact groups and hours, the picture under a shared link, the house's point and the radius, where the cover is cropped, highlight icons, adding a room, tile icons and the wide tile, the taxi's website; the lone-tile hole on Home; the browser bar colour; the reviews link. | D, M, N | 1.5 | to decide |
| 11 | **The research knows the village.** Find out why the 4 Nov research missed the house's own village market and its contacts (the listing's "town" is a housing estate), then brief it with the municipality and "nearest villages first". A look by Fable first, with one or two test searches (about 1 to 2 USD), before any build. | J | look, then 1 | to decide |
| 12 | **A town as a place to go.** "Barcelona", "Sitges": a pin on the town, no 50 km limit for a day trip, its own icon. | I | 0.5 | to decide |
| 13 | **Monthly Find more for every guide,** not only Ca La Kimberly, or for none. A cost question: each search is paid. | F1 | decision, 0.5 | to decide |
| 14 | **No "hand-made" mode in the monthly check.** Ca La Kimberly is checked and fixed like any guide, official hours still protected as for every guide. | F2 | 0.5 | to decide |
| 15 | **Its own address.** Keep ca-la-kimberly.netlify.app as a paid-for kind of thing any host could have later, or move guests to porta-guides /g/ca-la-kimberly. | F3 | decision | to decide |
| 16 | **The day-rental site reads the guide from the database,** not from the folder; then the folder `sites/ca-la-kimberly`, `guide:push` and the guide's own Claude session can go (design notes and sources kept in `docs/`). | F4, F5 | 1 | to decide |
| 17 | **Leftovers removed** from Ca La Kimberly's data (fields nothing reads, unused cover pictures), and its "written in" language set. | F6, F7 | 0.5 | to decide |
| 18 | **The acceptance test** through the maker's own screens (step 2, second half). | all | 1, about 1.5 USD | agreed 10 Nov, at the end |
| 19 | **Every service's terms, read and respected** (Yohann's rule, 10 Nov): one pass, service by service, starting with the listing reader and the listing photos; then what must change. By Fable. | rule | look, then to size | to decide |

Order proposed: 1, 2, 3 (places, what guests see most), 4, 5, 6, 7 (the look), 8, 9, 10, then 11 and 12 (research), 13 to 17 (the special cases), 18. About 16 sessions in all.

## Who does what
- Fable: this list, the design of the "Kind and marks" block and of the rubbish model, the builder test and its reading, the decisions of F, and the review of each change.
- Opus 5.5: building A to E from a written brief each (goal, files, what not to touch, checks: `npm run build`, `ux-check.mjs`, `onboarding-site/test/check.mjs`, screenshots at 360 px in de and fr).
