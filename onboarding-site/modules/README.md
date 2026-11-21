# The launch desk (the owner's own page; first called the modules page)

Yohann, 16 Nov 2026: "a UI for me to be able to say that this module is available in this country or not [...] see
examples of what it looks like from the builder side and also from the user side [...] play with it and see what actually
happens [...] this is just for me, but it should be as accurate as possible [...] I send the feedback to the right
channel." Served at `/modules/` on porta-guides: a real folder, like `/privacy/`, so the maker's catch-all does not
touch it. Not a module of the guide and not a step of the maker. First version, 16 Nov 2026: NOT live yet (below,
"Where it stands").

Yohann, 17 Nov 2026, on what it is for: "this entire chat is meant to be about me defining what is available or not, and
being able to launch different services in different modules in different countries [...] if I need to improve the
modules themselves, I'll do it in the conversations about it. But this is just an on-off switch"; and: "I can also launch
a different country, and then have consequences in other modules. Because otherwise, I need to go conversation by
conversation if I need to launch a new market. And I think there should be a flow, a guide. In this country, so what do
you want to add here? [...] We don't have this information in transportation. Do you want to add it? What can you add?"
So the launch desk comes first; the play area and the feedback box, which the first brief asked for, come second.

## What it does
| Part | What | Where |
|---|---|---|
| Countries (the launch desk) | Every country with its state (open, not open yet) and how many parts are on. Preparing a country sorts every part of every module into "Needs work there" (why it is tied to other countries, what it needs there, a switch to launch with it anyway, "Ask for it" in his own words) and "Works there already" (a switch each); Launch opens it, Close takes it back | `countriesView`, `countryView`, `countryPut` |
| The fourteen | The modules in the conversations' order, each with its parts, where they work and its new feedback | `console.js` `MODS`, `overview` |
| Countries | Each part with why it works where it does (the code's list) and a switch per country; a switch that differs from the list says "Your change"; a short note per part and country | `countriesTab`; the list: `engine/src/modules/available.json` |
| Play | The maker's real editor step beside the real guest page, on a sample house: house, step, language, width, Reload, Reset | `play`, `stageMount` |
| Feedback | His words saved with what he was looking at (module, part, step, guest page, house, language, width), for the module's conversation or, ticked, the main one; each item new, handed out or done | `fbBox`, `feedbackTab` |

## Its rules
| # | Rule | Decided |
|---|---|---|
| 1 | Only the owner. The page's files hold nothing private (the repo is public); the database decides: `is_owner()` answers true for the account whose id is in the table `owners`, which nobody can read or write through the site, and every table of this page lets only that account in. Anyone else, or no login, sees a notice and nothing more. | Claude's proposal, 16 Nov 2026; Yohann, 17 Nov 2026: "Yes, create them" |
| 2 | One list of parts and countries, in the code: `engine/src/modules/available.json`. This folder's `available.json` is a copy made by `build.mjs` (Netlify serves only `onboarding-site/`): never edit it. The owner's switches are rows in the database and win over the list. | The brief (MODULE-CONVERSATIONS.md, 15): "one list in the code, never a second copy of a rule" |
| 3 | The first version records and shows. The maker and the generator do not read the switches yet: that is the second step. | The brief |
| 4 | Never a mock, never a second editor: the stage is the maker itself in a frame (`/?step=<id>`) and the shared viewer with the draft (`/g/<slug>?preview`). At "Desktop" the maker is drawn at 1280 px, where it shows its own phone beside the step; at "Phone" both are 360 px wide, side by side; on a small screen one side at a time at the screen's width. | The brief |
| 5 | Playing happens on sample houses only (guides of the owner whose address starts with `sample-`), never on a real guide. The maker opens the house this device remembers (`porta-house-v1`): the page sets it to the sample house while its frame is open and puts the owner's own house back when the frame goes. If the maker inside is taken to another house, the frames close. | Claude, 16 Nov 2026 |
| 6 | Reset writes the house's fixture (`samples/<slug>.json`) into its row and empties its draft; event dates move with today. One confirmation. | The brief ("put back with one Reset") |
| 7 | A sample house never starts a paid search and is never published: both are rules of the database (to be created), not of this page. | The brief; Claude's proposal, 16 Nov 2026 |
| 8 | A page cannot wake a conversation: the main conversation reads the new feedback and hands it out, marking each item handed out. | The brief |
| 10 | No door is closed: a house in any country gets a guide, made of the parts that are on there, and the builder says what its country does not have yet. | Yohann, 21 Nov 2026: "when you put your Airbnb listing link, it [tells] where you are, and then it will show you the modules that actually work for that country [...] bake it into the logic" |
| 13 | A country is launched when the owner launched it; with no word of his, when the code's list names it (`countries` in `available.json`: Spain). In a country he is still preparing his switches wait, and a house there gets what the list says (the parts that work anywhere); from the launch his switches count. The page shows what he has set (`avPartSet`), a house gets what is on (`avPartOn`), both in `engine/src/modules/available.js`. | Claude, 21 Nov 2026, from rule 10, told to Yohann |
| 11 | A part tied to countries says in the list what it needs elsewhere (`needs`), and the page shows it when a country is prepared. Such a part is off there unless the owner switches it on. What he asks for is saved as a request (module, part, country, his words) for that module's conversation, with a state: asked, being built, done. When the work lands, the module's conversation adds the country to the part's `where` in the list. | Yohann, 17 Nov 2026 ("Do you want to add it? What can you add?"); the states: Claude |
| 12 | No live AI on the page yet: a web page cannot talk to the conversations, so requests are handed out by the main conversation, like feedback (rule 8). An AI helper that answers on the page would be a paid call per question: to decide with Yohann. | Claude, 17 Nov 2026, told to Yohann |
| 9 | The builder's steps (before a guide exists) are not played here yet: the builder starts research by itself, which costs money. | Claude, 16 Nov 2026; to settle with Yohann |

## Its files
| File | What |
|---|---|
| `index.html`, `console.css`, `console.js` | The page. No framework, no build of its own |
| `build.mjs` | Copies the engine's list to `available.json` (checked) and writes `samples/index.json`. Run it after changing the list or a fixture: `node onboarding-site/modules/build.mjs` |
| `samples/` | The sample houses: how they are made (`make.mjs`) and their fixtures. Its own README |
| `test/check.mjs`, `test/pretend.mjs` | The page on a pretend database, at 1280 px and 360 px (130 checks) |
| `test/start-check.mjs` | The maker's start with the desk's call hanging, refused (500), too many connections (429), unreachable, absent, not JSON or with rows: the maker opens the same, as fast, the link field takes a link at once, and the host is shown nothing (206 checks, a visitor and the editor, 1280 and 360 px) |
| `test/gates-check.mjs` | The gates in the editor: Getting around on a sample house in Spain, at a border, in France (130 checks, 1280 and 360 px) |
| `test/pictures.mjs` | Every module pictured five ways on a sample house: the guide on a phone and a desktop screen, the maker's step on both, its Countries tab |
| `../../engine/scripts/available.test.mjs` | The list is well made, the copies are in step |

## The database
In `database.sql`. For the launch desk, created on 17 Nov 2026 on Yohann's yes and tried as nobody, as another account and as the owner: `owners` (the owner's account id), `is_owner()`,
`launch_countries` (country, state), `module_switches` (module, part, country, is_on, note), `launch_public()` (what the
maker will read without a login: states and switches, never the notes), `module_feedback` (kind request or feedback,
module, part, country, words, across, seen, state). For the play area, proposed and not applied: two guards on sample houses (never
published, no paid job) and their three rows.

## Where it stands (17 Nov 2026)
Built in code, on a branch, not pushed: the page is not live. The launch desk's tables exist since 17 Nov 2026 and are
empty. Not built: the switches and the countries' states acting on the maker and the generator (the next step, and
the point of the desk); the builder's side; a module's Home tile in each
size by one tap (today: the step "Its tile on Home" opens the board, where a tap on the tile gives its sizes).
