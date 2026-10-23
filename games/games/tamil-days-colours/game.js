/**
 * நாட்கள் · நிறங்கள் — Tamil days of the week, months and colours.
 *
 *   ?mode=days      the week drawn as seven boxes (Sunday first)
 *   ?mode=months    the year drawn as twelve numbered boxes
 *   ?mode=colours   colour swatches
 *
 * Two kinds of question, mixed:
 *   see   a picture is shown (one day lit up, one month lit up, one swatch)
 *         — pick its Tamil name from four.
 *   hear  a Tamil name is shown and spoken (with the recording when there is
 *         one) — tap the matching day, month or colour.
 * Wrong names are always other items of the same group.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const A = window.KlgTamilAudio;
  const D = window.TamilDaysData;
  const mode = ["days", "months", "colours"].includes(new URLSearchParams(location.search).get("mode")) ? new URLSearchParams(location.search).get("mode") : "days";
  KlgGameKit.modeLinks(document.getElementById("mode-links"), "mode", "days");

  const ITEMS = mode === "days" ? D.DAYS : mode === "months" ? D.MONTHS : D.COLOURS;
  const GROUP = { days: ["day", "இது எந்த கிழமை?"], months: ["month", "இது எந்த மாதம்?"], colours: ["colour", "இது என்ன நிறம்?"] }[mode];
  const ABBR = ["S", "M", "T", "W", "T", "F", "S"];

  const say = (word) => { if (A && A.canSay(word)) A.say(word); else KlgRound.say(word); };

  /** The picture for one item; `onPick` makes every cell a button. */
  function picture(item, onPick) {
    if (mode === "colours") {
      const wrap = document.createElement("div");
      wrap.className = "kv-swatches";
      const list = onPick ? item : [item];
      list.forEach((c) => {
        const el = document.createElement(onPick ? "button" : "span");
        el.className = "kv-swatch";
        el.style.background = c.css;
        el.dataset.english = c.english;
        if (onPick) { el.type = "button"; el.setAttribute("aria-label", c.english); el.addEventListener("click", () => onPick(c, el)); }
        else { wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", `A ${c.english} colour swatch`); wrap.dataset.english = c.english; }
        wrap.appendChild(el);
      });
      return wrap;
    }
    const fig = document.createElement(onPick ? "div" : "figure");
    fig.className = "kv-" + (mode === "days" ? "week" : "year");
    const list = mode === "days" ? D.DAYS : D.MONTHS;
    if (!onPick) {
      fig.setAttribute("role", "img");
      fig.setAttribute("aria-label", mode === "days" ? `A week with ${item.english} lit up` : `A year with month ${item.month} lit up`);
      fig.dataset.english = item.english;
    } else {
      fig.setAttribute("role", "group");
      fig.setAttribute("aria-label", mode === "days" ? "The days of the week" : "The months of the year");
    }
    list.forEach((it) => {
      const cell = document.createElement(onPick ? "button" : "span");
      cell.className = "kv-cell2" + (!onPick && it === item ? " lit" : "");
      cell.textContent = mode === "days" ? ABBR[it.day] : String(it.month);
      cell.dataset.english = it.english;
      if (onPick) { cell.type = "button"; cell.setAttribute("aria-label", it.english); cell.addEventListener("click", () => onPick(it, cell)); }
      fig.appendChild(cell);
    });
    return fig;
  }

  const textButton = (item, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kv-btn tamil-glyph";
    b.textContent = item.tamil;
    b.dataset.english = item.english;
    b.setAttribute("aria-label", item.tamil);
    b.addEventListener("click", () => fn(item, b));
    return b;
  };

  KlgRound.run({
    total: 8,
    make(i, asked) {
      let item, kind, tries = 0;
      do { item = V.pick(ITEMS); kind = V.pick(["see", "hear"]); } while (asked.has(kind + item.english) && ++tries < 30);
      asked.add(kind + item.english);
      return { item, kind };
    },
    render(q, ctx) {
      const { item } = q;
      if (q.kind === "see") {
        ctx.task(`What is this ${GROUP[0]} called in Tamil? · ${GROUP[1]}`, "");
        const wrongs = V.shuffle(ITEMS.filter((x) => x !== item)).slice(0, 3);
        const bar = document.createElement("div");
        bar.className = "kv-controls";
        V.shuffle([item, ...wrongs]).forEach((it) => bar.appendChild(textButton(it, (picked, b) => {
          if (picked === item) { say(item.tamil); ctx.right(`${item.tamil} is ${item.english}.`); bar.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
          else { b.disabled = true; ctx.wrong("Look at the picture again and try another name."); }
        })));
        ctx.stage.append(picture(item), bar);
      } else {
        ctx.task(`Tap ${mode === "colours" ? "the colour" : "the " + GROUP[0]}: “${item.tamil}”`, "");
        say(item.tamil);
        const hear = document.createElement("button");
        hear.type = "button";
        hear.className = "kv-btn tamil-glyph";
        hear.textContent = `🔊 ${item.tamil}`;
        hear.setAttribute("aria-label", `Hear ${item.tamil}`);
        hear.addEventListener("click", () => say(item.tamil));
        const choose = mode === "colours" ? V.shuffle([item, ...V.shuffle(ITEMS.filter((x) => x !== item)).slice(0, 3)]) : ITEMS;
        let done = false;
        const pic = picture(choose, (picked, el) => {
          if (done) return;
          if (picked === item) { done = true; say(item.tamil); ctx.right(`${item.tamil} is ${item.english}.`); pic.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
          else { el.disabled = true; ctx.wrong(`That is ${picked.english}. Listen again.`); }
        });
        pic.dataset.target = item.english;
        ctx.stage.append(hear, pic);
      }
    },
  });
})();
