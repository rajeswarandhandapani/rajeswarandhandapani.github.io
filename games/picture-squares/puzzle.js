/**
 * Picture Squares puzzles: each picture once in every row and every column.
 *
 * A puzzle starts from a finished square and squares are emptied one at a time.
 * A square is only emptied if the puzzle can still be finished by plain looking:
 * "only one picture fits here" or "this picture only fits here". So there is
 * exactly one answer and a child never has to guess.
 *
 * Works in the browser (window.KlgSquaresPuzzle) and in node tests (require).
 */
(function (root) {
  "use strict";

  const PICTURE_SETS = [
    [["🍎", "apple"], ["🍌", "banana"], ["🍇", "grapes"], ["🍊", "orange"], ["🍉", "watermelon"]],
    [["🐘", "elephant"], ["🦒", "giraffe"], ["🐢", "turtle"], ["🐠", "fish"], ["🦋", "butterfly"]],
    [["🚗", "car"], ["🚌", "bus"], ["🚲", "bicycle"], ["🚀", "rocket"], ["⛵", "sailboat"]],
    [["☀️", "sun"], ["🌙", "moon"], ["⭐", "star"], ["🌈", "rainbow"], ["❄️", "snowflake"]],
  ];
  /** Empty squares in each size of square. */
  const BLANKS = { 3: 4, 4: 8, 5: 14 };

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** A finished square: a cyclic one with its rows, columns and pictures shuffled. */
  function finishedSquare(size) {
    const numbers = [...Array(size).keys()];
    const rows = shuffled(numbers), cols = shuffled(numbers), pics = shuffled(numbers);
    return rows.map((r) => cols.map((c) => pics[(r + c) % size]));
  }

  function fits(grid, r, c, pic) {
    const size = grid.length;
    for (let i = 0; i < size; i++) {
      if (grid[r][i] === pic || grid[i][c] === pic) return false;
    }
    return true;
  }

  /** Fills in everything that can be worked out by looking. Returns true when that finishes it. */
  function solvesByLooking(start) {
    const grid = start.map((row) => row.slice());
    const size = grid.length;
    let progress = true;
    while (progress) {
      progress = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] !== null) continue;
          const can = [];
          for (let pic = 0; pic < size; pic++) if (fits(grid, r, c, pic)) can.push(pic);
          if (can.length === 1) { grid[r][c] = can[0]; progress = true; }
        }
      }
      for (let pic = 0; pic < size; pic++) {
        for (let line = 0; line < size; line++) {
          const inRow = [], inCol = [];
          for (let i = 0; i < size; i++) {
            if (grid[line][i] === null && fits(grid, line, i, pic)) inRow.push(i);
            if (grid[i][line] === null && fits(grid, i, line, pic)) inCol.push(i);
          }
          const rowHas = grid[line].includes(pic), colHas = grid.some((row) => row[line] === pic);
          if (!rowHas && inRow.length === 1) { grid[line][inRow[0]] = pic; progress = true; }
          if (!colHas && inCol.length === 1) { grid[inCol[0]][line] = pic; progress = true; }
        }
      }
    }
    return grid.every((row) => row.every((pic) => pic !== null));
  }

  function make(size) {
    const want = BLANKS[size];
    for (;;) {
      const solution = finishedSquare(size);
      const grid = solution.map((row) => row.slice());
      let blanks = 0;
      const squares = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) squares.push([r, c]);
      for (const [r, c] of shuffled(squares)) {
        if (blanks === want) break;
        const keep = grid[r][c];
        grid[r][c] = null;
        if (solvesByLooking(grid)) blanks += 1;
        else grid[r][c] = keep;
      }
      if (blanks === want) {
        const set = PICTURE_SETS[Math.floor(Math.random() * PICTURE_SETS.length)];
        const pictures = shuffled(set).slice(0, size).map(([emoji, name]) => ({ emoji, name }));
        return { size, grid, solution, pictures };
      }
    }
  }

  const api = { make, solvesByLooking, BLANKS, PICTURE_SETS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KlgSquaresPuzzle = api;
})(typeof window !== "undefined" ? window : globalThis);
