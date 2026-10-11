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
- Reading the listing: no guessing. The function pulls the page's own data (overview, house rules section, amenities, sleeping arrangements, rating) and Claude only copies it; anything the page does not say stays empty. Only the tagline and welcome text are written by Claude (marked "Suggested by Claude").
- Optional section "Ratings and reviews" (off by default, one yes or no): the generator writes `content/reviews.json` {mode:"live", rating, count, source, url, quotes:[]}. Live, not curated: the guide shows the listing rating and latest reviews as they are. The engine does not show it yet (GUIDE builds that section).
- Listing data read from Airbnb's page data: the photo tour (rooms with their photos, so rooms are exact, not guessed), sleeping arrangements ("Bedroom 1: 1 king bed"), overview counts, house rules, amenities, rating. /api/listing returns a `report` (how it was read, what was found) that the Load step shows as a found / not found list. Via the page reader only the visible text is available, so sleeping arrangements and exact rooms are usually missing there.
- When the writing assistant (Claude) fails, /api/listing still returns what the page states exactly (counts, times, rules, sleeping arrangements, rating, photos with rooms) and `report.assistant = 'failed'` with the technical `code`; the Load step shows an orange warning with that code. If nothing could be read either, it returns an error message. Finding 11 Oct: the live function answered "took too long" in 6 s for a real listing, i.e. the Claude call failed fast (key, credit or model), not a timeout.
