// A build never fails because of what a host typed (Yohann, 22 Nov 2026): engine/scripts/host-text.mjs repairs the host's
// words in the language they are written in, and the content check with --host (the worker's) makes notes of what is left,
// while a broken guide still fails and the hand-made guides keep the strict check. Made-up answers; every site folder made
// here is removed after.
//   node --test engine/scripts/host-text.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { repairText, repairLangs, repairSite } from './host-text.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const EM = '\u2014', EN = '\u2013';

test('dashes: an em-dash between words becomes a comma, in every language; a range stays a range', () => {
  assert.equal(repairText(`No smoking ${EM} thank you`, 'en'), 'No smoking, thank you');
  assert.equal(repairText(`No fumar${EM}gràcies`, 'ca'), 'No fumar, gràcies');
  assert.equal(repairText(`Pool open ${EN} towels in the shed`, 'en'), 'Pool open, towels in the shed');
  assert.equal(repairText(`Quiet please. ${EM} Thanks`, 'en'), 'Quiet please. Thanks');
  assert.equal(repairText(`${EM} No parties\n${EM} No pets ${EM}`, 'en'), 'No parties\nNo pets');
  assert.equal(repairText(`Open 10${EM}12 and 16${EN}20`, 'en'), `Open 10${EN}12 and 16${EN}20`);
  assert.equal(repairText('Check-in from 16:00', 'en'), 'Check-in from 16:00');   // a hyphen is not a dash
});

test('Spanish: ¿ and ¡ open the sentence that ends in ? or !', () => {
  assert.equal(repairText('Tienes preguntas? Llámanos.', 'es'), '¿Tienes preguntas? Llámanos.');
  assert.equal(repairText('Bienvenidos! Qué tal el viaje?', 'es'), '¡Bienvenidos! ¿Qué tal el viaje?');
  assert.equal(repairText('¿Todo bien? Perfecto!', 'es'), '¿Todo bien? ¡Perfecto!');
  assert.equal(repairText('A 2.5 km hay una playa, la conoces?', 'es'), '¿A 2.5 km hay una playa, la conoces?');
  assert.equal(repairText('Bienvenidos!', 'ca'), 'Bienvenidos!');   // only Spanish
});

test('Catalan: l.l and l-l between letters become l·l', () => {
  assert.equal(repairText('Col.laboreu amb la recollida selectiva', 'ca'), 'Col·laboreu amb la recollida selectiva');
  assert.equal(repairText('La cel-la i les il.lusions', 'ca'), 'La cel·la i les il·lusions');
  assert.equal(repairText('COL.LECCIÓ', 'ca'), 'COL·LECCIÓ');
  assert.equal(repairText('Col.laboreu', 'es'), 'Col.laboreu');   // only Catalan
});

test('German: straight double quotes become „…“; Dutch: Ij becomes IJ', () => {
  assert.equal(repairText('Bitte "leise" sein', 'de'), 'Bitte „leise“ sein');
  assert.equal(repairText('Ijs in de vriezer', 'nl'), 'IJs in de vriezer');
  assert.equal(repairText('Say "hello"', 'en'), 'Say "hello"');
});

test('never touched: web addresses, emails, phone numbers, code-like strings', () => {
  const keep = ['https://example.org/a?b=1&c=2', 'www.example.cat/col.lecció', 'host@example.org', '+34 600-123-456', '938.94.13.29', 'Wifi_Casa-5G', 'pass=word#1', 'menu.pdf'];
  for (const k of keep) for (const l of ['es', 'ca', 'de', 'en']) assert.equal(repairText(k, l), k, `${k} in ${l}`);
  assert.equal(repairText(`Mira https://example.org/x?y=1 ${EM} gracias!`, 'es'), '¡Mira https://example.org/x?y=1, gracias!');
  assert.equal(repairText('Escríbenos a host@example.org, vale?', 'es'), '¿Escríbenos a host@example.org, vale?');
});

test('a copy of the host\'s text in another language (not translated yet) is repaired as the host\'s language', () => {
  const o = { ca: 'Teniu preguntes? Col.laboreu!', es: 'Teniu preguntes? Col.laboreu!', de: 'Teniu preguntes? Col.laboreu!' };
  const r = repairLangs(o, 'ca');
  assert.equal(r.ca, 'Teniu preguntes? Col·laboreu!');
  assert.equal(r.es, r.ca); assert.equal(r.de, r.ca);   // still the same copy, no ¿ put into Catalan
  assert.equal(repairLangs({ ca: 'Hola', es: 'Tienes preguntas?' }, 'ca').es, '¿Tienes preguntas?');   // a real translation: its own rules
});

// ---------- a whole guide, as the worker builds it ----------
let n = 0;
const sites = [];
function generate(answers, src) {
  const dir = mkdtempSync(join(tmpdir(), 'gen-host-')), slug = `zz-test-hosttext-${process.pid}-${++n}`, site = resolve(ROOT, 'sites', slug);
  sites.push(site);
  try {
    mkdirSync(join(dir, 'uploads'));
    writeFileSync(join(dir, 'host.json'), JSON.stringify({ answers: { placeName: 'Casa de prova', town: 'El Vendrell', ...answers } }));
    const r = spawnSync('python3', ['engine/scripts/generate-site.py', dir, '--slug', slug, '--lat', '41.2186', '--lng', '1.535', '--src', src], { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, STOPS_DIR: dir } });
    assert.equal(r.status, 0, (r.stderr || '').slice(-600));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return { slug, site };
}
const check = (slug, host) => spawnSync('node', ['engine/scripts/run.js', 'check', slug, ...(host ? ['--host'] : [])], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
const texts = site => readdirSync(join(site, 'content')).map(f => readFileSync(join(site, 'content', f), 'utf8')).join('\n') + readdirSync(join(site, 'i18n')).map(f => readFileSync(join(site, 'i18n', f), 'utf8')).join('\n');
process.on('exit', () => { for (const s of sites) rmSync(s, { recursive: true, force: true }); });

test('a Catalan and Spanish guide with no English, an em-dash, l.l and ? without ¿: it used to fail, now it builds', () => {
  const { slug, site } = generate({ languages: ['ca', 'es'], sourceLang: 'ca', tagline: `Benvinguts! ${EM} Sentiu-vos com a casa`,
    houseRules: `No es pot fumar a dins ${EM} gràcies.\nCol.laboreu amb el reciclatge!\nTeniu preguntes? Truqueu al 112 si cal.`,
    checkoutTasks: 'Deixeu la clau a la cel-la de l\'entrada.' }, 'ca');
  const strict = check(slug, false);
  assert.equal(strict.status, 1, 'the strict check should have failed on the host text');
  assert.match(strict.stderr, /em-dash|without ¿|punt volat/);
  const fixed = repairSite(site, 'ca');
  assert.ok(fixed.length, 'nothing repaired');
  const all = texts(site);
  assert.ok(!all.includes(EM), 'an em-dash is left');
  assert.ok(/Col·laboreu/.test(all) && /cel·la/.test(all) && !/Col\.laboreu|cel-la/.test(all));
  assert.ok(!/¿Teniu/.test(all), 'a Catalan sentence got a ¿');
  const host = check(slug, true);
  assert.equal(host.status, 0, host.stderr);
  assert.match(host.stdout, /Content check OK/);
});

test('a Spanish guide: ¿ and ¡ added to the host\'s own sentences, the tagline repaired too', () => {
  const { slug, site } = generate({ languages: ['es', 'ca', 'en'], sourceLang: 'es', tagline: `Bienvenidos! ${EM} es vuestra casa`,
    houseRules: 'Tienes dudas? Escríbenos a host@example.org.\nNada de fiestas!' }, 'es');
  assert.equal(check(slug, false).status, 1);
  repairSite(site, 'es');
  const all = texts(site), es = JSON.parse(readFileSync(join(site, 'i18n/es.json'), 'utf8'));
  assert.ok(/¿Tienes dudas\? Escríbenos a host@example\.org\./.test(all) && /¡Nada de fiestas!/.test(all), 'Spanish not repaired');
  assert.equal(es.welcome, '¡Bienvenidos! es vuestra casa');   // after its own ! the dash needs no comma
  const host = check(slug, true);
  assert.equal(host.status, 0, host.stderr);
});

test('a German guide: straight quotes in a house rule become „…“', () => {
  const { slug, site } = generate({ languages: ['de', 'nl'], sourceLang: 'de', houseRules: 'Bitte ab 22 Uhr "leise" sein.' }, 'de');
  assert.equal(check(slug, false).status, 1);
  repairSite(site, 'de');
  assert.ok(texts(site).includes('Bitte ab 22 Uhr „leise“ sein.'));
  assert.equal(check(slug, true).status, 0);
});

test('what cannot be repaired is a note with --host, never an error', () => {
  const { slug } = generate({ languages: ['es', 'en'], sourceLang: 'es', houseRules: 'Preguntas? (ver https://example.org/faq?x=1)' }, 'es');
  const host = check(slug, true);   // not repaired on purpose: the check alone
  assert.equal(host.status, 0, host.stderr);
  assert.match(host.stderr, /Content notes for .*not stopping the build/);
});

test('a truly broken guide still fails with --host', () => {
  const { slug, site } = generate({ languages: ['ca', 'es'], sourceLang: 'ca' }, 'ca');
  assert.equal(check(slug, true).status, 0);
  const sf = join(site, 'content/sections.json'), S = JSON.parse(readFileSync(sf, 'utf8'));
  S.sections[0].labelKey = 'nope';
  writeFileSync(sf, JSON.stringify(S));
  const bad = check(slug, true);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /label key "nope" missing in i18n/);
  rmSync(join(site, 'content/house.json'));
  assert.match(check(slug, true).stderr, /content\/house\.json is missing/);
});

test('the hand-made guide keeps the strict check (no --host from npm run check)', () => {
  const r = check('ca-la-kimberly', false);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!/Content notes/.test(r.stderr));
  assert.ok(existsSync(resolve(ROOT, 'sites/ca-la-kimberly/content/sections.json')));
});
