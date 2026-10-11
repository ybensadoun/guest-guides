# Learnings from the first friend test (Querol, Oct 2026)

Plain list of what went wrong or surprised us, and the rule that follows. Read this before the next guide.

## Will a manual run give a perfect guide today? No.
It gives a good first version that still needs a human pass. What is automatic and what is not:
- Automatic: importing the form, photos, rooms, rules, rubbish, emergency numbers, map spots.
- Needs a person: the design (a designed theme.css per guide), welcome and tone text, markets, restaurants, events, verifying phone numbers and hours, deploying, and checking the result on a phone.
- Needs a working Anthropic API key, otherwise the listing text, welcome message and amenities come out empty.

## What went wrong, and the rule
1. **UX brief was ignored.** The guide came out in the default blue "soft" preset. Rule: read the host's brief first (palette, fonts, feel words, tone, home-screen order) and write a designed theme.css before anything else. A theme that starts with `/* designed:` is never overwritten.
2. **Grey, generic backgrounds.** Neutral grey-white pages look machine-made. Rule: never use grey as the page or card colour. Take the page colour from the host's palette or the cover photo (sand, cream, olive, clay, sea blue, chalk white), and change the mood from guide to guide: light or dark, warm or cool, flat colour or a tint of the photo. Cards are a slightly lighter or darker tint of the page colour, not grey. Check the first screenshot and ask "would a person have chosen this?".
3. **Markets missed.** First search found none. Rule: always at least four markets, nearest first, truly local; if fewer exist, ask whether to go further. Flag unconfirmed hours.
4. **Sections left off.** Garbage, markets, restaurants, events stayed off. Rule: follow the host's answers (street containers means the garbage section is on and adapts) and the standard CLK section set.
5. **Invalid API key failed silently.** Rule: after a test, open the technical code on the thanks page; if it says 401, fix the key before anything else.
6. **Airbnb photos.** The server cannot download them. Use `im_w=1200` (1600 gives 404); download through the user's Chrome.
7. **Third-party content.** A friend's test used a listing that may not be theirs. Rule: ask who owns the listing before publishing photos; test guides go in a private repo or stay unpublished.
8. **GitHub Desktop "Commit/Publish" commits everything**, including scratch folders. Rule: commit only chosen files; scratch goes in `.trash*` (ignored).
9. **Deploying.** The sandbox cannot call Netlify. A guide goes live by dragging its zip into the project's Deploys page. Automating this is on the backlog.
10. **Sandbox quirks.** The device shell cannot delete (move to `.trash*`), `npm run build` needs the old `dist` moved away first, and files must have a single hardlink before they can be staged.

## Steps for the next guide
See docs/runbook-friend-test.md. Add: read the brief, write the designed theme, check the first screenshot against rule 2, then deploy.

## Now automatic in generate-site.py (12 Oct)
- Palette and fonts are read from the host's written brief (hex codes with labels, or the font names it mentions; a named font that is not installed is reported in `warnings` and the closest kit font is used).
- A designed theme.css is written from `engine/templates/designed-theme.css`: sand-tinted page and cards (never grey), full-bleed cover, hairline frames, accent colour only on the main button and urgent calls. It starts with `/* generated-design:` so it is regenerated; rename it to `/* designed:` after hand edits and it is never overwritten.
- Rubbish and markets switch on by themselves when the host answered (rubbish) or researched content exists (markets).
- `--research <folder>` copies researched files (emergency.json, markets.json, todo.json) into the guide. The research itself (markets, emergency numbers, things to do) is still done by hand or by an agent with web access.
- Test: regenerating the Querol CSV now gives the same sections, palette, fonts and theme as the hand-built guide.
