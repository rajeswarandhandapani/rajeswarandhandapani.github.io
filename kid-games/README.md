# Kid Learning Games

Simple, timed multiple-choice quiz games for kids to learn and memorize things
(multiplication tables, spelling, etc). Pure HTML/CSS/JS + Bootstrap, no build
step, no server — deployable straight to GitHub Pages.

## Structure

```
index.html                 landing page listing all games
assets/css/common.css      shared styling used by every game
assets/js/quiz-engine.js   reusable QuizEngine (timer, scoring, results screen)
games/<game-name>/         one folder per game (index.html + game.js)
```

## Adding a new game

1. Create `games/<name>/index.html`, copying `games/multiplication/index.html`
   as a template (reuses the same start/quiz/results screen markup and IDs).
2. Create `games/<name>/game.js` with a question generator function:
   `(askedSet) => ({ prompt, correctAnswer, choices })`.
3. Instantiate `QuizEngine({ totalQuestions, timePerQuestion, generateQuestion })`
   and call `.start()`.
4. Add a card for it on the root `index.html`.

## Multiplication Tables Quiz

25 random questions from tables 1-12, 10 seconds per question, 4-choice
multiple choice, auto-advances (counted wrong) on timeout. Restrict to
specific tables via a query param, e.g. `games/multiplication/index.html?tables=6,7,8`.

## Running locally

No build step required — just open `index.html` in a browser, or serve the
folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

## Deploying to GitHub Pages

Push to GitHub and enable Pages for the repo (Settings → Pages → Deploy from
branch `main`, root folder).
