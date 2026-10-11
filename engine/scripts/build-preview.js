// npm run preview-file -- <site> : one HTML file with everything inside, MapLibre included.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE, ROOT, siteDir, readSite } from '../site.config.js';

const SITE = process.argv[2] || process.env.SITE || 'ca-la-kimberly';
const SD = siteDir(SITE);
const site = readSite(SITE);
execSync(`npx vite build --config "${resolve(ENGINE, 'vite.preview.config.js')}"`, { stdio: 'inherit', cwd: ROOT, env: { ...process.env, SITE } });
const d = resolve(ROOT, 'node_modules/maplibre-gl/dist') + '/';
const lib = {
  main: readFileSync(d + 'maplibre-gl.mjs', 'utf8'),
  shared: readFileSync(d + 'maplibre-gl-shared.mjs', 'utf8'),
  worker: readFileSync(d + 'maplibre-gl-worker.mjs', 'utf8'),
  css: readFileSync(d + 'maplibre-gl.css', 'utf8')
};
const tag = `<script>window.__MAPLIBRE_INLINE=${JSON.stringify(lib).replace(/<\/script/gi, '<\\/script')};</script>`;
const out = resolve(SD, 'preview');
let html = readFileSync(resolve(out, 'index.html'), 'utf8');
html = html.replace('</head>', () => tag + '</head>');
// Images from public/ are referenced by file name: embed them so the single file works on its own.
const TYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' };
const imgs = [...new Set([...(site.previewImages || []), site.logo || 'logo-head.png', 'favicon.png'])];
for (const f of imgs) {
  const p = resolve(SD, 'public', f);
  if (!existsSync(p)) continue;
  const uri = `data:${TYPE[f.split('.').pop()] || 'image/png'};base64,` + readFileSync(p).toString('base64');
  html = html.split(f).join(uri);
}
// House guide photos (public/guide/*.jpg).
const gd = resolve(SD, 'public/guide');
if (existsSync(gd)) for (const f of readdirSync(gd)) {
  const uri = 'data:image/jpeg;base64,' + readFileSync(resolve(gd, f)).toString('base64');
  html = html.split('guide/' + f).join(uri);
}
const file = resolve(out, `${SITE}-preview.html`);
writeFileSync(file, html);
unlinkSync(resolve(out, 'index.html'));
console.log(`Preview written to sites/${SITE}/preview/${SITE}-preview.html (` + Math.round(html.length / 1024) + ' KB)');
