/**
 * Pipe Garden puzzles. Water comes in at the top of one column and must leave
 * at the bottom of another, where the flower is.
 *
 * A puzzle starts from a real route through the grid, with spare pipes in the
 * other squares, and only then is every pipe turned at random. So turning the
 * pipes back always works. Any other route that reaches the flower counts too.
 *
 * Works in the browser (window.KlgPipePuzzle) and in node tests (require).
 */
(function (root) {
  "use strict";

  // Sides are numbered clockwise: 0 top, 1 right, 2 bottom, 3 left.
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const SIDE_NAMES = ["top", "right", "bottom", "left"];
  /** The sides each kind of pipe opens on before it is turned. */
  const OPEN = { I: [0, 2], L: [0, 1], T: [0, 1, 3] };
  /** How long the route must be, so a bigger garden is not just a straight drop. */
  const ROUTE = { 3: [4, 7], 4: [6, 11], 5: [9, 17] };

  const opens = (tile) => OPEN[tile.t].map((side) => (side + tile.r) % 4);

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Where water can get to. wet: the squares with water; reached: it comes out at the flower. */
  function flow(size, start, goal, turns, tiles) {
    const at = (x, y) => ({ t: tiles[y * size + x].t, r: turns[y * size + x] });
    const wet = new Set();
    if (!opens(at(start, 0)).includes(0)) return { wet: [], reached: false };
    const frontier = [[start, 0]];
    wet.add(start);
    while (frontier.length) {
      const [x, y] = frontier.pop();
      for (const side of opens(at(x, y))) {
        const nx = x + DX[side], ny = y + DY[side];
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const index = ny * size + nx;
        if (wet.has(index) || !opens(at(nx, ny)).includes((side + 2) % 4)) continue;
        wet.add(index);
        frontier.push([nx, ny]);
      }
    }
    const goalIndex = (size - 1) * size + goal;
    return { wet: [...wet], reached: wet.has(goalIndex) && opens(at(goal, size - 1)).includes(2) };
  }

  /** A route of squares from (start, top row) to (goal, bottom row), wandering at random. */
  function walk(size, start, goal) {
    const seen = new Set();
    const route = [];
    function step(x, y) {
      seen.add(y * size + x);
      route.push([x, y]);
      if (x === goal && y === size - 1) return true;
      for (const side of shuffled([0, 1, 2, 3])) {
        const nx = x + DX[side], ny = y + DY[side];
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(ny * size + nx)) continue;
        if (step(nx, ny)) return true;
      }
      route.pop();
      return false;
    }
    step(start, 0);
    return route;
  }

  /** The pipe that joins two sides of a square. */
  function pipeFor(a, b) {
    if ((a + 2) % 4 === b) return { t: "I", r: a % 2 };
    return { t: "L", r: (a + 1) % 4 === b ? a : b };
  }

  function make(size) {
    const [shortest, longest] = ROUTE[size];
    for (;;) {
      const start = Math.floor(Math.random() * size), goal = Math.floor(Math.random() * size);
      const route = walk(size, start, goal);
      if (route.length < shortest || route.length > longest) continue;
      const spare = size === 5 ? ["I", "L", "T"] : ["I", "L"];
      const tiles = [];
      for (let i = 0; i < size * size; i++) tiles.push({ t: spare[Math.floor(Math.random() * spare.length)], r: Math.floor(Math.random() * 4) });
      route.forEach(([x, y], i) => {
        const prev = route[i - 1], next = route[i + 1];
        const sideTo = ([ox, oy]) => DX.findIndex((dx, side) => dx === ox - x && DY[side] === oy - y);
        tiles[y * size + x] = pipeFor(prev ? sideTo(prev) : 0, next ? sideTo(next) : 2);
      });
      const answer = tiles.map((tile) => tile.r);
      const turns = tiles.map(() => Math.floor(Math.random() * 4));
      // Scrambled for real: the water must not reach the flower yet, and half the route must be wrong.
      const off = route.filter(([x, y]) => {
        const i = y * size + x;
        return opens({ t: tiles[i].t, r: turns[i] }).sort().join() !== opens(tiles[i]).sort().join();
      }).length;
      if (flow(size, start, goal, turns, tiles).reached || off * 2 < route.length) continue;
      return { size, start, goal, tiles: tiles.map((tile, i) => ({ t: tile.t, r: turns[i] })), answer };
    }
  }

  const api = { make, flow, opens, SIDE_NAMES, ROUTE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KlgPipePuzzle = api;
})(typeof window !== "undefined" ? window : globalThis);
