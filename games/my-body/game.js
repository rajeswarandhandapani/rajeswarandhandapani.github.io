/**
 * My Body — tap the part, match the sense.
 *
 *   tap    "Tap the child's nose." The figure is drawn in SVG; every part is a
 *          button (Tab to move, Enter to choose), and each pair — eyes, ears,
 *          hands, feet, knees, elbows, shoulders — works from either side.
 *   sense  "Which part helps you smell a rose?" — pick the body part.
 *
 *   ?level=1  head, eyes, ears, nose, mouth, hands, feet
 *   ?level=2  (default 1) adds neck, shoulders, arms, elbows, tummy, legs, knees
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const SVGNS = "http://www.w3.org/2000/svg";
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const PARTS = [
    { id: "head", lvl: 1 }, { id: "eyes", lvl: 1 }, { id: "ears", lvl: 1 }, { id: "nose", lvl: 1 }, { id: "mouth", lvl: 1 }, { id: "hands", lvl: 1 }, { id: "feet", lvl: 1 },
    { id: "neck", lvl: 2 }, { id: "shoulders", lvl: 2 }, { id: "arms", lvl: 2 }, { id: "elbows", lvl: 2 }, { id: "tummy", lvl: 2 }, { id: "legs", lvl: 2 }, { id: "knees", lvl: 2 },
  ];
  const POOL = PARTS.filter((p) => p.lvl <= level);
  const SENSES = [
    { part: "eyes", emoji: "👀", verb: "see a rainbow", icon: "🌈" },
    { part: "ears", emoji: "👂", verb: "hear music", icon: "🎵" },
    { part: "nose", emoji: "👃", verb: "smell a rose", icon: "🌹" },
    { part: "tongue", emoji: "👅", verb: "taste a lemon", icon: "🍋" },
    { part: "hands", emoji: "✋", verb: "feel an ice cube", icon: "🧊" },
  ];

  const SKIN = "#f6c9a0", SHIRT = "#7aa7e8", PANTS = "#5b6ec7", SHOE = "#8a4b0f";

  /** Draws the child. Returns { svg, regions: [{ id, label, el }] }. */
  function drawChild() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 300");
    svg.setAttribute("class", "kv-child");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "A child. Tap a body part.");
    const regions = [];
    const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    /** A visible shape plus a larger invisible hit shape that is the button. */
    function part(id, shapes, hit) {
      const g = document.createElementNS(SVGNS, "g");
      shapes.forEach(([tag, attrs]) => g.appendChild(el(tag, attrs)));
      const h = el(hit[0], Object.assign({ fill: "transparent", stroke: "none", "data-part": id }, hit[1]));
      g.appendChild(h);
      svg.appendChild(g);
      regions.push({ id, label: id.replace(/s$/, ""), el: h });
    }
    // back to front
    part("legs", [["rect", { x: 80, y: 176, width: 18, height: 84, rx: 8, fill: PANTS }]], ["rect", { x: 78, y: 176, width: 22, height: 70 }]);
    part("legs", [["rect", { x: 102, y: 176, width: 18, height: 84, rx: 8, fill: PANTS }]], ["rect", { x: 100, y: 176, width: 22, height: 70 }]);
    part("feet", [["ellipse", { cx: 86, cy: 268, rx: 17, ry: 9, fill: SHOE }]], ["ellipse", { cx: 86, cy: 268, rx: 19, ry: 12 }]);
    part("feet", [["ellipse", { cx: 114, cy: 268, rx: 17, ry: 9, fill: SHOE }]], ["ellipse", { cx: 114, cy: 268, rx: 19, ry: 12 }]);
    part("knees", [["circle", { cx: 89, cy: 222, r: 7, fill: "#8c9be0" }]], ["circle", { cx: 89, cy: 222, r: 11 }]);
    part("knees", [["circle", { cx: 111, cy: 222, r: 7, fill: "#8c9be0" }]], ["circle", { cx: 111, cy: 222, r: 11 }]);
    part("arms", [["rect", { x: 48, y: 98, width: 20, height: 70, rx: 10, fill: SHIRT }]], ["rect", { x: 46, y: 108, width: 24, height: 20 }]);
    part("arms", [["rect", { x: 132, y: 98, width: 20, height: 70, rx: 10, fill: SHIRT }]], ["rect", { x: 130, y: 108, width: 24, height: 20 }]);
    part("tummy", [["rect", { x: 70, y: 92, width: 60, height: 90, rx: 16, fill: SHIRT }]], ["rect", { x: 72, y: 120, width: 56, height: 56 }]);
    part("elbows", [["circle", { cx: 58, cy: 136, r: 6, fill: "#9bbdf0" }]], ["circle", { cx: 58, cy: 136, r: 11 }]);
    part("elbows", [["circle", { cx: 142, cy: 136, r: 6, fill: "#9bbdf0" }]], ["circle", { cx: 142, cy: 136, r: 11 }]);
    part("hands", [["circle", { cx: 58, cy: 176, r: 11, fill: SKIN }]], ["circle", { cx: 58, cy: 176, r: 15 }]);
    part("hands", [["circle", { cx: 142, cy: 176, r: 11, fill: SKIN }]], ["circle", { cx: 142, cy: 176, r: 15 }]);
    part("shoulders", [["circle", { cx: 66, cy: 100, r: 3, fill: "none" }]], ["circle", { cx: 66, cy: 100, r: 12 }]);
    part("shoulders", [["circle", { cx: 134, cy: 100, r: 3, fill: "none" }]], ["circle", { cx: 134, cy: 100, r: 12 }]);
    part("neck", [["rect", { x: 91, y: 82, width: 18, height: 16, fill: SKIN }]], ["rect", { x: 88, y: 82, width: 24, height: 18 }]);
    part("ears", [["circle", { cx: 66, cy: 56, r: 9, fill: SKIN }]], ["circle", { cx: 66, cy: 56, r: 13 }]);
    part("ears", [["circle", { cx: 134, cy: 56, r: 9, fill: SKIN }]], ["circle", { cx: 134, cy: 56, r: 13 }]);
    part("head", [["circle", { cx: 100, cy: 55, r: 34, fill: SKIN }], ["path", { d: "M68 46 Q100 12 132 46 Q100 30 68 46Z", fill: "#5a3a22" }]], ["circle", { cx: 100, cy: 36, r: 12 }]);
    part("eyes", [["circle", { cx: 88, cy: 52, r: 5, fill: "#203341" }]], ["circle", { cx: 88, cy: 52, r: 10 }]);
    part("eyes", [["circle", { cx: 112, cy: 52, r: 5, fill: "#203341" }]], ["circle", { cx: 112, cy: 52, r: 10 }]);
    part("nose", [["ellipse", { cx: 100, cy: 62, rx: 5, ry: 6, fill: "#e8a77c" }]], ["circle", { cx: 100, cy: 62, r: 9 }]);
    part("mouth", [["path", { d: "M89 74 Q100 85 111 74", fill: "none", stroke: "#c0392b", "stroke-width": 4, "stroke-linecap": "round" }]], ["rect", { x: 86, y: 70, width: 28, height: 16 }]);
    return { svg, regions };
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      const kind = i % 4 === 3 ? "sense" : "tap";
      let target, tries = 0;
      if (kind === "tap") { do { target = V.pick(POOL); } while (asked.has(target.id) && ++tries < 30); asked.add(target.id); }
      else { do { target = V.pick(SENSES); } while (asked.has(target.part) && ++tries < 30); asked.add(target.part); }
      return { kind, target };
    },
    render(q, ctx) {
      if (q.kind === "sense") {
        const s = q.target;
        ctx.task(`Which part of your body helps you ${s.verb}?`);
        const pic = document.createElement("figure");
        pic.className = "kv-clue";
        pic.setAttribute("role", "img");
        pic.setAttribute("aria-label", s.verb);
        pic.innerHTML = `<span aria-hidden="true">${s.icon}</span>`;
        const options = V.shuffle([s, ...V.shuffle(SENSES.filter((x) => x !== s)).slice(0, 3)]);
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        options.forEach((o) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-btn kv-picbtn";
          b.dataset.part = o.part;
          b.setAttribute("aria-label", o.part);
          b.innerHTML = `<span style="font-size:2.4rem" aria-hidden="true">${o.emoji}</span><span style="display:block;font-size:0.85rem">${o.part}</span>`;
          b.addEventListener("click", () => {
            if (o === s) { ctx.right(`We use our ${o.part} to ${s.verb}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
            else { b.disabled = true; ctx.wrong(`Our ${o.part} are for something else. Try again.`); }
          });
          bar.appendChild(b);
        });
        ctx.stage.append(pic, bar);
        return;
      }
      ctx.task(`Tap the child's ${q.target.id === "tummy" ? "tummy" : q.target.id.replace(/s$/, "")}${/s$/.test(q.target.id) && q.target.id !== "tummy" ? " (either one)" : ""}.`);
      const { svg, regions } = drawChild();
      const kit = KlgPlayKit.tapHotspots({
        host: svg, regions,
        onTap(r) {
          if (r.id === q.target.id) {
            regions.filter((x) => x.id === r.id).forEach((x) => kit.mark(x.id, "right"));
            kit.lock();
            ctx.right(`That is the ${r.id === "tummy" ? "tummy" : r.label}.`);
          } else {
            ctx.wrong(`That is the ${r.id === "tummy" ? "tummy" : r.label}. Look for the ${q.target.id === "tummy" ? "tummy" : q.target.id.replace(/s$/, "")}.`);
          }
        },
      });
      svg.dataset.target = q.target.id;
      ctx.stage.append(svg);
    },
  });
})();
