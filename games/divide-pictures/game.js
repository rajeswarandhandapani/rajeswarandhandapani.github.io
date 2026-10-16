/**
 * Picture Division — the two meanings of division, drawn.
 *
 *   ?mode=mix (default) | share | group | hops | rows | leftover
 *     share     12 cookies shared by 3 children → how many each? (sharing)
 *     group     15 eggs into boxes of 5 → how many boxes?        (grouping)
 *     hops      hop back from 20 to 0 in jumps of 4 → how many hops?
 *     rows      24 flowers in 4 equal rows → how many in each row?
 *     leftover  17 sweets into bags of 5 → full bags and left over (remainders)
 *   ?level=1    ÷2, ÷5, ÷10 · ?level=2 (default) ÷2–÷6 · ?level=3 ÷2–÷10
 *
 * After every answer the picture changes to the solved version (the
 * cookies on each child's plate, the eggs looped into boxes), so a child
 * who guessed sees *why* the answer is right.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const params = new URLSearchParams(location.search);
  const MODES = ["share", "group", "hops", "rows", "leftover"];
  const mode = MODES.includes(params.get("mode")) ? params.get("mode") : "mix";
  const level = [1, 3].includes(Number(params.get("level"))) ? Number(params.get("level")) : 2;
  const DIVISORS = level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const MAX_Q = level === 1 ? 5 : level === 2 ? 6 : 8;
  const THINGS = [["🍪", "cookies"], ["🍎", "apples"], ["🍬", "sweets"], ["🎈", "balloons"], ["🍓", "strawberries"], ["🖍️", "crayons"]];

  function fact() {
    const d = V.pick(DIVISORS.filter((x) => x <= 8 || level === 3));
    const q = V.rand(2, MAX_Q);
    return [d * q, d, q];
  }

  const kinds = {
    share() {
      const [total, people, each] = fact();
      const [emoji, name] = V.pick(THINGS);
      return {
        visual: V.share(total, people, emoji),
        solution: () => V.groups(people, each, emoji, { holder: "plate", label: `${people} plates with ${each} ${name} each` }),
        prompt: `${total} ${name} are shared equally by ${people} children. How many does each child get?`,
        key: `s${total}/${people}`,
        correctAnswer: each,
        choices: V.numberChoices(each, [people, total - people, each + 1, each - 1]),
        explanation: `${total} ÷ ${people} = ${each}, because ${people} × ${each} = ${total}.`,
      };
    },
    group() {
      const [total, size, count] = fact();
      const [emoji, holder, name] = V.pick([["🥚", "box", "eggs"], ["🍬", "bag", "sweets"], ["🥭", "basket", "mangoes"], ["⚽", "box", "balls"]]);
      const word = V.HOLDER_WORD[holder];
      return {
        visual: V.pile(total, emoji),
        solution: () => V.circled(total, size, emoji),
        prompt: `Put ${total} ${name} into ${word} of ${size}. How many ${word} do you fill?`,
        key: `g${total}/${size}`,
        correctAnswer: count,
        choices: V.numberChoices(count, [size, total - size, count + 1, count - 1]),
        explanation: `${total} ÷ ${size} = ${count} — ${count} ${word} of ${size}.`,
      };
    },
    hops() {
      const [total, step, hops] = fact();
      return {
        visual: V.numberLine({ step, hops, max: total, back: true }),
        prompt: `The frog hops back from ${total} to 0 in jumps of ${step}. How many hops does it make?`,
        key: `h${total}/${step}`,
        correctAnswer: hops,
        choices: V.numberChoices(hops, [step, hops + 1, hops - 1, total - step]),
        explanation: `${total} ÷ ${step} = ${hops} hops.`,
      };
    },
    rows() {
      const [total, rows, cols] = fact();
      const emoji = V.pick(["🌷", "🪑", "🥕", "⭐"]);
      return {
        visual: V.array(rows, cols, emoji),
        prompt: `${total} ${emoji} are planted in ${rows} equal rows. How many are in each row?`,
        key: `r${total}/${rows}`,
        correctAnswer: cols,
        choices: V.numberChoices(cols, [rows, total - rows, cols + 1, cols - 1]),
        explanation: `${total} ÷ ${rows} = ${cols} in each row.`,
      };
    },
    leftover() {
      const size = V.pick(DIVISORS.filter((d) => d >= 3).length ? DIVISORS.filter((d) => d >= 3) : [3]);
      const full = V.rand(2, Math.min(MAX_Q, 6));
      const left = V.rand(1, size - 1);
      const total = size * full + left;
      const [emoji, name] = V.pick(THINGS);
      const say = (f, l) => `${f} bags, ${l} left`;
      const wrong = [say(full + 1, left), say(full, size - left), say(full - 1, left + size), say(left, full)]
        .filter((w, i, all) => w !== say(full, left) && all.indexOf(w) === i);
      return {
        visual: V.pile(total, emoji),
        solution: () => V.circled(total, size, emoji),
        prompt: `${total} ${name} go into bags of ${size}. How many full bags, and how many are left over?`,
        key: `l${total}/${size}`,
        correctAnswer: say(full, left),
        choices: V.shuffle([say(full, left), ...wrong.slice(0, 3)]),
        explanation: `${total} ÷ ${size} = ${full} remainder ${left}. The ${left} left over is less than ${size}, so it can't fill another bag.`,
      };
    },
  };

  function generate(asked) {
    const pool = mode === "mix" ? (level === 1 ? MODES.filter((m) => m !== "leftover") : MODES) : [mode];
    let q;
    for (let i = 0; i < 20; i++) {
      q = kinds[V.pick(pool)]();
      if (!asked.has(q.key)) break;
    }
    return { ...q, dedupeKey: q.key, reviewPrompt: q.prompt };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks(document.getElementById("mode-links"), "mode", "mix");
    KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
    let quiz;
    quiz = new QuizEngine({
      totalQuestions: 10,
      timePerQuestion: 90,
      generateQuestion: generate,
      // Swap in the solved picture so every answer shows its reason.
      onAnswered: (q) => { if (q.solution && quiz.visualBox) quiz.visualBox.replaceChildren(q.solution()); },
    });
    document.getElementById("start-btn").addEventListener("click", () => {
      if (window.KlgSounds) KlgSounds.click();
      document.getElementById("start-screen").classList.add("d-none");
      quiz.start();
    });
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
