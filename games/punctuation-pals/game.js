/**
 * Punctuation Pals — pick the mark that finishes a sentence.
 * The sentence is spoken only after the answer, since saying it aloud with the
 * right tone would give the answer away.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const BANK = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.SENTENCES_2 : window.KlgQuestions.SENTENCES;
  const MARKS = [
    { mark: ".", name: "full stop" },
    { mark: "?", name: "question mark" },
    { mark: "!", name: "exclamation mark" },
  ];

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
      // Takes turns between the marks so that a round uses all three.
      const mark = MARKS[i % 3].mark;
      const pool = BANK.filter((r) => r[1] === mark && !asked.has(r[0]));
      const row = V.pick(pool.length ? pool : BANK.filter((r) => r[1] === mark));
      asked.add(row[0]);
      return { sentence: row[0], mark: row[1], why: row[2] };
    },
    render(q, ctx) {
      ctx.task("Which mark finishes this sentence?", "Which mark finishes this sentence? Read it carefully.");
      const line = document.createElement("p");
      line.className = "kv-sentence-line";
      line.dataset.mark = q.mark;
      const written = Object.assign(document.createElement("span"), { textContent: q.sentence });
      const gap = Object.assign(document.createElement("span"), { className: "kv-blank", textContent: "__" });
      line.append(written, gap);
      const bar = choiceBar(
        MARKS.map((m) => ({ text: m.mark, value: m.mark, label: m.name, right: m.mark === q.mark })),
        ctx,
        () => {
          gap.textContent = q.mark;
          gap.classList.remove("kv-blank");
          KlgRound.say(q.sentence + q.mark);
          ctx.right(q.why);
        },
        (c) => `A ${c.label} does not fit here. Is the sentence telling, asking or showing a big feeling?`
      );
      bar.classList.add("kv-marks");
      ctx.stage.append(line, bar);
    },
  });
})();
