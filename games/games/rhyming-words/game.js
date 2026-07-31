/**
 * Rhyming Words question generator.
 *
 * Words are grouped by the SOUND they end with, never by spelling — "night"
 * and "kite" sit in one family, "tail" and "whale" in another — so a wrong
 * choice can never secretly rhyme with the answer.
 *
 * Three question kinds, mixed by default:
 *  - rhyme  (?mode=rhyme):  "Which word rhymes with cat?"
 *  - odd    (?mode=odd):    three rhyming words plus an intruder.
 *  - finish (?mode=finish): a little rhyme with the last word missing.
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

// id is the sound, not the spelling: "ite" holds night, light AND kite.
const FAMILIES = [
  { id: "at", words: ["cat", "hat", "bat", "mat", "rat", "flat"] },
  { id: "an", words: ["can", "man", "fan", "pan", "van", "plan"] },
  { id: "ap", words: ["cap", "map", "nap", "tap", "clap"] },
  { id: "ag", words: ["bag", "flag", "tag", "wag"] },
  { id: "ed", words: ["bed", "red", "sled", "head", "bread"] },
  { id: "en", words: ["hen", "pen", "ten", "men", "then"] },
  { id: "et", words: ["net", "wet", "pet", "jet", "get"] },
  { id: "ig", words: ["pig", "big", "dig", "wig", "twig"] },
  { id: "in", words: ["pin", "win", "chin", "fin", "grin"] },
  { id: "ip", words: ["ship", "lip", "dip", "chip", "drip"] },
  { id: "it", words: ["sit", "hit", "bit", "fit", "kit"] },
  { id: "og", words: ["dog", "frog", "log", "fog", "jog"] },
  { id: "op", words: ["top", "hop", "mop", "stop", "shop"] },
  { id: "ot", words: ["pot", "hot", "dot", "spot", "knot"] },
  { id: "ug", words: ["bug", "rug", "hug", "mug", "jug"] },
  { id: "un", words: ["sun", "run", "fun", "bun"] },
  { id: "ut", words: ["nut", "cut", "hut", "shut"] },
  { id: "ake", words: ["cake", "lake", "bake", "snake", "rake"] },
  { id: "ame", words: ["name", "game", "same", "flame"] },
  { id: "ain", words: ["rain", "train", "plane", "brain", "chain"] },
  { id: "ail", words: ["snail", "tail", "mail", "whale", "pail"] },
  { id: "all", words: ["ball", "wall", "tall", "fall", "small"] },
  { id: "ell", words: ["bell", "shell", "well", "smell", "spell"] },
  { id: "ing", words: ["king", "ring", "sing", "wing", "swing"] },
  { id: "ock", words: ["sock", "rock", "clock", "lock", "block"] },
  { id: "ite", words: ["night", "light", "kite", "bite", "white"] },
  { id: "ee", words: ["tree", "bee", "sea", "tea", "key", "three"] },
  { id: "ar", words: ["car", "star", "jar", "far"] },
  { id: "own", words: ["crown", "down", "town", "brown", "clown"] },
  { id: "oon", words: ["moon", "spoon", "balloon", "soon"] },
  { id: "oat", words: ["boat", "coat", "goat", "note", "float"] },
  { id: "ice", words: ["mice", "rice", "ice", "nice", "price"] },
  { id: "ow", words: ["snow", "blow", "grow", "slow", "toe"] },
];

// Rhymes to finish — the blank is always the last word, and the word that
// sets up the rhyme is in the same line, so a child can hear the answer.
const RHYME_LINES = [
  { line: "The fat cat sat on a ___", family: "at", answer: "mat" },
  { line: "A little brown bug snuggled up on the ___", family: "ug", answer: "rug" },
  { line: "The green frog jumped onto a ___", family: "og", answer: "log" },
  { line: "I bake a big cake beside the blue ___", family: "ake", answer: "lake" },
  { line: "The king put on his ring and started to ___", family: "ing", answer: "sing" },
  { line: "The tall ball rolled along the garden ___", family: "all", answer: "wall" },
  { line: "At night the moon gives light to a shiny white ___", family: "ite", answer: "kite" },
  { line: "The snail left a trail on the end of its ___", family: "ail", answer: "tail" },
  { line: "My sock came off on a big grey ___", family: "ock", answer: "rock" },
  { line: "The bee sat down for tea under a ___", family: "ee", answer: "tree" },
  { line: "The clown came down into the busy ___", family: "own", answer: "town" },
  { line: "The goat rowed a note across the lake in a ___", family: "oat", answer: "boat" },
  { line: "Ten little hens took turns with one ___", family: "en", answer: "pen" },
  { line: "The pink pig wore a very silly ___", family: "ig", answer: "wig" },
  { line: "In the rain we ran to catch the ___", family: "ain", answer: "train" },
  { line: "The star drove far in a shiny red ___", family: "ar", answer: "car" },
  { line: "The mice think rice is very, very ___", family: "ice", answer: "nice" },
  { line: "The hot sun had lots of ___", family: "un", answer: "fun" },
];

/** Words from other families — safe to offer as non-rhyming choices. */
function otherWords(familyId, count) {
  const pool = shuffle(FAMILIES.filter((f) => f.id !== familyId));
  const words = [];
  for (const family of pool) {
    words.push(pick(family.words));
    if (words.length === count) break;
  }
  return words;
}

function makeRhymeQuestion() {
  const family = pick(FAMILIES);
  const [target, answer] = shuffle(family.words);
  return {
    prompt: `Which word rhymes with "${target}"?`,
    dedupeKey: "rhyme-" + target,
    correctAnswer: answer,
    choices: shuffle([answer, ...otherWords(family.id, 3)]),
  };
}

function makeOddQuestion() {
  const family = pick(FAMILIES);
  const three = shuffle(family.words).slice(0, 3);
  const odd = otherWords(family.id, 1)[0];
  return {
    prompt: "Which word does NOT rhyme with the other three?",
    dedupeKey: "odd-" + family.id,
    correctAnswer: odd,
    choices: shuffle([odd, ...three]),
  };
}

function makeFinishQuestion() {
  const entry = pick(RHYME_LINES);
  return {
    prompt: entry.line,
    dedupeKey: "finish-" + entry.answer,
    correctAnswer: entry.answer,
    choices: shuffle([entry.answer, ...otherWords(entry.family, 3)]),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["rhyme", "odd", "finish"].includes(mode) ? mode : "all";
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
  const storageKey = "klg-rhyming-words-best-ms:" + mode;

  const labels = {
    all: "Rhymes, odd ones out & rhymes to finish",
    rhyme: "Find the word that rhymes",
    odd: "Spot the word that does not rhyme",
    finish: "Finish the rhyme",
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
      const kind = mode === "all" ? pick(["rhyme", "rhyme", "odd", "finish"]) : mode;
      if (kind === "rhyme") return makeRhymeQuestion();
      if (kind === "odd") return makeOddQuestion();
      return makeFinishQuestion();
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
