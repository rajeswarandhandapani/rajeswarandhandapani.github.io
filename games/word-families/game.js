/**
 * Word Families — sort picture words into the -at, -an, -og… house they live in.
 *
 *   ?level=1  two houses, four pictures
 *   ?level=2  (default 1) three houses, up to eight pictures
 *
 * Tap a picture to pick it up, then tap a house (the sort kit also lets a
 * finger drag it there). A wrong house gives the picture back and ends the
 * chance of a point for that round; the round is done when every picture is home.
 * Families are by ending sound and spelling: -at, -an, -ap, -en, -et, -og,
 * -ug, -un, -ot, -ip.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const P = window.KlgWordPics;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const FAMILIES = {
    at: ["cat", "hat", "bat", "rat"], an: ["can", "man", "pan", "van"], ap: ["cap", "map", "nap"], en: ["hen", "pen", "ten"],
    et: ["net", "pet", "jet"], og: ["dog", "frog", "log"], ug: ["bug", "mug", "hug"], un: ["sun", "run", "bun"],
    ot: ["pot", "dot", "hot"], ip: ["ship", "lip", "chip"],
  };

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let keys, tries = 0;
      do { keys = V.shuffle(Object.keys(FAMILIES)).slice(0, level === 1 ? 2 : 3); } while (asked.has(keys.slice().sort().join()) && ++tries < 30);
      asked.add(keys.slice().sort().join());
      const items = [];
      keys.forEach((k) => V.shuffle(FAMILIES[k]).slice(0, level === 1 ? 2 : V.rand(2, 3)).forEach((w) => items.push({ word: w, family: k })));
      return { keys, items };
    },
    render(q, ctx) {
      ctx.task("Which house does each picture live in? Tap a picture, then tap its house.");
      const host = document.createElement("div");
      const items = q.items.map((it) => ({
        id: it.word, bin: it.family, label: `${it.word}`,
        node: () => {
          const box = document.createElement("span");
          box.className = "kv-wordcard";
          box.innerHTML = `<span class="kv-emoji" aria-hidden="true">${P.pic(it.word)}</span><span class="kv-choice-text">${it.word}</span>`;
          return box;
        },
      }));
      const bins = q.keys.map((k) => ({ id: k, label: "-" + k, icon: "🏠" }));
      const kit = KlgPlayKit.dragToBins({
        host, items, bins,
        onPlace(item, bin, ok) {
          if (!ok) return ctx.wrong(`${item.id} does not end in -${bin.id}. Say the word and listen to the end.`);
          KlgRound.say(item.id);
          if (kit.remaining() === 0) ctx.right(`Every picture is home: ${q.keys.map((k) => "-" + k).join(", ")}.`);
        },
      });
      ctx.stage.append(host);
    },
  });
})();
