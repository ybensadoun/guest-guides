# Plan: a fast guide builder with a wow moment in the first minute (decided 28 Oct 2026; steps 1 to 3 done 29 Oct)

Decided 28 Oct 2026 (Yohann): the order below, "show first, ask later". Yohann's brief: ask as few questions as possible; the host pastes their Airbnb link, sets the look, plays a swipe game with the venues, and everything else is made in the background. No landing page that adds nothing: straight into the editor. Steps that are already good to go (only an optional check) must look different from the few where the host really has to answer. A wow moment almost at once.

## Today (onboarding-site, 28 Oct 2026)
1. Create an account (email, password).
2. Start page: "Your guest guide, written for you", the link and the town (`start.js` startHTML).
3. About a minute while `/api/listing` reads the listing and writes a first version.
4. Overview: a hero, a progress meter and 14 tiles in 4 groups (`homeHTML` in src.html).
5. The 14 steps, each with a Done button: Your listing, Name and languages, The look, Guide sections, Photos by room, How things work, Check-in and rules, Wi-Fi, Arrival and parking, Rubbish, Contacts, Your style, Bars and restaurants (with the swipe game for things to do), Your area.
6. Review and send, then a few minutes while the worker builds.
7. Then the editor: its own Overview (`cmHomeHTML`) and 15 steps, Publish changes.
The first time the host sees their guide is at the end of step 6.

## What only the host can tell us, and what we already know
| Step today | Filled for them | Needs the host |
|---|---|---|
| Your listing (name, type, town, counts) | yes, from the listing | no: a check |
| Name and languages | name from the listing; languages from the host's own language and the area's | no: a check |
| The look | a cover from the listing photos, a layout, colours from the cover | a choice, but the default is good |
| Guide sections | from the listing and the area | no: a check |
| Photos by room | yes, Airbnb's photo tour and Claude | no: a check |
| How things work | the amenities, room by room | optional: their own tips |
| Check-in and rules | yes, from the listing | no: a check |
| Wi-Fi | no | yes (or later) |
| Arrival and parking | no | yes, short (or later) |
| Rubbish | no | yes (or later) |
| Contacts | emergency numbers, hospital, pharmacy | their phone, if they want it |
| Your style | not needed | drop it |
| Bars and restaurants, things to do | Google's best-rated places nearby | the swipe game |
| Your area | from city or countryside | no: a check |
So 4 small things need the host (Wi-Fi, arrival, rubbish, their phone) plus 2 choices (the look, the swipe). Everything else is a check.

## Proposed order: show first, ask later
1. **Paste your link** (one field; the town only if we cannot read it). No account yet.
2. **The wow, within about a minute**: while the listing is read, a phone appears and the guide builds itself in it: their photo, the house's name, the rooms, the rules. It is their guide, not a form.
3. **The look**, with that phone next to it: cover photo, layout, colours. Already chosen for them, so one tap is enough; every change shows in the phone at once.
4. **The swipe game**: things to do near the house (and bars and restaurants, if Yohann agrees), big photos, swipe or tap. Each "yes" lands in the phone.
5. **Only you know**: one short screen with Wi-Fi, arrival, rubbish days and their phone. Each one can be "later".
6. **Save it**: the account here (email and password), after the wow, not before. Then publish: the guide goes live at once with what is ready; markets, events and translations arrive over the next minutes ("We are adding markets and events near you").
7. **After that, the editor** opens on the first thing that needs them, never on an overview. The steps are in two groups: "Needs you" and "Ready: check if you like".
Why this order rather than the look first: the look is easier to choose on a guide that already exists, and the wow comes before any question. Asking for the account last removes the first wall.

## How to get there, in small steps (each one shippable)
1. **No overview pages.** Done: the editor on 28 Oct 2026 (the page Yohann pointed at), the builder on 29 Oct (after the listing is read it opens The look; `#home` goes to the next step that needs the host). Checked by `onboarding-site/test/check.mjs`.
2. **Two kinds of step.** Done 29 Oct 2026. The path (Next and "2 of 8" follow it) is the steps only the host can answer, in the agreed order: Load your listing, The look, Places nearby (the swipe game), Wi-Fi, Arrival and parking, Rubbish, Contacts, then Review and send (`FLOW` in `onboarding-site/src/runtime.js`). Each is "Needs you" until answered, "Later" when skipped, "Check" when the listing said it; an empty one offers Later, never Done. Every other step is "Ready" (something came from the listing, no button to press) or "Optional" (the listing said nothing), listed under "Ready: check if you like", with Continue back to the path. The look shows "Your guide is written: N steps are ready, M need you" and See your guide. In the editor, a guide without Wi-Fi lists it first under "Needs you".
3. **The phone preview from the first minute.** Done 29 Oct 2026. Sending the link opens "This is your guide" (`#yours`) at once. `/api/listing` answers in two stages: `page` (what the listing page says, about 6 s for a real listing: name, cover, 16 photos, rating) and `write` (Claude, from what was already read, so Airbnb is read once). The phone shows the house photo and the listing's own title as soon as the page is read, the sections pop in when Claude is done, and "Make it yours" opens The look (pinned at the bottom on a phone, where the guide comes first). On screens from 1240 px wide the phone sits next to every step and shows that step's screen of the guide (Wi-Fi, check-out, house guide...), updated as the host types; tapping a tile opens that screen in the phone. Built from the answers in the browser (`pvParts`, `phoneRender` in `onboarding-site/src/preview.js`), before any build; the cover follows the guide's rule (the host's own, else the listing photo, unless "drawn"). The full-page preview lost its outdated "generic preview, get in touch with Yohann" bar.
4. **The look on one screen** with the live phone.
5. **The swipe game as its own step**, with bigger cards and swipe gestures; restaurants in it if agreed.
6. **"Only you know"** as one screen; Your style dropped; arrival, rubbish and contacts merged into it.
7. **Account at the end** (answers stay on the device until then, as they already do offline).
8. **Research starts with the link**: the worker researches markets, events and emergency contacts while the host plays, so publishing is quick.
