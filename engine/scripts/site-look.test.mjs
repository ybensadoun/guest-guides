// The four old layouts (presets soft, minimal, mediterranean, rural) were removed on 14 Nov 2026: a site.json naming one
// stops the build with one sentence that says so and names the colour worlds; "bauhaus" or no preset builds, in the base
// look, with Bauhaus's fonts (else its world's), then the site's own. Sites are made in a temporary folder, removed after.
//   node --test engine/scripts/site-look.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { sitePlugin, siteFonts, readSite } from '../site.config.js';
import { WORLDS } from '../src/worlds.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOST = WORLDS.bauhaus.fonts;
const SENTENCE = /^site-look-test: theme\.preset "soft" no longer exists: the layouts were removed on 14 Nov 2026 and a guide now picks a colour world \(theme\.world: bauhaus, sea, country, tropical, night, stone\)\.$/;
// A site folder holding only a site.json (sitePlugin and readSite take its absolute path as the site).
function withSite(theme, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'site-look-'));
  try { writeFileSync(join(dir, 'site.json'), JSON.stringify({ slug: 'site-look-test', name: 'Test', languages: ['en'], theme })); return fn(dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
const fontsOf = p => p.load('\0virtual:site-fonts');

test('a site.json naming an old layout stops the build with one sentence', () => {
  withSite({ preset: 'soft' }, dir => assert.throws(() => sitePlugin(dir), e => SENTENCE.test(e.message)));
  for (const preset of ['minimal', 'mediterranean', 'rural']) withSite({ preset, world: 'sea' }, dir => assert.throws(() => sitePlugin(dir), /no longer exists: the layouts were removed on 14 Nov 2026/));
});

test('the real build (vite with engine/vite.config.js) stops on it, before writing anything', () => {
  withSite({ preset: 'soft' }, dir => {
    const r = spawnSync('npx', ['vite', 'build', '--config', 'engine/vite.config.js'], { cwd: ROOT, encoding: 'utf8', timeout: 120000, env: { ...process.env, SITE: dir, GOOGLE_MAPS_BROWSER_KEY: '' } });
    assert.notEqual(r.status, 0);
    assert.ok(!existsSync(join(dir, 'dist')));
    assert.match(r.stdout + r.stderr, /theme\.preset "soft" no longer exists: the layouts were removed on 14 Nov 2026 and a guide now picks a colour world \(theme\.world: bauhaus, sea, country, tropical, night, stone\)\./);
  });
});

test('"bauhaus" or no preset builds: the base look, Bauhaus\'s fonts, no preset module', () => {
  for (const theme of [{}, { preset: 'bauhaus' }, { preset: 'bauhaus', fonts: ['fraunces/700.css'] }]) withSite(theme, dir => {
    const p = sitePlugin(dir);
    assert.equal(p.resolveId('virtual:site-preset'), undefined);
    assert.equal(fontsOf(p), [...JOST, ...(theme.fonts || [])].map(f => `import '@fontsource/${f}';`).join('\n'));
    assert.equal(p.load('\0virtual:site-world.css'), '');
  });
});

test('fonts: the world\'s, else Bauhaus\'s, then the site\'s own; "fonts": [] bundles none', () => {
  withSite({ world: 'sea', fonts: ['nunito/400.css'] }, dir => assert.deepEqual(siteFonts(readSite(dir)), [...WORLDS.sea.fonts, 'nunito/400.css']));
  withSite({ fonts: ['jost/400.css', 'nunito/400.css'] }, dir => assert.deepEqual(siteFonts(readSite(dir)), [...JOST, 'nunito/400.css']));
  withSite({ preset: 'bauhaus', fonts: [] }, dir => assert.deepEqual(siteFonts(readSite(dir)), []));
});
