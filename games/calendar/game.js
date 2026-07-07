/**
 * Calendar question generator.
 * ?type=days|months practices one skill; the default mixes both.
 *
 * Day kinds: what comes after/before a day, "if today is Friday, what will
 * tomorrow be / what was yesterday?", the nth day of the week (weeks start
 * on Sunday, like a wall calendar), and how-many facts (days in a week,
 * days in a weekend).
 *
 * Month kinds: what comes after/before a month, the nth month of the year,
 * how many days a month has (February is asked as "the shortest month"
 * instead, so leap years never make an answer wrong), months in a year and
 * days in a year.
 *
 * The wrap-arounds — after Saturday, before Sunday, after December, before
 * January — are deliberately common, since that's what actually gets kids.
 * Distractors are neighbours (the day/month one further on, one back, or
 * the one in the question itself) and for nth-of-week the answer you get
 * counting from Monday, the classic off-by-one.
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// February is skipped (28 or 29 — asked as "the shortest month" instead).
const DAYS_IN_MONTH = {
  January: 31, March: 31, April: 30, May: 31, June: 30, July: 31,
  August: 31, September: 30, October: 31, November: 30, December: 31,
};

function ordinal(n) {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return n + suffix;
}

function at(list, i) {
  return list[((i % list.length) + list.length) % list.length];
}

/** correct + the entries around it (offset −1, +2, and the asked one). */
function neighbourChoices(list, askedIndex, correctIndex) {
  const choices = new Set([at(list, correctIndex)]);
  for (const offset of [-1, 2, 0]) {
    choices.add(at(list, askedIndex + offset));
    if (choices.size === 4) break;
  }
  let step = 3;
  while (choices.size < 4) {
    choices.add(at(list, askedIndex + step));
    step += 1;
  }
  return shuffle([...choices]);
}

function makeSequenceQuestion(list, phrases) {
  const i = randomInt(0, list.length - 1);
  const forward = randomInt(0, 1) === 1;
  const correctIndex = forward ? i + 1 : i - 1;
  const phrase = phrases[forward ? "after" : "before"];
  return {
    prompt: phrase.replace("{}", list[i]),
    correctAnswer: at(list, correctIndex),
    choices: neighbourChoices(list, i, correctIndex),
  };
}

function makeDayOrderQuestion() {
  return makeSequenceQuestion(DAYS, {
    after: "What day comes after {}?",
    before: "What day comes before {}?",
  });
}

function makeTomorrowYesterdayQuestion() {
  const i = randomInt(0, 6);
  const forward = randomInt(0, 1) === 1;
  const correctIndex = forward ? i + 1 : i - 1;
  return {
    prompt: forward
      ? `If today is ${DAYS[i]}, what day will tomorrow be?`
      : `If today is ${DAYS[i]}, what day was yesterday?`,
    correctAnswer: at(DAYS, correctIndex),
    choices: neighbourChoices(DAYS, i, correctIndex),
  };
}

function makeNthDayQuestion() {
  const n = randomInt(1, 7);
  const correct = DAYS[n - 1];
  const choices = new Set([correct]);
  choices.add(at(DAYS, n)); // counted from Monday — the classic off-by-one
  choices.add(at(DAYS, n - 2));
  let step = 2;
  while (choices.size < 4) {
    choices.add(at(DAYS, n - 1 + step));
    step += 1;
  }
  return {
    prompt: `What is the ${ordinal(n)} day of the week?`,
    correctAnswer: correct,
    choices: shuffle([...choices]),
  };
}

function makeDayCountQuestion() {
  const facts = [
    { prompt: "How many days are in a week?", correct: 7, wrongs: [5, 6, 8] },
    { prompt: "How many days are in a weekend?", correct: 2, wrongs: [1, 3, 5] },
    { prompt: "How many school days are in a week?", correct: 5, wrongs: [4, 6, 7] },
  ];
  const fact = facts[randomInt(0, facts.length - 1)];
  return {
    prompt: fact.prompt,
    correctAnswer: fact.correct,
    choices: shuffle([fact.correct, ...fact.wrongs]),
  };
}

function makeMonthOrderQuestion() {
  return makeSequenceQuestion(MONTHS, {
    after: "What month comes after {}?",
    before: "What month comes before {}?",
  });
}

function makeNthMonthQuestion() {
  const n = randomInt(1, 12);
  const correct = MONTHS[n - 1];
  return {
    prompt: `What is the ${ordinal(n)} month of the year?`,
    correctAnswer: correct,
    choices: neighbourChoices(MONTHS, n - 1, n - 1),
  };
}

function makeDaysInMonthQuestion() {
  const names = Object.keys(DAYS_IN_MONTH);
  const month = names[randomInt(0, names.length - 1)];
  return {
    prompt: `How many days does ${month} have?`,
    correctAnswer: DAYS_IN_MONTH[month],
    choices: shuffle([28, 29, 30, 31]),
  };
}

function makeMonthCountQuestion() {
  const facts = [
    { prompt: "How many months are in a year?", correct: 12, wrongs: [10, 11, 13] },
    { prompt: "How many days are in a year?", correct: 365, wrongs: [356, 360, 375] },
    { prompt: "Which is the shortest month of the year?", correct: "February", wrongs: ["January", "April", "June"] },
    { prompt: "Which is the first month of the year?", correct: "January", wrongs: ["February", "December", "March"] },
    { prompt: "Which is the last month of the year?", correct: "December", wrongs: ["November", "January", "October"] },
  ];
  const fact = facts[randomInt(0, facts.length - 1)];
  return {
    prompt: fact.prompt,
    correctAnswer: fact.correct,
    choices: shuffle([fact.correct, ...fact.wrongs]),
  };
}

const QUESTION_KINDS = {
  days: [
    makeDayOrderQuestion,
    makeDayOrderQuestion,
    makeTomorrowYesterdayQuestion,
    makeNthDayQuestion,
    makeDayCountQuestion,
  ],
  months: [
    makeMonthOrderQuestion,
    makeMonthOrderQuestion,
    makeNthMonthQuestion,
    makeDaysInMonthQuestion,
    makeMonthCountQuestion,
  ],
};
QUESTION_KINDS.all = [...QUESTION_KINDS.days, ...QUESTION_KINDS.months];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "days" || type === "months" ? type : "all";
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
  const storageKey = "klg-calendar-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Days of the week + months of the year",
    days: "Days of the week",
    months: "Months of the year",
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
    timePerQuestion: 15,
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
