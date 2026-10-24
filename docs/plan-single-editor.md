# Plan: one editor, the step-by-step one (decided 23 Oct 2026)

Yohann, 23 Oct: "there should be a single editing", the pretty step-by-step one. Every guide, Ca La Kimberly included, is edited in the same steps as the onboarding. The tab editor ("My guide") goes.

## How it works
- **Before the first build** the steps collect the host's answers, as today. "Send to build my guide" queues the build (worker).
- **Once the guide exists** (built from the answers, or imported like Ca La Kimberly) the same pages, groups, tiles, rail and bottom bar show the guide itself: the steps read and write `content` and `theme`, not the answers.
- **Drafts.** Every change saves to `guides.draft` (`{content, theme, savedAt}`), never seen by guests: `get_published_guide` only returns `content`. A step shows "Changed" until published.
  - **Preview** opens `/g/<slug>?preview` on porta-guides: the owner (logged in there) sees the draft, with a bar saying it is not live yet. Not kept as the offline copy.
  - **Publish changes** copies the draft into `content`/`theme` and empties `draft`. Live at once at `/g/<slug>` and at a guide's own address (both read the database).
  - **Undo all changes** empties `draft`.
- **Background jobs and the draft**
  - Translation ("Translate missing texts") works on the draft, or makes one, so new translations are previewed and published like any change.
  - The monthly check fixes the live guide and the same places in the draft (links, Google ids, dates, hours where allowed).
  - `guide:push` refuses while a draft exists (publish or undo it in the editor first, or `--drop-draft`). `guide:pull` says when there is one.
  - A rebuild from answers empties the draft.

## Steps once the guide exists
| Group | Step | Edits |
|---|---|---|
| The basics | Name and languages | guide name, house name, link preview text, listing link, logo, languages, translation |
| | The look | layout (same skeleton cards as the onboarding), fonts, colours, cover (drawn or own photo) |
| | Guide sections | which sections show |
| The house | The house page | summary, description, rating, highlights, beds, amenities, photos, tour (when the guide has one) |
| | House guide | check-out time, then each block: title, lines, photos |
| | Wi-Fi | networks, password (QR made by the guide) |
| Practical | Rubbish | collection time, each fraction (bin, days, examples), containers, how to sort |
| | Contacts | emergency groups and their contacts |
| | Getting around | taxis (other numbers, 24 h), train stations and bus stops (pin from a Google Maps link, minutes by car, lines in their colours, journey times), and whether it also shows as a Home tile |
| | Home tiles | a bar you love, a shop (taxis and stations are in Getting around) |
| Around you | Things to do, Bars and restaurants, Markets, Events | each place: texts, links, position, opening hours |

## Find more and Home tiles (added 23 Oct)
- **Find more** on Things to do, Markets and Events: a `find-*` job (worker/README.md). The editor shows the suggestions one card at a time ("Add to my guide", "Not for us", "Skip the rest"); kept ones go into the draft, and the section is switched on and made live if the guide had none (a guide built without events). Suggestions wait in the job for 14 days; which ones were looked at is remembered in the browser.
- **Show on the home page** on a bar or restaurant: a Home tile copied from it (`from` = the restaurant's id), reworded in Home tiles. No separate "delivery service" tile: a pinned restaurant with a comment covers it (Yohann, 23 Oct).

## Automatic events (added 23 Oct, Yohann)
Events have one search ("Finding events", one "Search now"): with "Keep events up to date" on, results go straight into the guide; off, they come as cards to keep or skip (the Find more cards). With the switch on: every month (monthly task, `npm run refresh-events`) and right away when switched on or on "Search now", the worker searches the next three months and adds events straight into the guide, with "expected" dates until confirmed. Topics to skip and to look for, in any language; each topic to look for gets its own focused search, next to a general one that looks for the area's own traditions (castells in Catalonia, Semana Santa in Andalusia...). The host's own events are never changed; a deleted automatic event never comes back. The settings save at once in the live guide and the draft (`set_events_auto`), since they are not something guests see. Ca La Kimberly is switched on as the test case.

## Getting around (added 23 Oct, Yohann)
A section of its own (kind `transport`, `content/transport.json`, "At the house"), with the page Ca La Kimberly's "Taxi & train" tile used to open. Its `tile` adds a one-tap tile at the end of the Home tiles; the section tile then stays off the Home grid, so nothing shows twice. New guides get it from the onboarding's taxi answer. `engine/scripts/move-transport.mjs <site>` moves an old taxi-and-train Home tile into it (done for Ca La Kimberly after the engine went live).

## Later (BACKLOG)
"Load my listing again" (house page, photos, reviews), a reviews step, adding a new part to the house guide.
