// What the listing read asks Claude for (onboarding-site/netlify/functions/listing.mjs, prompt): the interests and the
// guests are ticked only from the listing's own words, never from what is known of the region nor from the house's own
// amenities (acceptance test, fault 7: a house 10 km from the sea got Wellness for its hot tub and no Beaches). Only the
// text of the question is read here: nothing is sent anywhere.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prompt } from '../../onboarding-site/netlify/functions/listing.mjs';

const SRC = { url: 'https://www.airbnb.com/rooms/1', title: 'Casa Prova', description: 'A quiet house', counts: '3 bedrooms', pics: [{ caption: 'Pool' }], text: 'Made-up listing text.' };
const line = (p, k) => (p.split('\n').find(l => l.startsWith(` "${k}":`)) || '');

test('listing prompt: interests only from the listing\'s own words, never from the region or the house\'s amenities', () => {
  const p = prompt(SRC, 'Vilaprova', 'en'), l = line(p, 'interests');
  assert.ok(l.startsWith(' "interests": array chosen from ["Beaches","Wine and food","Hiking and nature","Culture and history","Local markets","Nightlife","Festivals","Sports","Shopping","Wellness"]: '), l);
  assert.match(l, /only what guests go out for in the area AND the listing's own words name/);
  assert.match(l, /a beach or the sea for Beaches/); assert.match(l, /a spa or thermal baths outside the house for Wellness/);
  assert.match(l, /Never from what you know of the region, and never from the house's own amenities: a pool, a hot tub or a sauna at the house is not Wellness, a kitchen is not Wine and food\./);
  assert.match(l, /An empty array when the listing names none of them,$/);
  assert.doesNotMatch(l, /that fit the area/);
});

test('listing prompt: guests only those the listing points to; the other lines as they were; no dashes', () => {
  for (const lang of ['en', 'es', 'ca', 'fr']) {
    const p = prompt(SRC, '', lang), g = line(p, 'guests');
    assert.ok(g.startsWith(' "guests": array chosen from ["Families with kids","Couples","Groups of friends","Remote workers","Older guests","Guests with pets","Wedding or event guests"]: only the guests the listing itself points to'), g);
    assert.match(g, /pets allowed for Guests with pets/); assert.match(g, /Never from what you know of the region\. An empty array when it says nothing about who stays,$/);
    assert.equal(line(p, 'navStyle'), ' "navStyle": one of ["Big tiles, like an app","A simple list","Photo-led, like a magazine"] that fits the listing\'s style,');
    assert.equal(line(p, 'feelWords'), ' "feelWords": array of up to 3 from ["Cosy","Elegant","Playful","Modern","Rustic","Calm","Local and authentic","Luxurious","Family friendly","Colourful"],');
    assert.match(p, /^Listing link: https:\/\/www\.airbnb\.com\/rooms\/1\nTown given by the host: (Vilaprova|not given)\n/);
    assert.doesNotMatch(p, /[—–]/);
  }
});
