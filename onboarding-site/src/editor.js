/* ---------- Guide editor: change the content of a published guide directly ---------- */
const ED = { list: [], g: null, tab: 'basics', lang: 'en', timer: null, state: '', sub: 'todo' };
const ED_LANGS = { en: 'English', es: 'Español', fr: 'Français', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
const ED_SEC = { house: 'The house', garbage: 'Garbage and recycling', message: 'House guide', emergency: 'Emergency contacts', markets: 'Markets', restaurants: 'Where to eat', todo: 'What to do', events: 'Events', quick: 'Quick contacts', map: 'Map' };
const ED_PLACES = [['todo', 'Things to do', 'files/todo/items'], ['restaurants', 'Where to eat', 'files/restaurants/items'], ['markets', 'Markets', 'files/markets/markets'], ['events', 'Events', 'files/events/items']];
const ED_SHORT = ['name', 'title', 'sub', 'type', 'kind', 'hours', 'place', 'label', 'name_local', 'occasional_when'], ED_STR = ['town', 'phone', 'web', 'url', 'map', 'gmaps', 'venue', 'address', 'comarca'], ED_NUM = ['lat', 'lng', 'km_from_house', 'stalls_approx'];
const ED_DAYS = [['mon', 'Mo'], ['tue', 'Tu'], ['wed', 'We'], ['thu', 'Th'], ['fri', 'Fr'], ['sat', 'Sa'], ['sun', 'Su']];
const ED_FONTS = [['jost', 'Jost'], ['inter', 'Inter'], ['cormorant-garamond', 'Cormorant Garamond'], ['dm-sans', 'DM Sans'], ['dm-serif-display', 'DM Serif Display', [400]], ['fraunces', 'Fraunces'], ['geist', 'Geist'], ['instrument-serif', 'Instrument Serif', [400]], ['nunito', 'Nunito'], ['outfit', 'Outfit'], ['space-grotesk', 'Space Grotesk'], ['bricolage-grotesque', 'Bricolage Grotesque']];
const ED_PRESETS = [['bauhaus', 'Bauhaus: bold colour blocks'], ['editorial', 'Editorial: magazine'], ['soft', 'Soft: calm and warm'], ['minimal', 'Minimal: quiet and clean']];
const ED_COLORS = [['--paper', 'Background', '#F3EEE3'], ['--white', 'Cards', '#FFFFFF'], ['--ink', 'Text', '#121212'], ['--muted', 'Secondary text', '#4A4A4A'], ['--red', 'Accent 1 (red)', '#D52B1E'], ['--blue', 'Accent 2 (blue)', '#1D4FA0'], ['--yellow', 'Accent 3 (yellow)', '#F5C400'], ['--orange', 'Accent 4 (orange)', '#EC6A1C'], ['--green', 'Accent 5 (green)', '#0E7C46']];
const edEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const edIs18 = o => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length > 0 && Object.keys(o).every(k => k in ED_LANGS);
const edPath = s => s.split('/').map(k => /^\d+$/.test(k) ? +k : k);
const edGet = (o, p) => p.reduce((a, k) => a == null ? a : a[k], o);
function edSet(o, p, val) { let a = o; for (let i = 0; i < p.length - 1; i++) { if (a[p[i]] == null) a[p[i]] = typeof p[i + 1] === 'number' ? [] : {}; a = a[p[i]]; } a[p[p.length - 1]] = val; }
const edShown = o => { const v = o && (o[ED.lang] != null ? o[ED.lang] : o.en); return v == null ? '' : v; };
const edLangs = () => ((ED.g.content.site || {}).languages || ['en']).filter(l => l in ED_LANGS);
const edC = () => ED.g.content;
const edF = () => edC().files = edC().files || {};

const ED_CSS = `#ed{position:fixed;inset:0;z-index:70;background:var(--paper,#fff);color:var(--ink,#111);overflow:auto;font-family:inherit;-webkit-overflow-scrolling:touch}
#ed .edw{max-width:760px;margin:0 auto;padding:0 16px 80px}
#ed .edh{position:sticky;top:0;z-index:2;background:var(--paper,#fff);border-bottom:1.5px solid var(--line,#ddd);padding:12px 0 10px;margin-bottom:14px}
#ed .edr{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}
#ed h1{font-size:22px;margin:0;line-height:1.1}
#ed h2{font-size:16px;margin:14px 0 8px}
#ed .edst{font-size:13px;color:var(--muted,#666)}
#ed .edtabs,#ed .edlangs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#ed .edb{border:1.5px solid var(--ink,#111);background:var(--surface,#fff);color:inherit;border-radius:999px;padding:8px 14px;font:600 14px inherit;font-family:inherit;cursor:pointer;text-decoration:none;display:inline-block}
#ed .edb.on{background:var(--ink,#111);color:var(--paper,#fff)}
#ed .edb.sm{padding:5px 10px;font-size:12.5px}
#ed .edb.danger{border-color:#b3261e;color:#b3261e}
#ed .edc{background:var(--surface,#fff);border:1.5px solid var(--line,#ddd);border-radius:14px;padding:14px;margin-bottom:12px}
#ed label.edf{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;font-size:13px;font-weight:600;color:var(--muted,#555)}
#ed input[type=text],#ed input[type=time],#ed input[type=number],#ed select,#ed textarea{font:400 16px inherit;font-family:inherit;font-weight:400;color:var(--ink,#111);border:1.5px solid var(--line,#ccc);border-radius:10px;padding:10px 12px;background:var(--sunk,#fafafa);width:100%;box-sizing:border-box}
#ed textarea{min-height:64px;resize:vertical;field-sizing:content}
#ed details{border-top:1px solid var(--line,#ddd);padding:8px 0}
#ed details:first-of-type{border-top:0}
#ed summary{cursor:pointer;font-weight:700;padding:6px 0}
#ed .edt{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:15px}
#ed .edt input{width:22px;height:22px;flex:none}
#ed .edl{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}
#ed .edn{font-size:13px;color:var(--muted,#666);margin:6px 0 12px}
#ed .edgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
#ed .edsch{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
#ed .edsch input[type=time]{width:auto}
#ed .edcol{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#ed .edcol label.edf{margin-bottom:0}
#ed .edphotos{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
#ed .edph{width:96px}
#ed .edph img{width:96px;height:72px;object-fit:cover;border-radius:8px;display:block;background:#ddd}
#ed .edph span{display:flex;gap:3px;margin-top:3px}
#ed .edph .edb{padding:2px 7px;font-size:12px}
#ed .edfile{cursor:pointer;align-self:center}
#ed input[type=color]{width:100%;height:44px;padding:2px;border-radius:10px;border:1.5px solid var(--line,#ccc);background:none}
`;

function edField(label, path, obj, o = {}) {
  const isI = edIs18(obj), num = o.type === 'number', val = isI ? edShown(obj) : (obj == null ? '' : obj);
  const attrs = `data-p="${edEsc(path)}" data-t="${isI ? 'i18n' : num ? 'num' : 'str'}"`;
  return `<label class="edf"><span>${edEsc(label)}</span>${o.long ? `<textarea ${attrs}>${edEsc(val)}</textarea>` : `<input type="${o.type || 'text'}"${num ? ' step="any"' : ''} ${attrs} value="${edEsc(val)}">`}</label>`;
}
const edLabel = k => k.replace(/_/g, ' ').replace(/^./, x => x.toUpperCase());
function edDays(path, days) { return `<span style="display:flex;gap:4px;flex-wrap:wrap">${ED_DAYS.map(([d, l]) => `<button class="edb sm${(days || []).includes(d) ? ' on' : ''}" type="button" data-daytog="${edEsc(path)}" data-d="${d}">${l}</button>`).join('')}</span>`; }
function edSchedule(path, arr) {
  return `<div class="edn" style="margin-bottom:4px">Opening days and hours</div>${(arr || []).map((r, k) => `<div class="edsch">${edDays(`${path}/${k}`, r.days)}<input type="time" data-p="${path}/${k}/open" data-t="str" value="${edEsc(r.open || '')}"><input type="time" data-p="${path}/${k}/close" data-t="str" value="${edEsc(r.close || '')}"><button class="edb sm danger" type="button" data-del="${path}/${k}">x</button></div>`).join('')}<button class="edb sm" type="button" data-addsch="${path}">Add opening hours</button>`;
}

/* --- Photos --- */
const edImg = n => (edC().assetBase || '') + n;
function edPhotos(path, arr) {
  return `<div class="edphotos">${(arr || []).map((n, i) => `<div class="edph"><img src="${edEsc(edImg(n))}" alt="" loading="lazy"><span><button class="edb" type="button" data-phmove="${path}/${i}" data-dir="-1" aria-label="Move earlier">&lsaquo;</button><button class="edb" type="button" data-phmove="${path}/${i}" data-dir="1" aria-label="Move later">&rsaquo;</button><button class="edb danger" type="button" data-now="1" data-del="${path}/${i}" aria-label="Remove">x</button></span></div>`).join('')}<label class="edb sm edfile">Add photos<input type="file" accept="image/*" multiple hidden data-phadd="${path}"></label></div>`;
}
async function edUpload(file, kind) {
  const bmp = await createImageBitmap(file), max = kind === 'logo' ? 512 : 1600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const png = kind === 'logo', blob = await new Promise(r => cv.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.85));
  const name = (png ? 'logo-' : 'guide/u-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + (png ? '.png' : '.jpg');
  await ensureFresh();
  const r = await fetch(`${SB.url}/storage/v1/object/guide-assets/${ED.g.id}/${name}`, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + AUTH.access_token, 'Content-Type': blob.type, 'x-upsert': 'true' }, body: blob });
  if (!r.ok) throw new Error('The photo could not be uploaded');
  return name;
}
async function edPhotoInput(t) {
  const files = [...t.files]; if (!files.length) return;
  ED.state = 'Uploading…'; edStatus();
  try {
    for (const f of files) {
      const name = await edUpload(f, t.dataset.kind);
      if (t.dataset.phadd) { const p = edPath(t.dataset.phadd); let a = edGet(edC(), p); if (!Array.isArray(a)) { edSet(edC(), p, []); a = edGet(edC(), p); } a.push(name); }
      else { edSet(edC(), edPath(t.dataset.phset), name); if (t.dataset.phset === 'files/house/photo') edSet(edC(), ['files', 'house', 'cover'], 'photo'); }
    }
    edQueue(); edRender();
  } catch (e) { ED.state = 'Not uploaded: ' + (e.message || 'try again'); edStatus(); }
}

/* --- Languages --- */
function edMissing(l) {
  let n = 0;
  const walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (edIs18(x)) { if (!x[l] && Object.values(x).some(v => v)) n++; } else Object.values(x).forEach(walk); } };
  walk(edC().files || {}); return n;
}
function edLanguages() {
  const langs = edLangs();
  return `<div class="edc"><h2 style="margin-top:0">Languages</h2>${Object.entries(ED_LANGS).map(([k, n]) => { const m = langs.includes(k) ? edMissing(k) : 0; return `<label class="edt"><input type="checkbox" data-langtog="${k}"${langs.includes(k) ? ' checked' : ''}${k === langs[0] ? ' disabled' : ''}><span>${n}${k === langs[0] ? ' (main)' : ''}</span>${m ? `<span class="edst">${m} texts not translated</span>` : ''}</label>`; }).join('')}
    <button class="edb sm on" type="button" data-translate>Translate missing texts</button> <span class="edst" id="edJob"></span>
    <p class="edn">Translation runs on the computer that builds your guides, so it needs to be on. Until a text is translated, guests see it in the main language.</p></div>`;
}
const edJobText = s => { const el = document.getElementById('edJob'); if (el) el.textContent = s; };
async function edTranslate() {
  const langs = edLangs().filter(l => edMissing(l) > 0);
  if (!langs.length) return edJobText('Everything is already translated.');
  try {
    edJobText('Saving…'); clearTimeout(ED.timer); await edSave();
    const j = await sb('/rest/v1/guide_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { guide_id: ED.g.id, kind: 'translate', langs } });
    const id = j && j[0] && j[0].id; if (!id) throw new Error('Could not start');
    edJobText('Waiting for the guide builder…');
    for (let i = 0; i < 450; i++) {
      await new Promise(r => setTimeout(r, 4000));
      await ensureFresh();
      const r = await sb('/rest/v1/guide_jobs?select=status,message&id=eq.' + id), st = r && r[0];
      if (!st) continue;
      if (st.status === 'running') edJobText(st.message || 'Translating…');
      if (st.status === 'failed') return edJobText('Did not work: ' + (st.message || 'try again later'));
      if (st.status === 'done') {
        const g = await sb('/rest/v1/guides?select=content&id=eq.' + ED.g.id); if (g && g[0]) { ED.g.content = g[0].content; ED.list.forEach(x => { if (x.id === ED.g.id) x.content = g[0].content; }); }
        ED.state = 'Translated.'; edRender(); return;
      }
    }
    edJobText('Still waiting. Check again in a while.');
  } catch (e) { edJobText('Did not work: ' + niceError(e)); }
}

/* --- Basics --- */
const edCoverPhoto = h => !!h.photo && h.cover !== 'themed';
function edBasics(c) {
  const s = c.site || {}, h = (c.files || {}).house || {};
  return `<div class="edc">${edField('Guide name', 'site/name', s.name)}${edField('House name (shown on the home page)', 'files/house/name', h.name)}${edField('Check-out time', 'files/house/checkout', h.checkout, { type: 'time' })}${edField('Short description (for link previews)', 'site/description', s.description, { long: true })}${edField('Listing link', 'files/house/listing', h.listing)}</div>
    <div class="edc"><h2 style="margin-top:0">Cover</h2><p class="edn">Guests have already seen your listing photos, so the cover is drawn from your colours unless you choose your own photo.</p><span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="edb sm${edCoverPhoto(h) ? '' : ' on'}" type="button" data-cover="themed">Drawn from my colours</button><button class="edb sm${edCoverPhoto(h) ? ' on' : ''}" type="button" data-cover="photo"${h.photo ? '' : ' disabled'}>My photo</button></span>${h.photo ? `<div class="edph" style="width:160px;margin-top:10px"><img style="width:160px;height:110px" src="${edEsc(edImg(h.photo))}" alt=""></div>` : ''}<label class="edb sm edfile" style="margin-top:8px">${h.photo ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/*" hidden data-phset="files/house/photo"></label></div>
    <div class="edc"><h2 style="margin-top:0">Logo</h2>${s.logo ? `<div class="edph"><img style="object-fit:contain;background:#fff" src="${edEsc(edImg(s.logo))}" alt=""></div>` : ''}<label class="edb sm edfile" style="margin-top:8px">${s.logo ? 'Change logo' : 'Add a logo'}<input type="file" accept="image/*" hidden data-phset="site/logo" data-kind="logo"></label></div>
    ${edLanguages()}`;
}
function edSections(c) {
  const ids = [...((((c.files || {}).sections || {}).sections) || []).map(x => x.id)]; if (!ids.includes('map')) ids.push('map');
  const m = (c.site || {}).modules || {};
  return `<div class="edc">${ids.map(id => `<label class="edt"><input type="checkbox" data-mod="${edEsc(id)}"${m[id] !== false ? ' checked' : ''}><span>${edEsc(ED_SEC[id] || id)}</span></label>`).join('')}</div><p class="edn">A section you switch off disappears from the guide, its page and the map.</p>`;
}

/* --- House guide --- */
function edHouse(c) {
  const blocks = (((c.files || {}).message || {}).blocks) || [];
  if (!blocks.length) return '<div class="edc">This guide has no house guide yet.</div>';
  return `<div class="edc">${blocks.map((b, i) => `<details><summary>${edEsc(edShown(b.title) || b.id)}</summary>
    ${edField('Title', `files/message/blocks/${i}/title`, b.title)}
    <div class="edn" style="margin-bottom:0">Photos</div>${edPhotos(`files/message/blocks/${i}/photos`, b.photos)}
    ${(b.items || []).map((it, j) => `<div class="edl"><label class="edf" style="flex:1;margin:0"><textarea data-p="files/message/blocks/${i}/items/${j}" data-t="i18n">${edEsc(edShown(it))}</textarea></label><button class="edb sm danger" type="button" data-del="files/message/blocks/${i}/items/${j}">Delete</button></div>`).join('')}
    <button class="edb sm" type="button" data-add="files/message/blocks/${i}/items">Add a line</button></details>`).join('')}</div>`;
}

/* --- Wi-Fi --- */
function edWifi(c) {
  const w = (c.private || {}).wifi;
  if (!w) return '<div class="edc"><p class="edn">This guide has no Wi-Fi yet.</p><button class="edb on" type="button" data-addwifi>Add Wi-Fi</button></div>';
  return `<div class="edc">${edField('Password', 'private/wifi/password', w.password)}<h2>Networks</h2>${(w.networks || []).map((n, i) => `<div class="edc" style="background:var(--sunk,#fafafa)">${edField('Network name', `private/wifi/networks/${i}/ssid`, n.ssid)}${edField('Note for guests (e.g. "Best inside the house")', `private/wifi/networks/${i}/label`, n.label || {})}<button class="edb sm danger" type="button" data-del="private/wifi/networks/${i}">Remove network</button></div>`).join('')}<button class="edb sm" type="button" data-addnet>Add a network</button></div>
    <p class="edn">The QR code is made again automatically for the name and password you set.</p>`;
}

/* --- Rubbish --- */
const ED_BINS = [['organic', 'Organic'], ['packaging', 'Packaging'], ['paper', 'Paper'], ['glass', 'Glass'], ['rest', 'General waste']];
function edRubbish(c) {
  const g = (c.files || {}).garbage;
  if (!g) return '<div class="edc">This guide has no rubbish section.</div>';
  const bins = ['street', ...Object.keys(g.bins || {})];
  return `<div class="edc">${edField('Collection time (morning)', 'files/garbage/collectionTime', g.collectionTime || '', { type: 'time' })}</div>
    <div class="edc">${(g.fractions || []).map((f, i) => `<details><summary>${edEsc(edShown(f.name) || f.id)}</summary>
      ${edField('Name', `files/garbage/fractions/${i}/name`, f.name)}
      <label class="edf"><span>Goes in</span><select data-p="files/garbage/fractions/${i}/bin" data-t="str">${bins.map(b => `<option value="${edEsc(b)}"${f.bin === b ? ' selected' : ''}>${edEsc(b === 'street' ? 'A container in the street' : edShown((g.bins || {})[b]) || b)}</option>`).join('')}</select></label>
      <div class="edn" style="margin-bottom:4px">Collection days</div>${edDays(`files/garbage/fractions/${i}`, f.days)}
      <div style="height:10px"></div>${edField('What goes in it', `files/garbage/fractions/${i}/examples`, f.examples || {}, { long: true })}</details>`).join('')}</div>
    <div class="edc"><h2 style="margin-top:0">Containers guests can use</h2>${(g.containers || []).map((ct, j) => `<details><summary>${edEsc(edShown(ct.where) || 'Containers ' + (j + 1))}</summary>
      <label class="edf"><span>Where they are</span><textarea data-p="files/garbage/containers/${j}/where" data-t="i18n">${edEsc(edShown(ct.where || {}))}</textarea></label>
      ${edField('Google Maps link (optional)', `files/garbage/containers/${j}/map`, ct.map || '')}
      <div class="edn" style="margin-bottom:4px">What they take</div><span style="display:flex;gap:4px;flex-wrap:wrap">${ED_BINS.map(([id, l]) => `<button class="edb sm${(ct.takes || []).includes(id) ? ' on' : ''}" type="button" data-ctake="${j}" data-id="${id}">${l}</button>`).join('')}</span>
      <div style="height:10px"></div><button class="edb sm danger" type="button" data-del="files/garbage/containers/${j}">Delete this</button></details>`).join('')}
      <button class="edb sm" type="button" data-addcont="1">Add containers</button></div>
    <div class="edc"><h2 style="margin-top:0">How to sort</h2>${(g.steps || []).map((it, j) => `<div class="edl"><label class="edf" style="flex:1;margin:0"><textarea data-p="files/garbage/steps/${j}" data-t="i18n">${edEsc(edShown(it))}</textarea></label><button class="edb sm danger" type="button" data-del="files/garbage/steps/${j}">Delete</button></div>`).join('')}<button class="edb sm" type="button" data-add="files/garbage/steps">Add a step</button>
    ${g.missed ? edField('If a collection is missed', 'files/garbage/missed', g.missed, { long: true }) : ''}${g.deixalleria ? edField('Recycling centre', 'files/garbage/deixalleria', g.deixalleria, { long: true }) : ''}</div>`;
}

/* --- Generic item (contact, place, market...) --- */
function edItem(base, it, i) {
  const keys = Object.keys(it).filter(k => k !== 'schedule' && ((edIs18(it[k]) && !['bins'].includes(k)) || (ED_STR.includes(k) && typeof it[k] === 'string')));
  const nums = ED_NUM.filter(k => k in it);
  const name = edShown(it.name) || edShown(it.title) || (it.id && !String(it.id).startsWith('custom-') ? it.id : 'New item');
  return `<details><summary>${edEsc(name)}</summary>
    ${keys.map(k => edField(edLabel(k), `${base}/${i}/${k}`, it[k], { long: edIs18(it[k]) && !ED_SHORT.includes(k) })).join('')}
    ${nums.length ? `<div class="edcol">${nums.map(k => edField(edLabel(k), `${base}/${i}/${k}`, it[k], { type: 'number' })).join('')}</div>` : ''}
    ${'lat' in it ? `<label class="edf" style="margin-top:12px"><span>Paste a Google Maps link to set the position</span><input type="text" data-gm="${base}/${i}" placeholder="https://www.google.com/maps/..."></label>` : ''}
    ${'schedule' in it || base.includes('markets') ? `<div style="margin-bottom:10px">${edSchedule(`${base}/${i}/schedule`, it.schedule)}</div>` : ''}
    <button class="edb sm danger" type="button" data-del="${base}/${i}">Delete this</button></details>`;
}
function edNewItem(arr) {
  const clone = arr && arr[0] ? JSON.parse(JSON.stringify(arr[0])) : { name: { en: '' }, description: { en: '' }, lat: 0, lng: 0 };
  const h = (edF().house) || {};
  const clear = o => { for (const k of Object.keys(o)) { const v = o[k]; if (['icon', 'group', 'tone', 'category', 'tags', 'flags', 'wide'].includes(k)) continue; if (edIs18(v)) o[k] = Object.fromEntries(Object.keys(v).map(l => [l, ''])); else if (typeof v === 'string') o[k] = ''; else if (Array.isArray(v)) o[k] = []; } return o; };
  const n = clear(clone); n.id = 'custom-' + Date.now().toString(36);
  if ('lat' in n || arr[0] && 'lat' in arr[0]) { n.lat = h.lat || 0; n.lng = h.lng || 0; n.km_from_house = 0; }
  delete n.verify; delete n.always;
  return n;
}
const edKm = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b), x = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(x))); };

/* --- House page --- */
function edLines(title, path, arr) {
  return `<h2 style="margin-top:0">${title}</h2>${(arr || []).map((it, j) => `<div class="edl"><label class="edf" style="flex:1;margin:0"><textarea data-p="${path}/${j}" data-t="i18n">${edEsc(edShown(it))}</textarea></label><button class="edb sm danger" type="button" data-del="${path}/${j}">Delete</button></div>`).join('')}<button class="edb sm" type="button" data-add="${path}">Add a line</button>`;
}
function edHousePage(c) {
  const hp = (c.files || {})['house-page'], P = 'files/house-page';
  if (!hp) return '<div class="edc">This guide has no house page.</div>';
  return `<div class="edc">${edField('Summary', P + '/summary', hp.summary)}${edField('Description', P + '/description', hp.description, { long: true })}
    <div class="edcol">${edField('Rating (stars)', P + '/rating/stars', (hp.rating || {}).stars, { type: 'number' })}${edField('Number of reviews', P + '/rating/count', (hp.rating || {}).count, { type: 'number' })}</div><div style="height:12px"></div>
    ${edField('Listing link', P + '/url', hp.url)}${edField('Listing photos link', P + '/photosUrl', hp.photosUrl)}</div>
    <div class="edc"><h2 style="margin-top:0">Highlights</h2>${(hp.highlights || []).map((h, i) => `<div class="edl"><label class="edf" style="flex:1;margin:0"><textarea data-p="${P}/highlights/${i}/t" data-t="i18n">${edEsc(edShown(h.t))}</textarea></label><button class="edb sm danger" type="button" data-del="${P}/highlights/${i}">Delete</button></div>`).join('')}<button class="edb sm" type="button" data-addit="${P}/highlights">Add a highlight</button></div>
    ${hp.beds ? `<div class="edc">${edLines('Beds', P + '/beds', hp.beds)}</div>` : ''}
    <div class="edc"><h2 style="margin-top:0">Amenities</h2>${(hp.amenities || []).map((g, i) => `<details><summary>${edEsc(edShown(g.t))}</summary>${edField('Group title', `${P}/amenities/${i}/t`, g.t)}${edLines('Items', `${P}/amenities/${i}/items`, g.items)}</details>`).join('')}</div>
    <div class="edc"><h2 style="margin-top:0">Photos</h2>${edPhotos(P + '/photos', hp.photos)}</div>
    ${(hp.tour || []).length ? `<div class="edc"><h2 style="margin-top:0">Tour by room</h2>${hp.tour.map((r, i) => `<details><summary>${edEsc(edShown(r.room))}</summary>${edField('Room name', `${P}/tour/${i}/room`, r.room)}${edPhotos(`${P}/tour/${i}/photos`, r.photos)}</details>`).join('')}</div>` : ''}`;
}

/* --- Contacts --- */
function edContacts(c) {
  const em = (c.files || {}).emergency, q = (c.files || {}).quick;
  const groups = (em && em.groups) || [];
  const title = { urgent: 'Urgent', health: 'Health', police: 'Police and roads', town: 'Town and services' };
  return `${groups.map((g, gi) => `<div class="edc"><h2 style="margin-top:0">${edEsc(title[g.id] || g.id)}</h2>${(g.items || []).map((it, i) => edItem(`files/emergency/groups/${gi}/items`, it, i)).join('')}<button class="edb sm" type="button" data-addit="files/emergency/groups/${gi}/items">Add a contact</button></div>`).join('')}
    <div class="edc">The one-tap tiles on the home page (taxi, train station, a bar you love) are in the <button class="edb sm" type="button" data-tab="home">Home tiles</button> tab.</div>
    ${!groups.length ? '<div class="edc">This guide has no contacts yet.</div>' : ''}`;
}

/* --- Home tiles: one-tap tiles on the home page, each opening its own page with map and buttons --- */
const ED_TILES = [['taxi', 'Add a taxi', 'Taxi', { phone: '', always: true }], ['train', 'Add a train or bus station', 'Station', { lat: 0, lng: 0, gmaps: '' }],
  ['food', 'Add a bar or restaurant', 'Restaurant', { phone: '', lat: 0, lng: 0, gmaps: '' }], ['shop', 'Add a shop', 'Shop', { phone: '', lat: 0, lng: 0, gmaps: '' }]];
function edHome(c) {
  const q = (c.files || {}).quick || {}, items = q.items || [];
  return `<div class="edc"><h2 style="margin-top:0">Home tiles</h2><p class="edn">One tap from the home page. Each tile opens a page with its map, number and your words.</p>
    ${items.map((it, i) => edItem('files/quick/items', it, i)).join('') || '<p class="edn">No tiles yet.</p>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${ED_TILES.map(([icon, label]) => `<button class="edb sm" type="button" data-addtile="${icon}">${edEsc(label)}</button>`).join('')}</div></div>`;
}
function edAddTile(icon) {
  const c = edC(), f = c.files = c.files || {}, q = f.quick = f.quick || { items: [] }; q.items = q.items || [];
  const [, , kind, extra] = ED_TILES.find(t => t[0] === icon), L = x => Object.fromEntries(edLangs().map(l => [l, x]));
  q.items.push({ id: `${icon === 'food' ? 'food' : icon}-${Date.now().toString(36)}`, icon, name: L(kind), sub: L(''), title: L(''), kind: L(kind), what: L(''), ...JSON.parse(JSON.stringify(extra)) });
  edQueue(); edRender();
}

/* --- Places --- */
function edPlaces(c) {
  const tabs = ED_PLACES.map(([id, label, path]) => { const n = (edGet(c, edPath(path)) || []).length; return n ? `<button class="edb sm${ED.sub === id ? ' on' : ''}" type="button" data-sub="${id}">${edEsc(label)} (${n})</button>` : ''; }).join('');
  const cur = ED_PLACES.find(x => x[0] === ED.sub && (edGet(c, edPath(x[2])) || []).length) || ED_PLACES.find(x => (edGet(c, edPath(x[2])) || []).length);
  if (!cur) return '<div class="edc">No places in this guide yet.</div>';
  const arr = edGet(c, edPath(cur[2]));
  return `<div class="edtabs" style="margin:0 0 12px">${tabs}</div><div class="edc">${arr.map((it, i) => edItem(cur[2], it, i)).join('')}<div style="margin-top:10px"><button class="edb sm on" type="button" data-addit="${cur[2]}">Add a place</button></div></div>
    <p class="edn">Distance from the house is worked out from the position. A new place starts at the house: set its position by pasting a Google Maps link.</p>`;
}

/* --- Design --- */
const edCssVar = (css, name) => { const m = css.match(new RegExp(name + '\\s*:\\s*([^;}]+)')); return m ? m[1].trim() : ''; };
const edBlockOf = css => { const m = css.match(/\/\* editor:start \*\/([\s\S]*?)\/\* editor:end \*\//); return m ? m[1] : ''; };
function edDesign() {
  const th = ED.g.theme = ED.g.theme || {}, css = th.css || '', blk = edBlockOf(css);
  const val = (n, d) => { const v = edCssVar(blk, n) || edCssVar(css, n); return /^#[0-9a-fA-F]{6}$/.test(v) ? v : d; };
  const fam = n => { const v = (edCssVar(blk, n) || edCssVar(css, n)).match(/"([^"]+)"/); return v ? v[1] : ''; };
  const dispSel = (ED_FONTS.find(f => f[1] === fam('--display')) || [])[0] || ((th.fonts || [])[0] || '').split('/')[0] || 'jost';
  const bodySel = (ED_FONTS.find(f => f[1] === fam('--font')) || [])[0] || ((th.fonts || []).slice(-1)[0] || '').split('/')[0] || 'jost';
  const opts = sel => ED_FONTS.map(([id, n]) => `<option value="${id}"${id === sel ? ' selected' : ''}>${n}</option>`).join('');
  return `<div class="edc"><h2 style="margin-top:0">Layout style</h2><label class="edf"><select data-design="preset">${ED_PRESETS.map(([id, n]) => `<option value="${id}"${(th.preset || 'bauhaus') === id ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="edc"><h2 style="margin-top:0">Fonts</h2><div class="edcol"><label class="edf"><span>Titles</span><select data-design="display">${opts(dispSel)}</select></label><label class="edf"><span>Text</span><select data-design="body">${opts(bodySel)}</select></label></div></div>
    <div class="edc"><h2 style="margin-top:0">Colours</h2><div class="edcol">${ED_COLORS.map(([v, l, d]) => `<label class="edf"><span>${l}</span><input type="color" data-design="color" data-var="${v}" value="${val(v, d)}"></label>`).join('')}</div></div>
    <p class="edn">Changes show on the guide as soon as they are saved. Open the guide in another tab and reload to see them.</p>`;
}
function edApplyDesign(kind, el) {
  const th = ED.g.theme = ED.g.theme || {};
  if (kind === 'preset') { th.preset = el.value; (ED.g.content.site = ED.g.content.site || {}).theme = { ...(ED.g.content.site.theme || {}), preset: el.value }; edQueue(); return; }
  const css = th.css || '', blk = edBlockOf(css), cur = n => edCssVar(blk, n);
  const decl = {}; for (const m of blk.matchAll(/(--[a-z-]+)\s*:\s*([^;}]+)/g)) decl[m[1]] = m[2].trim();
  let fonts = th.fonts || [];
  if (kind === 'color') decl[el.dataset.var] = el.value;
  else {
    const f = ED_FONTS.find(x => x[0] === el.value), disp = kind === 'display';
    decl[disp ? '--display' : '--font'] = `"${f[1]}",${/serif|fraunces|cormorant|instrument/i.test(f[0]) && !/sans/i.test(f[0]) ? 'Georgia,serif' : 'system-ui,sans-serif'}`;
    const d = ED_FONTS.find(x => x[1] === ((decl['--display'] || '').match(/"([^"]+)"/) || [])[1]) || ED_FONTS[0], b = ED_FONTS.find(x => x[1] === ((decl['--font'] || '').match(/"([^"]+)"/) || [])[1]) || d;
    fonts = []; for (const x of [d, b]) for (const w of (x[2] || [400, 500, 600, 700])) { const s = `${x[0]}/${w}.css`; if (!fonts.includes(s)) fonts.push(s); }
    th.fonts = fonts; (ED.g.content.site = ED.g.content.site || {}).theme = { ...(ED.g.content.site.theme || {}), fonts };
  }
  const body = ':root{' + Object.entries(decl).map(([k, v]) => `${k}:${v}`).join(';') + '}';
  const block = `/* editor:start */\n${body}\n/* editor:end */`;
  th.css = /\/\* editor:start \*\//.test(css) ? css.replace(/\/\* editor:start \*\/[\s\S]*?\/\* editor:end \*\//, block) : css + '\n' + block;
  edQueue();
}

/* --- Shell --- */
function edEditorHTML() {
  const g = ED.g, c = g.content, tabs = [['basics', 'Basics'], ['sections', 'Sections'], ['home', 'Home tiles'], ['house', 'House guide'], ['housepage', 'House page'], ['wifi', 'Wi-Fi'], ['rubbish', 'Rubbish'], ['contacts', 'Contacts'], ['places', 'Places'], ['design', 'Design']];
  const body = { basics: edBasics, sections: edSections, house: edHouse, housepage: edHousePage, wifi: edWifi, rubbish: edRubbish, contacts: edContacts, home: edHome, places: edPlaces, design: edDesign }[ED.tab](c);
  const langs = edLangs(), showLang = ['house', 'housepage', 'wifi', 'rubbish', 'contacts', 'home', 'places'].includes(ED.tab);
  return `<div class="edw"><div class="edh"><div class="edr"><h1>${edEsc((c.site || {}).name || g.slug)}</h1><span class="edst" id="edState">${edEsc(ED.state)}</span></div>
    <div class="edr" style="margin-top:8px"><span class="edst">Live at <a href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">${edEsc(location.host)}/g/${edEsc(g.slug)}</a></span><span><a class="edb sm" href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">Open guide</a> <button class="edb sm" type="button" data-edclose>Close</button></span></div>
    <div class="edtabs">${tabs.map(([id, l]) => `<button class="edb${ED.tab === id ? ' on' : ''}" type="button" data-tab="${id}">${l}</button>`).join('')}</div>
    ${langs.length > 1 && showLang ? `<div class="edlangs"><span class="edst" style="align-self:center">Language:</span>${langs.map(l => `<button class="edb sm${ED.lang === l ? ' on' : ''}" type="button" data-lang="${l}">${ED_LANGS[l]}</button>`).join('')}</div>` : ''}</div>
    ${body}
    ${showLang && langs.length > 1 ? '<p class="edn">You edit one language at a time. When another language still had the same text as the one you change, it follows. Otherwise it stays as it was.</p>' : ''}</div>`;
}
function edHubHTML() {
  return `<div class="edw"><div class="edh"><div class="edr"><h1>Your guides</h1><button class="edb sm" type="button" data-edclose>Close</button></div></div>
    ${ED.list.map(g => `<div class="edc"><div class="edr"><b>${edEsc((g.content.site || {}).name || g.slug)}</b><span class="edst">${edEsc(g.status)}</span></div><p class="edn">${edEsc(location.host)}/g/${edEsc(g.slug || '')}</p><button class="edb sm on" type="button" data-edit="${g.id}">Edit</button> <a class="edb sm" href="/g/${edEsc(g.slug)}" target="_blank" rel="noopener">Open</a></div>`).join('')}</div>`;
}
function edRender() { const el = document.getElementById('ed'); if (!el) return; const y = el.scrollTop; el.innerHTML = ED.g ? edEditorHTML() : edHubHTML(); el.scrollTop = y; }
function edStatus() { const el = document.getElementById('edState'); if (el) el.textContent = ED.state; }
async function edLoad() {
  await ensureFresh();
  const rows = await sb('/rest/v1/guides?select=id,slug,status,origin,content,theme&order=created_at.asc');
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
  try { await ensureFresh(); await sb('/rest/v1/guides?id=eq.' + g.id, { method: 'PATCH', body: { content: g.content, theme: g.theme || {} } }); ED.state = 'Saved. Live now.'; }
  catch (e) { ED.state = 'Not saved: ' + niceError(e); }
  edStatus();
}
function edEdit(t) {
  const c = edC(), p = edPath(t.dataset.p), v = t.value, kind = t.dataset.t;
  if (kind === 'i18n') {
    let o = edGet(c, p); if (!o || typeof o !== 'object') { o = {}; edSet(c, p, o); }
    const shown = edShown(o);
    for (const l of Object.keys(o)) if (l !== ED.lang && (o[l] === shown || o[l] === '')) o[l] = v;
    o[ED.lang] = v;
  } else if (kind === 'num') edSet(c, p, v === '' ? 0 : Number(v));
  else edSet(c, p, v);
  if (p[0] === 'private' && p[1] === 'wifi' && p[p.length - 1] !== 'label') for (const n of (c.private.wifi.networks || [])) delete n.qr;   // the guide makes a new QR code for the new name or password
  if (kind === 'num' && (p[p.length - 1] === 'lat' || p[p.length - 1] === 'lng')) edUpdateKm(p.slice(0, -1));
  edQueue();
}
function edUpdateKm(ip) {
  const it = edGet(edC(), ip), h = edF().house || {}; if (!it || !('km_from_house' in it) || !h.lat || !it.lat) return;
  it.km_from_house = edKm(h.lat, h.lng, it.lat, it.lng);
  const el = document.querySelector(`#ed [data-p="${ip.join('/')}/km_from_house"]`); if (el) el.value = it.km_from_house;
}
function edParseMaps(url) {
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}
document.addEventListener('input', e => {
  const t = e.target; if (!t.closest || !t.closest('#ed') || !t.dataset) return;
  if (t.dataset.p) return edEdit(t);
  if (t.dataset.gm) { const pos = edParseMaps(t.value); if (!pos) return; const ip = edPath(t.dataset.gm), it = edGet(edC(), ip); it.lat = pos.lat; it.lng = pos.lng; if ('map' in it || 'gmaps' in it) it['map' in it ? 'map' : 'gmaps'] = t.value; edUpdateKm(ip); edQueue(); edRender(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest || !t.closest('#ed') || !t.dataset) return;
  if (t.dataset.mod) { const s = edC().site = edC().site || {}; s.modules = s.modules || {}; s.modules[t.dataset.mod] = !!t.checked; edQueue(); }
  else if (t.dataset.design) edApplyDesign(t.dataset.design, t);
  else if (t.dataset.phadd !== undefined || t.dataset.phset !== undefined) edPhotoInput(t);
  else if (t.dataset.langtog) { const s = edC().site = edC().site || {}; s.languages = s.languages || ['en']; const l = t.dataset.langtog, i = s.languages.indexOf(l); if (t.checked && i < 0) s.languages.push(l); else if (!t.checked && i > 0) s.languages.splice(i, 1); edQueue(); edRender(); }
});
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button,.edTop'); if (!t) return;
  if (t.classList.contains('edTop')) return edOpen();
  if (!t.closest('#ed')) return;
  const d = t.dataset;
  if (d.edclose !== undefined) return edClose();
  if (d.edit) { ED.g = ED.list.find(g => g.id === d.edit); ED.tab = 'basics'; ED.state = ''; return edRender(); }
  if (d.tab) { ED.tab = d.tab; return edRender(); }
  if (d.cover) { edSet(edC(), ['files', 'house', 'cover'], d.cover); edQueue(); return edRender(); }
  if (d.lang) { ED.lang = d.lang; return edRender(); }
  if (d.sub) { ED.sub = d.sub; return edRender(); }
  if (d.daytog) { const o = edGet(edC(), edPath(d.daytog)); if (o) { o.days = o.days || []; const i = o.days.indexOf(d.d); i >= 0 ? o.days.splice(i, 1) : o.days.push(d.d); edQueue(); edRender(); } return; }
  if (d.addsch) { const p = edPath(d.addsch); let a = edGet(edC(), p); if (!Array.isArray(a)) { edSet(edC(), p, []); a = edGet(edC(), p); } a.push({ days: [], open: '09:00', close: '14:00' }); edQueue(); return edRender(); }
  if (d.translate !== undefined) return edTranslate();
  if (d.phmove) { const p = edPath(d.phmove), i = p[p.length - 1], a = edGet(edC(), p.slice(0, -1)), j = i + Number(d.dir); if (Array.isArray(a) && j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; edQueue(); edRender(); } return; }
  if (d.addtile) return edAddTile(d.addtile);
  if (d.addcont) { const g = edF().garbage; if (g) { (g.containers = g.containers || []).push({ where: Object.fromEntries(edLangs().map(l => [l, ''])), takes: [] }); edQueue(); edRender(); } return; }
  if (d.ctake !== undefined) { const ct = ((edF().garbage || {}).containers || [])[+d.ctake]; if (ct) { const t = ct.takes = ct.takes || []; ct.takes = t.includes(d.id) ? t.filter(x => x !== d.id) : [...t, d.id]; edQueue(); edRender(); } return; }
  if (d.addit) { const a = edGet(edC(), edPath(d.addit)); if (Array.isArray(a)) { a.push(edNewItem(a)); edQueue(); edRender(); } return; }
  if (d.addwifi !== undefined) { const pr = edC().private = edC().private || {}; pr.wifi = { password: '', networks: [{ ssid: '', label: { en: '' } }] }; edQueue(); return edRender(); }
  if (d.addnet !== undefined) { edC().private.wifi.networks.push({ ssid: '', label: { en: '' } }); edQueue(); return edRender(); }
  if (d.del) {
    if (t.dataset.sure !== '1' && !t.dataset.now) { t.dataset.sure = '1'; t.textContent = 'Sure?'; return; }
    const p = edPath(d.del), arr = edGet(edC(), p.slice(0, -1)); if (Array.isArray(arr)) { arr.splice(p[p.length - 1], 1); if (p[0] === 'private') for (const n of (edC().private.wifi.networks || [])) delete n.qr; edQueue(); edRender(); } return;
  }
  if (d.add) { const arr = edGet(edC(), edPath(d.add)); if (Array.isArray(arr)) { const o = {}; for (const l of edLangs()) o[l] = ''; arr.push(o); edQueue(); edRender(); } }
});
async function edInit() {
  const list = await edLoad();
  if (list.length && !document.querySelector('.edTop')) { const s = document.createElement('style'); s.textContent = ED_CSS; document.head.appendChild(s); const b = document.createElement('button'); b.type = 'button'; b.className = 'edTop'; b.textContent = 'My guide'; acctBar().prepend(b); }
  if (list.length && GUIDE && GUIDE.origin === 'imported') edOpen(GUIDE.id);
}
