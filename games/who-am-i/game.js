/**
 * Who Am I? — read clues one at a time and tap the picture they describe.
 * Asking for another clue is free: working it out is the point. A wrong guess
 * brings the next clue, and when every clue has been seen a guess is fair.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const BANK = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.RIDDLES_2 : window.KlgQuestions.RIDDLES;
  /** "a rainbow", "an elephant", "the Sun", "cheese": names read as part of a sentence. */
  const called = (name) => (/^[A-Z]/.test(name) ? "the " + name : name === "cheese" ? name : (/^[aeiou]/.test(name) ? "an " : "a ") + name);

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let row, tries = 0;
      do { row = V.pick(BANK); } while (asked.has(row[0][1]) && ++tries < 40);
      asked.add(row[0][1]);
      const [answer, clues, others] = row;
      return { answer, clues, options: V.shuffle([answer, ...others]) };
    },
    render(q, ctx) {
      let shown = 1;
      ctx.task("Who am I? " + q.clues[0]);
      const list = document.createElement("ol");
      list.className = "kv-clues";
      const more = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "🔎 Another clue" });
      const showClues = () => {
        list.replaceChildren(...q.clues.slice(0, shown).map((text) => Object.assign(document.createElement("li"), { textContent: text })));
        more.hidden = shown >= q.clues.length;
        more.style.display = more.hidden ? "none" : "";
      };
      const nextClue = () => {
        if (shown >= q.clues.length) return;
        shown += 1;
        showClues();
        ctx.say(q.clues[shown - 1]);
      };
      more.addEventListener("click", nextClue);
      showClues();
      const grid = document.createElement("div");
      grid.className = "kv-oddgrid";
      const lock = () => { grid.querySelectorAll("button").forEach((b) => { b.disabled = true; }); more.disabled = true; };
      q.options.forEach(([emoji, name]) => {
        const right = name === q.answer[1];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-oddcell kv-answer";
        b.dataset.answer = name;
        if (right) b.dataset.right = "1";
        b.setAttribute("aria-label", name);
        b.innerHTML = '<span class="kv-emoji" aria-hidden="true"></span><span class="kv-choice-text"></span>';
        b.firstChild.textContent = emoji;
        b.lastChild.textContent = name;
        b.addEventListener("click", () => {
          if (right) {
            lock();
            shown = q.clues.length;
            showClues();
            ctx.right(`I am ${called(name)}! ${q.clues[q.clues.length - 1]}`);
          } else {
            b.disabled = true;
            nextClue();
            ctx.wrong(`I am not ${called(name)}. Read the clues again.`);
          }
        });
        grid.appendChild(b);
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      bar.append(more);
      ctx.stage.append(list, bar, grid);
    },
  });
})();
