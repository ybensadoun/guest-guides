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
