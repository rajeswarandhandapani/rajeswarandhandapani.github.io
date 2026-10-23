/**
 * KlgPictograph — picture graphs, bar charts and tally marks.
 *
 *   pictograph(rows, { each })  rows: [{ label, emoji, count }]; each picture is worth `each`
 *   barChart(rows, { max })     horizontal bars; rows: [{ label, emoji, count }]
 *   tally(n)                    groups of five strokes
 *
 * data-total holds the sum so tests can check the picture. Rows carry
 * data-label and data-count.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function summary(rows, each) {
    return rows.map((r) => r.label + " " + r.count).join(", ") + (each > 1 ? ". Each picture is worth " + each : "");
  }

  function pictograph(rows, { each = 1, label } = {}) {
    const f = V.figure(label || "Picture graph: " + summary(rows, each), "kv-graph kv-picto");
    f.dataset.total = String(rows.reduce((a, r) => a + r.count, 0));
    f.dataset.each = String(each);
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "kv-grow";
      row.dataset.label = r.label;
      row.dataset.count = String(r.count);
      const name = document.createElement("span");
      name.className = "kv-glabel";
      name.setAttribute("aria-hidden", "true");
      name.textContent = r.label;
      const icons = document.createElement("span");
      icons.className = "kv-gicons";
      icons.setAttribute("aria-hidden", "true");
      for (let i = 0; i < r.count / each; i++) { const s = document.createElement("span"); s.textContent = r.emoji; icons.appendChild(s); }
      row.append(name, icons);
      f.appendChild(row);
    });
    if (each > 1) {
      const key = document.createElement("div");
      key.className = "kv-gkey";
      key.setAttribute("aria-hidden", "true");
      key.textContent = "Each " + rows[0].emoji + " = " + each;
      f.appendChild(key);
    }
    return f;
  }

  function barChart(rows, { max = Math.max.apply(null, rows.map((r) => r.count)), label } = {}) {
    const f = V.figure(label || "Bar chart: " + summary(rows, 1), "kv-graph kv-bars");
    f.dataset.total = String(rows.reduce((a, r) => a + r.count, 0));
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "kv-grow";
      row.dataset.label = r.label;
      row.dataset.count = String(r.count);
      row.setAttribute("aria-hidden", "true");
      const name = document.createElement("span");
      name.className = "kv-glabel";
      name.textContent = r.emoji + " " + r.label;
      const track = document.createElement("span");
      track.className = "kv-gtrack";
      const fill = document.createElement("span");
      fill.className = "kv-gfill";
      fill.style.width = (r.count / max) * 100 + "%";
      fill.textContent = r.count;
      track.appendChild(fill);
      row.append(name, track);
      f.appendChild(row);
    });
    return f;
  }

  function tally(n, { label } = {}) {
    const f = V.figure(label || "Tally marks showing " + n, "kv-graph kv-tally");
    f.dataset.total = String(n);
    for (let g = 0; g < Math.ceil(n / 5); g++) {
      const count = Math.min(5, n - g * 5);
      const grp = document.createElement("span");
      grp.className = "kv-tgroup";
      grp.setAttribute("aria-hidden", "true");
      for (let i = 0; i < Math.min(count, 4); i++) grp.appendChild(document.createElement("i"));
      if (count === 5) grp.classList.add("five");
      f.appendChild(grp);
    }
    return f;
  }

  window.KlgPictograph = { pictograph, barChart, tally };
})();
