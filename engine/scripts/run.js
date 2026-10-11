// One entry point for every command, so the site is always explicit:
//   npm run dev -- <site>            local server for one site
//   npm run build -- <site>          check + build one site into sites/<site>/dist
//   npm run build                    check + build every site (after an engine change)
//   npm run check -- <site>          content check only
//   npm run preview -- <site>        serve the built site, offline mode on
//   npm run preview-file -- <site>   one self-contained HTML file in sites/<site>/preview/
//   npm run sites                    list the sites
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ENGINE, ROOT, listSites, readSite } from '../site.config.js';

const [cmd, arg] = process.argv.slice(2);
const sites = listSites();
const run = (args, SITE) => {
  const r = spawnSync(args[0], args.slice(1), { stdio: 'inherit', cwd: ROOT, env: { ...process.env, SITE }, shell: process.platform === 'win32' });
  if (r.status) process.exit(r.status);
};
const vite = (sub, SITE) => run(['npx', 'vite', ...(sub ? [sub] : []), '--config', resolve(ENGINE, 'vite.config.js')], SITE);
// On a build server, private values come from environment variables (they are never in git).
// WIFI_JSON is short: {"password":"...","networks":[{"ssid":"...","label":{"en":"..."}}]}; the QR codes are made here.
const writePrivate = async SITE => {
  if (!process.env.WIFI_JSON) return;
  const w = JSON.parse(process.env.WIFI_JSON);
  const { default: QR } = await import('qrcode');
  const esc = v => String(v).replace(/([\\;,:"])/g, '\\$1');
  for (const n of w.networks || []) {
    if (!n.qr) n.qr = await QR.toString(`WIFI:T:WPA;S:${esc(n.ssid)};P:${esc(w.password)};;`, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' });
  }
  const dir = resolve(ROOT, 'sites', SITE, 'private');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'wifi.json'), JSON.stringify(w, null, 2));
};
const check = SITE => run(['node', resolve(ENGINE, 'scripts/check-content.js'), SITE], SITE);

if (cmd === 'sites') { for (const s of sites) console.log(`${s}  ·  ${readSite(s).name}`); process.exit(0); }
const pick = () => {
  if (arg) { readSite(arg); return arg; }
  if (sites.length === 1) return sites[0];
  console.error(`Which site? npm run ${cmd} -- <site>\nSites: ${sites.join(', ')}`); process.exit(1);
};

if (cmd === 'build') {
  for (const s of arg ? [pick()] : sites) { console.log(`\n=== ${s} ===`); await writePrivate(s); check(s); vite('build', s); }
} else if (cmd === 'check') {
  for (const s of arg ? [pick()] : sites) check(s);
} else if (cmd === 'dev') vite('', pick());
else if (cmd === 'preview') vite('preview', pick());
else if (cmd === 'preview-file') { const s = pick(); check(s); run(['node', resolve(ENGINE, 'scripts/build-preview.js'), s], s); }
else { console.error('Commands: dev, build, check, preview, preview-file, sites'); process.exit(1); }
