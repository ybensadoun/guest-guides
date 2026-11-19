// An option's value on the worker's command line (worker/args.mjs argOf). The fault it was written for (found 16 Nov
// 2026): the monthly run calls `guide-worker.mjs --refresh-events --apply` with no --slug, and the worker read the slug as
// `argv[argv.indexOf('--slug') + 1]`, which is argv[0], the path of node, when --slug is not there. It asked for a guide of
// that name, found none, printed nothing and ended well, so automatic events were never refreshed by the monthly run.
//   node --test 'worker/test/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argOf } from '../args.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const NODE = '/usr/local/bin/node', WORKER = '/app/worker/guide-worker.mjs';

test('the monthly run\'s own command line has no slug: every published guide is meant', () => {
  assert.equal(argOf([NODE, WORKER, '--refresh-events', '--apply'], '--slug'), '');
  assert.equal(argOf([NODE, WORKER, '--refresh-events'], '--slug'), '');
});

test('a slug given is read; an option with nothing after it, or another option after it, has no value', () => {
  assert.equal(argOf([NODE, WORKER, '--refresh-events', '--slug', 'ca-la-kimberly', '--apply'], '--slug'), 'ca-la-kimberly');
  assert.equal(argOf([NODE, WORKER, '--find', 'find-events', '--slug', 'ca-la-kimberly'], '--slug'), 'ca-la-kimberly');
  assert.equal(argOf([NODE, WORKER, '--refresh-events', '--slug'], '--slug'), '');
  assert.equal(argOf([NODE, WORKER, '--refresh-events', '--slug', '--apply'], '--slug'), '');
});

test('the worker reads --slug with argOf and never as the argument after indexOf, which is node itself when it is missing', () => {
  const src = readFileSync(resolve(ROOT, 'worker/guide-worker.mjs'), 'utf8');
  assert.ok(!/indexOf\('--slug'\)\s*\+\s*1/.test(src), 'worker/guide-worker.mjs reads --slug as argv[indexOf + 1] again');
  const block = src.slice(src.indexOf("if (process.argv.includes('--refresh-events'))"));
  assert.ok(/^.*\n\s*const slug = argOf\(process\.argv, '--slug'\)/.test(block), 'the --refresh-events step does not read its slug with argOf');
  assert.match(src, /import \{ argOf \} from '\.\/args\.mjs';/);
});

test('the events step always says what it did, so that an empty run cannot look like one that worked', () => {
  const src = readFileSync(resolve(ROOT, 'worker/guide-worker.mjs'), 'utf8');
  const block = src.slice(src.indexOf("if (process.argv.includes('--refresh-events'))")).split('\n}\n')[0];
  assert.match(block, /published guide\(s\), \$\{on\} with automatic events on\./);
});
