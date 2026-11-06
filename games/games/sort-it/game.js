/**
 * Sort It! — science sorting with pictures.
 *
 *   ?level=1  (default) two groups: living / not living, floats / sinks, day / night
 *   ?level=2  three groups: land / water / air animals, fruit / vegetables / dairy,
 *             sky / land / sea things
 *
 * Tap a picture, then tap its group (the sort kit also lets a finger drag it).
 * Every set is built so each picture belongs to exactly one group, and an item
 * that could fit two groups is left out.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const SETS = window.KlgQuestions.SETS[level];

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let set, tries = 0;
      do { set = V.pick(SETS); } while (asked.has(set.title) && ++tries < 30);
      asked.add(set.title);
      const items = [];
      set.bins.forEach((b) => V.shuffle(set.items[b.id].slice()).slice(0, level === 1 ? 3 : 2).forEach(([emoji, name]) => items.push({ id: name, emoji, bin: b.id })));
      return { set, items };
    },
    render(q, ctx) {
      ctx.task(`${q.set.title} Tap a picture, then tap its group.`);
      const host = document.createElement("div");
      const items = q.items.map((it) => ({
        id: it.id, bin: it.bin, label: it.id,
        node: () => {
          const box = document.createElement("span");
          box.className = "kv-wordcard";
          box.innerHTML = `<span class="kv-emoji" aria-hidden="true">${it.emoji}</span><span class="kv-choice-text">${it.id}</span>`;
          return box;
        },
      }));
      const kit = KlgPlayKit.dragToBins({
        host, items, bins: q.set.bins,
        onPlace(item, bin, ok) {
          if (!ok) return ctx.wrong(`The ${item.id} does not go in “${bin.label}”. Think about it and try another group.`);
          if (kit.remaining() === 0) ctx.right(q.set.bins.map((b) => `${b.label}: ${q.items.filter((x) => x.bin === b.id).map((x) => x.id).join(", ")}`).join(" · "));
        },
      });
      ctx.stage.append(host);
    },
  });
})();
