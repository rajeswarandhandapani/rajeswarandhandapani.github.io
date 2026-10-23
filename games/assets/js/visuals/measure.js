/**
 * KlgMeasureVis — things to measure.
 *
 *   ruler(len, { unit, emoji, max, marker })   an object laid against a ruler from 0;
 *                                      marker: true adds a movable line, figure.setMarker(v)
 *   balance(left, right, { leftEmoji, rightEmoji })  scales that tip to the heavier side
 *   jug(fill, max, { unit })           measuring jug filled to `fill`
 *   thermometer(temp, { min, max })    thermometer reading
 *
 * Each figure keeps its reading on data-value so tests can check the answer.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function ruler(len, { unit = "cm", emoji = "✏️", max = Math.max(10, Math.ceil(len) + 1), label, marker = false } = {}) {
    const f = V.figure(label || "A " + emoji + " lined up on a ruler, from 0 to " + len + " " + unit, "kv-measure kv-ruler");
    f.dataset.value = String(len);
    const w = 320, pad = 16, scale = (w - 2 * pad) / max;
    const svg = V.el("svg", { viewBox: "0 0 " + w + " 110", focusable: "false", "aria-hidden": "true" });
    const objW = len * scale;
    svg.appendChild(V.el("rect", { x: pad, y: 12, width: objW, height: 34, rx: 6, class: "kv-obj" }));
    svg.appendChild(V.el("text", { x: pad + objW / 2, y: 38, class: "kv-obj-emoji", "text-anchor": "middle" }, emoji));
    svg.appendChild(V.el("rect", { x: pad - 6, y: 54, width: max * scale + 12, height: 46, rx: 4, class: "kv-ruler-body" }));
    for (let i = 0; i <= max; i++) {
      svg.appendChild(V.el("line", { x1: pad + i * scale, y1: 54, x2: pad + i * scale, y2: 54 + 16, class: "kv-tick-big" }));
      svg.appendChild(V.el("text", { x: pad + i * scale, y: 92, class: "kv-tl-label", "text-anchor": "middle" }, String(i)));
    }
    if (marker) {
      const line = V.el("line", { x1: pad, y1: 8, x2: pad, y2: 100, class: "kv-marker-line" });
      svg.appendChild(line);
      f.setMarker = function (v) {
        line.setAttribute("x1", pad + v * scale);
        line.setAttribute("x2", pad + v * scale);
        f.dataset.marker = String(v);
      };
      f.setMarker(0);
    }
    f.appendChild(svg);
    return f;
  }

  function balance(left, right, { leftEmoji = "🍎", rightEmoji = "🍌", label } = {}) {
    const tilt = left === right ? 0 : left > right ? -1 : 1;
    const heavier = left === right ? "equal" : left > right ? "left" : "right";
    const f = V.figure(label || (heavier === "equal" ? "Scales balanced: both sides weigh the same" : "Scales tipped down on the " + heavier + ": the " + heavier + " side is heavier"), "kv-measure kv-balance");
    f.dataset.heavier = heavier;
    const svg = V.el("svg", { viewBox: "0 0 240 130", focusable: "false", "aria-hidden": "true" });
    svg.appendChild(V.el("path", { d: "M120 40 L108 118 L132 118 Z", class: "kv-stand" }));
    const beam = V.el("g", { transform: "rotate(" + tilt * 10 + " 120 40)" });
    beam.appendChild(V.el("rect", { x: 30, y: 36, width: 180, height: 8, rx: 4, class: "kv-beam" }));
    [[34, leftEmoji, left], [206, rightEmoji, right]].forEach(([x, e, w]) => {
      beam.appendChild(V.el("path", { d: "M" + (x - 22) + " 78 H" + (x + 22) + " L" + (x + 14) + " 92 H" + (x - 14) + " Z", class: "kv-pan" }));
      beam.appendChild(V.el("line", { x1: x, y1: 44, x2: x - 20, y2: 78, class: "kv-tick" }));
      beam.appendChild(V.el("line", { x1: x, y1: 44, x2: x + 20, y2: 78, class: "kv-tick" }));
      beam.appendChild(V.el("text", { x, y: 74, class: "kv-pan-emoji", "text-anchor": "middle" }, e));
    });
    svg.appendChild(beam);
    f.appendChild(svg);
    return f;
  }

  function jug(fill, max, { unit = "mL", label } = {}) {
    const f = V.figure(label || "A measuring jug filled to " + fill + " " + unit + " out of " + max, "kv-measure kv-jug");
    f.dataset.value = String(fill);
    const svg = V.el("svg", { viewBox: "0 0 120 150", focusable: "false", "aria-hidden": "true" });
    const top = 20, bottom = 136, h = bottom - top;
    const y = bottom - (fill / max) * h;
    svg.appendChild(V.el("rect", { x: 40, y: y, width: 40, height: bottom - y, class: "kv-water" }));
    svg.appendChild(V.el("path", { d: "M36 " + top + " V" + bottom + " H84 V" + top, class: "kv-glass" }));
    const quarters = 4;
    for (let i = 0; i <= quarters; i++) {
      const yy = bottom - (i / quarters) * h;
      svg.appendChild(V.el("line", { x1: 84, y1: yy, x2: 94, y2: yy, class: "kv-tick-big" }));
      svg.appendChild(V.el("text", { x: 98, y: yy + 4, class: "kv-tl-label" }, String((max / quarters) * i)));
    }
    f.appendChild(svg);
    return f;
  }

  function thermometer(temp, { min = 0, max = 40, label } = {}) {
    const f = V.figure(label || "A thermometer reading " + temp + " degrees", "kv-measure kv-thermo");
    f.dataset.value = String(temp);
    const svg = V.el("svg", { viewBox: "0 0 120 170", focusable: "false", "aria-hidden": "true" });
    const top = 14, bottom = 130, y = bottom - ((temp - min) / (max - min)) * (bottom - top);
    svg.appendChild(V.el("rect", { x: 48, y: top, width: 16, height: bottom - top + 10, rx: 8, class: "kv-glass-fill" }));
    svg.appendChild(V.el("circle", { cx: 56, cy: 146, r: 14, class: "kv-mercury" }));
    svg.appendChild(V.el("rect", { x: 52, y: y, width: 8, height: 146 - y, class: "kv-mercury" }));
    for (let t = min; t <= max; t += 10) {
      const yy = bottom - ((t - min) / (max - min)) * (bottom - top);
      svg.appendChild(V.el("line", { x1: 66, y1: yy, x2: 76, y2: yy, class: "kv-tick-big" }));
      svg.appendChild(V.el("text", { x: 82, y: yy + 4, class: "kv-tl-label" }, t + "°"));
    }
    f.appendChild(svg);
    return f;
  }

  window.KlgMeasureVis = { ruler, balance, jug, thermometer };
})();
