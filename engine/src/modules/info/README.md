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
| 11 | Guests see a part only when it has words of its own: a text, a line or a button, in any language. Photos alone, or only the line under the title, do not make a part: the house page shows the photos, and a part must never open on nothing. The part stays in the guide's data, so the host finds it in the editor, where its row says "Guests do not see this part yet: add a line." The builder's phone shows the same parts as guests will see. | Claude's recommendation, built 21 Nov 2026 in round 2 of the ordered fixes (Yohann's "Go" to the list, 17 Nov 2026; his rule "real information or nothing for guests"). Seen on the maker-built pool house on 16 Nov: eight of ten parts opened on photos or on nothing |
| 12 | In the editor every part can have a line under its title (an empty one is not drawn), and a guide with no Check-out part can add one: id `checkout`, the key, ink, named "Check-out" in the guide's languages, so that Home's Check-out fact has a part to open. | Claude's recommendation, built 21 Nov 2026 (the plan's gap C, in part) |
| 13 | In a new guide the line under a part's title and its "Also in the kitchen: ..." say the things of that room in our own names (`engine/src/amenities.json`), in every language of the guide and in the listing's order, never in the listing's raw words ("Free washer – In unit"). Left out: a thing our list does not know, a view, Wi-Fi, parking, the room's own name ("Pool" under Pool). What is outdoors goes outside (the outdoor shower, the outdoor kitchen), the pool stays the pool's. A guide built before keeps its lines until its host changes them. | Claude's recommendation, built 21 Nov 2026 (the plan's gap K, in part) |

## Its data

One file per guide, the section's (`content/message.json` in every guide today; its `_doc` describes it): `blocks`, in
order, each `{ id, icon, tone, title, sub, photos, body, items, links }`, `title`, `sub`, `body` and each item in six
languages, `photos` the paths of the row's photos, `links` `[{ labelKey, href }]` or `[{ labelKey, dir: true }]` (the
directions to the house). Read by `content.js` with the other sections. The section in `content/sections.json`:
`{ "id": "message", "kind": "info", "labelKey": "houseGuide" }`.

Where it comes from: the host's answers in the maker (the note in each room's card of Rooms and photos, the listing's
equipment, the rules, the way in, the check-in and check-out times and tasks), written by the generator
(`engine/scripts/generate-site.py`); Ca La Kimberly's was written by hand. The builder no longer asks "how things work" as
one text (`answers.howTos` is still read for old answers). What the maker cannot change yet (add or remove a part other
than Check-out, its icon and colour, move a line, the paragraph under the lines, a part's button): the plan's gaps C and K,
proposal 9.

## Its look

The page: the title and its lead, the link to the house page when there is one (`.allphotos`), then the rows
(`.mlist.guide`, each `.mrow` with `data-id` and `data-tone`; opened, `.mbody`: `.gphotos.zg` photos, `.note`
paragraphs, `.glist` items, `.actions` buttons). On Home, the entry tile, its colour and icon by the section's id
(`ui.js` `SECTION_LOOK.message`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: a row's colour, its paragraphs, the directions link, which parts guests see (`partShown`, pasted into the maker by `onboarding-site/src/build.py` as `INFO`) | `plan.js` (tests: `engine/scripts/info-plan.test.mjs`) | Yes |
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
| From the host's answers to the file | `engine/scripts/generate-site.py` (tests: `worker/test/generate-house-guide.test.mjs`) | Not yet |
| The maker's step House guide (`cmHouseGuide` in `editor.js`), the builder's phone preview of it (`houseParts` in `preview.js`) | `onboarding-site/src/` (checks: the group `editor` of `onboarding-site/test/check.mjs`) | No: the maker's files |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The reviews come at the end of the house guide only when the section's id is `message`, Ca La Kimberly's id for it.
- Home's Check-out fact links to `#s/message` and opens the row `checkout`, by Ca La Kimberly's ids (`../house/welcome.js`).
- The house page link shows `house.jpg` when the guide has no `photo` in `content/house.json`.
