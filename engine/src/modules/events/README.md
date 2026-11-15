# Local events (module `events`)

The festivals, fairs and local traditions around the house: each event's next date, soonest first, under the name of its
month; opened, what happens, then Google Maps and its website. On Home it is one widget, the entry tile with the next
event ("Next: Santa Teresa Fair, 9 Oct"), which Home does not show by default; the events also feed What's on at the
bottom of Home (`../whatson/README.md`), which takes the upcoming events and their row from here.

Moved into this folder on 14 Nov 2026, after rubbish and markets, with the host's lists of places and the highlights.
Read this page before changing how the events behave, and write a changed rule here with its date. Ca La Kimberly's
Local events page and What's on are the reference: the move was checked pixel for pixel and byte for byte.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | An event is shown by its next date that has not ended; past dates drop off by themselves. The list is soonest first, by start date, then by start time (an event with no time counts as midnight), grouped under its month. | Code comments, before the modules (`engine/src/events.js`, `views/section.js`); the `_doc` of `content/events.json` ("Past dates hide themselves") |
| 2 | A date may say when it starts (`time`, shown in its date line) and when it ends on its last day (`until`). With a time, an event of today says "Today" until it starts, "On now" while it runs (until `until`, else about three hours) and is gone after. Without one, a one-day event of today only says "Today": we do not know whether it is on yet. | Code comment, before the modules (`engine/src/events.js`) |
| 3 | A date not confirmed (`status: "expected"`) says "Expected" on its row, and opened, "Expected dates, based on previous years. Check the website closer to the time." | `../CLAUDE.md` ("Say 'expected' for anything not confirmed"); as built |
| 4 | Its kind gives its icon and its colour: eighteen kinds, the same set in the guide, the maker, the worker's research and the events file (a test keeps them so). A kind the guide does not know takes the festival's icon and blue. | Yohann, 11 Nov 2026 ("I would rank this by most popular. Human tower is very catalan. Which makes me think we could have a search and have many more types"; plan, "Eighteen kinds of event"); the test: `worker/test/event-kinds.test.mjs` |
| 5 | Its row opened: what happens, then "Google Maps" (a search for its venue and town) and its website. The same row in What's on, with a date badge instead of the icon and the time or "On now" on the right. | Code comments, before the modules; Ca La Kimberly's research notes (`sites/ca-la-kimberly/docs/RESEARCH-NOTES.md`: What's on's events expand in place with the Local events page's details, one shared row) |
| 6 | Home's tile names the next event: of each event, its first date in the file that has not ended before today, whatever the hour; the soonest start of those. So an event of today that has already finished (and left the page) is still named until midnight. | As built, before the modules (`views/home.js`); the difference with the page (rule 2): as built, no origin found |
| 7 | Its tile is wide only (the next event's name and date: as a half or tall tile "esdeveniments" and "evenementen" were wider than the tile), and Local events are not a tile by default: they are in What's on. | Claude, 14 Nov 2026, from the frame check, to confirm with Yohann (`../README.md` frame rules 6 and 12) |
| 8 | The curation rule applies to events as to every researched list: what a guest would not find by searching, each with a one-line reason; and each with a recent source. | `docs/CURATION.md` (18 Oct 2026: "Apply this to every researched list (things to do, places to eat, markets, events)"); `../PROJECTS.md` ("Data accuracy") |
| 9 | Automatic events (the host's "Keep events up to date"): the next three months searched each month and right away when the host switches it on; by car every event within 10 km however small and only the main ones (regional or major) further out, up to the guide's radius; automatic events that do not fit are removed; the host's own events are never touched. This is the worker's code, not the guide's. | `worker/README.md` ("Automatic events"); `../CLAUDE.md` ("Monthly check": refreshes automatic events) |
| 10 | Events never ask for Google's live line. | `engine/src/gcard.js` (its comment: "never events") |

## Its data

One file per guide, `content/events.json` (its `_doc` describes it). Each event: `id`, `type` (its kind), `name` (six
languages), `name_local`, `town`, `venue`, `lat`, `lng`, `km_from_house`, `url`, `dates` (`[{ start, end, time, until,
status }]`, `start` and `end` as YYYY-MM-DD), `description`, `scale` (automatic events: local, town, regional or major),
`auto` (found by the automatic search), `sources`, `tags`, `flags`, `verify`. The file's `auto` holds the host's settings
for automatic events (`on`, `skip`, `want`, `removed`, `reach`, `last`). Read by `content.js` with the other sections.

Where it comes from: the area research at the build (`worker/guide-worker.mjs` `firstEvents`), automatic events
(`refreshEvents`, monthly through `worker/monthly.mjs` and `npm run refresh-events`, and the job `auto-events`), Find more
(`find-events`), the host in the editor. Ca La Kimberly's was written by hand over the year, with sources
(`sites/ca-la-kimberly/docs/sources.json`, `docs/RESEARCH-NOTES.md`), and has automatic events on.

## Its look

The page: the title and its lead, then a list (`.mlist.events`) with a month's name (`.evm`) before its first event, each
event a row (`.mrow`: the kind's icon in its colour, the name, the town and the dates, "On now", "Today", "In 3 days" or
"Expected" on the right; opened: the description, the "Expected" note, Google Maps, Website).

On Home, the entry tile, wide, with "Next: <name>, <date>", when a guide places it (`content/home.json`); its colour and
icon by the section's id (`ui.js` `SECTION_LOOK.events`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: a date's state, the upcoming events, the next one | `plan.js` (tests: `engine/scripts/events-plan.test.mjs`) | Yes |
| An event's row, its dates in words, "On now", the date badge | `row.js` | Yes |
| The guide's Local events section | `data.js` | Yes |
| The page | `page.js` | Yes |
| The Home widget | `widget.js` | Yes |
| What it offers on Home: its entry tile, wide only | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home, the section view and What's on call | `index.js`, listed in `../index.js` | Yes |
| The kinds' icons and colours | `kinds.js` (`EVENT_ICON`, `EVENT_TONE`, for `row.js`; moved from `views/section.js` on 14 Nov 2026) | Yes. Kept written as they are (one line per kind, the colours on one line): the maker's build (`onboarding-site/src/build.py`), its checks (`onboarding-site/test/check.mjs`) and `worker/test/event-kinds.test.mjs` read them as text in this file. The `_doc` of `content/events.json` still says "engine section.js" (a guide's file, not changed by the move) |
| A page's title, lead, opened rows kept | `engine/src/views/section.js` (`sectionFrame`) | No: shared with every section's page |
| What's on | `../whatson/` | A module of its own, fed by this one |
| Its styles | `engine/src/styles/app.css` (`.mlist.events`, `.evm`, `.mrow`, `.dbadge`, `.gt[data-k="events"]`, the tones `--tone-*`) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `events`, `eventsLead`, `nextEvent`, `expected`, `expectedNote`, `onNow`, `today`, `tomorrow`, `inDays`, `website` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` | Not yet |
| The research, automatic events and their refresh, Find more, how far events reach | `worker/guide-worker.mjs` (`EVENT_SHAPE`, `searchEvents`, `mergeEvents`, `refreshEvents`, `autoEventsJob`, `firstEvents`, `find-events`), `worker/research-brief.mjs` (`eventsInReach`), `worker/monthly.mjs` | No: the worker's |
| The maker's step Local events, its kinds, "Keep events up to date" | `onboarding-site/src/editor.js` (`EV_KINDS`, `EV_WORDS`) | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- What's on links to "All events" at `#s/events`, the section's id in Ca La Kimberly, not the guide's own id for it.
- The tile's colour and icon are known by the section's id `events` (`SECTION_LOOK`).
- The lead under Events is hand-written words (`i18n`), which no maker step writes (plan, D1).
- 39 of its 45 events were written by hand over the year; 6 came from the automatic search.
