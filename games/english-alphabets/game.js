/**
 * English alphabet question generator. Four modes, picked with ?mode=:
 *
 *  - listen (default): the browser's speech synthesis says a letter name out
 *    loud and the child taps the matching letter — no reading required
 *    (same pattern as the Number Sounds game). Tap the 🔊 to hear it again.
 *  - case: match BIG and small letter shapes (B → b and b → B, each
 *    direction asked separately).
 *  - order: three letters of the alphabet are shown with a blank at the
 *    start or end (C D E __) — tap the letter that fills it.
 *  - phonics: a picture is shown and its word spoken ("apple") — tap the
 *    letter the word starts with. Tap the picture to hear the word again.
 *
 * Distractors prefer the mix-ups kids actually make:
 *  - listen: letters whose *names* rhyme (B/C/D/E/G/P/T/V/Z, A/J/K,
 *    F/L/M/N/S/X, I/Y, Q/U/W).
 *  - case: letters that *look* alike in the answer's case (b/d/p/q, m/n/w,
 *    i/l/j — see the lookalike tables).
 *  - order: the answer's alphabet neighbours (±1..3), never a letter
 *    already shown in the sequence.
 *  - phonics: lookalikes again, but never a letter that makes the same
 *    starting sound as the answer (C/K/Q, G/J, S/C) — those would be
 *    genuinely ambiguous, not tricky.
 *
 * If speech synthesis is unavailable, listen mode shows the small letter
 * (degrading into case matching) and phonics shows the word next to the
 * picture (degrading into first-letter reading).
 */
const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

// Letters whose spoken names rhyme — the classic listening mix-ups.
const NAME_RHYME_GROUPS = [
  ["B", "C", "D", "E", "G", "P", "T", "V", "Z"],
  ["A", "J", "K"],
  ["F", "L", "M", "N", "S", "X"],
  ["I", "Y"],
  ["Q", "U", "W"],
];
const NAME_RHYMES = {};
NAME_RHYME_GROUPS.forEach((group) => {
  group.forEach((l) => {
    NAME_RHYMES[l] = group.filter((other) => other !== l);
  });
});

// Letters that look alike, keyed by the letter, values in the same case.
const LOWER_LOOKALIKES = {
  a: "oce", b: "dpq", c: "eoa", d: "bqp", e: "cao", f: "tlk", g: "qpy",
  h: "nbk", i: "ljt", j: "igy", k: "hxf", l: "itj", m: "nwu", n: "muh",
  o: "ace", p: "qbd", q: "pgb", r: "nvm", s: "zce", t: "fli", u: "vnw",
  v: "uwy", w: "mvu", x: "kyz", y: "gvj", z: "sxr",
};
const UPPER_LOOKALIKES = {
  A: "HVM", B: "RPD", C: "GOQ", D: "OBQ", E: "FBL", F: "EPT", G: "CQO",
  H: "NMK", I: "LJT", J: "ILU", K: "XRH", L: "IJT", M: "NWH", N: "MHZ",
  O: "QCD", P: "RBF", Q: "OGC", R: "PBK", S: "ZCG", T: "IFY", U: "VWJ",
  V: "UWY", W: "MVU", X: "KYZ", Y: "VTX", Z: "SNX",
};

// One picture word per letter for phonics mode.
const PHONICS_WORDS = [
  { letter: "A", word: "apple", emoji: "🍎" },
  { letter: "B", word: "banana", emoji: "🍌" },
  { letter: "C", word: "cat", emoji: "🐱" },
  { letter: "D", word: "dog", emoji: "🐶" },
  { letter: "E", word: "egg", emoji: "🥚" },
  { letter: "F", word: "fish", emoji: "🐟" },
  { letter: "G", word: "grapes", emoji: "🍇" },
  { letter: "H", word: "house", emoji: "🏠" },
  { letter: "I", word: "ice cream", emoji: "🍦" },
  { letter: "J", word: "juice", emoji: "🧃" },
  { letter: "K", word: "kite", emoji: "🪁" },
  { letter: "L", word: "lion", emoji: "🦁" },
  { letter: "M", word: "moon", emoji: "🌙" },
  { letter: "N", word: "nose", emoji: "👃" },
  { letter: "O", word: "octopus", emoji: "🐙" },
  { letter: "P", word: "pizza", emoji: "🍕" },
  { letter: "Q", word: "queen", emoji: "👸" },
  { letter: "R", word: "rainbow", emoji: "🌈" },
  { letter: "S", word: "sun", emoji: "☀️" },
  { letter: "T", word: "tiger", emoji: "🐯" },
  { letter: "U", word: "umbrella", emoji: "☂️" },
  { letter: "V", word: "violin", emoji: "🎻" },
  { letter: "W", word: "whale", emoji: "🐳" },
  { letter: "X", word: "x-ray", emoji: "🩻" },
  { letter: "Y", word: "yo-yo", emoji: "🪀" },
  { letter: "Z", word: "zebra", emoji: "🦓" },
];

// Letters that make the same starting sound as the key — never valid
// phonics distractors (a "cat" that starts with K isn't a wrong answer).
const SAME_SOUND = { C: "KQS", K: "CQ", Q: "CK", S: "C", G: "J", J: "G" };

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

/** 3 wrong choices: preferred confusables first, then random from pool. */
function pickDistractors(preferred, pool, answer) {
  const wrongs = new Set();
  for (const c of shuffle(preferred)) {
    if (c !== answer) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = pool[randomInt(0, pool.length - 1)];
    if (r !== answer) wrongs.add(r);
  }
  return [...wrongs];
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

function pickUnasked(keys, askedSet) {
  const available = keys.filter((k) => !askedSet.has(k));
  const pool = available.length ? available : keys;
  return pool[randomInt(0, pool.length - 1)];
}

/* --- one generator per mode --------------------------------------------- */

function generateListenQuestion(askedSet) {
  const letter = pickUnasked(LETTERS, askedSet);
  speak(letter);
  return {
    prompt: hasSpeech ? "🔊" : letter.toLowerCase(),
    dedupeKey: letter,
    correctAnswer: letter,
    choices: shuffle([letter, ...pickDistractors(NAME_RHYMES[letter] || [], LETTERS, letter)]),
    speech: letter,
  };
}

const CASE_KEYS = LETTERS.flatMap((l) => ["U2L:" + l, "L2U:" + l]);

function generateCaseQuestion(askedSet) {
  const key = pickUnasked(CASE_KEYS, askedSet);
  const [dir, upper] = key.split(":");
  const lower = upper.toLowerCase();
  const toLower = dir === "U2L";
  const answer = toLower ? lower : upper;
  const lookalikes = toLower ? LOWER_LOOKALIKES[lower] : UPPER_LOOKALIKES[upper];
  const pool = toLower ? LETTERS.map((l) => l.toLowerCase()) : LETTERS;
  return {
    prompt: toLower ? upper : lower,
    dedupeKey: key,
    correctAnswer: answer,
    choices: shuffle([answer, ...pickDistractors([...lookalikes], pool, answer)]),
  };
}

function generateOrderQuestion() {
  const start = randomInt(0, LETTERS.length - 4); // window of 4 letters
  const blankAtEnd = Math.random() < 0.5;
  const answerIdx = blankAtEnd ? start + 3 : start;
  const shownIdxs = [0, 1, 2, 3].map((i) => start + i).filter((i) => i !== answerIdx);
  const shown = shownIdxs.map((i) => LETTERS[i]);
  const answer = LETTERS[answerIdx];

  const wrongs = new Set();
  const neighbours = shuffle([-1, 1, -2, 2, -3, 3].map((d) => answerIdx + d));
  for (const n of neighbours) {
    if (n >= 0 && n < LETTERS.length && !shownIdxs.includes(n)) wrongs.add(LETTERS[n]);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(0, LETTERS.length - 1);
    if (r !== answerIdx && !shownIdxs.includes(r)) wrongs.add(LETTERS[r]);
  }

  return {
    prompt: blankAtEnd ? shown.join(" ") + " __" : "__ " + shown.join(" "),
    correctAnswer: answer,
    choices: shuffle([answer, ...wrongs]),
  };
}

function generatePhonicsQuestion(askedSet) {
  const word = pickUnasked(PHONICS_WORDS.map((w) => w.word), askedSet);
  const entry = PHONICS_WORDS.find((w) => w.word === word);
  const answer = entry.letter;
  const banned = SAME_SOUND[answer] || "";
  const preferred = [...UPPER_LOOKALIKES[answer]].filter((l) => !banned.includes(l));
  const pool = LETTERS.filter((l) => !banned.includes(l));
  speak(entry.word);
  return {
    prompt: hasSpeech ? entry.emoji : `${entry.emoji} ${entry.word}`,
    dedupeKey: entry.word,
    correctAnswer: answer,
    choices: shuffle([answer, ...pickDistractors(preferred, pool, answer)]),
    speech: entry.word,
  };
}

/* --- page setup ---------------------------------------------------------- */

const MODES = {
  listen: {
    label: "Listen & Find",
    totalQuestions: 10,
    timePerQuestion: 15,
    generate: generateListenQuestion,
    info: "tap the letter you hear",
    desc:
      "Listen 👂 — a letter name is said out loud. Tap the 🔊 any time to " +
      "hear it again, then tap the matching letter. Turn your sound on!",
    promptClass: "quiz-question quiz-question-xl klg-tappable mb-4",
  },
  case: {
    label: "BIG & small letters",
    totalQuestions: 15,
    timePerQuestion: 10,
    generate: generateCaseQuestion,
    info: "match BIG and small letters",
    desc:
      "Every letter has a BIG shape and a small shape: B and b, G and g. " +
      "Find the partner of the letter shown!",
    promptClass: "quiz-question quiz-question-xl mb-4",
  },
  order: {
    label: "ABC Order",
    totalQuestions: 15,
    timePerQuestion: 15,
    generate: generateOrderQuestion,
    info: "find the missing letter",
    desc:
      "The alphabet always goes in the same order: A B C D… " +
      "Tap the letter that fills the blank.",
    promptClass: "quiz-question mb-4",
  },
  phonics: {
    label: "First Letters",
    totalQuestions: 15,
    timePerQuestion: 15,
    generate: generatePhonicsQuestion,
    info: "tap the first letter of the word",
    desc:
      "Look at the picture and listen to the word. Which letter does it " +
      "start with? Tap the picture to hear the word again.",
    promptClass: "quiz-question quiz-question-xl klg-tappable mb-4",
  },
};

function getMode() {
  const raw = new URLSearchParams(window.location.search).get("mode");
  return MODES[raw] ? raw : "listen";
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

document.addEventListener("DOMContentLoaded", () => {
  const mode = getMode();
  const config = MODES[mode];
  const storageKey = "klg-english-alphabets-best-ms:" + mode;
  const questionText = document.getElementById("question-text");
  let currentSpeech = null;

  document.getElementById("mode-label").textContent = config.label;
  document.getElementById("quiz-info").textContent =
    `${config.totalQuestions} questions • ${config.timePerQuestion} seconds each • ${config.info}`;
  document.getElementById("mode-desc").textContent = config.desc;
  questionText.className = config.promptClass;
  if (!hasSpeech && (mode === "listen" || mode === "phonics")) {
    document.getElementById("speech-note").textContent =
      "⚠️ This browser can't speak — the question will be shown as text instead.";
  }

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkMode = new URLSearchParams(link.getAttribute("href").replace(/^[^?]*\??/, "")).get("mode");
    if ((MODES[linkMode] ? linkMode : "listen") === mode) {
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

  const quiz = new QuizEngine({
    totalQuestions: config.totalQuestions,
    timePerQuestion: config.timePerQuestion,
    generateQuestion: (askedSet) => {
      const q = config.generate(askedSet);
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

  // Tap the 🔊 / picture to hear the letter or word again.
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
