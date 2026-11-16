# Sample houses for the modules page

Three made-up houses at public town squares, so each module of the guide can be tried by place:
`sample-city.json` (Barcelona), `sample-coast.json` (Sitges), `sample-village.json` (Prades).
A fixture is `{ _doc, slug, name, kind, town, lat, lng, base, content, theme }`: content and theme are what a
guide's database row holds, made by the real generator and `guide-to-row.mjs`.

Everything in them is made up (each place, market, event and service ends with "(sample)"; the Wi-Fi is
Sample-Guest with a made-up password), except the towns, 112 and the open timetable data (Renfe's stations,
Spain's metro, tram and bus stops). No photos, so no house page.

To change a house, edit `houses.mjs` (and `translations.json` for new English texts), then run
`node onboarding-site/modules/samples/make.mjs` from the repo folder. It writes `sites/<slug>/`, checks it and removes it.
`FIRST=1` lists the texts to translate; `BASE_DATE=YYYY-MM-DD` dates the events (default today). Same day, same files.
The owner's modules page writes a fixture into a sample house's row on "Reset".
