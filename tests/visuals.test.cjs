const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function load(file) {
 const window = { KlgMathVis: {} };
 vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window });
 return window;
}

test('clock hands point where a real clock puts them', () => {
 const { KlgClock } = load('assets/js/visuals/clock.js');
 assert.deepEqual({ ...KlgClock.handAngles(3, 0) }, { hour: 90, minute: 0 });
 assert.deepEqual({ ...KlgClock.handAngles(6, 30) }, { hour: 195, minute: 180 });
 assert.deepEqual({ ...KlgClock.handAngles(12, 15) }, { hour: 7.5, minute: 90 });
 assert.equal(KlgClock.handAngles(12, 0).hour, 0);
 assert.equal(KlgClock.digital(0, 5), '12:05');
 assert.equal(KlgClock.digital(15, 40), '3:40');
 assert.equal(KlgClock.spoken(7, 45), 'quarter to 8');
 assert.equal(KlgClock.spoken(12, 30), 'half past 12');
 assert.equal(KlgClock.fmt(16 * 60 + 30), '4:30 PM');
});

test('money totals, wording and fewest-coin change agree', () => {
 const { KlgMoneyVis: M } = load('assets/js/visuals/money.js');
 assert.equal(M.fmt(63), '63¢');
 assert.equal(M.fmt(115), '$1.15');
 assert.equal(M.sum([25, 25, 10, 1, 1, 1]), 63);
 assert.equal(M.describe([25, 25, 10, 1, 1, 1]), '2 quarters, 1 dime and 3 pennies');
 assert.equal(M.describe([5]), '1 nickel');
 for (let c = 1; c <= 2500; c += 7) assert.equal(M.sum(M.greedy(c)), c);
 assert.deepEqual([...M.greedy(41)], [25, 10, 5, 1]);
});

test('fraction words are spoken sensibly', () => {
 const { KlgFracVis: F } = load('assets/js/visuals/fractions.js');
 assert.equal(F.say(1, 2), '1 half');
 assert.equal(F.say(3, 4), '3 quarters');
 assert.equal(F.say(2, 2), '2 halves');
 assert.equal(F.say(2, 3), '2 thirds');
});

test('place-value blocks split a number into hundreds, tens and ones', () => {
 const { KlgBlocks: B } = load('assets/js/visuals/place-value.js');
 for (let n = 0; n < 1000; n += 13) {
  const p = B.parts(n);
  assert.equal(p.h * 100 + p.t * 10 + p.o, n);
 }
 for (let n = 0; n < 10000; n += 37) {
  const p = B.parts(n);
  assert.equal(p.th * 1000 + p.h * 100 + p.t * 10 + p.o, n);
 }
});
