/**
 * Block Builder — place value with base-10 blocks.
 *
 *   build  "Build 143": add flats (100), rods (10) and cubes (1). A build
 *          counts when it shows the number with the fewest blocks.
 *   trade  Start with too many cubes (or rods); trade ten ones for a ten and
 *          ten tens for a hundred until the fewest blocks show the number.
 *   read   Count the blocks and pick the number.
 *
 *   ?level=1  numbers up to 99 (rods and cubes)
 *   ?level=2  (default) up to 999
 *   ?level=3  up to 999, with trades that reach a hundred
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const MAX = level === 1 ? 99 : 999;
  const KINDS = level === 1 ? ["build", "build", "read"] : level === 2 ? ["build", "read", "trade"] : ["build", "trade", "trade", "read"];

  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const value = (c) => c.h * 100 + c.t * 10 + c.o;
  const parts = (n) => ({ h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 });
  const same = (a, b) => a.h === b.h && a.t === b.t && a.o === b.o;
  const WORDS = { h: "hundred flat", t: "ten rod", o: "one cube" };
  const CLASS = { h: "kv-flat", t: "kv-rod", o: "kv-cube" };

  function button(text, label, fn, cls) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn" + (cls ? " " + cls : ""), textContent: text });
    b.setAttribute("aria-label", label);
    b.addEventListener("click", fn);
    return b;
  }

  /** The blocks the child is building: tap one to remove it. */
  function workspace(counts, onChange) {
    const box = document.createElement("div");
    box.className = "kv-blocks kv-work";
    box.setAttribute("aria-live", "polite");
    function paint() {
      box.replaceChildren();
      ["h", "t", "o"].forEach((k) => {
        const group = document.createElement("div");
        group.className = "kv-bgroup kv-col-" + k;
        for (let i = 0; i < counts[k]; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-b " + CLASS[k] + " kv-removable";
          b.setAttribute("aria-label", `Take away a ${WORDS[k]}`);
          b.addEventListener("click", () => { counts[k] -= 1; paint(); onChange(); });
          group.appendChild(b);
        }
        box.appendChild(group);
      });
      box.dataset.h = counts.h; box.dataset.t = counts.t; box.dataset.o = counts.o; box.dataset.value = value(counts);
      if (!value(counts)) box.textContent = "No blocks yet";
    }
    paint();
    return { box, paint };
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      const kind = V.pick(KINDS);
      let n, tries = 0;
      do {
        n = kind === "trade" ? (level === 3 ? V.rand(100, 459) : V.rand(12, 99)) : V.rand(level === 1 ? 11 : 101, MAX);
      } while (asked.has(kind + n) && ++tries < 30);
      asked.add(kind + n);
      return { kind, n };
    },
    render(q, ctx) {
      const target = parts(q.n);
      if (q.kind === "read") return renderRead(q, ctx);

      // Trade rounds start with some tens (or a hundred) already broken into smaller blocks.
      let counts = { h: 0, t: 0, o: 0 };
      if (q.kind === "trade") {
        if (level === 3 && target.h >= 1) {
          const k = V.rand(0, 1);
          counts = { h: target.h - 1, t: target.t + 10 - k, o: target.o + 10 * k };
        } else {
          const k = V.rand(1, Math.min(2, target.t));
          counts = { h: target.h, t: target.t - k, o: target.o + 10 * k };
        }
      }
      ctx.task(q.kind === "trade"
        ? `Trade blocks so ${q.n} uses the fewest blocks.`
        : `Build the number ${q.n} with blocks.`);
      const status = document.createElement("div");
      status.className = "kv-readout";
      const ws = workspace(counts, update);
      function update() {
        status.textContent = q.kind === "trade" ? `${counts.h} hundreds, ${counts.t} tens, ${counts.o} ones` : `You have ${value(counts)}`;
        tradeOnes.disabled = counts.o < 10;
        tradeTens.disabled = counts.t < 10;
      }
      const add = (k) => () => { if (value(counts) < 1000 && counts[k] < 30) { counts[k] += 1; ws.paint(); update(); } };
      const addBar = document.createElement("div");
      addBar.className = "kv-controls";
      if (level > 1) addBar.append(button("+ 100", "Add a hundred flat", add("h")));
      addBar.append(button("+ 10", "Add a ten rod", add("t")), button("+ 1", "Add a one cube", add("o")));
      const tradeOnes = button("10 ones → 1 ten", "Trade ten ones for one ten", () => { if (counts.o >= 10) { counts.o -= 10; counts.t += 1; ws.paint(); update(); } });
      const tradeTens = button("10 tens → 1 hundred", "Trade ten tens for one hundred", () => { if (counts.t >= 10) { counts.t -= 10; counts.h += 1; ws.paint(); update(); } });
      const tradeBar = document.createElement("div");
      tradeBar.className = "kv-controls";
      tradeBar.append(tradeOnes);
      if (level > 1) tradeBar.append(tradeTens);
      const check = button("Check ✓", "Check my blocks", () => {
        const fewest = same(counts, target);
        const lock = () => { check.disabled = true; ctx.stage.querySelectorAll("button").forEach((b) => { if (b !== check) b.disabled = true; }); };
        if (fewest) { ctx.right(`${target.h} hundreds, ${target.t} tens and ${target.o} ones make ${q.n}.`); lock(); }
        else if (!ctx.firstTry()) {
          Object.assign(counts, target); ws.paint(); update();
          ctx.reveal(`${q.n} is ${target.h} hundreds, ${target.t} tens and ${target.o} ones.`); lock();
        } else if (value(counts) === q.n) ctx.wrong("The number is right, but you can use fewer blocks. Trade 10 small blocks for 1 bigger block.");
        else if (value(counts) < q.n) ctx.wrong(`You have ${value(counts)}. You need ${q.n - value(counts)} more.`);
        else ctx.wrong(`You have ${value(counts)}. That is ${value(counts) - q.n} too many.`);
      }, "primary");
      const row = document.createElement("div");
      row.className = "kv-controls";
      row.append(check);
      ctx.stage.append(ws.box, status, addBar, tradeBar, row);
      update();
    },
  });

  function renderRead(q, ctx) {
    ctx.task("What number do the blocks show?");
    const p = parts(q.n);
    const wrong = new Set();
    const cand = V.shuffle([
      p.o * 100 + p.t * 10 + p.h, p.t * 100 + p.h * 10 + p.o, q.n + 10, q.n - 10, q.n + 100, q.n - 100, q.n + 1, q.n - 1, p.h + p.t + p.o,
    ]);
    cand.forEach((v) => { if (v > 0 && v !== q.n && wrong.size < 3) wrong.add(v); });
    const choices = V.shuffle([q.n, ...wrong]);
    const blocks = KlgBlocks.blocks(q.n, { label: "Blocks to count" });
    blocks.setAttribute("aria-label", `${p.h} hundred flats, ${p.t} ten rods and ${p.o} one cubes`);
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    choices.forEach((v) => {
      const b = button(String(v), `${v}`, () => {
        if (b.dataset.done) return;
        if (v === q.n) { ctx.right(`${p.h} hundreds, ${p.t} tens and ${p.o} ones make ${q.n}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
        else { b.disabled = true; ctx.wrong("Count the flats, rods and cubes, then try again."); }
      });
      b.dataset.value = String(v);
      bar.appendChild(b);
    });
    ctx.stage.append(blocks, bar);
  }
})();
