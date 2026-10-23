/**
 * Pizza Fractions — shade, match and order fractions of a pizza.
 *
 *   ?level=1  shade halves and quarters
 *   ?level=2  (default) shade any fraction, and shade an equal fraction
 *   ?level=3  also put three pizzas in order from smallest to biggest
 *
 * Shading works by tapping slices (or Enter/Space on a focused slice). Each
 * pizza is checked by counting shaded slices against the fraction asked for;
 * equal fractions are compared by cross-multiplying, so 2/4 is accepted for 1/2.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const F = window.KlgFracVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const DENOMS = level === 1 ? [2, 4] : level === 2 ? [2, 3, 4, 6, 8] : [3, 4, 5, 6, 8, 10, 12];
  const KINDS = level === 1 ? ["shade"] : level === 2 ? ["shade", "shade", "equal"] : ["shade", "equal", "order"];

  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const pizza = (fig) => { fig.classList.add("kv-pizza"); return fig; };
  const word = (n, d) => F.say(n, d);

  function makeOrder() {
    const pool = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [3, 8], [5, 8], [1, 8], [2, 5], [3, 5]];
    for (;;) {
      const picks = V.shuffle(pool).slice(0, 3);
      const values = picks.map(([n, d]) => n / d);
      if (new Set(values.map((v) => v.toFixed(4))).size === 3) return picks;
    }
  }

  KlgRound.run({
    total: 6,
    make(i, asked) {
      const kind = V.pick(KINDS);
      if (kind === "order") return { kind, items: makeOrder() };
      let d, n, k = 1, key, tries = 0;
      do {
        d = V.pick(kind === "equal" ? [2, 3, 4].filter((x) => DENOMS.includes(x) || level >= 2) : DENOMS);
        n = V.rand(1, d - 1);
        k = kind === "equal" ? V.pick(d <= 3 ? [2, 3, 4] : [2]) : 1;
        key = `${kind}:${n}/${d}x${k}`;
      } while (asked.has(key) && ++tries < 40); // few fractions at level 1, so repeats are allowed
      asked.add(key);
      return { kind, n, d, k };
    },
    render(q, ctx) {
      if (q.kind === "order") return renderOrder(q, ctx);
      const slices = q.d * q.k;
      const need = q.n * q.k;
      const live = pizza(F.shadeable(slices));
      if (q.kind === "equal") {
        ctx.task(`Shade the same amount of pizza as ${word(q.n, q.d)}.`);
        ctx.stage.append(pizza(F.pie(q.n, q.d, { label: `A pizza with ${q.n} of ${q.d} slices shaded` })));
      } else {
        ctx.task(`Shade ${q.n}/${q.d} of the pizza (${word(q.n, q.d)}).`);
      }
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Clear" });
      clear.addEventListener("click", () => live.clear());
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
      check.setAttribute("aria-label", "Check my pizza");
      check.addEventListener("click", () => {
        const n = live.shaded();
        if (n * q.d === q.n * slices) {
          ctx.right(`${n} of ${slices} slices is ${q.kind === "equal" ? "the same as " + q.n + "/" + q.d : q.n + "/" + q.d}.`);
          check.disabled = clear.disabled = true;
        } else if (!ctx.firstTry()) {
          // second miss: show the answer
          for (let s = 0; s < need; s++) live.querySelectorAll(".kv-slice")[s].classList.add("on");
          ctx.reveal(`${need} of ${slices} slices makes ${q.kind === "equal" ? "the same amount as " : ""}${q.n}/${q.d}.`);
          check.disabled = clear.disabled = true;
        } else {
          ctx.wrong(n === 0 ? "Tap the slices to shade them." : n * q.d > q.n * slices ? "That is too much. Take a slice away." : "A little more. Shade another slice.");
        }
      });
      bar.append(clear, check);
      ctx.stage.append(live, bar);
    },
  });

  function renderOrder(q, ctx) {
    ctx.task("Put the pizzas in order, smallest to biggest. Tap them one by one.");
    const host = document.createElement("div");
    const cards = q.items.map(([n, d], idx) => ({
      id: String(idx),
      node: () => pizza(F.pie(n, d, { label: `A pizza with ${n} of ${d} slices shaded` })),
      label: `Pizza with ${n} of ${d} slices shaded`,
    }));
    const order = q.items.map((v, idx) => idx).sort((a, b) => q.items[a][0] / q.items[a][1] - q.items[b][0] / q.items[b][1]).map(String);
    const board = KlgPlayKit.orderCards({ host, cards, order });
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Start again" });
    clear.addEventListener("click", () => board.reset());
    const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
    check.setAttribute("aria-label", "Check the order");
    check.addEventListener("click", () => {
      if (!board.isFull()) return ctx.hint("Put all three pizzas in the boxes first.");
      if (board.check()) {
        ctx.right("Smallest to biggest: " + order.map((id) => q.items[id].join("/")).join(" < ") + ".");
        check.disabled = clear.disabled = true;
      } else if (!ctx.firstTry()) {
        ctx.reveal("The right order is " + order.map((id) => q.items[id].join("/")).join(" < ") + ".");
        check.disabled = clear.disabled = true;
      } else ctx.wrong("Not quite. Look at how much of each pizza is shaded.");
    });
    bar.append(clear, check);
    ctx.stage.append(host, bar);
  }
})();
