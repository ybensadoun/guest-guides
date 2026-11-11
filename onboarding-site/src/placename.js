// Does what the host typed to find a place name it? (Fault found 11 Nov 2026: "La Locanda dei Sapori El Vendrell" became the
// restaurant's name, town included, and "restaurant La Bisbal del Penedès", picked as Restaurant la Societat, its name.)
// The builder's rows (psPick in start.js) and the editor's "Find it on Google" (cmFindById in editor.js) both ask here, in the
// browser's memory, with the suggestion Google gave for this session ({ name, where }: its name and its address or town).
// Nothing of Google's is returned: only the host's own words, a part of them, in their own spelling and capitals, or ''.
// The rule, in plain words:
//   1. The typed words name the place when at least one word of the place's own name (not "restaurant", "bar", "the"...) is
//      typed in full (accents and capitals aside, one letter off allowed in a longer word: a typo, not a word half typed).
//      Those words being only the town's or the street's ("restaurant vendrell" for Restaurant El Vendrell Platja, in El
//      Vendrell), they name it only if they are the whole of its name ("Bar El Vendrell" stays: the town is the name).
//   2. What is kept: from the first to the last word of the name typed, as typed, widened to the words around them up to the
//      first word of the town or the street (a misspelt word of the name stays, our directory's spelling comes later); the
//      town or street is dropped, with a small word left at the end ("El" of "El Vendrell").
//   3. Otherwise '': a search phrase, a few letters, another place. The caller then asks the host for the name.
// Pasted into the maker by build.py (the export words taken out); tested in worker/test/place-name.test.mjs.
export const PN_SMALL = new Set('a al als d da das de dei del della dels des di do dos du el els en i l la las le les lo los o of sa ses the y'.split(' '));
export const PN_GENERIC = new Set(('restaurant restaurants restaurante restaurantes ristorante trattoria osteria bar bars cafe cafes cafeteria pizzeria brasserie bistro bistrot '
  + 'bodega bodegas celler cellers cava caves winery vineyard vins vinos wine hotel hostal taverna tasca xiringuito chiringuito pub club grill braseria marisqueria '
  + 'arroceria pastisseria pasteleria forn bakery panaderia heladeria gelateria cocktail beach platja playa plage parc parque park museu museo museum musee '
  + 'castell castillo castle chateau church esglesia iglesia ermita monestir monasterio shop botiga tienda').split(' '));
const pnFold = w => String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// The words of a text with where each one starts and ends (so the host's own spelling is kept): "L'Arboç", "Vila-rodona" are one word.
const pnWords = s => [...String(s || '').matchAll(/[\p{L}\p{N}]+(?:['’·.\-][\p{L}\p{N}]+)*/gu)].map(m => ({ w: pnFold(m[0]), a: m.index, b: m.index + m[0].length })).filter(x => x.w);
// The same word: equal; or one letter added, dropped or changed in a word of four letters or more, two in a word of eight or
// more ("Codorniu", "Sadurni"). A word half typed ("loc" for "locanda") is not the word.
function pnSame(a, b) {
  if (a === b) return true;
  const n = Math.max(a.length, b.length), most = n >= 8 ? 2 : n >= 4 ? 1 : 0;
  if (!most || Math.abs(a.length - b.length) > most) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[b.length] <= most;
}
export function placeNameFrom(typed, sug) {
  const t = String(typed || '').trim(), s = sug || {};
  if (!t || !String(s.name || '').trim()) return '';
  const T = pnWords(t), N = pnWords(s.name).map(x => x.w), W = pnWords(s.where).map(x => x.w);
  const sig = w => !PN_SMALL.has(w) && !PN_GENERIC.has(w);
  const inN = w => N.some(n => pnSame(w, n)), inW = w => W.some(n => pnSame(w, n));
  const sigN = N.filter(sig), hits = T.map((x, i) => sig(x.w) && sigN.some(n => pnSame(x.w, n)) ? i : -1).filter(i => i >= 0);
  if (!hits.length) return '';
  // Only the town's or the street's words typed, and not the whole of the name: a search near a town, not the place's name.
  const covered = sigN.filter(n => hits.some(i => pnSame(T[i].w, n))).length;
  if (hits.every(i => inW(T[i].w)) && covered < sigN.length) return '';
  // Widened over the host's words up to the town or the street (a word of the address that is not one of the name's).
  const stop = w => inW(w) && !inN(w);
  let a = hits[0], b = hits[hits.length - 1];
  while (a > 0 && !stop(T[a - 1].w)) a--;
  while (b < T.length - 1 && !stop(T[b + 1].w)) b++;
  while (b > a && PN_SMALL.has(T[b].w)) b--;                  // "Locanda El" of "Locanda El Vendrell": the article went with its town
  while (a < b && PN_SMALL.has(T[a].w) && !inN(T[a].w)) a++;  // "de Locanda" of "Vendrell de Locanda"
  return t.slice(T[a].a, T[b].b).trim();
}
