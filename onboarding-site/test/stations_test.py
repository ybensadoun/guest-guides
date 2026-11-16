# The rules of onboarding-site/src/stations.py on small made-up timetables (no Renfe file read, nothing written).
#   python3 -m unittest discover -s onboarding-site/test -p 'stations_test.py'
import datetime, os, sys, unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
import stations as S

H = 3600
NEUTRAL = {'c': '#5B2C83', 'ink': False}
BRANDS = {'AVE': {'t': 'AVE', 'c': '#001F4C', 'ink': False}, 'Avlo': {'t': 'Avlo', 'c': '#5FCBC6', 'ink': True}}
STOPS = {'A': ('Alpha', 41.0, 1.0), 'B': ('Beta', 41.1, 1.1), 'C': ('City Central', 41.5, 2.0), 'D': ('Delta', 41.2, 1.2), 'M': ('Metro', 40.4, -3.7)}
CITIES = [('city', ['C'], 'City Central', True, {}), ('metro', ['M'], 'Metro', False, {'fr': 'Métro'})]

def train(line, calls, sub=True, colour='#F7A30D'):
    """calls: [(stop, minutes after midnight)] or (stop, minutes, up, down); arrival and departure the same minute."""
    out = []
    for c in calls:
        s, m = c[0], c[1]; up, down = (c[2], c[3]) if len(c) > 2 else (True, True)
        out.append((s, m * 60, m * 60, up, down))
    return {'sub': sub, 'line': line, 'colour': colour if sub else None, 'calls': out}

def run(trains):
    st, cs = S.build(trains, STOPS, CITIES, BRANDS, NEUTRAL)
    return {s['id']: s for s in st}, cs


class Pure(unittest.TestCase):
    def test_clean_strips_stray_spaces(self):
        self.assertEqual(S.clean({' route_id  ': ' 10T0001C1  ', 'x': None}), {'route_id': '10T0001C1', 'x': ''})

    def test_secs_after_midnight(self):
        self.assertEqual(S.secs('8:30:00'), 8 * H + 30 * 60)
        self.assertEqual(S.secs('25:05:00'), 25 * H + 300)

    def test_ink_follows_lumof(self):
        self.assertTrue(S.ink('#F7A30D'))       # R4's yellow: dark text
        self.assertFalse(S.ink('#146520'))      # a dark green: white text
        self.assertTrue(S.ink('#FFFFFF'))

    def test_names(self):
        self.assertEqual(S.line_name('R2S'), 'R2 Sud')
        self.assertEqual(S.line_name(' R2N '), 'R2 Nord')
        self.assertEqual(S.line_name('C4a'), 'C4a')
        self.assertEqual(S.product('AVLO'), 'Avlo')
        self.assertEqual(S.product('AVE Euromed'), 'Euromed')
        self.assertEqual(S.product('AVANT EXP'), 'Avant')
        self.assertEqual(S.product('Something new'), 'Something new')

    def test_ref_day_first_tuesday_inside_both(self):
        d = S.ref_day([('20261114', '20261213'), ('20261115', '20270929')])
        self.assertEqual(d, datetime.date(2026, 11, 17))
        self.assertEqual(d.weekday(), 1)
        self.assertIsNone(S.ref_day([('20261118', '20261121')]))   # Wednesday to Saturday: no Tuesday

    def test_services_on_with_exceptions(self):
        cal = [{'service_id': 'wk', 'monday': '1', 'tuesday': '1', 'wednesday': '1', 'thursday': '1', 'friday': '1', 'saturday': '0', 'sunday': '0', 'start_date': '20261101', 'end_date': '20261130'},
               {'service_id': 'sun', 'monday': '0', 'tuesday': '0', 'wednesday': '0', 'thursday': '0', 'friday': '0', 'saturday': '0', 'sunday': '1', 'start_date': '20261101', 'end_date': '20261130'},
               {'service_id': 'late', 'monday': '1', 'tuesday': '1', 'wednesday': '1', 'thursday': '1', 'friday': '1', 'saturday': '1', 'sunday': '1', 'start_date': '20261201', 'end_date': '20261231'}]
        dates = [{'service_id': 'wk', 'date': '20261124', 'exception_type': '2'}, {'service_id': 'extra', 'date': '20261124', 'exception_type': '1'}]
        self.assertEqual(S.services_on(cal, dates, datetime.date(2026, 11, 17)), {'wk'})
        self.assertEqual(S.services_on(cal, dates, datetime.date(2026, 11, 24)), {'extra'})

    def test_calendar_range_from_dates_alone(self):
        self.assertEqual(S.calendar_range([], [{'date': '20261120'}, {'date': '20261102'}]), ('20261102', '20261120'))

    def test_nth_fastest(self):
        self.assertEqual(S.nth_fastest([50, 47, 60, 47, 90]), 60)
        self.assertEqual(S.nth_fastest([50, 47, 60]), 60)   # fewer than 4: the slowest

    def test_same_train(self):
        a = {'A': (0, 600), 'B': (1200, 1200)}
        self.assertTrue(S.same_train(a, {'A': (0, 660), 'B': (1260, 1260)}))
        self.assertFalse(S.same_train(a, {'A': (0, 600), 'B': (1500, 1500)}))   # reaches B 5 minutes later: another train
        self.assertFalse(S.same_train(a, {'A': (0, 900), 'B': (1200, 1200)}))


class Build(unittest.TestCase):
    def test_a_station_needs_4_trains_and_a_line_3(self):
        t = [train('R4', [('A', 480 + 60 * k), ('C', 560 + 60 * k)]) for k in range(3)] + [train('R13', [('A', 900), ('C', 980)], colour='#146520')]
        st, _ = run(t)
        self.assertEqual([l['t'] for l in st['A']['lines']], ['R4'])                 # R13: one train, noise
        self.assertEqual(st['A']['lines'][0], {'t': 'R4', 'c': '#F7A30D', 'ink': True})
        self.assertNotIn('D', st)
        st2, _ = run(t[:3])
        self.assertNotIn('A', st2)                                                  # 3 trains: left out

    def test_lines_by_trains_suburban_first(self):
        t = ([train('R4', [('A', 300 + 30 * k), ('C', 380 + 30 * k)]) for k in range(3)]
             + [train('R2S', [('A', 600 + 30 * k), ('C', 660 + 30 * k)], colour='#146520') for k in range(5)]
             + [train('AVE', [('A', 700 + 60 * k), ('C', 730 + 60 * k)], sub=False) for k in range(4)])
        st, _ = run(t)
        self.assertEqual([l['t'] for l in st['A']['lines']], ['R2 Sud', 'R4', 'AVE'])
        self.assertEqual(st['A']['lines'][2], {'t': 'AVE', 'c': '#001F4C', 'ink': False})
        self.assertTrue(st['A']['hs'])

    def test_unknown_service_neutral_and_hs_needs_4(self):
        t = [train('Intercity', [('A', 300 + 60 * k), ('C', 400 + 60 * k)], sub=False) for k in range(4)] + [train('AVLO', [('A', 900 + 60 * k), ('C', 950 + 60 * k)], sub=False) for k in range(3)]
        st, _ = run(t)
        self.assertEqual(st['A']['lines'], [{'t': 'Intercity', 'c': '#5B2C83', 'ink': False}, {'t': 'Avlo', 'c': '#5FCBC6', 'ink': True}])
        self.assertNotIn('hs', st['A'])   # 3 high speed trains: not hs

    def test_one_train_one_count(self):
        # Each R15 is listed again as "Regional" in the other file, a minute apart: counted once, under R15.
        t = ([train('R15', [('A', 400 + 60 * k), ('B', 420 + 60 * k), ('C', 450 + 60 * k)]) for k in range(4)]
             + [train('Regional', [('A', 401 + 60 * k), ('C', 451 + 60 * k)], sub=False) for k in range(4)])
        st, _ = run(t)
        self.assertEqual([l['t'] for l in st['A']['lines']], ['R15'])
        self.assertEqual(st['A']['to'], [{'id': 'city', 'n': 4, 'min': 50}])
        # A Regional of its own (another time) is listed.
        t2 = t + [train('Regional', [('A', 1000 + 90 * k), ('C', 1060 + 90 * k)], sub=False) for k in range(3)]
        st2, _ = run(t2)
        self.assertEqual([l['t'] for l in st2['A']['lines']], ['R15', 'Regional'])
        # The same long distance train listed twice in one file: once.
        t3 = [train('AVE', [('A', 500 + 60 * k), ('C', 530 + 60 * k)], sub=False) for k in range(4) for _ in range(2)]
        st3, _ = run(t3)
        self.assertEqual(st3['A']['to'], [{'id': 'city', 'n': 4, 'min': 30}])

    def test_to_4th_fastest_and_3_trains(self):
        mins = [47, 47, 50, 52, 60, 75]
        t = [train('R2S', [('A', 300 + 30 * k), ('C', 300 + 30 * k + m)]) for k, m in enumerate(mins)]
        t += [train('R4', [('A', 900 + 60 * k), ('M', 1000 + 60 * k)]) for k in range(2)]   # 2 trains to Metro: not kept
        st, cs = run(t)
        self.assertEqual(st['A']['to'], [{'id': 'city', 'n': 6, 'min': 52}])
        self.assertEqual([c['id'] for c in cs], ['city', 'metro'])
        self.assertEqual(cs[0], {'id': 'city', 'ids': ['C'], 'name': 'City Central', 'lat': 41.5, 'lng': 2.0, 'main': True})
        self.assertEqual(cs[1]['i18n'], {'fr': 'Métro'})

    def test_to_honours_pickup_and_set_down(self):
        t = [train('R4', [('A', 300 + 30 * k, False, True), ('B', 320 + 30 * k), ('C', 360 + 30 * k)]) for k in range(4)]
        st, _ = run(t)
        self.assertEqual(st['A']['to'], [])            # nobody boards at A
        self.assertEqual(st['B']['to'], [{'id': 'city', 'n': 4, 'min': 40}])
        t2 = [train('R4', [('A', 300 + 30 * k), ('B', 320 + 30 * k, False, False), ('C', 360 + 30 * k)]) for k in range(4)]
        st2, _ = run(t2)
        self.assertNotIn('B', st2)                      # passes without stopping: no train stops there

    def test_no_journey_inside_the_city(self):
        t = [train('R4', [('C', 300 + 30 * k), ('B', 330 + 30 * k)]) for k in range(4)]
        st, _ = run(t)
        self.assertEqual(st['C']['to'], [])


if __name__ == '__main__': unittest.main()
