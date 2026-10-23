/**
 * Sight Word Pop — hear a common word, pop the bubble that shows it.
 *
 *   ?level=1  (default) 40 first words (the, and, go, see…) among random words
 *   ?level=2  adds the next 60 words, and the other bubbles are look-alikes
 *             (was / saw, on / no, this / that)
 *
 * The word is spoken. Without speech synthesis the word is written in the
 * instruction instead, so the game still works. Ten words per round.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const FIRST = "the and a to is you it in he go no up we my me big see can one play look said come red blue run jump help find here said for".split(" ");
  const NEXT = "all am are at ate be black brown but came did do eat four get good have into like must new now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes".split(" ");
  const POOL = level === 1 ? [...new Set(FIRST)] : [...new Set([...FIRST, ...NEXT])];
  // Words that are easy to mix up when you look quickly.
  const LOOK = { was: ["saw", "way"], saw: ["was", "say"], on: ["no", "or"], no: ["on", "go"], this: ["that", "the"], that: ["this", "then"], they: ["the", "them"],
    the: ["they", "then"], went: ["want", "when"], want: ["went", "what"], what: ["want", "with"], will: ["well", "wall"], well: ["will", "tell"], were: ["where", "we"],
    there: ["three", "these"], see: ["sea", "she"], she: ["see", "he"], he: ["me", "she"], me: ["we", "my"], we: ["me", "he"], good: ["go", "food"], out: ["our", "but"], our: ["out", "your"],
    ran: ["run", "can"], run: ["ran", "sun"], can: ["ran", "cat"], but: ["out", "big"], big: ["bug", "dig"], come: ["came", "some"], came: ["come", "game"] };

  KlgRound.run({
    total: 10,
    make(i, asked) {
      let word, tries = 0;
      do { word = V.pick(POOL); } while (asked.has(word) && ++tries < 40);
      asked.add(word);
      const decoys = [];
      if (level === 2) (LOOK[word] || []).forEach((w) => { if (w !== word && !decoys.includes(w)) decoys.push(w); });
      V.shuffle(POOL.filter((w) => w !== word && !decoys.includes(w))).forEach((w) => { if (decoys.length < 5) decoys.push(w); });
      return { word, bubbles: V.shuffle([word, ...decoys.slice(0, 5)]) };
    },
    render(q, ctx) {
      ctx.task(KlgRound.canSpeak ? "Listen. Pop the bubble with the word you hear." : `Pop the bubble that says “${q.word}”.`, q.word);
      const sea = document.createElement("div");
      sea.className = "kv-sea";
      sea.setAttribute("role", "group");
      sea.setAttribute("aria-label", "Bubbles with words");
      const hues = [200, 160, 280, 40, 330, 100];
      q.bubbles.forEach((w, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-bubble";
        b.dataset.word = w;
        b.textContent = w;
        b.style.setProperty("--h", hues[idx % hues.length]);
        b.style.animationDelay = (idx * 0.4) + "s";
        b.addEventListener("click", () => {
          if (w === q.word) {
            b.classList.add("popped");
            KlgRound.say(q.word);
            ctx.right(`“${q.word}”.`);
            sea.querySelectorAll("button").forEach((x) => { x.disabled = true; });
          } else {
            b.classList.add("wobble");
            setTimeout(() => b.classList.remove("wobble"), 500);
            b.disabled = true;
            ctx.wrong(`That word says “${w}”. Listen again for “${q.word}”.`);
          }
        });
        sea.appendChild(b);
      });
      ctx.stage.append(sea);
    },
  });
})();
