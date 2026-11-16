// The three sample houses, as plain data (see README.md). Everything here is made up, except the towns (public squares,
// never a real home), the emergency number 112 and what the generator brings from open data (train stations, stops).
// Every place, market, event and service ends with " (sample)". No phone but 112, no website, no Google id, no rating.
// Texts are in English: translations.json (beside this file) holds the other five languages.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const KINDS = JSON.parse(readFileSync(ROOT + 'engine/src/kinds.json', 'utf8'));
const GROUPS = JSON.parse(readFileSync(ROOT + 'engine/src/groups.json', 'utf8')).groups;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const H = (days, open, close) => ({ days, open, close });   // a close earlier than open is after midnight
const ALL = DAYS, MON_SAT = DAYS.slice(0, 6), MON_FRI = DAYS.slice(0, 5), TUE_SUN = DAYS.slice(1), WEEKEND = ['sat', 'sun'];

// ---------- what the three houses share ----------
const COMMON = {
  languages: ['en', 'es', 'fr', 'ca', 'de', 'nl'], sourceLang: 'en', region: 'Catalonia', radius: '30 min',
  checkIn: '16:00', checkOut: '11:00', coverChoice: 'drawn',
  tagline: 'A made-up home to try the guide.',
  welcome: 'Welcome! This house is made up, only to try the guide. Everything you see here is invented, except the town, the emergency number and the public transport data.',
  wifiName: 'Sample-Guest', wifiPassword: 'sample-password',
  rubbishMode: 'A mix: bins at the house and containers in the street',
  rubbishPlan: { organic: ['mon', 'thu', 'sun'], packaging: ['mon', 'thu'], paper: ['wed', 'sat'], rest: ['tue', 'fri'] },
  rubbishTime: '07:00', rubbishNotes: 'Put the bins out the evening before.',
  howTos: 'The coffee machine is on the counter. Capsules are in the drawer below.\nThe TV remote is on the sofa.\nHot water takes a minute to arrive.',
  houseRules: 'No parties after 22:00.\nPlease do not smoke inside.',
  checkoutTasks: 'Put used towels in the bath.\nLeave the key in the key box.',
  sleeping: 'Bedroom 1: one double bed.\nBedroom 2: two single beds.',
  propertyType: 'Entire home', sleeps: '4', bedrooms: '2', beds: '3', bathrooms: '1',
  modules: { houseguide: true, emergency: true, rubbish: true, markets: true, events: true, eat: true, todo: true, nightlife: true, wifi: true, map: true, house: true, quick: true },
};
const ROOMS = {
  living: { n: 'Living room', c: 'Living room', t: 'The sofa turns into a bed.' },
  kitchen: { n: 'Kitchen', c: 'Kitchen', t: 'Please run the dishwasher before you leave.' },
  bed1: { n: 'Bedroom 1', c: 'Bedroom', t: 'Extra blankets are in the wardrobe.' },
  bed2: { n: 'Bedroom 2', c: 'Bedroom', t: 'The window looks over the street.' },
  bath: { n: 'Bathroom', c: 'Bathroom', t: 'Towels are on the shelf.' },
  terrace: { n: 'Terrace', c: 'Terrace', t: 'The table seats six.' },
  garden: { n: 'Garden', c: 'Garden', t: 'Please close the gate at night.' },
};
const EMERGENCY_112 = {
  id: '112', phone: '112', always: true,
  name: { en: 'Emergencies', es: 'Emergencias', fr: 'Urgences', ca: 'Emergències', de: 'Notruf', nl: 'Noodnummer' },
  what: {
    en: 'Ambulance, police or fire, for anything serious or dangerous. Free from any phone. They speak English, French and German.',
    es: 'Ambulancia, policía o bomberos, para cualquier cosa grave o peligrosa. Gratis desde cualquier teléfono. Hablan inglés, francés y alemán.',
    fr: 'Ambulance, police ou pompiers, pour tout ce qui est grave ou dangereux. Gratuit depuis n\'importe quel téléphone. On y parle anglais, français et allemand.',
    ca: 'Ambulància, policia o bombers, per a qualsevol cosa greu o perillosa. Gratuït des de qualsevol telèfon. Parlen anglès, francès i alemany.',
    de: 'Rettungsdienst, Polizei oder Feuerwehr bei allem, was ernst oder gefährlich ist. Kostenlos von jedem Telefon. Auch auf Englisch, Französisch und Deutsch.',
    nl: 'Ambulance, politie of brandweer, voor alles wat ernstig of gevaarlijk is. Gratis vanaf elke telefoon. Ze spreken Engels, Frans en Duits.',
  },
};
const emergency = () => ({
  _doc: 'Made-up emergency page of a sample house: only 112 is real.',
  groups: [
    { id: 'urgent', items: [EMERGENCY_112] },
    { id: 'health', items: [
      { id: 'health-centre', name: { en: 'Health centre (sample)' }, what: { en: 'A made-up health centre. In a real guide this is the nearest one, with its opening hours.' }, schedule: [H(MON_FRI, '08:00', '20:00')] },
      { id: 'pharmacy', name: { en: 'Pharmacy (sample)' }, what: { en: 'A made-up pharmacy with long opening hours.' }, schedule: [H(ALL, '09:00', '21:00')] },
    ] },
    { id: 'police', items: [
      { id: 'police', name: { en: 'Local police (sample)' }, what: { en: 'A made-up police station. For anything urgent, call 112 first.' }, always: true },
    ] },
  ],
});

// ---------- helpers for positions, distances and the researched files ----------
const hav = (a, b, c, d) => { const r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b), h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(h)); };
const R5 = x => Math.round(x * 1e5) / 1e5;
const pt = (h, north, east) => ({ lat: R5(h.lat + north / 111320), lng: R5(h.lng + east / (111320 * Math.cos(h.lat * Math.PI / 180))) });   // metres north and east of the house's square
const km = (h, p) => Math.max(1, Math.round(hav(h.lat, h.lng, p.lat, p.lng) * 1.3));
const iso = (base, plus) => { const d = new Date(base + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + plus); return d.toISOString().slice(0, 10); };

// ---------- the houses ----------
// Places: p (the host's words, the key of geocode.json), c (the host's comment), kind (engine/src/kinds.json), at [north, east] in metres,
// sch (opening rows), price, book, always. Researched: markets, todo (kind, at, sch/always, kids), events (type, at, in days from the base).
export const HOUSES = [
  {
    slug: 'sample-city', name: 'Sample city flat', kind: 'city', town: 'Barcelona', lat: 41.3870, lng: 2.1700, world: 'night',
    answers: { amenities: ['wifi', 'kitchen', 'washer', 'tv', 'ac', 'heating', 'hair_dryer', 'essentials', 'iron', 'coffee_maker', 'dishwasher', 'workspace', 'city_view'],
      arrival: 'Arrive from 16:00. The key box is by the front door.\nThe metro and the train are a few minutes away. You do not need a car.',
      localTips: 'Walk: most things are close.',
      rooms: [ROOMS.living, ROOMS.kitchen, ROOMS.bed1, ROOMS.bed2, ROOMS.bath],
      rubbishSpots: [{ w: 'The glass container is at the end of the street.', t: ['glass'], m: 'https://www.google.com/maps/search/?api=1&query=41.38760,2.16920' }] },
    eat: [
      { p: 'Bar La Plaça (sample)', c: 'Quick coffee and a sandwich, a minute from the metro.', kind: 'mug', at: [150, 60], sch: [H(MON_SAT, '07:30', '21:00')] },
      { p: 'Cal Mostra (sample)', c: 'A small place for lunch with a set menu.', kind: 'fork', at: [-220, 140], sch: [H(MON_FRI, '13:00', '16:00'), H(WEEKEND, '13:00', '17:00')], price: '10-20' },
      { p: 'Forn del Barri (sample)', c: 'Fresh bread and pastries from early morning.', kind: 'croissant', at: [90, -260], sch: [H(MON_SAT, '07:00', '20:00'), H(['sun'], '08:00', '14:00')] },
      { p: 'Taverna Exemple (sample)', c: 'Rice dishes to share. Book for dinner.', kind: 'paella', at: [-340, -120], sch: [H(ALL, '13:00', '23:30')], price: '30-40', book: true },
    ],
    night: [
      { p: 'Cocteleria Prova (sample)', c: 'Cocktails and low lights. Open late.', kind: 'mug', at: [260, 210], sch: [H(['sun', 'mon', 'tue', 'wed'], '20:00', '00:00'), H(['thu', 'fri', 'sat'], '20:00', '02:00')] },
      { p: 'Terrassa Nocturna (sample)', c: 'A rooftop bar with a view over the roofs.', kind: 'mug', at: [-130, 330], sch: [H(['fri', 'sat'], '21:00', '03:00')] },
    ],
    todoOwn: [
      { p: 'Museu Mostra (sample)', c: 'A small museum, good on a rainy day.', kind: 'palette', at: [420, -180], sch: [H(['tue', 'wed', 'thu', 'fri', 'sat'], '10:00', '19:00'), H(['sun'], '10:00', '15:00')] },
      { p: 'Parc de la Mostra (sample)', c: 'A play park for kids, with a shady picnic area.', kind: 'trampoline', at: [-480, 260], always: true },
    ],
    todo: [
      { name: 'Galeria d\'Art Exemple (sample)', kind: 'palette', at: [520, 90], sch: [H(['tue', 'wed', 'thu', 'fri', 'sat'], '11:00', '20:00')], d: 'A small gallery with changing shows. Free on the first Sunday.' },
      { name: 'Torre Mostra (sample)', kind: 'arch', at: [-600, -310], always: true, d: 'A tower you can see from far away. Good for a photo at sunset.' },
      { name: 'Mirador dels Tres Pins (sample)', kind: 'mountain', at: [3200, 1400], always: true, d: 'A hilltop with a view over the whole city. Bring water.' },
      { name: 'Pista de Bitlles Prova (sample)', kind: 'bowling', at: [-850, 520], sch: [H(ALL, '11:00', '23:00')], d: 'Bowling and arcade games. Good with kids on a wet day.', kids: true },
      { name: 'Sala de Música Prova (sample)', kind: 'music', at: [700, -640], sch: [H(['fri', 'sat'], '20:00', '23:30')], d: 'Small concerts, mostly on weekends.' },
      { name: 'Ruïnes de Mostra (sample)', kind: 'roman', at: [-300, 780], sch: [H(TUE_SUN, '10:00', '14:00')], d: 'The remains of an old wall, under a modern square.' },
    ],
    markets: [
      { id: 'mercat-placa', cat: 'covered', name: 'Mercat Coberto de la Plaça (sample)', comarca: 'Barcelonès', at: [380, -240], sch: [H(MON_SAT, '08:00', '20:00')], tags: ['fruitveg', 'meat', 'fish', 'cheese'], flags: ['closest'], stalls: 60, d: 'A covered market with fresh food every day but Sunday. Come in the morning.' },
      { id: 'mercat-dijous', cat: 'street', name: 'Mercat del Dijous (sample)', comarca: 'Barcelonès', at: [-900, 450], sch: [H(['thu'], '08:00', '14:00')], tags: ['food', 'fruitveg', 'clothes'], stalls: 40, d: 'A weekly street market with food and clothes.' },
      { id: 'mercat-pages', cat: 'street', name: 'Mercat de Pagès Exemple (sample)', comarca: 'Barcelonès', at: [1300, -800], sch: [H(['fri'], '09:00', '14:00')], tags: ['fruitveg', 'cheese'], stalls: 15, d: 'A small market of local farmers. Good for fruit, vegetables and cheese.' },
      { id: 'mercat-antiguitats', cat: 'antiques', name: 'Mercat d\'Antiguitats Prova (sample)', comarca: 'Barcelonès', at: [-1600, 900], sch: [H(['sat'], '10:00', '20:00')], tags: ['antiques', 'crafts'], stalls: 70, d: 'Old furniture, books and small treasures on a big square.' },
      { id: 'mercat-puces', cat: 'flea', name: 'Mercat de les Puces Mostra (sample)', comarca: 'Barcelonès', at: [2400, 1800], sch: [H(['sun'], '09:00', '15:00')], tags: ['secondhand', 'home'], stalls: 120, d: 'A big flea market on Sunday mornings. Go early.' },
    ],
    events: [
      { id: 'festa-barri', type: 'festa', name: 'Festa del Barri (sample)', at: [200, 100], from: 3, days: 3, time: '18:00', st: 'confirmed', d: 'The neighbourhood party: street music, food and dancing.' },
      { id: 'concert-placa', type: 'music', name: 'Concert a la Plaça (sample)', at: [-80, 40], from: 9, days: 1, time: '20:30', until: '22:30', st: 'confirmed', d: 'A free evening concert on the square.' },
      { id: 'cinema-fresca', type: 'film', name: 'Cinema a la Fresca Prova (sample)', at: [500, -400], from: 18, days: 1, time: '21:30', st: 'expected', d: 'An open-air film. Bring a light jacket.' },
      { id: 'cursa-popular', type: 'sports', name: 'Cursa Popular Exemple (sample)', at: [-400, 700], from: 33, days: 1, time: '09:30', st: 'expected', d: 'A fun run through the old streets, for all ages.' },
      { id: 'dia-nens', type: 'kids', name: 'Dia dels Nens Mostra (sample)', at: [700, 300], from: 55, days: 1, time: '11:00', until: '14:00', st: 'expected', d: 'Games, workshops and a puppet show for children.' },
    ],
  },
  {
    slug: 'sample-coast', name: 'Sample beach house', kind: 'coast', town: 'Sitges', lat: 41.2353, lng: 1.8113, world: 'sea',
    answers: { amenities: ['wifi', 'kitchen', 'washer', 'tv', 'ac', 'hair_dryer', 'essentials', 'beach_towels', 'coffee_maker', 'dishwasher', 'workspace', 'sea_view'],
      arrival: 'Arrive from 16:00. The key box is by the front door.\nPark on the street or in the public car park by the beach.',
      localTips: 'Go to the beach early, before the sun is strong.',
      rooms: [ROOMS.living, ROOMS.kitchen, ROOMS.bed1, ROOMS.bed2, ROOMS.bath, ROOMS.terrace],
      rubbishSpots: [{ w: 'The glass container is at the end of the street.', t: ['glass'], m: 'https://www.google.com/maps/search/?api=1&query=41.23580,1.81000' }] },
    eat: [
      { p: 'Peix i Brasa Exemple (sample)', c: 'Fish of the day, grilled. A terrace by the sea.', kind: 'fish', at: [-180, 220], sch: [H(ALL, '13:00', '16:00'), H(ALL, '20:00', '23:00')], price: '25-35' },
      { p: 'Cafè del Passeig (sample)', c: 'Coffee on the promenade, good for an early start.', kind: 'mug', at: [-260, 90], sch: [H(ALL, '08:00', '20:00')] },
      { p: 'Cuina de la Mar (sample)', c: 'Rice dishes with seafood. Book at weekends.', kind: 'paella', at: [120, 330], sch: [H(ALL, '13:00', '16:30'), H(['fri', 'sat'], '20:00', '23:00')], price: '25-35', book: true },
      { p: 'Fleca Prova (sample)', c: 'Bread, pastries and sandwiches for the beach.', kind: 'croissant', at: [210, -150], sch: [H(MON_SAT, '07:30', '20:00')] },
    ],
    night: [
      { p: 'Bar de l\'Onada (sample)', c: 'A bar with a sea view, open late at weekends.', kind: 'mug', at: [-300, 40], sch: [H(['thu', 'fri', 'sat', 'sun'], '19:00', '02:00')] },
      { p: 'Sala Moll (sample)', c: 'Drinks and live music on Saturdays.', kind: 'mug', at: [-420, 300], sch: [H(['fri', 'sat'], '21:00', '03:00')] },
    ],
    todoOwn: [
      { p: 'Platja de la Mostra (sample)', c: 'A long sandy beach with calm water and a shower.', kind: 'beach', at: [-520, 120], always: true },
      { p: 'Passeig Marítim Prova (sample)', c: 'A flat walk along the sea, good with a pram.', kind: 'town', at: [-380, -200], always: true },
    ],
    todo: [
      { name: 'Platja Petita Exemple (sample)', kind: 'beach', at: [-900, 700], always: true, d: 'A small, quiet beach between two rocks. Few people, even in summer.' },
      { name: 'Celler Exemple (sample)', kind: 'wine', at: [4200, -3100], sch: [H(['thu', 'fri', 'sat', 'sun'], '11:00', '18:00')], d: 'A family winery with a tasting among the vines. Book ahead.', book: true },
      { name: 'Far de Mostra (sample)', kind: 'arch', at: [-1200, -500], always: true, d: 'An old lighthouse on the rocks. Good light for photos.' },
      { name: 'Museu del Mar Prova (sample)', kind: 'palette', at: [260, 180], sch: [H(['tue', 'wed', 'thu', 'fri', 'sat'], '10:00', '19:00'), H(['sun'], '10:00', '15:00')], d: 'A small museum about boats, nets and the old fishing life.' },
      { name: 'Parc Aquàtic de la Costa (sample)', kind: 'waterpark', at: [5200, -4000], season: ['06-15', '09-10'], d: 'Slides and pools for all ages. Open in summer only.', kids: true },
      { name: 'Camí de Ronda Exemple (sample)', kind: 'mountain', at: [-700, -1500], always: true, d: 'A coast path with views of small bays. Wear good shoes.' },
    ],
    markets: [
      { id: 'mercat-municipal', cat: 'covered', name: 'Mercat Municipal Mostra (sample)', comarca: 'Garraf', at: [180, 260], sch: [H(MON_SAT, '08:00', '14:00')], tags: ['fruitveg', 'meat', 'cheese'], flags: ['closest'], stalls: 30, d: 'A covered market with local fruit, vegetables and cheese.' },
      { id: 'mercat-peix', cat: 'street', name: 'Mercat del Peix de la Llotja (sample)', comarca: 'Garraf', at: [-600, 520], sch: [H(['tue', 'wed', 'thu', 'fri', 'sat'], '07:00', '13:00')], tags: ['fish'], stalls: 8, d: 'Fresh fish from the morning boats, sold by the harbour.' },
      { id: 'mercat-dimecres', cat: 'street', name: 'Mercat del Dimecres (sample)', comarca: 'Garraf', at: [-1500, -1900], sch: [H(['wed'], '08:30', '13:30')], tags: ['food', 'clothes', 'home'], stalls: 50, d: 'A weekly market with food, clothes and things for the home.' },
      { id: 'mercat-artesania', cat: 'events', name: 'Mercat d\'Artesania del Passeig (sample)', comarca: 'Garraf', at: [-450, 60], sch: [H(WEEKEND, '17:00', '22:00')], tags: ['crafts'], stalls: 25, d: 'Handmade jewellery, bags and ceramics on the promenade, on weekend evenings.' },
      { id: 'mercat-puces', cat: 'flea', name: 'Mercat de les Puces de la Costa (sample)', comarca: 'Garraf', at: [3800, 2600], sch: [H(['sun'], '09:00', '14:00')], tags: ['secondhand', 'home', 'antiques'], stalls: 90, d: 'A Sunday flea market in a nearby town. Come early.' },
    ],
    events: [
      { id: 'festa-platja', type: 'festa', name: 'Festa de la Platja (sample)', at: [-500, 150], from: 3, days: 2, time: '19:00', st: 'confirmed', d: 'A beach party with music, food stalls and fireworks.' },
      { id: 'fira-peix', type: 'food', name: 'Fira del Peix Exemple (sample)', at: [-300, 400], from: 10, days: 2, time: '11:00', until: '18:00', st: 'confirmed', d: 'Taste fish and seafood from the local boats.' },
      { id: 'concert-moll', type: 'music', name: 'Concert al Moll (sample)', at: [-450, 280], from: 20, days: 1, time: '21:00', until: '23:00', st: 'expected', d: 'A free concert by the harbour, at sunset.' },
      { id: 'carnaval-mostra', type: 'carnival', name: 'Carnaval de Mostra (sample)', at: [30, 30], from: 34, days: 3, time: '17:00', st: 'expected', d: 'Costumes, floats and a big parade through the streets.' },
      { id: 'regata-mostra', type: 'sports', name: 'Regata de Mostra (sample)', at: [-700, 600], from: 56, days: 1, time: '10:00', until: '15:00', st: 'expected', d: 'A sailing race you can watch from the beach.' },
    ],
  },
  {
    slug: 'sample-village', name: 'Sample village house', kind: 'village', town: 'Prades', lat: 41.3098, lng: 0.9884, world: 'country',
    answers: { amenities: ['wifi', 'kitchen', 'washer', 'tv', 'heating', 'fireplace', 'hair_dryer', 'essentials', 'coffee_maker', 'dishwasher', 'workspace', 'garden_view'],
      arrival: 'Arrive from 16:00. The key box is by the front door.\nPark in front of the house. The street is quiet.',
      localTips: 'Bring a jacket: the evenings are cool.',
      rooms: [ROOMS.living, ROOMS.kitchen, ROOMS.bed1, ROOMS.bed2, ROOMS.bath, ROOMS.garden],
      rubbishSpots: [{ w: 'The glass container is at the end of the street.', t: ['glass'], m: 'https://www.google.com/maps/search/?api=1&query=41.30930,0.98700' }] },
    eat: [
      { p: 'Fonda del Poble (sample)', c: 'Home cooking: stews and grilled meat.', kind: 'pot', at: [-90, 120], sch: [H(TUE_SUN, '13:00', '16:00')], price: '15-25' },
      { p: 'Forn de Pa Exemple (sample)', c: 'Bread and pastries baked every morning.', kind: 'croissant', at: [140, -80], sch: [H(MON_SAT, '07:00', '14:00')] },
      { p: 'Cafè de la Plaça (sample)', c: 'The village café, on the square.', kind: 'mug', at: [30, 40], sch: [H(ALL, '08:00', '22:00')] },
      { p: 'Brasa del Camí (sample)', c: 'Meat on a wood grill, big portions. Book at weekends.', kind: 'ham', at: [-260, -180], sch: [H(['fri', 'sat', 'sun'], '13:00', '16:00'), H(['fri', 'sat'], '20:00', '23:00')], price: '20-30', book: true },
    ],
    night: [
      { p: 'Bar del Casal (sample)', c: 'The village bar, open late on weekends.', kind: 'mug', at: [60, 160], sch: [H(['sun', 'mon', 'tue', 'wed', 'thu'], '19:00', '23:00'), H(['fri', 'sat'], '20:00', '02:00')] },
      { p: 'Terrassa de l\'Estiu (sample)', c: 'A garden terrace for summer evenings.', kind: 'mug', at: [-200, 260], sch: [H(['fri', 'sat', 'sun'], '19:00', '00:00')] },
    ],
    todoOwn: [
      { p: 'Mirador de la Vila (sample)', c: 'A viewpoint over the village roofs and the mountains. Best at sunset.', kind: 'mountain', at: [380, -200], always: true },
      { p: 'Font de la Mostra (sample)', c: 'A spring and a shady spot for a picnic.', kind: 'spring', at: [-420, 330], always: true },
    ],
    todo: [
      { name: 'Castell Exemple (sample)', kind: 'castle', at: [1800, 1500], sch: [H(WEEKEND, '10:00', '14:00')], d: 'The ruins of an old castle on a hill. A short climb, a big view.' },
      { name: 'Ermita de Mostra (sample)', kind: 'monastery', at: [-2400, 1100], sch: [H(WEEKEND, '10:00', '17:00')], d: 'A small chapel up the mountain, reached by an easy path.' },
      { name: 'Ruta dels Tres Pics (sample)', kind: 'mountain', at: [3100, -2200], always: true, d: 'A walk of about three hours through pine forest. Bring water.' },
      { name: 'Celler de Prova (sample)', kind: 'wine', at: [-1500, -1800], sch: [H(['thu', 'fri', 'sat', 'sun'], '11:00', '18:00')], d: 'A village winery with a tasting. Book ahead.', book: true },
      { name: 'Parc d\'Aventura Exemple (sample)', kind: 'trampoline', at: [4200, 2800], sch: [H(WEEKEND, '10:00', '18:00')], d: 'Rope bridges and zip lines in the trees, for kids and adults.', kids: true },
      { name: 'Banys d\'Aigua Prova (sample)', kind: 'spring', at: [-3600, 3000], always: true, d: 'Natural pools in a stream, cold and clear. Best in summer.' },
    ],
    markets: [
      { id: 'mercat-placa-major', cat: 'street', name: 'Mercat de la Plaça Major (sample)', comarca: 'Baix Camp', at: [20, 30], sch: [H(['sun'], '08:30', '13:30')], tags: ['fruitveg', 'food', 'crafts'], flags: ['closest'], stalls: 20, d: 'The village market on the main square: fruit, vegetables and local food.' },
      { id: 'mercat-pages-divendres', cat: 'street', name: 'Mercat de Pagès del Divendres (sample)', comarca: 'Baix Camp', at: [350, -220], sch: [H(['fri'], '09:00', '13:00')], tags: ['fruitveg', 'cheese'], stalls: 8, d: 'A few farmers sell what they grow. Small, but fresh.' },
      { id: 'mercat-dimecres', cat: 'street', name: 'Mercat del Dimecres (sample)', comarca: 'Baix Camp', at: [-9000, 6000], sch: [H(['wed'], '09:00', '14:00')], tags: ['food', 'clothes', 'home'], stalls: 40, d: 'A weekly market in the next town, with food, clothes and home goods.' },
      { id: 'mercat-dijous', cat: 'street', name: 'Mercat del Dijous (sample)', comarca: 'Baix Camp', at: [12000, 4000], sch: [H(['thu'], '09:00', '13:30')], tags: ['fruitveg', 'food', 'plants'], stalls: 30, d: 'A town market with fruit, vegetables and plants.' },
      { id: 'mercat-antiguitats', cat: 'antiques', name: 'Mercat d\'Antiguitats del Dissabte (sample)', comarca: 'Baix Camp', at: [-15000, 9000], sch: [H(['sat'], '10:00', '14:00')], tags: ['antiques', 'secondhand'], stalls: 25, d: 'Old tools, books and furniture, once a week.' },
    ],
    events: [
      { id: 'festa-major', type: 'festa', name: 'Festa Major de la Vila (sample)', at: [10, 20], from: 4, days: 3, time: '18:00', st: 'confirmed', d: 'The village festival: a procession, music and a long dinner.' },
      { id: 'fira-avellana', type: 'food', name: 'Fira de l\'Avellana (sample)', at: [60, -90], from: 11, days: 2, time: '10:00', until: '19:00', st: 'confirmed', d: 'A fair of local products, with tastings and workshops.' },
      { id: 'caminada-popular', type: 'sports', name: 'Caminada Popular Exemple (sample)', at: [-150, 220], from: 19, days: 1, time: '08:30', st: 'expected', d: 'A group walk through the forest, for everyone. Bring water.' },
      { id: 'nit-contes', type: 'tradition', name: 'Nit de Contes Prova (sample)', at: [90, 70], from: 35, days: 1, time: '20:00', until: '22:00', st: 'expected', d: 'An evening of old stories by the fire, on the square.' },
      { id: 'concert-ermita', type: 'music', name: 'Concert a l\'Ermita (sample)', at: [-2400, 1100], from: 57, days: 1, time: '12:00', until: '13:30', st: 'expected', d: 'A small concert in the chapel on the mountain.' },
    ],
  },
];

// ---------- what the generator reads ----------
// answers (host.json), geocode (src/geocode.json, in the shape worker/host-places.mjs makes it: one entry per place, keyed by the
// host's words), research (the files of the research folder), all for a house and the day the fixture is made (base).
export function dataOf(h, base) {
  const here = { lat: h.lat, lng: h.lng };
  const geo = {}, spot = (r, list) => {
    const p = pt(here, ...r.at), e = { name: r.p, ...p, km: km(here, p), town: h.town, kind: r.kind };
    if (r.sch) e.schedule = r.sch; if (r.always) e.always = true; if (r.price) e.price = r.price; if (r.book) e.book = true;
    geo[r.p] = e; return { p: r.p, c: r.c };
  };
  const answers = {
    ...COMMON, ...h.answers, guideName: h.name, placeName: h.name, town: h.town, world: h.world,
    howTos: COMMON.howTos, lat: h.lat, lng: h.lng,
    favEat: h.eat.map(r => spot(r)), favNight: h.night.map(r => spot(r)), favDo: h.todoOwn.map(r => spot(r)),
    // the researched things to do, kept by the host in the swipe deck (the generator keeps only what the host chose)
    swipes: Object.fromEntries(h.todo.map(t => ['r:' + t.name, { id: 'r:' + t.name, name: t.name, cat: 'todo', d: 'yes' }])),
  };
  const markets = {
    _doc: 'Made-up markets of a sample house (names end with "(sample)"). Weekly schedules on different days, the nearest first.',
    categories: ['covered', 'street', 'flea', 'antiques', 'events'],
    markets: h.markets.map(m => { const p = pt(here, ...m.at); return { id: m.id, category: m.cat, name: { en: m.name }, comarca: m.comarca, town: h.town, km_from_house: km(here, p), ...p, stalls_approx: m.stalls, schedule: m.sch, tags: m.tags, flags: m.flags || [], description: { en: m.d } }; })
      .sort((a, b) => a.km_from_house - b.km_from_house),
  };
  const todo = {
    _doc: 'Made-up things to do of a sample house (names end with "(sample)").',
    items: h.todo.map(t => { const p = pt(here, ...t.at), K = KINDS.todo[t.kind];
      return { id: t.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40), name: { en: t.name }, type: K.name, town: h.town, ...p, km_from_house: km(here, p),
        description: { en: t.d }, tags: t.kids ? ['kidsfun'] : [], flags: t.book ? ['book'] : [], icon: t.kind, group: K.group, tone: GROUPS[K.group],
        ...(t.sch ? { schedule: t.sch } : {}), ...(t.always ? { always: true } : {}), ...(t.season ? { season: { from: t.season[0], to: t.season[1] } } : {}) }; }),
  };
  const events = {
    _doc: 'Made-up events of a sample house: dates from 3 to 60 days after the day the fixture was made (names end with "(sample)").',
    items: h.events.map(e => { const p = pt(here, ...e.at);
      return { id: e.id, type: e.type, name: { en: e.name }, town: h.town, venue: 'Plaça (sample)', ...p,
        dates: [{ start: iso(base, e.from), end: iso(base, e.from + e.days - 1), time: e.time, ...(e.until ? { until: e.until } : {}), status: e.st }], description: { en: e.d } }; }),
  };
  return { answers, geocode: geo, research: { 'markets.json': markets, 'todo.json': todo, 'events.json': events, 'emergency.json': emergency() } };
}
