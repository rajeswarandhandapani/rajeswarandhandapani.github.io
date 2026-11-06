/**
 * Stay Safe & Healthy — a little situation and three things you could do.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const BANK = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.SITUATIONS_2 : window.KlgQuestions.SITUATIONS;

  /** Answer buttons: a wrong one is disabled and asks for another try. */
  function choiceBar(choices, ctx, onRight, wrongMessage) {
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    const lock = () => bar.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    choices.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kv-btn kv-answer";
      b.dataset.answer = c.value;
      if (c.right) b.dataset.right = "1";
      b.textContent = c.text;
      if (c.label) b.setAttribute("aria-label", c.label);
      b.addEventListener("click", () => {
        if (c.right) { lock(); onRight(c); }
        else { b.disabled = true; ctx.wrong(typeof wrongMessage === "function" ? wrongMessage(c) : wrongMessage); }
      });
      bar.appendChild(b);
    });
    return bar;
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let row, tries = 0;
      do { row = V.pick(BANK); } while (asked.has(row[1]) && ++tries < 40);
      asked.add(row[1]);
      const [emoji, story, safe, unsafe, why] = row;
      return { emoji, story, safe, why, options: V.shuffle([safe, ...unsafe]) };
    },
    render(q, ctx) {
      ctx.task(q.story + " What should you do?");
      const pic = document.createElement("figure");
      pic.className = "kv-clue";
      pic.setAttribute("role", "img");
      pic.setAttribute("aria-label", "A picture for the story");
      pic.innerHTML = '<span aria-hidden="true"></span>';
      pic.firstChild.textContent = q.emoji;
      const bar = choiceBar(
        q.options.map((text) => ({ text, value: text, right: text === q.safe })),
        ctx,
        () => ctx.right(q.why),
        "That would not be safe or healthy. Which choice looks after you?"
      );
      bar.classList.add("kv-long-answers");
      ctx.stage.append(pic, bar);
    },
  });
})();
