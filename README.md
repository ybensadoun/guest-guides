# Guest Guides

Mobile-first guest guides for holiday rentals. **One engine, many sites.**
Ca La Kimberly is site #1. Every other guide is data only, so a fix or a new feature made once in the engine reaches every guide on its next build.

## About

Built by Yohann Bensadoun. It started as the guest guide for our own holiday rental and became a small product.

- **Live example:** https://ca-la-kimberly.netlify.app (6 languages, works offline, installable).
- **What it does:** a mobile guest guide per holiday rental: house guide by room, Wi-Fi with QR codes, rubbish days, emergency contacts, a map of 50+ local markets with live "open now" status, restaurants with prices and set menus, things to do and local events.
- **How:** one shared engine (Vite, vanilla JavaScript, MapLibre with OpenStreetMap tiles, PWA) and one data folder per listing, so a fix in the engine reaches every guide. A monthly scheduled AI check re-verifies opening hours, links and event dates against official sources.
- **Onboarding:** hosts answer a short form (https://porta-guides.netlify.app); a generator turns their answers into a new guide with its own look.

Code is visible for reading only (see LICENSE). Guests' and hosts' private data (Wi-Fi passwords, form answers, test listings) is never in this repository.

## Layout

```
Guest Guides/
  engine/                     shared code, never site-specific
    index.html                page template ({{name}}, {{logo}}... filled from site.json)
    src/                      router, views, map, schedules, i18n machinery, styles
    src/i18n/<lang>.json      UI strings shared by all sites (EN ES FR CA DE NL)
    scripts/                  run.js (commands), check-content.js, build-preview.js
    site.config.js            reads sites/<site>/site.json
    vite.config.js            builds one site (SITE env var)
  sites/
    ca-la-kimberly/           site #1
      site.json               name, languages, modules on/off, theme, area
      content/*.json          house, guide by room, markets, places, events, emergency...
      i18n/<lang>.json        only the strings that differ for this listing (house name, area)
      public/                 logo, photos, icons
      theme.css               colour, font and shape overrides on top of the engine look
      docs/                   research notes, monthly-check prompt, design notes
      netlify.toml            its own Netlify project
    demo-casa-llimona/        dummy site #2, proves a new guide is only data
  docs/                       template plan, intake form script
```

## Commands

Needs Node 20+. Run `npm install` once in this folder.

| Command | What it does |
|---|---|
| `npm run sites` | list the sites |
| `npm run dev -- ca-la-kimberly` | local server for one site (phone on same wifi: use the Network address) |
| `npm run build -- ca-la-kimberly` | content check + build into `sites/ca-la-kimberly/dist` |
| `npm run build` | check + build **every** site (do this after any engine change) |
| `npm run check -- <site>` | content check only (missing translations, em-dashes, bad days or times, missing files) |
| `npm run preview -- <site>` | serve the built site with offline mode on |
| `npm run preview-file -- <site>` | one self-contained HTML file in `sites/<site>/preview/` |

## site.json

| Key | Meaning |
|---|---|
| `name`, `description`, `shareDescription`, `shareImage` | page title, meta tags, share card |
| `logo` | file in `public/`, used in the header, home card and install icon list |
| `languages` | subset and order of `en es fr ca de nl`; the first is the default when the phone's language is not offered |
| `storageKey` | prefix for the remembered language/theme on guests' phones (keep it stable once published) |
| `area.radiusKm` | the map overview shows the places within this distance |
| `area.searchBbox` | `[west, south, east, north]` box for the map's place search (default: about 150 km around the house) |
| `modules` | `false` removes a module everywhere (tile, page, map pins, links): `house garbage message emergency markets restaurants todo events quick map` |
| `theme.fonts` | `@fontsource` files to bundle (installed: jost, outfit, geist, instrument-serif) |
| `theme.paper`, `manifestBackground`, `manifestTheme`, `darkMode` | browser colours and the dark-mode switch |

## Layout presets

`site.json` → `theme.preset` changes the structure of the look, not just colours. Each look brings its own fonts (`engine/src/presets.json`, loaded on top of the site's own).

| Preset | Name in the editor | Feel | Home sections |
|---|---|---|---|
| `bauhaus` | Big colour tiles | bold colour blocks and shapes (Ca La Kimberly; the engine's base `app.css`) | colour tiles, mosaic |
| `soft` | Soft rounded cards | its own pastels (powder blue, butter, blush, lilac, peach, mint), soft shadows | pastel tiles, a crisp circle in the corner |
| `minimal` | Clean and calm | black on white, one accent, thin lines (Geist titles, Jost text) | outlined two-column grid |
| `mediterranean` | Mediterranean | whitewash and cobalt, Greek islands and the south of Spain (DM Serif Display, Outfit) | white tiles with a cobalt frame and solid cobalt ones, arched tops with an azulejo keystone, the cover as an arched window |
| `rural` | Rural | wood, moss and warm earth (Fraunces, Nunito) | moss, wheat, rust, bark, honey and forest tiles, a leaf in the corner |

Presets live in `engine/src/styles/presets/<name>.css`; the site's `theme.css` sits on top. Soft, Mediterranean and Rural set their tile colours per section, so a site's own palette changes the accents, not the tiles. The photo-led `editorial` look was dropped on 28 Oct 2026 (an old `editorial` answer becomes `minimal`).

## Modules

Built: house, message (house guide), garbage, emergency, markets, restaurants, todo, events, quick, map,
plus generic ones any site can switch on: `arrival` and `extras` (info pages), `essentials`, `kids`, `daytrips` (places with hours, on the map).
A new module of an existing kind needs only a `sections.json` entry, a content file and its label strings.

## From onboarding to a site

The host fills in the Porta onboarding page. Then:

1. Export the submission (host document, uploads) into a folder.
2. `python3 engine/scripts/generate-site.py <folder> --slug <slug> --lat <lat> --lng <lng> --src en`
   writes site.json, theme.css (palette from the inspiration images, preset from the mood or the images), photos by room,
   logo and icons, house guide, arrival, extras, quick calls, sections, and `docs/research-todo.md`.
3. Research the listed modules into `content/` (markets, eat, things to do, essentials, emergency...).
4. Translate: fill `--translations` with the strings in `docs/untranslated.json` and run the script again.
5. `npm run check -- <slug>`, `npm run preview-file -- <slug>`, send the link, read the feedback, iterate.

## Adding a new listing by hand

1. Copy `sites/demo-casa-llimona` to `sites/<new-slug>` and edit `site.json`.
2. Fill `content/` (start with `house.json`, `sections.json`, `message.json`), put the logo and photos in `public/`.
3. Override only the strings that name the place in `i18n/<lang>.json`.
4. Change the look in `theme.css` (tokens such as `--paper --ink --red --blue --yellow --orange --green --display --font --r`).
5. `npm run check -- <slug>`, then `npm run dev -- <slug>` to look at it on a phone.
6. New Netlify project: Base directory `sites/<slug>`, it uses that folder's `netlify.toml`.

## Rules

- Nothing site-specific in `engine/`: no house names, coordinates, colours or wording about one area. If a site needs something new, make it a site.json option or a module.
- `house.json` lat/lng is always an approximate area point, never the address.
- After an engine change, `npm run build` builds every site; check at least Ca La Kimberly on a phone.

## Proof that the move changed nothing for Ca La Kimberly

The engine build of `sites/ca-la-kimberly` was compared with a build of the original `Ca La Kimberly` folder (commit 56b9f26):
same file list, byte-identical `index.html` and manifest, and in a headless browser identical page HTML for 34 pages
(all routes in English, 4 routes in each other language, clock frozen) and pixel-identical screenshots (pages with a map preview vary from run to run even on the original).
The JS and CSS bundles differ only by the engine code that reads site.json and the fonts now set through `--font` / `--display`.
