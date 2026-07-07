/**
 * Addition & subtraction facts question generator.
 * ?op=add|sub picks the operation (default mixes both); ?max=10|20|100 picks
 * the range (default 20). Within 10/20 the sum (or starting number) stays in
 * range; max=100 means two-digit problems. Op and range combine freely.
 *
 * Distractors are the mistakes kids actually make: off-by-one and off-by-two
 * slips everywhere, forgetting the carry/borrow (±10) on two-digit problems,
 * and the classic column-subtraction error of subtracting the smaller digit
 * from the larger one in each column (52 − 38 → 26).
 *
 * Best-time record: same rules as the multiplication quiz — saved per
 * op + range in localStorage, only for perfect scores.
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

function getRange() {
  const raw = parseInt(new URLSearchParams(window.location.search).get("max"), 10);
  return raw === 10 || raw === 100 ? raw : 20;
}

function getOp() {
  const op = new URLSearchParams(window.location.search).get("op");
  return op === "add" || op === "sub" ? op : "mix";
}

/** Digit-wise |a−b| per column — what kids get when they subtract the
 *  smaller digit from the larger one and never borrow (52 − 38 → 26). */
function columnSubtractionError(a, b) {
  const ones = Math.abs((a % 10) - (b % 10));
  const tens = Math.abs(Math.floor(a / 10) - Math.floor(b / 10));
  return tens * 10 + ones;
}

function makeAdditionQuestion(max) {
  let a, b;
  if (max === 100) {
    a = randomInt(10, 89);
    b = randomInt(10, 99 - a);
  } else {
    a = randomInt(1, max - 1);
    b = randomInt(1, max - a);
  }
  return { a, b, symbol: "+", correct: a + b };
}

function makeSubtractionQuestion(max) {
  let a, b;
  if (max === 100) {
    a = randomInt(21, 99);
    b = randomInt(10, a - 1);
  } else {
    a = randomInt(3, max);
    b = randomInt(1, a - 1);
  }
  return { a, b, symbol: "−", correct: a - b };
}

function makeDistractors({ a, b, symbol, correct }, max) {
  const candidates = [];
  if (max === 100) {
    if (symbol === "−") {
      const columns = columnSubtractionError(a, b);
      if (columns !== correct) candidates.push(columns);
    }
    candidates.push(...shuffle([correct - 10, correct + 10]));
  }
  candidates.push(...shuffle([correct - 1, correct + 1, correct - 2, correct + 2]));

  const wrongs = new Set();
  for (const c of candidates) {
    if (c >= 0 && c !== correct) wrongs.add(c);
    if (wrongs.size === 3) break;
  }
  while (wrongs.size < 3) {
    const c = correct + (randomInt(0, 1) ? 1 : -1) * randomInt(3, 5);
    if (c >= 0) wrongs.add(c);
  }
  return [...wrongs];
}

function generateQuestionForMode(op, max) {
  return () => {
    const useAdd = op === "add" || (op === "mix" && randomInt(0, 1) === 0);
    const q = useAdd ? makeAdditionQuestion(max) : makeSubtractionQuestion(max);
    return {
      prompt: `${q.a} ${q.symbol} ${q.b}`,
      correctAnswer: q.correct,
      choices: shuffle([q.correct, ...makeDistractors(q, max)]),
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
  const max = getRange();
  const op = getOp();
  const totalQuestions = 20;
  const timePerQuestion = max === 100 ? 15 : 10;
  const storageKey = `klg-addsub-best-ms:${op}:${max}`;

  const opLabels = { mix: "Addition + subtraction", add: "Addition", sub: "Subtraction" };
  const rangeLabels = { 10: "within 10", 20: "within 20", 100: "two-digit numbers" };
  document.getElementById("mode-label").textContent = `${opLabels[op]} • ${rangeLabels[max]}`;
  document.getElementById("quiz-info").textContent =
    `${totalQuestions} questions • ${timePerQuestion} seconds each • multiple choice`;

  // Mode links live in two groups; rebuild each href so it keeps the
  // selection made in the other group.
  document.querySelectorAll("#op-links a").forEach((link) => {
    const linkOp = link.dataset.op;
    const params = new URLSearchParams();
    if (linkOp !== "mix") params.set("op", linkOp);
    if (max !== 20) params.set("max", max);
    link.href = params.toString() ? "?" + params.toString() : "index.html";
    if (linkOp === op) link.classList.replace("btn-outline-secondary", "btn-secondary");
  });
  document.querySelectorAll("#range-links a").forEach((link) => {
    const linkMax = parseInt(link.dataset.max, 10);
    const params = new URLSearchParams();
    if (op !== "mix") params.set("op", op);
    if (linkMax !== 20) params.set("max", linkMax);
    link.href = params.toString() ? "?" + params.toString() : "index.html";
    if (linkMax === max) link.classList.replace("btn-outline-secondary", "btn-secondary");
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
    generateQuestion: generateQuestionForMode(op, max),
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
