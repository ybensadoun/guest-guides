// The highlights on Home and on a list: the white card of one place with its icon, its name, its line and its live status
// (README.md, "Its look"). Home hands over the card's id and its size (the frame, ../README.md); Getting around's card is
// one of them when transport.json has a "tile" (content.js QUICK), drawn the same way.
import { tx } from '../../i18n.js';
import { esc } from '../../ui.js';
import { slots } from '../../content.js';
import { QUICK, quickShown } from './data.js';
import { statusOf } from './plan.js';
import { icon } from './icons.js';

// Live status on the cards that have opening hours (the bar next door, the pizzeria), or a season of ours and no hours:
// then only "Closed · Opens 1 Jun" out of season, as on its page and in the lists (plan.js statusOf).
function status(q) {
  const s = statusOf(q, slots, new Date());
  return s ? `<span class="qst ${s.cls}">${esc(s.text)}${s.sub ? `<small> · ${esc(s.sub)}</small>` : ''}</span>` : '';
}

// A highlight on Home: the card of one place, half or wide (s-half, s-wide; "wide" too, which older rules read). It opens
// the card's own page (#p/<id>), or Getting around's (its "href").
export function card(id, size) {
  const q = QUICK.find(x => x.id === id);
  return `<a class="qcall${size === 'wide' ? ' wide' : ''} s-${size}" data-q="${q.id}" href="${q.href || '#p/' + q.id}">
  <span class="qi">${icon(q)}</span><span class="qt"><b>${esc(tx(q.name))}</b>${q.sub ? `<small>${esc(tx(q.sub))}</small>` : ''}${status(q)}</span></a>`;
}

// A highlight a list shows on top of its page ("highlight" in sections.json, e.g. the bar next door on Eat and drink): the
// wide card with no status, left out with its season as on Home; '' when the section names none.
export function pageCard(id) {
  const hq = id && QUICK.find(q => q.id === id && quickShown(q));
  return hq ? `<div class="qcalls"><a class="qcall wide" data-q="${hq.id}" href="#p/${hq.id}"><span class="qi">${icon(hq)}</span><span class="qt"><b>${esc(tx(hq.name))}</b>${hq.sub ? `<small>${esc(tx(hq.sub))}</small>` : ''}</span></a></div>` : '';
}

// The card's pin on a list's map, in green with its icon, when it has a position and is shown today (the shop next door on
// Eat and drink's map: README.md, "Still Ca La Kimberly's own").
export const mapPin = id => QUICK.filter(q => q.id === id && q.lat && quickShown(q)).map(q => ({ lat: q.lat, lng: q.lng, pinHtml: icon(id), pinColor: 'var(--green)' }));
