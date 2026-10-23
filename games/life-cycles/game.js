/**
 * Life Cycles — how living things grow and change.
 *
 *   next   the first stages are shown and a box asks "?" — pick what comes next
 *   order  every stage is jumbled — put them in order (tap to place)
 *
 *   ?level=1  "what comes next?" with three-to-four stage cycles
 *   ?level=2  (default) mixes "what comes next?" and putting every stage in order
 *
 * The wrong picks for "what comes next" are stages from other life cycles,
 * never an earlier stage of the same one.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const CYCLES = [
    { name: "butterfly", steps: [["🥚", "Egg"], ["🐛", "Caterpillar"], ["🌰", "Chrysalis"], ["🦋", "Butterfly"]] },
    { name: "frog", steps: [["🫧", "Frogspawn"], ["🐟", "Tadpole"], ["🐸", "Frog"]] },
    { name: "chicken", steps: [["🥚", "Egg"], ["🐣", "Hatching"], ["🐥", "Chick"], ["🐔", "Hen"]] },
    { name: "apple tree", steps: [["🌰", "Seed"], ["🌱", "Sprout"], ["🌳", "Tree"], ["🍎", "Apple"]] },
    { name: "sunflower", steps: [["🌰", "Seed"], ["🌱", "Sprout"], ["🌿", "Plant"], ["🌻", "Flower"]] },
    { name: "person", steps: [["👶", "Baby"], ["🧒", "Child"], ["🧑", "Adult"], ["🧓", "Older person"]] },
  ];

  const card = (emoji, caption) => {
    const box = document.createElement("span");
    box.className = "kv-storycard";
    box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:2.2rem">${emoji}</span><span class="kv-caption">${caption}</span>`;
    return box;
  };

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let cycle, kind, tries = 0;
      do { cycle = V.pick(CYCLES); kind = level === 1 ? "next" : V.pick(["next", "order"]); } while (asked.has(cycle.name + kind) && ++tries < 40);
      asked.add(cycle.name + kind);
      return { cycle, kind };
    },
    render(q, ctx) {
      const steps = q.cycle.steps;
      if (q.kind === "order") {
        ctx.task(`Put the life of the ${q.cycle.name} in order. What happens first?`);
        const host = document.createElement("div");
        const cards = steps.map(([e, c], idx) => ({ id: String(idx), label: c, node: () => card(e, c) }));
        const order = steps.map((s, idx) => String(idx));
        const board = KlgPlayKit.orderCards({ host, cards, order });
        const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Start again" });
        clear.addEventListener("click", () => board.reset());
        const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
        check.setAttribute("aria-label", "Check the order");
        check.addEventListener("click", () => {
          if (!board.isFull()) return ctx.hint("Put every picture in a box first.");
          if (board.check()) { ctx.right(steps.map((s) => s[1]).join(" → ") + "."); check.disabled = clear.disabled = true; }
          else if (!ctx.firstTry()) {
            board.reset(); order.forEach((id) => host.querySelector(`.pk-card[data-id="${id}"]`).click()); board.check();
            ctx.reveal(steps.map((s) => s[1]).join(" → ") + "."); check.disabled = clear.disabled = true;
          } else ctx.wrong("Some are in the wrong box (red). What does it look like when it is newest?");
        });
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        bar.append(clear, check);
        ctx.stage.append(host, bar);
        return;
      }
      // "What comes next?": show the stages up to a gap.
      const gap = V.rand(1, steps.length - 1);
      ctx.task(`The ${q.cycle.name}: what comes next?`);
      const row = document.createElement("div");
      row.className = "kv-cyclerow";
      row.dataset.cycle = q.cycle.name;
      steps.slice(0, gap).forEach(([e, c]) => {
        const c1 = document.createElement("div");
        c1.className = "kv-cyclecell";
        c1.appendChild(card(e, c));
        row.append(c1, Object.assign(document.createElement("span"), { className: "kv-op", textContent: "➜" }));
      });
      const hole = document.createElement("div");
      hole.className = "kv-cyclecell kv-next";
      hole.textContent = "?";
      hole.setAttribute("aria-label", "What comes next?");
      row.appendChild(hole);
      const answer = steps[gap];
      const wrongs = V.shuffle(CYCLES.filter((c) => c !== q.cycle).flatMap((c) => c.steps)
        .filter(([e, c]) => e !== answer[0] && c !== answer[1] && !steps.some((s) => s[0] === e || s[1] === c)))
        .filter((s, idx, all) => all.findIndex((x) => x[0] === s[0]) === idx).slice(0, 3);
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      V.shuffle([answer, ...wrongs]).forEach(([e, c]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn kv-picbtn";
        b.dataset.stage = c;
        b.setAttribute("aria-label", c);
        b.appendChild(card(e, c));
        b.addEventListener("click", () => {
          if (c === answer[1]) {
            hole.replaceChildren(card(e, c)); hole.classList.remove("kv-next");
            ctx.right(`After ${steps[gap - 1][1].toLowerCase()} comes ${c.toLowerCase()}.`);
            bar.querySelectorAll("button").forEach((x) => (x.disabled = true));
          } else { b.disabled = true; ctx.wrong("Think about how the " + q.cycle.name + " grows. What happens next?"); }
        });
        bar.appendChild(b);
      });
      row.dataset.answer = answer[1];
      ctx.stage.append(row, bar);
    },
  });
})();
