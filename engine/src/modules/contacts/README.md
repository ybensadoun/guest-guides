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
| 4 | Its links: "Open map" (its own map link, else a Google Maps search for its address), its website, one other link with its word; the call button shows the number as dialled and calls it with the spaces dropped. | Code comment, before the modules; the `_doc` ("phone (optional, as dialled)") |
| 5 | A number taken from a directory is marked to check (`verify`); its sources are written in the guide's research notes. | The `_doc` of `content/emergency.json` |
| 6 | The numbers are researched for the host (automatic), not typed by the host. | `worker/README.md` ("Markets, events and emergency numbers stay automatic") |
| 7 | Its tile says "Emergencies", shorter than the page's title. | Code comment, before the modules (`views/home.js`: "Short label on the tile; the page itself keeps the full title") |
| 8 | Its tile on Home is an entry tile, half, wide or tall; a tall tile keeps the half tile's title size, since "Emergencies" was wider than a tall tile's larger title at 360 px. | Yohann, 14 Nov 2026 (proposal 22); the title: Claude, 14 Nov 2026, from the frame check, to confirm with Yohann (`../README.md` frame rule 13) |
| 9 | Its colour is the strong role, red in every colour world, so that Emergencies always reads as urgent. | Plan, step 3, the first mockups of the colour worlds (10 Nov 2026: "Strong stays in the red family in every world, so Emergencies always reads as urgent"), after Yohann's decision of one tile system that day; `engine/src/worlds.js` |

## Its data

One file per guide, `content/emergency.json` (its `_doc` describes it): `groups`, in order, each `{ id, items }`; each
item `{ id, name, what, phone, address, schedule or always, web, map, link: { url, label }, verify }`, `name` and `what`
in six languages, `schedule` as the markets' (days, open, close). Read by `content.js` with the other sections. The
section in `content/sections.json`: `{ "id": "emergency", "kind": "contacts", "labelKey": "emergency" }`.

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
| The rules, pure and tested: a group's word, an address's map link, the tile's label | `plan.js` (tests: `engine/scripts/contacts-plan.test.mjs`) | Yes |
| The page | `page.js` | Yes |
| The Home widget, its short label | `widget.js` | Yes |
| What it offers on Home: its entry tile, half, wide or tall | `offers.js` (read by the frame through `views/home.js`, and by the node scripts through `../offers.js`) | Yes |
| What Home and the section view call | `index.js`, listed in `../index.js` | Yes |
| The phone icon, a number as a `tel:` link | `engine/src/ui.js` (`PHONE`, `tel`) | No: shared with Getting around and a highlight's page |
| Hours and statuses | `engine/src/schedule.js`, `content.js` (`slots`) | No: shared machinery |
| A page's title and lead | `engine/src/views/section.js` (`sectionFrame`) | No: shared with every section's page |
| Its styles | `engine/src/styles/app.css` (`.cgroup`, `.clist`, `.crow`, `.ctx`, `.chours`, `.clinks`, `.cmap`, `.ccall`, `.gt[data-k="emergency"]`; the status line: `.crow .chours .st`, which undoes for this page the shared status's stack and 8 em width) | Not yet: they move with the one tile system (plan, proposal 4) |
| Its words | `engine/src/i18n/<lang>.json`: `emergency`, `emergencyTile`, `c_<group>`, `open24`, `openMap`, `website` | Not yet |
| From the research to the file | `worker/guide-worker.mjs` (contacts), `engine/scripts/generate-site.py` | No: the worker's; the generator's |
| The maker's step | `onboarding-site/src/editor.js` | No: the maker's |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The tile's short label is known by the section's id `emergency` (`plan.js` `tileLabelKey`): a contacts section with
  another id keeps the page's title on its tile.
- The colour and icon of the tile are known by the section's id (`SECTION_LOOK.emergency`).
- The page's hours carry an empty "next" part (`page.js`, `next`), left from an earlier design: nothing fills it.
