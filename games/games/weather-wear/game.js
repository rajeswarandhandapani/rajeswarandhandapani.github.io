/**
 * Weather & Seasons.
 *
 *   dress   A weather scene is drawn. Six things are shown — three that help in
 *           that weather and three that do not. Tap every helpful one, then Check.
 *   season  A season scene is drawn — pick its name.
 *
 *   ?level=1  (default) dress for sunny, rainy and snowy weather
 *   ?level=2  mixes in the four seasons
 *
 * Items that could suit two weathers (sunglasses on a snowy day) are left out of the
 * wrong lists, so every wrong item is plainly not needed.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const S = window.KlgScene;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const WEATHER = {
    sunny: { word: "sunny", ok: [["🧢", "sun hat"], ["🕶️", "sunglasses"], ["🩳", "shorts"], ["🧴", "sunscreen"]], no: [["🧣", "scarf"], ["🧤", "gloves"], ["🥾", "snow boots"], ["🧥", "thick coat"]] },
    rainy: { word: "rainy", ok: [["☂️", "umbrella"], ["🥾", "rain boots"], ["🧥", "raincoat"]], no: [["🕶️", "sunglasses"], ["🩳", "shorts"], ["🧴", "sunscreen"], ["🩴", "sandals"]] },
    snowy: { word: "snowy", ok: [["🧣", "scarf"], ["🧤", "gloves"], ["🧥", "warm coat"], ["🥾", "snow boots"]], no: [["🩳", "shorts"], ["🩴", "sandals"], ["👕", "t-shirt"], ["🧴", "sunscreen"]] },
  };
  const SEASONS = [["spring", "🌷"], ["summer", "☀️"], ["autumn", "🍂"], ["winter", "⛄"]];

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let kind, key, tries = 0, q;
      do {
        kind = level === 2 && i % 2 === 1 ? "season" : "dress";
        if (kind === "dress") { const w = V.pick(Object.keys(WEATHER)); q = { kind, w }; key = "w" + w; }
        else { const s = V.pick(SEASONS); q = { kind, s }; key = "s" + s[0]; }
      } while (asked.has(key) && ++tries < 30);
      asked.add(key);
      return q;
    },
    render(q, ctx) {
      if (q.kind === "season") {
        const [name] = q.s;
        ctx.task("Which season is this?");
        const scene = S.preset(name, { label: "A scene from one of the four seasons" });
        scene.dataset.season = name;
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        V.shuffle(SEASONS).forEach(([n, e]) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-btn";
          b.dataset.season = n;
          b.textContent = `${e} ${n[0].toUpperCase()}${n.slice(1)}`;
          b.addEventListener("click", () => {
            if (n === name) { ctx.right(`It is ${name}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
            else { b.disabled = true; ctx.wrong("Look at the trees, flowers and sky. Which season is it?"); }
          });
          bar.appendChild(b);
        });
        ctx.stage.append(scene, bar);
        return;
      }
      const w = WEATHER[q.w];
      ctx.task(`It is ${w.word} today. Tap everything that helps, then press Check.`);
      const scene = S.preset(q.w, { label: `A ${w.word} day` });
      scene.dataset.weather = q.w;
      const ok = V.shuffle(w.ok.slice()).slice(0, 3);
      const no = V.shuffle(w.no.slice()).slice(0, 3);
      const items = V.shuffle([...ok.map((x) => ({ x, good: true })), ...no.map((x) => ({ x, good: false }))]);
      const grid = document.createElement("div");
      grid.className = "kv-itemgrid";
      const picked = new Set();
      items.forEach(({ x: [emoji, name], good }, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-itemcell";
        b.dataset.good = String(good);
        b.dataset.item = name;
        b.setAttribute("aria-pressed", "false");
        b.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:2.2rem">${emoji}</span><span class="kv-choice-text">${name}</span>`;
        b.addEventListener("click", () => {
          const on = !picked.has(idx);
          on ? picked.add(idx) : picked.delete(idx);
          b.classList.toggle("on", on);
          b.setAttribute("aria-pressed", String(on));
        });
        grid.appendChild(b);
      });
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
      check.setAttribute("aria-label", "Check my choices");
      check.addEventListener("click", () => {
        const chosen = [...picked].map((i) => items[i]);
        const wrongPicked = chosen.filter((c) => !c.good);
        const missed = items.filter((c, i) => c.good && !picked.has(i));
        const lock = () => { check.disabled = true; grid.querySelectorAll("button").forEach((b) => (b.disabled = true)); };
        if (!wrongPicked.length && !missed.length) { ctx.right("These help on a " + w.word + " day: " + ok.map((o) => o[1]).join(", ") + "."); lock(); }
        else if (!ctx.firstTry()) {
          grid.querySelectorAll("button").forEach((b) => { const g = b.dataset.good === "true"; b.classList.toggle("on", g); });
          ctx.reveal("The helpful things are highlighted: " + ok.map((o) => o[1]).join(", ") + "."); lock();
        } else if (wrongPicked.length) ctx.wrong(`Would you need ${wrongPicked[0].x[1]} on a ${w.word} day? Think again.`);
        else ctx.wrong("You have not found everything yet. Look for more things that help.");
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      bar.append(check);
      ctx.stage.append(scene, grid, bar);
    },
  });
})();
