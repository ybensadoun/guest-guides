// The house module's rules, with no guide in them (README.md says each rule, who decided it and when): the facts shown
// first among what the place offers, the short line of the slim bar, the reviews shown, how far the slim bar has come in,
// and the Wi-Fi as a QR code reads it. Pure, no imports (tests: engine/scripts/house-plan.test.mjs).

// What the place offers, shown first: the host's most asked for that are still in the list (amenTop), then the rest, the
// first amenFirst of them; with no amenFirst (Ca La Kimberly's page, written by hand), eight known by their English name.
// tx: the guide's reader of a text in six languages. Returns { all, key }: every item in its groups' order, and those shown.
export function keyAmenities(h, tx) {
  const all = h.amenities.flatMap(g => g.items), top = (h.amenTop || []).map(t => all.find(i => tx(i) === tx(t))).filter(Boolean);   // the most asked for first, as long as the host kept them
  const key = h.amenFirst ? [...top, ...all.filter(i => !top.includes(i))].slice(0, h.amenFirst) : ['Private pool', 'Air conditioning', 'Wifi', 'Dedicated workspace', 'Smart TVs', 'Fully equipped kitchen', 'Charcoal', 'Washing machine'].map(k => all.find(i => i.en.startsWith(k))).filter(Boolean);
  return { all, key };
}

// The slim bar's line: of the summary's parts ("Entire villa · 10 guests · 5 bedrooms · 7 beds · 4 baths"), the second, the
// third and the last.
export const shortSummary = s => (x => [x[1], x[2], x[x.length - 1]].filter(Boolean).join(' · '))(s.split(' · '));
// A fact whose words are long (one longer than 14 letters) takes the whole row.
export const longWords = s => s.split(/\s+/).some(w => w.length > 14);

// The reviews quoted: those with a text, newest first, at most three.
export const latestQuotes = quotes => (quotes || []).filter(q => q.text).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3);

// The slim bar comes in over the 90 px in which the facts line scrolls under it: 0 while the line's bottom is at 150 px
// from the top or lower, 1 from 60 px up. y: the line's bottom, in px from the top of the window.
export const barK = y => Math.min(1, Math.max(0, (150 - y) / 90));

// The Wi-Fi as a QR code says it (WPA), with \ ; , : and " escaped.
export function wifiPayload(ssid, pw) {
  const q = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:WPA;S:${q(ssid)};P:${q(pw)};;`;
}
// The Wi-Fi a guide shows: the password and the networks that have a name; none (no fact on Home, no sheet) without a
// password or without a named network, so a host who began typing never gives guests an empty sheet.
export function wifiShown(w) {
  const nets = ((w && w.networks) || []).filter(n => n && String(n.ssid || '').trim());
  return w && String(w.password || '').trim() && nets.length ? { ...w, networks: nets } : null;
}
// A network's label on the Wi-Fi sheet: none when there is one network and its label only says "Wi-Fi".
export const netLabel = (one, s) => (one && /^\s*wi-?fi\s*$/i.test(s || '') ? '' : s);
