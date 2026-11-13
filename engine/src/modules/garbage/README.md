# Rubbish (module `garbage`)

What a guest needs to know about rubbish at the house: what to take out this evening, how sorting works, the week, what
goes in which bin, what to do after a missed day. On Home it is one widget: tonight's bins.

This is the first part of the guide kept as a module of its own (Yohann, 13 Nov 2026: "think of everything module by
module"). Read this page before changing how the module behaves, and write a changed rule here with its date.

The look and the behaviour of Ca La Kimberly's rubbish widget and page are the reference (Yohann, 13 Nov 2026: "exactly
how we had it before, I think this module was working very well [...] the look and feel was quite good"). A change to
this module is checked against them pixel for pixel, before and after.

## The rules

| # | Rule | Decided |
|---|---|---|
| 1 | Collection is in the morning, so the guide speaks of the evening before: "Friday evening, collected Saturday morning". The host ticks collection days; the guide never asks a guest to work out the evening. | First version of the guide |
| 2 | The widget and the page's header show only what goes out this evening, which is what is collected the next morning. Nothing about later days: the week list on the page is for that. | Yohann, 13 Nov 2026: "let's only show what they need to take out on this evening, which means that it will be collected in the next morning" |
| 3 | An evening with nothing to take out says "Nothing tonight" and no more. Never the word "Tonight" over an empty list. | Yohann, 13 Nov 2026 ("the whole point of this widget is that it should show what is on tonight, not just tonight"; then "Only Nothing tonight") |
| 4 | Before the collection hour, when this morning has a collection, its bins are still to go out: "Before 6:00", with the guide's own hour. With no hour in the guide, or nothing this morning, the day reads as its evening. | First version; the guide's own hour since 13 Nov 2026 |
| 5 | A bin that goes out every evening (Ca La Kimberly's red bin) is always with tonight's bins, last. The week list does not repeat it on every row: it is said once above the list, and a row with nothing else says "red bin only". | First version; confirmed by Yohann, 13 Nov 2026 ("the red is every day") |
| 6 | Until 20:00 the page names the bins collected that morning, to bring back in. | First version |
| 7 | A house with street containers only (no collection days) has no evening and no week: the page says where the containers are, the widget is one line. | Maker, Oct 2026 |
| 8 | Real or nothing: a bin the guide gives no name shows only what goes in it, never "in the" with nothing after; a sentence that needs the collection hour is left out when the guide has none; "red bin only" is only said in a guide that has that bin. | Yohann, 13 Nov 2026 ("we need to show the end user real information, or we just don't show anything") |

## Its data

One file per guide, `content/garbage.json` (its `_doc` describes the fields):

- `collectionTime`: the hour collection starts ("06:00"), or empty.
- `fractions`: what is sorted (organic, packaging, paper, rest, glass, and in Ca La Kimberly sanitary and kitchen), each
  with its collection mornings (`days`), its name and examples in six languages, and the bin it goes in (`bin`).
- `bins`: the bins' names ("small brown bin"). Empty in a guide the maker builds: a colour is not known.
- `steps`, `missed`: how it works at the house, and what to do after a missed day.
- `containers`: street containers the host listed, where they are and what each takes.
- `items`: points for the guide's map (a glass container, the recycling centre).

Where it comes from: the host. Nothing is researched and no outside service is asked, so there are no terms to respect
here. In the maker the host says how rubbish is collected, ticks the collection days of each bin, gives the hour bins
must be out by, lists containers and adds notes; the generator turns that into the file, with default sentences from
`engine/scripts/garbage-defaults.json`.

## Its look

The page, top to bottom: the header card (tonight's bins, or "Nothing tonight"), "How it works at the house", "Where the
containers are", "The week" (seven rows, the evening first, this evening marked), "What goes where" (one card per
fraction), "Missed the day?".

On Home, one wide widget in three states:

| State | What it shows |
|---|---|
| Bins go out this evening | "Tonight" (or "Before 6:00" in the early morning), then each bin with its name |
| Nothing goes out this evening | The short tile, with the one line "Nothing tonight" |
| Street containers only | The short tile, with the one line "Street containers, any time" |

## Where its code is

| Part | Where | In the module? |
|---|---|---|
| The rules, pure and tested | `plan.js` (tests: `engine/scripts/garbage-plan.test.mjs`) | Yes |
| The guide's data, read once | `data.js` | Yes |
| The page | `page.js` | Yes |
| The Home widget | `widget.js` | Yes |
| What Home and the section view call | `index.js`, listed in `../index.js` | Yes |
| Its styles | `engine/src/styles/app.css` (classes starting `.g`, `.gt-tonight`, `.gt[data-k="garbage"]`, colours `--w-*`) and the four old layouts in `styles/presets/` | Not yet: they move when the one tile system (plan, proposal 4) rewrites the tiles, so the look is touched once |
| Its words | `engine/src/i18n/<lang>.json`, keys starting `g` (`gTonight`, `gWeek`, ...) and `garbage` | Not yet |
| From the host's answers to the file | `engine/scripts/generate-site.py` (the rubbish part), `engine/scripts/garbage-defaults.json` | Not yet |
| The maker's step and its preview | `onboarding-site/src/src.html` (the fields `rubbish...`), `start.js`, `editor.js`, `preview.js` | Not yet |

## Still Ca La Kimberly's own

Things the code or the data hold that a guide the maker builds cannot have, or that are written for one house. Each is a
decision to take, one at a time:

- The bin that goes out every evening is known by its name in the data (`sanitary`), and the words say "red bin
  (sanitary textiles)". The maker has no such bin to offer.
- Named bins and their colours, the "used oil and batteries" card in the kitchen, the recycling centre with its hours:
  only in Ca La Kimberly's file, written by hand.
- The big header of the page runs over the yellow corner shape when the sentence is long (German).
- The maker's default sentences in German say "Sie" where the guides say "du".
