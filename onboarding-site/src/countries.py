#!/usr/bin/env python3
# The countries' outlines, to tell which country a house is in from its position (engine/src/country.js), for the launch
# desk's rule: what is on in which country (engine/src/modules/available.js). Open data we may keep: Natural Earth, public
# domain ("Crediting the authors is unnecessary", naturalearthdata.com/about/terms-of-use, read 21 Nov 2026).
#   python3 onboarding-site/src/countries.py [--out onboarding-site/countries.json]
# Run by hand when Natural Earth renews its file (not by build.py), and the file it writes is committed: the maker serves
# it as a static file (/countries.json), loaded once when a house's country is not known yet.
# Reads Natural Earth's countries at 1:50m as GeoJSON, ne_50m_admin_0_countries.geojson, from the cache (NE_CACHE, default
# ~/.cache/guest-guides/naturalearth/). It never downloads: without the file it stops and says where it comes from.
# Python's standard library only. A rerun on the same file changes nothing.
# What goes in: every outline (outer rings only: a country inside another is told apart by its size, engine/src/country.js)
# of every country that has a two-letter code, positions rounded to a hundredth of a degree (about 1 km), a point that
# repeats the one before left out, rings of fewer than 3 points left out.
# The file (compact JSON):
#   { "_doc", "source": "Natural Earth", "licence": "public domain", "url", "scale": "1:50m", "date": the day the file in
#     the cache was last changed, "rows": [[code, [ring, ...]], ...] }, codes in A to Z order,
#   ring: [lng, lat, dlng, dlat, ...] in hundredths of a degree, each point after the first as its step from the one before.
import datetime, json, os, re, sys

CACHE = os.environ.get('NE_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'guest-guides', 'naturalearth')
NAME = 'ne_50m_admin_0_countries.geojson'
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/' + NAME
HERE = os.path.dirname(os.path.abspath(__file__))
A3 = {'FRA': 'FR', 'NOR': 'NO', 'KOS': 'XK'}   # Natural Earth gives these no two-letter code of their own in some fields
CODE = re.compile(r'^[A-Z]{2}\Z')

def code_of(p):
    for k in ('ISO_A2_EH', 'ISO_A2', 'WB_A2'):
        v = str(p.get(k) or '')
        if CODE.match(v): return v
    return A3.get(str(p.get('ADM0_A3') or ''), '')

def ring_of(points):
    out, px, py = [], None, None
    for pt in points:
        x, y = round(pt[0] * 100), round(pt[1] * 100)
        if px is None: out += [x, y]
        elif (x, y) != (px, py): out += [x - px, y - py]
        else: continue
        px, py = x, y
    if len(out) >= 4 and (sum(out[2::2]), sum(out[3::2])) == (0, 0): out = out[:-2]   # the closing point repeats the first
    return out if len(out) >= 6 else None

def make(geo, date):
    by = {}
    for f in geo.get('features') or []:
        cc, g = code_of(f.get('properties') or {}), f.get('geometry') or {}
        if not cc: continue
        polys = [g['coordinates']] if g.get('type') == 'Polygon' else g.get('coordinates') or [] if g.get('type') == 'MultiPolygon' else []
        for poly in polys:
            r = ring_of(poly[0]) if poly else None
            if r: by.setdefault(cc, []).append(r)
    return {'_doc': 'The countries\' outlines, to tell a house\'s country from its position (engine/src/country.js). Made by onboarding-site/src/countries.py: never edit by hand.',
            'source': 'Natural Earth', 'licence': 'public domain', 'url': 'https://www.naturalearthdata.com', 'scale': '1:50m', 'date': date,
            'rows': [[cc, by[cc]] for cc in sorted(by)]}

def main():
    out = os.path.join(HERE, '..', 'countries.json')
    if '--out' in sys.argv: out = sys.argv[sys.argv.index('--out') + 1]
    src = os.path.join(CACHE, NAME)
    if not os.path.exists(src):
        sys.exit(f'No {NAME} in {CACHE}.\nIt is Natural Earth\'s file of the countries (public domain, about 3 MB):\n  {URL}\nPut it there, then run this again.')
    with open(src, encoding='utf-8') as f: geo = json.load(f)
    data = make(geo, datetime.date.fromtimestamp(os.path.getmtime(src)).isoformat())
    with open(out, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, separators=(',', ':')); f.write('\n')
    n = sum(len(r) for _, r in data['rows'])
    print(f'{len(data["rows"])} countries, {n} outlines, {os.path.getsize(out) // 1024} KB: {os.path.relpath(out)}')

if __name__ == '__main__': main()
