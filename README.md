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

## Hosting

Any static host works. All paths are relative, so it can live in a subfolder of GitHub Pages.
The page's Content Security Policy only allows requests to its own site.
