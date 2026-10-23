/**
 * Set the Clock — move the hands to show the time you are given.
 *
 *   ?level=1  o'clock and half past
 *   ?level=2  (default) every quarter hour and 5 minutes
 *   ?level=3  any minute
 *
 * The long hand drags to the nearest step (30, 5 or 1 minutes); the short
 * hand drags to the nearest hour. The buttons do the same for keyboard and
 * switch users. Six times per round; a time scores when it is set right the
 * first time you press Check.
 */
(function () {
  "use strict";
  const CK = window.KlgClock;
  const V = window.KlgMathVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const step = level === 1 ? 30 : level === 2 ? 5 : 1;

  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  function timeFor() {
    return level === 1 ? V.pick([0, 30]) : level === 2 ? 5 * V.rand(0, 11) : V.rand(0, 59);
  }

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let h, m, key;
      do { h = V.rand(1, 12); m = timeFor(); key = h + ":" + m; } while (asked.has(key));
      asked.add(key);
      return { h, m };
    },
    render(q, ctx) {
      const words = CK.spoken(q.h, q.m);
      ctx.task(`Set the clock to ${CK.digital(q.h, q.m)}` + (words !== CK.digital(q.h, q.m) ? ` (${words}).` : "."));
      const startHour = q.h === 6 ? 9 : 6;
      const readout = document.createElement("div");
      readout.className = "kv-readout";
      readout.setAttribute("aria-live", "polite");
      const clock = CK.face(startHour, 0, {
        interactive: true, step,
        onChange: ({ h, m }) => { readout.textContent = CK.digital(h, m); },
      });
      readout.textContent = CK.digital(startHour, 0);

      const bar = document.createElement("div");
      bar.className = "kv-controls";
      const mk = (text, label, fn, cls) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn" + (cls ? " " + cls : "");
        b.textContent = text;
        b.setAttribute("aria-label", label);
        b.addEventListener("click", fn);
        return b;
      };
      const bump = (dh, dm) => { const t = clock.get(); clock.set(t.h + dh + Math.floor((t.m + dm) / 60), (t.m + dm + 600) % 60); };
      const check = mk("Check ✓", "Check the clock", () => {
        const t = clock.get();
        if (t.h === q.h && t.m === q.m) {
          ctx.right(`That is ${CK.digital(q.h, q.m)}.`);
          check.disabled = true;
          return;
        }
        let hint;
        if (t.m === q.m) hint = "The long hand is right. Check the short hand.";
        else if (t.h === q.h) hint = "The short hand is right. Check the long hand.";
        else hint = "Not yet. The short hand shows the hour and the long hand shows the minutes.";
        if (!ctx.firstTry()) {
          ctx.reveal(`Here is ${CK.digital(q.h, q.m)}.`);
          clock.set(q.h, q.m);
          check.disabled = true;
          return;
        }
        ctx.wrong(hint);
      }, "primary");
      bar.append(
        mk("− hour", "One hour earlier", () => bump(-1, 0)),
        mk("+ hour", "One hour later", () => bump(1, 0)),
        mk(`− ${step === 30 ? "30" : step} min`, `${step} minutes earlier`, () => bump(0, -step)),
        mk(`+ ${step === 30 ? "30" : step} min`, `${step} minutes later`, () => bump(0, step)),
        check,
      );
      ctx.stage.append(clock, readout, bar);
    },
  });
})();
