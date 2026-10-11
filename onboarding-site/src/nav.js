/* ---------- Navigation between steps ----------
   Desktop: a rail with every step and its status, always visible next to the page.
   Phone: a bottom bar with Back, "3 of 15" (opens the full list) and Done / Next.
   The browser back button works too: every step has its own address (#look, #wifi…). */
const STATUS_ICON = { pre: '<i class="pre" aria-hidden="true"></i>', done: CHECK, chk: '<i class="half" aria-hidden="true"></i>', new: '<i class="ring" aria-hidden="true"></i>' };
const stepsOrder = () => [...visible().map(m => m.id), 'send'];
const titleOf = id => id === 'send' ? 'Review and send' : (MODULES.find(m => m.id === id) || {}).title;
function stepListHTML(cur){
  const mods = visible();
  const item = (m) => { const s = statusOf(m); return `<a class="si s-${s.k}" href="#${m.id}"${m.id === cur ? ' aria-current="step"' : ''} style="--tc:${m.tc}"><span class="sic">${STATUS_ICON[s.k]}</span><span class="st">${esc(m.title)}</span><span class="sl">${esc(s.k === 'done' ? 'Done' : s.k === 'chk' || s.k === 'pre' ? s.label : '')}</span></a>`; };
  const miss = sendMissing().length;
  return `<a class="si home" href="#home"${cur === 'home' ? ' aria-current="step"' : ''}><span class="sic">${I.grid}</span><span class="st">Overview</span></a>
    ${GROUPS.map(([g, gt]) => { const ms = mods.filter(m => m.group === g); return ms.length ? `<p class="sg">${gt}</p>${ms.map(item).join('')}` : ''; }).join('')}
    <p class="sg">Finish</p><a class="si s-${miss ? 'new' : 'done'} send" href="#send"${cur === 'send' ? ' aria-current="step"' : ''}><span class="sic">${I.send}</span><span class="st">Review and send</span><span class="sl">${miss ? miss + ' left' : 'Ready'}</span></a>`;
}
function railHTML(cur){ return `<aside class="rail" aria-label="All steps"><nav>${stepListHTML(cur)}</nav></aside>`; }
function navbarHTML(cur){
  const order = stepsOrder(), i = order.indexOf(cur), prev = order[i - 1], next = order[i + 1];
  const m = MODULES.find(x => x.id === cur);
  let main = '';
  if (m) {
    const s = statusOf(m), miss = missingOf(m).length;
    if (s.k === 'done') main = next ? `<a class="nb primary" href="#${next}"><span>Next</span>${ARROW}</a>` : '';
    else if (!miss) main = `<button class="nb primary" type="button" data-donenext="${m.id}"><span>${s.k === 'pre' ? 'Looks right' : 'Done'}${next ? ', next' : ''}</span>${next ? ARROW : CHECK}</button>`;
    else main = next ? `<a class="nb" href="#${next}"><span>Skip for now</span>${ARROW}</a>` : '';
  }
  return `<div class="nbin">
    ${prev ? `<a class="nb ghost" href="#${prev}" aria-label="Back to ${esc(titleOf(prev))}">${BACK}<span class="hide-s">${esc(titleOf(prev))}</span></a>` : `<a class="nb ghost" href="#home" aria-label="Overview">${BACK}<span class="hide-s">Overview</span></a>`}
    <button class="nb count" type="button" id="openSteps" aria-haspopup="dialog"><b>${i + 1}</b> of ${order.length}<i class="chev" aria-hidden="true"></i></button>
    ${main || '<span></span>'}</div>`;
}
function refreshNav(){
  const r = route(), nb = document.getElementById('navbar'); if (nb) nb.innerHTML = navbarHTML(r);
  const rail = document.querySelector('.rail nav'); if (rail) { const keep = rail.parentElement.scrollTop; rail.innerHTML = stepListHTML(r); rail.parentElement.scrollTop = keep; fixRail(); }
}
function openSteps(){
  const o = document.createElement('div'); o.className = 'sheet';
  o.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true" aria-label="All steps"><div class="sheet-h"><b>All steps</b><button type="button" class="sheet-x" aria-label="Close">×</button></div><nav>${stepListHTML(route())}</nav></div>`;
  document.body.appendChild(o); document.body.style.overflow = 'hidden';
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.addEventListener('click', e => { if (e.target === o || e.target.closest('.sheet-x') || e.target.closest('a')) close(); });
  addEventListener('hashchange', close);
  const c = o.querySelector('[aria-current]'); if (c) c.scrollIntoView({ block: 'center' });
}
function moduleHTML(m){
  const s = statusOf(m), miss = missingOf(m);
  return `<div class="split">${railHTML(m.id)}<div class="col">
    <section class="mhead" style="${tileVars(m)}">
      <div class="row1"><span class="pill ${s.k}">${s.k === 'done' ? CHECK : ''}${esc(s.label)}</span></div>
      <h1>${esc(m.title)}</h1><p>${esc(m.lead)}</p></section>
    <section class="card"><div class="grid">${m.fields.map(field).join('')}</div>
      <div class="foot">
        <p class="todo">${miss.length ? `Still needed for Done: <b>${miss.map(k => esc(NAME(k))).join(', ')}</b>` : s.k === 'done' ? 'This step is done. You can still change anything.' : 'Everything needed is here. Press Done when you are happy with it.'}</p>
        ${s.k === 'done' ? `<div class="row"><button class="btn small" type="button" data-undone="${m.id}">Mark as not done</button></div>` : ''}
      </div></section>
    <section class="card" style="padding-block:16px">${noteBox(m.id)}</section></div></div>`;
}
function sendHTML(){
  const mods = visible(), miss = sendMissing();
  return `<div class="split">${railHTML('send')}<div class="col">
    <section class="mhead" style="--tc:var(--ink);--ti:var(--paper);--sh:var(--sun)">
      <h1>Review and send</h1><p>We build your guide from your answers and email you a link to try it. Every round of changes is included.</p></section>
    <section class="card">
      <div class="sum">${mods.map(m => { const s = statusOf(m); return `<a href="#${m.id}" style="--tc:${m.tc}"><span class="sw"></span><span><b>${esc(m.title)}</b><p>${esc(summary(m))}</p></span><span class="pill ${s.k}" style="position:static">${s.k === 'done' ? CHECK : ''}${esc(s.label)}</span></a>`; }).join('')}</div>
      <div class="grid">${field('email')}${field('notes')}
        <div class="survey full"><h2>Five quick questions about this form</h2><div class="grid">${['sMinutes','sMissing','sIdeal','sUseNow','sPay'].map(field).join('')}</div></div>
        <label class="f full" style="flex-direction:row;gap:10px;align-items:flex-start"><input type="checkbox" data-check="consent"${A.consent ? ' checked' : ''} style="width:20px;height:20px;margin-top:2px;flex:none"><span>I own these photos and texts or may use them, and I understand the guide is visible to anyone who has its link.</span></label></div>
      <div class="foot">${miss.length ? `<p class="todo">Before sending: <b>${miss.map(esc).join(', ')}</b></p>` : '<p class="todo"></p>'}
        <p id="sendState"></p>
        <div class="row"><button class="btn" type="button" id="openPreview">${I.eye.replace('stroke-width="2.2"','stroke-width="2.2" width="17" height="17"')}Preview my guide</button><button class="btn primary" type="button" id="send"${miss.length ? ' disabled' : ''}>${I.send.replace('stroke-width="2.2"','stroke-width="2.2" width="17" height="17"')}Send to build my guide</button></div></div>
    </section><div class="resetrow"><button class="btn small" type="button" id="resetAll">Start over</button><p>Erases everything on this device and begins again from the first step. Anything you already sent to us stays with us.</p></div></div></div>`;
}

// Keep the current step visible in the left list, whatever re-drew it.
function fixRail(){
  const rail = document.querySelector('.rail'), cur = rail && rail.querySelector('[aria-current]'); if (!cur) return;
  const rr = rail.getBoundingClientRect(), cr = cur.getBoundingClientRect();
  if (cr.top < rr.top + 8 || cr.bottom > rr.bottom - 8) rail.scrollTop += (cr.top - rr.top) - (rail.clientHeight - cur.clientHeight) / 2;
}
