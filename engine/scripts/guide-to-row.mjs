// Turns a built-site folder (sites/<slug>) into the JSON a database row holds: content and theme.
// Usage: node engine/scripts/guide-to-row.mjs <slug> [assetBase] > row.json
// The row's theme carries the site's colour world (theme.world: an id, or a world with colours of its own) when it has one:
// the shared viewer and the editor read it there (engine/src/viewer.js).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { siteDir, readSite } from '../site.config.js';
const [slug, assetBase = ''] = process.argv.slice(2);
const SD = siteDir(slug), site = readSite(slug);
const json = f => JSON.parse(readFileSync(f, 'utf8'));
const dir = d => existsSync(resolve(SD, d)) ? readdirSync(resolve(SD, d)).filter(f => f.endsWith('.json') && !f.startsWith('.')) : [];   // dot-files are local bookkeeping (private/.synced.json)
const files = Object.fromEntries(dir('content').map(f => [f.replace(/\.json$/, ''), json(resolve(SD, 'content', f))]));
const i18n = Object.fromEntries(dir('i18n').map(f => [f.replace(/\.json$/, ''), json(resolve(SD, 'i18n', f))]));
const priv = Object.fromEntries(dir('private').map(f => [f.replace(/\.json$/, ''), json(resolve(SD, 'private', f))]));
const css = existsSync(resolve(SD, 'theme.css')) ? readFileSync(resolve(SD, 'theme.css'), 'utf8') : '';
const { onboarding, ...siteOut } = site;
process.stdout.write(JSON.stringify({ content: { site: siteOut, files, private: priv, i18n, assetBase }, theme: { css, fonts: site.theme.fonts || [], ...(site.theme.world ? { world: site.theme.world } : {}) } }));
