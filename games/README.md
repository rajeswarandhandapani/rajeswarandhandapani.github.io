# Little Learners · Kid Learning Games

84 browser-based learning activities for children, built with HTML, CSS, and JavaScript. Runs as a static site, including on GitHub Pages. No account or application server is required.

## Run and verify

```sh
npm install
npm start                 # http://localhost:4173
npm test                  # progress and storage regression tests
npx playwright install chromium
npm run test:e2e          # keep the local server running in another terminal
npm run test:bee          # Spelling Bee training: rules, words and every screen size
npm run build            # validates game links and copies static assets to site-output/
npm run test:tamil-games  # plays every Tamil activity with recorded audio (server running)
npm run test:math         # plays the visual × and ÷ games; checks every picture matches its answer
npm run test:pictures     # plays every new and picture-upgraded game; checks each picture against its answer
npm run test:review       # for each covered game, misses a question and checks it comes back in a review
npm run test:levels       # plays the harder number levels and works out every answer again from the screen
npm run test:newgames     # plays the eight v4 games with real taps at phone widths
npm run test:ux           # the layout checks: taps to a game, words on screen, button sizes, contrast, keyboard
npm run new-game -- <id> "<Name>" <icon> …   # scaffolds a hand-built game and lists it in the catalogue
npm run sync:index        # keeps the home page title count and <noscript> list in step with the catalogue
npm run sw                # rewrites sw.js, the offline file list (npm run build does this too)
npm run test:offline      # visits once, goes offline, then plays games from the saved copy
```

`BASE_URL` can point the browser tests at another local server. Screenshots are saved under `artifacts/` and ignored by Git.

## Learning experience

- Nobody is asked their age. A child taps **Play next** or a picture tile to see that subject's games, easiest first. Each game has its own row of age buttons (🐣 3–5, 🧱 5–7, 🚀 7–9, 🧠 9+), listing only the ages it suits.
- The level chosen in a game is remembered for that game, and a game not played yet opens at the closest age, so a child only has to choose once. Levels are listed in `GAME_LEVELS` in `assets/js/catalogue.js`.
- Five **learning paths** (Math, English, Tamil, Science & world, Thinking skills) put each subject's games in a sensible order. Each game shows a ✓ once it has a star, and a *Next up* chip points at the first one without.
- **All games** (`#all`) has search and filters by subject and age, for grown-ups and older children. A heart saves a favorite.
- The **For grown-ups** panel has a progress report: stars, the last five scores and the last-played date for every skill, plus *Needs practice* and *Ready for next* lists. It stays on this browser and has a print button.
- Untimed practice is the default. Children read feedback and choose when to continue. Optional timed challenge rounds retain speed records.
- Story Detectives adds short-story comprehension; Animal Homes teaches habitats with explanations; Memory Garden draws a new picture mix for 6, 8, 10, or 15 pairs.
- Sentence questions are spoken automatically when the browser has speech synthesis. A Listen button replays them; word answer tiles and game instructions have their own speaker buttons. Shapes & Colors uses picture and color tiles where reading the label is unnecessary. Existing letter, number, and Tamil audio modes keep their dedicated pronunciation.
- Picture Words, Feelings Faces, and What Do We Use? let children answer entirely with pictures. Spoken words and stories build vocabulary, emotional recognition, and everyday reasoning.
- Shared keyboard focus, audio replay with Enter/Space, visible answer symbols, feedback announcements, and reduced-motion support.
- A grown-up panel explains learning stages and browser-local progress, with a confirmed reset action.
- Existing Bootstrap, confetti, emoji, and Tamil font assets are bundled locally. No CDN or external font requests are needed to load the app. Speech synthesis still depends on browser/OS voice availability; some voices may require network access.

This is an educational practice app, not a standardized assessment. Age ranges are starting points. Progress belongs to the current browser and is not synchronized across devices. Practice awards stars and XP but does not set speed records. Memory Garden awards completion stars, not an accuracy assessment.

## Version 4

Version 4 adds Review My Mistakes, much bigger question banks, 8 games, harder number levels and a layout a 3-year-old can use.

### A layout children can use alone

The home page has one job per view. The address hash picks the view, so the Back button works.

| View | Address | What it shows |
| ---- | ------- | ------------- |
| Home | none | **▶ Play next**, **🔁 Try again** when questions are due, rank and streak, and six picture tiles showing each subject's progress |
| Subject | `#world/math` | All of that subject's games, easiest first, each showing the ages it suits |
| Favorites | `#world/favorites` | Games marked with a heart |
| My stars | `#me` | Rank, XP, streak and badges |
| All games | `#all` | Search and filters over all 84 games |

Nobody is asked their age, and progress is shared on one device. `gamesFor`, `nextFor` and `nextAfter` in `catalogue.js` choose the games.

`assets/js/page-shell.js` (`KlgShell`) loads last on every game page and needs no per-game code:

- **Top bar:** 🏠 Home back to the child's subject, the game's name and 🔊 sound, in the subject's colour.
- **Start screen:** picture, name, one big **▶ Play** and 🔊 Hear how to play. Levels, modes and tips fold under **⚙️ More ways to play**, which opens by itself when the address already has a setting.
- **Play screen:** back, progress and score on one row, with the speaker beside the question. Feedback scrolls into view and **Next** sticks to the bottom of the screen.
- **Finish:** **▶ Next game**, Play again and Home come before any list of missed questions.

The colours and sizes are the `Kid theme` section at the end of `assets/css/common.css`: a twilight storybook, with a sky in each subject's colour and gold for anything that means "go". The pictures (sky, hills, the owl and one scene per subject) are SVG files in `assets/art`, saved for offline use like everything else. `npm run test:ux` holds the layout to numbers at five screen sizes, so it cannot quietly slip back.

### Review My Mistakes

A missed question comes back the next day, inside its own game. One right answer brings it back after 3 days, and a second right answer clears it. A wrong answer restarts the schedule. It earns 5 XP per right answer and keeps the day streak, but never changes stars or recent scores. The grown-up report lists the trickiest questions.

Each miss is saved as a self-contained copy, since most questions are random. Pictures are stored as HTML. It covers the 73 games built on `QuizEngine` or `KlgRound`. It does not cover memory-match, tamil-memory, tamil-letter-chart, tamil-letter-pop, tamil-tracing, array-garden, multiples-hunt, share-fairly, tamil-word-puzzle, tamil-sentence-words or tamil-missing-letters.

For review to work, a game must:

- Put per-question page setup (speaking, prompt classes) in the `prepareQuestion` option, not in `generateQuestion`.
- Return plain data from `KlgRound`'s `make()`, draw everything in `render()` from it, compare data by value and not by object, and decide what is asked in `make()`.

### Bigger question banks

Hand-written banks now live in `games/<id>/questions.js`, where `tests/banks.test.cjs` can check them without a browser. The rule is at least three rounds' worth of questions for each level or mode.

| Game | Before | Now |
| ---- | ------ | --- |
| Story Detectives | 12 | 40 |
| Animal Homes | 12 | 43 |
| Science Quiz | 57 | 120 (a single topic now plays a 10-question round) |
| Solar System written facts | 25 | 45 |
| Feelings Faces | 18 | 40 |
| What Do We Use? | 24 | 41 |
| Baby Animals | 27 | 45 |
| Sort It! sets | 3 and 3 | 15 and 17 |
| Sentence Builder | 15 and 14 | 30 and 30 |
| Story Order | 12 | 24 |
| Word Families | 10 families | 19 |
| Spelling Bee | 24 a level | 45 a level |
| World Capitals | 69 | 119 |
| Map Explorer places | 15 | 30 |
| Tamil sentence bank | 32 | 60 |
| Tamil Story Time | 6 | 12 |

**Harder number levels:** tables to 12, three-digit adding and subtracting (`?max=1000`), two-digit division (`?level=4`), fractions with different denominators (`?level=4`), comparing to 10,000 (`?max=10000`) and five-digit rounding and place value (`?level=4`).

Memory Garden also has a 15-pair board.

### New games

| Subject | Game | What the child does |
| ------- | ---- | ------------------- |
| Thinking skills | Odd One Out | Find the picture that does not belong, then hear why |
| Thinking skills | Who Am I? | Read clues one at a time and tap the answer |
| Thinking skills | Robot Path | Plan arrow steps to guide a robot to the star |
| English | Word Detective | Sort naming, doing and describing words |
| English | Punctuation Pals | Choose . ? or ! to finish a sentence |
| Math | Number Bonds | Find the missing part of a whole |
| Science & world | Stay Safe & Healthy | Choose the safe thing to do in a little story |
| Tamil | சொல் வரிசை | Put Tamil word tiles in order to make a sentence |

### Puzzle games

Four more Thinking skills games, each a different kind of puzzle. Each has `?level=1|2|3`, and works by tap and keyboard; the two with pieces can also be dragged.

| Game | Ages | What the child does | Levels |
| ---- | ---- | ------------------- | ------ |
| Piece Together | 3–9 | Fit a cut-up picture back together. The first slip on a puzzle is only a nudge | 4 pieces over a faint picture, 6 with a small copy beside the board, 9 with no help |
| Picture Squares | 5+ | Put each picture once in every row and column. Check marks the squares that clash | 3 × 3, 4 × 4, 5 × 5 |
| Pipe Garden | 5+ | Turn pipes to join the tap to the flower, then turn on the water and see how far it gets | 3 × 3, 4 × 4, 5 × 5 with spare three-way pipes |
| Who Lives Where? | 5+ | Use clues to put each animal in its house. Check points at a clue that is not true yet | 3, 4 or 5 houses |

Every puzzle starts from a solved state, so it can always be finished. The rules for making them are in `games/picture-squares/puzzle.js`, `games/pipe-garden/puzzle.js`, `games/who-lives-where/puzzle.js` and `games/piece-together/scenes.js`, and they run in node too. `tests/puzzles.test.cjs` generates hundreds of each and checks them with its own solving code: Picture Squares and Who Lives Where? have exactly one answer, a Picture Squares puzzle can be finished without guessing, every clue is needed, and Pipe Garden's route joins up.

### Tamil review

New Tamil was written by Claude and has not been read by a native speaker. [`docs/TAMIL-REVIEW-v4.md`](docs/TAMIL-REVIEW-v4.md) lists every new line with its English meaning, plus the older lines that were never checked. Please read it before pushing.

## Picture everything (v3)

Version 3 makes every game picture-first and adds 21 new games. Shared pictures
live in `assets/js/visuals/` (each one is a plain function that returns a
`<figure role="img">` with a spoken `aria-label` and `data-*` values the tests
read):

| Module | Draws |
| ------ | ----- |
| `clock.js` · `KlgClock` | analog clocks (draggable when `interactive`), digital time, a timeline for elapsed time |
| `fractions.js` · `KlgFracVis` | pies, bars, sets of things, number lines, stacked bars, a pie you shade by tapping |
| `money.js` · `KlgMoneyVis` | US coins and notes (generic drawings), trays, price tags, fewest-coin change |
| `measure.js` · `KlgMeasureVis` | ruler with a movable marker, balance scale, measuring jug, thermometer |
| `place-value.js` · `KlgBlocks` | base-10 blocks up to thousands, place-value chart, ten-frames |
| `charts.js` · `KlgPictograph` | picture graphs, bar charts, tally marks |
| `shapes.js` · `KlgShapes` | flat shapes and solids (cube, sphere, cylinder, cone, pyramid) |
| `scene.js` · `KlgScene` | emoji scenes: weather, seasons, habitats |

`assets/js/play-kit.js` (`KlgPlayKit`) holds the interaction mechanics:
`dragToBins`, `dragTo`, `orderCards`, `tapHotspots` and `buildFromTiles`. Every one works by
tap or click and by keyboard. Dragging is an extra. `assets/js/round-kit.js`
(`KlgRound`) runs the question loop of the hand-built games and records progress.
`assets/js/word-pictures.js` is the shared word → picture list.

### Existing games made pictorial

| Game | New pictures |
| ---- | ------------ |
| Fractions | pies, bars and sets; picture answers; `?type=picture`; `?level=1\|2\|3` |
| Time | analog clocks, *which clock?*, timelines; `?level=1\|2\|3` (o'clock → any minute) |
| Money | drawn coins and notes, *which coins make 37¢?*, price tags; `?level=1\|2\|3` |
| Measurement | `?mode=read`: ruler, jug, thermometer and balance scale |
| Rounding & Place Value | base-10 blocks to thousands, a rounding number line; `?level=1\|2\|3` (3 = no pictures) |
| Comparing Numbers | ten-frames (to 10), blocks (to 100), place-value charts (to 1,000) |
| Addition & Subtraction | two-colour ten-frames, struck-out counters, blocks |
| Counting | `?mode=tenframe\|dice` |
| Patterns & Skip Counting | frog-hop number lines and growing dot towers |
| Calendar | `?type=grid`: questions on a drawn month |
| Multiplication / Division | a **💡 Show me** button draws the fact (never automatic) |
| Science Quiz | a picture clue for every question; picture answers when every choice has one |
| Solar System | drawn planets in a Sun-to-Neptune strip; *which picture is Saturn?* |
| World Capitals | flags and landmarks; `?mode=flag` |
| Rhyming Words, Opposites | `?mode=picture` |
| Spelling Bee | the word's picture at every level |
| English Alphabets | 60 phonics pictures |
| Shapes & Colors | drawn polygons; `?mode=solid` for 3D shapes |
| Tamil Words | `?type=wordpic` (word → picture) |
| Tamil Alphabets | an example word and picture after each answer |
| Animal Homes | habitat scenes as the answers |
| Baby Animals, Story Detectives | a picture for each question or story |

### New games

All have `?level=` (or `?mode=`) settings and need no account, network or timer.

| Subject | Game | What the child does |
| ------- | ---- | ------------------- |
| Math | Set the Clock | drag the clock hands (or use the buttons) to a time |
| Math | Pizza Fractions | shade slices, shade an equal fraction, order three pizzas |
| Math | Coin Shop | tap coins and notes to pay exactly, or with the fewest pieces |
| Math | Block Builder | build, trade (10 ones → 1 ten) and read base-10 blocks |
| Math | Shape Detectives | count sides, tap every shape of one kind, find a mirror image |
| Math | Measure Lab | slide a ruler marker, balance a scale, pour a jug |
| Math | Picture Graphs | read picture graphs and bar charts, make tally marks |
| English | Sound It Out | blend letters into a picture word, spell a picture word from tiles |
| English | Word Families | sort picture words into -at, -og, -ip… houses |
| English | Sight Word Pop | hear a common word, pop its bubble |
| English | Sentence Builder | put word tiles in order to describe a picture |
| English | Story Order | put 3–5 picture cards in order, then hear the retelling |
| Tamil | நாட்கள் · நிறங்கள் | days, months and colours, with recordings (`?mode=days\|months\|colours`) |
| Tamil | படம் பார்த்து சொல் | read a Tamil sentence, pick its picture |
| Tamil | Tamil–English Match | join Tamil words to pictures or English words |
| Tamil | கதை நேரம் | four-picture Tamil stories with a picture question |
| Science & world | Life Cycles | what comes next, or put a life cycle in order |
| Science & world | My Body | tap body parts on a drawn child, match the senses |
| Science & world | Sort It! | living / not living, float / sink, land / water / air… |
| Science & world | Weather & Seasons | dress for the weather, name the season |
| Science & world | Map Explorer | tap continents and oceans, find where animals and landmarks belong |

Picture rules for every game: wrong choices never include something that is
quietly also right; a picture never shows the answer to a question that is
asking you to read it out; every drag has a tap alternative; no external image
or font is loaded.

## Seeing multiplication and division

Seven activities teach × and ÷ with pictures, hands-on play and real-life
stories, before children practise the bare facts in Multiplication and
Division. Each one has three levels (`?level=1|2|3`).

| Game | Level | What the child does | Modes |
| ---- | ----- | ------------------- | ----- |
| Picture Multiplication | 2 | Count equal groups on plates, arrays of flowers and frog hops on a number line. Also pick the picture that shows 3 × 4, or the number sentence for a picture. Each answer shows its repeated addition. | `?mode=groups\|arrays\|hops\|match\|sentence` |
| Picture Division | 2 | Share among children, group into boxes, hop back to 0, split rows, and handle leftovers. After answering, the picture changes to the solved version. | `?mode=share\|group\|hops\|rows\|leftover` |
| Share It Fairly | 2 | Deal treats onto friends' plates. The game spots an unfair share. Then say how many each friend gets and how many are left over (14 ÷ 4 = 3 r 2). | |
| Market Day | 3 | Illustrated stories: prices in ₹, packs, seats in rows, animal legs, weeks, and "times as many". Level 3 adds change from a note, unit price, and remainder stories that round up (boats) or down (what can you afford). | |
| Fact Family Triangles | 3 | Find the hidden corner of 3 · 4 · 12, or spot the fact that doesn't belong. All four facts are shown afterwards. | `?tables=3,4` |
| Array Garden | 3 | Drag to plant exact arrays (rows go across). Find every way to plant 24, which covers factor pairs and turn-arounds. | |
| Multiples Hunt | 3 | Tap every multiple on a hundred square and watch the pattern appear (columns, diagonals, digit sums). | `?n=7` |

The pictures are drawn by `assets/js/math-visuals.js` (`KlgMathVis`). Every
picture has a spoken-language `aria-label`. QuizEngine questions can now
carry a `visual` (shown above the prompt) and `choiceVisuals` (picture
answer buttons). Hand-built games share `assets/js/game-kit.js` for the
finish panel, celebrations and mode links.

## Learning Tamil with real voices

Every Tamil activity speaks with **human recordings**, not the device's
text-to-speech, so Tamil pronunciation no longer depends on whether a
phone or computer happens to have a Tamil voice installed (desktop Chrome
has none).

- **Letters:** all 12 vowels (உயிர்), all 18 consonants (மெய்) and ஃ are
  recorded by one speaker. 41 of the 216 compound letters (உயிர்மெய்)
  have their own recording. The rest are taught the traditional way, by
  blending the two recorded parts: க் … இ … கி. The device's Tamil voice,
  if there is one, then says the whole letter.
- **Words:** 102 of the 108 picture words, all 10 numbers (ஒன்று–பத்து) and
  the sentence-game answers are recorded. The 6 unrecorded words (ஆப்பிள்,
  திராட்சை, எலுமிச்சை, மின்னல், கத்தரிக்கோல், வெள்ளை) fall back to the
  device voice. Listening games only ask recorded words.
- **Source:** [Wikimedia Commons](https://commons.wikimedia.org/) and
  [Lingua Libre](https://lingualibre.org/), CC BY-SA 3.0/4.0 and CC0. Every
  file is credited in [`assets/audio/tamil/CREDITS.md`](assets/audio/tamil/CREDITS.md).
  The audio is shared under those licences. It is not covered by the code's licence.
- **Size:** 205 small MP3 files, 2.0 MB in total. A file loads only when it is played.
- **Days, months and colours:** all 7 days, 9 of 12 months and 8 of 10 colours are recorded (`assets/js/tamil-days-data.js`). The rest use the device voice when there is one.

`npm run audio:tamil` (`scripts/fetch-tamil-audio.cjs`) rebuilds everything
reproducibly. It finds each text on Commons and records the chosen source
in `scripts/tamil-audio-sources.json`. It then downloads the original
(cached in the git-ignored `.cache/`), trims silence and stray clicks,
normalizes loudness and writes `assets/audio/tamil/*.mp3`,
`assets/js/tamil-audio-manifest.js` and the credits file. It needs
`ffmpeg` on the `PATH` or in `FFMPEG`. Add a word to
`tamil-words-data.js` and re-run it to pick up any new recording.

Shared building blocks: `assets/js/tamil-kit.js` (letter tables,
orthographic splitting, numbers), `assets/js/tamil-audio.js`
(`KlgTamilAudio.say/blend/sequence`), `assets/js/tamil-games.js`
(rewards for hand-built games) and `assets/css/tamil-games.css`.

### The Tamil activities

The home page has a Tamil tile, with a 14-step **Tamil learning path** across the ages (21 games).

| Game | What the child does | Modes |
| ---- | ------------------- | ----- |
| Tamil Letter Chart (எழுத்து அட்டவணை) | Tap any of 247 letters to hear it. See its sound, its parts (க் + இ) and an example word. Tap a row or column header to hear it all. | `?tab=uyir\|mei\|uyirmei` |
| Letter Bubbles (எழுத்துக் குமிழ்கள்) | Hear a letter or word and pop the floating bubble that shows it. | `?set=vowels\|consonants\|mixed\|words` |
| Trace Tamil Letters (எழுதிப் பழகுவோம்) | Trace big dotted letters with a finger. The tracing is checked against the letter's shape. | `?set=vowels\|consonants\|uyirmei` |
| Listen & Find (கேட்டுக் கண்டுபிடி) | Hear a word and tap its picture. No reading needed. | `?cat=animals\|food\|body\|things\|nature\|people` |
| Tamil Numbers (எண்கள்) | Count pictures and pick the number word, hear a number, or read Tamil numerals ௧–௰. | `?mode=count\|listen\|numerals` |
| Short or Long? (குறில் · நெடில்) | Decide whether a sound is short or long, or tell இ from ஈ by ear. | `?mode=hear\|see\|pair` |
| Sound Blender (க் + இ = கி) | Blend a consonant and a vowel into a compound letter, or split one apart. | `?mode=see\|listen\|split`, `?group=hard\|soft\|middle` |
| First Letter (முதல் எழுத்து) | See a picture, hear its word and pick the letter it starts with. | `?start=all\|vowel` |
| Tamil Memory (நினைவுப் பொருத்தம்) | Match picture cards to word cards, or vowels to their signs (ஆ ↔ கா). | `?mode=words\|signs` |
| What Comes Next? (அடுத்த எழுத்து) | Fill the gap in the letter order. | `?set=vowels\|consonants\|rows` |
| Tamil Word Puzzle (சொல் புதிர்) | Hear a word and build it from letter tiles, with look-alike tiles at higher levels. | `?level=1\|2\|3` |

The existing Tamil games also use the recordings now. Tamil Alphabets'
listen mode works on every device. Tamil Words, Word Builder and the two
sentence-typing games say the word after each answer, and the typing
games have a 🔊 Hear the word button.

## Tamil sentence typing

Two separate activities use a 60-sentence bank covering animals, nature, and everyday life:

- **Tamil Sentence Words** (`games/tamil-sentence-words/`): type the whole missing Tamil word in a sentence. An English word clue and picture identify the intended answer. Common alternatives such as பசு / மாடு are accepted.
- **Tamil Missing Letters** (`games/tamil-missing-letters/`): type one missing Tamil orthographic letter within the sentence's target word. Vowel signs and pulli stay attached; one-letter words are excluded from this mode.

Both accept device Tamil keyboards and an on-screen keyboard with vowels, consonants, compound forms, deletion, and a pinned answer preview. They support Unicode normalization and IME composition. There is no Latin-to-Tamil transliteration: switch your device input to Tamil or use the on-screen keys.

Rounds contain up to 10 different sentences. Wrong answers allow retries. “Show answer” reveals the target for typing practice; stars reflect sentences completed without revealing, and the results review includes every completed sentence. Unfinished rounds do not record progress.

```sh
npm run test:tamil        # local server must be running; requires Playwright
```

The shared content is in `assets/js/tamil-sentences-data.js`; UI logic is in `assets/js/tamil-typing.js`. `tests/tamil-typing.test.cjs` verifies normalization, orthographic splitting, and keyboard coverage of all words and accepted alternatives.

## Structure

```
index.html                 landing page, rendered from the catalogue (count and <noscript> list synced by scripts/sync-index.cjs)
assets/css/common.css      shared styling used by every game
assets/css/visuals.css     styling for the shared pictures and play mechanics
assets/js/catalogue.js     KlgCatalogue — every game, its level, subject, skills and the learning paths; picks games by age
assets/js/page-shell.js    KlgShell — the same top bar, start screen and play header on every game page
assets/js/visuals/         clock, fractions, money, measuring, blocks, graphs, shapes, scenes
assets/js/play-kit.js      KlgPlayKit — sort, order, tap-a-part and tile-building mechanics
assets/js/round-kit.js     KlgRound — the question loop of the hand-built picture games
assets/js/word-pictures.js KlgWordPics — word → emoji list
assets/js/tamil-days-data.js  Tamil days, months and colours
assets/js/quiz-engine.js   reusable QuizEngine (timer, scoring, results screen)
assets/js/progress.js      KlgProgress — XP, ranks, stars, day streak, badges
assets/js/home.js          landing page: player card, daily challenge, stars
assets/js/sounds.js        KlgSounds — synthesized sound effects + mute button
assets/js/math-visuals.js  KlgMathVis — groups, arrays, number lines, fact triangles
assets/js/game-kit.js      KlgGameKit — finish panel, cheers, mode links for custom games
assets/js/tamil-kit.js     KlgTamil — Tamil letter tables, letter splitting, numbers
assets/js/tamil-audio.js   KlgTamilAudio — plays recorded Tamil (blend / TTS fallback)
assets/audio/tamil/        recorded Tamil letters & words + CREDITS.md
scripts/fetch-tamil-audio.cjs  rebuilds the Tamil audio from Wikimedia Commons
scripts/new-game.cjs       scaffolds a new hand-built game
scripts/sync-index.cjs     keeps index.html's count and <noscript> list in step with the catalogue
games/<game-name>/         one folder per game (index.html + game.js, and questions.js or puzzle.js when it has a hand-written bank or a puzzle maker)
```

## Levels

`assets/js/catalogue.js` sorts every game into four levels, roughly by age. A child's chosen age shows the games at that
level. Levels are a property of the home page only — each game is still a standalone
page you can link to directly.

| Level | Name | Ages | Games |
| ----- | ---- | ---- | ----- |
| 1 | First Steps 🐣 | 3–5 | Number Sounds, Counting, Shapes & Colors, English Alphabets, Tamil Alphabets, Rhyming Words, Baby Animals, Memory Garden, Picture Words, Feelings Faces, What Do We Use?, Tamil Letter Chart, Listen & Find, Letter Bubbles, Trace Tamil Letters, Tamil Numbers, Sound It Out, Word Families, Sight Word Pop, Story Order, Tamil Days & Colours, My Body, Sort It!, Weather & Seasons, Odd One Out, Number Bonds, Stay Safe & Healthy, Piece Together |
| 2 | Building Blocks 🧱 | 5–7 | Comparing Numbers, Addition & Subtraction, Patterns & Skip Counting, Opposites, Calendar, Tamil Words, Story Detectives, Animal Homes, Tamil Sentence Words, Tamil Missing Letters, Short or Long?, Sound Blender, First Letter, Tamil Memory, What Comes Next?, Picture Multiplication, Picture Division, Share It Fairly, Set the Clock, Block Builder, Shape Detectives, Picture Graphs, Sentence Builder, Tamil Picture Sentences, Tamil–English Match, Life Cycles, Who Am I?, Robot Path, Word Detective, Punctuation Pals, சொல் வரிசை, Picture Squares, Pipe Garden |
| 3 | Level Up 🚀 | 7–9 | Multiplication, Division, Fractions, Time, Money, Measurement, Spelling Bee, Tamil Word Builder, Tamil Word Puzzle, Market Day, Fact Family Triangles, Array Garden, Multiples Hunt, Pizza Fractions, Coin Shop, Measure Lab, Tamil Story Time, Who Lives Where? |
| 4 | Brain Boost 🧠 | 9+ | Rounding & Place Value, Solar System, Science Quiz, World Capitals, Map Explorer |

## Progress, ranks and badges

Every finished quiz is banked by `assets/js/progress.js` in one
`localStorage` record (`klg-progress-v1`), and the results screen shows what
it earned:

- **XP** — 10 for completing a round, plus 10 a correct answer, +50 for a perfect round, +20/+50 for streaks
  of 5/10. Effort always earns something; accuracy earns much more.
- **Ranks** — 🐣 Curious Chick → ✨ Bright Spark → ⭐ Star Learner →
  🧠 Quiz Whiz → 🏆 Brain Champ → 🚀 Mega Mind → 👑 Grand Legend, with a
  confetti burst and fanfare on each promotion.
- **Stars** — up to 3 a game (90% / 70% / 50%), shown on the game's card.
- **Day streak** — consecutive days played, so coming back tomorrow counts.
- **Badges** — 17 one-off unlocks (first quiz, perfect score, 10 in a row,
  full marks under 4s a question, 5 and 12 games tried, 25 and 100 quizzes,
  3- and 7-day streaks, and later: Picture Pro, Path Finder, All-Rounder, Comeback and Second Chance).
- **Per-game history** — each game also keeps its last five scores, the date last
  played and stars per mode or level, which feed the grown-up report.

The home page turns that into a **My stars** page, a **Today's game** (the
same game for the whole day, a different one tomorrow, chosen for the child's
age), a **🎲 Surprise me** button, and a star rating on each card.
The grown-up panel resets XP, stars, badges, and streaks after confirmation. Favorites and legacy per-game speed records are kept.

The engine wires this up itself — no per-game code. Games only need to load
`progress.js` before `quiz-engine.js`, and the game id comes from the folder
name in the URL.

## Adding a new game

1. **Hand-built picture game:** `npm run new-game -- <id> "<Name>" <icon> --blurb "…" --level 2 --subject math --skills math.time --levels "L1|L2|L3" --scripts visuals/clock.js`.
   It writes `games/<id>/index.html`, a `game.js` stub that uses `KlgRound`, and the catalogue entry.
2. **Quiz game:** create `games/<name>/index.html` (copy `games/multiplication/index.html`) and `game.js` with a
   question generator `(askedSet) => ({ prompt, correctAnswer, choices, visual?, choiceVisuals?, explanation? })`, then
   `new QuizEngine({ totalQuestions, timePerQuestion, generateQuestion }).start()`. Add one line to `GAMES` in `assets/js/catalogue.js`
   (name, icon, blurb, level, subject, skills, `isNew`) and a `SKILL_NAMES` entry for any new skill tag. Load `assets/js/page-shell.js` last on the page.
3. Optionally list it in a learning path in the same file (`PATHS`).
4. Run `npm run sync:index`, `npm test` (the catalogue test fails if a folder and its entry disagree) and
   `npm run test:pictures`. Add a section to `tests/picture-games-browser.cjs` that checks the picture against the answer. `npm run test:review` and `npm run test:ux` pick up a new game by themselves.

Two rules worth keeping when writing a generator: never ask for more unique
questions than the data can supply (cap `totalQuestions` by pool size), and
never offer a wrong choice that is quietly also correct — the games with
overlapping data (baby animals, opposites, rhymes) each carry an explicit
"also right" list for exactly this.

## Multiplication Tables Quiz

25 random questions from tables 1-12 (capped to the number of unique
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

Training for a real spelling bee, aimed at a 3rd grader. Without settings in the
address the page is the training (`bee-coach.js`). With `?level=1|2|3` or
`?review=1` it is the older "pick the right spelling" quiz (`game.js`), kept
because written and online bees test spelling that way. The two modes share one
page, and each removes the other's screens at start-up so ids stay unique.

| Mode | What it does |
| --- | --- |
| ▶ Play | Today's 10 words: words due first, then new ones. Each new word gets a study card first |
| 🔔 Mock Bee | A full bee on stage against animal rivals, Classroom (8 spellers) or School (12, with vocabulary rounds) |
| 🧩 Spelling rules | 28 spelling rules, each with a 5-word practice |
| 🗣️ Spell aloud | The word and its clues on screen for a grown-up to read; the child spells out loud, because real bees are spoken |
| 📋 My words | Progress, which words to learn first, the bee's date and a daily goal, and the school's own word list |

**Words.** 978 words. `bee-study.js` holds the 2026-2027 school spelling bee study list,
all 450 words with their official part of speech and meaning, supplied by a parent. My words
offers the 50 third-grade words (the default), One Bee (the first 150), Two Bee (the next 150)
and Three Bee (the last 150). The list file does not label the three lists: they are taken
from the third-grade sheet being numbers 101 to 150, and from difficulty starting over at 151
and 301. Each list is followed by words of our own at that level from `bee-words.js`, because
real bees end with words from outside the list, and any other list can be pasted into My words.

Each word has a meaning, a sentence, part of speech, origin, patterns and a highlighted
tricky part. Apart from the official part of speech and meaning, these are written for this
game, so the origins are not official, and 11 uncertain ones are left out. The Mock Bee and
Grown-up modes use the official meaning, as a pronouncer would, and practice uses simpler
wording. Words the voice could read two ways (read, tear, separate) are left out unless they
are on the study list. *wind*, *permit* and *lead* are, so their meaning is always given, and
the voice is told "led" for *lead*, the metal. Eleven words have a hyphen, a space or an
accent (*self-sufficient*, *a cappella*, *piñata*): the child taps only the letters, and sees
and hears the word as it is written.

**Typing.** Letters are typed on the game's own A to Z keys or a physical keyboard,
never in a text box, because a phone keyboard would autocorrect the word.

**Studying.** A new word opens on a card with its spelling, tricky part, sound, meaning, sentence and tip, then it is covered for spelling. A word that comes back has no card, because remembering it unaided is what makes it stick. Right straight after a card brings the word back the next day, not after 3 days, since it only shows the word was just seen. **Read the words** in My words shows every word on a list, and reading changes no record.

**Practice.** After a miss the child sees the word, covers it and spells it again,
and it returns at the end of the round. Words come back after 1, 3, 7, 14 and 30
days, sooner if a bee date is set. A right answer only moves a word on when it is
due, so cramming cannot fake mastery. Mastered means right on three different days.

**Mock Bee rules.** These follow the [2027 Suggested Rules for Spelling Bees](https://spellingbee.com/sites/default/files/inline-files/2027_Suggested_Rules_for_Spelling_Bees.pdf):

- A speller may ask for the meaning, a sentence, the part of speech, the origin or
  to hear the word again, but not for a slower reading (rule 4), so Slowly is practice only.
- A word with a sound-alike is always defined (rule 4).
- Starting over must use the same letters, or the speller is out (rule 5).
- A miss eliminates at once (rule 7).
- If nobody in a round is right, everyone stays. A sole correct speller wins at once,
  and spellers out in the same round tie (rule 8).
- Other accepted spellings, such as favourite, count (rule 9).
- Words get harder by round, and a school's list runs out before the last rounds, because
  real bees end with words from outside the study lists (rule 2).

Not modeled: asking for an alternate pronunciation, since the device voice has only
one. Every bee may set its own rules, so check with yours.

Saved in `klg-bee-v1`. Misses here use this schedule rather than the home page's
Try again card, which still covers the quiz.

## World Capitals Quiz

119 countries with flag emoji, grouped by continent. Countries with a disputed or shared capital are left out. Two directions via
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

## Shapes & Colors Quiz (pre-K)

Name the shape you see (with spoken answer choices), find a named shape among four
pictures, name colors by tapping color swatches, and say how many sides or corners a shape has —
mix by default, or `?mode=shape`, `?mode=color`, `?mode=sides`. Sides and
corners are asked in words so pentagons, hexagons and octagons can join in
without needing an emoji. Everyday objects appear too ("what shape is a
stop sign 🛑?"). 12 questions, 20 seconds each.

## Rhyming Words Quiz

Words are grouped by the **sound** they end with, not the spelling — night,
light and kite are one family, tail and whale another — so a wrong choice
can never secretly rhyme with the answer. Three kinds mixed by default:
find the rhyme (`?mode=rhyme`), spot the word that does not rhyme
(`?mode=odd`), and finish a little rhyme whose last word is missing
(`?mode=finish`, 18 hand-written lines). 12 questions, 20 seconds each.

## Patterns & Skip Counting Quiz

What comes next? Counting on and back in 2s, 3s, 5s, 10s and 25s
(`?mode=skip`); add/subtract, doubling and halving rules plus a missing
number in the middle of the run (`?mode=numbers`); and repeating picture
patterns — ABAB, AABB, ABB, ABC — with a letter sequence mixed in
(`?mode=shapes`). Wrong choices are the real mistakes: the wrong step size,
the wrong direction, or repeating the previous term. 12 questions,
20 seconds each.

## Opposites Quiz

52 opposite pairs and 41 similar-meaning pairs, asked both ways: "what is
the opposite of X?" (`?mode=opposite`) and "which word means almost the
SAME as X?" (`?mode=similar`). Because "short" is the opposite of both long
and tall, and a synonym of the answer is just as correct an answer, every
decoy is checked against both maps plus an explicit also-right list
(silent/loud, below/up, unhappy/happy). In same-meaning questions the
word's opposite is deliberately offered as the trap. 15 questions,
15 seconds each.

## Division Quiz

Three levels: `?level=1` divides by 2–5 with sharing word problems,
`?level=2` (default) adds divisors to 10 and missing-number facts
(`? ÷ 4 = 5`), `?level=3` brings in remainders (`17 ÷ 5 = 3 r 2`). Narrow
the divisors with `?tables=6,7,8`, like the multiplication quiz.
Distractors mirror real division slips: the quotient one step out, the
product instead of the quotient, and the numbers swapped. 20 questions,
20 seconds each.

## Measurement Quiz

Metric by default, US customary with `?units=us`. Pick the sensible unit
for an object and estimate its size (`?mode=unit`), convert between units
(`?mode=convert`), and compare three amounts written in two different units
(`?mode=compare`). Comparisons are computed in one base unit so two amounts
are never accidentally equal, and the smaller-unit amounts stay friendly
(75 cm, 250 ml) rather than arithmetic-generated. 15 questions,
25 seconds each.

## Solar System Quiz

Ordering questions are generated from the planet list — position from the
Sun, which planet comes next, which of two is closer — so they can never
contradict each other, and 25 written questions cover the Sun, moons,
gravity, the asteroid belt and the first Moon walk. Genuinely contested
facts are avoided rather than guessed at (there's no "coldest planet"
question, and Jupiter is never offered against Saturn for most moons).
`?mode=order` or `?mode=facts`. 15 questions, 25 seconds each.

## Science Quiz

Four topics, mixed by default and playable alone: animal groups
(`?mode=animals`), the human body (`?mode=body`), plants (`?mode=plants`)
and matter, weather and forces (`?mode=matter`). Each question carries its
own three wrong answers rather than sharing a pool, because in a bank this
broad a generic decoy is too often quietly correct. A single-topic round is
10 questions, and a mixed round is 15. 25 seconds each.

All of the above quizzes track per-mode best-time records with the same
perfect-score-only rule as the multiplication quiz.

## Running locally

No build step required — just open `index.html` in a browser, or serve the
folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

## Installing it as an app, and offline use

The site works with no internet after one visit. `sw.js` (a service worker,
generated by `scripts/build-sw.cjs` from `scripts/sw-template.js`) saves every
file on the device the first time any page is opened: every game, script,
picture, the emoji and Tamil fonts and the Tamil recordings (about 15 MB).
It always tries the network first, so updates appear as soon as you are online,
and it falls back to the saved copy with no network (or after 4 seconds).
`?level=` and other settings in the address work offline too.

On an iPad or iPhone: open the site in Safari while online, wait a minute
(the grown-up panel says "✓ Saved on this device for offline use"), then tap
Share → **Add to Home Screen**. It then opens full-screen like an app, with
its own icon, and works in flight mode. English questions use the device's own
voice, which works offline. Tamil plays the saved recordings.

On Android or a computer, Chrome and Edge can install it: the grown-up panel shows
an **Install Little Learners** button when the browser allows it, and instructions
when it does not. Stars are saved per browser, and an installed app on an iPhone or
iPad may not share them with Safari.

`manifest.webmanifest` and `assets/icons/` give the Home Screen name and icon.
The worker only handles pages under its own folder, so in the website repo
(`/games/sw.js`) it never touches the rest of the site.

**Before committing**, run `npm run sw` (or `npm run build`) so `sw.js` lists
any new files. `npm test` fails if a file is missing from the list. The website
copies this repo with `git subtree`, so the committed `sw.js` is the one that is deployed.

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
