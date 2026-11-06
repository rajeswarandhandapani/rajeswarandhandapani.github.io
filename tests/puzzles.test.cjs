// Every puzzle the puzzle games can make must have an answer. These generate many
// of each and prove it without the game's own solving code where that is possible.
const test = require('node:test');
const assert = require('node:assert/strict');
const squares = require('../games/picture-squares/puzzle.js');
const pipes = require('../games/pipe-garden/puzzle.js');
const houses = require('../games/who-lives-where/puzzle.js');
const pieces = require('../games/piece-together/scenes.js');

/** Counts the ways to finish a square by trying everything, stopping at `limit`. */
function countFinishes(grid, limit = 2) {
 const size = grid.length;
 for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
   if (grid[r][c] !== null) continue;
   let count = 0;
   for (let pic = 0; pic < size && count < limit; pic++) {
    if (grid[r].includes(pic) || grid.some((row) => row[c] === pic)) continue;
    grid[r][c] = pic;
    count += countFinishes(grid, limit - count);
    grid[r][c] = null;
   }
   return count;
  }
 }
 return 1;
}

test('Picture Squares: exactly one way to finish, and it can be done by looking', () => {
 for (const size of [3, 4, 5]) {
  for (let i = 0; i < 300; i++) {
   const q = squares.make(size);
   const empty = q.grid.flat().filter((pic) => pic === null).length;
   assert.equal(empty, squares.BLANKS[size], 'number of empty squares');
   assert.equal(countFinishes(q.grid.map((row) => row.slice())), 1, 'one answer: ' + JSON.stringify(q.grid));
   assert.ok(squares.solvesByLooking(q.grid), 'no guessing needed');
   q.solution.forEach((row, r) => {
    assert.equal(new Set(row).size, size, 'rows have one of each');
    assert.equal(new Set(q.solution.map((other) => other[r])).size, size, 'columns have one of each');
    row.forEach((pic, c) => { if (q.grid[r][c] !== null) assert.equal(q.grid[r][c], pic, 'pictures shown are the answer'); });
   });
   assert.equal(q.pictures.length, size);
   assert.equal(new Set(q.pictures.map((p) => p.emoji)).size, size, 'different pictures');
  }
 }
 for (const set of squares.PICTURE_SETS) assert.ok(set.length >= 5, 'every set can fill a 5 by 5');
});

test('Pipe Garden: the saved turns reach the flower, and the scrambled pipes do not', () => {
 const opens = (t, r) => pipes.opens({ t, r });
 for (const size of [3, 4, 5]) {
  for (let i = 0; i < 400; i++) {
   const q = pipes.make(size);
   assert.equal(q.tiles.length, size * size);
   const scrambled = pipes.flow(size, q.start, q.goal, q.tiles.map((t) => t.r), q.tiles);
   assert.equal(scrambled.reached, false, 'already solved');
   assert.equal(pipes.flow(size, q.start, q.goal, q.answer, q.tiles).reached, true, 'cannot be solved');
   // The route again, by walking the pipes rather than through flow().
   let x = q.start, y = 0, from = 0;
   const seen = new Set();
   let out = false;
   for (let steps = 0; steps <= size * size; steps++) {
    const index = y * size + x;
    assert.ok(!seen.has(index), 'the route loops');
    seen.add(index);
    const sides = opens(q.tiles[index].t, q.answer[index]);
    assert.ok(sides.includes(from), 'the pipe joins the last one');
    assert.equal(sides.length, 2, 'the route is made of plain pipes');
    const to = sides.find((side) => side !== from);
    if (x === q.goal && y === size - 1 && to === 2) { out = true; break; }
    x += [0, 1, 0, -1][to];
    y += [-1, 0, 1, 0][to];
    from = (to + 2) % 4;
    assert.ok(x >= 0 && y >= 0 && x < size && y < size, 'the route leaves the grid');
   }
   assert.ok(out, 'the route ends at the flower');
   const [shortest, longest] = pipes.ROUTE[size];
   assert.ok(seen.size >= shortest && seen.size <= longest, 'route length ' + seen.size);
  }
 }
});

test('Who Lives Where?: exactly one placement fits, and every clue is needed', () => {
 // A second reading of each clue, so a mistake in holds() cannot hide here.
 const fits = (clue, place) => ({
  at: () => place[clue.a] === clue.h,
  notAt: () => place[clue.a] !== clue.h,
  leftOf: () => place[clue.a] < place[clue.b],
  nextTo: () => Math.abs(place[clue.a] - place[clue.b]) === 1,
  notNext: () => Math.abs(place[clue.a] - place[clue.b]) > 1,
  end: () => place[clue.a] === 0 || place[clue.a] === place.length - 1,
 })[clue.k]();
 for (const n of [3, 4, 5]) {
  assert.equal(houses.placements(n).length, [1, 1, 2, 6, 24, 120][n], 'all placements are tried');
  assert.equal(new Set(houses.placements(n).map(String)).size, houses.placements(n).length);
  for (let i = 0; i < 150; i++) {
   const q = houses.make(n);
   const rule = houses.RULES[n];
   assert.ok(q.clues.length >= rule.min && q.clues.length <= rule.max, q.clues.length + ' clues');
   assert.ok(q.clues.every((clue) => rule.kinds.includes(clue.k)), 'the clues suit the level');
   const answers = houses.placements(n).filter((place) => q.clues.every((clue) => fits(clue, place)));
   assert.deepEqual(answers, [q.place], 'one answer: ' + JSON.stringify(q));
   q.clues.forEach((clue, c) => {
    const others = q.clues.filter((_, other) => other !== c);
    assert.ok(houses.placements(n).filter((place) => others.every((o) => fits(o, place))).length > 1, 'clue is not needed: ' + JSON.stringify(q));
    assert.ok(!/undefined/.test(houses.clueText(clue, q)), houses.clueText(clue, q));
    assert.notEqual(houses.clueText(clue, q), '');
   });
   assert.equal(new Set(q.animals.map((a) => a.name)).size, n);
   assert.equal(new Set(q.houses.map((h) => h.name)).size, n);
  }
 }
});

test('Piece Together: enough pictures for three rounds, all drawn with no outside files', () => {
 assert.ok(pieces.SCENES.length >= 12, 'three rounds of four');
 assert.equal(new Set(pieces.SCENES.map((s) => s.id)).size, pieces.SCENES.length);
 for (const s of pieces.SCENES) {
  assert.ok(s.name, s.id);
  assert.ok(!/href|url\(|<image|<text|<script/.test(s.art), s.id + ' must only use drawn shapes');
 }
 assert.match(pieces.svg(pieces.SCENES[0], { row: 1, col: 2, rows: 3, cols: 3 }), /viewBox="200 100 100 100"/);
});
