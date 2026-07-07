/**
 * Rounding & place value question generator.
 * Reads ?type=rounding|placevalue from the URL to practice one skill;
 * defaults to a mix of both.
 *
 * Question kinds:
 *  - rounding:       "Round 3,472 to the nearest hundred" (nearest 10 / 100 /
 *                    1,000, using the school rule: 5 or more rounds up)
 *  - digit-at-place: "Which digit is in the tens place of 4,728?"
 *  - value-of-digit: "What is the value of the 7 in 4,728?"
 *  - expanded form:  "3,000 + 400 + 20 + 5 = ?"
 *
 * Distractors are the mistakes kids actually make: rounding the wrong way,
 * rounding to the neighbouring place, picking the digit one place over, or
 * scrambling the order of digits.
 *
 * Best-time record: same rules as the multiplication quiz — saved per mode
 * in localStorage, only for perfect scores, so speed never beats accuracy.
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

const PLACES = [
  { name: "ones", value: 1 },
  { name: "tens", value: 10 },
  { name: "hundreds", value: 100 },
  { name: "thousands", value: 1000 },
];

function digitAt(number, placeValue) {
  return Math.floor(number / placeValue) % 10;
}

/**
 * 4-digit number whose four digits are all different (leading digit
 * non-zero), so the other digits of the number are always safe wrong
 * choices for place-value questions.
 */
function randomDistinctDigitNumber() {
  const digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  if (digits[0] === 0) [digits[0], digits[1]] = [digits[1], digits[0]];
  return { digits, number: digits.reduce((n, d) => n * 10 + d, 0) };
}

const ROUNDING_UNITS = [
  { unit: 10, name: "ten", min: 13, max: 987 },
  { unit: 100, name: "hundred", min: 104, max: 9876 },
  { unit: 1000, name: "thousand", min: 1042, max: 9876 },
];

function makeRoundingQuestion() {
  const { unit, name, min, max } = ROUNDING_UNITS[randomInt(0, ROUNDING_UNITS.length - 1)];
  let n;
  do {
    n = randomInt(min, max);
  } while (n % unit === 0);
  const correct = Math.round(n / unit) * unit;

  const wrong = shuffle(
    [
      correct - unit, // rounded the wrong way
      correct + unit,
      Math.round(n / (unit * 10)) * (unit * 10), // rounded to the place above
      Math.round(n / (unit / 10)) * (unit / 10), // rounded to the place below
    ].filter((w, i, arr) => w > 0 && w !== correct && arr.indexOf(w) === i)
  );
  const choices = new Set([correct, ...wrong]);
  let step = 2;
  while (choices.size < 4) {
    choices.add(correct + unit * step);
    step += 1;
  }

  return {
    prompt: `Round ${formatNumber(n)} to the nearest ${name}.`,
    correctAnswer: correct,
    choices: shuffle([...choices].slice(0, 4)),
  };
}

function makeDigitAtPlaceQuestion() {
  const { digits, number } = randomDistinctDigitNumber();
  const place = PLACES[randomInt(0, PLACES.length - 1)];
  return {
    prompt: `Which digit is in the ${place.name} place of ${formatNumber(number)}?`,
    correctAnswer: digitAt(number, place.value),
    choices: shuffle([...digits]),
  };
}

function makeValueOfDigitQuestion() {
  const { number } = randomDistinctDigitNumber();
  const nonZeroPlaces = PLACES.filter((p) => digitAt(number, p.value) !== 0);
  const place = nonZeroPlaces[randomInt(0, nonZeroPlaces.length - 1)];
  const digit = digitAt(number, place.value);
  return {
    prompt: `What is the value of the ${digit} in ${formatNumber(number)}?`,
    correctAnswer: digit * place.value,
    choices: shuffle(PLACES.map((p) => digit * p.value)),
  };
}

function makeExpandedFormQuestion() {
  let digits, number;
  do {
    ({ digits, number } = randomDistinctDigitNumber());
  } while (digits.includes(0)); // zeros would add ugly "+ 0" terms

  const parts = digits.map((d, i) => formatNumber(d * 10 ** (3 - i)));
  const wrong = new Set();
  while (wrong.size < 3) {
    const swapped = [...digits];
    const i = randomInt(0, 2);
    const j = randomInt(i + 1, 3);
    [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
    wrong.add(swapped.reduce((n, d) => n * 10 + d, 0));
  }

  return {
    prompt: `${parts.join(" + ")} = ?`,
    correctAnswer: number,
    choices: shuffle([number, ...wrong]),
  };
}

const QUESTION_KINDS = {
  rounding: [makeRoundingQuestion],
  placevalue: [makeDigitAtPlaceQuestion, makeValueOfDigitQuestion, makeExpandedFormQuestion],
};
// In mixed mode, double up rounding so it isn't outnumbered 3-to-1.
QUESTION_KINDS.all = [
  makeRoundingQuestion,
  makeRoundingQuestion,
  ...QUESTION_KINDS.placevalue,
];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "rounding" || type === "placevalue" ? type : "all";
}

function bestTimeKey(mode) {
  return "klg-place-best-ms:" + mode;
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
  const storageKey = bestTimeKey(mode);
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Rounding + place value",
    rounding: "Rounding to the nearest 10, 100 and 1,000",
    placevalue: "Digits, their values and expanded form",
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
    formatAnswer: formatNumber,
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
