/**
 * Piece Together — put a cut-up picture back together.
 *
 *   ?level=1  4 pieces, with the whole picture faintly on the board
 *   ?level=2  (default) 6 pieces, with a small copy of the picture beside the board
 *   ?level=3  9 pieces, with no picture to look at
 *
 * Pick a piece and tap its place, or drag it there. A piece in the wrong place
 * comes back. The first slip on a puzzle is only a nudge, since trying a piece
 * is how young children work a jigsaw out.
 */
(function () {
  "use strict";
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const [ROWS, COLS] = { 1: [2, 2], 2: [2, 3], 3: [3, 3] }[level];
  const { SCENES, svg } = KlgPieceScenes;

  KlgRound.run({
    total: 4,
    make(i, asked) {
      const fresh = SCENES.filter((s) => !asked.has(s.id));
      const scene = fresh[Math.floor(Math.random() * fresh.length)];
      asked.add(scene.id);
      return { scene: scene.id, rows: ROWS, cols: COLS, help: { 1: "ghost", 2: "peek", 3: "none" }[level] };
    },
    render(q, ctx) {
      const scene = SCENES.filter((s) => s.id === q.scene)[0];
      ctx.task(`Fit the pieces to make ${scene.name}.`, `Fit the pieces together to make ${scene.name}. Pick a piece, then tap where it goes.`);
      const pieces = [];
      for (let row = 0; row < q.rows; row++) for (let col = 0; col < q.cols; col++) pieces.push({ row, col, rows: q.rows, cols: q.cols, id: row + "," + col });
      let selected = null, slips = 0, placed = 0;

      const area = document.createElement("div");
      area.className = "pt-area";
      const board = document.createElement("div");
      board.className = "pt-board pt-level-" + level;
      board.style.setProperty("--rows", q.rows);
      board.style.setProperty("--cols", q.cols);
      board.dataset.puzzle = JSON.stringify(q);
      if (q.help === "ghost") {
        const ghost = document.createElement("div");
        ghost.className = "pt-ghost";
        ghost.innerHTML = svg(scene);
        board.appendChild(ghost);
      }
      if (q.help === "peek") {
        const peek = document.createElement("div");
        peek.className = "pt-peek";
        peek.setAttribute("role", "img");
        peek.setAttribute("aria-label", "The whole picture: " + scene.name);
        peek.innerHTML = svg(scene);
        area.appendChild(peek);
      }
      area.appendChild(board);

      const tray = document.createElement("div");
      tray.className = "pt-tray pt-level-" + level;
      tray.setAttribute("aria-label", "Picture pieces");
      const pieceEls = {};

      function select(id) {
        selected = id;
        Object.keys(pieceEls).forEach((k) => pieceEls[k].setAttribute("aria-pressed", String(k === id)));
      }
      function tryPlace(slot, id) {
        if (!id) return ctx.hint("Pick a piece first.");
        const el = pieceEls[id];
        if (slot.dataset.slot !== id) {
          el.classList.add("pk-shake");
          setTimeout(() => el.classList.remove("pk-shake"), 400);
          slips += 1;
          if (slips === 1) ctx.hint("That piece goes somewhere else. Look at its edges.");
          else ctx.wrong("That piece goes somewhere else. Look at its edges.");
          return;
        }
        const piece = pieces.filter((p) => p.id === id)[0];
        slot.innerHTML = svg(scene, piece);
        slot.classList.add("full");
        slot.disabled = true;
        slot.setAttribute("aria-label", "Piece in place");
        el.style.visibility = "hidden";
        placed += 1;
        const next = pieces.map((p) => p.id).filter((k) => pieceEls[k].style.visibility !== "hidden");
        select(next.length ? next[Math.floor(Math.random() * next.length)] : null);
        if (placed === pieces.length) {
          board.classList.add("pt-whole");
          ctx.right(`You made ${scene.name}.`);
        }
      }

      pieces.forEach((p) => {
        const slot = Object.assign(document.createElement("button"), { type: "button", className: "pt-slot" });
        slot.dataset.slot = p.id;
        slot.setAttribute("aria-label", `Place in row ${p.row + 1}, column ${p.col + 1}, empty`);
        slot.addEventListener("click", () => tryPlace(slot, selected));
        board.appendChild(slot);
      });
      KlgPlayKit.shuffled(pieces).forEach((p, i) => {
        const el = Object.assign(document.createElement("button"), { type: "button", className: "pt-piece" });
        el.innerHTML = svg(scene, p);
        el.style.setProperty("--w", 300 / p.cols);
        el.style.setProperty("--h", 300 / p.rows);
        el.dataset.piece = p.id;
        el.setAttribute("aria-label", `Picture piece ${i + 1} of ${pieces.length}`);
        el.setAttribute("aria-pressed", "false");
        el.addEventListener("click", () => select(p.id));
        KlgPlayKit.dragTo(el, ".pt-slot", (slot) => {
          select(p.id);
          if (!slot.disabled) tryPlace(slot, p.id);
        });
        pieceEls[p.id] = el;
        tray.appendChild(el);
      });

      select(tray.firstChild.dataset.piece);
      ctx.stage.append(area, tray);
    },
  });
})();
