// The maker's rule for "do the words typed to find a place name it?" (onboarding-site/src/placename.js, used by the builder's
// rows and the editor's "Find it on Google"). What comes back is always the host's own words or a part of them, never the
// suggestion's. Cases from the live test of 11 Nov 2026. Nothing is asked of anyone.   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeNameFrom } from '../../onboarding-site/src/placename.js';

const S = (name, where) => ({ id: 'G', name, where, km: 3 });

test('name plus town: the town goes, the name stays as typed', () => {
  assert.equal(placeNameFrom('La Locanda dei Sapori El Vendrell', S('Restaurant La Locanda dei Sapori', 'Carrer de Mar, El Vendrell, Spain')), 'La Locanda dei Sapori');
  assert.equal(placeNameFrom('Quijote Beach Creixell', S('Quijote Beach Bar', 'Passeig Marítim, Creixell, Spain')), 'Quijote Beach');
  assert.equal(placeNameFrom('Llépol Vila-rodona', S('Llépol', 'Carrer Major, Vila-rodona, Spain')), 'Llépol');
});

test('name plus street: the street goes', () => {
  assert.equal(placeNameFrom('Locanda Carrer de Mar', S('Restaurant La Locanda dei Sapori', 'Carrer de Mar, 12, El Vendrell, Spain')), 'Locanda');
});

test('other capitals and accents: the host\'s own spelling is kept', () => {
  assert.equal(placeNameFrom('Codorniu Sant Sadurni', S('Codorníu', 'Avinguda Jaume Codorníu, Sant Sadurní d\'Anoia, Spain')), 'Codorniu');
  assert.equal(placeNameFrom('la locanda dei sapori el vendrell', S('Restaurant La Locanda dei Sapori', 'El Vendrell, Spain')), 'la locanda dei sapori');
  assert.equal(placeNameFrom('llul de llebre', S('Restaurant Ull de Llebre', 'Carrer Major, Sant Martí Sarroca, Spain')), 'llul de llebre');   // misspelt: kept, our directory spells it later
});

test('a generic word the suggestion adds is not added', () => {
  assert.equal(placeNameFrom('Locanda dei Sapori', S('Restaurant La Locanda dei Sapori', 'El Vendrell, Spain')), 'Locanda dei Sapori');
  assert.equal(placeNameFrom('Del Mar Calafell', S('Cafè del Mar', 'Passeig Marítim, Calafell, Spain')), 'Del Mar');
  assert.equal(placeNameFrom('Restaurant la Societat', S('Restaurant la Societat', 'La Múnia, Spain')), 'Restaurant la Societat');
});

test('a search phrase or a few letters do not name the place', () => {
  assert.equal(placeNameFrom('restaurant La Bisbal del Penedès', S('Restaurant la Societat', 'Carrer Major, La Múnia, Spain')), '');
  assert.equal(placeNameFrom('loc', S('Restaurant La Locanda dei Sapori', 'El Vendrell, Spain')), '');
  assert.equal(placeNameFrom('restaurant vendrell', S('Restaurant El Vendrell Mar Blau', 'Passeig Marítim, El Vendrell, Spain')), '');   // the town only, not the whole name
  assert.equal(placeNameFrom('', S('Bar Pepe', 'Calafell, Spain')), '');
});

test('a town that is part of the real name stays', () => {
  assert.equal(placeNameFrom('Bar El Vendrell', S('Bar El Vendrell', 'Rambla, El Vendrell, Spain')), 'Bar El Vendrell');
  assert.equal(placeNameFrom('bar el vendrell', S('Bar El Vendrell', 'El Vendrell, Spain')), 'bar el vendrell');
});
