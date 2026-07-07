/**
 * Money & making change question generator (US coins and dollars).
 * Reads ?type=coins|change from the URL to practice one skill;
 * defaults to a mix of both.
 *
 * Question kinds:
 *  - coin counting: "How much money is 2 quarters, 1 dime and 3 pennies?"
 *  - making change: "You buy a toy for $3.45 and pay with $5.00.
 *                    How much change should you get?"
 *  - total cost:    "A pencil costs 35¢ and a cookie costs $1.20.
 *                    How much do they cost together?"
 *  - conversion:    "How many cents is $2.30?"
 *
 * All arithmetic is done in whole cents; amounts under a dollar display as
 * "63¢" and the rest as "$1.15". Distractors mirror real kid mistakes:
 * miscounting one coin, being off by a dime or a dollar, and the classic
 * "$2.30 = 23 cents" magnitude error.
 *
 * Best-time record: same rules as the other quizzes — saved per mode in
 * localStorage, only for perfect scores.
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

function fmtMoney(cents) {
  return cents < 100 ? `${cents}¢` : `$${(cents / 100).toFixed(2)}`;
}

/** Pick 3 wrong choices by offsetting the correct amount. */
function offsetWrongs(correct, offsets, fmt) {
  const wrongs = new Set();
  for (const off of shuffle(offsets)) {
    const v = correct + off;
    if (v > 0 && v !== correct) wrongs.add(fmt(v));
    if (wrongs.size === 3) break;
  }
  return [...wrongs];
}

const COINS = [
  { name: "quarter", plural: "quarters", value: 25, max: 3 },
  { name: "dime", plural: "dimes", value: 10, max: 4 },
  { name: "nickel", plural: "nickels", value: 5, max: 2 },
  { name: "penny", plural: "pennies", value: 1, max: 4 },
];

function makeCoinQuestion() {
  let picked;
  do {
    picked = COINS.map((c) => ({ ...c, count: randomInt(0, c.max) })).filter(
      (c) => c.count > 0
    );
  } while (picked.length < 2);

  const total = picked.reduce((sum, c) => sum + c.count * c.value, 0);
  const parts = picked.map((c) => `${c.count} ${c.count === 1 ? c.name : c.plural}`);
  const list =
    parts.length === 2
      ? parts.join(" and ")
      : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];

  // Plausible mistakes: one coin of some included type miscounted, or ±5/±10.
  const offsets = picked.flatMap((c) => [c.value, -c.value]).concat([5, -5, 10, -10]);
  const wrongs = offsetWrongs(total, offsets, fmtMoney);

  return {
    prompt: `How much money is ${list}?`,
    correctAnswer: fmtMoney(total),
    choices: shuffle([fmtMoney(total), ...wrongs]),
  };
}

const CHANGE_ITEMS = ["toy", "book", "snack", "juice box", "sticker pack", "ball", "sandwich"];
const MONEY_OFFSETS = [-100, -25, -10, -5, 5, 10, 25, 100];

function makeChangeQuestion() {
  const item = CHANGE_ITEMS[randomInt(0, CHANGE_ITEMS.length - 1)];
  const cost = 5 * randomInt(1, 99); // 5¢ – $4.95
  const payOptions = [Math.ceil(cost / 100) * 100, 500, 1000].filter((p) => p > cost);
  const pay = payOptions[randomInt(0, payOptions.length - 1)];
  const correct = pay - cost;
  const wrongs = offsetWrongs(correct, MONEY_OFFSETS, fmtMoney);

  return {
    prompt: `You buy a ${item} for ${fmtMoney(cost)} and pay with ${fmtMoney(pay)}. How much change should you get?`,
    correctAnswer: fmtMoney(correct),
    choices: shuffle([fmtMoney(correct), ...wrongs]),
  };
}

const TOTAL_ITEMS = ["pencil", "notebook", "candy bar", "balloon", "cookie", "crayon", "ruler", "sticker"];

function makeTotalQuestion() {
  const [item1, item2] = shuffle(TOTAL_ITEMS);
  const price1 = 5 * randomInt(4, 50); // 20¢ – $2.50
  const price2 = 5 * randomInt(4, 50);
  const correct = price1 + price2;
  const wrongs = offsetWrongs(correct, MONEY_OFFSETS, fmtMoney);

  return {
    prompt: `A ${item1} costs ${fmtMoney(price1)} and a ${item2} costs ${fmtMoney(price2)}. How much do they cost together?`,
    correctAnswer: fmtMoney(correct),
    choices: shuffle([fmtMoney(correct), ...wrongs]),
  };
}

function makeCentsQuestion() {
  const total = 100 * randomInt(1, 5) + 5 * randomInt(0, 19); // $1.00 – $5.95
  const fmt = (v) => `${v}¢`;
  const candidates = shuffle(
    [Math.round(total / 10), total * 10, total - 100, total + 100, total - 10, total + 10]
      .filter((v, i, arr) => v > 0 && v !== total && arr.indexOf(v) === i)
  );
  return {
    prompt: `How many cents is ${fmtMoney(total)}?`,
    correctAnswer: fmt(total),
    choices: shuffle([fmt(total), ...candidates.slice(0, 3).map(fmt)]),
  };
}

const QUESTION_KINDS = {
  coins: [makeCoinQuestion, makeCentsQuestion],
  change: [makeChangeQuestion, makeTotalQuestion],
};
QUESTION_KINDS.all = [...QUESTION_KINDS.coins, ...QUESTION_KINDS.change];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "coins" || type === "change" ? type : "all";
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
  const storageKey = "klg-money-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Counting coins + making change",
    coins: "Counting coins and cents",
    change: "Making change and adding up prices",
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
