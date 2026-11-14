# What's on (module `whatson`)

The end of Home: one agenda by day of what is on around the house, markets and Local events together, under the heading
"What's on". It is not a section and has no page or tile of its own: it is the frame's fixed end (`../README.md`, rule 1),
fed by the markets module (`../markets/`) and by Local events, which are not a module yet (`views/section.js`
`eventRow`, `engine/src/events.js`). `widget(now)` gives its HTML; `views/home.js` puts it under the two groups. Read this
page before changing what it shows, and write a changed rule here with its date.

## The rules (as built, before the modules)

| # | Rule | Decided |
|---|---|---|
| 1 | Shown when the guide has markets or a Local events section; nothing at all otherwise. | Code, first engine (11 Oct 2026; `views/home.js`) |
| 2 | Today: the day's markets of the default kinds (as Home's tile counts them, `../markets/README.md` rule 2), open now first, then opening later today, then finished, at most three and "+ N more markets today" (to the day's list), then today's events: on now, or starting later today with their time; an event of today with no time shows no status. | Code comments since the first engine; the events' line: code comment |
| 3 | Today stays open while something is still on; once everything has finished it folds away with "All finished for today", and the next two days open instead, with tomorrow's markets unfolded. With nothing today: "No markets or events today." | Code comments since the first engine |
| 4 | Next 2 days: each day's markets as one row ("Tuesday", "9 markets · three towns…"), which opens on the markets with their hours that day, plus the events starting that day; the heading counts both. | Code comments since the first engine |
| 5 | Coming up (from the third day, 6 weeks ahead): the events, plus at most two markets held on a week of the month (the comment says "the monthly antiques markets, which are worth planning for"; the code takes any market with a week of the month, of any kind, whatever the default kinds), at most five lines in date order. | Code comment since the first engine; the difference between the comment and the code: as built |
| 6 | Its links: "All markets" (the day's list, its filters reset as from the tile) when the guide has markets, "All events" when it has Local events. | Code, first engine |
| 7 | A market's row opens it on the map; an event's row opens in place with the details of the Local events page. | Code comments since the first engine |

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The agenda | `widget.js` (a market's times on a day, the rows, the three parts, the links) | Yes |
| What Home calls | `index.js`; `views/home.js` `renderHome` | Yes |
| Today's markets, the markets | `../markets/data.js` (`todaysMarkets`, `MARKETS`) | The markets module's |
| The events, an event's row | `engine/src/events.js` (`upcoming`, `when`, `dayBadge`), `views/section.js` (`eventRow`) | Not yet: events are not a module |
| Its styles | `engine/src/styles/app.css` (`.whatson`, `.wo-sec`, `.wo-day`, `.wo-more`, `.wo-links`, `.dayrow`, `.dbadge`, `.dday`, `.dbm`, `.mini`) | Not yet |
| Its words | `engine/src/i18n/<lang>.json`: `whatsOn`, `today`, `todayOpenN`, `todayDone`, `nothingToday`, `moreMarkets`, `next2days`, `nMarkets`, `nEvent1`, `nEvents`, `comingUp`, `inDays`, `allMarkets`, `allEvents`, `morning` | Not yet |
