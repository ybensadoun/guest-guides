# Porta onboarding (public site)

Live at https://porta-guides.netlify.app (Netlify project `porta-guides`).

- `index.html` is the deployed page. Answers and photos stay in the visitor's browser (localStorage + IndexedDB) until they press Send.
- On Send it posts to Netlify Forms: `onboarding` (answers, device, walkthrough timings), one `file` submission per photo,
  `note` (the "Missing a question here?" notes, sent immediately), `feedback` (review rounds, `?feedback=<sid>&guide=<slug>`).
- Edit the sources in `src/` and rebuild: `cd src && python3 build.py` (writes `src/index.html`; copy it up one level).
- Deploy: Netlify (porta-guides) builds from GitHub (guest-guides, main, base directory onboarding-site). Test first, commit on main, the user clicks Push origin in GitHub Desktop. Anything pushed to main goes live. No dragging.

- Name: hosts see "Guest Guide Maker". "Porta" survives only in internal names (repo, Netlify project porta-guides, storage keys).
- Photos: the listing's photos (with Airbnb's own captions) are added to "Photos by room" with a guessed room, and the host confirms them. They are sent as links in the `listing_photos` form field; `engine/scripts/generate-site.py` downloads them into the right rooms.
- Step 1 is "Load your listing": it calls /api/listing (reads the page directly, or through the public reader r.jina.ai when Airbnb refuses servers; then falls back to pasted text), fills the next steps and adds the photos. /api/photorooms asks Claude to look at the photos and propose a room for each. "Guide sections" comes right after "About the place" and decides which question steps follow.
