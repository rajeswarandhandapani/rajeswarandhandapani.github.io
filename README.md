# Workout Tracker

A daily log for a 12-week heart-health plan: three gym days, three cardio days and one rest day
each week. It runs entirely in the browser with no server or account, and works offline once
it has been opened. Logs stay on the device.

## Run it

```bash
npm start
```

Then open http://localhost:4175. Node is the only requirement.

## How it is built

Plain HTML, CSS and JavaScript modules, with no framework, build step or third-party runtime code.

| File | Purpose |
| --- | --- |
| `js/plan.js` | The plan itself: schedule, exercises, targets and guidance |
| `js/logic.js` | Dates, weekly totals, day status and backup checks |
| `js/app.js` | Screens |
| `js/timer.js` | Rest timer |
| `js/charts.js` | Progress charts |
| `js/art.js` | Exercise drawings, made in code with generic machine shapes |
| `js/store.js` | IndexedDB storage |
| `js/ui.js` | Shared page helpers |
| `sw.js` | Offline support. List any new file in `FILES` |

Web apps can't start an Apple Watch workout or read its data, because Apple only exposes that to
native apps. The Watch steps in each routine are reminders of which workout to choose.

To change the plan, edit `js/plan.js`. Personal details and lab results are deliberately left out
of the code, because this repository may be published.

## Tests

```bash
npm test
```

```bash
npm run test:browser
```

Tests use made-up workouts. `.gitignore` blocks backup files, so personal logs can't be
committed by accident.

## Hosting & Deploying to GitHub Pages

Any static host works. All paths are relative, so it can live in a subfolder of GitHub Pages.
The page's Content Security Policy only allows requests to its own site.

For standalone GitHub Pages, push this repo to GitHub and enable **Settings → Pages → Deploy from branch `main` (root folder)**.

### Deploying to `rajeswarandhandapani.com/workout-tracker/` with `git subtree`

Classic GitHub Pages does not support Git submodules, so files are mirrored into `rajeswarandhandapani.github.io` using `git subtree`.

**Before pushing changes**, ensure any new JS/icon files are listed in `sw.js` (`FILES`) and bump `CACHE` if cached assets changed (`npm run test:browser` checks `sw.js` coverage).

**One-time setup (already done):** imported this repo into `rajeswarandhandapani.github.io` as a squashed subtree:

```powershell
cd c:\prorajes\repos\rajeswarandhandapani.github.io
git subtree add --prefix=workout-tracker git@github.com:rajeswarandhandapani/workout-tracker.git main --squash -m "Add workout-tracker ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
git push origin master
```

**Syncing future updates** (after pushing new commits to `workout-tracker`):

```powershell
cd c:\prorajes\repos\rajeswarandhandapani.github.io
git subtree pull --prefix=workout-tracker git@github.com:rajeswarandhandapani/workout-tracker.git main --squash -m "Sync workout-tracker ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
git push origin master
```

`--squash` keeps `workout-tracker`'s full commit history out of the website repo's log—only one squashed commit lands per sync. Passing `-m` avoids opening Vim (in Git Bash, macOS, or Linux, swap `$(Get-Date -Format 'yyyy-MM-dd HH:mm')` with `$(date '+%Y-%m-%d %H:%M')`).

