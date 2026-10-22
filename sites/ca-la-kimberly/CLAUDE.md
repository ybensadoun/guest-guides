# Ca La Kimberly guest guide (GUIDE)

Read first: `../../../CLAUDE.md` (shared rules), `../../CLAUDE.md` (engine and commands), `../../../CHANGES.md`.
Our own Airbnb house at Can Gordei, La Bisbal del Penedès: whole house for up to 8, pool, garden, barbecue. Guests are families and groups, many from abroad, on their phones. Site #1 of the engine.

## Live and publishing
- https://ca-la-kimberly.netlify.app, built by Netlify from GitHub (guest-guides, main, base `sites/ca-la-kimberly`). The Wi-Fi comes from the Netlify variable WIFI_JSON (local copy in `private/wifi.json`, git-ignored).
- Build and check from `Guest Guides`: `npm run build -- ca-la-kimberly`, `node engine/scripts/ux-check.mjs ca-la-kimberly`, `npm run preview-file -- ca-la-kimberly` (file in `preview/`, git-ignored, for Yohann to open). Engine changes: `npm run build` for every site.
- Commit when checked; push only when Yohann says so (or he clicks Push origin).

## Files
- `site.json`: modules, languages, theme. `content/*.json`: house, house page (rooms, photos, tour), markets, restaurants, todo, events, garbage, emergency, quick tiles, message. Each has a `_doc` with its schema.
- `i18n/<lang>.json`: only strings that differ from the engine. `public/`: logo (the galgo, Kimberly, our dog), photos, icons. `theme.css`: look.
- `docs/DESIGN.md`: design direction "Bauhaus summer" (flat primary colours, big type, Jost, one question per tile). `docs/RESEARCH-NOTES.md`, `docs/sources.json` (source and date per place), `docs/TODO.md`.

## Rules for this guide
- Never show the address; the coordinates in `content/house.json` are offset about 350 m on purpose. Never add the hosts' numbers or tell guests to contact the hosts.
- The logo is the galgo image. Keep the Bauhaus look.
- Every place: source under 2 years old or a live, not-closed Google Maps listing; a one-line reason in the description; curated (CURATION.md). Tag `kidsfun` for things that are great for kids. Businesses keep their real name; generic places are translated.
- Long German or Dutch compounds that the UX check flags get a soft hyphen (U+00AD) in the content.
- German uses du, Dutch uses je. Say "expected" for unconfirmed dates and hours.

## House facts decided with Yohann (keep)
- House page and tour order: living room, dining room, then kitchen.
- Pool: open all year, not heated (about 28 °C in summer), up to 1.7 m deep.
- Attic office: a quiet desk for remote work, with a small balcony (photo "View from the attic balcony").
- Description opens on the first paragraph with "Read more".

## Ongoing
- Monthly "Ca La Kimberly accuracy check" (scheduled task in Cowork, 1st of the month) edits this folder: pull before working.
- The database copy at porta-guides `/g/ca-la-kimberly` is refreshed with the worker import command (`../../worker/README.md`) after changes, until the live address switches.
- Last added (19 Oct 2026): Fundació Mas Miró (Sights), Pitch & Putt Golf El Vendrell practice range (18 Oct).
