/**
 * சொல் வரிசை — put the words of a Tamil sentence in order.
 *
 * Sentences come from the shared bank (tamil-sentences-data.js) and have at
 * least three words. Tamil word order is flexible, and only the order as written
 * is accepted, so another order that also reads well still gets "try again". The
 * child is then shown the sentence as one good way to say it.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const A = window.KlgTamilAudio;
  const T = window.TamilSentenceData;
  const full = (s) => (s.before + s.word + s.after).trim();
  // Level 1 keeps to sentences of exactly three words.
  const shortest = new URLSearchParams(location.search).get("level") === "1";
  const BANK = T.sentences.filter((s) => {
    const words = full(s).split(/\s+/).length;
    return shortest ? words === 3 : words >= 3;
  });

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let s, tries = 0;
      do { s = V.pick(BANK); } while (asked.has(s.id) && ++tries < 40);
      asked.add(s.id);
      return { id: s.id, sentence: full(s), word: s.word, clue: s.clue, emoji: s.emoji };
    },
    render(q, ctx) {
      ctx.task(`Put the words in order. The sentence is about: ${q.clue}.`);
      const pic = document.createElement("figure");
      pic.className = "kv-clue";
      pic.setAttribute("role", "img");
      pic.setAttribute("aria-label", q.clue);
      pic.dataset.sentence = q.sentence;
      pic.innerHTML = '<span aria-hidden="true"></span>';
      pic.firstChild.textContent = q.emoji;
      const words = q.sentence.split(/\s+/);
      const host = document.createElement("div");
      host.className = "tamil-glyph kv-tamil-tiles";
      const board = KlgPlayKit.buildFromTiles({ host, tiles: words.map((w, idx) => ({ id: String(idx), text: w })), slots: words.length, joiner: " " });
      const hear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "🔊 " + q.clue });
      hear.addEventListener("click", () => { if (A) A.say(q.word); });
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Clear" });
      clear.addEventListener("click", () => board.reset());
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check", id: "word-order-check" });
      check.addEventListener("click", () => {
        if (!board.isFull()) return ctx.hint("Use all of the words first.");
        const made = board.value();
        const lock = () => { check.disabled = clear.disabled = true; };
        if (made === q.sentence) {
          lock();
          if (A) A.say(q.word);
          ctx.right(q.sentence);
        } else if (!ctx.firstTry()) {
          lock();
          ctx.reveal("ஒரு நல்ல வாக்கியம்: " + q.sentence);
        } else {
          ctx.wrong("Try another order. In Tamil, the doing word usually comes last.");
          board.reset();
        }
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      bar.append(hear, clear, check);
      ctx.stage.append(pic, host, bar);
    },
  });
})();
