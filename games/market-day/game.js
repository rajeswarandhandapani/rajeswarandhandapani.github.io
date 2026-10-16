/**
 * Market Day — multiplication and division in everyday stories.
 *
 * Every question is a short scene with a picture: shopping with rupees,
 * packs and boxes, seats in rows, boats for a trip, legs on animals, days
 * in weeks. Children must decide *which* operation the story needs.
 *
 *   ?level=1  one step, small numbers (× and ÷ by 2, 5, 10)
 *   ?level=2  (default) one step, tables to 10, prices in ₹
 *   ?level=3  adds two-step stories (change from a note, unit price) and
 *             remainder stories where the answer must round up (boats)
 *             or down (how many can you afford?)
 *
 * The explanation after each answer shows the number sentence that solves
 * the story, so the habit "story → picture → sentence" is practised.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const SMALL = level === 1 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const NAMES = ["Priya", "Arun", "Kavya", "Ravi", "Meena", "Sam", "Aisha", "Leo", "Nila", "Omar", "Divya", "Karthik"];
  const rupees = (n) => `₹${n}`;

  function scene(title, ...parts) {
    const box = document.createElement("div");
    box.className = "mv-scene";
    const t = document.createElement("div");
    t.className = "mv-scene-title";
    t.textContent = title;
    box.append(t, ...parts);
    return box;
  }
  function tag(text) {
    const s = document.createElement("span");
    s.className = "mv-tag";
    s.textContent = text;
    return s;
  }
  const name = () => V.pick(NAMES);
  const factor = (max = level === 1 ? 5 : 9) => V.rand(2, max);

  const oneStep = [
    function packs() {
      const [emoji, item, pack] = V.pick([["🧁", "cupcakes", "box"], ["🥚", "eggs", "box"], ["🍬", "sweets", "bag"], ["🖍️", "crayons", "box"], ["🍌", "bananas", "bunch"]]);
      const each = V.pick(SMALL.filter((n) => n <= 8));
      const count = factor(6);
      const who = name();
      return {
        visual: scene("🛒 AT THE SHOP", V.groups(count, each, emoji, { holder: pack === "bag" ? "bag" : pack === "bunch" ? "none" : "box" })),
        prompt: `${item[0].toUpperCase() + item.slice(1)} come in ${pack === "bunch" ? "bunches" : pack + (pack === "box" ? "es" : "s")} of ${each}. ${who} buys ${count}. How many ${item} is that?`,
        answer: count * each,
        mistakes: [count + each, count * each + each, count * (each - 1)],
        explain: `${count} × ${each} = ${count * each} ${item}.`,
      };
    },
    function price() {
      const [emoji, item] = V.pick([["🥭", "mango"], ["✏️", "pencil"], ["🎈", "balloon"], ["🍦", "ice cream"], ["📒", "notebook"], ["🥥", "coconut"]]);
      const cost = V.pick(SMALL);
      const count = factor(6);
      return {
        visual: scene("🏷️ PRICE LIST", V.pile(count, emoji), tag(`${rupees(cost)} each`)),
        prompt: `One ${item} costs ${rupees(cost)}. How much do ${count} ${item}s cost?`,
        answer: count * cost, money: true,
        mistakes: [count + cost, (count + 1) * cost, count * cost - cost],
        explain: `${count} × ${rupees(cost)} = ${rupees(count * cost)}.`,
      };
    },
    function unitPrice() {
      const [emoji, item] = V.pick([["✏️", "pencils"], ["🍎", "apples"], ["🧃", "juice boxes"], ["🍫", "chocolates"]]);
      const cost = V.pick(SMALL);
      const count = factor(6);
      const who = name();
      return {
        visual: scene("🧾 THE BILL", V.pile(count, emoji), tag(`Total ${rupees(cost * count)}`)),
        prompt: `${who} paid ${rupees(cost * count)} for ${count} ${item}. They all cost the same. How much is one?`,
        answer: cost, money: true,
        mistakes: [count, cost * count - count, cost + 1],
        explain: `${rupees(cost * count)} ÷ ${count} = ${rupees(cost)} each.`,
      };
    },
    function share() {
      const [emoji, item] = V.pick([["🍪", "biscuits"], ["🍬", "sweets"], ["🍇", "grapes"], ["🃏", "cards"]]);
      const people = V.pick(SMALL.filter((n) => n <= 6));
      const each = factor(7);
      const who = name();
      return {
        visual: scene("🤝 SHARING", V.share(people * each, people, emoji)),
        prompt: `${who} shares ${people * each} ${item} equally among ${people} friends. How many does each friend get?`,
        answer: each,
        mistakes: [people, people * each - people, each + 1],
        explain: `${people * each} ÷ ${people} = ${each} each.`,
      };
    },
    function seats() {
      const rows = factor(8);
      const per = V.pick(SMALL.filter((n) => n <= 10));
      return {
        visual: scene("🎭 SCHOOL SHOW", V.array(rows, per, "🪑")),
        prompt: `Chairs for the school show are set out in ${rows} rows of ${per}. How many chairs are there?`,
        answer: rows * per,
        mistakes: [rows + per, rows * per - per, (rows + 1) * per],
        explain: `${rows} rows × ${per} = ${rows * per} chairs.`,
      };
    },
    function legs() {
      const [emoji, animal, legs] = V.pick([["🐄", "cows", 4], ["🐔", "hens", 2], ["🐕", "dogs", 4], ["🕷️", "spiders", 8], ["🐞", "ladybirds", 6]]);
      const count = factor(level === 1 ? 5 : 7);
      return {
        visual: scene("🌾 ON THE FARM", V.pile(count, emoji), tag(`${legs} legs each`)),
        prompt: `There are ${count} ${animal} in the field. Each has ${legs} legs. How many legs altogether?`,
        answer: count * legs,
        mistakes: [count + legs, count * legs - legs, count * (legs + 1)],
        explain: `${count} × ${legs} = ${count * legs} legs.`,
      };
    },
    function weeks() {
      const weeks = factor(level === 1 ? 4 : 8);
      return {
        visual: scene("📅 HOLIDAYS", V.groups(weeks, 7, "☀️", { holder: "none", label: `${weeks} weeks of 7 days` })),
        prompt: `The holiday lasts ${weeks} weeks. A week has 7 days. How many days is the holiday?`,
        answer: weeks * 7,
        mistakes: [weeks + 7, weeks * 7 - 7, weeks * 5],
        explain: `${weeks} × 7 = ${weeks * 7} days.`,
      };
    },
    function timesAsMany() {
      const a = name();
      let b = name();
      while (b === a) b = name();
      const base = V.rand(2, 6);
      const times = V.rand(2, level === 1 ? 3 : 5);
      return {
        visual: scene("🔮 MARBLES", tag(`${a}: ${base}`), V.pile(base, "🔵"), tag(`${b}: ${times} times as many`), V.groups(times, base, "🔵", { holder: "none" })),
        prompt: `${a} has ${base} marbles. ${b} has ${times} times as many. How many marbles does ${b} have?`,
        answer: base * times,
        mistakes: [base + times, base * times + base, base * (times - 1)],
        explain: `${times} × ${base} = ${base * times} marbles.`,
      };
    },
  ];

  const twoStep = [
    function roundUp() {
      const size = V.rand(4, 8);
      const full = V.rand(3, 6);
      const left = V.rand(1, size - 1);
      const kids = size * full + left;
      const [vehicle, emoji] = V.pick([["boats", "🚣"], ["cars", "🚗"], ["tables", "🪑"], ["tents", "⛺"]]);
      return {
        visual: scene("🚌 CLASS TRIP", V.pile(kids, "🧒"), tag(`${size} in each ${vehicle.slice(0, -1)} ${emoji}`)),
        prompt: `${kids} children go on a trip. Each of the ${vehicle} holds ${size} children. How many ${vehicle} are needed so nobody is left behind?`,
        answer: full + 1,
        mistakes: [full, size, left],
        explain: `${kids} ÷ ${size} = ${full} remainder ${left}. The ${left} extra children need one more, so ${full + 1} ${vehicle}.`,
      };
    },
    function roundDown() {
      const cost = V.pick([12, 15, 20, 25]);
      const can = V.rand(2, 5);
      const money = cost * can + V.rand(1, cost - 1);
      const [emoji, item] = V.pick([["🍦", "ice creams"], ["📚", "books"], ["🪁", "kites"]]);
      const who = name();
      return {
        visual: scene("💰 POCKET MONEY", tag(`${who} has ${rupees(money)}`), tag(`${emoji} ${rupees(cost)} each`)),
        prompt: `${who} has ${rupees(money)}. ${item[0].toUpperCase() + item.slice(1)} cost ${rupees(cost)} each. How many can ${who} buy?`,
        answer: can,
        mistakes: [can + 1, Math.floor(money / 10), can - 1],
        explain: `${rupees(money)} ÷ ${rupees(cost)} = ${can} remainder ${rupees(money - cost * can)} — not enough for one more.`,
      };
    },
    function change() {
      const cost = V.rand(6, 15);
      const count = V.rand(2, 4);
      const note = [50, 100].find((n) => n > cost * count);
      const [emoji, item] = V.pick([["📒", "notebooks"], ["🖊️", "pens"], ["🥤", "drinks"]]);
      const who = name();
      return {
        visual: scene("🧾 PAYING", V.pile(count, emoji), tag(`${rupees(cost)} each`), tag(`Pays with ${rupees(note)}`)),
        prompt: `${who} buys ${count} ${item} at ${rupees(cost)} each and pays with a ${rupees(note)} note. How much change?`,
        answer: note - cost * count, money: true,
        mistakes: [cost * count, note - cost, note - cost - count],
        explain: `${count} × ${rupees(cost)} = ${rupees(cost * count)}. ${rupees(note)} − ${rupees(cost * count)} = ${rupees(note - cost * count)} change.`,
      };
    },
    function unitThenMany() {
      const unit = V.rand(2, 9);
      const known = V.rand(2, 5);
      let wanted = V.rand(2, 9);
      if (wanted === known) wanted += 1;
      const [emoji, item] = V.pick([["🍌", "bananas"], ["🥚", "eggs"], ["🍋", "lemons"]]);
      return {
        visual: scene("🏷️ SPECIAL OFFER", V.pile(known, emoji), tag(`${known} for ${rupees(unit * known)}`)),
        prompt: `${known} ${item} cost ${rupees(unit * known)}. How much do ${wanted} ${item} cost?`,
        answer: unit * wanted, money: true,
        mistakes: [unit * known * wanted, unit * known + wanted, unit * (wanted + 1)],
        explain: `One costs ${rupees(unit * known)} ÷ ${known} = ${rupees(unit)}. Then ${wanted} × ${rupees(unit)} = ${rupees(unit * wanted)}.`,
      };
    },
  ];

  function generate(asked) {
    const pool = level === 3 ? [...oneStep, ...twoStep, ...twoStep] : oneStep;
    let s, key;
    for (let i = 0; i < 25; i++) {
      s = V.pick(pool)();
      key = s.prompt;
      if (!asked.has(key)) break;
    }
    const fmt = (n) => (s.money ? rupees(n) : String(n));
    const choices = V.numberChoices(s.answer, s.mistakes);
    return {
      visual: s.visual,
      prompt: s.prompt,
      dedupeKey: key,
      correctAnswer: fmt(s.answer),
      choices: choices.map(fmt),
      explanation: s.explain,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
    document.getElementById("question-text").classList.add("mv-story");
    const quiz = new QuizEngine({ totalQuestions: 10, timePerQuestion: 120, generateQuestion: generate });
    document.getElementById("start-btn").addEventListener("click", () => {
      if (window.KlgSounds) KlgSounds.click();
      document.getElementById("start-screen").classList.add("d-none");
      quiz.start();
    });
    document.getElementById("play-again-btn").addEventListener("click", () => quiz.start());
  });
})();
