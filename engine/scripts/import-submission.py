#!/usr/bin/env python3
"""Turn a Netlify Forms export of the onboarding into a submission folder for generate-site.py.

Usage:
  python3 engine/scripts/import-submission.py <onboarding.csv|.json> [--files <file-submissions.csv>] [--slug <slug>] [--sid <sid>]

<onboarding.csv>  Netlify > Forms > onboarding > Export CSV (or one submission saved as JSON).
                  The row with the newest `sent_before`/date for the chosen --sid wins (default: the last row).
--files           optional: Forms > file > Export CSV. Photos the host uploaded themselves
                  (rows whose sid matches) are downloaded into uploads/.
Writes test-submissions/<slug>/host.json and uploads/*.json, then prints the generate command to run.
"""
import argparse, base64, csv, json, mimetypes, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('--files'); ap.add_argument('--slug'); ap.add_argument('--sid')
args = ap.parse_args()

def rows(path):
    p = Path(path); t = p.read_text(encoding='utf-8-sig')
    if p.suffix.lower() == '.json':
        d = json.loads(t); d = d.get('data', d) if isinstance(d, dict) else d
        return d if isinstance(d, list) else [d]
    return list(csv.DictReader(t.splitlines()))

def pick(d, k):  # tolerate Netlify column naming (data.answers, answers...)
    for key in (k, 'data.' + k, k.replace('_', ' ')):
        if key in d and d[key] != '': return d[key]
    return ''

R = rows(args.src)
if args.sid: R = [r for r in R if pick(r, 'sid') == args.sid]
if not R: sys.exit('No submission found in that file.')
r = R[-1]
answers = json.loads(pick(r, 'answers') or '{}')
if not answers: sys.exit('This row has no "answers" column. Export the onboarding form, not another one.')
lp = pick(r, 'listing_photos')
slug = re.sub(r'[^a-z0-9-]', '', (args.slug or answers.get('slug') or pick(r, 'slug') or 'guide').lower()) or 'guide'
out = ROOT / 'test-submissions' / slug; (out / 'uploads').mkdir(parents=True, exist_ok=True)
(out / 'host.json').write_text(json.dumps({'status': 'sent', 'answers': answers, 'listing_photos': json.loads(lp) if lp else []}, ensure_ascii=False, indent=1))

n = 0
if args.files:
    sid = pick(r, 'sid')
    for f in rows(args.files):
        if sid and pick(f, 'sid') != sid: continue
        url = next((v for v in f.values() if isinstance(v, str) and v.startswith('http') and '/' in v and not v.startswith('https://app.netlify')), '')
        if not url: continue
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
        except Exception as e:
            print('photo not downloaded:', url[:80], e); continue
        mime = mimetypes.guess_type(pick(f, 'name') or url)[0] or 'image/jpeg'
        (out / 'uploads' / f'u{n:02d}.json').write_text(json.dumps({'kind': pick(f, 'kind') or 'photo', 'room': pick(f, 'room'), 'name': pick(f, 'name'),
            'dataUrl': f'data:{mime};base64,' + base64.b64encode(data).decode()})); n += 1

print(f'Imported "{answers.get("placeName", slug)}" into test-submissions/{slug}: {len(json.loads(lp) if lp else [])} listing photos, {n} uploaded photos.')
print('Next:  python3 engine/scripts/generate-site.py test-submissions/%s --slug %s --lat <lat> --lng <lng> --src <language>' % (slug, slug))
