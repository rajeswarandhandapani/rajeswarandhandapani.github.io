/**
 * Money & making change question generator (US coins and dollars).
 * Reads ?type=coins|change from the URL to practice one skill;
 * defaults to a mix of both.
 *
 * Everything is drawn with KlgMoneyVis (coins and notes). ?level=1 pennies,
 * nickels and dimes; 2 (default) adds quarters; 3 adds $1 and $5 notes.
 *
 * Question kinds:
 *  - coin counting: a tray of coins — how much money is it?
 *  - pay exactly:   "Which coins make exactly 37¢?" — the answers are trays
 *  - making change: a note in the picture — "You buy a toy for $3.45 and pay
 *                    with $5.00. How much change should you get?"
 *  - total cost:    two price tags — how much together?
 *  - conversion:    "How many cents is $2.30?" with the notes and coins shown
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

const level = [1, 3].includes(Number(new URLSearchParams(window.location.search).get("level")))
  ? Number(new URLSearchParams(window.location.search).get("level")) : 2;
const MV = window.KlgMoneyVis;

const ALL_COINS = [
  { name: "$5 note", plural: "$5 notes", value: 500, max: 1 },
  { name: "$1 note", plural: "$1 notes", value: 100, max: 3 },
  { name: "quarter", plural: "quarters", value: 25, max: 3 },
  { name: "dime", plural: "dimes", value: 10, max: 4 },
  { name: "nickel", plural: "nickels", value: 5, max: 3 },
  { name: "penny", plural: "pennies", value: 1, max: 4 },
];
const COINS = ALL_COINS.filter((c) =>
  level === 1 ? c.value <= 10 : level === 2 ? c.value <= 25 : true
).map((c) => (level === 1 ? { ...c, max: Math.min(c.max, 3) } : c));
const DENOMS = COINS.map((c) => c.value);

/** Fewest coins/notes that make `cents`, using only this level's denominations. */
function fewestCoins(cents) {
  const out = [];
  DENOMS.slice().sort((a, b) => b - a).forEach((d) => {
    while (cents >= d) { out.push(d); cents -= d; }
  });
  return out;
}

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
  const pieces = picked.flatMap((c) => Array(c.count).fill(c.value));

  // Plausible mistakes: one coin of some included type miscounted, or ±5/±10.
  const offsets = picked.flatMap((c) => [c.value, -c.value]).concat([5, -5, 10, -10]);
  const wrongs = offsetWrongs(total, offsets, fmtMoney);

  return {
    visual: MV.tray(pieces),
    prompt: "How much money is in the picture?",
    dedupeKey: "coins:" + pieces.join(","),
    explanation: `${list} = ${fmtMoney(total)}.`,
    correctAnswer: fmtMoney(total),
    choices: shuffle([fmtMoney(total), ...wrongs]),
  };
}

/** Sets of coins as answers: only one adds up to the target. */
function makePayQuestion() {
  const top = level === 1 ? 49 : level === 2 ? 99 : 495;
  let target, correct;
  do {
    target = level === 3 ? 5 * randomInt(8, 99) : randomInt(11, top);
    correct = fewestCoins(target);
  } while (correct.length < 2 || correct.length > 7);
  const sets = [correct];
  const sums = new Set([target]);
  const tweaks = [
    (c) => { const i = randomInt(0, c.length - 1); const o = c.slice(); o.splice(i, 1); return o; },
    (c) => c.concat(DENOMS[randomInt(0, DENOMS.length - 1)]),
    (c) => { const o = c.slice(); const i = randomInt(0, o.length - 1); o[i] = DENOMS[randomInt(0, DENOMS.length - 1)]; return o; },
    (c) => { const o = c.slice(); const i = randomInt(0, o.length - 1); o.splice(i, 1, ...(o[i] === 25 ? [10, 10] : [o[i]])); return o; },
  ];
  for (let tries = 0; tries < 60 && sets.length < 4; tries++) {
    const set = tweaks[randomInt(0, tweaks.length - 1)](correct);
    const sum = MV.sum(set);
    if (!set.length || sums.has(sum) || Math.abs(sum - target) > Math.max(30, target)) continue;
    sums.add(sum);
    sets.push(set);
  }
  if (sets.length < 4) return makePayQuestion();
  const q = {
    prompt: `Which coins make exactly ${fmtMoney(target)}?`,
    dedupeKey: "pay:" + target,
    explanation: `${MV.describe(correct)} make ${fmtMoney(target)}.`,
    correctAnswer: MV.describe(correct),
    choices: shuffle(sets.map((x) => MV.describe(x))),
    choiceVisuals: {},
    choiceLabels: {},
    noChoiceListen: true,
  };
  sets.forEach((x) => {
    const name = MV.describe(x);
    q.choiceVisuals[name] = MV.tray(x);
    q.choiceLabels[name] = name + ", " + fmtMoney(MV.sum(x));
  });
  return q;
}

/** A shop price label: picture, name and price. */
function priceTag(emoji, name, cents) {
  const tag = document.createElement("figure");
  tag.className = "kv-tag";
  tag.setAttribute("role", "img");
  tag.setAttribute("aria-label", `${name}, ${fmtMoney(cents)}`);
  tag.dataset.cents = String(cents);
  tag.innerHTML = `<span class="kv-tag-pic" aria-hidden="true">${emoji}</span><span class="kv-tag-price" aria-hidden="true">${fmtMoney(cents)}</span>`;
  return tag;
}

function row(...nodes) {
  const box = document.createElement("div");
  box.className = "kv-row";
  box.append(...nodes);
  return box;
}

const CHANGE_ITEMS = ["toy", "book", "snack", "juice box", "sticker pack", "ball", "sandwich"];
const ITEM_EMOJI = { toy: "🧸", book: "📖", snack: "🍪", "juice box": "🧃", "sticker pack": "⭐", ball: "⚽", sandwich: "🥪",
  pencil: "✏️", notebook: "📓", "candy bar": "🍫", balloon: "🎈", cookie: "🍪", crayon: "🖍️", ruler: "📏", sticker: "⭐" };
const MONEY_OFFSETS = [-100, -25, -10, -5, 5, 10, 25, 100];

function makeChangeQuestion() {
  const item = CHANGE_ITEMS[randomInt(0, CHANGE_ITEMS.length - 1)];
  const cost = 5 * randomInt(1, 99); // 5¢ – $4.95
  const payOptions = [Math.ceil(cost / 100) * 100, 500, 1000].filter((p) => p > cost);
  const pay = payOptions[randomInt(0, payOptions.length - 1)];
  const correct = pay - cost;
  const wrongs = offsetWrongs(correct, MONEY_OFFSETS, fmtMoney);

  return {
    visual: row(priceTag(ITEM_EMOJI[item], item, cost), MV.tray([pay], { label: `You pay with ${fmtMoney(pay)}` })),
    explanation: `Count up from ${fmtMoney(cost)} to ${fmtMoney(pay)}: ${MV.describe(MV.greedy(correct))} = ${fmtMoney(correct)}.`,
    dedupeKey: `change:${cost}:${pay}`,
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
    visual: row(priceTag(ITEM_EMOJI[item1], item1, price1), priceTag(ITEM_EMOJI[item2], item2, price2)),
    explanation: `${fmtMoney(price1)} + ${fmtMoney(price2)} = ${fmtMoney(correct)}.`,
    dedupeKey: `total:${price1}:${price2}`,
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
    visual: MV.tray(MV.greedy(total)),
    explanation: `${MV.describe(MV.greedy(total))} is ${fmtMoney(total)}, which is ${total} cents.`,
    dedupeKey: `cents:${total}`,
    prompt: `How many cents is ${fmtMoney(total)}?`,
    correctAnswer: fmt(total),
    choices: shuffle([fmt(total), ...candidates.slice(0, 3).map(fmt)]),
  };
}

const QUESTION_KINDS = {
  coins: [makeCoinQuestion, makePayQuestion, makeCentsQuestion],
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
  const storageKey = "klg-money-best-ms:" + mode + (level === 2 ? "" : ":L" + level);
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Counting coins + making change",
    coins: "Counting coins and cents",
    change: "Making change and adding up prices",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  KlgGameKit.modeLinks(document.getElementById("mode-links"), "type", "all");
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

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
