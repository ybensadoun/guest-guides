/* ---------- Pre-fill from the host's listing ----------
   The host pastes their listing text (Airbnb or other). We read the facts out of it here, in the browser,
   and mark those answers "From your listing". Steps that got answers this way show "Review": the host only
   checks and approves them. We never fetch Airbnb ourselves. */
const AMEN_RX = {
  'Pool': /\bpool\b|piscina|piscine/i, 'Garden': /garden|jard[ií]n|jardin/i, 'BBQ': /\bbbq\b|barbecue|\bgrill\b|barbacoa/i,
  'Air conditioning': /air ?condition|aire acondicionado|climatisation/i, 'Heating or fireplace': /heating|fireplace|calefacci[oó]n|chimenea|chauffage|chemin[ée]e/i,
  'Washing machine': /\bwasher\b|washing machine|lavadora|lave-linge/i, 'Dishwasher': /dishwasher|lavavajillas|lave-vaisselle/i,
  'Coffee machine': /coffee maker|coffee machine|nespresso|espresso|cafetera|machine [àa] caf/i, 'Smart TV': /\btv\b|television|televisi[oó]n|t[ée]l[ée]/i,
  'Cot or high chair': /\bcrib\b|\bcot\b|high chair|cuna|trona|lit pour b[ée]b[ée]|chaise haute/i, 'Pets allowed': /pets allowed|se admiten mascotas|animaux accept/i,
  'Free parking': /free parking|aparcamiento gratuito|parking gratuit/i, 'EV charger': /\bev charger|cargador|borne de recharge/i, 'Hot tub': /hot tub|jacuzzi|bain [àa] remous/i,
  'Bikes': /\bbikes?\b|bicicleta|v[ée]lo/i, 'Workspace': /workspace|espacio de trabajo|espace de travail/i, 'Sea view': /(sea|ocean|beach) view|vistas al mar|vue sur (la )?mer/i,
  'Lift': /elevator|\blift\b|ascensor|ascenseur/i
};
const TYPE_RX = [[/villa/i, 'Villa'], [/cottage|casa rural|g[iî]te/i, 'Cottage'], [/farm|masia|finca|ferme/i, 'Farmhouse'],
  [/apartment|rental unit|condo|loft|flat|apartamento|piso|appartement|logement/i, 'Apartment'], [/private room|room in|habitaci[oó]n|chambre/i, 'Room'],
  [/home|house|casa|maison|bungalow|cabin|chalet/i, 'House']];
function hhmm(h, m, ap){ h = +h; m = m ? +m : 0; if (/pm/i.test(ap || '') && h < 12) h += 12; if (/am/i.test(ap || '') && h === 12) h = 0; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function parseListing(text){
  const t = text.replace(/\r/g, ''), L = t.split('\n').map(x => x.trim()).filter(Boolean), out = {};
  if (L[0] && L[0].length <= 80 && !/guests|hu[ée]sped|voyageur|entire|alojamiento|logement/i.test(L[0])) out.placeName = L[0];
  const where = t.match(/(?:^|\n)\s*(entire [^\n]*?|private room [^\n]*?|[^\n]*?(?:villa|home|house|cottage|apartment|rental unit|loft|condo|cabin|bungalow|alojamiento entero|casa|apartamento|logement entier|maison))\s+(?:in|en|[àa])\s+([^,\n]+)(?:,\s*([^\n]+))?/i);
  if (where) { out.town = where[2].trim(); if (where[3]) out.region = where[3].trim(); const ty = TYPE_RX.find(([rx]) => rx.test(where[1])); if (ty) out.propertyType = ty[1]; }
  const g = t.match(/(\d{1,2})\s+(?:guests|hu[ée]spedes|viajeros|voyageurs)/i); if (g) out.sleeps = g[1];
  const nn = (rx) => { const m = t.match(rx); return m ? m[1] : null; };
  const br = nn(/(\d{1,2})\s+(?:bedrooms?|habitaci[oó]n(?:es)?|dormitorios?|chambres?)/i), ba = nn(/(\d{1,2}(?:[.,]5)?)\s+(?:baths?|bathrooms?|ba[ñn]os?|salles? de bains?)/i), bd = nn(/(\d{1,2})\s+(?:beds?|camas?|lits?)\b/i);
  if (br) out.bedrooms = br; if (ba) out.bathrooms = ba.replace(',', '.'); if (bd) out.beds = bd;
  const ci = t.match(/check-?\s?in[^\n\d]{0,25}(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i) || t.match(/llegada[^\n\d]{0,25}(\d{1,2})(?:[:.](\d{2}))?/i) || t.match(/arriv[ée]e[^\n\d]{0,25}(\d{1,2})(?:[:h](\d{2}))?/i);
  if (ci) out.checkIn = hhmm(ci[1], ci[2], ci[3]);
  const co = t.match(/check-?\s?out[^\n\d]{0,25}(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i) || t.match(/salida[^\n\d]{0,25}(\d{1,2})(?:[:.](\d{2}))?/i) || t.match(/d[ée]part[^\n\d]{0,25}(\d{1,2})(?:[:h](\d{2}))?/i);
  if (co) out.checkOut = hhmm(co[1], co[2], co[3]);
  const rules = L.filter(l => l.length < 140 && /no (parties|smoking|pets|events|parties or events)|quiet hours|not allowed|smoking|pets allowed|prohibid|no se permite|silencio|interdit|non autoris|f[êe]tes/i.test(l));
  if (rules.length) out.houseRules = [...new Set(rules)].join('\n');
  const am = Object.keys(AMEN_RX).filter(k => AMEN_RX[k].test(t)); if (am.length) out.amenities = am;
  out._wifi = /wi-?fi/i.test(t);
  return out;
}
const FIELD_MODULE = { placeName: 'listing', town: 'listing', region: 'listing', propertyType: 'listing', sleeps: 'listing', bedrooms: 'listing', bathrooms: 'listing', beds: 'listing', checkIn: 'stay', checkOut: 'stay', houseRules: 'stay', amenities: 'howto' };
function applyListing(){
  const r = parseListing(v('listingText')), got = [];
  for (const [k, mod] of Object.entries(FIELD_MODULE)) {
    if (r[k] == null) continue;
    const empty = Array.isArray(A[k]) ? !A[k].length : !String(A[k] ?? '').trim();
    if (!empty) continue;
    A[k] = r[k]; got.push(k);
    A._pre = { ...(A._pre || {}), [k]: mod };
  }
  if (!A._slugTouched && (v('placeName'))) A.slug = cleanSlug(v('guideName') || v('placeName'));
  if (r.amenities && r.amenities.includes('Cot or high chair')) A.modules = { ...Object.fromEntries(SECTIONS.map(s => [s.id, secOn(s.id)])), ...(A.modules || {}), kids: true };
  log('prefill', 'listing', { n: got.length }); queueSave();
  return got;
}
const preKeys = m => Object.entries(A._pre || {}).filter(([k, mod]) => mod === m.id && filled(k)).map(([k]) => k);
