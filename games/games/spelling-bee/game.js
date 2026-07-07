/**
 * Spelling Bee question generator. The browser's speech synthesis says a
 * word out loud (tap the 🔊 to hear it again) and the child picks the
 * correct spelling from four choices. Three levels picked with ?level=:
 *
 *  - 1 (default): short phonetic words (cat, ship, rain).
 *  - 2: longer everyday words (banana, school, window).
 *  - 3: tricky spellings (because, knight, scissors).
 *
 * Wrong choices are misspellings generated in code, in order of how
 * convincing they are:
 *  - sound-alike substitutions kids actually write (freind, elefant,
 *    becauze, enuff, night→knite) and dropped unstressed vowels (choclate);
 *  - doubling errors (scisors, beautifull) and dropped silent e (cak);
 *  - adjacent-letter swaps (becuase) as filler.
 * A misspelling is never allowed to be a real word ("meet" must not offer
 * "meat"), checked against all game words plus a homophone/common-word list.
 *
 * If speech synthesis is unavailable the prompt degrades to the word's
 * emoji + clue ("🐱 a pet that says meow"), so the quiz stays playable.
 */
const WORD_LEVELS = {
  1: [
    { word: "cat", emoji: "🐱", clue: "a pet that says meow" },
    { word: "dog", emoji: "🐶", clue: "a pet that says woof" },
    { word: "sun", emoji: "☀️", clue: "it shines in the day sky" },
    { word: "bed", emoji: "🛏️", clue: "you sleep in it" },
    { word: "cup", emoji: "🥤", clue: "you drink from it" },
    { word: "hat", emoji: "🎩", clue: "you wear it on your head" },
    { word: "fish", emoji: "🐟", clue: "it swims in water" },
    { word: "ship", emoji: "🚢", clue: "a very big boat" },
    { word: "tree", emoji: "🌳", clue: "it has leaves and branches" },
    { word: "book", emoji: "📖", clue: "you read it" },
    { word: "moon", emoji: "🌙", clue: "it shines at night" },
    { word: "star", emoji: "⭐", clue: "it twinkles in the sky" },
    { word: "cake", emoji: "🎂", clue: "a birthday treat" },
    { word: "frog", emoji: "🐸", clue: "a green hopper that says ribbit" },
    { word: "milk", emoji: "🥛", clue: "a white drink from cows" },
    { word: "hand", emoji: "✋", clue: "it has five fingers" },
    { word: "duck", emoji: "🦆", clue: "a bird that says quack" },
    { word: "ball", emoji: "⚽", clue: "you kick or throw it" },
    { word: "sock", emoji: "🧦", clue: "you wear it on your foot" },
    { word: "rain", emoji: "🌧️", clue: "water falling from clouds" },
    { word: "blue", emoji: "🔵", clue: "the color of the sky" },
    { word: "green", emoji: "🟢", clue: "the color of grass" },
    { word: "jump", emoji: "🤸", clue: "hop up high" },
    { word: "play", emoji: "🎲", clue: "have fun with games" },
  ],
  2: [
    { word: "apple", emoji: "🍎", clue: "a crunchy red fruit" },
    { word: "banana", emoji: "🍌", clue: "a long yellow fruit" },
    { word: "monkey", emoji: "🐵", clue: "it swings in the trees" },
    { word: "garden", emoji: "🌷", clue: "flowers grow here" },
    { word: "window", emoji: "🪟", clue: "you look outside through it" },
    { word: "pencil", emoji: "✏️", clue: "you write with it" },
    { word: "school", emoji: "🏫", clue: "where you go to learn" },
    { word: "friend", emoji: "🤝", clue: "someone you love to play with" },
    { word: "happy", emoji: "😄", clue: "how you feel on your birthday" },
    { word: "water", emoji: "💧", clue: "you drink it every day" },
    { word: "mother", emoji: "👩", clue: "another word for mom" },
    { word: "father", emoji: "👨", clue: "another word for dad" },
    { word: "yellow", emoji: "🟡", clue: "the color of the sun" },
    { word: "orange", emoji: "🟠", clue: "a color and a fruit" },
    { word: "winter", emoji: "⛄", clue: "the coldest season" },
    { word: "summer", emoji: "🏖️", clue: "the hottest season" },
    { word: "dinner", emoji: "🍽️", clue: "the evening meal" },
    { word: "rabbit", emoji: "🐰", clue: "it hops and eats carrots" },
    { word: "spider", emoji: "🕷️", clue: "it spins a web" },
    { word: "turtle", emoji: "🐢", clue: "it carries its shell everywhere" },
    { word: "cookie", emoji: "🍪", clue: "a sweet round treat" },
    { word: "button", emoji: "🔘", clue: "it keeps your shirt closed" },
    { word: "little", emoji: "🐜", clue: "very small" },
    { word: "seven", emoji: "7️⃣", clue: "the number after six" },
  ],
  3: [
    { word: "because", emoji: "🤔", clue: "the word that gives a reason" },
    { word: "beautiful", emoji: "🌸", clue: "very very pretty" },
    { word: "elephant", emoji: "🐘", clue: "the biggest land animal" },
    { word: "umbrella", emoji: "☂️", clue: "keeps you dry in the rain" },
    { word: "tomorrow", emoji: "📅", clue: "the day after today" },
    { word: "together", emoji: "🤝", clue: "with each other" },
    { word: "different", emoji: "🔀", clue: "not the same" },
    { word: "favorite", emoji: "💖", clue: "the one you like best" },
    { word: "surprise", emoji: "🎁", clue: "you never saw it coming" },
    { word: "scissors", emoji: "✂️", clue: "they cut paper" },
    { word: "knight", emoji: "🛡️", clue: "a soldier in shining armor" },
    { word: "wrote", emoji: "✍️", clue: "yesterday I ___ a letter" },
    { word: "laugh", emoji: "😂", clue: "what you do at a funny joke" },
    { word: "enough", emoji: "🛑", clue: "no more is needed" },
    { word: "island", emoji: "🏝️", clue: "land with water all around it" },
    { word: "answer", emoji: "✅", clue: "what you give to a question" },
    { word: "often", emoji: "🔁", clue: "happening many times" },
    { word: "always", emoji: "♾️", clue: "every single time" },
    { word: "thought", emoji: "💭", clue: "an idea inside your head" },
    { word: "straight", emoji: "📏", clue: "not bendy or curvy" },
    { word: "whistle", emoji: "😙", clue: "blow air to make a tune" },
    { word: "squirrel", emoji: "🐿️", clue: "a bushy-tailed nut lover" },
    { word: "calendar", emoji: "🗓️", clue: "it shows the days and months" },
    { word: "chocolate", emoji: "🍫", clue: "a sweet brown treat" },
  ],
};

// Real words a generated misspelling could collide with — mostly homophones
// of game words. A distractor matching any of these would be a fair answer
// ("meet" spoken aloud IS spelled "meat" to the ear), so they're banned.
const COMMON_WORDS = new Set([
  "night", "soon", "son", "sea", "see", "meet", "meat", "been", "bean",
  "week", "weak", "won", "one", "know", "no", "new", "knew", "right",
  "write", "tale", "tail", "made", "maid", "plane", "plain", "here",
  "hear", "there", "their", "buy", "bye", "sale", "sail", "would", "wood",
  "whole", "hole", "hour", "our", "knot", "not", "bee", "be", "blew",
  "blue", "ate", "eight", "some", "sum", "road", "rode", "lead", "led",
  "mail", "male", "pair", "pear", "two", "too", "to", "flour", "flower",
  "sell", "cell", "sent", "cent", "scent", "stair", "stare", "bear",
  "bare", "hair", "hare", "fair", "fare", "later", "latter", "diner",
  "strait", "seen", "scene", "favourite", "colour", "wrote", "root",
]);

const REAL_WORDS = new Set([
  ...COMMON_WORDS,
  ...Object.values(WORD_LEVELS).flat().map((w) => w.word),
]);

// Sound-alike substitutions, applied to the first occurrence in the word.
const SUBS = [
  ["ee", "ea"], ["ea", "ee"], ["ai", "ay"], ["ay", "ai"], ["oo", "u"],
  ["u", "oo"], ["c", "k"], ["k", "c"], ["ck", "k"], ["s", "c"],
  ["ce", "se"], ["se", "ze"], ["ph", "f"], ["f", "ph"], ["ie", "ei"],
  ["ei", "ie"], ["er", "ur"], ["ur", "er"], ["ir", "er"], ["ow", "ou"],
  ["ou", "au"], ["au", "aw"], ["y", "i"], ["i", "y"], ["wh", "w"],
  ["kn", "n"], ["wr", "r"], ["igh", "ite"], ["aight", "ate"],
  ["augh", "aff"], ["ough", "uff"], ["tion", "shun"], ["ar", "er"],
  ["en", "in"], ["sw", "s"], ["sl", "l"], ["sc", "s"], ["tle", "le"],
  ["rpr", "pr"], ["le", "el"],
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const isVowel = (ch) => "aeiou".includes(ch);

/** Candidate misspellings in tiers, most convincing first. */
function misspellingTiers(word) {
  const soundAlike = [];
  const doubling = [];
  const swaps = [];

  for (const [from, to] of SUBS) {
    const i = word.indexOf(from);
    if (i !== -1) {
      soundAlike.push(word.slice(0, i) + to + word.slice(i + from.length));
    }
  }
  // Dropped unstressed vowel between consonants: chocolate → choclate.
  for (let i = 1; i < word.length - 1; i++) {
    if (isVowel(word[i]) && !isVowel(word[i - 1]) && !isVowel(word[i + 1]) && word.length > 4) {
      soundAlike.push(word.slice(0, i) + word.slice(i + 1));
    }
  }

  if (word.endsWith("e")) doubling.push(word.slice(0, -1));
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i + 1]) {
      doubling.push(word.slice(0, i) + word.slice(i + 1)); // scisors
    }
  }
  for (let i = 1; i < word.length; i++) {
    const ch = word[i];
    if (!isVowel(ch) && ch !== word[i - 1] && ch !== word[i + 1]) {
      doubling.push(word.slice(0, i + 1) + ch + word.slice(i + 1)); // beautifull
    }
  }

  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] !== word[i + 1]) {
      swaps.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)); // becuase
    }
  }

  return [soundAlike, doubling, swaps];
}

function pickWrongSpellings(word) {
  const seen = new Set([word]);
  const wrongs = [];
  for (const tier of misspellingTiers(word)) {
    for (const cand of shuffle(tier)) {
      if (wrongs.length === 3) return wrongs;
      if (cand.length < 3 || seen.has(cand) || REAL_WORDS.has(cand)) continue;
      seen.add(cand);
      wrongs.push(cand);
    }
  }
  return wrongs;
}

const hasSpeech = "speechSynthesis" in window;

function speak(text) {
  if (!hasSpeech) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

function getLevel() {
  const raw = new URLSearchParams(window.location.search).get("level");
  return WORD_LEVELS[raw] ? raw : "1";
}

function generateSpellingQuestion(words) {
  return (askedSet) => {
    const remaining = words.filter((w) => !askedSet.has(w.word));
    const pool = remaining.length ? remaining : words;
    const entry = pool[randomInt(0, pool.length - 1)];

    if (hasSpeech) speak(entry.word);
    return {
      prompt: hasSpeech ? `🔊 ${entry.emoji}` : `${entry.emoji} ${entry.clue}`,
      dedupeKey: entry.word,
      correctAnswer: entry.word,
      choices: shuffle([entry.word, ...pickWrongSpellings(entry.word)]),
      speech: entry.word,
    };
  };
}

function loadBestMs(key) {
  try {
    const v = parseInt(localStorage.getItem(key), 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (e) {
    return null;
  }
}

function saveBestMs(key, ms) {
  try {
    localStorage.setItem(key, String(ms));
  } catch (e) {
    /* storage unavailable (private mode) — records just won't persist */
  }
}

function formatSeconds(ms) {
  return (ms / 1000).toFixed(1) + "s";
}

const LEVEL_LABELS = {
  1: "Level 1 — Easy Words",
  2: "Level 2 — Bigger Words",
  3: "Level 3 — Tricky Words",
};

document.addEventListener("DOMContentLoaded", () => {
  const level = getLevel();
  const words = WORD_LEVELS[level];
  const storageKey = "klg-spelling-bee-best-ms:" + level;
  const questionText = document.getElementById("question-text");
  let currentSpeech = null;

  document.getElementById("mode-label").textContent =
    `${LEVEL_LABELS[level]} (${words.length} words)`;
  if (!hasSpeech) {
    document.getElementById("speech-note").textContent =
      "⚠️ This browser can't speak — you'll get a picture and a clue instead of a spoken word.";
    questionText.className = "quiz-question quiz-question-sm klg-tappable mb-4";
  }

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkLevel =
      new URLSearchParams(link.getAttribute("href").replace(/^[^?]*\??/, "")).get("level");
    if ((WORD_LEVELS[linkLevel] ? linkLevel : "1") === level) {
      link.classList.replace("btn-outline-secondary", "btn-secondary");
    }
  });

  const bestTimeNote = document.getElementById("best-time-note");
  function renderBestTimeNote() {
    const best = loadBestMs(storageKey);
    bestTimeNote.textContent = best
      ? `🏅 Best time: ${formatSeconds(best)} (perfect score)`
      : "🏅 Answer everything correctly to set a best-time record!";
  }
  renderBestTimeNote();

  const generate = generateSpellingQuestion(words);
  const quiz = new QuizEngine({
    totalQuestions: Math.min(15, words.length),
    timePerQuestion: 120,
    generateQuestion: (askedSet) => {
      const q = generate(askedSet);
      currentSpeech = q.speech || null;
      return q;
    },
    onFinish: ({ score, total, elapsedMs }) => {
      const timeEl = document.getElementById("results-time");
      const best = loadBestMs(storageKey);
      if (score === total) {
        if (best === null || elapsedMs < best) {
          saveBestMs(storageKey, elapsedMs);
          if (window.KlgSounds) KlgSounds.newRecord();
          timeEl.textContent = `⏱️ ${formatSeconds(elapsedMs)} — 🏅 New best time!`;
        } else {
          timeEl.textContent = `⏱️ ${formatSeconds(elapsedMs)} • Best: ${formatSeconds(best)}`;
        }
      } else {
        timeEl.textContent =
          `⏱️ ${formatSeconds(elapsedMs)} • Get all ${total} right to set a time record!` +
          (best ? ` (Best: ${formatSeconds(best)})` : "");
      }
      renderBestTimeNote();
    },
  });

  // Tap the 🔊 prompt to hear the word again.
  questionText.addEventListener("click", () => {
    if (currentSpeech !== null) speak(currentSpeech);
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    if (window.KlgSounds) KlgSounds.click();
    document.getElementById("start-screen").classList.add("d-none");
    quiz.start();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    if (window.KlgSounds) KlgSounds.click();
    quiz.start();
  });
});
