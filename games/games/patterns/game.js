/**
 * Patterns & Skip Counting question generator.
 *
 * Three question kinds, mixed by default:
 *  - skip    (?mode=skip):    count on (and back) in 2s, 3s, 5s, 10s, 25s.
 *  - numbers (?mode=numbers): add/subtract, doubling and halving patterns,
 *                             plus a missing number in the middle.
 *  - shapes  (?mode=shapes):  repeating emoji patterns (ABAB, AABB, ABC,
 *                             ABB) and a letter sequence.
 *
 * Wrong choices are the mistakes kids actually make: continuing with the
 * wrong step size, going the wrong way, or repeating the previous term —
 * never a number so far off it can be ruled out without thinking.
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

/** Four distinct choices: the answer plus the first three usable decoys. */
function buildChoices(answer, candidates) {
  const wrongs = [];
  for (const value of candidates) {
    if (value !== answer && !wrongs.includes(value) && (typeof value !== "number" || value > 0)) {
      wrongs.push(value);
    }
    if (wrongs.length === 3) break;
  }
  return shuffle([answer, ...wrongs]);
}

const SEQ = (values) => values.join(", ") + ", ?";

function makeSkipQuestion() {
  const step = pick([2, 2, 3, 5, 5, 10, 10, 25]);
  const backwards = randomInt(1, 4) === 1;
  const length = 4;

  if (backwards) {
    const start = step * randomInt(length + 1, 12);
    const shown = [];
    for (let i = 0; i < length; i += 1) shown.push(start - i * step);
    const answer = start - length * step;
    return {
      prompt: `Count back in ${step}s. What comes next?\n${SEQ(shown)}`,
      dedupeKey: `skipback-${step}-${start}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer - step, answer + step, answer + 1, answer - 1]),
    };
  }

  const start = step * randomInt(1, 6);
  const shown = [];
  for (let i = 0; i < length; i += 1) shown.push(start + i * step);
  const answer = start + length * step;
  return {
    prompt: `Count in ${step}s. What comes next?\n${SEQ(shown)}`,
    dedupeKey: `skip-${step}-${start}`,
    correctAnswer: answer,
    choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 1]),
  };
}

function makeNumberQuestion() {
  const kind = randomInt(1, 4);

  if (kind === 1) {
    // Add the same amount each time (non-table steps, so it isn't skip counting).
    const step = pick([4, 6, 7, 8, 9, 11, 12]);
    const start = randomInt(1, 15);
    const shown = [start, start + step, start + 2 * step, start + 3 * step];
    const answer = start + 4 * step;
    return {
      prompt: `What comes next?\n${SEQ(shown)}`,
      dedupeKey: `add-${step}-${start}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 2]),
    };
  }

  if (kind === 2) {
    // Take the same amount away each time.
    const step = pick([3, 4, 6, 7, 8, 9]);
    const answer = randomInt(1, 12);
    const shown = [answer + 4 * step, answer + 3 * step, answer + 2 * step, answer + step];
    return {
      prompt: `What comes next?\n${SEQ(shown)}`,
      dedupeKey: `sub-${step}-${answer}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer - step, answer + step, answer - 1, answer + 2]),
    };
  }

  if (kind === 3) {
    // Doubling (or halving) — the rule changes, not the step.
    const halving = randomInt(0, 1) === 1;
    const seed = pick([1, 2, 3, 5]);
    const doubles = [seed, seed * 2, seed * 4, seed * 8, seed * 16];
    if (halving) {
      const shown = [...doubles].reverse().slice(0, 4);
      const answer = seed;
      return {
        prompt: `Each number is half of the one before. What comes next?\n${SEQ(shown)}`,
        dedupeKey: `half-${seed}`,
        correctAnswer: answer,
        choices: buildChoices(answer, [answer * 2, answer + 1, answer * 4, answer + 2]),
      };
    }
    const shown = doubles.slice(0, 4);
    const answer = doubles[4];
    return {
      prompt: `Each number is double the one before. What comes next?\n${SEQ(shown)}`,
      dedupeKey: `double-${seed}`,
      correctAnswer: answer,
      choices: buildChoices(answer, [answer + seed * 8, answer / 2, answer + 2, answer - 2]),
    };
  }

  // Missing number in the middle of the run.
  const step = pick([2, 3, 4, 5, 10]);
  const start = step * randomInt(1, 6);
  const terms = [start, start + step, start + 2 * step, start + 3 * step];
  const hole = randomInt(1, 2);
  const answer = terms[hole];
  const shown = terms.map((t, i) => (i === hole ? "?" : t)).join(", ");
  return {
    prompt: `Which number is missing?\n${shown}`,
    dedupeKey: `gap-${step}-${start}-${hole}`,
    correctAnswer: answer,
    choices: buildChoices(answer, [answer + step, answer - step, answer + 1, answer - 1]),
  };
}

const PATTERN_SETS = [
  ["🔴", "🔵", "🟡"],
  ["🍎", "🍌", "🍇"],
  ["⭐", "🌙", "☀️"],
  ["🐶", "🐱", "🐭"],
  ["🔺", "🟦", "⚪"],
  ["🚗", "🚌", "🚲"],
  ["🌸", "🍀", "🌻"],
  ["😀", "😎", "🤖"],
];

function makeShapePattern() {
  // A letter run is the same idea with letters, worth mixing in.
  if (randomInt(1, 5) === 1) {
    const step = pick([1, 1, 2]);
    const start = randomInt(0, 25 - 5 * step);
    // Decoys stay inside A–Z by wrapping, so no stray punctuation appears.
    const letter = (offset) => String.fromCharCode(65 + ((start + offset) % 26));
    const letters = [];
    for (let i = 0; i < 4; i += 1) letters.push(letter(i * step));
    const answer = letter(4 * step);
    const codes = [letter(5 * step), letter(3 * step), letter(4 * step + 1), letter(4 * step + 2)];
    return {
      prompt: `What comes next?\n${SEQ(letters)}`,
      dedupeKey: `letters-${start}-${step}`,
      correctAnswer: answer,
      choices: buildChoices(answer, codes),
    };
  }

  const baseSet = pick(PATTERN_SETS);
  const set = shuffle(baseSet);
  const [a, b, c] = set;
  const rule = pick(["AB", "AAB", "ABB", "ABC"]);
  const unit = { AB: [a, b], AAB: [a, a, b], ABB: [a, b, b], ABC: [a, b, c] }[rule];
  const shown = [];
  const length = 7;
  for (let i = 0; i < length; i += 1) shown.push(unit[i % unit.length]);
  const answer = unit[length % unit.length];
  // The pattern's own three pictures plus one outsider, so a child who has
  // spotted the rule still has to say which picture the rule lands on.
  const outsider = pick(pick(PATTERN_SETS.filter((s) => s !== baseSet)));
  return {
    prompt: `What comes next?\n${shown.join(" ")} ❓`,
    dedupeKey: `pat-${rule}-${set.join("")}`,
    correctAnswer: answer,
    choices: shuffle([...new Set([answer, a, b, c, outsider])].slice(0, 4)),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["skip", "numbers", "shapes"].includes(mode) ? mode : "all";
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
  const totalQuestions = 12;
  const storageKey = "klg-patterns-best-ms:" + mode;

  const labels = {
    all: "Skip counting, number rules & picture patterns",
    skip: "Counting on and back in steps",
    numbers: "Find the number rule",
    shapes: "Repeating picture patterns",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkMode = new URLSearchParams(
      link.getAttribute("href").replace(/^[^?]*\??/, "")
    ).get("mode");
    if ((linkMode || "all") === mode) {
      link.classList.replace("btn-outline-secondary", "btn-secondary");
    }
  });

  // Sequences read best on their own line, so keep the newlines in prompts.
  document.getElementById("question-text").style.whiteSpace = "pre-line";

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
      const kind = mode === "all" ? pick(["skip", "skip", "numbers", "numbers", "shapes"]) : mode;
      if (kind === "skip") return makeSkipQuestion();
      if (kind === "numbers") return makeNumberQuestion();
      return makeShapePattern();
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
