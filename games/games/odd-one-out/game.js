/**
 * Odd One Out — three pictures belong together and one does not.
 *
 *   ?level=1  different kinds of thing (fruit and a car)
 *   ?level=2  (default) you need a fact to spot it (a bat is not a bird)
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const BANK = window.KlgQuestions.SETS[level];

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let row, tries = 0;
      do { row = V.pick(BANK); } while (asked.has(row[3][1]) && ++tries < 40);
      asked.add(row[3][1]);
      const odd = row[3];
      const pictures = V.shuffle([row[0], row[1], row[2], odd].map(([emoji, name]) => ({ emoji, name, odd: name === odd[1] })));
      return { pictures, why: row[4] };
    },
    render(q, ctx) {
      ctx.task("Which one does not belong?");
      const grid = document.createElement("div");
      grid.className = "kv-oddgrid";
      const lock = () => grid.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      q.pictures.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-oddcell kv-answer";
        b.dataset.answer = p.name;
        if (p.odd) b.dataset.right = "1";
        b.setAttribute("aria-label", p.name);
        b.innerHTML = '<span class="kv-emoji" aria-hidden="true"></span><span class="kv-choice-text"></span>';
        b.firstChild.textContent = p.emoji;
        b.lastChild.textContent = p.name;
        b.addEventListener("click", () => {
          if (p.odd) { lock(); ctx.right(q.why); }
          else { b.disabled = true; ctx.wrong("That one belongs with some of the others. Look again."); }
        });
        grid.appendChild(b);
      });
      ctx.stage.append(grid);
    },
  });
})();
