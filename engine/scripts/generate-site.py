#!/usr/bin/env python3
"""Turn a Porta onboarding submission into sites/<slug>/ (the mechanical part).

Usage:
  python3 engine/scripts/generate-site.py <submission-dir> --slug <slug> --lat <lat> --lng <lng>
      [--src en] [--translations <file.json>] [--research <dir>]

<submission-dir> holds what the onboarding page stored:
  host.json                 the hosts/<uid> document (answers, status...)
  uploads/<id>.json         one document per upload (kind, room, dataUrl or assetId)
  assets/<assetId>.<ext>    files for uploads stored as assets (fetched separately)

What it does: site.json (name, languages, modules, the colour world: answers.world, see "the
look" below), theme.css (a comment only: the world gives every colour), house.json, the house guide (message.json) from the host's own words,
arrival/extras pages, quick calls, sections.json, photos, logo and icons, and research-todo.md:
the list of researched modules (eat, markets, things to do...) still to fill by hand or by an agent.
Texts are kept in the host's language; --translations adds the other languages
({"source text": {"es": "...", "fr": "..."}}). Re-running is safe: researched content files
that already exist are never overwritten.
"""
import argparse, base64, io, json, math, os, re, sys, unicodedata
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
ENGINE_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl']

ap = argparse.ArgumentParser()
ap.add_argument('src_dir'); ap.add_argument('--slug', required=True)
ap.add_argument('--lat', type=float, required=True); ap.add_argument('--lng', type=float, required=True)
ap.add_argument('--src', default='en'); ap.add_argument('--translations')
ap.add_argument('--research', default=None, help='folder with researched content files (emergency.json, markets.json, todo.json...) copied into the site when missing')
args = ap.parse_args()

S = Path(args.src_dir)
host = json.loads((S / 'host.json').read_text())
A = host.get('answers', host)
ups = [json.loads(p.read_text()) | {'_id': p.stem} for p in sorted((S / 'uploads').glob('*.json'))] if (S / 'uploads').exists() else []
TR = json.loads(Path(args.translations).read_text()) if args.translations else {}
SITE = ROOT / 'sites' / args.slug
for d in ['content', 'public/guide', 'public/icons', 'i18n', 'docs']: (SITE / d).mkdir(parents=True, exist_ok=True)
LANGS = [l for l in (A.get('languages') or ['en']) if l in ENGINE_LANGS] or ['en']
if args.src not in LANGS: LANGS = [args.src] + LANGS
untranslated = set()

def L(text):
    """A text in every language of the site: the host's words plus translations when given."""
    text = (text or '').strip()
    out = {args.src: TR.get(text, {}).get(args.src, text)}  # a host writing in another language can also translate the generator's own English lines into it
    if text and text not in TR: untranslated.add(text)      # in the source language too: a listing's words can be in another one
    for l in LANGS:
        if l == args.src: continue
        t = TR.get(text, {}).get(l)
        if t: out[l] = t
        elif text: untranslated.add(text); out[l] = out[args.src]   # shown in the host's words until translated: never an empty text
    return out

# What a place offers (engine/src/amenities.json, the builder's list): items named in six languages. am_ids turns answers
# into ids: ids stay, words the list knows (a listing's words in any of the six languages, Airbnb's own titles, the
# builder's former chips) become ids, the rest stays as the host wrote it. The same rules as the builder (onboarding-site/src/amen.js).
AM = json.loads((ROOT / 'engine/src/amenities.json').read_text())
AM_BY = {x['id']: x for x in AM['items']}
am_fold = lambda s: re.sub(r'\s+', ' ', ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(c) != 'Mn').lower().replace('’', "'")).strip()
AM_WORDS = {}
for x in AM['items']:
    for w in [*x['t'].values()] + ([] if x.get('k', '-') == '-' else x['k'].split(',')): AM_WORDS.setdefault(am_fold(w), x['id'])
def am_match(s):   # "Free washer – In unit", "Lavadora en el alojamiento (Gratis)", "50-inch HDTV": the words before the details
    full = am_fold(s); head = re.split(r':|\s[–-]\s|\(|,', full)[0].strip()
    loose = re.sub(r' (de \d+ pulgadas|en el (alojamiento|edificio))$', '', re.sub(r'^\d+[- ]?inch ', '', re.sub(r'^((free|private|shared|indoor|outdoor|in-unit|heated) )+', '', head)))
    return next((AM_WORDS[w] for w in (full, head, loose) if w in AM_WORDS), '')
am_ids = lambda xs: list(dict.fromkeys(x if x in AM_BY else (am_match(x) or x) for x in xs if x))
am_t = lambda x: {l: x['t'][l] for l in LANGS if l in x['t']}

def text_lines(t):
    return [re.sub(r'^\s*[-*•]\s*', '', x).strip() for x in (t or '').splitlines() if x.strip()]
def lines(k): return text_lines(A.get(k))

# ---------- images ----------
def load_upload(u):
    if u.get('dataUrl'):
        return Image.open(io.BytesIO(base64.b64decode(u['dataUrl'].split(',', 1)[1])))
    if u.get('assetId'):
        for p in (S / 'assets').glob(u['assetId'] + '.*'):
            return Image.open(p)
    return None

def save_jpg(img, path, maxw=1600):
    img = ImageOps.exif_transpose(img).convert('RGB')
    img.thumbnail((maxw, maxw))
    img.save(path, 'JPEG', quality=84, optimize=True)

by_kind = {}
for u in ups: by_kind.setdefault(u.get('kind'), []).append(u)

# The host's logo, when they gave one (the guide's icons, and its colours when the host picked "From your logo").
logo_up = (by_kind.get('logo') or [None])[0]
logo_im = load_upload(logo_up) if logo_up else None
def on_white_bg(im):   # a transparent logo is read on white, not on black
    im = ImageOps.exif_transpose(im).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); return bg.convert('RGB')
# Colours from the host's logo or cover picture, in older answers (answers.colorsFrom, before the colour worlds).
CF = str(A.get('colorsFrom') or '').lower()
COLORS_FROM = 'logo' if 'logo' in CF else 'cover' if ('cover' in CF or 'photo' in CF or 'picture' in CF) else 'look'
def cover_im():
    cv = (by_kind.get('cover') or [None])[0]
    im = load_upload(cv) if cv else None
    url = str(A.get('coverUrl') or '').split('?')[0]
    if not im and url.startswith('https://a0.muscache.com/'):
        try: im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(url + '?im_w=720', headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read()))
        except Exception as e: print('cover for the colours not downloaded:', e)
    return im
import urllib.request
# ---------- the look: a colour world ----------
# A guide's colours come from a colour world (engine/src/worlds.js; Yohann, 10 Nov 2026: a host picks a colour world
# instead of a layout), the maker's answers.world: one of the six worlds, or 'cover' / 'logo', "From your picture", with
# answers.worldOwn, the world the maker made from that picture in the browser and showed the host (engine/src/
# picture-world.js), kept as it is. Older answers have no world: colorsFrom naming the logo or the cover picture is that
# choice; anything else is the world Bauhaus summer. The old layouts (answers.mood: soft, minimal, mediterranean, rural)
# were removed on 14 Nov 2026: mood is no longer read.
WORLD_IDS = ['bauhaus', 'sea', 'country', 'tropical', 'night', 'stone']   # engine/src/worlds.js WORLDS
_asked = A.get('world')
if isinstance(_asked, str) and (_asked in WORLD_IDS or _asked in ('cover', 'logo')): CHOICE = _asked
elif COLORS_FROM in ('cover', 'logo'): CHOICE = COLORS_FROM
else: CHOICE = 'bauhaus'
# The colour world gives every colour (worlds.js worldTokens, through engine/scripts/world-of.mjs, the
# engine's own rule; Python keeps no copy of it). theme.css sets no colour, and the world's own fonts are added by the
# engine (site.config.js siteFonts), so theme.fonts lists none.
ROLES = ('deep', 'strong', 'fresh', 'light', 'warm')
def own_world(w):   # a world with colours of its own, as engine/site.config.js siteWorld accepts it, nothing more
    return (isinstance(w, dict) and isinstance(w.get('base'), str) and w['base'] in WORLD_IDS
            and all(k == 'base' or (k in ROLES and isinstance(v, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', v)) for k, v in w.items()))
def world_of(ask):   # {world} or {pixels}: {world, tokens}; a failure stops the build
    import shutil, subprocess
    node, script = shutil.which('node'), ROOT / 'engine/scripts/world-of.mjs'
    if not node: sys.exit(f'generate-site: node is not on the PATH, and the colour world needs it ({script.relative_to(ROOT)})')
    try: r = subprocess.run([node, str(script)], input=json.dumps(ask), capture_output=True, text=True, timeout=60)
    except Exception as e: sys.exit(f'generate-site: {script.relative_to(ROOT)} could not be run: {e}')
    if r.returncode != 0: sys.exit(f'generate-site: {script.relative_to(ROOT)} failed (exit {r.returncode}): {(r.stderr or r.stdout).strip()}')
    return json.loads(r.stdout)
FROM_PICTURE = {'cover': "the host's cover picture", 'logo': "the host's logo"}
picked = None   # the picture the world was made from: 'cover' or 'logo'
if CHOICE in ('cover', 'logo'):
    own = A.get('worldOwn')
    if own_world(own): WO, picked = world_of({'world': own}), CHOICE   # the look the maker showed, as it is
    else:
        if own is not None: print('worldOwn is not a colour world, made again from the picture:', json.dumps(own)[:200])
        # The picture as the maker reads it: on white (a transparent logo reads as on paper), 96 x 96, its RGB bytes.
        try:
            im = (logo_im if CHOICE == 'logo' else cover_im())
            px = on_white_bg(im).resize((96, 96)).tobytes() if im else None
        except Exception as e:
            print(f'{FROM_PICTURE[CHOICE]} could not be read:', e); px = None
        if px: WO, picked = world_of({'pixels': base64.b64encode(px).decode()}), CHOICE
        else:
            print(f'colours from {FROM_PICTURE[CHOICE]}: no picture to read, the guide is in the world "bauhaus"')
            WO = world_of({'world': 'bauhaus'})
else: WO = world_of({'world': CHOICE})
WORLD, T = WO['world'], WO['tokens']
# The world's colours wherever a colour is needed below (the icons' tile, the maskable icon's paper, the manifest):
# accents in the old order, blue, red, yellow, orange, green, the roles after the contrast rule.
palette = {'paper': T['--paper'], 'ink': T['--ink'], 'accents': [T['--blue'], T['--red'], T['--yellow'], T['--orange'], T['--green']]}
a = palette['accents'] + palette['accents']
_which = f'the colour world "{WORLD}"' if isinstance(WORLD, str) else f'the colour world "{WORLD["base"]}" with colours of its own'
_tc = SITE / 'theme.css'
if _tc.exists() and _tc.read_text().lstrip().startswith('/* designed:'):
    print('theme.css was designed by hand: kept as is')   # the design pass owns it once it starts with "/* designed:"
else:
    _tc.write_text(f"""/* {A.get('guideName') or A.get('placeName')}: {_which}{', from ' + FROM_PICTURE[picked] if picked else ''} (engine/src/worlds.js, theme.world in site.json) gives every colour and the titles' font: this file sets none.
   Edit freely: tokens here sit on top of the engine look and the world. */
""")

# ---------- photos, cover, logo, icons ----------
# Cover photo: the host's own upload wins; otherwise the listing's cover photo is saved below (house.jpg), and the host
# can choose a cover drawn from the theme colours instead (answers.coverChoice = 'drawn').
cover = (by_kind.get('cover') or [None])[0]
own_cover = bool(cover and (im := load_upload(cover)))
if own_cover: save_jpg(im, SITE / 'public/house.jpg', 1800)

ROOM_KEY = {'Living room': 'living', 'Kitchen': 'kitchen', 'Bedroom': 'bedrooms', 'Bathroom': 'bathrooms', 'Pool': 'pool', 'Garden': 'outside',
            'Terrace': 'outside', 'Outside': 'outside', 'Office': 'office', 'Laundry': 'laundry', 'View': 'outside', 'Other': 'other', '': 'other'}
room_photos, tour = {}, {}   # by kind of room, for the house guide; by the room's own name ("Bedroom 2"), for the house page
def keep_room_photo(im, u):
    key = ROOM_KEY.get(u.get('room', ''), 'other')
    n = len(room_photos.setdefault(key, [])) + 1
    f = f'guide/{key}-{n}.jpg'
    save_jpg(im, SITE / 'public' / f)
    room_photos[key].append(f)
    label = str(u.get('label') or u.get('room') or '').strip()
    if label and label != 'Other': tour.setdefault(label.lower(), {'n': label, 'c': u.get('room', ''), 'photos': []})['photos'].append(f)
for i, u in enumerate(by_kind.get('photo', [])):
    im = load_upload(u)
    if not im: continue
    keep_room_photo(im, u)

# Photos taken from the host's listing arrive as links (the listing_photos form field), with the room the host confirmed.
def _listing_photos():
    raw = host.get('listing_photos') or A.get('listing_photos') or []
    if isinstance(raw, str):
        try: raw = json.loads(raw or '[]')
        except Exception: raw = []
    if not raw and (S / 'listing_photos.json').exists():
        try: raw = json.loads((S / 'listing_photos.json').read_text())
        except Exception: raw = []
    return [x for x in raw if isinstance(x, dict) and str(x.get('url', '')).startswith('https://a0.muscache.com/')]
import urllib.request
for idx, x in enumerate(_listing_photos()):
    # A copy saved next to the submission (listing_photos/00.img, in the same order) wins over the download.
    local = next(iter((S / 'listing_photos').glob(f'{idx:02d}.*')), None) if (S / 'listing_photos').exists() else None
    try:
        if local: im = Image.open(local)
        else:
            req = urllib.request.Request(x['url'] + '?im_w=1200', headers={'User-Agent': 'Mozilla/5.0'})
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read()))
    except Exception as e:
        print('listing photo not downloaded:', x['url'], e); continue
    if not cover and str(A.get('coverUrl', '')).split('?')[0] == x['url']: save_jpg(im, SITE / 'public/house.jpg', 1800)   # the listing's own cover photo
    keep_room_photo(im, x)

# The cover the host picked among the listing photos, when it is not one of the photos kept for the house guide
_cu = str(A.get('coverUrl') or '').split('?')[0]
if not cover and not (SITE / 'public/house.jpg').exists() and _cu.startswith('https://a0.muscache.com/'):
    try:
        req = urllib.request.Request(_cu + '?im_w=1440', headers={'User-Agent': 'Mozilla/5.0'})
        save_jpg(Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())), SITE / 'public/house.jpg', 1800)
    except Exception as e: print('cover photo not downloaded:', _cu, e)

def square(im, size):
    im = ImageOps.exif_transpose(im).convert('RGBA')
    return ImageOps.fit(im, (size, size), Image.LANCZOS)
# The logo only when the host gave one: no made-up logo (decided 28 Oct 2026), the guide then shows none. The phone and
# browser icons come from the logo, else from the house photo or the first room photo, else a plain tile in the first accent.
if logo_im: square(logo_im, 256).save(SITE / 'public/logo-head.png')
house_jpg = SITE / 'public/house.jpg'
first_room = next((SITE / 'public' / f for fs in room_photos.values() for f in fs), None)
icon_im = logo_im or (Image.open(house_jpg) if house_jpg.exists() else Image.open(first_room) if first_room else Image.new('RGBA', (512, 512), a[0]))
for fn, sz in [('favicon.png', 64), ('apple-touch-icon.png', 180), ('icons/icon-192.png', 192), ('icons/icon-512.png', 512)]:
    square(icon_im, sz).save(SITE / 'public' / fn)
mask = Image.new('RGBA', (512, 512), palette['paper']); mask.alpha_composite(square(icon_im, 410), (51, 51)); mask.save(SITE / 'public/icons/icon-maskable-512.png')

# ---------- researched content (done outside this script: web research) ----------
# Research is written in one language: every text goes through L() like the host's own words, so it is translated
# (second pass with --translations) and never left empty in another language of the guide.
def localize(x):
    if isinstance(x, list): return [localize(v) for v in x]
    if not isinstance(x, dict): return x
    if x and all(k in ENGINE_LANGS for k in x) and all(isinstance(v, str) for v in x.values()):
        out = L(x.get(args.src) or x.get('en') or next(iter(x.values())))
        for l in LANGS:
            if (x.get(l) or '').strip(): out[l] = x[l]
        return out
    return {k: localize(v) for k, v in x.items()}
# A researched market without fixed weekly hours (monthly, seasonal, unconfirmed) keeps an empty schedule and says when it
# runs in words: occasional_when, or its hours text when that is all the research gave.
# The monthly check's note for the host on a place (worker/check-guides.mjs), in every list it looks at. Never shown to guests.
LOOK_DOC = " look: {at, why, ok?}, the monthly check's note for the host (worker/check-guides.mjs), never shown to guests: why is 'site' (its own website no longer answers) and/or 'directory' (our open directory marks it closed, or no longer lists it); at the day it was first seen; ok the day the host looked (the editor). It goes when the signal goes; the place itself is never changed."
with_look = lambda doc: (doc or '') + ('' if LOOK_DOC in (doc or '') else LOOK_DOC)
def fix_markets(d):
    d['_doc'] = with_look(d.get('_doc'))
    for m in d.get('markets') or []:
        if not m.get('schedule'): m['schedule'] = []
        if not m['schedule'] and not m.get('occasional_when') and m.get('hours'):
            h = m.pop('hours'); m['occasional_when'] = h if isinstance(h, dict) else {'en': str(h)}
    return d
if args.research:
    for f in sorted(Path(args.research).glob('*.json')):
        dst = SITE / 'content' / f.name
        prev = json.loads(dst.read_text()) if dst.exists() else None
        if prev is None or prev.get('_research'):   # never overwrite a file someone wrote by hand
            d = json.loads(f.read_text())
            if f.name == 'markets.json': d = fix_markets(d)
            dst.write_text(json.dumps({'_research': 'copied from research by generate-site.py', **localize(d)}, ensure_ascii=False, indent=1)); print('research copied:', f.name)

# ---------- modules ----------
M = A.get('modules') or {}
on = lambda k, default=True: M.get(k, default)
name = (A.get('guideName') or A.get('placeName') or args.slug).strip()
place = (A.get('placeName') or name).strip()
town = (A.get('town') or '').strip()

# Wi-Fi with a QR code per network.
wifi = None
if A.get('wifiName') and on('wifi'):
    import segno
    ssid, pw = A['wifiName'].strip(), (A.get('wifiPassword') or '').strip()
    q = segno.make(f'WIFI:T:WPA;S:{ssid};P:{pw};;', error='m')
    svg = q.svg_inline(scale=1, omitsize=True, border=2, dark='#000000')
    wifi = {'password': pw, 'networks': [{'ssid': ssid, 'label': L('Wi-Fi'), 'qr': svg}]}

house = {'_doc': 'lat/lng: an approximate area point, never the address.', 'name': place, 'lat': args.lat, 'lng': args.lng,
         'photoPos': '50% 55%', 'checkout': (A.get('checkOut') or '')[:5]}   # no time given: none shown, never one we made up
HAS_PHOTO = (SITE / 'public/house.jpg').exists()
if HAS_PHOTO: house['photo'] = 'house.jpg'
elif first_room: house['photo'] = str(first_room.relative_to(SITE / 'public'))
# Cover: the host's own photo, else the listing's cover photo (the default, shown in the Look step), else drawn from the colours.
house['cover'] = 'photo' if own_cover or (HAS_PHOTO and A.get('coverChoice') != 'drawn') else 'themed'
if wifi:   # the Wi-Fi password never goes in tracked files: private/wifi.json is git-ignored (the engine merges it into house.wifi)
    (SITE / 'private').mkdir(exist_ok=True)
    (SITE / 'private/wifi.json').write_text(json.dumps(wifi, ensure_ascii=False, indent=2))
if A.get('listingUrl'): house['listing'] = A['listingUrl']
# The point is Google's town search (the listing gave none, and GeoNames has no town of that name near it: worker build):
# dated like a place's, so the weekly renewal (worker/renew-positions.mjs) keeps it within Google's 30 days.
_pos = A.get('pos') if isinstance(A.get('pos'), dict) else {}
if _pos.get('from') == 'google' and re.match(r'^\d{4}-\d{2}-\d{2}$', str(_pos.get('at') or '')): house['pos'] = {'from': 'google', 'at': _pos['at']}
(SITE / 'content/house.json').write_text(json.dumps(house, ensure_ascii=False, indent=1))

# The rooms as the host ordered them (answers.rooms: [{n: name, c: kind of room, t: what guests should know there}]), then
# any other room a photo names. This one order is the house page's and the house guide's.
rooms = [r for r in (A.get('rooms') or []) if isinstance(r, dict) and str(r.get('n') or '').strip()]
rooms += [{'n': d['n'], 'c': d['c']} for k, d in tour.items() if k not in {str(r['n']).strip().lower() for r in rooms}]
room_kind = lambda r: ROOM_KEY.get(r.get('c') or '', 'other')
HOUSE_PAGE = bool(on('house') and (HAS_PHOTO or room_photos))
LISTING_URL = (A.get('listingUrl') or '').strip()
LISTING_SRC = next((n for k, n in (('airbnb', 'Airbnb'), ('booking.com', 'Booking.com'), ('vrbo', 'Vrbo')) if k in LISTING_URL.lower()), '')

# House guide: rooms from the photos, each how-to line in the room it talks about.
KW = {'kitchen': r'coffee|oven|hob|stove|dishwasher|fridge|freezer|kettle|microwave|kitchen|cocina|cuina|nespresso|toaster',
      'living': r'\btv\b|television|sofa|living|netflix|speaker|fireplace|chimenea|heating|calefacci',
      'bedrooms': r'bed|sheet|linen|blanket|pillow|wardrobe|bedroom',
      'bathrooms': r'shower|bath|towel|hot water|boiler|toilet|hairdryer|water heater',
      'pool': r'pool|piscina|swim|sunbed|cover',
      'outside': r'bbq|barbecue|garden|terrace|patio|hammock|outdoor|plants|watering|grill|shutter|persiana|awning',
      'laundry': r'wash|dryer|iron|laundry|detergent|lavadora',
      'office': r'desk|office|printer|workspace|monitor'}
ROOM = {'living': ('sofa', 'blue', 'Living room'), 'kitchen': ('kitchen', 'green', 'Kitchen'), 'bedrooms': ('bed', 'red', 'Bedrooms'),
        'bathrooms': ('drop', 'yellow', 'Bathrooms'), 'pool': ('pool', 'blue', 'Pool'), 'outside': ('flame', 'orange', 'Outside'),
        'laundry': ('washer', 'green', 'Laundry'), 'office': ('desk', 'blue', 'Office'), 'other': ('box', 'ink', 'Good to know')}
items = {k: [] for k in ROOM}
for ln in lines('howTos'):
    k = next((r for r, rx in KW.items() if re.search(rx, ln, re.I)), 'other')
    items[k].append(ln)
# What the host wrote in a room's own card goes with that room; a kitchen has one card, bedrooms may have several.
for r in rooms:
    for ln in text_lines(r.get('t')):
        items[room_kind(r)].append(f"{r['n'].strip()}: {ln}" if sum(room_kind(x) == room_kind(r) for x in rooms) > 1 else ln)
if not HOUSE_PAGE: items['bedrooms'] = lines('sleeping') + items['bedrooms']   # sleeping arrangements as the listing states them; the house page has them otherwise
# The listing's own equipment list (answers.listingAmenities, as the page states it), sorted into the rooms: each room
# gets a short line under its title and "Also in the kitchen: ...", like Ca La Kimberly's house guide. Safety items go
# to "Good to know"; Wi-Fi, parking and generic lines are left out (they have their own places).
AM_KW = {'kitchen': KW['kitchen'] + r'|refrigerator|cooking basics|dishes|cutlery|silverware|wine glass|baking|dining table|blender|rice cooker|spices|bread maker',
         'living': KW['living'] + r'|sound system|books|board games|game console|piano|record player|ethernet',
         'bedrooms': KW['bedrooms'] + r'|hangers|clothing storage|room-darkening|blackout|crib|travel cot',
         'bathrooms': KW['bathrooms'] + r'|hair dryer|shampoo|conditioner|body soap|shower gel|bidet|bathtub',
         'pool': KW['pool'] + r'|hot tub',
         'outside': KW['outside'] + r'|balcony|backyard|outdoor furniture|outdoor dining|sun lounger|fire pit|beach essentials',
         'laundry': KW['laundry'] + r'|drying rack|clothes drying',
         'office': KW['office'] + r'|dedicated workspace'}
SAFE = r'first aid|fire extinguisher|smoke alarm|carbon monoxide'
JUST_ROOM = r'(kitchen|cocina|cuina|cuisine|pool|piscina|piscine)'   # the listing's "Kitchen" says nothing inside the Kitchen
am_room = {k: [] for k in ROOM}
for x in [str(v).strip() for v in (A.get('listingAmenities') or []) if str(v).strip()]:
    if re.search(r'^(wifi|wi-fi|essentials|tv)$|parking|wifi', x, re.I) and not re.search(r'smart tv', x, re.I): continue
    if re.fullmatch(JUST_ROOM, x, re.I): continue
    k = next((r for r, rx in AM_KW.items() if re.search(rx, x, re.I)), 'other' if re.search(SAFE, x, re.I) else None)
    if k and x not in am_room[k]: am_room[k].append(x)
low = lambda x: x[:1].lower() + x[1:] if x[1:2].islower() else x
ALSO = {'living': 'Also in the living room', 'kitchen': 'Also in the kitchen', 'bedrooms': 'Also in the bedrooms', 'bathrooms': 'Also in the bathrooms',
        'pool': 'Also by the pool', 'outside': 'Also outside', 'laundry': 'Also in the laundry', 'office': 'Also in the office', 'other': 'Also in the house'}
blocks = []
first = [k for k in dict.fromkeys(room_kind(r) for r in rooms) if k != 'other']   # "Good to know" stays last
for k in first + [k for k in ROOM if k not in first]:
    icon, tone, title = ROOM[k]
    if not items[k] and not room_photos.get(k) and not am_room[k]: continue
    b = {'id': k, 'icon': icon, 'tone': tone, 'title': L(title)}
    if am_room[k]:
        b['sub'] = L(', '.join([am_room[k][0]] + [low(x) for x in am_room[k][1:3]]))
        if len(am_room[k]) > 3: b['body'] = L(f"{ALSO[k]}: {', '.join(low(x) for x in am_room[k])}.")   # up to three are all in the line under the title
    if room_photos.get(k): b['photos'] = room_photos[k]
    if items[k]: b['items'] = [L(x) for x in items[k]]
    blocks.append(b)
# No Wi-Fi block here: Wi-Fi is the first thing on Home (its card opens the network, password and QR code), as in Ca La Kimberly.
if lines('arrival'):
    blocks.insert(0, {'id': 'arrival', 'icon': 'car', 'tone': 'blue', 'title': L('Getting here'), 'items': [L(x) for x in lines('arrival')]})
if lines('localTips'):
    blocks.append({'id': 'tips', 'icon': 'home', 'tone': 'green', 'title': L('Local tips'), 'items': [L(x) for x in lines('localTips')]})
if lines('houseRules'):
    blocks.append({'id': 'rules', 'icon': 'home', 'tone': 'ink', 'title': L('House rules'), 'items': [L(x) for x in lines('houseRules')]})
co = ([f"Check-out by {house['checkout']}."] if house['checkout'] else []) + lines('checkoutTasks')
if A.get('checkIn'): co.insert(0, f"Check-in from {A['checkIn'][:5]}.")
if co: blocks.append({'id': 'checkout', 'icon': 'key', 'tone': 'ink', 'title': L('Check-in and check-out'), 'items': [L(x) for x in co]})
(SITE / 'content/message.json').write_text(json.dumps({'_doc': 'House guide by room, from the host’s onboarding answers.', 'blocks': blocks}, ensure_ascii=False, indent=1))

def _num(x):
    try: return float(str(x).replace(',', '.'))
    except Exception: return None
# The house page (#s/house), the same page as Ca La Kimberly's: photos, the key facts, the description, the rooms in the
# host's order, the beds, what the place offers, the reviews.
if HOUSE_PAGE:
    in_en = lambda x: TR.get(x, {}).get('en', x).lower()
    facts = [str(A.get('propertyType') or '').strip()]
    for k, one, many in (('sleeps', 'guest', 'guests'), ('bedrooms', 'bedroom', 'bedrooms'), ('beds', 'bed', 'beds'), ('bathrooms', 'bathroom', 'bathrooms')):
        n = str(A.get(k) or '').strip()
        if n and n != '0': facts.append(f'{n} {one if n == "1" else many}')
    # In the host's order: each room with its photos; the gallery on top starts with the cover, then one photo of each room.
    by_name = [tour[str(r['n']).strip().lower()] for r in rooms if str(r['n']).strip().lower() in tour]
    leads, rest = [d['photos'][0] for d in by_name], [f for d in by_name for f in d['photos'][1:]]
    leads += [f for fs in room_photos.values() for f in fs if f not in leads and f not in rest]
    # A few big things on top, in the listing's own words when it says them ("Private pool: open all year"), else the host's tick.
    said = [str(x).strip() for x in (A.get('listingAmenities') or []) if str(x).strip()]
    # What the place offers: ids of engine/src/amenities.json (named in six languages), plus the host's own words. Older
    # answers held the builder's English chips and the listing's words apart: those are matched to the list too, and a
    # listing word the list does not know is left out (it would repeat a ticked one in other words).
    ticked = [str(x).strip() for x in (A.get('amenities') or []) if str(x).strip()]
    offers = am_ids(ticked if any(x in AM_BY for x in ticked) else ticked + [x for x in said if am_match(x)])
    highlights = []
    for icon, rx, ids in (('pool', r'pool|piscin', ['pool']), ('flame', r'bbq|barbecue|barbacoa|grill', ['bbq']), ('view', r'\bviews?\b|vistas?\b|\bvues?\b', [i for i in offers if AM_BY.get(i, {}).get('g') == 'views']), ('desk', r'workspace|work area|zona para trabajar', ['workspace'])):
        x, own = next((v for v in said if re.search(rx, v, re.I)), None), next((i for i in ids if i in offers), None)
        parts = re.split(r':|\s[–-]\s', x or '', maxsplit=1); t, more = parts[0].strip(), (parts[1:] or [''])[0]
        if x and ((own and more.strip()) or not any(i in AM_BY for i in offers)):   # the listing's words say more ("Private pool: open all year"), if the host kept it
            highlights.append({'icon': icon, 't': L(t), **({'s': L(more.strip())} if more.strip() else {})})
        elif own: highlights.append({'icon': icon, 't': am_t(AM_BY[own])})
    page = {'_doc': 'The house page (#s/house), from the listing and the host\'s rooms. photos: the gallery on top. tour: the rooms in the host\'s order. amenities: by group of engine/src/amenities.json. amenFirst: how many show before "Show all"; amenTop: the most asked for, shown first while still in the list.',
            'summary': L(' · '.join(x for x in facts if x)), 'photos': (['house.jpg'] if HAS_PHOTO else []) + (leads + rest)[:16], 'highlights': highlights, 'beds': [L(x) for x in lines('sleeping')]}
    if A.get('welcome'): page['description'] = L(A['welcome'])
    if _num(A.get('ratingAvg')): page['rating'] = {'stars': _num(A.get('ratingAvg')), 'count': int(_num(A.get('ratingCount')) or 0) or None}
    if by_name: page['tour'] = [{'room': L(d['n']), 'photos': d['photos']} for d in by_name]
    if offers:   # by group, in the list's order; the host's own at the end; the most asked for shown first (amenTop)
        groups = [{'t': am_t(g), 'items': [am_t(x) for x in AM['items'] if x['g'] == g['id'] and x['id'] in offers] + ([L(x) for x in offers if x not in AM_BY] if g['id'] == 'other' else [])} for g in AM['groups']]
        top = sorted((AM_BY[x] for x in offers if AM_BY.get(x, {}).get('top')), key=lambda x: x['top'])
        page.update({'amenities': [g for g in groups if g['items']], 'amenFirst': 8, 'amenTop': [am_t(x) for x in top[:8]]})
    if LISTING_URL: page['url'] = LISTING_URL
    m = re.match(r'(https?://[^/]*airbnb\.[^/]+/rooms/\d+)', LISTING_URL)
    if m: page['photosUrl'] = m.group(1) + '/photos'
    (SITE / 'content/house-page.json').write_text(json.dumps(page, ensure_ascii=False, indent=1))

# Ratings and reviews (optional section the host switched on). Data contract for the guide: content/reviews.json.
# Live, not curated: the guide shows the listing's own rating and latest reviews as they are, with a link. The values here are a
# snapshot taken at onboarding (the fallback). The engine shows it on the house page, or at the end of the house guide when there is no house page.
if M.get('reviews') and (A.get('listingUrl') or A.get('ratingAvg')):
    (SITE / 'content/reviews.json').write_text(json.dumps({
        '_doc': 'Ratings and reviews. Live from the listing, never curated by hand. rating and count: a snapshot from onboarding. quotes: the listing latest reviews as they are, [{name, date: YYYY-MM, text, lang}]. updated: YYYY-MM-DD last read, or null.',
        'mode': 'live', 'rating': _num(A.get('ratingAvg')), 'count': int(_num(A.get('ratingCount')) or 0) or None,
        'source': LISTING_SRC or 'the listing', 'url': LISTING_URL, 'quotes': [], 'updated': None}, ensure_ascii=False, indent=1))

def info(fid, title_key_text, paras, icon='car', tone='blue'):
    (SITE / f'content/{fid}.json').write_text(json.dumps({'blocks': [
        {'id': fid, 'icon': icon, 'tone': tone, 'title': L(title_key_text), 'items': [L(p) for p in paras]}]}, ensure_ascii=False, indent=1))

# Home tiles start empty (the host pins places in the editor). The taxi they trust goes to Getting around (section
# "transport", content/transport.json) with a one-tap tile on Home; stations and bus stops are added in the editor.
quick = []
def phone_of(s): m = re.search(r'\+?\d[\d\s]{6,}\d', s or ''); return m.group(0).strip() if m else None
taxis = []
if A.get('taxi') and phone_of(A['taxi']):
    nm = re.sub(r'[,:]?\s*\+?\d[\d\s]{6,}\d.*$', '', A['taxi']).strip() or 'Taxi'
    taxis.append({'id': 'taxi', 'name': L(nm), 'phone': phone_of(A['taxi']), 'what': L('The taxi we use and trust.')})
(SITE / 'content/quick.json').write_text(json.dumps({'items': quick}, ensure_ascii=False, indent=1))
if taxis:
    (SITE / 'content/transport.json').write_text(json.dumps({'_doc': 'Getting around: taxis and stations or stops, on their own page; tile = a one-tap tile on Home. Written by generate-site.py from the host\'s taxi answer.',
        'taxis': taxis, 'stations': [], 'tile': {'name': L('Taxi'), 'sub': taxis[0]['name']}}, ensure_ascii=False, indent=1))


# ---------- host-supplied content: how rubbish works, and the places the host recommends ----------
# Neither is researched: only the host knows them. Rubbish comes from the plan they ticked; places from their own list.
GD = json.loads((Path(__file__).parent / 'garbage-defaults.json').read_text())
def gl(obj): return {l: (obj.get(l) or obj.get('en')) for l in LANGS}
# A step may hold its words for a guide with no collection hour ("noTime"): "by the time shown" is only said when a time is shown.
def gl_steps(lst, timed=True): return [gl(x if timed or not x.get('noTime') else x['noTime']) for x in lst]
rmode = A.get('rubbishMode') or ''
rplan = A.get('rubbishPlan') or {}
# Containers the host listed: where (their words), what each takes (fraction ids), an optional Google Maps link (a point on the map when it has coordinates).
def coords_of(url):
    m = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', url or '') or re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url or '') or re.search(r'[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)', url or '')
    return (float(m.group(1)), float(m.group(2))) if m else None
spots = [r for r in (A.get('rubbishSpots') or []) if isinstance(r, dict) and ((r.get('w') or '').strip() or r.get('t') or (r.get('m') or '').strip())]
if not spots and (A.get('rubbishWhere') or '').strip(): spots = [{'w': A['rubbishWhere'].strip(), 't': [], 'm': ''}]
if spots and not rmode: rmode = 'Shared containers in the street'
r_home = bool(re.search('house|mix', rmode, re.I)); r_cont = bool(re.search('container|mix', rmode, re.I))
if rmode:
    fr = []
    for fid in ['organic', 'packaging', 'paper', 'glass', 'rest']:
        days = [d for d in (rplan.get(fid) or [])] if r_home else []
        binn = 'street' if not days else ('brown' if fid == 'organic' else 'grey')
        fr.append({'id': fid, 'bin': binn, 'days': days, 'name': gl(GD['names'][fid]), 'examples': gl(GD['examples'][fid])})
    t = (A.get('rubbishTime') or '')[:5]
    steps = []
    steps += gl_steps(GD['steps_containers'] if (r_cont and not r_home) else GD['steps_home'], bool(t))
    if (A.get('rubbishNotes') or '').strip(): steps += [L(x) for x in lines('rubbishNotes')]
    containers, g_items = [], []
    for n, r in enumerate(spots, 1):
        takes = [x for x in (r.get('t') or []) if x in ('organic', 'packaging', 'paper', 'glass', 'rest')]
        c = {'where': L((r.get('w') or '').strip()) if (r.get('w') or '').strip() else {}, 'takes': takes}
        link = (r.get('m') or '').strip()
        if link.startswith('http'): c['map'] = link
        pt = coords_of(link)
        if pt: c['lat'], c['lng'] = pt
        containers.append(c)
        if pt:   # on the guide map too; a glass-only point is the "glass" spot the rubbish page links to
            g_items.append({'id': 'glass' if takes == ['glass'] else f'containers-{n}', 'name': L('Containers'), 'town': town, 'lat': pt[0], 'lng': pt[1],
                            'km_from_house': None, 'description': c['where'], 'gmaps': link, 'icon': 'bin'})
    (SITE / 'content/garbage.json').write_text(json.dumps({
        '_doc': 'Generated from what the host said about rubbish. Not researched. Bin colours for door-to-door collection are a default: confirm with the host.',
        'collectionTime': t, 'bins': {}, 'fractions': fr, 'steps': steps,
        'missed': gl(GD['missed_containers'] if (r_cont and not r_home) else GD['missed_home']), 'containers': containers, 'items': g_items}, ensure_ascii=False, indent=1))

def place_name_from(p):
    p = p.strip(); m = re.search(r'google\.[a-z.]+/maps/place/([^/@?]+)', p)
    if m: return re.sub(r'\s+', ' ', re.sub(r'[+_]', ' ', __import__('urllib.parse').parse.unquote(m.group(1)))).strip()
    return p
GEO = json.loads((S / 'geocode.json').read_text()) if (S / 'geocode.json').exists() else {}
# A short Google Maps link (maps.app.goo.gl/...) says nothing by itself: one request reads where it redirects
# (the redirect is not followed), which gives the place's name and exact position.
import urllib.request, urllib.error
def resolve_short(url):
    if not re.search(r'maps\.app\.goo\.gl|goo\.gl/maps', url): return {}
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k): return None
    try:
        urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=10)
        return {}
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location') or ''
    except Exception:
        return {}
    out = {}
    if re.search(r'google\.[a-z.]+/maps/place/', loc): out['name'] = place_name_from(loc)
    m = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', loc) or re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', loc)
    if m:
        out['lat'], out['lng'] = float(m.group(1)), float(m.group(2))
        out['km'] = max(1, round(math.hypot((out['lat'] - args.lat) * 111, (out['lng'] - args.lng) * 111 * math.cos(math.radians(args.lat))) * 1.3))
    return out
# The host's own places (bars and restaurants, and Nightlife when they switched it on), each list into its own file.
# A row picked on Google with no name (the words typed to find it did not name it, and the host left it empty: psPick in
# the maker) is read like a kept card, gid:<id>, as worker/host-places.mjs placesOf keys it: named from our directory or waiting.
def host_list(key):
    return [r if (r.get('p') or '').strip() else {**r, 'p': 'gid:' + str(r['gid'])} for r in (A.get(key) or [])
            if isinstance(r, dict) and ((r.get('p') or '').strip() or (r.get('gid') and not str(r['gid']).startswith('r:')))]
# The one list of kinds (engine/src/kinds.json): a place's kind gives its icon, its type in six languages (no translation),
# and for Things to do its quick filter and "Great for kids".
KINDS = json.loads((ROOT / 'engine/src/kinds.json').read_text())
# A card or a picked row whose place has no name of ours yet is not published nameless and does not vanish either: it waits
# in its file's "unnamed" list (never read by the guide), which the editor shows under "Needs you" for the host to name it.
no_name = []
def host_items(rows, filters=False, unnamed=None):   # filters: Things to do (kinds of todo, with their filters); else the kinds of eat
    kinds, items = KINDS['todo' if filters else 'eat'], []
    for r in rows:
        key = r['p'].strip(); card = key.startswith('gid:')   # gid:<id>: a card kept in the swipe deck, or a row picked with no name: only its Google id is known
        g = GEO.get(key) or ({} if card else resolve_short(key))
        waits = card and not (g.get('name') or '').strip()
        # Our name for the place (geocode.json: the host's words tidied, or our record's for a card), else the typed words.
        nm = '' if waits else (g.get('name') or '').strip() or ((place_name_from(key) if key.startswith('http') else key))
        isurl = key.startswith('http'); ismaps = bool(re.search(r'google\.[a-z.]+/maps|maps\.app\.goo\.gl|goo\.gl/maps', key))
        kind = g.get('kind') if g.get('kind') in kinds else None; K = kinds.get(kind) or {}
        # Located by the worker (geocode.json): position, distance, town, kind and the facts we keep. Not found: no position
        # (nomap: no pin, no distance, directions by name; the house's point only satisfies the content check), no kind, no
        # warning (the host vouches for their own places), and no town: the house's would be said as the place's (Barcelona
        # in the house's village), so it is empty, and Google Maps searches for the host's words alone.
        found = bool(g.get('lat') is not None or g.get('gid'))
        gid = g.get('gid') or (key[4:] if card else None)
        it = {'id': (re.sub(r'[^a-z0-9]+', '-', nm.lower()).strip('-')[:40] if nm else 'place-' + re.sub(r'[^a-z0-9]+', '-', str(gid).lower()).strip('-')[:30]) or 'place',
              **({'name': {l: nm for l in LANGS}} if nm else {}),
              **({'type': {l: K['name'].get(l) or K['name']['en'] for l in LANGS}, 'icon': kind} if kind else {}), 'town': g.get('town') or (town if found else ''), 'place': g.get('place', ''),
              'lat': g.get('lat', args.lat), 'lng': g.get('lng', args.lng), 'km_from_house': g.get('km'),
              'tags': ['kidsfun'] if filters and K.get('kids') else [], **({'group': K['group']} if filters and K.get('group') else {}),
              'flags': [], 'hostPick': True,
              **({'gid': gid} if gid else {}), **({'pos': g['pos']} if g.get('pos') else {}), **({'always': True} if g.get('always') else {}), **({} if g.get('lat') else {'nomap': True}),
              'gmaps': g.get('gmaps') or (key if ismaps else 'https://www.google.com/maps/search/?api=1&query=' + __import__('urllib.parse').parse.quote_plus(nm or f"{args.lat},{args.lng}")
                                          + ('&query_place_id=' + __import__('urllib.parse').parse.quote_plus(gid) if gid else ''))}
        if (r.get('c') or '').strip(): it['description'] = L(r['c'].strip())   # the host's own words; no comment, no description
        if isurl and not ismaps: it['url'] = key
        elif g.get('url'): it['url'] = g['url']   # its own website, from our sources
        for k2 in ('phone', 'hours', 'schedule', 'price', 'priceNote', 'wiki'):
            if g.get(k2): it[k2] = L(g[k2]) if k2 in ('hours', 'priceNote') else g[k2]
        if g.get('book') is True: it['flags'] = ['book']   # its own site asks to book: the engine's "Book ahead"
        # Open only part of the year and no hours of ours (its own site, or the host's entry): the season, MM-DD at both ends.
        # Hours with their own season stay rows (from/to on each), so a place with hours never gets it.
        ss = next((x for x in (g.get('season'), r.get('season')) if isinstance(x, dict) and all(re.fullmatch(r'(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])', str(x.get(k) or '')) for k in ('from', 'to')) and x['from'] != x['to']), None)
        if ss and not it.get('schedule') and not it.get('always'): it['season'] = {'from': ss['from'], 'to': ss['to']}
        # Where those facts came from (the worker's filled: {at, from: {field: source}, page?}), for the editor's line under
        # "Filled in for you"; guests never see it. A website the host typed as the place is theirs, not a source's.
        if isinstance(g.get('filled'), dict):
            fl = json.loads(json.dumps(g['filled']))
            if isurl and not ismaps: (fl.get('from') or {}).pop('url', None)
            if 'season' not in it: (fl.get('from') or {}).pop('season', None)
            if fl.get('from'): it['filled'] = fl
        if waits:
            no_name.append(key)
            if unnamed is not None: unnamed.append(it)
            continue
        items.append(it)
    return items
UNNAMED_DOC = ' unnamed: places the host picked or kept whose name nobody has given yet (no words of theirs, none in our directory): never shown to guests; the editor asks the host to name each one, which moves it into items.'
def write_host_places(rows, file):
    waiting = []
    doc = {'_doc': "The host's own list, written by generate-site.py. No researched places are added here. season: {from, to} as MM-DD, a place open only part of the year with no hours of ours (no schedule)." + UNNAMED_DOC + LOOK_DOC, 'items': host_items(rows, unnamed=waiting)}
    if waiting: doc['unnamed'] = waiting
    (SITE / f'content/{file}.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1))
fav, night = host_list('favEat'), host_list('favNight')
if fav: write_host_places(fav, 'restaurants')
if night: write_host_places(night, 'nightlife')
# Things to do: only what the host chose, the cards they kept in the swipe game and the places they added (Yohann, 30 Oct
# 2026: nothing goes in that the host has not seen). A place the research found too keeps its description, with the host's
# comment if any. The rest of the research goes to docs/more-places.json, without the cards they turned down: the worker
# makes it cards in the editor, for them to keep or skip.
plain = lambda x: re.sub(r'[^a-z0-9]+', '', unicodedata.normalize('NFD', str(x).lower()).encode('ascii', 'ignore').decode())
en_name = lambda it: (lambda n: n.get('en') or next(iter(n.values()), '') if isinstance(n, dict) else n or '')(it.get('name'))
swipes = [s for s in (A.get('swipes') or {}).values() if isinstance(s, dict) and s.get('cat', 'todo') == 'todo']
raw_added = A.get('favDo')
added = host_list('favDo') if isinstance(raw_added, list) else [{'p': x.strip()} for x in re.split(r'[,\n]+', raw_added or '') if x.strip()]
# A card from Google: only its id is ours, so it is gid:<id> and its name comes from geocode.json. A researched card (r:)
# keeps the research's own name, which finds its place among the research's below.
kept = []
for s in swipes:
    if s.get('d') != 'yes': continue
    sid = str(s.get('id') or '')
    if sid and not sid.startswith('r:'): kept.append({'p': 'gid:' + sid, 'c': s.get('c') or ''})
    elif (s.get('name') or '').strip(): kept.append({'p': s['name'].strip(), 'c': s.get('c') or ''})
turned_down = {plain(s['name']) for s in swipes if s.get('d') == 'no' and (s.get('name') or '').strip()}
todo_file = SITE / 'content/todo.json'
if todo_file.exists() or kept or added:
    todo_doc = json.loads(todo_file.read_text()) if todo_file.exists() else {'_doc': "The host's places, written by generate-site.py."}
    found, picks, waiting = [x for x in todo_doc.get('items') or [] if plain(en_name(x)) not in turned_down], [], []
    for it in host_items(kept + added, True, waiting):
        key = plain(en_name(it))
        twin = next((x for x in found if len(key) >= 5 and (key in plain(en_name(x)) or plain(en_name(x)) in key)), None)
        if twin:
            found.remove(twin); it = {**twin, 'hostPick': True, **({'description': it['description']} if it.get('description') else {})}
        if not any(plain(en_name(x)) == plain(en_name(it)) for x in picks): picks.append(it)
    # Nothing of Google's check goes into the guide: its note, the date it was asked, and the "check" an older research set
    # because Google called the place temporarily closed (its status is only ever shown live now, never kept).
    def ours(x):
        y = {k: v for k, v in x.items() if k not in ('_card', '_google', 'checked')}
        if str(x.get('_google') or '').startswith('Temporarily closed') and isinstance(y.get('flags'), list): y['flags'] = [fl for fl in y['flags'] if fl != 'check']
        return y
    todo_doc['items'] = [ours(x) for x in picks]
    todo_doc['_doc'] = with_look(todo_doc.get('_doc'))
    if waiting: todo_doc['unnamed'] = waiting; todo_doc['_doc'] = (todo_doc.get('_doc') or '') + ('' if UNNAMED_DOC in (todo_doc.get('_doc') or '') else UNNAMED_DOC)
    else: todo_doc.pop('unnamed', None)
    todo_file.write_text(json.dumps(todo_doc, ensure_ascii=False, indent=1))
    (SITE / 'docs').mkdir(parents=True, exist_ok=True)
    for x in found: x.setdefault('id', re.sub(r'[^a-z0-9]+', '-', en_name(x).lower()).strip('-')[:40] or 'place'); x.pop('_card', None)
    (SITE / 'docs/more-places.json').write_text(json.dumps(found, ensure_ascii=False, indent=1))
if no_name: print(f'{len(no_name)} places have no name yet: waiting in the editor for the host to name them')

# Sections, in Home order. Researched ones start as "soon" until their content file has items.
def has_items(f):
    p = SITE / f'content/{f}.json'
    if not p.exists(): return False
    d = json.loads(p.read_text())
    return bool(d.get('items') or d.get('blocks') or d.get('groups') or d.get('markets') or d.get('fractions') or d.get('taxis') or d.get('stations'))
# Same sections as the live Ca La Kimberly guide (sites/ca-la-kimberly/content/sections.json): house guide, garbage, emergency, markets,
# restaurants (the host's own list), things to do, events, plus the quick tiles and the map; and Nightlife (the host's own
# list too), part of the design since 29 Oct 2026 but off unless the host switches it on. Arrival and parking live inside the house guide.
# Optional extra sections for other hosts (arrival, extras, essentials, kids, day trips) come later: add them back here and in onboarding SECTIONS.
SEC = [
    ('garbage', 'house', 'garbage', 'garbage', {'color': 'glass', 'mapLabelKey': 'glassChip'}, 'rubbish'),
    ('message', 'house', 'info', 'houseGuide', {}, 'houseguide'),
    ('emergency', 'house', 'contacts', 'emergency', {}, 'emergency'),
    ('transport', 'house', 'transport', 'gettingAround', {}, 'quick'),
    ('markets', 'area', 'markets', 'markets', {}, 'markets'),
    ('restaurants', 'area', 'spots', 'barsRestaurants', {'color': 'restaurants'}, 'eat'),
    ('todo', 'area', 'spots', 'whatToDo', {'color': 'todo'}, 'todo'),
    ('nightlife', 'area', 'spots', 'nightlife', {'color': 'nightlife'}, 'nightlife'),   # optional (off unless the host switched it on)
    ('events', 'area', 'events', 'events', {'color': 'events'}, 'events'),
]
sections, modules, research = [], {'house': HOUSE_PAGE, 'quick': bool(quick) and on('quick'), 'map': on('map')}, []
if HOUSE_PAGE: sections.append({'id': 'house', 'group': 'house', 'kind': 'house', 'labelKey': 'theHouse', 'status': 'live', 'file': 'house-page'})
for sid, grp, kind, label, extra, mod in SEC:
    want = on(mod, mod in ('houseguide', 'emergency', 'todo', 'rubbish', 'markets', 'events', 'eat', 'quick'))   # on unless the host switched it off, as in the builder; rubbish and eat need the host's answer, markets need researched content: checked below
    if sid == 'garbage': want = want and bool(rmode)   # only the host can tell us: no answer, no section
    if sid == 'restaurants': want = want and bool(fav)
    if sid == 'nightlife': want = on('nightlife', False) and bool(night)
    if sid == 'transport': want = want and bool(taxis)
    modules[sid] = bool(want)
    if not want: continue
    live = kind == 'markets' and (SITE / 'content/markets.json').exists() or has_items(sid)
    sections.append({'id': sid, 'group': grp, 'kind': kind, 'labelKey': label, 'status': 'live' if live else 'soon', **extra})
    if not live: research.append(sid)
if 'markets' not in modules or not modules['markets'] or not (SITE / 'content/markets.json').exists():
    modules['markets'] = modules.get('markets', False) and (SITE / 'content/markets.json').exists()
(SITE / 'content/sections.json').write_text(json.dumps({'_doc': 'Generated from onboarding. Order = Home order within each group.', 'sections': sections}, ensure_ascii=False, indent=1))

# Site-specific strings: the place name and area.
area = ', '.join(x for x in [town, A.get('region', '')] if x)
LISTING_WORDS = {'housePhotosSub': 'Photos, rooms and description', 'airbnbReviews': '{n} reviews',
                 'bookAirbnb': f'Book on {LISTING_SRC}' if LISTING_SRC else 'See the listing',
                 'bookAirbnbLead': f'Not staying with us yet? Check dates and book on {LISTING_SRC}.' if LISTING_SRC else 'Not staying with us yet? See the listing.',
                 'allPhotosAirbnb': f'All photos on {LISTING_SRC}' if LISTING_SRC else 'All photos'}
for l in LANGS:
    o = {'appName': name, 'houseName': place, 'brandSub': area}
    if A.get('tagline'): o['welcome'] = L(A['tagline']).get(l, A['tagline'])
    if LISTING_SRC != 'Airbnb':   # the house page's strings name Airbnb; another listing, or none, gets its own
        for k, x in LISTING_WORDS.items(): o[k] = L(x).get(l, x)
    (SITE / f'i18n/{l}.json').write_text(json.dumps(o, ensure_ascii=False, indent=2))

site = {
    '_doc': 'Generated by engine/scripts/generate-site.py from a Porta onboarding. Safe to edit by hand.',
    'slug': args.slug, 'name': name,
    'description': f'{name}, guest guide for {place}{", " + town if town else ""}: house guide, places nearby, map and directions.',
    **({'logo': 'logo-head.png'} if logo_im else {}), 'shareImage': 'house.jpg' if HAS_PHOTO else ('logo-head.png' if logo_im else 'favicon.png'), 'languages': LANGS, 'storageKey': args.slug,
    'area': {'radiusKm': {'15 min': 15, '30 min': 30, '45 min': 45, '1 hour': 60}.get(A.get('radius'), 30)},
    'modules': modules,
    'theme': {'world': WORLD, 'paper': palette['paper'], 'manifestBackground': palette['paper'], 'manifestTheme': a[0], 'darkMode': False,
              **({'coverMade': 'ai'} if own_cover and cover.get('made') == 'ai' else {})},   # the cover-art job's drawing: the credits say it was made with AI
    'previewImages': (['logo-head.png'] if logo_im else []) + ['favicon.png'] + (['house.jpg'] if HAS_PHOTO else []),
    'onboarding': {'world': CHOICE, 'palette': palette}
}
(SITE / 'site.json').write_text(json.dumps(site, ensure_ascii=False, indent=2))

# What is left for research, with the host's own hints.
todo = [f'# Research to do for {name}', '', f'Area: {area} · radius {site["area"]["radiusKm"]} km · point {args.lat}, {args.lng}', '',
        'Fill each file in content/ (same shapes as sites/ca-la-kimberly/content), then set its section to "live" (re-running this script does it).',
        'Before researching, read docs/CURATION.md: list what a guest would not find by searching Google themselves (no groceries, no golf courses for golfers), each with a one-line reason.', '']
hints = {'todo': 'favourites', 'essentials': 'essentials'}   # rubbish and restaurants are never researched
for sid in research:
    todo.append(f'- [ ] {sid}' + (f": host notes: {A.get(hints[sid], '')!r}" if hints.get(sid) and A.get(hints[sid]) else ''))
todo += ['', f'Interests: {", ".join(A.get("interests") or [])}', f'Guests: {", ".join(A.get("guests") or [])}',
         f'Avoid: {A.get("avoidPlaces") or "-"}', f'Extra ideas from the host: {A.get("moduleIdeas") or "-"}']
(SITE / 'docs/research-todo.md').write_text('\n'.join(todo) + '\n')
(SITE / 'docs/untranslated.json').write_text(json.dumps(sorted(untranslated), ensure_ascii=False, indent=1))
nf = SITE / 'netlify.toml'
if not nf.exists():
    nf.write_text(f'# Netlify: set "Base directory" to sites/{args.slug}.\n[build]\n  command = "cd ../.. && npm ci && npm run build -- {args.slug}"\n  publish = "dist"\n\n[[headers]]\n  for = "/sw.js"\n  [headers.values]\n    Cache-Control = "no-cache"\n')

print(json.dumps({'site': str(SITE.relative_to(ROOT)), 'world': WORLD, 'palette': palette,
                  'languages': LANGS, 'sections': [(s['id'], s['status']) for s in sections], 'research': research,
                  'untranslated': len(untranslated), 'photos': {k: len(v) for k, v in room_photos.items()}}, indent=1))
