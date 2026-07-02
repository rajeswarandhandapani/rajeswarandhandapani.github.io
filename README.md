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

## Tamil Alphabets Quiz

One question per letter, covering the 12 vowels (உயிர் எழுத்துக்கள்) and 18
consonants (மெய் எழுத்துக்கள்), 10 seconds per question, 4-choice multiple
choice matching the Tamil letter to its romanized sound. Restrict to one
group via a query param, e.g.
`games/tamil-alphabets/index.html?type=vowels` or `?type=consonants`.

## Running locally

No build step required — just open `index.html` in a browser, or serve the
folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

## Deploying to GitHub Pages

Push to GitHub and enable Pages for the repo (Settings → Pages → Deploy from
branch `main`, root folder).

This repo is also live at `https://rajeswarandhandapani.com/kid-games/`,
mirrored into the `rajeswarandhandapani.github.io` repo (that repo owns the
custom domain, and its classic Pages deploy doesn't support submodules, so the
files are physically copied in via `git subtree`).

### Syncing changes into the website repo

All paths in this repo are relative, so it works unmodified when copied into
a `kid-games/` subfolder of another site.

**One-time setup (already done):** imported this repo into
`rajeswarandhandapani.github.io` as a squashed subtree:

```
cd /path/to/rajeswarandhandapani.github.io
git subtree add --prefix=kid-games git@github.com:rajeswarandhandapani/kid-Learning-games.git main --squash
```

**After pushing new commits here**, pull them into the website repo:

```
cd /path/to/rajeswarandhandapani.github.io
git subtree pull --prefix=kid-games git@github.com:rajeswarandhandapani/kid-Learning-games.git main --squash
git push origin master
```

`--squash` keeps this repo's full commit history out of the website repo's
log — only one squashed commit lands per sync.
