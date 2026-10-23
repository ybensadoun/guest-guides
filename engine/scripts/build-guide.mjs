// The shared viewer built for one guide's own address: npm run build-guide -- <slug>  (output in sites/<slug>/dist).
import { spawnSync } from 'node:child_process';
const slug = process.argv[2];
if (!slug) { console.error('Usage: npm run build-guide -- <slug>'); process.exit(1); }
const r = spawnSync('npx', ['vite', 'build', '--config', 'engine/vite.viewer.config.js'], { stdio: 'inherit', env: { ...process.env, GUIDE_SLUG: slug } });
process.exit(r.status ?? 1);
