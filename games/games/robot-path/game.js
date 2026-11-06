/**
 * Robot Path — plan a list of arrow steps, then run it.
 *
 *   ?level=1  3×3 grid, no rocks
 *   ?level=2  (default) 4×4 grid, 3 rocks
 *   ?level=3  5×5 grid, 6 rocks
 *
 * Every puzzle is checked to have a path before it is shown. Any path that
 * reaches the star is right. A plan that hits a rock or the wall shows where
 * the robot stopped, and the plan stays so it can be fixed.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const SIZE = { 1: 3, 2: 4, 3: 5 }[level];
  const ROCKS = { 1: 0, 2: 3, 3: 6 }[level];
  const MOVES = {
    up: { dx: 0, dy: -1, arrow: "⬆️", word: "up" },
    down: { dx: 0, dy: 1, arrow: "⬇️", word: "down" },
    left: { dx: -1, dy: 0, arrow: "⬅️", word: "left" },
    right: { dx: 1, dy: 0, arrow: "➡️", word: "right" },
  };
  const key = (x, y) => x + "," + y;

  /** Fewest steps from start to goal around the rocks, or null when walled off. */
  function shortest(size, start, goal, rocks) {
    const blocked = new Set(rocks.map((r) => key(r.x, r.y)));
    let frontier = [start], steps = 0;
    const seen = new Set([key(start.x, start.y)]);
    while (frontier.length) {
      const next = [];
      for (const at of frontier) {
        if (at.x === goal.x && at.y === goal.y) return steps;
        for (const m of Object.values(MOVES)) {
          const to = { x: at.x + m.dx, y: at.y + m.dy };
          if (to.x < 0 || to.y < 0 || to.x >= size || to.y >= size) continue;
          if (blocked.has(key(to.x, to.y)) || seen.has(key(to.x, to.y))) continue;
          seen.add(key(to.x, to.y));
          next.push(to);
        }
      }
      frontier = next;
      steps += 1;
    }
    return null;
  }

  function makePuzzle() {
    const cells = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) cells.push({ x, y });
    for (;;) {
      const [start, goal, ...rest] = V.shuffle(cells.slice());
      const rocks = rest.slice(0, ROCKS);
      const best = shortest(SIZE, start, goal, rocks);
      // Long enough to need planning, and short enough to fit the plan row.
      if (best !== null && best >= SIZE - 1) return { size: SIZE, start, goal, rocks, best };
    }
  }

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let q, tries = 0;
      do { q = makePuzzle(); } while (asked.has(JSON.stringify(q)) && ++tries < 20);
      asked.add(JSON.stringify(q));
      return q;
    },
    render(q, ctx) {
      ctx.task("Plan a path to the star. Then press Go.");
      const limit = q.best + 6;
      const rockSet = new Set(q.rocks.map((r) => key(r.x, r.y)));
      let plan = [];

      const grid = document.createElement("div");
      grid.className = "rp-grid";
      grid.style.setProperty("--rp-size", q.size);
      grid.setAttribute("role", "img");
      grid.dataset.puzzle = JSON.stringify(q);
      const describe = (robot) => `A grid ${q.size} squares wide. The robot is at column ${robot.x + 1}, row ${robot.y + 1}. The star is at column ${q.goal.x + 1}, row ${q.goal.y + 1}.` +
        (q.rocks.length ? " Rocks at " + q.rocks.map((r) => `column ${r.x + 1} row ${r.y + 1}`).join(", ") + "." : "");
      function draw(robot, trail) {
        grid.setAttribute("aria-label", describe(robot));
        grid.dataset.robot = key(robot.x, robot.y);
        const path = new Set((trail || []).map((t) => key(t.x, t.y)));
        grid.replaceChildren();
        for (let y = 0; y < q.size; y++) {
          for (let x = 0; x < q.size; x++) {
            const cell = document.createElement("div");
            cell.className = "rp-cell" + (path.has(key(x, y)) ? " rp-trail" : "");
            if (x === robot.x && y === robot.y) cell.textContent = "🤖";
            else if (x === q.goal.x && y === q.goal.y) cell.textContent = "⭐";
            else if (rockSet.has(key(x, y))) cell.textContent = "🪨";
            grid.appendChild(cell);
          }
        }
      }
      draw(q.start);

      const planRow = document.createElement("div");
      planRow.className = "rp-plan";
      planRow.setAttribute("aria-live", "polite");
      planRow.setAttribute("aria-label", "Your plan");
      const paintPlan = () => {
        planRow.replaceChildren(...plan.map((name) => Object.assign(document.createElement("span"), { textContent: MOVES[name].arrow })));
        if (!plan.length) planRow.textContent = "Your plan will appear here.";
        planRow.dataset.plan = plan.join(",");
        go.disabled = !plan.length;
        undo.disabled = !plan.length;
      };

      const arrows = document.createElement("div");
      arrows.className = "kv-controls rp-arrows";
      Object.keys(MOVES).forEach((name) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: MOVES[name].arrow });
        b.dataset.move = name;
        b.setAttribute("aria-label", "Add a step " + MOVES[name].word);
        b.addEventListener("click", () => {
          if (plan.length >= limit) return ctx.hint(`That is a long plan. The star can be reached in ${q.best} steps.`);
          plan.push(name);
          paintPlan();
        });
        arrows.appendChild(b);
      });

      const undo = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "↩️ Undo" });
      const go = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "▶️ Go", id: "rp-go" });
      const lock = () => [...arrows.children, undo, go].forEach((b) => { b.disabled = true; });
      undo.addEventListener("click", () => { plan.pop(); paintPlan(); });
      go.addEventListener("click", () => {
        let at = { ...q.start };
        const trail = [at];
        let trouble = "";
        for (const name of plan) {
          const to = { x: at.x + MOVES[name].dx, y: at.y + MOVES[name].dy };
          if (to.x < 0 || to.y < 0 || to.x >= q.size || to.y >= q.size) { trouble = "The robot bumped into the wall."; break; }
          if (rockSet.has(key(to.x, to.y))) { trouble = "The robot bumped into a rock."; break; }
          at = to;
          trail.push(at);
          if (at.x === q.goal.x && at.y === q.goal.y) break;
        }
        draw(at, trail);
        if (at.x === q.goal.x && at.y === q.goal.y) {
          lock();
          const steps = trail.length - 1;
          ctx.right(steps === q.best ? `${steps} steps, the shortest path there is!` : `${steps} steps. It can be done in ${q.best}.`);
        } else if (trouble) {
          ctx.wrong(trouble + " Change your plan and try again.");
        } else {
          ctx.wrong("The robot stopped before the star. Add more steps or change your plan.");
        }
      });
      const tools = document.createElement("div");
      tools.className = "kv-controls";
      tools.append(undo, go);
      paintPlan();
      ctx.stage.append(grid, planRow, arrows, tools);
    },
  });
})();
