> Status (Oct 2026): done. Engine extracted to `Guest Guides/`, Ca La Kimberly is site #1, dummy site #2 builds from data alone. See README.md.

# From Ca La Kimberly to a reusable guest guide

Locked: version v1.0 of Ca La Kimberly is saved in this folder's git history (tag `v1.0`, October 2026).
`git checkout v1.0` brings it back exactly as published.

## Goal
Build the same guide for other listings, and keep every guide able to receive structural improvements
(new features, layout fixes, map changes) made later on any of them.

## Proposed structure (when the second listing starts)
```
Guest Guides/
  engine/                  shared code: src/, scripts/, vite config, the monthly-check prompt
  sites/
    ca-la-kimberly/        only this listing's data
      content/*.json       house, guide, places to eat, what to do, markets, events, emergency...
      i18n-overrides/      wording that is specific to the listing (welcome line, house name)
      public/              logo, cover, photos
      theme.css            colours, fonts and shapes (Bauhaus here)
      site.json            name, languages, location area, radius, Netlify site
    <next-listing>/
```
- `npm run build -- --site ca-la-kimberly` builds one guide into `sites/ca-la-kimberly/dist`.
- A structural change is made once in `engine/` and every site gets it on its next build.
- A change only for one listing (text, places, colours) stays in that site's folder.
- Each site keeps its own monthly check and its own Netlify project.

## What changes per listing (from the intake form)
| Form section | Goes to |
|---|---|
| 1. You and your listing | site.json, house-page.json (from the Airbnb listing) |
| 2. Location and privacy | site.json (approximate point, radius), quick.json (stations) |
| 3. Look and feel | theme.css, logo, cover |
| 4. The house | message.json (house guide by room), house.json (Wi-Fi, check-out) |
| 5. Rubbish | garbage.json |
| 6. Practical | quick.json, emergency.json (researched) |
| 7. Favourite places | restaurants.json, todo.json (researched and completed), markets.json and events.json (researched in the radius) |
| 8. Tone and running | i18n wording, monthly check, domain |

## Steps for a new listing
1. Host fills in the form. Answers land in the Google Sheet.
2. Research in the chosen radius (all districts, across borders): markets, events, emergency, transport, hours, ratings, map links.
3. Theme from the host's style choice and images.
4. Build, review on a phone, publish to its own Netlify project.
