# The house (module `house`)

The house itself. On Home, the welcome card on top: the host's photo or a drawn cover, the logo, "Welcome to" and the
name, then the two facts guests look for first, the Wi-Fi (it opens the Wi-Fi sheet, with the password to copy and a QR
code for a second phone) and the check-out time (it opens the house guide's check-out row). The photo and the name open
the house page, as on Airbnb: the photos, the key facts, about the house, the rooms with their photos, the beds, what
the place offers, the ratings and reviews, always linking back to the listing.

It is the frame's fixed top (`../README.md`, frame rule 1): it has no placement and offers no tile, so its `offers.js`
offers nothing (an empty offer), and the frame never makes it a tile. Moved into this folder on 14 Nov 2026 with the text
pages, Emergencies, Getting around and the map (the module frame, part 2). Read this page before changing the welcome
card, the Wi-Fi sheet or the house page, and write a changed rule here with its date. Ca La Kimberly's are the reference:
the move was checked pixel for pixel and byte for byte (the Wi-Fi sheet with its values hidden).

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Never show the house's address. Its position (`content/house.json` `lat`, `lng`) is offset by about 350 m on purpose: never "correct" it, never put the real position or the street in a file. | `../CLAUDE.md` ("Privacy and safety"); the `_doc` of `content/house.json` |
| 2 | No pin for the house on any map: its position is approximate on purpose, and a pin in the wrong place misleads. | Code comment, before the modules (`../map/view.js`); see `../map/README.md` |
| 3 | The Wi-Fi's name and password are never in git: the guide's private file (`sites/<site>/private/wifi.json`, git-ignored), the Netlify variable `WIFI_JSON`, or a guide's `content.private` in the database, which every guest with the link sees, as in the guide. A guide with none has no Wi-Fi fact and no sheet, and neither has one whose Wi-Fi is not complete: it is shown only with a password and at least one named network (`plan.js` `wifiShown`), so a Wi-Fi a host began to type never reaches guests as an empty sheet. | `../CLAUDE.md` ("Wi-Fi details never in git", decided 23 Oct 2026); this repo's `CLAUDE.md` ("A local build without ... wifi.json simply has no Wi-Fi sheet") |
| 4 | Never tell guests to contact the hosts, never the hosts' phone numbers. | `../CLAUDE.md` ("Privacy and safety") |
| 5 | The cover: by default a scene drawn in code from the guide's own colours, with no text (guests have already booked and seen the listing's photos, so it sets a welcome tone instead of selling); the host's photo replaces it when `house.json` has `photo` and `cover` is not `themed`. | Code comment, before the modules (`views/home.js`); a cover that is not the same small house for everyone: plan, proposal 7, to decide |
| 6 | The photo and the name open the house page; without a house page (module off), the house guide. | Code comment, before the modules |
| 7 | The Wi-Fi sheet: the network's name, the password with a Copy button, and a QR code for a second device; one network: singular words, no label that only says "Wi-Fi", one larger QR code in the middle with the network's name under it. The QR code is always made on the spot by the guide, from the name and the password, with one rule (`plan.js` `wifiPayload`, which escapes `; , : " \`): the generator and the build no longer make their own, and a code a guide's data still carries is not read (21 Nov 2026; a password holding one of those signs gave a maker-built guide a code that did not join). It is a real picture, not a drawing, so that a phone can read it on its own screen where it knows how. Under each code, the network's own name; with several networks whose note names a place before a colon ("House: best inside"), that place. "Same for both" is said for two networks only. The password is in letters that tell l, I and 1, O and 0 apart. The sheet closes with its cross, a tap outside it, or when the page changes (the back gesture). A network's name and the password are shown as they are, never hyphenated: a long one is cut anywhere, with no added sign (a hyphen that is not in a password is a wrong password; seen in German and French at 360 px). | Code comments, before the modules (`views/home.js`); never hyphenated: the order of fixes, round 1, Yohann's "Go" of 17 Nov 2026; one rule for the code, complete or not shown, the caption, the letters: round 2, for the test with real users of 25 Nov 2026 (proved on 21 Nov with invented networks: builder and editor to the sheet, each code read back) |
| 8 | The house page is like the listing's: photos, the key facts, the description, the beds, always linking back to the listing ("Book on Airbnb", "All photos"). A listing that is not Airbnb gets its own words. | The `_doc` of `content/house-page.json` ("Always link back to Airbnb"); this repo's `CLAUDE.md` ("Rooms and the house page", 1 Nov 2026: `LISTING_WORDS`) |
| 9 | The rooms are in the host's order, one order for the builder's Rooms and photos, the house page and the house guide. | This repo's `CLAUDE.md` ("Rooms and the house page", 1 Nov 2026) |
| 10 | What the place offers: first the most asked for that the host kept (`amenTop`), then the rest, `amenFirst` of them, and "Show all" for the whole list by group; a page with no `amenFirst` (Ca La Kimberly's, written by hand) shows eight known by their English name. | The generator's `_doc` of `house-page.json` (`engine/scripts/generate-site.py`: "amenFirst: how many show before Show all; amenTop: the most asked for"); the eight: as built |
| 11 | Ratings and reviews: the listing's own rating and its latest reviews as they are, never a selection by the host, at most three, newest first, with a link to read them all; a rating left empty falls back to the house page's. The rating under the facts jumps to them. | The `_doc` of `content/reviews.json` ("Live from the listing, never curated by hand"); code comments, before the modules |
| 12 | Long texts open on their first paragraph with "Read more". | `docs/UX-GUIDELINES.md` §6 ("Long texts open on their most inviting first paragraph with Read more") |
| 13 | The slim bar on the house page (the name, the key facts, the rating) comes in with the scroll, over the 90 px in which the facts line scrolls under it, and goes back the same way; no switch, no CSS transition. A tap goes back to the photos. | `docs/UX-GUIDELINES.md` §5 ("Anything that appears on scroll is scroll-linked ... never an on/off switch"); code comment ("that is what flickered") |
| 14 | Its photos open in the photo viewer; the gallery on top counts them ("3 / 16") as it is swiped. | As built, before the modules |
| 15 | The house page has no tile: the welcome card opens it. | `../README.md` frame rule 11 (before the frame) |
| 16 | The credits name the listing site the photos come from when the house page has a listing link, and the AI cover when the cover was made by AI. | `docs/CREDITS.md`; `engine/src/views/credits.js` |

## Its data

- `content/house.json` (its `_doc`): `name`, `lat`, `lng` (offset on purpose), `photo`, `photoPos`, `cover`, `checkout`.
  The Wi-Fi is not in it: `content.js` adds `HOUSE.wifi` from the private file (`{ password, networks: [{ ssid, label }] }`; `engine/scripts/run.js` writes it from `WIFI_JSON`; an old `qr` on a network is ignored). Ca La Kimberly's also has fields nothing reads
  (plan, F6).
- `content/house-page.json` (its `_doc`), the section `{ "id": "house", "kind": "house", "file": "house-page" }`: `url`,
  `photosUrl`, `rating`, `photos`, `summary`, `highlights` `[{ icon, t, s }]`, `description`, `tour` `[{ room, photos }]`,
  `beds`, `amenities` `[{ t, items }]`, `amenFirst`, `amenTop`; texts in six languages.
- `content/reviews.json` (its `_doc`), the module `reviews`: `rating`, `count`, `source`, `url`, `quotes`, `updated`.
- `site.json`: `name`, `logo`.

Where they come from: the listing read at the link and the builder's steps (the name, the cover, check-out, Rooms and
photos, What the place offers, one Wi-Fi network), written by the generator; Ca La Kimberly's were written by hand from
its listing. What the maker cannot change yet: the plan's gaps D4, D5, D7 to D10.

## Its look

On Home, `.sthero .hcard`: `.hc-ph` (the photo, or `.hc-art` with the drawn cover), `.hc-id` (the logo, "Welcome to",
the name, "See the house", the round arrow), `.keyfacts` (`.kf-wifi` and the check-out link). The Wi-Fi sheet `.wsheet`
over the page (`.ws-card`, `.ws-f`, `.ws-pwrow`, `.ws-copy`, `.ws-qrs`). The house page: `.hgal` with `.hcount`, the slim
bar `.hsticky`, `.hsum`, `.hbook`, `.hhl`, `.hdesc` with `.hd-more` and `.hd-tog`, `.tour`, the beds, `.amen` with
`.amkey` and `details.amall`, the reviews `.rev`, the actions.

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: what the place offers first, the slim bar's line and its coming in, long words, the reviews quoted, the Wi-Fi in a QR code, whether a Wi-Fi is shown, a network's label, the words under a code | `plan.js` (tests: `engine/scripts/house-plan.test.mjs`) | Yes |
| The welcome card, the drawn cover, whether the cover is a photo | `welcome.js` (`welcome`, `wireWelcome`, `COVER_PHOTO`) | Yes |
| The Wi-Fi sheet and its QR code | `wifi.js` | Yes |
| The house page and its slim bar | `page.js` | Yes |
| The ratings and reviews | `reviews.js` (`reviewsBlock`, also at the end of the house guide without a house page) | Yes |
| What it offers on Home: nothing to place | `offers.js` (`{}`; read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home, the section view, the house guide and the credits call | `index.js`, listed in `../index.js` | Yes |
| Where the card goes on Home | `engine/src/views/home.js` (`renderHome`) | No: the frame's drawing of Home |
| Reading the files, the Wi-Fi from the private file | `engine/src/content.js` (`HOUSE`, `REVIEWS`, `SITE`), `site-data.js` (`PRIVATE`) | No: shared |
| The private file written from `WIFI_JSON` at the build (no QR code: the guide draws it) | `engine/scripts/run.js` | No: the build's |
| The photo viewer, a page's title | `engine/src/views/section.js` (`zoomable`, `lightbox`, `sectionFrame`) | No: shared with the house guide |
| Three icons of the facts | `../info/icons.js` (`GUIDE_ICON`) | No: the house guide's |
| The round arrow, the line icons | `engine/src/ui.js` (`ARROW`, `GI`) | No: shared |
| The credits of the photos and the cover | `engine/src/views/credits.js` | No: the guide's page of credits |
| Its styles | `engine/src/styles/app.css` (`.sthero`, `.hcard`, `.hc-*`, `.keyfacts`, `.kf-wifi`, `.wsheet`, `.ws-*`, `.hgal`, `.hcount`, `.hsticky`, `.hsum`, `.hbook`, `.hhl`, `.hsec`, `.hdesc`, `.hd-*`, `.tour`, `.amen`, `.amkey`, `.amall`, `.rev`, `.rv-*`, `.a-*` for the cover) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `welcomeTo`, `seeHouse`, `qWifi`, `qWifiV`, `qCheckout`, `qCheckoutV`, `wifiNet`, `wifiNets`, `wifiPw`, `wifiPwBoth`, `wifiScan`, `copyShort`, `copied`, `close`, `theHouse`, `aboutHouse`, `readMore`, `showLess`, `photoTour`, `whereSleep`, `amenH`, `amenAll`, `bookAirbnb`, `bookAirbnbLead`, `allPhotosAirbnb`, `airbnbReviews`, `reviewsH`, `reviewsCount`, `reviewsNote`, `reviewsChecked`, `reviewsAll` | Not yet |
| From the listing and the host's answers to the files | `engine/scripts/generate-site.py`, `onboarding-site/` (`/api/listing`) | No: the generator's; the maker's |
| The drawn cover in the maker's preview (the same scene, copied) | `onboarding-site/src/preview.js` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The Check-out fact opens `#s/message`, row `checkout`, and without a house page the name opens `#s/message`: Ca La
  Kimberly's ids for its house guide and its row.
- The slim bar links to `#s/house`, and the house guide's link to the house page too: Ca La Kimberly's id for it.
- The eight amenities shown first on a page with no `amenFirst` are known by their English names (Private pool, Air
  conditioning, Wifi, Dedicated workspace, Smart TVs, Fully equipped kitchen, Charcoal, Washing machine).
- The house page's words say Airbnb ("Book on Airbnb", "All photos on Airbnb"); a guide from another listing site gets
  its own through the generator.
- The facts' icons: pool, flame, desk and view only; any other fact has none.
- The cover's crop (`photoPos`) is Ca La Kimberly's own; the maker always uses one (plan, D5).
