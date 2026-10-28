// Shared by the Vite configs and the scripts: where a site lives and how its site.json is read.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const escAttr = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// index.html is a template: {{name}}, {{description}}... come from site.json.
// virtual:site-fonts imports the @fontsource files the site's theme asks for.
export function sitePlugin(slug) {
  const site = readSite(slug);
  const vars = {
    name: site.name,
    description: site.description || site.name,
    shareDescription: site.shareDescription || site.description || site.name,
    shareImage: site.shareImage || site.logo || 'logo-head.png',
    logo: site.logo || 'logo-head.png',
    metaColor: site.theme.paper || '#FFFFFF',
    lang: site.languages[0] || 'en'
  };
  const FONTS = 'virtual:site-fonts', PRESET = 'virtual:site-preset';
  const preset = site.theme.preset || 'bauhaus';
  const presetFile = resolve(ENGINE, 'src/styles/presets', preset + '.css');
  if (preset !== 'bauhaus' && !existsSync(presetFile)) throw new Error(`Unknown theme preset "${preset}". Presets: ${PRESETS.join(', ')}`);
  // The look's fonts, then the site's own. "fonts": [] bundles none (the shared viewer loads each guide's from the CDN).
  const own = site.theme.fonts, fonts = Array.isArray(own) && !own.length ? [] : [...new Set([...(PRESET_FONTS[preset] || []), ...(own || [])])];
  return {
    name: 'guest-guide-site',
    resolveId(id) { if (id === FONTS || id === PRESET) return '\0' + id; },
    load(id) {
      if (id === '\0' + FONTS) return fonts.map(f => `import '@fontsource/${f}';`).join('\n');
      // Bauhaus is the engine's base look (app.css), so it adds nothing. Other presets restyle on top of it.
      if (id === '\0' + PRESET) return preset === 'bauhaus' ? '' : `import ${JSON.stringify(presetFile)};`;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? escAttr(vars[k]) : m))
    }
  };
}
