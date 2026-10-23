/**
 * Fractions question generator (grades 2-5), with pictures (KlgFracVis).
 * ?type=identify|picture|equivalent|compare|add practices one skill; the
 * default mixes all five. ?level=1 halves & quarters, 2 (default) up to
 * tenths, 3 bigger denominators with the pictures taken away from compare.
 *
 * Question kinds:
 *  - identify:   a pie, bar or set of shapes — what fraction is shaded?
 *  - picture:    "Which picture shows 3/4?" — the answers are pictures
 *  - equivalent: a bar for 1/2 — which fraction is equal? Answers are bars
 *  - compare:    tap the biggest/smallest of four fractions (same
 *                denominator, or same numerator — where "bigger denominator
 *                means bigger fraction" is exactly the trap)
 *  - add:        "1/6 + 3/6 = ?" and "5/8 − 2/8 = ?" shown as two bars
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

const level = [1, 3].includes(Number(new URLSearchParams(window.location.search).get("level")))
  ? Number(new URLSearchParams(window.location.search).get("level")) : 2;
const FV = window.KlgFracVis;
const SET_EMOJI = ["🍓", "🌻", "🐟", "⭐", "🍪", "🎈"];

/** A picture of n/d: pie, bar or a set of things. */
function fractionPicture(n, d, style) {
  if (style === "bar") return FV.bar(n, d);
  if (style === "set") return FV.set(n, d, SET_EMOJI[randomInt(0, SET_EMOJI.length - 1)]);
  return FV.pie(n, d);
}

/** Answer button content: a bar with the fraction written under it. */
function labelledBar(n, d) {
  const box = document.createElement("div");
  box.className = "kv-choice";
  const bar = FV.bar(n, d);
  bar.removeAttribute("role");
  bar.removeAttribute("aria-label");
  const text = document.createElement("div");
  text.className = "kv-choice-text";
  text.textContent = frac(n, d);
  box.append(bar, text);
  return box;
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

const IDENTIFY_DENOMINATORS = level === 1 ? [2, 4] : level === 2 ? [2, 3, 4, 5, 6, 8, 10] : [3, 4, 5, 6, 8, 10, 12];

function makeIdentifyQuestion() {
  const d = IDENTIFY_DENOMINATORS[randomInt(0, IDENTIFY_DENOMINATORS.length - 1)];
  const n = randomInt(1, d - 1);
  const style = ["pie", "bar", "set"][randomInt(0, level === 1 ? 1 : 2)];
  return {
    visual: fractionPicture(n, d, style),
    prompt: "What fraction is shaded?",
    dedupeKey: `id:${style}:${n}/${d}`,
    reviewPrompt: `What fraction is shaded? (${n} of ${d} parts)`,
    explanation: `${n} of the ${d} equal parts are shaded, so the fraction is ${frac(n, d)}.`,
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

function makePictureQuestion() {
  const d = IDENTIFY_DENOMINATORS[randomInt(0, IDENTIFY_DENOMINATORS.length - 1)];
  const n = randomInt(1, d - 1);
  const style = ["pie", "bar"][randomInt(0, 1)];
  // Wrong pictures share the denominator, so the child must count the shaded parts.
  const others = shuffle([...Array(d - 1)].map((_, i) => i + 1).filter((x) => x !== n)).slice(0, 3);
  const all = [n, ...others];
  const labels = {};
  const visuals = {};
  all.forEach((x) => {
    labels[frac(x, d)] = `a ${style} with ${x} of ${d} parts shaded`;
    visuals[frac(x, d)] = fractionPicture(x, d, style);
  });
  return {
    prompt: `Which picture shows ${frac(n, d)}?`,
    dedupeKey: `pic:${style}:${n}/${d}`,
    correctAnswer: frac(n, d),
    choices: shuffle(all.map((x) => frac(x, d))),
    choiceVisuals: visuals,
    choiceLabels: labels,
    noChoiceListen: true,
    explanation: `${frac(n, d)} means ${n} out of ${d} equal parts.`,
  };
}

const EQUIVALENT_BASES = level === 1 ? [[1, 2]] : [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5]];

function makeEquivalentQuestion() {
  const [n, d] = EQUIVALENT_BASES[randomInt(0, EQUIVALENT_BASES.length - 1)];
  const k = randomInt(2, Math.min(level === 1 ? 4 : 4, Math.floor(20 / d)));
  const built = buildChoices(
    [n * k, d * k],
    shuffle([
      [n + k, d + k],     // added instead of multiplied
      [n * k, d * (k + 1)],
      [n * k + 1, d * k],
      [d, n * d],
    ])
  );
  const q = {
    visual: FV.bar(n, d, { label: `A bar for ${frac(n, d)}: ${n} of ${d} parts shaded` }),
    prompt: `Which fraction is equal to ${frac(n, d)}?`,
    dedupeKey: `eq:${n}/${d}x${k}`,
    explanation: `${frac(n, d)} and ${frac(n * k, d * k)} cover the same amount: cut each part into ${k} smaller parts.`,
    correctAnswer: frac(n * k, d * k),
    choices: built,
  };
  if (level < 3) {
    q.choiceVisuals = {};
    q.choiceLabels = {};
    built.forEach((c) => {
      const [cn, cd] = c.split("/").map(Number);
      q.choiceVisuals[c] = labelledBar(cn, cd);
      q.choiceLabels[c] = c;
    });
    q.noChoiceListen = true;
  }
  return q;
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
  const q = {
    prompt: biggest ? "Which fraction is the BIGGEST?" : "Which fraction is the SMALLEST?",
    dedupeKey:
      (biggest ? "big:" : "small:") + sorted.map((f) => frac(...f)).join(","),
    correctAnswer: frac(...correct),
    choices: shuffle(fractions.map((f) => frac(...f))),
    explanation: `${frac(...correct)} covers the ${biggest ? "most" : "least"} of the bar.`,
  };
  if (level < 3) {
    q.choiceVisuals = {};
    q.choiceLabels = {};
    fractions.forEach(([cn, cd]) => {
      q.choiceVisuals[frac(cn, cd)] = labelledBar(cn, cd);
      q.choiceLabels[frac(cn, cd)] = frac(cn, cd);
    });
    q.noChoiceListen = true;
  }
  return q;
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
    visual: FV.stacked([[n1, d], [n2, d]], { label: `Two bars cut into ${d} parts: one with ${n1} shaded and one with ${n2} shaded` }),
    explanation: `${n1} ${symbol} ${n2} = ${result}, and the parts stay ${d}ths: ${frac(result, d)}.`,
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
  picture: [makePictureQuestion],
  equivalent: [makeEquivalentQuestion],
  compare: [makeCompareQuestion],
  add: [makeAddSubtractQuestion],
};
QUESTION_KINDS.all = [
  makeIdentifyQuestion,
  makePictureQuestion,
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
  const storageKey = "klg-fractions-best-ms:" + mode + (level === 2 ? "" : ":L" + level);
  const kinds = QUESTION_KINDS[mode];

  const labels = {
    all: "Pictures, equivalents, comparing & adding",
    identify: "Read the fraction picture",
    picture: "Find the picture for the fraction",
    equivalent: "Find the equivalent fraction",
    compare: "Tap the biggest or smallest fraction",
    add: "Add & subtract with like denominators",
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
