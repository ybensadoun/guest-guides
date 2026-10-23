// The shared viewer: one build that opens any guide from the database (/g/<name>).
// Output goes into onboarding-site/g-app/ (committed, served by the onboarding Netlify project).
// GUIDE_SLUG=<slug> builds the same viewer for one guide's own address (e.g. ca-la-kimberly.netlify.app): served from /,
// into sites/<slug>/dist, with that guide's brand files (public/: icons, link-preview picture) and page header; the guide's
// content still comes from the database. npm run build-guide -- <slug>.
// If g-app/ already exists, move it aside first (some mounted folders refuse to delete files):  mv onboarding-site/g-app onboarding-site/.trash-g-app-<n>
import { defineConfig } from 'vite';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE, ROOT, siteDir, sitePlugin } from './site.config.js';

const SLUG = process.env.GUIDE_SLUG || '';
const SD = siteDir('_viewer'), GD = SLUG ? siteDir(SLUG) : SD;   // data always from the database (the _viewer stub); brand files from the guide
// One guide's own address: index.html at the root, the shared service worker as sw.js (SINGLE), icons in the page header.
function singleGuide() {
  const out = resolve(GD, 'dist');
  return {
    name: 'single-guide',
    transformIndexHtml: html => html.replace('<link rel="icon" href="data:,">', '<link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'),
    closeBundle() {
      if (existsSync(resolve(out, 'viewer.html'))) renameSync(resolve(out, 'viewer.html'), resolve(out, 'index.html'));
      const sw = readFileSync(resolve(ROOT, 'onboarding-site/g-sw.js'), 'utf8').replace('const SINGLE = false;', 'const SINGLE = true;');
      if (!sw.includes('const SINGLE = true;')) throw new Error('g-sw.js: SINGLE marker missing');
      writeFileSync(resolve(out, 'sw.js'), sw);
    }
  };
}
function vendorMaplibre() {
  const copy = () => {
    const to = resolve(GD, 'public/vendor/maplibre');
    mkdirSync(to, { recursive: true });
    for (const f of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) writeFileSync(resolve(to, f), readFileSync(resolve(ROOT, 'node_modules/maplibre-gl/dist', f)));
  };
  return { name: 'vendor-maplibre', buildStart: copy };
}

export default defineConfig({
  root: ENGINE,
  base: SLUG ? '/' : '/g-app/',
  publicDir: resolve(GD, 'public'),
  define: { 'import.meta.env.VITE_GUIDE_SLUG': JSON.stringify(SLUG) },
  resolve: { alias: { '@site': SD } },
  server: { host: true, fs: { allow: [ROOT] } },
  build: { outDir: SLUG ? resolve(GD, 'dist') : resolve(ROOT, 'onboarding-site/g-app'), emptyOutDir: true, target: 'es2020', rollupOptions: { input: resolve(ENGINE, 'viewer.html') } },
  plugins: [sitePlugin(SLUG || '_viewer'), vendorMaplibre(), ...(SLUG ? [singleGuide()] : [])]
});
