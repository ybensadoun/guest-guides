// What the listing read asks Claude for (onboarding-site/netlify/functions/listing.mjs, prompt): the interests and the
// guests are ticked only from the listing's own words, never from what is known of the region nor from the house's own
// amenities (acceptance test, fault 7: a house 10 km from the sea got Wellness for its hot tub and no Beaches). Only the
// text of the question is read here: nothing is sent anywhere.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prompt, pageWords, readerIsListing, readerAsks, hasTimes, timesOf } from '../../onboarding-site/netlify/functions/listing.mjs';

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

// The host's own words in the page's data (pageWords) and a reader answer that is not the listing (readerIsListing):
// 12 Nov 2026, a real read came back with no description, no town and no interests, because the page reader had landed
// on an advertising tracker and the description was never read from the page itself. A made-up page, in Airbnb's shape.
const PAGE = '<html><script>{"descriptions":{"__typename":"X","longDescriptionHtml":{"__typename":"UGCText","localizedStringWithTranslationPreference":'
  + '"A quiet house near the beaches of Vilaprova.\\u003cbr />Vineyards all around, \\"Cal Prova\\" is 5 minutes away.\\u003cbr />\\u003cbr />\\u003cb>The space\\u003c/b>\\u003cbr />Three bedrooms.\\u003cbr />\\u003cbr />\\u003cb>Registration Details\\u003c/b>\\u003cbr />HUTT-000000"}},'
  + '"location":{"__typename":"StaysPdpLocation","subtitle":"Can Prova, Catalunya, Spain","locationName":"Vilaprova del Pened\\u00e8s","locationSummary":null},'
  + '"items":[{"__typename":"StaysPdpDetailItem","type":"HOUSE_RULES_ADDITIONAL_RULES","title":"During the stay","description":{"__typename":"PdpUGCText","content":{"__typename":"UGCText","localizedStringWithTranslationPreference":"No smoking indoors.\\r\\n\\r\\nChildren by the pool only with an adult."}}}]}</script></html>';

test('listing page: the description, the host\'s added rules and the town are read from the page\'s own data', () => {
  const w = pageWords(PAGE);
  assert.equal(w.about, 'A quiet house near the beaches of Vilaprova.\nVineyards all around, "Cal Prova" is 5 minutes away.\nThe space:\nThree bedrooms.');
  assert.doesNotMatch(w.about, /HUTT|Registration/, 'the registration numbers are left out');
  assert.equal(w.extra, 'No smoking indoors.\nChildren by the pool only with an adult.');
  assert.deepEqual(w.place, { name: 'Vilaprova del Penedès', area: 'Can Prova, Catalunya, Spain' });
  assert.doesNotMatch(w.about + w.extra, /\n\n/, 'no blank line: the facts stay one block');
});

test('listing page: a page without them gives nothing, never an error', () => {
  assert.deepEqual(pageWords('<html><body>Nothing here</body></html>'), { about: '', extra: '', place: null });
  assert.deepEqual(pageWords(''), { about: '', extra: '', place: null });
  const noName = pageWords('{"location":{"__typename":"StaysPdpLocation","subtitle":"Somewhere, Spain","locationName":null}}');
  assert.deepEqual(noName.place, { name: '', area: 'Somewhere, Spain' });
});

test('page reader: an answer that is another page than the listing is refused', () => {
  const url = 'https://www.airbnb.com/rooms/1';
  assert.equal(readerIsListing('Title: https://ads.example/track\nURL Source: ' + url + '\nFinal URL: https://ads.example/track?x=1\n\nMarkdown Content:\nA 1x1 image', url), false, 'landed on a tracker');
  assert.equal(readerIsListing('Title: https://ads.example/track\nURL Source: ' + url + '\n\nMarkdown Content:\nA 1x1 image', url), false, 'an address as a title');
  assert.equal(readerIsListing('Title: Casa Prova - Houses for Rent - Airbnb\nURL Source: ' + url + '\n\nMarkdown Content:\nA quiet house', url), true);
  assert.equal(readerIsListing('Title: Casa Prova\nURL Source: ' + url + '\nFinal URL: https://www.airbnb.es/rooms/1?source=x\n\nMarkdown Content:\nUna casa', url), true, 'the same site in another country');
});

test('reader: an Airbnb room is asked on the British site, alone and afresh; other links twice as before', () => {
  assert.deepEqual(readerAsks('https://www.airbnb.com/rooms/123456?source=x'), [['https://www.airbnb.co.uk/rooms/123456', true]]);
  assert.deepEqual(readerAsks('https://es.airbnb.com/rooms/plus/987'), [['https://www.airbnb.co.uk/rooms/plus/987', true]]);
  assert.deepEqual(readerAsks('https://www.airbnb.es/rooms/55'), [['https://www.airbnb.co.uk/rooms/55', true]]);
  assert.deepEqual(readerAsks('https://www.airbnb.co.uk/rooms/55'), [['https://www.airbnb.co.uk/rooms/55', true]]);
  const slink = 'https://www.airbnb.com/slink/AbC12'; assert.deepEqual(readerAsks(slink), [[slink, false], [slink, true]]);   // no room number in it: as before
  const b = 'https://www.booking.com/hotel/es/casa-prova.html'; assert.deepEqual(readerAsks(b), [[b, false], [b, true]]);
  // The British read of a .com link is still that listing (the same site, another country); Airbnb's own first page is not.
  assert.equal(readerIsListing('Title: Home in Vilaprova\nFinal URL: https://www.airbnb.co.uk/rooms/55?source_impression_id=p3\n', 'https://www.airbnb.com/rooms/55'), true);
  assert.equal(readerIsListing('Title: Airbnb: Holiday Rentals, Cabins, Beach Houses, Unique Homes & Experiences\nURL Source: https://www.airbnb.co.uk/rooms/55\n', 'https://www.airbnb.co.uk/rooms/55'), false);
  assert.equal(readerIsListing('Title: Airbnb home with a pool in Vilaprova\n', 'https://www.airbnb.co.uk/rooms/55'), true);   // a listing whose own title starts with the word
});

test('reader: the times are seen as Airbnb writes them on its sites', () => {
  for (const s of ['Check in after 15:00', 'Check out before 12:00, self check-in with smart lock', 'Check-in after 3:00 PM', 'Checkout before 11 am',
    'Llegada a partir de las 15:00', 'Salida antes de las 12:00', 'Arrivée à partir de 15:00', 'Départ avant 12:00']) assert.equal(hasTimes(s), true, s);
  for (const s of ['Self check-in', 'Lock up at checkout', 'Quiet hours 10:00 PM - 8:00 AM', '']) assert.equal(hasTimes(s), false, s);
});

test('reader: the times are copied as the page words them, never from a rating or a date', () => {
  assert.deepEqual(timesOf('Things to know\nCheck in after 15:00\nCheck out before 12:00, self check-in with smart lock\nHouse rules'), { in: '15:00', out: '12:00' });
  assert.deepEqual(timesOf('Check-in after 3:00 PM\nCheckout before 11:00 AM'), { in: '15:00', out: '11:00' });
  assert.deepEqual(timesOf('Check-in: 3:00 PM - 8:00 PM\nCheckout before 11 am'), { in: '15:00', out: '11:00' });
  assert.deepEqual(timesOf('Llegada a partir de las 15:00\nSalida antes de las 12:00, llegada autónoma con cerradura inteligente'), { in: '15:00', out: '12:00' });
  assert.deepEqual(timesOf('Arrivée à partir de 15:00\nDépart avant 12:00, arrivée autonome'), { in: '15:00', out: '12:00' });
  assert.deepEqual(timesOf('Check-in From 15:00 to 20:00\nCheck-out Until 11:00'), { in: '15:00', out: '11:00' });
  // Not times: a rating beside the word, a date, a count, a self check-in line, an hour with nothing that says morning or evening.
  assert.deepEqual(timesOf('Check-in\n4.9\nCheck-in 4.91 out of 5\nSelf check-in with smart lock\nAdd your check-in date 12/01\nLock up at checkout\nCheck in after 3 nights'), { in: '', out: '' });
  assert.deepEqual(timesOf('Check in after 15:00'), { in: '15:00', out: '' });
  assert.deepEqual(timesOf('Check in after 3 pm and before 9 p.m.\nCheck out before 12:00 and lock up'), { in: '15:00', out: '12:00' });
  assert.deepEqual(timesOf('Check-in after 12:00 AM\nCheckout before 12:30 am'), { in: '00:00', out: '00:30' });
  assert.deepEqual(timesOf(''), { in: '', out: '' });
});
