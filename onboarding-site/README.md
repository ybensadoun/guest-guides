# Porta onboarding (public site)

Live at https://porta-guides.netlify.app (Netlify project `porta-guides`).

- `index.html` is the deployed page. Answers and photos stay in the visitor's browser (localStorage + IndexedDB) until they press Send.
- On Send it posts to Netlify Forms: `onboarding` (answers, device, walkthrough timings), one `file` submission per photo,
  `note` (the "Missing a question here?" notes, sent immediately), `feedback` (review rounds, `?feedback=<sid>&guide=<slug>`).
- Edit the sources in `src/` and rebuild: `cd src && python3 build.py` (writes `src/index.html`; copy it up one level).
- Deploy: Netlify (porta-guides) builds from GitHub (guest-guides, main, base directory onboarding-site). Test first, commit on main, the user clicks Push origin in GitHub Desktop. Anything pushed to main goes live. No dragging.
