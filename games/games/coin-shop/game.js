/**
 * Coin Shop — pay for things with drawn US coins and notes.
 *
 *   ?level=1  pennies, nickels and dimes, prices up to 50¢
 *   ?level=2  (default) adds quarters, prices up to $1
 *   ?level=3  adds $1 and $5 notes, prices up to $6; some shops ask for the
 *             FEWEST coins and notes
 *
 * The wallet holds one button per kind of coin; each tap puts one into the
 * payment tray, and tapping a coin in the tray takes it back. A payment
 * counts when it adds up to the price — and, in "fewest" shops, uses the
 * fewest pieces possible (the greedy change for these US denominations).
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const M = window.KlgMoneyVis;
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const DENOMS = level === 1 ? [10, 5, 1] : level === 2 ? [25, 10, 5, 1] : [500, 100, 25, 10, 5, 1];
  const TOP = level === 1 ? 50 : level === 2 ? 100 : 600;
  const ITEMS = [["🍎", "apple"], ["🍪", "cookie"], ["🎈", "balloon"], ["🧃", "juice"], ["🖍️", "crayon"], ["🍦", "ice cream"], ["📖", "comic"], ["⚽", "ball"], ["🧸", "bear"], ["🥕", "carrot"]];

  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  function fewest(cents) {
    const out = [];
    DENOMS.slice().sort((a, b) => b - a).forEach((d) => { while (cents >= d) { out.push(d); cents -= d; } });
    return out;
  }

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let price, tries = 0;
      do {
        price = level === 3 ? 5 * V.rand(4, TOP / 5) : level === 2 ? 5 * V.rand(3, 20) - (V.rand(0, 3) === 0 ? 3 : 0) : V.rand(6, TOP);
        // Every price must be payable with this level's coins.
      } while (asked.has(price) && ++tries < 30);
      asked.add(price);
      const wantFewest = level === 3 || (level === 2 && V.rand(0, 2) === 0);
      return { price, wantFewest, item: V.pick(ITEMS) };
    },
    render(q, ctx) {
      const best = fewest(q.price);
      ctx.task(q.wantFewest
        ? `Pay exactly ${M.fmt(q.price)} using the fewest coins and notes.`
        : `Pay exactly ${M.fmt(q.price)}.`);
      const paid = [];
      const wallet = document.createElement("div");
      wallet.className = "kv-wallet";
      wallet.setAttribute("role", "group");
      wallet.setAttribute("aria-label", "Your wallet. Tap to add money.");
      const tray = document.createElement("div");
      tray.className = "kv-tray kv-paytray";
      tray.setAttribute("aria-live", "polite");
      tray.setAttribute("aria-label", "Your payment");
      const total = document.createElement("div");
      total.className = "kv-readout";

      function paint() {
        tray.replaceChildren();
        paid.slice().sort((a, b) => b - a).forEach((c, idx) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-piece";
          b.setAttribute("aria-label", `Take back ${M.NAME[c]}`);
          b.appendChild(M.piece(c));
          b.addEventListener("click", () => { paid.splice(paid.indexOf(c), 1); paint(); });
          tray.appendChild(b);
        });
        if (!paid.length) tray.textContent = "Tap coins to pay";
        total.textContent = "You paid: " + (paid.length ? M.fmt(M.sum(paid)) : "0¢");
        tray.dataset.total = String(M.sum(paid));
      }
      DENOMS.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-piece";
        b.setAttribute("aria-label", `Add ${M.NAME[c]}, ${M.fmt(c)}`);
        b.appendChild(M.piece(c));
        b.addEventListener("click", () => { if (paid.length < 24) { paid.push(c); paint(); } });
        wallet.appendChild(b);
      });

      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Pay ✓" });
      check.setAttribute("aria-label", "Pay now");
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Clear" });
      clear.addEventListener("click", () => { paid.length = 0; paint(); });
      check.addEventListener("click", () => {
        const sum = M.sum(paid);
        const lock = () => { check.disabled = clear.disabled = true; wallet.querySelectorAll("button").forEach((b) => (b.disabled = true)); };
        if (sum === q.price && (!q.wantFewest || paid.length === best.length)) {
          ctx.right(`${M.describe(paid)} is ${M.fmt(q.price)}.`);
          lock();
        } else if (!ctx.firstTry()) {
          paid.length = 0; paid.push(...best); paint();
          ctx.reveal(`${M.describe(best)} pays ${M.fmt(q.price)}${q.wantFewest ? " with the fewest pieces" : ""}.`);
          lock();
        } else if (sum === q.price) {
          ctx.wrong(`That is exactly ${M.fmt(q.price)}, but you can do it with fewer pieces. Which coins can you swap?`);
        } else {
          ctx.wrong(sum < q.price ? `You have paid ${M.fmt(sum)}. You need ${M.fmt(q.price - sum)} more.` : `You have paid ${M.fmt(sum)}. That is ${M.fmt(sum - q.price)} too much.`);
        }
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      bar.append(clear, check);
      ctx.stage.append(M.tag(q.item[0], q.item[1], q.price), wallet, tray, total, bar);
      paint();
    },
  });
})();
