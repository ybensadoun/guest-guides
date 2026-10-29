/* ---------- Instant preview of the host's guide ----------
   Built in the browser from the host's own answers and photos, the moment they send (or press Preview).
   Lives at /<their-address> on this device. Researched sections (places, markets, events) show what the
   full guide will add. A Feedback button on every screen sends notes tagged with that screen. */
const PV = { screen: 'home', palette: null, preset: null };

// The phone's colours (acc: blue, red, yellow, green). Each layout has its own (engine/src/styles/presets/*.css); the host
// can take them from their cover picture or their logo instead (answers.colorsFrom), as the build does.
const PRESET_PAL = {
  bold: { paper: '#F3EEE3', ink: '#121212', acc: ['#1D4FA0', '#D52B1E', '#F5C400', '#0E7C46'] },
  soft: { paper: '#F7F3EE', ink: '#2E2B37', acc: ['#7FA7DA', '#E0806F', '#F1C96A', '#6FB08B'] },
  minimal: { paper: '#FFFFFF', ink: '#111111', acc: ['#2A5BD7', '#C8382B', '#2A5BD7', '#1F7A4D'] },
  mediterranean: { paper: '#FBFAF6', ink: '#122B4C', acc: ['#1F4F96', '#BF5536', '#F2C64B', '#2D7A62'] },
  rural: { paper: '#F2ECDF', ink: '#2A2318', acc: ['#4E6A3A', '#A3482B', '#E2B45A', '#3F6B3F'] }
};
const colorsFromKind = () => { const c = String(v('colorsFrom')).toLowerCase(); return /logo/.test(c) ? 'logo' : /cover|photo|picture/.test(c) ? 'cover' : 'look'; };
// The picture the colours come from: the logo, or the cover (the host's own, else the listing photo, even when the cover
// is drawn: engine/scripts/generate-site.py cover_im). None: the layout's own colours.
function colourSource(){
  const k = colorsFromKind(), up = kind => uploads.find(u => u.kind === kind), cur = String(A.coverUrl || '').split('?')[0];
  if (k === 'logo') return up('logo') ? { src: srcOf(up('logo')), logo: true } : null;
  if (k === 'cover') return up('cover') ? { src: srcOf(up('cover')) } : /^https:/.test(cur) ? { src: cur + '?im_w=480' } : null;
  return null;
}
// Same steps as the build's palette (generate-site.py): k-means, a light paper, a dark ink, then each colour slot takes
// the picture's colour nearest its hue (a logo's few colours each take the nearest free slot), made readable.
async function paletteFrom(src, logo){
  const im = await new Promise((res, rej) => { const i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); x.drawImage(im, 0, 0, n, n);   // a transparent logo is read on white
  const d = x.getImageData(0, 0, n, n).data, px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  const hls = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, l, 0]; const dd = mx - mn, s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn); const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return [h / 6, l, s]; };
  const fromHls = (h, l, s) => { const f = k0 => { const k = (k0 + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; };
  const lum = cc => { const f = vv => { vv /= 255; return vv <= .03928 ? vv / 12.92 : ((vv + .055) / 1.055) ** 2.4; }; return .2126 * f(cc[0]) + .7152 * f(cc[1]) + .0722 * f(cc[2]); };
  const con = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((s, t) => t - s); return (p + .05) / (q + .05); };
  const hex = cc => '#' + cc.map(vv => Math.round(vv).toString(16).padStart(2, '0')).join('').toUpperCase();
  const hd = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  let cent = Array.from({ length: 9 }, (_, i) => px[Math.floor((i + .5) * px.length / 9)].slice()), lab = [];
  for (let it = 0; it < 12; it++) {
    lab = px.map(p => { let bi = 0, bd = 1e9; cent.forEach((q, i) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); return bi; });
    cent = cent.map((q, i) => { const m = px.filter((_, j) => lab[j] === i); return m.length ? [0, 1, 2].map(k => m.reduce((a, p) => a + p[k], 0) / m.length) : q; });
  }
  const cl = cent.map((q, i) => ({ c: q, w: lab.filter(z => z === i).length / px.length })).filter(z => z.w > 0).sort((a, b) => b.w - a.w);
  const lights = cl.map(z => z.c).filter(q => hls(q)[1] > .82 && hls(q)[2] < .5).sort((a, b) => hls(b)[1] - hls(a)[1]), baseH = hls(cl[0].c)[0];
  let [h, l, s] = hls(lights[0] || fromHls(baseH, .965, .25)); const paper = fromHls(h, Math.max(l, .94), Math.min(s, .35));
  [h, l, s] = hls(cl.map(z => z.c).sort((a, b) => hls(a)[1] - hls(b)[1])[0]); const ink = fromHls(h, Math.min(l, .13), Math.min(s, .35));
  const acc = [];
  for (const z of cl.slice().sort((a, b) => hls(b.c)[2] * (.3 + b.w) - hls(a.c)[2] * (.3 + a.w))) { const q = hls(z.c); if (q[2] < .25 || acc.some(a => hd(q[0], hls(a)[0]) < .06)) continue; acc.push(z.c); }
  const real = acc.slice();
  while (acc.length < 4) acc.push(fromHls(acc.length ? (hls(acc[acc.length - 1])[0] + .33) % 1 : baseH, .45, .55));
  const T = { yellow: .14, red: 0, blue: .6, green: .33, orange: .07 }, slots = {}, pool = acc.slice(0, 6), own = logo && real.length;
  if (own) for (const q of real.slice(0, 5)) { const free = Object.keys(T).filter(k => !slots[k]); slots[free.sort((a, b) => hd(hls(q)[0], T[a]) - hd(hls(q)[0], T[b]))[0]] = q; }
  for (const [k, t] of Object.entries(T)) {
    if (slots[k]) continue;
    if (pool.length && !own) { const q = pool.slice().sort((a, b) => hd(hls(a)[0], t) - hd(hls(b)[0], t))[0]; if (hd(hls(q)[0], t) < .12) { slots[k] = q; pool.splice(pool.indexOf(q), 1); continue; } }
    slots[k] = k === 'blue' ? fromHls(t, .40, .45) : fromHls(t, .5, .55);   // no colour of the picture near this hue
  }
  if (con(slots.yellow, paper) < 1.6 || hls(slots.yellow)[2] < .45) slots.yellow = fromHls(.12, .58, .75);
  const onWhite = q => { let [a, b, e] = hls(q); while (con(q, [255, 255, 255]) < 3.2 && b > .08) { b -= .03; q = fromHls(a, b, e); } return q; };
  const onInk = q => { let [a, b, e] = hls(q); while (con(q, ink) < 5 && b < .92) { b += .03; q = fromHls(a, b, e); } return q; };
  return { paper: hex(paper), ink: hex(ink), acc: [onWhite(slots.blue), onWhite(slots.red), onInk(slots.yellow), onWhite(slots.green)].map(hex), own: true };
}
async function phonePalette(preset){
  const cs = colourSource();
  if (!cs) return PRESET_PAL[preset];
  if (PV.palSrc !== cs.src) { PV.palSrc = cs.src; PV.palette = await paletteFrom(cs.src, cs.logo).catch(() => null); }
  return PV.palette || PRESET_PAL[preset];
}
// The layout the host picked in The look, else Bauhaus ("Big colour tiles"), the guides' default (Yohann, 29 Oct 2026;
// engine/scripts/generate-site.py picks Bauhaus too when there is nothing to go on).
function choosePreset(){
  const mood = v('mood');
  if (mood === 'editorial') return 'minimal';   // an old answer
  return PRESET_FONTS[mood] ? mood : 'bold';
}
const PRESET_FONTS = {
  bold: ['Jost:wght@400;500;600;700', '"Jost",system-ui,sans-serif', '"Jost",system-ui,sans-serif'],
  soft: ['Outfit:wght@400;500;600;700', '"Outfit",system-ui,sans-serif', '"Outfit",system-ui,sans-serif'],
  minimal: ['Geist:wght@400;500;600;700&family=Jost:wght@400;500;600', '"Geist",system-ui,sans-serif', '"Jost",system-ui,sans-serif'],
  mediterranean: ['DM+Serif+Display&family=Outfit:wght@400;500;600;700', '"DM Serif Display",Georgia,serif', '"Outfit",system-ui,sans-serif'],
  rural: ['Fraunces:wght@400;600;700&family=Nunito:wght@400;600;700', '"Fraunces",Georgia,serif', '"Nunito",system-ui,sans-serif']
};

// The guide's sections, built from what the host chose and wrote.
const lines = k => (v(k) || '').split('\n').map(x => x.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
const ROOMKW = { Kitchen: /coffee|oven|hob|stove|dishwasher|fridge|kettle|microwave|kitchen|nespresso|toaster/i, 'Living room': /\btv\b|television|sofa|living|netflix|speaker|fireplace|heating/i,
  Bedroom: /bed|sheet|linen|blanket|pillow|wardrobe/i, Bathroom: /shower|bath|towel|hot water|boiler|toilet|hairdryer/i, Pool: /pool|swim|sunbed/i,
  Outside: /bbq|barbecue|garden|terrace|patio|hammock|outdoor|grill|shutter|awning/i, Laundry: /wash|dryer|iron|laundry|detergent/i, Office: /desk|office|printer|monitor/i };
function guideSections(){
  const S = [], on = id => secOn(id);
  const photosOf = room => uploads.filter(u => u.kind === 'photo' && (u.room || 'Other') === room).map(u => u.url);
  if (on('houseguide')) {
    const rooms = {}; lines('howTos').forEach(l => { const r = Object.keys(ROOMKW).find(k => ROOMKW[k].test(l)) || 'Good to know'; (rooms[r] = rooms[r] || []).push(l); });
    uploads.filter(u => u.kind === 'photo').forEach(u => { const r = u.room || 'Other'; rooms[r] = rooms[r] || []; });
    S.push({ id: 'houseguide', title: 'House guide', sub: 'How everything works', icon: 'tool', kind: 'rooms', rooms: Object.entries(rooms).map(([r, items]) => ({ r, items, photos: photosOf(r) })) });
  }
  if (on('wifi') && v('wifiName')) S.push({ id: 'wifi', title: 'Wi-Fi', sub: v('wifiName'), icon: 'wifi', kind: 'wifi' });
  if (on('arrival') && v('arrival')) S.push({ id: 'arrival', title: 'Getting here', sub: 'Arrival and parking', icon: 'car', kind: 'text', items: lines('arrival'), photos: uploads.filter(u => u.kind === 'arrivalPhoto').map(u => u.url) });
  S.push({ id: 'stay', title: 'Check-in and check-out', sub: `In from ${v('checkIn') || '?'} · out by ${v('checkOut') || '?'}`, icon: 'key', kind: 'text', items: [v('checkIn') && `Check-in from ${v('checkIn')}.`, v('checkOut') && `Check-out by ${v('checkOut')}.`, ...lines('checkoutTasks')].filter(Boolean), extra: lines('houseRules').length ? { h: 'House rules', items: lines('houseRules') } : null });
  if (on('rubbish')) S.push({ id: 'rubbish', title: 'Rubbish and recycling', sub: 'Which bin, which day', icon: 'bin', kind: 'text', items: rubbishLines(), research: !rubbishLines().length && 'Tell us how rubbish works at the house and we write it here.' });
  // What the research from the link found (start.js areaWatch), shown as it arrives; the full guide has the details.
  const found = (k, list) => (((AREA.result || {})[k] || {})[list] || []).slice(0, 10), nm = x => typeof x === 'string' ? x : (x && (x.en || Object.values(x)[0])) || '';
  const help = found('emergency', 'groups').flatMap(g => g.items || []).map(x => nm(x.name)).filter(n => n && !/^emergenc/i.test(n));
  if (on('emergency')) S.push({ id: 'emergency', title: 'Emergency and contacts', sub: '112, your number', icon: 'phone', kind: 'contacts', research: help.length ? `Found near you: ${help.slice(0, 3).join(', ')}. Hours and directions are in your full guide.` : 'We add the nearest hospital, pharmacy and on-call doctor, with hours.' });
  if (on('essentials')) S.push({ id: 'essentials', title: 'Shops and essentials', sub: 'Supermarket, bakery, pharmacy', icon: 'bag', kind: 'places', items: lines('essentials'), research: 'We add opening hours, distances and the ones you did not list.' });
  const picks = cats => Object.values(A.swipes || {}).filter(x => x.d === 'yes' && cats.includes(x.cat));
  if (on('eat')) S.push({ picks: picks(['eat', 'coffee', 'drinks']), id: 'eat', title: 'Eat and drink', sub: 'Our favourite places', icon: 'heart', kind: 'places', items: placeRows('favEat').map(r => r.p + (r.c ? ': ' + r.c : '')), research: !placeRows('favEat').length && 'Add the places you recommend, with a link or a name and a comment. We do not add restaurants of our own.' });
  if (on('todo')) S.push({ picks: picks(['todo']), id: 'todo', title: 'Things to do', sub: (A.interests || []).slice(0, 3).join(', ') || 'Around you', icon: 'compass', kind: 'places', items: [...lines('favDo'), ...lines('favourites')], research: found('todo', 'items').length ? 'Found near you by our research. Details and directions are in your full guide.' : `We research ${(A.interests || ['beaches', 'walks', 'sights']).join(', ').toLowerCase()} within ${v('radius') || '30 min'}.` });
  if (on('todo')) S[S.length - 1].items.push(...found('todo', 'items').map(t => `${nm(t.name)}${t.town ? ': ' + t.town : ''}`));
  if (on('nightlife')) S.push({ id: 'nightlife', title: 'Nightlife', sub: 'Bars, clubs, live music', icon: 'moon', kind: 'places', items: placeRows('favNight').map(r => r.p + (r.c ? ': ' + r.c : '')), research: !placeRows('favNight').length && 'Add the late bars, clubs and live music you recommend. We add none of our own.' });
  if (on('markets')) S.push({ id: 'markets', title: 'Local markets', sub: 'What is on today', icon: 'bag', kind: 'places', items: found('markets', 'markets').map(m => `${nm(m.name)}${m.town ? ': ' + m.town : ''}`), research: found('markets', 'markets').length ? 'Found near you. Days and hours are in your full guide.' : 'We list every weekly market nearby, with what runs today.' });
  if (on('events')) S.push({ id: 'events', title: 'Local events', sub: 'During your stay', icon: 'kite', kind: 'places', items: [], research: 'We list festivals and fairs, with dates.' });
  if (on('kids')) S.push({ id: 'kids', title: 'Kids corner', sub: (A.kidsAges || []).join(', ') || 'Families', icon: 'kite', kind: 'text', items: [...(A.kidsGear || []).map(g => `${g} at the house`), ...lines('kidsNotes')], research: 'We add playgrounds and family days out.' });
  if (on('daytrips')) S.push({ id: 'daytrips', title: 'Day trips', sub: 'Worth the drive', icon: 'car', kind: 'places', items: [], research: 'We pick the best trips within two hours.' });
  if (on('extras') && v('extras')) S.push({ id: 'extras', title: 'Extras', sub: 'Ask us', icon: 'gift', kind: 'text', items: lines('extras') });
  if (v('localTips')) S.push({ id: 'tips', title: 'Local tips', sub: 'From your host', icon: 'heart', kind: 'text', items: lines('localTips') });
  if (on('map')) S.push({ id: 'map', title: 'Map', sub: 'Everything in one place', icon: 'compass', kind: 'map' });
  return S;
}
// Order follows "What should guests see first?"
const FIRST = { 'Wi-Fi': 'wifi', 'Check-out time': 'stay', 'House guide': 'houseguide', 'How to get in': 'arrival', 'Places to eat': 'eat', 'What’s on today': 'events', 'Beaches': 'todo', 'Map': 'map', 'Your phone number': 'emergency', 'Rubbish tonight': 'rubbish' };
function ordered(S){ const pri = (A.homeFirst || []).map(x => FIRST[x]).filter(Boolean); return [...S].sort((a, b) => { const ia = pri.indexOf(a.id), ib = pri.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }); }

function pvStyle(p, preset){
  const [fam, disp, body] = PRESET_FONTS[preset];
  const a = p.acc;
  const base = `:root{--pp:${p.paper};--pi:${p.ink};--a1:${a[0]};--a2:${a[1]};--a3:${a[2]};--a4:${a[3]};--pd:${disp};--pb:${body}}`;
  const shared = `html,body{background:var(--pp)!important;margin:0!important;padding:0!important}
.pv{background:var(--pp);color:var(--pi);font:16px/1.5 var(--pb);min-height:100vh;padding-bottom:96px}
.pv *{box-sizing:border-box}.pv a{color:inherit}
.pv-in{max-width:620px;margin:0 auto;padding:0 16px;display:flex;flex-direction:column;gap:16px}
.pv h1,.pv h2,.pv h3{font-family:var(--pd);margin:0;line-height:1.05;text-wrap:balance}
.pv-cover{position:relative;height:clamp(240px,42vh,380px);background:var(--a1) center/cover no-repeat;margin:0 -16px}
.pv-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.55))}
.pv-art svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.pv-art .a-sky{fill:var(--a1)}.pv-art .a-sun{fill:var(--a3)}.pv-art .a-far{fill:color-mix(in srgb,var(--a1) 72%,var(--pi))}
.pv-art .a-mid{fill:color-mix(in srgb,var(--a4) 60%,var(--pp))}.pv-art .a-near{fill:color-mix(in srgb,var(--a4) 35%,var(--pp))}
.pv-art .a-wall{fill:#fff}.pv-art .a-roof{fill:var(--a2)}.pv-art .a-win,.pv-art .a-door{fill:color-mix(in srgb,var(--pi) 75%,var(--a1))}.pv-art .a-tree{fill:color-mix(in srgb,var(--a4) 55%,var(--pi))}
.pv-name{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;color:#fff}
.pv-logo{display:block;width:56px;height:56px;object-fit:contain;background:#fff;border-radius:12px;padding:5px;margin-bottom:10px}
.pv-name small{display:block;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.9}
.pv-name h1{font-size:clamp(34px,9vw,52px)}
.pv-welcome{font-size:18px;margin:4px 0 0}
.pv-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pv-fact{display:flex;flex-direction:column;gap:2px;padding:12px 14px;text-decoration:none;cursor:pointer;border:0;font:inherit;text-align:left;color:inherit;background:none}
.pv-fact small{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.pv-fact b{font-size:17px}
.pv-search{width:100%;font:inherit;font-size:17px;padding:14px 16px;border-radius:14px;border:2px solid var(--pi);background:#fff;color:#111}
.pv-h{font-size:24px;margin-top:8px}
.pv-secs{display:grid;gap:12px}
.pv-sec{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;text-decoration:none;cursor:pointer;border:0;font:inherit;text-align:left;color:inherit}
.pv-sec b{font-family:var(--pd);font-size:22px;line-height:1.1}
.pv-sec small{opacity:.8;font-size:14px}
.pv-sec .ic svg{width:28px;height:28px}
.pv-sec .ar{display:none}
.pv-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--pp)}
.pv-back{display:inline-flex;align-items:center;gap:6px;border:0;background:none;font:inherit;font-weight:700;cursor:pointer;color:inherit;padding:8px 4px}
.pv-back svg{width:18px;height:18px}
.pv-page h2{font-size:36px}
.pv-list{display:flex;flex-direction:column}
.pv-row{padding:14px 0;border-top:1px solid color-mix(in srgb,var(--pi) 15%,transparent)}
.pv-row:first-child{border-top:0}
.pv-row b{display:block}
.pv-photos{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory}
.pv-photos img{height:150px;border-radius:12px;scroll-snap-align:start;flex:none}
.pv-research{padding:14px 16px;border-radius:14px;background:color-mix(in srgb,var(--a3) 22%,var(--pp));font-size:15px}
.pv-research b{display:block;margin-bottom:2px}
.pv-pill{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--a3);color:#111;margin-left:6px;vertical-align:2px}
.pv-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;background:var(--pi);color:var(--pp);font-weight:700;text-decoration:none;border:0;font:inherit;cursor:pointer}
.pv-card{padding:16px;border-radius:16px;background:#fff;color:#111}
.pv-bar{position:fixed;left:0;right:0;top:0;z-index:40;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:6px 12px;background:#111;color:#fff;font:600 13px/1.3 system-ui,sans-serif}
.pv-bar a{color:#F2B33D}
.pv-shell{padding-top:32px}
.pv-fb{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:45;display:inline-flex;align-items:center;gap:8px;padding:13px 18px;border-radius:999px;border:0;background:#F2B33D;color:#1b1407;font:700 15px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer}
.pv-fb svg{width:18px;height:18px}
.fbs{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
.fbs-card{width:100%;max-width:520px;max-height:90vh;overflow:auto;background:#fff;color:#151515;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px;font:16px/1.45 system-ui,sans-serif}
.fbs-card h3{font:700 22px system-ui,sans-serif;margin:0}
.fbs-card textarea{width:100%;border:1.5px solid #ddd;border-radius:12px;padding:10px 12px;font:inherit;min-height:70px}
.fbs-card .tabs{display:flex;gap:6px}
.fbs-card .tabs button{flex:1;border:1.5px solid #ddd;background:#f6f5f1;border-radius:999px;padding:9px;font:600 14px system-ui;cursor:pointer;color:#151515}
.fbs-card .tabs button[aria-pressed="true"]{background:#151515;color:#fff;border-color:#151515}
.fbs-card .row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.fbs-card .stars{display:flex;gap:6px}.fbs-card .stars button{width:42px;height:42px;border-radius:10px;border:1.5px solid #ddd;background:#f6f5f1;font:700 16px system-ui;cursor:pointer;color:#151515}
.fbs-card .stars button[aria-pressed="true"]{background:#F2B33D;border-color:#F2B33D}
.fbs-card .hint{font-size:13px;color:#666;margin:0}`;
  const P = {
    bold: `.pv-secs{grid-template-columns:1fr 1fr}
.pv-sec{min-height:156px;padding:14px;border-radius:20px;color:var(--st,#fff);background:var(--sc);justify-content:flex-start;gap:4px}
.pv-sec::before{content:"";position:absolute;z-index:-1;top:0;right:0;width:54px;height:54px;background:var(--ss);border-radius:0 0 0 54px}
.pv-sec:nth-child(3n+2)::before{width:0;height:0;background:none;border-radius:0;border-left:25px solid transparent;border-right:25px solid transparent;border-top:44px solid var(--ss);right:12px}
.pv-sec:nth-child(3n)::before{width:46px;height:46px;border-radius:50%;top:-12px;right:-12px}
.pv-sec .ic{min-height:50px}.pv-sec .ic svg{width:26px;height:26px}
.pv-sec .tx{display:flex;flex-direction:column;gap:2px}.pv-sec b{font-family:var(--pb);font-weight:700;font-size:20px;line-height:1.12}.pv-sec small{font-size:13.5px}
.pv-sec .ar{display:grid;place-items:center;align-self:flex-end;margin-top:auto;width:32px;height:32px;border-radius:50%;background:#fff;color:#121212;font-weight:700}
.pv-sec.lt .ar{background:var(--pi);color:#fff}.pv-sec.wide{grid-column:1/-1;min-height:120px}
.pv-fact{background:#fff;border-radius:14px;border:2px solid var(--pi)}.pv-h{font-weight:700}.pv h1,.pv h2{font-weight:700}`,
    soft: `.pv-sec{min-height:130px;padding:16px;border-radius:26px;background:color-mix(in srgb,var(--sc) 24%,#fff);box-shadow:0 6px 22px rgba(0,0,0,.07)}
.pv-sec::before{content:"";position:absolute;z-index:-1;width:130px;height:130px;border-radius:50%;background:var(--sc);filter:blur(26px);opacity:.45;right:-30px;top:-30px}
.pv-sec .ic{margin-bottom:auto}.pv-secs{grid-template-columns:1fr 1fr}.pv-sec.wide{grid-column:1/-1;min-height:90px}
.pv-fact{background:#fff;border-radius:18px;box-shadow:0 4px 16px rgba(0,0,0,.06)}.pv-cover{border-radius:0 0 28px 28px}.pv h1,.pv h2{font-weight:600}.pv-card{border-radius:22px}`,
    mediterranean: `.pv-secs{grid-template-columns:1fr 1fr}.pv-sec.wide{grid-column:1/-1;min-height:96px}
.pv-sec{min-height:140px;padding:16px;border-radius:22px;color:#fff;background:var(--sc)}
.pv-sec:nth-child(6n+1){--sc:#1F4F96!important}.pv-sec:nth-child(6n+2){--sc:#D6E6F5!important;color:#122B4C}.pv-sec:nth-child(6n+3){--sc:#BF5536!important}
.pv-sec:nth-child(6n+4){--sc:#122B4C!important}.pv-sec:nth-child(6n+5){--sc:#F2C64B!important;color:#122B4C}.pv-sec:nth-child(6n){--sc:#17748A!important}
.pv-sec::before{content:"";position:absolute;z-index:-1;width:62px;height:62px;border-radius:10px;right:-12px;top:-12px;background:#fff radial-gradient(circle,#1F4F96 0 4.5px,transparent 5px) 0 0/15px 15px}
.pv-sec .ic svg{width:22px;height:22px}.pv-sec b{font-size:18px;font-weight:400;font-family:var(--pd)}.pv-sec .tx{display:flex;flex-direction:column}
.pv-fact{background:#fff;color:#122B4C;border:1px solid #DCE2EA;border-radius:12px}.pv h1,.pv h2{font-weight:400}.pv-h{font-size:15px;font-weight:600;opacity:.7}
.pv-cover{height:clamp(200px,32vh,280px)}`,
    rural: `.pv-secs{grid-template-columns:1fr 1fr}.pv-sec.wide{grid-column:1/-1;min-height:96px}
.pv-sec{min-height:140px;padding:16px;border-radius:18px;color:#FFFDF8;background:var(--sc)}
.pv-sec:nth-child(6n+1){--sc:#5A7034!important}.pv-sec:nth-child(6n+2){--sc:#E8D7A5!important;color:#3B2E21}.pv-sec:nth-child(6n+3){--sc:#A3482B!important}
.pv-sec:nth-child(6n+4){--sc:#3B2E21!important}.pv-sec:nth-child(6n+5){--sc:#DFA54A!important;color:#3B2E21}.pv-sec:nth-child(6n){--sc:#2F5236!important}
.pv-sec::before{content:"";position:absolute;z-index:-1;width:54px;height:54px;border-radius:0 100% 0 100%;right:-8px;top:-8px;background:#D9C98F}
.pv-sec .ic svg{width:22px;height:22px}.pv-sec b{font-size:17px;font-weight:600;font-family:var(--pd)}.pv-sec .tx{display:flex;flex-direction:column}
.pv-fact{background:#FFFDF8;color:#2A2318;border:1px solid #DDD2BF;border-radius:10px}.pv h1,.pv h2{font-weight:600}.pv-h{font-size:15px;font-weight:600;opacity:.7}
.pv-cover{height:clamp(200px,32vh,280px)}`,
    minimal: `.pv-secs{gap:0;border:1px solid color-mix(in srgb,var(--pi) 15%,transparent);border-radius:10px;overflow:hidden;background:#fff;color:#111}
.pv-sec{flex-direction:row;align-items:center;gap:14px;justify-content:flex-start;padding:14px 16px;border-top:1px solid #eee}.pv-sec:first-child{border-top:0}
.pv-sec .ic{color:var(--a1)}.pv-sec .ic svg{width:22px;height:22px}.pv-sec b{font-size:17px;font-weight:600;font-family:var(--pb)}.pv-sec .tx{display:flex;flex-direction:column}
.pv-fact{background:#fff;color:#111;border:1px solid #eee;border-radius:10px}.pv h1,.pv h2{font-weight:600;letter-spacing:-.02em}.pv-h{font-size:15px;font-weight:600;opacity:.7}
.pv-cover{height:clamp(200px,32vh,280px)}`
  };
  // Colours from a picture reach the tiles of Mediterranean and Rural too, which have their own (same mapping as the
  // build's layout_vars in engine/scripts/generate-site.py, and the editor's edLayoutVars).
  if (p.own && P[preset] && (preset === 'mediterranean' || preset === 'rural')) {
    const mix = (x, y, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(x.slice(i, i + 2), 16) * (1 - t) + parseInt(y.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
    const [bl, rd, ye, gr] = a, W = '#FFFFFF', K = '#000000';
    const to = preset === 'mediterranean' ? { '#1F4F96': bl, '#D6E6F5': mix(bl, W, .88), '#BF5536': rd, '#122B4C': mix(bl, K, .45), '#F2C64B': ye, '#17748A': gr }
      : { '#5A7034': gr, '#E8D7A5': mix(ye, W, .62), '#A3482B': rd, '#3B2E21': mix(rd, K, .62), '#DFA54A': ye, '#2F5236': mix(gr, K, .35), '#D9C98F': mix(ye, W, .45) };
    P[preset] = P[preset].replace(/#[0-9A-Fa-f]{6}\b/g, h => to[h.toUpperCase()] || h);
  }
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}&display=swap"><style>${base}${shared}${P[preset]}</style>`;
}

// The drawn cover, same scene as the guide's (engine/src/views/home.js THEMED_COVER).
const PV_ART = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect class="a-sky" width="400" height="160"/><circle class="a-sun" cx="246" cy="48" r="15"/><path class="a-far" d="M0 112C60 86 120 88 186 104S318 84 400 98V160H0z"/><path class="a-mid" d="M0 128C80 110 150 114 228 126S350 116 400 120V160H0z"/><path class="a-wall" d="M178 104h44v32h-44z"/><path class="a-roof" d="M173 106l27-18 27 18z"/><path class="a-win" d="M186 112h8v8h-8zM206 112h8v8h-8z"/><path class="a-door" d="M196 123h8v13h-8z"/><path class="a-tree" d="M238 136c-4 0-5-9-5-19s2-20 5-25c3 5 5 15 5 25s-1 19-5 19zM251 136c-3 0-4-6-4-13s2-14 4-18c2 4 4 11 4 18s-1 13-4 13z"/><path class="a-near" d="M0 140C100 130 220 132 300 138S380 136 400 136V160H0z"/></svg>`;

// One screen of the guide as guests will see it, built from the answers: the cover, the name, the sections. Used by the
// phone in the builder (the wow, and next to the steps) and by the full-page preview.
async function pvParts(screen){
  const preset = PV.preset || choosePreset(), p = await phonePalette(preset);
  const S = ordered(guideSections()), name = v('guideName') || v('placeName') || WOW.name || 'Your guide';
  // Same rule as the guide (engine/scripts/generate-site.py): the host's own cover, else the listing photo they chose,
  // unless they asked for a cover drawn from the colours.
  const own = (uploads.find(u => u.kind === 'cover') || {}).url, listing = A.coverChoice !== 'drawn' && A.coverUrl ? String(A.coverUrl).split('?')[0] + '?im_w=720' : '';
  const cover = own || listing, logo = (uploads.find(u => u.kind === 'logo') || {}).url;   // on the welcome card, as in the guide
  const colours = [p.acc[0], p.acc[1], p.ink, p.acc[3], p.acc[2]], shapes = [p.acc[2], p.ink, p.acc[1], p.acc[2], p.ink];
  const light = hex => { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160; };
  const scr = screen, sec = S.find(x => x.id === scr);
  const facts = [];
  for (const f of (A.homeFirst && A.homeFirst.length ? A.homeFirst : ['Wi-Fi', 'Check-out time'])) {
    if (f === 'Wi-Fi' && v('wifiName')) facts.push(['wifi', 'Wi-Fi', 'Tap to connect']);
    if (f === 'Check-out time' && v('checkOut')) facts.push(['stay', 'Check-out', 'Before ' + v('checkOut')]);
    if (f === 'Your phone number' && v('hostPhone')) facts.push(['emergency', 'Call ' + (v('hostName') || 'us'), v('hostPhone')]);
    if (f === 'How to get in' && v('arrival')) facts.push(['arrival', 'Getting here', 'Directions']);
    if (f === 'House guide') facts.push(['houseguide', 'House guide', 'How things work']);
    if (f === 'Places to eat') facts.push(['eat', 'Eat', lines('favourites').length + ' favourites']);
  }
  const ph = id => { const r = (S.find(x => x.id === 'houseguide') || {}).rooms || []; return id === 'houseguide' && r.find(x => x.photos.length) ? r.find(x => x.photos.length).photos[0] : null; };
  const home = `<div class="pv-cover${cover ? '' : ' pv-art'}"${cover ? ` style="background-image:url('${cover}')"` : ''}>${cover ? '' : PV_ART}<div class="pv-name">${logo ? `<img class="pv-logo" src="${esc(logo)}" alt="">` : ''}<small>Welcome to</small><h1>${esc(name)}</h1></div></div>
    ${v('tagline') ? `<p class="pv-welcome">${esc(v('tagline'))}</p>` : ''}${v('welcome') ? `<p style="margin:0;opacity:.85">${esc(v('welcome'))}</p>` : ''}
    ${/search/i.test(v('navStyle')) ? `<input class="pv-search" id="pvSearch" placeholder="Search the guide: wifi, bins, beach…" aria-label="Search the guide">` : ''}
    ${facts.length ? `<div class="pv-facts">${facts.slice(0, 4).map(f => `<button type="button" class="pv-fact" data-pv="${f[0]}"><small>${esc(f[1])}</small><b>${esc(f[2])}</b></button>`).join('')}</div>` : ''}
    <h2 class="pv-h">${/map/i.test(v('navStyle')) ? 'Around you' : 'Your guide'}</h2>
    <div class="pv-secs" id="pvSecs">${S.map((x, i) => { const pic = false; return `<button type="button" class="pv-sec${['bold', 'soft', 'mediterranean', 'rural'].includes(preset) && (i === S.length - 1 && S.length % 2 === 1) ? ' wide' : ''}${light(colours[i % colours.length]) ? ' lt' : ''}${pic ? ' has-photo' : ''}" data-pv="${x.id}" data-q="${esc((x.title + ' ' + x.sub + ' ' + (x.items || []).join(' ')).toLowerCase())}" style="--sc:${colours[i % colours.length]};--ss:${shapes[i % shapes.length]};--st:${light(colours[i % colours.length]) ? p.ink : '#fff'}"><span class="ic">${I[x.icon] || ''}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span><span class="ar" aria-hidden="true">→</span>${pic ? `<img class="ph" src="${pic}" alt="">` : ''}</button>`; }).join('')}</div>`;
  return { name, style: pvStyle(p, preset), body: `<div class="pv pv-shell">${sec ? `<div class="pv-top"><button class="pv-back" type="button" data-pv="home">${BACK}${esc(name)}</button></div>` : ''}
      <div class="pv-in">${sec ? pageHTML(sec) : home}</div></div>` };
}
async function renderPreview(){
  const { name, style, body } = await pvParts(PV.screen);
  document.body.innerHTML = `${style}
    <div class="pv-bar">Preview of ${esc(name)} · ${esc(BASE)}/${esc(v('slug'))} · <a href="/#look">Back to my answers</a></div>
    ${body}
    <button class="pv-fb" type="button" id="pvFb">${I.heart}Feedback</button><div class="toast" id="toast" hidden></div>`;
  const q = document.getElementById('pvSearch');
  if (q) q.addEventListener('input', () => { const t = q.value.toLowerCase().trim(); document.querySelectorAll('#pvSecs .pv-sec').forEach(b => { b.hidden = t && !b.dataset.q.includes(t); }); });
}

/* ---------- The phone: the guide, live, inside the builder (docs/plan-fast-builder.md, step 3) ----------
   Drawn in its own frame, so the guide's styles never touch the builder's. Tapping a tile opens that screen in the phone.
   PHONE.build: the parts arrive one after another (the wow, right after the link). */
const PHONE = { screen: 'home', build: false, timer: null };
const WOW = { stage: '', name: '' };   // the wow page: reading (the listing page), writing (Claude), done
// The guide screen each step changes, shown next to it.
const STEP_SCREEN = { nightlife: 'nightlife', known: 'wifi', wifi: 'wifi', stay: 'stay', howto: 'houseguide', photos: 'houseguide', arrival: 'arrival', rubbish: 'rubbish', contacts: 'emergency', nearby: 'todo', favourites: 'eat', area: 'todo', taste: 'todo' };
const phoneHTML = () => `<div class="phone"><div class="phone-scr"><iframe id="phoneFrame" title="Your guide, as guests will see it"></iframe></div></div>`;
// Both phones (this one, and the editor's, which shows the guide itself) draw the guide at a real phone's width, then
// scale it down to the frame: text and tiles keep their true sizes and wrap as they do on a phone.
const PHONE_W = 390;
function phoneFit(f){ const s = f && f.parentElement; if (!s || !s.clientWidth) return; const k = s.clientWidth / PHONE_W; f.style.transform = `scale(${k})`; f.style.height = Math.ceil(s.clientHeight / k) + 'px'; }
const phoneRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => phoneFit(e.target.querySelector('iframe')))) : null;
function phoneWatch(f){ phoneFit(f); if (phoneRO && f && !f.__watched) { f.__watched = true; phoneRO.observe(f.parentElement); } }
const PHONE_CSS = `<style>.pv{min-height:100vh;padding-bottom:28px}.pv-in{padding:0 14px}.pv-cover{margin:0 -14px;height:236px}.pv-name h1{font-size:34px}.pv-top{padding:8px 14px}
.pv-build .pv-cover,.pv-build .pv-name,.pv-build .pv-welcome,.pv-build .pv-fact,.pv-build .pv-h,.pv-build .pv-sec{animation:pvIn .55s cubic-bezier(.2,.7,.2,1) both}
.pv-build .pv-name{animation-delay:.25s}.pv-build .pv-welcome{animation-delay:.4s}.pv-build .pv-fact{animation-delay:.5s}.pv-build .pv-h{animation-delay:.6s}
${Array.from({ length: 14 }, (_, i) => `.pv-build .pv-sec:nth-child(${i + 1}){animation-delay:${(0.7 + i * 0.12).toFixed(2)}s}`).join('')}
@keyframes pvIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pv-build *{animation:none!important}}</style>`;
async function phoneRender(){
  const f = document.getElementById('phoneFrame'); if (!f) return;
  phoneWatch(f);
  // The step's own screen once it exists (Wi-Fi as soon as it has a name), the guide's home until then.
  const scr = ordered(guideSections()).some(x => x.id === PHONE.screen) ? PHONE.screen : 'home';
  const { style, body } = await pvParts(scr);
  const doc = f.contentDocument; if (!doc) return;
  if (!doc.getElementById('pvBody')) {
    doc.open(); doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="pvStyle"></div><div id="pvBody"></div></body></html>`); doc.close();
    doc.addEventListener('click', e => { const b = e.target.closest('[data-pv]'); if (b) { PHONE.screen = b.dataset.pv; PHONE.build = false; phoneRender().then(() => { try { f.contentWindow.scrollTo(0, 0); } catch (er) {} }); return; } if (e.target.closest('a')) e.preventDefault(); });
  }
  const st = doc.getElementById('pvStyle'), html = style + PHONE_CSS; if (st.innerHTML !== html) st.innerHTML = html;
  const bd = doc.getElementById('pvBody'); bd.className = PHONE.build ? 'pv-build' : ''; bd.innerHTML = body;
}
// Typing in a step updates the phone a moment later, without moving it.
const phoneSoon = () => { if (!document.getElementById('phoneFrame')) return; clearTimeout(PHONE.timer); PHONE.timer = setTimeout(() => { PHONE.build = false; phoneRender(); }, 350); };
document.addEventListener('input', phoneSoon); document.addEventListener('change', phoneSoon);
function pageHTML(x){
  const research = x.research ? `<div class="pv-research"><b>In your full guide</b>${esc(x.research)}</div>` : '';
  const list = items => items.length ? `<div class="pv-list">${items.map(t => { const [a, ...b] = t.split(/:\s|,\s| - /); return `<div class="pv-row"><b>${esc(a)}</b>${b.length ? esc(b.join(', ')) : ''}</div>`; }).join('')}</div>` : '';
  let body = '';
  if (x.kind === 'rooms') body = x.rooms.length ? x.rooms.map(r => `<section class="pv-card"><h3>${esc(r.r)}</h3>${r.photos.length ? `<div class="pv-photos">${r.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${list(r.items)}</section>`).join('') : `<div class="pv-research"><b>Nothing here yet</b>Add how things work and photos by room in your answers.</div>`;
  else if (x.kind === 'wifi') body = `<section class="pv-card"><p style="margin:0 0 6px;opacity:.7">Network</p><h3 style="font-size:24px">${esc(v('wifiName'))}</h3><p style="margin:12px 0 6px;opacity:.7">Password</p><h3 style="font-size:24px">${esc(v('wifiPassword'))}</h3></section><div class="pv-research"><b>In your full guide</b>A QR code to join with one tap, and a copy button.</div>`;
  else if (x.kind === 'contacts') body = `<section class="pv-card"><div class="pv-list"><div class="pv-row"><b>Emergencies: 112</b>Police, ambulance, fire</div>${v('hostPhone') ? `<div class="pv-row"><b>${esc(v('hostName') || 'Your host')}</b>${esc(v('hostPhone'))}</div>` : ''}${v('backupContact') ? `<div class="pv-row"><b>Backup</b>${esc(v('backupContact'))}</div>` : ''}${v('taxi') ? `<div class="pv-row"><b>Taxi</b>${esc(v('taxi'))}</div>` : ''}</div></section>${research}`;
  else if (x.kind === 'places') body = `${(x.picks || []).length ? `<section class="pv-card"><div class="pv-list">${x.picks.map(p => `<div class="pv-row"><b>${esc(p.name)}<span class="pv-pill">Host\u2019s pick</span></b>${esc([p.type, p.rating ? '★ ' + p.rating.toFixed(1) : '', p.km != null ? (+p.km).toFixed(1) + ' km' : ''].filter(Boolean).join(' · '))}${p.c ? `<br><i>“${esc(p.c)}”</i>` : ''}<br><a href="${esc(p.maps)}" target="_blank" rel="noopener">Directions</a></div>`).join('')}</div></section>` : ''}${x.items.length ? `<section class="pv-card"><div class="pv-list">${x.items.map(t => { const [a, ...b] = t.split(/,\s| - |:\s/); return `<div class="pv-row"><b>${esc(a)}<span class="pv-pill">Host’s pick</span></b>${esc(b.join(', '))}<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', ' + v('town'))}" target="_blank" rel="noopener">Directions</a></div>`; }).join('')}</div></section>` : ''}${research}`;
  else if (x.kind === 'map') body = `<section class="pv-card"><p style="margin:0">Every place in the guide on one map, centred near ${esc(v('town') || 'the house')} (never on the house itself).</p></section><a class="pv-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v('town'))}" target="_blank" rel="noopener">Open ${esc(v('town') || 'the area')} in Maps</a>`;
  else body = `${x.photos && x.photos.length ? `<div class="pv-photos">${x.photos.map(s => `<img src="${s}" alt="">`).join('')}</div>` : ''}${x.items && x.items.length ? `<section class="pv-card">${list(x.items)}</section>` : ''}${x.extra ? `<section class="pv-card"><h3>${esc(x.extra.h)}</h3>${list(x.extra.items)}</section>` : ''}${research}`;
  return `<div class="pv-page"><h2>${esc(x.title)}</h2><p style="opacity:.75;margin:6px 0 0">${esc(x.sub)}</p></div>${body}`;
}
function openFeedback(){
  const o = document.createElement('div'); o.className = 'fbs';
  let mode = 'screen', rating = 0;
  const screenName = PV.screen === 'home' ? 'Home' : (guideSections().find(x => x.id === PV.screen) || {}).title || PV.screen;
  const draw = () => { o.innerHTML = `<div class="fbs-card" role="dialog" aria-modal="true" aria-label="Feedback">
    <div class="row"><h3>Feedback</h3><button type="button" class="pv-back" data-x style="color:#151515">Close</button></div>
    <div class="tabs"><button type="button" data-mode="screen" aria-pressed="${mode === 'screen'}">This screen</button><button type="button" data-mode="all" aria-pressed="${mode === 'all'}">The whole guide</button></div>
    ${mode === 'screen' ? `<p class="hint">About “${esc(screenName)}”: what is missing, wrong or how should it look?</p><textarea id="fbt" placeholder="I would expect…"></textarea>`
      : `<div class="stars">${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" aria-pressed="${n === rating}">${n}</button>`).join('')}</div>
      <textarea id="fbr" placeholder="What feels right"></textarea><textarea id="fbw" placeholder="What is wrong or missing"></textarea><textarea id="fbu" placeholder="How would you like it to look or work instead?"></textarea>`}
    <div class="row"><span class="hint">Goes straight to the Guest Guide Maker team.</span><button type="button" class="pv-btn" data-send style="background:#151515;color:#fff">Send</button></div></div>`; };
  draw(); document.body.appendChild(o);
  o.addEventListener('click', async e => {
    if (e.target === o || e.target.closest('[data-x]')) { o.remove(); return; }
    const m = e.target.closest('[data-mode]'); if (m) { mode = m.dataset.mode; draw(); return; }
    const s = e.target.closest('[data-star]'); if (s) { rating = +s.dataset.star; draw(); return; }
    if (e.target.closest('[data-send]')) {
      const val = id => (o.querySelector('#' + id) || {}).value || '';
      const d = device();
      const fields = mode === 'screen' ? { kind: 'screen', screen: screenName, wrong: val('fbt') } : { kind: 'overall', screen: '', rating: rating || '', right: val('fbr'), wrong: val('fbw'), ux: val('fbu') };
      if (!(fields.wrong || fields.right || fields.ux || fields.rating)) { toast('Write a few words first'); return; }
      try { await nf('feedback', { sid, guide: v('slug'), round: 'preview', email: v('email'), preset: PV.preset || choosePreset(), device: deviceLine(d), device_json: JSON.stringify(d), ...fields }); log('feedback', PV.screen); flush(); o.remove(); toast('Thank you, sent!'); }
      catch (err) { toast('Could not send. Check your connection.'); }
    }
  });
}
document.addEventListener('click', e => {
  if (!document.querySelector('.pv')) return;
  const b = e.target.closest('[data-pv]'); if (b) { PV.screen = b.dataset.pv; log('preview', PV.screen); queueSave(); renderPreview().then(() => window.scrollTo(0, 0)); return; }
  if (e.target.closest('#pvFb')) openFeedback();
});


function rubbishLines(){
  const m = v('rubbishMode'), out = [];
  for (const r of containerRows()) if ((r.w || '').trim() || (r.t || []).length) out.push(`Containers${(r.t || []).length ? ' (' + r.t.map(id => (BIN_ROWS.find(b => b[0] === id) || [0, id])[1]).join(', ') + ')' : ''}: ${(r.w || '').trim() || 'see the map'}`);
  if (/house|mix/i.test(m)) for (const [id, lab] of BIN_ROWS) { const d = ((A.rubbishPlan || {})[id] || []); if (d.length) out.push(`${lab}: ${d.map(x => (DAYS7.find(y => y[0] === x) || [0, x])[1]).join(', ')}`); }
  if (v('rubbishNotes')) out.push(v('rubbishNotes'));
  return out;
}
