// Plays every Tamil activity in Chromium on a device with NO Tamil speech
// voice, checking that real recordings are heard and that each game can be
// completed. Run with the local server up: npm start, then npm run test:tamil-games
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';

// Every <audio> play is logged as the Tamil text it says, and "ends" at once
// so sequences (blends, rows) run instantly. Speech synthesis has no voices.
const fakeAudio = () => {
  window.__heard = [];
  const textFor = (src) => {
    const id = decodeURIComponent(src.split('/').pop().replace('.mp3', ''));
    const entry = Object.entries(window.KLG_TAMIL_AUDIO || {}).find(([, v]) => v === id);
    return entry ? entry[0] : id;
  };
  HTMLMediaElement.prototype.play = function () {
    window.__heard.push(textFor(this.src));
    Object.defineProperty(this, 'ended', { value: true, configurable: true });
    setTimeout(() => this.dispatchEvent(new Event('ended')), 5);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};
  window.__spoken = [];
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => [], cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, addEventListener() {} },
  });
};

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(fakeAudio);
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
  const heard = () => page.evaluate(() => window.__heard.slice());
  const lastHeard = async () => (await heard()).at(-1);
  const clearHeard = () => page.evaluate(() => { window.__heard.length = 0; });
  const noOverflow = async (id) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
  const plays = () => page.evaluate(() => KlgProgress.summary().plays);

  // --- Home: Tamil tab and learning path -----------------------------------
  await page.goto(base);
  assert.equal(await page.locator('.game-card').count(), 51);
  assert.equal(await page.locator('.tamil-steps li').count(), 9);
  await page.locator('#tamil-jump').click();
  assert.equal(await page.locator('.game-tile:visible').count(), 16);
  assert.equal(await page.locator('.subject-tabs [data-subject="tamil"]').getAttribute('aria-pressed'), 'true');
  await noOverflow('home');
  await page.screenshot({ path: 'artifacts/home-tamil-mobile.png', fullPage: false });
  console.log('PASS home: 51 games, Tamil tab shows 16, learning path');

  // --- Tamil Alphabets listen mode now works with no Tamil voice ------------
  await page.goto(`${base}/games/tamil-alphabets/index.html?mode=listen&type=vowels`);
  await page.locator('#start-btn').click();
  await page.locator('.quiz-choice-btn').first().waitFor();
  assert.equal(await page.locator('#question-text').textContent(), '🔊', 'listen prompt, not text fallback');
  const said = await lastHeard();
  assert.ok(said && /^[஀-௿]+$/.test(said), 'a vowel recording played');
  await page.locator('.quiz-choice-btn', { hasText: said }).first().click();
  assert.match(await page.locator('#quiz-feedback').textContent(), /Yes!/);
  console.log('PASS tamil-alphabets listen mode uses recordings:', said);

  // --- Letter chart -----------------------------------------------------------
  await page.goto(`${base}/games/tamil-letter-chart/index.html`);
  assert.equal(await page.locator('#chart-grid .tg-letter').count(), 12);
  await clearHeard();
  await page.locator('#chart-grid .tg-letter', { hasText: 'ஆ' }).click();
  assert.equal(await lastHeard(), 'ஆ');
  assert.match(await page.locator('#chart-detail').textContent(), /aa/);
  await page.locator('#tab-mei').click();
  assert.equal(await page.locator('#chart-grid .tg-letter').count(), 19);
  await page.locator('#tab-uyirmei').click();
  assert.equal(await page.locator('#chart-grid .tg-letter').count(), 216);
  await clearHeard();
  await page.locator('#chart-grid .tg-letter', { hasText: /^ஞொ$/ }).click();
  await page.waitForTimeout(1200);
  assert.deepEqual((await heard()).slice(0, 2), ['ஞ்', 'ஒ'], 'unrecorded letter is blended from its parts');
  await page.locator('.tg-head').first().click(); // play the அ column
  await page.waitForTimeout(400);
  await noOverflow('chart');
  await page.screenshot({ path: 'artifacts/tamil-chart-mobile.png' });
  console.log('PASS tamil-letter-chart: tabs, 216-letter grid, blend fallback');

  // --- Letter bubbles: pop the bubble matching the recording --------------
  await page.goto(`${base}/games/tamil-letter-pop/index.html`);
  let before = await plays();
  await page.locator('#start-btn').click();
  for (let i = 0; i < 10; i++) {
    await page.waitForFunction((n) => document.getElementById('pop-count').textContent.startsWith(n + ' '), i + 1);
    await page.waitForTimeout(400);
    const target = await lastHeard();
    await page.locator('.tg-bubble:not([disabled])', { hasText: target }).first().click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /10 \/ 10/);
  assert.equal(await plays(), before + 1);
  console.log('PASS tamil-letter-pop: full round 10/10, progress saved');

  // --- Tracing: no ink, scribble, then a real trace over the letter ---------
  await page.goto(`${base}/games/tamil-tracing/index.html`);
  await page.locator('#start-btn').click();
  await page.waitForTimeout(500);
  await page.locator('#trace-check').click();
  assert.match(await page.locator('#trace-feedback').textContent(), /Draw over/);
  const box = await page.locator('#trace-canvas').boundingBox();
  await page.mouse.move(box.x + 5, box.y + 5); await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height - 10, { steps: 5 }); await page.mouse.up();
  await page.locator('#trace-check').click();
  assert.match(await page.locator('#trace-feedback').textContent(), /Nearly|stay on/);
  await page.locator('#trace-clear').click();
  // Dab ink on every guide pixel (sampled on a grid) — a careful trace.
  const dots = await page.evaluate(() => {
    const c = document.getElementById('trace-canvas');
    const x = c.getContext('2d');
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const scale = c.width / c.clientWidth;
    const out = [];
    for (let y = 0; y < c.height; y += Math.round(9 * scale)) for (let i = 0; i < c.width; i += Math.round(9 * scale)) {
      const k = (y * c.width + i) * 4;
      if (d[k + 3] > 0 && d[k] < 245) out.push([i / scale, y / scale]);
    }
    return out;
  });
  for (const [dx, dy] of dots) { await page.mouse.move(box.x + dx, box.y + dy); await page.mouse.down(); await page.mouse.up(); }
  await page.locator('#trace-check').click();
  assert.match(await page.locator('#trace-feedback').textContent(), /Lovely/);
  await page.screenshot({ path: 'artifacts/tamil-tracing-mobile.png' });
  console.log(`PASS tamil-tracing: empty, scribble rejected, careful trace accepted (${dots.length} dabs)`);

  // --- Word puzzle: build words from tiles ----------------------------------
  await page.goto(`${base}/games/tamil-word-puzzle/index.html`);
  before = await plays();
  await page.locator('#start-btn').click();
  for (let i = 0; i < 8; i++) {
    const english = (await page.locator('#puzzle-picture').getAttribute('aria-label')).match(/Picture: (.+?)\./)[1];
    const parts = await page.evaluate((e) => KlgTamil.letters(TAMIL_WORDS.find((w) => w.english === e).tamil), english);
    if (i === 0) {
      await page.locator('#puzzle-help').click();
    } else {
      for (const p of parts) await page.locator('.tg-tile:not([disabled])', { hasText: new RegExp('^' + p + '$') }).first().click();
    }
    await page.locator('#puzzle-next').waitFor({ state: 'visible' });
    await page.locator('#puzzle-next').click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /7 \/ 8/, '"Show me" word does not score');
  assert.equal(await plays(), before + 1);
  console.log('PASS tamil-word-puzzle: 8 words built, help not scored');

  // --- Tamil memory: match pictures to words ---------------------------------
  await page.goto(`${base}/games/tamil-memory/index.html`);
  await page.locator('#start-btn').click();
  const faces = [];
  for (let i = 0; i < 12; i += 2) {
    for (const j of [i, i + 1]) { await page.locator('.tg-memory-card').nth(j).click(); faces[j] = await page.locator('.tg-memory-card').nth(j).textContent(); }
    await page.waitForTimeout(1600);
  }
  const pairOf = await page.evaluate(() => Object.fromEntries(TAMIL_WORDS.flatMap((w) => [[w.emoji, w.tamil], [w.tamil, w.tamil]])));
  const groups = {};
  faces.forEach((f, i) => (groups[pairOf[f]] = groups[pairOf[f]] || []).push(i));
  for (const idx of Object.values(groups)) {
    if (await page.locator('.tg-memory-card').nth(idx[0]).isDisabled()) continue;
    for (const i of idx) await page.locator('.tg-memory-card').nth(i).click();
  }
  await page.locator('#finish-screen').waitFor({ state: 'visible' });
  assert.match(await page.locator('#finish-summary').textContent(), /All 6 pairs/);
  console.log('PASS tamil-memory: all pairs matched');

  // --- Quiz-style Tamil games: audio on show, answer, next ------------------
  const quizzes = {
    'tamil-sound-blend': { audio: true }, 'tamil-sound-blend?mode=split': {}, 'tamil-first-letter': { audio: true },
    'tamil-listen-find': { audio: true }, 'tamil-short-long': { audio: true }, 'tamil-short-long?mode=pair': { audio: true },
    'tamil-numbers': {}, 'tamil-numbers?mode=listen': { audio: true }, 'tamil-letter-order?set=rows': {},
    'tamil-words?type=meaning': { audio: true }, 'tamil-word-builder': {},
  };
  for (const [id, opts] of Object.entries(quizzes)) {
    const [game, query] = id.split('?');
    await page.goto(`${base}/games/${game}/index.html${query ? '?' + query : ''}`);
    // Log what each game asks to be said, alongside what is actually heard.
    await page.evaluate(() => {
      window.__asked = [];
      for (const fn of ['say', 'sequence', 'play', 'blend']) {
        const orig = KlgTamilAudio[fn];
        KlgTamilAudio[fn] = (t, ...rest) => { window.__asked.push(...[].concat(t)); return orig(t, ...rest); };
      }
    });
    await clearHeard();
    await page.locator('#start-btn').click();
    await page.locator('.quiz-choice-btn').first().waitFor();
    await page.waitForTimeout(300);
    if (opts.audio) {
      const asked = await page.evaluate(() => window.__asked.slice());
      assert.ok(asked.length > 0, `${id}: Tamil audio requested on question`);
      if (await page.evaluate((list) => list.some((t) => KlgTamilAudio.canSay(t)), asked)) {
        assert.ok((await heard()).length > 0, `${id}: Tamil audio heard on question`);
      }
    }
    await clearHeard();
    await page.evaluate(() => { window.__asked.length = 0; });
    await page.locator('.quiz-choice-btn').first().click();
    await page.locator('.quiz-next').waitFor({ state: 'visible' });
    await page.waitForTimeout(1500);
    const asked = await page.evaluate(() => window.__asked.slice());
    assert.ok(asked.length > 0, `${id}: answer is said aloud`);
    // Anything recorded (or blendable from recorded parts) must really sound;
    // only the few unrecorded words stay silent on a device with no Tamil voice.
    const audible = await page.evaluate((list) => list.some((t) => KlgTamilAudio.canSay(t)), asked);
    if (audible) assert.ok((await heard()).length > 0, `${id}: ${asked.join(' ')} should be heard`);
    await noOverflow(id);
    await page.locator('.quiz-next').click();
    assert.equal(await page.locator('#question-number').textContent(), '2', id);
    console.log('PASS', id);
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await browser.close();
  console.log('PASS all Tamil activities with recorded audio, no Tamil voice, no errors or external requests.');
})().catch((e) => { console.error(e); process.exit(1); });
