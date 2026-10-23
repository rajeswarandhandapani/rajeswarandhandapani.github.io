/**
 * Sound It Out — early phonics with pictures.
 *
 *   blend  the letters c · a · t are shown one by one — tap the picture
 *          that matches the word they make (the word is also read aloud).
 *   build  a picture is shown — put the letter tiles in order to spell it.
 *
 *   ?level=1  three-letter words (cat, pig, sun)
 *   ?level=2  longer words with blends and digraphs (frog, ship, drum)
 *
 * Words come from KlgWordPics, and only words with one clear picture are used.
 * Build rounds add one spare letter tile so the child must think about which
 * sounds are in the word.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const P = window.KlgWordPics;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  const WORDS = level === 1
    ? ["cat", "hat", "bat", "rat", "can", "man", "pan", "van", "cap", "map", "nap", "bag", "bed", "hen", "pen", "net", "pet", "jet", "pig", "pin", "lip", "dog", "log", "pot", "mug", "bug", "hug", "sun", "run", "bun", "nut", "hut"]
    : ["frog", "flag", "ship", "chip", "drum", "crab", "sock", "bell", "ring", "king", "shell", "cloud"];
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");
  const CONSONANTS = "bcdfghjklmnprstw".split("");
  const VOWELS = "aeiou".split("");

  const btn = (text, label, fn, cls) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn" + (cls ? " " + cls : ""), textContent: text });
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", fn);
    return b;
  };

  /** Letter groups: sh, ch and cl-style blends stay together as one sound. */
  function sounds(word) {
    const out = [];
    for (let i = 0; i < word.length; i++) {
      const pair = word.slice(i, i + 2);
      if (["sh", "ch", "th", "ck", "ng", "ll"].includes(pair)) { out.push(pair); i++; } else out.push(word[i]);
    }
    return out;
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let word, kind, tries = 0;
      do { word = V.pick(WORDS); kind = V.pick(["blend", "build"]); } while (asked.has(word) && ++tries < 30);
      asked.add(word);
      return { word, kind };
    },
    render(q, ctx) {
      const parts = sounds(q.word);
      if (q.kind === "blend") {
        ctx.speak = false;
        ctx.task("Sound it out. What word do the letters make?");
        const row = document.createElement("div");
        row.className = "kv-letters";
        row.setAttribute("role", "img");
        row.setAttribute("aria-label", "Letters: " + parts.join(", "));
        row.dataset.word = q.word;
        parts.forEach((p, idx) => {
          const s = document.createElement("span");
          s.className = "kv-letter";
          s.textContent = p;
          s.style.animationDelay = idx * 0.35 + "s";
          row.appendChild(s);
        });
        const hear = btn("🔊 Say the word", "Hear the whole word", () => KlgRound.say(q.word));
        const others = V.shuffle(WORDS.filter((w) => w !== q.word && P.has(w) && w[0] !== q.word[0])).slice(0, 3);
        const choices = V.shuffle([q.word, ...others]);
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        choices.forEach((w) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-btn kv-picbtn";
          b.dataset.word = w;
          b.setAttribute("aria-label", w);
          b.innerHTML = `<span style="font-size:2.6rem" aria-hidden="true">${P.pic(w)}</span>`;
          b.addEventListener("click", () => {
            if (w === q.word) { KlgRound.say(q.word); ctx.right(`${parts.join(" – ")} makes ${q.word}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
            else { b.disabled = true; ctx.wrong("Blend the sounds together, one after the other."); }
          });
          bar.appendChild(b);
        });
        ctx.stage.append(row, hear, bar);
      } else {
        ctx.task("Look at the picture. Spell the word with the letters.");
        const pic = document.createElement("figure");
        pic.className = "kv-clue";
        pic.setAttribute("role", "img");
        pic.setAttribute("aria-label", "Picture of the word to spell");
        pic.dataset.word = q.word;
        pic.innerHTML = `<span aria-hidden="true">${P.pic(q.word)}</span>`;
        const spare = q.word.length < 4 ? V.pick(VOWELS.concat(CONSONANTS).filter((c) => !q.word.includes(c))) : V.pick(CONSONANTS.filter((c) => !q.word.includes(c)));
        const tiles = parts.concat(spare).map((t, idx) => ({ id: String(idx), text: t }));
        const host = document.createElement("div");
        const board = KlgPlayKit.buildFromTiles({ host, tiles, slots: parts.length, joiner: "" });
        const hear = btn("🔊 Say the word", "Hear the word", () => KlgRound.say(q.word));
        const clear = btn("Start again", "Clear the letters", () => board.reset());
        const check = btn("Check ✓", "Check my word", () => {
          if (!board.isFull()) return ctx.hint("Fill every box with a letter.");
          if (board.value() === q.word) { KlgRound.say(q.word); ctx.right(`${parts.join(" – ")} spells ${q.word}.`); check.disabled = clear.disabled = true; }
          else if (!ctx.firstTry()) { ctx.reveal(`The word is ${q.word}: ${parts.join(" – ")}.`); check.disabled = clear.disabled = true; }
          else { ctx.wrong("Not yet. Say the word slowly and listen for each sound."); board.reset(); }
        }, "primary");
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        bar.append(hear, clear, check);
        ctx.stage.append(pic, host, bar);
      }
    },
  });
})();
