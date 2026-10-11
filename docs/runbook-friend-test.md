# Runbook: a friend tests the Guest Guide Maker, end to end

Plain language. Today this is manual on purpose. Each step says what happens and why.

1. **Friend fills in the form** at https://porta-guides.netlify.app and presses Send. Their browser posts the answers to Netlify Forms (form `onboarding`) and any photos they added themselves to the form `file`. Listing photos travel as links. They then see a generic preview in the same app, with a note that it is not the final look.
2. **You get the submission.** Netlify > porta-guides > Forms > `onboarding`. (Turn on Settings > Forms > Form notifications > email, to be told when one arrives.)
3. **Export it.** In Forms > `onboarding`, click Export CSV. If the friend added their own photos, also export the form `file`. Save both in the Guest Guides folder, or attach them in the Claude conversation.
4. **Import** (Claude does this): `python3 engine/scripts/import-submission.py onboarding.csv --files file.csv`. It makes `test-submissions/<slug>/` with the answers and photos in the shape the generator expects.
5. **Generate** (Claude does this): `generate-site.py test-submissions/<slug> --slug <slug> --lat .. --lng .. --src <language>` writes `sites/<slug>/`. It lists what is left to research by hand (places, markets, events).
6. **Check**: `npm run check -- <slug>`, then look at the site together before anyone else sees it.
7. **Build**: `npm run build` makes the finished site in `dist/`.
8. **Publish**: create a Netlify project `guide-<friend>` and drag the built site in (one-off, manual for now). Send the friend the link.
9. **Feedback**: the friend answers the feedback page (form `feedback`). Changes are made in `test-submissions/<slug>`, then repeat 5 to 8.

What can go wrong: an empty `answers` column (you exported the wrong form), a photo link that has expired (the generator says "listing photo not downloaded" and carries on), a missing latitude and longitude (ask Claude to look them up from the town).
