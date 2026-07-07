/**
 * Fractions question generator (grades 3-5).
 * ?type=identify|equivalent|compare|add practices one skill; the default
 * mixes all four. Fractions are shown as plain "3/5" strings and pictures
 * are rows of colored/blank squares (🟩🟩🟩⬜⬜), so no images are needed.
 *
 * Question kinds:
 *  - identify:   🟩🟩🟩⬜⬜ — what fraction is green?
 *  - equivalent: "Which fraction is equal to 1/2?"
 *  - compare:    tap the biggest/smallest of four fractions (same
 *                denominator, or same numerator — where "bigger denominator
 *                means bigger fraction" is exactly the trap)
 *  - add:        "1/6 + 3/6 = ?" and "5/8 − 2/8 = ?" with like denominators
 *
 * Distractors are the real mistakes: counting the white squares instead
 * (2/5), part-over-part (3/2), flipping the fraction upside down (5/3),
 * adding tops AND bottoms (1/4 + 2/4 = 3/8), and adding instead of
 * multiplying to "grow" an equivalent fraction (1/2 → 2/3). A distractor is
 * never allowed to equal the correct answer in value (2/4 won't be offered
 * against 1/2), checked by cross-multiplication.
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

function frac(n, d) {
  return `${n}/${d}`;
}

function valueEquals([n1, d1], [n2, d2]) {
  return n1 * d2 === n2 * d1;
}

/** correct + wrong candidates as [n, d] pairs -> 4 shuffled "n/d" strings.
 *  Candidates equal in value to the correct answer are dropped; blanks are
 *  filled with nudged numerators. */
function buildChoices(correct, candidates) {
  const choices = [frac(...correct)];
  for (const cand of candidates) {
    if (choices.length === 4) break;
    const [n, d] = cand;
    if (n < 1 || d < 2 || valueEquals(cand, correct)) continue;
    const text = frac(n, d);
    if (!choices.includes(text)) choices.push(text);
  }
  let bump = 1;
  while (choices.length < 4) {
    const cand = [correct[0] + bump, correct[1]];
    const text = frac(...cand);
    if (cand[0] >= 1 && !valueEquals(cand, correct) && !choices.includes(text)) {
      choices.push(text);
    }
    bump += 1;
  }
  return shuffle(choices);
}

const IDENTIFY_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10];

function makeIdentifyQuestion() {
  const d = IDENTIFY_DENOMINATORS[randomInt(0, IDENTIFY_DENOMINATORS.length - 1)];
  const n = randomInt(1, d - 1);
  const picture = "🟩".repeat(n) + "⬜".repeat(d - n);
  return {
    prompt: `${picture} — what fraction is green?`,
    correctAnswer: frac(n, d),
    choices: buildChoices(
      [n, d],
      shuffle([
        [d - n, d], // counted the white squares
        [n, d - n], // part over part
        [d, n],     // flipped upside down
        [n, d + 1],
        [n + 1, d],
      ])
    ),
  };
}

const EQUIVALENT_BASES = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5]];

function makeEquivalentQuestion() {
  const [n, d] = EQUIVALENT_BASES[randomInt(0, EQUIVALENT_BASES.length - 1)];
  const k = randomInt(2, Math.min(4, Math.floor(20 / d)));
  return {
    prompt: `Which fraction is equal to ${frac(n, d)}?`,
    correctAnswer: frac(n * k, d * k),
    choices: buildChoices(
      [n * k, d * k],
      shuffle([
        [n + k, d + k],     // added instead of multiplied
        [n * k, d * (k + 1)],
        [n * k + 1, d * k],
        [d, n * d],
      ])
    ),
  };
}

function makeCompareQuestion() {
  let fractions;
  if (randomInt(0, 1) === 0) {
    // Same denominator — compare numerators.
    const d = [6, 8, 10, 12][randomInt(0, 3)];
    const numerators = shuffle([...Array(d - 1)].map((_, i) => i + 1)).slice(0, 4);
    fractions = numerators.map((n) => [n, d]);
  } else {
    // Same numerator — the bigger the denominator, the SMALLER the piece.
    const n = randomInt(1, 3);
    const denominators = shuffle([n + 1, n + 2, n + 4, n + 7, n + 9]).slice(0, 4);
    fractions = denominators.map((d) => [n, d]);
  }
  const biggest = randomInt(0, 1) === 1;
  const sorted = [...fractions].sort((a, b) => a[0] * b[1] - b[0] * a[1]);
  const correct = biggest ? sorted[sorted.length - 1] : sorted[0];
  return {
    prompt: biggest ? "Which fraction is the BIGGEST?" : "Which fraction is the SMALLEST?",
    dedupeKey:
      (biggest ? "big:" : "small:") + sorted.map((f) => frac(...f)).join(","),
    correctAnswer: frac(...correct),
    choices: shuffle(fractions.map((f) => frac(...f))),
  };
}

function makeAddSubtractQuestion() {
  const d = [4, 5, 6, 8, 10, 12][randomInt(0, 5)];
  const adding = randomInt(0, 1) === 1;
  let n1, n2, result;
  if (adding) {
    n1 = randomInt(1, d - 2);
    n2 = randomInt(1, d - 1 - n1);
    result = n1 + n2;
  } else {
    n1 = randomInt(2, d - 1);
    n2 = randomInt(1, n1 - 1);
    result = n1 - n2;
  }
  const symbol = adding ? "+" : "−";
  return {
    prompt: `${frac(n1, d)} ${symbol} ${frac(n2, d)} = ?`,
    correctAnswer: frac(result, d),
    choices: buildChoices(
      [result, d],
      shuffle([
        [adding ? n1 + n2 : n1 - n2, d + d], // added/kept the bottoms wrong: n/(d+d)
        [adding ? n1 - n2 : n1 + n2, d],     // did the other operation
        [result + 1, d],
        [result - 1, d],
      ])
    ),
  };
}

const QUESTION_KINDS = {
  identify: [makeIdentifyQuestion],
  equivalent: [makeEquivalentQuestion],
  compare: [makeCompareQuestion],
  add: [makeAddSubtractQuestion],
};
QUESTION_KINDS.all = [
  makeIdentifyQuestion,
  makeEquivalentQuestion,
  makeCompareQuestion,
  makeAddSubtractQuestion,
];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return QUESTION_KINDS[type] && type !== "all" ? type : "all";
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
  const totalQuestions = 15;
  const storageKey = "klg-fractions-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Pictures, equivalents, comparing & adding",
    identify: "Read the fraction picture",
    equivalent: "Find the equivalent fraction",
    compare: "Tap the biggest or smallest fraction",
    add: "Add & subtract with like denominators",
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
    generateQuestion: () => kinds[randomInt(0, kinds.length - 1)](),
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
