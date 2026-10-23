/**
 * Picture Graphs — read pictographs, bar charts and tally marks.
 *
 *   most    "Which has the most?" (or fewest)
 *   count   "How many are there?" — a pictograph, bar chart or tally
 *   diff    "How many more … than …?"
 *   tally   make tally marks for a number you counted in a picture
 *
 *   ?level=1  pictographs, small numbers, one picture = 1
 *   ?level=2  (default) adds bar charts and "how many more"
 *   ?level=3  one picture = 2, bigger numbers, and making tallies
 *
 * The counts in each graph are all different, so "most" and "fewest" always
 * have exactly one answer; the choices are checked against the data.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const G = window.KlgPictograph;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const SETS = [
    { title: "Favourite fruit", items: [["🍎", "apples"], ["🍌", "bananas"], ["🍇", "grapes"], ["🍓", "strawberries"]] },
    { title: "Pets", items: [["🐶", "dogs"], ["🐱", "cats"], ["🐟", "fish"], ["🐦", "birds"]] },
    { title: "Sports", items: [["⚽", "football"], ["🏀", "basketball"], ["🎾", "tennis"], ["🏐", "volleyball"]] },
    { title: "Toys", items: [["🧸", "bears"], ["🚗", "cars"], ["🪁", "kites"], ["🎈", "balloons"]] },
  ];
  const KINDS = level === 1 ? ["most", "count", "count"] : level === 2 ? ["most", "count", "diff", "count"] : ["most", "count", "diff", "tally"];
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const btn = (text, label, fn, cls) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn" + (cls ? " " + cls : ""), textContent: text });
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", fn);
    return b;
  };

  /** n different counts between lo and hi. */
  function distinct(n, lo, hi, each) {
    const pool = [];
    for (let v = lo; v <= hi; v += each) pool.push(v);
    return V.shuffle(pool).slice(0, n);
  }

  KlgRound.run({
    total: 8,
    make(i, asked) {
      const kind = V.pick(KINDS);
      const each = level === 3 ? 2 : 1;
      const set = V.pick(SETS);
      const hi = level === 1 ? 6 : level === 2 ? 9 : 16;
      const counts = distinct(4, each, hi, each);
      const rows = set.items.map(([emoji, label], idx) => ({ emoji, label, count: counts[idx] }));
      const style = level === 1 ? "picto" : V.pick(["picto", "bars"]);
      return { kind, set, rows, each, style, ask: V.shuffle(rows.slice()) };
    },
    render(q, ctx) {
      const chart = q.kind === "tally" ? null : q.style === "bars"
        ? G.barChart(q.rows, { label: `Bar chart of ${q.set.title.toLowerCase()}` })
        : G.pictograph(q.rows, { each: q.each, label: `Picture graph of ${q.set.title.toLowerCase()}` });
      if (chart) {
        // The data is read from the picture, so the label keeps to the title.
        chart.setAttribute("aria-label", `${q.set.title}: ` + q.rows.map((r) => `${r.label} ${r.count}`).join(", "));
      }
      const [a, b] = q.ask;
      const title = document.createElement("div");
      title.className = "kv-readout";
      title.textContent = q.set.title;
      const answerBar = document.createElement("div");
      answerBar.className = "kv-controls";
      const lock = () => answerBar.querySelectorAll("button").forEach((x) => (x.disabled = true));
      const choose = (value, correct, why) => {
        const bt = btn(String(value), String(value), () => {
          if (value === correct) { ctx.right(why); lock(); }
          else { bt.disabled = true; ctx.wrong("Look at the graph again."); }
        });
        bt.dataset.value = String(value);
        answerBar.appendChild(bt);
      };

      if (q.kind === "most") {
        const most = q.rows.reduce((x, y) => (y.count > x.count ? y : x));
        const fewest = q.rows.reduce((x, y) => (y.count < x.count ? y : x));
        const askMost = Math.random() < 0.5;
        const target = askMost ? most : fewest;
        ctx.task(`Which has the ${askMost ? "most" : "fewest"}?`);
        V.shuffle(q.rows.slice()).forEach((r) => {
          const bt = btn(`${r.emoji} ${r.label}`, r.label, () => {
            if (r === target) { ctx.right(`${target.label} has ${target.count}, the ${askMost ? "most" : "fewest"}.`); lock(); }
            else { bt.disabled = true; ctx.wrong("Compare the rows. Which is " + (askMost ? "longest" : "shortest") + "?"); }
          });
          bt.dataset.value = r.label;
          answerBar.appendChild(bt);
        });
        ctx.stage.append(title, chart, answerBar);
      } else if (q.kind === "count") {
        ctx.task(`How many ${a.label}?`);
        const wrong = V.shuffle([a.count + q.each, a.count - q.each, a.count + 2 * q.each, a.count + 1].filter((v) => v > 0 && v !== a.count)).slice(0, 3);
        V.shuffle([a.count, ...[...new Set(wrong)]]).forEach((v) => choose(v, a.count, `There ${a.count === 1 ? "is" : "are"} ${a.count} ${a.label}.`));
        ctx.stage.append(title, chart, answerBar);
      } else if (q.kind === "diff") {
        const more = a.count >= b.count ? [a, b] : [b, a];
        const gap = more[0].count - more[1].count;
        ctx.task(`How many more ${more[0].label} than ${more[1].label}?`);
        const wrong = V.shuffle([gap + 1, gap - 1, more[0].count + more[1].count, gap + 2, more[0].count].filter((v) => v > 0 && v !== gap)).slice(0, 3);
        V.shuffle([gap, ...[...new Set(wrong)]]).forEach((v) => choose(v, gap, `${more[0].count} − ${more[1].count} = ${gap}.`));
        ctx.stage.append(title, chart, answerBar);
      } else {
        renderTally(q, ctx);
      }
    },
  });

  function renderTally(q, ctx) {
    const [a] = q.ask;
    const n = Math.min(a.count, 16);
    ctx.task(`Count the ${a.emoji}. Make that many tally marks.`);
    const scene = document.createElement("figure");
    scene.className = "kv-clue";
    scene.setAttribute("role", "img");
    scene.setAttribute("aria-label", `${n} ${a.label}`);
    scene.dataset.count = String(n);
    scene.style.fontSize = "2rem";
    scene.innerHTML = `<span aria-hidden="true">${a.emoji.repeat(n)}</span>`;
    let marks = 0;
    const view = document.createElement("div");
    function paint() { view.replaceChildren(G.tally(marks)); view.firstChild.dataset.total = String(marks); if (!marks) view.firstChild.textContent = "No marks yet"; }
    const add = btn("+ 1 mark", "Add a tally mark", () => { if (marks < 20) { marks += 1; paint(); } });
    const take = btn("− 1 mark", "Take away a tally mark", () => { if (marks > 0) { marks -= 1; paint(); } });
    const check = btn("Check ✓", "Check my tally", () => {
      if (marks === n) { ctx.right(`${n} tally marks: ${Math.floor(n / 5)} groups of five and ${n % 5} more.`); [add, take, check].forEach((x) => (x.disabled = true)); }
      else if (!ctx.firstTry()) { marks = n; paint(); ctx.reveal(`There are ${n}.`); [add, take, check].forEach((x) => (x.disabled = true)); }
      else ctx.wrong(marks < n ? "You need more tally marks. Count the pictures again." : "That is too many. Count the pictures again.");
    }, "primary");
    const bar = document.createElement("div");
    bar.className = "kv-controls";
    bar.append(take, add, check);
    ctx.stage.append(scene, view, bar);
    paint();
  }
})();
