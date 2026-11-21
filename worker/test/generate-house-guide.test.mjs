// The generator (engine/scripts/generate-site.py) writes the house guide's parts (content/message.json;
// engine/src/modules/info/README.md, rules 11 to 13): the line under a part's title and "Also in ..." are said in our own
// names for things, in every language of the guide, never in the listing's raw words; what is outdoors goes outside; and
// which of the parts guests then see is the guide's own rule (partShown). Made-up answers; the site folder is removed after.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { partShown } from '../../engine/src/modules/info/plan.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let n = 0;
function generate(answers) {
  const src = mkdtempSync(join(tmpdir(), 'gen-hg-')), slug = `zz-test-houseguide-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  try {
    mkdirSync(join(src, 'uploads'));
    writeFileSync(join(src, 'host.json'), JSON.stringify({ answers: { placeName: 'Test house', town: 'El Vendrell', languages: ['en', 'de', 'fr'], ...answers } }));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', src, '--slug', slug, '--lat', '41.2186', '--lng', '1.535'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
    const blocks = JSON.parse(readFileSync(join(site, 'content/message.json'), 'utf8')).blocks;
    return Object.assign(id => blocks.find(b => b.id === id), { blocks });
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
  assert.deepEqual(g.blocks.filter(partShown).map(b => b.id), ['living', 'kitchen', 'rules', 'checkout']);
  assert.deepEqual(g.blocks.filter(b => !partShown(b)).map(b => b.id), ['outside', 'laundry', 'office']);
  assert.deepEqual(g('checkout').items.map(i => i.en), ['Check-out by 11:00.']);
});
