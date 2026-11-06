/**
 * Pipe Garden — turn the pipes, then turn on the water.
 *
 *   ?level=1  3 × 3
 *   ?level=2  (default) 4 × 4
 *   ?level=3  5 × 5, with spare three-way pipes
 *
 * Water that stops early stays on show until a pipe is turned, so a child can
 * see where to look. See puzzle.js for how a garden stays solvable.
 */
(function () {
  "use strict";
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const SIZE = { 1: 3, 2: 4, 3: 5 }[level];
  const SHAPES = { I: "M50 0V100", L: "M50 0V50H100", T: "M50 0V50M0 50H100" };

  function pipeSvg(type) {
    const d = SHAPES[type];
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pg-outer" d="${d}"/><path class="pg-inner" d="${d}"/></svg>`;
  }

  /** A row of little signs above or below the grid, with one in the given column. */
  function signRow(size, column, text, name) {
    const row = document.createElement("div");
    row.className = "pg-signs";
    for (let x = 0; x < size; x++) {
      const cell = document.createElement("span");
      if (x === column) {
        cell.textContent = text;
        cell.id = name;
      }
      row.appendChild(cell);
    }
    return row;
  }

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let q, tries = 0;
      do { q = KlgPipePuzzle.make(SIZE); } while (asked.has(JSON.stringify(q)) && ++tries < 20);
      asked.add(JSON.stringify(q));
      return q;
    },
    render(q, ctx) {
      ctx.task("Turn the pipes, then turn on the water.", "Tap a pipe to turn it. Join the pipes from the tap to the flower, then turn on the water.");
      const turns = q.tiles.map((tile) => tile.r);
      const spins = turns.slice();
      const buttons = [];

      const board = document.createElement("div");
      board.className = "pg-board";
      board.style.setProperty("--n", q.size);
      board.dataset.puzzle = JSON.stringify(q);
      const grid = document.createElement("div");
      grid.className = "pg-grid";
      const flower = signRow(q.size, q.goal, "🌱", "pg-flower");

      function describe(i, wet) {
        const sides = KlgPipePuzzle.opens({ t: q.tiles[i].t, r: turns[i] }).sort().map((side) => KlgPipePuzzle.SIDE_NAMES[side]);
        return `Row ${Math.floor(i / q.size) + 1}, column ${(i % q.size) + 1}. Pipe joins ${sides.join(" and ")}.${wet ? " It has water." : ""} Tap to turn.`;
      }
      function paint(i, wet) {
        const b = buttons[i];
        b.dataset.rot = turns[i];
        b.firstElementChild.style.transform = `rotate(${spins[i] * 90}deg)`;
        b.classList.toggle("wet", !!wet);
        b.setAttribute("aria-label", describe(i, wet));
      }
      q.tiles.forEach((tile, i) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "pg-tile" });
        b.innerHTML = pipeSvg(tile.t);
        b.dataset.tile = i;
        b.addEventListener("click", () => {
          turns[i] = (turns[i] + 1) % 4;
          spins[i] += 1;
          if (window.KlgSounds) KlgSounds.click();
          // Turning a pipe lets the water drain, so the next try starts clean.
          buttons.forEach((_, n) => paint(n, false));
        });
        buttons.push(b);
        grid.appendChild(b);
        paint(i, false);
      });
      board.append(signRow(q.size, q.start, "🚰", "pg-tap"), grid, flower);

      const go = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "💧 Turn on the water", id: "pg-go" });
      go.addEventListener("click", () => {
        const { wet, reached } = KlgPipePuzzle.flow(q.size, q.start, q.goal, turns, q.tiles);
        buttons.forEach((_, n) => paint(n, wet.includes(n)));
        if (!reached) {
          return ctx.wrong(wet.length ? "The water stopped. Look where the blue ends and turn a pipe." : "The water cannot get in. Turn the pipe under the tap.");
        }
        document.getElementById("pg-flower").textContent = "🌻";
        [...buttons, go].forEach((b) => { b.disabled = true; });
        ctx.right("The water reached the flower!");
      });

      ctx.stage.append(board, go);
    },
  });
})();
