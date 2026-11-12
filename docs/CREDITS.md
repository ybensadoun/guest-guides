# Credits: every source we use, what its terms ask, where we show it

Rule (Yohann, 10 Nov 2026): every source is credited as its terms ask, and the credit is built at the same time as the use. This file is the list. Read from the code on 10 Nov 2026 (an inventory of every outside source, font, icon, image and library) and from each source's own page that day. When a source is added or dropped, this file and the guide's credits page change with it.

## What each source asks and what we do

| Source | Used for | What its terms ask | Where the credit is |
|---|---|---|---|
| OpenFreeMap, OpenMapTiles, OpenStreetMap | the map's tiles and data | the credit line the tiles carry: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (OpenStreetMap's data is under the Open Database Licence) | on every map (MapLibre's own control, never hidden), and on the credits page |
| Photon (Komoot) | the search on the map; its results are OpenStreetMap data | OpenStreetMap's credit | the map's credit, and the credits page |
| Overture Maps Foundation, places | a place's phone, website, social link, town, position; the monthly check (is the place still listed, not marked closed) | CDLA Permissive 2.0 for Meta's, Microsoft's and most parts (no credit required; the licence's text to be made available with shared data); Foursquare's part is Apache 2.0 with its notice: "Copyright 2024 Foursquare Labs, Inc. All rights reserved." and "Foursquare data was transformed to the Overture schema."; AllThePlaces' part is CC0 | credits page: Overture named with its sources, a link to the licence, Foursquare's notice word for word |
| GeoNames | the position and kind of towns, mountains, beaches, monuments | CC BY 4.0: "You should give credit to GeoNames when using data or web services with a link or another reference to GeoNames" | credits page, with the link and the licence |
| A place's own website | hours, price, "book ahead", phone; the monthly check opens it to see it still answers | nothing asked; we keep the page read and the date | the "Website" button on the place; credits page says where hours come from |
| Google Maps Platform | finding a place (maker), the swipe deck (maker), the Google Maps buttons, its own line saying whether a place is open now, in the guide (Places UI Kit, loaded live in the guest's browser, built 11 Nov 2026) | "Google Maps" written with any of its content shown; a photo's authors shown with the photo when Google names them; nothing kept but the id (and a position for 30 days) | maker: "Google Maps" by the suggestions and on each card, the photo's author on the card; guide: the buttons say "Google Maps", Google's open-now line carries Google's own "Google Maps" credit inside it, always visible; credits page, with a sentence on that line when the guide has a key |
| Airbnb or another listing site | the house's photos, description, rating (the host's own listing) | to read in the terms pass (proposal 19) | the house page says "from our Airbnb listing" with links; credits page |
| Claude (Anthropic) | writing, translating, research, reading a place's site | no credit asked; we say it | credits page: texts and translations prepared with the help of AI |
| OpenAI | the artistic cover, when a host chooses it | no credit asked; we say it | credits page, when the guide's cover is that one |
| Fonts (Jost, Outfit, Inter and the others, from Fontsource) | the guide's letters | SIL Open Font Licence 1.1: the licence and each font's copyright line go with the font files | the licences file shipped with each guide; named on the credits page |
| MapLibre GL JS and the libraries inside it | drawing the map | BSD, ISC and MIT notices kept with the shipped code | the licences file |
| qrcode-generator | the Wi-Fi QR code | MIT notice; "QR Code is a registered trademark of DENSO WAVE INCORPORATED" | the licences file; the trademark line on the credits page |
| Workbox, Vite's helpers | offline use, loading, in guides built as their own site (the live guides are shown by the shared viewer, which has its own small service worker and no Workbox) | MIT notices | the licences file of those builds |
| jsDelivr | serves the fonts of guides shown by the shared viewer | none; a processor to name | the maker's privacy page |
| Jina AI reader | reads a listing page that refuses our server | none; a processor to name; its use to read in the terms pass | the maker's privacy page |
| Supabase, Netlify, Hetzner, Resend | accounts, hosting, the worker, the monthly email | none; processors | the maker's privacy page (already there) |
| Wikipedia | a link on towns; one of the places the research may read | links need nothing; no text or image is copied | nothing to add |

Drawn by us, nothing to credit: the icons of the guide and the maker, the drawn cover, the tile pattern, the bins.

## Where guests and hosts see it
- **The guide:** a page "Sources and credits", in the six languages, opened from a quiet link at the foot of Home. It names the sources above in plain words with their links, and links to the licences file.
- **Google's open-now line (built 11 Nov 2026, branch `places-work`, `engine/src/gcard.js`):** a place we hold no hours for (no slots of ours, not open all day), with a Google id and a door (not a beach, town or city), shows Google's own small card (Places UI Kit, the compact element with the status only): "Closed · Opens 13:00" or "Temporarily closed", Google's Maps button and Google's "Google Maps" credit. It is loaded live in the guest's browser when the guest opens the place, never stored, never read by our code. It has no box (Yohann's choice, 11 Nov): its surface is the colour of the panel it sits in, through Google's documented style properties only. Where: the rows of Eat and drink, Things to do and Nightlife, under the address, where our own hours go, and a Home quick tile's page; never markets, events, contacts or the map's sheet. The credit inside it is Google's own and always visible: we cannot and do not restyle or hide it. A card with nothing to say, or one that does not arrive within 6 s, is not shown, and the place gets our own "Google Maps" button instead. The credits page says, in the six languages, that this line comes from Google when the place is opened and that the guide does not keep it. Google's script also loads Google's own font from Google.
- **Each guide's files:** `licenses.txt`, written at the build from the packages' own licence files (fonts used, MapLibre and what it carries, qrcode-generator, Workbox).
- **The maker:** "Google Maps" beside Google's content (done in part 3b), the photo's author on a deck card, and on the privacy page the processors missing until now (OpenAI, Jina AI, jsDelivr) and where a place's facts come from (Overture, GeoNames, its own website).

## Built (10 Nov 2026, branch `places-work`)
The page `#credits` ("Sources and credits", six languages, a quiet link at the foot of Home, checked by `ux-check.mjs`), `licenses.txt` written by `engine/scripts/licenses.mjs` at every build (67 KB for Ca La Kimberly, 113 KB for the shared viewer, kept for offline use), the photo's author on a deck card, and OpenAI, Jina AI and jsDelivr on the maker's privacy page with where a place's facts come from. The guide's own sentence about an AI cover shows when `site.theme.coverMade` is `"ai"`; nothing sets it yet.

## Still to settle
- On the small maps of the list pages the whole map is a link to the big map, so a tap on the credit's "i" may open the map and not the credit: to check with the map's look (proposal 6).
- Researched cards in the maker showed Google's rating and photo from kept job results; the worker no longer writes them (part 3d), so those cards have no photo until the maker asks Google live for it, with its author.
- The listing sites' terms (reading a listing, copying its photos): proposal 19.
- Hours kept from Google in today's guides (`hoursSource: 'google'`), Google's own links and the check dates: `worker/clean-google.mjs` (built 12 Nov 2026) takes them out once, after its dry run is looked at; the monthly check no longer writes them. Google's positions on our map: renewed weekly or made ours (`worker/renew-positions.mjs`).
- Whether the worker marks a guide whose cover was made with AI, so the credits page can say so by itself.
