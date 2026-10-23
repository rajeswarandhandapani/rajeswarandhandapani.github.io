/**
 * KlgClock — analog clocks, digital faces and a timeline for elapsed time.
 *
 *   face(h, m, { label, interactive, step, onChange })  <figure> with an SVG clock
 *   handAngles(h, m)    { hour, minute } in degrees clockwise from 12 (pure)
 *   timeFromAngles(hourDeg, minuteDeg)  inverse of handAngles for the minute hand
 *   digital(h, m)       "7:05"
 *   timeline(startMin, durMin)  strip showing a start, an end and the span between
 *
 * An interactive face keeps its time on figure.dataset.h / .m and offers
 * set(h, m) and get(). Drag the short hand or the long hand; the hour hand
 * follows the minute hand so the two never disagree. Games add +/- buttons
 * for keyboard users.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function handAngles(h, m) {
    return { hour: ((h % 12) * 30 + m * 0.5) % 360, minute: (m * 6) % 360 };
  }

  function digital(h, m) {
    const hh = ((h + 11) % 12) + 1;
    return hh + ":" + String(m).padStart(2, "0");
  }

  function spoken(h, m) {
    const hh = ((h + 11) % 12) + 1;
    const next = (hh % 12) + 1;
    if (m === 0) return hh + " o'clock";
    if (m === 30) return "half past " + hh;
    if (m === 15) return "quarter past " + hh;
    if (m === 45) return "quarter to " + next;
    return digital(h, m);
  }

  function polar(deg, r) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
  }

  function face(h, m, { label, interactive = false, step = 5, onChange } = {}) {
    const f = V.figure(label || "A clock showing " + spoken(h, m), "kv-clock");
    const svg = V.el("svg", { viewBox: "0 0 200 200", focusable: "false", "aria-hidden": "true" });
    svg.appendChild(V.el("circle", { cx: 100, cy: 100, r: 94, class: "kv-clock-face" }));
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const [x1, y1] = polar(i * 6, big ? 80 : 86);
      const [x2, y2] = polar(i * 6, 90);
      svg.appendChild(V.el("line", { x1, y1, x2, y2, class: big ? "kv-tick-big" : "kv-tick" }));
    }
    for (let n = 1; n <= 12; n++) {
      const [x, y] = polar(n * 30, 68);
      svg.appendChild(V.el("text", { x, y: y + 6, class: "kv-clock-num", "text-anchor": "middle" }, String(n)));
    }
    const hour = V.el("line", { x1: 100, y1: 100, x2: 100, y2: 52, class: "kv-hand-hour" });
    const min = V.el("line", { x1: 100, y1: 100, x2: 100, y2: 26, class: "kv-hand-min" });
    svg.append(hour, min, V.el("circle", { cx: 100, cy: 100, r: 5, class: "kv-clock-pin" }));
    f.appendChild(svg);

    let cur = { h: h % 12, m };
    function paint() {
      const a = handAngles(cur.h, cur.m);
      hour.setAttribute("transform", "rotate(" + a.hour + " 100 100)");
      min.setAttribute("transform", "rotate(" + a.minute + " 100 100)");
      f.dataset.h = String(cur.h === 0 ? 12 : cur.h);
      f.dataset.m = String(cur.m);
      if (interactive) f.setAttribute("aria-label", "A clock you can set. It shows " + spoken(cur.h, cur.m));
    }
    f.set = function (nh, nm) { cur = { h: ((nh % 12) + 12) % 12, m: ((nm % 60) + 60) % 60 }; paint(); if (onChange) onChange(f.get()); };
    f.get = function () { return { h: cur.h === 0 ? 12 : cur.h, m: cur.m }; };
    paint();

    if (interactive) {
      f.classList.add("kv-clock-live");
      let dragging = null;
      const toDeg = function (e) {
        const r = svg.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        return { deg: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, dist: Math.hypot(x, y) / (r.width / 2) };
      };
      svg.addEventListener("pointerdown", function (e) {
        const p = toDeg(e);
        dragging = p.dist < 0.5 ? "hour" : "min";
        svg.setPointerCapture(e.pointerId);
        move(e);
      });
      function move(e) {
        if (!dragging) return;
        const p = toDeg(e);
        if (dragging === "min") {
          const nm = (Math.round(p.deg / (step * 6)) * step) % 60;
          // Crossing 12 moves the hour on, like a real clock.
          const crossed = (cur.m > 45 && nm < 15) ? 1 : (cur.m < 15 && nm > 45) ? -1 : 0;
          f.set(cur.h + crossed, nm);
        } else {
          const hh = Math.round(p.deg / 30) % 12;
          f.set(hh, cur.m);
        }
      }
      svg.addEventListener("pointermove", move);
      const stop = function () { dragging = null; };
      svg.addEventListener("pointerup", stop);
      svg.addEventListener("pointercancel", stop);
    }
    return f;
  }

  /** Strip from start to end (minutes since midnight) with the hours marked. */
  function timeline(startMin, durMin, { label } = {}) {
    const endMin = startMin + durMin;
    const first = Math.floor(startMin / 60), last = Math.ceil(endMin / 60);
    const f = V.figure(label || "A timeline from " + fmt(startMin) + " to " + fmt(endMin), "kv-timeline");
    f.dataset.start = String(startMin);
    f.dataset.end = String(endMin);
    const span = (last - first) * 60;
    const w = 300, pad = 20;
    const x = function (min) { return pad + ((min - first * 60) / span) * (w - 2 * pad); };
    const svg = V.el("svg", { viewBox: "0 0 " + w + " 70", focusable: "false", "aria-hidden": "true" });
    svg.appendChild(V.el("line", { x1: pad, y1: 40, x2: w - pad, y2: 40, class: "kv-tl-line" }));
    svg.appendChild(V.el("rect", { x: x(startMin), y: 33, width: x(endMin) - x(startMin), height: 14, rx: 7, class: "kv-tl-span" }));
    for (let hr = first; hr <= last; hr++) {
      svg.appendChild(V.el("line", { x1: x(hr * 60), y1: 34, x2: x(hr * 60), y2: 46, class: "kv-tick-big" }));
      svg.appendChild(V.el("text", { x: x(hr * 60), y: 62, class: "kv-tl-label", "text-anchor": "middle" }, digital(Math.floor(hr % 24), 0)));
    }
    svg.appendChild(V.el("text", { x: x(startMin), y: 24, class: "kv-tl-end", "text-anchor": "middle" }, "🟢"));
    svg.appendChild(V.el("text", { x: x(endMin), y: 24, class: "kv-tl-end", "text-anchor": "middle" }, "🏁"));
    f.appendChild(svg);
    return f;
  }

  function fmt(min) {
    const h24 = Math.floor(min / 60) % 24, mm = min % 60;
    return digital(h24, mm) + (h24 >= 12 ? " PM" : " AM");
  }

  window.KlgClock = { face, handAngles, digital, spoken, timeline, fmt };
})();
