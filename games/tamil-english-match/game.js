/**
 * Tamil–English Match — join Tamil words to pictures or English words.
 *
 * Four Tamil words on the left, four answers on the right. Tap a Tamil word
 * (it is spoken from the recording when there is one), then tap its partner.
 * A right pair turns green and stays; a wrong tap shakes. Five boards a round.
 *
 *   ?level=1  match to pictures
 *   ?level=2  (default) match to English words (all four from one group)
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const A = window.KlgTamilAudio;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const cats = [...new Set(TAMIL_WORDS.map((w) => w.cat))].filter((c) => TAMIL_WORDS.filter((w) => w.cat === c).length >= 4);
  const say = (w) => { if (A) A.say(w); };

  KlgRound.run({
    total: 5,
    make(i, asked) {
      let cat, tries = 0;
      do { cat = V.pick(cats); } while (asked.has(cat) && ++tries < 20 && asked.size < cats.length);
      asked.add(cat);
      const pool = TAMIL_WORDS.filter((w) => w.cat === cat);
      const chosen = [];
      V.shuffle(pool.slice()).forEach((w) => { if (chosen.length < 4 && !chosen.some((c) => c.english === w.english || c.emoji === w.emoji)) chosen.push(w); });
      return { cat, words: chosen };
    },
    render(q, ctx) {
      ctx.task("Tap a Tamil word, then tap the " + (level === 1 ? "picture" : "English word") + " that matches it.");
      let selected = null;
      let matched = 0;
      const board = document.createElement("div");
      board.className = "kv-matchboard";
      const left = document.createElement("div");
      const right = document.createElement("div");
      left.className = right.className = "kv-matchcol";
      left.setAttribute("role", "group"); left.setAttribute("aria-label", "Tamil words");
      right.setAttribute("role", "group"); right.setAttribute("aria-label", level === 1 ? "Pictures" : "English words");

      const lefts = V.shuffle(q.words.slice()).map((w) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn kv-matchcell tamil-glyph";
        b.textContent = w.tamil;
        b.dataset.english = w.english;
        b.addEventListener("click", () => {
          if (b.classList.contains("done")) return;
          lefts.forEach((x) => x.classList.remove("sel"));
          selected = w;
          b.classList.add("sel");
          say(w.tamil);
        });
        left.appendChild(b);
        return b;
      });
      V.shuffle(q.words.slice()).forEach((w) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn kv-matchcell";
        b.dataset.english = w.english;
        if (level === 1) { b.innerHTML = `<span style="font-size:2.2rem" aria-hidden="true">${w.emoji}</span>`; b.setAttribute("aria-label", w.english); }
        else b.textContent = w.english;
        b.addEventListener("click", () => {
          if (b.classList.contains("done")) return;
          if (!selected) return ctx.hint("Tap a Tamil word first.");
          if (selected === w) {
            const mate = lefts.find((x) => x.dataset.english === w.english);
            [b, mate].forEach((x) => { x.classList.remove("sel"); x.classList.add("done"); x.setAttribute("aria-disabled", "true"); });
            say(w.tamil);
            selected = null;
            matched += 1;
            if (matched === q.words.length) ctx.right(q.words.map((x) => `${x.tamil} = ${x.english}`).join(", ") + ".");
          } else {
            b.classList.add("pk-shake");
            setTimeout(() => b.classList.remove("pk-shake"), 400);
            ctx.wrong("Not that one. Listen to the Tamil word again, then try another.");
            lefts.forEach((x) => x.classList.remove("sel"));
            selected = null;
          }
        });
        right.appendChild(b);
      });
      board.append(left, right);
      board.dataset.pairs = JSON.stringify(q.words.map((w) => [w.tamil, w.english]));
      ctx.stage.append(board);
    },
  });
})();
