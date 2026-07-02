/**
 * Tamil words question generator — the next step after the alphabets quiz.
 * Reads ?type=picture|meaning from the URL; defaults to a mix of both.
 *
 * Question kinds:
 *  - picture: an emoji as the prompt, pick the matching Tamil word (🐘 → யானை)
 *  - meaning: a Tamil word as the prompt, pick its English meaning
 *
 * Wrong choices are drawn from the same category (an animal's distractors
 * are other animals), so the quiz tests real word recognition instead of
 * "which of these is even an animal".
 */
const TAMIL_WORDS = [
  // Animals
  { tamil: "யானை", english: "elephant", emoji: "🐘", cat: "animals" },
  { tamil: "சிங்கம்", english: "lion", emoji: "🦁", cat: "animals" },
  { tamil: "புலி", english: "tiger", emoji: "🐯", cat: "animals" },
  { tamil: "நாய்", english: "dog", emoji: "🐶", cat: "animals" },
  { tamil: "பூனை", english: "cat", emoji: "🐱", cat: "animals" },
  { tamil: "மாடு", english: "cow", emoji: "🐄", cat: "animals" },
  { tamil: "குதிரை", english: "horse", emoji: "🐴", cat: "animals" },
  { tamil: "ஆடு", english: "goat", emoji: "🐐", cat: "animals" },
  { tamil: "பன்றி", english: "pig", emoji: "🐷", cat: "animals" },
  { tamil: "குரங்கு", english: "monkey", emoji: "🐵", cat: "animals" },
  { tamil: "கரடி", english: "bear", emoji: "🐻", cat: "animals" },
  { tamil: "முயல்", english: "rabbit", emoji: "🐰", cat: "animals" },
  { tamil: "எலி", english: "mouse", emoji: "🐭", cat: "animals" },
  { tamil: "மான்", english: "deer", emoji: "🦌", cat: "animals" },
  { tamil: "ஒட்டகம்", english: "camel", emoji: "🐫", cat: "animals" },
  { tamil: "பாம்பு", english: "snake", emoji: "🐍", cat: "animals" },
  { tamil: "தவளை", english: "frog", emoji: "🐸", cat: "animals" },
  { tamil: "ஆமை", english: "turtle", emoji: "🐢", cat: "animals" },
  { tamil: "மீன்", english: "fish", emoji: "🐟", cat: "animals" },
  { tamil: "நண்டு", english: "crab", emoji: "🦀", cat: "animals" },
  { tamil: "திமிங்கலம்", english: "whale", emoji: "🐳", cat: "animals" },
  { tamil: "கோழி", english: "hen", emoji: "🐔", cat: "animals" },
  { tamil: "வாத்து", english: "duck", emoji: "🦆", cat: "animals" },
  { tamil: "ஆந்தை", english: "owl", emoji: "🦉", cat: "animals" },
  { tamil: "மயில்", english: "peacock", emoji: "🦚", cat: "animals" },
  { tamil: "கிளி", english: "parrot", emoji: "🦜", cat: "animals" },
  { tamil: "வண்ணத்துப்பூச்சி", english: "butterfly", emoji: "🦋", cat: "animals" },
  { tamil: "தேனீ", english: "bee", emoji: "🐝", cat: "animals" },
  { tamil: "எறும்பு", english: "ant", emoji: "🐜", cat: "animals" },
  { tamil: "சிலந்தி", english: "spider", emoji: "🕷️", cat: "animals" },
  // Food
  { tamil: "மாம்பழம்", english: "mango", emoji: "🥭", cat: "food" },
  { tamil: "வாழைப்பழம்", english: "banana", emoji: "🍌", cat: "food" },
  { tamil: "ஆப்பிள்", english: "apple", emoji: "🍎", cat: "food" },
  { tamil: "திராட்சை", english: "grapes", emoji: "🍇", cat: "food" },
  { tamil: "தர்பூசணி", english: "watermelon", emoji: "🍉", cat: "food" },
  { tamil: "அன்னாசி", english: "pineapple", emoji: "🍍", cat: "food" },
  { tamil: "தேங்காய்", english: "coconut", emoji: "🥥", cat: "food" },
  { tamil: "எலுமிச்சை", english: "lemon", emoji: "🍋", cat: "food" },
  { tamil: "தக்காளி", english: "tomato", emoji: "🍅", cat: "food" },
  { tamil: "உருளைக்கிழங்கு", english: "potato", emoji: "🥔", cat: "food" },
  { tamil: "கேரட்", english: "carrot", emoji: "🥕", cat: "food" },
  { tamil: "சோளம்", english: "corn", emoji: "🌽", cat: "food" },
  { tamil: "மிளகாய்", english: "chilli", emoji: "🌶️", cat: "food" },
  { tamil: "வெங்காயம்", english: "onion", emoji: "🧅", cat: "food" },
  { tamil: "பால்", english: "milk", emoji: "🥛", cat: "food" },
  { tamil: "முட்டை", english: "egg", emoji: "🥚", cat: "food" },
  { tamil: "சோறு", english: "rice", emoji: "🍚", cat: "food" },
  { tamil: "தண்ணீர்", english: "water", emoji: "💧", cat: "food" },
  // Nature
  { tamil: "சூரியன்", english: "sun", emoji: "☀️", cat: "nature" },
  { tamil: "நிலா", english: "moon", emoji: "🌙", cat: "nature" },
  { tamil: "நட்சத்திரம்", english: "star", emoji: "⭐", cat: "nature" },
  { tamil: "மேகம்", english: "cloud", emoji: "☁️", cat: "nature" },
  { tamil: "மழை", english: "rain", emoji: "🌧️", cat: "nature" },
  { tamil: "மின்னல்", english: "lightning", emoji: "⚡", cat: "nature" },
  { tamil: "வானவில்", english: "rainbow", emoji: "🌈", cat: "nature" },
  { tamil: "மரம்", english: "tree", emoji: "🌳", cat: "nature" },
  { tamil: "இலை", english: "leaf", emoji: "🍃", cat: "nature" },
  { tamil: "பூ", english: "flower", emoji: "🌸", cat: "nature" },
  { tamil: "மலை", english: "mountain", emoji: "⛰️", cat: "nature" },
  { tamil: "கடல்", english: "sea", emoji: "🌊", cat: "nature" },
  { tamil: "நெருப்பு", english: "fire", emoji: "🔥", cat: "nature" },
  { tamil: "பனி", english: "snow", emoji: "❄️", cat: "nature" },
  // Body
  { tamil: "கண்", english: "eye", emoji: "👁️", cat: "body" },
  { tamil: "காது", english: "ear", emoji: "👂", cat: "body" },
  { tamil: "மூக்கு", english: "nose", emoji: "👃", cat: "body" },
  { tamil: "வாய்", english: "mouth", emoji: "👄", cat: "body" },
  { tamil: "நாக்கு", english: "tongue", emoji: "👅", cat: "body" },
  { tamil: "பல்", english: "tooth", emoji: "🦷", cat: "body" },
  { tamil: "கை", english: "hand", emoji: "✋", cat: "body" },
  { tamil: "கால்", english: "foot", emoji: "🦶", cat: "body" },
  // Things
  { tamil: "வீடு", english: "house", emoji: "🏠", cat: "things" },
  { tamil: "புத்தகம்", english: "book", emoji: "📖", cat: "things" },
  { tamil: "பந்து", english: "ball", emoji: "⚽", cat: "things" },
  { tamil: "மிதிவண்டி", english: "bicycle", emoji: "🚲", cat: "things" },
  { tamil: "பேருந்து", english: "bus", emoji: "🚌", cat: "things" },
  { tamil: "ரயில்", english: "train", emoji: "🚂", cat: "things" },
  { tamil: "விமானம்", english: "airplane", emoji: "✈️", cat: "things" },
  { tamil: "கப்பல்", english: "ship", emoji: "🚢", cat: "things" },
  { tamil: "குடை", english: "umbrella", emoji: "☂️", cat: "things" },
  { tamil: "சாவி", english: "key", emoji: "🔑", cat: "things" },
  { tamil: "கடிகாரம்", english: "clock", emoji: "⏰", cat: "things" },
  { tamil: "நாற்காலி", english: "chair", emoji: "🪑", cat: "things" },
  { tamil: "கத்தரிக்கோல்", english: "scissors", emoji: "✂️", cat: "things" },
  // People
  { tamil: "அம்மா", english: "mother", emoji: "👩", cat: "people" },
  { tamil: "அப்பா", english: "father", emoji: "👨", cat: "people" },
  { tamil: "குழந்தை", english: "baby", emoji: "👶", cat: "people" },
  { tamil: "தாத்தா", english: "grandfather", emoji: "👴", cat: "people" },
  { tamil: "பாட்டி", english: "grandmother", emoji: "👵", cat: "people" },
  { tamil: "சிறுவன்", english: "boy", emoji: "👦", cat: "people" },
  { tamil: "சிறுமி", english: "girl", emoji: "👧", cat: "people" },
  // Colors
  { tamil: "சிவப்பு", english: "red", emoji: "🔴", cat: "colors" },
  { tamil: "பச்சை", english: "green", emoji: "🟢", cat: "colors" },
  { tamil: "நீலம்", english: "blue", emoji: "🔵", cat: "colors" },
  { tamil: "மஞ்சள்", english: "yellow", emoji: "🟡", cat: "colors" },
  { tamil: "கருப்பு", english: "black", emoji: "⚫", cat: "colors" },
  { tamil: "வெள்ளை", english: "white", emoji: "⚪", cat: "colors" },
];

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

/** Pick a word plus 3 same-category distractors. */
function pickWordAndDistractors() {
  const word = TAMIL_WORDS[randomInt(0, TAMIL_WORDS.length - 1)];
  const sameCat = TAMIL_WORDS.filter((w) => w.cat === word.cat && w !== word);
  return { word, distractors: shuffle(sameCat).slice(0, 3) };
}

function makePictureQuestion() {
  const { word, distractors } = pickWordAndDistractors();
  return {
    prompt: word.emoji,
    correctAnswer: word.tamil,
    choices: shuffle([word, ...distractors].map((w) => w.tamil)),
    kind: "picture",
  };
}

function makeMeaningQuestion() {
  const { word, distractors } = pickWordAndDistractors();
  return {
    prompt: word.tamil,
    correctAnswer: word.english,
    choices: shuffle([word, ...distractors].map((w) => w.english)),
    kind: "meaning",
  };
}

const QUESTION_KINDS = {
  picture: [makePictureQuestion],
  meaning: [makeMeaningQuestion],
};
QUESTION_KINDS.all = [...QUESTION_KINDS.picture, ...QUESTION_KINDS.meaning];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "picture" || type === "meaning" ? type : "all";
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
  const totalQuestions = 20;
  const storageKey = "klg-tamilwords-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];
  const questionText = document.getElementById("question-text");
  const choicesContainer = document.getElementById("choices-container");

  const labels = {
    all: `Pictures + meanings, ${TAMIL_WORDS.length} everyday words`,
    picture: "Match the picture to the Tamil word",
    meaning: "Match the Tamil word to its meaning",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkType = new URLSearchParams(
      link.getAttribute("href").replace(/^[^?]*\??/, "")
    ).get("type");
    if ((linkType || "all") === mode) {
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
    timePerQuestion: 10,
    generateQuestion: () => {
      const q = kinds[randomInt(0, kinds.length - 1)]();
      // Emoji prompts render huge with Tamil choices; Tamil-word prompts
      // use the Tamil font with English choices.
      questionText.classList.toggle("quiz-question-xl", q.kind === "picture");
      questionText.classList.toggle("tamil-word", q.kind === "meaning");
      choicesContainer.classList.toggle("tamil-glyph", q.kind === "picture");
      return q;
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
