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
| 1.1 | Open Getting around | Three parts in order: Taxi, Trains, Bus stops |
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
| 1.20 | Paste a listing link, go to "Only you know" | After the research answers: "Taxis near your house", the nearest ticked, "Suggested for you: please check" |
| 1.21 | Untick it, tick another, type one in "Another taxi" | The phone preview follows |
| 1.22 | In a served city only: "Ride apps that work near you" | The apps ticked for you |
| 1.23 | Build the guide | Getting around has the taxis you approved, its stations by themselves, and iryo and Ouigo on a high-speed station |
| 1.24 | Build one without opening the step | The guide has the nearest taxi by itself |

### Known, not to report
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

## 9. Contacts: the page Emergencies (the status line changed 21 Nov 2026)

### In the guide, on a phone (the pool house, then the test house)
| # | Do | Expect |
|---|---|---|
| 9.1 | On Home, tap the red tile "Emergencies" | The page: groups, most urgent first; the emergency number first, with the largest red button |
| 9.2 | Tap a number | The phone's own dialler opens with the number in it; nothing is called by itself |
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

## Later modules
Added here as each one is built or changed: public transport (bus, metro, tram), then the rest of the plan.
