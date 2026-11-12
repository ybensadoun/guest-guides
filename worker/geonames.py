#!/usr/bin/env python3
# GeoNames' places near a guide's pins, for a position, a town and a kind we may keep (worker/place-facts.mjs, the places
# work). Overture lists businesses, not towns, mountains, most beaches or some monuments; GeoNames does. Licence CC BY 4.0:
# commercial use allowed, the guide must credit GeoNames. One text file per country, no account, no key.
#   stdin:  {"country": "ES", "pins": [{"id", "lat", "lng", "names": ["..."]}]}
#   stdout: {"fetched": "YYYY-MM-DD", "pins": {"<id>": [candidates...]}}, and nothing else (progress goes to stderr)
# A candidate: a feature within 3 km of the pin that carries one of the pin's names (see same()), administrative areas
# aside, at most 8, nearest first: {"id", "name", "cls", "code", "pop", "lat", "lng", "metres"}.
# A second question, in the same call or alone: the municipality each point lies in (worker/place-facts.mjs municipalityAt,
# the area research's brief and the builder's town).
#   stdin:  {"country": "ES", "points": [{"id", "lat", "lng"}]}
#   stdout: {"fetched": ..., "places": {"<id>": {"town", "province", "seat", "near", "near_code", "metres", "by", "sea"?} or null}}
#   ("pins" too when pins were asked). From the nearest populated place (class P) within 10 km of the point: the
#   municipality is the ADM3 row with its admin codes (in Spain ADM3 is the municipi / municipio), province the ADM2
#   row's name without "Provincia de" and the like, seat the municipality's seat (its PPLA3, PPLA2, PPLA or PPLC row) when
#   the file gives one; near is that nearest place's own name (a hamlet or a housing estate such as "Can Gordei" is a P row
#   of its municipality), near_code its code, metres its distance from the point. by: "adm3", or "nearest" when its codes
#   name no ADM3 row: then the nearest P row with a population or a PPLA or PPLC code stands for the town. null: no P row
#   within 10 km. An inverted name ("Rosario, El") is turned round ("El Rosario"), or the seat's own spelling is used.
#   sea: the nearest beach to the point (class T, code BCH or BCHS; a beach whose name says river or reservoir, "Playa fluvial", aside),
#   {"km", "name"}: km by road as the guides estimate it (1.3 times the straight line, rounded, at least 1), only when it
#   is 60 km or less; else no "sea" at all. The builder ticks Beaches from it, the area research's brief names it.
# Python's standard library only (3.9 and later). The country's file is kept in GEONAMES_CACHE (default
# ~/.cache/guest-guides/geonames/, next to Overture's, outside the repo) and fetched again when 30 days old; offline, the
# old one is used. Downloaded data is only ever read as text, never run. The pins' names are never printed.
import datetime, json, math, os, re, sys, time, unicodedata, urllib.request, zipfile

CACHE = os.environ.get('GEONAMES_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'geonames')   # outside the repo: the Mac's copy is synced by Google Drive
URL = os.environ.get('GEONAMES_URL') or 'https://download.geonames.org/export/dump/'   # another base only for tests
MAX_DAYS, REACH_KM, MAX = 30, 3.0, 8
MUNI_KM, SEATS = 10.0, ('PPLA3', 'PPLA2', 'PPLA', 'PPLC')   # the municipality: from the nearest town or village within 10 km
GONE = set('PPLQ PPLW PPLH PPLCH'.split())   # abandoned, destroyed, historical: no one lives there now
BEACH, ROAD, SEA_KM = ('BCH', 'BCHS'), 1.3, 60   # the nearest beach: by road about 1.3 times the line, given up to 60 km
INLAND = re.compile(r'\b(fluvial|fluviale|embalse|embassament|pantano|panta)\b')   # "Playa fluvial ...", a reservoir's: not the sea ("Playa del Río" is a sea beach at a river mouth)
MAX_ZIP, MAX_TXT, DEADLINE = 400e6, 2e9, 240   # bytes, bytes, seconds: a stuck or odd download gives up before the worker's 5 minutes
CELL = 0.1                                     # degrees: pins sorted into cells, so each line is compared with the pins of its cell and the next ones
GENERIC = set('el la els les l d de del dels the of i y and a en al per platja playa beach plage strand'.split())

def say(*a): print(*a, file=sys.stderr, flush=True)
def fail(msg): say('geonames: ' + msg); sys.exit(1)

# The country's file, from the cache when fetched less than 30 days ago. Returns (path, date fetched).
def country_file(cc):
    txt, meta = os.path.join(CACHE, cc + '.txt'), os.path.join(CACHE, cc + '.json')
    old = None
    try:
        with open(meta) as f: old = datetime.date.fromisoformat(json.load(f)['fetched'])
        if not os.path.exists(txt): old = None
    except Exception: old = None
    if old and (datetime.date.today() - old).days < MAX_DAYS: return txt, old.isoformat()
    try: fetched = fetch(cc, txt, meta)
    except Exception as e:
        if old: say('geonames: could not fetch %s (%s), using the file of %s' % (cc, str(e).replace('\n', ' ')[:160], old.isoformat())); return txt, old.isoformat()
        fail('could not fetch %s: %s' % (cc, str(e).replace('\n', ' ')[:200]))
    return txt, fetched

# Downloaded to a .part file, then only the member <CC>.txt is read out of the zip (never extracted in full), renamed last.
def fetch(cc, txt, meta):
    zpart, tpart = os.path.join(CACHE, cc + '.zip.part'), txt + '.part'
    say('geonames: fetching %s' % cc); t0 = time.time(); n = 0
    try:
        with urllib.request.urlopen(URL + cc + '.zip', timeout=30) as r, open(zpart, 'wb') as out:
            while True:
                b = r.read(1 << 16)
                if not b: break
                n += len(b)
                if n > MAX_ZIP: raise RuntimeError('more than %d MB' % (MAX_ZIP / 1e6))
                if time.time() - t0 > DEADLINE: raise RuntimeError('took more than %d s' % DEADLINE)
                out.write(b)
        with zipfile.ZipFile(zpart) as z:
            info = z.getinfo(cc + '.txt')   # KeyError when the zip is not the country's
            if info.file_size > MAX_TXT: raise RuntimeError('its text file is too large')
            with z.open(info) as src, open(tpart, 'wb') as out:
                while True:
                    b = src.read(1 << 20)
                    if not b: break
                    out.write(b)
        os.replace(tpart, txt)
        today = datetime.date.today().isoformat()
        with open(meta, 'w') as f: json.dump({'fetched': today}, f)
    finally:
        for p in (zpart, tpart):
            try: os.remove(p)
            except OSError: pass
    say('geonames: %s, %.1f MB, %d s' % (cc, os.path.getsize(txt) / 1e6, time.time() - t0))
    return today

def km(a, b, c, d):
    p = math.pi / 180; return 6371 * math.hypot((d - b) * p * math.cos((a + c) / 2 * p), (c - a) * p)

# A name's words, without case, accents or punctuation, generic words aside ("Platja de Sant Salvador": sant salvador).
# The Catalan middle dot joins its letters (Cal·la is calla). A name of generic words only keeps them all.
def words(s):
    s = unicodedata.normalize('NFKD', str(s or '').replace('·', '').replace('‧', '')).encode('ascii', 'ignore').decode().lower()
    w = re.sub(r'[^a-z0-9]+', ' ', s).split()
    return [t for t in w if t not in GENERIC] or w

# A name that says it is a beach is never the village of the same name ("Platja de Sant Salvador" is not Sant Salvador,
# whose centre lies 700 m inland: seen on 10 Nov 2026). Such a name matches no feature of class P (towns and villages).
SPOT = set('platja playa beach plage strand'.split())
LODGING = set('HTL HSTL GHSE MOTL'.split())
def is_spot(s):
    return any(t in SPOT for t in re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()).split())

# The feature carries the pin's name: the same words, or every word of the pin's name with at most two more.
def same(want, got):
    if not want or not got: return False
    return want == got or (all(t in got for t in want) and len(got) <= len(want) + 2)

# A municipality's name as people write it: "Rosario, El" is "El Rosario", "Bisbal de Falset, La" is "La Bisbal de Falset".
ARTICLE = re.compile(r"^(.+), (El|La|Los|Las|Lo|Els|Les|Es|Sa|Ses|O|A|Os|As|L')$")
def turned(n):
    m = ARTICLE.match(n or '')
    return (m.group(2) + ('' if m.group(2).endswith("'") else ' ') + m.group(1)) if m else n
PROVINCE = re.compile(r"^(Provincia de |Província de |Provincia da |Province of |Provincia d'|Província d')")
def province(n): return PROVINCE.sub('', n) if n else None

# The municipality of each point, from what one pass over the file gathered: candidates (P rows within 10 km of the point,
# with their admin codes), the ADM3 and ADM2 names by codes, the seats by codes.
def municipality(cands, adm3, adm2, seats):
    if not cands: return None
    cands.sort(key=lambda x: (x['d'], x['id']))
    near = cands[0]
    row, by = near, 'adm3'
    if (near['a1'], near['a2'], near['a3']) not in adm3 or not near['a3']:
        by = 'nearest'
        row = next((x for x in cands if x['pop'] > 0 or x['code'] in SEATS), None)
        if not row: return None
    key = (row['a1'], row['a2'], row['a3'])
    seat = seats.get(key) if row['a3'] else None
    name = adm3.get(key) if row['a3'] else None
    town = (seat if seat and seat.lower() == turned(name or '').lower() else turned(name)) if name else row['name']
    return {'town': town, 'province': province(adm2.get((row['a1'], row['a2']))), 'seat': seat, 'near': near['name'],
            'near_code': near['code'], 'metres': round(near['d'] * 1000), 'by': by}

# The nearest beach as the answer gives it, or None: beyond 60 km by road, or none at all.
def sea_of(b):
    if not b: return None
    k = max(1, int(b[0] * ROAD + 0.5))   # rounded as the guides' code rounds (Math.round), at least 1
    return {'km': k, 'name': b[1]} if k <= SEA_KM else None

def main():
    try:
        q = json.load(sys.stdin); cc = str(q.get('country') or '')
        pins = [{'id': str(p['id']), 'lat': float(p['lat']), 'lng': float(p['lng']), 'names': [str(n) for n in (p.get('names') or []) if n]}
                for p in q.get('pins') or [] if p.get('lat') is not None and p.get('lng') is not None]
        asked = 'points' in q
        points = [{'id': str(p['id']), 'lat': float(p['lat']), 'lng': float(p['lng'])}
                  for p in q.get('points') or [] if p.get('lat') is not None and p.get('lng') is not None]
    except Exception as e: fail('the question on stdin is not as expected (%s)' % type(e).__name__)
    if not re.match(r'^[A-Z]{2}\Z', cc): fail('the country must be two capital letters')
    res = {p['id']: [] for p in pins}
    named = [dict(p, want=[(w, is_spot(n)) for n in p['names'] for w in [words(n)] if w]) for p in pins]
    named = [p for p in named if p['want']]   # a pin with no names gets none
    places = {p['id']: None for p in points}
    def answer(fetched):
        out = {'fetched': fetched, 'pins': res} if 'pins' in q or not asked else {'fetched': fetched}
        if asked: out['places'] = places
        sys.stdout.write(json.dumps(out, ensure_ascii=False)); sys.stdout.flush()
    if not named and not points:   # nothing to look for: no download either
        return answer(None)
    os.makedirs(CACHE, exist_ok=True)
    path, fetched = country_file(cc)
    cells = {}
    for p in named: cells.setdefault((math.floor(p['lat'] / CELL), math.floor(p['lng'] / CELL)), []).append(p)
    pcells = {}   # the points' cells: 10 km reaches two cells of 0.1 degree on either side, east and west, in Spain
    for p in points: pcells.setdefault((math.floor(p['lat'] / CELL), math.floor(p['lng'] / CELL)), []).append(p)
    pc = {p['id']: [] for p in points}; adm3, adm2, seats = {}, {}, {}
    beach = {p['id']: None for p in points}   # the nearest beach to each point: (km in a straight line, name, id)
    found = {p['id']: [] for p in named}; t0 = time.time(); lines = 0
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            lines += 1
            c = line.rstrip('\n').split('\t')
            if len(c) < 15: continue
            if points:   # the municipality question: the admin areas' names, the seats, the towns and villages near a point
                if c[6] == 'A' and c[7] == 'ADM3': adm3[(c[10], c[11], c[12])] = c[1]
                elif c[6] == 'A' and c[7] == 'ADM2': adm2[(c[10], c[11])] = c[1]
                elif c[6] == 'T' and c[7] in BEACH and not INLAND.search(' '.join(words(c[1]))):   # about 1,300 in Spain: every point is measured
                    try: lat, lng = float(c[4]), float(c[5])
                    except ValueError: lat = None
                    if lat is not None:
                        for p in points:
                            d = km(p['lat'], p['lng'], lat, lng); b = beach[p['id']]
                            if b is None or (d, c[0]) < (b[0], b[2]): beach[p['id']] = (d, c[1], c[0])
                elif c[6] == 'P' and c[7] not in GONE:
                    if c[7] in SEATS and c[12]:
                        k = (c[10], c[11], c[12])
                        if k not in seats or SEATS.index(c[7]) < SEATS.index(seats[k][1]): seats[k] = (c[1], c[7])
                    try: lat, lng = float(c[4]), float(c[5])
                    except ValueError: lat = None
                    if lat is not None:
                        y, x = math.floor(lat / CELL), math.floor(lng / CELL)
                        for dy in (-2, -1, 0, 1, 2):
                            for dx in (-2, -1, 0, 1, 2):
                                for p in pcells.get((y + dy, x + dx), ()):
                                    d = km(p['lat'], p['lng'], lat, lng)
                                    if d <= MUNI_KM:
                                        try: pop = int(c[14] or 0)
                                        except ValueError: pop = 0
                                        pc[p['id']].append({'d': d, 'id': c[0], 'name': c[1], 'code': c[7], 'pop': pop, 'a1': c[10], 'a2': c[11], 'a3': c[12]})
            if not named or c[6] == 'A' or not c[6]: continue   # administrative areas: a town's boundary, not a place to go
            if c[7] in LODGING: continue   # a hotel carries its town's name ("Hotel Ciutat de Tarragona") and is never what a host means by it
            try: lat, lng = float(c[4]), float(c[5])
            except ValueError: continue
            y, x = math.floor(lat / CELL), math.floor(lng / CELL)
            near = [p for dy in (-1, 0, 1) for dx in (-1, 0, 1) for p in cells.get((y + dy, x + dx), ())]
            if not near: continue
            near = [(p, km(p['lat'], p['lng'], lat, lng)) for p in near]
            near = [(p, d) for p, d in near if d <= REACH_KM]
            if not near: continue
            names = [c[1], c[2]] + [a for a in c[3].split(',') if a]
            own = [w for w in (words(n) for n in names) if w]
            for p, d in near:
                hit = [w == g for w, spot in p['want'] for g in own if same(w, g) and not (spot and c[6] == 'P')]
                if hit and all(x['id'] != c[0] for x in found[p['id']]):   # one pin sent twice: each feature once
                    try: pop = int(c[14] or 0)
                    except ValueError: pop = 0
                    found[p['id']].append({'id': c[0], 'name': c[1], 'cls': c[6], 'code': c[7], 'pop': pop,
                                           'lat': round(lat, 6), 'lng': round(lng, 6), 'metres': round(d * 1000), 'exact': any(hit)})
    for pid, lst in found.items():
        lst.sort(key=lambda x: (not x['exact'], x['metres'], x['id'])); res[pid] = lst[:MAX]   # the very name first ("Sitges" before "Parrots Sitges Hotel"), then the nearest
    seat_names = {k: v[0] for k, v in seats.items()}
    for p in points:
        m = municipality(pc[p['id']], adm3, adm2, seat_names); s = sea_of(beach[p['id']])
        if m and s: m['sea'] = s
        places[p['id']] = m
    say('geonames: %s of %s, %d lines, %d of %d pins with a feature%s, %.1f s' % (cc, fetched, lines, sum(1 for v in res.values() if v), len(pins),
        ', %d of %d points in a municipality' % (sum(1 for v in places.values() if v), len(points)) if points else '', time.time() - t0))
    answer(fetched)

if __name__ == '__main__': main()
