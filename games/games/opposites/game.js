/**
 * Opposites & Similar Words question generator.
 *
 * Plenty of words have more than one right partner — "short" is the
 * opposite of both long and tall, "big" means the same as large and huge.
 * Both word lists are therefore turned into a map of word -> every
 * acceptable answer, and a wrong choice is only allowed if it appears in
 * neither the opposite map nor the similar map for that word. So exactly
 * one offered answer is ever defensible.
 *
 * In "same meaning" questions the word's own opposite is deliberately kept
 * as a tempting decoy — mixing those two up is the classic mistake.
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

const OPPOSITE_PAIRS = [
  ["big", "small"],
  ["big", "little"],
  ["tall", "short"],
  ["long", "short"],
  ["hot", "cold"],
  ["up", "down"],
  ["in", "out"],
  ["day", "night"],
  ["fast", "slow"],
  ["happy", "sad"],
  ["open", "closed"],
  ["old", "new"],
  ["old", "young"],
  ["wet", "dry"],
  ["hard", "soft"],
  ["heavy", "light"],
  ["dark", "light"],
  ["full", "empty"],
  ["loud", "quiet"],
  ["clean", "dirty"],
  ["first", "last"],
  ["push", "pull"],
  ["give", "take"],
  ["start", "stop"],
  ["above", "below"],
  ["near", "far"],
  ["left", "right"],
  ["more", "less"],
  ["win", "lose"],
  ["remember", "forget"],
  ["always", "never"],
  ["front", "back"],
  ["top", "bottom"],
  ["inside", "outside"],
  ["brave", "scared"],
  ["strong", "weak"],
  ["early", "late"],
  ["smooth", "rough"],
  ["thick", "thin"],
  ["sweet", "sour"],
  ["asleep", "awake"],
  ["buy", "sell"],
  ["float", "sink"],
  ["laugh", "cry"],
  ["arrive", "leave"],
  ["same", "different"],
  ["true", "false"],
  ["rich", "poor"],
  ["deep", "shallow"],
  ["wide", "narrow"],
  ["question", "answer"],
  ["begin", "end"],
  ["hard", "easy"],
  ["difficult", "easy"],
];

/**
 * Answers a child could fairly defend that the pair lists don't already
 * link — "silent" really is an opposite of "loud", "below" of "up". These
 * words are never offered as wrong choices for their key.
 */
const ALSO_RIGHT = {
  loud: ["silent"],
  quiet: ["noisy"],
  happy: ["unhappy"],
  sad: ["glad", "cheerful"],
  begin: ["stop", "finish"],
  end: ["start"],
  start: ["end", "finish"],
  stop: ["begin"],
  first: ["end", "final"],
  last: ["start", "begin"],
  open: ["shut"],
  up: ["below", "bottom", "under"],
  down: ["above", "top"],
  top: ["below", "down"],
  bottom: ["above", "up"],
  above: ["down", "bottom"],
  below: ["up", "top"],
  in: ["outside"],
  out: ["inside"],
  inside: ["out"],
  outside: ["in"],
  tall: ["small", "little", "tiny", "low"],
  short: ["big", "large", "huge", "long"],
  long: ["small", "little", "tiny"],
  wide: ["thin"],
  narrow: ["thick"],
  dirty: ["neat", "tidy"],
  weak: ["powerful"],
  awake: ["sleepy", "tired"],
  brave: ["afraid"],
  slow: ["quick"],
  hot: ["cool", "chilly"],
  cold: ["warm"],
};

const SIMILAR_PAIRS = [
  ["big", "large"],
  ["big", "huge"],
  ["small", "tiny"],
  ["happy", "glad"],
  ["happy", "cheerful"],
  ["sad", "unhappy"],
  ["fast", "quick"],
  ["angry", "mad"],
  ["begin", "start"],
  ["closed", "shut"],
  ["jump", "leap"],
  ["shout", "yell"],
  ["quiet", "silent"],
  ["smart", "clever"],
  ["tired", "sleepy"],
  ["pretty", "beautiful"],
  ["scared", "afraid"],
  ["sick", "ill"],
  ["hard", "difficult"],
  ["easy", "simple"],
  ["gift", "present"],
  ["tale", "story"],
  ["cool", "chilly"],
  ["cool", "cold"],
  ["cold", "chilly"],
  ["small", "little"],
  ["little", "tiny"],
  ["rock", "stone"],
  ["home", "house"],
  ["kid", "child"],
  ["bag", "sack"],
  ["road", "street"],
  ["trip", "journey"],
  ["funny", "amusing"],
  ["strong", "powerful"],
  ["neat", "tidy"],
  ["shiny", "sparkly"],
  ["hurry", "rush"],
  ["look", "watch"],
  ["talk", "speak"],
];

/** word -> Set of every partner word, in both directions. */
function buildMap(pairs) {
  const map = new Map();
  const add = (from, to) => {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from).add(to);
  };
  pairs.forEach(([a, b]) => {
    add(a, b);
    add(b, a);
  });
  return map;
}

const OPPOSITES = buildMap(OPPOSITE_PAIRS);
const SIMILARS = buildMap(SIMILAR_PAIRS);
const ALL_WORDS = [...new Set([...OPPOSITES.keys(), ...SIMILARS.keys()])];

/**
 * Words safe to offer against `word` when `answer` is right: nothing that
 * is an opposite or synonym of the word, nothing a synonym of the answer
 * (a synonym of "small" is just as good an opposite of "big"), and nothing
 * on either word's also-right list.
 */
function safeDecoys(word, answer, count, banned) {
  const blocked = new Set([
    word,
    answer,
    ...(OPPOSITES.get(word) || []),
    ...(SIMILARS.get(word) || []),
    ...(SIMILARS.get(answer) || []),
    ...(ALSO_RIGHT[word] || []),
    ...(ALSO_RIGHT[answer] || []),
    ...(banned || []),
  ]);
  return shuffle(ALL_WORDS.filter((w) => !blocked.has(w))).slice(0, count);
}

function makeOppositeQuestion() {
  const [word, answer] = shuffle(pick(OPPOSITE_PAIRS));
  return {
    prompt: `What is the opposite of "${word}"?`,
    dedupeKey: "opp-" + word,
    correctAnswer: answer,
    choices: shuffle([answer, ...safeDecoys(word, answer, 3)]),
  };
}

function makeSimilarQuestion() {
  const [word, answer] = shuffle(pick(SIMILAR_PAIRS));
  const opposites = [...(OPPOSITES.get(word) || [])];
  // Offer the word's opposite as the trap when it has one — mixing up
  // "same" and "opposite" is the mistake worth practising against.
  const trap = opposites.length ? [pick(opposites)] : [];
  return {
    prompt: `Which word means almost the SAME as "${word}"?`,
    dedupeKey: "sim-" + word,
    correctAnswer: answer,
    choices: shuffle([answer, ...trap, ...safeDecoys(word, answer, 3 - trap.length, trap)]),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["opposite", "similar"].includes(mode) ? mode : "all";
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
  const storageKey = "klg-opposites-best-ms:" + mode;

  const labels = {
    all: "Opposites and words that mean the same",
    opposite: "Find the opposite word",
    similar: "Find the word that means the same",
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
    timePerQuestion: 15,
    generateQuestion: () => {
      const kind = mode === "all" ? pick(["opposite", "opposite", "similar"]) : mode;
      return kind === "opposite" ? makeOppositeQuestion() : makeSimilarQuestion();
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
