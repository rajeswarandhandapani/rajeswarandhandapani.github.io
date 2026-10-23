/**
 * KlgMathVis — pictures for multiplication and division questions.
 *
 * Every builder returns a <figure role="img"> with an aria-label that says
 * what the picture shows, so the maths stays accessible without the image.
 *
 *   groups(count, each, emoji, { holder })   count plates/bags with `each` items
 *   array(rows, cols, emoji)                 rows × columns grid
 *   numberLine({ step, hops, max, back })    frog hops of `step` along 0…max
 *   circled(total, size, emoji)              items looped into groups of `size`
 *   share(total, people, emoji)              a pile and the people sharing it
 *   triangle(product, a, b, hidden)          fact-family triangle, one corner "?"
 *   pile(count, emoji)                       loose items in rows of five
 *   rand, pick, shuffle, numberChoices(answer, likelyMistakes)
 *
 * Holders: "plate" 🍽️, "bag" 🛍️, "box" 📦, "basket" 🧺, "pot" 🪴, "none".
 * Big pictures shrink automatically (data-size="s" / "xs").
 */
(function () {
  "use strict";
  const SVG = "http://www.w3.org/2000/svg";

  function figure(label, className) {
    const f = document.createElement("figure");
    f.className = "mv " + className;
    f.setAttribute("role", "img");
    f.setAttribute("aria-label", label);
    return f;
  }

  function sizeFor(total) {
    return total > 60 ? "xs" : total > 30 ? "s" : "m";
  }

  function itemsSpan(count, emoji) {
    const wrap = document.createElement("span");
    wrap.className = "mv-items";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "mv-item";
      s.textContent = emoji;
      wrap.appendChild(s);
    }
    return wrap;
  }

  const HOLDERS = { plate: "plate", bag: "bag", box: "box", basket: "basket", pot: "pot", none: "plain" };
  const HOLDER_WORD = { plate: "plates", bag: "bags", box: "boxes", basket: "baskets", pot: "pots", none: "groups" };

  function groups(count, each, emoji, { holder = "plate", label } = {}) {
    const f = figure(label || `${count} ${HOLDER_WORD[holder]} with ${each} ${emoji} in each`, "mv-groups");
    f.dataset.size = sizeFor(count * each);
    for (let g = 0; g < count; g++) {
      const box = document.createElement("div");
      box.className = "mv-holder mv-" + (HOLDERS[holder] || "plain");
      box.appendChild(itemsSpan(each, emoji));
      f.appendChild(box);
    }
    return f;
  }

  function array(rows, cols, emoji, { label } = {}) {
    const f = figure(label || `${rows} rows of ${cols} ${emoji}`, "mv-array");
    f.dataset.size = sizeFor(rows * cols);
    f.style.setProperty("--cols", cols);
    for (let i = 0; i < rows * cols; i++) {
      const s = document.createElement("span");
      s.className = "mv-item";
      s.textContent = emoji;
      s.setAttribute("aria-hidden", "true");
      f.appendChild(s);
    }
    return f;
  }

  function pile(count, emoji, { label } = {}) {
    const f = figure(label || `${count} ${emoji}`, "mv-pile");
    f.dataset.size = sizeFor(count);
    for (let start = 0; start < count; start += 5) {
      const row = itemsSpan(Math.min(5, count - start), emoji);
      row.classList.add("mv-five");
      f.appendChild(row);
    }
    return f;
  }

  function el(name, attrs, text) {
    const n = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /**
   * A frog hopping `hops` times by `step` from 0 (or back from the end when
   * back=true). Ticks every 1 up to 30, otherwise every `step`; multiples of
   * the step are labelled. hideEnd hides the landing number (the answer).
   */
  function numberLine({ step, hops, max = step * hops, back = false, hideEnd = false, label }) {
    const f = figure(label || (back
      ? `A frog hops back from ${max} to 0 in jumps of ${step}`
      : `A frog makes ${hops} hops of ${step} from 0`), "mv-line");
    const W = 460, H = 150, pad = 24, y = 108;
    const x = (v) => pad + (v / max) * (W - pad * 2);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
    svg.appendChild(el("line", { x1: x(0), y1: y, x2: x(max), y2: y, class: "mv-axis" }));
    const tickEvery = max <= 30 ? 1 : step;
    const landing = back ? 0 : step * hops;
    for (let v = 0; v <= max; v += tickEvery) {
      const major = v % step === 0;
      svg.appendChild(el("line", { x1: x(v), y1: y - (major ? 9 : 5), x2: x(v), y2: y + (major ? 9 : 5), class: "mv-tick" }));
      if (!major) continue;
      const hide = hideEnd && v === landing;
      svg.appendChild(el("text", { x: x(v), y: y + 30, class: hide ? "mv-num mv-hidden" : "mv-num" }, hide ? "?" : String(v)));
    }
    for (let i = 0; i < hops; i++) {
      const from = back ? max - i * step : i * step;
      const to = back ? from - step : from + step;
      const mid = (x(from) + x(to)) / 2;
      const lift = Math.min(70, 26 + (x(to) - x(from) > 0 ? x(to) - x(from) : x(from) - x(to)) * 0.35);
      svg.appendChild(el("path", { d: `M ${x(from)} ${y - 4} Q ${mid} ${y - lift} ${x(to)} ${y - 4}`, class: "mv-hop" }));
      svg.appendChild(el("circle", { cx: x(to), cy: y - 4, r: 4, class: "mv-land" }));
    }
    svg.appendChild(el("text", { x: x(back ? max : 0), y: y - 16, class: "mv-frog" }, "🐸"));
    f.appendChild(svg);
    return f;
  }

  function circled(total, size, emoji, { label } = {}) {
    const full = Math.floor(total / size);
    const left = total % size;
    const f = figure(label || `${total} ${emoji} looped into groups of ${size}` + (left ? `, ${left} left over` : ""), "mv-circled");
    f.dataset.size = sizeFor(total);
    for (let g = 0; g < full; g++) {
      const loop = document.createElement("div");
      loop.className = "mv-loop";
      loop.appendChild(itemsSpan(size, emoji));
      f.appendChild(loop);
    }
    if (left) {
      const rest = document.createElement("div");
      rest.className = "mv-leftover";
      rest.appendChild(itemsSpan(left, emoji));
      f.appendChild(rest);
    }
    return f;
  }

  const PEOPLE = ["🧒", "👧", "👦", "🧑", "👩", "👨", "🧒🏽", "👧🏾", "👦🏻", "🧑🏽"];
  function share(total, people, emoji, { label } = {}) {
    const f = figure(label || `${total} ${emoji} to share between ${people} children`, "mv-share");
    f.appendChild(pile(total, emoji, { label: "" }));
    const row = document.createElement("div");
    row.className = "mv-people";
    row.setAttribute("aria-hidden", "true");
    for (let i = 0; i < people; i++) {
      const p = document.createElement("span");
      p.className = "mv-person";
      p.textContent = PEOPLE[i % PEOPLE.length];
      row.appendChild(p);
    }
    f.appendChild(row);
    return f;
  }

  /** Fact-family triangle: product on top, factors at the bottom corners. */
  function triangle(product, a, b, hidden) {
    const show = (key, v) => (hidden === key ? "?" : String(v));
    const f = figure(`Fact family triangle: top ${show("product", product)}, corners ${show("a", a)} and ${show("b", b)}`, "mv-triangle");
    const svg = el("svg", { viewBox: "0 0 300 250", "aria-hidden": "true" });
    svg.appendChild(el("path", { d: "M150 18 L284 232 L16 232 Z", class: "mv-tri" }));
    svg.appendChild(el("line", { x1: 60, y1: 168, x2: 240, y2: 168, class: "mv-tri-line" }));
    svg.appendChild(el("text", { x: 150, y: 132, class: "mv-tri-sign" }, "×  ÷"));
    const corner = (x, y, key, v) => {
      svg.appendChild(el("circle", { cx: x, cy: y, r: 34, class: hidden === key ? "mv-tri-hole" : "mv-tri-dot" }));
      svg.appendChild(el("text", { x, y: y + 11, class: "mv-tri-num" }, show(key, v)));
    };
    corner(150, 72, "product", product);
    corner(68, 204, "a", a);
    corner(232, 204, "b", b);
    f.appendChild(svg);
    return f;
  }

  // --- Small helpers shared by the maths games ----------------------------
  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** The answer plus three distinct, positive, plausible wrong numbers. */
  function numberChoices(answer, mistakes) {
    const wrong = [];
    for (const v of [...mistakes, answer + 1, answer - 1, answer + 2, answer + 10, answer - 2]) {
      if (Number.isInteger(v) && v > 0 && v !== answer && !wrong.includes(v)) wrong.push(v);
      if (wrong.length === 3) break;
    }
    return shuffle([answer, ...wrong]);
  }

  window.KlgMathVis = {
    groups, array, numberLine, circled, share, triangle, pile, HOLDER_WORD,
    rand, pick, shuffle, numberChoices,
    figure, el, sizeFor, SVG,
  };
})();
