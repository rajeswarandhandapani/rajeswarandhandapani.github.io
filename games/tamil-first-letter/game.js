/**
 * First Letter — a picture is shown and its Tamil word is heard; tap the
 * letter the word starts with (யானை → யா).
 *
 *   ?start=vowel   only words that start with an உயிர் letter (அணில், ஆடு…)
 *   ?start=all     (default) every picture word
 *
 * Words with a human recording are preferred so the word is always heard.
 * Distractors are letters that look or sound close: the same consonant with
 * another vowel sign, or another consonant with the same vowel sign.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const startVowel = new URLSearchParams(location.search).get("start") === "vowel";
  const vowelSet = new Set(T.VOWELS.map((v) => v.tamil));

  const words = TAMIL_WORDS
    .map((w) => ({ ...w, first: T.letters(w.tamil)[0] }))
    .filter((w) => T.info(w.first))
    .filter((w) => !startVowel || vowelSet.has(w.first));
  const recorded = words.filter((w) => A.has(w.tamil));
  const pool = recorded.length >= 12 ? recorded : words;

  const soundOf = (letter) => (T.info(letter) || {}).sound || letter;

  function distractors(first, count) {
    const info = T.info(first);
    const out = [];
    const used = new Set([soundOf(first)]);
    const add = (letter) => {
      if (letter && !used.has(soundOf(letter)) && out.length < count) { out.push(letter); used.add(soundOf(letter)); }
    };
    if (info.kind === "vowel") {
      add(info.pair);
      T.shuffle(T.VOWELS).forEach((v) => add(v.tamil));
    } else if (info.kind === "uyirmei") {
      T.shuffle(T.UYIRMEI.filter((u) => u.base === info.base)).slice(0, 1).forEach((u) => add(u.tamil));
      T.shuffle(T.UYIRMEI.filter((u) => u.vowel === info.vowel)).slice(0, 1).forEach((u) => add(u.tamil));
      T.shuffle(words.map((w) => w.first)).forEach(add);
    } else {
      T.shuffle(words.map((w) => w.first)).forEach(add);
    }
    return out;
  }

  function generate(asked) {
    const fresh = pool.filter((w) => !asked.has(w.tamil));
    const word = T.pick(fresh.length ? fresh : pool);
    return {
      prompt: word.emoji,
      reviewPrompt: `${word.emoji} ${word.tamil}`,
      dedupeKey: word.tamil,
      correctAnswer: word.first,
      choices: T.shuffle([word.first, ...distractors(word.first, 3)]),
      explanation: `${word.tamil} (${word.english}) starts with ${word.first}.`,
      speech: true,
      word,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "start", "all");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    question.classList.add("klg-tappable", "quiz-question-xl");
    question.title = "Tap to hear the word again";
    const reveal = document.getElementById("word-reveal");
    let current = null;
    question.addEventListener("click", () => current && A.say(current.word.tamil));

    const quiz = new QuizEngine({
      totalQuestions: 12,
      timePerQuestion: 60,
      generateQuestion: generate,
      onQuestionShown: (q) => {
        current = q;
        reveal.textContent = "";
        A.say(q.word.tamil);
      },
      onAnswered: (q) => {
        reveal.textContent = q.word.tamil;
        A.say(q.word.tamil);
      },
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
