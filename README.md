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
and the 216 compound letters (உயிர்மெய் எழுத்துக்கள்), 2 minutes per
question, 4-choice multiple choice matching the Tamil letter to its
romanized sound. Vowel/consonant quizzes ask one question per letter;
the compound-letter quiz asks 30 random letters out of the 216. Pick a
group with the buttons on the start screen or via a query param:
`?type=vowels`, `?type=consonants`, `?type=uyirmei`, or practice a single
consonant's row of 12 with `?type=uyirmei&base=க`.

Two play directions, combinable with any letter group: **Read & Match**
(default — see the letter, tap its sound) and **Listen & Find**
(`?mode=listen` — the browser says the letter in Tamil and the child taps
the matching glyph, no reading required). Listening needs a Tamil (ta-*)
speech-synthesis voice on the device: Android, iOS and Edge ship one,
Windows needs the Tamil language pack, and desktop Chrome's built-in
Google voices don't include Tamil. When no Tamil voice is found the game
warns on the start screen and shows the romanized sound as the prompt
instead, so it stays playable everywhere. Wrong choices in listen mode
always sound different from the answer (ந்/ன் are never offered against
each other) and the short/long partner (அ/ஆ, கி/கீ) is always among the
choices, since that's the classic listening mix-up.

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

15 questions, 2 minutes each, 4-choice multiple choice. Mixes four kinds:
reading clock faces (the 24 clock emoji 🕐–🕧 cover every hour and
half-hour, so no images are needed), end times ("Soccer practice starts at
4:30 PM and lasts 45 minutes — when does it end?"), elapsed time ("How much
time passes from 2:20 PM to 4:05 PM?") and minute conversions (with the
classic "2 hours 15 minutes = 215" concatenation error as a distractor).
Times are handled as minutes-since-midnight so crossing noon works for
free. Practice one skill with `?type=clock` or `?type=elapsed`.

## Money & Making Change Quiz

15 questions, 2 minutes each (US coins and dollars, all arithmetic in
whole cents). Mixes coin counting ("How much money is 2 quarters, 1 dime
and 3 pennies?"), making change, adding two prices, and dollars→cents
conversion. Amounts under a dollar display as "63¢", the rest as "$1.15".
Practice one skill with `?type=coins` or `?type=change`.

## Tamil Words Quiz

The next step after the alphabets quiz: ~95 everyday words (animals, food,
nature, body parts, things, family, colors) with an emoji for each, stored
in `assets/js/tamil-words-data.js` (shared with the Tamil Word Builder
quiz). Two kinds: picture → Tamil word (🐘 → யானை) and
Tamil word → English meaning. Wrong choices are drawn from the same
category so the quiz tests real word recognition. 20 questions, 2 minutes
each; pick a kind with `?type=picture` or `?type=meaning`.

## Tamil Word Builder Quiz

Fill in the missing letter: a word from the shared vocabulary is shown with
one letter blanked out plus its emoji as a hint (யா__னை 🐘). Words are
split into letter clusters in code (base letter + vowel sign / புள்ளி), so
தேங்காய் becomes தே / ங் / கா / ய். Distractors are real clusters from
other words that share the answer's consonant (யா vs யி) or vowel sign
(யா vs கா), and a distractor is never allowed to complete a *different*
word from the vocabulary. 20 questions, 15 seconds each.

## Number Sounds Quiz (pre-K)

A listening game — no reading needed. The browser's built-in speech
synthesis (Web Speech API, no server or audio files) says a number out
loud; the child taps the matching numeral on extra-large buttons. Tapping
the 🔊 prompt repeats the number. The range is picked on the start screen
(1–5, 1–10, 1–20, 1–50, 1–100) or via `?max=N` (clamped to 4–100); each
number is asked at most once per round. Distractors prefer real mix-ups:
neighbours (6 vs 7) and teen/-ty pairs (13 vs 30). If speech is
unavailable the prompt falls back to the number word ("seven").

Because every audio question displays the same 🔊 prompt, the quiz engine
supports an optional `dedupeKey` on generated questions, used instead of
the prompt to prevent repeats.

## English Alphabets Quiz

Four modes, picked on the start screen or via `?mode=`:

- **Listen & Find** (default): speech synthesis says a letter name out
  loud, the child taps the matching letter — the alphabet counterpart of
  the Number Sounds game (10 questions, 15s each, tap the 🔊 to repeat).
- **BIG & small** (`?mode=case`): match a capital letter to its lowercase
  shape and vice versa (each direction is a separate question).
- **ABC Order** (`?mode=order`): a run of three letters is shown with a
  blank at the start or end (C D E __) — tap the missing letter.
- **First Letters** (`?mode=phonics`): a picture is shown and its word
  spoken ("apple") — tap the letter it starts with. One picture word per
  letter, A–Z.

Distractors mirror real kid mix-ups: rhyming letter *names* in listen mode
(B/C/D/E/G/P/T/V/Z, A/J/K, F/L/M/N/S/X…), lookalike *shapes* in case mode
(b/d/p/q, m/n/w, i/l/j), and alphabet neighbours in order mode. Phonics
mode never offers a distractor that makes the same starting sound as the
answer (C/K/Q, G/J, S/C). Without speech synthesis the audio modes degrade
into reading practice, like Number Sounds.

## Spelling Bee

Speech synthesis says a word out loud (tap the 🔊 to repeat it) and the
child picks the correct spelling from four choices. Three levels via the
start-screen buttons or `?level=1|2|3`: short phonetic words (cat, ship),
longer everyday words (banana, school) and tricky spellings (because,
knight, scissors) — 24 words per level, 15 questions per round.

Wrong choices are misspellings generated in code, ordered by how
convincing they are: sound-alike substitutions kids actually write
(freind, elefant, becauze, enuff), dropped unstressed vowels (choclate),
doubling errors (scisors, beautifull), dropped silent e, and
adjacent-letter swaps as filler. A generated misspelling is never allowed
to be a real word — "meet" must not offer "meat" — checked against all
game words plus a homophone list. Without speech synthesis the prompt
degrades to the word's emoji and a clue ("🐱 a pet that says meow").

## World Capitals Quiz

~70 countries with flag emoji, grouped by continent. Two directions via
`?mode=` (country → capital by default, `?mode=country` for capital →
country) and a continent filter via `?region=asia|europe|africa|americas|
oceania`; direction and region combine freely. Distractors prefer capitals
from the same continent, and countries whose most famous city is *not*
the capital carry a trap city (Australia → Sydney, Turkey → Istanbul,
Canada → Toronto…) that is always among the choices in capital mode —
that's the mix-up everyone actually makes.

## Counting Quiz (pre-K)

A cluster of identical emoji is shown (🍎🍎🍎🍎🍎 🍎🍎) and the child taps
how many there are, on extra-large buttons. Groups bigger than five are
split into rows of five so kids can count in fives. The range is picked on
the start screen (1–5, 1–10, 1–20) or with `?max=N`; each count is asked at
most once per round (via `dedupeKey`, since the same count can appear with
different emoji). Distractors are the neighbours (n±1, n±2) — where you
land when you skip or double-count one. 20 seconds per question (30 for
the 1–20 range).

## Comparing Numbers Quiz

Three kinds: tap the **biggest** of four numbers, tap the **smallest**, and
pick the right **< > = sign** for a pair ("37 __ 73", with equal pairs
showing up often enough that = stays a live option). Pick a kind with
`?type=biggest|smallest|symbol` and a range with `?max=10|100|1000`
(default 100); both have start-screen buttons and combine freely. The
numbers are built to be tricky: half the sets use the same digits scrambled
(37, 73, 33, 77) — the classic compare-the-wrong-digit-first trap — and the
rest are close neighbours. 15 questions, 10 seconds each.

## Addition & Subtraction Facts Quiz

The step before the multiplication tables: 20 questions, plain facts like
"7 + 8" and "52 − 38". Pick the operation (`?op=add|sub`, default mixes
both) and the range (`?max=10|20|100`, default 20 — 100 means two-digit
problems at 15 seconds instead of 10). Distractors mirror real kid slips:
off-by-one/two everywhere, forgetting the carry or borrow (±10) on
two-digit problems, and the classic column-subtraction error of
subtracting the smaller digit from the larger in each column (52 − 38
→ 26).

## Calendar Quiz

15 questions, 15 seconds each. Day questions: what comes after/before a
day, "if today is Friday, what was yesterday?", the nth day of the week
(weeks start on Sunday, like a wall calendar — and the counted-from-Monday
answer is always among the wrong choices), days in a week/weekend. Month
questions: after/before, the nth month, how many days a month has
(February is asked as "the shortest month" instead, so leap years never
make an answer wrong), months in a year, days in a year (with 356 — the
scrambled 365 — as a distractor). Wrap-arounds (after Saturday, after
December) come up deliberately often. Practice one half with `?type=days`
or `?type=months`.

## Fractions Quiz

15 questions, 20 seconds each, four kinds: read a fraction picture built
from squares (🟩🟩🟩⬜⬜ — what fraction is green?), find the **equivalent**
fraction ("Which equals 1/2?"), **compare** four fractions (same
denominator, or same numerator — where "bigger denominator means bigger
piece" is exactly the trap), and **add & subtract** with like denominators.
Distractors are the real mistakes: counting the white squares (2/5),
part-over-part (3/2), flipping the fraction (5/3), adding tops *and*
bottoms (1/4 + 2/4 = 3/8), and adding instead of multiplying to grow an
equivalent (1/2 → 2/3). A distractor is never allowed to *equal* the
correct answer in value (2/4 is never offered against 1/2), checked by
cross-multiplication. Practice one kind with
`?type=identify|equivalent|compare|add`.

## Baby Animals Quiz

~27 animals with emoji, two directions mixed by default: "What is a baby
cow called? 🐮" and "Which animal has a baby called a joey?" (practice one
with `?mode=baby` or `?mode=animal`). Shared and synonymous baby names are
handled so exactly one offered answer is ever right: a calf is a baby cow,
elephant *and* whale, a cub belongs to bears, lions and tigers, and a baby
fox answers to kit, cub or pup — each animal carries an avoid-list and a
choice set never mixes two animals that share a name. 15 questions,
15 seconds each.

All of the above quizzes track per-mode best-time records with the same
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
