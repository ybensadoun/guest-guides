// The Getting around module's rules (engine/src/modules/transport/plan.js, README.md beside it): the ways of getting about,
// which stations are listed and pinned, the page's and the card's icon, the card on Home, an old taxi card read as the
// page. Written from the guide's behaviour on 14 Nov 2026 (views/place.js and content.js before the module). Pure.
//   node --test engine/scripts/transport-plan.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODES, modeOf, stopsOf, groupsOf, pageIcon, iconOf, cardOf, transportOf, loneRow } from '../src/modules/transport/plan.js';

test('modeOf: train when none, bus, an unknown mode drawn as a train', () => {
  assert.equal(modeOf({}), MODES[0]);
  assert.deepEqual(modeOf({ mode: 'bus' }), ['bus', 'byBus', 'var(--tone-green)', 'green']);
  assert.equal(modeOf({ mode: 'ferry' })[0], 'train');
});

test('stopsOf: a station never placed (0,0 or no position) is left out, one whose position ran out stays', () => {
  const S = [{ id: 'a', lat: 41, lng: 1 }, { id: 'b', lat: 0, lng: 0 }, { id: 'c' }, { id: 'd', nomap: true }, { id: 'e', lat: 0, lng: 2 }];
  assert.deepEqual(stopsOf(S).map(s => s.id), ['a', 'd', 'e']);
  assert.deepEqual(stopsOf(undefined), []);
});

test('groupsOf: trains, then buses, each only with stations', () => {
  const S = [{ id: 'b1', mode: 'bus' }, { id: 't1' }, { id: 't2', mode: 'train' }];
  assert.deepEqual(groupsOf(S).map(([w, l]) => [w, l.map(s => s.id)]), [['byTrain', ['t1', 't2']], ['byBus', ['b1']]]);
  assert.deepEqual(groupsOf([{ id: 'b', mode: 'bus' }]).map(g => g[0]), ['byBus']);
});

test('pageIcon: the card\'s, else the taxi (taxis, or no station), else the first station\'s kind', () => {
  assert.equal(pageIcon({ tileIcon: 'bus', taxis: [{}] }, []), 'bus');
  assert.equal(pageIcon({ taxis: [{}] }, [{ mode: 'bus' }]), 'taxi');
  assert.equal(pageIcon({}, []), 'taxi');
  assert.equal(pageIcon({ taxis: [] }, [{ mode: 'bus' }]), 'bus');
});

test('iconOf and cardOf: the card on Home, only with a file and a "tile"', () => {
  assert.equal(iconOf({ taxis: [{}] }), 'taxi');
  assert.equal(iconOf({ stations: [{ mode: 'bus' }] }), 'bus');
  assert.equal(iconOf({ stations: [{}] }), 'train');
  assert.equal(iconOf({}), 'train');
  assert.equal(cardOf(undefined), null);
  assert.equal(cardOf({ id: 'transport' }), null);
  assert.equal(cardOf({ id: 'transport', data: { taxis: [] } }), null);
  const tile = { name: { en: 'Taxi & train' }, sub: { en: 'Call' }, wide: false };
  assert.deepEqual(cardOf({ id: 'getting', data: { taxis: [{}], tile } }), { id: 'getting', href: '#s/getting', icon: 'taxi', name: tile.name, sub: tile.sub, wide: false });
});

test('cardOf: Ca La Kimberly\'s Getting around has its card', () => {
  const data = JSON.parse(readFileSync(new URL('../../sites/ca-la-kimberly/content/transport.json', import.meta.url), 'utf8'));
  const c = cardOf({ id: 'transport', data });
  assert.equal(c.href, '#s/transport');
  assert.equal(c.icon, 'taxi');
});

test('transportOf: an old taxi card with "trains" as a Getting around page', () => {
  const p = { id: 'taxi', name: { en: 'Taxi' }, kind: { en: 'Taxi and trains' }, phone: '600 000 000', what: { en: 'w' }, alt: [], always: true, trains: [{ id: 's' }] };
  assert.deepEqual(transportOf(p), { id: 'taxi', title: p.name, lead: p.kind, taxis: [{ name: p.name, sub: undefined, phone: '600 000 000', what: p.what, alt: [], always: true }], stations: [{ id: 's' }] });
  assert.deepEqual(transportOf({ id: 'x', name: 'N', title: 'T', taxiName: 'Cab', taxiSub: 'S' }).taxis[0].name, 'Cab');
  assert.deepEqual(transportOf({ id: 'x' }).stations, []);
});

test('loneRow: a page with a single row shows it open (15 Nov 2026)', () => {
  const st = { id: 's', lat: 41.2, lng: 1.5 };
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, []), true);            // the pool house: one taxi
  assert.equal(loneRow({ taxis: [] }, [st]), true);                           // one station
  assert.equal(loneRow({}, [st]), true);
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, [st]), false);          // something to choose from: rows start closed
  assert.equal(loneRow({ taxis: [{ name: 'A' }, { name: 'B' }] }, []), false);
  assert.equal(loneRow({}, []), false);
  assert.equal(loneRow({ apps: [{ id: 'uber' }] }, []), true);              // a ride app alone is a single row (16 Nov 2026)
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }], apps: [{ id: 'uber' }] }, []), false);
  // A station never placed is not a row: one taxi beside it is still alone.
  assert.equal(loneRow({ taxis: [{ name: 'Taxi' }] }, stopsOf([{ id: 'new', lat: 0, lng: 0 }])), true);
});
