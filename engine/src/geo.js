import { st } from './state.js';

export function hav(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Rough road distance: straight line x 1.3, same rule as the house distances.
export const kmMe = m => (st.me ? Math.max(1, Math.round(hav(st.me.lat, st.me.lng, m.lat, m.lng) * 1.3)) : null);

const q = m => encodeURIComponent([m.name_local || (m.name && m.name.ca), m.place, m.town].filter(Boolean).join(', '));
export const gDir = m => `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
// Google Maps place page: the exact place (cid) when known, else the point itself.
export const gSearch = m => m.gmaps || (m.lat != null ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}` : `https://www.google.com/maps/search/?api=1&query=${q(m)}`);
