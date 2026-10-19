// The shared viewer: one build that opens any guide from the database (/g/<name>).
// Output goes into onboarding-site/g-app/ (committed, served by the onboarding Netlify project).
// If g-app/ already exists, move it aside first (some mounted folders refuse to delete files):  mv onboarding-site/g-app onboarding-site/.trash-g-app-<n>
import { defineConfig } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE, ROOT, siteDir, sitePlugin } from './site.config.js';

const SD = siteDir('_viewer');
function vendorMaplibre() {
  const copy = () => {
    const to = resolve(SD, 'public/vendor/maplibre');
    mkdirSync(to, { recursive: true });
    for (const f of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) writeFileSync(resolve(to, f), readFileSync(resolve(ROOT, 'node_modules/maplibre-gl/dist', f)));
  };
  return { name: 'vendor-maplibre', buildStart: copy };
}

export default defineConfig({
  root: ENGINE,
  base: '/g-app/',
  publicDir: resolve(SD, 'public'),
  resolve: { alias: { '@site': SD } },
  server: { host: true, fs: { allow: [ROOT] } },
  build: { outDir: resolve(ROOT, 'onboarding-site/g-app'), emptyOutDir: true, target: 'es2020', rollupOptions: { input: resolve(ENGINE, 'viewer.html') } },
  plugins: [sitePlugin('_viewer'), vendorMaplibre()]
});
