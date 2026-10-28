import { st } from './state.js';

export function hav(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Rough road distance: straight line x 1.3, same rule as the house distances.
export const kmMe = m => (st.me && !m.nomap ? Math.max(1, Math.round(hav(st.me.lat, st.me.lng, m.lat, m.lng) * 1.3)) : null);

// The place's own name (as Google Maps lists it) and its town: Google opens the venue's listing, with hours, photos and reviews.
const nameOf = m => m.name_local || (m.name && typeof m.name === 'object' ? m.name.ca || m.name.es || m.name.en : m.name);
const q = m => encodeURIComponent([nameOf(m), m.town].filter(Boolean).join(', '));
// A place without a known position (nomap: the host's own, not found on Google) is searched by its name.
export const gDir = m => `https://www.google.com/maps/dir/?api=1&destination=${m.nomap ? q(m) : `${m.lat},${m.lng}`}`;
// Google Maps place page: the exact listing link when known, else a search for the place by name (never bare coordinates).
export const gSearch = m => m.gmaps || m.map || (nameOf(m) && m.town ? `https://www.google.com/maps/search/?api=1&query=${q(m)}` : `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`);
