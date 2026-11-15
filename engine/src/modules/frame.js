// The module frame (README.md beside this file): Home's two groups, "house" and "area", as lists of placements, each
// drawn in one of three shared sizes. Pure: no DOM, no content read here. views/home.js gives it the guide and draws what
// it returns; engine/scripts/check-content.js checks a guide's content/home.json with check(); tests in
// engine/scripts/frame.test.mjs.
//
// A placement: { kind: 'section', id, size } (a section's tile, id from content/sections.json),
// { kind: 'highlight', id, size } (the white card of one place: an item of content/quick.json, or the transport
// section's id for its card), { kind: 'map', size: 'wide' }. An optional "widget" ('entry', 'live', 'highlight') must
// match what the thing is.
//
// The guide, as the frame sees it:
//   sections: [{ id, kind, group, status }]   the sections whose module is on, in content/sections.json order
//   highlights: [{ id, wide }]                the white cards shown now (quick.json items not left out for the season,
//                                             then the transport card), in their order
//   map: true | false                         the map's module is on
//   transportCard: id | null                  the transport section shown as a highlight (its section tile then stays off)
//   offers: { kind: { <widget>: { sizes } } } what each module says it offers (its widgets, modules/<folder>/offers.js),
//                                             by the kind of section it serves, the highlights under "highlight", the
//                                             map under "map": views/home.js passes the registry's (modules/index.js), the
//                                             node scripts modules/offers.js; the first widget a module names is its
//                                             widget on Home, and a module that names none (the house) is never placed

export const GROUPS = ['house', 'area'];
export const SIZES = ['half', 'wide', 'tall'];
export const WIDGETS = ['entry', 'live', 'highlight'];
export const KINDS = ['section', 'highlight', 'map'];

// What a kind of section offers on Home. A module says it in its own folder (guide.offers, above: rubbish its live tile,
// wide only; markets, the host's lists of places, the text pages, Emergencies, Getting around, their entry tile in every
// size; Local events their entry tile with the next event, wide only; the house nothing, an empty offer: it is the
// welcome card, never placed). Every kind of section has its module (14 Nov 2026); a kind none knows offers its entry
// tile in every size. The highlights say theirs under "highlight" (a card, half or wide), the map under "map" (its bar,
// wide only); the same when a guide is given no offers. Returns { widget, sizes }, or null for a module that offers nothing.
const ENTRY = { widget: 'entry', sizes: ['half', 'wide', 'tall'] };
const HIGHLIGHT = { widget: 'highlight', sizes: ['half', 'wide'] };
const MAP = { widget: 'entry', sizes: ['wide'] };
const offerOf = (kind, guide, fallback = ENTRY) => {
  const w = (guide.offers || {})[kind];
  if (w && Object.keys(w).length) { const [widget, o] = Object.entries(w)[0]; return { widget, sizes: o.sizes }; }
  return w ? null : fallback;
};

const shown = s => s.status === 'live' || s.kind === 'markets';   // markets have their own tile, whatever their status
export const keyOf = p => (p.kind === 'map' ? 'map' : `${p.kind}:${p.id}`);

// What a placement names, if the guide has it to show now: { kind, id, widget, sizes, group }, else null.
export function thing(p, guide) {
  if (!p || typeof p !== 'object') return null;
  if (p.kind === 'map') { const o = offerOf('map', guide, MAP); return guide.map && o ? { kind: 'map', id: 'map', widget: o.widget, sizes: o.sizes, group: 'area' } : null; }
  if (p.kind === 'highlight') {
    const q = (guide.highlights || []).find(x => x.id === p.id), o = offerOf('highlight', guide, HIGHLIGHT);
    return q ? { kind: 'highlight', id: q.id, widget: o.widget, sizes: o.sizes, group: 'area' } : null;
  }
  if (p.kind === 'section') {
    const s = (guide.sections || []).find(x => x.id === p.id);
    // A module that offers nothing (the house: the welcome card opens its page) has no tile; Getting around shown as a
    // highlight is not repeated as a tile.
    const o = s && offerOf(s.kind, guide);
    if (!s || !shown(s) || !o || (guide.transportCard && s.id === guide.transportCard)) return null;
    return { kind: 'section', id: s.id, widget: o.widget, sizes: o.sizes, group: s.group, sectionKind: s.kind };
  }
  return null;
}

// Today's Home, as it was drawn before the frame (views/home.js until 14 Nov 2026), in placements.
// At the house: rubbish first (wide), then the other tiles (half), in sections.json order.
// Around the house: the highlights (wide or half by their own flag), then the tiles (Local events are not one: they are
// in What's on): the first tall, the others half, a tile alone in its last row wide; the map last, wide.
export function defaultArrangement(guide) {
  const ok = s => !!thing({ kind: 'section', id: s.id }, guide);
  const secs = g => (guide.sections || []).filter(s => s.group === g && ok(s));
  const house = secs('house'), live = house.filter(s => offerOf(s.kind, guide).widget === 'live');
  const sec = (s, size) => ({ kind: 'section', id: s.id, size: offerOf(s.kind, guide).sizes.includes(size) ? size : offerOf(s.kind, guide).sizes[0] });
  const mosaic = secs('area').filter(s => s.kind !== 'events');
  const alone = i => i === mosaic.length - 1 && i >= 3 && (i - 3) % 2 === 0;
  return {
    house: [...live.map(s => sec(s, 'wide')), ...house.filter(s => !live.includes(s)).map(s => sec(s, 'half'))],
    area: [
      ...(guide.highlights || []).map(q => ({ kind: 'highlight', id: q.id, size: q.wide ? 'wide' : 'half' })),
      ...mosaic.map((s, i) => sec(s, i === 0 ? 'tall' : alone(i) ? 'wide' : 'half')),
      ...(guide.map ? [{ kind: 'map', size: 'wide' }] : [])
    ]
  };
}

// CSS grid's own auto-placement in two columns (row by row, never going back), for a list of sizes:
// cells[row] = [index or null, index or null], pos[i] = { r, c }.
export function place(sizes) {
  const cells = [], pos = [];
  const at = (r, c) => (cells[r] || [null, null])[c];
  const set = (r, c, i) => { while (cells.length <= r) cells.push([null, null]); cells[r][c] = i; };
  let r = 0, c = 0;
  sizes.forEach((s, i) => {
    if (s === 'wide') {
      if (c > 0) { r++; c = 0; }
      while (at(r, 0) != null || at(r, 1) != null) r++;
      set(r, 0, i); set(r, 1, i); pos.push({ r, c: 0 }); r++; c = 0;
      return;
    }
    const h = s === 'tall' ? 2 : 1;
    for (;;) {
      if (c > 1) { r++; c = 0; }
      if (at(r, c) == null && (h === 1 || at(r + 1, c) == null)) break;
      c++;
    }
    set(r, c, i); if (h === 2) set(r + 1, c, i); pos.push({ r, c }); c++;
  });
  return { cells, pos };
}
export const holes = sizes => { const { cells } = place(sizes), out = []; cells.forEach((row, r) => row.forEach((v, c) => { if (v == null) out.push({ r, c }); })); return out; };

// No holes (the frame's rule, replacing the old "a tile alone at the end is wide"): the first empty cell is filled by
// the item beside it. A half item becomes wide; a tall item becomes half when one cell beside it is filled, wide when
// none is. Repeated until the run has no hole. Returns new items, sizes changed where needed.
export function pack(items) {
  const out = items.map(x => ({ ...x }));
  for (let guard = 0; guard <= 2 * out.length + 1; guard++) {
    const { cells, pos } = place(out.map(x => x.size));
    const h = cells.flatMap((row, r) => row.map((v, c) => (v == null ? { r, c } : null))).find(Boolean);
    if (!h) return out;
    const nb = cells[h.r][1 - h.c];
    if (nb == null) throw new Error('frame: an empty row in the grid');
    const it = out[nb];
    if (it.size === 'tall') {
      const { r, c } = pos[nb], beside = [cells[r][1 - c], (cells[r + 1] || [])[1 - c]].filter(v => v != null).length;
      it.size = beside === 1 ? 'half' : 'wide';
    } else if (it.size === 'half') it.size = 'wide';
    else throw new Error('frame: a hole beside a wide item');
  }
  throw new Error('frame: packing did not settle');
}

// Runs: consecutive highlights are one run (the white cards' block), consecutive tiles and the map another (the grid).
export function runs(list) {
  const out = [];
  for (const p of list) {
    const type = p.kind === 'highlight' ? 'highlights' : 'tiles';
    if (!out.length || out[out.length - 1].type !== type) out.push({ type, items: [] });
    out[out.length - 1].items.push(p);
  }
  return out.map(x => ({ ...x, items: pack(x.items) }));
}

// The arrangement to draw: the guide's own (content/home.json) laid over the default, then packed.
// Returns { house: [runs], area: [runs] }, each item { kind, id, size, widget }.
export function resolve(arrangement, guide) {
  const def = defaultArrangement(guide), defSize = new Map();
  for (const g of GROUPS) for (const p of def[g]) defSize.set(keyOf(p), p.size);
  const placed = { house: [], area: [] }, seen = new Set();
  const item = (p, th, size) => ({ kind: th.kind, id: th.id, size, widget: th.widget });
  const own = arrangement && typeof arrangement === 'object' ? arrangement : null;
  for (const g of GROUPS) for (const p of (own && Array.isArray(own[g]) ? own[g] : own ? [] : def[g])) {
    const th = thing(p, guide);
    if (!th || (p.widget && p.widget !== th.widget)) continue;        // not there, off, not live, or not that widget
    const k = keyOf(th); if (seen.has(k)) continue;                    // placed once
    seen.add(k);
    const fallback = defSize.get(k) || (th.kind === 'highlight' ? ((guide.highlights || []).find(x => x.id === th.id)?.wide ? 'wide' : 'half') : th.sizes.includes('half') ? 'half' : th.sizes[0]);
    placed[g].push(item(p, th, th.sizes.includes(p.size) ? p.size : fallback));
  }
  // What the arrangement does not mention is added where the default puts it in its group: a highlight after the group's
  // last highlight (else first); a section's tile after the nearest tile before it in the default that is placed there,
  // else before the nearest one after it, else before the map when the group ends with it, else last; the map last.
  for (const g of GROUPS) def[g].forEach((p, i) => {
    const k = keyOf(p); if (seen.has(k)) return;
    seen.add(k);
    const th = thing(p, guide), L = placed[g], it = item(p, th, p.size);
    if (th.kind === 'map') { L.push(it); return; }
    if (th.kind === 'highlight') { let at = 0; L.forEach((x, n) => { if (x.kind === 'highlight') at = n + 1; }); L.splice(at, 0, it); return; }
    const idx = q => (q.kind === 'section' ? L.findIndex(x => keyOf(x) === keyOf(q)) : -1);
    for (let j = i - 1; j >= 0; j--) { const at = idx(def[g][j]); if (at >= 0) { L.splice(at + 1, 0, it); return; } }
    for (let j = i + 1; j < def[g].length; j++) { const at = idx(def[g][j]); if (at >= 0) { L.splice(at, 0, it); return; } }
    L.splice(L.length && L[L.length - 1].kind === 'map' ? L.length - 1 : L.length, 0, it);
  });
  return { house: runs(placed.house), area: runs(placed.area) };
}

// content/home.json, checked against the guide's own files (check-content.js). The guide here holds every quick.json
// item (seasons aside: a card left out today is still a known id). Returns plain messages, empty when all is right.
export function check(arrangement, guide) {
  const out = [], A = arrangement;
  if (!A || typeof A !== 'object' || Array.isArray(A)) return ['home.json: must be an object with "house" and "area"'];
  for (const k of Object.keys(A)) if (k !== '_doc' && !GROUPS.includes(k)) out.push(`home.json: unknown group "${k}" (only "house" and "area")`);
  const seen = new Set();
  for (const g of GROUPS) {
    if (A[g] === undefined) { out.push(`home.json: the group "${g}" is missing`); continue; }
    if (!Array.isArray(A[g])) { out.push(`home.json: "${g}" must be a list of placements`); continue; }
    A[g].forEach((p, i) => {
      const at = `home.json ${g}[${i}]`;
      if (!p || typeof p !== 'object') { out.push(`${at}: not a placement`); return; }
      if (!KINDS.includes(p.kind)) { out.push(`${at}: unknown kind "${p.kind}" (section, highlight or map)`); return; }
      if (p.kind !== 'map' && !p.id) { out.push(`${at}: a ${p.kind} needs an "id"`); return; }
      const name = p.kind === 'map' ? 'the map' : `${p.kind} "${p.id}"`;
      let th = thing(p, guide);
      if (!th) {
        if (p.kind === 'section') {
          const s = (guide.sections || []).find(x => x.id === p.id);
          out.push(!s ? `${at}: no section "${p.id}" in sections.json (or its module is off)`
            : !offerOf(s.kind, guide) ? `${at}: section "${p.id}" is the house page, which the welcome card opens: it has no tile`
            : guide.transportCard === s.id ? `${at}: section "${p.id}" is shown as a highlight (transport.json "tile"): place it as a highlight`
            : `${at}: section "${p.id}" is not live, so guests do not see it`);
        } else if (p.kind === 'highlight') out.push(`${at}: no highlight "${p.id}" (an item of quick.json, or the transport section with a "tile")`);
        else out.push(`${at}: the map's module is off`);
        return;
      }
      if (p.widget !== undefined && !WIDGETS.includes(p.widget)) out.push(`${at}: unknown widget "${p.widget}" (entry, live or highlight)`);
      else if (p.widget !== undefined && p.widget !== th.widget) out.push(`${at}: ${name} has no "${p.widget}" widget (it is "${th.widget}")`);
      if (p.size !== undefined && !SIZES.includes(p.size)) out.push(`${at}: unknown size "${p.size}" (half, wide or tall)`);
      else if (p.size !== undefined && !th.sizes.includes(p.size)) out.push(`${at}: ${name} is not offered "${p.size}" (only ${th.sizes.join(', ')})`);
      const k = keyOf(th);
      if (seen.has(k)) out.push(`${at}: ${name} is placed twice`);
      seen.add(k);
    });
  }
  return out;
}
