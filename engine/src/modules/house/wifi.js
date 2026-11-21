// The Wi-Fi sheet, opened from the welcome card on Home (README.md "Its look"). Its values come from the guide's private
// file, never from git (README.md, "The rules"), read by content.js into HOUSE.wifi.
import qrcode from 'qrcode-generator';
import { t, tx } from '../../i18n.js';
import { HOUSE } from '../../content.js';
import { esc } from '../../ui.js';
import { wifiPayload, netLabel, qrCaption } from './plan.js';

// The Wi-Fi QR code, always made here from the name and the password (one rule: plan.js wifiPayload; a code a guide's
// data still carries is not read). A real picture, not a drawing, so that a phone can read it on its own screen where
// it knows how (a long press on a picture).
function wifiQr(ssid, pw) {
  const c = qrcode(0, 'M'); c.addData(wifiPayload(ssid, pw)); c.make();
  const cell = 8, side = (c.getModuleCount() + 4) * cell;
  return `<img src="${c.createDataURL(cell, 2 * cell)}" width="${side}" height="${side}" alt="QR: ${esc(ssid)}">`;
}
// Wifi sheet: network name, password with a copy button, and a QR code for a second device. One network: singular
// labels, no generic "Wi-Fi" label, one larger QR code in the middle with the network's name under it.
export function wifiSheet() {
  const w = HOUSE.wifi, one = w.networks.length === 1, label = n => netLabel(one, tx(n.label));
  const o = document.createElement('div');
  o.className = 'wsheet';
  o.innerHTML = `<div class="ws-card" role="dialog" aria-modal="true">
    <div class="ws-hd"><h3>${esc(t('qWifi'))}</h3><button type="button" class="ws-x" aria-label="${esc(t('close'))}">×</button></div>
    <div class="ws-f"><small>${esc(t(one ? 'wifiNet' : 'wifiNets'))}</small>${w.networks.map(n => `<b>${esc(n.ssid)}</b>${label(n) ? `<span class="ws-l">${esc(label(n))}</span>` : ''}`).join('')}</div>
    <div class="ws-f ws-pwrow"><span><small>${esc(t(w.networks.length === 2 ? 'wifiPwBoth' : 'wifiPw'))}</small><b class="ws-pw">${esc(w.password)}</b></span><button type="button" class="btn primary ws-copy">${esc(t('copyShort'))}</button></div>
    <p class="ws-how${one ? ' one' : ''}">${esc(t('wifiScan'))}</p><div class="ws-qrs${one ? ' one' : ''}">${w.networks.map(n => `<figure>${wifiQr(n.ssid, w.password)}<figcaption>${esc(qrCaption(one, n.ssid, tx(n.label)))}</figcaption></figure>`).join('')}</div>
  </div>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
  const close = () => { o.remove(); document.body.style.overflow = ''; removeEventListener('hashchange', close); };
  o.querySelector('.ws-x').onclick = close;
  o.addEventListener('click', e => { if (e.target === o) close(); });
  addEventListener('hashchange', close);
  const cb = o.querySelector('.ws-copy');
  cb.onclick = async () => {
    try { await navigator.clipboard.writeText(w.password); }
    catch { const r = document.createRange(); r.selectNodeContents(o.querySelector('.ws-pw')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
    cb.textContent = t('copied'); setTimeout(() => { cb.textContent = t('copyShort'); }, 2000);
  };
}
