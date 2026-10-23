/**
 * KlgMoneyVis — US coins and notes drawn with CSS (generic designs).
 *
 *   coin(cents)                one coin: 1, 5, 10, 25 or 50
 *   note(cents)                one note: 100, 500, 1000 or 2000
 *   tray(list, { label })      a row of coins and notes; list is cents values
 *   describe(list)             "2 quarters, 1 dime and 3 pennies"
 *   sum(list)                  total in cents
 *   fmt(cents)                 "63¢" or "$1.15"
 *   greedy(cents)              fewest coins/notes for that amount
 *   tag(emoji, name, cents)    a shop price label (data-cents holds the price)
 *
 * A tray carries data-total (cents) so tests can compare picture and answer.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const NAME = { 1: "penny", 5: "nickel", 10: "dime", 25: "quarter", 50: "half dollar", 100: "$1 note", 500: "$5 note", 1000: "$10 note", 2000: "$20 note" };
  const PLURAL = { 1: "pennies", 5: "nickels", 10: "dimes", 25: "quarters", 50: "half dollars", 100: "$1 notes", 500: "$5 notes", 1000: "$10 notes", 2000: "$20 notes" };
  const DENOMS = [2000, 1000, 500, 100, 50, 25, 10, 5, 1];

  function fmt(cents) {
    if (cents < 100) return cents + "¢";
    return "$" + (cents / 100).toFixed(2);
  }

  function sum(list) { return list.reduce((a, b) => a + b, 0); }

  function describe(list) {
    const counts = {};
    list.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    const parts = DENOMS.filter((c) => counts[c]).map((c) => counts[c] + " " + (counts[c] === 1 ? NAME[c] : PLURAL[c]));
    if (!parts.length) return "no money";
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  }

  function coin(cents) {
    const c = document.createElement("span");
    c.className = "kv-coin kv-c" + cents;
    c.dataset.cents = String(cents);
    c.setAttribute("aria-hidden", "true");
    c.textContent = cents === 1 ? "1¢" : cents + "¢";
    c.title = NAME[cents];
    return c;
  }

  function note(cents) {
    const n = document.createElement("span");
    n.className = "kv-note kv-n" + cents;
    n.dataset.cents = String(cents);
    n.setAttribute("aria-hidden", "true");
    n.textContent = "$" + cents / 100;
    return n;
  }

  function piece(cents) { return cents >= 100 ? note(cents) : coin(cents); }

  function tray(list, { label } = {}) {
    const f = V.figure(label || describe(list), "kv-tray");
    f.dataset.total = String(sum(list));
    list.slice().sort((a, b) => b - a).forEach((c) => f.appendChild(piece(c)));
    return f;
  }

  function greedy(cents) {
    const out = [];
    DENOMS.forEach((d) => { while (cents >= d) { out.push(d); cents -= d; } });
    return out;
  }

  function tag(emoji, name, cents) {
    const t = V.figure(name + ", " + fmt(cents), "kv-tag");
    t.dataset.cents = String(cents);
    t.innerHTML = '<span class="kv-tag-pic" aria-hidden="true">' + emoji + '</span><span class="kv-tag-price" aria-hidden="true">' + fmt(cents) + "</span>";
    return t;
  }

  window.KlgMoneyVis = { coin, note, piece, tray, describe, sum, fmt, greedy, tag, DENOMS, NAME, PLURAL };
})();
