/**
 * Tamil Memory — turn over two cards and find matching pairs.
 *
 *   ?mode=words (default)  a picture card pairs with its Tamil word card
 *   ?mode=signs            a vowel pairs with its vowel sign on க
 *                          (ஆ ↔ கா, இ ↔ கி …), the key to reading உயிர்மெய்
 *
 * Every card says itself when it is turned over, so the game teaches while
 * it is played. Finding all pairs in few turns earns more stars:
 * pairs + 2 turns or fewer is 3 stars.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const $ = (id) => document.getElementById(id);
  const mode = new URLSearchParams(location.search).get("mode") === "signs" ? "signs" : "words";

  let opened = [], pairs = 0, turns = 0, pairCount = 6, locked = false, timer = null;

  function deck(n) {
    if (mode === "signs") {
      const base = T.pick(["க", "ம", "ப", "த", "ந", "ச"]);
      return T.sample(T.VOWELS.slice(1), n).flatMap((v, i) => {
        const letter = base + T.VOWEL_SIGNS[T.VOWELS.indexOf(v)];
        return [
          { pair: i, face: v.tamil, say: v.tamil, label: `vowel ${v.tamil}`, tamil: true },
          { pair: i, face: letter, say: letter, label: `letter ${letter}`, tamil: true },
        ];
      });
    }
    const recorded = TAMIL_WORDS.filter((w) => A.has(w.tamil) && w.cat !== "colors");
    const source = recorded.length >= n ? recorded : TAMIL_WORDS;
    const unique = [];
    const seen = new Set();
    for (const w of T.shuffle(source)) if (!seen.has(w.emoji)) { seen.add(w.emoji); unique.push(w); }
    return unique.slice(0, n).flatMap((w, i) => [
      { pair: i, face: w.emoji, say: w.tamil, label: `picture of ${w.english}` },
      { pair: i, face: w.tamil, say: w.tamil, label: `word ${w.tamil}`, tamil: true },
    ]);
  }

  function update() {
    $("memory-status").textContent = `${pairs} of ${pairCount} pairs found · ${turns} turns`;
  }

  function start() {
    clearTimeout(timer);
    opened = []; pairs = 0; turns = 0; locked = false;
    pairCount = Number($("memory-size").value);
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("memory-screen").classList.remove("d-none");
    const board = $("memory-board");
    board.replaceChildren();
    board.classList.toggle("memory-board-large", pairCount === 8);
    $("memory-feedback").textContent = "Turn over two cards to find a pair.";
    update();
    T.shuffle(deck(pairCount)).forEach((card, index) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "memory-card tg-memory-card" + (card.tamil ? " tamil-glyph" : "");
      b.textContent = "✦";
      b.setAttribute("aria-label", `Card ${index + 1}, face down`);
      b.addEventListener("click", () => flip(b, card, index));
      board.appendChild(b);
    });
    board.firstElementChild.focus();
  }

  function flip(b, card, index) {
    if (locked || b.disabled || opened.some((o) => o.b === b)) return;
    b.textContent = card.face;
    b.classList.add("flipped");
    b.setAttribute("aria-label", `Card ${index + 1}, ${card.label}`);
    A.say(card.say);
    opened.push({ b, card, index });
    if (opened.length < 2) return;
    turns += 1;
    const [x, y] = opened;
    if (x.card.pair === y.card.pair) {
      pairs += 1;
      [x, y].forEach((o) => { o.b.disabled = true; o.b.classList.add("matched"); });
      opened = [];
      KlgTamilGames.cheer(y.b);
      $("memory-feedback").textContent = mode === "signs"
        ? `${x.card.face} + ${y.card.face} — a pair! The sign shows the vowel.`
        : `A pair! ${y.card.say}.`;
      if (pairs === pairCount) setTimeout(finish, 900);
    } else {
      locked = true;
      $("memory-feedback").textContent = "Not a pair — remember where they are!";
      timer = setTimeout(() => {
        [x, y].forEach((o) => {
          o.b.textContent = "✦";
          o.b.classList.remove("flipped");
          o.b.setAttribute("aria-label", `Card ${o.index + 1}, face down`);
        });
        opened = [];
        locked = false;
      }, 1500);
    }
    update();
  }

  function finish() {
    A.stop();
    $("memory-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    // Turn efficiency: perfect memory needs `pairCount` turns.
    const extra = turns - pairCount;
    const score = extra <= 2 ? pairCount : extra <= pairCount ? Math.ceil(pairCount * 0.75) : Math.ceil(pairCount * 0.5);
    KlgTamilGames.finish({
      score, total: pairCount, el: $("finish-summary"),
      message: `All ${pairCount} pairs found in ${turns} turns!`,
    });
    $("play-again").focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks($("mode-links"), "mode", "words");
    KlgTamilGames.voiceNote($("voice-note"));
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("memory-restart").addEventListener("click", start);
    $("memory-exit").addEventListener("click", () => {
      clearTimeout(timer);
      A.stop();
      $("memory-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
  });
})();
