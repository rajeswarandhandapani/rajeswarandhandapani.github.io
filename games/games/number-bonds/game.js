/**
 * Number Bonds — a whole splits into two parts. One part is missing.
 *
 *   ?level=1  wholes up to 10, with counters to count
 *   ?level=2  (default) wholes up to 20, with counters
 *   ?level=3  tens that make up to 100, without counters
 *
 * Sometimes the whole is the missing number, so that it is not always subtraction.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

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

  function counters(n, emoji) {
    const box = document.createElement("span");
    box.className = "nb-counters";
    box.textContent = emoji.repeat(n);
    return box;
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let whole, a, b, hide, tries = 0;
      do {
        if (level === 3) {
          whole = V.rand(3, 10) * 10;
          a = V.rand(1, whole / 10 - 1) * 10;
        } else {
          whole = level === 1 ? V.rand(3, 10) : V.rand(11, 20);
          a = V.rand(1, whole - 1);
        }
        b = whole - a;
        hide = V.pick(["b", "b", "b", "whole"]);
      } while (asked.has(whole + "-" + a + hide) && ++tries < 40);
      asked.add(whole + "-" + a + hide);
      const answer = hide === "whole" ? whole : b;
      const step = level === 3 ? 10 : 1;
      const wrong = new Set();
      for (const c of V.shuffle([answer + step, answer - step, answer + 2 * step, answer - 2 * step, answer + 3 * step, a])) {
        if (c > 0 && c !== answer && wrong.size < 3) wrong.add(c);
      }
      return { whole, a, b, hide, answer, choices: V.shuffle([answer, ...wrong]) };
    },
    render(q, ctx) {
      ctx.task(q.hide === "whole" ? `${q.a} and ${q.b} make what?` : `${q.a} and what make ${q.whole}?`);
      const bond = document.createElement("figure");
      bond.className = "nb-bond";
      bond.setAttribute("role", "img");
      bond.setAttribute("aria-label", q.hide === "whole"
        ? `A number bond. The parts are ${q.a} and ${q.b}. The whole is hidden.`
        : `A number bond. The whole is ${q.whole}. One part is ${q.a}. The other part is hidden.`);
      bond.dataset.whole = q.whole;
      bond.dataset.a = q.a;
      bond.dataset.b = q.b;
      const circle = (text, cls, emoji, n) => {
        const c = document.createElement("div");
        c.className = "nb-circle " + cls;
        c.append(Object.assign(document.createElement("b"), { textContent: text }));
        if (emoji && level < 3 && n) c.append(counters(n, emoji));
        return c;
      };
      const hiddenWhole = q.hide === "whole";
      const hiddenB = q.hide === "b";
      const top = circle(hiddenWhole ? "?" : String(q.whole), "nb-whole");
      const left = circle(String(q.a), "nb-part", "🔵", q.a);
      const right = circle(hiddenB ? "?" : String(q.b), "nb-part", hiddenB ? "" : "🟠", q.b);
      const parts = document.createElement("div");
      parts.className = "nb-parts";
      parts.append(left, right);
      bond.append(top, parts);
      const bar = choiceBar(
        q.choices.map((c) => ({ text: String(c), value: String(c), right: c === q.answer })),
        ctx,
        () => ctx.right(`${q.a} + ${q.b} = ${q.whole}.`),
        () => (level < 3 ? "Count the counters, then count on to the whole." : "Think in tens: how many more tens make the whole?")
      );
      ctx.stage.append(bond, bar);
    },
  });
})();
