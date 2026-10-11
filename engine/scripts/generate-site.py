#!/usr/bin/env python3
"""Turn a Porta onboarding submission into sites/<slug>/ (the mechanical part).

Usage:
  python3 engine/scripts/generate-site.py <submission-dir> --slug <slug> --lat <lat> --lng <lng>
      [--src en] [--translations <file.json>] [--preset auto|bauhaus|editorial|soft|minimal]

<submission-dir> holds what the onboarding page stored:
  host.json                 the hosts/<uid> document (answers, status...)
  uploads/<id>.json         one document per upload (kind, room, dataUrl or assetId)
  assets/<assetId>.<ext>    files for uploads stored as assets (fetched separately)

What it does: site.json (name, languages, modules, preset, palette), theme.css from the
inspiration images, house.json, the house guide (message.json) from the host's own words,
arrival/extras pages, quick calls, sections.json, photos, logo and icons, and research-todo.md:
the list of researched modules (eat, markets, things to do...) still to fill by hand or by an agent.
Texts are kept in the host's language; --translations adds the other languages
({"source text": {"es": "...", "fr": "..."}}). Re-running is safe: researched content files
that already exist are never overwritten.
"""
import argparse, base64, colorsys, io, json, math, os, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ENGINE_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl']

ap = argparse.ArgumentParser()
ap.add_argument('src_dir'); ap.add_argument('--slug', required=True)
ap.add_argument('--lat', type=float, required=True); ap.add_argument('--lng', type=float, required=True)
ap.add_argument('--src', default='en'); ap.add_argument('--translations')
ap.add_argument('--preset', default=None)
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
    for l in LANGS:
        if l == args.src: continue
        t = TR.get(text, {}).get(l)
        if t: out[l] = t
        elif text: untranslated.add(text); out[l] = out[args.src]   # shown in the host's words until translated: never an empty text
    return out

def lines(k):
    return [re.sub(r'^\s*[-*•]\s*', '', x).strip() for x in (A.get(k) or '').splitlines() if x.strip()]

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

# ---------- palette from the inspiration images ----------
def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)
hexc = lambda c: '#%02X%02X%02X' % tuple(int(round(x)) for x in c)
def hls(c): return colorsys.rgb_to_hls(*(x / 255 for x in c))
def from_hls(h, l, s): return tuple(x * 255 for x in colorsys.hls_to_rgb(h, l, s))

def kmeans(px, k=8, it=12):
    rng = np.random.default_rng(1)
    cent = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        d = ((px[:, None, :] - cent[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for i in range(k):
            m = px[lab == i]
            if len(m): cent[i] = m.mean(0)
    counts = np.bincount(lab, minlength=k)
    return [(tuple(cent[i]), counts[i] / len(px)) for i in np.argsort(-counts)]

insp = [im for im in (load_upload(u) for u in by_kind.get('inspiration', [])) if im]
stats = {}
if insp:
    px = np.concatenate([np.asarray(ImageOps.exif_transpose(im).convert('RGB').resize((120, 120))).reshape(-1, 3).astype(float) for im in insp])
    clusters = kmeans(px, 9)
    sat = np.array([hls(c)[2] for c, _ in clusters]); light = np.array([hls(c)[1] for c, _ in clusters]); w = np.array([f for _, f in clusters])
    stats = {'saturation': float((sat * w).sum()), 'lightness': float((light * w).sum()), 'spread': float(light.max() - light.min()),
             'colourful': int(((sat > .45) & (w > .04)).sum())}
    # Paper: a light, quiet colour from the image, or near white tinted by it.
    lights = sorted([c for c, f in clusters if hls(c)[1] > .82 and hls(c)[2] < .5], key=lambda c: -hls(c)[1])
    base_h = hls(clusters[0][0])[0]
    paper = lights[0] if lights else from_hls(base_h, .965, .25)
    h, l, s = hls(paper); paper = from_hls(h, max(l, .94), min(s, .35))
    # Ink: the darkest colour, pushed dark enough for long text.
    dark = min((c for c, _ in clusters), key=lambda c: hls(c)[1])
    h, l, s = hls(dark); ink = from_hls(h, min(l, .13), min(s, .35))
    # Accents: the most saturated distinct colours, adjusted to read on paper.
    acc = []
    for c, f in sorted(clusters, key=lambda x: -(hls(x[0])[2] * (0.3 + x[1]))):
        h, l, s = hls(c)
        if s < .25: continue
        if any(min(abs(h - hls(a)[0]), 1 - abs(h - hls(a)[0])) < .06 for a in acc): continue
        acc.append(c)
    while len(acc) < 4:
        h = (hls(acc[-1])[0] + .33) % 1 if acc else base_h
        acc.append(from_hls(h, .45, .55))
    # Tiles: blue, red and green carry white text, yellow and orange carry ink text.
    def on_white(c, min_c=3.2):
        h, l, s = hls(c)
        while contrast(c, (255, 255, 255)) < min_c and l > .08:
            l -= .03; c = from_hls(h, l, s)
        return c
    def on_ink(c, min_c=5):
        h, l, s = hls(c)
        while contrast(c, ink) < min_c and l < .92:
            l += .03; c = from_hls(h, l, s)
        return c
    # Each engine colour slot takes the image colour nearest its hue; missing ones are derived.
    hd = lambda x, y: min(abs(x - y), 1 - abs(x - y))
    pool = list(acc[:6]); slots = {}
    for slot, target in [('yellow', .14), ('red', .0), ('blue', .6), ('green', .33), ('orange', .07)]:
        if pool:
            c = min(pool, key=lambda c: hd(hls(c)[0], target))
            if hd(hls(c)[0], target) < .12:
                slots[slot] = c; pool.remove(c); continue
        # No image colour near this slot's hue: derive one at the slot's own hue, never at another colour's hue
        # (a purple "blue" next to terracotta photos looked wrong). Blue is a calm deep blue, the others mid-tone.
        slots[slot] = from_hls(target, .40, .45) if slot == 'blue' else from_hls(target, .5, .55)
    # Yellow must stand apart from the paper: a pale cream "yellow" disappears on the page.
    if contrast(slots['yellow'], tuple(x for x in paper)) < 1.6 or hls(slots['yellow'])[2] < .45:
        slots['yellow'] = from_hls(.12, .58, .75)
    accents = [on_white(slots['blue']), on_white(slots['red']), on_ink(slots['yellow']), on_ink(slots['orange']), on_white(slots['green'])]
    palette = {'paper': hexc(paper), 'ink': hexc(ink), 'accents': [hexc(c) for c in accents]}
else:
    palette = {'paper': '#F7F5F0', 'ink': '#1E1E1E', 'accents': ['#2F5D8A', '#C2502E', '#E2A93B', '#3E7D4F']}

# ---------- layout preset ----------
mood = args.preset or A.get('mood') or 'auto'
MAP = {'bold': 'bauhaus', 'editorial': 'editorial', 'soft': 'soft', 'minimal': 'minimal'}
if mood in MAP: preset = MAP[mood]
elif mood in MAP.values(): preset = mood
else:  # decide from the images
    if not stats: preset = 'editorial'
    elif stats['saturation'] < .18: preset = 'minimal'
    elif stats['lightness'] > .68 and stats['saturation'] < .5: preset = 'soft'
    elif stats['colourful'] >= 3 and stats['saturation'] > .45: preset = 'bauhaus'
    else: preset = 'editorial'


# ---------- style: the host describes it in words; we start from the closest kit, then a design pass makes it theirs ----------
W = lambda fam, ws: [f'{fam}/{x}.css' for x in ws]
KITS = {
 'rustic':   dict(words='rustic warm earthy cosy farmhouse country countryside tuscan authentic wine terracotta olive handmade natural traditional', preset='soft',
                  fonts=W('fraunces', [400, 600, 700]) + W('dm-sans', [400, 500, 700]), display='"Fraunces",Georgia,serif', font='"DM Sans",system-ui,sans-serif', r='18px', rs='10px'),
 'elegant':  dict(words='elegant luxurious luxury refined boutique hotel classic sophisticated chic upscale quiet', preset='editorial',
                  fonts=W('cormorant-garamond', [400, 500, 600, 700]) + W('jost', [400, 500, 600]), display='"Cormorant Garamond",Georgia,serif', font='"Jost",system-ui,sans-serif', r='2px', rs='2px'),
 'playful':  dict(words='playful fun colourful colorful bright kids family children cheerful happy lively cartoon picture', preset='bauhaus',
                  fonts=W('bricolage-grotesque', [400, 500, 600, 700]) + W('nunito', [400, 600, 700]), display='"Bricolage Grotesque",system-ui,sans-serif', font='"Nunito",system-ui,sans-serif', r='24px', rs='14px'),
 'modern':   dict(words='modern minimal clean simple sleek scandinavian white crisp contemporary tech', preset='minimal',
                  fonts=W('space-grotesk', [400, 500, 600, 700]) + W('inter', [400, 500, 600]), display='"Space Grotesk",system-ui,sans-serif', font='"Inter",system-ui,sans-serif', r='10px', rs='8px'),
 'coastal':  dict(words='sea beach coastal mediterranean blue breezy relaxed surf sun sand island nautical summer', preset='soft',
                  fonts=W('dm-serif-display', [400]) + W('dm-sans', [400, 500, 700]), display='"DM Serif Display",Georgia,serif', font='"DM Sans",system-ui,sans-serif', r='20px', rs='12px'),
 'magazine': dict(words='magazine editorial photo story journal design art gallery', preset='editorial',
                  fonts=W('instrument-serif', [400]) + W('geist', [400, 500, 600, 700]), display='"Instrument Serif",Georgia,serif', font='"Geist",system-ui,sans-serif', r='4px', rs='4px'),
}
style_text = ' '.join([A.get('styleBrief') or '', A.get('lookLikes') or '', A.get('refLinks') or '', ' '.join(A.get('feelWords') or [])]).lower()
score = {k: sum(style_text.count(w) for w in v['words'].split()) for k, v in KITS.items()}
kit_id = max(score, key=score.get) if any(score.values()) else None
KIT = KITS.get(kit_id)
if KIT and not args.preset and A.get('mood') in (None, '', 'auto'): preset = KIT['preset']

a = palette['accents'] + palette['accents']
ink_on = lambda c: '#FFFFFF' if contrast(tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)), (255, 255, 255)) >= 3 else palette['ink']
theme_css = f"""/* {A.get('guideName') or A.get('placeName')}: generated from the host's inspiration images (preset "{preset}").
   Edit freely: these tokens sit on top of the engine look and the preset. */
:root{{
  --paper:{palette['paper']};--ink:{palette['ink']};
  --blue:{a[0]};--red:{a[1]};--yellow:{a[2]};--orange:{a[3]};--green:{a[4] if len(palette['accents']) > 4 else a[3]};
  --accent:{a[0]};--k-sky:var(--blue);{(chr(10) + '  --display:' + KIT['display'] + ';--font:' + KIT['font'] + ';--r:' + KIT['r'] + ';--r-s:' + KIT['rs'] + ';--r-m:' + KIT['rs'] + ';') if KIT else ''}
}}
"""
_tc = SITE / 'theme.css'
if _tc.exists() and _tc.read_text().lstrip().startswith('/* designed:'):
    print('theme.css was designed by hand: kept as is')   # the design pass owns it once it starts with "/* designed:"
else: _tc.write_text(theme_css)

# ---------- photos, cover, logo, icons ----------
cover = (by_kind.get('cover') or [None])[0]
if cover and (im := load_upload(cover)): save_jpg(im, SITE / 'public/house.jpg', 1800)
elif insp: save_jpg(insp[0], SITE / 'public/house.jpg', 1800)

ROOM_KEY = {'Living room': 'living', 'Kitchen': 'kitchen', 'Bedroom': 'bedrooms', 'Bathroom': 'bathrooms', 'Pool': 'pool', 'Garden': 'outside',
            'Terrace': 'outside', 'Outside': 'outside', 'Office': 'office', 'Laundry': 'laundry', 'View': 'outside', 'Other': 'other', '': 'other'}
room_photos = {}
for i, u in enumerate(by_kind.get('photo', [])):
    im = load_upload(u)
    if not im: continue
    key = ROOM_KEY.get(u.get('room', ''), 'other')
    n = len(room_photos.setdefault(key, [])) + 1
    f = f'guide/{key}-{n}.jpg'
    save_jpg(im, SITE / 'public' / f)
    room_photos[key].append(f)

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
for x in _listing_photos():
    try:
        req = urllib.request.Request(x['url'] + '?im_w=1600', headers={'User-Agent': 'Mozilla/5.0'})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read()))
    except Exception as e:
        print('listing photo not downloaded:', x['url'], e); continue
    key = ROOM_KEY.get(x.get('room', ''), 'other')
    n = len(room_photos.setdefault(key, [])) + 1
    f = f'guide/{key}-{n}.jpg'
    save_jpg(im, SITE / 'public' / f)
    room_photos[key].append(f)

def square(im, size):
    im = ImageOps.exif_transpose(im).convert('RGBA')
    return ImageOps.fit(im, (size, size), Image.LANCZOS)
logo_up = (by_kind.get('logo') or [None])[0]
logo_im = load_upload(logo_up) if logo_up else None
if not logo_im:
    # A simple monogram on the first accent.
    name = (A.get('guideName') or A.get('placeName') or 'G').strip()
    logo_im = Image.new('RGBA', (512, 512), a[0])
    d = ImageDraw.Draw(logo_im)
    try: font = ImageFont.truetype(str(next((ROOT / 'node_modules/@fontsource').glob('**/*.ttf'))), 300)
    except Exception:
        try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 300)
        except Exception: font = ImageFont.load_default()
    d.text((256, 270), name[0].upper(), fill=ink_on(a[0]), font=font, anchor='mm')
for fn, sz in [('logo-head.png', 256), ('favicon.png', 64), ('apple-touch-icon.png', 180), ('icons/icon-192.png', 192), ('icons/icon-512.png', 512)]:
    square(logo_im, sz).save(SITE / 'public' / fn)
mask = Image.new('RGBA', (512, 512), palette['paper']); mask.alpha_composite(square(logo_im, 410), (51, 51)); mask.save(SITE / 'public/icons/icon-maskable-512.png')

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
         'photo': 'house.jpg', 'photoPos': '50% 55%', 'checkout': (A.get('checkOut') or '11:00')[:5]}
if wifi:   # the Wi-Fi password never goes in tracked files: private/wifi.json is git-ignored (the engine merges it into house.wifi)
    (SITE / 'private').mkdir(exist_ok=True)
    (SITE / 'private/wifi.json').write_text(json.dumps(wifi, ensure_ascii=False, indent=2))
if A.get('listingUrl'): house['listing'] = A['listingUrl']
(SITE / 'content/house.json').write_text(json.dumps(house, ensure_ascii=False, indent=1))

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
blocks = []
for k, (icon, tone, title) in ROOM.items():
    if not items[k] and not room_photos.get(k): continue
    b = {'id': k, 'icon': icon, 'tone': tone, 'title': L(title)}
    if room_photos.get(k): b['photos'] = room_photos[k]
    if items[k]: b['items'] = [L(x) for x in items[k]]
    blocks.append(b)
if wifi:
    blocks.insert(0, {'id': 'wifi', 'icon': 'wifi', 'tone': 'green', 'title': L('Wi-Fi'),
                      'items': [L('Tap Wi-Fi on the home page for the network, the password and a QR code.')]})
if lines('arrival'):
    blocks.insert(1 if wifi else 0, {'id': 'arrival', 'icon': 'car', 'tone': 'blue', 'title': L('Getting here'), 'items': [L(x) for x in lines('arrival')]})
if lines('houseRules'):
    blocks.append({'id': 'rules', 'icon': 'home', 'tone': 'ink', 'title': L('House rules'), 'items': [L(x) for x in lines('houseRules')]})
co = [f"Check-out by {house['checkout']}."] + lines('checkoutTasks')
if A.get('checkIn'): co.insert(0, f"Check-in from {A['checkIn'][:5]}.")
blocks.append({'id': 'checkout', 'icon': 'key', 'tone': 'ink', 'title': L('Check-in and check-out'), 'items': [L(x) for x in co]})
(SITE / 'content/message.json').write_text(json.dumps({'_doc': 'House guide by room, from the host’s onboarding answers.', 'blocks': blocks}, ensure_ascii=False, indent=1))

def info(fid, title_key_text, paras, icon='car', tone='blue'):
    (SITE / f'content/{fid}.json').write_text(json.dumps({'blocks': [
        {'id': fid, 'icon': icon, 'tone': tone, 'title': L(title_key_text), 'items': [L(p) for p in paras]}]}, ensure_ascii=False, indent=1))

# Quick calls: the host and the taxi they trust.
quick = []
def phone_of(s): m = re.search(r'\+?\d[\d\s]{6,}\d', s or ''); return m.group(0).strip() if m else None
if A.get('taxi') and phone_of(A['taxi']):
    nm = re.sub(r'[,:]?\s*\+?\d[\d\s]{6,}\d.*$', '', A['taxi']).strip() or 'Taxi'
    quick.append({'id': 'taxi', 'name': L('Taxi'), 'sub': L(nm), 'title': L(nm), 'kind': L('Taxi'), 'what': L('The taxi we use and trust.'), 'phone': phone_of(A['taxi']), 'always': True})
(SITE / 'content/quick.json').write_text(json.dumps({'items': quick}, ensure_ascii=False, indent=1))


# ---------- host-supplied content: how rubbish works, and the places the host recommends ----------
# Neither is researched: only the host knows them. Rubbish comes from the plan they ticked; places from their own list.
GD = json.loads((Path(__file__).parent / 'garbage-defaults.json').read_text())
def gl(obj): return {l: (obj.get(l) or obj.get('en')) for l in LANGS}
def gl_steps(lst): return [gl(x) for x in lst]
rmode = A.get('rubbishMode') or ''
rplan = A.get('rubbishPlan') or {}
r_home = bool(re.search('house|mix', rmode, re.I)); r_cont = bool(re.search('container|mix', rmode, re.I))
if rmode:
    fr = []
    for fid in ['organic', 'packaging', 'paper', 'glass', 'rest']:
        days = [d for d in (rplan.get(fid) or [])] if r_home else []
        binn = 'street' if not days else ('brown' if fid == 'organic' else 'grey')
        fr.append({'id': fid, 'bin': binn, 'days': days, 'name': gl(GD['names'][fid]), 'examples': gl(GD['examples'][fid])})
    steps = []
    if r_cont and (A.get('rubbishWhere') or '').strip(): steps.append(L(A['rubbishWhere'].strip()))
    steps += gl_steps(GD['steps_containers'] if (r_cont and not r_home) else GD['steps_home'])
    if (A.get('rubbishNotes') or '').strip(): steps += [L(x) for x in lines('rubbishNotes')]
    t = (A.get('rubbishTime') or '')[:5]
    (SITE / 'content/garbage.json').write_text(json.dumps({
        '_doc': 'Generated from what the host said about rubbish. Not researched. Bin colours for door-to-door collection are a default: confirm with the host.',
        'collectionTime': t, 'bins': {}, 'fractions': fr, 'steps': steps,
        'missed': gl(GD['missed_containers'] if (r_cont and not r_home) else GD['missed_home']), 'items': []}, ensure_ascii=False, indent=1))

def place_name_from(p):
    p = p.strip(); m = re.search(r'google\.[a-z.]+/maps/place/([^/@?]+)', p)
    if m: return re.sub(r'\s+', ' ', re.sub(r'[+_]', ' ', __import__('urllib.parse').parse.unquote(m.group(1)))).strip()
    return p
GEO = json.loads((S / 'geocode.json').read_text()) if (S / 'geocode.json').exists() else {}
fav = [r for r in (A.get('favEat') or []) if isinstance(r, dict) and (r.get('p') or '').strip()]
if fav:
    items = []
    for r in fav:
        key = r['p'].strip(); g = GEO.get(key, {})
        nm = g.get('name') or place_name_from(key)
        isurl = key.startswith('http'); ismaps = bool(re.search(r'google\.[a-z.]+/maps|maps\.app\.goo\.gl|goo\.gl/maps', key))
        it = {'id': re.sub(r'[^a-z0-9]+', '-', nm.lower()).strip('-')[:40] or 'place', 'name': {l: nm for l in LANGS},
              'type': L(g.get('type') or "Host's pick"), 'town': g.get('town') or town, 'place': g.get('place', ''),
              'lat': g.get('lat', args.lat), 'lng': g.get('lng', args.lng), 'km_from_house': g.get('km', 0),
              'description': L(r.get('c', '').strip()) if (r.get('c') or '').strip() else {}, 'tags': g.get('tags', []),
              'flags': ['check'] if not g.get('hours') and not g.get('schedule') else [], 'hostPick': True,
              'gmaps': key if ismaps else 'https://www.google.com/maps/search/?api=1&query=' + __import__('urllib.parse').parse.quote_plus(nm + ' ' + (g.get('town') or town))}
        if isurl and not ismaps: it['url'] = key
        for k2 in ('phone', 'hours', 'schedule', 'price', 'priceNote', 'icon', 'wiki'):
            if g.get(k2): it[k2] = L(g[k2]) if k2 in ('hours', 'priceNote') else g[k2]
        items.append(it)
    (SITE / 'content/restaurants.json').write_text(json.dumps({'_doc': "The host's own list, written by generate-site.py. No researched places are added here.", 'items': items}, ensure_ascii=False, indent=1))

# Sections, in Home order. Researched ones start as "soon" until their content file has items.
def has_items(f):
    p = SITE / f'content/{f}.json'
    if not p.exists(): return False
    d = json.loads(p.read_text())
    return bool(d.get('items') or d.get('blocks') or d.get('groups') or d.get('markets') or d.get('fractions'))
# Same sections as the live Ca La Kimberly guide (sites/ca-la-kimberly/content/sections.json): house guide, garbage, emergency, markets,
# restaurants (the host's own list), things to do, events, plus the quick tiles and the map. Arrival and parking live inside the house guide.
# Optional extra sections for other hosts (arrival, extras, essentials, kids, day trips) come later: add them back here and in onboarding SECTIONS.
SEC = [
    ('garbage', 'house', 'garbage', 'garbage', {'color': 'glass', 'mapLabelKey': 'glassChip'}, 'rubbish'),
    ('message', 'house', 'info', 'houseGuide', {}, 'houseguide'),
    ('emergency', 'house', 'contacts', 'emergency', {}, 'emergency'),
    ('markets', 'area', 'markets', 'markets', {}, 'markets'),
    ('restaurants', 'area', 'spots', 'barsRestaurants', {'color': 'restaurants'}, 'eat'),
    ('todo', 'area', 'spots', 'whatToDo', {'color': 'todo'}, 'todo'),
    ('events', 'area', 'events', 'events', {'color': 'events'}, 'events'),
]
sections, modules, research = [], {'house': False, 'quick': bool(quick) and on('quick'), 'map': on('map')}, []
for sid, grp, kind, label, extra, mod in SEC:
    want = on(mod, mod in ('houseguide', 'emergency', 'todo'))
    if sid == 'garbage': want = want and bool(rmode)   # only the host can tell us: no answer, no section
    if sid == 'restaurants': want = want and bool(fav)
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
for l in LANGS:
    o = {'appName': name, 'houseName': place, 'brandSub': area}
    if A.get('tagline'): o['welcome'] = L(A['tagline']).get(l, A['tagline'])
    (SITE / f'i18n/{l}.json').write_text(json.dumps(o, ensure_ascii=False, indent=2))

site = {
    '_doc': 'Generated by engine/scripts/generate-site.py from a Porta onboarding. Safe to edit by hand.',
    'slug': args.slug, 'name': name,
    'description': f'{name}, guest guide for {place}{", " + town if town else ""}: house guide, places nearby, map and directions.',
    'logo': 'logo-head.png', 'shareImage': 'house.jpg', 'languages': LANGS, 'storageKey': args.slug,
    'area': {'radiusKm': {'15 min': 15, '30 min': 30, '45 min': 45, '1 hour': 60}.get(A.get('radius'), 30)},
    'modules': modules,
    'theme': {'preset': preset, **({'fonts': KIT['fonts']} if KIT else {}), 'paper': palette['paper'], 'manifestBackground': palette['paper'], 'manifestTheme': a[0], 'darkMode': False},
    'previewImages': ['logo-head.png', 'favicon.png', 'house.jpg'],
    'onboarding': {'mood': A.get('mood'), 'styleKit': kit_id, 'imageStats': stats, 'palette': palette, 'presetChosen': preset}
}
(SITE / 'site.json').write_text(json.dumps(site, ensure_ascii=False, indent=2))

# What is left for research, with the host's own hints.
todo = [f'# Research to do for {name}', '', f'Area: {area} · radius {site["area"]["radiusKm"]} km · point {args.lat}, {args.lng}', '',
        'Fill each file in content/ (same shapes as sites/ca-la-kimberly/content), then set its section to "live" (re-running this script does it).', '']
hints = {'todo': 'favourites', 'essentials': 'essentials'}   # rubbish and restaurants are never researched
for sid in research:
    todo.append(f'- [ ] {sid}' + (f": host notes: {A.get(hints[sid], '')!r}" if hints.get(sid) and A.get(hints[sid]) else ''))
todo += ['', f'Interests: {", ".join(A.get("interests") or [])}', f'Guests: {", ".join(A.get("guests") or [])}',
         f'Avoid: {A.get("avoidPlaces") or "-"}', f'Extra ideas from the host: {A.get("moduleIdeas") or "-"}']
(SITE / 'docs/research-todo.md').write_text('\n'.join(todo) + '\n')
(SITE / 'docs/style-brief.md').write_text('\n'.join([f'# Style brief for {name}', '',
    'The host described the look in their own words. The generator picks the closest starting kit (fonts, radii, layout base) and the palette from their images;',
    'the design pass then writes this guide\'s own theme.css so it does not look like any other guide.', '',
    f'- In their words: {A.get("styleBrief") or "-"}', f'- Feel words: {", ".join(A.get("feelWords") or []) or "-"}', f'- Apps/sites they love: {A.get("refLinks") or "-"}',
    f'- How guests should find things: {A.get("navStyle") or "-"} · first on Home: {", ".join(A.get("homeFirst") or []) or "-"}',
    f'- To avoid: {A.get("lookAvoid") or "-"}', f'- Starting kit: {kit_id or "none (decide from images)"} · layout base: {preset}',
    f'- Palette from images: {json.dumps(palette)}', '', 'Design pass: write sites/<slug>/theme.css (tokens + component CSS on top of the preset), pick fonts in site.json theme.fonts, then check every page at 390 px.']) + '\n')
(SITE / 'docs/untranslated.json').write_text(json.dumps(sorted(untranslated), ensure_ascii=False, indent=1))
nf = SITE / 'netlify.toml'
if not nf.exists():
    nf.write_text(f'# Netlify: set "Base directory" to sites/{args.slug}.\n[build]\n  command = "cd ../.. && npm ci && npm run build -- {args.slug}"\n  publish = "dist"\n\n[[headers]]\n  for = "/sw.js"\n  [headers.values]\n    Cache-Control = "no-cache"\n')

print(json.dumps({'site': str(SITE.relative_to(ROOT)), 'preset': preset, 'palette': palette, 'imageStats': stats,
                  'languages': LANGS, 'sections': [(s['id'], s['status']) for s in sections], 'research': research,
                  'untranslated': len(untranslated), 'photos': {k: len(v) for k, v in room_photos.items()}}, indent=1))
