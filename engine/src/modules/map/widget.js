// The map's widget on Home: the bar that opens the map, with how many places it shows today (README.md, "Its look").
// What Home's tile is made of, for tile(key, label, href, meta, live, cls) in views/home.js: its classes are its own, wide
// and never "t-long", so that the map keeps its 23 px title (../README.md, frame rule 4).
import { t } from '../../i18n.js';
import { mapItems } from '../../content.js';

export const widget = (now = new Date()) => ({ label: t('mapTile'), href: '#map', meta: t('nPlaces', { n: mapItems(now).length }), live: false, cls: 'wide s-wide' });
