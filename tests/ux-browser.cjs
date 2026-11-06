// Can a child get around? Turns the layout review into numbers, on phones and
// tablets. Server must be running: npm start, then
//   npm run test:ux
//   ONLY=next npm run test:ux        sections whose name contains "next"
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;

const SIZES = [[320, 568], [390, 844], [810, 1080], [1080, 810], [1366, 900]];
const gamesUsing = (needle) => fs.readdirSync('games')
 .filter((id) => fs.existsSync(`games/${id}/game.js`) && fs.readFileSync(`games/${id}/game.js`, 'utf8').includes(needle));
const QUIZ = gamesUsing('new QuizEngine');
// Spelling Bee opens on its training, and its quiz has its own address. tests/bee-browser.cjs covers the training.
const quizUrl = (id) => `${base}/games/${id}/index.html${id === 'spelling-bee' ? '?level=1' : ''}`;
const ROUND = gamesUsing('KlgRound.run');

const sections = [];
const section = (name, fn) => sections.push([name, fn]);

/** Lets the test reach the round loop of hand-built games, which keep it private. */
const exposeRound = () => {
 let real;
 Object.defineProperty(window, 'KlgRound', {
  configurable: true,
  get: () => real,
  set(value) {
   real = { ...value, run(opts) {
    const render = opts.render;
    opts.render = (q, ctx) => { window.__ctx = ctx; return render(q, ctx); };
    return value.run(opts);
   } };
  },
 });
};

/** True when the element is fully on screen and nothing is drawn over its middle. */
const inView = (selector) => {
 const el = document.querySelector(selector);
 if (!el) return { ok: false, why: 'missing' };
 const r = el.getBoundingClientRect();
 if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) return { ok: false, why: `off screen: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} of ${innerHeight}` };
 const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
 if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) return { ok: false, why: 'covered by ' + (hit ? hit.id || hit.className || hit.tagName : 'nothing') };
 return { ok: true };
};

section('next and feedback stay on screen after an answer', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  for (const id of QUIZ) {
   await page.goto(quizUrl(id));
   await page.locator('#start-btn').click();
   await page.locator('.quiz-choice-btn').first().waitFor();
   await page.locator('.quiz-choice-btn').first().click();
   const next = await page.evaluate(inView, '.quiz-next');
   if (!next.ok) fail(`${id} at ${w}x${h}: Next ${next.why}`);
   const said = await page.evaluate(inView, '#quiz-feedback');
   if (!said.ok) fail(`${id} at ${w}x${h}: feedback ${said.why}`);
   await page.locator('.quiz-next').click();
   await page.locator('.quiz-choice-btn:not([disabled])').first().waitFor();
   if (await page.evaluate(() => scrollY) !== 0) fail(`${id} at ${w}x${h}: the next question starts scrolled down`);
  }
  for (const id of ROUND) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.waitForFunction(() => window.__ctx);
   await page.evaluate(() => window.__ctx.right('Well done, that is the right answer.'));
   const next = await page.evaluate(inView, '#next-btn');
   if (!next.ok) fail(`${id} at ${w}x${h}: Next ${next.why}`);
   const said = await page.evaluate(inView, '#feedback');
   if (!said.ok) fail(`${id} at ${w}x${h}: feedback ${said.why}`);
   await page.locator('#next-btn').click();
   if (await page.evaluate(() => scrollY) !== 0) fail(`${id} at ${w}x${h}: the next question starts scrolled down`);
  }
  await close();
 }
});

/** Every game page with a start screen. */
const STARTS = fs.readdirSync('games').filter((id) => id !== 'tamil-letter-chart' && fs.existsSync(`games/${id}/index.html`));

section('start screens have one clear thing to do', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  for (const id of STARTS) {
   await page.goto(`${base}/games/${id}/index.html`);
   const play = await page.evaluate(inView, '#start-btn');
   if (!play.ok) fail(`${id} at ${w}x${h}: Play ${play.why}`);
   const r = await page.evaluate(() => ({
    // The level buttons are numbers and pictures, not reading, so they do not count.
    words: (() => {
     const start = document.getElementById('start-screen');
     const levels = start.querySelector('.kid-levels');
     return start.innerText.replace(levels ? levels.innerText : '', '').trim().split(/\s+/).length;
    })(),
    label: document.getElementById('start-btn').textContent.trim(),
    scrolls: document.documentElement.scrollWidth > innerWidth + 1,
    home: document.querySelector('.navbar-brand').textContent.trim(),
    sound: !!document.querySelector('.klg-navbar #klg-mute-btn'),
   }));
   if (r.words > 30) fail(`${id}: ${r.words} words on the start screen`);
   if (r.label !== '▶ Play') fail(`${id}: start button says "${r.label}"`);
   if (r.scrolls) fail(`${id} at ${w}x${h}: sideways scroll`);
   if (r.home !== '🏠 Home') fail(`${id}: home button says "${r.home}"`);
   if (!r.sound) fail(`${id}: sound button is not in the top bar`);
  }
  await close();
 }
});

// A ten-by-ten board cannot give every square 44px on a phone, so Array Garden and
// Multiples Hunt are allowed smaller squares there, as big as the screen allows.
// Block Builder's small blocks can be tapped too, but its big − buttons do the same job.
const tooSmall = () => [...document.querySelectorAll('a,button,select,input,summary')]
 .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.kid-select-hidden') && !e.classList.contains('skip-link') && !(innerWidth < 600 && e.matches('.ag-cell, .mh-cell')) && !e.matches('.kv-removable') && (r.width < 44 || r.height < 44); })
 .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);

section('every control is big enough for a small finger', async ({ newPage, fail }) => {
 for (const [w, h] of [[320, 568], [390, 844], [1080, 810]]) {
  const { page, close } = await newPage(w, h);
  for (const id of STARTS) {
   await page.goto(`${base}/games/${id}/index.html`);
   const details = page.locator('.kid-more summary');
   if (await details.count()) await details.click();
   for (const small of await page.evaluate(tooSmall)) fail(`${id} start at ${w}x${h}: ${small}`);
   await page.locator('#start-btn').click();
   await page.waitForTimeout(40);
   for (const small of await page.evaluate(tooSmall)) fail(`${id} play at ${w}x${h}: ${small}`);
  }
  await close();
 }
});

section('the question and every answer fit on the screen', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES.slice(1)) {
  const { page, close } = await newPage(w, h);
  for (const id of QUIZ) {
   await page.goto(quizUrl(id));
   await page.locator('#start-btn').click();
   await page.locator('.quiz-choice-btn').first().waitFor();
   const r = await page.evaluate(() => ({
    bottom: Math.max(...[...document.querySelectorAll('.quiz-choice-btn')].map((b) => b.getBoundingClientRect().bottom)),
    number: document.getElementById('question-number').textContent,
    total: document.getElementById('total-questions').textContent,
    top: document.getElementById('question-text').getBoundingClientRect().top,
   }));
   // Story Detectives has a story to read first, so scrolling is expected. The next check covers Next.
   if (r.bottom > h + 1 && id !== 'reading-stories') fail(`${id} at ${w}x${h}: answers end at ${Math.round(r.bottom)}`);
   if (r.number !== '1' || !Number(r.total)) fail(`${id}: the question counter was lost`);
  }
  for (const id of ROUND) {
   await page.goto(`${base}/games/${id}/index.html`);
   await page.locator('#start-btn').click();
   await page.waitForFunction(() => window.__ctx);
   const bottom = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().bottom);
   // கதை நேரம் shows a four-picture story to read before its question, so scrolling is expected.
   if (bottom > h + 1 && id !== 'tamil-story-time') fail(`${id} at ${w}x${h}: the game ends at ${Math.round(bottom)}`);
  }
  await close();
 }
});

const home = `${base}/index.html`;
const cat = require('../assets/js/catalogue.js');

/** Words a child would have to read: symbols and pictures do not count. */
const readableWords = () => document.body.innerText.split(/\s+/).filter((w) => /[\p{L}]/u.test(w)).length;
const placesToTap = () => [...document.querySelectorAll('a,button,select,input,summary')]
 .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.matches('.kid-say, .skip-link'); }).length;

section('after a long story, Next and feedback are on screen', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(`${base}/games/reading-stories/index.html?level=2`);
  await page.locator('#start-btn').click();
  for (let i = 0; i < 4; i++) {
   await page.locator('.quiz-choice-btn:not([disabled])').first().click();
   for (const selector of ['.quiz-next', '#quiz-feedback']) {
    const seen = await page.evaluate(inView, selector);
    if (!seen.ok) fail(`long story at ${w}x${h}: ${selector} ${seen.why}`);
   }
   await page.locator('.quiz-next').click();
  }
  await close();
 }
});

section('the first visit reaches a game in two taps, with no age question', async ({ newPage, assert }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(home);
  assert.match(await page.locator('body').innerText(), /What shall we play/);
  assert.doesNotMatch(await page.locator('body').innerText(), /How old/);
  await page.locator('#play-next').click();
  await page.waitForURL(/games\/number-sounds/);
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn').first().waitFor();
  await close();
 }
});

section('the home view is short and simple', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(home);
  const play = await page.evaluate(inView, '#play-next');
  if (!play.ok) fail(`home at ${w}x${h}: Play next ${play.why}`);
  const words = await page.evaluate(readableWords);
  const taps = await page.evaluate(placesToTap);
  if (words > 40) fail(`home at ${w}x${h}: ${words} words to read`);
  if (taps > 14) fail(`home at ${w}x${h}: ${taps} places to tap`);
  const tiles = await page.locator('.kid-world-link').count();
  if (tiles !== 6) fail(`home: ${tiles} tiles`);
  if (h > 568) {
   const fit = await page.evaluate(() => [...document.querySelectorAll('.kid-world-link')].every((t) => t.getBoundingClientRect().bottom <= innerHeight));
   if (!fit) fail(`home at ${w}x${h}: the subject tiles do not all fit`);
  }
  for (const small of await page.evaluate(tooSmall)) fail(`home at ${w}x${h}: ${small}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`home at ${w}x${h}: sideways scroll`);
  await close();
 }
});

section('a subject shows all of its games, easiest first', async ({ newPage, fail, assert }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  for (const subject of Object.keys(cat.SUBJECTS)) {
   await page.goto(`${home}#world/${subject}`);
   await page.reload();
   const want = cat.gamesFor(subject).map((g) => g.id);
   const shown = await page.locator('.game-tile:visible').evaluateAll((tiles) => tiles
    .map((t) => ({ id: t.dataset.game, order: Number(t.style.order) })).sort((a, b) => a.order - b.order).map((t) => t.id));
   assert.deepEqual(shown, want, subject);
   assert.match(await page.locator('.game-tile:visible .kid-card-ages').first().textContent(), /^Ages \d/);
   if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${subject} at ${w}x${h}: sideways scroll`);
   for (const small of await page.evaluate(tooSmall)) fail(`${subject} at ${w}x${h}: ${small}`);
  }
  await page.goto(`${home}#world/math`);
  await page.reload();
  const lefts = await page.locator('.game-tile:visible').evaluateAll((tiles) => [...new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().left)))]);
  if (lefts.length < 2) fail(`subject at ${w}x${h}: only ${lefts.length} column`);
  await close();
 }
});

section('getting around: back and home', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(home);
 await page.locator('.kid-world-link[href="#world/tamil"]').click();
 await page.waitForFunction(() => document.body.dataset.view === 'world');
 await page.locator('.game-tile:visible a').first().click();
 await page.waitForURL(/games\/tamil/);
 assert.match(await page.locator('.navbar-brand').getAttribute('href'), /index\.html#world\/tamil$/, 'Home goes back to this subject');
 await page.locator('.navbar-brand').click();
 await page.waitForFunction(() => document.body.dataset.world === 'tamil');
 await page.goBack();
 await page.waitForURL(/games\/tamil/);
 await page.goBack();
 await page.waitForFunction(() => document.body.dataset.world === 'tamil');
 await page.goBack();
 await page.waitForFunction(() => document.body.dataset.view === 'home');
 // An old link to the age page lands on home.
 await page.goto(`${home}#age`);
 await page.reload();
 assert.equal(await page.evaluate(() => document.body.dataset.view), 'home');
 // The full list, with its filter by age.
 await page.goto(`${home}#all`);
 await page.reload();
 assert.equal(await page.locator('.game-tile:visible').count(), cat.GAMES.length);
 await page.locator('#level-filter').selectOption('4');
 assert.equal(await page.locator('.game-tile:visible').count(), cat.GAMES.filter((g) => g.levels.some((l) => l.band === 4)).length, 'games with a 9+ level');
 // Favourites have their own tile.
 await page.goto(`${home}#world/favorites`);
 await page.reload();
 assert.ok(await page.locator('#world-empty').isVisible(), 'an empty favourites page says what to do');
 await page.goto(`${home}#world/math`);
 await page.waitForFunction(() => document.body.dataset.world === 'math');
 await page.locator('.game-tile:visible .favorite-button').first().click();
 await page.goto(`${home}#world/favorites`);
 await page.waitForFunction(() => document.body.dataset.world === 'favorites');
 assert.equal(await page.locator('.game-tile:visible').count(), 1);
 assert.equal(await page.locator('#world-empty').isVisible(), false);
 await close();
});

section('every level of every game opens, starts and is marked', async ({ newPage, fail }) => {
 const { page, close } = await newPage(390, 844);
 for (const game of cat.GAMES) {
  for (const level of game.levels) {
   await page.goto(`${base}/games/${game.id}/index.html${level.query ? '?' + level.query : ''}`);
   const r = await page.evaluate(() => ({
    bands: [...document.querySelectorAll('.kid-level')].map((a) => Number(a.dataset.band)),
    current: [...document.querySelectorAll('.kid-level[aria-current=true]')].map((a) => Number(a.dataset.band)),
    fold: !!document.querySelector('.kid-more[open]'),
   }));
   if (r.bands.join() !== game.levels.map((l) => l.band).join()) fail(`${game.id}: buttons ${r.bands}`);
   if (r.current.join() !== String(level.band)) fail(`${game.id} ?${level.query}: marked ${r.current}, wanted ${level.band}`);
   if (r.fold) fail(`${game.id} ?${level.query}: choosing a level should not open the settings`);
   await page.locator('#start-btn').click();
   await page.waitForTimeout(30);
   if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${game.id} ?${level.query}: sideways scroll`);
   const started = await page.evaluate(() => document.getElementById('start-screen').classList.contains('d-none') || document.getElementById('start-screen').hidden);
   if (!started) fail(`${game.id} ?${level.query}: Play did nothing`);
  }
 }
 await close();
});

section('a chosen level is remembered, and carries over to the next game', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(`${base}/games/counting/index.html`);
 assert.equal(await page.locator('.kid-level[aria-current=true]').getAttribute('data-band'), '1', 'the default is marked');
 await page.locator('.kid-level[data-band="2"]').click();
 await page.waitForURL(/max=20/);
 assert.equal(await page.locator('.kid-level[aria-current=true]').getAttribute('data-band'), '2');
 // Coming back with no settings goes back to that level.
 await page.goto(`${base}/games/counting/index.html`);
 await page.waitForURL(/max=20/);
 // A game not played yet opens at the same age.
 await page.goto(`${base}/games/shapes-colors/index.html`);
 await page.waitForURL(/mode=shape/);
 assert.equal(await page.locator('.kid-level[aria-current=true]').getAttribute('data-band'), '2');
 // Going back to the game's default level sticks, even though its address has no settings.
 await page.goto(`${base}/games/counting/index.html?max=20`);
 await page.locator('.kid-level[data-band="1"]').click();
 await page.waitForFunction(() => !location.search);
 await page.goto(`${base}/games/counting/index.html`);
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(() => location.search), '');
 // The closest age is used when a game does not have the one chosen.
 await page.goto(`${base}/games/fractions/index.html?level=4`);
 await page.locator('.kid-level[data-band="4"]').click();
 await page.goto(`${base}/games/picture-words/index.html`);
 await page.waitForURL(/level=2/);
 // A topic set in the address is kept when the level changes, and a review shows no levels.
 await page.goto(`${base}/games/fractions/index.html?type=compare`);
 assert.match(await page.locator('.kid-level[data-band="2"]').getAttribute('href'), /type=compare&level=1/);
 assert.ok(await page.locator('.kid-more[open]').count(), 'a topic still opens the settings');
 await close();
 // Blocked storage: the levels still work for the visit.
 const blocked = await newPage(390, 844, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); } });
 await blocked.page.goto(`${base}/games/counting/index.html`);
 await blocked.page.locator('.kid-level[data-band="2"]').click();
 await blocked.page.waitForURL(/max=20/);
 await blocked.close();
});

section('the new levels use the harder questions', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 const q = (name) => require(`../games/${name}/questions.js`);
 const prompt = () => page.locator('#question-text').textContent();
 await page.goto(`${base}/games/feelings-faces/index.html?level=2`);
 await page.locator('#start-btn').click();
 const story = (await prompt()).trim();
 assert.ok(q('feelings-faces').MOMENTS_2.some((m) => m[0] === story), story);
 await page.goto(`${base}/games/reading-stories/index.html?level=2`);
 await page.locator('#start-btn').click();
 const long = (await prompt());
 assert.ok(q('reading-stories').STORIES_2.some((s) => long.includes(s[1])), long);
 await page.goto(`${base}/games/everyday-tools/index.html?level=2`);
 await page.locator('#start-btn').click();
 const tool = (await prompt()).trim();
 assert.ok(q('everyday-tools').QUESTIONS_2.some((x) => x[0] === tool), tool);
 await page.goto(`${base}/games/memory-match/index.html?pairs=15`);
 assert.equal(await page.locator('#memory-size').inputValue(), '15');
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('.memory-card').count(), 30);
 await page.goto(`${base}/games/baby-animals/index.html?level=1`);
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('#total-questions').textContent(), '8');
 await close();
});

section('every speaker says the right words', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844, { init: () => {
  window.__said = [];
  window.speechSynthesis.speak = (u) => window.__said.push(u.text);
 } });
 const said = async () => page.evaluate(() => window.__said[window.__said.length - 1]);
 await page.goto(home);
 for (const [key, words] of Object.entries({ math: 'Numbers', tamil: 'Tamil', science: 'Our world', logic: 'Puzzles' })) {
  await page.locator(`.kid-world[data-subject="${key}"] .kid-say`).click();
  assert.equal(await said(), words);
 }
 assert.equal(await page.evaluate(() => document.body.dataset.view), 'home', 'a speaker does not open the tile');
 await page.locator('#play-next-wrap .kid-say').click();
 assert.match(await said(), /^Play next: /);
 await page.goto(`${home}#world/math`);
 await page.locator('.game-tile[data-game="counting"] .kid-say').click().catch(() => {});
 await page.goto(`${home}#world/tamil`);
 const names = await page.locator('.game-tile:visible').evaluateAll((tiles) => tiles.map((t) => t.dataset.game));
 for (const id of names) {
  await page.locator(`.game-tile[data-game="${id}"] .kid-say`).click();
  const game = cat.byId(id);
  const words = await said();
  assert.equal(words, /[\u0B80-\u0BFF]/.test(game.name) ? game.blurb : game.name, id);
  assert.match(words, /[A-Za-z]/, id + ': the English voice needs English words');
 }
 assert.ok(await page.evaluate(() => document.querySelectorAll('.game-tile .kid-say').length) >= 80, 'every card has a speaker');
 await close();
});

section('it still works with storage blocked', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844, { init: () => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
 } });
 await page.goto(home);
 await page.locator('.kid-world-link[href="#world/math"]').click();
 await page.waitForFunction(() => document.body.dataset.view === 'world');
 assert.equal(await page.locator('.game-tile:visible').count(), cat.gamesFor('math').length);
 await page.locator('.game-tile:visible a').first().click();
 await page.locator('#start-btn').click();
 await page.locator('.quiz-choice-btn').first().waitFor();
 await close();
});

section('it can all be done from a keyboard', async ({ newPage, assert }) => {
 const { page, close } = await newPage(1080, 810);
 await page.goto(home);
 const tabTo = async (selector) => {
  for (let i = 0; i < 40; i++) {
   await page.keyboard.press('Tab');
   if (await page.evaluate((s) => document.activeElement && document.activeElement.matches(s), selector)) return;
  }
  throw new Error('could not Tab to ' + selector);
 };
 await tabTo('#play-next');
 await page.keyboard.press('Enter');
 await page.waitForURL(/games\//);
 await tabTo('#start-btn');
 await page.keyboard.press('Enter');
 await page.locator('.quiz-choice-btn').first().waitFor();
 await close();
});

/** Contrast of a text colour on the colour behind it. */
const contrast = (selector) => {
 const el = document.querySelector(selector);
 if (!el) return null;
 const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
 let bg = null;
 for (let n = el; n; n = n.parentElement) {
  const c = parse(getComputedStyle(n).backgroundColor);
  if (c.a > 0.9) { bg = c; break; }
 }
 bg = bg || { r: 255, g: 255, b: 255 };
 const fg = parse(getComputedStyle(el).color);
 const lum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
 };
 const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
 return (a + 0.05) / (b + 0.05);
};

section('text can be read against its background', async ({ newPage, fail }) => {
 const { page, close } = await newPage(1080, 810);
 const check = async (where, selectors) => {
  for (const s of selectors) {
   const ratio = await page.evaluate(contrast, s);
   if (ratio === null) fail(`${where}: ${s} is missing`);
   else if (ratio < 4.5) fail(`${where}: ${s} is only ${ratio.toFixed(2)}:1`);
  }
 };
 await page.goto(home);
 await check('home', ['.kid-title h1', '.kid-play-words b', '.kid-play-words small', '#daily-name', '#surprise-btn', '.kid-chip', '.kid-soft small', '.parent-link', '.home-footer span',
  ...Object.keys(cat.SUBJECTS).map((k) => `.kid-world[data-subject="${k}"] b`), '.kid-world[data-world="favorites"] b']);
 for (const key of Object.keys(cat.SUBJECTS)) {
  await page.goto(`${home}#world/${key}`);
  await page.reload();
  await check(key, ['#world-title', '.game-tile:not([hidden]) h3', '.game-tile:not([hidden]) .kid-blurb', '.path-next', '.game-tile:not([hidden]) .klg-card-stars', '.kid-next-chip', '.kid-card-ages', '.kid-quiet']);
 }
 await page.goto(`${home}#me`);
 await page.reload();
 await check('me', ['.kid-subhead', '.klg-badge-chip.locked b', '#player-rank-name', '#player-xp-caption', '.klg-player-stat .small']);
 await page.goto(`${home}#all`);
 await page.reload();
 await check('all', ['.kid-title h1', '.filter-status', '.subject-tabs button[aria-pressed=false]', '.level-select']);
 for (const id of ['counting', 'opposites', 'tamil-words', 'solar-system', 'patterns']) {
  await page.goto(`${base}/games/${id}/index.html`);
  await check(id, ['#start-btn', '.kid-level:not([aria-current=true])', '.kid-level[aria-current=true]', '.navbar-brand', '.kid-game-name', '#start-screen h1', '.kid-more summary', '#start-screen .quiz-intro-listen']);
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn').first().waitFor();
  await check(id + ' play', ['.quiz-tools > button', '.quiz-progress-text', '.quiz-score-pill', '.quiz-question']);
 }
 await close();
});

section('the end of a round offers the next game', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(`${base}/games/counting/index.html?max=5`);
 await page.locator('#start-btn').click();
 const total = Number(await page.locator('#total-questions').textContent());
 for (let i = 0; i < total; i++) {
  await page.locator('.quiz-choice-btn:not([disabled])').first().click();
  await page.locator('.quiz-next').click();
 }
 const next = page.locator('.kid-next-game');
 await next.waitFor();
 const want = cat.nextAfter('counting', await page.evaluate(() => KlgProgress.summary().games));
 assert.match(await next.textContent(), new RegExp(want.name));
 const order = await page.evaluate(() => {
  const y = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : Infinity; };
  return { next: y('.kid-next-game'), again: y('#play-again-btn'), review: y('#results-review'), reward: y('#klg-reward') };
 });
 assert.ok(order.next <= order.review, 'the way forward comes before the list of mistakes');
 assert.ok(order.reward < order.next, 'the reward is seen first');
 assert.match(await page.locator('.kid-finish-home').getAttribute('href'), /#world\/math$/);
 await next.click();
 await page.waitForURL(new RegExp(want.id));
 // A hand-built game too.
 await page.goto(`${base}/games/sort-it/index.html`);
 await page.locator('#start-btn').click();
 for (let i = 0; i < 5; i++) {
  await page.waitForFunction((n) => window.__ctx && window.__ctx.index === n, i);
  await page.evaluate(() => window.__ctx.right('ok'));
  await page.locator('#next-btn').click();
 }
 await page.locator('#finish-screen .kid-next-game').waitFor();
 assert.equal(await page.locator('#finish-screen .kid-finish-home').count(), 1);
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
 // A review round keeps its own links.
 await page.evaluate(() => localStorage.setItem('klg-review-v1', JSON.stringify({ epoch: 1, cleared: 0, items: [
  { id: 'counting||x', gameId: 'counting', query: '', snapshot: { prompt: 'How many?', correctAnswer: 3, choices: [3, 4], dedupeKey: 'x' }, step: 0, due: '2000-01-01', misses: 1 },
 ] })));
 await page.goto(`${base}/games/counting/index.html?review=1`);
 await page.locator('#start-btn').click();
 await page.locator('.quiz-choice-btn[data-answer="3"]').click();
 await page.locator('.quiz-next').click();
 await page.locator('#klg-review-home').waitFor();
 assert.equal(await page.locator('.kid-next-game').count(), 0);
 assert.equal(await page.locator('.kid-finish-home:visible').count(), 0, 'no second home link');
 await close();
});

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 const failures = [];
 const pageErrors = [];
 const newPage = async (width, height, { init } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${width}x${height} ${page.url()}: ${e.message}`));
  await page.addInitScript(exposeRound);
  if (init) await page.addInitScript(init);
  return { page, context, close: () => context.close() };
 };
 for (const [name, fn] of sections) {
  if (only && !name.includes(only)) continue;
  const before = failures.length;
  try {
   await fn({ newPage, fail: (message) => failures.push(message), assert, browser });
  } catch (e) {
   failures.push(`${name}: ${String(e.message).split('\n').slice(0, 5).join(' ')}`);
  }
  console.log(`${failures.length === before ? 'PASS' : 'FAIL'} ${name}`);
 }
 await browser.close();
 failures.push(...pageErrors);
 if (failures.length) {
  console.log(`\n${failures.length} problems:\n  ${failures.slice(0, Number(process.env.SHOW || 60)).join('\n  ')}`);
  process.exit(1);
 }
 console.log('PASS the layout checks at every size.');
})().catch((e) => { console.error(e); process.exit(1); });
