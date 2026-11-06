/**
 * Who Lives Where? — use the clues to put each animal in its house.
 *
 *   ?level=1  3 houses
 *   ?level=2  (default) 4 houses
 *   ?level=3  5 houses
 *
 * Pick an animal and tap a house, or drag it there. Check points at a clue that
 * is not true yet. See puzzle.js for how there is always exactly one answer.
 */
(function () {
  "use strict";
  const raw = Number(new URLSearchParams(location.search).get("level"));
  const level = raw === 1 || raw === 3 ? raw : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const HOUSES = { 1: 3, 2: 4, 3: 5 }[level];

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let q, tries = 0;
      do { q = KlgHousePuzzle.make(HOUSES); } while (asked.has(JSON.stringify(q.clues)) && ++tries < 20);
      asked.add(JSON.stringify(q.clues));
      return q;
    },
    render(q, ctx) {
      const sentences = q.clues.map((clue) => KlgHousePuzzle.clueText(clue, q));
      ctx.task("Use the clues. Who lives in each house?", `Who lives in each house? ${sentences.join(" ")}`);
      const n = q.animals.length;
      const inHouse = Array(n).fill(null);
      let selected = null;

      const list = document.createElement("ol");
      list.className = "kv-clues wl-clues";
      sentences.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        list.appendChild(li);
      });

      const row = document.createElement("div");
      row.className = "wl-row";
      row.style.setProperty("--n", n);
      row.dataset.puzzle = JSON.stringify(q);
      const tray = document.createElement("div");
      tray.className = "wl-tray";
      tray.setAttribute("aria-label", "Animals to place");

      const animalEls = q.animals.map((animal, a) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "pk-item wl-animal", textContent: animal.emoji });
        b.dataset.animal = a;
        b.setAttribute("aria-label", animal.name);
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => select(a));
        KlgPlayKit.dragTo(b, ".wl-house", (houseEl) => {
          select(a);
          place(Number(houseEl.dataset.house));
        });
        return b;
      });
      KlgPlayKit.shuffled(animalEls).forEach((el) => tray.appendChild(el));

      const houseEls = q.houses.map((house, h) => {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "wl-house" });
        b.dataset.house = h;
        b.style.setProperty("--c", house.color);
        b.style.setProperty("--soft", house.soft);
        const roof = Object.assign(document.createElement("span"), { className: "wl-roof" });
        const body = Object.assign(document.createElement("span"), { className: "wl-body" });
        const name = Object.assign(document.createElement("span"), { className: "wl-name", textContent: house.name });
        b.append(roof, body, name);
        b.addEventListener("click", () => {
          if (selected !== null) place(h);
          else if (inHouse[h] !== null) { setHouse(h, null); paint(); }
          else ctx.hint("Pick an animal first.");
        });
        row.appendChild(b);
        return b;
      });

      function select(a) {
        selected = a;
        animalEls.forEach((el, i) => el.setAttribute("aria-pressed", String(i === a)));
      }
      function setHouse(h, a) {
        inHouse[h] = a;
        const body = houseEls[h].querySelector(".wl-body");
        body.textContent = a === null ? "" : q.animals[a].emoji;
        houseEls[h].dataset.holds = a === null ? "" : a;
      }
      function paint() {
        houseEls.forEach((el, h) => {
          const who = inHouse[h] === null ? "empty" : `${q.animals[inHouse[h]].name} lives here. Tap to take back`;
          el.setAttribute("aria-label", `${q.houses[h].name} house, number ${h + 1} from the left: ${who}`);
        });
        animalEls.forEach((el, a) => { el.style.visibility = inHouse.includes(a) ? "hidden" : ""; });
        list.querySelectorAll("li").forEach((li) => li.classList.remove("wl-bad"));
      }
      function place(h) {
        const a = selected;
        const from = inHouse.indexOf(a);
        if (from >= 0) setHouse(from, null);
        setHouse(h, a);
        // The next animal is ready, which saves a tap.
        const next = animalEls.findIndex((_, i) => !inHouse.includes(i));
        select(next < 0 ? null : next);
        paint();
      }

      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "✅ Check", id: "wl-check" });
      check.addEventListener("click", () => {
        if (inHouse.includes(null)) return ctx.hint("Every animal needs a house first.");
        const place = [];
        inHouse.forEach((a, h) => { place[a] = h; });
        const broken = q.clues.findIndex((clue) => !KlgHousePuzzle.holds(clue, place));
        if (broken >= 0) {
          list.children[broken].classList.add("wl-bad");
          return ctx.wrong(`Look again at clue ${broken + 1}.`);
        }
        [...houseEls, check].forEach((b) => { b.disabled = true; });
        ctx.right(inHouse.map((a, h) => `${q.animals[a].name} lives in the ${q.houses[h].name} house.`).join(" "));
      });

      paint();
      select(0);
      ctx.stage.append(list, row, tray, check);
    },
  });
})();
