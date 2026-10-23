/**
 * KlgFracVis — fractions you can see.
 *
 *   pie(n, d)            circle cut into d equal slices, n shaded
 *   bar(n, d)            a bar cut into d parts, n shaded
 *   set(n, d, emoji)     d things, n of them highlighted
 *   line(n, d, {max})    number line from 0 to max with a marker at n/d
 *   stacked([[n,d],…])   bars one above another, same width, to compare
 *   shadeable(d)         a pie where tapping slices shades them; .shaded() counts
 *
 * Every figure carries data-num and data-den (the shaded part) so the pictures
 * can be checked against the answer in tests, and a spoken aria-label.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const word = { 2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth", 8: "eighth", 10: "tenth", 12: "twelfth" };

  function say(n, d) {
    if (d === 1) return n + (n === 1 ? " whole" : " wholes");
    const w = word[d] || d + "ths";
    return n + " " + (n === 1 ? w : w + "s").replace("halfs", "halves");
  }

  function slicePath(i, d, r = 90) {
    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const p = (a) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return "M100 100 L" + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + r + " " + r + " 0 " + (1 / d > 0.5 ? 1 : 0) + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + " Z";
  }

  function pieSvg(d, shadedAt) {
    const svg = V.el("svg", { viewBox: "0 0 200 200", focusable: "false", "aria-hidden": "true" });
    if (d === 1) {
      svg.appendChild(V.el("circle", { cx: 100, cy: 100, r: 90, class: "kv-slice" + (shadedAt(0) ? " on" : "") }));
      return { svg, slices: [svg.firstChild] };
    }
    const slices = [];
    for (let i = 0; i < d; i++) {
      const s = V.el("path", { d: slicePath(i, d), class: "kv-slice" + (shadedAt(i) ? " on" : "") });
      slices.push(s);
      svg.appendChild(s);
    }
    return { svg, slices };
  }

  function mark(f, n, d) { f.dataset.num = String(n); f.dataset.den = String(d); return f; }

  function pie(n, d, { label } = {}) {
    const f = V.figure(label || "A pie cut into " + say(d, d) + ", " + n + " shaded", "kv-frac kv-pie");
    f.appendChild(pieSvg(d, (i) => i < n).svg);
    return mark(f, n, d);
  }

  function bar(n, d, { label } = {}) {
    const f = V.figure(label || "A bar cut into " + d + " equal parts, " + n + " shaded", "kv-frac kv-bar");
    const row = document.createElement("div");
    row.className = "kv-bar-row";
    row.setAttribute("aria-hidden", "true");
    for (let i = 0; i < d; i++) {
      const c = document.createElement("span");
      c.className = "kv-part" + (i < n ? " on" : "");
      row.appendChild(c);
    }
    f.appendChild(row);
    return mark(f, n, d);
  }

  function set(n, d, emoji, { label } = {}) {
    const f = V.figure(label || n + " of " + d + " " + emoji + " are highlighted", "kv-frac kv-set");
    const row = document.createElement("div");
    row.className = "kv-set-row";
    row.setAttribute("aria-hidden", "true");
    for (let i = 0; i < d; i++) {
      const c = document.createElement("span");
      c.className = "kv-set-item" + (i < n ? " on" : "");
      c.textContent = emoji;
      row.appendChild(c);
    }
    f.appendChild(row);
    return mark(f, n, d);
  }

  function line(n, d, { max = 1, label } = {}) {
    const f = V.figure(label || "A number line from 0 to " + max + " with a marker at " + n + "/" + d, "kv-frac kv-fline");
    const w = 300, pad = 24;
    const x = (v) => pad + (v / max) * (w - 2 * pad);
    const svg = V.el("svg", { viewBox: "0 0 " + w + " 70", focusable: "false", "aria-hidden": "true" });
    svg.appendChild(V.el("line", { x1: pad, y1: 36, x2: w - pad, y2: 36, class: "kv-tl-line" }));
    for (let i = 0; i <= max * d; i++) {
      svg.appendChild(V.el("line", { x1: x(i / d), y1: 28, x2: x(i / d), y2: 44, class: i % d === 0 ? "kv-tick-big" : "kv-tick" }));
    }
    for (let k = 0; k <= max; k++) svg.appendChild(V.el("text", { x: x(k), y: 62, class: "kv-tl-label", "text-anchor": "middle" }, String(k)));
    svg.appendChild(V.el("circle", { cx: x(n / d), cy: 36, r: 7, class: "kv-marker" }));
    f.appendChild(svg);
    return mark(f, n, d);
  }

  function stacked(list, { label } = {}) {
    const f = V.figure(label || "Bars side by side: " + list.map(([n, d]) => n + "/" + d).join(", "), "kv-frac kv-stacked");
    list.forEach(([n, d]) => f.appendChild(bar(n, d, { label: n + "/" + d }).cloneNode(true)));
    f.querySelectorAll("figure").forEach((x) => { x.removeAttribute("role"); x.removeAttribute("aria-label"); });
    f.dataset.parts = list.map(([n, d]) => n + "/" + d).join(" ");
    return f;
  }

  function shadeable(d, { label, onChange } = {}) {
    const f = V.figure(label || "A pie cut into " + d + " slices. Tap slices to shade them.", "kv-frac kv-pie kv-live");
    f.removeAttribute("role");
    const { svg, slices } = pieSvg(d, () => false);
    svg.removeAttribute("aria-hidden");
    f.appendChild(svg);
    const status = document.createElement("div");
    status.className = "kv-live-status";
    status.setAttribute("aria-live", "polite");
    const sync = function () {
      const n = slices.filter((s) => s.classList.contains("on")).length;
      mark(f, n, d);
      status.textContent = n + " of " + d + " slices shaded";
      if (onChange) onChange(n, d);
    };
    slices.forEach((s, i) => {
      s.setAttribute("tabindex", "0");
      s.setAttribute("role", "button");
      s.setAttribute("aria-label", "Slice " + (i + 1) + " of " + d);
      s.setAttribute("aria-pressed", "false");
      const flip = function () { s.classList.toggle("on"); s.setAttribute("aria-pressed", String(s.classList.contains("on"))); sync(); };
      s.addEventListener("click", flip);
      s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    });
    f.appendChild(status);
    f.shaded = () => slices.filter((s) => s.classList.contains("on")).length;
    f.clear = () => { slices.forEach((s) => { s.classList.remove("on"); s.setAttribute("aria-pressed", "false"); }); sync(); };
    sync();
    return f;
  }

  window.KlgFracVis = { pie, bar, set, line, stacked, shadeable, say };
})();
