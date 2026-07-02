/**
 * Multiplication tables question generator.
 * Reads ?tables=6,7,8 from the URL to restrict practice to specific tables;
 * defaults to tables 1-11.
 *
 * Best-time record: answering time is tracked by QuizEngine; a record is
 * saved (per table selection, in localStorage) only for perfect scores so
 * speed never beats accuracy.
 */
function getSelectedTables() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tables");
  if (!raw) return [...Array(11)].map((_, i) => i + 1);
  const tables = raw
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 11);
  return tables.length ? tables : [...Array(11)].map((_, i) => i + 1);
}

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

function generateMultiplicationQuestion(tables) {
  const allPairs = tables.flatMap((a) => [...Array(11)].map((_, i) => [a, i + 1]));
  return (askedSet) => {
    const available = allPairs.filter(
      ([a, b]) => !askedSet.has(`${a} × ${b}`) && !askedSet.has(`${b} × ${a}`)
    );
    const pool = available.length ? available : allPairs;
    const [a, b] = pool[randomInt(0, pool.length - 1)];

    const correctAnswer = a * b;
    const choices = new Set([correctAnswer]);
    while (choices.size < 4) {
      const offset = randomInt(-10, 10) || 1;
      const distractor = correctAnswer + offset;
      if (distractor > 0) choices.add(distractor);
    }

    return {
      prompt: `${a} × ${b}`,
      correctAnswer,
      choices: shuffle([...choices]),
    };
  };
}

function bestTimeKey(tables) {
  return "klg-mult-best-ms:" + tables.join(",");
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
  const tables = getSelectedTables();
  const totalQuestions = Math.min(25, tables.length * 11);
  const storageKey = bestTimeKey(tables);

  document.getElementById("tables-label").textContent =
    tables.length === 11 ? "Tables 1-11" : `Table${tables.length > 1 ? "s" : ""} ${tables.join(", ")}`;
  document.getElementById("quiz-info").textContent =
    `${totalQuestions} questions • 10 seconds each • multiple choice`;

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
    timePerQuestion: 10,
    generateQuestion: generateMultiplicationQuestion(tables),
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
