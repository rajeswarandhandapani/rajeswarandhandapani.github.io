/**
 * Measure Lab — three hands-on measuring tools.
 *
 *   ruler    Estimate how long the object is, then slide the marker to its end.
 *   balance  Add weights to the empty pan until the scale levels out.
 *   jug      Pour (+ / −) until the water reaches the amount asked for.
 *
 *   ?level=1  small whole numbers (ruler 2–10 cm, weights up to 9 g, jug to 400 mL)
 *   ?level=2  (default) bigger numbers (ruler to 16 cm, weights up to 47 g, jug to 1 L)
 *   ?level=3  jug amounts between the marked lines, heavier weights
 *
 * Only the measuring step scores. The estimate is practice and gets a kind word.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const MV = window.KlgMeasureVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const THINGS = ["✏️", "🖍️", "🥕", "🪥", "🔑", "🍴", "🪁", "🐛"];
  const OBJECTS = [["🍎", "apple"], ["🧸", "bear"], ["📖", "book"], ["⚽", "ball"], ["🥔", "potato"], ["🍌", "banana"]];
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const btn = (text, label, fn, cls) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn" + (cls ? " " + cls : ""), textContent: text });
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", fn);
    return b;
  };
  const bar = (...nodes) => { const d = document.createElement("div"); d.className = "kv-controls"; d.append(...nodes); return d; };

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let kind, key, tries = 0, q;
      do {
        kind = V.pick(["ruler", "balance", "jug"]);
        if (kind === "ruler") q = { kind, len: level === 1 ? V.rand(2, 10) : V.rand(3, 16), emoji: V.pick(THINGS) };
        else if (kind === "balance") q = { kind, w: level === 1 ? V.rand(2, 9) : level === 2 ? V.rand(11, 47) : V.rand(30, 95), item: V.pick(OBJECTS) };
        else {
          const max = level === 1 ? 400 : 1000;
          const marks = level === 3 ? [...Array(19)].map((_, k) => (k + 1) * 50).filter((v) => v % 250 !== 0) : [1, 2, 3].map((k) => (k * max) / 4);
          q = { kind, max, target: V.pick(marks) };
        }
        key = JSON.stringify(q);
      } while (asked.has(key) && ++tries < 30);
      asked.add(key);
      return q;
    },
    render(q, ctx) {
      if (q.kind === "ruler") return renderRuler(q, ctx);
      if (q.kind === "balance") return renderBalance(q, ctx);
      return renderJug(q, ctx);
    },
  });

  function renderRuler(q, ctx) {
    ctx.task(`First guess: about how long is the ${q.emoji}?`);
    const max = level === 1 ? 11 : 17;
    const ruler = MV.ruler(q.len, { unit: "cm", emoji: q.emoji, max, marker: true, label: `A ${q.emoji} lined up on a ruler. Move the marker to its end.` });
    // hide the answer from the aria-label: it is for the child to find
    const guesses = V.shuffle([...new Set([Math.max(1, Math.round(q.len / 2)), q.len + (q.len > 8 ? -1 : 1) * 0, Math.round(q.len * 2)])])
      .filter((g) => g !== q.len).slice(0, 2).concat(q.len);
    const guessBar = bar();
    const measure = document.createElement("div");
    measure.hidden = true;
    V.shuffle(guesses).forEach((g) => {
      const b = btn(`${g} cm`, `About ${g} centimetres`, () => {
        guessBar.querySelectorAll("button").forEach((x) => (x.disabled = true));
        const d = Math.abs(g - q.len);
        document.getElementById("feedback").className = "mg-feedback good";
        document.getElementById("feedback").textContent = d === 0 ? "A very good guess!" : "Thanks for guessing. Now measure to find out.";
        measure.hidden = false;
        ctx.task(`Now measure it: slide the marker to the end of the ${q.emoji}.`);
        slider.focus();
      });
      b.dataset.guess = String(g);
      guessBar.appendChild(b);
    });
    const slider = document.createElement("input");
    slider.type = "range"; slider.min = "0"; slider.max = String(max - 1); slider.step = "1"; slider.value = "0";
    slider.className = "kv-slider";
    slider.setAttribute("aria-label", "Marker position in centimetres");
    const read = document.createElement("div");
    read.className = "kv-readout";
    read.textContent = "0 cm";
    slider.addEventListener("input", () => { ruler.setMarker(Number(slider.value)); read.textContent = slider.value + " cm"; });
    const check = btn("Check ✓", "Check my measurement", () => {
      const v = Number(slider.value);
      if (v === q.len) { ctx.right(`The ${q.emoji} is ${q.len} cm long.`); check.disabled = slider.disabled = true; }
      else if (!ctx.firstTry()) { slider.value = q.len; ruler.setMarker(q.len); read.textContent = q.len + " cm"; ctx.reveal(`It is ${q.len} cm: it starts at 0 and ends at ${q.len}.`); check.disabled = slider.disabled = true; }
      else ctx.wrong(v < q.len ? "The marker is before the end of the object. Slide it further." : "The marker is past the end. Slide it back a little.");
    }, "primary");
    measure.append(slider, read, bar(check));
    ctx.stage.append(ruler, guessBar, measure);
  }

  function renderBalance(q, ctx) {
    ctx.task(`Add weights to balance the ${q.item[1]}.`);
    const sizes = level === 1 ? [1, 5] : level === 2 ? [1, 5, 10] : [1, 5, 10, 50];
    const added = [];
    const view = document.createElement("div");
    const total = document.createElement("div");
    total.className = "kv-readout";
    const buttons = bar();
    let done = false;
    function paint() {
      const sum = added.reduce((a, b) => a + b, 0);
      view.replaceChildren(MV.balance(q.w, sum, { leftEmoji: q.item[0], rightEmoji: "⚖️", label: sum === q.w ? "The scale is balanced" : sum < q.w ? "The scale tips down on the side with the " + q.item[1] : "The scale tips down on the weights side" }));
      view.firstChild.dataset.sum = String(sum);
      total.textContent = `Weights: ${sum} g`;
      total.dataset.sum = String(sum);
      if (!done && sum === q.w) {
        done = true;
        ctx.right(`${q.w} g balances the ${q.item[1]}.`);
        buttons.querySelectorAll("button").forEach((b) => (b.disabled = true));
      }
    }
    sizes.forEach((g) => buttons.appendChild(btn(`+ ${g} g`, `Add a ${g} gram weight`, () => { if (!done) { added.push(g); paint(); } })));
    buttons.appendChild(btn("↺ Undo", "Take off the last weight", () => { if (!done) { added.pop(); paint(); } }));
    // The object's weight is shown as a label, so the child works out which weights to add.
    const tag = document.createElement("div");
    tag.className = "kv-readout";
    tag.textContent = `${q.item[0]} weighs ${q.w} g`;
    tag.dataset.weight = String(q.w);
    const help = btn("Show me", "Show me the answer", () => {
      if (done) return;
      added.length = 0;
      let rest = q.w;
      [...sizes].sort((a, b) => b - a).forEach((g) => { while (rest >= g) { added.push(g); rest -= g; } });
      done = true;
      paint();
      ctx.reveal(`${added.join(" + ")} = ${q.w} g.`);
      buttons.querySelectorAll("button").forEach((b) => (b.disabled = true));
    });
    ctx.stage.append(tag, view, total, buttons, bar(help));
    paint();
  }

  function renderJug(q, ctx) {
    ctx.task(`Pour the water to ${q.target} mL.`);
    const step = level === 1 ? 100 : 50;
    let fill = 0;
    const view = document.createElement("div");
    const read = document.createElement("div");
    read.className = "kv-readout";
    let done = false;
    function paint() {
      view.replaceChildren(MV.jug(fill, q.max, { unit: "mL", label: `A measuring jug filled to ${fill} mL out of ${q.max}` }));
      view.firstChild.dataset.fill = String(fill);
      read.textContent = `${fill} mL`;
    }
    const plus = btn(`+ ${step} mL`, `Pour ${step} millilitres more`, () => { if (fill + step <= q.max) { fill += step; paint(); } });
    const minus = btn(`− ${step} mL`, `Pour ${step} millilitres out`, () => { if (fill - step >= 0) { fill -= step; paint(); } });
    const check = btn("Check ✓", "Check the jug", () => {
      if (fill === q.target) { done = true; ctx.right(`The water is at ${q.target} mL.`); [plus, minus, check].forEach((b) => (b.disabled = true)); }
      else if (!ctx.firstTry()) { fill = q.target; paint(); ctx.reveal(`Here is ${q.target} mL.`); [plus, minus, check].forEach((b) => (b.disabled = true)); }
      else ctx.wrong(fill < q.target ? "The water is below the line. Pour some more." : "That is too much. Pour a little out.");
    }, "primary");
    ctx.stage.append(view, read, bar(minus, plus, check));
    paint();
  }
})();
