// Shared by the Vite configs and the scripts: where a site lives and how its site.json is read.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFamilies, fontName, familyOf } from './scripts/licenses.mjs';
import { WORLDS, worldOf, worldCss } from './src/worlds.js';

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

// The colour world a build shows (src/worlds.js), or null: theme.world in site.json, or WORLD=<id> in the environment,
// which builds the site as if its site.json said so (for the checks and pictures of each world; no site is changed).
// A world goes with the base look only, so a world and another preset is an error, as is an unknown world.
export function siteWorld(site) {
  const env = process.env.WORLD, from = env ? 'WORLD' : 'theme.world', preset = site.theme.preset || 'bauhaus';
  let asked = env || site.theme.world;
  if (!asked) return null;
  // A world with colours of its own ("From your picture"): an object in site.json, the same as JSON in WORLD.
  if (typeof asked === 'string' && asked.trim().startsWith('{')) { try { asked = JSON.parse(asked); } catch (e) { throw new Error(`${site.slug}: ${from} is not valid JSON: ${e.message}`); } }
  const name = typeof asked === 'string' ? asked : JSON.stringify(asked);
  if (!worldOf(asked)) throw new Error(`${site.slug}: unknown colour world ${name} (${from}). Worlds: ${Object.keys(WORLDS).join(', ')}, or { "base": one of them, and deep, strong, fresh, light, warm as #RRGGBB }`);
  if (typeof asked === 'object') for (const [k, v] of Object.entries(asked)) if (k !== 'base' && !(['deep', 'strong', 'fresh', 'light', 'warm'].includes(k) && /^#[0-9a-f]{6}$/i.test(String(v)))) throw new Error(`${site.slug}: colour world ${name} (${from}): "${k}" must be one of deep, strong, fresh, light, warm, as #RRGGBB`);
  if (preset !== 'bauhaus') throw new Error(`${site.slug}: the colour world ${name} (${from}) goes with the base look only, not with the preset "${preset}". Drop one of the two.`);
  return worldOf(asked);
}

// The fonts a site bundles: its look's (its world's, else its preset's), then its own. "fonts": [] bundles none (the
// shared viewer loads each guide's from the CDN).
export function siteFonts(site, world = siteWorld(site)) {
  const preset = site.theme.preset || 'bauhaus', own = site.theme.fonts;
  return Array.isArray(own) && !own.length ? [] : [...new Set([...(world ? world.fonts : PRESET_FONTS[preset] || []), ...(own || [])])];
}

const escAttr = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// index.html is a template: {{name}}, {{description}}... come from site.json.
// virtual:site-fonts imports the @fontsource files the site's theme asks for; virtual:site-world.css is its colour
// world's tokens (empty without one), which main.js puts after app.css and before the site's own theme.css.
// virtual:site-credits gives the credits page (src/views/credits.js) the names of those fonts, and the name of every
// @fontsource family installed (the shared viewer shows a guide in any of them).
// opts.gmapsKey: the Google Maps browser key for the page's <meta name="gmaps-key"> (Google's hours card, src/gcard.js).
// Restricted by web address, so it may be seen in a served page, but never in git: each config says what it gets (empty
// by default, which means no card). opts.world false: no colour world in this build (the shared viewer takes each guide's
// world from its row, src/viewer.js).
export const GMAPS_PLACEHOLDER = '__GOOGLE_MAPS_BROWSER_KEY__';
export function sitePlugin(slug, opts = {}) {
  const site = readSite(slug), world = opts.world === false ? null : siteWorld(site);
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
  const FONTS = 'virtual:site-fonts', PRESET = 'virtual:site-preset', CREDITS = 'virtual:site-credits', WORLD = 'virtual:site-world.css';
  const preset = site.theme.preset || 'bauhaus';
  const presetFile = resolve(ENGINE, 'src/styles/presets', preset + '.css');
  if (preset !== 'bauhaus' && !existsSync(presetFile)) throw new Error(`Unknown theme preset "${preset}". Presets: ${PRESETS.join(', ')}`);
  const fonts = siteFonts(site, world);
  return {
    name: 'guest-guide-site',
    resolveId(id) { if (id === FONTS || id === PRESET || id === CREDITS || id === WORLD) return '\0' + id; },
    load(id) {
      if (id === '\0' + FONTS) return fonts.map(f => `import '@fontsource/${f}';`).join('\n');
      // Bauhaus is the engine's base look (app.css), so it adds nothing. Other presets restyle on top of it.
      if (id === '\0' + PRESET) return preset === 'bauhaus' ? '' : `import ${JSON.stringify(presetFile)};`;
      if (id === '\0' + WORLD) return world ? worldCss(world) + '\n' : '';
      if (id === '\0' + CREDITS) return `export const SITE_FONTS = ${JSON.stringify([...new Set(fonts.map(familyOf))])};\nexport const FONT_NAMES = ${JSON.stringify(Object.fromEntries(fontFamilies().map(f => [f, fontName(f)])))};`;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? escAttr(vars[k]) : m))
    }
  };
}
