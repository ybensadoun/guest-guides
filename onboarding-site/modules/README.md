# The modules page (the owner's own console)

Yohann, 16 Nov 2026: "a UI for me to be able to say that this module is available in this country or not [...] see
examples of what it looks like from the builder side and also from the user side [...] play with it and see what actually
happens [...] this is just for me, but it should be as accurate as possible [...] I send the feedback to the right
channel." Served at `/modules/` on porta-guides: a real folder, like `/privacy/`, so the maker's catch-all does not
touch it. Not a module of the guide and not a step of the maker. First version, 16 Nov 2026: NOT live yet (below,
"Where it stands").

## What it does
| Part | What | Where |
|---|---|---|
| The fourteen | The modules in the conversations' order, each with its parts, where they work and its new feedback | `console.js` `MODS`, `overview` |
| Countries | Each part with why it works where it does (the code's list) and a switch per country; a switch that differs from the list says "Your change"; a short note per part and country | `countriesTab`; the list: `engine/src/modules/available.json` |
| Play | The maker's real editor step beside the real guest page, on a sample house: house, step, language, width, Reload, Reset | `play`, `stageMount` |
| Feedback | His words saved with what he was looking at (module, part, step, guest page, house, language, width), for the module's conversation or, ticked, the main one; each item new, handed out or done | `fbBox`, `feedbackTab` |

## Its rules
| # | Rule | Decided |
|---|---|---|
| 1 | Only the owner. The page's files hold nothing private (the repo is public); the database decides: `is_owner()` answers true for the account whose id is in the table `owners`, which nobody can write through the site, and every table of this page lets only that account in. Anyone else, or no login, sees a notice and nothing more. | Claude's proposal, 16 Nov 2026; Yohann's yes to the statement still to come |
| 2 | One list of parts and countries, in the code: `engine/src/modules/available.json`. This folder's `available.json` is a copy made by `build.mjs` (Netlify serves only `onboarding-site/`): never edit it. The owner's switches are rows in the database and win over the list. | The brief (MODULE-CONVERSATIONS.md, 15): "one list in the code, never a second copy of a rule" |
| 3 | The first version records and shows. The maker and the generator do not read the switches yet: that is the second step. | The brief |
| 4 | Never a mock, never a second editor: the stage is the maker itself in a frame (`/?step=<id>`) and the shared viewer with the draft (`/g/<slug>?preview`). At "Desktop" the maker is drawn at 1280 px, where it shows its own phone beside the step; at "Phone" both are 360 px wide, side by side; on a small screen one side at a time at the screen's width. | The brief |
| 5 | Playing happens on sample houses only (guides of the owner whose address starts with `sample-`), never on a real guide. The maker opens the house this device remembers (`porta-house-v1`): the page sets it to the sample house while its frame is open and puts the owner's own house back when the frame goes. If the maker inside is taken to another house, the frames close. | Claude, 16 Nov 2026 |
| 6 | Reset writes the house's fixture (`samples/<slug>.json`) into its row and empties its draft; event dates move with today. One confirmation. | The brief ("put back with one Reset") |
| 7 | A sample house never starts a paid search and is never published: both are rules of the database (to be created), not of this page. | The brief; Claude's proposal, 16 Nov 2026 |
| 8 | A page cannot wake a conversation: the main conversation reads the new feedback and hands it out, marking each item handed out. | The brief |
| 9 | The builder's steps (before a guide exists) are not played here yet: the builder starts research by itself, which costs money. | Claude, 16 Nov 2026; to settle with Yohann |

## Its files
| File | What |
|---|---|
| `index.html`, `console.css`, `console.js` | The page. No framework, no build of its own |
| `build.mjs` | Copies the engine's list to `available.json` (checked) and writes `samples/index.json`. Run it after changing the list or a fixture: `node onboarding-site/modules/build.mjs` |
| `samples/` | The sample houses: how they are made (`make.mjs`) and their fixtures. Its own README |
| `test/check.mjs` | The page on a pretend database, at 1280 px and 360 px |
| `../../engine/scripts/available.test.mjs` | The list is well made, the copies are in step |

## The database (to be created: needs Yohann's yes, statement in the hand-over note)
`owners` (the owner's account id), `is_owner()`, `module_switches` (module, part, country, is_on, note), `module_feedback`
(module, part, words, across, seen, state), and two guards on sample houses (never published, no paid job).

## Where it stands (16 Nov 2026)
Built in code, on a branch, not pushed. The database part does not exist yet, so the live page would only say "Not set
up yet". Not built: the switches acting on the maker and the generator; the builder's side; a module's Home tile in each
size by one tap (today: the step "Its tile on Home" opens the board, where a tap on the tile gives its sizes).
