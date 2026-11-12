#!/usr/bin/env python3
# The towns of Spain for the maker (fault 2 of the acceptance test, docs/plan-ca-la-kimberly-through-the-maker.md: a host who
# types "Barcelona" to add it as a thing to do was offered the airport and a company, never the town). Google's suggestions
# are businesses and sights within 50 km; towns come from our own list instead, open data we may keep (GeoNames, CC BY 4.0),
# shown before Google's and with no distance limit (src/towns.js matches them, src/start.js shows them).
#   python3 onboarding-site/src/towns.py [--out onboarding-site/towns-es.json]
# Run by hand when GeoNames' country file is renewed (not by build.py), and the file it writes is committed: the maker serves
# it as a static file (/towns-es.json), loaded once in the background the first time a field that offers towns gets focus.
# Reads GeoNames' file for Spain from the cache worker/geonames.py keeps (GEONAMES_CACHE, default ~/.cache/guest-guides/
# geonames/ES.txt, with ES.json saying the day it was fetched). It never downloads: without the file it stops and says how
# to get it (worker/geonames.py fetches it on its first use). Python's standard library only.
# What goes in: every populated place (class P) with a population of 1 or more, or that is a seat (PPLA, PPLA2, PPLA3, PPLC:
# "la Bisbal del Penedès" is a PPLA3 with no population given); abandoned, destroyed and historical ones left out (GONE in
# worker/geonames.py). The same name twice in one province within 2 km is one town (the seat, else the bigger one).
# The file (compact JSON, about 300 KB):
#   { "_doc", "source": "GeoNames", "licence": "CC BY 4.0", "credit": the words of the credit, "url", "date": the day the
#     GeoNames file was fetched, "provinces": [names], "rows": [[name, lat, lng, population, province index], ...] }
# name as GeoNames writes it, lat and lng to 4 decimals (about 10 m), the bigger towns first; the province is the ADM2
# row's name without "Provincia de" and the like (as worker/geonames.py cleans it), -1 when the file gives none.
import json, math, os, re, sys, unicodedata

CACHE = os.environ.get('GEONAMES_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'geonames')
HERE = os.path.dirname(os.path.abspath(__file__))
SEATS = ('PPLC', 'PPLA', 'PPLA2', 'PPLA3')   # the order says which of two rows of one town is kept
GONE = set('PPLQ PPLW PPLH PPLCH'.split())   # as worker/geonames.py: abandoned, destroyed, historical
PART = set('PPLX'.split())                    # a section of a town ("la Barceloneta", "Madrid Centro"): not a town to go to; its sights are Google's rows
PROVINCE = re.compile(r"^(Provincia de |Província de |Provincia da |Province of |Provincia d'|Província d')")
CREDIT = 'Town names and positions: GeoNames (geonames.org), licence CC BY 4.0'

def fold(s):
    s = unicodedata.normalize('NFKD', str(s or '').replace('·', '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def km(a, b, c, d):
    p = math.pi / 180; return 6371 * math.hypot((d - b) * p * math.cos((a + c) / 2 * p), (c - a) * p)

def main():
    out = os.path.join(HERE, '..', 'towns-es.json')
    if '--out' in sys.argv:
        i = sys.argv.index('--out')
        if i + 1 >= len(sys.argv): sys.exit('Use: towns.py [--out <file>]')
        out = sys.argv[i + 1]
    txt, meta = os.path.join(CACHE, 'ES.txt'), os.path.join(CACHE, 'ES.json')
    if not os.path.exists(txt):
        sys.exit('No GeoNames file for Spain at %s. worker/geonames.py fetches it on its first use (or set GEONAMES_CACHE).' % txt)
    try:
        with open(meta) as f: date = json.load(f)['fetched']
    except Exception: date = None
    if not date or not re.match(r'^\d{4}-\d\d-\d\d$', date): sys.exit('%s does not say when the file was fetched.' % meta)
    adm2, towns = {}, []
    with open(txt, encoding='utf-8', errors='replace') as f:
        for line in f:
            c = line.rstrip('\n').split('\t')
            if len(c) < 15: continue
            if c[6] == 'A' and c[7] == 'ADM2': adm2[(c[10], c[11])] = PROVINCE.sub('', c[1])
            if c[6] != 'P' or c[7] in GONE or c[7] in PART: continue
            try: pop = int(c[14] or 0)
            except ValueError: pop = 0
            if pop < 1 and c[7] not in SEATS: continue
            try: lat, lng = float(c[4]), float(c[5])
            except ValueError: continue
            if not c[1].strip(): continue
            towns.append({'name': c[1].strip(), 'lat': lat, 'lng': lng, 'pop': max(pop, 0), 'code': c[7], 'a': (c[10], c[11]), 'id': c[0]})
    # One town per name and province within 2 km: the seat first, then the bigger, then GeoNames' own order (its id).
    rank = lambda t: (SEATS.index(t['code']) if t['code'] in SEATS else len(SEATS), -t['pop'], int(t['id']) if t['id'].isdigit() else 0)
    towns.sort(key=rank)
    kept, by = [], {}
    for t in towns:
        k = (fold(t['name']), t['a'])
        if any(km(t['lat'], t['lng'], o['lat'], o['lng']) <= 2 for o in by.get(k, ())): continue
        by.setdefault(k, []).append(t); kept.append(t)
    provs = sorted({adm2[t['a']] for t in kept if t['a'] in adm2})
    pi = {p: i for i, p in enumerate(provs)}
    kept.sort(key=lambda t: (-t['pop'], t['name']))
    rows = [[t['name'], round(t['lat'], 4), round(t['lng'], 4), t['pop'], pi.get(adm2.get(t['a']), -1)] for t in kept]
    doc = {'_doc': 'The towns of Spain the maker offers as things to do, written by onboarding-site/src/towns.py from GeoNames (run by hand, '
                   'not by build.py). rows: [name, lat, lng, population, index in provinces or -1]. Matched by src/towns.js.',
           'source': 'GeoNames', 'licence': 'CC BY 4.0', 'credit': CREDIT, 'url': 'https://www.geonames.org/', 'date': date,
           'provinces': provs, 'rows': rows}
    with open(out, 'w', encoding='utf-8') as f: json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    print('%d towns (%d rows read, %d provinces), GeoNames of %s, %.0f KB: %s' % (len(rows), len(towns), len(provs), date, os.path.getsize(out) / 1024, os.path.relpath(out)), file=sys.stderr)

if __name__ == '__main__': main()
