# Guest Guides: engine and Guest Guide Maker (PRODUCT)

Read first: `../CLAUDE.md` (shared rules: publishing, privacy, languages, curation, UX), then `../PROJECTS.md` and `../CHANGES.md`.
This repo is PUBLIC (ybensadoun/guest-guides). No keys, host data, Wi-Fi or business plans in it. Business backlog: `../BACKLOG.md` (outside the repo).

## What lives here
| Folder | What | Notes |
|---|---|---|
| `engine/` | Shared guide code: Vite + vanilla JS PWA, MapLibre with OpenFreeMap, 6 languages | A change here rebuilds every guide. Never site-specific code. |
| `sites/<slug>/` | One folder of data per guide | `ca-la-kimberly` is the real guide (its own CLAUDE.md, and the source of truth for the section structure). All others are local tests: never publish (see `sites/README.md`). |
| `onboarding-site/` | Guest Guide Maker, the host onboarding + login + editor, live at porta-guides | Hosts see "Guest Guide Maker"; "Porta" is only an internal name. Details in its README. |
| `worker/` | Builds guides that hosts publish (runs on Yohann's Mac for now) | See `worker/README.md`. Secrets in `worker/.env.local`. |
| `docs/` | Rules and plans | TYPOGRAPHY, CURATION, UX-GUIDELINES, plan-accounts-and-publishing, runbooks, learnings |

## Commands (from this folder, Node 20+)
| Command | What |
|---|---|
| `npm run build -- <site>` / `npm run build` | content check + build one site / every site (always all after an engine change) |
| `npm run check -- <site>` | content check only (translations, em-dashes, typography, days and times) |
| `npm run dev -- <site>` | local server |
| `npm run preview-file -- <site>` | one self-contained HTML in `sites/<site>/preview/` (git-ignored) to send or open |
| `node engine/scripts/ux-check.mjs <site>` | must print "UX check OK" (overlaps, words wider than their line, page wider than screen; Home + 5 pages, 360/390/430 px, all languages). One-time setup: `npm i --no-save playwright && npx playwright install chromium` |
| `cd onboarding-site/src && python3 build.py` | rebuild the onboarding page, then copy `src/index.html` up one level |
| `caffeinate -i node worker/guide-worker.mjs` (`--once`) | run the guide worker |
| `python3 engine/scripts/generate-site.py` | generator from host answers (used by the worker) |

A local build without `sites/<site>/private/wifi.json` simply has no Wi-Fi sheet; `WIFI_JSON='{...}'` can stand in for tests.

## Where the product is (Oct 2026)
- Decided 19 Oct (`docs/plan-accounts-and-publishing.md`): Supabase (EU) for accounts, data and photos; one shared viewer at `porta-guides.netlify.app/g/<slug>` that loads guides from the database; generation by the worker; host reviews before approval.
- Done: sign up / log in / autosave, Publish button that queues the guide, progress screen, worker on the Mac, guide editor after login (photos, logo, Wi-Fi with QR, rubbish days, contacts, places and hours, design, languages, translate job), offline mode for the shared viewer, import command for hand-made guides (Ca La Kimberly is at `/g/ca-la-kimberly` as a copy; re-import after guide changes until the live address switches).
- One account = one house for now; the schema allows more (later phase).
- Next items and feedback from tests: `../BACKLOG.md` ("Added 21 Oct": themed cover by default, prefilled amenities, preset looks, per-step progress messages, short slug, clear "preview is not the final guide", image-driven theme).

## Product rules
- Every product guide has exactly Ca La Kimberly's sections: read `sites/ca-la-kimberly/site.json` and `content/sections.json`, never from memory. When the guide changes its structure, the product follows (CHANGES.md).
- Research: Spain only for now; at least 4 markets, nearest first; flag hours that are not confirmed; every place passes the existence rule before a host guide goes live.
- Listing reading (`/api/listing`): copy what the page states, never guess; only tagline and welcome text are written by Claude and marked as such.
- The onboarding and editor follow the same UX, typography and no em-dash rules as the guides.
- Phase 2 safety (before real hosts): see `../GITHUB-SETUP.md` (separate code from customer data, GDPR, keys per purpose).

## Engine conventions
- No framework. Views in `engine/src/views/`, router in `main.js`, styles in `engine/src/styles/app.css` (later blocks override earlier ones), icons in `engine/src/ui.js`.
- UI strings: `engine/src/i18n/<lang>.json`, all six languages, same keys. `typo()` in `i18n.js` adds French spaces at render time; the build lints the other typography rules.
- Content files carry a `_doc` field describing their schema: read it before editing.
- Scroll effects: driven by a `--k` value from a requestAnimationFrame scroll handler, no CSS transitions. Back arrow uses in-app history depth (`history.state.d`).
- Home tiles: icon top-left, shape in the top-right corner only, full-width title, arrow on its own row bottom-right. Titles scale with tile width (container units, 19 px minimum).
- Test with Playwright screenshots at 360 px in de and fr before saying something is done.
