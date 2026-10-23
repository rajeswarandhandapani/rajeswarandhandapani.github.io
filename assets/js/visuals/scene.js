/**
 * KlgScene — a little picture made of coloured bands and placed emoji.
 *
 *   scene({ sky, ground, water, items, label, height })
 *     sky/ground/water: CSS colours (water covers the lower part when given)
 *     items: [{ e: "🌧️", x: 20, y: 10, size: 2.2 }]  x/y in %, size in em
 *
 *   PRESETS — ready-made weather, season and habitat pictures:
 *   preset("rainy" | "sunny" | "snowy" | "windy" | "stormy" | "ocean" | "forest" | "desert" | "farm" | "pond" | "arctic" | "grassland" | "rainforest" | "reef" | "cave" | "night" | "spring" | "summer" | "autumn" | "winter")
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function scene({ sky = "#cfeaff", ground, water, items = [], label = "A picture", height = 150 } = {}) {
    const f = V.figure(label, "kv-scene");
    f.style.height = height + "px";
    f.style.background = sky;
    if (ground) { const g = document.createElement("div"); g.className = "kv-ground"; g.style.background = ground; g.setAttribute("aria-hidden", "true"); f.appendChild(g); }
    if (water) { const w = document.createElement("div"); w.className = "kv-waterband"; w.style.background = water; w.setAttribute("aria-hidden", "true"); f.appendChild(w); }
    items.forEach((it) => {
      const s = document.createElement("span");
      s.className = "kv-sitem";
      s.setAttribute("aria-hidden", "true");
      s.style.left = it.x + "%";
      s.style.top = it.y + "%";
      s.style.fontSize = (it.size || 2) + "em";
      s.textContent = it.e;
      f.appendChild(s);
    });
    return f;
  }

  const PRESETS = {
    sunny: { sky: "#bfe6ff", ground: "#9bd36b", label: "A sunny day", items: [{ e: "☀️", x: 70, y: 5, size: 3 }, { e: "🌳", x: 12, y: 40, size: 3 }, { e: "🌼", x: 45, y: 68, size: 1.6 }] },
    rainy: { sky: "#9fb4c7", ground: "#79a85a", label: "A rainy day", items: [{ e: "🌧️", x: 35, y: 2, size: 3.4 }, { e: "☔", x: 62, y: 52, size: 2.4 }, { e: "🐸", x: 15, y: 62, size: 1.8 }] },
    snowy: { sky: "#dbe7f3", ground: "#f4f8fc", label: "A snowy day", items: [{ e: "❄️", x: 20, y: 5, size: 2 }, { e: "❄️", x: 70, y: 12, size: 1.6 }, { e: "⛄", x: 42, y: 50, size: 3 }] },
    windy: { sky: "#cfeaff", ground: "#a6d37a", label: "A windy day", items: [{ e: "💨", x: 20, y: 15, size: 2.6 }, { e: "🪁", x: 62, y: 8, size: 2.6 }, { e: "🍂", x: 40, y: 62, size: 1.6 }] },
    stormy: { sky: "#6c7a89", ground: "#6f9a52", label: "A stormy day", items: [{ e: "⛈️", x: 35, y: 2, size: 3.6 }, { e: "🌳", x: 12, y: 42, size: 2.6 }, { e: "⚡", x: 66, y: 25, size: 2 }] },
    night: { sky: "#1e2a5a", ground: "#2f4a3a", label: "The night sky", items: [{ e: "🌙", x: 68, y: 8, size: 3 }, { e: "⭐", x: 20, y: 14, size: 1.4 }, { e: "⭐", x: 40, y: 30, size: 1 }, { e: "🦉", x: 12, y: 52, size: 2.2 }] },
    ocean: { sky: "#cfeaff", water: "#4aa8e0", label: "The ocean", items: [{ e: "🐳", x: 30, y: 40, size: 3 }, { e: "🐠", x: 65, y: 62, size: 2 }, { e: "🐙", x: 8, y: 66, size: 2 }] },
    forest: { sky: "#d8f0cf", ground: "#5e9448", label: "A forest", items: [{ e: "🌲", x: 8, y: 25, size: 3.4 }, { e: "🌳", x: 70, y: 22, size: 3.6 }, { e: "🦌", x: 40, y: 50, size: 2.6 }] },
    desert: { sky: "#ffe6b3", ground: "#e8c27a", label: "A desert", items: [{ e: "🌵", x: 12, y: 38, size: 3 }, { e: "🐪", x: 55, y: 42, size: 3 }, { e: "☀️", x: 78, y: 4, size: 2.4 }] },
    farm: { sky: "#cfeaff", ground: "#a6d37a", label: "A farm", items: [{ e: "🏠", x: 10, y: 20, size: 3.4 }, { e: "🐄", x: 52, y: 48, size: 2.6 }, { e: "🌾", x: 78, y: 54, size: 2 }] },
    pond: { sky: "#d8f0cf", water: "#6ac1d6", label: "A pond", items: [{ e: "🦆", x: 20, y: 52, size: 2.4 }, { e: "🐸", x: 66, y: 20, size: 2.2 }, { e: "🪷", x: 50, y: 62, size: 1.8 }] },
    arctic: { sky: "#e7f2fb", ground: "#ffffff", label: "The Arctic", items: [{ e: "🐧", x: 20, y: 44, size: 2.6 }, { e: "🐻‍❄️", x: 56, y: 40, size: 3 }, { e: "🧊", x: 82, y: 54, size: 2 }] },
    grassland: { sky: "#cfeaff", ground: "#c9d98a", label: "A grassland", items: [{ e: "🌾", x: 8, y: 42, size: 2.6 }, { e: "🦓", x: 46, y: 44, size: 2.6 }, { e: "☀️", x: 76, y: 4, size: 2.4 }] },
    rainforest: { sky: "#bfe3b4", ground: "#3f7d3a", label: "A rainforest", items: [{ e: "🌴", x: 6, y: 20, size: 3.4 }, { e: "🦜", x: 52, y: 14, size: 2.2 }, { e: "🌿", x: 74, y: 52, size: 2.2 }] },
    reef: { sky: "#9bd7f5", water: "#2f8fc9", label: "A coral reef", items: [{ e: "🐠", x: 12, y: 40, size: 2.4 }, { e: "🐡", x: 56, y: 28, size: 2.2 }, { e: "🐚", x: 40, y: 72, size: 1.8 }] },
    cave: { sky: "#4a4452", ground: "#6e6258", label: "A cave", items: [{ e: "🦇", x: 18, y: 12, size: 2.4 }, { e: "🪨", x: 60, y: 54, size: 2.4 }, { e: "⛰️", x: 40, y: 20, size: 2.8 }] },
    spring: { sky: "#d9f0ff", ground: "#9bd36b", label: "Spring", items: [{ e: "🌷", x: 15, y: 56, size: 2 }, { e: "🦋", x: 50, y: 20, size: 2.2 }, { e: "🌸", x: 74, y: 40, size: 2.4 }] },
    summer: { sky: "#aee0ff", ground: "#8fcf5e", label: "Summer", items: [{ e: "☀️", x: 70, y: 4, size: 3.2 }, { e: "🍉", x: 20, y: 56, size: 2.4 }, { e: "🏖️", x: 48, y: 36, size: 2.6 }] },
    autumn: { sky: "#ffe4c4", ground: "#c98d4b", label: "Autumn", items: [{ e: "🍂", x: 14, y: 20, size: 2.4 }, { e: "🍁", x: 48, y: 50, size: 2.4 }, { e: "🎃", x: 76, y: 52, size: 2.4 }] },
    winter: { sky: "#dbe7f3", ground: "#f4f8fc", label: "Winter", items: [{ e: "⛄", x: 16, y: 44, size: 3 }, { e: "❄️", x: 50, y: 8, size: 2.4 }, { e: "🧣", x: 74, y: 48, size: 2.4 }] },
  };

  function preset(name, overrides) {
    const p = PRESETS[name];
    if (!p) throw new Error("Unknown scene " + name);
    return scene(Object.assign({}, p, overrides || {}));
  }

  window.KlgScene = { scene, preset, PRESETS };
})();
