# Text pages (module `info`, the house guide)

The pages made of expandable rows of text, one per topic: in Ca La Kimberly the house guide ("message"), organised by
room (living room, kitchen, bedrooms, bathrooms, office, laundry, pool, outside, rules, check-out); in other guides the
same page from the host's answers, and any arrival or extras page a guide has as a section of this kind. A row opened
shows its photos, its text, its list and its buttons. On Home it is one widget, the entry tile. A section whose kind no
module knows is drawn as a text page too.

Moved into this folder on 14 Nov 2026 with Emergencies, Getting around, the house and the map (the module frame, part 2,
`../README.md`). Read this page before changing how the text pages behave, and write a changed rule here with its date.
Ca La Kimberly's house guide is the reference: the move was checked pixel for pixel and byte for byte.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | One expandable row per topic, the same look as the other lists: its icon in its colour, its title and a line under it; opened, its photos, its text (one paragraph per blank line), its items (one item as a sentence, several as a list), its buttons. | Code comment, before the modules (`views/section.js`: "one expandable row per topic, same look as the other lists") |
| 2 | The house guide is organised by room, one-word titles, no "&", each item in the room where the thing is. | The `_doc` of Ca La Kimberly's `content/message.json` ("v4, Oct 2026") |
| 3 | A row's colour by its `tone` (ink, yellow as the taxi's yellow, else the tone of that name); its icon by its `icon` among fifteen (`icons.js`), none for another. | As built, before the modules |
| 4 | A row's photos open in the photo viewer, the row's photos one after the other (swipe, the cross or the backdrop closes it). | As built (`views/section.js` `lightbox`) |
| 5 | With a house page, the page starts with a link to it ("The house", its photos). Without one, the house guide ends with the ratings and reviews. | As built; the reviews' part is known by the section's id (`message`), see "Still Ca La Kimberly's own" |
| 6 | Home's Check-out fact opens the house guide with its check-out row open, brought to the middle of the screen; rows the guest had opened stay open when the page is drawn again. | Code comments, before the modules (`main.js`: "Home shortcuts that open one row of the House guide"; `views/section.js` `sectionFrame`) |
| 7 | A "Directions" button of a row goes to the house's position in Google Maps, never to an address: the position is offset by about 350 m on purpose. | `../CLAUDE.md` ("Never show the house address. The house coordinates are offset by about 350 m on purpose"); the `_doc` of `content/house.json` |
| 8 | Never tell guests to contact the hosts, never the hosts' phone numbers, in any row. | `../CLAUDE.md` ("Privacy and safety") |
| 9 | Its tile on Home is an entry tile, half, wide or tall, with no live line. | Yohann, 14 Nov 2026 (proposal 22, `../README.md`); the sizes: what the frame gave every section with no module of its own |
| 10 | A section of a kind no module knows is drawn as a text page, and its tile as a text page's. | As built (the section view's last branch, `views/section.js`; the tile's, `views/home.js`) |

## Its data

One file per guide, the section's (`content/message.json` in every guide today; its `_doc` describes it): `blocks`, in
order, each `{ id, icon, tone, title, sub, photos, body, items, links }`, `title`, `sub`, `body` and each item in six
languages, `photos` the paths of the row's photos, `links` `[{ labelKey, href }]` or `[{ labelKey, dir: true }]` (the
directions to the house). Read by `content.js` with the other sections. The section in `content/sections.json`:
`{ "id": "message", "kind": "info", "labelKey": "houseGuide" }`.

Where it comes from: the host's answers in the maker (rooms, notes, listing equipment, rules, check-out), written by the
generator (`engine/scripts/generate-site.py`); Ca La Kimberly's was written by hand. What the maker cannot change yet
(add or remove a part, its icon and colour, move a line): the plan's gaps C and K, proposal 9.

## Its look

The page: the title and its lead, the link to the house page when there is one (`.allphotos`), then the rows
(`.mlist.guide`, each `.mrow` with `data-id` and `data-tone`; opened, `.mbody`: `.gphotos.zg` photos, `.note`
paragraphs, `.glist` items, `.actions` buttons). On Home, the entry tile, its colour and icon by the section's id
(`ui.js` `SECTION_LOOK.message`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: a row's colour, its paragraphs, the directions link | `plan.js` (tests: `engine/scripts/info-plan.test.mjs`) | Yes |
| The icons of the rows (three are also the house page's) | `icons.js` (`GUIDE_ICON`) | Yes |
| The page | `page.js` | Yes |
| The Home widget | `widget.js` | Yes |
| What it offers on Home: its entry tile, half, wide or tall | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home and the section view call | `index.js`, listed in `../index.js` | Yes |
| A page's title, lead, opened rows kept, the row a Home shortcut asks for | `engine/src/views/section.js` (`sectionFrame`) | No: shared with every section's page |
| The photo viewer | `engine/src/views/section.js` (`zoomable`, `lightbox`) | No: shared with the house page |
| The reviews at the end when there is no house page | `../house/reviews.js` (`reviewsBlock`) | No: the house's |
| The Check-out shortcut on Home, and the click that remembers which row to open | `../house/welcome.js`; `engine/src/main.js` (`window.__openRow`) | No: the house's; the router's |
| Its styles | `engine/src/styles/app.css` (`.mlist.guide`, `.mrow`, `.mbody`, `.gphotos`, `.glist`, `.allphotos`, `.gt[data-k="message"]`, `.lbox`) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `houseGuide`, `houseGuideLead`, `housePhotos`, `housePhotosSub`, a link's `labelKey` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` | Not yet |
| The maker's steps (rooms, How things work, Check-in and rules, Check-out) | `onboarding-site/src/` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The reviews come at the end of the house guide only when the section's id is `message`, Ca La Kimberly's id for it.
- Home's Check-out fact links to `#s/message` and opens the row `checkout`, by Ca La Kimberly's ids (`../house/welcome.js`).
- The house page link shows `house.jpg` when the guide has no `photo` in `content/house.json`.
- The comment in `main.js` names two Home shortcuts that open a row, "Wifi, Check-out"; the Wi-Fi fact opens the Wi-Fi
  sheet instead (`../house/wifi.js`), so only Check-out does (as built).
