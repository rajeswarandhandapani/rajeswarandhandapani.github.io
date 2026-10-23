/**
 * Sentence Builder — a picture, and the words of a sentence about it in a jumble.
 *
 *   ?level=1  three to four words ("The cat sat.")
 *   ?level=2  (default 1) five to seven words ("The dog ran to the park.")
 *
 * The first word has its capital letter and the last has its full stop, so
 * the order and the punctuation both give clues. A sentence is right when the
 * tiles read exactly as written; a wrong try clears the tiles so the child
 * can look at the picture again.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const SHORT = [
    ["🐱", "The cat sat."], ["🐶", "The dog ran."], ["🐸", "The frog jumps."], ["🌞", "The sun is hot."], ["🐦", "A bird can fly."],
    ["🐟", "Fish can swim."], ["🍎", "I eat an apple."], ["🌧️", "It is raining."], ["🚗", "The car is red."], ["🐷", "The pig is big."],
    ["🐝", "A bee can buzz."], ["🦆", "The duck swims."], ["⚽", "I kick the ball."], ["📖", "I read a book."], ["🌙", "The moon is up."],
  ];
  const LONG = [
    ["🐱", "The cat sat on the mat."], ["🐶", "The dog ran to the park."], ["🐸", "The frog jumps into the pond."], ["🐦", "The bird sings in the tree."],
    ["🚲", "The boy rides his red bike."], ["🍏", "The girl eats a big apple."], ["☔", "We use an umbrella when it rains."], ["🐢", "The slow turtle walks to the lake."],
    ["🐘", "The big elephant drinks water."], ["🚌", "The bus takes us to school."], ["🍰", "We eat cake on my birthday."], ["🏊", "She swims in the pool."],
    ["🌻", "The flower grows in the garden."], ["🐝", "The bee flies to a flower."],
  ];
  const BANK = level === 1 ? SHORT : LONG;

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let item, tries = 0;
      do { item = V.pick(BANK); } while (asked.has(item[1]) && ++tries < 30);
      asked.add(item[1]);
      return { emoji: item[0], sentence: item[1], words: item[1].split(" ") };
    },
    render(q, ctx) {
      ctx.task("Put the words in order to make a sentence about the picture.");
      const pic = document.createElement("figure");
      pic.className = "kv-clue";
      pic.setAttribute("role", "img");
      pic.setAttribute("aria-label", "A picture for the sentence");
      pic.dataset.sentence = q.sentence;
      pic.innerHTML = `<span aria-hidden="true">${q.emoji}</span>`;
      const host = document.createElement("div");
      const tiles = q.words.map((w, idx) => ({ id: String(idx), text: w }));
      const board = KlgPlayKit.buildFromTiles({ host, tiles, slots: q.words.length, joiner: " " });
      const hear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "🔊 Hear my sentence" });
      hear.setAttribute("aria-label", "Hear my sentence");
      hear.addEventListener("click", () => KlgRound.say(board.value()));
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Start again" });
      clear.addEventListener("click", () => board.reset());
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
      check.setAttribute("aria-label", "Check my sentence");
      check.addEventListener("click", () => {
        if (!board.isFull()) return ctx.hint("Use every word tile.");
        if (board.value() === q.sentence) {
          KlgRound.say(q.sentence);
          ctx.right(`“${q.sentence}” It starts with a capital letter and ends with a full stop.`);
          check.disabled = clear.disabled = true;
        } else if (!ctx.firstTry()) {
          ctx.reveal(`The sentence is: “${q.sentence}”`);
          check.disabled = clear.disabled = true;
        } else {
          ctx.wrong("Read it aloud. Does it sound right? Remember the capital letter comes first and the full stop comes last.");
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
