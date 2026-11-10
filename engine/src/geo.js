import { st } from './state.js';
import { lang } from './i18n.js';

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
// The name in the guest's language: the words Google falls back to when it cannot find the place's id.
const nameIn = m => (m.name && typeof m.name === 'object' ? m.name[lang] || m.name.en : m.name) || nameOf(m) || m.town || '';
const placeId = m => (m.gid ? `&destination_place_id=${encodeURIComponent(m.gid)}` : '');
// Directions by position; a place without one (nomap: the host's own not located, or Google's position past its 30 days)
// by its name and town. With the place's Google id, Google takes the id first (the words only if the id is not found).
export const gDir = m => `https://www.google.com/maps/dir/?api=1&destination=${m.nomap ? q(m) : `${m.lat},${m.lng}`}${placeId(m)}`;
// The Google Maps button, everywhere a place has one. With the place's Google id (gid), the only thing of Google's we
// may keep: a link built from it, whatever "gmaps" the data holds (old data holds Google's own link). Without an id:
// the link the data holds, else a search by name and town, else by position, else by name alone (none: no button).
export const gSearch = m => m.gid
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nameIn(m))}&query_place_id=${encodeURIComponent(m.gid)}`
  : m.gmaps || m.map || (nameOf(m) && m.town ? `https://www.google.com/maps/search/?api=1&query=${q(m)}` : !m.nomap && typeof m.lat === 'number' ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}` : nameOf(m) ? `https://www.google.com/maps/search/?api=1&query=${q(m)}` : '');
