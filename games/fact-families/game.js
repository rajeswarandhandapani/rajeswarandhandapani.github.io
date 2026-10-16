/**
 * Fact Family Triangles — multiplication and division are one family.
 *
 * A triangle holds a product on top and its two factors at the bottom
 * (12 · 3 · 4). One corner is hidden; find it. Some questions instead ask
 * which number sentence does NOT belong to the family. After each answer
 * the four facts of the family are shown: 3 × 4, 4 × 3, 12 ÷ 3, 12 ÷ 4.
 *
 *   ?tables=3,4  limit the factors (default 2–10; ?level=1 uses 2, 5, 10)
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const params = new URLSearchParams(location.search);
  const level1 = params.get("level") === "1";
  const asked = (params.get("tables") || "").split(",").map(Number).filter((n) => n >= 2 && n <= 12);
  const TABLES = asked.length ? asked : level1 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];

  const facts = (p, a, b) => [`${a} × ${b} = ${p}`, `${b} × ${a} = ${p}`, `${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a}`];

  function familyList(p, a, b) {
    const ul = document.createElement("ul");
    ul.className = "mv-facts";
    [...new Set(facts(p, a, b))].forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
    return ul;
  }

  function generate(seen) {
    let a, b, p, key;
    for (let i = 0; i < 30; i++) {
      a = V.pick(TABLES);
      b = V.rand(2, level1 ? 5 : 10);
      p = a * b;
      key = [Math.min(a, b), Math.max(a, b)].join("x");
      if (!seen.has(key)) break;
    }
    const solution = () => {
      const box = document.createElement("div");
      box.append(V.triangle(p, a, b, null), familyList(p, a, b));
      return box;
    };

    if (Math.random() < 0.25 && a !== b) {
      const intruders = V.shuffle([`${p} ÷ ${a} = ${a}`, `${a} + ${b} = ${p}`, `${p} × ${a} = ${b}`, `${b} ÷ ${a} = ${p}`, `${p} − ${a} = ${b}`])
        .filter((f) => !facts(p, a, b).includes(f));
      const odd = intruders[0];
      const options = V.shuffle([...V.shuffle(facts(p, a, b)).slice(0, 3), odd]);
      return {
        visual: V.triangle(p, a, b, null),
        solution,
        prompt: "Which fact does NOT belong to this family?",
        dedupeKey: key,
        correctAnswer: odd,
        choices: options,
        explanation: `${odd} is not true for ${a}, ${b} and ${p}. The family is ${facts(p, a, b).join(", ")}.`,
      };
    }

    const hidden = V.pick(["product", "a", "b"]);
    const answer = hidden === "product" ? p : hidden === "a" ? a : b;
    const known = hidden === "product" ? `${a} × ${b}` : hidden === "a" ? `${p} ÷ ${b}` : `${p} ÷ ${a}`;
    return {
      visual: V.triangle(p, a, b, hidden),
      solution,
      prompt: "What number is hiding in the triangle?",
      dedupeKey: key,
      correctAnswer: answer,
      choices: V.numberChoices(answer, hidden === "product" ? [a + b, p + a, p - b] : [answer + 1, answer - 1, p - answer]),
      explanation: `${known} = ${answer}.`,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
    let quiz;
    quiz = new QuizEngine({
      totalQuestions: 10,
      timePerQuestion: 60,
      generateQuestion: generate,
      onAnswered: (q) => { if (quiz.visualBox) quiz.visualBox.replaceChildren(q.solution()); },
    });
    document.getElementById("start-btn").addEventListener("click", () => {
      if (window.KlgSounds) KlgSounds.click();
      document.getElementById("start-screen").classList.add("d-none");
      quiz.start();
    });
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
