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
| 14 | The times of the stay live once, in the house's facts (`content/house.json`: `checkin`, `checkout`). Home's Check-out fact and the part whose id is `checkout` both read them: the part starts with "Check-in from 15:00." and "Check-out by 11:00." in the guest's language (`hgCheckin`, `hgCheckout`), then its own lines, and a time alone makes the part. No line of the part repeats a time: the generator writes none, the editor has the two times as fields of the step House guide and nowhere else. A guide built before 22 Nov 2026 holds the time again as a sentence of the generator's: it is not drawn once the field gives that time (`partItems`), and the editor takes it out at the next publish. Its check-in has no field until its host types one, so that sentence stays until then. Ca La Kimberly, a guide like any other, gains "Check-out by 12:00." at the top of its Check-out part. | The main conversation's analysis of 22 Nov 2026 (H9: a field and a sentence that could disagree after an edit); built the same day on Claude's recommendation |
| 15 | The host's photos that help find the place or the key (the builder's "Only you know") reach the guide: sent with the host's other pictures at the build and shown in "Getting here", before its lines. The builder asks for no file that does not reach the guide: "Manuals or labels" is gone from How things work (a photo of a label is added to the part it belongs to, in the editor). | The same analysis (H10: asked for, shown in the builder's phone, lost at the build); built 22 Nov 2026 on Claude's recommendation. Not built: manuals as files of their own |
| 16 | The builder's step How things work is the host's alone: nothing in a listing says how the boiler or the pool cover works, and a listing's own house manual is shown to booked guests only. Its foot says so ("Optional. Only you know this: a listing does not say it.") and never "Filled in from your listing" while nothing was. A step's foot says "Filled in from your listing" only when something in it did come from the listing. | Yohann's walk of the builder with the main conversation, 22 Nov 2026 (point 12); the rule "never an empty form" (Yohann, 10 Nov 2026). The step is no longer an empty form: rule 17 |
| 17 | In that step the builder offers what the house has that guests most often get stuck on (`HOW_ASKS` in `plan.js`, by the ids of `engine/src/amenities.json`, most asked first; the house's own from What the place offers, filled from the listing; at most eight at a time). A tap starts a line with the thing's name in the host's language ("Heating: ") and the host finishes it in a few words; an offer leaves once a line starts with it. Free, no paid call. A line nobody finished never reaches the guide or the builder's phone (`tipSaid`). In the built guide a tip that starts with a thing of the house goes to that thing's room, in any of the six languages (the generator's `thing_room`); any other tip is filed by its own words. A house whose list has none of these things gets no offer. | Yohann, 22 Nov 2026: "Yes, build it", to Claude's proposal after the walk's point 12 (the step was an empty form, so a new guide's house guide was thin) |

## Its data

One file per guide, the section's (`content/message.json` in every guide today; its `_doc` describes it): `blocks`, in
order, each `{ id, icon, tone, title, sub, photos, body, items, links }`, `title`, `sub`, `body` and each item in six
languages, `photos` the paths of the row's photos, `links` `[{ labelKey, href }]` or `[{ labelKey, dir: true }]` (the
directions to the house). Read by `content.js` with the other sections. The section in `content/sections.json`:
`{ "id": "message", "kind": "info", "labelKey": "houseGuide" }`.

Where it comes from: the host's answers in the maker (the note in each room's card of Rooms and photos, the listing's
equipment, the rules, the way in and its photos, the check-out tasks, and the builder's step How things work, one tip a
line, each filed by its words into the room it talks about), written by the generator
(`engine/scripts/generate-site.py`); Ca La Kimberly's was written by hand. The times of the stay are not in this file
(rule 14). What the maker cannot change yet (add or remove a part other
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
| The rules, pure and tested: a row's colour, its paragraphs, the directions link, which parts guests see (`partShown`), the times of the stay and a part's lines (`stayTimes`, `partItems`); pasted into the maker by `onboarding-site/src/build.py` as `INFO` | `plan.js` (tests: `engine/scripts/info-plan.test.mjs`) | Yes |
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
| Its words | `engine/src/i18n/<lang>.json`: `houseGuide`, `houseGuideLead`, `hgCheckin`, `hgCheckout`, `housePhotos`, `housePhotosSub`, a link's `labelKey` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` (tests: `worker/test/generate-house-guide.test.mjs`) | Not yet |
| The maker's step House guide (`cmHouseGuide` in `editor.js`), the builder's steps How things work and Check-in and rules and the arrival photos of Only you know (`src.html`; which pictures are sent at the build: `HOST_KINDS` in `account.js`), the builder's phone preview (`houseParts` in `preview.js`) | `onboarding-site/src/` (checks: the groups `editor` and `rooms-offers` of `onboarding-site/test/check.mjs`) | No: the maker's files |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The reviews come at the end of the house guide only when the section's id is `message`, Ca La Kimberly's id for it.
- Home's Check-out fact links to `#s/message` and opens the row `checkout`, by Ca La Kimberly's ids (`../house/welcome.js`).
- The house page link shows `house.jpg` when the guide has no `photo` in `content/house.json`.
