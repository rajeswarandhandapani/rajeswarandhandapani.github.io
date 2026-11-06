/**
 * Word Detective — sort words by the job they do.
 *
 *   ?level=1  naming words and doing words
 *   ?level=2  (default) adds describing words
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const { WORDS } = window.KlgQuestions;
  const BINS = [
    { id: "naming", label: "Naming word", icon: "🏷️", hint: "a person, place or thing" },
    { id: "doing", label: "Doing word", icon: "🏃", hint: "something you can do" },
    { id: "describing", label: "Describing word", icon: "🎨", hint: "tells what something is like" },
  ].slice(0, level === 1 ? 2 : 3);

  KlgRound.run({
    total: 6,
    make(i, asked) {
      const each = level === 1 ? 3 : 2;
      const items = [];
      BINS.forEach((b) => {
        const fresh = WORDS[b.id].filter((w) => !asked.has(w));
        const pool = fresh.length >= each ? fresh : WORDS[b.id];
        V.shuffle(pool.slice()).slice(0, each).forEach((word) => { asked.add(word); items.push({ word, bin: b.id }); });
      });
      return { items: V.shuffle(items) };
    },
    render(q, ctx) {
      ctx.task("What job does each word do? Tap a word, then tap its group.");
      const host = document.createElement("div");
      const items = q.items.map((it) => ({
        id: it.word, bin: it.bin, label: it.word,
        node: () => Object.assign(document.createElement("span"), { className: "kv-choice-text", textContent: it.word }),
      }));
      const kit = KlgPlayKit.dragToBins({
        host, items, bins: BINS.map(({ id, label, icon }) => ({ id, label, icon })),
        onPlace(item, bin, ok) {
          if (!ok) {
            const home = BINS.find((b) => b.id === item.bin);
            return ctx.wrong(`"${item.id}" is not a ${bin.label.toLowerCase()}. Think: is it ${home.hint}?`);
          }
          KlgRound.say(item.id);
          if (kit.remaining() === 0) ctx.right(BINS.map((b) => `${b.label}s: ${q.items.filter((x) => x.bin === b.id).map((x) => x.word).join(", ")}`).join(". ") + ".");
        },
      });
      ctx.stage.append(host);
    },
  });
})();
