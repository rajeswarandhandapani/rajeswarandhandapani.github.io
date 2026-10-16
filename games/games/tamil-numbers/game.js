/**
 * Tamil Numbers — ஒன்று to பத்து, with real voice recordings.
 *
 *   ?mode=count (default)  count the pictures → tap the Tamil number word
 *   ?mode=listen           hear a Tamil number → tap the digit
 *   ?mode=numerals         see a Tamil numeral (௩) → tap the digit
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const raw = new URLSearchParams(location.search).get("mode");
  const mode = ["listen", "numerals"].includes(raw) ? raw : "count";
  const THINGS = ["🍎", "🐟", "⭐", "🌸", "🐘", "🥭", "🎈", "🐥", "🍌", "🦋"];

  function near(n, count) {
    const options = T.NUMBERS.filter((x) => x.value !== n.value)
      .sort((a, b) => Math.abs(a.value - n.value) - Math.abs(b.value - n.value) || Math.random() - 0.5);
    return T.shuffle(options.slice(0, count + 2)).slice(0, count);
  }

  function generate(asked) {
    const fresh = T.NUMBERS.filter((n) => !asked.has(String(n.value)));
    const n = T.pick(fresh.length ? fresh : T.NUMBERS);
    const options = T.shuffle([n, ...near(n, 3)]);
    const base = { dedupeKey: String(n.value), speech: true, number: n, explanation: `${n.value} = ${n.tamil} (${n.numeral}).` };
    if (mode === "count") {
      const thing = T.pick(THINGS);
      return {
        ...base,
        prompt: Array(n.value).fill(thing).join(" "),
        reviewPrompt: `${n.value} ${thing}`,
        correctAnswer: n.tamil,
        choices: options.map((o) => o.tamil),
      };
    }
    return {
      ...base,
      prompt: mode === "listen" ? "🔊" : n.numeral,
      reviewPrompt: mode === "listen" ? n.tamil : n.numeral,
      correctAnswer: String(n.value),
      choices: options.map((o) => String(o.value)),
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "mode", "count");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    if (mode === "count") {
      question.classList.add("tg-count-prompt");
      document.getElementById("choices-container").classList.add("tg-word-choices");
    } else {
      question.classList.add("quiz-question-xl");
    }
    if (mode === "listen") {
      question.classList.add("klg-tappable");
      question.title = "Tap to hear again";
    }
    const reveal = document.getElementById("word-reveal");
    let current = null;
    question.addEventListener("click", () => current && A.say(current.number.tamil));

    const quiz = new QuizEngine({
      totalQuestions: 10,
      timePerQuestion: 45,
      generateQuestion: generate,
      onQuestionShown: (q) => {
        current = q;
        reveal.textContent = "";
        if (mode === "listen") A.say(q.number.tamil);
      },
      onAnswered: (q) => {
        reveal.textContent = `${q.number.value} · ${q.number.tamil} · ${q.number.numeral}`;
        A.say(q.number.tamil);
      },
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
