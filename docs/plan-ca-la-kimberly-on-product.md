# Plan: Ca La Kimberly on the product (decided 23 Oct 2026)

Ca La Kimberly is one of the guides Guest Guide Maker makes, and our test case for what we sell. It should live where every host guide lives: the database, drawn by the shared viewer, edited with the editor (or by Claude through the same database), checked by the same monthly job. Today it is a separate static build from files in `sites/ca-la-kimberly`, with a copy in the database at `/g/ca-la-kimberly` (imported 19 Oct).

## Decisions (Yohann, 23 Oct 2026)
- Wi-Fi in the database (`content.private`) is fine: same exposure as showing it in the guide. CLAUDE.md rule updated.
- Guests keep **ca-la-kimberly.netlify.app**. That address will serve the shared viewer fixed to this guide.
- Brand files stay in the repo: `sites/ca-la-kimberly/public` (logo, photos) and `theme.css` remain the brand's master copy, read by the day-rental site. Only the guide's content moves to the database.

## Phases
0. **One scheduler for everything** (done 23 Oct): task "Monthly check of every live guide" in the Claude desktop app, 1st of the month, `npm run check-guides` on every published guide plus new events and venues for Ca La Kimberly. The Cowork task "Ca La Kimberly accuracy check" is paused by Yohann.
1. **(done 23 Oct) The database copy becomes the true copy.** Re-import the guide (`node worker/guide-worker.mjs --import ca-la-kimberly ...`), then compare `/g/ca-la-kimberly` with the live site page by page (360 px in de and fr, UX check on the viewer), and fix what differs in the shared viewer (offline, install, link previews, fonts, saved settings).
2. **(done 23 Oct) Work on the guide through the product.** `npm run guide:pull -- <slug>` (database to `sites/<slug>`) and `npm run guide:push -- <slug>` (content check and UX check, then write back). The guide's Claude session works as today: pull, edit, check, push. `check-guides` stops skipping it (official hours stay protected).
3. **(done 23 Oct, live after the push) Switch the address.** ca-la-kimberly.netlify.app serves the viewer for slug ca-la-kimberly: same address, same saved settings (storage key `clk`), offline copy, phone install. The old static deploy stays one click away in Netlify for a week.
4. **Rules and the product test.** Update CLAUDE.md, PROJECTS.md, CHANGES.md (the guide's content lives in the database). Put Ca La Kimberly through the onboarding as a new host would, into a private test guide, and turn the differences into BACKLOG.md items.

## What must carry over
Content in 6 languages; hand-checked places and their sources (`docs/sources.json` stays in the repo); Wi-Fi; reviews block; events; rubbish plan; quick tiles; house page and photos; theme and fonts; guests' saved settings and offline use; the UX rules (nothing overlaps at 360 px in de and fr).

## Done on 23 Oct
- Phase 1: pushed to the database; /g/ca-la-kimberly matched the live site word for word on every page in de and fr, same screenshots, same UX check result. Link previews for /g/<slug> (edge function).
- Phase 2: the monthly check covers Ca La Kimberly in "report only" mode (links, Google ids and dates only; hours never replaced, nothing removed). First run: 85 places, links for 60, 32 lines for a human (see CHANGES.md).
- Phase 3: `npm run build-guide -- ca-la-kimberly` builds the viewer for this one guide (root path, its own icons and link preview, service worker sw.js that replaces the old one and drops its caches). Tested: same text as the live site on every page; a phone with the old guide moves to the new one, keeps its language and works offline.
- Same editor as every host guide (decided later that day): logging in at porta-guides with the Ca La Kimberly account opens the step-by-step editor on the guide itself, with drafts and Publish changes. See docs/plan-single-editor.md.
- Still to do: phase 4 (onboarding test as a host, gaps into BACKLOG.md).
