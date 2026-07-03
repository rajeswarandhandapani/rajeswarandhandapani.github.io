/**
 * Tamil word builder question generator.
 * Shows a word from the shared vocabulary with one letter blanked out plus
 * its emoji as a hint (யா__னை 🐘) — pick the missing letter. Bridges the
 * alphabets quiz (letter sounds) and the words quiz (whole words).
 *
 * Words are split into letter clusters in code: a cluster is a base letter
 * plus any combining marks (vowel signs ா ி ீ … and the pulli ்), so
 * தேங்காய் splits into தே / ங் / கா / ய். The blanked cluster is the answer.
 *
 * Distractors are real clusters taken from the rest of the vocabulary,
 * preferring ones that share the answer's base consonant (யா vs யி vs யூ)
 * or its vowel sign (யா vs கா vs மா) — so the quiz genuinely tests the
 * vowel signs, just like the compound-letter alphabet quiz. A distractor is
 * never allowed to complete a *different* word from the vocabulary (no
 * மா__ where both டு and ன் would make a real word).
 *
 * Requires assets/js/tamil-words-data.js (TAMIL_WORDS) loaded first.
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

// Tamil combining marks: vowel signs (U+0BBE–U+0BCC) and pulli (U+0BCD).
const TAMIL_MARK = /[ா-்]/;

function splitClusters(word) {
  const clusters = [];
  for (const ch of word) {
    if (TAMIL_MARK.test(ch) && clusters.length) {
      clusters[clusters.length - 1] += ch;
    } else {
      clusters.push(ch);
    }
  }
  return clusters;
}

// One-cluster words (பூ, கை) have nothing to blank out.
const BUILDER_WORDS = TAMIL_WORDS.map((w) => ({
  ...w,
  clusters: splitClusters(w.tamil),
})).filter((w) => w.clusters.length >= 2);

const ALL_CLUSTERS = [...new Set(BUILDER_WORDS.flatMap((w) => w.clusters))];
const WORD_SET = new Set(TAMIL_WORDS.map((w) => w.tamil));

function makeBuilderQuestion() {
  const word = BUILDER_WORDS[randomInt(0, BUILDER_WORDS.length - 1)];
  const blankIndex = randomInt(0, word.clusters.length - 1);
  const answer = word.clusters[blankIndex];
  const blanked = word.clusters
    .map((c, i) => (i === blankIndex ? "__" : c))
    .join("");

  const rebuiltWith = (cluster) =>
    word.clusters.map((c, i) => (i === blankIndex ? cluster : c)).join("");
  const pool = ALL_CLUSTERS.filter(
    (c) => c !== answer && !WORD_SET.has(rebuiltWith(c))
  );
  const related = pool.filter(
    (c) => c[0] === answer[0] || c.slice(1) === answer.slice(1)
  );
  const wrongs = shuffle(related.length >= 3 ? related : pool).slice(0, 3);

  return {
    prompt: `${blanked} ${word.emoji}`,
    correctAnswer: answer,
    choices: shuffle([answer, ...wrongs]),
  };
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
  const totalQuestions = 20;
  const storageKey = "klg-wordbuilder-best-ms";

  document.getElementById("mode-label").textContent =
    `Fill in the missing letter — ${BUILDER_WORDS.length} words to build`;

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
    generateQuestion: makeBuilderQuestion,
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
