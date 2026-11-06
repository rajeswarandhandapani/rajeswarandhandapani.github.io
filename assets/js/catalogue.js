/**
 * KlgCatalogue — the single list of games the home page, learning paths and
 * grown-up report are built from.
 *
 * To add a game: create games/<id>/index.html and add ONE line to GAMES.
 *   level   1–4 (First Steps … Brain Boost)
 *   subject math | english | tamil | science | logic
 *   skills  "subject.skill" tags; the grown-up report groups by them
 *   isNew   shows a NEW ribbon on the card
 *   v3      one of the hands-on picture games the Picture Pro badge counts
 * PATHS lists game ids in the order a child should meet them.
 *
 * Works in the browser (window.KlgCatalogue) and in node tests (require).
 */
(function (root) {
  "use strict";

  var LEVELS = {
    1: { name: "First Steps", emoji: "🐣", ages: "Ages 3–5", short: "3–5", say: "Ages three to five", note: "listening, counting and letters" },
    2: { name: "Building Blocks", emoji: "🧱", ages: "Ages 5–7", short: "5–7", say: "Ages five to seven", note: "reading, adding and first multiplying" },
    3: { name: "Level Up", emoji: "🚀", ages: "Ages 7–9", short: "7–9", say: "Ages seven to nine", note: "tables, fractions, time and money" },
    4: { name: "Brain Boost", emoji: "🧠", ages: "Ages 9+", short: "9+", say: "Ages nine and up", note: "bigger numbers and the wider world" },
  };

  var SUBJECTS = {
    math: { label: "🔢 Math", kid: "Numbers", icon: "🔢", say: "Numbers" },
    english: { label: "📚 English", kid: "English", icon: "🔤", say: "English" },
    tamil: { label: "அ Tamil · தமிழ்", kid: "தமிழ்", icon: "அ", say: "Tamil" },
    science: { label: "🌍 Science & world", kid: "Our World", icon: "🌍", say: "Our world" },
    logic: { label: "🧩 Thinking skills", kid: "Puzzles", icon: "🧩", say: "Puzzles" },
  };

  /** Friendly names for the skill tags (the report falls back to the tag text). */
  var SKILL_NAMES = {
    "logic.memory": "Memory", "logic.patterns": "Patterns", "logic.reasoning": "Reasoning", "logic.coding": "Step-by-step thinking",
    "english.vocabulary": "Picture words", "english.letters": "Letters & sounds", "english.rhyme": "Rhyming",
    "english.comprehension": "Understanding stories", "english.spelling": "Spelling", "english.phonics": "Phonics", "english.sight-words": "Sight words", "english.sentences": "Making sentences", "english.sequencing": "Story order", "english.grammar": "Kinds of words", "english.punctuation": "Punctuation",
    "world.feelings": "Feelings", "world.everyday": "Everyday things", "world.geography": "Countries & capitals",
    "science.animals": "Animals", "science.space": "Space", "science.general": "Science facts", "science.life-cycles": "Life cycles", "science.body": "My body", "science.sorting": "Sorting & grouping", "science.weather": "Weather & seasons", "science.safety": "Safety & health", "world.map": "World map",
    "math.number-names": "Number names", "math.counting": "Counting", "math.shapes": "Shapes", "math.colours": "Colours",
    "math.compare": "Comparing numbers", "math.add-sub": "Adding & subtracting", "math.skip-counting": "Skip counting",
    "math.calendar": "Calendar", "math.multiply": "Multiplying", "math.divide": "Dividing", "math.fractions": "Fractions",
    "math.time": "Telling time", "math.money": "Money", "math.measure": "Measuring", "math.place-value": "Place value", "math.data": "Graphs & data", "math.misc": "Math",
    "tamil.letters": "Tamil letters", "tamil.vowels": "Tamil vowels", "tamil.uyirmei": "Compound letters",
    "tamil.vocabulary": "Tamil words", "tamil.writing": "Writing Tamil", "tamil.numbers": "Tamil numbers",
    "tamil.sentences": "Tamil sentences", "tamil.days-colours": "Days, months & colours", "tamil.stories": "Tamil stories", "tamil.spelling": "Tamil spelling",
  };

  var GAMES = [
    {"id":"memory-match","name":"Memory Garden","icon":"🌻","blurb":"Find pairs. Grow your memory.","level":1,"subject":"logic","skills":["logic.memory"]},
    {"id":"picture-words","name":"Picture Words","icon":"🖼️","blurb":"Hear a word. Find its picture.","level":1,"subject":"english","skills":["english.vocabulary"]},
    {"id":"feelings-faces","name":"Feelings Faces","icon":"😊","blurb":"Listen to a story. Choose a face.","level":1,"subject":"science","skills":["world.feelings"]},
    {"id":"everyday-tools","name":"What Do We Use?","icon":"🪥","blurb":"Find the tool for each little job.","level":1,"subject":"science","skills":["world.everyday"]},
    {"id":"number-sounds","name":"Number Sounds","icon":"🗣️","blurb":"Hear the number, tap the numeral","level":1,"subject":"math","skills":["math.number-names"]},
    {"id":"counting","name":"Counting","icon":"🍎","blurb":"Count the pictures, tap the number","level":1,"subject":"math","skills":["math.counting"]},
    {"id":"shapes-colors","name":"Shapes & Colors","icon":"🔷","blurb":"Name shapes, colors, sides & corners","level":1,"subject":"math","skills":["math.shapes","math.colours"]},
    {"id":"english-alphabets","name":"English Alphabets","icon":"🔤","blurb":"Hear, match & order letters A–Z","level":1,"subject":"english","skills":["english.letters"]},
    {"id":"tamil-alphabets","name":"Tamil Alphabets","icon":"அ","blurb":"Read or listen — vowels, consonants & more","level":1,"subject":"tamil","skills":["tamil.letters"]},
    {"id":"rhyming-words","name":"Rhyming Words","icon":"🎵","blurb":"Cat, hat, bat — find the rhyme","level":1,"subject":"english","skills":["english.rhyme"]},
    {"id":"baby-animals","name":"Baby Animals","icon":"🐣","blurb":"A baby cow is a…? Name them all!","level":1,"subject":"science","skills":["science.animals"]},
    {"id":"tamil-letter-chart","name":"Tamil Letter Chart","icon":"அ","blurb":"Tap any of 247 letters to hear a real voice.","level":1,"subject":"tamil","skills":["tamil.letters"]},
    {"id":"tamil-listen-find","name":"Listen & Find","icon":"👂","blurb":"Hear a Tamil word. Tap its picture.","level":1,"subject":"tamil","skills":["tamil.vocabulary"]},
    {"id":"tamil-letter-pop","name":"Letter Bubbles","icon":"🫧","blurb":"Hear a Tamil letter. Pop its bubble!","level":1,"subject":"tamil","skills":["tamil.letters"]},
    {"id":"tamil-tracing","name":"Trace Tamil Letters","icon":"✏️","blurb":"Write big dotted letters with your finger.","level":1,"subject":"tamil","skills":["tamil.writing"]},
    {"id":"tamil-numbers","name":"Tamil Numbers","icon":"🔢","blurb":"Count and hear ஒன்று to பத்து.","level":1,"subject":"tamil","skills":["tamil.numbers"]},
    {"id":"tamil-sentence-words","name":"Tamil Sentence Words","icon":"அ","blurb":"Type the whole missing word in a Tamil sentence.","level":2,"subject":"tamil","skills":["tamil.sentences"]},
    {"id":"tamil-missing-letters","name":"Tamil Missing Letters","icon":"✍️","blurb":"Type the missing Tamil letter to complete a sentence.","level":2,"subject":"tamil","skills":["tamil.sentences","tamil.uyirmei"]},
    {"id":"animal-habitats","name":"Animal Homes","icon":"🦊","blurb":"Discover where animals live.","level":2,"subject":"science","skills":["science.animals"]},
    {"id":"reading-stories","name":"Story Detectives","icon":"📖","blurb":"Read a little story. Find the clues.","level":2,"subject":"english","skills":["english.comprehension"]},
    {"id":"comparing-numbers","name":"Comparing Numbers","icon":"⚖️","blurb":"Biggest, smallest & the < > = signs","level":2,"subject":"math","skills":["math.compare"]},
    {"id":"addition-subtraction","name":"Addition & Subtraction","icon":"➕","blurb":"Facts within 10, 20 or two-digit","level":2,"subject":"math","skills":["math.add-sub"]},
    {"id":"patterns","name":"Patterns & Skip Counting","icon":"🔁","blurb":"2, 4, 6… what comes next?","level":2,"subject":"logic","skills":["logic.patterns","math.skip-counting"]},
    {"id":"opposites","name":"Opposites","icon":"↔️","blurb":"Opposite words & words that match","level":2,"subject":"english","skills":["english.vocabulary"]},
    {"id":"calendar","name":"Calendar","icon":"📅","blurb":"Days of the week & months of the year","level":2,"subject":"math","skills":["math.calendar"]},
    {"id":"tamil-words","name":"Tamil Words","icon":"🐘","blurb":"Match pictures & meanings to Tamil words","level":2,"subject":"tamil","skills":["tamil.vocabulary"]},
    {"id":"tamil-short-long","name":"Short or Long?","icon":"🐜","blurb":"Hear குறில் and நெடில் sounds.","level":2,"subject":"tamil","skills":["tamil.vowels"]},
    {"id":"tamil-sound-blend","name":"Sound Blender","icon":"🧩","blurb":"Join க் + இ to make கி.","level":2,"subject":"tamil","skills":["tamil.uyirmei"]},
    {"id":"tamil-first-letter","name":"First Letter","icon":"🔤","blurb":"Which letter does the word start with?","level":2,"subject":"tamil","skills":["tamil.letters"]},
    {"id":"tamil-memory","name":"Tamil Memory","icon":"🃏","blurb":"Match pictures to words, vowels to signs.","level":2,"subject":"tamil","skills":["tamil.vocabulary"]},
    {"id":"tamil-letter-order","name":"What Comes Next?","icon":"🚂","blurb":"Put Tamil letters in order.","level":2,"subject":"tamil","skills":["tamil.letters"]},
    {"id":"multiply-pictures","name":"Picture Multiplication","icon":"🍪","blurb":"Groups, arrays and frog hops — see ×.","level":2,"subject":"math","skills":["math.multiply"]},
    {"id":"divide-pictures","name":"Picture Division","icon":"🍰","blurb":"Share it out, group it up, find leftovers.","level":2,"subject":"math","skills":["math.divide"]},
    {"id":"share-fairly","name":"Share It Fairly","icon":"🧺","blurb":"Deal treats onto plates. Is it fair?","level":2,"subject":"math","skills":["math.divide"]},
    {"id":"multiplication","name":"Multiplication Tables","icon":"✖️","blurb":"25 timed questions on tables 1-12","level":3,"subject":"math","skills":["math.multiply"]},
    {"id":"division","name":"Division","icon":"➗","blurb":"Share it out — facts & remainders","level":3,"subject":"math","skills":["math.divide"]},
    {"id":"fractions","name":"Fractions","icon":"🍕","blurb":"Pictures, equivalents, comparing & adding","level":3,"subject":"math","skills":["math.fractions"]},
    {"id":"time","name":"Time & Elapsed Time","icon":"🕒","blurb":"Read clocks & work out end times","level":3,"subject":"math","skills":["math.time"]},
    {"id":"money","name":"Money & Making Change","icon":"💰","blurb":"Count coins & make change","level":3,"subject":"math","skills":["math.money"]},
    {"id":"measurement","name":"Measurement","icon":"📏","blurb":"Units, converting & comparing sizes","level":3,"subject":"math","skills":["math.measure"]},
    {"id":"spelling-bee","name":"Spelling Bee","icon":"🐝","blurb":"Train for a real bee: hear it, ask for clues, spell it","level":3,"subject":"english","skills":["english.spelling"]},
    {"id":"tamil-word-builder","name":"Tamil Word Builder","icon":"🧩","blurb":"Fill in the missing Tamil letter","level":3,"subject":"tamil","skills":["tamil.spelling"]},
    {"id":"tamil-word-puzzle","name":"Tamil Word Puzzle","icon":"🧱","blurb":"Hear a word. Build it from letter tiles.","level":3,"subject":"tamil","skills":["tamil.spelling"]},
    {"id":"market-day","name":"Market Day","icon":"🛒","blurb":"Shop, farm and trip stories: × or ÷?","level":3,"subject":"math","skills":["math.multiply","math.divide"]},
    {"id":"fact-families","name":"Fact Family Triangles","icon":"🔺","blurb":"3 × 4 = 12, so 12 ÷ 4 = 3.","level":3,"subject":"math","skills":["math.multiply","math.divide"]},
    {"id":"array-garden","name":"Array Garden","icon":"🌻","blurb":"Plant rows × columns. Find every way.","level":3,"subject":"math","skills":["math.multiply"]},
    {"id":"multiples-hunt","name":"Multiples Hunt","icon":"🔎","blurb":"Find the times table in the hundred square.","level":3,"subject":"math","skills":["math.multiply"]},
    {"id":"rounding-place-value","name":"Rounding & Place Value","icon":"🔢","blurb":"Nearest 10/100/1,000 & digit values","level":4,"subject":"math","skills":["math.place-value"]},
    {"id":"solar-system","name":"Solar System","icon":"🪐","blurb":"Planet order, moons & space facts","level":4,"subject":"science","skills":["science.space"]},
    {"id":"science-quiz","name":"Science Quiz","icon":"🔬","blurb":"Animals, body, plants & matter","level":4,"subject":"science","skills":["science.general"]},
    {"id":"world-capitals","name":"World Capitals","icon":"🌎","blurb":"Match countries to their capital cities","level":4,"subject":"science","skills":["world.geography"]},
    {"id":"clock-setter","name":"Set the Clock","icon":"🕰️","blurb":"Drag the clock hands to show the time.","level":2,"subject":"math","skills":["math.time"],"v3":true},
    {"id":"fraction-pizza","name":"Pizza Fractions","icon":"🍕","blurb":"Shade slices, match equal fractions and put pizzas in order.","level":3,"subject":"math","skills":["math.fractions"],"v3":true},
    {"id":"coin-shop","name":"Coin Shop","icon":"🪙","blurb":"Pay the exact price with coins and notes.","level":3,"subject":"math","skills":["math.money"],"v3":true},
    {"id":"block-builder","name":"Block Builder","icon":"🧊","blurb":"Build numbers with hundreds, tens and ones blocks.","level":2,"subject":"math","skills":["math.place-value"],"v3":true},
    {"id":"shape-detectives","name":"Shape Detectives","icon":"🔷","blurb":"Count sides, spot every shape and find the mirror twin.","level":2,"subject":"math","skills":["math.shapes"],"v3":true},
    {"id":"measure-lab","name":"Measure Lab","icon":"📏","blurb":"Measure with a ruler, balance a scale and fill a jug.","level":3,"subject":"math","skills":["math.measure"],"v3":true},
    {"id":"picture-graphs","name":"Picture Graphs","icon":"📊","blurb":"Read picture graphs, bar charts and tally marks.","level":2,"subject":"math","skills":["math.data"],"v3":true},
    {"id":"sound-it-out","name":"Sound It Out","icon":"🐱","blurb":"Blend sounds into words and build words from letters.","level":1,"subject":"english","skills":["english.phonics"],"v3":true},
    {"id":"word-families","name":"Word Families","icon":"🏠","blurb":"Sort picture words into the houses where they belong.","level":1,"subject":"english","skills":["english.rhyme","english.phonics"],"v3":true},
    {"id":"sight-word-pop","name":"Sight Word Pop","icon":"🫧","blurb":"Hear a word and pop its bubble.","level":1,"subject":"english","skills":["english.sight-words"],"v3":true},
    {"id":"sentence-builder","name":"Sentence Builder","icon":"🧩","blurb":"Put word tiles in order to make a sentence about the picture.","level":2,"subject":"english","skills":["english.sentences"],"v3":true},
    {"id":"story-order","name":"Story Order","icon":"🎬","blurb":"Put the pictures in order: first, next, last.","level":1,"subject":"english","skills":["english.sequencing"],"v3":true},
    {"id":"tamil-days-colours","name":"நாட்கள் · நிறங்கள்","icon":"📅","blurb":"Days, months and colours in Tamil, with real voices.","level":1,"subject":"tamil","skills":["tamil.days-colours"],"v3":true},
    {"id":"tamil-picture-sentences","name":"படம் பார்த்து சொல்","icon":"🖼️","blurb":"Read a Tamil sentence and pick the picture it tells about.","level":2,"subject":"tamil","skills":["tamil.sentences"],"v3":true},
    {"id":"tamil-english-match","name":"Tamil–English Match","icon":"🔗","blurb":"Match Tamil words to their pictures and English words.","level":2,"subject":"tamil","skills":["tamil.vocabulary"],"v3":true},
    {"id":"tamil-story-time","name":"கதை நேரம்","icon":"📖","blurb":"Four-picture Tamil stories with listening questions.","level":3,"subject":"tamil","skills":["tamil.stories"],"v3":true},
    {"id":"life-cycles","name":"Life Cycles","icon":"🦋","blurb":"Put the stages of a butterfly, frog, plant or chicken in order.","level":2,"subject":"science","skills":["science.life-cycles"],"v3":true},
    {"id":"my-body","name":"My Body","icon":"🧍","blurb":"Tap body parts on the picture and match the five senses.","level":1,"subject":"science","skills":["science.body"],"v3":true},
    {"id":"sort-it","name":"Sort It!","icon":"🗂️","blurb":"Sort pictures: living or not, land, water or air, float or sink.","level":1,"subject":"science","skills":["science.sorting"],"v3":true},
    {"id":"weather-wear","name":"Weather & Seasons","icon":"☔","blurb":"Dress for the weather and name the season.","level":1,"subject":"science","skills":["science.weather"],"v3":true},
    {"id":"map-explorer","name":"Map Explorer","icon":"🗺️","blurb":"Find continents and oceans, and where animals and landmarks belong.","level":4,"subject":"science","skills":["world.map"],"v3":true},
    {"id":"odd-one-out","name":"Odd One Out","icon":"🧐","blurb":"Find the picture that does not belong, then hear why.","level":1,"subject":"logic","skills":["logic.reasoning"],"isNew":true},
    {"id":"who-am-i","name":"Who Am I?","icon":"🕵️","blurb":"Read one clue at a time and work out the answer.","level":2,"subject":"logic","skills":["logic.reasoning"],"isNew":true},
    {"id":"robot-path","name":"Robot Path","icon":"🤖","blurb":"Plan arrow steps to guide a robot to the star.","level":2,"subject":"logic","skills":["logic.coding"],"isNew":true},
    {"id":"word-detective","name":"Word Detective","icon":"🔍","blurb":"Sort naming words, doing words and describing words.","level":2,"subject":"english","skills":["english.grammar"],"isNew":true},
    {"id":"punctuation-pals","name":"Punctuation Pals","icon":"❗","blurb":"Choose the full stop, question mark or exclamation mark.","level":2,"subject":"english","skills":["english.punctuation"],"isNew":true},
    {"id":"number-bonds","name":"Number Bonds","icon":"🫧","blurb":"Find the missing part that makes the whole.","level":1,"subject":"math","skills":["math.add-sub"],"isNew":true},
    {"id":"stay-safe","name":"Stay Safe & Healthy","icon":"🦺","blurb":"Choose the safe and healthy thing to do.","level":1,"subject":"science","skills":["science.safety"],"isNew":true},
    {"id":"tamil-word-order","name":"சொல் வரிசை","icon":"🔀","blurb":"Put Tamil word tiles in order to make a sentence.","level":2,"subject":"tamil","skills":["tamil.sentences"],"isNew":true},
  ];

  var PATHS = {
    tamil: {
      title: "Tamil learning path", eyebrow: "தமிழ் கற்போம் · LEARN TAMIL STEP BY STEP",
      note: "Real voices say every letter and word. Follow the steps, or jump in anywhere.",
      steps: [
        { game: "tamil-letter-chart", label: "Hear the letters" },
        { game: "tamil-letter-pop", label: "Find the letters" },
        { game: "tamil-tracing", label: "Write the letters" },
        { game: "tamil-short-long", label: "Short & long" },
        { game: "tamil-sound-blend", label: "Blend sounds" },
        { game: "tamil-first-letter", label: "First sounds" },
        { game: "tamil-listen-find", label: "Learn words" },
        { game: "tamil-days-colours", label: "Days & colours" },
        { game: "tamil-english-match", label: "Match words" },
        { game: "tamil-word-puzzle", label: "Build words" },
        { game: "tamil-picture-sentences", label: "Read sentences" },
        { game: "tamil-word-order", label: "Order words" },
        { game: "tamil-sentence-words", label: "Write sentences" },
        { game: "tamil-story-time", label: "Story time" },
      ],
    },
    math: {
      title: "Math adventure path", eyebrow: "NUMBERS STEP BY STEP",
      note: "From counting to money. Each step builds on the one before.",
      steps: [
        { game: "number-sounds", label: "Hear numbers" },
        { game: "counting", label: "Count" },
        { game: "shape-detectives", label: "Shapes" },
        { game: "comparing-numbers", label: "Compare" },
        { game: "number-bonds", label: "Number bonds" },
        { game: "addition-subtraction", label: "Add & take away" },
        { game: "block-builder", label: "Build numbers" },
        { game: "rounding-place-value", label: "Place value" },
        { game: "multiply-pictures", label: "See ×" },
        { game: "divide-pictures", label: "See ÷" },
        { game: "fractions", label: "Fractions" },
        { game: "fraction-pizza", label: "Pizza fractions" },
        { game: "time", label: "Tell time" },
        { game: "clock-setter", label: "Set the clock" },
        { game: "money", label: "Count money" },
        { game: "coin-shop", label: "Pay exactly" },
        { game: "measure-lab", label: "Measure" },
        { game: "picture-graphs", label: "Graphs" },
      ],
    },
    english: {
      title: "English reading path", eyebrow: "LETTERS TO STORIES",
      note: "Letters, sounds, words and then stories.",
      steps: [
        { game: "english-alphabets", label: "Letters" },
        { game: "picture-words", label: "Picture words" },
        { game: "sound-it-out", label: "Sound it out" },
        { game: "word-families", label: "Word families" },
        { game: "rhyming-words", label: "Rhymes" },
        { game: "sight-word-pop", label: "Sight words" },
        { game: "spelling-bee", label: "Spelling" },
        { game: "word-detective", label: "Kinds of words" },
        { game: "sentence-builder", label: "Sentences" },
        { game: "punctuation-pals", label: "Punctuation" },
        { game: "story-order", label: "Story order" },
        { game: "reading-stories", label: "Stories" },
      ],
    },
    logic: {
      title: "Thinking skills path", eyebrow: "PUZZLE IT OUT",
      note: "Remember, spot patterns, reason from clues, then plan step by step.",
      steps: [
        { game: "memory-match", label: "Remember" },
        { game: "odd-one-out", label: "Odd one out" },
        { game: "patterns", label: "Patterns" },
        { game: "who-am-i", label: "Use clues" },
        { game: "robot-path", label: "Plan steps" },
      ],
    },
    science: {
      title: "Our world path", eyebrow: "DISCOVER THE WORLD",
      note: "Animals, feelings, planets and places.",
      steps: [
        { game: "baby-animals", label: "Animals" },
        { game: "life-cycles", label: "Life cycles" },
        { game: "animal-habitats", label: "Animal homes" },
        { game: "my-body", label: "My body" },
        { game: "sort-it", label: "Sort it" },
        { game: "weather-wear", label: "Weather" },
        { game: "stay-safe", label: "Stay safe" },
        { game: "everyday-tools", label: "Everyday things" },
        { game: "science-quiz", label: "Science" },
        { game: "solar-system", label: "Space" },
        { game: "map-explorer", label: "World map" },
        { game: "world-capitals", label: "Countries" },
      ],
    },
  };

  function byId(id) {
    return GAMES.filter(function (g) { return g.id === id; })[0] || null;
  }

  /** Where a game sits on its subject's learning path, or Infinity when it is not on one. */
  function pathStep(game) {
    var path = PATHS[game.subject];
    if (!path) return Infinity;
    for (var i = 0; i < path.steps.length; i++) {
      if (path.steps[i].game === game.id) return i;
    }
    return Infinity;
  }

  /**
   * The levels inside each game: which age band each one suits, and the address
   * setting that turns it on ("" is the game's default). A game only lists ages it
   * makes sense for, so Counting stops before 9+ and World Capitals starts at 7.
   * The Tamil Letter Chart is a reference chart to explore, so it has no levels.
   */
  var L1 = "level=1", L2 = "level=2", L3 = "level=3";
  var GAME_LEVELS = {
    "memory-match": { 1: "", 2: "pairs=8", 3: "pairs=10", 4: "pairs=15" },
    "picture-words": { 1: "", 2: L2 },
    "feelings-faces": { 1: "", 2: L2 },
    "everyday-tools": { 1: "", 2: L2 },
    "number-sounds": { 1: "", 2: "max=50", 3: "max=100" },
    "counting": { 1: "", 2: "max=20" },
    "shapes-colors": { 1: "mode=color", 2: "mode=shape", 3: "mode=sides" },
    "english-alphabets": { 1: "", 2: "mode=phonics" },
    "tamil-alphabets": { 1: "type=vowels", 2: "type=consonants", 3: "type=uyirmei" },
    "rhyming-words": { 1: "mode=picture", 2: "mode=rhyme", 3: "mode=finish" },
    "baby-animals": { 1: L1, 2: "" },
    "tamil-listen-find": { 1: "cat=animals", 2: "" },
    "tamil-letter-pop": { 1: "", 2: "set=consonants", 3: "set=words" },
    "tamil-tracing": { 1: "", 2: "set=consonants", 3: "set=uyirmei" },
    "tamil-numbers": { 1: "", 2: "mode=listen", 3: "mode=numerals" },
    "tamil-sentence-words": { 2: L1, 3: "" },
    "tamil-missing-letters": { 2: L1, 3: "" },
    "animal-habitats": { 2: "", 3: L2 },
    "reading-stories": { 2: "", 3: L2 },
    "comparing-numbers": { 1: "max=10", 2: "", 3: "max=1000", 4: "max=10000" },
    "addition-subtraction": { 1: "max=10", 2: "", 3: "max=100", 4: "max=1000" },
    "patterns": { 1: "mode=shapes", 2: "mode=skip", 3: "mode=numbers" },
    "opposites": { 1: "mode=picture", 2: "mode=opposite", 3: "mode=similar" },
    "calendar": { 1: "type=days", 2: "type=months", 3: "type=grid" },
    "tamil-words": { 2: "type=picture", 3: "type=meaning" },
    "tamil-short-long": { 1: "", 2: "mode=see", 3: "mode=pair" },
    "tamil-sound-blend": { 2: "", 3: "mode=listen", 4: "mode=split" },
    "tamil-first-letter": { 2: "start=vowel", 3: "" },
    "tamil-memory": { 2: "", 3: "mode=signs" },
    "tamil-letter-order": { 2: "", 3: "set=consonants", 4: "set=rows" },
    "multiply-pictures": { 2: L1, 3: "", 4: L3 },
    "divide-pictures": { 2: L1, 3: "", 4: L3 },
    "share-fairly": { 2: L1, 3: "", 4: L3 },
    "multiplication": { 2: "tables=2,5,10", 3: "tables=1,2,3,4,5,6,7,8,9,10", 4: "" },
    "division": { 2: L1, 3: "", 4: "level=4" },
    "fractions": { 2: L1, 3: "", 4: "level=4" },
    "time": { 2: L1, 3: "", 4: L3 },
    "money": { 2: L1, 3: "", 4: L3 },
    "measurement": { 2: "mode=read", 3: "mode=unit", 4: "mode=convert" },
    "spelling-bee": { 1: L1, 2: L2, 3: "focus=list", 4: "focus=stretch" },
    "tamil-word-builder": { 2: L1, 3: "" },
    "tamil-word-puzzle": { 2: "", 3: L2, 4: L3 },
    "market-day": { 2: L1, 3: "", 4: L3 },
    "fact-families": { 2: L1, 3: "", 4: L3 },
    "array-garden": { 2: L1, 3: "", 4: L3 },
    "multiples-hunt": { 2: L1, 3: "", 4: L3 },
    "rounding-place-value": { 3: L1, 4: "" },
    "solar-system": { 2: "mode=order", 3: "", 4: "mode=facts" },
    "science-quiz": { 3: L1, 4: "" },
    "world-capitals": { 3: "mode=flag", 4: "" },
    "clock-setter": { 2: L1, 3: "", 4: L3 },
    "fraction-pizza": { 2: L1, 3: "", 4: L3 },
    "coin-shop": { 2: L1, 3: "", 4: L3 },
    "block-builder": { 2: L1, 3: "", 4: L3 },
    "shape-detectives": { 1: L1, 2: "", 3: L3 },
    "measure-lab": { 2: L1, 3: "", 4: L3 },
    "picture-graphs": { 2: L1, 3: "", 4: L3 },
    "sound-it-out": { 1: L1, 2: "" },
    "word-families": { 1: L1, 2: "" },
    "sight-word-pop": { 1: L1, 2: "" },
    "sentence-builder": { 2: L1, 3: "" },
    "story-order": { 1: L1, 2: "" },
    "tamil-days-colours": { 1: "mode=colours", 2: "", 3: "mode=months" },
    "tamil-picture-sentences": { 2: L1, 3: "" },
    "tamil-english-match": { 1: L1, 2: "" },
    "tamil-story-time": { 3: L1, 4: "" },
    "life-cycles": { 2: L1, 3: "" },
    "my-body": { 1: L1, 2: "" },
    "sort-it": { 1: L1, 2: "" },
    "weather-wear": { 1: L1, 2: "" },
    "map-explorer": { 2: L1, 3: "", 4: L3 },
    "odd-one-out": { 1: L1, 2: "" },
    "who-am-i": { 2: "", 3: L2 },
    "robot-path": { 1: L1, 2: "", 3: L3 },
    "word-detective": { 2: L1, 3: "" },
    "punctuation-pals": { 2: "", 3: L2 },
    "number-bonds": { 1: L1, 2: "", 3: L3 },
    "stay-safe": { 1: "", 2: L2 },
    "tamil-word-order": { 2: L1, 3: "" },
  };

  GAMES.forEach(function (game) {
    var table = GAME_LEVELS[game.id] || {};
    game.levels = Object.keys(table).map(function (band) { return { band: Number(band), query: table[band] }; });
  });

  /** The ages a game suits, for a card: "3–7", or "7+" when it reaches the oldest band. */
  function agesLabel(game) {
    var bands = game.levels.length ? game.levels.map(function (l) { return l.band; }) : [game.level];
    var lows = { 1: 3, 2: 5, 3: 7, 4: 9 };
    var highs = { 1: 5, 2: 7, 3: 9 };
    var top = Math.max.apply(null, bands);
    return lows[Math.min.apply(null, bands)] + (top === 4 ? "+" : "–" + highs[top]);
  }

  /** A subject's games (or every game), easiest first, then in learning-path order. */
  function gamesFor(subject) {
    return GAMES.map(function (game, index) { return { game: game, index: index }; })
      .filter(function (x) { return !subject || x.game.subject === subject; })
      .sort(function (a, b) {
        if (a.game.level !== b.game.level) return a.game.level - b.game.level;
        var pa = pathStep(a.game), pb = pathStep(b.game);
        if (pa !== pb) return pa - pb;
        return a.index - b.index;
      })
      .map(function (x) { return x.game; });
  }

  function starsOf(game, stats) {
    return (stats && stats[game.id] && stats[game.id].bestStars) || 0;
  }

  /** The game to offer next: the first without a star, or the one with the fewest stars. */
  function firstToPlay(list, stats) {
    var fresh = list.filter(function (g) { return !starsOf(g, stats); })[0];
    if (fresh) return fresh;
    return list.slice().sort(function (a, b) { return starsOf(a, stats) - starsOf(b, stats); })[0] || null;
  }

  /** Play next: stays in the preferred subject until every game there has a star. */
  function nextFor(stats, prefer) {
    var subjects = Object.keys(SUBJECTS);
    if (prefer && subjects.includes(prefer)) subjects = [prefer].concat(subjects.filter(function (s) { return s !== prefer; }));
    for (var i = 0; i < subjects.length; i++) {
      var fresh = gamesFor(subjects[i]).filter(function (g) { return !starsOf(g, stats); })[0];
      if (fresh) return fresh;
    }
    return firstToPlay(gamesFor(subjects[0]), stats);
  }

  /** The game after this one: same subject, later on the list, and without a star if possible. */
  function nextAfter(id, stats) {
    var game = byId(id);
    if (!game) return null;
    var list = gamesFor(game.subject);
    var at = list.indexOf(game);
    var others = list.slice(at + 1).concat(list.slice(0, Math.max(at, 0)));
    return others.filter(function (g) { return !starsOf(g, stats); })[0] || others[0] || null;
  }

  var api = { LEVELS: LEVELS, SUBJECTS: SUBJECTS, GAMES: GAMES, PATHS: PATHS, SKILL_NAMES: SKILL_NAMES,
    byId: byId, pathStep: pathStep, agesLabel: agesLabel, gamesFor: gamesFor, nextFor: nextFor, nextAfter: nextAfter };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KlgCatalogue = api;
})(typeof window !== "undefined" ? window : globalThis);
