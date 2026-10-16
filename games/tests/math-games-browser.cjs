// Plays the visual multiplication & division activities in Chromium and
// checks that every picture agrees with its answer. Server must be running:
// npm start, then npm run test:math
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
  const noOverflow = async (id) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
  const plays = () => page.evaluate(() => KlgProgress.summary().plays);

  /** Answer the current quiz question; returns { answer, prompt, visualItems }. */
  async function answerOne() {
    const prompt = await page.locator('#question-text').textContent();
    const visualItems = await page.locator('.quiz-visual .mv-item').count();
    const labels = await page.locator('.quiz-choice-btn').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
    assert.equal(new Set(labels).size, labels.length, `duplicate choices for: ${prompt}`);
    await page.locator('.quiz-choice-btn').first().click();
    const correct = await page.locator('.quiz-choice-btn.correct').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
    assert.equal(correct.length, 1, `exactly one correct choice for: ${prompt}`);
    const feedback = await page.locator('#quiz-feedback').textContent();
    assert.ok(feedback.length > 10, prompt);
    return { answer: correct[0], prompt, visualItems, feedback };
  }

  async function playQuiz(path, check, rounds = 10) {
    await page.goto(`${base}/games/${path}`);
    await page.locator('#start-btn').click();
    for (let i = 0; i < rounds; i++) {
      await page.locator('.quiz-choice-btn').first().waitFor();
      const r = await answerOne();
      if (check) await check(r);
      await noOverflow(path);
      await page.locator('.quiz-next').click();
    }
    assert.ok(await page.locator('#results-screen').isVisible(), path);
  }

  // Picture counts must equal the answer: groups and arrays show every item.
  for (const mode of ['groups', 'arrays']) {
    for (const level of [1, 2, 3]) {
      await playQuiz(`multiply-pictures/index.html?mode=${mode}&level=${level}`, ({ answer, visualItems, prompt }) => {
        assert.equal(visualItems, Number(answer), `picture shows ${visualItems} but answer is ${answer}: ${prompt}`);
      });
    }
  }
  console.log('PASS multiply-pictures groups/arrays: picture count = answer at every level');

  await playQuiz('multiply-pictures/index.html?mode=hops&level=3', ({ answer, prompt }) => {
    const [, hops, step] = prompt.match(/makes (\d+) hops of (\d+)/).map(Number);
    assert.equal(Number(answer), hops * step);
  });
  await playQuiz('multiply-pictures/index.html?mode=match', async ({ answer, prompt }) => {
    const [, a, b] = prompt.match(/shows (\d+) × (\d+)/).map(Number);
    assert.match(answer, new RegExp(`^${a} \\w+ of ${b}$`));
  });
  await playQuiz('multiply-pictures/index.html?mode=sentence', ({ answer, visualItems }) => {
    const [x, y] = answer.split(' × ').map(Number);
    assert.equal(x * y, visualItems);
  });
  await playQuiz('multiply-pictures/index.html', null);
  console.log('PASS multiply-pictures hops, match, sentence, mix');

  // Division: after answering, the solved picture holds the answer per group.
  await playQuiz('divide-pictures/index.html?mode=share&level=3', async ({ answer, prompt }) => {
    const [, total, people] = prompt.match(/^(\d+) .* by (\d+) children/).map(Number);
    assert.equal(Number(answer) * people, total, prompt);
    const perPlate = await page.locator('.quiz-visual .mv-holder').first().locator('.mv-item').count();
    assert.equal(perPlate, Number(answer), 'solution plate matches the answer');
    assert.equal(await page.locator('.quiz-visual .mv-holder').count(), people);
  });
  await playQuiz('divide-pictures/index.html?mode=group', async ({ answer, visualItems, prompt }) => {
    const size = Number(prompt.match(/of (\d+)\./)[1]);
    assert.equal(Number(answer) * size, visualItems, prompt);
    assert.equal(await page.locator('.quiz-visual .mv-loop').count(), Number(answer));
  });
  await playQuiz('divide-pictures/index.html?mode=leftover&level=3', async ({ answer, visualItems, prompt }) => {
    const size = Number(prompt.match(/bags of (\d+)/)[1]);
    const [, full, left] = answer.match(/(\d+) bags, (\d+) left/).map(Number);
    assert.equal(full * size + left, visualItems, prompt);
    assert.ok(left > 0 && left < size);
    assert.equal(await page.locator('.quiz-visual .mv-leftover .mv-item').count(), left);
  });
  for (const mode of ['hops', 'rows', '']) await playQuiz(`divide-pictures/index.html${mode ? '?mode=' + mode : ''}`, null);
  console.log('PASS divide-pictures: solved pictures match answers, remainders < divisor');

  // Market Day: answers are consistent with the numbers in each story type.
  for (const level of [1, 2, 3]) {
    await playQuiz(`market-day/index.html?level=${level}`, ({ answer, prompt }) => {
      const n = (prompt.match(/\d+/g) || []).map(Number);
      const v = Number(answer.replace('₹', ''));
      if (/needed so nobody/.test(prompt)) assert.equal(v, Math.ceil(n[0] / n[1]), prompt);
      if (/How many can .* buy/.test(prompt)) assert.equal(v, Math.floor(n[0] / n[1]), prompt);
      if (/change\?/.test(prompt)) assert.equal(v, n[2] - n[0] * n[1], prompt);
      if (/times as many/.test(prompt)) assert.equal(v, n[0] * n[1], prompt);
      if (/shares .* equally/.test(prompt)) assert.equal(v * n[1], n[0], prompt);
      assert.ok(v > 0, prompt);
    });
  }
  await page.screenshot({ path: 'artifacts/market-day-mobile.png' });
  console.log('PASS market-day: levels 1–3, round-up / round-down / change / sharing answers verified');

  await playQuiz('fact-families/index.html', async ({ answer, prompt }) => {
    assert.ok(await page.locator('.quiz-visual .mv-facts li').count() >= 2, 'family facts shown after answer');
    if (/NOT belong/.test(prompt)) assert.doesNotMatch(answer, /^\d+$/);
  });
  console.log('PASS fact-families');

  // --- Share It Fairly: deal fairly, catch unfair, answer, finish ----------
  await page.goto(`${base}/games/share-fairly/index.html?level=3`);
  let before = await plays();
  await page.locator('#start-btn').click();
  for (let s = 0; s < 6; s++) {
    if (s === 0) {
      await page.locator('.sf-plate').first().click();
      await page.locator('#share-done').click();
      assert.match(await page.locator('#share-feedback').textContent(), /Not fair|still/);
      await page.locator('#share-undo').click();
    }
    while (await page.locator('#share-deal').isEnabled()) await page.locator('#share-deal').click();
    const each = Number(await page.locator('.sf-count').first().textContent());
    const left = await page.locator('#share-pile .mv-item').count();
    await page.locator('#share-done').click();
    await page.locator('.sf-answer button', { hasText: new RegExp(`^${each}$`) }).click();
    const leftQ = page.locator('#share-question', { hasText: 'left over' });
    await page.waitForTimeout(600);
    if (await leftQ.count()) await page.locator('.sf-answer button', { hasText: new RegExp(`^${left}$`) }).click();
    await page.locator('#share-next').waitFor({ state: 'visible' });
    assert.match(await page.locator('#share-question').textContent(), new RegExp(`÷ \\d+ = ${each}`));
    await noOverflow('share-fairly');
    await page.locator('#share-next').click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /6 \/ 6/);
  assert.equal(await plays(), before + 1);
  console.log('PASS share-fairly: unfair caught, 6 stories shared and answered, progress saved');

  // --- Array Garden: build exact arrays and find every factor pair --------
  await page.goto(`${base}/games/array-garden/index.html?level=3`);
  await page.locator('#start-btn').click();
  const plant = async (r, c) => page.locator(`.ag-cell[data-r="${r}"][data-c="${c}"]`).click();
  for (let t = 0; t < 6; t++) {
    const task = await page.locator('#garden-task').textContent();
    const build = task.match(/Plant (\d+) rows of (\d+)/);
    if (build) {
      const [r, c] = [Number(build[1]), Number(build[2])];
      if (t === 0 && r !== c) {
        await plant(c, r);
        await page.locator('#garden-check').click();
        assert.match(await page.locator('#garden-feedback').textContent(), /turned around|We need/);
      }
      await plant(r, c);
      assert.equal(await page.locator('.ag-cell.on').count(), r * c);
      await page.locator('#garden-check').click();
    } else {
      const total = Number(task.match(/Plant (\d+)/)[1]);
      for (let r = 1; r <= 10; r++) {
        if (total % r || total / r > 10) continue;
        await plant(r, total / r);
        await page.locator('#garden-check').click();
      }
    }
    await page.locator('#garden-next').waitFor({ state: 'visible' });
    await noOverflow('array-garden');
    await page.locator('#garden-next').click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /6 \/ 6/);
  console.log('PASS array-garden: arrays built, turn-around caught, every factor pair found');

  // --- Multiples Hunt ---------------------------------------------------------
  await page.goto(`${base}/games/multiples-hunt/index.html`);
  await page.locator('#start-btn').click();
  for (let h = 0; h < 3; h++) {
    const n = Number((await page.locator('#hunt-task').textContent()).match(/multiple of (\d+)/)[1]);
    if (h === 0) {
      await page.locator(`.mh-cell[data-v="${n + 1}"]`).click();
      assert.match(await page.locator('#hunt-feedback').textContent(), /not in the/);
    }
    for (let v = n; v <= 100; v += n) await page.locator(`.mh-cell[data-v="${v}"]`).click();
    await page.locator('#hunt-next').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.mh-cell.found').count(), Math.floor(100 / n));
    await page.locator('#hunt-next').click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /3 \/ 3/);
  console.log('PASS multiples-hunt: three tables found, wrong tap explained');

  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await browser.close();
  console.log('PASS all visual multiplication & division activities; no errors or external requests.');
})().catch((e) => { console.error(e); process.exit(1); });
