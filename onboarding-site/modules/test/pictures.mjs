#!/usr/bin/env node
// Every module pictured five ways on a sample house, on the pretend database (pretend.mjs): the guide on a phone and on
// a desktop screen, the maker's step on a desktop screen and on a phone, and the owner's Countries tab.
//   node onboarding-site/modules/test/pictures.mjs [house] [module,module]   default: sample-city, all fourteen
// Writes shots/gallery/<nn>-<module>-<view>.jpg and shots/gallery/index.html (git-ignored). Nothing is written anywhere else.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, SHOTS, USER, world, open } from './pretend.mjs';

const OUT = join(SHOTS, 'gallery'); mkdirSync(OUT, { recursive: true });
const HOUSE = process.argv[2] || 'sample-city', ONLY = (process.argv[3] || '').split(',').filter(Boolean);
const VIEWS = [['guest-phone', 'The guide on a phone'], ['guest-desktop', 'The guide on a desktop screen'], ['maker-desktop', 'The maker on a desktop screen'], ['maker-phone', 'The maker on a phone'], ['countries', 'Your side: its countries']];
const T = 45000, settle = (page, ms) => page.waitForTimeout(ms);
const snap = async (page, file, full) => { try { await page.screenshot({ path: join(OUT, file), type: 'jpeg', quality: 72, fullPage: full, timeout: 30000 }); } catch (e) { try { await page.screenshot({ path: join(OUT, file), type: 'jpeg', quality: 72, timeout: 30000 }); } catch (e2) { console.log('no picture: ' + file); } } };

const browser = await chromium.launch();
const db = world({ empty: false }), house = db.guides.find(g => g.slug === HOUSE);
if (!house) { console.error('No such sample house: ' + HOUSE); process.exit(1); }
const at = async (width, height) => { const o = await open(browser, db, { width, height });
  await o.ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['porta-house-v1', JSON.stringify({ acct: USER.id, id: house.id })]); return o; };
let mods = [];
try {
  { const { ctx, page } = await at(1280, 860); await page.goto(ORIGIN + '/modules/'); await page.waitForSelector('.grid', { timeout: T });
    mods = await page.evaluate(() => MODS.map((m, i) => ({ n: i + 1, id: m.id, name: availOf(m.id).name, what: m.what, step: m.steps[0][0], stepName: m.steps[0][1], route: m.steps[0][2] }))); await ctx.close(); }
  for (const m of mods.filter(x => !ONLY.length || ONLY.includes(x.id))) {
    const nn = String(m.n).padStart(2, '0'), name = v => `${nn}-${m.id}-${v}.jpg`, guest = `${ORIGIN}/g/${HOUSE}?preview&lang=en#${m.route}`;
    for (const [v, w, h, full] of [['guest-phone', 390, 844, true], ['guest-desktop', 1280, 800, false]]) {
      const { ctx, page } = await at(w, h);
      try { await page.goto(guest); await page.waitForSelector('#view', { timeout: T }); await settle(page, 2500);
        if (m.id === 'wifi') { await page.getByText('Tap to connect').first().click({ timeout: 4000 }).catch(() => {}); await settle(page, 600); }
        await snap(page, name(v), full && m.id !== 'wifi' && m.route !== 'map'); } catch (e) { console.log(`${m.id} ${v}: ${String(e.message).split('\n')[0]}`); }
      await ctx.close();
    }
    for (const [v, w, h, full] of [['maker-desktop', 1280, 860, false], ['maker-phone', 360, 740, true]]) {
      const { ctx, page } = await at(w, h);
      try { await page.goto(`${ORIGIN}/?step=${m.step}&lang=en`); await page.locator('h1, h2').filter({ hasText: m.stepName.replace(/ \(.*$/, '') }).first().waitFor({ timeout: T });
        if (w >= 1240) await page.frameLocator('#cmPhoneFrame').locator('#view').waitFor({ timeout: T }).catch(() => {});
        await settle(page, 2500); await snap(page, name(v), full); } catch (e) { console.log(`${m.id} ${v}: ${String(e.message).split('\n')[0]}`); }
      await ctx.close();
    }
    { const { ctx, page } = await at(1280, 860);
      try { await page.goto(`${ORIGIN}/modules/#/${m.id}/countries`); await page.waitForSelector('.part', { timeout: T }); await settle(page, 500); await snap(page, name('countries'), true); } catch (e) { console.log(`${m.id} countries: ${String(e.message).split('\n')[0]}`); }
      await ctx.close(); }
    console.log(`${nn} ${m.name}`);
  }
} finally { await browser.close(); }

// One page of them all, to scroll through on a phone or a desktop.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The fourteen modules, pictured</title>
<style>body{margin:0;padding:16px;background:#EFEDE8;color:#16202E;font:16px/1.5 system-ui,sans-serif}h1{font-size:26px;margin:0 0 4px}h2{font-size:21px;margin:28px 0 2px}p{margin:0 0 10px;color:#59606B}
.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;align-items:start}figure{margin:0;background:#fff;border:1.5px solid #DEDAD2;border-radius:14px;overflow:hidden}figcaption{padding:8px 10px;font-weight:600;font-size:14px}
figure a{display:block;max-height:420px;overflow:hidden}img{display:block;width:100%;height:auto}</style></head><body>
<h1>The fourteen modules, pictured</h1><p>On the sample house ${esc(HOUSE)} (made up), in English. Tap a picture to see it whole.</p>
${mods.map(m => `<h2>${m.n}. ${esc(m.name)}</h2><p>${esc(m.what)}</p><div class="row">${VIEWS.map(([v, t]) => { const f = `${String(m.n).padStart(2, '0')}-${m.id}-${v}.jpg`; return existsSync(join(OUT, f)) ? `<figure><a href="${f}"><img loading="lazy" src="${f}" alt="${esc(m.name)}: ${esc(t)}"></a><figcaption>${esc(t)}</figcaption></figure>` : ''; }).join('')}</div>`).join('\n')}
</body></html>`);
console.log('pictures in ' + OUT);
