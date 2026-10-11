// One engine, many sites. Which site is built comes from the SITE environment variable
// (set by `npm run dev|build|preview -- <site>`, see engine/scripts/run.js).
// Everything listing-specific is read from sites/<site>/: site.json, content/, i18n/, public/, theme.css.
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE, ROOT, siteDir, readSite, sitePlugin } from './site.config.js';

const SITE = process.env.SITE || 'ca-la-kimberly';
const SD = siteDir(SITE);
const site = readSite(SITE);
const theme = site.theme || {};

// MapLibre is served as plain ES modules from /vendor/maplibre and loaded only when the
// Map tab opens. Its worker imports a shared chunk by relative path, so the files are
// copied untouched instead of being bundled.
function vendorMaplibre() {
  const copy = () => {
    const to = resolve(SD, 'public/vendor/maplibre');
    mkdirSync(to, { recursive: true });
    for (const f of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) {
      // Read and write instead of cpSync: some synced/mounted folders refuse the fast copy and leave a broken 0-byte file.
      writeFileSync(resolve(to, f), readFileSync(resolve(ROOT, 'node_modules/maplibre-gl/dist', f)));
    }
  };
  return { name: 'vendor-maplibre', buildStart: copy, configureServer: copy };
}

export default defineConfig({
  root: ENGINE,
  base: './',
  publicDir: resolve(SD, 'public'),
  envDir: SD,
  server: { host: true, fs: { allow: [ROOT] } },
  resolve: { alias: { '@site': SD } },
  build: { outDir: resolve(SD, 'dist'), emptyOutDir: true, target: 'es2020' },
  plugins: [
    sitePlugin(SITE),
    vendorMaplibre(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', site.logo || 'logo-head.png'],
      manifest: {
        name: site.name,
        short_name: site.shortName || site.name,
        description: site.manifestDescription || site.description,
        lang: (site.languages || ['en'])[0],
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: theme.manifestBackground || '#FFFFFF',
        theme_color: theme.manifestTheme || '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}'],
        globIgnores: ['vendor/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/vendor/maplibre/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'maplibre-lib' }
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ]
});
