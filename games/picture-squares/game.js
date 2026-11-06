/**
 * Picture Squares — each picture once in every row and every column.
 *
 *   ?level=1  3 × 3
 *   ?level=2  (default) 4 × 4
 *   ?level=3  5 × 5
 *
 * Tap an empty square, then a picture. Check marks the squares that clash, so a
 * child can see what to change. See puzzle.js for how a puzzle stays solvable.
 */
(function () {
  "use strict";
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const SIZE = { 1: 3, 2: 4, 3: 5 }[level];

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let q, tries = 0;
      do { q = KlgSquaresPuzzle.make(SIZE); } while (asked.has(JSON.stringify(q.grid)) && ++tries < 20);
      asked.add(JSON.stringify(q.grid));
      return q;
    },
    render(q, ctx) {
      const names = q.pictures.map((p) => p.name);
      ctx.task("Every row and column needs one of each picture.",
        `Every row and every column needs one of each picture: ${names.join(", ")}. Tap an empty square, then tap a picture.`);
      const fill = q.grid.map((row) => row.slice());
      const blanks = {};
      let chosen = null;

      const board = document.createElement("div");
      board.className = "ps-grid";
      board.style.setProperty("--n", q.size);
      board.dataset.puzzle = JSON.stringify(q);
      const key = (r, c) => r + "," + c;
      const label = (r, c) => `Row ${r + 1}, column ${c + 1}, ` + (fill[r][c] === null ? "empty" : q.pictures[fill[r][c]].name);

      q.grid.forEach((row, r) => row.forEach((pic, c) => {
        if (pic !== null) {
          const given = document.createElement("div");
          given.className = "ps-cell ps-given";
          given.textContent = q.pictures[pic].emoji;
          given.setAttribute("role", "img");
          given.setAttribute("aria-label", label(r, c));
          board.appendChild(given);
          return;
        }
        const b = Object.assign(document.createElement("button"), { type: "button", className: "ps-cell ps-blank" });
        b.dataset.square = key(r, c);
        b.setAttribute("aria-label", label(r, c));
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => choose(key(r, c)));
        blanks[key(r, c)] = b;
        board.appendChild(b);
      }));

      function choose(id) {
        chosen = id;
        Object.keys(blanks).forEach((k) => blanks[k].setAttribute("aria-pressed", String(k === id)));
      }
      function clearMarks() {
        Object.values(blanks).forEach((b) => b.classList.remove("wrong"));
      }
      function put(pic) {
        if (!chosen) return ctx.hint("Tap an empty square first.");
        const [r, c] = chosen.split(",").map(Number);
        fill[r][c] = pic;
        blanks[chosen].textContent = pic === null ? "" : q.pictures[pic].emoji;
        blanks[chosen].setAttribute("aria-label", label(r, c));
        clearMarks();
        // Moving on to the next empty square saves a tap; a full grid keeps the last square chosen.
        if (pic !== null) {
          const ids = Object.keys(blanks);
          const after = ids.slice(ids.indexOf(chosen) + 1).concat(ids);
          const next = after.find((k) => { const [nr, nc] = k.split(",").map(Number); return fill[nr][nc] === null; });
          if (next) choose(next);
        }
      }

      const picks = document.createElement("div");
      picks.className = "kv-controls ps-picks";
      q.pictures.forEach((p, pic) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn ps-pick", textContent: p.emoji });
        b.dataset.pick = pic;
        b.setAttribute("aria-label", p.name);
        b.addEventListener("click", () => put(pic));
        picks.appendChild(b);
      });

      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "↩️ Clear" });
      clear.addEventListener("click", () => put(null));
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "✅ Check", id: "ps-check" });
      check.addEventListener("click", () => {
        if (fill.some((row) => row.includes(null))) return ctx.hint("Fill every empty square first.");
        const clashes = (r, c) => fill.some((row, i) => (i !== r && row[c] === fill[r][c]) || (i !== c && fill[r][i] === fill[r][c]));
        clearMarks();
        const bad = Object.keys(blanks).filter((k) => { const [r, c] = k.split(",").map(Number); return clashes(r, c); });
        if (bad.length) {
          bad.forEach((k) => blanks[k].classList.add("wrong"));
          return ctx.wrong("The dashed squares match a picture in their row or column. Change one.");
        }
        [...picks.children, clear, check, ...Object.values(blanks)].forEach((b) => { b.disabled = true; });
        ctx.right("Every row and column has one of each.");
      });
      const tools = document.createElement("div");
      tools.className = "kv-controls";
      tools.append(clear, check);

      choose(Object.keys(blanks)[0]);
      ctx.stage.append(board, picks, tools);
    },
  });
})();
