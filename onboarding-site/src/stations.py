#!/usr/bin/env python3
# Spain's train stations for Getting around (engine/src/modules/transport/README.md): which lines stop at each station, in
# their colours, and its usual direct journey times to the main cities, from Renfe's two open timetable files (GTFS, CC BY
# 4.0, data.renfe.com: commercial reuse allowed; the credit "Origen de los datos: Renfe Operadora", the date of the data, the
# sense kept, no hint that Renfe supports us). Yohann, 16 Nov 2026: "it's not an app where we need to fetch real time every
# time. We can have a database that we store every once in a while."
#   python3 onboarding-site/src/stations.py [--out onboarding-site/stations-es.json]
# Run by hand when Renfe's files are renewed (not by build.py), and the file it writes is committed: the maker serves it as a
# static file (/stations-es.json), loaded once when the step Getting around opens; the generator reads it through
# engine/scripts/stations-of.mjs. Which stations a house gets is engine/src/modules/transport/pick.js, not this script.
# Reads the two zips from the cache (RENFE_CACHE, default ~/.cache/guest-guides/renfe/): fomento_transit.zip (suburban:
# Cercanias and Rodalies) and google_transit.zip (high speed, long and middle distance). It never downloads: without them it
# stops and says where to put them. The zips are read in place (each file streamed out of the zip, nothing unzipped, nothing
# written but the output). Python's standard library only. A rerun on the same files writes the same bytes.
# The rules (each said where it is applied below; the design, 16 Nov 2026, unless said otherwise):
#   - one reference day: the first Tuesday that lies inside both files' calendars, calendar.txt and calendar_dates.txt honoured;
#   - replacement buses (route_type 3) are not trains; a stop where the train neither picks up nor sets down is not a stop;
#   - one train, one count: the two files list some trains twice (R15 in one, "Regional" in the other): a train of the long
#     distance file that leaves a station and reaches another within 2 minutes of a suburban train is that suburban train;
#   - a station is kept with at least 4 trains that day; a line or a service is listed with at least 3 trains at the station
#     (one stray train a day is noise); suburban lines as the file names and colours them ("C" and the number, "R" and the
#     number; Rodalies' R2S and R2N as on their signs, "R2 Sud" and "R2 Nord"; Yohann, 16 Nov 2026: "Keep the color
#     coding"), then the long distance services by their names on tickets, coloured from engine/src/modules/transport/brands.json;
#   - hs: at least 4 high speed trains (AVE, AVLO, AVANT, AVANT EXP, AVE Euromed) stop;
#   - to: the direct trains to each city of CITIES that day, kept with 3 or more; min is the 4th fastest journey (a time several
#     trains a day really make), the slowest with fewer than 4. No journey with a change, no first or last train.
import csv, datetime, io, json, math, os, sys, zipfile
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.environ.get('RENFE_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'renfe')
FILES = (('fomento_transit.zip', True), ('google_transit.zip', False))   # (file, suburban)
BRANDS = os.path.join(ROOT, 'engine', 'src', 'modules', 'transport', 'brands.json')
HS = {'AVE', 'AVLO', 'AVANT', 'AVANT EXP', 'AVE Euromed'}
# The services of the long distance file by their names on tickets (Renfe's own spelling); a name not here is kept as written.
PRODUCTS = {'AVE': 'AVE', 'AVLO': 'Avlo', 'AVANT': 'Avant', 'AVANT EXP': 'Avant', 'AVE Euromed': 'Euromed', 'Euromed': 'Euromed',
            'ALVIA': 'Alvia', 'Alvia': 'Alvia', 'Intercity': 'Intercity', 'INTERCITY': 'Intercity', 'Regional': 'Regional',
            'REGIONAL': 'Regional', 'MD': 'MD', 'Media Distancia': 'MD', 'REG.EXP.': 'Regional', 'Regional Exprés': 'Regional'}
SIGN = {'R2S': 'R2 Sud', 'R2N': 'R2 Nord'}   # Rodalies' lines as their signs write them
SAME = 120               # seconds: two trains within 2 minutes at two stations are one train
MIN_TRAINS = 4           # a station with fewer trains that day is left out
MIN_LINE = 3             # a line, a service or a city needs this many trains a day
TUESDAY = 1

# Spain's main city stations, by hand: ids read in the files (16 Nov 2026), several ids when a city's trains arrive at more
# than one main station. main: the cities a house's "city" is chosen among (pick.js); the others (the provincial capitals with
# a station in the files) are destinations only. i18n: the city's name in the guide's languages where it differs.
CITIES = [
    ('barcelona', ['71801'], 'Barcelona Sants', True, {}),
    ('madrid', ['60000', '18000', '17000'], 'Madrid', True, {}),
    ('valencia', ['65000', '03216'], 'València', True, {'en': 'Valencia', 'es': 'Valencia', 'fr': 'Valence', 'de': 'Valencia', 'nl': 'Valencia'}),
    ('sevilla', ['51003'], 'Sevilla', True, {'en': 'Seville', 'fr': 'Séville'}),
    ('zaragoza', ['04040'], 'Zaragoza', True, {'fr': 'Saragosse', 'ca': 'Saragossa'}),
    ('malaga', ['54413', '54500'], 'Málaga', True, {'ca': 'Màlaga'}),
    ('bilbao', ['13200'], 'Bilbao', True, {}),
    ('alacant', ['60911'], 'Alicante', True, {'ca': 'Alacant'}),
    ('murcia', ['61200'], 'Murcia', True, {'ca': 'Múrcia'}),
    ('valladolid', ['10600'], 'Valladolid', True, {}),
    ('cordoba', ['50500'], 'Córdoba', True, {'fr': 'Cordoue', 'ca': 'Còrdova'}),
    ('acoruna', ['31412'], 'A Coruña', False, {'fr': 'La Corogne'}),
    ('albacete', ['60600'], 'Albacete', False, {}),
    ('almeria', ['56312'], 'Almería', False, {'ca': 'Almeria'}),
    ('avila', ['10400'], 'Ávila', False, {}),
    ('badajoz', ['37606'], 'Badajoz', False, {}),
    ('burgos', ['11014'], 'Burgos', False, {}),
    ('caceres', ['35400'], 'Cáceres', False, {}),
    ('cadiz', ['51405'], 'Cádiz', False, {'fr': 'Cadix'}),
    ('castello', ['65300'], 'Castelló de la Plana', False, {}),
    ('ciudadreal', ['37200'], 'Ciudad Real', False, {}),
    ('cuenca', ['03208'], 'Cuenca', False, {}),
    ('girona', ['79300'], 'Girona', False, {}),
    ('granada', ['05000'], 'Granada', False, {'fr': 'Grenade'}),
    ('guadalajara', ['70200', '04007'], 'Guadalajara', False, {}),
    ('huelva', ['43019'], 'Huelva', False, {}),
    ('huesca', ['74200'], 'Huesca', False, {'ca': 'Osca'}),
    ('jaen', ['03100'], 'Jaén', False, {}),
    ('leon', ['15100'], 'León', False, {'ca': 'Lleó'}),
    ('lleida', ['78400'], 'Lleida', False, {}),
    ('logrono', ['81100'], 'Logroño', False, {}),
    ('lugo', ['20309'], 'Lugo', False, {}),
    ('ourense', ['22100'], 'Ourense', False, {}),
    ('oviedo', ['15211'], 'Oviedo', False, {}),
    ('palencia', ['14100'], 'Palencia', False, {}),
    ('pamplona', ['80100'], 'Pamplona', False, {}),
    ('pontevedra', ['23004'], 'Pontevedra', False, {}),
    ('salamanca', ['30100'], 'Salamanca', False, {}),
    ('donostia', ['11511'], 'San Sebastián', False, {'fr': 'Saint-Sébastien', 'ca': 'Sant Sebastià'}),
    ('santander', ['14223'], 'Santander', False, {}),
    ('segovia', ['12100', '08004'], 'Segovia', False, {'fr': 'Ségovie'}),
    ('soria', ['82100'], 'Soria', False, {}),
    ('tarragona', ['71500'], 'Tarragona', False, {'fr': 'Tarragone'}),
    ('teruel', ['67200'], 'Teruel', False, {}),
    ('toledo', ['92102'], 'Toledo', False, {'fr': 'Tolède'}),
    ('vitoria', ['11208'], 'Vitoria-Gasteiz', False, {}),
    ('zamora', ['30200'], 'Zamora', False, {}),
]


# ---------- the pure rules (tested in onboarding-site/test/stations_test.py) ----------
def clean(r):
    """A row with the stray spaces of the headers and values taken off."""
    return {(k or '').strip(): (v or '').strip() for k, v in r.items()}

def secs(t):
    """'8:30:00' or '25:10:00' in seconds after the service day's start."""
    h, m, s = t.split(':'); return int(h) * 3600 + int(m) * 60 + int(s)

def ink(hex6):
    """Dark text on this colour reads better: the luminance rule of lumOf in worker/guide-worker.mjs (above 0.45)."""
    c = [int(hex6[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4 for v in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .45

def colour(x):
    x = (x or '').strip().lstrip('#')
    return '#' + x.upper() if len(x) == 6 and all(ch in '0123456789abcdefABCDEF' for ch in x) else None

def line_name(short):
    """A suburban line's name as its signs write it."""
    s = (short or '').strip(); return SIGN.get(s, s)

def product(short):
    """A long distance service's name as on tickets."""
    s = (short or '').strip(); return PRODUCTS.get(s, s)

def ref_day(ranges):
    """The first Tuesday inside every (first, last) date range given (YYYYMMDD strings): a datetime.date, or None."""
    lo, hi = max(r[0] for r in ranges), min(r[1] for r in ranges)
    d, end = datetime.datetime.strptime(lo, '%Y%m%d').date(), datetime.datetime.strptime(hi, '%Y%m%d').date()
    while d <= end:
        if d.weekday() == TUESDAY: return d
        d += datetime.timedelta(days=1)
    return None

def calendar_range(cal, dates):
    """The dates a feed covers: from calendar.txt, else from calendar_dates.txt."""
    if cal: return min(r['start_date'] for r in cal), max(r['end_date'] for r in cal)
    ds = [r['date'] for r in dates]; return (min(ds), max(ds)) if ds else None

def services_on(cal, dates, day):
    """The service ids that run on day (a date): calendar.txt's weekday and range, then calendar_dates.txt's exceptions."""
    ymd, wd = day.strftime('%Y%m%d'), ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')[day.weekday()]
    on = {r['service_id'] for r in cal if r.get(wd) == '1' and r['start_date'] <= ymd <= r['end_date']}
    for r in dates:
        if r['date'] != ymd: continue
        if r['exception_type'] == '1': on.add(r['service_id'])
        elif r['exception_type'] == '2': on.discard(r['service_id'])
    return on

def nth_fastest(mins, n=4):
    """A time several trains a day really make: the nth fastest, or the slowest with fewer than n."""
    m = sorted(mins); return m[n - 1] if len(m) >= n else m[-1]

def same_train(a, b):
    """Two trains (each {stop: (arr, dep)}) are one when they leave one station and reach another within SAME seconds."""
    shared = [s for s in a if s in b]
    for i, s in enumerate(shared):
        if abs(a[s][1] - b[s][1]) > SAME: continue
        for t in shared[i + 1:]:
            if abs(a[t][0] - b[t][0]) <= SAME: return True
    return False

def build(trains, stops, cities, brands, neutral):
    """The stations and their journeys from one day's trains.
    trains: [{ sub: bool, line: name, colour: '#RRGGBB' or None, calls: [(stop, arr, dep, up, down)] in order }]
    (sub: from the suburban file; line: the route's short name as the file writes it),
    stops: {id: (name, lat, lng)}, cities: CITIES, brands: {name: {c, ink}} for the long distance services, neutral: {c, ink}
    for a service with no brand and a line with no colour.
    Returns (stations sorted by id, cities as written)."""
    # One train, one count: a train already met (the suburban trains first, then the others in the files' order) is not
    # counted again where the two run together: a long distance train that is a suburban one (R15 and "Regional"), or a
    # train the long distance file lists twice under two trip ids.
    times = [{s: (a, d) for s, a, d, up, down in t['calls']} for t in trains]
    order = sorted(range(len(trains)), key=lambda i: (not trains[i]['sub'], i))
    at = defaultdict(lambda: defaultdict(list))   # stop -> minute -> trains already met
    dup = set()   # (train, stop): this train is one already met, at this stop
    for i in order:
        twins = set()
        for s, a, d, up, down in trains[i]['calls']:
            m = d // 60
            for mm in range(m - SAME // 60, m + SAME // 60 + 1):
                for j in at[s].get(mm, ()):
                    if j not in twins and abs(times[j][s][1] - d) <= SAME and same_train(times[i], times[j]): twins.add(j)
        for s, a, d, up, down in trains[i]['calls']:
            if any(s in times[j] and abs(times[j][s][1] - d) <= SAME for j in twins): dup.add((i, s))
            at[s][d // 60].append(i)
    # The trains at each station, by line.
    seen = defaultdict(list)   # stop -> [(train index, sub, line, colour)]
    for i, t in enumerate(trains):
        for s, a, d, up, down in t['calls']:
            if (up or down) and (i, s) not in dup: seen[s].append((i, t['sub'], t['line'], t['colour']))
    # Direct journeys to each city: boarding where the train picks up, to the first station of the city it sets down at.
    city_of = {i: c[0] for c in cities for i in c[1]}
    trips = defaultdict(list)   # (stop, city) -> [(leave, arrive, sub)]
    for i, t in enumerate(trains):
        calls = t['calls']
        for k, (s, a, d, up, down) in enumerate(calls):
            if not up or (i, s) in dup: continue
            done = {city_of.get(s)}
            for s2, a2, d2, up2, down2 in calls[k + 1:]:
                c = city_of.get(s2)
                if c is None or c in done: continue
                done.add(c)
                if down2: trips[(s, c)].append((d, a2, t['sub']))
    to = defaultdict(list)
    for (s, c), js in trips.items():
        kept = []
        for leave, arrive, sub in sorted(js, key=lambda j: (not j[2], j[0], j[1])):   # suburban first: its twin is dropped
            if not any(abs(leave - k[0]) <= SAME and abs(arrive - k[1]) <= SAME for k in kept): kept.append((leave, arrive, sub))
        if len(kept) >= MIN_LINE: to[s].append({'id': c, 'n': len(kept), 'min': round(nth_fastest([(k[1] - k[0]) / 60 for k in kept]))})
    out = []
    for s in sorted(seen):
        calls = seen[s]
        if s not in stops or len(calls) < MIN_TRAINS: continue
        sub, far = Counter(), Counter()
        cols = defaultdict(Counter)
        for i, is_sub, line, col in calls:
            if is_sub: sub[line_name(line)] += 1; cols[line_name(line)][col or ''] += 1
            else: far[product(line)] += 1
        lines = []
        for name, n in sorted(sub.items(), key=lambda x: (-x[1], x[0])):
            if n < MIN_LINE: continue
            c = sorted(cols[name].items(), key=lambda x: (-x[1], x[0]))[0][0]
            lines.append({'t': name, 'c': c, 'ink': ink(c)} if c else {'t': name, 'c': neutral['c'], 'ink': neutral['ink']})
        for name, n in sorted(far.items(), key=lambda x: (-x[1], x[0])):
            if n < MIN_LINE: continue
            b = brands.get(name) or neutral
            lines.append({'t': name, 'c': b['c'], 'ink': b['ink']})
        name, lat, lng = stops[s]
        row = {'id': s, 'name': name, 'lat': round(lat, 4), 'lng': round(lng, 4), 'lines': lines}
        if sum(1 for i, is_sub, line, col in calls if not is_sub and line in HS) >= MIN_TRAINS: row['hs'] = True
        row['to'] = sorted(to.get(s, []), key=lambda x: x['id'])
        out.append(row)
    cs = []
    for key, ids, name, main, names in cities:
        ids = [i for i in ids if i in stops]
        if not ids: continue
        c = {'id': key, 'ids': ids, 'name': name, 'lat': round(stops[ids[0]][1], 4), 'lng': round(stops[ids[0]][2], 4)}
        if main: c['main'] = True
        if names: c['i18n'] = names
        cs.append(c)
    return out, cs


# ---------- reading Renfe's files ----------
def rows(z, name):
    if name not in z.namelist(): return []
    with z.open(name) as f: return [clean(r) for r in csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig', newline=''))]

def feed(path, sub):
    """One zip: its stops, routes, trips, calendar, and the newest file date inside it."""
    z = zipfile.ZipFile(path)
    newest = max(datetime.date(*i.date_time[:3]) for i in z.infolist())
    stops = {}
    for r in rows(z, 'stops.txt'):
        try: stops[r['stop_id']] = (r['stop_name'], float(r['stop_lat']), float(r['stop_lon']))
        except (KeyError, ValueError): continue
    routes = {r['route_id']: (r.get('route_short_name', ''), colour(r.get('route_color')), r.get('route_type', '')) for r in rows(z, 'routes.txt')}
    trips = {r['trip_id']: (r['route_id'], r['service_id']) for r in rows(z, 'trips.txt')}
    return {'z': z, 'sub': sub, 'newest': newest, 'stops': stops, 'routes': routes, 'trips': trips,
            'cal': rows(z, 'calendar.txt'), 'dates': rows(z, 'calendar_dates.txt')}

def trains_of(f, day):
    """The day's trains of one feed (buses left out), streamed out of stop_times.txt."""
    on = services_on(f['cal'], f['dates'], day)
    keep = {}
    for tid, (rid, sid) in f['trips'].items():
        rt = f['routes'].get(rid)
        if sid in on and rt and rt[2] != '3': keep[tid] = rt
    calls = defaultdict(list)
    with f['z'].open('stop_times.txt') as fh:
        rd = csv.reader(io.TextIOWrapper(fh, encoding='utf-8-sig', newline=''))
        head = [h.strip() for h in next(rd)]
        ix = {h: i for i, h in enumerate(head)}
        it, ia, idp, ist, isq = ix['trip_id'], ix['arrival_time'], ix['departure_time'], ix['stop_id'], ix['stop_sequence']
        ipu, ido = ix.get('pickup_type'), ix.get('drop_off_type')
        for r in rd:
            tid = r[it].strip()
            if tid not in keep: continue
            up = ipu is None or r[ipu].strip() != '1'
            down = ido is None or r[ido].strip() != '1'
            calls[tid].append((int(r[isq]), r[ist].strip(), secs(r[ia].strip()), secs(r[idp].strip()), up, down))
    out = []
    for tid in sorted(calls):
        short, col, typ = keep[tid]
        cs = sorted(calls[tid])
        out.append({'sub': f['sub'], 'line': short.strip(), 'colour': col,
                    'calls': [(s, a, d, up, down) for q, s, a, d, up, down in cs]})
    return out

def main():
    out = os.path.join(HERE, '..', 'stations-es.json')
    if '--out' in sys.argv:
        i = sys.argv.index('--out')
        if i + 1 >= len(sys.argv): sys.exit('Use: stations.py [--out <file>]')
        out = sys.argv[i + 1]
    paths = [(os.path.join(CACHE, n), sub) for n, sub in FILES]
    for p, sub in paths:
        if not os.path.exists(p): sys.exit('No Renfe file at %s. Put Renfe\'s two GTFS zips (data.renfe.com) there, or set RENFE_CACHE.' % p)
    with open(BRANDS, encoding='utf-8') as f: bj = json.load(f)
    brands, neutral = {b['t']: b for b in bj['brands']}, bj['neutral']
    feeds = [feed(p, sub) for p, sub in paths]
    day = ref_day([calendar_range(f['cal'], f['dates']) for f in feeds])
    if not day: sys.exit('The two files share no Tuesday.')
    stops = {}
    for f in feeds:   # the suburban file's name first (it writes the suburban stations as their signs do), else the other's
        for k, v in f['stops'].items(): stops.setdefault(k, v)
    trains = [t for f in feeds for t in trains_of(f, day)]
    stations, cities = build(trains, stops, CITIES, brands, neutral)
    updated = max(f['newest'] for f in feeds).isoformat()
    doc = {'_doc': 'Spain\'s train stations for Getting around, written by onboarding-site/src/stations.py from Renfe\'s two open timetable files '
                   '(suburban; high speed, long and middle distance), run by hand when Renfe renews them (not by build.py). Credit: "Origen de los datos: '
                   'Renfe Operadora", with the date (source.updated), licence CC BY 4.0. source.day: the Tuesday the trains were counted on. '
                   'cities: [{id, ids (Renfe station ids), name, i18n (the name in a language where it differs), lat, lng, main (a house\'s city is '
                   'chosen among these)}]. stations (at least 4 trains that day): [{id (Renfe\'s), name (as Renfe writes it), lat, lng, '
                   'lines: [{t, c, ink}] (a guide\'s badges: suburban lines in the file\'s colours, then long distance services in the colours of '
                   'engine/src/modules/transport/brands.json; each with 3 or more trains a day), hs (true: 4 or more high speed trains a day), '
                   'to: [{id (a city), n (direct trains that day, for the picking rule only, never shown), min (the 4th fastest direct journey in '
                   'minutes, the slowest with fewer than 4)}] (cities with 3 or more direct trains)}]. Which stations a house gets: '
                   'engine/src/modules/transport/pick.js. Rules: engine/src/modules/transport/README.md.',
           'source': {'name': 'Renfe Operadora', 'licence': 'CC BY 4.0', 'url': 'https://data.renfe.com', 'updated': updated, 'day': day.isoformat()},
           'cities': cities, 'stations': stations}
    with open(out, 'w', encoding='utf-8') as f:
        f.write(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('%d stations (%d with high speed), %d cities, trains of %s, Renfe of %s, %.0f KB: %s' % (
        len(stations), sum(1 for s in stations if s.get('hs')), len(cities), day.isoformat(), updated, os.path.getsize(out) / 1024, os.path.relpath(out)), file=sys.stderr)

if __name__ == '__main__': main()
