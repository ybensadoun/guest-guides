/* ---------- What the place offers (amenities): one list for the builder, the listing read and the House page ----------
   AMENS is engine/src/amenities.json (build.py puts it in): groups and items, each named in six languages, with Airbnb's
   own codes. A.amenities holds item ids, plus the host's own words for anything the list does not have. Old answers held
   the builder's former English chips ("BBQ", "Washing machine"): amenIds turns those into ids too. */
const AM_BY = Object.fromEntries(AMENS.items.map(x => [x.id, x]));
const AM_CODE = Object.fromEntries(AMENS.items.flatMap(x => (x.ab || []).map(c => [c, x.id])));
const amFold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
const AM_WORDS = new Map(AMENS.items.flatMap(x => [x.t.en, ...(x.k && x.k !== '-' ? x.k.split(',') : [])].map(w => [amFold(w), x.id])));
const amOld = x => x.k === '-';   // an old builder choice: kept when chosen, never offered
// A listing's English words ("Free washer – In unit", "Private hot tub") or an old choice ("BBQ") to an item, else ''.
function amenMatch(s){
  const full = amFold(s), head = full.split(/:|\s[–-]\s|\(|,/)[0].trim();
  for (const w of [full, head, head.replace(/^((free|private|shared|indoor|outdoor|in-unit|heated) )+/, '')]) if (AM_WORDS.has(w)) return AM_WORDS.get(w);
  return '';
}
const amenIds = list => [...new Set((Array.isArray(list) ? list : []).map(x => AM_BY[x] ? x : amenMatch(x) || String(x || '').trim()).filter(Boolean))];
const amenNow = () => amenIds(A.amenities);
const amenName = x => AM_BY[x] ? AM_BY[x].t.en : x;
// The first ones guests see on the House page: the most asked for, then the rest in list order.
const amenKey = ids => [...ids.filter(x => (AM_BY[x] || {}).top).sort((a, b) => AM_BY[a].top - AM_BY[b].top), ...ids.filter(x => !(AM_BY[x] || {}).top)];
// From the listing read: every amenity by Airbnb's code when the page gave them (any language), else Claude's picks and
// the listing's own words (English), matched where the list knows them and kept as written where it does not.
function amenFromListing(d){
  const items = Array.isArray(d.amenityItems) ? d.amenityItems : [];
  if (items.length) return amenIds(items.map(i => AM_CODE[i.c] || amenMatch(i.t) || i.t));
  return amenIds([...((d.draft || {}).amenities || []), ...(Array.isArray(d.amenities) ? d.amenities : [])]);
}

const amCount = (items, on) => { const n = items.filter(x => on.has(x.id)).length; return n ? `${n} ticked` : ''; };
const amChip = on => x => `<label class="chip"><input type="checkbox" data-amen="${esc(x.id)}"${on.has(x.id) ? ' checked' : ''}><span>${esc(x.t.en)}</span></label>`;
function amenHTML(){
  const now = amenNow(), on = new Set(now), own = now.filter(x => !AM_BY[x] || amOld(AM_BY[x]));
  const pop = AMENS.items.filter(x => x.top).sort((a, b) => a.top - b.top);
  const groups = AMENS.groups.map(g => ({ g, items: AMENS.items.filter(x => x.g === g.id && !amOld(x)) })).filter(x => x.items.length);
  return `<div class="f full am">
    <label class="lab" for="amQ">Find an amenity</label>
    <input type="search" id="amQ" autocomplete="off" enterkeyhint="search" placeholder="Dishwasher, cot, sea view…">
    <p class="hint" id="amHint">${amHint(now)}</p>
    <div class="am-res" id="amRes" aria-live="polite"></div>
    <h3 class="am-h">Most asked for</h3><div class="chips">${pop.map(amChip(on)).join('')}</div>
    <h3 class="am-h">Everything, by group</h3>
    <div class="am-gs">${groups.map(({ g, items }) => `<details class="am-g"><summary><span>${esc(g.t.en)}</span><small data-amc="${esc(g.id)}">${amCount(items, on)}</small></summary><div class="chips">${items.map(amChip(on)).join('')}</div></details>`).join('')}</div>
    <h3 class="am-h">Your own</h3>
    ${own.length ? `<div class="chips am-own">${own.map(x => `<span class="am-x"><span>${esc(amenName(x))}</span><button type="button" data-amdel="${esc(x)}" aria-label="Remove ${esc(amenName(x))}">×</button></span>`).join('')}</div>` : ''}
    <div class="rm-new"><input type="text" id="amOwn" maxlength="80" placeholder="Something not in the list" aria-label="Add something not in the list"><button class="btn small" type="button" id="amOwnAdd">Add</button></div>
  </div>`;
}
const amHint = now => `${now.length ? `${now.length} in your guide.` : 'Nothing ticked yet.'} Search, or open a group below.`;
function amenSet(ids){
  if (A._pre && A._pre.amenities) { const p = { ...A._pre }; delete p.amenities; A._pre = p; }   // the host's own choice now, not the listing's
  A.amenities = ids; queueSave(); phoneSoon(); softRefresh();
  const on = new Set(ids);
  document.querySelectorAll('[data-amen]').forEach(c => { c.checked = on.has(c.dataset.amen); });
  document.querySelectorAll('[data-amc]').forEach(s => { s.textContent = amCount(AMENS.items.filter(x => x.g === s.dataset.amc && !amOld(x)), on); });
  const h = document.getElementById('amHint'); if (h) h.textContent = amHint(ids);
}
function amenSearch(){
  const box = document.getElementById('amRes'), inp = document.getElementById('amQ'); if (!box || !inp) return;
  const q = amFold(inp.value), on = new Set(amenNow());
  if (q.length < 2) { box.innerHTML = ''; return; }
  const hits = AMENS.items.filter(x => !amOld(x) && [...Object.values(x.t), ...(x.k ? x.k.split(',') : [])].some(w => amFold(w).includes(q))).slice(0, 12);
  const exact = hits.some(x => amFold(x.t.en) === q);
  box.innerHTML = `${hits.length ? `<div class="chips">${hits.map(amChip(on)).join('')}</div>` : '<p class="hint">Not in the list.</p>'}
    ${exact ? '' : `<button class="btn small" type="button" data-amadd="${esc(inp.value.trim())}">+ Add “${esc(inp.value.trim())}” as you wrote it</button>`}`;
}
function amenAdd(text){
  const t = String(text || '').trim().slice(0, 80); if (!t) return;
  const now = amenNow(), id = amenMatch(t) || t;
  if (!now.includes(id)) now.push(id);
  amenSet(now);
  if (!AM_BY[id] || amOld(AM_BY[id])) { const y = scrollY; render(); scrollTo(0, y); }   // the host's own words: the list below changes
}
document.addEventListener('input', e => { if (e.target.id === 'amQ') amenSearch(); });
document.addEventListener('change', e => {
  const id = e.target.dataset && e.target.dataset.amen; if (!id) return;
  const now = amenNow().filter(x => x !== id);
  amenSet(e.target.checked ? [...now, id] : now);
});
document.addEventListener('click', e => {
  const add = e.target.closest && e.target.closest('[data-amadd]');
  if (add) { amenAdd(add.dataset.amadd); const q = document.getElementById('amQ'); if (q) { q.value = ''; amenSearch(); } return; }
  const del = e.target.closest && e.target.closest('[data-amdel]');
  if (del) { amenSet(amenNow().filter(x => x !== del.dataset.amdel)); const y = scrollY; render(); scrollTo(0, y); return; }
  if (e.target.closest && e.target.closest('#amOwnAdd')) { const i = document.getElementById('amOwn'); if (i) amenAdd(i.value); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !['amOwn', 'amQ'].includes(e.target.id)) return;
  e.preventDefault();
  if (e.target.id === 'amOwn') return amenAdd(e.target.value);
  const first = document.querySelector('#amRes [data-amen]:not(:checked)'); if (first) { first.checked = true; first.dispatchEvent(new Event('change', { bubbles: true })); }
});
