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
| 3.6 | The pool house's Markets page on a day with no market (tap such a day in the strip: its number is 0) | "No markets today." (another day: "No markets on this day.") and one button, "Tomorrow · 3 markets" or "Saturday 21 · 2 markets" |
| 3.7 | Tap that button | The list of that day |
| 3.8 | Ca La Kimberly's Markets page: Filters, keep one kind only (Flea market), then tap a day that has none of it | "No markets match these filters." with "Show all types": this box only after your own filters |
| 3.9 | 3.2, 3.4 and 3.6 in German and in French | Nothing cut, nothing over anything else |

### Known, not to report
- A yearly fair whose date is only written in words is in "All" and on no day (to decide with Local events).
- The market halls are not in the tile's number and not in the day's list until "Show all types" (they open every weekday).
- On a day when only the halls are open the box says "Only covered markets are open." No house of ours has such a day; it was checked on a test copy.

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

## Later modules
Added here as each one is built or changed.
