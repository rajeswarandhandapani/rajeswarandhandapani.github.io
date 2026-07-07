/**
 * Comparing numbers question generator.
 * ?type=biggest|smallest|symbol picks one skill (default mixes all three);
 * ?max=10|100|1000 picks the number range (default 100). Type and range
 * combine freely.
 *
 * Question kinds:
 *  - biggest / smallest: four numbers are shown as the answer buttons and
 *    the child taps the biggest (or smallest) one.
 *  - symbol: "37 __ 73" — pick the right sign out of <, > and = (equal
 *    pairs come up roughly one time in five, so = stays a live option).
 *
 * The four numbers aren't random-random: half the time they're built from
 * the same digits scrambled (37, 73, 33, 77 or 342, 432, 423, 324), the
 * classic place-value trap where kids compare the wrong digit first; the
 * rest are close neighbours. Symbol pairs use the same digit-swap trick.
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

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function getMaxNumber() {
  const raw = parseInt(new URLSearchParams(window.location.search).get("max"), 10);
  return raw === 10 || raw === 1000 ? raw : 100;
}

function getType() {
  const type = new URLSearchParams(window.location.search).get("type");
  return ["biggest", "smallest", "symbol"].includes(type) ? type : "all";
}

/** Four distinct numbers built from the same digits scrambled (place-value
 *  trap). Falls back to null when the range is too small for the trick. */
function scrambledDigitSet(max) {
  if (max < 100) return null;
  const numbers = new Set();
  if (max === 100) {
    const a = randomInt(1, 9);
    let b;
    do {
      b = randomInt(1, 9);
    } while (b === a);
    [a * 10 + b, b * 10 + a, a * 11, b * 11].forEach((n) => numbers.add(n));
  } else {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const [a, b, c] = digits;
    const perms = shuffle([
      [a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a],
    ]).slice(0, 4);
    perms.forEach(([x, y, z]) => numbers.add(x * 100 + y * 10 + z));
  }
  return numbers.size === 4 ? [...numbers] : null;
}

/** Four distinct numbers bunched close together. */
function closeNumberSet(max) {
  const spread = max === 10 ? 4 : max === 100 ? 12 : 60;
  const base = randomInt(1, max - spread);
  const numbers = new Set();
  while (numbers.size < 4) {
    numbers.add(base + randomInt(0, spread));
  }
  return [...numbers];
}

function makeFourNumbers(max) {
  const scrambled = Math.random() < 0.5 ? scrambledDigitSet(max) : null;
  return scrambled || closeNumberSet(max);
}

function makeBiggestQuestion(max) {
  const numbers = makeFourNumbers(max);
  return {
    prompt: "Tap the BIGGEST number!",
    dedupeKey: "big:" + [...numbers].sort((a, b) => a - b).join(","),
    correctAnswer: Math.max(...numbers),
    choices: shuffle(numbers),
  };
}

function makeSmallestQuestion(max) {
  const numbers = makeFourNumbers(max);
  return {
    prompt: "Tap the SMALLEST number!",
    dedupeKey: "small:" + [...numbers].sort((a, b) => a - b).join(","),
    correctAnswer: Math.min(...numbers),
    choices: shuffle(numbers),
  };
}

function makeSymbolQuestion(max) {
  let a, b;
  if (Math.random() < 0.2) {
    a = b = randomInt(1, max); // equals must stay a live option
  } else if (max >= 100 && Math.random() < 0.5) {
    // Same digits swapped: 37 vs 73 — the compare-the-wrong-digit trap.
    const x = randomInt(1, 9);
    let y;
    do {
      y = randomInt(1, 9);
    } while (y === x);
    const scale = max === 1000 ? randomInt(0, 1) : 0;
    a = (x * 10 + y) * 10 ** scale;
    b = (y * 10 + x) * 10 ** scale;
  } else {
    a = randomInt(1, max);
    do {
      b = randomInt(Math.max(1, a - 15), Math.min(max, a + 15));
    } while (b === a);
  }
  const correct = a < b ? "<" : a > b ? ">" : "=";
  return {
    prompt: `${formatNumber(a)}  __  ${formatNumber(b)}`,
    correctAnswer: correct,
    choices: ["<", "=", ">"],
  };
}

const QUESTION_KINDS = {
  biggest: [makeBiggestQuestion],
  smallest: [makeSmallestQuestion],
  symbol: [makeSymbolQuestion],
};
QUESTION_KINDS.all = [makeBiggestQuestion, makeSmallestQuestion, makeSymbolQuestion];

function formatAnswer(value) {
  return typeof value === "number" ? formatNumber(value) : String(value);
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
  const type = getType();
  const totalQuestions = 15;
  const storageKey = `klg-compare-best-ms:${type}:${max}`;
  const kinds = QUESTION_KINDS[type];

  const typeLabels = {
    all: "Biggest, smallest & signs",
    biggest: "Tap the biggest number",
    smallest: "Tap the smallest number",
    symbol: "Pick the right < > = sign",
  };
  document.getElementById("mode-label").textContent =
    `${typeLabels[type]} • numbers to ${formatNumber(max)}`;

  // Mode links live in two groups; rebuild each href so it keeps the
  // selection made in the other group.
  document.querySelectorAll("#type-links a").forEach((link) => {
    const linkType = link.dataset.type;
    const params = new URLSearchParams();
    if (linkType !== "all") params.set("type", linkType);
    if (max !== 100) params.set("max", max);
    link.href = params.toString() ? "?" + params.toString() : "index.html";
    if (linkType === type) link.classList.replace("btn-outline-secondary", "btn-secondary");
  });
  document.querySelectorAll("#range-links a").forEach((link) => {
    const linkMax = parseInt(link.dataset.max, 10);
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (linkMax !== 100) params.set("max", linkMax);
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
    timePerQuestion: 120,
    generateQuestion: () => kinds[randomInt(0, kinds.length - 1)](max),
    formatAnswer,
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
