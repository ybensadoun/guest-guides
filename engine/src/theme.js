// Light / dark / auto. "auto" follows the device. The choice is remembered on this device.
import { SITE } from './site-data.js';
const TH = SITE.theme || {};
const KEY = (SITE.storageKey || SITE.slug) + '-theme';
// Dark mode is per site (site.json theme.darkMode): only on once the site's theme has dark colours.
export const DARK_ENABLED = !!TH.darkMode;
export const THEMES = ['auto', 'light', 'dark'];
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const BG = { light: TH.bgLight || TH.manifestBackground || '#FFFFFF', dark: TH.bgDark || '#111214' };

function read() {
  try { const v = localStorage.getItem(KEY); if (THEMES.includes(v)) return v; } catch (e) { /* storage blocked */ }
  return 'auto';
}

export let theme = DARK_ENABLED ? read() : 'light';
export const scheme = () => (theme === 'auto' ? (mq.matches ? 'dark' : 'light') : theme);

const listeners = [];
export const onSchemeChange = fn => listeners.push(fn);

export function applyTheme() {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
  const s = scheme();
  root.dataset.scheme = s;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    if (!m.dataset.orig) m.dataset.orig = m.content;
    m.content = theme === 'auto' ? m.dataset.orig : BG[s];
  });
  listeners.forEach(fn => fn(s));
}

export function cycleTheme() {
  if (!DARK_ENABLED) return;
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
  applyTheme();
}

mq.addEventListener('change', () => { if (theme === 'auto') applyTheme(); });
