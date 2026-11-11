// licenses.txt, written into every build (each site's and the shared viewer's) from the packages' own licence files in
// node_modules, so the notices their licences ask for travel with the code and fonts we ship (docs/CREDITS.md). The guide's
// "Sources and credits" page links to it (engine/src/views/credits.js). One block per package: name, version, licence, text.
//   maplibre-gl (its LICENSE.txt carries Mapbox's notice) and every library it depends on, and theirs (they are bundled into
//   its files; type-only @types packages ship no code and are left out); qrcode-generator (no LICENSE file: the notice of its
//   source header, the MIT text it points to, the DENSO WAVE trademark line); Workbox (site builds only: the shared viewer
//   has its own service worker, onboarding-site/g-sw.js); Vite (its preload helper is in our bundle: its own MIT notice,
//   not the licences of the tools Vite itself bundles for the build); the @fontsource fonts (a site: the fonts it uses; the
//   shared viewer: every family installed, it can show any of them).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const NM = resolve(dirname(fileURLToPath(import.meta.url)), '../../node_modules');
// The Workbox modules the generated service worker holds. The build fails if it ever holds another one (see closeBundle).
const WORKBOX = ['workbox-core', 'workbox-routing', 'workbox-strategies', 'workbox-precaching', 'workbox-expiration'];

const pkgJson = dir => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
// A dependency's folder as Node finds it: the package's own node_modules first (a nested version), then the folders above.
function findPkg(name, from) {
  for (let d = from; d.startsWith(NM); d = dirname(d)) {
    const p = basename(d) === 'node_modules' ? join(d, name) : join(d, 'node_modules', name);
    if (existsSync(join(p, 'package.json'))) return p;
  }
  return null;
}
const licenceFile = dir => readdirSync(dir).find(f => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
const licenceName = p => typeof p.license === 'string' ? p.license : p.license && p.license.type ? p.license.type : Array.isArray(p.licenses) ? p.licenses.map(l => l.type).join(' OR ') : 'not stated';
const RULE = '='.repeat(72);
const block = (name, version, licence, text) => `${RULE}\n${name} ${version}\nLicence: ${licence}\n${RULE}\n\n${String(text).trim()}\n`;
function pkgBlock(dir, note = '') {
  const p = pkgJson(dir), f = licenceFile(dir);
  const text = f ? readFileSync(join(dir, f), 'utf8') : `The package ships no licence file. Its package.json states the licence above${p.author ? `; author: ${typeof p.author === 'string' ? p.author : p.author.name}` : ''}.`;
  return block(p.name, p.version, licenceName(p), (note ? note + '\n\n' : '') + text);
}

// maplibre-gl, then what it carries: its dependencies and theirs, each once.
function maplibreBlocks() {
  const root = join(NM, 'maplibre-gl'), out = [pkgBlock(root)], seen = new Set();
  const walk = dir => {
    for (const dep of Object.keys(pkgJson(dir).dependencies || {})) {
      if (dep.startsWith('@types/')) continue;
      const d = findPkg(dep, dir); if (!d) continue;
      const key = dep + '@' + pkgJson(d).version; if (seen.has(key)) continue;
      seen.add(key); out.push(pkgBlock(d, dir === root ? 'A library MapLibre GL JS is built with.' : `A dependency of ${pkgJson(dir).name}, in MapLibre GL JS.`)); walk(d);
    }
  };
  walk(root);
  return out;
}

function qrcodeBlock() {
  const dir = join(NM, 'qrcode-generator'), p = pkgJson(dir), src = readFileSync(join(dir, 'dist/qrcode.mjs'), 'utf8');
  // The comment block at the top of its source: copyright, licence, the trademark note.
  const head = src.split('\n').filter((l, i, a) => a.slice(0, i + 1).every(x => x.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '').replace(/^-+$/, '')).join('\n').trim();
  const holder = (head.match(/Copyright \(c\) .+/) || ['Copyright (c) ' + (p.author || '')])[0];
  const mit = `${holder}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
  return block(p.name, p.version, licenceName(p), `The package ships no licence file. The notice at the head of its source:\n\n${head}\n\nThe MIT License it points to:\n\n${mit}\n\nQR Code is a registered trademark of DENSO WAVE INCORPORATED.`);
}

function viteBlock() {
  const dir = join(NM, 'vite'), p = pkgJson(dir), text = readFileSync(join(dir, 'LICENSE.md'), 'utf8');
  return block(p.name, p.version, licenceName(p), 'Vite adds a small helper to the guide\'s code (loading its files). Vite\'s own licence:\n\n' + text.split(/^# Licenses of bundled dependencies/m)[0].replace(/^# Vite core license\s*/m, ''));
}

// The installed @fontsource families, and a font's name as people know it ("dm-serif-display": "DM Serif Display").
export const fontFamilies = () => existsSync(join(NM, '@fontsource')) ? readdirSync(join(NM, '@fontsource')).filter(f => existsSync(join(NM, '@fontsource', f, 'package.json'))).sort() : [];
export function fontName(slug) {
  try { const m = /Self-host the (.+?) font/.exec(pkgJson(join(NM, '@fontsource', slug)).description || ''); if (m) return m[1]; } catch (e) { /* not installed */ }
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
// "jost/400.css" or "@fontsource/jost/400.css" -> "jost"
export const familyOf = f => String(f).replace(/^@fontsource\//, '').split('/')[0];

export function licensesText({ fonts = [], workbox = false } = {}) {
  const families = [...new Set(fonts.map(familyOf))].filter(f => existsSync(join(NM, '@fontsource', f, 'package.json'))).sort();
  const parts = [
    ...maplibreBlocks(),
    qrcodeBlock(),
    ...(workbox ? WORKBOX.map(n => join(NM, n)).filter(d => existsSync(d)).map(d => pkgBlock(d, 'In the service worker (offline use).')) : []),
    viteBlock(),
    ...families.map(f => pkgBlock(join(NM, '@fontsource', f), `The ${fontName(f)} font files.`))
  ];
  return `Licences of the software and fonts in this guide\n\nThe sources of the map, the places, the photos and the texts are named on the guide's page "Sources and credits".\nBelow: each package shipped with the guide, its version and licence, then its licence text as the package gives it.\n\n${parts.join('\n')}`;
}

// The Vite plugin: licenses.txt at the root of the output, next to index.html (a site) or viewer.html (the shared viewer).
// It is emitted with the bundle, so a site's service worker can keep it for offline use (globPatterns in vite.config.js).
export function licensesPlugin(opts) {
  let outDir = '';
  return {
    name: 'guide-licenses',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: licensesText(opts) }); },
    // After the service worker is written: every Workbox module in it must have its block above.
    closeBundle: {
      order: 'post', sequential: true,
      handler() {
        if (!opts.workbox || !existsSync(outDir)) return;
        const shipped = new Set();
        for (const f of readdirSync(outDir).filter(f => /^(workbox-.*|sw)\.js$/.test(f))) for (const m of readFileSync(join(outDir, f), 'utf8').matchAll(/workbox:([a-z-]+):/g)) shipped.add('workbox-' + m[1]);
        const missing = [...shipped].filter(n => !WORKBOX.includes(n));
        if (missing.length) throw new Error(`licenses.txt: the service worker holds ${missing.join(', ')}; add ${missing.length > 1 ? 'them' : 'it'} to WORKBOX in engine/scripts/licenses.mjs`);
      }
    }
  };
}
