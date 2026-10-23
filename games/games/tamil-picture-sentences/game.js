/**
 * படம் பார்த்து சொல் — read a Tamil sentence, pick its picture.
 *
 * Sentences come from the shared bank (tamil-sentences-data.js). The key
 * word is highlighted and plays its human recording when tapped; every
 * other word is tapped for the device's Tamil voice if there is one.
 *
 * Wrong pictures never belong to a noun that appears in the sentence itself
 * (a sentence about a leaf that mentions a tree never offers the tree).
 *
 *   ?level=1  animals and nature sentences
 *   ?level=2  (default) all sentences
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const A = window.KlgTamilAudio;
  const T = window.TamilSentenceData;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");
  const BANK = T.sentences.filter((s) => level === 2 || s.category === "animals" || s.category === "nature");

  const full = (s) => s.before + s.word + s.after;
  /** A picture is unfair if its word (or the start of it, to allow endings) is in the sentence. */
  function mentions(sentence, other) {
    const letters = T.letters(other.word);
    const stem = letters.slice(0, Math.max(2, letters.length - 1)).join("");
    return full(sentence).normalize("NFC").includes(stem.normalize("NFC")) || (other.alternatives || []).some((a) => full(sentence).includes(a));
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let s, tries = 0;
      do { s = V.pick(BANK); } while (asked.has(s.id) && ++tries < 40);
      asked.add(s.id);
      const pool = BANK.filter((o) => o.id !== s.id && !mentions(s, o));
      const same = V.shuffle(pool.filter((o) => o.category === s.category));
      const rest = V.shuffle(pool.filter((o) => o.category !== s.category));
      const wrongs = [...same, ...rest].filter((o, idx, all) => all.findIndex((x) => x.emoji === o.emoji) === idx && o.emoji !== s.emoji).slice(0, 3);
      return { s, options: V.shuffle([s, ...wrongs]) };
    },
    render(q, ctx) {
      const { s } = q;
      ctx.task("Read the sentence. Which picture does it tell about? · படம் எது?", "");
      const sentence = document.createElement("p");
      sentence.className = "kv-tamil-sentence tamil-glyph";
      sentence.dataset.id = s.id;
      const speak = (text) => { if (A) A.say(text); };
      const add = (text, key) => {
        text.split(/(\s+)/).forEach((tok) => {
          if (!tok.trim()) { sentence.appendChild(document.createTextNode(tok)); return; }
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-tword" + (key ? " key" : "");
          b.textContent = tok;
          b.addEventListener("click", () => speak(key ? s.word : tok.replace(/[.,“”!?]/g, "")));
          sentence.appendChild(b);
        });
      };
      add(s.before, false);
      add(s.word, true);
      add(s.after, false);
      const hearAll = document.createElement("button");
      hearAll.type = "button";
      hearAll.className = "kv-btn";
      hearAll.textContent = "🔊 Hear the word";
      hearAll.setAttribute("aria-label", "Hear the key word");
      hearAll.addEventListener("click", () => speak(s.word));
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      q.options.forEach((o) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn kv-picbtn";
        b.dataset.id = o.id;
        b.setAttribute("aria-label", o.clue);
        b.innerHTML = `<span style="font-size:2.6rem" aria-hidden="true">${o.emoji}</span>`;
        b.addEventListener("click", () => {
          if (o.id === s.id) { speak(s.word); ctx.right(`${s.word} — ${s.clue}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
          else { b.disabled = true; ctx.wrong("Read the sentence again. Which word tells you the picture?"); }
        });
        bar.appendChild(b);
      });
      ctx.stage.append(sentence, hearAll, bar);
    },
  });
})();
