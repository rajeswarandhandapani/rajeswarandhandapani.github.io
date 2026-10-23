// Plays the picture-first games in Chromium and checks that each picture
// agrees with its answer. Server must be running: npm start, then
//   npm run test:pictures            all sections
//   ONLY=clock npm run test:pictures sections whose name contains "clock"
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;
const width = Number(process.env.VIEW_WIDTH || 390); // VIEW_WIDTH=320 plays everything on a small phone

const sections = [];
const section = (name, fn) => sections.push([name, fn]);

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
  const noOverflow = async (id) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
  const plays = () => page.evaluate(() => KlgProgress.summary().plays);
  const go = (path) => page.goto(`${base}/games/${path}`);

  /** Quiz-engine game: answer `rounds` questions; check(info) sees the picture before each answer. */
  async function playQuiz(path, check, rounds = 10) {
    await go(path);
    await page.locator('#start-btn').click();
    const total = Number(await page.locator('#total-questions').textContent());
    for (let i = 0; i < Math.min(rounds, total); i++) {
      await page.locator('.quiz-choice-btn').first().waitFor();
      const prompt = await page.locator('#question-text').textContent();
      const labels = await page.locator('.quiz-choice-btn').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
      assert.equal(new Set(labels).size, labels.length, `${path}: duplicate choices for: ${prompt}`);
      const info = { prompt, labels, page };
      if (check) await check.before?.(info);
      await page.locator('.quiz-choice-btn').first().click();
      const correct = await page.locator('.quiz-choice-btn.correct').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
      assert.equal(correct.length, 1, `${path}: exactly one correct choice for: ${prompt}`);
      info.answer = correct[0];
      if (check) typeof check === 'function' ? await check(info) : await check.after?.(info);
      await noOverflow(path);
      await page.locator('.quiz-next').click();
    }
    if (rounds >= total) assert.ok(await page.locator('#results-screen').isVisible(), path);
  }

  /** Hand-built game: wait for the play screen. */
  async function startRound(path) {
    await go(path);
    await page.locator('#start-btn').click();
    await page.locator('#play-screen').waitFor({ state: 'visible' });
  }
  async function finishRound() {
    await page.locator('#finish-screen').waitFor({ state: 'visible' });
    assert.match(await page.locator('#finish-summary').textContent(), /\d+ \/ \d+/);
  }
  const ctx = { page, base, assert, go, playQuiz, startRound, finishRound, noOverflow, plays, section, errors };

  // ---- sections are registered below ------------------------------------
  //@@SECTIONS@@
  section('home: learning paths tick off played games and the grown-up report reads the history', async ({ page, assert, base }) => {
    await page.goto(base + '/index.html');
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.locator('#path-tabs [data-path="math"]').click();
    assert.equal(await page.locator('#path-steps a.done').count(), 0);
    assert.match(await page.locator('#path-next').textContent(), /Next up: Hear numbers/);
    assert.match(await page.locator('#parent-open').click().then(() => page.locator('#parent-report').textContent()), /No rounds yet/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      KlgProgress.record({ gameId: 'number-sounds', score: 10, total: 10 });
      KlgProgress.record({ gameId: 'fractions', score: 2, total: 10 });
      KlgProgress.record({ gameId: 'fractions', score: 3, total: 10 });
      KlgProgress.record({ gameId: 'counting', score: 9, total: 10 });
      KlgProgress.record({ gameId: 'counting', score: 10, total: 10 });
    });
    await page.reload();
    await page.locator('#path-tabs [data-path="math"]').click();
    assert.equal(await page.locator('#path-steps a.done').count(), 2, 'number sounds and counting have stars; fractions at 30% has none yet');
    assert.match(await page.locator('#path-next').textContent(), /Next up: Shapes/);
    assert.equal(await page.locator('#path-steps a.next-up').count(), 1);
    await page.locator('#parent-open').click();
    const report = await page.locator('#parent-report').textContent();
    assert.match(report, /Needs practice:\s*Fractions/);
    assert.match(report, /Ready for next/);
    assert.match(report, /Counting/);
    const stats = await page.evaluate(() => KlgProgress.gameStats('counting'));
    assert.deepEqual(stats.recent, [90, 100]);
    assert.ok(stats.byMode.default.plays === 2);
    await page.keyboard.press('Escape');
    // New games carry a NEW flag and appear under their subject tab
    await page.locator('button[data-subject="science"]').click();
    assert.ok(await page.locator('.game-card[data-game="my-body"]').isVisible());
    assert.ok(await page.locator('.game-card[data-new] .klg-card-flag').count() >= 5, 'new games are flagged');
    await page.evaluate(() => localStorage.clear());
  });

  section('layout: new and upgraded games fit a 320px phone', async ({ page, assert, go, noOverflow }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const cat = require('../assets/js/catalogue.js');
    const fresh = cat.GAMES.filter((g) => g.isNew).map((g) => g.id);
    const upgraded = ['fractions', 'time', 'money', 'measurement', 'rounding-place-value', 'comparing-numbers', 'addition-subtraction', 'counting', 'patterns', 'calendar', 'science-quiz', 'solar-system', 'world-capitals', 'rhyming-words', 'opposites', 'spelling-bee', 'english-alphabets', 'shapes-colors', 'tamil-words', 'animal-habitats', 'baby-animals', 'reading-stories'];
    for (const id of [...fresh, ...upgraded]) {
      await go(`${id}/index.html`);
      await noOverflow(id + ' start');
      await page.locator('#start-btn').click();
      await page.waitForTimeout(150);
      await noOverflow(id + ' first question');
    }
    await page.setViewportSize({ width, height: 844 });
  });

  section('upgraded quiz games: every picture agrees with its answer', async ({ page, assert, playQuiz }) => {
    const money = (c) => (c < 100 ? `${c}¢` : `$${(c / 100).toFixed(2)}`);
    const cents = (t) => (/¢/.test(t) ? Number(t.replace(/\D/g, '')) : Math.round(Number(t.replace(/[^\d.]/g, '')) * 100));
    const num = (t) => Number(String(t).replace(/,/g, ''));
    const attrs = (sel, ...names) => page.locator(sel).first().evaluate((e, ns) => ns.map((n) => e.dataset[n]), names);

    // Fractions: the shaded parts are the fraction (read a picture), and the picture answers match.
    await playQuiz('fractions/index.html?type=identify', async ({ answer }) => {
      const [n, d] = await attrs('.quiz-visual figure[data-num]', 'num', 'den');
      assert.equal(`${n}/${d}`, answer);
    });
    await playQuiz('fractions/index.html?type=picture', async ({ prompt, answer }) => {
      assert.equal(prompt.match(/shows (\d+\/\d+)/)[1], answer);
      const [n, d] = await attrs('.quiz-choice-btn.correct figure[data-num]', 'num', 'den');
      assert.equal(`${n}/${d}`, answer);
    });
    await playQuiz('fractions/index.html?type=add', async ({ prompt, answer }) => {
      const parts = (await page.locator('.quiz-visual .kv-stacked').first().evaluate((f) => f.dataset.parts)).split(' ');
      const [a, b] = prompt.match(/(\d+\/\d+)/g);
      assert.deepEqual(parts, [a, b], 'the two bars are the two fractions');
    });

    // Time: the clock face shows the answer.
    for (const level of [1, 2, 3]) {
      await playQuiz(`time/index.html?type=clock&level=${level}`, async ({ prompt, answer }) => {
        if (/What time/.test(prompt)) {
          const [h, m] = await attrs('.quiz-visual .kv-clock', 'h', 'm');
          assert.equal(`${h}:${String(m).padStart(2, '0')}`, answer);
          if (level === 1) assert.ok(m === '0' || m === '30');
        } else {
          const [h, m] = await attrs('.quiz-choice-btn.correct .kv-clock', 'h', 'm');
          assert.equal(`${h}:${String(m).padStart(2, '0')}`, answer);
        }
      }, 8);
    }
    await playQuiz('time/index.html?type=elapsed', async ({ prompt, answer }) => {
      if (/How many minutes/.test(prompt)) return;
      const [start, end] = await attrs('.quiz-visual .kv-timeline', 'start', 'end');
      assert.ok(Number(end) > Number(start));
      if (/How much time passes/.test(prompt)) {
        const mins = Number(end) - Number(start);
        const h = Math.floor(mins / 60), m = mins % 60;
        assert.equal(h === 0 ? `${m} min` : m === 0 ? `${h} hr` : `${h} hr ${m} min`, answer);
      }
    }, 8);

    // Money: coins drawn add up to the amount in the answer.
    for (const level of [1, 2, 3]) {
      await playQuiz(`money/index.html?type=coins&level=${level}`, async ({ prompt, answer }) => {
        if (/in the picture/.test(prompt)) assert.equal(money(Number((await attrs('.quiz-visual .kv-tray', 'total'))[0])), answer);
        else if (/Which coins make exactly/.test(prompt)) {
          const target = cents(prompt.match(/exactly (\S+?)\?/)[1]);
          assert.equal(Number((await attrs('.quiz-choice-btn.correct .kv-tray', 'total'))[0]), target);
          const others = await page.locator('.quiz-choice-btn:not(.correct) .kv-tray').evaluateAll((ts) => ts.map((t) => Number(t.dataset.total)));
          for (const o of others) assert.notEqual(o, target, 'wrong coin sets add up to something else');
        } else assert.equal(cents(answer), Number((await attrs('.quiz-visual .kv-tray', 'total'))[0]), 'cents question shows the same amount');
      }, 8);
    }
    await playQuiz('money/index.html?type=change', async ({ prompt, answer }) => {
      const tags = await page.locator('.quiz-visual .kv-tag').evaluateAll((ts) => ts.map((t) => Number(t.dataset.cents)));
      if (/change/.test(prompt)) {
        const paid = Number((await attrs('.quiz-visual .kv-tray', 'total'))[0]);
        assert.equal(money(paid - tags[0]), answer);
      } else assert.equal(money(tags[0] + tags[1]), answer);
    });

    // Measurement: ruler, jug, thermometer and balance.
    await playQuiz('measurement/index.html?mode=read', async ({ prompt, answer }) => {
      if (/How long is/.test(prompt)) assert.equal(`${(await attrs('.quiz-visual .kv-ruler', 'value'))[0]} cm`, answer);
      else if (/jug/.test(prompt)) assert.equal(`${(await attrs('.quiz-visual .kv-jug', 'value'))[0]} ml`, answer);
      else if (/thermometer/.test(prompt)) assert.equal(`${(await attrs('.quiz-visual .kv-thermo', 'value'))[0]}°C`, answer);
      else {
        const heavier = (await attrs('.quiz-visual .kv-balance', 'heavier'))[0];
        const emojis = await page.locator('.quiz-visual .kv-pan-emoji').allTextContents();
        const want = /heavier/.test(prompt) ? (heavier === 'left' ? emojis[0] : emojis[1]) : (heavier === 'left' ? emojis[1] : emojis[0]);
        assert.ok(answer.startsWith(want), `${answer} should start with ${want}`);
      }
    }, 12);

    // Place value and rounding.
    for (const level of [1, 2]) {
      await playQuiz(`rounding-place-value/index.html?level=${level}`, async ({ prompt, answer }) => {
        if (/Round/.test(prompt)) {
          const n = num(prompt.match(/Round ([\d,]+)/)[1]);
          const [v, lo, hi] = await attrs('.quiz-visual .kv-roundline', 'value', 'lo', 'hi');
          assert.equal(Number(v), n);
          assert.ok(Number(lo) <= n && n < Number(hi));
          assert.ok([Number(lo), Number(hi)].includes(num(answer)), 'the rounded number is one of the two marks');
        } else if (/value of the/.test(prompt)) assert.equal(Number((await attrs('.quiz-visual .kv-blocks', 'value'))[0]), num(prompt.match(/in ([\d,]+)/)[1]));
        else if (/Which digit/.test(prompt)) assert.equal(Number((await attrs('.quiz-visual .kv-pvchart', 'value'))[0]), num(prompt.match(/of ([\d,]+)/)[1]));
        else assert.equal(Number((await attrs('.quiz-visual .kv-blocks', 'value'))[0]), num(answer));
      });
    }

    // Comparing numbers, adding, subtracting and counting.
    await playQuiz('comparing-numbers/index.html?max=10&type=biggest', async ({ answer }) => {
      assert.equal(await page.locator('.quiz-choice-btn.correct .kv-tenframes').evaluate((f) => f.dataset.value), answer);
      const values = await page.locator('.quiz-choice-btn .kv-tenframes').evaluateAll((fs) => fs.map((f) => Number(f.dataset.value)));
      assert.equal(Math.max(...values), Number(answer));
    });
    await playQuiz('comparing-numbers/index.html?max=100&type=symbol', async ({ prompt, answer }) => {
      const [a, b] = prompt.match(/\d+/g).map(Number);
      const values = await page.locator('.quiz-visual .kv-blocks').evaluateAll((fs) => fs.map((f) => Number(f.dataset.value)));
      assert.deepEqual(values, [a, b]);
      assert.equal(a < b ? '<' : a > b ? '>' : '=', answer);
    });
    await playQuiz('addition-subtraction/index.html?max=20', async ({ prompt, answer }) => {
      const [a, op, b] = prompt.match(/(\d+) ([+−]) (\d+)/).slice(1);
      const frame = await attrs('.quiz-visual .kv-tenframes', 'value', 'split', 'crossed');
      if (op === '+') { assert.equal(Number(frame[0]), Number(a) + Number(b)); assert.equal(Number(frame[1]), Number(a)); }
      else { assert.equal(Number(frame[0]), Number(a)); assert.equal(Number(frame[2]), Number(b)); }
      assert.equal(Number(answer), op === '+' ? Number(a) + Number(b) : Number(a) - Number(b));
    });
    await playQuiz('counting/index.html?mode=tenframe&max=20', async ({ answer }) => {
      assert.equal((await attrs('.quiz-visual .kv-tenframes', 'value'))[0], answer);
    });
    await playQuiz('counting/index.html?mode=dice', async ({ answer }) => {
      assert.equal((await attrs('.quiz-visual .kv-dice', 'total'))[0], answer);
      assert.equal(await page.locator('.quiz-visual .kv-pip').count(), Number(answer));
    });

    // Calendar grid.
    await playQuiz('calendar/index.html?type=grid', async ({ prompt, answer }) => {
      const [start, length] = (await attrs('.quiz-visual .kv-month', 'start', 'length')).map(Number);
      const marked = await page.locator('.quiz-visual .kv-month td.on').allTextContents();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (/What day of the week/.test(prompt)) assert.equal(days[(start + Number(marked[0]) - 1) % 7], answer);
      else if (/How many days/.test(prompt)) assert.equal(Number(marked[1]) - Number(marked[0]), Number(answer));
      else assert.equal(Number(marked[0]) + 7, Number(answer));
      assert.ok(await page.locator('.quiz-visual .kv-month td:not(:empty)').count() === length, 'month has the right number of days');
    });

    // Solar system strip.
    await playQuiz('solar-system/index.html?mode=order', async ({ prompt, answer }) => {
      if (/from the Sun\?/.test(prompt) && /Which planet is/.test(prompt)) {
        const ord = Number(prompt.match(/(\d)(?:st|nd|rd|th)/)[1]);
        const idx = await page.locator('.quiz-visual .kv-pcell').evaluateAll((cs) => cs.findIndex((c) => c.classList.contains('marked')));
        assert.equal(idx + 1, ord);
        const names = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
        assert.equal(names[idx], answer);
      }
    }, 12);
  });

  section('map-explorer: the region tapped is the continent or ocean asked for', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const HOME = { kangaroo: 'oceania', koala: 'oceania', 'giant panda': 'asia', tiger: 'asia', lion: 'africa', giraffe: 'africa', zebra: 'africa', 'emperor penguin': 'antarctica', llama: 'south-america', bison: 'north-america', 'the Eiffel Tower': 'europe', 'the Statue of Liberty': 'north-america', 'the pyramids': 'africa', 'a Japanese castle': 'asia', 'an ancient Greek temple': 'europe' };
    const NAMES = { 'North America': 'north-america', 'South America': 'south-america', Europe: 'europe', Africa: 'africa', Asia: 'asia', Oceania: 'oceania', Antarctica: 'antarctica', 'Pacific Ocean': 'pacific', 'Atlantic Ocean': 'atlantic', 'Indian Ocean': 'indian', 'Arctic Ocean': 'arctic', 'Southern Ocean': 'southern' };
    for (const level of [1, 2, 3]) {
      await startRound(`map-explorer/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        const answer = await page.locator('#stage svg.kv-map').evaluate((s) => s.dataset.answer);
        const continents = await page.locator('#stage svg [data-region]').evaluateAll((rs) => rs.map((r) => r.dataset.region));
        assert.ok(continents.includes(answer), 'answer region is on the map');
        assert.equal(await page.locator('#stage svg text').count(), level === 1 ? 7 : 0, 'names only at level 1');
        const oceans = continents.filter((c) => ['pacific', 'atlantic', 'indian', 'arctic', 'southern'].includes(c));
        assert.equal(oceans.length > 0, level === 3, 'oceans only at level 3');
        if (/^Tap /.test(task)) {
          const name = task.match(/^Tap (.+)\.$/)[1];
          assert.equal(NAMES[name], answer, `${name} -> ${answer}`);
        } else {
          const what = (task.match(/Where does the (.+?) live\?/) || task.match(/Where can you find (.+?)\?/))[1];
          const key = Object.keys(HOME).find((k) => k === what);
          assert.equal(HOME[key], answer, `${what} lives in ${HOME[key]}`);
          assert.ok(await page.locator('#stage .kv-clue').count());
        }
        if (i === 0) { const wrong = continents.find((c) => c !== answer && !oceans.includes(c)); await page.locator(`#stage [data-region="${wrong}"]`).first().focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#next-btn').isHidden(), true); }
        await page.locator(`#stage [data-region="${answer}"]`).first().focus();
        await page.keyboard.press('Enter');
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('map-explorer');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('weather-wear: helpful items match the weather and the scene names its season', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const GOOD = { sunny: ['sun hat', 'sunglasses', 'shorts', 'sunscreen'], rainy: ['umbrella', 'rain boots', 'raincoat'], snowy: ['scarf', 'gloves', 'warm coat', 'snow boots'] };
    for (const level of [1, 2]) {
      await startRound(`weather-wear/index.html?level=${level}`);
      let seasons = 0;
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        if (/Which season/.test(task)) {
          seasons += 1;
          const season = await page.locator('#stage .kv-scene').evaluate((s) => document.querySelector('#stage .kv-scene').parentElement.querySelector('[data-season]').dataset.season);
          const real = await page.evaluate(() => [...document.querySelectorAll('#stage .kv-scene')].map((e) => e.dataset.season)[0]);
          assert.ok(['spring', 'summer', 'autumn', 'winter'].includes(real || season));
          const answer = real;
          const buttons = await page.locator('#stage button[data-season]').evaluateAll((bs) => bs.map((b) => b.dataset.season));
          assert.equal(buttons.length, 4);
          if (i === 1) { await page.locator(`#stage button[data-season]:not([data-season="${answer}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage button[data-season="${answer}"]`).click();
        } else {
          assert.match(task, /It is (sunny|rainy|snowy) today/);
          const weather = task.match(/It is (\w+) today/)[1];
          const scene = await page.locator('#stage .kv-scene').evaluate((s) => s.dataset.weather);
          assert.equal(scene.slice(0, 4), weather.slice(0, 4), 'scene shows the weather named in the task');
          const items = await page.locator('#stage .kv-itemcell').evaluateAll((bs) => bs.map((b) => ({ name: b.dataset.item, good: b.dataset.good === 'true' })));
          assert.equal(items.length, 6);
          assert.equal(items.filter((x) => x.good).length, 3);
          for (const it of items) assert.equal(it.good, GOOD[scene].includes(it.name), `${it.name} is ${it.good ? '' : 'not '}needed in ${scene} weather`);
          if (i === 0) { // choosing something unhelpful is gently corrected
            await page.locator('#stage .kv-itemcell[data-good="false"]').first().click();
            await page.getByRole('button', { name: 'Check my choices' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
            await page.locator('#stage .kv-itemcell[data-good="false"]').first().click(); // un-pick
          }
          const goods = page.locator('#stage .kv-itemcell[data-good="true"]');
          for (let k = 0; k < 3; k++) await goods.nth(k).click();
          await page.getByRole('button', { name: 'Check my choices' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('weather-wear');
        await page.locator('#next-btn').click();
      }
      assert.equal(seasons, level === 2 ? 3 : 0, 'season questions only at level 2');
      await finishRound();
    }
  });

  section('sort-it: every picture ends up in a group it belongs to', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`sort-it/index.html?level=${level}`);
      for (let i = 0; i < 5; i++) {
        const bins = await page.locator('#stage .pk-bin').evaluateAll((bs) => bs.map((b) => b.dataset.bin));
        assert.equal(bins.length, level === 1 ? 2 : 3);
        const items = await page.locator('#stage .pk-item').evaluateAll((bs) => bs.map((b) => ({ id: b.dataset.id, bin: b.dataset.bin })));
        assert.equal(items.length, level === 1 ? 6 : 6);
        assert.equal(new Set(items.map((x) => x.id)).size, items.length, 'distinct pictures');
        for (const b of bins) assert.ok(items.some((x) => x.bin === b), `group ${b} has a picture`);
        if (i === 0) {
          const it = items[0]; const wrong = bins.find((b) => b !== it.bin);
          await page.locator(`#stage .pk-item[data-id="${it.id}"]`).click();
          await page.locator(`#stage .pk-bin[data-bin="${wrong}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /does not go/);
        }
        for (const it of items) {
          await page.locator(`#stage .pk-pool .pk-item[data-id="${it.id}"]`).click();
          await page.locator(`#stage .pk-bin[data-bin="${it.bin}"]`).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#stage .pk-bin .pk-item').count(), items.length);
        await noOverflow('sort-it');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('my-body: the part tapped is the part asked for; senses match their organ', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const SENSE = { 'see a rainbow': 'eyes', 'hear music': 'ears', 'smell a rose': 'nose', 'taste a lemon': 'tongue', 'feel an ice cube': 'hands' };
    for (const level of [1, 2]) {
      await startRound(`my-body/index.html?level=${level}`);
      const parts1 = ['head', 'eyes', 'ears', 'nose', 'mouth', 'hands', 'feet'];
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/helps you/.test(task)) {
          const verb = task.match(/helps you (.+)\?/)[1];
          const options = await page.locator('#stage button[data-part]').evaluateAll((bs) => bs.map((b) => b.dataset.part));
          assert.equal(new Set(options).size, 4);
          assert.ok(options.includes(SENSE[verb]));
          if (i === 3) { await page.locator(`#stage button[data-part]:not([data-part="${SENSE[verb]}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage button[data-part="${SENSE[verb]}"]`).click();
        } else {
          const id = await page.locator('#stage svg.kv-child').evaluate((s) => s.dataset.target);
          if (level === 1) assert.ok(parts1.includes(id), 'level 1 asks only the first seven parts: ' + id);
          const n = await page.locator(`#stage [data-part="${id}"]`).count();
          assert.ok(n >= 1 && n <= 2, `${id} is drawn once or as a pair`);
          if (i === 0) {
            const wrong = parts1.find((p) => p !== id);
            await page.locator(`#stage [data-part="${wrong}"]`).first().focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#next-btn').isHidden(), true);
            assert.match(await page.locator('#feedback').textContent(), /Look for the/);
          }
          // keyboard path for the last one; click for the rest
          if (i === 6) { await page.locator(`#stage [data-part="${id}"]`).last().focus(); await page.keyboard.press('Enter'); }
          else await page.locator(`#stage [data-part="${id}"]`).first().dispatchEvent('click');
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('my-body');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('life-cycles: the next stage and the order follow the real life cycle', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const CYCLES = { butterfly: ['Egg', 'Caterpillar', 'Chrysalis', 'Butterfly'], frog: ['Frogspawn', 'Tadpole', 'Frog'], chicken: ['Egg', 'Hatching', 'Chick', 'Hen'], 'apple tree': ['Seed', 'Sprout', 'Tree', 'Apple'], sunflower: ['Seed', 'Sprout', 'Plant', 'Flower'], person: ['Baby', 'Child', 'Adult', 'Older person'] };
    for (const level of [1, 2]) {
      await startRound(`life-cycles/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        if (/what comes next/.test(task)) {
          const cycle = await page.locator('#stage .kv-cyclerow').evaluate((r) => r.dataset.cycle);
          const answer = await page.locator('#stage .kv-cyclerow').evaluate((r) => r.dataset.answer);
          const shown = await page.locator('#stage .kv-cyclerow .kv-cyclecell:not(.kv-next) .kv-caption').allTextContents();
          assert.deepEqual(shown, CYCLES[cycle].slice(0, shown.length), 'shown stages are the cycle in order');
          assert.equal(answer, CYCLES[cycle][shown.length], 'answer is the very next stage');
          const options = await page.locator('#stage button[data-stage]').evaluateAll((bs) => bs.map((b) => b.dataset.stage));
          assert.equal(options.length, 4);
          for (const o of options) if (o !== answer) assert.ok(!shown.includes(o), 'wrong picks are not earlier stages of the same cycle: ' + o);
          if (i === 0) { await page.locator(`#stage button[data-stage]:not([data-stage="${answer}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage button[data-stage="${answer}"]`).click();
        } else {
          assert.equal(level, 2, 'order questions come at level 2');
          const m = task.match(/life of the (.+?) in order/);
          const names = CYCLES[m[1]];
          for (let k = 0; k < names.length; k++) await page.locator(`#stage .pk-card[data-id="${k}"]`).click();
          assert.deepEqual(await page.locator('#stage .pk-slot .kv-caption').allTextContents(), names);
          await page.getByRole('button', { name: 'Check the order' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('life-cycles');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('tamil-story-time: four panels, one question, picture answers', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`tamil-story-time/index.html?level=${level}`);
      for (let i = 0; i < 4; i++) {
        assert.equal(await page.locator('#stage .kv-panel').count(), 4);
        for (const cap of await page.locator('#stage .kv-panel-cap').allTextContents()) assert.match(cap, /[\u0B80-\u0BFF]/, 'caption is Tamil');
        assert.equal(await page.locator('#stage .kv-panel .kv-english:visible').count(), level === 1 ? 4 : 0, 'English help only at level 1');
        const answers = await page.locator('#stage .kv-picbtn').evaluateAll((bs) => bs.map((b) => b.dataset.english));
        assert.equal(answers.length, 4);
        assert.equal(new Set(answers).size, 4);
        // the story shows a picture of the answer, so a child can find it by reading
        const { answer, emoji } = await page.locator('#stage .kv-panels').evaluate((g) => ({ answer: g.dataset.answer, emoji: g.dataset.answerEmoji }));
        const pics = await page.locator('#stage .kv-panel-pic').allTextContents();
        assert.ok(pics.includes(emoji), `${emoji} is drawn in one of the panels: ${pics}`);
        if (i === 0) {
          const wrong = answers.find((a) => a !== answer);
          await page.locator(`#stage .kv-picbtn[data-english="${wrong}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
        }
        await page.locator(`#stage .kv-picbtn[data-english="${answer}"]`).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('tamil-story-time');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('tamil-english-match: each Tamil word joins its own picture or English word', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`tamil-english-match/index.html?level=${level}`);
      for (let i = 0; i < 5; i++) {
        const pairs = JSON.parse(await page.locator('#stage .kv-matchboard').evaluate((b) => b.dataset.pairs));
        assert.equal(pairs.length, 4);
        assert.equal(new Set(pairs.map((p) => p[1])).size, 4, 'four different words');
        if (i === 0) { // a wrong pair shakes and keeps the board open
          await page.locator(`#stage .kv-matchcol:first-child .kv-matchcell[data-english="${pairs[0][1]}"]`).click();
          await page.locator(`#stage .kv-matchcol:last-child .kv-matchcell[data-english="${pairs[1][1]}"]`).click();
          assert.equal(await page.locator('#stage .kv-matchcell.done').count(), 0);
          assert.match(await page.locator('#feedback').textContent(), /Not that one/);
        }
        for (const [, english] of pairs) {
          await page.locator(`#stage .kv-matchcol:first-child .kv-matchcell[data-english="${english}"]`).click();
          await page.locator(`#stage .kv-matchcol:last-child .kv-matchcell[data-english="${english}"]`).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#stage .kv-matchcell.done').count(), 8);
        await noOverflow('tamil-english-match');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('tamil-picture-sentences: the right picture is the sentence\'s own noun', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`tamil-picture-sentences/index.html?level=${level}`);
      const bank = await page.evaluate(() => JSON.parse(JSON.stringify(TamilSentenceData.sentences)));
      for (let i = 0; i < 8; i++) {
        const id = await page.locator('#stage .kv-tamil-sentence').evaluate((p) => p.dataset.id);
        const s = bank.find((x) => x.id === id);
        if (level === 1) assert.ok(['animals', 'nature'].includes(s.category), 'level 1 sentences are animals and nature');
        const shown = (await page.locator('#stage .kv-tamil-sentence').textContent()).replace(/\s+/g, ' ').trim();
        assert.equal(shown, (s.before + s.word + s.after).replace(/\s+/g, ' ').trim(), 'whole sentence is displayed');
        assert.equal(await page.locator('#stage .kv-tword.key').allTextContents().then((t) => t.join(' ')), s.word, 'key word is highlighted');
        const options = await page.locator('#stage .kv-picbtn').evaluateAll((bs) => bs.map((b) => b.dataset.id));
        assert.equal(options.length, 4);
        assert.equal(new Set(options).size, 4);
        const emojis = await page.locator('#stage .kv-picbtn').evaluateAll((bs) => bs.map((b) => b.textContent));
        assert.equal(new Set(emojis).size, 4, 'four different pictures');
        for (const o of options) if (o !== id) {
          const other = bank.find((x) => x.id === o);
          assert.ok(!(s.before + s.word + s.after).includes(other.word), `${other.word} must not appear in the sentence ${id}`);
        }
        if (i === 0) { await page.locator(`#stage .kv-picbtn[data-id]:not([data-id="${id}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
        await page.locator(`#stage .kv-picbtn[data-id="${id}"]`).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('tamil-picture-sentences');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('tamil-days-colours: the picture lit up matches the Tamil name chosen', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const mode of ['days', 'months', 'colours']) {
      await startRound(`tamil-days-colours/index.html?mode=${mode}`);
      const data = await page.evaluate(() => JSON.parse(JSON.stringify(TamilDaysData)));
      const items = mode === 'days' ? data.DAYS : mode === 'months' ? data.MONTHS : data.COLOURS;
      const byTamil = Object.fromEntries(items.map((x) => [x.tamil, x.english]));
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/called in Tamil/.test(task)) {
          const lit = await page.locator('#stage [data-english]').first().evaluate((e) => e.dataset.english);
          assert.ok(items.some((x) => x.english === lit), 'picture is one of the items');
          if (mode !== 'colours') assert.equal(await page.locator('#stage .kv-cell2.lit').count(), 1, 'exactly one cell lit');
          const names = await page.locator('#stage button.tamil-glyph').evaluateAll((bs) => bs.map((b) => b.dataset.english));
          assert.equal(new Set(names).size, 4);
          if (i === 0) { await page.locator(`#stage button.tamil-glyph[data-english]:not([data-english="${lit}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage button.tamil-glyph[data-english="${lit}"]`).click();
        } else {
          const tamil = task.match(/“(.+?)”/)[1];
          const english = byTamil[tamil];
          assert.ok(english, 'the Tamil name is a known word: ' + tamil);
          assert.equal(await page.locator('#stage [data-target]').first().evaluate((e) => e.dataset.target), english);
          if (i === 0) { await page.locator(`#stage button[data-english]:not([data-english="${english}"])`).first().click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage button[data-english="${english}"]`).first().click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('tamil-days-colours');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('sentence-builder: tiles in order read exactly as the sentence for the picture', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`sentence-builder/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const sentence = await page.locator('#stage figure.kv-clue').evaluate((f) => f.dataset.sentence);
        const words = sentence.split(' ');
        assert.ok(words.length >= (level === 1 ? 3 : 5) && words.length <= (level === 1 ? 4 : 7), 'sentence length fits the level: ' + sentence);
        assert.match(words[0], /^[A-Z]/, 'starts with a capital');
        assert.match(words[words.length - 1], /\.$/, 'ends with a full stop');
        const tiles = await page.locator('#stage .pk-tile').allTextContents();
        assert.deepEqual([...tiles].sort(), [...words].sort(), 'tiles are exactly the sentence words');
        const clickWord = async (w) => {
          const texts = await page.locator('#stage .pk-tile:visible').allTextContents();
          await page.locator('#stage .pk-tile:visible').nth(texts.indexOf(w)).click();
        };
        if (i === 0) { // a wrong order clears the tiles and keeps the question open
          for (const w of [...words].reverse()) await clickWord(w);
          await page.getByRole('button', { name: 'Check my sentence' }).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.equal(await page.locator('#stage .pk-aslot.full').count(), 0, 'tiles are cleared');
        }
        for (const w of words) await clickWord(w);
        await page.getByRole('button', { name: 'Check my sentence' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('sentence-builder');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('story-order: pictures placed in order are the story steps', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`story-order/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const n = await page.locator('#stage .pk-card').count();
        assert.ok(level === 1 ? n === 3 : n >= 4 && n <= 5, `${n} cards at level ${level}`);
        const ids = (await page.locator('#stage .pk-card').evaluateAll((cs) => cs.map((c) => c.dataset.id))).sort();
        assert.deepEqual(ids, [...Array(n).keys()].map(String));
        await page.getByRole('button', { name: 'Check the order' }).click(); // nothing placed yet
        assert.equal(await page.locator('#next-btn').isHidden(), true);
        if (i === 0) { // swapped first two → wrong boxes are marked, question stays open
          const wrongOrder = [1, 0, ...[...Array(n).keys()].slice(2)];
          for (const id of wrongOrder) await page.locator(`#stage .pk-card[data-id="${id}"]`).click();
          await page.getByRole('button', { name: 'Check the order' }).click();
          assert.equal(await page.locator('#stage .pk-slot.wrong').count(), 2);
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          await page.getByRole('button', { name: 'Start again' }).click();
        }
        for (let id = 0; id < n; id++) await page.locator(`#stage .pk-card[data-id="${id}"]`).click();
        await page.getByRole('button', { name: 'Check the order' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#stage .pk-slot.right').count(), n);
        assert.match(await page.locator('#feedback').textContent(), /First:/);
        await noOverflow('story-order');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('sight-word-pop: the word asked for is among the bubbles, and only that one pops', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      // No speech engine in this browser: the word is written in the instruction.
      await page.addInitScript(() => { try { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch (e) {} });
      await startRound(`sight-word-pop/index.html?level=${level}`);
      for (let i = 0; i < 10; i++) {
        const task = await page.locator('#task').textContent();
        const word = task.match(/“(.+?)”/)?.[1];
        assert.ok(word, 'the word is written when speech is unavailable: ' + task);
        const bubbles = await page.locator('#stage .kv-bubble').evaluateAll((bs) => bs.map((b) => b.dataset.word));
        assert.equal(bubbles.length, 6);
        assert.equal(new Set(bubbles).size, 6, 'six different words');
        assert.equal(bubbles.filter((b) => b === word).length, 1, 'the word appears once');
        if (i === 0) {
          const other = bubbles.find((b) => b !== word);
          await page.locator(`#stage .kv-bubble[data-word="${other}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
        }
        await page.locator(`#stage .kv-bubble[data-word="${word}"]`).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('sight-word-pop');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('word-families: every picture goes in the house its ending names', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`word-families/index.html?level=${level}`);
      for (let i = 0; i < 5; i++) {
        const bins = await page.locator('#stage .pk-bin').evaluateAll((bs) => bs.map((b) => b.dataset.bin));
        assert.equal(bins.length, level === 1 ? 2 : 3);
        const items = await page.locator('#stage .pk-item').evaluateAll((bs) => bs.map((b) => ({ id: b.dataset.id, bin: b.dataset.bin })));
        for (const it of items) assert.ok(it.id.endsWith(it.bin), `${it.id} ends in -${it.bin}`);
        if (i === 0) { // wrong house: item stays, feedback explains
          const item = items[0];
          const wrong = bins.find((b) => b !== item.bin);
          await page.locator(`#stage .pk-item[data-id="${item.id}"]`).click();
          await page.locator(`#stage .pk-bin[data-bin="${wrong}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /does not end/);
        }
        for (const it of items) {
          await page.locator(`#stage .pk-pool .pk-item[data-id="${it.id}"]`).click();
          await page.locator(`#stage .pk-bin[data-bin="${it.bin}"]`).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#stage .pk-bin .pk-item').count(), items.length, 'all pictures are in houses');
        await noOverflow('word-families');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('sound-it-out: the letters shown make the word in the picture', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2]) {
      await startRound(`sound-it-out/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/Sound it out/.test(task)) {
          const word = await page.locator('#stage .kv-letters').evaluate((r) => r.dataset.word);
          const shown = await page.locator('#stage .kv-letter').allTextContents();
          assert.equal(shown.join(''), word, 'letters shown spell the word');
          if (level === 1) assert.equal(shown.length, 3);
          const wrong = (await page.locator('#stage [data-word].kv-picbtn').evaluateAll((bs) => bs.map((b) => b.dataset.word))).find((w) => w !== word);
          if (i === 0) { await page.locator(`#stage .kv-picbtn[data-word="${wrong}"]`).click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          await page.locator(`#stage .kv-picbtn[data-word="${word}"]`).click();
        } else {
          const word = await page.locator('#stage figure.kv-clue').evaluate((f) => f.dataset.word);
          let rest = word;
          const slots = await page.locator('#stage .pk-aslot').count();
          const tiles = await page.locator('#stage .pk-tile').allTextContents();
          assert.equal(tiles.length, slots + 1, 'one spare letter');
          if (i === 1) { // an incomplete answer gets a hint
            await page.getByRole('button', { name: 'Check my word' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          while (rest) {
            const options = (await page.locator('#stage .pk-tile:visible').allTextContents());
            const t = options.filter((x) => rest.startsWith(x)).sort((a, b) => b.length - a.length)[0];
            assert.ok(t, `a tile for "${rest}" among ${options}`);
            await page.locator('#stage .pk-tile:visible', { hasText: new RegExp('^' + t + '$') }).first().click();
            rest = rest.slice(t.length);
          }
          await page.getByRole('button', { name: 'Check my word' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('sound-it-out');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('picture-graphs: the graphs show the numbers the answers are checked against', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`picture-graphs/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/tally marks/.test(task)) {
          const n = await page.locator('#stage [data-count]').evaluate((f) => Number(f.dataset.count));
          for (let k = 0; k < n; k++) await page.getByRole('button', { name: 'Add a tally mark' }).click();
          assert.equal(await page.locator('#stage .kv-tally').evaluate((t) => Number(t.dataset.total)), n);
          assert.equal(await page.locator('#stage .kv-tgroup').count(), Math.ceil(n / 5), 'groups of five');
          await page.getByRole('button', { name: 'Check my tally' }).click();
        } else {
          const rows = await page.locator('#stage .kv-grow').evaluateAll((rs) => rs.map((r) => ({ label: r.dataset.label, count: Number(r.dataset.count) })));
          const each = await page.locator('#stage .kv-graph').evaluate((g) => Number(g.dataset.each || 1));
          // the pictures drawn equal the counts
          const icons = await page.locator('#stage .kv-picto .kv-gicons').evaluateAll((rs) => rs.map((r) => r.children.length));
          if (icons.length) rows.forEach((r, idx) => assert.equal(icons[idx] * each, r.count, 'pictures drawn = count'));
          const bars = await page.locator('#stage .kv-bars .kv-gfill').evaluateAll((fs) => fs.map((f) => Number(f.textContent)));
          if (bars.length) rows.forEach((r, idx) => assert.equal(bars[idx], r.count, 'bar label = count'));
          assert.equal(new Set(rows.map((r) => r.count)).size, rows.length, 'counts are all different');
          let answer;
          if (/Which has the (most|fewest)/.test(task)) {
            const most = /most/.test(task);
            const target = rows.reduce((x, y) => (most ? y.count > x.count : y.count < x.count) ? y : x);
            answer = target.label;
          } else if (/How many more/.test(task)) {
            const [, big, small] = task.match(/How many more (.+?) than (.+?)\?/);
            answer = String(rows.find((r) => r.label === big).count - rows.find((r) => r.label === small).count);
          } else {
            const [, name] = task.match(/How many (.+?)\?/);
            answer = String(rows.find((r) => r.label === name).count);
          }
          const all = await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value));
          assert.equal(new Set(all).size, all.length, 'distinct choices');
          if (i === 0) {
            const wrong = all.find((v) => v !== answer);
            await page.locator(`#stage button[data-value="${wrong}"]`).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator(`#stage button[data-value="${answer}"]`).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('picture-graphs');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('measure-lab: the ruler, scale and jug show what the child measured', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`measure-lab/index.html?level=${level}`);
      const kinds = new Set();
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        if (/First guess/.test(task)) {
          kinds.add('ruler');
          const len = await page.locator('#stage figure.kv-ruler').evaluate((f) => Number(f.dataset.value));
          await page.locator('#stage [data-guess]').first().click();
          await page.locator('#stage .kv-slider').waitFor({ state: 'visible' });
          if (i === 0 && len > 1) { // one off is wrong and gets a hint
            await page.locator('#stage .kv-slider').fill(String(len - 1));
            await page.getByRole('button', { name: 'Check my measurement' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator('#stage .kv-slider').fill(String(len));
          assert.equal(await page.locator('#stage figure.kv-ruler').evaluate((f) => Number(f.dataset.marker)), len, 'marker sits at the end of the object');
          await page.getByRole('button', { name: 'Check my measurement' }).click();
        } else if (/balance/.test(task)) {
          kinds.add('balance');
          const w = await page.locator('#stage [data-weight]').evaluate((e) => Number(e.dataset.weight));
          const sizes = (level === 1 ? [5, 1] : level === 2 ? [10, 5, 1] : [50, 10, 5, 1]);
          let rest = w;
          for (const g of sizes) while (rest >= g) { await page.getByRole('button', { name: `Add a ${g} gram weight` }).click(); rest -= g; }
          assert.equal(await page.locator('#stage figure.kv-balance').evaluate((f) => f.dataset.heavier), 'equal', 'scale is level when weights match');
        } else {
          kinds.add('jug');
          const target = Number(task.match(/(\d+) mL/)[1]);
          const step = level === 1 ? 100 : 50;
          if (i === 0) { await page.getByRole('button', { name: 'Check the jug' }).click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          for (let f = 0; f < target; f += step) await page.getByRole('button', { name: `Pour ${step} millilitres more` }).click();
          assert.equal(await page.locator('#stage figure.kv-jug').evaluate((f) => Number(f.dataset.value)), target);
          await page.getByRole('button', { name: 'Check the jug' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('measure-lab');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('shape-detectives: counts, finds and mirrors agree with the pictures', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, octagon: 8 };
    for (const level of [1, 2, 3]) {
      await startRound(`shape-detectives/index.html?level=${level}`);
      const seen = new Set();
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/How many sides/.test(task)) {
          seen.add('count');
          const sides = await page.locator('#stage figure.kv-shape').evaluate((f) => ({ n: Number(f.dataset.sides), shape: f.dataset.shape }));
          assert.equal(SIDES[sides.shape], sides.n);
          assert.equal(await page.locator('#stage svg').first().evaluate((s) => s.querySelectorAll('polygon,rect').length), 1);
          const wrong = (await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value))).find((v) => v !== String(sides.n));
          await page.locator(`#stage button[data-value="${wrong}"]`).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          await page.locator(`#stage button[data-value="${sides.n}"]`).click();
        } else if (/Tap every/.test(task)) {
          seen.add('find');
          const name = task.match(/Tap every (\w+)/)[1];
          const targets = await page.locator('#stage .kv-shapegrid').evaluate((g) => Number(g.dataset.targets));
          assert.equal(await page.locator(`#stage .kv-shapecell[data-shape="${name}"]`).count(), targets, 'target count');
          assert.equal(await page.locator('#stage .kv-shapecell').count(), 9);
          if (i < 2) { await page.getByRole('button', { name: 'Done choosing' }).click(); assert.equal(await page.locator('#next-btn').isHidden(), true); }
          const cells = page.locator(`#stage .kv-shapecell[data-shape="${name}"]`);
          for (let k = 0; k < targets; k++) await cells.nth(k).click();
          await page.getByRole('button', { name: 'Done choosing' }).click();
        } else {
          seen.add('mirror');
          assert.equal(level, 3, 'mirror questions only at level 3');
          await page.locator('#stage [data-option="same"]').click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          await page.locator('#stage [data-option="mirror"]').click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('shape-detectives');
        await page.locator('#next-btn').click();
      }
      assert.ok(seen.has('find'));
      await finishRound();
    }
  });

  section('block-builder: blocks built, traded and read equal the number', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`block-builder/index.html?level=${level}`);
      for (let i = 0; i < 8; i++) {
        const task = await page.locator('#task').textContent();
        if (/What number do the blocks show/.test(task)) {
          const blocks = await page.locator('#stage .kv-blocks').first().evaluate((f) => ({ h: +f.dataset.h, t: +f.dataset.t, o: +f.dataset.o, v: +f.dataset.value }));
          assert.equal(blocks.h * 100 + blocks.t * 10 + blocks.o, blocks.v);
          assert.equal(await page.locator('#stage .kv-blocks .kv-flat').count(), blocks.h);
          assert.equal(await page.locator('#stage .kv-blocks .kv-rod').count(), blocks.t);
          assert.equal(await page.locator('#stage .kv-blocks .kv-cube').count(), blocks.o);
          const choices = await page.locator('#stage button[data-value]').evaluateAll((bs) => bs.map((b) => b.dataset.value));
          assert.equal(new Set(choices).size, choices.length, 'distinct choices');
          assert.ok(choices.includes(String(blocks.v)));
          if (i === 0) { // a wrong choice keeps the question open
            const wrong = choices.find((c) => c !== String(blocks.v));
            await page.locator(`#stage button[data-value="${wrong}"]`).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          await page.locator(`#stage button[data-value="${blocks.v}"]`).click();
        } else {
          const n = Number(task.match(/(\d+)/)[1]);
          const want = { h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 };
          const state = () => page.locator('#stage .kv-work').evaluate((f) => ({ h: +f.dataset.h, t: +f.dataset.t, o: +f.dataset.o }));
          if (/^Build/.test(task)) {
            for (let k = 0; k < want.h; k++) await page.getByRole('button', { name: 'Add a hundred flat' }).click();
            for (let k = 0; k < want.t; k++) await page.getByRole('button', { name: 'Add a ten rod' }).click();
            for (let k = 0; k < want.o; k++) await page.getByRole('button', { name: 'Add a one cube' }).click();
          } else {
            let guard = 0;
            for (;;) {
              const st = await state();
              if (st.o >= 10) await page.getByRole('button', { name: 'Trade ten ones for one ten' }).click();
              else if (st.t >= 10 && level > 1) await page.getByRole('button', { name: 'Trade ten tens for one hundred' }).click();
              else break;
              assert.ok(++guard < 40);
            }
          }
          assert.deepEqual(await state(), want, `blocks show ${n}`);
          assert.equal(await page.locator('#stage .kv-work').evaluate((f) => +f.dataset.value), n);
          if (i === 0) { // a one-short build is rejected with a hint
            await page.getByRole('button', { name: 'Take away a one cube' }).or(page.getByRole('button', { name: 'Take away a ten rod' })).first().click().catch(() => {});
            await page.getByRole('button', { name: 'Check my blocks' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
            const st = await state();
            if (st.h * 100 + st.t * 10 + st.o !== n) {
              // put the block back
              if (want.o > 0 || st.o < want.o) await page.getByRole('button', { name: 'Add a one cube' }).click().catch(() => {});
            }
            // rebuild exactly
            let s2 = await state();
            while (s2.h < want.h) { await page.getByRole('button', { name: 'Add a hundred flat' }).click(); s2 = await state(); }
            while (s2.t < want.t) { await page.getByRole('button', { name: 'Add a ten rod' }).click(); s2 = await state(); }
            while (s2.o < want.o) { await page.getByRole('button', { name: 'Add a one cube' }).click(); s2 = await state(); }
            while (s2.h > want.h) { await page.getByRole('button', { name: 'Take away a hundred flat' }).first().click(); s2 = await state(); }
            while (s2.t > want.t) { await page.getByRole('button', { name: 'Take away a ten rod' }).first().click(); s2 = await state(); }
            while (s2.o > want.o) { await page.getByRole('button', { name: 'Take away a one cube' }).first().click(); s2 = await state(); }
          }
          await page.getByRole('button', { name: 'Check my blocks' }).click();
        }
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('block-builder');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('coin-shop: the coins paid add up to the price (and the fewest when asked)', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    const DENOMS = { 1: [10, 5, 1], 2: [25, 10, 5, 1], 3: [500, 100, 25, 10, 5, 1] };
    for (const level of [1, 2, 3]) {
      await startRound(`coin-shop/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const price = await page.locator('#stage .kv-tag').evaluate((t) => Number(t.dataset.cents));
        assert.ok(task.includes('exactly'), task);
        let rest = price;
        const pieces = [];
        for (const d of DENOMS[level]) while (rest >= d) { pieces.push(d); rest -= d; }
        assert.equal(rest, 0);
        if (i === 0) { // paying nothing keeps the question open with a hint
          await page.getByRole('button', { name: 'Pay now' }).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /need/);
        }
        for (const d of pieces) await page.locator(`#stage .kv-wallet [data-cents="${d}"]`).click();
        assert.equal(await page.locator('#stage .kv-paytray').evaluate((t) => Number(t.dataset.total)), price, 'tray total equals price');
        // each piece in the tray is drawn as a coin or note of that value
        assert.equal(await page.locator('#stage .kv-paytray [data-cents]').count(), pieces.length);
        await page.getByRole('button', { name: 'Pay now' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('coin-shop');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('fraction-pizza: shaded slices, equal fractions and ordering match the fractions asked for', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`fraction-pizza/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const sliceCount = await page.locator('#stage .kv-live .kv-slice').count();
        if (/Put the pizzas in order/.test(task)) {
          const vals = await page.locator('#stage .pk-card figure').evaluateAll((fs) => fs.map((f) => Number(f.dataset.num) / Number(f.dataset.den)));
          assert.equal(vals.length, 3);
          assert.equal(new Set(vals.map((v) => v.toFixed(4))).size, 3, 'three different amounts');
          const order = vals.map((v, idx) => [v, idx]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
          await page.getByRole('button', { name: 'Check the order' }).click(); // incomplete: gentle hint
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          for (const idx of order) await page.locator('#stage .pk-card').nth(idx).click();
          // clicking hides cards, so indexes stay stable: hidden cards keep their place
        } else {
          let n, d;
          if (/same amount/.test(task)) {
            [n, d] = await page.locator('#stage figure.kv-pie[data-num]:not(.kv-live)').first().evaluate((f) => [Number(f.dataset.num), Number(f.dataset.den)]);
          } else {
            [n, d] = task.match(/(\d+)\/(\d+)/).slice(1).map(Number);
            assert.equal(sliceCount, d, 'pie is cut into the denominator');
          }
          const need = (n * sliceCount) / d;
          assert.ok(Number.isInteger(need), `${n}/${d} can be shown with ${sliceCount} slices`);
          if (i === 0) { // wrong first: nothing shaded
            await page.getByRole('button', { name: 'Check my pizza' }).click();
            assert.equal(await page.locator('#next-btn').isHidden(), true);
          }
          for (let s = 0; s < need; s++) await page.locator('#stage .kv-live .kv-slice').nth(s).click();
          assert.equal(await page.locator('#stage .kv-live').evaluate((f) => Number(f.dataset.num)), need);
        }
        await page.getByRole('button', { name: /Check (my pizza|the order)/ }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        assert.match(await page.locator('#feedback').textContent(), /Yes|got it/);
        await noOverflow('fraction-pizza');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });

  section('clock-setter: drag and buttons set the right time at every level', async ({ page, assert, startRound, finishRound, noOverflow }) => {
    for (const level of [1, 2, 3]) {
      await startRound(`clock-setter/index.html?level=${level}`);
      for (let i = 0; i < 6; i++) {
        const task = await page.locator('#task').textContent();
        const [, h, m] = task.match(/(\d+):(\d{2})/).map(Number);
        if (level === 1) assert.ok(m === 0 || m === 30, 'level 1 only asks o\'clock and half past: ' + task);
        if (level === 2) assert.equal(m % 5, 0, task);
        if (i === 0) {
          // Real pointer path: press near the minute mark, then near the hour mark.
          const box = await page.locator('#stage svg').first().boundingBox();
          const cx = box.x + box.width / 2, cy = box.y + box.height / 2, R = box.width / 2;
          const at = (deg, f) => [cx + Math.sin(deg * Math.PI / 180) * R * f, cy - Math.cos(deg * Math.PI / 180) * R * f];
          let [x, y] = at(m * 6, 0.8);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
          [x, y] = at((h % 12) * 30, 0.3);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
        } else {
          await page.evaluate(([hh, mm]) => document.querySelector('#stage .kv-clock').set(hh, mm), [h, m]);
        }
        const shown = await page.locator('#stage .kv-clock').evaluate((f) => [Number(f.dataset.h), Number(f.dataset.m)]);
        assert.deepEqual(shown, [h, m], `clock shows ${shown} but asked for ${h}:${m} (level ${level}, question ${i})`);
        if (i === 1) { // a wrong answer gives a hint and keeps the question open
          await page.evaluate(([hh]) => document.querySelector('#stage .kv-clock').set(hh % 12 + 1, 0), [h]);
          await page.getByRole('button', { name: 'Check the clock' }).click();
          assert.equal(await page.locator('#next-btn').isHidden(), true);
          assert.match(await page.locator('#feedback').textContent(), /hand|clock/i);
          await page.evaluate(([hh, mm]) => document.querySelector('#stage .kv-clock').set(hh, mm), [h, m]);
        }
        await page.getByRole('button', { name: 'Check the clock' }).click();
        await page.locator('#next-btn').waitFor({ state: 'visible' });
        await noOverflow('clock-setter');
        await page.locator('#next-btn').click();
      }
      await finishRound();
    }
  });


  const before = await plays().catch(() => 0);
  for (const [name, fn] of sections) {
    if (only && !name.includes(only)) continue;
    await fn(ctx);
    console.log('PASS', name);
  }
  assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
  assert.deepEqual(external, [], 'external requests: ' + external.join(', '));
  await browser.close();
  console.log(`PASS picture games (${sections.filter(([n]) => !only || n.includes(only)).length} sections); no errors or external requests.`);
})().catch((e) => { console.error(e); process.exit(1); });
