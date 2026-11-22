# Emergencies (module `contacts`)

The numbers a guest may need, by group, most urgent first: in Ca La Kimberly the emergency number, health (the hospital,
the clinic, the pharmacy), the police and the town hall. Each row says what it is and when to use it, when it is open
with its live status, and offers a call button, a map link, its website or another link. On Home it is one widget, the
entry tile, with a short label ("Emergencies").

Moved into this folder on 14 Nov 2026 with the text pages, Getting around, the house and the map (the module frame,
part 2, `../README.md`). Read this page before changing how Emergencies behave, and write a changed rule here with its
date. Ca La Kimberly's page is the reference: the move was checked pixel for pixel and byte for byte.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Never tell guests to contact the hosts, and never the hosts' phone numbers: not here, not anywhere in the guide. | `../CLAUDE.md` ("Privacy and safety"); the `_doc` of `content/emergency.json` ("Never add the hosts' own numbers") |
| 2 | Groups in the file's order, most urgent first; a group's heading is the guide's word `c_<id>`, and a hospital, a pharmacy, a clinic or a medical centre is under Health. A group the research names its own way, with no word of the guide, has no heading. | The `_doc` of `content/emergency.json` ("groups[] in display order, most urgent first; group title from i18n key c_<id>"); code comment ("research can name a group its own way") |
| 3 | Each row: its name, what it is and when to use it, then its hours: "Open 24 h", or the same words and live status as the markets (open now, else closed with when it opens), and the week; a row with neither shows no hours. The status is one line, in one size: "Closed · Opens tomorrow 9:30", "Open until 13:30 · Reopens at 17:00"; when the two parts do not fit (Spanish, Catalan, German at 360 px) the second goes whole under the first, never a line starting with a dot, never a time cut. | Code comment, before the modules (`views/section.js`: "same format and live status as markets"); the `_doc`. One line: Yohann's "Go" to the ordered list, 17 Nov 2026 (fix 09.4), built 21 Nov 2026: stacked as at the right of a list's row it took three lines, the time alone on the last |
| 4 | Its links: "Open map" (its own map link, else a Google Maps search for its address), its website, one other link with its word. The call button calls the number as the guide holds it, the spaces dropped, and shows it as the guide writes numbers: one held in one piece ("977257914", "+34977257914", as the research writes them) is grouped "977 25 79 14" by Getting around's rule (`txPhone`, one rule, not copied); one written with spaces stays as written ("900 878 212", "91 562 04 20"), and so does a short number (112, 061). | Code comment, before the modules; the `_doc` ("phone (optional, as dialled)"). The grouping: the main conversation's turn of 21 Nov 2026, before the test of 25 Nov with real users, after the pool house's page showed "977257914"; done where the page draws the number, so that guides already built get it |
| 5 | A number taken from a directory is marked to check (`verify`); its sources are written in the guide's research notes. | The `_doc` of `content/emergency.json` |
| 6 | The numbers are researched for the host (automatic), not typed by the host. | `worker/README.md` ("Markets, events and emergency numbers stay automatic") |
| 7 | Its tile says "Emergencies", shorter than the page's title. | Code comment, before the modules (`views/home.js`: "Short label on the tile; the page itself keeps the full title") |
| 8 | Its tile on Home is an entry tile, half, wide or tall; a tall tile keeps the half tile's title size, since "Emergencies" was wider than a tall tile's larger title at 360 px. | Yohann, 14 Nov 2026 (proposal 22); the title: Claude, 14 Nov 2026, from the frame check, to confirm with Yohann (`../README.md` frame rule 13) |
| 9 | Its colour is the strong role, red in every colour world, so that Emergencies always reads as urgent. | Plan, step 3, the first mockups of the colour worlds (10 Nov 2026: "Strong stays in the red family in every world, so Emergencies always reads as urgent"), after Yohann's decision of one tile system that day; `engine/src/worlds.js` |
| 10 | Emergencies is never empty and never "Coming soon". A guide whose research left no contacts (the day's research spent, a search that failed) gets by itself what needs no search, the module's own minimum (`minimum.json`: 112, in six languages, and the Health group, empty, for the host's hospital and pharmacy), and its page is live. In the maker the step Contacts is always there: a guide with no contacts has one button that brings the same minimum and puts the page live. Guests are never shown a group with no contact, a contact with no name yet, or "Closed" for a contact whose hours are not typed. A new contact in the editor has a contact's own fields (name, what guests need to know, address, phone, website, hours), whatever its group holds. Never a host's own number (rule 1). | Yohann's deadline of 25 Nov 2026 (real users build guides), the main conversation's analysis of 22 Nov 2026 (H3: "Emergencies: Coming soon" that the host could not fix), built 22 Nov 2026; researched contacts are unchanged, proved byte for byte (`onboarding-site/modules/test/same-guide.mjs`) |
| 11 | Nothing a guide holds may blank this page: it is the one a guest opens in an emergency. A contact's hours are read through `contactHours` (`plan.js`): days as a list, or as a research wrote them ("mon-fri", "sat", "mon": a range, a single day or a list in words, read by `engine/src/days.js`); a row that cannot be read is left out, so the contact shows the hours that can be read, or none, never "Closed" by mistake and never an error. Its words may be a string or per language, a link is a web address or nothing, a number may be a number; a contact that still cannot be drawn is left out alone, the rest of the page stays. The worker brings a research's hours to the one shape before it writes them, the contacts' groups too (`worker/hours-shape.mjs`). No guide's data is patched by hand: the page reads what the guides already hold. | A guide built through the maker on 22 Nov 2026 (06:48) had a blank Emergencies page: its research wrote "days": "mon-fri" and the page threw "e.days.map is not a function"; the main conversation's turn of that morning, built the same day. Yohann, 21 Nov 2026: never a fix for one guide |

## Its data

One file per guide, `content/emergency.json` (its `_doc` describes it): `groups`, in order, each `{ id, items }`; each
item `{ id, name, what, phone, address, schedule or always, web, map, link: { url, label }, verify }`, `name` and `what`
in six languages, `schedule` as the markets' (days, open, close). Read by `content.js` with the other sections. The
section in `content/sections.json`: `{ "id": "emergency", "kind": "contacts", "labelKey": "emergency" }`.

With no research at all: `minimum.json` in this folder (its `_doc` says what it is), written into the guide by the
generator and marked `_research`, so that a later research replaces it; the maker holds the same file (pasted by
`onboarding-site/src/build.py` as `CONTACTS_MIN`).

Where it comes from: the contacts research of the worker at the build (`worker/guide-worker.mjs`); Ca La Kimberly's was
written by hand, with its sources (`sites/ca-la-kimberly/docs/RESEARCH-NOTES.md`). What the maker cannot change yet (add,
rename or remove a group, an "open 24 h" switch, hours): the plan's gap D2, proposal 10.

## Its look

The page: the title and its lead, then each group (`.cgroup`, its heading `.section-h`) as a list (`.clist`) of rows
(`.crow`: `.ctx` with the name, what it is, `.chours` with the status pill and the week, `.clinks`; on the right the call
button `.ccall` with the phone icon and the number). On Home, the entry tile, its colour and icon by the section's id
(`ui.js` `SECTION_LOOK.emergency`).

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested: a group's word, an address's map link, the tile's label, a number as shown (`phoneShown`), hours, words and links as the page may read them (`contactHours`, `wordOf`, `linkOf`) | `plan.js` (tests: `engine/scripts/contacts-plan.test.mjs`) | Yes |
| How a Spanish number is grouped | `engine/src/modules/transport/taxis.js` (`txPhone`), imported by `plan.js` | No: Getting around's, the one rule; to move to a shared place when that file may change (the maker pastes it, `onboarding-site/src/build.py`) |
| The page | `page.js` | Yes |
| The Home widget, its short label | `widget.js` | Yes |
| What it offers on Home: its entry tile, half, wide or tall | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home and the section view call | `index.js`, listed in `../index.js` | Yes |
| The phone icon, a number as a `tel:` link | `engine/src/ui.js` (`PHONE`, `tel`) | No: shared with Getting around and a highlight's page |
| Hours and statuses | `engine/src/schedule.js`, `content.js` (`slots`) | No: shared machinery |
| The days of a week as a research may write them | `engine/src/days.js` (`daysList`; tests in `engine/scripts/contacts-plan.test.mjs`) | No: shared with the worker (`worker/hours-shape.mjs`, tests `worker/test/hours-shape.test.mjs`) |
| A page's title and lead | `engine/src/views/section.js` (`sectionFrame`) | No: shared with every section's page |
| Its styles | `engine/src/styles/app.css` (`.cgroup`, `.clist`, `.crow`, `.ctx`, `.chours`, `.clinks`, `.cmap`, `.ccall`, `.gt[data-k="emergency"]`; the status line: `.crow .chours .st`, which undoes for this page the shared status's stack and 8 em width) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `emergency`, `emergencyTile`, `c_<group>`, `open24`, `openMap`, `website` | Not yet |
| What a guide holds with no research | `minimum.json` (tests: `worker/test/generate-emergency.test.mjs`) | Yes |
| From the research to the file | `worker/guide-worker.mjs` (contacts), `engine/scripts/generate-site.py` | No: the worker's; the generator's |
| The maker's step | `onboarding-site/src/editor.js` (`cmContacts`, `cmContactsEnsure`, a new contact in `edNewItem`) | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The tile's short label is known by the section's id `emergency` (`plan.js` `tileLabelKey`): a contacts section with
  another id keeps the page's title on its tile.
- The colour and icon of the tile are known by the section's id (`SECTION_LOOK.emergency`).
- The page's hours carry an empty "next" part (`page.js`, `next`), left from an earlier design: nothing fills it.
