# Plan: accounts, editing, automatic publishing (decided 19 Oct 2026)

Decisions taken: Supabase for accounts and data; one shared site where guides load from the database; automatic generation with the Claude API, you review before it counts as approved.

## What the host experiences
1. Opens the Guest Guide Maker. First screen: create an account (email and password; Google login later). You get an email: "new host: <email>".
2. Fills in the steps as today. Everything autosaves to their account. They can close the tab, log back in and continue or edit any step.
3. Clicks Publish. Within a few minutes (generation) they see their guide at one address, `/g/<name>`, marked "draft" until you approve it. Publishing again after an edit is instant.
4. Later, logs in and uses "Change the design": pick a different skin (palette, fonts, mood), regenerate only the design, or regenerate one part (markets, things to do) without touching the rest.

## Architecture
- **Supabase** (EU region): Auth (email and password, email confirmation), Postgres, Storage for photos.
  - `guides`: id, owner (auth user), slug, status (draft, generating, ready, approved, published), answers (json), content (json: the files that sit in sites/<slug>/content today), theme (json: palette, fonts, skin id), updated_at.
  - `events`: signup, publish, regenerate (for your notifications and later a CRM).
  - Row level security: a host reads and writes only their own guide. Published guides are readable by anyone through a view.
- **Onboarding site** (porta-guides): adds sign up and log in before the steps. Local storage stays as an offline cache; the database is the source of truth. Photos upload to Storage instead of staying in the browser.
- **Guide viewer**: the engine (today a Vite build per guide) gets a runtime mode: load content and theme by slug from Supabase, render, cache for offline. One deploy serves every guide. Ca La Kimberly and Querol can stay as built sites until migrated.
- **Generation worker**: reuse `engine/scripts/generate-site.py` (Python) rather than rewriting it. A Netlify function calls GitHub Actions (repository_dispatch); the workflow runs the generator, then a research and design step with the Claude API (web search for markets, emergency numbers, things to do; design from the brief using the bold-design rules), writes the result into the `guides` row, and sets status to `ready`. You receive an email to review.
- **Notifications**: Supabase database webhook to a Netlify function, which sends mail through Resend (free tier). Later the same events feed a CRM.
- **Skins**: a small catalogue of design skins (token sets plus template variants). "Change the design" re-runs only the design step from the stored brief and a chosen skin and saves a new `theme`. Previous theme kept so they can undo.

## Phases
0. **You**: create a free Supabase project (EU region), send me the project URL and the public anon key (these are safe to share). Put the service role key only in Netlify (and later GitHub Actions) secrets, never in chat or the repo.
1. **Accounts and autosave**: sign up, log in, resume, edit; notification on signup. Onboarding only, no guide changes.
2. **Publish plumbing**: runtime viewer at `/g/<slug>`; migrate Querol as the first guide; draft banner; Publish button.
3. **Generation worker**: Actions plus Claude API research and design; status and the "your guide is being prepared" screen.
4. **Edit and skins**: "Change the design", regenerate one section, undo.
5. **Later**: Google login, CRM follow-up, custom domains, payments.
6. **Multiple properties per host** (decided 19 Oct: for now one account = one house, to test the flow). The schema already allows several `guides` rows per owner. Later: a "My guides" list after login, onboarding scoped to the chosen guide (today it loads the first row), "Add a property", a per-account limit (cost), unique slugs per property. Build the Publish button and worker per guide, not per account, so this stays easy once the single-house flow is validated.

## Risks to handle
- Abuse and cost: email confirmation, rate limit per account, a cap on Claude API spend per guide, a monthly budget alert.
- Privacy: EU hosting, a delete-my-account option, the existing consent checkbox, no Wi-Fi password in public content (private table, shown only through the guide).
- Third-party content: listing photos only for listings the host says are theirs.
- Secrets: nothing secret in the public repo; keys only in Netlify and GitHub secrets.
- Airbnb: reading listing pages may be blocked or against their terms; keep the manual paste fallback.
- Generation quality: stays `ready` (not `published` as approved) until you review, at least for the first hosts.

## Interim model (19 Oct, decided by Yohann): a local worker on his computer
While the UX is being tested, the background work may run on Yohann's computer, as long as it is on. The host experience must still be fully self-serve: no one clicks anything for them.
- A worker script on his computer watches the `guides` table (status `queued`, set when the host clicks Publish), generates the guide (generate-site.py, research, design), writes content and theme into the row, and sets the status to `ready`. For now `ready` is shown to the host as published, so nothing waits for approval.
- Guides are shown from the database by the shared viewer, so no deploy step is needed.
- The service role key lives only in a private env file on his computer, never in the repo or in chat.
- **Later, before going public:** move the worker to the cloud (GitHub Actions or a small server) so nothing depends on his computer being on, and add the approval and cost limits above. This is a known gap, not a surprise.
