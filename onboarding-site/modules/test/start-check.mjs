#!/usr/bin/env node
// The maker's start with the launch desk's call (onboarding-site/src/launch.js: launch_public(), asked once, never waited
// for): whatever the database does with that call, the maker opens as it does when the call answers, as fast, and shows
// the host nothing. On the pretend database (pretend.mjs), a visitor's first page and a host's editor, at 1280 and 360 px.
//   node onboarding-site/modules/test/start-check.mjs
// The call answering (the reference), then: never answering (given up after 4 s), refused (500), too many connections
// (429), unreachable, the function not in the database (404), an answer that is not JSON, and an answer with rows.
// A visitor never waits on it: the page is drawn and the link field takes typing while the call is still hanging.
import { chromium } from 'playwright';
import { ORIGIN, SB, world, open } from './pretend.mjs';

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL ' + what); } };
const WAYS = {
  answers: r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"countries":[],"switches":[]}' }),
  'never answers': () => { /* left hanging: the maker gives up after 4 s */ },
  refused: r => r.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"down"}' }),
  'too many connections': r => r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"too many connections"}' }),
  unreachable: r => r.abort('connectionrefused'),
  'not in the database': r => r.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"code":"PGRST202","message":"not found"}' }),
  'not JSON': r => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<html>a proxy\'s page</html>' }),
  'with rows': r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"countries":[{"country":"FR","state":"open"}],"switches":[{"module":"transport","part":"trains","country":"FR","is_on":true}]}' })
};
// What a host can see and tell: the page's words, without the stamp of the day and time.
const words = page => page.evaluate(() => document.body.innerText.replace(/Last updated[^\n]*/g, '').replace(/\s+/g, ' ').trim());

const browser = await chromium.launch();
try {
  for (const width of [1280, 360]) for (const who of ['a visitor', 'a host in the editor']) {
    let ref = null, refMs = 0;
    for (const [name, way] of Object.entries(WAYS)) {
      const db = world({ empty: false }), { ctx, page, errors } = await open(browser, db, { width, height: 800, session: who !== 'a visitor' });
      const said = [], calls = [];
      page.on('console', m => { if (m.type() === 'error') said.push(m.text()); });
      await ctx.route(u => u.origin === SB && u.pathname === '/rest/v1/rpc/launch_public', r => { calls.push(Date.now()); return way(r); });
      const t0 = Date.now();
      await page.goto(ORIGIN + (who === 'a visitor' ? '/' : '/?step=transport'));
      await page.waitForSelector(who === 'a visitor' ? 'main h1, main h2, main input' : '.edz, .cm-h', { timeout: 20000 });
      const ms = Date.now() - t0;
      if (who === 'a visitor') {   // the link field works at once, whatever the call is doing
        const field = page.locator('main input').first(); await field.fill('https://www.airbnb.com/rooms/123');
        ok((await field.inputValue()) === 'https://www.airbnb.com/rooms/123', `${width} px, ${who}, the call ${name}: the link field takes the link at once`);
        if (name === 'never answers') ok(Date.now() - t0 < 3900, `${width} px, ${who}, the call ${name}: drawn and typed in while the call still hangs (${Date.now() - t0} ms)`);
        await field.fill('');
      }
      await page.waitForTimeout(name === 'never answers' ? 5200 : 1200);   // past the 4 s the maker allows the call
      const text = await words(page), tag = `${width} px, ${who}, the call ${name}`;
      if (!ref) { ref = text; refMs = ms; ok(calls.length === 1, `${tag}: asked once (${calls.length})`); ok(text.length > 200, `${tag}: the maker is drawn`); }
      else {
        ok(calls.length === 1, `${tag}: asked once (${calls.length})`);
        ok(text === ref, `${tag}: the page says the same as when the call answers`);
        ok(ms < refMs + 1500, `${tag}: it opens as fast (${ms} ms, ${refMs} ms when it answers)`);
      }
      ok(!errors.length, `${tag}: no script error (${errors.slice(0, 2).join(' | ')})`);
      const ours = said.filter(s => !/Failed to load resource|net::ERR_/.test(s));   // the browser's own note of a failed request, seen only in its developer tools
      ok(!ours.length, `${tag}: the maker logs no error (${ours.slice(0, 2).join(' | ')})`);
      ok(!(await page.$('.toast:not([hidden]), [role="alert"]:not(:empty)')) || text === ref, `${tag}: nothing is shown to the host`);
      await ctx.close();
    }
  }
} finally { await browser.close(); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
