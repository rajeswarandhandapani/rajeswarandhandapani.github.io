/**
 * Array Garden — build multiplication as rows × columns of seeds.
 *
 * The garden is a 10 × 10 bed. Drag (or tap) from the top-left corner to
 * plant a rectangle; the live label shows "3 rows × 5 = 15".
 *
 * Two kinds of task, mixed in a round of 6:
 *   build  "Plant 3 rows of 5 sunflowers"           — exactly 3 × 5
 *   ways   "Plant 12 tulips in equal rows. Find every way!"
 *          every rectangle of 12 that fits (2 × 6, 6 × 2, 3 × 4, 4 × 3) —
 *          which shows factor pairs and that 3 × 4 and 4 × 3 are
 *          turn-arounds with the same total.
 *
 *   ?level=1  build up to 5 × 5; ways for small totals
 *   ?level=2  (default) build up to 8 × 8
 *   ?level=3  build up to 10 × 10; ways for larger totals
 *
 * A task scores when it is finished without "Show me".
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const $ = (id) => document.getElementById(id);
  const N = 10;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const MAX = level === 1 ? 5 : level === 2 ? 8 : 10;
  const WAYS_TOTALS = level === 1 ? [6, 8, 9, 10] : level === 2 ? [12, 16, 18, 20] : [24, 30, 36, 40, 18];
  const PLANTS = ["🌻", "🌷", "🥕", "🌽", "🍓", "🌼"];
  const ROUND = 6;

  let tasks = [], index = 0, score = 0, task, sel = [0, 0], dragging = false, cells = [], helped = false;

  const fits = (r, c) => r >= 1 && c >= 1 && r <= N && c <= N;
  function waysFor(total) {
    const out = [];
    for (let r = 1; r <= N; r++) if (total % r === 0 && fits(r, total / r)) out.push([r, total / r]);
    return out;
  }

  function makeTasks() {
    const list = [];
    const ways = V.shuffle(WAYS_TOTALS).slice(0, 2);
    for (let i = 0; i < ROUND; i++) {
      const plant = V.pick(PLANTS);
      if (i === 2 || i === 5) {
        const total = ways.pop();
        list.push({ kind: "ways", total, plant, targets: waysFor(total), found: [] });
      } else {
        list.push({ kind: "build", rows: V.rand(2, MAX), cols: V.rand(2, MAX), plant });
      }
    }
    return list;
  }

  function buildGrid() {
    const grid = $("garden");
    grid.style.setProperty("--n", N);
    grid.replaceChildren();
    cells = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ag-cell";
        b.dataset.r = r + 1;
        b.dataset.c = c + 1;
        b.setAttribute("aria-label", `Plant ${r + 1} rows by ${c + 1} columns`);
        b.tabIndex = r === 0 && c === 0 ? 0 : -1;
        grid.appendChild(b);
        cells.push(b);
      }
    }
    const at = (e) => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      return t && t.classList.contains("ag-cell") ? [Number(t.dataset.r), Number(t.dataset.c)] : null;
    };
    grid.addEventListener("pointerdown", (e) => {
      const p = at(e);
      if (!p) return;
      e.preventDefault();
      dragging = true;
      grid.setPointerCapture(e.pointerId);
      setSel(p);
    });
    grid.addEventListener("pointermove", (e) => { if (dragging) { const p = at(e); if (p) setSel(p); } });
    const stop = () => { dragging = false; };
    grid.addEventListener("pointerup", stop);
    grid.addEventListener("pointercancel", stop);
    // Keyboard: arrows grow or shrink the planted rectangle, Enter checks.
    grid.addEventListener("keydown", (e) => {
      const [r, c] = sel;
      const moves = { ArrowDown: [r + 1, c], ArrowUp: [r - 1, c], ArrowRight: [r, c + 1], ArrowLeft: [r, c - 1] };
      if (moves[e.key]) {
        e.preventDefault();
        const [nr, nc] = moves[e.key];
        setSel([Math.max(1, Math.min(N, nr)), Math.max(1, Math.min(N, nc))]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        check();
      }
    });
  }

  function setSel(p) {
    sel = p;
    paint();
  }

  function paint() {
    const [rows, cols] = sel;
    cells.forEach((b) => {
      const on = Number(b.dataset.r) <= rows && Number(b.dataset.c) <= cols;
      b.classList.toggle("on", on);
      b.textContent = on ? task.plant : "";
    });
    $("garden-size").textContent = rows && cols ? `${rows} row${rows > 1 ? "s" : ""} × ${cols} = ${rows * cols}` : "";
    $("garden").setAttribute("aria-label", `Garden: ${rows} rows of ${cols} planted, ${rows * cols} plants`);
  }

  function show() {
    task = tasks[index];
    helped = false;
    sel = [0, 0];
    $("garden-count").textContent = `Task ${index + 1} / ${tasks.length}`;
    $("garden-score").textContent = `⭐ ${score}`;
    $("garden-task").textContent = task.kind === "build"
      ? `Plant ${task.rows} rows of ${task.cols} ${task.plant}`
      : `Plant ${task.total} ${task.plant} in equal rows. Find every way! (${task.targets.length} ways fit)`;
    $("garden-feedback").textContent = "Drag from the top-left corner to plant.";
    $("garden-next").hidden = true;
    $("garden-check").hidden = false;
    $("garden-help").hidden = false;
    renderFound();
    paint();
  }

  function renderFound() {
    const box = $("garden-found");
    box.replaceChildren();
    if (task.kind !== "ways") return;
    task.found.forEach(([r, c]) => box.appendChild(Object.assign(document.createElement("span"), { textContent: `${r} × ${c}` })));
  }

  function check() {
    const [r, c] = sel;
    if (!r) { $("garden-feedback").textContent = "Plant something first 🌱"; return; }
    if (task.kind === "build") {
      if (r === task.rows && c === task.cols) return complete(`${task.rows} rows of ${task.cols} = ${task.rows * task.cols} ${task.plant}. Lovely garden!`);
      KlgGameKit.oops();
      $("garden-feedback").textContent = r === task.cols && c === task.rows
        ? `That's ${r} rows of ${c} — turned around! Rows go across. Try ${task.rows} rows.`
        : `You planted ${r} × ${c} = ${r * c}. We need ${task.rows} rows of ${task.cols}.`;
      return;
    }
    if (r * c !== task.total) {
      KlgGameKit.oops();
      $("garden-feedback").textContent = `${r} × ${c} = ${r * c}, not ${task.total}. Try another shape.`;
      return;
    }
    if (task.found.some(([fr, fc]) => fr === r && fc === c)) {
      $("garden-feedback").textContent = `You already found ${r} × ${c}. Look for a different shape!`;
      return;
    }
    task.found.push([r, c]);
    renderFound();
    KlgGameKit.cheer($("garden-size"));
    const twin = task.found.some(([fr, fc]) => fr === c && fc === r) && r !== c;
    if (task.found.length === task.targets.length) {
      return complete(`All ${task.targets.length} ways to plant ${task.total}! ${task.targets.map(([a, b]) => `${a} × ${b}`).join(", ")}.`);
    }
    $("garden-feedback").textContent = (twin ? `${r} × ${c} is the turn-around of ${c} × ${r} — same total! ` : `${r} × ${c} = ${task.total} ✓ `) +
      `${task.targets.length - task.found.length} more to find.`;
  }

  function complete(message) {
    if (!helped) score += 1;
    KlgGameKit.cheer($("garden"));
    $("garden-feedback").textContent = message;
    $("garden-score").textContent = `⭐ ${score}`;
    $("garden-check").hidden = true;
    $("garden-help").hidden = true;
    $("garden-next").hidden = false;
    $("garden-next").focus();
  }

  function showMe() {
    helped = true;
    if (task.kind === "build") {
      setSel([task.rows, task.cols]);
      return check();
    }
    const missing = task.targets.find(([r, c]) => !task.found.some(([fr, fc]) => fr === r && fc === c));
    setSel(missing);
    check();
  }

  function next() {
    index += 1;
    if (index < tasks.length) return show();
    $("garden-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgGameKit.finish({ score, total: tasks.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  function start() {
    tasks = makeTasks();
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("garden-screen").classList.remove("d-none");
    show();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks($("level-links"), "level", "2");
    buildGrid();
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("garden-check").addEventListener("click", check);
    $("garden-clear").addEventListener("click", () => setSel([0, 0]));
    $("garden-help").addEventListener("click", showMe);
    $("garden-next").addEventListener("click", next);
    $("garden-exit").addEventListener("click", () => {
      $("garden-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
  });
})();
