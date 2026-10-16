/**
 * Tamil flavour on top of KlgGameKit (load assets/js/game-kit.js first):
 * Tamil praise on the finish panel and the "where does the voice come
 * from" notice.
 *
 *   KlgTamilGames.finish / cheer / oops / modeLinks / starsFor  (see game-kit.js)
 *   KlgTamilGames.voiceNote(el)   explains where the audio comes from
 */
(function () {
  "use strict";
  const kit = window.KlgGameKit;
  const PRAISE = ["அருமை! Wonderful!", "நன்று! Well done — keep going!", "Every try helps your brain grow. Play again!"];

  function voiceNote(el) {
    if (!el) return;
    const refresh = () => {
      const tts = window.KlgTamilAudio && KlgTamilAudio.tamilVoice();
      el.textContent = tts
        ? "🎙️ Real Tamil voice recordings, plus this device’s Tamil voice for anything not recorded."
        : "🎙️ Real Tamil voice recordings. A few rare letters are taught by blending their sounds (க் + இ → கி).";
    };
    refresh();
    if ("speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", refresh);
  }

  window.KlgTamilGames = {
    ...kit,
    finish: (options) => kit.finish({ praise: PRAISE, ...options }),
    voiceNote,
  };
})();
