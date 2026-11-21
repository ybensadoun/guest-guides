# The countries' outlines file (onboarding-site/src/countries.py), on a small made-up world.
#   python3 -m unittest discover -s onboarding-site/test -p 'countries_test.py'
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
import countries

SQ = lambda w, s, e, n: [[[w, s], [e, s], [e, n], [w, n], [w, s]]]
GEO = {'features': [
    {'properties': {'ISO_A2_EH': 'AA'}, 'geometry': {'type': 'Polygon', 'coordinates': SQ(0, 0, 10, 10)}},
    {'properties': {'ISO_A2_EH': '-99', 'ISO_A2': '-99', 'ADM0_A3': 'FRA'}, 'geometry': {'type': 'MultiPolygon', 'coordinates': [SQ(20, 0, 30, 10), SQ(40, 0, 41, 1)]}},
    {'properties': {'ISO_A2_EH': '-99', 'ADM0_A3': 'ZZZ'}, 'geometry': {'type': 'Polygon', 'coordinates': SQ(50, 0, 60, 10)}},
    {'properties': {'ISO_A2': 'BB'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[0, 0], [0.001, 0.001], [0, 0]]]}},
]}

class Countries(unittest.TestCase):
    def test_rows(self):
        d = countries.make(GEO, '2026-11-21')
        self.assertEqual([r[0] for r in d['rows']], ['AA', 'FR'])          # no code: left out; too small to be an outline: left out
        self.assertEqual(d['rows'][0][1], [[0, 0, 1000, 0, 0, 1000, -1000, 0]])   # steps, in hundredths, the closing point gone
        self.assertEqual(len(d['rows'][1][1]), 2)
        self.assertEqual(d['date'], '2026-11-21')
    def test_same_twice(self):
        self.assertEqual(countries.make(GEO, 'x'), countries.make(GEO, 'x'))

if __name__ == '__main__': unittest.main()
