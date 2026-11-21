// Where a part of the guide is on: the launch desk's one rule (Yohann, 17 Nov 2026: "this is just an on-off switch, like
// easy to moderate what we are allowing the guests to do in different countries"). Pure: it is given the code's list
// (available.json beside this file) and what the owner decided (the database's launch_public(): { countries: [{ country,
// state }], switches: [{ module, part, country, is_on }] }, or nothing when it could not be read). Used as it is by the
// owner's page (onboarding-site/modules/, a copy made by its build.mjs), the maker (pasted by onboarding-site/src/build.py)
// and the generator (engine/scripts/available-of.mjs). Never write a second copy of these rules.
//   A part's id is "<module>/<part>", as in the list: "transport/trains".
//   A switch of the owner's wins; with none, the list says (a part's `where`: "any", or the countries it works in).
//   A house whose country is not known, and a part the list does not name, are never cut: the rule only takes away what
//   it is sure of.
//   A country is open when the owner opened it; with no word of his, when the list names it (`countries`).
export const avPart = (list, id) => { const [m, p] = String(id).split('/'), mod = ((list && list.modules) || []).find(x => x.id === m); return (mod && (mod.parts || []).find(x => x.id === p)) || null; };
export const avListSays = (part, country) => !!part && (part.where === 'any' || (Array.isArray(part.where) && part.where.includes(country)));
export const avSwitch = (launch, id, country) => { const [m, p] = String(id).split('/'); return ((launch && launch.switches) || []).find(s => s.module === m && s.part === p && s.country === country) || null; };
export const avPartOn = (list, launch, id, country) => { const part = avPart(list, id); if (!country || !part) return true; const s = avSwitch(launch, id, country); return s ? !!s.is_on : avListSays(part, country); };
export const avCountryState = (list, launch, country) => { const r = ((launch && launch.countries) || []).find(c => c.country === country); return r ? r.state : ((list && list.countries) || []).includes(country) ? 'open' : 'preparing'; };
export const avCountryOpen = (list, launch, country) => !country || avCountryState(list, launch, country) === 'open';
// Every part of the list for a country, as { "<module>/<part>": true or false }.
export const avParts = (list, launch, country) => Object.fromEntries(((list && list.modules) || []).flatMap(m => (m.parts || []).map(p => [`${m.id}/${p.id}`, avPartOn(list, launch, `${m.id}/${p.id}`, country)])));
