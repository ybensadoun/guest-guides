// The walk: a picture of every screen a host goes through, for a design review, at 1280 x 860 and 360 x 780, in English.
// No checks. Run through check.mjs, which reads the guides once and hands over its harness (fake session, every database
// and /api call answered here, nothing written anywhere):
//   WALK=1 node onboarding-site/test/check.mjs [editor slug] [builder slug]
// Pictures in onboarding-site/test/shots/walk/ (git-ignored): NN-<flow>-<step>-<1280|360>[-full].png, NN in the order a host
// meets them; index.txt says what each one shows; measures.txt holds the 1280 px measures of each screen.
import { mkdirSync, writeFileSync, renameSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export default async function walk(H) {
  const { browser, open, ready, go, json, E, B, N, A0, photos, HTML, SB, HERE } = H;
  const DIR = join(HERE, 'shots', 'walk'), TMP = join(DIR, '.tmp');
  mkdirSync(TMP, { recursive: true });
  for (const f of readdirSync(DIR)) if (/\.(png|txt)$/.test(f)) unlinkSync(join(DIR, f));
  const SIZES = [[1280, 860], [360, 780]];
  const shots = [], measures = new Map(), skipped = [], errorsSeen = [];
  let tmpN = 0;

  // ---- Waits and pictures ----
  const settle = async p => {
    await p.evaluate(async () => {
      await document.fonts.ready;
      for (const id of ['phoneFrame', 'cmPhoneFrame']) { const f = document.getElementById(id); if (!f) continue;
        for (let i = 0; i < 40 && !(f.contentDocument && f.contentDocument.readyState === 'complete'); i++) await new Promise(r => setTimeout(r, 100));
        try { await f.contentDocument.fonts.ready; } catch (e) { /* another origin */ } }
    }).catch(() => {});
    await p.waitForTimeout(700);
  };
  // One screen: the viewport as first seen (scrolled to top unless keep), then the whole page; at 1280 px, its measures.
  // order = [group, index]: the final NN comes from it, so the alphabetical listing is a host's journey.
  const shot = async (p, w, order, flow, step, what, opt = {}) => {
    await settle(p);
    if (!opt.keep) { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250); }
    const base = `${flow}-${step}`;
    const t1 = join(TMP, `${++tmpN}.png`); await p.screenshot({ path: t1 });
    shots.push({ order, base, w, full: false, tmp: t1, what: what + (opt.keep ? (opt.note || ' (scrolled to it)') : '') });
    if (!opt.noFull) { const t2 = join(TMP, `${++tmpN}.png`); await fullShot(p, t2);
      shots.push({ order, base, w, full: true, tmp: t2, what: what + ', whole page' }); }
    if (w === 1280 && !measures.has(base)) measures.set(base, { what, m: await p.evaluate(MEASURE).catch(e => ({ error: e.message })) });
  };
  // The whole page. The signed-out page (#acct) is a fixed layer that scrolls in itself: for this picture it is laid in the
  // page's flow, so the picture holds all of it and not only its first screen.
  const fullShot = async (p, path) => {
    const st = await p.$('#acct:not(.only)') ? await p.addStyleTag({ content: '#acct:not(.only){position:absolute!important;bottom:auto!important;overflow:visible!important}' }) : null;
    if (st) await p.waitForTimeout(150);
    await p.screenshot({ path, fullPage: true });
    if (st) await st.evaluate(e => e.remove());
  };
  const elShot = async (p, sel, w, order, flow, step, what) => {
    await settle(p); const t = join(TMP, `${++tmpN}.png`);
    const el = await p.$(sel); if (!el) { skipped.push(`${flow}-${step} at ${w}: ${sel} not found`); return; }
    await el.screenshot({ path: t }); shots.push({ order, base: `${flow}-${step}`, w, full: false, tmp: t, what });
    if (w === 1280 && !measures.has(`${flow}-${step}`)) measures.set(`${flow}-${step}`, { what, m: await p.evaluate(MEASURE).catch(e => ({ error: e.message })) });
  };
  const watch = (p, tag) => p.on('pageerror', e => errorsSeen.push(`${tag}: ${e.message}`));

  // ---- Group 1: a new visitor, the link, the listing read, the guide writing itself in the phone (and later group 3: Save my guide) ----
  const uid = '00000000-0000-0000-0000-0000000070aa', AREA_ID = '00000000-0000-0000-0000-0000000a4ea1', JOB_ID = '00000000-0000-0000-0000-00000000f011';
  const visitorCtx = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }), rows = {};
    await ctx.route('**/*', route => { const req = route.request(), u = new URL(req.url());
      // the listing, read slowly so each stage can be pictured: the page in 6 s, the writing 6 s later
      if (u.host === 'editor.test' && u.pathname === '/api/listing') { const b = JSON.parse(req.postData() || '{}'); return setTimeout(() => json(route, b.stage === 'page' ? H.PAGE : H.WRITE).catch(() => {}), 6000); }
      if (u.host === 'editor.test') return u.pathname.startsWith('/api/') ? json(route, { ok: false }) : route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin !== SB) return route.continue();
      if (u.pathname === '/auth/v1/settings') return json(route, { external: { google: true, email: true } });
      if (u.pathname.startsWith('/auth/v1/user')) return json(route, { id: uid, email: 'visitor@example.org' });
      if (u.pathname === '/rest/v1/rpc/start_area_research') return json(route, { ok: true, id: AREA_ID, status: 'queued' });
      if (u.pathname === '/rest/v1/rpc/area_research_status') return json(route, { status: 'running' });
      if (u.pathname.startsWith('/rest/v1/guide_jobs')) return json(route, req.method() === 'POST' ? [{ id: JOB_ID, status: 'queued' }] : [{ status: 'running' }]);
      if (u.pathname.startsWith('/rest/v1/guides')) return json(route, []);
      return json(route, u.pathname.startsWith('/auth/') ? {} : []); });
    const p = await ctx.newPage(); watch(p, `visitor ${w}`); return { ctx, p };
  };
  for (const [w, h] of SIZES) {
    const { ctx, p } = await visitorCtx(w, h);
    await p.goto('http://editor.test/'); await p.waitForSelector('#acUrl', { timeout: 15000 }).catch(() => {});
    await shot(p, w, [1, 0], 'visitor', 'first-page', 'The first page for a new visitor, signed out: the example guide and the box for the listing link');
    await p.fill('#acUrl', 'https://www.airbnb.com/rooms/12345678'); await p.click('#acct .go'); await p.waitForTimeout(900);
    await shot(p, w, [1, 1], 'visitor', 'reading-listing', 'Just after the link is pasted: the listing is being read (nothing back yet)');
    await p.waitForFunction(() => /Writing/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 12000 }).catch(() => {});
    await p.waitForTimeout(600);
    await shot(p, w, [1, 2], 'visitor', 'writing', 'The listing page read: photo and name in the phone while the guide is being written');
    await p.waitForFunction(() => /Your guide is written/.test((document.getElementById('yoursTx') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2600);
    await shot(p, w, [1, 3], 'visitor', 'guide-written', '"Your guide is written": the guide built itself in the phone, Make it yours');
    // group 3: at the end of the builder, Review and send offers Save my guide, which opens the account card
    await go(p, '#send'); await p.waitForTimeout(500);
    await shot(p, w, [3, 0], 'account', 'review-before-account', 'Review and send for a visitor with no account yet: Save my guide instead of Send');
    if (await p.$('[data-acctnow="signup"]')) {
      await p.click('[data-acctnow="signup"]'); await p.waitForSelector('#acct.only #acEmail', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
      await shot(p, w, [3, 1], 'account', 'save-my-guide-sheet', 'The sign-up card over the builder (Save your guide), with Google');
    } else skipped.push(`account-save-my-guide-sheet at ${w}: no Save my guide button`);
    await ctx.close();
  }

  // ---- Group 2: the builder, for the host B just after the listing was read, every step in the order of the list ----
  const places = ['Cala Test', 'Castell Test', 'Camí Test', 'Jardins Test'].map((name, i) => ({ id: 'tp' + i, name, rating: 4.5, reviews: 200, type: 'Beach', maps: 'https://maps.google.com/?q=' + i, summary: 'A test place.', lat: A0.lat, lng: A0.lng, km: 2 + i, photo: photos[i] || null, photoBy: [] }));
  for (const [w, h] of SIZES) {
    const { ctx, p } = await open(browser, B, w, h); watch(p, `builder ${w}`);
    await ctx.route('**/api/places**', r => json(r, new URL(r.request().url()).searchParams.get('probe') ? { ok: true, enabled: true } : { ok: true, lat: A0.lat, lng: A0.lng, places }));
    await p.goto('http://editor.test/'); await ready(p);
    const steps = await p.$$eval('.rail a.si', as => { const seen = new Set(); return as.map(a => [a.getAttribute('href'), (a.querySelector('.st') || a).textContent.trim()]).filter(([h]) => !seen.has(h) && seen.add(h)); });
    for (const [i, [href, title]] of steps.entries()) {
      await go(p, href); await p.waitForTimeout(400);
      if (href === '#nearby') await p.waitForSelector('.sw-card', { timeout: 5000 }).catch(() => {});
      const slug = href.replace('#', '') || 'start';
      await shot(p, w, [2, i + 1], 'builder', `${String(i + 1).padStart(2, '0')}-${slug}`, `Builder step "${title}" (${href}) as first shown`);
    }
    if (await p.isVisible('#openSteps').catch(() => false)) {
      await go(p, steps[0][0]); await p.click('#openSteps'); await p.waitForSelector('.sheet .si', { timeout: 3000 }).catch(() => {});
      await shot(p, w, [2, 0], 'builder', '00-step-list', 'The builder\'s list of steps (the sheet behind the Steps button)', { keep: true, note: ' (open over the page)' });
      await p.click('.sheet-x').catch(() => {});
    } else skipped.push(`builder-00-step-list at ${w}: no Steps button at this width (the list is the rail on the left)`);
    await ctx.close();
  }

  // ---- Group 3 (continued): the log-in card on the signed-out page, and the start page of a signed-in host with no house ----
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route('**/*', route => { const u = new URL(route.request().url());
      if (u.host === 'editor.test') return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname === '/auth/v1/settings') return json(route, { external: { google: true, email: true } });
      if (u.origin === SB) return json(route, []);
      return route.continue(); });
    const p = await ctx.newPage(); watch(p, `signed out ${w}`);
    await p.goto('http://editor.test/'); await p.waitForSelector('#acct .ac-card', { timeout: 15000 }).catch(() => {});
    await p.click('#acct [data-m="login"]:visible'); await p.waitForTimeout(400);
    await shot(p, w, [3, 2], 'account', 'log-in', 'The signed-out page with Log in open (email, password, Continue with Google)');
    await ctx.close();
    const o = await open(browser, N, w, h); watch(o.p, `new account ${w}`);
    await o.p.goto('http://editor.test/'); await o.p.waitForSelector('#st_url', { timeout: 15000 }).catch(() => {});
    await shot(o.p, w, [3, 3], 'account', 'start-signed-in', 'A signed-in host with no house yet (or Add a house): paste your link');
    await o.ctx.close();
  }

  // ---- Group 4: the build screen and the ready screen ----
  const now = new Date().toISOString(), SIX = ['en', 'es', 'fr', 'ca', 'de', 'nl'];
  const building = msg => ({ ...B, status: 'generating', message: msg, slug: 'test-build', answers: { ...B.answers, slug: 'test-build', languages: SIX, sourceLang: 'en', _sentAt: now } });
  const FOUND = [{ id: 'rd-castle', name: { en: 'Ready Test Castle' }, type: { en: 'Castle' }, town: 'Testville', lat: A0.lat + 0.05, lng: A0.lng, km_from_house: 6, description: { en: 'A castle on a hill, with a short walk up and a view of the vineyards.' }, tags: ['kidsfun'] },
    { id: 'rd-cave', name: { en: 'Ready Test Cellar' }, type: { en: 'Winery' }, town: 'Othertown', lat: A0.lat - 0.05, lng: A0.lng, km_from_house: 9, description: { en: 'A family wine cellar with visits and tastings.' } }];
  const readyCtx = async (w, h, found) => {
    const built = { ...E, status: 'published', finished_at: now, draft: null, answers: { ...E.answers, slug: E.slug, _sentAt: now } };
    const G = found.length ? { ...built, status: 'generating', message: 'Saving the guide', content: null } : built, o = await open(browser, G, w, h); let polled = false;
    await o.ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), r => json(r, /kind=eq.find-todo/.test(new URL(r.request().url()).search) && found.length ? [{ id: 'job-walk-ready', status: 'done', message: found.length + ' things to do found', created_at: now, result: { items: found } }] : []));
    await o.ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), r => { const req = r.request(), q = new URL(req.url()).search;
      if (req.method() === 'PATCH') return r.fulfill({ status: 204, body: '' });
      if (/select=status/.test(q)) { polled = true; return json(r, [{ status: 'published', slug: built.slug, message: null, finished_at: now }]); }
      if (/select=id(%2C|,)answers/.test(q)) return json(r, [found.length && !polled ? G : built]);
      return r.fallback(); });
    return o; };
  for (const [w, h] of SIZES) {
    for (const [i, msg, step, what] of [[0, 'Reading your answers', 'early', 'The build screen just after Send: reading the answers'], [1, 'Translating', 'translating', 'The build screen while translating into 6 languages']]) {
      const { ctx, p } = await open(browser, building(msg), w, h); watch(p, `build ${w}`);
      await p.goto('http://editor.test/#building'); await p.waitForSelector('#bstate .btick', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200);
      await shot(p, w, [4, i], 'build', step, what);
      await ctx.close(); }
    { const { ctx, p } = await readyCtx(w, h, FOUND); watch(p, `ready found ${w}`);
      await p.goto('http://editor.test/#building'); await p.waitForSelector('#bcards .cm-fcard', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(400);
      await shot(p, w, [4, 2], 'build', 'ready-found', 'The ready screen with 2 places found: the first card, keep or skip');
      await ctx.close(); }
    { const { ctx, p } = await readyCtx(w, h, []); watch(p, `ready none ${w}`);
      await p.goto('http://editor.test/#building'); await p.waitForSelector('#bstate .go-next', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(600);
      await shot(p, w, [4, 3], 'build', 'ready-none', 'The ready screen with nothing found: Open my guide');
      await ctx.close(); }
  }

  // ---- Group 5: the editor on guide E; group 6: its dialogs ----
  for (const [w, h] of SIZES) {
    const { ctx, p } = await open(browser, E, w, h); watch(p, `editor ${w}`);
    await ctx.route(u => u.pathname === '/api/places', r => json(r, new URL(r.request().url()).searchParams.get('open') ? { ok: true, closed: null } : { ok: false }));
    await p.goto('http://editor.test/'); await ready(p);
    const steps = await p.$$eval('.rail a.si', as => { const seen = new Set(); return as.map(a => [a.getAttribute('href'), (a.querySelector('.st') || a).textContent.trim()]).filter(([h]) => !seen.has(h) && seen.add(h)); });
    for (const [i, [href, title]] of steps.entries()) {
      await go(p, href); await p.waitForTimeout(500);
      await shot(p, w, [5, i + 1], 'editor', `${String(i + 1).padStart(2, '0')}-${href.replace('#', '')}`, `Editor step "${title}" (${href}) as first shown`);
    }
    const hrefs = steps.map(s => s[0]);
    if (await p.isVisible('#openSteps').catch(() => false)) {
      await go(p, hrefs[0]); await p.click('#openSteps'); await p.waitForSelector('.sheet .si', { timeout: 3000 }).catch(() => {});
      await shot(p, w, [5, 0], 'editor', '00-step-list', 'The editor\'s list of steps (the sheet behind the Steps button)', { keep: true, note: ' (open over the page)' });
      await p.click('.sheet-x').catch(() => {});
    } else skipped.push(`editor-00-step-list at ${w}: no Steps button at this width (the list is the rail on the left)`);
    // One opened card in each list
    let k = 60;
    for (const [href, name] of [['#todo', 'attractions'], ['#restaurants', 'eat-and-drink'], ['#markets', 'market'], ['#events', 'event']]) {
      k++;
      if (!hrefs.includes(href)) { skipped.push(`editor-card-${name} at ${w}: no ${href} step`); continue; }
      await go(p, href); await p.waitForTimeout(400);
      const s = await p.$('details.cmi:not([open]) > summary');
      if (!s) { skipped.push(`editor-card-${name} at ${w}: no closed card in ${href}`); continue; }
      await s.click(); await p.waitForTimeout(500);
      await p.evaluate(() => { const d = document.querySelector('details.cmi[open]'); if (d) window.scrollBy(0, d.getBoundingClientRect().top - 90); }); await p.waitForTimeout(300);
      await shot(p, w, [5, k], 'editor', `card-${name}`, `Editor ${href}: one ${name.replace(/-/g, ' ')} card opened`, { keep: true });
      await p.click('details.cmi[open] > summary').catch(() => {});
    }
    // Find more, idle (no search yet) in Attractions
    if (hrefs.includes('#todo')) {
      await go(p, '#todo'); await p.waitForTimeout(400);
      if (await p.$('.cm-find')) { await p.evaluate(() => { const c = document.querySelector('.cm-find'); window.scrollBy(0, c.getBoundingClientRect().top - 90); }); await p.waitForTimeout(200);
        await shot(p, w, [5, 70], 'editor', 'find-more-idle', 'Attractions: the Find more panel before any search', { keep: true }); }
      else skipped.push(`editor-find-more-idle at ${w}: no .cm-find in #todo`);
    }
    // Houses menu, account bar, then the dialogs (nothing is confirmed: no request is sent)
    await go(p, hrefs[0]); await p.evaluate(() => window.scrollTo(0, 0));
    await elShot(p, 'header.top', w, [5, 80], 'editor', 'account-bar', 'The page header alone (logo, houses menu, save state, language, Log out)');
    if (await p.$('#acctbar .houses > summary')) {
      await p.click('#acctbar .houses > summary'); await p.waitForTimeout(250);
      await shot(p, w, [5, 81], 'editor', 'houses-menu', 'The houses menu open (each house with its delete button, Add a house, Delete my account)', { keep: true, note: ' (open over the page)', noFull: true });
      const del = await p.$(`#acctbar [data-delhouse="${E.id}"]`);
      if (del) { await del.click(); await p.waitForSelector('.acdel', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
        await shot(p, w, [6, 0], 'dialog', 'delete-house', 'Delete a published house: type its web address to confirm', { keep: true, note: ' (open over the page)', noFull: true });
        await p.click('.acdel [data-no]').catch(() => {}); await p.waitForTimeout(200); }
      else skipped.push(`dialog-delete-house at ${w}: no delete button`);
      if (!(await p.$('#acctbar .houses[open]'))) { await p.click('#acctbar .houses > summary'); await p.waitForTimeout(200); }
      const da = await p.$('#acctbar [data-delacct]');
      if (da) { await da.click(); await p.waitForSelector('.acdel', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
        await shot(p, w, [6, 1], 'dialog', 'delete-account', 'Delete my account: type the email to confirm', { keep: true, note: ' (open over the page)', noFull: true });
        await p.click('.acdel [data-no]').catch(() => {}); await p.waitForTimeout(200); }
      else skipped.push(`dialog-delete-account at ${w}: no Delete my account button`);
      await p.keyboard.press('Escape').catch(() => {});
    } else skipped.push(`editor-houses-menu at ${w}: no houses menu`);
    // Publish changes with a change waiting: one field edited in the first step, saved as a draft (answered here, kept nowhere)
    await go(p, '#guide'); await p.waitForTimeout(400);
    const field = await p.$('.edz input[type="text"], .edz textarea');
    if (field) { await field.fill(((await field.inputValue()) || '') + ' '); await p.waitForTimeout(2400); }
    if (hrefs.includes('#publish')) {
      await go(p, '#publish'); await p.waitForTimeout(500);
      await shot(p, w, [5, 90], 'editor', 'publish-changes-waiting', 'Publish changes with one change waiting (a field edited)');
      const un = await p.$('[data-cunpublish]');
      if (un) { await un.click(); await p.waitForTimeout(250); await un.scrollIntoViewIfNeeded().catch(() => {});
        await shot(p, w, [6, 2], 'dialog', 'unpublish-confirm', 'Unpublish, first tap: "Sure? Tap again to take it offline" (not tapped again)', { keep: true, noFull: true }); }
      else skipped.push(`dialog-unpublish-confirm at ${w}: no Unpublish button`);
    } else skipped.push(`editor-publish-changes-waiting at ${w}: no #publish step`);
    await ctx.close();
    // Find more with suggestions back: a done search's cards in Attractions (its Google line answered here as "open")
    const files = { ...E.content.files, todo: { ...E.content.files.todo, items: [] }, sections: { ...E.content.files.sections, sections: E.content.files.sections.sections.map(x => x.id === 'todo' ? { ...x, status: 'soon' } : x) } };
    const o = await open(browser, { ...E, draft: null, content: { ...E.content, files } }, w, h); watch(o.p, `find more ${w}`);
    await o.ctx.route(u => u.pathname.startsWith('/rest/v1/guide_jobs'), r => json(r, [{ id: 'job-walk-find-' + w, status: 'done', message: '2 things to do found', created_at: new Date().toISOString(), result: { items: FOUND } }]));
    await o.ctx.route(u => u.pathname.startsWith('/rest/v1/guides'), r => r.request().method() !== 'PATCH' ? r.fallback() : r.fulfill({ status: 204, body: '' }));
    await o.ctx.route(u => u.pathname === '/api/places', r => json(r, { ok: false }));
    await o.p.goto('http://editor.test/?step=todo'); await ready(o.p); await o.p.waitForSelector('.cm-fcard', { timeout: 8000 }).catch(() => {});
    await o.p.evaluate(() => { const c = document.querySelector('.cm-find'); if (c) window.scrollBy(0, c.getBoundingClientRect().top - 90); }); await o.p.waitForTimeout(200);
    await shot(o.p, w, [5, 71], 'editor', 'find-more-cards', 'Attractions: Find more with 2 suggestions back, the first card (Add or Not for us)', { keep: true });
    await o.ctx.close();
  }
  // ---- The signed-out page outside the journey (not in index.txt): the first page in French at both sizes
  // (fr-first-page-*.png), the first page and Log in on wide windows (wide-first-page-*, wide-log-in-*) ----
  const signedOutCtx = async (w, h, lang) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    if (lang) await ctx.addInitScript(l => { try { localStorage.setItem('porta-lang-v1', l); } catch (e) {} }, lang);
    await ctx.route('**/*', route => { const u = new URL(route.request().url());
      if (u.host === 'editor.test') return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
      if (u.origin === SB && u.pathname === '/auth/v1/settings') return json(route, { external: { google: true, email: true } });
      if (u.origin === SB) return json(route, []);
      return route.continue(); });
    const p = await ctx.newPage(); watch(p, `signed out ${lang || 'en'} ${w}`);
    await p.goto('http://editor.test/'); await p.waitForSelector('#acct .ac-card', { timeout: 15000 }).catch(() => {}); await settle(p);
    await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });   // as first seen on a phone: no field picked yet
    return { ctx, p };
  };
  for (const [w, h] of SIZES) {
    const { ctx, p } = await signedOutCtx(w, h, 'fr');
    await p.screenshot({ path: join(DIR, `fr-first-page-${w}.png`) }); await fullShot(p, join(DIR, `fr-first-page-${w}-full.png`));
    await ctx.close();
  }
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    const { ctx, p } = await signedOutCtx(w, h);
    await p.screenshot({ path: join(DIR, `wide-first-page-${w}.png`) });
    await p.click('#acct .ac-top [data-m="login"]'); await settle(p);
    await p.screenshot({ path: join(DIR, `wide-log-in-${w}.png`) });
    await ctx.close();
  }
  // ---- Wide windows: one builder step, one editor step, the ready screen, at 1440 x 900 and 1920 x 1080 (wide-*.png, not in index.txt) ----
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    { const { ctx, p } = await open(browser, B, w, h); watch(p, `wide builder ${w}`);
      await p.goto('http://editor.test/'); await ready(p); await go(p, '#place'); await settle(p); await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: join(DIR, `wide-builder-place-${w}.png`) }); await ctx.close(); }
    { const { ctx, p } = await open(browser, E, w, h); watch(p, `wide editor ${w}`);
      await ctx.route(u => u.pathname === '/api/places', r => json(r, { ok: false }));
      await p.goto('http://editor.test/'); await ready(p); await go(p, '#housepage'); await settle(p); await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: join(DIR, `wide-editor-housepage-${w}.png`) }); await ctx.close(); }
    { const { ctx, p } = await readyCtx(w, h, []); watch(p, `wide ready ${w}`);
      await p.goto('http://editor.test/#building'); await p.waitForSelector('#bstate .go-next', { timeout: 15000 }).catch(() => {}); await settle(p);
      await p.screenshot({ path: join(DIR, `wide-ready-${w}.png`) }); await ctx.close(); }
  }
  skipped.push('dialog-language-menu at both widths: the language picker is a native <select> (.lpick); its open list is drawn by the system and Playwright cannot picture it');

  // ---- Names: NN from the order, the journey alphabetical ----
  const keys = [...new Map(shots.slice().sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1]).map(s => [s.base, s.order])).keys()];
  const nn = new Map(keys.map((k, i) => [k, String(i + 1).padStart(2, '0')]));
  const lines = [];
  for (const s of shots.slice().sort((a, b) => nn.get(a.base).localeCompare(nn.get(b.base)) || b.w - a.w || a.full - b.full)) {
    const f = `${nn.get(s.base)}-${s.base}-${s.w}${s.full ? '-full' : ''}.png`; renameSync(s.tmp, join(DIR, f)); lines.push(`${f} : ${s.what}, ${s.w} px`); }
  rmSync(TMP, { recursive: true, force: true });
  writeFileSync(join(DIR, 'index.txt'), lines.join('\n') + '\n' + (skipped.length ? '\nNot pictured:\n' + skipped.map(x => '- ' + x).join('\n') + '\n' : ''));

  // ---- measures.txt ----
  const out = ['Measures at 1280 x 860 (page DOM; the phone preview iframe is not included). First what comes back on several screens, then screen by screen.', ''];
  const CAT = [['ellipsis', '(a) text cut with an ellipsis'], ['narrowInputs', '(b) text inputs under 320 px in a column over 600 px'], ['orphans', '(c) one word alone on the last line'], ['longLines', '(e) lines over 95 characters'], ['smallButtons', '(f) buttons under 44 px tall or wide']];
  out.push('==== Summary: each finding once, with the screens (NN) it is on');
  for (const [cat, title] of CAT) { const where = new Map();
    for (const k of keys) { const r = measures.get(k); if (!r || r.m.error) continue; for (const x of r.m[cat]) { if (!where.has(x)) where.set(x, []); if (!where.get(x).includes(nn.get(k))) where.get(x).push(nn.get(k)); } }
    out.push(`  ${title}: ${where.size ? where.size + ' distinct' : 'none'}`);
    for (const [x, at] of [...where.entries()].sort((a, b) => b[1].length - a[1].length)) out.push(`      - [${at.length} screen${at.length > 1 ? 's' : ''}: ${at.length > 8 ? at.slice(0, 8).join(', ') + ', ...' : at.join(', ')}] ${x}`); }
  out.push('');
  for (const k of keys) { const r = measures.get(k); if (!r) continue; const m = r.m;
    out.push(`== ${nn.get(k)}-${k} : ${r.what}`);
    if (m.error) { out.push('  measure failed: ' + m.error, ''); continue; }
    const c = m.column;
    out.push(`  (d) main column: ${c ? `${c.sel}, x ${c.left} to ${c.right}, ${c.width} px wide` + (c.rail ? `; step list ${c.rail.left} to ${c.rail.right} (${c.rail.width} px), gap to column ${c.rail.gap} px` : '') + (c.phone ? `; phone ${c.phone.left} to ${c.phone.right} (${c.phone.width} px), gap column to phone ${c.phone.gap} px` : '; no phone beside it') + `; empty page margin left ${c.emptyLeft} px, right ${c.emptyRight} px` : 'not found'}`);
    out.push(`  (a) text cut with an ellipsis: ${m.ellipsis.length ? '' : 'none'}`); m.ellipsis.forEach(x => out.push(`      - ${x}`));
    out.push(`  (b) text inputs under 320 px in a column over 600 px: ${m.narrowInputs.length ? '' : 'none'}`); m.narrowInputs.forEach(x => out.push(`      - ${x}`));
    out.push(`  (c) orphans (one word alone on the last line, text under 200 characters): ${m.orphans.length ? '' : 'none'}`); m.orphans.forEach(x => out.push(`      - ${x}`));
    out.push(`  (e) lines of text over 95 characters: ${m.longLines.length ? '' : 'none'}`); m.longLines.forEach(x => out.push(`      - ${x}`));
    out.push(`  (f) buttons under 44 px tall or wide: ${m.smallButtons.length ? '' : 'none'}`); m.smallButtons.forEach(x => out.push(`      - ${x}`));
    out.push(''); }
  if (errorsSeen.length) out.push('Page errors seen during the walk:', ...[...new Set(errorsSeen)].map(x => '- ' + x), '');
  writeFileSync(join(DIR, 'measures.txt'), out.join('\n'));
  console.log(`Walk: ${shots.length} pictures of ${keys.length} screens in ${DIR} (index.txt, measures.txt).${skipped.length ? ` ${skipped.length} not pictured, listed in index.txt.` : ''}${errorsSeen.length ? ` ${errorsSeen.length} page errors, in measures.txt.` : ''}`);
}

// Runs in the page: the six measures of the review.
function MEASURE() {
  const W = innerWidth;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= W) return false;
    if (e.checkVisibility && !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (+s.opacity === 0 || s.display === 'none' || s.visibility === 'hidden') return false; }
    return !e.closest('[hidden], .sr, [aria-hidden="true"]'); };
  const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const where = e => { const c = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + c; };
  const short = (s, n = 70) => s.length > n ? s.slice(0, n - 3) + '...' : s;
  const R = e => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }; };
  const inlineOnly = e => [...e.children].every(ch => /^inline/.test(getComputedStyle(ch).display) || getComputedStyle(ch).display === 'none');
  const out = { ellipsis: [], narrowInputs: [], orphans: [], longLines: [], smallButtons: [], column: null };
  // (d) the main column: from the first visible h1 (else h2) outside the top bar, up to the widest box still narrower than the window
  const head = [...document.querySelectorAll('h1, h2')].find(e => vis(e) && !e.closest('header.top, #acctbar, .side-phone, .sheet'));
  let col = null;
  // stops below any box that also holds the step list (.rail) or the phone, so the column is the step's own
  const ph = [...document.querySelectorAll('.side-phone, .phone, #phoneFrame')].find(vis), rail = [...document.querySelectorAll('.rail')].find(vis);
  const others = [ph, rail].filter(Boolean);
  if (head) { col = head; while (col.parentElement && col.parentElement !== document.body && col.parentElement.getBoundingClientRect().width < W - 2 && !others.some(o => col.parentElement.contains(o) && !col.contains(o))) col = col.parentElement; }
  if (col) { const r = R(col), pr = ph ? R(ph) : null, rr = rail ? R(rail) : null;
    const leftmost = Math.min(r.left, rr ? rr.left : W), rightmost = Math.max(r.right, pr ? pr.right : 0);
    out.column = { sel: where(col), ...r, rail: rr ? { ...rr, gap: r.left - rr.right } : null, phone: pr ? { ...pr, gap: pr.left - r.right } : null, emptyLeft: leftmost, emptyRight: W - rightmost }; }
  const all = [...document.querySelectorAll('body *')].filter(e => !e.closest('svg, .side-phone, iframe'));
  // (a)
  for (const e of all) { const s = getComputedStyle(e); if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && vis(e)) out.ellipsis.push(`${where(e)}: "${short(txt(e))}" (${e.scrollWidth} px of text in ${e.clientWidth} px)`); }
  // (b)
  if (out.column && out.column.width > 600) for (const e of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not([type=button]):not([type=submit]), textarea')) {
    if (!vis(e) || !col.contains(e)) continue; const r = R(e); if (r.width >= 320) continue;
    const lab = (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest('label'), name = (lab && txt(lab)) || e.getAttribute('aria-label') || e.placeholder || e.dataset.k || e.name || '';
    out.narrowInputs.push(`${where(e)}${e.dataset.k ? ' [data-k=' + e.dataset.k + ']' : ''}: ${r.width} px wide, "${short(name, 50)}"`); }
  // (c) one word alone on the last line
  for (const e of all) {
    if (!e.matches('p, .hint, small, li, figcaption, label, dd') || !vis(e) || !inlineOnly(e)) continue;
    const t = txt(e); if (t.length >= 200 || t.split(' ').length < 3) continue;
    const words = []; const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.parentElement && !vis(n.parentElement)) continue; const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const rc = rg.getClientRects()[0]; if (rc && rc.width > 0) words.push({ w: m[0], top: rc.top, h: rc.height }); } }
    if (words.length < 3) continue;
    const last = words[words.length - 1], onLast = words.filter(x => Math.abs(x.top - last.top) < last.h / 2);
    if (onLast.length === 1 && words.some(x => x.top < last.top - last.h / 2)) out.orphans.push(`${where(e)}: "${short(t, 90)}" (last line: "${last.w}")`);
  }
  // (e) lines over 95 characters
  const cv = document.createElement('canvas').getContext('2d');
  for (const e of all) {
    if (!e.matches('p, li, .hint, label, small, dd, blockquote, figcaption, td, div') || !vis(e) || !inlineOnly(e)) continue;
    const t = txt(e); if (t.length <= 95) continue;
    if (e.matches('div') && ![...e.childNodes].some(n => n.nodeType === 3 && n.data.trim().length > 40)) continue;
    const s = getComputedStyle(e); cv.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const avg = cv.measureText(t).width / t.length, wd = e.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    const perLine = Math.min(t.length, Math.round(wd / avg));
    if (perLine > 95) out.longLines.push(`${where(e)}: about ${perLine} characters a line (${Math.round(wd)} px wide, ${s.fontSize}), "${short(t, 60)}"`); }
  // (f) small buttons
  const groups = new Map();   // same kind and size: one line, with how many and an example
  for (const e of document.querySelectorAll('button, a.btn, .btn, [role=button], summary, a.nb, a.si, select, input[type=submit], input[type=button]')) {
    if (!vis(e) || e.closest('.side-phone, svg')) continue; const r = R(e); if (r.height >= 44 && r.width >= 44) continue;
    const label = short(txt(e) || e.getAttribute('aria-label') || e.title || '(no text)', 40), key = `${where(e)}|${r.width}x${r.height}`;
    const g = groups.get(key) || { n: 0, sel: where(e), size: `${r.width} x ${r.height} px`, labels: [] }; g.n++; if (g.labels.length < 2) g.labels.push(label); groups.set(key, g); }
  for (const g of groups.values()) out.smallButtons.push(`${g.sel}${g.n > 1 ? ' x' + g.n : ''} "${g.labels.join('", "')}"${g.n > 2 ? ', ...' : ''}: ${g.size}`);
  return out;
}
