/**
 * KlgShapes — flat shapes and solid shapes drawn as SVG.
 *
 *   polygon(name)        triangle | square | rectangle | pentagon | hexagon | octagon | circle
 *   solid(name)          cube | sphere | cylinder | cone | pyramid
 *   SIDES                { triangle: 3, … } sides (and corners) of each flat shape
 *   FACES                solids: { cube: { faces: 6, edges: 12, corners: 8 }, … }
 *
 * Figures carry data-shape and an aria-label that names the shape, so a quiz
 * that asks "what shape is this?" should pass { label } to keep it neutral.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  const SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, octagon: 8 };
  const FACES = {
    cube: { faces: 6, edges: 12, corners: 8, flat: 6, curved: 0 },
    sphere: { faces: 1, edges: 0, corners: 0, flat: 0, curved: 1 },
    cylinder: { faces: 3, edges: 2, corners: 0, flat: 2, curved: 1 },
    cone: { faces: 2, edges: 1, corners: 1, flat: 1, curved: 1 },
    pyramid: { faces: 5, edges: 8, corners: 5, flat: 5, curved: 0 },
  };

  function frame(name, label, cls) {
    const f = V.figure(label || "A " + name, "kv-shape " + cls);
    f.dataset.shape = name;
    const svg = V.el("svg", { viewBox: "0 0 120 120", focusable: "false", "aria-hidden": "true" });
    f.appendChild(svg);
    return { f, svg };
  }

  function regular(n, r, rotate) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((i / n) * 360 + rotate) * Math.PI / 180;
      pts.push((60 + r * Math.cos(a)).toFixed(1) + "," + (60 + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }

  function polygon(name, { label } = {}) {
    const { f, svg } = frame(name, label, "kv-flat2d");
    if (name === "circle") svg.appendChild(V.el("circle", { cx: 60, cy: 60, r: 44, class: "kv-fill" }));
    else if (name === "rectangle") svg.appendChild(V.el("rect", { x: 12, y: 32, width: 96, height: 56, class: "kv-fill", rx: 2 }));
    else if (name === "square") svg.appendChild(V.el("rect", { x: 24, y: 24, width: 72, height: 72, class: "kv-fill", rx: 2 }));
    else {
      const n = SIDES[name];
      const rotate = name === "triangle" ? -90 : name === "octagon" ? 22.5 : name === "hexagon" ? 0 : -90;
      svg.appendChild(V.el("polygon", { points: regular(n, 50, rotate), class: "kv-fill" }));
    }
    return f;
  }

  function solid(name, { label } = {}) {
    const { f, svg } = frame(name, label, "kv-solid3d");
    const add = (tag, attrs) => svg.appendChild(V.el(tag, attrs));
    if (name === "sphere") {
      svg.appendChild(V.el("defs", {})).innerHTML = '<radialGradient id="kvSph" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#6c8ae4"/></radialGradient>';
      add("circle", { cx: 60, cy: 60, r: 46, fill: "url(#kvSph)", class: "kv-edge" });
    } else if (name === "cube") {
      add("polygon", { points: "20,40 70,40 70,95 20,95", class: "kv-face-a" });
      add("polygon", { points: "20,40 45,18 95,18 70,40", class: "kv-face-b" });
      add("polygon", { points: "70,40 95,18 95,73 70,95", class: "kv-face-c" });
    } else if (name === "cylinder") {
      add("path", { d: "M25 30 V88 A35 12 0 0 0 95 88 V30", class: "kv-face-a" });
      add("ellipse", { cx: 60, cy: 30, rx: 35, ry: 12, class: "kv-face-b" });
    } else if (name === "cone") {
      add("path", { d: "M60 10 L95 90 A35 12 0 0 1 25 90 Z", class: "kv-face-a" });
      add("ellipse", { cx: 60, cy: 90, rx: 35, ry: 12, class: "kv-face-c", opacity: 0.0 });
    } else if (name === "pyramid") {
      add("polygon", { points: "60,12 20,92 70,100", class: "kv-face-a" });
      add("polygon", { points: "60,12 70,100 105,86", class: "kv-face-c" });
    }
    return f;
  }

  window.KlgShapes = { polygon, solid, SIDES, FACES };
})();
