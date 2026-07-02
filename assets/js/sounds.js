/**
 * KlgSounds — shared sound effects for Kid Learning Games.
 *
 * All effects are synthesized with the Web Audio API (no audio files).
 * Exposes window.KlgSounds with:
 *   click(), correct(streak), wrong(), timeUp(), tick(), fanfare(), newRecord()
 *   isMuted(), setMuted(muted), toggleMuted()
 *
 * A mute button (🔊/🔇) is injected bottom-right on every page that loads
 * this script; the preference persists in localStorage ("klg-muted").
 * Every function is a silent no-op when audio is unavailable or muted,
 * so games work unchanged without sound.
 */
(function () {
  "use strict";

  var MUTE_KEY = "klg-muted";
  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  var ctx = null;
  var masterGain = null;
  var muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch (e) {
    /* private mode / storage blocked — default to sound on */
  }

  function ensureCtx() {
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.35;
        masterGain.connect(ctx.destination);
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  // Unlock audio on the first user gesture (browser autoplay policy).
  function unlock() {
    ensureCtx();
  }
  document.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("keydown", unlock, { once: true, capture: true });

  /**
   * Play one enveloped oscillator note.
   * opts: { type, at (s from now), dur (s), vol (0-1), glideTo (Hz) }
   */
  function tone(freq, opts) {
    if (muted || !ensureCtx()) return;
    opts = opts || {};
    var type = opts.type || "sine";
    var at = opts.at || 0;
    var dur = opts.dur || 0.12;
    var vol = opts.vol || 0.5;
    var t0 = ctx.currentTime + at;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  var KlgSounds = {
    isMuted: function () {
      return muted;
    },

    setMuted: function (value) {
      muted = !!value;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch (e) {
        /* ignore */
      }
      var btn = document.getElementById("klg-mute-btn");
      if (btn) {
        btn.textContent = muted ? "🔇" : "🔊";
        btn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
      }
    },

    toggleMuted: function () {
      KlgSounds.setMuted(!muted);
      return muted;
    },

    /** Soft UI tap. */
    click: function () {
      tone(600, { type: "triangle", dur: 0.04, vol: 0.15 });
    },

    /** Rising chime; longer streaks add extra notes so they sound better. */
    correct: function (streak) {
      streak = streak || 1;
      tone(523, { dur: 0.11, vol: 0.5 }); // C5
      tone(659, { at: 0.09, dur: 0.11, vol: 0.5 }); // E5
      if (streak >= 3) tone(784, { at: 0.18, dur: 0.11, vol: 0.5 }); // G5
      if (streak >= 5) tone(1047, { at: 0.27, dur: 0.11, vol: 0.5 }); // C6
    },

    /** Gentle, quiet buzz — never harsh for kids. */
    wrong: function () {
      tone(200, { type: "sawtooth", dur: 0.3, vol: 0.12, glideTo: 130 });
    },

    /** Sad descending slide when the timer runs out. */
    timeUp: function () {
      tone(440, { type: "triangle", dur: 0.5, vol: 0.2, glideTo: 180 });
    },

    /** Urgency blip for the last seconds of the timer. */
    tick: function () {
      tone(950, { type: "square", dur: 0.03, vol: 0.08 });
    },

    /** Victory arpeggio + closing chord for great results. */
    fanfare: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (freq, i) {
        tone(freq, { type: "triangle", at: i * 0.13, dur: 0.14, vol: 0.4 });
      });
      [523, 659, 784].forEach(function (freq) {
        tone(freq, { at: 0.55, dur: 0.6, vol: 0.25 });
      });
    },

    /** Sparkle jingle for a new best time. */
    newRecord: function () {
      [0, 0.35].forEach(function (offset) {
        tone(880, { at: offset, dur: 0.1, vol: 0.35 });
        tone(1175, { at: offset + 0.08, dur: 0.1, vol: 0.35 });
        tone(1568, { at: offset + 0.16, dur: 0.1, vol: 0.35 });
      });
    },
  };

  function injectMuteButton() {
    if (document.getElementById("klg-mute-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "klg-mute-btn";
    btn.className = "klg-mute-btn";
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
    btn.addEventListener("click", function () {
      var nowMuted = KlgSounds.toggleMuted();
      if (!nowMuted) KlgSounds.click();
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectMuteButton);
  } else {
    injectMuteButton();
  }

  window.KlgSounds = KlgSounds;
})();
