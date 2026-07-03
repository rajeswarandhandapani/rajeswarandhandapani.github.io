/**
 * Number sounds question generator (pre-K listening game).
 * The browser's speech synthesis says a number out loud and the child taps
 * the matching numeral — no reading required. The 🔊 prompt can be tapped
 * to hear the number again.
 *
 * The number range is picked on the start screen (1–5 up to 1–100) or with
 * ?max=N (clamped to 4–100 — below 4 there aren't enough wrong choices).
 * Each number is asked at most once per round via the engine's dedupeKey,
 * since every question displays the same 🔊 prompt.
 *
 * Distractors prefer the numbers kids actually confuse: neighbours (6 vs 7)
 * and the teen/-ty pairs (13 vs 30, 14 vs 40).
 *
 * If speech synthesis is unavailable the prompt shows the number word
 * ("seven") instead, so the game degrades into word-reading practice.
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

function getMaxNumber() {
  const raw = parseInt(new URLSearchParams(window.location.search).get("max"), 10);
  if (!Number.isInteger(raw)) return 10;
  return Math.min(100, Math.max(4, raw));
}

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberWord(n) {
  if (n === 100) return "one hundred";
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 ? `${tens}-${ONES[n % 10]}` : tens;
}

const hasSpeech = "speechSynthesis" in window;

function speakNumber(n) {
  if (!hasSpeech) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(n));
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

function makeDistractors(n, max) {
  const wrongs = new Set();
  // Teen/-ty mix-ups first (13 ↔ 30), then neighbours and ten-jumps.
  const candidates = [];
  if (n >= 13 && n <= 19) candidates.push((n - 10) * 10);
  if (n % 10 === 0 && n >= 30 && n <= 90) candidates.push(n / 10 + 10);
  candidates.push(...shuffle([n - 1, n + 1, n - 2, n + 2, n - 10, n + 10]));
  for (const c of candidates) {
    if (c >= 1 && c <= max && c !== n) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(1, max);
    if (r !== n) wrongs.add(r);
  }
  return [...wrongs];
}

function generateNumberQuestion(max) {
  return (askedSet) => {
    const available = [];
    for (let n = 1; n <= max; n++) {
      if (!askedSet.has(n)) available.push(n);
    }
    const pool = available.length ? available : [...Array(max)].map((_, i) => i + 1);
    const n = pool[randomInt(0, pool.length - 1)];
    speakNumber(n);
    return {
      prompt: hasSpeech ? "🔊" : numberWord(n),
      dedupeKey: n,
      correctAnswer: n,
      choices: shuffle([n, ...makeDistractors(n, max)]),
      number: n,
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

document.addEventListener("DOMContentLoaded", () => {
  const max = getMaxNumber();
  const totalQuestions = Math.min(10, max);
  const storageKey = "klg-numbers-best-ms:" + max;
  const questionText = document.getElementById("question-text");
  let currentNumber = null;

  document.getElementById("mode-label").textContent = `Numbers 1 to ${max}`;
  document.getElementById("quiz-info").textContent =
    `${totalQuestions} questions • 15 seconds each • tap what you hear`;
  if (!hasSpeech) {
    document.getElementById("speech-note").textContent =
      "⚠️ This browser can't speak — the number will be shown as a word instead.";
  }

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkMax = parseInt(
      new URLSearchParams(link.getAttribute("href").replace(/^[^?]*\??/, "")).get("max"),
      10
    );
    if ((Number.isInteger(linkMax) ? linkMax : 10) === max) {
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

  const generate = generateNumberQuestion(max);

  const quiz = new QuizEngine({
    totalQuestions,
    timePerQuestion: 15,
    generateQuestion: (askedSet) => {
      const q = generate(askedSet);
      currentNumber = q.number;
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

  // Tap the 🔊 to hear the number again.
  questionText.addEventListener("click", () => {
    if (currentNumber !== null) speakNumber(currentNumber);
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
