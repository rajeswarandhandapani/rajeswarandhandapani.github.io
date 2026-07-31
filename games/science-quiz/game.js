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

const BANK = {
  animals: [
    { q: "Which animal group does a frog belong to? 🐸", a: "Amphibian", wrong: ["Reptile", "Fish", "Mammal"] },
    { q: "Which animal group does a snake belong to? 🐍", a: "Reptile", wrong: ["Amphibian", "Insect", "Mammal"] },
    { q: "Which animal group does a dolphin belong to? 🐬", a: "Mammal", wrong: ["Fish", "Reptile", "Amphibian"] },
    { q: "How many legs does an insect have? 🐜", a: "6", wrong: ["4", "8", "10"] },
    { q: "How many legs does a spider have? 🕷️", a: "8", wrong: ["6", "4", "10"] },
    { q: "What do we call animals that eat only plants?", a: "Herbivores", wrong: ["Carnivores", "Omnivores", "Predators"] },
    { q: "What do we call animals that eat only meat?", a: "Carnivores", wrong: ["Herbivores", "Omnivores", "Insects"] },
    { q: "Which of these animals lays eggs? 🥚", a: "Chicken", wrong: ["Cow", "Dog", "Cat"] },
    { q: "What covers a bird's body? 🐦", a: "Feathers", wrong: ["Fur", "Scales", "Shells"] },
    { q: "What covers most fish? 🐟", a: "Scales", wrong: ["Feathers", "Fur", "Skin only"] },
    { q: "How do fish breathe under water?", a: "With gills", wrong: ["With lungs", "Through their fins", "They hold their breath"] },
    { q: "A caterpillar changes into a…?", a: "Butterfly", wrong: ["Bee", "Bird", "Beetle"] },
    { q: "What is a group of animal babies called before they hatch?", a: "Eggs", wrong: ["Seeds", "Cocoons", "Nests"] },
    { q: "Which animal is the largest on Earth? 🐋", a: "Blue whale", wrong: ["Elephant", "Giraffe", "Shark"] },
    { q: "Which animal sleeps through the winter — it hibernates?", a: "Bear", wrong: ["Lion", "Horse", "Monkey"] },
    { q: "What do bees make? 🐝", a: "Honey", wrong: ["Milk", "Silk", "Butter"] },
    { q: "Where do penguins live? 🐧", a: "In very cold places", wrong: ["In the desert", "In rainforests", "In caves"] },
    { q: "Which animal changes color to hide?", a: "Chameleon", wrong: ["Elephant", "Zebra", "Kangaroo"] },
  ],
  body: [
    { q: "How many senses does a person usually have?", a: "5", wrong: ["3", "6", "10"] },
    { q: "Which body part pumps blood around your body? 🫀", a: "The heart", wrong: ["The brain", "The lungs", "The stomach"] },
    { q: "Which body part helps you breathe? 🫁", a: "The lungs", wrong: ["The heart", "The liver", "The kidneys"] },
    { q: "Which body part helps you think and remember? 🧠", a: "The brain", wrong: ["The heart", "The stomach", "The muscles"] },
    { q: "Which body part digests the food you eat?", a: "The stomach", wrong: ["The lungs", "The brain", "The heart"] },
    { q: "What do we use to smell? 👃", a: "Our nose", wrong: ["Our ears", "Our tongue", "Our eyes"] },
    { q: "What do we use to taste? 👅", a: "Our tongue", wrong: ["Our nose", "Our fingers", "Our ears"] },
    { q: "What holds your body up and gives it shape?", a: "Bones", wrong: ["Blood", "Skin", "Hair"] },
    { q: "How many teeth does a grown-up usually have?", a: "32", wrong: ["20", "16", "40"] },
    { q: "Why should you wash your hands before eating? 🧼", a: "To wash off germs", wrong: ["To make them warm", "To make them soft", "To make them shiny"] },
    { q: "Which food group helps you grow strong muscles?", a: "Protein — like eggs and beans", wrong: ["Candy", "Chips", "Soda"] },
    { q: "What happens to your heart when you run fast? 🏃", a: "It beats faster", wrong: ["It beats slower", "It stops", "Nothing changes"] },
    { q: "Which part of your body protects your brain?", a: "The skull", wrong: ["The ribs", "The spine", "The jaw"] },
    { q: "How many bones does a grown-up have — about?", a: "About 206", wrong: ["About 50", "About 500", "About 1,000"] },
  ],
  plants: [
    { q: "Which part of a plant takes in water from the soil? 🌱", a: "The roots", wrong: ["The leaves", "The flower", "The fruit"] },
    { q: "Which part of a plant makes food using sunlight?", a: "The leaves", wrong: ["The roots", "The stem", "The seeds"] },
    { q: "What do plants need to make their own food?", a: "Sunlight, water and air", wrong: ["Meat and milk", "Only soil", "Only darkness"] },
    { q: "What gas do plants give out that we need to breathe?", a: "Oxygen", wrong: ["Carbon dioxide", "Helium", "Smoke"] },
    { q: "What grows into a new plant? 🌰", a: "A seed", wrong: ["A leaf", "A petal", "A twig"] },
    { q: "Which part of the plant holds it up?", a: "The stem", wrong: ["The roots", "The petals", "The fruit"] },
    { q: "Which insect helps flowers make seeds by carrying pollen? 🐝", a: "The bee", wrong: ["The ant", "The fly", "The beetle"] },
    { q: "Where do most plants get their water?", a: "From the soil", wrong: ["From the sky only", "From the wind", "From rocks"] },
    { q: "What do we call a tree that keeps its leaves all year?", a: "Evergreen", wrong: ["Deciduous", "Tropical", "Wilted"] },
    { q: "Why do leaves look green?", a: "They are full of chlorophyll", wrong: ["They are painted", "They are cold", "They are wet"] },
    { q: "Which of these do we eat that is really a root? 🥕", a: "Carrot", wrong: ["Apple", "Lettuce", "Pea"] },
  ],
  matter: [
    { q: "What happens to ice when it warms up? 🧊", a: "It melts into water", wrong: ["It freezes harder", "It becomes steam straight away", "Nothing happens"] },
    { q: "What are the three states of matter?", a: "Solid, liquid and gas", wrong: ["Hot, cold and warm", "Big, small and tiny", "Rock, water and wood"] },
    { q: "Water boiling in a pot turns into…?", a: "Steam — a gas", wrong: ["Ice — a solid", "Sand", "Air bubbles only"] },
    { q: "Which of these is a liquid?", a: "Milk", wrong: ["A brick", "A pillow", "A spoon"] },
    { q: "What makes the rain fall from clouds? ☁️", a: "Water droplets get heavy", wrong: ["The wind pushes them", "The sun melts them", "Birds shake them"] },
    { q: "What falls from clouds as white flakes in winter? ❄️", a: "Snow", wrong: ["Fog", "Dew", "Steam"] },
    { q: "What do we see in the sky after rain and sunshine together? 🌈", a: "A rainbow", wrong: ["A cloud", "The moon", "A star"] },
    { q: "What tool measures how hot or cold something is? 🌡️", a: "A thermometer", wrong: ["A ruler", "A clock", "A scale"] },
    { q: "Which of these floats on water?", a: "A wooden stick", wrong: ["A metal key", "A stone", "A coin"] },
    { q: "What pulls everything down towards the ground?", a: "Gravity", wrong: ["Wind", "Magnets", "Sunlight"] },
    { q: "What do magnets stick to? 🧲", a: "Some metals like iron", wrong: ["Wood", "Plastic", "Glass"] },
    { q: "Which of these is a source of light? 💡", a: "The Sun", wrong: ["The Moon", "A mirror", "A window"] },
    { q: "Sound travels because something is…?", a: "Vibrating", wrong: ["Melting", "Freezing", "Glowing"] },
    { q: "What do we call the water cycle step where water turns into vapour?", a: "Evaporation", wrong: ["Condensation", "Precipitation", "Collection"] },
  ],
};

const TOPICS = Object.keys(BANK);

function makeQuestion(mode) {
  const topic = mode === "all" ? pick(TOPICS) : mode;
  const entry = pick(BANK[topic]);
  return {
    prompt: entry.q,
    dedupeKey: entry.a + entry.q,
    correctAnswer: entry.a,
    choices: shuffle([entry.a, ...entry.wrong]),
  };
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
  // A single topic can hold fewer than 15 questions — never ask for more
  // than the bank has, or the last few would have to repeat.
  const totalQuestions = mode === "all" ? 15 : Math.min(15, BANK[mode].length);
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
