#!/usr/bin/env python3
# Spain's public transport stops for Getting around (metro, tram, bus; engine/src/modules/transport/README.md, "Public
# transport found"): which lines stop at each stop, in their colours, and how often, from the open timetable files we
# keep (GTFS) listed in onboarding-site/src/stops-feeds.json. Yohann, 16 Nov 2026: "This is meant to work for the whole of
# Spain"; open timetable files kept by us "every once in a while", never real time.
#   python3 onboarding-site/src/stops.py [--day YYYY-MM-DD] [--out <dir>]
# Its folder is served to the maker (build.py STOPS_BASE) and read by the generator (engine/scripts/stops-of.mjs). Which
# stops a house gets and the maker's search are engine/src/modules/transport/stops.js, not this script.
# Reads every folder of the cache (GTFS_CACHE, default ~/.cache/guest-guides/gtfs-es/) that holds a zip: straight from the zip,
# nothing extracted, never shapes.txt. It never downloads. A folder may hold a meta.json (the national access point's files:
# credited to its organisation, via: 'mitrams', so that the guide adds "Powered by MITRAMS" as the access point's licence
# asks); onboarding-site/src/stops-feeds.json gives a folder its own words, or skips it. Writes to
# --out (default ~/.cache/guest-guides/stops-es/): made by the server's monthly job and served from our storage, never
# committed (Yohann, 16 Nov 2026: "my computer should not be involved into the process at all"); by hand only for tests.
# Python's standard library only. The same files give the same bytes.
# The rules (the design, 16 Nov 2026), each applied below:
#   - per feed, the day counted is the first Tuesday on or after --day (default: the newest zip's date) inside its calendar,
#     its last Tuesday when the calendar has ended; no usable calendar: skipped;
#   - a line's kind from route_type (0, 900-906 tram; 1, 400-405 metro; 2, 100-117 rail; 3, 200-209, 700-716 bus; the rest
#     left out and counted); its public code t (the bracket that opens its long name, else its short name when it is 5
#     characters or fewer and the feed's short names are not internal codes: a feed whose bracketed lines mostly carry
#     another short name keeps its short names to itself); its name n; its colours when the feed gives them;
#   - how often (f, 1 to 4) a line calls at a stop that day, per original stop: 2-8: 1, 9-24: 2, 25-48: 3, more: 4; fewer
#     than 2 calls: not listed there;
#   - a stop: stops sharing a parent station are one; else same name within 150 m in one feed are one (their middle, each
#     line's highest f); its kind the highest of its lines' (metro, rail, tram, bus); no line left: dropped;
#   - written in cells of 0.25 degrees, so that a browser loads only what is near a house.
import csv, datetime, io, json, math, os, re, sys, unicodedata, zipfile
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get('GTFS_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'gtfs-es')
FEEDS = os.path.join(HERE, 'stops-feeds.json')
CELL = 0.25
SAME_KM = 0.15
KIND_ORDER = ['metro', 'rail', 'tram', 'bus']   # a stop's kind: the first of these its lines have
TUESDAY = 1

def clean(r): return {(k or '').strip(): (v or '').strip() for k, v in r.items()}
def spaces(s): return re.sub(r'\s+', ' ', str(s or '')).strip()

def kind_of(route_type):
    """A route_type as the guide's kind, or None (left out)."""
    try: t = int(route_type)
    except (TypeError, ValueError): return None
    if t == 0 or 900 <= t <= 906: return 'tram'
    if t == 1 or 400 <= t <= 405: return 'metro'
    if t == 2 or 100 <= t <= 117: return 'rail'
    if t == 3 or 200 <= t <= 209 or 700 <= t <= 716: return 'bus'
    return None

BRACKET = re.compile(r'^\(([^)]{1,12})\)\s*')
def bracket(long_name):
    m = BRACKET.match(long_name or ''); return m.group(1).strip() if m else ''

def internal_short(routes):
    """True when the feed's short names are its own internal codes: among its lines whose long name opens with a public
    code in brackets, most carry another short name ("L1629" for "(e1) ...")."""
    with_code = [r for r in routes if bracket(r.get('route_long_name'))]
    if not with_code: return False
    other = sum(1 for r in with_code if spaces(r.get('route_short_name')).lower() != bracket(r.get('route_long_name')).lower())
    return other * 2 > len(with_code)

def code_of(r, internal):
    b = bracket(r.get('route_long_name'))
    if b: return b
    s = spaces(r.get('route_short_name'))
    return s if s and len(s) <= 5 and not internal else ''

def name_of(r):
    return spaces(BRACKET.sub('', r.get('route_long_name') or '', count=1))

def lum(hex6):
    c = [int(hex6[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4 for v in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
HEX = re.compile(r'^[0-9a-fA-F]{6}$')
def colours(r):
    """{c, ink} from the feed's colours, or {} when it gives none. ink: dark text (the feed's text colour when given, else
    the luminance rule of pick.js / worker lumOf)."""
    c = (r.get('route_color') or '').strip().lstrip('#').upper()
    if not HEX.match(c): return {}
    tc = (r.get('route_text_color') or '').strip().lstrip('#').upper()   # some feeds write "000000" on "000000": the rule then
    return {'c': '#' + c, 'ink': (lum(tc) < .5) if HEX.match(tc) and tc != c else lum(c) > .45}

def freq(n):
    """How often a line calls at a stop in a day: a class, never a number, so the file does not lie after the next timetable."""
    return 0 if n < 2 else 1 if n <= 8 else 2 if n <= 24 else 3 if n <= 48 else 4

def km(a, b, c, d):
    p = math.pi / 180; return 6371 * math.hypot((d - b) * p * math.cos((a + c) / 2 * p), (c - a) * p)

def ref_day(start, cal, dates):
    """The first Tuesday on or after start (a date) inside the feed's calendar; a calendar that ended before start: its last
    Tuesday (the coordinator, 16 Nov 2026: such a feed is still read); no usable calendar: None."""
    days = lambda xs: [datetime.datetime.strptime(x, '%Y%m%d').date() for x in xs if re.match(r'^\d{8}$', x or '')]
    lo = days([r.get('start_date') for r in cal] + [r.get('date') for r in dates]); hi = days([r.get('end_date') for r in cal] + [r.get('date') for r in dates])
    if not lo or not hi: return None
    lo, hi = min(lo), max(hi)
    if hi < lo: return None
    if start > hi:   # ended: its last Tuesday
        d = hi
        while d.weekday() != TUESDAY: d -= datetime.timedelta(days=1)
        return d if d >= lo else None
    d = max(start, lo)
    while d.weekday() != TUESDAY: d += datetime.timedelta(days=1)
    return d if d <= hi else None

def services_on(cal, dates, day):
    ymd, wd = day.strftime('%Y%m%d'), ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')[day.weekday()]
    on = {r.get('service_id') for r in cal if r.get(wd) == '1' and (r.get('start_date') or '') <= ymd <= (r.get('end_date') or '')}
    for r in dates:
        if r.get('date') != ymd: continue
        if r.get('exception_type') == '1': on.add(r.get('service_id'))
        elif r.get('exception_type') == '2': on.discard(r.get('service_id'))
    return on

def member(z, name):
    """A GTFS file by its base name, wherever it sits in the zip (one feed keeps them in a folder); the shortest path first."""
    hits = sorted((n for n in z.namelist() if n.rsplit('/', 1)[-1].lower() == name), key=lambda n: (n.count('/'), n))
    return hits[0] if hits else None
def text(f): return io.TextIOWrapper(f, encoding='utf-8-sig', errors='replace', newline='')   # another encoding at times: never crash on a byte
def rows(z, name):
    m = member(z, name)
    if not m: return []
    with z.open(m) as f: return [clean(r) for r in csv.DictReader(text(f))]

class MissingFile(Exception): pass
def read_feed(path, start):
    """One zip: { stops, routes, trips, cal, dates, calls: (stop, route) -> count on the day, ends: route -> (first, last) of
    its longest trip, day, newest }. Never reads shapes.txt."""
    z = zipfile.ZipFile(path)
    if not member(z, 'trips.txt') or not member(z, 'stop_times.txt') or not member(z, 'routes.txt') or not member(z, 'stops.txt'): raise MissingFile('no trips, stop times, routes or stops in it')
    def stamp(i):   # a zip entry's date; some zips carry an impossible one (month 0)
        try: return datetime.date(*i.date_time[:3])
        except ValueError: return None
    newest = max([d for d in (stamp(i) for i in z.infolist()) if d] or [datetime.date(1980, 1, 1)])
    routes = {r['route_id']: r for r in rows(z, 'routes.txt') if r.get('route_id')}
    stops = {r['stop_id']: r for r in rows(z, 'stops.txt') if r.get('stop_id')}
    trips = {r['trip_id']: (r.get('route_id', ''), r.get('service_id', '')) for r in rows(z, 'trips.txt') if r.get('trip_id')}
    cal, dates = rows(z, 'calendar.txt'), rows(z, 'calendar_dates.txt')
    day = ref_day(start or newest, cal, dates)   # an ended calendar: its last Tuesday
    on = services_on(cal, dates, day) if day else set()
    calls, span = Counter(), {}
    with z.open(member(z, 'stop_times.txt')) as f:
        rd = csv.reader(text(f))
        head = [h.strip() for h in next(rd)]; ix = {h: i for i, h in enumerate(head)}
        it, ist, isq = ix['trip_id'], ix['stop_id'], ix['stop_sequence']
        ipu, ido = ix.get('pickup_type'), ix.get('drop_off_type')
        need = max(it, ist, isq)
        for r in rd:
            if len(r) <= need: continue   # a broken row
            tid = r[it].strip(); t = trips.get(tid)
            if not t: continue
            sid = r[ist].strip()
            try: q = int(r[isq])
            except ValueError: continue
            s = span.get(tid)
            if s is None: span[tid] = [q, sid, q, sid, 1]
            else:
                s[4] += 1
                if q < s[0]: s[0], s[1] = q, sid
                if q > s[2]: s[2], s[3] = q, sid
            if t[1] in on and not (ipu is not None and ido is not None and r[ipu].strip() == '1' and r[ido].strip() == '1'):
                calls[(sid, t[0])] += 1
    ends = {}
    for tid, s in sorted(span.items()):
        rid = trips[tid][0]
        if rid not in ends or s[4] > ends[rid][0]: ends[rid] = (s[4], s[1], s[3])
    return {'stops': stops, 'routes': routes, 'calls': calls, 'ends': ends, 'day': day, 'newest': newest}

def build_feed(fid, F, only_bus=False):
    """The stops of one feed: [{ id, n, k, lat, lng, lines }] (before cells), and counts for the summary. only_bus: the feed's
    meta.json says it carries only buses, so a line with no route_type is a bus."""
    routes, stops = F['routes'], F['stops']
    internal = internal_short(list(routes.values()))
    left_out = Counter()
    line = {}
    for rid, r in routes.items():
        k = kind_of(r.get('route_type')) or ('bus' if only_bus and not (r.get('route_type') or '').strip() else None)
        if not k: left_out[r.get('route_type')] += 1; continue
        n = name_of(r)
        if not n and rid in F['ends']:
            _, a, b = F['ends'][rid]
            n = ' - '.join(x for x in (spaces((stops.get(a) or {}).get('stop_name')), spaces((stops.get(b) or {}).get('stop_name'))) if x)
        line[rid] = {'k': k, 't': code_of(r, internal), 'n': n, **colours(r)}
    # Each original stop's lines that day (one direction), with their f.
    at = defaultdict(dict)
    for (sid, rid), cnt in F['calls'].items():
        f = freq(cnt)
        if f and rid in line: at[sid][rid] = max(f, at[sid].get(rid, 0))
    # Groups: the parent station; else the same name within 150 m.
    def pos(s):   # no usable position (none, not a number, 0 0, off the globe): the stop is dropped
        try: la, ln = float(s['stop_lat']), float(s['stop_lon'])
        except (KeyError, ValueError): return None
        return (la, ln) if (la or ln) and -90 <= la <= 90 and -180 <= ln <= 180 and math.isfinite(la) and math.isfinite(ln) else None
    groups, by_name = {}, defaultdict(list)
    for sid in sorted(at):
        s = stops.get(sid)
        if not s: continue
        p = (s.get('parent_station') or '').strip()
        if p and p in stops: key = ('p', p)
        else:
            here = pos(s)
            if not here: continue
            nm = spaces(s.get('stop_name')); key = None
            for g in by_name[nm]:
                if any(km(here[0], here[1], *pos(stops[m])) <= SAME_KM for m in groups[g]): key = g; break
            if key is None: key = ('n', nm, sid); by_name[nm].append(key)
        groups.setdefault(key, []).append(sid)
    out = []
    for key, members in groups.items():
        if key[0] == 'p':
            ps = stops[key[1]]; here = pos(ps); name = spaces(ps.get('stop_name'))
            if not here: continue
        else:
            pts = [pos(stops[m]) for m in members]; here = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)); name = key[1]
        merged = {}
        for m in members:
            for rid, f in at[m].items():
                L = line[rid]; k2 = (L['t'], L.get('c', ''), '' if L['t'] else L['n'])   # one line per public code and colour; with no code, per name
                cur = merged.get(k2)   # the highest f, and with it its name (the first in order when two are as frequent)
                if cur is None or (-f, L['n'], rid) < (-cur['f'], cur['n'], cur['_rid']): merged[k2] = {**L, 'f': f, '_rid': rid}
        lines = [{k: v for k, v in L.items() if k not in ('_rid', 'k') and not (k == 't' and not v)} for L in sorted(merged.values(), key=lambda L: (-L['f'], L['t'], L['n']))]
        if not lines: continue
        kinds = {L['k'] for L in merged.values()}
        out.append({'id': '%s:%s' % (fid, min(members)), 'n': name, 'k': next(k for k in KIND_ORDER if k in kinds),
                    'lat': round(here[0], 5), 'lng': round(here[1], 5), 'lines': lines})
    out.sort(key=lambda s: s['id'])
    return out, {'lines': len(line), 'left_out': dict(left_out)}

def cell_of(lat, lng): return '%d_%d' % (math.floor(lat / CELL), math.floor(lng / CELL))

def write(out_dir, sources, stops):
    os.makedirs(out_dir, exist_ok=True)
    cells = defaultdict(list)
    for s in stops: cells[cell_of(s['lat'], s['lng'])].append(s)
    for name in os.listdir(out_dir):   # a rerun removes cells that no longer exist
        if re.match(r'^-?\d+_-?\d+\.json$', name) and name[:-5] not in cells: os.remove(os.path.join(out_dir, name))
    sizes = {}
    for c, lst in sorted(cells.items()):
        lst.sort(key=lambda s: s['id'])
        body = '{"stops":[\n' + ',\n'.join(json.dumps(s, ensure_ascii=False, separators=(',', ':')) for s in lst) + '\n]}\n'
        with open(os.path.join(out_dir, c + '.json'), 'w', encoding='utf-8') as f: f.write(body)
        sizes[c] = len(body.encode('utf-8'))
    index = {'_doc': 'Spain\'s public transport stops for Getting around, written by onboarding-site/src/stops.py from the open timetable files of '
                     'the cache\'s folders (GTFS_CACHE; onboarding-site/src/stops-feeds.json overrides), made by the server\'s monthly job. cell: the size of a cell in degrees; a cell '
                     'file is <floor(lat/cell)>_<floor(lng/cell)>.json; cells: every cell written, with its number of stops. sources: each feed read, '
                     '{id, name, credit, licence, url, link (where guests find timetables), via (\'mitrams\': the national access point), updated (the date of its data), day (the Tuesday counted)}. '
                     'A cell: {stops: [{id (feed:smallest stop id), n (name as the file writes it), k (metro, rail, tram or bus), lat, lng, s (index '
                     'in sources), lines: [{t (public code, absent when none), n (name), c, ink (the feed\'s colour, absent when none), f (how often '
                     'that day: 1 a few, 2 about hourly, 3 about every half hour, 4 every 15 min or more often)}]}]}. Rules: '
                     'engine/src/modules/transport/README.md, "Public transport found". Which stops a house gets: engine/src/modules/transport/stops.js.',
             'cell': CELL, 'sources': sources, 'cells': {c: len(lst) for c, lst in sorted(cells.items())}}
    with open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8') as f: f.write(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    return sizes

NAP_LICENCE = 'Licencia de datos abiertos del Ministerio de Transportes y Movilidad Sostenible'
def feeds_in(cache, overrides):
    """Every folder of the cache that holds a zip, in name order: [{ id, name, credit, licence, url, link, path }] (path: its
    first zip by name). A folder with a meta.json (written by the downloader for the national access point's files) is
    credited as their terms ask; overrides (stops-feeds.json, by folder name) give a folder's own words, or skip it."""
    out, skipped = [], []
    for folder in sorted(os.listdir(cache)) if os.path.isdir(cache) else []:
        d = os.path.join(cache, folder)
        if not os.path.isdir(d): continue
        zips = sorted(n for n in os.listdir(d) if n.lower().endswith('.zip'))
        if not zips: continue
        o = overrides.get(folder) or {}
        if o.get('skip'): skipped.append(folder); print('skipped %s: left out in stops-feeds.json' % folder); continue
        fd = {'id': folder, 'name': folder, 'credit': folder, 'licence': '', 'url': '', 'link': ''}
        mp = os.path.join(d, 'meta.json')
        if os.path.exists(mp):
            try:
                with open(mp, encoding='utf-8') as f: m = json.load(f)
                org = spaces(m.get('org')) or folder
                tr = m.get('transport'); tr = tr if isinstance(tr, list) else [tr] if tr else []
                fd = {'id': 'nap-%s' % m['id'] if m.get('id') is not None else folder, 'updated': m.get('updated') if re.match(r'^\d{4}-\d\d-\d\d$', str(m.get('updated') or '')) else '', 'name': org, 'credit': org, 'via': 'mitrams', 'licence': NAP_LICENCE, 'url': m.get('page') or '', 'link': '',
                      'only_bus': bool(tr) and {re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', str(x)).encode('ascii', 'ignore').decode().lower()) for x in tr} == {'autobus'}}
            except (OSError, ValueError) as e: print('%s: its meta.json could not be read (%s)' % (folder, e))
        fd.update({k: v for k, v in o.items() if k in ('id', 'name', 'credit', 'licence', 'url', 'link')})
        fd.setdefault('only_bus', False); fd.setdefault('via', ''); fd['path'] = os.path.join(d, zips[0]); out.append(fd)
    return out, skipped

def main():
    out = os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'stops-es'); start = None
    a = sys.argv[1:]
    if '--out' in a: out = a[a.index('--out') + 1]
    if '--day' in a: start = datetime.datetime.strptime(a[a.index('--day') + 1], '%Y-%m-%d').date()
    with open(os.environ.get('STOPS_FEEDS') or FEEDS, encoding='utf-8') as f: overrides = json.load(f).get('folders') or {}
    feeds, skipped = feeds_in(CACHE, overrides)
    sources, stops, read, nlines, left = [], [], [], 0, Counter()
    for fd in feeds:
        path = fd['path']
        try: F = read_feed(path, start)
        except (zipfile.BadZipFile, MissingFile, KeyError, OSError, ValueError, csv.Error) as e: print('skipped %s: the file could not be read (%s)' % (fd['id'], str(e)[:120])); skipped.append(fd['id']); continue
        if not F['day']: print('skipped %s: no usable calendar' % fd['id']); skipped.append(fd['id']); continue
        lst, info = build_feed(fd['id'], F, fd.get('only_bus'))
        si = len(sources)
        sources.append({k: fd[k] for k in ('id', 'name', 'credit', 'licence', 'url', 'link')} | ({'via': fd['via']} if fd.get('via') else {}) | {'updated': fd.get('updated') or F['newest'].isoformat(), 'day': F['day'].isoformat()})   # the date of its data: the access point's own when it gives one, else the zip's
        for s in lst: s['s'] = si
        stops += [{k: s[k] for k in ('id', 'n', 'k', 'lat', 'lng', 's', 'lines')} for s in lst]
        nlines += info['lines']; left.update(info['left_out']); read.append(fd['id'])
        print('%s: %d stops, %d lines, day %s, data of %s%s' % (fd['id'], len(lst), info['lines'], F['day'], F['newest'], ', left out route types %s' % dict(info['left_out']) if info['left_out'] else ''))
    sizes = write(out, sources, stops)
    big = max(sizes.items(), key=lambda x: x[1]) if sizes else ('-', 0)
    total = sum(os.path.getsize(os.path.join(out, n)) for n in os.listdir(out))
    print('feeds read %d (%s), skipped %d%s; %d stops, %d lines, %d cells, biggest cell %s %.0f KB, folder %.1f MB' % (
        len(read), ', '.join(read), len(skipped), ' (' + ', '.join(skipped) + ')' if skipped else '', len(stops), nlines, len(sizes), big[0], big[1] / 1024, total / 1e6))

if __name__ == '__main__': main()
