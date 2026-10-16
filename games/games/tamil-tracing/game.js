/**
 * Trace Tamil Letters — write over a large dotted letter with a finger,
 * stylus or mouse, then tap "Check".
 *
 *   ?set=vowels (default) | consonants | uyirmei
 *
 * Checking compares the child's ink with the letter's shape, both drawn on
 * hidden canvases: "covered" is the share of the letter's pixels that have
 * ink nearby, "outside" is the share of ink far from the letter. Generous
 * limits keep it encouraging; the goal is careful tracing, not exact
 * stroke order. Five letters per round; each letter traced well is a star.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const $ = (id) => document.getElementById(id);
  const raw = new URLSearchParams(location.search).get("set");
  const set = ["consonants", "uyirmei"].includes(raw) ? raw : "vowels";
  const ROUND = 5;
  const PASS_COVER = 0.55;
  const PASS_OUTSIDE = 0.4;

  const pool = set === "vowels" ? T.VOWELS.map((v) => v.tamil)
    : set === "consonants" ? T.CONSONANTS.map((c) => c.tamil)
    : T.UYIRMEI.filter((u) => A.has(u.tamil)).map((u) => u.tamil);

  let canvas, ctx, guide, letters = [], index = 0, score = 0, strokes = [], drawing = null, checked = false;

  function size() {
    const box = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(box.width);
    const h = Math.round(Math.min(box.width * 0.85, 420));
    canvas.style.height = h + "px";
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function fontFor(letter, w, h) {
    // Wide compound letters (கொ, கௌ) need a smaller size to fit.
    const scale = letter.length > 2 ? 0.48 : T.letters(letter)[0].length > 1 ? 0.62 : 0.72;
    return `600 ${Math.round(Math.min(h, w * 0.9) * scale)}px "Noto Sans Tamil", sans-serif`;
  }

  function drawLetterShape(c, letter, w, h, style) {
    c.save();
    c.font = fontFor(letter, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    const m = c.measureText(letter);
    const y = h / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    const fit = Math.min(1, (w * 0.9) / Math.max(1, m.width));
    c.translate(w / 2, y);
    c.scale(fit, fit);
    style(c);
    c.restore();
  }

  function render() {
    const { w, h } = size();
    const letter = letters[index];
    ctx.clearRect(0, 0, w, h);
    drawLetterShape(ctx, letter, w, h, (c) => {
      c.fillStyle = checked ? "#cfe8d6" : "#eef1fb";
      c.fillText(letter, 0, 0);
      c.setLineDash([3, 7]);
      c.lineWidth = 2.5;
      c.strokeStyle = "#7d8fd0";
      c.strokeText(letter, 0, 0);
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#b64261";
    ctx.lineWidth = Math.max(10, w / 32);
    strokes.forEach((s) => {
      ctx.beginPath();
      s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
      ctx.stroke();
    });
  }

  function evaluate() {
    const { w, h } = { w: canvas.clientWidth, h: canvas.clientHeight };
    const S = 0.5; // analyse at half resolution
    const W = Math.round(w * S), H = Math.round(h * S);
    const make = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.scale(S, S); return x; };
    const shape = make();
    drawLetterShape(shape, letters[index], w, h, (c) => { c.fillStyle = "#000"; c.fillText(letters[index], 0, 0); });
    const near = make(); // the letter, thickened, as the "allowed" zone
    drawLetterShape(near, letters[index], w, h, (c) => { c.lineWidth = Math.max(26, w / 12); c.lineJoin = "round"; c.strokeStyle = "#000"; c.fillStyle = "#000"; c.fillText(letters[index], 0, 0); c.strokeText(letters[index], 0, 0); });
    const ink = make();
    ink.lineCap = ink.lineJoin = "round";
    ink.lineWidth = Math.max(10, w / 32) * 2.4;
    ink.strokeStyle = "#000";
    strokes.forEach((s) => { ink.beginPath(); s.forEach((p, i) => (i ? ink.lineTo(p.x, p.y) : ink.moveTo(p.x, p.y))); if (s.length === 1) ink.lineTo(s[0].x + 0.1, s[0].y); ink.stroke(); });
    const a = shape.getImageData(0, 0, W, H).data;
    const z = near.getImageData(0, 0, W, H).data;
    const k = ink.getImageData(0, 0, W, H).data;
    let letterPx = 0, covered = 0, inkPx = 0, outside = 0;
    for (let i = 3; i < a.length; i += 4 * 2) {
      if (a[i] > 128) { letterPx++; if (k[i] > 128) covered++; }
      if (k[i] > 128) { inkPx++; if (z[i] < 128) outside++; }
    }
    return { cover: letterPx ? covered / letterPx : 0, outside: inkPx ? outside / inkPx : 1, inkPx };
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bindDrawing() {
    canvas.addEventListener("pointerdown", (e) => {
      if (checked) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = [point(e)];
      strokes.push(drawing);
      render();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      drawing.push(point(e));
      render();
    });
    const end = () => { drawing = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function showLetter() {
    strokes = [];
    checked = false;
    const letter = letters[index];
    $("trace-count").textContent = `Letter ${index + 1} / ${letters.length}`;
    $("trace-score").textContent = `⭐ ${score}`;
    $("trace-feedback").textContent = "Trace the dotted letter. Start anywhere — go slowly!";
    $("trace-check").hidden = false;
    $("trace-next").hidden = true;
    $("trace-clear").disabled = false;
    canvas.setAttribute("aria-label", `Tracing area for the letter ${letter}`);
    render();
    A.say(letter);
  }

  function check() {
    const r = evaluate();
    if (r.inkPx < 20) {
      $("trace-feedback").textContent = "Draw over the dotted letter first ✏️";
      return;
    }
    const good = r.cover >= PASS_COVER && r.outside <= PASS_OUTSIDE;
    if (good) {
      score += 1;
      checked = true;
      KlgTamilGames.cheer(canvas);
      A.say(letters[index]);
      $("trace-feedback").textContent = `அருமை! Lovely ${letters[index]} — ${Math.round(r.cover * 100)}% traced.`;
      $("trace-check").hidden = true;
      $("trace-next").hidden = false;
      $("trace-clear").disabled = true;
      $("trace-score").textContent = `⭐ ${score}`;
      render();
      $("trace-next").focus();
    } else {
      KlgTamilGames.oops();
      $("trace-feedback").textContent = r.cover < PASS_COVER
        ? `Nearly! Trace more of the letter (${Math.round(r.cover * 100)}% so far).`
        : "Try to stay on the dotted lines. Clear and try again!";
      $("trace-skip").hidden = false;
    }
  }

  function next() {
    index += 1;
    $("trace-skip").hidden = true;
    if (index >= letters.length) return finish();
    showLetter();
  }

  function finish() {
    A.stop();
    $("trace-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgTamilGames.finish({ score, total: letters.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  function start() {
    letters = T.sample(pool, Math.min(ROUND, pool.length));
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("trace-screen").classList.remove("d-none");
    $("trace-skip").hidden = true;
    document.fonts.load(fontFor("அ", 300, 300)).finally(showLetter);
  }

  document.addEventListener("DOMContentLoaded", () => {
    canvas = $("trace-canvas");
    ctx = canvas.getContext("2d");
    KlgTamilGames.modeLinks($("mode-links"), "set", "vowels");
    KlgTamilGames.voiceNote($("voice-note"));
    bindDrawing();
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("trace-check").addEventListener("click", check);
    $("trace-next").addEventListener("click", next);
    $("trace-skip").addEventListener("click", next);
    $("trace-clear").addEventListener("click", () => { strokes = []; render(); });
    $("trace-hear").addEventListener("click", () => A.say(letters[index]));
    $("trace-exit").addEventListener("click", () => {
      A.stop();
      $("trace-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
    // Mobile browsers fire resize when the address bar hides; only a real
    // width change (rotation) moves the letter, so only then clear the ink.
    let lastWidth = innerWidth;
    addEventListener("resize", () => {
      if (innerWidth === lastWidth || $("trace-screen").classList.contains("d-none")) return;
      lastWidth = innerWidth;
      strokes = [];
      render();
    });
  });
})();
