/**
 * Science Quiz question bank.
 *
 * Four topics, mixed by default and each playable on its own:
 * animals (?mode=animals), the human body (?mode=body), plants
 * (?mode=plants) and matter & weather (?mode=matter).
 *
 * Every question carries its own three wrong answers rather than drawing
 * them from a shared pool, because in a bank this broad a generic decoy
 * ("water") is too often quietly correct.
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

const FIRST_LEVEL = new URLSearchParams(window.location.search).get("level") === "1";
const BANK = Object.fromEntries(Object.entries(window.KlgQuestions.BANK).map(([topic, list]) => [
  topic,
  FIRST_LEVEL ? window.KlgQuestions.EASY[topic].map((i) => list[i]) : list,
]));

const TOPICS = Object.keys(BANK);

/**
 * Every question gets a picture clue: the emoji already in the question, or
 * one from this list (matched on the start of the question).
 */
const CLUES = [
  ["What do we call animals that eat only plants", "🐄🌿"], ["What do we call animals that eat only meat", "🦁🥩"],
  ["How do fish breathe", "🐟💧"], ["A caterpillar changes", "🐛➡️❓"], ["What do many baby animals grow inside", "🥚🐣"],
  ["Which animal sleeps through the winter", "❄️💤"], ["Which animal changes color", "🌿🎨"],
  ["How many senses", "👀👂👃👅✋"], ["Which body part digests", "🍽️"], ["What holds your body up", "🧍"],
  ["How many teeth", "🦷"], ["Which food group helps", "💪🥚🫘"], ["Which part of your body protects your brain", "🧠"], ["How many bones", "🦴🦴🦴"],
  ["Which part of a plant makes food", "☀️🌱"], ["What do plants need", "🌱☀️💧"], ["What gas do plants give out", "🌳💨"],
  ["Which part of the plant holds it up", "🌻"], ["Where do most plants get their water", "🌧️🌱"], ["What do we call a tree that keeps", "🌲"], ["Why do leaves look green", "🍃"],
  ["What are the three states of matter", "🧊💧♨️"], ["Water boiling", "🍲🔥"], ["Which of these is a liquid", "💧"], ["Which of these floats", "🌊"],
  ["What pulls everything down", "🍎⬇️"], ["Sound travels", "🔔🔊"], ["What do we call the water cycle", "☀️💧⬆️"],
];

/** Answers that have a picture: when every choice does, the answer buttons become pictures. */
const ANSWER_PICS = {
  Chicken: "🐔", Cow: "🐄", Dog: "🐕", Cat: "🐈", "Blue whale": "🐋", Elephant: "🐘", Giraffe: "🦒", Shark: "🦈",
  Bear: "🐻", Lion: "🦁", Horse: "🐴", Monkey: "🐒", Chameleon: "🦎", Zebra: "🦓", Kangaroo: "🦘",
  Honey: "🍯", Milk: "🥛", Silk: "🧵", Butter: "🧈", Carrot: "🥕", Apple: "🍎", Lettuce: "🥬", Pea: "🫛",
  Snow: "❄️", Fog: "🌫️", Dew: "💧", Steam: "♨️", "A rainbow": "🌈", "A cloud": "☁️", "The moon": "🌙", "A star": "⭐",
  "The heart": "🫀", "The brain": "🧠", "The lungs": "🫁", "The stomach": "🫃", "The liver": "🍖", "The kidneys": "🫘", "The muscles": "💪",
  "Our nose": "👃", "Our ears": "👂", "Our tongue": "👅", "Our eyes": "👀", "Our fingers": "✋",
  "A thermometer": "🌡️", "A ruler": "📏", "A clock": "⏰", "A scale": "⚖️",
  "The Sun": "☀️", "The Moon": "🌙", "A mirror": "🪞", "A window": "🪟",
  "A wooden stick": "🪵", "A metal key": "🔑", "A stone": "🪨", "A coin": "🪙", "A brick": "🧱", "A pillow": "🛏️", "A spoon": "🥄",
  "The bee": "🐝", "The ant": "🐜", "The fly": "🪰", "The beetle": "🪲", Butterfly: "🦋", Bee: "🐝", Bird: "🐦", Beetle: "🪲",
};

const PICTOGRAPH = /\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*/gu;

function clueFor(entry) {
  const inText = entry.q.match(PICTOGRAPH);
  if (inText) return inText.join("");
  const found = CLUES.find(([start]) => entry.q.startsWith(start));
  return found ? found[1] : "";
}

function clueFigure(emoji) {
  const f = document.createElement("figure");
  f.className = "kv-clue";
  f.setAttribute("role", "img");
  f.setAttribute("aria-label", "Picture clue");
  f.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
  return f;
}

function makeQuestion(mode) {
  const topic = mode === "all" ? pick(TOPICS) : mode;
  const entry = pick(BANK[topic]);
  const choices = shuffle([entry.a, ...entry.wrong]);
  let emoji = clueFor(entry);
  // A clue that is the answer itself would give it away.
  if (ANSWER_PICS[entry.a] && emoji.includes(ANSWER_PICS[entry.a])) emoji = "❓";
  const q = {
    visual: emoji ? clueFigure(emoji) : null,
    prompt: entry.q.replace(PICTOGRAPH, "").replace(/\s+([?.])/g, "$1").trim(),
    reviewPrompt: entry.q,
    dedupeKey: entry.a + entry.q,
    correctAnswer: entry.a,
    choices,
    explanation: `The answer is ${entry.a}.`,
  };
  if (choices.every((c) => ANSWER_PICS[c])) {
    q.choiceVisuals = {};
    q.choiceLabels = {};
    choices.forEach((c) => {
      const box = document.createElement("div");
      box.className = "kv-choice";
      box.innerHTML = `<span class="kv-emoji" aria-hidden="true">${ANSWER_PICS[c]}</span><span class="kv-choice-text">${c}</span>`;
      q.choiceVisuals[c] = box;
      q.choiceLabels[c] = c;
    });
  }
  return q;
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return TOPICS.includes(mode) ? mode : "all";
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
  // One topic plays a shorter round, so a bank of 30 lasts for three different rounds.
  const totalQuestions = mode === "all" ? 15 : Math.min(10, BANK[mode].length);
  const storageKey = "klg-science-quiz-best-ms:" + mode;

  const labels = {
    all: "Animals, bodies, plants, matter & weather",
    animals: "Animal groups and how they live",
    body: "How your body works",
    plants: "How plants grow and feed",
    matter: "Matter, weather and forces",
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
    generateQuestion: () => makeQuestion(mode),
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
