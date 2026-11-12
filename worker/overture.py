#!/usr/bin/env python3
# Overture Maps "places" near a guide's pins, for a place's facts (worker/place-facts.mjs, the places work step 1 in
# docs/plan-ca-la-kimberly-through-the-maker.md). Open data we may keep (CDLA Permissive 2.0, Apache 2.0): phone,
# website, social links, kind. Google only gives the pin; this finds the records that may be the same place.
#   stdin:  {"house": {"lat", "lng"}, "km": 60, "pins": [{"id", "lat", "lng", "names": ["..."]}]}
#   stdout: {"release": "...", "pins": {"<id>": [candidates...]}, "towns": {"<id>": "El Vendrell"}, "looked": ["<id>", ...]}, and nothing
#   else (progress goes to stderr). looked: the pins whose records were read (a pin far from the house past the first FAR_PINS
#   is not: its empty list says nothing about the place, worker/check-guides.mjs must know).
# towns: the town around each pin, from the records' own addresses (a place's town when its record is not found; never
# from Google's address, which its terms do not let us keep). A pin with no town clear enough is left out.
# Needs pyarrow and overturemaps==2.1.0 (that package wants Python 3.11+). On the Mac:
#   uv run -q --no-project --with overturemaps==2.1.0 --with pyarrow python worker/overture.py < pins.json
# The box around the house is fetched once per Overture release and kept in OVERTURE_CACHE (default ~/.cache/guest-guides/overture/).
# Downloaded data is only ever read with pyarrow, never run.
import contextlib, glob, json, math, os, re, sys, time, unicodedata

CACHE = os.environ.get('OVERTURE_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'overture')   # outside the repo: the Mac's copy is synced by Google Drive
COLS = ['id', 'bbox', 'names', 'basic_category', 'operating_status', 'confidence', 'websites', 'phones', 'socials', 'addresses']
NEAR_KM, NAMED, ANY_KM, ANY_MAX, MAX, NAMELESS_MAX = 0.15, 5, 0.06, 4, 9, 12   # as measured on 10 Nov 2026 (pick.py in the session's scratch)
FAR_PINS, FAR_PAD = 6, 0.01                                 # pins outside the house's box: a small box each, at most 6
TOWN_KM, TOWN_MIN, TOWN_FAR_KM, TOWN_FAR_N = 0.4, 3, 2.0, 15   # the town around a pin: most records within 400 m (at least 3), else the 15 nearest within 2 km

def say(*a): print(*a, file=sys.stderr, flush=True)
def fail(msg): say('overture: ' + msg); sys.exit(1)

# Overture's latest release, asked at most once a day (remembered in the cache folder). Offline, the last one known.
def release():
    path = os.path.join(CACHE, 'release.json'); old = None
    try:
        with open(path) as f: old = json.load(f)
        if time.time() - old['checked'] < 86400: return old['release']
    except Exception: old = None
    try:
        from overturemaps.core import get_latest_release
        with contextlib.redirect_stdout(sys.stderr): rel = get_latest_release()
        if not rel or not re.match(r'^\d{4}-\d{2}-\d{2}\.\d+$', rel): raise RuntimeError('unexpected release name %r' % rel)
    except Exception as e:
        if old and old.get('release'): say('overture: could not ask for the latest release (%s), using %s' % (str(e)[:120], old['release'])); return old['release']
        fail('could not ask for the latest release: %s' % str(e)[:200])
    with open(path, 'w') as f: json.dump({'release': rel, 'checked': time.time()}, f)
    return rel

# A box rounded outward (to 0.1 degree for the house, so nearby houses share one file).
def box(lat, lng, dlat, dlng, step):
    lo = lambda x: math.floor(x / step + 1e-9) * step
    hi = lambda x: math.ceil(x / step - 1e-9) * step
    return (round(lo(lng - dlng), 2), round(lo(lat - dlat), 2), round(hi(lng + dlng), 2), round(hi(lat + dlat), 2))

# The places of one box for one release, from the cache or from Overture's public bucket (no key, no cost).
def fetch(b, rel):
    name = '_'.join('%g' % v for v in b)
    path = os.path.join(CACHE, 'places-%s-%s.parquet' % (rel, name))
    if os.path.exists(path): return path
    import pyarrow.parquet as pq
    try: import overturemaps
    except Exception as e: fail('the overturemaps package is missing (%s)' % str(e)[:120])
    say('overture: fetching places %s, release %s' % (name, rel)); t0 = time.time(); tmp = path + '.part'; n = 0
    try:
        with contextlib.redirect_stdout(sys.stderr):   # the package prints its own errors on stdout, which is our answer
            reader = overturemaps.record_batch_reader('place', bbox=b, release=rel, connect_timeout=20, request_timeout=120)
            if reader is None: raise RuntimeError('no data came back')
            with pq.ParquetWriter(tmp, reader.schema) as w:
                for batch in reader:
                    if batch.num_rows: w.write_batch(batch); n += batch.num_rows
        os.replace(tmp, path)
    except Exception as e:
        with contextlib.suppress(OSError): os.remove(tmp)
        fail('could not fetch places %s: %s' % (name, str(e).replace('\n', ' ')[:200]))
    say('overture: %d places, %.1f MB, %d s' % (n, os.path.getsize(path) / 1e6, time.time() - t0))
    for old in glob.glob(os.path.join(CACHE, 'places-*-%s.parquet' % name)):   # older releases of the same box
        if old != path:
            with contextlib.suppress(OSError): os.remove(old)
    return path

def km(a, b, c, d):
    p = math.pi / 180; return 6371 * math.hypot((d - b) * p * math.cos((a + c) / 2 * p), (c - a) * p)

def read(path):
    import pyarrow.parquet as pq
    return pq.read_table(path, columns=COLS)

# Only the rows near one of the pins (dy degrees: about 300 m by default), filtered in pyarrow before they become Python objects.
def rows_near(t, pins, dy=0.003, cols=None):
    import pyarrow.compute as pc
    if not pins or not t.num_rows: return []
    x, y, mask = pc.struct_field(t['bbox'], 'xmin'), pc.struct_field(t['bbox'], 'ymin'), None
    for p in pins:
        dx = dy / max(0.2, math.cos(p['lat'] * math.pi / 180))
        m = pc.and_(pc.and_(pc.greater_equal(x, p['lng'] - dx), pc.less_equal(x, p['lng'] + dx)), pc.and_(pc.greater_equal(y, p['lat'] - dy), pc.less_equal(y, p['lat'] + dy)))
        mask = m if mask is None else pc.or_(mask, m)
    t = t.filter(mask)
    return (t.select(cols) if cols else t).to_pylist()

# The town around a pin, from the localities of Overture's records: the one most records within 400 m carry, when at
# least 3 carry it (a lone record may be filed under the next town); else the most common among the 15 nearest within
# 2 km (a beach or a spot outside a village); else none. Ties go to the nearer record.
def town_of(p, rows):
    near = []
    for r in rows:
        b = r.get('bbox') or {}; a = (r.get('addresses') or [None])[0] or {}; town = (a.get('locality') or '').strip()
        if not town or b.get('ymin') is None or b.get('xmin') is None: continue
        d = km(p['lat'], p['lng'], b['ymin'], b['xmin'])
        if d <= TOWN_FAR_KM: near.append((d, town))
    near.sort()
    def most(lst):
        n = {}
        for d, t in lst: n[t] = n.get(t, 0) + 1
        return max(n, key=lambda t: (n[t], -next(d for d, u in lst if u == t))) if n else None, n
    best, n = most([x for x in near if x[0] <= TOWN_KM])
    if best and n[best] >= TOWN_MIN: return best
    best, n = most(near[:TOWN_FAR_N])
    return best

# How well a record's name carries the host's name (0 to 1), as in the prototype: common words ("restaurant", "beach",
# "museum", articles) do not count, a long word may be the start of another one.
STOP = set('el la els les l d de del dels the of i y and restaurant restaurante bar museu museum museo fundacio platja playa beach monestir monasterio monastery reial santa maria'.split())
def norm(s): return re.sub(r'[^a-z0-9 ]+', ' ', unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower().replace("'", ' ')).split()
def score(want, got):
    w = [t for t in norm(want) if t not in STOP] or norm(want); g = [t for t in norm(got) if t not in STOP] or norm(got)
    if not w or not g: return 0
    hit = sum(1 for t in w if t in g or any(len(t) > 4 and len(u) > 4 and (t.startswith(u) or u.startswith(t)) for u in g) or any(t in u and len(t) > 5 for u in g))
    return hit / len(w) * (0.6 + 0.4 * min(1, len(w) / len(g)))

# The records within 150 m: the 5 best by name, then the nearest within 60 m whatever their name (the same place can be
# named quite differently: the spa, the railway museum), at most 9.
def candidates(p, rows):
    cand = []
    for r in rows:
        b = r.get('bbox') or {}
        if b.get('ymin') is None or b.get('xmin') is None: continue
        d = km(p['lat'], p['lng'], b['ymin'], b['xmin'])
        if d > NEAR_KM: continue
        nm = (r.get('names') or {}).get('primary') or ''
        cand.append((max([score(w, nm) for w in p['names']] or [0]), r.get('confidence') or 0, d, r))
    cand.sort(key=lambda c: (-c[0], -c[1], c[2]))
    keep = [c for c in cand if c[0] >= 0.3][:NAMED]
    # A pin with no name (a card the host kept in the swipe deck: only its Google id is ours): the nearest ones, further out,
    # since a large site's record can sit 80 m from its pin.
    nameless = not [w for w in p['names'] if w]
    for c in sorted(cand, key=lambda c: c[2]):
        if nameless:
            if len(keep) >= NAMELESS_MAX: break
            keep.append(c); continue
        if len(keep) >= MAX or c[2] > ANY_KM: break
        if all(c[3]['id'] != k[3]['id'] for k in keep) and sum(1 for k in keep if k[0] < 0.3) < ANY_MAX: keep.append(c)
    out = []
    for s, conf, d, r in keep:
        a = (r.get('addresses') or [None])[0] or {}
        out.append({'id': r['id'], 'name': (r.get('names') or {}).get('primary'), 'kind': r.get('basic_category'), 'status': r.get('operating_status'),
                    'confidence': round(conf, 2), 'metres': round(d * 1000), 'lat': round(r['bbox']['ymin'], 6), 'lng': round(r['bbox']['xmin'], 6),
                    'websites': r.get('websites') or [], 'phones': r.get('phones') or [], 'socials': r.get('socials') or [], 'town': a.get('locality') or None})
    return out

def main():
    try:
        q = json.load(sys.stdin); h = q['house']; hlat, hlng = float(h['lat']), float(h['lng']); reach = float(q.get('km') or 60)
        pins = [{'id': str(p['id']), 'lat': float(p['lat']), 'lng': float(p['lng']), 'names': [str(n) for n in (p.get('names') or []) if n]}
                for p in q.get('pins') or [] if p.get('lat') is not None and p.get('lng') is not None]
    except Exception as e: fail('the question on stdin is not as expected (%s)' % str(e)[:120])
    os.makedirs(CACHE, exist_ok=True)
    rel = release()
    dlat = reach / 111.32; dlng = reach / (111.32 * max(0.2, math.cos(hlat * math.pi / 180)))
    main_box = box(hlat, hlng, dlat, dlng, 0.1)
    inside = [p for p in pins if main_box[0] <= p['lng'] <= main_box[2] and main_box[1] <= p['lat'] <= main_box[3]]
    outside = [p for p in pins if p not in inside]
    res, towns = {p['id']: [] for p in pins}, {}
    def look(t, group):
        rows, wide = rows_near(t, group), rows_near(t, group, dy=TOWN_FAR_KM / 111.32, cols=['bbox', 'addresses'])
        for p in group:
            res[p['id']] = candidates(p, rows)
            town = town_of(p, wide)
            if town: towns[p['id']] = town
    if inside: look(read(fetch(main_box, rel)), inside)
    if len(outside) > FAR_PINS: say('overture: %d pins outside the box around the house, only the first %d looked up' % (len(outside), FAR_PINS))
    for p in outside[:FAR_PINS]: look(read(fetch(box(p['lat'], p['lng'], FAR_PAD, FAR_PAD, 0.01), rel)), [p])   # its small box: the 2 km for its town are cut at about 1 km
    looked = [p['id'] for p in inside] + [p['id'] for p in outside[:FAR_PINS]]
    sys.stdout.write(json.dumps({'release': rel, 'pins': res, 'towns': towns, 'looked': looked}, ensure_ascii=False)); sys.stdout.flush()

if __name__ == '__main__': main()
