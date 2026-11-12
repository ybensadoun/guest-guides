# Where Google's place data goes today (map for the places work)

Working note for steps 3 to 6 of "The places work, the build" in `plan-ca-la-kimberly-through-the-maker.md`. Read from the code on 10 Nov 2026; line numbers are from that day. To delete once the work is done.

The target: Google only locates a place (its id kept for good, its position for at most 30 days). Nothing else Google returns is kept or shown in our own design.

## 1. Requests to Google
Two server keys, both in the Google project `guest-guides-checks` (seen in its console): `GOOGLE_MAPS_API_KEY` (Netlify functions) and `GOOGLE_PLACES_KEY` (worker and scripts). The browser key `GOOGLE_MAPS_BROWSER_KEY` is used by no code yet.

| Where | Request | Fields asked | Started by |
|---|---|---|---|
| ~~`worker/places.mjs:49` `makeGoogle`~~ | removed 12 Nov 2026 with `FIELDS` | | the monthly check asks Google nothing since then (`worker/check-guides.mjs`) |
| `worker/places.mjs:88` `hostPlace` | text search | `HOST_FIELDS` (line 71): the same plus primaryType, primaryTypeDisplayName | guide build (`guide-worker.mjs:267`), places a host typed without picking a suggestion. Also follows a `maps.app.goo.gl` link |
| `worker/places.mjs:109` `hostPlaceById` | details by id | `HOST_FIELDS` | guide build (`:266`, `:268`): picked suggestions and swipe cards kept |
| `/api/places?suggest=` (`netlify/functions/places.mjs:42`) | autocomplete | placeId, structuredFormat, distanceMeters | as a host types a place (builder `start.js:382`, editor `editor.js:141`) |
| `/api/places?id=` (`:52`) | details by id | `PLACE` (line 27): id, displayName, location, googleMapsUri, formattedAddress, primaryTypeDisplayName, businessStatus, regularOpeningHours | editor "Find it on Google" (`editor.js:195`) |
| `/api/places?q=` (`:63`) | text search | `PLACE` | editor, Getting around, add a stop (`editor.js:447`) |
| `/api/places` town (`:78`) | text search | location | swipe deck when the house has no position (`start.js:270`); saved as the house's `lat`/`lng` |
| `/api/places` deck (`:84`) | nearby search, by popularity | id, displayName, rating, userRatingCount, priceLevel, primaryTypeDisplayName, location, googleMapsUri, shortFormattedAddress, photos, editorialSummary | swipe deck of Attractions (`start.js:265`); ratings filter and order it (`:88-95`) |
| `/api/photo` (`photo.mjs:6`) | photo media | the photo | the deck card's picture (`start.js:294`) |
| ~~`engine/scripts/check-places.js:29`~~ | removed 12 Nov 2026 with `npm run check-places` | | replaced by the weekly reading (`worker/reread-places.mjs`) and the monthly check (`worker/check-guides.mjs`), both without Google |

`/api/places` answers and photo redirects are sent with `cache-control: public, max-age=86400` (`places.mjs:17`, `photo.mjs:9`): a day in the CDN and the browser.

## 2. What is made from Google's answer, and where it is kept
- `hostFacts` (`worker/places.mjs:73`): name, lat, lng, km, town (from the address), gmaps, gid, type (Google's words), status, group and the tag `kidsfun` (from Google's type, lines 64-70), `schedule` or `always`.
- `placeFacts` (`netlify/functions/places.mjs:28`): id, name, lat, lng, maps, km, town, type, status, periods.
- Deck card (`places.mjs:90`): id, name, rating, reviews, price, type, address, maps, summary, lat, lng, km, photo.
- `checkOnGoogle` (`guide-worker.mjs:354`): checked, gid, gmaps, `_google` note, `_card` {rating, reviews, photo}, flags, `schedule` with `hoursSource: 'google'`, `always`; drops a place Google says is closed for good.

Kept in:
- **Host answers**: the browser (`porta-onboarding-v1`), `guides.answers`, and a third copy sent whole to Netlify Forms (`runtime.js:347`). `A.swipes[id]` = {id, d, cat, name, rating, reviews, type, maps, lat, lng, km, photo, c}. `favEat`/`favNight`/`favDo` rows = {p, c, gid, at, km}: picking a suggestion replaces the host's text with Google's name (`start.js:396`) and keeps Google's address as `at`.
- **The guide**: `geocode.json` in the job, then `restaurants.json`, `nightlife.json`, `todo.json` through `generate-site.py:678-733` (type through `L()`, so Google's words are translated into six languages; town; lat, lng, km_from_house; tags and group; flags; gid; always; gmaps; schedule with no `hoursSource`), then `guides.content` and `guides.draft`.
- **Job results**: `guide_jobs.result` for research and Find more keeps `_card` (rating, reviews, photo name) and Google's hours, and is never deleted. `docs/more-places.json` keeps `_google`.
- **Editor**: "Find it on Google" writes lat, lng, km_from_house, gmaps, gid, town, and name, schedule, type when empty (`editor.js:202-207`). Getting around stations take Google's name, pin and gmaps, no gid (`editor.js:465`). A restaurant pinned to Home copies type and schedule into `quick.json` (`editor.js:156`).
- **Ca La Kimberly's files**: 12 + 24 hand-copied `rating` {stars, count}; `gmaps` links in Google's own form; gid and checked on most items.

## 3. Where it is shown
- **Engine, every list and the map sheet** (`ui.js` `row()` 177-215, `card()` 118-153), always on a page with a map: rating and "{n} Google reviews" (line 183), type, live status pill and hours, town, tags, the Google Maps button.
- **Section pages** (`views/section.js:153-195`): group chips, "Open now" filter and sort, the kids filter, pins filtered by group.
- **Place page** (`views/place.js:29-53`): status pill and hours beside the mini map; kind line; gmaps.
- **Map** (`views/map.js`): pins grouped and labelled by town (`content.js:47`), the town search, the sheet list.
- **Home**: quick tiles' live status, market rows (no map there).
- **Maker**: the swipe card (photo, type, rating, reviews, summary), "Your picks", the phone preview, the suggestion list, "Found: name, town, km", the Find more card.
- Built copies to rebuild after any change: `onboarding-site/index.html`, `onboarding-site/g-app/assets/main-*.js`.

## 4. The monthly check
Since 12 Nov 2026 `worker/check-guides.mjs` asks Google nothing: a place's own website still answers, our open directory still lists it, and a signal is a note for the host (`look`), never a change guests see (`worker/README.md`). `worker/clean-google.mjs` takes out of today's guides what the old check wrote (Google's hours, its links where the place has an id, `checked`). What it did before, on 10 Nov: markets, things to do and restaurants of published guides, when `checked` was 25 days old; wrote checked, gid, gmaps, flags, schedule, hoursSource, always, removed places closed for good, mirrored into the draft.

## 5. Checks that will need to follow
- `engine/scripts/check-content.js`: lines 54 and 74 need a numeric lat and lng for every market and spot (to square with positions that expire); 55-61 schedule, tags, flags; 75 group.
- `onboarding-site/test/check.mjs`: the deck mocks with rating, reviews, type, photo (204, 215, 590-610); the suggestion and "Found:" lines (461-484, 785-798); the station's name (804-813); the Find more card (857-864).
- `engine/scripts/ux-check.mjs:53-57`: a row's lines under the status pill.
- No test covered (10 Nov) `worker/places.mjs`, `check-guides.mjs` or the generator's Google paths; since then `locateItem` and the new `check-guides.mjs` have tests.

## 6. Points to decide inside the steps
1. The name: a picked suggestion and a swipe card carry Google's name into the guide. Whose name is kept.
2. The town: it also drives the map's pin groups and its town search. Where it comes from without Google's address.
3. Kind, group and the kids tag: from Google's type today.
4. The swipe deck: Google's ratings choose and order it, and it shows Google's photo and summary to the host.
5. Positions and distances: `km_from_house` is worked out from Google's position and kept for good.
6. The three stores of host answers, and job results that are never deleted.
7. The day of caching on `/api/places` and `/api/photo`.
8. Stations in Getting around (Google's name and pin, no id).
9. The existence check: what it may ask and what it may write.
