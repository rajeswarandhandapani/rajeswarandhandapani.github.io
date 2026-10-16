/**
 * Letter Bubbles — hear a letter, pop the bubble that shows it.
 *
 *   ?set=vowels (default) | consonants | mixed | words
 *     words: hear a word, pop its picture
 *
 * Ten targets per round. Bubbles drift upwards and wrap around; with
 * reduced motion they sit still in a grid. A target counts toward the score
 * only when it is popped on the first try. Only letters with a recording
 * are targets, so every round can be heard on any device.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const $ = (id) => document.getElementById(id);
  const raw = new URLSearchParams(location.search).get("set");
  const set = ["consonants", "mixed", "words"].includes(raw) ? raw : "vowels";
  const ROUND = 10;
  const BUBBLES = 6;
  const COLORS = ["#ffd6e0", "#d6ecff", "#e3ffd6", "#fff1c2", "#ead6ff", "#d6fff6"];

  function items() {
    if (set === "words") {
      return TAMIL_WORDS.filter((w) => A.has(w.tamil)).map((w) => ({ say: w.tamil, show: w.emoji, label: w.english, key: w.emoji }));
    }
    const letters = set === "vowels" ? T.VOWELS.map((v) => v.tamil)
      : set === "consonants" ? T.CONSONANTS.map((c) => c.tamil)
      : [...T.VOWELS.map((v) => v.tamil), ...T.CONSONANTS.map((c) => c.tamil)];
    const seen = new Set();
    return letters
      .filter((l) => A.canSay(l))
      .map((l) => ({ say: l, show: l, label: l, key: (T.info(l) || {}).sound || l }))
      .filter((x) => !seen.has(x.key) && seen.add(x.key));
  }

  let pool = [], targets = [], index = 0, score = 0, firstTry = true, bubbles = [], raf = 0, last = 0;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function start() {
    pool = items();
    targets = T.shuffle(pool).slice(0, Math.min(ROUND, pool.length));
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("pop-screen").classList.remove("d-none");
    next();
  }

  function next() {
    if (index >= targets.length) return finish();
    firstTry = true;
    const target = targets[index];
    $("pop-count").textContent = `${index + 1} / ${targets.length}`;
    $("pop-score").textContent = `⭐ ${score}`;
    $("pop-feedback").textContent = "Listen, then pop the matching bubble!";
    const others = T.sample(pool.filter((p) => p.key !== target.key), BUBBLES - 1);
    spawn(T.shuffle([target, ...others]));
    setTimeout(() => A.say(target.say), 250);
  }

  function spawn(list) {
    const field = $("pop-field");
    field.replaceChildren();
    field.classList.toggle("still", reduced());
    const w = field.clientWidth;
    const h = field.clientHeight;
    const size = Math.max(64, Math.min(96, w / 4.2));
    // Bubbles travel in columns; each column moves at one speed and its
    // bubbles start evenly spaced, so they never overlap or block a tap.
    const cols = Math.max(2, Math.min(list.length, Math.floor(w / (size * 1.12))));
    const rows = Math.ceil(list.length / cols);
    const laneSpeed = Array.from({ length: cols }, () => 16 + Math.random() * 16);
    const laneOffset = Array.from({ length: cols }, () => Math.random() * h);
    const gapX = cols === 1 ? 0 : (w - size) / (cols - 1);
    const cycle = h + size;
    bubbles = list.map((item, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-bubble" + (set === "words" ? "" : " tamil-glyph");
      b.textContent = item.show;
      b.setAttribute("aria-label", item.label);
      b.style.width = b.style.height = size + "px";
      b.style.background = `radial-gradient(circle at 30% 30%, #fff, ${COLORS[i % COLORS.length]} 60%)`;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bubble = {
        el: b, item, col,
        x: col * gapX,
        y: (laneOffset[col] + (row * cycle) / rows) % cycle,
        speed: laneSpeed[col],
        wobble: Math.random() * Math.PI * 2,
      };
      b.addEventListener("click", () => tap(bubble));
      field.appendChild(b);
      return bubble;
    });
    place(0);
    cancelAnimationFrame(raf);
    last = performance.now();
    if (!reduced()) raf = requestAnimationFrame(tick);
  }

  function place(dt) {
    const field = $("pop-field");
    const h = field.clientHeight;
    bubbles.forEach((b) => {
      if (reduced()) { b.el.style.transform = ""; return; }
      b.y -= b.speed * dt;
      b.wobble += dt * 1.6;
      const size = b.el.offsetWidth;
      if (b.y < -size) b.y += h + size;
      b.el.style.transform = `translate(${b.x + Math.sin(b.wobble) * 4}px, ${b.y}px)`;
    });
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) place(dt);
    raf = requestAnimationFrame(tick);
  }

  function tap(bubble) {
    if (bubble.el.disabled) return;
    const target = targets[index];
    if (bubble.item.key === target.key) {
      if (firstTry) score += 1;
      bubble.el.classList.add("popped");
      bubbles.forEach((b) => (b.el.disabled = true));
      KlgTamilGames.cheer(bubble.el);
      $("pop-feedback").textContent = firstTry ? "Pop! அருமை! 🎉" : "Pop! You found it.";
      $("pop-score").textContent = `⭐ ${score}`;
      A.say(target.say);
      index += 1;
      setTimeout(next, 1300);
    } else {
      firstTry = false;
      KlgTamilGames.oops();
      bubble.el.classList.add("wrong");
      bubble.el.disabled = true;
      $("pop-feedback").textContent = `That one is ${bubble.item.show}. Listen again…`;
      setTimeout(() => A.say(target.say), 700);
    }
  }

  function finish() {
    cancelAnimationFrame(raf);
    A.stop();
    $("pop-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgTamilGames.finish({ score, total: targets.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  function stop() {
    cancelAnimationFrame(raf);
    A.stop();
    $("pop-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("start-screen").classList.remove("d-none");
    $("start-btn").focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.modeLinks($("mode-links"), "set", "vowels");
    KlgTamilGames.voiceNote($("voice-note"));
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("pop-exit").addEventListener("click", stop);
    $("pop-hear").addEventListener("click", () => targets[index] && A.say(targets[index].say));
    // Keep every bubble in its lane when the screen rotates or resizes.
    addEventListener("resize", () => {
      if (!bubbles.length) return;
      const w = $("pop-field").clientWidth;
      const size = bubbles[0].el.offsetWidth;
      const cols = Math.max(...bubbles.map((b) => b.col)) + 1;
      bubbles.forEach((b) => { b.x = cols === 1 ? (w - size) / 2 : b.col * ((w - size) / (cols - 1)); });
      place(0);
    });
  });
})();
