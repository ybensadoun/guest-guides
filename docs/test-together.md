# The test together: what to try, module by module

Yohann, 16 Nov 2026: "We're gonna go through a run through together, probably in the Chrome browser, where I will be
filling in, but you will be reading [...] go module by module and send the feedback and the fixes, and then go back and
do another testing session." This page is the list for that session. Yohann does the steps in the maker
(porta-guides.netlify.app); Claude reads along, notes what is wrong, fixes after, and the list is gone through again.

How to note a problem: the step, what was expected, what happened, on which width (desktop or phone). A picture helps.
Nothing reaches guests until "Publish changes". A paid search is marked (paid).

## 1. Getting around (built 16 Nov 2026, never used by a real host)

### In the editor, on the pool house (it has one taxi and no station)
| # | Do | Expect |
|---|---|---|
| 1.1 | Open Getting around | Three parts in order: Taxi, Trains, Public transport |
| 1.2 | Look under the taxi | "Near your house": taxis from our directory, each with town, distance and number; the guide's own taxi is not among them |
| 1.3 | Pick one of them | It is added at once, opened, with "From an open directory" and the date; it leaves the list |
| 1.4 | Look at "Ride apps" | Four switches (Uber, Cabify, Bolt, Freenow), none marked "works near your house" (no served city within 12 km). The first time, this makes the one search for the four apps (paid, about 0.70 USD) |
| 1.5 | Switch Uber on, then off | The step says "Changed"; on and off both save |
| 1.6 | Look at Trains | "Near your house": El Vendrell (Closest), Sant Vicenç de Calders (Faster), Camp de Tarragona (High speed), with their lines in colour |
| 1.7 | Pick Camp de Tarragona | Added at once with AVE, Euromed, Avant, Intercity and journey times. Within a minute or two, iryo and Ouigo badges join, with "checked on" and the date. The first time, this makes the one search for the two companies (paid, about 0.70 USD) |
| 1.8 | Type "sant vic" in "Type a train station" | Sant Vicenç de Calders is offered with its seven lines; picking it adds it |
| 1.9 | Type a station already added | "Already in your guide." |
| 1.10 | Open "Not in the list?" | The old way: a name or a Google Maps link |
| 1.11 | Close the cards | Closed rows show the lines as coloured badges, nothing cut or overlapping |
| 1.12 | Preview, then Getting around in the phone | Taxis, apps if any, then Train with the map and the stations; a station opened shows its times and "Timetable" |
| 1.13 | In the preview, Sources and credits | A part "Trains" with "Origen de los datos: Renfe Operadora" and the data's date |
| 1.14 | The same on a phone (360 px wide) | Nothing overlaps; the rows wrap cleanly |

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 1.20 | Paste a listing link, go to "Only you know" | Under Getting around, a sentence about taxis (not about 112). After the research answers: "Taxis near your house", the nearest ticked, "Suggested for you: please check" |
| 1.21 | Untick it, tick another, type one in "Another taxi" | The phone preview follows |
| 1.22 | In a served city only: "Ride apps that work near you" | The apps ticked for you |
| 1.23 | Build the guide | Getting around has the taxis you approved, its stations and its nearest stops by themselves, and iryo and Ouigo on a high-speed station |
| 1.24 | Build one without opening the step | The guide has the nearest taxi by itself |

### Public transport, in the editor (built 16 and 17 Nov 2026; the pool house is in the country, so its stops are buses)
| # | Do | Expect |
|---|---|---|
| 1.30 | Open Getting around, look at Public transport | "Near your house": the nearest stops by distance, each with its lines as badges and "n min on foot" or the km |
| 1.31 | Pick one | Added at once, opened: "Lines and how often" with its source and the date of its data, each line with how often in words, never a number of buses |
| 1.32 | Look at the opened stop's fields | "In a few words", "Minutes on foot from the house" (or "by car" for a far one, never both), "What guests need to know"; under them only "Change the name or the timetable link" |
| 1.33 | Type "vendrell" in "Type a stop or station" | El Vendrell's bus station once, as "El Vendrell (estació d'autobusos)", with the lines of both directions |
| 1.34 | Type a stop already added | It is listed with "Already in your guide." |
| 1.35 | Preview, then Getting around in the phone | After Train, a part Bus with the stop: its badges, minutes on foot; opened, its lines with how often, Directions and Timetable |
| 1.36 | In the preview, Sources and credits | One line for the stop's publisher with the date of its data, and "Powered by MITRAMS" |

### A house in a city (the test house if it is in one; else type the stations and stops by name)
| # | Do | Expect |
|---|---|---|
| 1.40 | Getting around, Trains, in a guide whose house is in Barcelona, Madrid or València | The station nearest to the house, "Closest", with minutes on foot, and the city's main station, "Main station" (Sants, Atocha); in València's centre, València Nord alone |
| 1.41 | Open the nearest station | Journey times to other cities only, never to the city the house is in |
| 1.42 | Public transport there | Metro stops first by distance, each line "Every 15 min or more often" (Madrid's read "A few a day" until the fix of 17 Nov) |
| 1.43 | Names of the stops | In ordinary letters ("Gran Via"), not in capitals; no badge twice |

### Known, not to report
- Madrid's metro file has no trip of line 3: Puerta del Sol shows lines 1 and 2. Metro Bilbao has no L1 or L2. A name written in capitals by its operator keeps the accents it lacked ("Gran Via").
- The same bus stop published by two operators is listed twice (Madrid's city buses).
- A found taxi is not checked again after it is added.
- Minutes by car are a guess from the distance.
- Madrid from Camp de Tarragona reads 3 h 10: a time several trains a day really make (one train makes 2 h 37).
- Brand colours: only AVE, Avlo, iryo and Ouigo have their own; Avant, Euromed and Intercity are purple.
- When a day's research budget for visitors is spent, the builder shows no taxis; the build still adds the nearest.

## 2. Home page, the board (built 15 and 16 Nov 2026)
| # | Do | Expect |
|---|---|---|
| 2.1 | Open Home page in the editor | The guide's Home as tiles, in its two groups, the welcome card and What's on locked at each end |
| 2.2 | Drag a tile (on a phone: press, then drag) | It moves; the page still scrolls under a finger |
| 2.3 | Tap a tile | Its panel: what it shows, only the sizes it offers, Earlier and Later |
| 2.4 | Set a lone tile to Half | The board shows it wide, as guests will see it, with one line saying why |
| 2.5 | "Add to your home page" | A place to eat, something to do, another place, the next local event |
| 2.6 | "Back to the arrangement we suggest" | One confirmation, then the default |
| 2.7 | Preview | The phone shows the same arrangement |
| 2.8 | Open a card's words ("Edit its words") and give it a very long word as its name, such as "Lebensmittelgeschäft"; tap the card on the board | The card is wide, its switch still says Half, and one line says why: "Shown wide: one of its words is too long for half the width." Put the name back after |
| 2.9 | In the guide on a phone, Home in Spanish, Dutch and French, by day and late in the evening | No word is cut in two on a tile or a card ("si-tios", "favo-riete", "domi-cile", "Opens to-morrow" are gone); nothing overlaps |
| 2.10 | Open Guide sections | No switch "Places on the home page" any more; one switch for each section and the map |

Known, not to report:
- A card may be wide in one language and half in another, when only one language has a word too long.
- A middle dot can begin the second line of a card's status ("· Reopens at 18:00").
- Moving a tile from one group to the other is not built: a drag out of its group goes back.

## 3. Markets (the empty day and the evening, built 19 Nov 2026)
On a phone, as a guest: Ca La Kimberly (ca-la-kimberly.netlify.app) and the pool house
(porta-guides.netlify.app/g/ca-la-kimberly-pool-house), which has few markets and so has days with none.
| # | Do | Expect |
|---|---|---|
| 3.1 | Ca La Kimberly's Home in the morning, before the markets close | The Markets tile says "7 today" (the day's number) |
| 3.2 | The same Home after the day's last market has closed (most days after 14:00) | The tile says "9 tomorrow"; when tomorrow has none, the next day by its name ("3 on Wednesday") |
| 3.3 | Tap the tile in the evening | The list of that next day, its heading "Tomorrow · Tuesday 17 November", the markets with their hours |
| 3.4 | On that page, tap today in the strip of days | Today's markets, each "Finished" in grey with when it is next held ("Opens 23 Nov"); never "Closed" in red |
| 3.5 | Home in the evening, What's on, open "Today" | The same "Finished" under each market's name; "All markets" at the end opens the next day, as the tile does |
| 3.6 | The pool house's Markets page on a Sunday (tap it in the strip: its number is 0) | "No markets on this day." (on the day itself: "No markets today.") and one button to the next day that has one, "Tuesday 1 · 3 markets" |
| 3.7 | Tap that button | The list of that day |
| 3.7b | The pool house's Markets page on a Monday (0 too, but a market hall is open) | "Only covered markets are open." with "Show all types", which lists the hall, then "Tomorrow · 3 markets" |
| 3.8 | Ca La Kimberly's Markets page: Filters, keep one kind only (Flea market), then tap a day that has none of it | "No markets match these filters." with "Show all types": this box only after your own filters |
| 3.9 | 3.2, 3.4 and 3.6 in German and in French | Nothing cut, nothing over anything else |

### Known, not to report
- A yearly fair whose date is only written in words is in "All" and on no day (to decide with Local events).
- The market halls are not in the tile's number and not in the day's list until "Show all types" (they open every weekday).

## 4. Local events (the step never used by a real host)

### In the editor, on the pool house (8 events from its build, "Keep events up to date" off)
| # | Do | Expect |
|---|---|---|
| 4.1 | Open Local events | On top "Finding events": how guests get around (By car, In a city), the switch "Keep events up to date" (off), topics to skip, things to look for, "Search now". Under it the guide's events, each with its kind's icon and its town |
| 4.2 | Open an event | Name, Kind with "Change", Description, Town, Where exactly, Official website, Find it on Google, the pin, its dates |
| 4.3 | Kind, "Change" | Eighteen kinds as icon tiles, with a search: "castells", "torres humanas" or "tours humaines" all find Human towers. Picking one changes the icon on the row |
| 4.4 | In its dates, set today, a start time an hour ago and no end; Preview | The phone's Local events page: the event first, "On now" in green; its row opened says the end time is not given. On Home, What's on names it under Today |
| 4.5 | Set its end time to ten minutes ago; Preview | "Ended" with the hour under it, the row greyed, after today's others. Put the date back afterwards |
| 4.6 | "Expected" or "Confirmed" on a date | An expected date says "Expected" on its row and, opened, that the dates come from previous years |
| 4.7 | "+ Add an event", give it a name and a town, no pin | In the preview its "Google Maps" button searches the town: never a pin at the house |
| 4.8 | "Find it on Google" on that event, pick the square or the venue | The preview's "Google Maps" button opens that very place |
| 4.9 | Preview, open an event the research found, "Google Maps" | Google Maps opens on a pin at the event's position (the centre of its town when the research knew no better) |
| 4.10 | Add "jazz" to "Things to look for", then "Search now" (paid, about 1 to 2 USD) | "A search usually takes 3 to 6 minutes", you can keep editing. Then cards one at a time, "Suggestion 1 of n", with dates and "expected" or "confirmed": "Add to my guide" or "Not for us" |
| 4.11 | Switch "Keep events up to date" on (paid: the first search starts at once) | New events go straight into the guide, marked "added automatically" on their row; "Last search" and how many were added |
| 4.12 | Delete an event that was added automatically ("Sure? Tap again") | It is gone and a later search never brings it back |
| 4.13 | Home page, "Add to your home page", Local events | A wide tile "Next: <event>, <date>" (or "Today: <event>") |
| 4.14 | The same step on a phone (360 px wide) | Nothing overlaps; the chips and the date fields wrap cleanly |

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 4.20 | Build the guide without doing anything for events | The builder has no step for events: the guide opens with the events the research of the area found for the next three months (small ones within 10 km, the main ones as far as the host's distance; 8 for the pool house), each with a kind, a town, dates and its official page |
| 4.21 | Open the built guide on a phone, Home, down to What's on | The events of today and the days ahead; "All events" opens the page, by month, soonest first |

### Known, not to report
- The step opens on the search settings, not on the events, and a closed event row shows no date: both are in the list of fixes for hosts (`04.2`, `04.6`).
- Most dates say "Expected" until an official source gives the year's dates; the monthly search does not confirm an event the host wrote (`04.3`, Yohann's decision).
- The page lists a whole year, with no distance on a row (`04.4`, `04.5`).
- The first monthly search of events by the server is 1 Dec 2026: until then only "Search now" and the switch bring new events.
- An event's time has no end unless a source gave one: a village festa then stays "On now" until midnight, human towers for two hours.

## 5. Eat and drink (the page the three lists of places share, changed 21 Nov 2026)
Things to do and Nightlife are drawn by the same page: what is said here of the filters and the rows holds on their
lists too (their own steps: sections 6 and 10, when written).

### In the guide, on a phone (Ca La Kimberly and the pool house, Eat and drink)
| # | Do | Expect |
|---|---|---|
| 5.1 | Open "Our favourite places to eat" | The small map, then quiet chips with no outline (a soft patch of the page colour), then the small switch "From the house / From me", then the places. No "Any time" chip |
| 5.2 | Look at the chips at lunch time, then late in the evening | "Open now" and "Opens later today" each show only when they hold a place, with their count. When nothing is open or opening later, no time chip at all |
| 5.3 | Tap "Open now" | It turns green and the list keeps the open places; places whose hours we do not hold come after, under "Hours not known, check before going" |
| 5.4 | Tap "Open now" again | It is cleared and every place is back |
| 5.5 | Tap "Dog friendly", then "Vegetarian" too | Each turns dark; the list keeps the places that have both; a second tap clears one |
| 5.6 | Tap "From me" (allow the position) | The switch's white side moves; rows say both distances, nearest to you first |
| 5.7 | Read a closed row | The name on the row's whole width; under it one line: kind, town, distance, price; then the status on its own line ("Open until 16:00 · Reopens at 20:00", "Closed · Opens tomorrow 13:00"); then two lines of the host's words; then the marks |
| 5.8 | Look at the pool house's rows | The town is there beside the kind ("Pizza · El Vendrell"). On Ca La Kimberly the kind already holds the town and it is not said twice |
| 5.9 | Open a row | The two lines of words leave the row and the full text is in the opened part, with the address, the hours and the buttons |
| 5.10 | The same in German and in French | No word cut in two, nothing over anything; a long line wraps between its pieces, a distance or a price is never split |
| 5.11 | Open Markets, Rubbish's glass container, and the map's list | They look as before (their rows did not change) |

### After midnight (a place that closes after midnight)
| # | Do | Expect |
|---|---|---|
| 5.20 | Ca La Kimberly, Things to do, in the night of a Friday or a Saturday, between midnight and 2:00: "Bowling & Arcade El Vendrell" | "Open until 2:00", under "Open now" (before: "Closed, Opens at 17:00") |
| 5.21 | The same place at 2:00 | "Closed · Opens at 17:00" |

### In the maker (nothing changed there on 21 Nov; to try on the test house)
| # | Do | Expect |
|---|---|---|
| 5.30 | Builder, Eat and drink: type a place's name and pick it from the list | The row keeps the place's own name (not the words typed to find it), and the phone shows it |
| 5.31 | Add a comment under it | It is the line guests read in the closed row |
| 5.32 | Editor, Eat and drink: open a place | Name, Your comment, Our favourite, then "Filled in for you" (kind, hours, price, phone, website) with "Change" |

### Known, not to report
- A pasted Google Maps link stays a web address in the builder until the guide is built (fix `05.3`, after the test).
- The pool house's three names still end with their town ("Llépol Vila-rodona"): to change in the editor (`05.1`).
- In the pictures made by the checks the small map is empty; on a real phone it draws.
- A long host comment ends with "…" after two lines, sometimes inside a word: the full text is one tap away.
- A place with four marks has four lines of marks: unchanged, to look at with the one tile system.

## 6. Things to do (the deck and the found places in the host's language, 21 Nov 2026)
Do it once in Catalan or Spanish (the language picker at the top, or `?lang=ca` in the address): Wednesday's hosts
work in those. The guest's list page (the chips, a place's row) has its steps after Restaurants' change to what the
three lists share is live: they are not here yet.

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 6.1 | Go to Attractions | The card's place is there at once; the words "Looking for places near you…" only if it takes more than a moment; nothing says "best-rated" |
| 6.2 | Look at a card the research found (it has a line of description) | Its kind is in your language ("Castell · 9,4 km"), the distance with a comma in Catalan, Spanish and French |
| 6.3 | Read that card's description | In English until the guide is built: known, see below |
| 6.4 | Look at a card from Google (a photo, a rating) | Its kind in your language, "★ 4,6 (1.204 ressenyes)", "Google Maps" beside it |
| 6.5 | Click "Recommend", then "Not for us", several times, quickly | The two buttons never move; the count says "3 of 25" |
| 6.6 | While the deck is open, wait for the research (about 4 minutes after the account) | The count grows in place ("3 of 33 · 8 more places found"); the card in hand stays |
| 6.7 | Under "Your picks", write a line on one | It stays while cards come; the phone beside shows the pick, its kind and "9,4 km" |
| 6.8 | In "Add your own", type "sitg" | "Sitges · Poble o vila · Barcelona · 31 km" first, "GeoNames" beside the towns; Google's rows below |
| 6.9 | Pick it, build the guide | Things to do holds Sitges with a pin on the town, the town's icon and no hours |
| 6.10 | The same deck on a phone (360 px wide): drag a card right, then left | It follows the finger; "Recommend" and "Not for us" stamps; nothing overlaps |

### When the guide is ready, and in the editor
| # | Do | Expect |
|---|---|---|
| 6.20 | The screen "Your guide is ready", when the build found places you have not seen | "Found near you · 1 of 4": the place's kind and description in your language, "a 10,6 km de la casa" |
| 6.21 | Keep one, skip one | Only the kept one goes into the guide; "Open my guide" becomes the main button |
| 6.22 | Open a guide written in English with the maker in Catalan, Attractions, "Find more" (paid, about 0.70 USD), wait | Each suggestion reads in Catalan when the guide has Catalan among its languages; else its kind in Catalan and its description in the guide's language |
| 6.23 | Attractions in the editor, the rows | Each row's distance with a comma ("14,2 km") |
| 6.24 | Open a place, "Change" its kind | The grid of kinds; the row takes the new icon and, for guests, its quick filter |

### Known, not to report
- Before the build, a found place's description is in English in every language of the maker: the research writes in
  English and the build translates. Its kind and its distance are in the host's language. Translating at the research
  would be one more paid call a house (well under 0.01 USD); not decided.
- A found place's own kind in words ("Seaside village") becomes the kind's plain name ("Poble o vila") before the build.
- A place's coordinates under "move the pin" keep their points (41.2345): they are not distances.
- The deck is one card at a time on a desktop too (a grid to tick is a proposal, not built).

## 8. Rubbish (the default texts, the "no day" card and the header: 19 Nov 2026; the editor's and builder's step: 21 Nov 2026)

### In the editor, on the pool house (collected at the house, one glass container)
| # | Do | Expect |
|---|---|---|
| 8.1 | Open Rubbish | "Bins out by" with a time field, then "What goes where" (five cards, each closed row saying its days or "No collection day"), "Containers guests can use", "How to sort", "If a collection is missed" |
| 8.2 | Open a card of "What goes where" | Name over the full width, Collection days, What goes in it. No "Goes in" list (this guide names no bins) |
| 8.3 | Tick or untick a day | The step says "Changed"; the closed row follows |
| 8.4 | Set "Bins out by" to 7:00, then Preview, Rubbish | "The week" says "Collection starts at 7:00"; before 7:00 on a collection morning the tile says "Before 7:00" |
| 8.5 | "+ Add containers", say where, tick what they take | A new card, open; in the preview "Where the containers are" shows it with its kinds |
| 8.6 | The same on a phone (360 px wide) | Nothing overlaps; the day chips wrap cleanly |

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 8.10 | "Only you know", Rubbish | One question first: how rubbish is collected |
| 8.11 | Choose "Bins collected at the house" | The containers, the days of each bin, "Bins must be out by" and "Anything guests must know" open; no photo is asked |
| 8.12 | Tick days for two bins, leave general waste empty | The phone preview lists the bins with their days |
| 8.13 | Choose "Shared containers in the street" instead | The days and the hour go; the containers stay |
| 8.14 | Build the guide in six languages | Rubbish reads in each language (steps, what goes where, a missed day), with no colour in a name ("Packaging") and "du" in German |

### As a guest, in the built guide (phone)
| # | Do | Expect |
|---|---|---|
| 8.20 | Home, on an evening before a collection | The Rubbish tile says "Tonight" and names the bins |
| 8.21 | Home, on an evening with no collection the next morning | The short tile, "Nothing tonight" |
| 8.22 | Open Rubbish | The header's title and the line under it stay beside the yellow corner, never under it, in every language |
| 8.23 | "What goes where" | A kind with days shows them; glass says "Any time" (a container takes it); a kind with no day and no container says nothing under its name |
| 8.24 | A house with street containers only | No "Tonight" and no week; the tile says "Street containers, any time" |

### Known, not to report
- The pool house keeps the texts it was built with (English steps in Catalan and Dutch, "Packaging (yellow)", "Sie") until they are brought up to date: its own step, with Yohann's yes.
- A host cannot add a kind of rubbish, name a bin or give a bin that goes out every evening (as Ca La Kimberly's red bin): the "one shape" work, after the test.
- The host's own notes come after the four general steps, and may repeat one.
- A container whose Google Maps link is a short one gets no point on the guide's map; its "Open map" button works.
- Before the collection hour the header's title takes three or four lines on a narrow phone.

## 9. Contacts: the page Emergencies (the status line and the numbers changed 21 Nov 2026)

### In the guide, on a phone (the pool house, then the test house)
| # | Do | Expect |
|---|---|---|
| 9.1 | On Home, tap the red tile "Emergencies" | The page: groups, most urgent first; the emergency number first, with the largest red button |
| 9.2 | Read the numbers on the buttons, then tap one | Each number in groups ("977 25 79 14"), never one long run of digits; 112 and 061 as they are. The phone's own dialler opens with the number in it; nothing is called by itself |
| 9.3 | Look at a contact with hours while it is closed (the pharmacy in the evening) | One line: "Closed" in red, a dot, "Opens tomorrow 9:30" (or the day), all in one size; under it, its week |
| 9.4 | The same contact while it is open (a weekday at 10:00) | "Open until 13:30" in green, the time green too; with an afternoon opening, a dot and "Reopens at 17:00" |
| 9.5 | The same in Spanish, Catalan or German on a narrow phone, while it is open | When the two parts do not fit one line, the second is whole under the first; no line starts with a dot, no time is cut |
| 9.6 | A contact that never closes (112, the hospital) | "Open 24 h" in green, no week |
| 9.7 | Tap "Map" on a contact, then "Website" | Google Maps on that place; the contact's own site, in a new tab |
| 9.8 | Change the language (the round button, top right) | Names, explanations and group titles in that language; the numbers the same |
| 9.9 | Read the whole page | No host's name or number anywhere, nothing telling the guest to call the hosts |

### In the editor
| # | Do | Expect |
|---|---|---|
| 9.10 | Open Contacts | The guide's groups, each contact a closed card with its name |
| 9.11 | Open a card, change its phone or its explanation | The step says "Changed"; Preview shows it; guests see it after "Publish changes" |
| 9.12 | "+ Add a contact" under a group | A new empty card, opened, in that group |
| 9.13 | "Delete this contact" | It leaves the list and the preview |
| 9.14 | The same on a phone (360 px wide) | Nothing overlaps; the fields are full width |

### Known, not to report
- A guide the maker builds has two groups only (emergencies, health): no police, town hall, power cut, vet or poison
  line yet. The four groups need one paid research, after the test (fix 09.1).
- The editor cannot add a group, switch "open 24 h" on, or give hours to a contact that has none (fix 09.3).
- Nothing tells the host which numbers came from a search and should be checked (fix 09.2).
- The page's title, its first group and its first row all say "Emergencies" (fix 09.5).
- Contacts are not on the map (fix 09.6).

## 10. Nightlife (off unless the host switches it on; never used by a real host)
Nightlife is drawn by the page Eat and drink has: its filters and its rows are section 5's. Here only what is
Nightlife's own: switching it on, and what a guest reads in the night.

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 10.1 | The look, "What goes in your guide" | Nightlife is in the list ("Late bars, clubs and live music you recommend."), not ticked |
| 10.2 | Tick it | The step Nightlife joins the path right after Eat and drink; the phone gets a dark Nightlife tile |
| 10.3 | Open the step, "Add a place": type a late bar's or a club's name and pick it from the list | The row keeps the place's own name; the phone's Nightlife page lists it |
| 10.4 | Add your comment (what it is like, when to go) | The phone shows it with the place |
| 10.5 | Build the guide | Home has Nightlife after Things to do: a dark bar across the page, with a moon; its page lists your places, nearest first |
| 10.6 | Build one with Nightlife ticked and no place | The guide has no Nightlife: no tile, no empty page |

### In the editor, on the pool house (Nightlife is off there)
| # | Do | Expect |
|---|---|---|
| 10.10 | Guide sections | Nightlife is there after Attractions, not ticked; no Nightlife among the steps |
| 10.11 | Tick it | The step Nightlife appears right after Eat and drink |
| 10.12 | Open it, "+ Add a place", "Find it on Google": a late bar or a club | The card says "Looking for its website and hours…", then "Filled in for you" (kind, hours, phone, website) |
| 10.13 | Preview, Home in the phone | Nightlife after Things to do, a dark bar across the page; a tap opens its page: the title, "Our favourite places for the evening and the night: bars, clubs and live music.", the small map, the places |
| 10.14 | In the preview, the map | A tab "Night" ("Nachts", "Nuit") after "To do", with the places of the list |
| 10.15 | Home page (the board) | Nightlife's tile can be moved, and set to half, wide (a bar, as the Map's) or tall; "Add to your home page" offers a place of Nightlife as a card with a moon |
| 10.16 | The preview in German and in French, on a phone (360 px wide) | "Nachtleben", "Vie nocturne"; no word cut in two, nothing over anything |

### As a guest, in the night (a place whose hours end after midnight, say Fri and Sat 23:30 to 5:00)
To try without staying up: set the computer's or the phone's clock, then reload the guide. Seen on 21 Nov 2026 on a
made-up list, in German and French at 360 px, at 18:00, 23:45, 0:30, 1:30, 2:30 and 5:00.
| # | Do | Expect |
|---|---|---|
| 10.20 | Saturday at 18:00, the Nightlife page | The place says "Closed · Opens at 23:30"; one chip, "Opens later today", counts it |
| 10.21 | Saturday at 23:45 | "Open until 5:00" in green; one chip, "Open now", counts it |
| 10.22 | Sunday at 0:30 and at 1:30 (the night goes on) | Still "Open until 5:00", under "Open now" (before 21 Nov: "Closed, Opens Fri 23:30") |
| 10.23 | Sunday at 5:00 | "Closed · Opens Fri 23:30"; it goes to the end of the list |
| 10.24 | A place open every day 19:00 to 2:30, at 1:30 | "Open until 2:30 · Reopens at 19:00"; under "Open now", not under "Opens later today" |
| 10.25 | The same place at 2:30 | "Closed · Opens at 19:00", counted by "Opens later today" |
| 10.27 | Tap "Open now" in the night | It turns green; the open places first, then "Hours not known, check before going" over the places with no hours of ours |
| 10.26 | A place with no hours of ours, opened | Google's own line says whether it is open now ("Google Maps" beside it) |

### Known, not to report
- A bar or a club is filed under the kinds of Eat and drink: "Café or bar" with a coffee cup, sometimes "Restaurant".
  The host can pick another kind or write their own line under the name; kinds for the night (cocktail bar, club,
  live music) come after the test (fix 10.2).
- Nothing is suggested for Nightlife: the host types each place (fix 10.4, "Near your house", after the test).
- Before the evening every place of the list says "Closed" in red (fix 10.3, waiting for a decision).
- Switched off again in Guide sections after places were added, the step stays in the editor with its places; guests
  see no Nightlife.
- In the pictures made by the checks the small map is empty; on a real phone it draws.
- Google's line (10.26) was never seen on a place of Nightlife: the made-up list was built without Google's key.

## 11. House guide (changed 21 Nov 2026)

### In the editor, on the pool house (ten parts, two with words)
| # | Do | Expect |
|---|---|---|
| 11.1 | Open House guide | The check-out time, "+ Add a Check-out part" (this guide has none), then the parts. Eight rows say "Guests do not see this part yet: add a line." |
| 11.2 | Open Kitchen, "+ Add a line", type a line | The note leaves Kitchen's row; the step says "Changed" |
| 11.3 | In Kitchen, type a "Line under the title" | Every part has that field, also those that had none |
| 11.4 | "+ Add a Check-out part" | A part "Check-out" at the end, open, the cursor in its first line; the button is gone |
| 11.5 | Set a check-out time, type a line in Check-out | Nothing else to do |
| 11.6 | Preview, then House guide in the phone | Only the parts with words: Getting here, Kitchen, House rules, Check-out. Kitchen opens on its photos, your line under the title and your line |
| 11.7 | In the preview, Home, tap the check-out time | The house guide opens with Check-out open, in the middle of the screen |
| 11.8 | The same on a phone (360 px wide) | Nothing overlaps; the note under a row's name wraps cleanly |

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 11.20 | In Rooms and photos, write a note in one room only | The phone's House guide shows that part, not the rooms that only have photos |
| 11.21 | Build the guide, open its House guide | Parts with words only. A line under a title reads like "Washing machine, tumble dryer", never "Free washer – In unit" |
| 11.22 | The same guide in German and French | The lines under the titles are in that language |

### Known, not to report
- A guide built before 21 Nov keeps its old lines under the titles ("Free washer – In unit") until they are changed in the editor.
- A new guide has a Check-out part only when the listing gave a check-out time or the host wrote check-out tasks; else it is added in the editor (11.4).
- A part cannot be added (other than Check-out) or removed, and a line cannot be moved to another part yet.
- A house whose host wrote nothing about its rooms has a short house guide: the way in, the rules, check-in and check-out.

## 12. Wi-Fi (the step and the sheet changed 21 Nov 2026)

Use a guest network or a made-up one: every guest with the link sees the password. Never write a real one in a note or
a message about the test.

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 12.1 | In "Only you know", type a network name and a password | The part Wi-Fi is ticked; the phone beside shows the name and the password |
| 12.2 | Type a password with one of `; , : " \` in it | Accepted as typed |
| 12.3 | Build the guide, open it on a phone | On Home, under the name: "Wifi, Tap to connect". It opens a sheet: the network, the password, Copy, one QR code with the network's name under it |
| 12.4 | Build one with a name and no password, or with neither | No Wi-Fi on Home at all (the check-out time takes the whole row); in the editor, Wi-Fi is first under "Needs you" |

### In the editor, on a guide with no Wi-Fi (the pool house)
| # | Do | Expect |
|---|---|---|
| 12.10 | Open Wi-Fi | First under "Needs you". Two fields at once, Network name then Password, nothing to press first |
| 12.11 | Type the name only, look at the phone beside (or Preview) | No Wi-Fi on Home yet: it shows once both are typed |
| 12.12 | Type the password | The step says "Changed"; the phone beside reloads with "Wifi, Tap to connect" on Home; the step leaves "Needs you" |
| 12.13 | Tap Wi-Fi in the phone beside, or in Preview | The sheet with your name and password, and a QR code |
| 12.14 | Scan that code with your own phone's camera | The phone offers to join your network, and joins. This is the one check of what you typed |
| 12.15 | "+ Add a network", type its name and a note ("Best by the pool"); give the first one a note too | A line says every network uses the one password. In the sheet: both names with their notes, "same for both", two codes, each with its network's name under it |
| 12.16 | Remove the second network | One network again, one larger code |
| 12.17 | Publish changes, open the guide as a guest | The same sheet. Nothing reached guests before Publish |
| 12.18 | Empty both fields, publish | No Wi-Fi on Home, no empty sheet |

### As a guest, on a phone (any guide with Wi-Fi)
| # | Do | Expect |
|---|---|---|
| 12.20 | Tap "Wifi, Tap to connect", then Copy | "Copied"; pasted in the phone's Wi-Fi settings it is the exact password |
| 12.21 | Read a long password | Cut with no hyphen added; l, I and 1, O and 0 can be told apart |
| 12.22 | Scan the code from a second phone | It joins |
| 12.23 | On an iPhone, press and hold the code on the phone's own screen | To find out: does it offer to join? Tell Claude what happens (if it does, the sheet will say so) |
| 12.24 | Close the sheet: the cross, a tap outside, the back gesture | The cross and a tap outside close it. Known: the back gesture leaves Home instead of closing the sheet |
| 12.25 | German or French, a small phone (360 px wide) | The whole sheet fits, the cross stays in view, nothing overlaps |

### Known, not to report
- One password for all the networks of a house: two networks with different passwords cannot be written yet.
- A network with no password (open) cannot be shown: the guide waits for a password.
- "Tap to connect" opens the sheet; it does not join by itself (no web page can). The code is for a second phone until 12.23 is known.
- In the builder the phone beside draws its own small Wi-Fi page; the real sheet is in the built guide.
- A note typed in one language shows as typed in the others until it is translated (Name and languages).
- The editor's "You are editing in" bar on this step matters only for the notes.

## 13. The map (its credit and its buttons, 21 Nov 2026)
In a guide on a phone (or the maker's phone preview), no sign-in needed. Each step in one other language too.
| # | Do | Expect |
|---|---|---|
| 13.1 | Open the map from Home | Along the map's bottom edge, one line: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap", whole and readable. "My location" sits above it, not on it |
| 13.2 | Look at the pins as the map opens | None under "Show all", the zoom buttons or "My location"; the target of the place the map is centred on is in the middle |
| 13.3 | Tap a town's circle (a number) | The map zooms to its places, each clear of the buttons; the list under the map shows the same places |
| 13.4 | Tap "Show all" | Back to the opening view, as in 13.2 |
| 13.5 | Tap another tab (Eat, Markets) | The view fits that tab's places, none under a button |
| 13.6 | Tap "My location" and allow it | Your blue dot; far from the house, a message above the credit, not on it |
| 13.7 | Open Eat and drink, Markets, Getting around, and a card of Home (the bar next door) | Each small map has the same one line at its bottom, over no pin; no box with an "i" |
| 13.8 | Tap the credit's words on the big map | OpenStreetMap's page opens |
| 13.9 | The same in the dark theme | The line stays readable |

### Known, not to report
- A place farther than the guide's area (Barcelona from Ca La Kimberly) may show as a pin cut by the map's frame.
- The map is grey in every colour world (the plan's proposal 6, to decide).
- Tapping a small map of a list opens the big map, wherever the tap lands.

## 14. The look (the picker of 14 Nov 2026; a new guide starts in its cover's colours since 17 Nov 2026)

### In the builder, with a new link (the test house)
| # | Do | Expect |
|---|---|---|
| 14.1 | Paste a listing link and look at the phone on "This is your guide" | The tiles are in colours taken from the listing's first photo, not Ca La Kimberly's blue, red and yellow |
| 14.2 | Open The look | "From your cover" is the first small phone and is the one picked, without a tap |
| 14.3 | Pick another photo in "Cover picture" | The colours follow the new photo, on the small phone and the big one |
| 14.4 | Go back to the first photo | Its colours come back |
| 14.5 | Tap Sea, then Bauhaus | The big phone follows at once; the page does not jump |
| 14.6 | Build the guide | The guide has the colours the phone showed |
| 14.7 | Open the built guide's The look in the editor | "From your cover" is picked, and its small phone shows the guide's colours |
| 14.8 | The same on a phone (360 px wide) | The row of small phones slides sideways, the next one peeking in; nothing overlaps |

### Known, not to report
- An existing guide keeps its colours: nothing changes for the pool house or Ca La Kimberly.
- A listing whose photo the browser may not read gives Bauhaus.

## Later modules
Added here as each one is built or changed.
