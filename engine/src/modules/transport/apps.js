// Which ride apps work near a house (README.md beside this file, "The ride apps"): one rule in one place, for the worker
// (worker/ride-apps.mjs), the generator (engine/scripts/apps-of.mjs) and the maker (pasted by onboarding-site/src/build.py,
// the import and export words taken out). Pure: no DOM. Every name starts with ax. apps: the list of apps.json.
// rows: the shared record, table ride_apps: [{ app, cities: [{ name, lat, lng }], checked_at, tried_at }].
// Tested in engine/scripts/transport-apps.test.mjs.
import { tpLine, tpPlaced } from './pick.js';

export const AX_KM = 12;   // km in a straight line from one of the app's cities' centres (the design, 16 Nov 2026)
const axDay = x => { const d = x ? new Date(x) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
// The apps that work near the house, in apps.json's order: [{ id, name, link, at }] (at: the date of the app's last
// sure search). A row with no sure search yet says nothing.
export function axNear(house, rows, apps) {
  if (!tpPlaced(house) || !Array.isArray(apps)) return [];
  return apps.filter(a => { const r = (rows || []).find(x => x && x.app === a.id); return r && r.checked_at && (r.cities || []).some(c => c && Number.isFinite(+c.lat) && Number.isFinite(+c.lng) && tpLine(house, { lat: +c.lat, lng: +c.lng }) <= AX_KM); })
    .map(a => ({ id: a.id, name: a.name, link: a.link, at: axDay(((rows || []).find(x => x.app === a.id) || {}).checked_at) }));
}
// An app as content/transport.json holds it (its name is not translated).
export const axEntry = (a, at = '') => ({ id: a.id, name: a.name, link: a.link, src: { from: 'search', at: a.at || at } });
