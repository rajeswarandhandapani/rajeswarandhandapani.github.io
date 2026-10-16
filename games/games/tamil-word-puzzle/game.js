/**
 * Word Puzzle — build a Tamil word from letter tiles.
 *
 * A picture is shown and the word is heard; tap the letter tiles in order
 * to fill the slots (யா + னை = யானை). Tapping a filled slot sends its tile
 * back. When every slot is full the word is checked: wrong letters are
 * marked so the child can fix just those.
 *
 *   ?level=1 (default)  2–3 letter words, no extra tiles
 *   ?level=2            3–4 letter words, plus 2 look-alike tiles
 *   ?level=3            5+ letter words, plus 2 look-alike tiles
 *
 * A word counts toward the score when it is built without "Show me".
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const $ = (id) => document.getElementById(id);
  const level = ["2", "3"].includes(new URLSearchParams(location.search).get("level"))
    ? Number(new URLSearchParams(location.search).get("level")) : 1;
  const ROUND = 8;

  const all = TAMIL_WORDS.filter((w) => w.cat !== "colors").map((w) => ({ ...w, parts: T.letters(w.tamil) }));
  const fits = (n) => (level === 1 ? n >= 2 && n <= 3 : level === 2 ? n >= 3 && n <= 4 : n >= 5);
  const inLevel = all.filter((w) => fits(w.parts.length));
  const recorded = inLevel.filter((w) => A.has(w.tamil));
  const pool = recorded.length >= ROUND ? recorded : inLevel;

  let words = [], index = 0, score = 0, slots = [], tiles = [], helped = false, solved = false;

  function lookAlikes(word, count) {
    const out = [];
    const sounds = new Set(word.parts.map((p) => (T.info(p) || {}).sound || p));
    for (const p of T.shuffle(word.parts)) {
      const info = T.info(p);
      if (!info || info.kind !== "uyirmei") continue;
      const sibling = T.pick(T.UYIRMEI.filter((u) => u.base === info.base && !sounds.has(u.sound)));
      if (sibling && !out.includes(sibling.tamil)) { out.push(sibling.tamil); sounds.add(sibling.sound); }
      if (out.length >= count) break;
    }
    while (out.length < count) {
      const other = T.pick(T.pick(all).parts);
      const s = (T.info(other) || {}).sound || other;
      if (!sounds.has(s)) { out.push(other); sounds.add(s); }
    }
    return out;
  }

  function renderWord() {
    const word = words[index];
    helped = false;
    solved = false;
    $("puzzle-count").textContent = `Word ${index + 1} / ${words.length}`;
    $("puzzle-score").textContent = `⭐ ${score}`;
    $("puzzle-picture").textContent = word.emoji;
    $("puzzle-picture").setAttribute("aria-label", `Picture: ${word.english}. Tap to hear the word.`);
    $("puzzle-feedback").textContent = "Tap the letters in order.";
    $("puzzle-next").hidden = true;
    $("puzzle-help").disabled = false;
    slots = word.parts.map(() => null);
    const letters = level === 1 ? word.parts : [...word.parts, ...lookAlikes(word, 2)];
    tiles = T.shuffle(letters).map((text, i) => ({ id: i, text, used: false }));
    draw();
    A.say(word.tamil);
  }

  function draw() {
    const word = words[index];
    const slotRow = $("puzzle-slots");
    slotRow.replaceChildren();
    slots.forEach((tileId, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-slot tamil-glyph";
      const tile = tileId === null ? null : tiles.find((t) => t.id === tileId);
      b.textContent = tile ? tile.text : "";
      b.setAttribute("aria-label", tile ? `Slot ${i + 1}: ${tile.text}. Tap to remove.` : `Empty slot ${i + 1}`);
      if (tile && solved) b.classList.add("right");
      if (tile && tile.wrong) b.classList.add("wrong");
      b.disabled = solved || !tile;
      b.addEventListener("click", () => { tile.used = false; tile.wrong = false; slots[i] = null; draw(); });
      slotRow.appendChild(b);
    });
    const tray = $("puzzle-tiles");
    tray.replaceChildren();
    tiles.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-tile tamil-glyph";
      b.textContent = t.text;
      b.disabled = t.used || solved;
      b.setAttribute("aria-label", `Letter ${t.text}`);
      b.addEventListener("click", () => place(t));
      tray.appendChild(b);
    });
    slotRow.setAttribute("aria-label", `${word.parts.length} letter slots`);
  }

  function place(tile) {
    const empty = slots.indexOf(null);
    if (empty < 0) return;
    slots[empty] = tile.id;
    tile.used = true;
    A.play(tile.text); // only when recorded; blending every tile would be slow
    draw();
    if (!slots.includes(null)) setTimeout(check, 350);
  }

  function check() {
    const word = words[index];
    let allRight = true;
    slots.forEach((id, i) => {
      const t = tiles.find((x) => x.id === id);
      t.wrong = t.text !== word.parts[i];
      if (t.wrong) allRight = false;
    });
    if (allRight) {
      solved = true;
      if (!helped) score += 1;
      KlgTamilGames.cheer($("puzzle-slots"));
      $("puzzle-feedback").textContent = `${word.tamil} — ${word.english}! ${helped ? "Now you know it." : "அருமை!"}`;
      $("puzzle-next").hidden = false;
      $("puzzle-help").disabled = true;
      draw();
      $("puzzle-next").focus();
      setTimeout(() => A.say(word.tamil), 300);
    } else {
      KlgTamilGames.oops();
      $("puzzle-feedback").textContent = "Almost! Tap the red letters to take them out, then try again.";
      draw();
    }
  }

  function showMe() {
    const word = words[index];
    helped = true;
    tiles.forEach((t) => { t.used = false; t.wrong = false; });
    slots = word.parts.map((p) => {
      const t = tiles.find((x) => x.text === p && !x.used);
      t.used = true;
      return t.id;
    });
    check();
  }

  function finish() {
    A.stop();
    $("puzzle-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgTamilGames.finish({ score, total: words.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  function start() {
    words = T.sample(pool, Math.min(ROUND, pool.length));
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("puzzle-screen").classList.remove("d-none");
    renderWord();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks($("mode-links"), "level", "1");
    KlgTamilGames.voiceNote($("voice-note"));
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("puzzle-picture").addEventListener("click", () => A.say(words[index].tamil));
    $("puzzle-hear").addEventListener("click", () => A.say(words[index].tamil));
    $("puzzle-help").addEventListener("click", showMe);
    $("puzzle-next").addEventListener("click", () => { index += 1; index >= words.length ? finish() : renderWord(); });
    $("puzzle-exit").addEventListener("click", () => {
      A.stop();
      $("puzzle-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
  });
})();
