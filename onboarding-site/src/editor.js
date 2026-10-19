/* ---------- Guide editor: change the content of a published guide directly ---------- */
const ED = { list: [], g: null, tab: 'basics', lang: 'en', timer: null, state: '', sub: 'todo' };
const ED_LANGS = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const ED_SEC = { house: 'The house', garbage: 'Garbage and recycling', message: 'House guide', emergency: 'Emergency contacts', markets: 'Markets', restaurants: 'Where to eat', todo: 'What to do', events: 'Events', quick: 'Quick contacts', map: 'Map' };
const ED_PLACES = [['todo', 'Things to do', 'files/todo/items'], ['restaurants', 'Where to eat', 'files/restaurants/items'], ['markets', 'Markets', 'files/markets/markets'], ['quick', 'Quick contacts', 'files/quick/items'], ['events', 'Events', 'files/events/items']];
const ED_SHORT = ['name', 'title', 'sub', 'type', 'kind', 'hours', 'place', 'label', 'name_local'], ED_STR = ['town', 'phone', 'web', 'url', 'map', 'venue'];
const edEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const edIs18 = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => k in ED_LANGS);
const edPath = s => s.split('/').map(k => /^\d+$/.test(k) ? +k : k);
const edGet = (o, p) => p.reduce((a, k) => a == null ? a : a[k], o);
function edSet(o, p, val) { let a = o; for (let i = 0; i < p.length - 1; i++) { if (a[p[i]] == null) a[p[i]] = typeof p[i + 1] === 'number' ? [] : {}; a = a[p[i]]; } a[p[p.length - 1]] = val; }
const edShown = o => { const v = o && (o[ED.lang] != null ? o[ED.lang] : o.en); return v == null ? '' : v; };
const edLangs = () => ((ED.g.content.site || {}).languages || ['en']).filter(l => l in ED_LANGS);

const ED_CSS = `#ed{position:fixed;inset:0;z-index:70;background:var(--paper,#fff);color:var(--ink,#111);overflow:auto;font-family:inherit;-webkit-overflow-scrolling:touch}
#ed .edw{max-width:760px;margin:0 auto;padding:0 16px 80px}
#ed .edh{position:sticky;top:0;z-index:2;background:var(--paper,#fff);border-bottom:1.5px solid var(--line,#ddd);padding:12px 0 10px;margin-bottom:14px}
#ed .edr{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}
#ed h1{font-size:22px;margin:0;line-height:1.1}
#ed .edst{font-size:13px;color:var(--muted,#666)}
#ed .edtabs,#ed .edlangs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#ed .edb{border:1.5px solid var(--ink,#111);background:var(--surface,#fff);color:inherit;border-radius:999px;padding:8px 14px;font:600 14px inherit;font-family:inherit;cursor:pointer;text-decoration:none;display:inline-block}
#ed .edb.on{background:var(--ink,#111);color:var(--paper,#fff)}
#ed .edb.sm{padding:5px 10px;font-size:12.5px}
#ed .edb.danger{border-color:#b3261e;color:#b3261e}
#ed .edc{background:var(--surface,#fff);border:1.5px solid var(--line,#ddd);border-radius:14px;padding:14px;margin-bottom:12px}
#ed label.edf{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;font-size:13px;font-weight:600;color:var(--muted,#555)}
#ed input[type=text],#ed input[type=time],#ed textarea{font:400 16px inherit;font-family:inherit;color:var(--ink,#111);border:1.5px solid var(--line,#ccc);border-radius:10px;padding:10px 12px;background:var(--sunk,#fafafa);width:100%;box-sizing:border-box}
#ed input[type=text],#ed input[type=time],#ed textarea{font-weight:400}
#ed textarea{min-height:64px;resize:vertical;field-sizing:content}
#ed details{border-top:1px solid var(--line,#ddd);padding:8px 0}
#ed details:first-of-type{border-top:0}
#ed summary{cursor:pointer;font-weight:700;padding:6px 0}
#ed .edt{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:15px}
#ed .edt input{width:22px;height:22px;flex:none}
#ed .edl{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}
#ed .edn{font-size:13px;color:var(--muted,#666);margin:6px 0 12px}
.edTop{position:fixed;bottom:10px;right:92px;z-index:40;font:600 12px/1 inherit;font-family:inherit;padding:8px 12px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--ink,#111);color:var(--paper,#fff);cursor:pointer}`;

function edField(label, path, obj, o = {}) {
  const long = o.long, isI = edIs18(obj), val = isI ? edShown(obj) : (obj == null ? '' : obj);
  const attrs = `data-p="${edEsc(path)}" data-t="${isI ? 'i18n' : 'str'}"`;
  return `<label class="edf"><span>${edEsc(label)}</span>${long ? `<textarea ${attrs}>${edEsc(val)}</textarea>` : `<input type="${o.type || 'text'}" ${attrs} value="${edEsc(val)}">`}</label>`;
}
function edBasics(c) {
  const s = c.site || {}, h = (c.files || {}).house || {};
  return `<div class="edc">${edField('Guide name', 'site/name', s.name)}${edField('House name (shown on the home page)', 'files/house/name', h.name)}${edField('Check-out time', 'files/house/checkout', h.checkout, { type: 'time' })}${edField('Short description (for link previews)', 'site/description', s.description, { long: true })}${edField('Listing link', 'files/house/listing', h.listing)}</div>
    <p class="edn">The Wi-Fi network and password, photos and the design are not editable here yet.</p>`;
}
function edSections(c) {
  const ids = [...((((c.files || {}).sections || {}).sections) || []).map(x => x.id)]; if (!ids.includes('map')) ids.push('map');
  const m = (c.site || {}).modules || {};
  return `<div class="edc">${ids.map(id => `<label class="edt"><input type="checkbox" data-mod="${edEsc(id)}"${m[id] !== false ? ' checked' : ''}><span>${edEsc(ED_SEC[id] || id)}</span></label>`).join('')}</div><p class="edn">A section you switch off disappears from the guide, its page and the map.</p>`;
}
function edHouse(c) {
  const blocks = (((c.files || {}).message || {}).blocks) || [];
  if (!blocks.length) return '<div class="edc">This guide has no house guide yet.</div>';
  return `<div class="edc">${blocks.map((b, i) => `<details><summary>${edEsc(edShown(b.title) || b.id)}</summary>
    ${edField('Title', `files/message/blocks/${i}/title`, b.title)}
    ${(b.items || []).map((it, j) => `<div class="edl"><label class="edf" style="flex:1;margin:0"><textarea data-p="files/message/blocks/${i}/items/${j}" data-t="i18n">${edEsc(edShown(it))}</textarea></label><button class="edb sm danger" type="button" data-del="files/message/blocks/${i}/items/${j}">Delete</button></div>`).join('')}
    <button class="edb sm" type="button" data-add="files/message/blocks/${i}/items">Add a line</button></details>`).join('')}</div>`;
}
function edItem(base, it, i) {
  const keys = Object.keys(it).filter(k => (edIs18(it[k]) && !['bins'].includes(k)) || ED_STR.includes(k) && typeof it[k] === 'string');
  const name = edShown(it.name) || edShown(it.title) || it.id || 'Item ' + (i + 1);
  return `<details><summary>${edEsc(name)}</summary>${keys.map(k => edField(k.replace(/_/g, ' ').replace(/^./, x => x.toUpperCase()), `${base}/${i}/${k}`, it[k], { long: edIs18(it[k]) && !ED_SHORT.includes(k) })).join('')}<button class="edb sm danger" type="button" data-del="${base}/${i}">Delete this</button></details>`;
}
function edPlaces(c) {
  const tabs = ED_PLACES.map(([id, label, path]) => { const n = (edGet(c, edPath(path)) || []).length; return n ? `<button class="edb sm${ED.sub === id ? ' on' : ''}" type="button" data-sub="${id}">${edEsc(label)} (${n})</button>` : ''; }).join('');
  const cur = ED_PLACES.find(x => x[0] === ED.sub && (edGet(c, edPath(x[2])) || []).length) || ED_PLACES.find(x => (edGet(c, edPath(x[2])) || []).length);
  if (!cur) return '<div class="edc">No places in this guide yet.</div>';
  const arr = edGet(c, edPath(cur[2]));
  return `<div class="edtabs" style="margin:0 0 12px">${tabs}</div><div class="edc">${arr.map((it, i) => edItem(cur[2], it, i)).join('')}</div><p class="edn">Distances, coordinates and map links are not editable here yet. Adding places comes next.</p>`;
}
function edEditorHTML() {
  const g = ED.g, c = g.content, tabs = [['basics', 'Basics'], ['sections', 'Sections'], ['house', 'House guide'], ['places', 'Places']];
  const body = ED.tab === 'basics' ? edBasics(c) : ED.tab === 'sections' ? edSections(c) : ED.tab === 'house' ? edHouse(c) : edPlaces(c);
  const langs = edLangs();
  return `<div class="edw"><div class="edh"><div class="edr"><h1>${edEsc((c.site || {}).name || g.slug)}</h1><span class="edst" id="edState">${edEsc(ED.state)}</span></div>
    <div class="edr" style="margin-top:8px"><span class="edst">Live at <a href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">${edEsc(location.host)}/g/${edEsc(g.slug)}</a></span><span><a class="edb sm" href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">Open guide</a> <button class="edb sm" type="button" data-edclose>Close</button></span></div>
    <div class="edtabs">${tabs.map(([id, l]) => `<button class="edb${ED.tab === id ? ' on' : ''}" type="button" data-tab="${id}">${l}</button>`).join('')}</div>
    ${langs.length > 1 && (ED.tab === 'house' || ED.tab === 'places') ? `<div class="edlangs"><span class="edst" style="align-self:center">Language:</span>${langs.map(l => `<button class="edb sm${ED.lang === l ? ' on' : ''}" type="button" data-lang="${l}">${ED_LANGS[l]}</button>`).join('')}</div>` : ''}</div>
    ${body}
    ${ED.tab === 'house' || ED.tab === 'places' ? '<p class="edn">You edit one language at a time. When another language still had the same text as the one you change, it follows. Otherwise it stays as it was.</p>' : ''}</div>`;
}
function edHubHTML() {
  return `<div class="edw"><div class="edh"><div class="edr"><h1>Your guides</h1><button class="edb sm" type="button" data-edclose>Close</button></div></div>
    ${ED.list.map(g => `<div class="edc"><div class="edr"><b>${edEsc((g.content.site || {}).name || g.slug)}</b><span class="edst">${edEsc(g.status)}</span></div><p class="edn">${edEsc(location.host)}/g/${edEsc(g.slug || '')}</p><button class="edb sm on" type="button" data-edit="${g.id}">Edit</button> <a class="edb sm" href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">Open</a></div>`).join('')}</div>`;
}
function edRender() {
  let el = document.getElementById('ed'); if (!el) return;
  const y = el.scrollTop; el.innerHTML = ED.g ? edEditorHTML() : edHubHTML(); el.scrollTop = y;
}
function edStatus() { const el = document.getElementById('edState'); if (el) el.textContent = ED.state; }
async function edLoad() {
  await ensureFresh();
  const rows = await sb('/rest/v1/guides?select=id,slug,status,origin,content&order=created_at.asc');
  ED.list = (rows || []).filter(r => r.content && r.content.site && r.slug);
  return ED.list;
}
function edOpen(id) {
  if (!document.getElementById('ed')) { const s = document.createElement('style'); s.textContent = ED_CSS; document.head.appendChild(s); const d = document.createElement('div'); d.id = 'ed'; document.body.appendChild(d); }
  document.getElementById('ed').hidden = false; document.body.style.overflow = 'hidden';
  ED.g = id ? ED.list.find(g => g.id === id) : (ED.list.length === 1 ? ED.list[0] : null);
  if (ED.g) { ED.tab = 'basics'; ED.lang = edLangs().includes('en') ? 'en' : edLangs()[0]; ED.state = ''; }
  edRender();
}
function edClose() { const el = document.getElementById('ed'); if (el) el.hidden = true; document.body.style.overflow = ''; }
function edQueue() { ED.state = 'Saving…'; edStatus(); clearTimeout(ED.timer); ED.timer = setTimeout(edSave, 1200); }
async function edSave() {
  const g = ED.g; if (!g) return;
  try { await ensureFresh(); await sb('/rest/v1/guides?id=eq.' + g.id, { method: 'PATCH', body: { content: g.content } }); ED.state = 'Saved. Live now.'; }
  catch (e) { ED.state = 'Not saved: ' + niceError(e); }
  edStatus();
}
function edEdit(t) {
  const c = ED.g.content, p = edPath(t.dataset.p), v = t.value;
  if (t.dataset.t === 'i18n') {
    let o = edGet(c, p); if (!o || typeof o !== 'object') { o = {}; edSet(c, p, o); }
    const shown = edShown(o);
    for (const l of Object.keys(o)) if (l !== ED.lang && (o[l] === shown || o[l] === '')) o[l] = v;
    o[ED.lang] = v;
  } else edSet(c, p, v);
  edQueue();
}
document.addEventListener('input', e => { const t = e.target; if (t.closest && t.closest('#ed') && t.dataset && t.dataset.p) edEdit(t); });
document.addEventListener('change', e => { const t = e.target; if (t.closest && t.closest('#ed') && t.dataset && t.dataset.mod) { const s = ED.g.content.site = ED.g.content.site || {}; s.modules = s.modules || {}; s.modules[t.dataset.mod] = !!t.checked; edQueue(); } });
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button,.edTop'); if (!t) return;
  if (t.classList.contains('edTop')) return edOpen();
  if (!t.closest('#ed')) return;
  const d = t.dataset;
  if (d.edclose !== undefined) return edClose();
  if (d.edit) { ED.g = ED.list.find(g => g.id === d.edit); ED.tab = 'basics'; ED.state = ''; return edRender(); }
  if (d.tab) { ED.tab = d.tab; return edRender(); }
  if (d.lang) { ED.lang = d.lang; return edRender(); }
  if (d.sub) { ED.sub = d.sub; return edRender(); }
  if (d.del) {
    if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Sure?'; return; }
    const p = edPath(d.del), arr = edGet(ED.g.content, p.slice(0, -1)); if (Array.isArray(arr)) { arr.splice(p[p.length - 1], 1); edQueue(); edRender(); } return;
  }
  if (d.add) { const arr = edGet(ED.g.content, edPath(d.add)); if (Array.isArray(arr)) { const o = {}; for (const l of edLangs()) o[l] = ''; arr.push(o); edQueue(); edRender(); } }
});
async function edInit() {
  const list = await edLoad();
  if (list.length && !document.querySelector('.edTop')) { const s = document.createElement('style'); s.textContent = ED_CSS; document.head.appendChild(s); const b = document.createElement('button'); b.type = 'button'; b.className = 'edTop'; b.textContent = 'My guide'; document.body.appendChild(b); }
  if (list.length && GUIDE && GUIDE.origin === 'imported') edOpen(GUIDE.id);
}
