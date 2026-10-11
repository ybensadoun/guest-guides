# Ca La Kimberly: pending work

Things we discussed and parked. Newest decisions at the top of each group.

## To publish
- [ ] Publish after each round of changes: drag `dist` onto https://app.netlify.com/projects/ca-la-kimberly/deploys. Last published: 3 October 2026 (new look). Not yet published: compact Markets list, tags in the collapsed rows.

## Look and feel
- [x] Redesign from Kimberly's portrait: style C (blue header, Outfit titles, white cards, bottom bar), compact Markets list.
- [ ] Dark mode: paused. Redo the dark palette to match the new colours, then set `DARK_ENABLED = true` in `src/theme.js` to bring back the switch.
- [ ] Map: at street level, the town names printed on the map background can overlap the pins.
- [ ] Rethink the map as a general "around the house" map, not only markets: layers per section (markets, restaurants, places, utilities like glass and the recycling centre), a list/map toggle, and a bottom sheet for details. Today it is built around market towns and day filters.
- [ ] Turn off the "Powered by Netlify" badge: Netlify > Project configuration > General > Powered by Netlify badge (it covers the bottom bar on phones).

## Navigation
- [x] Top menu: done as a bottom tab bar (Home, Markets, Garbage, Map, More). A search is still an option.

## Content
- [ ] Standard: every place with opening hours uses the markets `schedule` format (days/open/close) so the app shows live status. Done for markets and emergency contacts; apply to restaurants and What to do when they go live.
- [x] Bar & shop next door: name, hours and coordinates added (no phone on Google) to `content/quick.json` (and its entry in `content/emergency.json`). With lat/lng its place page shows a map preview and the distance.
- [ ] Pizzeria: listings disagree on the closing day (Monday or Tuesday) and morning hours. Confirm and add a `schedule` to `content/quick.json`.
- [ ] Call once to check the numbers marked `verify` in `content/emergency.json` and `content/quick.json`.
- [ ] House rules, Emergency contacts, Restaurants, Places to visit, Activities for kids, Activities for adults (all "Coming soon").
- [ ] Yearly events (fairs, medieval markets): add real dates so they show in the date strip. Postponed; the monthly check lists the dates in its report meanwhile.
- [ ] Market `place` field (street or square) is in English only; translate it.
- [ ] Review the market names table in `docs/RESEARCH-NOTES.md`.
- [ ] Garbage: review the examples per bin; decide whether to add the pruning and bulky items number (606 006 005).
- [ ] Vilafranca crafts market runs October to May only: shown as a flag, not handled by the date strip.

## Editing and automation
- [x] Monthly check now also covers emergency contacts and the Home quick buttons (numbers, hours, official links).
- [ ] Mobile editing: move the project to GitHub and connect Netlify, so changes can be made from the phone and published automatically. This also lets the monthly check run without the Mac.
- [ ] Monthly check safety net: a small extra task on the 3rd of each month that warns if the monthly check did not run. Offered, not decided.

## Housekeeping
- [ ] Delete the old `can-gordei-guide.html` at the top of the folder (a copy is in `reference/`).
- [x] 2026-10-05: the Bauhaus design is now the only version (the classic one is archived).
