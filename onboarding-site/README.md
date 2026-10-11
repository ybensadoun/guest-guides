# Porta onboarding (public site)

Live at https://porta-guides.netlify.app (Netlify project `porta-guides`).

- `index.html` is the deployed page. Answers and photos stay in the visitor's browser (localStorage + IndexedDB) until they press Send.
- On Send it posts to Netlify Forms: `onboarding` (answers, device, walkthrough timings), one `file` submission per photo,
  `note` (the "Missing a question here?" notes, sent immediately), `feedback` (review rounds, `?feedback=<sid>&guide=<slug>`).
- Edit the sources in `src/` and rebuild: `cd src && python3 build.py` (writes `src/index.html`; copy it up one level).
- Deploy: drag this folder onto the project's Deploys page in Netlify.
