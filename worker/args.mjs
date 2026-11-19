// A command line option's value, for the worker's one-off commands (worker/guide-worker.mjs: --refresh-events, --find):
// what follows `k`, or '' when `k` is not given, comes last or is followed by another option. No imports, so a test can
// load it (worker/test/args.test.mjs); the worker itself is never imported by a test, importing it starts it.
// Written on 19 Nov 2026 for a fault found on 16 Nov: `argv[argv.indexOf('--slug') + 1]` reads argv[0], the path of node,
// when --slug is not given, so the monthly run asked for a guide named "/usr/local/bin/node", found none, said nothing
// and ended well: automatic events were never refreshed by it (1 Nov 2026).
export const argOf = (argv, k) => { const i = argv.indexOf(k); return i > 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''; };
