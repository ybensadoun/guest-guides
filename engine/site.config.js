// Shared by the Vite configs and the scripts: where a site lives and how its site.json is read.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFamilies, fontName, familyOf } from './scripts/licenses.mjs';

export const ENGINE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(ENGINE, '..');
export const SITES = resolve(ROOT, 'sites');
export const siteDir = slug => resolve(SITES, slug);
export const listSites = () => readdirSync(SITES, { withFileTypes: true })
  .filter(e => e.isDirectory() && !e.name.startsWith('_') && existsSync(resolve(SITES, e.name, 'site.json'))).map(e => e.name);

// Layout presets (the guide looks) and their fonts: src/presets.json. bauhaus is app.css itself; the others live in
// src/styles/presets/<name>.css.
const P = JSON.parse(readFileSync(resolve(ENGINE, 'src/presets.json'), 'utf8'));
export const PRESETS = P.presets, PRESET_FONTS = P.fonts;

// Languages the engine has UI strings for. A site picks a subset in site.json.
export const ENGINE_LANGS = ['en', 'es', 'fr', 'ca', 'de', 'nl'];

export function readSite(slug) {
  const p = resolve(siteDir(slug), 'site.json');
  if (!existsSync(p)) throw new Error(`No site "${slug}": ${p} not found. Sites: ${listSites().join(', ')}`);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  s.slug = s.slug || slug;
  s.languages = (s.languages || ['en']).filter(l => ENGINE_LANGS.includes(l));
  s.modules = s.modules || {};
  s.theme = s.theme || {};
  s.area = s.area || {};
  return s;
}

// The fonts a site bundles: its look's, then its own. "fonts": [] bundles none (the shared viewer loads each guide's from the CDN).
export function siteFonts(site) {
  const preset = site.theme.preset || 'bauhaus', own = site.theme.fonts;
  return Array.isArray(own) && !own.length ? [] : [...new Set([...(PRESET_FONTS[preset] || []), ...(own || [])])];
}

const escAttr = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// index.html is a template: {{name}}, {{description}}... come from site.json.
// virtual:site-fonts imports the @fontsource files the site's theme asks for.
// virtual:site-credits gives the credits page (src/views/credits.js) the names of those fonts, and the name of every
// @fontsource family installed (the shared viewer shows a guide in any of them).
// opts.gmapsKey: the Google Maps browser key for the page's <meta name="gmaps-key"> (Google's hours card, src/gcard.js).
// Restricted by web address, so it may be seen in a served page, but never in git: each config says what it gets (empty
// by default, which means no card).
export const GMAPS_PLACEHOLDER = '__GOOGLE_MAPS_BROWSER_KEY__';
export function sitePlugin(slug, opts = {}) {
  const site = readSite(slug);
  const vars = {
    name: site.name,
    description: site.description || site.name,
    shareDescription: site.shareDescription || site.description || site.name,
    shareImage: site.shareImage || site.logo || 'logo-head.png',
    logo: site.logo || 'logo-head.png',
    metaColor: site.theme.paper || '#FFFFFF',
    lang: site.languages[0] || 'en',
    gmapsKey: opts.gmapsKey || ''
  };
  const FONTS = 'virtual:site-fonts', PRESET = 'virtual:site-preset', CREDITS = 'virtual:site-credits';
  const preset = site.theme.preset || 'bauhaus';
  const presetFile = resolve(ENGINE, 'src/styles/presets', preset + '.css');
  if (preset !== 'bauhaus' && !existsSync(presetFile)) throw new Error(`Unknown theme preset "${preset}". Presets: ${PRESETS.join(', ')}`);
  const fonts = siteFonts(site);
  return {
    name: 'guest-guide-site',
    resolveId(id) { if (id === FONTS || id === PRESET || id === CREDITS) return '\0' + id; },
    load(id) {
      if (id === '\0' + FONTS) return fonts.map(f => `import '@fontsource/${f}';`).join('\n');
      // Bauhaus is the engine's base look (app.css), so it adds nothing. Other presets restyle on top of it.
      if (id === '\0' + PRESET) return preset === 'bauhaus' ? '' : `import ${JSON.stringify(presetFile)};`;
      if (id === '\0' + CREDITS) return `export const SITE_FONTS = ${JSON.stringify([...new Set(fonts.map(familyOf))])};\nexport const FONT_NAMES = ${JSON.stringify(Object.fromEntries(fontFamilies().map(f => [f, fontName(f)])))};`;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? escAttr(vars[k]) : m))
    }
  };
}
