/**
 * Map Explorer — a simple world map, drawn in SVG.
 *
 *   find   "Tap Africa."
 *   home   an animal or landmark is shown — tap the continent where it lives
 *   ocean  "Tap the Indian Ocean." (level 3)
 *
 *   ?level=1  continents are named on the map
 *   ?level=2  (default 1) the names are hidden
 *   ?level=3  names hidden, and oceans too
 *
 * The map is a friendly sketch: shapes are simplified and not to scale. Every
 * part is a button (Tab to move, Enter to choose). Animals and landmarks are only
 * used when they belong to a single continent.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const SVGNS = "http://www.w3.org/2000/svg";
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level"))) ? Number(new URLSearchParams(location.search).get("level")) : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const CONTINENTS = [
    { id: "north-america", name: "North America", pts: "28,32 70,18 118,22 134,40 120,60 112,84 92,96 78,82 58,70 40,58", fill: "#f7c59f", label: [78, 54] },
    { id: "south-america", name: "South America", pts: "92,104 118,100 134,118 126,150 108,182 96,170 90,138", fill: "#b8e0a8", label: [110, 138] },
    { id: "europe", name: "Europe", pts: "170,30 196,24 214,34 208,52 190,62 172,56", fill: "#d7c0f0", label: [191, 44] },
    { id: "africa", name: "Africa", pts: "172,70 210,64 232,90 222,128 200,152 184,136 172,104", fill: "#f6e08f", label: [201, 106] },
    { id: "asia", name: "Asia", pts: "216,30 292,22 332,44 326,76 296,100 262,98 228,84 216,56", fill: "#f4a8b8", label: [270, 60] },
    { id: "oceania", name: "Oceania", pts: "288,122 332,118 342,142 316,162 292,150", fill: "#9fd8e8", label: [315, 140] },
    { id: "antarctica", name: "Antarctica", pts: "40,180 320,180 320,196 40,196", fill: "#f4f8fc", label: [180, 190] },
  ];
  const OCEANS = [
    { id: "pacific", name: "Pacific Ocean", shape: ["ellipse", { cx: 8, cy: 100, rx: 24, ry: 74 }], also: ["ellipse", { cx: 352, cy: 100, rx: 22, ry: 60 }] },
    { id: "atlantic", name: "Atlantic Ocean", shape: ["ellipse", { cx: 150, cy: 112, rx: 20, ry: 46 }] },
    { id: "indian", name: "Indian Ocean", shape: ["ellipse", { cx: 258, cy: 128, rx: 30, ry: 22 }] },
    { id: "arctic", name: "Arctic Ocean", shape: ["ellipse", { cx: 180, cy: 7, rx: 120, ry: 9 }] },
    { id: "southern", name: "Southern Ocean", shape: ["ellipse", { cx: 180, cy: 171, rx: 128, ry: 8 }] },
  ];
  const HOMES = [
    ["🦘", "kangaroo", "oceania"], ["🐨", "koala", "oceania"], ["🐼", "giant panda", "asia"], ["🐯", "tiger", "asia"], ["🦁", "lion", "africa"],
    ["🦒", "giraffe", "africa"], ["🦓", "zebra", "africa"], ["🐧", "emperor penguin", "antarctica"], ["🦙", "llama", "south-america"], ["🦬", "bison", "north-america"],
    ["🗼", "the Eiffel Tower", "europe"], ["🗽", "the Statue of Liberty", "north-america"], ["🔺", "the pyramids", "africa"], ["🏯", "a Japanese castle", "asia"], ["🏛️", "an ancient Greek temple", "europe"],
  ];

  function drawMap() {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 360 200");
    svg.setAttribute("class", "kv-map");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "A simple world map");
    const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    svg.appendChild(el("rect", { x: 0, y: 0, width: 360, height: 200, rx: 10, fill: "#cfeaff" }));
    const regions = [];
    if (level === 3) {
      OCEANS.forEach((o) => [o.shape, o.also].filter(Boolean).forEach(([tag, attrs]) => {
        const n = el(tag, Object.assign({ fill: "#9cd0f2", stroke: "#4a90d9", "stroke-width": 1.5, "data-region": o.id }, attrs));
        svg.appendChild(n);
        regions.push({ id: o.id, label: o.name, el: n });
      }));
    }
    CONTINENTS.forEach((c) => {
      const n = el("polygon", { points: c.pts, fill: c.fill, stroke: "#6b5b45", "stroke-width": 1.5, "stroke-linejoin": "round", "data-region": c.id });
      svg.appendChild(n);
      regions.push({ id: c.id, label: c.name, el: n });
    });
    if (level === 1) {
      CONTINENTS.forEach((c) => {
        const t = el("text", { x: c.label[0], y: c.label[1], "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "#203341", "pointer-events": "none", "aria-hidden": "true" });
        t.textContent = c.name === "North America" ? "N. America" : c.name === "South America" ? "S. America" : c.name;
        svg.appendChild(t);
      });
    }
    return { svg, regions };
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let kind, target, key, tries = 0;
      do {
        kind = level === 3 && V.rand(0, 3) === 0 ? "ocean" : V.pick(["find", "home", "home"]);
        if (kind === "find") target = V.pick(CONTINENTS);
        else if (kind === "ocean") target = V.pick(OCEANS);
        else target = V.pick(HOMES);
        key = kind + (target.id || target[1]);
      } while (asked.has(key) && ++tries < 40);
      asked.add(key);
      return { kind, target };
    },
    render(q, ctx) {
      const { svg, regions } = drawMap();
      let answerId, shown;
      if (q.kind === "home") {
        const [emoji, name, home] = q.target;
        answerId = home;
        const isAnimal = HOMES.indexOf(q.target) < 10;
        ctx.task(isAnimal ? `Where does the ${name} live? Tap its continent.` : `Where can you find ${name}? Tap its continent.`);
        shown = document.createElement("figure");
        shown.className = "kv-clue";
        shown.setAttribute("role", "img");
        shown.setAttribute("aria-label", name);
        shown.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
      } else {
        answerId = q.target.id;
        ctx.task(`Tap ${q.target.name}.`);
      }
      const nameOf = (id) => (CONTINENTS.concat(OCEANS).find((x) => x.id === id) || {}).name;
      const kit = KlgPlayKit.tapHotspots({
        host: svg, regions,
        onTap(r) {
          if (r.id === answerId) {
            regions.filter((x) => x.id === r.id).forEach((x) => kit.mark(x.id, "right"));
            kit.lock();
            ctx.right(q.kind === "home" ? `It is in ${nameOf(answerId)}.` : `That is ${nameOf(answerId)}.`);
          } else ctx.wrong(`That is ${r.label}. ${q.kind === "home" ? "Where could it live?" : "Look again."}`);
        },
      });
      svg.dataset.answer = answerId;
      if (shown) ctx.stage.append(shown);
      ctx.stage.append(svg);
    },
  });
})();
