// Where a part of the guide is on: the launch desk's one rule (Yohann, 17 Nov 2026: "this is just an on-off switch, like
// easy to moderate what we are allowing the guests to do in different countries"). Pure: it is given the code's list
// (available.json beside this file) and what the owner decided (the database's launch_public(): { countries: [{ country,
// state }], switches: [{ module, part, country, is_on }] }, or nothing when it could not be read). Used as it is by the
// owner's page (onboarding-site/modules/, a copy made by its build.mjs), the maker (pasted by onboarding-site/src/build.py)
// and the generator (engine/scripts/available-of.mjs). Never write a second copy of these rules.
//   A part's id is "<module>/<part>", as in the list: "transport/trains".
//   No door is closed (Yohann, 21 Nov 2026: "when you put your Airbnb listing link, it [tells] where you are, and then it
//   will show you the modules that actually work for that country"): a house in any country gets a guide, made of the
//   parts that are on there.
//   What is on in a country: the list says (a part's `where`: "any", or the countries it works in). In a country the
//   owner has launched, his switches win over the list; in a country he is still preparing, his switches wait for the
//   launch and the list alone decides (avPartOn). avPartSet is what he has set, launched or not: what his page shows.
//   A country is launched ("open") when the owner opened it; with no word of his, when the list names it (`countries`).
//   A house whose country is not known, and a part the list does not name, are never cut: the rule only takes away what
//   it is sure of.
export const avPart = (list, id) => { const [m, p] = String(id).split('/'), mod = ((list && list.modules) || []).find(x => x.id === m); return (mod && (mod.parts || []).find(x => x.id === p)) || null; };
export const avListSays = (part, country) => !!part && (part.where === 'any' || (Array.isArray(part.where) && part.where.includes(country)));
export const avSwitch = (launch, id, country) => { const [m, p] = String(id).split('/'); return ((launch && launch.switches) || []).find(s => s.module === m && s.part === p && s.country === country) || null; };
export const avPartSet = (list, launch, id, country) => { const part = avPart(list, id); if (!country || !part) return true; const s = avSwitch(launch, id, country); return s ? !!s.is_on : avListSays(part, country); };
export const avCountryState = (list, launch, country) => { const r = ((launch && launch.countries) || []).find(c => c.country === country); return r ? r.state : ((list && list.countries) || []).includes(country) ? 'open' : 'preparing'; };
export const avCountryOpen = (list, launch, country) => !country || avCountryState(list, launch, country) === 'open';
export const avPartOn = (list, launch, id, country) => { const part = avPart(list, id); if (!country || !part) return true; return avCountryOpen(list, launch, country) ? avPartSet(list, launch, id, country) : avListSays(part, country); };
// Every part of the list for a country, as { "<module>/<part>": true or false }.
export const avParts = (list, launch, country) => Object.fromEntries(((list && list.modules) || []).flatMap(m => (m.parts || []).map(p => [`${m.id}/${p.id}`, avPartOn(list, launch, `${m.id}/${p.id}`, country)])));
