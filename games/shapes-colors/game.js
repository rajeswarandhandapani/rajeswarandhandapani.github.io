/**
 * Shapes & Colors question generator (pre-K / kindergarten).
 *
 * Four question kinds, mixed by default, each also playable on its own:
 *  - shape   (?mode=shape):  "What shape is this? 🔺" and "Which one is a
 *                             star?" plus everyday objects (a door is a…?)
 *  - color   (?mode=color):  "What color is this? 🟢" / "Which one is red?"
 *                             plus everyday objects (a banana is…?)
 *  - sides   (?mode=sides):  sides and corners of polygons — asked as words
 *                             so shapes with no emoji (hexagon, octagon)
 *                             can join in.
 *
 * Prompts and choices are emoji or plain words only, because the quiz
 * engine renders both as text — no images to load, works offline.
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

/** Shapes that have a dependable emoji to show. */
const SHAPES = [
  { name: "circle", emoji: "🔵" },
  { name: "square", emoji: "🟦" },
  { name: "triangle", emoji: "🔺" },
  { name: "star", emoji: "⭐" },
  { name: "heart", emoji: "❤️" },
  { name: "diamond", emoji: "🔷" },
  { name: "crescent", emoji: "🌙" },
];

/** Sides/corners, including shapes we only ever name in words. */
const POLYGONS = [
  { name: "triangle", sides: 3 },
  { name: "square", sides: 4 },
  { name: "rectangle", sides: 4 },
  { name: "pentagon", sides: 5 },
  { name: "hexagon", sides: 6 },
  { name: "octagon", sides: 8 },
];

const COLORS = [
  { name: "red", emoji: "🟥" },
  { name: "orange", emoji: "🟧" },
  { name: "yellow", emoji: "🟨" },
  { name: "green", emoji: "🟩" },
  { name: "blue", emoji: "🟦" },
  { name: "purple", emoji: "🟪" },
  { name: "brown", emoji: "🟫" },
  { name: "black", emoji: "⬛" },
  { name: "white", emoji: "⬜" },
];

/** Round emoji for "what color is this?" so it never looks like a square. */
const COLOR_DOTS = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  purple: "🟣",
  brown: "🟤",
  black: "⚫",
  white: "⚪",
};

const OBJECT_SHAPES = [
  { thing: "a ball ⚽", shape: "circle" },
  { thing: "a door 🚪", shape: "rectangle" },
  { thing: "a slice of pizza 🍕", shape: "triangle" },
  { thing: "a clock face 🕒", shape: "circle" },
  { thing: "a dice cube 🎲", shape: "square" },
  { thing: "a stop sign 🛑", shape: "octagon" },
  { thing: "a book cover 📕", shape: "rectangle" },
  { thing: "a party hat 🎉", shape: "triangle" },
  { thing: "a coin 🪙", shape: "circle" },
  { thing: "a window 🪟", shape: "square" },
  { thing: "a honeycomb cell 🍯", shape: "hexagon" },
  { thing: "a kite 🪁", shape: "diamond" },
];

const OBJECT_COLORS = [
  { thing: "a banana 🍌", color: "yellow" },
  { thing: "grass 🌱", color: "green" },
  { thing: "the sky on a sunny day ☀️", color: "blue" },
  { thing: "a tomato 🍅", color: "red" },
  { thing: "an orange 🍊", color: "orange" },
  { thing: "a carrot 🥕", color: "orange" },
  { thing: "grapes 🍇", color: "purple" },
  { thing: "chocolate 🍫", color: "brown" },
  { thing: "snow ❄️", color: "white" },
  { thing: "the night sky 🌃", color: "black" },
  { thing: "a strawberry 🍓", color: "red" },
  { thing: "a leaf 🍃", color: "green" },
  { thing: "a school bus 🚌", color: "yellow" },
  { thing: "an eggplant 🍆", color: "purple" },
];

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

function an(word) {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

/** Three wrong names drawn from `pool`, never matching `answer`. */
function wrongNames(pool, answer, key) {
  return shuffle(pool.filter((item) => item[key] !== answer))
    .filter((item, i, arr) => arr.findIndex((o) => o[key] === item[key]) === i)
    .slice(0, 3)
    .map((item) => item[key]);
}

function makeShapeQuestion() {
  const kind = randomInt(1, 3);

  if (kind === 1) {
    // Show the shape, name it.
    const answer = pick(SHAPES);
    return {
      prompt: `What shape is this?  ${answer.emoji}`,
      dedupeKey: "name-" + answer.name,
      correctAnswer: capitalize(answer.name),
      choices: shuffle([
        capitalize(answer.name),
        ...wrongNames(SHAPES, answer.name, "name").map(capitalize),
      ]),
    };
  }

  if (kind === 2) {
    // Name the shape, tap the picture.
    const answer = pick(SHAPES);
    const wrongs = shuffle(SHAPES.filter((s) => s.name !== answer.name)).slice(0, 3);
    return {
      prompt: `Which one is ${an(answer.name)}?`,
      dedupeKey: "find-" + answer.name,
      correctAnswer: answer.emoji,
      choices: shuffle([answer.emoji, ...wrongs.map((s) => s.emoji)]),
    };
  }

  // Everyday objects.
  const item = pick(OBJECT_SHAPES);
  const allShapeNames = [
    ...new Set([...SHAPES.map((s) => s.name), ...POLYGONS.map((p) => p.name)]),
  ];
  const wrongs = shuffle(allShapeNames.filter((n) => n !== item.shape)).slice(0, 3);
  return {
    prompt: `What shape is ${item.thing}?`,
    dedupeKey: "object-" + item.thing,
    correctAnswer: capitalize(item.shape),
    choices: shuffle([capitalize(item.shape), ...wrongs.map(capitalize)]),
  };
}

function makeColorQuestion() {
  const kind = randomInt(1, 3);

  if (kind === 1) {
    const answer = pick(COLORS);
    return {
      prompt: `What color is this?  ${COLOR_DOTS[answer.name]}`,
      dedupeKey: "color-" + answer.name,
      correctAnswer: capitalize(answer.name),
      choices: shuffle([
        capitalize(answer.name),
        ...wrongNames(COLORS, answer.name, "name").map(capitalize),
      ]),
    };
  }

  if (kind === 2) {
    const answer = pick(COLORS);
    const wrongs = shuffle(COLORS.filter((c) => c.name !== answer.name)).slice(0, 3);
    return {
      prompt: `Which one is ${answer.name}?`,
      dedupeKey: "findcolor-" + answer.name,
      correctAnswer: answer.emoji,
      choices: shuffle([answer.emoji, ...wrongs.map((c) => c.emoji)]),
    };
  }

  const item = pick(OBJECT_COLORS);
  const wrongs = shuffle(COLORS.filter((c) => c.name !== item.color)).slice(0, 3);
  return {
    prompt: `What color is ${item.thing}?`,
    dedupeKey: "objcolor-" + item.thing,
    correctAnswer: capitalize(item.color),
    choices: shuffle([capitalize(item.color), ...wrongs.map((c) => capitalize(c.name))]),
  };
}

function makeSidesQuestion() {
  // Only one question can be asked about corner-less shapes, so it turns
  // up rarely rather than a third of the time.
  const kind = randomInt(1, 6);

  if (kind === 6) {
    // The odd one out: the only shape with no corners at all.
    return {
      prompt: "Which shape has no corners at all?",
      dedupeKey: "no-corners",
      correctAnswer: "Circle",
      choices: shuffle(["Circle", "Triangle", "Square", "Hexagon"]),
    };
  }

  const shape = pick(POLYGONS);
  const word = kind <= 3 ? "sides" : "corners";
  const wrongs = shuffle([2, 3, 4, 5, 6, 7, 8, 10].filter((n) => n !== shape.sides)).slice(0, 3);
  return {
    prompt: `How many ${word} does ${an(shape.name)} have?`,
    dedupeKey: `${word}-${shape.name}`,
    correctAnswer: shape.sides,
    choices: shuffle([shape.sides, ...wrongs]),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["shape", "color", "sides"].includes(mode) ? mode : "all";
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
  const storageKey = "klg-shapes-colors-best-ms:" + mode;

  const labels = {
    all: "Shapes, colors, sides & corners",
    shape: "Name and find the shapes",
    color: "Name and find the colors",
    sides: "How many sides and corners?",
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
      const kind = mode === "all" ? pick(["shape", "color", "shape", "color", "sides"]) : mode;
      if (kind === "shape") return makeShapeQuestion();
      if (kind === "color") return makeColorQuestion();
      return makeSidesQuestion();
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
