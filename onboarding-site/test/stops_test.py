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
        self.assertEqual((nap['name'], nap['credit'], nap['url'], nap['link']), ('Metro Prova', 'Metro Prova (Powered by MITRAMS)', 'https://nap.example/1234', ''))
        self.assertEqual(idx['sources'][1]['day'], '2026-11-03'); self.assertEqual(idx['sources'][1]['link'], 'K')
        self.assertIn('164_4', idx['cells']); self.assertIn('162_-3', idx['cells'])
        first = {n: slurp(os.path.join(out, n)) for n in os.listdir(out)}
        run(); self.assertEqual(first, {n: slurp(os.path.join(out, n)) for n in os.listdir(out)})
        lines = slurp(os.path.join(out, '164_4.json'), 'r').splitlines()
        self.assertEqual(lines[0], '{"stops":['); self.assertTrue(lines[1].startswith('{"id":"nap-1234:a1"'))

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
