/**
 * Listen & Find — a Tamil word is said by a real voice; tap its picture.
 * No reading needed, so it suits children who are just starting Tamil.
 *
 *   ?cat=animals|food|nature|body|things|people  (default: every topic)
 *
 * Pictures come from the same topic, so the choice depends on listening,
 * not on guessing the odd one out. Only words that can actually be heard
 * (a recording or a device Tamil voice) are asked.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const cat = new URLSearchParams(location.search).get("cat");
  const topics = ["animals", "food", "nature", "body", "things", "people"];

  const inTopic = TAMIL_WORDS.filter((w) => topics.includes(w.cat) && (!cat || w.cat === cat));
  const recorded = inTopic.filter((w) => A.has(w.tamil));
  const pool = recorded.length >= 6 ? recorded : inTopic;

  function generate(asked) {
    const fresh = pool.filter((w) => !asked.has(w.tamil));
    const word = T.pick(fresh.length ? fresh : pool);
    const sameTopic = TAMIL_WORDS.filter((w) => w.cat === word.cat && w.emoji !== word.emoji);
    const others = T.sample(sameTopic.length >= 3 ? sameTopic : TAMIL_WORDS.filter((w) => w.emoji !== word.emoji), 3);
    const options = T.shuffle([word, ...others]);
    return {
      prompt: "🔊",
      reviewPrompt: word.tamil,
      dedupeKey: word.tamil,
      correctAnswer: word.english,
      choices: options.map((w) => w.english),
      choiceDisplay: Object.fromEntries(options.map((w) => [w.english, w.emoji])),
      choiceLabels: Object.fromEntries(options.map((w) => [w.english, w.english])),
      noChoiceListen: true,
      explanation: `${word.tamil} means ${word.english} ${word.emoji}.`,
      speech: true,
      word,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "cat", "all");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    question.classList.add("klg-tappable", "quiz-question-xl");
    question.title = "Tap to hear the word again";
    const reveal = document.getElementById("word-reveal");
    let current = null;
    question.addEventListener("click", () => current && A.say(current.word.tamil));

    const quiz = new QuizEngine({
      totalQuestions: 10,
      timePerQuestion: 45,
      generateQuestion: generate,
      onQuestionShown: (q) => { current = q; reveal.textContent = ""; A.say(q.word.tamil); },
      onAnswered: (q) => { reveal.textContent = `${q.word.emoji} ${q.word.tamil}`; A.say(q.word.tamil); },
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
