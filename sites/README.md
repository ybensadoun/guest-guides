# Sites in this folder (keep this table current)

One engine, one folder per site. **Only ca-la-kimberly is published.** Everything else here is a local test or demo and has no Netlify project.

| Site | What it is | Published |
|---|---|---|
| `ca-la-kimberly` | Our real Airbnb guest guide, site #1. Its `site.json` and `content/sections.json` are the reference for which sections a guide has | https://ca-la-kimberly.netlify.app (built by Netlify from GitHub: commit on main, the user clicks Push origin) |
| `demo-casa-llimona` | Early dummy site (invented, EN/ES) that proved a guide is only data | no |
| `torre-de-campos` | Test 2, 11 Oct 2026: a real public Airbnb listing taken through onboarding as a pretend host. Own designed look, host-supplied rubbish and restaurants, placeholder photos. Never publish (someone else's listing) | no |

Other things that are published: the host onboarding at https://porta-guides.netlify.app (folder `onboarding-site/`), and the day-rental site (not launched).

## Where test material lives
- Host answers, uploads and research for a test: `../test-submissions/<slug>/` (git-ignored). Builder: `../test-submissions/make_torre.py`.
- Generate a site from a submission: `python3 engine/scripts/generate-site.py test-submissions/<slug> --slug <slug> --lat .. --lng .. --src es --translations test-submissions/<slug>/translations.json` (see `../.regen-torre.sh`).
- A site's local preview: `sites/<slug>/preview/` (`../.rebuild-preview.sh <slug>`).
- A `theme.css` starting with `/* designed:` is hand-designed for that guide; the generator keeps it.

## Rules
- Sections: same as Ca La Kimberly for now (house guide, garbage, emergency, markets, restaurants, things to do, events, quick tiles, map). Read the live `sites/ca-la-kimberly/content/sections.json` before changing anything about sections.
- Rubbish and restaurants are never researched: the host tells us.
- Never publish a test site. A real host's guide gets its own Netlify project.
