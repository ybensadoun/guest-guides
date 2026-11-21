#!/usr/bin/env node
// The launch desk's gates in the maker's editor (docs/plan-launch-desk-gates.md): Getting around on a sample house, the
// same house said to be in Spain, in France, at a border (country not known), and in France once launched with its
// trains on. On the pretend database (pretend.mjs), at 1280 and 360 px.   node onboarding-site/modules/test/gates-check.mjs
// In Spain and at a border the step is what it is today; in France the parts tied to Spain are not offered and start
// no work, and what a host types (a station or a stop by its name or link, a taxi) stays.
import { chromium } from 'playwright';
import { join } from 'node:path';
import { ORIGIN, SB, SHOTS, world, open } from './pretend.mjs';

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };
const FR_ON = { countries: [{ country: 'FR', state: 'open' }], switches: [{ module: 'transport', part: 'trains', country: 'FR', is_on: true }] };
// [name, the house's country as the guide holds it (undefined: no field, read from the position), the owner's word, what to expect]
const CASES = [
  ['in Spain', 'ES', null, { trains: true, stops: true, apps: true }],
  ['at a border, country not known', '', null, { trains: true, stops: true, apps: true }],
  ['with no country field, read from its position (Barcelona)', undefined, null, { trains: true, stops: true, apps: true }],
  ['in France', 'FR', null, { trains: false, stops: false, apps: false }],
  ['in France, launched with its trains on', 'FR', FR_ON, { trains: true, stops: false, apps: false }]
];
const words = page => page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ').trim());

const browser = await chromium.launch();
try {
  for (const width of [1280, 360]) {
    let spain = null;
    for (const [name, cc, launch, want] of CASES) {
      const db = world({ empty: false }), g = db.guides[0], tag = `${width} px, a house ${name}`;
      g.content = JSON.parse(JSON.stringify(g.content));
      if (cc === undefined) delete g.content.files.house.country; else g.content.files.house.country = cc;
      delete g.content.files.transport.apps;
      const { ctx, page, errors } = await open(browser, db, { width, height: 900 });
      await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['porta-house-v1', JSON.stringify({ acct: g.owner, id: g.id })]);
      const asked = [];
      page.on('request', r => { const u = new URL(r.url()); if (u.pathname === '/stations-es.json') asked.push('stations'); if (u.pathname === '/countries.json') asked.push('countries'); if (u.pathname.includes('/transit/stops-es/')) asked.push('stops'); });
      await ctx.route(u => u.origin === SB && u.pathname === '/rest/v1/rpc/launch_public', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(launch || { countries: [], switches: [] }) }));
      await page.goto(ORIGIN + '/?step=transport&lang=en');
      await page.locator('h1, h2').filter({ hasText: 'Getting around' }).first().waitFor({ timeout: 20000 });
      await page.waitForTimeout(2500);
      const text = await words(page), jobs = db.calls.filter(c => c[0] === 'job').map(c => c[1] + (c[2] ? ' ' + c[2] : ''));
      const has = async sel => !!(await page.$(sel));
      ok((await has('#c_trq')) === want.trains, `${tag}: "Type a train station" ${want.trains ? 'is' : 'is not'} offered`);
      ok(asked.includes('stations') === want.trains, `${tag}: our stations file ${want.trains ? 'is' : 'is not'} fetched`);
      ok((await has('#c_spq')) === want.stops, `${tag}: "Type a stop or station" ${want.stops ? 'is' : 'is not'} offered`);
      ok(asked.includes('stops') === want.stops, `${tag}: our stops ${want.stops ? 'are' : 'are not'} fetched`);
      ok((await has('.cm-axapps')) === want.apps, `${tag}: the ride apps' switches ${want.apps ? 'are' : 'are not'} shown`);
      ok(/Taxi/.test(text) && (await has('[data-tradd="taxi"]')), `${tag}: a taxi can still be added`);
      if (!want.trains) ok((await has('#c_stopq_train')) && /Its name, or its Google Maps link/.test(text), `${tag}: a station can be added by its name or link, at once`);
      if (!want.stops) ok(await has('#c_stopq_bus'), `${tag}: a stop can be added by its name or link, at once`);
      ok(asked.includes('countries') === (cc === undefined), `${tag}: the countries file is ${cc === undefined ? 'read once' : 'not needed'} (${asked.filter(a => a === 'countries').length})`);
      if (name === 'in Spain') spain = text;
      else if (want.trains && want.stops && want.apps) ok(text === spain, `${tag}: the step says word for word what it says in Spain`);
      const cut = await page.evaluate(() => [...document.querySelectorAll('main .edz *')].filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).display !== 'inline' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT').map(el => (el.textContent || '').trim().slice(0, 30)).slice(0, 4));
      ok(!cut.length, `${tag}: no text cut (${cut.join('; ')})`);
      ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), `${tag}: no wider than the screen`);
      ok(!errors.length, `${tag}: no script error (${errors.slice(0, 2).join(' | ')})`);
      await page.screenshot({ path: join(SHOTS, `gates-${width}-${name.replace(/[^a-z]+/gi, '-').toLowerCase()}.png`), fullPage: true, timeout: 20000 }).catch(() => {});
      ok(jobs.includes('find-transport apps') === want.apps, `${tag}: the ride apps near the house ${want.apps ? 'are' : 'are not'} asked for (${jobs.join(', ')})`);
      ok(jobs.includes('find-transport taxis'), `${tag}: the taxis near the house are still asked for, free (${jobs.join(', ')})`);
      await ctx.close();
    }
  }
} finally { await browser.close(); }
console.log(`${pass} passed, ${fail} failed · pictures in onboarding-site/modules/test/shots/`);
process.exit(fail ? 1 : 0);
