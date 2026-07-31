/**
 * Solar System question generator.
 *
 * Two kinds, mixed by default:
 *  - order (?mode=order): position from the Sun, neighbours, and which of
 *                         two planets is closer — all generated from the
 *                         planet list so every ordering question is
 *                         consistent with every other.
 *  - facts (?mode=facts): a written question bank (rings, moons, the Sun,
 *                         gravity, astronauts). Each entry carries its own
 *                         wrong answers so nothing accidentally true is
 *                         ever offered as wrong.
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

const PLANETS = [
  { name: "Mercury", emoji: "🌑" },
  { name: "Venus", emoji: "🟠" },
  { name: "Earth", emoji: "🌍" },
  { name: "Mars", emoji: "🔴" },
  { name: "Jupiter", emoji: "🟤" },
  { name: "Saturn", emoji: "🪐" },
  { name: "Uranus", emoji: "🔵" },
  { name: "Neptune", emoji: "🔷" },
];

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const FACTS = [
  {
    q: "Which planet is known as the Red Planet? 🔴",
    a: "Mars",
    wrong: ["Venus", "Jupiter", "Mercury"],
  },
  {
    q: "Which is the biggest planet in our solar system?",
    a: "Jupiter",
    wrong: ["Saturn", "Earth", "Neptune"],
  },
  {
    q: "Which is the smallest planet in our solar system?",
    a: "Mercury",
    wrong: ["Mars", "Venus", "Earth"],
  },
  {
    q: "Which planet is famous for its bright rings? 🪐",
    a: "Saturn",
    wrong: ["Jupiter", "Uranus", "Mars"],
  },
  {
    q: "Which planet is the hottest?",
    a: "Venus",
    wrong: ["Mercury", "Mars", "Jupiter"],
  },
  {
    q: "How many planets are in our solar system?",
    a: "8",
    wrong: ["7", "9", "12"],
  },
  {
    q: "What is the Sun? ☀️",
    a: "A star",
    wrong: ["A planet", "A moon", "A comet"],
  },
  {
    q: "Which planet do we live on?",
    a: "Earth",
    wrong: ["Mars", "Venus", "The Moon"],
  },
  {
    q: "How long does Earth take to travel once around the Sun?",
    a: "About 1 year",
    wrong: ["About 1 day", "About 1 month", "About 10 years"],
  },
  {
    q: "How long does Earth take to spin around once?",
    a: "About 1 day",
    wrong: ["About 1 hour", "About 1 month", "About 1 year"],
  },
  {
    q: "How many moons does Earth have? 🌙",
    a: "1",
    wrong: ["2", "0", "12"],
  },
  {
    q: "Which planet has the most moons?",
    a: "Saturn",
    wrong: ["Earth", "Mars", "Mercury"],
  },
  {
    q: "What holds the planets going around the Sun?",
    a: "Gravity",
    wrong: ["Wind", "Magnets", "Air"],
  },
  {
    q: "What do we call a big rock flying through space?",
    a: "An asteroid",
    wrong: ["A galaxy", "A planet", "A star"],
  },
  {
    q: "What is a shooting star really?",
    a: "A meteor burning up",
    wrong: ["A baby star", "A rocket", "A planet moving"],
  },
  {
    q: "Where is the asteroid belt?",
    a: "Between Mars and Jupiter",
    wrong: ["Between Earth and Mars", "Around the Sun's surface", "Past Neptune"],
  },
  {
    q: "Who was the first person to walk on the Moon?",
    a: "Neil Armstrong",
    wrong: ["Yuri Gagarin", "Kalpana Chawla", "Isaac Newton"],
  },
  {
    q: "Is Pluto a planet?",
    a: "No — it is a dwarf planet",
    wrong: ["Yes — the 9th planet", "No — it is a moon", "Yes — the 10th planet"],
  },
  {
    q: "Why can't people breathe on the Moon?",
    a: "There is no air there",
    wrong: ["It is too bright", "It spins too fast", "It is made of cheese"],
  },
  {
    q: "What do we call the galaxy we live in?",
    a: "The Milky Way",
    wrong: ["The Big Dipper", "Andromeda", "The Solar Way"],
  },
  {
    q: "Which planet spins on its side, like a rolling ball?",
    a: "Uranus",
    wrong: ["Neptune", "Saturn", "Mercury"],
  },
  {
    // "Coldest" is a genuine toss-up between Neptune and Uranus, so ask
    // the question that has one clean answer instead.
    q: "Which planet is farthest from the Sun?",
    a: "Neptune",
    wrong: ["Uranus", "Saturn", "Jupiter"],
  },
  {
    q: "What is the closest star to Earth?",
    a: "The Sun",
    wrong: ["The North Star", "The Moon", "Jupiter"],
  },
  {
    q: "What do we call a person who travels into space?",
    a: "An astronaut",
    wrong: ["A pilot", "A scientist", "An astronomer"],
  },
  {
    q: "What makes the Moon look bright at night?",
    a: "Sunlight bouncing off it",
    wrong: ["It is burning", "It is a star", "Its own lamps"],
  },
];

function makeOrderQuestion() {
  const kind = randomInt(1, 4);

  if (kind === 1) {
    const index = randomInt(0, 7);
    const answer = PLANETS[index];
    const wrongs = shuffle(PLANETS.filter((p) => p !== answer)).slice(0, 3);
    return {
      prompt: `Which planet is ${ORDINALS[index]} from the Sun? ☀️`,
      dedupeKey: "pos-" + index,
      correctAnswer: answer.name,
      choices: shuffle([answer.name, ...wrongs.map((p) => p.name)]),
    };
  }

  if (kind === 2) {
    const index = randomInt(0, 7);
    const planet = PLANETS[index];
    return {
      prompt: `How far from the Sun is ${planet.name} ${planet.emoji}?`,
      dedupeKey: "ord-" + index,
      correctAnswer: ORDINALS[index],
      choices: shuffle([ORDINALS[index], ...shuffle(ORDINALS.filter((o) => o !== ORDINALS[index])).slice(0, 3)]),
    };
  }

  if (kind === 3) {
    const index = randomInt(0, 6);
    const planet = PLANETS[index];
    const answer = PLANETS[index + 1];
    const wrongs = shuffle(PLANETS.filter((p) => p !== answer && p !== planet)).slice(0, 3);
    return {
      prompt: `Which planet comes right after ${planet.name} ${planet.emoji}?`,
      dedupeKey: "after-" + index,
      correctAnswer: answer.name,
      choices: shuffle([answer.name, ...wrongs.map((p) => p.name)]),
    };
  }

  const [a, b] = shuffle(PLANETS).slice(0, 2);
  const closer = PLANETS.indexOf(a) < PLANETS.indexOf(b) ? a : b;
  return {
    prompt: `Which planet is closer to the Sun: ${a.name} or ${b.name}?`,
    dedupeKey: `closer-${[a.name, b.name].sort().join("-")}`,
    correctAnswer: closer.name,
    choices: shuffle([a.name, b.name]),
  };
}

function makeFactQuestion() {
  const fact = pick(FACTS);
  return {
    prompt: fact.q,
    dedupeKey: "fact-" + fact.a + fact.q,
    correctAnswer: fact.a,
    choices: shuffle([fact.a, ...fact.wrong]),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["order", "facts"].includes(mode) ? mode : "all";
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
  const storageKey = "klg-solar-system-best-ms:" + mode;

  const labels = {
    all: "Planet order and space facts",
    order: "Where are the planets?",
    facts: "Space facts and firsts",
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
    timePerQuestion: 25,
    generateQuestion: () => {
      const kind = mode === "all" ? pick(["order", "facts", "facts"]) : mode;
      return kind === "order" ? makeOrderQuestion() : makeFactQuestion();
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
