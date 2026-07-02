/**
 * Tamil alphabet question generator.
 * Reads ?type=vowels|consonants from the URL to restrict practice to one
 * group of letters; defaults to the full set (vowels + consonants).
 */
const TAMIL_LETTERS = [
  // Uyir eluthukkal (vowels)
  { tamil: "அ", sound: "a", type: "vowels" },
  { tamil: "ஆ", sound: "aa", type: "vowels" },
  { tamil: "இ", sound: "i", type: "vowels" },
  { tamil: "ஈ", sound: "ii", type: "vowels" },
  { tamil: "உ", sound: "u", type: "vowels" },
  { tamil: "ஊ", sound: "uu", type: "vowels" },
  { tamil: "எ", sound: "e", type: "vowels" },
  { tamil: "ஏ", sound: "ee", type: "vowels" },
  { tamil: "ஐ", sound: "ai", type: "vowels" },
  { tamil: "ஒ", sound: "o", type: "vowels" },
  { tamil: "ஓ", sound: "oo", type: "vowels" },
  { tamil: "ஔ", sound: "au", type: "vowels" },
  // Mei eluthukkal (consonants)
  { tamil: "க்", sound: "ka", type: "consonants" },
  { tamil: "ங்", sound: "nga", type: "consonants" },
  { tamil: "ச்", sound: "cha", type: "consonants" },
  { tamil: "ஞ்", sound: "nya", type: "consonants" },
  { tamil: "ட்", sound: "ta", type: "consonants" },
  { tamil: "ண்", sound: "Na", type: "consonants" },
  { tamil: "த்", sound: "tha", type: "consonants" },
  { tamil: "ந்", sound: "na", type: "consonants" },
  { tamil: "ப்", sound: "pa", type: "consonants" },
  { tamil: "ம்", sound: "ma", type: "consonants" },
  { tamil: "ய்", sound: "ya", type: "consonants" },
  { tamil: "ர்", sound: "ra", type: "consonants" },
  { tamil: "ல்", sound: "la", type: "consonants" },
  { tamil: "வ்", sound: "va", type: "consonants" },
  { tamil: "ழ்", sound: "zha", type: "consonants" },
  { tamil: "ள்", sound: "La", type: "consonants" },
  { tamil: "ற்", sound: "Ra", type: "consonants" },
  { tamil: "ன்", sound: "nna", type: "consonants" },
];

function getSelectedLetters() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (type === "vowels" || type === "consonants") {
    return TAMIL_LETTERS.filter((l) => l.type === type);
  }
  return TAMIL_LETTERS;
}

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

function generateTamilQuestion(letters) {
  return (askedSet) => {
    const letter = letters[randomInt(0, letters.length - 1)];
    const prompt = letter.tamil;
    if (askedSet.has(prompt)) {
      return generateTamilQuestion(letters)(askedSet);
    }

    const correctAnswer = letter.sound;
    const distractorPool = letters.filter((l) => l.sound !== correctAnswer);
    const choices = new Set([correctAnswer]);
    while (choices.size < 4 && choices.size < distractorPool.length + 1) {
      const pick = distractorPool[randomInt(0, distractorPool.length - 1)];
      choices.add(pick.sound);
    }

    return {
      prompt,
      correctAnswer,
      choices: shuffle([...choices]),
    };
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const letters = getSelectedLetters();
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const label =
    type === "vowels" ? "Vowels (உயிர் எழுத்துக்கள்)" : type === "consonants" ? "Consonants (மெய் எழுத்துக்கள்)" : "All letters (உயிர் + மெய்)";
  document.getElementById("letters-label").textContent = label;

  const quiz = new QuizEngine({
    totalQuestions: letters.length,
    timePerQuestion: 10,
    generateQuestion: generateTamilQuestion(letters),
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("start-screen").classList.add("d-none");
    quiz.start();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    quiz.start();
  });
});
