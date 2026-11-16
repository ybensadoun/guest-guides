# What's on (module `whatson`)

The end of Home: one agenda by day of what is on around the house, under the heading "What's on". It holds nothing of its
own. It is the module that takes from the other modules (Yohann, 16 Nov 2026: "this one should be about a different
module, which is about what's on in general, and then it can suck from other modules"; and: "this one takes out of
anything that has any lively events. So it might be the markets, it might be the what's going on, like the event planner.
It might be the nightlife"): any module that has something on a day gives it a feed, and What's on names none of them, as
Home names no module. Today two modules feed it: the markets (`../markets/agenda.js`) and Local events
(`../events/agenda.js`).

Yohann calls it the super module (17 Nov 2026: "this module should be called super module or something like this. Because
what it does is that it takes in live events from modules that do have live events. So the market live, maybe the local
events. It just puts everything together. It just gives you a single list as a widget."). Guests keep reading "What's on".

It is not a section and has no page or tile of its own: it is the frame's fixed end (`../README.md`, rule 1).
`widget(now)` gives its HTML; `views/home.js` puts it under the two groups. Read this page before changing what it shows,
and write a changed rule here with its date.

## The feed (17 Nov 2026)

A module that has something on a day exports `agenda(now, tools)` from its `index.js`, beside `page` and `widget`
(`../index.js` lists the modules; their order there is their order in the agenda). What's on asks every module of the
registry and takes those that answer. `tools.badge(iso, cls)` is the agenda's date badge ("6" over "DEC"), for a module's
rows that carry a date. A module whose guide has none of it answers `null`. Otherwise:

| Part | What the module gives | What What's on does with it |
|---|---|---|
| `today.rows` | Its rows of today, drawn by the module, in the module's own order | Puts each module's rows one after the other |
| `today.more(n)` | Optional: the line that leads to the rest ("+ 3 more markets today") | When given, shows three rows of that module, then this line |
| `today.on` | How many are open now | Adds them up for the heading ("2 open now") |
| `today.live` | Whether one is on or still to come today | Today stays open while one module says so |
| `day(n, date)` | Day n ahead: `{ rows, where }`, the rows drawn for that day, `where` the names of their towns | Tomorrow and the day after |
| `fold` | `true` when its day goes under one row ("Tuesday", "9 markets · three towns…") that opens on the rows | Draws that row; else puts the rows as they are |
| `count(n)` | Its count in words ("9 markets", "1 event") | The headings and the folded row |
| `later` | From the third day, six weeks ahead: `{ k: 'YYYY-MM-DD', html, recurring }`; `recurring` for a thing held every month | Coming up: sorts, cuts |
| `link` | `{ href, label }`: where all of it is ("All markets") | The links at the end |

A row is the module's own (a market's row opens it on the map; an event's row opens in place, as on the Local events
page): What's on never draws a module's thing. The order between modules and days, the cuts, the headings, what is folded
and what is open are What's on's (`plan.js`, tested). A new source is one `agenda.js` in its module and one line in its
`index.js`; nothing changes here.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Shown when at least one module of the guide feeds it; nothing at all otherwise. | Code, first engine (11 Oct 2026; then "the guide has markets or a Local events section"); any module: Yohann, 16 Nov 2026 |
| 2 | Today: each module's rows in the modules' order. A module that gives a line for the rest is cut at three rows (the markets: the day's markets of the default kinds, as Home's tile counts them, `../markets/README.md` rule 2, open now first, then opening later today, then finished, and "+ N more markets today" to the day's list). Then today's events: on now, or starting later today with their time, then the ones that have ended, which stay for the day, quiet (`../events/README.md` rule 2; Yohann, 15 Nov 2026); an event of today with no time shows no status. | Code comments since the first engine; the events' line: code comment; the cut as a rule for any module: 17 Nov 2026, the same result |
| 3 | Today stays open while something is still on or to come; once everything has finished it folds away with "All finished for today", and the next two days open instead, with the first folded day unfolded (tomorrow's markets). With nothing today: "No markets or events today." The heading's "2 open now" counts what the modules say is open now: the markets; an event that is on is not counted. | Code comments since the first engine; the events not counted: as built, kept on 17 Nov 2026, to decide |
| 4 | Next 2 days: each day, each module's part in the modules' order. The markets of a day are one row ("Tuesday", "9 markets · three towns…"), which opens on the markets with their hours that day; the events starting that day are their own rows. The heading counts each module over both days ("12 markets · 1 event"). | Code comments since the first engine |
| 5 | Coming up (from the third day, 6 weeks ahead): what the modules have with a date, plus at most two things held every month (the first two a module names: the markets held on a week of the month, of any kind, whatever the default kinds, worth planning for), at most five lines in date order; on the same day a thing with one date comes before a monthly one. | Code since the first engine (its comment, which said "the monthly antiques markets", corrected 15 Nov 2026) |
| 6 | Its links: each module's own ("All markets": the day's list, its filters reset as from the tile; "All events"). | Code, first engine |
| 7 | A market's row opens it on the map; an event's row opens in place with the details of the Local events page. A row is its module's. | Code comments since the first engine |
| 8 | What's on names no module and reads no module's data: it asks the registry for feeds. | Yohann, 16 Nov 2026 ("it can suck from other modules"); built 17 Nov 2026 as a move: the agenda of Ca La Kimberly and of two test guides, in every language at sixteen moments of the year, is byte for byte what it was (160 comparisons) |

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules: what is taken from the feeds, the order, the cuts | `plan.js` (pure; tests: `engine/scripts/whatson.test.mjs`) | Yes |
| The agenda drawn: the three parts, the folded day row, the date badge, the links | `widget.js` | Yes |
| What Home calls | `index.js`; `views/home.js` `renderHome` | Yes |
| The modules asked | `../index.js` (`MODULES`: those that export `agenda`) | The registry |
| The markets' feed: today's markets, a day's, the monthly ones, a market's row | `../markets/agenda.js` | The markets module's |
| The events' feed: the upcoming events, an event's row | `../events/agenda.js` | The events module's |
| Its styles | `engine/src/styles/app.css` (`.whatson`, `.wo-sec`, `.wo-day`, `.wo-more`, `.wo-links`, `.dayrow`, `.dbadge`, `.dday`, `.dbm`, `.mini`) | Not yet |
| Its words | `engine/src/i18n/<lang>.json`: `whatsOn`, `today`, `todayOpenN`, `todayDone`, `nothingToday`, `next2days`, `comingUp`; the modules' own in their rows and counts: `moreMarkets`, `nMarkets`, `allMarkets`, `morning` (markets), `nEvent1`, `nEvents`, `allEvents` (events), `inDays` (both) | Not yet |

## Open (17 Nov 2026)

- "No markets or events today." names two modules: with a third source the sentence must change ("Nothing on today.").
- "1 markets · Alcover": the markets' count has no word for one (seen on a test guide). The markets module's word.
- When today is over, tomorrow's folded row opens on every market of the day (nine on a Monday evening at Ca La
  Kimberly), while today is cut at three.
- Other sources Yohann named: Nightlife ("it might be the nightlife"). What it has on a day (a place open tonight) is to
  design with the Nightlife conversation; then it is one `agenda.js` in `../places/`.
- "A single list as a widget", and "it goes to the top" (Yohann, 17 Nov 2026): today it is three parts at the frame's
  fixed end (`../README.md` rule 1), which a host cannot place. As a widget of the frame it would be placed on the board
  like a tile, the top included; what moves, and whether only "Today" goes up, is to confirm with him and to build with the
  Home page conversation, in its turn of the ordered list.
- "All events" goes to `#s/events`, the section's id in Ca La Kimberly, not the guide's (the events module's link).
