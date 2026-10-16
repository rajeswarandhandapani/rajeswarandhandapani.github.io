/**
 * What Comes Next? — learn the order of the Tamil alphabet.
 *
 *   ?set=vowels (default)  அ ஆ இ ? → ஈ
 *   ?set=consonants        க் ங் ச் ? → ஞ்
 *   ?set=rows              a compound row: க கா கி ? → கீ (any consonant)
 *
 * Three letters in a row are shown and heard, with a gap either at the end
 * or in the middle. Wrong choices come from the same list, close to the gap,
 * so children have to know the order, not just recognise the letters.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const raw = new URLSearchParams(location.search).get("set");
  const set = ["consonants", "rows"].includes(raw) ? raw : "vowels";

  function sequenceFor() {
    if (set === "vowels") return T.VOWELS.map((v) => v.tamil);
    if (set === "consonants") return T.CONSONANTS.map((c) => c.tamil);
    const base = T.pick(T.CONSONANTS).base;
    return T.UYIRMEI.filter((u) => u.base === base).map((u) => u.tamil);
  }

  function generate(asked) {
    let list, start, gap, key;
    let tries = 0;
    do {
      list = sequenceFor();
      start = Math.floor(Math.random() * (list.length - 3));
      gap = Math.random() < 0.6 ? 3 : 1 + Math.floor(Math.random() * 2);
      key = list[start + gap];
      tries += 1;
    } while (asked.has(key) && tries < 30);
    const window4 = list.slice(start, start + 4);
    const answer = window4[gap];
    const shown = window4.map((l, i) => (i === gap ? "?" : l));
    const nearby = list
      .map((l, i) => ({ l, d: Math.abs(i - (start + gap)) }))
      .filter((x) => x.l !== answer && !window4.includes(x.l))
      .sort((a, b) => a.d - b.d || Math.random() - 0.5)
      .slice(0, 5)
      .map((x) => x.l);
    // A nearby letter already in view is a tempting (and fair) distractor.
    const visible = window4.filter((l, i) => i !== gap);
    const distractors = T.shuffle([...T.sample(nearby, 2), T.pick(visible)]);
    return {
      prompt: shown.join("  "),
      dedupeKey: answer,
      correctAnswer: answer,
      choices: T.shuffle([answer, ...distractors]),
      explanation: `${window4.join(" ")} — ${answer} fills the gap.`,
      speech: true,
      shownLetters: window4.filter((l, i) => i !== gap),
      full: window4,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "set", "vowels");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    question.classList.add("klg-tappable", "tg-sequence-prompt");
    question.title = "Tap to hear the letters";
    let current = null;
    question.addEventListener("click", () => current && A.sequence(current.shownLetters, 300));

    const quiz = new QuizEngine({
      totalQuestions: 10,
      timePerQuestion: 60,
      generateQuestion: generate,
      onQuestionShown: (q) => { current = q; A.sequence(q.shownLetters, 300); },
      onAnswered: (q) => { question.textContent = q.full.join("  "); A.sequence(q.full, 250); },
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
