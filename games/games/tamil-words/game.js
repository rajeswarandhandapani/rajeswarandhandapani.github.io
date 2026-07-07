/**
 * Tamil words question generator — the next step after the alphabets quiz.
 * Reads ?type=picture|meaning from the URL; defaults to a mix of both.
 *
 * Question kinds:
 *  - picture: an emoji as the prompt, pick the matching Tamil word (🐘 → யானை)
 *  - meaning: a Tamil word as the prompt, pick its English meaning
 *
 * Wrong choices are drawn from the same category (an animal's distractors
 * are other animals), so the quiz tests real word recognition instead of
 * "which of these is even an animal".
 *
 * The vocabulary lives in assets/js/tamil-words-data.js (TAMIL_WORDS),
 * shared with the Tamil Word Builder quiz; load it before this file.
 */

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

/** Pick a word plus 3 same-category distractors. */
function pickWordAndDistractors() {
  const word = TAMIL_WORDS[randomInt(0, TAMIL_WORDS.length - 1)];
  const sameCat = TAMIL_WORDS.filter((w) => w.cat === word.cat && w !== word);
  return { word, distractors: shuffle(sameCat).slice(0, 3) };
}

function makePictureQuestion() {
  const { word, distractors } = pickWordAndDistractors();
  return {
    prompt: word.emoji,
    correctAnswer: word.tamil,
    choices: shuffle([word, ...distractors].map((w) => w.tamil)),
    kind: "picture",
  };
}

function makeMeaningQuestion() {
  const { word, distractors } = pickWordAndDistractors();
  return {
    prompt: word.tamil,
    correctAnswer: word.english,
    choices: shuffle([word, ...distractors].map((w) => w.english)),
    kind: "meaning",
  };
}

const QUESTION_KINDS = {
  picture: [makePictureQuestion],
  meaning: [makeMeaningQuestion],
};
QUESTION_KINDS.all = [...QUESTION_KINDS.picture, ...QUESTION_KINDS.meaning];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "picture" || type === "meaning" ? type : "all";
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
  const totalQuestions = 20;
  const storageKey = "klg-tamilwords-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];
  const questionText = document.getElementById("question-text");
  const choicesContainer = document.getElementById("choices-container");

  const labels = {
    all: `Pictures + meanings, ${TAMIL_WORDS.length} everyday words`,
    picture: "Match the picture to the Tamil word",
    meaning: "Match the Tamil word to its meaning",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkType = new URLSearchParams(
      link.getAttribute("href").replace(/^[^?]*\??/, "")
    ).get("type");
    if ((linkType || "all") === mode) {
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
    totalQuestions,
    timePerQuestion: 120,
    generateQuestion: () => {
      const q = kinds[randomInt(0, kinds.length - 1)]();
      // Emoji prompts render huge with Tamil choices; Tamil-word prompts
      // use the Tamil font with English choices.
      questionText.classList.toggle("quiz-question-xl", q.kind === "picture");
      questionText.classList.toggle("tamil-word", q.kind === "meaning");
      choicesContainer.classList.toggle("tamil-glyph", q.kind === "picture");
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
