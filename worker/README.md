# Guide worker

Builds guides that hosts have published. It runs on this computer, only while it is on and the worker is running. Before going public it moves to the cloud (see `docs/plan-accounts-and-publishing.md`).

## One-time setup
1. In Supabase: project `dmoxszfwulolqkgxtxcp` > Project Settings > API Keys > copy the **secret** key (starts with `sb_secret_`, or the `service_role` key). It can do everything in the database, so it stays on this computer only.
2. Create the file `worker/.env.local` (it is git-ignored) with one line:
   `SUPABASE_SERVICE_KEY=<paste the key here>`
3. Needed on this computer: Node 18+, Python 3 with Pillow and NumPy (`pip3 install pillow numpy`), and `npm install` done once in the repo.

Optional lines in `worker/.env.local`:
- `RESEARCH=cli` research nearby markets, things to do and emergency contacts, and translate, using the `claude` command on this computer (default `skip`: the guide is built from the host's answers only).
- `AUTO_PUBLISH=0` hold built guides for review (status `ready`) instead of publishing them at once (default: publish at once, for the test phase).
- `POLL_SECONDS=10` how often to look for new guides.

## Run
From the repo folder:
`caffeinate -i node worker/guide-worker.mjs`
`caffeinate` keeps the Mac awake while it runs. Leave the window open. `Ctrl+C` stops it. A guide left half-built by a crash goes back in the queue after 30 minutes.

Build what is queued right now and stop: `node worker/guide-worker.mjs --once`

## What it does for each queued guide
1. Takes it (status `generating`) and writes progress messages the host sees.
2. Runs `engine/scripts/generate-site.py` on the host's answers (and research and translation when `RESEARCH=cli`), then the content check.
3. Uploads the images to the `guide-assets` bucket and saves content and theme to the guide row.
4. Sets status `published` (or `ready`), or `failed` with a plain message the host sees.

The guide is then at `https://porta-guides.netlify.app/g/<slug>`.

## Put a hand-made guide into the database (Ca La Kimberly)
`node worker/guide-worker.mjs --import ca-la-kimberly --slug ca-la-kimberly --owner-email yohann.bensadoun+clk@gmail.com`
Uploads its images, saves its content, publishes it at `/g/ca-la-kimberly` and makes that account the owner. Run it again to refresh the database copy after a change in `sites/ca-la-kimberly` (until the live address is switched over). Imported guides cannot be rebuilt from onboarding answers: they are edited in the "My guide" editor after login.

## Monthly place check for published guides
`npm run check-guides` (dry run, report only) and `npm run check-guides -- --apply` (save the fixes). Options: `--slug <slug>` for one guide, `--days 0` to re-check recent places too.
For every place in a published host guide (markets, things to do, the host's bars and restaurants) it asks Google Places once: still open, exact Google Maps listing, opening hours. Each place keeps its Google id and a "checked" date, so a place checked in the last 25 days costs nothing. Not run on builds (cost): the monthly scheduled task runs it, and it can be run by hand after new research or host edits.
Rules: official hours (a place with a source url and a schedule) are compared, never replaced; permanently closed places are removed; temporarily closed ones get "check" (often the off-season); a Google answer that does not share a real word with the place's name, or is not the listing the guide already links to, is left for a human. Hand-made guides (Ca La Kimberly) are skipped: use `npm run check-places -- <site>` on their folder.
Needs GOOGLE_PLACES_KEY in Guest Guides/.env as well as the worker's key.
