/**
 * KlgBlocks — base-10 blocks and a place-value chart.
 *
 *   blocks(n, { highlight })   thousand cubes, hundred flats, ten rods and one cubes for n (0–9999)
 *   tenFrame(n, { emoji })     one or two ten-frames (2 × 5) filled with n counters (0–20)
 *   chart(n)                   Thousands | Hundreds | Tens | Ones table with the digits
 *   parts(n)                   { th, h, t, o }
 *
 * highlight: "th" | "h" | "t" | "o" fades the other kinds so a child can see one place.
 * Counts are on data-th / data-h / data-t / data-o and the total on data-value.
 * Numbers under 1000 leave out the thousands column.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function parts(n) { return { th: Math.floor(n / 1000) % 10, h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 }; }

  function make(cls, count, host) {
    for (let i = 0; i < count; i++) {
      const b = document.createElement("span");
      b.className = "kv-b " + cls;
      host.appendChild(b);
    }
  }

  const WORD = { th: "thousands", h: "hundreds", t: "tens", o: "ones" };

  function blocks(n, { highlight, label, compact } = {}) {
    const p = parts(n);
    const keys = n >= 1000 ? ["th", "h", "t", "o"] : ["h", "t", "o"];
    const said = keys.map((k) => p[k] + " " + WORD[k]);
    const f = V.figure(label || n + " shown with blocks: " + said.slice(0, -1).join(", ") + " and " + said[said.length - 1], "kv-blocks" + (n >= 1000 || compact ? " compact" : ""));
    f.dataset.th = String(p.th); f.dataset.h = String(p.h); f.dataset.t = String(p.t); f.dataset.o = String(p.o); f.dataset.value = String(n);
    const CLS = { th: "kv-thou", h: "kv-flat", t: "kv-rod", o: "kv-cube" };
    keys.forEach((k) => {
      const group = document.createElement("div");
      group.className = "kv-bgroup kv-col-" + k + (highlight && highlight !== k ? " dim" : "");
      group.setAttribute("aria-hidden", "true");
      make(CLS[k], p[k], group);
      f.appendChild(group);
    });
    return f;
  }

  function chart(n, { label } = {}) {
    const p = parts(n);
    const keys = n >= 1000 ? ["th", "h", "t", "o"] : ["h", "t", "o"];
    const said = keys.map((k) => p[k] + " " + WORD[k]);
    const f = V.figure(label || n + " in a place-value chart: " + said.join(", "), "kv-pvchart");
    f.dataset.value = String(n);
    const t = document.createElement("table");
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = "<tr>" + keys.map((k) => "<th>" + WORD[k][0].toUpperCase() + WORD[k].slice(1) + "</th>").join("") + "</tr><tr>" + keys.map((k) => "<td>" + p[k] + "</td>").join("") + "</tr>";
    f.appendChild(t);
    return f;
  }

  /**
   * split: the first `split` counters are one colour, the rest another (a + b).
   * crossed: the last `crossed` of the n counters are struck out (n − crossed left).
   */
  function tenFrame(n, { emoji, label, split, crossed } = {}) {
    const said = split !== undefined ? split + " red counters and " + (n - split) + " blue counters"
      : crossed ? n + " counters with " + crossed + " crossed out"
      : n + " counters in ten-frames";
    const f = V.figure(label || said, "kv-tenframes");
    f.dataset.value = String(n);
    if (split !== undefined) f.dataset.split = String(split);
    if (crossed) f.dataset.crossed = String(crossed);
    const frames = n > 10 ? 2 : 1;
    for (let k = 0; k < frames; k++) {
      const frame = document.createElement("div");
      frame.className = "kv-frame";
      frame.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 10; i++) {
        const at = k * 10 + i;
        const cell = document.createElement("span");
        const filled = at < n;
        let cls = "kv-cell" + (filled ? " on" : "");
        if (filled && split !== undefined) cls += at < split ? " c1" : " c2";
        if (filled && crossed && at >= n - crossed) { cls += " x"; cell.textContent = "✕"; }
        else if (filled && emoji) cell.textContent = emoji;
        cell.className = cls;
        frame.appendChild(cell);
      }
      f.appendChild(frame);
    }
    return f;
  }

  window.KlgBlocks = { blocks, chart, parts, tenFrame };
})();
