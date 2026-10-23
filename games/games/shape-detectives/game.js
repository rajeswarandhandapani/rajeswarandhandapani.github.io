/**
 * Shape Detectives — flat shapes, drawn.
 *
 *   count   a shape is drawn — how many sides (and corners) does it have?
 *   find    a grid of shapes — tap every one of the kind you are asked for
 *   mirror  a picture beside a dashed mirror line — which picture is its
 *           reflection? (only the sideways flip is right; upside-down and
 *           turned copies are offered as wrong answers)
 *
 *   ?level=1  triangle, square, rectangle, circle, pentagon
 *   ?level=2  (default) adds hexagon and octagon; squares vs rectangles
 *   ?level=3  adds the mirror questions
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const S = window.KlgShapes;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const SHAPES = level === 1 ? ["triangle", "square", "rectangle", "pentagon", "circle"]
    : ["triangle", "square", "rectangle", "pentagon", "hexagon", "octagon", "circle"];
  const KINDS = level === 1 ? ["count", "find"] : level === 2 ? ["count", "find", "find"] : ["count", "find", "mirror", "mirror"];
  const NEUTRAL = ["🐢", "🚗", "🦆", "🐍", "🎸", "🔑", "🦒", "👟", "🍕", "🐌", "🦜", "🐕"];
  const plural = (n) => (n === "circle" ? "circles" : n + "s");

  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const btn = (text, label, fn, cls) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn" + (cls ? " " + cls : ""), textContent: text });
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", fn);
    return b;
  };

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let kind, shape, tries = 0;
      do { kind = V.pick(KINDS); shape = V.pick(kind === "count" ? SHAPES.filter((x) => x !== "circle") : SHAPES); } while (asked.has(kind + shape) && ++tries < 30);
      asked.add(kind + shape);
      return { kind, shape };
    },
    render(q, ctx) {
      if (q.kind === "count") return renderCount(q, ctx);
      if (q.kind === "find") return renderFind(q, ctx);
      return renderMirror(q, ctx);
    },
  });

  function renderCount(q, ctx) {
    const sides = S.SIDES[q.shape];
    ctx.task(`How many sides does this shape have?`);
    const wrong = V.shuffle([3, 4, 5, 6, 7, 8, 9].filter((n) => n !== sides)).slice(0, 3);
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    V.shuffle([sides, ...wrong]).forEach((n) => {
      const b = btn(String(n), `${n} sides`, () => {
        if (n === sides) { ctx.right(`A ${q.shape} has ${sides} sides and ${sides} corners.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
        else { b.disabled = true; ctx.wrong("Touch each side with your finger as you count."); }
      });
      b.dataset.value = String(n);
      bar.appendChild(b);
    });
    const pic = S.polygon(q.shape, { label: "A shape to count" });
    pic.dataset.sides = String(sides);
    ctx.stage.append(pic, bar);
  }

  function renderFind(q, ctx) {
    ctx.task(`Tap every ${q.shape}. Then press Done.`);
    const others = SHAPES.filter((s) => s !== q.shape);
    // 9 cells: 3 or 4 of the asked shape, the rest are other shapes (the rectangle is always a fair decoy for squares).
    const targets = V.rand(3, 4);
    const cells = [...Array(targets).fill(q.shape)];
    while (cells.length < 9) cells.push(q.shape === "square" && cells.length === targets ? "rectangle" : V.pick(others));
    V.shuffle(cells);
    const grid = document.createElement("div");
    grid.className = "kv-shapegrid";
    const picked = new Set();
    cells.forEach((name, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kv-shapecell";
      b.dataset.shape = name;
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", name);
      b.appendChild(S.polygon(name, { label: name }));
      b.firstChild.removeAttribute("role");
      b.addEventListener("click", () => {
        const on = !picked.has(idx);
        on ? picked.add(idx) : picked.delete(idx);
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      grid.appendChild(b);
    });
    const done = btn("Done ✓", "Done choosing", () => {
      const right = cells.map((n, idx) => ({ idx, ok: n === q.shape }));
      const missed = right.filter((c) => c.ok && !picked.has(c.idx)).length;
      const extra = right.filter((c) => !c.ok && picked.has(c.idx)).length;
      if (!missed && !extra) { ctx.right(`There are ${targets} ${plural(q.shape)}.`); done.disabled = true; grid.querySelectorAll("button").forEach((b) => (b.disabled = true)); return; }
      if (!ctx.firstTry()) {
        grid.querySelectorAll(".kv-shapecell").forEach((b) => b.classList.toggle("on", b.dataset.shape === q.shape));
        ctx.reveal(`The ${plural(q.shape)} are highlighted. There are ${targets}.`);
        done.disabled = true; grid.querySelectorAll("button").forEach((b) => (b.disabled = true));
        return;
      }
      ctx.wrong(extra ? `One of your shapes is not a ${q.shape}. Check each side.` : `You found ${targets - missed} of ${targets}. Look for more ${plural(q.shape)}.`);
    }, "primary");
    grid.dataset.targets = String(targets);
    ctx.stage.append(grid, done);
  }

  function renderMirror(q, ctx) {
    const e = V.pick(NEUTRAL);
    ctx.task("Which picture is the reflection in the mirror line?");
    const strip = document.createElement("div");
    strip.className = "kv-mirror";
    strip.setAttribute("role", "img");
    strip.setAttribute("aria-label", "A picture next to a dashed mirror line");
    strip.innerHTML = `<span class="kv-mirror-pic" aria-hidden="true">${e}</span><span class="kv-mirror-line" aria-hidden="true"></span><span class="kv-mirror-q" aria-hidden="true">?</span>`;
    const opts = [
      { id: "mirror", css: "scaleX(-1)", label: "flipped sideways, like in a mirror" },
      { id: "same", css: "none", label: "the same way round" },
      { id: "upside", css: "scaleY(-1)", label: "upside down" },
      { id: "turned", css: "rotate(90deg)", label: "turned on its side" },
    ];
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    V.shuffle(opts).forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kv-btn kv-mirror-opt";
      b.dataset.option = o.id;
      b.setAttribute("aria-label", `The picture ${o.label}`);
      b.innerHTML = `<span style="display:inline-block;transform:${o.css};font-size:2.4rem" aria-hidden="true">${e}</span>`;
      b.addEventListener("click", () => {
        if (o.id === "mirror") { ctx.right("A reflection is flipped sideways, as if the line were a mirror."); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
        else { b.disabled = true; ctx.wrong("Not that one. Imagine folding the page along the dashed line."); }
      });
      bar.appendChild(b);
    });
    ctx.stage.append(strip, bar);
  }
})();
