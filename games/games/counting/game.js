/**
 * Counting question generator (pre-K).
 * A cluster of identical emoji is shown and the child taps how many there
 * are. The range is picked on the start screen (1–5, 1–10, 1–20) or with
 * ?max=N (clamped to 5–20); each count is asked at most once per round via
 * the engine's dedupeKey.
 *
 * Groups bigger than five are split into rows of five (separated by em
 * spaces / line wraps) so kids can count in fives instead of losing their
 * place in one long row.
 *
 * Distractors are the neighbours (n±1, n±2) — the answers kids land on when
 * they skip or double-count one.
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

function getMaxCount() {
  const raw = parseInt(new URLSearchParams(window.location.search).get("max"), 10);
  if (!Number.isInteger(raw)) return 10;
  return Math.min(20, Math.max(5, raw));
}

const THINGS = ["🍎", "⭐", "🎈", "🐞", "🌸", "🐤", "🍪", "⚽", "🦋", "🍓", "🐢", "🚗"];

/** n emoji in groups of five, e.g. "🍎🍎🍎🍎🍎 🍎🍎" (em space survives
 *  HTML whitespace collapsing, unlike a plain space). */
function emojiCluster(emoji, n) {
  const groups = [];
  for (let i = 0; i < n; i += 5) {
    groups.push(emoji.repeat(Math.min(5, n - i)));
  }
  return groups.join(" ");
}

function makeDistractors(n, max) {
  const wrongs = new Set();
  for (const c of shuffle([n - 1, n + 1, n - 2, n + 2])) {
    if (c >= 1 && c <= max + 2) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const r = randomInt(1, max + 2);
    if (r !== n) wrongs.add(r);
  }
  return [...wrongs];
}

function generateCountingQuestion(max) {
  return (askedSet) => {
    const available = [];
    for (let n = 1; n <= max; n++) {
      if (!askedSet.has(n)) available.push(n);
    }
    const pool = available.length ? available : [...Array(max)].map((_, i) => i + 1);
    const n = pool[randomInt(0, pool.length - 1)];
    const emoji = THINGS[randomInt(0, THINGS.length - 1)];
    return {
      prompt: emojiCluster(emoji, n),
      dedupeKey: n,
      correctAnswer: n,
      choices: shuffle([n, ...makeDistractors(n, max)]),
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
  const max = getMaxCount();
  const totalQuestions = Math.min(10, max);
  const timePerQuestion = max > 10 ? 30 : 20;
  const storageKey = "klg-counting-best-ms:" + max;

  document.getElementById("mode-label").textContent = `Counting 1 to ${max}`;
  document.getElementById("quiz-info").textContent =
    `${totalQuestions} questions • ${timePerQuestion} seconds each • count and tap the number`;

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

  const quiz = new QuizEngine({
    totalQuestions,
    timePerQuestion,
    generateQuestion: generateCountingQuestion(max),
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
