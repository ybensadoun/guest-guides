# onboarding-site/src/nap.py against a fake access point served here (http.server on 127.0.0.1): never the real one.
#   python3 -m unittest discover -s onboarding-site/test -p 'nap_test.py'
import io, json, os, subprocess, sys, tempfile, threading, unittest, zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'nap.py')
KEY = 'test-key-1234567890'
def rd(p, mode='rb'):
    with open(p, mode) as f: return f.read()
def zbytes(tag):
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w') as z: z.writestr('stops.txt', 'stop_id\n' + tag + '\n')
    return b.getvalue()
def ds(i, fid, upd='2026-11-01', kinds=('Autobús',), obsolete=False):
    return {'id': i, 'nombre': 'Set %d' % i, 'tiposTransporte': [{'nombre': k} for k in kinds], 'isObsolete': obsolete, 'organizacion': {'nombre': 'Org %d' % i}, 'regiones': [{'nombre': 'Cataluña'}],
            'ficheros': [{'id': fid, 'nombreTipoFichero': 'GTFS-ZIP', 'fechaActualizacion': upd + 'T10:00:00', 'fechaDesde': '2026-01-01', 'fechaHasta': '2026-12-31', 'numeroParadas': 3}]}

class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        S = self.server; S.seen.append((self.path, self.headers.get('ApiKey')))
        if self.path == '/api/v2/conjunto-dato': return self.send(200, json.dumps({'success': True, 'data': S.listing}).encode(), 'application/json')
        if self.path.startswith('/api/v2/fichero/'):
            fid = self.path.split('/')[4]; return self.send(200, json.dumps({'data': {'enlaceDescarga': '/dl/' + fid, 'nombreFichero': 'x.zip'}}).encode(), 'application/json')
        if self.path.startswith('/dl/'):
            fid = self.path[4:]
            if fid in S.broken: return self.send(500, b'no', 'text/plain')
            if fid in S.notzip: return self.send(200, b'<html>not a zip</html>', 'text/html')
            return self.send(200, zbytes(fid), 'application/zip')
        self.send(404, b'', 'text/plain')
    def send(self, code, body, ctype):
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

class Nap(unittest.TestCase):
    def setUp(self):
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), Fake); self.srv.seen, self.srv.broken, self.srv.notzip = [], set(), set()
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.cache = tempfile.mkdtemp(); self.feeds = os.path.join(self.cache, '..', os.path.basename(self.cache) + '-feeds.json')
        with open(self.feeds, 'w') as f: json.dump({'folders': {'nap-5': {'skip': True}, 'nap-9': {'link': 'x'}}}, f)
    def tearDown(self): self.srv.shutdown(); self.srv.server_close()
    def run_nap(self, key=KEY):
        env = dict(os.environ, GTFS_CACHE=self.cache, NAP_URL='http://127.0.0.1:%d' % self.srv.server_port, STOPS_FEEDS=self.feeds, NAP_PAUSE='0')
        env.pop('NAP_API_KEY', None)
        if key: env['NAP_API_KEY'] = key
        r = subprocess.run([sys.executable, SCRIPT], env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr); self.assertNotIn(KEY, r.stdout + r.stderr); self.assertNotIn('/dl/', r.stdout + r.stderr)
        return r.stdout

    def test_no_key(self):
        out = self.run_nap(key='')
        self.assertIn('no NAP_API_KEY', out); self.assertEqual(self.srv.seen, []); self.assertEqual(os.listdir(self.cache), [])

    def test_fetch_rules_and_cleanup(self):
        self.srv.listing = [ds(1, 101), ds(2, 102, obsolete=True), ds(3, 103, kinds=('Aéreo',)), ds(4, 104, kinds=('Marítimo', 'Autobús')), ds(5, 105), ds(9, 109)]
        self.srv.listing.append({'id': 10, 'nombre': 'No GTFS', 'ficheros': [{'id': 110, 'nombreTipoFichero': 'NeTEx'}]})
        for d in ('nap-77', 'other'): os.makedirs(os.path.join(self.cache, d))   # a folder gone from the list, one not ours
        out = self.run_nap()
        self.assertEqual(sorted(n for n in os.listdir(self.cache)), ['nap-1', 'nap-4', 'nap-9', 'other'])
        self.assertIn('fetched 3, unchanged 0, failed 0, removed 1', out)
        m = json.loads(rd(os.path.join(self.cache, 'nap-1', 'meta.json'), 'r'))
        self.assertEqual((m['id'], m['fileId'], m['org'], m['updated'], m['page']), (1, 101, 'Org 1', '2026-11-01', 'https://nap.transportes.gob.es/Files/Detail/1'))
        self.assertTrue(all(k == KEY for p, k in self.srv.seen), 'the key goes with every call to the access point')
        # Again: nothing newer, nothing fetched. Then one newer, its download broken: the old zip stays.
        self.srv.seen.clear(); out = self.run_nap()
        self.assertIn('fetched 0, unchanged 3, failed 0, removed 0', out); self.assertEqual([p for p, k in self.srv.seen], ['/api/v2/conjunto-dato'])
        old = rd(os.path.join(self.cache, 'nap-1', 'gtfs.zip'))
        self.srv.listing[0] = ds(1, 101, upd='2026-12-01'); self.srv.broken.add('101')
        out = self.run_nap()
        self.assertIn('fetched 0, unchanged 2, failed 1', out); self.assertEqual(rd(os.path.join(self.cache, 'nap-1', 'gtfs.zip')), old)
        self.assertFalse(any(n.endswith('.part') for n in os.listdir(os.path.join(self.cache, 'nap-1'))))
        self.srv.broken.clear(); self.srv.notzip.add('101'); out = self.run_nap()
        self.assertIn('failed 1', out); self.assertIn('not a zip', out)
        self.srv.notzip.clear(); out = self.run_nap()
        self.assertIn('fetched 1', out); self.assertEqual(json.loads(rd(os.path.join(self.cache, 'nap-1', 'meta.json'), 'r'))['updated'], '2026-12-01')

if __name__ == '__main__': unittest.main()
