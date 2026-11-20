# English Fluency

A private daily 25-minute American English speaking and listening coach for a 12-week fluency plan: six practice days and one weekly story review each week. It runs entirely in the browser with no server or account, and works offline once opened. Practice logs, transcripts, and voice recordings stay on the device.

## Run it

```bash
npm start
```

Then open http://localhost:4176. Node is the only requirement.

## Daily routine (~25 min)

1. **Listen & Decode (~5 min):** Blind micro-dictation of fast American speech reductions plus YouGlish links.
2. **Phrase Upgrade & Shadowing (~6 min):** One US workplace phrase and one casual everyday expression, plus a daily Tamil-to-US phrasing swap and 60-second clarity drill.
3. **Story Flow & Dialogue (~5 min):** Two connected mini-stories and a 6-turn dialogue with Role-Play mode.
4. **Speak & Record (~7 min):** Structured BLUF, PREP, or Story challenge with a speaking timer, local voice recorder, and optional browser live captions.
5. **Habit Check & Wrap-up (~3 min):** Offline transcript analysis for common L1 habits, target phrase detection, AI coach prompt export, and daily confidence rating.

## How it is built

Plain HTML, CSS and JavaScript modules, with no framework, build step or third-party runtime code.

| File | Purpose |
| --- | --- |
| `js/plan.js` | 12-week schedule, Tamil-to-US swaps, clarity drills, speaking frameworks |
| `js/lessons-p1.js` | Phase 1 lessons (Weeks 1–4: Ear & Habit Reset) |
| `js/lessons-p2.js` | Phase 2 lessons (Weeks 5–8: Work Presence & Casual Flow) |
| `js/lessons-p3.js` | Phase 3 lessons (Weeks 9–12: Executive Clarity & Spontaneous Fluency) |
| `js/logic.js` | Dates, weekly totals, dictation LCS diff, streaks, calendar & backups |
| `js/analyzer.js` | Offline transcript analyzer for L1 habits, pace, and AI coach prompt builder |
| `js/speech.js` | Browser speech synthesis, dialogue role-play, local mic recording, live captions |
| `js/timer.js` | Speaking & challenge countdown timer |
| `js/charts.js` | Weekly minutes and fluency trend SVG charts |
| `js/store.js` | IndexedDB storage for days, settings, and local audio recordings |
| `js/ui.js` | Shared page helpers |
| `js/app.js` | Screens |
| `sw.js` | Offline support. List any new file in `FILES` |

## Tests

```bash
npm test
```

```bash
npm run test:browser
```

`.gitignore` blocks backup files (`english-fluency-*.json`) so personal transcripts can't be committed by accident.

## Hosting & Deploying to GitHub Pages

Any static host works. All paths are relative, so it works unmodified in a subfolder of GitHub Pages. The page's Content Security Policy only allows requests to its own site (`media-src` includes `blob:` for local voice playback).

For standalone GitHub Pages, push this repo to GitHub and enable **Settings → Pages → Deploy from branch `main` (root folder)**.

### Deploying to `rajeswarandhandapani.com/english-fluency/` with `git subtree`

Like `kid-Learning-games` (`games/`), `money-manager`, and `workout-tracker`, classic GitHub Pages does not support Git submodules, so files are mirrored into `rajeswarandhandapani.github.io` using `git subtree`.

**Before pushing changes**, ensure any new JS/icon files are listed in `sw.js` (`FILES`) and bump `CACHE` if cached assets changed (`npm run test:browser` checks `sw.js` coverage).

**One-time setup** (after creating and pushing `english-fluency` to `main`):

```bash
cd c:\prorajes\repos\rajeswarandhandapani.github.io
git subtree add --prefix=english-fluency git@github.com:rajeswarandhandapani/english-fluency.git main --squash
git push origin master
```

**Syncing future updates** (after pushing new commits to `english-fluency`):

```bash
cd c:\prorajes\repos\rajeswarandhandapani.github.io
git subtree pull --prefix=english-fluency git@github.com:rajeswarandhandapani/english-fluency.git main --squash
git push origin master
```

`--squash` keeps `english-fluency`'s full commit history out of the website repo's log—only one squashed commit lands per sync.

