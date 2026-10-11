# Starting prompt for Claude Code

Paste everything below the line into a new Claude Code session opened in `Documents/Ca La Kimberly`.

---

I'm building "Ca La Kimberly", a mobile-first guest guide web app for our Airbnb house in Can Gordei (La Bisbal del Penedès, Tarragona, Spain). The site is named after our dog, Kimberly. Guests open it on their phones.

## What's already in this folder
- `reference/can-gordei-guide.html`: a working single-file prototype built in a Claude chat. It has:
  - Home, Markets and Map views
  - 4 languages (EN, ES, FR, CA), auto-detected and switchable
  - live "open now / later today / finished" status
  - distance from the house or from the guest's location
  - Google Maps directions links
  - a simplified SVG map, used because the old host blocked map tiles
- `data/markets.json`: the same 52 markets extracted from the prototype, with schedules, stall counts, 4-language descriptions, tags and flags. Use it as the source of truth for market data.
- `data/i18n.json`: all UI strings from the prototype in EN, ES, FR, CA.
- `docs/RESEARCH-NOTES.md`: where the market data comes from, what is uncertain, and decisions already made. Read it before changing any data.

Read all of these before planning. Keep the content, data, translations and behaviour unless I say otherwise below.

## What I want now
1. Turn it into a proper project in this folder, ready to deploy as a static site on Netlify or GitHub Pages.
   - Keep it simple: plain HTML/CSS/JS or a light setup like Vite. No heavy framework unless you think it's clearly worth it, and explain why.
   - Put content in data files (markets now; later restaurants, places, kids, adults, house rules, garbage, emergency contacts).
   - Put UI strings in per-language i18n files.
2. Rename the site to "Ca La Kimberly" everywhere: title, header, favicon, metadata. Can Gordei stays as the location name and the house pin label.
3. Replace the SVG map with a real map: Leaflet + OpenStreetMap, or a free tile provider you recommend, with proper attribution. It needs:
   - filters by type and "open today"
   - the house pin
   - "My location" with a blue dot
   - a map style that follows light/dark mode
   - Google Maps directions for each market
4. Map drill-down:
   - A town with several markets shows one grouped pin with a count.
   - Tapping it zooms into that town at street level and splits it into individual pins, one per market, so the guest sees where they are relative to each.
   - Tapping a single market zooms to street level around it and shows its full details card.
   - There must be a clear way back to the overview.
5. Proper names per market and language. Today every card in a town shows the town as its title (for example 5 cards titled "Vilafranca del Penedès"). Instead:
   - Each market gets its real name in Catalan and Spanish (official or local name).
   - Each market gets the best natural translation in English and French, for example "Mercat dels dissabtes" / "Mercado de los sábados" / "Saturday market" / "Marché du samedi".
   - The town becomes the secondary line.
   - Grouped pins on the overview map keep the town name.
   - Add these as `name: {ca, es, en, fr}` in markets.json.
6. Keep the home logic: the Markets tile shows "N today" and opens the Markets "Today" view with the same filter applied, so the count and the list match. Covered markets are excluded from that count.
7. Make it a PWA: installable, content works offline, the map needs network.

## Constraints and style
- Mobile-first, responsive, accessible, with light and dark mode.
- For now keep the prototype's look (Instrument Serif + Geist, cards, pill tabs). We'll redesign later.
- Never use em-dashes in any copy, in any language. Use commas or periods.
- Distances are approximate road km from the house. House coordinates: 41.2643, 1.4748.
- Keep the "check before going" and "older info" flags.
- Footer note in all 4 languages: markets skip public holidays and village markets can change; we recommend checking online on the day before going. Never tell guests to contact us.
- Other sections (house rules, garbage, emergency, restaurants, places, kids, adults) stay as "Coming soon" placeholders.
  - Build the structure so adding one means adding a data file plus translations.
  - Their spots appear on the same map with their own filter category.

## How to work
- Start in plan mode. Propose the folder structure, stack, map/tile choice and data schema, and wait for my OK.
- Then build, run it locally and give me the local URL. Also tell me how to open it on my phone on the same wifi.
- At the end, explain how to deploy for free and how to give guests a public link.
