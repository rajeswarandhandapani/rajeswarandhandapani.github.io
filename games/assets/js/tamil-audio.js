/**
 * KlgTamilAudio — says Tamil letters and words with human recordings.
 *
 * Load after tamil-audio-manifest.js (and tamil-kit.js for blending):
 *
 *   KlgTamilAudio.say(text)       → Promise<boolean>  best available voice
 *   KlgTamilAudio.play(text)      → Promise<boolean>  recording only
 *   KlgTamilAudio.blend(letter)   → Promise<boolean>  க் … இ … கி
 *   KlgTamilAudio.has(text)       recording exists?
 *   KlgTamilAudio.canSay(text)    recording, blend or device Tamil voice?
 *   KlgTamilAudio.stop()
 *   KlgTamilAudio.button(text, { label, className })  ready-made 🔊 button
 *
 * say() prefers a recording. A compound letter without its own recording is
 * blended from its consonant and vowel recordings (the way children are
 * taught: க் + இ = கி), then the whole letter follows from the device's
 * Tamil voice if there is one. Anything else falls back to the device's
 * Tamil voice, and resolves false when nothing can speak.
 *
 * Every call cancels whatever was playing, so rapid taps never overlap.
 */
(function () {
  "use strict";
  const manifest = window.KLG_TAMIL_AUDIO || {};
  const script = document.currentScript;
  const base = new URL("../audio/tamil/", script ? script.src : location.href).href;
  const hasSpeech = "speechSynthesis" in window;
  if (hasSpeech) speechSynthesis.getVoices();

  let generation = 0;
  let audio = null;
  const cache = new Map();

  const norm = (t) => String(t).normalize("NFC").trim();
  const has = (text) => Object.prototype.hasOwnProperty.call(manifest, norm(text));
  const urlFor = (text) => base + manifest[norm(text)] + ".mp3";

  function tamilVoice() {
    if (!hasSpeech) return null;
    return speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("ta")) || null;
  }

  function preload(texts) {
    [].concat(texts).forEach((t) => {
      if (!has(t) || cache.has(norm(t))) return;
      const a = new Audio();
      a.preload = "auto";
      a.src = urlFor(t);
      cache.set(norm(t), a);
    });
  }

  function stop() {
    generation += 1;
    if (audio) { audio.pause(); audio = null; }
    if (hasSpeech) speechSynthesis.cancel();
    document.dispatchEvent(new CustomEvent("klg-tamil-audio", { detail: { playing: false } }));
  }

  function playOne(text, token) {
    return new Promise((resolve) => {
      if (token !== generation || !has(text)) return resolve(false);
      const a = cache.get(norm(text)) || new Audio(urlFor(text));
      cache.set(norm(text), a);
      audio = a;
      a.currentTime = 0;
      let settled = false;
      const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
      a.onended = () => done(true);
      a.onerror = () => done(false);
      // A natural end fires "pause" just before "ended".
      a.onpause = () => done(a.ended);
      const p = a.play();
      if (p && p.catch) p.catch(() => done(false));
    });
  }

  function ttsOne(text, token) {
    return new Promise((resolve) => {
      const voice = tamilVoice();
      if (token !== generation || !voice) return resolve(false);
      const u = new SpeechSynthesisUtterance(norm(text));
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.75;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    });
  }

  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  async function run(fn) {
    stop();
    const token = generation;
    document.dispatchEvent(new CustomEvent("klg-tamil-audio", { detail: { playing: true } }));
    try {
      return await fn(token);
    } finally {
      if (token === generation) document.dispatchEvent(new CustomEvent("klg-tamil-audio", { detail: { playing: false } }));
    }
  }

  function play(text) {
    return run((token) => playOne(text, token));
  }

  async function blendSteps(letter, token) {
    const kit = window.KlgTamil;
    const parts = kit && kit.parts(letter);
    if (!parts || !parts.mei || !has(parts.mei) || !has(parts.vowel)) return false;
    await playOne(parts.mei, token);
    await pause(250);
    if (token !== generation) return false;
    await playOne(parts.vowel, token);
    await pause(350);
    if (token !== generation) return false;
    if (has(letter)) return playOne(letter, token);
    await ttsOne(letter, token);
    return true;
  }

  function blend(letter) {
    return run((token) => blendSteps(letter, token));
  }

  /** One text, best voice first: recording → blend of recorded parts → device voice. */
  async function sayStep(text, token) {
    if (has(text)) return playOne(text, token);
    const kit = window.KlgTamil;
    const info = kit && kit.info(text);
    if (info && info.kind === "uyirmei" && (await blendSteps(norm(text), token))) return true;
    return ttsOne(text, token);
  }

  function say(text) {
    return run((token) => sayStep(text, token));
  }

  /** Plays several texts in a row (e.g. a whole row of the chart). */
  function sequence(texts, gap = 350) {
    return run(async (token) => {
      for (const t of texts) {
        if (token !== generation) return false;
        await sayStep(t, token);
        await pause(gap);
      }
      return true;
    });
  }

  function canSay(text) {
    if (has(text)) return true;
    const kit = window.KlgTamil;
    const parts = kit && kit.parts(text);
    if (parts && parts.mei && has(parts.mei) && has(parts.vowel)) return true;
    return !!tamilVoice();
  }

  function button(text, options = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = options.className || "klg-say-btn";
    btn.textContent = options.icon || "🔊";
    btn.setAttribute("aria-label", options.label || "Hear " + text);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      say(typeof text === "function" ? text() : text);
    });
    return btn;
  }

  window.KlgTamilAudio = { say, play, blend, sequence, has, canSay, stop, preload, button, tamilVoice };
})();
