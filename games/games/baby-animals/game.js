/**
 * Baby animals question generator.
 * Two directions, mixed by default: "What is a baby cow called? 🐮" (tap
 * calf) and "Which animal has a baby called a joey?" (tap 🦘 Kangaroo).
 * Practice one with ?mode=baby or ?mode=animal.
 *
 * Several baby names are genuinely shared (a calf is a baby cow, elephant
 * or whale; a cub is a baby bear, lion or tiger) and some animals answer to
 * more than one name (a baby fox is a kit, cub or pup). Each animal
 * therefore carries an `avoid` list of names that are also-correct or
 * near-synonyms, and a choice set never mixes two animals that share a
 * name — so exactly one offered answer is ever right.
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

// avoid: other names for THIS animal's baby — never offered as wrong
// choices against it (and this animal is never a wrong choice for them).
const ANIMALS = [
  { emoji: "🐶", animal: "dog", baby: "puppy", avoid: ["pup"] },
  { emoji: "🐱", animal: "cat", baby: "kitten", avoid: ["kit"] },
  { emoji: "🐮", animal: "cow", baby: "calf" },
  { emoji: "🐴", animal: "horse", baby: "foal" },
  { emoji: "🐑", animal: "sheep", baby: "lamb" },
  { emoji: "🐷", animal: "pig", baby: "piglet" },
  { emoji: "🐐", animal: "goat", baby: "kid" },
  { emoji: "🐔", animal: "chicken", baby: "chick" },
  { emoji: "🦆", animal: "duck", baby: "duckling" },
  { emoji: "🦢", animal: "swan", baby: "cygnet" },
  { emoji: "🦉", animal: "owl", baby: "owlet" },
  { emoji: "🦅", animal: "eagle", baby: "eaglet" },
  { emoji: "🦘", animal: "kangaroo", baby: "joey" },
  { emoji: "🐻", animal: "bear", baby: "cub" },
  { emoji: "🦁", animal: "lion", baby: "cub" },
  { emoji: "🐯", animal: "tiger", baby: "cub" },
  { emoji: "🦊", animal: "fox", baby: "kit", avoid: ["cub", "pup", "kitten"] },
  { emoji: "🐺", animal: "wolf", baby: "pup", avoid: ["cub", "puppy"] },
  { emoji: "🦭", animal: "seal", baby: "pup", avoid: ["puppy"] },
  { emoji: "🐰", animal: "rabbit", baby: "bunny", avoid: ["kit", "kitten"] },
  { emoji: "🦌", animal: "deer", baby: "fawn" },
  { emoji: "🐘", animal: "elephant", baby: "calf" },
  { emoji: "🐋", animal: "whale", baby: "calf" },
  { emoji: "🐸", animal: "frog", baby: "tadpole" },
  { emoji: "🦋", animal: "butterfly", baby: "caterpillar" },
  { emoji: "🐟", animal: "fish", baby: "fry" },
  { emoji: "🐧", animal: "penguin", baby: "chick" },
];

/** True when `name` is a right (or defensible) answer for this animal. */
function nameFits(entry, name) {
  return entry.baby === name || (entry.avoid || []).includes(name);
}

function an(word) {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

function pickAnimal(askedSet) {
  const available = ANIMALS.filter((a) => !askedSet.has(a.animal));
  const pool = available.length ? available : ANIMALS;
  return pool[randomInt(0, pool.length - 1)];
}

function makeBabyQuestion(askedSet) {
  const answer = pickAnimal(askedSet);
  const wrongs = new Set();
  const others = shuffle(ANIMALS.filter((a) => !nameFits(answer, a.baby)));
  for (const other of others) {
    wrongs.add(other.baby);
    if (wrongs.size === 3) break;
  }
  return {
    prompt: `What is a baby ${answer.animal} called? ${answer.emoji}`,
    dedupeKey: answer.animal,
    correctAnswer: answer.baby,
    choices: shuffle([answer.baby, ...wrongs]),
  };
}

function makeAnimalQuestion(askedSet) {
  const answer = pickAnimal(askedSet);
  const format = (a) => `${a.emoji} ${capitalize(a.animal)}`;
  const wrongs = new Set();
  const others = shuffle(ANIMALS.filter((a) => a !== answer && !nameFits(a, answer.baby)));
  for (const other of others) {
    wrongs.add(format(other));
    if (wrongs.size === 3) break;
  }
  return {
    prompt: `Which animal has a baby called ${an(answer.baby)}?`,
    dedupeKey: answer.animal,
    correctAnswer: format(answer),
    choices: shuffle([format(answer), ...wrongs]),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "baby" || mode === "animal" ? mode : "all";
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
  const storageKey = "klg-baby-animals-best-ms:" + mode;

  const labels = {
    all: "Name the baby + find the animal",
    baby: "What is the baby called?",
    animal: "Which animal is the baby from?",
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
    generateQuestion: (askedSet) => {
      const useBaby = mode === "baby" || (mode === "all" && randomInt(0, 1) === 0);
      return useBaby ? makeBabyQuestion(askedSet) : makeAnimalQuestion(askedSet);
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
