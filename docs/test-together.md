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

## Later modules
Added here as each one is built or changed: public transport (bus, metro, tram), then the rest of the plan.
