// Review My Mistakes, end to end. For every game with single questions: miss a
// question, make it due, reopen the game with ?review=1 and check the same
// question comes back and moves along its schedule. Server must be running:
//   npm start, then npm run test:review
//   ONLY=fractions npm run test:review   games whose path contains "fractions"
// The schedule itself (days and clearing) is covered by tests/review.test.cjs.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;
const width = Number(process.env.VIEW_WIDTH || 390);

const gamesUsing = (needle) => fs.readdirSync('games')
 .filter((id) => fs.existsSync(`games/${id}/game.js`) && fs.readFileSync(`games/${id}/game.js`, 'utf8').includes(needle));

// Settings whose questions carry other kinds of picture or state.
const QUIZ_EXTRA = ['fractions?type=picture', 'fractions?level=1', 'time?level=1', 'money?level=1', 'measurement?mode=read', 'counting?mode=tenframe',
 'counting?mode=dice', 'calendar?type=grid', 'multiply-pictures?mode=match', 'multiply-pictures?mode=sentence', 'divide-pictures?mode=share', 'divide-pictures?mode=leftover',
 'division?level=3', 'english-alphabets?mode=phonics', 'tamil-alphabets?mode=listen', 'tamil-words?type=wordpic', 'world-capitals?mode=flag', 'opposites?mode=picture', 'solar-system?mode=order'];
const ROUND_EXTRA = ['clock-setter?level=3', 'coin-shop?level=3', 'fraction-pizza?level=3', 'block-builder?level=3', 'measure-lab?level=3', 'picture-graphs?level=3', 'shape-detectives?level=3',
 'sort-it?level=2', 'sentence-builder?level=2', 'story-order?level=2', 'life-cycles?level=2', 'word-families?level=2', 'sound-it-out?level=2', 'sight-word-pop?level=2', 'weather-wear?level=2', 'tamil-days-colours?mode=months'];

const href = (spec, extra = '') => {
 const [id, query] = spec.split('?');
 const q = [query, extra].filter(Boolean).join('&');
 return `${base}/games/${id}/index.html${q ? '?' + q : ''}`;
};
const wanted = (spec) => !only || spec.includes(only);

/** What a question looks like. HTML goes through the parser so equal pictures compare equal. */
const readQuestion = () => {
 const parsed = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.innerHTML; };
 const buttons = [...document.querySelectorAll('.quiz-choice-btn')];
 return {
  prompt: document.getElementById('question-text').textContent,
  visual: parsed(document.querySelector('.quiz-visual')?.innerHTML || ''),
  choices: buttons.map((b) => b.dataset.answer),
  pictures: buttons.map((b) => (b.querySelector('figure, svg') ? parsed(b.innerHTML) : '')),
 };
};

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
 const page = await context.newPage();
 const errors = [];
 page.on('pageerror', (e) => errors.push(e.message));
 // Lets the test reach the round loop of hand-built games, which keep it private.
 await page.addInitScript(() => {
  let real;
  Object.defineProperty(window, 'KlgRound', {
   configurable: true,
   get: () => real,
   set(value) {
    real = { ...value, run(opts) {
     window.__made = 0;
     const make = opts.make;
     opts.make = (...args) => { window.__made += 1; return make(...args); };
     const render = opts.render;
     opts.render = (q, ctx) => { window.__q = q; window.__ctx = ctx; return render(q, ctx); };
     return value.run(opts);
    } };
   },
  });
 });
 const clear = () => page.evaluate(() => localStorage.clear());
 const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('klg-review-v1') || '{"items":[]}').items);
 const makeDue = () => page.evaluate(() => {
  const data = JSON.parse(localStorage.getItem('klg-review-v1'));
  data.items.forEach((it) => { it.due = '2000-01-01'; });
  localStorage.setItem('klg-review-v1', JSON.stringify(data));
 });
 const noOverflow = async (spec) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), spec + ': sideways scroll at ' + width + 'px');
 const noErrors = (spec) => { assert.deepEqual(errors.splice(0), [], spec + ': page errors'); };

 /** Tap first answers until one is wrong. Returns what that question looked like. */
 async function missQuizQuestion(spec) {
  await page.goto(href(spec));
  await clear();
  await page.reload();
  await page.locator('#start-btn').click();
  const total = Number(await page.locator('#total-questions').textContent());
  for (let i = 0; i < total; i++) {
   await page.locator('.quiz-choice-btn').first().waitFor();
   const seen = await page.evaluate(readQuestion);
   const buttons = page.locator('.quiz-choice-btn');
   await buttons.first().click();
   seen.answer = await page.locator('.quiz-choice-btn.correct').first().getAttribute('data-answer');
   if (await page.locator('.quiz-choice-btn.incorrect').count()) return seen;
   // The first choice was right. The second answer on the next question cannot be known, so keep tapping.
   await page.locator('.quiz-next').click();
  }
  return null;
 }

 async function checkQuiz(spec) {
  let seen = null;
  for (let tries = 0; tries < 8 && !seen; tries++) seen = await missQuizQuestion(spec);
  assert.ok(seen, spec + ': never managed to miss a question');
  const saved = await store();
  assert.equal(saved.length, 1, spec + ': one miss saved');
  assert.ok(saved[0].prompt, spec + ': report has a prompt');
  assert.ok(saved[0].answer, spec + ': report has an answer');
  const scoresBefore = await page.evaluate(() => { const s = KlgProgress.summary(); return JSON.stringify([s.plays, s.stars, s.games]); });
  await makeDue();
  await page.goto(href(spec, 'review=1'));
  assert.match(await page.locator('#klg-review-intro').textContent(), /1 tricky question/, spec + ': start screen says review');
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn').first().waitFor();
  assert.equal(await page.locator('#total-questions').textContent(), '1', spec + ': only the due question');
  const again = await page.evaluate(readQuestion);
  assert.equal(again.prompt, seen.prompt, spec + ': same prompt');
  assert.equal(again.visual, seen.visual, spec + ': same picture');
  assert.deepEqual(again.choices, seen.choices, spec + ': same choices');
  assert.deepEqual(again.pictures, seen.pictures, spec + ': same picture answers');
  await noOverflow(spec);
  await page.locator(`.quiz-choice-btn[data-answer="${seen.answer.replace(/"/g, '\\"')}"]`).first().click();
  assert.equal(await page.locator('.quiz-choice-btn.incorrect').count(), 0, spec + ': the saved answer is still right');
  assert.equal(await page.locator('.quiz-next').textContent(), 'All done →');
  await page.locator('.quiz-next').click();
  await page.locator('#klg-review-home').waitFor();
  assert.ok(await page.locator('#results-screen').isVisible());
  assert.equal(await page.locator('#play-again-btn').count() ? await page.locator('#play-again-btn').isVisible() : false, false, spec + ': no replay button after review');
  const after = await store();
  assert.equal(after.length, 1, spec + ': kept for one more visit');
  assert.equal(after[0].step, 1, spec + ': moved to the 3-day step');
  const scoresAfter = await page.evaluate(() => { const s = KlgProgress.summary(); return JSON.stringify([s.plays, s.stars, s.games]); });
  assert.equal(scoresAfter, scoresBefore, spec + ': stars and scores untouched');
  noErrors(spec);
 }

 async function checkRound(spec) {
  await page.goto(href(spec));
  await clear();
  await page.reload();
  await page.locator('#start-btn').click();
  await page.waitForFunction(() => window.__ctx);
  const seen = await page.evaluate(() => ({ q: JSON.stringify(window.__q), task: document.getElementById('task').textContent }));
  await page.evaluate(() => window.__ctx.wrong('test miss'));
  await page.evaluate(() => window.__ctx.right('The answer was here.'));
  const saved = await store();
  assert.equal(saved.length, 1, spec + ': one miss saved');
  assert.equal(saved[0].answer, 'The answer was here.', spec + ': the answer reached the report');
  assert.equal(JSON.stringify(saved[0].snapshot.q), seen.q, spec + ': the saved question is the shown question, losslessly');
  await makeDue();
  await page.goto(href(spec, 'review=1'));
  assert.match(await page.locator('#klg-review-intro').textContent(), /1 tricky question/);
  await page.locator('#start-btn').click();
  await page.waitForFunction(() => window.__ctx);
  assert.equal(await page.evaluate(() => window.__made), 0, spec + ': replay must not generate a new question');
  assert.equal(await page.evaluate(() => JSON.stringify(window.__q)), seen.q, spec + ': same question');
  assert.equal(await page.locator('#task').textContent(), seen.task, spec + ': same task');
  assert.ok(await page.locator('#stage').evaluate((el) => el.childElementCount > 0 || el.textContent.trim().length > 0), spec + ': the stage is drawn');
  await noOverflow(spec);
  await page.evaluate(() => window.__ctx.right('Well remembered.'));
  assert.equal(await page.locator('#next-btn').textContent(), 'All done →');
  await page.locator('#next-btn').click();
  await page.locator('#klg-review-home').waitFor();
  assert.equal(await page.locator('#play-again').isVisible(), false, spec + ': no replay button after review');
  const after = await store();
  assert.equal(after[0].step, 1, spec + ': moved to the 3-day step');
  noErrors(spec);
 }

 const failures = [];
 const attempt = async (spec, fn) => {
  if (!wanted(spec)) return;
  try { await fn(spec); console.log('ok  ', spec); }
  catch (e) { failures.push(spec); errors.splice(0); console.log('FAIL', spec, '\n     ', String(e.message).split('\n').slice(0, 6).join('\n      ')); }
 };

 // Spelling Bee opens on its training, which has its own schedule; only its quiz is replayed here.
 const quizGames = gamesUsing('new QuizEngine').map((id) => (id === 'spelling-bee' ? 'spelling-bee?level=1' : id));
 const roundGames = gamesUsing('KlgRound.run');
 console.log(`${quizGames.length} quiz games, ${roundGames.length} hand-built games`);
 for (const spec of [...quizGames, ...QUIZ_EXTRA]) await attempt(spec, checkQuiz);
 for (const spec of [...roundGames, ...ROUND_EXTRA]) await attempt(spec, checkRound);

 await attempt('flow: next-game link and clearing', async () => {
  await page.goto(href('sort-it'));
  await clear();
  // Two games due: finishing one must offer the other, then home.
  await page.evaluate(() => {
   const add = (gameId, id, snapshot) => ({ id, gameId, query: '', snapshot, step: 1, due: '2000-01-01', misses: 2, prompt: 'p', answer: 'a' });
   localStorage.setItem('klg-review-v1', JSON.stringify({ epoch: 1, cleared: 0, items: [
    add('counting', 'counting||x', { prompt: 'How many?', correctAnswer: 3, choices: [3, 4], dedupeKey: 'x' }),
    add('opposites', 'opposites||y', { prompt: 'Opposite of hot?', correctAnswer: 'cold', choices: ['cold', 'warm'], dedupeKey: 'y' }),
   ] }));
  });
  await page.goto(href('counting', 'review=1'));
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn[data-answer="3"]').click();
  await page.locator('.quiz-next').click();
  const next = page.locator('#klg-review-next');
  await next.waitFor();
  assert.match(await next.textContent(), /Opposites/, 'names the next game');
  assert.match(await page.locator('#results-message').textContent(), /mastered 1 tricky question/);
  assert.match(await page.locator('#klg-reward').textContent(), /Second Chance/, 'badge is shown');
  await next.click();
  await page.waitForURL(/opposites/);
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn[data-answer="cold"]').click();
  await page.locator('.quiz-next').click();
  await page.locator('#klg-review-home').waitFor();
  assert.equal(await page.locator('#klg-review-next').count(), 0, 'nothing left, so no next link');
  assert.equal((await store()).length, 0, 'both cleared');
  assert.equal(await page.evaluate(() => KlgProgress.review.summary().cleared), 2);
  noErrors('flow');
 });

 await attempt('flow: a wrong answer in review restarts the schedule', async () => {
  await page.goto(href('counting'));
  await clear();
  await page.evaluate(() => localStorage.setItem('klg-review-v1', JSON.stringify({ epoch: 1, cleared: 0, items: [
   { id: 'counting||x', gameId: 'counting', query: '', snapshot: { prompt: 'How many?', correctAnswer: 3, choices: [3, 4], dedupeKey: 'x' }, step: 1, due: '2000-01-01', misses: 1 },
  ] })));
  await page.goto(href('counting', 'review=1'));
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn[data-answer="4"]').click();
  await page.locator('.quiz-next').click();
  await page.locator('#klg-review-home').waitFor();
  const [item] = await store();
  assert.equal(item.step, 0);
  assert.equal(item.misses, 2);
  assert.ok(item.due > '2000-01-01');
  noErrors('flow');
 });

 await attempt('flow: nothing due on a review link plays the normal game', async () => {
  await page.goto(href('counting'));
  await clear();
  await page.goto(href('counting', 'review=1'));
  assert.equal(await page.locator('#klg-review-intro').count(), 0);
  await page.locator('#start-btn').click();
  assert.ok(Number(await page.locator('#total-questions').textContent()) > 1);
  noErrors('flow');
 });

 await attempt('flow: home card and grown-up report', async () => {
  await page.goto(`${base}/index.html`);
  await clear();
  await page.reload();
  assert.equal(await page.locator('#review-card').isVisible(), false, 'hidden with nothing saved');
  await page.evaluate(() => localStorage.setItem('klg-stage', '2'));
  await page.reload();
  assert.equal(await page.locator('#review-card').isVisible(), false, 'hidden with nothing saved');
  await page.evaluate(() => localStorage.setItem('klg-review-v1', JSON.stringify({ epoch: 1, cleared: 4, items: [
   { id: 'counting|max=10|x', gameId: 'counting', query: 'max=10', snapshot: { prompt: 'a' }, step: 0, due: '2000-01-01', misses: 3, prompt: 'How many <apples>?', answer: '7' },
   { id: 'opposites||y', gameId: 'opposites', query: '', snapshot: { prompt: 'b' }, step: 0, due: '2000-01-01', misses: 1, prompt: 'Opposite of hot?', answer: 'cold' },
   { id: 'time||z', gameId: 'time', query: '', snapshot: { prompt: 'c' }, step: 0, due: '2999-01-01', misses: 2, prompt: 'Later question', answer: '3:00' },
  ] })));
  await page.reload();
  assert.ok(await page.locator('#review-card').isVisible());
  assert.equal(await page.locator('#review-count').textContent(), '2 questions ready for another try');
  assert.match(await page.locator('#review-note').textContent(), /2 games/);
  assert.equal(await page.locator('#review-link').getAttribute('href'), 'games/counting/index.html?max=10&review=1');
  await noOverflow('home');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('klg-progress-v1') || 'null'); localStorage.setItem('klg-progress-v1', JSON.stringify(s || { xp: 10, plays: 1, games: { counting: { plays: 1, bestScore: 5, total: 10, bestStars: 1, bestMs: 0, recent: [50], byMode: {} } }, badges: {} })); });
  await page.reload();
  await page.locator('#parent-open').click();
  const report = page.locator('#parent-report');
  await report.getByText('Tricky questions').waitFor();
  const text = await report.textContent();
  assert.match(text, /3 saved for review, 4 mastered/);
  assert.match(text, /How many <apples>\?/, 'prompts are shown as text, not as HTML');
  assert.ok(text.indexOf('How many') < text.indexOf('Later question'), 'most missed first');
  await page.locator('#parent-close').click();
  noErrors('home');
 });

 await attempt('flow: finishing a hand-built round reports its best streak', async () => {
  await page.goto(href('sort-it'));
  await clear();
  await page.reload();
  await page.locator('#start-btn').click();
  const total = 5;
  for (let i = 0; i < total; i++) {
   await page.waitForFunction((n) => window.__ctx && window.__ctx.index === n, i);
   await page.evaluate(() => window.__ctx.right('ok'));
   await page.locator('#next-btn').click();
  }
  await page.locator('#finish-summary .tg-finish-xp').waitFor();
  assert.ok(await page.evaluate(() => !!KlgProgress.summary().badges['streak-5']), 'five first-try answers earn On Fire');
  noErrors('streak');
 });

 await attempt('flow: catalogue badges can be earned on a game page', async () => {
  await page.goto(href('counting'));
  await clear();
  await page.evaluate(() => {
   const games = {};
   ['counting', 'opposites', 'tamil-words', 'solar-system'].forEach((id) => { games[id] = { plays: 1, bestScore: 8, total: 10, bestStars: 2, bestMs: 0, recent: [80], byMode: {} }; });
   localStorage.setItem('klg-progress-v1', JSON.stringify({ xp: 100, plays: 4, streak: 1, bestStreak: 1, lastDay: '', games, badges: {} }));
   KlgProgress.record({ score: 8, total: 10, gameId: 'counting' });
  });
  assert.ok(await page.evaluate(() => !!KlgProgress.summary().badges['all-rounder']), 'All-Rounder');
  noErrors('badges');
 });

 await browser.close();
 if (failures.length) { console.log(`\n${failures.length} failed:\n  ${failures.join('\n  ')}`); process.exit(1); }
 console.log('\nAll review checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
