/**
 * Who Lives Where? puzzles. Animals live in a row of houses, one each.
 *
 * A puzzle starts from where the animals really live and collects true clues
 * until only one way of placing them fits. Clues that are not needed are then
 * taken out, so every clue matters. Trying every placement (at most 120) is what
 * proves there is exactly one answer.
 *
 * Works in the browser (window.KlgHousePuzzle) and in node tests (require).
 */
(function (root) {
  "use strict";

  const ANIMALS = [["🦊", "Fox"], ["🐰", "Rabbit"], ["🐻", "Bear"], ["🐸", "Frog"], ["🦉", "Owl"], ["🐢", "Turtle"], ["🐘", "Elephant"], ["🐝", "Bee"], ["🐧", "Penguin"], ["🦁", "Lion"]];
  const HOUSES = [
    { name: "Red", color: "#d64545", soft: "#ffe6e6" },
    { name: "Blue", color: "#3a6fd8", soft: "#e4edff" },
    { name: "Green", color: "#2f9e58", soft: "#e2f6e8" },
    { name: "Yellow", color: "#e0a800", soft: "#fff6d6" },
    { name: "Purple", color: "#8a4fc7", soft: "#f1e7fb" },
  ];
  /** Per number of houses: the kinds of clue, and how many clues may be on screen. */
  const RULES = {
    3: { kinds: ["at", "notAt", "leftOf"], min: 2, max: 3 },
    4: { kinds: ["at", "notAt", "leftOf", "nextTo", "end"], min: 3, max: 4 },
    5: { kinds: ["at", "notAt", "leftOf", "nextTo", "notNext", "end"], min: 4, max: 6 },
  };

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Every way to place n animals: each entry gives the house of animal 0, 1, 2… */
  function placements(n) {
    if (n === 0) return [[]];
    const out = [];
    placements(n - 1).forEach((p) => {
      for (let at = 0; at < n; at++) out.push([...p.slice(0, at), n - 1, ...p.slice(at)]);
    });
    return out;
  }

  /** Is this clue true when animal i lives in house place[i]? */
  function holds(clue, place) {
    const a = place[clue.a], b = place[clue.b];
    switch (clue.k) {
      case "at": return a === clue.h;
      case "notAt": return a !== clue.h;
      case "leftOf": return a < b;
      case "nextTo": return Math.abs(a - b) === 1;
      case "notNext": return Math.abs(a - b) !== 1;
      case "end": return a === 0 || a === place.length - 1;
      default: throw new Error("unknown clue " + clue.k);
    }
  }

  function trueClues(place, kinds) {
    const n = place.length;
    const all = [];
    for (let a = 0; a < n; a++) {
      all.push({ k: "at", a, h: place[a] });
      for (let h = 0; h < n; h++) if (h !== place[a]) all.push({ k: "notAt", a, h });
      if (place[a] === 0 || place[a] === n - 1) all.push({ k: "end", a });
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        if (place[a] < place[b]) all.push({ k: "leftOf", a, b });
        if (a < b) all.push({ k: Math.abs(place[a] - place[b]) === 1 ? "nextTo" : "notNext", a, b });
      }
    }
    return all.filter((clue) => kinds.includes(clue.k));
  }

  /** How many placements fit these clues. */
  function answers(n, clues) {
    return placements(n).filter((place) => clues.every((clue) => holds(clue, place))).length;
  }

  function make(n) {
    const rule = RULES[n];
    for (;;) {
      const place = shuffled([...Array(n).keys()]);
      let left = placements(n);
      let clues = [];
      for (const clue of shuffled(trueClues(place, rule.kinds))) {
        const narrower = left.filter((p) => holds(clue, p));
        if (narrower.length === left.length) continue;
        left = narrower;
        clues.push(clue);
        if (left.length === 1) break;
      }
      // Take out any clue the others make unnecessary.
      for (const clue of shuffled(clues)) {
        const without = clues.filter((other) => other !== clue);
        if (answers(n, without) === 1) clues = without;
      }
      // Too few clues, or two that just say where the animals live, is not much of a puzzle.
      const direct = clues.filter((clue) => clue.k === "at").length;
      if (clues.length < rule.min || clues.length > rule.max || direct > 1) continue;
      return {
        animals: shuffled(ANIMALS).slice(0, n).map(([emoji, name]) => ({ emoji, name })),
        houses: shuffled(HOUSES).slice(0, n),
        clues,
        place,
      };
    }
  }

  /** The clue as a sentence. */
  function clueText(clue, q) {
    const who = (i) => `${q.animals[i].emoji} ${q.animals[i].name}`;
    switch (clue.k) {
      case "at": return `${who(clue.a)} lives in the ${q.houses[clue.h].name} house.`;
      case "notAt": return `${who(clue.a)} does not live in the ${q.houses[clue.h].name} house.`;
      case "leftOf": return `${who(clue.a)} lives somewhere left of ${who(clue.b)}.`;
      case "nextTo": return `${who(clue.a)} lives next door to ${who(clue.b)}.`;
      case "notNext": return `${who(clue.a)} does not live next door to ${who(clue.b)}.`;
      case "end": return `${who(clue.a)} lives at one end of the row.`;
      default: return "";
    }
  }

  const api = { make, holds, answers, placements, clueText, RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KlgHousePuzzle = api;
})(typeof window !== "undefined" ? window : globalThis);
