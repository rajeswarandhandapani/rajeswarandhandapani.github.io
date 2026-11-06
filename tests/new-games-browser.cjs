// Plays the eight v4 games with real taps at phone widths, and checks each answer
// against its question bank. Also follows a real wrong tap into a review round.
// Server must be running: npm start, then npm run test:newgames
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const go = (page, path) => page.goto(`${base}/games/${path}`);
/** Matches a tile's whole text, since one Tamil word can sit inside another. */
const exact = (text) => new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c) + '$');

const odd = require('../games/odd-one-out/questions.js').SETS;
const riddles = require('../games/who-am-i/questions.js').RIDDLES;
const situations = require('../games/stay-safe/questions.js').SITUATIONS;
const sentences = require('../assets/js/tamil-sentences-data.js').sentences;

const MOVES = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
/** Works out a path without using the game's own code. */
function solve({ size, start, goal, rocks }) {
 const blocked = new Set(rocks.map((r) => `${r.x},${r.y}`));
 const queue = [{ ...start, path: [] }];
 const seen = new Set([`${start.x},${start.y}`]);
 while (queue.length) {
  const at = queue.shift();
  if (at.x === goal.x && at.y === goal.y) return at.path;
  for (const [name, [dx, dy]] of Object.entries(MOVES)) {
   const x = at.x + dx, y = at.y + dy, k = `${x},${y}`;
   if (x < 0 || y < 0 || x >= size || y >= size || blocked.has(k) || seen.has(k)) continue;
   seen.add(k);
   queue.push({ x, y, path: [...at.path, name] });
  }
 }
 throw new Error('puzzle has no path: ' + JSON.stringify({ size, start, goal, rocks }));
}

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 fs.mkdirSync('artifacts', { recursive: true });
 for (const width of [320, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });

  const fits = async (id) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}: sideways scroll at ${width}px`);
  /** Plays a whole round. play(i) answers one question; the first is answered wrong once. */
  async function round(path, play, { levels = [''] } = {}) {
   for (const level of levels) {
    const url = path + (level ? `?level=${level}` : '');
    await go(page, url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#start-btn').click();
    let i = 0;
    for (;;) {
     await page.locator('#task').waitFor();
     await play(i);
     await page.locator('#next-btn').waitFor({ state: 'visible' });
     assert.match(await page.locator('#feedback').getAttribute('class'), /good/, `${url}: question ${i + 1} ends right`);
     await fits(url);
     if (i === 0 && width === 390 && level === levels[levels.length - 1]) await page.screenshot({ path: `artifacts/v4-${path.split('/')[0]}.png`, fullPage: true });
     const last = /stars/.test(await page.locator('#next-btn').textContent());
     await page.locator('#next-btn').click();
     i += 1;
     if (last) break;
    }
    await page.locator('#finish-summary .tg-finish-xp').waitFor();
    const score = await page.locator('#finish-summary .tg-finish-score').textContent();
    assert.match(score, new RegExp(`^${i - 1} / ${i}$`), `${url}: the one mistake costs one point (${score})`);
    assert.ok(await page.evaluate(() => KlgProgress.summary().plays === 1), url + ': progress saved');
    await fits(url);
    const misses = await page.evaluate(() => JSON.parse(localStorage.getItem('klg-review-v1')).items.length);
    assert.equal(misses, 1, `${url}: the question with the slip waits for review`);
   }
  }
  const tapAnswers = async (i, check) => {
   if (i === 0) {
    await page.locator('.kv-answer:not([data-right])').first().click();
    assert.match(await page.locator('#feedback').getAttribute('class'), /try/, 'a wrong tap asks for another try');
    assert.equal(await page.locator('#next-btn').isVisible(), false, 'the question stays open');
   }
   const right = page.locator('.kv-answer[data-right]');
   assert.equal(await right.count(), 1, 'exactly one right answer');
   if (check) await check(await right.getAttribute('data-answer'));
   await right.click();
  };

  await round('odd-one-out/index.html', (i) => tapAnswers(i, async (answer) => {
   const shown = await page.locator('.kv-oddcell').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
   const row = [...odd[1], ...odd[2]].find((r) => r[3][1] === answer && shown.includes(r[0][1]) && shown.includes(r[1][1]));
   assert.ok(row, `${answer} is the odd one in the bank for: ${shown}`);
  }), { levels: ['1', '2'] });

  await round('who-am-i/index.html', (i) => tapAnswers(i, async (answer) => {
   assert.ok(await page.locator('.kv-clues li').count() >= 1, 'a clue shows');
   const row = riddles.find((r) => r[0][1] === answer);
   assert.ok(row, answer);
   assert.equal(await page.locator('.kv-clues li').first().textContent(), row[1][0], 'clues belong to the answer');
   if (i === 0) assert.equal(await page.locator('.kv-clues li').count(), 2, 'a wrong guess brings another clue');
  }));

  await round('punctuation-pals/index.html', (i) => tapAnswers(i, async (answer) => {
   assert.equal(answer, await page.locator('.kv-sentence-line').getAttribute('data-mark'));
   assert.doesNotMatch(await page.locator('.kv-sentence-line').textContent(), /[.?!]/, 'the sentence hides its mark');
  }));

  await round('number-bonds/index.html', (i) => tapAnswers(i, async (answer) => {
   const b = await page.locator('.nb-bond').evaluate((f) => ({ whole: +f.dataset.whole, a: +f.dataset.a, b: +f.dataset.b }));
   assert.equal(b.a + b.b, b.whole);
   const hiddenWhole = (await page.locator('.nb-whole b').textContent()) === '?';
   assert.equal(+answer, hiddenWhole ? b.whole : b.b);
   if (await page.locator('.nb-counters').count()) {
    const first = await page.locator('.nb-counters').first().textContent();
    assert.equal([...first].length, b.a, 'counters match the part shown');
   }
  }), { levels: ['1', '2', '3'] });

  await round('stay-safe/index.html', (i) => tapAnswers(i, async (answer) => {
   const task = await page.locator('#task').textContent();
   const row = situations.find((r) => task.startsWith(r[1]));
   assert.equal(answer, row[2], task);
  }));

  await round('robot-path/index.html', async (i) => {
   const q = JSON.parse(await page.locator('.rp-grid').getAttribute('data-puzzle'));
   assert.equal(await page.locator('.rp-cell').count(), q.size * q.size);
   if (i === 0) {
    // Walk straight into the wall on purpose.
    const wall = q.start.x === 0 ? 'left' : q.start.y === 0 ? 'up' : q.start.x === q.size - 1 ? 'right' : 'down';
    const steps = wall === 'left' ? q.start.x + 1 : wall === 'up' ? q.start.y + 1 : q.size - (wall === 'right' ? q.start.x : q.start.y);
    for (let s = 0; s < steps; s++) await page.locator(`[data-move="${wall}"]`).click();
    await page.locator('#rp-go').click();
    assert.match(await page.locator('#feedback').getAttribute('class'), /try/, 'bumping something asks for another try');
    for (let s = 0; s < steps; s++) await page.getByRole('button', { name: /Undo/ }).click();
    assert.ok(await page.locator('#rp-go').isDisabled(), 'an empty plan cannot run');
   }
   const path = solve(q);
   assert.ok(path.length >= q.size - 1, 'the puzzle needs some planning');
   for (const step of path) await page.locator(`[data-move="${step}"]`).click();
   await page.locator('#rp-go').click();
   assert.equal(await page.locator('.rp-grid').getAttribute('data-robot'), `${q.goal.x},${q.goal.y}`, 'the robot reached the star');
  }, { levels: ['1', '2', '3'] });

  await round('word-detective/index.html', async (i) => {
   const items = await page.locator('.pk-item').evaluateAll((els) => els.map((e) => ({ id: e.dataset.id, bin: e.dataset.bin })));
   const words = require('../games/word-detective/questions.js').WORDS;
   for (const it of items) assert.ok(words[it.bin].includes(it.id), `${it.id} is a ${it.bin} word`);
   let first = true;
   for (const it of items) {
    if (i === 0 && first) {
     const wrong = await page.locator('.pk-bin').evaluateAll((els, home) => els.map((e) => e.dataset.bin).find((b) => b !== home), it.bin);
     await page.locator(`.pk-pool [data-id="${it.id}"]`).click();
     await page.locator(`.pk-bin[data-bin="${wrong}"]`).click();
     assert.match(await page.locator('#feedback').getAttribute('class'), /try/, 'the wrong group asks for another try');
     first = false;
    }
    await page.locator(`.pk-pool [data-id="${it.id}"]`).click();
    await page.locator(`.pk-bin[data-bin="${it.bin}"]`).click();
   }
  }, { levels: ['1', '2'] });

  await round('tamil-word-order/index.html', async (i) => {
   const sentence = await page.locator('.kv-clue').getAttribute('data-sentence');
   assert.ok(sentences.some((s) => (s.before + s.word + s.after).trim() === sentence), sentence);
   const words = sentence.split(/\s+/);
   const tap = async (list) => { for (const w of list) await page.locator('.pk-tile:not([hidden])').filter({ hasText: exact(w) }).first().click(); };
   if (i === 0) {
    await page.locator('#word-order-check').click();
    assert.equal(await page.locator('#next-btn').isVisible(), false, 'an unfinished sentence is only a nudge');
    await tap([...words].reverse());
    await page.locator('#word-order-check').click();
    assert.match(await page.locator('#feedback').getAttribute('class'), /try/, 'a different order asks for another try');
   }
   await tap(words);
   await page.locator('#word-order-check').click();
  });

  // A real wrong tap, carried through to a review round.
  await go(page, 'word-detective/index.html?level=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#start-btn').click();
  const items = await page.locator('.pk-item').evaluateAll((els) => els.map((e) => ({ id: e.dataset.id, bin: e.dataset.bin })));
  const other = items[0].bin === 'naming' ? 'doing' : 'naming';
  await page.locator(`.pk-pool [data-id="${items[0].id}"]`).click();
  await page.locator(`.pk-bin[data-bin="${other}"]`).click();
  assert.equal(await page.evaluate(() => KlgProgress.review.summary().due), 0, 'it waits until tomorrow');
  await page.evaluate(() => {
   const d = JSON.parse(localStorage.getItem('klg-review-v1'));
   d.items.forEach((it) => { it.due = '2000-01-01'; });
   localStorage.setItem('klg-review-v1', JSON.stringify(d));
  });
  await page.evaluate(() => localStorage.setItem('klg-stage', '2'));
  await page.goto(`${base}/index.html`);
  assert.ok(await page.locator('#review-card').isVisible(), 'the home card appears');
  await page.locator('#review-link').click();
  await page.waitForURL(/word-detective.*review=1/);
  assert.equal(await page.locator('#level-links').isVisible(), false, 'no links out of the review');
  await page.locator('#start-btn').click();
  const again = await page.locator('.pk-item').evaluateAll((els) => els.map((e) => ({ id: e.dataset.id, bin: e.dataset.bin })));
  assert.deepEqual(again.map((x) => x.id).sort(), items.map((x) => x.id).sort(), 'the same words come back');
  for (const it of again) {
   await page.locator(`.pk-pool [data-id="${it.id}"]`).click();
   await page.locator(`.pk-bin[data-bin="${it.bin}"]`).click();
  }
  await page.locator('#next-btn').click();
  await page.locator('#klg-review-home').waitFor();
  assert.equal(await page.locator('#play-again').isVisible(), false);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('klg-review-v1')).items[0].step), 1, 'on to the 3-day step');
  assert.equal(await page.evaluate(() => KlgProgress.summary().plays), 0, 'a review is not counted as a played round');
  await fits('review finish');

  // Memory Garden's biggest board: played to the end, and every card is big enough to tap.
  await go(page, 'memory-match/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.kid-more summary').click();
  await page.locator('#memory-size').selectOption('15');
  await page.locator('#start-btn').click();
  const cards = page.locator('.memory-card');
  assert.equal(await cards.count(), 30, '15 pairs make 30 cards');
  const sizes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
  assert.ok(sizes.every(([w, h]) => w >= 44 && h >= 44), 'cards are big enough to tap: ' + JSON.stringify(sizes[0]));
  await fits('memory-match 15 pairs');
  const faces = [];
  for (let i = 0; i < 30; i += 2) {
   await cards.nth(i).click();
   faces[i] = await cards.nth(i).textContent();
   await cards.nth(i + 1).click();
   faces[i + 1] = await cards.nth(i + 1).textContent();
   if (faces[i] !== faces[i + 1]) await page.waitForFunction((n) => !document.querySelectorAll('.memory-card')[n].classList.contains('flipped'), i);
  }
  const counts = {};
  faces.forEach((f) => { counts[f] = (counts[f] || 0) + 1; });
  assert.equal(Object.keys(counts).length, 15, '15 different pictures');
  assert.ok(Object.values(counts).every((n) => n === 2), 'each picture appears twice');
  if (width === 390) await page.screenshot({ path: 'artifacts/v4-memory-15.png', fullPage: true });
  for (const face of Object.keys(counts)) {
   const at = faces.map((f, i) => (f === face ? i : -1)).filter((i) => i >= 0);
   if (await cards.nth(at[0]).isDisabled()) continue;
   await cards.nth(at[0]).click();
   await cards.nth(at[1]).click();
  }
  assert.match(await page.locator('#memory-feedback').textContent(), /all 15 pairs/);
  assert.equal(await page.evaluate(() => KlgProgress.gameStats('memory-match').bestStars), 3);

  assert.deepEqual(errors, [], `page errors at ${width}px`);
  assert.deepEqual(external, [], `external requests at ${width}px`);
  console.log(`PASS eight new games and a real-tap review at ${width}px`);
  await context.close();
 }
 await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
