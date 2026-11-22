// The generator (engine/scripts/generate-site.py) writes the house guide's parts (content/message.json;
// engine/src/modules/info/README.md, rules 11 to 17): the line under a part's title and "Also in ..." are said in our own
// names for things, in every language of the guide, never in the listing's raw words; what is outdoors goes outside; and
// which of the parts guests then see is the guide's own rule (partShown). Made-up answers; the site folder is removed after.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { partShown, stayTimes } from '../../engine/src/modules/info/plan.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let n = 0;
function generate(answers, uploads = []) {
  const src = mkdtempSync(join(tmpdir(), 'gen-hg-')), slug = `zz-test-houseguide-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    uploads.forEach((u, i) => writeFileSync(join(src, 'uploads', `u${i}.json`), JSON.stringify(u)));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'El Vendrell', languages: ['en', 'de', 'fr'], ...answers } }));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2186', '--lng', '1.535'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const blocks = JSON.parse(readFileSync(join(site, 'content/message.json'), 'utf8')).blocks, house = JSON.parse(readFileSync(join(site, 'content/house.json'), 'utf8'));
    return Object.assign(id => blocks.find(b => b.id === id), { blocks, house, files: existsSync(join(site, 'public/guide')) ? readdirSync(join(site, 'public/guide')).sort() : [] });
  } finally { rmSync(site, { recursive: true, force: true }); rmSync(src, { recursive: true, force: true }); }
}
const LISTING = ['Free washer – In unit', 'Free dryer – In unit', 'Private outdoor pool - available all year, open 24 hours', 'Dedicated workspace', 'Outdoor shower',
  'Kitchen', 'Refrigerator', 'Microwave', 'Dishwasher', 'Coffee maker', 'Wifi', 'Free parking on premises', 'Garden view', 'A thing our list does not know'];

test('the line under a title is in our own names, in every language, with no dash and none of the listing\'s details', () => {
  const g = generate({ listingAmenities: LISTING });
  assert.deepEqual(g('laundry').sub, { en: 'Washing machine, tumble dryer', de: 'Waschmaschine, Wäschetrockner', fr: 'Lave-linge, sèche-linge' });
  assert.deepEqual(g('office').sub, { en: 'Dedicated workspace', de: g('office').sub.de, fr: g('office').sub.fr });
  for (const b of g.blocks) for (const s of Object.values(b.sub || {})) assert.ok(!/[–—]| - |In unit|\(|Free /.test(s), s);
});

test('more than three things: the first three under the title, all of them in "Also in ...", French with its space before the colon', () => {
  const k = generate({ listingAmenities: LISTING })('kitchen');
  assert.equal(k.sub.en, 'Fridge, microwave, dishwasher');   // in the listing's order
  assert.equal(k.body.en, 'Also in the kitchen: fridge, microwave, dishwasher, coffee maker.');
  assert.match(k.body.de, /^Außerdem in der Küche: Kühlschrank, /);
  assert.match(k.body.fr, /^Dans la cuisine, il y a aussi : réfrigérateur, /);
});

test('left out: the room\'s own name, Wi-Fi, parking, a view, a thing our list does not know; what is outdoors goes outside', () => {
  const g = generate({ listingAmenities: LISTING });
  assert.equal(g('pool'), undefined);                       // "Pool" under the title Pool says nothing
  assert.equal(g('outside').sub.en, 'Outdoor shower');      // not under Bathrooms, and no "Garden view"
  assert.equal(g('bathrooms'), undefined);
  const all = JSON.stringify(g.blocks);
  for (const w of ['Wifi', 'parking', 'view', 'does not know', 'premises']) assert.ok(!all.includes(w), w);
});

test('which parts guests see: one with a line of the host\'s or an "Also in ..." line, not one with only the line under its title', () => {
  const g = generate({ listingAmenities: LISTING, rooms: [{ n: 'Living room', c: 'Living room', t: 'The remote is in the drawer under the TV.' }], houseRules: 'No smoking inside', checkOut: '11:00' });
  assert.deepEqual(g.blocks.filter(b => partShown(b, g.house)).map(b => b.id), ['living', 'kitchen', 'rules', 'checkout']);
  assert.deepEqual(g.blocks.filter(b => !partShown(b, g.house)).map(b => b.id), ['outside', 'laundry', 'office']);
});

// Rule 14: the times of the stay live once, in house.json; the Check-out part holds no sentence that repeats them.
test('the check-in and check-out times are written once, in the house\'s facts; the part holds only what to do before leaving', () => {
  const g = generate({ checkIn: '15:00', checkOut: '11:00', checkoutTasks: 'Take out the rubbish\nLeave the keys in the lockbox' });
  assert.equal(g.house.checkin, '15:00'); assert.equal(g.house.checkout, '11:00');
  assert.deepEqual(g('checkout').items.map(i => i.en), ['Take out the rubbish', 'Leave the keys in the lockbox']);
  assert.ok(!/\d\d:\d\d/.test(JSON.stringify(g.blocks)), 'no time in the house guide\'s file');
  assert.deepEqual(stayTimes(g('checkout'), g.house), [['checkin', '15:00'], ['checkout', '11:00']]);
});

test('a time and no task: the part exists, with no line of its own, and guests see it; no time and no task: no part', () => {
  const g = generate({ checkOut: '10:30' });
  assert.deepEqual(Object.keys(g('checkout')), ['id', 'icon', 'tone', 'title']); assert.equal(g.house.checkin, undefined);
  assert.equal(partShown(g('checkout'), g.house), true);
  assert.equal(generate({})('checkout'), undefined);
});

// Rule 15: the host's photos that help find the place reach "Getting here"; a kind the generator does not know is left out.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
test('arrival photos: saved with the guide and shown in Getting here, before its lines; with no words the part waits for a line', () => {
  const ups = [{ kind: 'arrivalPhoto', dataUrl: PNG }, { kind: 'arrivalPhoto', dataUrl: PNG }, { kind: 'manual', dataUrl: PNG }];
  const g = generate({ arrival: 'Park inside the gate.' }, ups);
  assert.deepEqual(g('arrival').photos, ['guide/arrival-1.jpg', 'guide/arrival-2.jpg']); assert.deepEqual(g.files, ['arrival-1.jpg', 'arrival-2.jpg']);
  assert.deepEqual(Object.keys(g('arrival')), ['id', 'icon', 'tone', 'title', 'photos', 'items']);
  const alone = generate({}, ups.slice(0, 1));
  assert.deepEqual(alone('arrival').photos, ['guide/arrival-1.jpg']); assert.equal(alone('arrival').items, undefined); assert.equal(partShown(alone('arrival'), alone.house), false);
  assert.deepEqual(Object.keys(generate({ arrival: 'Park inside the gate.' })('arrival')), ['id', 'icon', 'tone', 'title', 'items']);   // no photo: the part as before
});

// Rule 17: a tip that starts with a thing of the house, as the builder offers them, goes to that thing's room in any
// language; a start nobody finished is left out; a tip with no such start is filed by its own words, as before.
test('How things work: "Chauffage : ..." goes to the living room, "Lavadora: ..." to the laundry, an unfinished "Heating:" nowhere', () => {
  const g = generate({ howTos: ['Chauffage : le thermostat est près de la porte', 'Lavadora: el detergente está en el armario de la cocina', 'Heating:', 'Piscine:  ',
    'Outdoor shower: the tap is behind the hedge', 'Air conditioning: the remote is in the bedside drawer', 'Spare batteries are in the TV unit', 'Note: the oven is slow'].join('\n') });
  const where = Object.fromEntries(g.blocks.flatMap(b => (b.items || []).map(i => [i.en, b.id])));
  assert.equal(where['Chauffage : le thermostat est près de la porte'], 'living');
  assert.equal(where['Lavadora: el detergente está en el armario de la cocina'], 'laundry');   // not the kitchen, though the line says "cocina"
  assert.equal(where['Outdoor shower: the tap is behind the hedge'], 'outside');
  assert.equal(where['Air conditioning: the remote is in the bedside drawer'], 'bedrooms');     // no room of its own: by its words ("bed")
  assert.equal(where['Spare batteries are in the TV unit'], 'living');
  assert.equal(where['Note: the oven is slow'], 'kitchen');
  assert.ok(!JSON.stringify(g.blocks).includes('Heating:"') && !JSON.stringify(g.blocks).includes('Piscine'), 'the unfinished starts are left out');
});
