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

25 random questions from tables 1-11 (capped to the number of unique
questions available for narrower selections), 10 seconds per question,
4-choice multiple choice, auto-advances (counted wrong) on timeout.
Restrict to specific tables via a query param, e.g.
`games/multiplication/index.html?tables=6,7,8`.

Tracks a **best-time record** per table selection (stored in
`localStorage`): total answering time is measured and a record is saved
only on a perfect score, so guessing fast never beats getting them right.

## Tamil Alphabets Quiz

Covers the 12 vowels (உயிர் எழுத்துக்கள்), 18 consonants (மெய் எழுத்துக்கள்)
and the 216 compound letters (உயிர்மெய் எழுத்துக்கள்), 10 seconds per
question, 4-choice multiple choice matching the Tamil letter to its
romanized sound. Vowel/consonant quizzes ask one question per letter;
the compound-letter quiz asks 30 random letters out of the 216. Pick a
group with the buttons on the start screen or via a query param:
`?type=vowels`, `?type=consonants`, `?type=uyirmei`, or practice a single
consonant's row of 12 with `?type=uyirmei&base=க`.

Sound conventions: vowels use English phonics (ee as in "see", oh as in
"go"); மெய் letters carry the புள்ளி (dot) and therefore map to the *pure*
consonant sound (க் = "k", not "ka"); capitalized N/L/R mark the retroflex
sounds ண்/ள்/ற். ந் and ன் both map to "n" since they share the same spoken
sound.

Compound letters are generated in code as consonant base + Unicode vowel
sign (க + ி = கி) with the sound composed the same way ("k" + "i" = "ki"),
so the full 18 × 12 grid never needs to be hand-written. Wrong-answer
choices for a compound letter are drawn from the same consonant row (கி vs
கீ/கை) or the same vowel column (கி vs சி/மி), so the quiz genuinely tests
recognition of the vowel signs.

## Rounding & Place Value Quiz

20 questions, 15 seconds each (sentence prompts need more reading time than
bare facts), 4-choice multiple choice. Mixes four question kinds:

- **Rounding** to the nearest 10 / 100 / 1,000 ("Round 3,472 to the nearest
  hundred"), using the school rule: 5 or more rounds up.
- **Digit at place** ("Which digit is in the tens place of 4,728?")
- **Value of digit** ("What is the value of the 7 in 4,728?")
- **Expanded form** ("3,000 + 400 + 20 + 5 = ?")

Distractors mirror real kid mistakes: rounding the wrong way, rounding to
the neighbouring place, picking the digit one place over, or scrambling the
order of digits. Place-value numbers always have four *distinct* digits so
the other digits of the number are safe wrong choices.

Practice one skill with `?type=rounding` or `?type=placevalue` (buttons on
the start screen); the default mixes both. Tracks a best-time record per
mode with the same rules as the multiplication quiz (perfect scores only).

## Time & Elapsed Time Quiz

15 questions, 20 seconds each, 4-choice multiple choice. Mixes four kinds:
reading clock faces (the 24 clock emoji 🕐–🕧 cover every hour and
half-hour, so no images are needed), end times ("Soccer practice starts at
4:30 PM and lasts 45 minutes — when does it end?"), elapsed time ("How much
time passes from 2:20 PM to 4:05 PM?") and minute conversions (with the
classic "2 hours 15 minutes = 215" concatenation error as a distractor).
Times are handled as minutes-since-midnight so crossing noon works for
free. Practice one skill with `?type=clock` or `?type=elapsed`.

## Money & Making Change Quiz

15 questions, 20 seconds each (US coins and dollars, all arithmetic in
whole cents). Mixes coin counting ("How much money is 2 quarters, 1 dime
and 3 pennies?"), making change, adding two prices, and dollars→cents
conversion. Amounts under a dollar display as "63¢", the rest as "$1.15".
Practice one skill with `?type=coins` or `?type=change`.

## Tamil Words Quiz

The next step after the alphabets quiz: ~95 everyday words (animals, food,
nature, body parts, things, family, colors) with an emoji for each, stored
as data in `game.js`. Two kinds: picture → Tamil word (🐘 → யானை) and
Tamil word → English meaning. Wrong choices are drawn from the same
category so the quiz tests real word recognition. 20 questions, 10 seconds
each; pick a kind with `?type=picture` or `?type=meaning`.

All three quizzes track per-mode best-time records with the same
perfect-score-only rule as the multiplication quiz.

## Running locally

No build step required — just open `index.html` in a browser, or serve the
folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

## Deploying to GitHub Pages

Push to GitHub and enable Pages for the repo (Settings → Pages → Deploy from
branch `main`, root folder).

This repo is also live at `https://rajeswarandhandapani.com/games/`,
mirrored into the `rajeswarandhandapani.github.io` repo (that repo owns the
custom domain, and its classic Pages deploy doesn't support submodules, so the
files are physically copied in via `git subtree`).

### Syncing changes into the website repo

All paths in this repo are relative, so it works unmodified when copied into
a `games/` subfolder of another site.

**One-time setup (already done):** imported this repo into
`rajeswarandhandapani.github.io` as a squashed subtree:

```
cd /path/to/rajeswarandhandapani.github.io
git subtree add --prefix=games git@github.com:rajeswarandhandapani/kid-Learning-games.git main --squash
```

**After pushing new commits here**, pull them into the website repo:

```
cd /path/to/rajeswarandhandapani.github.io
git subtree pull --prefix=games git@github.com:rajeswarandhandapani/kid-Learning-games.git main --squash
git push origin master
```

`--squash` keeps this repo's full commit history out of the website repo's
log — only one squashed commit lands per sync.
