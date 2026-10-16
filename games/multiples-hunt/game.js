/**
 * Multiples Hunt — find every multiple of a number on a 1–100 grid.
 *
 * Tap the numbers in the times table; each correct tap lights up, so the
 * table's pattern appears (columns for 2, 5 and 10, diagonals for 3, 9
 * and 11). "Done" checks for any that were missed. A short note explains
 * the pattern afterwards.
 *
 *   ?n=7       hunt one particular table
 *   ?level=1   tables 2, 5, 10 · level 2 (default) 2–6 · level 3 3–9
 *
 * Three hunts per round. A hunt scores when nothing is missed and there
 * are at most 2 wrong taps.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const level = [1, 3].includes(Number(params.get("level"))) ? Number(params.get("level")) : 2;
  const fixed = Number(params.get("n"));
  const TABLES = fixed >= 2 && fixed <= 12 ? [fixed] : level === 1 ? [2, 5, 10] : level === 2 ? [2, 3, 4, 5, 6] : [3, 4, 6, 7, 8, 9];
  const MAX = level === 1 ? 50 : 100;
  const ROUND = 3;

  const PATTERNS = {
    2: "Multiples of 2 are the even numbers: they end in 0, 2, 4, 6 or 8 — five straight columns!",
    3: "Multiples of 3 make slanting lines. Their digits add up to 3, 6 or 9 (like 2 + 7 = 9 for 27).",
    4: "Multiples of 4 are every other multiple of 2 — they're all even.",
    5: "Multiples of 5 always end in 5 or 0 — two straight columns.",
    6: "Multiples of 6 are even AND multiples of 3.",
    7: "Multiples of 7 step down-and-left like stairs. 7 × 7 = 49 is in the middle.",
    8: "Multiples of 8 are every other multiple of 4, and every one is even.",
    9: "Multiples of 9 make a diagonal. The digits add up to 9: 18, 27, 36, 45…",
    10: "Multiples of 10 all end in 0 — one straight column on the right.",
    11: "Multiples of 11 below 100 have two matching digits: 11, 22, 33…",
    12: "Multiples of 12 are multiples of 3 and of 4.",
  };

  let hunts = [], index = 0, score = 0, n, found, wrong, done;

  function grid() {
    const box = $("hunt-grid");
    box.replaceChildren();
    for (let v = 1; v <= MAX; v++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mh-cell";
      b.textContent = v;
      b.dataset.v = v;
      b.addEventListener("click", () => tap(b, v));
      box.appendChild(b);
    }
  }

  function targets() {
    return Array.from({ length: Math.floor(MAX / n) }, (_, i) => (i + 1) * n);
  }

  function show() {
    n = hunts[index];
    found = new Set();
    wrong = 0;
    done = false;
    grid();
    $("hunt-count").textContent = `Hunt ${index + 1} / ${hunts.length}`;
    $("hunt-score").textContent = `⭐ ${score}`;
    $("hunt-task").textContent = `Tap every multiple of ${n} up to ${MAX}.`;
    $("hunt-feedback").textContent = `Start with ${n}, then keep adding ${n}.`;
    $("hunt-table").textContent = "";
    $("hunt-done").hidden = false;
    $("hunt-next").hidden = true;
  }

  function tap(b, v) {
    if (done || found.has(v)) return;
    if (v % n === 0) {
      found.add(v);
      b.classList.add("found");
      b.setAttribute("aria-pressed", "true");
      if (window.KlgSounds) KlgSounds.correct();
      const list = [...found].sort((x, y) => x - y);
      $("hunt-table").textContent = list.join(", ");
      $("hunt-feedback").textContent = `${v / n} × ${n} = ${v} ✓ · ${targets().length - found.size} to go`;
      if (found.size === targets().length) finishHunt();
    } else {
      wrong += 1;
      KlgGameKit.oops();
      b.classList.add("miss");
      setTimeout(() => b.classList.remove("miss"), 700);
      const below = Math.floor(v / n) * n;
      $("hunt-feedback").textContent = `${v} is not in the ${n} times table (${below ? below + " and " : ""}${below + n} are).`;
    }
  }

  function finishHunt() {
    done = true;
    const missing = targets().filter((v) => !found.has(v));
    missing.forEach((v) => document.querySelector(`.mh-cell[data-v="${v}"]`).classList.add("missed"));
    const good = !missing.length && wrong <= 2;
    if (good) { score += 1; KlgGameKit.cheer($("hunt-grid")); }
    $("hunt-score").textContent = `⭐ ${score}`;
    $("hunt-feedback").textContent = (missing.length
      ? `You missed ${missing.length}: ${missing.join(", ")} (dashed). `
      : `You found all ${targets().length}! `) + (PATTERNS[n] || "");
    $("hunt-done").hidden = true;
    $("hunt-next").hidden = false;
    $("hunt-next").focus();
  }

  function next() {
    index += 1;
    if (index < hunts.length) return show();
    $("hunt-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgGameKit.finish({ score, total: hunts.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  function start() {
    hunts = TABLES.length === 1 ? [TABLES[0]] : V.shuffle(TABLES).slice(0, ROUND);
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("hunt-screen").classList.remove("d-none");
    show();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks($("level-links"), "level", "2");
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("hunt-done").addEventListener("click", finishHunt);
    $("hunt-next").addEventListener("click", next);
    $("hunt-exit").addEventListener("click", () => {
      $("hunt-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
  });
})();
