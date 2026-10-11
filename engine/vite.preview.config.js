// Builds one self-contained HTML file (sites/<site>/preview/<site>-preview.html) that opens
// without a server: in the Claude sidebar, or by double-clicking it. No offline mode.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
import { ENGINE, ROOT, siteDir, sitePlugin } from './site.config.js';

const SITE = process.env.SITE || 'ca-la-kimberly';
const SD = siteDir(SITE);

export default defineConfig({
  root: ENGINE,
  base: './',
  publicDir: false,
  resolve: { alias: { '@site': SD } },
  server: { fs: { allow: [ROOT] } },
  build: { outDir: resolve(SD, 'preview'), emptyOutDir: true, target: 'es2020', assetsInlineLimit: 100000000 },
  plugins: [sitePlugin(SITE), viteSingleFile()]
});
