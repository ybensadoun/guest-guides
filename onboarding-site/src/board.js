/* ---------- The step Home page (step id "tiles"): a board of the guide's Home (Yohann, 15 Nov 2026, "The board") ----------
   A plan of the guide's Home whose tiles a host drags to move, taps to resize, and adds to. It writes the guide's own
   arrangement, the file "home" among the guide's files (the engine's optional content/home.json); a guide whose host
   changes nothing has none and looks as it always did. The board is drawn by the engine's own frame and offers (FR,
   pasted by build.py from engine/src/modules/frame.js and each module's offers.js), never a second copy of a rule.
   The rules, who decided them and when: engine/src/modules/README.md, "The arranger (maker)". */
const HB_DOC = 'Home’s arrangement: engine/src/modules/README.md';
const HB = { sel: null, add: null, q: '', scroll: false };       // the selected tile (its key), the open Add choice, its search
const HBD = { st: null, noClick: false };                         // a drag under way
const HB_PHONE = '(max-width:700px)';

// The guide as the frame sees it (engine/src/modules/frame.js), from the draft the editor holds. It follows the engine:
// content.js MODULE_ON (a module switched off in site.json disappears; markets with none found too, markets/plan.js
// noneFound), SECTIONS, QUICK_ON and QUICK_ALL, TR_SEC with transport/plan.js cardOf (Getting around's card when its file
// has a "tile") and TRANSPORT_CARD; views/home.js frameGuide; highlights/data.js shown (a card closed for the season and
// opening in more than 30 days is left out: highlights/plan.js shownOn, which is engine/src/season.js hiddenOn, pasted).
// all: every card, seasons aside, as check() wants it (frame.js check) and as the arrangement is written.
function hbGuide(all = false, now = new Date()) {
  const c = edC(), f = c.files || {}, mods = (c.site || {}).modules || {};
  const on = id => mods[id] !== false && !(id === 'markets' && !(((f.markets || {}).markets) || []).length);
  const secs = (((f.sections || {}).sections) || []).filter(s => s && on(s.id));
  const tr = secs.find(s => s.kind === 'transport' && s.status === 'live'), trData = tr && f[tr.file || tr.id];
  const card = trData && trData.tile ? { id: tr.id, wide: !!trData.tile.wide } : null;
  const quick = on('quick') ? (((f.quick || {}).items) || []) : [];
  return {
    sections: secs.map(({ id, kind, group, status }) => ({ id, kind, group, status })),
    highlights: [...quick.filter(q => all || !hiddenOn(q, PL_SK, now)).map(q => ({ id: q.id, wide: !!q.wide })), ...(card ? [card] : [])],
    map: on('map'), transportCard: card ? tr.id : null, offers: FR.OFFERS
  };
}
const hbOwn = () => edF().home || null;
const hbView = () => FR.resolve(hbOwn(), hbGuide());                    // what guests see now, packed
const hbPicks = () => FR.placements(hbOwn(), hbGuide(true));           // the host's sizes, before the no holes rule
const hbVis = (R, g) => R[g].flatMap(r => r.items.map(FR.keyOf));
const hbItems = R => FR.GROUPS.flatMap(g => R[g].flatMap(r => r.items.map(x => ({ ...x, g }))));
const hbPlain = P => ({ house: P.house.map(hbP), area: P.area.map(hbP) });
const hbP = x => (x.kind === 'map' ? { kind: 'map', size: x.size } : { kind: x.kind, id: x.id, size: x.size });
// The visible things of a group in a new order, written into the whole list (cards hidden for the season keep their slots).
function hbReorder(P, g, vis) {
  const L = P[g], want = new Set(vis), slots = [], by = new Map(L.map(x => [FR.keyOf(x), x]));
  L.forEach((x, i) => { if (want.has(FR.keyOf(x))) slots.push(i); });
  const out = L.slice(); slots.forEach((i, n) => { out[i] = by.get(vis[n]); }); P[g] = out;
}
// Every change to the arrangement: the whole arrangement written out (the host's sizes, the default's for what was never
// touched), then the change, then checked by the frame's own check(). A draft until "Publish changes" (cmQueue).
function hbWrite(change) {
  const G = hbGuide(true), P = FR.placements(hbOwn(), G);
  change(P, G);
  edF().home = { _doc: HB_DOC, ...hbPlain(P) };
  hbTidy();
}
// A placement the guide no longer has (a card removed, a section switched off) leaves the file, so that it always passes
// the frame's check (engine/scripts/check-content.js). Run before every save (cmQueue).
function hbTidy() {
  const h = hbOwn(); if (!h || typeof h !== 'object') return;
  const G = hbGuide(true), seen = new Set();
  for (const g of FR.GROUPS) h[g] = (Array.isArray(h[g]) ? h[g] : []).filter(p => { const th = FR.thing(p, G); if (!th) return false; const k = FR.keyOf(th); if (seen.has(k)) return false; seen.add(k); if (!th.sizes.includes(p.size)) p.size = th.sizes.includes('half') ? 'half' : th.sizes[0]; if (p.widget && p.widget !== th.widget) delete p.widget; return true; });
  const bad = FR.check(h, G); if (bad.length) console.warn('home:', bad);
}

/* --- Names and words --- */
const hbCard = id => {
  const f = edF(), items = ((f.quick || {}).items) || [], i = items.findIndex(q => q.id === id);
  if (i >= 0) return { q: items[i], i, name: cName(items[i]) };
  const T = f[(((f.sections || {}).sections || []).find(s => s.id === id) || {}).file || id] || {};
  return { tr: true, name: edShown((T.tile || {}).name) || 'Getting around' };
};
// A section by the name hosts know it by in the maker: Guide sections' names (ED_SEC), else its step's title.
const hbSecName = id => (ED_SEC[id] || [])[0] || (CSTEPS.find(m => m.sec === id) || {}).title || String(id).replace(/[-_]+/g, ' ').replace(/^./, c => c.toUpperCase());
const hbName = x => x.kind === 'map' ? 'Map' : x.kind === 'highlight' ? hbCard(x.id).name : hbSecName(x.id);
const hbKind = x => x.kind === 'section' ? ((hbGuide().sections.find(s => s.id === x.id) || {}).kind || '') : x.kind;
// What a tile shows guests, one line per kind of widget.
const HB_SAYS = { garbage: 'Shows what goes out tonight.', markets: 'Opens your markets and says how many are on today.', spots: 'Opens your list of places.', events: 'Names the next event, with its date.', info: 'Opens this page of your guide.', contacts: 'Opens the numbers guests may need.', transport: 'Opens taxis, train stations and bus stops.', map: 'Opens the map of every place in your guide.', highlight: 'One place, one tap away, with open or closed now.' };
const hbSays = x => x.kind === 'highlight' && hbCard(x.id).tr ? 'Opens Getting around, one tap away.' : HB_SAYS[hbKind(x)] || HB_SAYS.info;
// A thing offered in one size only says so, in one line, instead of a switch.
const HB_ONE = { garbage: 'Always wide: it shows tonight’s bins.', map: 'Always wide: a bar across the page.', events: 'Always wide: it names the next event and its date.' };
const HB_SIZES = [['half', 'Half'], ['wide', 'Wide'], ['tall', 'Tall']];
// Shown in another size than the host's pick (the frame's no holes rule): one quiet line says why.
const hbWhy = (pick, shown) => pick === shown ? '' : shown === 'wide' ? 'Shown wide for now: it is alone in its row.' : 'Shown half for now: a tall tile needs two tiles beside it.';

/* --- Colours: the guide's own, in its colour world (worldTok, preview.js) through the engine's SECTION_LOOK (ENG_LOOK) and
   app.css's names and shapes (ENG_TILE), all pasted from the engine by build.py --- */
function hbTok() {
  const t = worldTok(edWorldNow());
  const v = x => { let k = (String(x).match(/^var\((--[\w-]+)\)$/) || [])[1]; if (!k) return x; for (let i = 0; i < 4 && ENG_TILE.k[k]; i++) k = ENG_TILE.k[k]; return t[k] || x; };
  return { t, v };
}
const HB_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const hbId = k => 'hbt_' + k.replace(/[^a-zA-Z0-9]+/g, '_');
function hbTile(x, C) {
  const key = FR.keyOf(x), sel = HB.sel === key, cls = `hb-t s-${x.size}${sel ? ' sel' : ''}`, at = `id="${hbId(key)}" data-hbk="${esc(key)}" aria-pressed="${sel}"`;
  if (x.kind === 'highlight') {
    const [bg] = ENG_TILE.card[x.id] || ENG_TILE.card._;
    return `<button type="button" class="${cls} card" ${at} style="--c:${C.t['--white']};--i:${C.t['--ink-card']};--q:${C.v(`var(${bg})`)}"><i class="hb-q" aria-hidden="true"></i><span class="hb-n" translate="no">${esc(hbName(x))}</span></button>`;
  }
  const look = ENG_LOOK[x.kind === 'map' ? 'map' : x.id] || ENG_LOOK.todo, bg = C.v(look.color), shape = ENG_TILE.shape[x.kind === 'map' ? 'map' : x.id];
  const line = bg.toUpperCase() === String(C.t['--white']).toUpperCase() ? `;--b:${C.t['--ink']}` : '';
  return `<button type="button" class="${cls}" ${at} style="--c:${bg};--i:${look.ink ? C.t['--ink'] : '#fff'}${shape ? `;--s:${C.v(`var(${shape})`)}` : ';--s:transparent'}${line}">${look.icon}<span class="hb-n">${esc(hbName(x))}</span></button>`;
}
function hbPlan(R, C) {
  const grp = g => `<div class="hb-grp" data-g="${g}">${R[g].map(run => `<div class="hb-grid${run.type === 'highlights' ? ' hl' : ''}">${run.items.map(x => hbTile(x, C)).join('')}</div>`).join('')}</div>`;
  return `<div class="hb-plan" role="group" aria-label="Your home page" style="--hp:${C.t['--paper']};--hm:${C.t['--muted']};--hl:${C.t['--line']}">
    <div class="hb-fix">${HB_LOCK}<span>Welcome card</span><small>always first</small></div>
    <p class="hb-g">At the house</p>${grp('house')}
    <p class="hb-g">Around the house</p>${grp('area')}
    <div class="hb-fix">${HB_LOCK}<span>What’s on</span><small>always last</small></div></div>`;
}

/* --- The selected tile: its panel (desktop) and its bar (phone) --- */
function hbSel(R) {
  const all = hbItems(R), x = all.find(y => FR.keyOf(y) === HB.sel); if (!x) return null;
  const vis = hbVis(R, x.g), i = vis.indexOf(HB.sel), th = FR.thing(x, hbGuide());
  const pick = (hbPicks()[x.g].find(y => FR.keyOf(y) === HB.sel) || x).size;
  const step = x.kind === 'section' && cmSteps().find(m => m.sec === x.id);
  return { x, i, n: vis.length, sizes: th ? th.sizes : [x.size], pick, why: hbWhy(pick, x.size), name: hbName(x), card: x.kind === 'highlight' ? hbCard(x.id) : null, step, events: hbKind(x) === 'events' };
}
const hbSizes = (s, pre) => s.sizes.length > 1
  ? `<div class="hb-size" role="group" aria-label="Size" style="--n:${s.sizes.length}">${HB_SIZES.filter(([k]) => s.sizes.includes(k)).map(([k, n]) => `<button type="button" id="${pre}_${k}" data-hbsize="${k}" aria-pressed="${s.pick === k}"><span class="sh ${k}" aria-hidden="true">${k === 'half' ? '<b class="on"></b><b></b><b></b><b></b>' : k === 'wide' ? '<b class="on"></b><b></b><b></b>' : '<b class="on"></b><b></b>'}</span>${n}</button>`).join('')}</div>`
  : `<p class="hb-one">${esc(HB_ONE[hbKind(s.x)] || 'Always wide: a bar across the page.')}</p>`;
const hbWordsBtn = s => s.card.tr ? `<a class="btn small" href="#transport">Edit its words</a>` : `<button class="btn small" type="button" data-hbwords="${esc(s.x.id)}">Edit its words</button>`;
function hbPanel(s) {
  const acts = [s.step ? `<a class="btn small" href="#${s.step.id}">Edit this section</a>` : '', s.card ? hbWordsBtn(s) : '',
    s.card || s.events ? `<button class="btn small" type="button" data-hbdel="${esc(FR.keyOf(s.x))}">Remove from the home page</button>` : ''].filter(Boolean).join('');
  return `<div class="hb-pan sel" role="region" aria-labelledby="hbPanName"><h3 id="hbPanName"${s.card ? ' translate="no"' : ''}>${esc(s.name)}</h3><p>${esc(hbSays(s.x))}</p>
    <span class="hb-l">Size</span>${hbSizes(s, 'hbs')}${s.why ? `<p class="hb-why">${esc(s.why)}</p>` : ''}
    <span class="hb-l">Position</span><div class="hb-mv"><button type="button" id="hbEarlier" data-hbmove="-1" aria-label="Move earlier"${s.i ? '' : ' disabled'}>↑ Earlier</button><button type="button" id="hbLater" data-hbmove="1" aria-label="Move later"${s.i < s.n - 1 ? '' : ' disabled'}>↓ Later</button></div>
    ${acts ? `<div class="hb-acts">${acts}</div>` : ''}</div>`;
}
function hbDock(s) {
  const acts = [s.card ? hbWordsBtn(s) : '', s.card || s.events ? `<button class="btn small" type="button" data-hbdel="${esc(FR.keyOf(s.x))}">Remove</button>` : '', !s.card && s.step ? `<a class="btn small" href="#${s.step.id}">Edit this section</a>` : ''].filter(Boolean).join('');
  return `<div class="hb-dock" role="region" aria-labelledby="hbDockName"><div class="hb-dr"><b id="hbDockName"${s.card ? ' translate="no"' : ''}>${esc(s.name)}</b><button class="ar" type="button" id="hbdEarlier" data-hbmove="-1" aria-label="Move earlier"${s.i ? '' : ' disabled'}>↑</button><button class="ar" type="button" id="hbdLater" data-hbmove="1" aria-label="Move later"${s.i < s.n - 1 ? '' : ' disabled'}>↓</button></div>
    ${hbSizes(s, 'hbd')}${s.why ? `<p class="hb-why">${esc(s.why)}</p>` : ''}${acts ? `<div class="hb-acts">${acts}</div>` : ''}</div>`;
}

/* --- Add to your home page: only what the guide really has and Home does not show yet --- */
const HB_LISTS = [['restaurants', 'A place to eat', 'One of your {n} places, with open or closed now'], ['todo', 'Something to do', 'One of your {n} places'], ['nightlife', 'Nightlife', 'One of your {n} places']];
function hbOffers(R) {
  const f = edF(), G = hbGuide(), on = id => G.sections.some(s => s.id === id), placed = new Set(hbItems(R).map(FR.keyOf)), out = [];
  for (const [id, title, sub] of HB_LISTS) {
    const items = ((f[id] || {}).items) || [], all = items.filter(it => edShown(it.name)), free = items.map((it, i) => ({ it, i })).filter(({ it }) => edShown(it.name) && !cPinned(it));
    if (on(id) && free.length) out.push({ k: id, title, sub: sub.replace('{n}', all.length), look: id, free });
  }
  out.push({ k: 'own', title: 'Another place', sub: 'A bar, restaurant or shop that is not in your lists, in your own words', look: 'quick' });
  const tr = G.sections.find(s => s.kind === 'transport' && s.status === 'live'), T = tr && f[tr.file || tr.id];
  if (tr && T && !T.tile && ((T.taxis || []).length || (T.stations || []).length)) out.push({ k: 'tr', title: 'Getting around', sub: 'As a card: taxis and stations, one tap away', look: 'transport' });
  const ev = G.sections.find(s => s.kind === 'events'), evTh = ev && FR.thing({ kind: 'section', id: ev.id }, G);
  if (evTh && !placed.has(FR.keyOf(evTh))) out.push({ k: 'events', id: ev.id, title: 'Local events', sub: 'The next event, with its date', look: 'events' });
  return out;
}
function hbAdd(R, C) {
  const opts = hbOffers(R); if (!opts.length) return '';
  const col = o => C.v((ENG_LOOK[o.look] || {}).color || 'var(--strong-card)');
  return `<div class="hb-pan hb-addp"><h3>Add to your home page</h3><p>What each part of your guide can show here.</p><div class="hb-opts">${opts.map(o => {
    const open = HB.add === o.k, head = `<button class="hb-opt" type="button" data-hbadd="${o.k}" aria-expanded="${open}"><span class="hb-ic" style="--c:${col(o)}" aria-hidden="true"></span><span><b>${esc(o.title)}</b><small>${esc(o.sub)}</small></span><em aria-hidden="true">${open ? '‹' : '›'}</em></button>`;
    if (!open) return head;
    if (o.free) return `${head}<div class="hb-pick"><div class="f full"><label class="sr" for="hbQ">Find a place</label><input type="text" id="hbQ" autocomplete="off" enterkeyhint="search" placeholder="Name or town" value="${esc(HB.q)}"></div><div class="hb-pl" id="hbPl">${hbPickList(o)}</div></div>`;
    if (o.k === 'own') return `${head}<div class="hb-pick hb-row">${ED_TILES.map(([icon, label]) => `<button class="btn small" type="button" data-hbown="${icon}">+ ${esc(label)}</button>`).join('')}</div>`;
    return head;
  }).join('')}</div></div>`;
}
function hbPickList(o) {
  const q = amFold(HB.q || ''), hits = o.free.filter(({ it }) => !q || amFold(`${edShown(it.name)} ${typeof it.town === 'string' ? it.town : ''}`).includes(q));
  return hits.length ? hits.map(({ it, i }) => `<button type="button" class="hb-pi" data-hbpin="files/${o.k}/items/${i}"><b translate="no">${esc(edShown(it.name))}</b>${typeof it.town === 'string' && it.town ? `<small translate="no">${esc(it.town)}</small>` : ''}</button>`).join('') : '<p class="hint">Nothing with that name.</p>';
}

/* --- The step --- */
function hbBox() {
  const R = hbView(), C = hbTok(), s = hbSel(R); if (!s) HB.sel = null;
  return `<div class="hb">${hbPlan(R, C)}<div class="hb-side">${s ? hbPanel(s) : ''}${hbAdd(R, C)}
    ${hbOwn() ? `<p class="hb-foot"><button type="button" class="hb-link" id="hbReset" data-hbreset>Back to the arrangement we suggest</button></p>` : ''}</div></div>${s ? hbDock(s) : ''}`;
}
function hbStepHTML() {
  const items = ((edF().quick || {}).items) || [];
  setTimeout(hbAfter, 0);
  return `<p class="hint hb-hint">Drag a tile to move it, tap it to change its size.</p><div id="hbBox">${hbBox()}</div>
    ${items.length ? `<h3 class="cm-h">Places on your home page</h3><div class="cm-list">${items.map((it, i) => cItem('files/quick/items', it, i, 'tile')).join('')}</div>` : ''}
    <p class="hint">Taxis, train stations and bus stops go in <a href="#transport">Getting around</a>, which can have its own tile here.</p><div id="hbPad" aria-hidden="true"></div>`;
}
// The board and its panels drawn again in place (a selection, a search), the rest of the page as it is.
function hbRedraw() {
  const b = document.getElementById('hbBox'); if (!b) return;
  const fid = document.activeElement && document.activeElement.id;
  b.innerHTML = hbBox();
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
  hbAfter();
}
// On a phone the selected tile's bar sits above the step bar, and the page scrolls so that the tile stays above it.
function hbAfter() {
  const pad = document.getElementById('hbPad'), dock = document.querySelector('.hb-dock'), scroll = HB.scroll; HB.scroll = false;
  if (!pad) return;
  if (!dock || !matchMedia(HB_PHONE).matches) { pad.style.height = ''; return; }
  const nb = document.getElementById('navbar'), r = nb && !nb.hidden ? nb.getBoundingClientRect() : null;
  dock.style.bottom = (r && r.height ? Math.max(0, innerHeight - r.top) : 0) + 8 + 'px';
  pad.style.height = dock.offsetHeight + 16 + 'px';
  const t = scroll && document.querySelector('.hb-plan .hb-t.sel'); if (!t) return;
  const a = t.getBoundingClientRect(), room = dock.getBoundingClientRect().top - 12;
  if (a.bottom > room) scrollBy(0, a.bottom - room); else if (a.top < 12) scrollBy(0, a.top - 12);
}
addEventListener('resize', () => { if (CM.on && route() === 'tiles') hbAfter(); });
// What a screen reader hears after a move: "Markets is now before Eat and drink."
function hbSay(key, vis, R) {
  let el = document.getElementById('hbLive');
  if (!el) { el = document.createElement('p'); el.id = 'hbLive'; el.className = 'sr'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  const all = hbItems(R), nm = k => hbName(all.find(x => FR.keyOf(x) === k) || {}), i = vis.indexOf(key);
  el.textContent = i < vis.length - 1 ? `${nm(key)} is now before ${nm(vis[i + 1])}.` : `${nm(key)} is now after ${nm(vis[i - 1])}.`;
}
const hbDone = () => { cmQueue(); render(); };
function hbSelect(key) { HB.sel = key; HB.scroll = true; hbRedraw(); }
function hbMove(dir) {
  const R = hbView(), x = hbItems(R).find(y => FR.keyOf(y) === HB.sel); if (!x) return;
  const vis = hbVis(R, x.g), i = vis.indexOf(HB.sel), j = i + dir; if (j < 0 || j >= vis.length) return;
  [vis[i], vis[j]] = [vis[j], vis[i]];
  hbWrite(P => hbReorder(P, x.g, vis)); HB.scroll = true; hbDone(); hbSay(HB.sel, vis, hbView());
}
function hbSize(size) {
  const key = HB.sel; if (!key) return;
  hbWrite(P => { for (const g of FR.GROUPS) for (const y of P[g]) if (FR.keyOf(y) === key) y.size = size; }); HB.scroll = true; hbDone();
}
// Remove from the home page: what unpinning or deleting a card does elsewhere (its place stays in its list; a card of the
// host's own words goes, after "Sure? Tap again"), Getting around's switch "Show as a tile on the home page", or a Local
// events tile out of the arrangement.
function hbRemove(btn) {
  const key = btn.dataset.hbdel, [kind, id] = key.split(':');
  if (kind === 'highlight') {
    const c = hbCard(id);
    if (c.tr) cmTrTile();
    else if (c.q) {
      if (!c.q.from && btn.dataset.sure !== '1') { const was = btn.textContent; btn.dataset.sure = '1'; btn.textContent = 'Sure? Tap again'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.textContent = was; } }, 4000); return; }
      edF().quick.items.splice(c.i, 1); for (const k of [...CM.open]) if (k.startsWith('files/quick/items/')) CM.open.delete(k);
    }
    hbTidy();
  } else hbWrite(P => { for (const g of FR.GROUPS) P[g] = P[g].filter(y => FR.keyOf(y) !== key); });
  HB.sel = null; hbDone();
}
function hbAddDone(key) { HB.add = null; HB.q = ''; HB.sel = key; HB.scroll = true; hbDone(); }
document.addEventListener('input', e => {
  if (!CM.on || e.target.id !== 'hbQ') return;
  HB.q = e.target.value; const o = hbOffers(hbView()).find(x => x.k === HB.add), l = document.getElementById('hbPl'); if (o && l) l.innerHTML = hbPickList(o);
});
document.addEventListener('click', e => {
  if (!CM.on || route() !== 'tiles') return;
  if (HBD.noClick && e.target.closest && e.target.closest('.hb-plan')) { HBD.noClick = false; e.preventDefault(); e.stopPropagation(); return; }
  const t = e.target.closest && e.target.closest('[data-hbk],[data-hbsize],[data-hbmove],[data-hbadd],[data-hbpin],[data-hbown],[data-hbdel],[data-hbwords],[data-hbreset]');
  if (!t) { if (HB.sel && !(e.target.closest && e.target.closest('.hb-plan, .hb-dock, .hb-side'))) { HB.sel = null; hbRedraw(); } return; }
  const d = t.dataset;
  if (d.hbk) return hbSelect(d.hbk);
  if (d.hbsize) return hbSize(d.hbsize);
  if (d.hbmove) return hbMove(+d.hbmove);
  if (d.hbdel) return hbRemove(t);
  if (d.hbwords) { const c = hbCard(d.hbwords); if (!c.q) return; const p = 'files/quick/items/' + c.i; CM.open.add(p); HB.sel = null; render();   /* the tile let go: on a phone its bar would cover the card */ const el = document.querySelector(`details.cmi[data-open="${CSS.escape(p)}"]`); if (el) el.scrollIntoView({ block: 'start' }); return; }
  if (d.hbadd) {
    const o = hbOffers(hbView()).find(x => x.k === d.hbadd); if (!o) return;
    if (o.k === 'tr') { cmTrTile(); hbTidy(); return hbAddDone('highlight:' + hbGuide().transportCard); }
    if (o.k === 'events') { hbWrite(P => { const L = P.area, at = L.length && L[L.length - 1].kind === 'map' ? L.length - 1 : L.length; L.splice(at, 0, { kind: 'section', id: o.id, size: 'wide' }); }); return hbAddDone('section:' + o.id); }
    HB.add = HB.add === o.k ? null : o.k; HB.q = ''; hbRedraw();
    if (HB.add && o.free && matchMedia('(pointer:fine)').matches) { const q = document.getElementById('hbQ'); if (q) q.focus({ preventScroll: true }); }
    return;
  }
  if (d.hbpin) { const it = edGet(edC(), edPath(d.hbpin)); if (!it || cPinned(it)) return; cmPin(d.hbpin); const q = edF().quick.items.find(x => x.from === it.id); return hbAddDone('highlight:' + (q && q.id)); }
  if (d.hbown) { edAddTile(d.hbown); const s = edC().site = edC().site || {}; s.modules = { ...(s.modules || {}), quick: true }; const items = edF().quick.items; return hbAddDone('highlight:' + items[items.length - 1].id); }
  if (d.hbreset !== undefined) {
    if (d.sure !== '1') { const was = t.textContent; d.sure = '1'; t.textContent = 'Sure? Tap again'; setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = was; } }, 4000); return; }
    delete edF().home; HB.sel = null; hbDone();
  }
});

/* --- Drag: with a mouse, after about 6 px of movement; on a touch screen after a long press (300 ms), so that the page
   still scrolls under a finger. The other tiles make room as it goes (the order tried goes through the frame's resolve);
   dropping commits, Escape or dropping outside its group cancels; near the top or bottom edge the page scrolls. --- */
document.addEventListener('pointerdown', e => {
  if (!CM.on || HBD.st || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const t = e.target.closest && e.target.closest('.hb-plan [data-hbk]'); if (!t) return;
  const touch = e.pointerType !== 'mouse';
  HBD.st = { key: t.dataset.hbk, el: t, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch, on: false, moved: false, timer: touch ? setTimeout(hbLift, 300) : 0 };
});
document.addEventListener('pointermove', e => {
  const s = HBD.st; if (!s || e.pointerId !== s.id) return;
  s.x = e.clientX; s.y = e.clientY; const d = Math.hypot(s.x - s.x0, s.y - s.y0);
  if (!s.on) { if (s.touch) { if (d > 10) hbEnd(); } else if (d > 6) hbLift(); return; }
  if (d > 6) s.moved = true;
  hbDragMove();
});
document.addEventListener('pointerup', e => { const s = HBD.st; if (!s || e.pointerId !== s.id) return; if (s.on) hbDrop(); else hbEnd(); });
document.addEventListener('pointercancel', e => { const s = HBD.st; if (!s || e.pointerId !== s.id) return; const was = s.on; hbEnd(); if (was) render(); });
document.addEventListener('touchmove', e => { if (HBD.st && HBD.st.on) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.hb-plan [data-hbk]')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && HBD.st && HBD.st.on) { e.preventDefault(); hbEnd(); render(); } });
function hbLift() {
  const s = HBD.st; if (!s || s.on || !s.el.isConnected) return;
  clearTimeout(s.timer); s.on = true;
  const r = s.el.getBoundingClientRect(); s.dx = s.x0 - r.left; s.dy = s.y0 - r.top;
  s.g = s.el.closest('.hb-grp').dataset.g;
  s.els = new Map([...document.querySelectorAll('.hb-plan [data-hbk]')].map(el => [el.dataset.hbk, el]));
  s.G = hbGuide(true); s.Gn = hbGuide(); s.P0 = FR.placements(hbOwn(), s.G);
  s.vis0 = hbVis(FR.resolve(hbOwn(), s.Gn), s.g); s.vis = s.vis0.slice(); s.out = false;
  const grid = s.el.closest('.hb-grid'), cs = getComputedStyle(grid); s.row = parseFloat(cs.gridAutoRows) || 66; s.gap = parseFloat(cs.rowGap) || 8;
  const gh = s.el.cloneNode(true); gh.removeAttribute('id'); delete gh.dataset.hbk; gh.classList.add('hb-ghost'); gh.classList.remove('sel'); gh.setAttribute('aria-hidden', 'true'); gh.setAttribute('translate', 'no');   // already in the maker's language: not translated again
  gh.style.width = r.width + 'px'; gh.style.height = r.height + 'px'; document.body.appendChild(gh); s.ghost = gh;
  s.el.classList.add('hb-ph'); document.body.classList.add('hb-dragging');
  hbGhostAt(); s.raf = requestAnimationFrame(hbEdge);
  if (s.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (er) { /* no vibration */ } }
}
const hbGhostAt = () => { const s = HBD.st; s.ghost.style.left = s.x - s.dx + 'px'; s.ghost.style.top = s.y - s.dy + 'px'; };
// The frame's Home for an order tried (the group's visible things in that order).
const hbTry = vis => { const s = HBD.st, P = { house: s.P0.house.slice(), area: s.P0.area.slice() }; hbReorder(P, s.g, vis); return FR.resolve(hbPlain(P), s.Gn); };
// Where the dragged tile's slot lands in an order tried, in the group's own pixels: the runs stacked, each laid out by the
// grid's own placement (FR.place), rows and gaps as the board's CSS draws them.
function hbSlot(vis, W) {
  const s = HBD.st, col = (W - s.gap) / 2; let y = 0;
  for (const run of hbTry(vis)[s.g]) {
    const { cells, pos } = FR.place(run.items.map(x => x.size)), i = run.items.findIndex(x => FR.keyOf(x) === s.key);
    if (i >= 0) { const { r, c } = pos[i], z = run.items[i].size; return { x: z === 'wide' ? 0 : c * (col + s.gap), y: y + r * (s.row + s.gap), w: z === 'wide' ? W : col, h: z === 'tall' ? 2 * s.row + s.gap : s.row }; }
    y += cells.length * (s.row + s.gap);
  }
  return null;
}
// The order tried, drawn at once: the same elements moved into the runs the frame makes of it, each in the size it shows.
function hbFlow(vis) {
  const s = HBD.st, R = hbTry(vis), grp = document.querySelector(`.hb-plan .hb-grp[data-g="${s.g}"]`); if (!grp) return;
  grp.replaceChildren(...R[s.g].map(run => { const d = document.createElement('div'); d.className = 'hb-grid' + (run.type === 'highlights' ? ' hl' : '');
    for (const x of run.items) { const el = s.els.get(FR.keyOf(x)); if (!el) continue; el.classList.remove('s-half', 's-wide', 's-tall'); el.classList.add('s-' + x.size); d.appendChild(el); }
    return d; }));
}
function hbDragMove() {
  const s = HBD.st; hbGhostAt();
  const grp = document.querySelector(`.hb-plan .hb-grp[data-g="${s.g}"]`); if (!grp) return;
  const gr = grp.getBoundingClientRect(), m = 28, inside = s.x > gr.left - m && s.x < gr.right + m && s.y > gr.top - m && s.y < gr.bottom + m;
  if (!inside) { if (!s.out) { s.out = true; hbFlow(s.vis0); } return; }
  if (s.out) { s.out = false; hbFlow(s.vis); }
  // The order whose slot is under the pointer (or nearest to it): the tile goes where the pointer is, and staying there
  // keeps it there (the order drawn now wins a tie, then the nearest place), so the tiles never swap back and forth.
  const px = s.x - gr.left, py = s.y - gr.top, rest = s.vis.filter(x => x !== s.key), cur = s.vis.indexOf(s.key);
  const far = r => (r ? Math.hypot(Math.max(0, r.x - px, px - r.x - r.w), Math.max(0, r.y - py, py - r.y - r.h)) : Infinity);
  let best = null;
  for (let j = 0; j <= rest.length; j++) {
    const v = rest.slice(); v.splice(j, 0, s.key);
    const d = far(hbSlot(v, gr.width)), score = [d, j === cur ? 0 : 1, Math.abs(j - cur)];
    if (!best || score[0] < best.s[0] - 0.5 || (Math.abs(score[0] - best.s[0]) <= 0.5 && (score[1] < best.s[1] || (score[1] === best.s[1] && score[2] < best.s[2])))) best = { v, s: score };
  }
  if (best && best.v.join() !== s.vis.join()) { s.vis = best.v; hbFlow(best.v); }
}
// Near the top of the screen, or the step bar at the bottom, the page scrolls.
function hbEdge() {
  const s = HBD.st; if (!s || !s.on) return;
  const nb = document.getElementById('navbar'), r = nb && !nb.hidden ? nb.getBoundingClientRect() : null, bottom = r && r.height ? r.top : innerHeight, edge = 64;
  const v = s.y < edge ? -Math.ceil((edge - s.y) / 3) : s.y > bottom - edge ? Math.ceil((s.y - bottom + edge) / 3) : 0;
  if (v) { const y = scrollY; scrollBy(0, v); if (scrollY !== y) hbDragMove(); }
  s.raf = requestAnimationFrame(hbEdge);
}
function hbEnd() {
  const s = HBD.st; HBD.st = null; if (!s) return;
  clearTimeout(s.timer); cancelAnimationFrame(s.raf);
  if (s.ghost) s.ghost.remove(); if (s.el) s.el.classList.remove('hb-ph'); document.body.classList.remove('hb-dragging');
}
function hbDrop() {
  const s = HBD.st; hbEnd(); HBD.noClick = true; setTimeout(() => { HBD.noClick = false; }, 0);
  if (!s.moved && !s.out && s.vis.join() === s.vis0.join()) return hbSelect(s.key);   // a long press that did not move: a tap
  if (s.out || s.vis.join() === s.vis0.join()) return render();                       // dropped outside its group, or where it was
  hbWrite(P => hbReorder(P, s.g, s.vis)); hbDone(); hbSay(s.key, s.vis, hbView());
}

(function () {
  const st = document.createElement('style');
  st.textContent = `.hb{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:26px;align-items:start}
.hb-hint{margin:0}
.hb-plan{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:22px;background:var(--hp);border:2px solid var(--line);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.hb-g{font-size:12px;font-weight:700;line-height:1.2;letter-spacing:.06em;text-transform:uppercase;color:var(--hm);margin:8px 2px 0}
.hb-fix{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 12px;border-radius:12px;border:2px dashed color-mix(in srgb,var(--hm) 40%,transparent);color:var(--hm);font-size:13.5px;font-weight:600;line-height:1.2}
.hb-fix svg{width:15px;height:15px;flex:none}.hb-fix small{font-weight:500;margin-left:auto;font-size:12.5px;text-align:right}
.hb-grp{display:flex;flex-direction:column;gap:8px}
.hb-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:66px;gap:8px}
.hb-t{position:relative;overflow:hidden;border-radius:13px;background:var(--c);color:var(--i);padding:8px 9px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;font-family:inherit;font-weight:700;font-size:13.5px;line-height:1.13;border:0;text-align:left;cursor:grab;touch-action:auto;-webkit-tap-highlight-color:transparent;min-width:0;box-shadow:inset 0 0 0 2px var(--b,transparent)}
.hb-t::after{content:"";position:absolute;width:38px;height:38px;border-radius:50%;background:var(--s);right:-13px;top:-13px}
.hb-t>svg{position:absolute;left:9px;top:8px;width:17px;height:17px}
.hb-t .hb-n{display:block;max-width:100%;overflow-wrap:normal;word-break:normal;hyphens:manual}
.hb-t.s-wide{grid-column:span 2;flex-direction:row;align-items:center;justify-content:flex-start;padding:8px 32px 8px 36px}.hb-t.s-wide>svg{top:50%;transform:translateY(-50%)}
.hb-t.s-wide::after{top:50%;right:-19px;transform:translateY(-50%)}
.hb-t.s-tall{grid-row:span 2}
.hb-t.card{box-shadow:inset 0 0 0 2px var(--i);font-weight:600}.hb-t.card::after{display:none}
.hb-t.card .hb-q{position:absolute;left:9px;top:8px;width:18px;height:18px;border-radius:6px;background:var(--q)}
.hb-t.card.s-wide{padding-left:38px}.hb-t.card.s-wide .hb-q{top:50%;transform:translateY(-50%);width:20px;height:20px}
.hb-t.sel{outline:3px solid var(--night,var(--ink));outline-offset:3px}
.hb-t:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
.hb-t.hb-ph{background:color-mix(in srgb,var(--night,#14233A) 8%,transparent)!important;box-shadow:inset 0 0 0 2px var(--night,#14233A)!important;outline:0}
.hb-t.hb-ph>*,.hb-t.hb-ph::after{visibility:hidden}
.hb-ghost{position:fixed!important;z-index:300;margin:0;pointer-events:none;transform:rotate(-2deg) scale(1.04);box-shadow:0 10px 22px rgba(0,0,0,.28),inset 0 0 0 2px var(--b,transparent);outline:3px solid var(--night,#14233A);outline-offset:3px;cursor:grabbing}
.hb-ghost.card{box-shadow:0 10px 22px rgba(0,0,0,.28),inset 0 0 0 2px var(--i)}
body.hb-dragging,body.hb-dragging *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important}
.hb-side{display:flex;flex-direction:column;gap:16px;min-width:0}
.hb-pan{border:2px solid var(--line);border-radius:16px;padding:14px 16px;background:var(--surface);display:flex;flex-direction:column;gap:10px;min-width:0}
.hb-pan h3{margin:0;font-size:20px;line-height:1.2;overflow-wrap:break-word}.hb-pan>p{margin:0;font-size:14.5px;line-height:1.35;color:var(--muted)}
.hb-l{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.hb-size{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:8px}
.hb-size button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px 8px;min-height:44px;border:2px solid var(--line);border-radius:12px;background:var(--surface);font-family:inherit;font-weight:600;font-size:13.5px;line-height:1.1;color:var(--ink);cursor:pointer;min-width:0}
.hb-size button[aria-pressed="true"]{border-color:var(--night);background:var(--night);color:#fff}
.hb-size .sh{display:grid;grid-template-columns:9px 9px;grid-auto-rows:9px;gap:2px}.hb-size .sh b{border-radius:2px;background:currentColor;opacity:.28}.hb-size .sh b.on{opacity:1}
.hb-size .wide b.on{grid-column:span 2}.hb-size .tall b.on{grid-row:span 2}
.hb-one,.hb-why{margin:0;font-size:14px;line-height:1.35;color:var(--muted)}
.hb-why{padding:8px 10px;border-radius:10px;background:var(--sunk)}
.hb-mv{display:flex;gap:8px}.hb-mv button{flex:1;min-height:44px;border:2px solid var(--line);border-radius:999px;background:var(--surface);font-family:inherit;font-weight:600;font-size:14px;line-height:1.1;color:var(--ink);cursor:pointer;padding:6px 8px}
.hb-mv button:disabled,.hb-dock .ar:disabled{opacity:.4;cursor:default}
.hb-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
.hb-opts{display:flex;flex-direction:column}
.hb-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;border-top:1px solid var(--line);background:none;padding:11px 2px;font:inherit;color:var(--ink);cursor:pointer;min-height:52px}
.hb-opts>.hb-opt:first-child{border-top:0}
.hb-opt>span:not(.hb-ic){flex:1;display:flex;flex-direction:column;line-height:1.25;min-width:0;gap:2px}.hb-opt b{font-size:15px}.hb-opt small{color:var(--muted);font-size:13.5px}.hb-opt em{font-style:normal;color:var(--muted);font-size:20px;flex:none}
.hb-ic{flex:none;width:30px;height:30px;border-radius:8px;background:var(--c)}
.hb-pick{display:flex;flex-direction:column;gap:8px;padding:2px 0 12px}
.hb-pick.hb-row{flex-direction:row;flex-wrap:wrap}
.hb-pl{display:flex;flex-direction:column;max-height:260px;overflow-y:auto;border:1.5px solid var(--line);border-radius:12px;background:var(--surface)}
.hb-pi{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;border:0;border-top:1px solid var(--line);background:none;padding:10px 12px;font:inherit;color:var(--ink);cursor:pointer;min-height:44px}
.hb-pi:first-child{border-top:0}.hb-pi small{color:var(--muted);font-size:13px}.hb-pi:hover{background:var(--sunk)}
.hb-pl .hint{margin:0;padding:10px 12px}
.hb-foot{margin:0}.hb-link{border:0;background:none;padding:6px 0;font:inherit;font-size:14.5px;color:var(--ink);text-decoration:underline;cursor:pointer;text-align:left;min-height:44px}
.hb-dock{display:none}
@media ${HB_PHONE}{.hb{grid-template-columns:minmax(0,1fr);gap:16px}.hb-side .hb-pan.sel{display:none}
 .hb-dock{display:flex;position:fixed;left:10px;right:10px;bottom:84px;z-index:60;background:var(--surface);border:2px solid var(--night);border-radius:18px;padding:10px 12px;flex-direction:column;gap:8px;box-shadow:0 10px 26px rgba(0,0,0,.22);max-width:520px;margin:0 auto}
 .hb-dr{display:flex;align-items:center;gap:8px}.hb-dr b{font-size:16px;flex:1;min-width:0;overflow-wrap:break-word}
 .hb-dock .hb-size button{padding:8px 2px 7px}
 .hb-dock .ar{width:44px;height:44px;border-radius:50%;border:2px solid var(--line);background:var(--surface);font-size:17px;flex:none;color:var(--ink);cursor:pointer}
 .hb-dock .hb-acts .btn{flex:1 1 auto}}`;
  document.head.appendChild(st);
})();
