/**
 * Division question generator.
 *
 * Three levels picked with ?level= (2 is the default):
 *  - 1: facts with divisors 2–5 and quotients up to 10, plus sharing
 *       word problems — the "share it out fairly" stage.
 *  - 2: facts with divisors 2–10, missing-number facts (? ÷ 4 = 5) and
 *       word problems.
 *  - 3: everything above plus remainders (17 ÷ 5 = 3 r 2).
 * Narrow it further with ?tables=6,7,8 to drill particular divisors.
 *
 * Distractors mirror real division mistakes: the quotient one out (a
 * miscounted times-table step), the product instead of the quotient, and
 * the divisor and dividend swapped.
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

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

const THINGS = [
  { name: "cookies", emoji: "🍪", who: "friends" },
  { name: "apples", emoji: "🍎", who: "children" },
  { name: "stickers", emoji: "⭐", who: "classmates" },
  { name: "marbles", emoji: "🔮", who: "players" },
  { name: "sweets", emoji: "🍬", who: "friends" },
  { name: "pencils", emoji: "✏️", who: "students" },
  { name: "balloons", emoji: "🎈", who: "kids" },
  { name: "flowers", emoji: "🌸", who: "vases" },
  { name: "books", emoji: "📚", who: "shelves" },
  { name: "eggs", emoji: "🥚", who: "boxes" },
];

/** Answer plus three distinct, plausible wrong numbers. */
function numericChoices(answer, candidates) {
  const wrongs = [];
  for (const value of candidates) {
    if (Number.isInteger(value) && value >= 0 && value !== answer && !wrongs.includes(value)) {
      wrongs.push(value);
    }
    if (wrongs.length === 3) break;
  }
  let filler = answer + 2;
  while (wrongs.length < 3) {
    if (filler !== answer && filler > 0 && !wrongs.includes(filler)) wrongs.push(filler);
    filler += 1;
  }
  return shuffle([answer, ...wrongs]);
}

function makeFactQuestion(divisors, maxQuotient) {
  const divisor = pick(divisors);
  const quotient = randomInt(1, maxQuotient);
  const dividend = divisor * quotient;
  return {
    prompt: `${dividend} ÷ ${divisor} = ?`,
    correctAnswer: quotient,
    choices: numericChoices(quotient, [
      quotient + 1,
      quotient - 1,
      dividend - divisor,
      divisor,
      quotient + 2,
    ]),
  };
}

function makeMissingQuestion(divisors, maxQuotient) {
  const divisor = pick(divisors);
  const quotient = randomInt(2, maxQuotient);
  const dividend = divisor * quotient;

  if (randomInt(0, 1) === 0) {
    return {
      prompt: `? ÷ ${divisor} = ${quotient}`,
      dedupeKey: `miss-a-${dividend}-${divisor}`,
      correctAnswer: dividend,
      choices: numericChoices(dividend, [
        dividend + divisor,
        dividend - divisor,
        divisor + quotient,
        dividend + 1,
      ]),
    };
  }
  return {
    prompt: `${dividend} ÷ ? = ${quotient}`,
    dedupeKey: `miss-b-${dividend}-${quotient}`,
    correctAnswer: divisor,
    choices: numericChoices(divisor, [
      divisor + 1,
      divisor - 1,
      quotient,
      dividend - quotient,
    ]),
  };
}

function makeWordQuestion(divisors, maxQuotient) {
  const divisor = pick(divisors);
  const quotient = randomInt(2, maxQuotient);
  const dividend = divisor * quotient;
  const thing = pick(THINGS);
  const style = randomInt(1, 2);

  if (style === 1) {
    return {
      prompt: `${dividend} ${thing.name} ${thing.emoji} are shared equally between ${divisor} ${thing.who}. How many does each one get?`,
      dedupeKey: `word-share-${dividend}-${divisor}`,
      correctAnswer: quotient,
      choices: numericChoices(quotient, [
        quotient + 1,
        quotient - 1,
        dividend - divisor,
        divisor,
      ]),
    };
  }
  return {
    prompt: `You have ${dividend} ${thing.name} ${thing.emoji} and put ${quotient} in each bag. How many bags do you need?`,
    dedupeKey: `word-group-${dividend}-${quotient}`,
    correctAnswer: divisor,
    choices: numericChoices(divisor, [
      divisor + 1,
      divisor - 1,
      quotient,
      dividend - quotient,
    ]),
  };
}

function makeRemainderQuestion(divisors) {
  // A remainder needs room to exist, so ÷2 questions are left out here.
  const usable = divisors.filter((d) => d >= 3);
  const divisor = pick(usable.length ? usable : [4]);
  const quotient = randomInt(2, 9);
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  const fmt = (q, r) => `${q} r ${r}`;
  const answer = fmt(quotient, remainder);
  const wrongs = [
    fmt(quotient + 1, remainder),
    fmt(quotient, divisor - remainder),
    fmt(quotient - 1, remainder),
    fmt(remainder, quotient),
    fmt(quotient + 2, remainder),
  ].filter((v) => v !== answer);
  return {
    prompt: `${dividend} ÷ ${divisor} = ?  (with a remainder)`,
    dedupeKey: `rem-${dividend}-${divisor}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...[...new Set(wrongs)].slice(0, 3)]),
  };
}

function getLevel() {
  const level = parseInt(new URLSearchParams(window.location.search).get("level"), 10);
  return [1, 2, 3].includes(level) ? level : 2;
}

/** ?tables=6,7,8 restricts the divisors, like the multiplication game. */
function getDivisors(level) {
  const raw = new URLSearchParams(window.location.search).get("tables");
  const requested = (raw || "")
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n >= 2 && n <= 12);
  if (requested.length) return [...new Set(requested)];
  const max = level === 1 ? 5 : 10;
  const divisors = [];
  for (let d = 2; d <= max; d += 1) divisors.push(d);
  return divisors;
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
  const level = getLevel();
  const divisors = getDivisors(level);
  const maxQuotient = level === 1 ? 6 : 10;
  const totalQuestions = 20;
  const storageKey = `klg-division-best-ms:${level}:${divisors.join("-")}`;

  const labels = {
    1: "Sharing fairly — dividing by 2, 3, 4 and 5",
    2: "Division facts and word problems up to ÷10",
    3: "Division with remainders — the tricky stuff",
  };
  document.getElementById("mode-label").textContent =
    labels[level] + (divisors.length < 9 ? ` (÷ ${divisors.join(", ")})` : "");

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkLevel = new URLSearchParams(
      link.getAttribute("href").replace(/^[^?]*\??/, "")
    ).get("level");
    if (parseInt(linkLevel || "2", 10) === level) {
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
    timePerQuestion: 20,
    generateQuestion: () => {
      const kinds =
        level === 1
          ? ["fact", "fact", "fact", "word"]
          : level === 2
          ? ["fact", "fact", "missing", "word"]
          : ["fact", "missing", "word", "remainder", "remainder"];
      const kind = pick(kinds);
      if (kind === "missing") return makeMissingQuestion(divisors, maxQuotient);
      if (kind === "word") return makeWordQuestion(divisors, maxQuotient);
      if (kind === "remainder") return makeRemainderQuestion(divisors);
      return makeFactQuestion(divisors, maxQuotient);
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
