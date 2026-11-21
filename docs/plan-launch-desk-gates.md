# Plan: the maker and the generator obey the launch desk (started 21 Nov 2026)

Yohann, 17 Nov 2026: the launch desk (`onboarding-site/modules/`) is where he says what is on in which country and
launches a country. 21 Nov 2026, asked when its switches should start to act: "Start now". This page is the plan and the
list of every place a gate goes. The desk's conversation builds it; each shared file is touched only in a turn the main
conversation gives (`MODULE-CONVERSATIONS.md`, the queue).

## What must stay true
1. Spain is exactly as before: every part is on there (`engine/src/modules/available.json`), so a gate takes nothing from
   a house in Spain.
2. Nothing is cut unless we are sure: a house whose country is not known, a part the list does not name, the database's
   answer not loading (then the code's list alone decides): all read as "on" or "as the list says".
3. One rule, never a second copy: `avPartOn(list, launch, '<module>/<part>', country)` in
   `engine/src/modules/available.js`; a house's country from `engine/src/country.js`. The maker pastes both
   (`build.py`); Python asks `engine/scripts/available-of.mjs` and `country-of.mjs`.
4. A gate is one line at the place a part is offered, started or added. A part that is off is not offered to the host,
   starts no background work and is not added by the build. What a guide already holds is never taken out by a gate:
   only the owner's own words and a host's own edits change a guide that exists.
5. What a host types stays possible everywhere (a taxi, a station by name or link, a market, an event, a contact): those
   are the parts "the host adds", on everywhere.

## Built (21 Nov 2026, unit tests only, nothing shared touched)
`engine/src/modules/available.js`, `engine/scripts/available-of.mjs`, `engine/src/country.js`,
`engine/scripts/country-of.mjs`, `onboarding-site/src/countries.py` (makes `onboarding-site/countries.json` from Natural
Earth, public domain; the file waits for Yohann's yes to the download), their tests. The desk uses the rule itself.

## Steps, in order
| # | Step | Files | Needs |
|---|---|---|---|
| 1 | The outlines file: done 21 Nov 2026 | `onboarding-site/countries.json` (made once, committed) | done |
| 2 | The house's country, kept: the builder writes `answers.country` when the position is first known (`start.js` 231, 305, 456); the generator writes it into `content/house.json` (`generate-site.py` 288 to 303, asking `country-of.mjs`); the editor reads `edF().house.country`, else works it out from the position once. No field for the host | `start.js`, `generate-site.py`, `editor.js`, `build.py` | a turn |
| 3 | What the owner decided, read once: `launch_public()` with the public key, when the maker starts (`runtime.js` 635, before `accountBoot`), kept in memory; no answer within 4 s or a failure: the list alone. One helper in the maker, `partOn(id)`, for the house in hand | `runtime.js`, `build.py` | a turn |
| 4 | The worker reads the same for a build and for a job: the house's country (`country-of.mjs`), the tables with its own access, `available-of.mjs`; one helper `partOn(id)` per build or job | `worker/guide-worker.mjs` (237, 915) | a turn; the unit tests after the last edit |
| 5 | The gates, part by part (below), each with a check on a made-up house outside Spain | per part | turns, by file |
| 6 | A house in a country that is not open: what the builder says | `start.js`, the first visit | Yohann's decision, then the main conversation |

## The gates (file:line as of 9b8361f; E `onboarding-site/src/editor.js`, S `start.js`, R `runtime.js`, P `preview.js`, W `worker/guide-worker.mjs`, G `engine/scripts/generate-site.py`)
| Part | Offered in the maker | Background work started | Added by the build |
|---|---|---|---|
| `transport/taxis` | E 1136, 1180 "Near your house"; S 708 to 718 the builder's ticks; P 376 | E 1185 job `what: taxis`; W 254, 623, 690, 759, 805 | G 490 to 506 |
| `transport/apps` | E 1209, 1228 switches; S 739 to 746 ticks | E 1214 job `what: apps`; W 635, 255, 759, 805 | G 509 to 519 |
| `transport/trains` | E 1322, 1328 near and typed (the name or link way stays) | E 1299 fetch of `stations-es.json`; E 1095 lines job stays (a host's own station) | G 468 to 477 |
| `transport/brands` | none | E 1355 job `what: brands`; W 324 `brandsOnSite` | W 324 |
| `transport/stops` | E 1258, 1264 near and typed (the name or link way stays) | E 1241 fetch of the stops cells | G 480 to 488 |
| `markets/found` | S 174, R 270 to 280, P 175 to 192 the phone's and the build's lines; E 1520 Find more | S 128 quick search (kind markets); S 140 research; E 1624 `find-markets`; W 182, 759, 805, 863; `monthly.mjs` 60 to 67 | G 263 to 270; W 346 `holdBack` |
| `events/found` | R 286, P 193; E 1783 "Keep events up to date", Find more | E 1811, 1826 `auto-events`, 1624 `find-events`; W 853, 523 to 592; `monthly.mjs` 52 to 57 | G 263 to 270; W 870 |
| `restaurants/facts` | none (a place still gets its pin) | E 673 `place-facts`; W 908 | W 277 to 281 `hostPlaces` facts; `reread-places.mjs` 89 |
| `todo/deck` | S 460 to 552 the deck; S 640 suggestions | S 447 `/api/places` | G 671 to 706 kept cards |
| `todo/towns` | S 773, 687; E 624 towns first in the list | S 767 fetch of `towns-es.json` | `worker/host-places.mjs` 51 (a town the host picked stays his own) |
| `todo/found` | S 335 to 444 research cards; E 1624 Find more | S 140; W 187, 805; `monthly.mjs` 60 to 67 | W 312 cards for the editor |
| `contacts/found` | P 185, R 289 | S 128 quick search (kind emergency); W 188, 874 | G 263, 722 |

The parts "the host adds" and the parts with no country tie (Home, the house page, Rubbish, the house guide, Wi-Fi, the
map, the look) get a gate only when the owner can usefully switch them off: `house/listing` (S 88, the listing read) and
the sections themselves (Guide sections) are to decide with Yohann; none is built in the first pass.

## Order of the gates
First the four of Getting around that are tied to Spain's files (trains, brands, stops, apps): they are the clearest
case, a house in France gets Spain's nearest station today. Then the research (markets, events, things to do, contacts),
which is where money is spent for a country we do not serve. Then facts, towns, taxis and the deck.

## The outlines file (made 21 Nov 2026)
`onboarding-site/countries.json`: 237 countries, 1,617 outlines, 534 KB (179 KB as the browser gets it), from Natural
Earth's 1:50m file (public domain; downloaded on Yohann's yes into `~/.cache/guest-guides/naturalearth/`). Measured on 26
border towns of Spain, France, Portugal and Andorra: the outlines are up to about 3 km off the true border. So within
6 km of another country's outline the answer is "not known", and the rule cuts nothing there: a house in Puigcerdà,
Irun, Portbou or Tui keeps everything, as today. Known limits, in `engine/src/country.js`: Llívia, Gibraltar, the
Vatican, and the smallest countries, which are all border. Natural Earth's 1:10m file (13 MB) would narrow the band:
for the day a small country is launched.

## Known, to settle
- The worker's own Spain defaults (`gazetteer('ES')`, `country = 'ES'`, "Spain" in `place-facts.mjs`, `host-places.mjs`,
  `reread-places.mjs`) are what a module's conversation changes when it makes a part work in a country: not gates.
- A guide that exists and is in a country where a part is switched off later keeps what it has; whether the monthly run
  should stop renewing it there is to decide.
- The desk's play area and feedback wait: the sample houses are not created.
