#!/usr/bin/env python3
# Spain's open timetable files (GTFS) from the national access point (https://nap.transportes.gob.es), into the cache that
# onboarding-site/src/stops.py reads (GTFS_CACHE, default ~/.cache/guest-guides/gtfs-es/): one folder per dataset,
# nap-<id>/, with gtfs.zip and a meta.json. Run every month by the server (worker/transit.mjs), never on a Mac but for tests.
# Yohann, 16 Nov 2026: "This is meant to work for the whole of Spain"; "my computer should not be involved into the process at all".
#   NAP_API_KEY=... python3 onboarding-site/src/nap.py
# Its licence (read 16 Nov 2026): reuse allowed, commercial too; the source cited, "Powered by MITRAMS" on the guide (the
# credit goes with each stop: stops.py, via 'mitrams'); the date of the data kept (meta.json updated).
# The rules (the design, 16 Nov 2026):
#   - the key from NAP_API_KEY only; never printed, never in a message, nor any download link; no key: one line, exit 0, nothing done;
#   - every dataset with a GTFS-ZIP file, but one marked obsolete, one whose transport is only air or sea, and the folders
#     onboarding-site/src/stops-feeds.json marks skip;
#   - fetched only when there is no zip yet or the file's date is newer than the kept meta.json's; written to a .part, checked
#     to open as a zip, then moved in place; two seconds between files; a failure keeps the old zip and is counted; a timeout
#     is tried once more;
#   - a folder nap-<digits> no longer wanted (left out now, or gone from the list) is removed; no other folder is touched.
# Python's standard library only. NAP_URL (tests) points at another address.
import json, os, re, shutil, socket, sys, time, unicodedata, urllib.error, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get('GTFS_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'gtfs-es')
BASE = (os.environ.get('NAP_URL') or 'https://nap.transportes.gob.es').rstrip('/')
FEEDS = os.environ.get('STOPS_FEEDS') or os.path.join(HERE, 'stops-feeds.json')
PAUSE = float(os.environ.get('NAP_PAUSE', '2'))
UA = 'guest-guide-maker/1.0'
FOLDER = re.compile(r'^nap-\d+$')

def fold(s): return re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower())

def wanted(x, skip):
    """The dataset's GTFS-ZIP file when it is to be kept, else None (obsolete, air or sea only, skipped by us, no GTFS)."""
    if x.get('isObsolete'): return None
    kinds = {fold(t.get('nombre')) for t in x.get('tiposTransporte') or [] if t}
    if kinds and kinds <= {'aereo', 'maritimo'}: return None
    if 'nap-%s' % x.get('id') in skip: return None
    g = [f for f in (x.get('ficheros') or []) if f and f.get('nombreTipoFichero') == 'GTFS-ZIP']
    return g[0] if g else None

def meta_of(x, f, today):
    return {'id': x['id'], 'fileId': f.get('id'), 'name': x.get('nombre'), 'org': (x.get('organizacion') or {}).get('nombre'),
            'transport': [t['nombre'] for t in x.get('tiposTransporte') or [] if t and t.get('nombre')], 'regions': [r['nombre'] for r in x.get('regiones') or [] if r and r.get('nombre')][:12],
            'updated': (f.get('fechaActualizacion') or '')[:10], 'frm': (f.get('fechaDesde') or '')[:10], 'to': (f.get('fechaHasta') or '')[:10],
            'stops': f.get('numeroParadas'), 'routes': f.get('numeroRutas'), 'trips': f.get('numeroViajes'), 'fetched': today, 'page': 'https://nap.transportes.gob.es/Files/Detail/%s' % x['id']}

def stale(d, f):
    """True when the folder has no zip that opens, or the file's date is newer than the kept meta.json's."""
    z, m = os.path.join(d, 'gtfs.zip'), os.path.join(d, 'meta.json')
    try: zipfile.ZipFile(z).close()
    except Exception: return True
    try:
        with open(m, encoding='utf-8') as fh: kept = json.load(fh).get('updated') or ''
    except Exception: return True
    return (f.get('fechaActualizacion') or '')[:10] > kept

class Nap:
    def __init__(self, key, base=BASE, timeout=600): self.key, self.base, self.timeout = key, base, timeout
    def _open(self, url, key, timeout):
        h = {'User-Agent': UA, 'Accept': 'application/json'}
        if key: h['ApiKey'] = self.key
        return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout)
    def api(self, path):
        with self._open(self.base + path, True, 120) as r: return json.load(r)
    def fetch(self, file_id, dest):
        """The file into dest (a .part next to it first, checked as a zip). A timeout is tried once more."""
        r = self.api('/api/v2/fichero/%s/descarga' % file_id); link = ((r or {}).get('data') or {}).get('enlaceDescarga')
        if not link: raise RuntimeError('no download link given')
        if link.startswith('/'): link = self.base + link
        host = urllib.request.urlparse(link).hostname or ''
        ours = host == urllib.request.urlparse(self.base).hostname or host.endswith('nap.transportes.gob.es')   # the key goes only to the access point
        part = dest + '.part'
        for attempt in (1, 2):
            try:
                with self._open(link, ours, self.timeout) as resp, open(part, 'wb') as out: shutil.copyfileobj(resp, out, 1 << 20)
                zipfile.ZipFile(part).close(); os.replace(part, dest); return os.path.getsize(dest)
            except Exception as e:
                late = isinstance(e, (socket.timeout, TimeoutError)) or isinstance(getattr(e, 'reason', None), (socket.timeout, TimeoutError))
                if late and attempt == 1: continue
                if isinstance(e, zipfile.BadZipFile): raise RuntimeError('what came back is not a zip')
                raise RuntimeError('timed out twice' if late else 'the download failed (%s)' % (getattr(e, 'code', None) or type(e).__name__))
            finally:
                if os.path.exists(part): os.remove(part)

def safe(msg, key):
    """A message with no key and no link in it."""
    m = re.sub(r'https?://\S+', '[link]', str(msg))
    return m.replace(key, '[key]') if key else m

def main():
    key = os.environ.get('NAP_API_KEY', '').strip()
    if not key: print('nap: no NAP_API_KEY, nothing fetched (the stops are made from what the cache holds)'); return 0
    with open(FEEDS, encoding='utf-8') as fh: skip = {k for k, v in (json.load(fh).get('folders') or {}).items() if v.get('skip')}
    nap, today = Nap(key), time.strftime('%Y-%m-%d')
    try: listing = nap.api('/api/v2/conjunto-dato')
    except Exception as e: print('nap: the list of datasets could not be read (%s): nothing fetched, nothing removed' % safe(e, key)); return 0
    data = (listing or {}).get('data') or []
    if not isinstance(data, list) or not data: print('nap: the list of datasets is empty: nothing fetched, nothing removed'); return 0
    os.makedirs(CACHE, exist_ok=True)
    keep, fetched, unchanged, failed, mb, first = set(), 0, 0, 0, 0.0, True
    for x in sorted(data, key=lambda x: x.get('id') or 0):
        f = wanted(x, skip)
        if not f: continue
        name = 'nap-%s' % x['id']; keep.add(name); d = os.path.join(CACHE, name)
        if not stale(d, f): unchanged += 1; continue
        if not first: time.sleep(PAUSE)
        first = False
        os.makedirs(d, exist_ok=True)
        try:
            size = nap.fetch(f.get('id'), os.path.join(d, 'gtfs.zip'))
            with open(os.path.join(d, 'meta.json'), 'w', encoding='utf-8') as fh: json.dump(meta_of(x, f, today), fh, ensure_ascii=False, indent=1)
            fetched += 1; mb += size / 1e6; print('nap: %s fetched, %.1f MB (%s)' % (name, size / 1e6, safe(x.get('nombre') or '', key)[:60]))
        except Exception as e:
            failed += 1; print('nap: %s FAILED, the old file kept: %s' % (name, safe(e, key)[:160]))
    removed = 0
    for name in sorted(os.listdir(CACHE)):
        if FOLDER.match(name) and name not in keep and os.path.isdir(os.path.join(CACHE, name)):
            shutil.rmtree(os.path.join(CACHE, name)); removed += 1; print('nap: %s removed (no longer wanted)' % name)
    print('nap: fetched %d, unchanged %d, failed %d, removed %d, %.1f MB' % (fetched, unchanged, failed, removed, mb))
    return 0

if __name__ == '__main__': sys.exit(main())
