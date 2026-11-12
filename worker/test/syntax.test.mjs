// Every script the server or Netlify starts must at least load. The worker itself (worker/guide-worker.mjs) is never
// imported by a test, because importing it starts it: on 12 Nov 2026 a name declared twice in it passed every test and
// stopped the worker on the server at its next update. `node --check` reads a file without running it.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIRS = ['worker', 'onboarding-site/netlify/functions', 'engine/scripts'];

for (const d of DIRS) {
  const files = readdirSync(join(ROOT, d)).filter(f => f.endsWith('.mjs')).sort();
  test(`${d}: every script loads (${files.length})`, () => {
    assert.ok(files.length > 0, 'no script found in ' + d);
    for (const f of files) {
      const r = spawnSync(process.execPath, ['--check', join(ROOT, d, f)], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${d}/${f} does not load:\n${(r.stderr || '').split('\n').slice(0, 6).join('\n')}`);
    }
  });
}

// A name imported from one of our own files must be exported there: `node --check` does not follow imports, and a
// missing name stops the script when it starts, like a syntax error. Read from the text, nothing is run.
const exported = src => {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class)\s+([\w$]+)/gm)) names.add(m[1]);
  // `export const a = 1, b = 2` and `export const { a, b } = x`: every name that is declared on the line
  for (const m of src.matchAll(/^export\s+(?:const|let|var)\s+(.*)$/gm)) for (const n of m[1].matchAll(/(?:^|,\s*)([\w$]+)\s*=(?!=)/g)) names.add(n[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop(); if (n) names.add(n); }
  if (/^export\s+default\b/m.test(src)) names.add('default');
  return names;
};
for (const d of DIRS) {
  test(`${d}: every name imported from our own files is exported there`, () => {
    for (const f of readdirSync(join(ROOT, d)).filter(f => f.endsWith('.mjs')).sort()) {
      const src = readFileSync(join(ROOT, d, f), 'utf8');
      for (const m of src.matchAll(/^import\s*\{([^}]*)\}\s*from\s*'(\.{1,2}\/[^']+\.mjs)'/gm)) {
        const target = resolve(ROOT, d, m[2]);
        assert.ok(existsSync(target), `${d}/${f} imports ${m[2]}, which does not exist`);
        const has = exported(readFileSync(target, 'utf8'));
        for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0]; if (n) assert.ok(has.has(n), `${d}/${f} imports ${n} from ${m[2]}, which does not export it`); }
      }
    }
  });
}
