#!/usr/bin/env node
// The modules page on a pretend database, with the real maker and the real viewer in its frames (the built files of
// onboarding-site/, served from disk): nothing is read from or written to the real database, no key is needed.
//   node onboarding-site/modules/test/check.mjs        pictures in onboarding-site/modules/test/shots/ (git-ignored)
// Needs Playwright (the main checkout's packages, linked) and the fixtures (samples/sample-*.json). Fonts and map tiles
// come from the network when there is one.
import { chromium } from 'playwright';
import { join } from 'node:path';
import { ORIGIN, SHOTS, samples, world, open } from './pretend.mjs';

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };

const noSideScroll = page => page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1);
// Nothing overlaps: the page's own texts and controls, pair by pair among siblings (frames are the maker's and the guide's own business).
const overlaps = page => page.evaluate(() => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
  for (const parent of document.querySelectorAll('main *, .top, .fb *')) {
    const kids = [...parent.children].filter(vis).filter(k => !['absolute', 'fixed'].includes(getComputedStyle(k).position));
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.push(`${kids[i].className || kids[i].tagName} over ${kids[j].className || kids[j].tagName}`);
    }
  }
  return [...new Set(out)].slice(0, 6);
});
const clipped = page => page.evaluate(() => [...document.querySelectorAll('main b, main h1, main h2, main button, main a, main span, main p, .fb *')].filter(el => el.children.length === 0 && !el.classList.contains('sr') && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).display !== 'inline').map(el => (el.textContent || '').trim().slice(0, 40)).slice(0, 6));

const browser = await chromium.launch();
try {
  // Who gets in
  { const { ctx, page } = await open(browser, world(), { width: 1280, session: false }); await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.gate');
    ok((await page.textContent('.gate h1')) === 'Log in first', 'no login: the notice'); ok(!(await page.$('.grid')), 'no login: nothing else'); await ctx.close(); }
  { const { ctx, page } = await open(browser, world({ owner: false }), { width: 1280 }); await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.gate');
    ok((await page.textContent('.gate h1')) === 'Not for this account', 'another account: the notice'); ok(!(await page.$('.grid')), 'another account: nothing else'); await ctx.close(); }

  for (const width of [1280, 360]) {
    const db = world(), { ctx, page, errors } = await open(browser, db, { width, height: width === 360 ? 740 : 860 }), tag = width + ' px';
    // A picture is never worth a failed run: when the browser cannot take one (a frame still drawing its map), say so and go on.
    const shot = n => page.screenshot({ path: join(SHOTS, `${width}-${n}.png`), fullPage: width === 360, timeout: 15000 }).catch(() => page.screenshot({ path: join(SHOTS, `${width}-${n}.png`), timeout: 15000 })).catch(() => console.log(`no picture: ${width}-${n}`));
    const sound = async n => { ok(await noSideScroll(page), `${tag} ${n}: no wider than the screen`); const o = await overlaps(page); ok(!o.length, `${tag} ${n}: nothing overlaps (${o.join('; ')})`); const c = await clipped(page); ok(!c.length, `${tag} ${n}: no text cut (${c.join('; ')})`); await shot(n); };
    await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.grid');
    ok((await page.$$('.mc')).length === 14, `${tag}: the fourteen modules`);
    ok(/Taxis found near the house · Ride apps · Train stations and lines · iryo and Ouigo · Metro, tram and bus stops/.test(await page.textContent('.mc')), `${tag}: a module's parts`);
    ok(/Spain: all 5 parts/.test(await page.textContent('.mc')), `${tag}: a module's countries`);
    await sound('fourteen');

    // Countries
    await page.goto(ORIGIN + '/modules/#/transport/countries'); await page.waitForSelector('.part');
    ok((await page.$$('.part')).length === 5, `${tag}: Getting around has five parts`);
    ok((await page.getAttribute('[data-sw="taxis/ES"]', 'aria-checked')) === 'true' && (await page.getAttribute('[data-sw="apps/ES"]', 'aria-checked')) === 'true', `${tag}: Spain's switches follow the list`);
    await page.click('[data-sw="apps/ES"]'); await page.waitForSelector('[data-back="apps/ES"]');
    ok(db.calls.some(c => c[0] === 'switch' && c[1].part === 'apps' && c[1].country === 'ES' && c[1].is_on === false), `${tag}: a switch is saved`);
    await page.click('[data-note="apps/ES"]'); await page.fill('.nf input', 'Only the big cities'); await page.click('.nf .btn'); await page.waitForSelector('.pt .note');
    ok(db.switches.some(x => x.part === 'apps' && x.note === 'Only the big cities' && x.is_on === false), `${tag}: a note is saved, the switch kept`);
    await page.selectOption('#addc', 'PT'); await page.waitForSelector('[data-sw="trains/PT"]');
    ok((await page.getAttribute('[data-sw="taxis/PT"]', 'aria-checked')) === 'true' && (await page.getAttribute('[data-sw="trains/PT"]', 'aria-checked')) === 'false', `${tag}: a new country starts from the list`);
    await sound('countries');
    await page.click('[data-back="apps/ES"]'); await page.waitForFunction(() => !document.querySelector('[data-back="apps/ES"]'));
    ok((await page.getAttribute('[data-sw="apps/ES"]', 'aria-checked')) === 'true', `${tag}: back to what the list says`);

    // Play
    await page.goto(ORIGIN + '/modules/#/transport/play'); await page.waitForSelector('#frMaker');
    const maker = page.frameLocator('#frMaker');
    try { await maker.locator('h1, h2').filter({ hasText: 'Getting around' }).first().waitFor({ timeout: 20000 }); }
    catch (e) { await page.screenshot({ path: join(SHOTS, `${width}-maker-missing.png`) }); console.log('the maker frame shows:', (await maker.locator('body').innerText().catch(() => '?')).slice(0, 400).replace(/\n+/g, ' | '), '| errors:', errors.join(' | ')); throw e; }
    ok(true, `${tag}: the maker's real step is in the frame`);
    ok(await page.evaluate(id => (JSON.parse(localStorage.getItem('porta-house-v1')) || {}).id === id, db.guides[0].id), `${tag}: the maker is on the sample house`);
    if (width === 1280) {
      ok((await page.getAttribute('#stage', 'data-mode')) === 'desktop', `${tag}: the maker at desktop width`);
      const src = await maker.locator('#cmPhoneFrame').getAttribute('src', { timeout: 20000 });
      ok(/\/g\/sample-city\?preview#s\/transport$/.test(src || ''), `${tag}: its own phone shows the sample house's guide (${src})`);
      await maker.frameLocator('#cmPhoneFrame').locator('#view').waitFor({ timeout: 20000 });
      await page.waitForTimeout(1500); await sound('play-desktop');
      await page.click('[data-step="1"]'); await maker.locator('h1, h2').filter({ hasText: 'Home page' }).first().waitFor({ timeout: 10000 });
      ok(true, `${tag}: "Its tile on Home" opens the board`);
      await page.click('[data-width="phone"]'); await page.waitForSelector('#frGuest');
    } else {
      ok((await page.getAttribute('#stage', 'data-mode')) === 'small', `${tag}: one side at a time`);
      await page.waitForTimeout(800); await sound('play-host');
      await page.click('[data-side="guest"]');
    }
    const guest = page.frameLocator('#frGuest');
    await guest.locator('#view').waitFor({ timeout: 20000 });
    ok(/\/g\/sample-city\?preview&lang=en#/.test(await page.getAttribute('#frGuest', 'src')), `${tag}: the guest side is the viewer with the draft`);
    await page.waitForTimeout(1500); await sound(width === 1280 ? 'play-phone' : 'play-guest');
    ok(!db.calls.some(c => c[0] === 'guide-POST'), `${tag}: no house is made by playing`);

    // An empty house says so; Reset fills it
    const last = samples[samples.length - 1].slug;
    if (width === 360) await page.selectOption('[data-pick="house"]', last); else await page.click(`[data-house="${last}"]`); await page.waitForFunction(() => /is empty/.test(document.querySelector('#playNote').textContent));
    ok(!(await page.$('#frMaker')), `${tag}: an empty house opens no frame`);
    await page.click('#reset'); ok(/Sure/.test(await page.textContent('#reset')), `${tag}: Reset asks once`);
    await page.click('#reset'); await page.waitForSelector('#frMaker', { state: 'attached', timeout: 15000 });
    ok(db.calls.some(c => c[0] === 'guide' && c[1] === last && c[2] === 'content,draft,theme'), `${tag}: Reset writes the fixture and empties the draft`);
    ok(!!(db.guides.find(g => g.slug === last).content.site || {}).name, `${tag}: the house is filled`);

    // Feedback, from the stage
    await page.click('#fbOpen'); await page.waitForSelector('#fb .fbf');
    await page.click('#fb [data-part="trains"]'); await page.fill('#fb textarea', 'The badges are hard to read.'); await sound('feedback-open');
    await page.click('#fb .btn'); await page.waitForFunction(() => document.querySelector('#fb textarea').value === '');
    const sent = (db.calls.find(c => c[0] === 'feedback') || [])[1] || {};
    ok(sent.module === 'transport' && sent.part === 'trains' && sent.across === false && sent.words === 'The badges are hard to read.', `${tag}: the feedback is saved with its module and part`);
    ok(sent.seen && sent.seen.house === last && sent.seen.lang === 'en' && !!sent.seen.step && !!sent.seen.guest && !!sent.seen.width, `${tag}: and with what was on screen (${JSON.stringify(sent.seen)})`);
    await page.goto(ORIGIN + '/modules/#/transport/feedback'); await page.waitForSelector('.fi');
    ok(/Feedback \(1 new\)/.test(await page.textContent('.tabs')), `${tag}: the tab counts what is new`);
    await sound('feedback');
    await page.selectOption('[data-state-of]', 'handed_out'); await page.waitForFunction(() => document.querySelector('.fi').dataset.state === 'handed_out');
    ok(db.calls.some(c => c[0] === 'feedback-state' && c[1] === 'handed_out'), `${tag}: an item's state is saved`);
    // The launch desk: the countries, preparing one, asking for a part, launching
    await page.goto(ORIGIN + '/modules/#/countries'); await page.waitForSelector('.cty');
    ok(/Spain\s*Open\s*33 of 33 parts on/.test((await page.textContent('.cty')).replace(/\s+/g, ' ')), `${tag}: Spain is open with every part (${(await page.textContent('.cty')).replace(/\s+/g, ' ').trim()})`);
    await sound('countries-list');
    await page.selectOption('#addc', 'FR'); await page.waitForSelector('#launch');
    ok(db.calls.some(c => c[0] === 'country' && c[1] === 'FR' && c[2] === 'preparing'), `${tag}: a country is prepared, not open`);
    ok(/Not open yet\s*23 of 33 parts on/.test((await page.textContent('.ch')).replace(/\s+/g, ' ')), `${tag}: it starts with the parts that work anywhere`);
    ok((await page.$$('.cz .part')).length === 10 && (await page.$$('.wp')).length === 23, `${tag}: ten parts need work, twenty-three work already`);
    ok(/To work in France: The country’s open train timetables|To work in France: The country's open train timetables/.test(await page.textContent('.cz')), `${tag}: a part says what it needs there`);
    await page.click('[data-ask="transport/trains"]'); await page.fill('.af textarea', 'Add the SNCF stations.'); await sound('country-asking');
    await page.click('.af .btn'); await page.waitForSelector('.rq');
    const asked = (db.calls.filter(c => c[0] === 'feedback').pop() || [])[1] || {};
    ok(asked.kind === 'request' && asked.country === 'FR' && asked.module === 'transport' && asked.part === 'trains' && asked.words === 'Add the SNCF stations.', `${tag}: what is asked is saved for its module and country`);
    await page.click('[data-csw="transport/apps"]'); await page.waitForFunction(() => /24 of 33/.test(document.querySelector('.ch').textContent));
    ok(db.switches.some(x => x.module === 'transport' && x.part === 'apps' && x.country === 'FR' && x.is_on === true), `${tag}: a part that needs work can be launched anyway`);
    await page.click('#launch'); ok(/Sure/.test(await page.textContent('#launch')), `${tag}: Launch asks once`);
    await page.click('#launch'); await page.waitForSelector('.ch .st-open');
    ok(db.calls.some(c => c[0] === 'country' && c[1] === 'FR' && c[2] === 'open'), `${tag}: the country is launched`);
    await sound('country');
    await page.goto(ORIGIN + '/modules/#/transport/feedback'); await page.waitForSelector('.fi');
    ok(/Asked for France/.test(await page.textContent('.fl')), `${tag}: the module's feedback shows what was asked for a country`);

    await page.goto(ORIGIN + '/modules/#/'); await page.waitForSelector('.grid');
    ok(await page.evaluate(() => { try { return !sessionStorage.getItem('porta-console-own-house') && !localStorage.getItem('porta-house-v1'); } catch (e) { return false; } }), `${tag}: leaving the stage gives the device its own house back`);
    ok(!db.calls.some(c => c[0] === 'job' && c[1] !== 'find-transport'), `${tag}: no paid search was asked (${db.calls.filter(c => c[0] === 'job').map(c => c[1]).join(', ')})`);
    ok(!errors.length, `${tag}: no script error (${errors.slice(0, 3).join(' | ')})`);
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`${pass} passed, ${fail} failed · pictures in onboarding-site/modules/test/shots/`);
process.exit(fail ? 1 : 0);
