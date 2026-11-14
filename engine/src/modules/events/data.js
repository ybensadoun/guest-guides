// The events module's data: the guide's Local events section (content/events.json, read by content.js with the other
// sections). The rules themselves: plan.js.
import { SECTIONS } from '../../content.js';

// The guide's Local events section, live or not; undefined when the guide has none (or its module is off). What's on
// (../whatson/) reads its events and links to its page.
export const EVENTS_SECTION = SECTIONS.find(x => x.kind === 'events');
