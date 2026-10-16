/**
 * Short or Long? — குறில் (short) and நெடில் (long) sounds.
 *
 *   ?mode=hear (default)  a letter is heard → குறில் or நெடில்?
 *   ?mode=see             a letter is shown → குறில் or நெடில்?
 *   ?mode=pair            a pair like இ / ஈ is shown, one is heard → which?
 *
 * குறில்: அ இ உ எ ஒ. நெடில்: ஆ ஈ ஊ ஏ ஐ ஓ ஔ. Compound letters follow
 * their vowel (கி is குறில், கீ is நெடில்). Heard questions only use
 * letters that have a recording, because a synthetic voice often blurs
 * exactly this length difference.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const mode = ["see", "pair"].includes(new URLSearchParams(location.search).get("mode"))
    ? new URLSearchParams(location.search).get("mode") : "hear";

  const SHORT = "குறில் · short 🐜";
  const LONG = "நெடில் · long 🐍";

  const signFor = (vowel) => T.VOWEL_SIGNS[T.VOWELS.findIndex((v) => v.tamil === vowel)];
  const letters = [
    ...T.VOWELS.map((v) => ({ tamil: v.tamil, short: v.short, pair: v.pair })),
    ...T.UYIRMEI.map((u) => {
      const pairVowel = T.VOWELS.find((v) => v.tamil === u.vowel).pair;
      return { tamil: u.tamil, short: u.short, pair: pairVowel ? u.base + signFor(pairVowel) : null };
    }),
  ];
  const heard = letters.filter((l) => A.has(l.tamil));
  const pairs = heard.filter((l) => l.pair && A.has(l.pair));
  const wanted = mode === "see" ? letters : mode === "pair" ? pairs : heard;
  const pool = wanted.length ? wanted : letters;
  // Always show a pair short-first, so its position never gives the answer away.
  const pairText = (item) => (item.short ? `${item.tamil}  ·  ${item.pair}` : `${item.pair}  ·  ${item.tamil}`);

  function generate(asked) {
    const fresh = pool.filter((l) => !asked.has(l.tamil));
    const item = T.pick(fresh.length ? fresh : pool);
    if (mode === "pair") {
      return {
        prompt: "🔊",
        reviewPrompt: pairText(item),
        dedupeKey: item.tamil,
        correctAnswer: item.tamil,
        choices: T.shuffle([item.tamil, item.pair]),
        explanation: `You heard ${item.tamil} — ${item.short ? "a short sound (குறில்)" : "a long sound (நெடில்)"}.`,
        speech: true,
        item,
      };
    }
    return {
      prompt: mode === "see" ? item.tamil : "🔊",
      reviewPrompt: item.tamil,
      dedupeKey: item.tamil,
      correctAnswer: item.short ? SHORT : LONG,
      choices: [SHORT, LONG],
      noChoiceListen: true,
      explanation: `${item.tamil} is ${item.short ? "குறில் — say it quickly" : "நெடில் — stretch it out"}.`,
      speech: true,
      item,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "mode", "hear");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    question.classList.add("klg-tappable", "quiz-question-xl");
    question.title = "Tap to hear again";
    const reveal = document.getElementById("word-reveal");
    let current = null;
    question.addEventListener("click", () => current && A.say(current.item.tamil));
    document.getElementById("choices-container").classList.toggle("tg-two-choices", mode !== "pair");

    const quiz = new QuizEngine({
      totalQuestions: Math.min(12, pool.length),
      timePerQuestion: 45,
      generateQuestion: generate,
      onQuestionShown: (q) => { current = q; reveal.textContent = mode === "pair" ? pairText(q.item) : ""; A.say(q.item.tamil); },
      onAnswered: (q) => { if (mode === "hear") reveal.textContent = q.item.tamil; A.say(q.item.tamil); },
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
