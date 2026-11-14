// The measures of the UX check (docs/UX-GUIDELINES.md), run in the page by engine/scripts/ux-check.mjs on every page it
// opens and by engine/scripts/frame-check.mjs on Home in each arrangement of the module frame. Self-contained (it runs in
// the browser through page.evaluate): returns a list of plain faults, empty when all is right.
export function measure() {
  const out = [], hit = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
  // The floating back and language buttons never sit on the page's own text or icons before any scroll (a photo,
  // like Home's cover, may lie under them: only icon-sized images count).
  scrollTo(0, 0);
  const shown = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const btns = [...document.querySelectorAll('.hero .back, .hero .langsel')].filter(shown), V = document.getElementById('view');
  if (btns.length && V) {
    const things = [];
    V.querySelectorAll('svg, img, canvas, .qi').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && Math.min(r.width, r.height) <= 96 && shown(e)) things.push(['an icon (' + (e.className.baseVal ?? e.className ?? e.tagName) + ')', r]); });
    const tv = document.createTreeWalker(V, NodeFilter.SHOW_TEXT);
    for (let t; (t = tv.nextNode());) { if (!t.textContent.trim() || !shown(t.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(t); for (const x of rg.getClientRects()) things.push([`"${t.textContent.trim().slice(0, 24)}"`, x]); }
    for (const e of btns) { const B = e.getBoundingClientRect(), h = things.find(([, r]) => hit(B, r)); if (h) out.push(`the floating ${e.classList.contains('back') ? 'back' : 'language'} button sits on ${h[0]}`); }
  }
  for (const g of document.querySelectorAll('.gt')) {
    const T = g.getBoundingClientRect(), content = [];
    g.querySelectorAll('.ib,.go,.gt-bins,.gtb,.gt-tl,.soon-tag').forEach(e => content.push([e.className, e.getBoundingClientRect()]));
    g.querySelectorAll('.gt-t,.gt-m').forEach(e => { const r = document.createRange(); r.selectNodeContents(e); for (const x of r.getClientRects()) content.push([e.className, x]); });
    for (const ps of ['::before', '::after']) {
      const s = getComputedStyle(g, ps); if (s.content === 'none' || s.display === 'none') continue;
      const n = v => parseFloat(v) || 0;
      let w = Math.max(n(s.width), n(s.borderLeftWidth) + n(s.borderRightWidth)), h = Math.max(n(s.height), n(s.borderTopWidth) + n(s.borderBottomWidth));
      if (!w || !h) continue;
      // Tilted: use the bounding square. A circle (Nightlife's crescent) takes the same room at any angle (14 Nov 2026).
      const round = w === h && s.borderRadius === '50%';
      const m = /matrix\(([^,]+), ([^,]+)/.exec(s.transform); if (!round && m && Math.abs(parseFloat(m[2])) > 0.01 && Math.abs(parseFloat(m[1])) > 0.01) { const d = Math.hypot(w, h); w = h = d; }
      const left = s.left !== 'auto' ? T.left + n(s.left) : T.right - n(s.right) - w, top = s.top !== 'auto' ? T.top + n(s.top) : T.bottom - n(s.bottom) - h;
      const R = { left: Math.max(left, T.left), top: Math.max(top, T.top), right: Math.min(left + w, T.right), bottom: Math.min(top + h, T.bottom) };
      if (R.right <= R.left || R.bottom <= R.top) continue;
      for (const [c, r] of content) if (hit(R, r)) out.push(`${g.dataset.k}${ps} touches ${c}`);
    }
  }
  // List rows: the name and its lines (type, distance, price) never run under the status on the right ("Rouvre à 20:00").
  for (const r of document.querySelectorAll('.mrow > summary')) {
    const st = r.querySelector('.rt .st'), nm = r.querySelector('.nm'); if (!st || !nm || !st.offsetParent) continue;
    const S = st.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(nm);
    if ([...rg.getClientRects()].some(x => hit(S, x))) out.push(`row "${nm.textContent.trim().slice(0, 30)}": its name or details run under its status`);
  }
  // No word may break mid-word anywhere on the page: a word wider than its block means the label is too long
  // (shorten it, or put a soft hyphen in a long compound). Soft-hyphen parts are measured separately.
  const probe = document.createElement('span'); probe.style.cssText = 'white-space:nowrap;position:absolute;visibility:hidden;left:0;top:0'; document.body.append(probe);
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = tw.nextNode());) {
    if (!t.textContent.trim() || !t.parentElement.offsetParent) continue;
    let blk = t.parentElement; while (blk && getComputedStyle(blk).display.startsWith('inline')) blk = blk.parentElement;
    const bs = getComputedStyle(blk), ps = getComputedStyle(t.parentElement);
    if (bs.whiteSpace.includes('nowrap') || /auto|scroll|hidden/.test(bs.overflowX)) continue;
    const avail = blk.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    probe.style.font = ps.font; probe.style.letterSpacing = ps.letterSpacing; probe.style.textTransform = ps.textTransform;
    for (const word of t.textContent.trim().split(/[\s\u00ad/-]+/)) { if (!word) continue; probe.textContent = word; if (probe.getBoundingClientRect().width > avail + 0.5) out.push(`"${word}" is wider than its line (${blk.className || blk.tagName})`); }
  }
  probe.remove();
  if (document.documentElement.scrollWidth > innerWidth) out.push('page wider than the screen');
  return out;
}
