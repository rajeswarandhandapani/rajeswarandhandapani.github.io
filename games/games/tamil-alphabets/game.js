/**
 * Tamil alphabet question generator.
 * Reads ?type=vowels|consonants|uyirmei from the URL to restrict practice to
 * one group of letters; defaults to vowels + consonants. In uyirmei mode an
 * optional ?base=க narrows practice to one consonant's row of 12.
 *
 * Sound mapping notes:
 *  - Vowels use kid-friendly English phonics (ee as in "see", oh as in "go").
 *  - Consonants are the true mei eluthukkal: the pulli (dot) mutes the
 *    inherent "a" vowel, so க் is the pure sound "k" (க without the dot
 *    would be "ka").
 *  - CAPITAL letters mark the retroflex (tongue curled back) sounds:
 *    ண் = N, ள் = L, ற் = R (the strong/trilled r).
 *  - ந் and ன் share the same spoken sound "n" (the difference is where
 *    they appear in a word), so both map to "n" and are never offered as
 *    distractors for each other.
 *  - Uyirmei eluthukkal (compound letters) are generated as consonant base +
 *    Unicode vowel sign (க + ி = கி) and their sound is consonant sound +
 *    vowel sound (கி = "ki"), so the whole 18 × 12 = 216 grid stays
 *    consistent with the two tables above.
 */
const TAMIL_LETTERS = [
  // Uyir eluthukkal (vowels)
  { tamil: "அ", sound: "a", type: "vowels" }, // as in "up"
  { tamil: "ஆ", sound: "aa", type: "vowels" }, // as in "father"
  { tamil: "இ", sound: "i", type: "vowels" }, // as in "sit"
  { tamil: "ஈ", sound: "ee", type: "vowels" }, // as in "see"
  { tamil: "உ", sound: "u", type: "vowels" }, // as in "put"
  { tamil: "ஊ", sound: "oo", type: "vowels" }, // as in "moon"
  { tamil: "எ", sound: "e", type: "vowels" }, // as in "egg"
  { tamil: "ஏ", sound: "ay", type: "vowels" }, // as in "day"
  { tamil: "ஐ", sound: "ai", type: "vowels" }, // as in "eye"
  { tamil: "ஒ", sound: "o", type: "vowels" }, // as in "on"
  { tamil: "ஓ", sound: "oh", type: "vowels" }, // as in "go"
  { tamil: "ஔ", sound: "ow", type: "vowels" }, // as in "cow"
  // Mei eluthukkal (consonants) — pure sounds, no inherent vowel
  { tamil: "க்", sound: "k", type: "consonants" },
  { tamil: "ங்", sound: "ng", type: "consonants" },
  { tamil: "ச்", sound: "ch", type: "consonants" },
  { tamil: "ஞ்", sound: "nj", type: "consonants" },
  { tamil: "ட்", sound: "t", type: "consonants" },
  { tamil: "ண்", sound: "N", type: "consonants" },
  { tamil: "த்", sound: "th", type: "consonants" },
  { tamil: "ந்", sound: "n", type: "consonants" },
  { tamil: "ப்", sound: "p", type: "consonants" },
  { tamil: "ம்", sound: "m", type: "consonants" },
  { tamil: "ய்", sound: "y", type: "consonants" },
  { tamil: "ர்", sound: "r", type: "consonants" },
  { tamil: "ல்", sound: "l", type: "consonants" },
  { tamil: "வ்", sound: "v", type: "consonants" },
  { tamil: "ழ்", sound: "zh", type: "consonants" },
  { tamil: "ள்", sound: "L", type: "consonants" },
  { tamil: "ற்", sound: "R", type: "consonants" },
  { tamil: "ன்", sound: "n", type: "consonants" },
];

// The 12 vowel signs that combine with a consonant base to form uyirmei
// letters. The அ column has no sign — the bare consonant carries the
// inherent "a" (க = "ka").
const VOWEL_SIGNS = [
  { sign: "", sound: "a" }, // அ
  { sign: "ா", sound: "aa" }, // ஆ → ா
  { sign: "ி", sound: "i" }, // இ → ி
  { sign: "ீ", sound: "ee" }, // ஈ → ீ
  { sign: "ு", sound: "u" }, // உ → ு
  { sign: "ூ", sound: "oo" }, // ஊ → ூ
  { sign: "ெ", sound: "e" }, // எ → ெ
  { sign: "ே", sound: "ay" }, // ஏ → ே
  { sign: "ை", sound: "ai" }, // ஐ → ை
  { sign: "ொ", sound: "o" }, // ஒ → ொ
  { sign: "ோ", sound: "oh" }, // ஓ → ோ
  { sign: "ௌ", sound: "ow" }, // ஔ → ௌ
];

const CONSONANT_BASES = [
  { tamil: "க", sound: "k" },
  { tamil: "ங", sound: "ng" },
  { tamil: "ச", sound: "ch" },
  { tamil: "ஞ", sound: "nj" },
  { tamil: "ட", sound: "t" },
  { tamil: "ண", sound: "N" },
  { tamil: "த", sound: "th" },
  { tamil: "ந", sound: "n" },
  { tamil: "ப", sound: "p" },
  { tamil: "ம", sound: "m" },
  { tamil: "ய", sound: "y" },
  { tamil: "ர", sound: "r" },
  { tamil: "ல", sound: "l" },
  { tamil: "வ", sound: "v" },
  { tamil: "ழ", sound: "zh" },
  { tamil: "ள", sound: "L" },
  { tamil: "ற", sound: "R" },
  { tamil: "ன", sound: "n" },
];

// Uyirmei eluthukkal: all 216 consonant + vowel combinations.
const UYIRMEI_LETTERS = CONSONANT_BASES.flatMap((c) =>
  VOWEL_SIGNS.map((v) => ({
    tamil: c.tamil + v.sign,
    sound: c.sound + v.sound,
    type: "uyirmei",
    base: c.tamil,
    vowelSound: v.sound,
  }))
);

function getSelectedLetters() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (type === "vowels" || type === "consonants") {
    return TAMIL_LETTERS.filter((l) => l.type === type);
  }
  if (type === "uyirmei") {
    const base = params.get("base");
    const row = base ? UYIRMEI_LETTERS.filter((l) => l.base === base) : [];
    return row.length ? row : UYIRMEI_LETTERS;
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
    const remaining = letters.filter((l) => !askedSet.has(l.tamil));
    const pool = remaining.length ? remaining : letters;
    const letter = pool[randomInt(0, pool.length - 1)];

    const correctAnswer = letter.sound;
    let distractorPool = letters.filter((l) => l.sound !== correctAnswer);
    // For uyirmei letters, prefer distractors from the same consonant row
    // (கி vs கீ/கை) or the same vowel column (கி vs சி/மி) so wrong choices
    // actually test the vowel signs instead of being obviously different.
    if (letter.base) {
      const related = distractorPool.filter(
        (l) => l.base === letter.base || l.vowelSound === letter.vowelSound
      );
      if (new Set(related.map((l) => l.sound)).size >= 3) {
        distractorPool = related;
      }
    }
    const uniqueSounds = new Set(distractorPool.map((l) => l.sound));
    const choices = new Set([correctAnswer]);
    while (choices.size < 4 && choices.size < uniqueSounds.size + 1) {
      const pick = distractorPool[randomInt(0, distractorPool.length - 1)];
      choices.add(pick.sound);
    }

    return {
      prompt: letter.tamil,
      correctAnswer,
      choices: shuffle([...choices]),
    };
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const letters = getSelectedLetters();
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const base = params.get("base");
  const label =
    type === "vowels"
      ? "Vowels (உயிர் எழுத்துக்கள்)"
      : type === "consonants"
        ? "Consonants (மெய் எழுத்துக்கள்)"
        : type === "uyirmei"
          ? base && letters[0].base === base
            ? `Compound letters (உயிர்மெய்) — the ${base} row`
            : "Compound letters (உயிர்மெய் எழுத்துக்கள்)"
          : "All letters (உயிர் + மெய்)";
  document.getElementById("letters-label").textContent = label;

  // 216 uyirmei letters is too long for one sitting — quiz a random 30.
  const totalQuestions = Math.min(letters.length, 30);
  document.getElementById("question-count-label").textContent =
    totalQuestions < letters.length
      ? `${totalQuestions} random letters out of ${letters.length}`
      : "One question per letter";

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkType = new URLSearchParams(link.getAttribute("href").replace(/^[^?]*\??/, "")).get("type");
    if (linkType === type) {
      link.classList.replace("btn-outline-secondary", "btn-secondary");
    }
  });

  const quiz = new QuizEngine({
    totalQuestions,
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
