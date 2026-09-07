# Validation · September 7, 2026

## Automated checks

- Static build verifies local game links and packages all 28 activities.
- Progress regressions cover rewards, reset, malformed/unavailable storage, expired streaks, and practice speed-record isolation.
- Chromium browser checks exercise all 27 quiz activities: start, choose an answer, feedback, next question, and return to setup.
- Complete counting practice round, results, replay, and progress persistence after reload.
- Timed expiry, automatic transition, cancellation on exit, and unlimited practice time.
- Search, empty results, reset filters, learning-stage filtering, favorites saved across reload, and the grown-up dialog.
- Complete Memory Garden through card interactions, reward once, and restart with a clean board.
- No page runtime errors or external asset requests in the tested flows.
- Responsive overflow checks across all activities at 390px; home, counting, stories, and memory additionally checked at 320px and 768px.

## Visual inspection

Reviewed Chromium screenshots of the desktop home, phone home/library, counting, Story Detectives, and Memory Garden. Fixed missing picture glyphs, emoji font spacing, card star alignment, and small-screen control wrapping. Screenshots are generated in `artifacts/` by `npm run test:e2e`; additional narrow and tablet snapshots are saved there from the final visual pass.

## Practical limits

- Tested in local Linux Chromium, not physical iOS/Android devices or Safari/Firefox.
- Speech synthesis uses the device's voices. Browser controls were exercised, but pronunciation and Tamil voice quality were not audited by listening.
- Age bands are suggestions; activities have not undergone formal curriculum or child-user validation.
- Scores, favorites, and progress remain on one browser. There is no cloud sync or parent account.
- The bundled emoji font adds about 11 MB on its first load and is cached by the browser according to hosting headers.

## Tamil typing additions · September 7, 2026

- Two new, separately linked activities: Tamil Sentence Words and Tamil Missing Letters. Total library count is now 30.
- The shared bank has 32 distinct Tamil sentence contexts across three topics. Letter mode excludes one-letter words, leaving 31 eligible contexts.
- Unit tests cover all target words and synonyms against the available on-screen keyboard, canonical Unicode normalization, and Tamil consonant/vowel-sign/pulli boundaries.
- The dedicated browser suite completes one shuffled 10-sentence round in each mode. It checks empty and incorrect submissions, retries, whole-word rejection in letter mode, native text insertion with Enter, composition-event submission protection, on-screen typing/deletion, answer reveal followed by required typing, pinned answer preview, score recording, replay, and persistence after reload.
- Both games were captured and visually inspected at phone and desktop widths; overflow checks and screenshots cover 320, 390, 768, and 1366 pixels. Wider compound-letter keys and a pinned answer preview address small-screen keyboard usability.
- The full library regression passed with all 30 activities; no browser page errors were observed.
- The site remains local. These additions were not exported or published.
