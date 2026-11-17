# The rules of onboarding-site/src/stops.py on small made-up feeds written here (zips in a temporary folder; nothing
# downloaded, the real cache never read).
#   python3 -m unittest discover -s onboarding-site/test -p 'stops_test.py'
import datetime, io, json, os, sys, tempfile, unittest, zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
import stops as S

def slurp(p, mode='rb'):
    with open(p, mode) as f: return f.read()

def csv_text(rows): return '\n'.join(','.join('"%s"' % str(v).replace('"', '""') for v in r) for r in rows) + '\n'

def make_zip(path, routes, stops, trips, times, cal=None, dates=None, shapes=False):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('routes.txt', csv_text([['route_id', 'route_short_name', 'route_long_name', 'route_type', 'route_color', 'route_text_color']] + routes))
        z.writestr('stops.txt', csv_text([['stop_id', 'stop_name', 'stop_lat', 'stop_lon', 'location_type', 'parent_station']] + stops))
        z.writestr('trips.txt', csv_text([['route_id', 'service_id', 'trip_id']] + trips))
        z.writestr('stop_times.txt', csv_text([['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'pickup_type', 'drop_off_type']] + times))
        z.writestr('calendar.txt', csv_text([['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date']] + (cal or [['wk', 1, 1, 1, 1, 1, 0, 0, '20261101', '20261231']])))
        if dates is not None: z.writestr('calendar_dates.txt', csv_text([['service_id', 'date', 'exception_type']] + dates))
        if shapes: z.writestr('shapes.txt', 'this file must never be read\n')

def trips_of(route, n, stops, service='wk', first=0):
    """n trips of a route calling at the given stops, in order."""
    T, X = [], []
    for i in range(n):
        tid = '%s-%d' % (route, first + i); T.append([route, service, tid])
        for q, s in enumerate(stops): X.append([tid, '08:%02d:00' % q, '08:%02d:00' % q, s, q, 0, 0])
    return T, X


class Pure(unittest.TestCase):
    def test_kinds(self):
        self.assertEqual([S.kind_of(x) for x in ('0', '900', '1', '401', '2', '109', '3', '204', '715', '4', '1200', '')], ['tram', 'tram', 'metro', 'metro', 'rail', 'rail', 'bus', 'bus', 'bus', None, None, None])

    def test_code_two_shapes(self):
        cat = [{'route_short_name': 'L1629', 'route_long_name': '(e1) El Vendrell - Tarragona'}, {'route_short_name': 'L1630', 'route_long_name': '(e2) A - B'}, {'route_short_name': 'L1700', 'route_long_name': 'El Vendrell - Vilanova'}]
        self.assertTrue(S.internal_short(cat))
        self.assertEqual([S.code_of(r, True) for r in cat], ['e1', 'e2', ''])
        self.assertEqual(S.name_of(cat[0]), 'El Vendrell - Tarragona')
        metro = [{'route_short_name': 'L1', 'route_long_name': 'Hospital de Bellvitge - Fondo'}, {'route_short_name': 'L10 Sud', 'route_long_name': 'Collblanc - ZAL'}]
        self.assertFalse(S.internal_short(metro))
        self.assertEqual([S.code_of(r, False) for r in metro], ['L1', ''])   # "L10 Sud": more than 5 characters

    def test_colours_and_freq(self):
        self.assertEqual(S.colours({'route_color': 'e2001a', 'route_text_color': 'FFFFFF'}), {'c': '#E2001A', 'ink': False})
        self.assertEqual(S.colours({'route_color': 'FFDD00'}), {'c': '#FFDD00', 'ink': True})
        self.assertEqual(S.colours({'route_color': ''}), {})
        self.assertEqual([S.freq(n) for n in (1, 2, 8, 9, 24, 25, 48, 49)], [0, 1, 1, 2, 2, 3, 3, 4])

    def test_ref_day(self):
        cal = [{'start_date': '20261101', 'end_date': '20261231'}]
        self.assertEqual(S.ref_day(datetime.date(2026, 10, 30), cal, []), datetime.date(2026, 11, 3))
        self.assertEqual(S.ref_day(datetime.date(2026, 11, 3), cal, []), datetime.date(2026, 11, 3))
        self.assertEqual(S.ref_day(datetime.date(2027, 1, 15), cal, []), datetime.date(2026, 12, 29))   # ended: its last Tuesday
        self.assertIsNone(S.ref_day(datetime.date(2026, 11, 3), [], []))                              # no usable calendar


class Build(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        T1, X1 = trips_of('r1', 10, ['a1', 'b'])          # line e1 at a1: 10 calls -> f 2
        T2, X2 = trips_of('r2', 3, ['a2', 'b'])           # line X at a2 (same name, 50 m away): 3 calls -> f 1
        T3, X3 = trips_of('r3', 1, ['c', 'b'])            # one call at c: not listed, c dropped
        T4, X4 = trips_of('m1', 60, ['p1', 'p2'])         # a metro line at two platforms of one station
        T5, X5 = trips_of('r5', 4, ['d', 'e'], service='we')   # weekends only: nothing on a Tuesday
        T6, X6 = trips_of('r6', 5, ['f1', 'f2'])          # no long name: named after its longest trip
        X1[0][5], X1[0][6] = 1, 1                          # one call that neither picks up nor sets down
        self.zip = os.path.join(self.dir, 'feed.zip')
        make_zip(self.zip,
                 routes=[['r1', 'L1629', '(e1)  El Vendrell -  Tarragona', 3, '', ''], ['r2', 'L1630', 'Somewhere - Else', 3, '', ''], ['r3', 'L1631', '(e3) X', 3, '', ''],
                         ['m1', 'L1631', '(L1) Fondo - Bellvitge', 1, 'E2001A', 'FFFFFF'], ['r5', 'L1640', '(w) Weekend', 3, '', ''], ['r6', 'L1650', '', 3, '', ''], ['x', 'F', 'A ferry', 4, '', '']],
                 stops=[['a1', 'Main Square', '41.00000', '1.00000', 0, ''], ['a2', 'Main  Square', '41.00045', '1.00000', 0, ''], ['b', 'Far Stop', '41.10000', '1.10000', 0, ''],
                        ['c', 'Lonely', '41.20000', '1.20000', 0, ''], ['P', 'Metro Station', '41.30000', '1.30000', 1, ''], ['p1', 'Platform 1', '41.30010', '1.30000', 0, 'P'],
                        ['p2', 'Platform 2', '41.40000', '1.40000', 0, ''], ['d', 'Weekend', '41.5', '1.5', 0, ''], ['e', 'Weekend 2', '41.6', '1.6', 0, ''],
                        ['f1', 'First', '40.5', '-0.6', 0, ''], ['f2', 'Last', '40.6', '-0.6', 0, '']],
                 trips=T1 + T2 + T3 + T4 + T5 + T6, times=X1 + X2 + X3 + X4 + X5 + X6,
                 cal=[['wk', 1, 1, 1, 1, 1, 0, 0, '20261101', '20261231'], ['we', 0, 0, 0, 0, 0, 1, 1, '20261101', '20261231']], dates=[], shapes=True)

    def test_feed(self):
        F = S.read_feed(self.zip, datetime.date(2026, 11, 2))
        self.assertEqual(F['day'], datetime.date(2026, 11, 3))
        st, info = S.build_feed('t', F)
        by = {s['id']: s for s in st}
        self.assertEqual(info['left_out'], {'4': 1})
        main = by['t:a1']   # a1 and a2: one stop, at their middle, its lines merged
        self.assertEqual(main['n'], 'Main Square'); self.assertEqual(main['lat'], 41.00023)
        self.assertEqual(main['lines'], [{'t': 'e1', 'n': 'El Vendrell - Tarragona', 'f': 2}, {'n': 'Somewhere - Else', 'f': 1}])
        self.assertNotIn('t:c', by); self.assertNotIn('t:d', by)
        metro = by['t:p1']   # its parent's name and position
        self.assertEqual((metro['n'], metro['k'], metro['lat']), ('Metro Station', 'metro', 41.3))
        self.assertEqual(metro['lines'], [{'t': 'L1', 'n': 'Fondo - Bellvitge', 'c': '#E2001A', 'ink': False, 'f': 4}])
        self.assertEqual(by['t:f1']['lines'], [{'n': 'First - Last', 'f': 1}])
        self.assertEqual(by['t:b']['k'], 'bus')

    def test_cells_and_rerun(self):
        import shutil, subprocess
        cache = os.path.join(self.dir, 'cache'); out = os.path.join(self.dir, 'out')
        for d in ('t', 'skipme', 'napx', 'empty'): os.makedirs(os.path.join(cache, d))
        for d in ('t', 'skipme', 'napx'): shutil.copy(self.zip, os.path.join(cache, d, 'feed.zip'))
        with open(os.path.join(cache, 'napx', 'meta.json'), 'w') as f: json.dump({'id': 1234, 'name': 'x', 'org': 'Metro Prova', 'page': 'https://nap.example/1234'}, f)
        os.makedirs(out); open(os.path.join(out, '1_1.json'), 'w').close()   # a cell from an older run
        feeds = os.path.join(self.dir, 'feeds.json')
        with open(feeds, 'w') as fh: json.dump({'folders': {'t': {'id': 't', 'name': 'N', 'credit': 'C', 'licence': 'L', 'url': 'U', 'link': 'K'}, 'skipme': {'skip': True}}}, fh)
        env = dict(os.environ, GTFS_CACHE=cache, STOPS_FEEDS=feeds)
        run = lambda: subprocess.run([sys.executable, os.path.join(os.path.dirname(S.__file__), 'stops.py'), '--out', out, '--day', '2026-11-02'], env=env, capture_output=True, text=True)
        r = run(); self.assertEqual(r.returncode, 0, r.stderr); self.assertIn('skipped skipme', r.stdout)
        self.assertFalse(os.path.exists(os.path.join(out, '1_1.json')))
        idx = json.loads(slurp(os.path.join(out, 'index.json'), 'r'))
        self.assertEqual(idx['cell'], 0.25); self.assertEqual([x['id'] for x in idx['sources']], ['nap-1234', 't'])
        nap = idx['sources'][0]
        self.assertEqual((nap['name'], nap['credit'], nap['url'], nap['link'], nap['via']), ('Metro Prova', 'Metro Prova', 'https://nap.example/1234', '', 'mitrams'))
        self.assertEqual(idx['sources'][1]['day'], '2026-11-03'); self.assertEqual(idx['sources'][1]['link'], 'K')
        self.assertIn('164_4', idx['cells']); self.assertIn('162_-3', idx['cells'])
        first = {n: slurp(os.path.join(out, n)) for n in os.listdir(out)}
        run(); self.assertEqual(first, {n: slurp(os.path.join(out, n)) for n in os.listdir(out)})
        lines = slurp(os.path.join(out, '164_4.json'), 'r').splitlines()
        self.assertEqual(lines[0], '{"stops":['); self.assertTrue(lines[1].startswith('{"id":"nap-1234:a1"'))

class EveryNMinutes(unittest.TestCase):
    """A feed that gives a trip once and says how often it runs (frequencies.txt), as Madrid's metro does: at Puerta del
    Sol its lines read "a few a day" and one was not listed (17 Nov 2026)."""
    def test_runs(self):
        self.assertEqual([S.secs(x) for x in ('6:30:00', '06:30:00', '25:10:00', '07:05', '', 'soon')], [23400, 23400, 90600, 25500, None, None])
        R = S.runs_of([{'trip_id': 'a', 'start_time': '06:00:00', 'end_time': '07:00:00', 'headway_secs': '600'},     # 6: 6:00 to 6:50
                       {'trip_id': 'a', 'start_time': '07:00:00', 'end_time': '25:00:00', 'headway_secs': '300'},     # 216, after midnight too
                       {'trip_id': 'b', 'start_time': '6:30:00', 'end_time': '6:49:59', 'headway_secs': '780'},       # 2: 6:30 and 6:43
                       {'trip_id': 'c', 'start_time': '08:00:00', 'end_time': '09:00:00', 'headway_secs': '0'},       # cannot be read
                       {'trip_id': 'c', 'start_time': '10:00:00', 'end_time': '09:00:00', 'headway_secs': '600'},
                       {'trip_id': '', 'start_time': '08:00:00', 'end_time': '09:00:00', 'headway_secs': '600'}])
        self.assertEqual(dict(R), {'a': 222, 'b': 2})

    def test_feed(self):
        d = tempfile.mkdtemp(); zp = os.path.join(d, 'feed.zip')
        T1, X1 = trips_of('m1', 1, ['s1', 's2'])                 # written once, run every 5 minutes: f 4
        T2, X2 = trips_of('m2', 1, ['s1', 's3'])                 # written once, run twice: f 1
        T3, X3 = trips_of('m3', 1, ['s1', 's4'])                 # its row cannot be read: once, not listed
        T4, X4 = trips_of('m4', 1, ['s1', 's5'], service='we')   # every 5 minutes at weekends: nothing on a Tuesday
        T5, X5 = trips_of('b1', 10, ['s1', 's6'])                # a line written trip by trip in the same feed: as before, f 2
        make_zip(zp, routes=[['m1', '1', 'North - South', 1, '', ''], ['m2', '2', 'East - West', 1, '', ''], ['m3', '3', 'Up - Down', 1, '', ''],
                             ['m4', '4', 'Weekend', 1, '', ''], ['b1', '50', 'Bus', 3, '', '']],
                 stops=[['s%d' % i, 'Stop %d' % i, '40.4%d' % i, '-3.7', 0, ''] for i in range(1, 7)],
                 trips=T1 + T2 + T3 + T4 + T5, times=X1 + X2 + X3 + X4 + X5,
                 cal=[['wk', 1, 1, 1, 1, 1, 0, 0, '20261101', '20261231'], ['we', 0, 0, 0, 0, 0, 1, 1, '20261101', '20261231']], dates=[])
        with zipfile.ZipFile(zp, 'a') as z:
            z.writestr('frequencies.txt', csv_text([['trip_id', 'start_time', 'end_time', 'headway_secs', 'exact_times'], ['m1-0', '06:00:00', '25:00:00', 300, ''],
                                                    ['m2-0', '08:00:00', '10:00:00', 3600, ''], ['m3-0', '08:00:00', '10:00:00', 'often', ''], ['m4-0', '06:00:00', '25:00:00', 300, ''],
                                                    ['gone', '06:00:00', '25:00:00', 300, '']]))
        F = S.read_feed(zp, datetime.date(2026, 11, 2))
        self.assertEqual(F['calls'][('s1', 'm1')], 228); self.assertEqual(F['calls'][('s1', 'm2')], 2); self.assertEqual(F['calls'][('s1', 'm3')], 1)
        self.assertEqual(F['calls'][('s1', 'm4')], 0); self.assertEqual(F['calls'][('s1', 'b1')], 10)
        st, _ = S.build_feed('t', F)
        by = {s['id']: s for s in st}
        self.assertEqual([(L['t'], L['f']) for L in by['t:s1']['lines']], [('1', 4), ('50', 2), ('2', 1)])
        self.assertEqual(by['t:s1']['k'], 'metro')
        self.assertNotIn('t:s4', by); self.assertNotIn('t:s5', by)


class Names(unittest.TestCase):
    """Names as a guest reads them, and one stop for the two sides of a station (17 Nov 2026)."""
    def test_title(self):
        for a, b in (('GRAN VIA', 'Gran Via'), ('PLAZA DE CASTILLA', 'Plaza de Castilla'), ("L'HOSPITALET DE LLOBREGAT - AV. CARRILET", "L'Hospitalet de Llobregat - Av. Carrilet"),
                     ("FONT D'EN FARGAS", "Font d'en Fargas"), ('JUAN CARLOS I', 'Juan Carlos I'), ('PIO XII', 'Pio XII'), ('AEROPUERTO T4', 'Aeropuerto T4'),
                     ('LA PATACONA/LA MALVA-ROSA - EST. J. SOROLLA', 'La Patacona/La Malva-Rosa - Est. J. Sorolla'), ('O GROVE - A TOXA', 'O Grove - A Toxa'),
                     ('CTRA. A LOECHES', 'Ctra. a Loeches'), ('ESTACIÓN FGC', 'Estación FGC'), ('AVDA. DE LA CONSTITUCIÓN S/N', 'Avda. de la Constitución S/N'),
                     ('1º DE MAYO', '1º de Mayo'), ('SOL', 'Sol'), ('UAB', 'UAB')):
            self.assertEqual(S.tidy(a, True), b)
        # A feed that writes its names normally: only a name with a word of 4 letters or more; a name not all in capitals: never.
        self.assertEqual([S.tidy(x, False) for x in ('SOL', 'GRAN VIA', 'Gran Vía', 'BILBAO-MUNGIA Autopista', '')], ['SOL', 'Gran Via', 'Gran Vía', 'BILBAO-MUNGIA Autopista', ''])
        self.assertTrue(S.mostly_caps(['A B', 'CD', 'Ef'])); self.assertFalse(S.mostly_caps(['AB', 'Cd', 'Ef', '']))

    def test_code_in_front(self):
        for n, c, want in (('3 - Aeroport - Rafelbunyol', '3', 'Aeroport - Rafelbunyol'), ('L.4 CHANA - ZAIDÍN', '4', 'CHANA - ZAIDÍN'), ('Línea 2: Centro - Playa', '2', 'Centro - Playa'),
                           ('1 de Mayo - Centro', '1', '1 de Mayo - Centro'), ('3', '3', '3'), ('Centro', '', 'Centro'), ('30 - 31', '30', '30 - 31')):
            self.assertEqual(S.without_code(n, c), want)

    def test_same_stop(self):
        self.assertEqual(S.same_key("El Vendrell (estació d'autobusos) sentit Tarragona"), S.same_key("EL VENDRELL (Estació d'Autobusos) sentit Barcelona"))
        self.assertEqual(S.same_key('Riumors(Direcció L`Escala)'), 'riumors'); self.assertEqual(S.same_key('Gran Vía'), S.same_key('GRAN VIA'))
        self.assertEqual(S.same_key('9 sentit Gandia'), '9 sentit gandia')   # nothing left without it: kept whole
        self.assertEqual(S.shared({"El Vendrell (estació d'autobusos) sentit Tarragona", "El Vendrell (estació d'autobusos) sentit Barcelona"}), "El Vendrell (estació d'autobusos)")
        self.assertEqual(S.shared({'Aeroport T1 (sentit Gavà)', 'Aeroport T1 (sentit Sitges)'}), 'Aeroport T1')
        self.assertEqual(S.shared({'Cruce Dirección la Nave', 'Cruce Dirección la Nave (front)'}), 'Cruce Dirección la Nave')
        self.assertEqual(S.shared({'MAIN SQUARE', 'Main Square'}), 'Main Square')
        self.assertEqual(S.shared({'Roses Karting/Aquabrava sentit Roses', 'ROSES, Karting /Aquabrava sentit Palau'}), 'Roses Karting/Aquabrava')

    def test_busy_day(self):
        D = datetime.date
        cal = [['all', 0, 1, 0, 0, 0, 0, 0, '20260101', '20261231'], ['summer', 0, 1, 0, 0, 0, 0, 0, '20260601', '20260630']]
        cal = [dict(zip(('service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'), map(str, r))) for r in cal]
        per = {'all': 3, 'summer': 100}   # the calendar spans the year, the timetable is June's
        self.assertEqual(S.busy_day(D(2026, 6, 10), cal, [], per), D(2026, 6, 16))    # the first busy Tuesday on or after the day asked
        self.assertEqual(S.busy_day(D(2026, 11, 16), cal, [], per), D(2026, 6, 30))   # none after it: the last busy one before
        self.assertEqual(S.busy_day(D(2026, 11, 16), cal, [], {'all': 3}), D(2026, 11, 17))   # an even calendar: as before
        dates = [{'service_id': 'x', 'date': '20261117', 'exception_type': '1'}, {'service_id': 'x', 'date': '20261124', 'exception_type': '1'}, {'service_id': 'all', 'date': '20261117', 'exception_type': '2'}]
        self.assertEqual(S.busy_day(D(2026, 11, 1), [], dates, {'x': 5}), D(2026, 11, 17))   # a feed of dates only
        self.assertIsNone(S.busy_day(D(2026, 11, 1), cal, [], {}))                           # no trip on any Tuesday
        old = [dict(cal[0], start_date='20100101', end_date='20271231')]                     # a calendar open for many years: the day asked is still found
        self.assertEqual(S.busy_day(D(2026, 11, 16), old, [], {'all': 3}), D(2026, 11, 17))
        self.assertEqual(S.busy_day(D(2026, 11, 16), [dict(cal[0], start_date='20200101', end_date='20201231')], [], {'all': 3}), D(2020, 12, 29))   # ended long ago: its last Tuesday
        self.assertIsNone(S.busy_day(D(2026, 11, 1), [], [], {'x': 5}))

    def test_feed(self):
        d = tempfile.mkdtemp(); zp = os.path.join(d, 'feed.zip')
        T, X = [], []
        def add(route, n, stops, first=0):
            t, x = trips_of(route, n, stops, first=first); T.extend(t); X.extend(x)
        add('a1', 20, ['bs1', 'far']); add('a2', 20, ['far', 'bs2'])   # the two sides of a bus station, 20 m apart
        add('v1', 20, ['x1', 'far']); add('v2', 20, ['x1', 'far'], first=100); add('v3', 4, ['x1', 'far'], first=200)   # one line written as three routes, two colours
        add('m1', 30, ['g1', 'far']); add('m5', 30, ['g5', 'far'])     # a station whose first platform has lost its parent
        add('c1', 5, ['k1', 'far'])
        make_zip(zp, routes=[['a1', 'L0', 'TARRAGONA - BARCELONA', 3, '', ''], ['a2', 'L0', 'BARCELONA - TARRAGONA', 3, '', ''],
                             ['v1', '3', '3 - Aeroport - Rafelbunyol', 1, 'FF0000', 'FFFFFF'], ['v2', '3', '3 - Aeroport - Alboraia', 1, 'FF0000', 'FFFFFF'], ['v3', '3', '3 - Depot', 1, '00FF00', 'FFFFFF'],
                             ['m1', '1', 'PINAR - VALDECARROS', 1, '', ''], ['m5', '5', 'ALAMEDA - CASA DE CAMPO', 1, '', ''], ['c1', '9', 'Circular', 3, '', '']],
                 stops=[['bs1', "El Vendrell (estació d'autobusos) sentit Tarragona", '41.21857', '1.53622', 0, ''], ['bs2', "El Vendrell (estació d'autobusos) sentit Barcelona", '41.21844', '1.53642', 0, ''],
                        ['far', 'FAR AWAY', '42.0', '2.0', 0, ''], ['x1', 'XATIVA', '39.467', '-0.377', 0, ''],
                        ['G', 'GRAN VIA', '40.42001', '-3.7018', 1, ''], ['g1', 'GRAN VIA', '40.42001', '-3.7018', 0, ''], ['g5', 'GRAN VIA', '40.41999', '-3.7018', 0, 'G'],
                        ['k1', 'MOYUA PLAZA 6 (k1)', '43.26', '-2.93', 0, '']],
                 trips=T, times=X)
        st, _ = S.build_feed('t', S.read_feed(zp, datetime.date(2026, 11, 2)))
        by = {s['n']: s for s in st}
        self.assertEqual(sorted(by), ['El Vendrell (estació d\'autobusos)', 'Far Away', 'Gran Via', 'Moyua Plaza 6', 'Xativa'])
        self.assertEqual(by["El Vendrell (estació d'autobusos)"]['lines'], [{'t': 'L0', 'n': 'Barcelona - Tarragona', 'f': 2}])
        self.assertEqual(by['Xativa']['lines'], [{'t': '3', 'n': 'Aeroport - Alboraia', 'c': '#FF0000', 'ink': False, 'f': 3}])   # 44 calls, once; the name of the route that calls most, the first of two
        self.assertEqual([(L['t'], L['n']) for L in by['Gran Via']['lines']], [('1', 'Pinar - Valdecarros'), ('5', 'Alameda - Casa de Campo')])
        self.assertEqual(by['Gran Via']['id'], 't:g1')


class Shapes(unittest.TestCase):
    """What the national access point's files showed (16 Nov 2026): files in a folder of the zip, no calendar.txt, no trips,
    an empty route_type in a bus-only feed, careless colours, a bad byte."""
    def test_folder_dates_only_bad_byte(self):
        d = tempfile.mkdtemp(); p = os.path.join(d, 'f.zip')
        T, X = trips_of('r1', 3, ['a', 'b'])
        with zipfile.ZipFile(p, 'w') as z:
            z.writestr('gtfs/routes.txt', csv_text([['route_id', 'route_short_name', 'route_long_name', 'route_type', 'route_color', 'route_text_color']] + [['r1', '7', 'Pla\xe7a', '', '#ffdd00', '#FFDD00']]))
            z.writestr('gtfs/stops.txt', (csv_text([['stop_id', 'stop_name', 'stop_lat', 'stop_lon']] + [['a', 'Pla', '41.0', '1.0'], ['b', 'B', '41.1', '1.1'], ['z', 'Nowhere', '', '']])).encode('utf-8') + b'"q","Bad \xff byte","41.2","1.2"\n')
            z.writestr('gtfs/trips.txt', csv_text([['route_id', 'service_id', 'trip_id']] + T))
            z.writestr('gtfs/stop_times.txt', csv_text([['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence']] + [x[:5] for x in X]))
            z.writestr('gtfs/calendar_dates.txt', csv_text([['service_id', 'date', 'exception_type'], ['wk', '20261103', '1'], ['wk', '20261110', '1']]))
        F = S.read_feed(p, datetime.date(2026, 11, 1))
        self.assertEqual(F['day'], datetime.date(2026, 11, 3))
        self.assertIn('q', F['stops'])   # read, the bad byte replaced
        st, info = S.build_feed('n', F, only_bus=True)
        self.assertEqual([s['id'] for s in st], ['n:a', 'n:b'])
        self.assertEqual(st[0]['lines'][0], {'t': '7', 'n': 'Pla\xe7a', 'c': '#FFDD00', 'ink': True, 'f': 1})
        st2, info2 = S.build_feed('n', F, only_bus=False)
        self.assertEqual(st2, []); self.assertEqual(info2['left_out'], {'': 1})

    def test_no_trips(self):
        d = tempfile.mkdtemp(); p = os.path.join(d, 'f.zip')
        with zipfile.ZipFile(p, 'w') as z: z.writestr('stops.txt', 'stop_id\n'); z.writestr('routes.txt', 'route_id\n')
        self.assertRaises(S.MissingFile, S.read_feed, p, datetime.date(2026, 11, 1))

    def test_colours_careless(self):
        self.assertEqual(S.colours({'route_color': '000000', 'route_text_color': '000000'}), {'c': '#000000', 'ink': False})
        self.assertEqual(S.colours({'route_color': '#e2001a', 'route_text_color': 'ffffff'}), {'c': '#E2001A', 'ink': False})


if __name__ == '__main__': unittest.main()
