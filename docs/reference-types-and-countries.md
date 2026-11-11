# Reference: other kinds of place and other countries (explored 9 to 11 Nov 2026, closed)

Read this before adapting the maker to a kind of place other than a home (a resort, a hotel) or to a country other than Spain.

From 9 to 11 Nov 2026 a separate project, Resort Guides, built a guest guide for a villa resort in the Philippines on a copy of this engine. It went live, then Yohann closed it on 11 Nov 2026: resorts need different things, and the maker stays focused on homes listed on Airbnb, Booking.com and the like. Its code is archived (read-only) at **ybensadoun/Resort-Guides**. Its `engine/UPSTREAM.md` lists every change made to the copied engine, file by file. The copy came from guest-guides `801ac30` (7 Nov 2026), so this engine has moved on since: take pieces over by hand, never the whole folder.

## The model: a guide = type x country
- **Type**: what kind of place. A home (one house, one group of guests, a host who is never contacted) or a resort (one site, many villas or rooms, different guests at once, staff and a front desk).
- **Country**: where it is. Spain (what Ca La Kimberly is built for) or the Philippines.
- Each is a small data file, a profile: `engine/src/profiles/types/{home,resort}.json` and `countries/{es,ph}.json` in the archive, read by `engine/src/profiles.js`. A profile holds its own words for the engine's strings, layered engine < type < country < the guide's own. It also lists the sections a guide of that type or country may have; the content check refuses any other. A guide picks them in `site.json` (`type`, `country`), home and Spain when missing.
- Yohann's rule for the split: everything "around the house" is common to every type and changes by country; what is "at the house" (amenities, Wi-Fi, check-in) changes by type.

## What a resort needed that a home does not
- **Units.** `content/units.json`: each villa or room with its own beds, pool, kitchen, check-in and check-out. The guest's unit comes from `?unit=<id>`, carried by a QR code in the villa or the link in the booking message, or else from a picker. It is kept on the phone, then drawn as the house page, and its check-out time goes on Home. `npm run unit-links` printed one QR card per unit plus the booking links. A unit's id is printed in its QR code, so it can never be renamed.
- **The front desk.** Guests must be able to reach it, unlike a host. Decided: only the official channels the resort itself publishes, never a staff member's own number. A resort also shows its real pin, unlike a home's pin offset by about 350 m.
- **A Today notice** on top of Home that the resort changes: weather, a closed pool, a cancelled boat.
- **What resorts never put online**: restaurant and pool hours, activity schedules, how to book a boat. This is exactly what guests ask the front desk, so it is what such a guide adds.

## What the Philippines changed (around the house)
- No weekly markets. The daily town market becomes one line in **Local food**, alongside what to try, what to bring home, and having your seafood cooked (paluto).
- **Tours you book** instead of places. Each is a card saying where it leaves from, how long it takes, the price, what is included, and that there are no boats when a storm signal is up.
- **Day plans**: half and full days, with stops in order. A rainy-day plan (no boats) matters there.
- **Today's sunset** on Home, worked out on the phone from the guide's position, in the country's time zone (`timezone` in the profile).
- **Good to know**: the rainy season; the Coast Guard stops boats from PAGASA storm Signal No. 1; pesos and cash; power cuts; eTravel for arrivals; 911.
- Languages: English and Korean. Korea and the US were the top foreign markets in 2024 and 2025.
- Not done: the Philippines writes times as 3:00 PM, but the engine always shows 15:00.

## Korean in the engine
- `engine/src/i18n/ko.json`: every engine string, in 해요체 (the friendly polite form, as German uses du). Never checked by a Korean reader.
- Fonts: none of the looks' fonts has Hangul, and the browser's fallback for a serif display font is a thin Korean serif. `styles/resort.css` gives each bundled face the phone's Korean sans (`local()`) for Hangul only, through `unicode-range`. Chromium joins such faces only when their weight descriptor is identical, so there is one face per bundled weight; a `100 900` range is ignored.
- Line breaks: `word-break: keep-all` for `:lang(ko)`, so no word breaks mid-word.
- Dates: Korean puts the month first, so `dateRange` (events.js) uses `Intl.DateTimeFormat.formatRange` for month-first languages ("12월 16일~24일"). The other languages are unchanged.

## Lessons
- **Google's terms.** That guide showed Google ratings, opening hours and phone numbers taken from the Places API. This is not allowed: only a place's id may be kept for good, and its position for 30 days (`../CLAUDE.md`, BACKLOG items 62 and 63). A future version must take a place's facts from sources it may keep, as `docs/plan-ca-la-kimberly-through-the-maker.md` describes.
- **A real business's content never goes in a public repo.** There, `sites/*` was ignored except made-up `sites/demo-*`, and the live guide was uploaded from the Mac.
- **New Netlify projects in the team start behind the team login**, for production too. To make a guide public, open production to everyone and keep deploy previews behind the login.
- Profiles and new section kinds fitted in new files plus a few lines in `main.js`, `section.js`, `home.js` and the two checks. Ca La Kimberly, built with the changed engine, passed the content and UX checks unchanged.
