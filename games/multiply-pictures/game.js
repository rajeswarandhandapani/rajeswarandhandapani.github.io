/**
 * Picture Multiplication — see multiplication before writing it.
 *
 *   ?mode=mix (default) | groups | arrays | hops | match | sentence
 *     groups    4 plates with 3 cookies each → how many altogether?
 *     arrays    rows × columns of flowers → how many?
 *     hops      a frog makes 5 hops of 3 on a number line → where does it land?
 *     match     "Which picture shows 3 × 4?" → tap the picture (3 groups of 4)
 *     sentence  a picture → which number sentence matches it?
 *   ?level=1    2, 5 and 10 times tables, small pictures
 *   ?level=2    (default) tables 2–6
 *   ?level=3    tables 2–10, bigger pictures
 *
 * "3 × 4" is read as 3 groups of 4. Wrong picture choices always have a
 * different total, so the turned-around picture (4 groups of 3) is never
 * offered as a wrong answer. Every answer is followed by the repeated
 * addition it stands for (4 + 4 + 4 = 12).
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const params = new URLSearchParams(location.search);
  const MODES = ["groups", "arrays", "hops", "match", "sentence"];
  const mode = MODES.includes(params.get("mode")) ? params.get("mode") : "mix";
  const level = [1, 3].includes(Number(params.get("level"))) ? Number(params.get("level")) : 2;

  const TABLES = level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const MAX_GROUPS = level === 1 ? 5 : level === 2 ? 6 : 8;
  const THINGS = [
    ["🍪", "plate", "cookies"], ["🍎", "basket", "apples"], ["🥚", "box", "eggs"], ["🍬", "bag", "sweets"],
    ["🌸", "pot", "flowers"], ["🥭", "basket", "mangoes"], ["🧁", "plate", "cupcakes"], ["⚽", "box", "balls"],
  ];

  /** a groups of b. Pictures stay countable: at most MAX_GROUPS groups of ≤ 10. */
  function fact() {
    const b = V.pick(TABLES);
    const a = V.rand(2, MAX_GROUPS);
    return [a, b];
  }

  const repeated = (a, b) => (a <= 6 ? Array(a).fill(b).join(" + ") + " = " + a * b : `${a} lots of ${b} = ${a * b}`);

  const kinds = {
    groups() {
      const [a, b] = fact();
      const [emoji, holder, name] = V.pick(THINGS);
      const word = V.HOLDER_WORD[holder];
      return {
        visual: V.groups(a, b, emoji, { holder }),
        prompt: `${a} ${word} with ${b} ${name} on each. How many ${name} altogether?`,
        key: `g${a}x${b}`,
        correctAnswer: a * b,
        choices: V.numberChoices(a * b, [a + b, a * b + b, a * b - b, a * (b + 1)]),
        explanation: `${a} groups of ${b}: ${repeated(a, b)}. So ${a} × ${b} = ${a * b}.`,
      };
    },
    arrays() {
      const [rows, cols] = fact();
      const emoji = V.pick(["🌷", "🌻", "🪑", "🥕", "🧁", "⭐"]);
      return {
        visual: V.array(rows, cols, emoji),
        prompt: `${rows} rows with ${cols} in each row. How many ${emoji} are there?`,
        key: `a${rows}x${cols}`,
        correctAnswer: rows * cols,
        choices: V.numberChoices(rows * cols, [rows + cols, rows * cols + cols, rows * cols - rows, (rows + 1) * cols]),
        explanation: `${rows} rows × ${cols} in each row = ${rows * cols}.`,
      };
    },
    hops() {
      const step = V.pick(TABLES);
      const hops = V.rand(2, level === 1 ? 5 : 7);
      return {
        visual: V.numberLine({ step, hops, max: step * Math.max(hops + 1, 5), hideEnd: true }),
        prompt: `The frog makes ${hops} hops of ${step}. Where does it land?`,
        key: `h${hops}x${step}`,
        correctAnswer: hops * step,
        choices: V.numberChoices(hops * step, [hops + step, (hops + 1) * step, (hops - 1) * step]),
        explanation: `${hops} hops of ${step}: ${repeated(hops, step)}. ${hops} × ${step} = ${hops * step}.`,
      };
    },
    match() {
      const a = V.rand(2, 5);
      const b = V.rand(2, 5);
      const [emoji, holder] = V.pick(THINGS);
      const options = [[a, b]];
      const seen = new Set([a * b]);
      for (const [x, y] of V.shuffle([[a, b + 1], [a + 1, b], [a, b - 1], [a - 1, b], [b, b], [a, a], [a + 1, b - 1]])) {
        if (x >= 1 && y >= 1 && !seen.has(x * y) && options.length < 4) { options.push([x, y]); seen.add(x * y); }
      }
      const label = ([x, y]) => `${x} ${V.HOLDER_WORD[holder]} of ${y}`;
      const values = options.map(label);
      return {
        prompt: `Which picture shows ${a} × ${b}?`,
        key: `m${a}x${b}`,
        correctAnswer: label([a, b]),
        choices: V.shuffle(values),
        choiceVisuals: Object.fromEntries(options.map((o) => [label(o), V.groups(o[0], o[1], emoji, { holder })])),
        noChoiceListen: true,
        explanation: `${a} × ${b} means ${a} groups of ${b} = ${a * b}.`,
      };
    },
    sentence() {
      const [rows, cols] = fact();
      const emoji = V.pick(["🌷", "🍓", "🐥", "🎈", "🍩"]);
      const right = `${rows} × ${cols}`;
      const wrong = V.shuffle([`${rows} + ${cols}`, `${rows} × ${cols + 1}`, `${rows + 1} × ${cols}`, `${cols} + ${cols}`, `${rows - 1} × ${cols}`])
        .filter((w, i, all) => w !== right && w !== `${cols} × ${rows}` && all.indexOf(w) === i).slice(0, 3);
      return {
        visual: V.array(rows, cols, emoji),
        prompt: "Which number sentence matches the picture?",
        key: `s${rows}x${cols}`,
        correctAnswer: right,
        choices: V.shuffle([right, ...wrong]),
        explanation: `${rows} rows of ${cols}: ${right} = ${rows * cols}.`,
      };
    },
  };

  function generate(asked) {
    let q;
    for (let i = 0; i < 20; i++) {
      q = kinds[mode === "mix" ? V.pick(MODES) : mode]();
      if (!asked.has(q.key)) break;
    }
    return { ...q, dedupeKey: q.key, reviewPrompt: q.prompt };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks(document.getElementById("mode-links"), "mode", "mix");
    KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
    const quiz = new QuizEngine({ totalQuestions: 10, timePerQuestion: 90, generateQuestion: generate });
    document.getElementById("start-btn").addEventListener("click", () => {
      if (window.KlgSounds) KlgSounds.click();
      document.getElementById("start-screen").classList.add("d-none");
      quiz.start();
    });
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
