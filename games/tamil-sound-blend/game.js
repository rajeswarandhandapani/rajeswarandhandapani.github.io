/**
 * Sound Blender — how a consonant and a vowel join into an உயிர்மெய் letter.
 *
 *   ?mode=see (default)  க் + இ is shown and heard → tap கி
 *   ?mode=listen         only heard (no letters shown) → tap கி
 *   ?mode=split          கி is shown → tap "க் + இ"
 *
 * ?group=hard|soft|middle limits the consonants to one traditional group
 * (வல்லினம் / மெல்லினம் / இடையினம்).
 *
 * Distractors share the consonant (கி vs கீ/கு) or the vowel (கி vs சி/மி),
 * so children have to notice the vowel sign. ந/ன share a sound, so a
 * distractor never sounds the same as the answer.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const params = new URLSearchParams(location.search);
  const mode = ["listen", "split"].includes(params.get("mode")) ? params.get("mode") : "see";
  const group = params.get("group");

  const pool = T.UYIRMEI.filter((u) => {
    const c = T.CONSONANTS.find((x) => x.base === u.base);
    return !group || c.group === group;
  });

  function distractors(answer, count) {
    const sameBase = pool.filter((u) => u.base === answer.base && u.sound !== answer.sound);
    const sameVowel = pool.filter((u) => u.vowel === answer.vowel && u.sound !== answer.sound);
    const partnerVowel = (T.VOWELS.find((v) => v.tamil === answer.vowel) || {}).pair;
    const out = [];
    const used = new Set([answer.sound]);
    const add = (u) => { if (u && !used.has(u.sound) && out.length < count) { out.push(u); used.add(u.sound); } };
    add(sameBase.find((u) => u.vowel === partnerVowel));
    T.shuffle(sameBase).slice(0, 1).forEach(add);
    T.shuffle(sameVowel).slice(0, 1).forEach(add);
    T.shuffle(pool).forEach(add);
    return out;
  }

  function generate(asked) {
    const fresh = pool.filter((u) => !asked.has(u.tamil));
    const answer = T.pick(fresh.length ? fresh : pool);
    const others = distractors(answer, 3);
    const recipe = (u) => `${u.mei} + ${u.vowel}`;
    if (mode === "split") {
      return {
        prompt: answer.tamil,
        dedupeKey: answer.tamil,
        correctAnswer: recipe(answer),
        choices: T.shuffle([answer, ...others].map(recipe)),
        explanation: `${answer.tamil} = ${recipe(answer)} (${answer.sound}).`,
        speech: true,
        item: answer,
      };
    }
    return {
      prompt: mode === "listen" ? "🔊" : `${recipe(answer)} = ?`,
      reviewPrompt: recipe(answer),
      dedupeKey: answer.tamil,
      correctAnswer: answer.tamil,
      choices: T.shuffle([answer, ...others].map((u) => u.tamil)),
      explanation: `${recipe(answer)} = ${answer.tamil} (${answer.sound}).`,
      speech: true,
      item: answer,
    };
  }

  function hearParts(item) {
    if (mode === "split") A.say(item.tamil);
    else A.sequence([item.mei, item.vowel], 450);
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks(document.getElementById("mode-links"), "mode", "see");
    KlgTamilGames.voiceNote(document.getElementById("voice-note"));
    const question = document.getElementById("question-text");
    question.classList.add("klg-tappable");
    question.title = "Tap to hear again";
    question.classList.add(mode === "listen" ? "quiz-question-xl" : "tg-sequence-prompt");
    let current = null;
    question.addEventListener("click", () => current && hearParts(current.item));

    const quiz = new QuizEngine({
      totalQuestions: 12,
      timePerQuestion: 60,
      generateQuestion: generate,
      onQuestionShown: (q) => { current = q; hearParts(q.item); },
      onAnswered: (q) => A.say(q.item.tamil),
    });
    const start = () => { if (window.KlgSounds) KlgSounds.click(); document.getElementById("start-screen").classList.add("d-none"); quiz.start(); };
    document.getElementById("start-btn").addEventListener("click", start);
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
