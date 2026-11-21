/* ---------- The launch desk in the maker: what is on for this house's country ----------
   Yohann, 21 Nov 2026: "when you put your Airbnb listing link, it [tells] where you are, and then it will show you the
   modules that actually work for that country". One helper for every step: partOn('<module>/<part>'), the engine's own
   rule (AV: engine/src/modules/available.js, with AV_LIST, the engine's list; pasted by build.py), given
   - what the owner decided: the database's launch_public(), asked once when the maker starts with the public key, never
     waited for (4 s at most); no answer: the list alone decides;
   - the house's country: the guide's own (content/house.json `country`, written by the generator) or the answers'
     (`country`, kept with the position it was read from), else read once from the position with our own outlines file
     (/countries.json, CTRY: engine/src/country.js). Not known, or not known yet: nothing is cut.
   Plan and the list of gates: docs/plan-launch-desk-gates.md. No step reads partOn yet (21 Nov 2026). */
const LD = { launch: null, prep: null, asked: null, failed: 0, mem: {} };
function ldStart() {
  try {
    fetch(SB.url + '/rest/v1/rpc/launch_public', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(4000) })
      .then(r => (r.ok ? r.json() : null)).then(j => { if (j && Array.isArray(j.switches) && Array.isArray(j.countries)) { LD.launch = j; if (j.switches.length || j.countries.length) ldAgain(); } }).catch(() => { /* the list alone decides */ });
  } catch (e) { /* the list alone decides */ }
}
// The house in hand: its position, and the country it already knows.
const ldHouse = () => { const h = (typeof CM !== 'undefined' && CM.on) ? (edF().house || {}) : A; return { lat: h.lat, lng: h.lng, cc: typeof h.country === 'string' ? h.country : null, ed: typeof CM !== 'undefined' && CM.on }; };
const ldSpot = h => (Number.isFinite(+h.lat) && Number.isFinite(+h.lng) && h.lat !== '' && h.lat !== null && h.lng !== '' && h.lng !== null) ? (+h.lat).toFixed(3) + ',' + (+h.lng).toFixed(3) : '';
function ldCountry() {
  const h = ldHouse(), at = ldSpot(h);
  if (h.ed) { if (h.cc !== null) return h.cc; }
  else if (h.cc !== null && A._countryAt === at) return h.cc;     // the answers' own, read from this same position
  if (!at) return '';
  if (at in LD.mem) return LD.mem[at];
  if (Date.now() - LD.failed > 60000) ldRead(at, h);               // the file did not load: not asked again for a minute
  return '';                                                       // not known yet: nothing is cut meanwhile
}
function ldRead(at, h) {
  if (!LD.asked) LD.asked = fetch('/countries.json').then(r => (r.ok ? r.json() : null)).then(d => { LD.prep = d ? CTRY.countriesPrep(d) : null; }).catch(() => { LD.prep = null; });
  LD.mem[at] = '';
  LD.asked.then(() => { if (!LD.prep) { delete LD.mem[at]; LD.asked = null; LD.failed = Date.now(); return; }
    const cc = CTRY.countryAt(LD.prep, +h.lat, +h.lng); LD.mem[at] = cc;
    if (!h.ed && ldSpot(A) === at) { A.country = cc; A._countryAt = at; try { flush(); } catch (e) { /* kept in memory */ } }
    ldAgain(); });
}
// What changed may switch a part off for this house: the screen is drawn again, only then.
function ldAgain() { const cc = ldCountry(); if (cc && Object.values(AV.avParts(AV_LIST, LD.launch, cc)).some(on => !on)) { try { render(); } catch (e) { /* the next draw shows it */ } } }
const partOn = id => AV.avPartOn(AV_LIST, LD.launch, id, ldCountry());
setTimeout(ldStart, 0);
